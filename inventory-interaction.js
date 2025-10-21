import { DragHandler } from './inventory-drag.js';
import { ClickHandler } from './inventory-click.js';
import { TransferHandler } from './inventory-transfer.js';

export class SlotInteractionHandler {
    constructor(inventoryState, craftingSystem, renderer, hotbarUI, inventoryUI, furnace) {
        this.state = inventoryState;
        this.crafting = craftingSystem;
        this.renderer = renderer;
        this.hotbarUI = hotbarUI;
        this.inventoryUI = inventoryUI;
        this.furnace = furnace;
        
        this.dragHandler = new DragHandler(inventoryState, () => this.update());
        this.clickHandler = new ClickHandler(inventoryState, () => this.update());
        this.transferHandler = new TransferHandler(inventoryState);
        
        this.isMouseDown = false;
        this.mouseButton = -1;
    }

    get isDragging() {
        return this.dragHandler.isDragging;
    }

    clearDragState() {
        this.isMouseDown = false;
        this.mouseButton = -1;
        this.dragHandler.clearDrag();
    }

    handleGlobalMouseDown(e) {
        if (!this.inventoryUI.isOpen && !this.inventoryUI.isCraftingOpen && !this.inventoryUI.isFurnaceOpen) return;
        this.isMouseDown = true;
        this.mouseButton = e.button;
    }

    handleGlobalMouseUp(e) {
        if (!this.isMouseDown) return;
        this.clearDragState();
        this.update();
    }

    handleGlobalMouseMove(e) {
        if (!this.isMouseDown) return;
        
        if (!this.dragHandler.isDragging && this.state.heldItem) {
            this.dragHandler.startDrag(this.state.heldItem);
        }
    }

    handleSlotMouseDown(e, slotId, type, isCrafting, is3x3, isOutput) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleSlotMouseUp(e, slotId, type, isCrafting, is3x3, isOutput) {
        if (this.dragHandler.isDragging) return;
        e.preventDefault();
        e.stopPropagation();

        if (isOutput) {
            if (type.startsWith('furnace')) {
                this.handleFurnaceOutputClick(e);
            } else {
                this.handleCraftingOutputClick(e, is3x3);
            }
        } else {
            this.handleSlotClick(e, slotId, type, isCrafting, is3x3);
        }
    }

    handleSlotHover(e, slotId, type, isCrafting, is3x3, isOutput) {
        if (!this.dragHandler.isDragging || !this.dragHandler.dragStartItem || isOutput) return;
        
        const slotData = this.getSlotData(slotId, type, isCrafting, is3x3);
        if (!slotData) return;

        let changed = false;
        if (this.mouseButton === 2) {
            changed = this.dragHandler.handleRightClickDrag(slotData);
        } else if (this.mouseButton === 0) {
            changed = this.dragHandler.handleLeftClickDrag(slotData, e.currentTarget);
        }
        
        if (changed && isCrafting) {
            this.crafting.updateCraftingOutput(is3x3);
        }
        if (changed) this.update();
    }

    handleSlotClick(e, slotIndex, type, isCrafting = false, is3x3 = false) {
        const isRightClick = e.button === 2;
        const isShiftClick = e.shiftKey;
        
        const slotData = this.getSlotData(slotIndex, type, isCrafting, is3x3);
        if (!slotData) return;

        const action = this.clickHandler.handleSlotClick(slotData, isRightClick, isShiftClick);
        
        if (action === 'quick_transfer') {
            if (!isCrafting && !type.startsWith('furnace')) {
                this.transferHandler.quickTransfer(slotData);
            }
        }
        
        if (isCrafting) this.crafting.updateCraftingOutput(is3x3);
        if (type.startsWith('furnace')) this.furnace.render();
        
        this.update();
    }

    handleFurnaceOutputClick(e) {
        const furnaceData = this.furnace.getActiveFurnaceData();
        if (!furnaceData) return;
        
        if (this.transferHandler.handleOutputClick(furnaceData.outputSlot, e.shiftKey)) {
            this.update();
        }
    }

