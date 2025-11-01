import { useEffect } from "react";

import { AppShell } from "./ui/AppShell";
import { startSimulation, stopSimulation } from "./sim/simLoop";
import { AutoSaver } from "./state/saveManager";
import { useGameStore } from "./state/store";
import { ToastProvider } from "./ui/ToastProvider";

const App = () => {
  useEffect(() => {
    startSimulation();
    const autosaver = new AutoSaver(() => useGameStore.getState(), 30000);
    autosaver.start();
    return () => {
      stopSimulation();
      autosaver.stop();
    };
  }, []);

  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
};

export default App;
