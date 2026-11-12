import React, { useEffect, useMemo } from "react";
import { DataTexture, LinearFilter, RedFormat } from "three";

import { getGroundHeightWithEdits } from "../../sim/collision";
import { getSimBridge } from "../../simBridge/simBridge";

export const TerrainWater: React.FC<{
  waterLevel: number;
  worldRadius: number;
  seed: number;
  prestigeLevel: number;
  meshed: boolean;
}> = ({ waterLevel, worldRadius, seed, prestigeLevel, meshed }) => {
  const size = Math.max(1, Math.ceil(worldRadius + 10) * 2);
  const depthTexture = useMemo(() => {
    const texture = new DataTexture(new Uint8Array(size * size), size, size, RedFormat);
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    return texture;
  }, [size]);

  useEffect(() => () => depthTexture.dispose(), [depthTexture]);

  useEffect(() => {
    const data = depthTexture.image.data as Uint8Array;
    const surfaceOffset = meshed ? 1 : 0.5;
    const updateColumn = (x: number, z: number) => {
      const col = x + size / 2;
      const row = size / 2 - z - 1;
      if (col < 0 || col >= size || row < 0 || row >= size) return;
      const ground = getGroundHeightWithEdits(x, z, prestigeLevel, seed) + surfaceOffset;
      const depth = Math.max(0, waterLevel + 0.02 - ground);
      data[row * size + col] = Math.min(255, Math.round(depth * 28));
    };
    for (let z = -size / 2; z < size / 2; z++) {
      for (let x = -size / 2; x < size / 2; x++) updateColumn(x, z);
    }
    depthTexture.needsUpdate = true;

    let active = true;
    const unsubscribe = getSimBridge().onFrame(({ delta, ui }) => {
      if (ui.prestigeLevel !== prestigeLevel || (ui.actualSeed ?? seed) !== seed) return;
      if (!delta.edits?.length) return;
      const edits = delta.edits;
      // Let terrain subscribers apply the edits before reading the shared collision field.
      queueMicrotask(() => {
        if (!active) return;
        for (const edit of edits) updateColumn(edit.x, edit.z);
        depthTexture.needsUpdate = true;
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [depthTexture, meshed, prestigeLevel, seed, size, waterLevel]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, waterLevel + 0.02, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        key={size}
        color="#438caa"
        transparent
        opacity={0.72}
        depthWrite={false}
        roughness={0.24}
        metalness={0.08}
        onBeforeCompile={(shader) => {
          shader.uniforms.terrainWaterDepth = { value: depthTexture };
          shader.vertexShader = `varying vec2 vTerrainWaterUv;\n${shader.vertexShader}`.replace(
            "#include <uv_vertex>",
            "#include <uv_vertex>\nvTerrainWaterUv = uv;",
          );
          shader.fragmentShader =
            `uniform sampler2D terrainWaterDepth;\nvarying vec2 vTerrainWaterUv;\n${shader.fragmentShader}`.replace(
              "#include <color_fragment>",
              `#include <color_fragment>
            float depth = texture2D(terrainWaterDepth, vTerrainWaterUv).r;
            float shoreline = smoothstep(0.002, 0.025, depth) * (1.0 - smoothstep(0.04, 0.16, depth));
            diffuseColor.rgb = mix(vec3(0.10, 0.44, 0.43), vec3(0.022, 0.15, 0.25), smoothstep(0.0, 0.72, depth));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.48, 0.73, 0.68), shoreline * 0.35);`,
            );
        }}
      />
    </mesh>
  );
};
