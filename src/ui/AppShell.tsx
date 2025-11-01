import { AIPanel } from "./panels/AIPanel";
import { BottomBar } from "./panels/BottomBar";
import { BuildPanel } from "./panels/BuildPanel";
import { TopBar } from "./panels/TopBar";
import { FactoryCanvas } from "./simview/FactoryCanvas";
import { HeatOverlay } from "./simview/overlays/HeatOverlay";
import { PowerOverlay } from "./simview/overlays/PowerOverlay";

export const AppShell = () => (
  <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
    <TopBar />

    <main className="flex flex-1 overflow-hidden">
      <aside className="hidden w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900/70 p-4 lg:block">
        <BuildPanel />
      </aside>

      <section className="relative flex-1 overflow-hidden">
        <FactoryCanvas />
        <HeatOverlay />
        <PowerOverlay />
      </section>

      <aside className="hidden w-80 flex-shrink-0 border-l border-slate-800 bg-slate-900/70 p-4 xl:block">
        <AIPanel />
      </aside>
    </main>

    <BottomBar />
  </div>
);
