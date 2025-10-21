import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class PlayerArm {
    constructor(viewModelScene) {
        this.scene = viewModelScene;
        this.arm = new THREE.Object3D();
        this.mesh = null;
        this.heldItemMesh = null;
        this.currentItemType = null;
        this.gltfLoader = new GLTFLoader();
        this.loadedModels = new Map();
        
        // base offsets for held items (used consistently to avoid teleporting)
        this.heldBase = { x: 0.35, y: -0.12, z: -0.15 };

        this.animationState = {
            bobbing: {
                time: 0,
                amplitude: 0,
                frequency: 10,
                targetAmplitude: 0,
            },
            swinging: {
                time: -1,
                duration: 0.25
            }
        };

        this.scene.add(this.arm);
        this.createMesh();
        this.setupLighting();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }

    createMesh() {
        const textureLoader = new THREE.TextureLoader();
        
        const sideTexture = textureLoader.load('User Arm.png');
        sideTexture.magFilter = THREE.NearestFilter;
        sideTexture.minFilter = THREE.NearestFilter;
        
        const frontTexture = textureLoader.load('user arm front.png');
        frontTexture.magFilter = THREE.NearestFilter;
        frontTexture.minFilter = THREE.NearestFilter;
        
        const sideMat = new THREE.MeshLambertMaterial({ map: sideTexture });
        const frontMat = new THREE.MeshLambertMaterial({ map: frontTexture });

        const armLength = 0.9;
        const armThickness = 0.25;
        const geometry = new THREE.BoxGeometry(armThickness, armLength, armThickness); 
        
        geometry.translate(0, -armLength / 2, 0);

        const materials = [
            sideMat,
            sideMat,
            frontMat,
            frontMat,
            sideMat,
            sideMat
        ];

        this.mesh = new THREE.Mesh(geometry, materials);
        this.arm.add(this.mesh);
    }

    loadGLBModel(path) {
        return new Promise((resolve, reject) => {
            if (this.loadedModels.has(path)) {
                resolve(this.loadedModels.get(path).clone());
                return;
            }

            this.gltfLoader.load(
                path,
                (gltf) => {
                    this.loadedModels.set(path, gltf.scene);
                    resolve(gltf.scene.clone());
                },
                undefined,
                (error) => {
                    console.error('Error loading GLB:', error);
                    reject(error);
                }
            );
        });
    }

    async updateHeldItem(itemType, textures) {
        if (this.currentItemType === itemType) return;
        
        // Always remove old item mesh when switching
        if (this.heldItemMesh) {
            this.arm.remove(this.heldItemMesh);
            
            // Properly dispose of the mesh
            if (this.heldItemMesh.geometry) {
                this.heldItemMesh.geometry.dispose();
            }
            if (this.heldItemMesh.material) {
                if (Array.isArray(this.heldItemMesh.material)) {
                    this.heldItemMesh.material.forEach(m => m.dispose());
                } else {
                    this.heldItemMesh.material.dispose();
                }
            }
            
            this.heldItemMesh = null;
        }

        this.currentItemType = itemType;

        if (!itemType || itemType === 0) {
            return;
        }

        const glbMap = {
            8: 'flint and steel.glb',
            33: 'wooden pickaxe.glb',
            34: 'stone pickaxe.glb',
            35: 'stone pickaxe (1).glb', // iron pickaxe
            36: 'wooden axe.glb',
            37: 'stone axe.glb',
            38: 'iron axe.glb',
            39: 'wooden shovel.glb',
            40: 'stone shovel.glb',
            41: 'iron shovel.glb',
            42: 'stick.glb',
            43: 'iron ingot 3d dropped or held.glb',
            47: 'coal item held arm.glb'
        };

        if (glbMap[itemType]) {
            try {
                const model = await this.loadGLBModel(glbMap[itemType]);
                
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material.flatShading = false;
                    }
                });

                // Better positioning for held GLB models
                // Normalize orientation so models face outward; make them ~3x smaller than previous baseline,
                // shift left and up so the arm holds them toward the palm/back, and tilt so the arm grabs the back.
                model.position.set(0.18, -0.12, -0.12); // more to the left (smaller x) and higher (larger y)
                model.rotation.set(-Math.PI / 8, Math.PI, Math.PI / 10); // slight backward tilt so arm grips the back
                // Previous baseline scale used 0.036; reduce about 3x from the current effective size.
                const baseScale = 0.036;
                model.scale.set(baseScale * 0.04, baseScale * 0.04, baseScale * 0.04);

                this.heldItemMesh = model;
                this.arm.add(this.heldItemMesh);
            } catch (error) {
                console.error('Failed to load item model:', error);
            }
        } else {
            // It's a block - create a small cube
            // Make held blocks larger, slightly left and a bit higher so they sit in the hand
            const blockSize = 0.76;
            const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);

            let material;
            const texture = textures[itemType];
            
            if (itemType === 1) { // Grass
                const materials = [
                    new THREE.MeshLambertMaterial({ map: texture.side }),
                    new THREE.MeshLambertMaterial({ map: texture.side }),
                    new THREE.MeshLambertMaterial({ map: texture.top }),
                    new THREE.MeshLambertMaterial({ map: texture.bottom }),
                    new THREE.MeshLambertMaterial({ map: texture.side }),
                    new THREE.MeshLambertMaterial({ map: texture.side })
                ];
                material = materials;
            } else if (itemType === 5 || itemType === 7 || itemType === 20) {
                const materials = [
                    new THREE.MeshLambertMaterial({ map: texture.side }),
                    new THREE.MeshLambertMaterial({ map: texture.side }),
                    new THREE.MeshLambertMaterial({ map: texture.top }),
                    new THREE.MeshLambertMaterial({ map: texture.top }),
                    new THREE.MeshLambertMaterial({ map: texture.side }),
                    new THREE.MeshLambertMaterial({ map: texture.side })
                ];
                material = materials;
            } else if (texture) {
                material = new THREE.MeshLambertMaterial({ map: texture });
            } else {
                material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
            }

            const blockMesh = new THREE.Mesh(geometry, material);
            // Use shared base so update() and creation match — moved more left and a bit more up
            blockMesh.scale.set(0.45, 0.45, 0.45);
            blockMesh.position.set(this.heldBase.x, this.heldBase.y, this.heldBase.z);
            blockMesh.rotation.set(-Math.PI / 12, Math.PI, Math.PI / 24);

            this.heldItemMesh = blockMesh;
            this.arm.add(this.heldItemMesh);
        }
    }

    triggerSwing() {
        if (this.animationState.swinging.time < 0) {
            this.animationState.swinging.time = 0;
        }
    }

    update(delta, playerIsMoving, playerIsSprinting, isAttacking = false, selectedItemType = null, textures = null) {
        if (!this.mesh) return;

        // Update held item if changed - this ensures cleanup happens
        if (selectedItemType !== this.currentItemType && textures) {
            this.updateHeldItem(selectedItemType, textures);
        }

        this.arm.position.set(0.55, -0.25, -0.9);
        this.arm.rotation.set(
            -Math.PI / 30,
            -Math.PI / 18,
            Math.PI / 36,
            'YXZ'
        );

        const bob = this.animationState.bobbing;
        
        if (playerIsSprinting) {
            bob.targetAmplitude = 0.08;
        } else if (playerIsMoving) {
            bob.targetAmplitude = 0.04;
        } else {
            bob.targetAmplitude = 0;
        }
        
        const LERP_FACTOR = 8 * delta;
        bob.amplitude = THREE.MathUtils.lerp(bob.amplitude, bob.targetAmplitude, LERP_FACTOR);

        this.mesh.position.set(0, 0, 0);
        this.mesh.rotation.set(-Math.PI / 2, 0, 0);

        if (this.heldItemMesh) {
            this.heldItemMesh.visible = true;
        }

        if (bob.amplitude > 0.001) {
            bob.time += delta;
            
            const bobY = Math.sin(bob.time * bob.frequency) * bob.amplitude;
            const bobX = Math.cos(bob.time * bob.frequency * 0.5) * bob.amplitude * 0.5;
            
            this.mesh.position.y += bobY;
            this.mesh.position.x += bobX;
            
            if (this.heldItemMesh) {
                // Apply bob relative to shared base so held item doesn't teleport
                this.heldItemMesh.position.y = this.heldBase.y + bobY;
                this.heldItemMesh.position.x = this.heldBase.x + bobX;
            }
        } else {
            bob.time = 0;
        }

        const swing = this.animationState.swinging;
        
        if (isAttacking) {
            if (swing.time < 0) {
                 swing.time = 0;
            }
        }
        
        if (swing.time >= 0) {
            swing.time += delta;
            
            const progress = Math.min(swing.time / swing.duration, 1.0);
            const easeOutProgress = Math.sin(progress * Math.PI);

            const PUNCH_PITCH = Math.PI / 12;
            const TWIST = Math.PI / 18;
            const FORWARD = 0.06;

            this.arm.rotation.x = ( -Math.PI / 30 ) + (easeOutProgress * PUNCH_PITCH);
            this.mesh.rotation.z = Math.sin(progress * Math.PI * 2) * TWIST * 0.5;
            this.mesh.rotation.y = Math.sin(progress * Math.PI) * TWIST * 0.4;
            this.mesh.position.z = - (easeOutProgress * FORWARD);
            
            if (this.heldItemMesh) {
                // keep z baseline consistent with new held item forward offset
                this.heldItemMesh.position.z = -0.15 - (easeOutProgress * FORWARD);
            }

            if (swing.time >= swing.duration) {
                if (isAttacking) {
                    swing.time = 0;
                } else {
                    swing.time = -1;
                    this.mesh.rotation.set(-Math.PI / 2, 0, 0);
                    this.mesh.position.set(0,0,0);
                    if (this.heldItemMesh) {
                        this.heldItemMesh.position.z = -0.15;
                    }
                    this.arm.rotation.x = -Math.PI / 30;
                }
            }
        }
    }
}