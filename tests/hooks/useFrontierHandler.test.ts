// @vitest-environment jsdom
import React from "react";
import { render } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useFrontierHandler, type UseFrontierHandlerProps } from "../../src/components/world/hooks/useFrontierHandler";
import { playerChunk } from "../../src/engine/playerState";
import { resetVoxelEdits } from "../../src/sim/collision";
import { getSimBridge } from "../../src/simBridge/simBridge";

import { renderHook } from "../utils/renderHook";

vi.mock("../../src/simBridge/simBridge", () => ({
  getSimBridge: vi.fn(),
}));

vi.mock("../../src/sim/collision", () => ({
  resetVoxelEdits: vi.fn(),
}));

describe("useFrontierHandler", () => {
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
    playerChunk.cx = 0;
    playerChunk.cy = 0;
    playerChunk.cz = 0;
    vi.clearAllMocks();
  });

  it("requests frontier snapshot on init when in frontier mode", () => {
    const props = createProps({ voxelRenderMode: "frontier" });
    renderHook(() => useFrontierHandler(props));

    expect(mockBridge.enqueue).toHaveBeenCalledWith({ t: "REQUEST_FRONTIER_SNAPSHOT" });
  });

  it("handles frontierReset", () => {
    const props = createProps({ voxelRenderMode: "frontier" });
    const { result } = renderHook(() => useFrontierHandler(props));

    // Simulate frame with reset
    act(() => {
      onFrameCallback!({ delta: { frontierReset: true } });
    });

    expect(props.resetChunks).toHaveBeenCalled();
    expect(props.clear).toHaveBeenCalled();
    expect(resetVoxelEdits).toHaveBeenCalled();
    expect(props.clearFrontierKeys).toHaveBeenCalled();
    expect(result.current.sentFrontierChunkRef.current).toBe(false);
  });

  it("handles frontierAdd", () => {
    const props = createProps({ voxelRenderMode: "frontier" });
    renderHook(() => useFrontierHandler(props));

    // Simulate add
    const positions = [1, 2, 3]; // x,y,z
    act(() => {
      onFrameCallback!({ delta: { frontierAdd: positions } });
    });

    expect(props.ensureCapacity).toHaveBeenCalled();
    expect(props.addVoxel).toHaveBeenCalledWith(1, 2, 3);
    expect(props.trackFrontierAdd).toHaveBeenCalledWith(positions);
    expect(props.flushRebuild).toHaveBeenCalled();
  });

  it("logs debug info using playerChunk", () => {
    const props = createProps({ voxelRenderMode: "frontier" });
    renderHook(() => useFrontierHandler(props));

    playerChunk.cx = 5;

    const frame = { delta: {} };
    act(() => {
      onFrameCallback!(frame);
    });

    expect(props.logDebugInfo).toHaveBeenCalledWith(5, 0, 0, frame);
  });
});

function createProps(overrides: Partial<UseFrontierHandlerProps> = {}) {
  return {
    voxelRenderMode: "dense",
    addVoxel: vi.fn(),
    removeVoxel: vi.fn(),
    clear: vi.fn(),
    ensureCapacity: vi.fn(),
    solidCountRef: { current: 0 },
    flushRebuild: vi.fn(),
    resetChunks: vi.fn(),
    trackFrontierAdd: vi.fn(),
    trackFrontierRemove: vi.fn(),
    clearFrontierKeys: vi.fn(),
    logDebugInfo: vi.fn(),
    ...overrides,
  } as UseFrontierHandlerProps;
}
