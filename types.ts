export type ViewMode = 'FIRST_PERSON' | 'THIRD_PERSON';

export interface PlayerState {
  position: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
  isJumping: boolean;
}

export interface WorldConfig {
  width: number;
  depth: number;
  scale: number;
  seed: number;
}
