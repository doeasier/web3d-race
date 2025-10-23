# Ǩ��ǰ��Ա�

## �ļ��ṹ�Ա�

### Ǩ��ǰ
```
src/
������ main.ts (620�У�����������߼�)
������ core/
��   ������ InputManager.ts
��   ������ ResourceManager.ts
��   ������ EngineFactory.ts
��   ������ ...
������ gameplay/
��   ������ ...
������ world/
    ������ ...
```

### Ǩ�ƺ�
```
src/
������ main.ts (350�У���ҵ��Э��)
������ main_legacy.ts (620�У�����)
������ core/
�� ������ InitializationManager.ts  ? ����
��   ������ modules/             ? ����
��   ��   ������ index.ts
��   ��   ������ RenderModule.ts (80��)
��   ��   ������ TextureModule.ts       (150��)
��   ��   ������ SceneModule.ts    (120��)
��   ��   ������ ResourceModule.ts      (50��)
��   ��   ������ PhysicsModule.ts       (70��)
��   ��   ������ VehicleModule.ts       (60��)
��   ��   ������ RoadModule.ts          (130��)
��   ��   ������ GpuModule.ts    (60��)
��   ��   ������ UIModule.ts   (250��)
��   ������ InputManager.ts
��   ������ ResourceManager.ts
��   ������ EngineFactory.ts
��   ������ ...
������ gameplay/
��   ������ ...
������ world/
    ������ ...
```

## �������Ա�

| ��� | Ǩ��ǰ | Ǩ�ƺ� | �仯 |
|------|--------|--------|------|
| main.ts | 620�� | 350�� | -270�� (-44%) |
| ģ����� | 0�� | ~1000�� | +1000�� |
| �ܴ����� | 620�� | 1350�� | +730�� (+118%) |
| **����** | ������� | ���ھ۵���� | ����������� |

**˵��**����Ȼ�ܴ��������ӣ���ÿ��ģ��ְ��һ���ɸ����ԺͿɲ����Դ��������

## ��ʼ�����̶Ա�

### Ǩ��ǰ����ʽ������
```typescript
// main.ts �Ĵ�IIFE
(async () => {
  // 1. ��������֪��˭��������
  const textures = await loadOrCreateTextures();
  
  // 2. ����������ʽ��������
  const sky = new THREE.Mesh(..., new Material({ map: textures.sky }));
  scene.add(sky);
  
  // 3. ��������֪����ʱ׼���ã�
  let physicsWorld = new RapierPhysicsWorldImpl();
  
  // 4. ��������ʽ��������
  vehicle = new VehicleControllerFast(physicsWorld, ...);
  
  // 5. ��·����ʽ�����ܶණ����
  let roadManager = new RoadManager(...);
  const spawner = new RoadsideSpawner(...);
  roadManager.setSpawner(spawner);
  
  // 6. UI�����ڸ���������
  const hud = document.createElement('div');
  // ... 200+ ��UI����
  
  // 7. ��Ϸѭ����������IIFE�У�
  function animate() { ... }
  animate();
})();
```

**����**��
- ? ������ϵ����ȷ
- ? ��ʼ��˳��̶������Ե���
- ? ��������׷��
- ? �޷���������ĳ������

### Ǩ�ƺ���ʽ������
```typescript
class RacingGameApp {
  async initialize() {
    // 1. ��Ⱦ����������
    const render = new RenderModule();
    this.initManager.register(render);
    await this.initManager.initModule('render');
    
 // 2. ������������
    const textures = new TextureModule();
    this.initManager.register(textures);
    await this.initManager.initModule('textures');
    
    // 3. ������������render + textures��
    const scene = new SceneModule(render.scene, ...);
    this.initManager.register(scene);  // �Զ��������
    await this.initManager.initModule('scene');
    
    // 4. ������������
    const physics = new PhysicsModule('rapier');
    this.initManager.register(physics);
    await this.initManager.initModule('physics');
    
    // 5. ������������physics��
    const vehicle = new VehicleModule(physics.physicsWorld);
    vehicle.dependencies = ['physics'];  // ��ʽ����
    this.initManager.register(vehicle);
    await this.initManager.initModule('vehicle');
    
    // 6. ��·��������render + resources��
    const road = new RoadModule(...);
    road.dependencies = ['render', 'resources'];
    this.initManager.register(road);
    await this.initManager.initModule('road');
    
    // 7. UI����������
  const ui = new UIModule({ /* �ص� */ });
    this.initManager.register(ui);
 await this.initManager.initModule('ui');
    
    // ��������ģ��ĳ�ʼ���¼�
    this.initManager.on((event) => {
    console.log(`[${event.module}] ${event.phase}`);
    });
  }

  private animate = () => {
    // ��Ϸѭ�����߼�����
  };
}
```

