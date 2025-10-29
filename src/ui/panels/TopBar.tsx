import { useState, useRef } from "react";
import { useGameStore } from "../../state/store";
import { hasSave, exportSave, getSaveMetadata, importSave } from "../../state/persistence";

export function TopBar() {
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const saveGame = useGameStore((s) => s.saveGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!snapshot) return null;

  const heatPercent = Math.floor(snapshot.heatRatio * 100);
  const heatColor =
    heatPercent > 80 ? "text-red-400" : heatPercent > 50 ? "text-orange-400" : "text-green-400";
  const heatBgColor =
    heatPercent > 80
      ? "bg-red-900/30"
      : heatPercent > 50
        ? "bg-orange-900/30"
        : "bg-green-900/30";

  // Heat impact on production
  const heatPenalty = Math.floor((1 / (1 + snapshot.heatRatio)) * 100);

  const handleSave = () => {
    setSaveStatus("saving");
    try {
      saveGame();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleLoad = () => {
    setLoadStatus("loading");
    try {
      loadGame();
      setLoadStatus("loaded");
      setTimeout(() => setLoadStatus("idle"), 2000);
    } catch (error) {
      console.error("Load failed:", error);
      setLoadStatus("error");
      setTimeout(() => setLoadStatus("idle"), 3000);
    }
  };

  const handleExport = () => {
    const saveData = exportSave();
    if (saveData) {
      const blob = new Blob([saveData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nanofactory-save-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const success = importSave(content);
        if (success) {
          setLoadStatus("loaded");
          // Load the imported save immediately
          loadGame();
          setTimeout(() => setLoadStatus("idle"), 2000);
        } else {
          setLoadStatus("error");
          setTimeout(() => setLoadStatus("idle"), 3000);
        }
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be imported again
    event.target.value = "";
  };

  const saveMetadata = getSaveMetadata();

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-3">
      <div className="flex items-center justify-between gap-8">
        <div className="text-2xl font-bold text-emerald-400">NanoFactory Evolution</div>

        <div className="flex items-center gap-6">
          {/* Heat */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Heat</div>
            <div className={`text-lg font-semibold ${heatColor}`}>
              {Math.floor(snapshot.heatCurrent)} / {snapshot.heatSafeCap}
              <span className="text-sm ml-1">({heatPercent}%)</span>
            </div>
            {/* Heat efficiency indicator */}
            <div className={`text-xs ${heatColor} ${heatBgColor} px-1 rounded mt-0.5`}>
              Efficiency: {heatPenalty}%
            </div>
          </div>

          {/* Power */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Power</div>
            <div className="text-lg font-semibold text-blue-400">
              {Math.floor(snapshot.powerDemand)} / {snapshot.powerAvailable}
            </div>
          </div>

          {/* Throughput */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Throughput</div>
            <div className="text-lg font-semibold text-purple-400">
              {snapshot.throughput.toFixed(1)} <span className="text-sm">atoms/s</span>
            </div>
          </div>

          {/* Projected Shards */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Projected Shards</div>
            <div className="text-lg font-semibold text-amber-400">
              {Math.floor(snapshot.projectedShards)}
            </div>
          </div>

          {/* Time */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Time</div>
            <div className="text-lg font-semibold text-neutral-300">
              {Math.floor(snapshot.simTimeSeconds / 60)}m {Math.floor(snapshot.simTimeSeconds % 60)}
              s
            </div>
          </div>
        </div>

        {/* Save/Load Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                saveStatus === "saved"
                  ? "bg-green-600 text-white"
                  : saveStatus === "error"
                    ? "bg-red-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
              title="Manual Save"
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" && "⏳ Saving..."}
              {saveStatus === "saved" && "✓ Saved!"}
              {saveStatus === "error" && "✗ Error"}
              {saveStatus === "idle" && "💾 Save"}
            </button>
            {hasSave() && (
              <button
                onClick={handleLoad}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  loadStatus === "loaded"
                    ? "bg-green-600 text-white"
                    : loadStatus === "error"
                      ? "bg-red-600 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                }`}
                title="Load Save"
                disabled={loadStatus === "loading"}
              >
                {loadStatus === "loading" && "⏳ Loading..."}
                {loadStatus === "loaded" && "✓ Loaded!"}
                {loadStatus === "error" && "✗ Error"}
                {loadStatus === "idle" && "📂 Load"}
              </button>
            )}
            <button
              onClick={handleExport}
              className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              title="Export Save to File"
              disabled={!hasSave()}
            >
              📤 Export
            </button>
            <button
              onClick={handleImportClick}
              className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
              title="Import Save from File"
            >
              📥 Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: "none" }}
            />
          </div>
          {saveMetadata && (
            <div className="text-xs text-neutral-500 text-right">
              Last save: {new Date(saveMetadata.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
