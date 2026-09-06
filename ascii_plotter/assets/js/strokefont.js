/* strokefont.js — Font→Stroke-Pipeline für den ASCII Art Plotter.
 *
 * Erzeugt aus Glyphen CNC-fähige EINZELSTRICHE (Mittelachse, kein Outline) mit:
 *   - Ecken (corner): scharfe Knicke als Polyline-Segmente (G1)
 *   - Rundungen (round): glatte Läufe werden per Kreis-Fitting zu Bögen (G2/G3)
 *
 * Zwei Fontquellen, beide über Skeletonisierung (Medial Axis):
 *   1. Eingebauter 5×7-Pixelfont (offline): Bitmap → Chamfer-Distanz →
 *      Zhang-Suen-Thinning → Achsen-Tracing.
 *   2. TTF/OTF via opentype.js: Bézier-Konturen → Rasterung (even-odd) →
 *      dieselbe Skeleton-Pipeline.
 *
 * Jeder Achsenpunkt trägt eine lokale Strichbreite (2 × Abstand zur Kontur);
 * core.js übersetzt sie in Z-Druck (tiefer = breiter) und Feed (langsamer =
 * breiter). Segmente (Glyphenraum, y-up): {t:'M'|'L'|'A', x, y, [cx, cy, cw], [w]}
 *   cw = visuelle Drehrichtung (invariant unter Spiegelung, siehe core.js).
 */
