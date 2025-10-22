import * as THREE from 'three';

export type RoadPresetParams = {
  length?: number; // total length in meters
  density?: number; // number of control points
  amplitude?: number; // lateral amplitude for S curves
  radius?: number; // turn radius for hairpin
};

export function generatePreset(preset: string, params?: RoadPresetParams): { x: number; z: number }[] {
  const p = { length: 600, density: 8, amplitude: 4, radius: 20, ...(params || {}) };
  const pts: { x: number; z: number }[] = [];

  if (preset === 'straight') {
    const step = p.length / (p.density - 1);
    for (let i = 0; i < p.density; i++) pts.push({ x: 0, z: i * step });
    return pts;
  }

  if (preset === 'gentleS') {
    const step = p.length / (p.density - 1);
    for (let i = 0; i < p.density; i++) {
      const z = i * step;
      const x = p.amplitude * Math.sin((z / p.length) * Math.PI * 2 * 1);
      pts.push({ x, z });
    }
    return pts;
  }

  if (preset === 'hairpin') {
    // create points that form a semicircle turn in middle
    const mid = p.length / 2;
    const before = mid - p.radius * 1.5;
    const after = mid + p.radius * 1.5;
    pts.push({ x: 0, z: 0 });
    pts.push({ x: 0, z: before });
    // semi-circle around center at (p.radius, mid)
    const segments = Math.max(3, Math.floor(p.density / 3));
    for (let i = 0; i <= segments; i++) {
      const theta = Math.PI * (i / segments); // 0..PI
      const x = p.radius * Math.cos(theta); // from +radius to -radius
      const z = mid + p.radius * Math.sin(theta) - p.radius; // shift so center aligns
      pts.push({ x: x - p.radius, z });
    }
    pts.push({ x: 0, z: after });
    pts.push({ x: 0, z: p.length });
    return pts;
  }

  if (preset === 'highway') {
    // series of gentle turns with varying amplitude
    const step = p.length / (p.density - 1);
    for (let i = 0; i < p.density; i++) {
      const z = i * step;
      const freq = 0.5 + ((i % 3) * 0.3);
      const amp = p.amplitude * (1 + 0.3 * Math.sin(i));
      const x = amp * Math.sin((z / p.length) * Math.PI * 2 * freq);
      pts.push({ x, z });
    }
    return pts;
  }

  // default fallback: straight
  return generatePreset('straight', p);
}
