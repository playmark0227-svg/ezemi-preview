/* ============================================================
   会員ページ
   ============================================================ */
(function () {
  'use strict';
  var EZ = window.EZ, S = EZ.store, R = EZ.rules, U = EZ.ui;
  var esc = U.esc, nl2br = U.nl2br, $ = U.$, $$ = U.$$;
  var db, me, page = 'home';

  EZ.demo.ensure();
  function load() { R.refresh(); db = S.read(); }

  function currentMember() {
    var s = S.session.get();
    if (!s || !s.memberId) return null;
    return db.members.filter(function (m) { return m.id === s.memberId; })[0] || null;
  }

  /* ================= ログイン ================= */
  function renderLogin(msg) {
    var demoList = db.members.slice(0, 6);
    $('#root').innerHTML =
      '<div class="login-wrap"><div class="login-box">' +
      '<a class="brand" href="index.html"><picture><source srcset="assets/img/logo-full.webp" type="image/webp"><img class="brand__logo" src="assets/img/logo-full.png" alt="株式会社知上会" width="600" height="215"></picture><span class="brand__sub">' + esc(db.settings.siteName) + '<small>会員ページ</small></span></a>' +
      '<div class="card">' +
      (msg ? '<p class="small" style="color:var(--coral);margin-bottom:16px">' + esc(msg) + '</p>' : '') +
      '<label class="field"><span class="lbl">メールアドレス</span><input type="email" id="l-email" autocomplete="username"></label>' +
      '<label class="field"><span class="lbl">パスワード</span><input type="password" id="l-pass" autocomplete="current-password"></label>' +
      '<label class="check" style="margin-bottom:22px"><input type="checkbox" id="l-remember" checked><span>このブラウザでログインしたままにする</span></label>' +
      '<button class="btn btn-fill" id="l-go" style="width:100%">ログイン</button>' +
      '</div>' +
      (demoList.length ?
        '<div class="card-flat" style="margin-top:18px">' +
        '<p class="small muted" style="margin-bottom:10px">デモ用のログイン（クリックで入れます／パスワードは demo1234）</p>' +
        demoList.map(function (m) {
          var st = R.statusOf(m, S.clock.now());
          return '<button class="btn btn-ghost btn-xs" style="margin:0 6px 6px 0" data-demo="' + m.id + '">' +
            esc(m.name) + '　<span class="muted">' + esc(st.label) + '</span></button>';
        }).join('') + '</div>' : '') +
      '<p class="center small muted" style="margin-top:22px"><a href="index.html">スクールのページへ戻る</a></p>' +
      '</div></div>';

    $('#l-go').addEventListener('click', doLogin);
    $('#l-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    $$('[data-demo]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.session.set({ memberId: b.dataset.demo }, true);
        boot();
      });
    });
  }

  function doLogin() {
    var email = $('#l-email').value.trim().toLowerCase();
    var pass = $('#l-pass').value;
    var m = db.members.filter(function (x) { return x.email.toLowerCase() === email; })[0];
    if (!m || m.password !== pass) return renderLogin('メールアドレスかパスワードが違います');
    S.session.set({ memberId: m.id }, $('#l-remember').checked);
    boot();
  }

  /* ================= 枠 ================= */
  var NAV = [
    { id: 'home', label: 'ホーム' },
    { id: 'lessons', label: '動画講座' },
    { id: 'feed', label: '配信アーカイブ' },
    { id: 'materials', label: '教材ダウンロード' },
    { id: 'reports', label: '週1レポート' },
    { id: 'questions', label: '質問' },
    { id: 'account', label: 'アカウント' }
  ];

  function shell(inner) {
    var st = R.statusOf(me, S.clock.now());
    var prog = R.progressLabel(db, me);
    var counts = { lessons: prog.total - prog.submitted };
    return '<div class="app">' +
      '<aside class="side" id="side">' +
      '<a class="brand" href="index.html"><picture><source srcset="assets/img/logo-full.webp" type="image/webp"><img class="brand__logo" src="assets/img/logo-full.png" alt="株式会社知上会" width="600" height="215"></picture><span class="brand__sub">' + esc(db.settings.siteName) + '<small>会員ページ</small></span></a>' +
      '<div class="side-grp">メニュー</div>' +
      NAV.map(function (n) {
        return '<a class="nav' + (page === n.id ? ' on' : '') + '" href="#' + n.id + '">' +
          '<span>' + esc(n.label) + '</span></a>';
      }).join('') +
      '<div class="side-foot">' +
      '<div class="who">' + esc(me.name) + '</div>' +
      '<div class="st">' + esc(st.label) + '　次回 ' + R.fmtDateShort(me.billing.periodEnd) + '</div>' +
      '<a href="#" id="logout" style="margin-top:6px;display:inline-block">ログアウト</a>' +
      '</div></aside>' +
      '<div>' +
      '<div class="mobile-head"><button id="menuBtn">メニュー</button>' +
      '<picture><source srcset="assets/img/logo-full.webp" type="image/webp"><img class="brand__logo" src="assets/img/logo-full.png" alt="株式会社知上会" width="600" height="215"></picture>' +
      '<span class="ttl-s">' + esc(db.settings.siteName) + '</span></div>' +
      '<main class="main">' + inner + '</main></div></div>';
  }

  function pagehead(title, lead) {
    return '<div class="pagehead"><h1 class="ttl-m">' + esc(title) + '</h1>' +
      (lead ? '<p>' + nl2br(lead) + '</p>' : '') + '</div>';
  }

  function blockedNotice() {
    var st = R.statusOf(me, S.clock.now());
    if (st.canView) return '';
    var msg = st.code === 'suspended'
      ? 'お支払いが確認できないため、閲覧を停止しています。カード情報を更新いただければすぐに再開できます。'
      : '会員期間が終了しています。もう一度入会いただくと、続きから利用できます。';
    return '<div class="card" style="border-color:var(--coral);margin-bottom:26px">' +
      '<span class="tag tag-alert">' + esc(st.label) + '</span>' +
      '<p class="small" style="margin-top:12px;color:var(--ink-2)">' + esc(msg) + '</p>' +
      '<div class="row" style="margin-top:16px">' +
      (st.code === 'suspended' ? '<button class="btn btn-danger btn-s" data-fixcard>カード情報を更新する</button>' : '') +
      '<a class="btn btn-ghost btn-s" href="index.html#/join">入会の案内</a></div></div>';
  }

  /* ================= ホーム ================= */
  function viewHome() {
    var now = S.clock.now();
    var st = R.statusOf(me, now);
    var prog = R.progressLabel(db, me);
    var states = R.lessonStates(db, me, now);
    var nextLesson = states.filter(function (s) { return s.unlocked && !s.submitted; })[0];
    var wk = R.weekKey(now);
    var thisWeekReport = db.reports.filter(function (r) { return r.memberId === me.id && r.weekKey === wk; })[0];
    var newPosts = R.visiblePosts(db, now).filter(function (p) { return now - p.publishAt < 7 * EZ.DAY; });

    var h = pagehead('こんにちは、' + me.name + 'さん',
      '今週やることは下の3つです。上から順に進めれば大丈夫です。');

    h += blockedNotice();

    h += '<div class="todo" style="margin-bottom:30px">';
    h += '<div class="todo-item' + (nextLesson ? '' : ' done') + '"><div class="mk">' + (nextLesson ? '' : '✓') + '</div><div class="tx">' +
      '<h4>' + (nextLesson ? '第' + nextLesson.lesson.no + '回「' + esc(nextLesson.lesson.title) + '」を見て、課題を出す' : '入門講座 7回はすべて提出済みです') + '</h4>' +
      '<p>' + (nextLesson ? '課題を出すと、その場で次の回が開きます。' : 'お疲れさまでした。あとは配信と週1レポートを続けてください。') + '</p></div>' +
      (nextLesson ? '<a class="btn btn-s" href="#lessons">開く</a>' : '') + '</div>';

    h += '<div class="todo-item' + (thisWeekReport ? ' done' : '') + '"><div class="mk">' + (thisWeekReport ? '✓' : '') + '</div><div class="tx">' +
      '<h4>今週のレポートを出す</h4><p>' + (thisWeekReport ? R.fmtDate(thisWeekReport.submittedAt) + 'に提出済みです。' : '週に1本。主張・根拠・限界の3つに分けて書きます。') + '</p></div>' +
      (thisWeekReport ? '' : '<a class="btn btn-s" href="#reports">書く</a>') + '</div>';

    h += '<div class="todo-item' + (newPosts.length ? '' : ' done') + '"><div class="mk">' + (newPosts.length ? '' : '✓') + '</div><div class="tx">' +
      '<h4>' + (newPosts.length ? '新しい配信が' + newPosts.length + '本あります' : '直近1週間の配信は読み終えています') + '</h4>' +
      '<p>配信は公開から' + db.settings.archiveWindowDays + '日で自動的に読めなくなります。</p></div>' +
      (newPosts.length ? '<a class="btn btn-s" href="#feed">読む</a>' : '') + '</div>';
    h += '</div>';

    h += '<div class="stats-app" style="margin-bottom:30px">' +
      '<div class="stat"><div class="k">講座の進み</div><div class="v">' + prog.submitted + '<small>/ ' + prog.total + ' 回</small></div></div>' +
      '<div class="stat"><div class="k">出したレポート</div><div class="v">' + db.reports.filter(function (r) { return r.memberId === me.id; }).length + '<small>本</small></div></div>' +
      '<div class="stat"><div class="k">いま読める配信</div><div class="v">' + R.visiblePosts(db, now).length + '<small>本</small></div></div>' +
      '<div class="stat"><div class="k">会員資格</div><div class="v" style="font-size:17px;padding-top:6px">' + esc(st.label) + '</div></div>' +
      '</div>';

    var recent = R.visiblePosts(db, now).slice(0, 3);
    if (recent.length) {
      h += '<h2 class="ttl-s bar-ttl">最近の配信</h2>' + recent.map(postCard).join('') +
        '<a class="btn btn-ghost btn-s" href="#feed">配信アーカイブへ</a>';
    }
    return h;
  }

  /* ================= 講座（B） ================= */
  function viewLessons() {
    var now = S.clock.now();
    var states = R.lessonStates(db, me, now);
    var h = pagehead('動画講座（全' + db.lessons.length + '回）',
      '第1回は入会直後から見られます。第2回以降は、前の回の課題を出すとその場で開きます。事務局の承認待ちはありません。');
    h += blockedNotice();
    h += states.map(function (s) {
      var l = s.lesson;
      var open = s.unlocked && !s.submitted;
      return '<div class="lesson' + (s.unlocked ? '' : ' locked') + (open ? ' open' : '') + '" data-lesson="' + l.no + '">' +
        '<div class="lesson-head" data-toggle>' +
        '<span class="no">第' + l.no + '回</span>' +
        '<div class="ti"><h3>' + esc(l.title) + '</h3><p>' + esc(l.lead) + '</p></div>' +
        '<div class="rt">' +
        (s.submitted ? '<span class="tag tag-ok">提出済み</span>' :
          s.unlocked ? '<span class="tag tag-sea">受講できます</span>' :
            '<span class="tag tag-dim">🔒 ' + esc(s.lockedBy) + '</span>') +
        '<span class="len muted mono small">' + l.minutes + '分</span>' +
        '</div></div>' +
        '<div class="lesson-body">' + (s.unlocked ? lessonBody(l, s) : '') + '</div>' +
        '</div>';
    }).join('');
    return h;
  }

  function lessonBody(l, s) {
    var h = '';
    h += '<div class="video-ph"><span class="big">第' + l.no + '回　' + esc(l.title) + '</span>' +
      '<span>' + (l.videoUrl ? esc(l.videoUrl) : '動画URL未設定（管理画面から差し替えます）') + '</span>' +
      '<span style="font-size:10.5px">限定公開・ダウンロード不可</span></div>';
    if (!s.watchedAt) {
      h += '<div class="row" style="margin-bottom:20px"><button class="btn btn-ghost btn-s" data-watched="' + l.no + '">見終わった</button>' +
        '<span class="small muted">押すと視聴済みとして記録されます</span></div>';
    } else {
      h += '<p class="small muted" style="margin-bottom:20px">視聴済み（' + R.fmtDate(s.watchedAt) + '）</p>';
    }
    h += '<div class="task-box">' +
      '<div class="lbl-h">' + (l.isFinal ? '第' + l.no + '回の課題（フルレポート）' : '第' + l.no + '回の課題') + '</div>' +
      '<p class="q">' + nl2br(l.task) + '</p>';
    if (s.submitted) {
      h += '<div class="card-flat"><p class="small muted" style="margin-bottom:8px">提出済み　' + R.fmtDateTime(s.submission.submittedAt) + '</p>' +
        '<p class="small" style="white-space:pre-wrap;color:var(--ink-2)">' + esc(s.submission.body) + '</p></div>';
    } else {
      h += '<textarea data-task="' + l.no + '" placeholder="ここに書いて、下のボタンで提出します。長さは自由です。"></textarea>' +
        '<div class="row" style="margin-top:14px"><button class="btn btn-fill btn-s" data-submit="' + l.no + '">提出する</button>' +
        '<span class="small muted">' + (l.isFinal ? '提出すると「合流ガイド」をお渡しします。' : '提出すると第' + (l.no + 1) + '回がすぐ開きます。') + '</span></div>';
    }
    h += '</div>';
    return h;
  }

  function bindLessons() {
    $$('[data-toggle]').forEach(function (el) {
      el.addEventListener('click', function () {
        var card = el.parentElement;
        if (card.classList.contains('locked')) { U.toast('前の回の課題を出すと開きます'); return; }
        card.classList.toggle('open');
      });
    });
    $$('[data-watched]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        R.markWatched(me.id, Number(b.dataset.watched));
        U.toast('視聴済みにしました');
        rerender();
      });
    });
    $$('[data-submit]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var no = Number(b.dataset.submit);
        var ta = $('[data-task="' + no + '"]');
        var body = ta.value.trim();
        if (body.length < 10) return U.toast('もう少し書いてから提出してください');
        try {
          var res = R.submitAssignment(me.id, no, body);
          load(); me = currentMember();
          if (res.guide) {
            U.modal('<span class="eyebrow">提出完了</span><h3 class="ttl-s" style="margin-bottom:14px">フルレポートを受け取りました</h3>' +
              '<p class="small" style="color:var(--ink-2);margin-bottom:12px">「合流ガイド」を教材ダウンロードに追加しました。</p>' +
              '<p class="small" style="color:var(--ink-2);margin-bottom:24px">個別の添削についてはこのあと事務局からご連絡します。</p>' +
              '<div class="row" style="justify-content:flex-end"><button class="btn btn-fill btn-s" data-close>わかりました</button></div>');
          } else {
            U.toast('提出しました。第' + res.unlockedNext + '回が開きました');
          }
          if (res.askImpression) setTimeout(askImpression, res.guide ? 600 : 900);
          rerender();
        } catch (err) { U.toast(err.message, 'alert'); }
      });
    });
  }

  /* B-5 第3回のあと一度だけ */
  function askImpression() {
    var m = U.modal(
      '<span class="eyebrow">任意</span>' +
      '<h3 class="ttl-s" style="margin-bottom:12px">ここまでで感じたことがあれば</h3>' +
      '<p class="small" style="color:var(--ink-2);margin-bottom:18px">第3回まで進んだ方にだけ、一度だけお聞きしています。' +
      '内容は自由で、書かなくても何も起きません。SNSへの投稿をお願いすることもありません。</p>' +
      '<textarea id="imp-text" placeholder="思ったことをそのまま書いてください"></textarea>' +
      '<div class="row" style="justify-content:flex-end;margin-top:18px">' +
      '<button class="btn btn-ghost btn-s" data-skip>閉じる</button>' +
      '<button class="btn btn-fill btn-s" data-send>送る</button></div>', { sticky: true });
    $('[data-skip]', m).addEventListener('click', function () { R.markImpressionPrompted(me.id); m.close(); load(); me = currentMember(); });
    $('[data-send]', m).addEventListener('click', function () {
      var t = $('#imp-text', m).value.trim();
      if (!t) { R.markImpressionPrompted(me.id); m.close(); load(); me = currentMember(); return; }
      R.submitImpression(me.id, t);
      m.close(); load(); me = currentMember();
      U.toast('ありがとうございます');
    });
  }

  /* ================= 配信（C） ================= */
  function postCard(p) {
    var now = S.clock.now();
    var vis = R.postVisibility(db, p, now);
    return '<article class="post">' +
      '<div class="meta">' +
      '<span class="tag">' + esc(p.kind) + '</span>' +
      (p.permanent ? '<span class="tag tag-gold">殿堂入り</span>' :
        '<span class="tag' + (vis.tone ? ' tag-' + vis.tone : '') + '">' + esc(vis.label) + '</span>') +
      '<span class="dt">' + R.fmtDateTime(p.publishAt) + '</span>' +
      '</div>' +
      '<h3>' + esc(p.title) + '</h3>' +
      '<div class="bd">' + nl2br(p.body) + '</div>' +
      (p.mediaType !== 'none' ?
        '<div class="media"><span class="mono" style="font-size:10px">' +
        (p.mediaType === 'video' ? 'VIDEO' : p.mediaType === 'audio' ? 'AUDIO' : 'IMAGE') + '</span>' +
        '<span>' + esc(p.mediaUrl || '埋め込みURL未設定') + '　／　閲覧のみ・ダウンロード不可</span></div>' : '') +
      '</article>';
  }

  function viewFeed() {
    var now = S.clock.now();
    var posts = R.visiblePosts(db, now);
    var expiredCount = db.posts.filter(function (p) { return R.postVisibility(db, p, now).code === 'archived'; }).length;
    var h = pagehead('配信アーカイブ',
      '週2〜3回の会員限定配信です。公開から' + db.settings.archiveWindowDays + '日を過ぎたものは自動的に読めなくなります。' +
      '「殿堂入り」の印がついたものだけはずっと残ります。');
    h += blockedNotice();
    if (!R.canView(me, now)) return h;
    h += posts.length ? posts.map(postCard).join('') : '<div class="expired-note">いま読める配信はありません。</div>';
    if (expiredCount) {
      h += '<div class="expired-note" style="margin-top:16px">掲載期間が終わった配信が ' + expiredCount + ' 本あります。' +
        '会員限定配信は直近' + db.settings.archiveWindowDays + '日ぶんだけを置いています。</div>';
    }
    return h;
  }

  /* ================= 教材 ================= */
  function viewMaterials() {
    var now = S.clock.now();
    var h = pagehead('教材ダウンロード', '会員限定のPDFです。講座と一緒に使ってください。');
    h += blockedNotice();
    if (!R.canView(me, now)) return h;
    h += db.materials.map(function (m) {
      return '<div class="mat"><div class="ic">PDF</div><div class="tx"><h4>' + esc(m.title) + '</h4>' +
        '<p>' + esc(m.note) + '</p></div>' +
        '<button class="btn btn-ghost btn-xs" data-dl="' + esc(m.title) + '">開く</button></div>';
    }).join('');
    if (me.flags.guideDeliveredAt) {
      h += '<h2 class="ttl-s bar-ttl" style="margin-top:34px">第7回の提出でお渡ししたもの</h2>' +
        '<div class="mat mat--gold"><div class="ic">PDF</div>' +
        '<div class="tx"><h4>' + esc(db.guide.title) + '</h4><p>' + R.fmtDate(me.flags.guideDeliveredAt) + 'にお渡ししました</p></div>' +
        '<button class="btn btn-xs" data-dl="' + esc(db.guide.title) + '">開く</button></div>';
    }
    return h;
  }

  /* ================= 週1レポート（D-1 / D-2） ================= */
  function viewReports() {
    var now = S.clock.now();
    var wk = R.weekKey(now);
    var mine = db.reports.filter(function (r) { return r.memberId === me.id; });
    var thisWeek = mine.filter(function (r) { return r.weekKey === wk; })[0];
    var h = pagehead('週1レポート',
      '週に1本、自分で選んだ題材を主張・根拠・限界の3つに分けて書きます。今週分は ' + wk + ' として記録されます。');
    h += blockedNotice();
    if (!R.canView(me, now)) return h;

    if (thisWeek) {
      h += '<div class="card" style="margin-bottom:30px"><span class="tag tag-ok">今週分は提出済み</span>' +
        '<p class="small muted" style="margin-top:10px">' + R.fmtDateTime(thisWeek.submittedAt) + '</p></div>';
    } else {
      h += '<div class="card" style="margin-bottom:30px">' +
        '<label class="field"><span class="lbl">題名（任意）</span><input type="text" id="r-title" placeholder="例：地方の再エネファンドの利回りを確かめた"></label>' +
        '<label class="field"><span class="lbl">本文</span>' +
        '<textarea id="r-body" style="min-height:190px" placeholder="主張／根拠／限界の3つに分けて書いてください。"></textarea></label>' +
        '<label class="field"><span class="lbl">ファイル添付（任意）</span><input type="file" id="r-file"></label>' +
        '<label class="check" style="margin:6px 0 22px"><input type="checkbox" id="r-consent">' +
        '<span>このレポートを配信内で添削・紹介することを許諾します（任意）<br>' +
        '<span class="muted small">許諾した記録が残ります。あとから取り消したい場合は事務局までご連絡ください。</span></span></label>' +
        '<button class="btn btn-fill" id="r-send">提出する</button></div>';
    }

    h += '<h2 class="ttl-s bar-ttl">これまでのレポート（' + mine.length + '本）</h2>';
    h += mine.length ? '<div class="hist">' + mine.map(function (r) {
      return '<div class="hist-item"><div class="h">' +
        '<span class="tag">' + esc(r.weekKey) + '</span>' +
        (r.consent ? '<span class="tag tag-gold">紹介 許諾あり</span>' : '') +
        (r.fileName ? '<span class="tag tag-dim">' + esc(r.fileName) + '</span>' : '') +
        '<span class="small muted mono">' + R.fmtDate(r.submittedAt) + '</span></div>' +
        (r.title ? '<h4 style="font-size:14px;margin-bottom:6px">' + esc(r.title) + '</h4>' : '') +
        '<div class="b">' + esc(r.body) + '</div></div>';
    }).join('') + '</div>' : '<p class="small muted">まだありません。</p>';
    return h;
  }

  function bindReports() {
    var b = $('#r-send');
    if (!b) return;
    b.addEventListener('click', function () {
      var body = $('#r-body').value.trim();
      if (body.length < 20) return U.toast('もう少し書いてから提出してください');
      var f = $('#r-file').files[0];
      try {
        R.submitReport(me.id, {
          title: $('#r-title').value.trim(), body: body,
          fileName: f ? f.name : '', consent: $('#r-consent').checked
        });
        U.toast('提出しました');
        rerender();
      } catch (e) { U.toast(e.message, 'alert'); }
    });
  }

  /* ================= 質問（D-3） ================= */
  function viewQuestions() {
    var now = S.clock.now();
    var mine = db.questions.filter(function (q) { return q.memberId === me.id; });
    var h = pagehead('質問',
      'いつでも出せます。回答は録画して配信アーカイブに載せます。個別に返信はしていません。');
    h += blockedNotice();
    if (!R.canView(me, now)) return h;
    h += '<div class="card" style="margin-bottom:30px">' +
      '<label class="field"><span class="lbl">質問</span><textarea id="q-body" placeholder="できるだけ具体的に書いてください。"></textarea></label>' +
      '<button class="btn btn-fill" id="q-send">送る</button></div>';
    h += '<h2 class="ttl-s bar-ttl">出した質問（' + mine.length + '件）</h2>';
    h += mine.length ? '<div class="hist">' + mine.map(function (q) {
      var post = q.answeredPostId ? db.posts.filter(function (p) { return p.id === q.answeredPostId; })[0] : null;
      return '<div class="hist-item"><div class="h">' +
        (post ? '<span class="tag tag-ok">回答済み</span>' : '<span class="tag tag-dim">受付済み</span>') +
        '<span class="small muted mono">' + R.fmtDate(q.at) + '</span></div>' +
        '<div class="b">' + esc(q.body) + '</div>' +
        (post ? '<p class="small" style="margin-top:10px">回答：<a href="#feed">' + esc(post.title) + '</a></p>' : '') +
        '</div>';
    }).join('') + '</div>' : '<p class="small muted">まだありません。</p>';
    return h;
  }

  function bindQuestions() {
    var b = $('#q-send');
    if (!b) return;
    b.addEventListener('click', function () {
      var body = $('#q-body').value.trim();
      if (body.length < 5) return U.toast('質問を書いてください');
      R.submitQuestion(me.id, body);
      U.toast('受け付けました');
      rerender();
    });
  }

  /* ================= アカウント（A-4 / A-5） ================= */
  function viewAccount() {
    var now = S.clock.now();
    var st = R.statusOf(me, now);
    var b = me.billing;
    var pays = db.payments.filter(function (p) { return p.memberId === me.id; });
    var h = pagehead('アカウント', 'お支払いと会員資格の状態です。解約はこのページから完結し、連絡は不要です。');

    h += '<div class="card" style="margin-bottom:24px">' +
      '<div class="row-between" style="margin-bottom:20px">' +
      '<div><span class="eyebrow">会員資格</span><h3 class="ttl-s">' + esc(st.label) + '</h3></div>' +
      '<span class="tag tag-' + (st.tone || 'dim') + '">' + esc(st.label) + '</span></div>' +
      '<table class="tbl"><tbody>' +
      row('お名前', esc(me.name)) +
      row('メールアドレス', esc(me.email)) +
      row('入会日', R.fmtDate(me.joinedAt)) +
      row('いまの請求期間', R.fmtDate(b.periodStart) + ' 〜 ' + R.fmtDate(b.periodEnd)) +
      row(b.cancelRequestedAt ? '閲覧できる期限' : '次回のお支払い',
        b.cancelRequestedAt
          ? R.fmtDate(b.periodEnd) + '（あと' + Math.max(0, R.daysLeft(b.periodEnd, now)) + '日）'
          : R.fmtDate(b.periodEnd) + '　' + R.fmtYen(b.freeMonths > 0 ? 0 : db.settings.priceMonthly)) +
      (b.freeMonths > 0 ? row('無料期間', 'あと ' + b.freeMonths + ' ヶ月') : '') +
      (me.coupon ? row('適用クーポン', esc(me.coupon)) : '') +
      row('LINE通知', me.lineLinked ? '受け取る' : '受け取らない') +
      '</tbody></table></div>';

    if (st.code === 'past_due') {
      h += '<div class="card" style="border-color:var(--warn);margin-bottom:24px">' +
        '<h3 class="ttl-s" style="margin-bottom:10px">お支払いが確認できていません</h3>' +
        '<p class="small" style="color:var(--ink-2);margin-bottom:8px">' +
        R.fmtDate(b.nextRetryAt) + 'に自動でもう一度お試しします（' + b.failCount + '回目）。</p>' +
        '<p class="small" style="color:var(--ink-2);margin-bottom:18px">' +
        R.fmtDate(b.firstFailAt + db.settings.pastDueGraceDays * EZ.DAY) + 'までに確認できない場合、閲覧を停止します。</p>' +
        '<button class="btn btn-danger btn-s" data-fixcard>カード情報を更新する</button></div>';
    }

    h += '<h2 class="ttl-s bar-ttl">お支払いの履歴</h2>';
    h += '<table class="tbl" style="margin-bottom:34px"><thead><tr><th>日付</th><th>内容</th><th class="num">金額</th><th>状態</th></tr></thead><tbody>' +
      (pays.length ? pays.map(function (p) {
        return '<tr><td class="mono">' + R.fmtDate(p.at) + '</td>' +
          '<td>' + (p.kind === 'initial' ? '入会金' : '月額') + '</td>' +
          '<td class="num">' + R.fmtYen(p.amount) + '</td>' +
          '<td>' + payTag(p.status) + '</td></tr>';
      }).join('') : '<tr><td colspan="4" class="muted">まだありません</td></tr>') + '</tbody></table>';

    h += '<h2 class="ttl-s bar-ttl">解約</h2>';
    if (b.cancelRequestedAt) {
      h += '<div class="card"><p class="small" style="color:var(--ink-2);margin-bottom:16px">' +
        '解約を受け付けています。' + R.fmtDate(b.periodEnd) + ' までは今までどおりご覧いただけます。以降は自動で終了し、次のお支払いは発生しません。</p>' +
        '<button class="btn btn-ghost btn-s" id="undo-cancel">解約を取り消す</button></div>';
    } else if (st.canView) {
      h += '<div class="card"><p class="small" style="color:var(--ink-2);margin-bottom:8px">' +
        'このページから解約できます。事務局への連絡は要りません。</p>' +
        '<p class="small" style="color:var(--ink-2);margin-bottom:18px">' +
        '解約しても ' + R.fmtDate(b.periodEnd) + ' までは今までどおりご覧いただけます。日割りの返金はありません。</p>' +
        '<button class="btn btn-danger btn-s" id="do-cancel">解約する</button></div>';
    } else {
      h += '<p class="small muted">会員期間はすでに終了しています。</p>';
    }
    return h;
  }

  function row(k, v) { return '<tr><th style="width:14em">' + k + '</th><td>' + v + '</td></tr>'; }
  function payTag(s) {
    if (s === 'paid') return '<span class="tag tag-ok">完了</span>';
    if (s === 'free') return '<span class="tag tag-sea">無料</span>';
    if (s === 'failed') return '<span class="tag tag-alert">失敗</span>';
    if (s === 'refunded') return '<span class="tag tag-warn">返金済み</span>';
    return '<span class="tag">' + esc(s) + '</span>';
  }

  function bindAccount() {
    var c = $('#do-cancel');
    if (c) c.addEventListener('click', function () {
      U.confirmBox('解約しますか',
        R.fmtDate(me.billing.periodEnd) + ' までは今までどおりご覧いただけます。\n以降は自動で終了し、次のお支払いは発生しません。',
        '解約する').then(function (ok) {
          if (!ok) return;
          var end = R.cancelSelf(me.id);
          U.toast('解約を受け付けました（' + R.fmtDate(end) + 'まで閲覧できます）');
          rerender();
        });
    });
    var u = $('#undo-cancel');
    if (u) u.addEventListener('click', function () { R.undoCancel(me.id); U.toast('解約を取り消しました'); rerender(); });
  }

  function bindCardFix() {
    $$('[data-fixcard]').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = U.modal('<h3 class="ttl-s" style="margin-bottom:12px">カード情報の更新</h3>' +
          '<p class="small muted" style="margin-bottom:20px">本番では Stripe のカード更新画面に置き換わります。</p>' +
          '<label class="field"><span class="lbl">カード番号（デモ）</span>' +
          '<input type="text" value="4242 4242 4242 4242" readonly style="font-family:var(--mono);background:var(--card-2)"></label>' +
          '<div class="row" style="justify-content:flex-end;margin-top:20px">' +
          '<button class="btn btn-ghost btn-s" data-close>やめる</button>' +
          '<button class="btn btn-fill btn-s" data-ok>更新してすぐ再試行</button></div>', { sticky: true });
        $('[data-ok]', m).addEventListener('click', function () {
          R.retryNow(me.id); m.close(); R.refresh(); rerender();
          U.toast('カードを更新し、決済をやり直しました');
        });
      });
    });
  }

  /* ================= 描画 ================= */
  var VIEWS = {
    home: viewHome, lessons: viewLessons, feed: viewFeed, materials: viewMaterials,
    reports: viewReports, questions: viewQuestions, account: viewAccount
  };

  function rerender() {
    load();
    me = currentMember();
    if (!me) return renderLogin();
    $('#root').innerHTML = shell(VIEWS[page]());
    window.scrollTo(0, 0);
    bindCommon();
    if (page === 'lessons') bindLessons();
    if (page === 'reports') bindReports();
    if (page === 'questions') bindQuestions();
    if (page === 'account') bindAccount();
    bindCardFix();
    $$('[data-dl]').forEach(function (b) {
      b.addEventListener('click', function () { U.toast('「' + b.dataset.dl + '」を開きました（本番ではPDFが開きます）'); });
    });
  }

  function bindCommon() {
    $('#logout').addEventListener('click', function (e) { e.preventDefault(); S.session.clear(); boot(); });
    var mb = $('#menuBtn');
    if (mb) mb.addEventListener('click', function () { $('#side').classList.toggle('open'); });
    $$('.side a.nav').forEach(function (a) {
      a.addEventListener('click', function () { $('#side').classList.remove('open'); });
    });
  }

  function boot() {
    load();
    me = currentMember();
    if (!me) { renderLogin(); return; }
    page = (location.hash.replace(/^#/, '') || 'home');
    if (!VIEWS[page]) page = 'home';
    rerender();
  }

  window.addEventListener('hashchange', function () {
    var p = location.hash.replace(/^#/, '') || 'home';
    if (VIEWS[p]) { page = p; rerender(); }
  });

  boot();
  U.devbar(function () { boot(); });
})();
