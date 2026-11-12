# DESIGN014: Fleet audio

Routine mining and unloading are silent. Nearby occupied outposts contribute to
one filtered machinery bed; proximity and congestion affect its level, but
outposts never stack voices. Delivery bursts are grouped into a short window.
The first audible delivery and unusually large local payouts get soft, distinct
cues, with a shared cooldown. Jump remains a separate player sound.

The browser owns the mixer and its preferences; worker messages and save data
stay unchanged. The mixer starts on user interaction, fades when the game is
paused or hidden, and discards pending cues while inactive.
