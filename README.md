# black-scholes

Black-Scholes from scratch. Prices European calls and puts and gives you the Greeks. No numpy, no scipy, just `math`.

There's a small site on top of it so you can drag the inputs around and watch the curves move.

## Run it locally

```
git clone https://github.com/michae6345-crypto/black-scholes-calculator
cd black-scholes-calculator
python3 -m http.server 8000 -d web
```

Open http://localhost:8000. The page is a single HTML file with no build step.

## Use it from Python

```
pip install -e .
```

```python
from blackscholes import Option, call_price, all_greeks

o = Option(spot=100, strike=100, rate=0.05, vol=0.2, time=1)
call_price(o)          # 10.4506
all_greeks(o, "call")  # {'delta': 0.6368, 'gamma': 0.0188, 'theta': -6.414, 'vega': 37.524, 'rho': 53.232}
```

Or from the terminal:

```
python3 -m blackscholes call --spot 100 --strike 100 --rate 0.05 --vol 0.2 --time 1
```

Theta comes back per year. Vega and rho are per unit change in vol and rate, so divide by 100 if you want the usual "per 1%" numbers.

## What's in here

- `pricing.py` computes d1, d2 and the call and put prices.
- `greeks.py` has delta, gamma, theta, vega and rho in closed form.
- `implied_vol.py` inverts the price to get volatility with Newton's method and a bisection fallback.
- `pde.py` solves the Black-Scholes PDE directly with Crank-Nicolson. It exists to check the closed form against a completely different method.
- `web/` is the site.

## Tests

```
pip install pytest
pytest
```

The tests check the prices against textbook values and put-call parity, compare every Greek to a finite-difference bump of the price, and confirm the PDE solver lands on the closed-form answer.
