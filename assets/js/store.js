/* ============================================================
   保存層。いまは localStorage。
   本番では下の read/write だけを Firestore に差し替える。
   （読み書きの入口をここ以外に作らないこと）
   ============================================================ */
(function (global) {
  'use strict';
  var EZ = global.EZ = global.EZ || {};
  var KEY = 'ezemi.v1';
  var CLOCK_KEY = 'ezemi.clockOffset';
  var SESSION_KEY = 'ezemi.session';

  /* ---------- 仮想時計（検証用。本番では Date.now() 固定） ---------- */
  var clock = {
    offset: function () { return Number(localStorage.getItem(CLOCK_KEY) || 0); },
    now: function () { return Date.now() + clock.offset(); },
    date: function () { return new Date(clock.now()); },
    advanceDays: function (d) {
      localStorage.setItem(CLOCK_KEY, String(clock.offset() + d * EZ.DAY));
    },
    reset: function () { localStorage.removeItem(CLOCK_KEY); },
    isShifted: function () { return clock.offset() !== 0; }
  };

  /* ---------- 本体 ---------- */
  var cache = null;

  function read() {
    if (cache) return cache;
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) {
      try { cache = JSON.parse(raw); } catch (e) { cache = null; }
    }
    if (!cache) {
      cache = EZ.buildSeed(Date.now());
      cache.__needsDemo = true;   /* 初回だけデモデータを入れる目印 */
      write();
    }
    return cache;
  }

  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); }
    catch (e) { console.warn('保存に失敗しました', e); }
  }

  function update(fn) {
    var db = read();
    var r = fn(db);
    write();
    return r;
  }

  function reset() {
    cache = EZ.buildSeed(Date.now());
    write();
    clock.reset();
  }

  function uid(prefix) {
    return (prefix || 'x') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  /* ---------- ログイン状態 ---------- */
  var session = {
    get: function () {
      try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null'); }
      catch (e) { return null; }
    },
    set: function (obj, remember) {
      var s = JSON.stringify(obj);
      if (remember) localStorage.setItem(SESSION_KEY, s); else sessionStorage.setItem(SESSION_KEY, s);
    },
    clear: function () {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
  };

  EZ.store = {
    read: read, write: write, update: update, reset: reset, uid: uid,
    clock: clock, session: session,
    KEY: KEY,
    exportJSON: function () { return JSON.stringify(read(), null, 2); },
    importJSON: function (text) {
      var obj = JSON.parse(text);
      if (!obj || !obj.settings) throw new Error('形式が違います');
      cache = obj; write();
    }
  };
})(window);
