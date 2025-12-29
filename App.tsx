import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats, Loader } from '@react-three/drei';
import { World, WorldApi } from './components/World';
import { Player } from './components/Player';
import { Environment } from './components/Environment';
import { UI } from './components/UI';
import { Drones } from './components/Drones';
import { ViewMode } from './types';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('THIRD_PERSON');
  const worldRef = useRef<WorldApi>(null);

  const toggleView = () => {
    setViewMode((prev) => (prev === 'FIRST_PERSON' ? 'THIRD_PERSON' : 'FIRST_PERSON'));
  };

  return (
    <div className="relative w-full h-full bg-black">
      <UI viewMode={viewMode} onToggleView={toggleView} />
      
      <Canvas shadows camera={{ fov: 75 }}>
        {/* Performance Stats */}
        {/* <Stats /> */}

        <group>
          <Environment />
          <World ref={worldRef} />
          <Drones worldRef={worldRef} />
          <Player viewMode={viewMode} />
        </group>
      </Canvas>
      <Loader />
    </div>
  );
}

export default App;
