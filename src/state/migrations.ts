export interface GameSaveBlob {
  version: number;
  meta: Record<string, unknown>;
  run: Record<string, unknown>;
}

export interface Migration {
  from: number;
  to: number;
  migrate(blob: GameSaveBlob): GameSaveBlob;
}

export const CURRENT_SCHEMA_VERSION = 3;

const migrations: Migration[] = [];

const cloneBlob = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export const registerMigration = (migration: Migration): void => {
  migrations.push(migration);
  migrations.sort((a, b) => a.from - b.from);
};

export const getRegisteredMigrations = (): readonly Migration[] =>
  migrations.slice();

export const migrateSaveBlob = (
  blob: GameSaveBlob,
  targetVersion = CURRENT_SCHEMA_VERSION,
): GameSaveBlob => {
  let current = cloneBlob(blob);

  if (!Number.isInteger(current.version)) {
    throw new Error("Save blob missing numeric version field");
  }

  if (current.version > targetVersion) {
    throw new Error(
      `Save blob version ${current.version} is newer than supported ${targetVersion}`,
    );
  }

  while (current.version < targetVersion) {
    const migration = migrations.find((m) => m.from === current.version);
    if (!migration) {
      throw new Error(
        `No migration registered for version ${current.version}`,
      );
    }
    current = migration.migrate(current);
  }

  if (current.version !== targetVersion) {
    throw new Error(
      `Migration fell short of target version ${targetVersion}, ended at ${current.version}`,
    );
  }

  return current;
};

registerMigration({
  from: 1,
  to: 2,
  migrate: (blob) => {
    const next = cloneBlob(blob);
    const meta = next.meta as Record<string, unknown>;
    if ("compileShards" in meta && meta.compileShards !== undefined) {
      const shardsValue = Number(meta.compileShards);
      delete meta.compileShards;
      meta.compileShardsBanked = Number.isFinite(shardsValue)
        ? Math.max(0, shardsValue)
        : 0;
    } else if (meta.compileShardsBanked === undefined) {
      meta.compileShardsBanked = 0;
    }

    next.version = 2;
    return next;
  },
});

registerMigration({
  from: 2,
  to: 3,
  migrate: (blob) => {
    const next = cloneBlob(blob);
    const meta = next.meta as Record<string, unknown>;

    if (meta.totalPrestiges === undefined) {
      meta.totalPrestiges = 0;
    }

    if (typeof meta.compilerOptimization !== "object" || meta.compilerOptimization === null) {
      meta.compilerOptimization = {
        compileYieldMult: 1,
        overclockEfficiencyBonus: 0,
        recycleBonus: 0,
      };
    } else {
      const compiler = meta.compilerOptimization as Record<string, unknown>;
      compiler.compileYieldMult = Number.isFinite(
        Number(compiler.compileYieldMult),
      )
        ? compiler.compileYieldMult
        : 1;
      const efficiency = Number(compiler.overclockEfficiencyBonus);
      compiler.overclockEfficiencyBonus = Number.isFinite(efficiency)
        ? efficiency
        : 0;
      const recycle = Number(compiler.recycleBonus);
      compiler.recycleBonus = Number.isFinite(recycle) ? recycle : 0;
    }

    next.version = 3;
    return next;
  },
});
