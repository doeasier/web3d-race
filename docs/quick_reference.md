# ģ�黯�ܹ��ٲ鿨

## ���ٿ�ʼ

```typescript
// 1. ����
import InitializationManager from './core/InitializationManager';
import { RenderModule, PhysicsModule } from './core/modules';

// 2. ����Ӧ����
class MyApp {
  async initialize() {
    const render = new RenderModule();
    InitializationManager.register(render);
    await InitializationManager.initModule('render');
    
    // ... ע������ģ��
  }

  animate = () => { /* ��Ϸѭ�� */ };
  
  async start() {
    await this.initialize();
    this.animate();
  }
}

// 3. ����
new MyApp().start();
```

## 9������ģ��

| ģ�� | ְ�� | ���� | �ļ� |
|------|------|------|------|
| **RenderModule** | ����/���/��Ⱦ�� | - | `RenderModule.ts` |
| **TextureModule** | ������� | - | `TextureModule.ts` |
| **SceneModule** | �������� | render, textures | `SceneModule.ts` |
| **ResourceModule** | ��Դ���� | - | `ResourceModule.ts` |
| **PhysicsModule** | �������� | - | `PhysicsModule.ts` |
| **VehicleModule** | �������� | physics | `VehicleModule.ts` |
| **RoadModule** | ��·ϵͳ | render, resources | `RoadModule.ts` |
| **GpuModule** | GPU���� | - | `GpuModule.ts` |
| **UIModule** | �û����� | - | `UIModule.ts` |

## ����API

### InitializationManager

```typescript
// ע��ģ��
InitializationManager.register(module);

// ��ʼ������ģ��
await InitializationManager.initModule('moduleName');

// ��ʼ������ģ��
await InitializationManager.initAll();

// �����¼�
InitializationManager.on((event) => {
  console.log(event.module, event.phase);
});

// ��ѯ״̬
const state = InitializationManager.getState('physics');
const errors = InitializationManager.getErrors();
```

### �����Զ���ģ��

```typescript
import { InitModule } from './core/InitializationManager';

export class MyModule implements InitModule {
  name = 'myModule';
phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';
  dependencies = ['render', 'physics']; // ��ѡ

  async init(): Promise<void> {
 // ��ʼ������
  console.log('MyModule initialized');
  }

  cleanup(): void {
  // �������
  }
}
```

## ���Լ���

### ���������̨

```javascript
// ����Ӧ��ʵ��
> app
RacingGameApp { ... }

// ����ģ��
> app.modules.physics.physicsWorld
RapierPhysicsWorldImpl { ... }

// �鿴��ʼ��״̬
> InitializationManager.getState('vehicle')
'ready'

// �鿴���д���
> InitializationManager.getErrors()
Map(0) {}

// �ֶ��л�������
> await app.modules.physics.switchBackend('fake')
```

### ��ʼ���¼�

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

## ģ��ʹ��ʾ��

### RenderModule
```typescript
const render = new RenderModule({ antialias: true });
await render.init();

// ����
render.scene;     // THREE.Scene
render.camera;    // THREE.PerspectiveCamera
render.renderer;  // THREE.WebGLRenderer
```

### TextureModule
```typescript
const textures = new TextureModule();
await textures.init();

// ��������
textures.carTexture;   // THREE.Texture
textures.roadTexture;
textures.skyTexture;

// ����
const pngData = textures.exportTexture('car');
```

### PhysicsModule
```typescript
const physics = new PhysicsModule('rapier');
await physics.init();

// �л����
await physics.switchBackend('fake', preservedState);

// ����
physics.physicsWorld;  // IPhysicsWorld
```

### VehicleModule
```typescript
const vehicle = new VehicleModule(physicsWorld, profile);
await vehicle.init();

// ����
vehicle.reset({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 }
});

// ����
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

// ����HUD
ui.updateHUD(speed);

// ��ʾģ̬��
ui.showWarningsModal(true);
ui.showWebGpuModal(true);

// ����Ԫ��
ui.hud;            // HTMLDivElement
ui.startBtn;  // HTMLButtonElement
ui.trackSelect;    // HTMLSelectElement
```

