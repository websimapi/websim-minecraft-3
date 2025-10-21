import * as THREE from 'three';
import { BlockType } from './blocks.js';

export class BlockPlacer {
    constructor(world, getCameraDirection) {
        this.world = world;
        this.playerAABB = null;
        this.getCameraDirection = getCameraDirection;
    }

    setPlayerAABB(aabb) {
        this.playerAABB = aabb;
    }

    getPlacement(raycastResult, hitPoint, blockTypeInHand) {
        if (!raycastResult || !raycastResult.placePos) return null;

        const isTool = blockTypeInHand >= 33 && blockTypeInHand <= 43;
        if (blockTypeInHand === null || blockTypeInHand === 8 || isTool) {
            return null;
        }
        
        const isPlacingSlab = blockTypeInHand >= BlockType.STONE_SLAB && blockTypeInHand <= BlockType.PLANK_SLAB;
        if (isPlacingSlab) {
            return this.getSlabPlacement(raycastResult, hitPoint, blockTypeInHand);
        }

        // --- Normal Block Placement ---
        const pos = raycastResult.placePos;
        const existingBlock = this.world.getBlockAt(pos.x, pos.y, pos.z);
        if (existingBlock !== BlockType.AIR) return null;

        let blockTypeToPlace = blockTypeInHand;
        const normal = this.getPlacementNormal(raycastResult, hitPoint);
        
        // Handle directional blocks
        if (blockTypeInHand === BlockType.WOOD) {
            if (Math.abs(normal.x) > 0.5) blockTypeToPlace = BlockType.WOOD_X;
            else if (Math.abs(normal.z) > 0.5) blockTypeToPlace = BlockType.WOOD_Z;
            else blockTypeToPlace = BlockType.WOOD;
        } else if (blockTypeInHand === BlockType.FURNACE) {
            // Furnace faces the player
            const cameraDir = this.getCameraDirection();
            blockTypeToPlace = BlockType.FURNACE; // Will handle rotation in world
        }

        const blockBox = new THREE.Box3(
            new THREE.Vector3(pos.x, pos.y, pos.z),
            new THREE.Vector3(pos.x + 1, pos.y + 1, pos.z + 1)
        );

        if (this.playerAABB && blockBox.max.y > this.playerAABB.min.y + 0.1 && this.playerAABB.intersectsBox(blockBox)) {
            return null;
        }

        if (blockTypeToPlace === BlockType.SAND || blockTypeToPlace === BlockType.GRAVEL) {
            const blockBelow = this.world.getBlockAt(pos.x, pos.y - 1, pos.z);
            if (blockBelow === 0) {
                return {
                    shouldFall: true,
                    blockType: blockTypeToPlace,
                    pos: new THREE.Vector3(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5)
                };
            }
        }

        return {
            shouldFall: false,
            blockType: blockTypeToPlace,
            pos: pos,
            cameraDirection: this.getCameraDirection()
        };
    }

    getPlacementNormal(raycastResult, hitPoint) {
        const x = raycastResult.x;
        const y = raycastResult.y;
        const z = raycastResult.z;
        
        if (!hitPoint) return new THREE.Vector3(0, 1, 0);
        
        const localX = hitPoint.x - x;
        const localY = hitPoint.y - y;
        const localZ = hitPoint.z - z;
        
        const distToMinX = Math.abs(localX);
        const distToMaxX = Math.abs(localX - 1);
        const distToMinY = Math.abs(localY - 1); // For slabs, it is inverted
        const distToMaxY = Math.abs(localY);
        const distToMinZ = Math.abs(localZ);
        const distToMaxZ = Math.abs(localZ - 1);
        
        const minDist = Math.min(distToMinX, distToMaxX, distToMinY, distToMaxY, distToMinZ, distToMaxZ);
        
        const epsilon = 0.001;
        if (Math.abs(minDist - distToMinX) < epsilon) return new THREE.Vector3(-1, 0, 0);
        if (Math.abs(minDist - distToMaxX) < epsilon) return new THREE.Vector3(1, 0, 0);
        if (Math.abs(minDist - distToMinY) < epsilon) return new THREE.Vector3(0, -1, 0);
        if (Math.abs(minDist - distToMaxY) < epsilon) return new THREE.Vector3(0, 1, 0);
        if (Math.abs(minDist - distToMinZ) < epsilon) return new THREE.Vector3(0, 0, -1);
        if (Math.abs(minDist - distToMaxZ) < epsilon) return new THREE.Vector3(0, 0, 1);
        
        return new THREE.Vector3(0, 1, 0);
    }

