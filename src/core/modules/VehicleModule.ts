/**
 * ����ϵͳģ��
 */
import { InitModule } from '../InitializationManager';
import { VehicleControllerFast } from '../../gameplay/VehicleControllerFast';
import type { VehicleProfile } from '../../gameplay/VehicleProfile';
import type { VehicleConfig } from '../VehicleConfig';

/**
 * ��VehicleConfigת��ΪVehicleProfile
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
    
    // ����Ƿ�ΪVehicleConfig
    if ('physics' in configOrProfile && 'steering' in configOrProfile) {
      // ��VehicleConfig
      this.config = configOrProfile as VehicleConfig;
      this.profile = configToProfile(this.config);
    } else {
      // ��VehicleProfile
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
   * ʹ�����������³�ʼ������
   */
  async reinitialize(configOrProfile: VehicleConfig | VehicleProfile): Promise<void> {
    // �������г���
    if (this.vehicle && typeof this.vehicle.dispose === 'function') {
      this.vehicle.dispose();
    }
    
    // ��������
    if ('physics' in configOrProfile && 'steering' in configOrProfile) {
      this.config = configOrProfile as VehicleConfig;
      this.profile = configToProfile(this.config);
    } else {
      this.profile = configOrProfile as VehicleProfile;
    }
    
    // ���³�ʼ��
    await this.init();
  }
  
  /**
   * ��ȡ��ǰ��������
   */
  getConfig(): VehicleConfig | null {
    return this.config;
  }
  
  /**
   * ��ȡ��ǰ����Profile
   */
  getProfile(): VehicleProfile {
    return this.profile;
  }

  /**
   * ���ó�����ָ��״̬
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
