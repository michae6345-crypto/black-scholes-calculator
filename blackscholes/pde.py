from math import exp

from .option import Option


def _solve_tridiagonal(lower, diag, upper, rhs):
    n = len(rhs)
    c = [0.0] * n
    d = [0.0] * n
    c[0] = upper[0] / diag[0]
    d[0] = rhs[0] / diag[0]
    for i in range(1, n):
        m = diag[i] - lower[i] * c[i - 1]
        c[i] = upper[i] / m if i < n - 1 else 0.0
        d[i] = (rhs[i] - lower[i] * d[i - 1]) / m
    x = [0.0] * n
    x[-1] = d[-1]
    for i in range(n - 2, -1, -1):
        x[i] = d[i] - c[i] * x[i + 1]
    return x


# Crank-Nicolson on the Black-Scholes PDE, marching backwards from expiry.
def pde_price(o: Option, kind: str, s_steps: int = 400, t_steps: int = 400) -> float:
    s_max = 4.0 * max(o.spot, o.strike)
    ds = s_max / s_steps
    dt = o.time / t_steps
    grid = [i * ds for i in range(s_steps + 1)]

    if kind == "call":
        v = [max(s - o.strike, 0.0) for s in grid]
    else:
        v = [max(o.strike - s, 0.0) for s in grid]

    n = s_steps - 1
    a = [0.0] * n
    b = [0.0] * n
    c = [0.0] * n
    for j in range(1, s_steps):
        i = j * 1.0
        sig2 = o.vol**2 * i * i
        drift = (o.rate - o.dividend) * i
        a[j - 1] = 0.25 * dt * (sig2 - drift)
        b[j - 1] = -0.5 * dt * (sig2 + o.rate)
        c[j - 1] = 0.25 * dt * (sig2 + drift)

    lower = [-x for x in a]
    diag = [1.0 - x for x in b]
    upper = [-x for x in c]

    for step in range(1, t_steps + 1):
        tau = step * dt
        if kind == "call":
            lo_bound = 0.0
            hi_bound = s_max * exp(-o.dividend * tau) - o.strike * exp(-o.rate * tau)
        else:
            lo_bound = o.strike * exp(-o.rate * tau)
            hi_bound = 0.0

        rhs = [0.0] * n
        for j in range(1, s_steps):
            rhs[j - 1] = a[j - 1] * v[j - 1] + (1.0 + b[j - 1]) * v[j] + c[j - 1] * v[j + 1]
        rhs[0] += a[0] * lo_bound
        rhs[-1] += c[-1] * hi_bound

        inner = _solve_tridiagonal(lower, diag, upper, rhs)
        v = [lo_bound] + inner + [hi_bound]

    k = o.spot / ds
    j = min(int(k), s_steps - 1)
    w = k - j
    return (1.0 - w) * v[j] + w * v[j + 1]
