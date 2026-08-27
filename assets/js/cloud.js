/* ============================================================
   Firebase つなぎ役

   ・設定が入っていなければ何もしない（体験版のまま動く）
   ・入っていれば Authentication でログインし、Firestore の中身を
     まるごと手元に写して、画面側は今までどおり同期的に読む
   ・書き込みは put / del だけを通す

   サーバ側の処理（Cloud Functions）は使っていない。
   毎月の課金と督促は Stripe 側の機能で持つ方針のため。
   ============================================================ */
(function (global) {
  'use strict';
  var EZ = global.EZ = global.EZ || {};
  var FBVER = '10.12.2';
  var FB = 'https://www.gstatic.com/firebasejs/' + FBVER + '/';
  var CFG_KEY = 'ezemi.firebase.config';

  /* Firestore 上のコレクション → 手元の db のどこに入るか */
  var LISTS = {
    members: 'members',
    assignments: 'assignments',
    reports: 'reports',
    questions: 'questions',
    messages: 'messages',
    impressions: 'impressions',
    posts: 'posts',
    payments: 'payments',
    notifications: 'notifications',
    adminInbox: 'adminInbox',
    coupons: 'coupons',
    lessons: 'lessons',
    materials: 'materials',
    publicReports: 'publicReports'
  };
  /* 1件しかない設定もの */
  var SINGLES = { settings: 'settings', legal: 'legal', story: 'story', guide: 'guide' };

  /* Firestore にまだ何も入っていないとき、手元の初期値を残しておくもの。
     つないだ直後に講座もクーポンも空になってしまうのを防ぐ。
     会員や配信は「本当に0件」があり得るので、ここには入れない。 */
  var KEEP_IF_EMPTY = { lessons: 1, materials: 1, publicReports: 1, coupons: 1 };

  var fb = null;          /* { app, db, fs, auth, au } */
  var unsubs = [];
  var ready = false;
  var onChange = null;

  function config() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); } catch (e) { return null; }
  }
  function setConfig(v) {
    if (v) localStorage.setItem(CFG_KEY, JSON.stringify(v));
    else localStorage.removeItem(CFG_KEY);
  }
  function configured() {
    var c = config();
    return !!(c && c.apiKey && c.projectId);
  }
  /* file:// では Authentication が動かないので体験版に落とす */
  function usable() {
    return configured() && (location.protocol === 'http:' || location.protocol === 'https:');
  }

  async function init() {
    if (fb) return fb;
    var cfg = config();
    var mods = await Promise.all([
      import(FB + 'firebase-app.js'),
      import(FB + 'firebase-firestore.js'),
      import(FB + 'firebase-auth.js')
    ]);
    var appM = mods[0], fsM = mods[1], auM = mods[2];
    var app = appM.initializeApp(cfg);
    var db;
    try {
      db = fsM.initializeFirestore(app, {
        localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() })
      });
    } catch (e) {
      db = fsM.getFirestore(app);
    }
    fb = { app: app, db: db, fs: fsM, auth: auM.getAuth(app), au: auM };
    return fb;
  }

  /* ---------- ログイン ---------- */
  function watchAuth(cb) {
    return fb.au.onAuthStateChanged(fb.auth, function (u) {
      cb(u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null);
    });
  }
  async function signIn(email, pass) {
    var cr = await fb.au.signInWithEmailAndPassword(fb.auth, email, pass);
    return { uid: cr.user.uid, email: cr.user.email };
  }
  async function signUp(email, pass, name) {
    var cr = await fb.au.createUserWithEmailAndPassword(fb.auth, email, pass);
    if (name) { try { await fb.au.updateProfile(cr.user, { displayName: name }); } catch (e) {} }
    return { uid: cr.user.uid, email: cr.user.email };
  }
  async function signOut() { await fb.au.signOut(fb.auth); }
  async function resetPassword(email) { await fb.au.sendPasswordResetEmail(fb.auth, email); }
  function currentUser() {
    var u = fb && fb.auth && fb.auth.currentUser;
    return u ? { uid: u.uid, email: u.email } : null;
  }

  /* ---------- 読み込み（まるごと写して、あとは同期的に読む） ---------- */
  function stop() {
    unsubs.forEach(function (f) { try { f(); } catch (e) {} });
    unsubs = [];
    ready = false;
  }

  /* 会員として読めるものだけを購読する。管理者はぜんぶ。 */
  /* scope: 'public'（未ログインの公開ページ）/ 'member' / 'admin' */
  function subscribe(db, scope, uid, cb) {
    stop();
    onChange = cb;
    var fs = fb.fs;
    var pending = 0, fired = false;

    function done() {
      if (fired) return;
      pending--;
      if (pending <= 0) { fired = true; ready = true; if (onChange) onChange(); }
    }
    function bump() { if (ready && onChange) onChange(); }

    function listen(name, q, target) {
      pending++;
      var un = fs.onSnapshot(q, function (snap) {
        var arr = [];
        snap.forEach(function (d) { arr.push(Object.assign({ id: d.id }, d.data())); });
        if (arr.length === 0 && KEEP_IF_EMPTY[target] && (db[target] || []).length) {
          /* サーバにまだ入れていないだけ。初期値を残す */
        } else {
          db[target] = arr;
        }
        done(); bump();
      }, function (err) {
        console.warn('[cloud] ' + name + ' の購読に失敗:', err.code || err.message);
        db[target] = db[target] || [];
        done();
      });
      unsubs.push(un);
    }
    function listenDoc(name, target) {
      pending++;
      var un = fs.onSnapshot(fs.doc(fb.db, 'config', name), function (d) {
        if (d.exists()) db[target] = Object.assign({}, db[target], d.data());
        done(); bump();
      }, function (err) {
        console.warn('[cloud] config/' + name + ' の購読に失敗:', err.code || err.message);
        done();
      });
      unsubs.push(un);
    }

    /* 公開してよい設定・読み物 */
    Object.keys(SINGLES).forEach(function (k) { listenDoc(k, k); });
    ['lessons', 'publicReports'].forEach(function (c) {
      listen(c, fs.collection(fb.db, c), LISTS[c]);
    });

    if (scope !== 'public') {
      /* ログインした人だけが読むもの */
      ['materials', 'posts', 'coupons'].forEach(function (c) {
        listen(c, fs.collection(fb.db, c), LISTS[c]);
      });
    }

    if (scope === 'admin') {
      ['members', 'assignments', 'reports', 'questions', 'impressions', 'payments', 'notifications', 'adminInbox', 'messages']
        .forEach(function (c) { listen(c, fs.collection(fb.db, c), LISTS[c]); });
    } else if (scope === 'member') {
      /* 会員は自分の分だけ */
      listen('members', fs.query(fs.collection(fb.db, 'members'), fs.where('id', '==', uid)), 'members');
      ['assignments', 'reports', 'questions', 'impressions', 'payments', 'messages'].forEach(function (c) {
        listen(c, fs.query(fs.collection(fb.db, c), fs.where('memberId', '==', uid)), LISTS[c]);
      });
      db.notifications = [];
      db.adminInbox = [];
    }
    if (pending === 0) { ready = true; if (onChange) onChange(); }
  }

  async function isAdmin(uid) {
    try {
      var d = await fb.fs.getDoc(fb.fs.doc(fb.db, 'admins', uid));
      return d.exists();
    } catch (e) { return false; }
  }

  /* ---------- 書き込み ---------- */
  function clean(obj) {
    /* undefined は Firestore が受け付けないので落とす */
    var out = {};
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v === undefined) return;
      if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = clean(v);
      else out[k] = v;
    });
    return out;
  }
  async function put(coll, id, data) {
    await fb.fs.setDoc(fb.fs.doc(fb.db, coll, String(id)), clean(data), { merge: true });
  }
  async function del(coll, id) {
    await fb.fs.deleteDoc(fb.fs.doc(fb.db, coll, String(id)));
  }
  async function putConfig(name, data) {
    await fb.fs.setDoc(fb.fs.doc(fb.db, 'config', name), clean(data), { merge: true });
  }
  async function getOnce(coll, id) {
    var d = await fb.fs.getDoc(fb.fs.doc(fb.db, coll, String(id)));
    return d.exists() ? Object.assign({ id: d.id }, d.data()) : null;
  }

  EZ.cloud = {
    LISTS: LISTS, SINGLES: SINGLES,
    config: config, setConfig: setConfig, configured: configured, usable: usable,
    init: init, watchAuth: watchAuth, signIn: signIn, signUp: signUp, signOut: signOut,
    resetPassword: resetPassword, currentUser: currentUser, isAdmin: isAdmin,
    subscribe: subscribe, stop: stop, put: put, del: del, putConfig: putConfig, getOnce: getOnce,
    isReady: function () { return ready; }
  };
})(window);
