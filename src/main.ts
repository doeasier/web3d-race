/**
 * Ӧ������� - ģ�黯�ܹ��汾
 * 
 * ����汾ʹ���µ�InitializationManager��ģ��ϵͳ
 * ԭʼ�汾�ѱ��ݵ� main_legacy.ts
 */

// @ts-nocheck
import * as THREE from 'three';
import InitializationManager from './core/InitializationManager';
import {
  RenderModule,
  ResourceModule,
  PhysicsModule,
  VehicleModule,
  RoadModule,
  GpuModule,
  UIModule
} from './core/modules';
import { TextureModule } from './core/modules/TextureModule';
import { SceneModule } from './core/modules/SceneModule';
import { InputManager } from './core/InputManager';
import { EngineFactory } from './core/EngineFactory';
import { VehicleControllerPrecise } from './gameplay/VehicleControllerPrecise';

/**
 * Ӧ������
 */
class RacingGameApp {
  private initManager = InitializationManager;
  private modules: any = {};
  private input!: InputManager;
  private engineFactory!: EngineFactory;
  
  // ��Ϸ״̬
 private running = true;
  private paused = false;
  private worldZ = 0;
  private currentLevel = 0;
  private levels = [
    { name: 'City', sceneUrl: '/assets/levels/level_city.json' },
    { name: 'Canyon', sceneUrl: '/assets/levels/level_canyon.json' }
  ];

  // ����洢
  private WARNINGS_STORAGE_KEY = 'levelLoadWarnings';

  /**
   * ��ʼ������ģ��
   */
  async initialize(): Promise<void> {
    console.log('=== RacingGameApp: Starting Initialization ===');
    
    try {
      // 1. ��Ⱦģ��
      const renderModule = new RenderModule();
      this.initManager.register(renderModule);
await this.initManager.initModule('render');

      // 2. ����ģ��
   const textureModule = new TextureModule();
      this.initManager.register(textureModule);
      await this.initManager.initModule('textures');

// 3. ����ģ�飨��ա����桢����ռλ��
      const sceneModule = new SceneModule(
   renderModule.scene,
        textureModule.carTexture,
        textureModule.skyTexture
      );
      this.initManager.register(sceneModule);
await this.initManager.initModule('scene');

  // 4. ��Դģ��
      const resourceModule = new ResourceModule();
      this.initManager.register(resourceModule);
      await this.initManager.initModule('resources');

   // 5. ����ģ��
  const physicsModule = new PhysicsModule('rapier');
      this.initManager.register(physicsModule);
      await this.initManager.initModule('physics');

      // 6. ����ģ��
      // ʹ��Ĭ�ϳ�������
const { DefaultCityCar } = await import('./gameplay/VehicleProfile');
      const vehicleModule = new VehicleModule(physicsModule.physicsWorld, DefaultCityCar);
      this.initManager.register(vehicleModule);
  await this.initManager.initModule('vehicle');

      // 7. ��·ģ��
      const roadMat = new THREE.MeshStandardMaterial({ map: textureModule.roadTexture });
      const roadModule = new RoadModule(
      renderModule.scene,
        renderModule.camera,
 roadMat,
        resourceModule.assetLoader,
        6, // roadWidth
 {
          segmentLength: 50,
          numSegments: 12,
          textureRepeatY: 8,
 scrollFactor: 0.2,
          roadOffset: 0,
     controlPoints: [
            { x: 0, z: 0 },
     { x: 6, z: 120 },
     { x: -4, z: 260 },
       { x: 0, z: 400 },
        { x: 8, z: 560 }
          ],
  closed: false
        }
      );
      this.initManager.register(roadModule);
      await this.initManager.initModule('road');

      // 8. GPUģ�飨��ѡ��
      const gpuModule = new GpuModule();
      this.initManager.register(gpuModule);
   await this.initManager.initModule('gpu');

      // 9. UIģ��
      const uiModule = new UIModule({
      onStart: () => this.handleStart(),
        onPause: () => this.handlePause(),
        onPrevLevel: () => this.handlePrevLevel(),
        onNextLevel: () => this.handleNextLevel(),
  onModeChange: (mode) => this.handleModeChange(mode),
        onPhysicsChange: (backend) => this.handlePhysicsChange(backend),
      onTrackChange: (trackFile) => this.handleTrackChange(trackFile),
        onExportTextures: () => this.handleExportTextures()
      });
      this.initManager.register(uiModule);
      await this.initManager.initModule('ui');

      // ����ģ������
  this.modules = {
   render: renderModule,
   textures: textureModule,
        scene: sceneModule,
        resource: resourceModule,
    physics: physicsModule,
        vehicle: vehicleModule,
    road: roadModule,
        gpu: gpuModule,
        ui: uiModule
};

      // �����������
      this.input = new InputManager();
      this.engineFactory = new EngineFactory(resourceModule.resourceManager);

      // ����WebGPU UI
 if (gpuModule.isWebGpuAvailable) {
        uiModule.webgpuStatus.textContent = 'WebGPU: available (click details)';
        uiModule.webgpuContent.textContent = gpuModule.getAdapterInfoJson();
      } else {
        uiModule.webgpuStatus.textContent = 'WebGPU: not available';
      }

      // ��������״̬
      uiModule.physStatus.textContent = 'Physics: Rapier initialized';

 // ���س־û��ľ���
      this.loadPersistedWarnings();

      // ���ؿ��ù��
      await this.loadTracks();

  // ������ʼ���¼�
      this.initManager.on((event) => {
        console.log(`[Init] ${event.module}: ${event.phase}`, event.error || '');
        
   // �������������UI�����߼�
    if (event.phase === 'error') {
console.error(`Module ${event.module} failed:`, event.error);
        }
});

   console.log('=== RacingGameApp: Initialization Complete ===');
    } catch (error) {
      console.error('RacingGameApp: Fatal initialization error', error);
  this.showFatalError(error);
    throw error;
    }
  }

