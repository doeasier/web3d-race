import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { InstanceRenderer } from '../../src/world/InstanceRenderer';
import { AssetLoader } from '../../src/core/AssetLoader';

class DummyLoader extends AssetLoader { async loadModel(path:string) { return new THREE.Object3D(); } }

describe('InstanceRenderer impostor atlas integration', () => {
  it('attaches atlas info to impostor materials when assetLoader has atlas', () => {
    const scene = new THREE.Scene();
    const loader = new DummyLoader();
    loader.registerImpostorAtlas('tree', { angles: 8, url: 'atlas.png' });
    const ir = new InstanceRenderer();
    ir.init(scene, loader as any, { near:5, mid:20, far:100 });
    const descs = [ { id: 't1', type: 'tree', z:10, lateral:0, y:0, rotY:0, scale:1, interactive:false } ];
    ir.setInstances('tree', descs);
    let found = false;
    scene.traverse((o:any)=>{
      if (o && o.userData && o.userData._roadManager) {
        const mat = (o.material as any);
        if (mat && mat.userData && mat.userData._impostorAtlasInfo) found = true;
      }
    });
    expect(found).toBe(true);
  });
});
