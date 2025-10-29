import { World } from "./World";
import { demandPlanningSystem } from "../systems/demandPlanningSystem";
import { droneAssignmentSystem } from "../systems/droneAssignmentSystem";
import { pathfindingSystem } from "../systems/pathfindingSystem";
import { movementSystem } from "../systems/movementSystem";
import { productionSystem } from "../systems/productionSystem";
import { heatAndPowerSystem } from "../systems/heatAndPowerSystem";
import { compileScoringSystem } from "../systems/compileScoringSystem";
import { congestionSystem } from "../systems/congestionSystem";

export function tickWorld(world: World, dt: number) {
  // Update simulation time
  world.globals.simTimeSeconds += dt;

  // Run systems in order
  congestionSystem(world, dt); // Track drone congestion first
  demandPlanningSystem(world, dt);
  droneAssignmentSystem(world, dt);
  pathfindingSystem(world, dt);
  movementSystem(world, dt);
  productionSystem(world, dt);
  heatAndPowerSystem(world, dt);
  compileScoringSystem(world, dt);
}
