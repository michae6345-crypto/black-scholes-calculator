# black-scholes

Black-Scholes pricing and Greeks for European options, written from scratch in plain `math`, with a small site on top.

## Site

- **Pricer** (`/`): price a call or put and see every Greek, first through third order, with curves against spot, vol, rate and time.
- **Analytics** (`/analytics`): implied vol, risk-neutral probabilities, and the closed form checked against a binomial tree, Crank-Nicolson and Monte Carlo.
- **Strategies** (`/strategies`): multi-leg positions (spreads, straddles, condors, collars) with payoff, P&L over time, net Greeks and probability of profit.
- **Math** (`/math`): the model, the formulas, and where each Greek comes from.

Hosted on Vercel. To run it yourself, open `web/index.html` directly or serve the folder:

```
python3 -m http.server 8000 -d web
```

## Python

```
pip install -e .
```

```python
from blackscholes import Option, call_price, all_greeks

o = Option(spot=100, strike=100, rate=0.05, vol=0.2, time=1)
call_price(o)          # 10.4506
all_greeks(o, "call")  # {'delta': 0.6368, 'gamma': 0.0188, 'theta': -6.414, 'vega': 37.524, 'rho': 53.232, 'epsilon': -63.683, ...}
```

From the terminal:

```
python3 -m blackscholes call --spot 100 --strike 100 --rate 0.05 --vol 0.2 --time 1
```

Every Greek in `all_greeks` is also a plain function: `delta`, `gamma`, `theta`, `vega`, `rho`, `epsilon`, `lambda_`, `vanna`, `charm`, `vomma`, `veta`, `dual_delta`, `dual_gamma`, `speed`, `zomma`, `color`, `ultima`.

Units: the library returns raw partial derivatives. Theta, charm, color and veta are per year; vega, rho, epsilon and the vol Greeks are per unit (1.0 = 100%). The site divides these for display (per day, per 1%).

On Windows, use `python` instead of `python3`, and `;` instead of `&&` in PowerShell.

## Numerical methods

- Implied vol: Newton's method on vega, with bisection when a step leaves the bracket.
- Binomial: Cox-Ross-Rubinstein tree, with optional American early exercise (site only).
- PDE: Crank-Nicolson finite differences on the Black-Scholes equation, used to check the closed form.
- Monte Carlo: terminal-price simulation with antithetic variates and a fixed seed (site only).

## Tests

```
pip install pytest
pytest
```

The tests check prices against textbook values and put-call parity, compare every Greek to a central finite-difference bump of the next lower-order quantity, check the higher-order Greeks against the JS port, and confirm the PDE solver lands on the closed form.

## Layout

```
blackscholes/
  option.py        Option dataclass and input validation
  normal.py        normal pdf and cdf
  pricing.py       d1, d2, call and put prices
  greeks.py        all Greeks in closed form
  implied_vol.py   Newton + bisection
  pde.py           Crank-Nicolson solver
  cli.py           python -m blackscholes
tests/
web/
  index.html       the site
  assets/bs.js     JS port of the math, plus tree, PDE, Monte Carlo and strategies
  assets/ui.js     shared page chrome and state
  assets/chart.js  charts
```
