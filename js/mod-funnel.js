/* Modul 6 — Funnel Terbalik & Audit SEO/GEO */
(function () {
  'use strict';
  const { h, fmt } = VL;

  function funnelUI(p) {
    const f = { goal: VL.numIn(100, { min: 1 }), cr1: VL.numIn(3, { min: 0.01, step: 0.1 }), cr2: VL.numIn(25, { min: 0.01, step: 1 }), cr3: VL.numIn(40, { min: 0.01, step: 1 }), cpc: VL.numIn(1500, { min: 0 }), price: VL.numIn(150000, { min: 0 }), margin: VL.numIn(40, { min: 0, max: 100 }) };
    const out = h('div');
    function run() {
      const g = VL.val(f.goal), c1 = VL.val(f.cr1) / 100, c2 = VL.val(f.cr2) / 100, c3 = VL.val(f.cr3) / 100, cpc = VL.val(f.cpc), price = VL.val(f.price), mg = VL.val(f.margin) / 100;
      out.innerHTML = '';
      if (![c1, c2, c3].every(x => x > 0 && x <= 1) || g <= 0) { out.append(h('div', { class: 'card err' }, 'Periksa isian: laju konversi harus antara 0 dan 100%.')); return; }
      const buyers = g, carts = Math.ceil(buyers / c3), leads = Math.ceil(carts / c2), visits = Math.ceil(leads / c1);
      const spend = visits * cpc, rev = buyers * price, gp = rev * mg, cac = spend / buyers;
      out.append(h('div', { class: 'card' }, VL.bars([{ label: 'Kunjungan', value: visits }, { label: 'Prospek (chat/daftar)', value: leads }, { label: 'Keranjang/penawaran', value: carts }, { label: 'Pembeli', value: buyers }]),
        h('div', { class: 'kpis' }, VL.kpi('Kunjungan dibutuhkan', fmt.n(visits)), VL.kpi('Biaya iklan (perkiraan)', fmt.rp(spend)), VL.kpi('CAC', fmt.rp(cac)), VL.kpi('ROAS', fmt.n(spend ? rev / spend : NaN, 2) + 'x', gp > spend ? 'good' : 'bad'), VL.kpi('Laba kotor − iklan', fmt.rp(gp - spend), gp > spend ? 'good' : 'bad')),
        h('p', { class: 'muted small' }, 'Hitung mundur dari target penjualan ke lalu lintas yang dibutuhkan. Tahap dengan laju konversi terendah biasanya menjadi titik perbaikan paling berdampak. Anggaran hanya memperhitungkan biaya klik.'),
        h('button', { class: 'btn primary', onclick: () => VL.saveToJournal({ module: 'funnel', title: 'Funnel terbalik', params: { g, c1, c2, c3, cpc, price, mg }, result: { visits, leads, carts, spend, cac }, summary: 'Target ' + g + ' pembeli butuh ' + fmt.n(visits) + ' kunjungan, biaya ' + fmt.rp(spend) + ', CAC ' + fmt.rp(cac) + '.' }) }, 'Simpan ke Jurnal')));
    }
    p.append(h('div', { class: 'card' }, h('div', { class: 'cols' }, VL.field('Target pembeli', f.goal), VL.field('Kunjungan → prospek (%)', f.cr1), VL.field('Prospek → keranjang/penawaran (%)', f.cr2), VL.field('Keranjang → pembeli (%)', f.cr3), VL.field('Biaya per klik (Rp)', f.cpc), VL.field('Harga produk (Rp)', f.price), VL.field('Margin kotor (%)', f.margin)),
      h('button', { class: 'btn primary', onclick: run }, 'Hitung')), out);
    run();
  }

  const AUDIT = [
    { g: 'Teknis', items: ['Situs memakai HTTPS', 'Tampilan nyaman di ponsel', 'Halaman utama termuat cepat (kurang lebih ≤ 3 detik di jaringan seluler)', 'Ada sitemap dan robots.txt yang benar', 'URL ringkas dan deskriptif', 'Tidak ada konten ganda tanpa canonical'] },
    { g: 'On-page', items: ['Judul halaman unik dan memuat topik utama', 'Meta description menjelaskan isi halaman', 'Satu H1 dan hierarki heading rapi', 'Gambar punya teks alternatif yang bermakna', 'Tautan internal ke halaman terkait', 'Topik/kata kunci utama muncul alami di bagian awal'] },
    { g: 'Konten & kepercayaan', items: ['Isi menjawab maksud pencarian (intent) dengan tuntas', 'Konten orisinal, bukan salinan', 'Ada bukti pengalaman/keahlian (data, contoh, foto asli)', 'Penulis dan pengelola situs jelas', 'Klaim didukung sumber yang bisa dicek', 'Konten diperbarui dan tanggalnya jelas'] },
    { g: 'Kesiapan mesin AI (GEO)', items: ['Jawaban inti ada di kalimat awal, mudah dikutip', 'Ada bagian tanya-jawab (FAQ) yang nyata', 'Memakai markup terstruktur (schema) yang sesuai', 'Nama merek/entitas ditulis konsisten di seluruh situs', 'Merek disebut di sumber luar yang kredibel', 'Data/statistik disajikan dalam tabel atau daftar yang jelas'] }
  ];
  function seoUI(p) {
    const url = h('input', { type: 'text', placeholder: 'Halaman/situs yang diaudit, mis. https://…' }); const out = h('div');
    const state = {}; AUDIT.forEach(g => g.items.forEach((_, i) => { state[g.g + i] = h('input', { type: 'checkbox' }); }));
    p.append(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Audit manual berbasis daftar periksa: buka situsnya, periksa tiap butir, centang yang terpenuhi. Daftar ini alat bantu belajar, bukan standar resmi mesin pencari — tidak ada jaminan peringkat.'), VL.field('Objek audit', url),
      AUDIT.map(g => h('div', null, h('h3', null, g.g), g.items.map((t, i) => h('label', { class: 'fld', style: 'display:flex;gap:.4rem;align-items:flex-start' }, state[g.g + i], t)))),
      h('button', { class: 'btn primary', onclick: run }, 'Hitung skor')), out);
    function run() {
      out.innerHTML = ''; let ok = 0, tot = 0; const miss = [];
      const rows = AUDIT.map(g => { const c = g.items.filter((_, i) => state[g.g + i].checked).length; ok += c; tot += g.items.length; g.items.forEach((t, i) => { if (!state[g.g + i].checked) miss.push(g.g + ': ' + t); }); return { label: g.g, value: c / g.items.length }; });
      out.append(h('div', { class: 'card' }, h('div', { class: 'kpis' }, VL.kpi('Skor total', fmt.pct(ok / tot, 0), ok / tot >= 0.75 ? 'good' : ok / tot < 0.5 ? 'bad' : ''), VL.kpi('Terpenuhi', ok + ' / ' + tot)),
        VL.bars(rows, { fmt: v => fmt.pct(v, 0) }),
        miss.length ? h('div', null, h('h3', null, 'Belum terpenuhi (daftar perbaikan)'), h('ul', null, miss.map(m => h('li', null, m)))) : h('p', { class: 'ok' }, 'Semua butir terpenuhi.'),
        h('button', { class: 'btn primary', onclick: () => VL.saveToJournal({ module: 'funnel', title: 'Audit SEO/GEO: ' + (url.value.trim() || 'tanpa nama'), params: { objek: url.value.trim() }, result: { terpenuhi: ok, total: tot, belum: miss }, summary: 'Skor ' + fmt.pct(ok / tot, 0) + ' (' + ok + '/' + tot + '); ' + miss.length + ' butir perlu perbaikan.' }) }, 'Simpan ke Jurnal')));
    }
  }

  VL.register({
    id: 'funnel', icon: '🔻', title: 'Funnel Terbalik & Audit SEO',
    mk: ['Pemasaran Digital', 'Bisnis Digital'],
    desc: 'Hitung mundur dari target penjualan ke lalu lintas dan biaya iklan, lalu audit SEO/GEO sebuah situs dengan daftar periksa.',
    render(el) { VL.tabs(el, [{ label: 'Funnel terbalik', render: funnelUI }, { label: 'Audit SEO & GEO', render: seoUI }]); }
  });
})();
