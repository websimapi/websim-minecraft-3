import * as THREE from 'three';
import { BlockType } from './blocks.js';

export class DroppedItem {
    constructor(scene, blockType, position, textures) {
        this.scene = scene;
        this.blockType = blockType;
        this.position = position.clone();
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            5,
            (Math.random() - 0.5) * 2
        );
        this.collected = false;
        this.lifetime = 0;
        this.maxLifetime = 300;
        this.onGround = false;
        this.pickupTimer = 1.0; // 1 second grace period

        this.createMesh(textures);
        this.createShadow();
    }

    createMesh(textures) {
        // Check if it's a slab - create half-height model
        const isSlab = this.blockType === 11 || this.blockType === 12 || this.blockType === 13 ||
                      this.blockType === 15 || this.blockType === 16 || this.blockType === 17;
        
        const height = isSlab ? 0.125 : 0.25;
        const geometry = new THREE.BoxGeometry(0.25, height, 0.25);

        let material;
        if (this.blockType === BlockType.GRASS) {
            const textureSet = textures[this.blockType];
            
            const sideTexture = textureSet.side.clone();
            sideTexture.repeat.y = 1;
            sideTexture.offset.y = 0;
            sideTexture.needsUpdate = true;
            
            const materials = [
                new THREE.MeshLambertMaterial({ map: sideTexture.clone() }),
                new THREE.MeshLambertMaterial({ map: sideTexture.clone() }),
                new THREE.MeshLambertMaterial({ map: textureSet.top }),
                new THREE.MeshLambertMaterial({ map: textureSet.bottom }),
                new THREE.MeshLambertMaterial({ map: sideTexture.clone() }),
                new THREE.MeshLambertMaterial({ map: sideTexture.clone() })
            ];
            material = materials;
        } else if (this.blockType === BlockType.WOOD || this.blockType === BlockType.WOOD_X || this.blockType === BlockType.WOOD_Z || this.blockType === BlockType.TNT || this.blockType === BlockType.PLANKS || this.blockType === 20 || this.blockType === BlockType.FURNACE || this.blockType === BlockType.FURNACE_LIT) {
            // For WOOD_X and WOOD_Z, use base WOOD textures
            let baseType = this.blockType;
            if (this.blockType === BlockType.WOOD_X || this.blockType === BlockType.WOOD_Z) baseType = BlockType.WOOD;
            if (this.blockType === BlockType.FURNACE_LIT) baseType = BlockType.FURNACE;
            
            const textureSet = textures[baseType];
            
            const sideTexture = textureSet.side.clone();
            sideTexture.repeat.y = 1;
            sideTexture.offset.y = 0;
            sideTexture.needsUpdate = true;
            
            const materials = [
                new THREE.MeshLambertMaterial({ map: sideTexture.clone() }),
                new THREE.MeshLambertMaterial({ map: sideTexture.clone() }),
                new THREE.MeshLambertMaterial({ map: textureSet.top }),
                new THREE.MeshLambertMaterial({ map: textureSet.top.clone() }),
                new THREE.MeshLambertMaterial({ map: sideTexture.clone() }),
                new THREE.MeshLambertMaterial({ map: sideTexture.clone() })
            ];
            material = materials;
        } else if (isSlab) {
            // Determine base texture for slab
            let baseTexture;
            if (this.blockType === 11 || this.blockType === 15) baseTexture = textures[3]; // Stone
            else if (this.blockType === 12 || this.blockType === 16) baseTexture = textures[5].side; // Wood
            else if (this.blockType === 13 || this.blockType === 17) baseTexture = textures[10].side; // Planks
            
            material = new THREE.MeshLambertMaterial({ map: baseTexture });
        } else if (this.blockType === BlockType.GLASS) {
            // Glass dropped item with transparency
            material = new THREE.MeshLambertMaterial({ 
                map: textures[this.blockType],
                transparent: true,
                opacity: 0.7,
                alphaTest: 0.1
            });
        } else {
            material = new THREE.MeshLambertMaterial({ map: textures[this.blockType] });
        }

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }
    
    createShadow() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Draw hard-edged circular shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();
        
        const texture = new THREE.CanvasTexture(canvas);
        const shadowGeometry = new THREE.PlaneGeometry(0.5, 0.5);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.7,
            depthWrite: false
        });
        
        this.shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        this.shadow.rotation.x = -Math.PI / 2;
        this.scene.add(this.shadow);
    }

    update(delta, playerPosition, world) {
        if (this.collected) return true;

        this.lifetime += delta;
        if (this.lifetime > this.maxLifetime) {
            this.dispose();
            return true;
        }
        
        // Update grace period timer
        if (this.pickupTimer > 0) {
            this.pickupTimer -= delta;
        }

        // Apply gravity
        this.velocity.y -= 25 * delta;
        this.velocity.y = Math.max(this.velocity.y, -50);

        const oldPosition = this.position.clone();
        const movement = this.velocity.clone().multiplyScalar(delta);
        this.position.add(movement);

        // Check ground collision
        const itemRadius = 0.125;
        const groundY = Math.floor(this.position.y - itemRadius);
        
        let hitGround = false;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const checkX = Math.floor(this.position.x + dx * itemRadius);
                const checkZ = Math.floor(this.position.z + dz * itemRadius);
                const blockBelow = world.getBlockAt(checkX, groundY, checkZ);
                
                if (blockBelow !== 0) {
                    hitGround = true;
                    break;
                }
            }
            if (hitGround) break;
        }

        if (hitGround && this.velocity.y < 0) {
            this.position.y = groundY + 1 + itemRadius;
            this.velocity.y = 0;
            
            this.velocity.x *= 0.8;
            this.velocity.z *= 0.8;
            
            if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
            if (Math.abs(this.velocity.z) < 0.1) this.velocity.z = 0;
            
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Check wall collisions
        const checkX = Math.floor(this.position.x + Math.sign(this.velocity.x) * itemRadius);
        const checkY = Math.floor(this.position.y);
        const checkZ = Math.floor(this.position.z);
        
        if (world.getBlockAt(checkX, checkY, checkZ) !== 0) {
            this.position.x = oldPosition.x;
            this.velocity.x *= -0.5;
        }
        
        const checkZ2 = Math.floor(this.position.z + Math.sign(this.velocity.z) * itemRadius);
        if (world.getBlockAt(Math.floor(this.position.x), checkY, checkZ2) !== 0) {
            this.position.z = oldPosition.z;
            this.velocity.z *= -0.5;
        }

        // Raycast for shadow position
        let shadowY = groundY + 1.01;
        const raycaster = new THREE.Raycaster(
            new THREE.Vector3(this.position.x, this.position.y, this.position.z),
            new THREE.Vector3(0, -1, 0),
            0,
            20
        );
        
        for (let checkDist = 0; checkDist < 20; checkDist++) {
            const checkYPos = Math.floor(this.position.y - checkDist);
            const block = world.getBlockAt(Math.floor(this.position.x), checkYPos, Math.floor(this.position.z));
            if (block !== 0) {
                shadowY = checkYPos + 1.01;
                break;
            }
        }

        // Only attract if grace period is over
        const toPlayer = playerPosition.clone().sub(this.position);
        const distance = toPlayer.length();

        if (this.pickupTimer <= 0) {
            if (distance < 2.0) {
                this.collected = true;
                // Dispatch event to notify that item should be added to inventory
                const event = new CustomEvent('itemCollected', { 
                    detail: { blockType: this.blockType } 
                });
                document.dispatchEvent(event);
                this.dispose();
                return true;
            } else if (distance < 8) {
                const pullStrength = 12;
                this.velocity.add(toPlayer.normalize().multiplyScalar(pullStrength * delta));
            }
        }

        // Update mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y += delta * 2;
        
        // Update shadow position
        this.shadow.position.set(this.position.x, shadowY, this.position.z);

        return false;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        if (Array.isArray(this.mesh.material)) {
            this.mesh.material.forEach(m => m.dispose());
        } else {
            this.mesh.material.dispose();
        }
        
        if (this.shadow) {
            this.scene.remove(this.shadow);
            this.shadow.geometry.dispose();
            this.shadow.material.dispose();
        }
    }
}