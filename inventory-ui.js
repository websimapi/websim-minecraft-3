import { InventoryState, blockTypeImages, slabIconsPromise } from './inventory-state.js';
import { HotbarUI } from './inventory-hotbar.js';
import { InventoryRenderer } from './inventory-rendering.js';
import { CraftingSystem } from './inventory-crafting.js';
import { SlotInteractionHandler } from './inventory-interaction.js';
import { setupInventoryUI } from './inventory-setup.js';
import { BlockTypeNames } from './blocks.js';
import { Furnace } from './furnace.js';

export class Inventory {
    constructor(world) {
        this.world = world;
        this.state = new InventoryState();
        this.crafting = new CraftingSystem(this.state);
        this.renderer = new InventoryRenderer(this.state);
        this.hotbarUI = new HotbarUI(this.state);
        this.furnace = new Furnace(this.state, this.renderer, this.world);
        this.slotHandler = new SlotInteractionHandler(this.state, this.crafting, this.renderer, this.hotbarUI, this, this.furnace);
        this.furnace.setSlotHandler(this.slotHandler);

        this.isOpen = false;
        this.isCraftingOpen = false;
        this.isFurnaceOpen = false;
        this.cursorElement = null;
        this.tooltipElement = document.getElementById('tooltip');

        this.setupGlobalListeners();
        // Use a timeout to ensure the hotbar renders correctly after all initial data (like slab icons) is processed
        setTimeout(() => this.hotbarUI.updateHotbar(), 100);
        setupInventoryUI(this.slotHandler, this.onCreativeSlotClick.bind(this));
        this.cursorElement = document.querySelector('.inventory-cursor');
        this.furnace.setupFurnaceUI();
    }

    setupGlobalListeners() {
        // Keyboard listeners
        document.addEventListener('keydown', (e) => {
            if (this.slotHandler.isMouseDown) return; // Ignore keydown while clicking inventory

            if (e.key.toLowerCase() === 'q' && !this.isOpen && !this.isCraftingOpen && !this.isFurnaceOpen) {
                e.preventDefault();
                this.hotbarUI.dropSelectedItem();
            }

            if (e.key.toLowerCase() === 'e') {
                e.preventDefault();
                if (this.isFurnaceOpen) {
                    this.closeFurnace();
                } else if (this.isCraftingOpen) {
                    this.closeCrafting();
                } else {
                    this.toggleInventory();
                }
            }

            if (e.key === 'Escape') {
                if (this.isFurnaceOpen) {
                    this.closeFurnace();
                } else if (this.isCraftingOpen) {
                    this.closeCrafting();
                } else if (this.isOpen) {
                    this.toggleInventory();
                }
            }
        });

        // Mouse listeners for drag/drop
        document.addEventListener('mousedown', (e) => this.slotHandler.handleGlobalMouseDown(e));
        document.addEventListener('mouseup', (e) => this.slotHandler.handleGlobalMouseUp(e));
        document.addEventListener('mousemove', (e) => {
            this.slotHandler.handleGlobalMouseMove(e);
            if (this.state.heldItem && this.cursorElement) {
                this.cursorElement.style.left = e.clientX + 'px';
                this.cursorElement.style.top = e.clientY + 'px';
            }
        });

        const inventoryScreen = document.getElementById('inventory-screen');
        const craftingScreen = document.getElementById('crafting-screen');
        const furnaceScreen = document.getElementById('furnace-screen');

        inventoryScreen.addEventListener('mouseover', e => this.handleTooltip(e));
        inventoryScreen.addEventListener('mouseout', () => this.hideTooltip());
        inventoryScreen.addEventListener('mousemove', e => this.moveTooltip(e));

        craftingScreen.addEventListener('mouseover', e => this.handleTooltip(e));
        craftingScreen.addEventListener('mouseout', () => this.hideTooltip());
        craftingScreen.addEventListener('mousemove', e => this.moveTooltip(e));

        furnaceScreen.addEventListener('mouseover', e => this.handleTooltip(e));
        furnaceScreen.addEventListener('mouseout', () => this.hideTooltip());
        furnaceScreen.addEventListener('mousemove', e => this.moveTooltip(e));
    }

    createCursorElement() {
        // This element is now directly in index.html to avoid race conditions.
        // This function is kept to avoid breaking constructor logic but it does nothing.
    }

