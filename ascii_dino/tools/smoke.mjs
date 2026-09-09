// tools/smoke.mjs — headless engine test. Compiles the CoffeeScript core on the
// fly, runs 12k simulated frames exercising jump/duck/attack/palette/resize,
// and asserts collision + combat work. Run:  node tools/smoke.mjs
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import vm from 'vm';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src');

const coffee = (n) => execSync(`coffee -b -p "${join(SRC, n)}"`, { encoding: 'utf8' });
const bootstrap = coffee('bootstrap.coffee');
const core = coffee('core.coffee');
const art = readFileSync(join(SRC, 'art.txt'), 'utf8');
const artJs = `(function(root){ root.DINO.ART = ${JSON.stringify(art)}; })(globalThis);`;

const sandbox = { console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(bootstrap + '\n' + artJs + '\n' + core, sandbox, { filename: 'bundle' });

const Game = sandbox.DINO.Game;
const Sprites = sandbox.DINO.buildSprites(sandbox.DINO.ART);

let failures = 0;
const check = (name, ok) => {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name);
  if (!ok) failures++;
};

console.log('sprites:', Object.keys(Sprites).join(', '));

// 1. headless endurance run
const game = new Game(120, 34, Sprites);
let crashed = null;
let deaths = 0;
for (let i = 0; i < 12000; i++) {
  try {
    if (i % 37 === 0) game.jump();
    if (i % 53 === 0) game.duck();
    if (i % 61 === 0) game.attack();
    if (i % 97 === 0) game.cyclePalette();
    game.step(1 / 60);
    if (i % 7 === 0) game.render();
    if (game.gameOver) { deaths++; game.reset(); }
  } catch (e) { crashed = e.stack || String(e); break; }
}
check('12k frames without crash', !crashed);
check('collisions produce deaths', deaths > 0);

// 2. pixel collision — cactus overlapping the player kills
const g1 = new Game(120, 34, Sprites);
g1.entities = [{
  kind: 'cactus', x: 10, y: g1.groundY - Sprites.cactus.h + 1,
  w: Sprites.cactus.w, h: Sprites.cactus.h, frame: 0, animT: 0,
  dx: 0, dead: false, ground: true, solid: true,
}];
g1.step(1 / 60);
check('cactus overlap -> game over', g1.gameOver === true);

// 3. combat — attack defeats a raptor without dying
const g2 = new Game(120, 34, Sprites);
const raptor = {
  kind: 'raptor', x: 14, y: g2.groundY - Sprites.raptor.h + 1,
  w: Sprites.raptor.w, h: Sprites.raptor.h, frame: 0, animT: 0,
  dx: 0, dead: false, ground: true, solid: true,
};
g2.entities = [raptor];
g2.attack();
g2.step(1 / 60);
check('attack defeats raptor (+100 score)', raptor.dead && Math.floor(g2.score) === 100);
check('attack does not kill player', g2.gameOver === false);

// 4. resize stays stable
try {
  game.resize(60, 20); game.render();
  game.resize(200, 60); game.render();
  check('resize (60x20 -> 200x60)', true);
} catch (e) { check('resize (60x20 -> 200x60)', false); }

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
