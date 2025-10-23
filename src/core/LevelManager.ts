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
 const loadedUrls: string[] = [];
 let scene: any = null;
 let collision: any = null;

 try {
 // load level JSON
 const lvl = await this.resourceManager.loadJson(url);
 loadedUrls.push(url);

 const vr = validateLevelJson(lvl);
 if (!vr.valid) {
 const err = new Error('Level JSON validation failed: ' + vr.errors.join('; '));
 (err as any).validation = vr;
 throw err;
 }

 // load scene GLTF if present
 if (lvl.sceneUrl) {
 scene = await this.resourceManager.loadGLTF(lvl.sceneUrl);
 loadedUrls.push(lvl.sceneUrl);
 }

 // load optional collision data
 if (lvl.collisionUrl) {
 collision = await this.resourceManager.loadJson(lvl.collisionUrl);
 loadedUrls.push(lvl.collisionUrl);
 }

 return { scene, collision, levelJson: lvl };
 } catch (e) {
 // rollback: unload any resources that were already loaded by this call
 for (const u of loadedUrls) {
 try {
 this.resourceManager.unload(u);
 } catch (_err) {
 // ignore unload errors
 }
 }
 throw e;
 }
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
