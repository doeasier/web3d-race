import * as THREE from 'three';
import { InstanceRenderer } from './InstanceRenderer';
import GpuCuller from './GpuCuller';
import { RoadObjectDesc, RoadsideSpawner } from './RoadsideSpawner';
import { groupByType } from './SpawnerUtils';

export type RoadConfig = {
  segmentLength: number;
  numSegments: number;
  textureRepeatY: number;
  scrollFactor: number;
  roadOffset: number;
  maxRenderDistance?: number; // optional LOD: skip updating instances beyond this distance
  curveAmplitude?: number; // lateral offset amplitude (fallback sine)
  curveFrequency?: number; // frequency for sine curvature (fallback)
  controlPoints?: { x: number; z: number; y?: number; bank?: number }[]; // optional spline control points with elevation and bank
  closed?: boolean; // whether path is closed
};

export class RoadManager {
  config: RoadConfig;
  roadWidth: number;
  scene: any | null;
  roadMat: any | null;
  physics: any | null = null;

  // runtime collections
  // segments array retained for test-mode (data-only). When scene is present we use chunkMeshes for streaming LOD.
  segments: any[] = [];
  chunkMeshes: Map<number, any> = new Map();
  chunkColliderIds: Map<number, number> = new Map();
  chunkSegmentCount: number = 16; // segments per chunk
  // legacy default: number of chunks behind to keep; ahead is computed dynamically based on speed/camera
  chunkWindowChunks: number = 3; // legacy default
  chunkWindowBehind: number = 3;
  chunkWindowAhead: number = 3;
  // lookahead tuning: how many meters ahead to keep based on vehicle speed (meters/sec)
  lookaheadFactor: number = 2.5; // seconds multiplier -> meters
  minLookaheadDistance: number = 50; // meters minimum lookahead
  // optional camera reference for frustum-based chunk keep
  private cameraRef: any | null = null;
  // async build state
  private _buildingChunks: Set<number> = new Set();
  private _chunkTimers: Map<number, any> = new Map();
  private _pendingBuilds: Set<number> = new Set();
  // limit concurrent chunk builds
  maxConcurrentChunkBuilds: number = 2;

  // instanced meshes
  polesLeft: any = null;
  polesRight: any = null;
  bulbsLeft: any = null;
  bulbsRight: any = null;

  // spline
  private curve: any = null;
  private curveLength: number = 0;
  // continuous road mesh
  roadMesh: any = null;

  // control point banks and z positions for bank interpolation
  private _cpBanks: number[] = [];
  private _cpZs: number[] = [];
  // per-segment current applied bank (radians) for smoothing
  private _currentBanks: number[] = [];
  private _bankSmoothTime: number = 0.12; // seconds (time constant for exponential smoothing)

  // internal temp
  private _dummy: any = new THREE.Object3D();

  // transition state
  private _transition: {
    start: number;
    duration: number;
    origLaterals: number[];
    targetLaterals: number[];
    origBanks?: number[];
    targetBanks?: number[];
    newCurve: any | null;
    newCurveLength: number;
    newControlPoints: any;
  } | null = null;

  // Optional environment renderer reference (PR-4a)
  private envRenderer: InstanceRenderer | null = null;
  // Optional spawner reference (PR-4a)
  private spawner: RoadsideSpawner | null = null;
  // feature flag to use InstanceRenderer path
  private useInstanceRenderer: boolean = true;
  // physics adapter integration
  private physicsAdapter: any = null;
  private _activeInteractiveIds: Set<string> = new Set();

  constructor(config: RoadConfig, roadWidth: number) {
    this.config = { ...config };
    this.roadWidth = roadWidth;
    this.scene = null;
    this.roadMat = null;
    // physics can be set after construction or passed via setPhysics
    this.physics = null;
    if (this.config.curveAmplitude === undefined) this.config.curveAmplitude = 2; // meters
    if (this.config.curveFrequency === undefined) this.config.curveFrequency = 0.02; // cycles per meter
  }

