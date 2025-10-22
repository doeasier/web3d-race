// Minimal RoadsideSpawner skeleton
// Responsibilities:
// - Accept an environment preset and spawner rules
// - Produce deterministic RoadObjectDesc[] for a given worldZ window

export type RoadObjectDesc = {
  id?: string;
  type: string;
  z: number;
  lateral?: number;
  y?: number;
  rotY?: number;
  scale?: number;
  interactive?: boolean;
  collision?: 'box'|'sphere'|null;
  lodBias?: number;
};

export type EnvironmentPreset = {
  id: string;
  densityPerSegment?: number;
  lod?: { near?: number; mid?: number; far?: number };
  spawnerDefaults?: { seed?: number };
};

export type SpawnerRule = {
  type: string;
  density?: number; // 0..1 relative
  side?: 'left'|'right'|'both';
  minGap?: number; // meters
};

// simple deterministic RNG (mulberry32)
function makeRng(seed: number) {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}

export class RoadsideSpawner {
  private preset: EnvironmentPreset;
  private rules: SpawnerRule[];
  private seed: number;
  private segmentLength: number = 50;
  private numSegments: number = 12;
  private windowSegments: number = 6; // lookahead/back

  private activeDescs: RoadObjectDesc[] = [];
  private baked: RoadObjectDesc[] | null = null;

  constructor(preset?: EnvironmentPreset, rules?: SpawnerRule[], opts?: { seed?: number, segmentLength?: number, numSegments?: number }) {
    this.preset = preset || { id: 'default', densityPerSegment: 4, spawnerDefaults: { seed: 1337 } };
    this.rules = rules || [];
    this.seed = opts?.seed ?? (this.preset.spawnerDefaults && this.preset.spawnerDefaults.seed) ?? 1337;
    if (opts?.segmentLength) this.segmentLength = opts.segmentLength;
    if (opts?.numSegments) this.numSegments = opts.numSegments;
  }

  // Load baked list (optional)
  loadBaked(baked: RoadObjectDesc[]) {
    this.baked = baked;
  }

  // Update active descriptors for given worldZ (meters)
  update(worldZ: number) {
    if (this.baked) {
      // simple window filter
      const minZ = Math.max(0, worldZ - this.windowSegments * this.segmentLength);
      const maxZ = worldZ + this.windowSegments * this.segmentLength;
      this.activeDescs = this.baked.filter(d => d.z >= minZ && d.z <= maxZ);
      return;
    }

    const rng = makeRng(this.seed);
    const centerSeg = Math.floor(worldZ / this.segmentLength);
    const minSeg = Math.max(0, centerSeg - this.windowSegments);
    const maxSeg = centerSeg + this.windowSegments;
    const descs: RoadObjectDesc[] = [];
    for (let si = minSeg; si <= maxSeg; si++) {
      const baseZ = si * this.segmentLength;
      // density from preset (items per segment)
      const dps = this.preset.densityPerSegment ?? 4;
      // allow rules to modify density for type-specific generation
      if (this.rules.length === 0) {
        // generate generic foliage types
        for (let i = 0; i < dps; i++) {
          const offset = rng() * (this.segmentLength - 4) - (this.segmentLength/2 - 2);
          const z = baseZ + this.segmentLength/2 + offset;
          const lateral = (rng() - 0.5) * (this.preset.densityPerSegment ? 6 : 6);
          const scale = 0.8 + rng() * 0.8;
          const id = `auto-${si}-${i}`;
          descs.push({ id, type: 'tree:preset', z, lateral, y: 0, rotY: rng() * Math.PI * 2, scale, interactive: false });
        }
      } else {
        // per-rule generation
        for (const r of this.rules) {
          const count = Math.max(0, Math.round((r.density ?? 0.5) * (this.preset.densityPerSegment ?? 4)));
          for (let i = 0; i < count; i++) {
            const offset = rng() * (this.segmentLength - 4) - (this.segmentLength/2 - 2);
            const z = baseZ + this.segmentLength/2 + offset;
            const side = r.side ?? 'both';
            const lateral = (side === 'left') ? -2 - rng()*3 : (side === 'right' ? 2 + rng()*3 : (rng() < 0.5 ? -2 - rng()*3 : 2 + rng()*3));
            const scale = 0.7 + rng() * 0.9;
            const id = `${r.type}-${si}-${i}`;
            descs.push({ id, type: r.type, z, lateral, y: 0, rotY: rng() * Math.PI * 2, scale, interactive: false });
          }
        }
      }
    }
    // simple sort
    descs.sort((a,b)=>a.z - b.z);
    this.activeDescs = descs;
  }

  getActiveDescs(): RoadObjectDesc[] {
    return this.activeDescs.slice();
  }
}
