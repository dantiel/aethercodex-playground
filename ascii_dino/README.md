# ASCII Dino — Magnum Opus

An **assetless** ASCII dinosaur side-runner. One pure CoffeeScript engine, two
output streams: an ANSI terminal and a browser canvas — both render the exact
same ASCII stream.

```
              __
             /  \___
            / o  o  \_
            \   --   |
             \      _|
              \    |
               \   \_
                |   |
               _|   |
              |_|   |_
```

## Run it

```bash
npm run build      # compiles src/*.coffee -> dist/terminal.js + dist/browser.js
npm run play       # run in the terminal (ANSI, full terminal size)
npm run web        # open index.html in the browser (full window)
```

Or directly:

```bash
node dist/terminal.js      # console
open index.html            # browser
```

## Controls

| Key | Action |
|---|---|
| `SPACE` / `↑` | jump |
| `S` / `↓` | duck (toggle) |
| `A` / `J` / `X` | attack (bite — defeats raptors & pterosaurs) |
| `B` / `C` | cycle sky palette (dawn → dusk → night) |
| `R` | restart |
| `Q` / `Ctrl-C` | quit (terminal) |

Click / tap the canvas to jump in the browser.

## Architecture

```
src/
  art.txt             plain-text sprite atlas (### name, @@@ frame separator)
  bootstrap.coffee    establishes the global DINO namespace
  core.coffee         pure engine: sprite parsing, physics, char-level collision,
                      endless world gen, palettes, render-to-grid
  render_terminal.coffee   ANSI renderer + node input/clock (output stream #1)
  render_browser.coffee    canvas renderer + rAF + keyboard (output stream #2)
build.mjs             compiles CoffeeScript (bare) + embeds art -> dist/
```

- **Assetless** — everything is ASCII. Sprites are stored as literal text, so
  backslashes survive untouched.
- **Character-level collision** — hit boxes are the non-blank characters of a
  sprite's mask. Overlap is checked per character, not per bounding box.
- **Endless world** — procedural parallax mountains, drifting clouds, an ambling
  background brachiosaur, and a difficulty ramp that tightens spawn rate and
  raises speed toward `maxSpeed`.
- **Combat** — the attack bite destroys raptors and pterosaurs (score +100);
  everything else (cacti, trees, triceratops) must be jumped over or ducked.

## Adding art

Append a block to `src/art.txt`, then `npm run build`:

```
### my_sprite
frame one rows
@@@
frame two rows
```

Then reference the sprite by name from the engine (color + behavior live in
`core.coffee`).
