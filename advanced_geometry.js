// HERMETIC QUANTUM GEOMETRY ENGINE
// AetherCodex - Advanced Computational Sacred Geometry

class QuantumGeometrySystem {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 8;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        
        this.initLighting();
        this.initPostProcessing();
        this.initQuantumField();
        this.initHermeticParameters();
        
        this.clock = new THREE.Clock();
        this.animate();
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    initLighting() {
        // Quantum harmonic lighting
        this.lights = [];
        for (let i = 0; i < 7; i++) {
            const light = new THREE.PointLight(
                new THREE.Color().setHSL(i/7, 0.8, 0.7),
                2,
                10
            );
            light.position.set(
                Math.cos(i * Math.PI * 2 / 7) * 3,
                Math.sin(i * Math.PI * 2 / 7) * 3,
                Math.sin(i * Math.PI / 3.5) * 3
            );
            this.scene.add(light);
            this.lights.push(light);
        }
    }
    
    initPostProcessing() {
        // Advanced rendering pipeline
        this.composer = new THREE.EffectComposer(this.renderer);
        
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Quantum interference shader
        this.quantumPass = new THREE.ShaderPass({
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0 },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                uniform vec2 resolution;
                varying vec2 vUv;
                
                void main() {
                    vec2 uv = vUv;
                    vec4 color = texture2D(tDiffuse, uv);
                    
                    // Quantum wave interference pattern
                    vec2 p = uv * 10.0 - 5.0;
                    float wave = sin(length(p) * 10.0 - time * 2.0) * 0.5 + 0.5;
                    
                    // Hermetic color transformation
                    vec3 hermetic = vec3(
                        sin(time * 0.3 + uv.x * 3.14) * 0.3 + 0.7,
                        cos(time * 0.5 + uv.y * 6.28) * 0.3 + 0.7,
                        sin(time * 0.7 + (uv.x + uv.y) * 9.42) * 0.3 + 0.7
                    );
                    
                    gl_FragColor = vec4(mix(color.rgb, hermetic, wave * 0.3), color.a);
                }
            `
        });
        this.composer.addPass(this.quantumPass);
    }
    
    initQuantumField() {
        // Advanced quantum state system
        this.quantumStates = new Map();
        this.particleSystem = this.createQuantumParticleSystem(5000);
        this.scene.add(this.particleSystem);
        
        // Hermetic resonance field
        this.resonanceField = this.createResonanceField();
        this.scene.add(this.resonanceField);
    }
    
    createQuantumParticleSystem(count) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const phases = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        
        // Initialize quantum states with complex probability distributions
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            
            // Quantum probability cloud with Hermetic constraints
            const r = this.quantumProbabilityDensity(i, count);
            const theta = this.goldenRatioPhase(i);
            const phi = this.fibonacciPhase(i);
            
            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);
            
            // Quantum velocity field (complex wave function)
            velocities[i3] = Math.sin(theta * 7 + phi * 3) * 0.1;
            velocities[i3 + 1] = Math.cos(theta * 5 + phi * 2) * 0.1;
            velocities[i3 + 2] = Math.sin(theta * 3 + phi * 7) * 0.1;
            
            // Quantum phase coherence
            phases[i] = this.quantumPhaseCoherence(i, count);
            
            // Hermetic color spectrum based on quantum numbers
            colors[i3] = this.hermeticColor(i, 0);
            colors[i3 + 1] = this.hermeticColor(i, 1);
            colors[i3 + 2] = this.hermeticColor(i, 2);
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.02,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        return new THREE.Points(geometry, material);
    }
    
    quantumProbabilityDensity(i, total) {
        // Complex probability distribution combining quantum mechanics and sacred geometry
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const normalized = i / total;
        
        // Quantum harmonic oscillator probability
        const quantumProb = Math.exp(-Math.pow(normalized * 3 - 1.5, 2) / 0.5);
        
        // Fibonacci modulation
        const fibMod = Math.sin(normalized * Math.PI * goldenRatio);
        
        // Hermetic resonance factor
        const hermeticRes = 0.5 + 0.5 * Math.sin(normalized * Math.PI * 7);
        
        return (quantumProb * 0.6 + fibMod * 0.3 + hermeticRes * 0.1) * 4;
    }
    
    goldenRatioPhase(i) {
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        return goldenAngle * i;
    }
    
    fibonacciPhase(i) {
        // Advanced Fibonacci phase modulation
        const fibSeq = this.generateFibonacci(20);
        const phaseIndex = i % fibSeq.length;
        return (fibSeq[phaseIndex] / fibSeq[fibSeq.length - 1]) * Math.PI * 2;
    }
    
    generateFibonacci(n) {
        const seq = [0, 1];
        for (let i = 2; i < n; i++) {
            seq.push(seq[i-1] + seq[i-2]);
        }
        return seq;
    }
    
    quantumPhaseCoherence(i, total) {
        // Quantum phase coherence function with entanglement effects
        const basePhase = (i / total) * Math.PI * 2;
        const entanglement = Math.sin(basePhase * 7) * Math.cos(basePhase * 3);
        return basePhase + entanglement * 0.2;
    }
    
    hermeticColor(i, channel) {
        // Advanced hermetic color theory based on quantum numbers
        const channels = [
            Math.sin(i * 0.013 + channel * 1.047) * 0.4 + 0.6,  // Red channel
            Math.cos(i * 0.017 + channel * 2.094) * 0.4 + 0.6,  // Green channel  
            Math.sin(i * 0.019 + channel * 3.141) * 0.4 + 0.6   // Blue channel
        ];
        return channels[channel];
    }
    
    createResonanceField() {
        // Hermetic resonance field geometry
        const geometry = new THREE.IcosahedronGeometry(3, 3);
        
        // Custom shader material for resonance effects
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                resonance: { value: 0.5 }
            },
            vertexShader: `
                uniform float time;
                uniform float resonance;
                varying vec3 vNormal;
                varying vec2 vUv;
                
                void main() {
                    vNormal = normal;
                    vUv = uv;
                    
                    // Hermetic resonance displacement
                    float displacement = sin(position.x * 3.0 + time) * 
                                       cos(position.y * 2.0 + time * 1.3) * 
                                       sin(position.z * 4.0 + time * 0.7) * 
                                       resonance * 0.3;
                    
                    vec3 newPosition = position + normal * displacement;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float resonance;
                varying vec3 vNormal;
                varying vec2 vUv;
                
                void main() {
                    // Hermetic color resonance
                    vec3 color = vec3(
                        sin(time * 0.3 + vUv.x * 10.0) * 0.3 + 0.7,
                        cos(time * 0.5 + vUv.y * 8.0) * 0.3 + 0.7,
                        sin(time * 0.7 + (vUv.x + vUv.y) * 12.0) * 0.3 + 0.7
                    );
                    
                    // Normal-based lighting with resonance
                    float intensity = pow(0.5 + 0.5 * dot(vNormal, vec3(0.0, 1.0, 0.0)), 2.0);
                    color *= intensity;
                    
                    // Quantum transparency effect
                    float alpha = 0.1 + resonance * 0.3;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            wireframe: false
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    initHermeticParameters() {
        // Advanced control parameters for hermetic manipulation
        this.params = {
            quantumCoherence: 0.7,
            hermeticResonance: 0.5,
            temporalFlow: 1.0,
            spatialCurvature: 0.3,
            entanglementStrength: 0.8,
            goldenRatioInfluence: 0.9,
            fibonacciModulation: 0.6,
            quantumDecoherence: 0.2
        };
        
        this.createControlInterface();
    }
    
    createControlInterface() {
        // Advanced parameter controls
        const gui = new dat.GUI();
        
        gui.add(this.params, 'quantumCoherence', 0, 1).name('Quantum Coherence').onChange(v => {
            this.updateQuantumStates();
        });
        
        gui.add(this.params, 'hermeticResonance', 0, 1).name('Hermetic Resonance').onChange(v => {
            if (this.resonanceField.material.uniforms) {
                this.resonanceField.material.uniforms.resonance.value = v;
            }
        });
        
        gui.add(this.params, 'temporalFlow', 0.1, 2).name('Temporal Flow');
        gui.add(this.params, 'spatialCurvature', 0, 1).name('Spatial Curvature');
        gui.add(this.params, 'entanglementStrength', 0, 1).name('Entanglement Strength');
        gui.add(this.params, 'goldenRatioInfluence', 0, 1).name('Golden Ratio');
        gui.add(this.params, 'fibonacciModulation', 0, 1).name('Fibonacci Modulation');
        gui.add(this.params, 'quantumDecoherence', 0, 1).name('Quantum Decoherence');
        
        // Advanced interaction controls
        gui.add(this, 'triggerQuantumCollapse').name('Quantum Collapse');
        gui.add(this, 'entangleSystems').name('Entangle Systems');
        gui.add(this, 'generateSacredPattern').name('Generate Pattern');
        gui.add(this, 'exportQuantumState').name('Export State');
    }
    
    updateQuantumStates() {
        // Advanced quantum state evolution
        const positions = this.particleSystem.geometry.attributes.position.array;
        const velocities = this.particleSystem.geometry.attributes.velocity.array;
        const phases = this.particleSystem.geometry.attributes.phase.array;
        
        for (let i = 0; i < positions.length / 3; i++) {
            const i3 = i * 3;
            
            // Advanced quantum evolution equations
            const coherence = this.params.quantumCoherence;
            const entanglement = this.params.entanglementStrength;
            
            // Non-linear quantum dynamics
            positions[i3] += velocities[i3] * coherence;
            positions[i3 + 1] += velocities[i3 + 1] * coherence;
            positions[i3 + 2] += velocities[i3 + 2] * coherence;
            
            // Quantum phase evolution with hermetic modulation
            phases[i] += 0.01 * this.params.temporalFlow * 
                        (1 + Math.sin(phases[i] * entanglement) * 0.3);
            
            // Position-dependent velocity updates (quantum field effects)
            const r = Math.sqrt(
                positions[i3] * positions[i3] +
                positions[i3 + 1] * positions[i3 + 1] +
                positions[i3 + 2] * positions[i3 + 2]
            );
            
            velocities[i3] += (Math.random() - 0.5) * this.params.quantumDecoherence * 0.1;
            velocities[i3 + 1] += (Math.random() - 0.5) * this.params.quantumDecoherence * 0.1;
            velocities[i3 + 2] += (Math.random() - 0.5) * this.params.quantumDecoherence * 0.1;
            
            // Normalize and constrain to quantum probability sphere
            if (r > 5) {
                positions[i3] *= 4.9 / r;
                positions[i3 + 1] *= 4.9 / r;
                positions[i3 + 2] *= 4.9 / r;
            }
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.phase.needsUpdate = true;
    }
    
    triggerQuantumCollapse() {
        // Simulate quantum measurement collapse
        const positions = this.particleSystem.geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length / 3; i++) {
            const i3 = i * 3;
            
            // Collapse to probability-determined states
            const prob = this.quantumProbabilityDensity(i, positions.length / 3);
            if (Math.random() < prob * 0.1) {
                // Quantum jump to new state
                positions[i3] = (Math.random() - 0.5) * 8;
                positions[i3 + 1] = (Math.random() - 0.5) * 8;
                positions[i3 + 2] = (Math.random() - 0.5) * 8;
            }
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    entangleSystems() {
        // Create quantum entanglement between particles
        const positions = this.particleSystem.geometry.attributes.position.array;
        const count = positions.length / 3;
        
        for (let i = 0; i < count; i += 2) {
            if (i + 1 < count) {
                // Entangle pairs of particles
                const avgX = (positions[i*3] + positions[(i+1)*3]) / 2;
                const avgY = (positions[i*3+1] + positions[(i+1)*3+1]) / 2;
                const avgZ = (positions[i*3+2] + positions[(i+1)*3+2]) / 2;
                
                positions[i*3] = avgX + (Math.random() - 0.5) * 0.1;
                positions[i*3+1] = avgY + (Math.random() - 0.5) * 0.1;
                positions[i*3+2] = avgZ + (Math.random() - 0.5) * 0.1;
                
                positions[(i+1)*3] = avgX + (Math.random() - 0.5) * 0.1;
                positions[(i+1)*3+1] = avgY + (Math.random() - 0.5) * 0.1;
                positions[(i+1)*3+2] = avgZ + (Math.random() - 0.5) * 0.1;
            }
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    generateSacredPattern() {
        // Generate advanced sacred geometry pattern
        const patternType = Math.floor(Math.random() * 5);
        
        switch(patternType) {
            case 0:
                this.generateFlowerOfLifeVariant();
                break;
            case 1:
                this.generateMetatronCubeAdvanced();
                break;
            case 2:
                this.generateQuantumMandelbrot();
                break;
            case 3:
                this.generateHermeticLattice();
                break;
            case 4:
                this.generateGoldenSpiralField();
                break;
        }
    }
    
    generateFlowerOfLifeVariant() {
        // Advanced Flower of Life with quantum modifications
        const positions = this.particleSystem.geometry.attributes.position.array;
        const count = positions.length / 3;
        
        const layers = 7;
        const pointsPerLayer = Math.floor(count / layers);
        
        for (let layer = 0; layer < layers; layer++) {
            const radius = 0.5 + layer * 0.7;
            const pointsInLayer = Math.min(pointsPerLayer, count - layer * pointsPerLayer);
            
            for (let i = 0; i < pointsInLayer; i++) {
                const index = layer * pointsPerLayer + i;
                if (index * 3 + 2 < positions.length) {
                    const angle = (i / pointsInLayer) * Math.PI * 2;
                    const variance = Math.sin(angle * 3) * 0.1 * this.params.spatialCurvature;
                    
                    positions[index*3] = Math.cos(angle) * (radius + variance);
                    positions[index*3+1] = Math.sin(angle) * (radius + variance);
                    positions[index*3+2] = Math.sin(angle * 2) * 0.3;
                }
            }
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    exportQuantumState() {
        // Export current quantum state as JSON for analysis
        const state = {
            positions: Array.from(this.particleSystem.geometry.attributes.position.array),
            velocities: Array.from(this.particleSystem.geometry.attributes.velocity.array),
            phases: Array.from(this.particleSystem.geometry.attributes.phase.array),
            parameters: this.params,
            timestamp: Date.now(),
            quantumSignature: this.calculateQuantumSignature()
        };
        
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'quantum_state.json';
        link.click();
    }
    
    calculateQuantumSignature() {
        // Calculate hermetic quantum signature of current state
        const positions = this.particleSystem.geometry.attributes.position.array;
        let signature = 0;
        
        for (let i = 0; i < positions.length; i++) {
            signature += positions[i] * Math.sin(i * 0.01);
        }
        
        return signature;
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        
        if (this.quantumPass.uniforms) {
            this.quantumPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();
        
        // Update quantum system
        this.updateQuantumStates();
        
        // Update shader uniforms
        if (this.quantumPass.uniforms) {
            this.quantumPass.uniforms.time.value = time;
        }
        
        if (this.resonanceField.material.uniforms) {
            this.resonanceField.material.uniforms.time.value = time;
        }
        
        // Animate lights with quantum rhythm
        this.lights.forEach((light, i) => {
            light.intensity = 1 + Math.sin(time * (0.5 + i * 0.1)) * 0.5;
            light.position.x = Math.cos(time * 0.3 + i) * 4;
            light.position.y = Math.sin(time * 0.4 + i * 1.3) * 4;
            light.position.z = Math.cos(time * 0.5 + i * 0.7) * 4;
        });
        
        this.controls.update();
        this.composer.render();
    }
}

// Initialize the advanced system
const quantumGeometry = new QuantumGeometrySystem();