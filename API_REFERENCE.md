# Fractal Llama Odyssey - API Reference

## 🎮 Game Engine API

### Core Game Class

#### `FractalLlamaGame`

The main game controller class that manages all game systems.

**Constructor**
```javascript
new FractalLlamaGame(canvasElement)
```

**Parameters:**
- `canvasElement` (HTMLCanvasElement): The canvas element to render the game on

**Properties:**
- `canvas` (HTMLCanvasElement): The game canvas
- `context` (CanvasRenderingContext2D): 2D rendering context
- `world` (FractalWorld): World management system
- `llama` (LlamaCharacter): Player character controller
- `input` (InputHandler): Input processing system
- `isRunning` (boolean): Game running state
- `score` (number): Current game score
- `height` (number): Current climbing height

**Methods:**

#### `startGame()`
Initializes and starts the game loop.

```javascript
game.startGame();
```

#### `pauseGame()`
Pauses the game loop.

```javascript
game.pauseGame();
```

#### `restartGame()`
Resets the game to initial state.

```javascript
game.restartGame();
```

#### `getScore()`
Returns the current game score.

```javascript
const score = game.getScore();
```

**Returns:** `number` - Current score

#### `getCurrentFractal()`
Returns the current active fractal type.

```javascript
const fractalType = game.getCurrentFractal();
```

**Returns:** `string` - Fractal type name

#### `transitionToFractal(type)`
Manually transition to a specific fractal type.

```javascript
game.transitionToFractal('mandelbrot');
```

**Parameters:**
- `type` (string): Fractal type name

## 🏔️ Fractal Generator API

### Base Generator Class

#### `FractalGenerator`

Abstract base class for all fractal generators.

**Methods:**

#### `generateTerrain(chunkX, chunkY, params)`
Generates terrain for a specific chunk.

```javascript
const terrain = generator.generateTerrain(0, 0, params);
```

**Parameters:**
- `chunkX` (number): X coordinate of chunk
- `chunkY` (number): Y coordinate of chunk  
- `params` (GeneratorParams): Generation parameters

**Returns:** `TerrainChunk` - Generated terrain data

#### `getComplexity()`
Returns the complexity rating of this generator.

```javascript
const complexity = generator.getComplexity();
```

**Returns:** `number` - Complexity rating (1-5)

#### `getType()`
Returns the type name of this generator.

```javascript
const type = generator.getType();
```

**Returns:** `string` - Generator type name

#### `getDefaultParams()`
Returns default parameters for this generator.

```javascript
const params = generator.getDefaultParams();
```

**Returns:** `GeneratorParams` - Default parameters

### Generator Implementations

#### `SierpinskiGenerator`
Classic triangular fractal patterns.

**Default Parameters:**
```javascript
{
  iterations: 4,
  scale: 1.0,
  roughness: 0.3
}
```

#### `PerlinNoiseGenerator`
Natural mountain-like terrain.

**Default Parameters:**
```javascript
{
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2.0,
  scale: 100
}
```

#### `MandelbrotGenerator`
Complex boundary patterns.

**Default Parameters:**
```javascript
{
  maxIterations: 100,
  escapeRadius: 2.0,
  zoom: 1.0
}
```

#### `KochSnowflakeGenerator`
Sharp crystalline structures.

**Default Parameters:**
```javascript
{
  iterations: 4,
  scale: 1.2,
  angleVariation: 0.1
}
```

#### `DragonCurveGenerator`
Intricate winding patterns.

**Default Parameters:**
```javascript
{
  iterations: 12,
  scale: 0.8,
  turnAngle: Math.PI / 2
}
```

## 🦙 Llama Character API

### `LlamaCharacter`

Controls the player's llama character.

**Properties:**
- `position` (Vector2D): Current position
- `velocity` (Vector2D): Current velocity
- `state` (string): Current state ('idle', 'walking', 'jumping', 'falling', 'spitting')
- `facing` (string): Facing direction ('left', 'right')
- `jumpPower` (number): Jump strength
- `spitCooldown` (number): Time until next spit
- `animationFrame` (number): Current animation frame

**Methods:**

#### `move(direction)`
Moves the llama in the specified direction.

```javascript
llama.move('left');
// or
llama.move('right');
```

**Parameters:**
- `direction` (string): Movement direction ('left' or 'right')

#### `jump()`
Makes the llama jump.

```javascript
llama.jump();
```

#### `spit()`
Makes the llama spit a projectile.

```javascript
llama.spit();
```

