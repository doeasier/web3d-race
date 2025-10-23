# 车辆系统文档 (Vehicle System Documentation)

## 概述

本车辆系统提供了完整的参数化车辆管理功能，包括：

- ?? **车辆配置管理** - JSON文件存储每个车辆的完整参数
- ?? **车辆管理器** - 加载和管理所有可用车辆
- ?? **车辆选择UI** - 精美的车辆选择界面
- ?? **参数化控制** - 使用配置参数驱动车辆行为

## 目录结构

```
assets/vehicles/          # 车辆配置文件
├── vehicles.json       # 车辆清单
├── city_car_01.json  # 城市小车配置
├── sports_coupe_01.json # 运动跑车配置
└── suv_offroad_01.json  # 越野SUV配置

src/core/
├── VehicleConfig.ts      # 车辆配置类型定义
├── VehicleManager.ts     # 车辆管理器
└── modules/
    └── VehicleModule.ts  # 车辆模块（集成到InitializationManager）

src/ui/
└── VehicleSelectionUI.ts # 车辆选择UI组件

src/examples/
└── VehicleSystemExample.ts # 使用示例
```

## 快速开始

### 1. 初始化车辆系统

```typescript
import { getVehicleManager } from './core/VehicleManager';
import { ResourceManager } from './core/ResourceManager';

// 创建资源管理器
const resourceManager = new ResourceManager();

// 获取车辆管理器
const vehicleManager = getVehicleManager(resourceManager);

// 初始化（加载所有车辆配置）
await vehicleManager.initialize();
```

### 2. 显示车辆选择界面

```typescript
import { VehicleSelectionUI } from './ui/VehicleSelectionUI';

const vehicleUI = new VehicleSelectionUI(vehicleManager, {
  onVehicleSelected: (vehicleId) => {
    console.log('Selected:', vehicleId);
  },
  onStartGame: () => {
    const vehicle = vehicleManager.getSelectedVehicle();
    startGameWithVehicle(vehicle);
}
});

vehicleUI.show();
```

### 3. 在游戏中使用车辆配置

```typescript
import { VehicleModule } from './core/modules/VehicleModule';

// 获取选中的车辆配置
const vehicleConfig = vehicleManager.getSelectedVehicle();

// 创建车辆模块
const vehicleModule = new VehicleModule(physicsWorld, vehicleConfig);
await vehicleModule.init();

// 使用车辆
const vehicle = vehicleModule.vehicle;
vehicle.setInput({ throttle: 0.5, steer: 0.2 });
vehicle.update(deltaTime);
```

## 车辆配置文件格式

每个车辆配置文件包含以下部分：

### 基本信息

```json
{
  "id": "city_car_01",
  "displayName": "City Compact",
  "displayNameZh": "城市小车",
  "description": "Agile and efficient for city driving",
  "category": "compact",
  "modelPath": "/assets/models/car1.glb",
  "thumbnailPath": "/assets/thumbnails/city_car_01.png"
}
```

### 物理参数

```json
{
  "physics": {
    "mass": 1200,         // 质量 (kg)
    "wheelRadius": 0.3,        // 轮半径 (m)
    "wheelInertia": 0.5,     // 轮惯性
 "centerOfMassOffset": [0, -0.2, 0],  // 重心偏移
    "dragCoefficient": 0.32,   // 空气阻力系数
    "rollingResistance": 0.015 // 滚动阻力
  }
}
```

### 转向参数

```json
{
  "steering": {
    "maxSteerAngle": 35,       // 最大转向角 (度)
    "steerSpeed": 2.5,         // 转向速度
    "returnSpeed": 3.0,        // 回正速度
    "minSpeed": 0.5            // 最小速度阈值
  }
}
```

### 加速参数

```json
{
  "acceleration": {
    "maxAccel": 5.5,       // 最大加速度 (m/s?)
    "throttleResponse": 1.2,   // 油门响应
    "reverseAccel": 3.0,       // 倒车加速度
    "maxSpeed": 50,            // 最高速度 (m/s)
    "maxReverseSpeed": 15,     // 最高倒车速度
    "torqueCurve": [    // 扭矩曲线
      {"rpm": 0, "torque": 0.3},
      {"rpm": 3000, "torque": 1.0}
    ]
  }
}
```

