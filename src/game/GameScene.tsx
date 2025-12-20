import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BlockId, BLOCKS, World } from "../voxel/World";
import { PlayerController } from "../voxel/PlayerController";
import { createAtlasTexture } from "../voxel/atlas";
import { pickBlockDDA } from "../voxel/picking";
import { createChunkMeshes } from "../voxel/rendering";
import { isPlaceableBlock } from "./items";
import { useGameStore } from "./store";

const MAX_PICK_DISTANCE = 7;
const DAY_LENGTH_SECONDS = 140;

export default function GameScene() {
  const { scene, camera, gl } = useThree();
  const world = useMemo(() => {
    const w = new World({
      seed: 1337,
      viewDistanceChunks: 8,
      chunkSize: { x: 16, y: 72, z: 16 }
    });
    w.generateInitialArea(0, 0);
    return w;
  }, []);

  const playerRef = useRef<PlayerController | null>(null);
  const chunkMeshesRef = useRef<ReturnType<typeof createChunkMeshes> | null>(null);
  const highlightRef = useRef<THREE.LineSegments | null>(null);
  const lightsRef = useRef<{ ambient: THREE.AmbientLight; sun: THREE.DirectionalLight } | null>(null);
  const skyColor = useRef(new THREE.Color());
  const timeRef = useRef(0);
  const fpsRef = useRef({ acc: 0, frames: 0, fps: 0 });
  const statsTimerRef = useRef(0);
  const lastTargetRef = useRef<BlockId | null>(null);

  const setAtlasUrl = useGameStore((state) => state.setAtlasUrl);
  const setPointerLocked = useGameStore((state) => state.setPointerLocked);
  const setRequestPointerLock = useGameStore((state) => state.setRequestPointerLock);
  const setStats = useGameStore((state) => state.setStats);
  const setTargetBlock = useGameStore((state) => state.setTargetBlock);

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
      alphaTest: 0.5
    });

    chunkMeshesRef.current = createChunkMeshes(scene, world, material);

    const box = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    const highlightMat = new THREE.LineBasicMaterial({ color: 0xfdf7da, transparent: true, opacity: 0.85 });
    const highlight = new THREE.LineSegments(edges, highlightMat);
    highlight.visible = false;
    scene.add(highlight);
    highlightRef.current = highlight;

    return () => {
      scene.remove(highlight);
      highlight.geometry.dispose();
      highlight.material.dispose();
      chunkMeshesRef.current?.dispose();
      material.dispose();
      atlas.texture.dispose();
    };
  }, [gl, scene, setAtlasUrl, world]);

  useEffect(() => {
    const player = new PlayerController({
      camera: camera as THREE.PerspectiveCamera,
      world,
      domElement: gl.domElement
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
      if (!locked) playerRef.current?.clearInput();
    };

    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, [gl.domElement, setPointerLocked]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      const player = playerRef.current;
      if (!player) return;

      const origin = player.cameraWorldPosition();
      const dir = player.cameraWorldDirection();
      const hit = pickBlockDDA(world, origin, dir, MAX_PICK_DISTANCE);
      if (!hit) return;

      const state = useGameStore.getState();

      if (e.button === 0) {
        const def = BLOCKS[hit.id];
        if (def.breakable === false) return;
        world.setBlock(hit.block.x, hit.block.y, hit.block.z, BlockId.Air);
        world.markDirtyAt(hit.block.x, hit.block.y, hit.block.z);
        state.addItem(hit.id, 1);
      } else if (e.button === 2) {
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
      }
    };

    const preventContextMenu = (e: Event) => e.preventDefault();

    const el = gl.domElement;
    el.addEventListener("mousedown", handleMouseDown);
    el.addEventListener("contextmenu", preventContextMenu);

    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      el.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [gl.domElement, world]);

  useFrame((_, delta) => {
    const player = playerRef.current;
    if (!player) return;

    const dt = Math.min(0.033, delta);
    timeRef.current += dt;

    world.ensureChunksAround(player.position.x, player.position.z);
    world.pruneFarChunks(player.position.x, player.position.z);
    world.rebuildDirtyChunks();
    chunkMeshesRef.current?.sync();

    player.update(dt);

    const origin = player.cameraWorldPosition();
    const dir = player.cameraWorldDirection();
    const hit = pickBlockDDA(world, origin, dir, MAX_PICK_DISTANCE);

    const highlight = highlightRef.current;
    if (highlight) {
      if (hit) {
        highlight.visible = true;
        highlight.position.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5);
      } else {
        highlight.visible = false;
      }
    }

    if (hit?.id !== lastTargetRef.current) {
      lastTargetRef.current = hit?.id ?? null;
      setTargetBlock(hit?.id ?? null);
    }

    fpsRef.current.acc += dt;
    fpsRef.current.frames += 1;
    if (fpsRef.current.acc >= 0.5) {
      fpsRef.current.fps = Math.round(fpsRef.current.frames / fpsRef.current.acc);
      fpsRef.current.acc = 0;
      fpsRef.current.frames = 0;
    }

    statsTimerRef.current += dt;
    if (statsTimerRef.current >= 0.2) {
      const pos = player.position;
      const timeOfDay = (timeRef.current / DAY_LENGTH_SECONDS) % 1;
      setStats({
        fps: fpsRef.current.fps,
        position: { x: pos.x, y: pos.y, z: pos.z },
        chunkCount: world.getChunkCount(),
        timeOfDay
      });
      statsTimerRef.current = 0;
    }

    const timeOfDay = (timeRef.current / DAY_LENGTH_SECONDS) % 1;
    const sunPhase = Math.sin(timeOfDay * Math.PI * 2) * 0.5 + 0.5;
    const ambient = lightsRef.current?.ambient;
    const sun = lightsRef.current?.sun;

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
  });

  return null;
}
