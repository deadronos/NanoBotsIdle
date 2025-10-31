import { useState, useRef } from "react";
import { useGameStore } from "../../state/store";
import { hasSave, exportSave, getSaveMetadata, importSave } from "../../state/persistence";
import { SettingsPanel } from "./SettingsPanel";

export function TopBar() {
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const saveGame = useGameStore((s) => s.saveGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!snapshot) return null;

  const heatPercent = Math.floor(snapshot.heatRatio * 100);
  const heatColor =
    heatPercent > 150 ? "text-red-600" :
    heatPercent > 120 ? "text-red-500" :
    heatPercent > 100 ? "text-red-400" : 
    heatPercent > 80 ? "text-orange-400" : 
    heatPercent > 50 ? "text-yellow-400" : "text-green-400";
  const heatBgColor =
    heatPercent > 150
      ? "bg-red-900/50"
      : heatPercent > 120
        ? "bg-red-900/40"
        : heatPercent > 100
          ? "bg-red-900/30"
          : heatPercent > 80
            ? "bg-orange-900/30"
            : heatPercent > 50
              ? "bg-yellow-900/30"
              : "bg-green-900/30";

  // Critical heat warning
  const isCriticalHeat = heatPercent > 100;
  const isCascadeFailure = heatPercent > 150;

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
    <>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-2 border-nano-cyan-600/30 px-8 py-4 shadow-lg fade-in backdrop-blur-sm">
        <div className="flex items-center justify-between gap-8">
          <div className="text-3xl font-extrabold bg-gradient-to-r from-nano-cyan-400 via-nano-emerald-400 to-nano-cyan-500 bg-clip-text text-transparent transition-smooth hover:scale-105 cursor-default drop-shadow-lg">
            NanoFactory Evolution
          </div>

        <div className="flex items-center gap-8">
          {/* Heat */}
          <div className="flex flex-col transition-smooth bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 hover:border-orange-500/50">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Heat</div>
            <div className={`text-xl font-bold ${heatColor} ${isCriticalHeat ? 'animate-pulse' : 'transition-smooth'}`}>
              {Math.floor(snapshot.heatCurrent)} / {snapshot.heatSafeCap}
              <span className="text-sm ml-1">({heatPercent}%)</span>
            </div>
            {/* Heat efficiency indicator */}
            <div className={`text-xs font-medium ${heatColor} ${heatBgColor} px-2 py-0.5 rounded-full mt-1 transition-all duration-500`}>
              Efficiency: {heatPenalty}%
            </div>
            {/* Critical heat warning */}
            {isCascadeFailure && (
              <div className="text-xs text-red-400 font-bold animate-pulse fade-in">
                ⚠️ CASCADE FAILURE
              </div>
            )}
            {isCriticalHeat && !isCascadeFailure && (
              <div className="text-xs text-orange-400 font-bold fade-in">
                ⚠️ CRITICAL HEAT
              </div>
            )}
          </div>

          {/* Power */}
          <div className="flex flex-col transition-smooth bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 hover:border-nano-cyan-500/50">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Power</div>
            <div className="text-xl font-bold text-nano-cyan-400 transition-smooth">
              {Math.floor(snapshot.powerDemand)} / {snapshot.powerAvailable}
            </div>
          </div>

          {/* Throughput */}
          <div className="flex flex-col transition-smooth bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 hover:border-nano-purple-500/50">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Throughput</div>
            <div className="text-xl font-bold text-nano-purple-400 transition-smooth">
              {snapshot.throughput.toFixed(1)} <span className="text-sm font-normal">atoms/s</span>
            </div>
          </div>

          {/* Projected Shards */}
          <div className="flex flex-col transition-smooth bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 hover:border-nano-amber-500/50">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projected Shards</div>
            <div className="text-xl font-bold text-nano-amber-400 transition-smooth">
              {Math.floor(snapshot.projectedShards)}
            </div>
          </div>

          {/* Time */}
          <div className="flex flex-col transition-smooth bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 hover:border-slate-600/50">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</div>
            <div className="text-xl font-bold text-slate-300 transition-smooth">
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
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-smooth hover-lift button-press shadow-md ${
                saveStatus === "saved"
                  ? "bg-nano-emerald-600 text-white shadow-glow-emerald"
                  : saveStatus === "error"
                    ? "bg-red-600 text-white"
                    : "bg-nano-cyan-600 hover:bg-nano-cyan-500 text-white"
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
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-smooth hover-lift button-press shadow-md ${
                  loadStatus === "loaded"
                    ? "bg-nano-emerald-600 text-white shadow-glow-emerald"
                    : loadStatus === "error"
                      ? "bg-red-600 text-white"
                      : "bg-nano-emerald-600 hover:bg-nano-emerald-500 text-white"
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
              className="px-4 py-2 text-sm font-semibold bg-nano-purple-600 hover:bg-nano-purple-500 text-white rounded-lg transition-smooth hover-lift button-press shadow-md"
              title="Export Save to File"
              disabled={!hasSave()}
            >
              📤 Export
            </button>
            <button
              onClick={handleImportClick}
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-smooth hover-lift button-press shadow-md"
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
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-smooth hover-lift button-press shadow-md"
              title="Audio Settings"
            >
              ⚙️ Settings
            </button>
          </div>
          {saveMetadata && (
            <div className="text-xs text-slate-400 text-right transition-smooth">
              Last save: {new Date(saveMetadata.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
