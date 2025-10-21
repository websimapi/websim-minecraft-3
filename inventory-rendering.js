import { blockTypeImages } from './inventory-state.js';
import { BlockType } from './blocks.js';

export class InventoryRenderer {
    constructor(inventoryState) {
        this.state = inventoryState;
    }

    renderInventory() {
        const inventoryGrid = document.getElementById('inventory-grid');
        const inventoryHotbar = document.getElementById('inventory-hotbar');

        const inventorySlots = inventoryGrid.querySelectorAll('.inventory-slot');
        inventorySlots.forEach((slot, index) => {
            const slotData = this.state.inventorySlots[index];
            this.renderSlot(slot, slotData);
        });

        const hotbarSlots = inventoryHotbar.querySelectorAll('.inventory-slot');
        hotbarSlots.forEach((slot, index) => {
            const slotData = this.state.slots[index];
            this.renderSlot(slot, slotData);

            if (index === this.state.selectedSlot) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    }

    renderSlot(slot, slotData) {
        const content = slot.querySelector('.slot-content');
        const count = slot.querySelector('.slot-count');

        // Clear previous placeholder classes
        content.className = 'slot-content';
        content.style.backgroundImage = '';
        slot.dataset.itemId = '';

        if (slotData && slotData.type !== null && slotData.count > 0) {
            slot.dataset.itemId = slotData.type;
            const imageSrc = blockTypeImages[slotData.type];
            if (imageSrc) {
                content.style.backgroundImage = `url('${imageSrc}')`;
            } else if (slotData.type >= 22 && slotData.type <= 31) {
                // Handle placeholder blocks
                content.classList.add(`placeholder-block-${slotData.type}`);
            } else {
                content.style.backgroundImage = '';
            }
            
            // Show durability for tools or count for stackable items
            const isTool = slotData.durability !== null && slotData.durability !== undefined;
            if (isTool) {
                count.textContent = slotData.durability > 0 ? slotData.durability : '';
                count.style.color = slotData.durability < 20 ? '#ff4444' : 'white';
            } else {
                count.textContent = slotData.count > 1 ? slotData.count : '';
                count.style.color = 'white';
            }
        } else {
            content.style.backgroundImage = '';
            count.textContent = '';
        }
    }

    updateCursorElement(cursorElement, heldItem) {
        if (!cursorElement) return;

        const content = cursorElement.querySelector('.cursor-content');
        const count = cursorElement.querySelector('.cursor-count');
        
        // Clear previous placeholder classes
        content.className = 'cursor-content';
        content.style.backgroundImage = '';
        cursorElement.dataset.itemId = '';

        if (heldItem && heldItem.count > 0) {
            cursorElement.dataset.itemId = heldItem.type;
            const imageSrc = blockTypeImages[heldItem.type];
            if (imageSrc) {
                content.style.backgroundImage = `url('${imageSrc}')`;
            } else if (heldItem.type >= 22 && heldItem.type <= 31) {
                // Handle placeholder blocks for cursor
                content.classList.add(`placeholder-block-${heldItem.type}`);
            }

            const isTool = heldItem.durability !== null && heldItem.durability !== undefined;
            if (isTool) {
                // Tools always show a count of 1 on the cursor
                count.textContent = heldItem.count > 0 ? '1' : '';
                count.style.color = 'white';
            } else {
                count.textContent = heldItem.count > 1 ? heldItem.count : '';
                count.style.color = 'white';
            }

            cursorElement.style.display = 'block';
        } else {
            cursorElement.style.display = 'none';
        }
    }
}