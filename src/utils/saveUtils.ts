import { useGameStore } from "../store";

export const exportSave = () => {
  const state = useGameStore.getState();
  const saveData = {
    version: 1,
    date: new Date().toISOString(),
    data: state,
  };

  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `voxel-walker-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importSave = (file: File) => {
  return new Promise<void>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        // Validation / Migration could go here
        if (!json.data) throw new Error("Invalid save file format");

        // Merge imported state
        useGameStore.setState(json.data);
        resolve();
      } catch (err) {
        console.error("Failed to import save:", err);
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const resetGame = () => {
  localStorage.removeItem("voxel-walker-storage");
  window.location.reload();
};
