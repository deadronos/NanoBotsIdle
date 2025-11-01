import { describe, it, expect } from 'vitest';
import { createWorld, spawnBuildingAt } from '../ecs/world/createWorld';

describe('spawnBuildingAt', () => {
  it('registers an entity and assigns a position for known types', () => {
    const world = createWorld({ meta: { swarm: { congestionAvoidanceLevel: 0, prefetchUnlocked: false, startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 } }, bio: { startingRadius: 4, startingExtractorTier: 1, passiveCoolingBonus: 0 }, compiler: { compileYieldMult: 1, overclockEfficiencyBonus: 0, recycleBonus: 0 } }, spawnEntities: false, initialEntityId: 0 });

    const id = spawnBuildingAt(world, 'storage', 10, 12);
    expect(world.position[id]).toBeDefined();
    expect(world.position[id].x).toBe(10);
    expect(world.position[id].y).toBe(12);
    expect(world.entityType[id]).toBe('building');
  });
});
