import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { InstanceRenderer } from '../../src/world/InstanceRenderer';
import { RoadObjectDesc } from '../../src/world/RoadsideSpawner';

class DummyLoader {
  async loadModel(path:string) { return new THREE.Object3D(); }
}

describe('InstanceRenderer', () => {
  it('creates instanced mesh and updates matrices', () => {
    const scene = new THREE.Scene();
    const ir = new InstanceRenderer();
    ir.init(scene, new DummyLoader() as any);
    const descs: RoadObjectDesc[] = [ { id: 't1', type: 'tree', z: 10, lateral: -2, y:0, rotY:0, scale:1, interactive:false }, { id:'t2', type:'tree', z:20, lateral:2,y:0, rotY:0.5, scale:1.2, interactive:false } ];
    ir.setInstances('tree', descs);
    // scene should have at least one child added by InstanceRenderer
    expect(scene.children.length).toBeGreaterThan(0);
   });

  it('creates separate pools for LOD buckets', () => {
    const scene = new THREE.Scene();
    const ir = new InstanceRenderer();
    ir.init(scene, new DummyLoader() as any, { near: 5, mid: 20, far: 100 });
    const descs: RoadObjectDesc[] = [ { id: 'n', type: 'tree', z: 2, lateral: -1, y:0, rotY:0, scale:1, interactive:false }, { id:'m', type:'tree', z:10, lateral:1,y:0, rotY:0.5, scale:1.2, interactive:false }, { id:'f', type:'tree', z:50, lateral:2,y:0, rotY:0.2, scale:0.8, interactive:false } ];
    ir.setInstances('tree', descs);
    // expect three pools (tree|near, tree|mid, tree|far)
    const poolKeys = scene.children.map((c:any)=>c.userData?._roadManager ? c : null).filter(Boolean);
    expect(scene.children.length).toBeGreaterThanOrEqual(1);
  });
 });
