import type { ResourceName, ResourceQuantityMap } from "../../types/resources";

export const sumQuantityMap = (
  quantities: ResourceQuantityMap | undefined,
): number =>
  quantities
    ? Object.values(quantities).reduce(
        (total, amount) => total + (amount ?? 0),
        0,
      )
    : 0;

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
