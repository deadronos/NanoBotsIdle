import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clearSaves, loadAll, saveAll } from "./saveManager";
import { useGameStore } from "./store";
import { CURRENT_SCHEMA_VERSION } from "./migrations";

afterEach(() => {
  clearSaves();
});

describe("saveManager", () => {
  beforeEach(() => {
    // reset store minimal fields
    useGameStore.setState({ compileShardsBanked: 0, totalPrestiges: 0 });
  });

  it("saves and loads meta and run separately", () => {
    const state = useGameStore.getState();
    state.compileShardsBanked = 7;
    state.totalPrestiges = 1;

    const ok = saveAll(state);
    expect(ok).toBe(true);

    const loaded = loadAll();
    expect(loaded).not.toBeNull();
    if (!loaded) return;
    expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded.meta.compileShardsBanked).toBe(7);
    expect(loaded.meta.totalPrestiges).toBe(1);
  });
});
