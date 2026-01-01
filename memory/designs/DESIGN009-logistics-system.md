# DESIGN009: Logistics and Hauler System

**Status:** Implementation Complete
**Related Task:** `TASK013`
**See also:** `docs/ARCHITECTURE/GAME002-logistics-and-economy.md`

## Overview

The Logistics System introduces automated resource transport to NanoBotsIdle. It separates the "extraction" concern (Miners) from the "transport" concern (Haulers), allowing for scalable operations where miners spend more time mining and less time traveling.

## Core Concepts

### 1. Specialize Drones

Drones are no longer generic. They have roles:
- **MINER**: Extracts resources. Default behavior is to return to base when full.
- **HAULER**: Transports resources. Seeks out full Miners, collects their payload, and deposits it.

### 2. Outposts

Outposts serve as drop-off points. They allow the player to extend the effective range of their operation.
- **Model**: Simple point entity `(x, y, z)`.
- **Function**: Valid target for `RETURNING` state.
- **Capacity**: Limited to 4 docking slots.
- **Queue**: Manages extensive traffic via "Smart Queuing" protocol.
- **Persistence**: Saved in `GameState` to persist layout across sessions.

## Detailed Design

### Hauler State Machine

The Hauler acts as a "servant" to the Mining fleet.

1.  **IDLE**: Consumes no fuel (conceptually). Scans `drones` array for targets.
    - *Heuristic:* Score = `payload / distance`. Bonus for `RETURNING` miners (intercepting active returners is high value).
    - *Targeting:* Locks onto a Miner ID (`targetKey = "miner-{id}"`).
2.  **FETCHING**: Moves towards the targeted Miner.
    - Updates destination per tick (Miners move).
    - *Abort Condition:* Miner becomes empty (deposited elsewhere) or lost.
3.  **TRANSFER (Implicit)**: When `dist < range`:
    - `hauler.payload += transferAmount`
    - `miner.payload -= transferAmount`
    - **Crucial:** If `miner.payload == 0`, Miner state forced to `SEEKING`. This "resets" the miner to work mode immediately.
4.  **RETURNING**: Full (or target lost with cargo). Moves to nearest Outpost.
    - **Smart Queuing**: Upon arrival, requests a docking slot.
    - If granted -> `DEPOSITING`.
    - If denied -> `QUEUING`.
5.  **QUEUING**: Safe holding pattern.
    - Behavior: Orbit the outpost at `altitude + 5`.
    - Retry: Periodically requests docking slot.
    - Reroute: If queue > 5, may seek other outposts (future improvement).
6.  **DEPOSITING**: Converts payload to credits.
    - Undocks (frees slot) upon completion.

### Interception Mechanic

The key efficiency gain comes from **Interception**.
- Without Haulers: Miner spends $T_{mine} + T_{return} + T_{deposit} + T_{return\_back}$.
- With Haulers: Miner spends $T_{mine} + T_{wait/short\_travel}$.
- Haulers handle the long $T_{return}$ legs.

### Persistence

Outposts are critical infrastructure.
- **Store**: `outposts: {x,y,z}[]` added to `UiSnapshot`.
- **Hydration**: On engine create, `outposts` are read from save and re-instantiated in the `WorldModel`.
- **Validation**: Deduplication ensures we don't spawn multiple outposts on the same spot on load.
