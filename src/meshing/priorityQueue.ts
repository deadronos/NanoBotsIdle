export class PriorityQueue<T> {
  private heap: { value: T; index: number }[] = [];
  private orderCounter = 0;
  private readonly compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  push(value: T): void {
    const node = { value, index: this.orderCounter++ };
    this.heap.push(node);
    this.siftUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const root = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return root?.value;
  }

  peek(): T | undefined {
    return this.heap[0]?.value;
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  clear(): void {
    this.heap = [];
    this.orderCounter = 0;
  }

  /**
   * Finds the "maximum" element in the queue (the one that would be popped last).
   * In the context of a min-heap, this is the element with the "worst" priority.
   * Stability is respected: if priorities are equal, the one inserted latest is considered "greater".
   * @param filter Optional predicate to consider only elements matching a condition.
   */
  findMax(filter?: (item: T) => boolean): T | undefined {
    if (this.heap.length === 0) return undefined;

    let maxNode: { value: T; index: number } | undefined = undefined;

    // If we have a filter, we must scan the entire heap because the "valid max" could be anywhere.
    // If no filter, we could optimize by scanning only leaves, but scanning all is simpler and safer O(N).
    // Given this is likely used for "queue full" logic (exceptional case or steady state saturation), O(N) is acceptable.

    for (const node of this.heap) {
      if (filter && !filter(node.value)) continue;

      if (!maxNode || this.less(maxNode, node)) {
        maxNode = node;
      }
    }

    return maxNode?.value;
  }

  private less(a: { value: T; index: number }, b: { value: T; index: number }): boolean {
    const cmp = this.compare(a.value, b.value);
    if (cmp !== 0) return cmp < 0;
    return a.index < b.index;
  }

  private siftUp(index: number): void {
    let i = index;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.less(this.heap[parent], this.heap[i])) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  private siftDown(index: number): void {
    let i = index;
    const n = this.heap.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;

      if (left < n && this.less(this.heap[left], this.heap[smallest])) {
        smallest = left;
      }
      if (right < n && this.less(this.heap[right], this.heap[smallest])) {
        smallest = right;
      }
      if (smallest === i) break;

      this.swap(i, smallest);
      i = smallest;
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}
