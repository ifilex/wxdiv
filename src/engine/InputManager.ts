/**
 * InputManager.ts
 * Manages Keyboard & Mouse / Pointer Lock events for Mode 8 DOOM Engine
 */

export interface InputState {
  forward: boolean;
  backward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  interact: boolean;
  attack: boolean;
  weapon1: boolean;
  weapon2: boolean;
  weapon3: boolean;
  tabAutomap: boolean;
  mouseDeltaX: number;
}

export class InputManager {
  public keys: Record<string, boolean> = {};
  public mouseDeltaX: number = 0;
  private isPointerLocked: boolean = false;
  private targetCanvas: HTMLCanvasElement | null = null;
  private onTabPress?: () => void;
  private onInteractPress?: () => void;
  private onPauseToggle?: () => void;
  private onWeaponSelect?: (index: number) => void;

  constructor() {
    this.setupListeners();
  }

  public setCallbacks(callbacks: {
    onTabPress?: () => void;
    onInteractPress?: () => void;
    onPauseToggle?: () => void;
    onWeaponSelect?: (index: number) => void;
  }) {
    this.onTabPress = callbacks.onTabPress;
    this.onInteractPress = callbacks.onInteractPress;
    this.onPauseToggle = callbacks.onPauseToggle;
    this.onWeaponSelect = callbacks.onWeaponSelect;
  }

  public attachCanvas(canvas: HTMLCanvasElement) {
    this.targetCanvas = canvas;
  }

  public requestPointerLock() {
    if (this.targetCanvas && document.pointerLockElement !== this.targetCanvas) {
      this.targetCanvas.requestPointerLock?.();
    }
  }

  public exitPointerLock() {
    if (document.exitPointerLock && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public getPointerLocked(): boolean {
    return this.isPointerLocked;
  }

  private setupListeners() {
    window.addEventListener("keydown", (e) => {
      // TAB: Toggle automap, strictly prevent default browser focus switching
      if (e.key === "Tab" || e.code === "Tab") {
        e.preventDefault();
        this.onTabPress?.();
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }

      if (e.key === "Escape") {
        this.onPauseToggle?.();
      }

      if (e.key === "e" || e.key === "E") {
        this.onInteractPress?.();
      }

      if (e.key === "1") this.onWeaponSelect?.(1);
      if (e.key === "2") this.onWeaponSelect?.(2);
      if (e.key === "3") this.onWeaponSelect?.(3);

      const k = e.key.toLowerCase();
      this.keys[k] = true;
      this.keys[e.code] = true;
    });

    window.addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = false;
      this.keys[e.code] = false;
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.keys["mouse0"] = true;
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.keys["mouse0"] = false;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isPointerLocked) {
        this.mouseDeltaX += e.movementX || 0;
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement === this.targetCanvas;
    });
  }

  /**
   * Consumes accumulated mouse delta and returns snapshot of inputs
   */
  public poll(sensitivity: number = 1.0): InputState {
    const forward = !!(this.keys["w"] || this.keys["arrowup"]);
    const backward = !!(this.keys["s"] || this.keys["arrowdown"]);
    const strafeLeft = !!(this.keys["a"]);
    const strafeRight = !!(this.keys["d"]);
    const turnLeft = !!(this.keys["arrowleft"] || this.keys["q"]);
    const turnRight = !!(this.keys["arrowright"]);
    const interact = !!(this.keys["e"] || this.keys[" "]);
    const attack = !!(this.keys["mouse0"] || this.keys["ctrl"] || this.keys["control"]);
    const weapon1 = !!this.keys["1"];
    const weapon2 = !!this.keys["2"];
    const weapon3 = !!this.keys["3"];

    const deltaX = this.mouseDeltaX * sensitivity;
    this.mouseDeltaX = 0; // reset accumulated movement

    return {
      forward,
      backward,
      strafeLeft,
      strafeRight,
      turnLeft,
      turnRight,
      interact,
      attack,
      weapon1,
      weapon2,
      weapon3,
      tabAutomap: false,
      mouseDeltaX: deltaX,
    };
  }
}
