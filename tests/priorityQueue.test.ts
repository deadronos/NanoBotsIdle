import { describe, expect, it } from "vitest";
import { PriorityQueue } from "../src/meshing/priorityQueue";

describe("PriorityQueue", () => {
  it("should maintain min-heap property", () => {
    const pq = new PriorityQueue<number>((a, b) => a - b);
    pq.push(5);
    pq.push(2);
    pq.push(8);
    pq.push(1);

    expect(pq.pop()).toBe(1);
    expect(pq.pop()).toBe(2);
    expect(pq.pop()).toBe(5);
    expect(pq.pop()).toBe(8);
    expect(pq.pop()).toBeUndefined();
  });

  it("should maintain stability for equal priorities", () => {
    const pq = new PriorityQueue<{ val: number; id: number }>((a, b) => a.val - b.val);
    pq.push({ val: 10, id: 1 });
    pq.push({ val: 10, id: 2 });
    pq.push({ val: 5, id: 3 });
    pq.push({ val: 10, id: 3 });

    expect(pq.pop()).toEqual({ val: 5, id: 3 });
    expect(pq.pop()).toEqual({ val: 10, id: 1 });
    expect(pq.pop()).toEqual({ val: 10, id: 2 });
    expect(pq.pop()).toEqual({ val: 10, id: 3 });
  });

  it("should find the max (worst) element correctly", () => {
    // Min-heap where 1 is best, 10 is worst
    const pq = new PriorityQueue<number>((a, b) => a - b);
    pq.push(5);
    pq.push(1);
    pq.push(10);
    pq.push(3);

    // Max element should be 10
    expect(pq.findMax()).toBe(10);

    pq.pop(); // pops 1
    // Queue: 3, 5, 10
    expect(pq.findMax()).toBe(10);

    pq.push(12);
    expect(pq.findMax()).toBe(12);
  });

  it("should break ties in findMax using stability (latest added is max)", () => {
    const pq = new PriorityQueue<{ val: number; id: number }>((a, b) => a.val - b.val);
    pq.push({ val: 10, id: 1 });
    pq.push({ val: 10, id: 2 });

    // Both have value 10. Max should be the one added latest (id 2).
    expect(pq.findMax()).toEqual({ val: 10, id: 2 });

    pq.push({ val: 10, id: 3 });
    expect(pq.findMax()).toEqual({ val: 10, id: 3 });
  });

  it("should find max with filter", () => {
    const pq = new PriorityQueue<number>((a, b) => a - b);
    pq.push(1);
    pq.push(5);
    pq.push(10);
    pq.push(2);

    // Find max (10)
    expect(pq.findMax()).toBe(10);

    // Find max that is even (should be 10)
    expect(pq.findMax(x => x % 2 === 0)).toBe(10);

    // Find max that is < 10 (should be 5)
    expect(pq.findMax(x => x < 10)).toBe(5);
  });

  it("should handle peek, size, isEmpty, clear", () => {
    const pq = new PriorityQueue<number>((a, b) => a - b);
    expect(pq.isEmpty()).toBe(true);
    expect(pq.size()).toBe(0);
    expect(pq.peek()).toBeUndefined();

    pq.push(5);
    expect(pq.isEmpty()).toBe(false);
    expect(pq.size()).toBe(1);
    expect(pq.peek()).toBe(5);

    pq.push(3);
    expect(pq.size()).toBe(2);
    expect(pq.peek()).toBe(3);

    pq.clear();
    expect(pq.isEmpty()).toBe(true);
    expect(pq.size()).toBe(0);
    expect(pq.peek()).toBeUndefined();
  });
});
