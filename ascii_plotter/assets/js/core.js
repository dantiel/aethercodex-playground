/* core.js — Raster-Layout, Wege-Optimierung und GCODE-Erzeugung.
 *
 * Pipeline: Text → ASCII-Raster → Glyphen-Einzelstriche (Weltkoordinaten mm)
 * → Dedupe → Kurvenmodus (Bogen/Linien) → Ausrichtung (Margin/Align) →
 * Breiten-Normalisierung → Anordnung (Nächster Nachbar / Reihen / Serpentine)
 * → GCODE.
 *
 * GCODE-Grundsätze:
 *   - Kein Dwell (G4) an irgendeiner Stelle — Filzstift blutet sonst durch.
 *   - Strichbreite NICHT über parallele Füllstriche, sondern über zwei
 *     gekoppelte Größen pro Segment:
 *       Z-Druck  zDown(w) = -(press + w × zGain)     (tiefer = breiter)
 *       Feed     feed(w)  = feedDown − w × (feedDown − feedMin)  (langsamer = breiter)
 *     w ∈ [0,1] ist die normalisierte lokale Achsenbreite (dünnster Strich → 0).
 *   - Eilgang (G0, pen up) mit feedUp, Z-Tauchen mit plunge.
 *   - Rundungen als G2/G3 mit I/J-Mittelpunkts-Offsets (2D, GRBL-sicher).
 *   - cw-Flag = visuelle Drehrichtung (invariant unter y-Spiegelung):
 *     G2 wenn cw, G3 wenn nicht.
 *
 * Weltkoordinaten: X rechts, Y nach unten (wie Canvas). GCODE: Y = −Welt-Y.
 */
