import { useGameStore } from "../../state/store";

interface ForkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForkModal({ isOpen, onClose }: ForkModalProps) {
  const forkPoints = useGameStore((s) => s.forkPoints);
  const forkCatalog = useGameStore((s) => s.forkCatalog);
  const acquiredModules = useGameStore((s) => s.acquiredModules);
  const buyForkModule = useGameStore((s) => s.buyForkModule);
  const canPurchaseModule = useGameStore((s) => s.canPurchaseModule);
  const hasModule = useGameStore((s) => s.hasModule);
  const forkProcess = useGameStore((s) => s.forkProcess);
  const world = useGameStore((s) => s.world);

  if (!isOpen) return null;

  const droneCount = Object.keys(world.droneBrain).length;
  const canFork = droneCount > 0;
  const earnedPoints = Math.max(1, Math.floor(droneCount / 3));

  const handlePurchase = (moduleId: string) => {
    buyForkModule(moduleId);
  };

  const handleFork = () => {
    if (canFork) {
      forkProcess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border-2 border-purple-500 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-purple-400 mb-2">Fork Process</h2>
          <div className="flex items-center justify-between mb-2">
            <p className="text-neutral-400">
              Evolve your swarm by purchasing behavior modules
            </p>
            <div className="text-lg font-bold text-purple-400">
              {forkPoints} Fork Points
            </div>
          </div>
          
          {/* Fork Action */}
          {canFork && (
            <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-300">
                  Sacrifice {droneCount} drones to gain {earnedPoints} Fork Point{earnedPoints !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={handleFork}
                  className="px-4 py-2 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                >
                  FORK NOW
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Module Grid */}
        <div className="space-y-3 mb-4">
          {forkCatalog.map((module) => {
            const isPurchased = hasModule(module.id);
            const canPurchase = canPurchaseModule(module.id);
            const canAfford = forkPoints >= module.cost.amount;

            return (
              <div
                key={module.id}
                className={`border rounded-lg p-4 ${
                  isPurchased
                    ? "bg-purple-900/30 border-purple-600"
                    : canPurchase
                      ? "bg-neutral-800 border-neutral-700 hover:border-purple-500"
                      : "bg-neutral-800/50 border-neutral-800"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-semibold ${
                          isPurchased
                            ? "text-purple-400"
                            : canPurchase
                              ? "text-white"
                              : "text-neutral-500"
                        }`}
                      >
                        {module.name}
                      </h3>
                      {isPurchased && (
                        <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                          ACQUIRED
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm mt-1 ${
                        isPurchased ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {module.desc}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-2">
                    <div
                      className={`text-sm font-bold ${
                        canAfford ? "text-purple-400" : "text-neutral-500"
                      }`}
                    >
                      {module.cost.amount} FP
                    </div>
                    {!isPurchased && (
                      <button
                        onClick={() => handlePurchase(module.id)}
                        disabled={!canPurchase}
                        className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                          canPurchase
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                        }`}
                      >
                        Purchase
                      </button>
                    )}
                  </div>
                </div>
                {module.requires?.requiresModuleIds &&
                  module.requires.requiresModuleIds.length > 0 && (
                    <div className="text-xs text-neutral-500 mt-2">
                      Requires:{" "}
                      {module.requires.requiresModuleIds
                        .map(
                          (reqId) =>
                            forkCatalog.find((m) => m.id === reqId)?.name || reqId
                        )
                        .join(", ")}
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {acquiredModules.length > 0 && (
          <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-3 mb-4">
            <div className="text-sm text-purple-300">
              Active Modules: {acquiredModules.length}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 rounded-lg font-semibold bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
