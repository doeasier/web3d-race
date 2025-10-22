import { IVehicleController, VehicleInput, VehicleState, Transform, IPhysicsWorld, PhysicsBody } from "../core/types";
import { slipRatio, engineTorqueFromRPM } from "./vehicleMath";
import { VehicleProfile, DefaultCityCar } from './VehicleProfile';

export type VehicleParams = {
  mass: number;
  wheelRadius: number;
  wheelInertia?: number;
  maxSteerAngle: number;
};

export class VehicleControllerFast implements IVehicleController {
  input: VehicleInput = { steer: 0, throttle: 0, brake: 0, handbrake: false };
  state: VehicleState;
  bodyHandle: number | null = null;
  params: VehicleParams;
  physics: IPhysicsWorld;
  profile: VehicleProfile;
  brakePressure: number = 0; // 0..1
  // cumulative distance traveled (meters) read from physics when available (private)
  private _travelledDistance: number = 0;

  constructor(physics: IPhysicsWorld, params: VehicleParams, profile?: VehicleProfile) {
    this.physics = physics;
    this.params = params;
    this.profile = profile || DefaultCityCar;
    this.state = { speed: 0, rpm: 0, gear: 1, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
    const body = { mass: params.mass, position: { x: 0, y: 0, z: 0 } } as PhysicsBody;
    try {
      if (typeof (this.physics as any).createVehicleBody === 'function') this.bodyHandle = (this.physics as any).createVehicleBody(body.position, body.mass);
      else this.bodyHandle = this.physics.addBody(body);
    } catch (e) { this.bodyHandle = this.physics.addBody(body); }
  }

  setInput(input: VehicleInput): void {
    // copy values to avoid external mutation
    this.input = { steer: input.steer, throttle: input.throttle, brake: input.brake, handbrake: input.handbrake };
  }

  update(dt: number): void {
    // throttle from profile
    const throttleAccel = this.profile?.accel?.maxAccel ?? 5; // m/s^2 per throttle
    const brakeAccel = this.profile?.brake?.a_heavy ?? 8.5; // m/s^2 per full brake
    const dragAccel = 1.5; // m/s^2 natural drag

    // determine brakePressure from input.brake (0..1) for legacy and read brakeForce (mapped) if available
    this.brakePressure = this.input.brake > 0 ? this.input.brake : 0;
    const brakeForceMapped = typeof this.input.brakeForce === 'number' ? this.input.brakeForce : this.brakePressure;

    // Decide whether to apply forces to physics or do local integration and push transform.
    // By default we avoid using applyForce with Rapier wrapper to prevent inconsistencies across versions.
    const isRapier = this.physics && (this.physics as any).constructor && (this.physics as any).constructor.name === 'RapierPhysicsWorldImpl';
    const hasApplyForce = !!(this.physics && typeof (this.physics as any).applyForce === 'function' && this.bodyHandle != null);
    const usePhysicsForce = hasApplyForce && !isRapier; // disable direct force apply for Rapier by default

    if (usePhysicsForce) {
      // compute desired longitudinal acceleration (m/s^2)
      // combine throttle and brake so a small residual brake pressure does not block acceleration
      let desiredAccel = 0;
      if (this.input.throttle > 0 || brakeForceMapped > 0) {
        desiredAccel = (this.input.throttle * throttleAccel) - (brakeForceMapped * brakeAccel);
      } else {
        desiredAccel = -Math.sign(this.state.speed) * dragAccel;
      }

      // convert to force = m * a (world-space, along vehicle forward)
      const mass = this.params.mass;
      const forceMag = mass * desiredAccel; // could be negative for braking
      const heading = this.state.rotation.y;
      const fx = Math.sin(heading) * forceMag;
      const fz = Math.cos(heading) * forceMag;

      try {
        (this.physics as any).applyForce(this.bodyHandle as number, { x: fx, y: 0, z: fz });
      } catch (e) {
        // ignore
      }
      // Local integration for arcade forward motion (visuals remain authoritative)
      this.state.speed += desiredAccel * dt;
      // prevent speed going negative due to brake residual when stopped
      if (this.state.speed < 0 && Math.abs(this.state.speed) < 0.001) this.state.speed = 0;
      const dx = Math.sin(heading) * this.state.speed * dt;
      const dz = Math.cos(heading) * this.state.speed * dt;
      this.state.position.x += dx;
      this.state.position.z += dz;
    } else {
      // fallback simple integration
      // combine throttle and brake
      let accel = 0;
      if (this.input.throttle > 0 || brakeForceMapped > 0) {
        accel = (this.input.throttle * throttleAccel) - (brakeForceMapped * brakeAccel);
      } else {
        accel = Math.abs(this.state.speed) > 0.001 ? -Math.sign(this.state.speed) * dragAccel : 0;
      }
      this.state.speed += accel * dt;
      if (this.state.speed < 0 && Math.abs(this.state.speed) < 0.001) this.state.speed = 0;

      // steering & kinematics
      const maxSteerRad = (this.profile?.maxSteerAngle ?? this.params.maxSteerAngle) * (Math.PI / 180);
      const yawRate = this.input.steer * maxSteerRad * 0.6;
      this.state.rotation.y += yawRate * dt;
      const heading = this.state.rotation.y;
      const dx = Math.sin(heading) * this.state.speed * dt;
      const dz = Math.cos(heading) * this.state.speed * dt;
      this.state.position.x += dx;
      this.state.position.z += dz;
    }

    // After integration, if physics provides setBodyTransform and is ready, push our transform to physics
    try {
      const phys: any = this.physics;
      const isReady = typeof phys.isReady === 'function' ? phys.isReady() : true;
      if (this.bodyHandle != null && typeof phys.setBodyTransform === 'function' && isReady) {
        try { phys.setBodyTransform(this.bodyHandle as number, { position: { ...this.state.position }, rotation: { ...this.state.rotation } }); } catch (e) {}
      }
    } catch (e) {}

    // prevent negative speed
    if (this.state.speed < 0) this.state.speed = 0;
    if (Math.abs(this.state.speed) < 0.01 && this.input.throttle === 0 && this.brakePressure === 0) this.state.speed = 0;

    // steering for physics branch (yaw update)
    if (typeof (this.physics as any).applyForce === 'function') {
      const maxSteerRad = (this.profile?.maxSteerAngle ?? this.params.maxSteerAngle) * (Math.PI / 180);
      const yawRate = this.input.steer * maxSteerRad * 0.6;
      this.state.rotation.y += yawRate * dt; // keep rotation updated locally
    }

    this.state.rpm = Math.min(7000, Math.abs(this.state.speed) * 100);

    // Do not read physics transform here; call postPhysicsSync() after physics.step in main loop
  }

  // Should be called after physics.step(dt) to synchronize state with physics world
  postPhysicsSync(dt?: number): void {
    try {
      const ctorName = (this.physics as any)?.constructor?.name;
      const isReady = typeof (this.physics as any).isReady === 'function' ? (this.physics as any).isReady() : true;
      if (this.bodyHandle != null && typeof (this.physics as any).getBodyTransform === 'function') {
        if (ctorName === 'RapierPhysicsWorldImpl' && isReady) {
          const phys = this.physics as any;
          const tf = phys.getBodyTransform(this.bodyHandle as number);
          if (tf) {
            const rec = (phys.bodies && phys.bodies.get) ? (phys.bodies.get(this.bodyHandle as number)) : null;
            // check if physics applied force this frame
            const applied = !!(rec && rec.lastApplied);
            // try read linear velocity if available
            let linvelMag = 0;
            try {
              const body = rec && rec.body;
              if (body) {
                if (typeof body.linvel === 'function') {
                  const lv = body.linvel();
                  linvelMag = Math.sqrt((lv.x || 0) ** 2 + (lv.y || 0) ** 2 + (lv.z || 0) ** 2);
                } else if (body.linvel) {
                  const lv = body.linvel;
                  linvelMag = Math.sqrt((lv.x || 0) ** 2 + (lv.y || 0) ** 2 + (lv.z || 0) ** 2);
                }
              }
            } catch (e) { linvelMag = 0; }

            const velThreshold = 0.01; // m/s
            if (applied || linvelMag > velThreshold) {
              // physics shows movement: adopt physics transform and speed
              this.state.position.x = tf.position.x;
              this.state.position.y = tf.position.y;
              this.state.position.z = tf.position.z;
              this.state.rotation.y = tf.rotation.y || this.state.rotation.y;
              if (linvelMag > 0) this.state.speed = linvelMag;
              // integrate travelled distance if dt provided
              try { if (dt && dt > 0) this._travelledDistance += linvelMag * dt; } catch (e) {}
            } else {
              // physics did not move: push controller transform back to physics so it stays in sync
              try {
                if (typeof phys.setBodyTransform === 'function') {
                  phys.setBodyTransform(this.bodyHandle as number, { position: { ...this.state.position }, rotation: { ...this.state.rotation } });
                }
              } catch (e) {}
              // keep controller-local state (do not overwrite speed/position)
              // still integrate travelled distance from controller speed so visuals advance
              try { if (dt && dt > 0) this._travelledDistance += this.state.speed * dt; } catch (e) {}
            }
          }
        } else if (typeof (this.physics as any).setBodyTransform === 'function') {
          // push our controller-calculated transform to physics (fake physics)
          (this.physics as any).setBodyTransform(this.bodyHandle as number, { position: { ...this.state.position }, rotation: { ...this.state.rotation } });
          // for fake physics, we can integrate travelled distance from controller speed
          try { if (dt && dt > 0) this._travelledDistance += this.state.speed * dt; } catch (e) {}
        }
      }
    } catch (e) { /* ignore */ }
  }

  reset(tf: Transform): void {
    this.state.position = { ...tf.position };
    this.state.rotation = { ...tf.rotation };
    this.state.speed = 0;
    this.state.rpm = 0;
    this._travelledDistance = 0;
    try { if (this.bodyHandle != null && typeof this.physics.setBodyTransform === 'function') this.physics.setBodyTransform(this.bodyHandle, { position: { ...this.state.position }, rotation: { ...this.state.rotation } }); } catch (e) {}
  }

  getState(): VehicleState {
    return this.state;
  }

  getProfile(): VehicleProfile {
    return this.profile;
  }

  // Expose travelled distance via getter to satisfy IVehicleController contract
  getTravelledDistance(): number {
    return this._travelledDistance;
  }

  dispose(): void {
    if (this.bodyHandle) this.physics.removeBody(this.bodyHandle);
    this.bodyHandle = null;
  }
}
