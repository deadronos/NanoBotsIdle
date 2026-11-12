import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import { DoubleSide, Raycaster, Vector2, Vector3 } from "three";

import { useConfig } from "../../config/useConfig";
import { MINING_ZONE_RADIUS, type MiningZone } from "../../shared/miningOperations";
import { getGroundHeightWithEdits } from "../../sim/collision";
import { useUiStore } from "../../ui/store";

export const PlacementManager: React.FC = () => {
  const mode = useUiStore((state) => state.buildingMode);
  const placement = useUiStore((state) => state.placement);
  const zoneX = useUiStore((state) => state.snapshot.miningZone?.x);
  const zoneY = useUiStore((state) => state.snapshot.miningZone?.y);
  const zoneZ = useUiStore((state) => state.snapshot.miningZone?.z);
  const cfg = useConfig();
  const { gl, camera, scene } = useThree();
  const meshed = cfg.render.voxels.mode === "meshed";

  useLayoutEffect(() => {
    const canvas = gl.domElement;
    const pointer = new Vector2();
    const normal = new Vector3();
    const raycaster = new Raycaster(undefined, undefined, 0, 80);
    let down: { x: number; y: number; id: number } | undefined;
    const start = (event: PointerEvent) => {
      if (event.button === 0 && useUiStore.getState().buildingMode !== "NONE")
        down = { x: event.clientX, y: event.clientY, id: event.pointerId };
    };
    const cancel = () => {
      down = undefined;
    };
    const select = (event: PointerEvent) => {
      const origin = down;
      cancel();
      if (useUiStore.getState().buildingMode === "NONE") return;
      if (
        !origin ||
        origin.id !== event.pointerId ||
        Math.hypot(origin.x - event.clientX, origin.y - event.clientY) > 7
      )
        return;
      const terrain = scene.getObjectByName("voxel-terrain");
      if (!terrain) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(terrain, true).find((entry) => entry.object.visible);
      if (!hit) return;
      if (meshed && hit.face) {
        normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
        hit.point.addScaledVector(normal, -0.001);
      }
      const cell = meshed ? Math.floor : Math.round;
      const x = cell(hit.point.x);
      const z = cell(hit.point.z);
      if (Math.abs(x) > 500 || Math.abs(z) > 500) return;
      const { snapshot, setPlacement } = useUiStore.getState();
      const y = getGroundHeightWithEdits(x, z, snapshot.prestigeLevel, snapshot.actualSeed) + 1;
      setPlacement({ x, y, z });
    };
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointerup", select);
    canvas.addEventListener("pointercancel", cancel);
    return () => {
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointerup", select);
      canvas.removeEventListener("pointercancel", cancel);
    };
  }, [camera, gl, meshed, scene]);

  const active = useMemo<MiningZone | undefined>(
    () =>
      zoneX === undefined || zoneY === undefined || zoneZ === undefined ?
        undefined
      : { x: zoneX, y: zoneY, z: zoneZ },
    [zoneX, zoneY, zoneZ],
  );

  return (
    <group>
      {active && <ZoneMarker point={active} color="#6ce4c4" meshed={meshed} />}
      {placement && mode === "MINING_ZONE" && (
        <ZoneMarker point={placement} color="#f4bf66" meshed={meshed} />
      )}
      {placement && mode === "OUTPOST" && (
        <mesh
          position={[placement.x, placement.y + (meshed ? 1 : 0.5), placement.z]}
          renderOrder={5}
        >
          <boxGeometry args={[4, 2, 4]} />
          <meshBasicMaterial
            color="#f4bf66"
            wireframe
            depthTest={false}
            depthWrite={false}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </group>
  );
};

const ZoneMarker: React.FC<{ point: MiningZone; color: string; meshed: boolean }> = ({
  point,
  color,
  meshed,
}) => (
  <group position={[point.x, point.y + (meshed ? 0.12 : -0.38), point.z]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
      <ringGeometry args={[MINING_ZONE_RADIUS - 0.11, MINING_ZONE_RADIUS, 48]} />
      <meshBasicMaterial
        color={color}
        side={DoubleSide}
        transparent
        opacity={0.7}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
    <mesh position={[0, 1.1, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 2.2, 6]} />
      <meshBasicMaterial color={color} />
    </mesh>
  </group>
);
