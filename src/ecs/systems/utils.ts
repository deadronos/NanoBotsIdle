import type { System } from "./System";

export const createNoopSystem = (id: string): System => ({
  id,
  update: () => {
    /* no-op */
  },
});
