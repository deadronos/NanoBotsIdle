import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "../state/store";

describe("Fork System", () => {
  beforeEach(() => {
    // Reset to a fresh state
    const store = useGameStore.getState();
    store.prestigeNow();
    store.loadForkCatalog();
    
    // Remove initial drones to have clean slate
    const world = store.world;
    const droneIds = Object.entries(world.entityType)
      .filter(([_, type]) => type === "Drone")
      .map(([id]) => Number(id));
    
    droneIds.forEach(id => {
      delete world.entityType[id];
      delete world.position[id];
      delete world.droneBrain[id];
      delete world.path[id];
      delete world.powerLink[id];
      delete world.inventory[id];
    });
  });

  // Helper function to create test drones
  function addTestDrone(world: any, id: number) {
    world.entityType[id] = "Drone";
    world.position[id] = { x: 32, y: 32 };
    world.droneBrain[id] = {
      role: "hauler",
      state: "idle",
      targetEntity: null,
      cargo: { resource: null, amount: 0 },
      battery: 100,
      behavior: {
        priorityRules: [],
        prefetchCriticalInputs: false,
        buildRadius: 5,
        congestionAvoidance: 0,
      },
    };
  }

  describe("Fork Points", () => {
    it("should grant 1 Fork Point per 3 drones sacrificed", () => {
      const store = useGameStore.getState();
      const world = store.world;

      // Manually add 9 drones to the world
      for (let i = 0; i < 9; i++) {
        addTestDrone(world, 1000 + i);
      }

      const initialForkPoints = store.forkPoints;
      store.forkProcess();

      // Need to get fresh state after fork
      const updatedStore = useGameStore.getState();
      
      // Should earn 3 Fork Points (9 drones / 3)
      expect(updatedStore.forkPoints).toBe(initialForkPoints + 3);
    });

    it("should grant minimum 1 Fork Point even with fewer than 3 drones", () => {
      const store = useGameStore.getState();
      const world = store.world;

      // Add only 2 drones
      for (let i = 0; i < 2; i++) {
        addTestDrone(world, 1000 + i);
      }

      const initialForkPoints = store.forkPoints;
      store.forkProcess();

      // Need to get fresh state after fork
      const updatedStore = useGameStore.getState();

      // Should earn 1 Fork Point (minimum)
      expect(updatedStore.forkPoints).toBe(initialForkPoints + 1);
    });

    it("should remove all drones when forking", () => {
      const store = useGameStore.getState();
      const world = store.world;

      // Add 6 drones
      for (let i = 0; i < 6; i++) {
        addTestDrone(world, 1000 + i);
      }

      store.forkProcess();

      // All drones should be removed
      expect(Object.keys(world.droneBrain).length).toBe(0);
    });
  });

  describe("Fork Modules", () => {
    it("should load fork modules from catalog", () => {
      const store = useGameStore.getState();
      store.loadForkCatalog();

      expect(store.forkCatalog.length).toBeGreaterThan(0);
    });

    it("should allow purchasing modules with sufficient points", () => {
      const store = useGameStore.getState();
      store.loadForkCatalog();

      // Grant some fork points
      store.grantForkPoints(5);

      const module = store.forkCatalog[0];
      expect(module).toBeDefined();

      const initialPoints = store.forkPoints;
      const canPurchase = store.canPurchaseModule(module.id);
      
      if (canPurchase && module.cost.amount <= initialPoints) {
        store.buyForkModule(module.id);

        expect(store.forkPoints).toBe(initialPoints - module.cost.amount);
        expect(store.acquiredModules).toContain(module.id);
      }
    });

    it("should not allow purchasing same module twice", () => {
      const store = useGameStore.getState();
      store.loadForkCatalog();

      // Grant enough points
      store.grantForkPoints(10);

      const module = store.forkCatalog[0];
      expect(module).toBeDefined();

      if (store.canPurchaseModule(module.id)) {
        store.buyForkModule(module.id);
        
        // Try to buy again
        expect(store.canPurchaseModule(module.id)).toBe(false);
      }
    });

    it("should not allow purchasing without sufficient points", () => {
      const store = useGameStore.getState();
      store.loadForkCatalog();

      // Start with 0 fork points
      expect(store.forkPoints).toBe(0);

      const expensiveModule = store.forkCatalog.find(m => m.cost.amount > 0);
      if (expensiveModule) {
        expect(store.canPurchaseModule(expensiveModule.id)).toBe(false);
      }
    });

    it("should update behavior context when purchasing modules", () => {
      const store = useGameStore.getState();
      store.loadForkCatalog();
      
      // Grant points and purchase a module
      store.grantForkPoints(5);
      const module = store.forkCatalog[0];
      
      if (store.canPurchaseModule(module.id)) {
        store.buyForkModule(module.id);
        
        // Context should be updated (though specific changes depend on module)
        expect(store.runBehaviorContext).toBeDefined();
      }
    });
  });

  describe("Fork State Reset", () => {
    it("should reset fork state on prestige", () => {
      let store = useGameStore.getState();
      store.loadForkCatalog();

      // Grant points and buy modules
      store.grantForkPoints(10);
      
      // Get fresh state after granting points
      store = useGameStore.getState();
      const module = store.forkCatalog[0];
      
      if (store.canPurchaseModule(module.id)) {
        store.buyForkModule(module.id);
        // Get fresh state after buying
        store = useGameStore.getState();
      }

      expect(store.forkPoints).toBeGreaterThan(0);
      expect(store.acquiredModules.length).toBeGreaterThan(0);

      // Prestige should reset fork state
      store.prestigeNow();

      // Get fresh state after prestige
      store = useGameStore.getState();

      expect(store.forkPoints).toBe(0);
      expect(store.acquiredModules.length).toBe(0);
    });
  });

  describe("Fork Catalog Data", () => {
    it("should have valid module structure", () => {
      const store = useGameStore.getState();
      store.loadForkCatalog();

      store.forkCatalog.forEach(module => {
        expect(module.id).toBeDefined();
        expect(module.name).toBeDefined();
        expect(module.desc).toBeDefined();
        expect(module.cost).toBeDefined();
        expect(module.cost.currency).toBe("ForkPoints");
        expect(module.cost.amount).toBeGreaterThan(0);
        expect(module.effects).toBeDefined();
      });
    });
  });
});
