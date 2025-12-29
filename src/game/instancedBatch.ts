import * as THREE from "three";

export type InstanceBatchOptions = {
  capacity: number;
  useColors?: boolean;
};

export class InstanceBatch {
  readonly mesh: THREE.InstancedMesh;
  readonly capacity: number;
  private count = 0;
  private useColors: boolean;
  private tempPosition = new THREE.Vector3();
  private tempScale = new THREE.Vector3(1, 1, 1);
  private tempQuaternion = new THREE.Quaternion();
  private tempMatrix = new THREE.Matrix4();
  private tempAxis = new THREE.Vector3(0, 1, 0);

  constructor(
    scene: THREE.Scene,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    options: InstanceBatchOptions,
  ) {
    this.capacity = options.capacity;
    this.useColors = options.useColors ?? false;
    this.mesh = new THREE.InstancedMesh(geometry, material, this.capacity);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.useColors) {
      const colors = new Float32Array(this.capacity * 3);
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    }
    scene.add(this.mesh);
  }

  begin(): void {
    this.count = 0;
  }

  add(
    x: number,
    y: number,
    z: number,
    scale: number,
    rotationY: number,
    color?: THREE.Color,
  ): void {
    if (this.count >= this.capacity) return;
    this.tempPosition.set(x, y, z);
    this.tempScale.set(scale, scale, scale);
    this.tempQuaternion.setFromAxisAngle(this.tempAxis, rotationY);
    this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
    this.mesh.setMatrixAt(this.count, this.tempMatrix);
    if (this.useColors && this.mesh.instanceColor) {
      if (color) {
        this.mesh.instanceColor.setXYZ(this.count, color.r, color.g, color.b);
      } else {
        this.mesh.instanceColor.setXYZ(this.count, 1, 1, 1);
      }
    }
    this.count += 1;
  }

  commit(): void {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.useColors && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      for (const material of this.mesh.material) {
        material.dispose();
      }
    } else {
      this.mesh.material.dispose();
    }
  }
}
