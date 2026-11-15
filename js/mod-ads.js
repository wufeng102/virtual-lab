/* Modul 1 — Simulator Iklan Digital, Uji A/B, Ukuran Sampel */
(function () {
  'use strict';
  const { h, fmt } = VL;
  VL.sim = VL.sim || {};

  const CH = [
    { id: 'ig', nama: 'Instagram Ads',   cpm: 16000, ctr: 0.011, cvr: 0.014, sat: 1.7 },
    { id: 'tt', nama: 'TikTok Ads',      cpm: 9000,  ctr: 0.012, cvr: 0.010, sat: 1.5 },
    { id: 'gs', nama: 'Google Search',   cpm: 65000, ctr: 0.045, cvr: 0.032, sat: 1.3 },
    { id: 'fb', nama: 'Facebook Ads',    cpm: 12000, ctr: 0.010, cvr: 0.011, sat: 1.6 },
    { id: 'mp', nama: 'Marketplace Ads', cpm: 40000, ctr: 0.028, cvr: 0.028, sat: 1.4 }
  ];
  // Pengali [CTR, CVR] menurut sudut pesan. Mahasiswa diharapkan menemukan polanya lewat percobaan.
  const ANG = {
    ig: { emosional: [1.30, 1.00], rasional: [0.90, 1.10], promo: [1.10, 1.25] },
    tt: { emosional: [1.35, 0.95], rasional: [0.80, 1.05], promo: [1.15, 1.20] },
    gs: { emosional: [0.85, 0.90], rasional: [1.15, 1.15], promo: [1.05, 1.25] },
    fb: { emosional: [1.15, 1.00], rasional: [1.00, 1.10], promo: [1.10, 1.20] },
    mp: { emosional: [0.90, 0.95], rasional: [1.05, 1.10], promo: [1.20, 1.30] }
  };
  const PRESETS = {
    kopi:     { nama: 'Kopi susu botol (UMKM)', price: 25000,  margin: 11000, budget: 3000000, ltv: 2.4, aff: { ig: 1.1, tt: 1.3, gs: 0.7, fb: 0.9, mp: 1.0 } },
    fashion:  { nama: 'Busana muslim',          price: 185000, margin: 72000, budget: 5000000, ltv: 1.4, aff: { ig: 1.3, tt: 1.1, gs: 1.0, fb: 0.9, mp: 1.1 } },
    kosmetik: { nama: 'Kosmetik halal',         price: 120000, margin: 62000, budget: 5000000, ltv: 1.9, aff: { ig: 1.2, tt: 1.2, gs: 1.1, fb: 0.7, mp: 1.2 } }
  };
  const WEEKS = 4;

  /* Fungsi murni: satu minggu, satu saluran. Noise bergantung (seed, minggu, saluran) saja,
     sehingga mahasiswa dengan seed sama menghadapi "keberuntungan" yang sama. */
  function runChannel(preset, ch, spend, angle, week, state, seedKey) {
    const res = { id: ch.id, spend, imp: 0, clicks: 0, conv: 0, rev: 0, gp: 0 };
    if (spend <= 0) { state.last[ch.id] = null; state.streak[ch.id] = 0; return res; }
    const rnd = VL.rng(VL.hashSeed(seedKey + '|' + week + '|' + ch.id));
    const am = ANG[ch.id][angle];
    const streak = state.last[ch.id] === angle ? Math.min((state.streak[ch.id] || 0) + 1, 3) : 0;
    const learn = 1 + 0.04 * streak;                       // algoritma "belajar" bila pesan konsisten
    const ctr = ch.ctr * am[0] * learn;
    const priceF = Math.pow(85000 / preset.price, 0.25);
    const cvr = ch.cvr * am[1] * preset.aff[ch.id] * priceF;
    const satur = 1 + 0.8 * Math.pow(spend / (0.35 * preset.budget), 2) * (ch.sat - 1);  // belanja besar = lelang makin mahal
    const cpm = ch.cpm * satur * Math.exp(0.08 * VL.gauss(rnd));
    const imp = spend * 1000 / cpm;
    const clicks = Math.max(0, imp * ctr * Math.exp(0.06 * VL.gauss(rnd)));
    const mean = clicks * cvr;
    const conv = Math.max(0, Math.round(mean + Math.sqrt(mean) * VL.gauss(rnd)));
    state.last[ch.id] = angle; state.streak[ch.id] = streak;
    res.imp = Math.round(imp); res.clicks = Math.round(clicks); res.conv = conv;
    res.rev = conv * preset.price; res.gp = conv * preset.margin;
    return res;
  }
  VL.sim.ads = { CH, ANG, PRESETS, runChannel, WEEKS };

  function simUI(p) {
    const box = h('div'); p.append(box);
    let S = null;

    function setup() {
      box.innerHTML = '';
      const pre = VL.select(Object.entries(PRESETS).map(([k, v]) => [k, v.nama]), 'fashion');
      const seed = h('input', { type: 'text', value: VL.profile().nim || '', placeholder: 'mis. NIM Anda' });
      box.append(h('div', { class: 'card' },
        h('h3', null, 'Skenario'),
        h('p', null, 'Anda mengelola anggaran iklan selama ' + WEEKS + ' minggu untuk satu produk. Tiap minggu bagi anggaran ke lima saluran dan pilih sudut pesan. Hasil minggu lalu menjadi bahan keputusan minggu berikutnya.'),
        VL.field('Produk', pre),
        VL.field('Seed (kode acak)', seed, 'Seed sama = "keberuntungan" sama. Dosen dapat memberi satu seed untuk seluruh kelas agar hasil bisa dibandingkan secara adil.'),
        h('button', { class: 'btn primary', onclick: () => start(pre.value, seed.value.trim() || 'lab') }, 'Mulai simulasi')));
    }

    function start(key, seed) {
      const pr = PRESETS[key];
      S = { key, seed, pr, week: 1, state: { last: {}, streak: {} }, hist: [], plan: {} };
      CH.forEach(c => { S.plan[c.id] = { spend: Math.round(pr.budget / CH.length / 50000) * 50000, angle: 'rasional' }; });
      round();
    }

    function round() {
      box.innerHTML = '';
      const pr = S.pr;
      if (S.week > WEEKS) return summary();
      box.append(h('div', { class: 'card' },
        h('h3', null, pr.nama + ' — minggu ' + S.week + ' dari ' + WEEKS),
        h('p', { class: 'muted small' }, 'Harga ' + fmt.rp(pr.price) + ' · laba kotor per unit ' + fmt.rp(pr.margin) + ' (' + fmt.pct(pr.margin / pr.price, 0) + ') · titik impas ROAS = ' + fmt.n(pr.price / pr.margin, 2) + 'x · anggaran maksimal ' + fmt.rp(pr.budget) + '/minggu')));
      const rows = h('div', { class: 'card' });
      const ins = {};
      const total = h('p', { class: 'small' });
      const runBtn = h('button', { class: 'btn primary' }, 'Jalankan minggu ' + S.week);
      function upd() {
        const t = CH.reduce((s, c) => s + Math.max(0, VL.val(ins[c.id].s)), 0);
        total.innerHTML = '';
        total.append('Total dialokasikan: ', h('b', { class: t > pr.budget ? 'bad' : 'ok' }, fmt.rp(t)), ' dari ' + fmt.rp(pr.budget));
        runBtn.disabled = t > pr.budget || t <= 0;
      }
      CH.forEach(c => {
        const s = VL.numIn(S.plan[c.id].spend, { min: 0, step: 50000 });
        const a = VL.select([['emosional', 'Emosional'], ['rasional', 'Rasional'], ['promo', 'Promo/diskon']], S.plan[c.id].angle);
        s.addEventListener('input', upd);
        ins[c.id] = { s, a };
        rows.append(h('div', { class: 'cols' }, VL.field(c.nama + ' — biaya (Rp)', s), VL.field('Sudut pesan', a)));
      });
      rows.append(total);
      runBtn.addEventListener('click', () => {
        const wk = { week: S.week, res: [] };
        CH.forEach(c => {
          const spend = Math.max(0, VL.val(ins[c.id].s)), angle = ins[c.id].a.value;
          S.plan[c.id] = { spend, angle };
          wk.res.push(Object.assign(runChannel(pr, c, spend, angle, S.week, S.state, S.key + '|' + S.seed), { angle }));
        });
        S.hist.push(wk); S.week++; round();
      });
      box.append(rows, h('div', { class: 'row' }, runBtn, h('button', { class: 'btn ghost', onclick: setup }, 'Ulangi dari awal')));
      S.hist.forEach(w => box.append(weekCard(w)));
      upd();
    }

    function sum(res) {
      return res.reduce((a, r) => ({ spend: a.spend + r.spend, imp: a.imp + r.imp, clicks: a.clicks + r.clicks, conv: a.conv + r.conv, rev: a.rev + r.rev, gp: a.gp + r.gp }), { spend: 0, imp: 0, clicks: 0, conv: 0, rev: 0, gp: 0 });
    }
    function weekCard(w) {
      const t = sum(w.res);
      const rows = w.res.filter(r => r.spend > 0).map(r => {
        const c = CH.find(x => x.id === r.id);
        return [c.nama + ' (' + r.angle + ')', fmt.rp(r.spend), fmt.n(r.imp), fmt.n(r.clicks), fmt.pct(r.imp ? r.clicks / r.imp : NaN, 2), fmt.n(r.conv), fmt.rp(r.conv ? r.spend / r.conv : NaN), fmt.n(r.spend ? r.rev / r.spend : NaN, 2) + 'x', fmt.rp(r.gp - r.spend)];
      });
      rows.push({ total: true, cells: ['Total', fmt.rp(t.spend), fmt.n(t.imp), fmt.n(t.clicks), fmt.pct(t.imp ? t.clicks / t.imp : NaN, 2), fmt.n(t.conv), fmt.rp(t.conv ? t.spend / t.conv : NaN), fmt.n(t.spend ? t.rev / t.spend : NaN, 2) + 'x', fmt.rp(t.gp - t.spend)] });
      return h('div', { class: 'card' }, h('h3', null, 'Hasil minggu ' + w.week), VL.table(['Saluran', 'Biaya', 'Tayangan', 'Klik', 'CTR', 'Konversi', 'CPA', 'ROAS', 'Laba'], rows, { num: [1, 2, 3, 4, 5, 6, 7, 8] }));
    }

    function summary() {
      const pr = S.pr;
      const all = sum(S.hist.flatMap(w => w.res));
      const per = CH.map(c => { const rs = S.hist.map(w => w.res.find(r => r.id === c.id)); const a = sum(rs); return { c, a, profit: a.gp - a.spend, roas: a.spend ? a.rev / a.spend : NaN }; });
      const profit = all.gp - all.spend, ltvProfit = all.gp * pr.ltv - all.spend;
      const be = pr.price / pr.margin;
      const notes = [];
      per.filter(x => x.a.spend > 0 && x.roas < be).forEach(x => notes.push(x.c.nama + ': ROAS ' + fmt.n(x.roas, 2) + 'x di bawah titik impas ' + fmt.n(be, 2) + 'x — rugi pada pembelian pertama.'));
      const best = per.filter(x => x.a.spend > 0).sort((a, b) => b.profit - a.profit)[0];
      if (best) notes.push('Saluran paling menguntungkan: ' + best.c.nama + ' (laba ' + fmt.rp(best.profit) + ').');
      const used = per.filter(x => x.a.spend > 0).length;
      if (used >= 5) notes.push('Anda menyebar anggaran ke semua saluran. Apakah ada saluran yang seharusnya dihentikan lebih awal?');
      if (profit < 0 && ltvProfit > 0) notes.push('Rugi pada pembelian pertama tetapi positif bila pelanggan membeli ulang (asumsi ' + fmt.n(pr.ltv, 1) + ' pembelian per pelanggan). Ini contoh bahwa CAC harus dibaca bersama CLV.');
      box.append(h('div', { class: 'card' },
        h('h3', null, 'Ringkasan ' + WEEKS + ' minggu'),
        h('div', { class: 'kpis' },
          VL.kpi('Total biaya iklan', fmt.rp(all.spend)), VL.kpi('Pendapatan', fmt.rp(all.rev)),
          VL.kpi('ROAS', fmt.n(all.spend ? all.rev / all.spend : NaN, 2) + 'x', all.rev / all.spend >= be ? 'good' : 'bad'),
          VL.kpi('CAC (CPA)', fmt.rp(all.conv ? all.spend / all.conv : NaN)),
          VL.kpi('Laba (pembelian pertama)', fmt.rp(profit), profit >= 0 ? 'good' : 'bad'),
          VL.kpi('Laba dengan pembelian ulang', fmt.rp(ltvProfit), ltvProfit >= 0 ? 'good' : 'bad')),
        h('p', { class: 'muted small' }, 'Laba dihitung dari laba kotor per unit dikurangi biaya iklan. Biaya produksi lain, tenaga kerja, dan pajak tidak dihitung.'),
        h('h3', null, 'Laba per saluran'),
        VL.bars(per.filter(x => x.a.spend > 0).map(x => ({ label: x.c.nama, value: x.profit })), { fmt: fmt.rp }),
        h('h3', null, 'Bahan diskusi'),
        h('ul', null, notes.map(n => h('li', null, n)))));
      S.hist.forEach(w => box.append(weekCard(w)));
      const params = { produk: S.key, seed: S.seed, rencana: S.hist.map(w => ({ minggu: w.week, alokasi: w.res.map(r => ({ saluran: r.id, biaya: r.spend, pesan: r.angle })) })) };
      box.append(h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => VL.saveToJournal({ module: 'ads', title: 'Simulasi iklan: ' + pr.nama, params, result: { biaya: all.spend, pendapatan: all.rev, roas: all.rev / all.spend, cac: all.conv ? all.spend / all.conv : null, laba: profit, laba_ltv: ltvProfit }, summary: 'Seed ' + S.seed + ' · ROAS ' + fmt.n(all.rev / all.spend, 2) + 'x · laba ' + fmt.rp(profit) + ' · laba dengan pembelian ulang ' + fmt.rp(ltvProfit) + '.' }) }, 'Simpan ke Jurnal'),
        h('button', { class: 'btn', onclick: setup }, 'Main lagi')));
    }
    setup();
  }

  function abUI(p) {
    const nA = VL.numIn(5000, { min: 1 }), xA = VL.numIn(60, { min: 0 }), nB = VL.numIn(5000, { min: 1 }), xB = VL.numIn(82, { min: 0 });
    const metric = h('input', { type: 'text', value: 'CTR iklan' });
    const out = h('div');
    function run() {
      const a = VL.val(nA), b = VL.val(nB), ca = VL.val(xA), cb = VL.val(xB);
      out.innerHTML = '';
      if (a < 1 || b < 1 || ca > a || cb > b) { out.append(h('div', { class: 'card err' }, 'Periksa isian: jumlah sukses tidak boleh melebihi jumlah pengguna.')); return; }
      const r = VL.stat.twoProp(a, ca, b, cb);
      const sig = r.p < 0.05;
      const warn = [];
      if (Math.min(a, b) < 100 || Math.min(ca, cb) < 10) warn.push('Sampel/kejadian sangat sedikit: pendekatan normal kurang andal.');
      warn.push('Jangan berhenti di tengah percobaan hanya karena p sudah < 0,05 ("peeking" menggelembungkan kesalahan tipe I). Tetapkan ukuran sampel di muka.');
      out.append(h('div', { class: 'card' },
        h('div', { class: 'kpis' },
          VL.kpi(metric.value + ' A', fmt.pct(r.p1, 2)), VL.kpi(metric.value + ' B', fmt.pct(r.p2, 2)),
          VL.kpi('Selisih (B−A)', fmt.n(r.diff * 100, 2) + ' poin'), VL.kpi('Kenaikan relatif', fmt.pct(r.lift, 1)),
          VL.kpi('z', fmt.n(r.z, 2)), VL.kpi('p (dua arah)', fmt.p(r.p), sig ? 'good' : '')),
        h('p', null, 'Selang kepercayaan 95% untuk selisih: ' + fmt.n(r.lo * 100, 2) + ' s.d. ' + fmt.n(r.hi * 100, 2) + ' poin persentase.'),
        h('p', { class: sig ? 'ok' : 'warn' }, sig ? 'Perbedaan signifikan pada α = 0,05. Signifikan secara statistik tidak otomatis berarti penting secara bisnis — nilai selisih Rp-nya.' : 'Belum ada bukti cukup bahwa B berbeda dari A. Tidak signifikan ≠ sama: bisa jadi sampel terlalu kecil.'),
        h('ul', { class: 'small' }, warn.map(w => h('li', null, w))),
        h('button', { class: 'btn primary', onclick: () => VL.saveToJournal({ module: 'ads', title: 'Uji A/B: ' + metric.value, params: { nA: a, xA: ca, nB: b, xB: cb }, result: r, summary: 'A ' + fmt.pct(r.p1, 2) + ' vs B ' + fmt.pct(r.p2, 2) + ', z=' + fmt.n(r.z, 2) + ', p=' + fmt.p(r.p) + '.' }) }, 'Simpan ke Jurnal')));
    }
    p.append(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Uji dua proporsi (z-test) untuk membandingkan dua varian iklan, halaman, atau email.'),
      VL.field('Metrik', metric),
      h('div', { class: 'cols' }, VL.field('Varian A — jumlah pengguna/tayangan', nA), VL.field('Varian A — jumlah sukses (klik/beli)', xA), VL.field('Varian B — jumlah pengguna/tayangan', nB), VL.field('Varian B — jumlah sukses', xB)),
      h('button', { class: 'btn primary', onclick: run }, 'Hitung')), out);
    run();
  }

  function nUI(p) {
    const base = VL.numIn(2, { min: 0.01, step: 0.1 }), mde = VL.numIn(20, { min: 1, step: 1 });
    const al = VL.select([['0.05', '5%'], ['0.01', '1%'], ['0.10', '10%']], '0.05');
    const pw = VL.select([['0.8', '80%'], ['0.9', '90%']], '0.8');
    const out = h('div');
    const ZA = { '0.05': 1.95996, '0.01': 2.57583, '0.10': 1.64485 }, ZB = { '0.8': 0.84162, '0.9': 1.28155 };
    function run() {
      out.innerHTML = '';
      const p1 = VL.val(base) / 100, p2 = p1 * (1 + VL.val(mde) / 100);
      if (p1 <= 0 || p2 >= 1) { out.append(h('div', { class: 'card err' }, 'Nilai tidak valid.')); return; }
      const pb = (p1 + p2) / 2;
      const n = Math.ceil(Math.pow(ZA[al.value] * Math.sqrt(2 * pb * (1 - pb)) + ZB[pw.value] * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p2 - p1, 2));
      out.append(h('div', { class: 'card' },
        h('div', { class: 'kpis' }, VL.kpi('Per varian', fmt.n(n)), VL.kpi('Total (2 varian)', fmt.n(2 * n)), VL.kpi('Laju B yang terdeteksi', fmt.pct(p2, 2))),
        h('p', { class: 'muted small' }, 'Pendekatan normal untuk dua proporsi. Semakin kecil kenaikan yang ingin dideteksi, semakin besar sampel yang dibutuhkan (hampir kuadratik).'),
        h('button', { class: 'btn', onclick: () => VL.saveToJournal({ module: 'ads', title: 'Ukuran sampel uji A/B', params: { baseline: VL.val(base), mde: VL.val(mde), alpha: al.value, power: pw.value }, result: { n_per_varian: n }, summary: 'Perlu ' + fmt.n(n) + ' per varian untuk mendeteksi kenaikan relatif ' + VL.val(mde) + '% dari laju dasar ' + VL.val(base) + '%.' }) }, 'Simpan ke Jurnal')));
    }
    p.append(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Hitung berapa pengguna per varian yang dibutuhkan sebelum percobaan dimulai.'),
      h('div', { class: 'cols' }, VL.field('Laju dasar (%)', base, 'mis. CTR atau konversi saat ini'), VL.field('Kenaikan relatif minimal (%)', mde, 'efek terkecil yang masih bermakna bisnis'), VL.field('Tingkat signifikansi (α)', al), VL.field('Daya uji (power)', pw)),
      h('button', { class: 'btn primary', onclick: run }, 'Hitung')), out);
    run();
  }

  VL.register({
    id: 'ads', icon: '📣', title: 'Simulator Iklan Digital & Uji A/B',
    mk: ['Pemasaran Digital', 'Bisnis Digital'],
    desc: 'Alokasikan anggaran iklan 4 minggu ke 5 saluran, baca CTR/CPA/ROAS, lalu uji dua varian secara statistik.',
    render(el) { VL.tabs(el, [{ label: 'Simulasi 4 minggu', render: simUI }, { label: 'Uji A/B', render: abUI }, { label: 'Ukuran sampel', render: nUI }]); }
  });
})();
