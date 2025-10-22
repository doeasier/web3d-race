import { RoadsideSpawner } from './RoadsideSpawner';
import * as fs from 'fs';

export function exportBakedScenery(spawner: RoadsideSpawner, outPath: string) {
  if (!spawner) throw new Error('spawner required');
  const descs = spawner.getActiveDescs();
  const payload = { generatedAt: new Date().toISOString(), count: descs.length, objects: descs };
  fs.mkdirSync(require('path').dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return outPath;
}

export async function exportFromPreset(preset: any, rules: any[]|undefined, outPath: string, opts?: any) {
  const sp = new RoadsideSpawner(preset, rules, { seed: opts?.seed, segmentLength: opts?.segmentLength, numSegments: opts?.numSegments });
  // generate window around 0
  sp.update(0);
  return exportBakedScenery(sp, outPath);
}
