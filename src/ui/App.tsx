import { useEffect } from "react";
import { startSimLoop, stopSimLoop } from "../sim/simLoop";
import { useGameStore } from "../state/store";
import { hasSave } from "../state/persistence";
import { TopBar } from "./panels/TopBar";
import { BottomBar } from "./panels/BottomBar";
import { BuildPanel } from "./panels/BuildPanel";
import { AIPanel } from "./panels/AIPanel";
import { FactoryCanvas } from "./simview/FactoryCanvas";

export function App() {
  useEffect(() => {
    // Load save if it exists
    if (hasSave()) {
      useGameStore.getState().loadGame();
    }

    // Start simulation loop on mount
    startSimLoop();

    // Cleanup on unmount
    return () => {
      stopSimLoop();
      // Save on exit
      useGameStore.getState().saveGame();
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        <BuildPanel />
        <FactoryCanvas />
        <AIPanel />
      </div>

      <BottomBar />
    </div>
  );
}
