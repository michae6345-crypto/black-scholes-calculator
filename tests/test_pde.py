import pytest

from blackscholes import Option, call_price, pde_price, put_price


@pytest.mark.parametrize(
    "o",
    [
        Option(spot=100, strike=100, rate=0.05, vol=0.2, time=1.0),
        Option(spot=90, strike=100, rate=0.03, vol=0.3, time=0.5, dividend=0.02),
    ],
)
def test_pde_agrees_with_closed_form(o):
    assert pde_price(o, "call") == pytest.approx(call_price(o), abs=0.02)
    assert pde_price(o, "put") == pytest.approx(put_price(o), abs=0.02)
