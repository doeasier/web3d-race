import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RoadManager } from '../../src/world/RoadManager';
import { RoadsideSpawner } from '../../src/world/RoadsideSpawner';
import GpuCuller from '../../src/world/GpuCuller';

describe('RoadManager GPU cull integration', () => {
 beforeEach(() => {
 vi.restoreAllMocks();
 });

 it('applies GPU visibility when cull resolves quickly', async () => {
 const rm = new RoadManager({ segmentLength:10, numSegments:4, textureRepeatY:2, scrollFactor:0.5, roadOffset:0 },6);
 const sp = new RoadsideSpawner(undefined, undefined, { segmentLength:10, numSegments:4 });
 sp.loadBaked([
 { id: 't1', type: 'tree', z:0, lateral:0, y:0, rotY:0, scale:1, interactive: false }
 ]);
 rm.setSpawner(sp);

 const mockRenderer = {
 init: vi.fn(),
 setInstances: vi.fn(),
 setGPUVisibility: vi.fn(),
 update: vi.fn(),
 dispose: vi.fn()
 } as any;

 rm.setEnvironmentRenderer(mockRenderer);
 rm.setUseInstanceRenderer(true);

 rm.init(null, null);
 rm.update(0,0,0.016);

 vi.spyOn(GpuCuller, 'isSupported').mockReturnValue(true);
 vi.spyOn(GpuCuller, 'cullAsync').mockResolvedValue(new Set([0]));

 await rm.postPhysicsSync();

 expect(mockRenderer.setInstances).toHaveBeenCalled();
 expect(mockRenderer.setGPUVisibility).toHaveBeenCalled();
 const calledKeys = mockRenderer.setGPUVisibility.mock.calls.map(c => c[0]);
 expect(calledKeys).toContain('tree|mid');
 // find the tree call and assert its payload
 const treeCall = mockRenderer.setGPUVisibility.mock.calls.find(c => c[0] === 'tree|mid');
 expect(treeCall).toBeDefined();
 expect(treeCall[1] instanceof Set).toBe(true);
 expect(treeCall[1].has(0)).toBe(true);
 });

 it('does not block postPhysicsSync when cull is slow (times out) and later applies visibility', async () => {
 vi.useFakeTimers();
 try {
 const rm = new RoadManager({ segmentLength:10, numSegments:4, textureRepeatY:2, scrollFactor:0.5, roadOffset:0 },6);
 const sp = new RoadsideSpawner(undefined, undefined, { segmentLength:10, numSegments:4 });
 sp.loadBaked([
 { id: 't1', type: 'tree', z:0, lateral:0, y:0, rotY:0, scale:1, interactive: false }
 ]);
 rm.setSpawner(sp);

 const mockRenderer = {
 init: vi.fn(),
 setInstances: vi.fn(),
 setGPUVisibility: vi.fn(),
 update: vi.fn(),
 dispose: vi.fn()
 } as any;

 rm.setEnvironmentRenderer(mockRenderer);
 rm.setUseInstanceRenderer(true);

 rm.init(null, null);
 rm.update(0,0,0.016);

 vi.spyOn(GpuCuller, 'isSupported').mockReturnValue(true);
 // slow cull: resolves after50ms
 vi.spyOn(GpuCuller, 'cullAsync').mockImplementation(() => {
 return new Promise<Set<number>>(resolve => setTimeout(() => resolve(new Set([0])),50));
 });

 const p = rm.postPhysicsSync();
 // advance timers less than timeout (16ms) so postPhysicsSync should complete
 await vi.advanceTimersByTimeAsync(20);
 await p; // should have returned due to timeout

 // GPU visibility should not yet have been applied during postPhysicsSync
 expect(mockRenderer.setGPUVisibility).not.toHaveBeenCalled();

 // advance timers so the cull resolves
 await vi.advanceTimersByTimeAsync(50);
 // flush microtasks
 await Promise.resolve();

 // now GPU visibility should have been applied (async resolution writes to renderer)
 expect(mockRenderer.setGPUVisibility).toHaveBeenCalled();

 } finally {
 vi.useRealTimers();
 }
 });
});
