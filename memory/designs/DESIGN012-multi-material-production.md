# DESIGN012: Multi-Material/Ore Systems & Smelting/Refinery Chain

**Status:** Draft  
**Related Task:** TBD  
**Date Created:** 2026-01-12  
**Last Updated:** 2026-01-12

## Overview

Expand the economy from single-value voxels to multi-material ore types with production chains, enabling crafting/refining mechanics and deeper strategic gameplay.

## Problem Statement

Current system limitations:
- All voxels yield generic "resources" → credits
- No material differentiation beyond height-based value tiers
- No crafting or transformation mechanics
- Limited late-game progression depth
- Strategic choices end at "mine faster" vs "mine more"

## Goals

1. Add distinct ore/material types (Stone, Iron, Gold, Gems, etc.)
2. Implement smelting/refining chains (Ore → Ingots → Products)
3. Create production buildings (Refineries, Smelters)
4. Support automated production via building-assigned drones
5. Balance multi-step economies for engaging progression

## Non-Goals

- Full factory simulation (no conveyor belts, pipes)
- Real-time chemistry/physics (keep it abstract)
- Trading between players (single-player focus)
- Infinite production chains (cap at 3-4 steps)

## EARS Requirements

### Ubiquitous Requirements (UR)
- **UR-1**: All material types SHALL be defined in configuration (not hardcoded)
- **UR-2**: All production recipes SHALL be configurable (inputs, outputs, duration)
- **UR-3**: System SHALL support at least 10 material types without performance degradation

### Event-Driven Requirements (ED)
- **ED-1**: WHEN a voxel is mined, THEN its material type SHALL be determined by biome + height + noise
- **ED-2**: WHEN materials are deposited at a Refinery, THEN a production job SHALL queue
- **ED-3**: WHEN a production job completes, THEN output materials SHALL be added to building storage
- **ED-4**: WHEN player places a Refinery, THEN drones SHALL be assignable to prioritize that building
- **ED-5**: WHEN player opens crafting UI, THEN available recipes SHALL display with ingredient requirements

### Unwanted Behaviors (UB)
- **UB-1**: IF production input is unavailable, THEN job SHALL pause (not fail/delete)
- **UB-2**: IF a building is destroyed, THEN stored materials SHALL drop to ground (not vanish)
- **UB-3**: IF recipe balance breaks economy, THEN config SHALL be patchable without code changes

### State-Driven Requirements (SD)
- **SD-1**: WHILE a Refinery is processing, ITS visual SHALL show smoke/particles
- **SD-2**: WHILE production is paused (missing inputs), THEN building SHALL show warning icon
- **SD-3**: WHILE assigned drones are mining for a building, THEY SHALL prioritize specified materials

### Optional Features (OP)
- **OP-1**: IF prestige level > 15, THEN advanced recipes MAY unlock (e.g., Steel, Alloys)
- **OP-2**: IF performance allows, THEN production MAY chain automatically (Refinery → Smelter)
- **OP-3**: IF future research system added, THEN recipes MAY require tech unlocks

## Architecture

### Material Type System

```typescript
// src/config/materials.ts
export type MaterialType =
  | "stone"
  | "coal"
  | "iron_ore"
  | "copper_ore"
  | "gold_ore"
  | "diamond"
  | "iron_ingot"   // Refined
  | "copper_ingot" // Refined
  | "gold_ingot"   // Refined
  | "steel"        // Advanced
  | "circuit";     // Advanced

export type MaterialConfig = {
  id: MaterialType;
  name: string;
  color: number; // Hex color for voxel rendering
  baseValue: number; // Credits if sold raw
  rarity: number; // 0.0 - 1.0 (affects spawn chance)
  minDepth: number; // Min Y level for spawning
  maxDepth: number; // Max Y level
  biomes?: string[]; // Optional biome restriction
};

export const defaultMaterialConfigs: MaterialConfig[] = [
  {
    id: "stone",
    name: "Stone",
    color: 0x808080,
    baseValue: 1,
    rarity: 0.8,
    minDepth: -100,
    maxDepth: 50,
  },
  {
    id: "coal",
    name: "Coal",
    color: 0x202020,
    baseValue: 2,
    rarity: 0.3,
    minDepth: -50,
    maxDepth: 20,
  },
  {
    id: "iron_ore",
    name: "Iron Ore",
    color: 0xd4a574,
    baseValue: 5,
    rarity: 0.15,
    minDepth: -30,
    maxDepth: 10,
  },
  {
    id: "copper_ore",
    name: "Copper Ore",
    color: 0xb87333,
    baseValue: 4,
    rarity: 0.2,
    minDepth: -40,
    maxDepth: 15,
  },
  {
    id: "gold_ore",
    name: "Gold Ore",
    color: 0xffd700,
    baseValue: 10,
    rarity: 0.05,
    minDepth: -60,
    maxDepth: -10,
  },
  {
    id: "diamond",
    name: "Diamond",
    color: 0x00ffff,
    baseValue: 50,
    rarity: 0.01,
    minDepth: -80,
    maxDepth: -30,
  },
  // Refined materials (not found in world)
  {
    id: "iron_ingot",
    name: "Iron Ingot",
    color: 0xc0c0c0,
    baseValue: 15,
    rarity: 0,
    minDepth: 0,
    maxDepth: 0,
  },
  {
    id: "copper_ingot",
    name: "Copper Ingot",
    color: 0xff8c00,
    baseValue: 12,
    rarity: 0,
    minDepth: 0,
    maxDepth: 0,
  },
  {
    id: "gold_ingot",
    name: "Gold Ingot",
    color: 0xffaa00,
    baseValue: 30,
    rarity: 0,
    minDepth: 0,
    maxDepth: 0,
  },
];
```

