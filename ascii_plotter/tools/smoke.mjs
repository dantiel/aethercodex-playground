// smoke.mjs — Node-Smoke-Test für die Engine (ohne Browser).
// Aufruf: node tools/smoke.mjs
// Prüft: Kreis-Fitting, Bogen-Emission (G2/G3), Einzelstrich-Pixelfont,
//        Breiten-Normalisierung (Z-Druck + Feed), Kein-Dwell-Invariante;
//        schreibt samples/hello_world.gcode.
import { readFileSync, writeFileSync } from 'fs';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function load(name) {
  const code = readFileSync(join(root, 'assets', 'js', name), 'utf-8');
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(code, ctx);
  return ctx.window;
}

const StrokeFont = load('strokefont.js').StrokeFont;
const AsciiPlotter = load('core.js').AsciiPlotter;

let failures = 0;
function check(label, ok) {
  console.log((ok ? '  ok  ' : '  FAIL') + ' ' + label);
  if (!ok) failures++;
}

// 1) Kreis-Fitting auf synthetischem Kreis
const pts = [];
for (let i = 0; i < 40; i++) {
  const a = (i / 40) * Math.PI * 1.5;
  pts.push([10 + 10 * Math.cos(a), 5 + 10 * Math.sin(a)]);
}
const fit = StrokeFont._fitCircle(pts);
check('fitCircle: rms < 1e-6', fit && fit.rms < 1e-6);
check('fitCircle: r ≈ 10', fit && Math.abs(fit.r - 10) < 1e-3);

// 2) Polyline → Bögen
const segs = StrokeFont._polylineToSegs(pts, { minArcPts: 6, arcRms: 0.01, minArcSpan: 20 * Math.PI / 180 });
check('polylineToSegs: enthält Bögen (A)', segs.some((s) => s.t === 'A'));

// 3) Einzelstrich-Pixelfont-Layout + GCODE
const font = StrokeFont.builtin();
const params = { cellW: 6, cellH: 8, lift: 3, press: 0.3, zGain: 0.7, feedUp: 2400, feedDown: 600, feedMin: 300, plunge: 400 };
const res = AsciiPlotter.layout('HELLO\nWORLD', font, params, 0.4);
check('Pixelfont: Strokes > 0', res.strokes.length > 0);
check('GCODE: Header G21', /G21/.test(res.gcode));
check('GCODE: Footer M30', /M30/.test(res.gcode));
check('GCODE: kein Dwell (G4)', !/^\s*G4\b/m.test(res.gcode));
check('GCODE: Z-Absenkung negativ (Monoline => press)', /Z-0\.300/.test(res.gcode));
check('GCODE: Parkposition', /X0\.000 Y0\.000/.test(res.gcode));
console.log('       -> Strokes: ' + res.stats.strokes + ', Zeichenweg: ' + res.stats.draw.toFixed(1) +
  ' mm, Eilgang: ' + res.stats.travel.toFixed(1) + ' mm');

// 4) Bogen-GCODE: synthetischer Arc-Font (cw=false → G3 mit I/J)
const arcFont = {
  name: 'arc-test', cellUnits: 8, baselineUnit: 1,
  advance: () => 6,
  strokesFor: () => [[{ t: 'M', x: 0, y: 0 }, { t: 'A', x: 4, y: 4, cx: 4, cy: 0, cw: true }]],
};
const res2 = AsciiPlotter.layout('X', arcFont, params, 0.4);
console.log('       -> arc-gcode: ' + (res2.gcode.match(/(G[23] [^\n]*)/) || ['?'])[0]);
check('Arc-Font: G2/G3-Bogen mit I/J-Offsets (Inhalt→Ursprung normalisiert)',
  /G2 X4\.000 Y0\.000 I4\.000 J0\.000/.test(res2.gcode) ||
  /G[23] X[-\d.]+ Y[-\d.]+ I[-\d.]+ J[-\d.]+/.test(res2.gcode));