  /**
   * ��Ϸ��ѭ��
   */
private lastTime = performance.now();
  
  private animate = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = now;

    // ��������
 this.input.update(dt);

    if (this.running && !this.paused) {
      try {
    const inputState = this.input.getInput();
        const vehicle = this.modules.vehicle.vehicle;
        const physics = this.modules.physics.physicsWorld;

   if (vehicle && physics) {
     // ���³���
  vehicle.setInput(inputState);
          
          if (typeof physics.clearAppliedFlags === 'function') {
   physics.clearAppliedFlags();
 }
    
     vehicle.update(dt);
      physics.step(dt);

          if (typeof vehicle.postPhysicsSync === 'function') {
            vehicle.postPhysicsSync(dt);
        }

          // ����worldZ
          const state = vehicle.getState();
   if (typeof vehicle.getTravelledDistance === 'function') {
 this.worldZ = vehicle.getTravelledDistance();
          } else {
        this.worldZ += (state.speed || 0) * dt;
          }

     // ���µ�·
     this.modules.road.update(this.worldZ, state.speed, dt);

 // ����HUD
    this.modules.ui.updateHUD(state.speed);

          // ���³�������λ�ã����ʹ��ռλmesh��
  if (this.modules.scene.carMesh && state.position) {
      this.modules.scene.carMesh.position.set(
      state.position.x || 0,
   state.position.y || 0.25,
   state.position.z || 0
    );
     
            if (state.rotation) {
           this.modules.scene.carMesh.rotation.y = state.rotation.y || 0;
        }
}
        }
      } catch (e) {
        console.error('RacingGameApp: update error', e);
}
    }

  // ��Ⱦ
    if (this.modules.render) {
      this.modules.render.renderer.render(
        this.modules.render.scene,
        this.modules.render.camera
      );
    }

