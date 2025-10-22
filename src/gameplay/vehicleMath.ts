export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function slipRatio(wheelOmega: number, wheelRadius: number, vLong: number) {
  const eps = 1e-4;
  const wheelLinear = wheelOmega * wheelRadius;
  return (wheelLinear - vLong) / Math.max(Math.abs(vLong), eps);
}

export function slipAngle(vLat: number, vForward: number, yawRate: number, a: number, steerAngle: number) {
  // atan2(v_lat + yawRate * a, v_forward) - steerAngle
  return Math.atan2(vLat + yawRate * a, vForward) - steerAngle;
}

export function engineTorqueFromRPM(rpm: number, peakTorque = 400, maxRPM = 7000) {
  // simple parabolic curve that peaks at ~half maxRPM
  const x = Math.min(rpm, maxRPM) / maxRPM;
  return peakTorque * (1 - 4 * Math.pow(x - 0.5, 2));
}
