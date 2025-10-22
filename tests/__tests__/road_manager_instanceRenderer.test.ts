import { describe, it, expect, vi } from 'vitest';
import { RoadManager } from '../../src/world/RoadManager';
import { RoadsideSpawner } from '../../src/world/RoadsideSpawner';

describe('RoadManager InstanceRenderer integration', () => {
  it('uses InstanceRenderer when flag enabled and spawner provides descriptors', () => {
    const rm = new RoadManager({ segmentLength: 10, numSegments: 4, textureRepeatY: 2, scrollFactor: 0.5, roadOffset: 0 }, 6);
    const sp = new RoadsideSpawner(undefined, undefined, { segmentLength: 10, numSegments: 4 });
    // baked descriptors within window around vehicleZ=0
    sp.loadBaked([
      { id: 't1', type: 'tree', z: 0, lateral: -2, y: 0, rotY: 0, scale: 1, interactive: false },
      { id: 'l1', type: 'lamp:left', z: 5, lateral: -1, y: 1, rotY: 0, scale: 1, interactive: false },
      { id: 'l2', type: 'lamp:right', z: 5, lateral: 1, y: 1, rotY: 0, scale: 1, interactive: false }
    ]);

    rm.setSpawner(sp);

    const mockRenderer = {
      init: vi.fn(),
      setInstances: vi.fn(),
      update: vi.fn(),
      dispose: vi.fn()
    } as any;

    rm.setEnvironmentRenderer(mockRenderer);
    rm.setUseInstanceRenderer(true);

    rm.init(null, null);
    // call update at vehicleZ=0
    rm.update(0, 0, 0.016);

    expect(mockRenderer.setInstances).toHaveBeenCalled();
    // collect types passed
    const calledTypes = mockRenderer.setInstances.mock.calls.map(c => c[0]).sort();
    expect(calledTypes).toEqual(['lamp:left','lamp:right','tree'].sort());
  });
});
