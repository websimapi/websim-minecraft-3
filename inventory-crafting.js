import { blockTypeImages } from './inventory-state.js';

export class CraftingSystem {
    constructor(inventoryState) {
        this.state = inventoryState;
        this.craftingSlots = Array(9).fill(null).map(() => ({ type: null, count: 0 }));
        this.craftingOutput = { type: null, count: 0, durability: null };
        this.personalCraftingSlots = Array(4).fill(null).map(() => ({ type: null, count: 0 }));
        this.personalCraftingOutput = { type: null, count: 0, durability: null };
    }

    checkRecipe(slots, is3x3 = true) { return is3x3 ? this.check3x3Recipe(slots) : this.check2x2Recipe(slots); }

    check2x2Recipe(slots) {
        const ingredients = new Map(), shapelessGrid = [];
        for (let i = 0; i < 4; i++) if (slots[i].type !== null) { ingredients.set(slots[i].type, (ingredients.get(slots[i].type) || 0) + 1); shapelessGrid.push(slots[i].type); }
        
        const consumes = (type, amount) => { const result = []; let remaining = amount; for (let i = 0; i < 4; i++) if (slots[i].type === type && remaining) { result.push({ slot: i, amount: 1 }); remaining--; } return result; };

        if (ingredients.size === 1 && ingredients.has(5) && shapelessGrid.length === 1) return { output: 10, count: 4, consumes: consumes(5, 1) };
        if (ingredients.size === 1 && ingredients.has(10) && ingredients.get(10) === 2) {
            if ((slots[0].type === 10 && slots[2].type === 10) || (slots[1].type === 10 && slots[3].type === 10))
                return { output: 42, count: 4, consumes: [slots[0].type === 10 ? { slot: 0, amount: 1 } : { slot: 1, amount: 1 }, slots[0].type === 10 ? { slot: 2, amount: 1 } : { slot: 3, amount: 1 }] };
        }
        if (ingredients.size === 1 && ingredients.has(10) && ingredients.get(10) === 4 && slots[0].type === 10 && slots[1].type === 10 && slots[2].type === 10 && slots[3].type === 10)
            return { output: 20, count: 1, consumes: [{slot: 0, amount: 1}, {slot: 1, amount: 1}, {slot: 2, amount: 1}, {slot: 3, amount: 1}] };
        return null;
    }

    check3x3Recipe(slots) {
        const ingredients = new Map(), shapelessGrid = [];
        for (let i = 0; i < 9; i++) if (slots[i].type !== null) { ingredients.set(slots[i].type, (ingredients.get(slots[i].type) || 0) + 1); shapelessGrid.push(slots[i].type); }
        
        const consumes = (type, amount) => { const result = []; let remaining = amount; for (let i = 0; i < 9; i++) if (slots[i].type === type && remaining) { result.push({ slot: i, amount: 1 }); remaining--; } return result; };

        if (!(slots[0].type !== 3 || slots[1].type !== 3 || slots[2].type !== 3 || slots[3].type !== 3 || slots[5].type !== 3 || slots[6].type !== 3 || slots[7].type !== 3 || slots[8].type !== 3) && slots[4].type === null)
            return { output: 44, count: 1, consumes: [0, 1, 2, 3, 5, 6, 7, 8].map(i => ({ slot: i, amount: 1 })) };

        for (let col = 0; col < 3; col++) if (slots[col].type === 10 && slots[col + 3].type === 10) {
            let othersEmpty = true;
            for (let j = 0; j < 9; j++) if ((j !== col && j !== col + 3) && slots[j].type !== null) { othersEmpty = false; break; }
            if (othersEmpty) return { output: 42, count: 4, consumes: [{ slot: col, amount: 1 }, { slot: col + 3, amount: 1 }] };
        }

        const toolPatterns = [
            {pickaxe: [[0, 1, 2, 4, 7]], axe: [[0, 1, 3, 4, 7], [1, 2, 4, 5, 7]], shovel: [[0, 3, 6], [1, 4, 7], [2, 5, 8]]}
        ];

        const checkTool = (type, patterns, outputs) => {
            for (const pattern of patterns) {
                const [m1, m2, m3, s1, s2] = pattern;
                const matType = slots[m1]?.type;
                if (matType !== null && slots[m2]?.type === matType && slots[m3]?.type === matType && slots[s1]?.type === 42 && slots[s2]?.type === 42) {
                    let valid = true;
                    for (let i = 0; i < 9; i++) if (![m1, m2, m3, s1, s2].includes(i) && slots[i].type !== null) { valid = false; break; }
                    if (valid) {
                        const output = outputs[matType];
                        if (output) return { output, count: 1, durability: this.getToolDurability(output), consumes: [{ slot: m1, amount: 1 }, { slot: m2, amount: 1 }, { slot: m3, amount: 1 }, { slot: s1, amount: 1 }, { slot: s2, amount: 1 }] };
                    }
                }
            }
            return null;
        };

        const pickResult = checkTool('pickaxe', [[0, 1, 2, 4, 7], [3, 4, 5, 1, 7]], {10: 33, 3: 34, 43: 35});
        if (pickResult) return pickResult;

        const axeResult = checkTool('axe', [[0, 1, 3, 4, 7], [1, 2, 4, 5, 7]], {10: 36, 3: 37, 43: 38});
        if (axeResult) return axeResult;

        for (let col = 0; col < 3; col++) {
            const m = col, s1 = col + 3, s2 = col + 6, matType = slots[m]?.type;
            if (matType !== null && slots[s1]?.type === 42 && slots[s2]?.type === 42) {
                let valid = true;
                for (let i = 0; i < 9; i++) if (![m, s1, s2].includes(i) && slots[i].type !== null) { valid = false; break; }
                if (valid) {
                    const output = {10: 39, 3: 40, 43: 41}[matType];
                    if (output) return { output, count: 1, durability: this.getToolDurability(output), consumes: [{ slot: m, amount: 1 }, { slot: s1, amount: 1 }, { slot: s2, amount: 1 }] };
                }
            }
        }

        if (ingredients.size === 1 && ingredients.has(5) && shapelessGrid.length === 1) return { output: 10, count: 4, consumes: consumes(5, 1) };

        if (ingredients.size === 1 && ingredients.has(10) && ingredients.get(10) === 4) {
            for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
                const i = row * 3 + col;
                if (slots[i].type === 10 && slots[i+1].type === 10 && slots[i+3].type === 10 && slots[i+4].type === 10) {
                    let othersEmpty = true;
                    for (let j = 0; j < 9; j++) if (![i, i+1, i+3, i+4].includes(j) && slots[j].type !== null) { othersEmpty = false; break; }
                    if (othersEmpty) return { output: 20, count: 1, consumes: [{ slot: i, amount: 1 }, { slot: i + 1, amount: 1 }, { slot: i + 3, amount: 1 }, { slot: i + 4, amount: 1 }] };
                }
            }
        }

