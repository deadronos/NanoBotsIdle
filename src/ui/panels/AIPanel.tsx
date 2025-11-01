import { useMemo } from "react";

import { useGameStore } from "../../state/store";

export const AIPanel = () => {
  const bottlenecks = useGameStore((state) => state.uiSnapshot.bottlenecks);
  const swarm = useGameStore((state) => state.swarmCognition);

  const specialists = useMemo(
    () => [
      { label: "Haulers", value: swarm.startingSpecialists.hauler },
      { label: "Builders", value: swarm.startingSpecialists.builder },
      { label: "Maintainers", value: swarm.startingSpecialists.maintainer },
    ],
    [swarm.startingSpecialists.builder, swarm.startingSpecialists.hauler, swarm.startingSpecialists.maintainer],
  );

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Swarm Configuration
        </h2>
        <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-300">
          <div>Congestion Avoidance: Tier {swarm.congestionAvoidanceLevel}</div>
          <div>Prefetch Logic: {swarm.prefetchUnlocked ? "Unlocked" : "Locked"}</div>
          <div className="mt-2 space-y-1">
            {specialists.map((spec) => (
              <div key={spec.label} className="flex justify-between">
                <span>{spec.label}</span>
                <span className="font-semibold text-slate-100">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Diagnostics
        </h2>
        <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-300">
          {bottlenecks.length === 0 ? (
            <div className="text-slate-500">No active bottlenecks detected.</div>
          ) : (
            bottlenecks.map((entry, index) => (
              <div key={`${entry}-${index}`} className="rounded bg-slate-800/70 px-2 py-1">
                {entry}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
