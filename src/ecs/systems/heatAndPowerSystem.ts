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

  // Heat cascade failure mechanics
  const heatRatio = world.globals.heatSafeCap > 0 
    ? world.globals.heatCurrent / world.globals.heatSafeCap 
    : 0;

  // Buildings start failing when heat exceeds 150% of safe cap
  if (heatRatio > 1.5) {
    Object.entries(world.producer).forEach(([idStr, producer]) => {
      const id = Number(idStr);
      const powerLink = world.powerLink[id];
      
      if (!powerLink) return;

      // Failure probability increases with heat
      // At 1.5x: 1% per second, at 2.0x: 10% per second, at 3.0x: 50% per second
      const failureChance = Math.min(0.5, Math.pow((heatRatio - 1.5) / 1.5, 2) * 0.5);
      
      if (Math.random() < failureChance * dt) {
        // Building goes offline due to heat damage
        powerLink.online = false;
        producer.active = false;
      }
    });
  }

  // Simple power management (everyone online for now)
  let totalPowerDemand = 0;
  Object.values(world.powerLink).forEach((link) => {
    totalPowerDemand += link.demand;
    // Buildings can be forced offline by heat cascade
    // link.online is already set by cascade failure logic above
  });

  world.globals.powerDemand = totalPowerDemand;
}
