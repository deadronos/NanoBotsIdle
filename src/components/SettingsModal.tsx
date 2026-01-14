import React, { useRef } from "react";

import { updateConfig } from "../config/index";
import { type VoxelRenderMode, voxelRenderModes } from "../config/render";
import { useConfig } from "../config/useConfig";
import { error } from "../utils/logger";
import { exportSave, importSave, resetGame } from "../utils/saveUtils";
import { ModalShell } from "./ui/ModalShell";

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cfg = useConfig();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importSave(file);
        alert("Save loaded successfully!");
        onClose();
      } catch (e) {
        error("Failed to load save file", e);
        alert("Failed to load save file.");
      }
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      contentClassName="bg-gray-900 border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl relative"
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
        ✕
      </button>

      <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
        <span>⚙️</span> Settings
      </h2>

      <div className="space-y-4">
        <div className="bg-white/5 p-4 rounded-xl">
          <h3 className="text-white font-bold mb-2">Rendering</h3>
          <p className="text-xs text-gray-400 mb-4">
            Choose how voxels are rendered. &quot;Meshed&quot; is experimental.
          </p>

          <label className="block text-xs text-gray-300 mb-2" htmlFor="voxel-render-mode">
            Voxel render mode
          </label>
          <select
            id="voxel-render-mode"
            className="w-full bg-gray-800 border border-white/10 text-white rounded px-3 py-2 text-sm"
            value={cfg.render.voxels.mode}
            onChange={(e) => {
              const mode = e.target.value as VoxelRenderMode;
              updateConfig({ render: { voxels: { mode } } });
            }}
          >
            {voxelRenderModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>

          <label className="mt-4 flex items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              className="accent-blue-500"
              checked={cfg.render.voxels.debugCompare.enabled}
              onChange={(e) => {
                updateConfig({
                  render: { voxels: { debugCompare: { enabled: e.target.checked } } },
                });
              }}
            />
            Debug compare (logs dense baseline vs current renderer)
          </label>

          <label className="mt-2 flex items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              className="accent-blue-500"
              checked={cfg.render.voxels.biomeOverlay.enabled}
              onChange={(e) => {
                updateConfig({
                  render: { voxels: { biomeOverlay: { enabled: e.target.checked } } },
                });
              }}
            />
            Biome overlay (debug voxel colors)
          </label>

          <label className="mt-2 flex items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              className="accent-blue-500"
              checked={cfg.render.voxels.occlusion.enabled}
              onChange={(e) => {
                updateConfig({
                  render: { voxels: { occlusion: { enabled: e.target.checked } } },
                });
              }}
            />
            Occlusion culling (experimental WebGL2)
          </label>
        </div>

        <div className="bg-white/5 p-4 rounded-xl">
          <h3 className="text-white font-bold mb-2">Save Management</h3>
          <p className="text-xs text-gray-400 mb-4">Export your progress or load a backup.</p>
          <div className="flex gap-2">
            <button
              onClick={exportSave}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-bold text-sm transition-colors"
            >
              Export Save
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-bold text-sm transition-colors"
            >
              Import Save
            </button>
            <input
              type="file"
              aria-label="Import save file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="bg-red-900/20 border border-red-500/20 p-4 rounded-xl">
          <h3 className="text-red-400 font-bold mb-2">Danger Zone</h3>
          <button
            onClick={() => {
              if (confirm("Are you sure? This will wipe all progress!")) {
                resetGame();
              }
            }}
            className="w-full bg-red-600/80 hover:bg-red-500 text-white py-2 rounded font-bold text-sm transition-colors"
          >
            Reset Game Data
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
