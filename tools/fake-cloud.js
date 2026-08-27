/* ============================================================
   本番つなぎの動作確認用。Firebase の代わりに、同じ形の偽物を差し込む。
   ブラウザのアドレスに ?faketest=1 を付けたときだけ効く。
   本番の動きには一切関わらない（読み込まれもしない）。
   ============================================================ */
(function (global) {
  'use strict';
  if (location.search.indexOf('faketest=1') < 0) return;
  var EZ = global.EZ = global.EZ || {};
  var KEY = 'ezemi.faketest.db';
  var UKEY = 'ezemi.faketest.user';

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }
  var docs = load();                       /* { "coll/id": {...} } */
  var users = {};                          /* email -> {uid,pass} */
  try { users = JSON.parse(localStorage.getItem('ezemi.faketest.users') || '{}'); } catch (e) {}
  function saveUsers() { localStorage.setItem('ezemi.faketest.users', JSON.stringify(users)); }

  var authCb = null, cur = null;
  try { cur = JSON.parse(localStorage.getItem(UKEY) || 'null'); } catch (e) {}

  var listeners = [];
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }

  function coll(name) {
    return Object.keys(docs)
      .filter(function (k) { return k.indexOf(name + '/') === 0; })
      .map(function (k) { return docs[k]; });
  }

  EZ.cloud = {
    LISTS: {}, SINGLES: {},
    config: function () { return { apiKey: 'fake', projectId: 'faketest' }; },
    setConfig: function () {},
    configured: function () { return true; },
    usable: function () { return true; },
    init: function () { return Promise.resolve(true); },
    isReady: function () { return true; },
    currentUser: function () { return cur; },

    watchAuth: function (cb) { authCb = cb; setTimeout(function () { cb(cur); }, 0); return function () {}; },
    signIn: function (email, pass) {
      var u = users[email.toLowerCase()];
      if (!u || u.pass !== pass) return Promise.reject({ code: 'auth/invalid-credential' });
      cur = { uid: u.uid, email: email };
      localStorage.setItem(UKEY, JSON.stringify(cur));
      if (authCb) authCb(cur);
      return Promise.resolve(cur);
    },
    signUp: function (email, pass, name) {
      var k = email.toLowerCase();
      if (users[k]) return Promise.reject({ code: 'auth/email-already-in-use' });
      if ((pass || '').length < 6) return Promise.reject({ code: 'auth/weak-password' });
      var uid = 'fake_' + Math.random().toString(36).slice(2, 10);
      users[k] = { uid: uid, pass: pass, name: name }; saveUsers();
      cur = { uid: uid, email: email };
      localStorage.setItem(UKEY, JSON.stringify(cur));
      if (authCb) authCb(cur);
      return Promise.resolve(cur);
    },
    signOut: function () {
      cur = null; localStorage.removeItem(UKEY);
      if (authCb) authCb(null);
      return Promise.resolve();
    },
    resetPassword: function () { return Promise.resolve(); },
    isAdmin: function (uid) { return Promise.resolve(!!docs['admins/' + uid]); },

    subscribe: function (db, scope, uid, cb) {
      function fill() {
        ['settings', 'legal', 'story', 'guide'].forEach(function (k) {
          if (docs['config/' + k]) db[k] = docs['config/' + k];
        });
        function fillList(c, keepIfEmpty) {
          var a = coll(c);
          if (a.length === 0 && keepIfEmpty && (db[c] || []).length) return;
          db[c] = a;
        }
        ['lessons', 'publicReports'].forEach(function (c) { fillList(c, true); });
        if (scope !== 'public') {
          fillList('materials', true); fillList('coupons', true); fillList('posts', false);
        }
        if (scope === 'admin') {
          ['members', 'assignments', 'reports', 'questions', 'impressions', 'payments', 'notifications', 'adminInbox', 'messages']
            .forEach(function (c) { db[c] = coll(c); });
        } else if (scope === 'member') {
          db.members = coll('members').filter(function (x) { return x.id === uid; });
          ['assignments', 'reports', 'questions', 'impressions', 'payments', 'messages'].forEach(function (c) {
            db[c] = coll(c).filter(function (x) { return x.memberId === uid; });
          });
          db.notifications = []; db.adminInbox = [];
        }
      }
      var fn = function () { fill(); cb(); };
      listeners.push(fn);
      fill();
      setTimeout(cb, 0);
    },
    stop: function () { listeners = []; },
    put: function (c, id, data) { docs[c + '/' + id] = JSON.parse(JSON.stringify(data)); save(docs); setTimeout(emit, 0); return Promise.resolve(); },
    del: function (c, id) { delete docs[c + '/' + id]; save(docs); setTimeout(emit, 0); return Promise.resolve(); },
    putConfig: function (n, data) { docs['config/' + n] = JSON.parse(JSON.stringify(data)); save(docs); setTimeout(emit, 0); return Promise.resolve(); },
    getOnce: function (c, id) { return Promise.resolve(docs[c + '/' + id] || null); },

    /* テスト用 */
    _docs: function () { return docs; },
    _makeAdmin: function (uid) { docs['admins/' + uid] = { id: uid }; save(docs); },
    _wipe: function () { docs = {}; users = {}; cur = null; save(docs); saveUsers(); localStorage.removeItem(UKEY); }
  };
  console.log('[faketest] 偽の Firebase を差し込みました');
})(window);
