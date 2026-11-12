import React from "react";

import { getConfig } from "../../config/index";
import { getPrestigeRequirement, UPGRADE_NAMES } from "../../economy/upgrades";
import { LANDING_PROFILES } from "../../shared/miningOperations";
import { getSimBridge } from "../../simBridge/simBridge";
import { useUiStore } from "../../ui/store";
import { ModalShell } from "./ModalShell";
import { UpgradeCard } from "./UpgradeCard";

interface ShopModalProps {
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ onClose }) => {
  const snapshot = useUiStore((state) => state.snapshot);
  const cfg = getConfig();
  const nextCosts = snapshot.nextCosts ?? {};
  const minPrestigeBlocks = getPrestigeRequirement(snapshot.prestigeLevel, cfg);
  const bridge = getSimBridge();
  const maxLevels = cfg.economy.maxLevels;

  return (
    <ModalShell
      onClose={onClose}
      contentClassName="bg-gray-900 border border-white/10 p-4 md:p-8 rounded-2xl max-w-2xl w-full shadow-2xl relative cursor-default z-10"
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
        ✕
      </button>

      <h2 className="text-xl md:text-3xl font-bold text-white mb-4 pr-8 border-b border-white/10 pb-4 shrink-0">
        Research & Development
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <UpgradeCard
          title={UPGRADE_NAMES.drone}
          level={snapshot.droneCount}
          cost={nextCosts.drone ?? 0}
          onClick={() => bridge.enqueue({ t: "BUY_UPGRADE", id: "drone", n: 1 })}
          canAfford={snapshot.credits >= (nextCosts.drone ?? Number.POSITIVE_INFINITY)}
          isMaxLevel={snapshot.droneCount >= maxLevels.drone}
          desc="Add another autonomous mining unit."
        />
        <UpgradeCard
          title={UPGRADE_NAMES.hauler}
          level={snapshot.haulerCount}
          cost={nextCosts.hauler ?? 0}
          onClick={() => bridge.enqueue({ t: "BUY_UPGRADE", id: "hauler", n: 1 })}
          canAfford={snapshot.credits >= (nextCosts.hauler ?? Number.POSITIVE_INFINITY)}
          isMaxLevel={snapshot.haulerCount >= maxLevels.hauler}
          desc="Transports resources from miners to base, improving efficiency."
        />
        <UpgradeCard
          title={UPGRADE_NAMES.speed}
          level={snapshot.miningSpeedLevel}
          cost={nextCosts.speed ?? 0}
          onClick={() => bridge.enqueue({ t: "BUY_UPGRADE", id: "speed", n: 1 })}
          canAfford={snapshot.credits >= (nextCosts.speed ?? Number.POSITIVE_INFINITY)}
          isMaxLevel={snapshot.miningSpeedLevel >= maxLevels.speed}
          desc="Decreases time required to mine a block."
        />
        <UpgradeCard
          title={UPGRADE_NAMES.move}
          level={snapshot.moveSpeedLevel}
          cost={nextCosts.move ?? 0}
          onClick={() => bridge.enqueue({ t: "BUY_UPGRADE", id: "move", n: 1 })}
          canAfford={snapshot.credits >= (nextCosts.move ?? Number.POSITIVE_INFINITY)}
          isMaxLevel={snapshot.moveSpeedLevel >= maxLevels.move}
          desc="Drones fly faster between targets."
        />
        <UpgradeCard
          title={UPGRADE_NAMES.laser}
          level={snapshot.laserPowerLevel}
          cost={nextCosts.laser ?? 0}
          onClick={() => bridge.enqueue({ t: "BUY_UPGRADE", id: "laser", n: 1 })}
          canAfford={snapshot.credits >= (nextCosts.laser ?? Number.POSITIVE_INFINITY)}
          isMaxLevel={snapshot.laserPowerLevel >= maxLevels.laser}
          desc="Increases beam intensity (visual)."
        />
      </div>

      <section className="rounded-xl border border-purple-500/30 bg-purple-900/20 p-4">
        <h3 className="text-xl font-bold text-purple-300">Choose your next landing site</h3>
        <p className="mt-1 text-sm text-purple-100/80">
          Prestige regenerates the world, keeps upgrades, and raises the ore multiplier.
          {snapshot.minedBlocks < minPrestigeBlocks &&
            ` Mine ${minPrestigeBlocks.toLocaleString()} blocks to unlock.`}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(["near", "rich"] as const).map((landing) => (
            <button
              key={landing}
              className="rounded-lg border border-purple-400/40 bg-purple-700/50 px-3 py-2 text-left text-white hover:bg-purple-700 disabled:opacity-50"
              disabled={snapshot.minedBlocks < minPrestigeBlocks}
              onClick={() => {
                bridge.enqueue({ t: "PRESTIGE", landing });
                onClose();
              }}
            >
              <span className="block font-semibold">{LANDING_PROFILES[landing].name}</span>
              <span className="text-xs">{LANDING_PROFILES[landing].description}</span>
            </button>
          ))}
        </div>
      </section>
    </ModalShell>
  );
};
