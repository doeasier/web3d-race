System Test Plan: Web 3D Racing Demo
====================================

Overview
--------
本测试方案整合了系统设计文档中列出的测试目标与单元测试项，并将其细化为可执行的测试用例清单（表格形式）。目的是保证核心接口契约、车辆物理、资源加载、关卡逻辑与关键组件在持续集成中的可测性与稳定性。

测试策略
--------
- 测试类型：单元测试为主，辅以少量集成测试覆盖 Fast 模式的端到端链路。
- 推荐框架：`Vitest` 或 `Jest`（TypeScript 支持）
- Mock/替身：对 three.js、WASM 物理引擎（rapier/ammo）、WebAudio、GLTFLoader 等外部依赖使用 mocks/fakes。
- 数值断言：使用 toBeCloseTo / 小范围容差。
- 时间控制：对时间敏感逻辑使用 fake timers 或注入 timeProvider。
- CI：每次 PR 运行单元测试，关键模块覆盖率目标 ≥ 85%。

总体优先级分级说明：
- Critical：必须有，影响游戏核心可玩性或一致性
- High：重要，影响体验或可维护性
- Medium：提升质量，可选但推荐

1.	类型与接口契约（Critical）
- 测试点
- IVehicleController/IPhysicsWorld/VehicleInput/VehicleState 的方法签名与行为契约。
- 用例
- 未实现的方法抛出或正确返回默认（接口实现应通过类型检查并在运行期有明确行为）。
- setInput 接受边界值（steer -1/1，throttle 0/1，brake 0/1），无异常。
- Mock
- 使用空实现 mock 验证上层组件与接口交互。
2.	ResourceManager（Critical）
- 测试点
- 异步加载成功路径/失败路径、缓存逻辑、并发加载去重、卸载释放。
- 用例
- 加载同一路径两次只触发一次实际请求并返回相同实例。
- 加载不存在资源返回 reject 并抛出可供 UI 展示的错误信息。
- 资源卸载后再次加载重新发起请求。
- Mock
- 模拟 fetch/GLTFLoader 返回可控 Promise / 错误。
- 优先级：Critical
3.	Config 与 关卡 JSON 验证（Critical）
- 测试点
- 关卡 JSON schema 验证（所需字段、类型、坐标数组格式）。
- 用例
- 合法 JSON 通过校验；缺少必需字段（sceneUrl/startPositions/checkpoints）返回结构化错误。
- performanceHints.recommendedMode 接受 fast|precise，其它值被警告/回退。
- Mock
- 静态示例 JSON 文件作为 fixture。
- 优先级：Critical
4.	EngineFactory / 启动流程（Critical）
- 测试点
- 根据模式(fast/precise)创建对应实例组合，注入 config，工厂不抛异常。
- 用例
- create('fast') 返回对象含 renderer, physics, vehicle，且 physics 与 vehicle 是 fast 实现。
- 传入未知模式抛出或回退到默认模式。
- Mock
- 对具体实现使用 spy/mock，断言工厂调用正确构造函数。
- 优先级：Critical
5.	InputManager（High）
- 测试点
- 键盘、手柄、触摸的映射合并、灵敏度/反向设置、事件去抖/平滑。
- 用例
- 模拟按键序列 -> 最终 VehicleInput 输出符合预期（包括边界和快速切换）。
- 保存/加载映射配置生效。
- Mock
- 模拟 DOM KeyboardEvent / Gamepad 状态 / Touch 事件。
- 优先级：High
6.	VehicleController（Fast 实现）（Critical）
- 测试点
- 纵向驱动力、转向映射、速度更新、重置行为、极值与数值稳定性。
- 用例（单元）
- 在静止且 throttle>0 时，调用 update(dt) 后 speed > 0 且增量与期望近似（使用可控参数）。
- steer=-1/1 导致旋转方向符合符号，且角速度在合理范围。
- brake=1 使速率下降：连续 update 导致 speed 减少并可到 0（无负速震荡）。
- reset(tf) 后 position/rotation 与 tf 对齐、速度为 0。
- 边界：极大 throttle 与极小 dt 不导致 NaN/Inf。
- 数值/物理验证
- 验证滑移比计算（给定 wheelAngular & v_long），断言 slipRatio 按公式输出。
- 验证 lateral force = -C_alpha * slipAngle（针对线性区域）。
- Mock
- 用 fake physics world 接受并记录施加的力/力矩，断言 applyForce 调用参数。
- 优先级：Critical
7.	VehicleController（Precise 实现）（High）
- 测试点
- 与物理引擎接口调用（车轮约束、扭矩应用、悬挂参数）正确性与错误处理。
- 用例
- 在 mock rapier 引擎下，controller 对应 API 的调用序列正确（创建刚体、设置车轮、applyTorque）。
- 参数映射（engine torque → wheel force）数值上与预期一致。
- Mock
- rapier/wrapped WASM 接口的 spy/mock。
- 优先级：High
8.	PhysicsWorld（Simple 实现）（High）
- 测试点
- raycast 结果稳定、step 调用频率与子步逻辑、添加/移除 body。
- 用例
- raycast 在已知场景返回预期 hit（使用简化碰撞数据）。
- 多次 step 后 bodies 状态按力积分更新（用 deterministic fake bodies）。
- removeBody 后无法再收到碰撞或更新。
- Mock
- 使用 deterministic fake shapes 与 collisions。
- 优先级：High
9.	PhysicsWorld（Rapier/Ammo 接口包装）（Medium）
- 测试点
- 包装层对底层引擎 API 的调用正确，异常透传与封装。
- 用例
- 初始化/销毁时释放 WASM 资源。
- step 时若底层抛错，包装层抛出含上下文的错误。
- Mock
- 用 Rapier mock 或 spy。
- 优先级：Medium
10.	数学与工具函数（Critical）
- 测试点
- torqueCurve 函数、rpm ↔ torque 映射、滑移比、slipAngle 计算、clamp/lerp 等纯函数。
- 用例
- 对已知输入，断言输出数值精确（小误差范围）。
- 极端输入（rpm=0, rpm>max）返回合理边界值。
- 优先级：Critical
11.	RaceManager（High）
- 测试点
- 检查点判定、计时器、圈数统计、复位逻辑、出界检测。
- 用例
- 按顺序触发 checkpoint -> lap complete，计时器记录正确。
- 触发 out-of-bound 事件后 RaceManager 请求复位（调用 vehicle.reset）。
- 在多人情形（AI 对手）计时独立统计。
- Mock
- 使用 fake checkpoints、stub 时间函数（jest.useFakeTimers）。
- 优先级：High
12.	LevelManager（High）
- 测试点
- 异步加载 scene + collision、关卡切换、错误回退。
- 用例
- 加载成功后调用回调/resolve，场景引用注入 renderer/physics。
- 加载中断/失败时能回滚并释放部分资源。
- Mock
- mock ResourceManager 与 Renderer 的 scene 替换方法。
- 优先级：High
13.	UIManager / HUD（Medium）
- 测试点
- HUD 数据绑定（速度、rpm、圈数）反映 VehicleState，菜单显示/隐藏状态机。
- 用例
- 当 VehicleState.speed 更新时，HUD 显示数值更新（可用虚拟 DOM /轻量渲染）。
- 菜单切换时暂停物理步进（或触发暂停事件）。
- Mock
- DOM 或 Preact 组件浅渲染 mock。
- 优先级：Medium
14.	AudioManager（Medium）
- 测试点
- 引擎声 pitch/volume 随 rpm/speed 变化，播放/停止行为，可静音/恢复。
- 用例
- setEngineParams(rpm, throttle) 后，对内部音源调用 setPlaybackRate / gain。
- audio load fail 返回可控错误并不阻塞游戏启动。
- Mock
- WebAudio API 对象（AudioContext、AudioBufferSourceNode）替身。
- 优先级：Medium
15.	Renderer（Unit-level）与场景接口（Medium）
- 测试点
- 渲染器能正确接收场景对象并调用 draw（使用 headless/mock three）。
- 用例
- render(scene, camera) 被调用时，mock renderer 收到相同 scene 对象并记录帧数。
- 后处理开关在 config 不同值下启用/禁用正确。
- Mock
- three.js 渲染器与相机替身。
- 优先级：Medium
16.	AIController（可选，Medium）
- 测试点
- 路径跟随（waypoints）、超车决策、碰撞避免基础逻辑。
- 用例
- 给定 waypoint 列表，AI 在各步选择合理 steer/throttle 输出并完成路径。
- 当前方占用（模拟障碍）时降速或超车策略触发。
- Mock
- 环境感知用假的 raycasts / distance checks。
- 优先级：Medium
17.	状态恢复 / 生命周期（Critical）
- 测试点
- 组件创建/销毁后的资源释放、重复 init 无内存泄漏或重复订阅。
- 用例
- 多次 create/destroy EngineFactory 产生的实例不会导致事件重复触发或未释放 timers。
- Mock
- spy on addEventListener/removeEventListener、clearInterval、resource refs。
- 优先级：Critical
18.	错误处理与边界（Critical）
- 测试点
- 资源缺失、WASM load 失败、网络中断、异常输入均能被捕获并返回可展示错误。
- 用例
- 模拟 ResourceManager load 抛错 -> UI 收到错误代码并执行 fallback（展示占位，切换到 fast 模式等）。
- Physics init 失败时，允许回退到 fast 简化实现或显示错误并停止启动。
- 优先级：Critical
19.	工具/测试支持（辅助）
- 测试用 fixtures
- 标准关卡 JSON、简化 glb stub、常用车辆参数表
- 测试 helper
- deterministic time-step runner、fake physics world、mock WebAudio/GLTFLoader
- CI 验证
- 在 PR 流程中运行单元测试并输出覆盖率报告（目标覆盖关键模块≥85%）
附加建议（执行细节）
- 保持纯数学/工具函数完全无副作用，便于单元测试精确断言。
- 对与外部系统交互的模块（Renderer/Physics/Audio）尽量少做复杂业务逻辑，把业务逻辑放在纯函数或可注入的服务中以便 mock。
- 对数值计算允许小范围浮点误差断言（toBeCloseTo）。
- 对时间敏感逻辑使用虚拟时钟（jest.useFakeTimers）或注入可控 timeProvider。
- 把测试分成单元（本文件）与少量集成测试（Fast 全链路端到端）以验证模块协作。

