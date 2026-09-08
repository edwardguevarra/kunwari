#!/usr/bin/env python3
"""Turns the brand SVGs in tools/logos/ into js/icons.js.

Each icon is normalised into one 100x100 tile: `vb` is the source viewBox, `fit`
is how much of the tile the mark fills, `tile` is the rounded-square behind it
(null for marks that are already their own icon shape). Run tools/fetch-icons.sh
first to refresh the sources.
"""
import base64, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
LOGOS = os.path.join(HERE, 'logos')
OUT = os.path.join(HERE, '..', 'js', 'icons.js')


def inner(name, recolor=None):
    s = open(os.path.join(LOGOS, name)).read()
    vb = re.search(r'viewBox="([^"]+)"', s).group(1)
    body = s[s.index('>', s.index('<svg')) + 1: s.rindex('</svg>')]
    body = re.sub(r'<title>.*?</title>', '', body, flags=re.S)
    body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
    body = re.sub(r'\s*\n\s*', '', body).strip()
    for a, b in (recolor or {}).items():
        body = body.replace(a, b)
    return vb, body


def png(name):
    data = base64.b64encode(open(os.path.join(LOGOS, name), 'rb').read()).decode()
    return f'<image href="data:image/png;base64,{data}" width="180" height="180"/>'


DRAWN = {
    'finder': ('0 0 100 100', '<defs><linearGradient id="fnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3aa9ff"/><stop offset="1" stop-color="#0a6fdb"/></linearGradient><clipPath id="fclip"><rect width="100" height="100" rx="22"/></clipPath></defs><g clip-path="url(#fclip)"><rect width="100" height="100" fill="url(#fnd)"/><path d="M50 0h50v100H50z" fill="#eaf2fb"/><path d="M50 0v100" stroke="#c9d8e8" stroke-width="1.5"/><path d="M28 34v13" stroke="#1e4b7a" stroke-width="5" stroke-linecap="round"/><path d="M72 34v13" stroke="#3b4a5a" stroke-width="5" stroke-linecap="round"/><path d="M30 63q20 15 40 0" fill="none" stroke="#2b3a4a" stroke-width="5" stroke-linecap="round"/></g>', None, 100),
    'trash': ('0 0 100 100', '<rect width="100" height="100" rx="22" fill="#ffffff18"/><path d="M30 32h40l-4 50a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6z" fill="none" stroke="#e9edf5" stroke-width="4"/><path d="M24 30h52M42 24h16M44 44v32M56 44v32" stroke="#e9edf5" stroke-width="4" stroke-linecap="round"/>', None, 100),
}

vb_ph, body_ph = inner('posthog-mono.svg')
ICONS = {
    'finder': DRAWN['finder'],
    'chrome': inner('chrome.svg') + (None, 100),
    'vscode': inner('visual-studio-code.svg') + (None, 100),
    'linear': inner('linear-icon.svg', {'#222326': '#FFFFFF'}) + ('#202124', 56),
    'roam': ('0 0 180 180', png('roam-180.png'), None, 100),
    'figma': inner('figma.svg') + ('#ffffff', 62),
    'posthog': (vb_ph, body_ph.replace('<path ', '<path fill="#fff" '), '#1d1f27', 56),
    'gmail': inner('google-gmail.svg') + ('#ffffff', 66),
    'trash': DRAWN['trash'],
}

head = """/* App icons. The brand marks are the official SVGs (Chrome, VS Code, Linear,
   Figma, Gmail, PostHog from the gilbarbara/simple-icons logo sets; Roam's is its
   own app icon), normalised into one 100x100 tile. Finder and Trash are drawn here.
   Regenerate with tools/fetch-icons.sh then tools/build-icons.py. */
const ICONS = {"""

tail = """};

/* Renders any icon into a square macOS-style tile at the requested size. */
const icon = (name, size = 52) => {
  const i = ICONS[name];
  if (!i) return '';
  const [, , vw, vh] = i.vb.split(/[\\s,]+/).map(Number);
  const s = i.fit / Math.max(vw, vh);
  const tx = (100 - vw * s) / 2, ty = (100 - vh * s) / 2;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">`
    + (i.tile ? `<rect width="100" height="100" rx="22" fill="${i.tile}"/>` : '')
    + `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${s.toFixed(4)})">${i.body}</g></svg>`;
};"""

lines = [head]
for k, (vb, body, tile, fit) in ICONS.items():
    lines.append(f"  {k}: {{ vb: '{vb}', tile: {repr(tile).replace(chr(39), chr(39)) if tile else 'null'}, fit: {fit}, body: `{body}` }},")
open(OUT, 'w').write('\n'.join(lines) + '\n' + tail + '\n')
print('wrote', OUT)
