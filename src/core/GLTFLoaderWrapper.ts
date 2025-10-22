import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class GLTFLoaderWrapper {
  loader: any;
  constructor(manager?: any) {
    this.loader = new GLTFLoader(manager);
  }

  load(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.loader.load(url, (gltf: any) => resolve(gltf), undefined, reject);
    });
  }
}
