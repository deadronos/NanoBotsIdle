import type { EntityId } from "../world/EntityId";

export interface PowerLink {
  demand: number;
  priority: number;
  online: boolean;
}

export type PowerLinkStore = Record<EntityId, PowerLink>;
