import { useState, useEffect } from "react";
import { AudioManager, AudioSettings } from "../../audio/AudioManager";

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AudioSettings>(AudioManager.getSettings());

  useEffect(() => {
    // Load current settings on mount
    setSettings(AudioManager.getSettings());
  }, []);

  const handleVolumeChange = (type: keyof AudioSettings, value: number) => {
    const newSettings = { ...settings, [type]: value };
    setSettings(newSettings);
    AudioManager.updateSettings(newSettings);
  };

  const handleMuteToggle = () => {
    const newSettings = { ...settings, muted: !settings.muted };
    setSettings(newSettings);
    AudioManager.updateSettings(newSettings);
  };

  const handleTestSound = () => {
    AudioManager.play("buildingPlace");
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 fade-in">
      <div className="bg-neutral-900 border-2 border-neutral-700 rounded-lg p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-emerald-400">Audio Settings</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-2xl transition-smooth"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Mute Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-lg text-white">Audio</span>
            <button
              onClick={handleMuteToggle}
              className={`px-4 py-2 rounded-lg font-semibold transition-smooth hover-lift button-press ${
                settings.muted
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {settings.muted ? "🔇 Muted" : "🔊 Enabled"}
            </button>
          </div>

          {/* Master Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white font-semibold">Master Volume</label>
              <span className="text-neutral-400">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.masterVolume * 100}
              onChange={(e) => handleVolumeChange("masterVolume", Number(e.target.value) / 100)}
              className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={settings.muted}
            />
          </div>

          {/* SFX Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white font-semibold">Sound Effects</label>
              <span className="text-neutral-400">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.sfxVolume * 100}
              onChange={(e) => handleVolumeChange("sfxVolume", Number(e.target.value) / 100)}
              className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={settings.muted}
            />
          </div>

          {/* Ambient Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white font-semibold">Ambient Sounds</label>
              <span className="text-neutral-400">{Math.round(settings.ambientVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.ambientVolume * 100}
              onChange={(e) => handleVolumeChange("ambientVolume", Number(e.target.value) / 100)}
              className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={settings.muted}
            />
          </div>

          {/* Test Sound Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleTestSound}
              disabled={settings.muted}
              className={`px-6 py-2 rounded-lg font-semibold transition-smooth hover-lift button-press ${
                settings.muted
                  ? "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              🔊 Test Sound
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 pt-4 border-t border-neutral-800">
          <p className="text-sm text-neutral-400 text-center">
            Audio settings are saved automatically
          </p>
        </div>
      </div>
    </div>
  );
}
