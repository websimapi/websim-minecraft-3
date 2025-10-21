import * as THREE from 'three';
import { TNTEntity, ExplosionParticleSystem } from './tnt-entity.js';
import { BlockRaycaster } from './raycaster.js';
import { BlockBreaker } from './block-breaker.js';
import { BlockPlacer } from './block-placer.js';
import { DroppedItem } from './dropped-item.js';
import { FallingBlockEntity } from './falling-block-entity.js';

export class BlockInteraction {
    constructor(scene, world, inventory, textures, getCameraDirection) {
        this.scene = scene;
        this.world = world;
        this.inventory = inventory;
        this.textures = textures;
        this.getCameraDirection = getCameraDirection;

        this.raycaster = new BlockRaycaster(world);
        this.breaker = new BlockBreaker(scene, world, textures, inventory);
        this.placer = new BlockPlacer(world, this.getCameraDirection);
        
        this.selectedBlock = null;
        this.hitPoint = null;
        this.mouseDown = { left: false, right: false };
        
        this.tntEntities = [];
        this.explosionParticles = new ExplosionParticleSystem(scene);
        this.fallingBlocks = [];
        this.cameraDirection = new THREE.Vector3();
        
        this.blockUpdateQueue = [];
        this.blockUpdateSet = new Set();

        this.setupListeners();
    }

