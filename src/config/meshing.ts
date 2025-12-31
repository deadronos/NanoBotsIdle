export type MeshingConfig = {
  maxInFlight: number;
  maxQueueSize: number;
  maxMeshesPerFrame: number;
};

export const defaultMeshingConfig: MeshingConfig = {
  maxInFlight: 4,
  maxQueueSize: 256,
  maxMeshesPerFrame: 4,
};

export default defaultMeshingConfig;
