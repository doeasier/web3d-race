# WEB3D ������Ϸ - ��������ĵ�

**�汾**: 2.0  
**������**: 2025-01-24  
**״̬**: ��Ծά��

## ?? �ĵ�Ŀ¼

- [�ܹ����](#�ܹ����)
- [ģ�����](#ģ�����)
- [���������](#���������)
- [�����Ż����](#�����Ż����)
- [��չ�����](#��չ�����)
- [�������](#�������)

---

## �ܹ����

### ����ܹ�

```
����������������������������������������������������������������������������������������������������������������������
��          Browser Runtime      ��
����������������������������������������������������������������������������������������������������������������������
��        ��
��  ��������������������������������������������������������������������������������������������������    ��
��  ��    Application Layer (main.ts)     ��    ��
��  ��  - RacingGameApp     ��    ��
��  ��  - Game Loop            ��    ��
��  ��  - Event Handlers                  ��    ��
��  �������������������������������������Щ������������������������������������������������������� ��
��        ��      ��
��  ����������������������������������������������������������������������������������������������       ��
��  ��     InitializationManager (Core)  ��       ��
��  ��  - Module Registration    ��       ��
��  ��  - Dependency Resolution   ��       ��
��  ��  - Lifecycle Management   ��   ��
��  �������������������������������������Щ�������������������������������������������������������       ��
��    ��               ��
��  ����������������������������������������������������������������������������������������������       ��
��  ��   Module Layer      ��       ��
��  ��          ��       ��
��  ��  ������������������������  ������������������������  ������������������������ ��       ��
��  ��  ��  Render  ��  �� Texture��  ��  Scene   �� ��       ��
��  ��  ��  Module  ��  ��  Module  ��  ��  Module  �� ��     ��
��  ��  ������������������������  ������������������������  ������������������������ ��       ��
��  ��     ��       ��
��  ��  ������������������������  ������������������������  ������������������������ ��       ��
��  ��  �� Resource ��  �� Physics��  �� Vehicle  �� ��       ��
��  ��  ��  Module  ��  ��  Module  ��  ��Module  �� ��       ��
��  ��  ������������������������  ������������������������  ������������������������ ��     ��
��  ��   ��       ��
��  ��  ������������������������  ������������������������  ������������������������ ��       ��
��  ��  ��   Road   ��  ��   GPU    ��  ��    UI    �� ��    ��
��  ��  ��  Module  ��  ��  Module  ��  ��  Module  �� ��       ��
��  ��  ������������������������  ������������������������  ������������������������ ��       ��
��  ����������������������������������������������������������������������������������������   ��
��         ��
��  ��������������������������������������������������������������������������������������������������    ��
��  ��  System Layer      ��    ��
��  ��              ��    ��
��  ��  ������������������������  ������������������������  ������������������������  ��    ��
��  ��  �� Gameplay ��  ��  World   ��  ��   Core   ��  ��    ��
��  ��  ��  System  ��  ��  System  ��  ��  System  ��  ��    ��
��  ��  ������������������������  ������������������������  ������������������������  ��    ��
��  ��������������������������������������������������������������������������������������������������    ��
��        ��
��  ��������������������������������������������������������������������������������������������������    ��
��  ��         External Dependencies     ��    ��
��  ��  - Three.js (Rendering)    ��    ��
��  ��- Rapier.js (Physics)        �� ��
��  ��  - WebGPU/WebGL (Graphics API)     ��    ��
��  ��������������������������������������������������������������������������������������������������    ��
����������������������������������������������������������������������������������������������������������������������
```

### �ܹ�ԭ��

#### 1. ģ�黯 (Modularity)
- **��һְ��**: ÿ��ģ�鸺��һ�������Ĺ�������
- **�����**: ģ���ͨ���ӿ�ͨ�ţ�����ֱ������
- **���ھ�**: ģ���ڲ����ܽ������

#### 2. �ɲ����� (Testability)
- **����ע��**: ģ������ͨ�����캯������
- **�ӿڳ���**: ʹ��TypeScript�ӿڶ�����Լ
- **Mock�Ѻ�**: �ؼ�����������mock

#### 3. ����չ�� (Extensibility)
- **����ܹ�**: ��ģ�������ע��
- **��������**: ��Ϊͨ�������ļ�����
- **����ģʽ**: ֧�ֶ���ʵ�֣��������ˣ�

#### 4. �������� (Performance-First)
- **�ӳټ���**: ���������Դ
- **�����**: ���ö������GC
- **GPU����**: �������GPU����

---

## ģ�����

### ����ģ��ܹ�

ÿ��ģ��ʵ�� `InitModule` �ӿڣ�

```typescript
interface InitModule {
  name: string;
  phase: 'pending' | 'initializing' | 'ready' | 'error';
  dependencies?: string[];
  
  init(): Promise<void>;
  cleanup?(): void;
}
```

### ģ����ϸ���

#### 1. RenderModule (��Ⱦģ��)

**ְ��**: ����Three.js��Ⱦ�������������

**�ӿ�**:
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

**����**: ��

**���**: 
- `renderer` - ��Ⱦ��ʵ��
- `scene` - ��������
- `camera` - �������

**����**:
```typescript
{
  antialias: boolean;
  pixelRatio: number;
  shadowMapEnabled: boolean;
  shadowMapType: THREE.ShadowMapType;
}
```

**��ƾ���**:
- ʹ��WebGLRenderer����WebGPURenderer�������ԣ�
- ����Ӧ���ر���������vs������
- ��Ӱ��ѡ�����ܿ��ǣ�

---

#### 2. TextureModule (����ģ��)

**ְ��**: ��������ɳ�������

**�ӿ�**:
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

**����**: ��

**��������**:
1. **��������** - ����ɫ/���̸�
2. **��·����** - �������
3. **�������** - �������

**���ɲ���**:
```typescript
enum TextureSource {
  PROCEDURAL,  // ��������
  FILE,        // ���ļ�����
  HYBRID     // ���ģʽ
}
```

**�Ż�**:
- Canvas 2D����������Ч��
- �ӳ����ɣ����裩
- ������

---

#### 3. SceneModule (����ģ��)

**ְ��**: ����������������ա����桢ռλ����

**�ӿ�**:
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

**����**: `render`, `textures`

**��������**:
1. **�����** - �����壬�������
2. **����ƽ��** - ��ƽ�棬�ݵ�����
3. **����ռλ��** - �򵥼����壨���滻��

**����ϵͳ**:
- Y������
- Z����ǰ������ǰ������
- X������

---

#### 4. ResourceModule (��Դģ��)

**ְ��**: ͳһ��Դ���ع���

**�ӿ�**:
```typescript
class ResourceModule implements InitModule {
  resourceManager: ResourceManager;
  gltfLoader: GLTFLoaderWrapper;
  assetLoader: AssetLoader;
  
  init(): Promise<void>;
  preloadAssets(): Promise<void>;
}
```

**����**: ��

**��Դ����**:
- GLTF/GLBģ��
- ����ͼƬ
- JSON�����ļ�
- ��Ƶ�ļ���δ����

**���ز���**:
```typescript
class LoadingStrategy {
  IMMEDIATE,   // ��������
  LAZY, // �ӳټ���
  PRELOAD,  // Ԥ����
  STREAMING // ��ʽ����
}
```

**�������**:
- LRU���棨�������ʹ�ã�
- �ڴ����ƣ�200MB��
- �Զ�����

---

#### 5. PhysicsModule (����ģ��)

**ְ��**: �������������л�

**�ӿ�**:
```typescript
class PhysicsModule implements InitModule {
  physicsWorld: PhysicsWorld;
  backend: 'rapier' | 'fake';
  
  init(): Promise<void>;
  switchBackend(backend: 'rapier' | 'fake'): Promise<void>;
  step(dt: number): void;
}
```

**����**: ��

**������**:

```typescript
interface PhysicsWorld {
  createRigidBody(desc: RigidBodyDesc): RigidBody;
  createCollider(desc: ColliderDesc, body: RigidBody): Collider;
  step(dt: number): void;
  clearAppliedFlags?(): void;
}
```

**Rapier���**:
- ����WASM�ĸ�������������
- ��ȷ��ײ���
- ֧�ָ���������

**Fake���**:
- ��JSʵ��
- ������ģ��
- �����ܿ���

**�л�����**:
```
1. ���浱ǰ״̬
2. ���������
3. ��ʼ��������
4. �ָ�״̬
5. �ؽ�����/��ײ��
```

---

#### 6. VehicleModule (����ģ��)

**ְ��**: �������ƺ�����ģ��

**�ӿ�**:
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

**����**: `physics`

**����������**:

```typescript
interface VehicleController {
  setInput(input: InputState): void;
  update(dt: number): void;
  getState(): VehicleState;
  reset(state?: VehicleState): void;
}
```

**����ʵ��**:

1. **VehicleControllerFast**
   - ���˶�ѧ
   - ������
   - �ʺϴ���AI����

2. **VehicleControllerPrecise**
   - ��ȷ����ѧ
   - ��ʵ��
   - �ʺ���ҿ���

**״̬ת��**:
```
Fast Mode ? Precise Mode
   ��       ��
״̬���� �� ���� �� ���� �� ״̬�ָ�
```

**����ϵͳ**:
- �� `VehicleConfig` ���ز���
- ֧���ȸ��£����ֲ�����
- ��֤�����Ϸ���

---

#### 7. RoadModule (��·ģ��)

**ְ��**: ��̬��·���ɺ͹���

**�ӿ�**:
```typescript
class RoadModule implements InitModule {
  roadManager: RoadManager;
  spawner: RoadsideSpawner | null;
  
  init(): Promise<void>;
  update(worldZ: number, speed: number, dt: number): void;
  applyControlPoints(points: ControlPoint[], length: number): void;
}
```

**����**: `render`, `resource`

**��·�����㷨**:

```typescript
class RoadGenerator {
  // �������߲�ֵ
  generateSpline(controlPoints: Vector3[]): CatmullRomCurve3;
  
  // ��������
  generateMesh(
    spline: Curve,
    width: number,
    segments: number
  ): BufferGeometry;
  
  // ��б�Ǽ���
  calculateBanking(
    position: Vector3,
    tangent: Vector3,
    speed: number
  ): number;
}
```

**·�߶���**:
- �Զ����ɣ���ľ�������ȣ�
- �ܶȿ���
- ����ֲ�
- GPUʵ������Ⱦ

**�Ż�����**:
- ��׶�޳�
- LODϵͳ
- �����
- �決����֧��

---

#### 8. GpuModule (GPU����ģ��)

**ְ��**: WebGPU�������

**�ӿ�**:
```typescript
class GpuModule implements InitModule {
  isWebGpuAvailable: boolean;
  adapter: GPUAdapter | null;
  device: GPUDevice | null;
  
  init(): Promise<void>;
  getAdapterInfo(): string;
}
```

**����**: ��

**����**:
1. **��׶�޳�** - Compute Shader����
2. **����ģ��** - GPU����ϵͳ��δ����
3. **����** - GPU��Ч��δ����

**WebGPU�ܹ�**:

```
����������������������������������������������������������������������
��      Application (JS/TS)        ��
���������������������������Щ���������������������������������������
          ��
��������������������������������������������������������������������
��   WebGPU API (Browser)          ��
��  - GPUDevice    ��
��  - GPUQueue      ��
��  - GPUCommandEncoder            ��
���������������������������Щ���������������������������������������
             ��
��������������������������������������������������������������������
��     GPU Hardware     ��
��  - Compute Shaders       ��
��  - Render Pipelines          ��
��  - Memory Management            ��
��������������������������������������������������������������������
```

**Compute Shaderʾ��**:
```wgsl
@compute @workgroup_size(64)
fn cullObjects(
  @builtin(global_invocation_id) gid: vec3<u32>
) {
  let idx = gid.x;
  let position = positions[idx];
  
  // ��׶�޳����
  if (isInFrustum(position, viewProjMatrix)) {
    // ԭ�Ӳ�����ӵ��ɼ��б�
    let outIdx = atomicAdd(&visibleCount, 1u);
    visibleIndices[outIdx] = idx;
  }
}
```

---

#### 9. UIModule (UIģ��)

**ְ��**: �û��������

**�ӿ�**:
```typescript
class UIModule implements InitModule {
  hud: HTMLDivElement;
  ui: HTMLDivElement;
  
  // �ؼ�
  startBtn: HTMLButtonElement;
  pauseBtn: HTMLButtonElement;
  
  init(): Promise<void>;
  updateHUD(speed: number): void;
  showModal(content: string): void;
}
```

**����**: ��

**UI���**:

1. **HUD (Head-Up Display)**
   - �ٶȱ�
   - ��ʱ��
   - С��ͼ��δ����
   - ������Ϣ��δ����

2. **�������**
   - ��ʼ/��ͣ��ť
   - �ؿ��л�
   - ģʽѡ��
   - �������л�
   - ����ѡ��

3. **ģ̬�Ի���**
   - ������Ϣ
   - ����״̬
   - WebGPU����

**��ʽ���**:
- ��ɫ����
- ��͸������
- ��Ӧʽ����
- ���ⲿCSS�⣨������ʽ��

---

## ���������

### ��Ϸ��ѭ��

```
��������������������������������������������������������������������������������������
��         requestAnimationFrame           ��
���������������������������������Щ���������������������������������������������������
           ��
    ��������������������������������������������������
    ��   Input Update     ��
    ��  - InputManager       ��
  �������������������������Щ�����������������������
    ��
    ��������������������������������������������������
    ��  Vehicle Update       ��
    ��  - setInput()       ��
    ��  - update(dt)         ��
    �������������������������Щ�����������������������
                ��
    ��������������������������������������������������
    ��  Physics Step      ��
    ��  - clearFlags()     ��
    ��  - step(dt)     ��
    ��  - postSync()         ��
    �������������������������Щ�����������������������
    ��
    ��������������������������������������������������
    ��  World Update         ��
 ��  - road.update()      ��
    ��  - spawner.update()   ��
    �������������������������Щ�����������������������
     ��
    ��������������������������������������������������
    ��  UI Update     ��
    ��  - updateHUD()        ��
    �������������������������Щ�����������������������
��
    ��������������������������������������������������
    ��  Render        ��
    ��  - renderer.render()  ��
  ��������������������������������������������������
```

### ��������ͼ

```
User Input (Keyboard/Gamepad)
      ��
      ��
������������������������������
��InputManager ��
���������������Щ�������������
       �� InputState
       ��
��������������������������������������
��VehicleController��
���������������Щ���������������������
       �� Forces/Torques
  ��
������������������������������
��PhysicsWorld ��
���������������Щ�������������
       �� Positions/Velocities
       ��
������������������������������      ������������������������������
�� RoadManager ��?������������VehicleState ��
���������������Щ�������������      ������������������������������
       �� Visible Objects
       ��
��������������������������������������
��InstanceRenderer��
���������������Щ���������������������
       �� Draw Calls
       ��
������������������������������
��  Renderer   ��
���������������Щ�������������
       �� Frame Buffer
       ��
    Display
```

### �¼�ϵͳ

```typescript
// �¼��������
class EventBus {
  private handlers: Map<string, Function[]>;
  
  on(event: string, handler: Function): void;
  emit(event: string, data: any): void;
  off(event: string, handler: Function): void;
}

// �¼�����
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

## �����Ż����

### 1. ��Ⱦ�Ż�

#### GPUʵ����
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

**����**:
- ����Draw Call��Ⱦ�������
- ����CPU-GPUͨ��
- �ʺϴ�����ͬ������ľ����ʯ��

#### ��׶�޳�
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

**WebGPU���ٰ汾**:
- ��GPU�ϲ����޳�
- ��������10-50x
- ֧���������ʵʱ�޳�

#### LODϵͳ
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

**LOD�㼶**:
- Level 0: 0-50m (��ϸ��)
- Level 1: 50-150m (��ϸ��)
- Level 2: 150-300m (��ϸ��)
- Level 3: 300m+ (Impostor)

#### Impostor��Ⱦ
```typescript
class ImpostorRenderer {
  atlas: THREE.Texture;
  geometry: THREE.PlaneGeometry;

  render(instances: Instance[]): void {
    // ʹ������ͼ��
  // Billboard�������
    // �����������������
  }
}
```

### 2. �ڴ��Ż�

#### �����
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

**�ػ�����**:
- Vector3
- Matrix4
- ���Ӷ���
- ��ʱ������

#### ����ѹ��
```typescript
const textureLoader = new THREE.CompressedTextureLoader();
textureLoader.load('texture.ktx2', texture => {
  // KTX2��ʽ��GPUԭ��֧��
  // ��ʡ�ڴ�50-75%
});
```

#### ��Դж��
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

### 3. �����Ż�

#### ����GCѹ��
```typescript
// ? ÿ֡�����¶���
function bad() {
  const temp = new Vector3();  // GC!
  return temp.add(a, b);
}

// ? ���ö���
const _temp = new Vector3();
function good() {
  return _temp.add(a, b);
}
```

#### ���������
```typescript
// ? �������
objects.forEach(obj => obj.update());

// ? ��������
function batchUpdate(objects: Object[]) {
  const states = objects.map(obj => obj.getState());
// ������������
  physics.batchStep(states);
  // ����Ӧ�ý��
  objects.forEach((obj, i) => obj.setState(states[i]));
}
```

#### �ռ����ݽṹ
```typescript
class Octree {
  // �˲������ڿռ��ѯ
  insert(object: Object3D): void;
  query(frustum: Frustum): Object3D[];
}

// �����������
// O(n) �� O(log n)
```

---

## ��չ�����

### 1. ���ϵͳ

```typescript
interface Plugin {
  name: string;
  version: string;
  
  onLoad(): void;
  onUnload(): void;
  
  // �������ڹ���
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

### 2. ��������

���п�������ͨ��JSON�ļ���

```
assets/
������ vehicles/           # ��������
��   ������ city_car_01.json
��   ������ sports_coupe_01.json
������ tracks/             # ��������
��   ������ desert_run.json
��   ������ canyon_circuit.json
������ levels/         # �ؿ�����
��   ������ level_city.json
��   ������ level_canyon.json
������ settings/           # ��Ϸ����
    ������ graphics.json
    ������ audio.json
    ������ controls.json
```

### 3. ģ�����滻

```typescript
class ModuleRegistry {
  async replace(name: string, module: InitModule): Promise<void> {
    // 1. ����״̬
    const state = this.modules.get(name).getState();
    
    // 2. �����ģ��
    await this.modules.get(name).cleanup();
    
    // 3. ע����ģ��
    this.modules.set(name, module);
    
    // 4. ��ʼ��
    await module.init();
    
    // 5. �ָ�״̬
    module.setState(state);
  }
}
```

---

## �������

### ���Բ���

#### 1. ��Ԫ���� (Unit Tests)
- **������Ŀ��**: >70%
- **����**: Vitest
- **��Χ**: ����ģ�顢���ߺ���

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

#### 2. ���ɲ��� (Integration Tests)
- **����**: ģ��佻��
- **ʾ��**: ���������л�������ģʽ�л�

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

#### 3. ���ܲ��� (Performance Tests)
- **ָ��**: FPS���ڴ桢����ʱ��
- **����**: Vitest + �Զ������ܼ��

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

#### 4. �˵��˲��� (E2E Tests)
- **����**: ������Ϸ����
- **����**: Playwright��δ����

```typescript
test('Complete race flow', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // ѡ����
  await page.click('[data-vehicle="city_car_01"]');
  await page.click('[data-action="start"]');
  
  // ���һȦ
  await page.keyboard.press('W'); // ����
  await page.waitForSelector('[data-status="lap-complete"]');
  
  // ��֤�ɼ�
  const time = await page.textContent('[data-time]');
  expect(parseFloat(time)).toBeLessThan(120); // 2������
});
```

### ���Ը�����Ŀ��

| �㼶 | Ŀ�긲���� | ��ǰ������ |
|------|------------|------------|
| ����ģ�� | >80% | ~75% |
| ��Ϸ�߼� | >70% | ~65% |
| ����ϵͳ | >70% | ~80% |
| UI��� | >60% | ~50% |
| **����** | **>70%** | **~70%** |

---

## ��ȫ���

### 1. ������֤
```typescript
class InputValidator {
  validateVehicleConfig(config: any): VehicleConfig {
    if (!config.id || typeof config.id !== 'string') {
   throw new Error('Invalid vehicle ID');
    }
    if (config.physics.mass < 0) {
      throw new Error('Mass must be positive');
    }
    // ...������֤
    return config as VehicleConfig;
  }
}
```

### 2. ��Դɳ��
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

### 3. XSS����
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

## ��¼

### A. ���ģʽӦ��

| ģʽ | Ӧ�ó��� | ʵ��λ�� |
|------|----------|----------|
| **����** | VehicleManager, ResourceManager | `src/core/VehicleManager.ts` |
| **����** | EngineFactory (��������) | `src/core/EngineFactory.ts` |
| **����** | PhysicsWorld (����������) | `src/gameplay/*PhysicsWorld.ts` |
| **�۲���** | EventBus (�¼�ϵͳ) | `src/core/EventBus.ts` (δ��) |
| **�����** | ObjectPool (������) | `src/world/ObjectPool.ts` |
| **������** | PhysicsAdapter (ͳһ�ӿ�) | `src/world/PhysicsAdapter.ts` |
| **װ����** | LODװ���� | `src/world/LODDecorator.ts` (δ��) |
| **����** | Input���� | `src/core/InputCommand.ts` (δ��) |

### B. ����ծ���¼

| ID | ���� | Ӱ�� | ���ȼ� | �ƻ� |
|----|------|------|--------|------|
| TD-001 | ȱ����������ײ��� | ��Ϸ�� | P1 | v2.1 |
| TD-002 | ��Ƶϵͳδʵ�� | ���� | P2 | v2.2 |
| TD-003 | �ƶ�������ȱʧ | ������ | P3 | v3.0 |
| TD-004 | ȱ�ٹؿ��༭�� | ����Ч�� | P3 | v3.0 |
| TD-005 | ���Ը����ʲ���80% | ���� | P2 | �����Ľ� |

### C. �ο�����

- [Three.js �ĵ�](https://threejs.org/docs/)
- [Rapier.js �ĵ�](https://rapier.rs/docs/)
- [WebGPU �淶](https://www.w3.org/TR/webgpu/)
- [Game Programming Patterns](https://gameprogrammingpatterns.com/)
- [Real-Time Rendering](http://www.realtimerendering.com/)

---

**�ĵ�ά����**: Development Team  
**�����**: Technical Lead  
**�´θ���**: �ܹ����ʱ��ÿ��������
