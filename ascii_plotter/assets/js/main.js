/* main.js — Bootstrap: State, Handler, hochauflösende Zoom-Vorschau, Download.
 *
 * Rendering: ReactDOM.render(CoffeeHamlApp(props)) — die von build.mjs aus
 * main.chaml kompilierte Komponente hängt als window.CoffeeHamlApp.
 */
(function () {
  'use strict';

  var DEMO_TEXT = [
    ' _   _      _ _        __        __         _     _ ',
    '| | | | ___| | | ___   \\ \\      / /___  _ __| | __| |',
    '| |_| |/ _ \\ | |/ _ \\   \\ \\ /\\ / / _ \\| \'__| |/ _` |',
    '|  _  |  __/ | | (_) |   \\ V  V / (_) | |  | | (_| |',
    '|_| |_|\\___|_|_|\\___/     \\_/\\_/ \\___/|_|  |_|\\__,_|',
  ].join('\n');

  var builtinFont = window.StrokeFont.builtin();

  /* Eingebettete Fonts (assets/js/fonts.generated.js → window.EmbeddedFonts). */
  var embeddedFonts = (window.EmbeddedFonts || []).slice();
  var embeddedById = {};
  var fontCache = {};
  embeddedFonts.forEach(function (e) { embeddedById[e.id] = e; });

  var MONO_STACK = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

  function base64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function loadEmbeddedFont(entry) {
    if (!entry) return builtinFont;
    if (fontCache[entry.id]) return fontCache[entry.id];
    var bytes = base64ToBytes(entry.data);
    var font = window.opentype.parse(bytes.buffer);
    var sf = window.StrokeFont.fromOpentype(font, {
      name: entry.name,
      mono: !!entry.mono,
      skeletonRes: 96,
    });
    fontCache[entry.id] = sf;
    return sf;
  }

  /* DoS-Schutz: 6000 Zeichen decken jedes realistische Shirt-Motiv. */
  var MAX_TEXT = 6000;

  var MIN_ZOOM = 0.05, MAX_ZOOM = 400;

  var state = {
    text: DEMO_TEXT,
    font: builtinFont,
    fontKey: 'builtin',
    fontFamily: MONO_STACK,
    customFont: null,
    hasCustomFont: false,
    editor: { fontSizePx: 14, lineHeight: 1.45 },
    pens: [
      { name: 'Fein 0.4 mm (schwarz)', width: 0.4, color: '#20201f' },
      { name: 'Mittel 0.8 mm (rot)', width: 0.8, color: '#c0392b' },
      { name: 'Fett 1.2 mm (blau)', width: 1.2, color: '#1f4e9c' },
    ],
    penIdx: 0,
    params: {
      /* Maße & Layout */
      cellW: 6, cellH: 8, letterSpacing: 0, lineSpacing: 0,
      margin: 0, pageW: 0, pageH: 0, alignX: 'left', alignY: 'top',
      /* Linienführung */
      cornerSplitDeg: 150, curveMode: 'arcs', minArcRadius: 0, arcChordErr: 0.02,
      /* Stift & Feed */
      lift: 3, press: 0.3, zGain: 0.7,
      feedUp: 2400, feedDown: 600, feedMin: 300, plunge: 400,
      /* Strategie */
      orderMode: 'nearest', dedupeEps: 0.01, minStrokeLen: 0.05,
    },
    result: null,
    view: { zoom: 1, px: 0, py: 0, fit: null },
  };

  function rebuild() {
    var pen = state.pens[state.penIdx];
    var t = state.text;
    state.truncated = t.length > MAX_TEXT;
    if (state.truncated) t = t.slice(0, MAX_TEXT);
    state.result = window.AsciiPlotter.layout(t, state.font, state.params, pen.width);
  }

  function statsLine(res) {
    var s = res.stats, b = res.bounds;
    var pen = state.pens[state.penIdx];
    var zMin = state.params.press.toFixed(2);
    var zMax = (state.params.press + state.params.zGain).toFixed(2);
    var mode = state.params.curveMode === 'lines' ? 'Linien (G1)' : 'Bögen (G2/G3)';
    return (state.truncated ? '⚠ Eingabe auf ' + MAX_TEXT + ' Zeichen gekürzt · ' : '') +
      s.strokes + ' Einzelstriche · ' + s.arcs + ' Bögen · ' + mode + ' · ' +
      s.lifts + ' Pen-Ups · Zeichenweg ' + s.draw.toFixed(0) + ' mm · Eilgang ' +
      s.travel.toFixed(0) + ' mm · Fläche ' + b.w.toFixed(0) + ' × ' + b.h.toFixed(0) +
      ' mm · Druck ' + zMin + '–' + zMax + ' mm (' + pen.name + ')';
  }

  /* ------------------------------- Handler -------------------------------- */

  var rebuildTimer = null;
  function scheduleRebuild() {
    rebuild();
    refresh();
  }
  function onText(e) {
    state.text = e.target.value;
    if (rebuildTimer) return;                 /* bündeln: letzter Tastendruck gewinnt */
    rebuildTimer = setTimeout(function () {
      rebuildTimer = null;
      rebuild();
      refresh();
    }, 120);
  }
  function loadDemo() { state.text = DEMO_TEXT; rebuild(); refresh(); }
  function clearText() { state.text = ''; rebuild(); refresh(); }
  function applyFont(font, key, family) {
    state.font = font;
    state.fontKey = key;
    state.fontFamily = family;
    rebuild();
    refresh();
  }

  function onFontSelect(e) {
    var key = e.target.value;
    if (key === 'builtin') {
      applyFont(builtinFont, 'builtin', MONO_STACK);
    } else if (key === 'custom') {
      if (state.customFont) applyFont(state.customFont, 'custom', state.fontFamily);
    } else {
      var entry = embeddedById[key];
      if (entry) applyFont(loadEmbeddedFont(entry), key, '"' + entry.family + '", ' + MONO_STACK);
    }
  }

  function onEditorNum(key) {
    return function (e) {
      var v = parseFloat(e.target.value);
      if (isFinite(v) && v > 0) { state.editor[key] = v; refresh(); }
    };
  }

  function onNum(key) {
    return function (e) {
      var v = parseFloat(e.target.value);
      if (isFinite(v) && v > 0) { state.params[key] = v; scheduleRebuild(); }
    };
  }
  /* Für Felder, die 0 erlauben (margin, spacing, pageW/pageH, minArcRadius …). */
  function onNum0(key) {
    return function (e) {
      var v = parseFloat(e.target.value);
      if (isFinite(v) && v >= 0) { state.params[key] = v; scheduleRebuild(); }
    };
  }
  /* Für Felder, die negative Werte erlauben (letterSpacing, lineSpacing …). */
  function onNumS(key) {
    return function (e) {
      var v = parseFloat(e.target.value);
      if (isFinite(v)) { state.params[key] = v; scheduleRebuild(); }
    };
  }
  function onSelect(key) {
    return function (e) { state.params[key] = e.target.value; scheduleRebuild(); };
  }
  function onToggle(key) {
    return function (e) { state.params[key] = !!e.target.checked; scheduleRebuild(); };
  }

  function onPen(e) {
    var idx = parseInt(e.target.value, 10);
    if (isFinite(idx) && state.pens[idx]) { state.penIdx = idx; rebuild(); refresh(); }
  }

  function onFont(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!window.opentype) {
      window.alert('opentype.js fehlt — Skript-Kaskade in index.html prüfen.');
      return;
    }
    file.arrayBuffer().then(function (buf) {
      var font = window.opentype.parse(buf);
      var sf = window.StrokeFont.fromOpentype(font, {
        skeletonRes: state.params.skeletonRes || 96,
      });
      state.customFont = sf;
      state.hasCustomFont = true;
      applyFont(sf, 'custom', MONO_STACK);
    }).catch(function (err) {
      window.alert('Font konnte nicht geladen werden: ' + (err && err.message ? err.message : err));
    });
    e.target.value = '';
  }

  function download() {
    if (!state.result || !state.result.gcode) return;
    var blob = new Blob([state.result.gcode], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ascii_plotter.gcode';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* --------------------------- Canvas-Vorschau ----------------------------- */

  function computeFit() {
    var canvas = document.getElementById('preview');
    var W = canvas ? canvas.clientWidth : 900;
    var H = canvas ? canvas.clientHeight : 600;
    if (W < 10) W = 900; if (H < 10) H = 600;
    var res = state.result;
    var b = (res && res.strokes.length) ? res.bounds : { x0: 0, y0: 0, w: 1, h: 1 };
    var pad = 28;
    var base = Math.min(
      (W - 2 * pad) / Math.max(b.w, 0.001),
      (H - 2 * pad) / Math.max(b.h, 0.001)
    );
    base = Math.max(base, 1e-6);
    return { base: base, b: b, W: W, H: H };
  }

  function zoomFit() {
    var f = computeFit();
    state.view.zoom = 1;
    state.view.px = (f.W - f.b.w * f.base) / 2;
    state.view.py = (f.H - f.b.h * f.base) / 2;
    drawPreview();
  }

  function zoomAt(mx, my, factor) {
    var f = state.view.fit || computeFit();
    var oldZoom = state.view.zoom;
    var newZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);
    factor = newZoom / oldZoom;
    var wx = (mx - state.view.px) / (f.base * oldZoom);
    var wy = (my - state.view.py) / (f.base * oldZoom);
    state.view.zoom = newZoom;
    state.view.px = mx - wx * f.base * newZoom;
    state.view.py = my - wy * f.base * newZoom;
    drawPreview();
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function onWheel(e) {
    e.preventDefault();
    var rect = e.currentTarget.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0016));
  }

  function bindPreview() {
    var canvas = document.getElementById('preview');
    if (!canvas || canvas.dataset.bound) return;
    canvas.dataset.bound = '1';
    canvas.addEventListener('wheel', onWheel, { passive: false });
    var dragging = null;
    canvas.addEventListener('pointerdown', function (e) {
      dragging = { x: e.clientX, y: e.clientY, moved: false };
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
      state.view.px += dx;
      state.view.py += dy;
      dragging.x = e.clientX; dragging.y = e.clientY;
      drawPreview();
    });
    canvas.addEventListener('pointerup', function () {
      dragging = null;
      canvas.style.cursor = 'grab';
    });
    canvas.addEventListener('dblclick', function () { zoomFit(); });
    canvas.style.cursor = 'grab';
  }

  function drawPreview() {
    var canvas = document.getElementById('preview');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || 900, cssH = canvas.clientHeight || 600;
    var pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = '#f6f3ec';                     /* Stoff-Ton */
    ctx.fillRect(0, 0, cssW, cssH);

    var f = computeFit();
    state.view.fit = f;
    var v = state.view;
    var res = state.result;

    /* Arbeitsfläche (pageW/pageH) als dezente Linie, falls gesetzt. */
    if (state.params.pageW > 0 && state.params.pageH > 0) {
      var bw = state.params.pageW * f.base * v.zoom;
      var bh = state.params.pageH * f.base * v.zoom;
      ctx.strokeStyle = '#d8d2c4';
      ctx.lineWidth = 1;
      ctx.strokeRect(v.px, v.py, bw, bh);
    }

    if (!res || !res.strokes.length) { bindPreview(); return; }

    var b = f.b;
    var base = f.base, zoom = v.zoom;
    function X(x) { return v.px + (x - b.x0) * base * zoom; }
    function Y(y) { return v.py + (y - b.y0) * base * zoom; }

    var pen = state.pens[state.penIdx];
    ctx.strokeStyle = pen.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    function segWidth(w) {
      var ww = (w != null && isFinite(w)) ? (w < 0 ? 0 : (w > 1 ? 1 : w)) : 0;
      return Math.max(0.4, pen.width * base * zoom * (0.55 + 1.0 * ww));
    }

    var i, s, k, t, cur;
    for (i = 0; i < res.strokes.length; i++) {
      s = res.strokes[i];
      cur = s.start;
      ctx.beginPath();
      for (k = 0; k < s.segs.length; k++) {
        t = s.segs[k];
        ctx.lineWidth = segWidth(t.w);
        ctx.moveTo(X(cur[0]), Y(cur[1]));
        if (t.t === 'L') {
          ctx.lineTo(X(t.x), Y(t.y));
        } else {
          var r = Math.hypot(cur[0] - t.cx, cur[1] - t.cy);
          var a0 = Math.atan2(cur[1] - t.cy, cur[0] - t.cx);
          var a1 = Math.atan2(t.y - t.cy, t.x - t.cx);
          ctx.arc(X(t.cx), Y(t.cy), r * base * zoom, a0, a1, !t.cw);
        }
        cur = [t.x, t.y];
      }
      ctx.stroke();
    }
    bindPreview();
  }

  /* ------------------------------- Rendering ------------------------------- */

  function viewProps() {
    return {
      text: state.text,
      pens: state.pens,
      penIdx: state.penIdx,
      params: state.params,
      fontName: state.font.name,
      fonts: embeddedFonts.map(function (f) {
        return {
          id: f.id, name: f.name, mono: f.mono,
          label: (f.mono ? '⊞ ' : '♒ ') + f.name,
        };
      }),
      fontKey: state.fontKey,
      hasCustomFont: state.hasCustomFont,
      editorStyle: {
        fontFamily: state.fontFamily,
        fontSize: state.editor.fontSizePx + 'px',
        lineHeight: state.editor.lineHeight,
      },
      editorFontSizePx: state.editor.fontSizePx,
      editorLineHeight: state.editor.lineHeight,
      gcode: state.result ? state.result.gcode : '',
      statsLine: state.result ? statsLine(state.result) : '',
      zoomLabel: Math.round(state.view.zoom * 100) + '%',
      onText: onText, loadDemo: loadDemo, clearText: clearText,
      onFontSelect: onFontSelect, onFont: onFont, onPen: onPen,
      onEditorFontSize: onEditorNum('fontSizePx'),
      onEditorLineHeight: onEditorNum('lineHeight'),
      onNum: onNum, onNum0: onNum0, onNumS: onNumS, onSelect: onSelect, onToggle: onToggle,
      download: download,
      zoomIn: function () { var c = document.getElementById('preview'); var r = c ? c.getBoundingClientRect() : { width: 0, height: 0 }; zoomAt(r.width / 2, r.height / 2, 1.6); },
      zoomOut: function () { var c = document.getElementById('preview'); var r = c ? c.getBoundingClientRect() : { width: 0, height: 0 }; zoomAt(r.width / 2, r.height / 2, 1 / 1.6); },
      zoomFit: zoomFit,
    };
  }

  function refresh() {
    var root = document.getElementById('root');
    ReactDOM.render(React.createElement(window.CoffeeHamlApp, viewProps()), root);
    drawPreview();
  }

  rebuild();
  refresh();
})();