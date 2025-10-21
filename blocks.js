import * as THREE from 'three';

export const BlockType = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    COBBLESTONE: 3,
    SNOW: 4,
    WOOD: 5,
    LEAVES: 6,
    TNT: 7,
    FLINT_AND_STEEL: 8,
    BEDROCK: 9,
    PLANKS: 10,
    STONE_SLAB: 11,
    LOG_SLAB: 12,
    PLANK_SLAB: 13,
    GLASS: 14,
    STONE_SLAB_TOP: 15,
    LOG_SLAB_TOP: 16,
    PLANK_SLAB_TOP: 17,
    WOOD_X: 18,
    WOOD_Z: 19,
    CRAFTING_TABLE: 20,
    STONE: 21,
    SAND: 24,
    GRAVEL: 26,
    IRON_ORE: 32,
    WOODEN_PICKAXE: 33,
    STONE_PICKAXE: 34,
    IRON_PICKAXE: 35,
    WOODEN_AXE: 36,
    STONE_AXE: 37,
    IRON_AXE: 38,
    WOODEN_SHOVEL: 39,
    STONE_SHOVEL: 40,
    IRON_SHOVEL: 41,
    STICK: 42,
    IRON_INGOT: 43,
    FURNACE: 44,
    FURNACE_LIT: 45,
    COAL_ORE: 46,
    COAL: 47,
};

export const BlockTypeNames = {
    [BlockType.AIR]: 'Air',
    [BlockType.GRASS]: 'Grass Block',
    [BlockType.DIRT]: 'Dirt',
    [BlockType.COBBLESTONE]: 'Cobblestone',
    [BlockType.SNOW]: 'Snow',
    [BlockType.WOOD]: 'Oak Log',
    [BlockType.LEAVES]: 'Oak Leaves',
    [BlockType.TNT]: 'TNT',
    [BlockType.FLINT_AND_STEEL]: 'Flint and Steel',
    [BlockType.BEDROCK]: 'Bedrock',
    [BlockType.PLANKS]: 'Oak Planks',
    [BlockType.STONE_SLAB]: 'Cobblestone Slab',
    [BlockType.LOG_SLAB]: 'Oak Slab',
    [BlockType.PLANK_SLAB]: 'Oak Plank Slab',
    [BlockType.GLASS]: 'Glass',
    [BlockType.CRAFTING_TABLE]: 'Crafting Table',
    [BlockType.STONE]: 'Stone',
    [BlockType.SAND]: 'Sand',
    [BlockType.GRAVEL]: 'Gravel',
    [BlockType.IRON_ORE]: 'Iron Ore',
    [BlockType.WOODEN_PICKAXE]: 'Wooden Pickaxe',
    [BlockType.STONE_PICKAXE]: 'Stone Pickaxe',
    [BlockType.IRON_PICKAXE]: 'Iron Pickaxe',
    [BlockType.WOODEN_AXE]: 'Wooden Axe',
    [BlockType.STONE_AXE]: 'Stone Axe',
    [BlockType.IRON_AXE]: 'Iron Axe',
    [BlockType.WOODEN_SHOVEL]: 'Wooden Shovel',
    [BlockType.STONE_SHOVEL]: 'Stone Shovel',
    [BlockType.IRON_SHOVEL]: 'Iron Shovel',
    [BlockType.STICK]: 'Stick',
    [BlockType.IRON_INGOT]: 'Iron Ingot',
    [BlockType.FURNACE]: 'Furnace',
    [BlockType.FURNACE_LIT]: 'Furnace (Lit)',
    [BlockType.COAL_ORE]: 'Coal Ore',
    [BlockType.COAL]: 'Coal',
};

export const fuelSources = {
    [BlockType.WOOD]: 15,
    [BlockType.PLANKS]: 15,
    [BlockType.LOG_SLAB]: 7.5,
    [BlockType.PLANK_SLAB]: 7.5,
    [BlockType.STICK]: 2.5,
    [BlockType.CRAFTING_TABLE]: 15,
    [BlockType.COAL]: 60,
};

