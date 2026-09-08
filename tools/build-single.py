#!/usr/bin/env python3
"""Inlines the whole app into one kunwari.html you can double-click.

No server, no install: the page never fetches anything, so file:// is enough.
"""
import os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'kunwari.html')

html = open(os.path.join(ROOT, 'index.html')).read()


def read(rel):
    body = open(os.path.join(ROOT, rel)).read()
    if '</script' in body.lower():
        raise SystemExit(f'{rel} contains a script end-tag; inlining would break the page')
    return body


html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
              lambda m: '<style>\n' + read(m.group(1)) + '</style>', html)
html = re.sub(r'<script src="([^"]+)"></script>',
              lambda m: '<script>\n' + read(m.group(1)) + '</script>', html)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w').write(html)
print(f'{OUT}  ({len(html) / 1024:.0f} KB)')
