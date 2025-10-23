# 模块化初始化系统设计文档

## 概述

新的模块化初始化系统旨在解决以下问题：
1. **初始化依赖管理混乱**：不同模块的初始化顺序难以控制
2. **错误处理不一致**：缺乏统一的错误处理和降级机制
3. **main.ts 过于臃肿**：业务逻辑和实现细节混杂
4. **模块间耦合严重**：直接引用导致难以测试和维护

## 架构设计

### 核心组件

```
src/core/
├── InitializationManager.ts    # 初始化管理器（单例）
└── modules/         # 各功能模块
    ├── index.ts          # 模块导出
    ├── RenderModule.ts          # 渲染系统
├── ResourceModule.ts        # 资源加载
    ├── PhysicsModule.ts     # 物理引擎
    ├── VehicleModule.ts         # 车辆系统
    ├── RoadModule.ts     # 道路和环境
    ├── GpuModule.ts      # GPU加速
    └── UIModule.ts     # UI系统
```

### InitializationManager

**职责**：
- 注册和管理所有初始化模块
- 处理模块间依赖关系
- 提供事件通知机制
- 统一错误处理和状态管理

**核心API**：
```typescript
interface InitModule {
  name: string;
  phase: 'pending' | 'initializing' | 'ready' | 'error';
  dependencies?: string[];
  init(): Promise<void>;
  cleanup?(): void;
}

class InitializationManager {
  register(module: InitModule): void;
  on(listener: (event: InitEvent) => void): () => void;
  initModule(name: string): Promise<boolean>;
  initAll(): Promise<Map<string, boolean>>;
  getState(moduleName: string): InitPhase;
  getErrors(): Map<string, Error>;
}
```

**使用示例**：
```typescript
import InitializationManager from './core/InitializationManager';
import { RenderModule } from './core/modules';

const renderModule = new RenderModule();
InitializationManager.register(renderModule);

// 监听初始化事件
InitializationManager.on((event) => {
  console.log(`[${event.module}] ${event.phase}`);
});

// 初始化
await InitializationManager.initAll();
```

## 各模块说明

### 1. RenderModule（渲染模块）

**职责**：
- 创建Three.js场景、相机、渲染器
- 配置基础光照
- 处理窗口resize

**导出**：
- `scene: THREE.Scene`
- `camera: THREE.PerspectiveCamera`
- `renderer: THREE.WebGLRenderer`

### 2. ResourceModule（资源模块）

**职责**：
- 管理ResourceManager、GLTFLoader、AssetLoader
- 加载atlas列表等资源配置

**导出**：
- `resourceManager: ResourceManager`
- `gltfLoader: GLTFLoaderWrapper`
- `assetLoader: AssetLoader`

### 3. PhysicsModule（物理模块）

**职责**：
- 初始化物理引擎（Rapier/Fake）
- 支持运行时切换后端

**导出**：
- `physicsWorld: IPhysicsWorld`

**关键方法**：
```typescript
await physicsModule.switchBackend('fake', preservedState);
```

### 4. VehicleModule（车辆模块）

**依赖**：`physics`

**职责**：
- 创建车辆控制器
- 管理车辆状态

**导出**：
- `vehicle: VehicleControllerFast`
- `profile: VehicleProfile`

### 5. RoadModule（道路模块）

**依赖**：`render`, `resources`

**职责**：
- 创建RoadManager、RoadsideSpawner
- 初始化InstanceRenderer（可选）
- 管理道路更新

**导出**：
- `roadManager: RoadManager`
- `spawner: RoadsideSpawner`
- `instanceRenderer?: InstanceRenderer`

**关键方法**：
```typescript
roadModule.applyControlPoints(points, totalLength);
roadModule.update(worldZ, speed, dt);
```

### 6. GpuModule（GPU模块）

**职责**：
- 检测WebGPU可用性
- 收集adapter信息

**导出**：
- `isWebGpuAvailable: boolean`
- `adapterInfo: any`

