/**
 * 车辆系统使用示例
 * 展示如何集成车辆选择UI和车辆管理器
 */

import { VehicleManager, getVehicleManager } from './core/VehicleManager';
import { VehicleSelectionUI } from './ui/VehicleSelectionUI';
import type { ResourceManager } from './core/ResourceManager';

/**
 * 示例：在游戏开始前显示车辆选择界面
 */
export async function showVehicleSelection(
  resourceManager: ResourceManager,
  onStartGame: (vehicleConfig: any) => void
): Promise<void> {
  try {
    // 1. 获取车辆管理器实例
    const vehicleManager = getVehicleManager(resourceManager);
    
// 2. 初始化车辆管理器（加载所有车辆配置）
    await vehicleManager.initialize();
    console.log('Vehicle system initialized');
    
    // 3. 创建车辆选择UI
  const vehicleUI = new VehicleSelectionUI(vehicleManager, {
      onVehicleSelected: (vehicleId: string) => {
        console.log('Vehicle selected:', vehicleId);
      },
      onStartGame: () => {
      const selectedVehicle = vehicleManager.getSelectedVehicle();
        if (selectedVehicle) {
          console.log('Starting game with vehicle:', selectedVehicle.id);
          vehicleUI.hide();
   onStartGame(selectedVehicle);
        }
      },
      onClose: () => {
        vehicleUI.hide();
}
    });
    
    // 4. 显示UI
    vehicleUI.show();
    
  } catch (error) {
    console.error('Failed to show vehicle selection:', error);
    throw error;
  }
}

/**
 * 示例：直接加载特定车辆
 */
export async function loadVehicleDirectly(
  resourceManager: ResourceManager,
vehicleId: string = 'city_car_01'
): Promise<any> {
  const vehicleManager = getVehicleManager(resourceManager);
  
  // 初始化
  await vehicleManager.initialize();
  
  // 选择车辆
  const success = vehicleManager.selectVehicle(vehicleId);
  if (!success) {
    throw new Error(`Failed to select vehicle: ${vehicleId}`);
  }
  
  // 获取配置
  const config = vehicleManager.getSelectedVehicle();
  console.log('Loaded vehicle config:', config);
  
  // 加载3D模型
  const model = await vehicleManager.loadVehicleModel(vehicleId);
  console.log('Loaded vehicle model:', model);
  
  return {
    config,
    model
  };
}

/**
 * 示例：获取解锁的车辆列表
 */
export function getAvailableVehicles(vehicleManager: VehicleManager) {
  const unlockedVehicles = vehicleManager.getUnlockedVehicles();
  
  console.log('Available vehicles:');
  unlockedVehicles.forEach(v => {
    console.log(`- ${v.config.displayName} (${v.config.id})`);
    console.log(`  Category: ${v.config.category}`);
    console.log(`  Stats:`, v.config.stats);
  });
  
  return unlockedVehicles;
}

/**
 * 示例：按类别筛选车辆
 */
export function getVehiclesByCategory(
  vehicleManager: VehicleManager,
  category: string
) {
  const vehicles = vehicleManager.getVehiclesByCategory(category);
  
  console.log(`Vehicles in category '${category}':`);
  vehicles.forEach(v => {
    console.log(`- ${v.config.displayName}`);
  });
  
  return vehicles;
}

/**
 * 在main.ts中的集成示例
 */
export class VehicleSystemIntegration {
  private vehicleManager: VehicleManager;
  private currentVehicleConfig: any = null;
  
  constructor(private resourceManager: ResourceManager) {
    this.vehicleManager = getVehicleManager(resourceManager);
  }
  
  async initialize(): Promise<void> {
    await this.vehicleManager.initialize();
    console.log('Vehicle system ready');
  }
  
  /**
   * 显示车辆选择界面并返回选中的配置
   */
  async selectVehicle(): Promise<any> {
  return new Promise((resolve) => {
      const ui = new VehicleSelectionUI(this.vehicleManager, {
onVehicleSelected: (vehicleId: string) => {
  this.currentVehicleConfig = this.vehicleManager.getVehicleConfig(vehicleId);
        },
    onStartGame: () => {
      ui.hide();
 resolve(this.currentVehicleConfig);
        }
      });
    
      ui.show();
    });
  }
  
  /**
   * 获取当前车辆配置
   */
  getCurrentVehicle() {
    return this.currentVehicleConfig;
  }
  
  /**
   * 切换车辆（游戏中）
   */
  async switchVehicle(vehicleId: string): Promise<any> {
    const success = this.vehicleManager.selectVehicle(vehicleId);
    if (!success) {
      throw new Error(`Cannot switch to vehicle: ${vehicleId}`);
    }
    
    this.currentVehicleConfig = this.vehicleManager.getVehicleConfig(vehicleId);
    return this.currentVehicleConfig;
  }
}
