/** The three-chunk surface ring leaves room for the third-person camera offset. */
export const getMeshedTerrainFogEnd = (chunkSize: number) => Math.min(120, chunkSize * 2.4);
