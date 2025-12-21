import { INVENTORY_BLOCKS, tileForBlockIcon } from "../../game/items";
import { type Recipe, RECIPES } from "../../game/recipes";
import { type BlockId, blockIdToName } from "../../voxel/World";
import { cn } from "../lib/utils";
import { iconStyle } from "../utils";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type InventoryOverlayProps = {
  atlasUrl?: string;
  inventory: Record<number, number>;
  selectedSlot: number;
  onAssignSlot: (slot: number, id: BlockId) => void;
  onCraft: (recipe: Recipe) => void;
  onClose: () => void;
};

export default function InventoryOverlay({
  atlasUrl,
  inventory,
  selectedSlot,
  onAssignSlot,
  onCraft,
  onClose,
}: InventoryOverlayProps) {
  return (
    <div className="overlay">
      <Card className="w-[min(980px,92vw)] max-h-[86vh] overflow-hidden border-white/10 bg-[var(--panel)]">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-display text-base uppercase tracking-[0.18em]">
              Inventory
            </CardTitle>
            <CardDescription className="text-xs">
              Click an item to assign it to the selected hotbar slot.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardHeader>

        <CardContent className="text-xs">
          <Tabs defaultValue="inventory">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="crafting">Crafting</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
              <ScrollArea className="h-[min(50vh,420px)] pr-2">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-3">
                  {INVENTORY_BLOCKS.map((id) => {
                    const count = inventory[id] ?? 0;
                    const disabled = count <= 0;
                    return (
                      <Button
                        key={id}
                        type="button"
                        variant="outline"
                        size="icon"
                        className="relative h-16 w-full rounded-xl border-white/20 bg-black/60 p-0 transition hover:-translate-y-0.5"
                        disabled={disabled}
                        onClick={() => onAssignSlot(selectedSlot, id)}
                        title={blockIdToName(id)}
                      >
                        <div className="item-icon" style={iconStyle(tileForBlockIcon(id), atlasUrl)} />
                        <div className="slot-count">{count}</div>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="crafting">
              <ScrollArea className="h-[min(50vh,420px)] pr-2">
                <div className="space-y-3">
                  <div>
                    <div className="font-display text-sm uppercase tracking-[0.12em]">
                      Crafting Bench
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Batch recipes to shape your next build.
                    </div>
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                    {RECIPES.map((recipe) => {
                      const canCraft = recipe.input.every(
                        (input) => (inventory[input.id] ?? 0) >= input.count,
                      );
                      return (
                        <div
                          key={recipe.id}
                          className={cn(
                            "grid gap-3 rounded-xl border border-white/10 bg-black/50 p-4",
                            canCraft &&
                              "border-[rgba(126,227,255,0.6)] shadow-[inset_0_0_0_1px_rgba(126,227,255,0.3)]",
                          )}
                        >
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            {recipe.name}
                          </div>
                          <div className="flex items-center gap-3">
                            {recipe.input.map((input) => (
                              <div
                                key={`${recipe.id}-${input.id}`}
                                className="relative grid h-11 w-11 place-items-center rounded-lg border border-white/20 bg-black/60"
                              >
                                <div
                                  className="item-icon"
                                  style={iconStyle(tileForBlockIcon(input.id), atlasUrl)}
                                />
                                <div className="slot-count">{input.count}</div>
                              </div>
                            ))}
                            <div className="text-base text-[var(--accent)]">-&gt;</div>
                            <div className="relative grid h-11 w-11 place-items-center rounded-lg border border-white/20 bg-black/60">
                              <div
                                className="item-icon"
                                style={iconStyle(tileForBlockIcon(recipe.output.id), atlasUrl)}
                              />
                              <div className="slot-count">{recipe.output.count}</div>
                            </div>
                          </div>
                          <Button size="sm" disabled={!canCraft} onClick={() => onCraft(recipe)}>
                            Craft
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
