import { BufferGeometry, Mesh } from "three";
import { describe, expect, it } from "vitest";

import { resolveProgressiveLod } from "../src/render/lodUtils";

const makeMeshWithLods = () => {
  const high = new BufferGeometry();
  const low = new BufferGeometry();
  const mesh = new Mesh(high);
  mesh.userData.lodGeometries = { high, low };
  return mesh;
};

describe("progressive LOD", () => {
  it("delays high LOD promotion when low LOD is available", () => {
    const mesh = makeMeshWithLods();
    const config = { enabled: true, refineDelayFrames: 2 };

    let lod = resolveProgressiveLod(mesh, "high", config);
    expect(lod).toBe("low");
    mesh.userData.lod = lod;

    lod = resolveProgressiveLod(mesh, "high", config);
    expect(lod).toBe("low");
    mesh.userData.lod = lod;

    lod = resolveProgressiveLod(mesh, "high", config);
    expect(lod).toBe("high");
  });

  it("clears progressive state when downgrading", () => {
    const mesh = makeMeshWithLods();
    const config = { enabled: true, refineDelayFrames: 2 };

    let lod = resolveProgressiveLod(mesh, "high", config);
    expect(lod).toBe("low");
    mesh.userData.lod = lod;

    lod = resolveProgressiveLod(mesh, "hidden", config);
    expect(lod).toBe("hidden");
    expect(mesh.userData.lodTarget).toBeUndefined();
    expect(mesh.userData.lodRefineFrames).toBeUndefined();
  });
});
