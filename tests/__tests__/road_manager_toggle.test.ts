import { describe, it, expect, vi } from 'vitest';
import { RoadManager } from '../../src/world/RoadManager';
import { RoadsideSpawner } from '../../src/world/RoadsideSpawner';

describe('RoadManager InstanceRenderer toggle', () => {
 it('does not call InstanceRenderer when useInstanceRenderer is false', () => {
 const rm = new RoadManager({ segmentLength:10, numSegments:4, textureRepeatY:2, scrollFactor:0.5, roadOffset:0 },6);
 const sp = new RoadsideSpawner(undefined, undefined, { segmentLength:10, numSegments:4 });
 sp.loadBaked([
 { id: 't1', type: 'tree', z:0, lateral: -2, y:0, rotY:0, scale:1, interactive: false }
 ]);

 rm.setSpawner(sp);

 const mockRenderer = {
 init: vi.fn(),
 setInstances: vi.fn(),
 update: vi.fn(),
 dispose: vi.fn()
 } as any;

 rm.setEnvironmentRenderer(mockRenderer);
 rm.setUseInstanceRenderer(false);

 rm.init(null, null);
 rm.update(0,0,0.016);
 try { rm.postPhysicsSync(); } catch (e) {}

 expect(mockRenderer.setInstances).not.toHaveBeenCalled();
 });
});
