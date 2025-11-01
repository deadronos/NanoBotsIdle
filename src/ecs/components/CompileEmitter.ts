import type { EntityId } from "../world/EntityId";

export interface CompileEmitter {
  compileRate: number;
  isActive: boolean;
}

export type CompileEmitterStore = Record<EntityId, CompileEmitter>;
