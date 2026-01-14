import type { InstancedMesh } from "three";

import type { FloatingTextHandle } from "../effects/FloatingTextSystem";
import type { FlashHandle } from "./FlashEffect";
import type { ParticleHandle } from "./Particles";

export type DroneVisualRefs = {
  bodyMesh: InstancedMesh | null;
  miningLaserMesh: InstancedMesh | null;
  scanningLaserMesh: InstancedMesh | null;
  targetBoxMesh: InstancedMesh | null;
};

export type DroneEffectRefs = {
  particles: ParticleHandle | null;
  flash: FlashHandle | null;
  floatingText: FloatingTextHandle | null;
};
