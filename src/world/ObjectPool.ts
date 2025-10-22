// ObjectPool helper to track capacities per key and manage free slot allocation for instanced meshes.
export class ObjectPool {
  private caps: Map<string, number> = new Map();
  private freeLists: Map<string, number[]> = new Map();
  private inUse: Map<string, Set<number>> = new Map();
  private lastUsed: Map<string, Map<number, number>> = new Map();
  private tick = 1;
  private maxCaps: Map<string, number | null> = new Map();

  // ensureCapacity will grow capacity up to an optional maxCapacity for the key
  ensureCapacity(key: string, required: number, maxCapacity: number | null = null): number {
    const cur = this.caps.get(key) || 0;
    const maxCap = maxCapacity ?? this.maxCaps.get(key) ?? null;
    if (maxCapacity !== null) this.maxCaps.set(key, maxCapacity);
    if (cur >= required) return cur;
    let next = Math.max(required, cur * 2 || 1);
    if (maxCap !== null) next = Math.min(next, maxCap);
    // if still less than required, set to required (if allowed)
    if (next < required) next = required;
    this.caps.set(key, next);
    // initialize free list for new slots
    const free = this.freeLists.get(key) || [];
    for (let i = cur; i < next; i++) free.push(i);
    this.freeLists.set(key, free);
    if (!this.inUse.has(key)) this.inUse.set(key, new Set());
    if (!this.lastUsed.has(key)) this.lastUsed.set(key, new Map());
    return next;
  }

  // allocate n slots for key, returns array of indices (may be less than requested if capacity insufficient)
  allocate(key: string, n: number): number[] {
    const cap = this.caps.get(key) || 0;
    if (cap === 0) return [];
    const free = this.freeLists.get(key) || [];
    const inUseSet = this.inUse.get(key) || new Set();
    const lastMap = this.lastUsed.get(key) || new Map();
    const out: number[] = [];
    // first use free slots
    while (out.length < n && free.length > 0) {
      const idx = free.pop() as number;
      out.push(idx);
      inUseSet.add(idx);
      lastMap.set(idx, this.tick++);
    }
    // if still need slots, try to reuse least recently used in-use slots
    if (out.length < n) {
      // collect candidates among inUse that are not in out
      const candidates: number[] = [];
      for (const idx of inUseSet) {
        if (!out.includes(idx)) candidates.push(idx);
      }
      // sort by lastUsed ascending (oldest first)
      candidates.sort((a, b) => (lastMap.get(a) || 0) - (lastMap.get(b) || 0));
      for (const idx of candidates) {
        if (out.length >= n) break;
        out.push(idx);
        // update lastUsed
        lastMap.set(idx, this.tick++);
      }
    }
    this.inUse.set(key, inUseSet);
    this.lastUsed.set(key, lastMap);
    return out;
  }

  // release previously allocated indices back into free list
  release(key: string, indices: number[]) {
    if (!indices || indices.length === 0) return;
    const free = this.freeLists.get(key) || [];
    const inUseSet = this.inUse.get(key) || new Set();
    const lastMap = this.lastUsed.get(key) || new Map();
    for (const idx of indices) {
      if (inUseSet.has(idx)) {
        inUseSet.delete(idx);
        lastMap.delete(idx);
        if (!free.includes(idx)) free.push(idx);
      }
    }
    this.freeLists.set(key, free);
    this.inUse.set(key, inUseSet);
    this.lastUsed.set(key, lastMap);
  }

  // return current capacity for key
  capacity(key: string) {
    return this.caps.get(key) || 0;
  }

  clear() {
    this.caps.clear();
    this.freeLists.clear();
    this.inUse.clear();
    this.lastUsed.clear();
    this.maxCaps.clear();
  }
}
