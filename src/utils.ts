export {
  chunkDistanceSq2,
  chunkDistanceSq3,
  forEachRadialChunk,
  generateRadialOffsets,
} from "./utils/chunkPriority";

// Pseudo-random number generator
export const random = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};
