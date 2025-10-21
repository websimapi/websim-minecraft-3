export class TransferHandler {
    constructor(state) {
        this.state = state;
    }

    quickTransfer(slotData) {
        if (slotData.type === null || slotData.count === 0) return false;

        const itemToMove = { ...slotData };
        slotData.type = null;
        slotData.count = 0;
        slotData.durability = null;

        this.state.addItemsToInventory(itemToMove, true);
        return true;
    }

    handleOutputClick(outputSlot, isShiftClick) {
        if (outputSlot.type === null || outputSlot.count === 0) return false;

        if (isShiftClick) {
            const itemToMove = { ...outputSlot };
            this.state.addItemsToInventory(itemToMove, true);
            outputSlot.type = null;
            outputSlot.count = 0;
            return true;
        } else {
            if (this.state.heldItem === null) {
                this.state.heldItem = { ...outputSlot };
                outputSlot.type = null;
                outputSlot.count = 0;
                return true;
            } else if (this.state.heldItem.type === outputSlot.type && this.state.heldItem.count < 64) {
                const canTake = 64 - this.state.heldItem.count;
                const toTake = Math.min(canTake, outputSlot.count);
                this.state.heldItem.count += toTake;
                outputSlot.count -= toTake;
                if (outputSlot.count <= 0) {
                    outputSlot.type = null;
                }
                return true;
            }
        }
        return false;
    }
}

