/* Modul 2 — Simulasi STP & Bauran Pemasaran dengan pesaing reaktif */
(function () {
  'use strict';
  const { h, fmt } = VL;
  VL.sim = VL.sim || {};

  const SEG = [
    { id: 'mhs', nama: 'Mahasiswa hemat',          size: 3000, pw: 2.2, qw: 0.25, promo: 0.35, online: 0.7, pos: { harga: 1.0, kualitas: 0.1, praktis: 0.4, halal: 0.3 } },
    { id: 'pkj', nama: 'Pekerja muda urban',       size: 2500, pw: 1.0, qw: 0.35, promo: 0.25, online: 0.8, pos: { harga: 0.2, kualitas: 0.4, praktis: 1.0, halal: 0.3 } },
    { id: 'klg', nama: 'Keluarga muda',            size: 2800, pw: 1.4, qw: 0.30, promo: 0.30, online: 0.4, pos: { harga: 0.4, kualitas: 0.3, praktis: 0.3, halal: 1.0 } },
    { id: 'prm', nama: 'Pencari kualitas premium', size: 900, pw: 0.45, qw: 0.55, promo: 0.15, online: 0.6, pos: { harga: 0.0, kualitas: 1.0, praktis: 0.2, halal: 0.5 } }
  ];
  const POS = { harga: 'Harga terjangkau', kualitas: 'Kualitas unggul', praktis: 'Praktis & cepat', halal: 'Halal & sehat' };
  const CHAN = { online: 'Online saja', offline: 'Toko/offline saja', both: 'Online + offline' };
  const CHFIX = { online: 1500000, offline: 3000000, both: 4000000 };
  const MONTHS = 6, FREQ = 4, OPS = 2000000, U0 = 0.0;

  const EVENTS = {
    3: { teks: 'Harga bahan baku naik 15%: biaya produksi per unit ikut naik bulan ini dan seterusnya.', costMult: 1.15 },
    5: { teks: 'Tren hidup sehat menguat: daya tarik klaim "Halal & sehat" naik di semua segmen.', halalBoost: 0.4 }
  };

  function utility(seg, p, targeted, nT, ctx) {
    const reachPromo = (p.promo / Math.max(1, nT)) * (targeted ? 1 : 0.2);
    const fit = p.chan === 'both' ? 0.85 : p.chan === 'online' ? seg.online : 1 - seg.online;
    const posPref = seg.pos[p.position] + (p.position === 'halal' ? (ctx.halalBoost || 0) : 0);
    const posEff = 1.2 * posPref * (targeted ? 1 : 0.4) * (p.posFactor == null ? 1 : p.posFactor);
    return seg.qw * p.q - seg.pw * (p.price / 10000) + seg.promo * Math.log(1 + reachPromo / 1e6) + 1.2 * fit + posEff;
  }

  /* Fungsi murni — dapat diuji terpisah. */
  function simulate(dec, comps, ctx) {
    ctx = ctx || {};
    const nT = dec.targets.length;
    const me = { price: dec.price, q: dec.q, promo: dec.promo, chan: dec.chan, position: dec.position, posFactor: ctx.posFactor };
    const unitCost = (4000 + 2000 * dec.q) * (ctx.costMult || 1);
    let units = 0; const per = [];
    SEG.forEach(s => {
      const t = dec.targets.includes(s.id);
      const eu = Math.exp(utility(s, me, t, nT, ctx));
      const ec = comps.map(c => Math.exp(utility(s, c, true, 4, ctx) * 0.9));   // pesaing menyasar luas, efek per segmen lebih lemah
      const e0 = Math.exp(U0);
      const share = eu / (eu + ec.reduce((a, b) => a + b, 0) + e0);
      const u = Math.round(s.size * FREQ * share);
      units += u; per.push({ id: s.id, nama: s.nama, targeted: t, share, units: u });
    });
    const market = SEG.reduce((a, s) => a + s.size * FREQ, 0);
    const rev = units * dec.price;
    const varCost = units * unitCost;
    const fixed = OPS + CHFIX[dec.chan] + dec.promo;
    return { units, rev, varCost, fixed, profit: rev - varCost - fixed, share: units / market, per, unitCost, market };
  }
  VL.sim.market = { SEG, simulate, MONTHS };

  function render(el) {
    const box = h('div'); el.append(box);
    let S = null;

    function setup() {
      S = null; box.innerHTML = '';
      box.append(h('div', { class: 'card' },
        h('h3', null, 'Skenario'),
        h('p', null, 'Anda meluncurkan produk makanan/minuman kemasan halal di kota yang sama dengan dua pesaing: Merek A (murah, kualitas 4) dan Merek B (premium, kualitas 8). Pasar terdiri atas empat segmen dengan kepekaan harga, kualitas, promosi, dan saluran yang berbeda. Anda mengambil keputusan STP dan bauran pemasaran selama ' + MONTHS + ' bulan; pesaing bereaksi, dan ada kejadian yang mengubah situasi.'),
        h('p', { class: 'muted small' }, 'Ukuran pasar: ' + fmt.n(SEG.reduce((a, s) => a + s.size, 0)) + ' calon pembeli, rata-rata ' + FREQ + ' pembelian/bulan.'),
        h('button', { class: 'btn primary', onclick: start }, 'Mulai')));
    }

    function start() {
      S = { m: 1, hist: [], ctx: { costMult: 1, halalBoost: 0 }, prevPos: null,
        comps: [{ nama: 'Merek A', price: 12000, q: 4, promo: 2000000, chan: 'both', position: 'harga' }, { nama: 'Merek B', price: 35000, q: 8, promo: 3000000, chan: 'online', position: 'kualitas' }],
        dec: { targets: ['mhs'], price: 15000, q: 5, promo: 1000000, chan: 'online', position: 'harga' }, log: [] };
      round();
    }

    function round() {
      box.innerHTML = '';
      if (S.m > MONTHS) return summary();
      const ev = EVENTS[S.m];
      if (ev) { if (ev.costMult) S.ctx.costMult *= ev.costMult; if (ev.halalBoost) S.ctx.halalBoost = ev.halalBoost; }
      box.append(h('div', { class: 'card' },
        h('h3', null, 'Bulan ' + S.m + ' dari ' + MONTHS),
        ev ? h('p', { class: 'warn' }, '⚠ ' + ev.teks) : null,
        h('p', { class: 'muted small' }, 'Pesaing saat ini — A: ' + fmt.rp(S.comps[0].price) + ', kualitas ' + S.comps[0].q + ' · B: ' + fmt.rp(S.comps[1].price) + ', kualitas ' + S.comps[1].q + '. Biaya produksi per unit Anda: ' + fmt.rp((4000 + 2000 * S.dec.q) * S.ctx.costMult) + ' (kualitas ' + S.dec.q + ').')));
      const d = S.dec;
      const tg = SEG.map(s => { const c = h('input', { type: 'checkbox' }); c.checked = d.targets.includes(s.id); return { s, c }; });
      const price = VL.numIn(d.price, { min: 5000, max: 100000, step: 500 }), q = VL.numIn(d.q, { min: 1, max: 10, step: 1 });
      const promo = VL.numIn(d.promo, { min: 0, step: 250000 });
      const chan = VL.select(Object.entries(CHAN), d.chan), pos = VL.select(Object.entries(POS), d.position);
      box.append(h('div', { class: 'card' },
        h('h3', null, 'Keputusan Anda'),
        h('div', { class: 'lbl' }, 'Segmen target (STP)'),
        h('div', { class: 'row' }, tg.map(({ s, c }) => h('label', { class: 'chip' }, c, s.nama + ' (' + fmt.n(s.size) + ')'))),
        h('div', { class: 'cols' }, VL.field('Harga (Rp)', price), VL.field('Kualitas (1–10)', q, 'Kualitas lebih tinggi menaikkan biaya produksi'), VL.field('Anggaran promosi bulan ini (Rp)', promo, 'Dibagi rata ke segmen target'), VL.field('Saluran distribusi', chan, 'Biaya tetap: online ' + fmt.rp(CHFIX.online) + ', offline ' + fmt.rp(CHFIX.offline) + ', keduanya ' + fmt.rp(CHFIX.both)), VL.field('Klaim positioning', pos, 'Mengganti klaim dari bulan lalu mengurangi efeknya bulan ini (kepercayaan merek)')),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', onclick: () => {
            const targets = tg.filter(x => x.c.checked).map(x => x.s.id);
            if (!targets.length) { VL.toast('Pilih minimal satu segmen target'); return; }
            const nd = { targets, price: Math.min(100000, Math.max(5000, VL.val(price))), q: Math.min(10, Math.max(1, Math.round(VL.val(q)))), promo: Math.max(0, VL.val(promo)), chan: chan.value, position: pos.value };
            const posFactor = S.prevPos && S.prevPos !== nd.position ? 0.6 : 1;
            const r = simulate(nd, S.comps, Object.assign({}, S.ctx, { posFactor }));
            const moves = react(r, nd);
            S.hist.push({ m: S.m, dec: nd, r, moves, posChanged: posFactor < 1 });
            S.dec = nd; S.prevPos = nd.position; S.m++; round();
          } }, 'Jalankan bulan ' + S.m),
          h('button', { class: 'btn ghost', onclick: setup }, 'Ulangi dari awal'))));
      S.hist.slice().reverse().forEach(monthCard);
    }

    function react(r, nd) {
      const A = S.comps[0], B = S.comps[1], mv = [];
      if (r.share > 0.28) { const np = Math.max(8000, Math.round(A.price * 0.95 / 500) * 500); if (np < A.price) { mv.push('Merek A menurunkan harga ke ' + fmt.rp(np) + ' karena pangsa Anda ' + fmt.pct(r.share, 0) + '.'); A.price = np; } }
      if (nd.price < A.price - 2000) { A.price = Math.max(8000, A.price - 1000); mv.push('Merek A mencocokkan harga murah Anda: kini ' + fmt.rp(A.price) + '.'); }
      if (nd.q >= B.q - 1 && nd.price > 25000) { B.promo = Math.round(B.promo * 1.2); mv.push('Merek B menaikkan promosi 20% karena Anda masuk ke wilayah premium.'); }
      if (!mv.length) mv.push('Pesaing belum mengubah strategi.');
      return mv;
    }

    function monthCard(x) {
      const r = x.r;
      return h('div', { class: 'card' }, h('h3', null, 'Hasil bulan ' + x.m),
        h('div', { class: 'kpis' }, VL.kpi('Unit terjual', fmt.n(r.units)), VL.kpi('Pangsa pasar', fmt.pct(r.share, 1)), VL.kpi('Pendapatan', fmt.rp(r.rev)), VL.kpi('Biaya (variabel + tetap)', fmt.rp(r.varCost + r.fixed)), VL.kpi('Laba', fmt.rp(r.profit), r.profit >= 0 ? 'good' : 'bad')),
        x.posChanged ? h('p', { class: 'warn small' }, 'Klaim positioning berubah dari bulan lalu — efeknya dipotong 40% bulan ini.') : null,
        VL.table(['Segmen', 'Target?', 'Pangsa di segmen', 'Unit'], r.per.map(s => [s.nama, s.targeted ? 'Ya' : '—', fmt.pct(s.share, 1), fmt.n(s.units)]), { num: [2, 3] }),
        h('p', { class: 'small' }, h('b', null, 'Reaksi pesaing: '), x.moves.join(' ')));
    }

    function summary() {
      const tot = S.hist.reduce((a, x) => ({ rev: a.rev + x.r.rev, profit: a.profit + x.r.profit, units: a.units + x.r.units }), { rev: 0, profit: 0, units: 0 });
      const avgShare = S.hist.reduce((a, x) => a + x.r.share, 0) / S.hist.length;
      const bySeg = SEG.map(s => ({ label: s.nama, value: S.hist.reduce((a, x) => a + x.r.per.find(p => p.id === s.id).units, 0) }));
      const notes = [];
      const nonTarget = bySeg.map((b, i) => ({ b, s: SEG[i] })).filter(({ b, s }) => b.value > 0 && !S.hist.some(x => x.dec.targets.includes(s.id)));
      if (nonTarget.length) notes.push('Anda tetap menjual ke segmen yang tidak ditargetkan (' + nonTarget.map(x => x.s.nama).join(', ') + '). Apakah itu peluang yang layak dikejar atau kebocoran fokus?');
      const changes = S.hist.filter(x => x.posChanged).length;
      if (changes) notes.push('Anda mengganti klaim positioning ' + changes + ' kali. Apa biayanya terhadap konsistensi merek?');
      if (S.hist.some(x => x.r.profit < 0)) notes.push('Ada bulan rugi. Telusuri: apakah masalahnya harga, biaya tetap saluran, atau promosi yang tidak sebanding dengan penjualan?');
      if (S.hist.slice(-1)[0].dec.price <= S.hist.slice(-1)[0].r.unitCost * 1.1) notes.push('Harga akhir hanya sedikit di atas biaya per unit — margin tipis rentan terhadap kenaikan bahan baku.');
      box.append(h('div', { class: 'card' }, h('h3', null, 'Ringkasan ' + MONTHS + ' bulan'),
        h('div', { class: 'kpis' }, VL.kpi('Total pendapatan', fmt.rp(tot.rev)), VL.kpi('Total laba', fmt.rp(tot.profit), tot.profit >= 0 ? 'good' : 'bad'), VL.kpi('Total unit', fmt.n(tot.units)), VL.kpi('Rata-rata pangsa', fmt.pct(avgShare, 1))),
        h('h3', null, 'Laba per bulan'), VL.bars(S.hist.map(x => ({ label: 'Bulan ' + x.m, value: x.r.profit })), { fmt: fmt.rp }),
        h('h3', null, 'Unit per segmen (akumulasi)'), VL.bars(bySeg),
        h('h3', null, 'Bahan diskusi'), h('ul', null, notes.length ? notes.map(n => h('li', null, n)) : h('li', null, 'Bandingkan strategi Anda dengan teman: segmen mana yang paling menguntungkan dan mengapa?'))));
      S.hist.slice().reverse().forEach(monthCard);
      box.append(h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => VL.saveToJournal({ module: 'market', title: 'Simulasi STP & bauran pemasaran', params: { keputusan: S.hist.map(x => Object.assign({ bulan: x.m }, x.dec)) }, result: { pendapatan: tot.rev, laba: tot.profit, unit: tot.units, pangsa_rata2: avgShare }, summary: 'Laba total ' + fmt.rp(tot.profit) + ', pangsa rata-rata ' + fmt.pct(avgShare, 1) + ', target akhir: ' + S.hist.slice(-1)[0].dec.targets.join('+') + '.' }) }, 'Simpan ke Jurnal'),
        h('button', { class: 'btn', onclick: setup }, 'Main lagi')));
    }
    setup();
  }

  VL.register({
    id: 'market', icon: '🎯', title: 'Simulasi STP & Bauran Pemasaran',
    mk: ['Strategi Pemasaran', 'Manajemen Pemasaran'],
    desc: 'Pilih segmen, harga, kualitas, promosi, saluran, dan positioning selama 6 bulan melawan pesaing yang bereaksi.',
    render
  });
})();
