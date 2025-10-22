import { IPhysicsWorld, PhysicsBody, PhysicsHandle, Vec3, RaycastHit } from "../core/types";

// Skeleton wrapper for rapier physics integration.
// Currently delegates to a simple in-memory implementation until rapier is integrated.
export class RapierPhysicsWorld implements IPhysicsWorld {
  // TODO: replace with real rapier world instance
  private bodies = new Map<number, PhysicsBody>();
  private next = 1;
  private gravity: Vec3 = { x: 0, y: -9.81, z: 0 };

  constructor(opts?: any) {
    // initialize rapier WASM here in future
    console.warn('RapierPhysicsWorld: using placeholder implementation');
  }

  step(dt: number): void {
    // Placeholder: minimal gravity integration
    this.bodies.forEach((b) => {
      b.position.y += this.gravity.y * dt * dt * 0.5;
    });
  }

  raycast(origin: Vec3, dir: Vec3, maxDist: number): RaycastHit | null {
    if (dir.y < 0 && origin.y > 0) {
      const t = origin.y / -dir.y;
      if (t <= maxDist) {
        return { point: { x: origin.x + dir.x * t, y: 0, z: origin.z + dir.z * t }, normal: { x: 0, y: 1, z: 0 }, distance: t };
      }
    }
    return null;
  }

  addBody(body: PhysicsBody): PhysicsHandle {
    const id = this.next++;
    this.bodies.set(id, body);
    return id;
  }
  removeBody(handle: PhysicsHandle): void {
    this.bodies.delete(handle);
  }
  setGravity(g: Vec3): void {
    this.gravity = g;
  }
}
