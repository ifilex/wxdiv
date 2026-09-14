import { DivProcess, DivGraphic, DivText, DivPrimitive, DivScroll, DivMode7, DivMode8, DivMode8Door, DivMode8Trigger, DivMode8Entity, Camera3DInfo, C_M7, C_M8 } from "../types";
import { soundEngine } from "./sound";
import { DEFAULT_SPRITES, createGraphicCanvas } from "./graphics";

export interface EngineStats {
  fps: number;
  processCount: number;
  renderTimeMs: number;
  frameIndex: number;
  activeSounds: number;
  camera3D?: Camera3DInfo;
}

export class DivRuntime {
  public canvas: HTMLCanvasElement | null = null;
  public ctx: CanvasRenderingContext2D | null = null;

  // Screen configuration
  public width: number = 640;
  public height: number = 480;
  public targetFps: number = 60;
  public backgroundColor: string = "#0a0e17";

  // Engine state
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  private animFrameId: number | null = null;
  private lastTick: number = 0;
  private frameCount: number = 0;
  private currentFps: number = 60;
  private renderDuration: number = 0;

  // Process & Asset collections
  private nextProcessId: number = 1;
  public processes: Map<number, DivProcess> = new Map();
  private _fpg: Map<number, DivGraphic> = new Map();

  /**
   * Access the FPG Map. Setter safely accepts either Map or Array of DivGraphic.
   */
  public get fpg(): Map<number, DivGraphic> {
    return this._fpg;
  }

  public set fpg(value: Map<number, DivGraphic> | DivGraphic[]) {
    if (value instanceof Map) {
      this._fpg = new Map(value);
    } else if (Array.isArray(value)) {
      this._fpg = new Map();
      value.forEach((g) => {
        if (g && typeof g.id === "number") {
          this._fpg.set(g.id, g);
        }
      });
    }
  }

  public texts: Map<number, DivText> = new Map();
  public primitives: DivPrimitive[] = [];
  public permanentPrimitives: DivPrimitive[] = [];
  public scrolls: DivScroll[] = [];

  // ========================================================
  // 3D ENGINES: MODO 7 (Perspective Floor) & MODO 8 (Raycaster)
  // ========================================================
  public m7: DivMode7[] = [];
  public m8: DivMode8[] = [];

  public globalVars: Record<string, any> = {
    score: 0,
    hi_score: 10000,
    lives: 3,
    level: 1,
  };

  // Input states
  public keyState: Record<string, boolean> = {};
  public mouseState = {
    x: 0,
    y: 0,
    left: false,
    right: false,
  };

  // Callback hooks
  public onStatsUpdate?: (stats: EngineStats) => void;
  public onProcessListUpdate?: (procs: DivProcess[]) => void;
  public onError?: (err: Error) => void;

  // Process declarations registry
  private processDefs: Map<
    string,
    (proc: DivProcess, args: any[], runtime: DivRuntime) => Generator<void, void, unknown>
  > = new Map();

  constructor() {
    this.setupDefaultGlobals();
    this.initMode7();
    this.initMode8();
    this.loadFPG(DEFAULT_SPRITES);
  }

  private initMode7() {
    this.m7 = [
      {
        id: 0,
        file: 0,
        groundGraph: 22,
        skyGraph: 0,
        x: 400,
        y: 850,
        z: 0,
        angle: 90,
        height: 46,
        distance: 210,
        horizon: Math.floor(this.height * 0.42),
        focus: 100,
        color: "#0a1931",
        camera: 0,
        active: false,
      },
    ];
  }

  private initMode8() {
    // 16x16 Classic Wolfenstein-style dungeon maze
    const defaultMaze = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 2, 0, 0, 1, 0, 2, 2, 2, 0, 0, 2, 0, 1],
      [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 1],
      [1, 0, 2, 0, 0, 1, 1, 1, 0, 0, 2, 2, 0, 2, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1, 0, 2, 2, 0, 1],
      [1, 0, 2, 2, 0, 1, 1, 1, 0, 0, 0, 0, 2, 2, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      [1, 0, 1, 0, 2, 2, 2, 0, 0, 2, 2, 0, 1, 0, 0, 1],
      [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    this.m8 = [
      {
        id: 0,
        file: 0,
        mapWalls: 25,
        mapFloor: 0,
        mapCeil: 0,
        x: 3.5,
        y: 3.5,
        z: 0,
        angle: 0,
        height: 32,
        pitch: 0,
        camera: 0,
        fogColor: "#030712",
        fogDistance: 11,
        mapWidth: 16,
        mapHeight: 16,
        map: defaultMaze,
        doors: [
          {
            id: 1,
            x: 7,
            y: 6,
            state: "closed",
            openAmount: 0,
            texture: 31,
            autoCloseTimer: 0,
            name: "Puerta Principal",
          },
          {
            id: 2,
            x: 6,
            y: 11,
            state: "closed",
            openAmount: 0,
            texture: 38,
            autoCloseTimer: 0,
            name: "Reja de Mazmorra",
          },
        ],
        triggers: [
          {
            id: 1,
            x: 7,
            y: 5,
            type: "sensor",
            targetDoorId: 1,
            activated: false,
            texture: 37,
            name: "Sensor de Presión",
          },
          {
            id: 2,
            x: 6,
            y: 10,
            type: "switch",
            targetDoorId: 2,
            activated: false,
            texture: 32,
            name: "Interruptor de Muro",
          },
        ],
        entities: [
          { id: "e1", type: "torch", x: 96, y: 96, graph: 28, name: "Antorcha Norte" },
          { id: "e2", type: "torch", x: 864, y: 96, graph: 28, name: "Antorcha Este" },
          { id: "e3", type: "key", x: 224, y: 224, graph: 34, name: "Tarjeta de Acceso" },
          { id: "e4", type: "medikit", x: 544, y: 224, graph: 35, name: "Botiquín Táctico" },
          { id: "e5", type: "ammo", x: 800, y: 224, graph: 36, name: "Caja de Munición" },
          { id: "e6", type: "barrel", x: 224, y: 480, graph: 29, name: "Barril Tóxico" },
        ],
        lightLevel: 0.85,
        torchFlicker: true,
        active: false,
      },
    ];
  }

  private setupDefaultGlobals() {
    this.globalVars = {
      score: 0,
      hi_score: 5000,
      lives: 3,
      level: 1,
      timer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
  }

  public setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false; // Crisp pixel retro look
    }
  }

