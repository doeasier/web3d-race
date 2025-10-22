import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RoadManager } from '../../src/world/RoadManager';
import { generatePreset } from '../../src/world/RoadPresets';

describe('RoadManager', () => {
  let rm: RoadManager;
  beforeEach(() => {
    rm = new RoadManager({ segmentLength: 10, numSegments: 4, textureRepeatY: 2, scrollFactor: 0.5, roadOffset: 0 }, 6);
  });

  it('initializes segments in test mode (no scene)', () => {
    // init without scene should create data-only segments
    rm.init(null, null);
    expect(rm.segments.length).toBe(4);
    // segments should have position objects
    expect(typeof rm.segments[0].position.z).toBe('number');
  });

  it('updates positions correctly in test mode', () => {
    rm.init(null, null);
    rm.update(25, 5, 0.1); // vehicle at z=25, speed 5
    // compute expected base index
    const base = Math.floor(25 / 10);
    // first segment new z should equal (base)*len - vehicleZ
    expect(rm.segments[0].position.z).toBe((base) * 10 - 25);
  });

  it('can set texture repeat in test mode', () => {
    rm.init(null, null);
    rm.setTextureRepeat(5);
    expect(rm.config.textureRepeatY).toBe(5);
  });

  it('can init with a real scene and create instanced meshes', () => {
    const scene = new THREE.Scene();
    // create a simple material with a fake texture map
    const tex = new THREE.Texture();
    const mat = new THREE.MeshStandardMaterial({ map: tex });
    rm.init(scene, mat as any);
    // segments should be real meshes
    expect(rm.segments[0].mesh).toBeDefined();
    // instanced meshes should exist
    expect(rm.polesLeft).toBeDefined();
    expect(rm.bulbsLeft).toBeDefined();
  });

  it('updates instanced matrices without throwing', () => {
    const scene = new THREE.Scene();
    const tex = new THREE.Texture();
    const mat = new THREE.MeshStandardMaterial({ map: tex });
    rm.init(scene, mat as any);
    expect(() => rm.update(12, 3, 0.016)).not.toThrow();
  });

  it('dispose removes created meshes from the scene', () => {
    const scene = new THREE.Scene();
    const tex = new THREE.Texture();
    const mat = new THREE.MeshStandardMaterial({ map: tex });
    rm.init(scene, mat as any);
    // ensure some instanced meshes present
    let foundInstanced = false;
    scene.traverse((o) => { if ((o as any).isInstancedMesh) foundInstanced = true; });
    expect(foundInstanced).toBe(true);

    rm.dispose();
    // after dispose, no instanced meshes should remain
    let foundAfter = false;
    scene.traverse((o) => { if ((o as any).isInstancedMesh) foundAfter = true; });
    expect(foundAfter).toBe(false);
  });

  it('handles extreme speeds and large positions without producing NaN', () => {
    rm.init(null, null);
    const hugeZ = 1e9;
    const hugeV = 1e6;
    rm.update(hugeZ, hugeV, 1);
    // positions should be finite numbers
    for (const seg of rm.segments) {
      expect(Number.isFinite(seg.position.z)).toBe(true);
    }
    // roadOffset should have been updated
    expect(Number.isFinite(rm.config.roadOffset)).toBe(true);
  });

  it('respects maxRenderDistance LOD and does not throw', () => {
    const scene = new THREE.Scene();
    rm = new RoadManager({ segmentLength: 10, numSegments: 8, textureRepeatY: 2, scrollFactor: 0.2, roadOffset: 0, maxRenderDistance: 5 }, 6);
    const tex = new THREE.Texture();
    const mat = new THREE.MeshStandardMaterial({ map: tex });
    rm.init(scene, mat as any);
    // update with vehicle far away; should skip distant instances but not throw
    expect(() => rm.update(100, 10, 0.016)).not.toThrow();
  });

  it('can apply presets and compute laterals', () => {
    rm.init(null, null);
    const pts = generatePreset('gentleS', { length: 100, density: 6, amplitude: 3 });
    rm.applyControlPoints(pts, 0);
    // compute some lateral offsets
    const l0 = rm.computeLateral(0);
    const lmid = rm.computeLateral(50);
    expect(typeof l0).toBe('number');
    expect(typeof lmid).toBe('number');
  });
});
