import { afterEach, describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  migrateSaveBlob,
  type GameSaveBlob,
} from "./migrations";
import { createSaveBlob, deserializeGameState } from "./persistence";
import { useGameStore } from "./store";

afterEach(() => {
  useGameStore.setState({
    compileShardsBanked: 0,
    totalPrestiges: 0,
  });
});

describe("migrations", () => {
  it("migrates legacy blobs to the current schema", () => {
    const legacy: GameSaveBlob = {
      version: 1,
      meta: {
        compileShards: 12,
      },
      run: {},
    };

    const migrated = migrateSaveBlob(legacy, CURRENT_SCHEMA_VERSION);

    expect(migrated.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.meta.compileShardsBanked).toBe(12);
    expect(migrated.meta.totalPrestiges).toBe(0);
    expect(
      (migrated.meta.compilerOptimization as Record<string, unknown>)
        .compileYieldMult,
    ).toBe(1);
  });

  it("serializes and deserializes current state through migrations", () => {
    useGameStore.setState({
      compileShardsBanked: 5,
      totalPrestiges: 2,
    });

    const state = useGameStore.getState();
    const blob = createSaveBlob(state);
    expect(blob.version).toBe(CURRENT_SCHEMA_VERSION);

    const roundTrip = deserializeGameState(JSON.stringify(blob));
    expect(roundTrip.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(roundTrip.meta.compileShardsBanked).toBe(5);
    expect(roundTrip.meta.totalPrestiges).toBe(2);
  });
});
