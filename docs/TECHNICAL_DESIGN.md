# WEB3D 赛车游戏 - 技术设计文档

**版本**: 2.0  
**最后更新**: 2025-01-24  
**状态**: 活跃维护

## ?? 文档目录

- [架构设计](#架构设计)
- [模块设计](#模块设计)
- [数据流设计](#数据流设计)
- [性能优化设计](#性能优化设计)
- [扩展性设计](#扩展性设计)
- [测试设计](#测试设计)

---

## 架构设计

### 总体架构

```
┌─────────────────────────────────────────────────────────┐
│          Browser Runtime      │
├─────────────────────────────────────────────────────────┤
│        │
│  ┌───────────────────────────────────────────────┐    │
│  │    Application Layer (main.ts)     │    │
│  │  - RacingGameApp     │    │
│  │  - Game Loop            │    │
│  │  - Event Handlers                  │    │
│  └─────────────────┬───────────────────────────┘ │
│        │      │
│  ┌─────────────────▼───────────────────────────┐       │
│  │     InitializationManager (Core)  │       │
│  │  - Module Registration    │       │
│  │  - Dependency Resolution   │       │
│  │  - Lifecycle Management   │   │
│  └─────────────────┬───────────────────────────┘       │
│    │               │
│  ┌─────────────────▼───────────────────────────┐       │
│  │   Module Layer      │       │
│  │          │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │       │
│  │  │  Render  │  │ Texture│  │  Scene   │ │       │
│  │  │  Module  │  │  Module  │  │  Module  │ │     │
│  │  └──────────┘  └──────────┘  └──────────┘ │       │
│  │     │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │       │
│  │  │ Resource │  │ Physics│  │ Vehicle  │ │       │
│  │  │  Module  │  │  Module  │  │Module  │ │       │
│  │  └──────────┘  └──────────┘  └──────────┘ │     │
│  │   │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │       │
│  │  │   Road   │  │   GPU    │  │    UI    │ │    │
│  │  │  Module  │  │  Module  │  │  Module  │ │       │
│  │  └──────────┘  └──────────┘  └──────────┘ │       │
│  └──────────────────────────────────────────┘   │
│         │
│  ┌───────────────────────────────────────────────┐    │
│  │  System Layer      │    │
│  │              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │
│  │  │ Gameplay │  │  World   │  │   Core   │  │    │
│  │  │  System  │  │  System  │  │  System  │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  │    │
│  └───────────────────────────────────────────────┘    │
│        │
│  ┌───────────────────────────────────────────────┐    │
│  │         External Dependencies     │    │
│  │  - Three.js (Rendering)    │    │
│  │- Rapier.js (Physics)        │ │
│  │  - WebGPU/WebGL (Graphics API)     │    │
│  └───────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 架构原则

#### 1. 模块化 (Modularity)
- **单一职责**: 每个模块负责一个清晰的功能领域
- **松耦合**: 模块间通过接口通信，减少直接依赖
- **高内聚**: 模块内部功能紧密相关

#### 2. 可测试性 (Testability)
- **依赖注入**: 模块依赖通过构造函数传入
- **接口抽象**: 使用TypeScript接口定义契约
- **Mock友好**: 关键依赖可轻松mock

#### 3. 可扩展性 (Extensibility)
- **插件架构**: 新模块可轻松注册
- **配置驱动**: 行为通过配置文件控制
- **策略模式**: 支持多种实现（如物理后端）

#### 4. 性能优先 (Performance-First)
- **延迟加载**: 按需加载资源
- **对象池**: 重用对象减少GC
- **GPU加速**: 充分利用GPU能力

---

## 模块设计

### 核心模块架构

每个模块实现 `InitModule` 接口：

```typescript
interface InitModule {
  name: string;
  phase: 'pending' | 'initializing' | 'ready' | 'error';
  dependencies?: string[];
  
  init(): Promise<void>;
  cleanup?(): void;
}
```

### 模块详细设计

#### 1. RenderModule (渲染模块)

**职责**: 管理Three.js渲染器、场景、相机

**接口**:
```typescript
class RenderModule implements InitModule {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  
  init(): Promise<void>;
  resize(width: number, height: number): void;
  cleanup(): void;
}
```

**依赖**: 无

**输出**: 
- `renderer` - 渲染器实例
- `scene` - 场景对象
- `camera` - 相机对象

**配置**:
```typescript
{
  antialias: boolean;
  pixelRatio: number;
  shadowMapEnabled: boolean;
  shadowMapType: THREE.ShadowMapType;
}
```

**设计决策**:
- 使用WebGLRenderer而非WebGPURenderer（兼容性）
- 自适应像素比例（性能vs质量）
- 阴影可选（性能考虑）

---

#### 2. TextureModule (纹理模块)

**职责**: 管理和生成程序化纹理

**接口**:
```typescript
class TextureModule implements InitModule {
  carTexture: THREE.Texture;
  roadTexture: THREE.Texture;
  skyTexture: THREE.Texture;
  
  init(): Promise<void>;
  generateTexture(type: string): THREE.Texture;
  exportTexture(type: string): string;
}
```

**依赖**: 无

**纹理类型**:
1. **车辆纹理** - 简单颜色/棋盘格
2. **道路纹理** - 沥青材质
3. **天空纹理** - 渐变天空

**生成策略**:
```typescript
enum TextureSource {
  PROCEDURAL,  // 程序化生成
  FILE,        // 从文件加载
  HYBRID     // 混合模式
}
```

**优化**:
- Canvas 2D绘制纹理（高效）
- 延迟生成（按需）
- 纹理复用

---

#### 3. SceneModule (场景模块)

**职责**: 管理场景基础对象（天空、地面、占位符）

**接口**:
```typescript
class SceneModule implements InitModule {
  skyMesh: THREE.Mesh;
  groundPlane: THREE.Mesh;
  carMesh: THREE.Mesh;
  
  init(): Promise<void>;
  updateCarModel(model: THREE.Object3D): void;
  fitModelToVehicle(model: THREE.Object3D): void;
}
```

**依赖**: `render`, `textures`

**场景对象**:
1. **天空球** - 半球体，天空纹理
2. **地面平面** - 大平面，草地纹理
3. **车辆占位符** - 简单几何体（待替换）

**坐标系统**:
- Y轴向上
- Z轴向前（车辆前进方向）
- X轴向右

---

#### 4. ResourceModule (资源模块)

**职责**: 统一资源加载管理

**接口**:
```typescript
class ResourceModule implements InitModule {
  resourceManager: ResourceManager;
  gltfLoader: GLTFLoaderWrapper;
  assetLoader: AssetLoader;
  
  init(): Promise<void>;
  preloadAssets(): Promise<void>;
}
```

**依赖**: 无

**资源类型**:
- GLTF/GLB模型
- 纹理图片
- JSON配置文件
- 音频文件（未来）

**加载策略**:
```typescript
class LoadingStrategy {
  IMMEDIATE,   // 立即加载
  LAZY, // 延迟加载
  PRELOAD,  // 预加载
  STREAMING // 流式加载
}
```

**缓存机制**:
- LRU缓存（最近最少使用）
- 内存限制（200MB）
- 自动清理

---

#### 5. PhysicsModule (物理模块)

**职责**: 物理引擎管理和切换

**接口**:
```typescript
class PhysicsModule implements InitModule {
  physicsWorld: PhysicsWorld;
  backend: 'rapier' | 'fake';
  
  init(): Promise<void>;
  switchBackend(backend: 'rapier' | 'fake'): Promise<void>;
  step(dt: number): void;
}
```

**依赖**: 无

**后端设计**:

```typescript
interface PhysicsWorld {
  createRigidBody(desc: RigidBodyDesc): RigidBody;
  createCollider(desc: ColliderDesc, body: RigidBody): Collider;
  step(dt: number): void;
  clearAppliedFlags?(): void;
}
```

**Rapier后端**:
- 基于WASM的高性能物理引擎
- 精确碰撞检测
- 支持复杂物理场景

**Fake后端**:
- 纯JS实现
- 简化物理模拟
- 低性能开销

**切换流程**:
```
1. 保存当前状态
2. 清理旧引擎
3. 初始化新引擎
4. 恢复状态
5. 重建刚体/碰撞体
```

---

#### 6. VehicleModule (车辆模块)

**职责**: 车辆控制和物理模拟

**接口**:
```typescript
class VehicleModule implements InitModule {
  vehicle: VehicleController;
  profile: VehicleProfile;
  config: VehicleConfig | null;
  
  init(): Promise<void>;
  reinitialize(config: VehicleConfig): Promise<void>;
  reset(state?: VehicleState): void;
}
```

**依赖**: `physics`

**车辆控制器**:

```typescript
interface VehicleController {
  setInput(input: InputState): void;
  update(dt: number): void;
  getState(): VehicleState;
  reset(state?: VehicleState): void;
}
```

**两种实现**:

1. **VehicleControllerFast**
   - 简化运动学
   - 高性能
   - 适合大量AI车辆

2. **VehicleControllerPrecise**
   - 精确动力学
   - 真实感
   - 适合玩家控制

**状态转换**:
```
Fast Mode ? Precise Mode
   ↓       ↓
状态保存 → 销毁 → 创建 → 状态恢复
```

**参数系统**:
- 从 `VehicleConfig` 加载参数
- 支持热更新（部分参数）
- 验证参数合法性

---

#### 7. RoadModule (道路模块)

**职责**: 动态道路生成和管理

**接口**:
```typescript
class RoadModule implements InitModule {
  roadManager: RoadManager;
  spawner: RoadsideSpawner | null;
  
  init(): Promise<void>;
  update(worldZ: number, speed: number, dt: number): void;
  applyControlPoints(points: ControlPoint[], length: number): void;
}
```

**依赖**: `render`, `resource`

**道路生成算法**:

```typescript
class RoadGenerator {
  // 样条曲线插值
  generateSpline(controlPoints: Vector3[]): CatmullRomCurve3;
  
  // 网格生成
  generateMesh(
    spline: Curve,
    width: number,
    segments: number
  ): BufferGeometry;
  
  // 倾斜角计算
  calculateBanking(
    position: Vector3,
    tangent: Vector3,
    speed: number
  ): number;
}
```

**路边对象**:
- 自动生成（树木、建筑等）
- 密度控制
- 随机分布
- GPU实例化渲染

**优化技术**:
- 视锥剔除
- LOD系统
- 对象池
- 烘焙场景支持

---

#### 8. GpuModule (GPU加速模块)

**职责**: WebGPU计算加速

**接口**:
```typescript
class GpuModule implements InitModule {
  isWebGpuAvailable: boolean;
  adapter: GPUAdapter | null;
  device: GPUDevice | null;
  
  init(): Promise<void>;
  getAdapterInfo(): string;
}
```

**依赖**: 无

**功能**:
1. **视锥剔除** - Compute Shader加速
2. **粒子模拟** - GPU粒子系统（未来）
3. **后处理** - GPU特效（未来）

**WebGPU架构**:

```
┌─────────────────────────────────┐
│      Application (JS/TS)        │
└────────────┬───────────────────┘
          │
┌────────────▼───────────────────┐
│   WebGPU API (Browser)          │
│  - GPUDevice    │
│  - GPUQueue      │
│  - GPUCommandEncoder            │
└────────────┬───────────────────┘
             │
┌────────────▼───────────────────┐
│     GPU Hardware     │
│  - Compute Shaders       │
│  - Render Pipelines          │
│  - Memory Management            │
└────────────────────────────────┘
```

**Compute Shader示例**:
```wgsl
@compute @workgroup_size(64)
fn cullObjects(
  @builtin(global_invocation_id) gid: vec3<u32>
) {
  let idx = gid.x;
  let position = positions[idx];
  
  // 视锥剔除检测
  if (isInFrustum(position, viewProjMatrix)) {
    // 原子操作添加到可见列表
    let outIdx = atomicAdd(&visibleCount, 1u);
    visibleIndices[outIdx] = idx;
  }
}
```

---

#### 9. UIModule (UI模块)

**职责**: 用户界面管理

**接口**:
```typescript
class UIModule implements InitModule {
  hud: HTMLDivElement;
  ui: HTMLDivElement;
  
  // 控件
  startBtn: HTMLButtonElement;
  pauseBtn: HTMLButtonElement;
  
  init(): Promise<void>;
  updateHUD(speed: number): void;
  showModal(content: string): void;
}
```

**依赖**: 无

**UI组件**:

1. **HUD (Head-Up Display)**
   - 速度表
   - 计时器
   - 小地图（未来）
   - 排名信息（未来）

2. **控制面板**
   - 开始/暂停按钮
   - 关卡切换
   - 模式选择
   - 物理后端切换
   - 赛道选择

3. **模态对话框**
   - 警告信息
   - 加载状态
   - WebGPU详情

**样式设计**:
- 暗色主题
- 半透明背景
- 响应式布局
- 无外部CSS库（内联样式）

---

## 数据流设计

### 游戏主循环

```
┌─────────────────────────────────────────┐
│         requestAnimationFrame           │
└───────────────┬─────────────────────────┘
           │
    ┌───────────▼───────────┐
    │   Input Update     │
    │  - InputManager       │
  └───────────┬───────────┘
    │
    ┌───────────▼───────────┐
    │  Vehicle Update       │
    │  - setInput()       │
    │  - update(dt)         │
    └───────────┬───────────┘
                │
    ┌───────────▼───────────┐
    │  Physics Step      │
    │  - clearFlags()     │
    │  - step(dt)     │
    │  - postSync()         │
    └───────────┬───────────┘
    │
    ┌───────────▼───────────┐
    │  World Update         │
 │  - road.update()      │
    │  - spawner.update()   │
    └───────────┬───────────┘
     │
    ┌───────────▼───────────┐
    │  UI Update     │
    │  - updateHUD()        │
    └───────────┬───────────┘
│
    ┌───────────▼───────────┐
    │  Render        │
    │  - renderer.render()  │
  └───────────────────────┘
```

### 数据流向图

```
User Input (Keyboard/Gamepad)
      │
      ▼
┌─────────────┐
│InputManager │
└──────┬──────┘
       │ InputState
       ▼
┌─────────────────┐
│VehicleController│
└──────┬──────────┘
       │ Forces/Torques
  ▼
┌─────────────┐
│PhysicsWorld │
└──────┬──────┘
       │ Positions/Velocities
       ▼
┌─────────────┐      ┌─────────────┐
│ RoadManager │?─────┤VehicleState │
└──────┬──────┘      └─────────────┘
       │ Visible Objects
       ▼
┌─────────────────┐
│InstanceRenderer│
└──────┬──────────┘
       │ Draw Calls
       ▼
┌─────────────┐
│  Renderer   │
└──────┬──────┘
       │ Frame Buffer
       ▼
    Display
```

### 事件系统

```typescript
// 事件总线设计
class EventBus {
  private handlers: Map<string, Function[]>;
  
  on(event: string, handler: Function): void;
  emit(event: string, data: any): void;
  off(event: string, handler: Function): void;
}

// 事件类型
enum GameEvents {
  VEHICLE_COLLIDE = 'vehicle:collide',
  LAP_COMPLETE = 'lap:complete',
  CHECKPOINT_PASS = 'checkpoint:pass',
  VEHICLE_DAMAGED = 'vehicle:damaged',
  RACE_START = 'race:start',
  RACE_END = 'race:end',
}
```

---

## 性能优化设计

### 1. 渲染优化

#### GPU实例化
```typescript
class InstancedRenderer {
  mesh: THREE.InstancedMesh;
  count: number;
  
  update(matrices: Matrix4[], count: number): void {
    for (let i = 0; i < count; i++) {
      this.mesh.setMatrixAt(i, matrices[i]);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
```

**优势**:
- 单次Draw Call渲染多个对象
- 减少CPU-GPU通信
- 适合大量相同对象（树木、岩石）

#### 视锥剔除
```typescript
class FrustumCuller {
  frustum: THREE.Frustum;
  
  cull(objects: Object3D[]): Object3D[] {
    return objects.filter(obj => 
      this.frustum.intersectsObject(obj)
    );
  }
}
```

**WebGPU加速版本**:
- 在GPU上并行剔除
- 性能提升10-50x
- 支持数万对象实时剔除

#### LOD系统
```typescript
class LODManager {
  levels: { distance: number, mesh: Mesh }[];
  
  selectLOD(distance: number): Mesh {
    for (const level of this.levels) {
      if (distance < level.distance) {
        return level.mesh;
      }
    }
return this.levels[this.levels.length - 1].mesh;
  }
}
```

**LOD层级**:
- Level 0: 0-50m (高细节)
- Level 1: 50-150m (中细节)
- Level 2: 150-300m (低细节)
- Level 3: 300m+ (Impostor)

#### Impostor渲染
```typescript
class ImpostorRenderer {
  atlas: THREE.Texture;
  geometry: THREE.PlaneGeometry;

  render(instances: Instance[]): void {
    // 使用纹理图集
  // Billboard面向相机
    // 大幅降低三角形数量
  }
}
```

### 2. 内存优化

#### 对象池
```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  
  acquire(): T {
    return this.pool.pop() || this.factory();
  }
  
  release(obj: T): void {
    this.pool.push(obj);
  }
}
```

**池化对象**:
- Vector3
- Matrix4
- 粒子对象
- 临时缓冲区

#### 纹理压缩
```typescript
const textureLoader = new THREE.CompressedTextureLoader();
textureLoader.load('texture.ktx2', texture => {
  // KTX2格式，GPU原生支持
  // 节省内存50-75%
});
```

#### 资源卸载
```typescript
class ResourceManager {
  unload(resource: Resource): void {
    resource.geometry?.dispose();
  resource.material?.dispose();
    resource.texture?.dispose();
    this.cache.delete(resource.id);
  }
}
```

### 3. 代码优化

#### 避免GC压力
```typescript
// ? 每帧创建新对象
function bad() {
  const temp = new Vector3();  // GC!
  return temp.add(a, b);
}

// ? 复用对象
const _temp = new Vector3();
function good() {
  return _temp.add(a, b);
}
```

#### 批处理更新
```typescript
// ? 逐个更新
objects.forEach(obj => obj.update());

// ? 批量更新
function batchUpdate(objects: Object[]) {
  const states = objects.map(obj => obj.getState());
// 物理批量计算
  physics.batchStep(states);
  // 批量应用结果
  objects.forEach((obj, i) => obj.setState(states[i]));
}
```

#### 空间数据结构
```typescript
class Octree {
  // 八叉树用于空间查询
  insert(object: Object3D): void;
  query(frustum: Frustum): Object3D[];
}

// 替代线性搜索
// O(n) → O(log n)
```

---

## 扩展性设计

### 1. 插件系统

```typescript
interface Plugin {
  name: string;
  version: string;
  
  onLoad(): void;
  onUnload(): void;
  
  // 生命周期钩子
  beforeInit?(): void;
  afterInit?(): void;
  beforeUpdate?(dt: number): void;
  afterUpdate?(dt: number): void;
}

class PluginManager {
  private plugins: Map<string, Plugin>;
  
  register(plugin: Plugin): void;
  unregister(name: string): void;
  get(name: string): Plugin | undefined;
}
```

### 2. 配置驱动

所有可配置项通过JSON文件：

```
assets/
├── vehicles/           # 车辆配置
│   ├── city_car_01.json
│   └── sports_coupe_01.json
├── tracks/             # 赛道配置
│   ├── desert_run.json
│   └── canyon_circuit.json
├── levels/         # 关卡配置
│   ├── level_city.json
│   └── level_canyon.json
└── settings/           # 游戏设置
    ├── graphics.json
    ├── audio.json
    └── controls.json
```

### 3. 模块热替换

```typescript
class ModuleRegistry {
  async replace(name: string, module: InitModule): Promise<void> {
    // 1. 保存状态
    const state = this.modules.get(name).getState();
    
    // 2. 清理旧模块
    await this.modules.get(name).cleanup();
    
    // 3. 注册新模块
    this.modules.set(name, module);
    
    // 4. 初始化
    await module.init();
    
    // 5. 恢复状态
    module.setState(state);
  }
}
```

---

## 测试设计

### 测试策略

#### 1. 单元测试 (Unit Tests)
- **覆盖率目标**: >70%
- **工具**: Vitest
- **范围**: 所有模块、工具函数

```typescript
describe('VehicleController', () => {
  it('should update velocity on throttle input', () => {
    const controller = new VehicleControllerFast(/*...*/);
    controller.setInput({ throttle: 1.0 });
    controller.update(1/60);
    
    const state = controller.getState();
    expect(state.speed).toBeGreaterThan(0);
  });
});
```

#### 2. 集成测试 (Integration Tests)
- **场景**: 模块间交互
- **示例**: 物理引擎切换、车辆模式切换

```typescript
describe('Physics Backend Switch', () => {
  it('should preserve vehicle state when switching', async () => {
    const app = new RacingGameApp();
    await app.initialize();
    
  const beforeState = app.modules.vehicle.getState();
    await app.modules.physics.switchBackend('fake');
    const afterState = app.modules.vehicle.getState();
    
  expect(afterState.position).toEqual(beforeState.position);
  });
});
```

#### 3. 性能测试 (Performance Tests)
- **指标**: FPS、内存、加载时间
- **工具**: Vitest + 自定义性能监控

```typescript
describe('Rendering Performance', () => {
  it('should maintain 60fps with 1000 objects', () => {
  const renderer = new InstancedRenderer();
    const objects = createTestObjects(1000);
    
    const fps = measureFPS(() => {
      renderer.update(objects);
   renderer.render();
    });
    
    expect(fps).toBeGreaterThanOrEqual(60);
  });
});
```

#### 4. 端到端测试 (E2E Tests)
- **场景**: 完整游戏流程
- **工具**: Playwright（未来）

```typescript
test('Complete race flow', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // 选择车辆
  await page.click('[data-vehicle="city_car_01"]');
  await page.click('[data-action="start"]');
  
  // 完成一圈
  await page.keyboard.press('W'); // 加速
  await page.waitForSelector('[data-status="lap-complete"]');
  
  // 验证成绩
  const time = await page.textContent('[data-time]');
  expect(parseFloat(time)).toBeLessThan(120); // 2分钟内
});
```

### 测试覆盖率目标

| 层级 | 目标覆盖率 | 当前覆盖率 |
|------|------------|------------|
| 核心模块 | >80% | ~75% |
| 游戏逻辑 | >70% | ~65% |
| 世界系统 | >70% | ~80% |
| UI组件 | >60% | ~50% |
| **总体** | **>70%** | **~70%** |

---

## 安全设计

### 1. 输入验证
```typescript
class InputValidator {
  validateVehicleConfig(config: any): VehicleConfig {
    if (!config.id || typeof config.id !== 'string') {
   throw new Error('Invalid vehicle ID');
    }
    if (config.physics.mass < 0) {
      throw new Error('Mass must be positive');
    }
    // ...更多验证
    return config as VehicleConfig;
  }
}
```

### 2. 资源沙盒
```typescript
class ResourceLoader {
  private allowedDomains = [
    'localhost',
    'example.com'
  ];
  
  async load(url: string): Promise<Resource> {
    const domain = new URL(url).hostname;
    if (!this.allowedDomains.includes(domain)) {
      throw new Error('Domain not allowed');
    }
    return fetch(url);
  }
}
```

### 3. XSS防护
```typescript
class UIRenderer {
  sanitize(html: string): string {
    return html
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
```

---

## 附录

### A. 设计模式应用

| 模式 | 应用场景 | 实现位置 |
|------|----------|----------|
| **单例** | VehicleManager, ResourceManager | `src/core/VehicleManager.ts` |
| **工厂** | EngineFactory (创建车辆) | `src/core/EngineFactory.ts` |
| **策略** | PhysicsWorld (多种物理后端) | `src/gameplay/*PhysicsWorld.ts` |
| **观察者** | EventBus (事件系统) | `src/core/EventBus.ts` (未来) |
| **对象池** | ObjectPool (对象复用) | `src/world/ObjectPool.ts` |
| **适配器** | PhysicsAdapter (统一接口) | `src/world/PhysicsAdapter.ts` |
| **装饰器** | LOD装饰器 | `src/world/LODDecorator.ts` (未来) |
| **命令** | Input命令 | `src/core/InputCommand.ts` (未来) |

### B. 技术债务记录

| ID | 描述 | 影响 | 优先级 | 计划 |
|----|------|------|--------|------|
| TD-001 | 缺少完整的碰撞检测 | 游戏性 | P1 | v2.1 |
| TD-002 | 音频系统未实现 | 体验 | P2 | v2.2 |
| TD-003 | 移动端适配缺失 | 兼容性 | P3 | v3.0 |
| TD-004 | 缺少关卡编辑器 | 开发效率 | P3 | v3.0 |
| TD-005 | 测试覆盖率不足80% | 质量 | P2 | 持续改进 |

### C. 参考资料

- [Three.js 文档](https://threejs.org/docs/)
- [Rapier.js 文档](https://rapier.rs/docs/)
- [WebGPU 规范](https://www.w3.org/TR/webgpu/)
- [Game Programming Patterns](https://gameprogrammingpatterns.com/)
- [Real-Time Rendering](http://www.realtimerendering.com/)

---

**文档维护者**: Development Team  
**审核人**: Technical Lead  
**下次更新**: 架构变更时或每季度评审
