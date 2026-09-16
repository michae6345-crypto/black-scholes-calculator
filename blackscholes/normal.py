from math import erf, exp, pi, sqrt

SQRT_2 = sqrt(2.0)
SQRT_2PI = sqrt(2.0 * pi)


def pdf(x: float) -> float:
    return exp(-0.5 * x * x) / SQRT_2PI


def cdf(x: float) -> float:
    return 0.5 * (1.0 + erf(x / SQRT_2))
