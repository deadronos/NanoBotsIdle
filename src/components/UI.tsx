import React, { useState } from "react";

import type { ViewMode } from "../types";
import { useUiStore } from "../ui/store";
import { SettingsModal } from "./SettingsModal";
import { Hud } from "./ui/Hud";
import { Reticle } from "./ui/Reticle";
import { ShopModal } from "./ui/ShopModal";
import { TitlePanel } from "./ui/TitlePanel";
import { TouchControls } from "./ui/TouchControls";
import { ViewControls } from "./ui/ViewControls";

interface UIProps {
  viewMode: ViewMode;
  onToggleView: () => void;
}

export const UI: React.FC<UIProps> = ({ viewMode, onToggleView }) => {
  const snapshot = useUiStore((state) => state.snapshot);
  const credits = snapshot.credits;
  const prestigeLevel = snapshot.prestigeLevel;
  const minedBlocks = snapshot.minedBlocks;
  const totalBlocks = snapshot.totalBlocks;
  const [isShopOpen, setShopOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const percentMined = totalBlocks > 0 ? (minedBlocks / totalBlocks) * 100 : 0;

  return (
    <div
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 font-sans flex flex-col p-4 md:block md:p-0"
      data-ui-overlay
    >
      {/* Mobile Layout (< md) */}
      <div className="flex flex-row justify-between items-start w-full md:hidden pointer-events-none mb-4">
        <TitlePanel
          percentMined={percentMined}
          onOpenSettings={() => setSettingsOpen(true)}
          className="pointer-events-auto"
        />
        <ViewControls
          viewMode={viewMode}
          onToggleView={onToggleView}
          onOpenShop={() => setShopOpen(true)}
          className="pointer-events-auto scale-90 origin-top-right"
        />
      </div>

      <div className="flex justify-center w-full md:hidden pointer-events-none">
        <Hud
          credits={credits}
          prestigeLevel={prestigeLevel}
          className="pointer-events-auto scale-90"
        />
      </div>

      {/* Touch Controls (Mobile Only) */}
      <TouchControls className="mb-8" />

      {/* Desktop Layout (>= md) */}
      <div className="hidden md:contents">
        <Hud
          credits={credits}
          prestigeLevel={prestigeLevel}
          className="absolute top-4 left-1/2 -translate-x-1/2"
        />
        <ViewControls
          viewMode={viewMode}
          onToggleView={onToggleView}
          onOpenShop={() => setShopOpen(true)}
          className="absolute top-4 right-4"
        />
        <TitlePanel
          percentMined={percentMined}
          onOpenSettings={() => setSettingsOpen(true)}
          className="absolute top-4 left-4"
        />
      </div>

      {/* Reticle */}
      {viewMode === "FIRST_PERSON" && <Reticle />}

      {/* Shop Modal */}
      {isShopOpen && <ShopModal onClose={() => setShopOpen(false)} />}

      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};
