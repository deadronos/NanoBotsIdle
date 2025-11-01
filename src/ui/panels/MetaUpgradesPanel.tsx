import { useGameStore } from "../../state/store";
import { MetaUpgrade } from "../../types/metaUpgrades";
import DraggableModal from "../components/DraggableModal";

interface UpgradeTreeProps {
  title: string;
  treeKey: "swarmCognition" | "bioStructure" | "compilerOptimization";
  color: string;
}

function UpgradeTree({ title, treeKey, color }: UpgradeTreeProps) {
  const upgrades = useGameStore((s) => s.getAvailableUpgrades(treeKey));
  const purchasedUpgrades = useGameStore((s) => s.purchasedUpgrades);
  const totalPrestiges = useGameStore((s) => s.totalPrestiges);
  const canPurchaseUpgrade = useGameStore((s) => s.canPurchaseUpgrade);
  const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);

  const getUpgradeState = (upgrade: MetaUpgrade): "purchased" | "available" | "locked" => {
    if (purchasedUpgrades.includes(upgrade.id)) return "purchased";
    
    const check = canPurchaseUpgrade(upgrade.id);
    return check.canPurchase ? "available" : "locked";
  };

  return (
    <div className="flex-1 border border-neutral-700 rounded-lg p-4">
      <h3 className={`text-xl font-bold mb-4 ${color}`}>{title}</h3>
      
      <div className="space-y-3">
        {upgrades.map((upgrade, index) => {
          const state = getUpgradeState(upgrade);
          const check = canPurchaseUpgrade(upgrade.id);
          
          let bgColor = "bg-neutral-800";
          let textColor = "text-neutral-400";
          let borderColor = "border-neutral-700";
          
          if (state === "purchased") {
            bgColor = "bg-green-900/30";
            textColor = "text-green-400";
            borderColor = "border-green-600";
          } else if (state === "available") {
            bgColor = "bg-neutral-800 hover:bg-neutral-700";
            textColor = "text-white";
            borderColor = "border-amber-500";
          }
          
          return (
            <div
              key={upgrade.id}
              className={`border ${borderColor} ${bgColor} rounded p-3 transition-colors relative`}
            >
              {/* Tier indicator */}
              <div className="absolute top-2 right-2 text-xs text-neutral-500">
                Tier {index + 1}
              </div>
              
              {/* Upgrade name and status */}
              <div className="flex items-start justify-between mb-2">
                <h4 className={`font-semibold ${textColor}`}>
                  {state === "purchased" && "✓ "}
                  {upgrade.name}
                </h4>
              </div>
              
              {/* Description */}
              <p className="text-sm text-neutral-400 mb-3">{upgrade.desc}</p>
              
              {/* Requirements and cost */}
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-1">
                  {upgrade.requires.minPrestiges > 0 && (
                    <div className={totalPrestiges >= upgrade.requires.minPrestiges ? "text-green-400" : "text-red-400"}>
                      Prestiges: {upgrade.requires.minPrestiges}
                    </div>
                  )}
                  {upgrade.requires.requiresUpgradeIds.length > 0 && (
                    <div className={upgrade.requires.requiresUpgradeIds.every(id => purchasedUpgrades.includes(id)) ? "text-green-400" : "text-red-400"}>
                      Requires previous tier
                    </div>
                  )}
                </div>
                
                {state !== "purchased" && (
                  <button
                    onClick={() => purchaseUpgrade(upgrade.id)}
                    disabled={!check.canPurchase}
                    className={`px-3 py-1 rounded font-semibold transition-colors ${
                      check.canPurchase
                        ? `${color.replace('text', 'bg')} hover:opacity-80 text-white`
                        : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                    }`}
                    title={check.reason || "Purchase upgrade"}
                  >
                    {upgrade.cost.amount} Shards
                  </button>
                )}
                
                {state === "purchased" && (
                  <div className="text-green-400 font-semibold">OWNED</div>
                )}
              </div>
              
              {/* Error message */}
              {state === "locked" && check.reason && (
                <div className="text-xs text-red-400 mt-2">
                  {check.reason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MetaUpgradesPanelProps {
  onClose: () => void;
}

export function MetaUpgradesPanel({ onClose }: MetaUpgradesPanelProps) {
  const compileShards = useGameStore((s) => s.compileShardsBanked);
  const totalPrestiges = useGameStore((s) => s.totalPrestiges);

  return (
    <DraggableModal
      onClose={onClose}
      // large modal
      maxWidthClass="max-w-7xl"
      maxHeightClass="max-h-[90vh]"
      title={(
        <div className="w-full flex items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-amber-400">Meta Upgrade Trees</h2>
            <p className="text-sm text-neutral-400 mt-1">Permanent upgrades that persist across runs</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-neutral-400">Available Shards</div>
              <div className="text-2xl font-bold text-amber-400">{Math.floor(compileShards)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-400">Total Prestiges</div>
              <div className="text-2xl font-bold text-emerald-400">{totalPrestiges}</div>
            </div>
          </div>
        </div>
      )}
    >
      <div className="flex gap-6 h-full">
        <UpgradeTree
          title="Swarm Cognition"
          treeKey="swarmCognition"
          color="text-purple-400"
        />
        <UpgradeTree
          title="Bio-Structure"
          treeKey="bioStructure"
          color="text-green-400"
        />
        <UpgradeTree
          title="Compiler Optimization"
          treeKey="compilerOptimization"
          color="text-blue-400"
        />
      </div>

      <div className="border-t border-neutral-800 px-6 py-3 bg-neutral-800/50 mt-4">
        <p className="text-xs text-neutral-400">
          💡 Tip: Upgrades unlock in tiers. Complete lower tiers and reach prestige milestones to unlock higher tiers.
        </p>
      </div>
    </DraggableModal>
  );
}
