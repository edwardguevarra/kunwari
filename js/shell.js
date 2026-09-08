/* The desktop: menu bar, dock, one window at a time, and a cursor that wanders. */
(() => {
  const { el, esc, pick, rnd, state, apps } = LB;
  const $ = s => document.querySelector(s);
  const screen = $('#screen'), dock = $('#dock'), ghost = $('#ghost-cursor');
  const mounted = new Map();
  let current = null, shellClock = null, switchTimer = null, interval = 35000;

  /* Apps mount only once the workspace is configured, so every name they bake
     into their markup is the one the user chose. */
  function mountAll() {
    dock.innerHTML = '';
    screen.innerHTML = '';
    mounted.clear();
    dock.appendChild(mkDockIcon('finder', 'Finder', null));
    dock.appendChild(el('div', 'dk-sep'));
    apps.forEach(a => {
      const host = el('div', 'app');
      screen.appendChild(host);
      a.mount(host);
      mounted.set(a.id, host);
      dock.appendChild(mkDockIcon(a.icon, a.dockName || a.macName, a.id));
    });
    dock.appendChild(el('div', 'dk-sep'));
    dock.appendChild(mkDockIcon('trash', 'Trash', null));
  }

  function mkDockIcon(iconName, label, id) {
    const b = el('button', 'dk' + (id ? ' live' : ''),
      `${icon(iconName, 50)}<span class="run"></span><span class="tip">${esc(label)}</span>`);
    if (id) b.onclick = () => { show(id); armSwitch(); };
    b.dataset.id = id || '';
    return b;
  }

  /* ---- bring an app forward ---- */
  function show(id) {
    if (current === id) return;
    if (current) {
      apps.find(a => a.id === current).stop();
      mounted.get(current).classList.remove('on');
    }
    current = id;
    LB.front = id;
    const a = apps.find(x => x.id === id);
    mounted.get(id).classList.add('on');
    a.start();
    dock.querySelectorAll('.dk').forEach(b => b.classList.toggle('front', b.dataset.id === id));
    $('.mb-name').textContent = a.macName;
    $('.mb-menus').innerHTML = a.menus.map(m => `<span>${esc(m)}</span>`).join('');
    LB.setTitle(a.title ? a.title() : a.macName);
    moveGhost();
  }

  function armSwitch() {
    clearTimeout(switchTimer);
    if (!interval || state.paused) return;
    switchTimer = setTimeout(() => {
      show(pick(apps.filter(a => a.id !== current)).id);
      armSwitch();
    }, interval * rnd(.75, 1.35));
  }

  /* ---- ghost cursor drifts over whatever the front app calls interesting ---- */
  function moveGhost() {
    if (!state.cursor || state.paused || !current) return;
    const a = apps.find(x => x.id === current), host = mounted.get(current);
    const sels = (a.cursorTargets && a.cursorTargets()) || [];
    const t = (sels.length && host.querySelector(pick(sels))) || host;
    const r = t.getBoundingClientRect(), vp = $('#desktop').getBoundingClientRect();
    if (!r.width) return;
    ghost.style.transform =
      `translate(${rnd(r.left + 20, r.right - 40) - vp.left}px,${rnd(r.top + 20, r.bottom - 40) - vp.top}px)`;
  }

  /* ---- notification centre ---- */
  function notify() {
    if (!state.notif || state.paused) return;
    const [app, title, msg] = pick(DATA.notifs);
    const body = msg
      .replace('{p}', pick(DATA.people).name)
      .replace('{branch}', CFG.branch);
    const n = el('div', 'notif',
      `<span class="ni">${icon(app, 34)}</span>
       <span class="nb"><b>${esc(title)}</b><span>${esc(body)}</span></span>
       <span class="nt">now</span>`);
    n.style.position = 'relative';
    $('#notifs').appendChild(n);
    setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 320); }, 5600);
    while ($('#notifs').children.length > 3) $('#notifs').firstChild.remove();
  }

  /* ---- menu bar clock, in the system format ---- */
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  setInterval(() => {
    const d = new Date();
    $('#mb-clock').textContent =
      `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}  ${LB.clockStr(d)}`;
  }, 1000);

  /* ---- pause ---- */
  function setPaused(p) {
    state.paused = p;
    $('#menu').hidden = !p;
    LB.clocks.forEach(c => (p ? c.pause() : c.resume()));
    if (p) clearTimeout(switchTimer); else armSwitch();
  }

  const fullscreen = () => document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen().catch(() => {});

  $('#menu').addEventListener('click', e => {
    const act = e.target.dataset.act;
    if (act === 'resume') setPaused(false);
    if (act === 'fs') fullscreen();
    if (act === 'restart') location.reload();
  });

  document.addEventListener('keydown', e => {
    if (!$('#boot').hidden) return;
    const k = e.key.toLowerCase();
    if (k === 'f') fullscreen();
    else if (k === ' ' || k === 'escape') { e.preventDefault(); setPaused(!state.paused); }
    else if (k >= '1' && k <= String(apps.length)) { show(apps[+k - 1].id); armSwitch(); }
    else if (k === 'n') notify();
  });

  /* ---- boot ---- */
  /* ---- the setup form ---- */
  const fields = {
    company: '#cfg-company', myName: '#cfg-me', domain: '#cfg-domain',
    repo: '#cfg-repo', branch: '#cfg-branch', project: '#cfg-project',
    file: '#cfg-file', dashboard: '#cfg-dash',
  };
  const fillForm = () => {
    Object.entries(fields).forEach(([k, sel]) => ($(sel).value = CFG[k]));
    $('#cfg-team').value = CFG.team.join('\n');
  };
  const readForm = () => {
    Object.entries(fields).forEach(([k, sel]) => {
      const v = $(sel).value.trim();
      CFG[k] = v || CFG.DEFAULTS[k];
    });
    const team = $('#cfg-team').value.split('\n').map(t => t.trim()).filter(Boolean);
    CFG.team = team.length ? team : CFG.DEFAULTS.team;
    CFG.save();
  };
  fillForm();

  $('#cfg-toggle').onclick = () => {
    const box = $('#cfg-box');
    box.hidden = !box.hidden;
    $('#cfg-toggle').textContent = box.hidden ? 'Customise workspace  ▸' : 'Customise workspace  ▾';
  };
  $('#cfg-reset').onclick = () => {
    Object.assign(CFG, CFG.DEFAULTS, { team: [...CFG.DEFAULTS.team] });
    CFG.save();
    fillForm();
  };

  $('#boot-go').onclick = () => {
    readForm();
    applyConfig();
    mountAll();
    interval = +$('#opt-interval').value;
    state.speed = +$('#opt-speed').value;
    state.cursor = $('#opt-cursor').checked;
    state.notif = $('#opt-notif').checked;
    ghost.classList.toggle('hide', !state.cursor);

    $('#boot').hidden = true;
    $('#desk').hidden = false;
    document.documentElement.requestFullscreen?.().catch(() => {});

    show(pick(apps).id);
    armSwitch();

    shellClock = new LB.Clock();
    shellClock.drift(1400, 4200, moveGhost);
    shellClock.drift(20000, 48000, notify);
  };
})();