### Production Recipe System

```typescript
// src/config/recipes.ts
export type RecipeInput = {
  material: MaterialType;
  amount: number;
};

export type RecipeOutput = {
  material: MaterialType;
  amount: number;
};

export type Recipe = {
  id: string;
  name: string;
  inputs: RecipeInput[];
  outputs: RecipeOutput[];
  duration: number; // Seconds
  buildingType: BuildingType; // Which building can process this
};

export type BuildingType = "smelter" | "refinery" | "assembler";

export const defaultRecipes: Recipe[] = [
  {
    id: "smelt_iron",
    name: "Smelt Iron",
    inputs: [
      { material: "iron_ore", amount: 2 },
      { material: "coal", amount: 1 },
    ],
    outputs: [{ material: "iron_ingot", amount: 1 }],
    duration: 5.0,
    buildingType: "smelter",
  },
  {
    id: "smelt_copper",
    name: "Smelt Copper",
    inputs: [
      { material: "copper_ore", amount: 2 },
      { material: "coal", amount: 1 },
    ],
    outputs: [{ material: "copper_ingot", amount: 1 }],
    duration: 4.0,
    buildingType: "smelter",
  },
  {
    id: "smelt_gold",
    name: "Smelt Gold",
    inputs: [
      { material: "gold_ore", amount: 3 },
      { material: "coal", amount: 2 },
    ],
    outputs: [{ material: "gold_ingot", amount: 1 }],
    duration: 8.0,
    buildingType: "smelter",
  },
  {
    id: "refine_steel",
    name: "Refine Steel",
    inputs: [
      { material: "iron_ingot", amount: 3 },
      { material: "coal", amount: 2 },
    ],
    outputs: [{ material: "steel", amount: 1 }],
    duration: 10.0,
    buildingType: "refinery",
  },
  {
    id: "craft_circuit",
    name: "Craft Circuit",
    inputs: [
      { material: "copper_ingot", amount: 2 },
      { material: "gold_ingot", amount: 1 },
    ],
    outputs: [{ material: "circuit", amount: 1 }],
    duration: 12.0,
    buildingType: "assembler",
  },
];
```

### Building System

```typescript
// src/engine/buildings.ts
export type BuildingType = "smelter" | "refinery" | "assembler";

export type ProductionJob = {
  recipeId: string;
  startTime: number; // Timestamp
  duration: number;
  paused: boolean; // If missing inputs
};

export type Building = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  z: number;
  level: number;
  storage: { [material: MaterialType]: number };
  capacity: number;
  currentJob: ProductionJob | null;
  assignedDrones: Set<number>; // Drone IDs
};

export class BuildingManager {
  private buildings: Map<string, Building> = new Map();

  createBuilding(type: BuildingType, x: number, y: number, z: number): Building {
    const id = `${type}-${Date.now()}-${Math.random()}`;
    const building: Building = {
      id,
      type,
      x,
      y,
      z,
      level: 1,
      storage: {},
      capacity: 200, // Config-driven
      currentJob: null,
      assignedDrones: new Set(),
    };
    this.buildings.set(id, building);
    return building;
  }

  startProduction(buildingId: string, recipeId: string, now: number): boolean {
    const building = this.buildings.get(buildingId);
    const recipe = getRecipe(recipeId);
    if (!building || !recipe) return false;

    // Check inputs
    for (const input of recipe.inputs) {
      if ((building.storage[input.material] ?? 0) < input.amount) {
        return false; // Not enough materials
      }
    }

    // Consume inputs
    for (const input of recipe.inputs) {
      building.storage[input.material] -= input.amount;
    }

    // Start job
    building.currentJob = {
      recipeId,
      startTime: now,
      duration: recipe.duration,
      paused: false,
    };
    return true;
  }

  tickProduction(buildingId: string, now: number) {
    const building = this.buildings.get(buildingId);
    if (!building || !building.currentJob) return;

    const job = building.currentJob;
    const elapsed = now - job.startTime;

    if (elapsed >= job.duration) {
      // Job complete
      const recipe = getRecipe(job.recipeId);
      for (const output of recipe.outputs) {
        building.storage[output.material] =
          (building.storage[output.material] ?? 0) + output.amount;
      }
      building.currentJob = null;
    }
  }

  assignDrone(buildingId: string, droneId: number) {
    const building = this.buildings.get(buildingId);
    if (building) {
      building.assignedDrones.add(droneId);
    }
  }
}
```

