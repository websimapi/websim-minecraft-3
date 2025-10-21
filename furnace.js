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
        this.slotHandler = null;
        this.activeFurnaceCoords = null;
        this.furnaces = new Map();
        
        this.furnaceDataTemplate = {
            inputSlot: { type: null, count: 0, durability: null },
            fuelSlot: { type: null, count: 0, durability: null },
            outputSlot: { type: null, count: 0, durability: null },
            burnTime: 0,
            maxBurnTime: 0,
            cookTime: 0,
            maxCookTime: 0
        };
    }

    setSlotHandler(handler) {
        this.slotHandler = handler;
    }

    getFurnaceData(coords) {
        const key = `${coords.x},${coords.y},${coords.z}`;
        return this.furnaces.has(key) ? this.furnaces.get(key) : 
               (this.furnaces.set(key, JSON.parse(JSON.stringify(this.furnaceDataTemplate))), this.furnaces.get(key));
    }
    
    getActiveFurnaceData() {
        return this.activeFurnaceCoords ? this.getFurnaceData(this.activeFurnaceCoords) : null;
    }

    setupFurnaceUI() {
        ['furnace-input-slot', 'furnace-fuel-slot'].forEach((id, i) => {
            const slot = document.getElementById(id);
            const type = i ? 'furnace_fuel' : 'furnace_input';
            ['mousedown', 'mouseup', 'mouseover', 'mouseleave'].forEach((evt, j) => {
                const handler = j === 0 ? this.slotHandler.handleSlotMouseDown : 
                               j === 1 ? this.slotHandler.handleSlotMouseUp : 
                               j === 2 ? this.slotHandler.handleSlotHover : 
                               e => e.currentTarget.classList.remove('drag-over');
                slot.addEventListener(evt, (e) => handler.call(this.slotHandler, e, 0, type, !1, !1, !1));
            });
        });
        
        const outputSlot = document.getElementById('furnace-output-slot');
        ['mousedown', 'mouseup'].forEach((evt, i) => {
            const handler = i ? this.slotHandler.handleSlotMouseUp : this.slotHandler.handleSlotMouseDown;
            outputSlot.addEventListener(evt, (e) => handler.call(this.slotHandler, e, 0, 'furnace_output', !1, !1, !0));
        });
        
        [[27, 0], [27, 1], [9, 2]].forEach(([count, offset], idx) => {
            const container = document.getElementById(idx < 2 ? `furnace-inventory-${idx ? 'hotbar' : 'grid'}` : 'furnace-inventory-grid');
            for (let i = 0; i < count; i++) {
                const slot = document.createElement('div');
                const slotId = i + (idx === 0 ? 9 : 0);
                const isHotbar = idx === 1;
                slot.className = `inventory-slot${isHotbar ? ' hotbar-inventory-slot' : ''}`;
                slot.dataset.slot = slotId;
                slot.dataset.type = isHotbar ? 'hotbar' : 'inventory';
                
                ['slot-content', 'slot-count'].forEach(cls => {
                    const el = document.createElement(cls === 'slot-count' ? 'span' : 'div');
                    el.className = cls;
                    slot.appendChild(el);
                });
                
                if (isHotbar) {
                    const num = document.createElement('span');
                    num.className = 'slot-number';
                    num.textContent = i + 1;
                    slot.appendChild(num);
                }
                
                ['mousedown', 'mouseup', 'mouseover', 'mouseleave'].forEach((evt, j) => {
                    const handler = j === 0 ? this.slotHandler.handleSlotMouseDown : 
                                   j === 1 ? this.slotHandler.handleSlotMouseUp : 
                                   j === 2 ? this.slotHandler.handleSlotHover : 
                                   e => e.currentTarget.classList.remove('drag-over');
                    slot.addEventListener(evt, (e) => handler.call(this.slotHandler, e, slotId, 'inventory', !1, !1, !1));
                });
                
                container.appendChild(slot);
            }
        });
    }

    open(coords) {
        this.activeFurnaceCoords = coords;
        document.getElementById('furnace-screen').classList.remove('hidden');
        document.exitPointerLock();
        this.render();
    }

    close() {
        document.getElementById('furnace-screen').classList.add('hidden');
        this.activeFurnaceCoords = null;
        this.state.heldItem && this.state.returnHeldItemToInventory();
    }

    returnItems(furnaceData = this.getActiveFurnaceData()) {
        if (!furnaceData) return;
        
        [furnaceData.inputSlot, furnaceData.fuelSlot, furnaceData.outputSlot].forEach(slot => {
            if (slot.type !== null && slot.count > 0) {
                this.state.addItemsToInventory({ type: slot.type, count: slot.count, durability: slot.durability });
                slot.type = null;
                slot.count = 0;
                slot.durability = null;
            }
        });
    }

    render() {
        const fd = this.getActiveFurnaceData();
        if (!fd) return;
        
        this.renderer.renderSlot(document.getElementById('furnace-input-slot'), fd.inputSlot);
        this.renderer.renderSlot(document.getElementById('furnace-fuel-slot'), fd.fuelSlot);
        this.renderer.renderSlot(document.getElementById('furnace-output-slot'), fd.outputSlot);
        
        document.querySelector('.flame-icon').style.clipPath = fd.burnTime > 0 && fd.maxBurnTime > 0 
            ? `inset(${(1 - (fd.burnTime / fd.maxBurnTime)) * 100}% 0 0 0)` 
            : 'inset(100% 0 0 0)';
            
        document.querySelector('.furnace-progress').style.clipPath = fd.cookTime > 0 && fd.maxCookTime > 0 
            ? `inset(0 ${(1 - (fd.cookTime / fd.maxCookTime)) * 100}% 0 0)` 
            : 'inset(0 100% 0 0)';
            
        document.getElementById('furnace-inventory-grid').querySelectorAll('.inventory-slot').forEach((slot, idx) => 
            this.renderer.renderSlot(slot, this.state.inventorySlots[idx]));
            
        document.getElementById('furnace-inventory-hotbar').querySelectorAll('.inventory-slot').forEach((slot, idx) => {
            this.renderer.renderSlot(slot, this.state.slots[idx]);
            idx === this.state.selectedSlot ? slot.classList.add('selected') : slot.classList.remove('selected');
        });
    }

    update(delta) {
        this.furnaces.forEach((fd) => this.updateSingleFurnace(fd, delta));
        this.isScreenOpen() && this.render();
    }

    updateSingleFurnace(fd, delta) {
        const inp = fd.inputSlot, fuel = fd.fuelSlot, out = fd.outputSlot;
        const recipe = smeltingRecipes[inp.type];
        
        let burning = fd.burnTime > 0;
        const canSmelt = recipe && inp.count > 0 && (out.type === null || out.type === recipe.output && out.count < 64);
        
        fd.maxCookTime = recipe?.cookTime || 0;
        fd.cookTime = canSmelt ? fd.cookTime : Math.max(0, fd.cookTime - delta * 2);
        
        burning ? fd.burnTime = Math.max(0, fd.burnTime - delta) : 
            (canSmelt && fuel.type !== null && (fd.maxBurnTime = fuelSources[fuel.type] || 0) && 
             fd.maxBurnTime > 0 && (fd.burnTime = fd.maxBurnTime, fuel.count--, fuel.count <= 0 && (fuel.type = null), burning = !0));
        
        canSmelt && burning && ((fd.cookTime += delta) >= fd.maxCookTime) && 
            (fd.cookTime = 0, inp.count--, inp.count <= 0 && (inp.type = null), 
             out.type === null ? (out.type = recipe.output, out.count = 1) : out.count++);
        
        const isBurning = fd.burnTime > 0;
        isBurning !== burning && this.world && this.updateWorldBlockState(fd, isBurning);
    }

    updateWorldBlockState(fd, isBurning) {
        let coords = null;
        for (const [key, data] of this.furnaces.entries()) {
            if (data === fd) {
                const [x, y, z] = key.split(',').map(Number);
                coords = { x, y, z };
                break;
            }
        }
        
        coords && this.world.setBlockAt(coords.x, coords.y, coords.z, isBurning ? BlockType.FURNACE_LIT : BlockType.FURNACE);
    }

    removeFurnaceState(coords) {
        const key = `${coords.x},${coords.y},${coords.z}`;
        const fd = this.getFurnaceData(coords);
        
        this.activeFurnaceCoords && this.activeFurnaceCoords.x === coords.x && this.activeFurnaceCoords.y === coords.y && this.activeFurnaceCoords.z === coords.z && 
            (this.returnItems(fd), this.close());
            
        this.furnaces.delete(key);
    }

    isScreenOpen() {
        return !document.getElementById('furnace-screen').classList.contains('hidden');
    }
}