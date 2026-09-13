#!/usr/bin/env python3
"""
Tests for the engine itself.

A backtester that always says "no edge" is as useless as one that always says
"edge". These check it reports what is actually there — including catching the
two classic ways a backtest lies: lookahead, and crediting a long-only
strategy for drift it did nothing to earn.
"""

import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import run_backtest, permutation_test  # noqa: E402
from strategies import sma_cross, buy_and_hold  # noqa: E402


def trending_series(n=1200, seed=3):
    """A path that rises with momentum: returns positively autocorrelated."""
    rng = np.random.default_rng(seed)
    r = np.zeros(n)
    for t in range(1, n):
        r[t] = 0.45 * r[t - 1] + rng.normal(0, 0.012)
    close = 100 * np.cumprod(1 + r)
    df = pd.DataFrame({"close": close},
                      index=pd.date_range("2021-01-01", periods=n, freq="D"))
    df["high"] = df["low"] = df["open"] = df["close"]
    return df


def regime_series(n=2400, seed=11):
    """
    Long bull and bear regimes that roughly cancel, so buy-and-hold ends
    nowhere. Here TIMING is the whole edge — which is what is needed to test
    that the permutation test can see skill when skill is real.
    """
    rng = np.random.default_rng(seed)
    # Deterministic alternating blocks of EQUAL length, so the drifts cancel
    # exactly and holding the asset earns nothing. Anything the strategy makes
    # here it made by being in and out at the right times.
    # Blocks must be long enough for a 100-day average to actually turn
    # inside one — at 120 bars the strategy is still catching up when the
    # regime ends, and the "edge" it cannot reach is not an engine fault.
    block = 300
    drift = np.array([0.0022 if (t // block) % 2 == 0 else -0.0022 for t in range(n)])
    r = drift + rng.normal(0, 0.009, n)
    close = 100 * np.cumprod(1 + r)
    df = pd.DataFrame({"close": close},
                      index=pd.date_range("2021-01-01", periods=n, freq="D"))
    df["high"] = df["low"] = df["open"] = df["close"]
    return df


def main():
    results = []

    def check(name, passed, detail=""):
        results.append(passed)
        print(f"  {'PASS' if passed else 'FAIL'}  {name}{'  — ' + detail if detail else ''}")

    print("\nENGINE TESTS\n" + "-" * 72)

    # --- it must find an edge that is genuinely there -----------------------
    px = trending_series()
    res = run_backtest(px, sma_cross(px), fee_bps=10, slippage_bps=5)
    check("detects a real edge in a trending series",
          res["metrics"]["sharpe"] > 0.5, f"Sharpe {res['metrics']['sharpe']:.2f}")

    # --- but must not mistake drift for skill -------------------------------
    excess = res["metrics"]["sharpe"] - res["bench_metrics"]["sharpe"]
    drift_p = permutation_test(px, sma_cross, n_trials=80)["p_value"]
    check("does not credit drift-harvesting as skill",
          drift_p > 0.05 and excess < 0.3,
          f"excess only {excess:.2f} over buy & hold, p={drift_p:.2f}")

    # --- where timing IS the edge, it must find it --------------------------
    rx = regime_series()
    rres = run_backtest(rx, sma_cross(rx), fee_bps=10, slippage_bps=5)
    rexcess = rres["metrics"]["sharpe"] - rres["bench_metrics"]["sharpe"]
    check("finds timing skill when buy & hold goes nowhere", rexcess > 0.5,
          f"strategy {rres['metrics']['sharpe']:.2f} vs hold {rres['bench_metrics']['sharpe']:.2f}")

    rp = permutation_test(rx, sma_cross, n_trials=120)["p_value"]
    check("permutation test rejects luck when timing is real",
          rp < 0.05, f"p={rp:.3f}")

    # --- no lookahead -------------------------------------------------------
    close = px["close"]
    future = (close.shift(-1) > close).astype(float)   # tomorrow's direction
    cheat = run_backtest(px, future, fee_bps=0, slippage_bps=0)
    lagged = run_backtest(px, future.shift(1).fillna(0), fee_bps=0, slippage_bps=0)
    check("applies a one-bar lag to every signal",
          cheat["metrics"]["sharpe"] - lagged["metrics"]["sharpe"] > 1.0,
          "perfect foresight beats lagged foresight, so the shift is real")

    # --- costs, benchmark, degenerate cases ---------------------------------
    free = run_backtest(px, sma_cross(px), fee_bps=0, slippage_bps=0)
    paid = run_backtest(px, sma_cross(px), fee_bps=50, slippage_bps=50)
    check("costs reduce returns monotonically",
          paid["metrics"]["total_return"] < free["metrics"]["total_return"],
          f"{paid['metrics']['total_return']:.1%} paid vs {free['metrics']['total_return']:.1%} free")

    bh = run_backtest(px, buy_and_hold(px), fee_bps=10, slippage_bps=5)
    asset = close.iloc[-1] / close.iloc[0] - 1
    check("buy & hold tracks the underlying",
          abs(bh["metrics"]["total_return"] - asset) < 0.02,
          f"{bh['metrics']['total_return']:.1%} vs asset {asset:.1%}")

    flat = run_backtest(px, pd.Series(0.0, index=px.index), fee_bps=10, slippage_bps=5)
    check("a flat position returns exactly zero",
          abs(flat["metrics"]["total_return"]) < 1e-12)

    check("max drawdown is bounded",
          -1.0 <= res["metrics"]["max_dd"] <= 0.0, f"{res['metrics']['max_dd']:.1%}")

    print("-" * 72)
    passed = all(results)
    print(f"{sum(results)}/{len(results)} checks passed" + ("" if passed else "  — FAILURES ABOVE") + "\n")
    return passed


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
