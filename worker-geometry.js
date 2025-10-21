import { CHUNK_SIZE, WORLD_HEIGHT } from './config.js';
import { BlockType } from './worker-terrain.js';

export const FACE_DATA = [
    { dir: [0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], uvs: [[0,1],[1,1],[1,0],[0,0]], normal: [0,0,1], name: 'south' },
    { dir: [0, 0, -1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], uvs: [[0,1],[1,1],[1,0],[0,0]], normal: [0,0,-1], name: 'north' },
    { dir: [1, 0, 0], corners: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]], uvs: [[0,1],[1,1],[1,0],[0,0]], normal: [1,0,0], name: 'east' },
    { dir: [-1, 0, 0], corners: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]], uvs: [[0,1],[1,1],[1,0],[0,0]], normal: [-1,0,0], name: 'west' },
    { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], uvs: [[0,0],[1,0],[1,1],[0,1]], normal: [0,1,0], name: 'top' },
    { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uvs: [[0,1],[1,1],[1,0],[0,0]], normal: [0,-1,0], name: 'bottom' }
];

let blocks, chunkX_local, chunkZ_local;

export function setBlockData(blockData, chunkX, chunkZ) {
    blocks = blockData;
    chunkX_local = chunkX;
    chunkZ_local = chunkZ;
}

function getBlock(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
        return BlockType.AIR;
    }
    return blocks[x + y * CHUNK_SIZE + z * CHUNK_SIZE * WORLD_HEIGHT] & 0xFF; // Read only the block type
}

function vertexAO(side1, side2, corner) {
    if (side1 && side2) return 0.25;
    return 1.0 - ((side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0)) * 0.25;
}

export function calculateAO(x, y, z, faceName) {
    const aoValues = [1, 1, 1, 1];

    let offsets;
    if (faceName === 'top') {
        offsets = [
            [[-1, 1, 1], [-1, 1, 0], [0, 1, 1]],   // bottom-left
            [[1, 1, 1], [1, 1, 0], [0, 1, 1]],     // bottom-right
            [[1, 1, -1], [1, 1, 0], [0, 1, -1]],   // top-right
            [[-1, 1, -1], [-1, 1, 0], [0, 1, -1]]  // top-left
        ];
    } else if (faceName === 'bottom') {
        offsets = [
            [[-1, -1, -1], [-1, -1, 0], [0, -1, -1]],  // top-left
            [[1, -1, -1], [1, -1, 0], [0, -1, -1]],    // top-right
            [[1, -1, 1], [1, -1, 0], [0, -1, 1]],      // bottom-right
            [[-1, -1, 1], [-1, -1, 0], [0, -1, 1]]     // bottom-left
        ];
    } else if (faceName === 'north') {
        offsets = [
            [[1, -1, -1], [1, 0, -1], [0, -1, -1]],    // bottom-right
            [[-1, -1, -1], [-1, 0, -1], [0, -1, -1]],  // bottom-left
            [[-1, 1, -1], [-1, 0, -1], [0, 1, -1]],    // top-left
            [[1, 1, -1], [1, 0, -1], [0, 1, -1]]       // top-right
        ];
    } else if (faceName === 'south') {
        offsets = [
            [[-1, -1, 1], [-1, 0, 1], [0, -1, 1]],   // bottom-left
            [[1, -1, 1], [1, 0, 1], [0, -1, 1]],     // bottom-right
            [[1, 1, 1], [1, 0, 1], [0, 1, 1]],       // top-right
            [[-1, 1, 1], [-1, 0, 1], [0, 1, 1]]      // top-left
        ];
    } else if (faceName === 'east') {
        offsets = [
            [[1, -1, 1], [1, 0, 1], [1, -1, 0]],     // bottom-front
            [[1, -1, -1], [1, 0, -1], [1, -1, 0]],   // bottom-back
            [[1, 1, -1], [1, 0, -1], [1, 1, 0]],     // top-back
            [[1, 1, 1], [1, 0, 1], [1, 1, 0]]        // top-front
        ];
    } else if (faceName === 'west') {
        offsets = [
            [[-1, -1, -1], [-1, 0, -1], [-1, -1, 0]], // bottom-back
            [[-1, -1, 1], [-1, 0, 1], [-1, -1, 0]],   // bottom-front
            [[-1, 1, 1], [-1, 0, 1], [-1, 1, 0]],     // top-front
            [[-1, 1, -1], [-1, 0, -1], [-1, 1, 0]]    // top-back
        ];
    } else {
        return aoValues;
    }

    for (let i = 0; i < 4; i++) {
        const [corner, side1, side2] = offsets[i];
        const cornerBlock = getBlock(x + corner[0], y + corner[1], z + corner[2]) !== BlockType.AIR;
        const side1Block = getBlock(x + side1[0], y + side1[1], z + side1[2]) !== BlockType.AIR;
        const side2Block = getBlock(x + side2[0], y + side2[1], z + side2[2]) !== BlockType.AIR;

        aoValues[i] = vertexAO(side1Block, side2Block, cornerBlock);
    }

    return aoValues;
}

