/* Roam — the virtual office. People move between rooms, drop in on each other,
   and the AInbox keeps filling up while you are conspicuously "at your desk". */
(() => {
  const { el, esc, pick, irnd, rnd, chance, bag, typeInto, clockStr } = LB;

  let root, mapEl, chatEl, threadsEl, presenceEl, composerEl, clock;
  let occupancy = [], thread = 'ingest-rewrite', unread = {}, msgs = [];

  const nextLine = bag(DATA.roamChat);
  const nextEvent = bag(DATA.roamEvents);

  const seats = kind => (kind === 'theater' ? 8 : kind === 'meeting' ? 5 : kind === 'social' ? 4 : 3);

  const setTitle = () => {
    const n = Object.values(unread).reduce((a, b) => a + b, 0);
    LB.setTitle(`${n ? `(${n}) ` : ''}${thread} — ${CFG.company} — Roam`, 'roam');
  };

  /* ---------- the map ---------- */
  const renderRoom = i => {
    const room = DATA.rooms[i];
    const here = occupancy[i];
    const card = mapEl.children[i];
    card.className = 'rm-room ' + room.kind + (here.length ? ' busy' : '');
    card.querySelector('.rm-count').textContent = here.length || '';
    const seatRow = card.querySelector('.rm-seats');
    seatRow.innerHTML = Array.from({ length: seats(room.kind) }, (_, s) => {
      const p = here[s];
      return p
        ? `<span class="rm-head" title="${esc(p.name)}" style="background:${p.color}">${p.initials}
             <i class="mic ${chance(.3) ? 'off' : ''}"></i></span>`
        : '<span class="rm-seat"></span>';
    }).join('');
    const share = card.querySelector('.rm-share');
    share.hidden = !(room.kind === 'meeting' && here.length > 1);
  };

  const move = () => {
    const from = irnd(0, DATA.rooms.length - 1);
    if (!occupancy[from].length) return;
    const p = pick(occupancy[from]);
    let to = irnd(0, DATA.rooms.length - 1);
    if (to === from) to = (to + 1) % DATA.rooms.length;
    if (occupancy[to].length >= seats(DATA.rooms[to].kind)) return;

    occupancy[from] = occupancy[from].filter(x => x !== p);
    occupancy[to].push(p);
    renderRoom(from);
    renderRoom(to);

    const card = mapEl.children[to];
    card.classList.add('ping');
    clock.after(900, () => card.classList.remove('ping'));
    renderPresence();
    logEvent(p, DATA.rooms[to].name);
  };

  const logEvent = (p, roomName) => {
    const line = nextEvent()
      .replace('{p}', `<b>${esc(p.name.split(' ')[0])}</b>`)
      .replace('{q}', esc(pick(DATA.people).name.split(' ')[0]))
      .replace('{r}', `<em>${esc(roomName)}</em>`);
    const feed = root.querySelector('.rm-feed');
    feed.insertBefore(el('div', 'rm-fe', `${line}<span class="t">now</span>`), feed.firstChild);
    while (feed.children.length > 4) feed.lastChild.remove();
  };

  const renderPresence = () => {
    presenceEl.innerHTML = DATA.people.map(p => {
      const i = occupancy.findIndex(r => r.includes(p));
      const room = i < 0 ? 'Away' : DATA.rooms[i].name;
      return `<div class="rm-pr">
        <span class="av" style="background:${p.color}">${p.initials}</span>
        <span class="nm">${esc(p.name.split(' ')[0])} ${esc(p.name.split(' ')[1][0])}.</span>
        <span class="rr">${esc(room)}</span></div>`;
    }).join('');
    root.querySelector('.rm-inoffice').textContent =
      `In the office · ${occupancy.reduce((a, r) => a + r.length, 0)}`;
  };

  /* ---------- AInbox ---------- */
  const renderThreads = () => {
    threadsEl.innerHTML = DATA.roamThreads.map(t => {
      const p = DATA.people.find(x => x.name === t.name);
      const n = unread[t.name] || 0;
      return `<a class="${t.name === thread ? 'on' : ''}" data-t="${esc(t.name)}">
        ${p ? `<span class="av" style="background:${p.color}">${p.initials}</span>`
            : '<span class="hash">#</span>'}
        <span class="nm">${esc(t.kind === 'dm' ? t.name.split(' ')[0] + ' ' + t.name.split(' ')[1][0] + '.' : t.name)}</span>
        ${n ? `<span class="ct">${n}</span>` : ''}</a>`;
    }).join('');
    setTitle();
  };

  const pushMsg = (who, text) => {
    msgs.push({ who, text, at: new Date() });
    if (msgs.length > 14) msgs.shift();
    renderChat();
  };

  const renderChat = () => {
    const body = chatEl;
    body.innerHTML = msgs.map((m, i) => {
      const same = i && msgs[i - 1].who === m.who;
      return `<div class="rm-msg${same ? ' same' : ''}">
        ${same ? '<span class="sp2"></span>'
               : `<span class="av lg" style="background:${m.who.color}">${m.who.initials}</span>`}
        <div class="b">
          ${same ? '' : `<div class="mh"><b>${esc(m.who.name)}</b><span>${clockStr(m.at)}</span></div>`}
          <div class="tx">${esc(m.text)}</div>
        </div></div>`;
    }).join('');
    body.scrollTop = body.scrollHeight;
  };

  const incoming = () => {
    const who = pick(DATA.people);
    const typing = el('div', 'rm-typing',
      `<span class="av lg" style="background:${who.color}">${who.initials}</span>
       <span class="dots"><i></i><i></i><i></i></span> ${esc(who.name.split(' ')[0])} is typing`);
    chatEl.appendChild(typing);
    chatEl.scrollTop = chatEl.scrollHeight;
    clock.after(rnd(1200, 3200), () => {
      typing.remove();
      pushMsg(who, nextLine());
    });
  };

  /* Something lands in a thread you are not reading — that is what badges are for. */
  const elsewhere = () => {
    const other = pick(DATA.roamThreads.filter(t => t.name !== thread));
    unread[other.name] = (unread[other.name] || 0) + 1;
    renderThreads();
  };

  const switchThread = () => {
    const t = pick(DATA.roamThreads.filter(x => x.name !== thread));
    thread = t.name;
    delete unread[thread];
    msgs = [];
    for (let i = 0; i < irnd(3, 6); i++) pushMsg(pick(DATA.people), nextLine());
    root.querySelector('.rm-ch-name').innerHTML =
      t.kind === 'dm' ? esc(t.name) : `<span class="hash">#</span>${esc(t.name)}`;
    composerEl.querySelector('.ph').dataset.ph =
      `Message ${t.kind === 'dm' ? t.name.split(' ')[0] : '#' + t.name}`;
    root.querySelector('.rm-ch-sub').textContent =
      t.kind === 'dm' ? (DATA.people.find(p => p.name === t.name) || {}).role || 'Direct message'
                      : `${irnd(4, 9)} members · ${irnd(2, 5)} in the office`;
    renderThreads();
  };

  const compose = () => {
    const text = nextLine();
    composerEl.classList.add('active');
    typeInto(clock, composerEl.querySelector('.ph'), text, {
      cps: rnd(26, 40), chunk: 2,
      done: () => clock.after(rnd(500, 1400), () => {
        composerEl.querySelector('.ph').textContent = '';
        composerEl.classList.remove('active');
        pushMsg(DATA.me, text);
      }),
    });
  };

  LB.register({
    id: 'roam', icon: 'roam', name: 'Roam', macName: 'Roam',
    menus: ['File', 'Edit', 'View', 'Office', 'Window', 'Help'],
    title: () => `${thread} — ${CFG.company} — Roam`,

    mount(host) {
      root = host;
      root.className = 'app rm';
      root.innerHTML = `
        <div class="app-top rm-top">
          <span class="win-dots"><i></i><i></i><i></i></span>
          <span class="rm-tt">${esc(CFG.company)}</span>
          <span class="sp"></span>
          <span class="rm-ctl mic">🎤</span><span class="rm-ctl">📷</span>
          <span class="rm-ctl on">Available</span>
          <span class="av" style="background:#5e6ad2">${DATA.me.initials}</span>
        </div>
        <div class="app-body">
          <div class="side">
            <div class="rm-nav">
              <a class="on"><span class="i">▦</span> Office</a>
              <a><span class="i">✉</span> AInbox</a>
              <a><span class="i">◷</span> Lobby</a>
              <a><span class="i">▤</span> Theater</a>
              <a><span class="i">⏺</span> Magicast</a>
              <a><span class="i">✦</span> On-It</a>
            </div>
            <div class="sec-lbl rm-inoffice">In the office</div>
            <div class="rm-presence scroll"></div>
            <div class="sec-lbl">AInbox</div>
            <div class="rm-threads"></div>
          </div>
          <div class="main">
            <div class="rm-mapbar">
              <b>${esc(CFG.company)} · Floor 1</b>
              <span class="rm-tag">Live</span>
              <span class="sp"></span>
              <span class="rm-btn">Knock</span><span class="rm-btn">Drop in</span>
              <span class="rm-btn pri">Join room</span>
            </div>
            <div class="rm-map"></div>
            <div class="rm-feed"></div>
          </div>
          <div class="rm-chat">
            <div class="rm-ch-head">
              <div><div class="rm-ch-name"><span class="hash">#</span>ingest-rewrite</div>
                <div class="rm-ch-sub">6 members · 3 in the office</div></div>
              <span class="sp"></span><span class="rm-ci">☎</span><span class="rm-ci">⋯</span>
            </div>
            <div class="rm-msgs scroll"></div>
            <div class="rm-composer"><span class="ph"></span>
              <span class="sp"></span><span class="ci">＋</span><span class="ci">😊</span></div>
          </div>
        </div>`;

      mapEl = root.querySelector('.rm-map');
      chatEl = root.querySelector('.rm-msgs');
      threadsEl = root.querySelector('.rm-threads');
      presenceEl = root.querySelector('.rm-presence');
      composerEl = root.querySelector('.rm-composer');

      mapEl.innerHTML = DATA.rooms.map(r => `
        <div class="rm-room ${r.kind}">
          <div class="rm-rh"><b>${esc(r.name)}</b><span class="rm-count"></span></div>
          <div class="rm-share" hidden>⧉ screensharing</div>
          <div class="rm-seats"></div>
        </div>`).join('');

      occupancy = DATA.rooms.map(() => []);
      LB.shuffle(DATA.people).forEach((p, i) => {
        const r = i % DATA.rooms.length;
        if (occupancy[r].length < seats(DATA.rooms[r].kind)) occupancy[r].push(p);
      });
      DATA.rooms.forEach((_, i) => renderRoom(i));
      renderPresence();
      renderThreads();
      composerEl.querySelector('.ph').dataset.ph = `Message #${thread}`;
      for (let i = 0; i < 5; i++) pushMsg(pick(DATA.people), nextLine());
    },

    start() {
      clock = new LB.Clock();
      setTitle();
      clock.drift(3200, 7000, move);
      clock.drift(4000, 9000, incoming);
      clock.drift(9000, 18000, elsewhere);
      clock.drift(11000, 24000, compose);
      clock.drift(26000, 60000, switchThread);
    },

    stop() { clock && clock.kill(); },
    cursorTargets: () => ['.rm-map', '.rm-msgs', '.rm-presence'],
  });
})();
