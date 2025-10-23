/**
 * 纹理模块 - 管理所有纹理资源
 */
import * as THREE from 'three';
import { InitModule } from '../InitializationManager';

export class TextureModule implements InitModule {
  name = 'textures';
  phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';

  carTexture!: THREE.Texture;
  roadTexture!: THREE.Texture;
  skyTexture!: THREE.Texture;

  // 存储canvas引用用于导出
carCanvas?: HTMLCanvasElement;
  roadCanvas?: HTMLCanvasElement;
  skyCanvas?: HTMLCanvasElement;

  async init(): Promise<void> {
    const loader = new THREE.TextureLoader();
    
 try {
      // 尝试加载预生成的纹理
      this.carTexture = await loader.loadAsync('/assets/textures/car_texture.png');
      this.roadTexture = await loader.loadAsync('/assets/textures/road_texture.png');
      this.skyTexture = await loader.loadAsync('/assets/textures/sky_texture.png');
      
      console.log('TextureModule: loaded from files');
    } catch (e) {
      // 回退到程序化生成
      console.log('TextureModule: generating procedural textures');
      
  this.carCanvas = this.createCarTexture();
      this.carTexture = new THREE.CanvasTexture(this.carCanvas);
      try { (this.carTexture as any).encoding = (THREE as any).sRGBEncoding; } catch {}
 this.carTexture.needsUpdate = true;

      this.roadCanvas = this.createRoadTexture();
  this.roadTexture = new THREE.CanvasTexture(this.roadCanvas);
      this.roadTexture.wrapS = THREE.RepeatWrapping;
    this.roadTexture.wrapT = THREE.RepeatWrapping;
      this.roadTexture.repeat.set(1, 8);
      this.roadTexture.needsUpdate = true;

 this.skyCanvas = this.createSkyTexture();
      this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
      this.skyTexture.needsUpdate = true;
    }

    // 确保道路纹理设置正确
    this.roadTexture.wrapS = THREE.RepeatWrapping;
    this.roadTexture.wrapT = THREE.RepeatWrapping;
    this.roadTexture.repeat.set(1, 8);
    this.roadTexture.needsUpdate = true;

    console.log('TextureModule: initialized');
  }

  private createCarTexture(): HTMLCanvasElement {
    const size = 512;
    const cvs = document.createElement('canvas');
    cvs.width = size;
    cvs.height = size;
    const ctx = cvs.getContext('2d')!;

    // base color
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(0, 0, size, size);

    // darker bottom
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // racing stripe
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(size * 0.45, 0, size * 0.1, size);

    // subtle scratches/noise
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = 'black';
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
    
    return cvs;
  }

  private createRoadTexture(): HTMLCanvasElement {
    const w = 512;
    const h = 512;
    const cvs = document.createElement('canvas');
    cvs.width = w;
 cvs.height = h;
    const ctx = cvs.getContext('2d')!;

    // base gray
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, w, h);

    // noise
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * w;
   const y = Math.random() * h;
   const s = Math.random() * 2;
      ctx.fillRect(x, y, s, s);
    }

  // lane divider (center)
    ctx.strokeStyle = '#dddd77';
ctx.lineWidth = 6;
    ctx.setLineDash([40, 30]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);

    return cvs;
  }

  private createSkyTexture(): HTMLCanvasElement {
    const w = 512;
    const h = 256;
const cvs = document.createElement('canvas');
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext('2d')!;
    
const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#87ceeb'); // light sky blue
    g.addColorStop(1, '#e0f7ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    
    return cvs;
  }

  /**
   * 导出纹理为PNG
   */
  exportTexture(type: 'car' | 'road' | 'sky'): string | null {
    const canvas = type === 'car' ? this.carCanvas : type === 'road' ? this.roadCanvas : this.skyCanvas;
    if (!canvas) return null;
    
    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('TextureModule: export failed', e);
      return null;
    }
  }

  cleanup(): void {
    this.carTexture?.dispose();
    this.roadTexture?.dispose();
    this.skyTexture?.dispose();
  }
}