### 制动参数

```json
{
  "braking": {
    "a_light": 3.5,     // 轻刹车减速度 (m/s?)
    "a_heavy": 9.0,   // 重刹车减速度 (m/s?)
    "longPressThresholdMs": 300,  // 长按阈值 (ms)
    "rampUpTimeMs": 700,       // 制动力爬升时间
    "absEnabled": true,    // ABS启用
    "brakeBias": 0.6           // 制动力分配 (60%前轮)
  }
}
```

### 发动机参数

```json
{
  "engine": {
    "nominalRpm": 3000,        // 标称转速
  "idleRpm": 800,        // 怠速转速
    "maxRpm": 7000,            // 最大转速
    "redlineRpm": 6500,        // 红线转速
    "rpmIncreaseRate": 2000,   // 转速上升率
    "rpmDecreaseRate": 1500    // 转速下降率
  }
}
```

### 悬挂参数

```json
{
  "suspension": {
 "stiffness": 40000,     // 刚度
    "damping": 2000,       // 阻尼
    "travel": 0.2,         // 行程 (m)
    "compression": 0.8,        // 压缩
    "rebound": 0.6       // 回弹
  }
}
```

### 动画映射

```json
{
  "animations": {
    "idle": "Idle",
    "drive_slow": "DriveSlow",
    "drive_fast": "DriveFast",
    "brake": "Brake",
    "steer": "Steer",
    "wheelRotation": "WheelRotation"
  }
}
```

### 音频配置

```json
{
  "audio": {
    "engine": {
      "idle": "/assets/audio/engine_idle.mp3",
      "low": "/assets/audio/engine_low.mp3",
      "mid": "/assets/audio/engine_mid.mp3",
      "high": "/assets/audio/engine_high.mp3"
    },
    "effects": {
      "brake": "/assets/audio/brake_screech.mp3",
   "horn": "/assets/audio/horn.mp3"
    }
  }
}
```

### 视觉配置

```json
{
"visual": {
    "bodyColor": "#FF6B35",
    "wheelColor": "#2C2C2C",
    "glassOpacity": 0.3,
    "brakeLightIntensity": 2.0,
    "headlightIntensity": 1.5
  }
}
```

### 解锁要求

```json
{
  "unlockRequirements": {
    "level": 1,       // 需要等级
    "currency": 0,       // 需要货币
    "achievements": []         // 需要成就
  }
}
```

### 统计数据（UI显示）

```json
{
  "stats": {
    "acceleration": 75,   // 0-100 加速评分
  "topSpeed": 70, // 0-100 极速评分
    "handling": 85,            // 0-100 操控评分
    "braking": 80,             // 0-100 制动评分
 "durability": 70           // 0-100 耐久评分
  }
}
```

## API参考

### VehicleManager

```typescript
class VehicleManager {
  // 初始化
  async initialize(): Promise<void>
  
  // 获取所有车辆
  getAllVehicles(): VehicleLoadState[]
  
  // 获取已解锁车辆
  getUnlockedVehicles(): VehicleLoadState[]
  
  // 按类别获取
  getVehiclesByCategory(category: string): VehicleLoadState[]
  
  // 获取配置
  getVehicleConfig(id: string): VehicleConfig | null
  
// 获取选中车辆
  getSelectedVehicle(): VehicleConfig | null
  
  // 选择车辆
  selectVehicle(id: string): boolean
  
  // 加载模型
  async loadVehicleModel(id: string): Promise<any>
  
  // 解锁车辆
  unlockVehicle(id: string): boolean
  
  // 清理
  cleanup(): void
}
```

### VehicleSelectionUI

```typescript
class VehicleSelectionUI {
  constructor(
 vehicleManager: VehicleManager,
    callbacks: VehicleSelectionCallbacks
  )
  
  // 显示UI
  show(): void
  
  // 隐藏UI
  hide(): void
  
  // 销毁UI
  destroy(): void
}

interface VehicleSelectionCallbacks {
  onVehicleSelected: (vehicleId: string) => void
  onStartGame: () => void
  onClose?: () => void
}
```

### VehicleModule

