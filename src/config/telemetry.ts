export type TelemetryConfig = {
  enabled: boolean;
  collectFps: boolean;
  collectFrameTime: boolean;
  collectMeshingTime: boolean;
  collectWorkerQueue: boolean;
  exportIntervalMs: number;
};

export const defaultTelemetryConfig: TelemetryConfig = {
  enabled: false, // Opt-in, dev-only by default
  collectFps: true,
  collectFrameTime: true,
  collectMeshingTime: true,
  collectWorkerQueue: true,
  exportIntervalMs: 5000, // Export metrics every 5 seconds
};

export default defaultTelemetryConfig;
