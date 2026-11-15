/* Virtual Lab Marketing — router dan halaman utama */
(function () {
  'use strict';
  const { h, fmt } = VL;
  const view = document.getElementById('view');
  const nav = document.getElementById('nav');
  const MK = ['Strategi Pemasaran', 'Pemasaran Digital', 'Manajemen Pemasaran', 'Bisnis Digital'];
  const inFrame = window.self !== window.top;
  const embed = /[?&]embed=1/.test(location.search) || inFrame;
  const modName = id => (VL.modules.find(m => m.id === id) || {}).title || id;

  function setNav(active) {
    nav.innerHTML = '';
    const n = VL.runs().length;
    const srv = VL.api.enabled();
    const items = srv ? [['', 'Jalur Skill'], ['lab', 'Lab Bebas'], ['sertifikat', 'Sertifikat'], ['jurnal', 'Jurnal'], ['profil', 'Profil'], ['tentang', 'Tentang']] : [['', 'Beranda'], ['jurnal', 'Jurnal'], ['profil', 'Profil'], ['tentang', 'Tentang']];
    if (VL.api.isAdmin()) items.splice(items.length - 1, 0, ['admin', 'Admin']);
    items.forEach(([k, l]) => {
      const a = h('a', { href: '#/' + k, class: (active || '') === k || ((k === '' && srv ? ['skill', 'misi'] : k === '' ? ['m'] : k === 'lab' ? ['m'] : []).indexOf(active) >= 0) ? 'on' : '' }, l);
      if (k === 'jurnal' && n) a.append(h('span', { class: 'badge' }, n));
      nav.append(a);
    });
  }

  function home() {
    if (VL.api.enabled()) return VL.skills.home(view);
    return labHome();
  }

  function labHome() {
    const p = VL.profile();
    let filter = '';
    view.append(h('section', { class: 'card hero' },
      h('h1', null, 'Virtual Lab Marketing'),
      h('p', { class: 'muted' }, 'Ruang riset dan pelatihan: ambil keputusan pemasaran, lihat konsekuensinya, lalu catat hipotesis dan refleksi Anda di Jurnal Lab.')));
    if (!p.nama && !VL.api.enabled()) view.append(h('div', { class: 'card note' }, 'Isi ', h('a', { href: '#/profil' }, 'profil'), ' terlebih dahulu agar jurnal Anda bisa diidentifikasi dosen.'));
    const chips = h('div', { class: 'chips' });
    const grid = h('div', { class: 'grid' });
    function draw() {
      chips.innerHTML = '';
      ['Semua', ...MK].forEach(m => chips.append(h('button', { class: 'chip' + ((m === 'Semua' ? '' : m) === filter ? ' on' : ''), onclick: () => { filter = m === 'Semua' ? '' : m; draw(); } }, m)));
      grid.innerHTML = '';
      const runs = VL.runs();
      VL.modules.filter(m => !filter || m.mk.includes(filter)).forEach(m => {
        const c = runs.filter(r => r.module === m.id).length;
        grid.append(h('a', { class: 'mod', href: '#/m/' + m.id },
          h('span', { class: 'ic' }, m.icon), h('h3', null, m.title), h('span', { class: 'muted small' }, m.desc),
          h('div', { class: 'tags' }, m.mk.map(x => h('span', { class: 'tag' }, x)), c ? h('span', { class: 'tag' }, c + ' catatan') : null)));
      });
    }
    draw();
    view.append(h('p', { class: 'muted small' }, 'Filter menurut mata kuliah:'), chips, grid,
      h('div', { class: 'card note small' }, 'Catatan penting: semua data di simulasi ini sintetis dan modelnya disederhanakan untuk belajar. Jangan melaporkannya sebagai data empiris atau prediksi pasar nyata.'));
  }

  function moduleView(id) {
    const m = VL.modules.find(x => x.id === id);
    if (!m) { view.append(h('div', { class: 'card err' }, 'Modul tidak ditemukan.')); return; }
    view.append(h('p', null, h('a', { href: '#/' }, '← Beranda')),
      h('h1', null, m.icon + ' ' + m.title),
      h('p', { class: 'muted' }, m.desc));
    const body = h('div'); view.append(body);
    m.render(body);
  }

  function journal() {
    const p = VL.profile();
    let runs = VL.runs();
    view.append(h('h1', null, 'Jurnal Lab'),
      h('p', { class: 'muted' }, p.nama ? p.nama + (p.nim ? ' · ' + p.nim : '') + (p.kelas ? ' · ' + p.kelas : '') : 'Profil belum diisi.'));
    const list = h('div');
    let filter = '';
    const filt = h('select', { onchange: e => { filter = e.target.value; draw(); } }, h('option', { value: '' }, 'Semua modul'), VL.modules.map(m => h('option', { value: m.id }, m.title)));
    function draw() {
      runs = VL.runs(); list.innerHTML = '';
      const rs = runs.filter(r => !filter || r.module === filter);
      if (!rs.length) { list.append(h('div', { class: 'card' }, 'Belum ada catatan. Jalankan simulasi atau isi lembar kerja, lalu pilih "Simpan ke Jurnal".')); return; }
      rs.forEach(r => {
        const refl = h('textarea', { rows: 3, placeholder: 'Tulis/ubah refleksi…' }); refl.value = r.reflection || '';
        refl.addEventListener('change', () => { const all = VL.runs(); const x = all.find(y => y.id === r.id); if (x) { x.reflection = refl.value.trim(); x.rev = (x.rev || 1) + 1; x.synced = false; VL.store.set('runs', all); VL.toast('Refleksi diperbarui'); document.dispatchEvent(new Event('vl-runs')); } });
        list.append(h('div', { class: 'card entry' },
          h('h3', null, r.title),
          h('div', { class: 'muted small' }, modName(r.module) + ' · ' + new Date(r.ts).toLocaleString('id-ID')),
          r.summary ? h('p', null, r.summary) : null,
          r.hypothesis ? h('p', null, h('b', null, 'Hipotesis: '), r.hypothesis) : null,
          VL.api.enabled() ? h('span', { class: 'pill ' + (r.synced ? 'st-approved' : 'st-pending') }, r.synced ? 'terkirim ke dosen' : 'belum terkirim') : null,
          VL.field('Refleksi', refl),
          h('div', { class: 'row' }, h('button', { class: 'btn small danger', onclick: () => { if (confirm('Hapus catatan ini?')) { VL.store.set('runs', VL.runs().filter(y => y.id !== r.id)); setNav('jurnal'); draw(); } } }, 'Hapus'))));
      });
    }
    const fileIn = h('input', { type: 'file', accept: '.json', hidden: true, onchange: e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => { try { const inc = JSON.parse(t); const cur = VL.runs(); const ids = new Set(cur.map(x => x.id)); const add = (inc.runs || inc).filter(x => x && x.id && !ids.has(x.id)); VL.store.set('runs', [...add, ...cur]); VL.toast(add.length + ' catatan diimpor'); draw(); setNav('jurnal'); } catch (err) { VL.toast('Berkas tidak valid'); } });
    } });
    view.append(h('div', { class: 'card' }, VL.field('Saring', filt),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => VL.download('jurnal-lab.json', JSON.stringify({ profile: VL.profile(), exported: new Date().toISOString(), runs: VL.runs() }, null, 2), 'application/json') }, 'Ekspor JSON (cadangan)'),
        h('button', { class: 'btn', onclick: () => { const rows = [['waktu', 'modul', 'judul', 'ringkasan', 'hipotesis', 'refleksi']]; VL.runs().forEach(r => rows.push([r.ts, modName(r.module), r.title, r.summary, r.hypothesis, r.reflection])); VL.download('jurnal-lab.csv', VL.csv(rows), 'text/csv'); } }, 'Ekspor CSV'),
        h('button', { class: 'btn', onclick: () => fileIn.click() }, 'Impor JSON'), fileIn,
        h('button', { class: 'btn', onclick: () => window.print() }, 'Cetak / PDF'),
        VL.api.enabled() ? h('button', { class: 'btn primary', onclick: async () => { const r = await VL.api.sync(); VL.toast(r.ok ? (r.saved === 0 ? 'Semua sudah terkirim' : 'Terkirim ke dosen') : (r.error || 'Gagal mengirim')); draw(); } }, 'Kirim sekarang (' + VL.api.pending() + ' menunggu)') : null)),
      list);
    draw();
    const redraw = () => { if (document.getElementById('view').contains(list)) draw(); };
    document.addEventListener('vl-sync', redraw, { once: true });
  }

  function profile() {
    if (VL.api.enabled()) return profileServer();
    const p = VL.profile();
    const nama = h('input', { type: 'text', value: p.nama }), nim = h('input', { type: 'text', value: p.nim }), kelas = h('input', { type: 'text', value: p.kelas, placeholder: 'mis. Manajemen 5A' });
    const mk = VL.select([['', '— pilih —'], ...MK], p.mk);
    view.append(h('h1', null, 'Profil'),
      h('div', { class: 'card' },
        VL.field('Nama', nama), VL.field('NIM', nim, 'NIM juga dipakai sebagai seed acak default di simulasi.'), VL.field('Kelas', kelas), VL.field('Mata kuliah', mk),
        h('button', { class: 'btn primary', onclick: () => { VL.store.set('profile', { nama: nama.value.trim(), nim: nim.value.trim(), kelas: kelas.value.trim(), mk: mk.value }); VL.toast('Profil disimpan'); } }, 'Simpan')),
      h('div', { class: 'card note small' }, 'Privasi: profil dan jurnal hanya tersimpan di peramban perangkat ini. Data baru keluar dari perangkat bila Anda menekan "Kirim ke dosen" atau mengekspor berkas. Menghapus data peramban akan menghapus jurnal — ekspor cadangan secara berkala.'));
  }

  function profileServer() {
    const u = VL.api.user();
    const emailIn = h('input', { type: 'email', value: u.email || '', placeholder: 'email@contoh.ac.id' });
    const old = h('input', { type: 'password', autocomplete: 'current-password' }), nw = h('input', { type: 'password', autocomplete: 'new-password' });
    view.append(h('h1', null, 'Profil'),
      h('div', { class: 'card' }, h('h3', null, u.nama), h('div', { class: 'muted' }, 'NIM ' + u.nim + ' · ' + u.kelas + ' · ' + u.mk), u.akses_sampai ? h('div', { class: 'muted small' }, 'Akses sampai ' + new Date(u.akses_sampai).toLocaleDateString('id-ID')) : null,
        h('p', { class: 'muted small' }, 'Data identitas dikunci agar jurnal dapat diidentifikasi. Salah data? Hubungi dosen.')),
      h('div', { class: 'card' }, h('h3', null, 'Email penerima sertifikat'), VL.field('Email', emailIn, u.email ? '' : 'Belum diisi. Wajib agar sertifikat bisa dikirim.'),
        h('button', { class: 'btn', onclick: async () => { const r = await VL.api.call('set_email', { email: emailIn.value }); if (r.ok) { VL.api.setUser(r.user); VL.toast('Email disimpan'); } else VL.toast(r.error); } }, 'Simpan email')),
      h('div', { class: 'card' }, h('h3', null, 'Ganti sandi'), VL.field('Sandi lama', old), VL.field('Sandi baru (min. 8 karakter)', nw),
        h('button', { class: 'btn', onclick: async () => { const r = await VL.api.call('change_password', { old_password: old.value, new_password: nw.value }); VL.toast(r.ok ? 'Sandi diganti' : r.error); if (r.ok) { old.value = ''; nw.value = ''; } } }, 'Simpan sandi')));
    const ai = h('div'); view.append(ai); if (VL.gemini) VL.gemini.settingsUI(ai);
    view.append(h('div', { class: 'card' }, h('button', { class: 'btn danger', onclick: async () => { if (VL.api.pending() && !confirm('Ada ' + VL.api.pending() + ' catatan belum terkirim. Tetap keluar? Catatan tetap tersimpan di perangkat ini.')) return; await VL.api.logout(); location.hash = '#/'; VL.boot(); } }, 'Keluar')),
      h('div', { class: 'card note small' }, 'Privasi: jurnal Anda tersimpan di perangkat ini dan dikirim ke dosen untuk pembelajaran dan penilaian. Kunci API Gemini hanya disimpan di perangkat Anda dan tidak pernah dikirim ke server dosen.'));
  }

  function about() {
    const c = VL.cfg;
    const cite = c.owner + ' (' + c.year + '). ' + c.appName + ' [Aplikasi web]. ' + c.institution + '. ' + c.siteUrl;
    view.append(h('h1', null, 'Tentang'),
      h('div', { class: 'card' },
        h('h3', null, c.appName + ' v' + c.version),
        h('p', null, 'Ruang riset dan pelatihan marketing untuk mata kuliah Strategi Pemasaran, Pemasaran Digital, Manajemen Pemasaran, dan Bisnis Digital.'),
        h('h3', null, 'Cara menggunakan dalam pembelajaran'),
        h('ol', null,
          h('li', null, 'Tulis hipotesis sebelum menjalankan simulasi atau analisis.'),
          h('li', null, 'Jalankan, bandingkan dengan dugaan Anda, lalu tulis refleksi: mengapa hasilnya begitu?'),
          h('li', null, 'Simpan ke Jurnal Lab, ekspor, dan serahkan sesuai arahan dosen.'))),
      h('div', { class: 'card' },
        h('h3', null, 'Batasan'),
        h('ul', null,
          h('li', null, 'Semua simulasi memakai model sederhana dan parameter fiktif. Hasilnya untuk melatih penalaran, bukan meramal pasar.'),
          h('li', null, 'Alat statistik membantu latihan. Untuk skripsi/artikel, verifikasi dengan perangkat lunak statistik baku.'),
          h('li', null, 'Analisis sentimen berbasis kamus kata bersifat kasar dan wajib divalidasi manual.'))),
      h('div', { class: 'card' },
        h('h3', null, 'Hak cipta'),
        h('p', null, '© ' + c.year + ' ' + c.owner + '. Seluruh hak dilindungi.' + (c.hkiNumber ? ' Nomor pencatatan ciptaan: ' + c.hkiNumber + '.' : '')),
        h('p', { class: 'muted small' }, 'Cara mengutip:'), h('pre', { class: 'out' }, cite)));
  }

  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const a = parts[0], b = parts[1];
    view.innerHTML = ''; window.scrollTo(0, 0);
    const finish = () => { setNav(a || ''); document.title = (a === 'm' ? modName(b) + ' · ' : '') + 'Virtual Lab Marketing'; };
    const done = p => { finish(); if (p && p.catch) p.catch(e => { view.append(h('div', { class: 'card err' }, 'Terjadi kesalahan: ' + e.message)); console.error(e); }); };
    try {
      if (!a) return done(home()); else if (a === 'lab') return done(labHome()); else if (a === 'skill') return done(VL.skills.skill(view, b));
      else if (a === 'misi') return done(VL.skills.mission(view, b, parts[2]));
      else if (a === 'sertifikat') return done(VL.certList(view, b));
      else if (a === 'verify') return done(VL.verifyView(view, b));
      else if (a === 'm') moduleView(b); else if (a === 'jurnal') journal();
      else if (a === 'profil') profile(); else if (a === 'admin' && VL.api.isAdmin()) VL.adminView(view); else if (a === 'tentang') about(); else home();
    } catch (e) { view.append(h('div', { class: 'card err' }, 'Terjadi kesalahan: ' + e.message)); console.error(e); }
    finish();
  }
  VL.router = () => { if (!gated()) route(); };
  window.addEventListener('hashchange', () => { if (gated()) VL.boot(); else route(); });
  const isVerify = () => /^#\/verify\b/.test(location.hash);
  const gated = () => VL.api.enabled() && !VL.api.loggedIn() && !isVerify();

  /* Footer & pemasangan */
  const foot = document.getElementById('foot');
  foot.textContent = '© ' + VL.cfg.year + ' ' + VL.cfg.owner + ' · ' + VL.cfg.institution + ' · Simulasi bersifat edukatif.';
  const ib = document.getElementById('installBtn');
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (!embed) ib.hidden = false; });
  ib.addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; ib.hidden = true; });
  window.addEventListener('appinstalled', () => { ib.hidden = true; VL.toast('Aplikasi terpasang'); });
  /* Spanduk ajakan memasang aplikasi di HP */
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  function installBar() {
    if (standalone || embed || VL.store.getG('installDismissed', false) || document.getElementById('installbar')) return;
    const bar = h('div', { class: 'installbar', id: 'installbar' }, h('span', null, isIOS ? 'Pasang di iPhone: ketuk ikon Bagikan, lalu "Tambah ke Layar Utama".' : '📲 Pasang aplikasi ini di HP Anda agar terbuka seperti aplikasi biasa.'),
      deferred ? h('button', { class: 'btn small', onclick: async () => { deferred.prompt(); await deferred.userChoice; deferred = null; bar.remove(); } }, 'Pasang') : null,
      h('button', { class: 'x', 'aria-label': 'Tutup', onclick: () => { VL.store.setG('installDismissed', true); bar.remove(); } }, '×'));
    document.body.insertBefore(bar, document.querySelector('.topbar'));
  }
  window.addEventListener('beforeinstallprompt', () => setTimeout(installBar, 800));
  if (isIOS) setTimeout(installBar, 1500);
  if (inFrame) {
    ib.hidden = false; ib.textContent = 'Buka penuh';
    ib.addEventListener('click', () => window.open(location.href.split('#')[0].replace(/[?&]embed=1/, ''), '_blank'));
  } else if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.navigator.standalone) {
    foot.append(h('div', null, 'iPhone/iPad: ketuk Bagikan → "Tambah ke Layar Utama" untuk memasang.'));
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  document.addEventListener('vl-runs', () => { if (!gated()) setNav((location.hash.replace(/^#\/?/, '').split('/')[0]) || ''); });
  document.addEventListener('vl-authlost', () => { VL.api.clear(); VL.boot('Sesi berakhir. Silakan masuk kembali.'); });

  VL.boot = async function (msg) {
    if (!VL.api.enabled()) { route(); return; }
    if (isVerify()) { route(); return; }
    if (VL.api.loggedIn()) {
      view.innerHTML = ''; view.append(h('div', { class: 'card' }, 'Memeriksa akun…'));
      const r = await VL.api.restore();
      if (r.ok) { route(); VL.api.sync(); if (r.offline) VL.toast('Mode offline'); return; }
      msg = msg || r.error;
    }
    nav.innerHTML = '';
    VL.auth.show(view, msg);
  };
  VL.boot();
})();
