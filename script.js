import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

// Initialize Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Set up camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 0);

// Set up renderer with HDR and proper color space
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Create a custom first-person control system
const fps = {
    moveSpeed: 0.07,
    lookSpeed: 0.002,
    enabled: false,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false,
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
    mouseMoved: false,
    prevMouseX: 0,
    prevMouseY: 0
};

// Mouse lock implementation
const lockPointer = () => {
    document.body.requestPointerLock = document.body.requestPointerLock || 
                                       document.body.mozRequestPointerLock ||
                                       document.body.webkitRequestPointerLock;
    document.body.requestPointerLock();
};

document.addEventListener('click', () => {
    if (!fps.enabled) {
        lockPointer();
    }
});

// Handle pointer lock changes
document.addEventListener('pointerlockchange', pointerLockChange, false);
document.addEventListener('mozpointerlockchange', pointerLockChange, false);
document.addEventListener('webkitpointerlockchange', pointerLockChange, false);

function pointerLockChange() {
    if (document.pointerLockElement === document.body || 
        document.mozPointerLockElement === document.body || 
        document.webkitPointerLockElement === document.body) {
        fps.enabled = true;
    } else {
        fps.enabled = false;
    }
}

// Load the house model
const loader = new GLTFLoader();

loader.load("./assets/parkedge_final.glb", function(gltf) {
    const model = gltf.scene;
    
    // Set up shadows for the model
    model.traverse((object) => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            // Improve material quality
            if (object.material) {
                object.material.envMapIntensity = 1.5;
            }
        }
    });
    
    scene.add(model);
});

// Mouse movement event
document.addEventListener('mousemove', (event) => {
    if (fps.enabled) {
        // Get mouse movement
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        // Update rotation based on mouse movement
        fps.rotation.y -= movementX * fps.lookSpeed;
        fps.rotation.x -= movementY * fps.lookSpeed;
        
        // Limit vertical look
        fps.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, fps.rotation.x));
        
        // Apply rotation to camera
        camera.rotation.copy(fps.rotation);
        
        fps.mouseMoved = true;
    }
});

// Keyboard event listeners
document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW': fps.moveForward = true; break;
        case 'KeyA': fps.moveLeft = true; break;
        case 'KeyS': fps.moveBackward = true; break;
        case 'KeyD': fps.moveRight = true; break;
        case 'Space': fps.moveUp = true; break;
        case 'ShiftLeft': fps.moveDown = true; break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW': fps.moveForward = false; break;
        case 'KeyA': fps.moveLeft = false; break;
        case 'KeyS': fps.moveBackward = false; break;
        case 'KeyD': fps.moveRight = false; break;
        case 'Space': fps.moveUp = false; break;
        case 'ShiftLeft': fps.moveDown = false; break;
    }
});

// Create enhanced lighting
const ambient = new THREE.AmbientLight(0xfffff, 2);
scene.add(ambient)

// Create point light that follows the camera
const pointLight = new THREE.PointLight(0xffffaa, 1, 10);
pointLight.castShadow = true;
camera.add(pointLight);
scene.add(camera);


// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update composer size
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Set up post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);


// Add bloom effect
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.25,    // strength
    0.4,    // radius
    0.1    // threshold
);
composer.addPass(bloomPass);

// Add depth of field effect


// Add vignette and chromatic aberration using custom shader
// Vignette and Chromatic Aberration Shader
const vignetteShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "offset": { value: 0.2 },
        "darkness": { value: 1.0 }
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
        uniform float offset;
        uniform float darkness;
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;
            vec2 coord = (uv - 0.5) * 2.0; 
            float vignette = 1.0 - dot(coord, coord) * offset;
            vignette = clamp(vignette, 0.0, 1.0);

            // Apply chromatic aberration only in the dark vignette areas
            float aberrationAmount = (1.0 - vignette) * 0.005; // Increase for more effect
            vec2 rOffset = vec2(aberrationAmount, 0.0);
            vec2 bOffset = vec2(-aberrationAmount, 0.0);

            vec4 color;
            color.r = texture2D(tDiffuse, uv + rOffset).r; // Offset red channel
            color.g = texture2D(tDiffuse, uv).g;           // Green stays the same
            color.b = texture2D(tDiffuse, uv + bOffset).b; // Offset blue channel
            color.a = 1.0;

            // Darken based on vignette effect
            color.rgb *= vignette;
            color.rgb = mix(color.rgb, vec3(0.0), darkness * (1.0 - vignette) * 0.8);

            gl_FragColor = color;
        }
    `
};


const vignettePass = new ShaderPass(vignetteShader);
// composer.addPass(vignettePass)

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const focusSpeed = 0.1; // Adjusts focus transition smoothness

const bokehPass = new BokehPass(scene, camera, {
    focus: 3.0, // Default focus distance
    aperture: 0.01,
    maxblur: 0.001,
    width: window.innerWidth,
    height: window.innerHeight
});
// composer.addPass(bokehPass);
composer.addPass(smaaPass);

// Function to update focus based on user gaze
function updateFocus() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const targetDistance = intersects[0].distance; // Distance of the first intersected object
        bokehPass.uniforms.focus.value += (targetDistance - bokehPass.uniforms.focus.value) * focusSpeed;
    }
}

// Update mouse coordinates on movement
window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Get time for smooth movement
let previousTime = performance.now();

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    updateFocus();
    
    const time = performance.now();
    previousTime = time;
    
    // Process keyboard input for movement
    if (fps.enabled) {
        // Calculate velocity based on key input
        const speed = fps.moveSpeed;
        
        // Reset direction vector
        fps.direction.z = Number(fps.moveForward) - Number(fps.moveBackward);
        fps.direction.x = Number(fps.moveRight) - Number(fps.moveLeft);
        fps.direction.y = Number(fps.moveUp) - Number(fps.moveDown);
        
        // Normalize for diagonal movement
        if (fps.direction.length() > 0) {
            fps.direction.normalize();
        }
        
        // Calculate forward vector based on camera direction
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        // Calculate right vector
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();
        
        // Apply movement vectors
        if (fps.moveForward || fps.moveBackward) {
            camera.position.addScaledVector(forward, fps.direction.z * speed);
        }
        
        if (fps.moveLeft || fps.moveRight) {
            camera.position.addScaledVector(right, fps.direction.x * speed);
        }
        
        // Apply up/down movement
        if (fps.moveUp || fps.moveDown) {
            camera.position.y += fps.direction.y * speed;
        }
    }
    
    // Render the scene with post-processing effects
    composer.render();
}

animate();