import { warn } from "../utils/logger";
import { getSimBridge } from "./simBridge";

export const isRunning = () => {
  try {
    return getSimBridge().isRunning();
  } catch (e) {
    warn("Failed to check if sim is running", e);
    return false;
  }
};

export const start = () => {
  try {
    getSimBridge().start();
  } catch (e) {
    warn("Failed to start sim", e);
  }
};

export const stop = () => {
  try {
    getSimBridge().stop();
  } catch (e) {
    warn("Failed to stop sim", e);
  }
};

export const toggle = () => {
  if (isRunning()) stop();
  else start();
};
