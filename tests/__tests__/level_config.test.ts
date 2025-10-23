import { validateLevelJson } from '../../src/core/LevelConfig';

describe('level config validation', () => {
 test('valid level passes', () => {
 const lvl = {
 sceneUrl: 'assets/scene.glb',
 startPositions: [{ x:0, y:0, z:0 }],
 checkpoints: [{ id: 'cp1', position: [1,0,0] }],
 };
 const r = validateLevelJson(lvl);
 expect(r.valid).toBe(true);
 expect(r.errors.length).toBe(0);
 });

 test('missing fields fail', () => {
 const r = validateLevelJson({});
 expect(r.valid).toBe(false);
 expect(r.errors.length).toBeGreaterThan(0);
 });

 test('invalid recommendedMode warns', () => {
 const lvl = {
 sceneUrl: 'a',
 startPositions: [{ x:0, y:0, z:0 }],
 checkpoints: [{ id: 'cp1', position: [1,0,0] }],
 performanceHints: { recommendedMode: 'ultra' }
 };
 const r = validateLevelJson(lvl);
 expect(r.valid).toBe(true);
 expect(r.warnings.length).toBeGreaterThan(0);
 });
});