export const blockColors = {
    [BlockType.GRASS]: 0x7cb342,
    [BlockType.DIRT]: 0x8b5a3c,
    [BlockType.COBBLESTONE]: 0x757575,
    [BlockType.SNOW]: 0xffffff,
    [BlockType.WOOD]: 0x8b6914,
    [BlockType.LEAVES]: 0x228b22,
    [BlockType.TNT]: 0xff0000,
    [BlockType.BEDROCK]: 0x1a1a1a,
    [BlockType.GLASS]: 0xaaccff
};

export function createTextures() {
    const loader = new THREE.TextureLoader();
    const textures = {};

    // Load textures from provided images
    const dirtTexture = loader.load('dirt.png');
    dirtTexture.magFilter = THREE.NearestFilter;
    dirtTexture.minFilter = THREE.NearestFilter;
    dirtTexture.wrapS = THREE.RepeatWrapping;
    dirtTexture.wrapT = THREE.RepeatWrapping;
    
    const cobblestoneTexture = loader.load('cobblestone.png');
    cobblestoneTexture.magFilter = THREE.NearestFilter;
    cobblestoneTexture.minFilter = THREE.NearestFilter;
    cobblestoneTexture.wrapS = THREE.RepeatWrapping;
    cobblestoneTexture.wrapT = THREE.RepeatWrapping;
    
    const snowTexture = loader.load('snow.png');
    snowTexture.magFilter = THREE.NearestFilter;
    snowTexture.minFilter = THREE.NearestFilter;
    snowTexture.wrapS = THREE.RepeatWrapping;
    snowTexture.wrapT = THREE.RepeatWrapping;
    
    const grassSideTexture = loader.load('grass side.png');
    grassSideTexture.magFilter = THREE.NearestFilter;
    grassSideTexture.minFilter = THREE.NearestFilter;
    grassSideTexture.wrapS = THREE.RepeatWrapping;
    grassSideTexture.wrapT = THREE.RepeatWrapping;
    grassSideTexture.repeat.y = -1;
    grassSideTexture.offset.y = 1;

    const grassTopTexture = loader.load('grass top.png');
    grassTopTexture.magFilter = THREE.NearestFilter;
    grassTopTexture.minFilter = THREE.NearestFilter;
    grassTopTexture.wrapS = THREE.RepeatWrapping;
    grassTopTexture.wrapT = THREE.RepeatWrapping;

    // Load tree textures
    const woodSideTexture = loader.load('tree log side.png');
    woodSideTexture.magFilter = THREE.NearestFilter;
    woodSideTexture.minFilter = THREE.NearestFilter;
    woodSideTexture.wrapS = THREE.RepeatWrapping;
    woodSideTexture.wrapT = THREE.RepeatWrapping;
    
    const woodTopTexture = loader.load('tree log top or bottom.png');
    woodTopTexture.magFilter = THREE.NearestFilter;
    woodTopTexture.minFilter = THREE.NearestFilter;
    woodTopTexture.wrapS = THREE.RepeatWrapping;
    woodTopTexture.wrapT = THREE.RepeatWrapping;
    
    const leavesTexture = loader.load('leaffs.png');
    leavesTexture.magFilter = THREE.NearestFilter;
    leavesTexture.minFilter = THREE.NearestFilter;
    leavesTexture.wrapS = THREE.RepeatWrapping;
    leavesTexture.wrapT = THREE.RepeatWrapping;

    // Load TNT textures
    const tntSideTexture = loader.load('tnt.png');
    tntSideTexture.magFilter = THREE.NearestFilter;
    tntSideTexture.minFilter = THREE.NearestFilter;
    tntSideTexture.wrapS = THREE.RepeatWrapping;
    tntSideTexture.wrapT = THREE.RepeatWrapping;
    tntSideTexture.repeat.y = -1;
    tntSideTexture.offset.y = 1;

    const tntTopTexture = loader.load('tnt bottom or top.png');
    tntTopTexture.magFilter = THREE.NearestFilter;
    tntTopTexture.minFilter = THREE.NearestFilter;
    tntTopTexture.wrapS = THREE.RepeatWrapping;
    tntTopTexture.wrapT = THREE.RepeatWrapping;

    // Load plank texture
    const plankTexture = loader.load('plank.png');
    plankTexture.magFilter = THREE.NearestFilter;
    plankTexture.minFilter = THREE.NearestFilter;
    plankTexture.wrapS = THREE.RepeatWrapping;
    plankTexture.wrapT = THREE.RepeatWrapping;

    // Bedrock texture
    const bedrockTexture = loader.load('bedrock.png');
    bedrockTexture.magFilter = THREE.NearestFilter;
    bedrockTexture.minFilter = THREE.NearestFilter;
    bedrockTexture.wrapS = THREE.RepeatWrapping;
    bedrockTexture.wrapT = THREE.RepeatWrapping;

    // Load glass texture with better settings
    const glassTexture = loader.load('glass.png');
    glassTexture.magFilter = THREE.NearestFilter;
    glassTexture.minFilter = THREE.NearestFilter;
    glassTexture.wrapS = THREE.RepeatWrapping;
    glassTexture.wrapT = THREE.RepeatWrapping;
    glassTexture.colorSpace = THREE.SRGBColorSpace;

    // Load crafting table textures
    const craftingTableSideTexture = loader.load('crafting table side.png');
    craftingTableSideTexture.magFilter = THREE.NearestFilter;
    craftingTableSideTexture.minFilter = THREE.NearestFilter;
    craftingTableSideTexture.wrapS = THREE.RepeatWrapping;
    craftingTableSideTexture.wrapT = THREE.RepeatWrapping;
    craftingTableSideTexture.repeat.y = -1;
    craftingTableSideTexture.offset.y = 1;

    const craftingTableTopTexture = loader.load('crafting table top.png');
    craftingTableTopTexture.magFilter = THREE.NearestFilter;
    craftingTableTopTexture.minFilter = THREE.NearestFilter;
    craftingTableTopTexture.wrapS = THREE.RepeatWrapping;
    craftingTableTopTexture.wrapT = THREE.RepeatWrapping;

    const craftingTableBottomTexture = loader.load('crafting table bottom.png');
    craftingTableBottomTexture.magFilter = THREE.NearestFilter;
    craftingTableBottomTexture.minFilter = THREE.NearestFilter;
    craftingTableBottomTexture.wrapS = THREE.RepeatWrapping;
    craftingTableBottomTexture.wrapT = THREE.RepeatWrapping;

    // Smooth stone texture
    const stoneTexture = loader.load('stone.png');
    stoneTexture.magFilter = THREE.NearestFilter;
    stoneTexture.minFilter = THREE.NearestFilter;
    stoneTexture.wrapS = THREE.RepeatWrapping;
    stoneTexture.wrapT = THREE.RepeatWrapping;

    // Gravel texture
    const gravelTexture = loader.load('gravel.png');
    gravelTexture.magFilter = THREE.NearestFilter;
    gravelTexture.minFilter = THREE.NearestFilter;
    gravelTexture.wrapS = THREE.RepeatWrapping;
    gravelTexture.wrapT = THREE.RepeatWrapping;

    // Sand texture
    const sandTexture = loader.load('sand.png');
    sandTexture.magFilter = THREE.NearestFilter;
    sandTexture.minFilter = THREE.NearestFilter;
    sandTexture.wrapS = THREE.RepeatWrapping;
    sandTexture.wrapT = THREE.RepeatWrapping;

    // Iron ore texture
    const ironOreTexture = loader.load('iron block natural spawn.png');
    ironOreTexture.magFilter = THREE.NearestFilter;
    ironOreTexture.minFilter = THREE.NearestFilter;
    ironOreTexture.wrapS = THREE.RepeatWrapping;
    ironOreTexture.wrapT = THREE.RepeatWrapping;

    // Furnace textures
    const furnaceUnlitTexture = loader.load('furnace front unlit.png');
    furnaceUnlitTexture.magFilter = THREE.NearestFilter;
    furnaceUnlitTexture.minFilter = THREE.NearestFilter;
    furnaceUnlitTexture.wrapS = THREE.RepeatWrapping;
    furnaceUnlitTexture.wrapT = THREE.RepeatWrapping;
    furnaceUnlitTexture.repeat.y = -1; // Flip texture
    furnaceUnlitTexture.offset.y = 1;

    const furnaceLitTexture = loader.load('furnace front lit.png');
    furnaceLitTexture.magFilter = THREE.NearestFilter;
    furnaceLitTexture.minFilter = THREE.NearestFilter;
    furnaceLitTexture.wrapS = THREE.RepeatWrapping;
    furnaceLitTexture.wrapT = THREE.RepeatWrapping;
    furnaceLitTexture.repeat.y = -1; // Flip texture
    furnaceLitTexture.offset.y = 1;

    const furnaceSideTexture = stoneTexture.clone();
    const furnaceTopTexture = stoneTexture.clone();

    // Coal ore texture
    const coalOreTexture = loader.load('Coal ore.png');
    coalOreTexture.magFilter = THREE.NearestFilter;
    coalOreTexture.minFilter = THREE.NearestFilter;
    coalOreTexture.wrapS = THREE.RepeatWrapping;
    coalOreTexture.wrapT = THREE.RepeatWrapping;

    textures[BlockType.GRASS] = {
        top: grassTopTexture,
        side: grassSideTexture,
        bottom: dirtTexture
    };
    textures[BlockType.DIRT] = dirtTexture;
    textures[BlockType.COBBLESTONE] = cobblestoneTexture;
    textures[BlockType.SNOW] = snowTexture;
    textures[BlockType.WOOD] = {
        top: woodTopTexture,
        side: woodSideTexture,
        bottom: woodTopTexture
    };
    textures[BlockType.LEAVES] = leavesTexture;
    textures[BlockType.TNT] = {
        top: tntTopTexture,
        side: tntSideTexture,
        bottom: tntTopTexture
    };
    textures[BlockType.BEDROCK] = bedrockTexture;
    textures[BlockType.PLANKS] = {
        top: plankTexture.clone(),
        side: plankTexture.clone(),
        bottom: plankTexture.clone()
    };
    textures[BlockType.STONE_SLAB] = cobblestoneTexture.clone();
    textures[BlockType.LOG_SLAB] = woodSideTexture.clone();
    textures[BlockType.PLANK_SLAB] = plankTexture.clone();
    textures[BlockType.STONE_SLAB_TOP] = cobblestoneTexture.clone();
    textures[BlockType.LOG_SLAB_TOP] = woodSideTexture.clone();
    textures[BlockType.PLANK_SLAB_TOP] = plankTexture.clone();
    textures[BlockType.GLASS] = glassTexture;
    textures[BlockType.WOOD_X] = {
        top: woodSideTexture.clone(),
        side: woodTopTexture.clone(),
        bottom: woodSideTexture.clone()
    };
    textures[BlockType.WOOD_Z] = {
        top: woodSideTexture.clone(),
        side: woodTopTexture.clone(),
        bottom: woodSideTexture.clone()
    };
    textures[BlockType.CRAFTING_TABLE] = {
        top: craftingTableTopTexture,
        side: craftingTableSideTexture,
        bottom: craftingTableBottomTexture
    };
    textures[BlockType.STONE] = stoneTexture;
    textures[BlockType.GRAVEL] = gravelTexture;
    textures[BlockType.SAND] = sandTexture;
    textures[BlockType.IRON_ORE] = ironOreTexture;
    textures[BlockType.FURNACE] = {
        front: furnaceUnlitTexture,
        side: furnaceSideTexture,
        top: furnaceTopTexture
    };
    textures[BlockType.FURNACE_LIT] = {
        front: furnaceLitTexture,
        side: furnaceSideTexture,
        top: furnaceTopTexture
    };
    textures[BlockType.COAL_ORE] = coalOreTexture;

    // Ensure textures are properly configured
    textures[BlockType.WOOD_X].top.magFilter = THREE.NearestFilter;
    textures[BlockType.WOOD_X].top.minFilter = THREE.NearestFilter;
    textures[BlockType.WOOD_X].side.magFilter = THREE.NearestFilter;
    textures[BlockType.WOOD_X].side.minFilter = THREE.NearestFilter;
    textures[BlockType.WOOD_X].bottom.magFilter = THREE.NearestFilter;
    textures[BlockType.WOOD_X].bottom.minFilter = THREE.NearestFilter;
    
    textures[BlockType.WOOD_Z].top.magFilter = THREE.NearestFilter;
    textures[BlockType.WOOD_Z].top.minFilter = THREE.NearestFilter;
    textures[BlockType.WOOD_Z].side.magFilter = THREE.NearestFilter;
    textures[BlockType.WOOD_Z].side.minFilter = THREE.NearestFilter;
    textures[BlockType.WOOD_Z].bottom.magFilter = THREE.NearestFilter;
    textures[BlockType.WOOD_Z].bottom.minFilter = THREE.NearestFilter;

    return textures;
}