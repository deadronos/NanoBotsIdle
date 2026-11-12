import { useEffect } from "react";

import { playerPosition } from "../engine/playerState";
import { getSimBridge } from "../simBridge/simBridge";
import {
  canPlayFleetAudio,
  disposeAudio,
  playDeliveryCue,
  setMachineryActivity,
  syncAudioLevels,
  unlockAudio,
} from "../utils/audio";
import { useAudioSettings } from "../utils/audioPreferences";
import { FleetAudioPolicy, getOutpostActivity } from "../utils/fleetAudio";

export const FleetAudio = (): null => {
  useEffect(() => {
    const bridge = getSimBridge();
    const policy = new FleetAudioPolicy();
    let previousFrame = bridge.getLastFrame();

    const fleetIsActive = () => bridge.isRunning() && canPlayFleetAudio();

    const refreshMix = () => {
      if (!fleetIsActive()) {
        policy.clearPending();
        setMachineryActivity(0);
        return;
      }
      const outposts = bridge.getLastFrame()?.ui.outposts;
      setMachineryActivity(outposts ? getOutpostActivity(playerPosition, outposts) : 0);
      const cue = policy.poll(performance.now());
      if (cue) playDeliveryCue(cue);
    };

    const sync = () => {
      syncAudioLevels();
      refreshMix();
    };

    const unsubscribe = bridge.onFrame((frame) => {
      const previous = previousFrame;
      previousFrame = frame;
      if (previous === frame) return;
      if (
        previous &&
        (frame.ui.actualSeed !== previous.ui.actualSeed ||
          frame.ui.prestigeLevel !== previous.ui.prestigeLevel)
      ) {
        policy.clearPending();
      }
      const events = frame.delta.depositEvents;
      if (!events?.length || !fleetIsActive()) return;
      const now = performance.now();
      const cue = policy.poll(now);
      if (cue) playDeliveryCue(cue);
      policy.addDeliveries(now, playerPosition, events);
    });
    const unsubscribeSettings = useAudioSettings.subscribe(sync);
    const onInput = (event: Event) => {
      if (event.isTrusted) unlockAudio();
    };
    window.addEventListener("click", onInput, true);
    window.addEventListener("keydown", onInput, true);
    document.addEventListener("visibilitychange", sync);
    const timer = window.setInterval(refreshMix, 100);

    return () => {
      unsubscribe();
      unsubscribeSettings();
      window.removeEventListener("click", onInput, true);
      window.removeEventListener("keydown", onInput, true);
      document.removeEventListener("visibilitychange", sync);
      window.clearInterval(timer);
      disposeAudio();
    };
  }, []);

  return null;
};
