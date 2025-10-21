import { CHUNK_SIZE, WORLD_HEIGHT } from './config.js';
import { noise2D, noise3D, smoothstep, lerp, hash3D } from './worker-noise.js';

export const BlockType = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    COBBLESTONE: 3,
    SNOW: 4,
    WOOD: 5,
    LEAVES: 6,
    TNT: 7,
    BEDROCK: 9,
    PLANKS: 10,
    STONE_SLAB: 11,
    LOG_SLAB: 12,
    PLANK_SLAB: 13,
    GLASS: 14,
    STONE_SLAB_TOP: 15,
    LOG_SLAB_TOP: 16,
    PLANK_SLAB_TOP: 17,
    WOOD_X: 18,
    WOOD_Z: 19,
    CRAFTING_TABLE: 20,
    STONE: 21,
    SAND: 24,
    GRAVEL: 26,
    IRON_ORE: 32,
    STICK: 42,
    IRON_INGOT: 43,
    FURNACE: 44,
    FURNACE_LIT: 45,
    COAL_ORE: 46,
    COAL: 47,
};

export function getBiome(worldX, worldZ) {
    const biomeScale = 0.003;
    const biomeNoise = noise2D(worldX * biomeScale, worldZ * biomeScale);
    return biomeNoise;
}

export function isCave(worldX, worldY, worldZ) {
    if (worldY >= (WORLD_HEIGHT - 10) || worldY < 5) return false;

    // --- Domain Warping for more natural caves ---
    const warp1 = noise3D(worldX * 0.05, worldY * 0.1, worldZ * 0.05) * 10;
    const warp2 = noise3D((worldX + 100) * 0.05, (worldY + 100) * 0.1, (worldZ + 100) * 0.05) * 10;
    const warp3 = noise3D((worldX + 200) * 0.05, (worldY + 200) * 0.1, (worldZ + 200) * 0.05) * 10;
    
    const warpedX = worldX + warp1;
    const warpedY = worldY + warp2;
    const warpedZ = worldZ + warp3;

    // Main cave noise - large open areas
    const mainCaveNoise = noise3D(warpedX * 0.02, warpedY * 0.04, warpedZ * 0.02);
    
    // "Spaghetti" caves - long, thin tunnels. Increased frequency and smaller threshold to make them smaller.
    const spaghettiNoise1 = noise3D(warpedX * 0.04, warpedY * 0.15, warpedZ * 0.04);
    const spaghettiNoise2 = noise3D(warpedX * 0.04, warpedY * 0.15, warpedZ * 0.04 + 50);

    const detailNoise = noise3D(warpedX * 0.08, warpedY * 0.16, warpedZ * 0.08) * 0.3;

    let finalNoise = mainCaveNoise + detailNoise;

    // Make caves end gracefully towards the bottom of the world
    if (worldY < 12) {
        const cutoffFactor = smoothstep((worldY - 5) / 7.0); // from y=5 to y=12
        finalNoise = lerp(cutoffFactor, -1, finalNoise); // Lerp noise towards solid
    }

    // Small caves are more common lower down, bigger caves are more common lower down
    const depthFactor = smoothstep(1.0 - (worldY / (WORLD_HEIGHT - 6.0))); // 0 at top, 1 at bottom

    // Big cave threshold: starts high (hard to form), gets lower (easy to form) with depth
    const bigCaveThreshold = 0.45 + (1.0 - depthFactor) * 0.25; 
    
    // Small cave threshold: Decreased to make them smaller and less frequent
    const smallCaveThreshold = 0.018 + depthFactor * 0.01;

    let isBigCave = finalNoise > bigCaveThreshold;
    let isSmallCave = Math.abs(spaghettiNoise1) < smallCaveThreshold && Math.abs(spaghettiNoise2) < smallCaveThreshold;

    // Prevent small caves from carving through the middle of large caves
    if (isSmallCave && Math.abs(mainCaveNoise) > 0.3) {
        isSmallCave = false;
    }

    return isBigCave || isSmallCave;
}

