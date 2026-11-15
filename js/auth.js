/* Layar masuk & pendaftaran */
(function () {
  'use strict';
  const { h } = VL;
  const MK = ['Strategi Pemasaran', 'Pemasaran Digital', 'Manajemen Pemasaran', 'Bisnis Digital'];

  VL.auth = {
    show(container, message) {
      container.innerHTML = '';
      document.body.classList.add('gated');
      const host = h('div');
      const form = h('div', null, h('h2', null, 'Selamat datang'), h('p', { class: 'lede' }, 'Masuk dengan NIM Anda, atau daftar bila belum punya akun. Akun aktif setelah disetujui dosen pengampu.'));
      if (message) form.append(h('div', { class: 'card note' }, message));
      form.append(host);
      container.append(VL.gate({
        brand: 'Azhar Virtual Marketing Lab',
        title: 'Berlatih memasarkan seperti di tempat kerja.',
        text: 'Analisis penjualan, rapat strategi, sampai menangani keluhan pelanggan, dengan kasus yang dibuat ulang setiap sesi dan dinilai memakai rubrik kompetensi.',
        facts: [['13 skill', 'Dari analisis pasar sampai rencana pemasaran terpadu, disusun berurutan.'], ['Sesi terjaga', 'Keluar dari aplikasi di tengah sesi membatalkan sesi dan mengganti kasusnya.'], ['Sertifikat', 'Terbit setelah disetujui dosen, dengan QR untuk verifikasi keasliannya.']],
        form: form,
        foot: 'Lab ini bukan bagian dari lembaga sertifikasi profesi. Sertifikatnya menyatakan penyelesaian latihan, bukan sertifikasi kompetensi BNSP.'
      }));
      VL.tabs(host, [{ label: 'Masuk', render: loginUI }, { label: 'Daftar', render: registerUI }]);
    }
  };

  function loginUI(p) {
    const nim = h('input', { type: 'text', autocomplete: 'username', autocapitalize: 'off', placeholder: 'Contoh: 2021010123' });
    const pw = h('input', { type: 'password', autocomplete: 'current-password' });
    const msg = h('div'); const btn = h('button', { class: 'btn primary' }, 'Masuk');
    async function go() {
      msg.innerHTML = ''; btn.disabled = true; btn.textContent = 'Memeriksa…';
      const r = await VL.api.login(nim.value, pw.value);
      btn.disabled = false; btn.textContent = 'Masuk';
      if (r.ok) { VL.boot(); return; }
      const cls = r.code === 'pending' ? 'card note' : 'card err';
      msg.append(h('div', { class: cls }, r.error || 'Gagal masuk.'));
    }
    btn.addEventListener('click', go);
    pw.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    p.append(h('div', { class: 'card' }, VL.field('NIM', nim), VL.field('Sandi', pw), btn, msg,
      h('p', { class: 'muted small' }, 'Lupa sandi? Hubungi dosen untuk reset. Setelah 5 kali salah, akun dikunci sementara.')));
  }

  function registerUI(p) {
    const f = { nama: h('input', { type: 'text', autocomplete: 'name' }), nim: h('input', { type: 'text', autocapitalize: 'off' }), kelas: h('input', { type: 'text', placeholder: 'mis. Manajemen 5A' }), email: h('input', { type: 'email', autocomplete: 'email' }), pw: h('input', { type: 'password', autocomplete: 'new-password' }), pw2: h('input', { type: 'password', autocomplete: 'new-password' }) };
    const mk = VL.select([['', '— pilih —'], ...MK.map(m => [m, m])], '');
    const ok = h('input', { type: 'checkbox' });
    const msg = h('div'); const btn = h('button', { class: 'btn primary' }, 'Kirim pendaftaran');
    btn.addEventListener('click', async () => {
      msg.innerHTML = '';
      const fail = t => msg.append(h('div', { class: 'card err' }, t));
      if (!f.nama.value.trim() || !f.nim.value.trim() || !f.kelas.value.trim() || !mk.value || !f.email.value.trim()) return fail('Lengkapi nama, NIM, kelas, mata kuliah, dan email.');
      if (f.pw.value !== f.pw2.value) return fail('Konfirmasi sandi tidak sama.');
      if (f.pw.value.length < 8) return fail('Sandi minimal 8 karakter.');
      if (!ok.checked) return fail('Centang persetujuan terlebih dahulu.');
      btn.disabled = true; btn.textContent = 'Mengirim…';
      const r = await VL.api.register({ nama: f.nama.value, nim: f.nim.value, kelas: f.kelas.value, mk: mk.value, email: f.email.value, password: f.pw.value });
      btn.disabled = false; btn.textContent = 'Kirim pendaftaran';
      if (!r.ok) return fail(r.error || 'Pendaftaran gagal.');
      p.innerHTML = '';
      p.append(h('div', { class: 'card note' }, h('h3', null, 'Pendaftaran terkirim'), h('p', null, 'Dosen akan memeriksa data Anda. Setelah disetujui, masuklah dengan NIM dan sandi yang baru Anda buat. Persetujuan dilakukan dosen secara manual; tanyakan ke dosen bila belum disetujui.')));
    });
    p.append(h('div', { class: 'card' },
      h('div', { class: 'cols' }, VL.field('Nama lengkap', f.nama), VL.field('NIM', f.nim, '5–20 huruf/angka'), VL.field('Kelas', f.kelas), VL.field('Mata kuliah', mk), VL.field('Email', f.email, 'Wajib. Sertifikat dan pemberitahuan dikirim ke sini.')),
      h('div', { class: 'cols' }, VL.field('Sandi', f.pw, 'Minimal 8 karakter. Jangan pakai sandi yang sama dengan akun lain.'), VL.field('Ulangi sandi', f.pw2)),
      h('label', { class: 'fld', style: 'display:flex;gap:.4rem;align-items:flex-start' }, ok, 'Saya memahami bahwa jurnal yang saya simpan (hipotesis, hasil, refleksi) dikirim ke dosen untuk keperluan pembelajaran dan penilaian.'),
      btn, msg));
  }
})();
