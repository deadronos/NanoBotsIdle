// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

// We'll mock @react-three/fiber so the component registers frame callbacks we can call
const frameCallbacks: (() => void)[] = [];
const setDprMock = vi.fn();

vi.mock("@react-three/fiber", () => ({
  useFrame: (cb: () => void) => {
    frameCallbacks.push(cb);
  },
  useThree: (selector: (s: { setDpr: (d: number) => void }) => unknown) => selector({ setDpr: setDprMock }),
}));

// Import after mock is set up so the module picks up the mocked hooks
import { DynamicResScaler } from "../src/components/DynamicResScaler";
import { MAX_DPR } from "../src/utils/dynamicResScaler";

describe("DynamicResScaler integration", () => {
  beforeEach(() => {
    frameCallbacks.length = 0;
    setDprMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes DPR on mount and reacts to low FPS", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    // Control performance.now to predictable values
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    act(() => {
      root.render(<DynamicResScaler />);
    });

    // After mount, initDpr should have called setDpr with MAX_DPR
    expect(setDprMock).toHaveBeenCalledWith(MAX_DPR);

    // Simulate frames: call callback multiple times to increment frameCount
    expect(frameCallbacks.length).toBeGreaterThan(0);
    const cb = frameCallbacks[0];

    // simulate 10 frames during 2 seconds => fps = 5 (well below target)
    for (let i = 0; i < 10; i++) cb();
    // advance time beyond CHECK_INTERVAL (500ms) so the callback will compute fps
    now += 2000;
    // call callback once more to trigger the CHECK_INTERVAL branch
    cb();

    // setDpr should have been called again with a lower DPR
    const calls = setDprMock.mock.calls.flat();
    expect(calls.length).toBeGreaterThan(1);
    const first = calls[0];
    const second = calls[1];
    expect(first).toBe(MAX_DPR);
    expect(second).toBeLessThanOrEqual(first);

    root.unmount();
    container.remove();
  });
});
