•	若想更精细的 LOD，可根据摄像机距离逐步降低实例细节或使用更粗糙的 billboard（精灵）表示远处灯光。
•	若使用物理光照（例如夜间场景），可以只在近距离启用 emissive/lighting 或在 instanced bulbs 上使用点光 (PointLight) 的近距离影响区域。
•	可以将 maxRenderDistance 设为可配置的 UI 控件，便于运行时调优。

•	在 UI 中添加 maxRenderDistance 调节器并在运行时更新 roadManager.config.maxRenderDistance；
•	在夜间模式下启用灯光（点光源）并对性能影响做可视化对比；
•	将 RoadManager 的类型声明从 any 改为更精确的 types（如果你想在项目中开启 stricter TS 配置）。
•	在车身做侧向倾斜（banking）和摄像机平滑跟随，以增强弯道感。
•	在高速度下增加轮胎侧滑、转向输入到速度的耦合（欠/过转向模型）以更真实地表现操控。
•	提供 UI 控件实时调节 curveAmplitude/curveFrequency 和启用“夜间灯光”模式（点光源 + 发光材质），并对 InstancedMesh 做更细粒度 LOD。

•	支持编辑器导入/可视化编辑控制点（鼠标拖拽样条控制点或加载外部路径文件）。
•	用样条切片计算切线并让道路段旋转（banking）/灯柱朝向更贴合路径切线。
•	使用可切换的曲线类型（Bezier / Catmull-Rom / B-spline）并提供细分密度配置。
•	在远景用更低分辨率的道路表示（更 aggressive LOD）或将道路 surface 合并以减少 draw calls。
•	支持车道偏移、多个并行车道与道路宽度随 z 变化。
•	验证控制点坐标系是否与关卡坐标一致（x 横向，z 纵向）；如需，可扩展控制点包含高度 y 或旋转切线信息。
•	添加可视化控制点编辑（在场景中拖拽点），并保存为 level 文件。
•	修改 main.ts Apply Path 按钮以调用 transitionToControlPoints（避免销毁/重建，状态更连贯）。
•	使用曲线距离插值（非线性 easing，如 easeInOutQuad）以获得更自然平滑效果。
•	将过渡持续时间、easing、并行动画（如道路材质淡入/out）暴露给 UI，便于调试。
•	将 transitionToControlPoints 的 duration 与 easing 函数暴露为 UI 控件，便于交互调参。
•	若需要更自然的速度感，可用曲线距离 reparameterization（按 arc length）来驱动进度，而非简单时间插值。
•	把 DefaultCityCar 或关卡定义中的 animations 名称与 glTF clip 名称对齐，或在加载 glTF 时打印 available clip names 帮助映射。
•	将 AnimationController 的 smoothing、speedForFullRun、timeScale mapping 等暴露为可调参数或 UI。
•	实现车轮直接程序旋转（基于 vehicle.state.speed 与 profile.wheelRadius）和方向盘骨骼绑定。
•	使用 Rapier 还是 FakePhysicsWorld？（当前 main.ts 使用 FakePhysicsWorld）
•	是否需要我把 VehicleControllerFast 在每帧将 controller 的 lateral x 写回物理刚体（setBodyTransform），使视觉/物理完全一致？
•	暴露刹车事件给上层：目前 BrakeController.consumeEvent() 存在但 InputManager 没公开事件。如果需要 UI 或音效触发（短刹/长刹事件），我可以添加 InputManager.getBrakeEvent() 以便上层读取。
•	为 BrakeController 增加单元测试（建议覆盖短按/长按/脉冲/ramp 行为），我可以帮你添加 vitest 测试文件。
•	把 BrakeController 的参数（shortBrakeValue, longPressThresholdMs, rampUpTimeMs）暴露到调试 UI 以便实时调参
•	给占位->真实刚体迁移加平滑插值以避免瞬移。
•	将 lateral（x）也走物理通道（applyForceAtPoint / wheels）以获得更真实的动力学（需要轮胎模型）。