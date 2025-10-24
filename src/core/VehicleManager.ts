import type { VehicleConfig, VehicleManifest, VehicleLoadState } from './VehicleConfig';
import type { ResourceManager } from './ResourceManager';

export class VehicleManager {
  private manifest: VehicleManifest | null = null;
  private vehicles: Map<string, VehicleLoadState> = new Map();
  private selectedVehicleId: string | null = null;
  private basePath = '/assets/vehicles/';
  
  constructor(private resourceManager?: ResourceManager) {}

  async initialize(): Promise<void> {
    const response = await fetch(this.basePath + 'vehicles.json');
    this.manifest = await response.json();
    await this.loadAllConfigs();
    if (this.manifest?.defaultVehicle) this.selectedVehicleId = this.manifest.defaultVehicle;
  }

  private async loadAllConfigs(): Promise<void> {
    if (!this.manifest) return;
    const promises = this.manifest.vehicles.map(async (f) => {
      const r = await fetch(this.basePath + f);
      const c: VehicleConfig = await r.json();
      this.vehicles.set(c.id, { config: c, isLoaded: false, isUnlocked: !c.unlockRequirements || (c.unlockRequirements.level || 0) <= 1 });
    });
    await Promise.all(promises);
  }

  getAllVehicles() { return Array.from(this.vehicles.values()); }
  getUnlockedVehicles() { return this.getAllVehicles().filter(v => v.isUnlocked); }
  getVehiclesByCategory(cat: string) { return this.getAllVehicles().filter(v => v.config.category === cat); }
  getVehicleConfig(id: string) { return this.vehicles.get(id)?.config || null; }
  getSelectedVehicle() { return this.selectedVehicleId ? this.getVehicleConfig(this.selectedVehicleId) : null; }
  selectVehicle(id: string) { const v = this.vehicles.get(id); if (v && v.isUnlocked) { this.selectedVehicleId = id; return true; } return false; }
  async loadVehicleModel(id: string) { const v = this.vehicles.get(id); if (!v) throw new Error('Vehicle not found'); if (v.model) return v.model; if (this.resourceManager) { const g = await this.resourceManager.loadGLTF(v.config.modelPath); v.model = g?.scene; v.isLoaded = true; return v.model; } throw new Error('No ResourceManager'); }
  getCategoryInfo(c: string) { return this.manifest?.categories?.[c] || null; }
  getAllCategories() { return this.manifest?.categories || {}; }
  unlockVehicle(id: string) { const v = this.vehicles.get(id); if (v) { v.isUnlocked = true; return true; } return false; }
 cleanup() { this.vehicles.clear(); this.manifest = null; this.selectedVehicleId = null; }
}

let instance: VehicleManager | null = null;
export function getVehicleManager(rm?: ResourceManager) { if (!instance) instance = new VehicleManager(rm); return instance; }
export function resetVehicleManager() { instance?.cleanup(); instance = null; }
