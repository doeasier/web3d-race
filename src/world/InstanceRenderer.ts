import * as THREE from 'three';
import { RoadObjectDesc } from './RoadsideSpawner';
import { ObjectPool } from './ObjectPool';

export interface IAssetLoader { loadModel(path:string): Promise<THREE.Object3D>; }

export type LODKey = 'near' | 'mid' | 'far';

export class InstanceRenderer {
  private scene: THREE.Scene | null = null;
  private assetLoader: IAssetLoader | null = null;
  // pools keyed by `${type}|${lod}`
  private pools: Map<string, THREE.InstancedMesh> = new Map();
  private tempMatrix = new THREE.Object3D();
  private poolManager = new ObjectPool();
  private lodConfig: { near: number; mid: number; far: number } = { near: 30, mid: 120, far: 400 };
  // store last set descriptors per pool for culling
  private pendingDescs: Map<string, RoadObjectDesc[]> = new Map();
  private allocatedMap: Map<string, number[]> = new Map();
  // performance counters collected per-frame
  private perfCounters: {
    frameTs: number | null;
    totalInstances: number;
    drawCalls: number;
    byType: Record<string, { byLod: Record<string, number>, total: number }>;
  } = { frameTs: null, totalInstances: 0, drawCalls: 0, byType: {} };
  // active GPU-visible sets applied this frame
  private _gpuVisibleMap: Map<string, Set<number>> = new Map();
  // double-buffered pending GPU-visible sets: writers write to _gpuVisiblePendingWrite; update() swaps to _gpuVisibleApply
  private _gpuVisiblePendingWrite: Map<string, Set<number>> = new Map();
  private _gpuVisibleApply: Map<string, Set<number>> = new Map();

  init(scene: THREE.Scene, assetLoader: IAssetLoader, lodConfig?: { near:number; mid:number; far:number }) {
    this.scene = scene;
    this.assetLoader = assetLoader;
    if (lodConfig) this.lodConfig = lodConfig;
  }

  // classify a descriptor into LOD bucket by z distance
  private classifyLOD(z: number): LODKey {
    const d = Math.abs(z);
    if (d < this.lodConfig.near) return 'near';
    if (d < this.lodConfig.mid) return 'mid';
    return 'far';
  }

