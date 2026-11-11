import { useFrame } from "@react-three/fiber";
import { type FC, useEffect, useRef, useState } from "react";
import { MeshBasicMaterial } from "three";

import { useConfig } from "../config/useConfig";
import { STARTER_OUTPOST_ID } from "../engine/world/landingSite";
import type { RenderDelta } from "../shared/protocol";
import { getSimBridge } from "../simBridge/simBridge";
import { outpostsUnchanged } from "../utils/simFramePersist";

interface OutpostItem {
  id: string;
  x: number;
  y: number;
  z: number;
}

// One beacon material is shared across every outpost. All beacons pulse in
// lockstep with the global clock, so per-instance materials would mean
// duplicate uniform writes for no visual benefit. Sharing also lets us drop
// the per-outpost useFrame and the unsafe `as MeshBasicMaterial` cast.
const sharedBeaconMaterial = new MeshBasicMaterial({
  color: "#00ffcc",
  transparent: true,
  opacity: 0.4,
});

const OutpostComponent: FC<OutpostItem> = ({ x, y, z }) => {
  return (
    <group position={[x, y, z]}>
      {/* Base metal platform */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.0, 2.0, 0.4, 16]} />
        <meshStandardMaterial color="#485a69" metalness={0.25} roughness={0.55} />
      </mesh>

      {/* Main core tower structure */}
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 1.0, 1.2, 16]} />
        <meshStandardMaterial color="#e6b164" metalness={0.18} roughness={0.5} />
      </mesh>

      {/* Glowing orange central power core */}
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ff7700" />
      </mesh>

      {/* Solar Panel Wing Left */}
      <mesh position={[-1.2, 0.8, 0]} rotation={[0, 0, 0.4]} castShadow>
        <boxGeometry args={[1.2, 0.08, 0.9]} />
        <meshStandardMaterial color="#3b647a" metalness={0.35} roughness={0.35} />
      </mesh>

      {/* Solar Panel Wing Right */}
      <mesh position={[1.2, 0.8, 0]} rotation={[0, 0, -0.4]} castShadow>
        <boxGeometry args={[1.2, 0.08, 0.9]} />
        <meshStandardMaterial color="#3b647a" metalness={0.35} roughness={0.35} />
      </mesh>

      {/* Antenna mast */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
        <meshStandardMaterial color="#91a4af" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Beacon Light Ball - shares the pulsing material with all outposts */}
      <mesh position={[0, 2.35, 0]} material={sharedBeaconMaterial}>
        <sphereGeometry args={[0.12, 8, 8]} />
      </mesh>
    </group>
  );
};

export const Outposts: FC = () => {
  const bridge = getSimBridge();
  const meshed = useConfig().render.voxels.mode === "meshed";
  const [outpostList, setOutpostList] = useState<NonNullable<RenderDelta["outposts"]>>(
    () => bridge.getLastFrame()?.delta.outposts ?? [],
  );

  const previous = useRef(outpostList);

  useEffect(() => {
    return bridge.onFrame(({ delta }) => {
      if (delta.outposts && !outpostsUnchanged(previous.current, delta.outposts)) {
        previous.current = delta.outposts;
        setOutpostList(delta.outposts);
      }
    });
  }, [bridge]);

  useFrame((state) => {
    sharedBeaconMaterial.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 4) * 0.4;
  });

  return (
    <group>
      {outpostList.map((op) => (
        <OutpostComponent
          key={op.id}
          id={op.id}
          x={op.x}
          y={op.y - (!meshed && op.id === STARTER_OUTPOST_ID ? 0.5 : 0)}
          z={op.z}
        />
      ))}
    </group>
  );
};
