/* Panel admin: persetujuan pendaftar, kelola akun, lihat kiriman jurnal */
(function () {
  'use strict';
  const { h, fmt } = VL;
  const A = () => VL.api;
  const dt = s => s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '–';
  const pill = s => h('span', { class: 'pill st-' + s }, { pending: 'menunggu', approved: 'disetujui', rejected: 'ditolak', blocked: 'diblokir' }[s] || s);
  const modName = id => (VL.modules.find(m => m.id === id) || {}).title || id;

  VL.adminView = async function (view) {
    view.append(h('h1', null, 'Panel Admin'));
    const body = h('div', null, h('div', { class: 'card' }, 'Memuat…')); view.append(body);
    let data;
    async function load() {
      const r = await A().call('admin_list');
      if (!r.ok) { body.innerHTML = ''; body.append(h('div', { class: 'card err' }, r.error || 'Gagal memuat.')); return false; }
      data = r; return true;
    }
    async function render() {
      if (!(await load())) return;
      body.innerHTML = '';
      const u = data.users, cnt = s => u.filter(x => x.status === s && x.role !== 'admin').length;
      body.append(h('div', { class: 'kpis' }, VL.kpi('Menunggu', cnt('pending'), cnt('pending') ? 'bad' : ''), VL.kpi('Disetujui', cnt('approved'), 'good'), VL.kpi('Ditolak/diblokir', cnt('rejected') + cnt('blocked')), VL.kpi('Total mahasiswa', u.filter(x => x.role !== 'admin').length)));
      const host = h('div'); body.append(host);
      VL.tabs(host, [{ label: 'Menunggu (' + cnt('pending') + ')', render: pendingUI }, { label: 'Mahasiswa', render: studentsUI }, { label: 'Kiriman jurnal', render: runsUI }, { label: 'Sertifikat', render: certsUI }]);
    }
    async function setStatus(nim, status) {
      const r = await A().call('admin_set_status', { nim, status });
      VL.toast(r.ok ? 'Status diperbarui' : r.error); if (r.ok) render();
    }

    function pendingUI(p) {
      const list = data.users.filter(x => x.status === 'pending');
      if (!list.length) { p.append(h('div', { class: 'card' }, 'Tidak ada pendaftar yang menunggu.')); return; }
      const boxes = list.map(x => { const c = h('input', { type: 'checkbox' }); return { x, c }; });
      const ros = data.roster_ada;
      const head = ['', 'NIM', 'Nama', 'Kelas', 'Mata kuliah'].concat(ros ? ['Di roster'] : [], ['Daftar', '']);
      const rows = boxes.map(({ x, c }) => [c, x.nim, x.nama, x.kelas, x.mk].concat(ros ? [x.di_roster ? '✓' : '✗ tidak ada'] : [], [dt(x.dibuat), h('button', { class: 'btn small danger', onclick: () => setStatus(x.nim, 'rejected') }, 'Tolak')]));
      const sel = fn => () => boxes.forEach(b => { b.c.checked = fn(b.x); });
      p.append(h('div', { class: 'card' },
        h('div', { class: 'row' },
          h('button', { class: 'btn small', onclick: sel(() => true) }, 'Pilih semua'), ros ? h('button', { class: 'btn small', onclick: sel(x => x.di_roster) }, 'Pilih yang ada di roster') : null,
          h('button', { class: 'btn small', onclick: sel(() => false) }, 'Kosongkan'),
          h('button', { class: 'btn primary small', onclick: async () => {
            const nims = boxes.filter(b => b.c.checked).map(b => b.x.nim); if (!nims.length) { VL.toast('Belum ada yang dipilih'); return; }
            if (!confirm('Setujui ' + nims.length + ' pendaftar?')) return;
            const r = await A().call('admin_bulk_approve', { nims }); VL.toast(r.ok ? r.approved + ' disetujui' : r.error); render();
          } }, 'Setujui terpilih')),
        VL.table(head, rows),
        h('p', { class: 'muted small' }, ros ? 'Kolom "Di roster" membandingkan NIM dengan lembar Roster di Google Sheet Anda. Tetap periksa nama dan kelas sebelum menyetujui.' : 'Tip: isi lembar "Roster" (nim, nama, kelas) di Google Sheet agar pendaftar yang cocok dengan daftar kelas ditandai.')));
    }

    function studentsUI(p) {
      const q = h('input', { type: 'text', placeholder: 'Cari NIM atau nama…' }); const box = h('div');
      function draw() {
        box.innerHTML = ''; const s = q.value.trim().toLowerCase();
        const list = data.users.filter(x => x.role !== 'admin' && (!s || x.nim.toLowerCase().includes(s) || String(x.nama).toLowerCase().includes(s)));
        box.append(VL.table(['NIM', 'Nama', 'Kelas', 'Status', 'Akses sampai', 'Login terakhir', 'Entri', 'Tindakan'], list.map(x => [x.nim, x.nama, x.kelas, pill(x.status), x.akses_sampai ? dt(x.akses_sampai) : 'tanpa batas', dt(x.login_terakhir), x.entri,
          h('span', { class: 'row', style: 'margin:0' },
            x.status === 'approved' ? h('button', { class: 'btn small', onclick: () => confirm('Blokir ' + x.nama + '?') && setStatus(x.nim, 'blocked') }, 'Blokir') : h('button', { class: 'btn small', onclick: () => setStatus(x.nim, 'approved') }, 'Setujui'),
            h('button', { class: 'btn small', onclick: async () => { if (!confirm('Reset sandi ' + x.nama + '? Sesi aktifnya akan dikeluarkan.')) return; const r = await A().call('admin_reset_password', { nim: x.nim }); if (!r.ok) { VL.toast(r.error); return; } VL.modal('Sandi sementara', h('div', null, h('p', null, 'Berikan ke ' + x.nama + ' lewat jalur pribadi, lalu minta ia menggantinya di menu Profil.'), h('pre', { class: 'out' }, r.temp_password), h('p', { class: 'muted small' }, 'Sandi ini hanya ditampilkan sekali.')), [{ label: 'Tutup', kind: 'primary' }]); } }, 'Reset sandi'),
            h('button', { class: 'btn small', onclick: async () => { const v = prompt('Akses berlaku sampai tanggal (YYYY-MM-DD). Kosongkan untuk tanpa batas:', x.akses_sampai ? x.akses_sampai.slice(0, 10) : ''); if (v === null) return; const r = await A().call('admin_extend', { nim: x.nim, until: v.trim() }); VL.toast(r.ok ? 'Tersimpan' : r.error); if (r.ok) render(); } }, 'Atur akses'))])));
      }
      q.addEventListener('input', draw); p.append(h('div', { class: 'card' }, VL.field('Cari', q), box)); draw();
    }

    function runsUI(p) {
      const mod = VL.select([['', 'Semua modul'], ...VL.modules.map(m => [m.id, m.title])], ''); const nim = h('input', { type: 'text', placeholder: 'NIM (opsional)' });
      const out = h('div'); let last = [];
      async function go() {
        out.innerHTML = ''; out.append('Memuat…');
        const r = await A().call('admin_runs', { modul: mod.value, nim: nim.value.trim(), limit: 200 });
        out.innerHTML = ''; if (!r.ok) { out.append(h('div', { class: 'card err' }, r.error)); return; }
        last = r.runs;
        out.append(h('p', { class: 'muted small' }, 'Menampilkan ' + r.runs.length + ' dari ' + r.total + ' entri (terbaru dulu).'));
        r.runs.forEach(x => out.append(h('div', { class: 'card entry' }, h('h3', null, x.judul), h('div', { class: 'muted small' }, x.nama + ' · ' + x.nim + ' · ' + x.kelas + ' · ' + modName(x.modul) + ' · ' + dt(x.waktu)), x.ringkasan ? h('p', null, x.ringkasan) : null, x.hipotesis ? h('p', null, h('b', null, 'Hipotesis: '), x.hipotesis) : null, x.refleksi ? h('p', null, h('b', null, 'Refleksi: '), x.refleksi) : h('p', { class: 'muted small' }, 'Belum ada refleksi.'))));
      }
      p.append(h('div', { class: 'card' }, h('div', { class: 'cols' }, VL.field('Modul', mod), VL.field('NIM', nim)),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: go }, 'Tampilkan'), h('button', { class: 'btn', onclick: () => last.length ? VL.download('kiriman-jurnal.csv', VL.csv([['nim', 'nama', 'kelas', 'modul', 'waktu', 'judul', 'ringkasan', 'hipotesis', 'refleksi'], ...last.map(x => [x.nim, x.nama, x.kelas, modName(x.modul), x.waktu, x.judul, x.ringkasan, x.hipotesis, x.refleksi])]), 'text/csv') : VL.toast('Tampilkan data dulu') }, 'Unduh CSV')),
        h('p', { class: 'muted small' }, 'Catatan: isi jurnal dikirim dari perangkat mahasiswa dan dapat diubah oleh mereka. Perlakukan sebagai bukti proses belajar, bukan catatan yang tak bisa dipalsukan.')), out);
      go();
    }
    async function certsUI(p) {
      p.append('Memuat…');
      const [c, pr] = await Promise.all([A().call('admin_certs'), A().call('admin_progress')]); p.innerHTML = '';
      if (!c.ok) { p.append(h('div', { class: 'card err' }, c.error)); return; }
      const nm = {}; data.users.forEach(u => { nm[u.nim] = u.nama; });
      p.append(h('div', { class: 'card' }, h('h3', null, 'Progres mahasiswa'), VL.table(['NIM', 'Nama', 'Misi lulus', 'Rata-rata', 'Sertifikat'], (pr.rows || []).sort((a, b) => b.misi_lulus - a.misi_lulus).map(x => [x.nim, nm[x.nim] || '', x.misi_lulus, x.rata, x.sertifikat]))));
      p.append(h('div', { class: 'card' }, h('h3', null, 'Sertifikat terbit (' + c.certs.length + ')'), VL.table(['Nomor', 'Nama', 'Skill', 'Skor', 'Tanggal', 'Email', 'Status', ''], c.certs.map(x => [x.id, x.nama, x.judul_en, x.skor, dt(x.tanggal), x.email_terkirim + '×', pill(x.status === 'valid' ? 'approved' : 'blocked'),
        h('button', { class: 'btn small', onclick: async () => { const to = x.status === 'valid' ? 'dicabut' : 'valid'; if (!confirm((to === 'dicabut' ? 'Cabut' : 'Pulihkan') + ' sertifikat ' + x.id + '?')) return; const r = await A().call('admin_cert_status', { id: x.id, status: to }); VL.toast(r.ok ? 'Diperbarui' : r.error); if (r.ok) { p.innerHTML = ''; certsUI(p); } } }, x.status === 'valid' ? 'Cabut' : 'Pulihkan')]))));
    }
    render();
  };
})();
