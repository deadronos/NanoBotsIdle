import { useFrame, useThree } from "@react-three/fiber";
import React, { useRef, useState } from "react";
import * as THREE from "three";

import { useConfig } from "../../config/useConfig";
import { getSimBridge } from "../../simBridge/simBridge";
import { useUiStore } from "../../ui/store";

export const PlacementManager: React.FC = () => {
  const buildingMode = useUiStore((state) => state.buildingMode);
  const setBuildingMode = useUiStore((state) => state.setBuildingMode);
  const cfg = useConfig();
  const bridge = getSimBridge();
  const { raycaster, camera, scene } = useThree();

  const ghostRef = useRef<THREE.Group>(null);
  const [isValid, setIsValid] = useState(false);
  const [position, setPosition] = useState<THREE.Vector3 | null>(null);

  useFrame((state) => {
    if (buildingMode === "NONE") return;

    // Raycast from mouse to finding ground
    raycaster.setFromCamera(state.pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    // Filter for voxel meshes? For now just take first hit that isn't the ghost itself.
    // We might hit drones or player, but usually terrain is big.
    const hit = intersects.find((i) => {
      // Ignore ghost
      let obj: THREE.Object3D | null = i.object;
      while (obj) {
        if (obj === ghostRef.current) return false;
        if (obj.userData?.ignoreRaycast) return false; // Future proofing
        obj = obj.parent;
      }
      return true;
    });

    if (hit) {
      // Snap to integer grid
      const x = Math.round(hit.point.x);
      const z = Math.round(hit.point.z);
      const y = Math.round(hit.point.y);

      // Validate: 4x4 area Flatness check?
      // For V1, just check if y > waterLevel.
      const waterLevel = cfg.terrain.waterLevel;
      const valid = y > waterLevel;

      setIsValid(valid);
      setPosition(new THREE.Vector3(x, y, z));
    } else {
      setPosition(null);
    }
  });

  const handleClick = () => {
    if (buildingMode === "OUTPOST" && isValid && position) {
      bridge.enqueue({
        t: "BUILD_OUTPOST",
        x: position.x,
        y: position.y,
        z: position.z,
      });
      setBuildingMode("NONE");
    }
  };

  // Bind click event globally or transparent plane?
  // R3F events on <mesh> are easier.
  // We can treat the Ghost as the click target if we want, OR use a global event listener.
  // But wait, the Ghost moves with the mouse. If we click, we click the Ghost?
  // No, the raycaster finds the position.
  // Let's use a global window click listener for "Build" when mode is active,
  // OR just listen to pointer events on the Canvas via useThree domElement if possible,
  // BUT R3F handles events.
  // Best way: A fullscreen transparent plane `onPointerUp`?
  // Actually, we can just use the `useFrame` logic for position, and a specialized "ClickCatcher" plane.

  if (buildingMode === "NONE") return null;

  return (
    <group>
      {/* Invisible plane to catch clicks everywhere? No, that blocks orbit controls?
          OrbitControls usually handles drag. Click is short.
          Let's try a simple mesh that follows the cursor? No.
          Let's use a global event hook for simplicity in v1.
       */}
      <ClickHandler onClick={handleClick} />

      {position && (
        <group position={position} ref={ghostRef}>
          {/* 4x4 footprint */}
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[4, 2, 4]} />
            <meshBasicMaterial
              color={isValid ? "#00ff00" : "#ff0000"}
              transparent
              opacity={0.5}
              wireframe
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Helper to catch clicks in the canvas
const ClickHandler: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { gl } = useThree();
  React.useEffect(() => {
    const canvas = gl.domElement;
    const handler = (e: PointerEvent) => {
      // Only main button
      if (e.button === 0) {
        onClick();
      }
    };
    canvas.addEventListener("pointerup", handler);
    return () => {
      canvas.removeEventListener("pointerup", handler);
    };
  }, [gl, onClick]);
  return null;
};
