/* Design file with two colleagues in it, nudging rectangles forever. */
(() => {
  const { el, esc, pick, irnd, rnd, chance } = LB;
  let root, canvas, sel, layersEl, propsEl, clock, marks = [], cursors = [];

  const frameUI = (w, h, kind) => {
    const out = [];
    const add = (c, x, y, ww, hh) => out.push(`<div class="mk ${c}" style="left:${x}px;top:${y}px;width:${ww}px;height:${hh}px"></div>`);
    add('c', 0, 0, w, 34);
    add('a', 14, 11, 60, 12);
    add('b', w - 60, 11, 46, 12);
    if (kind === 'Empty state') {
      add('t', w / 2 - 60, h / 2 - 46, 120, 62);
      add('b', w / 2 - 80, h / 2 + 30, 160, 10);
      add('a', w / 2 - 42, h / 2 + 52, 84, 22);
    } else {
      for (let i = 0; i < 3; i++) add('t', 14 + i * ((w - 28) / 3), 50, (w - 28) / 3 - 10, 58);
      add('t', 14, 122, w - 28, h - 150);
      for (let i = 0; i < 7; i++) {
        const bh = irnd(14, 74);
        add('a', 30 + i * 30, h - 34 - bh, 16, bh);
      }
    }
    return out.join('');
  };

  const buildCanvas = () => {
    canvas.querySelectorAll('.fg-frame').forEach(n => n.remove());
    const spots = [[90, 70, 380, 260], [520, 70, 300, 260], [90, 390, 380, 240], [520, 390, 300, 240]];
    DATA.figmaFrames.forEach((name, i) => {
      const [x, y, w, h] = spots[i];
      const f = el('div', 'fg-frame');
      f.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      f.innerHTML = `<span class="fl">${esc(name)}</span>` + frameUI(w, h, name);
      canvas.appendChild(f);
    });
    marks = [...canvas.querySelectorAll('.mk')];
  };

  const select = () => {
    const m = pick(marks);
    if (!m) return;
    const cr = canvas.getBoundingClientRect(), r = m.getBoundingClientRect();
    sel.style.cssText = `left:${r.left - cr.left - 1}px;top:${r.top - cr.top - 1}px;width:${r.width}px;height:${r.height}px`;
    const ls = layersEl.querySelectorAll('.fg-layer');
    const li = marks.indexOf(m) % ls.length;
    ls.forEach((n, i) => n.classList.toggle('on', i === li));
    propsEl.querySelector('.px').value = Math.round(parseFloat(m.style.left));
    propsEl.querySelector('.py').value = Math.round(parseFloat(m.style.top));
    propsEl.querySelector('.pw').value = Math.round(parseFloat(m.style.width));
    propsEl.querySelector('.ph').value = Math.round(parseFloat(m.style.height));
    return m;
  };

  /* nudge whatever is selected — the visible half of "iterating on it" */
  const nudge = () => {
    const m = pick(marks);
    if (!m) return;
    m.style.transition = 'all .45s cubic-bezier(.3,.9,.3,1)';
    m.style.left = parseFloat(m.style.left) + irnd(-6, 6) + 'px';
    if (chance(.4)) m.style.height = Math.max(8, parseFloat(m.style.height) + irnd(-8, 8)) + 'px';
    select();
  };

  const mkCursor = p => {
    const c = el('div', 'fg-cur',
      `<svg width="14" height="18" viewBox="0 0 14 18"><path d="M1 1l11 7-4.6.9L9.8 15 7.7 16 5.4 10.4 1 13z" fill="${p.color}" stroke="#fff" stroke-width=".8"/></svg><b style="background:${p.color}">${esc(p.name.split(' ')[0])}</b>`);
    canvas.appendChild(c);
    return { node: c, p };
  };

  const tool = (d, on) => `<span class="fg-tool${on ? ' on' : ''}"><svg viewBox="0 0 20 20" width="17" height="17">
    <path d="${d}" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"/></svg></span>`;

  LB.register({
    id: 'figma', icon: 'figma', name: 'Figma', macName: 'Figma',
    menus: ['File', 'Edit', 'View', 'Object', 'Vector', 'Text', 'Arrange', 'Plugins', 'Window', 'Help'],
    title: () => `${CFG.file} – Figma`,

    mount(host) {
      root = host;
      root.className = 'app fg';
      root.innerHTML = `
        <div class="app-top fg-top">
          <span class="win-dots"><i></i><i></i><i></i></span>
          <span class="fg-tools">
            ${tool('M4 3l12 6.5-5 1.6-1.7 5z', true)}
            ${tool('M6 2v16M14 2v16M2 6h16M2 14h16')}
            ${tool('M3 3h14v14H3z')}
            ${tool('M4 15l5-11 4 7 2-3 2 7z')}
            ${tool('M3 5h14M8 5v11M6 16h4')}
            ${tool('M10 3v14M3 10h14')}
          </span>
          <span class="fg-file"><b>${esc(CFG.file)}</b> <span class="cv">⌄</span></span>
          <span class="sp"></span>
          <span class="fg-faces"></span>
          <span class="fg-share">Share</span>
          <span class="fg-play">▶</span>
        </div>
        <div class="app-body">
          <div class="fg-l">
            <div class="fg-ltabs"><b>File</b><span>Assets</span></div>
            <div class="fg-l-scroll scroll">
              <div class="lbl">Pages</div>
              <div class="fg-page on">${esc(CFG.file)}</div>
              <div class="fg-page">Explorations</div>
              <div class="fg-page">Archive</div>
              <div class="lbl">Layers</div>
              <div class="fg-layers"></div>
            </div>
          </div>
          <div class="fg-canvas">
            <div class="fg-grid"></div>
            <div class="fg-sel"></div>
            <div class="fg-zoom">64% <span class="cv">⌄</span></div>
          </div>
          <div class="fg-r">
            <div class="fg-rtabs"><b>Design</b><span>Prototype</span><span>Inspect</span></div>
            <div class="fg-align">⇤ ⇥ ⇱ ⇲ ⇵ ⇶</div>
            <div class="lbl">Position</div>
            <div class="fg-grid2">
              <label>X <input class="px" value="0"></label>
              <label>Y <input class="py" value="0"></label>
              <label>W <input class="pw" value="0"></label>
              <label>H <input class="ph" value="0"></label>
            </div>
            <div class="lbl">Appearance</div>
            <div class="fg-grid2">
              <label>◑ <input value="100%"></label>
              <label>⬚ <input value="8"></label>
            </div>
            <div class="lbl bar">Fill <span>+</span></div>
            <div class="fg-prop"><span><i class="fg-swatch" style="background:#5e6ad2"></i> 5E6AD2</span><span>100%</span></div>
            <div class="lbl bar">Stroke <span>+</span></div>
            <div class="fg-prop"><span><i class="fg-swatch" style="background:#e6e6e6"></i> E6E6E6</span><span>100%</span></div>
            <div class="lbl bar">Effects <span>+</span></div>
            <div class="fg-prop"><span>◍ Drop shadow</span><span>◉</span></div>
            <div class="lbl bar">Export <span>+</span></div>
            <div class="fg-prop"><span>2x PNG</span><span>↓</span></div>
          </div>
        </div>`;
      canvas = root.querySelector('.fg-canvas');
      sel = root.querySelector('.fg-sel');
      layersEl = root.querySelector('.fg-layers');
      propsEl = root.querySelector('.fg-r');
      DATA.figmaLayers.forEach((l, i) => layersEl.appendChild(el('div', 'fg-layer' + (i > 1 ? ' in' : ''),
        `<span class="i">${i > 1 ? '▢' : '#'}</span> ${esc(l)}`)));
      root.querySelector('.fg-faces').innerHTML = DATA.people.slice(0, 3)
        .map(p => `<span class="av" style="background:${p.color}">${p.initials}</span>`).join('');
      buildCanvas();
    },

    start() {
      clock = new LB.Clock();
      cursors = DATA.people.slice(0, 2).map(mkCursor);
      const move = c => {
        const w = canvas.clientWidth || 700, h = canvas.clientHeight || 500;
        c.node.style.transform = `translate(${rnd(40, w - 120)}px,${rnd(40, h - 60)}px)`;
      };
      cursors.forEach(move);
      clock.drift(1600, 4200, () => cursors.forEach(c => chance(.7) && move(c)));
      clock.after(400, select);
      clock.drift(1800, 4500, nudge);
      clock.drift(9000, 20000, () => {
        const z = root.querySelector('.fg-zoom');
        z.textContent = pick(['48%', '64%', '80%', '100%', '125%']);
      });
    },

    stop() {
      clock && clock.kill();
      cursors.forEach(c => c.node.remove());
      cursors = [];
    },
    cursorTargets: () => ['.fg-canvas'],
  });
})();
