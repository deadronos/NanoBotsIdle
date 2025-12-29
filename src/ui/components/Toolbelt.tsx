import { getToolDef, type ToolId, type ToolStack } from "../../voxel/tools";
import { cn } from "../lib/utils";

type ToolbeltProps = {
  tools: Partial<Record<ToolId, ToolStack>>;
  equippedToolId?: ToolId;
};

export default function Toolbelt({ tools, equippedToolId }: ToolbeltProps) {
  const def = equippedToolId ? getToolDef(equippedToolId) : undefined;
  const stack = equippedToolId ? tools[equippedToolId] : undefined;
  const maxDurability = def?.durability ?? 1;
  const durability = stack?.durability ?? maxDurability;
  const percent = Math.max(0, Math.min(1, durability / maxDurability));

  return (
    <div className="pointer-events-none absolute bottom-24 right-6 w-[min(240px,60vw)] rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs backdrop-blur-md">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Tool</div>
      <div className="mt-1 flex items-center gap-2">
        <div className="font-display text-sm">{def?.name ?? "Hands"}</div>
        {stack?.count && stack.count > 1 && (
          <span className="text-[10px] text-white/60">x{stack.count}</span>
        )}
      </div>
      {def && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-white/60">
            <span>Durability</span>
            <span>
              {Math.max(0, Math.floor(durability))}/{def.durability}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn("h-full", percent > 0.35 ? "bg-[var(--accent)]" : "bg-[var(--danger)]")}
              style={{ width: `${Math.round(percent * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
