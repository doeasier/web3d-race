Title: PR-13������ GPU �Ĳü� PoC������ + GPU PoC �Ǽܣ�

����
----
�� PR ������ GPU ����׶�ü��о���̽���ű��ƽ�������ʱ���ɣ�Ŀ���ǰ�ÿ��ʵ���Ŀɼ��Լ��Ǩ�Ƶ� GPU�����ں�̨ worker �����У����Խ������߳� CPU ���������ⲻ��Ҫ�� instance buffer �ϴ�����������첽 worker PoC��GpuCuller ���ߡ�RoadManager -> InstanceRenderer �Ŀɼ��Ի�д��·������� demo �Լ����ɲ���/���߽ű���

����ļ������� / �޸ģ�
--------------------
- ������
  - `src/world/GpuCuller.ts` �� ������� GPU culler��֧�� Worker + `OffscreenCanvas` ���첽 cull��`cullAsync`�������ṩͬ������ `cull`��
  - `demos/gpu_culling_demo.html`��`demos/gpu_culling_demo.js` �� �������ʾҳ�棬��������ʵ������жԱ� CPU �� GPU PoC��
  - `tools/gpu_culling_poc.ts`��`tools/gpu_culling_gpu_poc.js` �� Node �µĻ����� headless-gl PoC ���ߣ����߲����ã���
  - `PRs/PR-13-gpu-poC.md`�����ļ����� PR ˵���ݰ���
- �޸ģ�
  - `src/world/RoadManager.ts` �� ������ `InstanceRenderer` �� GPU ����ʱ���첽���� `GpuCuller.cullAsync(...)` ���ѽ��ע�뵽 `InstanceRenderer.setGPUVisibility(poolKey, visSet)`��
  - `src/world/InstanceRenderer.ts` �� ���Ӷ� GPU �ɼ��Լ��ϵ�֧�֣�`update(camera)` ������ʹ�� GPU �ṩ�Ŀɼ������������Բ��ɼ�ʵ���� CPU �����ؽ���д�롣
  - `package.json` �� �����ű���`demo`��������ʾ���������� `demo:ci`��PoC CI �����ű�����
  - `docs/environment_system_design.md` �� ��¼���߽����PoC ����������ƻ���PR-13a/13b/13c����

ʵ��Ҫ��
-------
- GPU ·��ʵ��˼·����ÿ��ʵ��λ�ô��������RGBA32F �� RGBA8 ���ˣ����� fragment shader �ж�ÿ�����أ���Ӧһ��ʵ����ִ����׶���ԣ������д�� FBO��Ȼ�� readback ��ͨ�� worker postMessage ���ؿɼ������б�
- ����ʹ�� Worker + `OffscreenCanvas` �ں�ִ̨�� GPU ���㣨`cullAsync`���������������̣߳��ڲ�֧�ֵĻ����»��˵�ͬ��ʵ�ֻ� RGBA8 ���������
- `InstanceRenderer` ���� GPU ���صĿɼ��������ϣ��� `update` ���������ɼ�ʵ���� CPU ������ֻΪ�ɼ�ʵ������ matrix���Ӷ����� CPU��GPU �ϴ���

��ʾ�빤��
---------
- �������ʾ��`demos/gpu_culling_demo.html` + `demos/gpu_culling_demo.js`������֧�� WebGL2 ������������У���֧�� `EXT_color_buffer_float` ��ʹ�ø���·��������ʹ�� 8-bit ���ˡ�
- Node ���ߣ�`tools/gpu_culling_poc.ts`��CPU ���ߣ��� `tools/gpu_culling_gpu_poc.js`��headless-gl PoC��������չ���������߼�����
- npm �ű���`npm run demo` ������̬����������� demo��`npm run demo:ci` �����ھ߱� GPU/Headless ֧�ֵ� CI �������� PoC �ű���

��֤
----
- ��Ԫ���ԣ��ڱ��ؼ��ɺ󣬲ֿⵥԪ����ͨ����34/34����
- ��ʾ/PoC������� demo ��֧�ֵ�������Ͽ����У�headless-gl PoC �� Node ���������ã����Ը���֡�����֧�������ض� headless-gl ������ GPU ������

ע���������������
---------------
- �첽 worker ·�����������������OffscreenCanvas + WebGL2������ CI �н���ʹ�ô�������� runner��Puppeteer���� GPU ֧�ֵ� headless ������
- ���� cullAsync Ϊ�첽���������������ʱ����˫�����ʹ�á���һ֡�ɼ��б������Ա���֡�ھ����Ͷ�����
- �Ż�����
  1) ���� GPU ���صĿɼ��������ɽ���ʵ����������ʹ�ü�ӻ��ƣ���һ������ draw call ���ϴ���
  2) ʹ�� WebGPU �� compute shader ��� fullscreen-pass�������Ч�ʺ;��ȣ�
  3) �� RoadManager �н� GPU culling ��Ϊ��̨�������񣨸��� worker�������������ͣ���

�ϲ�����
-------
- �� PR �ɺϲ��� feature ��֧�Ա�����ʵ������� GPU-enabled CI �����н��н�һ����֤�������ҪΪ���ߺ� demo����������ʱ���˷�ǿ�Ƶļ��ݼ��ɣ��ڲ�֧�� GPU/worker ʱ�л��ˣ������սϵ͡�

