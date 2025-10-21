export class DragHandler {
    constructor(state, updateCallback) {
        this.state = state;
        this.updateCallback = updateCallback;

        this.isDragging = false;
        this.dragStartItem = null;
        this.draggedSlots = new Map();
    }

    startDrag(heldItem) {
        this.isDragging = true;
        this.dragStartItem = { ...heldItem };
        this.draggedSlots.clear();
    }

    clearDrag() {
        this.isDragging = false;
        this.dragStartItem = null;
        this.draggedSlots.clear();
        this.clearVisuals();
    }

    clearVisuals() {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    handleRightClickDrag(slotData) {
        if (this.draggedSlots.has(slotData)) return false;

        if (this.state.heldItem.count > 0) {
            if (slotData.type === null || slotData.count === 0) {
                slotData.type = this.state.heldItem.type;
                slotData.count = 1;
            } else if (slotData.type === this.state.heldItem.type && slotData.count < 64) {
                slotData.count++;
            } else {
                return false;
            }

            this.state.heldItem.count--;
            if (this.state.heldItem.count <= 0) {
                this.state.heldItem = null;
            }

            this.draggedSlots.set(slotData, true);
            return true;
        }
        return false;
    }

    handleLeftClickDrag(slotData, slotElement) {
        if (slotData.type !== null && slotData.type !== this.dragStartItem.type) return false;

        if (!this.draggedSlots.has(slotData)) {
            this.draggedSlots.set(slotData, slotData.count);
            slotElement.classList.add('drag-over');
        }

        this.distributeEvenly();
        return true;
    }

    distributeEvenly() {
        if (!this.state.heldItem || this.draggedSlots.size === 0) return;

        let totalToDistribute = this.dragStartItem.count;
        for (const [slot, originalCount] of this.draggedSlots.entries()) {
            slot.count = originalCount;
            if (slot.count === 0) slot.type = null;
        }

        const slotsToFill = Array.from(this.draggedSlots.keys());
        const totalExisting = slotsToFill.reduce((sum, slot) => sum + slot.count, 0);
        const totalItems = totalToDistribute + totalExisting;

        const baseAmount = Math.floor(totalItems / slotsToFill.length);
        let remainder = totalItems % slotsToFill.length;

        let remainingHeld = totalToDistribute;

        for (const slot of slotsToFill) {
            let targetAmount = baseAmount;
            if (remainder > 0) {
                targetAmount++;
                remainder--;
            }

            targetAmount = Math.min(64, targetAmount);
            const canPlace = 64 - slot.count;
            const toPlace = Math.min(canPlace, targetAmount - slot.count);

            if (toPlace > 0) {
                if (slot.type === null) slot.type = this.dragStartItem.type;
                slot.count += toPlace;
                remainingHeld -= toPlace;
            }
        }

        this.state.heldItem.count = remainingHeld;
        if (this.state.heldItem.count <= 0) {
            this.state.heldItem = null;
        }
    }
}