  public loadFPG(graphics: DivGraphic[] | Map<number, DivGraphic>) {
    this.fpg = graphics;
  }

  public getGraphic(id: number): DivGraphic | undefined {
    let g: DivGraphic | undefined;
    if (this._fpg && typeof this._fpg.get === "function") {
      g = this._fpg.get(id);
    } else if (this.fpg && typeof this.fpg.get === "function") {
      g = this.fpg.get(id);
    } else if (Array.isArray(this.fpg)) {
      g = (this.fpg as unknown as DivGraphic[]).find((item) => item.id === id);
    }

    if (g && !g.canvas && typeof document !== "undefined" && g.pixels) {
      g.canvas = createGraphicCanvas(g);
    }
    return g;
  }

  /**
   * Returns list of currently active (non-dead) processes
   */
  public getActiveProcesses = (): DivProcess[] => {
    if (!this.processes || typeof this.processes.values !== "function") return [];
    return Array.from(this.processes.values()).filter((p) => !p.isDead);
  };

  /**
   * Returns list of all tracked processes
   */
  public getAllProcesses = (): DivProcess[] => {
    if (!this.processes || typeof this.processes.values !== "function") return [];
    return Array.from(this.processes.values());
  };

  public registerProcess(
    name: string,
    factory: (proc: DivProcess, args: any[], runtime: DivRuntime) => Generator<void, void, unknown>
  ) {
    this.processDefs.set(name.toLowerCase(), factory);
  }

  /**
   * Spawns a process instance in the runtime
   */
  public spawn(name: string, args: any[] = [], fatherId: number = 0): number {
    const id = this.nextProcessId++;
    const proc: DivProcess = {
      id,
      name: name.toLowerCase(),
      father: fatherId,
      x: args[0] ?? (this.width / 2),
      y: args[1] ?? (this.height / 2),
      z: 0,
      graph: 0,
      file: 0,
      angle: 0,
      size: 100,
      flags: 0,
      alpha: 255,
      ctype: 0,
      cnumber: 0,
      priority: 0,
      resolution: 1,
      region: 0,
      isDead: false,
      isSleeping: false,
      isFrozen: false,
      localVars: {},
      customState: {},
    };

    const factory = this.processDefs.get(name.toLowerCase());
    if (factory) {
      proc.generator = factory(proc, args, this);
    }

    this.processes.set(id, proc);
    return id;
  }

  /**
   * Signal a process: s_kill, s_freeze, s_wakeup, s_sleep
   */
  public signal(id: number, signalType: string | number) {
    if (id === 0) return;
    const sig = typeof signalType === "string" ? signalType.toLowerCase() : signalType;
    const proc = this.processes.get(id);
    if (!proc) return;

    if (sig === "s_kill" || sig === 1) {
      proc.isDead = true;
    } else if (sig === "s_freeze" || sig === 2) {
      proc.isFrozen = true;
    } else if (sig === "s_wakeup" || sig === 3) {
      proc.isSleeping = false;
      proc.isFrozen = false;
    } else if (sig === "s_sleep" || sig === 4) {
      proc.isSleeping = true;
    }
  }

  public letMeAlone(callerId: number) {
    for (const [id, proc] of this.processes.entries()) {
      if (id !== callerId) {
        proc.isDead = true;
      }
    }
  }

  public exists(id: number): boolean {
    return this.processes.has(id) && !this.processes.get(id)?.isDead;
  }

  /**
   * Collision detection: returns colliding process ID of given type, or 0
   */
  public collision(caller: DivProcess, targetType: string): number {
    const target = targetType.toLowerCase();
    const callerRadius = (this.getGraphicRadius(caller.graph) * caller.size) / 100;

    for (const [id, proc] of this.processes.entries()) {
      if (id === caller.id || proc.isDead || proc.name !== target) continue;

      const targetRadius = (this.getGraphicRadius(proc.graph) * proc.size) / 100;
      const dist = Math.hypot(proc.x - caller.x, proc.y - caller.y);

      if (dist <= callerRadius + targetRadius) {
        return id;
      }
    }
    return 0;
  }

  private getGraphicRadius(graphId: number): number {
    const g = this.getGraphic(graphId);
    if (!g) return 10;
    return Math.max(g.width, g.height) / 2;
  }

