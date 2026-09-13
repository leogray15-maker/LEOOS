#!/usr/bin/env python3
"""
Run every strategy, in-sample and out-of-sample, against buy-and-hold, and
report honestly.

    python3 run.py                      # synthetic series, clearly marked
    python3 run.py ../data/BTCUSDT_1d.csv

Nothing in this repository can place an order. It is a research tool.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import run_backtest, split_sample, permutation_test  # noqa: E402
from strategies import REGISTRY  # noqa: E402

FEE_BPS = 10.0        # 0.10% taker — a realistic retail exchange fee
SLIP_BPS = 5.0        # 0.05% slippage per side


def synthetic(n: int = 1500, seed: int = 42) -> pd.DataFrame:
    """
    A price path with volatility clustering and fat tails, so the engine is
    exercised against something that behaves like a market.

    IT IS NOT A MARKET. No result from it says anything about whether a
    strategy works. It exists so the machinery can be demonstrated without
    network access.
    """
    rng = np.random.default_rng(seed)
    vol = np.zeros(n)
    ret = np.zeros(n)
    vol[0] = 0.03
    for t in range(1, n):
        # GARCH(1,1)-ish persistence: quiet begets quiet, chaos begets chaos
        vol[t] = np.sqrt(0.000004 + 0.09 * ret[t - 1] ** 2 + 0.90 * vol[t - 1] ** 2)
        ret[t] = 0.0004 + vol[t] * rng.standard_t(4) / np.sqrt(2)

    close = 20000 * np.cumprod(1 + ret)
    idx = pd.date_range("2022-01-01", periods=n, freq="D")
    df = pd.DataFrame({"close": close}, index=idx)
    noise = np.abs(rng.normal(0, 0.004, n))
    df["high"] = df["close"] * (1 + noise)
    df["low"] = df["close"] * (1 - noise)
    df["open"] = df["close"].shift(1).fillna(df["close"])
    return df


def load(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s")
    return df.set_index("timestamp").sort_index()


def pct(x): return f"{x * 100:,.1f}%"


def main():
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        px = load(sys.argv[1])
        source = os.path.basename(sys.argv[1])
        real_data = True
    else:
        px = synthetic()
        source = "SYNTHETIC — not a market"
        real_data = False

    train, test = split_sample(px, 0.6)

    print("=" * 78)
    print(f"  DATA: {source}")
    print(f"  {len(px)} bars · {px.index[0].date()} → {px.index[-1].date()}")
    print(f"  COSTS: {FEE_BPS:.0f}bps fee + {SLIP_BPS:.0f}bps slippage, each side of every trade")
    if not real_data:
        print()
        print("  !! These numbers describe a random series, not any real asset.")
        print("  !! Run fetch.py on your own machine for results that mean anything.")
    print("=" * 78)
    print()

    results = {"source": source, "real_data": real_data, "strategies": {}}
    rows = []

    for name, fn in REGISTRY.items():
        full = run_backtest(px, fn(px), FEE_BPS, SLIP_BPS)
        oos = run_backtest(test, fn(test), FEE_BPS, SLIP_BPS)
        ins = run_backtest(train, fn(train), FEE_BPS, SLIP_BPS)

        m, om = full["metrics"], oos["metrics"]
        bench = full["bench_metrics"]

        perm = (permutation_test(px, fn, n_trials=120, fee_bps=FEE_BPS, slippage_bps=SLIP_BPS)
                if name != "Buy & hold" else None)

        rows.append((name, m, om, perm))
        results["strategies"][name] = {
            "full": m, "in_sample": ins["metrics"], "out_of_sample": om,
            "permutation": perm,
            "equity": [round(v, 4) for v in full["equity"].tolist()],
        }

    results["benchmark"] = bench
    results["dates"] = [d.strftime("%Y-%m-%d") for d in px.index]

    hdr = f"{'STRATEGY':<22}{'CAGR':>9}{'SHARPE':>8}{'MAX DD':>9}{'TRADES':>8}{'COSTS':>8}{'OOS SHARPE':>12}{'vs LUCK':>10}"
    print(hdr)
    print("-" * len(hdr))
    for name, m, om, perm in rows:
        luck = "—" if perm is None else f"p={perm['p_value']:.2f}"
        print(f"{name:<22}{pct(m['cagr']):>9}{m['sharpe']:>8.2f}{pct(m['max_dd']):>9}"
              f"{m['trades']:>8}{pct(m['cost_drag']):>8}{om['sharpe']:>12.2f}{luck:>10}")

    print()
    bh = results["strategies"]["Buy & hold"]["full"]
    beat = [n for n, m, om, _ in rows
            if n != "Buy & hold" and m["cagr"] > bh["cagr"] and om["sharpe"] > 0]
    print(f"  Buy & hold: {pct(bh['cagr'])} CAGR, {bh['sharpe']:.2f} Sharpe, {pct(bh['max_dd'])} drawdown")
    print(f"  Strategies beating it on CAGR with positive out-of-sample Sharpe: "
          f"{', '.join(beat) if beat else 'NONE'}")
    print()
    print("  A p-value above 0.05 means shuffled data produced that Sharpe just")
    print("  as often — the result is indistinguishable from luck.")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results.json")
    with open(out, "w") as f:
        json.dump(results, f)
    print(f"\n  wrote {out}")


if __name__ == "__main__":
    main()