    setupListeners() {
        document.addEventListener('mousedown', (e) => {
            if (!document.pointerLockElement) return;

            if (e.button === 0) {
                this.mouseDown.left = true;
                this.breaker.startBreaking(this.selectedBlock);
            } else if (e.button === 2) {
                this.mouseDown.right = true;
                e.preventDefault();
                this.handleRightClick();
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouseDown.left = false;
                this.breaker.stopBreaking();
            }
            if (e.button === 2) this.mouseDown.right = false;
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Listen for drop item event
        document.addEventListener('dropItem', (e) => {
            this.handleDropItem(e.detail.blockType);
        });
        
        // Listen for item collected event
        document.addEventListener('itemCollected', (e) => {
            this.inventory.addBlock(e.detail.blockType);
        });
    }
    
    handleDropItem(blockType) {
        if (!this.cameraPosition || blockType === null) return;
        
        // Drop item in front of player
        const dropPosition = this.cameraPosition.clone().add(
            this.cameraDirection.clone().multiplyScalar(1.5)
        );
        
        const droppedItem = new DroppedItem(this.scene, blockType, dropPosition, this.textures);
        droppedItem.velocity = this.cameraDirection.clone().multiplyScalar(6);
        droppedItem.velocity.y = 3;
        
        this.breaker.droppedItems.push(droppedItem);
    }

    handleRightClick() {
        if (!this.selectedBlock || !this.hitPoint) return;
        
        const selectedSlotData = this.inventory.getSelectedBlock();
        const blockAtTarget = this.world.getBlockAt(
            this.selectedBlock.x,
            this.selectedBlock.y,
            this.selectedBlock.z
        );
        
        if (blockAtTarget === 20) { // Crafting table
            this.inventory.openCrafting();
            return;
        }
        
        if (blockAtTarget === 44 || blockAtTarget === 45) { // Furnace
            this.inventory.openFurnace({
                x: this.selectedBlock.x,
                y: this.selectedBlock.y,
                z: this.selectedBlock.z,
            });
            return;
        }
        
        if (blockAtTarget === 7 && selectedSlotData?.type === 8) { // TNT and Flint/Steel
            this.world.setBlockAt(this.selectedBlock.x, this.selectedBlock.y, this.selectedBlock.z, 0);
            
            const tnt = new TNTEntity(
                this.scene,
                new THREE.Vector3(this.selectedBlock.x + 0.5, this.selectedBlock.y + 0.5, this.selectedBlock.z + 0.5),
                this.textures
            );
            
            tnt.velocity.set((Math.random() - 0.5) * 2, 10, (Math.random() - 0.5) * 2);
            this.tntEntities.push(tnt);
            this.scheduleBlockUpdate(this.selectedBlock.x, this.selectedBlock.y, this.selectedBlock.z);
        } else {
            const placement = this.placer.getPlacement(this.selectedBlock, this.hitPoint, selectedSlotData?.type);

            if (placement) {
                if (this.inventory.removeBlock(selectedSlotData.type)) {
                    if (placement.combineSlab) {
                        this.placer.combineSlabs(placement.pos, placement.slabType);
                        this.scheduleBlockUpdate(placement.pos.x, placement.pos.y, placement.pos.z);
                    } else if (placement.shouldFall) {
                        const fallingBlock = new FallingBlockEntity(
                            this.scene, placement.blockType, placement.pos, this.textures, this.world
                        );
                        this.fallingBlocks.push(fallingBlock);
                    } else {
                        this.world.setBlockAt(placement.pos.x, placement.pos.y, placement.pos.z, placement.blockType, placement.cameraDirection);
                        this.scheduleBlockUpdate(placement.pos.x, placement.pos.y, placement.pos.z);
                    }
                }
            }
        }
    }

    scheduleBlockUpdate(x, y, z) {
        const key = `${x},${y},${z}`;
        if (!this.blockUpdateSet.has(key)) {
            this.blockUpdateQueue.push({ x, y, z });
            this.blockUpdateSet.add(key);
        }
    }
    
    processBlockUpdates() {
        if (this.blockUpdateQueue.length === 0) return;
    
        const updatesToProcess = this.blockUpdateQueue.length;
    
        for (let i = 0; i < updatesToProcess; i++) {
            const pos = this.blockUpdateQueue.shift();
            this.blockUpdateSet.delete(`${pos.x},${pos.y},${pos.z}`);
            this.updateNeighbors(pos.x, pos.y, pos.z);
        }
    }

    updateNeighbors(x, y, z) {
        const directions = [
            { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
            { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
        ];
    
        for (const dir of directions) {
            const nx = x + dir.x;
            const ny = y + dir.y;
            const nz = z + dir.z;
    
            const neighborData = this.world.getBlockDataAt(nx, ny, nz);
            if (!neighborData) continue;

            const neighborType = neighborData & 0xFF;
            const isStatic = (neighborData >> 10) & 1;

            if ((neighborType === 24 || neighborType === 26)) { // Sand or Gravel
                // If it's a static block, unset the static flag first.
                if (isStatic) {
                    this.world.setBlockAt(nx, ny, nz, neighborType); // This removes the static flag
                }

                const blockBelow = this.world.getBlockAt(nx, ny - 1, nz);
                if (blockBelow === 0) {
                    const alreadyFalling = this.fallingBlocks.some(fb => 
                        Math.floor(fb.position.x) === nx &&
                        Math.floor(fb.position.y) === ny &&
                        Math.floor(fb.position.z) === nz
                    );
                    
                    if (!alreadyFalling) {
                        this.world.setBlockAt(nx, ny, nz, 0);
                        const fallingBlock = new FallingBlockEntity(
                            this.scene, neighborType,
                            new THREE.Vector3(nx + 0.5, ny + 0.5, nz + 0.5),
                            this.textures, this.world
                        );
                        this.fallingBlocks.push(fallingBlock);
                        this.scheduleBlockUpdate(nx, ny, nz); // Propagate update
                    }
                }
            }
        }
    }

    updateSelectedBlock(camera) {
        const result = this.raycaster.cast(camera);
        this.selectedBlock = result.block;
        this.hitPoint = result.hitPoint;
    }

    updateBreaking(delta) {
        const breakResult = this.breaker.update(delta, this.selectedBlock);
        
        if (breakResult.broken && breakResult.position) {
            this.scheduleBlockUpdate(breakResult.position.x, breakResult.position.y, breakResult.position.z);
        }
    }
    
    updateDroppedItems(delta, playerPosition) {
        this.breaker.updateDroppedItems(delta, playerPosition);
    }
    
    updateTNT(delta) {
        this.scene.userData.cameraPosition = this.scene.userData.cameraPosition || new THREE.Vector3();
        
        for (let i = this.tntEntities.length - 1; i >= 0; i--) {
            const tnt = this.tntEntities[i];
            const done = tnt.update(delta, this.world);
            
            if (done) {
                if (tnt.litTNTData?.length > 0) {
                    for (const litData of tnt.litTNTData) {
                        const newTNT = new TNTEntity(this.scene, litData.position, this.textures);
                        newTNT.velocity.copy(litData.velocity);
                        newTNT.fuse = 1.5 + Math.random();
                        this.tntEntities.push(newTNT);
                    }
                }
                
                if (tnt.blocksToUpdate?.length > 0) {
                    for (const pos of tnt.blocksToUpdate) {
                        this.scheduleBlockUpdate(pos.x, pos.y, pos.z);
                    }
                }
                
                if (tnt.explosionParticles) {
                    this.explosionParticles.addParticles(tnt.explosionParticles);
                }
                
                this.tntEntities.splice(i, 1);
            }
        }
        
        this.explosionParticles.update(delta);
    }

    updateFallingBlocks(delta) {
        for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
            const block = this.fallingBlocks[i];
            const done = block.update(delta);
            
            if (done) {
                const landedX = Math.floor(block.position.x);
                const landedY = Math.floor(block.position.y - 0.5) + 1;
                const landedZ = Math.floor(block.position.z);
                
                this.scheduleBlockUpdate(landedX, landedY, landedZ);
                
                this.fallingBlocks.splice(i, 1);
            }
        }
    }

    setPlayerAABB(aabb) {
        this.placer.setPlayerAABB(aabb);
    }
    
    setCameraPosition(position) {
        this.cameraPosition = position;
        this.scene.userData.cameraPosition = position;
    }
    
    setCameraDirection(direction) {
        this.cameraDirection.copy(direction);
    }
}