import * as THREE from "three";

import type { World } from "./World";
import { BlockId, BLOCKS } from "./World";

type PlayerControllerOpts = {
  camera: THREE.PerspectiveCamera;
  world: World;
  domElement: HTMLElement;
};

type InputState = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
};

export class PlayerController {
  readonly camera: THREE.PerspectiveCamera;
  readonly world: World;
  readonly domElement: HTMLElement;

  // Player "body" state
  position = new THREE.Vector3(0, 30, 0);
  velocity = new THREE.Vector3(0, 0, 0);

  // Camera angles
  private yaw = 0;
  private pitch = 0;
  private prevPosition = new THREE.Vector3(0, 30, 0);

  private handleKeyDown?: (e: KeyboardEvent) => void;
  private handleKeyUp?: (e: KeyboardEvent) => void;
  private handleMouseMove?: (e: MouseEvent) => void;

  private input: InputState = {
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  };

  // Physics params
  private gravity = -24;
  private walkSpeed = 6.0;
  private sprintMult = 1.6;
  private jumpSpeed = 8.2;
  private friction = 10.0;
  private airControl = 0.15;

  // Collider (AABB)
  // Like Minecraft: width ~0.6, height ~1.8
  private halfW = 0.3;
  private height = 1.78;

  private onGround = false;

  private tmpMoveDir = new THREE.Vector3();
  private tmpForward = new THREE.Vector3();
  private tmpRight = new THREE.Vector3();
  private tmpDesiredVel = new THREE.Vector3();
  private tmpHorizVel = new THREE.Vector3();
  private tmpNext = new THREE.Vector3();

  constructor(opts: PlayerControllerOpts) {
    this.camera = opts.camera;
    this.world = opts.world;
    this.domElement = opts.domElement;

    this.bindInput();
    this.bindMouseLook();
  }

  async requestPointerLock(): Promise<void> {
    if (document.pointerLockElement === this.domElement) return;
    this.domElement.requestPointerLock();
  }

  clearInput(): void {
    this.input = {
      forward: false,
      back: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
    };
  }

  dispose(): void {
    if (this.handleKeyDown) window.removeEventListener("keydown", this.handleKeyDown);
    if (this.handleKeyUp) window.removeEventListener("keyup", this.handleKeyUp);
    if (this.handleMouseMove) window.removeEventListener("mousemove", this.handleMouseMove);
  }

  teleportToSafeSpawn(): void {
    // find a solid block in center chunk and spawn above it.
    const spawnX = 8;
    const spawnZ = 8;
    let y = 50;
    for (; y > 2; y--) {
      const below = this.world.getBlock(spawnX, y - 1, spawnZ);
      if (below !== BlockId.Air && BLOCKS[below].solid) break;
    }
    this.position.set(spawnX + 0.5, y + 2.2, spawnZ + 0.5);
    this.velocity.set(0, 0, 0);
    this.capturePreviousState();
    this.syncCamera(1);
  }

  cameraWorldPosition(): THREE.Vector3 {
    // Camera at eye height
    return this.position.clone().add(new THREE.Vector3(0, this.height * 0.92, 0));
  }

  cameraWorldDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
    return dir.normalize();
  }

  wouldCollideAtPlacement(bx: number, by: number, bz: number): boolean {
    // If the placed block overlaps the player's AABB, reject.
    const min = this.position.clone().add(new THREE.Vector3(-this.halfW, 0, -this.halfW));
    const max = this.position.clone().add(new THREE.Vector3(this.halfW, this.height, this.halfW));

    const bMin = new THREE.Vector3(bx, by, bz);
    const bMax = new THREE.Vector3(bx + 1, by + 1, bz + 1);

    return (
      min.x < bMax.x &&
      max.x > bMin.x &&
      min.y < bMax.y &&
      max.y > bMin.y &&
      min.z < bMax.z &&
      max.z > bMin.z
    );
  }

  update(dt: number): void {
    this.capturePreviousState();
    // Movement input in world space (XZ plane)
    const moveDir = this.tmpMoveDir.set(0, 0, 0);
    const forward = this.tmpForward.set(-Math.sin(this.yaw), 0, Math.cos(this.yaw) * -1); // camera forward projected
    const right = this.tmpRight.set(-forward.z, 0, forward.x);

    if (this.input.forward) moveDir.add(forward);
    if (this.input.back) moveDir.sub(forward);
    if (this.input.right) moveDir.add(right);
    if (this.input.left) moveDir.sub(right);

    const wantsMove = moveDir.lengthSq() > 0;
    if (wantsMove) moveDir.normalize();

    const speed = this.walkSpeed * (this.input.sprint ? this.sprintMult : 1);

    // Horizontal velocity change.
    const desiredVel = this.tmpDesiredVel.copy(moveDir).multiplyScalar(speed);
    const horizVel = this.tmpHorizVel.set(this.velocity.x, 0, this.velocity.z);

    if (this.onGround) {
      // Friction towards desired velocity.
      const diff = desiredVel.sub(horizVel);
      horizVel.add(diff.multiplyScalar(Math.min(1, this.friction * dt)));
    } else {
      // Limited air control
      const diff = desiredVel.sub(horizVel);
      horizVel.add(diff.multiplyScalar(Math.min(1, this.airControl * dt)));
    }

    this.velocity.x = horizVel.x;
    this.velocity.z = horizVel.z;

    // Jump
    if (this.onGround && this.input.jump) {
      this.velocity.y = this.jumpSpeed;
      this.onGround = false;
    }

    // Gravity
    this.velocity.y += this.gravity * dt;

    // Integrate with axis-separated collision resolution.
    const next = this.tmpNext.copy(this.velocity).multiplyScalar(dt).add(this.position);
    this.onGround = false;

    // X
    this.position.x = next.x;
    this.resolveCollisionsAxis("x");

    // Z
    this.position.z = next.z;
    this.resolveCollisionsAxis("z");

    // Y
    this.position.y = next.y;
    this.resolveCollisionsAxis("y");

    // Safety clamp
    if (this.position.y < -10) this.teleportToSafeSpawn();
  }

  syncCamera(alpha: number): void {
    const t = Math.min(Math.max(alpha, 0), 1);
    const interpX = lerp(this.prevPosition.x, this.position.x, t);
    const interpY = lerp(this.prevPosition.y, this.position.y, t);
    const interpZ = lerp(this.prevPosition.z, this.position.z, t);

    this.camera.position.set(interpX, interpY + this.height * 0.92, interpZ);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  private capturePreviousState(): void {
    this.prevPosition.copy(this.position);
  }

  private resolveCollisionsAxis(axis: "x" | "y" | "z"): void {
    const min = this.position.clone().add(new THREE.Vector3(-this.halfW, 0, -this.halfW));
    const max = this.position.clone().add(new THREE.Vector3(this.halfW, this.height, this.halfW));

    const minBx = Math.floor(min.x);
    const maxBx = Math.floor(max.x);
    const minBy = Math.floor(min.y);
    const maxBy = Math.floor(max.y);
    const minBz = Math.floor(min.z);
    const maxBz = Math.floor(max.z);

    for (let by = minBy; by <= maxBy; by++) {
      for (let bz = minBz; bz <= maxBz; bz++) {
        for (let bx = minBx; bx <= maxBx; bx++) {
          const id = this.world.getBlock(bx, by, bz);
          if (id === BlockId.Air) continue;
          if (!BLOCKS[id].solid) continue;

          const bMin = new THREE.Vector3(bx, by, bz);
          const bMax = new THREE.Vector3(bx + 1, by + 1, bz + 1);

          if (!aabbIntersects(min, max, bMin, bMax)) continue;

          if (axis === "x") {
            const leftPen = bMax.x - min.x; // push +x
            const rightPen = max.x - bMin.x; // push -x
            if (leftPen < rightPen) {
              this.position.x += leftPen + 1e-4;
            } else {
              this.position.x -= rightPen + 1e-4;
            }
            this.velocity.x = 0;
            // update min/max for subsequent checks
            min.x = this.position.x - this.halfW;
            max.x = this.position.x + this.halfW;
          } else if (axis === "z") {
            const frontPen = bMax.z - min.z;
            const backPen = max.z - bMin.z;
            if (frontPen < backPen) {
              this.position.z += frontPen + 1e-4;
            } else {
              this.position.z -= backPen + 1e-4;
            }
            this.velocity.z = 0;
            min.z = this.position.z - this.halfW;
            max.z = this.position.z + this.halfW;
          } else {
            // y
            const downPen = bMax.y - min.y; // push +y
            const upPen = max.y - bMin.y; // push -y
            if (downPen < upPen) {
              // landed on block
              this.position.y += downPen + 1e-4;
              if (this.velocity.y < 0) this.onGround = true;
              this.velocity.y = Math.max(0, this.velocity.y);
            } else {
              // hit head on block
              this.position.y -= upPen + 1e-4;
              if (this.velocity.y > 0) this.velocity.y = 0;
            }
            min.y = this.position.y;
            max.y = this.position.y + this.height;
          }
        }
      }
    }
  }

  private bindInput(): void {
    this.handleKeyDown = (e) => {
      if (e.code === "KeyW") this.input.forward = true;
      if (e.code === "KeyS") this.input.back = true;
      if (e.code === "KeyA") this.input.left = true;
      if (e.code === "KeyD") this.input.right = true;
      if (e.code === "Space") this.input.jump = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.input.sprint = true;
    };

    this.handleKeyUp = (e) => {
      if (e.code === "KeyW") this.input.forward = false;
      if (e.code === "KeyS") this.input.back = false;
      if (e.code === "KeyA") this.input.left = false;
      if (e.code === "KeyD") this.input.right = false;
      if (e.code === "Space") this.input.jump = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.input.sprint = false;
    };

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  private bindMouseLook(): void {
    const clampPitch = (p: number) =>
      Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, p));

    this.handleMouseMove = (e) => {
      if (document.pointerLockElement !== this.domElement) return;
      const sens = 0.0022;
      this.yaw -= e.movementX * sens;
      this.pitch -= e.movementY * sens;
      this.pitch = clampPitch(this.pitch);
    };

    window.addEventListener("mousemove", this.handleMouseMove);
  }
}

function aabbIntersects(
  aMin: THREE.Vector3,
  aMax: THREE.Vector3,
  bMin: THREE.Vector3,
  bMax: THREE.Vector3,
): boolean {
  return (
    aMin.x < bMax.x &&
    aMax.x > bMin.x &&
    aMin.y < bMax.y &&
    aMax.y > bMin.y &&
    aMin.z < bMax.z &&
    aMax.z > bMin.z
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
