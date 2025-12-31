import { describe, expect, it } from "vitest";

import { createApronField, fillApronField, index3D } from "../src/meshing/apronField";

describe("meshing apron field (TDD)", () => {
  it("should map 3D coords to linear indices", () => {
    expect(index3D(0, 0, 0, 4)).toBe(0);
    expect(index3D(1, 0, 0, 4)).toBe(1);
    expect(index3D(0, 1, 0, 4)).toBe(4);
    expect(index3D(0, 0, 1, 4)).toBe(16);
    expect(index3D(3, 3, 3, 4)).toBe(63);
  });

  it("should allocate (size+2)^3 samples", () => {
    const field = createApronField(16);
    expect(field).toBeInstanceOf(Uint8Array);
    expect(field.length).toBe(18 * 18 * 18);
  });

  it("should include a 1-voxel apron around the chunk", () => {
    const size = 2;
    const origin = { x: 10, y: 20, z: 30 };
    const field = createApronField(size);

    fillApronField(field, {
      size,
      origin,
      materialAt: (x, y, z) => {
        // mark just a few known cells so the test is easy to read
        if (x === origin.x - 1 && y === origin.y && z === origin.z) return 7;
        if (x === origin.x + size && y === origin.y + 1 && z === origin.z + 1) return 9;
        return 0;
      },
    });

    const dim = size + 2;
    // local (0,1,1) => world (origin.x-1, origin.y, origin.z)
    expect(field[index3D(0, 1, 1, dim)]).toBe(7);
    // local (3,2,2) => world (origin.x+size, origin.y+1, origin.z+1)
    expect(field[index3D(3, 2, 2, dim)]).toBe(9);
  });
});
