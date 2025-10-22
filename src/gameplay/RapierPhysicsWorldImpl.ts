import type RAPIERType from '@dimforge/rapier3d-compat';

// Attempt to import Rapier and initialize with a wasm URL from public/
async function initRapier(wasmUrl: string) {
  try {
    const RAPIER = (await import('@dimforge/rapier3d-compat')) as typeof RAPIERType;
    // some builds export an async `init` that accepts the wasm url
    if ((RAPIER as any).init) {
      await (RAPIER as any).init(wasmUrl);
    }
    // expose to window for other modules that expect global RAPIER
    try { (window as any).RAPIER = RAPIER; } catch (e) {}
    return RAPIER;
  } catch (e) {
    console.error('Rapier dynamic import failed', e);
    return null;
  }
}

import { IPhysicsWorld, PhysicsBody, PhysicsHandle, Vec3, RaycastHit, Transform } from "../core/types";

export class RapierPhysicsWorldImpl implements IPhysicsWorld {
  world: any;
  colliders = new Map<number, any>();
  bodies = new Map<number, { body: any, handle: number, lastForce?: Vec3, lastApplied?: boolean, placeholder?: boolean, initialPosition?: Vec3 }>();
  next = 1;
  gravity: Vec3 = { x: 0, y: -9.81, z: 0 };
  private _ready = false;

  constructor(gravity: Vec3 = { x: 0, y: -9.81, z: 0 }) {
    (async () => {
      this.gravity = gravity;
      // Try to initialize Rapier with wasm from public/
      const wasmUrl = '/rapier_wasm_bg.wasm';
      const RAPIER = await initRapier(wasmUrl);
      if (RAPIER) {
        try {
          this.world = new (RAPIER as any).World({ x: gravity.x, y: gravity.y, z: gravity.z });
          this._ready = true;
          console.log('Rapier initialized');
          // migrate any placeholder bodies created before Rapier was ready
          for (const [id, rec] of Array.from(this.bodies.entries())) {
            if (rec.placeholder) {
              try {
                const pos = rec.initialPosition || { x: 0, y: 0, z: 0 };
                const rbDesc = (RAPIER as any).RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
                const rbody = this.world.createRigidBody(rbDesc);
                rec.body = rbody;
                rec.placeholder = false;
                // update map
                this.bodies.set(id, rec);
              } catch (e) {
                // leave placeholder if migration fails
              }
            }
          }
        } catch (e) {
          console.warn('Rapier init failed, falling back', e);
          this.world = null;
          this._ready = false;
        }
      } else {
        console.warn('Rapier is not available in this environment, falling back');
        this.world = null;
        this._ready = false;
      }

      if (!this.world) {
        // provide a minimal fallback API to avoid crashes
        this.world = {
          castRay: () => { },
          createRigidBody: () => ({ translation: () => ({ x: 0, y: 0, z: 0 }), rotation: () => ({ x: 0, y: 0, z: 0 }), applyForceToCenter: () => {}, setTranslation: () => {} }),
          removeRigidBody: () => { }
        };
      }
    })();
  }

  step(dt: number): void {
    if (this.world && this.world.step && this._ready) {
      this.world.timestep = dt;
      this.world.step();
    }
  }

  raycast(origin: Vec3, dir: Vec3, maxDist: number): RaycastHit | null {
    try {
      if (!(this.world && (this.world as any).castRay) || !this._ready) return null;
      const RAPIER = (window as any).RAPIER;
      const from = new RAPIER.Vector3(origin.x, origin.y, origin.z);
      const to = new RAPIER.Vector3(origin.x + dir.x * maxDist, origin.y + dir.y * maxDist, origin.z + dir.z * maxDist);
      let hit: RaycastHit | null = null;
      this.world.castRay(from, to, true, (entity: any, toi: any, normal: any) => {
        hit = { point: { x: from.x + dir.x * toi, y: from.y + dir.y * toi, z: from.z + dir.z * toi }, normal: { x: normal.x, y: normal.y, z: normal.z }, distance: toi };
        return false; // stop at first hit
      });
      return hit;
    } catch (e) {
      return null;
    }
  }

  addBody(body: PhysicsBody): PhysicsHandle {
    try {
      if (this.world && (this.world as any).createRigidBody && this._ready) {
        const RAPIER = (window as any).RAPIER;
        const rb = (RAPIER as any).RigidBodyDesc.dynamic().setTranslation(body.position.x, body.position.y, body.position.z);
        const handle = this.next++;
        const rbody = this.world.createRigidBody(rb);
        this.bodies.set(handle, { body: rbody, handle, placeholder: false, initialPosition: { ...body.position } });
        return handle;
      }
    } catch (e) {
      // ignore and fallback
    }
    // fallback simple id
    const id = this.next++;
    this.bodies.set(id, { body: { translation: () => ({ x: body.position.x, y: body.position.y, z: body.position.z }), rotation: () => ({ x: 0, y: 0, z: 0 }) }, handle: id, placeholder: true, initialPosition: { ...body.position } });
    return id;
  }

  removeBody(handle: PhysicsHandle): void {
    const rec = this.bodies.get(handle);
    if (rec) {
      if (this.world && (this.world as any).removeRigidBody && this._ready) (this.world as any).removeRigidBody(rec.body);
      this.bodies.delete(handle);
    }
  }

