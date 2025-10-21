import { CHUNK_SIZE, WORLD_HEIGHT } from './config.js';
import { noise2D } from './worker-noise.js';
import { getBiome, BlockType } from './worker-terrain.js';

export function shouldPlaceTree(worldX, worldZ, terrainHeight) {
    const biomeValue = getBiome(worldX, worldZ);
    if (biomeValue > 0.6) return false;
    if (terrainHeight > 130) return false;

    const treeNoise = noise2D(worldX * 0.08, worldZ * 0.08);
    return treeNoise > 0.85;
}

export function placeTree(blocks, centerX, baseY, centerZ) {
    const trunkHeight = 4 + Math.floor(Math.random() * 3);
    const leafVariation = Math.floor(Math.random() * 3);

    for (let y = 0; y < trunkHeight; y++) {
        const idx = centerX + (baseY + y) * CHUNK_SIZE + centerZ * CHUNK_SIZE * WORLD_HEIGHT;
        if (idx >= 0 && idx < blocks.length) {
            blocks[idx] = BlockType.WOOD;
        }
    }

    const leafY = baseY + trunkHeight - 1;
    for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dz = -2; dz <= 2; dz++) {
                const dist = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                if (dist > 3 || (dx === 0 && dy <= 0 && dz === 0)) continue;

                if (leafVariation === 0 && Math.random() < 0.2) continue;
                if (leafVariation === 1 && dist === 3 && Math.random() < 0.5) continue;
                if (leafVariation === 2 && dist > 2.5 && Math.random() < 0.3) continue;

                const x = centerX + dx;
                const y = leafY + dy;
                const z = centerZ + dz;

                if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < WORLD_HEIGHT && z >= 0 && z < CHUNK_SIZE) {
                    const idx = x + y * CHUNK_SIZE + z * CHUNK_SIZE * WORLD_HEIGHT;
                    if (blocks[idx] === BlockType.AIR) {
                        blocks[idx] = BlockType.LEAVES;
                    }
                }
            }
        }
    }
}