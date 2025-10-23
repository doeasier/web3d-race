# ģ�黯��ʼ��ϵͳ����ĵ�

## ����

�µ�ģ�黯��ʼ��ϵͳּ�ڽ���������⣺
1. **��ʼ�������������**����ͬģ��ĳ�ʼ��˳�����Կ���
2. **������һ��**��ȱ��ͳһ�Ĵ�����ͽ�������
3. **main.ts ����ӷ��**��ҵ���߼���ʵ��ϸ�ڻ���
4. **ģ����������**��ֱ�����õ������Բ��Ժ�ά��

## �ܹ����

### �������

```
src/core/
������ InitializationManager.ts    # ��ʼ����������������
������ modules/         # ������ģ��
    ������ index.ts          # ģ�鵼��
    ������ RenderModule.ts          # ��Ⱦϵͳ
������ ResourceModule.ts        # ��Դ����
    ������ PhysicsModule.ts     # ��������
    ������ VehicleModule.ts         # ����ϵͳ
    ������ RoadModule.ts     # ��·�ͻ���
    ������ GpuModule.ts      # GPU����
    ������ UIModule.ts     # UIϵͳ
```

### InitializationManager

**ְ��**��
- ע��͹������г�ʼ��ģ��
- ����ģ���������ϵ
- �ṩ�¼�֪ͨ����
- ͳһ�������״̬����

**����API**��
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

**ʹ��ʾ��**��
```typescript
import InitializationManager from './core/InitializationManager';
import { RenderModule } from './core/modules';

const renderModule = new RenderModule();
InitializationManager.register(renderModule);

// ������ʼ���¼�
InitializationManager.on((event) => {
  console.log(`[${event.module}] ${event.phase}`);
});

// ��ʼ��
await InitializationManager.initAll();
```

## ��ģ��˵��

### 1. RenderModule����Ⱦģ�飩

**ְ��**��
- ����Three.js�������������Ⱦ��
- ���û�������
- ������resize

**����**��
- `scene: THREE.Scene`
- `camera: THREE.PerspectiveCamera`
- `renderer: THREE.WebGLRenderer`

### 2. ResourceModule����Դģ�飩

**ְ��**��
- ����ResourceManager��GLTFLoader��AssetLoader
- ����atlas�б����Դ����

**����**��
- `resourceManager: ResourceManager`
- `gltfLoader: GLTFLoaderWrapper`
- `assetLoader: AssetLoader`

### 3. PhysicsModule������ģ�飩

**ְ��**��
- ��ʼ���������棨Rapier/Fake��
- ֧������ʱ�л����

**����**��
- `physicsWorld: IPhysicsWorld`

**�ؼ�����**��
```typescript
await physicsModule.switchBackend('fake', preservedState);
```

### 4. VehicleModule������ģ�飩

**����**��`physics`

**ְ��**��
- ��������������
- ������״̬

**����**��
- `vehicle: VehicleControllerFast`
- `profile: VehicleProfile`

### 5. RoadModule����·ģ�飩

**����**��`render`, `resources`

**ְ��**��
- ����RoadManager��RoadsideSpawner
- ��ʼ��InstanceRenderer����ѡ��
- �����·����

**����**��
- `roadManager: RoadManager`
- `spawner: RoadsideSpawner`
- `instanceRenderer?: InstanceRenderer`

**�ؼ�����**��
```typescript
roadModule.applyControlPoints(points, totalLength);
roadModule.update(worldZ, speed, dt);
```

### 6. GpuModule��GPUģ�飩

**ְ��**��
- ���WebGPU������
- �ռ�adapter��Ϣ

**����**��
- `isWebGpuAvailable: boolean`
- `adapterInfo: any`

**�ص�**��ʧ�ܲ�����Ӧ���������ǹؼ�ģ�飩

### 7. UIModule��UIģ�飩

**ְ��**��
- ��������UIԪ�أ�HUD��������塢ģ̬��
- �����û������ص�

