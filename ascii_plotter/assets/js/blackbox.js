/* blackbox.js — Die Hermetische Maschine.
 *
 * GCODE verlässt diese Blackbox nicht mehr als Text. Der gesamte Code lebt
 * intern als strukturierter Befehlsstrom (Maschinen-Plan). Nach außen tritt
 * nur die Kunst: eine Live-Simulation der plotternden Maschine — und, falls
 * verbunden, ein direkter Seriell-Stream an die CNC (GRBL/Marlin).
 *
 * Es gibt keinen Export. Die Maschine zeichnet selbst.
 */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function f3(v) {
    if (!isFinite(v)) v = 0;
    if (Math.abs(v) < 0.0005) v = 0;
    return (Math.round(v * 1000) / 1000).toFixed(3);
  }

  /* --- Bogen-Mathematik (mit der Vorschau geteilt) -------------------------- */

  /* Vorzeichenbehafteter Bogen-Winkel: + für cw, − für ccw, Betrag in [0, 2π). */
  function arcSweep(a0, a1, cw) {
    var d;
    if (cw) { d = (a1 - a0) % TAU; if (d < 0) d += TAU; }
    else    { d = (a0 - a1) % TAU; if (d < 0) d += TAU; d = -d; }
    return d;
  }
  function arcPointAt(cx, cy, r, a0, sweep, frac) {
    var a = a0 + sweep * frac;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  /* --- Plan: Strokes → linearer Befehlsstrom mit Zeiten --------------------- */

  function toPlan(result, params, penWidth) {
    var p = params;
    var lift = clamp(p.lift, 0.1, 50);
    var feedMin = clamp(p.feedMin, 1, p.feedDown);
    function w0(v) { return (v != null && isFinite(v)) ? clamp(v, 0, 1) : 0; }
    function zFor(w) { return -clamp(p.press + w0(w) * p.zGain, 0.05, 4); }
    function fFor(w) { return clamp(p.feedDown + (feedMin - p.feedDown) * w0(w), feedMin, p.feedDown); }

    var moves = [];
    var total = 0;
    var cur = { x: 0, y: 0, z: lift };     /* Welt: X rechts, Y nach unten */
    function push(m) {
      m.feed = clamp(m.feed, 1, 20000);
      m.len = Math.max(m.len, 1e-6);
      m.dur = m.len / m.feed * 60;         /* mm ÷ (mm/min) × 60 = Sekunden */
      m.t0 = total; total += m.dur; m.t1 = total;
      moves.push(m);
    }

    var strokes = result.strokes, i, k, s, t;
    for (i = 0; i < strokes.length; i++) {
      s = strokes[i];
      push({ kind: 'travel', stroke: i, x0: cur.x, y0: cur.y, z0: cur.z,
             x1: s.start[0], y1: s.start[1], z1: cur.z, feed: p.feedUp,
             len: Math.hypot(s.start[0] - cur.x, s.start[1] - cur.y), pen: false });
      cur.x = s.start[0]; cur.y = s.start[1];

      var z0 = zFor(s.startW);
      push({ kind: 'plunge', stroke: i, x0: cur.x, y0: cur.y, z0: cur.z,
             x1: cur.x, y1: cur.y, z1: z0, feed: p.plunge,
             len: Math.abs(z0 - cur.z), pen: true });
      cur.z = z0;

      for (k = 0; k < s.segs.length; k++) {
        t = s.segs[k];
        var tx = t.x, ty = t.y, zz = zFor(t.w), ff = fFor(t.w), len;
        if (t.t === 'L') {
          len = Math.hypot(tx - cur.x, ty - cur.y);
        } else {
          var r = Math.hypot(cur.x - t.cx, cur.y - t.cy);
          var a0 = Math.atan2(cur.y - t.cy, cur.x - t.cx);
          var a1 = Math.atan2(t.y - t.cy, t.x - t.cx);
          len = Math.abs(arcSweep(a0, a1, t.cw)) * r;
        }
        push({ kind: 'draw', stroke: i, seg: t, segIdx: k,
               x0: cur.x, y0: cur.y, z0: cur.z, x1: tx, y1: ty, z1: zz,
               feed: ff, len: len, pen: true });
        cur.x = tx; cur.y = ty; cur.z = zz;
      }

      push({ kind: 'lift', stroke: i, x0: cur.x, y0: cur.y, z0: cur.z,
             x1: cur.x, y1: cur.y, z1: lift, feed: p.plunge,
             len: Math.abs(lift - cur.z), pen: false });
      cur.z = lift;
    }

    push({ kind: 'park', x0: cur.x, y0: cur.y, z0: cur.z,
           x1: 0, y1: 0, z1: cur.z, feed: p.feedUp,
           len: Math.hypot(cur.x, cur.y), pen: false });

    return {
      moves: moves,
      totalTime: total,
      strokeCount: strokes.length,
      lift: lift,
      plunge: clamp(p.plunge, 1, 20000),
    };
  }

  /* Punkt eines Moves bei Fraktion frac (Weltkoordinaten). */
  function movePoint(m, frac) {
    if (m.kind === 'draw' && m.seg && m.seg.t === 'A') {
      var r = Math.hypot(m.x0 - m.seg.cx, m.y0 - m.seg.cy);
      var a0 = Math.atan2(m.y0 - m.seg.cy, m.x0 - m.seg.cx);
      var a1 = Math.atan2(m.seg.y - m.seg.cy, m.seg.x - m.seg.cx);
      return arcPointAt(m.seg.cx, m.seg.cy, r, a0, arcSweep(a0, a1, m.seg.cw), frac);
    }
    return [m.x0 + (m.x1 - m.x0) * frac, m.y0 + (m.y1 - m.y0) * frac];
  }

  /* GCODE-Zeilen eines Moves — intern erzeugt, NIE angezeigt. */
  function moveGcode(m, cur, plan) {
    var lines = [];
    var Ym = -m.y1;                 /* Maschinen-Y = −Welt-Y */
    if (m.kind === 'travel' || m.kind === 'park') {
      lines.push('G0 X' + f3(m.x1) + ' Y' + Ym + ' F' + f3(m.feed));
    } else if (m.kind === 'plunge') {
      lines.push('G1 Z' + f3(m.z1) + ' F' + f3(m.feed));
    } else if (m.kind === 'lift') {
      lines.push('G0 Z' + f3(m.z1));
    } else if (m.kind === 'draw') {
      if (m.seg.t === 'L') {
        if (Math.abs(m.z1 - m.z0) >= 0.005) {
          lines.push('G1 X' + f3(m.x1) + ' Y' + Ym + ' Z' + f3(m.z1) + ' F' + f3(m.feed));
        } else {
          lines.push('G1 X' + f3(m.x1) + ' Y' + Ym + ' F' + f3(m.feed));
        }
      } else {
        var I = m.seg.cx - cur.x;
        var J = -m.seg.cy - cur.y;
        if (Math.abs(m.z1 - m.z0) >= 0.005) {
          lines.push('G1 Z' + f3(m.z1) + ' F' + f3(plan.plunge));
        }
        if (!(Math.abs(I) >= 0.0005 || Math.abs(J) >= 0.0005)) {
          lines.push('G1 X' + f3(m.x1) + ' Y' + Ym + ' F' + f3(m.feed));
        } else {
          lines.push((m.seg.cw ? 'G2' : 'G3') + ' X' + f3(m.x1) + ' Y' + Ym +
            ' I' + f3(I) + ' J' + f3(J) + ' F' + f3(m.feed));
        }
      }
    }
    return lines;
  }

  /* -------------------------------- Maschine ------------------------------- */

  function Machine(plan, opts) {
    opts = opts || {};
    this.plan = plan;
    this.timewarp = opts.timewarp != null ? opts.timewarp : 1;
    this.t = 0;
    this.mode = 'idle';               /* idle | running | paused | done */
    this.onUpdate = null;             /* fn(state)  — pro Frame / Move */
    this.onDone = null;               /* fn(state)  — am Ende */
    this._raf = null;
    this._last = 0;
    this._curIdx = 0;
    this._serial = null;              /* { port, writer, reader, ... } */
    this._serialHold = false;
    this._abortFlag = false;
  }

  Machine.prototype.state = function () {
    var plan = this.plan, moves = plan.moves;
    var t = clamp(this.t, 0, plan.totalTime);
    var idx = this._curIdx || 0;
    while (idx < moves.length - 1 && t >= moves[idx].t1) idx++;
    while (idx > 0 && t < moves[idx].t0) idx--;
    this._curIdx = idx;
    var m = moves[idx];
    var frac = m.dur > 1e-9 ? clamp((t - m.t0) / m.dur, 0, 1) : 1;
    var pt = movePoint(m, frac);
    return {
      t: t,
      totalTime: plan.totalTime,
      progress: plan.totalTime > 1e-9 ? clamp(t / plan.totalTime, 0, 1) : 1,
      moveIdx: idx,
      move: m,
      frac: frac,
      x: pt[0], y: pt[1], z: m.z0 + (m.z1 - m.z0) * frac,
      pen: !!m.pen,
      stroke: m.stroke,
      segIdx: m.segIdx,
      feed: m.feed,
      done: this.mode === 'done',
      running: this.mode === 'running',
    };
  };

  /* --- Uhren-Treiber (Simulation) --- */
  Machine.prototype._startClock = function () {
    var self = this;
    this._last = performance.now();
    var step = function (now) {
      if (self.mode !== 'running') { self._raf = null; return; }
      var dt = (now - self._last) / 1000;
      self._last = now;
      self.t += dt * self.timewarp;
      if (self.t >= self.plan.totalTime) { self.t = self.plan.totalTime; self.mode = 'done'; }
      if (self.onUpdate) self.onUpdate(self.state());
      if (self.mode === 'done') {
        if (self.onDone) self.onDone(self.state());
        self._raf = null;
        return;
      }
      self._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  };

  Machine.prototype.start = function () {
    if (this.mode === 'running') return;
    if (this.t >= this.plan.totalTime - 1e-9) this.t = 0;
    this._curIdx = 0;
    this.mode = 'running';
    this._abortFlag = false;
    this._serialHold = false;
    this._startClock();
    if (this.onUpdate) this.onUpdate(this.state());
  };
  Machine.prototype.resume = function () {
    this._serialHold = false;
    if (this.mode === 'paused') { this.mode = 'running'; this._startClock(); }
  };
  Machine.prototype.pause = function () {
    this._serialHold = true;
    if (this.mode === 'running') this.mode = 'paused';
  };
  Machine.prototype.abort = function () {
    this._abortFlag = true;
    this._serialHold = false;
    if (this._serial) { try { this._serial.port.close(); } catch (e) {} this._serial = null; }
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this.mode = 'idle';
    this.t = 0;
    this._curIdx = 0;
    if (this.onUpdate) this.onUpdate(this.state());
  };
  Machine.prototype.setTimewarp = function (w) { this.timewarp = clamp(w, 0.05, 50); };

  /* --- Seriell-Treiber (echte CNC) --- */
  function serialAvailable() {
    return typeof navigator !== 'undefined' && !!(navigator.serial);
  }

  function connectSerial(baud) {
    baud = baud || 115200;
    if (!serialAvailable()) {
      return Promise.reject(new Error('WebSerial nicht verfügbar — nur Chrome/Edge unter https:// oder localhost.'));
    }
    return navigator.serial.requestPort().then(function (port) {
      return port.open({ baudRate: baud }).then(function () { return port; });
    });
  }

  Machine.prototype.streamSerial = function (port) {
    var self = this;
    this.mode = 'running';
    this.t = 0;
    this._curIdx = 0;
    this._abortFlag = false;
    this._serialHold = false;

    var encoder = new TextEncoder();
    var decoder = new TextDecoder();
    var writer = port.writable.getWriter();
    var reader = port.readable.getReader();
    this._serial = { port: port, writer: writer, reader: reader };

    var ackCount = 0, ackWaiter = null;
    function pushAck(n) {
      ackCount += n;
      if (ackWaiter && ackCount > 0) { ackCount--; var w = ackWaiter; ackWaiter = null; w(); }
    }
    function waitAck() {
      return new Promise(function (res) {
        if (ackCount > 0) { ackCount--; res(); }
        else { ackWaiter = res; }
      });
    }
    function readLoop() {
      reader.read().then(function process(result) {
        if (result.done) return;
        var txt = decoder.decode(result.value, { stream: true });
        var m, c = 0, re = /ok/g;
        while ((m = re.exec(txt))) c++;
        if (c) pushAck(c);
        return reader.read().then(process);
      }).catch(function () {});
    }
    readLoop();

    (async function sendLoop() {
      var moves = self.plan.moves;
      var cur = { x: 0, y: 0 };                       /* Maschinen-Koordinaten */
      var init = ['G21', 'G90', 'G0 Z' + f3(self.plan.lift)];
      try {
        await writer.write(encoder.encode('\r\n\r\n'));
        await waitAck();
        var j, l;
        for (j = 0; j < init.length && !self._abortFlag; j++) {
          await writer.write(encoder.encode(init[j] + '\n'));
          await waitAck();
        }
        for (var i = 0; i < moves.length && !self._abortFlag; i++) {
          while (self._serialHold && !self._abortFlag) { await sleep(50); }
          if (self._abortFlag) break;
          var m = moves[i];
          var lines = moveGcode(m, cur, self.plan);
          for (l = 0; l < lines.length; l++) {
            if (self._abortFlag) break;
            await writer.write(encoder.encode(lines[l] + '\n'));
            await waitAck();
          }
          cur = { x: m.x1, y: -m.y1 };
          self.t = m.t1;
          self._curIdx = i;
          if (self.onUpdate) self.onUpdate(self.state());
        }
        if (!self._abortFlag) {
          await writer.write(encoder.encode('M30\n'));
        }
      } catch (e) {
        /* Stream abgebrochen (Abbruch / Trennung). */
      } finally {
        try { writer.releaseLock(); } catch (e) {}
        try { reader.releaseLock(); } catch (e) {}
        self._serial = null;
        if (self._abortFlag) { self.mode = 'idle'; }
        else { self.mode = 'done'; if (self.onDone) self.onDone(self.state()); }
        if (self.onUpdate) self.onUpdate(self.state());
      }
    })();
  };

  function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  global.Blackbox = {
    toPlan: toPlan,
    Machine: Machine,
    arcSweep: arcSweep,
    arcPointAt: arcPointAt,
    movePoint: movePoint,
    serialAvailable: serialAvailable,
    connectSerial: connectSerial,
  };
})(window);
