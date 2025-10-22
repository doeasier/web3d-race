import { describe, it, expect } from 'vitest';
import { FakePhysicsWorld } from '../../src/gameplay/FakePhysicsWorld';
import { RapierPhysicsWorldImpl } from '../../src/gameplay/RapierPhysicsWorldImpl';
import { VehicleControllerFast } from '../../src/gameplay/VehicleControllerFast';
import { RoadManager } from '../../src/world/RoadManager';

// Helper profile-like params
const params = { mass: 1200, wheelRadius: 0.32, maxSteerAngle: 30 } as any;

describe('forward motion end-to-end pieces', () => {
  it('VehicleControllerFast: getTravelledDistance increases after throttle (FakePhysics)', () => {
    const phys = new FakePhysicsWorld();
    const ctrl = new VehicleControllerFast(phys as any, params);
    // press throttle
    ctrl.setInput({ steer: 0, throttle: 1, brake: 0, handbrake: false });
    const dt = 0.016;
    for (let i = 0; i < 60; i++) { // ~1s
      ctrl.update(dt);
      phys.step(dt);
      ctrl.postPhysicsSync?.(dt);
    }
    const dist = ctrl.getTravelledDistance?.() ?? 0;
    expect(dist).toBeGreaterThan(0.5); // should have moved forward at least ~0.5m in 1s
  });

  it('RoadManager.update moves segment positions when vehicleZ increases', () => {
    const cfg = { segmentLength: 10, numSegments: 5, textureRepeatY: 8, scrollFactor: 0.2, roadOffset: 0 } as any;
    const rm = new RoadManager(cfg, 6);
    rm.init(null as any, null as any);
    // initial update at z=0
    rm.update(0, 0, 0.016);
    const z0 = rm.segments.map(s => s.position?.z ?? (s.mesh?.position.z));
    // update with vehicleZ increase
    rm.update(5, 1, 0.016);
    const z1 = rm.segments.map(s => s.position?.z ?? (s.mesh?.position.z));
    // every segment should have shifted by -5 in z (relative to viewer)
    for (let i = 0; i < z0.length; i++) {
      expect(z1[i]).toBeCloseTo(z0[i] - 5, 1);
    }
  });
});
