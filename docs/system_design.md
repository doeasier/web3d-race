System Design Document: Web 3D Racing Demo
==========================================

Overview
--------
目标：实现一个在网页上运行、单机的 3D 赛车 DEMO（两个关卡），在启动前可选择两套性能/精度方案（流畅 / 精细），并通过统一接口实现可替换的物理与车辆控制实现。

文档范围：总体架构、两套性能方案与接口化设计、详细技术规范（类型/接口、VehicleController 数学模型、关卡 JSON 结构、资源命名规范）、运行流程、项目结构、开发里程碑与测试建议。

1. 总体设计目标
----------------
- 单机离线运行，支持键盘 / 手柄 / 触屏输入。
- 3D 实时渲染，两个关卡（示例：城市赛道、峡谷夜赛）。
- 提供“流畅（Fast）”与“精细（Precise）”两种性能方案供启动时选择。
- 使用 TypeScript + `three.js` 为渲染基础（可选 `babylon.js` 替换）。
- 资源格式优先 `glTF`（支持 Draco / KTX2 压缩）。

2. 技术栈（建议）
------------------
- 渲染：`three.js`（首选）
- 物理：
  - Fast: 简化物理（射线轮子 + 刚体近似）
  - Precise: `rapier`(WASM) 或 `ammo.js`
- 构建工具：`Vite` + TypeScript
- 输入：Keyboard / Gamepad API / Touch
- 音频：WebAudio API
- UI：HTML/CSS 或 `preact`（轻量）

3. 高层模块与职责
------------------
- Core
  - `Renderer`（three.js）
  - `IPhysicsWorld`（抽象物理层）
  - `ResourceManager`（资源加载/缓存）
  - `InputManager`（统一输入）
  - `AudioManager`、`UIManager`
- Gameplay
  - `IVehicleController`（车辆控制器抽象）
  - `RaceManager`（计时/检查点/胜负）
  - `LevelManager`（关卡加载/触发器）
  - `AIController`（可选）

4. 两套性能方案（运行时可选）
--------------------------
- Fast Mode（流畅）
  - 物理：射线轮子 + 简化摩擦模型 + 单刚体质心力学
  - 优点：实现快速、对设备要求低、适合移动设备
  - 依赖：`three.js`，可用自研或 `cannon-es` 做辅助
- Precise Mode（精细）
  - 物理：基于物理引擎（`rapier` / `ammo.js`），使用车轮约束、CCD、细粒度碰撞
  - 优点：更真实的操控、碰撞与悬挂表现

5. 接口化设计（统一抽象）
-------------------------
目标：上层只依赖接口，运行时注入 `Fast` 或 `Precise` 实现。

主要接口（TypeScript 风格）

- `VehicleInput`
  - `steer: number // -1..1`
  - `throttle: number // 0..1`
  - `brake: number // 0..1`
  - `handbrake: boolean`
  - `gearUp?: boolean, gearDown?: boolean`

- `VehicleState`
  - `speed: number // m/s`
  - `rpm: number`
  - `gear: number`
  - `position: {x,y,z}`, `rotation: {x,y,z}`

- `IVehicleController`
  - `setInput(input: VehicleInput): void`
  - `update(dt: number): void` // per-frame or per-physics-step
  - `reset(tf: Transform): void`
  - `getState(): VehicleState`
  - `dispose(): void`

- `IPhysicsWorld`
  - `step(dt: number): void`
  - `raycast(origin, dir, maxDist): RaycastHit | null`
  - `addBody(body: PhysicsBody): PhysicsHandle`
  - `removeBody(handle: PhysicsHandle): void`
  - `setGravity(vec3): void`

6. 工厂与运行时选择
-------------------
- `EngineFactory.create(mode: 'fast'|'precise', config): GameEngine` 返回封装好的 `renderer`, `physics`, `vehicle` 实例。
- 初始设置界面选择模式；模式切换需重置关卡与物理世界（支持重启后切换）。

