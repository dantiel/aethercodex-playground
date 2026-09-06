# API-Referenz — ASCII Art Plotter

Alle öffentlichen Symbole hängen am globalen `window` (klassische `<script>`-Kaskade, keine ES-Module). Lade-Reihenfolge ist verbindlich:

```
react → react-dom → opentype → runtime.js → strokefont.js → core.js → ui.generated.js → main.js
```

## Globale API-Oberfläche

| Symbol | Quelle | Beschreibung |
| --- | --- | --- |
| `window.StrokeFont.builtin()` | strokefont.js | Eingebauter 5×7-Pixelfont |
| `window.StrokeFont.fromOpentype(font, opts)` | strokefont.js | TTF/OTF → Font-Objekt |
| `window.StrokeFont._fitCircle(pts)` | strokefont.js | Testhelfer: algebraischer Kreis-Fit |
| `window.StrokeFont._polylineToSegs(pts, opts)` | strokefont.js | Testhelfer: Polyline → Segmente |
| `window.StrokeFont._zhangSuen(bits, w, h)` | strokefont.js | Testhelfer: Zhang-Suen-Thinning |
| `window.StrokeFont._traceSkeleton(bits, dist, w, h)` | strokefont.js | Testhelfer: Achsen-Tracing |
| `window.StrokeFont._chamferDistance(bits, w, h)` | strokefont.js | Testhelfer: Distanztransformation |
| `window.AsciiPlotter.layout(text, font, params, penWidth)` | core.js | Kern-Pipeline: Text → GCODE |
| `window.AsciiPlotter._nearestNeighbor(strokes)` | core.js | Testhelfer: Wege-Optimierung |
| `window.CoffeeHamlApp` | ui.generated.js | Vorkompilierte React-Komponente (aus `main.chaml`) |
| `window.jsx` / `window.jsxs` / `window.Fragment` | runtime.js | jsx-runtime-Shim für die Komponente |

---

## Font-Interface

`layout()` erwartet ein Font-Objekt mit folgender Form:

```js
{
  name:         string,   // Anzeigename (z.B. 'Builtin Pixel 5×7')
  cellUnits:    number,   // Zellhöhe in Glypheneinheiten (> 0)
  baselineUnit: number,   // Baseline-Abstand über dem Zellboden (in Glypheneinheiten)
  advance(ch):  number,   // Vorrücken in Glypheneinheiten (Monospace-Raster)
  strokesFor(ch): array   // Konturen des Zeichens → siehe Segment-Modell
}
```

- `cellUnits` steuert die Skalierung: `scale = cellH / cellUnits`.
- `advance` wird zur Zentrierung im Raster verwendet: `ox = col·cellW + (cellW − advance·scale)/2`.
- `baselineUnit` verschiebt die Glyphe vertikal: `oy = row·cellH + (cellUnits − baselineUnit)·scale`.
- Unbekannte Zeichen fallen auf `?` zurück (im Pixelfont) bzw. liefern `[]` (opentype).

### `StrokeFont.builtin()`

Offline-Pixelfont, 5×7-Raster, **Einzelstrich** via Skeletonisierung (Mittelachse statt Outline): Bitmap → Chamfer-Distanz → Zhang-Suen-Thinning → Achsen-Tracing mit topologischem Grad (verhindert Schein-Knoten an T-Verbindungen). `cellUnits: 8`, `baselineUnit: 1`, `advance: 6`. Deckt A–Z, 0–9 und gängige ASCII-Sonderzeichen ab. Enthält Ecken **und** Rundungen (Kreis-Fitting).

### `StrokeFont.fromOpentype(font, opts)`

TTF/OTF via opentype.js. `font` ist das Ergebnis von `opentype.parse(arrayBuffer)`.

Optionen (alle optional):

| Option | Default | Bedeutung |
| --- | --- | --- |
| `flattenTol` | `upem / 2000` | Bézier-Flattening-Toleranz (kleiner = mehr Punkte) |
| `arcRms` | `upem * 0.004` | RMS-Grenze fürs Kreis-Fitting (kleiner = weniger Bögen) |
| `skeletonRes` | `64` | Raster-Höhe in px für die Skeletonisierung |

