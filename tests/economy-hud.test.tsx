// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { Hud } from "../src/components/ui/Hud";
import { getConfig } from "../src/config";
import { computeNextUpgradeCosts } from "../src/economy/upgrades";
import type { UiSnapshot } from "../src/shared/protocol";
import { useUiStore } from "../src/ui/store";

const initialSnapshot = useUiStore.getState().snapshot;

let root: Root | undefined;
const container = document.createElement("div");

const readHud = (snapshot: UiSnapshot): string => {
  useUiStore.getState().setSnapshot(snapshot);
  root = createRoot(container);
  act(() => root?.render(<Hud />));
  return container.textContent ?? "";
};

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  useUiStore.getState().setSnapshot(initialSnapshot);
});

describe("economy HUD", () => {
  it("shows deposit income, cargo value and how far away the cheapest upgrade is", () => {
    const snapshot = { ...initialSnapshot, credits: 40, creditsPerMinute: 90, cargoInTransit: 65 };
    const content = readHud({
      ...snapshot,
      nextCosts: computeNextUpgradeCosts(snapshot, getConfig()),
    });

    expect(content).toContain("Credits/min");
    expect(content).toContain("$90");
    expect(content).toContain("Cargo in transit");
    expect(content).toContain("$65");
    expect(content).toContain("Mining Drill");
    expect(content).toContain("$10 short");
  });

  it("skips capped upgrades and recognizes an exact-cost purchase", () => {
    const config = getConfig();
    const snapshot = {
      ...initialSnapshot,
      credits: 50,
      miningSpeedLevel: config.economy.maxLevels.speed,
      nextCosts: { speed: 1, move: 50, drone: 100 },
    };
    const content = readHud(snapshot);

    expect(content).toContain("Thrusters");
    expect(content).toContain("Ready");
  });

  it("shows when every upgrade is capped", () => {
    const { maxLevels } = getConfig().economy;
    const snapshot = {
      ...initialSnapshot,
      droneCount: maxLevels.drone,
      haulerCount: maxLevels.hauler,
      miningSpeedLevel: maxLevels.speed,
      moveSpeedLevel: maxLevels.move,
      laserPowerLevel: maxLevels.laser,
      nextCosts: { drone: 1, hauler: 1, speed: 1, move: 1, laser: 1 },
    };
    const content = readHud(snapshot);

    expect(content).toContain("All maxed");
  });
});
