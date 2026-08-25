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
    el.className = 'toast' + (kind === 'seal' ? ' seal' : '');
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

  /* ---------- 検証用バー ---------- */
  function devbar(onChange) {
    var S = EZ.store, R = EZ.rules;
    var bar = document.createElement('div');
    bar.id = 'devbar';
    function render() {
      var shifted = S.clock.isShifted();
      bar.innerHTML =
        '<span class="dev-lbl">検証用</span>' +
        '<span>いまの日付：' + R.fmtDate(S.clock.now()) + (shifted ? ' ※進めています' : '') + '</span>' +
        '<button data-d="1">＋1日</button>' +
        '<button data-d="7">＋1週</button>' +
        '<button data-d="31">＋1ヶ月</button>' +
        (shifted ? '<button data-reset>今日に戻す</button>' : '');
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

  EZ.ui = { esc: esc, nl2br: nl2br, $: $, $$: $$, toast: toast, modal: modal, confirmBox: confirmBox, download: download, devbar: devbar };
})(window);
