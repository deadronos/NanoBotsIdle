import type { System } from "./System";
import type { World } from "../world/World";

const clamp = (v: number, min = 0, max = Number.POSITIVE_INFINITY) =>
	Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min;

export const heatAndPowerSystem: System = {
	id: "heatAndPower",
	update: (world: World, dt: number) => {
		const delta = Number.isFinite(dt) && dt > 0 ? dt : 0;

		// Sum heat generation and cooling
		const totalHeatGeneration = Object.values(world.heatSource).reduce(
			(sum, src) => sum + (src?.heatPerSecond ?? 0),
			0,
		);

		const totalCooling = Object.values(world.heatSink).reduce(
			(sum, sink) => sum + (sink?.coolingPerSecond ?? 0),
			0,
		);

		// Optionally increase heat generation when overclock is enabled
		const overclockFactor = world.globals.overclockEnabled ? 1.25 : 1;

		const netPerSecond = totalHeatGeneration * overclockFactor - totalCooling;

		// Update current heat (integrate over dt) and clamp to non-negative
		world.globals.heatCurrent = clamp(
			world.globals.heatCurrent + netPerSecond * delta,
			0,
		);

		// Keep heatCurrent bounded to a reasonable ceiling to avoid NaNs.
		const safeCeil = Math.max(1, world.globals.heatSafeCap * 10);
		world.globals.heatCurrent = Math.min(world.globals.heatCurrent, safeCeil);

		// Update power demand by summing powerLink (simple aggregation)
		const totalDemand = Object.values(world.powerLink).reduce((sum, link) => {
			if (!link?.online) return sum;
			const d = Number.isFinite(link.demand) ? link.demand : 0;
			return sum + Math.max(0, d);
		}, 0);

		world.globals.powerDemand = Math.max(0, totalDemand);
		// Ensure powerAvailable is at least a small buffer above demand (preserve previous logic)
		world.globals.powerAvailable = Math.max(world.globals.powerAvailable, world.globals.powerDemand + 2);
	},
};

export default heatAndPowerSystem;
