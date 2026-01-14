import { BufferAttribute, Color } from "three";
import { describe, expect, it } from "vitest";

import { buildBufferGeometry, writeVertexColor } from "../src/components/world/mesh/geometryBuilder";
import type { MeshResult } from "../src/shared/meshingProtocol";
import { TERRAIN_COLORS, TERRAIN_THRESHOLDS } from "../src/sim/terrain-constants";

describe("geometryBuilder", () => {
  describe("writeVertexColor", () => {
    const waterLevel = 10;
    const base = 0;

    it("writes deep water color", () => {
      const out = new Float32Array(3);
      const y = waterLevel + TERRAIN_THRESHOLDS.DEEP_WATER - 1;
      writeVertexColor(out, base, y, waterLevel);
      const c = new Color(TERRAIN_COLORS.DEEP_WATER);
      expect(out[0]).toBeCloseTo(c.r);
      expect(out[1]).toBeCloseTo(c.g);
      expect(out[2]).toBeCloseTo(c.b);
    });

    it("writes snow color", () => {
      const out = new Float32Array(3);
      const y = waterLevel + TERRAIN_THRESHOLDS.ROCK + 1;
      writeVertexColor(out, base, y, waterLevel);
      const c = new Color(TERRAIN_COLORS.SNOW);
      expect(out[0]).toBeCloseTo(c.r);
      expect(out[1]).toBeCloseTo(c.g);
      expect(out[2]).toBeCloseTo(c.b);
    });
  });

  describe("buildBufferGeometry", () => {
    it("creates buffer geometry from mesh result", () => {
      const geometry: MeshResult["geometry"] = {
        positions: new Float32Array([0, 0, 0, 1, 1, 1]),
        normals: new Float32Array([0, 1, 0, 0, 1, 0]),
        indices: new Uint32Array([0, 1]),
        colors: undefined,
        boundingSphere: { center: { x: 0.5, y: 0.5, z: 0.5 }, radius: 1 },
      };

      const buffer = buildBufferGeometry(geometry, 10);

      expect(buffer.getAttribute("position")).toBeInstanceOf(BufferAttribute);
      expect(buffer.getAttribute("normal")).toBeInstanceOf(BufferAttribute);
      expect(buffer.getAttribute("color")).toBeInstanceOf(BufferAttribute);
      expect(buffer.getIndex()).toBeInstanceOf(BufferAttribute);
      expect(buffer.boundingSphere).toBeDefined();
      expect(buffer.boundingSphere?.radius).toBe(1);
    });

     it("uses provided colors if available", () => {
        const colors = new Float32Array([1, 0, 0, 0, 1, 0]);
        const geometry: MeshResult["geometry"] = {
            positions: new Float32Array([0, 0, 0, 1, 1, 1]),
            normals: new Float32Array([0, 1, 0, 0, 1, 0]),
            indices: new Uint32Array([0, 1]),
            colors: colors,
        };

        const buffer = buildBufferGeometry(geometry, 10);
        const colorAttr = buffer.getAttribute("color") as BufferAttribute;
        expect(colorAttr.array).toEqual(colors);
     });
  });
});
