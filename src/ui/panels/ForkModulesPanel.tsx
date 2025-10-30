import { useGameStore } from "../../state/store";
import { ForkModule } from "../../types/forkModules";

interface ForkModuleCardProps {
  module: ForkModule;
}

function ForkModuleCard({ module }: ForkModuleCardProps) {
  const acquiredModules = useGameStore((s) => s.acquiredModules);
  const canPurchaseForkModule = useGameStore((s) => s.canPurchaseForkModule);
  const purchaseForkModule = useGameStore((s) => s.purchaseForkModule);

  const isPurchased = acquiredModules.includes(module.id);
  const check = canPurchaseForkModule(module.id);

  let bgColor = "bg-neutral-800";
  let textColor = "text-neutral-400";
  let borderColor = "border-neutral-700";

  if (isPurchased) {
    bgColor = "bg-purple-900/30";
    textColor = "text-purple-400";
    borderColor = "border-purple-600";
  } else if (check.canPurchase) {
    bgColor = "bg-neutral-800 hover:bg-neutral-700";
    textColor = "text-white";
    borderColor = "border-purple-500";
  }

  return (
    <div
      className={`border ${borderColor} ${bgColor} rounded-lg p-4 transition-colors`}
    >
      {/* Module name and status */}
      <div className="flex items-start justify-between mb-2">
        <h4 className={`font-semibold text-lg ${textColor}`}>
          {isPurchased && "✓ "}
          {module.name}
        </h4>
        <div className="text-xs bg-neutral-700 px-2 py-1 rounded">
          {module.cost.amount} FP
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-neutral-400 mb-4">{module.desc}</p>

      {/* Purchase button or status */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-500">
          {module.requires.requiresModuleIds.length > 0 && (
            <div>Requires: {module.requires.requiresModuleIds.length} module(s)</div>
          )}
        </div>

        {isPurchased ? (
          <div className="text-purple-400 font-semibold text-sm">ACTIVE</div>
        ) : (
          <button
            onClick={() => purchaseForkModule(module.id)}
            disabled={!check.canPurchase}
            className={`px-4 py-2 rounded font-semibold transition-colors text-sm ${
              check.canPurchase
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
            }`}
            title={check.reason || "Purchase module"}
          >
            Purchase
          </button>
        )}
      </div>

      {/* Error message */}
      {!isPurchased && !check.canPurchase && check.reason && (
        <div className="text-xs text-red-400 mt-2">
          {check.reason}
        </div>
      )}
    </div>
  );
}

interface ForkModulesPanelProps {
  onClose: () => void;
}

export function ForkModulesPanel({ onClose }: ForkModulesPanelProps) {
  const forkPoints = useGameStore((s) => s.forkPoints);
  const availableModules = useGameStore((s) => s.getAvailableForkModules());
  const acquiredModules = useGameStore((s) => s.acquiredModules);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
      <div className="bg-neutral-900 border-2 border-purple-500 rounded-lg w-full max-w-5xl max-h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-purple-400">Fork Behavior Modules</h2>
            <p className="text-sm text-neutral-400 mt-1">
              Customize your swarm's behavior for this run
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-neutral-400">Available Fork Points</div>
              <div className="text-2xl font-bold text-purple-400">{forkPoints}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-400">Active Modules</div>
              <div className="text-2xl font-bold text-emerald-400">{acquiredModules.length}</div>
            </div>
            <button
              onClick={onClose}
              className="text-3xl text-neutral-400 hover:text-white transition-colors"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Module grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            {availableModules.map((module) => (
              <ForkModuleCard key={module.id} module={module} />
            ))}
          </div>
        </div>

        {/* Footer help text */}
        <div className="border-t border-neutral-800 px-6 py-3 bg-neutral-800/50">
          <p className="text-xs text-neutral-400">
            💡 Tip: Fork modules only affect the current run. Use Fork Points earned from Fork Process to purchase multiple modules and customize your strategy.
          </p>
        </div>
      </div>
    </div>
  );
}
