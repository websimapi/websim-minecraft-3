export class ClickHandler {
    constructor(state, updateCallback) {
        this.state = state;
        this.updateCallback = updateCallback;
    }

    handleSlotClick(slotData, isRightClick, isShiftClick) {
        if (isShiftClick && !this.state.heldItem) {
            return 'quick_transfer';
        }

        const isTool = slotData.durability !== null && slotData.durability !== undefined;
        const isHeldTool = this.state.heldItem && this.state.heldItem.durability !== null && this.state.heldItem.durability !== undefined;

        if (this.state.heldItem) {
            if (isRightClick) {
                if (isHeldTool) {
                    return this.swapItems(slotData);
                } else {
                    return this.placeOneItem(slotData);
                }
            } else {
                return this.placeStack(slotData, isTool, isHeldTool);
            }
        } else {
            if (slotData.type !== null && slotData.count > 0) {
                if (isRightClick) {
                    return this.pickupHalf(slotData, isTool);
                } else {
                    return this.pickupAll(slotData);
                }
            }
        }
        return 'none';
    }

    swapItems(slotData) {
        if (slotData.type === null || slotData.count === 0) {
            slotData.type = this.state.heldItem.type;
            slotData.count = this.state.heldItem.count;
            slotData.durability = this.state.heldItem.durability;
            this.state.heldItem = null;
        } else {
            const temp = { ...slotData };
            slotData.type = this.state.heldItem.type;
            slotData.count = this.state.heldItem.count;
            slotData.durability = this.state.heldItem.durability;
            this.state.heldItem = temp;
        }
        return 'swap';
    }

    placeOneItem(slotData) {
        if (slotData.type === null || slotData.count === 0) {
            slotData.type = this.state.heldItem.type;
            slotData.count = 1;
            slotData.durability = null;
        } else if (slotData.type === this.state.heldItem.type && slotData.count < 64 && slotData.durability === null) {
            slotData.count++;
        } else {
            return 'none';
        }
        this.state.heldItem.count--;
        if (this.state.heldItem.count <= 0) this.state.heldItem = null;
        return 'place_one';
    }

    placeStack(slotData, isTool, isHeldTool) {
        if (slotData.type === null || slotData.count === 0) {
            slotData.type = this.state.heldItem.type;
            slotData.count = this.state.heldItem.count;
            slotData.durability = this.state.heldItem.durability;
            this.state.heldItem = null;
        } else if (slotData.type === this.state.heldItem.type && !isHeldTool && !isTool) {
            const canAdd = 64 - slotData.count;
            const toAdd = Math.min(canAdd, this.state.heldItem.count);
            slotData.count += toAdd;
            this.state.heldItem.count -= toAdd;
            if (this.state.heldItem.count <= 0) this.state.heldItem = null;
        } else {
            return this.swapItems(slotData);
        }
        return 'place_stack';
    }

    pickupHalf(slotData, isTool) {
        if (isTool) {
            this.state.heldItem = { ...slotData };
            slotData.type = null;
            slotData.count = 0;
            slotData.durability = null;
        } else {
            const takeCount = Math.ceil(slotData.count / 2);
            this.state.heldItem = { type: slotData.type, count: takeCount, durability: null };
            slotData.count -= takeCount;
            if (slotData.count <= 0) {
                slotData.type = null;
                slotData.count = 0;
            }
        }
        return 'pickup_half';
    }

    pickupAll(slotData) {
        this.state.heldItem = { ...slotData };
        slotData.type = null;
        slotData.count = 0;
        slotData.durability = null;
        return 'pickup_all';
    }
}

