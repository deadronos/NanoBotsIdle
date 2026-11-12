import React from "react";

import { unlockAudio } from "../../utils/audio";
import { useAudioSettings } from "../../utils/audioPreferences";

export const AudioSettings: React.FC = () => {
  const muted = useAudioSettings((state) => state.muted);
  const fleet = useAudioSettings((state) => state.fleetVolume);
  const player = useAudioSettings((state) => state.playerVolume);
  const setMuted = useAudioSettings((state) => state.setMuted);
  const setFleet = useAudioSettings((state) => state.setFleetVolume);
  const setPlayer = useAudioSettings((state) => state.setPlayerVolume);

  return (
    <fieldset className="space-y-3 bg-white/5 p-4 rounded-xl" aria-labelledby="audio-settings">
      <h3 id="audio-settings" className="text-white font-bold">
        Audio
      </h3>
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          className="accent-blue-500"
          checked={muted}
          onChange={(event) => {
            const nextMuted = event.currentTarget.checked;
            setMuted(nextMuted);
            if (!nextMuted && event.nativeEvent.isTrusted) unlockAudio();
          }}
        />
        Mute all sound
      </label>
      <div className="space-y-1">
        <label htmlFor="fleet-volume" className="flex justify-between text-sm text-gray-300">
          Fleet volume <span aria-hidden="true">{Math.round(fleet * 100)}%</span>
        </label>
        <input
          id="fleet-volume"
          type="range"
          min="0"
          max="100"
          value={Math.round(fleet * 100)}
          onChange={(event) => setFleet(event.currentTarget.valueAsNumber / 100)}
          className="w-full accent-blue-500"
        />
        <p className="text-xs text-gray-400">Nearby outposts and delivery cues.</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="player-volume" className="flex justify-between text-sm text-gray-300">
          Player volume <span aria-hidden="true">{Math.round(player * 100)}%</span>
        </label>
        <input
          id="player-volume"
          type="range"
          min="0"
          max="100"
          value={Math.round(player * 100)}
          onChange={(event) => setPlayer(event.currentTarget.valueAsNumber / 100)}
          className="w-full accent-blue-500"
        />
      </div>
    </fieldset>
  );
};
