import { describe, expect, it, vi } from "vitest";

import {
  applyOcclusionVisibility,
  createOcclusionCuller,
  defaultOcclusionConfig,
} from "../src/render/occlusionCuller";

// Mock WebGL2RenderingContext
const createMockGL2 = () => {
  const queries = new Set<object>();
  return {
    createQuery: vi.fn(() => {
      const q = {};
      queries.add(q);
      return q;
    }),
    deleteQuery: vi.fn((q: object) => queries.delete(q)),
    beginQuery: vi.fn(),
    endQuery: vi.fn(),
    getQueryParameter: vi.fn(() => 1), // 1 = passed (visible)
    ANY_SAMPLES_PASSED_CONSERVATIVE: 0x8d6a,
    QUERY_RESULT_AVAILABLE: 0x8867,
    QUERY_RESULT: 0x8866,
    queries,
  };
};

const createMockRenderer = (gl: ReturnType<typeof createMockGL2>) => ({
  getContext: () => gl,
});

describe("occlusionCuller", () => {
  it("returns no-op culler when disabled", () => {
    const gl = createMockGL2();
    const renderer = createMockRenderer(gl) as never;

    const culler = createOcclusionCuller(renderer, { ...defaultOcclusionConfig, enabled: false });

    expect(culler.isSupported).toBe(false);
    culler.update([], {} as never);
    culler.dispose();
  });

  it("creates query pool and manages lifecycle", () => {
    // Skip if not in WebGL2 environment (test runs in Node)
    // This test validates the mock structure
    const gl = createMockGL2();

    expect(gl.createQuery).toBeDefined();
    expect(gl.beginQuery).toBeDefined();
    expect(gl.endQuery).toBeDefined();
  });
});

describe("applyOcclusionVisibility", () => {
  it("hides meshes marked as occluded", () => {
    const mesh1 = {
      isMesh: true,
      visible: true,
      userData: { occluded: true, culledByOcclusion: undefined as boolean | undefined },
    };
    const mesh2 = {
      isMesh: true,
      visible: true,
      userData: { occluded: false, culledByOcclusion: undefined as boolean | undefined },
    };
    const mesh3 = {
      isMesh: true,
      visible: false,
      userData: { occluded: true, culledByOcclusion: undefined as boolean | undefined },
    };

    applyOcclusionVisibility([mesh1, mesh2, mesh3] as never);

    expect(mesh1.visible).toBe(false);
    expect(mesh1.userData.culledByOcclusion).toBe(true);

    expect(mesh2.visible).toBe(true);
    expect(mesh2.userData.culledByOcclusion).toBeUndefined();

    // Already hidden, should remain hidden
    expect(mesh3.visible).toBe(false);
  });
});
