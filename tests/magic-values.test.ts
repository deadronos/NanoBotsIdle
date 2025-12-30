import { describe, expect, it } from "vitest";

// TDD: failing test first — expect the scanner to find at least one magic value in `src/`
import { findMagicValues } from "../scripts/find-magic-values.js";

describe("magic values scanner (TDD)", () => {
  it("should find at least one magic numeric literal in source files", async () => {
    const results = await findMagicValues({ root: "src" });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });
});
