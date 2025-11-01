import { useEffect } from "react";

import { AppShell } from "./ui/AppShell";
import { startSimulation, stopSimulation } from "./sim/simLoop";

const App = () => {
  useEffect(() => {
    startSimulation();
    return () => {
      stopSimulation();
    };
  }, []);

  return <AppShell />;
};

export default App;
