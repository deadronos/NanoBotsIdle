# DEC009: Mix fleet sound from aggregate activity

Individual mining and delivery actions used to create tones as drones finished
work. Their timing made large fleets louder and more repetitive.

Keep audio on the main thread. Read outpost occupancy and delivery events from
the existing simulation frames. At 10 Hz, set the gain of one machinery source
using the strongest nearby outpost. Batch nearby deliveries and share a
cooldown between the first delivery and large payout cues. The visual frame
loop does not mix fleet audio.

Use separate player and fleet gain controls and store them as browser
preferences, independent of game saves. User interaction unlocks the audio
context; hidden tabs are muted, and pausing the simulation fades fleet audio.

See [DESIGN014](../../memory/designs/DESIGN014-fleet-audio.md).
