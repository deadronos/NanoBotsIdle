import type { World } from "../world/World";

export interface System {
  id: string;
  update(world: World, dt: number): void;
}

export type SystemList = readonly System[];
