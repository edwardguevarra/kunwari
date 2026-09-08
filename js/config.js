/* Everything the user can make their own: company, themselves, their team.
   Stored in localStorage, applied to DATA before any app mounts. */
const CFG = (() => {
  const DEFAULTS = {
    company: 'Halcyon',
    domain: 'halcyon.dev',
    myName: 'You',
    repo: 'halcyon',
    branch: 'ingest/retry-budget',
    project: 'Ingest rewrite',
    file: 'Dashboard v4',
    dashboard: 'Ingest health',
    team: [
      'Mara Velez', 'Dev Okonjo', 'Ines Halvorsen', 'Tomas Reyes',
      'Priya Nandi', 'Kwame Asare', 'Lena Fischer', 'Rui Barbosa',
    ],
  };

  let cfg = { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem('lb.cfg') || 'null');
    if (saved) cfg = { ...DEFAULTS, ...saved };
  } catch (e) { /* private window, or someone put junk in there */ }

  cfg.DEFAULTS = DEFAULTS;
  cfg.save = () => {
    try {
      const { DEFAULTS: _d, save: _s, slug: _g, ...plain } = cfg;
      localStorage.setItem('lb.cfg', JSON.stringify(plain));
    } catch (e) { /* not worth interrupting anyone over */ }
  };
  return cfg;
})();

CFG.slug = () => CFG.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace';

const PALETTE = ['#e5484d', '#2bb673', '#e2b33c', '#9b5de5', '#00b4d8', '#f4845f', '#ff7ab6', '#4cc9f0',
                 '#8b5cf6', '#14b8a6', '#f97316', '#38bdf8'];
const ROLES = ['Eng manager', 'Backend', 'Design', 'Support', 'Data', 'SRE', 'Frontend', 'Platform'];

const initialsOf = name => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '??';
  /* One-word names get two letters, so an avatar is never a lonely single letter. */
  const s = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return s.toUpperCase();
};

/* Rebuilds every name-shaped piece of DATA from the current config. */
function applyConfig() {
  DATA.company = CFG.company;
  DATA.me = { name: CFG.myName, initials: initialsOf(CFG.myName), color: '#5e6ad2' };

  DATA.people = CFG.team
    .map(n => n.trim()).filter(Boolean)
    .map((name, i) => ({
      name,
      initials: initialsOf(name),
      color: PALETTE[i % PALETTE.length],
      role: ROLES[i % ROLES.length],
    }));

  /* Private offices belong to the first few people; the rest of the floor is shared. */
  const first = p => p.name.split(/\s+/)[0];
  const offices = DATA.people.slice(0, 5).map(p => ({
    name: `${first(p)}${first(p).endsWith('s') ? '’' : '’s'} office`,
    kind: 'office',
    owner: p,
  }));
  DATA.rooms = [...offices, ...DATA.sharedRooms];

  DATA.roamThreads = [
    ...DATA.groupThreads,
    ...DATA.people.slice(0, 4).map(p => ({ name: p.name, kind: 'dm' })),
  ];

  /* Emails keep their text but get a sender from the current team, deterministically
     so the same message always comes from the same person. */
  DATA.emails.forEach((e, i) => {
    e[0] = e[0] === 'Halcyon Status' || /Status$/.test(e[0])
      ? `${CFG.company} Status`
      : (DATA.people[i % DATA.people.length] || DATA.me).name;
  });
}