    handleTooltip(e) {
        const slotElement = e.target.closest('[data-slot], [data-block-type], [data-personal-crafting-slot], [data-crafting-slot], [data-furnace-slot]');
        if (!slotElement) {
            this.hideTooltip();
            return;
        }

        let blockType = null;
        if (slotElement.dataset.blockType) { // Creative slot
            blockType = parseInt(slotElement.dataset.blockType);
        } else { // Inventory/Crafting/Furnace slot
            let slotData = null;
            if (slotElement.dataset.slot) {
                const slotId = parseInt(slotElement.dataset.slot);
                const type = slotElement.dataset.type;
                if (type === 'inventory') {
                    slotData = this.state.inventorySlots[slotId - 9];
                } else if (type === 'hotbar') {
                    slotData = this.state.slots[slotId];
                } else if (slotElement.classList.contains('output-slot')) {
                    slotData = this.isCraftingOpen ? this.crafting.craftingOutput : this.crafting.personalCraftingOutput;
                }
            } else if (slotElement.dataset.personalCraftingSlot) {
                const slotId = parseInt(slotElement.dataset.personalCraftingSlot);
                slotData = this.crafting.personalCraftingSlots[slotId];
            } else if (slotElement.dataset.craftingSlot) {
                const slotId = parseInt(slotElement.dataset.craftingSlot);
                slotData = this.crafting.craftingSlots[slotId];
            } else if (slotElement.dataset.furnaceSlot) {
                const slotType = slotElement.dataset.furnaceSlot;
                const furnaceData = this.furnace.getActiveFurnaceData();
                if (furnaceData) {
                    slotData = furnaceData[slotType + 'Slot'];
                }
            }

            if (slotData && slotData.type) {
                blockType = slotData.type;
            }
        }

        if (blockType !== null) {
            const name = BlockTypeNames[blockType] || 'Unknown Item';
            this.tooltipElement.textContent = name;
            this.tooltipElement.classList.remove('hidden');
            this.moveTooltip(e);
        } else {
            this.hideTooltip();
        }
    }

    hideTooltip() {
        this.tooltipElement.classList.add('hidden');
    }

    moveTooltip(e) {
        if (!this.tooltipElement.classList.contains('hidden')) {
            this.tooltipElement.style.left = (e.clientX + 15) + 'px';
            this.tooltipElement.style.top = (e.clientY + 15) + 'px';
        }
    }

    updateCursorElement() {
        this.renderer.updateCursorElement(this.cursorElement, this.state.heldItem);
    }

