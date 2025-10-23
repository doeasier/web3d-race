/**
 * ��Ⱦϵͳ��ʼ��ģ��
 */
import * as THREE from 'three';
import { InitModule } from './InitializationManager';

export interface RenderConfig {
  antialias?: boolean;
  pixelRatio?: number;
  container?: HTMLElement;
}

export class RenderModule implements InitModule {
  name = 'render';
  phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;

  private config: RenderConfig;

  constructor(config: RenderConfig = {}) {
    this.config = config;
  }

  async init(): Promise<void> {
    // ��������
    this.scene = new THREE.Scene();

    // �������
    this.camera = new THREE.PerspectiveCamera(
    60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 4, -8);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    // ������Ⱦ��
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.config.antialias ?? true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this.config.pixelRatio ?? (window.devicePixelRatio || 1));

    // ��ӵ�DOM
    const container = this.config.container ?? document.body;
    container.appendChild(this.renderer.domElement);

    // ��������
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7.5);
    this.scene.add(light);

    const amb = new THREE.AmbientLight(0x606060);
    this.scene.add(amb);

    // �������ڱ仯
    window.addEventListener('resize', this.handleResize);

    console.log('RenderModule: initialized');
  }

  private handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  cleanup(): void {
    window.removeEventListener('resize', this.handleResize);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }
}
