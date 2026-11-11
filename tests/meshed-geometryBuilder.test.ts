import { BufferAttribute } from "three";
import { describe, expect, it } from "vitest";

import { buildBufferGeometry } from "../src/components/world/mesh/geometryBuilder";
import type { MeshResult } from "../src/shared/meshingProtocol";

describe("geometryBuilder", () => {
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