export function getTerrainHeight(worldX, worldZ) {
    const biomeValue = getBiome(worldX, worldZ);

    const octave1 = noise2D(worldX * 0.006, worldZ * 0.006);
    const octave2 = noise2D(worldX * 0.015, worldZ * 0.015);
    const octave3 = noise2D(worldX * 0.03, worldZ * 0.03);
    const octave4 = noise2D(worldX * 0.08, worldZ * 0.08);

    let height = 70;

    if (biomeValue < 0.15) {
        height += octave1 * 5 + octave2 * 2 + octave3 * 0.5;
    } 
    else if (biomeValue < 0.35) {
        const t = smoothstep((biomeValue - 0.15) / 0.2);
        const plainsHeight = octave1 * 5 + octave2 * 2 + octave3 * 0.5;
        const hillsHeight = octave1 * 18 + octave2 * 12 + octave3 * 6 + octave4 * 2;
        height += plainsHeight + (hillsHeight - plainsHeight) * t;
    }
    else if (biomeValue < 0.55) {
        height += octave1 * 18 + octave2 * 12 + octave3 * 6 + octave4 * 2;
    }
    else if (biomeValue < 0.72) {
        const t = smoothstep((biomeValue - 0.55) / 0.17);
        const hillsHeight = octave1 * 18 + octave2 * 12 + octave3 * 6 + octave4 * 2;
        const mountainsHeight = octave1 * 80 + octave2 * 50 + octave3 * 25;
        const blendedHeight = hillsHeight * (1 - t) + mountainsHeight * t;
        height += blendedHeight;
    }
    else {
        const mountainIntensity = smoothstep((biomeValue - 0.72) / 0.28);
        const baseHeight = octave1 * 80 + octave2 * 50 + octave3 * 25;

        const ridgeNoise1 = 1.0 - Math.abs(noise2D(worldX * 0.006, worldZ * 0.006));
        const ridgeNoise2 = 1.0 - Math.abs(noise2D(worldX * 0.012, worldZ * 0.012));
        const ridgeNoise3 = 1.0 - Math.abs(noise2D(worldX * 0.018, worldZ * 0.018));
        
        const sharpRidge = Math.pow(ridgeNoise1, 12.0) * 150 + Math.pow(ridgeNoise2, 8.0) * 60 + Math.pow(ridgeNoise3, 5.0) * 25;
        const ruggedness = noise2D(worldX * 0.04, worldZ * 0.04) * 15;
        
        height += baseHeight + (sharpRidge + ruggedness) * mountainIntensity;
    }

    return Math.floor(Math.max(15, Math.min(height, WORLD_HEIGHT - 5)));
}

export function generateOres(blocks, chunkX, chunkZ) {
    // Iron ore generation (less common)
    const ironVeinsPerChunk = 15;
    const ironVeinMinY = 10;
    const ironVeinMaxY = 64;

    const veinSizeProbabilities = [
        { size: 1, weight: 5 },
        { size: 2, weight: 15 },
        { size: 3, weight: 25 },
        { size: 4, weight: 30 },
        { size: 5, weight: 15 },
        { size: 6, weight: 5 },
        { size: 7, weight: 5 }
    ];
    const totalWeight = veinSizeProbabilities.reduce((sum, v) => sum + v.weight, 0);

    const getRandomVeinSize = (rand) => {
        let value = rand * totalWeight;
        for (const prob of veinSizeProbabilities) {
            value -= prob.weight;
            if (value <= 0) {
                return prob.size;
            }
        }
        return 4;
    };

    // Generate iron ore
    for (let i = 0; i < ironVeinsPerChunk; i++) {
        const startX = Math.floor(hash3D(chunkX, chunkZ, i * 10) * 16);
        const startY = Math.floor(hash3D(chunkX, chunkZ, i * 20) * (ironVeinMaxY - ironVeinMinY) + ironVeinMinY);
        const startZ = Math.floor(hash3D(chunkX, chunkZ, i * 30) * 16);
        
        const veinSize = getRandomVeinSize(hash3D(chunkX, chunkZ, i * 40) * 0.5 + 0.5);

        let currentX = startX;
        let currentY = startY;
        let currentZ = startZ;

        for (let j = 0; j < veinSize; j++) {
            const clampedX = Math.max(0, Math.min(CHUNK_SIZE - 1, currentX));
            const clampedY = Math.max(0, Math.min(WORLD_HEIGHT - 1, currentY));
            const clampedZ = Math.max(0, Math.min(CHUNK_SIZE - 1, currentZ));

            const index = clampedX + clampedY * CHUNK_SIZE + clampedZ * CHUNK_SIZE * WORLD_HEIGHT;
            
            if ((blocks[index] & 0xFF) === BlockType.STONE) {
                blocks[index] = BlockType.IRON_ORE;
            }
            
            currentX += Math.floor(hash3D(currentX, currentY, currentZ + j) * 3) - 1;
            currentY += Math.floor(hash3D(currentX + j, currentY, currentZ) * 3) - 1;
            currentZ += Math.floor(hash3D(currentX, currentY + j, currentZ) * 3) - 1;
        }
    }

    // Coal ore generation (more common, higher up)
    const coalVeinsPerChunk = 30;
    const coalVeinMinY = 5;
    const coalVeinMaxY = 128;

    const coalVeinSizes = [
        { size: 3, weight: 10 },
        { size: 4, weight: 20 },
        { size: 5, weight: 25 },
        { size: 6, weight: 20 },
        { size: 7, weight: 15 },
        { size: 8, weight: 10 }
    ];
    const coalTotalWeight = coalVeinSizes.reduce((sum, v) => sum + v.weight, 0);

    const getCoalVeinSize = (rand) => {
        let value = rand * coalTotalWeight;
        for (const prob of coalVeinSizes) {
            value -= prob.weight;
            if (value <= 0) {
                return prob.size;
            }
        }
        return 5;
    };

    for (let i = 0; i < coalVeinsPerChunk; i++) {
        const startX = Math.floor(hash3D(chunkX, chunkZ, i * 100 + 1000) * 16);
        const startY = Math.floor(hash3D(chunkX, chunkZ, i * 200 + 2000) * (coalVeinMaxY - coalVeinMinY) + coalVeinMinY);
        const startZ = Math.floor(hash3D(chunkX, chunkZ, i * 300 + 3000) * 16);
        
        const veinSize = getCoalVeinSize(hash3D(chunkX, chunkZ, i * 400 + 4000) * 0.5 + 0.5);

        let currentX = startX;
        let currentY = startY;
        let currentZ = startZ;

        for (let j = 0; j < veinSize; j++) {
            const clampedX = Math.max(0, Math.min(CHUNK_SIZE - 1, currentX));
            const clampedY = Math.max(0, Math.min(WORLD_HEIGHT - 1, currentY));
            const clampedZ = Math.max(0, Math.min(CHUNK_SIZE - 1, currentZ));

            const index = clampedX + clampedY * CHUNK_SIZE + clampedZ * CHUNK_SIZE * WORLD_HEIGHT;
            
            if ((blocks[index] & 0xFF) === BlockType.STONE) {
                blocks[index] = BlockType.COAL_ORE;
            }
            
            currentX += Math.floor(hash3D(currentX + 5000, currentY, currentZ + j) * 3) - 1;
            currentY += Math.floor(hash3D(currentX + j, currentY + 5000, currentZ) * 3) - 1;
            currentZ += Math.floor(hash3D(currentX, currentY + j, currentZ + 5000) * 3) - 1;
        }
    }
}

