import { describe, expect, it, vi } from "vitest";
import { BufferGeometry, Mesh } from "three";

import {
  applyLodGeometry,
  disposeLodGeometries,
  type LodGeometries,
} from "../src/render/lodGeometry";

describe("lodGeometry", () => {
  it("applyLodGeometry is a no-op without userData.lodGeometries", () => {
    const mesh = new Mesh(new BufferGeometry(), undefined as never);
    const original = mesh.geometry;

    applyLodGeometry(mesh, "low");

    expect(mesh.geometry).toBe(original);
  });

  it("applyLodGeometry swaps geometry when low is available", () => {
    const high = new BufferGeometry();
    const low = new BufferGeometry();
    const mesh = new Mesh(high, undefined as never);

    const geometries: LodGeometries = { high, low };
    mesh.userData.lodGeometries = geometries;

    applyLodGeometry(mesh, "low");
    expect(mesh.geometry).toBe(low);

    applyLodGeometry(mesh, "high");
    expect(mesh.geometry).toBe(high);
  });

  it("disposeLodGeometries disposes both, but not twice when shared", () => {
    const high = new BufferGeometry();
    const low = new BufferGeometry();

    const highDispose = vi.spyOn(high, "dispose");
    const lowDispose = vi.spyOn(low, "dispose");

    disposeLodGeometries({ high, low });
    expect(highDispose).toHaveBeenCalledTimes(1);
    expect(lowDispose).toHaveBeenCalledTimes(1);

    const shared = new BufferGeometry();
    const sharedDispose = vi.spyOn(shared, "dispose");
    disposeLodGeometries({ high: shared, low: shared });
    expect(sharedDispose).toHaveBeenCalledTimes(1);
  });
});

