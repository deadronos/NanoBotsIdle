import type { Inventory } from "../components/Inventory";
import type { Producer } from "../components/Producer";
import type { System } from "./System";
import type { World } from "../world/World";
import { getProducerOutputPerSec } from "../../sim/balance";
import type { EntityId } from "../world/EntityId";
import {
  addResourceAmount,
  removeResourceAmount,
  sumQuantityMap,
} from "../utils/resources";

const MAX_PROGRESS_CAP = 10;

const computeMaxBatchesByInputs = (
  inventory: Inventory,
  recipe: Producer["recipe"],
): number => {
  const entries = Object.entries(recipe.inputs ?? {}) as Array<
    [string, number | undefined]
  >;

  if (entries.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return entries.reduce((limit, [resource, amount]) => {
    if (!amount || amount <= 0) {
      return limit;
    }
    const available = inventory.contents[resource] ?? 0;
    const batches = Math.floor(available / amount);
    return Math.min(limit, batches);
  }, Number.POSITIVE_INFINITY);
};

const computeMaxBatchesByCapacity = (
  inventory: Inventory,
  recipe: Producer["recipe"],
): number => {
  if (inventory.capacity <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  const totalInputs = sumQuantityMap(recipe.inputs);
  const totalOutputs = sumQuantityMap(recipe.outputs);
  const netAddition = totalOutputs - totalInputs;

  if (netAddition <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  const currentTotal = sumQuantityMap(inventory.contents);
  const remainingCapacity = Math.max(inventory.capacity - currentTotal, 0);

  return Math.floor(remainingCapacity / netAddition);
};

const consumeInputs = (
  inventory: Inventory,
  recipe: Producer["recipe"],
  batches: number,
): void => {
  for (const [resource, amount] of Object.entries(recipe.inputs ?? {})) {
    if (!amount || amount <= 0) {
      continue;
    }

    const totalToConsume = amount * batches;
    removeResourceAmount(inventory.contents, resource, totalToConsume);
  }
};

const applyOutputs = (
  inventory: Inventory,
  recipe: Producer["recipe"],
  batches: number,
): void => {
  for (const [resource, amount] of Object.entries(recipe.outputs ?? {})) {
    if (!amount || amount <= 0) {
      continue;
    }

    const totalToAdd = amount * batches;
    addResourceAmount(inventory.contents, resource, totalToAdd);
  }
};

const getInventoryForEntity = (
  world: World,
  entityId: EntityId,
): Inventory | undefined => world.inventory[entityId];

const updateProducer = (
  world: World,
  entityId: EntityId,
  producer: Producer,
  dt: number,
): number => {
  const inventory = getInventoryForEntity(world, entityId);
  if (!inventory) {
    return 0;
  }

  const outputPerSec = getProducerOutputPerSec(producer, world.globals);
  if (outputPerSec <= 0) {
    return 0;
  }

  producer.progress = Math.min(
    producer.progress + outputPerSec * dt,
    MAX_PROGRESS_CAP,
  );

  const availableBatches = Math.floor(producer.progress);
  if (availableBatches <= 0) {
    return 0;
  }

  const capacityLimit = computeMaxBatchesByCapacity(inventory, producer.recipe);
  const inputLimit = computeMaxBatchesByInputs(inventory, producer.recipe);
  const batchesToProcess = Math.min(
    availableBatches,
    capacityLimit,
    inputLimit,
  );

  if (!Number.isFinite(batchesToProcess) || batchesToProcess <= 0) {
    producer.progress = Math.min(producer.progress, 1);
    return 0;
  }

  consumeInputs(inventory, producer.recipe, batchesToProcess);
  applyOutputs(inventory, producer.recipe, batchesToProcess);
  producer.progress -= batchesToProcess;

  const totalOutputs = sumQuantityMap(producer.recipe.outputs);
  const throughput = (totalOutputs * batchesToProcess) / Math.max(dt, 1e-6);

  return throughput;
};

export const productionSystem: System = {
  id: "production",
  update: (world, dt) => {
    const producerEntries = Object.entries(world.producer) as Array<
      [string, Producer]
    >;

    let throughputThisTick = 0;

    for (const [rawEntityId, producer] of producerEntries) {
      const entityId = Number(rawEntityId) as EntityId;
      const throughput = updateProducer(world, entityId, producer, dt);
      throughputThisTick += throughput;
    }

    if (!Number.isFinite(throughputThisTick)) {
      throughputThisTick = 0;
    }

    world.globals.throughputPerSec = Math.max(0, throughputThisTick);
    world.globals.peakThroughput = Math.max(
      world.globals.peakThroughput,
      world.globals.throughputPerSec,
    );
  },
};

export default productionSystem;