测试用例清单（模块 / 测试名 / 描述 / 期望 / 优先级 / 依赖 mock）
-----------------------------------------------------------------
| 模块 | 测试名 | 描述 | 期望 | 优先级 | 依赖 mock |
|---|---|---|---:|---|---|
| types / 接口契约 | interface_contracts_acceptance | 验证 `IVehicleController`/`IPhysicsWorld` 接口方法存在与运行期基本行为 | 接口方法可被调用并在边界输入下不抛未捕获异常 | Critical | 无（或空实现 mock） |
| ResourceManager | resource_load_success | 成功加载资源并缓存 | 重复加载同一资源返回同一实例且只发起一次底层请求 | Critical | GLTFLoader / fetch mock |
| ResourceManager | resource_load_failure | 资源不存在或加载失败 | 返回 reject 并包含可展示错误信息 | Critical | GLTFLoader / fetch mock |
| Config / Level JSON | level_schema_validation | 校验关卡 JSON 必需字段与类型 | 合法文件通过，缺失必需字段返回结构化错误 | Critical | 无（使用 fixture JSON） |
| EngineFactory | factory_creates_correct_instances | 根据模式创建 fast/precise 的组合 | create('fast') 返回 fast impl；未知模式回退或抛错误 | Critical | impl constructors spy/mock |
| InputManager | keyboard_gamepad_touch_mapping | 模拟键盘/手柄/触摸输入合并 | 产生正确的 `VehicleInput` 输出（边界值） | High | KeyboardEvent / Gamepad mock |
| VehicleController (Fast) | fast_throttle_acceleration | 静止 throttle>0 时 update 后速度增加 | speed 增加且与驱动力近似匹配（toBeCloseTo） | Critical | Fake PhysicsWorld 记录 applyForce |
| VehicleController (Fast) | fast_steer_response | steer=-1/1 时更新角速度方向 | 角速度符号与 steer 一致，值在合理范围 | Critical | Fake PhysicsWorld |
| VehicleController (Fast) | fast_brake_deceleration | brake=1 连续 update 后速度下降至 0 | speed 单调递减不出现数值抖动 | Critical | Fake PhysicsWorld |
| VehicleController (Fast) | fast_reset_behavior | reset(tf) 后位置/朝向/速度重置 | position/rotation 与 tf 对齐，线性/角速度为 0 | Critical | Fake PhysicsWorld |
| VehicleController (Fast) | slip_ratio_calc | 验证滑移比计算 | 给定 wheelOmega 与 v_long，slipRatio 符合公式 | Critical | 无（纯函数） |
| VehicleController (Precise) | precise_engine_to_wheel_calls | 与物理引擎交互调用序列正确 | 在 mock rapier 下调用 createRigidBody/setWheel/applyTorque 等 | High | Rapier mock / spy |
| PhysicsWorld (Simple) | raycast_returns_hit | 在已知场景上 raycast 返回预期 hit | 返回正确 hit.point, normal, distance | High | Fake collision dataset |
| PhysicsWorld (Simple) | step_and_integration | 多步 step 后刚体状态随力积分更新 | bodies 位置/速度按力积分变化（deterministic） | High | Fake bodies |
| PhysicsWorld (Rapier Wrapper) | rapier_wrapper_error_propagation | 底层引擎异常被包装层捕获并转发 | 异常包含上下文并可被上层处理 | Medium | Rapier mock throwing errors |
| Math Utils | torque_curve_and_rpm_map | torqueCurve/rpm 映射函数 | 在典型/range 输入下输出在预期范围 | Critical | 无（纯函数） |
| RaceManager | checkpoint_and_lap_count | 触发 checkpoint 与完成圈数计数 | 顺序触发后 lap++ 并记录圈时 | High | fake checkpoints, fake time provider |
| RaceManager | out_of_bounds_reset | out-of-bound 触发复位流程 | 调用 vehicle.reset 并记录事件 | High | VehicleController mock |
| LevelManager | load_scene_and_collision | 异步加载 scene 与 collision，注入 renderer/physics | 成功加载后回调/resolve，失败时回滚 | High | ResourceManager mock, Renderer mock |
| UIManager / HUD | hud_binds_to_state | HUD 随 VehicleState 更新显示数据 | 当 VehicleState.speed 更新时 HUD 显示更新 | Medium | DOM / Preact shallow render mock |
| AudioManager | engine_pitch_volume_mapping | rpm/throttle 映射到音源 pitch & gain | 调用 audioNode.setPlaybackRate 与 gain 对应变化 | Medium | WebAudio API mock |
| Renderer (unit) | renderer_receives_scene | render(scene,camera) 调用 | mock renderer 接收 scene 对象并记录帧 | Medium | three.js renderer mock |
| AIController (optional) | ai_waypoint_follow | 给定 waypoint 列表，AI 输出路径跟随指令 | sequence of steer/throttle 导致近似路径跟随 | Medium | Fake raycasts / env mock |
| Lifecycle / ResourceRelease | create_destroy_no_leak | create/destroy 多次无事件重复或泄漏 | 不出现重复事件回调、定时器被清除 | Critical | spy on event listeners, timers |
| Error handling | resource_load_fallback | 物理/资源初始化失败时回退或报错 | 能回退到可用状态或返回结构化错误 | Critical | ResourceManager / Physics mock throwing |

