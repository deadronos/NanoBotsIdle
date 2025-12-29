import { getDroneMoveSpeed, getMineDuration } from "../config/drones";
import { getConfig } from "../config/index";
import type { Cmd, RenderDelta, UiSnapshot } from "../shared/protocol";

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
  let targetPositions: Float32Array | null = null;
  let targetValues: Float32Array | null = null;
  const minedIndices = new Set<number>();
  const reservedIndices = new Set<number>();

  type DroneState = "SEEKING" | "MOVING" | "MINING";
  const DRONE_SEEKING = 0;
  const DRONE_MOVING = 1;
  const DRONE_MINING = 2;

  type Drone = {
    id: number;
    x: number;
    y: number;
    z: number;
    targetIndex: number;
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
          targetIndex: -1,
          state: "SEEKING",
          miningTimer: 0,
        });
      }
      return;
    }
    drones = drones.slice(0, uiSnapshot.droneCount);
  };

  const resetTargets = () => {
    minedIndices.clear();
    reservedIndices.clear();
  };

  const pickTargetIndex = () => {
    if (!targetValues) return -1;
    const total = targetValues.length;
    if (total === 0) return -1;
    let attempts = 0;
    while (attempts < maxTargetAttempts) {
      const idx = Math.floor(Math.random() * total);
      if (!minedIndices.has(idx) && !reservedIndices.has(idx)) {
        reservedIndices.add(idx);
        return idx;
      }
      attempts += 1;
    }
    return -1;
  };

  const dispatch = (cmd: Cmd) => {
    void seed;
    switch (cmd.t) {
      case "BUY_UPGRADE": {
        const count = Math.max(1, cmd.n);
        for (let i = 0; i < count; i += 1) {
          buyUpgrade(cmd.id);
        }
        updateNextCosts();
        return;
      }
      case "MINE_BLOCK": {
        if (cmd.value > 0) {
          uiSnapshot.credits += cmd.value * uiSnapshot.prestigeLevel;
          uiSnapshot.minedBlocks += 1;
        }
        return;
      }
      case "SET_TOTAL_BLOCKS": {
        uiSnapshot.totalBlocks = cmd.total;
        uiSnapshot.minedBlocks = 0;
        return;
      }
      case "SET_TARGET_POOL": {
        targetPositions = cmd.positions;
        targetValues = cmd.values;
        uiSnapshot.totalBlocks = targetValues.length;
        uiSnapshot.minedBlocks = 0;
        resetTargets();
        return;
      }
      case "PRESTIGE": {
        if (uiSnapshot.minedBlocks < cfg.economy.prestigeMinMinedBlocks) return;
        uiSnapshot.credits = 0;
        uiSnapshot.minedBlocks = 0;
        uiSnapshot.totalBlocks = 0;
        uiSnapshot.prestigeLevel += 1;
        resetTargets();
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
    const minedThisTick: number[] = [];
    const minedPositions: number[] = [];

    if (targetPositions && targetValues) {
      for (const drone of drones) {
        switch (drone.state) {
          case "SEEKING": {
            const targetIndex = pickTargetIndex();
            if (targetIndex >= 0) {
              drone.targetIndex = targetIndex;
              drone.state = "MOVING";
            }
            break;
          }
          case "MOVING": {
            if (drone.targetIndex < 0) {
              drone.state = "SEEKING";
              break;
            }
            const baseIndex = drone.targetIndex * 3;
            const targetX = targetPositions[baseIndex];
            const targetY = targetPositions[baseIndex + 1];
            const targetZ = targetPositions[baseIndex + 2];
            const destY = targetY + 2;

            const dx = targetX - drone.x;
            const dy = destY - drone.y;
            const dz = targetZ - drone.z;
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
              const index = drone.targetIndex;
              if (index >= 0 && !minedIndices.has(index)) {
                minedIndices.add(index);
                reservedIndices.delete(index);
                minedThisTick.push(index);
                const baseIndex = index * 3;
                const minedX = targetPositions[baseIndex];
                const minedY = targetPositions[baseIndex + 1];
                const minedZ = targetPositions[baseIndex + 2];
                minedPositions.push(minedX, minedY, minedZ);
                const value = targetValues[index];
                if (value > 0) {
                  uiSnapshot.credits += value * uiSnapshot.prestigeLevel;
                  uiSnapshot.minedBlocks += 1;
                }
              }
              drone.state = "SEEKING";
              drone.targetIndex = -1;
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

        if (targetPositions && drone.targetIndex >= 0) {
          const targetBase = drone.targetIndex * 3;
          entityTargets[base] = targetPositions[targetBase];
          entityTargets[base + 1] = targetPositions[targetBase + 1];
          entityTargets[base + 2] = targetPositions[targetBase + 2];
        } else {
          entityTargets[base] = Number.NaN;
          entityTargets[base + 1] = Number.NaN;
          entityTargets[base + 2] = Number.NaN;
        }
      }
    }

    const minedIndicesArray = minedThisTick.length > 0 ? new Int32Array(minedThisTick) : undefined;
    const minedPositionsArray =
      minedPositions.length > 0 ? new Float32Array(minedPositions) : undefined;

    return {
      delta: {
        tick,
        entities,
        entityTargets,
        entityStates,
        minedIndices: minedIndicesArray,
        minedPositions: minedPositionsArray,
      },
      ui: uiSnapshot,
      backlog: 0,
    };
  };

  return {
    dispatch,
    tick: tickEngine,
  };
};
