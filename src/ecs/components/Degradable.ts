// Buildings that can degrade over time and require maintenance
export interface Degradable {
  // Current wear level (0.0 = pristine, 1.0 = maximum degradation)
  wear: number;
  
  // Rate of wear accumulation per second of operation
  wearRate: number;
  
  // How long a maintenance job takes to complete (in seconds)
  maintenanceTime: number;
  
  // Efficiency penalty multiplier based on wear
  // e.g., 0.3 means 30% efficiency loss at maximum wear
  maxEfficiencyPenalty: number;
}
