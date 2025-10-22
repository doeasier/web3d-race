import { slipRatio, slipAngle, engineTorqueFromRPM } from "../../src/gameplay/vehicleMath";

describe("math utils", () => {
  test("slipRatio basic", () => {
    const sr = slipRatio(10, 0.3, 2);
    expect(typeof sr).toBe("number");
  });

  test("slipAngle basic", () => {
    const a = slipAngle(0.1, 10, 0.01, 1, 0.05);
    expect(typeof a).toBe("number");
  });

  test("engine torque curve bounds", () => {
    expect(engineTorqueFromRPM(0)).toBeCloseTo(0, 1);
    expect(engineTorqueFromRPM(3500)).toBeGreaterThan(0);
    expect(engineTorqueFromRPM(7000)).toBeCloseTo(0, 1);
  });
});
