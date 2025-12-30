import React, { useState } from "react";

import type { ViewMode } from "../types";
import { useUiStore } from "../ui/store";
import { SettingsModal } from "./SettingsModal";
import { Hud } from "./ui/Hud";
import { Reticle } from "./ui/Reticle";
import { ShopModal } from "./ui/ShopModal";
import { TitlePanel } from "./ui/TitlePanel";
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
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 font-sans"
      data-ui-overlay
    >
      <Hud credits={credits} prestigeLevel={prestigeLevel} />
      <ViewControls
        viewMode={viewMode}
        onToggleView={onToggleView}
        onOpenShop={() => setShopOpen(true)}
      />
      <TitlePanel percentMined={percentMined} onOpenSettings={() => setSettingsOpen(true)} />

      {/* Reticle */}
      {viewMode === "FIRST_PERSON" && <Reticle />}

      {/* Shop Modal */}
      {isShopOpen && <ShopModal onClose={() => setShopOpen(false)} />}

      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};
