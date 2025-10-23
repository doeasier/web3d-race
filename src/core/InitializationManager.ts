/**
 * InitializationManager - ���й���Ӧ�ó�ʼ������
 * 
 * ���ԭ��
 * - ģ�黯��ÿ����ϵͳ������ʼ��
 * - �첽�Ѻã�֧���첽��ʼ������������
 * - �¼�������ͨ���¼�֪ͨ��ʼ��״̬
 * - ����ָ����ṩ���Ž����ʹ�����
 */

export type InitPhase = 'pending' | 'initializing' | 'ready' | 'error';

export interface InitModule {
  name: string;
  phase: InitPhase;
  dependencies?: string[];
  init(): Promise<void>;
  cleanup?(): void;
}

export interface InitEvent {
  module: string;
  phase: InitPhase;
  error?: Error;
  timestamp: number;
}

export class InitializationManager {
  private modules = new Map<string, InitModule>();
  private states = new Map<string, InitPhase>();
  private listeners: Array<(event: InitEvent) => void> = [];
  private errors = new Map<string, Error>();

  /**
   * ע���ʼ��ģ��
   */
  register(module: InitModule): void {
    this.modules.set(module.name, module);
    this.states.set(module.name, 'pending');
  }

  /**
   * ������ʼ���¼�
   */
  on(listener: (event: InitEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
  const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

/**
   * �����¼�
   */
  private emit(module: string, phase: InitPhase, error?: Error): void {
    const event: InitEvent = { module, phase, error, timestamp: Date.now() };
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error('InitializationManager: listener error', e);
      }
    });
  }

  /**
   * ��ȡģ��״̬
   */
  getState(moduleName: string): InitPhase {
    return this.states.get(moduleName) || 'pending';
  }

  /**
 * ��ȡ���д���
   */
  getErrors(): Map<string, Error> {
    return new Map(this.errors);
  }

  /**
   * ��������Ƿ����
   */
  private async waitForDependencies(moduleName: string): Promise<boolean> {
    const module = this.modules.get(moduleName);
    if (!module || !module.dependencies) return true;

    const maxWait = 30000; // 30�볬ʱ
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
const allReady = module.dependencies.every(dep => this.states.get(dep) === 'ready');
  if (allReady) return true;

      const anyError = module.dependencies.some(dep => this.states.get(dep) === 'error');
    if (anyError) {
        console.warn(`InitializationManager: dependency error for ${moduleName}`);
        return false;
  }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.warn(`InitializationManager: timeout waiting for dependencies of ${moduleName}`);
    return false;
  }

  /**
   * ��ʼ������ģ��
   */
  async initModule(moduleName: string): Promise<boolean> {
 const module = this.modules.get(moduleName);
    if (!module) {
      console.warn(`InitializationManager: module ${moduleName} not found`);
      return false;
    }

    const currentState = this.states.get(moduleName);
    if (currentState === 'ready') return true;
    if (currentState === 'initializing') {
      // �ȴ����ڽ��еĳ�ʼ��
      const maxWait = 30000;
      const startTime = Date.now();
  while (this.states.get(moduleName) === 'initializing' && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 50));
      }
      return this.states.get(moduleName) === 'ready';
    }

try {
      this.states.set(moduleName, 'initializing');
      this.emit(moduleName, 'initializing');

  // �ȴ�����
      const depsReady = await this.waitForDependencies(moduleName);
      if (!depsReady) {
        throw new Error(`Dependencies not ready for ${moduleName}`);
      }

      await module.init();

    this.states.set(moduleName, 'ready');
      this.emit(moduleName, 'ready');
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errors.set(moduleName, err);
      this.states.set(moduleName, 'error');
      this.emit(moduleName, 'error', err);
      console.error(`InitializationManager: failed to init ${moduleName}`, err);
    return false;
    }
  }

  /**
   * ��ʼ������ģ�飨������˳��
   */
  async initAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const toInit = Array.from(this.modules.keys());

    // ����������
    const sorted: string[] = [];
    const visited = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);
      const module = this.modules.get(name);
      if (module?.dependencies) {
        module.dependencies.forEach(dep => {
          if (this.modules.has(dep)) visit(dep);
        });
    }
      sorted.push(name);
    };

    toInit.forEach(visit);

    // ��˳���ʼ��
    for (const name of sorted) {
      results.set(name, await this.initModule(name));
    }

    return results;
  }

  /**
   * ��������ģ��
   */
  cleanup(): void {
    this.modules.forEach(module => {
      try {
  module.cleanup?.();
      } catch (e) {
        console.error(`InitializationManager: cleanup error for ${module.name}`, e);
      }
    });
    this.modules.clear();
    this.states.clear();
    this.errors.clear();
    this.listeners.length = 0;
  }
}

export default new InitializationManager();
