import React from "react";
import { useShallow } from "zustand/react/shallow";

import { useConfig } from "../../config/useConfig";
import { getCheapestUpgrade, UPGRADE_NAMES } from "../../economy/upgrades";
import { useUiStore } from "../../ui/store";

const formatCredits = (amount: number): string => `$${amount.toLocaleString()}`;

export const Hud: React.FC = () => {
  const config = useConfig();
  const { credits, creditsPerMinute, cargoInTransit, prestigeLevel, minedBlocks, totalBlocks } =
    useUiStore(useShallow(({ snapshot }) => ({
      credits: snapshot.credits,
      creditsPerMinute: snapshot.creditsPerMinute,
      cargoInTransit: snapshot.cargoInTransit,
      prestigeLevel: snapshot.prestigeLevel,
      minedBlocks: snapshot.minedBlocks,
      totalBlocks: snapshot.totalBlocks,
    })));
  const progress = totalBlocks > 0 ? Math.min(minedBlocks / totalBlocks, 1) : 0;
  const nextUpgrade = useUiStore(useShallow(({ snapshot }) => getCheapestUpgrade(snapshot, config)));
  const shortfall = nextUpgrade ? Math.max(0, nextUpgrade.cost - credits) : 0;

  return (
    <dl className="game-panel grid max-w-full grid-cols-[minmax(0,.95fr)_minmax(0,1.3fr)_minmax(0,1.25fr)] gap-x-2 gap-y-2 px-3 py-2 tabular-nums">
      <div>
        <dt className="game-stat-label">Credits</dt>
        <dd className="break-all text-sm font-semibold text-amber-300">{formatCredits(credits)}</dd>
      </div>
      <div>
        <dt className="game-stat-label">Prestige</dt>
        <dd className="text-sm font-semibold">{prestigeLevel}</dd>
      </div>
      <div>
        <dt className="game-stat-label">Mined</dt>
        <dd className="text-sm font-semibold">
          {(progress * 100).toFixed(1)}%
          <progress className="game-progress" aria-label="World mined" value={progress} max={1} />
        </dd>
      </div>
      <div>
        <dt className="game-stat-label">Credits/min</dt>
        <dd className="break-all text-sm font-semibold">{formatCredits(creditsPerMinute)}</dd>
      </div>
      <div>
        <dt className="game-stat-label">Cargo in transit</dt>
        <dd className="break-all text-sm font-semibold">{formatCredits(cargoInTransit)}</dd>
      </div>
      <div>
        <dt className="game-stat-label">Next upgrade</dt>
        {nextUpgrade ? (
          <dd className="text-xs font-semibold">
            <span className="block">{UPGRADE_NAMES[nextUpgrade.type]}</span>
            <span className="wrap-break-word text-[0.625rem] text-slate-300">
              {formatCredits(nextUpgrade.cost)}{" · "}
              {shortfall > 0 ?
                `${formatCredits(shortfall)} short`
              : <span className="text-emerald-300">Ready</span>}
            </span>
          </dd>
        ) : (
          <dd className="text-xs font-semibold">All maxed</dd>
        )}
      </div>
    </dl>
  );
};
