// Fractal Generators for Fractal Llama Odyssey

class FractalGenerator {
    constructor() {
        this.type = 'base';
    }
    
    generateTerrain(chunkX, worldHeight, params) {
        return [];
    }
    
    getComplexity() {
        return 1;
    }
}

class SierpinskiGenerator extends FractalGenerator {
    constructor() {
        super();
        this.type = 'sierpinski';
    }
    
    generateTerrain(chunkX, worldHeight, params) {
        const { width, height, seed } = params;
        const terrain = [];
        const baseX = chunkX * width;
        
        // Sierpinski triangle pattern
        const levels = 4;
        const triangles = this.generateSierpinskiTriangles(baseX, 0, width, height, levels, seed);
        
        triangles.forEach(triangle => {
            terrain.push({
                x: triangle.x,
                y: triangle.y + worldHeight,
                width: triangle.width,
                height: triangle.height,
                color: '#5a8a5a',
                chunkX: chunkX
            });
        });
        
        return terrain;
    }
    
    generateSierpinskiTriangles(x, y, width, height, levels, seed) {
        const triangles = [];
        
        const generate = (x, y, width, height, level) => {
            if (level <= 0) return;
            
            // Add current triangle
            triangles.push({
                x: x,
                y: y + height * 0.5, // Platform in the middle
                width: width,
                height: height * 0.2
            });
            
            // Recursively generate smaller triangles
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            
            generate(x, y + halfHeight, halfWidth, halfHeight, level - 1);
            generate(x + halfWidth, y + halfHeight, halfWidth, halfHeight, level - 1);
            generate(x + halfWidth / 2, y, halfWidth, halfHeight, level - 1);
        };
        
        generate(x, y, width, height, levels);
        return triangles;
    }
    
    getComplexity() {
        return 2;
    }
}

class PerlinNoiseGenerator extends FractalGenerator {
    constructor() {
        super();
        this.type = 'perlin';
        this.permutation = this.generatePermutation();
    }
    
    generateTerrain(chunkX, worldHeight, params) {
        const { width, height, seed } = params;
        const terrain = [];
        const baseX = chunkX * width;
        
        // Generate smooth terrain using Perlin-like noise
        const segmentWidth = 20;
        const segments = Math.ceil(width / segmentWidth);
        
        for (let i = 0; i < segments; i++) {
            const x = baseX + i * segmentWidth;
            const noise = this.perlinNoise(x * 0.01, worldHeight * 0.001, seed);
            const segmentHeight = 30 + noise * 40;
            
            terrain.push({
                x: x,
                y: worldHeight + height - segmentHeight,
                width: segmentWidth,
                height: segmentHeight,
                color: '#6a9a6a',
                chunkX: chunkX
            });
        }
        
        return terrain;
    }
    
    perlinNoise(x, y, seed) {
        // Simplified Perlin noise implementation
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this.fade(x);
        const v = this.fade(y);
        
        const a = this.permutation[X] + Y;
        const aa = this.permutation[a];
        const ab = this.permutation[a + 1];
        const b = this.permutation[X + 1] + Y;
        const ba = this.permutation[b];
        const bb = this.permutation[b + 1];
        
        return this.lerp(v, 
            this.lerp(u, this.grad(this.permutation[aa], x, y),
                         this.grad(this.permutation[ba], x-1, y)),
            this.lerp(u, this.grad(this.permutation[ab], x, y-1),
                         this.grad(this.permutation[bb], x-1, y-1)));
    }
    
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(t, a, b) {
        return a + t * (b - a);
    }
    
    grad(hash, x, y) {
        const h = hash & 7;
        const u = h < 4 ? x : y;
        const v = h < 4 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
    }
    
    generatePermutation() {
        const p = new Array(512);
        for (let i = 0; i < 256; i++) {
            p[i] = p[i + 256] = Math.floor(Math.random() * 256);
        }
        return p;
    }
    
    getComplexity() {
        return 3;
    }
}

class MandelbrotGenerator extends FractalGenerator {
    constructor() {
        super();
        this.type = 'mandelbrot';
    }
    
