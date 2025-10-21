import * as THREE from 'three';
import { BlockType } from './blocks.js';

export class Physics {
    constructor(world) {
        this.world = world;
        this.gravity = -25;
        this.terminalVelocity = -50;
    }

    isBlockSolid(x, y, z) {
        const block = this.world.getBlockAt(Math.floor(x), Math.floor(y), Math.floor(z));
        return block !== BlockType.AIR;
    }

    getBlockHeight(x, y, z) {
        const block = this.world.getBlockAt(Math.floor(x), Math.floor(y), Math.floor(z));
        // Bottom slabs are half height
        if (block === BlockType.STONE_SLAB || block === BlockType.LOG_SLAB || block === BlockType.PLANK_SLAB) {
            return 0.5;
        }
        // Top slabs are also half height but positioned higher
        if (block === 15 || block === 16 || block === 17) {
            return 1.0; // Full block height for collision
        }
        // Full blocks
        if (block !== BlockType.AIR) {
            return 1.0;
        }
        return 0;
    }

    // Check if position is inside or colliding with a block/slab
    checkCollisionAt(x, y, z, playerAABB) {
        const blockX = Math.floor(x);
        const blockY = Math.floor(y);
        const blockZ = Math.floor(z);
        
        const blockType = this.world.getBlockAt(blockX, blockY, blockZ);
        if (blockType === BlockType.AIR) return null;
        
        let blockHeight = 1.0;
        let blockMinY = blockY;
        
        // Bottom slabs
        if (blockType === BlockType.STONE_SLAB || blockType === BlockType.LOG_SLAB || blockType === BlockType.PLANK_SLAB) {
            blockHeight = 0.5;
        }
        // Top slabs
        else if (blockType === 15 || blockType === 16 || blockType === 17) {
            blockHeight = 0.5;
            blockMinY = blockY + 0.5;
        }
        
        const blockBox = new THREE.Box3(
            new THREE.Vector3(blockX, blockMinY, blockZ),
            new THREE.Vector3(blockX + 1, blockMinY + blockHeight, blockZ + 1)
        );
        
        if (playerAABB.intersectsBox(blockBox)) {
            return {
                box: blockBox,
                height: blockHeight,
                blockType: blockType,
                x: blockX,
                y: blockY,
                z: blockZ
            };
        }
        
        return null;
    }

    getCollidingBlocks(aabb) {
        const blocks = [];
        const minX = Math.floor(aabb.min.x);
        const maxX = Math.ceil(aabb.max.x);
        const minY = Math.floor(aabb.min.y);
        const maxY = Math.ceil(aabb.max.y);
        const minZ = Math.floor(aabb.min.z);
        const maxZ = Math.ceil(aabb.max.z);

        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                for (let z = minZ; z < maxZ; z++) {
                    const blockType = this.world.getBlockAt(x, y, z);
                    if (blockType !== BlockType.AIR) {
                        let blockHeight = 1.0;
                        let blockMinY = y;
                        
                        // Bottom slabs
                        if (blockType === BlockType.STONE_SLAB || blockType === BlockType.LOG_SLAB || blockType === BlockType.PLANK_SLAB) {
                            blockHeight = 0.5;
                        }
                        // Top slabs
                        else if (blockType === 15 || blockType === 16 || blockType === 17) {
                            blockHeight = 0.5;
                            blockMinY = y + 0.5;
                        }
                        
                        const blockBox = new THREE.Box3(
                            new THREE.Vector3(x, blockMinY, z),
                            new THREE.Vector3(x + 1, blockMinY + blockHeight, z + 1)
                        );
                        
                        if (aabb.intersectsBox(blockBox)) {
                            blocks.push({
                                x, y, z,
                                blockType,
                                height: blockHeight,
                                box: blockBox,
                                minY: blockMinY
                            });
                        }
                    }
                }
            }
        }
        return blocks;
    }

    update(player, delta) {
        delta = Math.min(delta, 0.05);

        // Apply gravity
        player.velocity.y = Math.max(player.velocity.y + this.gravity * delta, this.terminalVelocity);

        const startPos = player.position.clone();
        const move = player.velocity.clone().multiplyScalar(delta);

        let potentialStepHeight = 0;

        // --- X MOVEMENT ---
        player.position.x += move.x;
        player.updateAABB();
        let xCollisions = this.getCollidingBlocks(player.aabb);
        if (xCollisions.length > 0) {
            let highestCollisionY = -Infinity;
            for (const col of xCollisions) {
                highestCollisionY = Math.max(highestCollisionY, col.box.max.y);
            }
            let step = highestCollisionY - startPos.y;
            // Allow movement if collision is at or below player's feet
            if (highestCollisionY <= startPos.y + 0.01) {
                // No blocking - can move over it
            } else if (step > 0.001 && step <= 0.6 && player.isGrounded) {
                potentialStepHeight = Math.max(potentialStepHeight, step);
            } else {
                player.position.x = startPos.x;
                player.velocity.x = 0;
            }
            player.updateAABB();
        }
        
        // --- Z MOVEMENT ---
        player.position.z += move.z;
        player.updateAABB();
        let zCollisions = this.getCollidingBlocks(player.aabb);
        if (zCollisions.length > 0) {
            let highestCollisionY = -Infinity;
            for (const col of zCollisions) {
                highestCollisionY = Math.max(highestCollisionY, col.box.max.y);
            }
            let step = highestCollisionY - startPos.y;
            // Allow movement if collision is at or below player's feet
            if (highestCollisionY <= startPos.y + 0.01) {
                // No blocking - can move over it
            } else if (step > 0.001 && step <= 0.6 && player.isGrounded) {
                potentialStepHeight = Math.max(potentialStepHeight, step);
            } else {
                player.position.z = startPos.z;
                player.velocity.z = 0;
            }
            player.updateAABB();
        }
        
        // --- STEP UP LOGIC ---
        if (potentialStepHeight > 0.001) {
            // Check if there is space above the step
            const stepTestAABB = player.aabb.clone().translate(new THREE.Vector3(0, potentialStepHeight + 0.01, 0));
            if (this.getCollidingBlocks(stepTestAABB).length === 0) {
                // Perform the step up
                player.position.y += potentialStepHeight;
                player.updateAABB();
                
                // Re-apply horizontal movement after stepping up
                player.position.x += move.x;
                player.updateAABB();
                if (this.getCollidingBlocks(player.aabb).length > 0) {
                    player.position.x = startPos.x;
                    player.updateAABB();
                }

                player.position.z += move.z;
                player.updateAABB();
                if (this.getCollidingBlocks(player.aabb).length > 0) {
                    player.position.z = startPos.z;
                    player.updateAABB();
                }
            }
        }

        // --- VERTICAL MOVEMENT (Y) ---
        player.position.y += move.y;
        player.updateAABB();

        const yCollisions = this.getCollidingBlocks(player.aabb);
        player.isGrounded = false;

        if (yCollisions.length > 0) {
            if (player.velocity.y < 0) { // Moving down
                let highestY = -Infinity;
                for (const col of yCollisions) {
                    highestY = Math.max(highestY, col.box.max.y);
                }
                player.position.y = highestY;
                player.velocity.y = 0;
                player.isGrounded = true;
            } else { // Moving up
                let lowestY = Infinity;
                for (const col of yCollisions) {
                    lowestY = Math.min(lowestY, col.box.min.y);
                }
                player.position.y = lowestY - player.height;
                player.velocity.y = 0;
            }
            player.updateAABB();
        }
    }
}