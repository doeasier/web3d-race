import { describe, it, expect } from 'vitest';
import { RoadsideSpawner } from '../../src/world/RoadsideSpawner';

describe('RoadsideSpawner', () => {
  it('generates deterministic descriptors with same seed', () => {
    const preset = { id: 'p', densityPerSegment: 4, spawnerDefaults: { seed: 123 } };
    const sp1 = new RoadsideSpawner(preset as any, [], { seed: 123, segmentLength: 50, numSegments: 12 });
    const sp2 = new RoadsideSpawner(preset as any, [], { seed: 123, segmentLength: 50, numSegments: 12 });
    sp1.update(120);
    sp2.update(120);
    const a = sp1.getActiveDescs();
    const b = sp2.getActiveDescs();
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toEqual(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].z).toBeCloseTo(b[i].z, 5);
      expect(a[i].lateral).toBeCloseTo(b[i].lateral, 5);
    }
  });
});
