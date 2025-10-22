����ϵͳ����뿪������

�汾��1.0
���ߣ��Զ����ɣ�GitHub Copilot��
���ڣ�2025-10-21

����
----
������ĵ�������Ϊ����Ŀ��Web3D Racing Demo���������������·�ơ���ľ�����ݡ�ɽ���װ�����ϵͳ����뿪��������Ŀ���ǣ�
- �����������ɸ��õĻ���/·�����ϵͳ��
- ģ�黯��ְ����롢���ڵ�Ԫ�������滻ʵ�֣�
- ֧������ʱ��ʽ���ء�LOD �� GPU instancing��
- ������ RoadManager/physics/vehicle ϵͳ�����С���֡�

����ԭ��
--------
- ��һְ��ÿ��ģ��ֻ��һ���£����ء����ɡ���Ⱦ��������
- �������������������û���preset�����ɹ��򣬷����� Spawner �����������ݣ�
- �ɲ��ԣ��߼�ģ�鲻���� three.js/physics ʵ����ʹ�����������ӿڣ�
- ���滻����Ⱦ��������������ͨ���ӿ�ע�루DI����
- �������ȣ�ʹ�� InstancedMesh��Impostor������������������޳���

�߲�ܹ�
--------
ģ�黮�֣�
- AssetLoader����Դ��������
  - ְ�𣺼��� glTF/��ͼ/Impostor atlas���ṩ handle/ref-count��
  - ���Ե㣺ʧ�ܻ��ˡ�������Ϊ��

- RoadsideSpawner�������� / ��������
  - ְ�𣺻��� environment preset��track rules �� worldZ ���� RoadObjectDesc �б�֧�� procedural rules �� baked instances��
  - ��������������飺RoadObjectDesc[]�������� scene����
  - �ŵ㣺 deterministic seed���ɵ�Ԫ���ԡ�

- InstanceRenderer��ʵ����Ⱦ����
  - ְ�𣺽��� RoadObjectDesc������ InstancedMesh/Impostor �л�/LOD���� three.js scene ������
  - API��init(scene, assetLoader)��setInstances(type, descs)��update(camera)��dispose()
  - �ŵ㣺����Ⱦϸ��������߼����롣

- PhysicsAdapter��������������
  - ְ�𣺸� interactive objects ע��/�Ƴ�������ײ�壻��װ IPhysicsWorld ���á�

- ObjectPool������� / ע���
  - ְ�𣺹���ʵ�� ID������ InstancedMesh slot�����ա�

- RoadManager����������
  - ְ�𣺳��� spawner��renderer��physicsAdapter���� update(worldZ, speed, dt) �а����ɵ�desc���� renderer �� physics �������� chunk window ������ LOD ���Բ�����

����ģ��
--------
1) EnvironmentPreset������Ԥ�裩
{
  "id": "coastal",
  "name": "Coastal",
  "foliageTypes": ["palm","bush"],
  "buildingTypes": ["house1","warehouse"],
  "lampTypes": ["street1"],
  "densityPerSegment": 8,
  "lod": { "near": 30, "mid": 120, "far": 400 },
  "spawnerDefaults": { "seed": 12345 }
}

2) Track/Level����չ���йؿ�schema��
{
  "id": "city",
  "environmentId": "coastal",
  "spawnerRules": [ {"type":"tree","density":0.4,"side":"both","minGap":5}, ... ],
  "bakedSceneryUrl": "/assets/levels/city.scenery.json"
}

3) RoadObjectDesc����������������ʱ������
{
  "id": "tree-0001",
  "type": "tree:palm",
  "z": 120.5,
  "lateral": -3.2,
  "y": 0.0,
  "rotY": 0.1,
  "scale": 1.12,
  "interactive": false,
  "collision": null,
  "lodBias": 0
}

