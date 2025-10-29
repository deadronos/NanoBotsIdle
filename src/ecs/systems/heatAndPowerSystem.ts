import { World } from "../world/World";
import { EntityId } from "../world/EntityId";

/**
 * Calculate power grid connectivity using flood-fill from Core through PowerVeins.
 * Buildings within connection range of Core or connected PowerVeins are powered.
 */
function updatePowerConnectivity(world: World) {
  const CONNECTION_RANGE = 3; // Buildings within this range of Core or PowerVein are connected
  
  // Reset all connections except Core
  Object.entries(world.powerLink).forEach(([idStr, link]) => {
    const id = Number(idStr);
    const type = world.entityType[id];
    if (type === "Core") {
      link.connectedToGrid = true;
    } else {
      link.connectedToGrid = false;
    }
  });
  
  // Find Core position
  const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
  if (!coreId) return;
  
  const corePos = world.position[Number(coreId)];
  if (!corePos) return;
  
  // Find all PowerVeins and mark them as connected if in range of Core or other connected PowerVeins
  const powerVeins: EntityId[] = [];
  Object.entries(world.entityType).forEach(([idStr, type]) => {
    if (type === "PowerVein") {
      powerVeins.push(Number(idStr));
    }
  });
  
  // Iteratively connect PowerVeins (flood-fill)
  let changed = true;
  while (changed) {
    changed = false;
    for (const veinId of powerVeins) {
      const link = world.powerLink[veinId];
      if (link.connectedToGrid) continue;
      
      const veinPos = world.position[veinId];
      if (!veinPos) continue;
      
      // Check if in range of Core
      const distToCore = Math.sqrt((veinPos.x - corePos.x) ** 2 + (veinPos.y - corePos.y) ** 2);
      if (distToCore <= CONNECTION_RANGE) {
        link.connectedToGrid = true;
        changed = true;
        continue;
      }
      
      // Check if in range of any connected PowerVein
      for (const otherVeinId of powerVeins) {
        if (veinId === otherVeinId) continue;
        const otherLink = world.powerLink[otherVeinId];
        if (!otherLink.connectedToGrid) continue;
        
        const otherPos = world.position[otherVeinId];
        if (!otherPos) continue;
        
        const dist = Math.sqrt((veinPos.x - otherPos.x) ** 2 + (veinPos.y - otherPos.y) ** 2);
        if (dist <= CONNECTION_RANGE) {
          link.connectedToGrid = true;
          changed = true;
          break;
        }
      }
    }
  }
  
  // Connect all other buildings within range of Core or connected PowerVeins
  Object.entries(world.powerLink).forEach(([idStr, link]) => {
    const id = Number(idStr);
    const type = world.entityType[id];
    
    // Skip Core and PowerVeins (already processed)
    if (type === "Core" || type === "PowerVein") return;
    
    const pos = world.position[id];
    if (!pos) return;
    
    // Check if in range of Core
    const distToCore = Math.sqrt((pos.x - corePos.x) ** 2 + (pos.y - corePos.y) ** 2);
    if (distToCore <= CONNECTION_RANGE) {
      link.connectedToGrid = true;
      return;
    }
    
    // Check if in range of any connected PowerVein
    for (const veinId of powerVeins) {
      const veinLink = world.powerLink[veinId];
      if (!veinLink.connectedToGrid) continue;
      
      const veinPos = world.position[veinId];
      if (!veinPos) continue;
      
      const dist = Math.sqrt((pos.x - veinPos.x) ** 2 + (pos.y - veinPos.y) ** 2);
      if (dist <= CONNECTION_RANGE) {
        link.connectedToGrid = true;
        return;
      }
    }
  });
}

export function heatAndPowerSystem(world: World, dt: number) {
  // Update power grid connectivity
  updatePowerConnectivity(world);
  
  // Calculate heat ratio for cascade failure check
  const heatRatio = world.globals.heatSafeCap > 0 
    ? world.globals.heatCurrent / world.globals.heatSafeCap 
    : 0;
  
  // Calculate power demand and set online status
  let totalPowerDemand = 0;
  Object.entries(world.powerLink).forEach(([idStr, link]) => {
    const id = Number(idStr);
    const type = world.entityType[id];
    
    // PowerVeins don't consume power, just transmit it
    if (type === "PowerVein") {
      link.online = true;
      return;
    }
    
    // Buildings must be connected to grid to be online
    // But can also be forced offline by heat cascade failure
    link.online = link.connectedToGrid;
    
    // Heat cascade failure mechanics
    // Buildings start failing when heat exceeds 150% of safe cap
    if (heatRatio > 1.5 && link.online) {
      const producer = world.producer[id];
      if (producer) {
        // Failure probability increases with heat
        // At 1.5x: 1% per second, at 2.0x: 10% per second, at 3.0x: 50% per second
        const failureChance = Math.min(0.5, Math.pow((heatRatio - 1.5) / 1.5, 2) * 0.5);
        
        if (Math.random() < failureChance * dt) {
          // Building goes offline due to heat damage
          link.online = false;
        }
      }
    }
    
    if (link.online) {
      totalPowerDemand += link.demand;
    }
  });
  
  world.globals.powerDemand = totalPowerDemand;
  world.globals.powerAvailable = 100; // Simplified: Core provides unlimited power for now
  
  // Disable producers that are offline
  Object.entries(world.producer).forEach(([idStr, producer]) => {
    const id = Number(idStr);
    const link = world.powerLink[id];
    
    // If building is offline, deactivate producer
    if (link && !link.online) {
      producer.active = false;
    } else if (link && link.online) {
      // Restore activity if it was offline before
      // (actual production depends on resources, handled in productionSystem)
      producer.active = true;
    }
  });
  
  // Sum heat generation (only from active producers that are online)
  let totalHeat = 0;
  Object.entries(world.heatSource).forEach(([idStr, source]) => {
    const id = Number(idStr);
    const producer = world.producer[id];
    const powerLink = world.powerLink[id];
    const overclockable = world.overclockable[id];

    // Only generate heat if producer is active AND online
    const shouldGenerateHeat = (!producer || producer.active) && (!powerLink || powerLink.online);
    if (!shouldGenerateHeat) return;

    let heatMult = 1.0;
    if (world.globals.overclockEnabled && overclockable) {
      heatMult = overclockable.heatMultiplier;
    }

    totalHeat += source.heatPerSecond * heatMult * dt;
  });

  // Sum cooling (only from online coolers)
  let totalCooling = 0;
  Object.entries(world.heatSink).forEach(([idStr, sink]) => {
    const id = Number(idStr);
    const powerLink = world.powerLink[id];
    
    // Coolers only work if they're online
    if (powerLink && !powerLink.online) return;
    
    totalCooling += sink.coolingPerSecond * dt;
  });

  // Update heat
  world.globals.heatCurrent += totalHeat - totalCooling;
  world.globals.heatCurrent = Math.max(0, world.globals.heatCurrent);

  // Track stress time if overclocking and hot
  if (world.globals.overclockEnabled && world.globals.heatCurrent > world.globals.heatSafeCap) {
    world.globals.stressSecondsAccum += dt;
  }
}
