import { WORLD_HEIGHT } from './config.js';

// Simple hash function for biome determination
function hash(x, z, seed) {
    let h = (x * 374761393 + z * 668265263 + seed) & 0x7fffffff;
    h = (h ^ (h >> 13)) * 1274126177;
    return (h ^ (h >> 16)) / 0x7fffffff;
}

// Improved noise function with better continuity
function noise2D(x, z, seed) {
    const X = Math.floor(x);
    const Z = Math.floor(z);

    const xf = x - X;
    const zf = z - Z;

    const u = fade(xf);
    const v = fade(zf);

    const a = hash(X & 255, Z & 255, seed);
    const b = hash((X + 1) & 255, Z & 255, seed);
    const c = hash(X & 255, (Z + 1) & 255, seed);
    const d = hash((X + 1) & 255, (Z + 1) & 255, seed);

    return lerp(v, lerp(u, a, b), lerp(u, c, d));
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t, a, b) {
    return a + t * (b - a);
}

function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

export function getBiomeName(biomeValue) {
    if (biomeValue < 0.15) return "Plains";
    if (biomeValue < 0.35) return "Plains/Hills Transition";
    if (biomeValue < 0.55) return "Hills";
    if (biomeValue < 0.72) return "Hills/Mountains Transition";
    return "Mountains";
}

export function getBiome(worldX, worldZ, seed) {
    const biomeScale = 0.003;
    const biomeNoise = noise2D(worldX * biomeScale, worldZ * biomeScale, seed);
    return biomeNoise;
}

export function getTerrainHeight(worldX, worldZ, seed) {
    const biomeValue = getBiome(worldX, worldZ, seed);

    const octave1 = noise2D(worldX * 0.006, worldZ * 0.006, seed);
    const octave2 = noise2D(worldX * 0.015, worldZ * 0.015, seed);
    const octave3 = noise2D(worldX * 0.03, worldZ * 0.03, seed);
    const octave4 = noise2D(worldX * 0.08, worldZ * 0.08, seed);

    let height = 70;

    if (biomeValue < 0.15) { // Plains
        height += octave1 * 5 + octave2 * 2 + octave3 * 0.5;
    } 
    else if (biomeValue < 0.35) { // Transition to Hills (wider and smoother)
        const t = smoothstep((biomeValue - 0.15) / 0.2);
        const plainsHeight = octave1 * 5 + octave2 * 2 + octave3 * 0.5;
        const hillsHeight = octave1 * 18 + octave2 * 12 + octave3 * 6 + octave4 * 2;
        height += plainsHeight + (hillsHeight - plainsHeight) * t;
    }
    else if (biomeValue < 0.55) { // Hills
        height += octave1 * 18 + octave2 * 12 + octave3 * 6 + octave4 * 2;
    }
    else if (biomeValue < 0.72) { // Transition to Mountains (smoother with better blending)
        const t = smoothstep((biomeValue - 0.55) / 0.17);
        const hillsHeight = octave1 * 18 + octave2 * 12 + octave3 * 6 + octave4 * 2; // Now includes octave4!
        const mountainsHeight = octave1 * 80 + octave2 * 50 + octave3 * 25;
        const blendedHeight = hillsHeight * (1 - t) + mountainsHeight * t;
        height += blendedHeight;
    }
    else { // Mountains - EXTREMELY sharp peaks
        const mountainIntensity = smoothstep((biomeValue - 0.72) / 0.28);
        
        const baseHeight = octave1 * 80 + octave2 * 50 + octave3 * 25;

        const ridgeNoise1 = 1.0 - Math.abs(noise2D(worldX * 0.006, worldZ * 0.006, seed));
        const ridgeNoise2 = 1.0 - Math.abs(noise2D(worldX * 0.012, worldZ * 0.012, seed));
        const ridgeNoise3 = 1.0 - Math.abs(noise2D(worldX * 0.018, worldZ * 0.018, seed));
        
        const sharpRidge = Math.pow(ridgeNoise1, 12.0) * 150 + Math.pow(ridgeNoise2, 8.0) * 60 + Math.pow(ridgeNoise3, 5.0) * 25;

        const ruggedness = noise2D(worldX * 0.04, worldZ * 0.04, seed) * 15;
        
        height += baseHeight + (sharpRidge + ruggedness) * mountainIntensity;
    }

    return Math.floor(Math.max(15, Math.min(height, WORLD_HEIGHT - 5)));
}

export function getBlockTypeForPosition(worldX, worldY, worldZ, terrainHeight, seed) {
    const transitionNoise = noise2D(worldX * 0.08, worldZ * 0.08, seed) * 6;
    const biomeValue = getBiome(worldX, worldZ, seed);

    const dirtDepth = 3 + Math.floor(noise2D(worldX * 0.1, worldZ * 0.1, seed) * 2);
    const snowLine = 140 + transitionNoise;
    const stoneLine = 95 + noise2D(worldX * 0.05, worldZ * 0.05, seed) * 10; // Lowered from 110 to 95

    // Snow layer
    if (worldY >= terrainHeight && worldY > snowLine) {
        return 4; // SNOW
    }
    
    // Top surface
    if (worldY === terrainHeight) {
        // Snow transition
        if (worldY > snowLine - 8) {
            const snowTransition = smoothstep((worldY - (snowLine - 8)) / 8);
            return Math.random() < snowTransition ? 4 : (terrainHeight > stoneLine ? 21 : 1);
        }
        // Stone on high/steep terrain - more aggressive
        if (terrainHeight > stoneLine) {
            const stoneTransition = smoothstep((terrainHeight - stoneLine) / 10); // Reduced from 15 to 10
            return Math.random() < stoneTransition ? 21 : 1; // 21 is STONE
        }
        return 1; // GRASS
    }
    
    // Below surface - more stone
    if (worldY > terrainHeight - dirtDepth && terrainHeight <= stoneLine) {
        return 2; // DIRT in lower areas
    } else if (worldY > terrainHeight - 3 && terrainHeight > stoneLine) {
        // More stone near surface on mountains
        const mixNoise = noise2D(worldX * 0.15, worldZ * 0.15, seed);
        return mixNoise > 0.2 ? 21 : 2; // Increased from 0.3 to 0.2 for more stone
    } else if (worldY > terrainHeight - 8) {
        // Stone/dirt mix - more stone
        return noise2D(worldX * 0.2, worldZ * 0.2, seed) > 0.3 ? 21 : 2; // Reduced from 0.4 to 0.3
    } else {
        return 21; // STONE
    }
}