import { LevelManager } from '../../src/core/LevelManager';

class FakeResourceManager {
 cache = new Map<string, any>();
 unloadCalls: string[] = [];
 failLoadGLTF = false;
 failCollision = false;

 constructor(opts?: { failLoadGLTF?: boolean; failCollision?: boolean }) {
 if (opts) {
 this.failLoadGLTF = !!opts.failLoadGLTF;
 this.failCollision = !!opts.failCollision;
 }
 }

 async loadJson(url: string) {
 // simulate level json or collision
 if (url === 'level://test') {
 const lvl = {
 sceneUrl: 'gltf://scene1',
 startPositions: [{ x:0, y:0, z:0 }],
 checkpoints: [{ id: 'cp1', position: [1,0,0] }],
 };
 this.cache.set(url, lvl);
 return lvl;
 }
 if (url === 'collision://fail') {
 if (this.failCollision) throw new Error('collision load failed');
 const c = { collision: true };
 this.cache.set(url, c);
 return c;
 }
 // generic
 const obj = { url };
 this.cache.set(url, obj);
 return obj;
 }

 async loadGLTF(url: string) {
 if (this.failLoadGLTF) throw new Error('gltf load failed');
 const asset = { gltf: url };
 this.cache.set(url, asset);
 return asset;
 }

 unload(url: string) {
 this.unloadCalls.push(url);
 this.cache.delete(url);
 }
}

describe('LevelManager rollback on failure', () => {
 test('unloads level json if scene load fails', async () => {
 const fake = new FakeResourceManager({ failLoadGLTF: true });
 const lm = new LevelManager(fake as any);

 await expect(lm.loadLevel('level://test')).rejects.toThrow(/gltf load failed/);
 // level json should have been unloaded
 expect(fake.unloadCalls).toContain('level://test');
 // scene should not remain in cache
 expect(fake.cache.has('gltf://scene1')).toBe(false);
 });

 test('unloads level and scene if collision load fails', async () => {
 // prepare fake that fails collision load
 const fake = new FakeResourceManager({ failCollision: true });
 const lm = new LevelManager(fake as any);

 // make level.json point to a collision url
 // override loadJson to return level with collisionUrl
 fake.loadJson = async (url: string) => {
 if (url === 'level://with-collision') {
 const lvl = {
 sceneUrl: 'gltf://sceneX',
 collisionUrl: 'collision://fail',
 startPositions: [{ x:0, y:0, z:0 }],
 checkpoints: [{ id: 'cp1', position: [1,0,0] }],
 };
 fake.cache.set(url, lvl);
 return lvl;
 }
 return FakeResourceManager.prototype.loadJson.call(fake, url);
 };

 // ensure loadGLTF succeeds for scene
 fake.failLoadGLTF = false;

 await expect(lm.loadLevel('level://with-collision')).rejects.toThrow(/collision load failed/);
 // ensure both level and scene were unloaded
 expect(fake.unloadCalls).toContain('level://with-collision');
 expect(fake.unloadCalls).toContain('gltf://sceneX');
 // caches cleared
 expect(fake.cache.has('level://with-collision')).toBe(false);
 expect(fake.cache.has('gltf://sceneX')).toBe(false);
 });
});