    generateTerrain(chunkX, worldHeight, params) {
        const { width, height, seed } = params;
        const terrain = [];
        const baseX = chunkX * width;
        
        // Mandelbrot-inspired terrain patterns
        const segments = 8;
        const segmentWidth = width / segments;
        
        for (let i = 0; i < segments; i++) {
            const x = baseX + i * segmentWidth;
            const mandelValue = this.mandelbrotAt(x * 0.001, worldHeight * 0.001, 20);
            const segmentHeight = 40 + mandelValue * 60;
            
            terrain.push({
                x: x,
                y: worldHeight + height - segmentHeight,
                width: segmentWidth,
                height: segmentHeight,
                color: '#7aaa7a',
                chunkX: chunkX
            });
        }
        
        return terrain;
    }
    
    mandelbrotAt(x0, y0, maxIterations) {
        let x = 0;
        let y = 0;
        let iteration = 0;
        
        while (x * x + y * y <= 4 && iteration < maxIterations) {
            const xTemp = x * x - y * y + x0;
            y = 2 * x * y + y0;
            x = xTemp;
            iteration++;
        }
        
        return iteration / maxIterations;
    }
    
    getComplexity() {
        return 4;
    }
}

class KochSnowflakeGenerator extends FractalGenerator {
    constructor() {
        super();
        this.type = 'koch';
    }
    
    generateTerrain(chunkX, worldHeight, params) {
        const { width, height, seed } = params;
        const terrain = [];
        const baseX = chunkX * width;
        
        // Koch snowflake inspired platforms
        const levels = 3;
        const platforms = this.generateKochPlatforms(baseX, worldHeight + height - 100, width, 80, levels);
        
        platforms.forEach(platform => {
            terrain.push({
                x: platform.x,
                y: platform.y,
                width: platform.width,
                height: 20,
                color: '#8aba8a',
                chunkX: chunkX
            });
        });
        
        return terrain;
    }
    
    generateKochPlatforms(x, y, width, height, levels) {
        const platforms = [];
        
        const generate = (x1, y1, x2, y2, level) => {
            if (level === 0) {
                platforms.push({
                    x: x1,
                    y: y1,
                    width: x2 - x1,
                    height: 20
                });
                return;
            }
            
            const dx = x2 - x1;
            const dy = y2 - y1;
            
            const x3 = x1 + dx / 3;
            const y3 = y1 + dy / 3;
            const x4 = x1 + 2 * dx / 3;
            const y4 = y1 + 2 * dy / 3;
            
            // Koch curve middle segment
            const angle = Math.PI / 3;
            const midX = x3 + (x4 - x3) * Math.cos(angle) - (y4 - y3) * Math.sin(angle);
            const midY = y3 + (x4 - x3) * Math.sin(angle) + (y4 - y3) * Math.cos(angle);
            
            generate(x1, y1, x3, y3, level - 1);
            generate(x3, y3, midX, midY, level - 1);
            generate(midX, midY, x4, y4, level - 1);
            generate(x4, y4, x2, y2, level - 1);
        };
        
        generate(x, y, x + width, y, levels);
        return platforms;
    }
    
    getComplexity() {
        return 3;
    }
}

class DragonCurveGenerator extends FractalGenerator {
    constructor() {
        super();
        this.type = 'dragon';
    }
    
    generateTerrain(chunkX, worldHeight, params) {
        const { width, height, seed } = params;
        const terrain = [];
        const baseX = chunkX * width;
        
        // Dragon curve inspired winding paths
        const iterations = 8;
        const points = this.generateDragonCurve(baseX, worldHeight + height - 150, width, iterations);
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            terrain.push({
                x: p1.x,
                y: p1.y,
                width: Math.abs(p2.x - p1.x),
                height: 15,
                color: '#9aca9a',
                chunkX: chunkX
            });
        }
        
        return terrain;
    }
    
    generateDragonCurve(startX, startY, size, iterations) {
        let points = [{x: startX, y: startY}, {x: startX + size, y: startY}];
        
        for (let i = 0; i < iterations; i++) {
            const newPoints = [];
            
            for (let j = 0; j < points.length - 1; j++) {
                const p1 = points[j];
                const p2 = points[j + 1];
                
                newPoints.push(p1);
                
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                
                const midX = p1.x + dx / 2;
                const midY = p1.y + dy / 2;
                
                // Rotate 90 degrees around midpoint
                const rotatedX = midX - dy / 2 * (j % 2 === 0 ? 1 : -1);
                const rotatedY = midY + dx / 2 * (j % 2 === 0 ? 1 : -1);
                
                newPoints.push({x: rotatedX, y: rotatedY});
            }
            
            newPoints.push(points[points.length - 1]);
            points = newPoints;
        }
        
        return points;
    }
    
    getComplexity() {
        return 4;
    }
}