import { useMemo } from "react";

import { useGameStore } from "../../../state/store";

export const PowerOverlay = () => {
  const { powerAvailable, powerDemand } = useGameStore((state) => state.uiSnapshot);

  const status = useMemo(() => {
    if (powerDemand <= 0) {
      return { label: "Idle Grid", color: "rgba(56, 189, 248, 0.15)" };
    }
    const ratio = powerAvailable / powerDemand;
    if (!Number.isFinite(ratio)) {
      return { label: "Power Unknown", color: "rgba(148, 163, 184, 0.1)" };
    }
    if (ratio >= 1) {
      return { label: "Stable Grid", color: "rgba(34, 197, 94, 0.18)" };
    }
    if (ratio >= 0.5) {
      return { label: "Strained Grid", color: "rgba(234, 179, 8, 0.2)" };
    }
    return { label: "Brownout Risk", color: "rgba(239, 68, 68, 0.25)" };
  }, [powerAvailable, powerDemand]);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: status.color, zIndex: 0 }}
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 flex items-start justify-end p-4" style={{ zIndex: 1 }}>
        <div className="rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs uppercase tracking-wide text-slate-200">
          {status.label}
        </div>
      </div>
    </div>
  );
};
