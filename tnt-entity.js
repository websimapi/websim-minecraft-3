import * as THREE from 'three';

export class TNTEntity {
    constructor(scene, position, textures) {
        this.scene = scene;
        this.position = position.clone();
        this.velocity = new THREE.Vector3(0, 10, 0);
        this.fuse = 4;
        this.exploded = false;
        this.isGrounded = false;
        this.lastPosition = position.clone();
        this.radius = 0.49; // Collision radius

        this.createMesh(textures);
    }

    createMesh(textures) {
        const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
        const textureSet = textures[7]; // TNT texture

        // Clone textures and remove any flipping for lit TNT
        const sideTexture = textureSet.side.clone();
        sideTexture.repeat.y = 1; // Remove flip
        sideTexture.offset.y = 0; // Remove offset
        sideTexture.needsUpdate = true;
        
        const topTexture = textureSet.top.clone();
        topTexture.needsUpdate = true;

        const materials = [
            new THREE.MeshLambertMaterial({ map: sideTexture.clone() }), // right
            new THREE.MeshLambertMaterial({ map: sideTexture.clone() }), // left
            new THREE.MeshLambertMaterial({ map: topTexture }), // top
            new THREE.MeshLambertMaterial({ map: topTexture.clone() }), // bottom
            new THREE.MeshLambertMaterial({ map: sideTexture.clone() }), // front
            new THREE.MeshLambertMaterial({ map: sideTexture.clone() })  // back
        ];

        this.mesh = new THREE.Mesh(geometry, materials);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(delta, world) {
        if (this.exploded) return true;

        this.fuse -= delta;

        const flashSpeed = 3;
        const flash = Math.sin(Date.now() / 1000 * flashSpeed * Math.PI);
        const shouldFlash = flash > 0;
        
        this.mesh.material.forEach(m => {
            if (shouldFlash) {
                m.emissive = new THREE.Color(1, 1, 1);
                m.emissiveIntensity = 0.8;
            } else {
                m.emissive = new THREE.Color(0, 0, 0);
                m.emissiveIntensity = 0;
            }
        });

        if (this.fuse <= 0) {
            this.explode(world);
            return true;
        }

        // Store last position
        this.lastPosition.copy(this.position);

        // Apply gravity
        this.velocity.y -= 30 * delta;
        this.velocity.y = Math.max(this.velocity.y, -50);

        // Apply friction when grounded
        if (this.isGrounded) {
            this.velocity.x *= 0.75;
            this.velocity.z *= 0.75;
            
            if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
            if (Math.abs(this.velocity.z) < 0.1) this.velocity.z = 0;
        }

        // --- Collision and Movement ---
        const move = this.velocity.clone().multiplyScalar(delta);
        const nextPos = this.position.clone();

        // Move X
        nextPos.x += move.x;
        if (this.checkWallCollision(nextPos, world)) {
            nextPos.x = this.position.x;
            this.velocity.x = 0;
        }
        
        // Move Z
        nextPos.z += move.z;
        if (this.checkWallCollision(nextPos, world)) {
            nextPos.z = this.position.z;
            this.velocity.z = 0;
        }
        
        // Move Y
        nextPos.y += move.y;
        if (this.checkVerticalCollision(nextPos, world, move.y)) {
             // Position is adjusted inside checkVerticalCollision
        } else {
            this.isGrounded = false;
        }

        // Update position
        this.position.copy(nextPos);
        this.mesh.position.copy(this.position);

        return false;
    }

    checkWallCollision(pos, world) {
        const checkPoints = [
            [-0.4, 0.1, -0.4], [0.4, 0.1, -0.4], [-0.4, 0.1, 0.4], [0.4, 0.1, 0.4],
            [-0.4, 0.9, -0.4], [0.4, 0.9, -0.4], [-0.4, 0.9, 0.4], [0.4, 0.9, 0.4],
        ];

        for(const p of checkPoints) {
            const block = world.getBlockAt(
                Math.floor(pos.x + p[0]),
                Math.floor(this.position.y + p[1]),
                Math.floor(pos.z + p[2])
            );
            if (block !== 0) return true;
        }
        return false;
    }
    
    checkVerticalCollision(pos, world, moveY) {
         if (moveY < 0) { // Moving down
            const checkPoints = [
                [0, 0], [-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]
            ];
            for (const p of checkPoints) {
                const blockBelow = world.getBlockAt(
                    Math.floor(this.position.x + p[0]),
                    Math.floor(pos.y - this.radius),
                    Math.floor(this.position.z + p[1])
                );
                if (blockBelow !== 0) {
                    pos.y = Math.floor(pos.y - this.radius) + 1 + this.radius;
                    this.velocity.y = 0;
                    this.isGrounded = true;
                    return true;
                }
            }
        } else if (moveY > 0) { // Moving up
             const blockAbove = world.getBlockAt(
                Math.floor(pos.x),
                Math.floor(pos.y + this.radius),
                Math.floor(pos.z)
            );
            if(blockAbove !== 0) {
                pos.y = Math.floor(pos.y + this.radius) - this.radius;
                this.velocity.y = 0;
                return true;
            }
        }
        return false;
    }

    explode(world) {
        this.exploded = true;

        const radius = 4;
        const center = this.position.clone();

        const affectedChunks = new Set();
        const litTNT = []; // Track TNT blocks to light instead of destroy
        const blocksToUpdate = new Set();
        
        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                for (let z = -radius; z <= radius; z++) {
                    const distance = Math.sqrt(x*x + y*y + z*z);
                    if (distance <= radius) {
                        const worldX = Math.floor(center.x + x);
                        const worldY = Math.floor(center.y + y);
                        const worldZ = Math.floor(center.z + z);
                        
                        const blockType = world.getBlockAt(worldX, worldY, worldZ);
                        
                        // Skip bedrock
                        if (blockType === 9) continue;

                        // Add neighbors of destroyed block to update list
                        const neighbors = [
                            {x: worldX+1, y: worldY, z: worldZ}, {x: worldX-1, y: worldY, z: worldZ},
                            {x: worldX, y: worldY+1, z: worldZ}, {x: worldX, y: worldY-1, z: worldZ},
                            {x: worldX, y: worldY, z: worldZ+1}, {x: worldX, y: worldY, z: worldZ-1},
                        ];
                        neighbors.forEach(n => blocksToUpdate.add(`${n.x},${n.y},${n.z}`));
                        
                        // If it's TNT, light it instead of destroying
                        if (blockType === 7) {
                            const direction = new THREE.Vector3(x, y, z).normalize();
                            const launchSpeed = 8 + Math.random() * 4;
                            litTNT.push({
                                position: new THREE.Vector3(worldX + 0.5, worldY + 0.5, worldZ + 0.5),
                                velocity: direction.multiplyScalar(launchSpeed)
                            });
                            
                            // Still destroy the block from the world
                            world.setBlockAt(worldX, worldY, worldZ, 0);
                        } else if (blockType !== 0) {
                            world.setBlockAt(worldX, worldY, worldZ, 0);
                        }
                        
                        const chunkX = Math.floor(worldX / 16);
                        const chunkZ = Math.floor(worldZ / 16);
                        affectedChunks.add(`${chunkX},${chunkZ}`);
                    }
                }
            }
        }

