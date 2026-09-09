# bootstrap.coffee — establishes the shared DINO namespace on globalThis so that
# every other concatenated file (art data, core, renderers) can attach to it.
root = if typeof globalThis isnt 'undefined' then globalThis else window
root.DINO ?= {}
