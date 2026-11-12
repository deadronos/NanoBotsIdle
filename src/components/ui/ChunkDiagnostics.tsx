import React from "react";

import { useUiStore } from "../../ui/store";

export const ChunkDiagnostics: React.FC = () => {
  const status = useUiStore((state) => state.chunkDiagnostics);
  if (!status) return null;
  return (
    <aside
      aria-label="Chunk diagnostics"
      className="game-panel absolute bottom-3 left-3 px-3 py-2 text-xs md:bottom-14"
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 tabular-nums">
        {Object.entries(status).map(([label, count]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt>{label}</dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
};
