import { World } from "../world/World";
import { getProducerOutputPerSec } from "../../sim/balance";

export function productionSystem(world: World, dt: number) {
  Object.entries(world.producer).forEach(([idStr, producer]) => {
    const id = Number(idStr);
    const inv = world.inventory[id];
    
    if (!inv || !producer.active) return;

    // Check if we have required inputs
    let canProduce = true;
    for (const [resource, amount] of Object.entries(producer.recipe.inputs)) {
      const have = inv.contents[resource as keyof typeof inv.contents] || 0;
      if (have < (amount || 0)) {
        canProduce = false;
        producer.active = false;
        break;
      }
    }

    if (!canProduce) return;

    producer.active = true;

    // Calculate effective production rate with heat penalty
    const outputRate = getProducerOutputPerSec({
      baseRate: producer.baseRate,
      tier: producer.tier,
      heatCurrent: world.globals.heatCurrent,
      heatSafeCap: world.globals.heatSafeCap,
    });

    // Apply overclock multiplier if enabled
    const overclockable = world.overclockable[id];
    const rateMult = world.globals.overclockEnabled && overclockable
      ? overclockable.overRateMult
      : 1.0;

    const effectiveRate = outputRate * rateMult;

    // Progress towards completion
    const progressDelta = (effectiveRate * dt) / producer.recipe.batchTimeSeconds;
    producer.progress += progressDelta;

    // Complete batch
    if (producer.progress >= 1.0) {
      producer.progress = 0;

      // Consume inputs
      for (const [resource, amount] of Object.entries(producer.recipe.inputs)) {
        inv.contents[resource as keyof typeof inv.contents] = 
          (inv.contents[resource as keyof typeof inv.contents] || 0) - (amount || 0);
      }

      // Produce outputs
      for (const [resource, amount] of Object.entries(producer.recipe.outputs)) {
        inv.contents[resource as keyof typeof inv.contents] = 
          (inv.contents[resource as keyof typeof inv.contents] || 0) + (amount || 0);
      }
    }
  });
}
