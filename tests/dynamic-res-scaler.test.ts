import { describe, expect,it } from "vitest";

import { DynamicResScaler } from "../src/components/DynamicResScaler";

describe("DynamicResScaler", () => {
  it("exports a function component", () => {
    expect(typeof DynamicResScaler).toBe("function");
  });
});