(function (global) {
  'use strict';

  var CORNER_SPLIT_DEG = 150;   /* Ecken schärfer als 150° Richtungswechsel splitten */

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function fin(v, dflt) { return (typeof v === 'number' && isFinite(v)) ? v : dflt; }
  function pos(v, dflt) { return (typeof v === 'number' && isFinite(v) && v > 0) ? v : dflt; }
  function nneg(v, dflt) { return (typeof v === 'number' && isFinite(v) && v >= 0) ? v : dflt; }
  function f3(v) { if (!isFinite(v)) v = 0; if (Math.abs(v) < 0.0005) v = 0; return (Math.round(v * 1000) / 1000).toFixed(3); }

  /* ------------------------------ Stroke-Helfer --------------------------- */

  function strokeLen(s) {
    var L = 0, prev = s.start;
    for (var i = 0; i < s.segs.length; i++) {
      var t = s.segs[i];
      L += Math.hypot(t.x - prev[0], t.y - prev[1]);
      prev = [t.x, t.y];
    }
    return L;
  }

  function reverseStroke(s) {
    var segs = [];
    var endW = s.segs.length ? s.segs[s.segs.length - 1].w : s.startW;
    for (var i = s.segs.length - 1; i >= 0; i--) {
      var o = s.segs[i];
      var from = i === 0 ? [s.start[0], s.start[1]] : [s.segs[i - 1].x, s.segs[i - 1].y];
      var wAtFrom = i === 0 ? s.startW : s.segs[i - 1].w;
      if (o.t === 'L') segs.push({ t: 'L', x: from[0], y: from[1], w: wAtFrom });
      else segs.push({ t: 'A', x: from[0], y: from[1], cx: o.cx, cy: o.cy, cw: !o.cw, w: wAtFrom });
    }
    return { segs: segs, start: [s.end[0], s.end[1]], end: [s.start[0], s.start[1]], startW: endW };
  }

  function shiftStroke(s, dx, dy) {
    var segs = [], i;
    for (i = 0; i < s.segs.length; i++) {
      var t = s.segs[i];
      var n = { t: t.t, x: t.x + dx, y: t.y + dy, w: t.w };
      if (t.t === 'A') { n.cx = t.cx + dx; n.cy = t.cy + dy; n.cw = t.cw; }
      segs.push(n);
    }
    return {
      segs: segs,
      start: [s.start[0] + dx, s.start[1] + dy],
      end: [s.end[0] + dx, s.end[1] + dy],
      startW: s.startW,
    };
  }

  /* Einzelstrich-Kontur (Glyphenraum, y-up) → Welt-Strokes (mm, y-down).
   * Splittet an M und an extrem scharfen Ecken. Übernimmt die lokale
   * Strichbreite w (Glypheneinheiten → mm via scale). */
  function contourToWorld(segs, scale, ox, oy, out, cornerSplitDeg) {
    var cur = null;
    var cosLim = Math.cos(cornerSplitDeg * Math.PI / 180);
    function wmm(s) { return (s && s.w != null && isFinite(s.w)) ? s.w * scale : null; }
    function flush() { if (cur && cur.segs.length) out.push(cur); cur = null; }
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      var wx = ox + s.x * scale;
      var wy = oy - s.y * scale;                       /* y-up Glyphe → y-down Welt */
      if (s.t === 'M') { flush(); cur = { segs: [], start: [wx, wy], end: [wx, wy], startW: wmm(s) }; continue; }
      if (!cur) cur = { segs: [], start: [wx, wy], end: [wx, wy], startW: wmm(s) };
      var segWorld = s.t === 'L'
        ? { t: 'L', x: wx, y: wy, w: wmm(s) }
        : { t: 'A', x: wx, y: wy, cx: ox + s.cx * scale, cy: oy - s.cy * scale, cw: s.cw, w: wmm(s) };
      if (s.t === 'L' && cur.segs.length >= 1) {
        var p2 = [cur.segs[cur.segs.length - 1].x, cur.segs[cur.segs.length - 1].y];
        var p1 = cur.segs.length >= 2
          ? [cur.segs[cur.segs.length - 2].x, cur.segs[cur.segs.length - 2].y]
          : [cur.start[0], cur.start[1]];
        var v1x = p2[0] - p1[0], v1y = p2[1] - p1[1];
        var v2x = wx - p2[0], v2y = wy - p2[1];
        var l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
        if (l1 > 1e-9 && l2 > 1e-9 && (v1x * v2x + v1y * v2y) / (l1 * l2) < cosLim) {
          flush();
          cur = { segs: [], start: [p2[0], p2[1]], end: [p2[0], p2[1]], startW: segWorld.w };
        }
      }
      cur.segs.push(segWorld);
      cur.end = [wx, wy];
    }
    flush();
  }

  /* --------------------------- Kurvenmodus (Bögen/Linien) ----------------- */

  /* Ein Bogen-Segment in chordal unterteilte Linien flachen (Sagitta ≤ chordErr). */
  function flattenArcSeg(sx, sy, t, chordErr) {
    var cx = t.cx, cy = t.cy;
    var r = Math.hypot(sx - cx, sy - cy);
    var a0 = Math.atan2(sy - cy, sx - cx);
    var a1 = Math.atan2(t.y - cy, t.x - cx);
    var sweep = a1 - a0;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    var absSweep = Math.abs(sweep);
    var n = 1;
    if (chordErr > 0 && r > 1e-9) {
      var step = 2 * Math.acos(clamp(1 - chordErr / r, -1, 1));
      if (step > 1e-6) n = Math.max(1, Math.ceil(absSweep / step));
    }
    var pts = [];
    for (var i = 1; i <= n; i++) {
      var a = a0 + sweep * (i / n);
      pts.push({ t: 'L', x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), w: t.w });
    }
    return pts;
  }

  /* Bögen mit Radius < minR durch Linien ersetzen (minR = Infinity ⇒ alle). */
  function strokeFlatten(s, minR, chordErr) {
    var segs = [], i, prev = s.start;
    for (i = 0; i < s.segs.length; i++) {
      var t = s.segs[i];
      if (t.t === 'L') { segs.push(t); prev = [t.x, t.y]; continue; }
      var r = Math.hypot(prev[0] - t.cx, prev[1] - t.cy);
      if (r >= minR) { segs.push(t); prev = [t.x, t.y]; continue; }
      var flat = flattenArcSeg(prev[0], prev[1], t, chordErr);
      for (var j = 0; j < flat.length; j++) segs.push(flat[j]);
      prev = [t.x, t.y];
    }
    return { start: s.start, end: s.end, startW: s.startW, segs: segs };
  }

  /* ------------------------------ Anordnung ------------------------------- */

  /* Greedy Nächster-Nachbar mit Spatial Hash: identische Auswahlqualität
   * (immer nächster unbesuchter Endpunkt), aber ~O(n) statt O(n²). */
  function nearestNeighbor(strokes) {
    var n = strokes.length;
    var order = [];
    if (!n) return { order: order, travel: 0, draw: 0 };
    var i, s;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (i = 0; i < n; i++) {
      s = strokes[i];
      if (s.start[0] < minX) minX = s.start[0];
      if (s.start[0] > maxX) maxX = s.start[0];
      if (s.start[1] < minY) minY = s.start[1];
      if (s.start[1] > maxY) maxY = s.start[1];
      if (s.end[0] < minX) minX = s.end[0];
      if (s.end[0] > maxX) maxX = s.end[0];
      if (s.end[1] < minY) minY = s.end[1];
      if (s.end[1] > maxY) maxY = s.end[1];
    }
    var cell = Math.sqrt(Math.max((maxX - minX) * (maxY - minY), 1e-9) / n);
    var gw = Math.max(1, Math.ceil((maxX - minX) / cell));
    var gh = Math.max(1, Math.ceil((maxY - minY) / cell));
    var grid = {};
    function put(pt, idx, isEnd) {
      var bx = clamp(Math.floor((pt[0] - minX) / cell), 0, gw - 1);
      var by = clamp(Math.floor((pt[1] - minY) / cell), 0, gh - 1);
      var key = bx + ',' + by;
      (grid[key] || (grid[key] = [])).push({ i: idx, x: pt[0], y: pt[1], isEnd: isEnd });
    }
    for (i = 0; i < n; i++) {
      s = strokes[i];
      put(s.start, i, false);
      put(s.end, i, true);
    }
    var used = new Array(n);
    for (i = 0; i < n; i++) used[i] = false;
    var pos = { x: 0, y: 0 };                 /* Maschinen-Nullpunkt */
    var travel = 0, draw = 0, k;
    for (k = 0; k < n; k++) {
      var bcx = clamp(Math.floor((pos.x - minX) / cell), 0, gw - 1);
      var bcy = clamp(Math.floor((pos.y - minY) / cell), 0, gh - 1);
      var bestI = -1, bestD = Infinity, bestRev = false, exact = false;
      var scan = function (bucket) {
        for (var bi = 0; bi < bucket.length; bi++) {
          var en = bucket[bi];
          if (used[en.i]) continue;
          var d = Math.hypot(en.x - pos.x, en.y - pos.y);
          if (d < bestD) { bestD = d; bestI = en.i; bestRev = en.isEnd; }
        }
      };
      for (var ring = 0; ring <= 32; ring++) {
        if (ring === 0) {
          var b0 = grid[bcx + ',' + bcy];
          if (b0) scan(b0);
        } else {
          for (var dx = -ring; dx <= ring; dx++) {
            for (var dy = -ring; dy <= ring; dy++) {
              var adx = dx < 0 ? -dx : dx, ady = dy < 0 ? -dy : dy;
              if ((adx > ady ? adx : ady) !== ring) continue;
              var nx = bcx + dx, ny = bcy + dy;
              if (nx < 0 || nx >= gw || ny < 0 || ny >= gh) continue;
              var b = grid[nx + ',' + ny];
              if (b) scan(b);
            }
          }
        }
        if (bestI >= 0 && ring * cell >= bestD) { exact = true; break; }
      }
      if (!exact) {
        bestI = -1; bestD = Infinity; bestRev = false;
        for (i = 0; i < n; i++) {
          if (used[i]) continue;
          s = strokes[i];
          var d1 = Math.hypot(s.start[0] - pos.x, s.start[1] - pos.y);
          var d2 = Math.hypot(s.end[0] - pos.x, s.end[1] - pos.y);
          if (d1 < bestD) { bestD = d1; bestI = i; bestRev = false; }
          if (d2 < bestD) { bestD = d2; bestI = i; bestRev = true; }
        }
      }
      if (bestI < 0) break;
      used[bestI] = true;
      var st = bestRev ? reverseStroke(strokes[bestI]) : strokes[bestI];
      travel += bestD;
      draw += strokeLen(st);
      pos = { x: st.end[0], y: st.end[1] };
      order.push(st);
    }
    return { order: order, travel: travel, draw: draw };
  }

  /* Reihen-Ordnung (oben→unten, links→rechts), optional im Serpentinen-Zickzack.
   * Orientierung pro Strich wird zum nächstliegenden Endpunkt optimiert. */
  function orderRows(strokes, rowH, serpentine) {
    var items = strokes.map(function (s, i) {
      return { s: s, y: Math.min(s.start[1], s.end[1]), x: Math.min(s.start[0], s.end[0]), i: i };
    });
    items.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var rows = [], cur = null, i, r, j;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (!cur || it.y - cur.y0 > rowH * 0.5) { cur = { y0: it.y, items: [] }; rows.push(cur); }
      cur.items.push(it);
    }
    var order = [], pos = { x: 0, y: 0 }, travel = 0, draw = 0;
    for (r = 0; r < rows.length; r++) {
      var rowItems = rows[r].items;
      rowItems.sort(function (a, b) { return a.x - b.x; });
      if (serpentine && (r % 2 === 1)) rowItems.reverse();
      for (j = 0; j < rowItems.length; j++) {
        var st = rowItems[j].s;
        var dStart = Math.hypot(st.start[0] - pos.x, st.start[1] - pos.y);
        var dEnd = Math.hypot(st.end[0] - pos.x, st.end[1] - pos.y);
        var useRev = dEnd < dStart;
        var s2 = useRev ? reverseStroke(st) : st;
        travel += useRev ? dEnd : dStart;
        draw += strokeLen(s2);
        pos = { x: s2.end[0], y: s2.end[1] };
        order.push(s2);
      }
    }
    return { order: order, travel: travel, draw: draw };
  }

  function computeBounds(strokes) {
    var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (var i = 0; i < strokes.length; i++) {
      var s = strokes[i], j;
      var pts = [[s.start[0], s.start[1]]];
      for (j = 0; j < s.segs.length; j++) pts.push([s.segs[j].x, s.segs[j].y]);
      for (j = 0; j < pts.length; j++) {
        if (pts[j][0] < b.x0) b.x0 = pts[j][0];
        if (pts[j][0] > b.x1) b.x1 = pts[j][0];
        if (pts[j][1] < b.y0) b.y0 = pts[j][1];
        if (pts[j][1] > b.y1) b.y1 = pts[j][1];
      }
    }
    if (!strokes.length) return { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 };
    b.w = b.x1 - b.x0;
    b.h = b.y1 - b.y0;
    return b;
  }

  /* ------------------------------ GCODE-Erzeugung ------------------------- */

  function toGcode(strokes, p, penWidth, nn) {
    var zLift = clamp(p.lift, 0.1, 50);
    var feedMin = clamp(p.feedMin, 1, p.feedDown);
    function w0(v) { return (v != null && isFinite(v)) ? clamp(v, 0, 1) : 0; }
    function zFor(w) { return -clamp(p.press + w0(w) * p.zGain, 0.05, 4); }
    function fFor(w) { return clamp(p.feedDown + (feedMin - p.feedDown) * w0(w), feedMin, p.feedDown); }
    var zMin = -clamp(p.press, 0.05, 4);
    var zMax = -clamp(p.press + p.zGain, 0.05, 4);
    var arcs = 0;
    for (var si = 0; si < strokes.length; si++) {
      for (var sj = 0; sj < strokes[si].segs.length; sj++) if (strokes[si].segs[sj].t === 'A') arcs++;
    }
    var L = [];
    L.push('; ============================================================');
    L.push('; ASCII ART PLOTTER - CNC-Filzstift auf T-Shirt');
    L.push('; Einzelstrich-Mittelachsen: Breite via Z-Druck + Feed.');
    L.push(';   dicker  = tiefer gedrueckt (Z) und langsamer (F).');
    L.push('; Kein Dwell (kein Verweilbefehl): Filzstift wuerde durchbluten.');
    L.push('; ------------------------------------------------------------');
    L.push('; Stiftbreite ' + f3(penWidth) + ' mm | Z-Bereich ' + f3(zMin) + ' (duenn) .. ' + f3(zMax) + ' (dick) mm');
    L.push('; Hubhoehe ' + f3(zLift) + ' mm | Press ' + f3(p.press) + ' mm | Z-Gain ' + f3(p.zGain) + ' mm/Gewicht');
    L.push('; Feed: Eilgang ' + f3(p.feedUp) + ' | Zeichnen ' + f3(p.feedDown) + ' (duenn) .. ' + f3(feedMin) + ' (dick) | Tauchen ' + f3(p.plunge) + ' mm/min');
    L.push('; Kurvenmodus ' + (p.curveMode === 'lines' ? 'Linien (G1)' : 'Boegen (G2/G3)') +
      (p.curveMode === 'arcs' && p.minArcRadius > 0 ? ', Min-Radius ' + f3(p.minArcRadius) + ' mm' : '') +
      ' | Anordnung ' + p.orderMode + ' | Boegen ' + arcs);
    L.push('; Strokes ' + strokes.length + ' | Pen-Up-Weg ' + f3(nn.travel) + ' mm | Zeichenweg ' + f3(nn.draw) + ' mm');
    L.push('; ============================================================');
    L.push('G21 ; Einheiten: Millimeter');
    L.push('G90 ; Absolute Koordinaten');
    L.push('G0 Z' + f3(zLift) + ' ; Stift anheben (Hubhoehe)');
    for (var i = 0; i < strokes.length; i++) {
      var s = strokes[i], k;
      var curZ = zFor(s.startW);
      L.push('');
      L.push('; Stroke ' + (i + 1) + '/' + strokes.length);
      L.push('G0 X' + f3(s.start[0]) + ' Y' + f3(-s.start[1]) + ' F' + f3(p.feedUp) + ' ; pen up, Eilgang');
      L.push('G1 Z' + f3(curZ) + ' F' + f3(p.plunge) + ' ; Stift absenken (Druck)');
      var cur = [s.start[0], -s.start[1]];   /* Maschinenkoordinaten (Y gespiegelt) */
      for (k = 0; k < s.segs.length; k++) {
        var t = s.segs[k];
        var tx = t.x, ty = -t.y;
        var zSeg = zFor(t.w);
        var fSeg = fFor(t.w);
        if (t.t === 'L') {
          /* Z-Änderung simultan in den XY-Zug legen: kein Halt, keine Bande. */
          if (Math.abs(zSeg - curZ) >= 0.005) {
            L.push('G1 X' + f3(tx) + ' Y' + f3(ty) + ' Z' + f3(zSeg) + ' F' + f3(fSeg));
          } else {
            L.push('G1 X' + f3(tx) + ' Y' + f3(ty) + ' F' + f3(fSeg));
          }
        } else {
          var I = t.cx - cur[0];
          var J = -t.cy - cur[1];
          if (Math.abs(zSeg - curZ) >= 0.005) {
            L.push('G1 Z' + f3(zSeg) + ' F' + f3(p.plunge) + ' ; Druck anpassen');
          }
          if (!(Math.abs(I) >= 0.0005 || Math.abs(J) >= 0.0005)) {
            L.push('G1 X' + f3(tx) + ' Y' + f3(ty) + ' F' + f3(fSeg));
          } else {
            L.push((t.cw ? 'G2' : 'G3') + ' X' + f3(tx) + ' Y' + f3(ty) +
              ' I' + f3(I) + ' J' + f3(J) + ' F' + f3(fSeg));
          }
        }
        cur = [tx, ty];
        curZ = zSeg;
      }
      L.push('G0 Z' + f3(zLift) + ' ; Stift anheben');
    }
    L.push('');
    L.push('G0 X0.000 Y0.000 ; Parkposition');
    L.push('M30 ; Programmende');
    return L.join('\n') + '\n';
  }

  /* -------------------------------- Layout -------------------------------- */

  function layout(text, font, params, penWidth) {
    var p = params || {};
    p = {
      /* Maße & Layout */
      cellW: pos(p.cellW, 6),
      cellH: pos(p.cellH, 8),
      letterSpacing: nneg(p.letterSpacing, 0),
      lineSpacing: nneg(p.lineSpacing, 0),
      margin: nneg(p.margin, 0),
      pageW: nneg(p.pageW, 0),
      pageH: nneg(p.pageH, 0),
      alignX: p.alignX === 'center' || p.alignX === 'right' ? p.alignX : 'left',
      alignY: p.alignY === 'middle' || p.alignY === 'bottom' ? p.alignY : 'top',
      /* Linienführung */
      cornerSplitDeg: clamp(pos(p.cornerSplitDeg, 150), 30, 179),
      curveMode: p.curveMode === 'lines' ? 'lines' : 'arcs',
      minArcRadius: nneg(p.minArcRadius, 0),
      arcChordErr: pos(p.arcChordErr, 0.02),
      /* Stift & Feed */
      lift: pos(p.lift, 3),
      press: pos(p.press, 0.3),
      zGain: nneg(p.zGain, 0.7),
      feedUp: pos(p.feedUp, 2400),
      feedDown: pos(p.feedDown, 600),
      feedMin: pos(p.feedMin, 300),
      plunge: pos(p.plunge, 400),
      /* Strategie */
      orderMode: p.orderMode === 'rows' || p.orderMode === 'serpentine' ? p.orderMode : 'nearest',
      dedupeEps: pos(p.dedupeEps, 0.01),
      minStrokeLen: nneg(p.minStrokeLen, 0.05),
    };
    penWidth = pos(penWidth, 0.4);
    var units = (font.cellUnits > 0) ? font.cellUnits : 8;
    var baseUnit = fin(font.baselineUnit, 1);
    var scale = p.cellH / units;
    var pitchX = p.cellW + p.letterSpacing;
    var pitchY = p.cellH + p.lineSpacing;
    var out = [];
    var lines = String(text).split(/\r?\n/);
    var row, col;
    for (row = 0; row < lines.length; row++) {
      var line = lines[row];
      for (col = 0; col < line.length; col++) {
        var ch = line.charAt(col);
        if (ch === ' ' || ch === '\t') continue;
        var contours = font.strokesFor(ch) || [];
        var adv = fin(font.advance(ch), units * 0.6);
        var ox = col * pitchX + (p.cellW - adv * scale) / 2;
        var oy = row * pitchY + (units - baseUnit) * scale;
        for (var ci = 0; ci < contours.length; ci++) {
          contourToWorld(contours[ci], scale, ox, oy, out, p.cornerSplitDeg);
        }
      }
    }
    /* Dedupe + Mikro-Stroke-Pruning. */
    var seen = {}, pruned = [], i, s;
    var q = 1 / p.dedupeEps;
    for (i = 0; i < out.length; i++) {
      s = out[i];
      var sl = strokeLen(s);
      if (!isFinite(sl) || sl < p.minStrokeLen) continue;
      var k2, sane = true;
      for (k2 = 0; k2 < s.segs.length; k2++) {
        if (s.segs[k2].t === 'A' && (!isFinite(s.segs[k2].cx) || !isFinite(s.segs[k2].cy))) { sane = false; break; }
      }
      if (!sane) continue;
      var key = '';
      for (var k = 0; k < s.segs.length; k++) {
        var t = s.segs[k];
        key += t.t + ':' + Math.round(t.x * q) + ',' + Math.round(t.y * q) + '|';
      }
      if (seen[key]) continue;
      seen[key] = true;
      pruned.push(s);
    }
    /* Kurvenmodus: Bögen unterhalb minArcRadius (bzw. alle bei 'lines') flachen. */
    var minR = p.curveMode === 'lines' ? Infinity : p.minArcRadius;
    var flattened = [];
    for (i = 0; i < pruned.length; i++) flattened.push(strokeFlatten(pruned[i], minR, p.arcChordErr));
    /* Ausrichtung: Inhalt an Ursprung, dann Margin + Seiten-Ausrichtung. */
    var raw = computeBounds(flattened);
    var shiftX = -raw.x0, shiftY = -raw.y0;
    for (i = 0; i < flattened.length; i++) flattened[i] = shiftStroke(flattened[i], shiftX, shiftY);
    var contentW = raw.w, contentH = raw.h;
    var totalW = p.pageW > 0 ? p.pageW : contentW + 2 * p.margin;
    var totalH = p.pageH > 0 ? p.pageH : contentH + 2 * p.margin;
    var availW = Math.max(0, totalW - 2 * p.margin);
    var availH = Math.max(0, totalH - 2 * p.margin);
    var ox = p.margin + (p.alignX === 'center' ? (availW - contentW) / 2 : p.alignX === 'right' ? availW - contentW : 0);
    var oy = p.margin + (p.alignY === 'middle' ? (availH - contentH) / 2 : p.alignY === 'bottom' ? availH - contentH : 0);
    for (i = 0; i < flattened.length; i++) flattened[i] = shiftStroke(flattened[i], ox, oy);
    /* Globale Breiten-Normalisierung: dünnster Strich → 0, dickster → 1. */
    var minW = Infinity, maxW = -Infinity, anyW = false;
    for (i = 0; i < flattened.length; i++) {
      s = flattened[i];
      var ws = s.startW;
      if (ws != null && isFinite(ws)) { if (ws < minW) minW = ws; if (ws > maxW) maxW = ws; anyW = true; }
      for (k = 0; k < s.segs.length; k++) {
        var wv = s.segs[k].w;
        if (wv != null && isFinite(wv)) { if (wv < minW) minW = wv; if (wv > maxW) maxW = wv; anyW = true; }
      }
    }
    var wSpan = maxW - minW;
    var norm = function (v) {
      if (!anyW || !(wSpan > 1e-6)) return 0;
      return (v != null && isFinite(v)) ? clamp((v - minW) / wSpan, 0, 1) : 0;
    };
    for (i = 0; i < flattened.length; i++) {
      s = flattened[i];
      s.startW = norm(s.startW);
      for (k = 0; k < s.segs.length; k++) s.segs[k].w = norm(s.segs[k].w);
    }
    var nn = p.orderMode === 'nearest'
      ? nearestNeighbor(flattened)
      : orderRows(flattened, pitchY, p.orderMode === 'serpentine');
    var bounds = computeBounds(nn.order);
    var gcode = toGcode(nn.order, p, penWidth, nn);
    var arcCount = 0;
    for (i = 0; i < nn.order.length; i++) {
      for (k = 0; k < nn.order[i].segs.length; k++) if (nn.order[i].segs[k].t === 'A') arcCount++;
    }
    return {
      strokes: nn.order,
      gcode: gcode,
      stats: {
        strokes: nn.order.length,
        lifts: nn.order.length,
        draw: nn.draw,
        travel: nn.travel,
        arcs: arcCount,
        zDown: -clamp(p.press + p.zGain, 0.05, 4),
      },
      bounds: bounds,
    };
  }

  global.AsciiPlotter = { layout: layout, _nearestNeighbor: nearestNeighbor, _orderRows: orderRows };
})(window);
