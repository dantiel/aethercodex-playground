# Deployment & Fehlerdiagnose — ASCII Art Plotter

## Deployment

**Kein Build-Server, kein Backend.** Die App ist rein statisch und läuft per `file://`.

Voraussetzungen für die Auslieferung:

1. `assets/js/ui.generated.js` muss existieren (einmalig erzeugt via `node build.mjs`).
2. Die Skript-Kaskade in `index.html` darf nicht verändert werden — die Reihenfolge ist verbindlich (React vor `runtime.js`, `core.js` vor `main.js`).
3. `assets/vendor/` enthält die minifizierten Bundles (React, ReactDOM, opentype.js).

Ausliefern = den Ordner `ascii_plotter/` kopieren und `index.html` im Browser öffnen. Kein HTTP-Server nötig.

### Browser-Anforderung

- Moderner Browser mit `<canvas>`, `File.arrayBuffer()`, `Blob`/`URL.createObjectURL`.
- **Keine ES-Module zur Laufzeit** — deshalb funktioniert `file://` ohne CORS-Fehler.

---

## Build-Pipeline (CoffeeHaml)

```
node build.mjs     # main.chaml → assets/js/ui.generated.js
```

Ablauf: `main.chaml` wird mit dem CoffeeHaml-Compiler (global `npm i -g coffeehaml`, bzw. kanonischer Pfad in `build.mjs`) zu einer React-Komponente kompiliert, die als `window.CoffeeHamlApp` exponiert wird.

### ❌ `CoffeeHaml compiler not found`

Der Compiler ist weder global (`npm root -g`/coffeehaml/dist/index.js) noch am kanonischen Pfad auffindbar.

**Lösung:** `npm install -g coffeehaml` — oder den Pfad in `build.mjs` (`candidates`-Array) anpassen.

### ❌ `FATAL — CoffeeScript expression compiler unavailable`

CoffeeHaml konnte die CoffeeScript-Ausdrücke in `main.chaml` nicht kompilieren (Rohdurchreichung wäre kaputt). **Lösung:** CoffeeScript-Verfügbarkeit im Compiler prüfen; die Ausdrücke in `main.chaml` vereinfachen (keine komplexen CoffeeScript-Konstrukte in Attributen).

### ❌ `LEAK CHECK FAILED`

`build.mjs` erkennt rohes CoffeeScript (`if … then`) oder React-Hooks im generierten Code. **Lösung:** CoffeeHaml-Ausdrücke in `main.chaml` über `props.*`-Handler statt Logik im Markup.

### ⚠️ CoffeeHaml leakt globalen State

Der Compiler behält Zustand über mehrere `compile()`-Aufrufe in einem Prozess. Deshalb kompiliert `build.mjs` **genau eine** Datei und beendet sich — nie mehrere `.chaml` in einer Schleife kompilieren.

---

## Laufzeit-Fehler

### ❌ Canvas leer / UI lädt nicht

1. Konsole öffnen (Cmd+Alt+I). Fehlende Skripte deuten auf falsche Kaskaden-Reihenfolge in `index.html`.
2. `node tools/smoke.mjs` ausführen — läuft die Engine in Node, ist das Problem UI-seitig.
3. `assets/js/ui.generated.js` prüfen — fehlt sie, `node build.mjs` ausführen.

### ❌ `opentype.js fehlt` beim Font-Import

Das opentype-Bundle wurde nicht geladen. Skript-Kaskade in `index.html` prüfen: `<script src="assets/vendor/opentype.min.js">` muss **vor** `main.js` stehen.

### ❌ Font-Import schlägt fehl (Alert)

Ungültige/defekte Datei, oder kein TTF/OTF. `opentype.parse()` wirft eine Exception → `main.js` zeigt eine Alert-Meldung. **Hinweis:** nur `.ttf`/`.otf` werden akzeptiert (kein WOFF/WOFF2/SVG).

### ⚠️ `Eingabe auf 6000 Zeichen gekürzt`

Bewusster DoS-Schutz (`MAX_TEXT = 6000` in `main.js`). 6000 Zeichen decken jedes realistische Shirt-Motiv (≈100×60-Raster) ab; darüber blockiert die Engine den Browser (30k Zeichen ≈ 12 s / 41 MB GCODE, gemessen).

### ⚠️ Eingaben mit Sonderzeichen

Nicht abgedeckte Zeichen fallen auf `?` zurück (Pixelfont) bzw. erzeugen keine Strokes (opentype). Tabs und Leerzeichen werden übersprungen.

---

## GCODE-Controller-Probleme

### Bögen werden falsch gezeichnet (>180°)

Viele Controller nehmen bei `I/J`-Bögen > 180° fälschlich den kurzen Weg. Die Engine splittet Bögen bereits in Teilbögen **≤ 180°** — tritt trotzdem ein Problem auf, die `minArcSpan`/`arcRms`-Parameter beim Font-Bau anpassen.

### `I0 J0`-Bögen abgelehnt

Degenerierte Bögen (Radius 0, NaN-Zentrum) werden intern als `G1`-Linie emittiert — Controller, die `I0 J0` verweigern, sind damit abgedeckt.

### Kein `G4` (Dwell) im Output — Absicht!

Der Filzstift würde bei Verweildauer durchbluten. Es gibt bewusst **keine** Dwell-Befehle. Falls der Controller Z-Tauchen zu schnell fährt, `plunge`-Parameter senken (nicht per Dwell warten).

---

## Sicherheit & Invarianten

- **Keine gefährlichen Sinks** zur Laufzeit: kein `innerHTML`, `eval`, `document.write`, `fetch`, `localStorage`.
- **XSS-sicher**: React-`jsx()` escaped allen User-Text; GCODE ist numerisch — User-Text gelangt nie unescaped in den GCODE-String.
- **NaN-sicher**: `f3()` setzt nicht-finite Werte auf `0`; Dedupe entfernt Strokes mit NaN-Geometrie und nicht-finiten Bogenzentren.
- **Keine Prototype-Pollution**: Spatial-Hash-/Dedupe-Keys sind geprefixt (`x,y`-Strings bzw. `t:x,y`-Quantisierung).

---

## Lessons Learned (aus der Transformation)

1. **`file://` erzwingt klassische Scripts.** ES-Module scheitern an Chrome-CORS beim Doppelklick-Öffnen — deshalb die `<script>`-Kaskade und der jsx-runtime-Shim statt `import`.
2. **CoffeeHaml leakt State pro Prozess.** Genau eine `compile()` pro `node build.mjs`-Aufruf.
3. **Kreis-Fitting mit Fenster-Wachstum** (Verdopplung + Bisektion) statt `+1`-Iteration: O(log n) Fits statt O(n) — entscheidend für lange glatte Läufe.
4. **Nächster-Nachbar mit Spatial Hash** statt O(n²): identische Auswahlqualität (immer nächster unbesuchter Endpunkt), aber linear für flächige Layouts.
5. **Breite über Z, nicht über Füllstriche.** Ein Stroke pro Linie; die Material-Eigenschaft des Filzstifts (Ausbreitung bei Druck) wird in `zGain` gekapselt.
