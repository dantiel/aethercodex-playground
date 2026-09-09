var root;

root = typeof globalThis !== 'undefined' ? globalThis : window;

if (root.DINO == null) {
  root.DINO = {};
}

(function(root){ root.DINO.ART = "### hero_run\n      __\n     /  \\___\n    / o  o  \\_\n    \\   --   |\n     \\      _|\n      \\    |\n       \\   \\_\n        |   |\n       _|   |\n      |_|   |_\n       |____|\n@@@\n      __\n     /  \\___\n    / o  o  \\_\n    \\   --   |\n     \\      _|\n      \\    |\n       \\   \\_\n        |   |\n       _|   |\n      |_|   |\n        |__|\n@@@\n      __\n     /  \\___\n    / o  o  \\_\n    \\   --   |\n     \\      _|\n      \\    |\n       \\   \\_\n        |   |\n       _|   |\n      |_|   |\n       |____|\n@@@\n      __\n     /  \\___\n    / o  o  \\_\n    \\   --   |\n     \\      _|\n      \\    |\n       \\   \\_\n        |   |\n       _|   |\n      |_|   |\n        |__|\n\n### hero_jump\n      __\n     /  \\___\n    / o  o  \\_\n    \\   --   |\n     \\      _|\n      \\    |\n       \\   \\_\n        |   |\n        |___|\n       _|   |_\n\n### hero_duck\n      __\n     /  \\___\n    / o  o  \\_\n    \\   --   |\n     \\_    __|\n       \\__/\n       /  \\_\n      |    |\n      |____|\n\n### hero_attack\n      __\n  ___/  \\\n_/  o  o \\\n|   __   |__\n \\/  \\__/   \\_\n   \\    \\____\\\n    \\   \\_\n     |   |\n     |   |_\n    _|   |_|\n     |____|\n\n### hero_dead\n      __\n     /  \\___\n    / X  X  \\_\n    \\   --   |\n     \\      _|\n      \\    |\n       \\   \\_\n        |   |\n       _|   |\n      |_|   |_\n\n### raptor\n    ___\n   /o  \\___\n   \\--    \\_\n    \\_    _/\n     |    |\n    _|    |_\n   |_|    |_|\n@@@\n    ___\n   /o  \\___\n   \\--    \\_\n    \\_    _/\n     |    |\n    _|    |_\n    |_    |_|\n       |__|\n@@@\n    ___\n   /o  \\___\n   \\--    \\_\n    \\_    _/\n     |    |\n    _|    |_\n   |_|    |_|\n       |__|\n\n### ptero\n      __\n     /o \\___\n    / --    \\___\n    \\_     _/   \\_\n      \\___/      \\\n@@@\n      __\n     /o \\___\n    / --    \\___\n    \\_     _/   \\_\n      \\___/     \\\n@@@\n      __\n     /o \\___\n    / --    \\___\n    \\_     _/   \\_\n      \\___/      \\_\n\n### cactus\n    __\n   /  \\_\n   |  |\n   |  |\n  _|  |_\n |_    _|\n   |  |\n   |  |\n  _|  |_\n |     |\n  \\   /\n   |_|\n\n### cactus_large\n     __\n    /  \\_\n    |  |\n    |  |\n   _|  |_\n  |_    _|\n    |  |\n    |  |\n   _|  |_\n  |_    _|\n    |  |\n    |  |\n   _|  |_\n  |_    _|\n    |  |\n   _|  |_\n  |_    _|\n    \\  /\n     |_|\n\n### tree\n      __\n    _/  \\_\n   /  oo  \\_\n   \\  --   |\n    \\_  __/\n      | |\n      | |\n     _| |_\n    |_   _|\n      |_|\n\n### cloud\n    ___\n  _(   )_\n (__   __)\n    (_)\n\n### sun\n   \\ | /\n  --( )--\n   / | \\\n\n### triceratops\n      ______\n   __/ o  o \\___\n  /  \\  --  /   \\_\n  \\   \\____/     /\n   \\_    __     /\n     \\__/  \\___/\n     /  \\_\n    |    |\n   _|    |_\n  |_|    |_|\n    |____|\n\n### brachiosaur\n      __\n     /o \\___\n    / --    \\___\n   \\_       /   \\_\n     \\_____/     |\n       /  \\      |\n      |    |     |\n     _|    |_    |\n    |_|    |_|   |\n      |     |___/"; })(typeof globalThis!=='undefined'?globalThis:window);

