import { Cloud, Clouds, Sky, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useRef } from "react";
import type { DirectionalLight, Group } from "three";
import * as THREE from "three";

import { getConfig } from "../config/index";

export const Environment: React.FC = () => {
  const lightRef = useRef<DirectionalLight>(null);
  const cloudsRef = useRef<Group>(null);
  const cfg = getConfig();

  useFrame((state, delta) => {
    // Animate clouds slowly
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * cfg.render.clouds.rotationSpeed;
    }
  });

  return (
    <group>
      {/* Sky */}
      <Sky
        distance={cfg.render.sky.distance}
        sunPosition={cfg.render.sky.sunPosition}
        inclination={cfg.render.sky.inclination}
        azimuth={cfg.render.sky.azimuth}
        turbidity={cfg.render.sky.turbidity}
        rayleigh={cfg.render.sky.rayleigh}
      />

      <Stars {...cfg.render.stars} />

      {/* Clouds */}
      <group ref={cloudsRef} position={[0, cfg.render.clouds.groupY, 0]}>
        <Clouds material={THREE.MeshBasicMaterial}>
          <Cloud {...cfg.render.clouds.cloud1} />
          <Cloud {...cfg.render.clouds.cloud2} />
        </Clouds>
      </group>

      {/* Ambient Light */}
      <ambientLight intensity={cfg.render.ambientLightIntensity} />

      {/* Sun / Directional Light */}
      <directionalLight
        ref={lightRef}
        position={cfg.render.sun.position}
        intensity={cfg.render.sun.intensity}
        castShadow
        shadow-mapSize={cfg.render.sun.shadowMapSize}
        shadow-camera-left={cfg.render.sun.cameraBounds.left}
        shadow-camera-right={cfg.render.sun.cameraBounds.right}
        shadow-camera-top={cfg.render.sun.cameraBounds.top}
        shadow-camera-bottom={cfg.render.sun.cameraBounds.bottom}
      />
    </group>
  );
};
