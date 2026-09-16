from math import exp

import pytest

from blackscholes import Option, call_price, put_price

ATM = Option(spot=100, strike=100, rate=0.05, vol=0.2, time=1.0)


def test_textbook_call():
    assert call_price(ATM) == pytest.approx(10.4506, abs=1e-4)


def test_textbook_put():
    assert put_price(ATM) == pytest.approx(5.5735, abs=1e-4)


@pytest.mark.parametrize("spot", [60, 90, 100, 110, 150])
@pytest.mark.parametrize("vol", [0.1, 0.3, 0.8])
def test_put_call_parity(spot, vol):
    o = Option(spot=spot, strike=100, rate=0.03, vol=vol, time=0.75, dividend=0.01)
    lhs = call_price(o) - put_price(o)
    rhs = spot * exp(-0.01 * 0.75) - 100 * exp(-0.03 * 0.75)
    assert lhs == pytest.approx(rhs, abs=1e-10)


def test_expiry_is_intrinsic():
    itm = Option(spot=120, strike=100, rate=0.05, vol=0.2, time=0.0)
    otm = Option(spot=80, strike=100, rate=0.05, vol=0.2, time=0.0)
    assert call_price(itm) == 20.0
    assert call_price(otm) == 0.0
    assert put_price(otm) == 20.0


def test_zero_vol_is_discounted_forward():
    o = Option(spot=110, strike=100, rate=0.05, vol=0.0, time=1.0)
    assert call_price(o) == pytest.approx(110 - 100 * exp(-0.05))


def test_rejects_bad_inputs():
    with pytest.raises(ValueError):
        Option(spot=-1, strike=100, rate=0.0, vol=0.2, time=1.0)
    with pytest.raises(ValueError):
        Option(spot=100, strike=100, rate=0.0, vol=-0.2, time=1.0)