### Voxel Material Assignment

```typescript
// src/engine/world/initWorld.ts
export const assignVoxelMaterial = (
  x: number,
  y: number,
  z: number,
  biome: string,
  noise: number,
  cfg: Config,
): MaterialType => {
  // Filter materials valid for this depth
  const validMaterials = cfg.materials.filter(
    (m) => y >= m.minDepth && y <= m.maxDepth && m.rarity > 0,
  );

  if (validMaterials.length === 0) return "stone"; // Fallback

  // Weighted random selection based on rarity + noise
  const seed = noise + x * 73856093 + y * 19349663 + z * 83492791;
  const rng = seededRandom(seed);

  const totalWeight = validMaterials.reduce((sum, m) => sum + m.rarity, 0);
  let roll = rng() * totalWeight;

  for (const material of validMaterials) {
    roll -= material.rarity;
    if (roll <= 0) {
      return material.id;
    }
  }

  return "stone"; // Fallback
};

// Update world generation to store material types
export const initWorld = (cfg: Config) => {
  // ... existing generation logic
  
  for (const voxel of surfaceVoxels) {
    const material = assignVoxelMaterial(
      voxel.x,
      voxel.y,
      voxel.z,
      voxel.biome,
      voxel.noise,
      cfg,
    );
    voxel.material = material; // Store material type
    voxel.color = getMaterialColor(material, cfg); // Visual color
  }
};
```

### Drone Material Prioritization

```typescript
// src/engine/tickDrones.ts
// Update targeting to prioritize materials for assigned buildings

export const getRandomTarget = (
  world: WorldModel,
  drone: Drone,
  buildingManager: BuildingManager,
  cfg: Config,
) => {
  // ... existing frontier logic

  // If drone is assigned to a building, prioritize its needed materials
  const assignment = buildingManager.getDroneAssignment(drone.id);
  if (assignment) {
    const building = buildingManager.getBuilding(assignment.buildingId);
    const recipe = getRecipe(assignment.recipeId);
    
    if (recipe) {
      const neededMaterials = recipe.inputs.map(i => i.material);
      
      // Filter candidates to prioritize needed materials
      const priorityCandidates = candidates.filter(([_k, x, y, z]) => {
        const voxel = world.getVoxel(x, y, z);
        return neededMaterials.includes(voxel.material);
      });

      if (priorityCandidates.length > 0) {
        candidates = priorityCandidates;
      }
    }
  }

  // ... rest of targeting logic
};
```

### UI Components

