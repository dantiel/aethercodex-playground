// genfonts.mjs — bündelt die eingebetteten Fonts + erzeugt Monospace-Varianten.
//
// Erzeugt:
//   assets/js/fonts.generated.js   (window.EmbeddedFonts: base64 für opentype.js)
//   assets/css/fonts.css           (@font-face für Textarea/UI-Rendering)
//   assets/fonts/TurretRoad-Mono.ttf  (monospaced Ableitung, via opentype.js)
//
// Grund: file:// lässt kein fetch() zu → opentype.js bekommt die Fonts als
// base64-Daten; CSS lädt sie über relative URLs (funktioniert auch auf file://).
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ot = require('../assets/vendor/opentype.min.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FONT_DIR = join(ROOT, 'assets', 'fonts');

// Manifest — einzige Quelle der Wahrheit (UI + CSS + JS lesen hieraus).
//   mono:    erzwingt Monospace-Layout (feste Advance-Breite)
//   src:     wenn gesetzt, wird `file` aus `src` als Monospace-Ableitung erzeugt
const FONTS = [
  { id: 'syne-mono',        name: 'Syne Mono',        family: 'Syne Mono',        file: 'SyneMono-Regular.ttf',  mono: true,  src: null },
  { id: 'turret-road',      name: 'Turret Road',      family: 'Turret Road',      file: 'TurretRoad-Regular.ttf', mono: false, src: null },
  { id: 'turret-road-mono', name: 'Turret Road Mono', family: 'Turret Road Mono', file: 'TurretRoad-Mono.ttf',    mono: true,  src: 'TurretRoad-Regular.ttf' },
  { id: 'olympia-congress', name: 'Olympia Congress', family: 'Olympia Congress', file: 'OlympiaCongress.ttf',   mono: false, src: null },
  { id: 'olympia-script',   name: 'Olympia Script',   family: 'Olympia Script',   file: 'OlympiaScript.ttf',     mono: false, src: null },
];

/* Monospace-Ableitung: alle Advance-Breiten auf das Maximum druckbarer
 * ASCII-Glyphen setzen → echte Gleichschritt-Ausrichtung in der Textarea. */
function monoify(sourcePath, destPath, name) {
  const buf = readFileSync(sourcePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const font = ot.parse(ab);

  let maxAdv = 0;
  for (let c = 32; c < 127; c++) {
    try {
      const aw = font.charToGlyph(String.fromCharCode(c)).advanceWidth || 0;
      if (aw > maxAdv) maxAdv = aw;
    } catch (e) { /* glyph may not exist */ }
  }
  if (maxAdv <= 0) maxAdv = (font.unitsPerEm || 1000) * 0.6;

  const glyphCount = font.glyphs ? font.glyphs.length : 0;
  for (let i = 0; i < glyphCount; i++) {
    const g = font.glyphs.get(i);
    if (g) g.advanceWidth = maxAdv;
  }
  if (font.advanceWidth !== undefined) font.advanceWidth = maxAdv;
  if (font.names && font.names.fullName) font.names.fullName.en = name;
  if (font.names && font.names.postScriptName) font.names.postScriptName.en = name.replace(/\s+/g, '-');

  writeFileSync(destPath, Buffer.from(font.toArrayBuffer()));
  return maxAdv;
}

/* Abgeleitete Fonts (src) vorab erzeugen. */
for (const f of FONTS) {
  if (!f.src) continue;
  const srcPath = join(FONT_DIR, f.src);
  const dstPath = join(FONT_DIR, f.file);
  if (!existsSync(srcPath)) {
    console.error('Quellfont fehlt:', srcPath);
    process.exit(1);
  }
  const adv = monoify(srcPath, dstPath, f.name);
  console.log('  monoify: ' + f.name + ' → ' + f.file + ' (advance ' + adv + ')');
}

/* Nun: base64-Bündel + @font-face erzeugen. */
const entries = [];
const cssBlocks = [];

for (const f of FONTS) {
  const p = join(FONT_DIR, f.file);
  if (!existsSync(p)) {
    console.error('Font fehlt:', p);
    process.exit(1);
  }
  const b64 = readFileSync(p).toString('base64');
  entries.push({
    id: f.id, name: f.name, family: f.family, mono: f.mono,
    weight: 400, style: 'normal', data: b64,
  });
  cssBlocks.push(
    `@font-face {\n` +
    `  font-family: ${JSON.stringify(f.family)};\n` +
    `  font-style: normal;\n` +
    `  font-weight: 400;\n` +
    `  src: url(${JSON.stringify('../fonts/' + f.file)}) format('truetype');\n` +
    `  font-display: swap;\n` +
    `}\n`
  );
}

const js = '// AUTO-GENERATED from tools/genfonts.mjs — DO NOT EDIT\n' +
  'window.EmbeddedFonts = ' + JSON.stringify(entries) + ';\n';
writeFileSync(join(ROOT, 'assets', 'js', 'fonts.generated.js'), js);

const css = '/* AUTO-GENERATED from tools/genfonts.mjs — DO NOT EDIT */\n' + cssBlocks.join('\n');
writeFileSync(join(ROOT, 'assets', 'css', 'fonts.css'), css);

console.log('✓ ' + FONTS.length + ' Fonts → assets/js/fonts.generated.js + assets/css/fonts.css');
console.log('  ' + FONTS.map((f) => f.name + (f.mono ? ' (mono)' : '')).join(' · '));
