/* Modul 5 — Kanvas Strategi: SWOT→TOWS, STP, Persona, BMC, Customer Journey */
(function () {
  'use strict';
  const M = 'strategy';
  const T = (id, title, intro, fields) => ({ label: title, render: p => VL.worksheet(p, { id, module: M, title, intro, fields }) });

  const swot = T('swot-tows', 'SWOT → TOWS',
    'SWOT yang berhenti pada daftar belum menjadi strategi. Isi keempat kuadran dengan bukti (data, kutipan wawancara), lalu silangkan menjadi strategi TOWS.',
    [
      { k: 's', label: 'Strengths (internal)', rows: 3, hint: 'Sumber daya/kemampuan yang nyata dan sulit ditiru.' },
      { k: 'w', label: 'Weaknesses (internal)', rows: 3 },
      { k: 'o', label: 'Opportunities (eksternal)', rows: 3, hint: 'Tren, regulasi, perubahan perilaku — sebutkan sumbernya.' },
      { k: 't', label: 'Threats (eksternal)', rows: 3 },
      { k: 'so', label: 'Strategi SO (pakai kekuatan untuk menangkap peluang)', rows: 3 },
      { k: 'wo', label: 'Strategi WO (atasi kelemahan dengan memanfaatkan peluang)', rows: 3 },
      { k: 'st', label: 'Strategi ST (pakai kekuatan untuk menghadapi ancaman)', rows: 3 },
      { k: 'wt', label: 'Strategi WT (minimalkan kelemahan & hindari ancaman)', rows: 3 },
      { k: 'prio', label: 'Prioritas & alasan', rows: 2, hint: 'Dari semua strategi, mana satu yang dikerjakan lebih dulu dan mengapa?' }]);

  const stp = T('stp-positioning', 'STP & Positioning',
    'Segmentasi → Targeting → Positioning. Targeting memilih; jika semua segmen Anda targetkan, berarti belum memilih.',
    [
      { k: 'dasar', label: 'Dasar segmentasi & variabel', rows: 3, hint: 'Geografis, demografis, psikografis, perilaku — variabel apa yang benar-benar membedakan respons pasar?' },
      { k: 'segmen', label: 'Daftar segmen & profil singkat', rows: 4 },
      { k: 'kriteria', label: 'Evaluasi segmen (ukuran, pertumbuhan, daya beli, keterjangkauan, kecocokan sumber daya)', rows: 4 },
      { k: 'target', label: 'Segmen target & alasan', rows: 3 },
      { k: 'pesaing', label: 'Pesaing langsung & posisinya di benak konsumen', rows: 3 },
      { k: 'sumbu', label: 'Dua sumbu peta persepsi & letak merek-merek', rows: 3, hint: 'mis. harga (murah–mahal) × kualitas (biasa–unggul). Gambar di kertas, tuliskan koordinatnya.' },
      { k: 'positioning', label: 'Pernyataan positioning', rows: 3, hint: 'Untuk [target] yang [kebutuhan], [merek] adalah [kategori] yang [manfaat utama], karena [bukti pendukung].' },
      { k: 'validasi', label: 'Bagaimana Anda akan menguji positioning ini?', rows: 2 }]);

  const persona = T('persona', 'Persona Pelanggan',
    'Persona tanpa data hanyalah asumsi. Wajib cantumkan dasar datanya (wawancara, survei, analitik).',
    [
      { k: 'nama', label: 'Nama persona & ringkasan satu kalimat', type: 'text' },
      { k: 'data', label: 'Dasar data persona ini', rows: 2, hint: 'mis. 8 wawancara, survei n=120, data analitik toko. Jika belum ada: tulis "ASUMSI" dan rencana validasi.' },
      { k: 'demo', label: 'Demografi & konteks hidup', rows: 3 },
      { k: 'tujuan', label: 'Tujuan & hasil yang ingin dicapai (jobs-to-be-done)', rows: 3 },
      { k: 'pain', label: 'Hambatan & kekhawatiran', rows: 3 },
      { k: 'digital', label: 'Perilaku digital (platform, jam aktif, sumber informasi)', rows: 3 },
      { k: 'beli', label: 'Pemicu & keberatan saat membeli', rows: 3 },
      { k: 'jangkau', label: 'Cara menjangkau & pesan yang cocok', rows: 3 }]);

  const bmc = T('bmc', 'Business Model Canvas',
    'Sembilan blok model bisnis. Periksa konsistensi: apakah proposisi nilai benar-benar menjawab kebutuhan segmen, dan apakah pendapatan menutup biaya?',
    [
      { k: 'seg', label: 'Segmen pelanggan', rows: 2 }, { k: 'vp', label: 'Proposisi nilai', rows: 2 }, { k: 'sal', label: 'Saluran', rows: 2 },
      { k: 'hub', label: 'Hubungan pelanggan', rows: 2 }, { k: 'rev', label: 'Arus pendapatan', rows: 2 }, { k: 'res', label: 'Sumber daya utama', rows: 2 },
      { k: 'act', label: 'Aktivitas utama', rows: 2 }, { k: 'par', label: 'Mitra utama', rows: 2 }, { k: 'cost', label: 'Struktur biaya', rows: 2 },
      { k: 'asum', label: 'Tiga asumsi paling berisiko & cara mengujinya', rows: 3 }]);

  const journey = T('journey', 'Customer Journey',
    'Untuk tiap tahap tulis: apa yang pelanggan lakukan, apa yang ia rasakan/hambatannya, dan peluang bagi merek.',
    [
      { k: 'konteks', label: 'Persona & skenario yang dipetakan', rows: 2 },
      { k: 'sadar', label: 'Kesadaran', rows: 3 }, { k: 'timbang', label: 'Pertimbangan', rows: 3 }, { k: 'beli', label: 'Pembelian', rows: 3 },
      { k: 'pasca', label: 'Pasca-pembelian', rows: 3 }, { k: 'advokasi', label: 'Loyalitas & advokasi', rows: 3 },
      { k: 'momen', label: 'Momen kebenaran (titik paling kritis) & rekomendasi perbaikan', rows: 3 }]);

  VL.register({
    id: 'strategy', icon: '🧭', title: 'Kanvas Strategi',
    mk: ['Strategi Pemasaran', 'Manajemen Pemasaran', 'Bisnis Digital'],
    desc: 'Lembar kerja terstruktur: SWOT→TOWS, STP & positioning, persona, business model canvas, dan customer journey. Tersimpan otomatis.',
    render(el) { VL.tabs(el, [swot, stp, persona, bmc, journey]); }
  });
})();
