export type EconomyConfig = {
  baseCosts: {
    drone: number;
    speed: number;
    move: number;
    laser: number;
    hauler: number;
  };
  prestigeMinMinedBlocks: number;
};

export const defaultEconomyConfig: EconomyConfig = {
  baseCosts: {
    drone: 100,
    speed: 50,
    move: 50,
    laser: 200,
    hauler: 500,
  },
  prestigeMinMinedBlocks: 50,
};
