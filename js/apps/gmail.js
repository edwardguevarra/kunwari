/* Inbox that gets read, replied to, and refilled. */
(() => {
  const { el, esc, pick, irnd, rnd, chance, bag, typeInto, clockStr } = LB;
  let root, listEl, mainEl, clock, mails = [], unread = 0;
  const nextMail = bag(DATA.emails);

  const mk = (spec, mins) => ({
    from: spec[0], subj: spec[1], body: spec[2], reply: spec[3],
    unread: true, mins,
    who: DATA.people.find(p => p.name === spec[0]) || { initials: spec[0].slice(0, 2).toUpperCase(), color: '#5f6368', name: spec[0] },
  });

  const renderList = () => {
    listEl.innerHTML = '';
    mails.forEach((m, i) => {
      const t = new Date(Date.now() - m.mins * 60000);
      const r = el('div', 'gm-row' + (m.unread ? ' unread' : ''),
        `<span class="cb">☐</span><span class="st">☆</span><span class="im">❯</span>
         <span class="from">${esc(m.from)}</span>
         <span class="sub">${esc(m.subj)} <span>— ${esc(m.body.slice(0, 110))}…</span></span>
         <span class="tm">${clockStr(t)}</span>`);
      r.dataset.i = i;
      listEl.appendChild(r);
    });
    unread = mails.filter(m => m.unread).length;
    root.querySelector('.gm-unread').textContent = unread || '';
    const c = root.querySelector('.gm-count');
    if (c) c.textContent = `1–${mails.length} of ${mails.length + irnd(200, 900)}`;
    LB.setTitle(`Inbox (${unread}) - ${myMail()} - Gmail`, 'gmail');
  };

  const openMail = (m, after) => {
    m.unread = false;
    mainEl.innerHTML = `
      <div class="gm-head"><span>←</span><span class="sep"></span><span>🗄</span><span>⚠</span><span>🗑</span>
        <span class="sep"></span><span>✉</span><span>◷</span><span>✓</span>
        <span class="sp"></span><span class="gm-count">3 of 428</span><span>‹</span><span>›</span></div>
      <div class="gm-open scroll">
        <div class="gm-subj"><h2>${esc(m.subj)}</h2><span class="gm-lbl">eng</span>
          <span class="sp"></span><span>🖨</span><span>⤢</span></div>
        <div class="gm-msg">
          <span class="av lg" style="background:${m.who.color}">${m.who.initials}</span>
          <div class="body">
            <div class="meta"><b>${esc(m.from)}</b>
              <span>&lt;${esc(addressOf(m.from))}&gt;</span>
              <span class="sp"></span>
              <span class="when">${clockStr(new Date(Date.now() - m.mins * 60000))} (${LB.ago(m.mins)} ago)</span>
              <span>☆</span><span>↩</span><span>⋮</span></div>
            <div class="tome">to me <span class="cv">⌄</span></div>
            <p>${esc(m.body)}</p>
            <p class="sig">—<br>${esc(m.from.split(' ')[0])}</p>
          </div>
        </div>
        <div class="gm-reply">
          <div class="rh"><span class="ri">↩</span><span class="to">${esc(m.from)}</span><span class="cv">⌄</span></div>
          <div class="txt"></div>
          <div class="rf"><button class="gm-send">Send <span class="cv">⌄</span></button>
            <span class="ri">A</span><span class="ri">📎</span><span class="ri">🔗</span><span class="ri">😊</span>
            <span class="sp"></span><span class="ri">🗑</span></div>
        </div>
      </div>`;
    const txt = mainEl.querySelector('.txt');
    clock.after(rnd(1800, 4000), () => {
      typeInto(clock, txt, m.reply, {
        cps: rnd(24, 36), chunk: 2,
        done: () => clock.after(rnd(1600, 3200), () => {
          const btn = mainEl.querySelector('.gm-send');
          btn.textContent = 'Sent ✓';
          btn.style.background = '#2bb673';
          clock.after(1400, after);
        }),
      });
    });
  };

  const showInbox = () => {
    mainEl.innerHTML = `
      <div class="gm-head"><span class="cb">☐<i class="cv">⌄</i></span><span>↻</span><span>⋮</span>
        <span class="sp"></span><span class="gm-count"></span><span>‹</span><span>›</span></div>
      <div class="gm-cats">
        <span class="on"><i>📥</i> Primary</span><span><i>🏷</i> Promotions</span><span><i>👥</i> Social</span>
      </div>
      <div class="gm-list scroll"></div>`;
    listEl = mainEl.querySelector('.gm-list');
    renderList();
  };

  const myMail = () =>
    `${CFG.myName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'you'}@${CFG.domain}`;
  const addressOf = from => /Status$/.test(from)
    ? `no-reply@${CFG.domain}`
    : `${from.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/ +/g, '.')}@${CFG.domain}`;
  const tabs = () => [
    { icon: 'gmail', title: `Inbox (8) - ${esc(myMail())}` },
    { icon: 'posthog', title: esc(CFG.dashboard) },
    { icon: 'linear', title: 'All issues' },
  ];

  LB.register({
    id: 'gmail', icon: 'gmail', name: 'Gmail', macName: 'Google Chrome', dockName: 'Gmail',
    menus: ['File', 'Edit', 'View', 'History', 'Bookmarks', 'Profiles', 'Tab', 'Window', 'Help'],
    title: () => `Inbox (${unread}) - ${myMail()} - Gmail`,

    mount(host) {
      root = host;
      root.className = 'app gm';
      root.innerHTML = LB.browserTop(tabs(), 0, 'mail.google.com/mail/u/0/#inbox') + `
        <div class="gm-top">
          <span class="gm-burger">☰</span>
          <span class="gm-logo">${icon('gmail', 26)}<b>Gmail</b></span>
          <span class="gm-search"><i>⌕</i>Search mail<em>⚙</em></span>
          <span class="sp"></span>
          <span class="gm-ti">?</span><span class="gm-ti">⚙</span><span class="gm-ti">⋮⋮</span>
          <span class="av lg" style="background:#5e6ad2">${DATA.me.initials}</span>
        </div>
        <div class="app-body">
          <div class="side">
            <button class="gm-comp"><i>✎</i> Compose</button>
            <div class="gm-nav">
              <a class="on"><span class="i">📥</span> Inbox <span class="ct gm-unread"></span></a>
              <a><span class="i">★</span> Starred</a>
              <a><span class="i">◷</span> Snoozed</a>
              <a><span class="i">➤</span> Sent</a>
              <a><span class="i">🗎</span> Drafts <span class="ct">2</span></a>
              <a><span class="i">▾</span> More</a>
            </div>
            <div class="sec-lbl">Labels</div>
            <div class="gm-nav sm">
              <a><span class="dot" style="background:#5e6ad2"></span> eng</a>
              <a><span class="dot" style="background:#e5484d"></span> incidents</a>
              <a><span class="dot" style="background:#2bb673"></span> design</a>
            </div>
          </div>
          <div class="main"></div>
        </div>`;
      mainEl = root.querySelector('.main');
      mails = LB.shuffle(DATA.emails).slice(0, 9).map((e, i) => mk(e, irnd(3, 40) + i * irnd(20, 90)));
      mails.sort((a, b) => a.mins - b.mins);
      showInbox();
    },

    start() {
      clock = new LB.Clock();
      const cycle = () => {
        const target = mails.find(m => m.unread) || pick(mails);
        const row = listEl && listEl.querySelector(`[data-i="${mails.indexOf(target)}"]`);
        if (row) row.classList.add('row-hl');
        clock.after(rnd(900, 2200), () => openMail(target, () => {
          showInbox();
          clock.after(rnd(2000, 5000), cycle);
        }));
      };
      clock.after(rnd(1500, 3500), cycle);

      /* new mail keeps arriving, as it does */
      clock.drift(14000, 30000, () => {
        const m = mk(nextMail(), 0);
        m.subj = chance(.5) ? 'Re: ' + m.subj.replace(/^Re: /, '') : m.subj;
        mails.unshift(m);
        if (mails.length > 12) mails.pop();
        if (listEl && listEl.isConnected) renderList();
      });
    },

    stop() { clock && clock.kill(); },
    cursorTargets: () => ['.gm-list', '.gm-open'],
  });
})();
