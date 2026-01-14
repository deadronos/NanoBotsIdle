import { describe, expect, it } from "vitest";

import {
  getTelemetryCollector,
  resetTelemetryCollector,
  TelemetryCollector,
  type TelemetrySnapshot,
} from "../src/telemetry";

describe("telemetry index exports", () => {
  it("re-exports collector API", () => {
    expect(typeof getTelemetryCollector).toBe("function");
    expect(typeof resetTelemetryCollector).toBe("function");
    expect(typeof TelemetryCollector).toBe("function");

    // Type-only smoke: ensures TelemetrySnapshot is exported (compile-time)
    const _snapshot: TelemetrySnapshot | null = null;
    expect(_snapshot).toBeNull();
  });
});