��һ�������飩
-----------
1. ���� Puppeteer �Զ����ű������ܿ������������ demo ���ɼ��������ݣ����� CI����
2. �� GPU-visible �� LOD bucket ��ӳ�侫ϸ������Ҫ��д�� `${type}|mid`����
3. ����Ҫʱ�ƽ� WebGPU compute shader �� PoC ʵ�֡�

���裬�ҿ��Լ���������ʽ�� Git patch / PR ��������� Puppeteer �Զ����ű���������� CI ���̡�

Batch benchmark and detailed timing (work performed)
------------------------------------------------
Status: option C executed �� implemented preheat/resource reuse changes, added CPU baseline in batch, and ran automated batch benchmarks locally.

What was added/changed for benchmarking:
- `demos/gpu_culling_demo.js` �� extended with `runGpuPoCDetailed` exposing `window.runGpuPoCCount` and `window.runCpuBaselineCount` that return per-run timing breakdown (upload / compile / draw / readback / total).
- `tools/ci/batch_gpu_bench.js` �� Puppeteer-based local batch runner (used locally) that executes GPU PoC for counts [1000,5000,10000,50000] �� 3 reps and writes `tools/ci/gpu_batch_results.json`.

Key measured findings (from `tools/ci/gpu_batch_results.json`):
- Instances tested: 1k, 5k, 10k, 50k (3 reps each)
- Visible count: always 0 (test positions placed outside frustum for this run)
- Upload: very small (~0.1�C1.2 ms)
- Compile: large on first run (shader compile JIT) �� e.g., 37 ms for first 1k run; subsequent runs ~1�C2 ms. Recommendation: prewarm/compile once before measuring.
- Draw: negligible
- Readback: dominant steady-state cost (~1.3�C3.2 ms depending on size)
- Total (steady-state): ~3�C7 ms (first-run outliers due to compile)

Interpretation
- First-run shader compilation dominates outliers; steady-state GPU time is dominated by synchronous `gl.readPixels` readback. Texture upload is not the main bottleneck in this PoC.
- At low instance counts CPU frustum-culling is comparable or faster; GPU helps more when offloading to background and when avoiding frequent synchronous readback or when preparing compact instance updates for indirect draws.

Actions performed (C)
- Implemented demo timing instrumentation (upload/compile/draw/readback).  
- Implemented batch runner and executed locally; results saved to `tools/ci/gpu_batch_results.json`.

Recommendations / next steps
1. Preheat & resource reuse (already applied to reduce compile noise during measurement). Keep permanent resource reuse in runtime (create program/VAO/FBO once and reuse).  
2. Reduce synchronous readback: consider strategies to avoid per-frame `readPixels` (asynchronous accumulation, WebGPU compute shader, or transform-based aggregation on GPU).  
3. Integrate CPU baseline into regular batch (done) and produce CSV/graph for reporting.  
4. For runtime: map GPU-visible lists to exact LOD buckets and apply double-buffering to avoid frame race.  

Artifact locations (local):
- `tools/ci/gpu_batch_results.json` �� raw benchmark results.  
- `demos/gpu_culling_demo.js` �� instrumented demo.  
- `tools/ci/batch_gpu_bench.js` �� batch run script used to collect results.

This PR update completes PR-13a (research + baseline PoC), advances PR-13b (browser PoC implemented), and completes PR-13c benchmarking (local batch runs). Remaining work is optimization (avoid readback) and production integration (LOD mapping, indirect draw path).

WebGPU compute shader PoC (new)
--------------------------------
- ������`demos/gpu_culling_webgpu.html` �� `demos/gpu_culling_webgpu.js` �� WebGPU compute shader PoC that:
  - allocates `positions` as a storage buffer, runs a compute shader per-instance to perform a clip-space/frustum test, writes per-instance visible flags to an output storage buffer, and copies results back to a mapped buffer for readback.
  - records dispatch and readback timings for counts [1k,5k,10k,50k] and exposes results on `window.webgpuResults` in the demo page.
  - Purpose: demonstrate an alternative to the fullscreen fragment-pass approach and evaluate dispatch vs readback costs on WebGPU-capable browsers.

Findings from PoC (notes):
- WebGPU allows straightforward per-instance compute with a simple compute shader and storage buffers; dispatch is fast, but reading back results still involves a copy to a MAP_READ buffer and a mapAsync step �� which is non-blocking but still incurs GPU->CPU latency. The PoC measures dispatch vs readback separately so we can reason about async application strategies (double-buffering, GPU-side compaction).

Next recommended step (selected)
--------------------------------
Integrate WebGPU-visible list into the runtime path (InstanceRenderer) with a double-buffering strategy and a GPU-side compaction / index-generation stage:
1. Use WebGPU compute shader to produce a compact visible index buffer (or prefix-sum-based compaction) on the GPU to avoid transferring full boolean arrays and to minimize readback size.
2. Double-buffer the visible lists (apply last-frame list while current-frame GPU compaction runs) to avoid frame stalls and visual jitter.
3. Modify `InstanceRenderer` to accept compact visible buffers (or an applied visible index array) and only update instance matrices for visible indices; consider triggering indirect draws or partial buffer updates where available.

I will proceed to implement step 1 of the selected next step: integrate WebGPU-visible lists into `InstanceRenderer` using a double-buffer apply strategy (non-blocking readback of compacted indices) and add a simple GPU compaction shader PoC under `tools/` / demo integration.

