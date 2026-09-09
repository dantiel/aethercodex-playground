// Hermetic Sacred Geometry Generator
// AetherCodex - Advanced 3D Sacred Geometry System

let scene, camera, renderer, controls;
let currentGeometry = null;
let rotationEnabled = true;
let complexity = 5;

init();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x88ff88, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    // Initial geometry
    generateGeometry('quantum');
    
    // Animation loop
    animate();
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function generateGeometry(type) {
    // Remove existing geometry
    if (currentGeometry) {
        scene.remove(currentGeometry);
    }
    
    let geometry;
    
    switch(type) {
        case 'quantum':
            geometry = createQuantumField();
            break;
        case 'fibonacci':
            geometry = createFibonacciSphere();
            break;
        case 'platonic':
            geometry = createPlatonicSolids();
            break;
        case 'metatron':
            geometry = createMetatronsCube();
            break;
        case 'merkaba':
            geometry = createMerkaba();
            break;
        case 'flower':
            geometry = createFlowerOfLife();
            break;
        default:
            geometry = createQuantumField();
    }
    
    currentGeometry = geometry;
    scene.add(geometry);
}

function createQuantumField() {
    const group = new THREE.Group();
    const particles = 1000 * complexity;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles * 3);
    const colors = new Float32Array(particles * 3);
    
    for (let i = 0; i < particles; i++) {
        const i3 = i * 3;
        
        // Quantum probability distribution
        const r = Math.random() * 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);
        
        // Quantum color states
        colors[i3] = Math.sin(r * 0.5) * 0.5 + 0.5;
        colors[i3 + 1] = Math.cos(r * 0.7) * 0.5 + 0.5;
        colors[i3 + 2] = Math.sin(r * 0.3 + 1) * 0.5 + 0.5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    return new THREE.Points(geometry, material);
}

function createFibonacciSphere() {
    const group = new THREE.Group();
    const points = 500 * complexity;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    
    for (let i = 0; i < points; i++) {
        const y = 1 - (i / (points - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        
        const sphereGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(i / points, 0.8, 0.5),
            emissive: new THREE.Color().setHSL(i / points, 0.3, 0.2)
        });
        
        const sphere = new THREE.Mesh(sphereGeometry, material);
        sphere.position.set(x, y, z);
        group.add(sphere);
    }
    
    return group;
}

function createPlatonicSolids() {
    const group = new THREE.Group();
    const solids = [
        { type: 'tetrahedron', scale: 0.8, position: new THREE.Vector3(-2, 0, 0) },
        { type: 'cube', scale: 0.8, position: new THREE.Vector3(0, 0, 0) },
        { type: 'octahedron', scale: 0.8, position: new THREE.Vector3(2, 0, 0) },
        { type: 'dodecahedron', scale: 0.6, position: new THREE.Vector3(-2, 2, 0) },
        { type: 'icosahedron', scale: 0.6, position: new THREE.Vector3(2, 2, 0) }
    ];
    
    solids.forEach((solid, index) => {
        let geometry;
        
        switch(solid.type) {
            case 'tetrahedron':
                geometry = new THREE.TetrahedronGeometry(solid.scale, 0);
                break;
            case 'cube':
                geometry = new THREE.BoxGeometry(solid.scale, solid.scale, solid.scale);
                break;
            case 'octahedron':
                geometry = new THREE.OctahedronGeometry(solid.scale, 0);
                break;
            case 'dodecahedron':
                geometry = new THREE.DodecahedronGeometry(solid.scale, 0);
                break;
            case 'icosahedron':
                geometry = new THREE.IcosahedronGeometry(solid.scale, 0);
                break;
        }
        
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(index / solids.length, 0.8, 0.5),
            wireframe: document.getElementById('materialType').value === 'wireframe',
            transparent: true,
            opacity: 0.9
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(solid.position);
        group.add(mesh);
    });
    
    return group;
}

function createMetatronsCube() {
    const group = new THREE.Group();
    const sphereGeometry = new THREE.SphereGeometry(0.1, 12, 12);
    
    // Metatron's Cube consists of 13 spheres in specific positions
    const positions = [
        [0, 0, 0],           // Center
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], // Axis
        [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [0.5, -0.5, 0.5], [0.5, -0.5, -0.5],
        [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5]
    ];
    
    positions.forEach((pos, i) => {
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(i / positions.length, 0.9, 0.6),
            emissive: new THREE.Color().setHSL(i / positions.length, 0.3, 0.1)
        });
        
        const sphere = new THREE.Mesh(sphereGeometry, material);
        sphere.position.set(pos[0], pos[1], pos[2]);
        group.add(sphere);
        
        // Connect spheres with lines
        if (i > 0) {
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(pos[0], pos[1], pos[2])
            ]);
            
            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x88ff88,
                transparent: true,
                opacity: 0.6
            });
            
            const line = new THREE.Line(lineGeometry, lineMaterial);
            group.add(line);
        }
    });
    
    return group;
}

function createMerkaba() {
    const group = new THREE.Group();
    
    // Create two interlocked tetrahedrons
    const tetraGeometry = new THREE.TetrahedronGeometry(1, 0);
    
    const material1 = new THREE.MeshPhongMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.7,
        wireframe: document.getElementById('materialType').value === 'wireframe'
    });
    
    const material2 = new THREE.MeshPhongMaterial({
        color: 0x4444ff,
        transparent: true,
        opacity: 0.7,
        wireframe: document.getElementById('materialType').value === 'wireframe'
    });
    
    const tetra1 = new THREE.Mesh(tetraGeometry, material1);
    const tetra2 = new THREE.Mesh(tetraGeometry, material2);
    
    // Rotate one tetrahedron 180 degrees
    tetra2.rotation.y = Math.PI;
    
    group.add(tetra1);
    group.add(tetra2);
    
    return group;
}

function createFlowerOfLife() {
    const group = new THREE.Group();
    const circles = 7 * complexity;
    
    for (let i = 0; i < circles; i++) {
        const radius = 0.2 + (i * 0.1);
        const segments = 64;
        
        const circleGeometry = new THREE.CircleGeometry(radius, segments);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(i / circles, 0.8, 0.6),
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const circle = new THREE.Mesh(circleGeometry, material);
        
        // Arrange in flower pattern
        const angle = (i * Math.PI * 2) / 6;
        circle.position.set(
            Math.cos(angle) * radius * 0.8,
            Math.sin(angle) * radius * 0.8,
            0
        );
        
        group.add(circle);
    }
    
    return group;
}

function changeMaterial() {
    if (currentGeometry) {
        generateGeometry('current'); // Regenerate with new material settings
    }
}

function updateComplexity() {
    complexity = parseInt(document.getElementById('complexity').value);
    if (currentGeometry) {
        generateGeometry('current');
    }
}

function toggleRotation() {
    rotationEnabled = !rotationEnabled;
}

function exportSTL() {
    if (currentGeometry) {
        const exporter = new THREE.STLExporter();
        const stlString = exporter.parse(currentGeometry);
        
        const blob = new Blob([stlString], { type: 'application/sla' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'sacred_geometry.stl';
        link.click();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (rotationEnabled && currentGeometry) {
        currentGeometry.rotation.x += 0.005;
        currentGeometry.rotation.y += 0.007;
    }
    
    controls.update();
    renderer.render(scene, camera);
}