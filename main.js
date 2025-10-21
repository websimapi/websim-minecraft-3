import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { World, WORLD_HEIGHT } from './world.js';
import { Player } from './player.js';
import { Physics } from './physics.js';
import { CHUNK_SIZE } from './config.js';
import { CloudManager } from './clouds.js';
import { getBiome, getBiomeName } from './terrain.js';
import { Controls } from './controls.js';
import { Inventory, preloadInventoryIcons } from './inventory-ui.js';
import { BlockInteraction } from './block-interaction.js';
import { createTextures } from './blocks.js';
import { Console } from './console.js';
import { PlayerArm } from './player-arm.js';

const scene = new THREE.Scene();
const skyColor = 0x87B2D8;
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(skyColor, 0, 300);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 50, 0);

// View model scene for arm
const viewModelScene = new THREE.Scene();
const viewModelCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const pointerControls = new PointerLockControls(camera, document.body);

// UI Elements
const pauseMenu = document.getElementById('pause-menu');
const resumeButton = document.getElementById('resume-button');
const randomSeedButton = document.getElementById('random-seed-button');
const renderDistanceSlider = document.getElementById('render-distance');
const renderDistanceValue = document.getElementById('render-distance-value');
const worldSeedInput = document.getElementById('world-seed');
const coordsElement = document.getElementById('coords');
const fpsCounter = document.getElementById('fps-counter');

let isPaused = false;

// Seed management
let worldSeed;
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('seed')) {
    worldSeed = urlParams.get('seed');
} else {
    worldSeed = (Math.random() * 1e17).toString(36);
    urlParams.set('seed', worldSeed);
    window.history.replaceState({}, '', `${location.pathname}?${urlParams}`);
}
worldSeedInput.value = worldSeed;

// Setup pause menu
document.body.addEventListener('click', (e) => {
    // Only lock pointer if no UI is open and the click is on the canvas/body itself
    if (!isPaused && !inventory.isOpen && !inventory.isCraftingOpen && !inventory.isFurnaceOpen && (e.target === document.body || e.target === renderer.domElement)) {
        pointerControls.lock();
    }
});

resumeButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent click from bubbling to body
    isPaused = false;
    pauseMenu.classList.remove('visible');
    pointerControls.lock();
});

randomSeedButton.addEventListener('click', () => {
    const newSeed = (Math.random() * 1e17).toString(36);
    const newUrlParams = new URLSearchParams(window.location.search);
    newUrlParams.set('seed', newSeed);
    window.location.search = newUrlParams.toString();
});

renderDistanceSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    renderDistanceValue.textContent = `${value} chunks`;
    world.renderDistance = value;
    world.updateChunks(player.position.x, player.position.z);
    
    const fogDistance = value * CHUNK_SIZE * 1.8;
    scene.fog.far = fogDistance;
    
    const percent = ((value - 2) / (40 - 2)) * 100;
    e.target.style.background = `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${percent}%, #ddd ${percent}%, #ddd 100%)`;
});

pointerControls.addEventListener('lock', () => {
    isPaused = false;
    pauseMenu.classList.remove('visible');
    controls.movementEnabled = true;
});

pointerControls.addEventListener('unlock', () => {
    isPaused = true;
    controls.movementEnabled = false;

    // Only show pause menu if no other UI is open. This is key to fixing the bug.
    if (!inventory.isOpen && !inventory.isCraftingOpen && !inventory.isFurnaceOpen && !gameConsole.isOpen) {
        pauseMenu.classList.add('visible');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.code === 'Backquote') {
        if (!gameConsole.isOpen) {
            controls.movementEnabled = false;
        }
    }
    
    if (e.key === 'Escape') {
        if (inventory.isOpen) {
            inventory.toggleInventory();
            controls.movementEnabled = true;
        } else if (inventory.isCraftingOpen) {
            inventory.closeCrafting();
            controls.movementEnabled = true;
        } else if (inventory.isFurnaceOpen) {
            inventory.closeFurnace();
            controls.movementEnabled = true;
        } else if (gameConsole.isOpen) {
            gameConsole.close();
            controls.movementEnabled = true;
            if (!isPaused) pointerControls.lock();
        } else if (pointerControls.isLocked) {
            pointerControls.unlock();
            isPaused = true;
            pauseMenu.classList.add('visible');
        }
    }
});

document.addEventListener('requestPointerLock', () => {
    // Only lock if no menus are open. When exiting a menu, `isPaused` is true but we still want to lock.
    if (!inventory.isOpen && !inventory.isCraftingOpen && !inventory.isFurnaceOpen && !gameConsole.isOpen) {
        pointerControls.lock();
    }
});

document.body.addEventListener('mousedown', (e) => {
    if (pointerControls.isLocked && e.button === 0 && !isPaused && !inventory.isOpen && !inventory.isCraftingOpen && !inventory.isFurnaceOpen) {
        // playerArm.triggerSwing(); // Removed: Continuous attack animation is now driven by blockInteraction.mouseDown.left state
    }
});

// Initialize slider background
const updateSliderBackground = () => {
    const value = parseInt(renderDistanceSlider.value);
    const percent = ((value - 2) / (40 - 2)) * 100;
    renderDistanceSlider.style.background = `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${percent}%, #ddd ${percent}%, #ddd 100%)`;
};
updateSliderBackground();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// Preload textures first
const textures = createTextures();

