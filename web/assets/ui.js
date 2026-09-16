// Shared page chrome and state. Inputs live in the URL (so links share state)
// and in localStorage (so they follow you between pages).
(function (global) {
  const FIELDS = [
    { id: 'S', label: 'Spot', min: 1, max: 500, step: 0.5, value: 100, digits: 2 },
    { id: 'K', label: 'Strike', min: 1, max: 500, step: 0.5, value: 100, digits: 2 },
    { id: 'T', label: 'Time to expiry', unit: 'yr', min: 0, max: 5, step: 0.01, value: 1, digits: 2 },
    { id: 'v', label: 'Volatility', unit: '%', min: 0, max: 2, step: 0.005, value: 0.2, pct: true, digits: 1 },
    { id: 'r', label: 'Risk-free rate', unit: '%', min: -0.05, max: 0.25, step: 0.0025, value: 0.05, pct: true, digits: 2 },
    { id: 'q', label: 'Dividend yield', unit: '%', min: 0, max: 0.2, step: 0.0025, value: 0, pct: true, digits: 2 },
  ];
  const DEFAULTS = Object.fromEntries(FIELDS.map(f => [f.id, f.value]));

  function loadState() {
    let st = { ...DEFAULTS, kind: 'call' };
    try { const s = JSON.parse(localStorage.getItem('bs-state') || '{}'); Object.assign(st, s); } catch {}
    const u = new URLSearchParams(location.search);
    for (const k of [...Object.keys(DEFAULTS), 'kind']) if (u.has(k)) st[k] = k === 'kind' ? u.get(k) : parseFloat(u.get(k));
    for (const f of FIELDS) if (!Number.isFinite(st[f.id])) st[f.id] = f.value;
    if (st.kind !== 'put') st.kind = 'call';
    return st;
  }
  function saveState(st) {
    try { localStorage.setItem('bs-state', JSON.stringify({ ...Object.fromEntries(FIELDS.map(f => [f.id, st[f.id]])), kind: st.kind })); } catch {}
    const u = new URLSearchParams();
    for (const f of FIELDS) u.set(f.id, +st[f.id].toFixed(6));
    u.set('kind', st.kind);
    history.replaceState(null, '', '?' + u.toString());
  }
  function shareLink() {
    navigator.clipboard?.writeText(location.href).then(() => toast('Link copied'));
  }
  function toast(msg) {
    let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1400);
  }

  const PAGES = [['index', 'Pricer', '/'], ['analytics', 'Analytics', '/analytics'], ['strategies', 'Strategies', '/strategies'], ['math', 'Math', '/math']];
  function nav(active, extra = '') {
    const isFile = location.protocol === 'file:' || /\.html$/.test(location.pathname) || location.port === '8000' || location.hostname === 'localhost';
    const href = p => isFile ? (p[0] === 'index' ? 'index.html' : p[0] + '.html') : p[2];
    const el = document.createElement('header'); el.className = 'top';
    el.innerHTML = `<a class="brand" href="${href(PAGES[0])}"><span class="dot"></span><span class="t">Black-Scholes</span></a>
      <nav class="links">${PAGES.map(p => `<a href="${href(p)}" ${p[0] === active ? 'aria-current="page"' : ''}>${p[1]}</a>`).join('')}</nav>
      <div class="top-actions">${extra}<button class="icon-btn" id="theme-toggle" aria-label="Toggle theme" title="Toggle theme">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button></div>`;
    document.querySelector('.wrap').prepend(el);
    el.querySelector('#theme-toggle').onclick = () => {
      const root = document.documentElement;
      const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('theme', root.dataset.theme); } catch {}
      dispatchEvent(new Event('themechange'));
    };
    const f = document.createElement('footer'); f.className = 'bottom';
    f.innerHTML = `<span>European options under Black-Scholes-Merton. Theta, charm, color and veta are per calendar day. Vega, rho, vanna and zomma are per 1%.</span><a href="https://github.com/michae6345-crypto/black-scholes-calculator">Source</a>`;
    document.querySelector('.wrap').append(f);
    lowercase();
    reveal();
  }

  // Lowercases ASCII letters in visible text and keeps Greek, math and code as written.
  const SKIP = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA']);
  const MATH = /(\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/;
  function lowerNode(node) {
    if (node.nodeType === 3) {
      const p = node.parentElement; if (!p || SKIP.has(p.tagName) || p.closest('.katex, .keep')) return;
      const t = node.nodeValue; if (!/[A-Z]/.test(t)) return;
      const out = t.split(MATH).map((part, i) => i % 2 ? part : part.replace(/[A-Z]+/g, m => m.toLowerCase())).join('');
      if (out !== t) node.nodeValue = out;
      return;
    }
    if (node.nodeType !== 1 || SKIP.has(node.tagName) || node.classList?.contains('katex') || node.classList?.contains('keep')) return;
    if (node.tagName === 'INPUT' && node.placeholder) node.placeholder = node.placeholder.toLowerCase();
    for (const c of node.childNodes) lowerNode(c);
  }
  function lowercase() {
    lowerNode(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') lowerNode(m.target); else m.addedNodes.forEach(lowerNode); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // Cards fade up as they enter the viewport, staggered by order on screen.
  function reveal() {
    const items = [...document.querySelectorAll('.card, .tiles, .page-head + * > *:not(.card):not(.tiles)')].filter(el => !el.closest('.card') || el.classList.contains('card'));
    const targets = [...document.querySelectorAll('main > *, main .stack > *, main .cols > *, article > *, .card.pad.sticky')].filter((el, i, a) => a.indexOf(el) === i && !el.closest('.stack .stack'));
    targets.forEach(el => el.classList.add('reveal'));
    if (!('IntersectionObserver' in window)) { targets.forEach(el => el.classList.add('in')); return; }
    let n = 0;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (!e.isIntersecting) return; const el = e.target; el.style.transitionDelay = Math.min(n++ * 60, 360) + 'ms'; el.classList.add('in'); io.unobserve(el); setTimeout(() => { n = Math.max(0, n - 1); }, 400); });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach(el => io.observe(el));
  }

  // Tweens a displayed number from its previous value to the new one.
  function animateNumber(el, value, fmtFn, ms = 380) {
    if (!Number.isFinite(value)) { el.textContent = fmtFn(value); el._val = value; return; }
    const from = Number.isFinite(el._val) ? el._val : value; el._val = value;
    if (from === value || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmtFn(value); return; }
    const t0 = performance.now(); cancelAnimationFrame(el._raf);
    const step = now => { const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3); el.textContent = fmtFn(from + (value - from) * e); if (t < 1) el._raf = requestAnimationFrame(step); };
    el._raf = requestAnimationFrame(step);
  }
  try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch {}

  // Builds the slider+number panel for the standard fields (or a subset).
  // onChange(id, value) fires on every edit. Returns { set(id, value) }.
  function inputs(container, state, onChange, ids) {
    const fields = ids ? FIELDS.filter(f => ids.includes(f.id)) : FIELDS;
    const handles = {};
    fields.forEach(f => {
      const el = document.createElement('div'); el.className = 'field';
      const shown = f.pct ? +(state[f.id] * 100).toFixed(4) : state[f.id];
      el.innerHTML = `<div class="row"><label for="n-${f.id}">${f.label}</label>
        <span class="num"><input id="n-${f.id}" type="number" step="${f.pct ? f.step * 100 : f.step}" value="${shown}">${f.unit ? `<em>${f.unit}</em>` : ''}</span></div>
        <input id="s-${f.id}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${state[f.id]}" aria-label="${f.label}">`;
      container.appendChild(el);
      const num = el.querySelector('input[type=number]'), rng = el.querySelector('input[type=range]');
      rng.addEventListener('input', () => { const v = +rng.value; state[f.id] = v; num.value = f.pct ? +(v * 100).toFixed(4) : v; onChange(f.id, v); });
      num.addEventListener('input', () => { const raw = parseFloat(num.value); if (!Number.isFinite(raw)) return; const v = f.pct ? raw / 100 : raw; state[f.id] = v; rng.value = v; onChange(f.id, v); });
      handles[f.id] = v => { state[f.id] = v; rng.value = v; num.value = f.pct ? +(v * 100).toFixed(4) : v; };
    });
    return { set: (id, v) => handles[id] && handles[id](v) };
  }

  function kindToggle(container, state, onChange) {
    const el = document.createElement('div'); el.className = 'seg'; el.setAttribute('role', 'group');
    el.innerHTML = `<button data-k="call">Call</button><button data-k="put">Put</button>`;
    const sync = () => el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === state.kind));
    el.querySelectorAll('button').forEach(b => b.onclick = () => { state.kind = b.dataset.k; sync(); onChange(); });
    sync(); container.appendChild(el);
    return { sync };
  }

  const fmt = (x, d = 4) => Number.isFinite(x) ? x.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : (x === Infinity ? 'Unlimited' : x === -Infinity ? 'Unlimited' : '—');
  const pct = (x, d = 1) => Number.isFinite(x) ? (x * 100).toFixed(d) + '%' : '—';
  const money = (x, d = 2) => Number.isFinite(x) ? (x < 0 && Math.round(Math.abs(x) * 10 ** d) > 0 ? '−' : '') + Math.abs(x).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : (x === Infinity ? 'Unlimited' : x === -Infinity ? 'Unlimited' : '—');
  const inputsOf = st => ({ S: st.S, K: st.K, r: st.r, q: st.q, v: st.v, T: st.T });
  const debounce = (fn, ms = 120) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };

  global.UI = { FIELDS, DEFAULTS, loadState, saveState, shareLink, toast, nav, inputs, kindToggle, fmt, pct, money, inputsOf, debounce, animateNumber, reveal };
})(window);
