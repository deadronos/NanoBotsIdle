// @vitest-environment jsdom
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { chunkKey } from "../../src/components/world/chunkHelpers";
import { useLODManager } from "../../src/components/world/hooks/useLODManager";
import { playerPosition } from "../../src/engine/playerState";
import { getSimBridge } from "../../src/simBridge/simBridge";
import { renderHook } from "../utils/renderHook";

vi.mock("../../src/simBridge/simBridge", () => ({
  getSimBridge: vi.fn(),
}));

describe("useLODManager", () => {
  let mockBridge: {
    onFrame: (cb: (frame: unknown) => void) => () => void;
  };
  let onFrameCallback: ((frame: unknown) => void) | null;

  beforeEach(() => {
    onFrameCallback = null;
    mockBridge = {
      onFrame: vi.fn((cb) => {
        onFrameCallback = cb;
        return vi.fn();
      }),
    };
    (getSimBridge as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue(mockBridge);
    playerPosition.set(0, 0, 0);
  });

  it("updates simplifiedChunks and calls addChunk/removeChunk based on distance", () => {
    const addChunk = vi.fn();
    const removeChunk = vi.fn();
    const activeChunks = { current: new Set<string>() };
    const chunkSize = 10;

    const { result } = renderHook(() =>
      useLODManager({
        chunkSize,
        voxelRenderMode: "dense",
        addChunk,
        removeChunk,
        activeChunks,
      }),
    );

    // Initial state
    expect(result.current.simplifiedChunks).toEqual({});

    // Simulate frame. Player at 0,0,0.
    // Nearby chunks should be added.
    act(() => {
      onFrameCallback!({});
    });

    // Chunk 0,0,0 is distance 0 -> LOD0 -> addChunk
    expect(addChunk).toHaveBeenCalledWith(0, 0, 0);

    // Move player far away
    // chunkSize 10. LOD1 start > 6 chunks (60 units).
    // Let's go to 80, 0, 0 (chunk 8, 0, 0).
    // Chunk 0,0,0 dist to 8,0,0 is 8 chunks (sq 64).
    // LOD0_SQ = 36. LOD1_SQ = 144.
    // So 0,0,0 should be LOD1.

    playerPosition.set(80, 0, 0);
    act(() => {
      onFrameCallback!({});
    });

    // Should remove chunk 0,0,0 from instanced (removeChunk) and add to simplified
    // Expect removeChunk called for 0,0,0
    expect(removeChunk).toHaveBeenCalledWith(0, 0, 0);

    // Check state
    const key = chunkKey(0, 0, 0);
    expect(result.current.simplifiedChunks[key]).toEqual({
      cx: 0,
      cy: 0,
      cz: 0,
      lod: 1,
    });
  });

  it("does nothing in frontier mode", () => {
    const addChunk = vi.fn();
    const removeChunk = vi.fn();
    const activeChunks = { current: new Set<string>() };

    renderHook(() =>
      useLODManager({
        chunkSize: 10,
        voxelRenderMode: "frontier",
        addChunk,
        removeChunk,
        activeChunks,
      }),
    );

    onFrameCallback!({});
    expect(addChunk).not.toHaveBeenCalled();
  });
});
