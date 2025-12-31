# TASK013: Logistics Phase 3 - Hauler Drones & Polish

**Status:** Completed
**Date:** 2025-12-31

## Context

After implementing basic mining and outposts (Phase 1 & 2), the game loop needed automation for resource transport. Miners spending time returning to base reduced efficiency. Hauler drones were introduced to create a logistical layer, intercepting miners and centralizing resource collection.

## Objectives

1.  **Hauler Drones:** Implement a new drone role dedicated to transport.
2.  **Outpost Persistence:** Ensure player-built structures are saved/loaded.
3.  **Visual Distinction:** Clearly distinguish Haulers from Miners.
4.  **Economy Integration:** Make Haulers purchasable and scalable.

## Implementation Details

### 1. Hauler Logic (`tickDrones.ts`)

- Refactored `tickDrones` to support `MINER` and `HAULER` roles.
- **Hauler State Machine:**
    - `IDLE`: Scans for miners with payload (prioritizing `RETURNING`).
    - `FETCHING`: Chases target miner.
    - `TRANSFER`: Transfers cargo from miner to hauler.
    - `RETURNING`: Delivers cargo to nearest outpost.
    - `DEPOSITING`: Converts cargo to credits.
- **Miner Logic Update:** Miners automatically resume `SEEKING` if their payload is emptied by a hauler while returning.

### 2. Outpost Persistence

- Updated `UiSnapshot` and `GameState` to include `outposts` array.
- Modified `save-game.ts` (implied via migration/store) to persist this list.
- Updated `engine.ts` to hydrate `world.outposts` from `saveState` on initialization.

### 3. Visuals

- Updated `protocol.ts` to sync `entityRoles` (Uint8Array).
- Updated `Drones.tsx` and `droneVisuals.ts` to apply color tinting (Orange for Haulers) based on role.

### 4. UI/Shop

- Added "Logistics Hauler" card to `ShopModal`.
- Configured base costs and scaling in `config/economy.ts`.

## Outcome

- Players can now automate logistics.
- The game loop allows for "swarm" mining strategies where miners stay in the field.
- Infrastructure (Outposts) is persistent across sessions.