// 4b) Breiten-Normalisierung: dünner (w=0) vs. dicker (w=1) Strich → Z + Feed.
const thickFont = {
  name: 'weight-test', cellUnits: 8, baselineUnit: 1,
  advance: () => 6,
  strokesFor: (ch) => ch === 'I'
    ? [[{ t: 'M', x: 0, y: 0, w: 0.4 }, { t: 'L', x: 0, y: 6, w: 0.4 }]]
    : [[{ t: 'M', x: 0, y: 0, w: 1.6 }, { t: 'L', x: 0, y: 6, w: 1.6 }]],
};
const resW = AsciiPlotter.layout('IJ', thickFont, params, 0.4);
check('Gewicht: dünner Strich Z-0.300', /Z-0\.300/.test(resW.gcode));
check('Gewicht: dicker Strich Z-1.000', /Z-1\.000/.test(resW.gcode));
check('Gewicht: Feed-Spreizung (F300 für dick)', /F300\.000/.test(resW.gcode));

// 5) Demo-Art: Ordnung und Volumen
const art = [
  ' _   _      _ _        __        __         _     _ ',
  '| | | | ___| | | ___   \\ \\      / /___  _ __| | __| |',
  '| |_| |/ _ \\ | |/ _ \\   \\ \\ /\\ / / _ \\| \'__| |/ _` |',
  '|  _  |  __/ | | (_) |   \\ V  V / (_) | |  | | (_| |',
  '|_| |_|\\___|_|_|\\___/     \\_/\\_/ \\___/|_|  |_|\\__,_|',
].join('\n');
const res3 = AsciiPlotter.layout(art, StrokeFont.builtin(), params, 0.4);
console.log('       -> Demo-Art Strokes: ' + res3.stats.strokes);
check('Demo-Art: > 100 Strokes', res3.stats.strokes > 100);
check('Demo-Art: travel endlich', isFinite(res3.stats.travel) && res3.stats.travel > 0);

// 6) Neue Engine-Features: Kurvenmodus, Ordnung, Ausrichtung, Abstand.
const resLines = AsciiPlotter.layout('OO', font, { ...params, curveMode: 'lines' }, 0.4);
check('Kurvenmodus Linien: keine G2/G3', !/G[23] /.test(resLines.gcode) && resLines.stats.arcs === 0);

const resMargin = AsciiPlotter.layout('A', font, { ...params, margin: 10 }, 0.4);
check('Margin: Inhalt bei x0=10, y0=10', Math.abs(resMargin.bounds.x0 - 10) < 1e-6 && Math.abs(resMargin.bounds.y0 - 10) < 1e-6);

const resCenter = AsciiPlotter.layout('A', font, { ...params, pageW: 200, pageH: 100, alignX: 'center', alignY: 'middle' }, 0.4);
check('Ausrichtung Mitte: x0 ≈ (200-w)/2', Math.abs(resCenter.bounds.x0 - (200 - resCenter.bounds.w) / 2) < 1e-6);

const resTrack = AsciiPlotter.layout('AB', font, { ...params, letterSpacing: 4 }, 0.4);
check('Zeichenabstand: Breite wächst', resTrack.bounds.w > 12);

const resNeg = AsciiPlotter.layout('AB', font, { ...params, letterSpacing: -2, lineSpacing: -1 }, 0.4);
check('Negativer Zeichen-/Zeilenabstand: erlaubt & endlich', resNeg.bounds.w < resTrack.bounds.w && isFinite(resNeg.bounds.h));

const resSerp = AsciiPlotter.layout('HI', font, { ...params, orderMode: 'serpentine' }, 0.4);
check('Serpentine: erzeugt Striche', resSerp.stats.strokes > 0 && resSerp.stats.travel >= 0);

writeFileSync(join(root, 'samples', 'hello_world.gcode'), res.gcode);
console.log('       -> samples/hello_world.gcode geschrieben (' + res.gcode.length + ' Bytes)');

if (failures) { console.log('\n' + failures + ' Test(s) fehlgeschlagen.'); process.exit(1); }
console.log('\nAlle Smoke-Tests bestanden.');