## ����ģʽ

### ģ���ͨ��

**? �Ƽ���ͨ���ص�/�¼�**
```typescript
const ui = new UIModule({
  onPhysicsChange: (backend) => {
 // ֪ͨPhysicsModule�л�
    physicsModule.switchBackend(backend);
  }
});
```

**? ���⣺ֱ������**
```typescript
// ��Ҫ������
class UIModule {
  private physicsModule: PhysicsModule;  // ���̫��
}
```

### ������

**? �ǹؼ�ģ��**
```typescript
try {
  await gpuModule.init();
} catch (e) {
  console.warn('GPU init failed, using fallback');
  // ���׳����󣬼�������
}
```

**? �ؼ�ģ��**
```typescript
const ok = await InitializationManager.initModule('physics');
if (!ok) {
  throw new Error('Physics is required');
}
```

### ״̬�ָ�

```typescript
// ����״̬
const state = vehicle.getState();

// �л����
await physics.switchBackend('fake');

// �ָ�״̬
vehicle.reset(state);
```

## �����Ż�

### �ӳټ���
```typescript
// �ǹؼ�ģ������ӳٳ�ʼ��
setTimeout(async () => {
  await InitializationManager.initModule('gpu');
}, 1000);
```

### ���г�ʼ��
```typescript
// ��������ģ��ɲ��г�ʼ��
await Promise.all([
  InitializationManager.initModule('render'),
  InitializationManager.initModule('textures'),
  InitializationManager.initModule('resources')
]);
```

## ����ģ��

```typescript
import { MyModule } from './MyModule';

describe('MyModule', () => {
  let module: MyModule;

  beforeEach(() => {
    module = new MyModule(/* ���� */);
  });

  it('should initialize', async () => {
    await module.init();
    expect(module.phase).toBe('ready');
  });

  it('should handle errors', async () => {
  // Mockʧ�ܳ���
    await expect(module.init()).rejects.toThrow();
    expect(module.phase).toBe('error');
  });

  afterEach(() => {
    module.cleanup();
  });
});
```

## Ǩ�Ƽ���嵥

- [ ] ����ԭʼmain.ts
- [ ] ������Ҫ����ģ��
- [ ] ע������ģ��
- [ ] ���Ի�������
- [ ] ����UI����
- [ ] ��������ʱ�л�
- [ ] �������
- [ ] �����ĵ�

## �ļ�λ��

```
src/
������ main.ts    # �°������
������ main_legacy.ts     # �ɰ汸��
������ core/
��   ������ InitializationManager.ts
��   ������ modules/
��       ������ index.ts
��       ������ RenderModule.ts
��       ������ TextureModule.ts
��   ������ SceneModule.ts
��   ������ ResourceModule.ts
��  ������ PhysicsModule.ts
��       ������ VehicleModule.ts
�� ������ RoadModule.ts
��       ������ GpuModule.ts
��       ������ UIModule.ts
docs/
������ initialization_system.md      # �ܹ�����ĵ�
������ migration_guide.md           # Ǩ��ָ��
������ migration_comparison.md        # ǰ��Ա�
```

## �������

- [�����ܹ��ĵ�](./initialization_system.md)
- [Ǩ��ָ��](./migration_guide.md)
- [ǰ��Ա�](./migration_comparison.md)
- [ϵͳ���](./system_design.md)

## ��ȡ����

- ����̨�鿴��`window.app`, `window.InitializationManager`
- �鿴��ʼ����־��`[Init] moduleName: phase`
- ������`InitializationManager.getErrors()`
- GitHub Issues: ��������ͽ���

---

**��ʾ**�������ļ���ӵ���ǩ��������ٲ��ģ�??
