/* ============================================================
   デモデータ。中身を見て動きを確かめるためだけのもの。
   管理画面の「データ」から一括で消せる。本番投入前に必ず消すこと。
   ============================================================ */
(function (global) {
  'use strict';
  var EZ = global.EZ = global.EZ || {};
  var DAY = EZ.DAY;

  var PEOPLE = [
    { name: '佐藤 みのり', email: 'sato@example.com', joinAgo: 40, coupon: 'MONITOR', lessons: 3, reports: 4, line: true },
    { name: '田中 亮', email: 'tanaka@example.com', joinAgo: 24, coupon: null, lessons: 6, reports: 3, line: true },
    { name: '井上 慎', email: 'inoue@example.com', joinAgo: 52, coupon: 'MONITOR', lessons: 7, reports: 6, line: true },
    { name: '山口 かおり', email: 'yamaguchi@example.com', joinAgo: 35, coupon: null, lessons: 2, reports: 1, line: false, fail: true },
    { name: '大野 敦', email: 'ono@example.com', joinAgo: 20, coupon: null, lessons: 4, reports: 2, line: true, cancelAgo: 2 },
    { name: '中村 空', email: 'nakamura@example.com', joinAgo: 3, coupon: 'MONITOR', lessons: 0, reports: 0, line: true }
  ];

  var ASSIGN_TEXT = [
    'SNSで見た「年利8%」の投稿から辿りました。投稿→まとめサイト→運用会社のプレスリリース、まででした。プレスリリースの元になった運用報告書は会員限定で、そこから先には行けませんでした。',
    '分子が「分配金の合計」、分母が「期首の基準価額」でした。期中に追加購入した分が分母に入っていないので、実際に自分が受け取る率とは別物だと分かりました。',
    '発信者は仲介会社でした。読み手が口座を開くと手数料が入ります。だからといって嘘とは限らないので、まず定義から確認する順番にしました。',
    '「昨年比+18%」の比較期間を1年ずらしたら+3%になりました。基準にした年がたまたま底だったようです。',
    '反証を探して金融庁の注意喚起を見つけました。同じスキームで行政処分が出ていました。探した場所は金融庁の公表資料と国民生活センターです。',
    '主張／根拠／限界の3つに分けました。限界のところが一番書きにくく、自分がどこまで確かめられていないかが見えました。',
    '（フルレポート）題材は地方の再エネファンドです。一次情報は事業計画書と自治体の公表資料まで遡れました。利回りの定義が資料間で違っていた点、反証として近隣自治体の同種案件で計画未達の記録があった点を書いています。限界として、稼働実績の生データは非公開で確認できませんでした。'
  ];

  var REPORT_TEXT = [
    '今週は広告の言い回しを3件集めて、断定を避けている箇所に線を引きました。',
    '数字の定義を確かめる作業に時間がかかりました。分母が書いていない資料が多いです。',
    '発信者の利害を先に見てしまう癖がついてきたので、順番を戻して定義から入るようにしました。',
    '反証探しを初めて自分からやりました。見つからないこともあると分かって少し安心しました。',
    '主張・根拠・限界の型で1本書きました。限界を書くと弱く見えると思っていましたが逆でした。',
    '今週は題材が決まらず、結局手を動かせませんでした。来週は先に題材を決めてから始めます。'
  ];

  var POSTS = [
    { ago: 46, kind: '配信', title: '「利回り」という言葉が指しているもの', body: '同じ利回りでも、分配金利回り・トータルリターン・IRRで意味が違います。今日はこの3つの分かれ目を、実際の資料を見ながら分けていきます。', media: 'video' },
    { ago: 41, kind: '公開添削', title: '公開添削：一次情報まで遡れなかったレポート', body: '遡れなかったこと自体は失点ではありません。どこで止まったかを書けているかどうかが読みどころです。', media: 'video' },
    { ago: 37, kind: '配信', title: '一次情報の入口を10か所', body: '官庁・取引所・開示資料。とりあえずここを見ておけばよい、という入口を並べます。', media: 'none', permanent: true },
    { ago: 30, kind: '質問回答', title: '質問：「金融庁が認めた」は何を意味しますか', body: '登録・届出・認可は別の制度です。この3つを混ぜた表現が一番多いので、区別を説明します。', media: 'audio' },
    { ago: 24, kind: '週1レポート解説', title: '今週のレポートから：比較の期間', body: '3名のレポートで同じ論点が出ていました。比較期間の取り方です。', media: 'video' },
    { ago: 17, kind: '配信', title: '数字の分母を探す', body: '分母が書いていない数字は、まだ数字ではありません。探し方の手順を出します。', media: 'video' },
    { ago: 11, kind: '公開添削', title: '公開添削：限界の書き方', body: '限界を書くと弱く見えると思われがちですが、実際は逆に読まれます。', media: 'video' },
    { ago: 6, kind: '配信', title: '同じ市場の平均利回りが2倍違った件', body: '公開レポート2本目の裏側です。どこで気づいて、どう揃え直したか。', media: 'video' },
    { ago: 2, kind: '週1レポート解説', title: '今週のレポートから：反証の探し方', body: '「探したが見つからなかった」と書けた方が2名いました。これが一番大事です。', media: 'video' },
    { ago: -2, kind: '配信', title: '（予約投稿）決算資料の読む順番', body: '前から読まないこと。読む順番を決めておくと時間が半分になります。', media: 'video' }
  ];

  var QUESTIONS = [
    { ago: 12, who: 1, body: '「登録済み」と書いてある会社でも注意が必要なことはありますか。' },
    { ago: 4, who: 0, body: '一次情報が有料の場合、どこまで確かめれば「確かめた」と言えますか。' }
  ];

  function isSeeded() {
    return EZ.store.read().members.some(function (m) { return m.isDemo; });
  }

  function seed() {
    var S = EZ.store, R = EZ.rules;
    S.update(function (db) {
      var now = S.clock.now();

      PEOPLE.forEach(function (p) {
        if (db.members.some(function (m) { return m.email === p.email; })) return;
        var join = now - p.joinAgo * DAY;
        var c = p.coupon ? db.coupons.filter(function (x) { return x.code === p.coupon; })[0] : null;
        var m = {
          id: S.uid('mem'), name: p.name, email: p.email, password: 'demo1234',
          joinedAt: join, coupon: c ? c.code : null, lineLinked: !!p.line, isDemo: true,
          billing: {
            state: 'active', initialPaid: true,
            periodStart: join, periodEnd: R.addMonths(join, 1),
            freeMonths: c ? (c.freeMonths || 0) : 0,
            cancelRequestedAt: p.cancelAgo ? now - p.cancelAgo * DAY : null,
            failCount: 0, firstFailAt: null, nextRetryAt: null,
            forceFail: !!p.fail
          },
          progress: { watched: {} },
          flags: { impressionPrompted: p.lessons >= 3, impressionDone: p.lessons >= 3 && p.lessons < 7, guideDeliveredAt: null },
          note: ''
        };
        /* 入会時の決済（入会金＋初月） */
        var initial = (c && c.waiveInitial) ? 0 : db.settings.priceInitial;
        db.payments.unshift({ id: S.uid('p'), memberId: m.id, memberName: m.name, kind: 'initial', amount: initial, at: join, status: initial ? 'paid' : 'free', method: initial ? 'card' : '—' });
        if (m.billing.freeMonths > 0) {
          m.billing.freeMonths--;
          db.payments.unshift({ id: S.uid('p'), memberId: m.id, memberName: m.name, kind: 'monthly', amount: 0, at: join, status: 'free', method: '—' });
        } else {
          db.payments.unshift({ id: S.uid('p'), memberId: m.id, memberName: m.name, kind: 'monthly', amount: db.settings.priceMonthly, at: join, status: 'paid', method: 'card' });
        }

        /* 課題（提出＝解錠の履歴） */
        for (var i = 1; i <= p.lessons; i++) {
          var at = join + Math.round((i - 0.4) * (p.joinAgo * DAY) / (p.lessons + 1));
          m.progress.watched[i] = at - 2 * 3600000;
          db.assignments.unshift({
            id: S.uid('a'), memberId: m.id, memberName: m.name, lesson: i,
            body: ASSIGN_TEXT[i - 1], submittedAt: at
          });
          if (i === db.lessons.length) m.flags.guideDeliveredAt = at;
        }
        if (p.lessons > 0 && p.lessons < db.lessons.length) m.progress.watched[p.lessons + 1] = now - 1.5 * DAY;

        /* 週1レポート */
        for (var w = 0; w < p.reports; w++) {
          var rAt = now - (w * 7 + 1) * DAY;
          if (rAt < join) break;
          db.reports.unshift({
            id: S.uid('rep'), memberId: m.id, memberName: m.name, weekKey: R.weekKey(rAt),
            title: '', body: REPORT_TEXT[(w + p.lessons) % REPORT_TEXT.length],
            fileName: w % 3 === 0 ? 'report.pdf' : '',
            consent: w % 2 === 0, consentAt: w % 2 === 0 ? rAt : null, submittedAt: rAt
          });
        }

        if (p.lessons >= 3) {
          db.impressions.unshift({
            id: S.uid('imp'), memberId: m.id, memberName: m.name,
            text: '第3回まで来て、確かめる順番があるということ自体が発見でした。今までは結論だけ見ていました。',
            at: join + 12 * DAY
          });
        }
        db.members.push(m);
      });

      /* 配信 */
      POSTS.forEach(function (p) {
        if (db.posts.some(function (x) { return x.title === p.title; })) return;
        db.posts.unshift({
          id: S.uid('post'), kind: p.kind, title: p.title, body: p.body,
          mediaType: p.media, mediaUrl: p.media === 'none' ? '' : '（埋め込みURL未設定）',
          publishAt: now - p.ago * DAY, permanent: !!p.permanent,
          createdAt: now - (p.ago + 1) * DAY,
          notifiedAt: p.ago > 0 ? now - p.ago * DAY : null,
          answersQuestionId: null, isDemo: true
        });
      });

      /* 質問 */
      QUESTIONS.forEach(function (q) {
        var m = db.members[q.who];
        if (!m) return;
        if (db.questions.some(function (x) { return x.body === q.body; })) return;
        db.questions.unshift({ id: S.uid('q'), memberId: m.id, memberName: m.name, body: q.body, at: now - q.ago * DAY, answeredPostId: null });
      });

      db.adminInbox.unshift({ id: S.uid('i'), title: 'デモデータを入れました', body: '中身を見るための仮データです。管理画面の「データ」から一括で消せます。', at: now, read: false });
      return true;
    });
    EZ.rules.refresh();
  }

  function clear() {
    EZ.store.update(function (db) {
      var demoIds = db.members.filter(function (m) { return m.isDemo; }).map(function (m) { return m.id; });
      function notDemo(x) { return demoIds.indexOf(x.memberId) < 0; }
      db.members = db.members.filter(function (m) { return !m.isDemo; });
      db.assignments = db.assignments.filter(notDemo);
      db.reports = db.reports.filter(notDemo);
      db.questions = db.questions.filter(notDemo);
      db.impressions = db.impressions.filter(notDemo);
      db.payments = db.payments.filter(notDemo);
      db.notifications = db.notifications.filter(function (n) { return !n.memberId || demoIds.indexOf(n.memberId) < 0; });
      db.posts = db.posts.filter(function (p) { return !p.isDemo; });
      db.adminInbox = [];
      db.coupons.forEach(function (c) { c.used = 0; });
      return true;
    });
  }

  /* 初回だけ自動で入れる。管理画面の「データ」から消せる。 */
  function ensure() {
    var db = EZ.store.read();
    if (!db.__needsDemo) return;
    EZ.store.update(function (d) { delete d.__needsDemo; });
    seed();
  }

  EZ.demo = { seed: seed, clear: clear, isSeeded: isSeeded, ensure: ensure };
})(window);
