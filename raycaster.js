import * as THREE from 'three';
import { BlockType } from './blocks.js';

export class BlockRaycaster {
    constructor(world) {
        this.world = world;
        this.raycaster = new THREE.Raycaster();
        this.reachDistance = 5;
    }

    cast(camera) {
        const origin = camera.position;
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        this.raycaster.set(origin, direction);

        let closestIntersection = null;

        // Broad phase: check grid cells along the ray
        let currentPos = origin.clone();
        const step = direction.clone().multiplyScalar(0.01);
        
        for (let i = 0; i < this.reachDistance * 100; i++) {
            currentPos.add(step);
            
            const x = Math.floor(currentPos.x);
            const y = Math.floor(currentPos.y);
            const z = Math.floor(currentPos.z);

            const blockType = this.world.getBlockAt(x, y, z);
            if (blockType === BlockType.AIR) continue;
            
            // Narrow phase: precise intersection with block AABB
            let blockHeight = 1.0;
            let blockMinY = y;
            
            const isBottomSlab = blockType === BlockType.STONE_SLAB || blockType === BlockType.LOG_SLAB || blockType === BlockType.PLANK_SLAB;
            const isTopSlab = blockType === BlockType.STONE_SLAB_TOP || blockType === BlockType.LOG_SLAB_TOP || blockType === BlockType.PLANK_SLAB_TOP;
            
            if (isBottomSlab) {
                blockHeight = 0.5;
            } else if (isTopSlab) {
                blockHeight = 0.5;
                blockMinY = y + 0.5;
            }

            const blockBox = new THREE.Box3(
                new THREE.Vector3(x, blockMinY, z),
                new THREE.Vector3(x + 1, blockMinY + blockHeight, z + 1)
            );
            
            const hitPoint = new THREE.Vector3();
            const intersects = this.raycaster.ray.intersectBox(blockBox, hitPoint);
            
            if (intersects) {
                const dist = origin.distanceTo(hitPoint);
                if (dist <= this.reachDistance) {
                    if (!closestIntersection || dist < closestIntersection.dist) {
                        const prevPos = hitPoint.clone().sub(direction.clone().multiplyScalar(0.01));
                        
                        closestIntersection = {
                            dist,
                            block: {
                                x, y, z,
                                placePos: {
                                    x: Math.floor(prevPos.x),
                                    y: Math.floor(prevPos.y),
                                    z: Math.floor(prevPos.z)
                                }
                            },
                            hitPoint: hitPoint.clone()
                        };
                    }
                }
                // Since we found an intersection, we can stop stepping
                break;
            }
        }

        if (closestIntersection) {
            return { block: closestIntersection.block, hitPoint: closestIntersection.hitPoint };
        }
        
        return { block: null, hitPoint: null };
    }
}