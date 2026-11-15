/* Virtual Lab Marketing — inti: helper UI, penyimpanan, jurnal, statistik, worksheet */
(function () {
  'use strict';
  const VL = window.VL = { modules: [], cfg: window.VL_CONFIG || {} };
  VL.register = m => { VL.modules.push(m); };

  /* ---------- DOM helper ---------- */
  const h = VL.h = function (tag, attrs, ...kids) {
    const e = document.createElement(tag);
    let val;
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'value') val = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach(c => {
      if (c == null || c === false) return;
      e.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    if (val !== undefined) e.value = val;
    return e;
  };

  /* ---------- Format ---------- */
  const okNum = x => x != null && x !== '' && !isNaN(x) && isFinite(x);
  VL.fmt = {
    n: (x, d = 0) => okNum(x) ? Number(x).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–',
    rp: x => okNum(x) ? (x < 0 ? '-Rp ' : 'Rp ') + Math.abs(Math.round(x)).toLocaleString('id-ID') : '–',
    pct: (x, d = 1) => okNum(x) ? (x * 100).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%' : '–',
    p: x => !okNum(x) ? '–' : (x < 0.001 ? '< 0,001' : x.toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 }))
  };
  VL.val = inp => { const v = parseFloat(String(inp.value).replace(',', '.')); return isNaN(v) ? 0 : v; };

  /* ---------- Penyimpanan lokal ---------- */
  // Data dipisah per akun (scope = NIM) agar perangkat bersama tidak mencampur jurnal antar mahasiswa.
  let SCOPE = '';
  VL.store = {
    scope(s) { SCOPE = s ? String(s) : ''; },
    key(k) { return 'vlmkt:' + (SCOPE ? SCOPE + ':' : '') + k; },
    get(k, d) { try { const v = localStorage.getItem(VL.store.key(k)); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(VL.store.key(k), JSON.stringify(v)); return true; } catch (e) { return false; } },
    getG(k, d) { try { const v = localStorage.getItem('vlmkt:_g:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    setG(k, v) { try { if (v == null) localStorage.removeItem('vlmkt:_g:' + k); else localStorage.setItem('vlmkt:_g:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  VL.profile = () => VL.store.get('profile', { nama: '', nim: '', kelas: '', mk: '' });
  VL.runs = () => VL.store.get('runs', []);
  VL.saveRun = function (run) {
    const runs = VL.runs();
    run.id = run.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    run.ts = run.ts || new Date().toISOString();
    run.rev = 1; run.synced = false;
    runs.unshift(run);
    const ok = VL.store.set('runs', runs);
    if (!ok) VL.toast('Penyimpanan penuh — ekspor jurnal lalu hapus entri lama');
    document.dispatchEvent(new Event('vl-runs'));
    return run;
  };

  /* ---------- Acak ber-seed ---------- */
  VL.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  VL.hashSeed = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  VL.gauss = rnd => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  /* ---------- Toast, modal, unduh ---------- */
  VL.toast = msg => {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(VL._tt); VL._tt = setTimeout(() => t.classList.remove('show'), 2800);
  };
  VL.modal = function (title, body, actions) {
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
      h('h3', null, title), body,
      h('div', { class: 'row end' }, (actions || []).map(a => h('button', {
        class: 'btn ' + (a.kind || ''),
        onclick: () => { const r = a.fn ? a.fn() : undefined; if (r !== false) back.remove(); }
      }, a.label))));
    back.append(box);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    document.body.append(back);
    return back;
  };
  VL.download = (name, text, mime) => {
    const b = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(b), download: name });
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  VL.csv = rows => rows.map(r => r.map(c => {
    c = c == null ? '' : String(c);
    return /[",\n;]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
  }).join(',')).join('\n');
  VL.parseCSV = function (text) {
    text = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
    if (!text) return [];
    const first = text.split('\n')[0];
    const delim = [',', ';', '\t'].map(d => [d, first.split(d).length - 1]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    row.push(cur); rows.push(row);
    return rows.filter(r => r.some(x => x.trim() !== ''));
  };

  /* ---------- Komponen UI ---------- */
  VL.field = (label, input, hint) => h('label', { class: 'fld' }, h('span', { class: 'lbl' }, label), input, hint ? h('small', { class: 'hint' }, hint) : null);
  VL.numIn = (value, o) => h('input', Object.assign({ type: 'number', inputmode: 'decimal', value: value }, o || {}));
  VL.select = (opts, value) => h('select', { value }, opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v }, l); }));
  VL.kpi = (label, value, kind) => h('div', { class: 'kpi ' + (kind || '') }, h('span', { class: 'v' }, value), h('span', { class: 'l' }, label));
  VL.table = function (headers, rows, o) {
    o = o || {};
    const num = o.num || [];
    return h('div', { class: 'tbl-wrap' }, h('table', { class: o.cls || '' },
      h('thead', null, h('tr', null, headers.map((x, i) => h('th', { class: num.includes(i) ? 'num' : '' }, x)))),
      h('tbody', null, rows.map(r => h('tr', { class: r.total ? 'total' : '' }, (r.cells || r).map((c, i) => h('td', { class: num.includes(i) ? 'num' : '' }, c)))))));
  };
  VL.bars = function (items, o) {
    o = o || {};
    const f = o.fmt || (v => VL.fmt.n(v));
    const max = Math.max(1e-9, ...items.map(i => Math.abs(i.value)));
    return h('div', { class: 'bars' }, items.map(i => h('div', { class: 'bar' },
      h('span', null, i.label),
      h('div', { class: 'track' }, h('div', { class: 'fill' + (i.value < 0 ? ' neg' : ''), style: 'width:' + (Math.abs(i.value) / max * 100).toFixed(1) + '%' })),
      h('span', null, f(i.value)))));
  };
  VL.tabs = function (el, tabs) {
    const bar = h('div', { class: 'tabs', role: 'tablist' });
    const panel = h('div', { class: 'panel' });
    const btns = [];
    function show(i) {
      btns.forEach((b, j) => { b.classList.toggle('on', i === j); b.setAttribute('aria-selected', i === j); });
      panel.innerHTML = '';
      try { tabs[i].render(panel); } catch (e) { panel.append(h('div', { class: 'card err' }, 'Kesalahan: ' + e.message)); console.error(e); }
    }
    tabs.forEach((t, i) => { const b = h('button', { class: 'tab', role: 'tab', onclick: () => show(i) }, t.label); btns.push(b); bar.append(b); });
    el.append(bar, panel); show(0);
  };

  /* ---------- Jurnal Lab ---------- */
  VL.saveToJournal = function (info) {
    const hy = h('textarea', { rows: 3, placeholder: 'Dugaan/hipotesis Anda SEBELUM menjalankan (opsional tetapi dianjurkan)' });
    const rf = h('textarea', { rows: 4, placeholder: 'Refleksi: apa yang Anda pelajari? Mengapa hasilnya begitu? Apa yang akan Anda ubah?' });
    const body = h('div', null, h('p', { class: 'muted' }, info.title), VL.field('Hipotesis', hy), VL.field('Refleksi', rf));
    VL.modal('Simpan ke Jurnal Lab', body, [
      { label: 'Batal' },
      { label: 'Simpan', kind: 'primary', fn: () => {
        VL.saveRun({ module: info.module, title: info.title, params: info.params || {}, result: info.result || {}, summary: info.summary || '', hypothesis: hy.value.trim(), reflection: rf.value.trim() });
        VL.toast('Tersimpan di Jurnal Lab');
      } }]);
  };
  /* ---------- Worksheet (formulir isian yang tersimpan otomatis) ---------- */
  VL.worksheet = function (el, ws) {
    const key = 'ws:' + ws.id;
    const saved = VL.store.get(key, {});
    const inputs = {};
    const form = h('div', { class: 'ws' });
    ws.fields.forEach(f => {
      const inp = f.type === 'text' ? h('input', { type: 'text', placeholder: f.ph || '' }) : h('textarea', { rows: f.rows || 3, placeholder: f.ph || '' });
      inp.value = saved[f.k] || '';
      inp.addEventListener('input', () => { const cur = VL.store.get(key, {}); cur[f.k] = inp.value; VL.store.set(key, cur); });
      inputs[f.k] = inp;
      form.append(VL.field(f.label, inp, f.hint));
    });
    const collect = () => Object.fromEntries(ws.fields.map(f => [f.k, inputs[f.k].value.trim()]));
    const toText = () => ws.title + '\n' + '='.repeat(ws.title.length) + '\n\n' +
      ws.fields.map(f => f.label.toUpperCase() + '\n' + (inputs[f.k].value.trim() || '-')).join('\n\n');
    const status = h('p', { class: 'muted small' });
    const upd = () => { const n = Object.values(collect()).filter(Boolean).length; status.textContent = 'Terisi ' + n + ' dari ' + ws.fields.length + ' bagian.'; };
    form.addEventListener('input', upd); upd();
    const aiOut = h('div');
    el.append(
      ws.intro ? h('div', { class: 'card note' }, ws.intro) : null,
      form, status,
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => { if (VL.aiCritique) VL.aiCritique(ws.title, toText(), aiOut); else VL.toast('Fitur AI tidak tersedia'); } }, '🤖 Kritik AI'),
        h('button', { class: 'btn primary', onclick: () => {
          const vals = collect(); const filled = Object.values(vals).filter(Boolean).length;
          if (filled === 0) { VL.toast('Isi minimal satu bagian dulu'); return; }
          VL.saveToJournal({ module: ws.module, title: ws.title, params: vals, result: { filled, total: ws.fields.length }, summary: 'Lembar kerja terisi ' + filled + '/' + ws.fields.length + ' bagian.' });
        } }, 'Simpan ke Jurnal'),
        h('button', { class: 'btn', onclick: () => VL.download(ws.id + '.txt', toText()) }, 'Unduh .txt'),
        h('button', { class: 'btn', onclick: () => { if (navigator.clipboard) navigator.clipboard.writeText(toText()).then(() => VL.toast('Disalin')); } }, 'Salin'),
        h('button', { class: 'btn ghost', onclick: () => { if (confirm('Kosongkan semua isian lembar ini?')) { VL.store.set(key, {}); Object.values(inputs).forEach(i => { i.value = ''; }); upd(); } } }, 'Kosongkan')),
      aiOut);
  };

  /* ---------- Statistik ---------- */
  const S = VL.stat = {};
  S.mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  S.variance = a => { const m = S.mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); };
  S.sd = a => Math.sqrt(S.variance(a));
  function lgamma(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015; for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function betacf(a, b, x) {
    const FP = 1e-30; const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FP) d = FP; d = 1 / d; let hh = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; hh *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d;
      const del = d * c; hh *= del; if (Math.abs(del - 1) < 3e-12) break;
    }
    return hh;
  }
  S.ibeta = (x, a, b) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  };
  S.pT = (t, df) => !isFinite(t) ? 0 : S.ibeta(df / (df + t * t), df / 2, 0.5);   // dua arah
  function erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
  S.cdfN = z => 0.5 * (1 + erf(z / Math.SQRT2));
  S.pZ = z => 2 * (1 - S.cdfN(Math.abs(z)));
  S.corr = (x, y) => {
    const n = x.length, mx = S.mean(x), my = S.mean(y); let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    const r = sxy / Math.sqrt(sxx * syy); const df = n - 2;
    const t = r * Math.sqrt(df / Math.max(1e-12, 1 - r * r));
    return { r, n, p: Math.abs(r) >= 1 ? 0 : S.pT(t, df) };
  };
  S.welch = (a, b) => {
    const n1 = a.length, n2 = b.length, m1 = S.mean(a), m2 = S.mean(b), v1 = S.variance(a), v2 = S.variance(b);
    const se = Math.sqrt(v1 / n1 + v2 / n2); const t = (m1 - m2) / se;
    const df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
    const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
    return { n1, n2, m1, m2, sd1: Math.sqrt(v1), sd2: Math.sqrt(v2), t, df, p: S.pT(t, df), d: (m1 - m2) / sp };
  };
  S.twoProp = (n1, x1, n2, x2) => {
    const p1 = x1 / n1, p2 = x2 / n2, pp = (x1 + x2) / (n1 + n2);
    const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2)); const z = se === 0 ? 0 : (p2 - p1) / se;
    const seD = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
    return { p1, p2, z, p: S.pZ(z), diff: p2 - p1, lo: p2 - p1 - 1.96 * seD, hi: p2 - p1 + 1.96 * seD, lift: p1 > 0 ? (p2 - p1) / p1 : NaN };
  };
  S.alpha = cols => {
    const k = cols.length, n = cols[0].length;
    const tot = Array.from({ length: n }, (_, i) => cols.reduce((s, c) => s + c[i], 0));
    const sumVar = cols.reduce((s, c) => s + S.variance(c), 0);
    return k / (k - 1) * (1 - sumVar / S.variance(tot));
  };
  function invert(M) {
    const n = M.length; const A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-12) return null;
      [A[c], A[p]] = [A[p], A[c]];
      const pv = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= pv;
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; if (f !== 0) for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
    }
    return A.map(r => r.slice(n));
  }
  S.ols = (y, Xc) => {
    const n = y.length, k = Xc.length + 1;
    const X = y.map((_, i) => [1, ...Xc.map(c => c[i])]);
    const XtX = Array.from({ length: k }, () => Array(k).fill(0)), Xty = Array(k).fill(0);
    X.forEach((r, i) => { for (let a = 0; a < k; a++) { Xty[a] += r[a] * y[i]; for (let b = 0; b < k; b++) XtX[a][b] += r[a] * r[b]; } });
    const inv = invert(XtX); const df = n - k;
    if (!inv || df <= 0) return null;
    const beta = inv.map(r => r.reduce((s, v, j) => s + v * Xty[j], 0));
    const yhat = X.map(r => r.reduce((s, v, j) => s + v * beta[j], 0));
    const my = S.mean(y);
    const sse = y.reduce((s, v, i) => s + (v - yhat[i]) ** 2, 0), sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
    const mse = sse / df; const se = inv.map((r, i) => Math.sqrt(Math.max(0, mse * r[i])));
    const t = beta.map((b, i) => b / se[i]); const p = t.map(v => S.pT(v, df));
    const r2 = 1 - sse / sst; const adj = 1 - (1 - r2) * (n - 1) / df;
    const F = ((sst - sse) / (k - 1)) / mse; const pF = S.ibeta(df / (df + (k - 1) * F), df / 2, (k - 1) / 2);
    return { n, k, df, beta, se, t, p, r2, adj, F, pF };
  };
  S.quantileScore = (vals, reverse) => {          // skor 1–5 berdasarkan peringkat
    const idx = vals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const out = Array(vals.length); const n = vals.length;
    idx.forEach(([, i], r) => { const s = Math.min(5, Math.floor(r / n * 5) + 1); out[i] = reverse ? 6 - s : s; });
    return out;
  };
})();
