import { useGameStore } from "../../state/store";

interface BuildOption {
  id: string;
  label: string;
  description: string;
}

const structureOptions: BuildOption[] = [
  { id: "extractor", label: "Extractor", description: "Harvests raw feedstock nodes." },
  { id: "assembler", label: "Assembler", description: "Combines parts into intermediate goods." },
  { id: "fabricator", label: "Fabricator", description: "Builds advanced drones and modules." },
  { id: "cooler", label: "Cooler", description: "Dissipates excess thermal load." },
  { id: "storage", label: "Storage", description: "Buffers materials for short-term demand." },
];

const upgrades: BuildOption[] = [
  { id: "tier", label: "Tier Upgrade", description: "Boosts production throughput for a building." },
  { id: "throughput", label: "Throughput Boost", description: "Increase logistics capacity temporarily." },
];

const PanelSection = ({ title, items }: { title: string; items: BuildOption[] }) => (
  <section className="space-y-2">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
      {title}
    </h2>
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-left transition hover:border-slate-500 hover:bg-slate-800/70"
          onClick={() =>
            console.warn("[BuildPanel] build action not yet implemented", item.id)
          }
        >
          <div className="text-sm font-semibold text-slate-50">{item.label}</div>
          <div className="text-xs text-slate-400">{item.description}</div>
        </button>
      ))}
    </div>
  </section>
);

export const BuildPanel = () => {
  const forkPoints = useGameStore((state) => state.forkPoints);

  return (
    <div className="flex h-full flex-col gap-6">
      <header className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
        <div className="text-sm font-semibold text-slate-100">Build Controls</div>
        <div>Fork points available: {forkPoints}</div>
      </header>

      <PanelSection title="Structures" items={structureOptions} />
      <PanelSection title="Upgrades" items={upgrades} />
    </div>
  );
};
