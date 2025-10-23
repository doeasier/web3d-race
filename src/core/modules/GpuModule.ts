/**
 * GPU����ģ�飨WebGPU culling��
 */
import { InitModule } from '../InitializationManager';
import GpuCuller from '../../world/GpuCuller';
import WebGpuCuller from '../../world/WebGpuCuller';

export class GpuModule implements InitModule {
  name = 'gpu';
  phase: 'pending' | 'initializing' | 'ready' | 'error' = 'pending';

  isWebGpuAvailable = false;
  adapterInfo: any = null;

  async init(): Promise<void> {
try {
  this.isWebGpuAvailable = await GpuCuller.isWebGpuSupported();

    if (this.isWebGpuAvailable) {
        // �ռ�adapter��Ϣ
        try {
 const adapter = (WebGpuCuller as any).adapter;
          const device = (WebGpuCuller as any).device;
          const features = adapter ? Array.from((adapter as any).features || []) : [];
          const limits = adapter ? (adapter as any).limits || {} : {};
          this.adapterInfo = {
            adapter: adapter ? (adapter as any).info || null : null,
    features,
   limits,
            device: !!device
};
        } catch (e) {
          console.warn('GpuModule: failed to read adapter details', e);
        }
        console.log('GpuModule: WebGPU available');
      } else {
        console.log('GpuModule: WebGPU not available, using fallback');
    }
    } catch (e) {
      console.warn('GpuModule: initialization error (non-fatal)', e);
      // GPUģ��ʧ�ܲ���ֹӦ������
    }
  }

  /**
   * ��ȡadapter��Ϣ��JSON�ַ���
   */
  getAdapterInfoJson(): string {
return JSON.stringify(this.adapterInfo || {}, null, 2);
  }

  cleanup(): void {
    // GPU��Դͨ�������������
  }
}
