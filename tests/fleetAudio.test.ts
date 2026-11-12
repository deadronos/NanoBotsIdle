import { describe, expect, it } from "vitest";

import { FleetAudioPolicy, getOutpostActivity } from "../src/utils/fleetAudio";

const listener = { x: 0, y: 0, z: 0 };
const post = { ...listener, id: "home", level: 1 };
const delivery = { ...listener, amount: 50 };

describe("fleet audio policy", () => {
  it("keeps idle and distant outposts silent and caps nearby congestion", () => {
    expect(getOutpostActivity(listener, [post])).toBe(0);
    expect(getOutpostActivity(listener, [{ ...post, x: 100, dockedCount: 10 }])).toBe(0);
    const one = { ...post, dockedCount: 1 };
    const crowded = { ...post, dockedCount: 500, queuedCount: 500 };
    expect(getOutpostActivity(listener, [one])).toBeGreaterThan(0);
    expect(getOutpostActivity(listener, [{ ...one, x: 15 }])).toBeLessThan(
      getOutpostActivity(listener, [one]),
    );
    expect(getOutpostActivity(listener, [crowded, crowded])).toBe(1);
  });

  it("groups deliveries and plays the first nearby payout once", () => {
    const policy = new FleetAudioPolicy();
    policy.addDeliveries(0, listener, [{ ...delivery, x: 100 }]);
    expect(policy.poll(700)).toBeNull();
    policy.addDeliveries(800, listener, [delivery]);
    policy.addDeliveries(1000, listener, [delivery]);
    expect(policy.poll(1300)).toBeNull();
    expect(policy.poll(1500)).toBe("firstDelivery");
    policy.addDeliveries(15000, listener, [delivery]);
    expect(policy.poll(15700)).toBeNull();
  });

  it("limits big payout cues across multiple bursts and drops pending audio on reset", () => {
    const policy = new FleetAudioPolicy();
    const large = Array.from({ length: 12 }, () => delivery);
    policy.addDeliveries(0, listener, large);
    expect(policy.poll(700)).toBe("firstDelivery");
    policy.addDeliveries(1000, listener, large);
    expect(policy.poll(1700)).toBeNull();
    policy.addDeliveries(15000, listener, large);
    expect(policy.poll(15700)).toBe("bigPayout");
    policy.addDeliveries(30000, listener, large);
    policy.clearPending();
    expect(policy.poll(31000)).toBeNull();
  });
});
