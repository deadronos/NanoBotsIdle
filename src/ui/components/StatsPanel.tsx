import type { GameStats } from "../../game/store";
import { type BlockId, blockIdToName } from "../../voxel/World";
import { timeLabel } from "../utils";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type StatsPanelProps = {
  stats: GameStats;
  targetBlock: BlockId | null;
};

export default function StatsPanel({ stats, targetBlock }: StatsPanelProps) {
  return (
    <Card className="pointer-events-auto absolute left-4 top-4 w-[min(380px,92vw)] border-white/10 bg-[var(--panel)]">
      <CardHeader className="space-y-1">
        <CardTitle className="font-display text-base uppercase tracking-[0.18em]">
          Voxel Frontier
        </CardTitle>
        <CardDescription className="text-xs">
          Nanobots Idle - single-player survival sandbox
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs">
        <div className="grid grid-cols-[80px,1fr] gap-x-3 gap-y-2">
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
          <div>
            {targetBlock != null ? (
              <Badge variant="secondary">{blockIdToName(targetBlock)}</Badge>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