    getSlabPlacement(raycastResult, hitPoint, selectedSlabType) {
        const targetX = raycastResult.x;
        const targetY = raycastResult.y;
        const targetZ = raycastResult.z;
        const targetBlock = this.world.getBlockAt(targetX, targetY, targetZ);

        const isTargetBottomSlab = targetBlock >= BlockType.STONE_SLAB && targetBlock <= BlockType.PLANK_SLAB;
        const isTargetTopSlab = targetBlock >= BlockType.STONE_SLAB_TOP && targetBlock <= BlockType.PLANK_SLAB_TOP;

        if ((isTargetBottomSlab || isTargetTopSlab) && this.getBaseSlabType(targetBlock) === this.getBaseSlabType(selectedSlabType)) {
            const hitLocalY = hitPoint.y - targetY;
            if ((isTargetBottomSlab && hitLocalY > 0.49) || (isTargetTopSlab && hitLocalY < 0.51)) {
                 return { combineSlab: true, pos: { x: targetX, y: targetY, z: targetZ }, slabType: selectedSlabType };
            }
        }
        
        const placePos = raycastResult.placePos;
        const existingBlock = this.world.getBlockAt(placePos.x, placePos.y, placePos.z);
        
        if (existingBlock >= BlockType.STONE_SLAB_TOP && existingBlock <= BlockType.PLANK_SLAB_TOP) {
            if (this.getBaseSlabType(existingBlock) === this.getBaseSlabType(selectedSlabType)) {
                return { combineSlab: true, pos: placePos, slabType: selectedSlabType };
            }
        }
        
        if (existingBlock !== BlockType.AIR) return null;

        const hitFaceLocalY = hitPoint.y - Math.floor(hitPoint.y);
        const placeOnTopHalf = hitFaceLocalY > 0.5;

        const slabTypeToPlace = placeOnTopHalf 
            ? this.getBaseSlabType(selectedSlabType) + 4 
            : this.getBaseSlabType(selectedSlabType);

        const blockMinY = placeOnTopHalf ? 0.5 : 0;
        const blockMaxY = placeOnTopHalf ? 1.0 : 0.5;
        
        const blockBox = new THREE.Box3(
            new THREE.Vector3(placePos.x, placePos.y + blockMinY, placePos.z),
            new THREE.Vector3(placePos.x + 1, placePos.y + blockMaxY, placePos.z + 1)
        );

        if (this.playerAABB && this.playerAABB.intersectsBox(blockBox)) return null;

        return {
            shouldFall: false,
            blockType: slabTypeToPlace,
            pos: placePos,
            cameraDirection: this.getCameraDirection()
        };
    }
    
    combineSlabs(pos, placedSlabType) {
        let fullBlockType;
        const baseType = this.getBaseSlabType(placedSlabType);
        if (baseType === BlockType.STONE_SLAB) fullBlockType = BlockType.COBBLESTONE;
        else if (baseType === BlockType.LOG_SLAB) fullBlockType = BlockType.WOOD;
        else if (baseType === BlockType.PLANK_SLAB) fullBlockType = BlockType.PLANKS;
        else return;

        this.world.setBlockAt(pos.x, pos.y, pos.z, fullBlockType);
    }

    getBaseSlabType(slabType) {
        if (slabType >= BlockType.STONE_SLAB_TOP && slabType <= BlockType.PLANK_SLAB_TOP) {
            return slabType - 4;
        }
        if (slabType >= BlockType.STONE_SLAB && slabType <= BlockType.PLANK_SLAB) {
            return slabType;
        }
        return null;
    }
}