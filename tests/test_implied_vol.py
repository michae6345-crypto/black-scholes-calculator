import pytest

from blackscholes import Option, implied_vol, price


@pytest.mark.parametrize("true_vol", [0.08, 0.2, 0.6, 1.5])
@pytest.mark.parametrize("kind", ["call", "put"])
def test_recovers_vol(true_vol, kind):
    o = Option(spot=100, strike=110, rate=0.04, vol=true_vol, time=0.8)
    market = price(o, kind)
    assert implied_vol(o, kind, market) == pytest.approx(true_vol, abs=1e-6)


def test_rejects_price_below_intrinsic():
    o = Option(spot=100, strike=80, rate=0.05, vol=0.2, time=1.0)
    with pytest.raises(ValueError):
        implied_vol(o, "call", 1.0)
