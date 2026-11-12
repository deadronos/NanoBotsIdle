import { expect, test } from "vitest";

import { forEachForwardChunkColumn } from "../src/components/world/voxelLayerMeshed/forwardChunkColumns";

test("prefetches only forward columns beyond the local radius and follows camera turns", () => {
  const columns: number[][] = [];
  const visit = (x: number, z: number) => columns.push([x, z]);

  forEachForwardChunkColumn(-2, -3, 1, 0, 1, visit);
  expect(columns.splice(0)).toEqual([
    [0, -3],
    [0, -4],
    [0, -2],
    [1, -3],
    [1, -4],
    [1, -2],
  ]);

  forEachForwardChunkColumn(-2, -3, 0, -1, 1, visit);
  expect(columns).toHaveLength(6);
  expect(columns.every(([, z]) => z < -4)).toBe(true);
});
