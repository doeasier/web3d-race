/**
 * 资源加载模块
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

    // 尝试加载atlas列表
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
      // 非致命错误，继续
}

    console.log('ResourceModule: initialized');
  }

  cleanup(): void {
    // 清理资源
  }
}
