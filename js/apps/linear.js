/* Linear — issue list that keeps triaging itself, with a detail panel that follows along. */
(() => {
  const { el, esc, pick, irnd, rnd, chance, ago } = LB;
  let root, listEl, detailEl, clock, issues = [], selected = null;

  /* Linear's status glyph: a ring that fills as the issue moves along. */
  const statusIcon = (st, size = 14) => {
    const [, c] = DATA.statuses[st];
    const frac = [0, 0, .4, .75, 1][st];
    if (st === 4) return `<svg width="${size}" height="${size}" viewBox="0 0 14 14" class="lni">
      <circle cx="7" cy="7" r="7" fill="${c}"/>
      <path d="M4 7.2 6.1 9.3 10 4.9" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<svg width="${size}" height="${size}" viewBox="0 0 14 14" class="lni">
      <circle cx="7" cy="7" r="6.1" fill="none" stroke="${c}" stroke-width="1.6"${st === 0 ? ' stroke-dasharray="1.7 2.1"' : ''}/>
      ${frac ? `<circle cx="7" cy="7" r="2.6" fill="none" stroke="${c}" stroke-width="5.2"
        stroke-dasharray="${(frac * 16.3).toFixed(1)} 16.3" transform="rotate(-90 7 7)"/>` : ''}</svg>`;
  };

  const prioIcon = p => `<svg width="14" height="14" viewBox="0 0 14 14" class="lni">
    ${[0, 1, 2].map(i => `<rect x="${1 + i * 4.5}" y="${10 - i * 3}" width="3" height="${3 + i * 3}" rx="1"
      fill="${i < p ? '#e4e4e7' : '#3f3f46'}"/>`).join('')}</svg>`;

  const nextTitle = LB.bag(DATA.issueTitles);
  const nextAct = LB.bag(DATA.linearActivity);

  const mkIssue = () => ({
    id: `${pick(DATA.teams)}-${irnd(180, 640)}`,
    title: nextTitle(),
    st: irnd(0, 4),
    prio: irnd(0, 3),
    label: pick(DATA.labels),
    who: pick(DATA.people.concat([DATA.me])),
    mins: irnd(2, 3000),
  });

  const render = () => {
    listEl.innerHTML = '';
    let last = -1;
    issues.forEach(it => {
      if (it.st !== last) {
        last = it.st;
        listEl.appendChild(el('div', 'ln-grp',
          `${statusIcon(it.st)}<b>${DATA.statuses[it.st][0]}</b>
           <span>${issues.filter(x => x.st === it.st).length}</span>
           <span class="pl">+</span>`));
      }
      const r = el('div', 'ln-row' + (selected === it.id ? ' sel' : ''),
        `${prioIcon(it.prio)}
         <span class="ln-id">${it.id}</span>
         ${statusIcon(it.st)}
         <span class="ln-ti">${esc(it.title)}</span>
         <span class="ln-lab"><i style="background:${it.label[1]}"></i>${it.label[0]}</span>
         <span class="ln-when">${ago(it.mins)}</span>
         <span class="av" style="background:${it.who.color}">${it.who.initials}</span>`);
      r.dataset.id = it.id;
      listEl.appendChild(r);
    });
  };

  const detail = it => {
    selected = it.id;
    const [sn] = DATA.statuses[it.st];
    detailEl.innerHTML = `
      <div class="ln-dh"><span class="ln-id">${it.id}</span><span class="sp"></span><span>⊙</span><span>⋯</span></div>
      <h3>${esc(it.title)}</h3>
      <div class="ln-dsec">
        <div class="ln-prop"><span>Status</span><b>${statusIcon(it.st, 13)} ${sn}</b></div>
        <div class="ln-prop"><span>Priority</span><b>${prioIcon(it.prio)} ${['No priority', 'Low', 'Medium', 'High'][it.prio]}</b></div>
        <div class="ln-prop"><span>Assignee</span><b><span class="av" style="background:${it.who.color}">${it.who.initials}</span> ${esc(it.who.name)}</b></div>
        <div class="ln-prop"><span>Labels</span><b><span class="ln-lab"><i style="background:${it.label[1]}"></i>${it.label[0]}</span></b></div>
        <div class="ln-prop"><span>Cycle</span><b>◷ Cycle 24</b></div>
        <div class="ln-prop"><span>Project</span><b>▰ ${esc(CFG.project)}</b></div>
      </div>
      <h4>Activity</h4>
      <div class="ln-acts"></div>`;
    for (let i = 0; i < 4; i++) activity();
  };

  const activity = () => {
    const box = detailEl.querySelector('.ln-acts');
    if (!box) return;
    const who = pick(DATA.people);
    const it = pick(issues);
    const line = nextAct()
      .replace('{i}', `<em>${it.id}</em>`)
      .replace('{p}', esc(pick(DATA.people).name.split(' ')[0]));
    const ev = el('div', 'ln-ev',
      `<span class="av" style="background:${who.color}">${who.initials}</span>
       <span><b>${esc(who.name.split(' ')[0])}</b> ${line}
       <span class="t">${ago(rnd(0, 240))} ago</span></span>`);
    box.insertBefore(ev, box.firstChild);
    while (box.children.length > 8) box.lastChild.remove();
  };

  /* Nudge one issue forward and re-sort, so the board visibly makes progress.
     When everything is Done the board would freeze, so shipped work rolls off
     the bottom and fresh issues arrive in the backlog — like a real cycle. */
  const advance = () => {
    let movable = issues.filter(i => i.st < 4);
    if (!movable.length) {
      issues.splice(0, Math.max(4, issues.length - 13));
      for (let i = 0; i < 5; i++) issues.push(mkIssue());
      issues.forEach(x => { if (x.st === 4 && chance(.5)) x.st = irnd(0, 1); });
      movable = issues.filter(i => i.st < 4);
      if (!movable.length) return;
    }
    const it = pick(movable);
    it.st++;
    it.mins = 0;
    issues.sort((a, b) => a.st - b.st || a.mins - b.mins);
    detail(it);
    render();
    const row = listEl.querySelector(`[data-id="${it.id}"]`);
    if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  LB.register({
    id: 'linear', icon: 'linear', name: 'Linear', macName: 'Linear',
    menus: ['File', 'Edit', 'View', 'Window', 'Help'],
    title: () => 'All issues · Engineering — Linear',

    mount(host) {
      root = host;
      root.className = 'app ln';
      root.innerHTML = `
        <div class="app-top ln-top"><span class="win-dots"><i></i><i></i><i></i></span>
          <span class="ln-hist">‹ ›</span></div>
        <div class="app-body">
          <div class="side">
            <div class="ln-ws"><span class="ln-logo">${esc(CFG.company[0] || 'W')}</span> ${esc(CFG.company)} <span class="cv">⌄</span>
              <span class="sp"></span><span class="ln-pen">✎</span></div>
            <div class="ln-nav">
              <a><span class="i">⌕</span> Search</a>
              <a><span class="i">◲</span> Inbox <span class="ct">4</span></a>
              <a><span class="i">◎</span> My issues</a>
            </div>
            <div class="sec-lbl">Workspace</div>
            <div class="ln-nav">
              <a><span class="i">▰</span> Projects</a><a><span class="i">◈</span> Views</a>
              <a><span class="i">⚑</span> Roadmaps</a>
            </div>
            <div class="sec-lbl">Your teams</div>
            <div class="ln-nav">
              <a class="on"><span class="i tri">▲</span> Engineering</a>
              <a class="sub">Issues</a><a class="sub">Cycles</a><a class="sub">Projects</a>
              <a><span class="i tri">▲</span> Platform</a><a><span class="i tri">▲</span> Growth</a>
            </div>
            <div class="ln-foot"><span class="av" style="background:#5e6ad2">${DATA.me.initials}</span> Try Linear Insights</div>
          </div>
          <div class="main">
            <div class="ln-head">
              <b>All issues</b>
              <span class="ln-tabs"><span class="on">All</span><span>Active</span><span>Backlog</span></span>
              <span class="sp"></span>
              <span class="ln-btn">⚙ Filter</span><span class="ln-btn">▤ Display</span>
            </div>
            <div class="ln-list scroll"></div>
          </div>
          <div class="ln-det scroll"></div>
        </div>`;
      listEl = root.querySelector('.ln-list');
      detailEl = root.querySelector('.ln-det');
      issues = Array.from({ length: 18 }, mkIssue).sort((a, b) => a.st - b.st || a.mins - b.mins);
      detail(issues[Math.floor(issues.length / 2)]);
      render();
    },

    start() {
      clock = new LB.Clock();
      clock.drift(5000, 11000, advance);
      clock.drift(3500, 9000, activity);
      clock.drift(7000, 16000, () => {
        const it = pick(issues);
        detail(it);
        render();
        const r = listEl.querySelector(`[data-id="${it.id}"]`);
        if (r) r.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    },

    stop() { clock && clock.kill(); },
    cursorTargets: () => ['.ln-list', '.ln-det'],
  });
})();
