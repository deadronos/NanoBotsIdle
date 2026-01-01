import { useFrame, useThree } from "@react-three/fiber";
import React, { useRef, useState } from "react";
import type { Group } from "three";
import { Vector3 } from "three";

import { getConfig } from "../config/index";
import { playerPosition } from "../engine/playerState";
import type { ViewMode } from "../types";
import { useUiStore } from "../ui/store";
import { playSound } from "../utils/audio";
import { PlayerVisuals } from "./player/PlayerVisuals";
import { updatePlayerFrame } from "./player/updatePlayerFrame";
import { usePointerLockInput } from "./player/usePointerLockInput";

interface PlayerProps {
  viewMode: ViewMode;
}

export const Player: React.FC<PlayerProps> = ({ viewMode }) => {
  const { camera } = useThree();
  const cfg = getConfig();
  const [position] = useState(
    () => new Vector3(cfg.player.spawnX ?? 0, cfg.player.respawnY ?? 10, cfg.player.spawnZ ?? 0),
  );
  const velocity = useRef(new Vector3(0, 0, 0));
  const isJumping = useRef(false);
  const groupRef = useRef<Group>(null);
  const playerVisualsRef = useRef<Group>(null);
  const prestigeLevel = useUiStore((s) => s.snapshot.prestigeLevel);

  const input = usePointerLockInput();

  const frameTemps = useRef({
    direction: new Vector3(),
    forward: new Vector3(),
    right: new Vector3(),
    lookDir: new Vector3(),
    lookAt: new Vector3(),
    camPos: new Vector3(),
    camOffset: new Vector3(),
  });

  useFrame((_, delta) => {
    const wasJumping = isJumping.current;
    updatePlayerFrame({
      cfg: getConfig(),
      deltaSeconds: delta,
      viewMode,
      prestigeLevel,
      keys: input.keys.current,
      cameraAngle: input.cameraAngle.current,
      position,
      velocity: velocity.current,
      isJumping,
      group: groupRef.current,
      playerVisuals: playerVisualsRef.current,
      camera,
      temps: frameTemps.current,
    });
    if (isJumping.current && !wasJumping) {
        playSound("jump");
    }
    playerPosition.copy(position);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Player Model (Visible only in 3rd Person) */}
      {viewMode === "THIRD_PERSON" && (
        <group ref={playerVisualsRef}>
          <PlayerVisuals />
        </group>
      )}

      {/* Shadow Blob */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.75, 0]}>
        <ringGeometry args={[0.2, 0.5, 32]} />
        <meshBasicMaterial color="black" opacity={0.3} transparent />
      </mesh>
    </group>
  );
};
