车辆动画驱动与刹车动力学设计文档

概述

本文件将之前在对话中讨论的两部分设计整理保存：
1) 动画驱动与混合（AnimationMixer / AnimationAction）
2) 刹车模型（短按/长按、停止距离与制动力映射）

目标

- 让 glTF 汽车模型的动画（若包含）随车辆物理状态驱动：速度、油门、刹车、转向等。
- 实现符合感知的刹车逻辑，支持短按（轻刹）与长按（重刹），并给出参数范围与实现思路，便于后续编码与调参。

1. 动画驱动与混合设计

输入与数据流
- VehicleController 输出标准化状态：{ speed (m/s), throttle (0..1), brakePressure (0..1), steer (-1..1), rpm }
- AnimationController（封装 AnimationMixer）按帧读取这些参数并更新 AnimationAction 的权重、timeScale 或直接控制骨骼变换（例如方向盘、车轮）。

推荐动画集合
- idle（静止/怠速）
- drive_slow / drive_fast（或一个 locomotion clip，通过 blend 切换）
- brake（若模型包含车体/骨骼对刹车的特效）
- steer_subtle（方向盘/车体微倾）

映射与权重策略示例
- locomotionBlend = clamp(speed / speedForFullRun, 0, 1)；speedForFullRun 建议 ~20 m/s（72 km/h）。
- brakeWeight = brakePressure（0..1），用于将 brake 动画淡入并降低 locomotion 动画权重。
- engineRev 用 rpm 驱动仪表或发动机动画速率： action.timeScale = rpm / nominalRpm。
- steer 驱动方向盘骨骼和车体轻微 roll/offset（程序控制）。

轮胎与方向盘
- 轮胎自转（程序驱动）：角速度 ω = v / r（r：轮半径），每帧更新局部旋转。
- 方向盘直接根据 steer 输入设置骨骼或 transform 的旋转。

实现要点
- 为每个 clip 保持 AnimationAction，逐帧平滑调整 action.weight（避免突变）。
- 使用 cross-fade 或插值函数做权重切换。
- 动画优先级：brake > steer > locomotion（可通过权重抑制低优先级动作）。
- 刹车灯/尾灯用材质 emissive 强度关联 brakePressure。音效可按 rpm/状态混合（后续）。

2. 刹车动力学设计（短按/长按）

目标与思路
- 支持短按（点刹/轻刹）与长按（持续加大制动力，重刹），并可配置车辆典型 0-100 km/h 的制动表现（停止距离 35-45 m 为参考）。
- 使用简化运动学关系 d = v^2/(2*a) 来将期望停止距离映射为平均减速度 a。

关键参数与参考值
- g = 9.81 m/s^2
- μ（摩擦系数，干路面）≈ 0.7–1.0（用于 a_max ? μ*g）
- a_heavy 建议范围 ≈ 7.5–9.5 m/s^2（对应 100 km/h 停车距离约 36–40 m）
- a_light 建议范围 ≈ 2.0–4.0 m/s^2
- longPressThreshold 建议 300–400 ms（判定短按/长按）
- rampUpTime（长按从 0 到 1.0 brakePressure）建议 0.5–1.0 s

行为规则（建议）
- 按键按下 < threshold：短按 -> 瞬时产生低幅度 brakePressure（例如 0.2–0.4），释放后快速衰减或保持至释放。
- 按住 >= threshold：长按 -> brakePressure 随时间线性（或按曲线）RampUp 至 1.0（或车辆最大制动力），释放时平滑下降。
- 将 brakePressure 转换为实际减速度 a：a = brakePressure * a_max_effective，其中 a_max_effective = clamp(a_heavy, 0, μ*g)。也可采用分段映射（轻刹区/重刹区）。

实现要点
- InputManager 记录按键按下时间与持续时长；输出短按/长按标识或 brakePressure 值。
- VehicleController 使用 brakePressure 与物理步长计算 speed 的变化（或在物理引擎上应用制动力矩）。
- AnimationController 将 brakePressure 用作动画权重源，控制刹车动画、刹车灯与车身前倾效果。

扩展与风险
- 更高保真可引入轮胎抓地模型（Pacejka）或作 ABS 模拟，但复杂度明显增加。
- 若未来换用真实物理引擎（Rapier），应把制动力映射为轮轴扭矩或轮胎模型输入，而不是直接修改速度。

3. 接口与参数（建议）

VehicleController 输出扩展：{ speed, throttle, brakePressure, isBraking, rpm, steer }
InputManager 输出扩展：{ throttleRaw, brakeRaw, brakePressedDuration, brakeEvent(short|long) }
AnimationController 接口：updateFromVehicle(state) -> 更新 AnimationMixer/Actions 的 weight/timeScale 并驱动车轮/方向盘变换
可暴露给 UI 的调参项：longPressThreshold, rampUpTime, a_light, a_heavy, μ, transitionDuration（动画平滑）

4. 参考与参数来源（用于调参）

- 停车距离与减速度关系：d = v^2/(2*a)
- 摩擦系数 μ（干燥沥青）≈ 0.7–1.0；湿滑/雪地远低。
- 经验值：重刹可达到 0.7–1.0g，轻刹约 0.2–0.4g。

后续工作建议

- 根据以上设计实现 AnimationController（封装 mixer 与动作混合）并把其 update 放入主更新循环。先用简单映射（speed->locomotion blend, brakePressure->brakeWeight）。
- 实现 InputManager 的短按/长按检测并把 brakePressure 传给 VehicleController；配置调试 UI 以调参并观察刹车距离表现。
- 若需要更高保真，引入轮胎侧向/纵向模型与 ABS 策略。

文档保存：本文件即为本次设计草案，便于后续实现与调参。