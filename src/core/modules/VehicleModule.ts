/**
 * 车辆系统模块
 */
import { InitModule } from '../InitializationManager';
import { VehicleControllerFast } from '../../gameplay/VehicleControllerFast';
import type { VehicleProfile } from '../../gameplay/VehicleProfile';
import type { VehicleConfig } from '../VehicleConfig';

/**
 * 将VehicleConfig转换为VehicleProfile
 */
function configToProfile(config: VehicleConfig): VehicleProfile {
  return {
    id: config.id,
    displayName: config.displayName,
    modelPath: config.modelPath,
    mass: config.physics.mass,
  wheelRadius: config.physics.wheelRadius,
    wheelInertia: config.physics.wheelInertia,
    maxSteerAngle: config.steering.maxSteerAngle,
    nominalRpm: config.engine.nominalRpm,
    accel: {
  maxAccel: config.acceleration.maxAccel,
    throttleResponse: config.acceleration.throttleResponse
    },
  brake: {
   a_light: config.braking.a_light,
      a_heavy: config.braking.a_heavy,
      longPressThresholdMs: config.braking.longPressThresholdMs,
      rampUpTimeMs: config.braking.rampUpTimeMs
    },
    animations: config.animations
  };
}

export class VehicleModule implements InitModule {
  name = 'vehicle';
  phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';
  dependencies = ['physics'];

  vehicle: any = null;
  profile: VehicleProfile;
  config: VehicleConfig | null = null;
  private physicsWorld: any;

  constructor(physicsWorld: any, configOrProfile: VehicleConfig | VehicleProfile) {
    this.physicsWorld = physicsWorld;
    
    // 检查是否为VehicleConfig
    if ('physics' in configOrProfile && 'steering' in configOrProfile) {
      // 是VehicleConfig
      this.config = configOrProfile as VehicleConfig;
      this.profile = configToProfile(this.config);
    } else {
      // 是VehicleProfile
      this.profile = configOrProfile as VehicleProfile;
    }
  }

  async init(): Promise<void> {
    this.vehicle = new VehicleControllerFast(
      this.physicsWorld,
      {
        mass: this.profile.mass,
      wheelRadius: this.profile.wheelRadius,
        maxSteerAngle: this.profile.maxSteerAngle
      },
    this.profile
    );

    console.log(`VehicleModule: initialized with vehicle ${this.profile.id}`);
  }

  /**
   * 使用新配置重新初始化车辆
   */
  async reinitialize(configOrProfile: VehicleConfig | VehicleProfile): Promise<void> {
    // 清理现有车辆
    if (this.vehicle && typeof this.vehicle.dispose === 'function') {
      this.vehicle.dispose();
    }
    
    // 更新配置
    if ('physics' in configOrProfile && 'steering' in configOrProfile) {
      this.config = configOrProfile as VehicleConfig;
      this.profile = configToProfile(this.config);
    } else {
      this.profile = configOrProfile as VehicleProfile;
    }
    
    // 重新初始化
    await this.init();
  }
  
  /**
   * 获取当前车辆配置
   */
  getConfig(): VehicleConfig | null {
    return this.config;
  }
  
  /**
   * 获取当前车辆Profile
   */
  getProfile(): VehicleProfile {
    return this.profile;
  }

  /**
   * 重置车辆到指定状态
   */
  reset(state?: { position: any; rotation: any }): void {
    if (this.vehicle && typeof this.vehicle.reset === 'function') {
      this.vehicle.reset(state);
    }
  }

  cleanup(): void {
    if (this.vehicle && typeof this.vehicle.dispose === 'function') {
      this.vehicle.dispose();
    }
  }
}