var Game,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

DINO.COLORS = {
  palettes: [
    {
      sky: '#7EC8E3',
      sun: '#FFD166',
      cloud: '#EAF6FF',
      cloudShade: '#B8D8EA',
      mountainFar: '#8FA6C9',
      mountainNear: '#5C6E9C',
      ground: '#D9A441',
      groundDark: '#B9863B',
      groundTop: '#8A5C1E',
      cactus: '#2E9E5B',
      tree: '#3AA65C',
      hero: '#0E7C31',
      heroDark: '#0A5C24',
      raptor: '#C62828',
      ptero: '#6A1B9A',
      triceratops: '#7B5B3A',
      brachiosaur: '#4C6B4A',
      text: '#1B2A4A',
      textDim: '#40526E'
    }, {
      sky: '#2B1B4A',
      sun: '#FF9E5E',
      cloud: '#5A4A7A',
      cloudShade: '#46385F',
      mountainFar: '#4A3B6B',
      mountainNear: '#372A52',
      ground: '#8A5A3B',
      groundDark: '#6E462E',
      groundTop: '#4A2E1C',
      cactus: '#3FBF6B',
      tree: '#4AC97A',
      hero: '#5FE08C',
      heroDark: '#3CAE68',
      raptor: '#FF6B6B',
      ptero: '#C77DFF',
      triceratops: '#A07B5A',
      brachiosaur: '#6B8A6B',
      text: '#F5E9FF',
      textDim: '#BBA8D8'
    }, {
      sky: '#0B1026',
      sun: '#F4F1DE',
      cloud: '#1F2A4A',
      cloudShade: '#162038',
      mountainFar: '#22304F',
      mountainNear: '#18233C',
      ground: '#5C4A2A',
      groundDark: '#463818',
      groundTop: '#33280F',
      cactus: '#2FBF71',
      tree: '#38C87C',
      hero: '#45E08C',
      heroDark: '#2BA768',
      raptor: '#FF5E5E',
      ptero: '#B07DFF',
      triceratops: '#6E563A',
      brachiosaur: '#3E5A3E',
      text: '#E8F0FF',
      textDim: '#8FA0C0'
    }
  ]
};

DINO.parseArt = function(text) {
  var cur, flush, frame, j, len, line, ref, sprite, sprites;
  sprites = {};
  cur = null;
  sprite = [];
  frame = [];
  flush = function() {
    if ((cur != null) && (frame.length || sprite.length)) {
      if (frame.length) {
        sprite.push(frame);
      }
      return sprites[cur] = sprite;
    }
  };
  ref = text.split('\n');
  for (j = 0, len = ref.length; j < len; j++) {
    line = ref[j];
    if (line.slice(0, 4) === '### ') {
      flush();
      cur = line.slice(4).trim();
      sprite = [];
      frame = [];
    } else if (line.trim() === '@@@') {
      if (frame.length) {
        sprite.push(frame);
      }
      frame = [];
    } else if (cur != null) {
      frame.push(line.replace(/\s+$/, ''));
    }
  }
  flush();
  return sprites;
};

DINO.MIRROR = ['hero_run', 'hero_jump', 'hero_duck', 'hero_dead'];

DINO.mirrorFrames = function(frames) {
  var c, chars, f, j, k, l, len, len1, len2, len3, line, m, map, nf, out, row, w;
  w = 0;
  for (j = 0, len = frames.length; j < len; j++) {
    f = frames[j];
    for (k = 0, len1 = f.length; k < len1; k++) {
      row = f[k];
      w = Math.max(w, row.length);
    }
  }
  map = {
    '\\': '/',
    '/': '\\',
    '(': ')',
    ')': '(',
    '<': '>',
    '>': '<',
    '[': ']',
    ']': '[',
    '{': '}',
    '}': '{'
  };
  out = [];
  for (l = 0, len2 = frames.length; l < len2; l++) {
    f = frames[l];
    nf = [];
    for (m = 0, len3 = f.length; m < len3; m++) {
      row = f[m];
      line = row;
      while (line.length < w) {
        line += ' ';
      }
      chars = line.split('').reverse();
      nf.push(((function() {
        var len4, o, ref, results;
        results = [];
        for (o = 0, len4 = chars.length; o < len4; o++) {
          c = chars[o];
          results.push((ref = map[c]) != null ? ref : c);
        }
        return results;
      })()).join(''));
    }
    out.push(nf);
  }
  return out;
};