export function createGeom() {
    return { positions: [], normals: [], uvs: [], ao: [], indices: [], vertexCount: 0 };
}

export function getGeometryForBlock(geometries, blockType, faceName, rotation = 0) {
    if (blockType === BlockType.GRASS) {
        if (faceName === 'top') return geometries[BlockType.GRASS].top;
        if (faceName === 'bottom') return geometries[BlockType.GRASS].bottom;
        return geometries[BlockType.GRASS].side;
    }
    if (blockType === BlockType.WOOD) {
        if (faceName === 'top' || faceName === 'bottom') return geometries[BlockType.WOOD].top;
        return geometries[BlockType.WOOD].side;
    }
    if (blockType === BlockType.WOOD_X) {
        if (faceName === 'east' || faceName === 'west') return geometries[BlockType.WOOD].top;
        return geometries[BlockType.WOOD].side;
    }
    if (blockType === BlockType.WOOD_Z) {
        if (faceName === 'north' || faceName === 'south') return geometries[BlockType.WOOD].top;
        return geometries[BlockType.WOOD].side;
    }
    if (blockType === BlockType.TNT) {
        if (faceName === 'top' || faceName === 'bottom') return geometries[BlockType.TNT].top;
        return geometries[BlockType.TNT].side;
    }
    if (blockType === BlockType.CRAFTING_TABLE) {
        if (faceName === 'top') return geometries[BlockType.CRAFTING_TABLE].top;
        if (faceName === 'bottom') return geometries[BlockType.CRAFTING_TABLE].bottom;
        return geometries[BlockType.CRAFTING_TABLE].side;
    }
    if (blockType === BlockType.FURNACE || blockType === BlockType.FURNACE_LIT) {
        // Determine which face is "front" based on rotation
        // rotation 0 = south, 1 = west, 2 = north, 3 = east
        const faceFront = ['south', 'west', 'north', 'east'][rotation];
        if (faceName === faceFront) return geometries[blockType].front;
        if (faceName === 'top' || faceName === 'bottom') return geometries[blockType].top;
        return geometries[blockType].side;
    }
    // Slabs use single geometry
    if (blockType === BlockType.STONE_SLAB || blockType === BlockType.LOG_SLAB || blockType === BlockType.PLANK_SLAB || 
        blockType === BlockType.STONE_SLAB_TOP || blockType === BlockType.LOG_SLAB_TOP || blockType === BlockType.PLANK_SLAB_TOP) {
        return geometries[blockType];
    }
    return geometries[blockType];
}

export function addFaceToGeometry(geom, face, x, y, z, blockType, aoValues, isSlab = false, isTopSlab = false, rotation = 0) {
    const startVertex = geom.vertexCount;
    const slabHeight = isSlab || isTopSlab ? 0.5 : 1.0;

    for (let i = 0; i < 4; i++) {
        let [cx, cy, cz] = face.corners[i];

        // Adjust Y coordinate for slabs
        if (isSlab || isTopSlab) {
            cy = cy * slabHeight;
        }

        geom.positions.push(x + cx, y + cy, z + cz);
        geom.normals.push(...face.normal);

        // Adjust UV mapping for slabs on side faces
        let uvX = face.uvs[i][0];
        let uvY = face.uvs[i][1];

        // Apply rotation for sideways logs on their end faces
        if (blockType === BlockType.WOOD_X && (face.name === 'east' || face.name === 'west')) {
            // WOOD_X: log oriented east-west, rings on east/west faces
            // Rotate based on placement angle
            if (rotation === 0) {
                // North/South facing placement
                const tempX = uvX;
                uvX = 1.0 - uvY;
                uvY = tempX;
            } else {
                // East/West facing placement
                const tempX = uvX;
                uvX = uvY;
                uvY = 1.0 - tempX;
            }
        } else if (blockType === BlockType.WOOD_Z && (face.name === 'north' || face.name === 'south')) {
            // WOOD_Z: log oriented north-south, rings on north/south faces
            // Rotate based on placement angle
            if (rotation === 0) {
                // North/South facing placement
                const tempX = uvX;
                uvX = uvY;
                uvY = 1.0 - tempX;
            } else {
                // East/West facing placement
                const tempX = uvX;
                uvX = 1.0 - uvY;
                uvY = tempX;
            }
        }

        if ((isSlab || isTopSlab) && face.name !== 'top' && face.name !== 'bottom') {
            // For side faces, only use bottom half of texture
            if (isSlab) {
                 uvY = uvY * 0.5 + 0.5; // Map to bottom half (0.5 to 1.0)
            } else { // isTopSlab
                 uvY = uvY * 0.5; // Map to top half (0.0 to 0.5)
            }
        }

        geom.uvs.push(uvX, uvY);
        geom.ao.push(aoValues[i]);
    }
    geom.indices.push(startVertex, startVertex + 1, startVertex + 2, startVertex, startVertex + 2, startVertex + 3);
    geom.vertexCount += 4;
}

export function makeGeomTransferable(geom) {
    return {
        positions: new Float32Array(geom.positions),
        normals: new Float32Array(geom.normals),
        uvs: new Float32Array(geom.uvs),
        ao: new Float32Array(geom.ao),
        indices: new Uint32Array(geom.indices)
    };
}

