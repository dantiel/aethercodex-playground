// Fractal Llama Odyssey - Endless Mountain Climber
// AetherCodex - Procedural Fractal Terrain Game

// Include fractal generators
if (typeof SierpinskiGenerator === 'undefined') {
    // Load fractal generators if not already loaded
    const script = document.createElement('script');
    script.src = 'fractal_generators.js';
    document.head.appendChild(script);
}

class FractalLlamaGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'menu'; // menu, playing, gameOver
        this.score = 0;
        this.height = 0;
        this.worldSpeed = 1.0;
        this.spitCount = 3;
        this.currentFractal = 'sierpinski';
        
        // Llama properties
        this.llama = {
            x: 100,
            y: 300,
            width: 40,
            height: 60,
            velocityY: 0,
            isJumping: false,
            facing: 'right',
            animationFrame: 0
        };
        
        // Terrain
        this.terrain = [];
        this.activeChunks = new Set();
        this.chunkSize = 200;
        
        // Input
        this.keys = {};
        this.touchStartX = null;
        this.touchStartY = null;
        
        // Fractal generators
        this.fractalGenerators = {
            sierpinski: new SierpinskiGenerator(),
            perlin: new PerlinNoiseGenerator(),
            mandelbrot: new MandelbrotGenerator(),
            koch: new KochSnowflakeGenerator(),
            dragon: new DragonCurveGenerator()
        };
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Input handlers
        document.addEventListener('keydown', (e) => this.keys[e.key] = true);
        document.addEventListener('keyup', (e) => this.keys[e.key] = false);
        
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Generate initial terrain
        this.generateInitialTerrain();
        
        // Start game loop
        this.gameLoop();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    generateInitialTerrain() {
        // Generate starting terrain chunks
        for (let i = 0; i < 5; i++) {
            this.generateTerrainChunk(i);
        }
    }
    
    generateTerrainChunk(chunkX) {
        // Security: Validate fractal type and fallback to default
        const fractalType = this.currentFractal;
        const generator = this.fractalGenerators[fractalType] || this.fractalGenerators.sierpinski;
        
        // Security: Validate parameters to prevent infinite loops
        const safeSeed = isFinite(this.score) ? Math.floor(Math.abs(this.score) / 1000) : 0;
        const safeParams = {
            width: Math.min(500, Math.max(50, this.chunkSize)),
            height: Math.min(800, Math.max(100, 400)),
            seed: safeSeed
        };
        
        try {
            const chunk = generator.generateTerrain(chunkX, this.height, safeParams);
            
            // Security: Validate generated terrain data
            if (Array.isArray(chunk)) {
                const validChunk = chunk.filter(segment =>
                    segment &&
                    isFinite(segment.x) &&
                    isFinite(segment.y) &&
                    isFinite(segment.width) &&
                    isFinite(segment.height) &&
                    segment.width > 0 &&
                    segment.height > 0
                );
                
                this.terrain.push(...validChunk);
                this.activeChunks.add(chunkX);
            }
        } catch (error) {
            console.warn(`Fractal generation failed for ${fractalType}:`, error);
            // Fallback to simple terrain
            this.generateFallbackTerrain(chunkX);
        }
    }
    
    generateFallbackTerrain(chunkX) {
        const baseX = chunkX * this.chunkSize;
        const segments = 5;
        
        for (let i = 0; i < segments; i++) {
            this.terrain.push({
                x: baseX + i * (this.chunkSize / segments),
                y: this.height + 300,
                width: this.chunkSize / segments,
                height: 50,
                color: '#5a8a5a',
                chunkX: chunkX
            });
        }
        this.activeChunks.add(chunkX);
    }
    
    handleTouchStart(e) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }
    
    handleTouchMove(e) {
        if (!this.touchStartX || !this.touchStartY) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        
        // Simple swipe detection
        if (Math.abs(deltaX) > 30) {
            this.keys[deltaX > 0 ? 'ArrowRight' : 'ArrowLeft'] = true;
            setTimeout(() => {
                this.keys[deltaX > 0 ? 'ArrowRight' : 'ArrowLeft'] = false;
            }, 100);
        }
        
        if (deltaY < -30 && !this.llama.isJumping) {
            this.jump();
        }
        
        if (deltaY > 30 && this.spitCount > 0) {
            this.spit();
        }
    }
    
    handleTouchEnd() {
        this.touchStartX = null;
        this.touchStartY = null;
    }
    
    jump() {
        if (!this.llama.isJumping) {
            this.llama.velocityY = -15;
            this.llama.isJumping = true;
        }
    }
    
    spit() {
        if (this.spitCount > 0) {
            this.spitCount--;
            // Spit projectile logic would go here
            this.updateUI();
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Handle input with security validation
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            this.llama.x -= 5;
            this.llama.facing = 'left';
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            this.llama.x += 5;
            this.llama.facing = 'right';
        }
        if ((this.keys['ArrowUp'] || this.keys['w'] || this.keys[' ']) && !this.llama.isJumping) {
            this.jump();
        }
        if ((this.keys['s'] || this.keys['x']) && this.spitCount > 0) {
            this.spit();
        }
        
        // Validate llama position to prevent NaN/infinity issues
        if (!isFinite(this.llama.x) || !isFinite(this.llama.y)) {
            this.llama.x = Math.max(20, Math.min(this.canvas.width - 60, this.llama.x || 100));
            this.llama.y = Math.max(0, Math.min(this.canvas.height, this.llama.y || 300));
        }
        
        // Apply gravity
        this.llama.velocityY += 0.8;
        this.llama.y += this.llama.velocityY;
        
        // Check collision with terrain
        this.checkCollisions();
        
        // Update animation
        this.llama.animationFrame = (this.llama.animationFrame + 1) % 30;
        
        // Update score and height
        this.score += Math.floor(this.worldSpeed);
        this.height = Math.max(this.height, Math.floor(-this.llama.y / 10));
        
        // Increase world speed gradually
        this.worldSpeed = Math.min(3.0, 1.0 + this.height / 1000);
        
        // Transition between fractal types
        this.updateFractalType();
        
        // Generate new terrain as needed
        this.updateTerrain();
        
        this.updateUI();
    }
    
    checkCollisions() {
        // Check collision with terrain platforms
        let onGround = false;
        
        for (const segment of this.terrain) {
            if (this.isColliding(this.llama, segment)) {
                // Land on top of platform
                if (this.llama.velocityY > 0 &&
                    this.llama.y + this.llama.height <= segment.y + 10) {
                    this.llama.y = segment.y - this.llama.height;
                    this.llama.velocityY = 0;
                    this.llama.isJumping = false;
                    onGround = true;
                    break;
                }
            }
        }
        
        // Fallback ground collision
        const groundY = this.canvas.height - 100;
        if (!onGround && this.llama.y + this.llama.height > groundY) {
            this.llama.y = groundY - this.llama.height;
            this.llama.velocityY = 0;
            this.llama.isJumping = false;
            onGround = true;
        }
        
        // Check if llama fell off
        if (this.llama.y > this.canvas.height) {
            this.gameOver();
        }
    }
    
    isColliding(llama, segment) {
        return llama.x < segment.x + segment.width &&
               llama.x + llama.width > segment.x &&
               llama.y < segment.y + segment.height &&
               llama.y + llama.height > segment.y;
    }
    
    updateFractalType() {
        const fractalTypes = ['sierpinski', 'perlin', 'mandelbrot', 'koch', 'dragon'];
        
        // Security: Validate height to prevent invalid indices
        const safeHeight = isFinite(this.height) ? Math.max(0, this.height) : 0;
        const fractalIndex = Math.floor(safeHeight / 500) % fractalTypes.length;
        
        // Security: Ensure valid fractal type
        if (fractalIndex >= 0 && fractalIndex < fractalTypes.length) {
            this.currentFractal = fractalTypes[fractalIndex];
        } else {
            this.currentFractal = 'sierpinski'; // Fallback to default
        }
    }
    
    updateTerrain() {
        // Remove old terrain chunks (keep more chunks for continuous world)
        const currentChunk = Math.floor(this.llama.x / this.chunkSize);
        this.terrain = this.terrain.filter(segment =>
            Math.abs(segment.chunkX - currentChunk) <= 4
        );
        
        // Generate new chunks
        for (let i = -4; i <= 4; i++) {
            const chunkX = currentChunk + i;
            if (!this.activeChunks.has(chunkX)) {
                this.generateTerrainChunk(chunkX);
            }
        }
    }
    
    updateUI() {
        document.getElementById('height').textContent = this.height;
        document.getElementById('score').textContent = this.score;
        document.getElementById('fractalType').textContent = this.currentFractal;
        document.getElementById('spitCount').textContent = this.spitCount;
        document.getElementById('speed').textContent = this.worldSpeed.toFixed(1);
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw terrain
        this.drawTerrain();
        
        // Draw llama
        this.drawLlama();
        
        // Draw UI elements
        this.drawParticles();
    }
    
    drawBackground() {
        // Gradient sky
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0f3460');
        gradient.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Stars
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 12345) % this.canvas.width;
            const y = (i * 6789) % (this.canvas.height / 2);
            const size = (i % 3) * 0.5 + 0.5;
            this.ctx.fillRect(x, y, size, size);
        }
    }
    
    drawTerrain() {
        // Calculate camera offset to follow llama
        const cameraOffsetX = this.llama.x - this.canvas.width / 2;
        
        this.terrain.forEach(segment => {
            this.ctx.fillStyle = segment.color || '#4a8a4a';
            this.ctx.fillRect(segment.x - cameraOffsetX, segment.y, segment.width, segment.height);
        });
    }
    
    drawLlama() {
        const { x, y, width, height, animationFrame, facing } = this.llama;
        
        // Calculate camera offset to center llama
        const cameraOffsetX = this.llama.x - this.canvas.width / 2;
        const llamaScreenX = this.canvas.width / 2;
        
        // Body
        this.ctx.fillStyle = '#f0e6d2';
        this.ctx.fillRect(llamaScreenX, y, width, height);
        
        // Neck and head
        this.ctx.fillStyle = '#e6d8b8';
        const neckHeight = 30;
        const headSize = 25;
        
        if (facing === 'right') {
            this.ctx.fillRect(llamaScreenX + width - 10, y - neckHeight, 15, neckHeight);
            this.ctx.fillRect(llamaScreenX + width, y - neckHeight - headSize, headSize, headSize);
        } else {
            this.ctx.fillRect(llamaScreenX - 5, y - neckHeight, 15, neckHeight);
            this.ctx.fillRect(llamaScreenX - headSize, y - neckHeight - headSize, headSize, headSize);
        }
        
        // Legs (animated)
        this.ctx.fillStyle = '#d8c8a8';
        const legOffset = Math.sin(animationFrame * 0.2) * 3;
        
        [10, 30].forEach(offset => {
            this.ctx.fillRect(llamaScreenX + offset, y + height, 8, 20 + legOffset);
            this.ctx.fillRect(llamaScreenX + width - offset - 8, y + height, 8, 20 - legOffset);
        });
    }
    
    drawParticles() {
        // Simple particle effects for movement
        if (this.llama.velocityY !== 0 || this.keys['ArrowLeft'] || this.keys['ArrowRight']) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            const llamaScreenX = this.canvas.width / 2;
            for (let i = 0; i < 3; i++) {
                const px = llamaScreenX + Math.random() * this.llama.width;
                const py = this.llama.y + this.llama.height + Math.random() * 10;
                this.ctx.fillRect(px, py, 2, 2);
            }
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalHeight').textContent = this.height;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'block';
    }
    
    restartGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.height = 0;
        this.worldSpeed = 1.0;
        this.spitCount = 3;
        
        this.llama.x = 100;
        this.llama.y = 300;
        this.llama.velocityY = 0;
        this.llama.isJumping = false;
        
        this.terrain = [];
        this.activeChunks.clear();
        this.generateInitialTerrain();
        
        document.getElementById('gameOver').style.display = 'none';
        this.updateUI();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    window.game = new FractalLlamaGame();
    
    // Start game automatically
    setTimeout(() => {
        window.game.gameState = 'playing';
    }, 1000);
});

// Global restart function
function restartGame() {
    window.game.restartGame();
}