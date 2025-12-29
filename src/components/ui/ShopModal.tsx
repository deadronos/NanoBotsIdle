import React from "react";

import { getConfig } from "../../config/index";
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
  const minPrestigeBlocks = cfg.economy.prestigeMinMinedBlocks;
  const bridge = getSimBridge();

  return (
    <ModalShell onClose={onClose}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          ✕
        </button>

        <h2 className="text-3xl font-bold text-white mb-6 border-b border-white/10 pb-4">
          Research & Development
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <UpgradeCard
            title="Drone Fleet"
            level={snapshot.droneCount}
            cost={nextCosts.drone ?? 0}
            onClick={() => bridge.enqueue({ t: "BUY_UPGRADE", id: "drone", n: 1 })}
            canAfford={snapshot.credits >= (nextCosts.drone ?? Number.POSITIVE_INFINITY)}
            desc="Add another autonomous mining unit."
          />
          <UpgradeCard
            title="Mining Drill"
            level={snapshot.miningSpeedLevel}
            cost={nextCosts.speed ?? 0}
            onClick={() => bridge.enqueue({ t: "BUY_UPGRADE", id: "speed", n: 1 })}
            canAfford={snapshot.credits >= (nextCosts.speed ?? Number.POSITIVE_INFINITY)}
            desc="Decreases time required to mine a block."
          />
          <UpgradeCard
            title="Thrusters"
            level={snapshot.moveSpeedLevel}
            cost={nextCosts.move ?? 0}
            onClick={() => bridge.enqueue({ t: "BUY_UPGRADE", id: "move", n: 1 })}
            canAfford={snapshot.credits >= (nextCosts.move ?? Number.POSITIVE_INFINITY)}
            desc="Drones fly faster between targets."
          />
          <UpgradeCard
            title="Laser Power"
            level={snapshot.laserPowerLevel}
            cost={nextCosts.laser ?? 0}
            onClick={() => bridge.enqueue({ t: "BUY_UPGRADE", id: "laser", n: 1 })}
            canAfford={snapshot.credits >= (nextCosts.laser ?? Number.POSITIVE_INFINITY)}
            desc="Increases beam intensity (visual)."
          />
        </div>

        <div className="bg-purple-900/20 border border-purple-500/30 p-6 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-purple-400">Planetary Jump (Prestige)</h3>
            <p className="text-sm text-purple-200/60 mt-1">
              Reset world generation. Keep upgrades. +1 Prestige Level.
            </p>
            <p className="text-xs text-purple-200/40 mt-1">Increases resource value multiplier.</p>
          </div>
          <button
            onClick={() => {
              bridge.enqueue({ t: "PRESTIGE" });
              onClose();
            }}
            disabled={snapshot.minedBlocks < minPrestigeBlocks}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            {snapshot.minedBlocks < minPrestigeBlocks ? `Mine ${minPrestigeBlocks} Blocks first` : "WARP JUMP"}
          </button>
        </div>
    </ModalShell>
  );
};
