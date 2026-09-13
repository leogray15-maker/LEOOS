"""
Strategies.

Each takes an OHLCV frame and returns target exposure in [0, 1], indexed to the
frame. A value at bar t may only use data up to and including bar t — the
engine applies the one-bar lag before anything is held.

These are the classics on purpose. If a well-known strategy shows a huge edge
in your backtest, the backtest is wrong, not the market.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def buy_and_hold(px: pd.DataFrame) -> pd.Series:
    return pd.Series(1.0, index=px.index)


def sma_cross(px: pd.DataFrame, fast: int = 20, slow: int = 100) -> pd.Series:
    c = px["close"]
    f = c.rolling(fast).mean()
    s = c.rolling(slow).mean()
    return (f > s).astype(float)


def donchian_breakout(px: pd.DataFrame, entry: int = 20, exit_: int = 10) -> pd.Series:
    """Classic turtle-style channel breakout, long/flat."""
    c = px["close"]
    hi = c.rolling(entry).max()
    lo = c.rolling(exit_).min()

    pos = np.zeros(len(c))
    holding = 0.0
    cv, hv, lv = c.to_numpy(), hi.to_numpy(), lo.to_numpy()
    for i in range(len(c)):
        if np.isnan(hv[i]) or np.isnan(lv[i]):
            pos[i] = 0.0
            continue
        if holding == 0.0 and cv[i] >= hv[i]:
            holding = 1.0
        elif holding == 1.0 and cv[i] <= lv[i]:
            holding = 0.0
        pos[i] = holding
    return pd.Series(pos, index=px.index)


def rsi_mean_reversion(px: pd.DataFrame, period: int = 14, buy: int = 30, sell: int = 55) -> pd.Series:
    c = px["close"]
    delta = c.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - 100 / (1 + rs)

    pos = np.zeros(len(c))
    holding = 0.0
    rv = rsi.to_numpy()
    for i in range(len(c)):
        if np.isnan(rv[i]):
            pos[i] = 0.0
            continue
        if holding == 0.0 and rv[i] < buy:
            holding = 1.0
        elif holding == 1.0 and rv[i] > sell:
            holding = 0.0
        pos[i] = holding
    return pd.Series(pos, index=px.index)


def vol_targeted_trend(
    px: pd.DataFrame, fast: int = 20, slow: int = 100,
    target_vol: float = 0.40, lookback: int = 30,
) -> pd.Series:
    """
    Trend direction, but size the position so realised volatility sits near
    target. This is the one real lever most retail systems never pull: it does
    not improve returns so much as stop a bad month ending you.
    """
    c = px["close"]
    trend = (c.rolling(fast).mean() > c.rolling(slow).mean()).astype(float)
    realised = c.pct_change().rolling(lookback).std() * np.sqrt(365)
    size = (target_vol / realised).clip(0.0, 1.0)
    return (trend * size).fillna(0.0)


REGISTRY = {
    "Buy & hold":        buy_and_hold,
    "SMA 20/100":        sma_cross,
    "Donchian 20/10":    donchian_breakout,
    "RSI mean reversion": rsi_mean_reversion,
    "Vol-targeted trend": vol_targeted_trend,
}
