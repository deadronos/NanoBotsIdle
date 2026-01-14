import { BoxGeometry, BufferGeometry, Mesh } from "three";
import { describe, expect, it, vi } from "vitest";

import {
  applyOcclusionVisibility,
  createOcclusionCuller,
  defaultOcclusionConfig,
} from "../src/render/occlusionCuller";

type FakeQuery = { id: number };

class FakeWebGL2RenderingContext {
  static nextQueryId = 1;

  ANY_SAMPLES_PASSED_CONSERVATIVE = 0x8d6a;
  QUERY_RESULT_AVAILABLE = 0x8867;
  QUERY_RESULT = 0x8866;

  beginQuery = vi.fn();
  endQuery = vi.fn();

  createQuery = vi.fn((): FakeQuery => ({ id: FakeWebGL2RenderingContext.nextQueryId++ }));
  deleteQuery = vi.fn();

  getQueryParameter = vi.fn((_query: FakeQuery, pname: number) => {
    if (pname === this.QUERY_RESULT_AVAILABLE) return true;
    if (pname === this.QUERY_RESULT) return 0; // occluded
    return 0;
  });
}

describe("occlusionCuller", () => {
  it("returns a no-op culler when disabled", () => {
    const renderer = { getContext: () => ({}) } as never;
    const culler = createOcclusionCuller(renderer, { ...defaultOcclusionConfig, enabled: false });

    expect(culler.isSupported).toBe(false);
    expect(() => culler.update([], {} as never)).not.toThrow();
    expect(() => culler.dispose()).not.toThrow();
  });

  it("can run the WebGL2 query lifecycle and set occluded flag", () => {
    vi.stubGlobal("WebGL2RenderingContext", FakeWebGL2RenderingContext as never);

    const gl2 = new FakeWebGL2RenderingContext();
    const renderer = { getContext: () => gl2, render: vi.fn(), autoClear: false } as never;
    const culler = createOcclusionCuller(renderer, {
      enabled: true,
      queryDelayFrames: 1,
      maxQueriesPerFrame: 4,
    });

    expect(culler.isSupported).toBe(true);

    const geometry = new BoxGeometry(1, 1, 1);
    const mesh = new Mesh(geometry, undefined as never);
    mesh.visible = true;

    // First update issues query and sets pendingFrames
    culler.update([mesh], {} as never);
    expect(gl2.beginQuery).toHaveBeenCalledTimes(1);
    expect(gl2.endQuery).toHaveBeenCalledTimes(1);

    // Second update consumes query result and stamps occlusion on userData
    culler.update([mesh], {} as never);
    expect(mesh.userData.occluded).toBe(true);

    culler.dispose();
    expect(gl2.deleteQuery).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("applyOcclusionVisibility hides meshes only when visible and occluded", () => {
    const geometry = new BufferGeometry();
    const a = new Mesh(geometry, undefined as never);
    a.visible = true;
    a.userData.occluded = true;

    const b = new Mesh(geometry, undefined as never);
    b.visible = true;
    b.userData.occluded = false;

    const c = new Mesh(geometry, undefined as never);
    c.visible = false;
    c.userData.occluded = true;

    applyOcclusionVisibility([a, b, c]);

    expect(a.visible).toBe(false);
    expect(a.userData.culledByOcclusion).toBe(true);

    expect(b.visible).toBe(true);
    expect(b.userData.culledByOcclusion).toBeUndefined();

    expect(c.visible).toBe(false);
    expect(c.userData.culledByOcclusion).toBeUndefined();
  });
});
