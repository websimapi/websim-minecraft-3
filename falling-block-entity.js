import * as THREE from 'three';

export class FallingBlockEntity {
    constructor(scene, blockType, position, textures, world) {
        this.scene = scene;
        this.blockType = blockType;
        this.position = position.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.world = world;
        this.hasLanded = false;

        this.createMesh(textures);
    }

    createMesh(textures) {
        const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
        const texture = textures[this.blockType];
        const material = new THREE.MeshLambertMaterial({ map: texture });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(delta) {
        if (this.hasLanded) return true;

        // Apply gravity
        this.velocity.y -= 30 * delta;
        this.velocity.y = Math.max(this.velocity.y, -50);

        // Apply movement
        this.position.y += this.velocity.y * delta;

        // Check if landed on a block
        const blockBelow = this.world.getBlockAt(
            Math.floor(this.position.x),
            Math.floor(this.position.y - 0.5),
            Math.floor(this.position.z)
        );

        if (blockBelow !== 0) {
            // Snap to grid and place block
            const finalY = Math.floor(this.position.y - 0.5) + 1;
            this.world.setBlockAt(
                Math.floor(this.position.x),
                finalY,
                Math.floor(this.position.z),
                this.blockType
            );

            this.hasLanded = true;
            this.dispose();
            return true;
        }

        // Update mesh position
        this.mesh.position.copy(this.position);

        return false;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}