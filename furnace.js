import { fuelSources, BlockType } from './blocks.js';

const smeltingRecipes = {
    [BlockType.IRON_ORE]: {
        output: BlockType.IRON_INGOT,
        cookTime: 10
    },
    [BlockType.COAL_ORE]: {
        output: BlockType.COAL,
        cookTime: 10
    }
};

export class Furnace {
    constructor(inventoryState, renderer, world) {
        this.state = inventoryState;
        this.renderer = renderer;
        this.world = world;
        this.slotHandler = null; // Will be set by InventoryUI
        this.activeFurnaceCoords = null;
        this.furnaces = new Map(); // Stores furnace data by "x,y,z" key

        // This is now a template for new furnaces
        this.furnaceDataTemplate = {
            inputSlot: { type: null, count: 0, durability: null },
            fuelSlot: { type: null, count: 0, durability: null },
            outputSlot: { type: null, count: 0, durability: null },
            burnTime: 0,
            maxBurnTime: 0,
            cookTime: 0,
            maxCookTime: 0 // Will be set by recipe
        };
    }

    setSlotHandler(handler) {
        this.slotHandler = handler;
    }

    getFurnaceData(coords) {
        const key = `${coords.x},${coords.y},${coords.z}`;
        if (!this.furnaces.has(key)) {
            // Create a new furnace instance from the template
            this.furnaces.set(key, JSON.parse(JSON.stringify(this.furnaceDataTemplate)));
        }
        return this.furnaces.get(key);
    }
    
    getActiveFurnaceData() {
        if (!this.activeFurnaceCoords) return null;
        return this.getFurnaceData(this.activeFurnaceCoords);
    }