**特点**：失败不阻塞应用启动（非关键模块）

### 7. UIModule（UI模块）

**职责**：
- 创建所有UI元素（HUD、控制面板、模态框）
- 处理用户交互回调

**配置示例**：
```typescript
const uiModule = new UIModule({
  onStart: () => { /* ... */ },
  onPause: () => { /* ... */ },
  onPhysicsChange: (backend) => { /* ... */ }
});
```

**关键方法**：
```typescript
uiModule.updateHUD(speed);
uiModule.showWarningsModal(true);
uiModule.showWebGpuModal(true);
```

## 使用指南

### 完整示例（main_modular.ts）

```typescript
import InitializationManager from './core/InitializationManager';
import { RenderModule, PhysicsModule, VehicleModule } from './core/modules';

class Application {
  private modules: any = {};

  async initialize() {
    // 1. 注册模块
    const renderModule = new RenderModule();
    InitializationManager.register(renderModule);

  const physicsModule = new PhysicsModule('rapier');
    InitializationManager.register(physicsModule);

    // 2. 初始化物理后创建车辆（因为有依赖）
    await InitializationManager.initModule('physics');
    const vehicleModule = new VehicleModule(physicsModule.physicsWorld);
    InitializationManager.register(vehicleModule);

    // 3. 初始化所有
    const results = await InitializationManager.initAll();

    // 4. 检查关键模块
    if (!results.get('render') || !results.get('physics')) {
      throw new Error('Critical modules failed');
    }

    // 5. 保存引用
    this.modules = { render: renderModule, physics: physicsModule, /* ... */ };
  }

  animate = () => {
    // 游戏循环
    this.modules.vehicle.vehicle.update(dt);
    this.modules.render.renderer.render(/* ... */);
    requestAnimationFrame(this.animate);
  };

  async start() {
    await this.initialize();
    this.animate();
  }
}

new Application().start();
```

### 迁移现有代码

1. **识别功能块**：将main.ts中的初始化代码按功能分组
2. **创建模块**：为每个功能创建对应的Module类
3. **声明依赖**：在`dependencies`数组中列出前置模块
4. **注册和初始化**：使用InitializationManager协调

### 调试和监控

```typescript
// 监听所有初始化事件
InitializationManager.on((event) => {
  if (event.phase === 'error') {
    console.error(`Module ${event.module} failed:`, event.error);
  }
});

// 查询模块状态
const state = InitializationManager.getState('physics'); // 'pending' | 'ready' | ...

// 获取所有错误
const errors = InitializationManager.getErrors();
errors.forEach((err, module) => {
  console.error(`${module}: ${err.message}`);
});
```

## 优势

1. **清晰的依赖管理**：通过`dependencies`显式声明，自动拓扑排序
2. **统一错误处理**：所有模块错误都通过事件通知，便于集中处理
3. **易于测试**：每个模块可独立测试，mock依赖模块
4. **解耦**：main.ts只负责组装和协调，不涉及具体实现
5. **可扩展**：新增功能只需创建新Module并注册
6. **优雅降级**：非关键模块失败不影响应用启动

## 最佳实践

1. **模块职责单一**：每个模块只负责一个领域
2. **最小化依赖**：尽量减少模块间依赖，优先使用事件通信
3. **异步友好**：init方法全部返回Promise
4. **错误不静默**：初始化失败要明确抛出或记录
5. **提供cleanup**：实现cleanup方法以支持热重载和测试

## 后续改进方向

1. **配置文件驱动**：从JSON/YAML加载模块配置
2. **热重载支持**：开发模式下支持模块热替换
3. **性能监控**：记录每个模块初始化耗时
4. **延迟加载**：非关键模块可按需异步加载
5. **插件系统**：支持第三方插件注册为模块

## 参考

- 现有实现：`src/main.ts`（传统方式）
- 新架构示例：`src/main_modular.ts`
- 模块目录：`src/core/modules/`
