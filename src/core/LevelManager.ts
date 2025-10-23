import { ResourceManager } from './ResourceManager';
import { validateLevelJson } from './LevelConfig';

export type LevelLoadResult = {
 scene: any | null;
 collision: any | null;
 levelJson: any;
};

export class LevelManager {
 resourceManager: ResourceManager;

 constructor(resourceManager?: ResourceManager) {
 this.resourceManager = resourceManager ?? new ResourceManager();
 }

 async loadLevel(url: string): Promise<LevelLoadResult> {
 // load level JSON
 const lvl = await this.resourceManager.loadJson(url);
 const vr = validateLevelJson(lvl);
 if (!vr.valid) {
 const err = new Error('Level JSON validation failed: ' + vr.errors.join('; '));
 // attach details for caller
 (err as any).validation = vr;
 throw err;
 }

 // load scene GLTF if present
 let scene: any = null;
 if (lvl.sceneUrl) {
 scene = await this.resourceManager.loadGLTF(lvl.sceneUrl).catch((e) => {
 throw new Error(`Failed to load scene ${lvl.sceneUrl}: ${e.message || e}`);
 });
 }

 // load optional collision data
 let collision: any = null;
 if (lvl.collisionUrl) {
 collision = await this.resourceManager.loadJson(lvl.collisionUrl).catch((e) => {
 throw new Error(`Failed to load collision ${lvl.collisionUrl}: ${e.message || e}`);
 });
 }

 return { scene, collision, levelJson: lvl };
 }

 async unloadLevel(url: string) {
 // unload resources referenced by level
 try {
 const lvl = await this.resourceManager.loadJson(url);
 if (lvl.sceneUrl) this.resourceManager.unload(lvl.sceneUrl);
 if (lvl.collisionUrl) this.resourceManager.unload(lvl.collisionUrl);
 this.resourceManager.unload(url);
 } catch (e) {
 // ignore unload errors
 }
 }
}
