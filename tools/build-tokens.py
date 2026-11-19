#!/usr/bin/env python3
"""Generate tokens.json (W3C Design Tokens Community Group format) from css/tokens.css.

tokens.css is the single source of truth. Run after editing it:
    python3 tools/build-tokens.py
"""
import json, re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
css = (root / 'css' / 'tokens.css').read_text()
block = css[css.index(':root {'):css.index('@media (prefers-reduced-motion')]
decls = re.findall(r'--([a-z0-9-]+):\s*([^;]+);(?:\s*/\*\s*(.*?)\s*\*/)?', block)

TYPE = [('color', 'color'), ('ref-denim', 'color'), ('ref-slate', 'color'), ('ref-thread', 'color'), ('ref-red', 'color'),
        ('ref-amber', 'color'), ('ref-green', 'color'), ('ref-shopee', 'color'), ('ref-tokopedia', 'color'),
        ('ref-size', 'dimension'), ('space', 'dimension'), ('radius', 'dimension'), ('font-size', 'dimension'),
        ('line-height', 'dimension'), ('letter-spacing', 'dimension'), ('font-weight', 'fontWeight'), ('font-family', 'fontFamily'),
        ('elevation', 'shadow'), ('focus-ring', 'shadow'), ('motion-duration', 'duration'), ('motion-ease', 'cubicBezier'),
        ('layout', 'dimension'), ('z', 'number'), ('button', 'dimension'), ('input', 'dimension'), ('panel', 'dimension'),
        ('table', 'dimension'), ('cell', 'dimension'), ('nav', 'dimension'), ('toast', 'dimension')]

def tier(name):
    if name.startswith('ref-'): return 'reference'
    if name.split('-')[0] in ('button', 'input', 'panel', 'table', 'cell', 'nav', 'toast'): return 'component'
    return 'semantic'

def path(name):
    parts = name.split('-')
    if parts[0] == 'ref': parts = ['ref'] + parts[1:]
    return parts

def value(v):
    v = v.strip()
    m = re.fullmatch(r'var\(--([a-z0-9-]+)\)', v)
    if m: return '{' + '.'.join(path(m.group(1))) + '}'
    return v

out = {}
for name, val, note in decls:
    t = next((ty for pre, ty in TYPE if name == pre or name.startswith(pre + '-')), 'string')
    node = out
    p = path(name)
    for k in p[:-1]:
        node = node.setdefault(k, {})
        if '$value' in node:  # a token is also a group prefix (e.g. layout-sidebar vs layout-sidebar-width)
            node = node.setdefault('_', {})
    leaf = {'$value': value(val), '$type': t, '$extensions': {'fluxora.tier': tier(name), 'css': '--' + name}}
    if note: leaf['$description'] = note
    node[p[-1]] = leaf

(root / 'tokens.json').write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n')
counts = {}
for n, _, _ in decls: counts[tier(n)] = counts.get(tier(n), 0) + 1
print('tokens.json written:', len(decls), 'tokens', counts)
