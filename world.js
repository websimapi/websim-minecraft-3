import { Chunk } from './chunk.js';
import { BlockType, createTextures } from './blocks.js';
import { getTerrainHeight } from './terrain.js';
import * as THREE from 'three';
import { CHUNK_SIZE, WORLD_HEIGHT } from './config.js';

export { WORLD_HEIGHT };

const MAX_WORKERS = navigator.hardwareConcurrency || 4;

export class World {
    constructor(scene, seed) {
        this.scene = scene;
        this.chunks = new Map();
        this.renderDistance = 4;
        this.textures = createTextures();
        this.seedString = seed;
        this.seed = this.hashCode(seed);

        this.chunkGenerationQueue = [];
        this.workers = [];
        this.workerJobQueue = [];
        this.meshBuildQueue = []; // Queue for building meshes on the main thread
        this.fallingBlocks = []; // For block-placer access
        this.initWorkers();

        // Don't generate initial chunks here, wait for first update
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    initWorkers() {
        for (let i = 0; i < MAX_WORKERS; i++) {
            const worker = new Worker('./worker.js', { type: 'module' });
            worker.onmessage = (e) => this.onWorkerMessage(e, worker);
            worker.postMessage({ type: 'set_seed', payload: this.seed });
            this.workers.push({ worker, busy: false });
        }
    }

    onWorkerMessage(e, worker) {
        const { type, chunkX, chunkZ, data, blocks } = e.data;

        if (type === 'geometry') {
            this.meshBuildQueue.push({ chunkX, chunkZ, data, blocks });
        }

        // Mark worker as not busy and process next job
        const workerWrapper = this.workers.find(w => w.worker === worker);
        if (workerWrapper) {
            workerWrapper.busy = false;
        }
        this.processWorkerQueue();
    }

    processMeshBuildQueue() {
        if (this.meshBuildQueue.length === 0) return;

        const startTime = performance.now();
        // Process all pending mesh builds
        while(this.meshBuildQueue.length > 0 && performance.now() - startTime < 5) {
            const { chunkX, chunkZ, data, blocks } = this.meshBuildQueue.shift();
            const key = `${chunkX},${chunkZ}`;
            const chunk = this.chunks.get(key);
            if (chunk) {
                if (blocks) {
                    chunk.blocks = blocks;
                }
                chunk.buildMeshFromData(data);
            }
        }
    }

    processWorkerQueue() {
        if (this.workerJobQueue.length === 0) return;

        const availableWorker = this.workers.find(w => !w.busy);
        if (availableWorker) {
            const job = this.workerJobQueue.shift();
            availableWorker.busy = true;
            availableWorker.worker.postMessage({ type: 'chunk_data', payload: job });
        }
    }

    generateChunk(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        if (this.chunks.has(key)) return;

        const chunk = new Chunk(chunkX, chunkZ, this.textures, this.scene);
        this.chunks.set(key, chunk);

        // Queue up the mesh generation for a worker
        if (!this.workerJobQueue.find(j => j.chunkX === chunkX && j.chunkZ === chunkZ)) {
             this.workerJobQueue.push({ chunkX, chunkZ });
             this.processWorkerQueue();
        }
    }

    processChunkQueue() {
        // This is now handled by the worker queue, this function can be removed or repurposed
    }

    updateChunks(playerX, playerZ) {
        const playerChunkX = Math.floor(playerX / CHUNK_SIZE);
        const playerChunkZ = Math.floor(playerZ / CHUNK_SIZE);

        // Generate chunks around player in a spiral pattern for better loading
        const chunksToLoad = [];
        for (let x = playerChunkX - this.renderDistance; x <= playerChunkX + this.renderDistance; x++) {
            for (let z = playerChunkZ - this.renderDistance; z <= playerChunkZ + this.renderDistance; z++) {
                const key = `${x},${z}`;
                if (!this.chunks.has(key)) {
                    chunksToLoad.push({ x, z, distSq: (x - playerChunkX)**2 + (z-playerChunkZ)**2 });
                }
            }
        }

        chunksToLoad.sort((a, b) => a.distSq - b.distSq);
        chunksToLoad.forEach(c => this.generateChunk(c.x, c.z));

        // Remove chunks that are too far
        const toRemove = [];
        for (const [key, chunk] of this.chunks.entries()) {
            const [chunkX, chunkZ] = key.split(',').map(Number);
            const dx = Math.abs(chunkX - playerChunkX);
            const dz = Math.abs(chunkZ - playerChunkZ);

            if (dx > this.renderDistance + 1 || dz > this.renderDistance + 1) {
                chunk.dispose();
                toRemove.push(key);
            }
        }

        toRemove.forEach(key => this.chunks.delete(key));
    }

    getBlockAt(worldX, worldY, worldZ) {
        if (worldY < 0 || worldY >= WORLD_HEIGHT) return BlockType.AIR;

        const chunkX = Math.floor(worldX / CHUNK_SIZE);
        const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
        const key = `${chunkX},${chunkZ}`;

        const chunk = this.chunks.get(key);
        if (!chunk) return BlockType.AIR;

        const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        return chunk.getBlock(localX, worldY, localZ);
    }

    getBlockDataAt(worldX, worldY, worldZ) {
        if (worldY < 0 || worldY >= WORLD_HEIGHT) return null;

        const chunkX = Math.floor(worldX / CHUNK_SIZE);
        const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
        const key = `${chunkX},${chunkZ}`;

        const chunk = this.chunks.get(key);
        if (!chunk || !chunk.blocks) return null;

        const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        const index = localX + worldY * CHUNK_SIZE + localZ * CHUNK_SIZE * WORLD_HEIGHT;
        return chunk.blocks[index];
    }

    setBlockAt(worldX, worldY, worldZ, blockType, cameraDirection = null) {
        if (worldY < 0 || worldY >= WORLD_HEIGHT) return;

        const chunkX = Math.floor(worldX / CHUNK_SIZE);
        const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
        const key = `${chunkX},${chunkZ}`;

        const chunk = this.chunks.get(key);
        if (!chunk || !chunk.blocks) return;

        const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const index = localX + worldY * CHUNK_SIZE + localZ * CHUNK_SIZE * WORLD_HEIGHT;

        let rotationMetadata = 0;
        const isPlacingNewBlock = cameraDirection instanceof THREE.Vector3;
        
        const existingBlockData = chunk.blocks[index];
        const existingBlockType = existingBlockData & 0xFF;

        // Optimization: check if the block type is identical and no new placement direction is given
        if (blockType === existingBlockType && !isPlacingNewBlock) return;

        if (blockType === BlockType.FURNACE || blockType === BlockType.FURNACE_LIT) {
             if (isPlacingNewBlock) {
                // Placing a brand new furnace
                // Determine facing based on camera direction
                const absX = Math.abs(cameraDirection.x);
                const absZ = Math.abs(cameraDirection.z);
    
                let rotation = 0; // Default South
                if (absX > absZ) {
                    rotation = cameraDirection.x > 0 ? 3 : 1; // East(3) : West(1)
                } else {
                    rotation = cameraDirection.z > 0 ? 0 : 2; // South(0) : North(2)
                }
                 // Invert rotation to face the player
                const playerFacingRotation = (rotation + 2) % 4;
                rotationMetadata = playerFacingRotation << 8;
             } else if (existingBlockType === BlockType.FURNACE || existingBlockType === BlockType.FURNACE_LIT) {
                 // Updating existing furnace state (preserve rotation)
                 // Keep rotation metadata (bits 8 and 9)
                 rotationMetadata = existingBlockData & 0x0300;
             } else {
                 // Setting furnace block where it wasn't before, but without camera direction (Error state, treat as default)
                 rotationMetadata = 0;
             }
             
             chunk.blocks[index] = blockType | rotationMetadata;
             
        } else {
            // General blocks (uses chunk.setBlock which handles log rotation logic)
            chunk.setBlock(localX, worldY, localZ, blockType, cameraDirection);
        }

        // Force immediate rebuild - clear any existing jobs for this chunk first
        this.workerJobQueue = this.workerJobQueue.filter(
            job => !(job.chunkX === chunkX && job.chunkZ === chunkZ)
        );
        this.meshBuildQueue = this.meshBuildQueue.filter(
            job => !(job.chunkX === chunkX && job.chunkZ === chunkZ)
        );

        // Add to FRONT of queue for immediate processing
        this.workerJobQueue.unshift({ chunkX, chunkZ, blocks: chunk.blocks });

        // Process multiple workers immediately
        for (let i = 0; i < Math.min(3, this.workers.length); i++) {
            this.processWorkerQueue();
        }
    }

    forceRebuildChunks(chunkKeys) {
        chunkKeys.forEach(key => {
            const [chunkX, chunkZ] = key.split(',').map(Number);
            const chunk = this.chunks.get(key);

            if (chunk && chunk.blocks) {
                // Remove from all queues if already there
                this.workerJobQueue = this.workerJobQueue.filter(
                    job => !(job.chunkX === chunkX && job.chunkZ === chunkZ)
                );
                this.meshBuildQueue = this.meshBuildQueue.filter(
                    job => !(job.chunkX === chunkX && job.chunkZ === chunkZ)
                );

                // Add to front of queue for immediate processing
                this.workerJobQueue.unshift({ chunkX, chunkZ, blocks: chunk.blocks });
            }
        });

        // Process workers immediately multiple times to ensure they start
        for (let i = 0; i < Math.min(this.workers.length, chunkKeys.length); i++) {
            this.processWorkerQueue();
        }
    }

    getSpawnHeight(x, z) {
        const terrainHeight = getTerrainHeight(x, z, this.seed);
        return terrainHeight + 2; // Spawn 2 blocks above terrain
    }
}