    handleCraftingOutputClick(e, is3x3 = true) {
        const output = is3x3 ? this.crafting.craftingOutput : this.crafting.personalCraftingOutput;
        if (output.type === null || output.count === 0) return;

        const isShiftClick = e.shiftKey;
        const isTool = output.durability !== null && output.durability !== undefined;

        if (isShiftClick) {
            const recipe = this.crafting.checkRecipe(is3x3 ? this.crafting.craftingSlots : this.crafting.personalCraftingSlots, is3x3);
            if (!recipe) return;

            if (isTool) {
                this.state.addItemsToInventory({ type: output.type, count: 1, durability: output.durability });
                this.crafting.consumeRecipe(is3x3);
            } else {
                let maxCrafts = Infinity;
                const craftingSlots = is3x3 ? this.crafting.craftingSlots : this.crafting.personalCraftingSlots;
                
                const ingredientCounts = {};
                for(const item of recipe.consumes) {
                    ingredientCounts[item.slot] = (ingredientCounts[item.slot] || 0) + item.amount;
                }

                for(const slotIndex in ingredientCounts) {
                    const requiredAmount = ingredientCounts[slotIndex];
                    const slotData = craftingSlots[slotIndex];
                    maxCrafts = Math.min(maxCrafts, Math.floor(slotData.count / requiredAmount));
                }

                if (maxCrafts === 0 || maxCrafts === Infinity) return;

                const totalCraftedCount = recipe.count * maxCrafts;
                const itemsToPlace = { type: recipe.output, count: totalCraftedCount };

                for(const slotIndex in ingredientCounts) {
                    const requiredAmount = ingredientCounts[slotIndex];
                    const slotData = craftingSlots[slotIndex];
                    slotData.count -= requiredAmount * maxCrafts;
                    if (slotData.count <= 0) {
                        slotData.type = null;
                        slotData.count = 0;
                    }
                }

                this.state.addItemsToInventory(itemsToPlace);
            }
        } else {
            if (this.state.heldItem === null) {
                this.state.heldItem = { type: output.type, count: output.count, durability: output.durability };
                this.crafting.consumeRecipe(is3x3);
            } else if (this.state.heldItem.type === output.type && !isTool && this.state.heldItem.count + output.count <= 64) {
                this.state.heldItem.count += output.count;
                this.crafting.consumeRecipe(is3x3);
            }
        }

        this.update();
    }
    
    getSlotData(slotId, type, isCrafting, is3x3) {
        if (isCrafting) {
            return is3x3 ? this.crafting.craftingSlots[slotId] : this.crafting.personalCraftingSlots[slotId];
        } else if (type.startsWith('furnace')) {
            const furnaceData = this.furnace.getActiveFurnaceData();
            if (!furnaceData) return null;
            if (type === 'furnace_input') return furnaceData.inputSlot;
            if (type === 'furnace_fuel') return furnaceData.fuelSlot;
            if (type === 'furnace_output') return furnaceData.outputSlot;
            return null;
        } else if (type === 'inventory') {
            return this.state.inventorySlots[slotId - 9];
        } else {
            return this.state.slots[slotId];
        }
    }

    update() {
        if (this.inventoryUI && this.inventoryUI.isCraftingOpen) {
            this.crafting.updateCraftingOutput(true);
            this.inventoryUI.renderCrafting();
        } else if (this.inventoryUI && this.inventoryUI.isOpen) {
            this.crafting.updateCraftingOutput(false);
            this.inventoryUI.renderInventory();
        } else if (this.inventoryUI && this.inventoryUI.isFurnaceOpen) {
            this.furnace.render();
        }
        
        this.hotbarUI.updateHotbar();
        this.renderer.updateCursorElement(
            document.querySelector('.inventory-cursor'),
            this.state.heldItem
        );
    }
}