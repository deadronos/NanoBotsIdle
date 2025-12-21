import { useMemo } from "react";

import { tileForBlockIcon } from "../../game/items";
import type { BlockId } from "../../voxel/World";
import { cn } from "../lib/utils";
import { iconStyle } from "../utils";

type HotbarProps = {
  hotbar: BlockId[];
  selectedSlot: number;
  inventory: Record<number, number>;
  atlasUrl?: string;
};

export default function Hotbar({ hotbar, selectedSlot, inventory, atlasUrl }: HotbarProps) {
  const hotbarSlots = useMemo(
    () =>
      hotbar.map((id) => ({
        id,
        tile: tileForBlockIcon(id),
      })),
    [hotbar],
  );

  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 grid -translate-x-1/2 grid-flow-col gap-2 rounded-2xl border border-white/10 bg-black/60 p-2 backdrop-blur-md">
      {hotbarSlots.map((slot, idx) => {
        const count = inventory[slot.id] ?? 0;
        return (
          <div
            key={`${slot.id}-${idx}`}
            className={cn(
              "relative grid h-14 w-14 place-items-center rounded-xl border border-white/20 bg-black/70",
              idx === selectedSlot &&
                "border-[var(--accent)] shadow-[0_0_0_2px_rgba(255,200,95,0.35),0_0_16px_rgba(255,200,95,0.35)] animate-[pulse_1.4s_ease-in-out_infinite]",
            )}
          >
            <div className="absolute left-2 top-1 text-[11px] text-white/70">{idx + 1}</div>
            <div className="item-icon" style={iconStyle(slot.tile, atlasUrl)} />
            <div className="slot-count">{count}</div>
          </div>
        );
      })}
    </div>
  );
}
