/**
 * 场景模块 - 管理场景对象（天空、地面等）
 */
import * as THREE from 'three';
import { InitModule } from '../InitializationManager';

export class SceneModule implements InitModule {
  name = 'scene';
  phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';
  dependencies = ['render', 'textures'];

  skybox?: THREE.Mesh;
  ground?: THREE.Mesh;
  carMesh?: THREE.Mesh;

  private scene: THREE.Scene;
  private carTexture: THREE.Texture;
  private skyTexture: THREE.Texture;

  constructor(scene: THREE.Scene, carTexture: THREE.Texture, skyTexture: THREE.Texture) {
    this.scene = scene;
    this.carTexture = carTexture;
    this.skyTexture = skyTexture;
  }

  async init(): Promise<void> {
    // 创建天空盒
    const skyGeo = new THREE.SphereGeometry(400, 16, 12);
    const skyMat = new THREE.MeshBasicMaterial({ 
      map: this.skyTexture, 
      side: THREE.BackSide 
    });
    this.skybox = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skybox);

    // 创建地面
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2b7a2b });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.01;
    this.ground.position.z = 0;
    this.scene.add(this.ground);

    // 创建占位车辆网格
    const placeholderCarGeo = new THREE.BoxGeometry(1.8, 0.5, 4);
    const placeholderCarMat = new THREE.MeshStandardMaterial({ 
      map: this.carTexture, 
      metalness: 0.2, 
      roughness: 0.4 
 });
    this.carMesh = new THREE.Mesh(placeholderCarGeo, placeholderCarMat);
this.carMesh.position.y = 0.25;
    this.carMesh.position.z = 0;
    this.scene.add(this.carMesh);

    console.log('SceneModule: initialized');
  }

  /**
   * 替换车辆模型
   */
  replaceCarMesh(newMesh: THREE.Object3D): void {
    if (this.carMesh) {
      this.scene.remove(this.carMesh);
      this.carMesh.geometry.dispose();
      if (Array.isArray(this.carMesh.material)) {
        this.carMesh.material.forEach(m => m.dispose());
    } else {
        this.carMesh.material.dispose();
  }
    }
    
 this.carMesh = newMesh as THREE.Mesh;
    this.scene.add(newMesh);
  }

  /**
   * 辅助方法：调整加载的模型到车辆尺寸
   */
  fitModelToVehicle(obj: THREE.Object3D, target = { length: 4, width: 1.8, height: 0.8 }): void {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
  box.getSize(size);
    
    if (size.x === 0 || size.y === 0 || size.z === 0) return;

    // determine scale factor
    const scaleX = target.width / size.x;
    const scaleZ = target.length / size.z;
  const scale = Math.min(scaleX, scaleZ);
    obj.scale.setScalar(scale);

    // recompute bbox after scale
    const box2 = new THREE.Box3().setFromObject(obj);
    const size2 = new THREE.Vector3();
    box2.getSize(size2);

    // rotate so longest axis aligns with Z (forward)
    const dims = [
    { k: 'x', v: size2.x },
      { k: 'y', v: size2.y },
   { k: 'z', v: size2.z }
    ];
    dims.sort((a, b) => b.v - a.v);
  
    if (dims[0].k === 'x') {
      obj.rotateY(-Math.PI / 2);
    }

    // place bottom on ground
    const box3 = new THREE.Box3().setFromObject(obj);
    const min = box3.min;
    const oy = min.y;
    obj.position.y += (0.25 - oy);
  }

  cleanup(): void {
    if (this.skybox) {
      this.scene.remove(this.skybox);
      this.skybox.geometry.dispose();
      (this.skybox.material as THREE.Material).dispose();
    }
    
    if (this.ground) {
    this.scene.remove(this.ground);
      this.ground.geometry.dispose();
      (this.ground.material as THREE.Material).dispose();
    }
    
    if (this.carMesh) {
      this.scene.remove(this.carMesh);
      this.carMesh.geometry.dispose();
 if (Array.isArray(this.carMesh.material)) {
   this.carMesh.material.forEach(m => m.dispose());
      } else {
        this.carMesh.material.dispose();
    }
    }
  }
}
