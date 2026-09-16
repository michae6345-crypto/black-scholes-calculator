from math import exp, sqrt

from .normal import cdf, pdf
from .option import Option
from .pricing import d1, d2


def delta(o: Option, kind: str) -> float:
    q = exp(-o.dividend * o.time)
    if kind == "call":
        return q * cdf(d1(o))
    return q * (cdf(d1(o)) - 1.0)


def gamma(o: Option) -> float:
    return exp(-o.dividend * o.time) * pdf(d1(o)) / (o.spot * o.vol * sqrt(o.time))


def vega(o: Option) -> float:
    return o.spot * exp(-o.dividend * o.time) * pdf(d1(o)) * sqrt(o.time)


# Theta is per year. Divide by 365 for the per-day number most people quote.
def theta(o: Option, kind: str) -> float:
    q = exp(-o.dividend * o.time)
    r = exp(-o.rate * o.time)
    decay = -o.spot * q * pdf(d1(o)) * o.vol / (2.0 * sqrt(o.time))
    if kind == "call":
        return decay - o.rate * o.strike * r * cdf(d2(o)) + o.dividend * o.spot * q * cdf(d1(o))
    return decay + o.rate * o.strike * r * cdf(-d2(o)) - o.dividend * o.spot * q * cdf(-d1(o))


def rho(o: Option, kind: str) -> float:
    k = o.strike * o.time * exp(-o.rate * o.time)
    if kind == "call":
        return k * cdf(d2(o))
    return -k * cdf(-d2(o))


def all_greeks(o: Option, kind: str) -> dict[str, float]:
    return {
        "delta": delta(o, kind),
        "gamma": gamma(o),
        "theta": theta(o, kind),
        "vega": vega(o),
        "rho": rho(o, kind),
    }
