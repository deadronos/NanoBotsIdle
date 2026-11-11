import { useFrame, useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { Vector3 } from "three";

import { useConfig } from "../config/useConfig";
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
  const cfg = useConfig();
  const spawnX = useUiStore((s) => s.snapshot.landingSpawn?.x) ?? cfg.player.spawnX ?? 0;
  const spawnY = useUiStore((s) => s.snapshot.landingSpawn?.y) ?? cfg.player.respawnY ?? 10;
  const spawnZ = useUiStore((s) => s.snapshot.landingSpawn?.z) ?? cfg.player.spawnZ ?? 0;
  const spawn = useMemo(() => new Vector3(spawnX, spawnY, spawnZ), [spawnX, spawnY, spawnZ]);
  const [position] = useState(() => spawn.clone());
  const [velocity] = useState(() => new Vector3());
  const isJumping = useRef(false);
  const groupRef = useRef<Group>(null);
  const playerVisualsRef = useRef<Group>(null);
  const prestigeLevel = useUiStore((s) => s.snapshot.prestigeLevel);
  const seed = useUiStore((s) => s.snapshot.actualSeed);

  const input = usePointerLockInput();

  useLayoutEffect(() => {
    position.copy(spawn);
    playerPosition.copy(spawn);
    velocity.set(0, 0, 0);
    isJumping.current = false;
    input.cameraAngle.current.yaw = 0;
    input.cameraAngle.current.pitch = -0.43;
    camera.position.set(spawn.x, spawn.y + 3, spawn.z + 6);
  }, [camera, input.cameraAngle, position, prestigeLevel, seed, spawn, velocity]);

  const [frameTemps] = useState(() => ({
    direction: new Vector3(),
    forward: new Vector3(),
    right: new Vector3(),
    lookDir: new Vector3(),
    lookAt: new Vector3(),
    camPos: new Vector3(),
    camOffset: new Vector3(),
  }));

  const frameOptions = useMemo<Parameters<typeof updatePlayerFrame>[0]>(
    () => ({
      cfg,
      deltaSeconds: 0,
      viewMode,
      prestigeLevel,
      seed,
      spawn,
      keys: {},
      cameraAngle: { yaw: 0, pitch: 0 },
      position,
      velocity,
      isJumping,
      group: null,
      playerVisuals: null,
      camera,
      temps: frameTemps,
    }),
    [camera, cfg, frameTemps, position, prestigeLevel, seed, spawn, velocity, viewMode],
  );

  useFrame((_, delta) => {
    const wasJumping = isJumping.current;
    frameOptions.deltaSeconds = delta;
    frameOptions.keys = input.keys.current;
    frameOptions.cameraAngle = input.cameraAngle.current;
    frameOptions.group = groupRef.current;
    frameOptions.playerVisuals = playerVisualsRef.current;
    updatePlayerFrame(frameOptions);
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -cfg.player.playerHeight + 0.015, 0]}>
        <ringGeometry args={[0.2, 0.5, 32]} />
        <meshBasicMaterial color="black" opacity={0.3} transparent />
      </mesh>
    </group>
  );
};
