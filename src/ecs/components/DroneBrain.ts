import { DroneRole, DroneState } from "../../types/drones";
import { ResourceName } from "../../types/resources";
import { EntityId } from "../world/EntityId";

export interface RoutingPriorityRule {
  targetType: string;
  priority: number;
}

export interface BehaviorProfile {
  priorityRules: RoutingPriorityRule[];
  prefetchCriticalInputs: boolean;
  buildRadius: number;
  congestionAvoidance: number;
  avoidDuplicateGhostTargets?: boolean; // Builder coordination to avoid duplicate work
}

export interface DroneBrain {
  role: DroneRole;
  state: DroneState;
  cargo: { resource: ResourceName | null; amount: number };
  battery: number;
  targetEntity: EntityId | null;
  behavior: BehaviorProfile;
}
