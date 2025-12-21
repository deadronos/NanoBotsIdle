Answers to your design questions (plus what I implemented):

Fixed 1/60s simulation: yes, it’s a good idea for consistency. I implemented a capped fixed‑step loop (max 5 steps/frame) to avoid spiral‑of‑death and use interpolation for camera position. Chunk streaming/meshing stays on the render tick to keep existing per‑frame caps intact.

What’s missing for a Minecraft‑like game: persistence (save/load), lighting propagation/torches, tools + durability, item drops, mobs/AI, biomes/structures, crafting progression, audio/ambience, world seed selection, map/coordinates UI, and eventually multiplayer.

Miniplex ECS: viable for entity systems (mobs, items, particles, projectiles), but keep World + THREE.* outside ECS. I didn’t wire ECS into runtime yet—just left space for it in the design.

Zustand + Immer: it can simplify nested UI updates, but only use it for UI/light state; keep heavy objects out. Current store is still fine without Immer.

If you want to keep going, pick one:

ECS PoC with miniplex for player/time-of-day systems.

Finish UI migration for hotbar/crosshair + add shadcn tabs or scroll areas.

Write a feature‑gap roadmap doc under memory/designs/ or docs/ and prioritize the next gameplay feature.
