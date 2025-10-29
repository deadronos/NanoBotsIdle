import { World } from "../world/World";

export function heatAndPowerSystem(world: World, dt: number) {
  // Sum heat generation (only from active producers)
  let totalHeat = 0;
  Object.entries(world.heatSource).forEach(([idStr, source]) => {
    const id = Number(idStr);
    const producer = world.producer[id];
    const overclockable = world.overclockable[id];

    // Only generate heat if producer is active or if it's not a producer (like Core)
    const shouldGenerateHeat = !producer || producer.active;
    if (!shouldGenerateHeat) return;

    let heatMult = 1.0;
    if (world.globals.overclockEnabled && overclockable) {
      heatMult = overclockable.heatMultiplier;
    }

    totalHeat += source.heatPerSecond * heatMult * dt;
  });

  // Sum cooling
  let totalCooling = 0;
  Object.values(world.heatSink).forEach((sink) => {
    totalCooling += sink.coolingPerSecond * dt;
  });

  // Update heat
  world.globals.heatCurrent += totalHeat - totalCooling;
  world.globals.heatCurrent = Math.max(0, world.globals.heatCurrent);

  // Track stress time if overclocking and hot
  if (world.globals.overclockEnabled && world.globals.heatCurrent > world.globals.heatSafeCap) {
    world.globals.stressSecondsAccum += dt;
  }

  // Simple power management (everyone online for now)
  let totalPowerDemand = 0;
  Object.values(world.powerLink).forEach((link) => {
    totalPowerDemand += link.demand;
    link.online = true;
  });

  world.globals.powerDemand = totalPowerDemand;
}
