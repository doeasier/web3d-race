# ����ϵͳ�ĵ� (Vehicle System Documentation)

## ����

������ϵͳ�ṩ�������Ĳ��������������ܣ�������

- ?? **�������ù���** - JSON�ļ��洢ÿ����������������
- ?? **����������** - ���غ͹������п��ó���
- ?? **����ѡ��UI** - �����ĳ���ѡ�����
- ?? **����������** - ʹ�����ò�������������Ϊ

## Ŀ¼�ṹ

```
assets/vehicles/          # ���������ļ�
������ vehicles.json       # �����嵥
������ city_car_01.json  # ����С������
������ sports_coupe_01.json # �˶��ܳ�����
������ suv_offroad_01.json  # ԽҰSUV����

src/core/
������ VehicleConfig.ts      # �����������Ͷ���
������ VehicleManager.ts     # ����������
������ modules/
    ������ VehicleModule.ts  # ����ģ�飨���ɵ�InitializationManager��

src/ui/
������ VehicleSelectionUI.ts # ����ѡ��UI���

src/examples/
������ VehicleSystemExample.ts # ʹ��ʾ��
```

## ���ٿ�ʼ

### 1. ��ʼ������ϵͳ

```typescript
import { getVehicleManager } from './core/VehicleManager';
import { ResourceManager } from './core/ResourceManager';

// ������Դ������
const resourceManager = new ResourceManager();

// ��ȡ����������
const vehicleManager = getVehicleManager(resourceManager);

// ��ʼ�����������г������ã�
await vehicleManager.initialize();
```

### 2. ��ʾ����ѡ�����

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

### 3. ����Ϸ��ʹ�ó�������

```typescript
import { VehicleModule } from './core/modules/VehicleModule';

// ��ȡѡ�еĳ�������
const vehicleConfig = vehicleManager.getSelectedVehicle();

// ��������ģ��
const vehicleModule = new VehicleModule(physicsWorld, vehicleConfig);
await vehicleModule.init();

// ʹ�ó���
const vehicle = vehicleModule.vehicle;
vehicle.setInput({ throttle: 0.5, steer: 0.2 });
vehicle.update(deltaTime);
```

## ���������ļ���ʽ

ÿ�����������ļ��������²��֣�

### ������Ϣ

```json
{
  "id": "city_car_01",
  "displayName": "City Compact",
  "displayNameZh": "����С��",
  "description": "Agile and efficient for city driving",
  "category": "compact",
  "modelPath": "/assets/models/car1.glb",
  "thumbnailPath": "/assets/thumbnails/city_car_01.png"
}
```

### �������

```json
{
  "physics": {
    "mass": 1200,         // ���� (kg)
    "wheelRadius": 0.3,        // �ְ뾶 (m)
    "wheelInertia": 0.5,     // �ֹ���
 "centerOfMassOffset": [0, -0.2, 0],  // ����ƫ��
    "dragCoefficient": 0.32,   // ��������ϵ��
    "rollingResistance": 0.015 // ��������
  }
}
```

### ת�����

```json
{
  "steering": {
    "maxSteerAngle": 35,       // ���ת��� (��)
    "steerSpeed": 2.5,         // ת���ٶ�
    "returnSpeed": 3.0,        // �����ٶ�
    "minSpeed": 0.5            // ��С�ٶ���ֵ
  }
}
```

### ���ٲ���

```json
{
  "acceleration": {
    "maxAccel": 5.5,       // �����ٶ� (m/s?)
    "throttleResponse": 1.2,   // ������Ӧ
    "reverseAccel": 3.0,       // �������ٶ�
    "maxSpeed": 50,            // ����ٶ� (m/s)
    "maxReverseSpeed": 15,     // ��ߵ����ٶ�
    "torqueCurve": [    // Ť������
      {"rpm": 0, "torque": 0.3},
      {"rpm": 3000, "torque": 1.0}
    ]
  }
}
```

### �ƶ�����

```json
{
  "braking": {
    "a_light": 3.5,     // ��ɲ�����ٶ� (m/s?)
    "a_heavy": 9.0,   // ��ɲ�����ٶ� (m/s?)
    "longPressThresholdMs": 300,  // ������ֵ (ms)
    "rampUpTimeMs": 700,       // �ƶ�������ʱ��
    "absEnabled": true,    // ABS����
    "brakeBias": 0.6           // �ƶ������� (60%ǰ��)
  }
}
```

### ����������

```json
{
  "engine": {
    "nominalRpm": 3000,        // ���ת��
  "idleRpm": 800,        // ����ת��
    "maxRpm": 7000,            // ���ת��
    "redlineRpm": 6500,        // ����ת��
    "rpmIncreaseRate": 2000,   // ת��������
    "rpmDecreaseRate": 1500    // ת���½���
  }
}
```

### ���Ҳ���

```json
{
  "suspension": {
 "stiffness": 40000,     // �ն�
    "damping": 2000,       // ����
    "travel": 0.2,         // �г� (m)
    "compression": 0.8,        // ѹ��
    "rebound": 0.6       // �ص�
  }
}
```

### ����ӳ��

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

### ��Ƶ����

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

### �Ӿ�����

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

### ����Ҫ��

```json
{
  "unlockRequirements": {
    "level": 1,       // ��Ҫ�ȼ�
    "currency": 0,       // ��Ҫ����
    "achievements": []         // ��Ҫ�ɾ�
  }
}
```

### ͳ�����ݣ�UI��ʾ��

```json
{
  "stats": {
    "acceleration": 75,   // 0-100 ��������
  "topSpeed": 70, // 0-100 ��������
    "handling": 85,            // 0-100 �ٿ�����
    "braking": 80,             // 0-100 �ƶ�����
 "durability": 70           // 0-100 �;�����
  }
}
```

