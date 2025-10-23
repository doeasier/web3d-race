import * as THREE from 'three';
import { ResourceManager } from './ResourceManager';
import { LevelManager } from './LevelManager';

export type LoadLevelContext = {
 scene: THREE.Scene;
 vehicle?: any; // IVehicleController-like
 carMeshRef?: { value: any } | null; // optional holder for car mesh
 gltfLoader?: any; // GLTFLoaderWrapper compatible
 assetLoader?: any;
 spawner?: any;
};

export class EngineFactory {
 resourceManager: ResourceManager;
 levelManager: LevelManager;

 constructor(resourceManager?: ResourceManager) {
 this.resourceManager = resourceManager ?? new ResourceManager();
 this.levelManager = new LevelManager(this.resourceManager);
 }

 // Load a level JSON and apply key parts into provided context (scene, vehicle, spawner)
 // Returns the loaded level json and any loaded scene asset (GLTF result)
 async loadAndApplyLevel(levelUrl: string, ctx: LoadLevelContext) {
 const { scene, vehicle, carMeshRef, gltfLoader, assetLoader, spawner } = ctx;
 const res = await this.levelManager.loadLevel(levelUrl);
 const lvl = res.levelJson;
 // if scene asset present, add to renderer scene
 if (res.scene) {
 const gltf = res.scene;
 const model = gltf.scene ? gltf.scene : gltf;
 // If caller provided a carMeshRef, replace its value
 if (carMeshRef) {
 try { if (carMeshRef.value) scene.remove(carMeshRef.value); } catch (e) {}
 carMeshRef.value = model;
 try { scene.add(model); } catch (e) {}
 }
 }

 // position vehicle at start if provided
 try {
 if (vehicle && lvl.startPositions && lvl.startPositions[0]) {
 const sp = lvl.startPositions[0];
 let pos = null;
 let rotY =0;
 if (Array.isArray(sp.position)) {
 pos = { x: sp.position[0], y: sp.position[1], z: sp.position[2] };
 rotY = (sp.rotation && sp.rotation[1]) ? sp.rotation[1] :0;
 } else if (typeof sp === 'object' && sp !== null) {
 if (Array.isArray(sp.position)) {
 pos = { x: sp.position[0], y: sp.position[1], z: sp.position[2] };
 rotY = (sp.rotation && sp.rotation[1]) ? sp.rotation[1] :0;
 } else if (sp.position && typeof sp.position === 'object') {
 pos = { x: sp.position.x, y: sp.position.y, z: sp.position.z };
 rotY = (sp.rotation && sp.rotation.y) ? sp.rotation.y :0;
 }
 }
 if (pos && typeof vehicle.reset === 'function') {
 try { vehicle.reset({ position: pos, rotation: { x:0, y: rotY, z:0 } }); } catch (e) {}
 }
 }
 } catch (e) {}

 // load baked scenery via spawner if provided
 try {
 if (lvl.bakedSceneryUrl && spawner && typeof spawner.loadBakedFromUrl === 'function') {
 await spawner.loadBakedFromUrl(lvl.bakedSceneryUrl, this.resourceManager);
 }
 } catch (e) {}

 return { levelJson: lvl, sceneAsset: res.scene };
 }
}
