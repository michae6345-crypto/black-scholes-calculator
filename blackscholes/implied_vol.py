from dataclasses import replace

from .greeks import vega
from .option import Option
from .pricing import price


def implied_vol(
    o: Option, kind: str, market_price: float, tol: float = 1e-8, max_iter: int = 100
) -> float:
    lo, hi = 1e-6, 5.0
    if not price(replace(o, vol=lo), kind) <= market_price <= price(replace(o, vol=hi), kind):
        raise ValueError("market price is outside the range Black-Scholes can reproduce")

    sigma = 0.3
    for _ in range(max_iter):
        trial = replace(o, vol=sigma)
        diff = price(trial, kind) - market_price
        if abs(diff) < tol:
            return sigma
        if diff > 0:
            hi = sigma
        else:
            lo = sigma
        v = vega(trial)
        step = sigma - diff / v if v > 1e-12 else None
        sigma = step if step is not None and lo < step < hi else 0.5 * (lo + hi)
    return sigma
