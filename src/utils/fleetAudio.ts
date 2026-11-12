import type { DepositEvent, OutpostSnapshot } from "../shared/protocol";

type Point = Pick<DepositEvent, "x" | "y" | "z">;
export type DeliveryCue = "firstDelivery" | "bigPayout";

const nearDistanceSquared = 6 ** 2;
const farDistanceSquared = 32 ** 2;
const burstMs = 650;
const cueCooldownMs = 12_000;
const bigPayout = 500;

const proximity = (listener: Point, source: Point): number => {
  const distanceSquared =
    (listener.x - source.x) ** 2 + (listener.y - source.y) ** 2 + (listener.z - source.z) ** 2;
  const fade = Math.max(
    0,
    Math.min(
      1,
      (farDistanceSquared - distanceSquared) / (farDistanceSquared - nearDistanceSquared),
    ),
  );
  return fade * fade;
};

/** Use the strongest nearby outpost so adding a second one never stacks voices. */
export const getOutpostActivity = (listener: Point, outposts: OutpostSnapshot[]): number => {
  let activity = 0;
  for (const outpost of outposts) {
    const docked = outpost.dockedCount ?? 0;
    const queued = outpost.queuedCount ?? 0;
    if (docked === 0 && queued === 0) continue;
    const load = Math.min(1, 0.22 + docked * 0.16 + queued * 0.05);
    activity = Math.max(activity, load * proximity(listener, outpost));
  }
  return activity;
};

export class FleetAudioPolicy {
  private deadline = Infinity;
  private amount = 0;
  private nextCueAt = -Infinity;
  private heardFirstDelivery = false;

  addDeliveries(now: number, listener: Point, events: DepositEvent[]): void {
    if (now < this.nextCueAt) return;
    for (const event of events) {
      if (event.amount <= 0 || proximity(listener, event) < 0.15) continue;
      if (this.amount === 0) this.deadline = now + burstMs;
      this.amount += event.amount;
    }
  }

  poll(now: number): DeliveryCue | null {
    if (now < this.deadline) return null;
    const amount = this.amount;
    this.clearPending();
    if (this.heardFirstDelivery && amount < bigPayout) return null;
    const cue = this.heardFirstDelivery ? "bigPayout" : "firstDelivery";
    this.heardFirstDelivery = true;
    this.nextCueAt = now + cueCooldownMs;
    return cue;
  }

  clearPending(): void {
    this.deadline = Infinity;
    this.amount = 0;
  }
}
