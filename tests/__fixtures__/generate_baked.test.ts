import { exportFromPreset } from '../../src/world/BakedExporter';
import * as fs from 'fs';

describe('baked exporter', () => {
  it('exports a baked JSON file', async () => {
    const out = 'tests/fixtures/sample_baked.json';
    try { if (fs.existsSync(out)) fs.unlinkSync(out); } catch(e) {}
    await exportFromPreset({ id: 'test', densityPerSegment: 3, spawnerDefaults: { seed: 42 } }, undefined, out, { seed: 42, segmentLength: 10, numSegments: 4 });
    expect(fs.existsSync(out)).toBe(true);
    const txt = fs.readFileSync(out, 'utf8');
    const obj = JSON.parse(txt);
    expect(Array.isArray(obj.objects)).toBe(true);
    // cleanup
    try { fs.unlinkSync(out); } catch (e) {}
  });
});
