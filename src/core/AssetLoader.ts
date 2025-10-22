export class AssetLoader {
  private impostorAtlas: Map<string, any> = new Map();
  constructor() {}
  registerImpostorAtlas(typeKey: string, info: any) { this.impostorAtlas.set(typeKey, info); }
  getImpostorAtlas(typeKey: string) { return this.impostorAtlas.get(typeKey); }

  // loadTexture: attempt to use THREE.TextureLoader if available (in browser). In test/node env, return a 1x1 white DataTexture.
  async loadTexture(url: string): Promise<any> {
    try {
      // dynamic require of three to access loaders if running in environment with DOM
      const THREE = require('three');
      if ((THREE as any).TextureLoader) {
        return await new Promise((res, rej) => {
          const tl = new (THREE as any).TextureLoader();
          tl.load(url, (t: any) => { res(t); }, undefined, (err: any) => { res(new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1,THREE.RGBAFormat)); });
        });
      }
    } catch (e) {
      // ignore
    }
    // fallback 1x1 white texture
    try {
      const THREE = require('three');
      const dt = new THREE.DataTexture(new Uint8Array([255,255,255,255]), 1, 1, THREE.RGBAFormat);
      dt.needsUpdate = true;
      return dt;
    } catch (e) {
      return null;
    }
  }

  async loadModel(path: string) { return null; }
}
