import { computeHeatRatio } from "../../sim/balance";
import { useGameStore } from "../../state/store";
import type { Phase, UISnapshot } from "../../state/types";
import type { System } from "./System";
import type { World } from "../world/World";
import type { EntityType } from "../../types/entities";

const DEFAULT_RATE_HZ = 10;

export interface UISnapshotSystemConfig {
  rateHz?: number;
  publish?(snapshot: UISnapshot): void;
  phaseResolver?(world: World): Phase;
}

const clampFinite = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? value : fallback;

const toTitle = (value: string): string =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);

const sanitizeEntityType = (type: EntityType | undefined): string => {
  if (!type) {
    return "Structure";
  }
  if (type === "drone") {
    return "Drone";
  }
  return toTitle(type);
};

const deriveDefaultPhase = (world: World): Phase => {
  if (world.globals.overclockEnabled) {
    return 3;
  }

  if (world.globals.simTimeSeconds >= 5 * 60) {
    return 2;
  }

  return 1;
};

const buildBottlenecks = (world: World): string[] => {
  const pendingHauls = world.taskRequests.filter(
    (task) => task.status === "pending",
  ).length;

  const bottlenecks: string[] = [];

  if (pendingHauls > 0) {
    bottlenecks.push(`${pendingHauls} logistics task(s) pending`);
  }

  if (world.globals.heatSafeCap > 0) {
    const ratio = world.globals.heatCurrent / world.globals.heatSafeCap;
    if (ratio >= 0.95) {
      bottlenecks.push("Heat at critical levels");
    }
  }

  return bottlenecks;
};

const deriveSnapshot = (
  world: World,
  resolvePhase: (world: World) => Phase,
): UISnapshot => {
  const { globals } = world;
  const heatRatio = computeHeatRatio(globals);
  const phase = resolvePhase(world);
  const projectedShards = Math.max(0, clampFinite(globals.projectedShards));

  const drones = Object.entries(world.droneBrain).map(([idStr, brain]) => {
    const id = Number(idStr);
    const position = world.position[id];

    return {
      id,
      x: clampFinite(position?.x ?? 0),
      y: clampFinite(position?.y ?? 0),
      role: brain.role,
    };
  });

  drones.sort((a, b) => a.id - b.id);

  const buildings = Object.keys(world.entityType)
    .filter((idStr) => world.entityType[Number(idStr)] !== "drone")
    .map((idStr) => {
      const id = Number(idStr);
      const entityType = world.entityType[id];
      const position = world.position[id];
      const producer = world.producer[id];
      const powerState = world.powerLink[id];
      const heatSource = world.heatSource[id];

      return {
        id,
        x: clampFinite(position?.x ?? 0),
        y: clampFinite(position?.y ?? 0),
        type: sanitizeEntityType(entityType),
        tier: producer?.tier,
        online: powerState?.online ?? true,
        heat: heatSource?.heatPerSecond,
      };
    });

  buildings.sort((a, b) => a.id - b.id);

  return {
    heatCurrent: clampFinite(globals.heatCurrent),
    heatSafeCap: clampFinite(globals.heatSafeCap),
    heatRatio,
    powerAvailable: clampFinite(globals.powerAvailable),
    powerDemand: clampFinite(globals.powerDemand),
    throughput: Math.max(0, clampFinite(globals.throughputPerSec)),
    projectedShards,
    currentPhase: phase,
    simTimeSeconds: clampFinite(globals.simTimeSeconds),
    overclockEnabled: Boolean(globals.overclockEnabled),
    canFork: phase >= 2,
    canPrestige: phase === 3 || projectedShards >= 1,
    bottlenecks: buildBottlenecks(world),
    drones,
    buildings,
  };
};

const createDefaultPublisher =
  () =>
  (snapshot: UISnapshot): void => {
    useGameStore.setState(
      {
        uiSnapshot: snapshot,
        projectedCompileShards: Math.max(0, snapshot.projectedShards),
        currentPhase: snapshot.currentPhase,
      },
      false,
      "uiSnapshotSystem/publish",
    );
  };

const sanitizeRate = (rateHz: number | undefined): number => {
  if (!Number.isFinite(rateHz ?? NaN)) {
    return DEFAULT_RATE_HZ;
  }
  const rate = Number(rateHz);
  return rate > 0 ? rate : DEFAULT_RATE_HZ;
};

export const createUISnapshotSystem = (
  config: UISnapshotSystemConfig = {},
): System => {
  const rateHz = sanitizeRate(config.rateHz);
  const intervalSeconds = 1 / rateHz;
  const publish = config.publish ?? createDefaultPublisher();
  const resolvePhase = config.phaseResolver ?? deriveDefaultPhase;

  let timeUntilNext = 0;
  let hasPublished = false;

  return {
    id: "uiSnapshot",
    update: (world, dt) => {
      const delta = Number.isFinite(dt) && dt > 0 ? dt : 0;

      if (hasPublished) {
        timeUntilNext -= delta;
        if (timeUntilNext > 0) {
          return;
        }
      }

      const snapshot = deriveSnapshot(world, resolvePhase);
      publish(snapshot);

      hasPublished = true;
      timeUntilNext = intervalSeconds;
    },
  };
};

export const uiSnapshotSystem = createUISnapshotSystem();

export default uiSnapshotSystem;

export const snapshotForWorld = (world: World): UISnapshot =>
  deriveSnapshot(world, deriveDefaultPhase);
