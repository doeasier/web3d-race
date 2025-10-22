import * as THREE from 'three';
import { VehicleProfile } from './VehicleProfile';

export type VehicleStateSimple = {
  speed: number;
  throttle?: number;
  brakePressure?: number;
  steer?: number;
  rpm?: number;
};

export class AnimationController {
  mixer: any = null;
  actions: Record<string, any | null> = {};
  root: any | null = null;
  profile: VehicleProfile | null = null;

  // smoothing state
  private _weights: Record<string, number> = {};

  constructor(root: any | null, clips: any[] | null, profile?: VehicleProfile) {
    this.root = root;
    this.profile = profile || null;
    if (root && clips && clips.length > 0) {
      try {
        this.mixer = new THREE.AnimationMixer(root);
        // build actions map keyed by clip.name
        for (const clip of clips) {
          try {
            const action = this.mixer.clipAction(clip);
            action.enabled = true;
            action.loop = THREE.LoopRepeat;
            action.clampWhenFinished = false;
            action.play(); // keep playing but weight will be controlled
            this.actions[clip.name] = action;
            this._weights[clip.name] = 0;
          } catch (e) {
            // ignore individual clip failures
            console.warn('Failed to create action for clip', clip.name, e);
            this.actions[clip.name] = null;
            this._weights[clip.name] = 0;
          }
        }
      } catch (e) {
        console.warn('Failed to create AnimationMixer', e);
        this.mixer = null;
      }
    }
  }

  dispose() {
    if (this.mixer) {
      try { this.mixer.stopAllAction(); } catch (e) {}
      try { this.mixer.uncacheRoot(this.root as any); } catch(e) {}
      this.mixer = null;
    }
    this.actions = {};
    this.root = null;
  }

  // helper: get action by profile mapping name
  private _actionForProfileKey(key?: string) {
    if (!key || !this.profile || !this.mixer) return null;
    const map = this.profile.animations || {};
    const clipName = (map as any)[key];
    if (!clipName) return null;
    const action = this.actions[clipName] || null;
    if (!action) {
      // debug: print available clip names and profile mapping to help diagnose mismatches
      const available = Object.keys(this.actions);
      //console.warn(`AnimationController: clip '${clipName}' for profile key '${key}' not found. Available clips: ${available.join(', ')}`);
      //console.warn('Profile animations mapping:', map);
    }
    return action;
  }

  // update weights smoothly and set timeScale if needed
  update(dt: number, state?: VehicleStateSimple) {
    if (!this.mixer) return;
    const smoothing = 0.08; // lerp factor
    const speed = state?.speed ?? 0;
    const brake = state?.brakePressure ?? 0;
    const steer = state?.steer ?? 0;
    const rpm = state?.rpm ?? 0;

    // determine blend values
    const speedForFullRun = 20; // m/s
    const sNorm = Math.min(1, Math.max(0, speed / speedForFullRun));

    // compute desired weights
    const desired: Record<string, number> = {};
    // idle vs drive blend
    const idleClip = this._actionForProfileKey('idle');
    const driveSlowClip = this._actionForProfileKey('drive_slow');
    const driveFastClip = this._actionForProfileKey('drive_fast');
    const brakeClip = this._actionForProfileKey('brake');
    const steerClip = this._actionForProfileKey('steer');

    // basic scheme: idle when stopped, driveSlow when low speed, driveFast when high speed
    if (idleClip) desired[idleClip._clip.name] = 1 - sNorm;
    if (driveSlowClip) desired[driveSlowClip._clip.name] = Math.max(0, 1 - sNorm);
    if (driveFastClip) desired[driveFastClip._clip.name] = sNorm;

    // brake overlay
    if (brakeClip) desired[brakeClip._clip.name] = brake;

    // steer overlay (use absolute steer)
    if (steerClip) desired[steerClip._clip.name] = Math.min(1, Math.abs(steer) * 1.0);

    // normalize so sum <= 1.5 to allow overlays; we will lerp weights per action
    // apply smoothing: for each existing action, lerp current weight -> desired
    for (const name of Object.keys(this.actions)) {
      const action = this.actions[name];
      if (!action) continue;
      const target = desired[name] ?? 0;
      const cur = this._weights[name] ?? 0;
      const next = cur + (target - cur) * smoothing;
      this._weights[name] = next;
      action.setEffectiveWeight(next);
      // set timeScale for locomotion actions based on rpm/speed mapping
      if (driveSlowClip && name === driveSlowClip._clip.name) {
        const nominal = this.profile?.nominalRpm ?? 3000;
        action.timeScale = nominal > 0 ? Math.max(0.2, rpm / nominal) : 1;
      }
      if (driveFastClip && name === driveFastClip._clip.name) {
        const nominal = this.profile?.nominalRpm ?? 3000;
        action.timeScale = nominal > 0 ? Math.max(0.2, rpm / nominal) : 1;
      }
    }

    // advance mixer
    try { this.mixer.update(dt); } catch (e) {}
  }
}
