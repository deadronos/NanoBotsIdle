import { getSimBridge } from "./simBridge";

export const isRunning = () => {
  try {
    return getSimBridge().isRunning();
  } catch {
    return false;
  }
};

export const start = () => {
  try {
    getSimBridge().start();
  } catch {
    // ignore
  }
};

export const stop = () => {
  try {
    getSimBridge().stop();
  } catch {
    // ignore
  }
};

export const toggle = () => {
  if (isRunning()) stop();
  else start();
};
