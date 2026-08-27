/* ============================================================
   保管庫。2つのモードがある。

     local … このブラウザの中だけ（Firebase を設定する前でも一通り触れる）
     cloud … Firebase Authentication ＋ Firestore（本番）

   画面側は今までどおり read() で同期的に読む。
   cloud のときは Firestore の中身を手元に写してあるので、読み方は変わらない。
   書くときだけ put() / del() を通すこと。
   ============================================================ */
(function (global) {
  'use strict';
  var EZ = global.EZ = global.EZ || {};
  var KEY = 'ezemi.v1';
  var CLOCK_KEY = 'ezemi.clockOffset';
  var SESSION_KEY = 'ezemi.session';

  /* ---------- 仮想時計（体験版の検証用。cloud では常に本物の時刻） ---------- */
  var clock = {
    offset: function () {
      if (mode() === 'cloud') return 0;
      return Number(localStorage.getItem(CLOCK_KEY) || 0);
    },
    now: function () { return Date.now() + clock.offset(); },
    date: function () { return new Date(clock.now()); },
    advanceDays: function (d) { localStorage.setItem(CLOCK_KEY, String(clock.offset() + d * EZ.DAY)); },
    reset: function () { localStorage.removeItem(CLOCK_KEY); },
    isShifted: function () { return clock.offset() !== 0; }
  };

  /* ---------- モード ---------- */
  var _mode = null;
  function mode() {
    if (_mode) return _mode;
    _mode = (EZ.cloud && EZ.cloud.usable()) ? 'cloud' : 'local';
    return _mode;
  }
  function forceLocal() { _mode = 'local'; }

  /* ---------- 本体 ---------- */
  var cache = null;

  function blank() {
    var seed = EZ.buildSeed(Date.now());
    /* cloud では会員も配信もサーバから来る。器だけ用意しておく */
    ['members', 'assignments', 'reports', 'questions', 'impressions',
      'posts', 'payments', 'notifications', 'adminInbox', 'messages'].forEach(function (k) { seed[k] = []; });
    return seed;
  }

  function read() {
    if (cache) return cache;
    if (mode() === 'cloud') { cache = blank(); return cache; }
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) { try { cache = JSON.parse(raw); } catch (e) { cache = null; } }
    if (!cache) {
      cache = EZ.buildSeed(Date.now());
      cache.__needsDemo = true;
      writeLocal();
    }
    return cache;
  }

  function writeLocal() {
    if (mode() === 'cloud') return;
    try { localStorage.setItem(KEY, JSON.stringify(cache)); }
    catch (e) { console.warn('保存に失敗しました', e); }
  }

  function update(fn) {
    var db = read();
    var r = fn(db);
    writeLocal();
    return r;
  }

  function reset() {
    if (mode() === 'cloud') throw new Error('本番につながっているときは初期化できません');
    cache = EZ.buildSeed(Date.now());
    writeLocal();
    clock.reset();
  }

  function uid(prefix) {
    return (prefix || 'x') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  /* ---------- 書き込み ----------
     local では localStorage にまとめて保存されるので put は目印だけ。
     cloud では 1件ずつ Firestore に送る。 */
  var ID_FIELD = { lessons: 'no', coupons: 'code' };
  var CONFIG_DOCS = { settings: 1, legal: 1, story: 1, guide: 1 };

  function idOf(coll, obj) { return String(obj[ID_FIELD[coll] || 'id']); }

  var queue = Promise.resolve();
  function enqueue(fn) {
    queue = queue.then(fn).catch(function (e) {
      console.error('[store] 保存に失敗しました', e);
      if (EZ.ui) EZ.ui.toast('保存できませんでした：' + (e.code || e.message), 'alert');
    });
    return queue;
  }

  /** 1件を保存する。配列にも反映する。 */
  function put(coll, obj) {
    var db = read();
    if (CONFIG_DOCS[coll]) {
      db[coll] = obj;
      writeLocal();
      if (mode() === 'cloud') enqueue(function () { return EZ.cloud.putConfig(coll, obj); });
      return obj;
    }
    if (!Array.isArray(db[coll])) db[coll] = [];
    var key = ID_FIELD[coll] || 'id';
    var i = db[coll].findIndex(function (x) { return String(x[key]) === String(obj[key]); });
    if (i < 0) db[coll].push(obj); else db[coll][i] = obj;
    writeLocal();
    if (mode() === 'cloud') enqueue(function () { return EZ.cloud.put(coll, idOf(coll, obj), obj); });
    return obj;
  }

  function del(coll, id) {
    var db = read();
    var key = ID_FIELD[coll] || 'id';
    db[coll] = (db[coll] || []).filter(function (x) { return String(x[key]) !== String(id); });
    writeLocal();
    if (mode() === 'cloud') enqueue(function () { return EZ.cloud.del(coll, id); });
  }

  /** 書き込みが終わるまで待つ（画面遷移の前などに） */
  function flush() { return queue; }

  /* ---------- ログイン状態（local のときだけ使う） ---------- */
  var session = {
    get: function () {
      try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null'); }
      catch (e) { return null; }
    },
    set: function (obj, remember) {
      /* 保存に失敗しても押した操作が黙って無かったことにならないよう、
         必ずどちらかには置く。両方だめなら呼び出し側に知らせる。 */
      var s = JSON.stringify(obj);
      try {
        if (remember) localStorage.setItem(SESSION_KEY, s); else sessionStorage.setItem(SESSION_KEY, s);
        return true;
      } catch (e) {
        try { sessionStorage.setItem(SESSION_KEY, s); return true; }
        catch (e2) {
          console.warn('ログイン状態を保存できませんでした', e2);
          if (EZ.ui) EZ.ui.toast('ブラウザに保存できませんでした。プライベートウィンドウでは使えないことがあります', 'alert');
          return false;
        }
      }
    },
    clear: function () { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); }
  };

  /* ---------- cloud の起動 ---------- */
  /** Firestore の中身を手元の cache に流し込みはじめる */
  function attachCloud(scope, myUid, onUpdate) {
    cache = cache || blank();
    EZ.cloud.subscribe(cache, scope, myUid, onUpdate);
  }

  EZ.store = {
    read: read, write: writeLocal, update: update, reset: reset, uid: uid,
    put: put, del: del, flush: flush,
    mode: mode, forceLocal: forceLocal, attachCloud: attachCloud,
    clock: clock, session: session, KEY: KEY,
    exportJSON: function () { return JSON.stringify(read(), null, 2); },
    importJSON: function (text) {
      if (mode() === 'cloud') throw new Error('本番につながっているときは読み込めません');
      var obj = JSON.parse(text);
      if (!obj || !obj.settings) throw new Error('形式が違います');
      cache = obj; writeLocal();
    }
  };
})(window);