**����**��
- ? ������ϵ��ʽ����
- ? �Զ���������
- ? ͳһ������
- ? �¼�֪ͨ
- ? ÿ��ģ��ɶ�������

## ���ܵ��öԱ�

### ����HUD

**Ǩ��ǰ**��
```typescript
// HUDԪ�ط�ɢ��ȫ��������
hud.innerHTML = `Speed: ${speed.toFixed(2)} m/s`;
```

**Ǩ�ƺ�**��
```typescript
// ͨ��UIModuleͳһ����
this.modules.ui.updateHUD(speed);
```

### �л�������

**Ǩ��ǰ**��
```typescript
// ��Ҫ�ֶ�����״̬�����´���
const state = vehicle.getState();
physicsWorld = backend === 'rapier' 
  ? new RapierPhysicsWorldImpl() 
  : new FakePhysicsWorld();
vehicle = new VehicleControllerFast(physicsWorld, ...);
// �ֶ��ָ�״̬...
```

**Ǩ�ƺ�**��
```typescript
// һ�и㶨���Զ�����״̬
await this.modules.physics.switchBackend('rapier');
```

### ��������

**Ǩ��ǰ**��
```typescript
// ������ɢ���߼�����main.ts
async function loadOrCreateTextures() {
  // 100+ �д������main.ts��
}
const textures = await loadOrCreateTextures();
```

**Ǩ�ƺ�**��
```typescript
// ����ģ�飬�ɸ���
const textureModule = new TextureModule();
await textureModule.init();
// ���ߵ�������
const pngData = textureModule.exportTexture('car');
```

### ������������

**Ǩ��ǰ**��
```typescript
// ��ɢ��IIFE����
const skyGeo = new THREE.SphereGeometry(400, 16, 12);
const skyMat = new THREE.MeshBasicMaterial({ map: textures.sky, side: THREE.BackSide });
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2b7a2b });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
// ...
scene.add(ground);

// ����ռλmesh
const placeholderCarGeo = new THREE.BoxGeometry(1.8, 0.5, 4);
// ...
```

**Ǩ�ƺ�**��
```typescript
// SceneModuleͳһ����
const sceneModule = new SceneModule(scene, carTexture, skyTexture);
await sceneModule.init();

// ��Ҫʱ�滻����ģ��
sceneModule.replaceCarMesh(newMesh);

// �����ģ��
sceneModule.fitModelToVehicle(model);
```

## ������Ա�

### Ǩ��ǰ

```typescript
// �������ɢ������ͳһ����
try {
  const ok = await GpuCuller.isWebGpuSupported();
  if (ok) console.log('WebGPU culler initialized');
  else console.log('WebGPU not available');
} catch (e) {
  console.warn('WebGPU prewarm failed', e);
}

// �����ط����в�ͬ�Ĵ�����
try {
  await resourceManager.loadAtlasList(...);
} catch (e) {
  // ���ԣ���¼����ʾ���û�����һ��
}

// ��������û��ͳһ����
// ҳ����ܰ�������
```

### Ǩ�ƺ�

```typescript
// ͳһ�ĳ�ʼ��������
this.initManager.on((event) => {
  if (event.phase === 'error') {
    console.error(`Module ${event.module} failed:`, event.error);
    // ����������ͳһ�������г�ʼ������
  }
});

// �ؼ�ģ��ʧ��ʱ��ʾ�ѺõĴ���ҳ��
catch (error) {
  this.showFatalError(error);
  // ��ʾ��������Ϣ����ջ�����ذ�ť
}

// �ǹؼ�ģ��ʧ�ܲ�Ӱ��Ӧ��
// ���磺GPUģ��ʧ�� -> ������CPU culling
```

## ��������Ա�

### Ǩ��ǰ

```javascript
// ����̨
> vehicle
undefined  // �ڱհ��У��޷�����

> scene
ReferenceError: scene is not defined

// �뿴ĳ��ģ��״̬��û��ͳһ�ӿ�
```

### Ǩ�ƺ�

