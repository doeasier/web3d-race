import { GLTFLoaderWrapper } from './GLTFLoaderWrapper';

export class ResourceManager {
  cache = new Map<string, any>();
  private inFlight = new Map<string, Promise<any>>();
  private gltfLoader = new GLTFLoaderWrapper();

  async loadJson(url: string) {
    if (this.cache.has(url)) return this.cache.get(url);
    if (this.inFlight.has(url)) return this.inFlight.get(url);

    const p = (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
      const j = await res.json();
      this.cache.set(url, j);
      this.inFlight.delete(url);
      return j;
    })();

    this.inFlight.set(url, p);
    try {
      return await p;
    } catch (e) {
      this.inFlight.delete(url);
      throw e;
    }
  }

  async loadGLTF(url: string) {
    if (this.cache.has(url)) return this.cache.get(url);
    if (this.inFlight.has(url)) return this.inFlight.get(url);

    const p = (async () => {
      try {
        const asset = await this.gltfLoader.load(url);
        this.cache.set(url, asset);
        return asset;
      } finally {
        this.inFlight.delete(url);
      }
    })();

    this.inFlight.set(url, p);
    return p;
  }

  unload(url: string) {
    // remove from cache; consumers should dispose three.js objects if needed
    if (this.cache.has(url)) this.cache.delete(url);
    if (this.inFlight.has(url)) this.inFlight.delete(url);
  }

  // Impostor atlas registry helpers
  private _atlasRegistry: Map<string, any> = new Map();
  registerAtlas(key: string, info: any) { this._atlasRegistry.set(key, info); }
  getAtlas(key: string) { return this._atlasRegistry.get(key); }

  // load an atlas list JSON (array or map) and register entries
  async loadAtlasList(url: string) {
    try {
      const list = await this.loadJson(url);
      if (Array.isArray(list)) {
        for (const a of list) {
          if (a.key) this.registerAtlas(a.key, a);
        }
      } else if (typeof list === 'object' && list !== null) {
        for (const k of Object.keys(list)) {
          const a = list[k];
          this.registerAtlas(k, a);
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }
}
