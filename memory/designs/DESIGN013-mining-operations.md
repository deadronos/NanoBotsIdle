# Mining operations design

The player selects one six-block-radius circle using the same terrain picking flow as outpost placement. The simulation builds a small target index when an order is set and maintains it from frontier changes. Miners abandon targets outside a new zone, deliver their remaining cargo and take work inside the zone. Clearing the order restores automatic mining. Orders belong to the current session and clear on prestige.

Outpost placement is a two-step action. The preview applies the fleet's distance and dock-load score to the currently observed fleet and shows potential diversions as dashed lines on the map. Drones already waiting or depositing keep their current dock. The worker checks the destination and price when the player confirms.

Sheltered Basin favors closer automatic targets at standard ore value. Outer Ridge uses a different world seed, favors farther automatic targets and pays 25% more for each mined block. The landing profile is optional save data so older saves retain their seeded worlds. Direct mining orders supersede automatic targeting preferences.

Mining flashes and cargo pods use instanced geometry. The worker sends cargo fill and current return destinations through transferable arrays. The renderer limits map and placement estimate refreshes to 10 Hz.

See [the progression rules](../../docs/ARCHITECTURE/GAME001-progression-loop.md) and [the implementation and verification log](../tasks/TASK022-mining-operations.md).
