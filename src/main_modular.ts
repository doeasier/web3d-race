/**
 * 应用程序入口 - 使用模块化初始化系统的简化示例
 * 
 * 这个文件展示了如何使用新的初始化系统来组织应用启动流程
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
 * 应用主类 - 协调各模块并处理游戏循环
 */
class Application {
  private initManager = InitializationManager;
  private modules: any = {};
  private input!: InputManager;
  private running = true;
  private worldZ = 0;

  async initialize(): Promise<void> {
    console.log('Application: starting initialization...');

    // 1. 创建渲染模块
    const renderModule = new RenderModule();
    this.initManager.register(renderModule);

    // 2. 创建资源模块
    const resourceModule = new ResourceModule();
    this.initManager.register(resourceModule);

    // 3. 创建物理模块
    const physicsModule = new PhysicsModule('rapier');
    this.initManager.register(physicsModule);

    // 4. 创建车辆模块（依赖物理）
    await this.initManager.initModule('physics'); // 先初始化物理
    const vehicleModule = new VehicleModule(physicsModule.physicsWorld);
    this.initManager.register(vehicleModule);

    // 5. 创建道路模块（依赖渲染和资源）
    await this.initManager.initModule('render');
    await this.initManager.initModule('resources');

    // 创建道路材质
    const roadTexture = await this.loadRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture });

    const roadModule = new RoadModule(
renderModule.scene,
    renderModule.camera,
      roadMat,
  resourceModule.assetLoader
    );
    this.initManager.register(roadModule);

    // 6. 创建GPU模块（可选，不阻塞）
    const gpuModule = new GpuModule();
    this.initManager.register(gpuModule);

    // 7. 创建UI模块
    const uiModule = new UIModule({
      onStart: () => { this.running = true; },
      onPause: () => { this.running = false; },
      onPhysicsChange: (backend) => this.switchPhysics(backend),
      // ... 其他回调
    });
 this.initManager.register(uiModule);

    // 监听初始化事件
    this.initManager.on((event) => {
      console.log(`[Init] ${event.module}: ${event.phase}`, event.error || '');
      
      // 更新UI状态
      if (event.module === 'gpu' && event.phase === 'ready') {
    const gpu = this.modules.gpu as GpuModule;
    uiModule.webgpuStatus.textContent = gpu.isWebGpuAvailable 
          ? 'WebGPU: available (click details)'
          : 'WebGPU: not available';
      uiModule.webgpuContent.textContent = gpu.getAdapterInfoJson();
      }
    });

    // 初始化所有模块
    const results = await this.initManager.initAll();

    // 检查关键模块是否成功
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

    // 保存模块引用
    this.modules.render = renderModule;
    this.modules.resource = resourceModule;
    this.modules.physics = physicsModule;
    this.modules.vehicle = vehicleModule;
    this.modules.road = roadModule;
    this.modules.gpu = gpuModule;
    this.modules.ui = uiModule;

    // 创建输入管理器
    this.input = new InputManager();

    console.log('Application: initialization complete');
  }

  /**
   * 运行时切换物理后端
   */
  private async switchPhysics(backend: string): Promise<void> {
    try {
   const vehicleState = this.modules.vehicle.vehicle?.getState();
      
   await this.modules.physics.switchBackend(backend as any);
      
      // 重新创建vehicle
      this.modules.vehicle = new VehicleModule(
        this.modules.physics.physicsWorld,
        this.modules.vehicle.profile
      );
await this.modules.vehicle.init();
      
      // 恢复状态
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
   * 加载道路纹理（简化版）
   */
  private async loadRoadTexture(): Promise<THREE.Texture> {
    // 这里可以从ResourceModule加载，或使用程序化生成
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
   * 游戏主循环
   */
  private lastTime = performance.now();

  animate = (): void => {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.input.update(dt);

    if (this.running) {
      const inputState = this.input.getInput();

 // 更新车辆
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

        // 更新worldZ
      const state = vehicle.getState();
        if (typeof vehicle.getTravelledDistance === 'function') {
          this.worldZ = vehicle.getTravelledDistance();
    } else {
          this.worldZ += (state.speed || 0) * dt;
        }

        // 更新道路
   if (this.modules.road) {
          this.modules.road.update(this.worldZ, state.speed, dt);
        }

      // 更新UI
        if (this.modules.ui) {
     this.modules.ui.updateHUD(state.speed);
        }
      }
    }

    // 渲染
    if (this.modules.render) {
      this.modules.render.renderer.render(
        this.modules.render.scene,
        this.modules.render.camera
  );
    }

    requestAnimationFrame(this.animate);
  };

  /**
   * 启动应用
   */
  async start(): Promise<void> {
    await this.initialize();
    this.animate();
  }

  /**
   * 清理
   */
  cleanup(): void {
    this.initManager.cleanup();
  }
}

// 启动应用
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

// 导出供调试使用
(window as any).app = app;
