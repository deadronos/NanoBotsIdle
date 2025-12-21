import { World } from "miniplex";

import type { PlayerController } from "../../voxel/PlayerController";

export type Vec3 = { x: number; y: number; z: number };

export type PlayerEntity = {
  kind: "player";
  position: Vec3;
  velocity: Vec3;
};

export type TimeEntity = {
  kind: "time";
  seconds: number;
  dayLength: number;
};

export type GameEntity = PlayerEntity | TimeEntity;

export type GameEcs = {
  world: World<GameEntity>;
  player: PlayerEntity;
  time: TimeEntity;
};

export function createGameEcs(dayLength: number): GameEcs {
  const world = new World<GameEntity>();
  const player = world.add({
    kind: "player",
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
  });
  const time = world.add({
    kind: "time",
    seconds: 0,
    dayLength,
  });

  return { world, player, time };
}

export function stepGameEcs(ecs: GameEcs, dt: number, controller: PlayerController): void {
  const timeQuery = ecs.world.with("seconds");
  for (const entity of timeQuery) {
    if (entity.kind === "time") {
      entity.seconds += dt;
    }
  }

  const playerQuery = ecs.world.with("position", "velocity");
  for (const entity of playerQuery) {
    if (entity.kind !== "player") continue;
    entity.position.x = controller.position.x;
    entity.position.y = controller.position.y;
    entity.position.z = controller.position.z;
    entity.velocity.x = controller.velocity.x;
    entity.velocity.y = controller.velocity.y;
    entity.velocity.z = controller.velocity.z;
  }
}
