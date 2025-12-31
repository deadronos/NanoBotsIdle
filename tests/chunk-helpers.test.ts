import { beforeEach,describe, expect, it, vi } from "vitest";

import { ensureNeighborChunksForMinedVoxel,populateChunkVoxels } from "../src/components/world/chunkHelpers";
import { getVoxelMaterialAt,MATERIAL_AIR,MATERIAL_SOLID  } from "../src/sim/collision";

// Mock the collision module
vi.mock("../src/sim/collision", () => {
  return {
    MATERIAL_SOLID: 1,
    MATERIAL_AIR: 0,
    getVoxelMaterialAt: vi.fn(),
  };
});


describe("components/world/chunkHelpers", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("populateChunkVoxels", () => {
    it("should add voxels for solid materials", () => {
      const addVoxel = vi.fn();
      const mockGetVoxelMaterialAt = vi.mocked(getVoxelMaterialAt);

      // Setup a 2x2x2 chunk (size 2)
      // Mock some to be solid, some to be air
      mockGetVoxelMaterialAt.mockImplementation((x, y, z) => {
        if (x === 0 && y === 0 && z === 0) return MATERIAL_SOLID;
        return MATERIAL_AIR;
      });

      populateChunkVoxels({
        cx: 0,
        cy: 0,
        cz: 0,
        chunkSize: 2,
        prestigeLevel: 1,
        addVoxel,
      });

      expect(addVoxel).toHaveBeenCalledTimes(1);
      expect(addVoxel).toHaveBeenCalledWith(0, 0, 0);
    });

    it("should scan the correct range of coordinates", () => {
        const addVoxel = vi.fn();
        const mockGetVoxelMaterialAt = vi.mocked(getVoxelMaterialAt);
        mockGetVoxelMaterialAt.mockReturnValue(MATERIAL_AIR);

        const chunkSize = 2;
        const cx = 1, cy = 0, cz = 0;

        populateChunkVoxels({
          cx, cy, cz,
          chunkSize,
          prestigeLevel: 1,
          addVoxel,
        });

        // Should scan from x=[2,3], y=[0,1], z=[0,1]
        expect(mockGetVoxelMaterialAt).toHaveBeenCalledWith(2, 0, 0, 1);
        expect(mockGetVoxelMaterialAt).toHaveBeenCalledWith(3, 1, 1, 1);
        expect(mockGetVoxelMaterialAt).toHaveBeenCalledTimes(chunkSize * chunkSize * chunkSize);
      });
  });

  describe("ensureNeighborChunksForMinedVoxel", () => {
    it("should add neighbor chunk if mined voxel is at lx=0", () => {
      const addChunk = vi.fn();
      // Chunk size 10. Voxel at 10, 5, 5.
      // cx=1. lx=0.
      // Should add chunk cx-1 = 0.
      ensureNeighborChunksForMinedVoxel({
        x: 10, y: 5, z: 5,
        chunkSize: 10,
        addChunk,
      });

      expect(addChunk).toHaveBeenCalledWith(0, 0, 0); // cx-1, cy, cz
    });

    it("should add neighbor chunk if mined voxel is at lx=chunkSize-1", () => {
      const addChunk = vi.fn();
      // Chunk size 10. Voxel at 19, 5, 5.
      // cx=1. lx=9.
      // Should add chunk cx+1 = 2.
      ensureNeighborChunksForMinedVoxel({
        x: 19, y: 5, z: 5,
        chunkSize: 10,
        addChunk,
      });

      expect(addChunk).toHaveBeenCalledWith(2, 0, 0);
    });

    it("should add neighbor chunk if mined voxel is at ly=0", () => {
      const addChunk = vi.fn();
      // Voxel at 5, 10, 5. cy=1, ly=0.
      ensureNeighborChunksForMinedVoxel({
        x: 5, y: 10, z: 5,
        chunkSize: 10,
        addChunk,
      });

      expect(addChunk).toHaveBeenCalledWith(0, 0, 0); // cx, cy-1, cz
    });

    it("should add neighbor chunk if mined voxel is at ly=chunkSize-1", () => {
      const addChunk = vi.fn();
      // Voxel at 5, 19, 5. cy=1, ly=9.
      ensureNeighborChunksForMinedVoxel({
        x: 5, y: 19, z: 5,
        chunkSize: 10,
        addChunk,
      });

      expect(addChunk).toHaveBeenCalledWith(0, 2, 0); // cx, cy+1, cz
    });

    it("should add neighbor chunk if mined voxel is at lz=0", () => {
        const addChunk = vi.fn();
        ensureNeighborChunksForMinedVoxel({
          x: 5, y: 5, z: 10,
          chunkSize: 10,
          addChunk,
        });

        expect(addChunk).toHaveBeenCalledWith(0, 0, 0); // cx, cy, cz-1
      });

      it("should add neighbor chunk if mined voxel is at lz=chunkSize-1", () => {
        const addChunk = vi.fn();
        ensureNeighborChunksForMinedVoxel({
          x: 5, y: 5, z: 19,
          chunkSize: 10,
          addChunk,
        });

        expect(addChunk).toHaveBeenCalledWith(0, 0, 2); // cx, cy, cz+1
      });

    it("should not add neighbor chunk if mined voxel is internal", () => {
      const addChunk = vi.fn();
      // Voxel at 15, 15, 15. lx=5, ly=5, lz=5.
      ensureNeighborChunksForMinedVoxel({
        x: 15, y: 15, z: 15,
        chunkSize: 10,
        addChunk,
      });

      expect(addChunk).not.toHaveBeenCalled();
    });
  });
});