export function getBlockTypeForPosition(worldX, worldY, worldZ, terrainHeight) {
    // Bedrock layer at bottom
    if (worldY <= 1) {
        return BlockType.BEDROCK;
    }
    
    // Don't generate caves too close to the surface (within 5 blocks)
    if (worldY > terrainHeight - 5) {
        // Normal terrain logic without caves
    } else if (worldY < terrainHeight && worldY > 5 && isCave(worldX, worldY, worldZ)) {
        return BlockType.AIR;
    }
    
    // ORE GENERATION IS NOW HANDLED IN A SEPARATE STEP
    
    // Gravel clumps underground.
    // We check if the spot is currently solid before placing gravel to prevent it from generating over caves.
    // The `BlockType.GRAVEL | 0x400` sets a metadata flag to mark it as "static" until updated by a player.
    if (worldY < terrainHeight - 8 && worldY > 10) {
        const gravelNoise1 = noise3D(worldX * 0.04, worldY * 0.04, worldZ * 0.04);
        const gravelNoise2 = noise3D(worldX * 0.07 + 500, worldY * 0.07 + 500, worldZ * 0.07 + 500);
        const gravelValue = (gravelNoise1 + gravelNoise2) / 2;
        
        if (gravelValue > 0.65) {
             return BlockType.GRAVEL | 0x400; // Return gravel with a "static" flag
        }
    }
    
    const transitionNoise = noise2D(worldX * 0.08, worldZ * 0.08) * 6;
    const biomeValue = getBiome(worldX, worldZ);

    const dirtDepth = 3 + Math.floor(noise2D(worldX * 0.1, worldZ * 0.1) * 2);
    const snowLine = 140 + transitionNoise;
    const stoneLine = 95 + noise2D(worldX * 0.05, worldZ * 0.05) * 10;

    if (worldY >= terrainHeight && worldY > snowLine) {
        return 4;
    }
    
    if (worldY === terrainHeight) {
        if (worldY > snowLine - 8) {
            const snowTransition = smoothstep((worldY - (snowLine - 8)) / 8);
            return Math.random() < snowTransition ? 4 : (terrainHeight > stoneLine ? BlockType.STONE : 1);
        }
        if (terrainHeight > stoneLine) {
            const stoneTransition = smoothstep((terrainHeight - stoneLine) / 10);
            return Math.random() < stoneTransition ? BlockType.STONE : 1;
        }
        return 1;
    }
    
    if (worldY > terrainHeight - dirtDepth && terrainHeight <= stoneLine) {
        return 2;
    } else if (worldY > terrainHeight - 3 && terrainHeight > stoneLine) {
        const mixNoise = noise2D(worldX * 0.15, worldZ * 0.15);
        return mixNoise > 0.2 ? BlockType.STONE : 2;
    } else if (worldY > terrainHeight - 8) {
        return noise2D(worldX * 0.2, worldZ * 0.2) > 0.3 ? BlockType.STONE : 2;
    } else {
        return BlockType.STONE;
    }
}