**Returns:** `boolean` - True if spit was successful (not on cooldown)

#### `update(deltaTime)`
Updates llama state and physics.

```javascript
llama.update(0.016); // 16ms delta time
```

**Parameters:**
- `deltaTime` (number): Time since last update in seconds

## 🌍 World Management API

### `FractalWorld`

Manages the infinite fractal world.

**Properties:**
- `terrainChunks` (Map): Active terrain chunks
- `activeChunks` (Set): Currently visible chunks
- `worldSeed` (number): World generation seed
- `currentHeight` (number): Current world height
- `worldSpeed` (number): World scroll speed
- `transitionProgress` (number): Fractal transition progress
- `fractalType` (string): Current fractal type

**Methods:**

#### `getChunkAt(x, y)`
Gets or generates a terrain chunk at specified coordinates.

```javascript
const chunk = world.getChunkAt(0, 100);
```

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate

**Returns:** `TerrainChunk` - Terrain chunk data

#### `transitionToNextFractal()`
Initiates transition to next fractal type.

```javascript
world.transitionToNextFractal();
```

#### `getCollisionAt(x, y)`
Checks for collision at specified position.

```javascript
const hasCollision = world.getCollisionAt(100, 200);
```

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate

**Returns:** `boolean` - True if collision detected

## 🎛️ Input Handling API

### `InputHandler`

Processes and manages user input.

**Properties:**
- `keys` (Object): Current key states
- `touch` (Object): Touch input state
- `mouse` (Object): Mouse input state

**Methods:**

#### `isKeyPressed(key)`
Checks if a specific key is currently pressed.

```javascript
const movingLeft = input.isKeyPressed('ArrowLeft');
```

**Parameters:**
- `key` (string): Key identifier

**Returns:** `boolean` - True if key is pressed

#### `getTouchPosition()`
Gets current touch position if available.

```javascript
const touchPos = input.getTouchPosition();
```

**Returns:** `{x: number, y: number} | null` - Touch position or null

## 📊 Event System

### Available Events

#### Score Change Event
Triggered when the score changes.

```javascript
game.onScoreChange((newScore, oldScore) => {
  console.log(`Score changed from ${oldScore} to ${newScore}`);
});
```

#### Fractal Transition Event
Triggered when transitioning between fractal types.

```javascript
game.onFractalTransition((fromType, toType, progress) => {
  console.log(`Transitioning from ${fromType} to ${toType}: ${progress}%`);
});
```

#### Game Over Event
Triggered when the game ends.

```javascript
game.onGameOver((finalScore, finalHeight) => {
  console.log(`Game Over! Score: ${finalScore}, Height: ${finalHeight}`);
});
```

## 🔧 Configuration API

### Game Configuration

#### `GameConfig`

Global game configuration object.

**Properties:**
- `worldSpeed` (number): Base world scroll speed
- `jumpPower` (number): Llama jump strength
- `gravity` (number): Gravity strength
- `spitCooldown` (number): Time between spit attacks
- `transitionHeight` (number): Height required for fractal transitions
- `chunkSize` (number): Size of terrain chunks

**Example:**
```javascript
// Modify game configuration
game.config.worldSpeed = 2.0;
game.config.jumpPower = 12;
game.config.spitCooldown = 1.5;
```

## 🎨 Rendering API

### Custom Rendering

#### `Renderer`

Handles all canvas rendering operations.

**Methods:**

#### `drawTerrain(chunk)`
Renders a terrain chunk.

```javascript
renderer.drawTerrain(terrainChunk);
```

#### `drawLlama(llama)`
Renders the llama character.

```javascript
renderer.drawLlama(game.llama);
```

#### `drawUI(score, height)`
Renders the user interface.

```javascript
renderer.drawUI(game.score, game.height);
```

## 🔒 Security API

### Input Validation

#### `validateInput(value, min, max)`
Validates numerical input values.

```javascript
const safeValue = validateInput(userInput, 0, 100);
```

**Parameters:**
- `value` (any): Input value to validate
- `min` (number): Minimum allowed value
- `max` (number): Maximum allowed value

**Returns:** `number` - Validated and clamped value

#### `sanitizeCoordinates(x, y)`
Sanitizes coordinate values to prevent security issues.

```javascript
const safeCoords = sanitizeCoordinates(rawX, rawY);
```

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate

**Returns:** `{x: number, y: number}` - Sanitized coordinates

---

*This API reference covers the public interfaces of the Fractal Llama Odyssey game engine. For internal implementation details, refer to the source code documentation.*