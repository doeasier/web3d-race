/**
 * ��Դ����ģ��
 */
import { InitModule } from '../InitializationManager';
import { ResourceManager } from '../ResourceManager';
import { GLTFLoaderWrapper } from '../GLTFLoaderWrapper';
import { AssetLoader } from '../AssetLoader';

export class ResourceModule implements InitModule {
  name = 'resources';
  phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';

  resourceManager!: ResourceManager;
  gltfLoader!: GLTFLoaderWrapper;
  assetLoader!: AssetLoader;

  async init(): Promise<void> {
  this.resourceManager = new ResourceManager();
    this.gltfLoader = new GLTFLoaderWrapper();
    this.assetLoader = new AssetLoader();

    // ���Լ���atlas�б�
    try {
      const ok = await this.resourceManager.loadAtlasList('/assets/atlases/atlas_list.json');
      if (ok) {
        const info = this.resourceManager.getAtlas('tree');
        if (info) {
   this.assetLoader.registerImpostorAtlas('tree', info);
        }
    }
    } catch (e) {
      console.warn('ResourceModule: failed to load atlas list', e);
      // ���������󣬼���
}

    console.log('ResourceModule: initialized');
  }

  cleanup(): void {
    // ������Դ
  }
}
