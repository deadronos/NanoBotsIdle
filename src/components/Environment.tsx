import { Sky } from "@react-three/drei";
import React from "react";

import { useConfig } from "../config/useConfig";
import { getMeshedTerrainFogEnd } from "../render/terrainFog";

export const Environment: React.FC = () => {
  const { render, terrain } = useConfig();
  const fogEnd =
    render.voxels.mode === "meshed" ? getMeshedTerrainFogEnd(terrain.chunkSize ?? 16) : 120;
  const { sky, sun } = render;

  return (
    <>
      <Sky
        distance={sky.distance}
        sunPosition={sky.sunPosition}
        turbidity={sky.turbidity}
        rayleigh={sky.rayleigh}
      />
      <hemisphereLight args={["#d3e8ff", "#a79780", render.ambientLightIntensity]} />
      <fog attach="fog" args={["#dce6ec", fogEnd * 0.55, fogEnd]} />
      <directionalLight
        position={sun.position}
        color="#fff0d5"
        intensity={sun.intensity}
        castShadow
        shadow-mapSize={sun.shadowMapSize}
        shadow-camera-left={sun.cameraBounds.left}
        shadow-camera-right={sun.cameraBounds.right}
        shadow-camera-top={sun.cameraBounds.top}
        shadow-camera-bottom={sun.cameraBounds.bottom}
        shadow-bias={sun.bias}
        shadow-normalBias={sun.normalBias}
      />
    </>
  );
};
