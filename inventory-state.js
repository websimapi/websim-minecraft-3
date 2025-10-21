const blockTypeImages = {
    1: 'grass top.png',
    2: 'dirt.png',
    3: 'cobblestone.png',
    4: 'snow.png',
    5: 'tree log side.png',
    6: 'leaffs.png',
    7: 'tnt.png',
    8: 'flint_and_steel.png',
    9: 'bedrock.png',
    10: 'plank.png',
    11: null, // Will be generated
    12: null, // Will be generated
    13: null, // Will be generated
    14: 'glass.png',
    20: 'crafting table top.png',
    21: 'stone.png',
    24: 'sand.png',
    26: 'gravel.png',
    32: 'iron block natural spawn.png',
    33: 'wooden pickaxe.png',
    34: 'stone pickaxe.png',
    35: 'iron pickaxe.png',
    36: 'wood axe.png',
    37: 'stone axe.png',
    38: 'iron axe.png',
    39: 'wooden shovel.png',
    40: 'stone shovel.png',
    41: 'iron shovel.png',
    42: 'stick.png',
    43: 'iron ingot drop (1).png',
    44: 'furnace front unlit.png',
    46: 'Coal ore.png',
    47: 'Coal item.png',
};

// Create a global image cache
const imageCache = {};

// Preload all images including all textures
const allImages = [
    'grass top.png',
    'grass side.png',
    'dirt.png',
    'cobblestone.png',
    'stone.png',
    'snow.png',
    'tree log side.png',
    'tree log top or bottom.png',
    'leaffs.png',
    'tnt.png',
    'tnt bottom or top.png',
    'flint_and_steel.png',
    'boom.png',
    'plank.png',
    'crafting table bottom.png',
    'crafting table side.png',
    'crafting table top.png',
    'bedrock.png',
    'boom.png',
    'furnace front unlit.png',
    'furnace front lit.png',
    'flame icon furnace ui.png'
];

// Function to create slab icon from existing texture by cutting in half
function createSlabIcon(sourceImagePath) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d'); 
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            // Clear canvas
            ctx.clearRect(0, 0, 16, 16);
            // Draw full texture
            ctx.drawImage(img, 0, 0, 16, 16);
            // Cover top half with black to create "cut in half" effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            ctx.clearRect(0, 0, 16, 8);
            
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
        };
        img.onerror = () => {
            console.error('Failed to load slab texture:', sourceImagePath);
            resolve(sourceImagePath);
        };
        img.src = sourceImagePath;
    });
}

// Generate slab icons on load
const slabIconsPromise = Promise.all([
    createSlabIcon('cobblestone.png'),
    createSlabIcon('tree log side.png'),
    createSlabIcon('plank.png')
]).then(([stoneSlabIcon, logSlabIcon, plankSlabIcon]) => {
    blockTypeImages[11] = stoneSlabIcon;
    blockTypeImages[12] = logSlabIcon;
    blockTypeImages[13] = plankSlabIcon;
});

allImages.forEach(src => {
    const img = new Image();
    img.onload = () => {
        imageCache[src] = src;
    };
    img.src = src;
});

export { blockTypeImages, imageCache, allImages, slabIconsPromise }

export class InventoryState {
    constructor() {
        this.slots = Array(9).fill(null).map(() => ({ type: null, count: 0, durability: null }));
        this.inventorySlots = Array(27).fill(null).map(() => ({ type: null, count: 0, durability: null }));
        this.selectedSlot = 0;
        this.heldItem = null;
        this.draggedSlots = new Set();
        this.isRightClickHold = false;

        // Add starting items
        this.slots[0] = { type: 7, count: 64, durability: null }; // TNT
        this.slots[1] = { type: 8, count: 1, durability: null }; // Flint and Steel
    }

    getSlotData(index, isHotbar = true) {
        return isHotbar ? this.slots[index] : this.inventorySlots[index];
    }

    setSlotData(index, data, isHotbar = true) {
        if (isHotbar) {
            this.slots[index] = data;
        } else {
            this.inventorySlots[index] = data;
        }
    }

