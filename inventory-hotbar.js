import { blockTypeImages, slabIconsPromise } from './inventory-state.js';

export class HotbarUI {
    constructor(inventoryState) {
        this.state = inventoryState;
        this.setupHotbarListeners();
    }

    setupHotbarListeners() {
        document.addEventListener('keydown', (e) => {
            const num = parseInt(e.key);
            if (num >= 1 && num <= 9) {
                this.state.selectedSlot = num - 1;
                this.updateHotbar();
            }
        });

        document.addEventListener('wheel', (e) => {
            const controls = document.querySelector('canvas').pointerLockElement;
            if (controls) {
                e.preventDefault();
                if (e.deltaY > 0) {
                    this.state.selectedSlot = (this.state.selectedSlot + 1) % 9;
                } else {
                    this.state.selectedSlot = (this.state.selectedSlot - 1 + 9) % 9;
                }
                this.updateHotbar();
            }
        }, { passive: false });
    }

    updateHotbar() {
        const slots = document.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, index) => {
            const slotData = this.state.slots[index];
            const content = slot.querySelector('.slot-content');
            const count = slot.querySelector('.slot-count');

            content.style.backgroundImage = '';

            if (slotData.type !== null && slotData.count > 0) {
                const updateImage = (src) => {
                    content.style.backgroundImage = `url('${src}')`;
                    content.style.imageRendering = 'pixelated';
                };

                const imageSrc = blockTypeImages[slotData.type];
                if (imageSrc) {
                    if (typeof imageSrc.then === 'function') { // It's a promise (for slabs)
                        imageSrc.then(updateImage);
                    } else {
                        updateImage(imageSrc);
                    }
                } else {
                    content.style.backgroundImage = '';
                }
                count.textContent = slotData.count > 1 ? slotData.count : '';
            } else {
                content.style.backgroundImage = '';
                count.textContent = '';
            }

            if (index === this.state.selectedSlot) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    }

    dropSelectedItem() {
        const slot = this.state.slots[this.state.selectedSlot];
        if (slot.type !== null && slot.count > 0 && slot.type !== 8) {
            const droppedType = slot.type;
            slot.count--;
            if (slot.count === 0) {
                slot.type = null;
            }
            this.updateHotbar();

            const event = new CustomEvent('dropItem', { detail: { blockType: droppedType } });
            document.dispatchEvent(event);
        }
    }
}