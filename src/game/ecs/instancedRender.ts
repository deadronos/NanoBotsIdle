import * as THREE from "three";

import type { GameEcs, GameEntity } from "./gameEcs";
import { BLOCK_COLORS, DEFAULT_BLOCK_COLOR } from "../blockColors";
import { InstanceBatch } from "../instancedBatch";
import { BlockId } from "../../voxel/World";

export type EcsInstancedRenderers = {
  update: (ecs: GameEcs) => void;
  dispose: (scene: THREE.Scene) => void;
};

export function createEcsInstancedRenderers(
  scene: THREE.Scene,
): EcsInstancedRenderers {
  const mobGeometry = new THREE.BoxGeometry(0.6, 1.0, 0.6);
  const mobMaterial = new THREE.MeshLambertMaterial({ color: 0xf1c27d });
  const mobBatch = new InstanceBatch(scene, mobGeometry, mobMaterial, {
    capacity: 64,
    useColors: false,
  });

  const itemGeometry = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const itemMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  const itemBatch = new InstanceBatch(scene, itemGeometry, itemMaterial, {
    capacity: 128,
    useColors: true,
  });

  const tempColor = new THREE.Color();

  const update = (ecsState: GameEcs) => {
    mobBatch.begin();
    for (const entity of ecsState.queries.mobs) {
      if (!entity.position) continue;
      mobBatch.add(entity.position.x, entity.position.y, entity.position.z, 1, 0);
    }
    mobBatch.commit();

    itemBatch.begin();
    for (const entity of ecsState.queries.items) {
      if (!entity.position || !entity.item) continue;
      const bob = Math.sin(entity.item.bobPhase) * 0.05;
      const color = colorForItem(entity, tempColor);
      itemBatch.add(
        entity.position.x,
        entity.position.y + bob,
        entity.position.z,
        1,
        entity.item.bobPhase,
        color,
      );
    }
    itemBatch.commit();
  };

  const dispose = (sceneRef: THREE.Scene) => {
    mobBatch.dispose(sceneRef);
    itemBatch.dispose(sceneRef);
  };

  return { update, dispose };
}

function colorForItem(entity: GameEntity, target: THREE.Color): THREE.Color {
  const id = typeof entity.item?.itemId === "number" ? entity.item.itemId : undefined;
  if (id == null) return target.copy(DEFAULT_BLOCK_COLOR);
  const blockId = id as BlockId;
  const color = BLOCK_COLORS[blockId] ?? DEFAULT_BLOCK_COLOR;
  return target.copy(color);
}
