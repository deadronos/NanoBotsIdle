import type { Query, With } from "miniplex";
import { World } from "miniplex";

import type { PlayerController } from "../../voxel/PlayerController";

export type Vec3 = { x: number; y: number; z: number };

export type PlayerEntity = {
  position: Vec3;
  velocity: Vec3;
};

export type TimeEntity = {
  seconds: number;
  dayLength: number;
};

export type GameEntity = PlayerEntity | TimeEntity;

export type GameEcs = {
  world: World<GameEntity>;
  entities: {
    player: PlayerEntity;
    time: TimeEntity;
  };
  queries: {
    players: Query<With<GameEntity, "position" | "velocity">>;
    time: Query<With<GameEntity, "seconds" | "dayLength">>;
  };
  systems: EcsSystem[];
};

export type EcsSystem = (ecs: GameEcs, dt: number, controller: PlayerController) => void;

export function createGameEcs(dayLength: number): GameEcs {
  const world = new World<GameEntity>();
  const player = world.add({
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
  });
  const time = world.add({
    seconds: 0,
    dayLength,
  });

  const queries = {
    players: world.with("position", "velocity"),
    time: world.with("seconds", "dayLength"),
  };

  const systems: EcsSystem[] = [timeSystem, playerSnapshotSystem];

  return { world, entities: { player, time }, queries, systems };
}

export function stepGameEcs(ecs: GameEcs, dt: number, controller: PlayerController): void {
  for (const system of ecs.systems) {
    system(ecs, dt, controller);
  }
}

export function getTimeOfDay(ecs: GameEcs): number {
  const time = ecs.entities.time;
  return (time.seconds / time.dayLength) % 1;
}

function timeSystem(ecs: GameEcs, dt: number) {
  for (const entity of ecs.queries.time) {
    entity.seconds += dt;
  }
}

function playerSnapshotSystem(ecs: GameEcs, _dt: number, controller: PlayerController) {
  for (const entity of ecs.queries.players) {
    entity.position.x = controller.position.x;
    entity.position.y = controller.position.y;
    entity.position.z = controller.position.z;
    entity.velocity.x = controller.velocity.x;
    entity.velocity.y = controller.velocity.y;
    entity.velocity.z = controller.velocity.z;
  }
}