Pipeline: Bézier-Konturen flachen → Rasterung (even-odd, `skeletonRes` px hoch) → Chamfer-Distanz → Zhang-Suen-Thinning → Achsen-Tracing → RDP → Kreis-Fitting (Kasa) für Rundungen. Jeder Achsenpunkt trägt die lokale Strichbreite (`w`). `cellUnits: upem`, `baselineUnit: upem·0.22`.

---

## Segment-Modell

`strokesFor(ch)` liefert ein Array von **Konturen**. Jede Kontur ist ein Array von Segmenten im **Glyphenraum (y-up)**:

```js
{ t: 'M', x, y, w }                 // move to (Konturstart), w = lokale Strichbreite
{ t: 'L', x, y, w }                 // line to (Ecke)
{ t: 'A', x, y, cx, cy, cw, w }     // arc to (Rundung): cx/cy = Mittelpunkt, cw = visuelle Drehrichtung
```

- `w` ist die **lokale Strichbreite** (Glypheneinheiten) — Treiber für Z-Druck und Feed.
- `cw` ist die **visuelle** Drehrichtung, invariant unter Y-Spiegelung.
- In `core.js` wird die Glyphe skaliert und y-gespiegelt (Glyphen-y-up → Welt-y-down). Scharfe Ecken (>150° Richtungswechsel, `CORNER_SPLIT_DEG`) spalten die Kontur in separate Strokes.

---

## `AsciiPlotter.layout(text, font, params, penWidth)`

Vollständige Pipeline. Rückgabe:

```js
{
  strokes: stroke[],   // geordnete Welt-Strokes (mm, y-down)
  gcode:   string,     // fertiger GCODE
  stats: {
    strokes: number,   // Stroke-Anzahl
    lifts:   number,   // Pen-Up-Anzahl (= Stroke-Anzahl)
    draw:    number,   // Zeichenweg in mm (Summe der Stroke-Längen)
    travel:  number,   // Pen-Up-Weg in mm (Nächster-Nachbar)
    zDown:   number,   // berechnete Z-Absenkung (negativ)
  },
  bounds: { x0, y0, x1, y1, w, h },   // Bounding-Box in mm
}
```

Ein **Stroke** hat die Form:

```js
{ start: [x, y], end: [x, y], segs: segment[] }
```

`segs` enthält nur `{t:'L'|'A', x, y, ...}`-Segmente (das `M` wurde in `start` aufgelöst).

### Parameter

| Param | Default | Bereich | Bedeutung |
| --- | --- | --- | --- |
| **Maße & Layout** | | | |
| `cellW` | `6` | > 0 | Zeichenbreite in mm |
| `cellH` | `8` | > 0 | Schriftgröße (Zellhöhe) in mm |
| `letterSpacing` | `0` | ≥ 0 | Zusätzlicher Zeichenabstand (mm) |
| `lineSpacing` | `0` | ≥ 0 | Zusätzlicher Zeilenabstand (mm) |
| `margin` | `0` | ≥ 0 | Rand ums Motiv (mm) |
| `pageW` / `pageH` | `0` | ≥ 0 | Arbeitsfläche (mm); `0` = auto (Inhalt + 2×Margin) |
| `alignX` | `'left'` | left/center/right | Horizontale Ausrichtung in der Arbeitsfläche |
| `alignY` | `'top'` | top/middle/bottom | Vertikale Ausrichtung in der Arbeitsfläche |
| `minStrokeLen` | `0.05` | ≥ 0 | Mindest-Strichlänge (kürzere werden entfernt) |
| **Linienführung** | | | |
| `curveMode` | `'arcs'` | arcs/lines | `arcs` = G2/G3; `lines` = alles als G1-Polygon |
| `cornerSplitDeg` | `150` | [30, 179] | Ecken schärfer als dieser Winkel werden gesplittet |
| `minArcRadius` | `0` | ≥ 0 | Bögen unter diesem Radius → Linien (auch bei `arcs`) |
| `arcChordErr` | `0.02` | > 0 | Sagitta-Toleranz beim Bögen-Flatten (mm) |
| **Stift & Feed** | | | |
| `lift` | `3` | [0.1, 50] | Hubhöhe (pen up, Z positiv) |
| `press` | `0.3` | > 0 | Press-Tiefe des Stifts (dünnster Strich) |
| `zGain` | `0.7` | ≥ 0 | Z-Gain: zusätzliche Tiefe für dickste Striche (mm/Gewicht) |
| `feedUp` | `2400` | > 0 | Eilgang pen-up (mm/min) |
| `feedDown` | `600` | > 0 | Zeichnen dünn (mm/min) |
| `feedMin` | `300` | > 0 | Zeichnen dick (mm/min) |
| `plunge` | `400` | > 0 | Z-Tauchen (mm/min) |
| **Strategie** | | | |
| `orderMode` | `'nearest'` | nearest/rows/serpentine | Weg-Ordnung: nächster Nachbar / Reihen / Zickzack |
| `dedupeEps` | `0.01` | > 0 | Quantisierungs-Raster fürs Dedupe (mm) |
| `penWidth` (Argument) | `0.4` | > 0 | Aktuelle Stiftbreite (mm) |