export function buildChunkGeometry(blockData, chunkX, chunkZ) {
    setBlockData(blockData, chunkX, chunkZ);

    const geometries = {
        [BlockType.GRASS]: { top: createGeom(), side: createGeom(), bottom: createGeom() },
        [BlockType.DIRT]: createGeom(),
        [BlockType.COBBLESTONE]: createGeom(),
        [BlockType.SNOW]: createGeom(),
        [BlockType.WOOD]: { top: createGeom(), side: createGeom() },
        [BlockType.LEAVES]: createGeom(),
        [BlockType.TNT]: { top: createGeom(), side: createGeom(), bottom: createGeom() },
        [BlockType.BEDROCK]: createGeom(),
        [BlockType.PLANKS]: createGeom(),
        [BlockType.STONE_SLAB]: createGeom(),
        [BlockType.LOG_SLAB]: createGeom(),
        [BlockType.PLANK_SLAB]: createGeom(),
        [BlockType.STONE_SLAB_TOP]: createGeom(),
        [BlockType.LOG_SLAB_TOP]: createGeom(),
        [BlockType.PLANK_SLAB_TOP]: createGeom(),
        [BlockType.GLASS]: createGeom(),
        [BlockType.WOOD_X]: { top: createGeom(), side: createGeom(), bottom: createGeom() },
        [BlockType.WOOD_Z]: { top: createGeom(), side: createGeom(), bottom: createGeom() },
        [BlockType.CRAFTING_TABLE]: { top: createGeom(), side: createGeom(), bottom: createGeom() },
        [BlockType.STONE]: createGeom(),
        [BlockType.GRAVEL]: createGeom(),
        [BlockType.SAND]: createGeom(),
        [BlockType.IRON_ORE]: createGeom(),
        [BlockType.COAL_ORE]: createGeom(),
        [BlockType.FURNACE]: { front: createGeom(), side: createGeom(), top: createGeom(), bottom: createGeom() },
        [BlockType.FURNACE_LIT]: { front: createGeom(), side: createGeom(), top: createGeom(), bottom: createGeom() }
    };

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * WORLD_HEIGHT;
                const blockData = blocks[index];
                const blockType = blockData & 0xFF;
                const rotation = (blockData >> 8) & 0x03;

                if (blockType === BlockType.AIR) continue;

                const isBottomSlab = blockType === BlockType.STONE_SLAB || 
                                     blockType === BlockType.LOG_SLAB || 
                                     blockType === BlockType.PLANK_SLAB;

                const isTopSlab = blockType === BlockType.STONE_SLAB_TOP || 
                                 blockType === BlockType.LOG_SLAB_TOP || 
                                 blockType === BlockType.PLANK_SLAB_TOP;

                const isSlab = isBottomSlab || isTopSlab;

                for (const face of FACE_DATA) {
                    const [nx, ny, nz] = face.dir;
                    const neighbor = getBlock(x + nx, y + ny, z + nz);

                    let shouldRender = false;

                    if (blockType === BlockType.GLASS) {
                        shouldRender = neighbor !== BlockType.GLASS;
                    } else if (isSlab) {
                        shouldRender = true;
                    } else {
                        shouldRender = neighbor === BlockType.AIR || 
                                      neighbor === BlockType.GLASS || 
                                      neighbor === BlockType.STONE_SLAB || 
                                      neighbor === BlockType.LOG_SLAB || 
                                      neighbor === BlockType.PLANK_SLAB || 
                                      neighbor === BlockType.STONE_SLAB_TOP || 
                                      neighbor === BlockType.LOG_SLAB_TOP || 
                                      neighbor === BlockType.PLANK_SLAB_TOP;
                    }

                    if (shouldRender) {
                        const geom = getGeometryForBlock(geometries, blockType, face.name, rotation);
                        const aoValues = calculateAO(x, y, z, face.name);
                        addFaceToGeometry(geom, face, x, y + (isTopSlab ? 0.5 : 0), z, blockType, aoValues, isBottomSlab, isTopSlab, rotation);
                    }
                }
            }
        }
    }

    const transferableGeometries = {};
    for (const [key, geom] of Object.entries(geometries)) {
        const bt = Number(key);
        if (bt === BlockType.GRASS || bt === BlockType.TNT || bt === BlockType.WOOD_X || bt === BlockType.WOOD_Z || 
            bt === BlockType.CRAFTING_TABLE || bt === BlockType.FURNACE || bt === BlockType.FURNACE_LIT) {
            const result = {};
            for (const [faceKey, faceGeom] of Object.entries(geom)) {
                result[faceKey] = makeGeomTransferable(faceGeom);
            }
            transferableGeometries[bt] = result;
        } else if (bt === BlockType.WOOD) {
            transferableGeometries[bt] = {
                top: makeGeomTransferable(geom.top),
                side: makeGeomTransferable(geom.side)
            };
        } else {
            transferableGeometries[bt] = makeGeomTransferable(geom);
        }
    }

    return transferableGeometries;
}