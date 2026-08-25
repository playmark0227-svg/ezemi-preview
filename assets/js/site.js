/* ============================================================
   公開側の画面
   ============================================================ */
(function () {
  'use strict';
  var EZ = window.EZ, S = EZ.store, R = EZ.rules, U = EZ.ui;
  var esc = U.esc, nl2br = U.nl2br, $ = U.$, $$ = U.$$;

  EZ.demo.ensure();
  R.refresh();

  var db = S.read();
  $$('[data-bind]').forEach(function (el) {
    var v = db.settings[el.dataset.bind];
    if (v) el.textContent = v;
  });

  /* ---------------- 部品 ---------------- */
  function sec(inner, cls) { return '<section class="sec ' + (cls || '') + '"><div class="wrap">' + inner + '</div></section>'; }
  function head(eyebrow, title, lead) {
    return '<div class="sec-head">' +
      (eyebrow ? '<span class="eyebrow">' + esc(eyebrow) + '</span>' : '') +
      '<h2 class="ttl-m bar-ttl">' + esc(title) + '</h2>' +
      (lead ? '<p class="lead">' + nl2br(lead) + '</p>' : '') +
      '</div>';
  }
  function stat(num, unit, label) {
    return '<div class="stat-i"><div class="stat__num">' + esc(num) +
      (unit ? '<span class="unit">' + esc(unit) + '</span>' : '') + '</div>' +
      '<div class="stat__label">' + esc(label) + '</div></div>';
  }

  /* ---------------- ホーム ---------------- */
  function viewHome() {
    var st = db.settings;
    var html = '';

    html += '<section class="hero">' +
      '<div class="hero__bg"><picture>' +
      '<source srcset="assets/img/sea-light.webp" type="image/webp">' +
      '<img src="assets/img/sea-light.jpg" alt="" aria-hidden="true"></picture></div>' +
      '<div class="wrap">' +
      '<span class="eyebrow">' + esc(st.company) + '　／　' + esc(st.siteNameNote) + '</span>' +
      '<h1>' + esc(st.tagline) + '</h1>' +
      '<p class="hero__sub">値上がりする銘柄を教える場所ではありません。目の前に流れてきた金融の話が、' +
      'どこまで確かめられるものなのか。その手順だけを、7回の講座と毎週の実践で身につけます。</p>' +
      '<div class="hero__acts">' +
      '<a href="#/join" class="btn btn-fill">入会する</a>' +
      '<a href="#/reports" class="btn btn-ghost">公開レポートを読む</a>' +
      '</div>' +
      '<p class="hero__note">入会金 ' + R.fmtYen(st.priceInitial) + '（税込）＋ 月額 ' + R.fmtYen(st.priceMonthly) +
      '（税込）／縛りなし・会員ページからいつでも解約できます</p>' +
      '<hr class="hero__rule">' +
      '<div class="stats">' +
      stat(db.lessons.length, '回', '入門講座') +
      stat('週2〜3', '', '会員限定配信') +
      stat('週1', '本', 'レポート提出') +
      stat(st.archiveWindowDays, '日', '配信の掲載期間') +
      '</div>' +
      '</div></section>';

    html += '<div class="notice-band"><div class="wrap"><p>' +
      '<strong>本サービスは教育であり、投資助言ではありません。</strong><br>' +
      '個別の金融商品の推奨、売買のタイミングの助言、運用の代理は一切行いません。' +
      '扱うのは「その情報が確かかどうかを、自分で確かめる手順」だけです。' +
      '</p></div></div>';

    html += sec(
      head('進めかた', '入って、確かめて、書く。', 'この3つを繰り返すだけです。順番は固定されていて、飛ばせません。') +
      '<div class="steps">' +
      '<div class="step"><h3>7回の入門講座</h3><p>検証の手順を1回ずつ。各回の最後に課題があり、出すとその場で次の回が開きます。承認待ちはありません。</p></div>' +
      '<div class="step"><h3>週2〜3回の会員限定配信</h3><p>いま流れている情報を題材に、実際に確かめる過程をそのまま流します。直近1ヶ月ぶんが読めます。</p></div>' +
      '<div class="step"><h3>週1回のレポート提出</h3><p>自分で選んだ題材を、主張・根拠・限界の型で書きます。配信で取り上げることもあります（許諾制）。</p></div>' +
      '</div>', 'sec--tint');

    html += sec(
      head('入門講座', '7回で、確かめる順番が身につく。') +
      '<div class="curriculum">' +
      db.lessons.map(function (l) {
        return '<div class="cur-row">' +
          '<span class="no">第' + l.no + '回</span>' +
          '<div><h3>' + esc(l.title) + '</h3><p>' + esc(l.lead) + '</p></div>' +
          '<span class="len">約' + l.minutes + '分</span></div>';
      }).join('') +
      '</div>' +
      '<p class="small muted" style="margin-top:1.3rem">第1回は入会直後から見られます。第2回以降は、前の回の課題を出すと自動で開きます。</p>');

    var reps = db.publicReports.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 3);
    html += sec(
      head('公開レポート', '会員がどんなものを書いているか。', '実際に提出されたレポートと同じ型で書かれたものを公開しています。') +
      '<div class="rep-list">' + reps.map(repItem).join('') + '</div>' +
      '<div style="margin-top:2rem"><a href="#/reports" class="btn btn-ghost btn-s">すべての公開レポート</a></div>', 'sec--tint');

    html += sec(head('料金', '入会金と月額だけ。') + priceBlock());

    html += '<section class="line-cta"><div class="wrap">' +
      '<h2>まずLINEで様子を見る</h2>' +
      '<p>友だち追加をすると、スクールの案内と、公開レポートの更新をお送りします。入会していない方への配信と会員向けの配信は分けています。</p>' +
      '<a href="' + esc(st.lineUrl) + '" class="btn btn-fill" target="_blank" rel="noopener">LINE公式アカウントを友だち追加</a>' +
      '</div></section>';

    return html;
  }

  function repItem(r) {
    return '<a class="rep-item" href="#/report/' + esc(r.slug) + '">' +
      '<div class="meta"><span class="tag">' + esc(r.category) + '</span>' +
      '<span class="dt">' + R.fmtDate(new Date(r.date).getTime()) + '</span></div>' +
      '<h3>' + esc(r.title) + '</h3><p>' + esc(r.lead) + '</p>' +
      '<span class="more">続きを読む →</span></a>';
  }

  function priceBlock() {
    var st = db.settings;
    return '<div class="price-box">' +
      '<div class="price-row"><span class="k">入会金（初回のみ）</span><span class="v">' + R.fmtYen(st.priceInitial) + '<small>税込</small></span></div>' +
      '<div class="price-row"><span class="k">月額</span><span class="v">' + R.fmtYen(st.priceMonthly) + '<small>税込</small></span></div>' +
      '<ul class="price-foot">' +
      '<li>お支払いはクレジットカード（Stripe）。カード情報は当社では保持しません。</li>' +
      '<li>次回以降は入会日を基準に毎月同日のお支払いです。</li>' +
      '<li>縛りはありません。会員ページから自分で解約でき、連絡は不要です。</li>' +
      '<li>解約後も、その請求期間の末日までは今までどおり見られます。</li>' +
      '</ul></div>' +
      '<p class="small muted" style="margin-top:18px">第1期の価格です。今後変更する場合があります。</p>';
  }

  /* ---------------- 公開レポート一覧・詳細 ---------------- */
  function viewReports() {
    var cats = {};
    db.publicReports.forEach(function (r) { cats[r.category] = 1; });
    return sec(
      head('公開レポート', 'ここで書かれているもの。',
        '会員が毎週提出するレポートと同じ型で書いています。主張・根拠・限界の3つに分けるところまでが1本です。') +
      '<div class="row" style="margin-bottom:1.6rem">' +
      Object.keys(cats).map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('') +
      '</div>' +
      '<div class="rep-list">' +
      db.publicReports.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).map(repItem).join('') +
      '</div>');
  }

  function viewReport(slug) {
    var r = db.publicReports.filter(function (x) { return x.slug === slug; })[0];
    if (!r) return sec('<p>見つかりませんでした。</p><p style="margin-top:20px"><a href="#/reports" class="btn btn-ghost btn-s">一覧へ戻る</a></p>');
    return '<section class="sec"><div class="wrap-narrow">' +
      '<div class="row" style="margin-bottom:16px"><span class="tag">' + esc(r.category) + '</span>' +
      '<span class="small muted mono">' + R.fmtDate(new Date(r.date).getTime()) + '</span></div>' +
      '<h1 class="ttl-l" style="line-height:1.6;margin-bottom:22px">' + esc(r.title) + '</h1>' +
      '<p class="lead" style="border-left:2px solid var(--gold);padding-left:1.1rem;margin-bottom:2.4rem">' + esc(r.lead) + '</p>' +
      '<div class="prose">' + r.body.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
      '<hr class="rule" style="margin:2.8rem 0 1.8rem">' +
      '<p class="small muted">同じ型で書けるようになるまでを、7回の講座で扱います。</p>' +
      '<div class="row" style="margin-top:1.3rem"><a href="#/join" class="btn btn-fill btn-s">入会する</a>' +
      '<a href="#/reports" class="btn btn-ghost btn-s">一覧へ戻る</a></div>' +
      '</div></section>';
  }

  /* ---------------- 塾長の言葉 ---------------- */
  function viewStory() {
    return '<section class="sec"><div class="wrap-narrow">' +
      '<span class="eyebrow">' + esc(db.settings.company) + '</span>' +
      '<h1 class="ttl-l bar-ttl">' + esc(db.story.title) + '</h1>' +
      '<div class="prose">' + db.story.paragraphs.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<p class="sig">' + esc(db.settings.representative) + '</p></div>' +
      '</div></section>';
  }

  /* ---------------- 料金 ---------------- */
  function viewPrice() {
    return sec(head('料金', '入会金と月額だけ。') + priceBlock() +
      '<div style="margin-top:2.4rem"><a href="#/join" class="btn btn-fill">入会する</a></div>');
  }

  /* ---------------- 法定表記 ---------------- */
  function viewTokushoho() {
    return '<section class="sec"><div class="wrap-narrow">' +
      '<h1 class="ttl-m bar-ttl">特定商取引法に基づく表記</h1>' +
      '<table class="legal-tbl"><tbody>' +
      db.legal.tokushoho.map(function (row) { return '<tr><th>' + esc(row[0]) + '</th><td>' + esc(row[1]) + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      '<p class="small muted" style="margin-top:22px">※ 文言は当方支給のものに差し替えます。</p>' +
      '</div></section>';
  }
  function viewTerms() {
    return '<section class="sec"><div class="wrap-narrow">' +
      '<h1 class="ttl-m bar-ttl">利用規約</h1>' +
      db.legal.terms.map(function (a) { return '<div class="legal-art"><h3>' + esc(a.h) + '</h3><p>' + esc(a.p) + '</p></div>'; }).join('') +
      '<p class="small muted" style="margin-top:22px">※ 文言は当方支給のものに差し替えます。</p>' +
      '</div></section>';
  }
  function viewPrivacy() {
    return '<section class="sec"><div class="wrap-narrow">' +
      '<h1 class="ttl-m bar-ttl">プライバシーポリシー</h1>' +
      db.legal.privacy.map(function (a) { return '<div class="legal-art"><h3>' + esc(a.h) + '</h3><p>' + esc(a.p) + '</p></div>'; }).join('') +
      '<p class="small muted" style="margin-top:22px">※ 文言は当方支給のものに差し替えます。</p>' +
      '</div></section>';
  }

  /* ---------------- 申込（A-1 / A-2 / A-3） ---------------- */
  function viewJoin() {
    var st = db.settings;
    return sec(
      head('入会', '申込から会員ページまで、そのまま続きます。', 'お支払いが終わった時点で会員ページが開きます。事務局の手作業は入りません。') +
      '<div class="signup-grid">' +
      '<div class="signup-form">' +
      '<label class="field"><span class="lbl">お名前</span><input type="text" id="f-name" placeholder="山田 太郎" autocomplete="name"></label>' +
      '<label class="field"><span class="lbl">メールアドレス</span><input type="email" id="f-email" placeholder="you@example.com" autocomplete="email">' +
      '<span class="hint">会員ページのログインと、配信のお知らせに使います。</span></label>' +
      '<label class="field"><span class="lbl">パスワード</span><input type="password" id="f-pass" placeholder="8文字以上" autocomplete="new-password"></label>' +
      '<label class="field"><span class="lbl">クーポンコード（お持ちの方のみ）</span><input type="text" id="f-coupon" placeholder="例：MONITOR" style="text-transform:uppercase">' +
      '<span class="hint">モニターの方は、入会金が免除され初月が無料になります。</span></label>' +
      '<label class="check" style="margin-bottom:.9rem"><input type="checkbox" id="f-line" checked>' +
      '<span>LINE公式アカウントでも配信のお知らせを受け取る</span></label>' +
      '<label class="check" style="margin-bottom:1.7rem"><input type="checkbox" id="f-agree">' +
      '<span><a href="#/terms">利用規約</a>・<a href="#/privacy">プライバシーポリシー</a>・<a href="#/tokushoho">特定商取引法に基づく表記</a>に同意します</span></label>' +
      '<button class="btn btn-fill" id="f-submit" style="width:100%">お支払いに進む</button>' +
      '<p class="small muted" style="margin-top:.9rem">次の画面はカード決済です。カード情報は当社では保持しません。</p>' +
      '</div>' +
      '<div class="signup-side">' +
      '<span class="eyebrow">お支払い内容</span>' +
      '<div id="bill"></div>' +
      '</div></div>');
  }

  function renderBill() {
    var code = ($('#f-coupon') || {}).value || '';
    var p = R.previewCharge(db, code);
    var st = db.settings;
    var h = '';
    h += '<div class="bill-line"><span>入会金（初回のみ）</span><span class="mono">' +
      (p.initial === 0 ? '<s class="muted">' + R.fmtYen(st.priceInitial) + '</s> ' + R.fmtYen(0) : R.fmtYen(p.initial)) + '</span></div>';
    h += '<div class="bill-line"><span>初月の月額</span><span class="mono">' +
      (p.first === 0 ? '<s class="muted">' + R.fmtYen(st.priceMonthly) + '</s> ' + R.fmtYen(0) : R.fmtYen(p.first)) + '</span></div>';
    h += '<div class="bill-total"><span>本日のお支払い</span><span>' + R.fmtYen(p.total) + '</span></div>';
    if (p.coupon) h += '<p style="margin-top:12px"><span class="tag tag-alert">' + esc(p.coupon.label) + '</span></p>';
    else if (code) h += '<p class="small" style="margin-top:12px;color:var(--coral-ink)">このクーポンは使えません</p>';
    h += '<p class="bill-note">次回のお支払いは ' + R.fmtDate(R.addMonths(S.clock.now(), p.first === 0 ? 1 : 1)) + ' です。' +
      '以降は入会日を基準に毎月同じ日にお支払いいただきます。' +
      '解約はいつでも会員ページからでき、その請求期間の末日までは見られます。</p>';
    $('#bill').innerHTML = h;
  }

  function bindJoin() {
    renderBill();
    $('#f-coupon').addEventListener('input', renderBill);
    $('#f-submit').addEventListener('click', function () {
      var name = $('#f-name').value.trim(), email = $('#f-email').value.trim(), pass = $('#f-pass').value;
      if (!name) return U.toast('お名前を入れてください');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return U.toast('メールアドレスを確かめてください');
      if (pass.length < 8) return U.toast('パスワードは8文字以上にしてください');
      if (!$('#f-agree').checked) return U.toast('規約への同意が必要です');
      checkout({ name: name, email: email, password: pass, coupon: $('#f-coupon').value.trim(), lineLinked: $('#f-line').checked });
    });
  }

  /* 決済画面（Stripe Checkout の位置。本番はここが Stripe の画面に置き換わる） */
  function checkout(input) {
    var p = R.previewCharge(db, input.coupon);
    var m = U.modal(
      '<span class="eyebrow">お支払い</span>' +
      '<h3 class="ttl-s" style="margin-bottom:6px">カード情報の入力</h3>' +
      '<p class="small muted" style="margin-bottom:22px">この画面は本番では Stripe の決済画面に置き換わります。' +
      'カード番号は当社のサーバーを通りません。</p>' +
      '<div class="card-flat" style="margin-bottom:1.5rem">' +
      '<div class="bill-line"><span>入会金</span><span class="mono">' + R.fmtYen(p.initial) + '</span></div>' +
      '<div class="bill-line"><span>初月の月額</span><span class="mono">' + R.fmtYen(p.first) + '</span></div>' +
      '<div class="bill-total"><span>合計</span><span>' + R.fmtYen(p.total) + '</span></div>' +
      '</div>' +
      '<label class="field"><span class="lbl">カード番号（デモ）</span>' +
      '<input type="text" value="4242 4242 4242 4242" readonly class="mono" style="background:var(--foam)"></label>' +
      '<div class="row" style="justify-content:flex-end;margin-top:1.7rem">' +
      '<button class="btn btn-ghost btn-s" data-close>やめる</button>' +
      '<button class="btn btn-fill btn-s" data-pay>' + R.fmtYen(p.total) + ' を支払う</button></div>',
      { sticky: true });

    $('[data-pay]', m).addEventListener('click', function () {
      try {
        var mem = R.signup(input);
        m.close();
        S.session.set({ memberId: mem.id }, true);
        db = S.read();
        U.modal(
          '<span class="eyebrow">完了</span>' +
          '<h3 class="ttl-s" style="margin-bottom:14px">ご入会ありがとうございます</h3>' +
          '<p class="small" style="color:var(--ink-2);margin-bottom:10px">会員ページを開きました。第1回はすぐにご覧いただけます。</p>' +
          '<p class="small" style="color:var(--ink-2);margin-bottom:24px">案内のメールを ' + esc(mem.email) + ' 宛に送りました。' +
          (input.lineLinked ? 'LINEにも同じ内容をお送りしています。' : '') + '</p>' +
          '<a href="member.html" class="btn btn-fill" style="width:100%">会員ページへ</a>',
          { sticky: true });
      } catch (e) {
        U.toast(e.message, 'alert');
      }
    });
  }

  /* ---------------- ルータ ---------------- */
  var routes = {
    '': viewHome, '/': viewHome,
    '/reports': viewReports, '/story': viewStory, '/price': viewPrice,
    '/join': viewJoin, '/terms': viewTerms, '/tokushoho': viewTokushoho, '/privacy': viewPrivacy
  };

  function render() {
    db = S.read();
    var h = location.hash.replace(/^#/, '') || '/';
    var html, m;
    if ((m = h.match(/^\/report\/(.+)$/))) html = viewReport(m[1]);
    else if (routes[h]) html = routes[h]();
    else html = sec('<h1 class="ttl-m bar-ttl">ページが見つかりません</h1><a href="#/" class="btn btn-ghost btn-s">トップへ</a>');

    $('#view').innerHTML = html;
    window.scrollTo(0, 0);
    $$('#nav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + h); });
    $('#nav').classList.remove('open');
    if (h === '/join') bindJoin();
  }

  window.addEventListener('hashchange', render);
  $('#navToggle').addEventListener('click', function () { $('#nav').classList.toggle('open'); });
  render();

  U.devbar(render);
})();