    requestAnimationFrame(this.animate);
  };

  /**
   * �¼�������
   */
  private handleStart(): void {
    this.running = true;
    this.paused = false;
    console.log('Game started');
  }

  private handlePause(): void {
    this.paused = !this.paused;
 console.log('Game paused:', this.paused);
  }

  private async handlePrevLevel(): Promise<void> {
    this.currentLevel = (this.currentLevel - 1 + this.levels.length) % this.levels.length;
    await this.loadLevel(this.currentLevel);
  }

  private async handleNextLevel(): Promise<void> {
 this.currentLevel = (this.currentLevel + 1) % this.levels.length;
    await this.loadLevel(this.currentLevel);
  }

  private async handleModeChange(mode: string): Promise<void> {
    console.log('Mode change:', mode);
    
    if (mode === 'precise') {
      // �л�����ȷģʽ
      const state = this.modules.vehicle.vehicle?.getState();
      
      // ���´���vehicle
     const profile = this.modules.vehicle.getProfile();
      const preciseVehicle = new VehicleControllerPrecise(
        this.modules.physics.physicsWorld,
        {
         mass: profile.mass,
         wheelRadius: profile.wheelRadius,
         maxSteerAngle: profile.maxSteerAngle
        },
       profile
  );
  
      this.modules.vehicle.vehicle = preciseVehicle;
      
      // �ָ�״̬
      if (state) {
        preciseVehicle.reset({
   position: state.position,
          rotation: { x: 0, y: state.rotation?.y || 0, z: 0 }
        });
      }
    } else {
  // �л���fastģʽ - ���³�ʼ��vehicleģ��
      await this.modules.vehicle.init();
}
  }

  private async handlePhysicsChange(backend: string): Promise<void> {
    try {
      this.modules.ui.physStatus.textContent = `Physics: switching to ${backend}...`;
 
      const vehicleState = this.modules.vehicle.vehicle?.getState();
      
      await this.modules.physics.switchBackend(backend as any);
  
      // ���´���vehicle
     // ���浱ǰ����
     const currentProfile = this.modules.vehicle.getProfile();
     
     // ���´���vehicleģ��
     this.modules.vehicle = new VehicleModule(
       this.modules.physics.physicsWorld,
       currentProfile
     );
      await this.modules.vehicle.init();
      
      // �ָ�״̬
      if (vehicleState) {
   this.modules.vehicle.reset({
  position: vehicleState.position,
          rotation: { x: 0, y: vehicleState.rotation?.y || 0, z: 0 }
  });
      }

      this.modules.ui.physStatus.textContent = `Physics: ${backend} initialized`;
   console.log(`Physics backend switched to ${backend}`);
    } catch (e) {
      console.error('Physics switch failed:', e);
    this.modules.ui.physStatus.textContent = 'Physics: switch failed';
    }
  }

  private async handleTrackChange(trackFile: string): Promise<void> {
    try {
      const res = await fetch(`/assets/tracks/${trackFile}`);
    const trackData = await res.json();
      
if (trackData.controlPoints) {
        this.modules.road.applyControlPoints(trackData.controlPoints, 500);
      }

      // ���غ決����
      if (trackData.bakedSceneryUrl && this.modules.road.spawner) {
        try {
 if (typeof (this.modules.road.spawner as any).loadBakedFromUrl === 'function') {
  await (this.modules.road.spawner as any).loadBakedFromUrl(
          trackData.bakedSceneryUrl,
       this.modules.resource.resourceManager
            );
  console.log('Loaded baked scenery:', trackData.bakedSceneryUrl);
  }
     } catch (e) {
          console.warn('Failed to load baked scenery:', e);
    }
      }

      // ��ʾƽ����б��
      if (trackData.controlPoints) {
const avg = trackData.controlPoints.reduce((s: any, p: any) => 
s + (p.bank || 0), 0) / trackData.controlPoints.length;
        this.modules.ui.bankLabel.textContent = `Avg bank: ${avg.toFixed(2)}��`;
  }

  // ���ó���λ��
      if (trackData.startPositions && trackData.startPositions[0]) {
        const sp = trackData.startPositions[0];
     this.modules.vehicle.reset({
      position: { x: sp.position[0], y: sp.position[1], z: sp.position[2] },
          rotation: { x: 0, y: sp.rotation[1] || 0, z: 0 }
        });
      }
    } catch (e) {
      console.warn('Failed to load track:', e);
    }
  }

  private handleExportTextures(): void {
    const texModule = this.modules.textures as TextureModule;
    
    ['car', 'road', 'sky'].forEach((type: any) => {
const dataUrl = texModule.exportTexture(type);
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `${type}_texture.png`;
link.href = dataUrl;
        link.click();
      }
    });
    
    console.log('Textures exported');
  }

  /**
   * ���عؿ�
   */
  private async loadLevel(idx: number): Promise<void> {
    const ui = this.modules.ui;
    
    try {
      const level = this.levels[idx];
      ui.loadStatus.textContent = `Level: loading ${level.name}...`;
      ui.loadStatus.style.color = 'white';
ui.warningsContainer.innerHTML = '';
   ui.modalContent.innerHTML = '';

      const ctx = {
        scene: this.modules.render.scene,
        vehicle: this.modules.vehicle.vehicle,
        carMeshRef: { value: this.modules.scene.carMesh },
        gltfLoader: this.modules.resource.gltfLoader,
     assetLoader: this.modules.resource.assetLoader,
        spawner: this.modules.road.spawner
      };

      const res = await this.engineFactory.loadAndApplyLevel(level.sceneUrl, ctx);
      console.log('Loaded level result:', res);

  // ����UI
      if (res.warnings && res.warnings.length) {
        ui.warningsContainer.innerHTML = '<b>Warnings:</b><br/>' + 
        res.warnings.map(w => `<div>- ${w}</div>`).join('');
        ui.modalContent.innerHTML = ui.warningsContainer.innerHTML;
  }

      if (res.errors && res.errors.length) {
    ui.warningsContainer.innerHTML += '<div style="color:#ff6b6b"><b>Errors:</b></div>' + 
          res.errors.map(e => `<div style="color:#ff6b6b">- ${e}</div>`).join('');
        ui.modalContent.innerHTML = ui.warningsContainer.innerHTML;
      }

      // �־û�����
      if ((res.warnings && res.warnings.length) || (res.errors && res.errors.length)) {
     this.saveWarningsToStorage(res.warnings, res.errors);
      }

      if (res.partial) {
ui.loadStatus.textContent = `Level: ${level.name} loaded (partial)`;
        ui.loadStatus.style.color = '#ffd966';
  ui.showWarningsModal(true);
      } else {
 ui.loadStatus.textContent = `Level: ${level.name} loaded`;
        ui.loadStatus.style.color = 'lightgreen';
      }

// ����carMesh����
  if (ctx.carMeshRef && ctx.carMeshRef.value) {
        this.modules.scene.carMesh = ctx.carMeshRef.value;
        this.modules.scene.fitModelToVehicle(ctx.carMeshRef.value as any);
      }
    } catch (e) {
      console.error('Failed to load level:', e);
      ui.loadStatus.textContent = 'Level: failed to load';
      ui.loadStatus.style.color = '#ff6b6b';
      ui.warningsContainer.innerHTML = `<div style="color:#ff6b6b">${(e as Error)?.message ?? String(e)}</div>`;
      ui.modalContent.innerHTML = ui.warningsContainer.innerHTML;
      this.saveWarningsToStorage([], [(e as Error)?.message ?? String(e)]);
      ui.showWarningsModal(true);
    }
  }

  /**
   * ���ؿ��ù��
   */
  private async loadTracks(): Promise<void> {
    const trackList = ['desert_run.json', 'canyon_circuit.json'];
    const select = this.modules.ui.trackSelect;

    for (const name of trackList) {
      try {
        const res = await fetch(`/assets/tracks/${name}`);
        if (!res.ok) continue;
        
  const trackData = await res.json();
        const opt = document.createElement('option');
        opt.value = name;
      opt.text = `${trackData.name} (${trackData.recommendedMode || 'mixed'})`;
      select.appendChild(opt);
      } catch (e) {
        console.warn(`Failed to load track ${name}:`, e);
      }
    }

  if (select.options.length > 0) {
      select.selectedIndex = 0;
    }
  }

  /**
* ����־û�
   */
  private saveWarningsToStorage(warns: string[] | undefined, errs: string[] | undefined): void {
    try {
      const payload = {
        warnings: warns || [],
  errors: errs || [],
        updated: Date.now()
      };
  localStorage.setItem(this.WARNINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save warnings:', e);
  }
  }

  private loadPersistedWarnings(): void {
    try {
const raw = localStorage.getItem(this.WARNINGS_STORAGE_KEY);
      if (!raw) return;

      const persisted = JSON.parse(raw);
      const ui = this.modules.ui;

      if (persisted.warnings && persisted.warnings.length) {
        ui.warningsContainer.innerHTML = '<b>Saved warnings:</b><br/>' + 
      persisted.warnings.map((w: string) => `<div>- ${w}</div>`).join('');
      ui.modalContent.innerHTML = ui.warningsContainer.innerHTML;
      }

      if (persisted.errors && persisted.errors.length) {
        ui.warningsContainer.innerHTML += '<div style="color:#ff6b6b"><b>Saved errors:</b></div>' + 
      persisted.errors.map((e: string) => `<div style="color:#ff6b6b">- ${e}</div>`).join('');
        ui.modalContent.innerHTML = ui.warningsContainer.innerHTML;
      }

      if ((persisted.warnings && persisted.warnings.length) || 
 (persisted.errors && persisted.errors.length)) {
        ui.loadStatus.textContent = 'Level: idle (saved warnings)';
   ui.loadStatus.style.color = '#ffd966';
      }
 } catch (e) {
      console.warn('Failed to load persisted warnings:', e);
    }
  }

/**
   * ��ʾ��������
   */
  private showFatalError(error: any): void {
    document.body.innerHTML = `
 <div style="color: red; padding: 20px; font-family: monospace; background: #1a1a1a;">
        <h2>Application Failed to Start</h2>
      <pre style="background: #2a2a2a; padding: 10px; border-radius: 4px;">
${error.message || String(error)}

${error.stack || ''}
</pre>
      <p>Check the console for more details.</p>
   <button onclick="location.reload()">Reload</button>
      </div>
  `;
  }

  /**
   * ����Ӧ��
   */
  async start(): Promise<void> {
    await this.initialize();
    this.animate();
    console.log('RacingGameApp: Running');
  }

  /**
   * ����
   */
  cleanup(): void {
 this.running = false;
this.initManager.cleanup();
    console.log('RacingGameApp: Cleaned up');
  }
}

// ����Ӧ��
const app = new RacingGameApp();

app.start().catch((error) => {
  console.error('=== RacingGameApp: Fatal Error ===');
  console.error(error);
});

// ����������ʹ��
(window as any).app = app;
(window as any).InitializationManager = InitializationManager;

console.log('=== Racing Game (Modular) ===');
console.log('Debug: window.app, window.InitializationManager');
