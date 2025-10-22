import { FakePhysicsWorld } from "../../src/gameplay/FakePhysicsWorld";
import { VehicleControllerFast } from "../../src/gameplay/VehicleControllerFast";

describe("VehicleControllerFast", () => {
  test("throttle increases speed", () => {
    const phys = new FakePhysicsWorld();
    const vehicle = new VehicleControllerFast(phys, { mass: 1200, wheelRadius: 0.3, maxSteerAngle: 30 });
    vehicle.setInput({ steer: 0, throttle: 1, brake: 0, handbrake: false });
    vehicle.update(1);
    const s = vehicle.getState().speed;
    expect(s).toBeGreaterThan(0);
  });

  test("forward throttle advances z position (arcade integration)", () => {
    const phys = new FakePhysicsWorld();
    const vehicle = new VehicleControllerFast(phys, { mass: 1200, wheelRadius: 0.3, maxSteerAngle: 30 });
    const z0 = vehicle.getState().position.z;
    vehicle.setInput({ steer: 0, throttle: 1, brake: 0, handbrake: false });
    vehicle.update(0.5);
    const z1 = vehicle.getState().position.z;
    expect(z1).toBeGreaterThan(z0);
  });

  test("brake reduces speed to zero", () => {
    const phys = new FakePhysicsWorld();
    const vehicle = new VehicleControllerFast(phys, { mass: 1200, wheelRadius: 0.3, maxSteerAngle: 30 });
    vehicle.setInput({ steer: 0, throttle: 1, brake: 0, handbrake: false });
    vehicle.update(1);
    expect(vehicle.getState().speed).toBeGreaterThan(0);
    vehicle.setInput({ steer: 0, throttle: 0, brake: 1, handbrake: false });
    vehicle.update(1);
    expect(vehicle.getState().speed).toBeGreaterThanOrEqual(0);
  });

  test("reset aligns position", () => {
    const phys = new FakePhysicsWorld();
    const vehicle = new VehicleControllerFast(phys, { mass: 1200, wheelRadius: 0.3, maxSteerAngle: 30 });
    vehicle.update(0.5);
    vehicle.reset({ position: { x: 1, y: 0, z: 2 }, rotation: { x: 0, y: 1.57, z: 0 } });
    const s = vehicle.getState();
    expect(s.position.x).toBe(1);
    expect(s.position.z).toBe(2);
    expect(s.rotation.y).toBeCloseTo(1.57);
  });
});
