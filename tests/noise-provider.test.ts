import { expect, test } from "vitest";

import { createNoiseProvider } from "../src/sim/noise";

test("createNoiseProvider deterministic for given seed and coords (sincos)", () => {
  const p1 = createNoiseProvider(42, "sincos");
  const p2 = createNoiseProvider(42, "sincos");

  expect(p1.noise2D(10, 20)).toBeCloseTo(p2.noise2D(10, 20));
  expect(p1.noise2D(-5.3, 12.1)).toBeCloseTo(p2.noise2D(-5.3, 12.1));
});

test("createNoiseProvider deterministic for given seed and coords (open-simplex)", () => {
  const p1 = createNoiseProvider(42, "open-simplex");
  const p2 = createNoiseProvider(42, "open-simplex");

  expect(p1.noise2D(10, 20)).toBeCloseTo(p2.noise2D(10, 20));
  expect(p1.noise2D(-5.3, 12.1)).toBeCloseTo(p2.noise2D(-5.3, 12.1));
});
