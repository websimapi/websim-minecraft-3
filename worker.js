import { CHUNK_SIZE, WORLD_HEIGHT } from './config.js';
import { setSeed } from './worker-noise.js';
import { BlockType, getTerrainHeight, getBlockTypeForPosition, generateOres } from './worker-terrain.js';
import { shouldPlaceTree, placeTree } from './worker-trees.js';
import { buildChunkGeometry } from './worker-geometry.js';

function createChunkGeometry(chunkX, chunkZ, existingBlocks) {
    let blocks;

    if (existingBlocks) {
        blocks = existingBlocks;
    } else {
        blocks = new Uint16Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
        
        // Terrain generation
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldZ = chunkZ * CHUNK_SIZE + z;
                const height = getTerrainHeight(worldX, worldZ);
                const clampedHeight = Math.max(10, Math.min(height, WORLD_HEIGHT - 1));

                for (let y = 0; y <= clampedHeight; y++) {
                    const idx = x + y * CHUNK_SIZE + z * CHUNK_SIZE * WORLD_HEIGHT;
                    const blockData = getBlockTypeForPosition(worldX, y, worldZ, clampedHeight);
                    if (blockData !== undefined) {
                        blocks[idx] = blockData;
                    } else {
                        blocks[idx] = BlockType.AIR;
                    }
                }
            }
        }
        
        // Post-processing pass to ensure static gravity blocks don't float
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                for (let y = 1; y < WORLD_HEIGHT; y++) {
                     const idx = x + y * CHUNK_SIZE + z * CHUNK_SIZE * WORLD_HEIGHT;
                     const blockType = blocks[idx] & 0xFF;

                     if (blockType === BlockType.GRAVEL || blockType === BlockType.SAND) {
                         const blockBelowIdx = x + (y - 1) * CHUNK_SIZE + z * CHUNK_SIZE * WORLD_HEIGHT;
                         const blockBelowType = blocks[blockBelowIdx] & 0xFF;
                         if (blockBelowType === BlockType.AIR) {
                             blocks[idx] = BlockType.STONE; // Replace floating gravel/sand with stone
                         }
                     }
                }
            }
        }

        // Ore Generation - happens after basic terrain is placed
        generateOres(blocks, chunkX, chunkZ);

        // Tree generation
        const treePlaced = new Set();
        for (let x = 2; x < CHUNK_SIZE - 2; x++) {
            for (let z = 2; z < CHUNK_SIZE - 2; z++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldZ = chunkZ * CHUNK_SIZE + z;
                const height = getTerrainHeight(worldX, worldZ);
                const clampedHeight = Math.max(10, Math.min(height, WORLD_HEIGHT - 1));
                
                if (shouldPlaceTree(worldX, worldZ, clampedHeight)) {
                    let tooClose = false;
                    for (let dx = -6; dx <= 6; dx++) {
                        for (let dz = -6; dz <= 6; dz++) {
                            if (treePlaced.has(`${x+dx},${z+dz}`)) {
                                tooClose = true;
                                break;
                            }
                        }
                        if (tooClose) break;
                    }
                    
                    if (!tooClose) {
                        placeTree(blocks, x, clampedHeight, z);
                        treePlaced.add(`${x},${z}`);
                    }
                }
            }
        }
    }

    const geometries = buildChunkGeometry(blocks, chunkX, chunkZ);
    return { geometries, blocks: existingBlocks ? null : blocks };
}

self.onmessage = (e) => {
    const { type, payload } = e.data;
    if (type === 'set_seed') {
        setSeed(payload);
        return;
    }

    const { chunkX, chunkZ, blocks } = payload;
    const { geometries, blocks: newBlocks } = createChunkGeometry(chunkX, chunkZ, blocks);

    const transferables = [];
    for (const geom of Object.values(geometries)) {
        if (geom.positions) {
            transferables.push(geom.positions.buffer, geom.normals.buffer, geom.uvs.buffer, geom.ao.buffer, geom.indices.buffer);
        } else {
             for(const faceGeom of Object.values(geom)) {
                if (faceGeom.positions) {
                    transferables.push(faceGeom.positions.buffer, faceGeom.normals.buffer, faceGeom.uvs.buffer, faceGeom.ao.buffer, faceGeom.indices.buffer);
                }
             }
        }
    }
    if (newBlocks) {
        transferables.push(newBlocks.buffer);
    }

    self.postMessage({
        type: 'geometry',
        chunkX,
        chunkZ,
        data: geometries,
        blocks: newBlocks
    }, transferables);
};