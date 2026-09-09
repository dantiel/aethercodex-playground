# core.coffee — ASCII Dino engine (pure, no I/O).
# The same Game runs in a terminal (ANSI) and in a browser (canvas), both consuming
# the identical ASCII stream produced by `render()`.

# ---------------------------------------------------------------------------
# Palettes — each one re-skins sky, sun, mountains, ground, dino and HUD.
# ---------------------------------------------------------------------------
DINO.COLORS =
  palettes: [
    { # 0 — Dawn (day)
      sky:        '#7EC8E3'
      sun:        '#FFD166'
      cloud:      '#EAF6FF'
      cloudShade: '#B8D8EA'
      mountainFar:'#8FA6C9'
      mountainNear:'#5C6E9C'
      ground:     '#D9A441'
      groundDark: '#B9863B'
      groundTop:  '#8A5C1E'
      cactus:     '#2E9E5B'
      tree:       '#3AA65C'
      hero:       '#0E7C31'
      heroDark:   '#0A5C24'
      raptor:     '#C62828'
      ptero:      '#6A1B9A'
      triceratops:'#7B5B3A'
      brachiosaur:'#4C6B4A'
      text:       '#1B2A4A'
      textDim:    '#40526E'
    }
    { # 1 — Dusk
      sky:        '#2B1B4A'
      sun:        '#FF9E5E'
      cloud:      '#5A4A7A'
      cloudShade: '#46385F'
      mountainFar:'#4A3B6B'
      mountainNear:'#372A52'
      ground:     '#8A5A3B'
      groundDark: '#6E462E'
      groundTop:  '#4A2E1C'
      cactus:     '#3FBF6B'
      tree:       '#4AC97A'
      hero:       '#5FE08C'
      heroDark:   '#3CAE68'
      raptor:     '#FF6B6B'
      ptero:      '#C77DFF'
      triceratops:'#A07B5A'
      brachiosaur:'#6B8A6B'
      text:       '#F5E9FF'
      textDim:    '#BBA8D8'
    }
    { # 2 — Night
      sky:        '#0B1026'
      sun:        '#F4F1DE'
      cloud:      '#1F2A4A'
      cloudShade: '#162038'
      mountainFar:'#22304F'
      mountainNear:'#18233C'
      ground:     '#5C4A2A'
      groundDark: '#463818'
      groundTop:  '#33280F'
      cactus:     '#2FBF71'
      tree:       '#38C87C'
      hero:       '#45E08C'
      heroDark:   '#2BA768'
      raptor:     '#FF5E5E'
      ptero:      '#B07DFF'
      triceratops:'#6E563A'
      brachiosaur:'#3E5A3E'
      text:       '#E8F0FF'
      textDim:    '#8FA0C0'
    }
  ]

# ---------------------------------------------------------------------------
# Art parsing — art.txt is plain data: `### name` starts a sprite, `@@@` splits
# frames. Backslashes stay literal (no string escaping headaches).
# ---------------------------------------------------------------------------
DINO.parseArt = (text) ->
  sprites = {}
  cur = null
  sprite = []      # list of frames
  frame = []       # list of rows
  flush = ->
    if cur? and (frame.length or sprite.length)
      sprite.push frame if frame.length
      sprites[cur] = sprite
  for line in text.split('\n')
    if line[...4] is '### '
      flush()
      cur = line[4..].trim()
      sprite = []
      frame = []
    else if line.trim() is '@@@'
      sprite.push frame if frame.length
      frame = []
    else if cur?
      frame.push line.replace(/\s+$/, '')
  flush()
  sprites

DINO.MIRROR = ['hero_run', 'hero_jump', 'hero_duck', 'hero_dead']

# Mirror a set of raw frames horizontally (swap \/()<>[]{} and reverse order).
DINO.mirrorFrames = (frames) ->
  w = 0
  for f in frames
    for row in f
      w = Math.max w, row.length
  map =
    '\\': '/'
    '/': '\\'
    '(': ')'
    ')': '('
    '<': '>'
    '>': '<'
    '[': ']'
    ']': '['
    '{': '}'
    '}': '{'
  out = []
  for f in frames
    nf = []
    for row in f
      line = row
      line += ' ' while line.length < w
      chars = line.split('').reverse()
      nf.push (map[c] ? c for c in chars).join('')
    out.push nf
  out