  // set instances for a given type; this will split into LOD buckets internally
  setInstances(type: string, descs: RoadObjectDesc[]) {
    if (!this.scene) return;
    // bucket by LOD
    const buckets: Record<LODKey, RoadObjectDesc[]> = { near: [], mid: [], far: [] };
    for (const d of descs) {
      const key = this.classifyLOD(d.z);
      buckets[key].push(d);
    }

    for (const lod of ['near','mid','far'] as LODKey[]) {
      const list = buckets[lod];
      const poolKey = `${type}|${lod}`;
      let mesh = this.pools.get(poolKey);
      if (!mesh) {
        // create simple placeholder mesh per pool
        const parts = poolKey.split('|');
        const lodPart = (parts.length > 1 ? parts[1] : 'near') as LODKey;
        let geo: THREE.BufferGeometry;
        let mat: THREE.Material;
        if (lodPart === 'mid') {
          // simple impostor: a plane facing camera (sprite-like).
          geo = new THREE.PlaneGeometry(1,1);
          const typeKey = parts[0] || '';
          let atlas: any = null;
          try {
            if (this.assetLoader && typeof (this.assetLoader as any).getImpostorAtlas === 'function') {
              atlas = (this.assetLoader as any).getImpostorAtlas(typeKey);
            }
          } catch (e) { atlas = null; }

          if (atlas) {
            // create a simple shader material that samples an atlas texture using per-instance frame
            const cols = atlas.cols || atlas.angles || 8;
            const rows = atlas.rows || 1;
            // fallback white 1x1 texture to avoid async loading in tests
            const dt = new THREE.DataTexture(new Uint8Array([255,255,255,255]), 1, 1, THREE.RGBAFormat);
            dt.needsUpdate = true;
            const shaderMat = new THREE.ShaderMaterial({
              uniforms: {
                atlasTex: { value: dt },
                atlasCols: { value: cols },
                atlasRows: { value: rows }
              },
              vertexShader: `
                attribute float instanceFrame;
                varying vec2 vUv;
                varying float vFrame;
                void main() {
                  vUv = uv;
                  vFrame = instanceFrame;
                  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                  gl_Position = projectionMatrix * mvPosition;
                }
              `,
              fragmentShader: `
                precision mediump float;
                uniform sampler2D atlasTex;
                uniform float atlasCols;
                uniform float atlasRows;
                varying vec2 vUv;
                varying float vFrame;
                void main() {
                  float col = mod(vFrame, atlasCols);
                  float row = floor(vFrame / atlasCols);
                  vec2 uv = vUv;
                  uv.x = (uv.x + col) / atlasCols;
                  uv.y = (uv.y + row) / atlasRows;
                  vec4 c = texture2D(atlasTex, uv);
                  if (c.a < 0.01) discard;
                  gl_FragColor = c;
                }
              `,
              transparent: true
            });
            (shaderMat as any).userData = (shaderMat as any).userData || {};
            (shaderMat as any).userData._impostorAtlasInfo = atlas;
            mat = shaderMat;
            // async load atlas texture if assetLoader provides loader
            try {
              if (this.assetLoader && typeof (this.assetLoader as any).loadTexture === 'function') {
                (this.assetLoader as any).loadTexture(atlas.url).then((tex:any) => {
                  try { shaderMat.uniforms.atlasTex.value = tex; shaderMat.needsUpdate = true; } catch (e) {}
                }).catch(()=>{});
              }
            } catch(e) {}
          } else {
            const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x88aa88), transparent: true });
            (m as any).userData = (m as any).userData || {};
            (m as any).userData._isImpostor = true;
            mat = m;
          }
        } else {
          geo = new THREE.BoxGeometry(1,1,1);
          mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x88aa88) });
        }
        mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
        (mesh as any).userData._roadManager = true;
        // if material contains atlas info, add per-instance frame attribute to geometry
        try {
          const atlas = (mat as any).userData && (mat as any).userData._impostorAtlasInfo;
          if (atlas) {
            const frames = new Float32Array(mesh.count);
            const attr = new THREE.InstancedBufferAttribute(frames, 1);
            mesh.geometry.setAttribute('instanceFrame', attr);
          }
        } catch (e) {}
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.pools.set(poolKey, mesh);
        this.scene.add(mesh);
      }

      // ensure capacity via pool manager (simple bookkeeping)
      const cap = this.poolManager.ensureCapacity(poolKey, list.length, Math.max(32, list.length * 2));
      if (mesh.count < cap) {
        // recreate mesh with larger capacity; preserve LOD type
        try { if (this.scene) this.scene.remove(mesh); } catch (e) {}
        // determine lodPart
        const parts = poolKey.split('|');
        const lodPart = (parts.length > 1 ? parts[1] : 'near') as LODKey;
        mesh.geometry.dispose();
        (mesh.material as any).dispose();
        let newGeo: THREE.BufferGeometry;
        let newMat: THREE.Material;
        if (lodPart === 'mid') {
          newGeo = new THREE.PlaneGeometry(1,1);
          const typeKey = parts[0] || '';
          let atlas: any = null;
          try { if (this.assetLoader && typeof (this.assetLoader as any).getImpostorAtlas === 'function') atlas = (this.assetLoader as any).getImpostorAtlas(typeKey); } catch (e) { atlas = null; }
          if (atlas) {
            const cols = atlas.cols || atlas.angles || 8;
            const rows = atlas.rows || 1;
            const dt = new THREE.DataTexture(new Uint8Array([255,255,255,255]), 1, 1, THREE.RGBAFormat);
            dt.needsUpdate = true;
            newMat = new THREE.ShaderMaterial({
              uniforms: { atlasTex: { value: dt }, atlasCols: { value: cols }, atlasRows: { value: rows } },
              vertexShader: `attribute float instanceFrame; varying vec2 vUv; varying float vFrame; void main(){ vUv=uv; vFrame=instanceFrame; vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mvPosition; }`,
              fragmentShader: `precision mediump float; uniform sampler2D atlasTex; uniform float atlasCols; uniform float atlasRows; varying vec2 vUv; varying float vFrame; void main(){ float col = mod(vFrame, atlasCols); float row = floor(vFrame/atlasCols); vec2 uv=vUv; uv.x = (uv.x + col)/atlasCols; uv.y = (uv.y + row)/atlasRows; vec4 c = texture2D(atlasTex, uv); if(c.a<0.01) discard; gl_FragColor = c; }`,
              transparent: true
            });
            (newMat as any).userData = (newMat as any).userData || {};
            (newMat as any).userData._impostorAtlasInfo = atlas;
          } else {
            const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x88aa88), transparent: true });
            (m as any).userData = (m as any).userData || {};
            (m as any).userData._isImpostor = true;
            newMat = m;
          }
        } else {
          newGeo = new THREE.BoxGeometry(1,1,1);
          newMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x88aa88) });
        }
        mesh = new THREE.InstancedMesh(newGeo, newMat, cap);
        (mesh as any).userData._roadManager = true;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // if atlas present, add instanceFrame attribute
        try {
          const atlas = (mesh.material as any).userData && (mesh.material as any).userData._impostorAtlasInfo;
          if (atlas) {
            const frames = new Float32Array(mesh.count);
            const attr = new THREE.InstancedBufferAttribute(frames, 1);
            mesh.geometry.setAttribute('instanceFrame', attr);
          }
        } catch (e) {}
        this.pools.set(poolKey, mesh);
        this.scene.add(mesh);
      }

      // allocate slots from pool and write matrices
      const allocated = this.poolManager.allocate(poolKey, list.length);
      // record currently allocated for later release of unused slots
      const prevAllocated = (mesh as any).userData._allocatedSlots || [];
      (mesh as any).userData._allocatedSlots = allocated.slice();
      // store pending descriptors and allocation mapping for frustum culling in update()
      this.pendingDescs.set(poolKey, list.slice());
      this.allocatedMap.set(poolKey, allocated.slice());

      // update perf counters for this type|lod
      const parts = poolKey.split('|');
      const typeKey = parts[0] || type;
      const lodKey = (parts[1] || 'near') as LODKey;
      if (!this.perfCounters.byType[typeKey]) this.perfCounters.byType[typeKey] = { byLod: {}, total: 0 };
      this.perfCounters.byType[typeKey].byLod[lodKey] = (this.perfCounters.byType[typeKey].byLod[lodKey] || 0) + list.length;
      this.perfCounters.byType[typeKey].total += list.length;
      this.perfCounters.totalInstances += list.length;
    }
  }

  // Expose pool for tests/debug
  getPool(poolKey: string) {
    return this.pools.get(poolKey);
  }

  update(camera: THREE.Camera) {
    // Apply pending GPU visibility updates at start of frame (double-buffer swap)
    if (this._gpuVisiblePendingWrite.size >0) {
      // swap write -> apply
      this._gpuVisibleApply = this._gpuVisiblePendingWrite;
      this._gpuVisiblePendingWrite = new Map();
      // replace active map entirely with apply contents to avoid stale entries
      this._gpuVisibleMap = new Map();
      for (const [k, v] of this._gpuVisibleApply) {
        this._gpuVisibleMap.set(k, v);
      }
      this._gpuVisibleApply.clear();
    }
    if (!camera) return;
    // build frustum
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(projScreenMatrix);

    // For each pool, cull per-instance by checking descriptor position
    for (const [poolKey, mesh] of this.pools) {
      const descs = this.pendingDescs.get(poolKey) || [];
      const allocated = this.allocatedMap.get(poolKey) || (mesh as any).userData._allocatedSlots || [];
      // if counts mismatch, just ensure update flag and continue
      if (descs.length === 0 || allocated.length === 0) {
        mesh.instanceMatrix.needsUpdate = true;
        continue;
      }

      const mat = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const tmpObj = this.tempMatrix; // reuse temp object to avoid allocations
      const gpuSet = this._gpuVisibleMap.get(poolKey);
      for (let i = 0; i < allocated.length; i++) {
        const slot = allocated[i];
        const d = descs[i];
        if (!d) {
          // clear slot
          mat.identity();
          mat.setPosition(0, -9999, 0);
          mesh.setMatrixAt(slot, mat);
          continue;
        }

        // If GPU-provided visibility map exists, use it to skip CPU work for invisible instances
        if (gpuSet) {
          if (!gpuSet.has(i)) {
            mat.identity();
            mat.setPosition(0, -9999, 0);
            mesh.setMatrixAt(slot, mat);
            continue;
          }
          // visible per GPU; rebuild transform without frustum check
          tmpObj.position.set(d.lateral ?? 0, d.y ?? 0, d.z);
          tmpObj.rotation.set(0, d.rotY ?? 0, 0);
          tmpObj.scale.set(d.scale ?? 1, d.scale ?? 1, d.scale ?? 1);
          tmpObj.updateMatrix();
          mesh.setMatrixAt(slot, tmpObj.matrix);
          continue;
        }

        // default CPU frustum culling path
        pos.set(d.lateral ?? 0, d.y ?? 0, d.z);
        if (!frustum.containsPoint(pos)) {
          mat.identity();
          mat.setPosition(0, -9999, 0);
          mesh.setMatrixAt(slot, mat);
        } else {
          // rebuild transform
          tmpObj.position.set(d.lateral ?? 0, d.y ?? 0, d.z);
          tmpObj.rotation.set(0, d.rotY ?? 0, 0);
          tmpObj.scale.set(d.scale ?? 1, d.scale ?? 1, d.scale ?? 1);
          tmpObj.updateMatrix();
          mesh.setMatrixAt(slot, tmpObj.matrix);
        }
      }
      // mark frame attribute updated if present
      try {
        const attr = (mesh.geometry as any).getAttribute('instanceFrame') as THREE.InstancedBufferAttribute | undefined;
        if (attr) attr.needsUpdate = true;
      } catch (e) {}
      mesh.instanceMatrix.needsUpdate = true;
    }

    // finalize perf counters: estimate drawCalls as number of pools with at least one instance
    let drawCalls = 0;
    for (const [k, m] of this.pools) {
      if ((m as any).count && (m as any).count > 0) drawCalls++;
    }
    this.perfCounters.drawCalls = drawCalls;
    this.perfCounters.frameTs = performance.now ? performance.now() : Date.now();
  }

  // Allow external GPU culling pass to provide visible instance indices for a poolKey
  setGPUVisibility(poolKey: string, visibleIndices: number[] | Set<number>) {
    const s = visibleIndices instanceof Set ? visibleIndices : new Set<number>(visibleIndices);
    // write to the write buffer to avoid races; will be swapped into active map at start of next update
    this._gpuVisiblePendingWrite.set(poolKey, s);
  }

  clearGPUVisibility(poolKey: string) {
    this._gpuVisibleMap.delete(poolKey);
  }

  getPerformanceCounters() {
    return { ...this.perfCounters };
  }

  resetPerformanceCounters() {
    this.perfCounters = { frameTs: null, totalInstances: 0, drawCalls: 0, byType: {} };
  }

  dispose() {
    for (const [k, m] of this.pools) {
      try { if (this.scene) this.scene.remove(m); } catch (e) {}
      try { (m.geometry as any)?.dispose?.(); } catch (e) {}
      try { (m.material as any)?.dispose?.(); } catch (e) {}
    }
    this.pools.clear();
    this.poolManager.clear();
  }
}

export interface IInstanceRenderer {
  init(scene:any, assetLoader:any): void;
  setInstances(type:string, descs:any[]): void;
  update(camera:any): void;
  dispose(): void;
}
