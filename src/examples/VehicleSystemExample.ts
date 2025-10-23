/**
 * ����ϵͳʹ��ʾ��
 * չʾ��μ��ɳ���ѡ��UI�ͳ���������
 */

import { VehicleManager, getVehicleManager } from './core/VehicleManager';
import { VehicleSelectionUI } from './ui/VehicleSelectionUI';
import type { ResourceManager } from './core/ResourceManager';

/**
 * ʾ��������Ϸ��ʼǰ��ʾ����ѡ�����
 */
export async function showVehicleSelection(
  resourceManager: ResourceManager,
  onStartGame: (vehicleConfig: any) => void
): Promise<void> {
  try {
    // 1. ��ȡ����������ʵ��
    const vehicleManager = getVehicleManager(resourceManager);
    
// 2. ��ʼ���������������������г������ã�
    await vehicleManager.initialize();
    console.log('Vehicle system initialized');
    
    // 3. ��������ѡ��UI
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
    
    // 4. ��ʾUI
    vehicleUI.show();
    
  } catch (error) {
    console.error('Failed to show vehicle selection:', error);
    throw error;
  }
}

/**
 * ʾ����ֱ�Ӽ����ض�����
 */
export async function loadVehicleDirectly(
  resourceManager: ResourceManager,
vehicleId: string = 'city_car_01'
): Promise<any> {
  const vehicleManager = getVehicleManager(resourceManager);
  
  // ��ʼ��
  await vehicleManager.initialize();
  
  // ѡ����
  const success = vehicleManager.selectVehicle(vehicleId);
  if (!success) {
    throw new Error(`Failed to select vehicle: ${vehicleId}`);
  }
  
  // ��ȡ����
  const config = vehicleManager.getSelectedVehicle();
  console.log('Loaded vehicle config:', config);
  
  // ����3Dģ��
  const model = await vehicleManager.loadVehicleModel(vehicleId);
  console.log('Loaded vehicle model:', model);
  
  return {
    config,
    model
  };
}

/**
 * ʾ������ȡ�����ĳ����б�
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
 * ʾ���������ɸѡ����
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
 * ��main.ts�еļ���ʾ��
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
   * ��ʾ����ѡ����沢����ѡ�е�����
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
   * ��ȡ��ǰ��������
   */
  getCurrentVehicle() {
    return this.currentVehicleConfig;
  }
  
  /**
   * �л���������Ϸ�У�
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
