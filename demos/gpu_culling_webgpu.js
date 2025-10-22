async function log(msg) { const el = document.getElementById('log'); el.textContent += '\n' + msg; console.log(msg); }

async function run() {
  if (!('gpu' in navigator)) { await log('WebGPU not supported in this browser'); return; }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) { await log('No suitable GPU adapter found'); return; }
  const device = await adapter.requestDevice();
  await log('WebGPU device acquired');

  // generate test instances
  const counts = [1000,5000,10000,50000];
  const instances = [];
  for (let i=0;i<counts[counts.length-1];i++) {
    instances.push([(Math.random()-0.5)*1000, Math.random()*30, Math.random()*2000, 1.0]);
  }
  const maxCount = instances.length;

  // create buffer for positions (float32 x4)
  const posArray = new Float32Array(maxCount*4);
  for (let i=0;i<maxCount;i++){ posArray.set(instances[i], i*4); }
  const posBuf = device.createBuffer({ size: posArray.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(posBuf, 0, posArray.buffer, posArray.byteOffset, posArray.byteLength);

  // output visible flags buffer (u32 per instance)
  const outBufSize = maxCount * 4;
  const outBuf = device.createBuffer({ size: outBufSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });

  // uniform buffer for PV matrix (4x4 floats) and counts
  const uniBuf = device.createBuffer({ size: 64 + 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // pipeline: compute shader performing frustum test per instance
  const shaderCode = `
  struct Pos { x: f32; y: f32; z: f32; w: f32; };
  struct Mat4 { m: array<f32,16>; };
  @group(0) @binding(0) var<storage, read> positions: array<Pos>;
  @group(0) @binding(1) var<storage, write> outFlags: array<u32>;
  @group(0) @binding(2) var<uniform> pv: Mat4;
  @group(0) @binding(3) var<uniform> meta: vec4<f32>; // x: count, y: unused

  fn pointInFrustum(px: f32, py: f32, pz: f32) -> u32 {
    // multiply pv * vec4(px,py,pz,1)
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
    outFlags[idx] = pointInFrustum(p.x, p.y, p.z);
  }
  `;

  const module = device.createShaderModule({code: shaderCode});
  const pipeline = device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });

  const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: posBuf } },
    { binding: 1, resource: { buffer: outBuf } },
    { binding: 2, resource: { buffer: uniBuf, offset: 0, size: 64 } },
    { binding: 3, resource: { buffer: uniBuf, offset: 64, size: 16 } }
  ]});

  await log('Pipeline and bind group created');

  function makePV() {
    // simple perspective * view inverse mimic
    const pv = new Float32Array(16);
    // identity for PoC (so many points fall outside) - TODO: compute real PV
    for (let i=0;i<16;i++) pv[i] = (i%5===0)?1:0;
    return pv;
  }

  const pv = makePV();
  device.queue.writeBuffer(uniBuf, 0, pv.buffer, pv.byteOffset, pv.byteLength);

  const results = [];
  for (const c of counts) {
    // write count meta
    const meta = new Float32Array([c,0,0,0]);
    device.queue.writeBuffer(uniBuf, 64, meta.buffer, meta.byteOffset, meta.byteLength);

    const commandEncoder = device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    const workgroups = Math.ceil(c / 64);
    const t0 = performance.now();
    pass.dispatchWorkgroups(workgroups);
    pass.end();
    // copy outBuf to a mapped buffer for readback
    const readback = device.createBuffer({ size: outBufSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    commandEncoder.copyBufferToBuffer(outBuf, 0, readback, 0, outBufSize);
    const commands = commandEncoder.finish();
    device.queue.submit([commands]);

    await log(`dispatched ${c} instances, waiting for results...`);
    const t1 = performance.now();
    await readback.mapAsync(GPUMapMode.READ);
    const t2 = performance.now();
    const arrayBuf = readback.getMappedRange();
    const ui = new Uint32Array(arrayBuf.slice(0, c*4));
    let vis = 0;
    for (let i=0;i<c;i++) vis += ui[i];
    readback.unmap();
    results.push({ count: c, visible: vis, dispatchMs: t1 - t0, readMs: t2 - t1, totalMs: t2 - t0 });
    await log(`count ${c} visible ${vis} dispatchMs ${t1-t0} readMs ${t2-t1} totalMs ${t2-t0}`);
  }

  await log('Finished');
  (window as any).webgpuResults = results;
}

run().catch(e => { log('error: '+e.message); console.error(e); });