����ʱ����
----------
1. ��ʼ����main.ts ���� AssetLoader��RoadsideSpawner��ʹ�� level.environmentId + rules����InstanceRenderer��PhysicsAdapter���� renderer ע�� RoadManager��
2. ÿ֡��RoadManager.update(worldZ, speed, dt)����
   a. Spawner.update(worldZ) -> ���� activeDescs���������飩��
   b. ������Ҫ����� desc��PhysicsAdapter.ensure(desc)��
   c. InstanceRenderer.setInstances(groupedByType(activeDescs))��
   d. InstanceRenderer.update(camera) �� CPU frustum culling��instanceMatrix.needsUpdate�����裩�� LOD �л���
3. ��ʽ����գ�Spawner ���� chunk window ά����Щ��Ӧ����ʵ�������� window �� desc �� ObjectPool ���ղ�λ��

LOD ���ԣ����飩
---------------
- ��ֵ��/��/Զ��ʹ�û���preset.lod
- ����< near��: ������ mesh ʵ����InstancedMesh��
- �У�near..mid��: ��ģ�� impostor ��Ƭ
- Զ��> mid��: �ϲ�Ϊ������ͼ����Ⱦ
- ��̬����������Ƕ������ܶ�̬���� mid/far ��ֵ

Impostor/Atlas
--------------
- Ϊ mid/Զ���Ԥ���ɻ�����ʱ���ɶ�Ƕ���Ƭ atlas��
- InstanceRenderer ���о���ʹ�� sprite ���� impostor���������л���ʵ mesh��

����Ҫ��
--------
- �����ͷ��� InstancedMesh������ draw calls��
- ���� instance transform �仯ʱ���� instanceMatrix.needsUpdate
- ʹ�� CPU ���޳���chunk distance��+ ��ѡ GPU culling��������
- ���� atlas/texture array ���ٰ�

���Է���
--------
- ��Ԫ���ԣ�
  - RoadsideSpawner: ��ͬһ seed �£����� worldZ ����ȷ���� desc �б�assert count/λ�ã�
  - InstanceRenderer: mock scene������ setMatrixAt / instanceMatrix.needsUpdate ���ã��� desc��
  - PhysicsAdapter: mock IPhysicsWorld������ addBody/removeBody ����ȷ����
- ���ɲ��ԣ��� FakePhysicsWorld �� run few frames������ʵ������ worldZ �仯��roadManager.update �����쳣

�����ƻ���������
----------------
�׶� 1���Ǽܣ�2 �죩 �� ����
- [x] ���� types: `RoadObjectDesc`, `EnvironmentPreset`, `SpawnerRule`
- [x] ʵ�� `RoadsideSpawner`������ʽ + baked ֧�� minimal��������
- [x] ʵ�� `InstanceRenderer` �Ǽܣ�`setInstances`��basic `InstancedMesh`����mock ����
- [x] �� `RoadManager` ���� `Spawner` �� `Renderer`

�׶� 2��LOD/Impostor��3-4 �죩 �� ����
- [x] ʵ�� LOD �л���near/mid/far���� simple impostor��billboard��
- [x] ʵ�� `ObjectPool` �� per-type batching��������������ʵ�֣�
- [ ] ʵ�� simple impostor��billboard�����ߣ�δ��ɣ�
- [x] ���ܲ��Բ���¼ draw calls������� - ������ GPU PoC ������׼��

�׶� 3����ʽ+����2-3 �죩 �� ����
- [ ] ʵ�� chunk window ��ʽ����/���գ�RoadManager ���л��� chunk �߼���������ģ�鼯����δ��ɣ�
- [ ] `PhysicsAdapter` ʵ�� interactive object ע�ᣨδʵ�֣�
- [ ] ��� baked scenery loader��baked loader scaffold exists in Spawner but integration/IO improvements pending��

�׶� 4���Ż�/���ӻ�/�༭����3-4 �죩 �� ����
- [ ] GPU batching/indirect��proof-of-concept��δʵ�֣����о��������ԣ�
- [ ] �༭��/�����ع��ߣ��༭ spawner rules��baked lists����δʵ�֣�
- [ ] �� UI ��¶ density/LOD ������δʵ�֣�

�ӿ�ʾ����TypeScript��
----------------------
// RoadObjectDesc
export type RoadObjectDesc = {
  id?: string;
  type: string; // e.g. 'tree:palm'
  z: number;
  lateral?: number;
  y?: number;
  rotY?: number;
  scale?: number;
  interactive?: boolean;
  collision?: 'box'|'sphere'|null;
  lodBias?: number;
};

// IInstanceRenderer
export interface IInstanceRenderer {
  init(scene:any, assetLoader:any): void;
  setInstances(type:string, descs:RoadObjectDesc[]): void;
  update(camera:any): void;
  dispose(): void;
}

Ǩ�Ʒ�������ݲ���
-----------------
- ���գ�ֱ�Ӱ�ģ������Ⱦ�߼������� RoadManager ����ϣ��������ʵ��ģ�黯�Ǽܲ��� RoadManager ������ע�롣
- ���ݣ���������·�� instanced ʵ����Ϊһ�� type handler�����滻Ϊ InstanceRenderer ����

������ ����
- [x] `docs/environment_system_design.md`�����ļ���
- [x] `src/world/RoadsideSpawner.ts`���Ǽܣ�
- [x] `src/world/InstanceRenderer.ts`���Ǽܣ�
- [x] ��Ԫ����ģ�壨`tests/__tests__/spawner.test.ts`, `instanceRenderer.test.ts`��

��һ�������飩
---------------
�ҿ��������ڹ��������������Ǽ��ļ���RoadsideSpawner + InstanceRenderer����������Ԫ���ԣ������в��Կ�ܡ��Ƿ�ʼ��

��������ݣ���ǰ״̬��
-------------------
- ʵ�ֲ��ύ�˻���ϵͳ����ĵ� `docs/environment_system_design.md`�������ɴ򹴵Ŀ����ƻ�����
- ��ʵ�ֲ���ӵ�Ԫ���ԣ�
  - `src/world/RoadsideSpawner.ts`������ʽ���� + baked ֧�֣��� deterministic RNG����
  - `src/world/InstanceRenderer.ts`��InstancedMesh ����Ǽܣ�֧�ְ� type+LOD �ػ�����
  - `src/world/ObjectPool.ts`���������� + slot allocate/release ֧�֣���
  - `src/world/PhysicsAdapter.ts`��PhysicsAdapter �Ǽܣ�֧�� FakePhysics �� Rapier wrapper �ӿڣ���
  - ��Ԫ���ԣ�`tests/__tests__/spawner.test.ts`��`tests/__tests__/instanceRenderer.test.ts`��`tests/__tests__/physicsAdapter.test.ts`��
- ���ز���ͨ������ִ�в����׼���ȫ��ͨ������
- ������ĵ��н��׶�1��׶�2����ʵ�ֵ�����Ϊ����ɡ�

˵����ʵ��Ϊ�Ǽ�/�������ܣ����ֹ��ܣ����� impostor������ ObjectPool ���ղ��ԡ�PhysicsAdapter �� Spawner ���������ڼ��ɣ��������ƣ����·� PR-sized �����嵥��

�Ѳ��Ϊ PR-sized ���裨����¼���ȣ�
 - [x] PR-1: Add `InstanceRenderer` interface and skeleton (done)
 - [x] PR-2: Implement `ObjectPool` basic allocate/release (done)
 - [x] PR-3: Implement basic `PhysicsAdapter` skeleton and tests (done)
 - [ ] PR-4: Wire `RoadManager` to accept an `InstanceRenderer` and send lamp descriptors (done partially �� RoadManager now accepts renderer; still needs integration path to read from Spawner)
 - [ ] PR-5: Integrate `RoadsideSpawner` outputs into `RoadManager` and call `InstanceRenderer.setInstances` per type (next)
 - [ ] PR-6: Add configuration flag to toggle InstanceRenderer path vs legacy instanced lamps (next)
 - [ ] PR-7: Ensure instance update timing is synchronized with physics (postPhysicsSync) and avoid race conditions (next)