// Game objects
const world = new World(scene, worldSeed);
const player = new Player(scene);
const physics = new Physics(world);
const cloudManager = new CloudManager(scene);
const controls = new Controls();
const inventory = new Inventory(world);
const blockInteraction = new BlockInteraction(scene, world, inventory, textures, () => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return dir;
});
const gameConsole = new Console(world, player);
const playerArm = new PlayerArm(viewModelScene);

// Camera height animation
let targetCameraHeight = 1.6;
let currentCameraHeight = 1.6;
const cameraHeightLerpSpeed = 10;

// FPS counter
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = 0;

let hasSpawned = false;

// Preload icons then start game
preloadInventoryIcons().then(() => {
    animate();
});

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Process MORE mesh builds per frame for faster updates
    const meshBuildStartTime = performance.now();
    while(world.meshBuildQueue.length > 0 && performance.now() - meshBuildStartTime < 10) {
        const { chunkX, chunkZ, data, blocks } = world.meshBuildQueue.shift();
        const key = `${chunkX},${chunkZ}`;
        const chunk = world.chunks.get(key);
        if (chunk) {
            if (blocks) {
                chunk.blocks = blocks;
            }
            chunk.buildMeshFromData(data);
        }
    }
    
    world.processMeshBuildQueue();
    
    // FPS counter
    frameCount++;
    lastFpsUpdate += delta;
    if (lastFpsUpdate >= 0.2) {
        const fps = Math.round(frameCount / lastFpsUpdate);
        fpsCounter.textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastFpsUpdate = 0;
    }
    
    if (pointerControls.isLocked && !isPaused && !inventory.isOpen && !inventory.isCraftingOpen && !inventory.isFurnaceOpen) {
        if (!hasSpawned) {
            // Find spawn location
            let spawnX = 0.5;
            let spawnZ = 0.5;
            let spawnY = world.getSpawnHeight(spawnX, spawnZ);
            
            let bestY = spawnY;
            let bestX = spawnX;
            let bestZ = spawnZ;
            
            for (let i = 0; i < 20; i++) {
                const testX = Math.random() * 100 - 50;
                const testZ = Math.random() * 100 - 50;
                const testY = world.getSpawnHeight(testX, testZ);
                
                if (testY < bestY && testY > 60 && testY < 100) {
                    bestY = testY;
                    bestX = testX;
                    bestZ = testZ;
                }
            }
            
            player.position.set(bestX, bestY, bestZ);
            player.velocity.set(0, 0, 0);
            hasSpawned = true;
        }

        if (!hasSpawned) {
            renderer.render(scene, camera);
            return;
        }
        
        // Movement
        const moveDirection = controls.getMovement(camera);
        const { speed, crouching } = controls.getCurrentSpeed(player);
        
        // Update player height for crouching
        if (crouching) {
            player.height = 1.5;
            targetCameraHeight = 1.2;
        } else {
            player.height = 1.8;
            targetCameraHeight = 1.6;
        }
        
        currentCameraHeight = THREE.MathUtils.lerp(currentCameraHeight, targetCameraHeight, delta * cameraHeightLerpSpeed);
        player.eyeHeight = currentCameraHeight;
        
        player.velocity.x = moveDirection.x * speed;
        player.velocity.z = moveDirection.z * speed;
        
        if (player.isGrounded && controls.keys.space) {
            player.velocity.y = controls.jumpStrength;
        }
        
        physics.update(player, delta);
        
        camera.position.copy(player.position);
        camera.position.y += player.eyeHeight;
        
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        blockInteraction.setCameraPosition(camera.position);
        blockInteraction.setCameraDirection(cameraDirection);
        
        // UI updates
        const biomeValue = getBiome(player.position.x, player.position.z, world.seed);
        const biomeName = getBiomeName(biomeValue);
        coordsElement.innerHTML = `X: ${player.position.x.toFixed(2)} Y: ${player.position.y.toFixed(2)} Z: ${player.position.z.toFixed(2)}<br>Biome: ${biomeName}`;
        
        world.updateChunks(player.position.x, player.position.z);
        cloudManager.update(player.position.x, player.position.z, delta);
        
        blockInteraction.setPlayerAABB(player.aabb);
        blockInteraction.updateSelectedBlock(camera);
        blockInteraction.updateBreaking(delta);
        blockInteraction.updateDroppedItems(delta, player.position);
        blockInteraction.updateTNT(delta);
        blockInteraction.updateFallingBlocks(delta);
        blockInteraction.processBlockUpdates();
        
        // Respawn if fell
        if (player.position.y < -50) {
            const respawnY = world.getSpawnHeight(player.position.x, player.position.z);
            player.position.set(player.position.x, respawnY, player.position.z);
            player.velocity.set(0, 0, 0);
        }
        
        const playerIsMoving = moveDirection.lengthSq() > 0;
        const playerIsSprinting = controls.keys.shift && playerIsMoving;
        const selectedSlot = inventory.getSelectedBlock();
        const selectedItemType = selectedSlot ? selectedSlot.type : null;
        
        playerArm.update(delta, playerIsMoving, playerIsSprinting, blockInteraction.mouseDown.left, selectedItemType, textures);
    }
    
    // Update furnace even when UI is closed
    inventory.updateFurnace(delta);
    
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(viewModelScene, viewModelCamera);
    renderer.autoClear = true;
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    viewModelCamera.aspect = window.innerWidth / window.innerHeight;
    viewModelCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});