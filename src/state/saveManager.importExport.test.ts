import { afterEach, describe, expect, it } from "vitest";

import { clearSaves, exportSave, importSave, loadAll } from "./saveManager";
import { CURRENT_SCHEMA_VERSION } from "./migrations";

afterEach(() => {
  clearSaves();
});

describe("saveManager import/export and migration", () => {
  it("imports legacy v1 save and migrates to current schema", () => {
    const legacy = {
      version: 1,
      timestamp: Date.now(),
      meta: {
        compileShards: 12,
      },
      run: {},
    };

    const payload = JSON.stringify(legacy);
    const ok = importSave(payload);
    expect(ok).toBe(true);

    const loaded = loadAll();
    expect(loaded).not.toBeNull();
    if (!loaded) return;
    expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded.meta.compileShardsBanked).toBe(12);
    expect(loaded.meta.totalPrestiges).toBe(0);
    expect((loaded.meta.compilerOptimization as any).compileYieldMult).toBe(1);
  });

  it("exports a saved state as a JSON string", () => {
    // nothing saved yet -> exportSave returns null
    const nothing = exportSave();
    expect(nothing).toBeNull();
  });
});
