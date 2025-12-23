import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { createAtlasTexture } from "../voxel/atlas";
import { SeededRng } from "../voxel/generation/rng";
import { computeBreakTime, resolveDrops } from "../voxel/mining";
import { pickBlockDDA, type BlockHit } from "../voxel/picking";
import { PlayerController } from "../voxel/PlayerController";
import { createChunkMeshes } from "../voxel/rendering";
import { BlockId, BLOCKS, World } from "../voxel/World";
import type { ToolId } from "../voxel/tools";
import { BreakParticleSystem } from "./BreakParticles";
import { createSfxPlayer } from "./audio";
import { createGameEcs, getLightingState, getTimeOfDay, stepGameEcs } from "./ecs/gameEcs";
import { isPlaceableBlock } from "./items";
import { perfStats } from "./perf";
import { advanceFixedStep } from "./sim/fixedStep";
import { useGameStore } from "./store";

const MAX_PICK_DISTANCE = 7;
const DAY_LENGTH_SECONDS = 140;
const FIXED_STEP_SECONDS = 1 / 60;
const MAX_SIM_STEPS = 5;
const MAX_FRAME_DELTA = 0.1;
const MINING_HIT_INTERVAL = 0.25;

type MiningSession = {
  block: { x: number; y: number; z: number };
  blockId: BlockId;
  toolId?: ToolId;
  breakTime: number;
  progress: number;
  fxTimer: number;
};