```typescript
// src/components/ui/BuildingPanel.tsx
export const BuildingPanel: React.FC<{ buildingId: string }> = ({ buildingId }) => {
  const building = useBuildingManager().getBuilding(buildingId);
  const availableRecipes = getRecipesForBuilding(building.type);

  const handleStartRecipe = (recipeId: string) => {
    useBuildingManager().startProduction(buildingId, recipeId, Date.now());
  };

  return (
    <div className="building-panel">
      <h3>{building.type} (Level {building.level})</h3>
      
      <div className="storage">
        <h4>Storage ({getTotalStored(building)}/{building.capacity})</h4>
        {Object.entries(building.storage).map(([mat, qty]) => (
          <div key={mat} className="material-row">
            <span>{getMaterialName(mat)}</span>
            <span>{qty}</span>
          </div>
        ))}
      </div>

      <div className="recipes">
        <h4>Available Recipes</h4>
        {availableRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            canCraft={canCraftRecipe(building, recipe)}
            onClick={() => handleStartRecipe(recipe.id)}
          />
        ))}
      </div>

      {building.currentJob && (
        <div className="production-status">
          <h4>Producing: {getRecipe(building.currentJob.recipeId).name}</h4>
          <ProgressBar
            elapsed={Date.now() - building.currentJob.startTime}
            total={building.currentJob.duration}
          />
        </div>
      )}
    </div>
  );
};

// src/components/ui/RecipeCard.tsx
export const RecipeCard: React.FC<{ recipe: Recipe; canCraft: boolean; onClick: () => void }> = ({
  recipe,
  canCraft,
  onClick,
}) => {
  return (
    <div className={`recipe-card ${canCraft ? "craftable" : "locked"}`}>
      <h5>{recipe.name}</h5>
      <div className="recipe-inputs">
        {recipe.inputs.map((input) => (
          <span key={input.material}>
            {input.amount}x {getMaterialName(input.material)}
          </span>
        ))}
      </div>
      <div className="recipe-arrow">→</div>
      <div className="recipe-outputs">
        {recipe.outputs.map((output) => (
          <span key={output.material}>
            {output.amount}x {getMaterialName(output.material)}
          </span>
        ))}
      </div>
      <div className="recipe-duration">{recipe.duration}s</div>
      <button onClick={onClick} disabled={!canCraft}>
        Start Production
      </button>
    </div>
  );
};
```

## Testing Strategy

### Unit Tests

```typescript
// tests/materials.test.ts
describe("Material assignment", () => {
  test("assigns materials based on depth", () => {
    const ironOre = assignVoxelMaterial(0, -20, 0, "plains", 0.5, cfg);
    expect(["iron_ore", "copper_ore", "stone"]).toContain(ironOre);
    
    const diamond = assignVoxelMaterial(0, -70, 0, "plains", 0.5, cfg);
    // Diamond should have low chance but be possible
  });

  test("respects biome restrictions", () => {
    // If gold only spawns in desert biomes
    cfg.materials.find(m => m.id === "gold_ore").biomes = ["desert"];
    const material = assignVoxelMaterial(0, -50, 0, "plains", 0.5, cfg);
    expect(material).not.toBe("gold_ore");
  });
});

// tests/recipes.test.ts
describe("Recipe system", () => {
  test("production consumes inputs correctly", () => {
    const building = createBuilding("smelter");
    building.storage = { iron_ore: 10, coal: 5 };
    
    const success = buildingManager.startProduction(building.id, "smelt_iron", 0);
    expect(success).toBe(true);
    expect(building.storage.iron_ore).toBe(8); // 10 - 2
    expect(building.storage.coal).toBe(4); // 5 - 1
  });

  test("production generates outputs on completion", () => {
    const building = createBuilding("smelter");
    building.currentJob = {
      recipeId: "smelt_iron",
      startTime: 0,
      duration: 5.0,
      paused: false,
    };
    
    buildingManager.tickProduction(building.id, 5.1); // After completion
    expect(building.storage.iron_ingot).toBe(1);
    expect(building.currentJob).toBeNull();
  });

  test("cannot start production without inputs", () => {
    const building = createBuilding("smelter");
    building.storage = { iron_ore: 1 }; // Not enough
    
    const success = buildingManager.startProduction(building.id, "smelt_iron", 0);
    expect(success).toBe(false);
  });
});

// tests/drone-material-priority.test.ts
describe("Drone material prioritization", () => {
  test("assigned drones prioritize building needs", () => {
    const building = createBuilding("smelter");
    building.assignedDrones.add(drone.id);
    buildingManager.setActiveRecipe(building.id, "smelt_iron");
    
    const target = getRandomTarget(world, drone, buildingManager, cfg);
    const voxel = world.getVoxel(target.x, target.y, target.z);
    
    expect(["iron_ore", "coal"]).toContain(voxel.material);
  });

  test("unassigned drones mine any material", () => {
    const target = getRandomTarget(world, drone, buildingManager, cfg);
    // Should not crash, can target anything
    expect(target).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// tests/production-chain.integration.test.ts
describe("Production chain end-to-end", () => {
  test("ore → ingot → steel chain completes", async () => {
    // Setup: Mine iron ore and coal
    const world = createWorld();
    const smelter = buildingManager.createBuilding("smelter", 0, 10, 0);
    const refinery = buildingManager.createBuilding("refinery", 10, 10, 0);
    
    // Simulate mining
    smelter.storage = { iron_ore: 6, coal: 3 };
    
    // Smelt iron
    buildingManager.startProduction(smelter.id, "smelt_iron", 0);
    await advanceTime(5.1);
    expect(smelter.storage.iron_ingot).toBe(1);
    
    // Repeat to get 3 ingots
    buildingManager.startProduction(smelter.id, "smelt_iron", 5.1);
    buildingManager.startProduction(smelter.id, "smelt_iron", 10.2);
    await advanceTime(15.3);
    expect(smelter.storage.iron_ingot).toBe(3);
    
    // Transfer to refinery (manual or via hauler)
    refinery.storage = { iron_ingot: 3, coal: 2 };
    
    // Refine steel
    buildingManager.startProduction(refinery.id, "refine_steel", 15.3);
    await advanceTime(25.4);
    expect(refinery.storage.steel).toBe(1);
  });
});
```

