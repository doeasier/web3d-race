export type ValidationResult = {
 valid: boolean;
 errors: string[];
 warnings: string[];
};

export function validateLevelJson(level: any): ValidationResult {
 const errors: string[] = [];
 const warnings: string[] = [];

 if (typeof level !== 'object' || level === null) {
 return { valid: false, errors: ['level must be an object'], warnings };
 }

 // required: sceneUrl
 if (!level.sceneUrl || typeof level.sceneUrl !== 'string') {
 errors.push('missing or invalid field: sceneUrl (string)');
 }

 // required: startPositions (array of positions)
 if (!Array.isArray(level.startPositions)) {
 errors.push('missing or invalid field: startPositions (array)');
 } else {
 // each start position can be object {x,y,z} or array [x,y,z]
 for (let i =0; i < level.startPositions.length; i++) {
 const p = level.startPositions[i];
 if (Array.isArray(p)) {
 if (p.length <3 || p.some((v: any) => typeof v !== 'number')) {
 errors.push(`startPositions[${i}] must be [x,y,z] numbers`);
 }
 } else if (typeof p === 'object' && p !== null) {
 if (typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') {
 errors.push(`startPositions[${i}] must have numeric x,y,z`);
 }
 } else {
 errors.push(`startPositions[${i}] invalid format`);
 }
 }
 }

 // required: checkpoints (array)
 if (!Array.isArray(level.checkpoints)) {
 errors.push('missing or invalid field: checkpoints (array)');
 } else {
 // checkpoints should have id and position
 for (let i =0; i < level.checkpoints.length; i++) {
 const c = level.checkpoints[i];
 if (typeof c !== 'object' || c === null) {
 errors.push(`checkpoints[${i}] invalid`);
 continue;
 }
 if (!('id' in c)) {
 errors.push(`checkpoints[${i}] missing id`);
 }
 const pos = c.position;
 if (!pos) {
 errors.push(`checkpoints[${i}] missing position`);
 } else {
 if (Array.isArray(pos)) {
 if (pos.length <3 || pos.some((v: any) => typeof v !== 'number')) {
 errors.push(`checkpoints[${i}].position must be [x,y,z] numbers`);
 }
 } else if (typeof pos === 'object') {
 if (typeof pos.x !== 'number' || typeof pos.y !== 'number' || typeof pos.z !== 'number') {
 errors.push(`checkpoints[${i}].position must have numeric x,y,z`);
 }
 } else {
 errors.push(`checkpoints[${i}].position invalid`);
 }
 }
 }
 }

 // optional: performanceHints.recommendedMode accepts 'fast'|'precise'
 if (level.performanceHints && typeof level.performanceHints === 'object') {
 const rm = level.performanceHints.recommendedMode;
 if (rm !== undefined && rm !== 'fast' && rm !== 'precise') {
 warnings.push(`performanceHints.recommendedMode unknown value '${rm}', will fallback to 'fast'`);
 }
 }

 return { valid: errors.length ===0, errors, warnings };
}
