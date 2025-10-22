import { VehicleInput } from "../core/types";
import { BrakeController, BrakeEvent } from '../gameplay/BrakeController';

export class InputManager {
  private input: VehicleInput = { steer: 0, throttle: 0, brake: 0, handbrake: false };
  private keyState: Record<string, boolean> = {};
  private gamepadIndex: number | null = null;

  private brakeController = new BrakeController();

  constructor() {
    window.addEventListener("keydown", (e) => this.onKey(e, true));
    window.addEventListener("keyup", (e) => this.onKey(e, false));
    window.addEventListener("gamepadconnected", (e: any) => {
      this.gamepadIndex = e.gamepad.index;
      console.log("Gamepad connected", e.gamepad);
    });
    window.addEventListener("gamepaddisconnected", () => {
      this.gamepadIndex = null;
    });
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    this.keyState[e.code] = down;
    // prevent default to keep page from scrolling on arrows/space
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  }

  update(dt: number) {
    // compute processed input from key/gamepad state; do not mutate input from onKey
    let steer = 0;
    let throttle = 0;
    let brakeRaw = 0;
    let handbrake = false;

    // keyboard WASD or arrows
    if (this.keyState["KeyW"] || this.keyState["ArrowUp"]) throttle = 1;
    if (this.keyState["KeyS"] || this.keyState["ArrowDown"]) brakeRaw = 1; // raw binary for keyboard
    // invert steering: A/Left should now give positive steer
    if (this.keyState["KeyA"] || this.keyState["ArrowLeft"]) steer = 1;
    if (this.keyState["KeyD"] || this.keyState["ArrowRight"]) steer = -1;
    if (this.keyState["Space"]) handbrake = true;

    // gamepad
    if (this.gamepadIndex !== null) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        const lx = gp.axes[0] ?? 0;
        const ly = gp.axes[1] ?? 0;
        if (ly < -0.2) throttle = Math.max(throttle, (-ly));
        if (ly > 0.2) brakeRaw = Math.max(brakeRaw, ly);
        if (Math.abs(lx) > 0.1) steer = -lx;
        if ((gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[1] && gp.buttons[1].pressed)) {
          handbrake = true;
        }
      }
    }

    // update brake controller with raw input (keyboard as 0/1, gamepad analog preserved)
    this.brakeController.update(brakeRaw);
    const brake = this.brakeController.getBrakePressure();
    const brakeForce = this.brakeController.getBrakeForce();

    // smoothing for steer only; throttle/brake kept immediate to allow crisp control
    const steerSmooth = 0.9;
    this.input.steer = this.input.steer * steerSmooth + steer * (1 - steerSmooth);

    // commit processed inputs
    this.input.throttle = throttle;
    this.input.brake = brake;
    this.input.brakeForce = brakeForce;
    this.input.handbrake = handbrake;
  }

  getInput(): VehicleInput {
    return { ...this.input };
  }

  // expose brake events (short/long) to callers
  getBrakeEvent(): BrakeEvent {
    return this.brakeController.consumeEvent();
  }
}
