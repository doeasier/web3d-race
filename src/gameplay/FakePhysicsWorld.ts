import { IPhysicsWorld, PhysicsBody, PhysicsHandle, Vec3, RaycastHit, Transform } from "../core/types";

let nextHandle = 1;

export class FakePhysicsWorld implements IPhysicsWorld {
  bodies = new Map<number, PhysicsBody & { lastForce?: Vec3 }>();
  gravity = { x: 0, y: -9.81, z: 0 } as Vec3;

  step(dt: number) {
    // simple integration: apply gravity to y position
    this.bodies.forEach((b) => {
      // integrate simple velocity-less gravity for demo
      b.position.y += this.gravity.y * dt * dt * 0.5;
    });
  }

  raycast(origin: Vec3, dir: Vec3, maxDist: number): RaycastHit | null {
    // simplistic: if ray points down and origin.y > 0, hit ground at y=0
    if (dir.y < 0 && origin.y > 0) {
      const t = origin.y / -dir.y;
      if (t <= maxDist) {
        return { point: { x: origin.x + dir.x * t, y: 0, z: origin.z + dir.z * t }, normal: { x: 0, y: 1, z: 0 }, distance: t };
      }
    }
    return null;
  }

  addBody(body: PhysicsBody): PhysicsHandle {
    const id = nextHandle++;
    this.bodies.set(id, { ...body });
    return id;
  }
  removeBody(handle: PhysicsHandle): void {
    this.bodies.delete(handle);
  }
  setGravity(g: Vec3): void {
    this.gravity = g;
  }

  applyForce(handle: PhysicsHandle, force: Vec3): void {
    const b = this.bodies.get(handle as number);
    if (b) {
      b.lastForce = { ...force };
    }
  }

  getBodyTransform(handle: PhysicsHandle): Transform | null {
    const b = this.bodies.get(handle as number);
    if (!b) return null;
    return { position: { x: b.position.x, y: b.position.y, z: b.position.z }, rotation: { x: 0, y: 0, z: 0 } };
  }

  setBodyTransform(handle: PhysicsHandle, tf: Transform): void {
    const b = this.bodies.get(handle as number);
    if (!b) return;
    b.position.x = tf.position.x;
    b.position.y = tf.position.y;
    b.position.z = tf.position.z;
    // rotation not stored in FakePhysicsWorld bodies
  }

  createVehicleBody?(position: Vec3, mass: number): PhysicsHandle {
    return this.addBody({ mass, position });
  }
}
