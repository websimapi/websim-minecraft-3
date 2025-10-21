import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const CLOUD_CHUNK_SIZE = 64;
const CLOUD_WORLD_HEIGHT = 10;
const CLOUD_Y_OFFSET = 200;
const CLOUD_RENDER_DISTANCE = 3;

export class CloudManager {
    constructor(scene) {
        this.scene = scene;
        this.clouds = new Map();
        this.noise = createNoise2D();
        this.cloudOffset = { x: 0, z: 0 };
        this.moveSpeed = 1.2; // Increased from 0.4

        const cloudMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            flatShading: true
        });
        this.cloudGeometry = new THREE.BoxGeometry(3, 3, 3);
        this.cloudMaterial = cloudMaterial;
    }

    update(playerX, playerZ, delta) {
        this.cloudOffset.x += delta * this.moveSpeed;
        this.cloudOffset.z += delta * this.moveSpeed * 0.3;
        
        const playerChunkX = Math.floor((playerX - this.cloudOffset.x) / CLOUD_CHUNK_SIZE);
        const playerChunkZ = Math.floor((playerZ - this.cloudOffset.z) / CLOUD_CHUNK_SIZE);

        const loadedChunks = new Set();

        for (let x = playerChunkX - CLOUD_RENDER_DISTANCE; x <= playerChunkX + CLOUD_RENDER_DISTANCE; x++) {
            for (let z = playerChunkZ - CLOUD_RENDER_DISTANCE; z <= playerChunkZ + CLOUD_RENDER_DISTANCE; z++) {
                const key = `${x},${z}`;
                loadedChunks.add(key);
                if (!this.clouds.has(key)) {
                    this.generateCloudChunk(x, z);
                }
            }
        }

        // Update cloud positions for smooth movement
        for (const [key, chunk] of this.clouds.entries()) {
            const [chunkX, chunkZ] = key.split(',').map(Number);
            chunk.position.set(
                chunkX * CLOUD_CHUNK_SIZE + this.cloudOffset.x,
                0,
                chunkZ * CLOUD_CHUNK_SIZE + this.cloudOffset.z
            );
        }

        const toRemove = [];
        for (const key of this.clouds.keys()) {
            if (!loadedChunks.has(key)) {
                const chunk = this.clouds.get(key);
                this.scene.remove(chunk);
                chunk.geometry.dispose();
                toRemove.push(key);
            }
        }
        toRemove.forEach(key => this.clouds.delete(key));
    }

    generateCloudChunk(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        if (this.clouds.has(key)) {
            return;
        }

        const instances = [];
        const scale1 = 0.02;
        const scale2 = 0.035;
        const threshold = 0.62; // Increased threshold for fewer clouds

        for (let x = 0; x < CLOUD_CHUNK_SIZE; x += 3) { // Changed from 2 to 3 for fewer instances
            for (let z = 0; z < CLOUD_CHUNK_SIZE; z += 3) { // Changed from 2 to 3
                for (let y = 0; y < CLOUD_WORLD_HEIGHT; y++) {
                    const worldX = chunkX * CLOUD_CHUNK_SIZE + x;
                    const worldZ = chunkZ * CLOUD_CHUNK_SIZE + z;

                    // Use two noise layers with different scales to prevent elongation
                    const noise1 = (this.noise(worldX * scale1, worldZ * scale1) + 1) / 2;
                    const noise2 = (this.noise(worldX * scale2, worldZ * scale2 + 1000) + 1) / 2;
                    const baseNoise = (noise1 + noise2) / 2;
                    
                    const heightFactor = 1.0 - Math.abs((y / CLOUD_WORLD_HEIGHT) - 0.5) * 1.5;
                    
                    const cloudValue = baseNoise * heightFactor;
                    
                    if (cloudValue > threshold) {
                        const dummy = new THREE.Object3D();
                        dummy.position.set(x, y + CLOUD_Y_OFFSET, z);
                        dummy.updateMatrix();
                        instances.push(dummy.matrix);
                    }
                }
            }
        }

        if (instances.length > 0) {
            const instancedMesh = new THREE.InstancedMesh(this.cloudGeometry, this.cloudMaterial, instances.length);
            for (let i = 0; i < instances.length; i++) {
                instancedMesh.setMatrixAt(i, instances[i]);
            }
            instancedMesh.position.set(chunkX * CLOUD_CHUNK_SIZE + this.cloudOffset.x, 0, chunkZ * CLOUD_CHUNK_SIZE + this.cloudOffset.z);
            this.scene.add(instancedMesh);
            this.clouds.set(key, instancedMesh);
        }
    }
}