import { DRONE_STATE_ID } from "../shared/droneState";
import { type MiningZone, outpostRouteScore } from "../shared/miningOperations";
import type { OutpostSnapshot, RenderDelta } from "../shared/protocol";

export const canPreviewOutpost = (
  site: MiningZone,
  waterLevel: number,
  outposts: OutpostSnapshot[],
) =>
  site.y > waterLevel &&
  !outposts.some((outpost) => Math.hypot(outpost.x - site.x, outpost.z - site.z) < 4);

export const estimateOutpost = (site: MiningZone, delta: RenderDelta | undefined) => {
  const redirected: number[] = [];
  let blocksSaved = 0;
  const positions = delta?.entities;
  const outposts = delta?.outposts;
  if (!positions || !outposts?.length) return { diverted: 0, blocksSaved, redirected };

  for (let i = 0; i < positions.length; i += 3) {
    const state = delta.entityStates?.[i / 3];
    if (state === DRONE_STATE_ID.QUEUING || state === DRONE_STATE_ID.DEPOSITING) continue;
    const approachHeight = delta.entityRoles?.[i / 3] === 1 ? 4 : 2;
    const targets = delta.entityTargets;
    const useTarget = targets && Number.isFinite(targets[i]) && delta.entityRoles?.[i / 3] !== 1;
    const x = useTarget ? targets[i] : positions[i];
    const y = useTarget ? targets[i + 1] + 2 : positions[i + 1];
    const z = useTarget ? targets[i + 2] : positions[i + 2];
    let bestScore = Infinity;
    let currentDistance = 0;
    for (const outpost of outposts) {
      const distance = Math.hypot(outpost.x - x, outpost.y - y, outpost.z - z);
      const score = outpostRouteScore(distance, outpost.dockedCount ?? 0, outpost.queuedCount ?? 0);
      if (score < bestScore) {
        bestScore = score;
        currentDistance = Math.hypot(outpost.x - x, outpost.y + approachHeight - y, outpost.z - z);
      }
    }
    const candidateDistance = Math.hypot(site.x - x, site.y - y, site.z - z);
    if (candidateDistance < bestScore) {
      redirected.push(i / 3);
      blocksSaved +=
        currentDistance - Math.hypot(site.x - x, site.y + approachHeight - y, site.z - z);
    }
  }
  return { diverted: redirected.length, blocksSaved: Math.round(blocksSaved), redirected };
};