DINO.buildSprites = (art) ->
  raw = DINO.parseArt(art)
  out = {}
  for name, frames of raw
    frames = DINO.mirrorFrames frames if name in DINO.MIRROR
    w = 0
    h = 0
    for f in frames
      for row in f
        w = Math.max w, row.length
      h = Math.max h, f.length
    norm = []
    for f in frames
      rows = []
      for i in [0...h]
        row = f[i] ? ''
        row += ' ' while row.length < w
        rows.push row
      solid = []
      for yy in [0...h]
        for xx in [0...w]
          solid.push [xx, yy] if rows[yy][xx] isnt ' '
      norm.push { rows: rows, solid: solid }
    out[name] = { frames: norm, w: w, h: h }
  out

# ---------------------------------------------------------------------------
# Game
# ---------------------------------------------------------------------------
class Game

  constructor: (@cols, @rows, @sprites) ->
    @palettes = DINO.COLORS.palettes
    @palIdx = 0
    @input = { jump: false, duck: false, attack: false }
    @reset()

  palette: -> @palettes[@palIdx]

  reset: ->
    @time = 0
    @baseSpeed = 7
    @maxSpeed = 26
    @accel = 0.35
    @speed = @baseSpeed
    @score = 0
    @gameOver = false
    @spawnTimer = 1.4
    @groundY = @rows - 1
    @groundOffset = 0
    @entities = []
    @bgDinos = []
    @clouds = []
    @mountFar = { offset: 0 }
    @mountNear = { offset: 0 }
    @player = @makePlayer()
    @initClouds()

  makePlayer: ->
    stand = @sprites.hero_run
    {
      x: 8
      w: stand.w
      standH: stand.h
      duckH: @sprites.hero_duck.h
      h: stand.h
      y: @groundY - stand.h + 1
      vy: 0
      onGround: true
      state: 'run'
      animT: 0
      frame: 0
      attackT: 0
    }

  initClouds: ->
    @clouds = []
    for i in [0...5]
      @clouds.push
        x: Math.random() * @cols
        y: 1 + Math.random() * (@groundY * 0.45)
        speed: 0.2 + Math.random() * 0.15

  # --- input (edge / toggle semantics: no keyup needed) --------------------
  jump:   -> @input.jump = true
  duck:   -> @input.duck = not @input.duck
  attack: -> @input.attack = true
  cyclePalette: -> @palIdx = (@palIdx + 1) % @palettes.length

  resize: (cols, rows) ->
    @cols = cols
    @rows = rows
    @groundY = rows - 1
    for e in @entities
      if e.ground then e.y = @groundY - e.h + 1
    @player.y = @groundY - @player.h + 1 if @player.onGround

  # --- simulation ----------------------------------------------------------
  step: (dt) ->
    if @gameOver
      return
    @time += dt
    @speed = Math.min @maxSpeed, @baseSpeed + @time * @accel
    @updatePlayer dt
    @updateEntities dt
    @spawner dt
    @updateParallax dt
    @collide()
    @score += @speed * dt * 0.1

  playerSpriteName: ->
    p = @player
    return 'hero_dead'   if p.state is 'dead'
    return 'hero_attack' if p.attackT > 0
    return 'hero_duck'   if p.state is 'duck'
    return 'hero_jump'   if p.state is 'jump'
    'hero_run'

  playerFrameIdx: ->
    n = @sprites[@playerSpriteName()].frames.length
    Math.min @player.frame, n - 1

  updatePlayer: (dt) ->
    p = @player
    return if p.state is 'dead'

    # duck (ground only)
    if @input.duck and p.onGround
      p.state = 'duck'
      p.frame = 0
    else if p.state is 'duck'
      p.state = 'run'

    # attack (consume edge)
    if @input.attack and p.attackT <= 0
      p.attackT = 0.30
      p.frame = 0
    @input.attack = false
    p.attackT -= dt if p.attackT > 0

    # jump (consume edge)
    if @input.jump and p.onGround
      p.vy = -15
      p.onGround = false
      p.state = 'jump'
      p.frame = 0
    @input.jump = false

    # gravity
    unless p.onGround
      p.vy += 52 * dt
      p.y += p.vy * dt
      if p.y >= @groundY - p.h + 1
        p.y = @groundY - p.h + 1
        p.vy = 0
        p.onGround = true
        p.state = 'run'

    # height sync (duck shrinks hitbox)
    targetH = if p.state is 'duck' then p.duckH else p.standH
    if p.h isnt targetH
      p.h = targetH
      p.y = @groundY - targetH + 1 if p.onGround

    # run cycle
    if p.state is 'run'
      p.animT += dt
      p.frame = Math.floor(p.animT / 0.12) % @sprites.hero_run.frames.length

  pickKind: ->
    r = Math.random()
    if r < 0.34 then 'cactus'
    else if r < 0.54 then 'cactus_large'
    else if r < 0.68 then 'tree'
    else if r < 0.80 then 'ptero'
    else if r < 0.92 then 'raptor'
    else 'triceratops'

  spawn: ->
    kind = @pickKind()
    spr = @sprites[kind]
    e =
      kind: kind
      x: @cols + 3
      w: spr.w
      h: spr.h
      frame: 0
      animT: Math.random() * 10
      dx: 0
      dead: false
      ground: true
      solid: true
    if kind is 'raptor'
      e.dx = -3.5
    if kind is 'ptero'
      e.ground = false
      e.baseY = @groundY - spr.h - 2 - Math.random() * 5
      e.y = e.baseY
    else
      e.y = @groundY - spr.h + 1
    @entities.push e

  spawner: (dt) ->
    @spawnTimer -= dt
    if @spawnTimer <= 0
      @spawn()
      base = 1.7 / (1 + @speed * 0.035)
      @spawnTimer = base * (0.55 + Math.random() * 0.9)
    # occasional background brachiosaur ambling through the far layer
    if Math.random() < dt * 0.08
      s = @sprites.brachiosaur
      @bgDinos.push
        x: @cols + 2
        y: @groundY - s.h + 1
        frame: 0
        animT: 0
        speed: 0.45

  updateEntities: (dt) ->
    for e in @entities
      e.x -= (@speed + (e.dx ? 0)) * dt
      e.animT += dt
      s = @sprites[e.kind]
      e.frame = Math.floor(e.animT / 0.16) % s.frames.length
      if e.kind is 'ptero'
        e.y = e.baseY + Math.sin(@time * 3 + e.x * 0.3) * 1.4
    @entities = @entities.filter (e) -> e.x + e.w > -4 and not e.dead

  updateParallax: (dt) ->
    @groundOffset += @speed * dt
    @mountFar.offset += @speed * 0.25 * dt
    @mountNear.offset += @speed * 0.5 * dt
    for c in @clouds
      c.x -= @speed * c.speed * dt
      if c.x + @sprites.cloud.w < 0
        c.x = @cols + Math.random() * @cols * 0.6
        c.y = 1 + Math.random() * (@groundY * 0.45)
    for b in @bgDinos
      b.x -= @speed * b.speed * dt
      b.animT += dt
    bw = @sprites.brachiosaur.w
    @bgDinos = @bgDinos.filter (b) -> b.x + bw > -2

  # --- collision -----------------------------------------------------------
  boxOverlap: (a, b) ->
    a.x < b.x + b.w and a.x + a.w > b.x and a.y < b.y + b.h and a.y + a.h > b.y

  spriteOverlap: (a, b) ->
    aax = Math.floor a.x
    aay = Math.floor a.y
    bbx = Math.floor b.x
    bby = Math.floor b.y
    return false unless aax < bbx + b.w and aax + a.w > bbx and aay < bby + b.h and aay + a.h > bby
    for [sx, sy] in a.solid
      wx = aax + sx
      wy = aay + sy
      for [tx, ty] in b.solid
        if wx is (bbx + tx) and wy is (bby + ty)
          return true
    false

  collide: ->
    p = @player
    pSpr = @sprites[@playerSpriteName()].frames[@playerFrameIdx()]
    pBox = { x: p.x, y: p.y, w: p.w, h: p.h, solid: pSpr.solid }
    attackBox = null
    if p.attackT > 0
      attackBox = { x: p.x + p.w, y: p.y - 1, w: 5, h: p.h + 2 }
    for e in @entities
      continue if e.dead or not e.solid
      eSpr = @sprites[e.kind].frames[e.frame]
      if e.kind in ['raptor', 'ptero'] and attackBox? and
         @boxOverlap(attackBox, { x: e.x, y: e.y, w: e.w, h: e.h })
        e.dead = true
        @score += 100
        continue
      if @spriteOverlap(pBox, { x: e.x, y: e.y, w: e.w, h: e.h, solid: eSpr.solid })
        @die()
        break

  die: ->
    return if @gameOver
    @gameOver = true
    @player.state = 'dead'
    @player.frame = 0

  # --- rendering -----------------------------------------------------------
  render: ->
    pal = @palette()
    grid = @blankGrid pal.sky
    @drawSun grid, pal
    @drawClouds grid, pal
    @drawMountains grid, pal, 'far'
    @drawMountains grid, pal, 'near'
    @drawBrachiosaurs grid, pal
    @drawGround grid, pal
    @drawEntities grid, pal
    @drawPlayer grid, pal
    @drawHud grid, pal
    @drawGameOver grid, pal if @gameOver
    grid

  blankGrid: (sky) ->
    text = []
    fg = []
    bg = []
    for y in [0...@rows]
      trow = []
      frow = []
      brow = []
      for x in [0...@cols]
        trow.push ' '
        frow.push null
        brow.push sky
      text.push trow
      fg.push frow
      bg.push brow
    { w: @cols, h: @rows, text: text, fg: fg, bg: bg }

  setCell: (grid, x, y, ch, fg) ->
    if x >= 0 and x < @cols and y >= 0 and y < @rows
      grid.text[y][x] = ch
      grid.fg[y][x] = fg

  drawSprite: (grid, name, x, y, color, frameIdx) ->
    spr = @sprites[name]
    f = spr.frames[frameIdx ? 0]
    fx = Math.floor x
    fy = Math.floor y
    for yy in [0...spr.h]
      row = f.rows[yy]
      gy = fy + yy
      continue if gy < 0 or gy >= @rows
      for xx in [0...spr.w]
        ch = row[xx]
        continue if ch is ' '
        gx = fx + xx
        if gx >= 0 and gx < @cols
          grid.text[gy][gx] = ch
          grid.fg[gy][gx] = color

  drawSun: (grid, pal) ->
    s = @sprites.sun
    @drawSprite grid, 'sun', @cols - s.w - 4, 2, pal.sun, 0

  drawClouds: (grid, pal) ->
    for c in @clouds
      @drawSprite grid, 'cloud', c.x, c.y, pal.cloud, 0

  drawBrachiosaurs: (grid, pal) ->
    for b in @bgDinos
      @drawSprite grid, 'brachiosaur', b.x, b.y, pal.brachiosaur, 0

  drawMountains: (grid, pal, layer) ->
    cfg = if layer is 'far'
      { p: 26, amp: @rows * 0.32, color: pal.mountainFar, offset: @mountFar.offset }
    else
      { p: 16, amp: @rows * 0.20, color: pal.mountainNear, offset: @mountNear.offset }
    baseY = @groundY
    for x in [0...@cols]
      wx = x + Math.floor(cfg.offset)
      local = wx % cfg.p
      h = if local <= cfg.p / 2
        cfg.amp * (local / (cfg.p / 2))
      else
        cfg.amp * (1 - (local - cfg.p / 2) / (cfg.p / 2))
      topY = baseY - Math.floor(h)
      for y in [topY...baseY]
        if y >= 0 and y < @rows
          grid.bg[y][x] = cfg.color
          grid.text[y][x] = ' '
          grid.fg[y][x] = cfg.color

  drawGround: (grid, pal) ->
    goff = Math.floor @groundOffset
    for x in [0...@cols]
      wx = x + goff
      grid.bg[@groundY][x] = pal.groundDark
      grid.text[@groundY][x] = if wx % 6 is 0 then '~' else '_'
      grid.fg[@groundY][x] = pal.groundTop
      for y in [(@groundY + 1)...@rows]
        grid.bg[y][x] = pal.ground
        if (wx + y) % 5 is 0
          grid.text[y][x] = '.'
          grid.fg[y][x] = pal.groundDark
        else if (wx - y) % 9 is 0
          grid.text[y][x] = ':'
          grid.fg[y][x] = pal.groundDark

  entityColor: (kind, pal) ->
    switch kind
      when 'cactus', 'cactus_large' then pal.cactus
      when 'tree' then pal.tree
      when 'raptor' then pal.raptor
      when 'ptero' then pal.ptero
      when 'triceratops' then pal.triceratops
      else pal.text

  drawEntities: (grid, pal) ->
    for e in @entities
      @drawSprite grid, e.kind, e.x, e.y, @entityColor(e.kind, pal), e.frame

  drawPlayer: (grid, pal) ->
    p = @player
    @drawSprite grid, @playerSpriteName(), p.x, p.y, pal.hero, @playerFrameIdx()

  drawHud: (grid, pal) ->
    msg = "SCORE #{Math.floor @score}  SPEED #{@speed.toFixed 1}  [SPACE]jump [S]duck [A]attack [B]sky [R]restart"
    for i in [0...msg.length]
      break if i >= @cols
      grid.text[0][i] = msg[i]
      grid.fg[0][i] = pal.text

  drawGameOver: (grid, pal) ->
    msg = "GAME OVER — score #{Math.floor @score} — press R to restart"
    y = Math.floor @rows / 2
    x = Math.floor (@cols - msg.length) / 2
    for i in [0...msg.length]
      gx = x + i
      if gx >= 0 and gx < @cols
        grid.text[y][gx] = msg[i]
        grid.fg[y][gx] = pal.text

DINO.Game = Game
DINO.buildSprites = DINO.buildSprites