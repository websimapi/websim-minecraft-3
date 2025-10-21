import { getBiome, getBiomeName, getTerrainHeight } from './terrain.js';

export class Console {
    constructor(world, player) {
        this.world = world;
        this.player = player;
        this.isOpen = false;

        this.consoleElement = document.getElementById('console');
        this.outputElement = document.getElementById('console-output');
        this.suggestionsElement = document.getElementById('console-suggestions');
        this.inputElement = document.getElementById('console-input');

        this.setupListeners();
        this.commands = this.initCommands();
    }

    initCommands() {
        return {
            tp: {
                description: 'Teleport to a biome',
                suggestions: [
                    { label: 'Plains', biome: 0.1 },
                    { label: 'Plains/Hills Transition', biome: 0.25 },
                    { label: 'Hills', biome: 0.45 },
                    { label: 'Hills/Mountains Transition', biome: 0.63 },
                    { label: 'Mountains', biome: 0.85 },
                    { label: 'Small Cave', cave: 'small' },
                    { label: 'Big Cave', cave: 'big' }
                ]
            }
        };
    }

    setupListeners() {
        document.addEventListener('keydown', (e) => {
            // Check for backtick key (both key and code for compatibility)
            if (e.key === '`' || e.code === 'Backquote') {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
                return;
            }

            if (this.isOpen && e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }

            if (this.isOpen && e.key === 'Enter') {
                e.preventDefault();
                this.executeCommand(this.inputElement.value);
            }
        });

        this.inputElement.addEventListener('input', () => {
            this.updateSuggestions();
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.consoleElement.classList.remove('hidden');
        document.exitPointerLock();
        // Use setTimeout to ensure focus works after pointer lock changes
        setTimeout(() => {
            this.inputElement.focus();
        }, 50);
        this.updateSuggestions();
    }

    close() {
        this.isOpen = false;
        this.consoleElement.classList.add('hidden');
        this.inputElement.value = '';
        this.suggestionsElement.innerHTML = '';
    }

    updateSuggestions() {
        const input = this.inputElement.value.toLowerCase();
        this.suggestionsElement.innerHTML = '';

        if (input.startsWith('/tp')) {
            const suggestions = this.commands.tp.suggestions;
            suggestions.forEach(suggestion => {
                const button = document.createElement('div');
                button.className = 'console-suggestion';
                button.textContent = suggestion.label;
                button.addEventListener('click', () => {
                    this.teleportTo(suggestion);
                });
                this.suggestionsElement.appendChild(button);
            });
        }
    }

    executeCommand(input) {
        if (!input.trim()) return;

        this.log(`> ${input}`);

        const args = input.trim().toLowerCase().split(' ');
        const command = args[0];

        if (command === '/tp') {
            this.log('Available teleport locations:');
            this.updateSuggestions();
        } else {
            this.log(`Unknown command: ${command}`);
        }

        this.inputElement.value = '';
    }

    teleportTo(suggestion) {
        let targetX, targetZ, targetY;

        if (suggestion.cave) {
            // Find a cave
            const result = this.findCave(suggestion.cave === 'big');
            if (result) {
                targetX = result.x;
                targetY = result.y;
                targetZ = result.z;
                this.log(`Teleporting to ${suggestion.label}...`);
            } else {
                this.log(`Could not find a ${suggestion.label}`);
                return;
            }
        } else {
            // Find surface biome
            const result = this.findBiome(suggestion.biome);
            targetX = result.x;
            targetZ = result.z;
            targetY = this.world.getSpawnHeight(targetX, targetZ);
            this.log(`Teleporting to ${suggestion.label}...`);
        }

        this.player.position.set(targetX, targetY, targetZ);
        this.player.velocity.set(0, 0, 0);
        this.close();
    }

    findBiome(targetBiome) {
        const searchRadius = 500;
        let closestDist = Infinity;
        let closestPos = { x: 0, z: 0 };

        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * searchRadius;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;

            const biome = getBiome(x, z, this.world.seed);
            const diff = Math.abs(biome - targetBiome);

            if (diff < closestDist) {
                closestDist = diff;
                closestPos = { x, z };
            }
        }

        return closestPos;
    }

    findCave(wantBig) {
        const searchRadius = 300;
        const minCaveSize = wantBig ? 80 : 10; // Much smaller for small caves
        const maxCaveSize = wantBig ? 200 : 30; // Much smaller for small caves

        for (let attempt = 0; attempt < 300; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * searchRadius;
            const x = Math.floor(Math.cos(angle) * distance);
            const z = Math.floor(Math.sin(angle) * distance);

            const terrainHeight = getTerrainHeight(x, z, this.world.seed);

            // Search for caves below terrain, starting deeper
            for (let y = Math.floor(terrainHeight - 15); y > 15; y -= 3) {
                const blockType = this.world.getBlockAt(x, y, z);

                if (blockType === 0) {
                    // Found air, check if it's a proper cave with enough space
                    let airCount = 0;
                    let floorY = y;
                    
                    // Count air in a 5x5x5 area
                    for (let dy = -2; dy <= 2; dy++) {
                        for (let dx = -2; dx <= 2; dx++) {
                            for (let dz = -2; dz <= 2; dz++) {
                                const checkBlock = this.world.getBlockAt(x + dx, y + dy, z + dz);
                                if (checkBlock === 0) airCount++;
                            }
                        }
                    }

                    // Check if this spot matches size requirements
                    if (airCount >= minCaveSize && airCount <= maxCaveSize) {
                        // Find the floor
                        for (let checkY = y; checkY > y - 10; checkY--) {
                            if (this.world.getBlockAt(x, checkY, z) !== 0) {
                                floorY = checkY + 1;
                                break;
                            }
                        }
                        
                        // Verify there's enough headroom
                        let hasHeadroom = true;
                        for (let checkY = floorY; checkY < floorY + 3; checkY++) {
                            if (this.world.getBlockAt(x, checkY, z) !== 0) {
                                hasHeadroom = false;
                                break;
                            }
                        }
                        
                        if (hasHeadroom) {
                            return { x: x + 0.5, y: floorY, z: z + 0.5 };
                        }
                    }
                }
            }
        }

        return null;
    }

    log(message) {
        const line = document.createElement('div');
        line.textContent = message;
        this.outputElement.appendChild(line);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }
}