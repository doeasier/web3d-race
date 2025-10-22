import { describe, it, expect, vi } from 'vitest';
import { PhysicsAdapter } from '../../src/world/PhysicsAdapter';

class RapierMock {
  added: any[] = [];
  removed: any[] = [];
  addStaticBox(pos: any, dims: any) { const id = this.added.length; this.added.push({ pos, dims }); return id; }
  removeStaticBox(id: number) { this.removed.push(id); }
}

describe('PhysicsAdapter Rapier mock', () => {
  it('uses Rapier-like addStaticBox/removeStaticBox when available', () => {
    const rap = new RapierMock();
    const pa = new PhysicsAdapter(rap as any);
    const h = pa.ensure({ id: 'r1', z: 10, lateral: 0, y: 0, scale: 2 });
    expect(h).not.toBeNull();
    pa.remove('r1');
    expect(rap.removed.length).toBe(1);
  });
});
