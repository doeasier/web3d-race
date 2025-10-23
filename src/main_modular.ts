/**
 * Ӧ�ó������ - ʹ��ģ�黯��ʼ��ϵͳ�ļ�ʾ��
 * 
 * ����ļ�չʾ�����ʹ���µĳ�ʼ��ϵͳ����֯Ӧ����������
 */

// @ts-nocheck
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
import { InputManager } from './core/InputManager';
import * as THREE from 'three';

/**
 * Ӧ������ - Э����ģ�鲢������Ϸѭ��
 */
class Application {
  private initManager = InitializationManager;
  private modules: any = {};
  private input!: InputManager;
  private running = true;
  private worldZ = 0;

  async initialize(): Promise<void> {
    console.log('Application: starting initialization...');

    // 1. ������Ⱦģ��
    const renderModule = new RenderModule();
    this.initManager.register(renderModule);

    // 2. ������Դģ��
    const resourceModule = new ResourceModule();
    this.initManager.register(resourceModule);

    // 3. ��������ģ��
    const physicsModule = new PhysicsModule('rapier');
    this.initManager.register(physicsModule);

    // 4. ��������ģ�飨��������
    await this.initManager.initModule('physics'); // �ȳ�ʼ������
    const vehicleModule = new VehicleModule(physicsModule.physicsWorld);
    this.initManager.register(vehicleModule);

    // 5. ������·ģ�飨������Ⱦ����Դ��
    await this.initManager.initModule('render');
    await this.initManager.initModule('resources');

    // ������·����
    const roadTexture = await this.loadRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture });

    const roadModule = new RoadModule(
renderModule.scene,
    renderModule.camera,
      roadMat,
  resourceModule.assetLoader
    );
    this.initManager.register(roadModule);

    // 6. ����GPUģ�飨��ѡ����������
    const gpuModule = new GpuModule();
    this.initManager.register(gpuModule);

    // 7. ����UIģ��
    const uiModule = new UIModule({
      onStart: () => { this.running = true; },
      onPause: () => { this.running = false; },
      onPhysicsChange: (backend) => this.switchPhysics(backend),
      // ... �����ص�
    });
 this.initManager.register(uiModule);

    // ������ʼ���¼�
    this.initManager.on((event) => {
      console.log(`[Init] ${event.module}: ${event.phase}`, event.error || '');
      
      // ����UI״̬
      if (event.module === 'gpu' && event.phase === 'ready') {
    const gpu = this.modules.gpu as GpuModule;
    uiModule.webgpuStatus.textContent = gpu.isWebGpuAvailable 
          ? 'WebGPU: available (click details)'
          : 'WebGPU: not available';
      uiModule.webgpuContent.textContent = gpu.getAdapterInfoJson();
      }
    });

    // ��ʼ������ģ��
    const results = await this.initManager.initAll();

    // ���ؼ�ģ���Ƿ�ɹ�
    const criticalModules = ['render', 'physics', 'vehicle'];
    const allCriticalOk = criticalModules.every(m => results.get(m));

    if (!allCriticalOk) {
      console.error('Application: critical modules failed to initialize');
      const errors = this.initManager.getErrors();
      errors.forEach((err, module) => {
        console.error(`  - ${module}: ${err.message}`);
      });
      throw new Error('Failed to initialize critical modules');
    }

    // ����ģ������
    this.modules.render = renderModule;
    this.modules.resource = resourceModule;
    this.modules.physics = physicsModule;
    this.modules.vehicle = vehicleModule;
    this.modules.road = roadModule;
    this.modules.gpu = gpuModule;
    this.modules.ui = uiModule;

    // �������������
    this.input = new InputManager();

    console.log('Application: initialization complete');
  }

  /**
   * ����ʱ�л�������
   */
  private async switchPhysics(backend: string): Promise<void> {
    try {
   const vehicleState = this.modules.vehicle.vehicle?.getState();
      
   await this.modules.physics.switchBackend(backend as any);
      
      // ���´���vehicle
      this.modules.vehicle = new VehicleModule(
        this.modules.physics.physicsWorld,
        this.modules.vehicle.profile
      );
await this.modules.vehicle.init();
      
      // �ָ�״̬
    if (vehicleState) {
    this.modules.vehicle.reset({
        position: vehicleState.position,
       rotation: { x: 0, y: vehicleState.rotation.y, z: 0 }
        });
      }

      console.log(`Application: switched to ${backend} physics`);
    } catch (e) {
      console.error('Application: physics switch failed', e);
    }
  }

  /**
   * ���ص�·�����򻯰棩
   */
  private async loadRoadTexture(): Promise<THREE.Texture> {
    // ������Դ�ResourceModule���أ���ʹ�ó�������
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 8);
    return texture;
  }

  /**
   * ��Ϸ��ѭ��
   */
  private lastTime = performance.now();

  animate = (): void => {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.input.update(dt);

    if (this.running) {
      const inputState = this.input.getInput();

 // ���³���
      const vehicle = this.modules.vehicle.vehicle;
    const physics = this.modules.physics.physicsWorld;

  if (vehicle && physics) {
        try {
          vehicle.setInput(inputState);
          if (typeof physics.clearAppliedFlags === 'function') {
      physics.clearAppliedFlags();
       }
          vehicle.update(dt);
   physics.step(dt);
          if (typeof vehicle.postPhysicsSync === 'function') {
            vehicle.postPhysicsSync(dt);
          }
        } catch (e) {
      console.error('Application: update loop error', e);
   }

        // ����worldZ
      const state = vehicle.getState();
        if (typeof vehicle.getTravelledDistance === 'function') {
          this.worldZ = vehicle.getTravelledDistance();
    } else {
          this.worldZ += (state.speed || 0) * dt;
        }

        // ���µ�·
   if (this.modules.road) {
          this.modules.road.update(this.worldZ, state.speed, dt);
        }

      // ����UI
        if (this.modules.ui) {
     this.modules.ui.updateHUD(state.speed);
        }
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
   * ����Ӧ��
   */
  async start(): Promise<void> {
    await this.initialize();
    this.animate();
  }

  /**
   * ����
   */
  cleanup(): void {
    this.initManager.cleanup();
  }
}

// ����Ӧ��
const app = new Application();

app.start().catch(error => {
  console.error('Application: fatal error', error);
  document.body.innerHTML = `
    <div style="color: red; padding: 20px; font-family: monospace;">
    <h2>Application Failed to Start</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>
  `;
});

// ����������ʹ��
(window as any).app = app;