    toggleInventory() {
        const inventoryScreen = document.getElementById('inventory-screen');
        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            inventoryScreen.classList.remove('hidden');
            document.exitPointerLock();
            this.renderInventory();
        } else {
            inventoryScreen.classList.add('hidden');
            this.returnAllItems();
            if (this.slotHandler.isDragging) {
                this.slotHandler.clearDragState();
            }
            this.state.heldItem = null;
            this.updateCursorElement();
            this.hotbarUI.updateHotbar();
            document.dispatchEvent(new CustomEvent('requestPointerLock'));
        }
    }

    renderInventory() {
        this.renderer.renderInventory();
        this.crafting.updateCraftingOutput(false);
        this.renderPersonalCrafting();
        this.updateCursorElement();
    }

    renderPersonalCrafting() {
        for (let i = 0; i < 4; i++) {
            const slot = document.querySelector(`[data-personal-crafting-slot="${i}"]`);
            if (slot) {
                this.renderer.renderSlot(slot, this.crafting.personalCraftingSlots[i]);
            }
        }

        const outputSlot = document.querySelector('.personal-output-slot');
        if (outputSlot) {
            this.renderer.renderSlot(outputSlot, this.crafting.personalCraftingOutput);
        }
    }

    openCrafting() {
        this.isCraftingOpen = true;
        const craftingScreen = document.getElementById('crafting-screen');
        craftingScreen.classList.remove('hidden');
        document.exitPointerLock();
        this.renderCrafting();
    }

    closeCrafting() {
        this.isCraftingOpen = false;
        const craftingScreen = document.getElementById('crafting-screen');
        craftingScreen.classList.add('hidden');
        this.returnAllItems();
        if (this.slotHandler.isDragging) {
            this.slotHandler.clearDragState();
        }
        this.state.heldItem = null;
        this.updateCursorElement();
        this.hotbarUI.updateHotbar();
        document.dispatchEvent(new CustomEvent('requestPointerLock'));
    }

    returnAllItems() {
        // Return items from 3x3 crafting
        const items3x3 = this.crafting.returnCraftingItems(true);
        for (const item of items3x3) {
            for (let i = 0; i < item.count; i++) {
                this.state.addBlock(item.type);
            }
        }

        // Return items from 2x2 crafting
        const items2x2 = this.crafting.returnCraftingItems(false);
        for (const item of items2x2) {
            for (let i = 0; i < item.count; i++) {
                this.state.addBlock(item.type);
            }
        }

        if (this.state.heldItem) {
            this.state.returnHeldItemToInventory();
        }
    }

    renderCrafting() {
        // Render 3x3 crafting grid
        for (let i = 0; i < 9; i++) {
            const slot = document.querySelector(`[data-crafting-slot="${i}"]`);
            if (slot) {
                this.renderer.renderSlot(slot, this.crafting.craftingSlots[i]);
            }
        }

        this.crafting.updateCraftingOutput(true);

        const outputSlot = document.querySelector('#crafting-output .output-slot');
        if (outputSlot) {
            this.renderer.renderSlot(outputSlot, this.crafting.craftingOutput);
        }

        // Render inventory in crafting screen
        const inventoryGrid = document.getElementById('crafting-inventory-grid');
        const inventoryHotbar = document.getElementById('crafting-inventory-hotbar');

        const inventorySlots = inventoryGrid.querySelectorAll('.inventory-slot');
        inventorySlots.forEach((slot, index) => {
            const slotData = this.state.inventorySlots[index];
            this.renderer.renderSlot(slot, slotData);
        });

        const hotbarSlots = inventoryHotbar.querySelectorAll('.inventory-slot');
        hotbarSlots.forEach((slot, index) => {
            const slotData = this.state.slots[index];
            this.renderer.renderSlot(slot, slotData);

            if (index === this.state.selectedSlot) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    }

    openFurnace(coords) {
        this.isFurnaceOpen = true;
        this.furnace.open(coords);
    }

    closeFurnace() {
        this.isFurnaceOpen = false;
        this.furnace.close();
        if (this.slotHandler.isDragging) {
            this.slotHandler.clearDragState();
        }
        this.state.heldItem = null;
        this.updateCursorElement();
        this.hotbarUI.updateHotbar();
        document.dispatchEvent(new CustomEvent('requestPointerLock'));
    }

    updateFurnace(delta) {
        this.furnace.update(delta);
    }

    onCreativeSlotClick(blockType) {
        const isTool = blockType >= 33 && blockType <= 41;

        if (this.state.heldItem && this.state.heldItem.type === blockType && !isTool) {
            this.state.heldItem.count = Math.min(64, this.state.heldItem.count + 64);
        } else if (!this.state.heldItem) {
            if (isTool) {
                this.state.heldItem = {
                    type: blockType,
                    count: 1,
                    durability: this.crafting.getToolDurability(blockType)
                };
            } else {
                this.state.heldItem = { type: blockType, count: 64, durability: null };
            }
        }
        this.updateCursorElement();
    }

    addBlock(blockType, durability = null) {
        const added = this.state.addBlock(blockType, durability);
        if (added) {
            this.hotbarUI.updateHotbar();
            // If inventory is open, re-render it to show the new item.
            if (this.isOpen) {
                this.renderInventory();
            }
            if (this.isCraftingOpen) {
                this.renderCrafting();
            }
        }
    }

    removeBlock(blockType) {
        const removed = this.state.removeBlock(blockType);
        if (removed) {
            this.hotbarUI.updateHotbar();
            if (this.isOpen) {
                this.renderInventory();
            }
            if (this.isCraftingOpen) {
                this.renderCrafting();
            }
        }
        return removed;
    }

    getSelectedBlock() {
        return this.state.getSelectedBlock();
    }
}

export function preloadInventoryIcons() {
    return new Promise((resolve) => {
        const preloader = document.getElementById('icon-preloader');
        const iconsContainer = document.getElementById('preload-icons');

        const imagesToLoad = Object.values(blockTypeImages);
        let loadedCount = 0;

        const checkAllLoaded = () => {
            loadedCount++;
            if (loadedCount === imagesToLoad.length) {
                setTimeout(() => {
                    preloader.classList.add('hidden');
                    setTimeout(() => {
                        preloader.style.display = 'none';
                        resolve();
                    }, 500);
                }, 1000);
            }
        };

        imagesToLoad.forEach(src => {
            const img = document.createElement('img');
            img.onload = () => checkAllLoaded();
            img.onerror = () => {
                console.warn(`Failed to load ${src}`);
                checkAllLoaded();
            };
            img.src = src;
            iconsContainer.appendChild(img);
        });
    });
}