## Balance Considerations

### Material Rarity Curve
- **Stone**: 80% (ubiquitous)
- **Coal**: 30% (common fuel)
- **Iron/Copper**: 15-20% (common ores)
- **Gold**: 5% (rare)
- **Diamond**: 1% (very rare)

### Recipe Balance
- **Early game**: Stone → Coal (basic)
- **Mid game**: Ore → Ingots (requires smelter)
- **Late game**: Ingots → Alloys/Circuits (requires multiple buildings)

### Credit Values
- **Raw ores**: Low value (incentivize refining)
- **Refined ingots**: 3x ore value
- **Advanced products**: 10x ore value
- **Rationale**: Reward production chains over raw selling

## Performance Considerations

1. **Material lookup**: Store material ID as integer (not string) in voxel data
2. **Recipe matching**: Index recipes by building type for O(1) lookup
3. **Production tick**: Only tick buildings with active jobs (not all buildings)
4. **Storage updates**: Batch UI updates (not per-material change)

## Migration Notes

### Save Version 4 → 5
- **New fields**: `materials`, `buildings`, `recipes`
- **Voxel data**: Add `material: MaterialType` to each voxel
- **Backward compatibility**: Old saves treat all voxels as "stone"

### Migration Code
```typescript
export const migrateV4ToV5 = (v4: SaveV4): SaveV5 => {
  return {
    ...v4,
    version: 5,
    buildings: v4.buildings ?? [],
    voxels: v4.voxels.map(v => ({
      ...v,
      material: v.material ?? "stone", // Default to stone
    })),
  };
};
```

## Future Enhancements

1. **Automation**: Auto-transfer materials between buildings
2. **Tech tree**: Unlock advanced recipes via research
3. **Quality tiers**: Normal/Rare/Epic ores with stat bonuses
4. **Decay**: Materials degrade over time (incentivize active play)
5. **Trading post**: NPC buy/sell for price discovery

## Implementation Phases

### Phase 1: Material Types
- Define material configs
- Update voxel data structure with material field
- Implement material assignment in world generation
- Visual colors for material types
- Unit tests for material assignment

### Phase 2: Recipe System
- Define recipe configs
- Implement recipe validation (inputs/outputs)
- Unit tests for recipe logic

### Phase 3: Building System
- Create Building entity with storage
- Implement production job system
- BuildingManager class with tick logic
- Integration tests for production cycles

### Phase 4: Drone Integration
- Material-aware targeting
- Drone assignment to buildings
- Prioritization logic for assigned drones

### Phase 5: UI & Polish
- BuildingPanel component
- RecipeCard component
- Visual production indicators
- Save migration v4→v5

## Acceptance Criteria

- [ ] Material type system with 10+ materials
- [ ] Config-driven material properties (rarity, depth, value)
- [ ] Voxels assigned materials during world generation
- [ ] Recipe system with inputs/outputs/duration
- [ ] Building entity with storage and production queue
- [ ] Production jobs consume inputs and generate outputs
- [ ] Drones can be assigned to buildings
- [ ] Assigned drones prioritize building material needs
- [ ] BuildingPanel UI shows storage and recipes
- [ ] RecipeCard UI shows requirements and progress
- [ ] Unit tests for materials, recipes, buildings (>90% coverage)
- [ ] Integration test for full production chain
- [ ] Save migration v4→v5 with material data
- [ ] Performance: 60fps with 5 buildings active
- [ ] Documentation updated

## References

- `memory/designs/DESIGN009-logistics-system.md` - Logistics foundation
- `memory/designs/DESIGN011-storage-outpost-enhancements.md` - Storage system
- `docs/ARCHITECTURE/GAME001-progression-loop.md` - Progression design
- `docs/ARCHITECTURE/GAME002-logistics-and-economy.md` - Economy design
- `src/config/materials.ts` - Material definitions (to be created)
- `src/config/recipes.ts` - Recipe definitions (to be created)
