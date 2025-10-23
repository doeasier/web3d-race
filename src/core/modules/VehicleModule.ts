/**
 * 车辆系统模块
 */
import { InitModule } from '../InitializationManager';
import { VehicleControllerFast } from '../../gameplay/VehicleControllerFast';
import { VehicleProfile, DefaultCityCar } from '../../gameplay/VehicleProfile';

export class VehicleModule implements InitModule {
  name = 'vehicle';
  phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';
  dependencies = ['physics'];

  vehicle: any = null;
  profile: VehicleProfile;
  private physicsWorld: any;

  constructor(physicsWorld: any, profile: VehicleProfile = DefaultCityCar) {
    this.physicsWorld = physicsWorld;
    this.profile = profile;
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

    console.log('VehicleModule: initialized');
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
