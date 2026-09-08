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

  /* ASCII-Art-Logo — das UI zeichnet seinen eigenen Rahmen.
   * asciiFrame() normalisiert jede Zeile auf gleiche Breite, damit die
   * Box-Drawing-Zeichen exakt fluchten (immer monospaced gerendert). */
  function repeatChar(ch, n) { return new Array(n + 1).join(ch); }
  function asciiFrame(rows) {
    var w = 0, i;
    for (i = 0; i < rows.length; i++) { if (rows[i].length > w) w = rows[i].length; }
    var bar = repeatChar('═', w + 2);
    var out = ['╔' + bar + '╗'];
    for (i = 0; i < rows.length; i++) {
      out.push('║ ' + rows[i] + repeatChar(' ', w - rows[i].length) + ' ║');
    }
    out.push('╚' + bar + '╝');
    return out.join('\n');
  }
  var ASCII_LOGO = asciiFrame([
    '  ▄▄▄▄▄  ▄▄▄▄▄  ▄▄▄▄▄  ▄▄▄▄▄  ▄▄▄▄▄',
    '  █▀▀▀█  ▀█▀█▀  █ ▄▄█  ▀█▀█▀  ▀█▀█▀',
    '  ▀▀▀▀▀  ▀▀▀▀▀  ▀▀▀▀▀  ▀▀▀▀▀  ▀▀▀▀▀',
    '  A S C I I   ·   P L O T T E R',
    '  A R T E   ·   C N C   ·   S T I F T',
  ]);

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
    fontMono: true,
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
    blackbox: {
      machine: null,
      plan: null,
      status: 'idle',                 /* idle | running | paused | done | connecting */
      timewarp: 1,
      serial: null,
      serialName: null,
      serialSupported: window.Blackbox ? window.Blackbox.serialAvailable() : false,
      telemetry: { x: 0, y: 0, z: 0, pen: '—', stroke: '0/0', feed: 0, progress: 0 },
    },
  };

  function rebuild() {
    var pen = state.pens[state.penIdx];
    var t = state.text;
    state.truncated = t.length > MAX_TEXT;
    if (state.truncated) t = t.slice(0, MAX_TEXT);
    state.result = window.AsciiPlotter.layout(t, state.font, state.params, pen.width);
    invalidatePlan();
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
  function applyFont(font, key, family, mono) {
    state.font = font;
    state.fontKey = key;
    state.fontFamily = family;
    state.fontMono = !!mono;
    rebuild();
    refresh();
  }

  function onFontSelect(e) {
    var key = e.target.value;
    if (key === 'builtin') {
      applyFont(builtinFont, 'builtin', MONO_STACK, true);
    } else if (key === 'custom') {
      if (state.customFont) applyFont(state.customFont, 'custom', state.fontFamily, false);
    } else {
      var entry = embeddedById[key];
      if (entry) applyFont(loadEmbeddedFont(entry), key, '"' + entry.family + '", ' + MONO_STACK, !!entry.mono);
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
      registerCustomFont(file);
      applyFont(sf, 'custom', '"PlotterCustom", ' + MONO_STACK, false);
    }).catch(function (err) {
      window.alert('Font konnte nicht geladen werden: ' + (err && err.message ? err.message : err));
    });
    e.target.value = '';
  }

  /* Registriert eine hochgeladene TTF/OTF als @font-face, damit Editor und
   * UI die echte Schriftart darstellen können (nicht nur die Strich-Extraktion). */
  function registerCustomFont(file) {
    var url = URL.createObjectURL(file);
    var style = document.getElementById('custom-font-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'custom-font-css';
      document.head.appendChild(style);
    }
    style.textContent = '@font-face{font-family:PlotterCustom;src:url(' + url + ') format("truetype");}';
  }

  /* ------------------------ Hermetische Maschine --------------------------- */

  function ensurePlan() {
    if (!state.blackbox.plan) {
      state.blackbox.plan = window.Blackbox.toPlan(state.result, state.params, state.pens[state.penIdx].width);
    }
    return state.blackbox.plan;
  }

  function ensureMachine() {
    if (!state.blackbox.machine) {
      var plan = ensurePlan();
      var m = new window.Blackbox.Machine(plan, { timewarp: state.blackbox.timewarp });
      m.onUpdate = onMachineUpdate;
      m.onDone = onMachineDone;
      state.blackbox.machine = m;
    }
    return state.blackbox.machine;
  }

  function invalidatePlan() {
    state.blackbox.plan = null;
    if (state.blackbox.machine) {
      state.blackbox.machine.abort();
      state.blackbox.machine = null;
    }
  }

  function onMachineUpdate(st) {
    state.blackbox.telemetry.x = st.x;
    state.blackbox.telemetry.y = st.y;
    state.blackbox.telemetry.z = st.z;
    state.blackbox.telemetry.pen = st.pen ? '▼ unten' : '△ oben';
    state.blackbox.telemetry.stroke = ((st.stroke != null ? st.stroke + 1 : 0) + '/' + (state.blackbox.plan ? state.blackbox.plan.strokeCount : 0));
    state.blackbox.telemetry.feed = st.feed;
    state.blackbox.telemetry.progress = st.progress;
    renderTelemetry(st);
    drawPreview();
  }

  function onMachineDone(st) {
    state.blackbox.status = 'done';
    renderTelemetry(st);
    refresh();
  }

  function renderTelemetry(st) {
    setText('m-x', st.x.toFixed(2));
    setText('m-y', st.y.toFixed(2));
    setText('m-z', st.z.toFixed(2));
    setText('m-pen', st.pen ? '▼ unten' : '△ oben');
    setText('m-stroke', ((st.stroke != null ? st.stroke + 1 : 0) + '/' + (state.blackbox.plan ? state.blackbox.plan.strokeCount : 0)));
    setText('m-feed', st.feed.toFixed(0));
    setText('m-progress', (st.progress * 100).toFixed(0) + '%');
    var bar = document.getElementById('m-bar');
    if (bar) bar.style.width = (st.progress * 100).toFixed(2) + '%';
  }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el && el.textContent !== v) el.textContent = v;
  }

  function machineStart() {
    if (!state.result || !state.result.strokes.length) return;
    var m = ensureMachine();
    if (state.blackbox.serial) {
      m.streamSerial(state.blackbox.serial);
    } else {
      m.start();
    }
    state.blackbox.status = 'running';
    refresh();
  }

  function machinePause() {
    var m = state.blackbox.machine;
    if (!m || m.mode !== 'running') return;
    m.pause();
    state.blackbox.status = 'paused';
    refresh();
  }

  function machineResume() {
    var m = state.blackbox.machine;
    if (!m || m.mode !== 'paused') return;
    m.resume();
    state.blackbox.status = 'running';
    refresh();
  }

  function machineAbort() {
    var m = state.blackbox.machine;
    if (!m) return;
    m.abort();
    state.blackbox.status = 'idle';
    refresh();
  }

  function machineReset() {
    if (state.blackbox.machine) { state.blackbox.machine.abort(); state.blackbox.machine = null; }
    state.blackbox.plan = null;
    state.blackbox.status = 'idle';
    refresh();
  }

  function machineConnect() {
    state.blackbox.status = 'connecting';
    refresh();
    window.Blackbox.connectSerial(115200).then(function (port) {
      state.blackbox.serial = port;
      var info = {};
      try { info = port.getInfo(); } catch (e) {}
      state.blackbox.serialName = (info.usbVendorId ? 'USB ' + info.usbVendorId.toString(16) + ':' + (info.usbProductId || 0).toString(16) : 'Seriell');
      state.blackbox.status = 'idle';
      refresh();
    }).catch(function (err) {
      state.blackbox.serial = null;
      state.blackbox.serialName = null;
      state.blackbox.status = 'idle';
      window.alert('Keine Verbindung: ' + (err && err.message ? err.message : err));
      refresh();
    });
  }

  function machineDisconnect() {
    if (state.blackbox.machine) { state.blackbox.machine.abort(); state.blackbox.machine = null; }
    if (state.blackbox.serial) { try { state.blackbox.serial.close(); } catch (e) {} }
    state.blackbox.serial = null;
    state.blackbox.serialName = null;
    state.blackbox.plan = null;
    state.blackbox.status = 'idle';
    refresh();
  }

  function onTimewarp(e) {
    var v = parseFloat(e.target.value);
    if (isFinite(v) && v > 0) {
      state.blackbox.timewarp = v;
      if (state.blackbox.machine) state.blackbox.machine.setTimewarp(v);
      setText('m-warp', v.toFixed(1) + '×');
    }
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

  function previewTransform() {
    var f = computeFit();
    state.view.fit = f;
    var v = state.view;
    var b = f.b;
    var scale = f.base * v.zoom;
    function X(x) { return v.px + (x - b.x0) * scale; }
    function Y(y) { return v.py + (y - b.y0) * scale; }
    return { b: b, base: f.base, zoom: v.zoom, scale: scale, X: X, Y: Y, v: v };
  }

  function segWidthPx(w, scale, pen) {
    var ww = (w != null && isFinite(w)) ? (w < 0 ? 0 : (w > 1 ? 1 : w)) : 0;
    return Math.max(0.4, pen.width * scale * (0.55 + 1.0 * ww));
  }

  function clearStage(ctx) {
    var dpr = window.devicePixelRatio || 1;
    var cssW = ctx.canvas.clientWidth || 900, cssH = ctx.canvas.clientHeight || 600;
    var pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
    if (ctx.canvas.width !== pw || ctx.canvas.height !== ph) { ctx.canvas.width = pw; ctx.canvas.height = ph; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = '#f6f3ec';                     /* Stoff-Ton */
    ctx.fillRect(0, 0, cssW, cssH);
  }

  function drawPageOutline(ctx, tr) {
    if (state.params.pageW > 0 && state.params.pageH > 0) {
      ctx.strokeStyle = '#d8d2c4';
      ctx.lineWidth = 1;
      ctx.strokeRect(tr.v.px, tr.v.py, state.params.pageW * tr.scale, state.params.pageH * tr.scale);
    }
  }

  function drawSegFull(ctx, s, k, from, tr, pen) {
    var t = s.segs[k];
    ctx.lineWidth = segWidthPx(t.w, tr.scale, pen);
    ctx.moveTo(tr.X(from[0]), tr.Y(from[1]));
    if (t.t === 'L') {
      ctx.lineTo(tr.X(t.x), tr.Y(t.y));
    } else {
      var r = Math.hypot(from[0] - t.cx, from[1] - t.cy);
      var a0 = Math.atan2(from[1] - t.cy, from[0] - t.cx);
      var a1 = Math.atan2(t.y - t.cy, t.x - t.cx);
      ctx.arc(tr.X(t.cx), tr.Y(t.cy), r * tr.scale, a0, a1, !t.cw);
    }
  }

  function drawSegPartial(ctx, s, k, from, frac, tr, pen) {
    var t = s.segs[k];
    ctx.lineWidth = segWidthPx(t.w, tr.scale, pen);
    ctx.moveTo(tr.X(from[0]), tr.Y(from[1]));
    if (t.t === 'L') {
      ctx.lineTo(tr.X(from[0] + (t.x - from[0]) * frac), tr.Y(from[1] + (t.y - from[1]) * frac));
    } else {
      var r = Math.hypot(from[0] - t.cx, from[1] - t.cy);
      var a0 = Math.atan2(from[1] - t.cy, from[0] - t.cx);
      var a1 = Math.atan2(t.y - t.cy, t.x - t.cx);
      var a = a0 + window.Blackbox.arcSweep(a0, a1, t.cw) * frac;
      ctx.arc(tr.X(t.cx), tr.Y(t.cy), r * tr.scale, a0, a, !t.cw);
    }
  }

  /* Zeichnet einen Strich bis doneSegs vollständig, optional ein Teil-Segment. */
  function drawStrokeInk(ctx, s, tr, pen, doneSegs, partialSegIdx, partialFrac) {
    var from = s.start, k;
    for (k = 0; k < doneSegs; k++) {
      ctx.beginPath();
      drawSegFull(ctx, s, k, from, tr, pen);
      ctx.stroke();
      from = [s.segs[k].x, s.segs[k].y];
    }
    if (partialSegIdx != null && partialSegIdx >= doneSegs && partialSegIdx < s.segs.length) {
      ctx.beginPath();
      drawSegPartial(ctx, s, partialSegIdx, from, partialFrac, tr, pen);
      ctx.stroke();
    }
  }

  function drawPenCursor(ctx, st, tr, pen) {
    var x = tr.X(st.x), y = tr.Y(st.y);
    var r = st.pen ? 5 : 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (st.pen) {
      ctx.fillStyle = pen.color; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.strokeStyle = pen.color; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - r - 5, y); ctx.lineTo(x - r - 1, y);
    ctx.moveTo(x + r + 1, y); ctx.lineTo(x + r + 5, y);
    ctx.moveTo(x, y - r - 5); ctx.lineTo(x, y - r - 1);
    ctx.moveTo(x, y + r + 1); ctx.lineTo(x, y + r + 5);
    ctx.stroke();
  }

  function drawStaticPreview() {
    var canvas = document.getElementById('preview');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    clearStage(ctx);
    var tr = previewTransform();
    drawPageOutline(ctx, tr);
    var res = state.result;
    if (!res || !res.strokes.length) { bindPreview(); return; }
    var pen = state.pens[state.penIdx];
    ctx.strokeStyle = pen.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var i = 0; i < res.strokes.length; i++) {
      drawStrokeInk(ctx, res.strokes[i], tr, pen, res.strokes[i].segs.length, null, 0);
    }
    bindPreview();
  }

  function drawMachinePreview() {
    var canvas = document.getElementById('preview');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    clearStage(ctx);
    var tr = previewTransform();
    drawPageOutline(ctx, tr);
    var res = state.result;
    var m = state.blackbox.machine;
    if (!res || !res.strokes.length) { bindPreview(); return; }
    var pen = state.pens[state.penIdx];
    ctx.strokeStyle = pen.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var st = m.state();
    var curStroke = (st.move && st.move.stroke != null) ? st.move.stroke : Infinity;
    for (var i = 0; i < res.strokes.length; i++) {
      if (i > curStroke) break;
      var s = res.strokes[i];
      if (i < curStroke) {
        drawStrokeInk(ctx, s, tr, pen, s.segs.length, null, 0);
      } else {
        var kind = st.move.kind;
        if (kind === 'draw') {
          drawStrokeInk(ctx, s, tr, pen, st.segIdx != null ? st.segIdx : 0, st.segIdx, st.frac);
        } else if (kind === 'lift' || kind === 'park') {
          drawStrokeInk(ctx, s, tr, pen, s.segs.length, null, 0);
        }
        /* travel / plunge → noch nichts gezeichnet */
      }
    }
    drawPenCursor(ctx, st, tr, pen);
    bindPreview();
  }

  function drawPreview() {
    var m = state.blackbox && state.blackbox.machine;
    if (m && (m.mode === 'running' || m.mode === 'paused' || m.mode === 'done')) {
      drawMachinePreview();
    } else {
      drawStaticPreview();
    }
  }

  /* ------------------------------- Rendering ------------------------------- */

  function machineStatusText() {
    var bb = state.blackbox;
    if (bb.status === 'connecting') return '⏳ Suche Seriell-Port …';
    if (bb.status === 'running') return (bb.serial ? '▶ Zeichnet (CNC)' : '▶ Maschine zeichnet …');
    if (bb.status === 'paused') return '⏸ Pausiert';
    if (bb.status === 'done') return '✦ Arte vollendet';
    return '◌ Maschine bereit · ' + (bb.serial ? bb.serialName : 'Simulation');
  }

  function statusDotColor() {
    switch (state.blackbox.status) {
      case 'running': return '#2ecc71';
      case 'paused': return '#f39c12';
      case 'done': return '#9b59b6';
      case 'connecting': return '#f1c40f';
      default: return '#95a5a6';
    }
  }

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
      appStyle: { fontFamily: state.fontFamily },
      asciiStyle: { fontFamily: state.fontMono ? state.fontFamily : MONO_STACK },
      asciiLogo: ASCII_LOGO,
      editorStyle: {
        fontFamily: state.fontFamily,
        fontSize: state.editor.fontSizePx + 'px',
        lineHeight: state.editor.lineHeight,
      },
      editorFontSizePx: state.editor.fontSizePx,
      editorLineHeight: state.editor.lineHeight,
      machineStatus: machineStatusText(),
      machineRunning: state.blackbox.status === 'running',
      machinePaused: state.blackbox.status === 'paused',
      machineDone: state.blackbox.status === 'done',
      machineConnecting: state.blackbox.status === 'connecting',
      machineIdle: state.blackbox.status === 'idle' || state.blackbox.status === 'done' || state.blackbox.status === 'connecting',
      machineActive: state.blackbox.status === 'running' || state.blackbox.status === 'paused',
      statusDotStyle: { background: statusDotColor() },
      serialName: state.blackbox.serialName,
      serialSupported: state.blackbox.serialSupported,
      serialConnected: !!state.blackbox.serialName,
      serialConnectable: !state.blackbox.serialName && state.blackbox.serialSupported,
      serialUnavailable: !state.blackbox.serialName && !state.blackbox.serialSupported,
      timewarp: state.blackbox.timewarp,
      timewarpLabel: state.blackbox.timewarp.toFixed(1) + '×',
      statsLine: state.result ? statsLine(state.result) : '',
      zoomLabel: Math.round(state.view.zoom * 100) + '%',
      onText: onText, loadDemo: loadDemo, clearText: clearText,
      onFontSelect: onFontSelect, onFont: onFont, onPen: onPen,
      onEditorFontSize: onEditorNum('fontSizePx'),
      onEditorLineHeight: onEditorNum('lineHeight'),
      onNum: onNum, onNum0: onNum0, onNumS: onNumS, onSelect: onSelect, onToggle: onToggle,
      onMachineStart: machineStart, onMachinePause: machinePause, onMachineResume: machineResume,
      onMachineAbort: machineAbort, onMachineReset: machineReset,
      onMachineConnect: machineConnect, onMachineDisconnect: machineDisconnect,
      onTimewarp: onTimewarp,
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