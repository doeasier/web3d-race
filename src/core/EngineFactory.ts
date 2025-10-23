import * as THREE from 'three';
import { ResourceManager } from './ResourceManager';
import { LevelManager } from './LevelManager';
import { validateLevelJson } from './LevelConfig';

export type LoadLevelContext = {
 scene: THREE.Scene;
 vehicle?: any; // IVehicleController-like
 carMeshRef?: { value: any } | null; // optional holder for car mesh
 gltfLoader?: any; // GLTFLoaderWrapper compatible
 assetLoader?: any;
 spawner?: any;
};

export type LoadLevelResult = {
 levelJson?: any;
 sceneAsset?: any | null;
 errors: string[];
 warnings: string[];
 partial: boolean; // true if any errors occurred but partial assets may have been loaded
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
 // Now returns detailed errors/warnings and partial flag instead of throwing on validation failures.
 async loadAndApplyLevel(levelUrl: string, ctx: LoadLevelContext): Promise<LoadLevelResult> {
 const { scene, vehicle, carMeshRef, gltfLoader, assetLoader, spawner } = ctx;
 const errors: string[] = [];
 const warnings: string[] = [];
 let lvl: any = null;
 let sceneAsset: any | null = null;

 try {
 // load raw level JSON first
 lvl = await this.resourceManager.loadJson(levelUrl);
 } catch (e: any) {
 throw new Error(`Failed to load level JSON ${levelUrl}: ${e?.message ?? e}`);
 }

 // validate and collect warnings/errors but continue to attempt loading referenced assets
 try {
 const vr = validateLevelJson(lvl);
 if (!vr.valid) errors.push(...vr.errors);
 if (vr.warnings && vr.warnings.length) warnings.push(...vr.warnings);
 } catch (e: any) {
 // unexpected validation failure
 warnings.push(`Level validation threw: ${e?.message ?? String(e)}`);
 }

 // attempt to load scene asset if available
 if (lvl && lvl.sceneUrl) {
 try {
 sceneAsset = await this.resourceManager.loadGLTF(lvl.sceneUrl);
 const gltf = sceneAsset;
 const model = gltf && gltf.scene ? gltf.scene : gltf;
 if (carMeshRef) {
 try { if (carMeshRef.value) scene.remove(carMeshRef.value); } catch (e) {}
 carMeshRef.value = model;
 try { scene.add(model); } catch (e) {}
 }
 } catch (e: any) {
 errors.push(`Failed to load scene ${lvl.sceneUrl}: ${e?.message ?? e}`);
 }
 }

 // position vehicle at start if provided
 try {
 if (vehicle && lvl?.startPositions && lvl.startPositions[0]) {
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
 } catch (e) {
 warnings.push(`Failed to position vehicle from level data: ${e?.message ?? e}`);
 }

 // load baked scenery via spawner if provided
 try {
 if (lvl && lvl.bakedSceneryUrl && spawner && typeof spawner.loadBakedFromUrl === 'function') {
 await spawner.loadBakedFromUrl(lvl.bakedSceneryUrl, this.resourceManager);
 }
 } catch (e: any) {
 warnings.push(`Failed to load baked scenery ${lvl?.bakedSceneryUrl}: ${e?.message ?? e}`);
 }

 const partial = errors.length >0;
 return { levelJson: lvl, sceneAsset, errors, warnings, partial };
 }
}
