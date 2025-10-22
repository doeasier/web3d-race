import { RoadObjectDesc } from './RoadsideSpawner';

// Group RoadObjectDesc by their type string
export function groupByType(descs: RoadObjectDesc[]): Record<string, RoadObjectDesc[]> {
  const map: Record<string, RoadObjectDesc[]> = {};
  for (const d of descs) {
    const t = d.type || 'unknown';
    if (!map[t]) map[t] = [];
    map[t].push(d);
  }
  return map;
}
