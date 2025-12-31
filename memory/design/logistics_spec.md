# Design Spec: Logistics & Drone Supply Chain

## Overview
Introduce a logistical constraint to the mining loop. Drones collect resources ("Payload") which must be transported to a central **Outpost** to be converted into Credits. This creates a flow of traffic and incentivizes localized mining.

## Gameplay Concepts

### 1. The Payload (Cargo)
- **Concept**: Drones no longer instantly credit the player. They fill an internal buffer.
- **Mechanics**:
  - `Drone.capacity`: Max payload (e.g., 10 blocks worth).
  - `Drone.payload`: Current payload.
  - While `payload < capacity`: Drone continues mining.
  - When `payload >= capacity`: Drone enters `RETURNING` state.

### 2. The Outpost (Structure)
- **Concept**: A 4x4 building that serves as a drop-off point.
- **Mechanics**:
  - **Construction**: Player purchases an Outpost placement via UI.
  - **Placement**: Player clicks a valid 4x4 flat(ish) area on the terrain.
  - **Storage**: Outposts act as sinks. When a drone touches them (radius < 2), `payload` is converted to `credits`.
  - **Mining Bias**: `pickTargetKey` logic will be updated to prioritize voxels closer to *any* Outpost to minimize travel time.

### 3. Haulers (New Drone Class)
- **Concept**: Specialized drones that do not mine. They transport payload from Miners to Outposts.
- **Unlock**: "Hauler Robotics" tech in Research Panel.
- **Scaling**: Each upgrade level adds +1 Hauler to the fleet.
- **Logic**:
  - **State: IDLE**: Waits at Outpost.
  - **State: FETCHING**: Targets a Miner that is >50% full or explicitly "Requesting Pickup".
  - **State: TRANSFER**: Reaches Miner, moves Payload from Miner -> Hauler.
  - **State: DEPOSITING**: Returns to Outpost to dump Payload.
- **Benefit**: Miners don't have to waste time traveling back to base.

## Implementation Details

### Data Structures (`src/engine/drones.ts`)

```typescript
export type DroneRole = "MINER" | "HAULER";

export type Drone = {
  // ... existing fields
  role: DroneRole;
  payload: number;
  maxPayload: number; // variable based on upgrades?
  
  // Revised States
  state: 
    | "SEEKING"       // (Miner) Looking for ore
    | "MOVING"        // (Miner) Going to ore / (Hauler) Going to miner
    | "MINING"        // (Miner) Lasering
    | "RETURNING"     // (Miner/Hauler) Going to Outpost
    | "WAITING_PICKUP"// (Miner) Full, waiting for hauler (optional optimization)
    | "DEPOSITING"    // (All) transfer anim at outpost
};

export type Outpost = {
  id: string;
  x: number;
  y: number;
  z: number;
  level: number;
};
```

### Game Loop Updates (`tickDrones.ts`)

1.  **Miner Loop Update**:
    *   Increment `payload` on mine complete.
    *   If `payload >= maxPayload`:
        *   Check for available Haulers?
        *   If no Haulers: State -> `RETURNING` (Target: Nearest Outpost).
        *   If Haulers exist: State -> `WAITING_PICKUP` (or keep mining if strictly capacity constrained? Maybe move slower?).
        *   *Decision*: For V1, if full, Miner calls for hauler. If no hauler assigned within X seconds, Miner returns itself.

2.  **Hauler Loop**:
    *   Find Miner with highest `payload`.
    *   Move to Miner.
    *   Transfer `Math.min(miner.payload, hauler.space)`.
    *   If Hauler full -> Return.
    *   If Hauler not full -> Find next Miner? (Complex) -> *Simpler*: Return after every pickup for now.

3.  **Sim Bridge**:
    *   Need to handle "Build Outpost" command from UI.

## Visuals
- **Payload Meter**: Small bar above drone? Or just glow intensity.
- **Structure**: A simple geometric "Base" mesh (4x4x2 blocks size).
- **Hauler**: Different color (e.g., Orange vs Yellow) or model scale.

## Phasing
1.  **Phase 1: Cargo & Base** - Implement Cargo cap and force Miners to return to start point (0,0,0) or a default Base.
2.  **Phase 2: Placeable Outposts** - Add UI to place new drop-off points.
3.  **Phase 3: Haulers** - Add the Hauler class and interaction logic.