        // Return lit TNT data for block-interaction to create entities
        this.litTNTData = litTNT;
        this.blocksToUpdate = Array.from(blocksToUpdate).map(s => {
            const [x,y,z] = s.split(',').map(Number);
            return {x,y,z};
        });

        // Spawn explosion particles
        this.spawnExplosionParticles();

        // Force immediate rebuild of affected chunks - no setTimeout
        world.forceRebuildChunks(Array.from(affectedChunks));

        this.dispose();
    }

    spawnExplosionParticles() {
        const particleCount = 8 + Math.floor(Math.random() * 4);
        const particles = [];

        const textureLoader = new THREE.TextureLoader();
        const boomTexture = textureLoader.load('boom.png');
        boomTexture.magFilter = THREE.NearestFilter;
        boomTexture.minFilter = THREE.NearestFilter;

        for (let i = 0; i < particleCount; i++) {
            const size = 3 + Math.random() * 2;
            const geometry = new THREE.PlaneGeometry(size, size);
            const material = new THREE.MeshBasicMaterial({
                map: boomTexture,
                transparent: true,
                opacity: 1,
                side: THREE.DoubleSide,
                depthWrite: false
            });

            const particle = new THREE.Mesh(geometry, material);
            
            // Random position around explosion center
            particle.position.copy(this.position);
            particle.position.x += (Math.random() - 0.5) * 3;
            particle.position.y += (Math.random() - 0.5) * 2;
            particle.position.z += (Math.random() - 0.5) * 3;

            // Random velocity - mostly outward, less vertical
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 1.5 + 0.5,
                (Math.random() - 0.5) * 3
            );

            // Random rotation
            particle.rotation.z = Math.random() * Math.PI * 2;

            this.scene.add(particle);

            particles.push({
                mesh: particle,
                velocity: velocity,
                lifetime: 0,
                maxLifetime: 1.5 + Math.random() * 0.5,
                rotationSpeed: (Math.random() - 0.5) * 2
            });
        }

        // Store for cleanup
        this.explosionParticles = particles;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.forEach(m => m.dispose());
    }
}

// Particle system for explosion effects
export class ExplosionParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    addParticles(particlesData) {
        this.particles.push(...particlesData);
    }

    update(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.lifetime += delta;
            
            if (particle.lifetime >= particle.maxLifetime) {
                this.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }

            // Apply velocity (no gravity)
            particle.mesh.position.add(particle.velocity.clone().multiplyScalar(delta));
            
            // Slow down over time
            particle.velocity.multiplyScalar(0.98);
            
            // Fade out
            const progress = particle.lifetime / particle.maxLifetime;
            particle.mesh.material.opacity = 1 - progress;
            
            // Rotate
            particle.mesh.rotation.z += particle.rotationSpeed * delta;
            
            // Make face camera
            const cameraPos = this.scene.userData.cameraPosition || new THREE.Vector3(0, 0, 0);
            particle.mesh.lookAt(cameraPos);
        }
    }
}