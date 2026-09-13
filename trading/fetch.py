#!/usr/bin/env python3
"""
Pull real daily OHLCV and write a CSV the backtester reads.

Run this on YOUR machine — the sandbox this was written in has exchange APIs
blocked by an egress policy, so it could not be run here.

    python3 fetch.py BTCUSDT 1d 1000 > ../data/BTCUSDT_1d.csv

No API key needed; these are public endpoints. Nothing here can trade.
"""

import json
import sys
import urllib.request

BINANCE = "https://api.binance.com/api/v3/klines?symbol={sym}&interval={tf}&limit={n}"


def fetch(symbol="BTCUSDT", timeframe="1d", limit=1000):
    url = BINANCE.format(sym=symbol, tf=timeframe, n=min(limit, 1000))
    with urllib.request.urlopen(url, timeout=30) as r:
        rows = json.load(r)
    out = ["timestamp,open,high,low,close,volume"]
    for k in rows:
        ts = int(k[0]) // 1000
        out.append(f"{ts},{k[1]},{k[2]},{k[3]},{k[4]},{k[5]}")
    return "\n".join(out)


if __name__ == "__main__":
    sym = sys.argv[1] if len(sys.argv) > 1 else "BTCUSDT"
    tf = sys.argv[2] if len(sys.argv) > 2 else "1d"
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
    print(fetch(sym, tf, n))
