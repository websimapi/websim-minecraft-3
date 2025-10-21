import { blockTypeImages, slabIconsPromise } from './inventory-state.js';

export function setupInventoryUI(slotHandler, onCreativeSlotClick) {
    const inventoryGrid = document.getElementById('inventory-grid');
    const inventoryHotbar = document.getElementById('inventory-hotbar');
    const creativeGrid = document.getElementById('creative-grid');

    // Setup main inventory (27 slots)
    for (let i = 0; i < 27; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        const slotId = i + 9;
        slot.dataset.slot = slotId;
        slot.dataset.type = 'inventory';

        const content = document.createElement('div');
        content.className = 'slot-content';
        slot.appendChild(content);

        const count = document.createElement('span');
        count.className = 'slot-count';
        slot.appendChild(count);

        slot.addEventListener('mousedown', (e) => slotHandler.handleSlotMouseDown(e, slotId, 'inventory', false, false, false));
        slot.addEventListener('mouseup', (e) => slotHandler.handleSlotMouseUp(e, slotId, 'inventory', false, false, false));
        slot.addEventListener('mouseover', (e) => slotHandler.handleSlotHover(e, slotId, 'inventory', false, false));
        slot.addEventListener('mouseleave', (e) => e.currentTarget.classList.remove('drag-over'));

        inventoryGrid.appendChild(slot);
    }

    // Setup hotbar in inventory (9 slots)
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot hotbar-inventory-slot';
        const slotId = i;
        slot.dataset.slot = slotId;
        slot.dataset.type = 'hotbar';

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

        slot.addEventListener('mousedown', (e) => slotHandler.handleSlotMouseDown(e, slotId, 'hotbar', false, false, false));
        slot.addEventListener('mouseup', (e) => slotHandler.handleSlotMouseUp(e, slotId, 'hotbar', false, false, false));
        slot.addEventListener('mouseover', (e) => slotHandler.handleSlotHover(e, slotId, 'hotbar', false, false));
        slot.addEventListener('mouseleave', (e) => e.currentTarget.classList.remove('drag-over'));

        inventoryHotbar.appendChild(slot);
    }

    // Setup 2x2 personal crafting
    const personalCrafting = document.getElementById('personal-crafting-grid');
    for (let i = 0; i < 4; i++) {
        const slot = document.createElement('div');
        slot.className = 'crafting-slot';
        const slotId = i;
        slot.dataset.personalCraftingSlot = i;

        const content = document.createElement('div');
        content.className = 'slot-content';
        slot.appendChild(content);

        const count = document.createElement('span');
        count.className = 'slot-count';
        slot.appendChild(count);

        slot.addEventListener('mousedown', (e) => slotHandler.handleSlotMouseDown(e, slotId, 'crafting', true, false, false));
        slot.addEventListener('mouseup', (e) => slotHandler.handleSlotMouseUp(e, slotId, 'crafting', true, false, false));
        slot.addEventListener('mouseover', (e) => slotHandler.handleSlotHover(e, slotId, 'crafting', true, false));
        slot.addEventListener('mouseleave', (e) => e.currentTarget.classList.remove('drag-over'));

        personalCrafting.appendChild(slot);
    }

    const personalOutputSlot = document.querySelector('.personal-output-slot');
    personalOutputSlot.addEventListener('mousedown', (e) => slotHandler.handleSlotMouseDown(e, 0, 'output', false, false, true));
    personalOutputSlot.addEventListener('mouseup', (e) => slotHandler.handleSlotMouseUp(e, 0, 'output', false, false, true));

    // Setup creative grid
    const creativeBlocks = [
        1, 2, 3, 21, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 20, 24, 26, 32, 42, 43, 44, 46, 47,
        33, 34, 35, 36, 37, 38, 39, 40, 41
    ];

    slabIconsPromise.then(() => {
        creativeBlocks.forEach(blockType => {
            const slot = document.createElement('div');
            slot.className = 'creative-slot';
            slot.dataset.blockType = blockType;

            const content = document.createElement('div');
            content.className = 'slot-content';

            const imageSrc = blockTypeImages[blockType];
            if (imageSrc) {
                content.style.backgroundImage = `url('${imageSrc}')`;
                content.style.imageRendering = 'pixelated';
            } else if (blockType >= 22 && blockType <= 31) {
                // Add class for CSS-based placeholder texture
                content.classList.add(`placeholder-block-${blockType}`);
            }

            slot.appendChild(content);

            slot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onCreativeSlotClick(blockType);
            });

            creativeGrid.appendChild(slot);
        });
    });

    // Setup 3x3 crafting table UI
    const craftingGrid = document.getElementById('crafting-grid');
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        slot.className = 'crafting-slot';
        const slotId = i;
        slot.dataset.craftingSlot = i;

        const content = document.createElement('div');
        content.className = 'slot-content';
        slot.appendChild(content);

        const count = document.createElement('span');
        count.className = 'slot-count';
        slot.appendChild(count);

        slot.addEventListener('mousedown', (e) => slotHandler.handleSlotMouseDown(e, slotId, 'crafting', true, true, false));
        slot.addEventListener('mouseup', (e) => slotHandler.handleSlotMouseUp(e, slotId, 'crafting', true, true, false));
        slot.addEventListener('mouseover', (e) => slotHandler.handleSlotHover(e, slotId, 'crafting', true, true));
        slot.addEventListener('mouseleave', (e) => e.currentTarget.classList.remove('drag-over'));

        craftingGrid.appendChild(slot);
    }

    const outputSlot = document.querySelector('.output-slot');
    outputSlot.addEventListener('mousedown', (e) => slotHandler.handleSlotMouseDown(e, 0, 'output', false, true, true));
    outputSlot.addEventListener('mouseup', (e) => slotHandler.handleSlotMouseUp(e, 0, 'output', false, true, true));

    // Setup crafting table inventory
    const craftingInventoryGrid = document.getElementById('crafting-inventory-grid');
    const craftingInventoryHotbar = document.getElementById('crafting-inventory-hotbar');

    for (let i = 0; i < 27; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        const slotId = i + 9;
        slot.dataset.slot = i;

        const content = document.createElement('div');
        content.className = 'slot-content';
        slot.appendChild(content);

        const count = document.createElement('span');
        count.className = 'slot-count';
        slot.appendChild(count);

        slot.addEventListener('mousedown', (e) => slotHandler.handleSlotMouseDown(e, slotId, 'inventory', false, false, false));
        slot.addEventListener('mouseup', (e) => slotHandler.handleSlotMouseUp(e, slotId, 'inventory', false, false, false));
        slot.addEventListener('mouseover', (e) => slotHandler.handleSlotHover(e, slotId, 'inventory', false, false));
        slot.addEventListener('mouseleave', (e) => e.currentTarget.classList.remove('drag-over'));

        craftingInventoryGrid.appendChild(slot);
    }

    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot hotbar-inventory-slot';
        const slotId = i;
        slot.dataset.slot = i;

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

        slot.addEventListener('mousedown', (e) => slotHandler.handleSlotMouseDown(e, slotId, 'hotbar', false, false, false));
        slot.addEventListener('mouseup', (e) => slotHandler.handleSlotMouseUp(e, slotId, 'hotbar', false, false, false));
        slot.addEventListener('mouseover', (e) => slotHandler.handleSlotHover(e, slotId, 'hotbar', false, false));
        slot.addEventListener('mouseleave', (e) => e.currentTarget.classList.remove('drag-over'));

        craftingInventoryHotbar.appendChild(slot);
    }
}