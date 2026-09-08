/* Analytics dashboard whose numbers keep moving, because dashboards do. */
(() => {
  const { el, esc, pick, irnd, rnd, chance } = LB;
  let root, clock, bars, spark, kpis = [], funnel, tbl;

  const fmt = n => n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(Math.round(n));

  const sparkPath = pts => {
    const w = 100, h = 44, max = Math.max(...pts), min = Math.min(...pts), span = max - min || 1;
    return pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 10)}`).join(' ');
  };

  const dashSlug = () => CFG.dashboard.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const tabs = () => [
    { icon: 'posthog', title: `${esc(CFG.dashboard)} • ${esc(CFG.company)}` },
    { icon: 'gmail', title: 'Inbox (8)' },
    { icon: 'linear', title: 'All issues' },
  ];

  LB.register({
    id: 'posthog', icon: 'chrome', name: 'PostHog', macName: 'Google Chrome',
    menus: ['File', 'Edit', 'View', 'History', 'Bookmarks', 'Profiles', 'Tab', 'Window', 'Help'],
    title: () => `${CFG.dashboard} • ${CFG.company} • PostHog`,

    mount(host) {
      root = host;
      root.className = 'app ph';
      root.innerHTML = LB.browserTop(tabs(), 0, `app.posthog.com/project/1/dashboard/${dashSlug()}`) + `
        <div class="app-body">
          <div class="side">
            <div class="ph-org"><span class="ph-logo">${icon('posthog', 22)}</span> ${esc(CFG.company)} <span class="cv">⌄</span></div>
            <div class="ph-nav">
              <a><span class="i">⌂</span> Project homepage</a>
              <a class="on"><span class="i">▦</span> Dashboards</a>
              <a><span class="i">◷</span> Product analytics</a>
              <a><span class="i">▶</span> Session replay</a>
              <a><span class="i">⚑</span> Feature flags</a>
              <a><span class="i">⚗</span> Experiments</a>
              <a><span class="i">⚠</span> Error tracking</a>
              <a><span class="i">⌗</span> Data warehouse</a>
            </div>
            <div class="sec-lbl">Dashboards</div>
            <div class="ph-nav sm">
              <a class="on">${esc(CFG.dashboard)}</a><a>Onboarding funnel</a><a>Revenue</a><a>Web analytics</a>
            </div>
          </div>
          <div class="main">
            <div class="ph-head">
              <div class="ph-ttl"><h3>${esc(CFG.dashboard)}</h3><span class="ph-star">★</span></div>
              <span class="sp"></span>
              <span class="ph-live">Live</span>
              <span class="ph-btn">Last 24 hours <span class="cv">⌄</span></span>
              <span class="ph-btn">All orgs <span class="cv">⌄</span></span>
              <span class="ph-btn pri">+ Add insight</span>
            </div>
            <div class="ph-body scroll">
              <div class="ph-kpis"></div>
              <div class="ph-cards">
                <div class="ph-card">
                  <div class="ph-ch"><h4>Events per minute</h4><span>⋯</span></div>
                  <div class="sub">Rolling, 5-minute buckets</div>
                  <div class="ph-bars"></div>
                </div>
                <div class="ph-card">
                  <div class="ph-ch"><h4>Onboarding funnel</h4><span>⋯</span></div>
                  <div class="sub">Last 7 days · 4 steps</div>
                  <div class="ph-funnel"></div>
                </div>
                <div class="ph-card wide">
                  <div class="ph-ch"><h4>Top insights</h4><span>⋯</span></div>
                  <div class="sub">Updated continuously</div>
                  <table class="ph-tbl"><thead><tr><th>Insight</th><th>Owner</th><th>Change</th><th>Value</th></tr></thead><tbody></tbody></table>
                </div>
                <div class="ph-card">
                  <div class="ph-ch"><h4>Ingest lag p99</h4><span>⋯</span></div>
                  <div class="sub">milliseconds</div>
                  <svg class="ph-spark" viewBox="0 0 100 44" preserveAspectRatio="none">
                    <path fill="none" stroke="#1d4aff" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>
                </div>
                <div class="ph-card">
                  <div class="ph-ch"><h4>Failed writes</h4><span>⋯</span></div>
                  <div class="sub">by sink</div>
                  <table class="ph-tbl"><tbody>
                    <tr><td>clickhouse-a</td><td>4</td></tr>
                    <tr><td>clickhouse-b</td><td>6</td></tr>
                    <tr><td>s3-archive</td><td>1</td></tr>
                    <tr><td>webhooks</td><td>2</td></tr>
                  </tbody></table>
                </div>
              </div>
            </div>
          </div>
        </div>`;

      const kp = root.querySelector('.ph-kpis');
      kpis = DATA.metrics.map(([label, val, dir]) => {
        const n = el('div', 'ph-kpi',
          `<div class="l">${esc(label)}</div><div class="v">${fmt(val)}</div>
           <div class="d" style="color:${dir === 'up' ? '#2bb673' : '#5e6ad2'}">${dir === 'up' ? '▲' : '▼'} ${irnd(2, 18)}% vs yesterday</div>`);
        kp.appendChild(n);
        return { node: n.querySelector('.v'), val };
      });

      bars = root.querySelector('.ph-bars');
      for (let i = 0; i < 34; i++) {
        const b = el('i');
        b.style.height = irnd(20, 100) + '%';
        bars.appendChild(b);
      }

      funnel = root.querySelector('.ph-funnel');
      [['Signed up', 100], ['Installed SDK', 62], ['First event', 44], ['Created insight', 29]]
        .forEach(([n, p]) => funnel.appendChild(el('div', 'ph-fs',
          `<div class="t"><span>${n}</span><b class="pc">${p}%</b></div><div class="bar"><i style="width:${p}%"></i></div>`)));

      tbl = root.querySelector('.ph-tbl tbody');
      LB.shuffle(DATA.phInsights).slice(0, 6).forEach(i => {
        const p = pick(DATA.people);
        const up = chance(.6);
        tbl.appendChild(el('tr',
          null,
          `<td>${esc(i)}</td><td>${esc(p.name)}</td>
           <td style="color:${up ? '#2bb673' : '#e5484d'}">${up ? '+' : '−'}${irnd(1, 24)}%</td>
           <td class="val">${fmt(irnd(120, 9000))}</td>`));
      });

      spark = root.querySelector('.ph-spark path');
      spark.dataset.pts = JSON.stringify(Array.from({ length: 40 }, () => irnd(600, 1400)));
      spark.setAttribute('d', sparkPath(JSON.parse(spark.dataset.pts)));
    },

    start() {
      clock = new LB.Clock();

      clock.drift(1400, 2600, () => {
        bars.appendChild(bars.firstChild.cloneNode()).style.height = irnd(25, 100) + '%';
        bars.firstChild.remove();
      });

      clock.drift(1800, 3600, () => {
        const k = pick(kpis);
        k.val = Math.max(1, k.val * rnd(.96, 1.05));
        k.node.textContent = fmt(k.val);
      });

      clock.drift(2500, 6000, () => {
        const pts = JSON.parse(spark.dataset.pts);
        pts.push(irnd(600, 1400));
        pts.shift();
        spark.dataset.pts = JSON.stringify(pts);
        spark.setAttribute('d', sparkPath(pts));
      });

      clock.drift(4000, 9000, () => {
        [...funnel.children].forEach((f, i) => {
          if (!i) return;
          const p = Math.max(8, Math.min(95, parseFloat(f.querySelector('.pc').textContent) + irnd(-3, 3)));
          f.querySelector('.pc').textContent = Math.round(p) + '%';
          f.querySelector('.bar i').style.width = p + '%';
        });
      });

      clock.drift(3000, 7000, () => {
        const cell = pick([...tbl.querySelectorAll('.val')]);
        cell.textContent = fmt(irnd(120, 9000));
        cell.closest('tr').classList.add('row-hl');
        clock.after(1200, () => cell.closest('tr').classList.remove('row-hl'));
      });
    },

    stop() { clock && clock.kill(); },
    cursorTargets: () => ['.ph-body'],
  });
})();
