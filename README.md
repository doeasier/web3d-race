# WEB3D Racing Game ???

> **���¸���**: �����ģ�黯�ܹ�Ǩ�ƣ��鿴 [Ǩ�Ƴɹ�����](./docs/MIGRATION_SUCCESS.md) ??

һ������WebGL/WebGPU��3D������Ϸ������ģ�黯�ܹ���ơ�

## ? ����

- ?? **˫��������**: Rapier (��ȷ) / Fake (����)��֧������ʱ�л�
- ?? **˫����ģʽ**: Fast / Precise����Ӧ��ͬ����
- ??? **��̬��·ϵͳ**: �������ߡ���б�ǡ��決����֧��
- ?? **����ϵͳ**: GPU culling��impostor��Ⱦ��ʵ�����Ż�
- ?? **��������**: �Զ����ɻ���ļ�����
- ??? **WebGPU����**: ��׶�޳���compute shader
- ?? **ģ�黯�ܹ�**: 9������ģ�飬������չ�Ͳ���

## ?? ���ٿ�ʼ

```bash
# ��װ����
npm install

# ����ģʽ
npm run dev

# ����
npm run build

# ����
npm test
```

���� `http://localhost:5173` �鿴Ӧ�á�

## ?? �ĵ�����

### �����ĵ�
- [**Ǩ�Ƴɹ�����**](./docs/MIGRATION_SUCCESS.md) - ?? ����Ǩ���ܽ�
- [**�ܹ����**](./docs/initialization_system.md) - ģ�黯ϵͳ���
- [**Ǩ��ָ��**](./docs/migration_guide.md) - ���Ǩ�����д���
- [**ǰ��Ա�**](./docs/migration_comparison.md) - Ǩ��ǰ����ϸ�Ա�
- [**���ٲο�**](./docs/quick_reference.md) - �ٲ鿨Ƭ

### ϵͳ���
- [ϵͳ����ĵ�](./docs/system_design.md)
- [����ϵͳ���](./docs/environment_system_design.md)
- [��������ĵ�](./docs/vehicle_design.md)

## ??? �ܹ�����

### ģ�黯�ܹ�

```
InitializationManager (����Э����)
��
������ RenderModule (��Ⱦ)
������ TextureModule (����)
������ SceneModule (��������)
������ ResourceModule (��Դ����)
������ PhysicsModule (��������)
������ VehicleModule (��������)
������ RoadModule (��·ϵͳ)
������ GpuModule (GPU����)
������ UIModule (�û�����)
```

ÿ��ģ��������ɲ��ԡ����滻��

### �ļ��ṹ

```
src/
������ main.ts     # ? �°������(ģ�黯)
������ main_legacy.ts           # ?? �ɰ汸��
������ main_modular.ts    # ?? �ο�ʵ��
������ core/
��   ������ InitializationManager.ts  # ��ʼ��������
��   ������ modules/   # 9������ģ��
��   ��   ������ RenderModule.ts
��   ��   ������ TextureModule.ts
��   ��   ������ SceneModule.ts
��   ��   ������ ResourceModule.ts
��   ��   ������ PhysicsModule.ts
��   ��   ������ VehicleModule.ts
��   ��   ������ RoadModule.ts
��   ��   ������ GpuModule.ts
��   ��   ������ UIModule.ts
��   ������ ... (�������Ĵ���)
������ gameplay/                # ��Ϸ�߼�
������ world/     # ����ϵͳ
������ types/       # ���Ͷ���
```

## ?? ʹ��ʾ��

### ����ʹ��

```typescript
import { RacingGameApp } from './main';

// Ӧ�����Զ�����
// ����ʵ����window.app
// ���ʹ�������window.InitializationManager
```

### ����

```javascript
// ���������̨
> app.modules
{ render, textures, scene, physics, vehicle, road, gpu, ui }

> app.modules.physics.switchBackend('fake')
// �л���Fake������

> InitializationManager.getState('vehicle')
'ready'

> InitializationManager.getErrors()
Map(0) {}
```

### �л���������

```javascript
// ͨ��UIѡ���
// ���ڿ���̨
await app.modules.physics.switchBackend('rapier');
```

### ���ع��

```javascript
// ͨ��UIѡ���ѡ����
// ���ڿ���̨
await app.handleTrackChange('canyon_circuit.json');
```

### ��������

```javascript
// ���"Export Textures"��ť
// ���ڿ���̨
app.modules.textures.exportTexture('car');
```

## ?? ����

```bash
# �������в���
npm test

# ����ģʽ
npm test -- --watch

# �����ʱ���
npm test -- --coverage
```

���Ը����ˣ�
- ��Ԫ���ԣ�ÿ��ģ�飩
- ���ɲ��ԣ�ģ��佻����
- �˵��˲��ԣ��������̣�

## ?? ����

| ָ�� | ֵ |
|------|-----|
| ��ʼ��ʱ�� | ~820ms |
| �ڴ�ռ�� | ~125MB |
| ����ʱFPS | 60 FPS |
| �������(ѹ��) | ~68KB |

**WebGPU֧��**: �Զ���Ⲣ���ã�������ã�

## ??? ����ջ

- **��Ⱦ**: Three.js
- **����**: Rapier.js (��ѡFake����)
- **GPU����**: WebGPU (��ѡWebGL2����)
- **��������**: Vite
- **����**: Vitest
- **���ͼ��**: TypeScript
- **��������**: ESLint + Prettier

## ?? ����

��ӭ���״��롢���������������飡

### ��������

1. Fork��Ŀ
2. �������Է�֧ (`git checkout -b feature/AmazingFeature`)
3. �ύ���� (`git commit -m 'Add some AmazingFeature'`)
4. ���͵���֧ (`git push origin feature/AmazingFeature`)
5. ����Pull Request

### ����淶

- ��ѭ���д�����
- Ϊ�¹��ܱ�д����
- ��������ĵ�
- ȷ�����в���ͨ��

## ?? ������־

### v2.0.0 (Latest) - ģ�黯�ܹ�
- ? ��ȫ�ع�Ϊģ�黯�ܹ�
- ? ����TextureModule��SceneModule
- ? ͳһ��InitializationManager
- ? ֧������ʱ�л�������
- ? �Ľ��Ĵ�����͵���֧��
- ?? ȫ����ĵ�����

### v1.0.0 - ��ʼ�汾
- ������Ⱦ������ϵͳ
- �������ƺ͵�·����
- GPU culling PoC

�鿴 [����������־](./CHANGELOG.md)

## ?? ���֤

MIT License - �鿴 [LICENSE](./LICENSE) �ļ��˽�����

## ?? ��л

- Three.js �Ŷ�
- Rapier.js �Ŷ�
- ���й����ߺͲ�����

## ?? ��ϵ��ʽ

- GitHub Issues: [��������](https://github.com/doeasier/web3d-race/issues)
- ����: [GitHub Discussions](https://github.com/doeasier/web3d-race/discussions)

## ?? Star History

��������Ŀ�����а������������һ�� ??��

---

**������**: 2024  
**״̬**: ? Production Ready  
**�ܹ�**: Modular  
**�汾**: 2.0.0