7. `VehicleController` 数学模型（规范，供两套实现映射）
---------------------------------------------------------
单位与参数：
- 单位：米 (m), 千克 (kg), 秒 (s), 弧度 (rad)
- 车辆参数示例：
  - `mass` (kg)
  - `wheelRadius` (m)
  - `wheelBase` (m)
  - `trackWidth` (m)
  - `centerOfMassHeight` (m)
  - `engine`:{ `maxTorque`, `maxRPM`, `idleRPM`, `gearRatios[]`, `finalDrive` }
  - `suspension`:{ `restLength`, `springK`, `damperC`, `travel` }
  - `tire`:{ `C_alpha` (cornering stiffness), `mu0` (grip) }

关键公式（简化可直接实现）：
- 纵向驱动力（wheel torque → drive force）
  - F_drive = torque_at_wheel / wheelRadius
  - torque_at_wheel = engineTorque * gearRatio * finalDrive * efficiency
- 轮滑比（slipRatio）
  - slipRatio = (omega * r - v_long) / max(|v_long|, eps)
  - 失效：F_long = F_drive * (1 - k_slip * |slipRatio|)
- 横向力（线性曲率）
  - slipAngle ≈ atan2(v_lat + yawRate * a, v_forward) - steerAngle
  - F_lat = -C_alpha * slipAngle
  - 限制：|F_lat| <= mu * F_normal
- 悬挂力
  - F_spring = -k * (x - restLength) - c * v_rel
- 质心受力汇总
  - linearAccel = sumForces / mass
  - angularAccel = I^-1 * sumMoments

数值积分与步长：
- Precise: 固定较小子步（例如 1/120 s）并启用 CCD
- Fast: 更大步长（1/60 s 或自适应），减少子步以节省 CPU

辅助系统：ABS / TC 可通过限制 F_brake / F_drive 在 slipThreshold 时激活。

8. 关卡 JSON 规范
------------------
- 建议位置：`assets/levels/{level_id}.json`
- 必要字段：`id`, `name`, `scene.sceneUrl`, `scene.collisionUrl`, `startPositions`, `checkpoints`, `waypoints` (AI), `camera`, `environment`, `audio`, `performanceHints`

示例：
{
  "id": "level_city",
  "name": "City Circuit",
  "scene": { "sceneUrl":"assets/models/level_city_scene.glb", "collisionUrl":"assets/models/level_city_collision.glb" },
  "startPositions": [ { "position":[0,0,0], "rotation":[0,1.57,0] } ],
  "checkpoints": [ { "id":"cp1", "position":[10,0,50], "radius":5 } ],
  "camera": { "defaultMode":"thirdPerson", "thirdPerson": { "offset":[0,4,-6], "smooth":0.08 } },
  "environment": { "timeOfDay":"day", "skybox":"assets/textures/sky_day.ktx2" },
  "performanceHints": { "recommendedMode":"fast" }
}

9. 资源命名与目录规范
---------------------
目录结构示例：
- `public/`
- `assets/models/` (.glb/.gltf)
- `assets/textures/` (.ktx2, .png)
- `assets/sounds/` (.ogg)
- `assets/levels/` (.json)
- `src/` (代码)

命名规则（小写，下划线分隔）：
- 模型： `car_ferrari_f12.glb`, `car_ferrari_f12_collision.glb`
- 场景： `level_city_scene.glb`, `level_city_collision.glb`
- 纹理： `car_ferrari_diffuse.ktx2`，`track_normal.ktx2`
- 音频： `engine_idle.ogg`, `engine_high.ogg`
- LOD 后缀： `__lod0`, `__lod1`（例如 `tree_oak__lod0.glb`）

10. 配置文件示例
-----------------
- `config.json`（全局）
{
  "defaultMode": "fast",
  "physics": {
    "fast": { "substeps": 1, "gravity": [0,-9.81,0] },
    "precise": { "substeps": 4, "gravity": [0,-9.81,0], "useCCD": true }
  },
  "graphics": { "postProcessing": { "fast": false, "precise": true } }
}

