export type Vec3 = { x: number; y: number; z: number };

export interface Transform {
  position: Vec3;
  rotation: Vec3; // Euler radians
}

export interface VehicleInput {
  steer: number; // -1..1
  throttle: number; // 0..1
  brake: number; // 0..1
  // optional mapped brake force (0..1) after curve mapping
  brakeForce?: number;
  handbrake: boolean;
  gearUp?: boolean;
  gearDown?: boolean;
}

export interface VehicleState {
  speed: number; // m/s
  rpm: number;
  gear: number;
  position: Vec3;
  rotation: Vec3;
}

export interface IVehicleController {
  setInput(input: VehicleInput): void;
  update(dt: number): void;
  reset(tf: Transform): void;
  getState(): VehicleState;
  // Optional: synchronize controller with physics after physics.step(dt)
  postPhysicsSync?(dt?: number): void;
  // Optional: return cumulative distance traveled reported by controller (meters)
  getTravelledDistance?(): number;
  dispose(): void;
}

export interface RaycastHit {
  point: Vec3;
  normal: Vec3;
  distance: number;
  bodyId?: string;
}

export type PhysicsHandle = number;

export interface PhysicsBody {
  id?: string;
  mass: number;
  position: Vec3;
}

export interface IPhysicsWorld {
  step(dt: number): void;
  raycast(origin: Vec3, dir: Vec3, maxDist: number): RaycastHit | null;
  addBody(body: PhysicsBody): PhysicsHandle;
  removeBody(handle: PhysicsHandle): void;
  setGravity(g: Vec3): void;
  // Apply a linear force (world-space) to a body handle
  applyForce?(handle: PhysicsHandle, force: Vec3): void;
  // Read a body's world transform (position + rotation euler) if available
  getBodyTransform?(handle: PhysicsHandle): Transform | null;
  // Set a body's transform (position+rotation) if available
  setBodyTransform?(handle: PhysicsHandle, tf: Transform): void;
  // Ready flag (e.g., Rapier initialized)
  isReady?(): boolean;
  // Optional factory helper to create a vehicle-style rigid body with mass and initial position
  createVehicleBody?(position: Vec3, mass: number): PhysicsHandle;
}
