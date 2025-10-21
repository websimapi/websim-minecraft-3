import * as THREE from 'three';

export class Player {
    constructor(scene) {
        this.position = new THREE.Vector3(0, 80, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.isGrounded = false;

        this.width = 0.6;
        this.height = 1.8;
        this.eyeHeight = 1.6;

        this.aabb = new THREE.Box3();
        this.updateAABB();
    }

    updateAABB() {
        const halfWidth = this.width / 2;
        this.aabb.set(
            new THREE.Vector3(
                this.position.x - halfWidth, 
                this.position.y, 
                this.position.z - halfWidth
            ),
            new THREE.Vector3(
                this.position.x + halfWidth, 
                this.position.y + this.height, 
                this.position.z + halfWidth
            )
        );
    }
}