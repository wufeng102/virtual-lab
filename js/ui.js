/* Unsur visual bersama: ilustrasi garis dan panel masuk (dipakai aplikasi mahasiswa dan Ruang Komando) */
(function () {
  'use strict';
  const { h } = VL;
  const GOLD = '#C9A66B', SKY = '#8E98EA';

  /* Ilustrasi garis pemasaran: target, corong, kurva pertumbuhan, kolom batang. */
  function artMhs() {
    let bars = ''; const hs = [60, 90, 70, 120, 105, 160, 140, 210, 180, 260, 230, 320];
    hs.forEach((v, i) => { bars += '<rect x="' + (50 + i * 36) + '" y="' + (900 - v) + '" width="22" height="' + v + '" fill="none" stroke="#fff" stroke-opacity=".10"/>'; });
    let rings = ''; [55, 105, 165, 235, 315, 405].forEach((r, i) => { rings += '<circle cx="640" cy="190" r="' + r + '" fill="none" stroke="' + GOLD + '" stroke-opacity="' + (0.5 - i * 0.07).toFixed(2) + '"/>'; });
    const pts = [[40, 830], [150, 770], [250, 800], [350, 700], [455, 725], [560, 610], [670, 535], [790, 440]];
    const line = pts.map(p => p.join(',')).join(' '), dots = pts.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" fill="#0A0F63" stroke="' + GOLD + '" stroke-width="1.4"/>').join('');
    let plus = ''; for (let x = 0; x < 6; x++) for (let y = 0; y < 4; y++) { const cx = 60 + x * 44, cy = 80 + y * 44; plus += '<path d="M' + (cx - 4) + ' ' + cy + 'h8M' + cx + ' ' + (cy - 4) + 'v8" stroke="#fff" stroke-opacity=".16"/>'; }
    return '<svg class="art" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + GOLD + '" stop-opacity=".22"/><stop offset="1" stop-color="' + GOLD + '" stop-opacity="0"/></linearGradient></defs>' +
      bars + rings + '<path d="M640 -40V420M230 190H1050" stroke="' + GOLD + '" stroke-opacity=".18"/><circle cx="640" cy="190" r="5" fill="' + GOLD + '"/>' +
      '<path d="M130 470H500L370 700H260Z" fill="none" stroke="' + SKY + '" stroke-opacity=".32"/><path d="M165 540H465M200 610H430" stroke="' + SKY + '" stroke-opacity=".22"/>' +
      '<polygon points="' + line + ' 790,900 40,900" fill="url(#gf)"/><polyline points="' + line + '" fill="none" stroke="' + GOLD + '" stroke-width="1.6"/>' + dots + plus + '</svg>';
  }

  /* Variasi dosen: radar bersegi enam dan jejaring titik (pemantauan). */
  function artDosen() {
    const cx = 600, cy = 270; let hexes = '', spokes = '';
    [60, 115, 175, 240, 310].forEach((r, i) => { const p = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k - Math.PI / 2; p.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); } hexes += '<polygon points="' + p.join(' ') + '" fill="none" stroke="' + GOLD + '" stroke-opacity="' + (0.5 - i * 0.07).toFixed(2) + '"/>'; });
    for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k - Math.PI / 2; spokes += '<path d="M' + cx + ' ' + cy + 'L' + (cx + 310 * Math.cos(a)).toFixed(1) + ' ' + (cy + 310 * Math.sin(a)).toFixed(1) + '" stroke="' + GOLD + '" stroke-opacity=".2"/>'; }
    const prof = [[0, 0.62], [1, 0.86], [2, 0.5], [3, 0.78], [4, 0.9], [5, 0.58]].map(([k, f]) => { const a = Math.PI / 3 * k - Math.PI / 2; return [(cx + 310 * f * Math.cos(a)).toFixed(1), (cy + 310 * f * Math.sin(a)).toFixed(1)]; });
    const shape = prof.map(p => p.join(',')).join(' ');
    const net = [[70, 640], [210, 700], [330, 610], [470, 690], [600, 620], [730, 700]];
    let links = ''; net.forEach((a, i) => { net.forEach((b, j) => { if (j > i && (j - i <= 2)) links += '<path d="M' + a.join(' ') + 'L' + b.join(' ') + '" stroke="' + SKY + '" stroke-opacity=".3"/>'; }); });
    let rows = ''; [0.9, 0.62, 0.78, 0.4, 0.55].forEach((f, i) => { rows += '<rect x="50" y="' + (820 + i * 16) + '" width="' + (f * 340).toFixed(0) + '" height="6" fill="none" stroke="#fff" stroke-opacity=".16"/>'; });
    return '<svg class="art" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      hexes + spokes + '<polygon points="' + shape + '" fill="' + GOLD + '" fill-opacity=".12" stroke="' + GOLD + '" stroke-width="1.6"/>' +
      prof.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" fill="#0A0F63" stroke="' + GOLD + '" stroke-width="1.4"/>').join('') +
      links + net.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#0A0F63" stroke="' + SKY + '" stroke-width="1.3"/>').join('') + rows + '</svg>';
  }

  /* Pita ilustrasi horizontal untuk bagian atas dasbor. */
  function artBand() {
    let rings = ''; [50, 100, 160, 230, 310].forEach((r, i) => { rings += '<circle cx="780" cy="120" r="' + r + '" fill="none" stroke="' + GOLD + '" stroke-opacity="' + (0.5 - i * 0.08).toFixed(2) + '"/>'; });
    const pts = [[330, 220], [420, 180], [500, 196], [590, 140], [680, 150], [770, 90], [860, 60]];
    const line = pts.map(p => p.join(',')).join(' ');
    return '<svg class="art" viewBox="0 0 900 240" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">' + rings +
      '<path d="M780 -60V300M420 120H1200" stroke="' + GOLD + '" stroke-opacity=".16"/><polyline points="' + line + '" fill="none" stroke="' + GOLD + '" stroke-width="1.5"/>' +
      pts.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#0A0F63" stroke="' + GOLD + '" stroke-width="1.3"/>').join('') + '</svg>';
  }

  VL.band = function (title, sub) { return h('section', { class: 'band' }, h('div', { class: 'band-art', html: artBand() }), h('div', { class: 'band-in' }, h('h1', null, title), sub ? h('p', null, sub) : null)); };

  /* Panel masuk dua kolom: kiri ilustrasi + pesan, kanan formulir. */
  VL.gate = function (o) {
    const art = h('aside', { class: 'gate-art' + (o.variant === 'dosen' ? ' dosen' : '') },
      h('div', { class: 'gate-svg', html: o.variant === 'dosen' ? artDosen() : artMhs() }),
      h('div', { class: 'gate-top' }, h('img', { class: 'logo', src: 'assets/logo.png', alt: '', width: 44, height: 44 }), h('span', { class: 'gate-name' }, o.brand)),
      h('div', { class: 'gate-mid' }, h('h1', null, o.title), h('p', null, o.text)),
      h('ul', { class: 'gate-facts' }, o.facts.map(f => h('li', null, h('b', null, f[0]), h('span', null, f[1])))));
    const form = h('section', { class: 'gate-form' }, h('div', { class: 'gate-form-in' }, o.form, o.foot ? h('p', { class: 'gate-foot' }, o.foot) : null));
    return h('div', { class: 'gate' }, art, form);
  };
})();
