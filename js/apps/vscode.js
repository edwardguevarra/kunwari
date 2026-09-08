/* Visual Studio Code (Dark Modern) writing plausible TypeScript at a human pace. */
(() => {
  const { el, esc, pick, irnd, rnd, chance, bag, typeInto, drip } = LB;
  const nextSnippet = bag(DATA.snippets), nextCmd = bag(DATA.terminalCmds), nextFile = bag(DATA.files);

  /* Highlighting runs once per finished line — cheaper and less flickery than per keystroke. */
  const hl = raw => {
    let s = esc(raw);
    if (/^\s*(\/\/|\*|\/\*)/.test(raw)) return `<span class="cm">${s}</span>`;
    s = s.replace(/(&quot;|")([^"&]*)(&quot;|")/g, '<span class="s">"$2"</span>');
    s = s.replace(/\b(export|async|function|const|let|return|if|for|of|await|class|private|constructor|new|import|from|type|interface)\b/g, '<span class="k">$1</span>');
    s = s.replace(/\b(number|string|boolean|Promise|Queue|Step|RetryBudget)\b/g, '<span class="t">$1</span>');
    s = s.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="n">$1</span>');
    s = s.replace(/(\w+)(\()/g, '<span class="fn">$1</span>$2');
    return s;
  };

  const ico = {
    files: 'M3 3h5l1.5 2H17v11H3z',
    search: 'M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zm4.5-1.5L18 18',
    scm: 'M6 5a2 2 0 1 0 0-.1zM6 7v6m0 2a2 2 0 1 0 0 .1zM14 9a2 2 0 1 0 0-.1zm0 2c0 3-4 2-8 4',
    run: 'M4 3l12 7-12 7z',
    ext: 'M3 3h6v6H3zm8 0h6v6h-6zM3 11h6v6H3zm11 0v6m-3-3h6',
  };

  let root, code, tabsEl, treeEl, termEl, mini, crumbs, clock;
  let lineNo = 0, openFile = null;

  const setTitle = () =>
    LB.setTitle(`${openFile.path.split('/').pop()} — ${CFG.repo} — Visual Studio Code`, 'vscode');

  const addLine = (text, done) => {
    lineNo++;
    const ln = el('div', 'vs-ln cur');
    ln.appendChild(el('span', 'n', String(lineNo)));
    const c = el('span', 'c');
    ln.appendChild(c);
    code.querySelectorAll('.vs-ln.cur').forEach(n => n.classList.remove('cur'));
    code.appendChild(ln);
    const m = el('i');
    m.style.width = Math.min(62, 6 + text.length * 0.7) + 'px';
    mini.appendChild(m);
    if (mini.children.length > 46) mini.firstChild.remove();
    if (code.scrollHeight - code.scrollTop > code.clientHeight - 60) drip(clock, code, 20, 300);

    if (!text.trim()) { c.innerHTML = '&nbsp;'; return clock.after(rnd(120, 400), done); }
    typeInto(clock, c, text, {
      cps: rnd(20, 38), chunk: 2,
      done: () => { c.innerHTML = hl(text); clock.after(rnd(90, 520), done); },
    });
  };

  const writeSnippet = after => {
    const lines = nextSnippet();
    let i = 0;
    const next = () => (i < lines.length ? addLine(lines[i++], next) : clock.after(rnd(1200, 3000), after));
    next();
  };

  const newFile = () => {
    openFile = nextFile();
    lineNo = 0;
    code.innerHTML = '';
    mini.innerHTML = '';
    const others = LB.shuffle(DATA.files.filter(f => f !== openFile)).slice(0, 3);
    tabsEl.innerHTML = others.concat([openFile]).map(f => {
      const on = f === openFile;
      const name = f.path.split('/').pop();
      return `<div class="vs-tab${on ? ' on' : ''}">
        <span class="ft ${f.lang}">${f.lang === 'tsx' ? '⬡' : 'TS'}</span>${esc(name)}
        <span class="x">${on ? '●' : '✕'}</span></div>`;
    }).join('');
    treeEl.querySelectorAll('.f').forEach(n => n.classList.toggle('on', n.dataset.p === openFile.path));
    crumbs.innerHTML = openFile.path.split('/')
      .map((p, i, a) => `<span${i === a.length - 1 ? ' class="last"' : ''}>${esc(p)}</span>`)
      .join('<i>›</i>');
    root.querySelector('.vs-wt').textContent = `${openFile.path.split('/').pop()} — ${CFG.repo}`;
    root.querySelector('.status-file').textContent = 'Ln ' + irnd(4, 40) + ', Col ' + irnd(1, 40);
    setTitle();
  };

  const runCmd = after => {
    const [cmd, out] = nextCmd();
    const wrap = el('div', null,
      `<span class="ok">➜</span>  <span class="dim">${esc(CFG.repo)}</span> <span class="brc">git:(</span><span class="brn">${esc(CFG.branch)}</span><span class="brc">)</span> `);
    const line = el('span');
    wrap.appendChild(line);
    termEl.appendChild(wrap);
    typeInto(clock, line, cmd, {
      cps: 30,
      done: () => clock.after(rnd(400, 1100), () => {
        out.forEach(l => termEl.appendChild(el('div', null, esc(l).replace(/✓/g, '<span class="ok">✓</span>'))));
        termEl.appendChild(el('div', null, '&nbsp;'));
        termEl.scrollTop = termEl.scrollHeight;
        while (termEl.children.length > 60) termEl.firstChild.remove();
        clock.after(rnd(1500, 4000), after);
      }),
    });
  };

  const railIcon = (d, on) =>
    `<div class="${on ? 'on' : ''}"><svg viewBox="0 0 20 20" width="22" height="22">
       <path d="${d}" fill="none" stroke="currentColor" stroke-width="1.3"
             stroke-linejoin="round" stroke-linecap="round"/></svg></div>`;

  LB.register({
    id: 'vscode', icon: 'vscode', name: 'Code', macName: 'Code',
    menus: ['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Window', 'Help'],
    title: () => `${(openFile || DATA.files[0]).path.split('/').pop()} — ${CFG.repo} — Visual Studio Code`,

    mount(host) {
      root = host;
      root.className = 'app vs';
      root.innerHTML = `
        <div class="app-top vs-top">
          <span class="win-dots"><i></i><i></i><i></i></span>
          <span class="vs-back">‹ ›</span>
          <span class="vs-wt"></span>
          <span class="vs-layout">▤ ▥ ▦</span>
        </div>
        <div class="app-body">
          <div class="vs-rail">
            <div class="top">
              ${railIcon(ico.files, true)}${railIcon(ico.search)}
              <div class="badged">${railIcon(ico.scm)}<b>3</b></div>
              ${railIcon(ico.run)}${railIcon(ico.ext)}
            </div>
            <div class="bot">${railIcon('M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 18c1-3 4-4 7-4s6 1 7 4')}
              ${railIcon('M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM10 2v2m0 12v2M2 10h2m12 0h2M4.5 4.5l1.5 1.5m8 8 1.5 1.5m0-11-1.5 1.5m-8 8-1.5 1.5')}</div>
          </div>
          <div class="vs-side">
            <div class="vs-sh">EXPLORER<span>⋯</span></div>
            <div class="vs-tree scroll"></div>
            <div class="vs-fold">› OUTLINE</div>
            <div class="vs-fold">› TIMELINE</div>
          </div>
          <div class="vs-main">
            <div class="vs-tabs"></div>
            <div class="vs-crumbs"></div>
            <div class="vs-editwrap">
              <div class="vs-code scroll"></div>
              <div class="vs-mini"></div>
            </div>
            <div class="vs-term">
              <div class="vs-term-top">
                <span>PROBLEMS</span><span>OUTPUT</span><span>DEBUG CONSOLE</span><b>TERMINAL</b><span>PORTS</span>
                <span class="sp">zsh — halcyon &nbsp; ✕</span>
              </div>
              <div class="vs-term-body scroll"></div>
            </div>
          </div>
        </div>
        <div class="vs-status">
          <span class="rem">›‹</span>
          <span>⑂ ${esc(CFG.branch)}*</span><span>↻ 0↓ 2↑</span><span>⊗ 0 &nbsp;⚠ 2</span>
          <span class="sp status-file">Ln 12, Col 4</span><span>Spaces: 2</span><span>UTF-8</span>
          <span>TypeScript</span><span>Prettier ✓</span><span>🔔</span>
        </div>`;

      treeEl = root.querySelector('.vs-tree');
      treeEl.innerHTML = `<div class="f dir open">▾ <b>${esc(CFG.repo.toUpperCase())}</b></div>`;
      const groups = {};
      DATA.files.forEach(f => {
        const dir = f.path.split('/').slice(0, -1).join('/');
        (groups[dir] = groups[dir] || []).push(f);
      });
      Object.entries(groups).forEach(([dir, fs]) => {
        treeEl.appendChild(el('div', 'f dir d1', `▾ ${esc(dir.split('/').pop())}`));
        fs.forEach(f => {
          const n = el('div', 'f d2',
            `<span class="ft ${f.lang}">${f.lang === 'tsx' ? '⬡' : 'TS'}</span>${esc(f.path.split('/').pop())}`);
          n.dataset.p = f.path;
          treeEl.appendChild(n);
        });
      });

      code = root.querySelector('.vs-code');
      tabsEl = root.querySelector('.vs-tabs');
      termEl = root.querySelector('.vs-term-body');
      mini = root.querySelector('.vs-mini');
      crumbs = root.querySelector('.vs-crumbs');
      termEl.innerHTML = '<div class="dim">Last login: today on ttys004</div><div>&nbsp;</div>';
      root.querySelector('.vs-term-top .sp').textContent = `zsh — ${CFG.repo}  ✕`;
      newFile();
    },

    start() {
      clock = new LB.Clock();
      setTitle();
      let wrote = false;
      const cycle = () => {
        if (wrote && chance(.28)) return runCmd(cycle);
        wrote = true;
        if (lineNo > 34) { newFile(); return clock.after(600, cycle); }
        writeSnippet(cycle);
      };
      cycle();
      clock.drift(9000, 20000, () => {
        const n = pick([...treeEl.querySelectorAll('.f.d2')]);
        n && n.classList.toggle('mod');
      });
    },

    stop() { clock && clock.kill(); },
    cursorTargets: () => ['.vs-code', '.vs-tree', '.vs-term-body'],
  });
})();
