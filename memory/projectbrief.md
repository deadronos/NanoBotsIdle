# Project Brief

**NanoFactory Evolution (NanoBotsIdle)**

Short description

NanoFactory Evolution is an incremental/idle factory management game where the player designs and optimizes production chains of autonomous nanobots (drones) using an ECS-based simulation. The core loop focuses on building, automating, and balancing production while managing heat, logistics, and meta-progression (compile shards).

Primary goals

- Deliver a small, focused idle factory experience with emergent logistics and drone behavior.
- Use an ECS architecture to keep simulation logic decoupled from UI and allow high-performance simulation ticks.
- Provide clear progression phases (Bootstrap → Networked Logistics → Overclock) and meaningful meta-progression.
- Maintain a developer-friendly monorepo with clear memory-bank docs and spec-driven workflow for future contributors.

Key constraints

- TypeScript + React (Vite) + Zustand; strict TypeScript configuration.
- Focus on single-player local simulation with deterministic behavior where practical.
- Keep simulation decoupled from React rendering; snapshot UI for performance.

Primary stakeholders

- Players who enjoy optimization, automation, and incremental progression.
- Contributors and maintainers who will extend simulation systems, balance, and UI.

Acceptance criteria (high level)

- The repository contains a clear Memory Bank (this file plus context files) describing project goals and processes.
- Basic ECS simulation and core production chain design documented in memory/designs and memory/tasks.
