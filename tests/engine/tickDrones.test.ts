
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tickDrones, Drone, DroneRole, DroneState } from '../../src/engine/tickDrones';
import { WorldModel } from '../../src/engine/world/world';
import { Config } from '../../src/config/index';
import { KeyIndex } from '../../src/engine/keyIndex';
import { UiSnapshot } from '../../src/shared/protocol';

describe('tickDrones', () => {
  let mockWorld: any;
  let defaultDrone: Drone;
  let config: Config;
  let uiSnapshot: UiSnapshot;
  let depositEvents: any[];

  beforeEach(() => {
    mockWorld = {
      getBestOutpost: vi.fn(),
      getNearestOutpost: vi.fn(),
      requestDock: vi.fn(),
      getQueueLength: vi.fn(),
      undock: vi.fn(),
      coordsFromKey: vi.fn(),
      mineVoxel: vi.fn(),
      key: vi.fn(),
      countFrontierAboveWater: vi.fn().mockReturnValue(100),
    };

    defaultDrone = {
      id: 1,
      x: 0,
      y: 0,
      z: 0,
      targetKey: null,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      state: 'IDLE' as DroneState,
      miningTimer: 0,
      role: 'MINER' as DroneRole,
      payload: 0,
      maxPayload: 10,
    };

    config = {
      drones: {
        startHeightBase: 10,
        startHeightRandom: 5,
        haulers: {
          baseCargo: 50,
          baseSpeed: 10,
          speedPerLevel: 1,
        }
      },
      terrain: {
        waterLevel: 0,
      }
    } as any;

    uiSnapshot = {
      credits: 0,
      minedBlocks: 0,
      prestigeLevel: 1,
      moveSpeedLevel: 1,
      totalBlocks: 0,
    } as any;

    depositEvents = [];
  });

  const runTick = (drones: Drone[]) => {
    tickDrones({
      world: mockWorld as WorldModel,
      drones,
      dtSeconds: 1,
      cfg: config,
      frontier: { keys: new Set() } as KeyIndex,
      minedKeys: new Set(),
      reservedKeys: new Set(),
      moveSpeed: 10,
      mineDuration: 1,
      maxTargetAttempts: 1,
      uiSnapshot,
      minedPositions: [],
      editsThisTick: [],
      frontierAdded: [],
      frontierRemoved: [],
      depositEvents,
    });
  };

  describe('MINER', () => {
    it('should transition from RETURNING to DEPOSITING when docked', () => {
      const drone: Drone = { ...defaultDrone, role: 'MINER', state: 'RETURNING', payload: 10, x: 10, y: 10, z: 10 };
      const outpost = { x: 10, y: 8, z: 10 }; // nearby
      mockWorld.getBestOutpost.mockReturnValue(outpost);
      mockWorld.getNearestOutpost.mockReturnValue(outpost); // Fallback
      mockWorld.requestDock.mockReturnValue("GRANTED");

      runTick([drone]);

      expect(drone.state).toBe('DEPOSITING');
      expect(mockWorld.requestDock).toHaveBeenCalledWith(outpost, drone.id);
    });

    it('should transition from RETURNING to QUEUING when dock denied', () => {
      const drone: Drone = { ...defaultDrone, role: 'MINER', state: 'RETURNING', payload: 10, x: 10, y: 10, z: 10 };
      const outpost = { x: 10, y: 8, z: 10 };
      mockWorld.getBestOutpost.mockReturnValue(outpost);
      mockWorld.getNearestOutpost.mockReturnValue(outpost);
      mockWorld.requestDock.mockReturnValue("DENIED");
      mockWorld.getQueueLength.mockReturnValue(1); // Low queue

      runTick([drone]);

      expect(drone.state).toBe('QUEUING');
    });

    it('should reroute from RETURNING if queue is long and cooldown expired', () => {
       const drone: Drone = {
           ...defaultDrone,
           role: 'MINER',
           state: 'RETURNING',
           payload: 10,
           x: 10, y: 10, z: 10,
           lastRerouteAt: 0 // Old enough
       };
       const outpost = { x: 10, y: 8, z: 10 };
       mockWorld.getBestOutpost.mockReturnValue(outpost);
       mockWorld.getNearestOutpost.mockReturnValue(outpost);
       mockWorld.requestDock.mockReturnValue("DENIED");
       mockWorld.getQueueLength.mockReturnValue(10); // High queue

       // Force Date.now to be > lastRerouteAt + 5000
       const now = 10000;
       vi.spyOn(Date, 'now').mockReturnValue(now);

       runTick([drone]);

       expect(drone.state).toBe('RETURNING'); // Should stay returning to try picking another outpost
       expect(drone.lastRerouteAt).toBe(now);
    });

    it('should deposit and undock', () => {
       const drone: Drone = { ...defaultDrone, role: 'MINER', state: 'DEPOSITING', payload: 10, miningTimer: 0 };
       const outpost = { x: 0, y: 0, z: 0 };
       mockWorld.getNearestOutpost.mockReturnValue(outpost);

       runTick([drone]);

       expect(drone.state).toBe('SEEKING');
       expect(drone.payload).toBe(0);
       expect(mockWorld.undock).toHaveBeenCalledWith(outpost, drone.id);
       expect(depositEvents).toHaveLength(1);
    });
  });

  describe('HAULER', () => {
      it('should transition from RETURNING to DEPOSITING when docked', () => {
      const drone: Drone = { ...defaultDrone, role: 'HAULER', state: 'RETURNING', payload: 10, x: 10, y: 10, z: 10 };
      const outpost = { x: 10, y: 6, z: 10 }; // nearby (hauler target y is +4)
      mockWorld.getBestOutpost.mockReturnValue(outpost);
      mockWorld.getNearestOutpost.mockReturnValue(outpost);
      mockWorld.requestDock.mockReturnValue("GRANTED");

      runTick([drone]);

      expect(drone.state).toBe('DEPOSITING');
    });

    it('should deposit and undock (transition to IDLE)', () => {
       const drone: Drone = { ...defaultDrone, role: 'HAULER', state: 'DEPOSITING', payload: 10, miningTimer: 0 };
       const outpost = { x: 0, y: 0, z: 0 };
       mockWorld.getNearestOutpost.mockReturnValue(outpost);

       runTick([drone]);

       expect(drone.state).toBe('IDLE'); // Hauler goes to IDLE
       expect(drone.payload).toBe(0);
       expect(mockWorld.undock).toHaveBeenCalledWith(outpost, drone.id);
    });
  });
});
