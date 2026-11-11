import React, { useState } from "react";

import { useConfig } from "../config/useConfig";
import type { ViewMode } from "../types";
import { useUiStore } from "../ui/store";
import { SettingsModal } from "./SettingsModal";
import { TelemetryPanel } from "./TelemetryPanel";
import { BuildingDrawer } from "./ui/BuildingDrawer";
import { Hud } from "./ui/Hud";
import { Minimap } from "./ui/Minimap";
import { PauseButton } from "./ui/PauseButton";
import { Reticle } from "./ui/Reticle";
import { ShopModal } from "./ui/ShopModal";
import { TouchControls } from "./ui/TouchControls";

interface UIProps {
  viewMode: ViewMode;
  onToggleView: () => void;
}

export const UI: React.FC<UIProps> = ({ viewMode, onToggleView }) => {
  const [modal, setModal] = useState<"research" | "settings" | null>(null);
  const [isMapOpen, setMapOpen] = useState(false);
  const [isTelemetryOpen, setTelemetryOpen] = useState(false);
  const config = useConfig();
  const buildingMode = useUiStore((state) => state.buildingMode);
  const setBuildingMode = useUiStore((state) => state.setBuildingMode);

  React.useEffect(() => {
    if (buildingMode === "NONE" || modal) return;
    const cancelPlacement = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBuildingMode("NONE");
    };
    window.addEventListener("keydown", cancelPlacement);
    return () => window.removeEventListener("keydown", cancelPlacement);
  }, [buildingMode, modal, setBuildingMode]);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none font-sans" data-ui-overlay>
      <header className="absolute inset-x-3 top-3 flex flex-col items-start justify-between gap-2 md:inset-x-5 md:top-5 md:flex-row">
        <Hud />
        <nav
          aria-label="Game controls"
          className="game-panel relative flex max-w-full flex-wrap items-center gap-0.5 p-1 pointer-events-auto"
        >
          <button
            className="game-control game-control-primary"
            onClick={() => setModal("research")}
          >
            Research
          </button>
          <BuildingDrawer />
          <button
            className="game-control"
            aria-label="First-person camera"
            aria-pressed={viewMode === "FIRST_PERSON"}
            onClick={onToggleView}
          >
            {viewMode === "FIRST_PERSON" ? "1st person" : "3rd person"}
          </button>
          <button
            className="game-control"
            aria-pressed={isMapOpen}
            onClick={() => setMapOpen(!isMapOpen)}
          >
            Map
          </button>
          <button className="game-control" onClick={() => setModal("settings")}>
            Settings
          </button>
          <PauseButton />
          {isMapOpen && <Minimap />}
        </nav>
      </header>

      {viewMode === "FIRST_PERSON" && !modal && <Reticle />}
      <TouchControls />
      <p className="game-panel absolute bottom-3 left-3 hidden px-3 py-2 text-xs [@media(pointer:fine)]:md:block md:bottom-5 md:left-5">
        <kbd>WASD</kbd> Move <span aria-hidden="true">·</span> <kbd>Shift</kbd> Run{" "}
        <span aria-hidden="true">·</span> Drag to look
      </p>

      {modal === "research" && <ShopModal onClose={() => setModal(null)} />}
      {modal === "settings" && <SettingsModal onClose={() => setModal(null)} />}

      {config.telemetry.enabled && (
        <>
          <button
            onClick={() => setTelemetryOpen(!isTelemetryOpen)}
            className="game-panel game-control absolute bottom-3 right-3 pointer-events-auto md:bottom-5 md:right-5"
            aria-pressed={isTelemetryOpen}
          >
            Telemetry
          </button>
          <TelemetryPanel isOpen={isTelemetryOpen} onClose={() => setTelemetryOpen(false)} />
        </>
      )}
    </div>
  );
};
