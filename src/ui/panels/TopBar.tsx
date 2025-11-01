import { useMemo } from "react";

import { useGameStore } from "../../state/store";

const formatNumber = (value: number): string =>
  Number.isFinite(value) ? value.toLocaleString() : "0";

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col text-xs uppercase tracking-wide text-slate-300">
    <span>{label}</span>
    <span className="text-base font-semibold text-slate-50">{value}</span>
  </div>
);

export const TopBar = () => {
  const snapshot = useGameStore((state) => state.uiSnapshot);

  const stats = useMemo(
    () => [
      {
        label: "Heat",
        value: `${formatNumber(snapshot.heatCurrent)} / ${formatNumber(snapshot.heatSafeCap)}`,
      },
      {
        label: "Power",
        value: `${formatNumber(snapshot.powerAvailable)} → ${formatNumber(snapshot.powerDemand)}`,
      },
      {
        label: "Throughput",
        value: `${formatNumber(snapshot.throughput)} atoms/s`,
      },
      {
        label: "Projected Shards",
        value: formatNumber(snapshot.projectedShards),
      },
    ],
    [snapshot],
  );

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-3">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold text-slate-50">NanoFactory Evolution</h1>
        <div className="flex items-center gap-6">
          {stats.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      </div>
      <div className="text-xs uppercase tracking-wide text-slate-400">
        Sim Time: {formatNumber(snapshot.simTimeSeconds)}s
      </div>
    </header>
  );
};
