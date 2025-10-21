import * as THREE from 'three';
import { DroppedItem } from './dropped-item.js';
import { BlockType } from './blocks.js';

export class BlockBreaker {
    constructor(scene, world, textures, inventory) {
        this.scene = scene;
        this.world = world;
        this.textures = textures;
        this.inventory = inventory;
        this.breakingBlock = null;
        this.breakProgress = 0;
        this.breakTime = 0.8;
        this.breakOverlayMesh = null;
        this.droppedItems = [];
        
        this.loadBreakTextures();
    }

    loadBreakTextures() {
        const breakStages = [
            'damaged block stage 1.png',
            'damaged block stage 2.png',
            'damaged block stage 3.png',
            'damaged block stage 4.png',
            'damaged block stage 5.png',
            'damaged block about to break.png'
        ];

        this.breakTextures = [];
        const textureLoader = new THREE.TextureLoader();
        breakStages.forEach(stage => {
            const texture = textureLoader.load(stage);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            this.breakTextures.push(texture);
        });
    }

    getBreakTime(blockType, toolType) {
        // Define tool categories
        const isPickaxe = toolType >= 33 && toolType <= 35;
        const isAxe = toolType >= 36 && toolType <= 38;
        const isShovel = toolType >= 39 && toolType <= 41;
        
        // Define tool tiers
        let toolTier = 0;
        if (toolType === 33 || toolType === 36 || toolType === 39) toolTier = 1; // Wood
        else if (toolType === 34 || toolType === 37 || toolType === 40) toolTier = 2; // Stone
        else if (toolType === 35 || toolType === 38 || toolType === 41) toolTier = 3; // Iron
        
        // Stone/ore blocks (need pickaxe)
        if (blockType === 3 || blockType === 21 || blockType === 32 || blockType === 44 || blockType === 45) {
            if (!isPickaxe) return 15.0; // Very slow without pickaxe
            if (toolTier === 1) return 1.5;
            if (toolTier === 2) return 0.75;
            if (toolTier === 3) return 0.5;
        }
        
        // Wood blocks (faster with axe)
        if (blockType === 5 || blockType === 10 || blockType === 18 || blockType === 19 || blockType === 20) {
            if (!isAxe) return 3.0;
            if (toolTier === 1) return 1.5;
            if (toolTier === 2) return 0.75;
            if (toolTier === 3) return 0.5;
        }
        
        // Dirt/gravel/sand (faster with shovel)
        if (blockType === 1 || blockType === 2 || blockType === 24 || blockType === 26) {
            if (!isShovel) return 1.5;
            if (toolTier === 1) return 0.75;
            if (toolTier === 2) return 0.4;
            if (toolTier === 3) return 0.25;
        }
        
        // Default break times
        return 1.0;
    }

    startBreaking(selectedBlock) {
        if (selectedBlock) {
            this.breakingBlock = { ...selectedBlock };
            this.breakProgress = 0;
        }
    }

    stopBreaking() {
        this.breakingBlock = null;
        this.breakProgress = 0;
        if (this.breakOverlayMesh) {
            this.breakOverlayMesh.visible = false;
        }
    }

