import { describe, it, expect } from 'vitest';
import { BrakeController } from '../../src/gameplay/BrakeController';

describe('BrakeController', () => {
  it('produces short event and pulse on quick tap', () => {
    const b = new BrakeController({ longPressThresholdMs: 350, rampUpTimeMs: 120, shortBrakeValue: 0.5, shortBrakePulseMs: 250 });

    // press at t=0
    b.update(1, 0);
    // hold 100ms (< long threshold)
    b.update(1, 100);
    // release at 100ms -> should emit short event and start pulse
    b.update(0, 0);

    const ev = b.consumeEvent();
    expect(ev).toBe('short');
    // immediately after release, pulse is active
    expect(b.getBrakePressure()).toBeCloseTo(0.5, 5);

    // advance inside pulse (100 + 200 = 300 < 350), still in pulse
    b.update(0, 200);
    expect(b.getBrakePressure()).toBeCloseTo(0.5, 5);

    // advance past pulse end (100 + 250 = 350), now beyond
    b.update(0, 100);
    expect(b.getBrakePressure()).toBeCloseTo(0, 5);
  });

  it('produces long event when holding beyond threshold and ramps to full', () => {
    const b = new BrakeController({ longPressThresholdMs: 350, rampUpTimeMs: 120, shortBrakeValue: 0.5, shortBrakePulseMs: 250 });

    // press at t=0
    b.update(1, 0);
    // advance beyond threshold 400ms
    b.update(1, 400);

    const ev = b.consumeEvent();
    expect(ev).toBe('long');
    // after 400ms and rampUpTime 120ms, we expect brakePressure to have reached 1
    expect(b.getBrakePressure()).toBeCloseTo(1, 5);
    expect(b.isBraking()).toBe(true);
  });

  it('ramps brake pressure progressively while holding', () => {
    const b = new BrakeController({ longPressThresholdMs: 350, rampUpTimeMs: 120, shortBrakeValue: 0.5, shortBrakePulseMs: 250 });

    // press at t=0
    b.update(1, 0);
    // advance to half ramp (60ms)
    b.update(1, 60);
    // expected pressure = short + 0.5*(1 - short) = 0.5 + 0.25 = 0.75
    expect(b.getBrakePressure()).toBeCloseTo(0.75, 2);
  });
});
