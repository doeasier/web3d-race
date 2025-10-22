import { describe, it, expect } from 'vitest';
import { RoadManager } from '../../src/world/RoadManager';
import { RoadsideSpawner } from '../../src/world/RoadsideSpawner';

class MockPA {
  ensures: any[] = [];
  removes: string[] = [];
  ensure(d:any) { this.ensures.push(d); return 1; }
  remove(id:string) { this.removes.push(id); }
}

describe('PhysicsAdapter lifecycle', () => {
  it('registers interactive objects when they enter window and removes when leave', () => {
    const rm = new RoadManager({ segmentLength: 10, numSegments: 4, textureRepeatY:2, scrollFactor:0.5, roadOffset:0 }, 6);
    const sp = new RoadsideSpawner(undefined, undefined, { segmentLength: 10, numSegments: 4 });
    sp.loadBaked([
      { id: 'i1', type: 'crate', z: 5, lateral:0, y:0, rotY:0, scale:1, interactive:true },
      { id: 'i2', type: 'crate', z: 200, lateral:0, y:0, rotY:0, scale:1, interactive:true }
    ]);
    rm.setSpawner(sp);
    const pa = new MockPA();
    rm.setPhysicsAdapter(pa);
    rm.init(null, null);
    // initial update at vehicleZ=0 should register i1
    rm.update(0,0,0.016);
    expect(pa.ensures.find((d:any)=>d.id==='i1')).toBeDefined();
    // move vehicle forward so i1 leaves window and i2 enters window
    rm.update(200,0,0.016);
    expect(pa.removes).toContain('i1');
    expect(pa.ensures.find((d:any)=>d.id==='i2')).toBeDefined();
  });
});
