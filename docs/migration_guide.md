# main.ts ģ�黯Ǩ��ָ��

## ����

`main.ts` �ѳɹ�Ǩ�Ƶ��µ�ģ�黯�ܹ���ԭʼ�汾�ѱ����� `src/main_legacy.ts`��

## Ǩ������

### ����ģ��

�������е�7������ģ���⣬Ǩ�ƹ�����������2��ģ�飺

#### 1. TextureModule (`src/core/modules/TextureModule.ts`)

**ְ��**��
- ��������������Դ����������·����գ�
- ���ȼ���Ԥ�����������˵���������
- ֧�ֵ�������ΪPNG

**�ؼ�����**��
```typescript
const textureModule = new TextureModule();
await textureModule.init();

// ��������
textureModule.carTexture;
textureModule.roadTexture;
textureModule.skyTexture;

// ��������
const dataUrl = textureModule.exportTexture('car');
```

#### 2. SceneModule (`src/core/modules/SceneModule.ts`)

**ְ��**��
- ������������պС����桢��������
- �ṩģ�����乤�ߣ�`fitModelToVehicle`��
- ֧������ʱ�滻����ģ��

**�ؼ�����**��
```typescript
const sceneModule = new SceneModule(scene, carTexture, skyTexture);
await sceneModule.init();

// �滻����ģ��
sceneModule.replaceCarMesh(newMesh);

// ����ģ�ͳߴ�
sceneModule.fitModelToVehicle(model, { length: 4, width: 1.8, height: 0.8 });
```

### �ܹ��Ա�

#### �ɰ汾 (main_legacy.ts)
```typescript
// ���г�ʼ��������һ��IIFE��
(async () => {
  // ��������
  const textures = await loadOrCreateTextures();
  
  // ������������
  const skybox = ...;
  scene.add(skybox);
  
  // ��������ϵͳ
  let physicsWorld = new RapierPhysicsWorldImpl();
  
  // ��������
  vehicle = new VehicleControllerFast(...);
  
  // UI����...
  // ��Ϸѭ��...
})();
```

**����**��
- 600+ �д������һ��
- ��ʼ��˳����ʽ������׷��
- �������ɢ
- ���Բ��Ժ�����

#### �°汾 (main.ts)
```typescript
class RacingGameApp {
  async initialize() {
    // 1. ��Ⱦ
    const renderModule = new RenderModule();
    this.initManager.register(renderModule);
    await this.initManager.initModule('render');
    
    // 2. ����
    const textureModule = new TextureModule();
    this.initManager.register(textureModule);
    await this.initManager.initModule('textures');
    
    // 3. ��������������Ⱦ+����
    const sceneModule = new SceneModule(...);
    this.initManager.register(sceneModule);
    await this.initManager.initModule('scene');
    
    // ... ����ģ��
  
    // ��������
  this.modules = { render, textures, scene, ... };
  }

  private animate = () => {
    // ��Ϸѭ��
  };
}

const app = new RacingGameApp();
app.start();
```

**����**��
- ? ������ģ��߽�
- ? ��ʽ��������
- ? ͳһ������
- ? ���ڲ���
- ? ֧��������

## ���ܱ������

### ? ��ȫ����

1. **��Ⱦϵͳ**
   - Three.js �������������Ⱦ��
   - ��������
   - ����resize����

2. **����ϵͳ**
   - �����������ɣ�car, road, sky��
   - Ԥ�����������
   - ����������

3. **����ϵͳ**
   - Rapier/Fake˫���
   - ����ʱ�л�

4. **����ϵͳ**
   - Fast/Precise˫ģʽ
   - ״̬����
   - ���ù���

5. **��·ϵͳ**
   - RoadManager
   - RoadsideSpawner
   - InstanceRenderer
   - GPU culling

6. **UIϵͳ**
 - HUD
   - �������
   - ģ̬��
   - ����־û�

7. **�ؿ�ϵͳ**
   - EngineFactory����
   - ����/������
   - ���ּ���֧��

8. **���ϵͳ**
- ����ļ�����
   - ���Ƶ�Ӧ��
   - �決����֧��

### ? ��������

1. **��ʼ���¼�**
   ```typescript
   InitializationManager.on((event) => {
     console.log(`[${event.module}] ${event.phase}`);
   });
   ```

2. **ģ��״̬��ѯ**
   ```typescript
   const state = InitializationManager.getState('physics');
   const errors = InitializationManager.getErrors();
   ```

3. **���ŵĴ�����ʾ**
   - ��ʼ��ʧ��ʱ��ʾ��ϸ����ҳ��
   - �����ذ�ť

4. **����֧��**
   ```typescript
   window.app // ����Ӧ��ʵ��
   window.InitializationManager // ���ʳ�ʼ��������
   ```

## Ǩ�Ʋ���ع�

### ��һ�׶Σ���������ģ�飨����ɣ�
- ? InitializationManager
- ? RenderModule
- ? ResourceModule
- ? PhysicsModule
- ? VehicleModule
- ? RoadModule
- ? GpuModule
- ? UIModule

