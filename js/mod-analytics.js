/* Modul 3 — Analitik Pelanggan & Keuangan Pemasaran: CLV/CAC, RFM, BEP & elastisitas */
(function () {
  'use strict';
  const { h, fmt } = VL;
  VL.sim = VL.sim || {};

  /* ---------- CLV & CAC ---------- */
  function clv(o) {
    const m = o.aov * o.freq * o.margin;               // laba kotor per pelanggan per tahun
    let total = 0;
    for (let t = 1; t <= o.years; t++) total += m * Math.pow(o.ret, t - 1) / Math.pow(1 + o.disc, t - 1);
    return { annualMargin: m, clv: total, ratio: o.cac > 0 ? total / o.cac : NaN, payback: m > 0 ? o.cac / (m / 12) : NaN, net: total - o.cac };
  }
  function clvUI(p) {
    const f = {
      aov: VL.numIn(85000, { min: 0 }), freq: VL.numIn(4, { min: 0, step: 0.5 }), margin: VL.numIn(40, { min: 0, max: 100 }),
      ret: VL.numIn(60, { min: 0, max: 100 }), disc: VL.numIn(10, { min: 0, max: 100 }), years: VL.numIn(3, { min: 1, max: 10 }), cac: VL.numIn(60000, { min: 0 })
    };
    const out = h('div');
    function run() {
      const o = { aov: VL.val(f.aov), freq: VL.val(f.freq), margin: VL.val(f.margin) / 100, ret: VL.val(f.ret) / 100, disc: VL.val(f.disc) / 100, years: Math.max(1, Math.round(VL.val(f.years))), cac: VL.val(f.cac) };
      const r = clv(o); out.innerHTML = '';
      const rows = []; let cum = -o.cac;
      for (let t = 1; t <= o.years; t++) { const v = r.annualMargin * Math.pow(o.ret, t - 1) / Math.pow(1 + o.disc, t - 1); cum += v; rows.push([t, fmt.n(Math.pow(o.ret, t - 1) * 100, 1) + '%', fmt.rp(v), fmt.rp(cum)]); }
      out.append(h('div', { class: 'card' },
        h('div', { class: 'kpis' }, VL.kpi('Laba kotor/tahun/pelanggan', fmt.rp(r.annualMargin)), VL.kpi('CLV (nilai kini)', fmt.rp(r.clv)), VL.kpi('CLV : CAC', fmt.n(r.ratio, 2) + ' : 1', r.ratio >= 3 ? 'good' : r.ratio < 1 ? 'bad' : ''), VL.kpi('Balik modal CAC', fmt.n(r.payback, 1) + ' bulan'), VL.kpi('CLV − CAC', fmt.rp(r.net), r.net >= 0 ? 'good' : 'bad')),
        VL.table(['Tahun', 'Pelanggan bertahan', 'Laba kotor (nilai kini)', 'Kumulatif setelah CAC'], rows, { num: [0, 1, 2, 3] }),
        h('p', { class: 'muted small' }, 'Model sederhana: laba kotor tahunan konstan, retensi tetap, tahun 1 dihitung penuh. Rasio 3:1 sering dipakai sebagai patokan praktik, bukan hukum — sesuaikan dengan struktur biaya dan arus kas usaha.'),
        h('button', { class: 'btn primary', onclick: () => VL.saveToJournal({ module: 'analytics', title: 'Hitung CLV & CAC', params: o, result: r, summary: 'CLV ' + fmt.rp(r.clv) + ', CAC ' + fmt.rp(o.cac) + ', rasio ' + fmt.n(r.ratio, 2) + ':1.' }) }, 'Simpan ke Jurnal')));
    }
    p.append(h('div', { class: 'card' },
      h('div', { class: 'cols' }, VL.field('Nilai pesanan rata-rata (Rp)', f.aov), VL.field('Frekuensi beli per tahun', f.freq), VL.field('Margin kotor (%)', f.margin), VL.field('Retensi tahunan (%)', f.ret), VL.field('Tingkat diskonto (%)', f.disc), VL.field('Horizon (tahun)', f.years), VL.field('CAC (Rp)', f.cac, 'Biaya pemasaran ÷ pelanggan baru')),
      h('button', { class: 'btn primary', onclick: run }, 'Hitung')), out);
    run();
  }

  /* ---------- RFM ---------- */
  let TX = null;   // transaksi: [{id, date(ms), amt}]
  function genTx() {
    const rnd = VL.rng(2026); const end = Date.UTC(2026, 9, 31); const tx = [];
    const types = [{ w: .12, f: [8, 20], r: [1, 30], a: [90e3, 220e3] }, { w: .2, f: [4, 9], r: [5, 60], a: [60e3, 150e3] }, { w: .18, f: [5, 10], r: [130, 300], a: [80e3, 200e3] }, { w: .3, f: [1, 3], r: [10, 200], a: [40e3, 120e3] }, { w: .2, f: [1, 2], r: [200, 360], a: [30e3, 100e3] }];
    for (let i = 1; i <= 500; i++) {
      let u = rnd(), t = types[0]; for (const x of types) { if (u < x.w) { t = x; break; } u -= x.w; }
      const n = Math.round(t.f[0] + rnd() * (t.f[1] - t.f[0])); const lastAgo = t.r[0] + rnd() * (t.r[1] - t.r[0]);
      for (let k = 0; k < n; k++) { const ago = Math.min(364, lastAgo + k * (10 + rnd() * 40)); tx.push({ id: 'C' + String(i).padStart(3, '0'), date: end - ago * 864e5, amt: Math.round((t.a[0] + rnd() * (t.a[1] - t.a[0])) / 1000) * 1000 }); }
    }
    return tx;
  }
  function parseTx(text) {
    const rows = VL.parseCSV(text); if (rows.length < 2) throw new Error('Data kosong');
    const head = rows[0].map(x => x.trim().toLowerCase());
    const find = (...k) => head.findIndex(x => k.some(y => x.includes(y)));
    let ci = find('id', 'pelanggan', 'customer'), di = find('tanggal', 'date', 'tgl'), ai = find('nominal', 'amount', 'total', 'jumlah', 'rp');
    if (ci < 0 || di < 0 || ai < 0) throw new Error('Kolom tidak dikenali. Gunakan header: id, tanggal, nominal');
    const tx = [];
    rows.slice(1).forEach(r => { const d = Date.parse(r[di]); const a = parseFloat(String(r[ai]).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); if (!isNaN(d) && !isNaN(a) && r[ci]) tx.push({ id: r[ci].trim(), date: d, amt: a }); });
    if (tx.length < 20) throw new Error('Terlalu sedikit baris valid (' + tx.length + '). Format tanggal disarankan YYYY-MM-DD.');
    return tx;
  }
  function rfm(tx) {
    const ref = Math.max(...tx.map(t => t.date)) + 864e5; const by = new Map();
    tx.forEach(t => { const c = by.get(t.id) || { id: t.id, last: 0, f: 0, m: 0 }; c.last = Math.max(c.last, t.date); c.f++; c.m += t.amt; by.set(t.id, c); });
    const cs = [...by.values()]; cs.forEach(c => { c.r = Math.round((ref - c.last) / 864e5); });
    const R = VL.stat.quantileScore(cs.map(c => c.r), true), F = VL.stat.quantileScore(cs.map(c => c.f)), M = VL.stat.quantileScore(cs.map(c => c.m));
    cs.forEach((c, i) => { c.R = R[i]; c.F = F[i]; c.M = M[i]; const fm = (c.F + c.M) / 2; c.seg = c.R >= 4 && fm >= 4 ? 'Champions' : c.R >= 3 && fm >= 4 ? 'Loyal' : c.R >= 4 && fm >= 2.5 ? 'Potensi loyal' : c.R >= 4 ? 'Baru' : c.R <= 2 && fm >= 3.5 ? 'Berisiko hilang' : c.R === 3 ? 'Perlu perhatian' : 'Tidur/hilang'; });
    return cs;
  }
  VL.sim.rfm = { rfm, parseTx, genTx, clv };
  const ADVICE = { 'Champions': 'Pertahankan: akses awal produk baru, program referral, jangan obral diskon berlebihan.', 'Loyal': 'Naikkan nilai: cross-sell, bundling, program poin.', 'Potensi loyal': 'Dorong pembelian kedua/ketiga: penawaran pelengkap, edukasi produk.', 'Baru': 'Onboarding: sapaan, panduan pakai, insentif pembelian ulang.', 'Berisiko hilang': 'Reaktivasi segera: pesan personal, penawaran "kami rindu", cari tahu penyebab.', 'Perlu perhatian': 'Pengingat dan penawaran terbatas waktu sebelum jatuh ke berisiko.', 'Tidur/hilang': 'Biaya rendah saja: email massal sesekali; jangan habiskan anggaran besar.' };
  function rfmUI(p) {
    const out = h('div'); const ta = h('textarea', { rows: 5, placeholder: 'id,tanggal,nominal\nC001,2026-09-14,85000\n…' });
    const file = h('input', { type: 'file', accept: '.csv,.txt', onchange: e => { const f = e.target.files[0]; if (f) f.text().then(t => { ta.value = t; load(); }); } });
    function load() { try { TX = parseTx(ta.value); analyse(); } catch (e) { out.innerHTML = ''; out.append(h('div', { class: 'card err' }, e.message)); } }
    function analyse() {
      out.innerHTML = ''; const cs = rfm(TX); const totM = cs.reduce((a, c) => a + c.m, 0);
      const segs = [...new Set(cs.map(c => c.seg))].map(s => { const g = cs.filter(c => c.seg === s); return { s, n: g.length, rev: g.reduce((a, c) => a + c.m, 0), avgR: VL.stat.mean(g.map(c => c.r)), avgF: VL.stat.mean(g.map(c => c.f)) }; }).sort((a, b) => b.rev - a.rev);
      out.append(h('div', { class: 'card' },
        h('div', { class: 'kpis' }, VL.kpi('Transaksi', fmt.n(TX.length)), VL.kpi('Pelanggan', fmt.n(cs.length)), VL.kpi('Total nilai', fmt.rp(totM)), VL.kpi('Rata-rata/pelanggan', fmt.rp(totM / cs.length))),
        VL.table(['Segmen', 'Pelanggan', '% pelanggan', 'Nilai', '% nilai', 'Rata-rata hari sejak beli', 'Rata-rata frekuensi'], segs.map(g => [g.s, fmt.n(g.n), fmt.pct(g.n / cs.length, 0), fmt.rp(g.rev), fmt.pct(g.rev / totM, 0), fmt.n(g.avgR, 0), fmt.n(g.avgF, 1)]), { num: [1, 2, 3, 4, 5, 6] }),
        h('h3', null, 'Porsi nilai per segmen'), VL.bars(segs.map(g => ({ label: g.s, value: g.rev / totM })), { fmt: v => fmt.pct(v, 0) }),
        h('h3', null, 'Tindakan yang disarankan'), h('ul', null, segs.map(g => h('li', null, h('b', null, g.s + ': '), ADVICE[g.s]))),
        h('p', { class: 'muted small' }, 'Skor 1–5 berdasarkan peringkat (kuintil) dalam data Anda sendiri, sehingga batas segmen bergantung pada sebaran data. Aturan pelabelan segmen bersifat konvensi, bukan standar baku — bandingkan juga dengan aturan lain.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn', onclick: () => VL.download('rfm-pelanggan.csv', VL.csv([['id', 'recency_hari', 'frekuensi', 'monetary', 'R', 'F', 'M', 'segmen'], ...cs.map(c => [c.id, c.r, c.f, c.m, c.R, c.F, c.M, c.seg])]), 'text/csv') }, 'Unduh hasil per pelanggan (CSV)'),
          h('button', { class: 'btn primary', onclick: () => VL.saveToJournal({ module: 'analytics', title: 'Segmentasi RFM', params: { transaksi: TX.length }, result: segs, summary: cs.length + ' pelanggan; segmen terbesar menurut nilai: ' + segs[0].s + ' (' + fmt.pct(segs[0].rev / totM, 0) + ' nilai).' }) }, 'Simpan ke Jurnal'))));
    }
    p.append(h('div', { class: 'card' },
      h('p', { class: 'muted' }, 'Tempel atau unggah data transaksi (kolom: id, tanggal, nominal). Atau pakai data contoh sintetis untuk berlatih.'),
      ta, h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: load }, 'Analisis'), h('button', { class: 'btn', onclick: () => { TX = genTx(); ta.value = ''; analyse(); } }, 'Pakai data contoh (sintetis)'), file),
      h('p', { class: 'muted small' }, 'Data pelanggan nyata mengandung data pribadi. Anonimkan ID dan pastikan Anda berwenang memakainya.')), out);
    if (TX) analyse();
  }

  /* ---------- BEP & elastisitas ---------- */
  function bepUI(p) {
    const f = { fix: VL.numIn(4000000, { min: 0 }), price: VL.numIn(20000, { min: 0 }), vc: VL.numIn(12000, { min: 0 }), tgt: VL.numIn(2000000, { min: 0 }), exp: VL.numIn(900, { min: 0 }) };
    const g = { p1: VL.numIn(20000), q1: VL.numIn(1000), p2: VL.numIn(18000), q2: VL.numIn(1250) };
    const o1 = h('div'), o2 = h('div');
    function run1() {
      const F = VL.val(f.fix), P = VL.val(f.price), V = VL.val(f.vc), T = VL.val(f.tgt), E = VL.val(f.exp); o1.innerHTML = '';
      if (P <= V) { o1.append(h('div', { class: 'card err' }, 'Harga harus lebih tinggi dari biaya variabel per unit.')); return; }
      const cm = P - V, bep = F / cm, tu = (F + T) / cm; const mos = E > 0 ? (E - bep) / E : NaN;
      const rows = [-20, -10, 0, 10, 20].map(d => { const pp = P * (1 + d / 100); const be = pp > V ? F / (pp - V) : NaN; return [(d > 0 ? '+' : '') + d + '%', fmt.rp(pp), fmt.n(be, 0)]; });
      o1.append(h('div', { class: 'card' }, h('div', { class: 'kpis' }, VL.kpi('Margin kontribusi/unit', fmt.rp(cm)), VL.kpi('BEP (unit)', fmt.n(Math.ceil(bep))), VL.kpi('BEP (Rp)', fmt.rp(bep * P)), VL.kpi('Unit untuk target laba', fmt.n(Math.ceil(tu))), VL.kpi('Margin keamanan', fmt.pct(mos, 0), mos >= 0.2 ? 'good' : mos < 0 ? 'bad' : '')),
        h('h3', null, 'Sensitivitas harga terhadap BEP'), VL.table(['Perubahan harga', 'Harga', 'BEP (unit)'], rows, { num: [1, 2] }),
        h('p', { class: 'muted small' }, 'Menurunkan harga menaikkan BEP lebih cepat daripada perkiraan intuitif karena margin kontribusi menyusut. Periksa apakah volume tambahan realistis (lihat elastisitas di bawah).'),
        h('button', { class: 'btn primary', onclick: () => VL.saveToJournal({ module: 'analytics', title: 'Titik impas (BEP)', params: { F, P, V, T, E }, result: { bep, tu, mos }, summary: 'BEP ' + fmt.n(Math.ceil(bep)) + ' unit (' + fmt.rp(bep * P) + '); target laba butuh ' + fmt.n(Math.ceil(tu)) + ' unit.' }) }, 'Simpan ke Jurnal')));
    }
    function run2() {
      const p1 = VL.val(g.p1), q1 = VL.val(g.q1), p2 = VL.val(g.p2), q2 = VL.val(g.q2); o2.innerHTML = '';
      if (p1 === p2 || p1 <= 0 || p2 <= 0 || q1 <= 0 || q2 <= 0) { o2.append(h('div', { class: 'card err' }, 'Harga lama dan baru harus berbeda; semua nilai > 0.')); return; }
      const e = ((q2 - q1) / ((q1 + q2) / 2)) / ((p2 - p1) / ((p1 + p2) / 2)); const r1 = p1 * q1, r2 = p2 * q2;
      const kind = Math.abs(e) > 1 ? 'elastis' : Math.abs(e) < 1 ? 'inelastis' : 'elastisitas satuan';
      o2.append(h('div', { class: 'card' }, h('div', { class: 'kpis' }, VL.kpi('Elastisitas busur', fmt.n(e, 2)), VL.kpi('Sifat', kind), VL.kpi('Pendapatan lama', fmt.rp(r1)), VL.kpi('Pendapatan baru', fmt.rp(r2), r2 >= r1 ? 'good' : 'bad')),
        h('p', null, Math.abs(e) > 1 ? 'Permintaan elastis: perubahan harga menggerakkan jumlah lebih besar secara proporsional, sehingga penurunan harga cenderung menaikkan pendapatan.' : 'Permintaan inelastis: kenaikan harga cenderung menaikkan pendapatan, tetapi cek kemungkinan reaksi pesaing dan dampak jangka panjang.'),
        h('p', { class: 'muted small' }, 'Dua titik data tidak membuktikan kausalitas: promosi, musim, atau pesaing bisa ikut berubah. Pendapatan naik belum tentu laba naik — hitung juga biaya variabel.'),
        h('button', { class: 'btn primary', onclick: () => VL.saveToJournal({ module: 'analytics', title: 'Elastisitas harga', params: { p1, q1, p2, q2 }, result: { e, r1, r2 }, summary: 'Elastisitas ' + fmt.n(e, 2) + ' (' + kind + '); pendapatan ' + fmt.rp(r1) + ' → ' + fmt.rp(r2) + '.' }) }, 'Simpan ke Jurnal')));
    }
    p.append(h('div', { class: 'card' }, h('h3', null, 'Titik impas (break-even)'),
      h('div', { class: 'cols' }, VL.field('Biaya tetap per periode (Rp)', f.fix), VL.field('Harga jual/unit (Rp)', f.price), VL.field('Biaya variabel/unit (Rp)', f.vc), VL.field('Target laba (Rp)', f.tgt), VL.field('Perkiraan penjualan (unit)', f.exp)),
      h('button', { class: 'btn primary', onclick: run1 }, 'Hitung BEP')), o1,
    h('div', { class: 'card' }, h('h3', null, 'Elastisitas harga permintaan (busur)'),
      h('div', { class: 'cols' }, VL.field('Harga lama (Rp)', g.p1), VL.field('Jumlah terjual lama', g.q1), VL.field('Harga baru (Rp)', g.p2), VL.field('Jumlah terjual baru', g.q2)),
      h('button', { class: 'btn primary', onclick: run2 }, 'Hitung elastisitas')), o2);
    run1(); run2();
  }

  VL.register({
    id: 'analytics', icon: '📊', title: 'Analitik Pelanggan & Keuangan Pemasaran',
    mk: ['Manajemen Pemasaran', 'Bisnis Digital', 'Pemasaran Digital'],
    desc: 'Hitung CLV dan CAC, segmentasi pelanggan dengan RFM dari data transaksi, titik impas, dan elastisitas harga.',
    render(el) { VL.tabs(el, [{ label: 'CLV & CAC', render: clvUI }, { label: 'Segmentasi RFM', render: rfmUI }, { label: 'BEP & elastisitas', render: bepUI }]); }
  });
})();
