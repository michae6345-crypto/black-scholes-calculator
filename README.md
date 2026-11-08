# black-scholes

[![tests](https://github.com/michae6345-crypto/black-scholes-calculator/actions/workflows/tests.yml/badge.svg)](https://github.com/michae6345-crypto/black-scholes-calculator/actions/workflows/tests.yml)

A Python library for pricing European options under the Black-Scholes model. It has no third-party dependencies; everything is built on the standard library's `math` module.

It covers:

- Call and put prices, with a continuous dividend yield.
- 17 Greeks in closed form, up to third order (speed, zomma, color, ultima).
- A Crank-Nicolson finite-difference solver for the Black-Scholes PDE. It uses a 400 x 400 grid by default and solves each time step with a tridiagonal (Thomas) solve. It exists to check the closed form.
- Implied volatility by Newton's method on vega, falling back to bisection when a Newton step leaves the bracket.

## Install

Requires Python 3.10 or newer.

```
git clone https://github.com/michae6345-crypto/black-scholes-calculator.git
cd black-scholes-calculator
pip install -e .
```

## Usage

```python
from blackscholes import Option, call_price, put_price, delta, gamma, speed, implied_vol, pde_price

o = Option(spot=100, strike=100, rate=0.05, vol=0.2, time=1.0)

print(round(call_price(o), 4))                    # 10.4506
print(round(put_price(o), 4))                     # 5.5735
print(round(delta(o, "call"), 4))                 # 0.6368
print(round(gamma(o), 4))                         # 0.0188
print(round(speed(o), 6))                         # -0.000516
print(round(implied_vol(o, "call", 10.4506), 4))  # 0.2
print(round(pde_price(o, "call"), 4))             # 10.4481
```

`all_greeks(o, "call")` returns every Greek in a dict. Each one is also a plain function: `delta`, `gamma`, `theta`, `vega`, `rho`, `epsilon`, `lambda_`, `vanna`, `charm`, `vomma`, `veta`, `dual_delta`, `dual_gamma`, `speed`, `zomma`, `color`, `ultima`.

Values are raw partial derivatives. Theta, charm, veta and color are per year. Vega, rho, epsilon and the vol Greeks are per unit of the input (1.0 = 100%).

From the command line:

```
python -m blackscholes call --spot 100 --strike 100 --rate 0.05 --vol 0.2 --time 1
```

## Tests

```
pip install -e ".[dev]"
pytest
```

117 tests. They check:

- prices against textbook values and put-call parity
- each Greek against a central finite difference of the price or of the next lower-order Greek
- higher-order Greek values against reference numbers from the JavaScript port in `web/assets/bs.js`
- implied vol recovering the input vol for calls and puts
- the PDE solver landing within 0.02 of the closed form

GitHub Actions runs the suite on Python 3.11 and 3.12 for every push and pull request.

## Layout

```
blackscholes/
  option.py        Option dataclass and input validation
  normal.py        normal pdf and cdf
  pricing.py       d1, d2, call and put prices
  greeks.py        Greeks in closed form
  implied_vol.py   Newton + bisection
  pde.py           Crank-Nicolson solver
  cli.py           python -m blackscholes
tests/
web/               static site: pricer, analytics, strategies, math pages
```

The site in `web/` uses a JavaScript port of the same math (`web/assets/bs.js`), plus a binomial tree and Monte Carlo pricer that exist only there. To run it locally:

```
python3 -m http.server 8000 -d web
```
