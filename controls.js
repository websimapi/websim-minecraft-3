import * as THREE from 'three';

export class Controls {
    constructor() {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false,
            shift: false,
            c: false
        };

        this.movementEnabled = true;

        this.walkSpeed = 4.3;
        this.sprintSpeed = 5.6;
        this.crouchSpeed = 1.3;
        this.jumpStrength = 8.5;

        this.setupListeners();
    }

    setupListeners() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = true;
            if (key === ' ') this.keys.space = true;
            if (key === 'shift') this.keys.shift = true;
            if (key === 'c') this.keys.c = true;
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
            if (key === ' ') this.keys.space = false;
            if (key === 'shift') this.keys.shift = false;
            if (key === 'c') this.keys.c = false;
        });
    }

    getMovement(camera) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, camera.up).normalize();

        const moveDirection = new THREE.Vector3();

        if (this.movementEnabled) {
            if (this.keys.w) moveDirection.add(forward);
            if (this.keys.s) moveDirection.sub(forward);
            if (this.keys.a) moveDirection.sub(right);
            if (this.keys.d) moveDirection.add(right);
        }

        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize();
        }

        return moveDirection;
    }

    getCurrentSpeed(player) {
        const isCrouching = this.keys.c && player.isGrounded;

        if (isCrouching) {
            return { speed: this.crouchSpeed, crouching: true };
        } else if (this.keys.shift) {
            return { speed: this.sprintSpeed, crouching: false };
        }

        return { speed: this.walkSpeed, crouching: false };
    }
}