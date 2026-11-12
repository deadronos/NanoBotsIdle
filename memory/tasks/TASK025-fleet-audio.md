# TASK025: Redesign fleet audio

Status: Implemented. See [DESIGN014](../designs/DESIGN014-fleet-audio.md).

1. Test proximity, activity saturation, burst grouping, and cue cooldown.
2. Implement the audio policy and browser mixer. Remove per-drone sounds from
   the visual loop; use existing outpost and delivery events.
3. Add persistent fleet and player volume controls plus master mute.
4. Run typecheck, lint, tests, build, and a real browser audio smoke check.

Chrome smoke with 45 miners and five haulers confirmed a single machinery
source, a first delivery cue, fade on pause, no pre-interaction context,
and settings persistence across reload. Typecheck, lint, production build,
and 447 unit tests passed.