  setGravity(g: Vec3): void {
    this.gravity = g;
    try {
      if (this.world && (this.world as any).setGravity && this._ready) (this.world as any).setGravity(g);
    } catch (e) { }
  }

  applyForce(handle: PhysicsHandle, force: Vec3): void {
    const rec = this.bodies.get(handle as number);
    if (!rec) return;
    // build vector if possible
    const RAPIER = (window as any).RAPIER;
    let vec: any = null;
    try {
      if (RAPIER && RAPIER.Vector3) vec = new RAPIER.Vector3(force.x, force.y, force.z);
    } catch (e) {}

    // try several possible method names in order
    try {
      if (rec.body) {
        if (typeof rec.body.applyForce === 'function') {
          // applyForce(force, wakeUp)
          try {
            if (vec) rec.body.applyForce(vec, true);
            else rec.body.applyForce({ x: force.x, y: force.y, z: force.z }, true);
            rec.lastApplied = true;
            return;
          } catch (e) { /* try next */ }
        }
        if (typeof rec.body.applyForceToCenter === 'function') {
          try {
            if (vec) rec.body.applyForceToCenter(vec, true);
            else rec.body.applyForceToCenter({ x: force.x, y: force.y, z: force.z }, true);
            rec.lastApplied = true;
            return;
          } catch (e) { /* try next */ }
        }
        if (typeof rec.body.applyImpulse === 'function') {
          try {
            if (vec) rec.body.applyImpulse(vec, true);
            else rec.body.applyImpulse({ x: force.x, y: force.y, z: force.z }, true);
            rec.lastApplied = true;
            return;
          } catch (e) { /* try next */ }
        }
        // older versions may expose addForce
        if (typeof rec.body.addForce === 'function') {
          try { rec.body.addForce({ x: force.x, y: force.y, z: force.z }, true); rec.lastApplied = true; return; } catch (e) {}
        }
      }
    } catch (e) {
      // fall through to record
    }

    // fallback: record lastForce for diagnostics
    rec.lastForce = { ...force };
  }

  getBodyTransform(handle: PhysicsHandle): Transform | null {
    const rec = this.bodies.get(handle as number);
    if (!rec || !rec.body || !this._ready) return null;
    try {
      const t = rec.body.translation();
      const r = rec.body.rotation ? rec.body.rotation() : { x: 0, y: 0, z: 0 };
      return { position: { x: t.x, y: t.y, z: t.z }, rotation: { x: r.x || 0, y: r.y || 0, z: r.z || 0 } };
    } catch (e) {
      return null;
    }
  }

  setBodyTransform(handle: PhysicsHandle, tf: Transform): void {
    const rec = this.bodies.get(handle as number);
    if (!rec || !rec.body || !this._ready) return;
    try {
      if (rec.body.setTranslation) rec.body.setTranslation((window as any).RAPIER.Vector3 ? new (window as any).RAPIER.Vector3(tf.position.x, tf.position.y, tf.position.z) : { x: tf.position.x, y: tf.position.y, z: tf.position.z }, true);
      // rotation set is optional
    } catch (e) {}
  }

  // Create a static triangle mesh collider from flat arrays (vertices: [x,y,z,...], indices: [i0,i1,i2,...])
  addStaticTrimesh(vertices: number[] | Float32Array, indices: number[] | Uint32Array): number | null {
    const id = this.next++;
    try {
      if (this.world && this._ready) {
        const RAPIER = (window as any).RAPIER;
        if (RAPIER && RAPIER.ColliderDesc && RAPIER.RawTriMesh) {
          // prefer using ColliderDesc.trimesh if available
          try {
            const bodyDesc = (RAPIER as any).RigidBodyDesc.fixed();
            const rbody = this.world.createRigidBody(bodyDesc);
            // if ColliderDesc.trimesh is available, use it
            if ((RAPIER as any).ColliderDesc && (RAPIER as any).ColliderDesc.trimesh) {
              try {
                const colDesc = (RAPIER as any).ColliderDesc.trimesh(vertices, indices);
                this.world.createCollider(colDesc, rbody.handle);
                this.colliders.set(id, { body: rbody, colliderDesc: colDesc });
                return id;
              } catch (e) {
                // fallthrough
              }
            }
            // fallback: store body only
            this.colliders.set(id, { body: rbody });
            return id;
          } catch (e) {
            // fall through to fallback
          }
        }
      }
    } catch (e) {
      // ignore
    }
    // fallback: record placeholder
    this.colliders.set(id, { placeholder: true });
    return id;
  }

  removeStaticTrimesh(handle: number): void {
    const rec = this.colliders.get(handle);
    if (!rec) return;
    try {
      if (rec.body && this.world && this._ready) {
        try { this.world.removeRigidBody(rec.body); } catch (e) {}
      }
    } catch (e) {}
    this.colliders.delete(handle);
  }

  // Clear per-body applied flags; call before applying forces each frame
  clearAppliedFlags(): void {
    for (const rec of this.bodies.values()) {
      rec.lastApplied = false;
    }
  }

  isReady(): boolean { return this._ready; }

  createVehicleBody?(position: Vec3, mass: number): PhysicsHandle {
    try {
      return this.addBody({ mass: mass, position: position });
    } catch (e) {
      return this.addBody({ mass: mass, position: position });
    }
  }
}
