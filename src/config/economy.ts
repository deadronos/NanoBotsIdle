export type EconomyConfig = {
  baseCosts: {
    drone: number;
    speed: number;
    move: number;
    laser: number;
    hauler: number;
    diver: number;
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
    diver: 750,
  },
  prestigeMinMinedBlocks: 50,
};