  init(scene: any | null, roadMat: any | null) {
    this.scene = scene;
    this.roadMat = roadMat;

    // clear previous road mesh if any
    if (this.roadMesh && this.scene) {
      try { this.scene.remove(this.roadMesh); } catch(e) {}
      this.roadMesh = null;
    }
    // clear previous segments and chunk meshes
    try {
      for (const s of this.segments) {
        if (s && s.mesh && this.scene) {
          try { this.scene.remove(s.mesh); } catch (e) {}
        }
      }
    } catch (e) {}
    this.segments = [];
    try { this.pruneChunks(new Set()); } catch (e) {}

    // if controlPoints provided, build a CatmullRomCurve3
    if (this.config.controlPoints && this.config.controlPoints.length >= 2) {
      const pts = this.config.controlPoints.map(p => new THREE.Vector3(p.x, 0, p.z));
      this.curve = new THREE.CatmullRomCurve3(pts, !!this.config.closed, 'catmullrom', 0.5);
      try {
        this.curveLength = this.curve.getLength();
      } catch (e) {
        // fallback: approximate length by sampling
        const samples = this.curve.getPoints(this.config.numSegments * 10 || 100);
        let len = 0;
        for (let i = 1; i < samples.length; i++) len += samples[i].distanceTo(samples[i-1]);
        this.curveLength = len;
      }
    }

    // create per-segment proxies for scene mode or data-only segments for tests
    for (let i = 0; i < this.config.numSegments; i++) {
      const baseZ = i * this.config.segmentLength;
      const pt = this.curve ? this.curve.getPointAt(((baseZ % this.curveLength + this.curveLength) % this.curveLength) / Math.max(1, this.curveLength)) : null;
      const lateral = pt ? pt.x : this._computeLateralOffset(baseZ);
      const baseY = pt ? pt.y : 0.001;
      if (this.scene) {
        const proxy = new THREE.Object3D();
        proxy.userData._roadManager = true;
        proxy.position.set(lateral, baseY, baseZ);
        this.scene.add(proxy);
        this.segments.push({ mesh: proxy, baseZ });
      } else {
        this.segments.push({ position: { z: baseZ, y: baseY, x: lateral }, map: { offset: { y: 0 }, repeat: { set: (_x: number, _y: number) => {} } } });
      }
    }

    // create instanced lamps if we have a scene, otherwise keep data-only arrays
    const lampCountPerSegment = 4;
    const total = this.config.numSegments * lampCountPerSegment;
    if (this.scene) {
      // Use MeshBasicMaterial to avoid lighting cost for many instances
      const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 6);
      const poleMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const bulbGeo = new THREE.SphereGeometry(0.12, 8, 6);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });

      this.polesLeft = new THREE.InstancedMesh(poleGeo, poleMat, total);
      this.polesRight = new THREE.InstancedMesh(poleGeo, poleMat, total);
      this.bulbsLeft = new THREE.InstancedMesh(bulbGeo, bulbMat, total);
      this.bulbsRight = new THREE.InstancedMesh(bulbGeo, bulbMat, total);

      // mark for robust disposal
      (this.polesLeft as any).userData._roadManager = true;
      (this.polesRight as any).userData._roadManager = true;
      (this.bulbsLeft as any).userData._roadManager = true;
      (this.bulbsRight as any).userData._roadManager = true;

      // mark dynamic usage for better performance when updating frequently
      try {
        (this.polesLeft.instanceMatrix as any).setUsage?.(THREE.DynamicDrawUsage);
        (this.polesRight.instanceMatrix as any).setUsage?.(THREE.DynamicDrawUsage);
        (this.bulbsLeft.instanceMatrix as any).setUsage?.(THREE.DynamicDrawUsage);
        (this.bulbsRight.instanceMatrix as any).setUsage?.(THREE.DynamicDrawUsage);
      } catch (e) {
        // ignore if method not present
      }

      // initial placement
      let idx = 0;
      for (let i = 0; i < this.config.numSegments; i++) {
        const baseZ = i * this.config.segmentLength;
        const pt = this.curve && this.curveLength > 0 ? this.curve.getPointAt(((baseZ % this.curveLength + this.curveLength) % this.curveLength) / Math.max(1, this.curveLength)) : null;
        const lateral = pt ? pt.x : this._computeLateralOffset(baseZ);
        const sampleY = pt ? pt.y : 0.001;
        for (let j = 0; j < lampCountPerSegment; j++) {
          const localOffset = (j + 0.5) * (this.config.segmentLength / lampCountPerSegment) - this.config.segmentLength / 2;
          // left pole
          const poleY = sampleY + 1.5;
          this._dummy.position.set(lateral - (this.roadWidth / 2 + 2), poleY, baseZ + localOffset);
          this._dummy.rotation.set(0,0,0);
          this._dummy.updateMatrix();
          this.polesLeft.setMatrixAt(idx, this._dummy.matrix);
          // right pole
          this._dummy.position.set(lateral + (this.roadWidth / 2 + 2), poleY, baseZ + localOffset);
          this._dummy.updateMatrix();
          this.polesRight.setMatrixAt(idx, this._dummy.matrix);
          // bulbs
          const bulbY = sampleY + 2.8;
          this._dummy.position.set(lateral - (this.roadWidth / 2 + 2), bulbY, baseZ + localOffset);
          this._dummy.updateMatrix();
          this.bulbsLeft.setMatrixAt(idx, this._dummy.matrix);
          this._dummy.position.set(lateral + (this.roadWidth / 2 + 2), bulbY, baseZ + localOffset);
          this._dummy.updateMatrix();
          this.bulbsRight.setMatrixAt(idx, this._dummy.matrix);
          idx++;
        }
      }
      this.polesLeft.instanceMatrix.needsUpdate = true;
      this.polesRight.instanceMatrix.needsUpdate = true;
      this.bulbsLeft.instanceMatrix.needsUpdate = true;
      this.bulbsRight.instanceMatrix.needsUpdate = true;

      // enable frustum culling for instanced meshes
      this.polesLeft.frustumCulled = true;
      this.polesRight.frustumCulled = true;
      this.bulbsLeft.frustumCulled = true;
      this.bulbsRight.frustumCulled = true;

      this.scene.add(this.polesLeft);
      this.scene.add(this.polesRight);
      this.scene.add(this.bulbsLeft);
      this.scene.add(this.bulbsRight);
    }

    // create initial chunk meshes (streaming LOD) if scene
    if (this.scene && this.curve && this.curveLength > 0) {
      // create per-segment proxies so callers/tests can reference segment.mesh
      for (let i = 0; i < this.config.numSegments; i++) {
        const proxy = new THREE.Object3D();
        proxy.userData._roadManager = true;
        proxy.position.set(0, 0, i * this.config.segmentLength);
        this.scene.add(proxy);
        this.segments.push({ mesh: proxy, baseZ: i * this.config.segmentLength });
      }
      // build chunks around start at z=0
      const centerChunk = 0;
      for (let ci = -this.chunkWindowChunks; ci <= this.chunkWindowChunks; ci++) {
        const idx = centerChunk + ci;
        this.ensureChunkMesh(idx);
      }
    }

    // initialize current banks array for smoothing
    this._currentBanks = new Array(this.config.numSegments).fill(0);
    // initialize chunk window ahead/behind defaults
    this.chunkWindowBehind = this.chunkWindowChunks;
    this.chunkWindowAhead = this.chunkWindowChunks;
  }

  // compute lateral offset public wrapper
  computeLateral(distanceAlong: number) {
    return this._computeLateralOffset(distanceAlong);
  }

  // apply a preset control point array immediately or with transition
  applyControlPoints(pts: any[], durationMs = 0) {
    if (durationMs <= 0) {
      // immediate application
      try {
        const pts3 = pts.map(p => new THREE.Vector3(p.x, 0, p.z));
        this.curve = new THREE.CatmullRomCurve3(pts3, !!this.config.closed, 'catmullrom', 0.5);
        this.curveLength = this.curve.getLength();
        this.config.controlPoints = pts;
        // update segment positions immediately
        for (let i = 0; i < this.config.numSegments; i++) {
          const distanceAlong = i * this.config.segmentLength;
          const lateral = this._computeLateralOffset(distanceAlong);
          const seg = this.segments[i];
          if (seg.mesh) seg.mesh.position.x = lateral; else seg.position.x = lateral;
        }
      } catch (e) {
        // fallback to transition method
        this.transitionToControlPoints(pts, Math.max(10, 50));
      }
    } else {
      this.transitionToControlPoints(pts, durationMs);
    }
  }

  private _computeLateralOffset(distanceAlong: number) {
    // if spline exists, sample it by fraction along curve
    if (this.curve && this.curveLength > 0) {
      // wrap distance to curve length
      let d = distanceAlong % this.curveLength;
      if (d < 0) d += this.curveLength;
      const frac = d / this.curveLength;
      const pt = this.curve.getPointAt(frac);
      return pt.x;
    }
    // fallback sine curve
    const amp = this.config.curveAmplitude || 0;
    const freq = this.config.curveFrequency || 0;
    return amp * Math.sin(distanceAlong * freq);
  }

  setTextureRepeat(y: number) {
    this.config.textureRepeatY = y;
    for (const s of this.segments) {
      if (s.mesh && (s.mesh.material as any).map) {
        (s.mesh.material as any).map.repeat.set(1, y);
        (s.mesh.material as any).map.needsUpdate = true;
      } else if (s.map && s.map.repeat) {
        s.map.repeat.set(1, y);
      }
    }
  }

  // new method to smoothly transition to new control points
  transitionToControlPoints(pts: any[], durationMs = 1000) {
    if (!Array.isArray(pts) || pts.length < 2) return;
    // build new curve from pts
    let newCurve: any = null;
    let newCurveLength = 0;
    try {
      const pts3 = pts.map(p => new THREE.Vector3(p.x, 0, p.z));
      newCurve = new THREE.CatmullRomCurve3(pts3, !!this.config.closed, 'catmullrom', 0.5);
      newCurveLength = newCurve.getLength();
    } catch (e) {
      newCurve = null;
      newCurveLength = 0;
    }

    const origLaterals: number[] = [];
    const targetLaterals: number[] = [];
    const origBanks: number[] = [];
    const targetBanks: number[] = [];
    for (let i = 0; i < this.config.numSegments; i++) {
      const seg = this.segments[i];
      const orig = seg.mesh ? seg.mesh.position.x : seg.position.x;
      origLaterals.push(orig);
      // compute target lateral using newCurve if available, else fallback sine
      const distanceAlong = i * this.config.segmentLength;
      let target = 0;
      if (newCurve && newCurveLength > 0) {
        let d = distanceAlong % newCurveLength;
        if (d < 0) d += newCurveLength;
        const frac = d / newCurveLength;
        const pt = newCurve.getPointAt(frac);
        target = pt.x;
      } else {
        const amp = this.config.curveAmplitude || 0;
        const freq = this.config.curveFrequency || 0;
        target = amp * Math.sin(distanceAlong * freq);
      }
      targetLaterals.push(target);
      // banks: sample current and target banks (in radians)
      const curBank = this.computeBank(distanceAlong);
      origBanks.push(curBank);
      const tbDeg = this._bankFromControlPoints(pts, distanceAlong);
      targetBanks.push(tbDeg * Math.PI / 180);
    }

    this._transition = {
      start: performance.now(),
      duration: Math.max(10, durationMs),
      origLaterals,
      targetLaterals,
      origBanks,
      targetBanks,
      newCurve,
      newCurveLength,
      newControlPoints: pts
    };
  }

  update(vehicleZ: number, speed: number, dt: number) {
    const segIndexBase = Math.floor(vehicleZ / this.config.segmentLength);
    const now = performance.now();
    // flush any pending chunk builds if capacity available
    try { this._flushPendingBuilds(); } catch (e) {}

    // update spawner window so it can generate active descriptors for current worldZ
    try { if (this.spawner) this.spawner.update(vehicleZ); } catch (e) {}

    // Physics lifecycle: register interactive descriptors that entered window and remove those left
    try {
      if (this.spawner && this.physicsAdapter) {
        const active = new Set<string>();
        const descs = this.spawner.getActiveDescs();
        for (const d of descs) {
          if (d.interactive) {
            const id = d.id || (`obj-${d.z}-${d.lateral}`);
            active.add(id);
            if (!this._activeInteractiveIds.has(id)) {
              try { this.physicsAdapter.ensure(d); } catch (e) {}
              this._activeInteractiveIds.add(id);
            }
          }
        }
        // remove ids no longer active
        for (const id of Array.from(this._activeInteractiveIds)) {
          if (!active.has(id)) {
            try { this.physicsAdapter.remove(id); } catch (e) {}
            this._activeInteractiveIds.delete(id);
          }
        }
      }
    } catch (e) {}

    // computed transition progress and easing
    let t = 1;
    let inTransition = false;
    if (this._transition) {
      const tt = (now - this._transition.start) / this._transition.duration;
      const raw = Math.min(1, Math.max(0, tt));
      // easeInOutQuad easing
      const easeInOutQuad = (u: number) => {
        return u < 0.5 ? 2 * u * u : -1 + (4 - 2 * u) * u;
      };
      t = easeInOutQuad(raw);
      inTransition = raw < 1;
    }

    for (let i = 0; i < this.config.numSegments; i++) {
      const worldIndex = segIndexBase + i;
      const segData = this.segments[i];
      const distanceAlong = worldIndex * this.config.segmentLength;
      const z = distanceAlong - vehicleZ;

      // determine lateral: if transitioning, lerp orig->target, else use current curve
      let lateral = this._computeLateralOffset(distanceAlong);
      // sample height and bank
      let sampleY = 0.001;
      if (this.curve && this.curveLength > 0) {
        const frac = ((distanceAlong % this.curveLength) + this.curveLength) % this.curveLength / this.curveLength;
        const pt = this.curve.getPointAt(frac);
        sampleY = pt.y || sampleY;
      }
      if (this._transition) {
        const orig = this._transition.origLaterals[i];
        const target = this._transition.targetLaterals[i];
        lateral = orig + (target - orig) * t;
      }

      if (segData.mesh) {
        segData.mesh.position.z = z;
        segData.mesh.position.x = lateral;
        segData.mesh.position.y = sampleY;
        // compute target bank (radians) - from transition if present else from control points
        let targetBank = this.computeBank(distanceAlong);
        if (this._transition) {
          const ob = this._transition.origBanks ? this._transition.origBanks[i] : targetBank;
          const tb = this._transition.targetBanks ? this._transition.targetBanks[i] : targetBank;
          targetBank = ob + (tb - ob) * t;
        }
        // smooth towards targetBank using exponential lerp
        const tau = this._bankSmoothTime;
        const alpha = 1 - Math.exp(-Math.max(0, dt) / Math.max(1e-6, tau));
        const cur = this._currentBanks[i] || 0;
        const next = cur + (targetBank - cur) * alpha;
        this._currentBanks[i] = next;
        segData.mesh.rotation.z = next;
        try {
          if ((segData.mesh.material as any).map) {
            (segData.mesh.material as any).map.offset.y = ((-vehicleZ * this.config.scrollFactor) % 1 + 1) % 1;
            (segData.mesh.material as any).map.needsUpdate = true;
          }
        } catch (e) {}
      } else {
        segData.position.z = z;
        segData.position.x = lateral;
        segData.position.y = sampleY;
        segData.map.offset.y = ((-vehicleZ * this.config.scrollFactor) % 1 + 1) % 1;
      }
    }

    // update instances with lateral offsets (similar to above)
    const maxDist = this.config.maxRenderDistance ?? 400;
    const segLen = this.config.segmentLength;
    const lampCountPerSegment = 4;
    if (this.envRenderer && this.useInstanceRenderer) {
      // collect lamp descriptors and hand off to InstanceRenderer
      // if spawner present, use its active descriptors grouped by type
      const allDescs: RoadObjectDesc[] = this.spawner ? this.spawner.getActiveDescs() : [];
      // group by type using helper util
      const groups = groupByType(allDescs);
      // ensure common expected types are present so renderer receives expected buckets
      const required = ['lamp:left','lamp:right','tree'];
      for (const r of required) { if (!groups[r]) groups[r] = []; }

      // iterate sorted keys for determinism in tests
      const keys = Object.keys(groups).sort();
      for (const type of keys) {
        try { this.envRenderer.setInstances(type, groups[type] || []); } catch (e) { /* ignore per-pool errors */ }
      }
      return;
    } else if (this.polesLeft) {
      // update instances using per-segment positions (rough mapping)
      for (let i = 0; i < this.config.numSegments; i++) {
        const worldIndex = segIndexBase + i;
        const baseZ = worldIndex * segLen - vehicleZ;
        if (Math.abs(baseZ) > maxDist) continue;
        const distanceAlong = worldIndex * segLen;

        // lateral calculation with possible transition
        let lateral = this._computeLateralOffset(distanceAlong);
        if (this._transition) {
          const orig = this._transition.origLaterals[i];
          const target = this._transition.targetLaterals[i];
          lateral = orig + (target - orig) * t;
        }

        // compute sample-based heights if curve present
        let sampleY = 0.001;
        if (this.curve && this.curveLength > 0) {
          const frac = ((distanceAlong % this.curveLength) + this.curveLength) % this.curveLength / this.curveLength;
          const pt = this.curve.getPointAt(frac);
          sampleY = pt.y || sampleY;
        }

        for (let j = 0; j < lampCountPerSegment; j++) {
          const idx = i * lampCountPerSegment + j;
          const localOffset = (j + 0.5) * (this.config.segmentLength / lampCountPerSegment) - this.config.segmentLength / 2;
          const poleY = sampleY + 1.5;
          const bank = this._currentBanks[i] || 0;
          this._dummy.position.set(lateral - (this.roadWidth / 2 + 2), poleY, baseZ + localOffset);
          this._dummy.rotation.set(0, 0, bank);
          this._dummy.updateMatrix();
          this.polesLeft.setMatrixAt(idx, this._dummy.matrix);
          this._dummy.position.set(lateral + (this.roadWidth / 2 + 2), poleY, baseZ + localOffset);
          this._dummy.rotation.set(0, 0, bank);
          this._dummy.updateMatrix();
          this.polesRight.setMatrixAt(idx, this._dummy.matrix);
          const bulbY = sampleY + 2.8;
          this._dummy.position.set(lateral - (this.roadWidth / 2 + 2), bulbY, baseZ + localOffset);
          this._dummy.rotation.set(0, 0, bank);
          this._dummy.updateMatrix();
          this.bulbsLeft.setMatrixAt(idx, this._dummy.matrix);
          this._dummy.position.set(lateral + (this.roadWidth / 2 + 2), bulbY, baseZ + localOffset);
          this._dummy.rotation.set(0, 0, bank);
          this._dummy.updateMatrix();
          this.bulbsRight.setMatrixAt(idx, this._dummy.matrix);
        }
      }
      // upload updated matrices to GPU
      try {
        this.polesLeft.instanceMatrix.needsUpdate = true;
        this.polesRight.instanceMatrix.needsUpdate = true;
        this.bulbsLeft.instanceMatrix.needsUpdate = true;
        this.bulbsRight.instanceMatrix.needsUpdate = true;
      } catch (e) {}
    }

    // if transition finished, finalize: adopt new curve and clear transition
    if (this._transition && !inTransition) {
      if (this._transition.newCurve) {
        this.curve = this._transition.newCurve;
        this.curveLength = this._transition.newCurveLength;
        if (this._transition.newControlPoints != null) {
          this.config.controlPoints = this._transition.newControlPoints;
        } else {
          delete this.config.controlPoints;
        }
      }
      this._transition = null;
    }

    // determine visible chunks and update frustum culling
    if (this.scene && this.curve && this.curveLength > 0) {
      const chunkIndex = Math.floor(vehicleZ / (this.config.segmentLength * this.chunkSegmentCount));
      // compute dynamic lookahead distance based on speed and configured factor
      const segLen = this.config.segmentLength * this.chunkSegmentCount;
      const speedLookahead = Math.abs(speed) * this.lookaheadFactor; // meters
      const lookaheadDistance = Math.max(this.minLookaheadDistance, speedLookahead);
      // default ahead based on lookahead distance
      let chunksAhead = Math.ceil(lookaheadDistance / segLen);
      // if camera available, expand ahead to include chunks intersecting camera frustum
      const keepChunkSet = new Set<number>();
      // conservative behind window
      const behind = Math.max(0, this.chunkWindowBehind);
      // frustum check
      if (this.cameraRef) {
        try {
          const projScreenMatrix = new THREE.Matrix4();
          projScreenMatrix.multiplyMatrices(this.cameraRef.projectionMatrix, this.cameraRef.matrixWorldInverse);
          const frustum = new THREE.Frustum();
          frustum.setFromProjectionMatrix(projScreenMatrix);
          // check a reasonable range of chunks around center to see if they intersect frustum
          const maxCheck = Math.max(chunksAhead + 4, 8);
          for (let ci = -behind; ci <= maxCheck; ci++) {
            const idx = chunkIndex + ci;
            if (idx < 0) continue;
            const chunkCenterZ = idx * segLen - vehicleZ;
            const pt = new THREE.Vector3(0, 0, chunkCenterZ);
            if (frustum.containsPoint(pt)) {
              keepChunkSet.add(idx);
              if (ci > chunksAhead) chunksAhead = ci; // extend ahead if frustum sees further
            }
          }
        } catch (e) {
          // fallback to conservative behavior
        }
      }

      // ensure at least behind..chunksAhead range
      for (let ci = -behind; ci <= chunksAhead; ci++) {
        const idx = chunkIndex + ci;
        if (idx < 0) continue;
        keepChunkSet.add(idx);
      }

      // ensure chunk mesh exists and position them
      for (const idx of Array.from(keepChunkSet).sort((a,b)=>a-b)) {
        this.ensureChunkMesh(idx);
        const cm = this.chunkMeshes.get(idx);
        if (cm) {
          try {
            cm.position.z = -vehicleZ;
            cm.frustumCulled = true;
          } catch (e) {}
        }
      }

      // remove (prune) any outside chunks
      this.pruneChunks(keepChunkSet);
    }

    this.config.roadOffset -= speed * dt * this.config.scrollFactor;
  }

  // compute bank by linear interpolation between control points' bank values
  computeBank(distanceAlong: number) {
    if (!this.config.controlPoints || this.config.controlPoints.length < 2) return 0;
    const cps = this.config.controlPoints;
    // find segment by z
    let i = 0;
    while (i < cps.length - 1 && distanceAlong > cps[i+1].z) i++;
    const a = cps[i];
    const b = cps[Math.min(i+1, cps.length-1)];
    const dz = b.z - a.z;
    const t = dz === 0 ? 0 : (distanceAlong - a.z) / dz;
    // bank values in controlPoints are specified in degrees; convert to radians for rendering
    const bankADeg = (a as any).bank || 0;
    const bankBDeg = (b as any).bank || 0;
    const bankDeg = bankADeg * (1 - t) + bankBDeg * t;
    return bankDeg * Math.PI / 180;
  }

  dispose() {
    // dispose meshes if present
    if (this.scene) {
      for (const s of this.segments) {
        if (s.mesh) {
          this.scene.remove(s.mesh);
          (s.mesh.geometry as any)?.dispose?.();
          if ((s.mesh.material as any)?.dispose) (s.mesh.material as any).dispose();
        }
      }
      if (this.roadMesh) {
        try { this.scene.remove(this.roadMesh); } catch (e) {}
        (this.roadMesh.geometry as any)?.dispose?.();
        if ((this.roadMesh.material as any)?.dispose) (this.roadMesh.material as any).dispose();
        this.roadMesh = null;
      }
      // remove any instanced meshes created by this manager
      try {
        const toRemove: any[] = [];
        this.scene.traverse((o: any) => { if (o && o.userData && o.userData._roadManager) toRemove.push(o); });
        for (const o of toRemove) {
          try { this.scene.remove(o); } catch (e) {}
          try { (o.geometry as any)?.dispose?.(); } catch (e) {}
          try { (o.material as any)?.dispose?.(); } catch (e) {}
        }
      } catch (e) {}
      this.polesLeft = null;
      this.polesRight = null;
      this.bulbsLeft = null;
      this.bulbsRight = null;
    }
  }

  // sample bank (degrees) from an arbitrary controlPoints array
  private _bankFromControlPoints(cps: { x: number; z: number; bank?: number }[], distanceAlong: number) {
    if (!cps || cps.length < 2) return 0;
    let i = 0;
    while (i < cps.length - 1 && distanceAlong > cps[i+1].z) i++;
    const a = cps[i];
    const b = cps[Math.min(i+1, cps.length-1)];
    const dz = b.z - a.z;
    const t = dz === 0 ? 0 : (distanceAlong - a.z) / dz;
    const bankA = (a as any).bank || 0;
    const bankB = (b as any).bank || 0;
    return bankA * (1 - t) + bankB * t;
  }

  // Sample curve by arc length, return array of { pos: Vector3, tangent: Vector3, s: number }
  sampleCurveByArcLength(step: number) {
    return this.sampleCurveRangeByArcLength(0, this.curveLength, step);
  }

  // Sample curve between startS and endS (arc-length) with step
  sampleCurveRangeByArcLength(startS: number, endS: number, step: number) {
    const samples: any[] = [];
    if (!this.curve || this.curveLength <= 0) return samples;
    const len = this.curveLength;
    const s0 = Math.max(0, Math.min(len, startS));
    const s1 = Math.max(0, Math.min(len, endS));
    if (s1 <= s0) return samples;
    for (let s = s0; s <= s1; s += step) {
      const frac = Math.min(1, s / len);
      const pos = this.curve.getPointAt(frac);
      const tan = this.curve.getTangentAt(frac).normalize();
      samples.push({ pos: new THREE.Vector3(pos.x, pos.y, pos.z), tangent: new THREE.Vector3(tan.x, tan.y, tan.z), s });
    }
    if (samples.length === 0 || samples[samples.length - 1].s < s1) {
      const pos = this.curve.getPointAt(Math.min(1, s1 / len));
      const tan = this.curve.getTangentAt(Math.min(1, s1 / len)).normalize();
      samples.push({ pos: new THREE.Vector3(pos.x, pos.y, pos.z), tangent: new THREE.Vector3(tan.x, tan.y, tan.z), s: s1 });
    }
    return samples;
  }

  // Build a continuous BufferGeometry road from samples. Each sample yields left/right vertices.
  buildRoadMesh(samples: any[], roadWidth: number) {
    const half = roadWidth / 2;
    const verts: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const pos = s.pos;
      const tan = s.tangent.clone().normalize();
      // compute right vector
      let right = new THREE.Vector3().crossVectors(tan, up).normalize();
      if (right.lengthSq() < 1e-6) {
        // fallback
        right = new THREE.Vector3(1, 0, 0);
      }
      // apply bank: rotate right around tangent by bank radians
      const bank = this.computeBank(s.s) || 0;
      const rotatedRight = this.rotateAroundAxis(right, tan, bank);
      // compute left/right positions
      const left = new THREE.Vector3().copy(pos).addScaledVector(rotatedRight, -half);
      const rightP = new THREE.Vector3().copy(pos).addScaledVector(rotatedRight, half);
      // normal should point upwards for lighting; use tan x rotatedRight
      const normal = new THREE.Vector3().crossVectors(tan, rotatedRight).normalize();

      // push left then right
      verts.push(left.x, left.y, left.z);
      verts.push(rightP.x, rightP.y, rightP.z);
      // normals
      normals.push(normal.x, normal.y, normal.z);
      normals.push(normal.x, normal.y, normal.z);
      // uvs: u=0 left, u=1 right, v based on s
      const v = s.s / Math.max(1, this.config.segmentLength) * (this.config.textureRepeatY || 1);
      uvs.push(0, v);
      uvs.push(1, v);
    }

    // indices
    const rows = samples.length;
    for (let i = 0; i < rows - 1; i++) {
      const i0 = i * 2;
      const i1 = i0 + 1;
      const i2 = (i + 1) * 2;
      const i3 = i2 + 1;
      // ensure front face faces upward (counter-clockwise when viewed from +Y)
      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeBoundingSphere();
    geom.computeBoundingBox();
    return geom;
  }

  // Build raw vertex/index arrays suitable for passing to physics engine
  buildRoadMeshData(samples: any[], roadWidth: number) {
    const half = roadWidth / 2;
    const verts: number[] = [];
    const indices: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const pos = s.pos;
      const tan = s.tangent.clone().normalize();
      let right = new THREE.Vector3().crossVectors(tan, up).normalize();
      if (right.lengthSq() < 1e-6) right = new THREE.Vector3(1, 0, 0);
      const bank = this.computeBank(s.s) || 0;
      const rotatedRight = this.rotateAroundAxis(right, tan, bank);
      const left = new THREE.Vector3().copy(pos).addScaledVector(rotatedRight, -half);
      const rightP = new THREE.Vector3().copy(pos).addScaledVector(rotatedRight, half);
      verts.push(left.x, left.y, left.z);
      verts.push(rightP.x, rightP.y, rightP.z);
    }
    // indices
    const rows = samples.length;
    for (let i = 0; i < rows - 1; i++) {
      const i0 = i * 2;
      const i1 = i0 + 1;
      const i2 = (i + 1) * 2;
      const i3 = i2 + 1;
      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
    }
    return { vertices: new Float32Array(verts), indices: new Uint32Array(indices) };
  }

  // ensure chunk mesh exists for chunkIndex; chunkIndex can be negative for before start
  private ensureChunkMesh(chunkIndex: number) {
    if (this.chunkMeshes.has(chunkIndex)) return;
    if (!this.curve || this.curveLength <= 0 || !this.scene) return;
    // create a lightweight placeholder chunk mesh immediately so rendering can continue
    const placeholderGeo = new THREE.BoxGeometry(this.roadWidth, 0.1, this.chunkSegmentCount * this.config.segmentLength);
    const placeholderMat = new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: false });
    const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat as any);
    placeholder.userData._roadManager = true;
    placeholder.userData._building = true; // mark as building in background
    // position placeholder at chunk center
    const segLen = this.config.segmentLength;
    const segBlockLen = this.chunkSegmentCount * segLen;
    const centerZ = chunkIndex * segBlockLen;
    placeholder.position.set(0, 0, centerZ);
    this.scene.add(placeholder);
    this.chunkMeshes.set(chunkIndex, placeholder);

    // Build actual chunk geometry asynchronously to avoid blocking main thread
    const startS = chunkIndex * this.chunkSegmentCount * segLen;
    const endS = startS + this.chunkSegmentCount * segLen;
    const step = Math.max(1, segLen / 2);
    // schedule async build with concurrency limiting
    const startBuild = async () => {
      try {
        this._buildingChunks.add(chunkIndex);
        const samples = this.sampleCurveRangeByArcLength(startS, endS, step);
        if (!samples || samples.length < 2) return;
        const geom = this.buildRoadMesh(samples, this.roadWidth);
        const meshMat = (this.roadMat as any).clone ? (this.roadMat as any).clone() : this.roadMat;
        const mesh = new THREE.Mesh(geom, meshMat as any);
        mesh.userData._roadManager = true;
        // replace placeholder in scene
        try { this.scene.remove(placeholder); } catch (e) {}
        this.scene.add(mesh);
        this.chunkMeshes.set(chunkIndex, mesh);

        // physics: add static trimesh for collision if physics engine present
        if (this.physics) {
          const collisionMesh = this.buildRoadMeshData(samples, this.roadWidth);
          const id = this.physics.addStaticTrimesh(collisionMesh.vertices, collisionMesh.indices);
          if (id >= 0) {
            this.chunkColliderIds.set(chunkIndex, id);
          }
        }
      } catch (e) {
        // if build fails, leave placeholder in place
      } finally {
        this._buildingChunks.delete(chunkIndex);
      }
    };

    if (this._buildingChunks.size < this.maxConcurrentChunkBuilds) {
      // start immediately
      setTimeout(() => { startBuild(); }, 0);
    } else {
      // queue as pending; will be started from update loop when capacity frees
      this._pendingBuilds.add(chunkIndex);
    }
  }

  // called each update to start pending builds when capacity available
  private _flushPendingBuilds() {
    if (this._pendingBuilds.size === 0) return;
    const toStart: number[] = [];
    for (const idx of Array.from(this._pendingBuilds)) {
      if (this._buildingChunks.size >= this.maxConcurrentChunkBuilds) break;
      toStart.push(idx);
      this._pendingBuilds.delete(idx);
    }
    for (const idx of toStart) {
      // re-invoke ensureChunkMesh to schedule startBuild path
      // but only if placeholder still present
      if (this.chunkMeshes.has(idx)) {
        // trigger start via a microtask
        setTimeout(() => { try { this.ensureChunkMesh(idx); } catch (e) {} }, 0);
      } else {
        this._pendingBuilds.delete(idx);
      }
    }
  }

  // remove chunk meshes outside window
  private pruneChunks(keepIndices: Set<number>) {
    for (const [ci, m] of Array.from(this.chunkMeshes.entries())) {
      if (!keepIndices.has(ci)) {
        try { if (this.scene) this.scene.remove(m); } catch (e) {}
        try { (m.geometry as any)?.dispose?.(); } catch (e) {}
        try { (m.material as any)?.dispose?.(); } catch (e) {}
        this.chunkMeshes.delete(ci);
        // physics: remove collision mesh if present
        const colliderId = this.chunkColliderIds.get(ci);
        if (colliderId !== undefined && this.physics) {
          this.physics.removeStaticTrimesh(colliderId);
          this.chunkColliderIds.delete(ci);
        }
        // also cancel pending/ongoing builds for this chunk
        this._pendingBuilds.delete(ci);
        this._buildingChunks.delete(ci);
      }
    }
  }
  
  // rotate vector v around axis k by angle (radians) using Rodrigues' rotation
  private rotateAroundAxis(v: any, k: any, angle: number) {
    if (Math.abs(angle) < 1e-6) return v.clone();
    const kv = k.clone().normalize();
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const term1 = v.clone().multiplyScalar(cos);
    const term2 = kv.clone().cross(v).multiplyScalar(sin);
    const term3 = kv.clone().multiplyScalar(kv.dot(v) * (1 - cos));
    return term1.add(term2).add(term3);
  }

  setEnvironmentRenderer(r: InstanceRenderer | null) {
    this.envRenderer = r;
  }

  setSpawner(spawner: RoadsideSpawner | null) {
    this.spawner = spawner;
  }

  // allow external code to provide a camera reference used for GPU culling/frustum checks
  setCameraRef(camera: any | null) {
    this.cameraRef = camera;
  }
  
  setUseInstanceRenderer(v: boolean) { this.useInstanceRenderer = v; }
  
  setPhysicsAdapter(pa: any) { this.physicsAdapter = pa; }
}
