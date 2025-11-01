import type { System } from "../systems/System";
import { getDefaultSystems, tickWorld, type TickOptions } from "./tickWorld";
import type { World } from "./World";

export interface TickHarnessConfig extends TickOptions {
  steps?: number;
  skipSystemExecution?: boolean;
}

export interface TickHarnessResult {
  callOrder: string[];
}

const wrapSystems = (
  systems: readonly System[],
  callOrder: string[],
  skipExecution: boolean,
): System[] =>
  systems.map((system) => ({
    id: system.id,
    update: skipExecution
      ? () => {
          callOrder.push(system.id);
        }
      : (world: World, dt: number) => {
          callOrder.push(system.id);
          system.update(world, dt);
        },
  }));

export const runTickHarness = (
  world: World,
  dt: number,
  config: TickHarnessConfig = {},
): TickHarnessResult => {
  const steps = config.steps ?? 1;
  const callOrder: string[] = [];
  const {
    systems = getDefaultSystems(),
    skipSystemExecution = false,
    clampDtToZero,
  } = config;
  const wrappedSystems = wrapSystems(systems, callOrder, skipSystemExecution);

  for (let i = 0; i < steps; i += 1) {
    tickWorld(world, dt, { systems: wrappedSystems, clampDtToZero });
  }

  return { callOrder };
};
