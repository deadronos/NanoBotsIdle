import { Group, MeshStandardMaterial } from "three";
import { describe, expect, it } from "vitest";

import { MeshManager } from "../src/components/world/mesh/MeshManager";
import type { MeshResult } from "../src/shared/meshingProtocol";

describe("MeshManager", () => {
  const material = new MeshStandardMaterial();

  const createResult = (cx: number, cy: number, cz: number, empty = false): MeshResult => ({
    t: "MESH_RESULT",
    jobId: 1,
    rev: 1,
    chunk: { cx, cy, cz, size: 16 },
    geometry: {
      positions: empty ? new Float32Array(0) : new Float32Array([0, 0, 0]),
      normals: empty ? new Float32Array(0) : new Float32Array([0, 1, 0]),
      indices: empty ? new Uint32Array(0) : new Uint32Array([0]),
    },
  });

  it("queues results when group is not set", () => {
    const manager = new MeshManager(material);
    manager.applyMeshResult(createResult(0, 0, 0), 10);
    const state = manager.getDebugState();
    expect(state.pendingResultCount).toBe(1);
    expect(state.meshChunkKeys).toHaveLength(0);
  });

  it("queues results explicitly", () => {
    const manager = new MeshManager(material);
    manager.queueResult(createResult(0, 0, 0));
    const state = manager.getDebugState();
    expect(state.pendingResultCount).toBe(1);
  });

  it("processes queue when group is set", () => {
    const manager = new MeshManager(material);
    const group = new Group();
    manager.setGroup(group);

    manager.queueResult(createResult(0, 0, 0));
    manager.processQueue(10, 10);

    const state = manager.getDebugState();
    expect(state.pendingResultCount).toBe(0);
    expect(state.meshChunkKeys).toHaveLength(1);
    expect(group.children.length).toBe(1);
  });

  it("handles empty meshes", () => {
    const manager = new MeshManager(material);
    const group = new Group();
    manager.setGroup(group);

    // Add a mesh first
    manager.applyMeshResult(createResult(0, 0, 0), 10);
    expect(manager.getDebugState().meshChunkKeys).toHaveLength(1);

    // Update with empty
    manager.applyMeshResult(createResult(0, 0, 0, true), 10);
    expect(manager.getDebugState().meshChunkKeys).toHaveLength(0);
    expect(manager.getDebugState().emptyChunkKeys).toContain("0,0,0");
    expect(group.children.length).toBe(0);
  });

  it("disposes all meshes", () => {
    const manager = new MeshManager(material);
    const group = new Group();
    manager.setGroup(group);

    manager.applyMeshResult(createResult(0, 0, 0), 10);
    manager.disposeAll();

    expect(manager.getDebugState().meshChunkKeys).toHaveLength(0);
    expect(group.children.length).toBe(0);
  });
});