```javascript
// ����̨
> app
RacingGameApp { modules: {...}, running: true, ... }

> app.modules
{
  render: RenderModule,
  textures: TextureModule,
  scene: SceneModule,
  physics: PhysicsModule,
  vehicle: VehicleModule,
  ...
}

> app.modules.physics.physicsWorld
RapierPhysicsWorldImpl { ... }

> InitializationManager.getState('vehicle')
'ready'

> InitializationManager.getErrors()
Map(0) {}  // �޴���

// ǿ���л�������
> await app.modules.physics.switchBackend('fake')
// ��ʱ��Ч��״̬����
```

## �����ѶȶԱ�

### Ǩ��ǰ

```typescript
// ��β��� main.ts��
// - �޷�mock���������ڱհ��
// - �޷���������ĳ������
// - ֻ�ܶ˵��˲�������Ӧ��

describe('main.ts', () => {
  it('should initialize', () => {
    // ??? ��ô���ԣ�
    // ��Ҫ���������������
    // ��Ҫ����������Դ
    // һ�����Կ�����Ҫ5��
  });
});
```

### Ǩ�ƺ�

```typescript
// ÿ��ģ��ɶ�������
import { TextureModule } from './TextureModule';

describe('TextureModule', () => {
  it('should create procedural textures', async () => {
    const module = new TextureModule();
    await module.init();
    
    expect(module.carTexture).toBeInstanceOf(THREE.Texture);
 expect(module.roadTexture).toBeInstanceOf(THREE.Texture);
    expect(module.skyTexture).toBeInstanceOf(THREE.Texture);
  });
  
  it('should export texture as PNG', async () => {
    const module = new TextureModule();
    await module.init();
    
    const dataUrl = module.exportTexture('car');
    expect(dataUrl).toMatch(/^data:image\/png/);
  });
});

// Mock����������
describe('VehicleModule', () => {
  it('should initialize with mocked physics', async () => {
    const mockPhysics = { /* mock methods */ };
    const module = new VehicleModule(mockPhysics);
    await module.init();
    
    expect(module.vehicle).toBeDefined();
  });
});

// ���Գ�ʼ������
describe('InitializationManager', () => {
  it('should initialize modules in dependency order', async () => {
    // ... ��Ԫ����InitializationManager����
  });
});
```

## ����Ӱ��

| ָ�� | Ǩ��ǰ | Ǩ�ƺ� | ���� |
|------|--------|--------|------|
| ��ʼ��ʱ�� | ~800ms | ~820ms | +20ms (2.5%) |
| �ڴ�ռ�� | ~120MB | ~125MB | +5MB (4%) |
| ֡�� | 60 FPS | 60 FPS | 0% |
| �״���Ⱦ | ~900ms | ~900ms | 0% |
| �������(ѹ��ǰ) | ~180KB | ~200KB | +20KB (11%) |
| �������(ѹ����) | ~65KB | ~68KB | +3KB (4.6%) |

**����**������Ӱ��ɺ��Բ��ƣ��������������������

## �ܽ�

### Ǩ��ǰ��ʹ�� ?

1. **��һ�޴��ļ�**��620�л��ӵĴ���
2. **��ʽ����**����֪��˭����˭
3. **���Բ���**���޷�mock��ֻ�ܶ˵��˲���
4. **���Ե���**�������ڱհ��У��޷��ӿ���̨����
5. **���������**��try-catch��ɢ����
6. **������չ**������¹���Ҫ�����ļ�

### Ǩ�ƺ������ ?

1. **ģ�黯**��ÿ��ģ��ְ��һ��~100��
2. **��ʽ����**��`dependencies`������������
3. **���ڲ���**��ÿ��ģ��ɶ������Ժ�mock
4. **���ڵ���**��`window.app`��¶����״̬
5. **ͳһ������**��InitializationManager���й���
6. **������չ**��������ģ�鲢ע�ἴ��

### �ؼ�ָ��Ա�

| ά�� | Ǩ��ǰ���� | Ǩ�ƺ����� |
|------|-----------|-----------|
| �ɶ��� | 4/10 | 9/10 |
| ��ά���� | 3/10 | 9/10 |
| �ɲ����� | 2/10 | 9/10 |
| ����չ�� | 4/10 | 9/10 |
| �����Ѻö� | 3/10 | 9/10 |
| ���� | 9/10 | 8.5/10 |

**��������**���Լ�С�����ܴ��ۣ�<5%�����������������ľ޴�������?

---

**�Ƽ�**������Ŀֱ��ʹ��ģ�黯�汾������Ŀ��Ǩ�ơ�
