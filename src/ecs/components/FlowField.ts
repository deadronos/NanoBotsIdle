export interface FlowField {
  targetX: number;
  targetY: number;
  vectors: { dx: number; dy: number }[]; // Flow vector for each grid cell
  lastUpdated: number; // Timestamp for cache invalidation
  dirty: boolean; // Needs recalculation
}
