# GAME002: Logistics and Economy

**Status:** Implemented (Alpha)
**Date:** 2025-12-31

## Logistics System

The Logistics System separates resource extraction from resource transportation, enabling scalable "swarm" behavior.

### Drone Roles

1.  **Miners**:
    - **Goal:** Extract resources from the voxel frontier.
    - **Behavior:** Scan for mineable blocks -> Move -> Mine -> Fill Payload.
    - **Return Policy:** Default is to return to base when full. However, if payload is transferred (to a Hauler) mid-operation, the Miner immediately resets to `SEEKING` mode, staying in the field.

2.  **Haulers**:
    - **Goal:** Transport resources from Miners to Outposts.
    - **Behavior:**
        - `IDLE`: Scan for targets (Miners with payload). Priority given to returning miners and high-payload miners.
        - `FETCHING`: Intercept logic. Moves to dynamic target position.
        - `TRANSFER`: Instant transfer when within range. Resets Miner state.
        - `RETURNING`: Moves to nearest Outpost.
        - `DEPOSITING`: Converts goods to credits.

### Infrastructure: Outposts

- **Definition:** Player-placed drop-off points.
- **Function:** Serves as a valid destination for `RETURNING` drones (Miners or Haulers).
- **Persistence:** Outpost locations are part of the save file (`UiSnapshot.outposts`). They are hydrated into the `WorldModel` upon engine initialization.

## Economy Model

The economy is driven by **Credits** earned from mining.

### Currency Flow
- **Source:** Mining blocks. Value depends on depth/type + Prestige Multiplier.
- **Sink:** Purchasing Upgrades (Drones, Speed, etc.) and Structures (Outposts).

### Cost Scaling

Upgrades follow a geometric progression or piecewise functions keying off the current level/count.

- **Drones/Haulers:** $Cost = Base \times 1.5^{Count}$
- **Stat Upgrades:** $Cost = Base \times 1.5^{Level}$

See `src/config/economy.ts` for current constants.

## Future Expansion

- **Conveyor Belts:** Continuous transport for high-throughput areas.
- **Refineries:** Processing raw blocks into higher-value materials (requiring transport).
- **Fuel/Energy:** Drones currently move for free. Energy constraints would add depth to logistics (return for charge).
