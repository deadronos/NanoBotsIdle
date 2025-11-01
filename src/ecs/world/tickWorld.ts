import { compileScoringSystem } from "../systems/compileScoringSystem";
import { demandPlanningSystem } from "../systems/demandPlanningSystem";
import { droneAssignmentSystem } from "../systems/droneAssignmentSystem";
import { heatAndPowerSystem } from "../systems/heatAndPowerSystem";
import { movementSystem } from "../systems/movementSystem";
import { pathfindingSystem } from "../systems/pathfindingSystem";
import productionSystem from "../systems/productionSystem";
import { uiSnapshotSystem } from "../systems/uiSnapshotSystem";
import type { System, SystemList } from "../systems/System";
import type { World } from "./World";

const DEFAULT_SYSTEMS: readonly System[] = Object.freeze([
  demandPlanningSystem,
  droneAssignmentSystem,
  pathfindingSystem,
  movementSystem,
  productionSystem,
  heatAndPowerSystem,
  compileScoringSystem,
  uiSnapshotSystem,
]);

export const DEFAULT_SYSTEM_ORDER = DEFAULT_SYSTEMS.map((system) => system.id);

export interface TickOptions {
  systems?: SystemList;
  clampDtToZero?: boolean;
}

const normalizeDt = (dt: number, clamp: boolean): number => {
  if (!Number.isFinite(dt)) {
    return 0;
  }
  if (clamp && dt < 0) {
    return 0;
  }
  return dt;
};

export const getDefaultSystems = (): SystemList => [...DEFAULT_SYSTEMS];

export const tickWorld = (
  world: World,
  dt: number,
  options: TickOptions = {},
): void => {
  const systems = options.systems ?? DEFAULT_SYSTEMS;
  const clampedDt = normalizeDt(dt, options.clampDtToZero ?? true);

  for (const system of systems) {
    system.update(world, clampedDt);
  }

  world.globals.simTimeSeconds += clampedDt;
};
