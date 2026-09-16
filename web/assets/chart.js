// Small SVG chart kit. Every function takes a container element and a spec and
// draws into it; call again with a new spec to redraw.
(function (global) {
  const PALETTE = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7', '--s8'];
  const color = i => `var(${PALETTE[i % PALETTE.length]})`;
  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function ticks(a, b, n) {
    if (!(b > a)) return [a];
    const span = b - a, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => span / s <= n) || mag;
    const out = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function short(v) {
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (a >= 1e4) return (v / 1e3).toFixed(0) + 'k';
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    return v.toPrecision(2);
  }
  const fmtNum = (x, d = 4) => Number.isFinite(x) ? x.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : (x === Infinity ? '∞' : x === -Infinity ? '−∞' : '—');

  function shell(el, height) {
    el.classList.add('chart');
    let svg = el.querySelector('svg'), tip = el.querySelector('.tip');
    if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); el.appendChild(svg); }
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; el.appendChild(tip); }
    svg.style.height = height + 'px';
    return { svg, tip };
  }

  function interp(points, x) {
    if (!points.length) return NaN;
    if (x <= points[0][0]) return points[0][1];
    if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
    let lo = 0, hi = points.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (points[m][0] <= x) lo = m; else hi = m; }
    const [x0, y0] = points[lo], [x1, y1] = points[hi];
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }

  // spec: {
  //   series: [{ name, points: [[x,y],...], color?, dash?, width?, area?: 'zero'|'pnl', step?: true }],
  //   x: { label?, fmt?, domain? }, y: { label?, fmt?, domain?, includeZero? },
  //   zeroLine?: true, vlines?: [{x, label?, color?}], hlines?: [{y, label?}],
  //   markers?: [{x, y, label?, color?}], bands?: [{x0, x1, color?, label?}],
  //   legend?: true, height?: 300, tooltip?: (x, rows) => html
  // }
  function line(el, spec) {
    const H = spec.height || 300, m = { t: 16, r: 16, b: spec.x?.label ? 40 : 28, l: spec.y?.label ? 62 : 52 };
    const { svg, tip } = shell(el, H);
    const W = el.clientWidth || 700, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const series = (spec.series || []).map((s, i) => ({ ...s, color: s.color || color(i), points: s.points.filter(p => Number.isFinite(p[1])) }));
    const allPts = series.flatMap(s => s.points);
    if (!allPts.length) { svg.innerHTML = ''; return; }
    let [x0, x1] = spec.x?.domain || [Math.min(...allPts.map(p => p[0])), Math.max(...allPts.map(p => p[0]))];
    let ys = allPts.map(p => p[1]);
    if (spec.hlines) ys = ys.concat(spec.hlines.map(h => h.y));
    if (spec.markers) ys = ys.concat(spec.markers.map(k => k.y).filter(Number.isFinite));
    let [y0, y1] = spec.y?.domain || [Math.min(...ys), Math.max(...ys)];
    if (spec.y?.includeZero !== false && !spec.y?.domain) { y0 = Math.min(0, y0); y1 = Math.max(0, y1); }
    if (y1 - y0 < 1e-12) { y0 -= 1; y1 += 1; }
    if (!spec.y?.domain) { const pad = (y1 - y0) * 0.08; y0 -= pad; y1 += pad; }
    const sx = x => m.l + (x - x0) / (x1 - x0) * iw, sy = y => m.t + (y1 - y) / (y1 - y0) * ih;
    const clampY = y => Math.max(m.t, Math.min(m.t + ih, sy(y)));
    const xf = spec.x?.fmt || short, yf = spec.y?.fmt || short;
    const yt = ticks(y0, y1, 5), xt = ticks(x0, x1, Math.max(3, Math.floor(iw / 90)));
    const zeroY = sy(Math.max(y0, Math.min(y1, 0)));

    const path = pts => pts.map((p, i) => (i ? (spec.step || false ? `H${sx(p[0]).toFixed(1)}V${sy(p[1]).toFixed(1)}` : `L${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`) : `M${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`)).join('');

    let defs = '', body = '';
    series.forEach((s, i) => {
      if (!s.points.length) return;
      const d = path(s.points);
      if (s.area === 'zero') body += `<path d="${d}L${sx(s.points[s.points.length - 1][0]).toFixed(1)} ${zeroY}L${sx(s.points[0][0]).toFixed(1)} ${zeroY}Z" fill="${s.color}" opacity=".10"/>`;
      if (s.area === 'pnl') {
        const id = 'clip' + i + Math.random().toString(36).slice(2, 7);
        defs += `<clipPath id="${id}a"><rect x="${m.l}" y="${m.t}" width="${iw}" height="${Math.max(0, zeroY - m.t)}"/></clipPath><clipPath id="${id}b"><rect x="${m.l}" y="${zeroY}" width="${iw}" height="${Math.max(0, m.t + ih - zeroY)}"/></clipPath>`;
        const closed = `${d}L${sx(s.points[s.points.length - 1][0]).toFixed(1)} ${zeroY}L${sx(s.points[0][0]).toFixed(1)} ${zeroY}Z`;
        body += `<path d="${closed}" fill="var(--pos)" opacity=".14" clip-path="url(#${id}a)"/><path d="${closed}" fill="var(--neg)" opacity=".14" clip-path="url(#${id}b)"/>`;
      }
      body += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    });

    const bands = (spec.bands || []).map(b => `<rect x="${sx(Math.max(b.x0, x0))}" y="${m.t}" width="${Math.max(0, sx(Math.min(b.x1, x1)) - sx(Math.max(b.x0, x0)))}" height="${ih}" fill="${b.color || 'var(--text)'}" opacity=".05"/>${b.label ? `<text class="lbl" x="${sx(Math.max(b.x0, x0)) + 4}" y="${m.t + 12}" fill="var(--text-3)" font-size="11">${b.label}</text>` : ''}`).join('');
    const vlines = (spec.vlines || []).filter(v => v.x >= x0 && v.x <= x1).map(v => `<line x1="${sx(v.x)}" x2="${sx(v.x)}" y1="${m.t}" y2="${m.t + ih}" stroke="${v.color || 'var(--line-strong)'}" stroke-dasharray="3 3"/>${v.label ? `<text x="${sx(v.x) + 4}" y="${m.t + 11}" fill="var(--text-3)" font-size="11" font-family="var(--mono)">${v.label}</text>` : ''}`).join('');
    const hlines = (spec.hlines || []).map(h => `<line x1="${m.l}" x2="${m.l + iw}" y1="${sy(h.y)}" y2="${sy(h.y)}" stroke="${h.color || 'var(--line-strong)'}" stroke-dasharray="3 3"/>${h.label ? `<text x="${m.l + iw - 4}" y="${sy(h.y) - 4}" text-anchor="end" fill="var(--text-3)" font-size="11" font-family="var(--mono)">${h.label}</text>` : ''}`).join('');
    const markers = (spec.markers || []).filter(k => Number.isFinite(k.y)).map(k => `<circle cx="${sx(k.x)}" cy="${sy(k.y)}" r="5" fill="${k.color || 'var(--s1)'}" stroke="var(--surface)" stroke-width="2"/>${k.label ? `<text x="${sx(k.x) + 9}" y="${sy(k.y) - 8}" fill="var(--text-2)" font-size="11" font-family="var(--mono)">${k.label}</text>` : ''}`).join('');

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `<defs>${defs}</defs>
      <g class="axis">
        ${yt.map(t => `<line x1="${m.l}" x2="${W - m.r}" y1="${sy(t)}" y2="${sy(t)}"/><text x="${m.l - 8}" y="${sy(t)}" dy="4" text-anchor="end">${yf(t)}</text>`).join('')}
        ${y0 <= 0 && y1 >= 0 && spec.zeroLine !== false ? `<line class="base" x1="${m.l}" x2="${W - m.r}" y1="${sy(0)}" y2="${sy(0)}"/>` : ''}
        ${xt.map(t => `<text x="${sx(t)}" y="${m.t + ih + 18}" text-anchor="middle">${xf(t)}</text>`).join('')}
        ${spec.x?.label ? `<text class="lbl" x="${m.l + iw / 2}" y="${H - 4}" text-anchor="middle">${spec.x.label}</text>` : ''}
        ${spec.y?.label ? `<text class="lbl" transform="translate(12 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle">${spec.y.label}</text>` : ''}
      </g>
      ${bands}${body}${vlines}${hlines}${markers}
      <g class="hover" style="display:none"><line y1="${m.t}" y2="${m.t + ih}" stroke="var(--text-3)"/>${series.map(s => `<circle r="4" fill="var(--surface)" stroke="${s.color}" stroke-width="2"/>`).join('')}</g>
      <rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/>`;

    if (spec.legend && series.length > 1) {
      let lg = el.querySelector('.legend'); if (!lg) { lg = document.createElement('div'); lg.className = 'legend'; el.insertBefore(lg, svg); }
      lg.innerHTML = series.map(s => `<span><i class="${s.dash ? 'dash' : ''}" style="background:${s.dash ? '' : s.color};color:${s.color}"></i>${s.name}</span>`).join('');
    } else { const lg = el.querySelector('.legend'); if (lg) lg.remove(); }

    const hover = svg.querySelector('.hover'), hit = svg.querySelector('.hit'), circles = hover.querySelectorAll('circle');
    const onMove = e => {
      const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width;
      const x = Math.max(x0, Math.min(x1, x0 + (px - m.l) / iw * (x1 - x0)));
      hover.style.display = ''; const l = hover.querySelector('line'); l.setAttribute('x1', sx(x)); l.setAttribute('x2', sx(x));
      const rows = series.map((s, i) => { const y = interp(s.points, x); circles[i].setAttribute('cx', sx(x)); circles[i].setAttribute('cy', Number.isFinite(y) ? clampY(y) : -100); return { name: s.name, y, color: s.color }; });
      tip.style.opacity = 1;
      const left = sx(x) * r.width / W, flip = left > r.width * 0.6;
      tip.style.left = left + 'px'; tip.style.top = '8px'; tip.style.transform = flip ? 'translate(calc(-100% - 12px),0)' : 'translate(12px,0)';
      tip.innerHTML = spec.tooltip ? spec.tooltip(x, rows) : `<div class="t">${spec.x?.label ? spec.x.label + ' ' : ''}${xf(x)}</div>` + rows.map(rw => `<div class="r"><span><i style="background:${rw.color}"></i>${rw.name}</span><b>${(spec.y?.tipFmt || (v => fmtNum(v, 4)))(rw.y)}</b></div>`).join('');
    };
    hit.onmousemove = onMove; hit.ontouchmove = e => { onMove(e.touches[0]); e.preventDefault(); };
    hit.onmouseleave = () => { hover.style.display = 'none'; tip.style.opacity = 0; };
  }

  // spec: { xs: [], ys: [], z: rows[y][x], xFmt, yFmt, zFmt, xLabel, yLabel, diverging?: bool, mark?: {x, y}, showValues?: true }
  function heatmap(el, spec) {
    el.classList.add('chart');
    const { xs, ys, z } = spec, xf = spec.xFmt || short, yf = spec.yFmt || short, zf = spec.zFmt || (v => fmtNum(v, 2));
    const flat = z.flat().filter(Number.isFinite);
    let lo = Math.min(...flat), hi = Math.max(...flat);
    if (spec.diverging) { const a = Math.max(Math.abs(lo), Math.abs(hi)); lo = -a; hi = a; }
    const dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' || document.documentElement.dataset.theme === 'dark';
    const colorOf = v => {
      if (!Number.isFinite(v)) return 'transparent';
      const t = hi > lo ? (v - lo) / (hi - lo) : 0.5;
      if (spec.diverging) {
        const s = Math.abs(t - 0.5) * 2, pos = t >= 0.5;
        const [r, g, b] = pos ? (dark ? [61, 220, 132] : [0, 131, 0]) : (dark ? [230, 103, 103] : [227, 73, 72]);
        return `rgba(${r},${g},${b},${(0.08 + 0.72 * s).toFixed(3)})`;
      }
      const [r, g, b] = dark ? [57, 135, 229] : [42, 120, 214];
      return `rgba(${r},${g},${b},${(0.06 + 0.84 * t).toFixed(3)})`;
    };
    const grid = document.createElement('div'); grid.className = 'heat';
    grid.style.gridTemplateColumns = `auto repeat(${xs.length}, minmax(0,1fr))`;
    let html = '';
    for (let j = ys.length - 1; j >= 0; j--) {
      html += `<div class="l">${yf(ys[j])}</div>`;
      for (let i = 0; i < xs.length; i++) {
        const v = z[j][i];
        const mark = spec.mark && Math.abs(spec.mark.x - xs[i]) < 1e-9 && Math.abs(spec.mark.y - ys[j]) < 1e-9;
        html += `<div class="c${mark ? ' h' : ''}" style="background:${colorOf(v)}" data-x="${i}" data-y="${j}" title="${spec.xLabel || 'x'} ${xf(xs[i])}, ${spec.yLabel || 'y'} ${yf(ys[j])}: ${zf(v)}">${spec.showValues === false ? '' : zf(v)}</div>`;
      }
    }
    html += `<div class="l"></div>` + xs.map(x => `<div class="l">${xf(x)}</div>`).join('');
    grid.innerHTML = html;
    el.innerHTML = ''; el.appendChild(grid);
    const axes = document.createElement('div'); axes.className = 'note'; axes.style.marginTop = '8px';
    axes.textContent = `${spec.yLabel || 'rows'} down, ${spec.xLabel || 'columns'} across.` + (spec.diverging ? ' Green is positive, red is negative.' : ' Darker is larger.');
    el.appendChild(axes);
  }

  // spec: { values: Float64Array|number[], bins?, xFmt, overlay?: x => density, vlines?, height?, xLabel }
  function histogram(el, spec) {
    const v = Array.from(spec.values).filter(Number.isFinite).sort((a, b) => a - b);
    if (!v.length) return;
    const lo = v[Math.floor(v.length * 0.002)], hi = v[Math.floor(v.length * 0.998)];
    const bins = spec.bins || 60, w = (hi - lo) / bins, counts = new Array(bins).fill(0);
    for (const x of v) { const i = Math.floor((x - lo) / w); if (i >= 0 && i < bins) counts[i]++; }
    const density = counts.map((c, i) => [lo + (i + 0.5) * w, c / (v.length * w)]);
    const series = [{ name: 'Simulated', points: density, step: false, area: 'zero', color: 'var(--s1)' }];
    if (spec.overlay) series.push({ name: 'Lognormal', points: density.map(p => [p[0], spec.overlay(p[0])]), color: 'var(--s2)', dash: '4 3' });
    line(el, { series, x: { label: spec.xLabel, fmt: spec.xFmt }, y: { fmt: v => v.toPrecision(2), tipFmt: v => v.toExponential(3) }, vlines: spec.vlines, legend: true, height: spec.height || 240 });
  }

  // columns: [{ key, label, fmt?, cls?: row => string }], rows: object[], highlight?: row => bool, sortable?: true
  function table(el, spec) {
    let sortKey = el.dataset.sortKey || null, dir = el.dataset.sortDir === 'desc' ? -1 : 1;
    const rows = spec.rows.slice();
    if (sortKey) rows.sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * dir);
    el.innerHTML = `<table class="data"><thead><tr>${spec.columns.map(c => `<th class="${spec.sortable ? 'sortable' : ''}" data-key="${c.key}">${c.label}${sortKey === c.key ? (dir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr class="${spec.highlight && spec.highlight(r) ? 'hl' : ''}">${spec.columns.map(c => { const v = r[c.key]; const cls = c.cls ? c.cls(v, r) : ''; return `<td class="mono ${cls}">${c.fmt ? c.fmt(v, r) : v}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
    if (spec.sortable) el.querySelectorAll('th').forEach(th => th.onclick = () => { const k = th.dataset.key; if (el.dataset.sortKey === k) el.dataset.sortDir = el.dataset.sortDir === 'desc' ? 'asc' : 'desc'; else { el.dataset.sortKey = k; el.dataset.sortDir = 'asc'; } table(el, spec); });
  }

  global.Chart = { line, heatmap, histogram, table, color, ticks, short, fmtNum, interp };
})(window);
