import { useSyncExternalStore } from "react";

import { getConfig, subscribeConfig } from "./index";

export const useConfig = () => {
  return useSyncExternalStore(subscribeConfig, getConfig, getConfig);
};
