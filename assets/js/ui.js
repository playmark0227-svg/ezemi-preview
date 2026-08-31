/* ============================================================
   画面まわりの共通部品
   ============================================================ */
(function (global) {
  'use strict';
  var EZ = global.EZ = global.EZ || {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function toast(msg, kind) {
    var host = $('#toast');
    if (!host) { host = document.createElement('div'); host.id = 'toast'; document.body.appendChild(host); }
    var el = document.createElement('div');
    el.className = 'toast' + (kind === 'alert' ? ' alert' : '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () { el.remove(); }, 3800);
  }

  function modal(html, opts) {
    opts = opts || {};
    var bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal' + (opts.wide ? ' modal-wide' : '') + '">' + html + '</div>';
    document.body.appendChild(bg);
    wrapWideTables(bg);
    document.body.style.overflow = 'hidden';
    function close() { bg.remove(); document.body.style.overflow = ''; if (opts.onClose) opts.onClose(); }
    bg.addEventListener('click', function (e) { if (e.target === bg && !opts.sticky) close(); });
    bg.close = close;
    $$('[data-close]', bg).forEach(function (b) { b.addEventListener('click', close); });
    return bg;
  }

  function confirmBox(title, message, okLabel) {
    return new Promise(function (resolve) {
      var m = modal(
        '<h3 class="ttl-s" style="margin-bottom:12px">' + esc(title) + '</h3>' +
        '<p class="small" style="color:var(--ink-2);margin-bottom:24px">' + nl2br(message) + '</p>' +
        '<div class="row" style="justify-content:flex-end">' +
        '<button class="btn btn-ghost btn-s" data-no>やめる</button>' +
        '<button class="btn btn-fill btn-s" data-yes>' + esc(okLabel || '実行する') + '</button></div>',
        { sticky: true });
      $('[data-no]', m).addEventListener('click', function () { m.close(); resolve(false); });
      $('[data-yes]', m).addEventListener('click', function () { m.close(); resolve(true); });
    });
  }

  function download(name, text, mime) {
    var blob = new Blob(['﻿' + text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- 試作版の案内 ---------- */
  var GUIDE_HTML =
    '<span class="eyebrow">試作版 v0.1</span>' +
    '<h3 class="ttl-s" style="margin-bottom:16px">この画面の見かた</h3>' +
    '<p class="small" style="color:var(--ink-2);margin-bottom:22px">' +
    '発注仕様書v1をそのまま動く形にしたものです。3つの画面が入っています。</p>' +
    '<table class="tbl" style="margin-bottom:24px"><tbody>' +
    '<tr><th style="width:9em">公開サイト</th><td>いま見ているページ。HP内に置く想定です。</td></tr>' +
    '<tr><th>会員ページ</th><td><a href="member.html">member.html</a>　' +
    'ログイン画面のボタンを押すとデモの会員で入れます（パスワードは <span class="mono">demo1234</span>）。</td></tr>' +
    '<tr><th>管理画面</th><td><a href="admin.html">admin.html</a>　' +
    'パスワードは <span class="mono">ezemi</span> です。</td></tr>' +
    '</tbody></table>' +
    '<h4 class="ttl-s bar-ttl">まず見てほしいところ</h4>' +
    '<p class="small" style="color:var(--ink-2);margin-bottom:12px">' +
    '<strong>①　会員ページ →「動画講座」で課題を出してみてください。</strong><br>' +
    'その場で次の回が開きます。事務局の承認作業はありません（仕様書 B-3・本システムの心臓部）。</p>' +
    '<p class="small" style="color:var(--ink-2);margin-bottom:24px">' +
    '<strong>②　右下の「＋1ヶ月」を押してみてください。</strong><br>' +
    '誰も操作していないのに、月額が自動で決済され、カードが通らない方は自動リトライのうえ猶予切れで閲覧停止、' +
    '解約した方は期間末で自動終了、1ヶ月を過ぎた配信は自動で非公開になり「殿堂入り」だけが残り、' +
    '予約投稿がその時刻に公開されて通知が飛びます。仕様書でいう「定型作業がゼロ」がこれです。</p>' +
    '<div class="card-flat"><p class="small" style="color:var(--ink-2);line-height:1.95">' +
    '会員6名と配信10本は中身を見るための仮データです（管理画面 →「データ」から一括で消せます）。<br>' +
    '動画・教材PDF・公開レポートの本文・規約の文言・ロゴは、まだ全部こちらで置いた仮のものです。<br>' +
    '決済は動きを再現しているだけで、実際のカード決済は Stripe をつないでからになります。<br>' +
    '<strong>右下の日付バーとこの案内は、本番では外します。</strong></p></div>' +
    '<div class="row" style="justify-content:flex-end;margin-top:24px">' +
    '<button class="btn btn-fill btn-s" data-close>閉じる</button></div>';

  function guide() { modal(GUIDE_HTML); }

  /* ---------- 検証用バー ---------- */
  function devbar(onChange) {
    var S = EZ.store, R = EZ.rules;
    var bar = document.createElement('div');
    bar.id = 'devbar';
    function render() {
      var shifted = S.clock.isShifted();
      bar.innerHTML =
        '<span class="dev-lbl">検証用</span>' +
        '<button data-guide>この画面の見かた</button>' +
        '<span>いまの日付：' + R.fmtDate(S.clock.now()) + (shifted ? ' ※進めています' : '') + '</span>' +
        '<button data-d="1">＋1日</button>' +
        '<button data-d="7">＋1週</button>' +
        '<button data-d="31">＋1ヶ月</button>' +
        (shifted ? '<button data-reset>今日に戻す</button>' : '');
      $('[data-guide]', bar).addEventListener('click', guide);
      $$('[data-d]', bar).forEach(function (b) {
        b.addEventListener('click', function () {
          S.clock.advanceDays(Number(b.dataset.d));
          R.refresh();
          render();
          if (onChange) onChange();
        });
      });
      var rb = $('[data-reset]', bar);
      if (rb) rb.addEventListener('click', function () { S.clock.reset(); R.refresh(); render(); if (onChange) onChange(); });
    }
    render();
    document.body.appendChild(bar);
    return bar;
  }

  /** 列の多い表は、狭い画面で潰れるより横に送れたほうが読める。
      見出し行が4列以上ある表だけを対象にする（項目名だけの2列の表は対象外）。 */
  function wrapWideTables(root) {
    $$('table.tbl', root || document).forEach(function (t) {
      if (t.parentElement && t.parentElement.classList.contains('tbl-scroll')) return;
      if (t.querySelectorAll('thead th').length < 4) return;
      var box = document.createElement('div');
      box.className = 'tbl-scroll';
      t.parentNode.insertBefore(box, t);
      box.appendChild(t);
    });
  }

  EZ.ui = { esc: esc, nl2br: nl2br, $: $, $$: $$, wrapWideTables: wrapWideTables, toast: toast, modal: modal, confirmBox: confirmBox, download: download, devbar: devbar, guide: guide };
})(window);
