import { describe, expect, test } from "vitest";

import { advanceFixedStep } from "./fixedStep";

describe("advanceFixedStep", () => {
  test("accumulates partial frames without stepping", () => {
    let steps = 0;
    const result = advanceFixedStep(0, 1 / 120, 1 / 60, 5, () => {
      steps += 1;
    });

    expect(steps).toBe(0);
    expect(result.accumulator).toBeCloseTo(1 / 120);
    expect(result.alpha).toBeCloseTo(0.5);
  });

  test("steps exactly once when delta meets the step", () => {
    let steps = 0;
    const result = advanceFixedStep(0, 1 / 60, 1 / 60, 5, () => {
      steps += 1;
    });

    expect(steps).toBe(1);
    expect(result.accumulator).toBeCloseTo(0);
    expect(result.alpha).toBeCloseTo(0);
  });

  test("clamps catch-up steps to the max", () => {
    let steps = 0;
    const result = advanceFixedStep(0, 1, 1 / 60, 5, () => {
      steps += 1;
    });

    expect(steps).toBe(5);
    expect(result.accumulator).toBeCloseTo(0);
    expect(result.alpha).toBeCloseTo(0);
  });

  test("accounts for existing accumulator", () => {
    let steps = 0;
    const result = advanceFixedStep(0.01, 0.01, 1 / 60, 5, () => {
      steps += 1;
    });

    expect(steps).toBe(1);
    expect(result.accumulator).toBeCloseTo(0.01 + 0.01 - 1 / 60);
  });
});
