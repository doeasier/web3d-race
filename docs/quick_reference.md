# 模块化架构速查卡

## 快速开始

```typescript
// 1. 导入
import InitializationManager from './core/InitializationManager';
import { RenderModule, PhysicsModule } from './core/modules';

// 2. 创建应用类
class MyApp {
  async initialize() {
    const render = new RenderModule();
    InitializationManager.register(render);
    await InitializationManager.initModule('render');
    
    // ... 注册其他模块
  }

  animate = () => { /* 游戏循环 */ };
  
  async start() {
    await this.initialize();
    this.animate();
  }
}

// 3. 启动
new MyApp().start();
```

## 9个核心模块

| 模块 | 职责 | 依赖 | 文件 |
|------|------|------|------|
| **RenderModule** | 场景/相机/渲染器 | - | `RenderModule.ts` |
| **TextureModule** | 纹理管理 | - | `TextureModule.ts` |
| **SceneModule** | 场景对象 | render, textures | `SceneModule.ts` |
| **ResourceModule** | 资源加载 | - | `ResourceModule.ts` |
| **PhysicsModule** | 物理引擎 | - | `PhysicsModule.ts` |
| **VehicleModule** | 车辆控制 | physics | `VehicleModule.ts` |
| **RoadModule** | 道路系统 | render, resources | `RoadModule.ts` |
| **GpuModule** | GPU加速 | - | `GpuModule.ts` |
| **UIModule** | 用户界面 | - | `UIModule.ts` |

## 常用API

### InitializationManager

```typescript
// 注册模块
InitializationManager.register(module);

// 初始化单个模块
await InitializationManager.initModule('moduleName');

// 初始化所有模块
await InitializationManager.initAll();

// 监听事件
InitializationManager.on((event) => {
  console.log(event.module, event.phase);
});

// 查询状态
const state = InitializationManager.getState('physics');
const errors = InitializationManager.getErrors();
```

### 创建自定义模块

```typescript
import { InitModule } from './core/InitializationManager';

export class MyModule implements InitModule {
  name = 'myModule';
phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';
  dependencies = ['render', 'physics']; // 可选

  async init(): Promise<void> {
 // 初始化代码
  console.log('MyModule initialized');
  }

  cleanup(): void {
  // 清理代码
  }
}
```

## 调试技巧

### 浏览器控制台

```javascript
// 访问应用实例
> app
RacingGameApp { ... }

// 访问模块
> app.modules.physics.physicsWorld
RapierPhysicsWorldImpl { ... }

// 查看初始化状态
> InitializationManager.getState('vehicle')
'ready'

// 查看所有错误
> InitializationManager.getErrors()
Map(0) {}

// 手动切换物理后端
> await app.modules.physics.switchBackend('fake')
```

### 初始化事件

```typescript
InitializationManager.on((event) => {
  const { module, phase, error } = event;
  
  if (phase === 'initializing') {
    console.log(`? ${module} starting...`);
  }
  
  if (phase === 'ready') {
    console.log(`? ${module} ready`);
  }
  
  if (phase === 'error') {
    console.error(`? ${module} failed:`, error);
  }
});
```

## 模块使用示例

### RenderModule
```typescript
const render = new RenderModule({ antialias: true });
await render.init();

// 访问
render.scene;     // THREE.Scene
render.camera;    // THREE.PerspectiveCamera
render.renderer;  // THREE.WebGLRenderer
```

### TextureModule
```typescript
const textures = new TextureModule();
await textures.init();

// 访问纹理
textures.carTexture;   // THREE.Texture
textures.roadTexture;
textures.skyTexture;

// 导出
const pngData = textures.exportTexture('car');
```

### PhysicsModule
```typescript
const physics = new PhysicsModule('rapier');
await physics.init();

// 切换后端
await physics.switchBackend('fake', preservedState);

// 访问
physics.physicsWorld;  // IPhysicsWorld
```

