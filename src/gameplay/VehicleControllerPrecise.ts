import { IVehicleController, VehicleInput, VehicleState, Transform, IPhysicsWorld } from "../core/types";

export class VehicleControllerPrecise implements IVehicleController {
  physics: IPhysicsWorld;
  state: VehicleState;
  input: VehicleInput = { steer: 0, throttle: 0, brake: 0, handbrake: false };
  bodyHandle: number | null = null;
  // cumulative distance travelled (meters) ¡ª updated from physics when available (private)
  private _travelledDistance: number = 0;

  constructor(physics: IPhysicsWorld, params?: any) {
    this.physics = physics;
    this.state = { speed: 0, rpm: 0, gear: 1, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
    // create a physics body if world supports it
    try {
      const mass = (params && params.mass) ? params.mass : 1500;
      const body = { mass, position: { x: this.state.position.x, y: this.state.position.y, z: this.state.position.z } } as any;
      if (this.physics && typeof this.physics.addBody === 'function') {
        this.bodyHandle = this.physics.addBody(body as any);
      }
    } catch (e) {}
    console.warn('VehicleControllerPrecise: placeholder implementation');
  }

  setInput(input: VehicleInput): void {
    this.input = input;
  }
  update(dt: number): void {
    // placeholder: mirror fast behavior for now
    const accel = this.input.throttle * 5 - this.input.brake * 10;
    this.state.speed += accel * dt;
    if (this.state.speed < 0) this.state.speed = 0;
    this.state.position.z += this.state.speed * dt;
    const yawRate = this.input.steer * 1.5;
    this.state.rotation.y += yawRate * dt;
    this.state.rpm = Math.min(7000, Math.abs(this.state.speed) * 100);
  }
  // Optional: synchronize with physics after physics.step
  postPhysicsSync(dt?: number): void {
    try {
      const phys: any = this.physics;
      const ctorName = phys?.constructor?.name;
      const isReady = typeof phys.isReady === 'function' ? phys.isReady() : true;
      if (this.bodyHandle != null && typeof phys.getBodyTransform === 'function') {
        const tf = phys.getBodyTransform(this.bodyHandle as number);
        if (tf) {
          // attempt to read linear velocity magnitude if available
          let linvelMag = 0;
          try {
            const rec = (phys.bodies && phys.bodies.get) ? phys.bodies.get(this.bodyHandle as number) : null;
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

          // adopt physics transform
          this.state.position.x = tf.position.x;
          this.state.position.y = tf.position.y;
          this.state.position.z = tf.position.z;
          this.state.rotation.y = tf.rotation.y || this.state.rotation.y;
          if (linvelMag > 0) this.state.speed = linvelMag;
          // integrate travelledDistance
          try { if (dt && dt > 0) this._travelledDistance += (linvelMag > 0 ? linvelMag : this.state.speed) * dt; } catch (e) {}
        }
      } else {
        // no physics: integrate from controller state
        try { if (dt && dt > 0) this._travelledDistance += this.state.speed * dt; } catch (e) {}
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
  getState(): VehicleState { return this.state; }
  getTravelledDistance(): number { return this._travelledDistance; }
  dispose(): void {}
}
