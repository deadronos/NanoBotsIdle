import { useFrame } from "@react-three/fiber";
import { type FC, useEffect, useRef, useState } from "react";
import { Color, MeshBasicMaterial } from "three";

import { useConfig } from "../config/useConfig";
import type { RenderDelta } from "../shared/protocol";
import { getSimBridge } from "../simBridge/simBridge";
import { outpostsUnchanged } from "../utils/simFramePersist";

interface OutpostItem {
  id: string;
  x: number;
  y: number;
  z: number;
}

// Shared materials: every outpost pulses in lockstep with the global clock, so
// per-instance materials would mean duplicate uniform writes for no visual
// benefit. Colors above 1.0 with toneMapped=false are what the bloom pass picks
// up; ordinary lit surfaces stay below its luminance threshold.
const sharedBeaconMaterial = new MeshBasicMaterial({
  color: new Color(0, 3, 2.4),
  transparent: true,
  opacity: 0.4,
  toneMapped: false,
});
const coreGlowMaterial = new MeshBasicMaterial({
  color: new Color(4, 1.6, 0.2),
  toneMapped: false,
});
const dockRingMaterial = new MeshBasicMaterial({
  color: new Color(0, 2.2, 1.8),
  toneMapped: false,
});

// Docked drones hover at outpost.y + 2 (see tickDrones.handlers), so the pad
// top sits just below that and the mast/beacons stand on pylons at the rim,
// clear of the docking column.
const PAD_TOP = 1.75;
const PYLON_X = 2.55;

const Pylon: FC<{ x: number }> = ({ x }) => (
  <group position={[x, 0, 0]}>
    <mesh position={[0, 1.8, 0]} castShadow>
      <cylinderGeometry args={[0.09, 0.14, 3.2, 8]} />
      <meshStandardMaterial color="#91a4af" metalness={0.4} roughness={0.45} />
    </mesh>
    <mesh position={[0, 3.5, 0]} material={sharedBeaconMaterial}>
      <sphereGeometry args={[0.18, 12, 12]} />
    </mesh>
  </group>
);

const OutpostComponent: FC<OutpostItem> = ({ x, y, z }) => {
  return (
    <group position={[x, y, z]}>
      {/* Base metal platform */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.0, 3.1, 0.4, 24]} />
        <meshStandardMaterial color="#485a69" metalness={0.25} roughness={0.55} />
      </mesh>

      {/* Main core tower structure */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.5, 1.3, 20]} />
        <meshStandardMaterial color="#e6b164" metalness={0.18} roughness={0.5} />
      </mesh>

      {/* Glowing power-core band around the tower */}
      <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} material={coreGlowMaterial}>
        <torusGeometry args={[1.36, 0.09, 8, 32]} />
      </mesh>

      {/* Landing pad with a glowing dock ring */}
      <mesh position={[0, PAD_TOP - 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.2, 0.1, 24]} />
        <meshStandardMaterial color="#2d3a44" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh
        position={[0, PAD_TOP + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={dockRingMaterial}
      >
        <ringGeometry args={[0.85, 1.0, 32]} />
      </mesh>

      {/* Solar panel wings */}
      <mesh position={[-1.95, 0.9, 1.6]} rotation={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[1.5, 0.08, 1.1]} />
        <meshStandardMaterial color="#3b647a" metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[1.95, 0.9, 1.6]} rotation={[0, 0, -0.35]} castShadow>
        <boxGeometry args={[1.5, 0.08, 1.1]} />
        <meshStandardMaterial color="#3b647a" metalness={0.35} roughness={0.35} />
      </mesh>

      {/* Antenna pylons with beacons */}
      <Pylon x={-PYLON_X} />
      <Pylon x={PYLON_X} />
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
        <OutpostComponent key={op.id} id={op.id} x={op.x} y={op.y - (!meshed ? 0.5 : 0)} z={op.z} />
      ))}
    </group>
  );
};
