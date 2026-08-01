// Enhanced Fractal Llama Odyssey - Improved Visuals and Mechanics
// AetherCodex - Advanced Procedural Fractal Terrain Game

class EnhancedFractalLlamaGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'menu';
        this.score = 0;
        this.height = 0;
        this.worldSpeed = 1.0;
        this.spitCount = 5;
        this.currentFractal = 'sierpinski';
        this.cameraOffset = { x: 0, y: 0 };
        
        // Enhanced llama properties
        this.llama = {
            x: 200,
            y: 400,
            width: 45,
            height: 70,
            velocityY: 0,
            velocityX: 0,
            isJumping: false,
            facing: 'right',
            animationFrame: 0,
            spitCooldown: 0
        };
        
        // Enhanced terrain with more variety
        this.terrain = [];
        this.activeChunks = new Set();
        this.chunkSize = 300;
        this.maxChunks = 12;
        
        // Projectiles for spit mechanics
        this.projectiles = [];
        
        // Collectibles
        this.collectibles = [];
        
        // Input
        this.keys = {};
        this.touchStartX = null;
        this.touchStartY = null;
        
        // Enhanced fractal generators with more parameters
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
        
        // Enhanced input handlers
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === 'f' && this.gameState === 'playing') {
                this.spit();
            }
        });
        document.addEventListener('keyup', (e) => this.keys[e.key] = false);
        
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Generate enhanced initial terrain
        this.generateEnhancedInitialTerrain();
        
        // Start enhanced game loop
        this.gameLoop();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    generateEnhancedInitialTerrain() {
        // Generate starting terrain with more variety
        for (let i = -2; i < 8; i++) {
            this.generateEnhancedTerrainChunk(i);
        }
        
        // Add initial collectibles
        this.generateCollectibles();
    }
    
    generateEnhancedTerrainChunk(chunkX) {
        const fractalType = this.currentFractal;
        const generator = this.fractalGenerators[fractalType] || this.fractalGenerators.sierpinski;
        
        const safeSeed = isFinite(this.height) ? Math.floor(Math.abs(this.height) / 500) : 0;
        const safeParams = {
            width: Math.min(600, Math.max(100, this.chunkSize)),
            height: Math.min(1000, Math.max(200, 600)),
            seed: safeSeed,
            complexity: Math.min(5, Math.max(1, Math.floor(this.height / 1000) + 1)),
            gapProbability: Math.min(0.3, Math.max(0.05, this.height / 5000))
        };
        
        try {
            const chunk = generator.generateTerrain(chunkX, this.height, safeParams);
            
            if (Array.isArray(chunk)) {
                const validChunk = chunk.filter(segment =>
                    segment &&
                    isFinite(segment.x) &&
                    isFinite(segment.y) &&
                    isFinite(segment.width) &&
                    isFinite(segment.height) &&
                    segment.width > 10 &&
                    segment.height > 10
                );
                
                // Add enhanced terrain properties
                validChunk.forEach(segment => {
                    segment.chunkX = chunkX;
                    segment.color = this.getTerrainColor(fractalType, segment.y);
                    segment.hasCollectible = Math.random() < 0.1;
                });
                
                this.terrain.push(...validChunk);
                this.activeChunks.add(chunkX);
            }
        } catch (error) {
            console.warn(`Fractal generation failed:`, error);
            this.generateEnhancedFallbackTerrain(chunkX);
        }
    }
    
    getTerrainColor(fractalType, y) {
        const colors = {
            sierpinski: ['#8B4513', '#A0522D', '#CD853F'],
            perlin: ['#228B22', '#32CD32', '#90EE90'],
            mandelbrot: ['#4682B4', '#5F9EA0', '#87CEEB'],
            koch: ['#F0F8FF', '#E6E6FA', '#D8BFD8'],
            dragon: ['#FF6347', '#FF7F50', '#FFA07A']
        };
        
        const palette = colors[fractalType] || colors.sierpinski;
        const heightFactor = Math.min(1, Math.max(0, y / 1000));
        return palette[Math.floor(heightFactor * (palette.length - 1))];
    }
    
    generateEnhancedFallbackTerrain(chunkX) {
        const baseX = chunkX * this.chunkSize;
        const segments = 8;
        
        for (let i = 0; i < segments; i++) {
            const hasGap = Math.random() < 0.2;
            if (!hasGap) {
                this.terrain.push({
                    x: baseX + i * (this.chunkSize / segments),
                    y: this.height + 400 + Math.sin(i) * 50,
                    width: this.chunkSize / segments - 10,
                    height: 40 + Math.random() * 30,
                    color: '#5a8a5a',
                    chunkX: chunkX
                });
            }
        }
        this.activeChunks.add(chunkX);
    }
    
    generateCollectibles() {
        // Add wool bundles and artifacts to platforms
        this.terrain.forEach(segment => {
            if (segment.hasCollectible && Math.random() < 0.3) {
                this.collectibles.push({
                    x: segment.x + segment.width / 2 - 10,
                    y: segment.y - 25,
                    width: 20,
                    height: 20,
                    type: Math.random() < 0.7 ? 'wool' : 'artifact',
                    collected: false
                });
            }
        });
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
        
        // Enhanced swipe detection
        if (Math.abs(deltaX) > 20) {
            this.keys[deltaX > 0 ? 'ArrowRight' : 'ArrowLeft'] = true;
            setTimeout(() => {
                this.keys[deltaX > 0 ? 'ArrowRight' : 'ArrowLeft'] = false;
            }, 150);
        }
        
        if (deltaY < -25 && !this.llama.isJumping) {
            this.jump();
        }
        
        if (deltaY > 40 && this.spitCount > 0 && this.llama.spitCooldown === 0) {
            this.spit();
        }
    }
    
    handleTouchEnd() {
        this.touchStartX = null;
        this.touchStartY = null;
    }
    
    jump() {
        if (!this.llama.isJumping) {
            this.llama.velocityY = -18;
            this.llama.isJumping = true;
        }
    }
    
    spit() {
        if (this.spitCount > 0 && this.llama.spitCooldown === 0) {
            this.spitCount--;
            this.llama.spitCooldown = 20;
            
            // Create spit projectile
            this.projectiles.push({
                x: this.llama.x + (this.llama.facing === 'right' ? this.llama.width : -10),
                y: this.llama.y + 20,
                width: 15,
                height: 8,
                velocityX: this.llama.facing === 'right' ? 12 : -12,
                velocityY: 0,
                life: 60
            });
            
            this.updateUI();
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Enhanced movement with momentum
        let targetVelocityX = 0;
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            targetVelocityX = -6;
            this.llama.facing = 'left';
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            targetVelocityX = 6;
            this.llama.facing = 'right';
        }
        
        // Smooth acceleration
        this.llama.velocityX += (targetVelocityX - this.llama.velocityX) * 0.2;
        this.llama.x += this.llama.velocityX;
        
        if ((this.keys['ArrowUp'] || this.keys['w'] || this.keys[' ']) && !this.llama.isJumping) {
            this.jump();
        }
        
        // Apply gravity
        this.llama.velocityY += 0.7;
        this.llama.y += this.llama.velocityY;
        
        // Update spit cooldown
        if (this.llama.spitCooldown > 0) {
            this.llama.spitCooldown--;
        }
        
        // Update projectiles
        this.updateProjectiles();
        
        // Enhanced collision detection
        this.enhancedCollisionDetection();
        
        // Update animation
        this.llama.animationFrame = (this.llama.animationFrame + 1) % 40;
        
        // Update score and height
        const heightGain = Math.max(0, -this.llama.velocityY * 0.5);
        this.score += Math.floor(this.worldSpeed + heightGain);
        this.height = Math.max(this.height, Math.floor(-this.llama.y / 8));
        
        // Increase world speed gradually
        this.worldSpeed = Math.min(4.0, 1.0 + this.height / 800);
        
        // Enhanced fractal transitions
        this.updateEnhancedFractalType();
        
        // Enhanced terrain management with camera following
        this.updateEnhancedTerrain();
        
        // Update camera to follow llama
        this.updateCamera();
        
        this.updateUI();
    }
    
    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.x += proj.velocityX;
            proj.y += proj.velocityY;
            proj.life--;
            
            // Check collision with terrain
            for (const segment of this.terrain) {
                if (this.isColliding(proj, segment)) {
                    // Remove small obstacles
                    if (segment.width < 60) {
                        this.terrain = this.terrain.filter(s => s !== segment);
                    }
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
            
            // Remove expired projectiles
            if (proj.life <= 0 || proj.x < -100 || proj.x > this.canvas.width + 100) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    enhancedCollisionDetection() {
        let onGround = false;
        let collisionFound = false;
        
        // Enhanced collision with all terrain segments
        for (const segment of this.terrain) {
            if (this.isColliding(this.llama, segment)) {
                collisionFound = true;
                
                // Determine collision side
                const llamaBottom = this.llama.y + this.llama.height;
                const segmentTop = segment.y;
                const llamaRight = this.llama.x + this.llama.width;
                const segmentLeft = segment.x;
                const llamaLeft = this.llama.x;
                const segmentRight = segment.x + segment.width;
                
                // Landing on top
                if (this.llama.velocityY > 0 && llamaBottom <= segmentTop + 15) {
                    this.llama.y = segmentTop - this.llama.height;
                    this.llama.velocityY = 0;
                    this.llama.isJumping = false;
                    onGround = true;
                }
                // Hitting bottom
                else if (this.llama.velocityY < 0 && this.llama.y >= segment.y + segment.height - 10) {
                    this.llama.y = segment.y + segment.height;
                    this.llama.velocityY = 0;
                }
                // Hitting sides
                else if (this.llama.velocityX > 0 && llamaRight >= segmentLeft && llamaLeft < segmentLeft) {
                    this.llama.x = segmentLeft - this.llama.width;
                }
                else if (this.llama.velocityX < 0 && llamaLeft <= segmentRight && llamaRight > segmentRight) {
                    this.llama.x = segmentRight;
                }
            }
        }
        
        // Check collectible collisions
        this.checkCollectibleCollisions();
        
        // Enhanced fallback ground
        const safeGroundY = this.canvas.height - 120;
        if (!onGround && this.llama.y + this.llama.height > safeGroundY) {
            this.llama.y = safeGroundY - this.llama.height;
            this.llama.velocityY = 0;
            this.llama.isJumping = false;
            onGround = true;
        }
        
        // Game over if falling too far
        if (this.llama.y > this.canvas.height + 200) {
            this.gameOver();
        }
    }
    
    checkCollectibleCollisions() {
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            if (!collectible.collected && this.isColliding(this.llama, collectible)) {
                collectible.collected = true;
                if (collectible.type === 'wool') {
                    this.score += 50;
                    this.spitCount = Math.min(10, this.spitCount + 1);
                } else {
                    this.score += 200;
                }
                this.collectibles.splice(i, 1);
            }
        }
    }
    
    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    updateEnhancedFractalType() {
        const fractalTypes = ['sierpinski', 'perlin', 'mandelbrot', 'koch', 'dragon'];
        const safeHeight = isFinite(this.height) ? Math.max(0, this.height) : 0;
        const fractalIndex = Math.floor(safeHeight / 800) % fractalTypes.length;
        
        if (fractalIndex >= 0 && fractalIndex < fractalTypes.length) {
            const newFractal = fractalTypes[fractalIndex];
            if (newFractal !== this.currentFractal) {
                this.currentFractal = newFractal;
                // Regenerate terrain with new fractal type
                this.regenerateTerrainForFractalChange();
            }
        }
    }
    
    regenerateTerrainForFractalChange() {
        // Keep current chunks but regenerate with new fractal
        const currentChunks = Array.from(this.activeChunks);
        this.terrain = [];
        this.activeChunks.clear();
        
        currentChunks.forEach(chunkX => {
            this.generateEnhancedTerrainChunk(chunkX);
        });
        
        this.generateCollectibles();
    }
    
    updateEnhancedTerrain() {
        // Calculate current chunk based on camera position
        const currentChunk = Math.floor((this.llama.x + this.cameraOffset.x) / this.chunkSize);
        
        // Generate new chunks ahead
        for (let i = currentChunk - 1; i <= currentChunk + 6; i++) {
            if (!this.activeChunks.has(i) && this.activeChunks.size < this.maxChunks) {
                this.generateEnhancedTerrainChunk(i);
            }
        }
        
        // Remove distant chunks
        for (const chunkX of this.activeChunks) {
            if (Math.abs(chunkX - currentChunk) > 4) {
                this.terrain = this.terrain.filter(segment => segment.chunkX !== chunkX);
                this.activeChunks.delete(chunkX);
            }
        }
        
        // Add collectibles to new terrain
        if (Math.random() < 0.1) {
            this.generateCollectibles();
        }
    }
    
    updateCamera() {
        // Camera follows llama with smooth tracking
        const targetOffsetX = -this.llama.x + this.canvas.width / 3;
        const targetOffsetY = -this.llama.y + this.canvas.height / 2;
        
        this.cameraOffset.x += (targetOffsetX - this.cameraOffset.x) * 0.1;
        this.cameraOffset.y += (targetOffsetY - this.cameraOffset.y) * 0.08;
        
        // Limit camera movement
        this.cameraOffset.y = Math.min(0, this.cameraOffset.y);
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for camera transformation
        this.ctx.save();
        this.ctx.translate(this.cameraOffset.x, this.cameraOffset.y);
        
        // Draw background based on fractal type
        this.drawEnhancedBackground();
        
        // Draw terrain
        this.drawEnhancedTerrain();
        
        // Draw collectibles
        this.drawCollectibles();
        
        // Draw projectiles
        this.drawProjectiles();
        
        // Draw enhanced llama
        this.drawEnhancedLlama();
        
        this.ctx.restore();
        
        // Draw UI elements (not affected by camera)
        this.drawEnhancedUI();
    }
    
    drawEnhancedBackground() {
        const gradient = this.ctx.createLinearGradient(0, -1000, 0, this.canvas.height);
        
        switch(this.currentFractal) {
            case 'sierpinski':
                gradient.addColorStop(0, '#87CEEB');
                gradient.addColorStop(1, '#E6E6FA');
                break;
            case 'perlin':
                gradient.addColorStop(0, '#4682B4');
                gradient.addColorStop(1, '#87CEEB');
                break;
            case 'mandelbrot':
                gradient.addColorStop(0, '#191970');
                gradient.addColorStop(1, '#4B0082');
                break;
            case 'koch':
                gradient.addColorStop(0, '#F0F8FF');
                gradient.addColorStop(1, '#B0C4DE');
                break;
            case 'dragon':
                gradient.addColorStop(0, '#FF4500');
                gradient.addColorStop(1, '#FFD700');
                break;
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(-2000, -2000, 4000, 4000);
        
        // Draw distant mountains
        this.drawDistantMountains();
    }
    
    drawDistantMountains() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < 10; i++) {
            const x = (i * 200 + this.llama.x * 0.1) % 2000 - 1000;
            const height = 100 + Math.sin(i) * 50;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 200);
            this.ctx.lineTo(x + 100, 200 - height);
            this.ctx.lineTo(x + 200, 200);
            this.ctx.fill();
        }
    }
    
    drawEnhancedTerrain() {
        this.terrain.forEach(segment => {
            this.ctx.fillStyle = segment.color;
            this.ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
            
            // Add texture
            this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(segment.x, segment.y, segment.width, segment.height);
        });
    }
    
    drawCollectibles() {
        this.collectibles.forEach(collectible => {
            if (!collectible.collected) {
                if (collectible.type === 'wool') {
                    // Wool bundle
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.beginPath();
                    this.ctx.arc(collectible.x + 10, collectible.y + 10, 8, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#DDD';
                    this.ctx.stroke();
                } else {
                    // Artifact
                    this.ctx.fillStyle = '#FFD700';
                    this.ctx.fillRect(collectible.x, collectible.y, collectible.width, collectible.height);
                    this.ctx.strokeStyle = '#B8860B';
                    this.ctx.strokeRect(collectible.x, collectible.y, collectible.width, collectible.height);
                }
            }
        });
    }
    
    drawProjectiles() {
        this.projectiles.forEach(proj => {
            this.ctx.fillStyle = '#87CEEB';
            this.ctx.beginPath();
            this.ctx.ellipse(proj.x, proj.y, proj.width / 2, proj.height / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Trail effect
            this.ctx.fillStyle = 'rgba(135, 206, 235, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(proj.x - proj.velocityX, proj.y, proj.width / 3, proj.height / 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawEnhancedLlama() {
        const { x, y, width, height, facing, animationFrame } = this.llama;
        
        // Body
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x, y, width, height);
        
        // Head
        this.ctx.fillStyle = '#A0522D';
        const headX = facing === 'right' ? x + width - 15 : x + 15;
        this.ctx.fillRect(headX - 10, y - 20, 20, 25);
        
        // Ears
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(headX - 8, y - 35, 5, 15);
        this.ctx.fillRect(headX + 3, y - 35, 5, 15);
        
        // Legs (animated)
        const legOffset = Math.sin(animationFrame * 0.2) * 3;
        this.ctx.fillStyle = '#A0522D';
        this.ctx.fillRect(x + 5, y + height, 8, 15 + legOffset);
        this.ctx.fillRect(x + width - 13, y + height, 8, 15 - legOffset);
        
        // Eyes
        this.ctx.fillStyle = '#000';
        const eyeX = facing === 'right' ? headX + 5 : headX - 5;
        this.ctx.beginPath();
        this.ctx.arc(eyeX, y - 10, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Wool texture
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.arc(x + 10 + i * 8, y + 15, 4, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
    
    drawEnhancedUI() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(10, 10, 200, 80);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 20, 30);
        this.ctx.fillText(`Height: ${this.height}m`, 20, 50);
        this.ctx.fillText(`Spit: ${this.spitCount}`, 20, 70);
        this.ctx.fillText(`Fractal: ${this.currentFractal}`, 20, 90);
        
        // Controls help
        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('WASD: Move, Space: Jump, F: Spit', 10, this.canvas.height - 20);
    }
    
    updateUI() {
        // UI updates handled in render
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2 - 50);
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText(`Height Reached: ${this.height}m`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        this.ctx.fillText('Click to restart', this.canvas.width / 2, this.canvas.height / 2 + 80);
        
        this.canvas.addEventListener('click', () => this.restart(), { once: true });
    }
    
    restart() {
        this.gameState = 'playing';
        this.score = 0;
        this.height = 0;
        this.worldSpeed = 1.0;
        this.spitCount = 5;
        
        this.llama.x = 200;
        this.llama.y = 400;
        this.llama.velocityY = 0;
        this.llama.velocityX = 0;
        this.llama.isJumping = false;
        
        this.terrain = [];
        this.activeChunks.clear();
        this.projectiles = [];
        this.collectibles = [];
        
        this.generateEnhancedInitialTerrain();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the enhanced game
window.addEventListener('load', () => {
    new EnhancedFractalLlamaGame();
});