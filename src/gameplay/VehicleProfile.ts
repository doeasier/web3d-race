export type AccelParams = {
  maxAccel: number; // m/s^2 at full throttle
  throttleResponse: number; // responsiveness factor
};

export type BrakeParams = {
  a_light: number; // m/s^2
  a_heavy: number; // m/s^2
  longPressThresholdMs: number;
  rampUpTimeMs: number;
};

export type AnimationMap = {
  idle?: string;
  drive_slow?: string;
  drive_fast?: string;
  brake?: string;
  steer?: string;
};

export type VehicleProfile = {
  id: string;
  displayName?: string;
  modelPath?: string;
  mass: number;
  wheelRadius: number;
  wheelInertia?: number;
  maxSteerAngle: number; // degrees
  nominalRpm?: number;
  accel: AccelParams;
  brake: BrakeParams;
  animations?: AnimationMap;
};

export const DefaultCityCar: VehicleProfile = {
  id: 'city_car_01',
  displayName: 'City Car',
  modelPath: '/assets/models/Car.glb',
  mass: 1200,
  wheelRadius: 0.3,
  maxSteerAngle: 30,
  nominalRpm: 3000,
  accel: {
    maxAccel: 5.0,
    throttleResponse: 1.0
  },
  brake: {
    a_light: 3.0,
    a_heavy: 8.5,
    longPressThresholdMs: 350,
    rampUpTimeMs: 800
  },
  animations: {
    idle: 'Idle',
    drive_slow: 'DriveSlow',
    drive_fast: 'DriveFast',
    brake: 'Brake',
    steer: 'Steer'
  }
};
