import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { Euler, Vector3 } from "three";

import { getPlayerGroundHeight } from "../sim/player";
import { useGameStore } from "../store";
import { getConfig } from "../config/index";
import type { ViewMode } from "../types";

interface PlayerProps {
  viewMode: ViewMode;
}

export const Player: React.FC<PlayerProps> = ({ viewMode }) => {
  const { camera } = useThree();
  const [position] = useState(() => new Vector3(0, 10, 0));
  const velocity = useRef(new Vector3(0, 0, 0));
  const isJumping = useRef(false);
  const groupRef = useRef<Group>(null);
  const playerVisualsRef = useRef<Group>(null);

  const prestigeLevel = useGameStore((s) => s.prestigeLevel);

  // Input State
  const keys = useRef<Record<string, boolean>>({});

  // Camera State
  const cameraAngle = useRef({ yaw: 0, pitch: 0 });

  // Add pointer lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === document.body) {
        cameraAngle.current.yaw -= e.movementX * 0.002;
        cameraAngle.current.pitch -= e.movementY * 0.002;

        // Clamp pitch
        cameraAngle.current.pitch = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.1, cameraAngle.current.pitch),
        );
      }
    };

    const handleClick = () => {
      // Prevent re-locking if already locked
      if (document.pointerLockElement === document.body) return;

      try {
        // Handle Promise-based requestPointerLock safely
        const result = document.body.requestPointerLock() as unknown as Promise<void> | undefined;
        if (result && typeof result.catch === "function") {
          result.catch((err: unknown) => {
            // Ignore "The user has exited the lock..." error
            if (err instanceof Error) {
              if (err.name === "NotSupportedError" || err.message?.includes("exited the lock"))
                return;
              console.debug("Pointer lock interrupted:", err);
            }
          });
        }
      } catch (e) {
        console.warn("Pointer lock error:", e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("click", handleClick);
    };
  }, []);

  useFrame((state, delta) => {
    // Water & Player Physics (config-driven)
    const cfg = getConfig();
    const isUnderwater = position.y < cfg.terrain.waterLevel;
    const SWIM_SPEED = cfg.player.swimSpeed;
    const BUOYANCY = cfg.player.buoyancy;
    const WATER_DRAG = cfg.player.waterDrag;

    // Movement Physics
    const speed = isUnderwater
      ? SWIM_SPEED
      : keys.current["ShiftLeft"]
        ? cfg.player.runningSpeed
        : cfg.player.walkingSpeed;

    const direction = new Vector3();
    const forward = new Vector3(0, 0, -1).applyAxisAngle(cameraAngle.current.yaw);
    const right = new Vector3(1, 0, 0).applyAxisAngle(
      new Vector3(0, 1, 0),
      cameraAngle.current.yaw,
    );

    if (keys.current["KeyW"]) direction.add(forward);
    if (keys.current["KeyS"]) direction.sub(forward);
    if (keys.current["KeyA"]) direction.sub(right);
    if (keys.current["KeyD"]) direction.add(right);

    if (direction.lengthSq() > 0) direction.normalize().multiplyScalar(speed * delta);

    // Apply horizontal movement
    position.x += direction.x;
    position.z += direction.z;

    // Vertical Physics
    if (isUnderwater) {
      // Swimming Logic
      isJumping.current = false;

      // Vertical Input
      let swimVertical = 0;
      if (keys.current["Space"]) swimVertical += 1; // Swim Up
      if (keys.current["KeyC"]) swimVertical -= 1; // Dive Down

      // Apply swim force
      velocity.current.y += swimVertical * cfg.player.swimForce * delta;

      // Apply Buoyancy (pushes up towards surface)
      // Stronger if deeper
      const depth = cfg.terrain.waterLevel - position.y;

      // Apply Drag
      velocity.current.y -= velocity.current.y * WATER_DRAG * delta;
    } else {
      // Standard Gravity & Jump
      if (keys.current["Space"] && !isJumping.current) {
        velocity.current.y = cfg.player.jumpForce;
        isJumping.current = true;
      }

      velocity.current.y -= cfg.player.gravity * delta;
    }

    position.y += velocity.current.y * delta;

    // Ground Collision — use centralized helper to keep collision consistent with world generation
    const groundHeight = getPlayerGroundHeight(position.x, position.z, prestigeLevel);

    if (position.y < groundHeight) {
      position.y = groundHeight;
      velocity.current.y = Math.max(0, velocity.current.y);
      isJumping.current = false;
    }

    // Kill plane / respawn
    if (position.y < cfg.player.killPlaneY!) {
      position.set(0, cfg.player.respawnY!, 0);
      velocity.current.set(0, 0, 0);
    }

    // Sync group position
    if (groupRef.current) {
      groupRef.current.position.copy(position);
    }

    // Sync player visual rotation
    if (playerVisualsRef.current) {
      playerVisualsRef.current.rotation.y = cameraAngle.current.yaw;
    }

    // 2. Update Camera
    if (viewMode === "FIRST_PERSON") {
      const eyePos = position.clone();
      camera.position.copy(eyePos);

      const lookTarget = new Vector3(0, 0, -1);
      lookTarget.applyEuler(
        new Euler(cameraAngle.current.pitch, cameraAngle.current.yaw, 0, "YXZ"),
      );
      camera.lookAt(eyePos.add(lookTarget));
    } else {
      const cameraOffsetDist = 5;
      const lookTarget = new Vector3(0, 0, -1);
      lookTarget.applyEuler(
        new Euler(cameraAngle.current.pitch, cameraAngle.current.yaw, 0, "YXZ"),
      );

      const camPos = position.clone().sub(lookTarget.clone().multiplyScalar(cameraOffsetDist));
      camPos.y += 1.0;

      camera.position.lerp(camPos, 0.2);
      camera.lookAt(position);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Player Model (Visible only in 3rd Person) */}
      {viewMode === "THIRD_PERSON" && (
        <group ref={playerVisualsRef}>
          {/* Body */}
          <mesh position={[0, -0.9, 0]} castShadow>
            <boxGeometry args={[0.6, 1.8, 0.4]} />
            <meshStandardMaterial color="orange" />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color="#ffccaa" />
            {/* Face Details */}
            <mesh position={[0.1, 0.05, -0.21]}>
              <boxGeometry args={[0.05, 0.05, 0.05]} />
              <meshStandardMaterial color="black" />
            </mesh>
            <mesh position={[-0.1, 0.05, -0.21]}>
              <boxGeometry args={[0.05, 0.05, 0.05]} />
              <meshStandardMaterial color="black" />
            </mesh>
          </mesh>
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
