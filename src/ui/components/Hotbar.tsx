import { useMemo } from "react";
import { tileForBlockIcon } from "../../game/items";
import type { BlockId } from "../../voxel/World";
import { iconStyle } from "../utils";

type HotbarProps = {
  hotbar: BlockId[];
  selectedSlot: number;
  inventory: Record<number, number>;
  atlasUrl?: string;
};

export default function Hotbar({ hotbar, selectedSlot, inventory, atlasUrl }: HotbarProps) {
  const hotbarSlots = useMemo(() => hotbar.map((id) => ({
    id,
    tile: tileForBlockIcon(id)
  })), [hotbar]);

  return (
    <div className="hotbar">
      {hotbarSlots.map((slot, idx) => {
        const count = inventory[slot.id] ?? 0;
        return (
          <div
            key={`${slot.id}-${idx}`}
            className={`slot ${idx === selectedSlot ? "selected" : ""}`}
          >
            <div className="slot-index">{idx + 1}</div>
            <div className="item-icon" style={iconStyle(slot.tile, atlasUrl)} />
            <div className="slot-count">{count}</div>
          </div>
        );
      })}
    </div>
  );
}
