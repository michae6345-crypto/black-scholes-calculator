from math import exp, log, sqrt

from .normal import cdf
from .option import Option


def d1(o: Option) -> float:
    return (log(o.spot / o.strike) + (o.rate - o.dividend + 0.5 * o.vol**2) * o.time) / (
        o.vol * sqrt(o.time)
    )


def d2(o: Option) -> float:
    return d1(o) - o.vol * sqrt(o.time)


def _expired_or_flat(o: Option) -> bool:
    return o.time == 0 or o.vol == 0


def call_price(o: Option) -> float:
    if _expired_or_flat(o):
        forward = o.spot * exp(-o.dividend * o.time)
        return max(forward - o.strike * exp(-o.rate * o.time), 0.0)
    return o.spot * exp(-o.dividend * o.time) * cdf(d1(o)) - o.strike * exp(-o.rate * o.time) * cdf(
        d2(o)
    )


def put_price(o: Option) -> float:
    if _expired_or_flat(o):
        forward = o.spot * exp(-o.dividend * o.time)
        return max(o.strike * exp(-o.rate * o.time) - forward, 0.0)
    return o.strike * exp(-o.rate * o.time) * cdf(-d2(o)) - o.spot * exp(-o.dividend * o.time) * cdf(
        -d1(o)
    )


def price(o: Option, kind: str) -> float:
    if kind == "call":
        return call_price(o)
    if kind == "put":
        return put_price(o)
    raise ValueError(f"kind must be 'call' or 'put', got {kind!r}")