    setupFurnaceUI() {
        const inputSlot = document.getElementById('furnace-input-slot');
        const fuelSlot = document.getElementById('furnace-fuel-slot');
        const outputSlot = document.getElementById('furnace-output-slot');

        // Use the main slot handler for consistent behavior
        inputSlot.addEventListener('mousedown', (e) => this.slotHandler.handleSlotMouseDown(e, 0, 'furnace_input', false, false, false));
        inputSlot.addEventListener('mouseup', (e) => this.slotHandler.handleSlotMouseUp(e, 0, 'furnace_input', false, false, false));
        inputSlot.addEventListener('mouseover', (e) => this.slotHandler.handleSlotHover(e, 0, 'furnace_input', false, false));
        inputSlot.addEventListener('mouseleave', (e) => e.currentTarget.classList.remove('drag-over'));

        fuelSlot.addEventListener('mousedown', (e) => this.slotHandler.handleSlotMouseDown(e, 0, 'furnace_fuel', false, false, false));
        fuelSlot.addEventListener('mouseup', (e) => this.slotHandler.handleSlotMouseUp(e, 0, 'furnace_fuel', false, false, false));
        fuelSlot.addEventListener('mouseover', (e) => this.slotHandler.handleSlotHover(e, 0, 'furnace_fuel', false, false));
        fuelSlot.addEventListener('mouseleave', (e) => e.currentTarget.classList.remove('drag-over'));

        outputSlot.addEventListener('mousedown', (e) => this.slotHandler.handleSlotMouseDown(e, 0, 'furnace_output', false, false, true));
        outputSlot.addEventListener('mouseup', (e) => this.slotHandler.handleSlotMouseUp(e, 0, 'furnace_output', false, false, true));

        // Setup furnace inventory
        const furnaceInventoryGrid = document.getElementById('furnace-inventory-grid');
        const furnaceInventoryHotbar = document.getElementById('furnace-inventory-hotbar');

        for (let i = 0; i < 27; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            const slotId = i + 9;
            slot.dataset.slot = slotId;
            slot.dataset.type = 'inventory'; // Add type for slot handler

            const content = document.createElement('div');
            content.className = 'slot-content';
            slot.appendChild(content);

            const count = document.createElement('span');
            count.className = 'slot-count';
            slot.appendChild(count);

            slot.addEventListener('mousedown', (e) => this.slotHandler.handleSlotMouseDown(e, slotId, 'inventory', false, false, false));
            slot.addEventListener('mouseup', (e) => this.slotHandler.handleSlotMouseUp(e, slotId, 'inventory', false, false, false));
            slot.addEventListener('mouseover', (e) => this.slotHandler.handleSlotHover(e, slotId, 'inventory', false, false));
            slot.addEventListener('mouseleave', (e) => e.currentTarget.classList.remove('drag-over'));

            furnaceInventoryGrid.appendChild(slot);
        }

        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot hotbar-inventory-slot';
            const slotId = i;
            slot.dataset.slot = i;
            slot.dataset.type = 'hotbar'; // Add type for slot handler

            const content = document.createElement('div');
            content.className = 'slot-content';
            slot.appendChild(content);

            const count = document.createElement('span');
            count.className = 'slot-count';
            slot.appendChild(count);

            const number = document.createElement('span');
            number.className = 'slot-number';
            number.textContent = i + 1;
            slot.appendChild(number);

            slot.addEventListener('mousedown', (e) => this.slotHandler.handleSlotMouseDown(e, slotId, 'hotbar', false, false, false));
            slot.addEventListener('mouseup', (e) => this.slotHandler.handleSlotMouseUp(e, slotId, 'hotbar', false, false, false));
            slot.addEventListener('mouseover', (e) => this.slotHandler.handleSlotHover(e, slotId, 'hotbar', false, false));
            slot.addEventListener('mouseleave', (e) => e.currentTarget.classList.remove('drag-over'));

            furnaceInventoryHotbar.appendChild(slot);
        }
    }

    handleFurnaceSlotClick(e, slotType) {
        // This logic is now fully handled by inventory-slots.js
        // This function can be removed if not called elsewhere.
        // For safety, I'll leave it but it should be deprecated.
    }

    open(coords) {
        this.activeFurnaceCoords = coords;
        const furnaceScreen = document.getElementById('furnace-screen');
        furnaceScreen.classList.remove('hidden');
        document.exitPointerLock();
        this.render();
    }

    close() {
        const furnaceScreen = document.getElementById('furnace-screen');
        furnaceScreen.classList.add('hidden');
        
        // Don't return items, just clear the active coords.
        this.activeFurnaceCoords = null;
        
        // Return any held item to inventory to prevent item duplication/loss
        if (this.state.heldItem) {
            this.state.returnHeldItemToInventory();
        }
    }

    returnItems(furnaceData = this.getActiveFurnaceData()) {
        if (!furnaceData) return;

        const slots = [furnaceData.inputSlot, furnaceData.fuelSlot, furnaceData.outputSlot];
        for (const slot of slots) {
            if (slot.type !== null && slot.count > 0) {
                // Use addItemsToInventory for efficient stack handling
                this.state.addItemsToInventory({ type: slot.type, count: slot.count, durability: slot.durability });
                
                slot.type = null;
                slot.count = 0;
                slot.durability = null;
            }
        }
    }

    render() {
        const furnaceData = this.getActiveFurnaceData();
        if (!furnaceData) return;

        const inputSlot = document.getElementById('furnace-input-slot');
        const fuelSlot = document.getElementById('furnace-fuel-slot');
        const outputSlot = document.getElementById('furnace-output-slot');

        this.renderer.renderSlot(inputSlot, furnaceData.inputSlot);
        this.renderer.renderSlot(fuelSlot, furnaceData.fuelSlot);
        this.renderer.renderSlot(outputSlot, furnaceData.outputSlot);

        // Update flame icon
        const flameIcon = document.querySelector('.flame-icon');
        if (furnaceData.burnTime > 0 && furnaceData.maxBurnTime > 0) {
            const fuelPercent = (furnaceData.burnTime / furnaceData.maxBurnTime);
            // Height of the icon is based on how much burn time is left.
            // A clip-path `inset` defines top, right, bottom, left. We want to clip from the top down.
            const clipTopPercent = (1.0 - fuelPercent) * 100;
            flameIcon.style.clipPath = `inset(${clipTopPercent}% 0 0 0)`;
        } else {
            flameIcon.style.clipPath = `inset(100% 0 0 0)`;
        }

        // Update progress bar
        const progressBar = document.querySelector('.furnace-progress');
        if (furnaceData.cookTime > 0 && furnaceData.maxCookTime > 0) {
            const cookPercent = (furnaceData.cookTime / furnaceData.maxCookTime) * 100;
            progressBar.style.clipPath = `inset(0 ${100 - cookPercent}% 0 0)`;
        } else {
            progressBar.style.clipPath = `inset(0 100% 0 0)`;
        }

        // Render inventory
        const inventoryGrid = document.getElementById('furnace-inventory-grid');
        const inventoryHotbar = document.getElementById('furnace-inventory-hotbar');

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

    update(delta) {
        // Update all active furnaces
        for (const [key, furnaceData] of this.furnaces.entries()) {
            this.updateSingleFurnace(furnaceData, delta);
        }

        // If a furnace UI is open, re-render it
        if (this.isScreenOpen()) {
            this.render();
        }
    }

    updateSingleFurnace(furnaceData, delta) {
        const inputItem = furnaceData.inputSlot;
        const fuelItem = furnaceData.fuelSlot;
        const outputItem = furnaceData.outputSlot;

        const recipe = smeltingRecipes[inputItem.type];
        
        let wasBurning = furnaceData.burnTime > 0;
        
        let isBurning = furnaceData.burnTime > 0;
        let canSmelt = false;

        if (recipe) {
            furnaceData.maxCookTime = recipe.cookTime;
            const canOutput = (outputItem.type === null || (outputItem.type === recipe.output && outputItem.count < 64));
            if (inputItem.count > 0 && canOutput) {
                canSmelt = true;
            }
        } else {
            furnaceData.maxCookTime = 0;
            furnaceData.cookTime = 0;
        }

        // --- Handle Fuel ---
        if (isBurning) {
            furnaceData.burnTime = Math.max(0, furnaceData.burnTime - delta);
        } else if (canSmelt && fuelItem.type !== null) {
            const fuelDuration = fuelSources[fuelItem.type];
            if (fuelDuration > 0) {
                furnaceData.maxBurnTime = fuelDuration;
                furnaceData.burnTime = fuelDuration;
                fuelItem.count--;
                if (fuelItem.count <= 0) {
                    fuelItem.type = null;
                }
                isBurning = true;
            }
        }

        // --- Handle Smelting ---
        if (canSmelt && isBurning) {
            furnaceData.cookTime += delta;

            if (furnaceData.cookTime >= furnaceData.maxCookTime) {
                furnaceData.cookTime = 0;

                inputItem.count--;
                if (inputItem.count <= 0) {
                    inputItem.type = null;
                }

                if (outputItem.type === null) {
                    outputItem.type = recipe.output;
                    outputItem.count = 1;
                } else {
                    outputItem.count++;
                }
            }
        } else {
             // If smelting is interrupted, reset progress
             if (furnaceData.cookTime > 0) {
                furnaceData.cookTime = Math.max(0, furnaceData.cookTime - delta * 2);
             }
        }

        // DYNAMIC BLOCK UPDATE
        if (isBurning !== wasBurning && this.world) {
            this.updateWorldBlockState(furnaceData, isBurning);
        }
    }

    updateWorldBlockState(furnaceData, isBurning) {
        // Find the coordinates associated with this furnaceData instance
        let coords = null;
        for (const [key, data] of this.furnaces.entries()) {
            if (data === furnaceData) {
                const [x, y, z] = key.split(',').map(Number);
                coords = { x, y, z };
                break;
            }
        }
        
        if (!coords) return;
        
        const newBlockType = isBurning ? BlockType.FURNACE_LIT : BlockType.FURNACE;
        
        // Pass to world to update the block type while preserving rotation metadata
        this.world.setBlockAt(coords.x, coords.y, coords.z, newBlockType);
    }

    removeFurnaceState(coords) {
        const key = `${coords.x},${coords.y},${coords.z}`;
        
        // If the furnace UI is open on this block, close it and return contents.
        if (this.activeFurnaceCoords && this.activeFurnaceCoords.x === coords.x && this.activeFurnaceCoords.y === coords.y && this.activeFurnaceCoords.z === coords.z) {
            const furnaceData = this.getActiveFurnaceData();
            if (furnaceData) {
                 this.returnItems(furnaceData);
            }
            this.close();
        } else if (this.furnaces.has(key)) {
            // If UI is not open, but block is broken, return contents.
            const furnaceData = this.furnaces.get(key);
            this.returnItems(furnaceData);
        }
        
        this.furnaces.delete(key);
    }

    isScreenOpen() {
        const furnaceScreen = document.getElementById('furnace-screen');
        return !furnaceScreen.classList.contains('hidden');
    }
}