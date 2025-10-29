import { World } from "../world/World";

export function compileScoringSystem(world: World, dt: number) {
  // Track throughput (simplified: sum all producer rates)
  let currentThroughput = 0;
  Object.values(world.producer).forEach((producer) => {
    if (producer.active) {
      currentThroughput += producer.baseRate * Math.pow(producer.tier, 1.5);
    }
  });

  world.globals.peakThroughput = Math.max(
    world.globals.peakThroughput,
    currentThroughput
  );

  // Track cohesion (simplified: increment if no starved buildings)
  let allSatisfied = true;
  Object.values(world.producer).forEach((producer) => {
    if (!producer.active) {
      allSatisfied = false;
    }
  });

  if (allSatisfied) {
    world.globals.cohesionScore += dt;
  }
}
