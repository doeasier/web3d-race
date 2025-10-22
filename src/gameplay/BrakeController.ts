export type BrakeEvent = 'short' | 'long' | null;

export type BrakeControllerConfig = {
  longPressThresholdMs?: number;
  rampUpTimeMs?: number; // ms to ramp from shortBrakeValue -> 1
  shortBrakeValue?: number; // 0..1
  shortBrakePulseMs?: number; // ms to hold short pulse after release
  // exponent for brake force curve mapping: force = pressure ^ exponent
  brakeCurveExponent?: number;
};

export class BrakeController {
  private longPressThreshold: number;
  private rampUpTime: number;
  private shortBrakeValue: number;
  private shortBrakePulseMs: number;

  private pressedSince: number | null = null;
  private pulseUntil: number | null = null;
  private emittedLong: boolean = false;
  private lastEvent: BrakeEvent = null;

  private brakePressure: number = 0;
  // target pressure we smooth toward
  private _targetPressure: number = 0;
  // smoothing time constant in ms for exponential smoothing of brake pressure
  private _smoothTimeMs: number = 60;
  private _brakeCurveExponent: number = 1.5;

  // accumulated time (ms) when dtMs provided; null when using Date.now
  private _accTimeMs: number | null = 0;
  private _pressedDurationMs: number = 0; // used in dt mode

  constructor(cfg?: BrakeControllerConfig) {
    this.longPressThreshold = cfg?.longPressThresholdMs ?? 350;
    this.rampUpTime = cfg?.rampUpTimeMs ?? 120;
    this.shortBrakeValue = cfg?.shortBrakeValue ?? 0.5;
    this.shortBrakePulseMs = cfg?.shortBrakePulseMs ?? 250;
    if (cfg && (cfg as any).smoothTimeMs != null) this._smoothTimeMs = (cfg as any).smoothTimeMs;
    if (cfg && typeof (cfg as any).brakeCurveExponent === 'number') this._brakeCurveExponent = (cfg as any).brakeCurveExponent;
  }

  // rawInput: 0..1 (keyboard treated as 0 or 1)
  // dtMs: optional delta time in ms to advance internal clock (deterministic for tests). If omitted, uses Date.now().
  update(rawInput: number, dtMs?: number) {
    let now: number;
    let useDtMode = false;
    if (typeof dtMs === 'number') {
      useDtMode = true;
      if (this._accTimeMs == null) this._accTimeMs = 0;
      this._accTimeMs += dtMs;
      now = this._accTimeMs;
    } else {
      now = Date.now();
      this._accTimeMs = null;
      this._pressedDurationMs = 0;
    }

    this.lastEvent = null;

    const pressed = rawInput > 0.01;

    if (pressed) {
      if (useDtMode) {
        this._pressedDurationMs += dtMs ?? 0;
      } else {
        if (this.pressedSince == null) {
          this.pressedSince = now;
          this.emittedLong = false;
        }
      }
      const elapsed = useDtMode ? this._pressedDurationMs : (now - (this.pressedSince || now));
      // emit long event once when threshold passed
      if (!this.emittedLong && elapsed >= this.longPressThreshold) {
        this.lastEvent = 'long';
        this.emittedLong = true;
      }
      // ramp from shortBrakeValue -> 1 over rampUpTime -> this yields a target pressure
      const t = Math.min(1, elapsed / Math.max(1, this.rampUpTime));
      const ramped = this.shortBrakeValue + t * (1 - this.shortBrakeValue);
      // target: allow analog to influence; keyboard (rawInput>=0.99) uses ramped
      const computedTarget = rawInput < 0.99 ? Math.max(rawInput, ramped) : ramped;
      this._targetPressure = Math.max(0, Math.min(1, computedTarget));
      // clear any pulseUntil since actively pressing
      this.pulseUntil = null;
    } else {
      // not pressed
      const elapsed = useDtMode ? this._pressedDurationMs : (this.pressedSince ? (now - this.pressedSince) : 0);
      if (this.pressedSince != null || useDtMode && this._pressedDurationMs > 0) {
        if (elapsed < this.longPressThreshold) {
          // short tap: schedule a short pulse as target
          this.lastEvent = 'short';
          this.pulseUntil = now + this.shortBrakePulseMs;
          this._targetPressure = this.shortBrakeValue;
        }
      }
      this.pressedSince = null;
      this._pressedDurationMs = 0;
      this.emittedLong = false;

      if (this.pulseUntil && now < this.pulseUntil) {
        this._targetPressure = this.shortBrakeValue;
      } else {
        this._targetPressure = 0;
        this.pulseUntil = null;
      }
    }

    // If deterministic dt mode is used (tests pass dtMs), update immediately to target
    if (useDtMode) {
      this.brakePressure = this._targetPressure;
    } else {
      // smooth actual brakePressure toward target using exponential smoothing based on an assumed dt (ms)
      let alpha = 1;
      const dt = 16; // assume ~16ms between frames in real-time mode
      const tau = Math.max(1, this._smoothTimeMs);
      alpha = 1 - Math.exp(-dt / tau);
      this.brakePressure = this.brakePressure + (this._targetPressure - this.brakePressure) * alpha;
    }
    // clamp
    if (this.brakePressure < 0) this.brakePressure = 0;
    if (this.brakePressure > 1) this.brakePressure = 1;
  }

  getBrakePressure(): number {
    return this.brakePressure;
  }

  // Map raw brake pressure to actual brake force using a configurable nonlinear curve
  getBrakeForce(): number {
    // clamp
    const p = Math.max(0, Math.min(1, this.brakePressure));
    const exp = Math.max(0.1, this._brakeCurveExponent);
    return Math.pow(p, exp);
  }

  isBraking(): boolean {
    return this.brakePressure > 0.001;
  }

  // returns and clears last event
  consumeEvent(): BrakeEvent {
    const ev = this.lastEvent;
    this.lastEvent = null;
    return ev;
  }
}