### �ڶ��׶Σ���ȡ����ģ�飨����ɣ�
- ? TextureModule - �� `loadOrCreateTextures()` ��ȡ
- ? SceneModule - �ӳ������󴴽�������ȡ

### �����׶Σ���дmain.ts������ɣ�
- ? ���� `RacingGameApp` ��
- ? ����ע��ͳ�ʼ��ģ��
- ? ���������¼�������
- ? Ǩ����Ϸѭ��
- ? Ǩ�Ƹ������ܣ��ؿ����ء�������ء�����־û���

### ���Ľ׶Σ����ݺ��滻������ɣ�
- ? ����ԭʼ main.ts Ϊ main_legacy.ts
- ? �����µ� main.ts

## ��֤�嵥

��������в������¹��ܣ�

### ��������
- [ ] ҳ������޴���
- [ ] ����������Ⱦ����ա����桢������
- [ ] ����������ʾ

### ����ͳ���
- [ ] ����������ʻ
- [ ] �������л���Rapier ? Fake��
- [ ] ����ģʽ�л���Fast ? Precise��

### ��·�ͻ���
- [ ] ��·��������
- [ ] ·�߶�������spawn
- [ ] ����ļ�����
- [ ] ���Ƶ�Ӧ��

### UI�ͽ���
- [ ] HUD��ʾ�ٶ�
- [ ] ��ť��Ӧ����
- [ ] ѡ������������
- [ ] ģ̬����ʾ

### �߼�����
- [ ] WebGPU������Ϣ��ʾ
- [ ] �ؿ����أ�level_city.json, level_canyon.json��
- [ ] ����/����־û�
- [ ] ������

### ���Թ���
- [ ] ����̨��ʾ��ʼ����־
- [ ] `window.app` �ɷ���
- [ ] `window.InitializationManager` �ɷ���
- [ ] ��ʼ���¼���ȷ����

## ���˷���

����°汾�����⣬���Կ��ٻ��ˣ�

```bash
# �����°汾
mv src/main.ts src/main_modular_backup.ts

# �ָ��ɰ汾
cp src/main_legacy.ts src/main.ts

# ��������������
npm run dev
```

## ���ܶԱ�

|ָ��|�ɰ汾|�°汾|
|---|---|---|
|��ʼ����������|~600|~400 (main) + ~800 (modules)|
|��ʼ��ʱ��|~��ͬ|~��ͬ|
|�ڴ�ռ��|~��ͬ|~��ͬ|
|FPS|~��ͬ|~��ͬ|
|��ά����|��|��|
|�ɲ�����|��|��|

**˵��**���¼ܹ���Ҫ������������������ʱ���ܻ���һ�¡�

## �����Ľ�����

1. **��Ԫ����**
   - Ϊÿ��ģ���д����
   - ���Գ�ʼ������
   - ����ģ��佻��

2. **�����ļ�**
   - ��ģ��������ȡ��JSON
   - ֧�ֻ�����������

3. **�ӳټ���**
   - �ǹؼ�ģ�鰴�����
   - ������������ʱ��

4. **���ܼ��**
   - ��¼ÿ��ģ���ʼ����ʱ
   - ������ܷ�������

5. **������**
   - ����ģʽ֧��ģ�����滻
   - ��������ˢ��ҳ��

## ��������

### Q: Ϊʲô���ݶ�����ɾ���ɴ��룿
A: �����ɴ�����Ϊ�ο������ڶԱȺͻ��ˡ�ȷ���°汾�ȶ����ɾ����

### Q: ģ�����˳����Ҫ��
A: �ǵģ���InitializationManager���Զ�����������ֻҪ����`dependencies`�����ᰴ��ȷ˳���ʼ����

### Q: ��������ģ�飿
A: 
1. �� `src/core/modules/` ������ģ����
2. ʵ�� `InitModule` �ӿ�
3. �� main.ts ��ע��
4. �� `modules/index.ts` ����

### Q: ģ���ʼ��ʧ�ܻ�������
A: 
- �ǹؼ�ģ��ʧ�ܲ�Ӱ��Ӧ����������GPUģ�飩
- �ؼ�ģ��ʧ�ܻ���ʾ����ҳ�沢�ṩ���ذ�ť
- ���д��󶼼�¼������̨��InitializationManager

### Q: ������Ӱ����
A: ����û�С�ģ�黯��Ҫ���ƴ���ṹ������ʱ������С�������������������ã���

## ����ĵ�

- [��ʼ��ϵͳ�ܹ��ĵ�](./initialization_system.md)
- [ԭʼ����ĵ�](./system_design.md)
- [ģ��API�ο�](./api_reference.md) *(������)*

## �ܽ�

Ǩ�Ƴɹ���ɣ��µ�ģ�黯�ܹ��ṩ��

? **���õ���֯** - ÿ��ģ��ְ��һ  
? **��ǿ�Ŀ�ά����** - �����޸ĺ���չ  
? **���ߵĿɲ�����** - ÿ��ģ��ɶ�������  
? **������������** - ��ʽ�������Զ�����  
? **ͳһ�Ĵ�����** - ���й����ʼ������  
? **�¼�����** - ����ϵ�ģ��ͨ��  

**����100%�����������������������** ??
