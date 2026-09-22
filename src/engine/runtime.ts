import {
  DivProcess,
  DivGraphic,
  DivText,
  DivPrimitive,
  DivScroll,
  DivMode7,
  DivMode8,
  DivMode8Door,
  DivMode8Trigger,
  DivMode8Entity,
  DivMode8Sector,
  DivMode8Light,
  DivMode8PlacedModel,
  DivMode8PlacedVoxel,
  DivVectorWall,
  DivWorldFile,
  DivFluidType,
  DivMode8EngineMode,
  DivDoomLinedef,
  DivDoomSector,
  Camera3DInfo,
  C_M7,
  C_M8,
} from "../types";
import { soundEngine } from "./sound";
import { DEFAULT_SPRITES, createGraphicCanvas } from "./graphics";
import { DivFont, DEFAULT_DIV_FONTS, renderDivBitmapText, FONT_0_SYSTEM, FONT_1_ARCADE_GOLD } from "./fonts";
import { DivFpgPackage, DivMapFile, getInitialFpgPackages, getInitialMapFiles } from "./fpgManager";
import {
  BUILTIN_3D_MODELS,
  BUILTIN_VOXELS,
  Mode8FluidParticleEngine,
  calculatePointLighting,
  project3DPoint,
  render3DModel,
  renderVoxelObject,
  renderFirstPersonWeapon3D,
  Camera3DPose,
} from "./mode8Enhanced";
import { renderDoom2PolygonWorld, generateDoomStaircase } from "./doom2Engine";
import { Mode8WorkerPool, RaycastWorkerTask } from "./mode8Worker";

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

  // Mode 8 Enhanced Fluid Simulation & Web Worker Acceleration
  public fluidParticles: Mode8FluidParticleEngine = new Mode8FluidParticleEngine();
  public mode8Workers: Mode8WorkerPool = new Mode8WorkerPool(4);

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
  public fonts: Map<number, DivFont> = new Map();
  public fpgPackages: Map<number, DivFpgPackage> = new Map();
  public mapFiles: Map<number, DivMapFile> = new Map();
  public loadedSounds: Map<number, { id: number; name: string; filename: string; synthId: number }> = new Map();
  public loadedSongs: Map<number, { id: number; name: string; filename: string }> = new Map();
  public currentSongId: number = 0;
  public primitives: DivPrimitive[] = [];
  public permanentPrimitives: DivPrimitive[] = [];
  public scrolls: DivScroll[] = [];

  // ========================================================
  // 3D ENGINES: MODO 7 (Perspective Floor) & MODO 8 (Raycaster)
  // ========================================================
  public m7: DivMode7[] = [];
  public m8: DivMode8[] = [];
  public currentProcess: DivProcess | null = null;
  public camara_id: number = 0;
  public worldFiles: Map<string, DivWorldFile> = new Map();
  public activePalName: string = "mundo.pal";
  public activeFmpName: string = "texturas.fmp";

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
    DEFAULT_DIV_FONTS.forEach((f) => this.fonts.set(f.id, f));
    getInitialFpgPackages().forEach((p) => this.fpgPackages.set(p.id, p));
    getInitialMapFiles().forEach((m) => this.mapFiles.set(m.id, m));
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

    const defaultSectors: DivMode8Sector[][] = [];
    for (let y = 0; y < 16; y++) {
      const row: DivMode8Sector[] = [];
      for (let x = 0; x < 16; x++) {
        let floorHeight = 0;
        let ceilHeight = 1.0;
        let fluidType: DivFluidType = "none";
        let lightLevel = 0.85;

        // Elevated crypt steps in NW
        if (x >= 2 && x <= 4 && y >= 2 && y <= 4) {
          floorHeight = 0.35;
          ceilHeight = 1.5;
          lightLevel = 0.95;
        }
        // Central Lava Trench (bubbling fluid with fire embers)
        else if (x >= 7 && x <= 9 && y >= 7 && y <= 9 && defaultMaze[y][x] === 0) {
          floorHeight = -0.45;
          ceilHeight = 1.8;
          fluidType = "lava";
          lightLevel = 1.1;
        }
        // Cathedral high vault in SE
        else if (x >= 11 && x <= 14 && y >= 11 && y <= 14) {
          floorHeight = 0.15;
          ceilHeight = 2.4;
          lightLevel = 0.9;
        }
        // Toxic Acid canal in SW
        else if (x >= 1 && x <= 3 && y >= 12 && y <= 14 && defaultMaze[y][x] === 0) {
          floorHeight = -0.35;
          ceilHeight = 1.2;
          fluidType = "acid";
          lightLevel = 0.8;
        }

        row.push({ x, y, floorHeight, ceilHeight, fluidType, lightLevel });
      }
      defaultSectors.push(row);
    }

    const defaultLights: DivMode8Light[] = [
      { id: "l1", x: 1.5, y: 1.5, z: 0.6, radius: 4.5, r: 245, g: 130, b: 32, intensity: 1.0, flicker: true, castShadows: true, name: "Antorcha Norte" },
      { id: "l2", x: 8.5, y: 8.5, z: 0.2, radius: 6.5, r: 239, g: 68, b: 68, intensity: 1.2, flicker: true, castShadows: true, name: "Foso de Lava" },
      { id: "l3", x: 12.5, y: 12.5, z: 0.9, radius: 5.5, r: 56, g: 189, b: 248, intensity: 1.0, flicker: false, castShadows: true, name: "Luz Catedral Mística" },
      { id: "l4", x: 2.5, y: 13.5, z: 0.3, radius: 4.5, r: 34, g: 197, b: 94, intensity: 1.0, flicker: true, castShadows: true, name: "Vapor Tóxico Ácido" },
    ];

    const defaultModels: DivMode8PlacedModel[] = [
      { id: "m1", modelId: "knight", x: 12.5, y: 12.5, z: 0.15, yaw: 180, scale: 1.0, currentAnimation: "idle", name: "Paladín de Élite MD2" },
      { id: "m2", modelId: "gargoyle", x: 8.5, y: 8.5, z: 0.55, yaw: 45, scale: 1.05, currentAnimation: "flap", name: "Gárgola Demonio MD2" },
      { id: "m3", modelId: "column", x: 6.5, y: 6.5, z: 0, yaw: 0, scale: 1.2, name: "Columna con Fuego MD3" },
      { id: "m4", modelId: "drone", x: 3.5, y: 11.5, z: 0.45, yaw: 90, scale: 0.85, name: "Dron Guardián MD3" },
    ];

    const defaultVoxels: DivMode8PlacedVoxel[] = [
      { id: "v1", voxelId: "voxel_potion", x: 3.5, y: 3.5, z: 0.25, yaw: 0, rotSpeed: 2.5, scale: 1.0, name: "Poción Mágica Vóxel" },
      { id: "v2", voxelId: "voxel_skull", x: 13.5, y: 3.5, z: 0.35, yaw: 0, rotSpeed: 1.8, scale: 1.0, name: "Cráneo Reliquia Vóxel" },
      { id: "v3", voxelId: "voxel_barrel", x: 2.5, y: 12.5, z: -0.3, yaw: 0, rotSpeed: 0, scale: 1.1, name: "Barril Tóxico Vóxel" },
      { id: "v4", voxelId: "voxel_key", x: 12.5, y: 7.5, z: 0.2, yaw: 0, rotSpeed: 3.0, scale: 1.2, name: "Llave Dorada Vóxel" },
    ];

    const defaultVectorWalls: DivVectorWall[] = [
      // Diagonal angled walls in NW and NE chambers (chamfered corners)
      { id: "vw1", x1: 1.0, y1: 4.0, x2: 4.0, y2: 1.0, texture: 26, floorZ: 0, ceilZ: 1.5 },
      { id: "vw2", x1: 12.0, y1: 1.0, x2: 15.0, y2: 4.0, texture: 26, floorZ: 0, ceilZ: 1.5 },
      // Central hall diamond pillar
      { id: "dp1", x1: 7.5, y1: 8.0, x2: 8.0, y2: 7.5, texture: 33, floorZ: 0, ceilZ: 1.8 },
      { id: "dp2", x1: 8.0, y1: 7.5, x2: 8.5, y2: 8.0, texture: 33, floorZ: 0, ceilZ: 1.8 },
      { id: "dp3", x1: 8.5, y1: 8.0, x2: 8.0, y2: 8.5, texture: 33, floorZ: 0, ceilZ: 1.8 },
      { id: "dp4", x1: 8.0, y1: 8.5, x2: 7.5, y2: 8.0, texture: 33, floorZ: 0, ceilZ: 1.8 },
    ];

    const defaultDoors: DivMode8Door[] = [
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
    ];

    const defaultTriggers: DivMode8Trigger[] = [
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
    ];

    const defaultEntities: DivMode8Entity[] = [
      { id: "e1", type: "torch", x: 96, y: 96, graph: 28, name: "Antorcha Norte" },
      { id: "e2", type: "torch", x: 864, y: 96, graph: 28, name: "Antorcha Este" },
      { id: "e3", type: "key", x: 224, y: 224, graph: 34, name: "Tarjeta de Acceso" },
      { id: "e4", type: "medikit", x: 544, y: 224, graph: 35, name: "Botiquín Táctico" },
      { id: "e5", type: "ammo", x: 800, y: 224, graph: 36, name: "Caja de Munición" },
      { id: "e6", type: "barrel", x: 224, y: 480, graph: 29, name: "Barril Tóxico" },
    ];

    const worldNivel1: DivWorldFile = {
      name: "nivel1.wld",
      version: 1,
      width: 16,
      height: 16,
      ambientLight: 16,
      skyColor: "#020617",
      floorTexture: 25,
      ceilTexture: 25,
      map: defaultMaze,
      sectors: defaultSectors,
      vectorWalls: defaultVectorWalls,
      doors: defaultDoors,
      triggers: defaultTriggers,
      entities: defaultEntities,
      lights: defaultLights,
      placedModels: defaultModels,
      placedVoxels: defaultVoxels,
      playerStart: { x: 3.5, y: 3.5, z: 0, angle: 0 },
    };

    this.worldFiles.set("nivel1.wld", worldNivel1);
    this.worldFiles.set("nivel1", worldNivel1);
    this.worldFiles.set("dungeon.wld", worldNivel1);
    this.worldFiles.set("hexen.wld", worldNivel1);

    this.m8 = [
      {
        id: 0,
        file: 0,
        worldName: "nivel1.wld",
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
        fogDistance: 12,
        mapWidth: 16,
        mapHeight: 16,
        map: defaultMaze,
        engineMode: "hybrid",
        enableRaytracing: true,
        enableFluids: true,
        enableVoxels: true,
        enable3DModels: true,
        sectors: defaultSectors,
        vectorWalls: defaultVectorWalls,
        lights: defaultLights,
        placedModels: defaultModels,
        placedVoxels: defaultVoxels,
        doors: defaultDoors,
        triggers: defaultTriggers,
        entities: defaultEntities,
        lightLevel: 0.85,
        torchFlicker: true,
        showAutomap: false,
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
      m8_classic: "classic",
      m8_hybrid: "hybrid",
      fluid_water: "water",
      fluid_lava: "lava",
      fluid_acid: "acid",
      fluid_blood: "blood",
      fluid_none: "none",
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
    if (this.fpgPackages.has(0)) {
      const p = this.fpgPackages.get(0)!;
      p.graphics = Array.isArray(graphics) ? graphics : Array.from(graphics.values());
    }
  }

  public load_fpg(filename: string): number {
    const clean = filename.trim().toLowerCase();
    for (const [id, pkg] of this.fpgPackages.entries()) {
      if (
        pkg.filename.toLowerCase() === clean ||
        pkg.filename.toLowerCase().replace(".fpg", "") === clean.replace(".fpg", "") ||
        pkg.name.toLowerCase() === clean
      ) {
        return id;
      }
    }
    // Create new virtual FPG package seeded with default sprites
    const newId = Math.max(0, ...Array.from(this.fpgPackages.keys())) + 1;
    const baseGraphics =
      this.fpgPackages.get(0)?.graphics ||
      (Array.isArray(this.fpg) ? this.fpg : []) ||
      DEFAULT_SPRITES;
    this.fpgPackages.set(newId, {
      id: newId,
      name: filename.replace(/\.[^/.]+$/, ""),
      filename: filename.endsWith(".fpg") ? filename : `${filename}.fpg`,
      graphics: baseGraphics.map((g) => ({ ...g })),
    });
    return newId;
  }

  public unload_fpg(fileId: number): void {
    if (fileId !== 0) {
      this.fpgPackages.delete(fileId);
    }
  }

  public load_map(filename: string): number {
    const clean = filename.trim().toLowerCase();
    for (const [id, mapFile] of this.mapFiles.entries()) {
      if (mapFile.filename.toLowerCase() === clean) {
        return id;
      }
    }
    const newId = Math.max(100, ...Array.from(this.mapFiles.keys())) + 1;
    const defaultGraphic = DEFAULT_SPRITES[0] || {
      id: newId,
      name: filename,
      width: 32,
      height: 32,
      cx: 16,
      cy: 16,
      cpoints: [{ id: 0, x: 16, y: 16 }],
      pixels: [],
      palette: [],
    };
    this.mapFiles.set(newId, {
      id: newId,
      name: filename.replace(/\.[^/.]+$/, ""),
      filename: filename.endsWith(".map") ? filename : `${filename}.map`,
      graphic: { ...defaultGraphic, id: newId },
    });
    return newId;
  }

  public unload_map(mapId: number): void {
    this.mapFiles.delete(mapId);
  }

  public getGraphic(id: number, file: number = 0): DivGraphic | undefined {
    let g: DivGraphic | undefined;

    // 1. If file specified (>0), check that specific FPG package
    if (file > 0) {
      const pkg = this.fpgPackages.get(file);
      if (pkg) {
        g = pkg.graphics.find((item) => item.id === id);
      }
    }

    // 2. Check main FPG package (file 0)
    if (!g) {
      const mainPkg = this.fpgPackages.get(0);
      if (mainPkg) {
        g = mainPkg.graphics.find((item) => item.id === id);
      }
    }

    // 3. Check legacy _fpg or fpg array
    if (!g) {
      if (this._fpg && typeof this._fpg.get === "function") {
        g = this._fpg.get(id);
      } else if (this.fpg && typeof this.fpg.get === "function") {
        g = this.fpg.get(id);
      } else if (Array.isArray(this.fpg)) {
        g = (this.fpg as unknown as DivGraphic[]).find((item) => item.id === id);
      }
    }

    // 4. Check standalone map files (load_map)
    if (!g) {
      const mapFile = this.mapFiles.get(id);
      if (mapFile) {
        g = mapFile.graphic;
      }
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

  // DIV Games Studio standard aliases and helpers
  public get_dist(x1: number, y1: number, x2: number, y2: number): number {
    return this.getDist(x1, y1, x2, y2);
  }

  public fget_dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  public get_angle(x1: number, y1: number, x2: number, y2: number): number {
    return this.getAngle(x1, y1, x2, y2);
  }

  public fget_angle(x1: number, y1: number, x2: number, y2: number): number {
    const rad = Math.atan2(y2 - y1, x2 - x1);
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  }

  public near_angle(currentAngle: number, targetAngle: number, step: number = 5): number {
    let diff = (targetAngle - currentAngle) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) <= step) return targetAngle;
    return (currentAngle + Math.sign(diff) * step + 360) % 360;
  }

  public distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  public moveMode8WithCollision(
    x: number,
    y: number,
    dx: number,
    dy: number,
    radius: number = 0.22
  ): { x: number; y: number } {
    const m = this.m8[0];
    if (!m || !m.map || !m.active) return { x: x + dx, y: y + dy };

    const isBlocked = (testX: number, testY: number): boolean => {
      if (testX < 0.2 || testX >= m.mapWidth - 0.2 || testY < 0.2 || testY >= m.mapHeight - 0.2) {
        return true;
      }
      const corners = [
        [testX - radius, testY - radius],
        [testX + radius, testY - radius],
        [testX - radius, testY + radius],
        [testX + radius, testY + radius],
      ];
      for (const [cx, cy] of corners) {
        const mx = Math.floor(cx);
        const my = Math.floor(cy);
        if (mx < 0 || mx >= m.mapWidth || my < 0 || my >= m.mapHeight) return true;
        const wall = m.map[my]?.[mx];
        if (wall && wall > 0) return true;

        if (m.doors) {
          const door = m.doors.find((d) => d.x === mx && d.y === my);
          if (door && (door.state !== "open" || door.openAmount < 0.75)) {
            return true;
          }
        }
      }
      if (m.vectorWalls && m.vectorWalls.length > 0) {
        for (const vw of m.vectorWalls) {
          const d = this.distToSegment(testX, testY, vw.x1, vw.y1, vw.x2, vw.y2);
          if (d < radius) return true;
        }
      }
      return false;
    };

    // Try direct movement
    if (!isBlocked(x + dx, y + dy)) {
      return { x: x + dx, y: y + dy };
    }
    // Slide along X axis
    if (!isBlocked(x + dx, y)) {
      return { x: x + dx, y };
    }
    // Slide along Y axis
    if (!isBlocked(x, y + dy)) {
      return { x, y: y + dy };
    }
    return { x, y };
  }

  public advance(arg1: DivProcess | number, arg2?: DivProcess | number) {
    let proc: DivProcess | undefined;
    let speed: number = 0;

    if (typeof arg1 === "object" && arg1 !== null) {
      proc = arg1;
      speed = typeof arg2 === "number" ? arg2 : 0;
    } else if (typeof arg2 === "object" && arg2 !== null) {
      proc = arg2;
      speed = typeof arg1 === "number" ? arg1 : 0;
    } else {
      speed = Number(arg1) || 0;
      proc = this.currentProcess || this.processes.get(this.m8[0]?.camera || this.camara_id || 1);
    }

    if (!proc) return;

    const rawAngle = proc.angle || 0;
    const deg = Math.abs(rawAngle) >= 360 ? rawAngle / 1000 : rawAngle;
    const rad = (deg * Math.PI) / 180;

    if (this.m8[0]?.active && (proc.id === this.m8[0].camera || proc.id === this.camara_id || proc.id === 1)) {
      const isPixelCoord = proc.x > 20 || proc.y > 20;
      const currentWorldX = isPixelCoord ? proc.x / 64 : proc.x;
      const currentWorldY = isPixelCoord ? proc.y / 64 : proc.y;

      const tileSpeed = Math.abs(speed) >= 1 ? speed / 64 : speed;
      const dx = Math.cos(rad) * tileSpeed;
      const dy = Math.sin(rad) * tileSpeed;

      const newPos = this.moveMode8WithCollision(currentWorldX, currentWorldY, dx, dy);
      if (isPixelCoord) {
        proc.x = newPos.x * 64;
        proc.y = newPos.y * 64;
      } else {
        proc.x = newPos.x;
        proc.y = newPos.y;
      }
      this.m8[0].x = newPos.x;
      this.m8[0].y = newPos.y;
    } else {
      proc.x += Math.cos(rad) * speed;
      proc.y += Math.sin(rad) * speed;
    }
  }

  public xadvance(
    arg1: DivProcess | number,
    arg2?: DivProcess | number,
    arg3?: DivProcess | number
  ) {
    let proc: DivProcess | undefined;
    let angleOffset: number = 0;
    let speed: number = 0;

    if (typeof arg1 === "object" && arg1 !== null) {
      proc = arg1;
      speed = typeof arg2 === "number" ? arg2 : 0;
      angleOffset = typeof arg3 === "number" ? arg3 : 0;
    } else if (typeof arg3 === "object" && arg3 !== null) {
      proc = arg3;
      speed = typeof arg1 === "number" ? arg1 : 0;
      angleOffset = typeof arg2 === "number" ? arg2 : 0;
    } else {
      // In DIV Games Studio: xadvance(speed, angle_offset) e.g. xadvance(4, 90000)
      if (Math.abs(Number(arg2)) >= 360 || Math.abs(Number(arg2)) === 90 || Math.abs(Number(arg2)) === 180 || Math.abs(Number(arg2)) === 270) {
        speed = Number(arg1) || 0;
        angleOffset = Number(arg2) || 0;
      } else if (Math.abs(Number(arg1)) >= 360) {
        angleOffset = Number(arg1) || 0;
        speed = Number(arg2) || 0;
      } else {
        speed = Number(arg1) || 0;
        angleOffset = Number(arg2) || 0;
      }
      proc = this.currentProcess || this.processes.get(this.m8[0]?.camera || this.camara_id || 1);
    }

    if (!proc) return;

    // Angle offset relative to current process direction
    const procRaw = proc.angle || 0;
    const procDeg = Math.abs(procRaw) >= 360 ? procRaw / 1000 : procRaw;
    const offsetDeg = Math.abs(angleOffset) >= 360 ? angleOffset / 1000 : angleOffset;
    const totalDeg = procDeg + offsetDeg;
    const rad = (totalDeg * Math.PI) / 180;

    if (this.m8[0]?.active && (proc.id === this.m8[0].camera || proc.id === this.camara_id || proc.id === 1)) {
      const isPixelCoord = proc.x > 20 || proc.y > 20;
      const currentWorldX = isPixelCoord ? proc.x / 64 : proc.x;
      const currentWorldY = isPixelCoord ? proc.y / 64 : proc.y;

      const tileSpeed = Math.abs(speed) >= 1 ? speed / 64 : speed;
      const dx = Math.cos(rad) * tileSpeed;
      const dy = Math.sin(rad) * tileSpeed;

      const newPos = this.moveMode8WithCollision(currentWorldX, currentWorldY, dx, dy);
      if (isPixelCoord) {
        proc.x = newPos.x * 64;
        proc.y = newPos.y * 64;
      } else {
        proc.x = newPos.x;
        proc.y = newPos.y;
      }
      this.m8[0].x = newPos.x;
      this.m8[0].y = newPos.y;
    } else {
      proc.x += Math.cos(rad) * speed;
      proc.y += Math.sin(rad) * speed;
    }
  }

  public rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Sound & Audio API (DIV Games Studio)
   * Compatible con load_wav, load_snd, load_pcm, unload_wav, sound, load_song, song
   */
  public load_wav(nameOrFile: string | number): number {
    return this.load_snd(nameOrFile);
  }

  public load_pcm(nameOrFile: string | number): number {
    return this.load_snd(nameOrFile);
  }

  public load_snd(nameOrFile: string | number): number {
    if (nameOrFile === undefined || nameOrFile === null) return 1;
    const clean = String(nameOrFile).trim().toLowerCase();
    // Check if already registered
    for (const [id, snd] of this.loadedSounds.entries()) {
      if (
        snd.filename.toLowerCase() === clean ||
        snd.name.toLowerCase() === clean ||
        snd.filename.toLowerCase().replace(/\.(wav|snd|pcm)$/, "") === clean.replace(/\.(wav|snd|pcm)$/, "")
      ) {
        return id;
      }
    }

    // Determine synthetic preset ID based on common retro sound names
    let synthId = 1;
    if (/laser|shoot|plasma|shot|disparo|bala/.test(clean)) synthId = 1;
    else if (/explos|boom|bomb|detona/.test(clean)) synthId = 2;
    else if (/hit|hurt|golpe|dano|alien|crash|choque|herido/.test(clean)) synthId = 3;
    else if (/coin|moneda|pickup|oro|bonus|point/.test(clean)) synthId = 4;
    else if (/jump|salto|brinco/.test(clean)) synthId = 5;
    else if (/power|item|upgrade|subir/.test(clean)) synthId = 6;
    else if (/blip|beep|bounce|wall|pared|rebote|ping|pong|paddle|pala/.test(clean)) synthId = 7;
    else if (/door|puerta/.test(clean)) synthId = 8;
    else if (/switch|click|boton|sensor|interruptor/.test(clean)) synthId = 9;
    else if (/ammo|municion|recarga/.test(clean)) synthId = 10;
    else if (/medikit|vida|salud|health|curar/.test(clean)) synthId = 11;
    else if (/key|llave|fanfarria|gold|meta|goal|gol/.test(clean)) synthId = 12;
    else synthId = ((this.loadedSounds.size % 12) + 1);

    const newId = Math.max(0, ...Array.from(this.loadedSounds.keys())) + 1;
    this.loadedSounds.set(newId, {
      id: newId,
      name: String(nameOrFile).replace(/\.[^/.]+$/, ""),
      filename: clean.endsWith(".wav") || clean.endsWith(".snd") || clean.endsWith(".pcm") ? clean : `${clean}.wav`,
      synthId,
    });
    return newId;
  }

  public unload_wav(soundId: number) {
    this.loadedSounds.delete(soundId);
  }

  public unload_snd(soundId: number) {
    this.loadedSounds.delete(soundId);
  }

  public unload_pcm(soundId: number) {
    this.loadedSounds.delete(soundId);
  }

  /**
   * Reproduce un sonido en un canal y devuelve el identificador de canal (>0)
   * Compatible con: canal = sound(id, volumen, frecuencia);
   * Soporta tanto IDs devueltos por load_snd/load_wav como IDs numéricos directos de efectos (1..12).
   */
  public sound(id: number | string = 1, vol: number = 100, freq: number = 256): number {
    if (id === undefined || id === null) return 0;
    const numId = typeof id === "number" ? id : parseInt(String(id), 10) || 1;
    const safeVol = typeof vol === "number" && !isNaN(vol) ? vol : 100;
    const safeFreq = typeof freq === "number" && !isNaN(freq) && freq > 0 ? freq : 256;
    const loaded = this.loadedSounds.get(numId);
    if (!loaded) {
      // En DIV Games Studio si se pasa un ID directo o no registrado, reproducir preset sintético seguro sin romper
      return soundEngine.playSound(numId, safeVol, safeFreq);
    }
    return soundEngine.playSound(loaded.synthId, safeVol, safeFreq);
  }

  public sound_play(id: number | string = 1, vol: number = 100, freq: number = 256): number {
    return this.sound(id, vol, freq);
  }

  /**
   * Detiene un canal de sonido o todos los canales si no se especifica canal
   */
  public stop_sound(channelId?: number) {
    soundEngine.stopSound(channelId);
  }

  public sound_stop(channelId?: number) {
    soundEngine.stopSound(channelId);
  }

  /**
   * Altera el volumen y la frecuencia de un sonido que se está reproduciendo
   */
  public change_sound(channelId: number, vol: number, freq?: number) {
    soundEngine.changeSound(channelId, vol, freq);
  }

  /**
   * Comprueba si un canal de sonido sigue reproduciéndose (devuelve 1 si está activo, 0 si terminó)
   */
  public is_playing_sound(channelId: number): number {
    return soundEngine.isPlayingSound(channelId) ? 1 : 0;
  }

  /**
   * Modifica el volumen de un canal de forma gradual
   */
  public fade_sound(channelId: number, targetVol: number, speed: number = 10) {
    soundEngine.fadeSound(channelId, targetVol, speed);
  }

  /**
   * Ajuste global de volumen maestro y efectos
   */
  public set_volume(vol: number) {
    soundEngine.setMasterVolume(vol);
  }

  public set_sound_volume(vol: number) {
    soundEngine.setMasterVolume(vol);
  }

  public set_music_volume(vol: number) {
    soundEngine.setMasterVolume(vol);
  }

  public load_song(nameOrFile: string): number {
    const clean = nameOrFile.trim().toLowerCase();
    for (const [id, s] of this.loadedSongs.entries()) {
      if (s.filename.toLowerCase() === clean) return id;
    }
    const newId = Math.max(0, ...Array.from(this.loadedSongs.keys())) + 1;
    this.loadedSongs.set(newId, {
      id: newId,
      name: nameOrFile.replace(/\.[^/.]+$/, ""),
      filename: clean,
    });
    return newId;
  }

  public unload_song(songId: number) {
    if (this.currentSongId === songId) {
      this.stop_song();
    }
    this.loadedSongs.delete(songId);
  }

  public song(songId: number) {
    this.currentSongId = songId;
  }

  public stop_song() {
    this.currentSongId = 0;
  }

  /**
   * FNT Font management (DIV Games Studio)
   */
  public load_fnt(nameOrFont: string | DivFont): number {
    if (typeof nameOrFont === "object") {
      const id = typeof nameOrFont.id === "number" ? nameOrFont.id : this.fonts.size;
      this.fonts.set(id, nameOrFont);
      return id;
    }
    const clean = nameOrFont.trim().toLowerCase();
    // Search existing font by filename or name
    for (const [id, f] of this.fonts.entries()) {
      if (
        f.filename.toLowerCase() === clean ||
        f.name.toLowerCase() === clean ||
        f.filename.toLowerCase().replace(".fnt", "") === clean.replace(".fnt", "")
      ) {
        return id;
      }
    }
    // Register font under new ID, cloning base font
    const newId = Math.max(0, ...Array.from(this.fonts.keys())) + 1;
    const baseFont = this.fonts.get(1) || FONT_1_ARCADE_GOLD;
    this.fonts.set(newId, {
      ...baseFont,
      id: newId,
      name: nameOrFont.replace(/\.[^/.]+$/, ""),
      filename: clean.endsWith(".fnt") ? clean : `${clean}.fnt`,
    });
    return newId;
  }

  public unload_fnt(fontId: number) {
    if (fontId > 3) {
      this.fonts.delete(fontId);
    }
  }

  public loadFNT(font: DivFont) {
    this.fonts.set(font.id, font);
  }

  public getFont(id: number): DivFont {
    return this.fonts.get(id) || this.fonts.get(0) || FONT_0_SYSTEM;
  }

  /**
   * Text management
   */
  public write(font: number, x: number, y: number, align: number, text: string): number {
    if (font > 0 && !this.fonts.has(font)) {
      console.warn(
        `[DIV Runtime Error] write(): La fuente '${font}' no está cargada. Cárgala con load_fnt() antes de usar write().`
      );
    }
    const id = this.texts.size + 1;
    this.texts.set(id, { id, font, x, y, align, text });
    return id;
  }

  public writeInt(font: number, x: number, y: number, align: number, variableRef: string): number {
    if (font > 0 && !this.fonts.has(font)) {
      console.warn(
        `[DIV Runtime Error] writeInt(): La fuente '${font}' no está cargada. Cárgala con load_fnt() antes de usar write_int().`
      );
    }
    const id = this.texts.size + 1;
    this.texts.set(id, { id, font, x, y, align, text: "", variableRef });
    return id;
  }

  public write_int(font: number, x: number, y: number, align: number, variableRef: string): number {
    return this.writeInt(font, x, y, align, variableRef);
  }

  public write_string(font: number, x: number, y: number, align: number, text: string): number {
    return this.write(font, x, y, align, text);
  }

  public move_text(id: number, x: number, y: number): void {
    const t = this.texts.get(id);
    if (t) {
      t.x = x;
      t.y = y;
    }
  }

  public deleteText(id: number | "all_text") {
    if (id === "all_text" || id === 0) {
      this.texts.clear();
    } else {
      this.texts.delete(id);
    }
  }

  public delete_text(id: number | "all_text") {
    this.deleteText(id);
  }

  /**
   * Primitive drawing
   */
  public drawBox(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.primitives.push({ id: this.primitives.length, type: "box", x1, y1, x2, y2, color });
  }

  public draw_box(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.drawBox(x1, y1, x2, y2, color);
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

  public draw_circle(x: number, y: number, r: number, color: string) {
    this.drawCircle(x, y, r, color);
  }

  public drawFCircle(x: number, y: number, r: number, color: string) {
    this.primitives.push({ id: this.primitives.length, type: "fcircle", x1: x, y1: y, x2: x, y2: y, r, color });
  }

  public draw_fcircle(x: number, y: number, r: number, color: string) {
    this.drawFCircle(x, y, r, color);
  }

  public drawLine(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.primitives.push({ id: this.primitives.length, type: "line", x1, y1, x2, y2, color });
  }

  public draw_line(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.drawLine(x1, y1, x2, y2, color);
  }

  public screenColor(color: string) {
    this.backgroundColor = color;
  }

  public screen_color(color: string) {
    this.screenColor(color);
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
    if (!keyName) return false;
    const norm = keyName.toLowerCase().replace(/^_/, "");
    if (this.keyState[norm]) return true;
    if (norm === "up" && (this.keyState["arrowup"] || this.keyState["w"] || this.keyState["keyw"])) return true;
    if (norm === "down" && (this.keyState["arrowdown"] || this.keyState["s"] || this.keyState["keys"])) return true;
    if (norm === "left" && (this.keyState["arrowleft"] || this.keyState["a"] || this.keyState["keya"])) return true;
    if (norm === "right" && (this.keyState["arrowright"] || this.keyState["d"] || this.keyState["keyd"])) return true;
    if (norm === "space" && (this.keyState[" "] || this.keyState["space"])) return true;
    if (norm.startsWith("key") && this.keyState[norm.slice(3)]) return true;
    if (norm.startsWith("digit") && this.keyState[norm.slice(5)]) return true;
    if (this.keyState["key" + norm]) return true;
    if (this.keyState["digit" + norm]) return true;
    return false;
  }

  public isKeyDown(keyName: string): boolean {
    return this.key(keyName);
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

  public currentPalette: string[] = [];

  public setPalette(palette: string[]) {
    if (Array.isArray(palette) && palette.length > 0) {
      this.currentPalette = [...palette];
    }
  }

  public getPalette(): string[] {
    return this.currentPalette;
  }

  public load_pal(palFile: string): boolean {
    this.activePalName = palFile || "mundo.pal";
    return true;
  }

  /**
   * Rota una sección de la paleta cíclicamente (ideal para animar agua o fuego sin coste de CPU)
   * roll_palette(primer_color, ultimo_color, incremento)
   */
  public roll_palette(first: number, last: number, steps: number = 1) {
    if (!this.currentPalette || this.currentPalette.length < 256) return;
    const min = Math.max(0, Math.min(first, last));
    const max = Math.min(255, Math.max(first, last));
    if (max <= min) return;

    for (let s = 0; s < Math.abs(steps); s++) {
      if (steps > 0) {
        const lastColor = this.currentPalette[max];
        for (let i = max; i > min; i--) {
          this.currentPalette[i] = this.currentPalette[i - 1];
        }
        this.currentPalette[min] = lastColor;
      } else {
        const firstColor = this.currentPalette[min];
        for (let i = min; i < max; i++) {
          this.currentPalette[i] = this.currentPalette[i + 1];
        }
        this.currentPalette[max] = firstColor;
      }
    }
  }

  /**
   * Asigna componentes RGB a un color de la paleta (DIV DOS escala 0..63 o moderna 0..255)
   */
  public set_color(index: number, r: number, g: number, b: number) {
    if (!this.currentPalette) return;
    const idx = Math.max(0, Math.min(255, index));
    // Si los valores vienen en rango DIV DOS (<= 63), convertirlos a 0..255
    const r255 = r <= 63 ? Math.round((r / 63) * 255) : Math.min(255, r);
    const g255 = g <= 63 ? Math.round((g / 63) * 255) : Math.min(255, g);
    const b255 = b <= 63 ? Math.round((b / 63) * 255) : Math.min(255, b);
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    this.currentPalette[idx] = `#${toHex(r255)}${toHex(g255)}${toHex(b255)}`;
  }

  public get_color(index: number) {
    const idx = Math.max(0, Math.min(255, index));
    const hex = this.currentPalette[idx] || "#000000";
    return {
      index: idx,
      hex,
    };
  }

  public fade_on() {}
  public fade_off() {}

  public load_fmp(fmpFile: string): boolean {
    this.activeFmpName = fmpFile || "texturas.fmp";
    return true;
  }

  public load_wld(wldFile: string, data?: DivWorldFile): DivWorldFile | null {
    const clean = (wldFile || "").toLowerCase().trim();
    if (data) {
      this.worldFiles.set(clean, data);
      return data;
    }
    return (
      this.worldFiles.get(clean) ||
      this.worldFiles.get(clean + ".wld") ||
      this.worldFiles.get("nivel1.wld") ||
      null
    );
  }

  public save_wld(wldFile: string, data: DivWorldFile) {
    const clean = (wldFile || "").toLowerCase().trim();
    this.worldFiles.set(clean, data);
    if (!clean.endsWith(".wld")) {
      this.worldFiles.set(clean + ".wld", data);
    }
  }

  /**
   * DIV2 Style Raycast Start:
   * start_raycast(archivo_wld, archivo_fmp_texturas, ambient_light)
   * Example: start_raycast("nivel1.wld", "texturas.fmp", 16);
   */
  public start_raycast(
    wldFile: string | number = "nivel1.wld",
    fmpFile?: string | number,
    ambientLight: number = 16
  ) {
    if (!this.m8[0]) this.initMode8();
    const m = this.m8[0];

    const wldName = typeof wldFile === "string" ? wldFile.trim() : `nivel${wldFile}.wld`;
    const cleanKey = wldName.toLowerCase();
    const world =
      this.worldFiles.get(cleanKey) ||
      this.worldFiles.get(cleanKey + ".wld") ||
      this.worldFiles.get(cleanKey.replace(/\.wld$/, "")) ||
      this.worldFiles.get("nivel1.wld");

    if (world) {
      m.worldName = wldName;
      m.map = world.map.map((row) => [...row]);
      m.mapHeight = world.map.length;
      m.mapWidth = world.map[0]?.length || 16;
      m.sectors = world.sectors?.map((row) => row.map((sec) => ({ ...sec })));
      m.vectorWalls = world.vectorWalls ? world.vectorWalls.map((vw) => ({ ...vw })) : [];
      m.doors = world.doors ? world.doors.map((d) => ({ ...d })) : [];
      m.triggers = world.triggers ? world.triggers.map((t) => ({ ...t })) : [];
      m.entities = world.entities ? world.entities.map((e) => ({ ...e })) : [];
      m.lights = world.lights ? world.lights.map((l) => ({ ...l })) : [];
      m.placedModels = world.placedModels ? world.placedModels.map((pm) => ({ ...pm })) : [];
      m.placedVoxels = world.placedVoxels ? world.placedVoxels.map((pv) => ({ ...pv })) : [];
      if (world.playerStart) {
        m.x = world.playerStart.x;
        m.y = world.playerStart.y;
        m.z = world.playerStart.z || 0;
        m.angle = world.playerStart.angle || 0;
      }
    }

    if (fmpFile) {
      this.load_fmp(typeof fmpFile === "string" ? fmpFile : "texturas.fmp");
    }

    m.lightLevel = Math.max(0.2, Math.min(1.5, Number(ambientLight) / 16));
    m.showAutomap = false;
    m.active = true;
    this.camara_id = 1;
    m.camera = 1;

    const p1 = this.processes.get(1);
    if (p1) {
      p1.x = m.x * 64;
      p1.y = m.y * 64;
      p1.angle = m.angle * 1000;
    }
  }

  public stop_raycast() {
    this.stop_mode8(0);
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
    m.showAutomap = false;
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
    this.loadedSounds.clear();
    this.loadedSongs.clear();
    this.currentSongId = 0;
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
          this.currentProcess = proc;
          const result = proc.generator.next();
          this.currentProcess = null;
          if (result.done) {
            proc.isDead = true;
            this.processes.delete(id);
          }
        } catch (err: any) {
          this.currentProcess = null;
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

        const graphic = this.getGraphic(proc.graph, proc.file || 0);
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

    // Texts (HUD / Labels / Scores / FNT Bitmap Fonts)
    for (const txt of this.texts.values()) {
      let content = txt.text;
      if (txt.variableRef) {
        const val = this.globalVars[txt.variableRef] ?? 0;
        content = txt.text ? `${txt.text}: ${val}` : `${txt.variableRef.toUpperCase()}: ${val}`;
      }

      const font = this.fonts.get(txt.font) || (txt.font === 0 ? this.fonts.get(0) : undefined);
      if (font) {
        renderDivBitmapText(ctx, font, content, txt.x, txt.y, txt.align);
      } else {
        ctx.font = '13px "Fira Code", monospace';
        ctx.textBaseline = "top";
        ctx.fillStyle = "#ffffff";
        if (txt.align === 1) {
          ctx.textAlign = "center";
        } else if (txt.align === 2) {
          ctx.textAlign = "right";
        } else {
          ctx.textAlign = "left";
        }
        ctx.fillText(content, txt.x, txt.y);
      }
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
      const graphic = this.getGraphic(proc.graph, proc.file || 0);
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
  * Sets new Mode 8 map, doors, triggers, entities, sectors, lights, and 3D objects
  */
  public setMode8Map(
    map: number[][],
    doors?: DivMode8Door[],
    triggers?: DivMode8Trigger[],
    entities?: DivMode8Entity[],
    sectors?: DivMode8Sector[][],
    lights?: DivMode8Light[],
    placedModels?: DivMode8PlacedModel[],
    placedVoxels?: DivMode8PlacedVoxel[],
    engineMode?: DivMode8EngineMode,
    enableRaytracing?: boolean,
    enableFluids?: boolean
  ) {
    if (!this.m8[0]) this.initMode8();
    const m = this.m8[0];
    m.map = map;
    m.mapHeight = map.length;
    m.mapWidth = map[0]?.length || 16;
    if (doors) m.doors = doors;
    if (triggers) m.triggers = triggers;
    if (entities) m.entities = entities;
    if (sectors) m.sectors = sectors;
    if (lights) m.lights = lights;
    if (placedModels) m.placedModels = placedModels;
    if (placedVoxels) m.placedVoxels = placedVoxels;
    if (engineMode) m.engineMode = engineMode;
    if (enableRaytracing !== undefined) m.enableRaytracing = enableRaytracing;
    if (enableFluids !== undefined) m.enableFluids = enableFluids;
  }

  /**
   * Frame tick for Mode 8 systems: sliding doors, triggers, item pickups, fluid particles, and 3D object updates
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

    // 4. Particle-based fluid simulation in hybrid mode
    if (m.engineMode === "hybrid" && m.enableFluids !== false && m.sectors) {
      this.fluidParticles.update(m.sectors, m.mapWidth, m.mapHeight);
    }

    // 5. Continuous 3D Voxel rotation & MD2/MD3 model animation frames
    if (m.placedVoxels) {
      for (const vox of m.placedVoxels) {
        vox.yaw = (vox.yaw + (vox.rotSpeed ?? 2.5)) % 360;
      }
    }
    if (m.placedModels) {
      for (const mod of m.placedModels) {
        mod.animFrame = ((mod.animFrame || 0) + (mod.animationSpeed || 0.08)) % 1;
      }
    }

    // 6. First-Person 3D Weapon Attack and Walk Bobbing
    if (m.weaponAttackTime !== undefined && m.weaponAttackTime > 0) {
      m.weaponAttackTime += 0.09;
      if (m.weaponAttackTime >= 1.0) {
        m.weaponAttackTime = 0;
      }
    }
    if (
      this.keyState["w"] ||
      this.keyState["W"] ||
      this.keyState["s"] ||
      this.keyState["S"] ||
      this.keyState["ArrowUp"] ||
      this.keyState["ArrowDown"]
    ) {
      m.walkCycle = ((m.walkCycle || 0) + 0.16) % (Math.PI * 2);
    }
  }

  /**
   * Render Mode 8: Hexen / GZDoom Enhanced 3D Raycasting Engine
   * Supports both Classic 2D Retro Mode and Hybrid 3D Mode:
   * - Hexen variable sector heights and depths (floor/ceiling)
   * - Dynamic point lights with ray-traced shadow casting
   * - MD2 / MD3 3D models with vertex projection and animations
   * - 3D Voxel rotating sprites with depth occlusion
   * - Particle-based fluid rendering (lava, acid, water, blood)
   */
  private renderMode8(ctx: CanvasRenderingContext2D) {
    const m = this.m8[0];
    if (!m) return;

    // Follow camera process if assigned
    const camId = m.camera || this.camara_id || 1;
    const camTarget = this.processes.get(camId);
    if (camTarget && !camTarget.isDead) {
      if (camTarget.x > 20 || camTarget.y > 20) {
        m.x = camTarget.x / 64;
        m.y = camTarget.y / 64;
      } else {
        m.x = camTarget.x;
        m.y = camTarget.y;
      }
      if (camTarget.z !== undefined && camTarget.z !== 0) {
        m.z = Math.abs(camTarget.z) > 10 ? camTarget.z / 64 : camTarget.z;
      }
      const rawAngle = camTarget.angle || 0;
      m.angle = Math.abs(rawAngle) >= 360 ? rawAngle / 1000 : rawAngle;
    }

    const posX = m.x;
    const posY = m.y;
    const dirRad = ((m.angle || 0) * Math.PI) / 180;
    const dirX = Math.cos(dirRad);
    const dirY = Math.sin(dirRad);
    const planeLength = 0.66; // 66-degree field of view
    const planeX = -dirY * planeLength;
    const planeY = dirX * planeLength;

    const isHybrid = m.engineMode === "hybrid";
    const isDoom2 = m.engineMode === "doom2" || (m.doomLinedefs && m.doomLinedefs.length > 0);
    const pitchOffset = Math.max(-120, Math.min(120, m.pitch || 0));
    const halfH = Math.floor(this.height / 2);
    const horizonY = halfH + pitchOffset;

    // --- DOOM 2 TRUE POLYGON SECTOR & PORTAL RENDERER ---
    if (isDoom2 && m.doomLinedefs && m.doomLinedefs.length > 0) {
      renderDoom2PolygonWorld(
        ctx,
        this.width,
        this.height,
        {
          x: posX,
          y: posY,
          z: (m.z || 0) + 0.6,
          angle: m.angle || 0,
          pitch: pitchOffset,
        },
        m.doomLinedefs,
        m.doomSectors || [],
        m.entities || [],
        m.placedModels || [],
        m.lights || [],
        m.walkCycle || 0,
        m.weaponModel,
        m.weaponAttackTime || 0,
        m.placedVoxels || []
      );
      return;
    }

    // Player current sector and eye height
    const playerCellX = Math.max(0, Math.min(m.mapWidth - 1, Math.floor(posX)));
    const playerCellY = Math.max(0, Math.min(m.mapHeight - 1, Math.floor(posY)));
    const playerSector = m.sectors?.[playerCellY]?.[playerCellX];
    const playerFloorZ = isHybrid ? (playerSector?.floorHeight ?? 0) : 0;
    const playerEyeZ = (m.z || 0) + playerFloorZ + 0.5;

    // Camera pose object used for 3D model, voxel, and particle projection
    const camPose: Camera3DPose = {
      x: posX,
      y: posY,
      z: playerEyeZ,
      angle: m.angle || 0,
      pitch: pitchOffset,
      fov: 66,
      screenWidth: this.width,
      screenHeight: this.height,
    };

    // 1. Ceiling & Floor gradients with ambient lighting & Hexen atmosphere
    const lightLevel = (m.lightLevel ?? 0.85) + (m.torchFlicker ? Math.sin(this.frameCount * 0.22) * 0.04 : 0);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    ceilGrad.addColorStop(0, "#020617");
    ceilGrad.addColorStop(1, isHybrid ? "#0c1527" : "#0f172a");
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, this.width, horizonY);

    // Fixed perspective floor plane anchored firmly to world space
    const floorStart = Math.max(0, Math.floor(horizonY));
    const floorGrad = ctx.createLinearGradient(0, floorStart, 0, this.height);
    floorGrad.addColorStop(0, isHybrid ? "#162033" : "#1e293b");
    floorGrad.addColorStop(0.35, isHybrid ? "#0f172a" : "#182334");
    floorGrad.addColorStop(1, "#070b14");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorStart, this.width, this.height - floorStart);

    // Perspective depth lines on floor
    ctx.save();
    ctx.strokeStyle = isHybrid ? "rgba(56, 189, 248, 0.06)" : "rgba(148, 163, 184, 0.05)";
    ctx.lineWidth = 1;
    for (let fy = floorStart + 4; fy < this.height; fy += 14) {
      ctx.beginPath();
      ctx.moveTo(0, fy);
      ctx.lineTo(this.width, fy);
      ctx.stroke();
    }
    ctx.restore();

    // 2. DDA + Vector Raycasting with Variable Heights, Sliding Doors and Dynamic Lighting
    // Adaptive column resolution: maintains 160-220 crisp columns on all resolutions and devices
    const colWidth = this.width >= 800 ? 4 : this.width >= 600 ? 3 : 2;
    const numCols = Math.ceil(this.width / colWidth);

    const workerTask: RaycastWorkerTask = {
      colStart: 0,
      colEnd: numCols,
      numCols,
      colWidth,
      screenWidth: this.width,
      screenHeight: this.height,
      posX,
      posY,
      playerEyeZ,
      dirX,
      dirY,
      planeX,
      planeY,
      horizonY,
      isHybrid,
      mapWidth: m.mapWidth,
      mapHeight: m.mapHeight,
      map: m.map,
      sectors: m.sectors,
      doors: m.doors,
      vectorWalls: m.vectorWalls,
    };

    const workerResult = this.mode8Workers.executeSync(workerTask);
    const zBuffer = workerResult.zBuffer;

    // Pre-filter lights that can actually reach visible walls near player
    const activeLights = (isHybrid && m.enableRaytracing !== false && m.lights && m.lights.length > 0)
      ? m.lights.filter((l) => Math.hypot(l.x - posX, l.y - posY) <= (l.radius + 16))
      : [];

    let lastLightAlpha = 0;
    let lastLightR = 0;
    let lastLightG = 0;
    let lastLightB = 0;

    for (let c = 0; c < numCols; c++) {
      const cameraX = (2 * c) / numCols - 1;
      const rayDirX = dirX + planeX * cameraX;
      const rayDirY = dirY + planeY * cameraX;

      const perpWallDist = workerResult.zBuffer[c];
      const wallType = workerResult.wallTypes[c];
      const wallXFrac = workerResult.wallXFracs[c];
      const drawStart = workerResult.drawStarts[c];
      const drawEnd = workerResult.drawEnds[c];
      const side = workerResult.sides[c];

      const wallHitX = posX + perpWallDist * rayDirX;
      const wallHitY = posY + perpWallDist * rayDirY;
      const mapX = Math.floor(wallHitX);
      const mapY = Math.floor(wallHitY);

      if (isHybrid && m.sectors) {
        const targetSec = m.sectors[mapY]?.[mapX];
        const wallFloorZ = targetSec?.floorHeight ?? 0;
        // Fluid trench floor rendering
        if (targetSec?.fluidType && targetSec.fluidType !== "none" && drawEnd < this.height - 1) {
          const fluidColors: Record<string, string> = {
            lava: "rgba(239, 68, 68, 0.75)",
            acid: "rgba(34, 197, 94, 0.75)",
            water: "rgba(14, 165, 233, 0.75)",
            blood: "rgba(185, 28, 28, 0.75)",
          };
          ctx.fillStyle = fluidColors[targetSec.fluidType] || "rgba(239, 68, 68, 0.75)";
          ctx.fillRect(c * colWidth, drawEnd, colWidth, Math.min(18, this.height - drawEnd));
        }

        // If wall is raised above adjacent floor, draw lower step to eliminate flying gap
        if (drawEnd < this.height - 1) {
          const stepX = rayDirX < 0 ? -1 : 1;
          const stepY = rayDirY < 0 ? -1 : 1;
          const adjX = side === 0 ? mapX - stepX : mapX;
          const adjY = side === 1 ? mapY - stepY : mapY;
          const adjFloorZ = m.sectors[adjY]?.[adjX]?.floorHeight ?? playerFloorZ;
          if (wallFloorZ > adjFloorZ) {
            const stepBottomY = Math.min(
              this.height - 1,
              Math.floor(horizonY + ((playerEyeZ - adjFloorZ) * (this.height * 0.8)) / perpWallDist)
            );
            if (stepBottomY > drawEnd) {
              ctx.fillStyle = "#1e293b";
              ctx.fillRect(c * colWidth, drawEnd, colWidth, stepBottomY - drawEnd);
            }
          }
        }
      }

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
          Math.max(1, drawEnd - drawStart)
        );

        // Ray-traced dynamic lighting with shadows in hybrid mode
        // Smooth 2-column sampling for 2x faster lighting across walls
        if (activeLights.length > 0) {
          if (c % 2 === 0 || lastLightAlpha === 0) {
            const hitWx = posX + perpWallDist * rayDirX;
            const hitWy = posY + perpWallDist * rayDirY;
            const hitWz = 0.5;
            const colStepX = rayDirX < 0 ? -1 : 1;
            const colStepY = rayDirY < 0 ? -1 : 1;
            const normX = side === 0 ? -colStepX : 0;
            const normY = side === 1 ? -colStepY : 0;

            const pLight = calculatePointLighting(
              hitWx,
              hitWy,
              hitWz,
              normX,
              normY,
              0,
              activeLights,
              m.map,
              m.mapWidth,
              m.mapHeight,
              m.lightLevel ?? 0.35,
              m.fogColor || "#030712",
              true
            );

            lastLightAlpha = Math.min(0.6, pLight.intensity * 0.5);
            lastLightR = pLight.r;
            lastLightG = pLight.g;
            lastLightB = pLight.b;
          }

          if (lastLightAlpha > 0.06) {
            ctx.fillStyle = `rgba(${lastLightR}, ${lastLightG}, ${lastLightB}, ${lastLightAlpha})`;
            ctx.fillRect(c * colWidth, drawStart, colWidth, Math.max(1, drawEnd - drawStart));
          }
        }

        // Distance fog and directional wall darkness
        const fogFactor = Math.min(0.92, perpWallDist / (m.fogDistance || 12));
        const sideShade = side === 1 ? 0.2 : 0.0;
        const totalDarkness = Math.min(0.95, (1 - lightLevel) * 0.45 + sideShade + fogFactor * 0.65);

        if (totalDarkness > 0.06) {
          ctx.fillStyle = `rgba(2, 6, 23, ${totalDarkness})`;
          ctx.fillRect(c * colWidth, drawStart, colWidth, Math.max(1, drawEnd - drawStart));
        }
      } else {
        ctx.fillStyle = wallType === 2 ? "#15803d" : "#991b1b";
        ctx.fillRect(c * colWidth, drawStart, colWidth, Math.max(1, drawEnd - drawStart));
      }
    }

    // 3. Particle-Based Fluid Simulation Rendering (Lava, Acid, Water, Blood)
    if (isHybrid && m.enableFluids !== false && this.fluidParticles.particles.length > 0) {
      for (const p of this.fluidParticles.particles) {
        const proj = project3DPoint(p.x, p.y, p.z, camPose);
        if (proj.visible && proj.screenX >= 0 && proj.screenX < this.width) {
          const colIdx = Math.floor(proj.screenX / colWidth);
          if (colIdx >= 0 && colIdx < numCols && proj.depth < zBuffer[colIdx]) {
            const rad = Math.max(1.5, Math.min(10, (p.size * 22) / proj.depth));
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(proj.screenX, proj.screenY, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
        }
      }
    }

    // 4. Render 3D MD2 / MD3 Models with Z-Buffer Occlusion
    if (isHybrid && m.enable3DModels !== false && m.placedModels && m.placedModels.length > 0) {
      // Sort models far-to-near
      const sortedModels = [...m.placedModels].sort((a, b) => {
        const distA = Math.hypot(a.x - posX, a.y - posY);
        const distB = Math.hypot(b.x - posX, b.y - posY);
        return distB - distA;
      });

      for (const placed of sortedModels) {
        const modelDef = BUILTIN_3D_MODELS[placed.modelId];
        if (modelDef) {
          render3DModel(
            ctx,
            modelDef,
            placed,
            camPose,
            zBuffer,
            colWidth,
            m.lights,
            m.fogColor || "#030712"
          );
        }
      }
    }

    // 5. Render 3D Voxel Objects with Depth Occlusion
    if (isHybrid && m.enableVoxels !== false && m.placedVoxels && m.placedVoxels.length > 0) {
      const sortedVoxels = [...m.placedVoxels].sort((a, b) => {
        const distA = Math.hypot(a.x - posX, a.y - posY);
        const distB = Math.hypot(b.x - posX, b.y - posY);
        return distB - distA;
      });

      for (const placed of sortedVoxels) {
        const voxelDef = BUILTIN_VOXELS[placed.voxelId];
        if (voxelDef) {
          renderVoxelObject(
            ctx,
            voxelDef,
            placed,
            camPose,
            zBuffer,
            colWidth,
            m.lights,
            m.fogColor || "#030712"
          );
        }
      }
    }

    // 6. 3D Billboard Sprites with Z-Buffer Occlusion (processes + map entities)
    const m8Sprites: { x: number; y: number; graph: number; size: number; dist: number }[] = [];

    // Dynamic processes
    for (const proc of this.processes.values()) {
      if (proc.isDead || proc.graph === 0 || proc.id === m.camera) continue;
      const gx = proc.x / 64;
      const gy = proc.y / 64;
      const dist = Math.hypot(gx - posX, gy - posY);
      m8Sprites.push({ x: proc.x, y: proc.y, graph: proc.graph, size: proc.size || 100, dist });
    }

    // Level pickups and decorative entities
    if (m.entities) {
      for (const ent of m.entities) {
        const gx = ent.x / 64;
        const gy = ent.y / 64;
        const dist = Math.hypot(gx - posX, gy - posY);
        m8Sprites.push({ x: ent.x, y: ent.y, graph: ent.graph, size: 85, dist });
      }
    }

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

      const drawStartY = Math.max(0, Math.floor(-sprHeight / 2 + horizonY - bobY));
      const drawEndY = Math.min(this.height - 1, Math.floor(sprHeight / 2 + horizonY - bobY));
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
              Math.max(1, drawEndY - drawStartY)
            );
          }
        }
      }
    }

    // 7. First-person 3D MD2 / MD3 weapon or 2D weapon HUD
    if (m.weaponModel) {
      renderFirstPersonWeapon3D(
        ctx,
        m.weaponModel,
        m.weaponAttackTime || 0,
        m.walkCycle || 0,
        this.width,
        this.height
      );
    } else {
      const weaponG = this.getGraphic(30);
      if (weaponG && weaponG.canvas) {
        const bobbing = Math.sin(this.frameCount * 0.15) * 4;
        const wSize = 135;
        const wx = this.width / 2 - wSize / 2;
        const wy = this.height - wSize + 10 + bobbing;
        ctx.drawImage(weaponG.canvas, wx, wy, wSize, wSize);
      }
    }

    // 8. Hexen / GZDoom Tactical Mini-Radar (Automap)
    // In DIV Games Studio 2 Mode 8, the automap/radar is NOT displayed during gameplay unless requested or toggled with Tab.
    if (m.showAutomap) {
      const radarSize = 108;
      const tileW = radarSize / m.mapWidth;
      const tileH = radarSize / m.mapHeight;
      const rx = this.width - radarSize - 16;
      const ry = 16;

      ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
      ctx.fillRect(rx, ry, radarSize, radarSize);
      ctx.strokeStyle = isHybrid ? "#38bdf8" : "#0284c7";
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, radarSize, radarSize);

      // Fluid tiles on radar
      if (isHybrid && m.sectors) {
        for (let my = 0; my < m.mapHeight; my++) {
          for (let mx = 0; mx < m.mapWidth; mx++) {
            const sec = m.sectors[my]?.[mx];
            if (sec && sec.fluidType !== "none") {
              const fluidColor = sec.fluidType === "lava" ? "#b91c1c" : sec.fluidType === "acid" ? "#15803d" : "#0284c7";
              ctx.fillStyle = fluidColor;
              ctx.fillRect(rx + mx * tileW, ry + my * tileH, tileW, tileH);
            }
          }
        }
      }

      // Map walls
      for (let my = 0; my < m.mapHeight; my++) {
        for (let mx = 0; mx < m.mapWidth; mx++) {
          if (m.map[my][mx] > 0) {
            ctx.fillStyle = m.map[my][mx] === 2 ? "#16a34a" : "#dc2626";
            ctx.fillRect(rx + mx * tileW, ry + my * tileH, tileW, tileH);
          }
        }
      }

      // Dynamic lights on radar
      if (m.lights) {
        for (const lt of m.lights) {
          ctx.fillStyle = `rgb(${lt.r}, ${lt.g}, ${lt.b})`;
          ctx.beginPath();
          ctx.arc(rx + lt.x * tileW, ry + lt.y * tileH, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3D Models on radar (cyan diamond)
      if (m.placedModels) {
        for (const mod of m.placedModels) {
          ctx.fillStyle = "#22d3ee";
          ctx.fillRect(rx + mod.x * tileW - 1.5, ry + mod.y * tileH - 1.5, 3, 3);
        }
      }

      // 3D Voxels on radar (purple diamond)
      if (m.placedVoxels) {
        for (const vox of m.placedVoxels) {
          ctx.fillStyle = "#c084fc";
          ctx.fillRect(rx + vox.x * tileW - 1.5, ry + vox.y * tileH - 1.5, 3, 3);
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

      // Mode badge on radar
      ctx.fillStyle = isHybrid ? "#38bdf8" : "#94a3b8";
      ctx.font = "8px monospace";
      ctx.fillText(isHybrid ? "HEXEN/GZ HYBRID" : "CLASSIC 2D", rx + 4, ry + radarSize - 4);
    }
  }

  /**
   * Toggles the automap / radar visibility in Mode 8 (called on TAB or programmatically)
   */
  public toggleMode8Automap(visible?: boolean) {
    if (this.m8[0]) {
      this.m8[0].showAutomap = visible !== undefined ? visible : !this.m8[0].showAutomap;
    }
  }

  /**
   * Switches Mode 8 between 'classic' 2D raycasting and 'hybrid' 3D engine mode
   */
  public m8_mode(mode: DivMode8EngineMode) {
    if (this.m8[0]) {
      this.m8[0].engineMode = mode;
    }
  }

  /**
   * Starts Mode 8 in advanced Hybrid 3D mode
   */
  public start_mode8_hybrid(file: number, mapWalls: number, mapFloor: number, mapCeil: number) {
    this.start_mode8(file, mapWalls, mapFloor, mapCeil);
    if (this.m8[0]) {
      this.m8[0].engineMode = "hybrid";
      this.m8[0].enableRaytracing = true;
      this.m8[0].enableFluids = true;
      this.m8[0].enable3DModels = true;
      this.m8[0].enableVoxels = true;
    }
  }

  /**
   * Starts Mode 8 in DOOM 2 True Polygon Sector & Portal mode
   */
  public start_mode8_doom2(file: number = 0) {
    this.start_mode8(file, 25, 44, 45);
    if (this.m8[0]) {
      this.m8[0].engineMode = "doom2";
      this.m8[0].enable3DModels = true;
      this.m8[0].enableRaytracing = false; // Doom 2 uses sector lightmaps & portal depth
      if (!this.m8[0].doomLinedefs) this.m8[0].doomLinedefs = [];
      if (!this.m8[0].doomSectors) this.m8[0].doomSectors = [];
    }
  }

  /**
   * Sets the Doom 2 polygonal linedef and sector geometry
   */
  public m8_set_doom_map(linedefs: DivDoomLinedef[], sectors: DivDoomSector[]) {
    if (!this.m8[0]) this.initMode8();
    if (this.m8[0]) {
      this.m8[0].engineMode = "doom2";
      this.m8[0].doomLinedefs = linedefs;
      this.m8[0].doomSectors = sectors;
    }
  }

  /**
   * Adds a complete staircase with progressive sector floor heights and STEP textures
   */
  public m8_add_doom_staircase(
    startX: number,
    startY: number,
    dirX: number,
    dirY: number,
    stepCount: number = 5,
    stepWidth: number = 2.0,
    stepLength: number = 0.5,
    baseFloorHeight: number = 0,
    stepHeightDelta: number = 0.25,
    stairTexture: string = "STEP1"
  ) {
    const res = generateDoomStaircase(
      startX,
      startY,
      dirX,
      dirY,
      stepCount,
      stepWidth,
      stepLength,
      baseFloorHeight,
      stepHeightDelta,
      1.6,
      stairTexture
    );

    if (!this.m8[0]) this.initMode8();
    const m = this.m8[0];
    if (m) {
      if (!m.doomLinedefs) m.doomLinedefs = [];
      if (!m.doomSectors) m.doomSectors = [];
      m.doomLinedefs.push(...res.linedefs);
      m.doomSectors.push(...res.sectors);
    }
  }

  /**
   * Configures sector floor and ceiling height (Hexen style depth & vaults)
   */
  public m8_set_height(x: number, y: number, floorHeight: number, ceilHeight: number) {
    const m = this.m8[0];
    if (m && m.sectors && m.sectors[y] && m.sectors[y][x]) {
      m.sectors[y][x].floorHeight = floorHeight;
      m.sectors[y][x].ceilHeight = ceilHeight;
    }
  }

  /**
   * Full sector configuration
   */
  public m8_set_sector(
    x: number,
    y: number,
    floorHeight: number,
    ceilHeight: number,
    floorTex?: number,
    ceilTex?: number,
    lightLevel?: number,
    fluidType?: DivFluidType
  ) {
    const m = this.m8[0];
    if (m && m.sectors && m.sectors[y] && m.sectors[y][x]) {
      const sec = m.sectors[y][x];
      sec.floorHeight = floorHeight;
      sec.ceilHeight = ceilHeight;
      if (floorTex !== undefined) sec.floorTex = floorTex;
      if (ceilTex !== undefined) sec.ceilTex = ceilTex;
      if (lightLevel !== undefined) sec.lightLevel = lightLevel;
      if (fluidType !== undefined) sec.fluidType = fluidType;
    }
  }

  /**
   * Adds a dynamic point light with optional ray-traced shadows and flicker
   */
  public m8_add_light(
    x: number,
    y: number,
    z: number,
    radius: number,
    r: number,
    g: number,
    b: number,
    flicker: boolean = false,
    castShadows: boolean = true
  ): string {
    const m = this.m8[0];
    if (!m) return "";
    if (!m.lights) m.lights = [];
    const id = "l_" + Math.random().toString(36).substr(2, 6);
    m.lights.push({ id, x, y, z, radius, r, g, b, intensity: 1.0, flicker, castShadows });
    return id;
  }

  /**
   * Adds a placed 3D MD2/MD3 model into the Mode 8 world
   */
  public m8_add_model(
    modelId: string,
    x: number,
    y: number,
    z: number,
    yaw: number = 0,
    currentAnimation: string = "idle",
    scale: number = 1.0
  ): string {
    const m = this.m8[0];
    if (!m) return "";
    if (!m.placedModels) m.placedModels = [];
    const id = "mod_" + Math.random().toString(36).substr(2, 6);
    m.placedModels.push({
      id,
      modelId,
      x,
      y,
      z,
      yaw,
      pitch: 0,
      roll: 0,
      scale,
      currentAnimation,
      animFrame: 0,
      animationSpeed: 0.1,
    });
    return id;
  }

  /**
   * Adds a placed 3D Voxel object into the Mode 8 world
   */
  public m8_add_voxel(
    voxelId: string,
    x: number,
    y: number,
    z: number,
    scale: number = 1.0,
    rotSpeed: number = 2.0
  ): string {
    const m = this.m8[0];
    if (!m) return "";
    if (!m.placedVoxels) m.placedVoxels = [];
    const id = "vox_" + Math.random().toString(36).substr(2, 6);
    m.placedVoxels.push({
      id,
      voxelId,
      x,
      y,
      z,
      yaw: 0,
      scale,
      rotSpeed,
    });
    return id;
  }

  /**
   * Configures Web Worker multi-threading pool for Mode 8 raycasting
   */
  public m8_workers(count: number = 4) {
    if (this.mode8Workers) {
      this.mode8Workers.setWorkerCount(count);
    }
    if (this.m8[0]) {
      this.m8[0].useWorkers = true;
      this.m8[0].workerCount = count;
    }
  }

  /**
   * Equips a 3D first-person MD2 weapon (e.g. "sword3d", "staff3d")
   */
  public m8_set_weapon(weaponModel: string = "sword3d") {
    if (this.m8[0]) {
      this.m8[0].weaponModel = weaponModel;
      this.m8[0].weaponAttackTime = 0;
      this.m8[0].walkCycle = 0;
    }
  }

  /**
   * Triggers an attack swing with the equipped first-person weapon
   */
  public m8_attack() {
    const m = this.m8[0];
    if (!m) return;
    if (!m.weaponAttackTime || m.weaponAttackTime === 0) {
      m.weaponAttackTime = 0.01;
      if (m.weaponModel?.includes("shotgun")) {
        soundEngine.playExplosion(0.75, 1.5);
      } else if (m.weaponModel?.includes("pistol")) {
        soundEngine.playLaser(0.6, 1.1);
      } else {
        soundEngine.playSound(1);
      }
    }
  }

  /**
   * Sets fluid trench type for a sector
   */
  public m8_set_fluid(x: number, y: number, fluidType: DivFluidType) {
    const m = this.m8[0];
    if (m && m.sectors && m.sectors[y] && m.sectors[y][x]) {
      m.sectors[y][x].fluidType = fluidType;
    }
  }

  /**
   * Configures ray tracing options
   */
  public m8_raytracing(enabled: boolean) {
    const m = this.m8[0];
    if (m) {
      m.enableRaytracing = enabled;
    }
  }

  /**
   * Loads MD2 3D model asset identifier
   */
  public load_md2(modelName: string): string {
    return modelName;
  }

  /**
   * Loads MD3 3D model asset identifier
   */
  public load_md3(modelName: string): string {
    return modelName;
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
