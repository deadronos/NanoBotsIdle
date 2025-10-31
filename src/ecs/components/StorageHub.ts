// StorageHub component for buildings that provide inventory capacity bonuses
// to nearby buildings, reducing hauling overhead
export interface StorageHub {
  radius: number; // Range within which this Storage provides benefits
  capacityBonus: number; // Additional inventory capacity added to buildings in range
  haulingEfficiencyBonus: number; // Reduction in hauling time/congestion (0-1 multiplier)
}
