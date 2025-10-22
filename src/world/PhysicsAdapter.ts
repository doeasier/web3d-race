// Simple PhysicsAdapter skeleton
// Responsibilities:
// - Accept an IPhysicsWorld-like object and register simple collision bodies for interactive RoadObjectDesc
// - Track handles and remove when not needed

export type PhysicsHandle = number;

export class PhysicsAdapter {
  private physics: any = null;
  private handles: Map<string, PhysicsHandle> = new Map();

  constructor(physics?: any) {
    if (physics) this.init(physics);
  }

  init(physics: any) {
    this.physics = physics;
  }

  // Ensure a descriptor is registered; returns handle or null
  ensure(desc: { id?: string; z?: number; lateral?: number; y?: number; collision?: any; scale?: number }): PhysicsHandle | null {
    if (!this.physics) return null;
    const id = desc.id || (`obj-${desc.z}-${desc.lateral}`);
    if (this.handles.has(id)) return this.handles.get(id) as PhysicsHandle;

    // create a simple box or sphere depending on desc.collision
    const hx = desc.scale ?? 1;
    const hy = (desc.scale ?? 1) * 1.5;
    const hz = desc.scale ?? 1;
    const pos = { x: desc.lateral ?? 0, y: desc.y ?? 0, z: desc.z ?? 0 };
    try {
      if (this.physics && typeof this.physics.addBody === 'function') {
        // FakePhysicsWorld style API: addBody({ mass, position }) -> handle
        const body = { mass: 0, position: { x: pos.x, y: pos.y, z: pos.z }, shape: { type: 'box', halfExtents: [hx/2, hy/2, hz/2] } };
        const handle = (this.physics as any).addBody(body);
        this.handles.set(id, handle);
        return handle;
      }
      // Rapier-like wrapper: prefer addStaticBox, then addStaticTrimesh
      if (this.physics && typeof (this.physics as any).addStaticBox === 'function') {
        const handle = (this.physics as any).addStaticBox(pos, [hx, hy, hz]);
        this.handles.set(id, handle);
        return handle;
      }
      if (this.physics && typeof (this.physics as any).addStaticTrimesh === 'function') {
        // Build a simple box mesh data for trimesh API if needed
        if (typeof (this.physics as any).addStaticTrimesh === 'function') {
          const vb = new Float32Array([pos.x - hx/2, pos.y - hy/2, pos.z - hz/2]);
          const ib = new Uint32Array([0]);
          const handle = (this.physics as any).addStaticTrimesh(vb, ib);
          this.handles.set(id, handle);
          return handle;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  remove(descId: string) {
    if (!this.physics) return;
    const h = this.handles.get(descId);
    if (h == null) return;
    try {
      if (this.physics && typeof (this.physics as any).removeBody === 'function') {
        (this.physics as any).removeBody(h);
      } else if (this.physics && typeof (this.physics as any).removeStaticBox === 'function') {
        (this.physics as any).removeStaticBox(h);
      } else if (this.physics && typeof (this.physics as any).removeStaticTrimesh === 'function') {
        (this.physics as any).removeStaticTrimesh(h);
      }
    } catch (e) {}
    this.handles.delete(descId);
  }

  clear() {
    for (const id of Array.from(this.handles.keys())) this.remove(id);
  }
}