### VehicleModule
```typescript
const vehicle = new VehicleModule(physicsWorld, profile);
await vehicle.init();

// 重置
vehicle.reset({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 }
});

// 访问
vehicle.vehicle;  // VehicleController
vehicle.profile;  // VehicleProfile
```

### UIModule
```typescript
const ui = new UIModule({
  onStart: () => { /* ... */ },
  onPause: () => { /* ... */ }
});
await ui.init();

// 更新HUD
ui.updateHUD(speed);

// 显示模态框
ui.showWarningsModal(true);
ui.showWebGpuModal(true);

// 访问元素
ui.hud;            // HTMLDivElement
ui.startBtn;  // HTMLButtonElement
ui.trackSelect;    // HTMLSelectElement
```

## 常见模式

### 模块间通信

**? 推荐：通过回调/事件**
```typescript
const ui = new UIModule({
  onPhysicsChange: (backend) => {
 // 通知PhysicsModule切换
    physicsModule.switchBackend(backend);
  }
});
```

**? 避免：直接引用**
```typescript
// 不要这样做
class UIModule {
  private physicsModule: PhysicsModule;  // 耦合太紧
}
```

### 错误处理

**? 非关键模块**
```typescript
try {
  await gpuModule.init();
} catch (e) {
  console.warn('GPU init failed, using fallback');
  // 不抛出错误，继续运行
}
```

**? 关键模块**
```typescript
const ok = await InitializationManager.initModule('physics');
if (!ok) {
  throw new Error('Physics is required');
}
```

### 状态恢复

```typescript
// 保存状态
const state = vehicle.getState();

// 切换后端
await physics.switchBackend('fake');

// 恢复状态
vehicle.reset(state);
```

## 性能优化

### 延迟加载
```typescript
// 非关键模块可以延迟初始化
setTimeout(async () => {
  await InitializationManager.initModule('gpu');
}, 1000);
```

### 并行初始化
```typescript
// 无依赖的模块可并行初始化
await Promise.all([
  InitializationManager.initModule('render'),
  InitializationManager.initModule('textures'),
  InitializationManager.initModule('resources')
]);
```

## 测试模板

```typescript
import { MyModule } from './MyModule';

describe('MyModule', () => {
  let module: MyModule;

  beforeEach(() => {
    module = new MyModule(/* 依赖 */);
  });

  it('should initialize', async () => {
    await module.init();
    expect(module.phase).toBe('ready');
  });

  it('should handle errors', async () => {
  // Mock失败场景
    await expect(module.init()).rejects.toThrow();
    expect(module.phase).toBe('error');
  });

  afterEach(() => {
    module.cleanup();
  });
});
```

## 迁移检查清单

- [ ] 备份原始main.ts
- [ ] 创建必要的新模块
- [ ] 注册所有模块
- [ ] 测试基础功能
- [ ] 测试UI交互
- [ ] 测试运行时切换
- [ ] 检查性能
- [ ] 更新文档

## 文件位置

```
src/
├── main.ts    # 新版主入口
├── main_legacy.ts     # 旧版备份
├── core/
│   ├── InitializationManager.ts
│   └── modules/
│       ├── index.ts
│       ├── RenderModule.ts
│       ├── TextureModule.ts
│   ├── SceneModule.ts
│   ├── ResourceModule.ts
│  ├── PhysicsModule.ts
│       ├── VehicleModule.ts
│ ├── RoadModule.ts
│       ├── GpuModule.ts
│       └── UIModule.ts
docs/
├── initialization_system.md      # 架构设计文档
├── migration_guide.md           # 迁移指南
└── migration_comparison.md        # 前后对比
```

## 相关链接

- [完整架构文档](./initialization_system.md)
- [迁移指南](./migration_guide.md)
- [前后对比](./migration_comparison.md)
- [系统设计](./system_design.md)

## 获取帮助

- 控制台查看：`window.app`, `window.InitializationManager`
- 查看初始化日志：`[Init] moduleName: phase`
- 检查错误：`InitializationManager.getErrors()`
- GitHub Issues: 报告问题和建议

---

**提示**：将此文件添加到书签，方便快速查阅！??