        const rows = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
        for (const row of rows) {
            const s0 = slots[row[0]], s1 = slots[row[1]], s2 = slots[row[2]];
            if (s0.type !== null && s0.type === s1.type && s1.type === s2.type && s0.count >= 1 && s1.count >= 1 && s2.count >= 1) {
                let othersFilled = false;
                for (let i = 0; i < 9; i++) if (!row.includes(i) && slots[i].count > 0) { othersFilled = true; break; }
                if (!othersFilled) {
                    const output = {3: 11, 5: 12, 10: 13}[s0.type];
                    if (output) return { output, count: 6, consumes: [{ slot: row[0], amount: 1 }, { slot: row[1], amount: 1 }, { slot: row[2], amount: 1 }] };
                }
            }
        }
        return null;
    }

    getToolDurability(toolType) { return {33: 59, 34: 131, 35: 250, 36: 59, 37: 131, 38: 250, 39: 59, 40: 131, 41: 250}[toolType] || null; }

    updateCraftingOutput(is3x3 = true) {
        const slots = is3x3 ? this.craftingSlots : this.personalCraftingSlots;
        const recipe = this.checkRecipe(slots, is3x3), output = is3x3 ? this.craftingOutput : this.personalCraftingOutput;
        output.type = recipe?.output || null;
        output.count = recipe?.count || 0;
        output.durability = recipe?.durability || null;
    }

    consumeRecipe(is3x3 = true) {
        const slots = is3x3 ? this.craftingSlots : this.personalCraftingSlots, recipe = this.checkRecipe(slots, is3x3);
        if (!recipe) return false;
        for (const c of recipe.consumes) { slots[c.slot].count -= c.amount; if (slots[c.slot].count === 0) slots[c.slot].type = null; }
        this.updateCraftingOutput(is3x3);
        return true;
    }

    canCraft(is3x3 = true) { return this.checkRecipe(is3x3 ? this.craftingSlots : this.personalCraftingSlots, is3x3) !== null; }

    autoCraftAll(is3x3 = true) {
        const output = is3x3 ? this.craftingOutput : this.personalCraftingOutput;
        if (output.type === null || output.count === 0) return 0;
        let totalCrafted = 0;
        while (this.canCraft(is3x3)) { if (this.consumeRecipe(is3x3)) totalCrafted += output.count; else break; }
        return totalCrafted;
    }

    returnCraftingItems(is3x3 = true) {
        const slots = is3x3 ? this.craftingSlots : this.personalCraftingSlots, items = [];
        for (let i = 0; i < slots.length; i++) if (slots[i].type !== null && slots[i].count > 0) { items.push({ type: slots[i].type, count: slots[i].count }); slots[i].type = null; slots[i].count = 0; }
        return items;
    }
}