DINO.buildSprites = function(art) {
  var f, frames, h, i, j, k, l, len, len1, len2, m, name, norm, o, out, q, raw, ref, ref1, ref2, ref3, row, rows, solid, w, xx, yy;
  raw = DINO.parseArt(art);
  out = {};
  for (name in raw) {
    frames = raw[name];
    if (indexOf.call(DINO.MIRROR, name) >= 0) {
      frames = DINO.mirrorFrames(frames);
    }
    w = 0;
    h = 0;
    for (j = 0, len = frames.length; j < len; j++) {
      f = frames[j];
      for (k = 0, len1 = f.length; k < len1; k++) {
        row = f[k];
        w = Math.max(w, row.length);
      }
      h = Math.max(h, f.length);
    }
    norm = [];
    for (l = 0, len2 = frames.length; l < len2; l++) {
      f = frames[l];
      rows = [];
      for (i = m = 0, ref = h; 0 <= ref ? m < ref : m > ref; i = 0 <= ref ? ++m : --m) {
        row = (ref1 = f[i]) != null ? ref1 : '';
        while (row.length < w) {
          row += ' ';
        }
        rows.push(row);
      }
      solid = [];
      for (yy = o = 0, ref2 = h; 0 <= ref2 ? o < ref2 : o > ref2; yy = 0 <= ref2 ? ++o : --o) {
        for (xx = q = 0, ref3 = w; 0 <= ref3 ? q < ref3 : q > ref3; xx = 0 <= ref3 ? ++q : --q) {
          if (rows[yy][xx] !== ' ') {
            solid.push([xx, yy]);
          }
        }
      }
      norm.push({
        rows: rows,
        solid: solid
      });
    }
    out[name] = {
      frames: norm,
      w: w,
      h: h
    };
  }
  return out;
};

