import React, { useEffect,useRef } from "react";

import { exportSave, importSave, resetGame } from "../utils/saveUtils";

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Click outside to close
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onClose]);


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
      } catch {
        alert("Failed to load save file.");
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto"
    >
      <div ref={containerRef} className="bg-gray-900 border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          ✕
        </button>

        <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
          <span>⚙️</span> Settings
        </h2>

        <div className="space-y-4">
          <div className="bg-white/5 p-4 rounded-xl">
            <h3 className="text-white font-bold mb-2">Save Management</h3>
            <p className="text-xs text-gray-400 mb-4">
              Export your progress or load a backup.
            </p>
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
      </div>
    </div>
  );
};
