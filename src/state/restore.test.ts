import { afterEach, describe, expect, it } from "vitest";

import { clearSaves, importSave, applySaveToStore } from "./saveManager";
import { useGameStore } from "./store";

afterEach(() => {
  clearSaves();
  // reset store minimal fields
  useGameStore.setState({ compileShardsBanked: 0, totalPrestiges: 0 });
});

describe("restore save to store", () => {
  it("applies imported legacy save into the in-memory store", async () => {
    const legacy = {
      version: 1,
      timestamp: Date.now(),
      meta: {
        compileShards: 12,
      },
      run: {
        globals: { overclockEnabled: true },
        snapshot: { heatCurrent: 5, simTimeSeconds: 10 },
        projectedCompileShards: 3,
        forkPoints: 2,
        currentPhase: 1,
      },
    };

    const okImport = importSave(JSON.stringify(legacy));
    expect(okImport).toBe(true);

    const applied = await applySaveToStore();
    expect(applied).toBe(true);

    const state = useGameStore.getState();
    expect(state.compileShardsBanked).toBe(12);
    expect(state.forkPoints).toBeGreaterThanOrEqual(2);
    expect(state.world.globals.overclockEnabled).toBe(true);
    expect(state.uiSnapshot.simTimeSeconds).toBe(10);
  });
});
