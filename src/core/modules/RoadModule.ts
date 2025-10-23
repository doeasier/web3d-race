/**
 * ��·�ͻ���ϵͳģ��
 */
import * as THREE from 'three';
import { InitModule } from '../InitializationManager';
import { RoadManager } from '../../world/RoadManager';
import { RoadsideSpawner } from '../../world/RoadsideSpawner';
import { InstanceRenderer } from '../../world/InstanceRenderer';

export interface RoadConfig {
  segmentLength?: number;
  numSegments?: number;
  textureRepeatY?: number;
  scrollFactor?: number;
  roadOffset?: number;
  controlPoints?: Array<{ x: number; z: number; bank?: number }>;
  closed?: boolean;
}

export class RoadModule implements InitModule {
  name = 'road';
  phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';
  dependencies = ['render', 'resources'];

  roadManager!: RoadManager;
  spawner!: RoadsideSpawner;
  instanceRenderer?: InstanceRenderer;

  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private roadMaterial: THREE.Material;
  private assetLoader: any;
  private config: RoadConfig;
  private roadWidth: number;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    roadMaterial: THREE.Material,
    assetLoader: any,
    roadWidth = 6,
    config: RoadConfig = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.roadMaterial = roadMaterial;
    this.assetLoader = assetLoader;
    this.roadWidth = roadWidth;
    this.config = {
      segmentLength: 50,
      numSegments: 12,
      textureRepeatY: 8,
   scrollFactor: 0.2,
      roadOffset: 0,
      controlPoints: [
        { x: 0, z: 0 },
        { x: 6, z: 120 },
        { x: -4, z: 260 },
        { x: 0, z: 400 },
        { x: 8, z: 560 }
      ],
      closed: false,
      ...config
    };
  }

  async init(): Promise<void> {
    // ����RoadManager
    this.roadManager = new RoadManager(this.config as any, this.roadWidth);

    // ����Spawner
    this.spawner = new RoadsideSpawner(
      undefined,
      undefined,
      {
        seed: 1337,
        segmentLength: this.config.segmentLength,
        numSegments: this.config.numSegments
      }
    );
    this.roadManager.setSpawner(this.spawner);

    // ����InstanceRenderer����ѡ��
    try {
  this.instanceRenderer = new InstanceRenderer();
      this.instanceRenderer.init(this.scene, this.assetLoader, {
        near: 30,
        mid: 120,
 far: 400
      });
      this.roadManager.setEnvironmentRenderer(this.instanceRenderer);
    } catch (e) {
      console.warn('RoadModule: InstanceRenderer init failed (non-fatal)', e);
    }

    // ע��camera��������GPU culling
    try {
    this.roadManager.setCameraRef(this.camera);
    } catch (e) {
      console.warn('RoadModule: failed to set camera ref', e);
    }

    // ��ʼ��RoadManager
  this.roadManager.init(this.scene, this.roadMaterial as any);

  console.log('RoadModule: initialized');
  }

  /**
   * Ӧ���µĿ��Ƶ�
   */
  applyControlPoints(points: Array<{ x: number; z: number; bank?: number }>, totalLength?: number): void {
    if (this.roadManager && typeof this.roadManager.applyControlPoints === 'function') {
 this.roadManager.applyControlPoints(points, totalLength);
    }
  }

  /**
   * ���µ�·��ÿ֡���ã�
   */
  update(worldZ: number, speed: number, dt: number): void {
    if (this.roadManager) {
      this.roadManager.update(worldZ, speed, dt);
    }
  }

  cleanup(): void {
    // �����·��Դ
    if (this.roadManager && typeof this.roadManager.dispose === 'function') {
      this.roadManager.dispose();
    }
  }
}
