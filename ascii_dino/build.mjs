// build.mjs — compiles CoffeeScript sources (bare) and concatenates them into
// the two runtime bundles. Art lives as plain text (src/art.txt) so backslashes
// and quotes never need escaping — it is embedded via JSON.stringify.
//
//   node build.mjs   ->   dist/terminal.js + dist/browser.js
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'src');
const DIST = join(__dirname, 'dist');
mkdirSync(DIST, { recursive: true });

const art = readFileSync(join(SRC, 'art.txt'), 'utf8');
const artJs = `(function(root){ root.DINO.ART = ${JSON.stringify(art)}; })(typeof globalThis!=='undefined'?globalThis:window);\n`;

const coffee = (name) =>
  execSync(`coffee -b -p "${join(SRC, name)}"`, { encoding: 'utf8' });

const bootstrap = coffee('bootstrap.coffee');
const core = coffee('core.coffee');
const terminal = coffee('render_terminal.coffee');
const browser = coffee('render_browser.coffee');

const terminalBundle = bootstrap + '\n' + artJs + '\n' + core + '\n' + terminal;
const browserBundle = bootstrap + '\n' + artJs + '\n' + core + '\n' + browser;

writeFileSync(join(DIST, 'terminal.js'), terminalBundle);
writeFileSync(join(DIST, 'browser.js'), browserBundle);
console.log('Built dist/terminal.js and dist/browser.js');
