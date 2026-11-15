/* Klien API: sesi login, panggilan ke backend Apps Script, sinkron jurnal */
(function () {
  'use strict';
  const VL = window.VL, cfg = VL.cfg;
  const A = VL.api = {};
  const GRACE_DAYS = 14;               // boleh dipakai offline selama ini sejak verifikasi terakhir
  let token = VL.store.getG('token', null);
  let user = VL.store.getG('user', null);
  let syncing = false, timer = null;

  const baseProfile = VL.profile;
  VL.profile = () => user ? { nama: user.nama, nim: user.nim, kelas: user.kelas, mk: user.mk } : baseProfile();

  A.enabled = () => !!cfg.apiUrl;
  A.user = () => user;
  A.setUser = u => { user = Object.assign({}, user, u); VL.store.setG('user', user); };
  A.isAdmin = () => !!user && user.role === 'admin';
  A.loggedIn = () => !!token && !!user;
  A.pending = () => VL.runs().filter(r => !r.synced).length;

  A.call = async function (action, data) {
    const body = JSON.stringify(Object.assign({ action: action, token: token }, data || {}));
    let res;
    try { res = await fetch(cfg.apiUrl, { method: 'POST', body: body, redirect: 'follow' }); }
    catch (e) { return { ok: false, code: 'network', error: 'Tidak dapat terhubung ke server. Periksa koneksi internet.' }; }
    try { return await res.json(); }
    catch (e) { return { ok: false, code: 'bad', error: 'Respons server tidak valid. Periksa deployment Apps Script (akses: Anyone).' }; }
  };

  function setSession(t, u) {
    token = t; user = u;
    VL.store.setG('token', t); VL.store.setG('user', u); VL.store.setG('verified', Date.now());
    VL.store.scope(u ? u.nim : '');
  }
  A.clear = function () { token = null; user = null; VL.store.setG('token', null); VL.store.setG('user', null); VL.store.scope(''); };

  A.register = d => A.call('register', d);
  A.login = async function (nim, password) {
    const r = await A.call('login', { nim: String(nim).trim(), password: password });
    if (r.ok) setSession(r.token, r.user);
    return r;
  };
  A.logout = async function () { try { await A.call('logout'); } catch (e) { /* abaikan */ } A.clear(); };

  A.restore = async function () {
    if (!token || !user) return { ok: false };
    VL.store.scope(user.nim);
    const r = await A.call('me');
    if (r.ok) { user = r.user; VL.store.setG('user', user); VL.store.setG('verified', Date.now()); return { ok: true }; }
    if (r.code === 'network' || r.code === 'bad' || r.code === 'server') {
      const v = VL.store.getG('verified', 0);
      if (Date.now() - v < GRACE_DAYS * 864e5) return { ok: true, offline: true };
      return { ok: false, error: 'Perlu koneksi internet untuk memverifikasi akun Anda.' };
    }
    A.clear();
    return { ok: false, error: r.error };
  };

  A.sync = async function () {
    if (!A.enabled() || !A.loggedIn() || syncing) return { ok: false };
    const todo = VL.runs().filter(r => !r.synced);
    if (!todo.length) return { ok: true, saved: 0 };
    syncing = true;
    const batch = todo.slice(0, 25);
    const r = await A.call('sync', { runs: batch.map(x => ({ id: x.id, ts: x.ts, module: x.module, title: x.title, summary: x.summary, hypothesis: x.hypothesis, reflection: x.reflection, params: x.params, result: x.result })) });
    syncing = false;
    if (r.ok) {
      const all = VL.runs();
      batch.forEach(b => { const x = all.find(y => y.id === b.id); if (x && (x.rev || 1) === (b.rev || 1)) x.synced = true; });
      VL.store.set('runs', all);
      document.dispatchEvent(new Event('vl-sync'));
      if (todo.length > 25) return A.sync();
    } else if (r.code === 'auth') document.dispatchEvent(new Event('vl-authlost'));
    return r;
  };

  document.addEventListener('vl-runs', () => { clearTimeout(timer); timer = setTimeout(A.sync, 1500); });
  window.addEventListener('online', () => { A.sync(); });
})();
