export type EconomyConfig = {
  baseCosts: {
    drone: number;
    speed: number;
    move: number;
    laser: number;
    hauler: number;
    outpost: number;
  };
  prestigeMinMinedBlocks: number;
  prestigeScalingFactor: number;
};

export const defaultEconomyConfig: EconomyConfig = {
  baseCosts: {
    drone: 100,
    speed: 50,
    move: 50,
    laser: 200,
    hauler: 500,
    outpost: 1000,
  },
  prestigeMinMinedBlocks: 1000,
  prestigeScalingFactor: 1.5,
};
