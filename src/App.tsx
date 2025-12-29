import { Canvas } from "@react-three/fiber";
import React, { Suspense, useEffect, useRef, useState } from "react";

import { Drones } from "./components/Drones";
import { Environment } from "./components/Environment";
import { Player } from "./components/Player";
import { UI } from "./components/UI";
import type { WorldApi } from "./components/World";
import { World } from "./components/World";
import { getSimBridge } from "./simBridge/simBridge";
import type { ViewMode } from "./types";
import { useUiStore } from "./ui/store";

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("THIRD_PERSON");
  const worldRef = useRef<WorldApi>(null);

  const toggleView = () => {
    setViewMode((prev) => (prev === "FIRST_PERSON" ? "THIRD_PERSON" : "FIRST_PERSON"));
  };

  useEffect(() => {
    const bridge = getSimBridge();
    const setSnapshot = useUiStore.getState().setSnapshot;
    let lastLog = 0;
    const unsubscribe = bridge.onFrame((frame) => {
      setSnapshot(frame.ui);
      if (!frame.stats) return;
      const now = performance.now();
      if (now - lastLog < 1000) return;
      lastLog = now;
      console.debug(
        `[sim] frame=${frame.frameId} simMs=${frame.stats.simMs.toFixed(2)} backlog=${frame.stats.backlog}`,
      );
    });
    bridge.start();
    return () => {
      unsubscribe();
      bridge.stop();
    };
  }, []);

  return (
    <>
      <UI viewMode={viewMode} onToggleView={toggleView} />
      <Canvas shadows camera={{ fov: 60 }}>
        <Suspense fallback={null}>
          <Environment />
          <World ref={worldRef} />
          <Player viewMode={viewMode} />
          <Drones />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
