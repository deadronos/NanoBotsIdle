import type { ResourceName, ResourceQuantityMap } from "../../types/resources";

export const sumQuantityMap = (
  quantities: ResourceQuantityMap | undefined,
): number => {
  if (!quantities) {
    return 0;
  }

  let total = 0;
  for (const amount of Object.values(quantities)) {
    total += amount ?? 0;
  }
  return total;
};

export const getResourceAmount = (
  contents: ResourceQuantityMap,
  resource: ResourceName,
): number => contents[resource] ?? 0;

export const addResourceAmount = (
  contents: ResourceQuantityMap,
  resource: ResourceName,
  amount: number,
): number => {
  const current = contents[resource] ?? 0;
  const updated = current + amount;
  contents[resource] = updated;
  return updated;
};

export const removeResourceAmount = (
  contents: ResourceQuantityMap,
  resource: ResourceName,
  amount: number,
): number => {
  const current = contents[resource] ?? 0;
  const updated = Math.max(current - amount, 0);
  contents[resource] = updated;
  return current - updated;
};