  /**
   * Geometry & Math built-ins
   */
  public getDist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.round(Math.hypot(x2 - x1, y2 - y1));
  }

  public getAngle(x1: number, y1: number, x2: number, y2: number): number {
    const rad = Math.atan2(y2 - y1, x2 - x1);
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  }

  public advance(proc: DivProcess, speed: number) {
    const rad = (proc.angle * Math.PI) / 180;
    proc.x += Math.cos(rad) * speed;
    proc.y += Math.sin(rad) * speed;
  }

  public xadvance(proc: DivProcess, angle: number, speed: number) {
    const rad = (angle * Math.PI) / 180;
    proc.x += Math.cos(rad) * speed;
    proc.y += Math.sin(rad) * speed;
  }

  public rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Sound API
   */
  public sound(id: number, vol: number = 100, freq: number = 256) {
    soundEngine.playSound(id, vol, freq);
  }

  /**
   * Text management
   */
  public write(font: number, x: number, y: number, align: number, text: string): number {
    const id = this.texts.size + 1;
    this.texts.set(id, { id, font, x, y, align, text });
    return id;
  }

  public writeInt(font: number, x: number, y: number, align: number, variableRef: string): number {
    const id = this.texts.size + 1;
    this.texts.set(id, { id, font, x, y, align, text: "", variableRef });
    return id;
  }

  public deleteText(id: number | "all_text") {
    if (id === "all_text" || id === 0) {
      this.texts.clear();
    } else {
      this.texts.delete(id);
    }
  }

  /**
   * Primitive drawing
   */
  public drawBox(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.primitives.push({ id: this.primitives.length, type: "box", x1, y1, x2, y2, color });
  }

  public drawPermanentBox(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.permanentPrimitives.push({ id: this.permanentPrimitives.length, type: "box", x1, y1, x2, y2, color });
  }

  public drawOutlineBox(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.primitives.push({ id: this.primitives.length, type: "outline_box", x1, y1, x2, y2, color });
  }

  public drawCircle(x: number, y: number, r: number, color: string) {
    this.primitives.push({ id: this.primitives.length, type: "circle", x1: x, y1: y, x2: x, y2: y, r, color });
  }

  public drawFCircle(x: number, y: number, r: number, color: string) {
    this.primitives.push({ id: this.primitives.length, type: "fcircle", x1: x, y1: y, x2: x, y2: y, r, color });
  }

  public drawLine(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.primitives.push({ id: this.primitives.length, type: "line", x1, y1, x2, y2, color });
  }

  public screenColor(color: string) {
    this.backgroundColor = color;
  }

  public clearScreen(color?: string) {
    if (color) this.backgroundColor = color;
    this.primitives = [];
    this.permanentPrimitives = [];
  }

  public fadeOn() {
    // Smooth fade effect
  }

  public fadeOff() {
    // Smooth fade effect
  }

  /**
   * Keyboard & Input check
   */
  public key(keyName: string): boolean {
    const norm = keyName.toLowerCase().replace(/^_/, "");
    return Boolean(this.keyState[norm]);
  }

  public setResolution(res: "320x200" | "640x480" | "800x600" | "1024x768") {
    const parts = res.split("x").map(Number);
    this.width = parts[0];
    this.height = parts[1];
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }
  }

  // ========================================================
  // 3D MODE CONTROL METHODS
  // ========================================================
  public start_mode7(
    id: number = 0,
    file: number = 0,
    groundGraph: number = 0,
    skyGraph: number = 0,
    region: number = 0,
    flags: number = 0
  ) {
    if (!this.m7[id]) this.initMode7();
    const m = this.m7[id];
    m.file = file;
    if (groundGraph > 0) m.groundGraph = groundGraph;
    if (skyGraph > 0) m.skyGraph = skyGraph;
    m.horizon = Math.floor(this.height * 0.42);
    m.active = true;
  }

  public stop_mode7(id: number = 0) {
    if (this.m7[id]) this.m7[id].active = false;
  }

  public start_mode8(
    id: number = 0,
    file: number = 0,
    mapWalls: number = 0,
    mapFloor: number = 0,
    mapCeil: number = 0,
    region: number = 0,
    flags: number = 0
  ) {
    if (!this.m8[id]) this.initMode8();
    const m = this.m8[id];
    m.file = file;
    if (mapWalls > 0) m.mapWalls = mapWalls;
    if (mapFloor > 0) m.mapFloor = mapFloor;
    if (mapCeil > 0) m.mapCeil = mapCeil;
    m.active = true;
  }

  public stop_mode8(id: number = 0) {
    if (this.m8[id]) this.m8[id].active = false;
  }

  public open_mode8_door(id: number = 1) {
    this.openMode8Door(id);
  }

  public close_mode8_door(id: number = 1) {
    this.closeMode8Door(id);
  }

  public toggle_mode8_door(id: number = 1) {
    this.toggleMode8Door(id);
  }

  public interact_mode8(): boolean {
    return this.interactMode8();
  }

  /**
   * Main game loop start
   */
  public start() {
    this.isRunning = true;
    this.isPaused = false;
    this.lastTick = performance.now();
    this.tick();
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.lastTick = performance.now();
      this.tick();
    }
  }

  public stepFrame() {
    this.isPaused = true;
    this.step();
    this.render();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public reset() {
    this.stop();
    this.processes.clear();
    this.texts.clear();
    this.primitives = [];
    this.permanentPrimitives = [];
    this.nextProcessId = 1;
    this.initMode7();
    this.initMode8();
    this.setupDefaultGlobals();
  }

  private tick = () => {
    if (!this.isRunning || this.isPaused) return;

    const now = performance.now();
    const elapsed = now - this.lastTick;
    const interval = 1000 / this.targetFps;

    if (elapsed >= interval) {
      this.lastTick = now - (elapsed % interval);
      const startRender = performance.now();

      this.step();
      this.render();

      this.renderDuration = performance.now() - startRender;
      this.frameCount++;

      if (this.frameCount % 20 === 0) {
        this.currentFps = Math.round(1000 / Math.max(1, elapsed));
        if (this.onStatsUpdate) {
          this.onStatsUpdate({
            fps: this.currentFps,
            processCount: this.processes.size,
            renderTimeMs: Math.round(this.renderDuration * 10) / 10,
            frameIndex: this.frameCount,
            activeSounds: 0,
            camera3D: this.getCamera3DInfo(),
          });
        }
        if (this.onProcessListUpdate) {
          this.onProcessListUpdate(Array.from(this.processes.values()).slice(0, 50));
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Single frame tick: updates processes and cleans up dead ones
   */
  private step() {
    // Increment timers
    if (this.globalVars.timer) {
      for (let i = 0; i < this.globalVars.timer.length; i++) {
        this.globalVars.timer[i]++;
      }
    }

    // Refresh dynamic frame primitives (drawn during the frame by processes)
    this.primitives = [];

    // Step each active process until FRAME yield
    for (const [id, proc] of this.processes.entries()) {
      if (proc.isDead) {
        this.processes.delete(id);
        continue;
      }
      if (proc.isSleeping || proc.isFrozen) {
        continue;
      }

      if (proc.generator) {
        try {
          const result = proc.generator.next();
          if (result.done) {
            proc.isDead = true;
            this.processes.delete(id);
          }
        } catch (err: any) {
          console.error(`Error in process ${proc.name} [id=${id}]:`, err);
          proc.isDead = true;
          this.processes.delete(id);
          if (this.onError) this.onError(err);
        }
      }
    }

    // Step 3D Mode 8 systems (sliding doors, proximity sensors, item pickups)
    if (this.m8[0]?.active) {
      this.stepMode8();
    }
  }

  /**
   * Renders the current frame onto the canvas
   */
  private render() {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;

    // 1. Check for Active 3D Modes (Modo 7: Floor Perspective, Modo 8: Raycaster)
    if (this.m7[0]?.active) {
      this.renderMode7(ctx);
    } else if (this.m8[0]?.active) {
      this.renderMode8(ctx);
    } else {
      // Standard 2D Background & Scrolls
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.width, this.height);

      for (const scroll of this.scrolls) {
        if (!scroll.active) continue;
        const g = this.getGraphic(scroll.backGraph);
        if (g && g.canvas) {
          ctx.drawImage(g.canvas, scroll.x % this.width, scroll.y % this.height);
        }
      }

      // Standard 2D Processes / Sprites sorted by Z coordinate
      const sortedProcs = Array.from(this.processes.values()).sort((a, b) => b.z - a.z);

      for (const proc of sortedProcs) {
        if (proc.isDead || proc.graph === 0) continue;

        const graphic = this.getGraphic(proc.graph);
        if (!graphic || !graphic.canvas) continue;

        ctx.save();
        ctx.translate(proc.x, proc.y);

        // Rotation: support both classic DIV millidegrees (e.g. 90000 = 90deg) and modern degrees (90deg)
        if (proc.angle !== 0) {
          const angleDeg = Math.abs(proc.angle) > 360 ? proc.angle / 1000 : proc.angle;
          ctx.rotate((angleDeg * Math.PI) / 180);
        }

        // Scaling (size percentage, default 100)
        const scale = (proc.size || 100) / 100;
        let scaleX = scale;
        let scaleY = scale;

        // Flags (1=flip_h, 2=flip_v)
        if (proc.flags & 1) scaleX = -scaleX;
        if (proc.flags & 2) scaleY = -scaleY;
        ctx.scale(scaleX, scaleY);

        // Alpha transparency & ghost mode (flags & 4)
        let alphaNormalized = (proc.alpha ?? 255) / 255;
        if (proc.flags & 4) {
          alphaNormalized *= 0.55;
        }
        if (alphaNormalized < 1) {
          ctx.globalAlpha = Math.max(0, Math.min(1, alphaNormalized));
        }

        // Draw sprite centered on control point (cx, cy)
        const cx = graphic.cx ?? graphic.width / 2;
        const cy = graphic.cy ?? graphic.height / 2;
        ctx.drawImage(graphic.canvas, -cx, -cy);

        ctx.restore();
      }
    }

    // Primitives (Both persistent scenery and dynamic frame primitives / 2D Overlays)
    const allPrimitives = [...this.permanentPrimitives, ...this.primitives];
    for (const prim of allPrimitives) {
      ctx.strokeStyle = prim.color || "#ffffff";
      ctx.fillStyle = prim.color || "#ffffff";
      if (prim.type === "box") {
        const x = Math.min(prim.x1, prim.x2);
        const y = Math.min(prim.y1, prim.y2);
        const w = Math.max(1, Math.abs(prim.x2 - prim.x1));
        const h = Math.max(1, Math.abs(prim.y2 - prim.y1));
        ctx.fillRect(x, y, w, h);
      } else if (prim.type === "outline_box") {
        const x = Math.min(prim.x1, prim.x2);
        const y = Math.min(prim.y1, prim.y2);
        const w = Math.max(1, Math.abs(prim.x2 - prim.x1));
        const h = Math.max(1, Math.abs(prim.y2 - prim.y1));
        ctx.strokeRect(x, y, w, h);
      } else if (prim.type === "line") {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(prim.x1, prim.y1);
        ctx.lineTo(prim.x2, prim.y2);
        ctx.stroke();
      } else if (prim.type === "circle" && prim.r) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(prim.x1, prim.y1, prim.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (prim.type === "fcircle" && prim.r) {
        ctx.beginPath();
        ctx.arc(prim.x1, prim.y1, prim.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Texts (HUD / Labels / Scores)
    ctx.font = '13px "Fira Code", monospace';
    ctx.textBaseline = "top";
    for (const txt of this.texts.values()) {
      ctx.fillStyle = "#ffffff";
      if (txt.align === 1) {
        ctx.textAlign = "center";
      } else if (txt.align === 2) {
        ctx.textAlign = "right";
      } else {
        ctx.textAlign = "left";
      }

      let content = txt.text;
      if (txt.variableRef) {
        const val = this.globalVars[txt.variableRef] ?? 0;
        content = txt.text ? `${txt.text}: ${val}` : `${txt.variableRef.toUpperCase()}: ${val}`;
      }
      ctx.fillText(content, txt.x, txt.y);
    }
  }

  /**
   * Render Mode 7: Super Nintendo / DIV Games Studio Perspective 3D Ground
   */
  private renderMode7(ctx: CanvasRenderingContext2D) {
    const m = this.m7[0];
    if (!m) return;

    // Follow camera process if assigned
    if (m.camera) {
      const camTarget = this.processes.get(m.camera);
      if (camTarget && !camTarget.isDead) {
        const rad = ((camTarget.angle || 0) * Math.PI) / 180;
        const followDist = 80;
        m.x = camTarget.x - Math.sin(rad) * followDist;
        m.y = camTarget.y - Math.cos(rad) * followDist;
        m.angle = camTarget.angle;
      }
    }

    const horizon = m.horizon || Math.floor(this.height * 0.42);
    const camH = m.height || 46;
    const fovDist = m.distance || 210;
    const angRad = ((m.angle || 0) * Math.PI) / 180;
    const cos = Math.cos(angRad);
    const sin = Math.sin(angRad);

    // 1. Sky Gradient & Parallax Skyline
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, "#050b18");
    skyGrad.addColorStop(0.5, "#0c2045");
    skyGrad.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, horizon);

    // Distant mountain skyline parallax
    const skyOffset = (-(m.angle || 0) * 2) % this.width;
    ctx.fillStyle = "#0f1f3d";
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let mx = -this.width; mx <= this.width * 2; mx += 60) {
      const peakX = mx + skyOffset;
      const peakY = horizon - 22 - Math.abs(Math.sin((mx + 100) * 0.02)) * 28;
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(peakX + 30, horizon);
    }
    ctx.closePath();
    ctx.fill();

    // 2. Perspective Ground Plane (Scanlines)
    const scanStep = 2; // Crisp 2px scanline slices for optimal 60 FPS
    for (let sy = horizon; sy < this.height; sy += scanStep) {
      const dy = sy - horizon + 0.1;
      const dist = (camH * fovDist) / dy;

      // Scanline center world position
      const midX = m.x + dist * Math.sin(angRad);
      const midY = m.y + dist * Math.cos(angRad);

      // Distance fog
      const fog = Math.min(0.75, dist / 900);

      // Check track circuit: Oval circuit centered at (400, 400) with R=320
      const trackDist = Math.hypot(midX - 400, midY - 400);
      const onRoad = Math.abs(trackDist - 320) < 65;
      const onKerb = Math.abs(trackDist - 320) >= 65 && Math.abs(trackDist - 320) < 78;

      let groundColor: string;
      if (onKerb) {
        // Red and white curbs
        const kerbPattern = Math.floor(Math.atan2(midY - 400, midX - 400) * 24) % 2 === 0;
        groundColor = kerbPattern ? "#dc2626" : "#f8fafc";
      } else if (onRoad) {
        // Dark asphalt with dashed center line
        const isCenterDash =
          Math.abs(trackDist - 320) < 3 &&
          Math.floor(Math.atan2(midY - 400, midX - 400) * 32) % 2 === 0;
        groundColor = isCenterDash ? "#facc15" : "#1e293b";
      } else {
        // Off-road grass checker grid
        const gx = Math.floor(midX / 40);
        const gy = Math.floor(midY / 40);
        const isDark = (gx + gy) % 2 === 0;
        groundColor = isDark ? "#14532d" : "#166534";
      }

      ctx.fillStyle = groundColor;
      ctx.fillRect(0, sy, this.width, scanStep);

      if (fog > 0.05) {
        ctx.fillStyle = `rgba(12, 32, 69, ${fog})`;
        ctx.fillRect(0, sy, this.width, scanStep);
      }
    }

    // 3. Render 3D Sprites in Mode 7
    interface M7Billboard {
      proc: DivProcess;
      rotZ: number;
      screenX: number;
      screenY: number;
      scale: number;
    }
    const billboards: M7Billboard[] = [];

    for (const proc of this.processes.values()) {
      if (proc.isDead || proc.graph === 0) continue;

      // If it's the player kart chased by the camera
      if (proc.id === m.camera) {
        billboards.push({
          proc,
          rotZ: 10,
          screenX: this.width / 2,
          screenY: this.height - 48,
          scale: 1.3,
        });
        continue;
      }

      // World to camera transform
      const dx = proc.x - m.x;
      const dy = proc.y - m.y;
      const rotX = dx * cos - dy * sin;
      const rotZ = dx * sin + dy * cos;

      if (rotZ > 12) {
        const scale = fovDist / rotZ;
        const screenX = this.width / 2 + rotX * scale;
        const screenY = horizon + (camH - (proc.z || 0)) * scale;

        if (screenX >= -120 && screenX <= this.width + 120 && screenY >= horizon - 30) {
          billboards.push({ proc, rotZ, screenX, screenY, scale });
        }
      }
    }

    // Sort by rotZ descending (Painter's algorithm: draw furthest first)
    billboards.sort((a, b) => b.rotZ - a.rotZ);

    for (const bb of billboards) {
      const { proc, screenX, screenY, scale, rotZ } = bb;
      const graphic = this.getGraphic(proc.graph);
      if (!graphic || !graphic.canvas) continue;

      ctx.save();
      ctx.translate(screenX, screenY);

      const sprScale = ((proc.size || 100) / 100) * scale;
      let sx = sprScale;
      let sy = sprScale;
      if (proc.flags & 1) sx = -sx;
      if (proc.flags & 2) sy = -sy;
      ctx.scale(sx, sy);

      // Distance fog for distant objects
      if (rotZ > 180) {
        ctx.globalAlpha = Math.max(0.35, 1 - (rotZ - 180) / 700);
      }

      const cx = graphic.cx ?? graphic.width / 2;
      const cy = graphic.cy ?? graphic.height / 2;
      ctx.drawImage(graphic.canvas, -cx, -cy);
      ctx.restore();
    }
  }

  /**
   * Helper: check if a grid tile contains a door
   */
  public getDoorAt(x: number, y: number): DivMode8Door | undefined {
    const m = this.m8[0];
    if (!m || !m.doors) return undefined;
    return m.doors.find((d) => d.x === x && d.y === y);
  }

  /**
   * Open / Close / Toggle Mode 8 doors
   */
  public openMode8Door(id: number) {
    const m = this.m8[0];
    const door = m?.doors?.find((d) => d.id === id);
    if (door && door.state !== "opening" && door.state !== "open") {
      door.state = "opening";
      soundEngine.playDoor();
    }
  }

  public closeMode8Door(id: number) {
    const m = this.m8[0];
    const door = m?.doors?.find((d) => d.id === id);
    if (door && door.state !== "closing" && door.state !== "closed") {
      door.state = "closing";
      soundEngine.playDoor();
    }
  }

  public toggleMode8Door(id: number) {
    const m = this.m8[0];
    const door = m?.doors?.find((d) => d.id === id);
    if (!door) return;
    if (door.state === "closed" || door.state === "closing") {
      this.openMode8Door(id);
    } else {
      this.closeMode8Door(id);
    }
  }

  /**
   * Player interact (pressing Space or 'E' in front of a door or switch)
   */
  public interactMode8(): boolean {
    const m = this.m8[0];
    if (!m || !m.active) return false;

    const dirRad = ((m.angle || 0) * Math.PI) / 180;
    const targetX = Math.floor(m.x + Math.cos(dirRad) * 1.2);
    const targetY = Math.floor(m.y + Math.sin(dirRad) * 1.2);

    // 1. Check for door directly ahead
    const door = this.getDoorAt(targetX, targetY);
    if (door) {
      this.toggleMode8Door(door.id);
      return true;
    }

    // 2. Check for wall switch trigger directly ahead
    const trigger = m.triggers?.find((t) => t.x === targetX && t.y === targetY);
    if (trigger) {
      trigger.activated = !trigger.activated;
      soundEngine.playSwitch();
      if (trigger.targetDoorId) {
        this.toggleMode8Door(trigger.targetDoorId);
      }
      return true;
    }

    return false;
  }

  /**
   * Sets new Mode 8 map, doors, triggers, and entities (used by Level Editor and code)
   */
  public setMode8Map(
    map: number[][],
    doors?: DivMode8Door[],
    triggers?: DivMode8Trigger[],
    entities?: DivMode8Entity[]
  ) {
    if (!this.m8[0]) this.initMode8();
    const m = this.m8[0];
    m.map = map;
    m.mapHeight = map.length;
    m.mapWidth = map[0]?.length || 16;
    if (doors) m.doors = doors;
    if (triggers) m.triggers = triggers;
    if (entities) m.entities = entities;
  }

  /**
   * Frame tick for Mode 8 systems: sliding door movement, trigger activation, and item pickup
   */
  private stepMode8() {
    const m = this.m8[0];
    if (!m || !m.active) return;

    // 1. Sliding door animations
    if (m.doors) {
      for (const door of m.doors) {
        if (door.state === "opening") {
          door.openAmount = Math.min(1.0, door.openAmount + 0.045);
          if (door.openAmount >= 1.0) {
            door.state = "open";
            door.autoCloseTimer = 180; // ~3 seconds auto-close
          }
        } else if (door.state === "open") {
          if (door.autoCloseTimer > 0) {
            door.autoCloseTimer--;
            if (door.autoCloseTimer === 0) {
              door.state = "closing";
              soundEngine.playDoor();
            }
          }
        } else if (door.state === "closing") {
          door.openAmount = Math.max(0.0, door.openAmount - 0.045);
          if (door.openAmount <= 0.0) {
            door.state = "closed";
          }
        }
      }
    }

    // 2. Floor pressure sensors
    const playerCellX = Math.floor(m.x);
    const playerCellY = Math.floor(m.y);
    if (m.triggers) {
      for (const trigger of m.triggers) {
        if (trigger.type === "sensor" && trigger.x === playerCellX && trigger.y === playerCellY) {
          if (!trigger.activated) {
            trigger.activated = true;
            soundEngine.playSwitch();
            if (trigger.targetDoorId) {
              this.openMode8Door(trigger.targetDoorId);
            }
          }
        } else if (trigger.type === "sensor" && (trigger.x !== playerCellX || trigger.y !== playerCellY)) {
          trigger.activated = false;
        }
      }
    }

    // 3. Proximity item pickup collection (keycards, medikits, ammo)
    if (m.entities && m.entities.length > 0) {
      for (let i = m.entities.length - 1; i >= 0; i--) {
        const ent = m.entities[i];
        const ex = ent.x / 64;
        const ey = ent.y / 64;
        const dist = Math.hypot(ex - m.x, ey - m.y);

        if (dist < 0.65) {
          if (ent.type === "medikit") {
            soundEngine.playMedikit();
            this.globalVars.health = Math.min(100, (this.globalVars.health ?? 80) + 30);
            this.globalVars.score = (this.globalVars.score ?? 0) + 100;
            m.entities.splice(i, 1);
          } else if (ent.type === "ammo") {
            soundEngine.playAmmo();
            this.globalVars.ammo = (this.globalVars.ammo ?? 50) + 35;
            this.globalVars.score = (this.globalVars.score ?? 0) + 50;
            m.entities.splice(i, 1);
          } else if (ent.type === "key") {
            soundEngine.playKey();
            this.globalVars.hasKey = true;
            this.globalVars.score = (this.globalVars.score ?? 0) + 500;
            m.entities.splice(i, 1);
          }
        }
      }
    }
  }

  /**
   * Render Mode 8: Enhanced Doom-like Raycasting Engine
   * Features: DDA Raycasting with sliding doors, multi-textures, directional lighting, torch flicker, and 3D sprite sorting
   */
  private renderMode8(ctx: CanvasRenderingContext2D) {
    const m = this.m8[0];
    if (!m) return;

    // Follow camera process if assigned
    if (m.camera) {
      const camTarget = this.processes.get(m.camera);
      if (camTarget && !camTarget.isDead) {
        m.x = camTarget.x / 64;
        m.y = camTarget.y / 64;
        m.angle = camTarget.angle;
      }
    }

    const posX = m.x;
    const posY = m.y;
    const dirRad = ((m.angle || 0) * Math.PI) / 180;
    const dirX = Math.cos(dirRad);
    const dirY = Math.sin(dirRad);
    const planeLength = 0.66; // 66-degree field of view
    const planeX = -dirY * planeLength;
    const planeY = dirX * planeLength;

    // 1. Ceiling & Floor gradients with ambient lighting
    const halfH = Math.floor(this.height / 2);
    const lightLevel = (m.lightLevel ?? 0.85) + (m.torchFlicker ? Math.sin(this.frameCount * 0.22) * 0.04 : 0);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, halfH);
    ceilGrad.addColorStop(0, "#020617");
    ceilGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, this.width, halfH);

    const floorGrad = ctx.createLinearGradient(0, halfH, 0, this.height);
    floorGrad.addColorStop(0, "#1e293b");
    floorGrad.addColorStop(1, "#090d16");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, halfH, this.width, halfH);

    // 2. DDA Raycasting with Sliding Doors and Wall Textures
    const colWidth = 2; // Crisp 2px columns
    const numCols = Math.ceil(this.width / colWidth);
    const zBuffer = new Float32Array(numCols);

    for (let c = 0; c < numCols; c++) {
      const cameraX = (2 * c) / numCols - 1;
      const rayDirX = dirX + planeX * cameraX;
      const rayDirY = dirY + planeY * cameraX;

      let mapX = Math.floor(posX);
      let mapY = Math.floor(posY);

      const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
      const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));

      let stepX = 0;
      let stepY = 0;
      let sideDistX = 0;
      let sideDistY = 0;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (posX - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - posX) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (posY - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - posY) * deltaDistY;
      }

      let hit = 0;
      let side = 0;
      let wallType = 1;
      let wallXFrac = 0;
      let perpWallDist = 0;
      let steps = 0;

      while (hit === 0 && steps < 34) {
        steps++;
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }

        // Out of bounds
        if (mapX < 0 || mapX >= m.mapWidth || mapY < 0 || mapY >= m.mapHeight) {
          hit = 1;
          wallType = 1;
          perpWallDist = side === 0
            ? (mapX - posX + (1 - stepX) / 2) / (rayDirX || 1e-6)
            : (mapY - posY + (1 - stepY) / 2) / (rayDirY || 1e-6);
          break;
        }

        // Check if current tile is a sliding door
        const door = this.getDoorAt(mapX, mapY);
        if (door) {
          // Mid-cell plane distance
          const halfPlaneDist = side === 0
            ? sideDistX - deltaDistX * 0.5
            : sideDistY - deltaDistY * 0.5;

          const hitCoord = side === 0
            ? posY + halfPlaneDist * rayDirY
            : posX + halfPlaneDist * rayDirX;

          const cellFrac = hitCoord - Math.floor(hitCoord);

          // Check if ray hits the door slab or passes through the open gap
          if (cellFrac < (1.0 - door.openAmount)) {
            hit = 1;
            perpWallDist = halfPlaneDist;
            wallXFrac = cellFrac + door.openAmount;
            wallType = door.texture || 31;
            break;
          }
          // If through open gap, ray continues forward!
        }

        // Check for normal wall or switch wall
        const cellVal = m.map[mapY][mapX];
        if (cellVal > 0) {
          hit = 1;
          wallType = cellVal;
          perpWallDist = side === 0
            ? (mapX - posX + (1 - stepX) / 2) / (rayDirX || 1e-6)
            : (mapY - posY + (1 - stepY) / 2) / (rayDirY || 1e-6);

          if (side === 0) wallXFrac = posY + perpWallDist * rayDirY;
          else wallXFrac = posX + perpWallDist * rayDirX;
          wallXFrac -= Math.floor(wallXFrac);
          break;
        }
      }

      perpWallDist = Math.max(0.1, perpWallDist);
      zBuffer[c] = perpWallDist;

      const lineHeight = Math.floor((this.height / perpWallDist) * 1.05);
      const drawStart = Math.max(0, Math.floor(-lineHeight / 2 + halfH));
      const drawEnd = Math.min(this.height - 1, Math.floor(lineHeight / 2 + halfH));

      // Resolve texture graphic
      let textureId = 25; // default brick
      if (wallType === 2) textureId = 26; // mossy stone
      else if (wallType >= 20) textureId = wallType; // specific texture ID (31 door, 32 switch, 33 cyber, 38 iron)
      else if (m.mapWalls > 0) textureId = m.mapWalls;

      const wallGraphic = this.getGraphic(textureId);

      if (wallGraphic && wallGraphic.canvas) {
        const texX = Math.floor(wallXFrac * wallGraphic.width);
        ctx.drawImage(
          wallGraphic.canvas,
          texX,
          0,
          1,
          wallGraphic.height,
          c * colWidth,
          drawStart,
          colWidth,
          drawEnd - drawStart
        );

        // Doom-style lighting & distance falloff: Side 1 is 22% darker
        const fogFactor = Math.min(0.92, perpWallDist / (m.fogDistance || 12));
        const sideShade = side === 1 ? 0.22 : 0.0;
        const totalDarkness = Math.min(0.95, (1 - lightLevel) * 0.5 + sideShade + fogFactor * 0.7);

        if (totalDarkness > 0.05) {
          ctx.fillStyle = `rgba(2, 6, 23, ${totalDarkness})`;
          ctx.fillRect(c * colWidth, drawStart, colWidth, drawEnd - drawStart);
        }
      } else {
        ctx.fillStyle = wallType === 2 ? "#15803d" : "#991b1b";
        ctx.fillRect(c * colWidth, drawStart, colWidth, drawEnd - drawStart);
      }
    }

    // 3. 3D Sprites with Z-Buffer Occlusion (processes + map entities)
    const m8Sprites: { x: number; y: number; graph: number; size: number; dist: number }[] = [];

    // Mode 8 dynamic processes (monsters, player, etc.)
    for (const proc of this.processes.values()) {
      if (proc.isDead || proc.graph === 0 || proc.id === m.camera) continue;
      const gx = proc.x / 64;
      const gy = proc.y / 64;
      const dist = Math.hypot(gx - posX, gy - posY);
      m8Sprites.push({ x: proc.x, y: proc.y, graph: proc.graph, size: proc.size || 100, dist });
    }

    // Mode 8 placed level entities (keycards, medikits, ammo, torches, barrels)
    if (m.entities) {
      for (const ent of m.entities) {
        const gx = ent.x / 64;
        const gy = ent.y / 64;
        const dist = Math.hypot(gx - posX, gy - posY);
        m8Sprites.push({ x: ent.x, y: ent.y, graph: ent.graph, size: 85, dist });
      }
    }

    // Sort far-to-near (Painter's algorithm combined with Z-buffer)
    m8Sprites.sort((a, b) => b.dist - a.dist);

    for (const item of m8Sprites) {
      const sprX = item.x / 64 - posX;
      const sprY = item.y / 64 - posY;

      const invDet = 1.0 / (planeX * dirY - dirX * planeY);
      const transX = invDet * (dirY * sprX - dirX * sprY);
      const transY = invDet * (-planeY * sprX + planeX * sprY);

      if (transY <= 0.2) continue; // Behind camera

      const sprScreenX = Math.floor((this.width / 2) * (1 + transX / transY));
      const sprHeight = Math.abs(Math.floor((this.height / transY) * (item.size / 100)));
      const sprWidth = sprHeight;

      // Bobbing animation for keys, ammo, medikits
      const isPickup = item.graph === 34 || item.graph === 35 || item.graph === 36;
      const bobY = isPickup ? Math.sin(this.frameCount * 0.12 + item.x) * (sprHeight * 0.08) : 0;

      const drawStartY = Math.max(0, Math.floor(-sprHeight / 2 + halfH - bobY));
      const drawEndY = Math.min(this.height - 1, Math.floor(sprHeight / 2 + halfH - bobY));
      const drawStartX = Math.max(0, Math.floor(-sprWidth / 2 + sprScreenX));
      const drawEndX = Math.min(this.width - 1, Math.floor(sprWidth / 2 + sprScreenX));

      const graphic = this.getGraphic(item.graph);
      if (!graphic || !graphic.canvas) continue;

      for (let stripe = drawStartX; stripe < drawEndX; stripe += colWidth) {
        const colIdx = Math.floor(stripe / colWidth);
        if (colIdx >= 0 && colIdx < numCols && transY < zBuffer[colIdx]) {
          const texX = Math.floor(((stripe - (-sprWidth / 2 + sprScreenX)) * graphic.width) / sprWidth);
          if (texX >= 0 && texX < graphic.width) {
            ctx.drawImage(
              graphic.canvas,
              texX,
              0,
              1,
              graphic.height,
              stripe,
              drawStartY,
              colWidth,
              drawEndY - drawStartY
            );
          }
        }
      }
    }

    // 4. First-person Weapon HUD (ID 30: Plasma Blaster)
    const weaponG = this.getGraphic(30);
    if (weaponG && weaponG.canvas) {
      const bobbing = Math.sin(this.frameCount * 0.15) * 4;
      const wSize = 135;
      const wx = this.width / 2 - wSize / 2;
      const wy = this.height - wSize + 10 + bobbing;
      ctx.drawImage(weaponG.canvas, wx, wy, wSize, wSize);
    }

    // 5. Dungeon Mini-Radar with Doors and Triggers
    const radarSize = 104;
    const tileW = radarSize / m.mapWidth;
    const tileH = radarSize / m.mapHeight;
    const rx = this.width - radarSize - 16;
    const ry = 16;

    ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
    ctx.fillRect(rx, ry, radarSize, radarSize);
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, ry, radarSize, radarSize);

    // Map walls
    for (let my = 0; my < m.mapHeight; my++) {
      for (let mx = 0; mx < m.mapWidth; mx++) {
        if (m.map[my][mx] > 0) {
          ctx.fillStyle = m.map[my][mx] === 2 ? "#16a34a" : "#dc2626";
          ctx.fillRect(rx + mx * tileW, ry + my * tileH, tileW, tileH);
        }
      }
    }

    // Doors on radar
    if (m.doors) {
      for (const d of m.doors) {
        ctx.fillStyle = d.openAmount > 0.5 ? "#22c55e" : "#06b6d4";
        ctx.fillRect(rx + d.x * tileW + 1, ry + d.y * tileH + 1, tileW - 2, tileH - 2);
      }
    }

    // Triggers / Sensors on radar
    if (m.triggers) {
      for (const tr of m.triggers) {
        ctx.fillStyle = tr.activated ? "#eab308" : "#8b5cf6";
        ctx.fillRect(rx + tr.x * tileW + 2, ry + tr.y * tileH + 2, tileW - 4, tileH - 4);
      }
    }

    // Entities & pickups on radar
    if (m.entities) {
      for (const ent of m.entities) {
        const emx = (ent.x / 64) * tileW;
        const emy = (ent.y / 64) * tileH;
        ctx.fillStyle = ent.type === "key" ? "#facc15" : ent.type === "medikit" ? "#ef4444" : "#3b82f6";
        ctx.fillRect(rx + emx - 1, ry + emy - 1, 2.5, 2.5);
      }
    }

    // Player position and vision cone
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(rx + posX * tileW, ry + posY * tileH, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx + posX * tileW, ry + posY * tileH);
    ctx.lineTo(rx + (posX + dirX * 2.2) * tileW, ry + (posY + dirY * 2.2) * tileH);
    ctx.stroke();
  }

  /**
   * Returns current 3D camera coordinates, angle and perspective telemetry for real-time debugging
   */
  public getCamera3DInfo(): Camera3DInfo {
    const getCardinal = (deg: number) => {
      const norm = ((deg % 360) + 360) % 360;
      const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      const idx = Math.round(norm / 45) % 8;
      return dirs[idx];
    };

    const m8 = this.m8[0];
    if (m8 && m8.active) {
      const targetProc = m8.camera ? this.processes.get(m8.camera) : undefined;
      return {
        mode: "mode8",
        modeTitle: "Modo 8 (Raycaster 2.5D)",
        active: true,
        x: m8.x,
        y: m8.y,
        z: m8.z || 0,
        angle: m8.angle,
        height: m8.height || 32,
        pitch: m8.pitch || 0,
        fogDistance: m8.fogDistance || 14,
        cameraTargetId: m8.camera,
        cameraTargetName: targetProc ? targetProc.name : undefined,
        cardinal: getCardinal(m8.angle),
      };
    }

    const m7 = this.m7[0];
    if (m7 && m7.active) {
      const targetProc = m7.camera ? this.processes.get(m7.camera) : undefined;
      return {
        mode: "mode7",
        modeTitle: "Modo 7 (Perspectiva 3D)",
        active: true,
        x: m7.x,
        y: m7.y,
        z: m7.z || 0,
        angle: m7.angle,
        height: m7.height || 46,
        distance: m7.distance || 210,
        horizon: m7.horizon || Math.floor(this.height * 0.42),
        cameraTargetId: m7.camera,
        cameraTargetName: targetProc ? targetProc.name : undefined,
        cardinal: getCardinal(m7.angle),
      };
    }

    return {
      mode: "none",
      modeTitle: "2D Clásico",
      active: false,
      x: 0,
      y: 0,
      z: 0,
      angle: 0,
      height: 0,
      cardinal: "N",
    };
  }

  public setMode7Camera(params: Partial<DivMode7>) {
    if (this.m7[0]) {
      Object.assign(this.m7[0], params);
    }
  }

  public setMode8Camera(params: Partial<DivMode8>) {
    if (this.m8[0]) {
      Object.assign(this.m8[0], params);
    }
  }
}

export const defaultRuntime = new DivRuntime();
