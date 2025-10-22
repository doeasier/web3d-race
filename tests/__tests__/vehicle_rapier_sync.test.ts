import { describe, it, expect } from 'vitest';
import { RapierPhysicsWorldImpl } from '../../src/gameplay/RapierPhysicsWorldImpl';
import { VehicleControllerFast } from '../../src/gameplay/VehicleControllerFast';

// This test uses Rapier wrapper; in CI/browser without wasm it will fallback, so we can only
// assert that when wrapper reports not ready, controller keeps advancing z via local integration.

describe('VehicleControllerFast + RapierPhysicsWorldImpl sync', () => {
  it('keeps advancing forward z before Rapier is ready', () => {
    const phys = new RapierPhysicsWorldImpl();
    const vehicle = new VehicleControllerFast(phys as any, { mass: 1200, wheelRadius: 0.3, maxSteerAngle: 30 });
    const z0 = vehicle.getState().position.z;
    vehicle.setInput({ steer: 0, throttle: 1, brake: 0, handbrake: false });
    vehicle.update(0.5);
    const z1 = vehicle.getState().position.z;
    expect(z1).toBeGreaterThan(z0);
  });
});
