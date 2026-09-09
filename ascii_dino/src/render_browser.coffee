# render_browser.coffee — canvas renderer + rAF loop + keyboard (browser-only).
DINO.browserBoot = ->
  canvas = document.getElementById 'game'
  ctx = canvas.getContext '2d'
  sprites = DINO.buildSprites DINO.ART
  CELL_RATIO = 0.55

  compute = ->
    W = window.innerWidth
    H = window.innerHeight
    rowH = 20
    rows = Math.max 14, Math.floor(H / rowH)
    cols = Math.max 30, Math.floor((W / (H / rows)) / CELL_RATIO)
    [cols, rows]

  [cols, rows] = compute()
  game = new DINO.Game cols, rows, sprites

  resize = ->
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    [cols, rows] = compute()
    game.resize cols, rows
  window.addEventListener 'resize', resize

  draw = ->
    g = game.render()
    cellW = canvas.width / g.w
    cellH = canvas.height / g.h
    sky = game.palette().sky
    ctx.fillStyle = sky
    ctx.fillRect 0, 0, canvas.width, canvas.height

    # background runs (mountains, ground, clouds) — one rect per color run
    for y in [0...g.h]
      x = 0
      while x < g.w
        c = g.bg[y][x]
        if c is sky
          x++
          continue
        x2 = x
        x2++ while x2 < g.w and g.bg[y][x2] is c
        ctx.fillStyle = c
        ctx.fillRect x * cellW, y * cellH, (x2 - x) * cellW, cellH
        x = x2

    # foreground glyphs — one fillText per same-color non-space run
    ctx.font = "#{Math.floor(cellH)}px Menlo, Monaco, monospace"
    ctx.textBaseline = 'top'
    for y in [0...g.h]
      x = 0
      while x < g.w
        if g.text[y][x] is ' '
          x++
          continue
        c = g.fg[y][x]
        x2 = x
        while x2 < g.w and g.text[y][x2] isnt ' ' and g.fg[y][x2] is c
          x2++
        ctx.fillStyle = c
        ctx.fillText (g.text[y].slice(x, x2).join ''), x * cellW, y * cellH
        x = x2

  keymap =
    ' ': 'jump'
    'ArrowUp': 'jump'
    'ArrowDown': 'duck'
    's': 'duck'
    'S': 'duck'
    'a': 'attack'
    'A': 'attack'
    'j': 'attack'
    'J': 'attack'
    'x': 'attack'
    'b': 'palette'
    'B': 'palette'
    'c': 'palette'
    'C': 'palette'
    'r': 'restart'
    'R': 'restart'

  window.addEventListener 'keydown', (e) ->
    act = keymap[e.key]
    return unless act
    e.preventDefault()
    switch act
      when 'jump' then game.jump()
      when 'duck' then game.duck()
      when 'attack' then game.attack()
      when 'palette' then game.cyclePalette()
      when 'restart' then game.reset()

  canvas.addEventListener 'pointerdown', -> game.jump()

  resize()

  last = performance.now()
  tick = (now) ->
    dt = Math.min 0.1, (now - last) / 1000
    last = now
    game.step dt
    draw()
    requestAnimationFrame tick
  requestAnimationFrame tick

DINO.browserBoot()