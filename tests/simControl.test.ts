import { describe, expect, it, vi } from "vitest";

import { getSimBridge } from "../src/simBridge/simBridge";
import * as simControl from "../src/simBridge/simControl";

describe("simControl", () => {
  it("toggles running state by calling start/pause", () => {
    const bridge = getSimBridge();
    const startSpy = vi.spyOn(bridge, "start");
    const pauseSpy = vi.spyOn(bridge, "pause");

    // Ensure predictable starting state
    bridge.stop();

    // toggle should call start
    simControl.toggle();
    expect(startSpy).toHaveBeenCalled();

    // Now ensure running and toggle calls pause
    simControl.toggle();
    expect(pauseSpy).toHaveBeenCalled();

    startSpy.mockRestore();
    pauseSpy.mockRestore();
    bridge.stop();
  });
});