**Sanitization**: numerische Parameter werden per `pos(v, dflt)` (> 0) bzw. `nneg(v, dflt)` (≥ 0) erzwungen. Damit sind negative/NaN-Werte auf API-Ebene unmöglich — kein `FEED ≤ 0`, kein `NaN` im GCODE.

### Strichbreite via Druck + Geschwindigkeit

Jeder Einzelstrich-Punkt trägt eine lokale Breite, die global normalisiert wird: dünnster Strich des Motivs → Gewicht `w = 0`, dickster → `w = 1` (monoline Fonts wie der Pixelfont → überall `0`).

```
zDown(w) = -clamp(press + w × zGain, 0.05, 4)           // tiefer = breiter
feed(w)  = feedDown − w × (feedDown − feedMin)          // langsamer = breiter
```

Der Filzstift wird für dicke Striche tiefer gedrückt **und** langsamer geführt (mehr Tinte). **Kein** paralleler Füllstrich, kein Dwell (`G4`).

---

## GCODE-Detail

Header-Kommentar + `G21` (mm) + `G90` (absolut). Pro Stroke:

```
G0 X{sx} Y{-sy} F{feedUp}     ; pen up, Eilgang
G1 Z{zDown} F{plunge}         ; Stift absenken (Breite via Z)
G1 X.. Y.. F{feedDown}        ; Linie (L-Segment)
G2/G3 X.. Y.. I.. J.. F..     ; Bogen (A-Segment)
G0 Z{lift}                    ; Stift anheben
```

Footer: `G0 X0 Y0` (Park) + `M30` (Ende).

**Bogen-Regeln**:

- `cw === true` → `G2`, sonst `G3`.
- `I/J` sind Mittelpunkts-Offsets relativ zum aktuellen Punkt: `I = cx − curX`, `J = -cy − curY`.
- **Degenerierte Bögen** (Radius 0, NaN-Zentrum): werden als `G1`-Linie emittiert — viele Controller verweigern `I0 J0`.
- Bögen werden beim Fitting bereits in Teilbögen **≤ 180°** gesplittet (Controller nehmen sonst den kurzen Weg).

**Formatierung**: `f3()` rundet auf 3 Dezimalstellen, `NaN`/`Infinity` werden auf `0` gesetzt — GCODE enthält nie `NaN`.

---

## React-Komponente (`CoffeeHamlApp`)

Aus `main.chaml` vorkompiliert. Props (werden von `main.js` geliefert):

```js
{
  text, pens, penIdx, params, fontName, gcode, statsLine, zoomLabel,
  onText, loadDemo, clearText, useBuiltin, onFont, onPen,
  onNum, onNum0, onSelect, onToggle, download,
  zoomIn, zoomOut, zoomFit
}
```

`onNum` erzwingt `> 0`, `onNum0` erlaubt `0` (für Margin, Abstände, `pageW/pageH` …).

`main.js` ruft `ReactDOM.render(React.createElement(window.CoffeeHamlApp, viewProps()), root)` und zeichnet anschließend die Canvas-Vorschau.

---

## Koordinatensysteme

| Raum | X | Y | Verwendung |
| --- | --- | --- | --- |
| Glyphenraum | rechts | **up** | `strokesFor()`-Segmente |
| Weltraum | rechts | **down** (Canvas) | `layout()`-Strokes |
| GCODE | rechts | **up** | `Y = −Welt-Y` beim Schreiben |

Die `cw`-Drehrichtung ist unter der Y-Spiegelung invariant — sie wird in `reverseStroke()` explizit negiert (`cw: !o.cw`), damit die visuelle Richtung beim Stroke-Reversal erhalten bleibt.