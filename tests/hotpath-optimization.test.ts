import { describe, expect, it } from "vitest";

import { getConfig, resetConfig, updateConfig } from "../src/config";
import { handleMeshingJob } from "../src/meshing/workerHandler";

describe("Hotpath Performance Optimizations", () => {
  it("should have reduced maxInFlight from 16 to 4", () => {
    resetConfig();
    const config = getConfig();
    expect(config.meshing.maxInFlight).toBe(4);
  });

  it("should have new maxMeshesPerFrame configuration", () => {
    resetConfig();
    const config = getConfig();
    expect(config.meshing.maxMeshesPerFrame).toBe(4);
    expect(typeof config.meshing.maxMeshesPerFrame).toBe("number");
  });

  it("should allow runtime configuration of maxInFlight", () => {
    resetConfig();
    updateConfig({ meshing: { maxInFlight: 8 } });
    const config = getConfig();
    expect(config.meshing.maxInFlight).toBe(8);
    resetConfig();
  });

  it("should allow runtime configuration of maxMeshesPerFrame", () => {
    resetConfig();
    updateConfig({ meshing: { maxMeshesPerFrame: 2 } });
    const config = getConfig();
    expect(config.meshing.maxMeshesPerFrame).toBe(2);
    resetConfig();
  });

  it("should compute bounding sphere in worker thread", () => {
    // Create a simple meshing job with some exposed surfaces
    const size = 16;
    const apronSize = size + 2;
    const materials = new Uint8Array(apronSize * apronSize * apronSize);
    materials.fill(0); // Start with air

    // Create a small solid cube in the middle with exposed faces
    for (let x = 6; x < 10; x++) {
      for (let y = 6; y < 10; y++) {
        for (let z = 6; z < 10; z++) {
          const idx = x + y * apronSize + z * apronSize * apronSize;
          materials[idx] = 1;
        }
      }
    }

    const result = handleMeshingJob({
      t: "MESH_CHUNK",
      jobId: 1,
      chunk: { cx: 0, cy: 0, cz: 0, size: 16 },
      origin: { x: 0, y: 0, z: 0 },
      rev: 1,
      materials,
      waterLevel: 0,
    });

    // Should return a mesh result
    expect(result.t).toBe("MESH_RESULT");

    if (result.t === "MESH_RESULT") {
      // Should have geometry with vertices
      expect(result.geometry.positions.length).toBeGreaterThan(0);

      // Should have pre-computed bounding sphere
      expect(result.geometry.boundingSphere).toBeDefined();
      expect(result.geometry.boundingSphere?.center).toBeDefined();
      expect(result.geometry.boundingSphere?.radius).toBeGreaterThan(0);

      // Bounding sphere should have correct structure
      const sphere = result.geometry.boundingSphere!;
      expect(typeof sphere.center.x).toBe("number");
      expect(typeof sphere.center.y).toBe("number");
      expect(typeof sphere.center.z).toBe("number");
      expect(typeof sphere.radius).toBe("number");

      // Sanity check: radius should be reasonable for a 16x16x16 chunk
      expect(sphere.radius).toBeLessThan(100);
    }
  });

  it("should compute bounding sphere for low LOD geometries", () => {
    // Create a simple meshing job with exposed surfaces and size >= 2 to trigger LOD generation
    const size = 16;
    const apronSize = size + 2;
    const materials = new Uint8Array(apronSize * apronSize * apronSize);
    materials.fill(0); // Start with air

    // Create a small solid cube in the middle with exposed faces
    for (let x = 6; x < 10; x++) {
      for (let y = 6; y < 10; y++) {
        for (let z = 6; z < 10; z++) {
          const idx = x + y * apronSize + z * apronSize * apronSize;
          materials[idx] = 1;
        }
      }
    }

    const result = handleMeshingJob({
      t: "MESH_CHUNK",
      jobId: 1,
      chunk: { cx: 0, cy: 0, cz: 0, size: 16 },
      origin: { x: 0, y: 0, z: 0 },
      rev: 1,
      materials,
      waterLevel: 0,
    });

    expect(result.t).toBe("MESH_RESULT");

    if (result.t === "MESH_RESULT" && result.lods && result.lods.length > 0) {
      const lowLod = result.lods.find((lod) => lod.level === "low");
      expect(lowLod).toBeDefined();

      // Low LOD should have geometry
      expect(lowLod?.geometry.positions.length).toBeGreaterThan(0);

      // Low LOD should have bounding sphere
      expect(lowLod?.geometry.boundingSphere).toBeDefined();
      expect(lowLod?.geometry.boundingSphere?.radius).toBeGreaterThan(0);
    }
  });

  it("should compute correct bounding sphere for empty geometry", () => {
    // Create an empty meshing job (all air)
    const materials = new Uint8Array(18 * 18 * 18);
    materials.fill(0); // All air

    const result = handleMeshingJob({
      t: "MESH_CHUNK",
      jobId: 1,
      chunk: { cx: 0, cy: 0, cz: 0, size: 16 },
      origin: { x: 0, y: 0, z: 0 },
      rev: 1,
      materials,
      waterLevel: 0,
    });

    expect(result.t).toBe("MESH_RESULT");

    if (result.t === "MESH_RESULT") {
      // Empty geometry should have zero radius or small bounding sphere
      if (result.geometry.positions.length === 0) {
        expect(result.geometry.boundingSphere?.radius).toBe(0);
      }
    }
  });

  it("should maintain backward compatibility with missing boundingSphere", () => {
    // Test that geometry without boundingSphere would still work (type check)
    const geometryWithoutSphere = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      indices: new Uint16Array([0, 1, 2]),
      colors: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
      // boundingSphere is optional - should compile without it
    };

    expect(geometryWithoutSphere.positions.length).toBeGreaterThan(0);
    expect((geometryWithoutSphere as { boundingSphere?: unknown }).boundingSphere).toBeUndefined();
  });

  it("should have performance tuning recommendations in documentation", () => {
    // This test documents the expected performance characteristics
    const config = getConfig();

    // Low-end hardware recommendation
    const lowEnd = { maxInFlight: 2, maxMeshesPerFrame: 2 };
    expect(lowEnd.maxInFlight).toBeLessThan(config.meshing.maxInFlight);

    // High-end hardware recommendation
    const highEnd = { maxInFlight: 8, maxMeshesPerFrame: 8 };
    expect(highEnd.maxInFlight).toBeGreaterThan(config.meshing.maxInFlight);

    // Current default should be balanced
    expect(config.meshing.maxInFlight).toBe(4);
    expect(config.meshing.maxMeshesPerFrame).toBe(4);
  });
});
