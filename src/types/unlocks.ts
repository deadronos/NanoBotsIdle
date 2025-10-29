/**
 * Unlock system for progressive feature discovery
 * Tracks which gameplay features are available to the player
 */

export interface UnlockState {
  // Building features
  ghostBuilding: boolean; // Can place buildings without resources (unlocks ~minute 5)
  powerVeins: boolean; // Can build power distribution network (unlocks ~minute 10)
  coolers: boolean; // Can build heat management structures (unlocks ~minute 13)

  // AI/Logistics features
  routingPriorities: boolean; // Can configure hauler priorities (unlocks ~minute 7)
  diagnosticsTab: boolean; // Can view bottleneck analysis (unlocks ~minute 20)

  // Advanced features
  forkProcess: boolean; // Can evolve drone behaviors (unlocks ~minute 16)
  overclockMode: boolean; // Can enter Phase 3 (unlocks ~minute 25)
  selfTermination: boolean; // Can scrap for shards (unlocks when overheating)

  // Tutorial/progression
  firstDroneFabricated: boolean; // Player has built first additional drone
  firstGhostPlaced: boolean; // Player has used ghost building
  firstPrioritySet: boolean; // Player has configured routing
}

export interface ProgressionMilestone {
  id: string;
  name: string;
  description: string;
  timeSeconds: number;
  achieved: boolean;
  notified: boolean;
}

export const DEFAULT_UNLOCK_STATE: UnlockState = {
  ghostBuilding: false,
  powerVeins: false,
  coolers: false,
  routingPriorities: false,
  diagnosticsTab: false,
  forkProcess: false,
  overclockMode: false,
  selfTermination: false,
  firstDroneFabricated: false,
  firstGhostPlaced: false,
  firstPrioritySet: false,
};

/**
 * Check if an unlock should be triggered based on world state
 */
export interface UnlockTrigger {
  unlockKey: keyof UnlockState;
  check: (world: { 
    droneCount: number; 
    simTimeSeconds: number; 
    heatRatio: number;
    buildingCount: number;
  }) => boolean;
  notificationTitle: string;
  notificationMessage: string;
}

export const UNLOCK_TRIGGERS: UnlockTrigger[] = [
  {
    unlockKey: "ghostBuilding",
    check: ({ droneCount }) => droneCount >= 3,
    notificationTitle: "Ghost Building Unlocked!",
    notificationMessage:
      "You can now place buildings without resources. Builder drones will construct them automatically.",
  },
  {
    unlockKey: "routingPriorities",
    check: ({ droneCount }) => droneCount >= 3,
    notificationTitle: "Routing Priorities Unlocked!",
    notificationMessage:
      "Your swarm is growing! Configure hauler priorities in the AI panel to optimize logistics.",
  },
  {
    unlockKey: "powerVeins",
    check: ({ buildingCount }) => buildingCount >= 6,
    notificationTitle: "Power Distribution Unlocked!",
    notificationMessage:
      "Complex logistics require power management. Build Power Veins to energize distant structures.",
  },
  {
    unlockKey: "coolers",
    check: ({ simTimeSeconds }) => simTimeSeconds >= 13 * 60,
    notificationTitle: "Heat Management Unlocked!",
    notificationMessage: "Your factory is generating heat. Build Coolers to maintain stability.",
  },
  {
    unlockKey: "forkProcess",
    check: ({ simTimeSeconds }) => simTimeSeconds >= 16 * 60,
    notificationTitle: "Fork Process Available!",
    notificationMessage:
      "Evolve your swarm! Fork Process allows you to mutate drone behaviors for this run.",
  },
  {
    unlockKey: "overclockMode",
    check: ({ simTimeSeconds }) => simTimeSeconds >= 25 * 60,
    notificationTitle: "Overclock Mode Unlocked!",
    notificationMessage:
      "Push your factory to the limit! Overclock massively increases production but generates dangerous heat.",
  },
  {
    unlockKey: "selfTermination",
    check: ({ heatRatio }) => heatRatio > 1.2,
    notificationTitle: "Self-Termination Protocols Available",
    notificationMessage:
      "Critical heat levels detected. You can now scrap structures for emergency Compile Shards.",
  },
];

export const PROGRESSION_MILESTONES: Omit<ProgressionMilestone, "achieved" | "notified">[] = [
  {
    id: "milestone_2min",
    name: "Bootstrap Phase",
    description: "Your first factory is operational",
    timeSeconds: 2 * 60,
  },
  {
    id: "milestone_5min",
    name: "Swarm Expansion",
    description: "Multiple drones coordinate logistics",
    timeSeconds: 5 * 60,
  },
  {
    id: "milestone_10min",
    name: "Networked Logistics",
    description: "Complex production chains established",
    timeSeconds: 10 * 60,
  },
];
