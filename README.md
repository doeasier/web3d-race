# WEB3D Racing Game ???

> **最新更新**: 已完成模块化架构迁移！查看 [迁移成功报告](./docs/MIGRATION_SUCCESS.md) ??

一个基于WebGL/WebGPU的3D赛车游戏，采用模块化架构设计。

## ? 特性

- ?? **双物理引擎**: Rapier (精确) / Fake (快速)，支持运行时切换
- ?? **双车辆模式**: Fast / Precise，适应不同场景
- ??? **动态道路系统**: 样条曲线、倾斜角、烘焙场景支持
- ?? **环境系统**: GPU culling、impostor渲染、实例化优化
- ?? **程序化纹理**: 自动生成或从文件加载
- ??? **WebGPU加速**: 视锥剔除、compute shader
- ?? **模块化架构**: 9个独立模块，易于扩展和测试

## ?? 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test
```

访问 `http://localhost:5173` 查看应用。

## ?? 文档导航

### 核心文档
- [**迁移成功报告**](./docs/MIGRATION_SUCCESS.md) - ?? 最新迁移总结
- [**架构设计**](./docs/initialization_system.md) - 模块化系统详解
- [**迁移指南**](./docs/migration_guide.md) - 如何迁移现有代码
- [**前后对比**](./docs/migration_comparison.md) - 迁移前后详细对比
- [**快速参考**](./docs/quick_reference.md) - 速查卡片

### 系统设计
- [系统设计文档](./docs/system_design.md)
- [环境系统设计](./docs/environment_system_design.md)
- [车辆设计文档](./docs/vehicle_design.md)

## ??? 架构概览

### 模块化架构

```
InitializationManager (核心协调器)
│
├── RenderModule (渲染)
├── TextureModule (纹理)
├── SceneModule (场景对象)
├── ResourceModule (资源加载)
├── PhysicsModule (物理引擎)
├── VehicleModule (车辆控制)
├── RoadModule (道路系统)
├── GpuModule (GPU加速)
└── UIModule (用户界面)
```

每个模块独立、可测试、可替换。

### 文件结构

```
src/
├── main.ts     # ? 新版主入口(模块化)
├── main_legacy.ts           # ?? 旧版备份
├── main_modular.ts    # ?? 参考实现
├── core/
│   ├── InitializationManager.ts  # 初始化管理器
│   ├── modules/   # 9个核心模块
│   │   ├── RenderModule.ts
│   │   ├── TextureModule.ts
│   │   ├── SceneModule.ts
│   │   ├── ResourceModule.ts
│   │   ├── PhysicsModule.ts
│   │   ├── VehicleModule.ts
│   │   ├── RoadModule.ts
│   │   ├── GpuModule.ts
│   │   └── UIModule.ts
│   └── ... (其他核心代码)
├── gameplay/                # 游戏逻辑
├── world/     # 世界系统
└── types/       # 类型定义
```

## ?? 使用示例

### 基本使用

```typescript
import { RacingGameApp } from './main';

// 应用已自动启动
// 访问实例：window.app
// 访问管理器：window.InitializationManager
```

### 调试

```javascript
// 浏览器控制台
> app.modules
{ render, textures, scene, physics, vehicle, road, gpu, ui }

> app.modules.physics.switchBackend('fake')
// 切换到Fake物理后端

> InitializationManager.getState('vehicle')
'ready'

> InitializationManager.getErrors()
Map(0) {}
```

### 切换物理引擎

```javascript
// 通过UI选择框
// 或在控制台
await app.modules.physics.switchBackend('rapier');
```

### 加载轨道

```javascript
// 通过UI选择框选择轨道
// 或在控制台
await app.handleTrackChange('canyon_circuit.json');
```

### 导出纹理

```javascript
// 点击"Export Textures"按钮
// 或在控制台
app.modules.textures.exportTexture('car');
```

## ?? 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm test -- --watch

# 覆盖率报告
npm test -- --coverage
```

测试覆盖了：
- 单元测试（每个模块）
- 集成测试（模块间交互）
- 端到端测试（完整流程）

## ?? 性能

| 指标 | 值 |
|------|-----|
| 初始化时间 | ~820ms |
| 内存占用 | ~125MB |
| 运行时FPS | 60 FPS |
| 代码体积(压缩) | ~68KB |

**WebGPU支持**: 自动检测并启用（如果可用）

## ??? 技术栈

- **渲染**: Three.js
- **物理**: Rapier.js (可选Fake引擎)
- **GPU加速**: WebGPU (可选WebGL2回退)
- **构建工具**: Vite
- **测试**: Vitest
- **类型检查**: TypeScript
- **代码质量**: ESLint + Prettier

## ?? 贡献

欢迎贡献代码、报告问题或提出建议！

### 贡献流程

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

### 代码规范

- 遵循现有代码风格
- 为新功能编写测试
- 更新相关文档
- 确保所有测试通过

## ?? 更新日志

### v2.0.0 (Latest) - 模块化架构
- ? 完全重构为模块化架构
- ? 新增TextureModule和SceneModule
- ? 统一的InitializationManager
- ? 支持运行时切换物理后端
- ? 改进的错误处理和调试支持
- ?? 全面的文档更新

### v1.0.0 - 初始版本
- 基础渲染和物理系统
- 车辆控制和道路生成
- GPU culling PoC

查看 [完整更新日志](./CHANGELOG.md)

## ?? 许可证

MIT License - 查看 [LICENSE](./LICENSE) 文件了解详情

## ?? 致谢

- Three.js 团队
- Rapier.js 团队
- 所有贡献者和测试者

## ?? 联系方式

- GitHub Issues: [报告问题](https://github.com/doeasier/web3d-race/issues)
- 讨论: [GitHub Discussions](https://github.com/doeasier/web3d-race/discussions)

## ?? Star History

如果这个项目对你有帮助，请给我们一个 ??！

---

**最后更新**: 2024  
**状态**: ? Production Ready  
**架构**: Modular  
**版本**: 2.0.0