export default function GameScene() {
  const { scene, camera, gl } = useThree();
  const world = useMemo(() => {
    const w = new World({
      seed: 1337,
      viewDistanceChunks: 8,
      chunkSize: { x: 16, y: 72, z: 16 },
    });
    w.generateInitialArea(0, 0);
    return w;
  }, []);

  const playerRef = useRef<PlayerController | null>(null);
  const chunkMeshesRef = useRef<ReturnType<typeof createChunkMeshes> | null>(null);
  const highlightRef = useRef<THREE.LineSegments | null>(null);
  const lightsRef = useRef<{ ambient: THREE.AmbientLight; sun: THREE.DirectionalLight } | null>(
    null,
  );
  const ecs = useMemo(
    () => createGameEcs(DAY_LENGTH_SECONDS, undefined, { voxelWorld: world, seed: world.seed }),
    [world],
  );
  const skyColor = useRef(new THREE.Color());
  const highlightColorsRef = useRef({
    base: new THREE.Color(0xfdf7da),
    mining: new THREE.Color(0xffc57a),
  });
  const simAccumulatorRef = useRef(0);
  const fpsRef = useRef({ acc: 0, frames: 0, fps: 0 });
  const statsTimerRef = useRef(0);
  const lastTargetRef = useRef<BlockId | null>(null);
  const lastChunkRef = useRef<{ cx: number; cz: number } | null>(null);
  const rayOriginRef = useRef(new THREE.Vector3());
  const rayDirRef = useRef(new THREE.Vector3());
  const miningRef = useRef<MiningSession | null>(null);
  const miningInputRef = useRef(false);
  const sfxRef = useRef<ReturnType<typeof createSfxPlayer> | null>(null);
  const particlesRef = useRef<BreakParticleSystem | null>(null);

  const setAtlasUrl = useGameStore((state) => state.setAtlasUrl);
  const setPointerLocked = useGameStore((state) => state.setPointerLocked);
  const setRequestPointerLock = useGameStore((state) => state.setRequestPointerLock);
  const setStats = useGameStore((state) => state.setStats);
  const setTargetBlock = useGameStore((state) => state.setTargetBlock);
  const setMining = useGameStore((state) => state.setMining);

  const clearMiningSession = useCallback(() => {
    miningRef.current = null;
    setMining({ active: false, progress: 0, blockId: null });
  }, [setMining]);

  const stopMiningSession = useCallback(() => {
    miningInputRef.current = false;
    clearMiningSession();
  }, [clearMiningSession]);

  const finishMiningBlock = useCallback(
    (hit: BlockHit, toolId?: ToolId) => {
      const def = BLOCKS[hit.id];
      if (!def || def.breakable === false) return;

      world.setBlock(hit.block.x, hit.block.y, hit.block.z, BlockId.Air);
      world.markDirtyAt(hit.block.x, hit.block.y, hit.block.z);
      world.handleBlockChanged(hit.block.x, hit.block.y, hit.block.z, hit.id, BlockId.Air);

      const rng = new SeededRng(world.seed).fork(
        `drop:${hit.block.x},${hit.block.y},${hit.block.z},${hit.id}`,
      );
      const drops = resolveDrops(hit.id, toolId, rng);
      const state = useGameStore.getState();
      for (const drop of drops) {
        if (typeof drop.itemId === "number") {
          state.addItem(drop.itemId as BlockId, drop.count);
        } else {
          state.addTool(drop.itemId as ToolId, drop.count);
        }
      }

      if (toolId) {
        state.applyToolDurability(toolId, 1);
      }

      const burstPos = new THREE.Vector3(
        hit.block.x + 0.5,
        hit.block.y + 0.5,
        hit.block.z + 0.5,
      );
      particlesRef.current?.spawnBurst(burstPos, hit.id, 18);
      sfxRef.current?.playBreak();
    },
    [world],
  );

  const startMiningSession = useCallback(
    (hit: BlockHit, toolId?: ToolId) => {
      const def = BLOCKS[hit.id];
      if (!def || def.breakable === false) return;
      const breakTime = computeBreakTime(hit.id, toolId);
      if (!Number.isFinite(breakTime)) return;
      if (breakTime <= 0) {
        finishMiningBlock(hit, toolId);
        return;
      }
      miningRef.current = {
        block: hit.block,
        blockId: hit.id,
        toolId,
        breakTime,
        progress: 0,
        fxTimer: 0,
      };
      setMining({ active: true, progress: 0, blockId: hit.id });
      sfxRef.current?.playHit();
      const chipPos = new THREE.Vector3(
        hit.block.x + 0.5,
        hit.block.y + 0.5,
        hit.block.z + 0.5,
      );
      particlesRef.current?.spawnBurst(chipPos, hit.id, 3);
    },
    [finishMiningBlock, setMining],
  );

  useEffect(() => {
    const fog = new THREE.FogExp2(0x8cc9ff, 0.0038);
    scene.fog = fog;

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    const sun = new THREE.DirectionalLight(0xffffff, 0.75);
    sun.position.set(80, 140, 50);
    sun.castShadow = false;

    scene.add(ambient, sun);
    lightsRef.current = { ambient, sun };

    return () => {
      scene.remove(ambient, sun);
      if (scene.fog === fog) scene.fog = null;
    };
  }, [scene]);

  useEffect(() => {
    const atlas = createAtlasTexture(gl, BLOCKS);
    setAtlasUrl(atlas.canvas.toDataURL());

    const material = new THREE.MeshLambertMaterial({
      map: atlas.texture,
      transparent: true,
      alphaTest: 0.5,
      vertexColors: true,
    });

    chunkMeshesRef.current = createChunkMeshes(scene, world, material);

    const box = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    const highlightMat = new THREE.LineBasicMaterial({
      color: 0xfdf7da,
      transparent: true,
      opacity: 0.85,
    });
    const highlight = new THREE.LineSegments(edges, highlightMat);
    highlight.visible = false;
    scene.add(highlight);
    highlightRef.current = highlight;

    particlesRef.current = new BreakParticleSystem(scene);
    sfxRef.current = createSfxPlayer();

    return () => {
      scene.remove(highlight);
      highlight.geometry.dispose();
      highlight.material.dispose();
      chunkMeshesRef.current?.dispose();
      material.dispose();
      atlas.texture.dispose();
      particlesRef.current?.dispose(scene);
      particlesRef.current = null;
      sfxRef.current?.dispose();
      sfxRef.current = null;
    };
  }, [gl, scene, setAtlasUrl, world]);

  useEffect(() => {
    const player = new PlayerController({
      camera: camera as THREE.PerspectiveCamera,
      world,
      domElement: gl.domElement,
    });
    player.teleportToSafeSpawn();
    playerRef.current = player;
    setRequestPointerLock(() => player.requestPointerLock());

    return () => {
      player.dispose();
      setRequestPointerLock(undefined);
    };
  }, [camera, gl.domElement, setRequestPointerLock, world]);

  useEffect(() => {
    const onLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      setPointerLocked(locked);
      if (!locked) {
        playerRef.current?.clearInput();
        stopMiningSession();
      }
    };

    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, [gl.domElement, setPointerLocked, stopMiningSession]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      const player = playerRef.current;
      if (!player) return;

      const origin = rayOriginRef.current.copy(camera.position);
      const dir = camera.getWorldDirection(rayDirRef.current);
      const hit = pickBlockDDA(world, origin, dir, MAX_PICK_DISTANCE);

      const state = useGameStore.getState();

      if (e.button === 0) {
        miningInputRef.current = true;
        if (!hit) return;
        startMiningSession(hit, state.equippedToolId);
        return;
      }

      if (e.button === 2) {
        if (!hit) return;
        const selected = state.hotbar[state.selectedSlot];
        if (!selected || !isPlaceableBlock(selected)) return;

        const p = hit.block;
        const n = hit.normal;
        const px = p.x + n.x;
        const py = p.y + n.y;
        const pz = p.z + n.z;

        const existing = world.getBlock(px, py, pz);
        if (existing !== BlockId.Air && BLOCKS[existing].solid) return;
        if (player.wouldCollideAtPlacement(px, py, pz)) return;
        if (!state.consumeItem(selected, 1)) return;

        world.setBlock(px, py, pz, selected);
        world.markDirtyAt(px, py, pz);
        world.handleBlockChanged(px, py, pz, existing, selected);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      stopMiningSession();
    };

    const preventContextMenu = (e: Event) => e.preventDefault();

    const el = gl.domElement;
    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    el.addEventListener("contextmenu", preventContextMenu);

    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      el.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [camera, gl.domElement, startMiningSession, stopMiningSession, world]);

  useFrame((_, delta) => {
    const player = playerRef.current;
    if (!player) return;

    const perfEnabled = perfStats.enabled;
    const frameStart = perfEnabled ? performance.now() : 0;

    const frameDt = Math.min(MAX_FRAME_DELTA, delta);
    let sim;
    if (perfEnabled) {
      const start = performance.now();
      sim = advanceFixedStep(
        simAccumulatorRef.current,
        frameDt,
        FIXED_STEP_SECONDS,
        MAX_SIM_STEPS,
        (stepDt) => {
          player.update(stepDt);
          stepGameEcs(ecs, stepDt, player);
        },
      );
      perfStats.add("simMs", performance.now() - start);
    } else {
      sim = advanceFixedStep(
        simAccumulatorRef.current,
        frameDt,
        FIXED_STEP_SECONDS,
        MAX_SIM_STEPS,
        (stepDt) => {
          player.update(stepDt);
          stepGameEcs(ecs, stepDt, player);
        },
      );
    }
    simAccumulatorRef.current = sim.accumulator;
    player.syncCamera(sim.alpha);

    const currentCx = Math.floor(player.position.x / world.chunkSize.x);
    const currentCz = Math.floor(player.position.z / world.chunkSize.z);
    const lastChunk = lastChunkRef.current;
    if (!lastChunk || lastChunk.cx !== currentCx || lastChunk.cz !== currentCz) {
      lastChunkRef.current = { cx: currentCx, cz: currentCz };
      world.ensureChunksAround(player.position.x, player.position.z);
      world.pruneFarChunks(player.position.x, player.position.z);
    }
    if (perfEnabled) {
      const start = performance.now();
      world.processLightQueue();
      perfStats.add("lightMs", performance.now() - start);
    } else {
      world.processLightQueue();
    }

    if (perfEnabled) {
      const start = performance.now();
      world.rebuildDirtyChunks();
      perfStats.add("meshBuildMs", performance.now() - start);
    } else {
      world.rebuildDirtyChunks();
    }

    if (perfEnabled) {
      const start = performance.now();
      chunkMeshesRef.current?.sync();
      perfStats.add("meshSwapMs", performance.now() - start);
    } else {
      chunkMeshesRef.current?.sync();
    }

    const origin = rayOriginRef.current.copy(camera.position);
    const dir = camera.getWorldDirection(rayDirRef.current);
    const hit = pickBlockDDA(world, origin, dir, MAX_PICK_DISTANCE);

    const miningSession = miningRef.current;
    if (miningInputRef.current) {
      if (hit && miningSession) {
        const sameBlock =
          hit.block.x === miningSession.block.x &&
          hit.block.y === miningSession.block.y &&
          hit.block.z === miningSession.block.z;
        if (sameBlock) {
          miningSession.progress = Math.min(
            1,
            miningSession.progress + frameDt / miningSession.breakTime,
          );
          miningSession.fxTimer += frameDt;
          if (miningSession.fxTimer >= MINING_HIT_INTERVAL) {
            miningSession.fxTimer = 0;
            sfxRef.current?.playHit();
            const chipPos = new THREE.Vector3(
              hit.block.x + 0.5,
              hit.block.y + 0.5,
              hit.block.z + 0.5,
            );
            particlesRef.current?.spawnBurst(chipPos, hit.id, 4);
          }
          setMining({ active: true, progress: miningSession.progress, blockId: hit.id });
          if (miningSession.progress >= 1) {
            finishMiningBlock(hit, miningSession.toolId);
            clearMiningSession();
          }
        } else if (hit) {
          startMiningSession(hit, useGameStore.getState().equippedToolId);
        } else {
          clearMiningSession();
        }
      } else if (hit) {
        startMiningSession(hit, useGameStore.getState().equippedToolId);
      } else if (miningSession) {
        clearMiningSession();
      }
    } else if (miningSession) {
      clearMiningSession();
    }

    const activeMining = miningRef.current;
    const highlight = highlightRef.current;
    if (highlight) {
      if (hit) {
        highlight.visible = true;
        highlight.position.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5);
        const material = highlight.material as THREE.LineBasicMaterial;
        if (
          activeMining &&
          hit.block.x === activeMining.block.x &&
          hit.block.y === activeMining.block.y &&
          hit.block.z === activeMining.block.z
        ) {
          material.color
            .copy(highlightColorsRef.current.base)
            .lerp(highlightColorsRef.current.mining, activeMining.progress);
          material.opacity = 0.55 + 0.4 * activeMining.progress;
        } else {
          material.color.copy(highlightColorsRef.current.base);
          material.opacity = 0.85;
        }
      } else {
        highlight.visible = false;
      }
    }

    if (hit?.id !== lastTargetRef.current) {
      lastTargetRef.current = hit?.id ?? null;
      setTargetBlock(hit?.id ?? null);
    }

    fpsRef.current.acc += delta;
    fpsRef.current.frames += 1;
    if (fpsRef.current.acc >= 0.5) {
      fpsRef.current.fps = Math.round(fpsRef.current.frames / fpsRef.current.acc);
      fpsRef.current.acc = 0;
      fpsRef.current.frames = 0;
    }

    statsTimerRef.current += delta;
    if (statsTimerRef.current >= 0.2) {
      const pos = ecs.entities.player.position ?? { x: 0, y: 0, z: 0 };
      const timeOfDay = getTimeOfDay(ecs);
      setStats({
        fps: fpsRef.current.fps,
        position: { x: pos.x, y: pos.y, z: pos.z },
        chunkCount: world.getChunkCount(),
        timeOfDay,
      });
      statsTimerRef.current = 0;
    }

    particlesRef.current?.update(frameDt);

    const timeOfDay = getTimeOfDay(ecs);
    const sunPhase = Math.sin(timeOfDay * Math.PI * 2) * 0.5 + 0.5;
    const ambient = lightsRef.current?.ambient;
    const sun = lightsRef.current?.sun;

    const lightingState = getLightingState(ecs);
    if (ambient && sun && lightingState) {
      ambient.intensity = lightingState.ambientIntensity;
      sun.intensity = lightingState.sunIntensity;
      sun.position.set(
        lightingState.sunPosition.x,
        lightingState.sunPosition.y,
        lightingState.sunPosition.z,
      );
      skyColor.current.setHSL(
        lightingState.skyHsl.h,
        lightingState.skyHsl.s,
        lightingState.skyHsl.l,
      );
      scene.background = skyColor.current;
      if (scene.fog) scene.fog.color.copy(skyColor.current);
    } else if (!lightingState) {
      // fallback to legacy values if ECS lighting is unavailable
      if (ambient && sun) {
        ambient.intensity = 0.2 + sunPhase * 0.5;
        sun.intensity = 0.15 + sunPhase * 0.9;
        const angle = timeOfDay * Math.PI * 2;
        sun.position.set(Math.cos(angle) * 120, 30 + sunPhase * 160, Math.sin(angle) * 120);
      }
      const baseHue = 0.58;
      const lightness = 0.22 + sunPhase * 0.5;
      skyColor.current.setHSL(baseHue, 0.52, lightness);
      scene.background = skyColor.current;
      if (scene.fog) scene.fog.color.copy(skyColor.current);
    }

    if (perfEnabled) {
      perfStats.recordFrame(performance.now() - frameStart);
    }
  });

  return null;
}
