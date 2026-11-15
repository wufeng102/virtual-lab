/* Ruang Komando dosen: halaman terpisah dari aplikasi mahasiswa (dosen.html) */
(function () {
  'use strict';
  const { h } = VL, cfg = VL.cfg, view = document.getElementById('view'), who = document.getElementById('who');
  const TK = 'vld_token', UK = 'vld_user';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* abaikan */ } } };
  let token = ls.get(TK), user = null; try { user = JSON.parse(ls.get(UK) || 'null'); } catch (e) { user = null; }
  let D = null, curTab = 0;

  const dt = s => s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '–';
  const ago = s => { if (!s) return 'belum pernah'; const m = Math.round((Date.now() - new Date(s).getTime()) / 60000); return m < 2 ? 'baru saja' : m < 60 ? m + ' mnt lalu' : m < 2880 ? Math.round(m / 60) + ' jam lalu' : Math.round(m / 1440) + ' hari lalu'; };
  const ST = { pending: ['menunggu', 'pending'], approved: ['disetujui', 'approved'], rejected: ['ditolak', 'rejected'], blocked: ['diblokir', 'blocked'], menunggu: ['menunggu', 'pending'], valid: ['disetujui', 'approved'], ditolak: ['ditolak', 'rejected'], dicabut: ['dicabut', 'blocked'] };
  const pill = s => h('span', { class: 'pill st-' + (ST[s] || [s, s])[1] }, (ST[s] || [s])[0]);
  const JENIS = { quiz: 'Kuis', task: 'Studi kasus', roleplay: 'Role-play', meeting: 'Rapat tim' };
  const missionName = (sk, m) => { const s = D && D.judul[sk]; if (!s) return sk; const x = s.misi.find(y => y.id === m); return (x ? x.judul : m); };
  const skillName = sk => (D && D.judul[sk] ? D.judul[sk].judul : sk);

  async function call(action, data) {
    let res;
    try { res = await fetch(cfg.apiUrl, { method: 'POST', body: JSON.stringify(Object.assign({ action: action, token: token }, data || {})), redirect: 'follow' }); }
    catch (e) { return { ok: false, code: 'network', error: 'Tidak dapat terhubung ke server. Periksa koneksi internet.' }; }
    let r; try { r = await res.json(); } catch (e) { return { ok: false, code: 'bad', error: 'Respons server tidak valid. Periksa deployment Apps Script (akses: Anyone).' }; }
    if (r && r.code === 'auth') { logout(true); }
    return r;
  }
  function logout(expired) { token = null; user = null; ls.set(TK, null); ls.set(UK, null); D = null; who.innerHTML = ''; showLogin(expired ? 'Sesi berakhir. Silakan masuk kembali.' : ''); }

  /* ---------- Masuk ---------- */
  function showLogin(msg) {
    view.innerHTML = '';
    if (!cfg.apiUrl) { view.append(h('div', { class: 'card err' }, 'apiUrl belum diisi di config.js.')); return; }
    const nim = h('input', { type: 'text', autocomplete: 'username', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', placeholder: 'Nama pengguna dosen' });
    const pw = h('input', { type: 'password', autocomplete: 'current-password' });
    const out = h('div'), btn = h('button', { class: 'btn primary' }, 'Masuk');
    async function go() {
      out.innerHTML = ''; btn.disabled = true; btn.textContent = 'Memeriksa…';
      const r = await (async () => { let res; try { res = await fetch(cfg.apiUrl, { method: 'POST', body: JSON.stringify({ action: 'login', portal: 'dosen', nim: nim.value.trim(), password: pw.value }) }); return await res.json(); } catch (e) { return { ok: false, error: 'Tidak dapat terhubung ke server.' }; } })();
      btn.disabled = false; btn.textContent = 'Masuk';
      if (!r.ok) { out.append(h('div', { class: 'card err' }, r.error || 'Gagal masuk.')); return; }
      token = r.token; user = r.user; ls.set(TK, token); ls.set(UK, JSON.stringify(user)); start();
    }
    btn.addEventListener('click', go); pw.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    view.append(h('section', { class: 'card hero' }, h('h1', null, 'Ruang Komando'), h('p', { class: 'muted' }, 'Halaman khusus dosen: pantau seluruh mahasiswa, setujui pendaftaran, dan putuskan penerbitan sertifikat.')),
      msg ? h('div', { class: 'card note' }, msg) : null,
      h('div', { class: 'card' }, VL.field('Nama pengguna', nim), VL.field('Sandi', pw), btn, out,
        h('p', { class: 'muted small' }, 'Mahasiswa tidak memakai halaman ini. Mahasiswa masuk lewat halaman aplikasi biasa.')));
  }

  /* ---------- Muat & tampilkan ---------- */
  async function start() {
    view.innerHTML = ''; view.append(h('div', { class: 'card' }, 'Memuat data…'));
    const r = await call('admin_overview');
    if (!r.ok) { if (r.code === 'auth') return; view.innerHTML = ''; view.append(h('div', { class: 'card err' }, r.error || 'Gagal memuat.'), h('button', { class: 'btn', onclick: () => logout(false) }, 'Keluar')); return; }
    D = r;
    who.innerHTML = ''; who.append(h('span', { class: 'muted small' }, (user && user.nama) || 'Dosen'), h('button', { class: 'btn small', onclick: () => logout(false) }, 'Keluar'));
    main();
  }
  async function refresh() { const r = await call('admin_overview'); if (r.ok) { D = r; } return r.ok; }

  function students() { return D.users; }
  const cnt = s => students().filter(x => x.status === s).length;

  function main() {
    view.innerHTML = '';
    const dayAgo = Date.now() - 864e5, act = students().filter(x => x.status === 'approved');
    view.append(h('h1', null, 'Ruang Komando'),
      h('div', { class: 'kpis' },
        VL.kpi('Pendaftar menunggu', cnt('pending'), cnt('pending') ? 'bad' : ''), VL.kpi('Mahasiswa aktif', act.length, 'good'),
        VL.kpi('Sertifikat menunggu', D.antrean.length, D.antrean.length ? 'bad' : ''), VL.kpi('Aktif 24 jam', act.filter(x => x.aktif_terakhir && new Date(x.aktif_terakhir).getTime() > dayAgo).length),
        VL.kpi('Sesi batal 24 jam', students().reduce((a, x) => a + x.batal24, 0))));
    const host = h('div'); view.append(host);
    VL.tabs(host, [
      { label: 'Ringkasan', render: tabRingkasan },
      { label: 'Pendaftar (' + cnt('pending') + ')', render: tabPendaftar },
      { label: 'Mahasiswa (' + students().length + ')', render: tabMahasiswa },
      { label: 'Sertifikat (' + D.antrean.length + ')', render: tabSertifikat },
      { label: 'Kiriman jurnal', render: tabJurnal }]);
    const btns = host.querySelectorAll('.tab'); host._go = i => btns[i] && btns[i].click();
    main.go = i => { curTab = i; host._go(i); }; if (curTab) host._go(curTab);
    host.querySelectorAll('.tab').forEach((b, i) => b.addEventListener('click', () => { curTab = i; }));
  }
  async function reload() { await refresh(); main(); }

  /* ---------- Ringkasan ---------- */
  function evText(f) {
    const m = f.mission ? '“' + missionName(f.skill, f.mission) + '”' : '';
    switch (f.event) {
      case 'mulai': return 'memulai ' + m;
      case 'hasil': return 'hasil ' + m + ': skor ' + f.skor + (f.info === 'lulus' ? ' (lulus)' : ' (belum lulus)');
      case 'batal': return 'sesi ' + m + ' dibatalkan (' + ({ left: 'keluar dari aplikasi/tab', gap: 'tidak aktif', nav: 'pindah halaman', timeout: 'waktu habis' }[f.info] || f.info) + ')';
      case 'sertifikat_diajukan': return 'menyelesaikan skill “' + skillName(f.skill) + '” dan mengajukan sertifikat';
      case 'sertifikat_disetujui': return 'sertifikat “' + skillName(f.skill) + '” disetujui';
      case 'sertifikat_ditolak': return 'sertifikat “' + skillName(f.skill) + '” ditolak';
      default: return f.event;
    }
  }
  function tabRingkasan(p) {
    const todo = [];
    if (cnt('pending')) todo.push(h('button', { class: 'btn primary small', onclick: () => main.go(1) }, cnt('pending') + ' pendaftar menunggu persetujuan'));
    if (D.antrean.length) todo.push(h('button', { class: 'btn primary small', onclick: () => main.go(3) }, D.antrean.length + ' sertifikat menunggu keputusan'));
    p.append(h('div', { class: 'card' }, h('h3', null, 'Perlu tindakan Anda'), todo.length ? h('div', { class: 'row' }, todo) : h('p', { class: 'muted' }, 'Tidak ada yang menunggu. 👍')));
    const act = students().filter(x => x.status === 'approved');
    p.append(h('div', { class: 'card' }, h('h3', null, 'Corong skill (mahasiswa aktif)'), VL.bars(D.funnel.map(f => ({ label: f.judul + ' · mulai ' + f.mulai, value: f.selesai })), { fmt: v => v + ' selesai' }),
      h('p', { class: 'muted small' }, '“Selesai” = semua misi pada skill itu sudah lulus, terlepas dari status sertifikatnya.')));
    const idle = act.filter(x => x.lulus < x.total && (!x.aktif_terakhir || Date.now() - new Date(x.aktif_terakhir).getTime() > 7 * 864e5)).slice(0, 10);
    const voidy = act.filter(x => x.batal >= 3).sort((a, b) => b.batal - a.batal).slice(0, 10);
    const att = [];
    idle.forEach(x => att.push([x.nama, x.nim, 'Tidak aktif ' + ago(x.aktif_terakhir || x.dibuat).replace(' lalu', ''), h('button', { class: 'btn small', onclick: () => openStudent(x.nim) }, 'Lihat')]));
    voidy.forEach(x => att.push([x.nama, x.nim, x.batal + ' sesi dibatalkan', h('button', { class: 'btn small', onclick: () => openStudent(x.nim) }, 'Lihat')]));
    p.append(h('div', { class: 'card' }, h('h3', null, 'Perlu perhatian'), att.length ? VL.table(['Nama', 'NIM', 'Catatan', ''], att) : h('p', { class: 'muted' }, 'Belum ada mahasiswa yang menonjol sebagai tidak aktif atau sering membatalkan sesi.'),
      h('p', { class: 'muted small' }, 'Tidak aktif = lebih dari 7 hari tanpa aktivitas dan belum menyelesaikan semua misi. Sesi batal ≥ 3 = berulang kali meninggalkan aplikasi saat sesi.')));
    p.append(h('div', { class: 'card' }, h('h3', null, 'Aktivitas terbaru'), D.feed.length ? VL.table(['Waktu', 'Mahasiswa', 'Aktivitas'], D.feed.map(f => [ago(f.waktu), f.nama || f.nim, evText(f)])) : h('p', { class: 'muted' }, 'Belum ada aktivitas.'),
      h('button', { class: 'btn small', onclick: reload }, '↻ Muat ulang')));
  }

  /* ---------- Pendaftar ---------- */
  function tabPendaftar(p) {
    const list = students().filter(x => x.status === 'pending');
    if (!list.length) { p.append(h('div', { class: 'card' }, 'Tidak ada pendaftar yang menunggu.')); return; }
    const boxes = list.map(x => ({ x, c: h('input', { type: 'checkbox' }) }));
    const set = async (nim, status) => { const r = await call('admin_set_status', { nim, status }); VL.toast(r.ok ? 'Diperbarui' : r.error); if (r.ok) reload(); };
    const rows = boxes.map(({ x, c }) => [c, x.nim, x.nama, x.kelas, x.mk, x.email, dt(x.dibuat), h('span', { class: 'row', style: 'margin:0' },
      h('button', { class: 'btn small primary', onclick: () => set(x.nim, 'approved') }, 'Setujui'), h('button', { class: 'btn small danger', onclick: () => confirm('Tolak ' + x.nama + '?') && set(x.nim, 'rejected') }, 'Tolak'))]);
    p.append(h('div', { class: 'card' },
      h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => boxes.forEach(b => { b.c.checked = true; }) }, 'Pilih semua'), h('button', { class: 'btn small', onclick: () => boxes.forEach(b => { b.c.checked = false; }) }, 'Kosongkan'),
        h('button', { class: 'btn primary small', onclick: async () => {
          const nims = boxes.filter(b => b.c.checked).map(b => b.x.nim); if (!nims.length) { VL.toast('Belum ada yang dipilih'); return; }
          if (!confirm('Setujui ' + nims.length + ' pendaftar?')) return;
          const r = await call('admin_bulk_approve', { nims }); VL.toast(r.ok ? r.approved + ' disetujui' : r.error); reload();
        } }, 'Setujui terpilih')),
      VL.table(['', 'NIM', 'Nama', 'Kelas', 'Mata kuliah', 'Email', 'Mendaftar', ''], rows),
      h('p', { class: 'muted small' }, 'Mahasiswa mendaftar sendiri; tidak perlu daftar nama dari Anda. Periksa nama, NIM, dan kelas sebelum menyetujui.')));
  }

  /* ---------- Mahasiswa ---------- */
  function tabMahasiswa(p) {
    const q = h('input', { type: 'text', placeholder: 'Cari NIM, nama, atau kelas…' }), box = h('div');
    const flt = VL.select([['', 'Semua status'], ['approved', 'Disetujui'], ['pending', 'Menunggu'], ['rejected', 'Ditolak'], ['blocked', 'Diblokir']], '');
    let shown = [];
    function draw() {
      box.innerHTML = ''; const s = q.value.trim().toLowerCase();
      shown = students().filter(x => (!flt.value || x.status === flt.value) && (!s || (x.nim + ' ' + x.nama + ' ' + x.kelas).toLowerCase().includes(s)));
      box.append(VL.table(['NIM', 'Nama', 'Kelas', 'Status', 'Misi lulus', 'Rata', 'Aktif terakhir', 'Batal', 'Sertifikat', 'Tindakan'], shown.map(x => [x.nim, x.nama, x.kelas, pill(x.status), x.lulus + '/' + x.total, x.rata || '–', ago(x.aktif_terakhir), x.batal, x.cert_valid + (x.cert_menunggu ? ' (+' + x.cert_menunggu + ' menunggu)' : ''),
        h('span', { class: 'row', style: 'margin:0' },
          h('button', { class: 'btn small primary', onclick: () => openStudent(x.nim) }, 'Laporan'),
          x.status === 'approved' ? h('button', { class: 'btn small', onclick: () => confirm('Blokir ' + x.nama + '?') && setStatus(x.nim, 'blocked') }, 'Blokir') : h('button', { class: 'btn small', onclick: () => setStatus(x.nim, 'approved') }, 'Setujui'),
          h('button', { class: 'btn small', onclick: () => resetPw(x) }, 'Reset sandi'),
          h('button', { class: 'btn small', onclick: () => extend(x) }, 'Atur akses'))])));
    }
    async function setStatus(nim, status) { const r = await call('admin_set_status', { nim, status }); VL.toast(r.ok ? 'Status diperbarui' : r.error); if (r.ok) reload(); }
    async function resetPw(x) {
      if (!confirm('Reset sandi ' + x.nama + '? Sesi aktifnya akan dikeluarkan.')) return;
      const r = await call('admin_reset_password', { nim: x.nim }); if (!r.ok) { VL.toast(r.error); return; }
      VL.modal('Sandi sementara', h('div', null, h('p', null, 'Berikan ke ' + x.nama + ' lewat jalur pribadi, lalu minta ia menggantinya di menu Profil.'), h('pre', { class: 'out' }, r.temp_password), h('p', { class: 'muted small' }, 'Sandi ini hanya ditampilkan sekali.')), [{ label: 'Tutup', kind: 'primary' }]);
    }
    async function extend(x) {
      const v = prompt('Akses berlaku sampai tanggal (YYYY-MM-DD). Kosongkan untuk tanpa batas:', x.akses_sampai ? x.akses_sampai.slice(0, 10) : ''); if (v === null) return;
      const r = await call('admin_extend', { nim: x.nim, until: v.trim() }); VL.toast(r.ok ? 'Tersimpan' : r.error); if (r.ok) reload();
    }
    q.addEventListener('input', draw); flt.addEventListener('change', draw);
    p.append(h('div', { class: 'card' }, h('div', { class: 'cols' }, VL.field('Cari', q), VL.field('Status', flt)), box,
      h('button', { class: 'btn small', onclick: () => VL.download('mahasiswa.csv', VL.csv([['nim', 'nama', 'kelas', 'mk', 'status', 'misi_lulus', 'rata', 'percobaan', 'batal', 'aktif_terakhir', 'sertifikat'], ...shown.map(x => [x.nim, x.nama, x.kelas, x.mk, x.status, x.lulus, x.rata, x.percobaan, x.batal, x.aktif_terakhir, x.cert_valid])]), 'text/csv') }, 'Unduh CSV')));
    draw();
  }

  /* ---------- Laporan satu mahasiswa (+ keputusan sertifikat) ---------- */
  async function openStudent(nim, focusSkill) {
    view.innerHTML = ''; view.append(h('div', { class: 'card' }, 'Menyusun laporan…'));
    const r = await call('admin_student', { nim });
    view.innerHTML = '';
    const back = h('p', null, h('button', { class: 'btn small', onclick: async () => { await refresh(); main(); } }, '← Kembali ke Ruang Komando'));
    if (!r.ok) { view.append(back, h('div', { class: 'card err' }, r.error)); return; }
    const u = r.user;
    view.append(back, h('h1', null, u.nama), h('div', { class: 'muted small' }, u.nim + ' · ' + u.kelas + ' · ' + u.mk + ' · ' + (u.email || 'tanpa email') + ' · masuk terakhir ' + ago(u.login_terakhir)));
    if (!r.skills.length) view.append(h('div', { class: 'card' }, 'Belum ada aktivitas belajar.'));
    r.skills.forEach(sk => view.append(skillReport(u, sk, focusSkill === sk.id)));
    view.append(h('div', { class: 'card' }, h('h3', null, 'Riwayat aktivitas (80 terakhir)'), r.log.length ? VL.table(['Waktu', 'Aktivitas'], r.log.map(f => [dt(f.waktu), evText(Object.assign({}, f, { nama: u.nama }))])) : 'Belum ada.'));
    if (focusSkill) setTimeout(() => { const el = document.getElementById('sk-' + focusSkill); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  }

  function skillReport(u, sk, focus) {
    const rc = sk.rekomendasi, recCls = rc.kode === 'setuju' ? 'verified' : rc.kode === 'periksa' ? 'note' : 'card';
    const c = h('div', { class: 'card', id: 'sk-' + sk.id, style: focus ? 'outline:2px solid var(--brand)' : '' },
      h('div', { class: 'row', style: 'justify-content:space-between;margin:0' }, h('h2', { style: 'margin:0' }, sk.judul), sk.cert ? pill(sk.cert.status) : null),
      h('div', { class: 'kpis' }, VL.kpi('Misi lulus', sk.lulus + '/' + sk.total, sk.lulus === sk.total ? 'good' : ''), VL.kpi('Skor rata-rata', sk.rata), VL.kpi('Level', sk.level), VL.kpi('Percobaan / misi', sk.rata_percobaan), VL.kpi('Sesi dibatalkan', sk.batal, sk.batal >= 3 ? 'bad' : '')),
      h('div', { class: 'card ' + recCls }, h('b', null, 'Rekomendasi: '), rc.teks),
      h('p', null, sk.narasi),
      sk.indikator.length ? h('div', null, h('h4', null, 'Indikator yang perlu diperiksa'), h('ul', null, sk.indikator.map(x => h('li', null, x))), h('p', { class: 'muted small' }, 'Ini petunjuk dari data sesi, bukan bukti kecurangan. Putuskan dengan pertimbangan Anda.')) : null,
      (sk.kriteria_lemah.length || sk.kriteria_kuat.length) ? h('div', { class: 'cols' },
        h('div', null, h('h4', null, 'Kriteria menonjol'), sk.kriteria_kuat.length ? h('ul', null, sk.kriteria_kuat.map(x => h('li', null, x.nama + ' — ' + x.rata + '/4'))) : h('p', { class: 'muted small' }, '–')),
        h('div', null, h('h4', null, 'Kriteria perlu penguatan'), sk.kriteria_lemah.length ? h('ul', null, sk.kriteria_lemah.map(x => h('li', null, x.nama + ' — ' + x.rata + '/4'))) : h('p', { class: 'muted small' }, '–'))) : null,
      VL.table(['Misi', 'Jenis', 'Skor terbaik', 'Percobaan', 'Durasi', 'Batal', 'Terakhir'], sk.misi.map(m => [m.judul, JENIS[m.jenis] || m.jenis, m.lulus ? m.terbaik : (m.percobaan ? m.terbaik + ' (belum lulus)' : '–'), m.percobaan, m.durasi_detik == null ? '–' : (m.durasi_detik < 90 ? m.durasi_detik + ' dtk' : Math.round(m.durasi_detik / 60) + ' mnt'), m.batal, m.terakhir ? dt(m.terakhir) : '–'])),
      h('details', null, h('summary', null, 'Umpan balik AI per misi'), sk.misi.filter(m => m.catatan_manajer || m.kekuatan.length || m.perbaikan.length).map(m => h('div', { class: 'crit' }, h('b', null, m.judul),
        m.catatan_manajer ? h('p', { class: 'small' }, m.catatan_manajer) : null, m.kekuatan.length ? h('div', { class: 'small ok' }, 'Kekuatan: ' + m.kekuatan.join('; ')) : null, m.perbaikan.length ? h('div', { class: 'small bad' }, 'Perbaikan: ' + m.perbaikan.join('; ')) : null))));
    c.append(certBox(u, sk));
    return c;
  }

  function certBox(u, sk) {
    const ct = sk.cert, box = h('div', { class: 'card note' });
    if (!ct) { box.append(h('b', null, 'Sertifikat: '), sk.lulus === sk.total ? 'belum diajukan.' : 'belum bisa diajukan (misi belum lengkap).'); return box; }
    const note = h('textarea', { rows: 2, placeholder: 'Catatan untuk mahasiswa (wajib bila menolak)' });
    const decide = async dec => {
      if (dec === 'reject' && !note.value.trim()) { VL.toast('Tulis alasan penolakan'); return; }
      if (!confirm((dec === 'approve' ? 'Setujui' : 'Tolak') + ' sertifikat ' + ct.id + ' atas nama ' + u.nama + '?')) return;
      const r = await call('admin_cert_decide', { id: ct.id, decision: dec, note: note.value });
      if (!r.ok) { VL.toast(r.error); return; }
      VL.toast((dec === 'approve' ? 'Disetujui' : 'Ditolak') + '. Email ' + r.email + '.'); await refresh(); openStudent(u.nim, sk.id);
    };
    const flip = async to => { if (!confirm((to === 'dicabut' ? 'Cabut' : 'Pulihkan') + ' sertifikat ' + ct.id + '?')) return; const r = await call('admin_cert_status', { id: ct.id, status: to }); VL.toast(r.ok ? 'Diperbarui' : r.error); if (r.ok) { await refresh(); openStudent(u.nim, sk.id); } };
    box.append(h('div', { class: 'row', style: 'margin:0' }, h('b', null, 'Sertifikat ' + ct.id + ' (skor ' + ct.skor + ') '), pill(ct.status)), h('div', { class: 'muted small' }, 'Diajukan ' + dt(ct.diajukan) + (ct.diputuskan ? ' · diputuskan ' + dt(ct.diputuskan) : '')));
    if (ct.catatan) box.append(h('p', { class: 'small' }, 'Catatan: ' + ct.catatan));
    if (ct.status === 'menunggu') box.append(note, h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => decide('approve') }, '✓ Setujui & terbitkan'), h('button', { class: 'btn danger', onclick: () => decide('reject') }, '✗ Tolak')));
    else if (ct.status === 'valid') box.append(h('button', { class: 'btn small', onclick: () => flip('dicabut') }, 'Cabut sertifikat'));
    else box.append(h('button', { class: 'btn small', onclick: () => flip('valid') }, ct.status === 'dicabut' ? 'Pulihkan' : 'Setujui sekarang'));
    return box;
  }

  /* ---------- Sertifikat ---------- */
  async function tabSertifikat(p) {
    p.append(h('div', { class: 'card' }, h('h3', null, 'Menunggu keputusan (' + D.antrean.length + ')'),
      D.antrean.length ? VL.table(['Nama', 'NIM', 'Skill', 'Skor', 'Diajukan', ''], D.antrean.map(a => [a.nama, a.nim, a.judul_en, a.skor, ago(a.diajukan), h('button', { class: 'btn small primary', onclick: () => openStudent(a.nim, a.skill) }, 'Tinjau & putuskan')])) : h('p', { class: 'muted' }, 'Tidak ada pengajuan.'),
      h('p', { class: 'muted small' }, 'Sertifikat tidak terbit otomatis. Setelah Anda menyetujui, mahasiswa menerima email pemberitahuan dan dapat mengunduh PDF dari aplikasi.')));
    const all = h('div', { class: 'card' }, 'Memuat daftar sertifikat…'); p.append(all);
    const r = await call('admin_certs'); all.innerHTML = '';
    if (!r.ok) { all.append(h('div', { class: 'err' }, r.error)); return; }
    const list = r.certs.filter(c => c.status !== 'menunggu');
    all.append(h('h3', null, 'Sudah diputuskan (' + list.length + ')'), list.length ? VL.table(['Nomor', 'Nama', 'Skill', 'Skor', 'Tanggal', 'Email', 'Status', ''], list.map(x => [x.id, x.nama, x.judul_en, x.skor, dt(x.tanggal), x.email_terkirim + '×', pill(x.status),
      h('button', { class: 'btn small', onclick: () => openStudent(x.nim, x.skill) }, 'Laporan')])) : h('p', { class: 'muted' }, 'Belum ada.'));
  }

  /* ---------- Jurnal ---------- */
  function tabJurnal(p) {
    const modName = id => (VL.modules.find(m => m.id === id) || {}).title || id;
    const mod = VL.select([['', 'Semua modul'], ...VL.modules.map(m => [m.id, m.title])], ''), nim = h('input', { type: 'text', placeholder: 'NIM (opsional)' });
    const out = h('div'); let last = [];
    async function go() {
      out.innerHTML = 'Memuat…';
      const r = await call('admin_runs', { modul: mod.value, nim: nim.value.trim(), limit: 200 });
      out.innerHTML = ''; if (!r.ok) { out.append(h('div', { class: 'card err' }, r.error)); return; }
      last = r.runs; out.append(h('p', { class: 'muted small' }, 'Menampilkan ' + r.runs.length + ' dari ' + r.total + ' entri (terbaru dulu).'));
      r.runs.forEach(x => out.append(h('div', { class: 'card entry' }, h('h3', null, x.judul), h('div', { class: 'muted small' }, x.nama + ' · ' + x.nim + ' · ' + x.kelas + ' · ' + modName(x.modul) + ' · ' + dt(x.waktu)), x.ringkasan ? h('p', null, x.ringkasan) : null, x.hipotesis ? h('p', null, h('b', null, 'Hipotesis: '), x.hipotesis) : null, x.refleksi ? h('p', null, h('b', null, 'Refleksi: '), x.refleksi) : h('p', { class: 'muted small' }, 'Belum ada refleksi.'))));
    }
    p.append(h('div', { class: 'card' }, h('div', { class: 'cols' }, VL.field('Modul', mod), VL.field('NIM', nim)),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: go }, 'Tampilkan'), h('button', { class: 'btn', onclick: () => last.length ? VL.download('kiriman-jurnal.csv', VL.csv([['nim', 'nama', 'kelas', 'modul', 'waktu', 'judul', 'ringkasan', 'hipotesis', 'refleksi'], ...last.map(x => [x.nim, x.nama, x.kelas, modName(x.modul), x.waktu, x.judul, x.ringkasan, x.hipotesis, x.refleksi])]), 'text/csv') : VL.toast('Tampilkan data dulu') }, 'Unduh CSV')),
      h('p', { class: 'muted small' }, 'Catatan: isi jurnal dikirim dari perangkat mahasiswa dan dapat diubah oleh mereka. Perlakukan sebagai bukti proses belajar, bukan catatan yang tak bisa dipalsukan.')), out);
    go();
  }

  if (!cfg.apiUrl) showLogin();
  else if (token && user) start(); else showLogin();
})();