(function (global) {
  'use strict';

  /* ------------------------------ Geometrie ------------------------------ */

  function pSegDist2(px, py, ax, ay, bx, by) {
    var abx = bx - ax, aby = by - ay;
    var l2 = abx * abx + aby * aby;
    if (l2 === 0) { var dx = px - ax, dy = py - ay; return dx * dx + dy * dy; }
    var t = ((px - ax) * abx + (py - ay) * aby) / l2;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    var ex = px - (ax + t * abx), ey = py - (ay + t * aby);
    return ex * ex + ey * ey;
  }

  /* Ramer–Douglas–Peucker: Polyline vereinfachen, Ecken bleiben erhalten. */
  function rdp(pts, eps) {
    var n = pts.length;
    if (n < 3) return pts.slice();
    var keep = new Array(n), i;
    for (i = 0; i < n; i++) keep[i] = false;
    keep[0] = keep[n - 1] = true;
    var eps2 = eps * eps;
    var stack = [[0, n - 1]];
    while (stack.length) {
      var r = stack.pop(), i0 = r[0], i1 = r[1];
      var maxD = 0, idx = -1;
      for (i = i0 + 1; i < i1; i++) {
        var d = pSegDist2(pts[i][0], pts[i][1], pts[i0][0], pts[i0][1], pts[i1][0], pts[i1][1]);
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD > eps2) { keep[idx] = true; stack.push([i0, idx]); stack.push([idx, i1]); }
    }
    var out = [];
    for (i = 0; i < n; i++) if (keep[i]) out.push(pts[i]);
    return out;
  }

  /* Mittleren Punkt nahezu-kollinearer Tripel entfernen (Duplikat-Reduktion). */
  function mergeCollinear(pts, eps) {
    if (pts.length < 3) return pts;
    var out = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) {
      var a = out[out.length - 1], b = pts[i], c = pts[i + 1];
      var abx = b[0] - a[0], aby = b[1] - a[1];
      var bcx = c[0] - b[0], bcy = c[1] - b[1];
      var la = Math.hypot(abx, aby), lb = Math.hypot(bcx, bcy);
      if (la > 0 && lb > 0 && Math.abs(abx * bcy - aby * bcx) / (la * lb) < eps && (abx * bcx + aby * bcy) > 0) {
        /* b ist kollinear: überspringen */
      } else {
        out.push(b);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  /* Algebraischer Kreis-Fit (Kasa) + Winkel-Sweep über pts[i0..i1].
   * Range-basiert: keine slice-Allokationen im heißen Fenster-Pfad. */
  function fitCircleRange(pts, i0, i1) {
    var n = i1 - i0 + 1, i;
    if (n < 3) return null;
    var sx = 0, sy = 0, sx2 = 0, sy2 = 0, sxy = 0, sx3 = 0, sy3 = 0, sx2y = 0, sxy2 = 0;
    for (i = i0; i <= i1; i++) {
      var x = pts[i][0], y = pts[i][1];
      sx += x; sy += y; sx2 += x * x; sy2 += y * y; sxy += x * y;
      sx3 += x * x * x; sy3 += y * y * y; sx2y += x * x * y; sxy2 += x * y * y;
    }
    var A = 2 * (sx * sx - n * sx2);
    var B = 2 * (sx * sy - n * sxy);
    var C = 2 * (sy * sy - n * sy2);
    var D = sx2 * sx - n * sx3 + sx * sy2 - n * sxy2;
    var E = sx2 * sy + sy * sy2 - n * sy3 - n * sx2y;
    var det = A * C - B * B;
    if (Math.abs(det) < 1e-12) return null;
    var cx = (C * D - B * E) / det;
    var cy = (A * E - D * B) / det;
    var r = Math.sqrt(Math.max(0, (sx2 - 2 * cx * sx + n * cx * cx + sy2 - 2 * cy * sy + n * cy * cy) / n));
    if (!(r > 1e-9)) return null;
    var rms2 = 0, angles = [];
    for (i = i0; i <= i1; i++) {
      var dx = pts[i][0] - cx, dy = pts[i][1] - cy;
      var d = Math.hypot(dx, dy) - r;
      rms2 += d * d;
      angles.push(Math.atan2(dy, dx));
    }
    var sweep = 0;
    for (i = 0; i < n - 1; i++) {
      var da = angles[i + 1] - angles[i];
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      sweep += da;
    }
    return { cx: cx, cy: cy, r: r, rms: Math.sqrt(rms2 / n), sweep: sweep, span: Math.abs(sweep) };
  }

  function fitCircle(pts) { return fitCircleRange(pts, 0, pts.length - 1); }

  /* Polyline → {M,L,A}-Segmente; lange glatte Läufe werden Bögen.
   * Optionale 3. Komponente [x,y,w] = lokale Strichbreite; wird auf die
   * Segmente durchgereicht (Treiber für Z-Druck + Feed in core.js). */
  function polylineToSegs(pts, o) {
    var segs = [], n = pts.length, i;
    if (n < 2) return segs;
    function wAt(idx) { return (idx >= 0 && idx < n && pts[idx][2] != null) ? pts[idx][2] : null; }
    segs.push({ t: 'M', x: pts[0][0], y: pts[0][1], w: wAt(0) });
    i = 0;
    while (i < n - 1) {
      var best = null;
      /* Fenster-Wachstum in Verdopplungsschritten + Bisektion statt +1-Iteration:
       * O(log n) Kreis-Fits pro Anker statt O(n) — entscheidend für lange glatte
       * Läufe (Kreis mit 2000 Punkten: ~20 Fits statt ~2000). Fits rechnen direkt
       * auf pts[i..j] (keine slice-Allokationen). */
      var probe = i + o.minArcPts - 1, lastOk = null;
      while (probe < n) {
        var fit = fitCircleRange(pts, i, probe);
        if (fit && fit.rms <= o.arcRms && fit.span < Math.PI * 1.9) {
          lastOk = { j: probe, f: fit };
          if (probe >= n - 1) break;
          probe = Math.min(n - 1, probe + (probe - i + 1));
        } else break;
      }
      if (lastOk && probe < n && lastOk.j < n - 1) {
        var lo = lastOk.j, hi = probe;
        while (lo + 1 < hi) {
          var mid = (lo + hi) >> 1;
          var fit2 = fitCircleRange(pts, i, mid);
          if (fit2 && fit2.rms <= o.arcRms && fit2.span < Math.PI * 1.9) {
            lastOk = { j: mid, f: fit2 };
            lo = mid;
          } else hi = mid;
        }
      }
      best = lastOk;
      if (best && best.f.span >= o.minArcSpan) {
        /* Bogen in Teilbögen ≤ 180° splitten: viele Controller nehmen bei
         * I/J-Bögen > 180° fälschlich den kurzen Weg. */
        var f = best.f;
        var a0 = Math.atan2(pts[i][1] - f.cy, pts[i][0] - f.cx);
        var kMax = Math.max(1, Math.ceil(f.span / (Math.PI * 0.999)));
        var w0 = wAt(i), w1 = wAt(best.j);
        for (var k = 1; k <= kMax; k++) {
          var ex, ey, w;
          if (k === kMax) { ex = pts[best.j][0]; ey = pts[best.j][1]; w = w1; }  /* exakter Endpunkt */
          else {
            var a = a0 + f.sweep * (k / kMax);
            ex = f.cx + f.r * Math.cos(a);
            ey = f.cy + f.r * Math.sin(a);
            w = (w0 != null && w1 != null) ? w0 + (w1 - w0) * (k / kMax) : w1;
          }
          segs.push({ t: 'A', x: ex, y: ey, cx: f.cx, cy: f.cy, cw: f.sweep < 0, w: w });
        }
        i = best.j;
      } else {
        i++;
        segs.push({ t: 'L', x: pts[i][0], y: pts[i][1], w: wAt(i) });
      }
    }
    return segs;
  }

  /* ---------------- Skeletonisierung (Medial-Axis / Einzelstrich) --------- */
  /* Statt der Kontur (Outline) wird die MITTELACHSE der Glyphe extrahiert:
   * ein einzelner Strich pro Balken, dessen lokale Breite (= 2 × Abstand zur
   * Kontur) in core.js in Z-Druck und Feed übersetzt wird. Pipeline:
   *   Chamfer-Distanz (3-4) → Zhang-Suen-Thinning → Achsen-Tracing. */

  function bitmapFromRows(rows, w, h) {
    var bits = new Uint8Array(w * h), x, y;
    for (y = 0; y < h; y++) {
      var row = rows[y] || '';
      for (x = 0; x < w && x < row.length; x++) {
        if (row.charAt(x) === '#') bits[y * w + x] = 1;
      }
    }
    return bits;
  }

  /* Chamfer 3-4 Distanztransformation (ganzzahlige Euklid-Näherung ×3). */
  function chamferDistance(bits, w, h) {
    var INF = 1e9, d = new Float32Array(w * h), i, x, y, idx, v;
    for (i = 0; i < w * h; i++) d[i] = bits[i] ? INF : 0;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        idx = y * w + x;
        if (!bits[idx]) continue;
        v = d[idx];
        if (x > 0) v = Math.min(v, d[idx - 1] + 3);
        if (y > 0) v = Math.min(v, d[idx - w] + 3);
        if (x > 0 && y > 0) v = Math.min(v, d[idx - w - 1] + 4);
        if (x < w - 1 && y > 0) v = Math.min(v, d[idx - w + 1] + 4);
        d[idx] = v;
      }
    }
    for (y = h - 1; y >= 0; y--) {
      for (x = w - 1; x >= 0; x--) {
        idx = y * w + x;
        if (!bits[idx]) continue;
        v = d[idx];
        if (x < w - 1) v = Math.min(v, d[idx + 1] + 3);
        if (y < h - 1) v = Math.min(v, d[idx + w] + 3);
        if (x < w - 1 && y < h - 1) v = Math.min(v, d[idx + w + 1] + 4);
        if (x > 0 && y < h - 1) v = Math.min(v, d[idx + w - 1] + 4);
        d[idx] = v;
      }
    }
    return d;
  }

  /* Zhang-Suen-Thinning: reduziert die Fläche auf eine 1-Pixel-Mittelachse. */
  function zhangSuen(bits, w, h) {
    var out = new Uint8Array(bits), changed = true, guard = 0;
    while (changed && guard++ < 500) {
      changed = false;
      var pass, x, y, i, del, j;
      for (pass = 0; pass < 2; pass++) {
        del = [];
        for (y = 1; y < h - 1; y++) {
          for (x = 1; x < w - 1; x++) {
            i = y * w + x;
            if (!out[i]) continue;
            var p2 = out[i - w], p3 = out[i - w + 1], p4 = out[i + 1],
                p5 = out[i + w + 1], p6 = out[i + w], p7 = out[i + w - 1],
                p8 = out[i - 1], p9 = out[i - w - 1];
            var B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (B < 2 || B > 6) continue;
            var A = (p2 === 0 && p3 === 1 ? 1 : 0) + (p3 === 0 && p4 === 1 ? 1 : 0) +
                    (p4 === 0 && p5 === 1 ? 1 : 0) + (p5 === 0 && p6 === 1 ? 1 : 0) +
                    (p6 === 0 && p7 === 1 ? 1 : 0) + (p7 === 0 && p8 === 1 ? 1 : 0) +
                    (p8 === 0 && p9 === 1 ? 1 : 0) + (p9 === 0 && p2 === 1 ? 1 : 0);
            if (A !== 1) continue;
            if (pass === 0) {
              if (p2 * p4 * p6 !== 0) continue;
              if (p4 * p6 * p8 !== 0) continue;
            } else {
              if (p2 * p4 * p8 !== 0) continue;
              if (p2 * p6 * p8 !== 0) continue;
            }
            del.push(i);
          }
        }
        if (del.length) changed = true;
        for (j = 0; j < del.length; j++) out[del[j]] = 0;
      }
    }
    return out;
  }

  /* Achsen-Tracing: liefert Polylinien [[x,y,width], ...] in Pixel-Koordinaten
   * (y-down). Endpunkte (Grad 1) und Verzweigungen (Grad ≥ 3) sind Nodes;
   * dazwischen laufen Grad-2-Ketten. Reine Ringe ('O','0','8') werden als
   * geschlossene Zyklen getraced.
   *
   * TOPOLOGISCHER GRAD: diagonale Nachbarn, die eine gefüllte Ecke "abschneiden"
   * (einer der beiden orthogonalen Ecknachbarn ist gesetzt), zählen NICHT.
   * Verhindert Schein-Knoten an T-Verbindungen dünner Striche (z.B. der
   * Querbalken des 'H' berührt die Vertikale diagonal). */
  function traceSkeleton(bits, dist, w, h) {
    var visited = new Uint8Array(w * h), polylines = [], x, y;
    function idx(x, y) { return y * w + x; }
    function isSet(x, y) { return x >= 0 && x < w && y >= 0 && y < h && bits[idx(x, y)]; }
    function topoDegAt(x, y) {
      var c = 0, dx, dy;
      for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var nx = x + dx, ny = y + dy;
        if (!isSet(nx, ny)) continue;
        if (dx !== 0 && dy !== 0) {
          if (isSet(x + dx, y) || isSet(x, y + dy)) continue;   /* redundante Diagonale */
        }
        c++;
      }
      return c;
    }
    function topoNeighbors(x, y) {
      var r = [], dx, dy;
      for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var nx = x + dx, ny = y + dy;
        if (!isSet(nx, ny)) continue;
        if (dx !== 0 && dy !== 0) {
          if (isSet(x + dx, y) || isSet(x, y + dy)) continue;
        }
        r.push([nx, ny]);
      }
      return r;
    }
    function wpx(x, y) { return 2 * dist[idx(x, y)] / 3; }
    function walkEdge(sx, sy, fx, fy) {
      var pts = [[sx, sy, wpx(sx, sy)]];
      var cx = fx, cy = fy, px = sx, py = sy, guard = 0;
      while (guard++ < w * h * 4) {
        pts.push([cx, cy, wpx(cx, cy)]);
        if (topoDegAt(cx, cy) !== 2) break;         /* Node erreicht */
        visited[idx(cx, cy)] = 1;                   /* Grad-2-Pixel verbrauchen */
        var ns = topoNeighbors(cx, cy), nxt = null, i;
        for (i = 0; i < ns.length; i++) {
          if (ns[i][0] === px && ns[i][1] === py) continue;
          nxt = ns[i]; break;
        }
        if (!nxt) break;
        px = cx; py = cy; cx = nxt[0]; cy = nxt[1];
      }
      return pts;
    }
    function walkCycle(sx, sy) {
      var pts = [[sx, sy, wpx(sx, sy)]], cx = sx, cy = sy, px = -1, py = -1, guard = 0;
      while (guard++ < w * h * 4) {
        var ns = topoNeighbors(cx, cy), nxt = null, i;
        for (i = 0; i < ns.length; i++) {
          if (ns[i][0] === px && ns[i][1] === py) continue;
          if (visited[idx(ns[i][0], ns[i][1])]) continue;
          nxt = ns[i]; break;
        }
        if (!nxt) break;
        visited[idx(cx, cy)] = 1;
        px = cx; py = cy; cx = nxt[0]; cy = nxt[1];
        if (cx === sx && cy === sy) { pts.push([cx, cy, wpx(cx, cy)]); break; }
        pts.push([cx, cy, wpx(cx, cy)]);
      }
      return pts;
    }

    var nodes = [];
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (bits[idx(x, y)] && topoDegAt(x, y) !== 2) nodes.push([x, y]);
    }
    if (nodes.length) {
      for (var ni = 0; ni < nodes.length; ni++) {
        var nx0 = nodes[ni][0], ny0 = nodes[ni][1];
        var ns = topoNeighbors(nx0, ny0);
        for (var ei = 0; ei < ns.length; ei++) {
          var tx = ns[ei][0], ty = ns[ei][1];
          if (topoDegAt(tx, ty) === 2 && !visited[idx(tx, ty)]) {
            var pts = walkEdge(nx0, ny0, tx, ty);
            if (pts.length >= 2) polylines.push(pts);
          }
        }
      }
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (bits[idx(x, y)] && !visited[idx(x, y)] && topoDegAt(x, y) === 2) {
        var cyc = walkCycle(x, y);
        if (cyc.length >= 3) polylines.push(cyc);
      }
    }
    return polylines;
  }

  /* ----------------------- Eingebauter 5×7-Pixelfont ---------------------- */

  var GLYPHS = {
    'A': ['.###.','#...#','#...#','#####','#...#','#...#','#...#'],
    'B': ['####.','#...#','#...#','####.','#...#','#...#','####.'],
    'C': ['.####','#....','#....','#....','#....','#....','.####'],
    'D': ['####.','#...#','#...#','#...#','#...#','#...#','####.'],
    'E': ['#####','#....','#....','####.','#....','#....','#####'],
    'F': ['#####','#....','#....','####.','#....','#....','#....'],
    'G': ['.####','#....','#....','#.###','#...#','#...#','.####'],
    'H': ['#...#','#...#','#...#','#####','#...#','#...#','#...#'],
    'I': ['#####','..#..','..#..','..#..','..#..','..#..','#####'],
    'J': ['..###','...#.','...#.','...#.','...#.','#..#.','.##..'],
    'K': ['#...#','#..#.','#.#..','##...','#.#..','#..#.','#...#'],
    'L': ['#....','#....','#....','#....','#....','#....','#####'],
    'M': ['#...#','##.##','#.#.#','#.#.#','#...#','#...#','#...#'],
    'N': ['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#'],
    'O': ['.###.','#...#','#...#','#...#','#...#','#...#','.###.'],
    'P': ['####.','#...#','#...#','####.','#....','#....','#....'],
    'Q': ['.###.','#...#','#...#','#...#','#.#.#','#..#.','.##.#'],
    'R': ['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
    'S': ['.####','#....','#....','.###.','....#','....#','####.'],
    'T': ['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
    'U': ['#...#','#...#','#...#','#...#','#...#','#...#','.###.'],
    'V': ['#...#','#...#','#...#','#...#','#...#','.#.#.','..#..'],
    'W': ['#...#','#...#','#...#','#.#.#','#.#.#','##.##','#...#'],
    'X': ['#...#','#...#','.#.#.','..#..','.#.#.','#...#','#...#'],
    'Y': ['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..'],
    'Z': ['#####','....#','...#.','..#..','.#...','#....','#####'],
    '0': ['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.'],
    '1': ['..#..','.##..','..#..','..#..','..#..','..#..','#####'],
    '2': ['.###.','#...#','....#','..##.','.#...','#....','#####'],
    '3': ['#####','...#.','..#..','...#.','....#','#...#','.###.'],
    '4': ['...#.','..##.','.#.#.','#..#.','#####','...#.','...#.'],
    '5': ['#####','#....','####.','....#','....#','#...#','.###.'],
    '6': ['.###.','#....','#....','####.','#...#','#...#','.###.'],
    '7': ['#####','....#','...#.','..#..','.#...','.#...','.#...'],
    '8': ['.###.','#...#','#...#','.###.','#...#','#...#','.###.'],
    '9': ['.###.','#...#','#...#','.####','....#','....#','.###.'],
    ' ': ['.....','.....','.....','.....','.....','.....','.....'],
    '.': ['.....','.....','.....','.....','.....','.##..','.##..'],
    ',': ['.....','.....','.....','.....','..##.','..#..','.#...'],
    '!': ['..#..','..#..','..#..','..#..','..#..','.....','..#..'],
    '?': ['.###.','#...#','....#','..##.','..#..','.....','..#..'],
    ':': ['.....','.##..','.##..','.....','.##..','.##..','.....'],
    '-': ['.....','.....','.....','#####','.....','.....','.....'],
    '_': ['.....','.....','.....','.....','.....','.....','#####'],
    '/': ['....#','....#','...#.','..#..','.#...','#....','#....'],
    '\\': ['#....','.#...','..#..','...#.','....#','....#','....#'],
    '(': ['...#.','..#..','.#...','.#...','.#...','..#..','...#.'],
    ')': ['.#...','..#..','...#.','...#.','...#.','..#..','.#...'],
    '+': ['.....','..#..','..#..','#####','..#..','..#..','.....'],
    '=': ['.....','.....','#####','.....','#####','.....','.....'],
    '*': ['.....','.#.#.','.###.','#####','.###.','.#.#.','.....'],
    '<': ['...#.','..#..','.#...','#....','.#...','..#..','...#.'],
    '>': ['.#...','..#..','...#.','....#','...#.','..#..','.#...'],
    '#': ['.#.#.','.#.#.','#####','.#.#.','#####','.#.#.','.#.#.'],
    '@': ['.###.','#...#','#.###','#.###','#.##.','#....','.###.'],
    '|': ['..#..','..#..','..#..','..#..','..#..','..#..','..#..'],
    '\'': ['..#..','..#..','.....','.....','.....','.....','.....'],
    '`': ['..#..','..#..','.....','.....','.....','.....','.....'],
    '%': ['##..#','##..#','...#.','..#..','.#...','#..##','#..##'],
    '&': ['.##..','#..#.','#..#.','.##..','#.#.#','#..#.','.##.#'],
    '$': ['..#..','.####','#....','.###.','....#','####.','..#..'],
    '"': ['.#.#.','.#.#.','.....','.....','.....','.....','.....'],
    ';': ['.....','..##.','..##.','.....','..##.','..#..','.#...'],
    '[': ['.###.','..#..','..#..','..#..','..#..','..#..','.###.'],
    ']': ['.###.','..#..','..#..','..#..','..#..','..#..','.###.'],
    '{': ['..###','..#..','..#..','.#...','..#..','..#..','..###'],
    '}': ['###..','..#..','..#..','...#.','..#..','..#..','###..'],
    '~': ['.....','.....','.#...','#.#.#','...#.','.....','.....'],
  };

  var PIXEL_SEG_OPTS = { minArcPts: 6, arcRms: 1e-9, minArcSpan: 0.1 };

  function builtin() {
    var cache = {};
    function strokesFor(ch) {
      var key = String(ch);
      if (cache[key]) return cache[key];
      var rows = GLYPHS[key] || GLYPHS[key.toUpperCase()] || GLYPHS['?'];
      var out = [];
      if (rows) {
        /* Einzelstrich: Mittelachse statt Outline. */
        var bits = bitmapFromRows(rows, 5, 7);
        var dist = chamferDistance(bits, 5, 7);
        var thin = zhangSuen(bits, 5, 7);
        var polys = traceSkeleton(thin, dist, 5, 7);
        for (var ci = 0; ci < polys.length; ci++) {
          var raw = polys[ci], pts = [], i;
          for (i = 0; i < raw.length; i++) {
            var gx = raw[i][0] + 0.5;        /* Pixel-Zentrum → Glyphenraum */
            var gy = 6.5 - raw[i][1];        /* y-down Grid → y-up Glyphe */
            var last = pts[pts.length - 1];
            if (!last || Math.abs(gx - last[0]) > 1e-9 || Math.abs(gy - last[1]) > 1e-9) {
              pts.push([gx, gy, 1.0]);       /* Monoline: konstante Strichbreite */
            }
          }
          if (pts.length > 2) {
            pts = mergeCollinear(pts, 1e-9);
            pts = rdp(pts, 1e-9);
            var segs = polylineToSegs(pts, PIXEL_SEG_OPTS);
            if (segs.length >= 2) out.push(segs);
          }
        }
      }
      cache[key] = out;
      return out;
    }
    return {
      name: 'Builtin Single-Stroke 5×7',
      cellUnits: 8,      /* Zellhöhe in Glypheneinheiten (7 Zeilen + 1 Abstand) */
      baselineUnit: 1,   /* Baseline liegt 1 Einheit über dem Zellboden */
      advance: function () { return 6; },
      strokesFor: strokesFor,
    };
  }

  /* --------------------------- TTF/OTF via opentype ----------------------- */

  function fromOpentype(font, o) {
    var opts = o || {};
    var upem = font.unitsPerEm || 1000;
    var tol = opts.flattenTol != null ? opts.flattenTol : upem / 2000;
    var arcRms = opts.arcRms != null ? opts.arcRms : upem * 0.004;
    var targetH = opts.skeletonRes != null ? opts.skeletonRes : 64;
    var name = opts.name ||
      (font.names && font.names.fullName && font.names.fullName.en) ||
      'Importierte TTF/OTF';
    var fixedAdvance = null;
    if (opts.mono) {
      /* Monospace erzwingen: feste Advance-Breite = max. druckbarer ASCII-Glyph. */
      var probe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 @#%&()[]{}<>/\\|_-+=*^~\'",.;:!?';
      fixedAdvance = 0;
      for (var pi = 0; pi < probe.length; pi++) {
        try {
          var aw = font.charToGlyph(probe.charAt(pi)).advanceWidth || 0;
          if (aw > fixedAdvance) fixedAdvance = aw;
        } catch (e) { /* glyph fehlt */ }
      }
      if (fixedAdvance <= 0) fixedAdvance = upem * 0.6;
    }
    var cache = {};
    var TOL2 = tol * tol;

    function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
    function cubicFlat(p0, p1, p2, p3) {
      return Math.max(
        pSegDist2(p1[0], p1[1], p0[0], p0[1], p3[0], p3[1]),
        pSegDist2(p2[0], p2[1], p0[0], p0[1], p3[0], p3[1])) <= TOL2;
    }
    function quadFlat(p0, p1, p2) {
      return pSegDist2(p1[0], p1[1], p0[0], p0[1], p2[0], p2[1]) <= TOL2;
    }
    function flattenCubic(p0, p1, p2, p3, out) {
      if (cubicFlat(p0, p1, p2, p3)) { out.push(p3); return; }
      var a = mid(p0, p1), b = mid(p1, p2), c = mid(p2, p3);
      var d = mid(a, b), e = mid(b, c), f = mid(d, e);
      flattenCubic(p0, a, d, f, out);
      flattenCubic(f, e, c, p3, out);
    }
    function flattenQuad(p0, p1, p2, out) {
      if (quadFlat(p0, p1, p2)) { out.push(p2); return; }
      var a = mid(p0, p1), b = mid(p1, p2), c = mid(a, b);
      flattenQuad(p0, a, c, out);
      flattenQuad(c, b, p2, out);
    }

    /* Bézier-Konturen flachen → geschlossene Polylinien (für Rasterung). */
    function glyphPolylines(ch) {
      var path = font.charToGlyph(ch).getPath(0, 0, upem);
      var cmds = path.commands || [];
      var cont = [], out = [], i, cmd;
      function flush() {
        if (cont.length >= 3) {
          var a = cont[0], z = cont[cont.length - 1];
          if (Math.hypot(a[0] - z[0], a[1] - z[1]) > tol) cont.push([a[0], a[1]]);
          out.push(cont);
        }
        cont = [];
      }
      for (i = 0; i < cmds.length; i++) {
        cmd = cmds[i];
        if (cmd.type === 'M') { flush(); cont = [[cmd.x, cmd.y]]; }
        else if (cmd.type === 'L') { cont.push([cmd.x, cmd.y]); }
        else if (cmd.type === 'Q') { flattenQuad(cont[cont.length - 1], [cmd.x1, cmd.y1], [cmd.x, cmd.y], cont); }
        else if (cmd.type === 'C') { flattenCubic(cont[cont.length - 1], [cmd.x1, cmd.y1], [cmd.x2, cmd.y2], [cmd.x, cmd.y], cont); }
        else if (cmd.type === 'Z') { flush(); }
      }
      flush();
      return out;
    }

    function pointInPolys(x, y, polys) {
      var inside = false, p, i, j;
      for (p = 0; p < polys.length; p++) {
        var pts = polys[p];
        for (i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
          if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
        }
      }
      return inside;
    }

    function strokesFor(ch) {
      if (cache[ch]) return cache[ch];
      var out = [];
      try {
        var polys = glyphPolylines(ch);
        var bb = font.charToGlyph(ch).getPath(0, 0, upem).getBoundingBox();
        if (bb && polys.length && bb.y2 > bb.y1 && bb.x2 > bb.x1) {
          var pad = 2;
          var pxScale = (bb.y2 - bb.y1) / targetH;
          var gw = Math.max(3, Math.ceil((bb.x2 - bb.x1) / pxScale) + pad * 2);
          var gh = Math.max(3, targetH + pad * 2);
          var rows = [], py, px;
          for (py = 0; py < gh; py++) {
            var s = '';
            for (px = 0; px < gw; px++) {
              var gx = bb.x1 + (px - pad + 0.5) * pxScale;
              var gy = bb.y2 - (py - pad + 0.5) * pxScale;   /* Zeile 0 = oben */
              s += pointInPolys(gx, gy, polys) ? '#' : '.';
            }
            rows.push(s);
          }
          var bits = bitmapFromRows(rows, gw, gh);
          var dist = chamferDistance(bits, gw, gh);
          var thin = zhangSuen(bits, gw, gh);
          var skel = traceSkeleton(thin, dist, gw, gh);
          for (var ci = 0; ci < skel.length; ci++) {
            var raw = skel[ci], pts = [], i;
            for (i = 0; i < raw.length; i++) {
              var gx2 = bb.x1 + (raw[i][0] - pad + 0.5) * pxScale;
              var gy2 = bb.y2 - (raw[i][1] - pad + 0.5) * pxScale;
              pts.push([gx2, gy2, raw[i][2] * pxScale]);   /* Breite in upem-Einheiten */
            }
            pts = mergeCollinear(pts, 0.02);
            pts = rdp(pts, tol * 2);
            var segs = polylineToSegs(pts, { minArcPts: 6, arcRms: arcRms, minArcSpan: 25 * Math.PI / 180 });
            if (segs.length >= 2) out.push(segs);
          }
        }
      } catch (e) { out = []; }
      cache[ch] = out;
      return out;
    }

    return {
      name: name,
      cellUnits: upem,
      baselineUnit: upem * 0.22,
      advance: function (ch) {
        if (fixedAdvance != null) return fixedAdvance;
        try { return font.charToGlyph(ch).advanceWidth || upem * 0.6; }
        catch (e) { return upem * 0.6; }
      },
      strokesFor: strokesFor,
    };
  }

  global.StrokeFont = {
    builtin: builtin,
    fromOpentype: fromOpentype,
    _fitCircle: fitCircle,
    _polylineToSegs: polylineToSegs,
    _zhangSuen: zhangSuen,
    _traceSkeleton: traceSkeleton,
    _chamferDistance: chamferDistance,
  };
})(window);