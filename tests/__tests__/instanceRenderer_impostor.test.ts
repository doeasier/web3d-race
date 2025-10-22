import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { InstanceRenderer } from '../../src/world/InstanceRenderer';
import { RoadObjectDesc } from '../../src/world/RoadsideSpawner';

class DummyLoader { async loadModel(path:string) { return new THREE.Object3D(); } }

describe('InstanceRenderer impostor pipeline', () => {
  it('creates impostor pool for mid LOD and marks material', () => {
    const scene = new THREE.Scene();
    const ir = new InstanceRenderer();
    ir.init(scene, new DummyLoader() as any, { near: 5, mid: 15, far: 100 });
    const descs: RoadObjectDesc[] = [ { id: 'a', type: 'tree', z: 10, lateral: 0, y:0, rotY:0, scale:1, interactive:false } ];
    ir.setInstances('tree', descs);
    // find pools with userData._roadManager and impostor material flag
    let foundImpostor = false;
    scene.traverse((o:any)=>{
      if (o && o.userData && o.userData._roadManager) {
        const mat = (o.material as any);
        if (mat && mat.userData && mat.userData._isImpostor) foundImpostor = true;
      }
    });
    expect(foundImpostor).toBe(true);
  });

  it('uses instanced mesh for near LOD', () => {
    const scene = new THREE.Scene();
    const ir = new InstanceRenderer();
    ir.init(scene, new DummyLoader() as any, { near: 50, mid: 100, far: 500 });
    const descs: RoadObjectDesc[] = [ { id: 'a', type: 'tree', z: 10, lateral: 0, y:0, rotY:0, scale:1, interactive:false } ];
    ir.setInstances('tree', descs);
    let foundInstanced = false;
    scene.traverse((o:any)=>{ if (o && o.isInstancedMesh) foundInstanced = true; });
    expect(foundInstanced).toBe(true);
  });
});
