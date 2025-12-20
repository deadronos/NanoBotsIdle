import { useEffect } from "react";
import { useGameStore } from "../../game/store";
import Crosshair from "./Crosshair";
import Hotbar from "./Hotbar";
import InventoryOverlay from "./InventoryOverlay";
import StartOverlay from "./StartOverlay";
import StatsPanel from "./StatsPanel";

export default function Hud() {
  const pointerLocked = useGameStore((state) => state.pointerLocked);
  const requestPointerLock = useGameStore((state) => state.requestPointerLock);
  const atlasUrl = useGameStore((state) => state.atlasUrl);
  const uiOpen = useGameStore((state) => state.uiOpen);
  const setUiOpen = useGameStore((state) => state.setUiOpen);
  const hotbar = useGameStore((state) => state.hotbar);
  const selectedSlot = useGameStore((state) => state.selectedSlot);
  const setSelectedSlot = useGameStore((state) => state.setSelectedSlot);
  const setHotbarSlot = useGameStore((state) => state.setHotbarSlot);
  const inventory = useGameStore((state) => state.inventory);
  const craft = useGameStore((state) => state.craft);
  const stats = useGameStore((state) => state.stats);
  const targetBlock = useGameStore((state) => state.targetBlock);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code.startsWith("Digit")) {
        const idx = Number(e.code.slice(5)) - 1;
        if (!Number.isNaN(idx)) setSelectedSlot(idx);
      }
      if (e.code === "KeyE") {
        const next = !useGameStore.getState().uiOpen;
        setUiOpen(next);
        if (next) {
          document.exitPointerLock();
        } else {
          requestPointerLock?.();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestPointerLock, setSelectedSlot, setUiOpen]);

  const handleCloseInventory = () => {
    setUiOpen(false);
    requestPointerLock?.();
  };

  return (
    <div className="hud">
      <StatsPanel stats={stats} targetBlock={targetBlock} />
      <Crosshair locked={pointerLocked} />

      <Hotbar
        hotbar={hotbar}
        selectedSlot={selectedSlot}
        inventory={inventory}
        atlasUrl={atlasUrl}
      />

      {uiOpen && (
        <InventoryOverlay
          atlasUrl={atlasUrl}
          inventory={inventory}
          selectedSlot={selectedSlot}
          onAssignSlot={setHotbarSlot}
          onCraft={craft}
          onClose={handleCloseInventory}
        />
      )}

      {!pointerLocked && !uiOpen && (
        <StartOverlay onStart={() => requestPointerLock?.()} />
      )}
    </div>
  );
}
