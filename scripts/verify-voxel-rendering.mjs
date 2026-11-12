import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4173/NanoBotsIdle/";
const output = await mkdtemp(join(tmpdir(), "nano-voxel-route-"));
const browser = await chromium.launch({ channel: "chrome", args: ["--enable-unsafe-swiftshader"] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /WebGL|shader/i.test(message.text()))
      errors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "voxel-walker-storage",
      JSON.stringify({
        version: 2,
        state: { droneCount: 45, haulerCount: 5 },
      }),
    );
    const revisions = new Map();
    window.voxelRoute = { revisions, boundary: null };
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        const isSim = String(args[0]).includes("sim.worker");
        if (isSim) {
          let requested = false;
          const postMessage = this.postMessage.bind(this);
          this.postMessage = (message, ...options) => {
            if (!requested && message.t === "STEP") {
              requested = true;
              message.cmds.push({ t: "SET_MINING_ZONE", zone: { x: 0, y: 6, z: 0 } });
            }
            return postMessage(message, ...options);
          };
        }
        this.addEventListener("message", ({ data }) => {
          if (data.t === "MESH_RESULT") {
            const { cx, cy, cz } = data.chunk;
            revisions.set(`${cx},${cy},${cz}`, data.rev);
          }
          if (data.t !== "FRAME" || window.voxelRoute.boundary) return;
          for (const { x, y, z } of data.delta.edits ?? []) {
            if (x !== -1 && x !== 0) continue;
            const cy = Math.floor(y / 16);
            const cz = Math.floor(z / 16);
            const keys = [`-1,${cy},${cz}`, `0,${cy},${cz}`];
            if (!keys.every((key) => revisions.has(key))) continue;
            window.voxelRoute.boundary = keys.map((key) => [key, revisions.get(key)]);
            break;
          }
        });
      }
    };
  });

  await page.goto(url);
  await page.waitForFunction(() => window.voxelRoute.revisions.size >= 25);
  await page.evaluate(() =>
    window.updateConfig({
      render: {
        voxels: {
          debugCompare: { enabled: true },
          lod: { lowDistanceMultiplier: 1.5 },
        },
      },
    }),
  );
  await page.getByRole("complementary", { name: "Chunk diagnostics" }).waitFor();
  await page.waitForFunction(
    () => {
      const { boundary, revisions } = window.voxelRoute;
      return boundary?.every(([key, rev]) => revisions.get(key) > rev);
    },
    undefined,
    { timeout: 60_000 },
  );
  await page.screenshot({ path: join(output, "boundary-edit.png") });

  const beforeTurn = await page.evaluate(() => [...window.voxelRoute.revisions.keys()]);
  await page.mouse.move(280, 450);
  await page.mouse.down();
  await page.mouse.move(910, 450, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(
    (before) => [...window.voxelRoute.revisions.keys()].some((key) => !before.includes(key)),
    beforeTurn,
  );

  const beforeMove = await page.evaluate(() => window.voxelRoute.revisions.size);
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await page.waitForFunction(
    (before) => window.voxelRoute.revisions.size >= before + 12,
    beforeMove,
  );
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  await page.screenshot({ path: join(output, "after-traverse.png") });

  assert.deepEqual(errors, []);
  console.log(
    `Verified a boundary edit, a stationary turn, and terrain traversal. Screenshots: ${output}`,
  );
} finally {
  await browser.close();
}
