/* ============================================================
   管理画面（代表が自分で触る領域）
   ここに無い定型作業（解錠・催促・遮断・集計）は全部自動。
   ============================================================ */
(function () {
  'use strict';
  var EZ = window.EZ, S = EZ.store, R = EZ.rules, U = EZ.ui;
  var esc = U.esc, nl2br = U.nl2br, $ = U.$, $$ = U.$$;
  var db, page = 'home';
  var PASS_KEY = 'ezemi.admin';

  if (S.mode() !== 'cloud') EZ.demo.ensure();
  function load() { R.refresh(); db = S.read(); }

  /* ================= 入口 ================= */
  function loading(msg) {
    $('#root').innerHTML =
      '<div class="login-wrap"><div class="login-box center">' +
      '<p class="small muted">' + esc(msg || '読み込んでいます…') + '</p></div></div>';
  }

  function brandBlock() {
    return '<a class="brand" href="index.html">' +
      '<picture><source srcset="assets/img/logo-full.webp" type="image/webp">' +
      '<img class="brand__logo" src="assets/img/logo-full.png" alt="株式会社知上会" width="600" height="215"></picture>' +
      '<span class="brand__sub">' + esc(db.settings.siteName) + '<small>管理画面</small></span></a>';
  }

  function authMsg(err) {
    var c = (err && err.code) || '';
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found')
      return 'メールアドレスかパスワードが違います';
    if (c === 'auth/too-many-requests') return '試行が続いたため、しばらく待ってからお試しください';
    if (c === 'auth/network-request-failed') return 'ネットワークにつながりませんでした';
    return (err && err.message) || 'うまくいきませんでした';
  }

  /* 本番：Firebase Authentication でログインし、admins に登録された人だけ通す */
  function renderCloudGate(msg) {
    $('#root').innerHTML =
      '<div class="login-wrap"><div class="login-box">' + brandBlock() +
      '<div class="card">' +
      (msg ? '<p class="small" style="color:var(--coral-ink);margin-bottom:1rem">' + esc(msg) + '</p>' : '') +
      '<label class="field"><span class="lbl">メールアドレス</span><input type="email" id="a-email" autocomplete="username"></label>' +
      '<label class="field"><span class="lbl">パスワード</span><input type="password" id="a-pass" autocomplete="current-password"></label>' +
      '<button class="btn btn-fill" id="a-go" style="width:100%">開く</button>' +
      '</div></div></div>';
    $('#a-go').addEventListener('click', cloudGate);
    $('#a-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') cloudGate(); });
  }
  function cloudGate() {
    var em = $('#a-email').value.trim(), pw = $('#a-pass').value;
    if (!em || !pw) return U.toast('メールアドレスとパスワードを入れてください');
    loading('ログインしています…');
    EZ.cloud.signIn(em, pw).catch(function (err) { renderCloudGate(authMsg(err)); });
  }

  function renderGate(msg) {
    if (S.mode() === 'cloud') return renderCloudGate(msg);
    $('#root').innerHTML =
      '<div class="login-wrap"><div class="login-box">' + brandBlock() +
      '<div class="card">' +
      (msg ? '<p class="small" style="color:var(--coral-ink);margin-bottom:1rem">' + esc(msg) + '</p>' : '') +
      '<label class="field"><span class="lbl">管理パスワード</span><input type="password" id="a-pass" autocomplete="current-password"></label>' +
      '<button class="btn btn-fill" id="a-go" style="width:100%">開く</button>' +
      '<p class="small muted" style="margin-top:.9rem">試作版のパスワードは <span class="mono">ezemi</span> です。' +
      '本番につなぐと、ここは Firebase のログインに変わります。</p>' +
      '</div></div></div>';
    $('#a-go').addEventListener('click', gate);
    $('#a-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') gate(); });
  }
  function gate() {
    if ($('#a-pass').value !== 'ezemi') return renderGate('パスワードが違います');
    sessionStorage.setItem(PASS_KEY, '1');
    boot();
  }

  /* ================= 枠 ================= */
  var NAV = [
    { id: 'home', label: 'ホーム', grp: '毎日' },
    { id: 'members', label: '会員一覧', grp: '毎日' },
    { id: 'posts', label: '配信の投稿・予約', grp: '毎日' },
    { id: 'submissions', label: '課題・レポート・質問', grp: '毎日' },
    { id: 'content', label: '動画・教材・公開ページ', grp: 'ときどき' },
    { id: 'pricing', label: '料金・クーポン', grp: 'ときどき' },
    { id: 'notifications', label: '通知の送信ログ', grp: 'ときどき' },
    { id: 'data', label: 'データ', grp: 'ときどき' }
  ];

  function shell(inner) {
    var now = S.clock.now();
    var unread = db.adminInbox.filter(function (i) { return !i.read; }).length;
    var pending = db.questions.filter(function (q) { return !q.answeredPostId; }).length;
    var lastGrp = '';
    var nav = NAV.map(function (n) {
      var out = '';
      if (n.grp !== lastGrp) { lastGrp = n.grp; out += '<div class="side-grp">' + esc(n.grp) + '</div>'; }
      var badge = n.id === 'home' && unread ? unread : (n.id === 'submissions' && pending ? pending : 0);
      out += '<a class="nav' + (page === n.id ? ' on' : '') + '" href="#' + n.id + '"><span>' + esc(n.label) + '</span>' +
        (badge ? '<span class="n">' + badge + '</span>' : '') + '</a>';
      return out;
    }).join('');

    return '<div class="app">' +
      '<aside class="side" id="side">' +
      brandBlock() +
      nav +
      '<div class="side-foot"><div class="who">' + esc(db.settings.representative) + '</div>' +
      '<div class="st">' + R.fmtDate(now) + '</div>' +
      '<a href="index.html" style="margin-top:6px;display:inline-block">公開サイトを見る</a>' +
      (S.mode() === 'cloud' ? '　<a href="#" id="adminLogout">ログアウト</a>' : '') + '</div>' +
      '</aside><div>' +
      '<div class="mobile-head"><button id="menuBtn">メニュー</button>' +
      '<picture><source srcset="assets/img/logo-full.webp" type="image/webp"><img class="brand__logo" src="assets/img/logo-full.png" alt="株式会社知上会" width="600" height="215"></picture>' +
      '<span class="ttl-s">管理画面</span></div>' +
      '<main class="main">' + inner + '</main></div></div>';
  }

  function pagehead(t, l) {
    return '<div class="pagehead"><h1 class="ttl-m">' + esc(t) + '</h1>' + (l ? '<p>' + nl2br(l) + '</p>' : '') + '</div>';
  }

  /* ================= ホーム ================= */
  function viewHome() {
    var now = S.clock.now();
    var active = db.members.filter(function (m) { return R.canView(m, now); });
    var mrr = active.reduce(function (a, m) { return a + (m.billing.freeMonths > 0 ? 0 : db.settings.priceMonthly); }, 0);
    var pastDue = db.members.filter(function (m) { return m.billing.state === 'past_due' || m.billing.state === 'suspended'; });
    var canceling = db.members.filter(function (m) { return m.billing.cancelRequestedAt && m.billing.state === 'active'; });
    var wk = R.weekKey(now);
    var thisWeekReports = db.reports.filter(function (r) { return r.weekKey === wk; }).length;

    var h = pagehead('ホーム', '解錠・催促・遮断・集計は自動で動いています。ここに出てくるのは、人の判断がいるものだけです。');

    h += '<div class="stats-app" style="margin-bottom:30px">' +
      '<div class="stat"><div class="k">閲覧できる会員</div><div class="v">' + active.length + '<small>名</small></div></div>' +
      '<div class="stat"><div class="k">今月の月額合計</div><div class="v" style="font-size:22px">' + R.fmtYen(mrr) + '</div></div>' +
      '<div class="stat"><div class="k">支払いに問題</div><div class="v">' + pastDue.length + '<small>名</small></div></div>' +
      '<div class="stat"><div class="k">解約予定</div><div class="v">' + canceling.length + '<small>名</small></div></div>' +
      '<div class="stat"><div class="k">今週のレポート</div><div class="v">' + thisWeekReports + '<small>/ ' + active.length + '</small></div></div>' +
      '</div>';

    h += '<div class="row-between" style="margin-bottom:14px"><h2 class="ttl-s">届いていること</h2>' +
      (db.adminInbox.length ? '<button class="btn btn-ghost btn-xs" id="mark-all">すべて読んだことにする</button>' : '') + '</div>';
    h += db.adminInbox.length
      ? db.adminInbox.slice(0, 25).map(function (i) {
        return '<div class="inbox-item' + (i.read ? '' : ' unread') + '" data-inbox="' + i.id + '">' +
          '<div class="tx"><h4>' + esc(i.title) + '</h4><p>' + esc(i.body) + '</p></div>' +
          '<span class="dt">' + R.ago(i.at, now) + '</span></div>';
      }).join('')
      : '<p class="small muted">いまは何もありません。</p>';

    if (pastDue.length) {
      h += '<h2 class="ttl-s" style="margin-top:36px">支払いに問題がある会員</h2>' +
        '<table class="tbl"><thead><tr><th>氏名</th><th>状態</th><th>最初の失敗</th><th>次の自動リトライ</th><th></th></tr></thead><tbody>' +
        pastDue.map(function (m) {
          var st = R.statusOf(m, now);
          return '<tr><td>' + esc(m.name) + '</td><td><span class="tag tag-' + st.tone + '">' + esc(st.label) + '</span></td>' +
            '<td class="mono">' + R.fmtDate(m.billing.firstFailAt) + '</td>' +
            '<td class="mono">' + (m.billing.state === 'past_due' ? R.fmtDate(m.billing.nextRetryAt) : '—') + '</td>' +
            '<td><button class="btn btn-ghost btn-xs" data-member="' + m.id + '">開く</button></td></tr>';
        }).join('') + '</tbody></table>';
    }
    return h;
  }

  /* ================= 会員一覧（F-1） ================= */
  function viewMembers() {
    var now = S.clock.now();
    var h = pagehead('会員一覧',
      '氏名・メール・入会日・決済状態・講座進捗・レポート提出状況をこの1画面で見ます。行をクリックすると個別の中身が開きます。');
    h += '<div class="adm-toolbar">' +
      '<input type="text" id="m-search" placeholder="氏名・メールで探す">' +
      '<select id="m-filter">' +
      '<option value="">すべての状態</option>' +
      '<option value="active">有効</option><option value="free">無料期間中</option>' +
      '<option value="canceling">解約予定</option><option value="past_due">支払い確認中</option>' +
      '<option value="suspended">閲覧停止</option><option value="expired">終了</option>' +
      '</select>' +
      '<button class="btn btn-ghost btn-s" id="m-csv">CSVで書き出す</button>' +
      '<span class="small muted" id="m-count"></span></div>';
    h += '<div id="m-table"></div>';
    return h;
  }

  function renderMemberTable() {
    var now = S.clock.now();
    var q = ($('#m-search').value || '').trim().toLowerCase();
    var f = $('#m-filter').value;
    var rows = db.members.filter(function (m) {
      var st = R.statusOf(m, now);
      if (f && st.code !== f) return false;
      if (!q) return true;
      return (m.name + ' ' + m.email).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return b.joinedAt - a.joinedAt; });

    var wk = R.weekKey(now);
    $('#m-count').textContent = rows.length + ' / ' + db.members.length + ' 名';
    $('#m-table').innerHTML = rows.length ?
      '<table class="tbl"><thead><tr>' +
      '<th>氏名</th><th>メール</th><th>入会日</th><th>決済状態</th><th>講座進捗</th><th>今週のレポート</th><th>累計</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (m) {
        var st = R.statusOf(m, now);
        var pr = R.progressLabel(db, m);
        var mine = db.reports.filter(function (r) { return r.memberId === m.id; });
        var thisWk = mine.some(function (r) { return r.weekKey === wk; });
        return '<tr data-member="' + m.id + '" style="cursor:pointer">' +
          '<td>' + esc(m.name) + (m.isDemo ? ' <span class="tag tag-dim">デモ</span>' : '') + '</td>' +
          '<td class="small muted">' + esc(m.email) + '</td>' +
          '<td class="mono">' + R.fmtDate(m.joinedAt) + '</td>' +
          '<td><span class="tag tag-' + st.tone + '">' + esc(st.label) + '</span></td>' +
          '<td class="mono">' + pr.submitted + ' / ' + pr.total + '</td>' +
          '<td>' + (thisWk ? '<span class="cellmark yes">✓</span>' : '<span class="cellmark no">—</span>') + '</td>' +
          '<td class="mono">' + mine.length + '本</td></tr>';
      }).join('') + '</tbody></table>'
      : '<p class="small muted">該当する会員はいません。</p>';

    $$('[data-member]').forEach(function (tr) {
      tr.addEventListener('click', function () { openMember(tr.dataset.member); });
    });
  }

  /* ---- 会員の個別画面（B-4 課題の閲覧 / F-5 返金・強制解約） ---- */
  function openMember(id) {
    var now = S.clock.now();
    var m = db.members.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    var st = R.statusOf(m, now);
    var states = R.lessonStates(db, m, now);
    var reports = db.reports.filter(function (r) { return r.memberId === id; });
    var pays = db.payments.filter(function (p) { return p.memberId === id; });
    var imps = db.impressions.filter(function (i) { return i.memberId === id; });

    var h = '<div class="row-between" style="margin-bottom:20px">' +
      '<div><span class="eyebrow">会員</span><h3 class="ttl-m">' + esc(m.name) + '</h3>' +
      '<p class="small muted">' + esc(m.email) + '</p></div>' +
      '<span class="tag tag-' + st.tone + '">' + esc(st.label) + '</span></div>';

    h += '<table class="tbl" style="margin-bottom:26px"><tbody>' +
      '<tr><th style="width:11em">入会日</th><td>' + R.fmtDate(m.joinedAt) + '</td></tr>' +
      '<tr><th>いまの請求期間</th><td>' + R.fmtDate(m.billing.periodStart) + ' 〜 ' + R.fmtDate(m.billing.periodEnd) + '</td></tr>' +
      '<tr><th>クーポン</th><td>' + (m.coupon ? esc(m.coupon) : '—') + '</td></tr>' +
      '<tr><th>無料期間の残り</th><td>' + m.billing.freeMonths + ' ヶ月</td></tr>' +
      '<tr><th>LINE通知</th><td>' + (m.lineLinked ? '受け取る' : '受け取らない') + '</td></tr>' +
      '</tbody></table>';

    h += '<h4 class="ttl-s">講座の提出内容</h4>';
    h += states.map(function (s) {
      return '<div class="hist-item"><div class="h">' +
        '<span class="tag">第' + s.lesson.no + '回</span>' +
        (s.submitted ? '<span class="tag tag-ok">提出済み</span>' :
          s.unlocked ? '<span class="tag tag-sea">受講中</span>' : '<span class="tag tag-dim">未解錠</span>') +
        (s.submitted ? '<span class="small muted mono">' + R.fmtDateTime(s.submission.submittedAt) + '</span>' : '') +
        '</div>' + (s.submitted ? '<div class="b">' + esc(s.submission.body) + '</div>' : '') + '</div>';
    }).join('');

    if (imps.length) {
      h += '<h4 class="ttl-s" style="margin-top:26px">感想</h4>' +
        imps.map(function (i) { return '<div class="hist-item"><div class="h"><span class="small muted mono">' + R.fmtDate(i.at) + '</span></div><div class="b">' + esc(i.text) + '</div></div>'; }).join('');
    }

    h += '<h4 class="ttl-s" style="margin-top:26px">週1レポート（' + reports.length + '本）</h4>';
    h += reports.length ? reports.map(function (r) {
      return '<div class="hist-item"><div class="h"><span class="tag">' + esc(r.weekKey) + '</span>' +
        (r.consent ? '<span class="tag tag-gold">紹介 許諾あり</span>' : '') +
        (r.fileName ? '<span class="tag tag-dim">' + esc(r.fileName) + '</span>' : '') +
        '<span class="small muted mono">' + R.fmtDate(r.submittedAt) + '</span></div>' +
        '<div class="b">' + esc(r.body) + '</div></div>';
    }).join('') : '<p class="small muted">まだありません。</p>';

    h += '<h4 class="ttl-s" style="margin-top:26px">お支払い</h4>' +
      '<table class="tbl"><thead><tr><th>日付</th><th>内容</th><th class="num">金額</th><th>状態</th><th></th></tr></thead><tbody>' +
      pays.map(function (p) {
        return '<tr><td class="mono">' + R.fmtDate(p.at) + '</td><td>' + (p.kind === 'initial' ? '入会金' : '月額') + '</td>' +
          '<td class="num">' + R.fmtYen(p.amount) + '</td><td>' + payTag(p.status) + '</td>' +
          '<td>' + (p.status === 'paid' && p.amount > 0 ? '<button class="btn btn-ghost btn-xs" data-refund="' + p.id + '">返金</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table>';

    h += '<h4 class="ttl-s" style="margin-top:26px">操作</h4>' +
      '<div class="row">' +
      '<button class="btn btn-ghost btn-s" data-togglefail="' + m.id + '">' +
      (m.billing.forceFail ? '決済の失敗を止める' : '次回の決済を失敗させる（検証用）') + '</button>' +
      (m.billing.state === 'past_due' ? '<button class="btn btn-ghost btn-s" data-retry="' + m.id + '">いますぐ再決済</button>' : '') +
      '<button class="btn btn-danger btn-s" data-force="' + m.id + '">強制解約</button>' +
      '</div>' +
      '<div class="row" style="justify-content:flex-end;margin-top:26px"><button class="btn btn-ghost btn-s" data-close>閉じる</button></div>';

    var mod = U.modal(h, { wide: true });

    $$('[data-refund]', mod).forEach(function (b) {
      b.addEventListener('click', function () {
        U.confirmBox('返金しますか', 'この決済を返金済みにします。\n本番では Stripe 側にも返金の指示が飛びます。', '返金する').then(function (ok) {
          if (!ok) return;
          try { R.refund(b.dataset.refund, '管理画面からの返金'); mod.close(); rerender(); U.toast('返金しました'); }
          catch (e) { U.toast(e.message, 'alert'); }
        });
      });
    });
    var tf = $('[data-togglefail]', mod);
    if (tf) tf.addEventListener('click', function () {
      S.update(function (d) {
        var mm = d.members.filter(function (x) { return x.id === m.id; })[0];
        mm.billing.forceFail = !mm.billing.forceFail;
        S.put('members', mm);
      });
      mod.close(); rerender(); U.toast('設定を変えました');
    });
    var rt = $('[data-retry]', mod);
    if (rt) rt.addEventListener('click', function () { R.retryNow(m.id); R.refresh(); mod.close(); rerender(); U.toast('再決済しました'); });
    var fc = $('[data-force]', mod);
    if (fc) fc.addEventListener('click', function () {
      U.confirmBox('強制解約しますか', esc(m.name) + ' さんの会員資格をすぐに終了します。\n閲覧はその時点で止まります。', '強制解約する').then(function (ok) {
        if (!ok) return;
        R.forceCancel(m.id, '');
        mod.close(); rerender(); U.toast('強制解約しました');
      });
    });
  }

  function payTag(s) {
    if (s === 'paid') return '<span class="tag tag-ok">完了</span>';
    if (s === 'free') return '<span class="tag tag-sea">無料</span>';
    if (s === 'failed') return '<span class="tag tag-alert">失敗</span>';
    if (s === 'refunded') return '<span class="tag tag-warn">返金済み</span>';
    return '<span class="tag">' + esc(s) + '</span>';
  }

  /* ================= 配信（F-2 / C-1〜C-4） ================= */
  function viewPosts() {
    var now = S.clock.now();
    var h = pagehead('配信の投稿・予約',
      '投稿すると、会員へメール（会社ドメイン）とLINEの二段で自動的にお知らせが飛びます。' +
      '公開から' + db.settings.archiveWindowDays + '日で自動的に非公開になり、「殿堂入り」にしたものだけが残ります。');

    h += '<div class="card" style="margin-bottom:30px">' +
      '<div class="row" style="margin-bottom:16px">' +
      '<select id="p-kind" style="width:auto">' + R.POST_KINDS.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('') + '</select>' +
      '<select id="p-media" style="width:auto"><option value="none">埋め込みなし</option><option value="video">動画</option>' +
      '<option value="audio">音声</option><option value="image">画像</option></select>' +
      '</div>' +
      '<label class="field"><span class="lbl">題名</span><input type="text" id="p-title" placeholder="例：数字の分母を探す"></label>' +
      '<label class="field"><span class="lbl">本文</span><textarea id="p-body" placeholder="テキスト。画像・動画・音声を埋め込む場合は下のURL欄も使います。"></textarea></label>' +
      '<label class="field" id="p-url-field" style="display:none"><span class="lbl">埋め込みURL</span>' +
      '<input type="text" id="p-url" placeholder="YouTube限定公開 / Vimeo / 音声ファイルのURL"></label>' +
      '<div class="grid-2">' +
      '<label class="field"><span class="lbl">公開日時（先の日時にすると予約投稿）</span>' +
      '<input type="datetime-local" id="p-at"></label>' +
      '<div class="field"><span class="lbl">掲載期間</span>' +
      '<label class="check"><input type="checkbox" id="p-perm">' +
      '<span>殿堂入りにする（' + db.settings.archiveWindowDays + '日を過ぎても残す）</span></label></div>' +
      '</div>' +
      '<div class="row" style="margin-top:8px"><button class="btn btn-fill" id="p-send">投稿する</button>' +
      '<span class="small muted">公開日時が先なら、その時刻に自動で公開・通知します。</span></div>' +
      '</div>';

    var sorted = db.posts.slice().sort(function (a, b) { return b.publishAt - a.publishAt; });
    h += '<h2 class="ttl-s">投稿した配信（' + sorted.length + '本）</h2>';
    h += '<table class="tbl"><thead><tr><th>公開日時</th><th>種別</th><th>題名</th><th>状態</th><th>通知</th><th></th></tr></thead><tbody>' +
      sorted.map(function (p) {
        var vis = R.postVisibility(db, p, now);
        return '<tr><td class="mono">' + R.fmtDateTime(p.publishAt) + '</td>' +
          '<td><span class="tag">' + esc(p.kind) + '</span></td>' +
          '<td>' + esc(p.title) + '</td>' +
          '<td><span class="tag' + (vis.tone ? ' tag-' + vis.tone : '') + '">' + esc(vis.label) + '</span></td>' +
          '<td class="small muted">' + (p.notifiedAt ? '送信済み' : '未送信') + '</td>' +
          '<td class="row" style="gap:6px"><button class="btn btn-ghost btn-xs" data-perm="' + p.id + '">' +
          (p.permanent ? '殿堂入りを外す' : '殿堂入りにする') + '</button>' +
          '<button class="btn btn-ghost btn-xs" data-delpost="' + p.id + '">削除</button></td></tr>';
      }).join('') + '</tbody></table>';
    return h;
  }

  function bindPosts() {
    var at = $('#p-at');
    var d = new Date(S.clock.now());
    at.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    $('#p-media').addEventListener('change', function () {
      $('#p-url-field').style.display = this.value === 'none' ? 'none' : 'block';
    });
    $('#p-send').addEventListener('click', function () {
      var title = $('#p-title').value.trim(), body = $('#p-body').value.trim();
      if (!title) return U.toast('題名を入れてください');
      if (!body) return U.toast('本文を入れてください');
      var p = R.createPost({
        kind: $('#p-kind').value, title: title, body: body,
        mediaType: $('#p-media').value, mediaUrl: $('#p-url').value.trim(),
        publishAt: at.value ? new Date(at.value).getTime() : S.clock.now(),
        permanent: $('#p-perm').checked
      });
      R.refresh();
      U.toast(p.publishAt > S.clock.now() ? '予約しました' : '投稿し、会員へ通知しました');
      rerender();
    });
    $$('[data-perm]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.update(function (d2) {
          var p = d2.posts.filter(function (x) { return x.id === b.dataset.perm; })[0];
          if (p) { p.permanent = !p.permanent; S.put('posts', p); }
        });
        rerender();
      });
    });
    $$('[data-delpost]').forEach(function (b) {
      b.addEventListener('click', function () {
        U.confirmBox('削除しますか', 'この配信を消します。元に戻せません。', '削除する').then(function (ok) {
          if (!ok) return;
          S.del('posts', b.dataset.delpost);
          rerender(); U.toast('削除しました');
        });
      });
    });
  }

  /* ================= 課題・レポート・質問（B-4 / D-1 / D-3） ================= */
  function viewSubmissions() {
    var now = S.clock.now();
    var h = pagehead('課題・レポート・質問', '提出されたものが集まる場所です。集計はすべて自動です。');

    /* 会員×週 の一覧 */
    var mtx = R.reportMatrix(db, now, 8);
    var actives = db.members.filter(function (m) { return R.canView(m, now); });
    h += '<div class="row-between" style="margin-bottom:12px"><h2 class="ttl-s">週1レポートの提出状況（会員×週）</h2>' +
      '<button class="btn btn-ghost btn-xs" id="r-csv">CSVで書き出す</button></div>';
    h += '<div style="overflow-x:auto;margin-bottom:36px"><table class="tbl matrix"><thead><tr><th>氏名</th>' +
      mtx.weeks.map(function (w) { return '<th>' + w.key.slice(5) + '<br><span class="muted mono" style="font-size:10px">' + R.fmtDateShort(w.start) + '〜</span></th>'; }).join('') +
      '<th>提出率</th></tr></thead><tbody>' +
      (actives.length ? actives.map(function (m) {
        var hit = 0;
        var cells = mtx.weeks.map(function (w) {
          var r = mtx.get(m.id, w.key);
          if (w.start + 7 * EZ.DAY <= m.joinedAt) return '<td><span class="cellmark na">·</span></td>';
          if (r) { hit++; return '<td><span class="cellmark yes" title="' + esc(r.body.slice(0, 40)) + '">✓</span></td>'; }
          return '<td><span class="cellmark no">—</span></td>';
        }).join('');
        var target = mtx.weeks.filter(function (w) { return w.start + 7 * EZ.DAY > m.joinedAt; }).length || 1;
        return '<tr><td>' + esc(m.name) + '</td>' + cells +
          '<td class="mono">' + Math.round(hit / target * 100) + '%</td></tr>';
      }).join('') : '<tr><td colspan="10" class="muted">会員がいません</td></tr>') +
      '</tbody></table></div>';

    /* 課題 */
    h += '<div class="row-between" style="margin-bottom:12px"><h2 class="ttl-s">課題の提出（新しい順）</h2>' +
      '<button class="btn btn-ghost btn-xs" id="a-csv">CSVで書き出す</button></div>';
    h += db.assignments.length ? '<div class="hist" style="margin-bottom:36px">' +
      db.assignments.slice(0, 20).map(function (a) {
        return '<div class="hist-item"><div class="h"><span class="tag">第' + a.lesson + '回</span>' +
          '<strong style="font-size:13px">' + esc(a.memberName) + '</strong>' +
          '<span class="small muted mono">' + R.fmtDateTime(a.submittedAt) + '</span></div>' +
          '<div class="b">' + esc(a.body) + '</div></div>';
      }).join('') + '</div>' : '<p class="small muted" style="margin-bottom:36px">まだありません。</p>';

    /* 質問 */
    var qs = db.questions;
    h += '<h2 class="ttl-s">質問（' + qs.filter(function (q) { return !q.answeredPostId; }).length + '件が未回答）</h2>';
    h += qs.length ? '<div class="hist" style="margin-bottom:36px">' + qs.map(function (q) {
      return '<div class="hist-item"><div class="h">' +
        (q.answeredPostId ? '<span class="tag tag-ok">回答済み</span>' : '<span class="tag tag-alert">未回答</span>') +
        '<strong style="font-size:13px">' + esc(q.memberName) + '</strong>' +
        '<span class="small muted mono">' + R.fmtDate(q.at) + '</span></div>' +
        '<div class="b">' + esc(q.body) + '</div>' +
        (q.answeredPostId ? '' : '<div style="margin-top:10px"><button class="btn btn-ghost btn-xs" data-answer="' + q.id + '">この質問への回答を配信する</button></div>') +
        '</div>';
    }).join('') + '</div>' : '<p class="small muted" style="margin-bottom:36px">まだありません。</p>';

    /* 感想 */
    h += '<h2 class="ttl-s">感想（第3回の案内から）</h2>';
    h += db.impressions.length ? '<div class="hist">' + db.impressions.map(function (i) {
      return '<div class="hist-item"><div class="h"><strong style="font-size:13px">' + esc(i.memberName) + '</strong>' +
        '<span class="small muted mono">' + R.fmtDate(i.at) + '</span></div><div class="b">' + esc(i.text) + '</div></div>';
    }).join('') + '</div>' : '<p class="small muted">まだありません。</p>';
    return h;
  }

  function bindSubmissions() {
    $('#r-csv').addEventListener('click', function () {
      var rows = [['氏名', 'メール', '週', '題名', '本文', '添付', '紹介許諾', '提出日時']];
      db.reports.forEach(function (r) {
        var m = db.members.filter(function (x) { return x.id === r.memberId; })[0] || {};
        rows.push([r.memberName, m.email || '', r.weekKey, r.title, r.body, r.fileName, r.consent ? 'あり' : '', R.fmtDateTime(r.submittedAt)]);
      });
      U.download('週1レポート.csv', R.toCSV(rows), 'text/csv');
    });
    $('#a-csv').addEventListener('click', function () {
      var rows = [['氏名', '回', '本文', '提出日時']];
      db.assignments.forEach(function (a) { rows.push([a.memberName, a.lesson, a.body, R.fmtDateTime(a.submittedAt)]); });
      U.download('課題提出.csv', R.toCSV(rows), 'text/csv');
    });
    $$('[data-answer]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = db.questions.filter(function (x) { return x.id === b.dataset.answer; })[0];
        var mod = U.modal('<h3 class="ttl-s" style="margin-bottom:10px">質問への回答を配信する</h3>' +
          '<div class="card-flat" style="margin-bottom:20px"><p class="small">' + esc(q.body) + '</p>' +
          '<p class="small muted" style="margin-top:8px">' + esc(q.memberName) + '　' + R.fmtDate(q.at) + '</p></div>' +
          '<label class="field"><span class="lbl">題名</span><input type="text" id="qa-title" value="質問回答：' + esc(q.body.slice(0, 18)) + '"></label>' +
          '<label class="field"><span class="lbl">本文</span><textarea id="qa-body"></textarea></label>' +
          '<div class="row" style="justify-content:flex-end"><button class="btn btn-ghost btn-s" data-close>やめる</button>' +
          '<button class="btn btn-fill btn-s" data-qa>配信する</button></div>');
        $('[data-qa]', mod).addEventListener('click', function () {
          var t = $('#qa-title', mod).value.trim(), bd = $('#qa-body', mod).value.trim();
          if (!t || !bd) return U.toast('題名と本文を入れてください');
          R.createPost({ kind: '質問回答', title: t, body: bd, mediaType: 'video', publishAt: S.clock.now(), answersQuestionId: q.id });
          R.refresh(); mod.close(); rerender(); U.toast('配信し、会員へ通知しました');
        });
      });
    });
  }

  /* ================= コンテンツ（F-3） ================= */
  function viewContent() {
    var h = pagehead('動画・教材・公開ページ', '動画URLと教材PDFの差し替え、公開側の文言はここで直します。');

    h += '<h2 class="ttl-s">動画講座（7回）</h2>' +
      '<table class="tbl" style="margin-bottom:36px"><thead><tr><th style="width:5em">回</th><th>題名</th><th>動画URL（限定公開）</th><th></th></tr></thead><tbody>' +
      db.lessons.map(function (l) {
        return '<tr><td class="mono">第' + l.no + '回</td>' +
          '<td><input type="text" data-ltitle="' + l.no + '" value="' + esc(l.title) + '"></td>' +
          '<td><input type="text" data-lurl="' + l.no + '" value="' + esc(l.videoUrl) + '" placeholder="YouTube限定公開URLなど"></td>' +
          '<td><button class="btn btn-ghost btn-xs" data-lsave="' + l.no + '">保存</button></td></tr>';
      }).join('') + '</tbody></table>';

    h += '<h2 class="ttl-s">教材PDF</h2>' +
      '<table class="tbl" style="margin-bottom:36px"><thead><tr><th>題名</th><th>ファイル</th><th>説明</th><th></th></tr></thead><tbody>' +
      db.materials.map(function (m) {
        return '<tr><td><input type="text" data-mtitle="' + m.id + '" value="' + esc(m.title) + '"></td>' +
          '<td class="small muted mono">' + esc(m.file) + '</td>' +
          '<td><input type="text" data-mnote="' + m.id + '" value="' + esc(m.note) + '"></td>' +
          '<td class="row" style="gap:6px"><label class="btn btn-ghost btn-xs" style="cursor:pointer">差し替え' +
          '<input type="file" data-mfile="' + m.id + '" accept="application/pdf" style="display:none"></label>' +
          '<button class="btn btn-ghost btn-xs" data-msave="' + m.id + '">保存</button></td></tr>';
      }).join('') + '</tbody></table>';

    h += '<h2 class="ttl-s">公開レポート（公開側）</h2>' +
      '<table class="tbl" style="margin-bottom:36px"><thead><tr><th>分類</th><th>題名</th><th>公開日</th></tr></thead><tbody>' +
      db.publicReports.map(function (r) {
        return '<tr><td><span class="tag">' + esc(r.category) + '</span></td><td>' + esc(r.title) + '</td>' +
          '<td class="mono">' + R.fmtDate(new Date(r.date).getTime()) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="small muted" style="margin-top:-24px;margin-bottom:36px">※ 公開レポートの本文は当方支給の原稿を流し込みます。追加できる形にしてあります。</p>';

    h += '<h2 class="ttl-s">サイトの文言</h2>' +
      '<div class="setting-grid">' +
      textField('siteName', 'サイト名') +
      textField('tagline', 'トップの一文') +
      textField('company', '会社名') +
      textField('representative', '代表者名') +
      textField('lineUrl', 'LINE公式アカウントURL') +
      textField('supportEmail', '問い合わせ先メール') +
      '</div><div style="margin-top:20px"><button class="btn btn-fill btn-s" id="s-save">保存する</button></div>';
    return h;
  }

  function textField(key, label) {
    return '<label class="field"><span class="lbl">' + esc(label) + '</span>' +
      '<input type="text" data-setting="' + key + '" value="' + esc(db.settings[key]) + '"></label>';
  }

  function bindContent() {
    $$('[data-lsave]').forEach(function (b) {
      b.addEventListener('click', function () {
        var no = Number(b.dataset.lsave);
        S.update(function (d) {
          var l = d.lessons.filter(function (x) { return x.no === no; })[0];
          l.title = $('[data-ltitle="' + no + '"]').value.trim() || l.title;
          l.videoUrl = $('[data-lurl="' + no + '"]').value.trim();
          S.put('lessons', l);
        });
        U.toast('第' + no + '回を保存しました');
        load();
      });
    });
    $$('[data-msave]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.msave;
        S.update(function (d) {
          var m = d.materials.filter(function (x) { return x.id === id; })[0];
          m.title = $('[data-mtitle="' + id + '"]').value.trim() || m.title;
          m.note = $('[data-mnote="' + id + '"]').value.trim();
          S.put('materials', m);
        });
        U.toast('保存しました'); load();
      });
    });
    $$('[data-mfile]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var f = inp.files[0]; if (!f) return;
        var id = inp.dataset.mfile;
        S.update(function (d) {
          var m = d.materials.filter(function (x) { return x.id === id; })[0];
          m.file = f.name; m.addedAt = new Date(S.clock.now()).toISOString();
          S.put('materials', m);
        });
        U.toast('「' + f.name + '」に差し替えました');
        rerender();
      });
    });
    $('#s-save').addEventListener('click', function () {
      S.update(function (d) {
        $$('[data-setting]').forEach(function (i) { d.settings[i.dataset.setting] = i.value.trim(); });
        S.put('settings', d.settings);
      });
      U.toast('保存しました'); rerender();
    });
  }

  /* ================= 料金・クーポン（F-4） ================= */
  function viewPricing() {
    var h = pagehead('料金・クーポン',
      '第1期の価格です。ここを変えると公開側の表示と、これから入る方の請求額が変わります。すでに入っている方の請求額は変わりません。');

    h += '<div class="card" style="margin-bottom:34px"><div class="grid-2">' +
      '<label class="field"><span class="lbl">入会金（税込）</span><input type="number" id="s-init" value="' + db.settings.priceInitial + '" step="1000"></label>' +
      '<label class="field"><span class="lbl">月額（税込）</span><input type="number" id="s-month" value="' + db.settings.priceMonthly + '" step="1000"></label>' +
      '<label class="field"><span class="lbl">配信の掲載期間（日）</span><input type="number" id="s-win" value="' + db.settings.archiveWindowDays + '">' +
      '<span class="hint">これを過ぎた配信は自動で非公開になります（殿堂入りを除く）。</span></label>' +
      '<label class="field"><span class="lbl">未払いで閲覧停止までの猶予（日）</span><input type="number" id="s-grace" value="' + db.settings.pastDueGraceDays + '"></label>' +
      '</div><button class="btn btn-fill btn-s" id="s-price-save">保存する</button></div>';

    h += '<div class="row-between" style="margin-bottom:12px"><h2 class="ttl-s">クーポン</h2>' +
      '<button class="btn btn-ghost btn-xs" id="c-new">新しく作る</button></div>';
    h += '<table class="tbl"><thead><tr><th>コード</th><th>内容</th><th>入会金</th><th>無料月数</th><th>上限</th><th>使用済み</th><th></th></tr></thead><tbody>' +
      db.coupons.map(function (c) {
        return '<tr><td class="mono">' + esc(c.code) + '</td><td>' + esc(c.label) + '</td>' +
          '<td>' + (c.waiveInitial ? '<span class="tag tag-gold">免除</span>' : '通常') + '</td>' +
          '<td class="mono">' + c.freeMonths + 'ヶ月</td>' +
          '<td class="mono">' + (c.limit || '無制限') + '</td>' +
          '<td class="mono">' + c.used + '</td>' +
          '<td><button class="btn btn-ghost btn-xs" data-ctoggle="' + esc(c.code) + '">' + (c.active ? '止める' : '再開') + '</button></td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="small muted" style="margin-top:14px">モニター用は「入会金免除＋初月無料」。' +
      '2ヶ月目から通常の月額が始まります。</p>';
    return h;
  }

  function bindPricing() {
    $('#s-price-save').addEventListener('click', function () {
      S.update(function (d) {
        d.settings.priceInitial = Number($('#s-init').value) || 0;
        d.settings.priceMonthly = Number($('#s-month').value) || 0;
        d.settings.archiveWindowDays = Math.max(1, Number($('#s-win').value) || 30);
        d.settings.pastDueGraceDays = Math.max(1, Number($('#s-grace').value) || 14);
        S.put('settings', d.settings);
      });
      U.toast('保存しました'); rerender();
    });
    $$('[data-ctoggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.update(function (d) {
          var c = d.coupons.filter(function (x) { return x.code === b.dataset.ctoggle; })[0];
          c.active = !c.active;
          S.put('coupons', c);
        });
        rerender();
      });
    });
    $('#c-new').addEventListener('click', function () {
      var mod = U.modal('<h3 class="ttl-s" style="margin-bottom:16px">クーポンを作る</h3>' +
        '<label class="field"><span class="lbl">コード</span><input type="text" id="c-code" placeholder="MONITOR2" style="text-transform:uppercase"></label>' +
        '<label class="field"><span class="lbl">説明</span><input type="text" id="c-label" placeholder="第2期モニター"></label>' +
        '<label class="check" style="margin-bottom:14px"><input type="checkbox" id="c-waive" checked><span>入会金を免除する</span></label>' +
        '<div class="grid-2">' +
        '<label class="field"><span class="lbl">無料月数</span><input type="number" id="c-free" value="1" min="0"></label>' +
        '<label class="field"><span class="lbl">発行上限（0で無制限）</span><input type="number" id="c-limit" value="10" min="0"></label>' +
        '</div><div class="row" style="justify-content:flex-end">' +
        '<button class="btn btn-ghost btn-s" data-close>やめる</button>' +
        '<button class="btn btn-fill btn-s" data-make>作る</button></div>');
      $('[data-make]', mod).addEventListener('click', function () {
        var code = $('#c-code', mod).value.trim().toUpperCase();
        if (!code) return U.toast('コードを入れてください');
        if (db.coupons.some(function (c) { return c.code === code; })) return U.toast('同じコードがあります');
        S.put('coupons', {
          code: code, label: $('#c-label', mod).value.trim() || code,
          waiveInitial: $('#c-waive', mod).checked,
          freeMonths: Number($('#c-free', mod).value) || 0,
          limit: Number($('#c-limit', mod).value) || 0, used: 0, active: true
        });
        mod.close(); rerender(); U.toast('作りました');
      });
    });
  }

  /* ================= 通知ログ ================= */
  function viewNotifications() {
    var now = S.clock.now();
    var h = pagehead('通知の送信ログ',
      '配信の投稿、決済の失敗、解約などで自動的に送られたお知らせです。' +
      'メールは会社ドメインから（SPF/DKIM設定込み）、LINEは友だち追加済みの会員だけに送ります。');
    h += '<table class="tbl"><thead><tr><th style="width:6em">経路</th><th>宛先</th><th>件名</th><th>本文</th><th style="width:9em">日時</th></tr></thead><tbody>' +
      (db.notifications.length ? db.notifications.slice(0, 120).map(function (n) {
        return '<tr><td><span class="tag ' + (n.channel === 'line' ? 'tag-ok' : 'tag-sea') + '">' +
          (n.channel === 'line' ? 'LINE' : 'メール') + '</span></td>' +
          '<td class="small">' + esc(n.memberName) + '<br><span class="muted mono" style="font-size:10.5px">' + esc(n.to) + '</span></td>' +
          '<td class="small">' + esc(n.subject) + '</td>' +
          '<td class="small muted">' + esc((n.body || '').slice(0, 60)) + '</td>' +
          '<td class="mono small">' + R.fmtDateTime(n.at) + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="muted">まだありません</td></tr>') + '</tbody></table>';
    return h;
  }

  /* ================= データ ================= */
  function viewData() {
    var cloud = S.mode() === 'cloud';
    var cfg = EZ.cloud.config();
    var h = pagehead('データ',
      cloud ? '本番につながっています。データは Firebase（Firestore）に入っています。'
            : 'バックアップと書き出し。いまはこの端末のブラウザに保存しています。');

    /* ---- 接続 ---- */
    h += '<div class="card" style="margin-bottom:1.5rem">' +
      '<div class="row-between" style="margin-bottom:.9rem">' +
      '<h3 class="ttl-s">本番のデータ置き場（Firebase）</h3>' +
      (cloud ? '<span class="tag tag-ok">つながっています</span>'
             : '<span class="tag tag-dim">つないでいません</span>') + '</div>';
    if (cloud) {
      h += '<table class="tbl" style="margin-bottom:1rem"><tbody>' +
        '<tr><th style="width:12em">プロジェクトID</th><td class="mono">' + esc(cfg.projectId) + '</td></tr>' +
        '<tr><th>ログイン中</th><td class="mono">' + esc((EZ.cloud.currentUser() || {}).email || '—') + '</td></tr>' +
        '</tbody></table>' +
        '<div class="row">' +
        '<button class="btn btn-ghost btn-s" id="c-seed">講座・教材・文言を書き込む</button>' +
        '<button class="btn btn-danger btn-s" id="c-off">接続を解除する</button></div>' +
        '<p class="small muted" style="margin-top:.8rem">' +
        '「書き込む」は、いま画面に入っている講座7回・教材・公開レポート・規約の文言を Firestore に入れ直します。' +
        '最初の1回だけ押してください。会員のデータには触りません。</p>';
    } else {
      h += '<p class="small muted" style="margin-bottom:1rem">' +
        'Firebase コンソールで取得した設定を貼り付けると、本番のデータ置き場につながります。' +
        '手順は <span class="mono">セットアップ手順.md</span> にあります。</p>' +
        '<label class="field"><span class="lbl">Firebase の設定（firebaseConfig の中身をそのまま貼り付け）</span>' +
        '<textarea id="c-cfg" style="min-height:9rem;font-family:var(--font-en);font-size:.8rem" ' +
        'placeholder=\'{ "apiKey": "...", "authDomain": "...", "projectId": "...", "storageBucket": "...", "messagingSenderId": "...", "appId": "..." }\'></textarea></label>' +
        '<button class="btn btn-fill btn-s" id="c-on">つなぐ</button>' +
        '<p class="small muted" style="margin-top:.8rem">' +
        'この設定は秘密の情報ではありません（公開しても問題ないもので、守りは Firestore のルールで行います）。</p>';
    }
    h += '</div>';
    h += '<div class="card" style="margin-bottom:24px">' +
      '<h3 class="ttl-s" style="margin-bottom:12px">書き出し</h3>' +
      '<div class="row"><button class="btn btn-ghost btn-s" id="d-members">会員一覧をCSV</button>' +
      '<button class="btn btn-ghost btn-s" id="d-pay">決済履歴をCSV</button>' +
      '<button class="btn btn-ghost btn-s" id="d-all">全データをJSON（バックアップ）</button></div></div>';
    if (cloud) return h;
    h += '<div class="card" style="margin-bottom:24px">' +
      '<h3 class="ttl-s" style="margin-bottom:12px">読み込み</h3>' +
      '<p class="small muted" style="margin-bottom:14px">バックアップしたJSONを戻します。いまのデータは上書きされます。</p>' +
      '<input type="file" id="d-import" accept="application/json"></div>';
    h += '<div class="card" style="border-color:var(--coral)">' +
      '<h3 class="ttl-s" style="margin-bottom:12px">デモデータ</h3>' +
      '<p class="small muted" style="margin-bottom:14px">中身を見るための仮の会員・配信です。本番の前に必ず消してください。</p>' +
      '<div class="row"><button class="btn btn-ghost btn-s" id="d-seed">デモデータを入れる</button>' +
      '<button class="btn btn-danger btn-s" id="d-clear">デモデータを消す</button>' +
      '<button class="btn btn-danger btn-s" id="d-reset">全部まっさらに戻す</button></div></div>';
    return h;
  }

  function bindData() {
    var on = $('#c-on');
    if (on) on.addEventListener('click', function () {
      var raw = $('#c-cfg').value.trim();
      if (!raw) return U.toast('設定を貼り付けてください');
      var cfg;
      try {
        /* firebaseConfig = {...} の形で貼られても読めるようにする */
        var body = raw.replace(/^[\s\S]*?=\s*/, '').replace(/;\s*$/, '');
        cfg = JSON.parse(body.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":').replace(/'/g, '"'));
      } catch (e) { return U.toast('設定を読み取れませんでした。{ } ごと貼り付けてください', 'alert'); }
      if (!cfg.apiKey || !cfg.projectId) return U.toast('apiKey と projectId が見あたりません', 'alert');
      EZ.cloud.setConfig(cfg);
      U.toast('つなぎました。読み込み直します…');
      setTimeout(function () { location.reload(); }, 900);
    });

    var off = $('#c-off');
    if (off) off.addEventListener('click', function () {
      U.confirmBox('接続を解除しますか',
        'この端末のブラウザから接続設定を消します。\nFirebase 側のデータは消えません。',
        '解除する').then(function (ok) {
          if (!ok) return;
          EZ.cloud.setConfig(null);
          location.reload();
        });
    });

    var seed = $('#c-seed');
    if (seed) seed.addEventListener('click', function () {
      U.confirmBox('書き込みますか',
        '講座7回・教材・公開レポート・規約の文言・料金設定を Firestore に入れ直します。\n会員のデータには触りません。',
        '書き込む').then(function (ok) {
          if (!ok) return;
          seed.disabled = true; seed.textContent = '書き込んでいます…';
          var base = EZ.buildSeed(Date.now());
          var d = S.read();
          S.put('settings', Object.assign({}, base.settings, d.settings || {}));
          S.put('legal', d.legal && d.legal.terms ? d.legal : base.legal);
          S.put('story', d.story && d.story.paragraphs ? d.story : base.story);
          S.put('guide', d.guide || base.guide);
          (d.lessons && d.lessons.length ? d.lessons : base.lessons).forEach(function (l) { S.put('lessons', l); });
          (d.materials && d.materials.length ? d.materials : base.materials).forEach(function (m) { S.put('materials', m); });
          (d.publicReports && d.publicReports.length ? d.publicReports : base.publicReports).forEach(function (r) { S.put('publicReports', r); });
          (d.coupons && d.coupons.length ? d.coupons : base.coupons).forEach(function (c) { S.put('coupons', c); });
          S.flush().then(function () {
            seed.disabled = false; seed.textContent = '講座・教材・文言を書き込む';
            U.toast('書き込みました');
          });
        });
    });

    if (S.mode() === 'cloud') return bindExports();
    bindExports();
    bindDemoButtons();
  }

  function bindExports() {
    $('#d-members').addEventListener('click', function () {
      var now = S.clock.now();
      var rows = [['氏名', 'メール', '入会日', '状態', '請求期間の終わり', '講座提出数', 'レポート本数', 'クーポン', 'LINE']];
      db.members.forEach(function (m) {
        var st = R.statusOf(m, now), pr = R.progressLabel(db, m);
        rows.push([m.name, m.email, R.fmtDate(m.joinedAt), st.label, R.fmtDate(m.billing.periodEnd),
          pr.submitted, db.reports.filter(function (r) { return r.memberId === m.id; }).length,
          m.coupon || '', m.lineLinked ? 'あり' : '']);
      });
      U.download('会員一覧.csv', R.toCSV(rows), 'text/csv');
    });
    $('#d-pay').addEventListener('click', function () {
      var rows = [['日付', '氏名', '内容', '金額', '状態']];
      db.payments.forEach(function (p) {
        rows.push([R.fmtDateTime(p.at), p.memberName, p.kind === 'initial' ? '入会金' : '月額', p.amount, p.status]);
      });
      U.download('決済履歴.csv', R.toCSV(rows), 'text/csv');
    });
    $('#d-all').addEventListener('click', function () {
      U.download('エビデンスゼミ-backup.json', S.exportJSON(), 'application/json');
    });
  }

  function bindDemoButtons() {
    $('#d-import').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try { S.importJSON(fr.result); U.toast('読み込みました'); rerender(); }
        catch (e) { U.toast('読み込めませんでした：' + e.message, 'alert'); }
      };
      fr.readAsText(f);
    });
    $('#d-seed').addEventListener('click', function () { EZ.demo.seed(); U.toast('デモデータを入れました'); rerender(); });
    $('#d-clear').addEventListener('click', function () {
      U.confirmBox('デモデータを消しますか', 'デモの会員・配信・提出物だけを消します。\n設定と講座の内容は残ります。', '消す').then(function (ok) {
        if (!ok) return; EZ.demo.clear(); U.toast('消しました'); rerender();
      });
    });
    $('#d-reset').addEventListener('click', function () {
      U.confirmBox('まっさらに戻しますか', '設定も含めて、すべて初期状態に戻します。\n元に戻せません。', '戻す').then(function (ok) {
        if (!ok) return; S.reset(); U.toast('初期化しました'); rerender();
      });
    });
  }

  /* ================= 描画 ================= */
  var VIEWS = {
    home: viewHome, members: viewMembers, posts: viewPosts, submissions: viewSubmissions,
    content: viewContent, pricing: viewPricing, notifications: viewNotifications, data: viewData
  };

  function rerender() {
    load();
    $('#root').innerHTML = shell(VIEWS[page]());
    window.scrollTo(0, 0);
    bindCommon();
    if (page === 'home') bindHome();
    if (page === 'members') bindMembers();
    if (page === 'posts') bindPosts();
    if (page === 'submissions') bindSubmissions();
    if (page === 'content') bindContent();
    if (page === 'pricing') bindPricing();
    if (page === 'data') bindData();
  }

  function bindHome() {
    var b = $('#mark-all');
    if (b) b.addEventListener('click', function () {
      S.update(function (d) { d.adminInbox.forEach(function (i) { if (!i.read) { i.read = true; S.put('adminInbox', i); } }); });
      rerender();
    });
    $$('[data-inbox]').forEach(function (el) {
      el.addEventListener('click', function () {
        S.update(function (d) {
          var i = d.adminInbox.filter(function (x) { return x.id === el.dataset.inbox; })[0];
          if (i && !i.read) { i.read = true; S.put('adminInbox', i); }
        });
        el.classList.remove('unread');
      });
    });
    $$('[data-member]').forEach(function (b2) {
      b2.addEventListener('click', function () { openMember(b2.dataset.member); });
    });
  }

  function bindMembers() {
    renderMemberTable();
    $('#m-search').addEventListener('input', renderMemberTable);
    $('#m-filter').addEventListener('change', renderMemberTable);
    $('#m-csv').addEventListener('click', function () {
      var now = S.clock.now();
      var rows = [['氏名', 'メール', '入会日', '決済状態', '講座進捗', '週1レポート本数']];
      db.members.forEach(function (m) {
        var st = R.statusOf(m, now), pr = R.progressLabel(db, m);
        rows.push([m.name, m.email, R.fmtDate(m.joinedAt), st.label, pr.submitted + '/' + pr.total,
          db.reports.filter(function (r) { return r.memberId === m.id; }).length]);
      });
      U.download('会員一覧.csv', R.toCSV(rows), 'text/csv');
    });
  }

  function bindCommon() {
    var lo = $('#adminLogout');
    if (lo) lo.addEventListener('click', function (e) { e.preventDefault(); EZ.cloud.stop(); EZ.cloud.signOut(); });
    var mb = $('#menuBtn');
    if (mb) mb.addEventListener('click', function () { $('#side').classList.toggle('open'); });
    $$('.side a.nav').forEach(function (a) {
      a.addEventListener('click', function () { $('#side').classList.remove('open'); });
    });
  }

  function boot() {
    load();
    if (sessionStorage.getItem(PASS_KEY) !== '1') return renderGate();
    page = location.hash.replace(/^#/, '') || 'home';
    if (!VIEWS[page]) page = 'home';
    rerender();
  }

  var signedIn = false;
  window.addEventListener('hashchange', function () {
    var p = location.hash.replace(/^#/, '') || 'home';
    var allowed = S.mode() === 'cloud' ? signedIn : sessionStorage.getItem(PASS_KEY) === '1';
    if (VIEWS[p] && allowed) { page = p; rerender(); }
  });

  /* ---------- 本番（Firebase）の起動 ---------- */
  function onCloudReady() {
    db = S.read();
    page = location.hash.replace(/^#/, '') || 'home';
    if (!VIEWS[page]) page = 'home';
    rerender();
  }

  async function bootCloud() {
    loading('接続しています…');
    try { await EZ.cloud.init(); }
    catch (e) {
      console.error(e);
      S.forceLocal();
      U.toast('本番につながらないため、体験版で開いています', 'alert');
      boot(); return;
    }
    EZ.cloud.watchAuth(async function (user) {
      if (!user) { EZ.cloud.stop(); signedIn = false; db = S.read(); renderCloudGate(); return; }
      loading('権限を確認しています…');
      var ok = await EZ.cloud.isAdmin(user.uid);
      if (!ok) {
        signedIn = false;
        await EZ.cloud.signOut();
        renderCloudGate('この画面を開ける権限がありません。管理者として登録されているか確認してください。');
        return;
      }
      signedIn = true;
      loading('読み込んでいます…');
      S.attachCloud('admin', user.uid, onCloudReady);
    });
  }

  if (S.mode() === 'cloud') {
    bootCloud();
  } else {
    boot();
    U.devbar(function () { boot(); });
  }
})();
