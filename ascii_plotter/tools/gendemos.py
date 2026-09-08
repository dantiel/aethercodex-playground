#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gendemos — erzeugt assets/js/demos.js aus tools/demos.txt.

Format von demos.txt: Jede Demo beginnt mit einer Zeile `### Name`,
gefolgt von den rohen Kunst-Zeilen (Backslashes/Backticks/Quotes wörtlich).
Aufruf:  python3 tools/gendemos.py
"""
import json

def tpl(s):
    # JS-Template-Literal: nur Backslash, Backtick und ${ müssen escaped werden.
    s = s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    return '`' + s + '`'

def load(path):
    demos = []
    cur_name = None
    cur_lines = []
    with open(path, 'r', encoding='utf-8') as f:
        for line in f.read().split('\n'):
            if line.startswith('### '):
                if cur_name is not None:
                    demos.append((cur_name, '\n'.join(cur_lines).rstrip('\n')))
                cur_name = line[4:]
                cur_lines = []
            else:
                cur_lines.append(line)
    if cur_name is not None:
        demos.append((cur_name, '\n'.join(cur_lines).rstrip('\n')))
    return demos

demos = load('tools/demos.txt')

out = [
    '/* demos.js — automatisch generiert von tools/gendemos.py. */',
    '/* Regeneration:  python3 tools/gendemos.py */',
    'window.PlotterDemos = [',
]
for name, art in demos:
    out.append('  { name: %s, text: %s },' % (json.dumps(name), tpl(art)))
out.append('];')

with open('assets/js/demos.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out) + '\n')

print('OK: %d Demos -> assets/js/demos.js' % len(demos))
