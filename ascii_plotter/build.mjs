// build.mjs — CoffeeHaml → ui.generated.js pre-compiler (Node ESM).
//
// Usage:   node build.mjs
// Reads:   main.chaml
// Writes:  assets/js/ui.generated.js
//
// INVARIANT (critical): this process compiles EXACTLY ONE .chaml and exits.
// CoffeeHaml v0.7.7 leaks global state across multiple compile() calls in a
// single process (verified 2026-09-06) — never loop compile() in-process.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'main.chaml');
const OUT = join(__dirname, 'assets', 'js', 'ui.generated.js');

if (!existsSync(SRC)) {
  console.error('main.chaml not found:', SRC);
  process.exit(1);
}

// Resolve the CoffeeHaml compiler: global npm root first, then canonical path.
let gRoot = '';
try {
  gRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
} catch (e) { /* ignore */ }

const candidates = [
  join(gRoot, 'coffeehaml', 'dist', 'index.js'),
  '/Users/d/Desktop/HOI_KOSMOI/parastaf/CoffeeHAML/dist/index.js',
];

let compile = null;
for (const c of candidates) {
  if (!existsSync(c)) continue;
  try {
    const mod = await import(c);
    if (mod && mod.compile) { compile = mod.compile; break; }
  } catch (e) { /* try next */ }
}
if (!compile) {
  console.error('CoffeeHaml compiler not found. Tried:\n  ' + candidates.join('\n  '));
  process.exit(1);
}

const src = readFileSync(SRC, 'utf-8');
const res = compile(src, {
  filename: 'main.chaml',
  jsxRuntime: './runtime.js',
  wrap: 'component',
});

// Hard-fail on any CoffeeScript-availability warning (raw passthrough risk).
const csWarn = (res.warnings || []).find((w) => /CoffeeScript/.test(w.message || ''));
if (csWarn) {
  console.error('FATAL — CoffeeScript expression compiler unavailable: ' + csWarn.message);
  process.exit(1);
}

if (res.errors && res.errors.length) {
  console.error('CoffeeHaml compile errors:');
  for (const e of res.errors) {
    console.error('  [' + (e.phase || '?') + '] ' + (e.message || e));
  }
  process.exit(1);
}

let code = res.code;

// 1) Strip the ESM import — runtime.js provides jsx/jsxs/Fragment as globals.
code = code.replace(/^import\s*\{[^}]*\}\s*from\s*["'][^"']*["'];\s*\n?/, '');

// 2) Expose the component globally (classic <script>, no modules).
code = code.replace(
  /export\s+default\s+function\s+Component\s*\(props\)/,
  'window.CoffeeHamlApp = function Component(props)'
);

// 3) Leak check — raw CoffeeScript passthrough or React hooks must not survive.
const rawIf = code.match(/\bif\s+[^\n;{}]*\bthen\b/g) || [];
const hooks = code.match(/\buse[A-Z][A-Za-z]*\s*\(/g) || [];
if (rawIf.length || hooks.length) {
  console.error('LEAK CHECK FAILED');
  if (rawIf.length) console.error('  raw CoffeeScript if/then:', rawIf);
  if (hooks.length) console.error('  React hooks:', hooks);
  process.exit(1);
}

const out = '// AUTO-GENERATED from main.chaml by build.mjs — DO NOT EDIT\n' + code + '\n';
writeFileSync(OUT, out);
console.log(
  '✓ main.chaml → assets/js/ui.generated.js  (' +
  code.length + ' bytes, ' + code.split('\n').length + ' lines)'
);