-��չ�� PR-sized ����ϸ�֣�������ʵ�ֲ��ϲ���
+
+- �����/�ϲ��� PR��״̬��
+- [x] PR-4a: Expose `RoadsideSpawner` instance on `RoadManager` (done)
+- [x] PR-4b: Implement grouping utility to group `RoadObjectDesc[]` by `type` and by LOD bucket (done)
+- [x] PR-4c: In `RoadManager.update`, call grouping utility and `InstanceRenderer.setInstances` (done)
+- [x] PR-5a: Add `useInstanceRenderer` flag & tests (done)
+- [x] PR-5b: Tests verifying RoadManager -> InstanceRenderer path (done)
+- [x] PR-6a: ObjectPool maxCapacity / LRU features (done)
+- [x] PR-6b: Hook ObjectPool into InstanceRenderer (done)
+- [x] PR-7a: Simple impostor/billboard pipeline (done)
+- [x] PR-7b: InstanceRenderer impostor unit tests (done)
+- [x] PR-8: CPU frustum culling in InstanceRenderer.update (done)
+- [x] PR-9: Per-frame performance counters API (done)
+- [x] PR-10: PhysicsAdapter <-> RoadManager lifecycle integration (done)
+- [x] PR-11: Rapier wrapper mock tests and adapter improvements (done)
+- [x] PR-12: Baked scenery exporter CLI/dev API + test (done)
+
+�����Ż���PR-sized ��� �� ���ȼ��뽨��˳��
+
+- PR-13: GPU �����ü� / ��ӻ��� PoC�������ȼ���
+  - PR-13a: Research & prototype WebGL2/WebGPU approach for GPU frustum culling / indirect draws.
+    - Deliverable: a short PoC script in `tools/` that can:
+      - generate a large set of instance transforms (positions/orientations);
+      - run a CPU frustum-culling pass and measure time (baseline);
+      - provide scaffolding / pseudo-implementation for a GPU-based pass (WebGL2 / WebGPU) and document integration points with `InstanceRenderer` (what attributes/uniforms/textures are needed).
+    - Acceptance: PoC script runs in Node (or browser) and produces timing numbers for CPU baseline and documents next implementation steps for GPU path.
+  - PR-13b: Implement a minimal WebGL2/WebGPU PoC (if environment allows) that performs per-instance visibility test on the GPU and writes a compact visible list for indirect draws or instance upload avoidance.
+    - Deliverable: example shader(s), data upload strategy, and a small integration example showing reduced CPU work.
+  - PR-13c: Benchmark: add an automated benchmark comparing CPU-only culling latency vs GPU-assisted approach on representative scenes (recorded as JSON results); add instructions for CI-run.
+
+Notes / next-actions (immediately):
+
+ Create `tools/gpu_culling_poc.ts` that implements PR-13a: generates instance data and measures CPU frustum culling time as a baseline. Include clear TODOs and pointers where WebGL2/WebGPU logic would be inserted for PR-13b.
+ After PR-13a PoC is added, run micro-benchmarks locally and update this document with measured baselines and recommended implementation path (WebGL2 compute-like approach or WebGPU compute shader).
+ Added: demo instrumentation (`demos/gpu_culling_demo.js`) exposing per-step timing and batch runner (`tools/ci/batch_gpu_bench.js`) to collect benchmarks locally. Results saved in `tools/ci/gpu_batch_results.json`.

