/* Jalur Skill: peta skill berurutan, misi (kuis, kasus, role-play), hasil penilaian */
(function () {
  'use strict';
  const { h } = VL;
  const SK = window.VL_SKILLS || [];
  const S = VL.skills = { state: null };
  const skillDef = id => SK.find(s => s.id === id);
  const KIND = { quiz: '📝 Kuis', task: '🧩 Studi kasus', roleplay: '🎭 Role-play AI', meeting: '👥 Simulasi rapat AI' };
  let cache = null;

  S.load = async function (force) {
    if (cache && !force) return cache;
    const r = await VL.api.call('skills_state'); if (r.ok) cache = r; return r;
  };
  S.invalidate = () => { cache = null; };

  async function aiCall(action, data) {
    const G = VL.gemini;
    if (!G) return { ok: false, error: 'Modul AI tidak tersedia.' };
    if (!(await G.ensureKey())) return { ok: false, code: 'gkey', error: 'Penilaian dibatalkan karena kunci API Gemini belum diisi.' };
    let model; try { model = await G.pickModel(); } catch (e) { return { ok: false, code: 'gkey', error: e.message + ' Tekan "Ganti kunci" lalu coba lagi.' }; }
    return VL.api.call(action, Object.assign({ gkey: G.key(), model: model }, data));
  }
  const keyNotice = () => {
    const G = VL.gemini, box = h('div', { class: 'card note small' });
    function draw() {
      box.innerHTML = '';
      box.append('Penilaian memakai kunci Gemini Anda sendiri. Kunci diminta saat Anda menekan tombol nilai, dikirim lewat server dosen ke Google untuk satu panggilan, lalu dibuang (tidak disimpan/dicatat). ',
        G && G.hasKey() ? 'Kunci terdeteksi di perangkat ini. ' : 'Belum ada kunci; akan diminta saat Anda menilai. ',
        G ? h('a', { href: '#', onclick: async e => { e.preventDefault(); await G.ensureKey(true, 'Masukkan kunci baru untuk mengganti kunci yang ada.'); draw(); } }, 'Ganti kunci') : null);
    }
    draw(); return box;
  };

  /* ---------- Peta skill (beranda) ---------- */
  S.home = async function (view) {
    const u = VL.api.user();
    view.append(h('section', { class: 'card hero' }, h('h1', null, 'Jalur Skill Pemasaran'),
      h('p', { class: 'muted' }, 'Sepuluh skill yang dicari di dunia kerja, dari pemasaran konvensional sampai digital, sebagian disusun mengikuti Unit Kompetensi SKKNI Pemasaran. Selesaikan satu skill (kuis → studi kasus → praktik) untuk membuka berikutnya dan memperoleh e-sertifikat.')));
    const box = h('div', null, h('div', { class: 'card' }, 'Memuat jalur skill…')); view.append(box);
    const st = await S.load(true);
    box.innerHTML = '';
    if (!st.ok) { box.append(h('div', { class: 'card err' }, st.error || 'Gagal memuat.')); return; }
    const done = st.skills.filter(s => s.status === 'done').length;
    box.append(h('div', { class: 'kpis' }, VL.kpi('Skill selesai', done + '/' + SK.length, done ? 'good' : ''), VL.kpi('Sertifikat', st.certs.filter(c => c.status === 'valid').length + (st.certs.some(c => c.status === 'menunggu') ? ' (+' + st.certs.filter(c => c.status === 'menunggu').length + ' menunggu)' : '')), VL.kpi('Misi lulus', st.skills.reduce((a, s) => a + s.missions.filter(m => m.status === 'done').length, 0) + '/' + SK.reduce((a, s) => a + s.missions.length, 0))));
    const grid = h('div', { class: 'path' });
    SK.forEach((s, i) => {
      const t = st.skills[i], locked = t.status === 'locked';
      const dots = h('span', { class: 'dots' }, t.missions.map(m => h('i', { class: 'dot ' + m.status }, m.status === 'done' ? '✓' : '')));
      const prev = SK[i - 1];
      grid.append(h('a', { class: 'skill ' + t.status, href: locked ? 'javascript:void(0)' : '#/skill/' + s.id, onclick: locked ? () => VL.toast('Selesaikan "' + prev.title + '" lebih dulu') : null },
        h('span', { class: 'no' }, locked ? '🔒' : (t.cert_status === 'menunggu' ? '⏳' : t.cert_status === 'ditolak' ? '⚠️' : t.status === 'done' ? '🎓' : s.icon)),
        h('div', { class: 'body' }, h('b', null, (i + 1) + '. ' + s.title), h('span', { class: 'muted small' }, s.summary), dots,
          h('div', { class: 'tags' }, s.skkni.slice(0, 2).map(k => h('span', { class: 'tag' }, k.code))))));
    });
    box.append(grid);
    box.append(h('div', { class: 'card note small' }, 'Catatan: nomor unit di atas diambil dari SKKNI Kategori Jasa Profesional, Ilmiah, dan Teknis — Konsultasi Manajemen, Area Kerja Pemasaran (Kepmenakertrans No. 389 Tahun 2013). Sertifikat Lab menyatakan penyelesaian latihan yang selaras dengan unit tersebut; ini BUKAN sertifikat kompetensi BNSP.'));
  };

  /* ---------- Detail satu skill ---------- */
  S.skill = async function (view, id) {
    const s = skillDef(id); if (!s) { view.append(h('div', { class: 'card err' }, 'Skill tidak ditemukan.')); return; }
    view.append(h('p', null, h('a', { href: '#/' }, '← Jalur Skill')), h('h1', null, s.icon + ' ' + s.title), h('p', { class: 'muted' }, s.summary));
    const box = h('div'); view.append(box);
    const st = await S.load(true); if (!st.ok) { box.append(h('div', { class: 'card err' }, st.error)); return; }
    const t = st.skills[SK.indexOf(s)];
    if (t.status === 'locked') { box.append(h('div', { class: 'card note' }, '🔒 Skill ini terkunci. Selesaikan skill sebelumnya dan peroleh sertifikatnya.')); return; }
    box.append(h('div', { class: 'card' }, h('h3', null, 'Mengapa penting di dunia kerja'), h('p', null, s.workplace),
      h('h3', null, 'Unit Kompetensi SKKNI terkait'), (s.skkni.length ? h('ul', null, s.skkni.map(k => h('li', null, h('code', null, k.code), ' ' + k.title))) : h('p', { class: 'muted small' }, 'Skill kekinian yang belum ada unit setaranya di SKKNI Pemasaran 2013. Dinilai memakai rubrik Lab.'))));
    s.missions.forEach((m, i) => {
      const tm = t.missions[i], locked = tm.status === 'locked';
      box.append(h('a', { class: 'card mission ' + tm.status, href: locked ? 'javascript:void(0)' : '#/misi/' + s.id + '/' + m.id, onclick: locked ? () => VL.toast('Selesaikan misi sebelumnya dulu') : null },
        h('div', { class: 'row', style: 'margin:0;justify-content:space-between' }, h('b', null, (i + 1) + '. ' + m.title), h('span', { class: 'pill st-' + (tm.status === 'done' ? 'approved' : tm.status === 'open' ? 'pending' : 'rejected') }, tm.status === 'done' ? 'lulus ' + tm.best : tm.status === 'open' ? 'terbuka' : 'terkunci')),
        h('div', { class: 'muted small' }, KIND[m.kind] + ' · ± ' + m.est + (tm.tries ? ' · ' + tm.tries + ' percobaan' : ''))));
    });
    if (t.cert) box.append(h('div', { class: 'card verified' }, h('h3', null, '🎓 Skill selesai'), h('p', null, 'Sertifikat Anda sudah disetujui dan terbit.'), h('a', { class: 'btn primary', href: '#/sertifikat/' + t.cert }, 'Buka sertifikat')));
    else if (t.cert_status === 'menunggu') box.append(h('div', { class: 'card note' }, h('h3', null, '⏳ Menunggu persetujuan dosen'), h('p', null, 'Semua misi pada skill ini sudah lulus. Sertifikat terbit setelah dosen memeriksa hasil Anda. Anda tetap dapat melanjutkan ke skill berikutnya.')));
    else if (t.cert_status === 'ditolak') box.append(h('div', { class: 'card err' }, h('h3', null, 'Sertifikat belum disetujui'), h('p', null, t.cert_note || 'Hubungi dosen untuk keterangan lebih lanjut.')));
  };

  /* ---------- Render materi ---------- */
  function material(m) {
    const card = h('div', { class: 'card mat' }, h('h3', null, m.title));
    if (m.type === 'text') card.append(h('div', { style: 'white-space:pre-wrap' }, m.body));
    else if (m.type === 'table') { card.append(h('div', { class: 'scrollx' }, VL.table(m.head, m.rows))); if (m.note) card.append(h('p', { class: 'muted small' }, m.note)); }
    else if (m.type === 'svg') { const w = h('div', { class: 'svgwrap' }); w.innerHTML = m.svg; card.append(w); if (m.caption) card.append(h('p', { class: 'muted small' }, m.caption)); }
    else if (m.type === 'bars') { const mx = Math.max.apply(null, m.items.map(i => i.value)); m.items.forEach(i => card.append(h('div', { class: 'barrow' }, h('span', null, i.label), h('div', { class: 'track' }, h('div', { class: 'fill', style: 'width:' + (i.value / mx * 100) + '%' })), h('span', null, i.value + ' ' + (m.unit || ''))))); }
    else if (m.type === 'chat') m.msgs.forEach(x => card.append(h('div', { class: 'bub ' + (x.from === 'them' ? 'ai' : 'me') }, x.text)));
    else if (m.type === 'video') card.append(videoPlayer(m));
    return card;
  }

  function retentionChart(pts) {
    const W = 320, Hh = 120, p = 22, X = t => p + t / 15 * (W - p * 2), Y = v => Hh - 20 - v / 100 * (Hh - 34);
    const path = pts.map((q, i) => (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join(' ');
    const grid = [0, 25, 50, 75, 100].map(v => '<line x1="' + p + '" x2="' + (W - p) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#8884" stroke-width="1"/><text x="2" y="' + (Y(v) + 3) + '" font-size="9" fill="#888">' + v + '%</text>').join('');
    const xs = [0, 3, 6, 9, 12, 15].map(t => '<text x="' + X(t) + '" y="' + (Hh - 5) + '" font-size="9" fill="#888" text-anchor="middle">' + t + 'd</text>').join('');
    const el = h('div'); el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Kurva retensi penonton">' + grid + xs + '<path d="' + path + '" fill="none" stroke="#e76f51" stroke-width="2.5"/><line id="ph" x1="' + X(0) + '" x2="' + X(0) + '" y1="8" y2="' + (Hh - 20) + '" stroke="#0f766e" stroke-width="2"/></svg>';
    el.X = X; return el;
  }
  function videoPlayer(m) {
    const wrap = h('div', { class: 'video' }), stage = h('div', { class: 'vstage' }), cap = h('div', { class: 'vcap' }), vo = h('div', { class: 'vvo muted small' }), time = h('span', { class: 'small' }, '0.0 / 15 dtk');
    const chart = retentionChart(m.retention), ph = chart.querySelector('#ph'); let t = 0, timer = null, cur = -1;
    function show(tt) {
      const i = Math.max(0, m.scenes.findIndex(s => tt >= s.t0 && tt < s.t1)); const idx = tt >= 15 ? m.scenes.length - 1 : i;
      if (idx !== cur) { cur = idx; stage.innerHTML = m.scenes[idx].svg; cap.textContent = m.scenes[idx].t0 + '–' + m.scenes[idx].t1 + ' dtk · ' + m.scenes[idx].caption; vo.textContent = 'Suara: ' + m.scenes[idx].voice; }
      const x = chart.X(Math.min(15, tt)); ph.setAttribute('x1', x); ph.setAttribute('x2', x); time.textContent = Math.min(15, tt).toFixed(1) + ' / 15 dtk';
    }
    const play = h('button', { class: 'btn small primary' }, '▶ Putar');
    function stop() { clearInterval(timer); timer = null; play.textContent = '▶ Putar'; }
    play.addEventListener('click', () => { if (timer) { stop(); return; } if (t >= 15) t = 0; play.textContent = '⏸ Jeda'; timer = setInterval(() => { t = Math.min(15, t + 0.1); show(t); if (t >= 15) stop(); }, 100); });
    const reset = h('button', { class: 'btn small', onclick: () => { stop(); t = 0; show(0); } }, '⏮ Ulang');
    wrap.append(stage, cap, vo, h('div', { class: 'row' }, play, reset, time), h('div', { class: 'muted small' }, 'Kurva: persentase penonton yang masih menonton tiap detik'), chart); show(0);
    return wrap;
  }

  /* ---------- Layar misi: sesi terjaga ---------- */
  const WHY = { left: 'Anda meninggalkan aplikasi atau berpindah tab/jendela.', nav: 'Anda berpindah halaman di tengah sesi.', gap: 'Aplikasi tidak aktif cukup lama.', timeout: 'Waktu sesi habis (90 menit).', voided: 'Sesi dibatalkan oleh server.', nosess: 'Sesi tidak ditemukan.' };

  /* Penjaga sesi: deteksi keluar aplikasi/tab/jendela, denyut ke server, blok tempel/salin. */
  function guard(sess, root, onVoid) {
    let alive = true, timer = null, lastTick = Date.now();
    const stopCopy = e => { e.preventDefault(); };
    const evs = [['copy', stopCopy], ['cut', stopCopy], ['paste', e => { e.preventDefault(); VL.toast('Tempel dinonaktifkan selama sesi. Ketik jawaban Anda sendiri.'); }], ['contextmenu', stopCopy], ['dragstart', stopCopy], ['drop', stopCopy]];
    evs.forEach(x => root.addEventListener(x[0], x[1]));
    function lose(why) {
      if (!alive) return; alive = false; cleanup();
      VL.api.call('sess_void', { sid: sess.sid, reason: why === 'nav' ? 'nav' : 'left' });
      onVoid(why);
    }
    const onVis = () => { if (document.hidden) lose('left'); };
    const onBlur = () => { setTimeout(() => { if (alive && !document.hasFocus()) lose('left'); }, 350); };
    const onHide = () => lose('left'), onHash = () => lose('nav');
    document.addEventListener('visibilitychange', onVis); window.addEventListener('blur', onBlur); window.addEventListener('pagehide', onHide); window.addEventListener('hashchange', onHash);
    timer = setInterval(async () => {
      const now = Date.now(), late = now - lastTick > sess.beatMs * 2.5; lastTick = now;
      if (late) { lose('gap'); return; }               // perangkat/tab sempat dibekukan
      const r = await VL.api.call('sess_beat', { sid: sess.sid });
      if (alive && r.ok && r.alive === false) lose(r.reason || 'gap');
    }, sess.beatMs);
    function cleanup() {
      clearInterval(timer); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onBlur); window.removeEventListener('pagehide', onHide); window.removeEventListener('hashchange', onHash);
      evs.forEach(x => root.removeEventListener(x[0], x[1]));
    }
    return { stop() { alive = false; cleanup(); }, isAlive: () => alive };
  }

  S.mission = async function (view, sid, mid) {
    const s = skillDef(sid), m = s && s.missions.find(x => x.id === mid);
    if (!m) { view.append(h('div', { class: 'card err' }, 'Misi tidak ditemukan.')); return; }
    const st = await S.load(true); if (!st.ok) { view.append(h('div', { class: 'card err' }, st.error)); return; }
    const t = st.skills[SK.indexOf(s)], tm = t.missions[s.missions.indexOf(m)];
    view.append(h('p', null, h('a', { href: '#/skill/' + sid }, '← ' + s.title)), h('h1', null, m.title), h('p', { class: 'muted' }, KIND[m.kind] + ' · ± ' + m.est), h('p', null, m.brief));
    if (tm.status === 'locked') { view.append(h('div', { class: 'card note' }, '🔒 Misi ini belum terbuka.')); return; }
    if (tm.status === 'done') view.append(h('div', { class: 'card verified small' }, 'Misi ini sudah lulus (skor terbaik ' + tm.best + '). Anda boleh mengulang untuk latihan; skor terbaik tetap tercatat.'));
    const body = h('div', { class: 'secure' }); view.append(body);
    const lim = { quiz: 3, task: 6, roleplay: 4, meeting: 4 }[m.kind];
    function pre(msg) {
      body.innerHTML = '';
      if (msg) body.append(h('div', { class: 'card err' }, msg));
      const go = h('button', { class: 'btn primary' }, '▶ Mulai sesi');
      body.append(h('div', { class: 'card' }, h('h3', null, '🔒 Sesi terjaga'),
        h('ul', { class: 'small' },
          h('li', null, 'Kasus/soal baru ditampilkan hanya setelah Anda menekan tombol mulai' + (m.gen ? '; data kasus dibuat baru setiap sesi.' : '.')),
          h('li', null, h('b', null, 'Jangan pindah aplikasi, tab, atau jendela.'), ' Bila Anda keluar, sesi langsung batal dan Anda harus mengulang dari awal dengan kasus/data yang berbeda.'),
          h('li', null, 'Fitur tempel dan salin dinonaktifkan. Ketik jawaban Anda sendiri.'),
          h('li', null, 'Maksimal 90 menit per sesi. Batal 3 kali: tunggu sekitar 6 jam.'),
          h('li', null, 'Percobaan hari ini: ' + tm.tries_today + '/' + lim + '.')),
        m.kind !== 'quiz' ? keyNotice() : null, h('div', { class: 'row' }, go)));
      go.addEventListener('click', async () => {
        go.disabled = true; go.textContent = m.gen ? 'AI menyiapkan kasus…' : 'Menyiapkan sesi…';
        let r;
        if (m.kind === 'quiz') r = await VL.api.call('sess_start', { skill: s.id, mission: m.id });
        else r = await aiCall('sess_start', { skill: s.id, mission: m.id });
        if (!r.ok) { go.disabled = false; go.textContent = '▶ Mulai sesi'; VL.toast(r.error); if (r.code === 'limit') pre(r.error); return; }
        run(r);
      });
    }
    function run(sess) {
      body.innerHTML = '';
      const g = guard(sess, body, why => {
        body.innerHTML = '';
        body.append(h('div', { class: 'card err' }, h('h3', null, '⛔ Sesi dibatalkan'), h('p', null, WHY[why] || 'Sesi berakhir.'), h('p', null, 'Untuk menjaga keadilan, Anda harus mengulang dari awal. Kasus dan data akan berbeda.'), h('button', { class: 'btn primary', onclick: () => pre() }, 'Mulai ulang sesi')));
      });
      body.append(h('div', { class: 'card note small' }, '🔒 Sesi berlangsung. Tetap di halaman ini sampai selesai.'));
      const ctx = { s: s, m: m, tm: tm, sess: sess, g: g, retry: msg => { g.stop(); pre(msg); } };
      if (m.kind === 'quiz') quizView(body, ctx); else if (m.kind === 'task') taskView(body, ctx); else chatView(body, ctx);
    }
    pre();
  };

  function afterResult(body, s, m, r) {
    S.invalidate();
    const idx = s.missions.indexOf(m), nextM = s.missions[idx + 1];
    const out = h('div');
    const color = r.passed ? 'good' : 'bad';
    out.append(h('div', { class: 'card result ' + (r.passed ? 'verified' : '') }, h('div', { class: 'score ' + color }, r.score), h('div', null, h('h2', null, r.level), h('p', { class: 'muted' }, r.passed ? 'Lulus (batas ' + (m.kind === 'quiz' ? 80 : 70) + ').' : 'Belum lulus (batas ' + (m.kind === 'quiz' ? 80 : 70) + '). Perbaiki lalu coba lagi.'))));
    if (r.items) {
      out.append(h('div', { class: 'card' }, h('h3', null, 'Penilaian per kriteria'), r.items.map(i => h('div', { class: 'crit' }, h('div', { class: 'row', style: 'margin:0;justify-content:space-between' }, h('b', null, i.name), h('span', { class: 'small muted' }, 'bobot ' + i.w + '% · ' + i.skor + '/4')), h('div', { class: 'track' }, h('div', { class: 'fill', style: 'width:' + (i.skor / 4 * 100) + '%' })), h('div', { class: 'small' }, i.catatan)))));
      if (r.kekuatan && r.kekuatan.length) out.append(h('div', { class: 'card' }, h('h3', null, 'Yang sudah baik'), h('ul', null, r.kekuatan.map(x => h('li', null, x)))));
      if (r.perbaikan && r.perbaikan.length) out.append(h('div', { class: 'card' }, h('h3', null, 'Yang perlu diperbaiki'), h('ul', null, r.perbaikan.map(x => h('li', null, x)))));
      if (r.catatan_manajer) out.append(h('div', { class: 'card note' }, h('b', null, 'Komentar atasan: '), r.catatan_manajer));
      if (r.hidden) out.append(h('div', { class: 'card' }, h('h3', null, 'Informasi tersembunyi / kunci kasus'), h('p', null, r.hidden), h('p', { class: 'muted small' }, 'Bandingkan dengan apa yang berhasil Anda gali.')));
      out.append(h('div', { class: 'card note small' }, 'Penilaian dibuat oleh AI dengan rubrik yang disimpan di server. Hasilnya bisa berbeda sedikit antar percobaan; fokuslah pada umpan balik, bukan pada angka semata.'));
    } else if (r.results) {
      out.append(h('div', { class: 'card' }, r.results.map((x, i) => h('div', { class: 'crit' }, h('b', null, 'Soal ' + (i + 1) + ': ' + (x.ok ? '✓ benar' : '✗ belum tepat')), h('div', { class: 'small ' + (x.ok ? 'ok' : 'bad') }, x.ok ? x.why : 'Petunjuk: ' + x.hint)))));
    }
    if (r.cert && r.cert.status === 'valid') out.append(h('div', { class: 'card verified' }, h('h2', null, '🎓 Selamat! Skill selesai'), h('p', null, 'Sertifikat "' + r.cert.judul_en + '" sudah disetujui dengan skor akhir ' + r.cert.skor + '.'), h('a', { class: 'btn primary', href: '#/sertifikat/' + r.cert.id }, 'Lihat & unduh sertifikat')));
    else if (r.cert && r.cert.status === 'menunggu') out.append(h('div', { class: 'card verified' }, h('h2', null, '🎉 Skill selesai'), h('p', null, 'Semua misi lulus dengan skor akhir ' + r.cert.skor + '. Sertifikat "' + r.cert.judul_en + '" kini menunggu persetujuan dosen; Anda akan menerimanya setelah disetujui.'), h('a', { class: 'btn', href: '#/' }, 'Kembali ke Jalur Skill')));
    else if (r.passed && nextM) out.append(h('a', { class: 'btn primary', href: '#/misi/' + s.id + '/' + nextM.id }, 'Lanjut ke misi berikutnya →'));
    body.append(out); out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  function sessErr(ctx, r, out) {
    if (r.code === 'voided' || r.code === 'nosess') { ctx.g.stop(); ctx.retry(r.error); return true; }
    out.append(h('div', { class: 'card err' }, r.error)); return false;
  }

  function quizView(body, ctx) {
    const { s, m, sess } = ctx, qs = sess.questions, answers = new Array(qs.length).fill(-1);
    qs.forEach((q, qi) => body.append(h('div', { class: 'card q' }, h('b', null, (qi + 1) + '. ' + q.q), q.opts.map((o, oi) => h('label', { class: 'opt' }, h('input', { type: 'radio', name: 'q' + qi, onchange: () => { answers[qi] = oi; } }), ' ' + o)))));
    const out = h('div'); const btn = h('button', { class: 'btn primary', onclick: async () => {
      if (answers.includes(-1)) { VL.toast('Jawab semua soal dulu'); return; }
      btn.disabled = true; btn.textContent = 'Memeriksa…';
      const r = await VL.api.call('quiz_submit', { skill: s.id, mission: m.id, sid: sess.sid, answers });
      btn.disabled = false; btn.textContent = 'Kirim jawaban';
      out.innerHTML = ''; if (!r.ok) { sessErr(ctx, r, out); return; }
      ctx.g.stop(); btn.remove(); afterResult(out, s, m, r);
    } }, 'Kirim jawaban');
    body.append(btn, out);
  }

  function taskView(body, ctx) {
    const { s, m, sess } = ctx;
    if (sess.brief) body.append(h('p', null, h('b', null, 'Tugas: '), sess.brief));
    (sess.materials || []).forEach(x => body.append(material(x)));
    body.append(h('h2', null, 'Jawaban Anda'));
    const inputs = {};
    m.fields.forEach(f => {
      const ta = h('textarea', { rows: 7, placeholder: f.hint || '', autocomplete: 'off', spellcheck: 'false' });
      const cnt = h('span', { class: 'small muted' });
      const upd = () => { cnt.textContent = ta.value.trim().length + ' / min ' + f.min + ' karakter'; cnt.className = 'small ' + (ta.value.trim().length >= f.min ? 'ok' : 'muted'); };
      ta.addEventListener('input', upd); upd(); inputs[f.key] = ta;
      body.append(h('div', { class: 'card' }, VL.field(f.label, ta, f.hint), cnt));
    });
    const out = h('div'); const btn = h('button', { class: 'btn primary', onclick: async () => {
      const fields = {}; for (const f of m.fields) { fields[f.key] = inputs[f.key].value.trim(); if (fields[f.key].length < f.min) { VL.toast('"' + f.label.slice(0, 40) + '…" masih kurang dari ' + f.min + ' karakter'); inputs[f.key].focus(); return; } }
      btn.disabled = true; btn.textContent = 'AI sedang menilai… (±20–40 detik)'; out.innerHTML = '';
      const r = await aiCall('task_submit', { skill: s.id, mission: m.id, sid: sess.sid, fields });
      btn.disabled = false; btn.textContent = 'Kirim untuk dinilai';
      if (!r.ok) { sessErr(ctx, r, out); return; }
      ctx.g.stop(); btn.remove(); afterResult(out, s, m, r);
    } }, 'Kirim untuk dinilai');
    body.append(btn, out);
  }

  /* Role-play (satu lawan bicara) dan simulasi rapat (beberapa orang) memakai tampilan percakapan yang sama. */
  function chatView(body, ctx) {
    const { s, m, sess } = ctx, meet = m.kind === 'meeting', act = meet ? 'meet' : 'rp';
    if (sess.brief) body.append(h('p', null, h('b', null, 'Skenario: '), sess.brief));
    (sess.materials || []).forEach(x => body.append(material(x)));
    if (meet && sess.team) body.append(h('div', { class: 'card small' }, h('b', null, 'Peserta rapat: '), sess.team.map(t => t.nama).join(' · ')));
    body.append(h('div', { class: 'card' }, h('b', null, 'Sasaran: '), m.goal, h('p', { class: 'muted small' }, 'Minimal ' + m.minTurns + ' dan maksimal ' + m.maxTurns + ' giliran bicara. Lawan bicara dimainkan AI dengan kunci Gemini Anda; transkrip disimpan di server sehingga tidak dapat diubah.')));
    const log = h('div', { class: 'chat' }), box = h('textarea', { rows: 2, placeholder: 'Ketik ucapan Anda…', autocomplete: 'off' }), send = h('button', { class: 'btn primary' }, 'Kirim'), endBtn = h('button', { class: 'btn' }, meet ? 'Akhiri rapat & nilai' : 'Akhiri & nilai'), counter = h('span', { class: 'muted small' }, '0/' + m.maxTurns), out = h('div');
    const bubble = (who, t, name) => { log.append(h('div', { class: 'bub ' + who }, name ? h('b', null, name + ': ') : null, t)); log.scrollTop = log.scrollHeight; };
    body.append(log, h('div', { class: 'card' }, box, h('div', { class: 'row' }, send, endBtn, counter)), out);
    let turns = 0, busy = false;
    send.addEventListener('click', async () => {
      const t = box.value.trim(); if (!t || busy) return; busy = true; send.disabled = true; box.value = ''; bubble('me', t);
      const r = await aiCall(act + '_turn', { skill: s.id, mission: m.id, sid: sess.sid, text: t });
      busy = false; send.disabled = false;
      if (!r.ok) { log.lastChild.remove(); box.value = t; if (r.code === 'voided' || r.code === 'nosess') { sessErr(ctx, r, out); return; } bubble('err', r.error); return; }
      turns = r.turns; counter.textContent = turns + '/' + r.max;
      if (meet) r.replies.forEach(x => bubble('ai', x.text, x.name)); else bubble('ai', r.reply);
    });
    box.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send.click(); });
    endBtn.addEventListener('click', async () => {
      if (busy) return; if (turns < m.minTurns) { VL.toast('Lakukan minimal ' + m.minTurns + ' giliran dulu'); return; }
      busy = true; endBtn.disabled = true; endBtn.textContent = 'AI sedang menilai…'; out.innerHTML = '';
      const r = await aiCall(act + '_end', { skill: s.id, mission: m.id, sid: sess.sid });
      busy = false; endBtn.disabled = false; endBtn.textContent = meet ? 'Akhiri rapat & nilai' : 'Akhiri & nilai';
      if (!r.ok) { sessErr(ctx, r, out); return; }
      ctx.g.stop(); send.disabled = true; endBtn.disabled = true; afterResult(out, s, m, r);
    });
  }
})();
