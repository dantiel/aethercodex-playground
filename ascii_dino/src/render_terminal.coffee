# render_terminal.coffee — ANSI renderer + node input/clock (node-only).
readline = require 'readline'

cols = parseInt(process.env.DINO_COLS ? (process.stdout.columns ? 80), 10)
rows = parseInt(process.env.DINO_ROWS ? ((process.stdout.rows ? 24) - 1), 10)
rows = Math.max 12, rows

sprites = DINO.buildSprites DINO.ART
game = new DINO.Game cols, rows, sprites

hexToRgb = (hex) ->
  h = hex.replace '#', ''
  if h.length is 3
    h = (c + c for c in h).join ''
  [parseInt(h[...2], 16), parseInt(h[2...4], 16), parseInt(h[4...6], 16)]

ansiCache = {}
ansi = (fg, bg) ->
  key = fg + '|' + bg
  return ansiCache[key] if ansiCache[key]?
  fr = hexToRgb fg
  br = hexToRgb bg
  ansiCache[key] = "\x1b[38;2;#{fr[0]};#{fr[1]};#{fr[2]};48;2;#{br[0]};#{br[1]};#{br[2]}m"

draw = (frame) ->
  out = '\x1b[H\x1b[0m'
  curFg = null
  curBg = null
  for y in [0...frame.h]
    for x in [0...frame.w]
      fg = frame.fg[y][x] ? frame.bg[y][x]
      bg = frame.bg[y][x]
      if fg isnt curFg or bg isnt curBg
        out += ansi fg, bg
        curFg = fg
        curBg = bg
      out += frame.text[y][x]
    out += '\n'
  out += '\x1b[0m'
  process.stdout.write out

cleanup = ->
  process.stdout.write '\x1b[0m\x1b[?25h\x1b[2J\x1b[H'
  if process.stdin.isTTY then process.stdin.setRawMode false

# one-frame debug snapshot (no ANSI, no loop) — for sprite inspection
if process.env.DINO_FRAME
  game.step 0.016
  f = game.render()
  for y in [0...f.h]
    console.log (f.text[y][x] for x in [0...f.w]).join ''
  process.exit 0

process.stdout.write '\x1b[?25l'

readline.emitKeypressEvents process.stdin
if process.stdin.isTTY then process.stdin.setRawMode true
process.stdin.resume()
process.stdin.setEncoding 'utf8'
process.stdin.on 'keypress', (str, key) ->
  return unless key
  if key.ctrl and key.name is 'c'
    cleanup()
    process.exit 0
  switch key.name
    when 'up', 'space'
      game.jump()
    when 'down'
      game.duck()
    when 's'
      game.duck()
    when 'a', 'j', 'x'
      game.attack()
    when 'b', 'c'
      game.cyclePalette()
    when 'r'
      game.reset()
    when 'q'
      cleanup()
      process.exit 0

process.stdout.on 'resize', ->
  game.resize process.stdout.columns, process.stdout.rows - 1

process.on 'SIGINT', ->
  cleanup()
  process.exit 0
process.on 'SIGTERM', ->
  cleanup()
  process.exit 0

last = Date.now()
setInterval ->
  now = Date.now()
  dt = Math.min 0.1, (now - last) / 1000
  last = now
  game.step dt
  draw game.render()
, Math.floor 1000 / 30