    update(delta, selectedBlock) {
        if (this.breakOverlayMesh) {
            this.breakOverlayMesh.visible = false;
        }

        let breakResult = { broken: false, position: null };

        if (this.breakingBlock && selectedBlock) {
            if (this.breakingBlock.x === selectedBlock.x && 
                this.breakingBlock.y === selectedBlock.y && 
                this.breakingBlock.z === selectedBlock.z) {

                const selectedSlot = this.inventory.getSelectedBlock();
                const toolType = selectedSlot && selectedSlot.type !== null ? selectedSlot.type : null;
                const blockType = this.world.getBlockAt(this.breakingBlock.x, this.breakingBlock.y, this.breakingBlock.z);
                
                this.breakTime = this.getBreakTime(blockType, toolType);
                this.breakProgress += delta;

                const stageIndex = Math.min(
                    Math.floor((this.breakProgress / this.breakTime) * this.breakTextures.length),
                    this.breakTextures.length - 1
                );

                if (this.breakTextures[stageIndex]) {
                    if (!this.breakOverlayMesh) {
                        this.createBreakOverlay();
                    }
                    
                    // Adjust overlay size for slabs
                    const isSlab = blockType === 11 || blockType === 12 || blockType === 13;
                    const isTopSlab = blockType === 15 || blockType === 16 || blockType === 17;
                    
                    this.breakOverlayMesh.scale.set(1.01, (isSlab || isTopSlab) ? 0.505 : 1.01, 1.01);
                    this.breakOverlayMesh.material.map = this.breakTextures[stageIndex];
                    this.breakOverlayMesh.material.needsUpdate = true;
                    this.breakOverlayMesh.position.set(
                        this.breakingBlock.x + 0.5,
                        this.breakingBlock.y + (isTopSlab ? 0.75 : (isSlab ? 0.25 : 0.5)),
                        this.breakingBlock.z + 0.5
                    );
                    this.breakOverlayMesh.visible = true;
                }

                if (this.breakProgress >= this.breakTime) {
                    let blockType = this.world.getBlockAt(this.breakingBlock.x, this.breakingBlock.y, this.breakingBlock.z);
                    if (blockType !== 0 && blockType !== 9) {
                    
                        // Damage tool if it's a tool
                        if (selectedSlot && selectedSlot.durability !== null && selectedSlot.durability !== undefined) {
                            selectedSlot.durability--;
                            if (selectedSlot.durability <= 0) {
                                selectedSlot.type = null;
                                selectedSlot.count = 0;
                                selectedSlot.durability = null;
                            }
                            this.inventory.hotbarUI.updateHotbar();
                        }
                        
                        // Determine drop
                        let dropType = blockType;
                        if (blockType === 21) dropType = 3; // Stone -> Cobblestone
                        if (blockType === 32) dropType = 32; // Iron ore drops iron ore
                        if (blockType === 46) dropType = 46; // Coal ore drops coal ore
                        else if (blockType === 45) dropType = 44; // Lit Furnace -> Furnace

                        // Drop the block as an item, except for leaves
                        if (blockType !== BlockType.LEAVES) {
                            const dropPosition = new THREE.Vector3(
                                this.breakingBlock.x + 0.5,
                                this.breakingBlock.y + 0.5,
                                this.breakingBlock.z + 0.5
                            );
                            const droppedItem = new DroppedItem(this.scene, dropType, dropPosition, this.textures);
                            this.droppedItems.push(droppedItem);
                        }
                        
                        this.world.setBlockAt(this.breakingBlock.x, this.breakingBlock.y, this.breakingBlock.z, 0);
                        breakResult.broken = true;
                        breakResult.position = { x: this.breakingBlock.x, y: this.breakingBlock.y, z: this.breakingBlock.z };
                    }
                    this.stopBreaking();
                }
            } else {
                this.breakingBlock = { ...selectedBlock };
                this.breakProgress = 0;
            }
        }
        
        return breakResult;
    }

    createBreakOverlay() {
        if (this.breakOverlayMesh) {
            this.scene.remove(this.breakOverlayMesh);
            this.breakOverlayMesh.geometry.dispose();
            this.breakOverlayMesh.material.dispose();
        }

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.breakOverlayMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.breakOverlayMesh);
    }

    updateDroppedItems(delta, playerPosition) {
        for (let i = this.droppedItems.length - 1; i >= 0; i--) {
            const item = this.droppedItems[i];
            const shouldRemove = item.update(delta, playerPosition, this.world);
            
            if (shouldRemove) {
                // The item is now responsible for adding itself to inventory upon collection
                // This loop just removes it from the world
                this.droppedItems.splice(i, 1);
            }
        }
    }
}