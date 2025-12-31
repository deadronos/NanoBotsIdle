import { createSimBridge } from "./createSimBridge";
import type { SimBridge } from "./types";

export type { FrameHandler, FrameMessage, SimBridge, SimBridgeOptions, WorkerLike } from "./types";
export { createSimBridge };

let singleton: SimBridge | null = null;

export const getSimBridge = (): SimBridge => {
  if (!singleton) {
    singleton = createSimBridge();
  }
  return singleton;
};
