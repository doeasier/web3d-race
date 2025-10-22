// Minimal WebGPU-based culler with GPU-side compaction (PoC)
// Uses atomic counter to compact visible indices into an index buffer to minimize readback.

export class WebGpuCuller {
  adapter: any = null;
  device: any = null;
  pipeline: any = null;
  bindGroupLayout: any = null;
  posBuffer: any = null;
  indexBuffer: any = null;
  counterBuffer: any = null;
  readbackCounter: any = null;
  readbackIndex: any = null;
  uniBuffer: any = null;
  maxInstances: number = 0;

  async init(maxInstances = 65536) {
    if (!('gpu' in navigator)) return false;
    this.maxInstances = maxInstances;
    this.adapter = await (navigator as any).gpu.requestAdapter();
    if (!this.adapter) return false;
    this.device = await this.adapter.requestDevice();

    const posSize = maxInstances * 4 * 4; // vec4 f32
    const indexSize = maxInstances * 4; // u32 per index
    const counterSize = 4; // single u32
    const BU = (this.device as any).GPUBufferUsage;
    this.posBuffer = this.device.createBuffer({ size: posSize, usage: BU.STORAGE | BU.COPY_DST });
    this.indexBuffer = this.device.createBuffer({ size: indexSize, usage: BU.STORAGE | BU.COPY_SRC | BU.COPY_DST });
    this.counterBuffer = this.device.createBuffer({ size: counterSize, usage: BU.STORAGE | BU.COPY_SRC | BU.COPY_DST });
    this.readbackIndex = this.device.createBuffer({ size: indexSize, usage: BU.COPY_DST | BU.MAP_READ });
    this.readbackCounter = this.device.createBuffer({ size: counterSize, usage: BU.COPY_DST | BU.MAP_READ });
    this.uniBuffer = this.device.createBuffer({ size: 80, usage: BU.UNIFORM | BU.COPY_DST });

    const shader = `
    struct Pos { x: f32; y: f32; z: f32; w: f32; };
    struct Mat4 { m: array<f32,16>; };
    @group(0) @binding(0) var<storage, read> positions: array<Pos>;
    @group(0) @binding(1) var<storage, read_write> indices: array<u32>;
    @group(0) @binding(2) var<storage, read_write> counter: array<atomic<u32>>;
    @group(0) @binding(3) var<uniform> pv: Mat4;
    @group(0) @binding(4) var<uniform> meta: vec4<f32>; // x: count

    fn pointInFrustum(px: f32, py: f32, pz: f32) -> u32 {
      var clipX = pv.m[0]*px + pv.m[4]*py + pv.m[8]*pz + pv.m[12]*1.0;
      var clipY = pv.m[1]*px + pv.m[5]*py + pv.m[9]*pz + pv.m[13]*1.0;
      var clipZ = pv.m[2]*px + pv.m[6]*py + pv.m[10]*pz + pv.m[14]*1.0;
      var clipW = pv.m[3]*px + pv.m[7]*py + pv.m[11]*pz + pv.m[15]*1.0;
      if (clipW == 0.0) { return 0u; }
      if (abs(clipX) <= clipW && abs(clipY) <= clipW && clipZ >= -clipW && clipZ <= clipW) { return 1u; }
      return 0u;
    }

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let idx = gid.x;
      if (idx >= u32(meta.x)) { return; }
      let p = positions[idx];
      let vis = pointInFrustum(p.x, p.y, p.z);
      if (vis == 1u) {
        let pos = atomicAdd(&counter[0], 1u);
        indices[pos] = idx;
      }
    }
    `;

    const module = this.device.createShaderModule({ code: shader });
    this.pipeline = this.device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });
    this.bindGroupLayout = this.pipeline.getBindGroupLayout(0);
    return true;
  }

  isSupported() {
    return !!(navigator as any).gpu && !!this.device;
  }

  // positions: Float32Array length = count*4, pvMatrix: Float32Array length 16
  async requestCull(positions: Float32Array, pvMatrix: Float32Array, count: number): Promise<number[]> {
    if (!this.device) throw new Error('WebGPU not initialized');
    if (count === 0) return [];
    if (count > this.maxInstances) {
      await this.init(Math.max(this.maxInstances * 2, count));
    }

    // upload positions and pv/meta
    this.device.queue.writeBuffer(this.posBuffer, 0, positions.buffer, positions.byteOffset, positions.byteLength);
    this.device.queue.writeBuffer(this.uniBuffer, 0, pvMatrix.buffer, pvMatrix.byteOffset, pvMatrix.byteLength);
    const meta = new Float32Array([count, 0, 0, 0]);
    this.device.queue.writeBuffer(this.uniBuffer, 64, meta.buffer, meta.byteOffset, meta.byteLength);

    // reset counter to zero
    const zero = new Uint32Array([0]);
    this.device.queue.writeBuffer(this.counterBuffer, 0, zero.buffer, zero.byteOffset, zero.byteLength);

    const bindGroup = this.device.createBindGroup({ layout: this.bindGroupLayout, entries: [
      { binding: 0, resource: { buffer: this.posBuffer } },
      { binding: 1, resource: { buffer: this.indexBuffer } },
      { binding: 2, resource: { buffer: this.counterBuffer } },
      { binding: 3, resource: { buffer: this.uniBuffer, offset: 0, size: 64 } },
      { binding: 4, resource: { buffer: this.uniBuffer, offset: 64, size: 16 } }
    ]});

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    const workgroups = Math.ceil(count / 64);
    pass.dispatchWorkgroups(workgroups);
    pass.end();

    // copy counter and indices to readback buffers
    encoder.copyBufferToBuffer(this.counterBuffer, 0, this.readbackCounter, 0, 4);
    encoder.copyBufferToBuffer(this.indexBuffer, 0, this.readbackIndex, 0, count * 4);
    const commands = encoder.finish();
    this.device.queue.submit([commands]);

    // read counter
    await this.readbackCounter.mapAsync((this.device as any).GPUMapMode.READ);
    const cntBuf = this.readbackCounter.getMappedRange();
    const cnt = new Uint32Array(cntBuf.slice(0,4))[0];
    this.readbackCounter.unmap();

    if (cnt === 0) return [];

    await this.readbackIndex.mapAsync((this.device as any).GPUMapMode.READ);
    const idxBuf = this.readbackIndex.getMappedRange();
    const arr = new Uint32Array(idxBuf.slice(0, cnt * 4));
    const out: number[] = Array.from(arr.subarray(0, cnt));
    this.readbackIndex.unmap();
    return out;
  }
}

export default new WebGpuCuller();