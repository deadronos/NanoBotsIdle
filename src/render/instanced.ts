import type { BufferGeometry, Color, InstancedMesh } from "three";
import { BufferAttribute, Color as ThreeColor, Object3D } from "three";

// Reuse a single Object3D to avoid allocations in hot paths
const _tmp = new Object3D();

export const setInstanceTransform = (
  mesh: InstancedMesh,
  index: number,
  opts: {
    position?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
  },
) => {
  const { position, scale, rotation } = opts;

  if (position) _tmp.position.set(position.x, position.y, position.z);
  if (scale) _tmp.scale.set(scale.x, scale.y, scale.z);
  if (rotation) _tmp.rotation.set(rotation.x, rotation.y, rotation.z);

  _tmp.updateMatrix();

  mesh.setMatrixAt(index, _tmp.matrix);
  if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
};

export const setInstanceColor = (mesh: InstancedMesh, index: number, color: Color) => {
  mesh.setColorAt(index, color);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};

export const applyInstanceUpdates = (
  mesh: InstancedMesh,
  opts?: {
    matrix?: boolean;
    color?: boolean;
    matrixRange?: { start: number; end: number };
    colorRange?: { start: number; end: number };
  },
) => {
  if (!opts) return;
  if (opts.matrix && mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
  if (opts.color && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const applyRange = (
    attr: InstancedMesh["instanceMatrix"] | InstancedMesh["instanceColor"],
    range?: { start: number; end: number },
  ) => {
    if (!attr || !range) return;
    const itemSize = attr.itemSize;
    const start = Math.min(range.start, range.end);
    const end = Math.max(range.start, range.end);
    const offset = start * itemSize;
    const count = (end - start + 1) * itemSize;

    if ("addUpdateRange" in attr && typeof attr.addUpdateRange === "function") {
      attr.addUpdateRange(offset, count);
      attr.needsUpdate = true;
      return;
    }

    const legacy = attr as unknown as { updateRange?: { offset: number; count: number } };
    if (legacy.updateRange) {
      if (legacy.updateRange.count < 0) {
        legacy.updateRange.offset = offset;
        legacy.updateRange.count = count;
      } else {
        const currentStart = legacy.updateRange.offset;
        const currentEnd = legacy.updateRange.offset + legacy.updateRange.count;
        const nextStart = Math.min(currentStart, offset);
        const nextEnd = Math.max(currentEnd, offset + count);
        legacy.updateRange.offset = nextStart;
        legacy.updateRange.count = nextEnd - nextStart;
      }
      attr.needsUpdate = true;
    }
  };

  applyRange(mesh.instanceMatrix, opts.matrixRange);
  applyRange(mesh.instanceColor, opts.colorRange);
};

export const populateInstancedMesh = (
  mesh: InstancedMesh,
  instances: { x: number; y: number; z: number; color?: Color }[],
) => {
  instances.forEach((inst, i) => {
    setInstanceTransform(mesh, i, {
      position: { x: inst.x, y: inst.y, z: inst.z },
      scale: { x: 1, y: 1, z: 1 },
    });

    if (inst.color) setInstanceColor(mesh, i, inst.color);
  });

  if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};

export const ensureGeometryHasVertexColors = (
  geometry: BufferGeometry,
  color: string | number | Color = 0xffffff,
) => {
  const position = geometry.getAttribute("position");
  if (!position) return;

  const existing = geometry.getAttribute("color");
  if (existing && existing.count === position.count) return;

  const tmp = new ThreeColor();
  tmp.set(color as string | number | Color);

  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const base = i * 3;
    colors[base] = tmp.r;
    colors[base + 1] = tmp.g;
    colors[base + 2] = tmp.b;
  }

  geometry.setAttribute("color", new BufferAttribute(colors, 3));
};