11. 项目代码结构示例
---------------------
- `public/`
- `assets/`
- `src/`
  - `core/` (`Renderer.ts`, `Physics.ts`, `ResourceManager.ts`, `InputManager.ts`, `AudioManager.ts`, `types.ts`)
  - `gameplay/` (`VehicleControllerFast.ts`, `VehicleControllerPrecise.ts`, `RaceManager.ts`, `LevelManager.ts`)
  - `ui/` (`HUD.ts`, `Menu.ts`)
  - `scenes/` (关卡 json)
  - `index.ts`
- `package.json`, `vite.config.ts`, `tsconfig.json`

12. 启动与主循环
-----------------
启动过程：
1. 读取 `config.json` 与用户性能选择（fast/precise）
2. `EngineFactory` 根据模式创建 `Renderer`, `IPhysicsWorld`, `IVehicleController`
3. 使用 `ResourceManager` 异步加载关卡 `sceneUrl` 与 `collisionUrl`
4. `vehicle.reset(startTransform)` 与摄像机/音频初始化
5. 进入主循环：
   - 固定物理步进（physics.step 可能使用子步）
   - 在物理子步中调用 `vehicle.update(dt_sub)`
   - 每帧渲染：更新摄像机、HUD、调用 renderer.render()

性能监控：显示 FPS、物理子步、drawCalls，并支持自动或手动从 `precise` 降级到 `fast`。

13. 开发里程碑（建议）
---------------------
- 周 1：项目搭建（`three.js` + Vite + TypeScript），基础加载与相机。
- 周 2：实现 `Fast` 全链路：输入、资源、简单车辆控制、测试赛道。
- 周 3：实现关卡 1（城市）：HUD、计时、音效。
- 周 4：实现关卡 2（峡谷夜赛）、加载切换界面。
- 周 5：实现 `IVehicleController` 抽象并实现 `Precise`（rapier）替换；优化性能。
- 周 6：测试、性能调优、发布构建。

14. 测试与验证
----------------
- 单元测试：接口契约（`IVehicleController` 在接收模拟输入时行为可预测）
- 集成测试：全链路从加载关卡到完成一圈（checkpoints）
- 性能测试：在目标设备上跑 FPS 与物理子步负载；验证自动降级逻辑

15. 风险与缓解
----------------
- 物理精度不足：在接口化设计下可替换为 `rapier` 或 `ammo`。
- 资源体积大：使用 Draco + KTX2、按需加载/分包。
- 移动设备性能不足：降级后处理、减少物理子步、简化碰撞检测频率。

16. 文档与交付物
------------------
- `docs/vehicle_math.md`（车辆数学细节、参数范围）
- `docs/assets_pipeline.md`（Blender -> glTF -> Draco/KTX2 流程）
- `assets/levels/*.json`（两个示例关卡）
- `src/core/types.ts`, `src/gameplay/VehicleControllerFast.ts`, `src/gameplay/VehicleControllerPrecise.ts` 接口骨架

17. 下一步建议
----------------
- 立即生成并提交 `src/core/types.ts` 与接口骨架文件以固定契约。
- 优先实现 `Fast` 模式的端到端 DEMO，随后接口化并加入 `Precise` 实现。

附录：快速示例（工厂伪代码）
---------------------------
class EngineFactory {
  static create(mode, config) {
    const renderer = new ThreeRenderer(config.graphics);
    const physics = mode === 'precise' ? new RapierPhysicsWorld(config.physics.precise) : new SimplePhysicsWorld(config.physics.fast);
    const vehicle = mode === 'precise' ? new VehicleControllerPrecise(physics, vehicleParams) : new VehicleControllerFast(physics, vehicleParams);
    return { renderer, physics, vehicle };
  }
}

---

文档保存路径： `docs/system_design.md`

如需将接口骨架与少量实现文件写入工作区并执行构建与验证，请批准，我会创建 `src/core/types.ts`、`src/gameplay/VehicleControllerFast.ts`、`src/gameplay/VehicleControllerPrecise.ts` 的骨架并运行构建检查。