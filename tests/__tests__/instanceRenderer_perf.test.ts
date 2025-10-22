import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { InstanceRenderer } from '../../src/world/InstanceRenderer';
import { RoadObjectDesc } from '../../src/world/RoadsideSpawner';

class DummyLoader { async loadModel(path:string) { return new THREE.Object3D(); } }

describe('InstanceRenderer performance counters', () => {
  it('collects counters per-frame', () => {
    const scene = new THREE.Scene();
    const ir = new InstanceRenderer();
    ir.init(scene, new DummyLoader() as any, { near: 5, mid: 20, far: 100 });
    const descs: RoadObjectDesc[] = [];
    for (let i = 0; i < 10; i++) descs.push({ id:`t${i}`, type:'tree', z: i, lateral:0, y:0, rotY:0, scale:1, interactive:false });
    ir.setInstances('tree', descs);
    const cam = new THREE.PerspectiveCamera(60, 1.0, 0.1, 1000);
    cam.updateMatrixWorld(true);
    ir.update(cam);
    const p = ir.getPerformanceCounters();
    expect(p.totalInstances).toBeGreaterThanOrEqual(10);
    expect(p.drawCalls).toBeGreaterThanOrEqual(1);
  });
});
