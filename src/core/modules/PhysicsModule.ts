/**
 * 物理系统模块
 */
import { InitModule } from '../InitializationManager';
import { RapierPhysicsWorldImpl } from '../../gameplay/RapierPhysicsWorldImpl';
import { FakePhysicsWorld } from '../../gameplay/FakePhysicsWorld';

export type PhysicsBackend = 'rapier' | 'fake';

export class PhysicsModule implements InitModule {
  name = 'physics';
  phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';

  physicsWorld: any = null;
  private backend: PhysicsBackend;

  constructor(backend: PhysicsBackend = 'rapier') {
    this.backend = backend;
  }

  async init(): Promise<void> {
    if (this.backend === 'rapier') {
      try {
        this.physicsWorld = new RapierPhysicsWorldImpl();
        console.log('PhysicsModule: initialized with Rapier');
  } catch (e) {
        console.warn('PhysicsModule: Rapier init failed, falling back to FakePhysicsWorld', e);
        this.physicsWorld = new FakePhysicsWorld();
      }
    } else {
      this.physicsWorld = new FakePhysicsWorld();
      console.log('PhysicsModule: initialized with FakePhysicsWorld');
  }
  }

  /**
   * 运行时切换物理后端
   */
  async switchBackend(backend: PhysicsBackend, preserveState?: any): Promise<void> {
    const prevWorld = this.physicsWorld;
    this.backend = backend;

    try {
      await this.init();
  // 如果提供了状态，尝试恢复
    if (preserveState && typeof this.physicsWorld.setState === 'function') {
        this.physicsWorld.setState(preserveState);
      }
    } catch (e) {
      console.error('PhysicsModule: backend switch failed', e);
      this.physicsWorld = prevWorld; // 回滚
      throw e;
    }
  }

  cleanup(): void {
    if (this.physicsWorld && typeof this.physicsWorld.dispose === 'function') {
      this.physicsWorld.dispose();
    }
  }
}
