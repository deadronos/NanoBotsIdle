export interface PowerLink {
  demand: number; // how much power/sec needed
  priority: number; // lower number = higher priority (0 is critical)
  online: boolean; // set by heatAndPowerSystem
  connectedToGrid: boolean; // whether this building is connected to the power grid via PowerVeins
}
