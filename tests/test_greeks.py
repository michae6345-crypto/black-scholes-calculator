from dataclasses import replace

import pytest

from blackscholes import (
    Option,
    charm,
    color,
    delta,
    dual_delta,
    dual_gamma,
    epsilon,
    gamma,
    lambda_,
    price,
    rho,
    speed,
    theta,
    ultima,
    vanna,
    vega,
    veta,
    vomma,
    zomma,
)

CASES = [
    Option(spot=100, strike=100, rate=0.05, vol=0.2, time=1.0),
    Option(spot=95, strike=105, rate=0.02, vol=0.35, time=0.5, dividend=0.03),
    Option(spot=130, strike=100, rate=0.07, vol=0.15, time=2.0),
]
BOTH = ["call", "put"]


def bump(o, field, h, kind):
    up = price(replace(o, **{field: getattr(o, field) + h}), kind)
    dn = price(replace(o, **{field: getattr(o, field) - h}), kind)
    return (up - dn) / (2 * h)


def bump_fn(fn, o, field, h, *args):
    up = fn(replace(o, **{field: getattr(o, field) + h}), *args)
    dn = fn(replace(o, **{field: getattr(o, field) - h}), *args)
    return (up - dn) / (2 * h)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_delta_matches_bump(o, kind):
    assert delta(o, kind) == pytest.approx(bump(o, "spot", 1e-3, kind), abs=1e-6)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_gamma_matches_bumped_delta(o, kind):
    assert gamma(o) == pytest.approx(bump_fn(delta, o, "spot", 1e-3, kind), abs=1e-6)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_vega_matches_bump(o, kind):
    assert vega(o) == pytest.approx(bump(o, "vol", 1e-5, kind), abs=1e-5)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_theta_matches_bump(o, kind):
    assert theta(o, kind) == pytest.approx(-bump(o, "time", 1e-5, kind), abs=1e-4)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_rho_matches_bump(o, kind):
    assert rho(o, kind) == pytest.approx(bump(o, "rate", 1e-5, kind), abs=1e-4)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_epsilon_matches_bump(o, kind):
    assert epsilon(o, kind) == pytest.approx(bump(o, "dividend", 1e-5, kind), abs=1e-4)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_lambda_is_bumped_elasticity(o, kind):
    expected = bump(o, "spot", 1e-3, kind) * o.spot / price(o, kind)
    assert lambda_(o, kind) == pytest.approx(expected, abs=1e-4)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_vanna_matches_bumped_delta(o, kind):
    assert vanna(o) == pytest.approx(bump_fn(delta, o, "vol", 1e-5, kind), abs=1e-5)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_charm_matches_bumped_delta(o, kind):
    assert charm(o, kind) == pytest.approx(-bump_fn(delta, o, "time", 1e-5, kind), abs=1e-5)


@pytest.mark.parametrize("o", CASES)
def test_vomma_matches_bumped_vega(o):
    assert vomma(o) == pytest.approx(bump_fn(vega, o, "vol", 1e-5), abs=1e-3)


@pytest.mark.parametrize("o", CASES)
def test_veta_matches_bumped_vega(o):
    assert veta(o) == pytest.approx(-bump_fn(vega, o, "time", 1e-5), abs=1e-3)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_dual_delta_matches_bump(o, kind):
    assert dual_delta(o, kind) == pytest.approx(bump(o, "strike", 1e-3, kind), abs=1e-6)


@pytest.mark.parametrize("o", CASES)
@pytest.mark.parametrize("kind", BOTH)
def test_dual_gamma_matches_bumped_dual_delta(o, kind):
    assert dual_gamma(o) == pytest.approx(bump_fn(dual_delta, o, "strike", 1e-3, kind), abs=1e-6)


@pytest.mark.parametrize("o", CASES)
def test_speed_matches_bumped_gamma(o):
    assert speed(o) == pytest.approx(bump_fn(gamma, o, "spot", 1e-2), abs=1e-7)


@pytest.mark.parametrize("o", CASES)
def test_zomma_matches_bumped_gamma(o):
    assert zomma(o) == pytest.approx(bump_fn(gamma, o, "vol", 1e-5), abs=1e-5)


@pytest.mark.parametrize("o", CASES)
def test_color_matches_bumped_gamma(o):
    assert color(o) == pytest.approx(-bump_fn(gamma, o, "time", 1e-5), abs=1e-5)


@pytest.mark.parametrize("o", CASES)
def test_ultima_matches_bumped_vomma(o):
    assert ultima(o) == pytest.approx(bump_fn(vomma, o, "vol", 1e-5), abs=1e-2)


def test_matches_js_reference():
    o = CASES[0]
    assert vanna(o) == pytest.approx(-0.28143, abs=1e-5)
    assert charm(o, "call") == pytest.approx(-0.06567, abs=1e-5)
    assert vomma(o) == pytest.approx(9.8501, abs=1e-4)
    assert veta(o) == pytest.approx(-16.464, abs=1e-3)
    assert speed(o) == pytest.approx(-5.160e-4, abs=1e-7)
    assert zomma(o) == pytest.approx(-0.08889, abs=1e-5)
    assert color(o) == pytest.approx(0.01053, abs=1e-5)
    assert ultima(o) == pytest.approx(-182.69, abs=1e-2)
    assert dual_delta(o, "call") == pytest.approx(-0.53232, abs=1e-5)
    assert epsilon(o, "call") == pytest.approx(-63.683, abs=1e-3)


def test_call_put_delta_differ_by_discount():
    o = CASES[1]
    from math import exp

    assert delta(o, "call") - delta(o, "put") == pytest.approx(exp(-o.dividend * o.time))
