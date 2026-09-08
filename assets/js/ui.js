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

  /* ---------- アイコン ----------
     線だけの20pxの記号。一覧の先頭に置くと、文字を読まなくても
     どの行かが分かるようになる。SVGは外部ファイルにせず埋め込み。 */
  var ICONS = {
    home:     '<path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z"/>',
    lessons:  '<rect x="2.5" y="4.5" width="15" height="11" rx="2"/><path d="M8.5 8.2v3.6l3.2-1.8z"/>',
    feed:     '<path d="M10 8.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z"/><path d="M6.2 6.2a5.4 5.4 0 0 0 0 7.6M13.8 13.8a5.4 5.4 0 0 0 0-7.6M3.6 3.6a9 9 0 0 0 0 12.8M16.4 16.4a9 9 0 0 0 0-12.8"/>',
    materials:'<path d="M5 2.6h6l4 4V17a.9.9 0 0 1-.9.9H5a.9.9 0 0 1-.9-.9V3.5A.9.9 0 0 1 5 2.6z"/><path d="M11 2.6v4.2h4"/>',
    reports:  '<path d="M4.2 15.8 3.4 17l1.2-.8 9.1-9.1-1.7-1.7z"/><path d="M12 4.4 13.7 2.7a1 1 0 0 1 1.4 0l.9.9a1 1 0 0 1 0 1.4L14.3 6.7z"/><path d="M3.5 18h13"/>',
    questions:'<circle cx="10" cy="10" r="7.4"/><path d="M8.2 8a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.5"/><circle cx="10" cy="13.9" r=".7" fill="currentColor" stroke="none"/>',
    messages: '<path d="M17 12.2a1.6 1.6 0 0 1-1.6 1.6H7l-3.4 2.8v-2.8a1.6 1.6 0 0 1-.6-1.6V5.4A1.6 1.6 0 0 1 4.6 3.8h10.8A1.6 1.6 0 0 1 17 5.4z"/>',
    account:  '<circle cx="10" cy="7" r="3.2"/><path d="M4 17c.6-3 3-4.6 6-4.6s5.4 1.6 6 4.6"/>',
    members:  '<circle cx="7.6" cy="7.4" r="2.8"/><path d="M2.6 16.4c.5-2.6 2.5-4 5-4s4.5 1.4 5 4"/><path d="M13.4 5.2a2.6 2.6 0 0 1 0 5M14.4 12.8c1.8.4 2.8 1.7 3.1 3.6"/>',
    posts:    '<rect x="2.6" y="5" width="10.4" height="10" rx="1.6"/><path d="M13 8.4 17.4 6v8l-4.4-2.4z"/>',
    inbox:    '<path d="M2.8 11.6 4.6 4.4a1.2 1.2 0 0 1 1.2-.9h8.4a1.2 1.2 0 0 1 1.2.9l1.8 7.2"/><path d="M2.8 11.6h3.8a.6.6 0 0 1 .6.5 2.8 2.8 0 0 0 5.6 0 .6.6 0 0 1 .6-.5h3.8v3.6a1.3 1.3 0 0 1-1.3 1.3H4.1a1.3 1.3 0 0 1-1.3-1.3z"/>',
    content:  '<path d="M3.4 6.2h13.2M3.4 10h13.2M3.4 13.8h13.2"/><circle cx="7.2" cy="6.2" r="1.5" fill="var(--surface)"/><circle cx="12.6" cy="10" r="1.5" fill="var(--surface)"/><circle cx="6.4" cy="13.8" r="1.5" fill="var(--surface)"/>',
    pricing:  '<path d="M6.6 5.4 10 9.6l3.4-4.2M10 9.6V15M7.4 11.4h5.2M7.4 13.2h5.2"/><circle cx="10" cy="10" r="7.6"/>',
    bell:     '<path d="M10 3.2a4.6 4.6 0 0 1 4.6 4.6c0 3.4 1.2 4.4 1.6 4.8H3.8c.4-.4 1.6-1.4 1.6-4.8A4.6 4.6 0 0 1 10 3.2z"/><path d="M8.4 15.2a1.7 1.7 0 0 0 3.2 0"/>',
    data:     '<ellipse cx="10" cy="5.4" rx="6.2" ry="2.4"/><path d="M3.8 5.4v9.2c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4V5.4"/><path d="M3.8 10c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4"/>'
  };

  /** 一覧の先頭などに置く記号。name が無ければ何も出さない。 */
  function icon(name, cls) {
    if (!ICONS[name]) return '';
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 20 20" aria-hidden="true" ' +
      'fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
  }

  /** 押せる行の右端に出す山かっこ */
  function chevron() {
    return '<svg class="ico chev" viewBox="0 0 20 20" aria-hidden="true" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M7.8 4.5 13 10l-5.2 5.5"/></svg>';
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

  EZ.ui = { esc: esc, nl2br: nl2br, $: $, $$: $$, wrapWideTables: wrapWideTables, toast: toast, modal: modal, confirmBox: confirmBox, download: download, devbar: devbar, guide: guide, icon: icon, chevron: chevron };
})(window);
