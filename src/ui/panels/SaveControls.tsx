import React, { useRef } from "react";
import { saveAll, loadAll, clearSaves, exportSave, importSave, applySaveToStore } from "../../state/saveManager";
import { useGameStore } from "../../state/store";
import { useToast } from "../ToastProvider";

const buttonBase =
  "rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold transition hover:border-slate-500 hover:text-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

export const SaveControls = () => {
  // Avoid subscribing to the entire store inside this component to prevent
  // excessive updates / infinite render loops. Use the store getter directly.
  const getState = useGameStore.getState;
  const fileInput = useRef<HTMLInputElement | null>(null);

  const handleSave = () => {
    const ok = saveAll(getState());
    if (ok) console.log("Game saved");
    else console.warn("Save failed");
  };

  const { push } = useToast();

  const handleLoad = async () => {
    const loaded = loadAll();
    if (!loaded) {
      push("No save found or failed to load", "warn");
      return;
    }

    // Apply loaded state to store safely
    const ok = await applySaveToStore();
    if (ok) push("Save loaded successfully", "success");
    else push("Failed to apply save to store", "error");
  };

  const handleClear = () => {
    if (!confirm("Clear saved data from localStorage?")) return;
    clearSaves();
    push("Saves cleared", "info");
  };

  const handleExport = () => {
    const str = exportSave();
    if (!str) {
      push("No save to export", "warn");
      return;
    }
    const blob = new Blob([str], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nanofactory-save.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCompressed = async () => {
    const compressed = exportCompressedSave();
    if (!compressed) {
      push("No save to export (compressed)", "warn");
      return;
    }
    try {
      await navigator.clipboard.writeText(compressed);
      push("Compressed save copied to clipboard", "success");
    } catch (e) {
      console.error(e);
      push("Failed to copy compressed save to clipboard", "error");
    }
  };

  const handleImportClick = () => {
    if (fileInput.current) fileInput.current.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const ok = importSave(text);
        if (ok) push("Save imported successfully", "success");
        else push("Import failed: invalid save", "error");
      } catch (err) {
        console.error(err);
        alert("Import failed");
      }
    };
    reader.readAsText(file);
    // clear input value so same file can be reselected
    e.currentTarget.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={buttonBase} onClick={handleSave}>
        Save
      </button>
      <button type="button" className={buttonBase} onClick={handleLoad}>
        Load
      </button>
      <button type="button" className={buttonBase} onClick={handleClear}>
        Clear
      </button>
      <button type="button" className={buttonBase} onClick={handleExport}>
        Export
      </button>
      <button type="button" className={buttonBase} onClick={handleExportCompressed}>
        Export Compressed (copy)
      </button>
      <button type="button" className={buttonBase} onClick={handleImportClick}>
        Import
      </button>
      <input ref={fileInput} type="file" accept="application/json" className="hidden" onChange={handleFile} />
    </div>
  );
};

export default SaveControls;