## API�ο�

### VehicleManager

```typescript
class VehicleManager {
  // ��ʼ��
  async initialize(): Promise<void>
  
  // ��ȡ���г���
  getAllVehicles(): VehicleLoadState[]
  
  // ��ȡ�ѽ�������
  getUnlockedVehicles(): VehicleLoadState[]
  
  // ������ȡ
  getVehiclesByCategory(category: string): VehicleLoadState[]
  
  // ��ȡ����
  getVehicleConfig(id: string): VehicleConfig | null
  
// ��ȡѡ�г���
  getSelectedVehicle(): VehicleConfig | null
  
  // ѡ����
  selectVehicle(id: string): boolean
  
  // ����ģ��
  async loadVehicleModel(id: string): Promise<any>
  
  // ��������
  unlockVehicle(id: string): boolean
  
  // ����
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
  
  // ��ʾUI
  show(): void
  
  // ����UI
  hide(): void
  
  // ����UI
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
  // ���캯��
  constructor(
    physicsWorld: any,
    configOrProfile: VehicleConfig | VehicleProfile
  )
  
  // ��ʼ��
  async init(): Promise<void>
  
  // ���³�ʼ�����л�������
  async reinitialize(
  configOrProfile: VehicleConfig | VehicleProfile
  ): Promise<void>
  
  // ��ȡ����
  getConfig(): VehicleConfig | null
  getProfile(): VehicleProfile
  
  // ����
  reset(state?: { position: any; rotation: any }): void
  
  // ����
  cleanup(): void
}
```

## ���ɵ�������

��`main.ts`�м��ɳ���ϵͳ��

```typescript
import { VehicleSystemIntegration } from './examples/VehicleSystemExample';
import { VehicleModule } from './core/modules/VehicleModule';

class RacingGameApp {
  private vehicleSystem!: VehicleSystemIntegration;
  
  async initialize() {
    // ... ������ʼ������
 
    // 1. ��ʼ������ϵͳ
    this.vehicleSystem = new VehicleSystemIntegration(resourceManager);
    await this.vehicleSystem.initialize();
    
    // 2. ��ʾ����ѡ�����
    const vehicleConfig = await this.vehicleSystem.selectVehicle();
    
    // 3. ʹ��ѡ�еĳ�������VehicleModule
    const vehicleModule = new VehicleModule(physicsWorld, vehicleConfig);
    await vehicleModule.init();
    
    // ... ������Ϸ��ʼ��
  }
}
```

## ����³���

### ����1�����������ļ�

��`assets/vehicles/`Ŀ¼�´����µ�JSON�ļ�������`racing_car_01.json`��

### ����2�������嵥

��`assets/vehicles/vehicles.json`������³�����

```json
{
  "vehicles": [
    "city_car_01.json",
    "sports_coupe_01.json",
    "suv_offroad_01.json",
    "racing_car_01.json"  // ����
  ]
}
```

### ����3��׼����Դ

- ����3Dģ�͵�`assets/models/`
- ��������ͼ��`assets/thumbnails/`
- ׼����Ƶ�ļ���`assets/audio/`

### ����4������

���¼�����Ϸ���³������Զ�������ѡ������С�

## ���ν���

### ���г�����Compact��
- **mass**: 1000-1300 kg
- **maxAccel**: 4.5-6.0 m/s?
- **maxSpeed**: 40-55 m/s
- **maxSteerAngle**: 32-38��
- **a_heavy**: 8.0-9.5 m/s?

### �˶�������Sports��
- **mass**: 1300-1600 kg
- **maxAccel**: 7.5-10.0 m/s?
- **maxSpeed**: 70-90 m/s
- **maxSteerAngle**: 28-34��
- **a_heavy**: 9.5-11.0 m/s?

### SUV����
- **mass**: 1800-2200 kg
- **maxAccel**: 3.5-5.5 m/s?
- **maxSpeed**: 35-50 m/s
- **maxSteerAngle**: 35-40��
- **a_heavy**: 7.0-8.5 m/s?

### ���ٳ�����Racing��
- **mass**: 900-1200 kg
- **maxAccel**: 10.0-14.0 m/s?
- **maxSpeed**: 90-120 m/s
- **maxSteerAngle**: 25-30��
- **a_heavy**: 11.0-13.0 m/s?

## ��������

### Q: ��θ���Ĭ�ϳ�����

��`assets/vehicles/vehicles.json`���޸�`defaultVehicle`�ֶΡ�

### Q: ���ʵ�ֳ�������ϵͳ��

�޸�`VehicleManager.checkUnlocked()`���������ӵ���ҽ���ϵͳ��

### Q: �������Ϸ���л�������

```typescript
await vehicleModule.reinitialize(newVehicleConfig);
```

### Q: ����Զ��峵��UI��

�޸�`VehicleSelectionUI`�����ʽ�Ͳ��֡�

## �ο��ĵ�

- [vehicle_design.md](./vehicle_design.md) - ��������ĵ�
- [VehicleProfile.ts](../src/gameplay/VehicleProfile.ts) - ԭʼProfile����
- [BrakeController.ts](../src/gameplay/BrakeController.ts) - ɲ��������
- [AnimationController.ts](../src/gameplay/AnimationController.ts) - ����������

## ����

��ӭ�����µĳ������ã���ȷ����

1. ��ѭ�����ļ���ʽ
2. �ṩ��������Դ�ļ�
3. ���Գ�����ƽ����
4. �����ĵ�

## ���

������ϵͳ��ѭ��Ŀ�����֤��
