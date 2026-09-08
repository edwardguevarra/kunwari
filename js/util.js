/* Shared helpers + a tiny app registry. Everything is fake; nothing leaves the page. */
const LB = (() => {
  const apps = [];
  const state = { speed: 1, cursor: true, notif: true, paused: false };

  const rnd  = (a, b) => a + Math.random() * (b - a);
  const irnd = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const chance = p => Math.random() < p;
  const shuffle = a => a.slice().sort(() => Math.random() - .5);

  /* A shuffled bag: every item comes out once before any repeats. Beats pick()
     for anything the viewer reads, where a repeat is instantly noticeable. */
  const bag = arr => {
    let rest = [];
    return () => {
      if (!rest.length) rest = shuffle(arr);
      return rest.pop();
    };
  };

  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /* A scheduler each app owns, so stopping an app kills every pending timer it made.
     It also knows how to freeze and thaw, which is what Space does. */
  const clocks = new Set();
  class Clock {
    constructor() { this.pending = new Map(); this.seq = 0; this.dead = false; this.paused = false; clocks.add(this); }
    after(ms, fn) {
      if (this.dead) return;
      const key = ++this.seq;
      const rec = { fn, remaining: ms * state.speed, start: Date.now(), id: null };
      this.pending.set(key, rec);
      if (!this.paused) this._arm(key, rec);
      return key;
    }
    _arm(key, rec) {
      rec.start = Date.now();
      rec.id = setTimeout(() => { this.pending.delete(key); if (!this.dead) rec.fn(); }, rec.remaining);
    }
    every(ms, fn) {
      const gap = () => (typeof ms === 'function' ? ms() : ms);
      const loop = () => { fn(); this.after(gap(), loop); };
      this.after(gap(), loop);
    }
    /* run fn, then reschedule with a jittered gap — feels human, not metronomic */
    drift(min, max, fn) { this.every(() => rnd(min, max), fn); }
    pause() {
      if (this.paused || this.dead) return;
      this.paused = true;
      this.pending.forEach(r => { clearTimeout(r.id); r.remaining = Math.max(0, r.remaining - (Date.now() - r.start)); });
    }
    resume() {
      if (!this.paused || this.dead) return;
      this.paused = false;
      this.pending.forEach((r, key) => this._arm(key, r));
    }
    kill() { this.dead = true; this.pending.forEach(r => clearTimeout(r.id)); this.pending.clear(); clocks.delete(this); }
  }

  /* Types text into a node one chunk at a time, with human-ish pauses. */
  function typeInto(clock, node, text, opts = {}) {
    const { cps = 26, done, caret = true, chunk = 1 } = opts;
    let i = 0;
    node.textContent = '';
    if (caret) node.classList.add('typing');
    const step = () => {
      if (i >= text.length) {
        if (caret) node.classList.remove('typing');
        done && done();
        return;
      }
      const n = Math.min(chunk === 1 ? 1 : irnd(1, chunk), text.length - i);
      node.textContent += text.substr(i, n);
      i += n;
      const ch = text[i - 1];
      let d = 1000 / cps;
      if (ch === ' ') d *= 1.4;
      if ('.,;:'.includes(ch)) d *= 5;
      clock.after(d * rnd(.6, 1.5), step);
    };
    step();
    return () => { i = text.length; };
  }

  /* Smooth-ish scroll that doesn't fight the browser. */
  function drip(clock, node, px, ms = 900) {
    const from = node.scrollTop, t0 = performance.now();
    const frame = now => {
      if (clock.dead) return;
      const p = Math.min(1, (now - t0) / ms);
      node.scrollTop = from + px * (1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  const pad = n => String(n).padStart(2, '0');
  const clockStr = d => `${((d.getHours() + 11) % 12) + 1}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const ago = mins => mins < 1 ? 'now' : mins < 60 ? `${Math.round(mins)}m` : mins < 1440 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;

  /* Chrome window chrome — tab strip + omnibox — for the apps that live in a browser. */
  const browserTop = (tabs, active, url) => `
    <div class="app-top br-top">
      <span class="win-dots"><i></i><i></i><i></i></span>
      <span class="br-tabs">
        ${tabs.map((t, i) => `<span class="br-tab${i === active ? ' on' : ''}">
          ${icon(t.icon, 15)}<b>${t.title}</b><i class="x">✕</i></span>`).join('')}
        <span class="br-new">+</span>
      </span>
    </div>
    <div class="br-bar">
      <span class="br-nav">‹</span><span class="br-nav dim">›</span><span class="br-nav">⟳</span>
      <span class="br-omni"><i class="lock">🔒</i>${url}</span>
      <span class="br-ext">⋮⋮</span><span class="av" style="background:#5e6ad2">${DATA.me.initials}</span>
    </div>`;

  return {
    apps, state, rnd, irnd, pick, chance, shuffle, bag, el, esc, browserTop,
    Clock, clocks, typeInto, drip, pad, clockStr, ago,
    /* The tab title follows the front window; background apps can't steal it. */
    front: null,
    setTitle(t, appId) { if (!appId || appId === LB.front) document.title = t; },
    register: a => apps.push(a),
  };
})();
