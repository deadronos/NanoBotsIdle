import type { GameStats } from "../../game/store";
import { type BlockId, blockIdToName } from "../../voxel/World";
import { timeLabel } from "../utils";

type StatsPanelProps = {
  stats: GameStats;
  targetBlock: BlockId | null;
};

export default function StatsPanel({ stats, targetBlock }: StatsPanelProps) {
  return (
    <div className="panel top-left">
      <div className="title">Voxel Frontier</div>
      <div className="subtitle">Nanobots Idle - single-player survival sandbox</div>
      <div className="stats-grid">
        <div>FPS</div>
        <div>{stats.fps}</div>
        <div>Pos</div>
        <div>
          {stats.position.x.toFixed(1)}, {stats.position.y.toFixed(1)},{" "}
          {stats.position.z.toFixed(1)}
        </div>
        <div>Chunks</div>
        <div>{stats.chunkCount}</div>
        <div>Time</div>
        <div>{timeLabel(stats.timeOfDay)}</div>
        <div>Target</div>
        <div>{targetBlock != null ? blockIdToName(targetBlock) : "None"}</div>
      </div>
    </div>
  );
}
