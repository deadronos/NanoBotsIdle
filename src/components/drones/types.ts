import type { Group, Mesh, PointLight } from "three";

import type { FlashHandle } from "./FlashEffect";
import type { ParticleHandle } from "./Particles";

export type DroneVisualRefs = {
  groupRefs: (Group | null)[];
  miningLaserRefs: (Mesh | null)[];
  scanningLaserRefs: (Mesh | null)[];
  targetBoxRefs: (Mesh | null)[];
  impactLightRefs: (PointLight | null)[];
};

export type DroneEffectRefs = {
  particles: ParticleHandle | null;
  flash: FlashHandle | null;
};