    addItemsToInventory(items, preferHotbar = false) {
        let { type, count, durability } = items;
        if (count === 0) return;

        const inventoryAreas = preferHotbar
            ? [this.inventorySlots, this.slots]
            : [this.slots, this.inventorySlots];

        for (const area of inventoryAreas) {
            // Tools don't stack
            if (durability !== null && durability !== undefined) {
                // Find an empty slot
                for (const slot of area) {
                    if (slot.type === null || slot.count === 0) {
                        slot.type = type;
                        slot.count = 1;
                        slot.durability = durability;
                        count--;
                        if (count === 0) return;
                    }
                }
            } else {
                // Add to existing stacks
                for (const slot of area) {
                    if (slot.type === type && slot.count < 64 && slot.durability === null) {
                        const canAdd = 64 - slot.count;
                        const toAdd = Math.min(canAdd, count);
                        slot.count += toAdd;
                        count -= toAdd;
                        if (count === 0) return;
                    }
                }
                // Add to new stacks
                for (const slot of area) {
                    if (slot.type === null || slot.count === 0) {
                        slot.type = type;
                        slot.count = Math.min(64, count);
                        slot.durability = null;
                        count -= slot.count;
                        if (count === 0) return;
                    }
                }
            }
        }
    }

    addBlock(blockType, durability = null) {
        // Don't collect leaves or flint and steel
        if (blockType === 6 || blockType === 8) return;
        
        // Convert top slabs to bottom slabs for inventory (15->11, 16->12, 17->13)
        if (blockType >= 15 && blockType <= 17) {
            blockType = blockType - 4;
        }
        
        // Convert sideways logs to regular logs for inventory
        if (blockType === 18 || blockType === 19) {
            blockType = 5;
        }

        // Tools don't stack
        const isTool = durability !== null && durability !== undefined;

        if (isTool) {
            // Find empty slot for tool
            for (let i = 0; i < this.slots.length; i++) {
                if (this.slots[i].type === null || this.slots[i].count === 0) {
                    this.slots[i].type = blockType;
                    this.slots[i].count = 1;
                    this.slots[i].durability = durability;
                    return true;
                }
            }
            
            for (let i = 0; i < this.inventorySlots.length; i++) {
                if (this.inventorySlots[i].type === null || this.inventorySlots[i].count === 0) {
                    this.inventorySlots[i].type = blockType;
                    this.inventorySlots[i].count = 1;
                    this.inventorySlots[i].durability = durability;
                    return true;
                }
            }
        } else {
            // Try to add to existing stack
            for (let i = 0; i < this.slots.length; i++) {
                if (this.slots[i].type === blockType && this.slots[i].count < 64 && this.slots[i].durability === null) {
                    this.slots[i].count++;
                    return true;
                }
            }
            
            // Try to add to existing stacks in inventory
            for (let i = 0; i < this.inventorySlots.length; i++) {
                if (this.inventorySlots[i].type === blockType && this.inventorySlots[i].count < 64 && this.inventorySlots[i].durability === null) {
                    this.inventorySlots[i].count++;
                    return true;
                }
            }

            // Try to add to empty slot in hotbar
            for (let i = 0; i < this.slots.length; i++) {
                if (this.slots[i].type === null || this.slots[i].count === 0) {
                    this.slots[i].type = blockType;
                    this.slots[i].count = 1;
                    this.slots[i].durability = null;
                    return true;
                }
            }
            
            // Try to add to empty slot in inventory
            for (let i = 0; i < this.inventorySlots.length; i++) {
                if (this.inventorySlots[i].type === null || this.inventorySlots[i].count === 0) {
                    this.inventorySlots[i].type = blockType;
                    this.inventorySlots[i].count = 1;
                    this.inventorySlots[i].durability = null;
                    return true;
                }
            }
        }

        return false;
    }

    removeBlock(blockType) {
        const slot = this.slots[this.selectedSlot];
        if (slot.type === blockType && slot.count > 0) {
            slot.count--;
            if (slot.count === 0) {
                slot.type = null;
            }
            return true;
        }
        return false;
    }

    getSelectedBlock() {
        return this.slots[this.selectedSlot];
    }

    returnHeldItemToInventory() {
        if (!this.heldItem) return;

        // Try to add to existing stacks first
        for (let i = 0; i < 36; i++) {
            const slotData = i < 9 ? this.slots[i] : this.inventorySlots[i - 9];
            if (slotData.type === this.heldItem.type && slotData.count < 64) {
                const toAdd = Math.min(64 - slotData.count, this.heldItem.count);
                slotData.count += toAdd;
                this.heldItem.count -= toAdd;
                if (this.heldItem.count === 0) {
                    this.heldItem = null;
                    return;
                }
            }
        }

        // Add to empty slots
        for (let i = 0; i < 36; i++) {
            const slotData = i < 9 ? this.slots[i] : this.inventorySlots[i - 9];
            if (slotData.type === null || slotData.count === 0) {
                slotData.type = this.heldItem.type;
                slotData.count = this.heldItem.count;
                this.heldItem = null;
                return;
            }
        }
    }
}