集成测试候选（端到端，覆盖 Fast 全链路）
-----------------------------------------
- Fast end-to-end smoke test
  - 场景：使用 Fast 模式加载城市关卡，车辆能从起点行驶一段并触发第一个 checkpoint。
  - 目的：验证 ResourceManager、Renderer、SimplePhysics、VehicleControllerFast、RaceManager 的基本协作。
  - 依赖：GLTFLoader mock 返回可驾驶场景、Fake PhysicsWorld 实现
  - 优先级：High

测试夹具与 Mock 需求
--------------------
- Fixtures
  - 标准关卡 JSON（city / canyon 简化版）
  - 标准车辆参数表
  - 简化 glb stub（可空对象或轻量 JSON 表示）
- Mocks / Fakes
  - `FakePhysicsWorld`：记录 applyForce/applyTorque、可控 step 逻辑
  - `RapierMock`：spy createRigidBody / applyTorque / setWheel
  - `GLTFLoaderMock` / fetch mock
  - `WebAudioMock`：AudioContext / AudioBufferSourceNode 替身
  - `ThreeRendererMock`：记录 render(scene,camera) 调用
  - `TimeProvider`：可控时间/定时器替代

CI 与度量
---------
- 运行时机：每次 PR / master push
- 报告：测试结果 + 覆盖率报告（关键模块覆盖率目标 ≥ 85%）
- 性能回归（后期）：集成测试中测量关键场景加载时间与主循环平均 FPS，可通过 headless benchmark 或人工测量收集

如何实施（优先级推荐）
-----------------------
1. 先实现并测试纯数学/工具函数（Math Utils），确保数值基线稳定（Critical）
2. 实现 ResourceManager 并覆盖加载/失败/缓存行为（Critical）
3. 实现 Fast 链路：FakePhysicsWorld + VehicleControllerFast + minimal Renderer，写端到端 smoke 测试（Critical / High）
4. 编写并覆盖 EngineFactory、Config 与 Level JSON 校验（Critical）
5. 逐步添加 Precise Wrapper mocks 并实现 VehicleControllerPrecise（High）
6. 补充中等优先级模块（Audio, UI, Renderer 单元）与更多集成测试

文档与交付
-----------
- 文件位置：`docs/system_test_plan.md`（本文件）
- 测试目录建议：`src/__tests__/` + `tests/integration/`，fixtures 放在 `tests/fixtures/`。
- 若需要，我可以在工作区生成测试骨架文件和部分 fixture mocks 并运行测试框架初始化命令。