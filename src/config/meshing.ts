export type MeshingConfig = {
  maxInFlight: number;
  maxQueueSize: number;
};

export const defaultMeshingConfig: MeshingConfig = {
  maxInFlight: 16,
  maxQueueSize: 256,
};

export default defaultMeshingConfig;
