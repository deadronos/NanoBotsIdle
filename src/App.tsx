import { Canvas } from "@react-three/fiber";
import React, { Suspense, useRef, useState } from "react";

import { Drones } from "./components/Drones";
import { Environment } from "./components/Environment";
import { Player } from "./components/Player";
import { UI } from "./components/UI";
import type { WorldApi } from "./components/World";
import { World } from "./components/World";
import type { ViewMode } from "./types";

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("THIRD_PERSON");
  const worldRef = useRef<WorldApi>(null);

  const toggleView = () => {
    setViewMode((prev) => (prev === "FIRST_PERSON" ? "THIRD_PERSON" : "FIRST_PERSON"));
  };

  return (
    <>
      <UI viewMode={viewMode} onToggleView={toggleView} />
      <Canvas shadows camera={{ fov: 60 }}>
        <Suspense fallback={null}>
          <Environment />
          <World ref={worldRef} />
          <Player viewMode={viewMode} />
          <Drones worldRef={worldRef} />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