```typescript
class VehicleModule implements InitModule {
  // 构造函数
  constructor(
    physicsWorld: any,
    configOrProfile: VehicleConfig | VehicleProfile
  )
  
  // 初始化
  async init(): Promise<void>
  
  // 重新初始化（切换车辆）
  async reinitialize(
  configOrProfile: VehicleConfig | VehicleProfile
  ): Promise<void>
  
  // 获取配置
  getConfig(): VehicleConfig | null
  getProfile(): VehicleProfile
  
  // 重置
  reset(state?: { position: any; rotation: any }): void
  
  // 清理
  cleanup(): void
}
```

## 集成到主程序

在`main.ts`中集成车辆系统：

```typescript
import { VehicleSystemIntegration } from './examples/VehicleSystemExample';
import { VehicleModule } from './core/modules/VehicleModule';

class RacingGameApp {
  private vehicleSystem!: VehicleSystemIntegration;
  
  async initialize() {
    // ... 其他初始化代码
 
    // 1. 初始化车辆系统
    this.vehicleSystem = new VehicleSystemIntegration(resourceManager);
    await this.vehicleSystem.initialize();
    
    // 2. 显示车辆选择界面
    const vehicleConfig = await this.vehicleSystem.selectVehicle();
    
    // 3. 使用选中的车辆创建VehicleModule
    const vehicleModule = new VehicleModule(physicsWorld, vehicleConfig);
    await vehicleModule.init();
    
    // ... 继续游戏初始化
  }
}
```

## 添加新车辆

### 步骤1：创建配置文件

在`assets/vehicles/`目录下创建新的JSON文件，例如`racing_car_01.json`。

### 步骤2：更新清单

在`assets/vehicles/vehicles.json`中添加新车辆：

```json
{
  "vehicles": [
    "city_car_01.json",
    "sports_coupe_01.json",
    "suv_offroad_01.json",
    "racing_car_01.json"  // 新增
  ]
}
```

### 步骤3：准备资源

- 放置3D模型到`assets/models/`
- 放置缩略图到`assets/thumbnails/`
- 准备音频文件到`assets/audio/`

### 步骤4：测试

重新加载游戏，新车辆将自动出现在选择界面中。

## 调参建议

### 城市车辆（Compact）
- **mass**: 1000-1300 kg
- **maxAccel**: 4.5-6.0 m/s?
- **maxSpeed**: 40-55 m/s
- **maxSteerAngle**: 32-38°
- **a_heavy**: 8.0-9.5 m/s?

### 运动车辆（Sports）
- **mass**: 1300-1600 kg
- **maxAccel**: 7.5-10.0 m/s?
- **maxSpeed**: 70-90 m/s
- **maxSteerAngle**: 28-34°
- **a_heavy**: 9.5-11.0 m/s?

### SUV车辆
- **mass**: 1800-2200 kg
- **maxAccel**: 3.5-5.5 m/s?
- **maxSpeed**: 35-50 m/s
- **maxSteerAngle**: 35-40°
- **a_heavy**: 7.0-8.5 m/s?

### 竞速车辆（Racing）
- **mass**: 900-1200 kg
- **maxAccel**: 10.0-14.0 m/s?
- **maxSpeed**: 90-120 m/s
- **maxSteerAngle**: 25-30°
- **a_heavy**: 11.0-13.0 m/s?

## 常见问题

### Q: 如何更改默认车辆？

在`assets/vehicles/vehicles.json`中修改`defaultVehicle`字段。

### Q: 如何实现车辆解锁系统？

修改`VehicleManager.checkUnlocked()`方法，连接到玩家进度系统。

### Q: 如何在游戏中切换车辆？

```typescript
await vehicleModule.reinitialize(newVehicleConfig);
```

### Q: 如何自定义车辆UI？

修改`VehicleSelectionUI`类的样式和布局。

## 参考文档

- [vehicle_design.md](./vehicle_design.md) - 车辆设计文档
- [VehicleProfile.ts](../src/gameplay/VehicleProfile.ts) - 原始Profile类型
- [BrakeController.ts](../src/gameplay/BrakeController.ts) - 刹车控制器
- [AnimationController.ts](../src/gameplay/AnimationController.ts) - 动画控制器

## 贡献

欢迎贡献新的车辆配置！请确保：

1. 遵循配置文件格式
2. 提供完整的资源文件
3. 测试车辆的平衡性
4. 更新文档

## 许可

本车辆系统遵循项目主许可证。
