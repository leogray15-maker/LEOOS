"""
Backtest engine.

The whole point of this file is to be pessimistic. A backtest that flatters a
strategy is worse than no backtest, because it costs you money with confidence.
So the defaults here are deliberately unkind:

  * Signals are computed from data up to and including bar t, and the position
    is only held during bar t+1. Nothing can see its own future.
  * Every change in position pays a fee AND slippage, both ways.
  * Every result is reported next to buy-and-hold, after the same costs.
  * Nothing is reported without an out-of-sample half and a permutation test.

Long/flat only: position is 0 or 1. Shorting crypto adds funding, borrow and
liquidation mechanics this engine does not model, so it does not pretend to.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS = 365  # crypto trades every day; use 252 for equities


# ----------------------------------------------------------------------------
# Core
# ----------------------------------------------------------------------------

def run_backtest(
    px: pd.DataFrame,
    signal: pd.Series,
    fee_bps: float = 10.0,
    slippage_bps: float = 5.0,
    periods_per_year: int = TRADING_DAYS,
) -> dict:
    """
    px      : DataFrame with a 'close' column, datetime index, ascending.
    signal  : Series aligned to px.index, values in [0, 1] — target exposure
              decided using information available at that bar's close.

    Returns a dict of the equity curve and the metrics computed from it.
    """
    close = px["close"].astype(float)
    ret = close.pct_change().fillna(0.0)

    # The lag is the honesty. Decide at the close of t, hold through t+1.
    pos = signal.reindex(close.index).fillna(0.0).clip(0.0, 1.0).shift(1).fillna(0.0)

    # Cost is charged on the change in position, both directions.
    turnover = pos.diff().abs().fillna(pos.abs())
    cost_rate = (fee_bps + slippage_bps) / 10_000.0
    costs = turnover * cost_rate

    gross = pos * ret
    net = gross - costs

    equity = (1.0 + net).cumprod()
    bench_equity = (1.0 + ret).cumprod() * (1.0 - cost_rate)  # one entry cost

    return {
        "equity": equity,
        "bench_equity": bench_equity,
        "net": net,
        "gross": gross,
        "pos": pos,
        "costs": costs,
        "turnover": turnover,
        "metrics": _metrics(net, equity, pos, turnover, costs, periods_per_year),
        "bench_metrics": _metrics(
            ret, bench_equity, pd.Series(1.0, index=ret.index),
            pd.Series(0.0, index=ret.index), pd.Series(0.0, index=ret.index),
            periods_per_year,
        ),
    }


def _metrics(net, equity, pos, turnover, costs, ppy) -> dict:
    n = len(net)
    if n < 2 or equity.iloc[-1] <= 0:
        return {k: 0.0 for k in (
            "cagr", "vol", "sharpe", "sortino", "max_dd", "calmar",
            "hit_rate", "profit_factor", "exposure", "trades",
            "cost_drag", "total_return", "worst_day", "best_day")}

    years = n / ppy
    total_return = equity.iloc[-1] - 1.0
    cagr = equity.iloc[-1] ** (1 / years) - 1 if years > 0 else 0.0

    vol = net.std() * np.sqrt(ppy)
    sharpe = (net.mean() * ppy) / vol if vol > 0 else 0.0

    downside = net[net < 0]
    dvol = downside.std() * np.sqrt(ppy) if len(downside) > 1 else 0.0
    sortino = (net.mean() * ppy) / dvol if dvol > 0 else 0.0

    peak = equity.cummax()
    dd = equity / peak - 1.0
    max_dd = dd.min()
    calmar = cagr / abs(max_dd) if max_dd < 0 else 0.0

    active = net[pos > 0]
    wins = active[active > 0]
    losses = active[active < 0]
    hit_rate = len(wins) / len(active) if len(active) else 0.0
    profit_factor = wins.sum() / abs(losses.sum()) if losses.sum() != 0 else 0.0

    # A "trade" is a move from flat into the market.
    entries = int(((pos > 0) & (pos.shift(1).fillna(0) == 0)).sum())

    return {
        "cagr": float(cagr),
        "vol": float(vol),
        "sharpe": float(sharpe),
        "sortino": float(sortino),
        "max_dd": float(max_dd),
        "calmar": float(calmar),
        "hit_rate": float(hit_rate),
        "profit_factor": float(profit_factor),
        "exposure": float((pos > 0).mean()),
        "trades": entries,
        "cost_drag": float(costs.sum()),
        "total_return": float(total_return),
        "worst_day": float(net.min()),
        "best_day": float(net.max()),
    }


# ----------------------------------------------------------------------------
# The tests that stop you fooling yourself
# ----------------------------------------------------------------------------

def split_sample(px: pd.DataFrame, train_frac: float = 0.6):
    """In-sample to develop on, out-of-sample you only look at once."""
    cut = int(len(px) * train_frac)
    return px.iloc[:cut], px.iloc[cut:]


def permutation_test(
    px: pd.DataFrame,
    strategy_fn,
    n_trials: int = 200,
    fee_bps: float = 10.0,
    slippage_bps: float = 5.0,
    seed: int = 7,
) -> dict:
    """
    Shuffle the daily returns, rebuild a price path from them, and re-run the
    strategy. Permuting the ORDER destroys serial structure — trends, mean
    reversion, momentum — while leaving the distribution of returns untouched.
    Any edge that survives the shuffle was never structure to begin with.

    The statistic is Sharpe MINUS buy-and-hold Sharpe on the same path, not
    raw Sharpe. That matters: permuting preserves drift, and a long-only
    strategy harvests drift whether or not it has any skill. Testing raw
    Sharpe therefore credits the strategy for simply being long in a rising
    market, and buries real edges under a mountain of lucky random paths.
    Measuring against the benchmark on each path isolates timing from drift.

    p-value = share of shuffled runs whose excess beat the real one. Above
    ~0.05 and there is no evidence of an edge beyond holding the asset.
    """
    close = px["close"].astype(float)
    ret = close.pct_change().dropna().to_numpy()
    start = float(close.iloc[0])

    def excess(frame):
        res = run_backtest(frame, strategy_fn(frame), fee_bps, slippage_bps)
        return res["metrics"]["sharpe"] - res["bench_metrics"]["sharpe"]

    real_excess = excess(px)

    rng = np.random.default_rng(seed)
    shuffled = []
    for _ in range(n_trials):
        path = start * np.cumprod(1.0 + rng.permutation(ret))
        fake = pd.DataFrame(
            {"close": np.concatenate([[start], path])},
            index=px.index[: len(path) + 1],
        )
        fake["high"] = fake["low"] = fake["open"] = fake["close"]
        shuffled.append(excess(fake))

    shuffled = np.array(shuffled)
    p = float((shuffled >= real_excess).mean())
    return {
        "real_excess_sharpe": float(real_excess),
        "shuffled_mean": float(shuffled.mean()),
        "shuffled_p95": float(np.percentile(shuffled, 95)),
        "p_value": p,
        "verdict": "no evidence of edge" if p > 0.05 else "survives shuffling",
    }
