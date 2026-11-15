/* Sertifikat: gambar di kanvas (Inggris), QR verifikasi, PDF, unduh, email, halaman verifikasi publik */
(function () {
  'use strict';
  const { h } = VL;
  const W = 2200, H = 1556;                       // rasio A4 landscape
  const NAVY = '#0a1172', NAVY2 = '#000171', TEAL = '#00b88f', GOLD = '#a8812f', INK = '#1d2140', MUTE = '#5b6080';
  const SERIF = 'Georgia, "Times New Roman", "Noto Serif", serif', SANS = '"Helvetica Neue", Arial, "Noto Sans", sans-serif';
  const C = VL.cert = {};

  const verifyUrl = id => (VL.cfg.appUrl || (location.origin + location.pathname)).replace(/#.*$/, '') + '#/verify/' + id;
  C.verifyUrl = verifyUrl;
  const levelEn = s => s >= 85 ? 'with Distinction' : 'Competent';
  const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

  function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Gagal memuat ' + src)); i.src = src; }); }

  function fit(ctx, text, maxW, size, font, weight) {
    let s = size; ctx.font = (weight || '') + ' ' + s + 'px ' + font;
    while (ctx.measureText(text).width > maxW && s > 20) { s -= 2; ctx.font = (weight || '') + ' ' + s + 'px ' + font; }
    return s;
  }
  function spaced(ctx, text, x, y, gap) {   // teks dengan jarak huruf, rata tengah
    const chars = [...text]; const ws = chars.map(c => ctx.measureText(c).width); const tot = ws.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
    let cx = x - tot / 2; const al = ctx.textAlign; ctx.textAlign = 'left';
    chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += ws[i] + gap; }); ctx.textAlign = al;
  }
  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function corner(ctx, x, y, sx, sy) {      // ornamen sudut: dua chevron mengikuti motif logo
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.lineWidth = 6; ctx.lineCap = 'butt';
    ctx.strokeStyle = NAVY; ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(0, 0); ctx.lineTo(150, 0); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(22, 120); ctx.lineTo(22, 22); ctx.lineTo(120, 22); ctx.stroke();
    ctx.fillStyle = TEAL; ctx.beginPath(); ctx.moveTo(46, 46); ctx.lineTo(86, 46); ctx.lineTo(66, 78); ctx.lineTo(26, 78); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function qrDraw(ctx, text, x, y, size) {
    const q = qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(), pad = 4, cell = size / (n + pad * 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, size, size); ctx.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(Math.round(x + (c + pad) * cell), Math.round(y + (r + pad) * cell), Math.ceil(cell), Math.ceil(cell));
  }
  function seal(ctx, cx, cy, r) {
    ctx.save(); ctx.translate(cx, cy);
    const g = ctx.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); g.addColorStop(0, '#e9d28f'); g.addColorStop(.6, '#c9a24a'); g.addColorStop(1, '#8e6b1f');
    ctx.fillStyle = g; ctx.beginPath(); for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, rr = i % 2 ? r * .93 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * .78, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = NAVY2; ctx.font = '700 ' + r * .34 + 'px ' + SERIF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AV', 0, -r * .12);
    ctx.font = '700 ' + r * .13 + 'px ' + SANS; spaced(ctx, 'MARKETING LAB', 0, r * .28, 2); ctx.font = '700 ' + r * .11 + 'px ' + SANS; spaced(ctx, 'CERTIFIED', 0, r * .5, 3);
    ctx.restore();
  }

  /* cert: {id, nama, judul_en, skor, tanggal, skkni:[{code,title}], bullets:[...]} */
  C.render = async function (cert) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const [logo, sig] = await Promise.all([loadImg('assets/logo.png'), loadImg('assets/signature.png')]);
    // latar
    const bg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, W * .75); bg.addColorStop(0, '#fffdf8'); bg.addColorStop(1, '#f3ecda');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = .035; const wm = 1000; ctx.drawImage(logo, W / 2 - wm / 2, H / 2 - wm / 2 + 20, wm, wm); ctx.restore();
    // bingkai
    ctx.strokeStyle = NAVY; ctx.lineWidth = 14; ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.strokeRect(78, 78, W - 156, H - 156);
    corner(ctx, 96, 96, 1, 1); corner(ctx, W - 96, 96, -1, 1); corner(ctx, 96, H - 96, 1, -1); corner(ctx, W - 96, H - 96, -1, -1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    // kepala
    ctx.drawImage(logo, W / 2 - 85, 108, 170, 170);
    ctx.fillStyle = NAVY; ctx.font = '700 34px ' + SANS; spaced(ctx, 'AZHAR VIRTUAL MARKETING LAB', W / 2, 322, 9);
    ctx.fillStyle = MUTE; ctx.font = '400 26px ' + SANS; spaced(ctx, 'MARKETING SIMULATION & COMPETENCY LAB', W / 2, 360, 5);
    // judul
    ctx.fillStyle = NAVY; ctx.font = '400 108px ' + SERIF; spaced(ctx, 'CERTIFICATE', W / 2, 474, 18);
    ctx.fillStyle = GOLD; ctx.font = '600 34px ' + SANS; spaced(ctx, 'OF COMPLETION' + (cert.skor >= 85 ? '  ·  WITH DISTINCTION' : ''), W / 2, 530, 12);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 340, 566); ctx.lineTo(W / 2 - 24, 566); ctx.moveTo(W / 2 + 24, 566); ctx.lineTo(W / 2 + 340, 566); ctx.stroke();
    ctx.fillStyle = TEAL; ctx.save(); ctx.translate(W / 2, 566); ctx.rotate(Math.PI / 4); ctx.fillRect(-9, -9, 18, 18); ctx.restore();
    // isi
    ctx.fillStyle = MUTE; ctx.font = 'italic 400 34px ' + SERIF; ctx.fillText('This is to certify that', W / 2, 624);
    const nm = String(cert.nama || '').trim(); fit(ctx, nm, 1500, 104, SERIF, '400');
    ctx.fillStyle = NAVY; ctx.fillText(nm, W / 2, 728);
    const nw = Math.min(1500, ctx.measureText(nm).width) + 120; ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - nw / 2, 752); ctx.lineTo(W / 2 + nw / 2, 752); ctx.stroke();
    ctx.fillStyle = MUTE; ctx.font = 'italic 400 34px ' + SERIF; ctx.fillText('has successfully completed the practical skill programme', W / 2, 808);
    const T = cert.judul_en.toUpperCase(); fit(ctx, T, 1700, 64, SANS, '700'); ctx.fillStyle = NAVY; ctx.fillText(T, W / 2, 888);
    // kompetensi
    ctx.fillStyle = INK; ctx.font = '400 27px ' + SANS; let y = 946;
    const bl = []; (cert.bullets || []).slice(0, 3).forEach(b => wrap(ctx, b, 1500).forEach((l, i) => bl.push((i === 0 ? '•  ' : '    ') + l)));
    const bw = Math.max.apply(null, bl.map(l => ctx.measureText(l).width).concat([0])); ctx.textAlign = 'left';
    bl.forEach(l => { ctx.fillText(l, W / 2 - bw / 2, y); y += 36; }); ctx.textAlign = 'center';
    y += 14; ctx.fillStyle = NAVY; ctx.font = '700 30px ' + SANS; ctx.fillText('Overall result: ' + cert.skor + ' / 100  ·  ' + levelEn(cert.skor), W / 2, y);
    y += 40; ctx.fillStyle = MUTE; ctx.font = '400 23px ' + SANS;
    const codes = (cert.skkni || []).map(u => u.code).join(' · ');
    if (codes) wrap(ctx, 'Aligned with SKKNI Marketing (Kepmenakertrans No. 389/2013): ' + codes, 1700).forEach(l => { ctx.fillText(l, W / 2, y); y += 31; });
    // bawah: QR | segel + tanggal | tanda tangan
    const by = 1160, qs = 190, qx = 280;
    qrDraw(ctx, verifyUrl(cert.id), qx, by, qs);
    ctx.fillStyle = MUTE; ctx.font = '400 21px ' + SANS; ctx.fillText('Scan to verify authenticity', qx + qs / 2, by + qs + 30);
    ctx.fillStyle = NAVY; ctx.font = '700 23px ' + SANS; ctx.fillText(cert.id, qx + qs / 2, by + qs + 58);
    seal(ctx, W / 2, by + 86, 90);
    ctx.fillStyle = INK; ctx.font = '400 26px ' + SANS; ctx.fillText('Issued on ' + fmtDate(cert.tanggal), W / 2, by + 214);
    const sx = W - 700, sW = 450, sH = Math.min(150, sW * sig.height / sig.width), sWd = sH * sig.width / sig.height;
    ctx.drawImage(sig, sx + (sW - sWd) / 2, by + 196 - sH - 8, sWd, sH);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, by + 196); ctx.lineTo(sx + sW, by + 196); ctx.stroke();
    ctx.fillStyle = NAVY; ctx.font = '700 32px ' + SERIF; ctx.fillText('Andi Azhar, Ph.D', sx + sW / 2, by + 234);
    ctx.fillStyle = MUTE; ctx.font = '400 21px ' + SANS; ctx.fillText('Founder & Lecturer, Azhar Virtual Marketing Lab', sx + sW / 2, by + 262);
    // catatan kaki
    ctx.fillStyle = MUTE; ctx.font = '400 17px ' + SANS;
    wrap(ctx, 'This certificate confirms completion of simulated practice tasks and AI-assisted assessment in the Azhar Virtual Marketing Lab. It is not a BNSP professional competency certificate. Verify at ' + verifyUrl(cert.id), 1640).forEach((l, i) => ctx.fillText(l, W / 2, 1446 + i * 22));
    return cv;
  };

  /* JPEG → PDF satu halaman A4 landscape (tanpa pustaka) */
  C.toPdf = function (canvas, title) {
    const jpg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]), c => c.charCodeAt(0));
    const enc = new TextEncoder(), parts = [], off = []; let len = 0;
    const add = d => { const b = typeof d === 'string' ? enc.encode(d) : d; parts.push(b); len += b.length; };
    const obj = (n, body, stream) => { off[n] = len; add(n + ' 0 obj\n' + body + (stream ? '\nstream\n' : '\nendobj\n')); if (stream) { add(stream); add('\nendstream\nendobj\n'); } };
    add('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    obj(4, '<< /Type /XObject /Subtype /Image /Width ' + canvas.width + ' /Height ' + canvas.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>', jpg);
    const cs = 'q 842 0 0 595 0 0 cm /Im0 Do Q';
    obj(5, '<< /Length ' + cs.length + ' >>', cs);
    obj(6, '<< /Title (' + String(title).replace(/[()\\]/g, '') + ') /Author (Azhar Virtual Marketing Lab) /Producer (Virtual Lab Marketing) >>');
    const xref = len; let x = 'xref\n0 7\n0000000000 65535 f \n'; for (let i = 1; i <= 6; i++) x += String(off[i]).padStart(10, '0') + ' 00000 n \n';
    add(x + 'trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    const out = new Uint8Array(len); let p = 0; parts.forEach(b => { out.set(b, p); p += b.length; });
    return out;
  };
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const saveBlob = (name, u8, mime) => { const a = h('a', { href: URL.createObjectURL(new Blob([u8], { type: mime })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); };

  /* Data lengkap untuk satu sertifikat (gabung server + definisi skill publik) */
  C.dataFor = function (c, user) {
    const sk = (window.VL_SKILLS || []).find(s => s.id === c.skill) || {};
    return { id: c.id, nama: (user && user.nama) || c.nama, judul_en: c.judul_en, skor: c.skor, tanggal: c.tanggal, skkni: sk.skkni || [], bullets: sk.certBullets || [] };
  };

  /* ---------- Halaman daftar & detail sertifikat ---------- */
  VL.certList = async function (view, id) {
    const u = VL.api.user();
    if (!id) {
      view.append(h('h1', null, 'Sertifikat Saya'));
      const box = h('div', null, 'Memuat…'); view.append(box);
      const st = await VL.api.call('skills_state');
      box.innerHTML = '';
      if (!st.ok) { box.append(h('div', { class: 'card err' }, st.error)); return; }
      if (!st.certs.length) { box.append(h('div', { class: 'card' }, 'Belum ada sertifikat. Selesaikan semua misi pada satu skill; sertifikat terbit setelah disetujui dosen.', h('p', null, h('a', { class: 'btn primary', href: '#/' }, 'Mulai Jalur Skill')))); return; }
      st.certs.forEach(c => box.append(h('a', { class: 'card certrow', href: '#/sertifikat/' + c.id }, h('b', null, '🎓 ' + c.judul_en), h('div', { class: 'muted small' }, c.id + ' · skor ' + c.skor + ' · ' + new Date(c.tanggal).toLocaleDateString('id-ID')), c.status !== 'valid' ? h('span', { class: 'pill st-' + (c.status === 'menunggu' ? 'pending' : 'blocked') }, { menunggu: 'menunggu persetujuan dosen', ditolak: 'belum disetujui', dicabut: 'dicabut' }[c.status] || c.status) : null)));
      return;
    }
    view.append(h('p', null, h('a', { href: '#/sertifikat' }, '← Semua sertifikat')));
    const st = await VL.api.call('skills_state');
    const cert = st.ok && st.certs.find(c => c.id === id);
    if (!cert) { view.append(h('div', { class: 'card err' }, 'Sertifikat tidak ditemukan.')); return; }
    if (cert.status === 'menunggu') { view.append(h('div', { class: 'card note' }, h('h3', null, '⏳ Menunggu persetujuan dosen'), h('p', null, 'Sertifikat "' + cert.judul_en + '" (skor ' + cert.skor + ') sedang diperiksa dosen. Anda akan menerima email begitu disetujui, dan sertifikat dapat diunduh di halaman ini.'))); return; }
    if (cert.status === 'ditolak') { view.append(h('div', { class: 'card err' }, h('h3', null, 'Belum disetujui'), h('p', null, cert.catatan || 'Hubungi dosen untuk keterangan lebih lanjut.'))); return; }
    if (cert.status !== 'valid') view.append(h('div', { class: 'card err' }, 'Sertifikat ini telah dicabut oleh penerbit.'));
    const holder = h('div', { class: 'certbox' }, h('div', { class: 'muted' }, 'Menyiapkan sertifikat…')); view.append(holder);
    let cv; try { cv = await C.render(C.dataFor(cert, u)); } catch (e) { holder.innerHTML = ''; holder.append(h('div', { class: 'card err' }, 'Gagal membuat gambar sertifikat: ' + e.message)); return; }
    cv.style.width = '100%'; cv.style.height = 'auto'; cv.className = 'certcanvas'; holder.innerHTML = ''; holder.append(cv);
    const msg = h('div', { class: 'small' });
    const pdf = () => C.toPdf(cv, 'Certificate ' + cert.id);
    const emailBtn = h('button', { class: 'btn primary', onclick: async () => {
      emailBtn.disabled = true; msg.textContent = 'Mengirim email…'; msg.className = 'small';
      const r = await VL.api.call('email_cert', { id: cert.id, pdf: b64(pdf()) });
      emailBtn.disabled = false;
      if (r.ok) { msg.textContent = '✓ Terkirim ke ' + r.to + '. Periksa juga folder spam.'; msg.className = 'small ok'; } else { msg.textContent = '✗ ' + r.error; msg.className = 'small bad'; }
    } }, '✉️ Kirim ke email saya');
    view.append(h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: () => saveBlob('Certificate-' + cert.id + '.pdf', pdf(), 'application/pdf') }, '⬇️ Unduh PDF'),
      h('button', { class: 'btn', onclick: () => cv.toBlob(b => { const a = h('a', { href: URL.createObjectURL(b), download: 'Certificate-' + cert.id + '.png' }); document.body.append(a); a.click(); setTimeout(() => a.remove(), 500); }, 'image/png') }, 'Unduh gambar'),
      emailBtn,
      h('button', { class: 'btn', onclick: async () => { const url = verifyUrl(cert.id); try { if (navigator.share) await navigator.share({ title: cert.judul_en, text: 'Sertifikat ' + cert.id, url }); else { await navigator.clipboard.writeText(url); VL.toast('Tautan verifikasi disalin'); } } catch (e) { /* dibatalkan */ } } }, 'Bagikan tautan verifikasi')), msg);
    const em = h('input', { type: 'email', value: (u && u.email) || '', placeholder: 'email@contoh.ac.id' });
    view.append(h('div', { class: 'card' }, h('h3', null, 'Alamat email penerima'), h('p', { class: 'muted small' }, 'Sertifikat hanya dikirim ke email terdaftar Anda. Salah ketik? Perbaiki di sini.'), VL.field('Email', em),
      h('button', { class: 'btn', onclick: async () => { const r = await VL.api.call('set_email', { email: em.value }); if (r.ok) { VL.toast('Email disimpan'); } else VL.toast(r.error); } }, 'Simpan email')));
    view.append(h('div', { class: 'card note small' }, 'Keaslian sertifikat dicek lewat QR Code: siapa pun yang memindainya akan melihat nama pemegang, skill, tanggal, dan status dari server. Salinan yang diedit tidak akan cocok dengan catatan server.'));
  };

  /* ---------- Verifikasi publik (tanpa login) ---------- */
  VL.verifyView = async function (view, id) {
    view.append(h('h1', null, 'Verifikasi Sertifikat'));
    const input = h('input', { type: 'text', value: id || '', placeholder: 'AVL-2026-XXXXXXXX', autocapitalize: 'characters' });
    const out = h('div');
    async function go() {
      const v = input.value.trim().toUpperCase(); out.innerHTML = ''; if (!v) return;
      out.append(h('div', { class: 'card' }, 'Memeriksa…'));
      const r = await VL.api.call('verify', { id: v }); out.innerHTML = '';
      if (!r.ok) { out.append(h('div', { class: 'card err' }, r.error)); return; }
      if (!r.found) { out.append(h('div', { class: 'card err' }, h('h3', null, '✗ Tidak ditemukan'), h('p', null, 'Nomor ' + v + ' tidak tercatat di Azhar Virtual Marketing Lab. Sertifikat ini tidak dapat dinyatakan asli.'))); return; }
      out.append(h('div', { class: 'card ' + (r.valid ? 'verified' : 'err') },
        h('h3', null, r.valid ? '✓ Sertifikat asli dan berlaku' : '✗ Sertifikat telah dicabut'),
        VL.table(['Data', 'Keterangan'], [['Pemegang', r.nama], ['NIM', r.nim], ['Skill', r.judul_en + ' (' + r.judul + ')'], ['Hasil', r.skor + '/100 · ' + (r.skor >= 85 ? 'Distinction' : 'Competent')], ['Diterbitkan', new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })], ['Nomor', r.id], ['Penerbit', r.issuer + ', Azhar Virtual Marketing Lab, Universitas Muhammadiyah Bengkulu'], ['Selaras dengan', (r.skkni || []).map(u => u.code + ' ' + u.title).join('; ') || '–']]),
        h('p', { class: 'muted small' }, 'Sertifikat ini menyatakan penyelesaian tugas praktik di Azhar Virtual Marketing Lab. Bukan sertifikat kompetensi BNSP.')));
    }
    view.append(h('div', { class: 'card' }, VL.field('Nomor sertifikat', input), h('button', { class: 'btn primary', onclick: go }, 'Periksa')), out);
    if (id) go();
  };
})();
