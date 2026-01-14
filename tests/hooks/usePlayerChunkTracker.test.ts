// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePlayerChunkTracker } from "../../src/components/world/hooks/usePlayerChunkTracker";
import { playerChunk, playerPosition } from "../../src/engine/playerState";
import { getSimBridge } from "../../src/simBridge/simBridge";

vi.mock("../../src/simBridge/simBridge", () => ({
  getSimBridge: vi.fn(),
}));

describe("usePlayerChunkTracker", () => {
  let mockBridge: {
    onFrame: (cb: (frame: unknown) => void) => () => void;
    enqueue?: (...args: unknown[]) => unknown;
  };
  let onFrameCallback: ((frame: unknown) => void) | null;

  beforeEach(() => {
    onFrameCallback = null;
    mockBridge = {
      onFrame: vi.fn((cb) => {
        onFrameCallback = cb;
        return vi.fn();
      }),
      enqueue: vi.fn(),
    };
    (getSimBridge as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue(mockBridge);

    // Reset player state
    playerPosition.set(0, 0, 0);
    playerChunk.cx = 0;
    playerChunk.cy = 0;
    playerChunk.cz = 0;
  });

  it("updates playerChunk and debug bounds when player moves to new chunk", () => {
    const updateDebugBounds = vi.fn();
    const sentFrontierChunkRef = { current: false };
    const chunkSize = 10;

    renderHook(() =>
      usePlayerChunkTracker({
        chunkSize,
        voxelRenderMode: "dense",
        updateDebugBounds,
        sentFrontierChunkRef,
      }),
    );

    // Simulate frame
    expect(onFrameCallback).toBeDefined();

    // Move player to 15, 0, 0 (chunk 1, 0, 0)
    playerPosition.set(15, 0, 0);

    onFrameCallback({}); // Call frame handler

    expect(playerChunk.cx).toBe(1);
    expect(updateDebugBounds).toHaveBeenCalledWith(1, 0, 0);
  });

  it("sends SET_PLAYER_CHUNK in frontier mode when moved", () => {
    const updateDebugBounds = vi.fn();
    const sentFrontierChunkRef = { current: false };
    const chunkSize = 10;

    renderHook(() =>
      usePlayerChunkTracker({
        chunkSize,
        voxelRenderMode: "frontier",
        updateDebugBounds,
        sentFrontierChunkRef,
      }),
    );

    playerPosition.set(15, 0, 0);
    onFrameCallback({});

    expect(mockBridge.enqueue).toHaveBeenCalledWith({
      t: "SET_PLAYER_CHUNK",
      cx: 1,
      cy: 0,
      cz: 0,
    });
    expect(sentFrontierChunkRef.current).toBe(true);
  });

  it("sends SET_PLAYER_CHUNK if frontier mode and not sent yet (even if not moved)", () => {
    const updateDebugBounds = vi.fn();
    const sentFrontierChunkRef = { current: false };
    const chunkSize = 10;

    renderHook(() =>
      usePlayerChunkTracker({
        chunkSize,
        voxelRenderMode: "frontier",
        updateDebugBounds,
        sentFrontierChunkRef,
      }),
    );

    // Player is at 0,0,0. Chunk is 0,0,0.
    // Loop runs.
    onFrameCallback({});

    expect(mockBridge.enqueue).toHaveBeenCalledWith({
      t: "SET_PLAYER_CHUNK",
      cx: 0,
      cy: 0,
      cz: 0,
    });
    expect(sentFrontierChunkRef.current).toBe(true);
  });
});