**����ʾ��**��
```typescript
const uiModule = new UIModule({
  onStart: () => { /* ... */ },
  onPause: () => { /* ... */ },
  onPhysicsChange: (backend) => { /* ... */ }
});
```

**�ؼ�����**��
```typescript
uiModule.updateHUD(speed);
uiModule.showWarningsModal(true);
uiModule.showWebGpuModal(true);
```

## ʹ��ָ��

### ����ʾ����main_modular.ts��

```typescript
import InitializationManager from './core/InitializationManager';
import { RenderModule, PhysicsModule, VehicleModule } from './core/modules';

class Application {
  private modules: any = {};

  async initialize() {
    // 1. ע��ģ��
    const renderModule = new RenderModule();
    InitializationManager.register(renderModule);

  const physicsModule = new PhysicsModule('rapier');
    InitializationManager.register(physicsModule);

    // 2. ��ʼ������󴴽���������Ϊ��������
    await InitializationManager.initModule('physics');
    const vehicleModule = new VehicleModule(physicsModule.physicsWorld);
    InitializationManager.register(vehicleModule);

    // 3. ��ʼ������
    const results = await InitializationManager.initAll();

    // 4. ���ؼ�ģ��
    if (!results.get('render') || !results.get('physics')) {
      throw new Error('Critical modules failed');
    }

    // 5. ��������
    this.modules = { render: renderModule, physics: physicsModule, /* ... */ };
  }

  animate = () => {
    // ��Ϸѭ��
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

### Ǩ�����д���

1. **ʶ���ܿ�**����main.ts�еĳ�ʼ�����밴���ܷ���
2. **����ģ��**��Ϊÿ�����ܴ�����Ӧ��Module��
3. **��������**����`dependencies`�������г�ǰ��ģ��
4. **ע��ͳ�ʼ��**��ʹ��InitializationManagerЭ��

### ���Ժͼ��

```typescript
// �������г�ʼ���¼�
InitializationManager.on((event) => {
  if (event.phase === 'error') {
    console.error(`Module ${event.module} failed:`, event.error);
  }
});

// ��ѯģ��״̬
const state = InitializationManager.getState('physics'); // 'pending' | 'ready' | ...

// ��ȡ���д���
const errors = InitializationManager.getErrors();
errors.forEach((err, module) => {
  console.error(`${module}: ${err.message}`);
});
```

## ����

1. **��������������**��ͨ��`dependencies`��ʽ�������Զ���������
2. **ͳһ������**������ģ�����ͨ���¼�֪ͨ�����ڼ��д���
3. **���ڲ���**��ÿ��ģ��ɶ������ԣ�mock����ģ��
4. **����**��main.tsֻ������װ��Э�������漰����ʵ��
5. **����չ**����������ֻ�贴����Module��ע��
6. **���Ž���**���ǹؼ�ģ��ʧ�ܲ�Ӱ��Ӧ������

## ���ʵ��

1. **ģ��ְ��һ**��ÿ��ģ��ֻ����һ������
2. **��С������**����������ģ�������������ʹ���¼�ͨ��
3. **�첽�Ѻ�**��init����ȫ������Promise
4. **���󲻾�Ĭ**����ʼ��ʧ��Ҫ��ȷ�׳����¼
5. **�ṩcleanup**��ʵ��cleanup������֧�������غͲ���

## �����Ľ�����

1. **�����ļ�����**����JSON/YAML����ģ������
2. **������֧��**������ģʽ��֧��ģ�����滻
3. **���ܼ��**����¼ÿ��ģ���ʼ����ʱ
4. **�ӳټ���**���ǹؼ�ģ��ɰ����첽����
5. **���ϵͳ**��֧�ֵ��������ע��Ϊģ��

## �ο�

- ����ʵ�֣�`src/main.ts`����ͳ��ʽ��
- �¼ܹ�ʾ����`src/main_modular.ts`
- ģ��Ŀ¼��`src/core/modules/`
