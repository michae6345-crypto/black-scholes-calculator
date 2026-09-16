from dataclasses import replace

import pytest

from blackscholes import Option, delta, gamma, price, rho, theta, vega

CASES = [
    Option(spot=100, strike=100, rate=0.05, vol=0.2, time=1.0),
    Option(spot=95, strike=105, rate=0.02, vol=0.35, time=0.5, dividend=0.03),
    Option(spot=130, strike=100, rate=0.07, vol=0.15, time=2.0),
]


def bump(o, field, h, kind):
    up = price(replace(o, **{field: getattr(o, field) + h}), kind)
    dn = price(replace(o, **{field: getattr(o, field) - h}), kind)
    return (up - dn) / (2 * h)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", ["call", "put"])
def test_delta_matches_bump(o, kind):
    assert delta(o, kind) == pytest.approx(bump(o, "spot", 1e-3, kind), abs=1e-6)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", ["call", "put"])
def test_gamma_matches_bumped_delta(o, kind):
    h = 1e-3
    up = delta(replace(o, spot=o.spot + h), kind)
    dn = delta(replace(o, spot=o.spot - h), kind)
    assert gamma(o) == pytest.approx((up - dn) / (2 * h), abs=1e-6)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", ["call", "put"])
def test_vega_matches_bump(o, kind):
    assert vega(o) == pytest.approx(bump(o, "vol", 1e-5, kind), abs=1e-5)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", ["call", "put"])
def test_theta_matches_bump(o, kind):
    assert theta(o, kind) == pytest.approx(-bump(o, "time", 1e-5, kind), abs=1e-4)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", ["call", "put"])
def test_rho_matches_bump(o, kind):
    assert rho(o, kind) == pytest.approx(bump(o, "rate", 1e-5, kind), abs=1e-4)


def test_call_put_delta_differ_by_discount():
    o = CASES[1]
    from math import exp

    assert delta(o, "call") - delta(o, "put") == pytest.approx(exp(-o.dividend * o.time))
