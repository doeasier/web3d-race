export class ResourceManager {
  cache = new Map<string, any>();

  async loadJson(url: string) {
    if (this.cache.has(url)) return this.cache.get(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    const j = await res.json();
    this.cache.set(url, j);
    return j;
  }

  async loadGLTF(url: string) {
    if (this.cache.has(url)) return this.cache.get(url);
    // lightweight stub: return URL as loaded asset placeholder
    const asset = { url };
    this.cache.set(url, asset);
    return asset;
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
