/* ============================================================
   ルール本体。
   「会員資格 → 閲覧権限」「課題提出 → 次回解錠」「配信 → 1ヶ月で自動非公開」
   といった判定は全部ここに集めてある。画面側はここを呼ぶだけ。
   ============================================================ */
(function (global) {
  'use strict';
  var EZ = global.EZ = global.EZ || {};
  var S = EZ.store;
  var DAY = EZ.DAY;

  /* ================= 日付 ================= */
  function addMonths(t, n) {
    var d = new Date(t), day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d.getTime();
  }
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  function fmtDate(t) {
    if (!t) return '—';
    var d = new Date(t);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日(' + WD[d.getDay()] + ')';
  }
  function fmtDateShort(t) {
    if (!t) return '—';
    var d = new Date(t);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }
  function fmtDateTime(t) {
    if (!t) return '—';
    var d = new Date(t);
    return fmtDate(t) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function fmtYen(n) { return '¥' + Number(n || 0).toLocaleString('ja-JP'); }
  function ago(t, now) {
    var s = Math.floor((now - t) / 1000);
    if (s < 60) return 'たった今';
    if (s < 3600) return Math.floor(s / 60) + '分前';
    if (s < 86400) return Math.floor(s / 3600) + '時間前';
    var d = Math.floor(s / 86400);
    if (d < 30) return d + '日前';
    return fmtDate(t);
  }
  function daysLeft(target, now) { return Math.ceil((target - now) / DAY); }

  /* 週キー（ISO週）。D-1 の 会員×週 一覧に使う */
  function weekKey(t) {
    var d = new Date(t);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    var y = d.getFullYear();
    var w = Math.ceil(((d - new Date(y, 0, 1)) / DAY + 1) / 7);
    return y + '-W' + String(w).padStart(2, '0');
  }
  function weekStart(t) {
    var d = new Date(t);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  }
  function recentWeeks(now, n) {
    var out = [], ws = weekStart(now);
    for (var i = 0; i < n; i++) { out.push({ key: weekKey(ws), start: ws }); ws -= 7 * DAY; }
    return out;
  }

  /* ================= 通知（C-2 メール→LINEの二段） ================= */
  function pushNotify(db, channel, member, subject, body, meta) {
    var n = {
      id: S.uid('n'), channel: channel,
      to: member ? member.email : '(全員)',
      memberId: member ? member.id : null,
      memberName: member ? member.name : '会員全員',
      subject: subject, body: body,
      at: S.clock.now(), meta: meta || null
    };
    db.notifications.unshift(n);
    S.put('notifications', n);
    if (db.notifications.length > 400) db.notifications.length = 400;
  }
  function notifyMember(db, member, subject, body) {
    pushNotify(db, 'email', member, subject, body);
    if (member.lineLinked) pushNotify(db, 'line', member, subject, body);
  }
  function notifyAdmin(db, title, body, meta) {
    var i = { id: S.uid('i'), title: title, body: body, at: S.clock.now(), read: false, meta: meta || null };
    db.adminInbox.unshift(i);
    S.put('adminInbox', i);
  }

  /* ================= 会員資格（A-6） ================= */
  function blankBilling(now, settings, coupon) {
    return {
      state: 'active',
      initialPaid: false,
      periodStart: now,
      periodEnd: addMonths(now, 1),
      freeMonths: coupon ? (coupon.freeMonths || 0) : 0,
      cancelRequestedAt: null,
      failCount: 0, firstFailAt: null, nextRetryAt: null,
      forceFail: false
    };
  }

  /* 会員資格は「保存された状態」ではなく「いま計算した結果」。
     こうしておくと、期限切れを書き込みで反映する必要がなくなり、
     定期実行のサーバ処理なしでも遮断が正しく効く。 */
  function statusOf(member, now) {
    var b = member.billing;
    now = now || S.clock.now();
    if (b.state === 'suspended') return { code: 'suspended', label: '閲覧停止', tone: 'alert', canView: false };
    if (b.state === 'expired') return { code: 'expired', label: '終了', tone: 'dim', canView: false };

    /* 期限を過ぎていれば、状態が active のままでも終了として扱う */
    var unlimited = !b.periodEnd;
    if (!unlimited && now > b.periodEnd && b.state !== 'past_due') {
      return { code: 'expired', label: '終了', tone: 'dim', canView: false };
    }
    if (b.state === 'past_due') return { code: 'past_due', label: '支払い確認中', tone: 'warn', canView: true };
    if (b.cancelRequestedAt) return { code: 'canceling', label: '解約予定', tone: 'warn', canView: true };
    if (b.freeMonths > 0) return { code: 'free', label: '無料期間中', tone: 'sea', canView: true };
    return { code: 'active', label: '有効', tone: 'ok', canView: true };
  }
  function canView(member, now) { return statusOf(member, now).canView; }

  /* ================= 決済（Stripe相当のモック） ================= */
  /* 本番では Stripe の Subscription / Invoice webhook がこの関数の代わりになる。
     入る日を基準に毎月同日（動画 49:52〜 のとおりアニバーサリー課金）。 */
  function charge(db, member, kind, amount, now) {
    var ok = !(member.billing.forceFail);
    var p = {
      id: S.uid('p'), memberId: member.id, memberName: member.name,
      kind: kind, amount: amount, at: now,
      status: ok ? 'paid' : 'failed',
      method: 'card'
    };
    db.payments.unshift(p);
    S.put('payments', p);
    return ok;
  }

  function renewOnce(db, member, now) {
    var st = db.settings, b = member.billing;
    if (b.freeMonths > 0) {
      b.freeMonths--;
      db.payments.unshift({ id: S.uid('p'), memberId: member.id, memberName: member.name, kind: 'monthly', amount: 0, at: now, status: 'free', method: '—' });
      b.periodStart = b.periodEnd;
      b.periodEnd = addMonths(b.periodEnd, 1);
      b.failCount = 0; b.firstFailAt = null; b.nextRetryAt = null;
      if (b.freeMonths === 0) {
        notifyMember(db, member, '無料期間が終わりました', '次回から月額 ' + fmtYen(st.priceMonthly) + ' のお支払いが始まります。解約は会員ページからいつでもできます。');
      }
      return true;
    }
    var ok = charge(db, member, 'monthly', st.priceMonthly, now);
    if (ok) {
      b.periodStart = b.periodEnd;
      b.periodEnd = addMonths(b.periodEnd, 1);
      b.state = 'active'; b.failCount = 0; b.firstFailAt = null; b.nextRetryAt = null;
    }
    return ok;
  }

  /* ================= 自動処理エンジン（画面を開くたびに走る） ================= */
  function refresh() {
    /* 決済の巻き戻し・リトライ・遮断を再現するのは体験版だけ。
       本番では毎月の課金と督促は Stripe が持ち、こちらは結果を受け取るだけになる。 */
    if (S.mode && S.mode() === 'cloud') return 0;
    return S.update(function (db) {
      var now = S.clock.now(), st = db.settings, changed = 0;

      db.members.forEach(function (m) {
        var b = m.billing;
        var guard = 0;

        while (b.state === 'active' && now >= b.periodEnd && guard++ < 36) {
          if (b.cancelRequestedAt) {
            b.state = 'expired';
            notifyMember(db, m, '会員期間が終了しました', '本日までのご利用ありがとうございました。会員ページの閲覧はここで終了となります。');
            notifyAdmin(db, '会員期間の終了', m.name + ' さんの会員期間が終了しました。', { memberId: m.id });
            changed++;
            break;
          }
          if (!renewOnce(db, m, b.periodEnd)) {
            b.state = 'past_due';
            b.failCount = 1;
            b.firstFailAt = b.periodEnd;
            b.nextRetryAt = b.periodEnd + st.retryIntervalDays * DAY;
            notifyMember(db, m, 'お支払いが確認できませんでした', 'カードの有効期限や残高をご確認ください。' + st.retryIntervalDays + '日後に自動でもう一度お試しします。');
            notifyAdmin(db, '決済の失敗', m.name + ' さんの月額決済が失敗しました。', { memberId: m.id });
            changed++;
            break;
          }
          changed++;
        }

        if (b.state === 'past_due') {
          if (now - b.firstFailAt >= st.pastDueGraceDays * DAY || b.failCount > st.retryMaxCount) {
            b.state = 'suspended';
            notifyMember(db, m, '閲覧を停止しました', 'お支払いが確認できないため、会員ページの閲覧を停止しました。カードを更新いただければすぐに再開できます。');
            notifyAdmin(db, '閲覧停止', m.name + ' さんを未払いにより自動で閲覧停止にしました。', { memberId: m.id });
            changed++;
          } else if (now >= b.nextRetryAt) {
            if (renewOnce(db, m, b.nextRetryAt)) {
              notifyMember(db, m, 'お支払いを確認しました', 'ご利用を継続いただけます。');
              changed++;
            } else {
              b.failCount++;
              b.nextRetryAt = b.nextRetryAt + st.retryIntervalDays * DAY;
              notifyMember(db, m, 'お支払いがまだ確認できません', '自動で再試行しています。カード情報のご確認をお願いします。');
              changed++;
            }
          }
        }
      });

      /* C-4 予約投稿：公開時刻を過ぎたら自動で通知（メール→LINE） */
      db.posts.forEach(function (p) {
        if (!p.notifiedAt && p.publishAt <= now) {
          var targets = db.members.filter(function (m) { return canView(m, now); });
          targets.forEach(function (m) { notifyMember(db, m, '【配信】' + p.title, (p.body || '').slice(0, 80) + '…'); });
          p.notifiedAt = now;
          changed++;
        }
      });

      return changed;
    });
  }

  /* ================= 入会（A-1 / A-2 / A-3） ================= */
  function findCoupon(db, code) {
    if (!code) return null;
    var c = db.coupons.filter(function (x) { return x.active && x.code.toUpperCase() === String(code).toUpperCase(); })[0];
    if (!c) return null;
    if (c.limit > 0 && c.used >= c.limit) return null;
    return c;
  }

  function previewCharge(db, code) {
    var st = db.settings, c = findCoupon(db, code);
    var initial = (c && c.waiveInitial) ? 0 : st.priceInitial;
    var first = (c && c.freeMonths > 0) ? 0 : st.priceMonthly;
    return { coupon: c, initial: initial, first: first, total: initial + first };
  }

  function signup(input) {
    return S.update(function (db) {
      var now = S.clock.now(), st = db.settings;
      var dup = db.members.filter(function (m) { return m.email.toLowerCase() === input.email.toLowerCase(); })[0];
      if (dup && !input.uid) throw new Error('このメールアドレスはすでに登録されています');

      var c = findCoupon(db, input.coupon);
      if (input.coupon && !c) throw new Error('クーポンコードが見つからないか、上限に達しています');

      var m = {
        /* 本番では Firebase Authentication の uid をそのまま会員IDにする。
           体験版のときだけ自前で採番する。 */
        id: input.uid || S.uid('mem'),
        name: input.name,
        email: input.email,
        joinedAt: now,
        coupon: c ? c.code : null,
        lineLinked: !!input.lineLinked,
        billing: blankBilling(now, st, c),
        progress: { watched: {} },
        flags: { impressionPrompted: false, impressionDone: false, guideDeliveredAt: null },
        note: ''
      };
      /* パスワードを持つのは体験版だけ。本番は Authentication 側にある */
      if (!input.uid) m.password = input.password;

      function freeLine(kind) {
        var p = { id: S.uid('p'), memberId: m.id, memberName: m.name, kind: kind, amount: 0, at: now, status: 'free', method: '—' };
        db.payments.unshift(p);
        S.put('payments', p);
      }

      var initial = (c && c.waiveInitial) ? 0 : st.priceInitial;
      if (input.skipPayment) {
        /* 決済をつなぐ前の期間。金額のやりとりは記録だけ残して素通しする */
        freeLine('initial');
        if (m.billing.freeMonths > 0) m.billing.freeMonths--;
        freeLine('monthly');
      } else {
        if (initial > 0) {
          if (!charge(db, m, 'initial', initial, now)) throw new Error('決済に失敗しました');
        } else {
          freeLine('initial');
        }
        if (m.billing.freeMonths > 0) {
          m.billing.freeMonths--;
          freeLine('monthly');
        } else {
          if (!charge(db, m, 'monthly', st.priceMonthly, now)) throw new Error('決済に失敗しました');
        }
      }
      m.billing.initialPaid = true;

      if (c) { c.used++; S.put('coupons', c); }
      db.members.push(m);
      S.put('members', m);

      notifyMember(db, m, 'ご入会ありがとうございます', 'すぐに第1回をご覧いただけます。第1回の課題を出すと、第2回が自動で開きます。');
      notifyAdmin(db, '新しい入会', m.name + ' さんが入会しました' + (c ? '（' + c.label + '）' : ''), { memberId: m.id });
      return m;
    });
  }

  /* ================= 講座（B-1〜B-6） ================= */
  function submittedLessons(db, memberId) {
    var s = {};
    db.assignments.forEach(function (a) { if (a.memberId === memberId) s[a.lesson] = a; });
    return s;
  }

  function lessonStates(db, member, now) {
    var sub = submittedLessons(db, member.id);
    var view = canView(member, now);
    return db.lessons.map(function (l) {
      var unlocked = view && (l.no === 1 || !!sub[l.no - 1]);
      return {
        lesson: l,
        unlocked: unlocked,
        submitted: !!sub[l.no],
        submission: sub[l.no] || null,
        watchedAt: member.progress.watched[l.no] || null,
        lockedBy: l.no > 1 && !sub[l.no - 1] ? ('第' + (l.no - 1) + '回の課題提出') : null
      };
    });
  }

  function progressLabel(db, member) {
    var sub = submittedLessons(db, member.id);
    var done = 0;
    for (var i = 1; i <= db.lessons.length; i++) { if (sub[i]) done++; }
    var open = 1;
    for (var j = 1; j <= db.lessons.length; j++) { if (sub[j]) open = Math.min(j + 1, db.lessons.length); }
    return { submitted: done, open: open, total: db.lessons.length };
  }

  function markWatched(memberId, no) {
    return S.update(function (db) {
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) return;
      if (!m.progress.watched[no]) { m.progress.watched[no] = S.clock.now(); S.put('members', m); }
      return m;
    });
  }

  /* B-3 これが本システムの心臓部：提出すると次回が即時・自動で開く */
  function submitAssignment(memberId, no, body) {
    return S.update(function (db) {
      var now = S.clock.now();
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) throw new Error('会員が見つかりません');
      if (!canView(m, now)) throw new Error('現在この操作はできません');
      var already = db.assignments.filter(function (a) { return a.memberId === memberId && a.lesson === no; })[0];
      if (already) throw new Error('すでに提出済みです');
      if (no > 1 && !db.assignments.some(function (a) { return a.memberId === memberId && a.lesson === no - 1; }))
        throw new Error('前の回の課題がまだ提出されていません');

      var a = { id: memberId + '_' + no, memberId: memberId, memberName: m.name, lesson: no, body: body, submittedAt: now };
      db.assignments.unshift(a);
      S.put('assignments', a);

      var result = { unlockedNext: null, guide: false, askImpression: false };
      var last = db.lessons.length;

      if (no < last) result.unlockedNext = no + 1;

      /* B-5 第3回のあと一度だけ感想の案内 */
      if (no >= 3 && !m.flags.impressionPrompted) result.askImpression = true;

      /* B-6 第7回フルレポート提出 → 合流ガイド自動配布＋代表へ通知 */
      if (no === last) {
        m.flags.guideDeliveredAt = now;
        S.put('members', m);
        result.guide = true;
        notifyMember(db, m, '「合流ガイド」をお渡ししました', '会員ページの教材ダウンロードから受け取れます。個別の添削はこのあとご案内します。');
        notifyAdmin(db, '第7回フルレポートの提出', m.name + ' さんがフルレポートを提出しました。個別添削の対象です。', { memberId: m.id, assignmentLesson: no });
      } else {
        notifyAdmin(db, '課題の提出', m.name + ' さんが第' + no + '回の課題を提出しました。', { memberId: m.id, assignmentLesson: no });
      }
      return result;
    });
  }

  function markImpressionPrompted(memberId) {
    return S.update(function (db) {
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (m) { m.flags.impressionPrompted = true; S.put('members', m); }
    });
  }
  function submitImpression(memberId, text) {
    return S.update(function (db) {
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) return;
      m.flags.impressionPrompted = true;
      m.flags.impressionDone = true;
      S.put('members', m);
      var imp = { id: S.uid('imp'), memberId: memberId, memberName: m.name, text: text, at: S.clock.now() };
      db.impressions.unshift(imp);
      S.put('impressions', imp);
      notifyAdmin(db, '感想が届きました', m.name + ' さんから感想が届きました。', { memberId: memberId });
    });
  }

  /* ================= 週1レポート（D-1 / D-2） ================= */
  function submitReport(memberId, input) {
    return S.update(function (db) {
      var now = S.clock.now();
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) throw new Error('会員が見つかりません');
      if (!canView(m, now)) throw new Error('現在この操作はできません');
      var wk = weekKey(now);
      var dup = db.reports.filter(function (r) { return r.memberId === memberId && r.weekKey === wk; })[0];
      if (dup) throw new Error('今週分はすでに提出済みです（差し替えたい場合は事務局までご連絡ください）');
      var r = {
        id: memberId + '_' + wk, memberId: memberId, memberName: m.name, weekKey: wk,
        title: input.title || '', body: input.body, fileName: input.fileName || '',
        consent: !!input.consent, consentAt: input.consent ? now : null,
        submittedAt: now
      };
      db.reports.unshift(r);
      S.put('reports', r);
      notifyAdmin(db, '週1レポートの提出', m.name + ' さん（' + wk + '）' + (input.consent ? '／配信での紹介 許諾あり' : ''), { memberId: memberId });
      return wk;
    });
  }

  function reportMatrix(db, now, weeks) {
    var ws = recentWeeks(now, weeks || 6);
    var map = {};
    db.reports.forEach(function (r) { map[r.memberId + '|' + r.weekKey] = r; });
    return { weeks: ws, get: function (mid, wk) { return map[mid + '|' + wk] || null; } };
  }

  /* ================= 質問（D-3） ================= */
  function submitQuestion(memberId, body) {
    return S.update(function (db) {
      var now = S.clock.now();
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) throw new Error('会員が見つかりません');
      var q = { id: S.uid('q'), memberId: memberId, memberName: m.name, body: body, at: now, answeredPostId: null };
      db.questions.unshift(q);
      S.put('questions', q);
      notifyAdmin(db, '質問が届きました', m.name + ' さんから質問が届きました。', { memberId: memberId });
    });
  }

  /* ================= 配信（C-1〜C-4） ================= */
  var POST_KINDS = ['配信', '週1レポート解説', '公開添削', '質問回答'];

  function createPost(input) {
    return S.update(function (db) {
      var now = S.clock.now();
      var p = {
        id: S.uid('post'),
        kind: input.kind || '配信',
        title: input.title,
        body: input.body,
        mediaType: input.mediaType || 'none',
        mediaUrl: input.mediaUrl || '',
        publishAt: input.publishAt || now,
        permanent: !!input.permanent,
        createdAt: now,
        notifiedAt: null,
        answersQuestionId: input.answersQuestionId || null
      };
      db.posts.unshift(p);
      S.put('posts', p);
      if (p.answersQuestionId) {
        var q = db.questions.filter(function (x) { return x.id === p.answersQuestionId; })[0];
        if (q) { q.answeredPostId = p.id; S.put('questions', q); }
      }
      return p;
    });
  }

  function postVisibility(db, p, now) {
    var win = db.settings.archiveWindowDays * DAY;
    if (p.publishAt > now) return { code: 'scheduled', label: '予約', visible: false, tone: 'sea' };
    if (p.permanent) return { code: 'permanent', label: '殿堂入り', visible: true, tone: 'gold' };
    var left = Math.ceil((p.publishAt + win - now) / DAY);
    if (left <= 0) return { code: 'archived', label: '掲載終了', visible: false, tone: 'dim' };
    return { code: 'open', label: '残り' + left + '日', visible: true, tone: left <= 5 ? 'warn' : '' };
  }

  function visiblePosts(db, now) {
    return db.posts
      .filter(function (p) { return postVisibility(db, p, now).visible; })
      .sort(function (a, b) { return b.publishAt - a.publishAt; });
  }

  /* ================= 解約・返金（A-4 / F-5） ================= */
  function cancelSelf(memberId) {
    return S.update(function (db) {
      var now = S.clock.now();
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) throw new Error('会員が見つかりません');
      m.billing.cancelRequestedAt = now;
      S.put('members', m);
      notifyMember(db, m, '解約を受け付けました', fmtDate(m.billing.periodEnd) + ' までは今までどおりご覧いただけます。以降は自動で終了します。手続きは以上です。');
      notifyAdmin(db, '自己解約', m.name + ' さんが解約しました（' + fmtDate(m.billing.periodEnd) + ' まで閲覧可）', { memberId: m.id });
      return m.billing.periodEnd;
    });
  }
  function undoCancel(memberId) {
    return S.update(function (db) {
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) return;
      m.billing.cancelRequestedAt = null;
      S.put('members', m);
      notifyMember(db, m, '解約を取り消しました', '引き続きご利用いただけます。');
    });
  }
  function forceCancel(memberId, reason) {
    return S.update(function (db) {
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) return;
      m.billing.state = 'expired';
      m.billing.cancelRequestedAt = S.clock.now();
      S.put('members', m);
      notifyMember(db, m, '会員資格の終了について', reason || '運営判断により会員資格を終了しました。');
      notifyAdmin(db, '強制解約', m.name + ' さんを強制解約しました。' + (reason || ''), { memberId: m.id });
    });
  }
  function refund(paymentId, reason) {
    return S.update(function (db) {
      var p = db.payments.filter(function (x) { return x.id === paymentId; })[0];
      if (!p || p.status !== 'paid') throw new Error('返金できる決済ではありません');
      p.status = 'refunded';
      p.refundedAt = S.clock.now();
      p.refundReason = reason || '';
      S.put('payments', p);
      var m = db.members.filter(function (x) { return x.id === p.memberId; })[0];
      if (m) notifyMember(db, m, '返金の手続きをしました', fmtYen(p.amount) + ' を返金しました。カード会社の処理により反映まで数日かかることがあります。');
      notifyAdmin(db, '返金', (p.memberName || '') + ' / ' + fmtYen(p.amount), { paymentId: paymentId });
    });
  }
  function retryNow(memberId) {
    return S.update(function (db) {
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) return;
      m.billing.forceFail = false;
      m.billing.nextRetryAt = S.clock.now();
      S.put('members', m);
    });
  }

  /* ================= CSV（非機能要件：エクスポート） ================= */
  function toCSV(rows) {
    return rows.map(function (r) {
      return r.map(function (c) {
        var s = c == null ? '' : String(c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\r\n');
  }

  /* ============================================================
     メッセージ（会員 ⇄ 代表の1対1）

     ・公開の質問フォーム（D-3）とは別物。あちらは配信で公開回答する用。
     ・既読はメッセージ1通ずつではなく「どこまで読んだか」の時刻で持つ。
       1通ごとに書き込むと、開くたびに書き込みが走って重くなる。
         会員側 … members/{uid}.flags.msgReadAt（本人が書ける）
         代表側 … members/{uid}.adminMsgReadAt（管理者しか書けない）
     ============================================================ */

  /** その会員のやりとりを古い順に */
  function threadOf(db, memberId) {
    return (db.messages || [])
      .filter(function (m) { return m.memberId === memberId; })
      .sort(function (a, b) { return a.at - b.at; });
  }

  /** 会員から見た未読（代表が送ったもののうち、まだ読んでいない数） */
  function unreadForMember(db, member) {
    if (!member) return 0;
    var since = (member.flags && member.flags.msgReadAt) || 0;
    return threadOf(db, member.id).filter(function (m) {
      return m.from === 'admin' && m.at > since;
    }).length;
  }

  /** 代表から見た未読（その会員が送ったもののうち、まだ読んでいない数） */
  function unreadForAdmin(db, member) {
    if (!member) return 0;
    var since = member.adminMsgReadAt || 0;
    return threadOf(db, member.id).filter(function (m) {
      return m.from === 'member' && m.at > since;
    }).length;
  }

  /** 管理画面の一覧用。やりとりのある人を新しい順に。 */
  function messageThreads(db) {
    return db.members.map(function (m) {
      var t = threadOf(db, m.id);
      var last = t[t.length - 1] || null;
      return {
        member: m,
        count: t.length,
        last: last,
        lastAt: last ? last.at : 0,
        unread: unreadForAdmin(db, m)
      };
    }).sort(function (a, b) {
      if (b.unread !== a.unread) return b.unread - a.unread;
      return b.lastAt - a.lastAt;
    });
  }

  function totalUnreadForAdmin(db) {
    return db.members.reduce(function (n, m) { return n + unreadForAdmin(db, m); }, 0);
  }

  /** 送る。from は 'member' か 'admin'。 */
  function sendMessage(memberId, from, body) {
    return S.update(function (db) {
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) throw new Error('会員が見つかりません');
      body = (body || '').trim();
      if (!body) throw new Error('本文を入れてください');
      if (from === 'member') {
        if (!canView(m, S.clock.now())) throw new Error('いまはメッセージを送れません');
        if (db.settings.messagesOpen === false) throw new Error('いまメッセージの受付を止めています');
      }
      var msg = {
        id: S.uid('msg'), memberId: memberId, memberName: m.name,
        from: from, body: body, at: S.clock.now()
      };
      db.messages = db.messages || [];
      db.messages.push(msg);
      S.put('messages', msg);

      if (from === 'member') {
        notifyAdmin(db, 'メッセージ', m.name + ' さんからメッセージが届きました。', { memberId: memberId });
      } else {
        /* 代表が送ったぶんは、本人に届いたことを知らせる */
        notifyMember(db, m, '事務局からメッセージが届いています',
          '会員ページの「メッセージ」からご確認ください。');
        m.adminMsgReadAt = msg.at;   /* 自分で返したので、そこまでは読んだことになる */
        S.put('members', m);
      }
      return msg;
    });
  }

  /** 会員が開いたとき */
  function markMessagesReadByMember(memberId) {
    return S.update(function (db) {
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) return 0;
      var t = threadOf(db, memberId);
      var last = t.length ? t[t.length - 1].at : 0;
      if ((m.flags.msgReadAt || 0) >= last) return 0;
      m.flags.msgReadAt = last;
      S.put('members', m);
      return 1;
    });
  }

  /** 代表が開いたとき */
  function markMessagesReadByAdmin(memberId) {
    return S.update(function (db) {
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      if (!m) return 0;
      var t = threadOf(db, memberId);
      var last = t.length ? t[t.length - 1].at : 0;
      if ((m.adminMsgReadAt || 0) >= last) return 0;
      m.adminMsgReadAt = last;
      S.put('members', m);
      return 1;
    });
  }

  function setMessagesOpen(open) {
    return S.update(function (db) {
      db.settings.messagesOpen = !!open;
      S.put('settings', db.settings);
      return db.settings.messagesOpen;
    });
  }

  EZ.rules = {
    addMonths: addMonths, fmtDate: fmtDate, fmtDateShort: fmtDateShort, fmtDateTime: fmtDateTime,
    fmtYen: fmtYen, ago: ago, daysLeft: daysLeft, weekKey: weekKey, recentWeeks: recentWeeks,
    statusOf: statusOf, canView: canView, refresh: refresh,
    findCoupon: findCoupon, previewCharge: previewCharge, signup: signup,
    lessonStates: lessonStates, progressLabel: progressLabel, submittedLessons: submittedLessons,
    markWatched: markWatched, submitAssignment: submitAssignment,
    markImpressionPrompted: markImpressionPrompted, submitImpression: submitImpression,
    submitReport: submitReport, reportMatrix: reportMatrix, submitQuestion: submitQuestion,
    POST_KINDS: POST_KINDS, createPost: createPost, postVisibility: postVisibility, visiblePosts: visiblePosts,
    cancelSelf: cancelSelf, undoCancel: undoCancel, forceCancel: forceCancel, refund: refund, retryNow: retryNow,
    notifyMember: notifyMember, notifyAdmin: notifyAdmin, toCSV: toCSV,
    threadOf: threadOf, unreadForMember: unreadForMember, unreadForAdmin: unreadForAdmin,
    messageThreads: messageThreads, totalUnreadForAdmin: totalUnreadForAdmin,
    sendMessage: sendMessage, markMessagesReadByMember: markMessagesReadByMember,
    markMessagesReadByAdmin: markMessagesReadByAdmin, setMessagesOpen: setMessagesOpen
  };
})(window);
