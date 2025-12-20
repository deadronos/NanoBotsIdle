import * as THREE from "three";
import { World, BlockId, BLOCKS, blockIdToName, type BlockDef } from "./voxel/World";
import { PlayerController } from "./voxel/PlayerController";
import { createAtlasTexture } from "./voxel/atlas";
import { pickBlockDDA } from "./voxel/picking";
import { createChunkMeshes, type ChunkMesh } from "./voxel/rendering";

const app = document.querySelector<HTMLDivElement>("#app")!;
const overlay = document.querySelector<HTMLDivElement>("#overlay")!;
const startBtn = document.querySelector<HTMLButtonElement>("#startBtn")!;
const statsEl = document.querySelector<HTMLDivElement>("#stats")!;
const hotbarEl = document.querySelector<HTMLDivElement>("#hotbar")!;

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87c6ff, 1);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x87c6ff, 0.0038);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 600);
camera.position.set(8, 24, 8);

const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 0.75);
sun.position.set(80, 140, 50);
sun.castShadow = false;
scene.add(sun);

const world = new World({
  seed: 1337,
  viewDistanceChunks: 8,
  chunkSize: { x: 16, y: 64, z: 16 }
});
world.generateInitialArea(0, 0);

const atlas = createAtlasTexture(renderer, BLOCKS);
const material = new THREE.MeshLambertMaterial({
  map: atlas.texture,
  transparent: true,
  alphaTest: 0.5
});

const chunkMeshes = createChunkMeshes(scene, world, material);

const player = new PlayerController({
  camera,
  world,
  domElement: renderer.domElement
});
player.teleportToSafeSpawn();

let selectedBlock: BlockId = BlockId.Grass;

function rebuildHotbar() {
  hotbarEl.innerHTML = "";
  const ids: BlockId[] = [BlockId.Grass, BlockId.Dirt, BlockId.Stone, BlockId.Wood, BlockId.Leaves];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    const div = document.createElement("div");
    div.className = "slot" + (id === selectedBlock ? " selected" : "");
    div.textContent = String(i + 1);
    div.title = blockIdToName(id);
    hotbarEl.appendChild(div);
  }
}
rebuildHotbar();

function setSelectedSlot(slot: number) {
  const ids: BlockId[] = [BlockId.Grass, BlockId.Dirt, BlockId.Stone, BlockId.Wood, BlockId.Leaves];
  const idx = THREE.MathUtils.clamp(slot, 0, ids.length - 1);
  selectedBlock = ids[idx]!;
  rebuildHotbar();
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Digit1") setSelectedSlot(0);
  if (e.code === "Digit2") setSelectedSlot(1);
  if (e.code === "Digit3") setSelectedSlot(2);
  if (e.code === "Digit4") setSelectedSlot(3);
  if (e.code === "Digit5") setSelectedSlot(4);
});

function setOverlayVisible(v: boolean) {
  overlay.classList.toggle("hidden", !v);
}

startBtn.addEventListener("click", async () => {
  await player.requestPointerLock();
  setOverlayVisible(false);
});

document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === renderer.domElement;
  setOverlayVisible(!locked);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

const highlightMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
const highlightGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
const highlight = new THREE.LineSegments(highlightGeo, highlightMat);
highlight.visible = false;
scene.add(highlight);

function updateHighlight() {
  const origin = player.cameraWorldPosition();
  const dir = player.cameraWorldDirection();
  const hit = pickBlockDDA(world, origin, dir, 7);
  if (!hit) {
    highlight.visible = false;
    return;
  }
  highlight.visible = true;
  highlight.position.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5);
}

function breakOrPlace(e: MouseEvent) {
  // Only interact when locked.
  if (document.pointerLockElement !== renderer.domElement) return;

  const origin = player.cameraWorldPosition();
  const dir = player.cameraWorldDirection();
  const hit = pickBlockDDA(world, origin, dir, 7);
  if (!hit) return;

  if (e.button === 0) {
    // break
    world.setBlock(hit.block.x, hit.block.y, hit.block.z, BlockId.Air);
    world.markDirtyAt(hit.block.x, hit.block.y, hit.block.z);
  } else if (e.button === 2) {
    // place on adjacent
    const p = hit.block;
    const n = hit.normal;
    const px = p.x + n.x;
    const py = p.y + n.y;
    const pz = p.z + n.z;

    // Don't place into player AABB (simple anti-stuck).
    if (player.wouldCollideAtPlacement(px, py, pz)) return;

    world.setBlock(px, py, pz, selectedBlock);
    world.markDirtyAt(px, py, pz);
  }
}

renderer.domElement.addEventListener("mousedown", breakOrPlace);
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

let lastT = performance.now();
let fpsAcc = 0;
let fpsCount = 0;
let fps = 0;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min(0.033, (now - lastT) / 1000);
  lastT = now;

  // Load/generate chunks around the player and rebuild dirty ones.
  world.ensureChunksAround(player.position.x, player.position.z);
  world.pruneFarChunks(player.position.x, player.position.z);
  world.rebuildDirtyChunks();

  // Sync chunk meshes for any newly built geometries.
  chunkMeshes.sync();

  player.update(dt);

  updateHighlight();

  renderer.render(scene, camera);

  fpsAcc += dt;
  fpsCount++;
  if (fpsAcc >= 0.5) {
    fps = Math.round(fpsCount / fpsAcc);
    fpsAcc = 0;
    fpsCount = 0;
  }

  statsEl.textContent =
    `FPS: ${fps} | Pos: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`
    + ` | Sel: ${blockIdToName(selectedBlock)}`;
}

animate();
