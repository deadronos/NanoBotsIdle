import { describe, expect, it, vi } from "vitest";

import { getSimBridge } from "../src/simBridge/simBridge";
import * as simControl from "../src/simBridge/simControl";

describe("simControl", () => {
  it("toggles running state by calling start/stop", () => {
    const bridge = getSimBridge();
    const startSpy = vi.spyOn(bridge, "start");
    const stopSpy = vi.spyOn(bridge, "stop");

    // Ensure predictable starting state
    bridge.stop();

    // toggle should call start
    simControl.toggle();
    expect(startSpy).toHaveBeenCalled();

    // Now ensure running and toggle calls stop
    simControl.toggle();
    expect(stopSpy).toHaveBeenCalled();

    startSpy.mockRestore();
    stopSpy.mockRestore();
  });
});