+Benchmark summary (local runs):
+
+
+ - counts tested: 1k, 5k, 10k, 50k (3 reps each)
+ - steady-state GPU total times (excluding first-run compile outlier): ~3�C7 ms depending on instance count
+ - dominant steady-state cost: `readPixels` (1.3�C3.2 ms); upload cost is small (<1.2 ms)
+
+Recommended immediate actions:
+1. Prewarm/compile shaders & reuse GL resources to avoid first-run spikes (implemented for measurement; now marked as completed �� make permanent in runtime).
+2. Design non-blocking readback flow or move to WebGPU compute to remove readPixels bottleneck. (WebGPU PoC demo added under `demos/gpu_culling_webgpu.*` �� evaluates dispatch vs readback timings.)
+3. Integrate WebGPU visible-list compaction & double-buffering in `InstanceRenderer` to apply results without frame stalls.

## �������� (Checklist)

�����г��������ȼ�����ĺ��������PR-sized�������Թ�ѡ����ʽ��¼���Ⱥ͵�ǰ����״̬�����ȼ��Ӹߵ������򣬱�����ʵʩ��ϲ���

- [ ] PR-13: GPU �����ü� / ��ӻ��� PoC�������ȼ���
 - [ ] PR-13a: ��� `tools/gpu_culling_poc.ts`��CPU baseline PoC������¼�������ߣ��Ѵ��� PoC������У�鲢���ɵ� CI�� (in progress: camera injected, WebGPU prewarm attempted)
 - [ ] PR-13b: ������� WebGL2 / WebGPU PoC����Сʵ�֣�compute �� fullscreen-pass -> compact visible list��
 - [ ] PR-13c: ��׼�Զ�����Puppeteer �������С����� `tools/ci/gpu_batch_results.json`��

- [ ] PR-5..PR-7: InstanceRenderer �� RoadManager �����������ɣ������ȼ���
 - [ ] PR-5: �� `RoadsideSpawner` ������ȶ��ؽ��� `RoadManager` ������ `InstanceRenderer.setInstances`���� type ���飩
 - [ ] PR-6: �������ÿ��� `useInstanceRenderer`��֧��ƽ�����˵� legacy instanced lamps
 - [ ] PR-7: ȷ��ʵ������������ͬ����post-physics sync�������⾺��������double-buffer / frame ordering��

- [ ] PR-3..PR-4: ��ʽ�����������ɣ������ȼ���
 - [ ] ʵ�� chunk window ����ʽ����/���գ�RoadManager �� Spawner Эͬ��
 - [ ] PhysicsAdapter ����ʵ�� interactive object ע��/�Ƴ���Rapier/FakePhysics ��������һ���ԣ�
 - [ ] baked scenery loader �� Spawner ���ɣ�IO/���ܸĽ���

- [ ] PR-8..PR-12: �Ż��빤�ߣ��е����ȼ���
 - [ ] ��� simple impostor��billboard�����߲����� tests
 - [ ] ObjectPool ���� LRU / ���������������ղ���
 - [ ] �༭��/�����ع���֧�֣�ʵʱ���� density/LOD��
 - [ ] GPU batching / indirect draw PoC�������

���ȼ�˵���뵱ǰ����

1) ��Ҫ�����������֣���
 -Ԥ������� GPU PoC��PR-13a����ȷ�� PoC �ű����ڱ���/CI �����У��ռ��������ݡ�
 - ������ʱ·�������� Camera ע���� WebGPUԤ��ʼ�������ƻ��ԸĶ���������֡��������

2) ����Ŀ�꣨���ɽ׶Σ���
 - ��� RoadManager -> InstanceRenderer ���Ƚ����ɣ�PR-5/6/7������֤����/��Ⱦ˳��

3) �г���Ŀ�꣨�Ż�/���ߣ���
 - ����֤ GPU �����Ժ��ƽ� GPU-visible-list ��˫����Ӧ�ò������� WebGPU compute ʵ�� compaction������ readback �ɱ�����

��ע���� checklist �����ſ������ȸ��¡���ǰ�ѿ�ʼ������ʱ������������ԸĶ���
- �� `RoadManager` �������� `setCameraRef(...)` API������ע�� camera��֧���첽 GPU culler����
- ������� `main.ts` �н�ע�� camera �� `RoadManager` ������Ԥ�� WebGPU culler��������������
