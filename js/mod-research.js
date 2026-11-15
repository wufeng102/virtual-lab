/* Modul 4 — Ruang Riset: rancangan, instrumen, analisis data, sentimen */
(function () {
  'use strict';
  const { h, fmt } = VL;
  VL.sim = VL.sim || {};

  /* ---------- Dataset ---------- */
  let DS = null;   // { name, cols:[{name, num}], rows:[[...]] }
  function buildDS(name, rows) {
    const head = rows[0].map((x, i) => (x || '').trim() || 'kol' + (i + 1));
    const body = rows.slice(1).map(r => head.map((_, i) => (r[i] == null ? '' : String(r[i]).trim())));
    const cols = head.map((c, i) => {
      const vals = body.map(r => r[i]).filter(v => v !== '');
      const nums = vals.filter(v => !isNaN(parseFloat(v.replace(',', '.'))) && isFinite(v.replace(',', '.')));
      return { name: c, num: vals.length > 0 && nums.length / vals.length >= 0.9 };
    });
    const data = body.map(r => r.map((v, i) => (cols[i].num ? (v === '' ? NaN : parseFloat(v.replace(',', '.'))) : v)));
    return { name, cols, rows: data };
  }
  function genSurvey() {
    const rnd = VL.rng(77), g = () => VL.gauss(rnd), n = 200;
    const lik = z => Math.min(5, Math.max(1, Math.round(3 + 0.85 * z)));
    const head = ['id', 'jenis_kelamin', 'kelompok_usia', 'platform_utama', 'belanja_per_bulan'];
    ['BI', 'KP', 'LY'].forEach(k => [1, 2, 3, 4].forEach(i => head.push(k + i)));
    const rows = [head];
    for (let i = 1; i <= n; i++) {
      const bi = g(), kp = 0.6 * bi + 0.8 * g(), ly = 0.5 * kp + 0.2 * bi + 0.8 * g();
      const sex = rnd() < 0.55 ? 'P' : 'L', usia = ['<=20', '21-25', '>25'][Math.floor(rnd() * 3)], plat = ['Instagram', 'TikTok', 'Marketplace'][Math.floor(rnd() * 3)];
      const spend = Math.max(20, Math.round(150 + 40 * ly + 25 * g() + (plat === 'TikTok' ? 15 : 0)));
      const row = [i, sex, usia, plat, spend];
      [bi, kp, ly].forEach(z => [1, 2, 3, 4].forEach(() => row.push(lik(0.8 * z + 0.6 * g()))));
      rows.push(row);
    }
    return rows;
  }
  VL.sim.research = { buildDS, genSurvey };

  const numCols = () => DS.cols.map((c, i) => ({ c, i })).filter(x => x.c.num);
  const catCols = () => DS.cols.map((c, i) => ({ c, i })).filter(x => !x.c.num);
  const colVals = i => DS.rows.map(r => r[i]);
  function checks(items) {
    const boxes = items.map(({ c, i }) => { const k = h('input', { type: 'checkbox' }); return { k, i, c }; });
    return { el: h('div', { class: 'row' }, boxes.map(b => h('label', { class: 'chip' }, b.k, b.c.name))), get: () => boxes.filter(b => b.k.checked).map(b => ({ i: b.i, name: b.c.name })) };
  }
  const colSel = items => VL.select(items.map(({ c, i }) => [String(i), c.name]), items.length ? String(items[0].i) : '');
  const saveBtn = (title, params, result, summary) => h('button', { class: 'btn primary', onclick: () => VL.saveToJournal({ module: 'research', title, params, result, summary }) }, 'Simpan ke Jurnal');
  const stars = p => p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '';

  /* ---------- Data & analisis ---------- */
  function dataUI(p) {
    const ta = h('textarea', { rows: 5, placeholder: 'Tempel data CSV (baris pertama = nama variabel)…' });
    const file = h('input', { type: 'file', accept: '.csv,.txt', onchange: e => { const f = e.target.files[0]; if (f) f.text().then(t => { ta.value = t; load(f.name); }); } });
    const area = h('div');
    function load(name) { try { const rows = VL.parseCSV(ta.value); if (rows.length < 3) throw new Error('Data minimal 2 baris di bawah header.'); DS = buildDS(name || 'data-tempel', rows); show(); } catch (e) { area.innerHTML = ''; area.append(h('div', { class: 'card err' }, e.message)); } }
    p.append(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Muat dataset hasil survei Anda, atau pakai data contoh sintetis (200 responden: Brand Image BI1–4, Kepuasan KP1–4, Loyalitas LY1–4) untuk berlatih.'), ta,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => load() }, 'Muat data'), h('button', { class: 'btn', onclick: () => { ta.value = ''; DS = buildDS('survei-sintetis', genSurvey()); show(); } }, 'Data contoh (sintetis)'), file),
      h('p', { class: 'muted small' }, 'Data contoh SINTETIS — jangan dilaporkan sebagai temuan empiris. Data responden nyata: pastikan ada persetujuan (informed consent) dan hapus identitas.')), area);
    function show() {
      area.innerHTML = '';
      area.append(h('div', { class: 'card' }, h('h3', null, 'Dataset: ' + DS.name), h('p', null, DS.rows.length + ' baris · ' + DS.cols.length + ' variabel (' + numCols().length + ' numerik, ' + catCols().length + ' kategorik).'),
        VL.table(['Variabel', 'Tipe', 'Contoh'], DS.cols.map((c, i) => [c.name, c.num ? 'numerik' : 'kategorik', DS.rows.slice(0, 3).map(r => r[i]).join(', ')]))));
      const sub = h('div'); area.append(sub);
      VL.tabs(sub, [{ label: 'Deskriptif', render: descUI }, { label: 'Reliabilitas', render: relUI }, { label: 'Korelasi', render: corUI }, { label: 'Uji-t', render: ttUI }, { label: 'Regresi', render: regUI }]);
    }
    if (DS) show();
  }

  function descUI(p) {
    const rows = numCols().map(({ c, i }) => { const v = colVals(i).filter(x => !isNaN(x)); return [c.name, fmt.n(v.length), fmt.n(VL.stat.mean(v), 2), fmt.n(VL.stat.sd(v), 2), fmt.n(Math.min(...v), 2), fmt.n(Math.max(...v), 2)]; });
    p.append(VL.table(['Variabel', 'n', 'Rerata', 'SD', 'Min', 'Maks'], rows, { num: [1, 2, 3, 4, 5] }));
    const cats = catCols().filter(x => x.c.name.toLowerCase() !== 'id');
    cats.forEach(({ c, i }) => { const m = {}; colVals(i).forEach(v => { m[v] = (m[v] || 0) + 1; }); p.append(h('h3', null, 'Frekuensi: ' + c.name), VL.table(['Kategori', 'n', '%'], Object.entries(m).map(([k, v]) => [k, v, fmt.pct(v / DS.rows.length, 1)]), { num: [1, 2] })); });
    p.append(saveBtn('Statistik deskriptif ' + DS.name, { dataset: DS.name }, rows, rows.length + ' variabel numerik dideskripsikan (n=' + DS.rows.length + ').'));
  }

  function relUI(p) {
    const ck = checks(numCols()); const out = h('div'); const nm = h('input', { type: 'text', placeholder: 'Nama konstruk, mis. Brand Image' });
    p.append(h('p', { class: 'muted' }, 'Pilih butir-butir satu konstruk untuk Cronbach\'s alpha. Anda juga bisa membuat skor komposit (rerata butir) sebagai variabel baru.'), VL.field('Nama konstruk', nm), ck.el,
      h('button', { class: 'btn primary', onclick: () => {
        const sel = ck.get(); out.innerHTML = '';
        if (sel.length < 2) { out.append(h('div', { class: 'card err' }, 'Pilih minimal 2 butir.')); return; }
        const rows = DS.rows.filter(r => sel.every(s => !isNaN(r[s.i])));
        const cols = sel.map(s => rows.map(r => r[s.i])); const a = VL.stat.alpha(cols);
        const dropped = sel.map((s, j) => { const rest = cols.filter((_, k) => k !== j); return [s.name, rest.length > 1 ? fmt.n(VL.stat.alpha(rest), 3) : '–', fmt.n(VL.stat.corr(cols[j], rows.map((_, ri) => rest.reduce((t, c) => t + c[ri], 0))).r, 3)]; });
        const kind = a >= 0.8 ? 'baik' : a >= 0.7 ? 'dapat diterima' : a >= 0.6 ? 'meragukan' : 'rendah';
        out.append(h('div', { class: 'card' }, h('div', { class: 'kpis' }, VL.kpi('Cronbach\'s α', fmt.n(a, 3), a >= 0.7 ? 'good' : 'bad'), VL.kpi('Jumlah butir', sel.length), VL.kpi('n valid', rows.length)),
          h('p', null, 'Konsistensi internal tergolong ' + kind + ' (patokan umum: ≥ 0,70). Alpha tinggi tidak menjamin validitas, dan dipengaruhi jumlah butir.'),
          VL.table(['Butir', 'α jika dihapus', 'Korelasi butir–total lain'], dropped, { num: [1, 2] }),
          h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { const nameNew = 'skor_' + (nm.value.trim().replace(/\s+/g, '_') || 'komposit'); DS.cols.push({ name: nameNew, num: true }); DS.rows.forEach(r => { const v = sel.map(s => r[s.i]); r.push(v.some(isNaN) ? NaN : VL.stat.mean(v)); }); VL.toast('Variabel ' + nameNew + ' ditambahkan — buka ulang tab lain untuk memakainya'); } }, 'Buat skor komposit'),
            saveBtn('Reliabilitas ' + (nm.value || 'konstruk'), { butir: sel.map(s => s.name) }, { alpha: a, n: rows.length }, 'Cronbach α ' + (nm.value || 'konstruk') + ' = ' + fmt.n(a, 3) + ' (' + sel.length + ' butir, n=' + rows.length + ').'))));
      } }, 'Hitung α'), out);
  }

  function corUI(p) {
    const ck = checks(numCols()); const out = h('div');
    p.append(h('p', { class: 'muted' }, 'Korelasi Pearson antar variabel numerik terpilih.'), ck.el, h('button', { class: 'btn primary', onclick: () => {
      const sel = ck.get(); out.innerHTML = '';
      if (sel.length < 2) { out.append(h('div', { class: 'card err' }, 'Pilih minimal 2 variabel.')); return; }
      const rows = DS.rows.filter(r => sel.every(s => !isNaN(r[s.i]))); const cols = sel.map(s => rows.map(r => r[s.i]));
      const mat = sel.map((_, a) => sel.map((_, b) => a === b ? { r: 1, p: 0 } : VL.stat.corr(cols[a], cols[b])));
      const tbl = h('div', { class: 'tbl-wrap' }, h('table', { class: 'heat' }, h('thead', null, h('tr', null, h('th'), sel.map(s => h('th', null, s.name)))),
        h('tbody', null, sel.map((s, a) => h('tr', null, h('th', null, s.name), mat[a].map((c, b) => h('td', { style: a === b ? '' : 'background:rgba(15,118,110,' + Math.min(0.55, Math.abs(c.r) * 0.6).toFixed(2) + ')' }, a === b ? '—' : fmt.n(c.r, 2) + stars(c.p))))))));
      out.append(h('div', { class: 'card' }, tbl, h('p', { class: 'muted small' }, 'n = ' + rows.length + ' · * p<0,05 ** p<0,01 *** p<0,001. Korelasi bukan kausalitas; uji sensitif terhadap pencilan.'),
        saveBtn('Matriks korelasi', { variabel: sel.map(s => s.name) }, mat.map(r => r.map(c => c.r)), 'Korelasi ' + sel.map(s => s.name).join(', ') + ' (n=' + rows.length + ').')));
    } }, 'Hitung'), out);
  }

  function ttUI(p) {
    const nc = numCols(), cc = catCols().filter(x => x.c.name.toLowerCase() !== 'id'); const out = h('div');
    if (!nc.length || !cc.length) { p.append(h('div', { class: 'card' }, 'Butuh minimal satu variabel numerik dan satu variabel kategorik (dua kelompok).')); return; }
    const y = colSel(nc), g = colSel(cc);
    p.append(h('div', { class: 'cols' }, VL.field('Variabel numerik', y), VL.field('Pengelompokan (harus 2 kelompok)', g)), h('button', { class: 'btn primary', onclick: () => {
      out.innerHTML = ''; const yi = +y.value, gi = +g.value; const groups = {};
      DS.rows.forEach(r => { if (!isNaN(r[yi]) && r[gi] !== '') (groups[r[gi]] = groups[r[gi]] || []).push(r[yi]); });
      const keys = Object.keys(groups);
      if (keys.length !== 2) { out.append(h('div', { class: 'card err' }, 'Variabel pengelompokan punya ' + keys.length + ' kategori (' + keys.join(', ') + '). Uji-t membutuhkan tepat 2. Untuk ≥3 kelompok gunakan ANOVA di perangkat lunak statistik.')); return; }
      const r = VL.stat.welch(groups[keys[0]], groups[keys[1]]); const nm = DS.cols[yi].name;
      out.append(h('div', { class: 'card' }, VL.table(['Kelompok', 'n', 'Rerata', 'SD'], [[keys[0], r.n1, fmt.n(r.m1, 2), fmt.n(r.sd1, 2)], [keys[1], r.n2, fmt.n(r.m2, 2), fmt.n(r.sd2, 2)]], { num: [1, 2, 3] }),
        h('div', { class: 'kpis' }, VL.kpi('t (Welch)', fmt.n(r.t, 3)), VL.kpi('df', fmt.n(r.df, 1)), VL.kpi('p (dua arah)', fmt.p(r.p), r.p < 0.05 ? 'good' : ''), VL.kpi("Cohen's d", fmt.n(r.d, 2))),
        h('p', null, r.p < 0.05 ? 'Rerata ' + nm + ' berbeda signifikan antara ' + keys[0] + ' dan ' + keys[1] + ' pada α = 0,05.' : 'Tidak ada bukti perbedaan rerata ' + nm + ' yang signifikan pada α = 0,05.'),
        h('p', { class: 'muted small' }, 'Uji-t Welch (tidak mengasumsikan varians sama). Untuk skala Likert tunggal, pertimbangkan uji non-parametrik; ukuran efek |d| ≈ 0,2 kecil, 0,5 sedang, 0,8 besar (patokan Cohen).'),
        saveBtn('Uji-t ' + nm + ' menurut ' + DS.cols[gi].name, { y: nm, kelompok: DS.cols[gi].name }, r, 't(' + fmt.n(r.df, 1) + ')=' + fmt.n(r.t, 2) + ', p=' + fmt.p(r.p) + ', d=' + fmt.n(r.d, 2) + '.')));
    } }, 'Uji'), out);
  }

  function regUI(p) {
    const nc = numCols(); const out = h('div');
    if (nc.length < 2) { p.append(h('div', { class: 'card' }, 'Butuh minimal 2 variabel numerik.')); return; }
    const y = colSel(nc); const ck = checks(nc);
    p.append(VL.field('Variabel terikat (Y)', y), h('div', { class: 'lbl' }, 'Variabel bebas (X)'), ck.el, h('button', { class: 'btn primary', onclick: () => {
      out.innerHTML = ''; const yi = +y.value; const xs = ck.get().filter(s => s.i !== yi);
      if (!xs.length) { out.append(h('div', { class: 'card err' }, 'Pilih minimal satu variabel bebas (selain Y).')); return; }
      const rows = DS.rows.filter(r => !isNaN(r[yi]) && xs.every(s => !isNaN(r[s.i])));
      const res = VL.stat.ols(rows.map(r => r[yi]), xs.map(s => rows.map(r => r[s.i])));
      if (!res) { out.append(h('div', { class: 'card err' }, 'Model tidak dapat dihitung (data terlalu sedikit atau variabel saling bergantung sempurna/multikolinearitas ekstrem).')); return; }
      const sy = VL.stat.sd(rows.map(r => r[yi]));
      const names = ['(Konstanta)', ...xs.map(s => s.name)];
      const trows = names.map((nme, k) => [nme, fmt.n(res.beta[k], 3), fmt.n(res.se[k], 3), k ? fmt.n(res.beta[k] * VL.stat.sd(rows.map(r => r[xs[k - 1].i])) / sy, 3) : '–', fmt.n(res.t[k], 2), fmt.p(res.p[k]) + ' ' + stars(res.p[k])]);
      out.append(h('div', { class: 'card' }, h('div', { class: 'kpis' }, VL.kpi('R²', fmt.n(res.r2, 3)), VL.kpi('R² disesuaikan', fmt.n(res.adj, 3)), VL.kpi('F', fmt.n(res.F, 2)), VL.kpi('p (F)', fmt.p(res.pF), res.pF < 0.05 ? 'good' : ''), VL.kpi('n', res.n)),
        VL.table(['Prediktor', 'B', 'SE', 'Beta (baku)', 't', 'p'], trows, { num: [1, 2, 3, 4, 5] }),
        h('p', { class: 'muted small' }, 'Regresi linear berganda (OLS). Periksa asumsi di perangkat lunak statistik (normalitas residual, homoskedastisitas, multikolinearitas/VIF) sebelum melaporkan. Hasil regresi menunjukkan asosiasi, bukan sebab-akibat; skor Likert tunggal bersifat ordinal.'),
        saveBtn('Regresi ' + DS.cols[yi].name, { y: DS.cols[yi].name, x: xs.map(s => s.name) }, res, 'R²=' + fmt.n(res.r2, 3) + ', F=' + fmt.n(res.F, 2) + ' (p=' + fmt.p(res.pF) + '), n=' + res.n + '.')));
    } }, 'Estimasi'), out);
  }

  /* ---------- Rancangan penelitian & instrumen ---------- */
  function designUI(p) {
    VL.worksheet(p, { id: 'rancangan-penelitian', module: 'research', title: 'Rancangan penelitian', intro: 'Rancangan yang baik bisa dijelaskan dalam satu halaman. Tulis singkat, lalu minta dosen mengkritisinya SEBELUM mengumpulkan data.',
      fields: [
        { k: 'judul', label: 'Judul kerja', type: 'text' },
        { k: 'masalah', label: 'Masalah penelitian', rows: 3, hint: 'Kesenjangan apa yang ingin dijawab? Mengapa penting bagi praktik/teori?' },
        { k: 'rq', label: 'Pertanyaan penelitian', rows: 2 },
        { k: 'tujuan', label: 'Tujuan', rows: 2 },
        { k: 'variabel', label: 'Variabel & definisi operasional', rows: 4, hint: 'X, Y, mediasi/moderasi; dari teori siapa definisi dan indikatornya?' },
        { k: 'hipotesis', label: 'Hipotesis', rows: 3, hint: 'H1: … ; H2: … Arah hubungan harus punya alasan teoretis.' },
        { k: 'populasi', label: 'Populasi, sampel, dan teknik sampling', rows: 3, hint: 'Berapa n, bagaimana dipilih, dan mengapa n itu memadai?' },
        { k: 'instrumen', label: 'Instrumen & skala', rows: 3, hint: 'Sumber butir (diadopsi/dimodifikasi), skala Likert, rencana uji coba.' },
        { k: 'analisis', label: 'Teknik analisis data', rows: 3, hint: 'Uji validitas/reliabilitas, uji asumsi, dan uji hipotesis yang dipakai.' },
        { k: 'etika', label: 'Etika', rows: 2, hint: 'Persetujuan responden, anonimitas, penyimpanan data.' },
        { k: 'batasan', label: 'Ancaman terhadap validitas', rows: 2, hint: 'Bias sampel, common method bias, data swa-laporan, dll.' }] });
  }
  function instrUI(p) {
    const k = h('input', { type: 'text', placeholder: 'mis. Kepuasan Pelanggan' }), code = h('input', { type: 'text', placeholder: 'kode, mis. KP', maxlength: 4 }), items = h('textarea', { rows: 5, placeholder: 'Satu pernyataan per baris, mis.\nSaya puas dengan kualitas produk ini\nProduk ini sesuai harapan saya' });
    const scale = VL.select([['5', 'Likert 1–5'], ['7', 'Likert 1–7']], '5'); const out = h('pre', { class: 'out' }); let list = [];
    const SC = { 5: '1 = Sangat tidak setuju … 5 = Sangat setuju', 7: '1 = Sangat tidak setuju … 7 = Sangat setuju' };
    function draw() { out.textContent = list.length ? list.map(c => c.name + ' (' + c.code + ')\n' + c.items.map((t, i) => '  ' + c.code + (i + 1) + '. ' + t).join('\n')).join('\n\n') + '\n\nSkala: ' + SC[scale.value] : 'Belum ada konstruk.'; }
    p.append(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Susun kuesioner per konstruk. Kode butir (mis. KP1…) sama dengan nama kolom di tab Data & Analisis.'), h('div', { class: 'cols' }, VL.field('Nama konstruk', k), VL.field('Kode konstruk', code), VL.field('Skala', scale)), VL.field('Butir pernyataan', items),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { const t = items.value.split('\n').map(s => s.trim()).filter(Boolean); if (!k.value.trim() || !t.length) { VL.toast('Isi nama konstruk dan butir'); return; } list.push({ name: k.value.trim(), code: (code.value.trim() || 'X' + (list.length + 1)).toUpperCase(), items: t }); k.value = ''; code.value = ''; items.value = ''; draw(); } }, 'Tambah konstruk'),
        h('button', { class: 'btn', onclick: () => { list = []; draw(); } }, 'Kosongkan'),
        h('button', { class: 'btn', onclick: () => VL.download('kuesioner.txt', out.textContent) }, 'Unduh .txt'),
        h('button', { class: 'btn', onclick: () => { const hd = ['id']; list.forEach(c => c.items.forEach((_, i) => hd.push(c.code + (i + 1)))); VL.download('template-data.csv', hd.join(',') + '\n', 'text/csv'); } }, 'Template CSV data'),
        h('button', { class: 'btn primary', onclick: () => list.length ? VL.saveToJournal({ module: 'research', title: 'Instrumen survei', params: { konstruk: list, skala: scale.value }, result: { konstruk: list.length, butir: list.reduce((a, c) => a + c.items.length, 0) }, summary: list.length + ' konstruk, ' + list.reduce((a, c) => a + c.items.length, 0) + ' butir.' }) : VL.toast('Belum ada konstruk') }, 'Simpan ke Jurnal')),
      h('p', { class: 'muted small' }, 'Butir yang baik: satu gagasan per butir, tanpa kata ganda ("dan"), tanpa arahan jawaban. Lakukan uji coba kecil (pilot) sebelum pengumpulan data utama.')), out);
    draw();
  }

  /* ---------- Sentimen berbasis kamus ---------- */
  const POS = 'bagus mantap keren suka puas recommended rekomended rekomen murah cepat ramah enak nyaman bersih worth top oke ok sip senang terbaik halal aman terpercaya original lengkap rapi wangi empuk awet kece cakep cantik berkualitas memuaskan juara love good great nice best sukses lezat gurih segar manis responsif amanah'.split(' ');
  const NEG = 'jelek buruk kecewa mahal lambat lama rusak palsu tipu penipu parah zonk mengecewakan bau kotor rugi nyesel menyesal telat cacat bohong ribet susah sampah murahan basi ilegal bad worst lelet mengerikan ancur hancur mengeluh pahit hambar sobek lecet ghosting'.split(' ');
  const NEGATE = new Set(['tidak', 'nggak', 'ga', 'gak', 'bukan', 'kurang', 'belum', 'tak', 'ngga', 'enggak']);
  const PS = new Set(POS), NS = new Set(NEG);
  function sentiment(text) {
    const toks = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean); let sc = 0; const hits = [];
    toks.forEach((t, i) => { let v = PS.has(t) ? 1 : NS.has(t) ? -1 : 0; if (!v) return; if (i > 0 && NEGATE.has(toks[i - 1])) v = -v; sc += v; hits.push((v > 0 ? '+' : '−') + t); });
    return { score: sc, label: sc > 0 ? 'Positif' : sc < 0 ? 'Negatif' : 'Netral', hits };
  }
  VL.sim.sentiment = sentiment;
  function sentUI(p) {
    const ta = h('textarea', { rows: 8, placeholder: 'Tempel komentar/ulasan, satu per baris…' }); const out = h('div');
    const demo = ['Barangnya bagus banget, pengiriman cepat, recommended', 'Kecewa, barang rusak dan penjual lambat balas', 'Harganya murah tapi kualitas tidak bagus', 'Biasa saja sih', 'Rasanya enak, kemasan rapi, halal', 'Mahal banget, nyesel beli', 'Packing aman, admin ramah'];
    p.append(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Klasifikasi cepat berbasis kamus kata bahasa Indonesia (dengan penanganan negasi sederhana). Alat latihan untuk memahami cara kerja analisis sentimen — bukan alat ukur yang siap dipublikasikan.'), ta,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: run }, 'Analisis'), h('button', { class: 'btn', onclick: () => { ta.value = demo.join('\n'); run(); } }, 'Contoh komentar'))), out);
    function run() {
      out.innerHTML = ''; const lines = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
      if (!lines.length) { out.append(h('div', { class: 'card err' }, 'Belum ada komentar.')); return; }
      const rs = lines.map(t => Object.assign({ t }, sentiment(t))); const c = l => rs.filter(r => r.label === l).length;
      const wc = {}; rs.forEach(r => r.hits.forEach(x => { wc[x] = (wc[x] || 0) + 1; })); const top = Object.entries(wc).sort((a, b) => b[1] - a[1]).slice(0, 8);
      out.append(h('div', { class: 'card' }, h('div', { class: 'kpis' }, VL.kpi('Komentar', rs.length), VL.kpi('Positif', fmt.pct(c('Positif') / rs.length, 0), 'good'), VL.kpi('Netral', fmt.pct(c('Netral') / rs.length, 0)), VL.kpi('Negatif', fmt.pct(c('Negatif') / rs.length, 0), 'bad')),
        top.length ? h('p', { class: 'small' }, 'Kata pemicu teratas: ' + top.map(([k, v]) => k + ' (' + v + ')').join(', ')) : null,
        VL.table(['Komentar', 'Skor', 'Label', 'Kata pemicu'], rs.map(r => [r.t.length > 70 ? r.t.slice(0, 70) + '…' : r.t, r.score, r.label, r.hits.join(' ')]), { num: [1] }),
        h('p', { class: 'warn small' }, 'Keterbatasan: kamus kecil, tidak memahami sarkasme, bahasa gaul/campur kode, atau konteks ("murah tapi jelek" bisa dinilai netral). Praktik riset: beri label manual pada sampel, hitung akurasi/kappa, baru bandingkan dengan metode lain.'),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => VL.download('sentimen.csv', VL.csv([['komentar', 'skor', 'label'], ...rs.map(r => [r.t, r.score, r.label])]), 'text/csv') }, 'Unduh CSV'),
          saveBtn('Analisis sentimen komentar', { n: rs.length }, { positif: c('Positif'), netral: c('Netral'), negatif: c('Negatif') }, rs.length + ' komentar: ' + c('Positif') + ' positif, ' + c('Netral') + ' netral, ' + c('Negatif') + ' negatif (kamus sederhana).'))));
    }
  }

  VL.register({
    id: 'research', icon: '🔬', title: 'Ruang Riset',
    mk: ['Strategi Pemasaran', 'Pemasaran Digital', 'Manajemen Pemasaran', 'Bisnis Digital'],
    desc: 'Rancang penelitian, susun kuesioner, analisis data survei (deskriptif, alpha, korelasi, uji-t, regresi), dan latihan analisis sentimen komentar.',
    render(el) { VL.tabs(el, [{ label: 'Rancangan', render: designUI }, { label: 'Instrumen', render: instrUI }, { label: 'Data & analisis', render: dataUI }, { label: 'Sentimen', render: sentUI }]); }
  });
})();
