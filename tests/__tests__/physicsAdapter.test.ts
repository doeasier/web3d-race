import { describe, it, expect, vi } from 'vitest';
import { PhysicsAdapter } from '../../src/world/PhysicsAdapter';

class FakePhysics {
  bodies: any[] = [];
  addBody(b:any) { const id = this.bodies.length; this.bodies.push(b); return id; }
  removeBody(id:number) { this.bodies[id] = null; }
}

describe('PhysicsAdapter', () => {
  it('registers and removes a body in fake physics', () => {
    const phys = new FakePhysics();
    const pa = new PhysicsAdapter(phys as any);
    const handle = pa.ensure({ id: 't1', z: 10, lateral: 2, y: 0, scale: 1 });
    expect(handle).not.toBeNull();
    pa.remove('t1');
    // after removal, handle slot should be nullified in FakePhysics
    expect(phys.bodies[handle as number]).toBeNull();
  });
});
