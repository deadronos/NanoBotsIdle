import { getDroneMoveSpeed, getMineDuration } from "../config/drones";
import { getConfig } from "../config/index";
import type { Cmd, RenderDelta, UiSnapshot } from "../shared/protocol";
import { getSeed } from "../sim/terrain";
import { getVoxelValueFromHeight } from "../sim/terrain-core";
import { WorldModel } from "./world/world";

export type Engine = {
  dispatch: (cmd: Cmd) => void;
  tick: (
    dtSeconds: number,
    budgetMs: number,
    maxSubsteps: number,
  ) => { delta: RenderDelta; ui: UiSnapshot; backlog: number };
};

export const createEngine = (seed?: number): Engine => {
  let tick = 0;
  const cfg = getConfig();
  const maxTargetAttempts = 20;
  const minedKeys = new Set<string>();
  const reservedKeys = new Set<string>();
  let world: WorldModel | null = null;
  void seed;
  let frontierKeys: string[] = [];
  const frontierIndex = new Map<string, number>();
  let pendingFrontierSnapshot: Float32Array | null = null;
  let pendingFrontierReset = false;

  type DroneState = "SEEKING" | "MOVING" | "MINING";
  const DRONE_SEEKING = 0;
  const DRONE_MOVING = 1;
  const DRONE_MINING = 2;

  type Drone = {
    id: number;
    x: number;
    y: number;
    z: number;
    targetKey: string | null;
    targetX: number;
    targetY: number;
    targetZ: number;
    state: DroneState;
    miningTimer: number;
  };

  let drones: Drone[] = [];

  const uiSnapshot: UiSnapshot = {
    credits: 0,
    prestigeLevel: 1,
    droneCount: 3,
    miningSpeedLevel: 1,
    moveSpeedLevel: 1,
    laserPowerLevel: 1,
    minedBlocks: 0,
    totalBlocks: 0,
    upgrades: {},
  };

  const getUpgradeCost = (type: "drone" | "speed" | "move" | "laser") => {
    const baseCosts = cfg.economy.baseCosts;
    switch (type) {
      case "drone":
        return Math.floor(baseCosts.drone * Math.pow(1.5, uiSnapshot.droneCount - 3));
      case "speed":
        return Math.floor(baseCosts.speed * Math.pow(1.3, uiSnapshot.miningSpeedLevel - 1));
      case "move":
        return Math.floor(baseCosts.move * Math.pow(1.3, uiSnapshot.moveSpeedLevel - 1));
      case "laser":
        return Math.floor(baseCosts.laser * Math.pow(1.4, uiSnapshot.laserPowerLevel - 1));
    }
  };

  const updateNextCosts = () => {
    uiSnapshot.nextCosts = {
      drone: getUpgradeCost("drone"),
      speed: getUpgradeCost("speed"),
      move: getUpgradeCost("move"),
      laser: getUpgradeCost("laser"),
    };
  };

  updateNextCosts();

  const addFrontierKey = (key: string) => {
    if (frontierIndex.has(key)) return;
    frontierIndex.set(key, frontierKeys.length);
    frontierKeys.push(key);
  };

  const removeFrontierKey = (key: string) => {
    const idx = frontierIndex.get(key);
    if (idx === undefined) return;
    const lastIdx = frontierKeys.length - 1;
    const lastKey = frontierKeys[lastIdx];
    frontierKeys[idx] = lastKey;
    frontierIndex.set(lastKey, idx);
    frontierKeys.pop();
    frontierIndex.delete(key);
  };

  const resetTargets = () => {
    minedKeys.clear();
    reservedKeys.clear();
  };

  const ensureSeedWithMinAboveWater = (prestigeLevel: number) => {
    const baseSeed = getSeed(prestigeLevel);
    const retryLimit = cfg.terrain.genRetries ?? 5;
    const minBlocks = cfg.economy.prestigeMinMinedBlocks;
    for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
      const candidateSeed = baseSeed + attempt * 101;
      const candidateWorld = new WorldModel({ seed: candidateSeed });
      const aboveWater = candidateWorld.initializeFrontierFromSurface(cfg.terrain.worldRadius);
      if (aboveWater >= minBlocks) {
        world = candidateWorld;
        frontierKeys = candidateWorld.getFrontierKeys();
        frontierIndex.clear();
        frontierKeys.forEach((key, index) => frontierIndex.set(key, index));
        uiSnapshot.totalBlocks = frontierKeys.length;
        pendingFrontierSnapshot = candidateWorld.getFrontierPositionsArray();
        pendingFrontierReset = true;
        return;
      }
    }
    world = new WorldModel({ seed: baseSeed });
    world.initializeFrontierFromSurface(cfg.terrain.worldRadius);
    frontierKeys = world.getFrontierKeys();
    frontierIndex.clear();
    frontierKeys.forEach((key, index) => frontierIndex.set(key, index));
    uiSnapshot.totalBlocks = frontierKeys.length;
    pendingFrontierSnapshot = world.getFrontierPositionsArray();
    pendingFrontierReset = true;
  };

  ensureSeedWithMinAboveWater(uiSnapshot.prestigeLevel);

  const buyUpgrade = (id: string) => {
    if (id === "drone") {
      const cost = getUpgradeCost("drone");
      if (uiSnapshot.credits >= cost) {
        uiSnapshot.credits -= cost;
        uiSnapshot.droneCount += 1;
      }
      return;
    }
    if (id === "speed") {
      const cost = getUpgradeCost("speed");
      if (uiSnapshot.credits >= cost) {
        uiSnapshot.credits -= cost;
        uiSnapshot.miningSpeedLevel += 1;
      }
      return;
    }
    if (id === "move") {
      const cost = getUpgradeCost("move");
      if (uiSnapshot.credits >= cost) {
        uiSnapshot.credits -= cost;
        uiSnapshot.moveSpeedLevel += 1;
      }
      return;
    }
    if (id === "laser") {
      const cost = getUpgradeCost("laser");
      if (uiSnapshot.credits >= cost) {
        uiSnapshot.credits -= cost;
        uiSnapshot.laserPowerLevel += 1;
      }
    }
  };

  const syncDroneCount = () => {
    if (drones.length === uiSnapshot.droneCount) return;
    if (drones.length < uiSnapshot.droneCount) {
      for (let i = drones.length; i < uiSnapshot.droneCount; i += 1) {
        drones.push({
          id: i,
          x: 0,
          y: cfg.drones.startHeightBase + Math.random() * cfg.drones.startHeightRandom,
          z: 0,
          targetKey: null,
          targetX: Number.NaN,
          targetY: Number.NaN,
          targetZ: Number.NaN,
          state: "SEEKING",
          miningTimer: 0,
        });
      }
      return;
    }
    drones = drones.slice(0, uiSnapshot.droneCount);
  };

  const pickTargetKey = () => {
    if (!world) return null;
    if (frontierKeys.length === 0) return null;
    let attempts = 0;
    while (attempts < maxTargetAttempts) {
      const idx = Math.floor(Math.random() * frontierKeys.length);
      const key = frontierKeys[idx];
      if (!minedKeys.has(key) && !reservedKeys.has(key)) {
        reservedKeys.add(key);
        return key;
      }
      attempts += 1;
    }
    return null;
  };

  const dispatch = (cmd: Cmd) => {
    switch (cmd.t) {
      case "BUY_UPGRADE": {
        const count = Math.max(1, cmd.n);
        for (let i = 0; i < count; i += 1) {
          buyUpgrade(cmd.id);
        }
        updateNextCosts();
        return;
      }
      case "PRESTIGE": {
        if (uiSnapshot.minedBlocks < cfg.economy.prestigeMinMinedBlocks) return;
        uiSnapshot.credits = 0;
        uiSnapshot.minedBlocks = 0;
        uiSnapshot.totalBlocks = 0;
        uiSnapshot.prestigeLevel += 1;
        resetTargets();
        ensureSeedWithMinAboveWater(uiSnapshot.prestigeLevel);
        return;
      }
    }
  };

  const tickEngine = (
    _dtSeconds: number,
    _budgetMs: number,
    _maxSubsteps: number,
  ) => {
    tick += 1;
    syncDroneCount();

    const dtSeconds = _dtSeconds;
    const moveSpeed = getDroneMoveSpeed(uiSnapshot.moveSpeedLevel, cfg);
    const mineDuration = getMineDuration(uiSnapshot.miningSpeedLevel, cfg);
    const minedPositions: number[] = [];
    const editsThisTick: { x: number; y: number; z: number; mat: number }[] = [];
    const frontierAdded: number[] = [];
    const frontierRemoved: number[] = [];

    if (world) {
      for (const drone of drones) {
        switch (drone.state) {
          case "SEEKING": {
            const targetKey = pickTargetKey();
            if (targetKey) {
              const coords = world.coordsFromKey(targetKey);
              drone.targetKey = targetKey;
              drone.targetX = coords.x;
              drone.targetY = coords.y;
              drone.targetZ = coords.z;
              drone.state = "MOVING";
            }
            break;
          }
          case "MOVING": {
            if (!drone.targetKey) {
              drone.state = "SEEKING";
              break;
            }
            const destY = drone.targetY + 2;
            const dx = drone.targetX - drone.x;
            const dy = destY - drone.y;
            const dz = drone.targetZ - drone.z;
            const dist = Math.hypot(dx, dy, dz);

            if (dist < 0.5) {
              drone.state = "MINING";
              drone.miningTimer = 0;
            } else if (dist > 0) {
              const step = moveSpeed * dtSeconds;
              const inv = step / dist;
              drone.x += dx * inv;
              drone.y += dy * inv;
              drone.z += dz * inv;
            }
            break;
          }
          case "MINING": {
            drone.miningTimer += dtSeconds;
            if (drone.miningTimer >= mineDuration) {
              const key = drone.targetKey;
              if (key && !minedKeys.has(key)) {
                const editResult = world.mineVoxel(drone.targetX, drone.targetY, drone.targetZ);
                if (editResult) {
                  minedKeys.add(key);
                  reservedKeys.delete(key);
                  minedPositions.push(drone.targetX, drone.targetY, drone.targetZ);
                  editsThisTick.push(editResult.edit);
                  editResult.frontierAdded.forEach((pos) => {
                    const addKey = world!.key(pos.x, pos.y, pos.z);
                    addFrontierKey(addKey);
                    frontierAdded.push(pos.x, pos.y, pos.z);
                  });
                  editResult.frontierRemoved.forEach((pos) => {
                    const removeKey = world!.key(pos.x, pos.y, pos.z);
                    removeFrontierKey(removeKey);
                    frontierRemoved.push(pos.x, pos.y, pos.z);
                  });

                  const value = getVoxelValueFromHeight(drone.targetY);
                  uiSnapshot.credits += value * uiSnapshot.prestigeLevel;
                  uiSnapshot.minedBlocks += 1;
                }
              }
              drone.state = "SEEKING";
              drone.targetKey = null;
              drone.miningTimer = 0;
            }
            break;
          }
        }
      }
    }

    let entities: Float32Array | undefined;
    let entityTargets: Float32Array | undefined;
    let entityStates: Uint8Array | undefined;
    if (drones.length > 0) {
      entities = new Float32Array(drones.length * 3);
      entityTargets = new Float32Array(drones.length * 3);
      entityStates = new Uint8Array(drones.length);
      for (let i = 0; i < drones.length; i += 1) {
        const base = i * 3;
        const drone = drones[i];
        entities[base] = drone.x;
        entities[base + 1] = drone.y;
        entities[base + 2] = drone.z;

        let stateValue = DRONE_SEEKING;
        if (drone.state === "MOVING") stateValue = DRONE_MOVING;
        if (drone.state === "MINING") stateValue = DRONE_MINING;
        entityStates[i] = stateValue;

        entityTargets[base] = drone.targetX;
        entityTargets[base + 1] = drone.targetY;
        entityTargets[base + 2] = drone.targetZ;
      }
    }

    const minedPositionsArray =
      minedPositions.length > 0 ? new Float32Array(minedPositions) : undefined;
    const frontierAddArray =
      frontierAdded.length > 0 ? new Float32Array(frontierAdded) : undefined;
    const frontierRemoveArray =
      frontierRemoved.length > 0 ? new Float32Array(frontierRemoved) : undefined;

    const delta: RenderDelta = {
      tick,
      entities,
      entityTargets,
      entityStates,
      edits: editsThisTick.length > 0 ? editsThisTick : undefined,
      minedPositions: minedPositionsArray,
      frontierAdd: frontierAddArray,
      frontierRemove: frontierRemoveArray,
    };

    if (pendingFrontierSnapshot) {
      delta.frontierAdd = pendingFrontierSnapshot;
      delta.frontierReset = pendingFrontierReset;
      pendingFrontierSnapshot = null;
      pendingFrontierReset = false;
    }

    return {
      delta,
      ui: uiSnapshot,
      backlog: 0,
    };
  };

  return {
    dispatch,
    tick: tickEngine,
  };
};
