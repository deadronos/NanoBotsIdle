export interface Overclockable {
  safeRateMult: number;     // 1.0 under normal mode
  overRateMult: number;     // e.g. 2.5 under overclock
  heatMultiplier: number;   // how much extra heat per output under overclock
}
