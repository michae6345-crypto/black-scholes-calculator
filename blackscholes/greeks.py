from math import exp, sqrt

from .normal import cdf, pdf
from .option import Option
from .pricing import d1, d2, price


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


def epsilon(o: Option, kind: str) -> float:
    s = o.spot * o.time * exp(-o.dividend * o.time)
    if kind == "call":
        return -s * cdf(d1(o))
    return s * cdf(-d1(o))


def lambda_(o: Option, kind: str) -> float:
    return delta(o, kind) * o.spot / price(o, kind)


def vanna(o: Option) -> float:
    return -exp(-o.dividend * o.time) * pdf(d1(o)) * d2(o) / o.vol


# Charm, veta and color are derivatives in calendar time, like theta: -d/dT.
def charm(o: Option, kind: str) -> float:
    q = exp(-o.dividend * o.time)
    sq = o.vol * sqrt(o.time)
    core = q * pdf(d1(o)) * (2.0 * (o.rate - o.dividend) * o.time - d2(o) * sq) / (2.0 * o.time * sq)
    if kind == "call":
        return o.dividend * q * cdf(d1(o)) - core
    return -o.dividend * q * cdf(-d1(o)) - core


def vomma(o: Option) -> float:
    return vega(o) * d1(o) * d2(o) / o.vol


def veta(o: Option) -> float:
    sq = o.vol * sqrt(o.time)
    return vega(o) * (
        o.dividend
        + (o.rate - o.dividend) * d1(o) / sq
        - (1.0 + d1(o) * d2(o)) / (2.0 * o.time)
    )


def dual_delta(o: Option, kind: str) -> float:
    r = exp(-o.rate * o.time)
    if kind == "call":
        return -r * cdf(d2(o))
    return r * cdf(-d2(o))


def dual_gamma(o: Option) -> float:
    return exp(-o.rate * o.time) * pdf(d2(o)) / (o.strike * o.vol * sqrt(o.time))


def speed(o: Option) -> float:
    return -gamma(o) / o.spot * (d1(o) / (o.vol * sqrt(o.time)) + 1.0)


def zomma(o: Option) -> float:
    return gamma(o) * (d1(o) * d2(o) - 1.0) / o.vol


def color(o: Option) -> float:
    sq = o.vol * sqrt(o.time)
    drift = (2.0 * (o.rate - o.dividend) * o.time - d2(o) * sq) / sq
    return (
        exp(-o.dividend * o.time)
        * pdf(d1(o))
        / (2.0 * o.spot * o.time * sq)
        * (2.0 * o.dividend * o.time + 1.0 + drift * d1(o))
    )


def ultima(o: Option) -> float:
    x = d1(o) * d2(o)
    return -vega(o) / o.vol**2 * (x * (1.0 - x) + d1(o) ** 2 + d2(o) ** 2)


def all_greeks(o: Option, kind: str) -> dict[str, float]:
    return {
        "delta": delta(o, kind),
        "gamma": gamma(o),
        "theta": theta(o, kind),
        "vega": vega(o),
        "rho": rho(o, kind),
        "epsilon": epsilon(o, kind),
        "lambda": lambda_(o, kind),
        "vanna": vanna(o),
        "charm": charm(o, kind),
        "vomma": vomma(o),
        "veta": veta(o),
        "dual_delta": dual_delta(o, kind),
        "dual_gamma": dual_gamma(o),
        "speed": speed(o),
        "zomma": zomma(o),
        "color": color(o),
        "ultima": ultima(o),
    }
