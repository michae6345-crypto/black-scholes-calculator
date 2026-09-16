// Black-Scholes-Merton math. Everything is plain functions on an inputs object:
// { S: spot, K: strike, r: rate, q: dividend yield, v: vol, T: years }
(function (global) {
  const SQRT2PI = Math.sqrt(2 * Math.PI);

  function erf(x) {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + 0.5 * x);
    const y = 1 - t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return s * y;
  }
  const pdf = x => Math.exp(-0.5 * x * x) / SQRT2PI;
  const cdf = x => 0.5 * (1 + erf(x / Math.SQRT2));

  function invCdf(p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425, ph = 1 - pl; let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > ph) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function d12(o) {
    const sq = o.v * Math.sqrt(o.T);
    const d1 = (Math.log(o.S / o.K) + (o.r - o.q + 0.5 * o.v * o.v) * o.T) / sq;
    return { d1, d2: d1 - sq, sq };
  }

  // Price plus every Greek, first through third order. Greeks are raw partial
  // derivatives: theta per year, vega and rho per unit (1.0 = 100%).
  function price(o, kind) {
    const call = kind === 'call';
    const { S, K, r, q, v, T } = o;
    const dq = Math.exp(-q * T), dr = Math.exp(-r * T);
    if (T <= 0 || v <= 0) {
      const fwd = S * dq - K * dr;
      const p = call ? Math.max(fwd, 0) : Math.max(-fwd, 0);
      const itm = call ? S > K : S < K;
      return { price: p, d1: NaN, d2: NaN, delta: itm ? (call ? 1 : -1) : 0, gamma: 0, theta: 0, vega: 0, rho: 0,
        vanna: 0, charm: 0, vomma: 0, veta: 0, speed: 0, zomma: 0, color: 0, ultima: 0, lambda: NaN, dualDelta: 0, dualGamma: 0, epsilon: 0 };
    }
    const { d1, d2, sq } = d12(o);
    const sT = Math.sqrt(T), n1 = pdf(d1), Nd1 = cdf(d1), Nd2 = cdf(d2);
    const P = call ? S * dq * Nd1 - K * dr * Nd2 : K * dr * cdf(-d2) - S * dq * cdf(-d1);
    const delta = call ? dq * Nd1 : dq * (Nd1 - 1);
    const gamma = dq * n1 / (S * sq);
    const vega = S * dq * n1 * sT;
    const decay = -S * dq * n1 * v / (2 * sT);
    const theta = call ? decay - r * K * dr * Nd2 + q * S * dq * Nd1 : decay + r * K * dr * cdf(-d2) - q * S * dq * cdf(-d1);
    const rho = call ? K * T * dr * Nd2 : -K * T * dr * cdf(-d2);
    const epsilon = call ? -S * T * dq * Nd1 : S * T * dq * cdf(-d1);
    const vanna = -dq * n1 * d2 / v;
    const charmCore = dq * n1 * (2 * (r - q) * T - d2 * sq) / (2 * T * sq);
    const charm = call ? q * dq * Nd1 - charmCore : -q * dq * cdf(-d1) - charmCore;
    const vomma = vega * d1 * d2 / v;
    const veta = S * dq * n1 * sT * (q + (r - q) * d1 / sq - (1 + d1 * d2) / (2 * T));
    const speed = -gamma / S * (d1 / sq + 1);
    const zomma = gamma * (d1 * d2 - 1) / v;
    const color = dq * n1 / (2 * S * T * sq) * (2 * q * T + 1 + (2 * (r - q) * T - d2 * sq) / sq * d1);
    const ultima = -vega / (v * v) * (d1 * d2 * (1 - d1 * d2) + d1 * d1 + d2 * d2);
    const lambda = delta * S / P;
    const dualDelta = call ? -dr * Nd2 : dr * cdf(-d2);
    const dualGamma = dr * pdf(d2) / (K * sq);
    return { price: P, d1, d2, delta, gamma, theta, vega, rho, epsilon, vanna, charm, vomma, veta, speed, zomma, color, ultima, lambda, dualDelta, dualGamma };
  }

  const GREEKS = [
    { id: 'delta',  sym: 'Δ', name: 'Delta',  order: 1, desc: '∂V/∂S', scale: 1 },
    { id: 'gamma',  sym: 'Γ', name: 'Gamma',  order: 2, desc: '∂²V/∂S²', scale: 1 },
    { id: 'theta',  sym: 'Θ', name: 'Theta',  order: 1, desc: '∂V/∂t, per day', scale: 1 / 365 },
    { id: 'vega',   sym: 'ν', name: 'Vega',   order: 1, desc: '∂V/∂σ, per 1%', scale: 0.01 },
    { id: 'rho',    sym: 'ρ', name: 'Rho',    order: 1, desc: '∂V/∂r, per 1%', scale: 0.01 },
    { id: 'epsilon',sym: 'ε', name: 'Epsilon',order: 1, desc: '∂V/∂q, per 1%', scale: 0.01 },
    { id: 'lambda', sym: 'λ', name: 'Lambda', order: 1, desc: 'Δ·S/V, elasticity', scale: 1 },
    { id: 'vanna',  sym: '',  name: 'Vanna',  order: 2, desc: '∂²V/∂S∂σ, per 1% vol', scale: 0.01 },
    { id: 'charm',  sym: '',  name: 'Charm',  order: 2, desc: '∂Δ/∂t, per day', scale: 1 / 365 },
    { id: 'vomma',  sym: '',  name: 'Vomma',  order: 2, desc: '∂²V/∂σ², per 1%²', scale: 1e-4 },
    { id: 'veta',   sym: '',  name: 'Veta',   order: 2, desc: '∂ν/∂t, per 1% per day', scale: 0.01 / 365 },
    { id: 'dualDelta', sym: '', name: 'Dual delta', order: 1, desc: '∂V/∂K', scale: 1 },
    { id: 'dualGamma', sym: '', name: 'Dual gamma', order: 2, desc: '∂²V/∂K²', scale: 1 },
    { id: 'speed',  sym: '',  name: 'Speed',  order: 3, desc: '∂Γ/∂S', scale: 1 },
    { id: 'zomma',  sym: '',  name: 'Zomma',  order: 3, desc: '∂Γ/∂σ, per 1%', scale: 0.01 },
    { id: 'color',  sym: '',  name: 'Color',  order: 3, desc: '∂Γ/∂t, per day', scale: 1 / 365 },
    { id: 'ultima', sym: '',  name: 'Ultima', order: 3, desc: '∂vomma/∂σ, per 1%³', scale: 1e-6 },
  ];
  const METRICS = [{ id: 'price', sym: 'V', name: 'Price', order: 0, desc: 'option value', scale: 1 }, ...GREEKS];
  const metricById = id => METRICS.find(m => m.id === id);
  // Value of a metric in the "quoted" convention (theta/day, vega per 1%, etc).
  function metric(res, id) { const m = metricById(id); return res[id] * m.scale; }

  function impliedVol(o, kind, target, opts = {}) {
    const tol = opts.tol || 1e-8, maxIter = opts.maxIter || 60, trace = [];
    let lo = 1e-4, hi = 5, sigma = opts.guess || Math.sqrt(2 * Math.PI / o.T) * target / o.S || 0.3;
    if (!(sigma > lo && sigma < hi)) sigma = 0.3;
    const pLo = price({ ...o, v: lo }, kind).price, pHi = price({ ...o, v: hi }, kind).price;
    if (target < pLo - 1e-10 || target > pHi + 1e-10) return { vol: NaN, iterations: trace, ok: false, reason: target < pLo ? 'below intrinsic' : 'above the maximum the model can produce' };
    for (let i = 0; i < maxIter; i++) {
      const res = price({ ...o, v: sigma }, kind);
      const diff = res.price - target;
      trace.push({ i, sigma, price: res.price, diff, vega: res.vega });
      if (Math.abs(diff) < tol) return { vol: sigma, iterations: trace, ok: true };
      if (diff > 0) hi = sigma; else lo = sigma;
      const step = res.vega > 1e-12 ? sigma - diff / res.vega : NaN;
      sigma = step > lo && step < hi ? step : 0.5 * (lo + hi);
    }
    return { vol: sigma, iterations: trace, ok: true };
  }

  // Cox-Ross-Rubinstein tree. american=true prices early exercise.
  function binomial(o, kind, steps = 200, american = false) {
    const { S, K, r, q, v, T } = o;
    const dt = T / steps, u = Math.exp(v * Math.sqrt(dt)), d = 1 / u;
    const p = (Math.exp((r - q) * dt) - d) / (u - d), disc = Math.exp(-r * dt);
    const call = kind === 'call';
    const pay = s => call ? Math.max(s - K, 0) : Math.max(K - s, 0);
    let vals = new Float64Array(steps + 1);
    for (let i = 0; i <= steps; i++) vals[i] = pay(S * Math.pow(u, i) * Math.pow(d, steps - i));
    for (let n = steps - 1; n >= 0; n--) {
      for (let i = 0; i <= n; i++) {
        let cont = disc * (p * vals[i + 1] + (1 - p) * vals[i]);
        if (american) cont = Math.max(cont, pay(S * Math.pow(u, i) * Math.pow(d, n - i)));
        vals[i] = cont;
      }
    }
    return vals[0];
  }

  // Deterministic PRNG so runs are reproducible.
  function rng(seed = 1) {
    let s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; };
  }
  function gaussian(rand) {
    let u = 0, w = 0; while (u === 0) u = rand(); w = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
  }

  // Monte Carlo on terminal price with antithetic variates.
  // Returns estimate, standard error, running convergence, and terminal samples.
  function monteCarlo(o, kind, paths = 20000, seed = 7) {
    const { S, K, r, q, v, T } = o, rand = rng(seed);
    const drift = (r - q - 0.5 * v * v) * T, vol = v * Math.sqrt(T), dr = Math.exp(-r * T);
    const call = kind === 'call', pay = s => call ? Math.max(s - K, 0) : Math.max(K - s, 0);
    let sum = 0, sum2 = 0; const conv = [], terminal = new Float64Array(paths);
    const half = Math.ceil(paths / 2); let n = 0;
    for (let i = 0; i < half; i++) {
      const z = gaussian(rand);
      const s1 = S * Math.exp(drift + vol * z), s2 = S * Math.exp(drift - vol * z);
      const x = 0.5 * (pay(s1) + pay(s2)) * dr;
      sum += x; sum2 += x * x; terminal[n++] = s1; if (n < paths) terminal[n++] = s2;
      const k = i + 1;
      if ((k & (k - 1)) === 0 || k === half) conv.push({ n: 2 * k, est: sum / k, se: Math.sqrt(Math.max(sum2 / k - (sum / k) ** 2, 0) / k) });
    }
    return { price: sum / half, se: conv[conv.length - 1].se, conv, terminal };
  }

  // GBM sample paths on a time grid, for drawing.
  function samplePaths(o, count = 30, steps = 100, seed = 3) {
    const rand = rng(seed), { S, r, q, v, T } = o, dt = T / steps;
    const out = [];
    for (let p = 0; p < count; p++) {
      const path = [S]; let s = S;
      for (let i = 0; i < steps; i++) { s *= Math.exp((r - q - 0.5 * v * v) * dt + v * Math.sqrt(dt) * gaussian(rand)); path.push(s); }
      out.push(path);
    }
    return { paths: out, times: Array.from({ length: steps + 1 }, (_, i) => i * dt) };
  }

  function solveTridiagonal(lower, diag, upper, rhs) {
    const n = rhs.length, c = new Float64Array(n), d = new Float64Array(n), x = new Float64Array(n);
    c[0] = upper[0] / diag[0]; d[0] = rhs[0] / diag[0];
    for (let i = 1; i < n; i++) { const m = diag[i] - lower[i] * c[i - 1]; c[i] = i < n - 1 ? upper[i] / m : 0; d[i] = (rhs[i] - lower[i] * d[i - 1]) / m; }
    x[n - 1] = d[n - 1];
    for (let i = n - 2; i >= 0; i--) x[i] = d[i] - c[i] * x[i + 1];
    return x;
  }

  // Crank-Nicolson finite differences on the BS PDE. Returns the price at S and
  // the whole final grid so it can be drawn against the closed form.
  function crankNicolson(o, kind, sSteps = 300, tSteps = 300) {
    const { S, K, r, q, v, T } = o, call = kind === 'call';
    const sMax = 4 * Math.max(S, K), ds = sMax / sSteps, dt = T / tSteps;
    const grid = Array.from({ length: sSteps + 1 }, (_, i) => i * ds);
    let vals = grid.map(s => call ? Math.max(s - K, 0) : Math.max(K - s, 0));
    const n = sSteps - 1, a = new Float64Array(n), b = new Float64Array(n), c = new Float64Array(n);
    for (let j = 1; j < sSteps; j++) {
      const sig2 = v * v * j * j, drift = (r - q) * j;
      a[j - 1] = 0.25 * dt * (sig2 - drift); b[j - 1] = -0.5 * dt * (sig2 + r); c[j - 1] = 0.25 * dt * (sig2 + drift);
    }
    const lower = a.map(x => -x), diag = b.map(x => 1 - x), upper = c.map(x => -x);
    for (let step = 1; step <= tSteps; step++) {
      const tau = step * dt;
      const lo = call ? 0 : K * Math.exp(-r * tau);
      const hi = call ? sMax * Math.exp(-q * tau) - K * Math.exp(-r * tau) : 0;
      const rhs = new Float64Array(n);
      for (let j = 1; j < sSteps; j++) rhs[j - 1] = a[j - 1] * vals[j - 1] + (1 + b[j - 1]) * vals[j] + c[j - 1] * vals[j + 1];
      rhs[0] += a[0] * lo; rhs[n - 1] += c[n - 1] * hi;
      const inner = solveTridiagonal(lower, diag, upper, rhs);
      vals = [lo, ...inner, hi];
    }
    const k = S / ds, j = Math.min(Math.floor(k), sSteps - 1), w = k - j;
    return { price: (1 - w) * vals[j] + w * vals[j + 1], grid, values: vals };
  }

  // Risk-neutral probabilities and the terminal lognormal distribution.
  function probabilities(o, kind) {
    const { S, K, r, q, v, T } = o;
    if (T <= 0 || v <= 0) return null;
    const sT = v * Math.sqrt(T), mu = Math.log(S) + (r - q - 0.5 * v * v) * T;
    const { d1, d2 } = d12(o);
    const pAbove = cdf(d2);
    const expMove = S * v * Math.sqrt(T);
    const touch = 2 * cdf(-Math.abs(Math.log(K / S)) / sT);
    const zc = invCdf(0.5 + 0.6827 / 2), z95 = invCdf(0.975);
    const range = z => [Math.exp(mu - z * sT), Math.exp(mu + z * sT)];
    const p = price(o, kind).price;
    const breakeven = kind === 'call' ? K + p : K - p;
    const be = kind === 'call' ? 1 - cdf((Math.log(breakeven / S) - (r - q - 0.5 * v * v) * T) / sT) : cdf((Math.log(breakeven / S) - (r - q - 0.5 * v * v) * T) / sT);
    return {
      pITM: kind === 'call' ? pAbove : 1 - pAbove, pAbove, pTouch: Math.min(touch, 1), expectedMove: expMove,
      range1: range(zc), range2: range(z95), median: Math.exp(mu), mean: S * Math.exp((r - q) * T),
      breakeven, pProfit: be, deltaAsProb: Math.abs(price(o, kind).delta), d1, d2,
      density: x => x <= 0 ? 0 : pdf((Math.log(x) - mu) / sT) / (x * sT),
      cdf: x => x <= 0 ? 0 : cdf((Math.log(x) - mu) / sT),
    };
  }

  // A strategy is a list of legs: { kind: 'call'|'put'|'stock', strike, qty, premium?, vol? }.
  // qty > 0 is long, < 0 is short. premium defaults to the model price at entry.
  function legValue(leg, o, T, S) {
    if (leg.kind === 'stock') return S;
    const inp = { ...o, S, K: leg.strike, T: Math.max(T, 0), v: leg.vol ?? o.v };
    return price(inp, leg.kind).price;
  }
  function strategy(legs, o) {
    const priced = legs.map(l => ({ ...l, premium: l.premium ?? (l.kind === 'stock' ? o.S : price({ ...o, K: l.strike, v: l.vol ?? o.v }, l.kind).price) }));
    const cost = priced.reduce((s, l) => s + l.qty * l.premium, 0);
    const pnlAt = (S, T) => priced.reduce((s, l) => s + l.qty * (legValue(l, o, T, S) - l.premium), 0);
    const payoff = S => priced.reduce((s, l) => s + l.qty * ((l.kind === 'stock' ? S : l.kind === 'call' ? Math.max(S - l.strike, 0) : Math.max(l.strike - S, 0)) - l.premium), 0);
    const greeks = {};
    for (const g of GREEKS) greeks[g.id] = priced.reduce((s, l) => l.kind === 'stock' ? s + (g.id === 'delta' ? l.qty : 0) : s + l.qty * price({ ...o, K: l.strike, v: l.vol ?? o.v }, l.kind)[g.id], 0);
    const strikes = priced.filter(l => l.kind !== 'stock').map(l => l.strike);
    const lo = Math.max(0.01, (strikes.length ? Math.min(...strikes) : o.S) * 0.5), hi = (strikes.length ? Math.max(...strikes) : o.S) * 1.5;
    const xs = Array.from({ length: 801 }, (_, i) => lo + (hi - lo) * i / 800);
    const ys = xs.map(payoff);
    const breakevens = [];
    for (let i = 1; i < xs.length; i++) if ((ys[i - 1] < 0) !== (ys[i] < 0)) breakevens.push(xs[i - 1] + (xs[i] - xs[i - 1]) * (0 - ys[i - 1]) / (ys[i] - ys[i - 1]));
    const hasStock = priced.some(l => l.kind === 'stock');
    const netCalls = priced.filter(l => l.kind === 'call').reduce((s, l) => s + l.qty, 0) + (hasStock ? priced.filter(l => l.kind === 'stock').reduce((s, l) => s + l.qty, 0) : 0);
    const netPuts = priced.filter(l => l.kind === 'put').reduce((s, l) => s + l.qty, 0);
    const maxProfit = netCalls > 0 ? Infinity : Math.max(...ys);
    const maxLoss = netPuts > 0 && !hasStock ? Math.min(...ys) : (netCalls < 0 ? -Infinity : Math.min(...ys));
    const prob = probabilities(o, 'call');
    let pop = NaN;
    if (prob) { let acc = 0; const n = 2000, a = o.S * 0.05, b = o.S * 4, h = (b - a) / n; for (let i = 0; i <= n; i++) { const x = a + i * h, w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2; acc += w * (payoff(x) > 0 ? prob.density(x) : 0); } pop = acc * h / 3; }
    return { legs: priced, cost, pnlAt, payoff, greeks, breakevens, maxProfit, maxLoss, pop, range: [lo, hi] };
  }

  const PRESETS = {
    'long-call':        { name: 'Long call',        legs: (S, w) => [{ kind: 'call', strike: S, qty: 1 }] },
    'long-put':         { name: 'Long put',         legs: (S, w) => [{ kind: 'put', strike: S, qty: 1 }] },
    'covered-call':     { name: 'Covered call',     legs: (S, w) => [{ kind: 'stock', qty: 1 }, { kind: 'call', strike: S * (1 + w), qty: -1 }] },
    'protective-put':   { name: 'Protective put',   legs: (S, w) => [{ kind: 'stock', qty: 1 }, { kind: 'put', strike: S * (1 - w), qty: 1 }] },
    'straddle':         { name: 'Long straddle',    legs: (S, w) => [{ kind: 'call', strike: S, qty: 1 }, { kind: 'put', strike: S, qty: 1 }] },
    'short-straddle':   { name: 'Short straddle',   legs: (S, w) => [{ kind: 'call', strike: S, qty: -1 }, { kind: 'put', strike: S, qty: -1 }] },
    'strangle':         { name: 'Long strangle',    legs: (S, w) => [{ kind: 'call', strike: S * (1 + w), qty: 1 }, { kind: 'put', strike: S * (1 - w), qty: 1 }] },
    'bull-call-spread': { name: 'Bull call spread', legs: (S, w) => [{ kind: 'call', strike: S, qty: 1 }, { kind: 'call', strike: S * (1 + w), qty: -1 }] },
    'bear-put-spread':  { name: 'Bear put spread',  legs: (S, w) => [{ kind: 'put', strike: S, qty: 1 }, { kind: 'put', strike: S * (1 - w), qty: -1 }] },
    'iron-condor':      { name: 'Iron condor',      legs: (S, w) => [{ kind: 'put', strike: S * (1 - 2 * w), qty: 1 }, { kind: 'put', strike: S * (1 - w), qty: -1 }, { kind: 'call', strike: S * (1 + w), qty: -1 }, { kind: 'call', strike: S * (1 + 2 * w), qty: 1 }] },
    'iron-butterfly':   { name: 'Iron butterfly',   legs: (S, w) => [{ kind: 'put', strike: S * (1 - w), qty: 1 }, { kind: 'put', strike: S, qty: -1 }, { kind: 'call', strike: S, qty: -1 }, { kind: 'call', strike: S * (1 + w), qty: 1 }] },
    'butterfly':        { name: 'Call butterfly',   legs: (S, w) => [{ kind: 'call', strike: S * (1 - w), qty: 1 }, { kind: 'call', strike: S, qty: -2 }, { kind: 'call', strike: S * (1 + w), qty: 1 }] },
    'collar':           { name: 'Collar',           legs: (S, w) => [{ kind: 'stock', qty: 1 }, { kind: 'put', strike: S * (1 - w), qty: 1 }, { kind: 'call', strike: S * (1 + w), qty: -1 }] },
    'risk-reversal':    { name: 'Risk reversal',    legs: (S, w) => [{ kind: 'call', strike: S * (1 + w), qty: 1 }, { kind: 'put', strike: S * (1 - w), qty: -1 }] },
  };

  global.BS = { erf, pdf, cdf, invCdf, d12, price, metric, metricById, GREEKS, METRICS, impliedVol, binomial, monteCarlo, samplePaths, crankNicolson, probabilities, strategy, PRESETS };
})(typeof window !== 'undefined' ? window : globalThis);