Game = (function() {
  function Game(cols1, rows1, sprites1) {
    this.cols = cols1;
    this.rows = rows1;
    this.sprites = sprites1;
    this.palettes = DINO.COLORS.palettes;
    this.palIdx = 0;
    this.input = {
      jump: false,
      duck: false,
      attack: false
    };
    this.reset();
  }

  Game.prototype.palette = function() {
    return this.palettes[this.palIdx];
  };

  Game.prototype.reset = function() {
    this.time = 0;
    this.baseSpeed = 7;
    this.maxSpeed = 26;
    this.accel = 0.35;
    this.speed = this.baseSpeed;
    this.score = 0;
    this.gameOver = false;
    this.spawnTimer = 1.4;
    this.groundY = this.rows - 1;
    this.groundOffset = 0;
    this.entities = [];
    this.bgDinos = [];
    this.clouds = [];
    this.mountFar = {
      offset: 0
    };
    this.mountNear = {
      offset: 0
    };
    this.player = this.makePlayer();
    return this.initClouds();
  };

  Game.prototype.makePlayer = function() {
    var stand;
    stand = this.sprites.hero_run;
    return {
      x: 8,
      w: stand.w,
      standH: stand.h,
      duckH: this.sprites.hero_duck.h,
      h: stand.h,
      y: this.groundY - stand.h + 1,
      vy: 0,
      onGround: true,
      state: 'run',
      animT: 0,
      frame: 0,
      attackT: 0
    };
  };

  Game.prototype.initClouds = function() {
    var i, j, results;
    this.clouds = [];
    results = [];
    for (i = j = 0; j < 5; i = ++j) {
      results.push(this.clouds.push({
        x: Math.random() * this.cols,
        y: 1 + Math.random() * (this.groundY * 0.45),
        speed: 0.2 + Math.random() * 0.15
      }));
    }
    return results;
  };

  Game.prototype.jump = function() {
    return this.input.jump = true;
  };

  Game.prototype.duck = function() {
    return this.input.duck = !this.input.duck;
  };

  Game.prototype.attack = function() {
    return this.input.attack = true;
  };

  Game.prototype.cyclePalette = function() {
    return this.palIdx = (this.palIdx + 1) % this.palettes.length;
  };

  Game.prototype.resize = function(cols, rows) {
    var e, j, len, ref;
    this.cols = cols;
    this.rows = rows;
    this.groundY = rows - 1;
    ref = this.entities;
    for (j = 0, len = ref.length; j < len; j++) {
      e = ref[j];
      if (e.ground) {
        e.y = this.groundY - e.h + 1;
      }
    }
    if (this.player.onGround) {
      return this.player.y = this.groundY - this.player.h + 1;
    }
  };

  Game.prototype.step = function(dt) {
    if (this.gameOver) {
      return;
    }
    this.time += dt;
    this.speed = Math.min(this.maxSpeed, this.baseSpeed + this.time * this.accel);
    this.updatePlayer(dt);
    this.updateEntities(dt);
    this.spawner(dt);
    this.updateParallax(dt);
    this.collide();
    return this.score += this.speed * dt * 0.1;
  };

  Game.prototype.playerSpriteName = function() {
    var p;
    p = this.player;
    if (p.state === 'dead') {
      return 'hero_dead';
    }
    if (p.attackT > 0) {
      return 'hero_attack';
    }
    if (p.state === 'duck') {
      return 'hero_duck';
    }
    if (p.state === 'jump') {
      return 'hero_jump';
    }
    return 'hero_run';
  };

  Game.prototype.playerFrameIdx = function() {
    var n;
    n = this.sprites[this.playerSpriteName()].frames.length;
    return Math.min(this.player.frame, n - 1);
  };

  Game.prototype.updatePlayer = function(dt) {
    var p, targetH;
    p = this.player;
    if (p.state === 'dead') {
      return;
    }
    if (this.input.duck && p.onGround) {
      p.state = 'duck';
      p.frame = 0;
    } else if (p.state === 'duck') {
      p.state = 'run';
    }
    if (this.input.attack && p.attackT <= 0) {
      p.attackT = 0.30;
      p.frame = 0;
    }
    this.input.attack = false;
    if (p.attackT > 0) {
      p.attackT -= dt;
    }
    if (this.input.jump && p.onGround) {
      p.vy = -15;
      p.onGround = false;
      p.state = 'jump';
      p.frame = 0;
    }
    this.input.jump = false;
    if (!p.onGround) {
      p.vy += 52 * dt;
      p.y += p.vy * dt;
      if (p.y >= this.groundY - p.h + 1) {
        p.y = this.groundY - p.h + 1;
        p.vy = 0;
        p.onGround = true;
        p.state = 'run';
      }
    }
    targetH = p.state === 'duck' ? p.duckH : p.standH;
    if (p.h !== targetH) {
      p.h = targetH;
      if (p.onGround) {
        p.y = this.groundY - targetH + 1;
      }
    }
    if (p.state === 'run') {
      p.animT += dt;
      return p.frame = Math.floor(p.animT / 0.12) % this.sprites.hero_run.frames.length;
    }
  };

  Game.prototype.pickKind = function() {
    var r;
    r = Math.random();
    if (r < 0.34) {
      return 'cactus';
    } else if (r < 0.54) {
      return 'cactus_large';
    } else if (r < 0.68) {
      return 'tree';
    } else if (r < 0.80) {
      return 'ptero';
    } else if (r < 0.92) {
      return 'raptor';
    } else {
      return 'triceratops';
    }
  };

  Game.prototype.spawn = function() {
    var e, kind, spr;
    kind = this.pickKind();
    spr = this.sprites[kind];
    e = {
      kind: kind,
      x: this.cols + 3,
      w: spr.w,
      h: spr.h,
      frame: 0,
      animT: Math.random() * 10,
      dx: 0,
      dead: false,
      ground: true,
      solid: true
    };
    if (kind === 'raptor') {
      e.dx = -3.5;
    }
    if (kind === 'ptero') {
      e.ground = false;
      e.baseY = this.groundY - spr.h - 2 - Math.random() * 5;
      e.y = e.baseY;
    } else {
      e.y = this.groundY - spr.h + 1;
    }
    return this.entities.push(e);
  };

  Game.prototype.spawner = function(dt) {
    var base, s;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn();
      base = 1.7 / (1 + this.speed * 0.035);
      this.spawnTimer = base * (0.55 + Math.random() * 0.9);
    }
    if (Math.random() < dt * 0.08) {
      s = this.sprites.brachiosaur;
      return this.bgDinos.push({
        x: this.cols + 2,
        y: this.groundY - s.h + 1,
        frame: 0,
        animT: 0,
        speed: 0.45
      });
    }
  };

  Game.prototype.updateEntities = function(dt) {
    var e, j, len, ref, ref1, s;
    ref = this.entities;
    for (j = 0, len = ref.length; j < len; j++) {
      e = ref[j];
      e.x -= (this.speed + ((ref1 = e.dx) != null ? ref1 : 0)) * dt;
      e.animT += dt;
      s = this.sprites[e.kind];
      e.frame = Math.floor(e.animT / 0.16) % s.frames.length;
      if (e.kind === 'ptero') {
        e.y = e.baseY + Math.sin(this.time * 3 + e.x * 0.3) * 1.4;
      }
    }
    return this.entities = this.entities.filter(function(e) {
      return e.x + e.w > -4 && !e.dead;
    });
  };

  Game.prototype.updateParallax = function(dt) {
    var b, bw, c, j, k, len, len1, ref, ref1;
    this.groundOffset += this.speed * dt;
    this.mountFar.offset += this.speed * 0.25 * dt;
    this.mountNear.offset += this.speed * 0.5 * dt;
    ref = this.clouds;
    for (j = 0, len = ref.length; j < len; j++) {
      c = ref[j];
      c.x -= this.speed * c.speed * dt;
      if (c.x + this.sprites.cloud.w < 0) {
        c.x = this.cols + Math.random() * this.cols * 0.6;
        c.y = 1 + Math.random() * (this.groundY * 0.45);
      }
    }
    ref1 = this.bgDinos;
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      b = ref1[k];
      b.x -= this.speed * b.speed * dt;
      b.animT += dt;
    }
    bw = this.sprites.brachiosaur.w;
    return this.bgDinos = this.bgDinos.filter(function(b) {
      return b.x + bw > -2;
    });
  };

  Game.prototype.boxOverlap = function(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  Game.prototype.spriteOverlap = function(a, b) {
    var aax, aay, bbx, bby, j, k, len, len1, ref, ref1, ref2, ref3, sx, sy, tx, ty, wx, wy;
    aax = Math.floor(a.x);
    aay = Math.floor(a.y);
    bbx = Math.floor(b.x);
    bby = Math.floor(b.y);
    if (!(aax < bbx + b.w && aax + a.w > bbx && aay < bby + b.h && aay + a.h > bby)) {
      return false;
    }
    ref = a.solid;
    for (j = 0, len = ref.length; j < len; j++) {
      ref1 = ref[j], sx = ref1[0], sy = ref1[1];
      wx = aax + sx;
      wy = aay + sy;
      ref2 = b.solid;
      for (k = 0, len1 = ref2.length; k < len1; k++) {
        ref3 = ref2[k], tx = ref3[0], ty = ref3[1];
        if (wx === (bbx + tx) && wy === (bby + ty)) {
          return true;
        }
      }
    }
    return false;
  };

  Game.prototype.collide = function() {
    var attackBox, e, eSpr, j, len, p, pBox, pSpr, ref, ref1, results;
    p = this.player;
    pSpr = this.sprites[this.playerSpriteName()].frames[this.playerFrameIdx()];
    pBox = {
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      solid: pSpr.solid
    };
    attackBox = null;
    if (p.attackT > 0) {
      attackBox = {
        x: p.x + p.w,
        y: p.y - 1,
        w: 5,
        h: p.h + 2
      };
    }
    ref = this.entities;
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      e = ref[j];
      if (e.dead || !e.solid) {
        continue;
      }
      eSpr = this.sprites[e.kind].frames[e.frame];
      if (((ref1 = e.kind) === 'raptor' || ref1 === 'ptero') && (attackBox != null) && this.boxOverlap(attackBox, {
        x: e.x,
        y: e.y,
        w: e.w,
        h: e.h
      })) {
        e.dead = true;
        this.score += 100;
        continue;
      }
      if (this.spriteOverlap(pBox, {
        x: e.x,
        y: e.y,
        w: e.w,
        h: e.h,
        solid: eSpr.solid
      })) {
        this.die();
        break;
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  Game.prototype.die = function() {
    if (this.gameOver) {
      return;
    }
    this.gameOver = true;
    this.player.state = 'dead';
    return this.player.frame = 0;
  };

  Game.prototype.render = function() {
    var grid, pal;
    pal = this.palette();
    grid = this.blankGrid(pal.sky);
    this.drawSun(grid, pal);
    this.drawClouds(grid, pal);
    this.drawMountains(grid, pal, 'far');
    this.drawMountains(grid, pal, 'near');
    this.drawBrachiosaurs(grid, pal);
    this.drawGround(grid, pal);
    this.drawEntities(grid, pal);
    this.drawPlayer(grid, pal);
    this.drawHud(grid, pal);
    if (this.gameOver) {
      this.drawGameOver(grid, pal);
    }
    return grid;
  };

  Game.prototype.blankGrid = function(sky) {
    var bg, brow, fg, frow, j, k, ref, ref1, text, trow, x, y;
    text = [];
    fg = [];
    bg = [];
    for (y = j = 0, ref = this.rows; 0 <= ref ? j < ref : j > ref; y = 0 <= ref ? ++j : --j) {
      trow = [];
      frow = [];
      brow = [];
      for (x = k = 0, ref1 = this.cols; 0 <= ref1 ? k < ref1 : k > ref1; x = 0 <= ref1 ? ++k : --k) {
        trow.push(' ');
        frow.push(null);
        brow.push(sky);
      }
      text.push(trow);
      fg.push(frow);
      bg.push(brow);
    }
    return {
      w: this.cols,
      h: this.rows,
      text: text,
      fg: fg,
      bg: bg
    };
  };

  Game.prototype.setCell = function(grid, x, y, ch, fg) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      grid.text[y][x] = ch;
      return grid.fg[y][x] = fg;
    }
  };

  Game.prototype.drawSprite = function(grid, name, x, y, color, frameIdx) {
    var ch, f, fx, fy, gx, gy, j, ref, results, row, spr, xx, yy;
    spr = this.sprites[name];
    f = spr.frames[frameIdx != null ? frameIdx : 0];
    fx = Math.floor(x);
    fy = Math.floor(y);
    results = [];
    for (yy = j = 0, ref = spr.h; 0 <= ref ? j < ref : j > ref; yy = 0 <= ref ? ++j : --j) {
      row = f.rows[yy];
      gy = fy + yy;
      if (gy < 0 || gy >= this.rows) {
        continue;
      }
      results.push((function() {
        var k, ref1, results1;
        results1 = [];
        for (xx = k = 0, ref1 = spr.w; 0 <= ref1 ? k < ref1 : k > ref1; xx = 0 <= ref1 ? ++k : --k) {
          ch = row[xx];
          if (ch === ' ') {
            continue;
          }
          gx = fx + xx;
          if (gx >= 0 && gx < this.cols) {
            grid.text[gy][gx] = ch;
            results1.push(grid.fg[gy][gx] = color);
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }).call(this));
    }
    return results;
  };

  Game.prototype.drawSun = function(grid, pal) {
    var s;
    s = this.sprites.sun;
    return this.drawSprite(grid, 'sun', this.cols - s.w - 4, 2, pal.sun, 0);
  };

  Game.prototype.drawClouds = function(grid, pal) {
    var c, j, len, ref, results;
    ref = this.clouds;
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      c = ref[j];
      results.push(this.drawSprite(grid, 'cloud', c.x, c.y, pal.cloud, 0));
    }
    return results;
  };

  Game.prototype.drawBrachiosaurs = function(grid, pal) {
    var b, j, len, ref, results;
    ref = this.bgDinos;
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      b = ref[j];
      results.push(this.drawSprite(grid, 'brachiosaur', b.x, b.y, pal.brachiosaur, 0));
    }
    return results;
  };

  Game.prototype.drawMountains = function(grid, pal, layer) {
    var baseY, cfg, h, j, local, ref, results, topY, wx, x, y;
    cfg = layer === 'far' ? {
      p: 26,
      amp: this.rows * 0.32,
      color: pal.mountainFar,
      offset: this.mountFar.offset
    } : {
      p: 16,
      amp: this.rows * 0.20,
      color: pal.mountainNear,
      offset: this.mountNear.offset
    };
    baseY = this.groundY;
    results = [];
    for (x = j = 0, ref = this.cols; 0 <= ref ? j < ref : j > ref; x = 0 <= ref ? ++j : --j) {
      wx = x + Math.floor(cfg.offset);
      local = wx % cfg.p;
      h = local <= cfg.p / 2 ? cfg.amp * (local / (cfg.p / 2)) : cfg.amp * (1 - (local - cfg.p / 2) / (cfg.p / 2));
      topY = baseY - Math.floor(h);
      results.push((function() {
        var k, ref1, ref2, results1;
        results1 = [];
        for (y = k = ref1 = topY, ref2 = baseY; ref1 <= ref2 ? k < ref2 : k > ref2; y = ref1 <= ref2 ? ++k : --k) {
          if (y >= 0 && y < this.rows) {
            grid.bg[y][x] = cfg.color;
            grid.text[y][x] = ' ';
            results1.push(grid.fg[y][x] = cfg.color);
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }).call(this));
    }
    return results;
  };

  Game.prototype.drawGround = function(grid, pal) {
    var goff, j, ref, results, wx, x, y;
    goff = Math.floor(this.groundOffset);
    results = [];
    for (x = j = 0, ref = this.cols; 0 <= ref ? j < ref : j > ref; x = 0 <= ref ? ++j : --j) {
      wx = x + goff;
      grid.bg[this.groundY][x] = pal.groundDark;
      grid.text[this.groundY][x] = wx % 6 === 0 ? '~' : '_';
      grid.fg[this.groundY][x] = pal.groundTop;
      results.push((function() {
        var k, ref1, ref2, results1;
        results1 = [];
        for (y = k = ref1 = this.groundY + 1, ref2 = this.rows; ref1 <= ref2 ? k < ref2 : k > ref2; y = ref1 <= ref2 ? ++k : --k) {
          grid.bg[y][x] = pal.ground;
          if ((wx + y) % 5 === 0) {
            grid.text[y][x] = '.';
            results1.push(grid.fg[y][x] = pal.groundDark);
          } else if ((wx - y) % 9 === 0) {
            grid.text[y][x] = ':';
            results1.push(grid.fg[y][x] = pal.groundDark);
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }).call(this));
    }
    return results;
  };

  Game.prototype.entityColor = function(kind, pal) {
    switch (kind) {
      case 'cactus':
      case 'cactus_large':
        return pal.cactus;
      case 'tree':
        return pal.tree;
      case 'raptor':
        return pal.raptor;
      case 'ptero':
        return pal.ptero;
      case 'triceratops':
        return pal.triceratops;
      default:
        return pal.text;
    }
  };

  Game.prototype.drawEntities = function(grid, pal) {
    var e, j, len, ref, results;
    ref = this.entities;
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      e = ref[j];
      results.push(this.drawSprite(grid, e.kind, e.x, e.y, this.entityColor(e.kind, pal), e.frame));
    }
    return results;
  };

  Game.prototype.drawPlayer = function(grid, pal) {
    var p;
    p = this.player;
    return this.drawSprite(grid, this.playerSpriteName(), p.x, p.y, pal.hero, this.playerFrameIdx());
  };

  Game.prototype.drawHud = function(grid, pal) {
    var i, j, msg, ref, results;
    msg = "SCORE " + (Math.floor(this.score)) + "  SPEED " + (this.speed.toFixed(1)) + "  [SPACE]jump [S]duck [A]attack [B]sky [R]restart";
    results = [];
    for (i = j = 0, ref = msg.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      if (i >= this.cols) {
        break;
      }
      grid.text[0][i] = msg[i];
      results.push(grid.fg[0][i] = pal.text);
    }
    return results;
  };

  Game.prototype.drawGameOver = function(grid, pal) {
    var gx, i, j, msg, ref, results, x, y;
    msg = "GAME OVER — score " + (Math.floor(this.score)) + " — press R to restart";
    y = Math.floor(this.rows / 2);
    x = Math.floor((this.cols - msg.length) / 2);
    results = [];
    for (i = j = 0, ref = msg.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      gx = x + i;
      if (gx >= 0 && gx < this.cols) {
        grid.text[y][gx] = msg[i];
        results.push(grid.fg[y][gx] = pal.text);
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  return Game;

})();

DINO.Game = Game;

DINO.buildSprites = DINO.buildSprites;

var ansi, ansiCache, cleanup, cols, draw, f, game, hexToRgb, i, last, readline, ref, ref1, ref2, ref3, ref4, rows, sprites, x, y;

readline = require('readline');

cols = parseInt((ref = process.env.DINO_COLS) != null ? ref : (ref1 = process.stdout.columns) != null ? ref1 : 80, 10);

rows = parseInt((ref2 = process.env.DINO_ROWS) != null ? ref2 : ((ref3 = process.stdout.rows) != null ? ref3 : 24) - 1, 10);

rows = Math.max(12, rows);

sprites = DINO.buildSprites(DINO.ART);

game = new DINO.Game(cols, rows, sprites);

hexToRgb = function(hex) {
  var c, h;
  h = hex.replace('#', '');
  if (h.length === 3) {
    h = ((function() {
      var i, len, results;
      results = [];
      for (i = 0, len = h.length; i < len; i++) {
        c = h[i];
        results.push(c + c);
      }
      return results;
    })()).join('');
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

ansiCache = {};

ansi = function(fg, bg) {
  var br, fr, key;
  key = fg + '|' + bg;
  if (ansiCache[key] != null) {
    return ansiCache[key];
  }
  fr = hexToRgb(fg);
  br = hexToRgb(bg);
  return ansiCache[key] = "\x1b[38;2;" + fr[0] + ";" + fr[1] + ";" + fr[2] + ";48;2;" + br[0] + ";" + br[1] + ";" + br[2] + "m";
};

draw = function(frame) {
  var bg, curBg, curFg, fg, i, j, out, ref4, ref5, ref6, x, y;
  out = '\x1b[H\x1b[0m';
  curFg = null;
  curBg = null;
  for (y = i = 0, ref4 = frame.h; 0 <= ref4 ? i < ref4 : i > ref4; y = 0 <= ref4 ? ++i : --i) {
    for (x = j = 0, ref5 = frame.w; 0 <= ref5 ? j < ref5 : j > ref5; x = 0 <= ref5 ? ++j : --j) {
      fg = (ref6 = frame.fg[y][x]) != null ? ref6 : frame.bg[y][x];
      bg = frame.bg[y][x];
      if (fg !== curFg || bg !== curBg) {
        out += ansi(fg, bg);
        curFg = fg;
        curBg = bg;
      }
      out += frame.text[y][x];
    }
    out += '\n';
  }
  out += '\x1b[0m';
  return process.stdout.write(out);
};

cleanup = function() {
  process.stdout.write('\x1b[0m\x1b[?25h\x1b[2J\x1b[H');
  if (process.stdin.isTTY) {
    return process.stdin.setRawMode(false);
  }
};

if (process.env.DINO_FRAME) {
  game.step(0.016);
  f = game.render();
  for (y = i = 0, ref4 = f.h; 0 <= ref4 ? i < ref4 : i > ref4; y = 0 <= ref4 ? ++i : --i) {
    console.log(((function() {
      var j, ref5, results;
      results = [];
      for (x = j = 0, ref5 = f.w; 0 <= ref5 ? j < ref5 : j > ref5; x = 0 <= ref5 ? ++j : --j) {
        results.push(f.text[y][x]);
      }
      return results;
    })()).join(''));
  }
  process.exit(0);
}

process.stdout.write('\x1b[?25l');

readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.resume();

process.stdin.setEncoding('utf8');

process.stdin.on('keypress', function(str, key) {
  if (!key) {
    return;
  }
  if (key.ctrl && key.name === 'c') {
    cleanup();
    process.exit(0);
  }
  switch (key.name) {
    case 'up':
    case 'space':
      return game.jump();
    case 'down':
      return game.duck();
    case 's':
      return game.duck();
    case 'a':
    case 'j':
    case 'x':
      return game.attack();
    case 'b':
    case 'c':
      return game.cyclePalette();
    case 'r':
      return game.reset();
    case 'q':
      cleanup();
      return process.exit(0);
  }
});

process.stdout.on('resize', function() {
  return game.resize(process.stdout.columns, process.stdout.rows - 1);
});

process.on('SIGINT', function() {
  cleanup();
  return process.exit(0);
});

process.on('SIGTERM', function() {
  cleanup();
  return process.exit(0);
});

last = Date.now();

setInterval(function() {
  var dt, now;
  now = Date.now();
  dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.step(dt);
  return draw(game.render());
}, Math.floor(1000 / 30));
