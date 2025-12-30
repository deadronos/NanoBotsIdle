/* eslint-disable simple-import-sort/imports */
import React, { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";

import { Drones } from "./components/Drones";
import { DynamicResScaler } from "./components/DynamicResScaler";
import { Environment } from "./components/Environment";
import { Player } from "./components/Player";
import { UI } from "./components/UI";
import { World } from "./components/World";
import { useConfig } from "./config/useConfig";
import { getSimBridge } from "./simBridge/simBridge";
import { getTelemetryCollector } from "./telemetry";
import type { ViewMode } from "./types";
import { useUiStore } from "./ui/store";
import { debug } from "./utils/logger";

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("THIRD_PERSON");
  const config = useConfig();
  const telemetry = getTelemetryCollector();

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
      
      // Record worker stats in telemetry
      if (config.telemetry.enabled) {
        telemetry.recordWorkerStats(frame.stats.simMs, frame.stats.backlog);
      }
      
      const now = performance.now();
      if (now - lastLog < 1000) return;
      lastLog = now;
      debug(
        `[sim] frame=${frame.frameId} simMs=${frame.stats.simMs.toFixed(2)} backlog=${frame.stats.backlog}`,
      );
    });
    bridge.start();
    return () => {
      unsubscribe();
      bridge.stop();
    };
  }, [config.telemetry.enabled, telemetry]);

  // Expose telemetry API to window for external access (dev/profiling)
  useEffect(() => {
    if (config.telemetry.enabled) {
      (window as unknown as { getTelemetrySnapshot?: () => string }).getTelemetrySnapshot = () => {
        return telemetry.exportJSON();
      };
    }
    return () => {
      if ((window as unknown as { getTelemetrySnapshot?: () => string }).getTelemetrySnapshot) {
        delete (window as unknown as { getTelemetrySnapshot?: () => string }).getTelemetrySnapshot;
      }
    };
  }, [config.telemetry.enabled, telemetry]);

  return (
    <>
      <UI viewMode={viewMode} onToggleView={toggleView} />
      <Canvas shadows camera={{ fov: 60 }}>
        <Suspense fallback={null}>
          <DynamicResScaler />
          <Environment />
          <World />
          <Player viewMode={viewMode} />
          <Drones />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
