/**
 * �����������Ͷ���
 * �����ĳ������������ýӿ�
 */

export interface Vector3 {
  x?: number;
  y?: number;
  z?: number;
}

export interface PhysicsConfig {
  mass: number;
  wheelRadius: number;
  wheelInertia?: number;
  centerOfMassOffset?: [number, number, number];
  dragCoefficient?: number;
  rollingResistance?: number;
}

export interface SteeringConfig {
  maxSteerAngle: number;
  steerSpeed: number;
  returnSpeed: number;
  minSpeed?: number;
}

export interface TorquePoint {
  rpm: number;
  torque: number; // 0-1 normalized
}

export interface AccelerationConfig {
  maxAccel: number;
  throttleResponse: number;
  reverseAccel: number;
  maxSpeed: number;
  maxReverseSpeed: number;
  torqueCurve?: TorquePoint[];
}

export interface BrakingConfig {
  a_light: number; // m/s^2 ��ɲ�����ٶ�
  a_heavy: number; // m/s^2 ��ɲ�����ٶ�
  longPressThresholdMs: number;
  rampUpTimeMs: number;
  absEnabled?: boolean;
  brakeBias?: number; // ǰ���ƶ������� (0-1, 0.6 = 60% front)
}

export interface EngineConfig {
  nominalRpm: number;
  idleRpm: number;
  maxRpm: number;
  redlineRpm: number;
  rpmIncreaseRate: number;
  rpmDecreaseRate: number;
}

export interface SuspensionConfig {
  stiffness: number;
  damping: number;
  travel: number;
  compression: number;
  rebound: number;
}

export interface AnimationConfig {
  idle?: string;
  drive_slow?: string;
  drive_fast?: string;
  brake?: string;
  steer?: string;
  wheelRotation?: string;
}

export interface AudioSet {
  idle?: string;
  low?: string;
  mid?: string;
  high?: string;
}

export interface AudioEffects {
  brake?: string;
  horn?: string;
  crash?: string;
  drift?: string;
}

export interface AudioConfig {
  engine?: AudioSet;
  effects?: AudioEffects;
}

export interface VisualConfig {
  bodyColor?: string;
  wheelColor?: string;
  glassOpacity?: number;
  brakeLightIntensity?: number;
  headlightIntensity?: number;
}

export interface UnlockRequirements {
  level?: number;
  currency?: number;
  achievements?: string[];
}

export interface VehicleStats {
  acceleration: number; // 0-100
  topSpeed: number; // 0-100
  handling: number; // 0-100
  braking: number; // 0-100
  durability: number; // 0-100
}

/**
 * �����ĳ������ýӿ�
 */
export interface VehicleConfig {
  id: string;
  displayName: string;
  displayNameZh?: string;
  description?: string;
  descriptionZh?: string;
  category: string;
  modelPath: string;
  thumbnailPath?: string;
  
  physics: PhysicsConfig;
  steering: SteeringConfig;
  acceleration: AccelerationConfig;
  braking: BrakingConfig;
  engine: EngineConfig;
  suspension: SuspensionConfig;
  
  animations?: AnimationConfig;
  audio?: AudioConfig;
  visual?: VisualConfig;
  
  unlockRequirements?: UnlockRequirements;
  stats?: VehicleStats;
}

/**
 * �����嵥����
 */
export interface VehicleManifest {
  version: string;
  vehicles: string[];
  defaultVehicle: string;
  categories?: Record<string, {
    name: string;
    nameZh?: string;
    description?: string;
  }>;
}

/**
 * ��������״̬
 */
export interface VehicleLoadState {
  config: VehicleConfig;
  model?: any; // THREE.Object3D
  isLoaded: boolean;
  isUnlocked: boolean;
  error?: string;
}
