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
  DeadProcessRecord,
  BreakpointInfo,
  C_M7,
  C_M8,
} from "../types";
import { soundEngine } from "./sound";
import { DEFAULT_SPRITES, createGraphicCanvas } from "./graphics";
import { DivFont, DEFAULT_DIV_FONTS, renderDivBitmapText, FONT_0_SYSTEM, FONT_1_ARCADE_GOLD } from "./fonts";
import { DivFpgPackage, DivMapFile, getInitialFpgPackages, getInitialMapFiles } from "./fpgManager";
import { buildTracedSectors, findSectorAtPoint, inferPlacedModelStats } from "./mode8Geometry";
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
import {
  renderDoom2PolygonWorld,
  generateDoomStaircase,
  convertGridMapToDoomPolygons,
  loadDoomE1M1Map,
  parseWadBuffer,
  doomWorldState,
  doomSound,
} from "./doom2Engine";
import { Mode8WorkerPool, RaycastWorkerTask } from "./mode8Worker";
import { AppStore, appStore } from "./appStore";
import { AppUiEngine, appUiEngine, ButtonOptions, InputOptions, TableOptions } from "./appUiEngine";
import { Html5AppState, createDefaultHtml5State } from "./html5Engine";

export interface EngineStats {
  fps: number;
  processCount: number;
  renderTimeMs: number;
  frameIndex: number;
  activeSounds: number;
  processMemoryKB?: number;
  processMemoryMB?: number;
  heapUsedMB?: number | null;
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
  public frameCount: number = 0;
  public currentFps: number = 60;
  public renderDuration: number = 0;

  // Process & Asset collections
  private nextProcessId: number = 1;
  public processes: Map<number, DivProcess> = new Map();
  public deadProcesses: DeadProcessRecord[] = [];
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
  public frameTexts: DivText[] = [];
  public scrolls: DivScroll[] = [];

  // Dirty tracking & Idle CPU Optimization for Apps & Forms
  private needsRedraw: boolean = true;
  public renderOnlyOnDirty: boolean = false;

  public markDirty() {
    this.needsRedraw = true;
  }

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
  public tabKeyDebounce: boolean = false;
  public mouseState = {
    x: 0,
    y: 0,
    left: false,
    right: false,
  };

  // Modern Multiplatform App Engines (State Store, Routing & App UI Primitives)
  public appStore: AppStore = new AppStore();
  public appUiEngine: AppUiEngine = new AppUiEngine();

  // Native HTML5 Web & Landing Page Engine Mode
  public isHtml5Mode: boolean = false;
  public html5State: Html5AppState = createDefaultHtml5State();
  public onHtml5StateUpdate?: (state: Html5AppState) => void;

  // Google AdMob Integration & Simulation State
  public admobConfig = {
    enabled: true,
    appId: "ca-app-pub-3940256099942544~3347511713",
    bannerEnabled: true,
    bannerPosition: "bottom" as "top" | "bottom",
    bannerUnitId: "ca-app-pub-3940256099942544/6300978111",
    interstitialEnabled: true,
    interstitialUnitId: "ca-app-pub-3940256099942544/1033173712",
    rewardedEnabled: true,
    rewardedUnitId: "ca-app-pub-3940256099942544/5224354917",
    rewardType: "monedas",
    rewardAmount: 50,
  };

  public admobState = {
    bannerVisible: false,
    bannerPosition: "bottom" as "top" | "bottom",
    interstitialVisible: false,
    interstitialCountdown: 5,
    rewardedVisible: false,
    rewardedCountdown: 5,
    rewardType: "monedas",
    rewardAmount: 50,
    pendingRewardCallback: null as any,
    lastRewardGranted: null as { type: string; amount: number; timestamp: number } | null,
  };

  public onAdMobStateChange?: (state: typeof this.admobState) => void;

  // Active custom JS sandbox timers for robust cleanup across project switches
  private customIntervals: any[] = [];
  private customTimeouts: any[] = [];

  // Callback hooks
  public onStatsUpdate?: (stats: EngineStats) => void;
  public onProcessListUpdate?: (procs: DivProcess[]) => void;
  public onError?: (err: Error) => void;
  public onBreakpointHit?: (bp: BreakpointInfo) => void;
  public onBreakpointResume?: () => void;
  public onBreakpointsChange?: (breakpoints: Set<number>) => void;

  private breakpointHitListeners: Set<(bp: BreakpointInfo) => void> = new Set();
  private breakpointResumeListeners: Set<() => void> = new Set();
  private breakpointsChangeListeners: Set<(bps: Set<number>) => void> = new Set();

  public addBreakpointHitListener(cb: (bp: BreakpointInfo) => void): () => void {
    this.breakpointHitListeners.add(cb);
    return () => this.breakpointHitListeners.delete(cb);
  }

  public addBreakpointResumeListener(cb: () => void): () => void {
    this.breakpointResumeListeners.add(cb);
    return () => this.breakpointResumeListeners.delete(cb);
  }

  public addBreakpointsChangeListener(cb: (bps: Set<number>) => void): () => void {
    this.breakpointsChangeListeners.add(cb);
    return () => this.breakpointsChangeListeners.delete(cb);
  }

  // Breakpoint & Execution Stepping State
  public breakpoints: Set<number> = new Set();
  public currentBreakpoint: BreakpointInfo | null = null;
  public lastHitBreakpointLine: number | null = null;
  public lastHitFrame: number = -1;
  public codeLineToProcess: Map<number, string> = new Map();
  public currentSourceCode: string = "";

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

    // Connect auto-dirty tracking to reactive store and App UI engine
    this.appStore.onStateMutated = () => this.markDirty();
    this.appUiEngine.onUiInteraction = () => this.markDirty();

    // Register global AdMob bridge
    if (typeof window !== "undefined") {
      (window as any).divRuntime = this;
      (window as any).onDivAdMobReward = (type: string, amount: number) => {
        this.admob_grant_reward(type, amount);
      };
      (window as any).admob_show_banner = (pos?: "top" | "bottom") => this.admob_show_banner(pos);
      (window as any).admob_hide_banner = () => this.admob_hide_banner();
      (window as any).admob_show_interstitial = () => this.admob_show_interstitial();
      (window as any).admob_show_rewarded = (t?: string, a?: number, cb?: any) =>
        this.admob_show_rewarded(t, a, cb);
    }
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
      this.appUiEngine.setContext(canvas, this.ctx);
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

  /**
   * Records a terminated/killed process in the dead history log for real-time debugging
   */
  public recordDeadProcess(proc: DivProcess, reason: DeadProcessRecord["reason"] = "completed") {
    const existing = this.deadProcesses.find((d) => d.id === proc.id);
    if (existing) {
      existing.x = Math.round(proc.x * 10) / 10;
      existing.y = Math.round(proc.y * 10) / 10;
      existing.z = Math.round(proc.z * 10) / 10;
      existing.angle = proc.angle;
      existing.graph = proc.graph;
      existing.size = proc.size;
      existing.flags = proc.flags;
      existing.alpha = proc.alpha;
      existing.localVars = { ...(proc.localVars || {}) };
      existing.reason = reason;
      return;
    }

    this.deadProcesses.unshift({
      id: proc.id,
      name: proc.name,
      father: proc.father,
      x: Math.round(proc.x * 10) / 10,
      y: Math.round(proc.y * 10) / 10,
      z: Math.round(proc.z * 10) / 10,
      graph: proc.graph,
      file: proc.file,
      angle: proc.angle,
      size: proc.size,
      flags: proc.flags,
      alpha: proc.alpha,
      ctype: proc.ctype,
      priority: proc.priority,
      localVars: { ...(proc.localVars || {}) },
      customState: proc.customState ? { ...proc.customState } : undefined,
      diedAt: Date.now(),
      diedFrame: this.frameCount,
      reason,
    });

    if (this.deadProcesses.length > 50) {
      this.deadProcesses.pop();
    }
  }

  /**
   * Returns list of terminated / dead processes for the debugger
   */
  public getDeadProcesses = (): DeadProcessRecord[] => {
    return this.deadProcesses;
  };

  /**
   * Clears the dead processes log
   */
  public clearDeadProcesses = (): void => {
    this.deadProcesses = [];
  };

  /**
   * Allows real-time live modification of process internal variables or localVars from the debugger
   */
  public setProcessVariable = (processId: number, varName: string, value: any): boolean => {
    const proc = this.processes.get(processId);
    if (!proc) return false;

    const numVal = Number(value);
    const isNum = !isNaN(numVal) && typeof value !== "boolean" && String(value).trim() !== "";

    switch (varName.toLowerCase()) {
      case "x": proc.x = isNum ? numVal : value; break;
      case "y": proc.y = isNum ? numVal : value; break;
      case "z": proc.z = isNum ? numVal : value; break;
      case "graph": proc.graph = isNum ? numVal : value; break;
      case "file": proc.file = isNum ? numVal : value; break;
      case "angle": proc.angle = isNum ? numVal : value; break;
      case "size": proc.size = isNum ? numVal : value; break;
      case "flags": proc.flags = isNum ? numVal : value; break;
      case "alpha": proc.alpha = isNum ? numVal : value; break;
      case "priority": proc.priority = isNum ? numVal : value; break;
      case "ctype": proc.ctype = isNum ? numVal : value; break;
      case "cnumber": proc.cnumber = isNum ? numVal : value; break;
      case "resolution": proc.resolution = isNum ? numVal : value; break;
      case "region": proc.region = isNum ? numVal : value; break;
      default:
        if (!proc.localVars) proc.localVars = {};
        proc.localVars[varName] = isNum ? numVal : value;
        break;
    }
    this.markDirty();
    return true;
  };

  /**
   * Updates source code mapping for breakpoint process resolution
   */
  public updateSourceCode = (code: string): void => {
    this.currentSourceCode = code;
    this.codeLineToProcess.clear();
    const lines = code.split("\n");
    let currentScope = "program";

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const text = lines[i].trim();
      const procMatch = text.match(/^(?:PROCESS|FUNCTION)\s+([a-zA-Z0-9_]+)/i);
      if (procMatch) {
        currentScope = procMatch[1].toLowerCase();
      } else if (/^PROGRAM\s+([a-zA-Z0-9_]+)/i.test(text)) {
        currentScope = "program";
      }

      this.codeLineToProcess.set(lineNum, currentScope);

      if (text.startsWith("END") && currentScope !== "program" && !text.includes(";")) {
        currentScope = "program";
      }
    }
  };

  /**
   * Sets a breakpoint at the specified line number
   */
  public setBreakpoint = (line: number): void => {
    this.breakpoints.add(line);
    const snap = new Set(this.breakpoints);
    this.onBreakpointsChange?.(snap);
    this.breakpointsChangeListeners.forEach((cb) => {
      try { cb(snap); } catch { /* ignore */ }
    });
  };

  /**
   * Removes a breakpoint from the specified line number
   */
  public removeBreakpoint = (line: number): void => {
    this.breakpoints.delete(line);
    if (this.currentBreakpoint?.line === line) {
      this.currentBreakpoint = null;
    }
    const snap = new Set(this.breakpoints);
    this.onBreakpointsChange?.(snap);
    this.breakpointsChangeListeners.forEach((cb) => {
      try { cb(snap); } catch { /* ignore */ }
    });
  };

  /**
   * Toggles a breakpoint on/off for a line
   */
  public toggleBreakpoint = (line: number): boolean => {
    if (this.breakpoints.has(line)) {
      this.removeBreakpoint(line);
      return false;
    } else {
      this.setBreakpoint(line);
      return true;
    }
  };

  /**
   * Clears all active breakpoints
   */
  public clearBreakpoints = (): void => {
    this.breakpoints.clear();
    this.currentBreakpoint = null;
    const snap = new Set(this.breakpoints);
    this.onBreakpointsChange?.(snap);
    this.breakpointsChangeListeners.forEach((cb) => {
      try { cb(snap); } catch { /* ignore */ }
    });
  };

  /**
   * Checks if a line has a breakpoint
   */
  public hasBreakpoint = (line: number): boolean => {
    return this.breakpoints.has(line);
  };

  /**
   * Triggers a pause on a hit breakpoint
   */
  public hitBreakpoint = (line: number, proc?: DivProcess): void => {
    this.isPaused = true;
    this.lastHitBreakpointLine = line;
    this.lastHitFrame = this.frameCount;
    this.currentBreakpoint = {
      line,
      processId: proc?.id,
      processName: proc?.name || this.codeLineToProcess.get(line) || "proceso",
      frame: this.frameCount,
      timestamp: Date.now(),
    };
    this.onBreakpointHit?.(this.currentBreakpoint);
    this.breakpointHitListeners.forEach((cb) => {
      try { cb(this.currentBreakpoint!); } catch { /* ignore */ }
    });
    this.markDirty();

    // Immediate state dispatch to debugger & UI
    if (this.onStatsUpdate) {
      const mem = this.getProcessMemoryUsage();
      this.onStatsUpdate({
        fps: this.currentFps,
        processCount: this.processes.size,
        renderTimeMs: Math.round(this.renderDuration * 10) / 10,
        frameIndex: this.frameCount,
        activeSounds: 0,
        processMemoryKB: mem.processMemoryKB,
        processMemoryMB: mem.processMemoryMB,
        heapUsedMB: mem.heapUsedMB,
        camera3D: this.getCamera3DInfo(),
      });
    }
    if (this.onProcessListUpdate) {
      this.onProcessListUpdate(Array.from(this.processes.values()).slice(0, 50));
    }
  };

  /**
   * Resumes execution after pausing at a breakpoint
   */
  public resumeFromBreakpoint = (): void => {
    this.currentBreakpoint = null;
    this.onBreakpointResume?.();
    this.breakpointResumeListeners.forEach((cb) => {
      try { cb(); } catch { /* ignore */ }
    });
    this.resume();
  };

  /**
   * Calculates real-time estimated memory consumption of active and dead DIV processes and structures
   */
  public getProcessMemoryUsage = () => {
    let procBytes = 0;
    let localVarsBytes = 0;

    for (const p of this.processes.values()) {
      // Base V8 descriptor, closure frame, prototype and internal fields ~ 2.4 KB
      procBytes += 2400;
      if (p.localVars) {
        try {
          const str = JSON.stringify(p.localVars);
          localVarsBytes += str.length * 2 + 128;
        } catch {
          localVarsBytes += 256;
        }
      }
      if (p.customState) {
        try {
          localVarsBytes += JSON.stringify(p.customState).length * 2;
        } catch {
          localVarsBytes += 128;
        }
      }
    }

    // Dead processes preserved in debugger history
    const deadBytes = this.deadProcesses.length * 1500;

    // Primitives and frame texts currently allocated
    const textsBytes = this.texts.size * 320 + this.frameTexts.length * 160;
    const primsBytes = this.primitives.length * 96;

    const totalBytes = procBytes + localVarsBytes + deadBytes + textsBytes + primsBytes;
    const processMemoryKB = Math.round((totalBytes / 1024) * 10) / 10;
    const processMemoryMB = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;

    const perfMemory = typeof performance !== "undefined" && (performance as any).memory;
    const heapUsedMB = perfMemory
      ? Math.round((perfMemory.usedJSHeapSize / (1024 * 1024)) * 10) / 10
      : null;

    return {
      totalBytes,
      processMemoryKB,
      processMemoryMB,
      heapUsedMB,
      detailedBreakdown: {
        procBytes,
        localVarsBytes,
        deadBytes,
        textsBytes,
      },
    };
  };

  /**
   * Checks if any 3D mode is active or any active process has visual/animated movement
   */
  public hasActiveProcesses(): boolean {
    if (this.m7[0]?.active || this.m8[0]?.active) return true;
    for (const p of this.processes.values()) {
      if (!p.isDead && !p.isSleeping && !p.isFrozen) {
        if (p.graph > 0 || (p.customState && p.customState.activeAnimation)) {
          return true;
        }
      }
    }
    return false;
  }

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

  public spawnProcess(name: string, args: any[] = [], fatherId: number = 0): number {
    return this.spawn(name, args, fatherId);
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
      this.recordDeadProcess(proc, "signal_kill");
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
        this.recordDeadProcess(proc, "let_me_alone");
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
    radius: number = 0.22,
    currentZ?: number
  ): { x: number; y: number } {
    const m = this.m8[0];
    if (!m || !m.map || !m.active) return { x: x + dx, y: y + dy };

    const hasDoomPolys = Array.isArray(m.doomLinedefs) && m.doomLinedefs.length > 0;
    const sectorById = new Map<number, DivDoomSector>();
    if (m.doomSectors) {
      for (const s of m.doomSectors) sectorById.set(s.id, s);
    }

    const isBlocked = (testX: number, testY: number): boolean => {
      if (!Number.isFinite(testX) || !Number.isFinite(testY)) return true;

      if (hasDoomPolys) {
        for (const l of m.doomLinedefs!) {
          if (l.blocking === false) continue;
          const d = this.distToSegment(testX, testY, l.x1, l.y1, l.x2, l.y2);
          if (d >= radius) continue;

          if (!l.isTwoSided || l.blocking === true) {
            return true;
          }
          const frontSec = sectorById.get(l.frontSectorId);
          const backSec = l.backSectorId !== undefined ? sectorById.get(l.backSectorId) : undefined;
          if (frontSec && backSec) {
            const maxFloor = Math.max(frontSec.floorHeight, backSec.floorHeight);
            const minCeil = Math.min(frontSec.ceilHeight, backSec.ceilHeight);
            if (minCeil - maxFloor < 0.70) return true;
            if (currentZ !== undefined && maxFloor - currentZ > 0.42) {
              return true;
            }
          }
        }
        return false;
      }

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
    // Prevent runaway duplicate allocation when write is called repeatedly in a loop
    for (const [existingId, existing] of this.texts.entries()) {
      if (existing.x === x && existing.y === y && existing.font === font && existing.align === align) {
        existing.text = text;
        this.markDirty();
        return existingId;
      }
    }
    const id = this.texts.size + 1;
    this.texts.set(id, { id, font, x, y, align, text });
    this.markDirty();
    return id;
  }

  public writeInt(font: number, x: number, y: number, align: number, variableRef: string): number {
    if (font > 0 && !this.fonts.has(font)) {
      console.warn(
        `[DIV Runtime Error] writeInt(): La fuente '${font}' no está cargada. Cárgala con load_fnt() antes de usar write_int().`
      );
    }
    for (const [existingId, existing] of this.texts.entries()) {
      if (existing.x === x && existing.y === y && existing.font === font && existing.align === align) {
        existing.variableRef = variableRef;
        this.markDirty();
        return existingId;
      }
    }
    const id = this.texts.size + 1;
    this.texts.set(id, { id, font, x, y, align, text: "", variableRef });
    this.markDirty();
    return id;
  }

  public write_int(font: number, x: number, y: number, align: number, variableRef: string): number {
    return this.writeInt(font, x, y, align, variableRef);
  }

  public write_string(font: number, x: number, y: number, align: number, text: string): number {
    return this.write(font, x, y, align, text);
  }

  public drawText(font: number, x: number, y: number, align: number, text: string): number {
    const id = -(this.frameTexts.length + 1);
    this.frameTexts.push({ id, font, x, y, align, text });
    this.markDirty();
    return id;
  }

  public draw_text(font: number, x: number, y: number, align: number, text: string): number {
    return this.drawText(font, x, y, align, text);
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

  // ========================================================
  // WXDIV 3.0 APP UI PRIMITIVES & LAYOUT SYSTEM
  // ========================================================

  public drawButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onClick?: () => void,
    options?: ButtonOptions
  ) {
    this.appUiEngine.drawButton(x, y, w, h, label, onClick, options);
  }

  public draw_button(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onClick?: () => void,
    options?: ButtonOptions
  ) {
    this.drawButton(x, y, w, h, label, onClick, options);
  }

  public drawInput(
    x: number,
    y: number,
    w: number,
    h: number,
    value: string,
    onChange?: (newVal: string) => void,
    placeholder?: string,
    options?: InputOptions
  ) {
    this.appUiEngine.drawInput(x, y, w, h, value, onChange, placeholder, options);
  }

  public draw_input(
    x: number,
    y: number,
    w: number,
    h: number,
    value: string,
    onChange?: (newVal: string) => void,
    placeholder?: string,
    options?: InputOptions
  ) {
    this.drawInput(x, y, w, h, value, onChange, placeholder, options);
  }

  public drawSelect(
    x: number,
    y: number,
    w: number,
    h: number,
    options: string[],
    value: string,
    onChange?: (selected: string) => void
  ) {
    this.appUiEngine.drawSelect(x, y, w, h, options, value, onChange);
  }

  public draw_select(
    x: number,
    y: number,
    w: number,
    h: number,
    options: string[],
    value: string,
    onChange?: (selected: string) => void
  ) {
    this.drawSelect(x, y, w, h, options, value, onChange);
  }

  // =========================================================================
  // NATIVE HTML5 & WEB LANDING PAGE ENGINE PRIMITIVES
  // =========================================================================
  public setHtml5Mode(active: boolean) {
    this.isHtml5Mode = active;
    this.html5State.active = active;
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public set_html5_mode(active: boolean = true) {
    this.setHtml5Mode(active);
  }

  public m_html5(): void {
    this.setHtml5Mode(true);
  }

  public updateHtml5State(partial: Partial<Html5AppState>) {
    Object.assign(this.html5State, partial);
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public draw_landing_page(title: string, subtitle?: string, ctaText?: string) {
    this.isHtml5Mode = true;
    this.html5State.active = true;
    this.html5State.mode = "landing_page";
    this.html5State.title = title;
    if (subtitle) this.html5State.subtitle = subtitle;
    this.html5State.hero = {
      title,
      subtitle: subtitle || "",
      ctaText: ctaText || "Comenzar",
      ctaAction: "btn_cta_hero",
    };
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public draw_html_form(title: string, submitLabel?: string) {
    this.isHtml5Mode = true;
    this.html5State.active = true;
    if (this.html5State.mode === "landing_page") {
      this.html5State.mode = "hybrid";
    } else {
      this.html5State.mode = "form";
    }
    if (!this.html5State.form) {
      this.html5State.form = {
        id: "form_principal",
        title,
        submitLabel: submitLabel || "Guardar Información",
        fields: [],
        values: {},
        submitted: false,
      };
    } else {
      this.html5State.form.title = title;
      if (submitLabel) this.html5State.form.submitLabel = submitLabel;
    }
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public navbar(brand: string, linksStr?: string) {
    const links = (linksStr || "Inicio,Servicios,Contacto")
      .split(",")
      .map((l) => ({ label: l.trim(), href: `#${l.trim().toLowerCase()}` }));
    this.html5State.navbar = { brand, links };
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public hero(title: string, subtitle?: string, ctaText?: string, badge?: string) {
    this.html5State.hero = {
      title,
      subtitle: subtitle || "",
      ctaText: ctaText || "Comenzar",
      ctaAction: "btn_cta_hero",
      badge,
    };
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_page(title: string, subtitle?: string, theme?: string) {
    this.isHtml5Mode = true;
    this.html5State.active = true;
    this.html5State.mode = "landing_page";
    this.html5State.title = title;
    if (subtitle) this.html5State.subtitle = subtitle;
    if (theme) this.html5State.theme = theme as any;
    this.html5State.hero = {
      title,
      subtitle: subtitle || "",
      ctaText: "Comenzar Ahora",
      ctaAction: "btn_cta_hero",
    };
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_navbar(brand: string, linksStr?: string, ctaText?: string, ctaAction?: string) {
    const links = (linksStr || "Inicio,Servicios,Precios,Contacto")
      .split(",")
      .map((l) => ({ label: l.trim(), href: `#${l.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}` }));
    this.html5State.navbar = { brand, links, ctaText, ctaAction };
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_hero(
    title: string,
    subtitle?: string,
    ctaText?: string,
    ctaAction?: string,
    secondaryCtaText?: string,
    secondaryCtaAction?: string,
    badge?: string
  ) {
    this.html5State.hero = {
      title,
      subtitle: subtitle || "",
      ctaText: ctaText || "Comenzar Gratis",
      ctaAction: ctaAction || "btn_cta_hero",
      secondaryCtaText,
      secondaryCtaAction: secondaryCtaAction || "btn_demo",
      badge,
    };
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_feature(icon: string, title: string, desc: string) {
    this.add_feature(icon, title, desc);
  }

  public add_feature(icon: string, title: string, desc: string) {
    this.html5State.features.push({
      id: `feat_${this.html5State.features.length + 1}`,
      icon,
      title,
      desc,
    });
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_stat(label: string, value: string | number, change?: string, isPositive: boolean = true) {
    if (!this.html5State.stats) this.html5State.stats = [];
    this.html5State.stats.push({
      id: `stat_${this.html5State.stats.length + 1}`,
      label,
      value: String(value),
      change,
      isPositive,
    });
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_pricing(
    name: string,
    price: string,
    period: string = "/mes",
    featuresStr: string = "Soporte 24/7, Aceleración Cloud",
    isPopular: boolean = false,
    ctaText: string = "Elegir Plan",
    ctaAction?: string
  ) {
    if (!this.html5State.pricing) this.html5State.pricing = [];
    this.html5State.pricing.push({
      id: `plan_${this.html5State.pricing.length + 1}`,
      name,
      price,
      period,
      features: featuresStr.split(",").map((s) => s.trim()),
      isPopular,
      ctaText,
      ctaAction: ctaAction || `select_plan_${this.html5State.pricing.length + 1}`,
    });
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_testimonial(quote: string, author: string, role: string = "Cliente Verificado", rating: number = 5) {
    if (!this.html5State.testimonials) this.html5State.testimonials = [];
    this.html5State.testimonials.push({
      id: `test_${this.html5State.testimonials.length + 1}`,
      quote,
      author,
      role,
      rating,
    });
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_faq(question: string, answer: string) {
    if (!this.html5State.faqs) this.html5State.faqs = [];
    this.html5State.faqs.push({
      id: `faq_${this.html5State.faqs.length + 1}`,
      question,
      answer,
    });
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_cta_banner(
    title: string,
    subtitle?: string,
    buttonText: string = "Comenzar Ahora",
    buttonAction: string = "btn_cta_banner",
    badge?: string
  ) {
    this.html5State.ctaBanner = {
      title,
      subtitle: subtitle || "",
      buttonText,
      buttonAction,
      badge,
    };
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_contact_form(
    title: string = "Contáctanos",
    subtitle: string = "Completa tus datos y te responderemos a la brevedad.",
    submitText: string = "Enviar Mensaje →",
    action: string = "enviar_contacto"
  ) {
    this.isHtml5Mode = true;
    this.html5State.active = true;
    this.html5State.form = {
      id: "form_contacto",
      title,
      description: subtitle,
      submitLabel: submitText,
      submitAction: action,
      fields: [
        { id: "nombre", label: "Nombre", type: "text", placeholder: "Tu nombre completo...", required: true },
        { id: "email", label: "Correo Electrónico", type: "email", placeholder: "tu@empresa.com", required: true },
        { id: "mensaje", label: "Mensaje", type: "textarea", placeholder: "¿En qué podemos ayudarte?...", required: true },
      ],
      values: {},
      submitted: false,
    };
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public web_footer(brand: string, copyright?: string, linksStr: string = "Privacidad,Términos,Contacto") {
    this.html5State.footer = {
      brand,
      text: copyright || `© ${new Date().getFullYear()} ${brand}. Todos los derechos reservados.`,
      links: linksStr.split(",").map((s) => s.trim()),
    };
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public add_form_input(
    id: string,
    label: string,
    type: "text" | "number" | "email" | "password" | "textarea" | "select" | "checkbox" = "text",
    placeholder?: string
  ) {
    if (!this.html5State.form) {
      this.draw_html_form("Formulario");
    }
    this.html5State.form?.fields.push({
      id,
      label,
      type,
      placeholder,
    });
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public add_form_textarea(id: string, label: string, placeholder?: string) {
    this.add_form_input(id, label, "textarea", placeholder);
  }

  public add_form_select(id: string, label: string, optionsStr: string) {
    if (!this.html5State.form) {
      this.draw_html_form("Formulario");
    }
    const options = optionsStr.split(",").map((s) => s.trim());
    this.html5State.form?.fields.push({
      id,
      label,
      type: "select",
      options,
    });
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public add_form_checkbox(id: string, label: string) {
    this.add_form_input(id, label, "checkbox");
  }

  public add_card(title: string, desc: string, buttonText?: string, tag?: string) {
    this.html5State.cards.push({ title, desc, buttonText, tag });
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public add_footer(brand: string, linksStr?: string) {
    const links = (linksStr || "Privacidad,Términos").split(",").map((s) => s.trim());
    this.html5State.footer = {
      brand,
      text: `© ${new Date().getFullYear()} ${brand}. Todos los derechos reservados.`,
      links,
    };
    this.onHtml5StateUpdate?.(this.html5State);
    this.markDirty();
  }

  public show_toast(text: string, type: "success" | "info" | "warning" | "danger" = "success") {
    const notif = { id: `n_${Date.now()}`, text, type, timestamp: Date.now() };
    this.html5State.notifications.push(notif);
    this.onHtml5StateUpdate?.(this.html5State);
    setTimeout(() => {
      this.html5State.notifications = this.html5State.notifications.filter((n) => n.id !== notif.id);
      this.onHtml5StateUpdate?.(this.html5State);
    }, 4000);
  }

  public show_alert(message: string, type: "success" | "info" | "warning" | "danger" = "info") {
    this.show_toast(message, type);
  }

  public triggerHtml5Action(actionName: string, payload?: any) {
    if (!actionName) return;
    // Update store if payload provided
    if (payload && typeof payload === "object") {
      Object.entries(payload).forEach(([k, v]) => {
        this.appStore.store_set(`app_state.${k}`, v);
      });
    }

    // Handle tab switching
    if (actionName === "tab_change" && payload?.tabId) {
      if (this.html5State.tabs) {
        this.html5State.tabs.forEach((t) => {
          t.active = t.id === payload.tabId;
        });
      }
      this.html5State.activeTabId = payload.tabId;
      this.onHtml5StateUpdate?.(this.html5State);
    }

    // Handle form submission / task addition
    if (actionName === "add_task" || actionName === "guardar_registro" || actionName.includes("guardar")) {
      const taskText = payload?.texto || payload?.nombre || payload?.tarea;
      if (taskText && this.html5State.table) {
        const nextId = this.html5State.table.rows.length + 1;
        this.html5State.table.rows.push([nextId, taskText, "Pendiente", "Completar"]);
        if (this.html5State.stats) {
          const tot = this.html5State.stats.find((s) => s.id === "total");
          if (tot && typeof tot.value === "number") tot.value++;
          const pend = this.html5State.stats.find((s) => s.id === "pending");
          if (pend && typeof pend.value === "number") pend.value++;
        }
        this.onHtml5StateUpdate?.(this.html5State);
      }
    }

    // Handle row action / toggling task
    if (actionName === "row_action" && typeof payload?.rowIndex === "number") {
      if (this.html5State.table && this.html5State.table.rows[payload.rowIndex]) {
        const row = this.html5State.table.rows[payload.rowIndex];
        if (row[2] === "Pendiente") {
          row[2] = "Completada";
          row[3] = "Reabrir";
          if (this.html5State.stats) {
            const comp = this.html5State.stats.find((s) => s.id === "completed");
            if (comp && typeof comp.value === "number") comp.value++;
            const pend = this.html5State.stats.find((s) => s.id === "pending");
            if (pend && typeof pend.value === "number" && pend.value > 0) pend.value--;
          }
        } else if (row[2] === "Completada") {
          row[2] = "Pendiente";
          row[3] = "Completar";
          if (this.html5State.stats) {
            const comp = this.html5State.stats.find((s) => s.id === "completed");
            if (comp && typeof comp.value === "number" && comp.value > 0) comp.value--;
            const pend = this.html5State.stats.find((s) => s.id === "pending");
            if (pend && typeof pend.value === "number") pend.value++;
          }
        }
        this.onHtml5StateUpdate?.(this.html5State);
      }
    }

    // If a registered process matches, spawn it
    if ((this as any).processDefs.has(actionName)) {
      this.spawn(actionName, [payload]);
    }
    this.show_toast(`Acción ejecutada: ${actionName}`, "success");
    this.markDirty();
  }

  public drawTable(
    x: number,
    y: number,
    w: number,
    h: number,
    columns: string[],
    rows: Array<Record<string, any> | any[]>,
    options?: TableOptions
  ) {
    this.appUiEngine.drawTable(x, y, w, h, columns, rows, options);
  }

  public draw_table(
    x: number,
    y: number,
    w: number,
    h: number,
    columns: string[],
    rows: Array<Record<string, any> | any[]>,
    options?: TableOptions
  ) {
    this.drawTable(x, y, w, h, columns, rows, options);
  }

  public drawModal(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    content: string,
    onClose?: () => void
  ) {
    this.appUiEngine.drawModal(x, y, w, h, title, content, onClose);
  }

  public draw_modal(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    content: string,
    onClose?: () => void
  ) {
    this.drawModal(x, y, w, h, title, content, onClose);
  }

  public drawTabs(
    x: number,
    y: number,
    w: number,
    h: number,
    tabs: string[],
    activeTab: string | number,
    onTabChange?: (tab: string, index: number) => void
  ) {
    this.appUiEngine.drawTabs(x, y, w, h, tabs, activeTab, onTabChange);
  }

  public draw_tabs(
    x: number,
    y: number,
    w: number,
    h: number,
    tabs: string[],
    activeTab: string | number,
    onTabChange?: (tab: string, index: number) => void
  ) {
    this.drawTabs(x, y, w, h, tabs, activeTab, onTabChange);
  }

  public drawCheckbox(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    checked: boolean,
    onToggle?: () => void,
    options?: { id?: string; disabled?: boolean }
  ) {
    this.appUiEngine.drawCheckbox(x, y, w, h, label, checked, onToggle, options);
  }

  public draw_checkbox(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    checked: boolean,
    onToggle?: () => void,
    options?: { id?: string; disabled?: boolean }
  ) {
    this.drawCheckbox(x, y, w, h, label, checked, onToggle, options);
  }

  public drawScrollBar(
    x: number,
    y: number,
    w: number,
    h: number,
    value: number,
    max: number,
    onChange?: (newVal: number) => void,
    orientation: "vertical" | "horizontal" = "vertical",
    options?: { id?: string }
  ) {
    this.appUiEngine.drawScrollBar(x, y, w, h, value, max, onChange, orientation, options);
  }

  public draw_scrollbar(
    x: number,
    y: number,
    w: number,
    h: number,
    value: number,
    max: number,
    onChange?: (newVal: number) => void,
    orientation: "vertical" | "horizontal" = "vertical",
    options?: { id?: string }
  ) {
    this.drawScrollBar(x, y, w, h, value, max, onChange, orientation, options);
  }

  public drawPictureBox(
    x: number,
    y: number,
    w: number,
    h: number,
    onPaint?: (ctx: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }) => void,
    options?: { id?: string; title?: string; bg?: string }
  ) {
    this.appUiEngine.drawPictureBox(x, y, w, h, onPaint, options);
  }

  public draw_picturebox(
    x: number,
    y: number,
    w: number,
    h: number,
    onPaint?: (ctx: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }) => void,
    options?: { id?: string; title?: string; bg?: string }
  ) {
    this.drawPictureBox(x, y, w, h, onPaint, options);
  }

  public set_ui_theme(mode: "android" | "vb3" | "dark") {
    this.appUiEngine.setThemeMode(mode);
  }

  public layout_begin(
    direction: "vertical" | "horizontal" | "grid",
    x: number,
    y: number,
    width: number,
    height: number,
    gap?: number,
    padding?: number,
    cols?: number
  ) {
    this.appUiEngine.layout_begin(direction, x, y, width, height, gap, padding, cols);
  }

  public layout_next(customW?: number, customH?: number) {
    return this.appUiEngine.layout_next(customW, customH);
  }

  public layout_end() {
    this.appUiEngine.layout_end();
  }

  // ========================================================
  // REACTIVE STATE MANAGEMENT, ROUTER & PERSISTENCE
  // ========================================================

  public store_create(name: string, initialData: Record<string, any>) {
    this.appStore.store_create(name, initialData);
  }

  public store_get(path: string, defaultValue?: any) {
    return this.appStore.store_get(path, defaultValue);
  }

  public store_set(path: string, value: any) {
    this.appStore.store_set(path, value);
  }

  public onDataChange(path: string, callback: (newVal: any, oldVal: any) => void) {
    return this.appStore.onDataChange(path, callback);
  }

  public navigate(route: string, params?: Record<string, any>) {
    this.appStore.navigate(route, params);
  }

  public onRouteChange(callback: (route: string, params: any) => void) {
    this.appStore.onRouteChange(callback);
  }

  public onClick(elementId: string, callback: () => void) {
    this.appStore.onClick(elementId, callback);
  }

  public onSubmit(formId: string, callback: (data: any) => void) {
    this.appStore.onSubmit(formId, callback);
  }

  public save_json(filename: string, data: any): boolean {
    return this.appStore.save_json(filename, data);
  }

  public load_json(filename: string, defaultValue?: any): any {
    return this.appStore.load_json(filename, defaultValue);
  }

  public load_sqlite(dbName?: string): boolean {
    return this.appStore.load_sqlite(dbName);
  }

  public sqlite_query(sql: string, params?: any[]): any[] {
    return this.appStore.sqlite_query(sql, params);
  }

  public async fetch_api(url: string, options?: any, callback?: any) {
    return this.appStore.fetch_api(url, options, callback);
  }

  // ========================================================
  // NATIVE JS LIBRARIES & DLL BRIDGE (DIV Games Studio 2.0 DLL Model)
  // Allows writing custom JavaScript extensions, hardware/API access & exports
  // ========================================================
  private jsLibraries: Map<string, Record<string, Function>> = new Map();

  /**
   * Register a custom JavaScript library (equivalent to old DIV DLLs)
   * Example:
   *   register_js_library("sys_hardware", {
   *     vibrate: (ms) => navigator.vibrate?.(ms),
   *     get_battery: async () => { ... }
   *   });
   */
  public register_js_library(libName: string, exports: Record<string, Function>) {
    this.jsLibraries.set(libName.toLowerCase(), exports);
    console.log(`[WXDIV] Librería JS/DLL registrada: ${libName} (${Object.keys(exports).length} funciones)`);
  }

  /**
   * Call a function inside a registered JS library / DLL
   * Example: call_dll("sys_hardware", "vibrate", [200]);
   */
  public call_dll(libName: string, funcName: string, args: any[] = []): any {
    const lib = this.jsLibraries.get(libName.toLowerCase());
    if (!lib) {
      console.warn(`[WXDIV DLL] Librería no encontrada: ${libName}`);
      return null;
    }
    const fn = lib[funcName];
    if (typeof fn !== "function") {
      console.warn(`[WXDIV DLL] Función no encontrada en ${libName}: ${funcName}`);
      return null;
    }
    try {
      return fn(...args);
    } catch (e: any) {
      console.error(`[WXDIV DLL Error] Fallo ejecutando ${libName}.${funcName}:`, e);
      return null;
    }
  }

  /**
   * Load and dynamically compile a JavaScript library string into the runtime
   */
  public load_js_library_code(libName: string, codeString: string) {
    try {
      const moduleFn = new Function("exports", "runtime", "window", codeString);
      const exportsObj: Record<string, Function> = {};
      moduleFn(exportsObj, this, window);
      this.register_js_library(libName, exportsObj);
      return true;
    } catch (err: any) {
      console.error(`[WXDIV DLL] Error compilando librería ${libName}:`, err);
      return false;
    }
  }

  public auth_login(user: string, token?: string) {
    this.appStore.auth_login(user, token);
  }

  public auth_logout() {
    this.appStore.auth_logout();
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
    if (norm === "up" && (this.keyState["arrowup"] || this.keyState["up"])) return true;
    if (norm === "down" && (this.keyState["arrowdown"] || this.keyState["down"])) return true;
    if (norm === "left" && (this.keyState["arrowleft"] || this.keyState["left"])) return true;
    if (norm === "right" && (this.keyState["arrowright"] || this.keyState["right"])) return true;
    if (norm === "arrowup" && (this.keyState["arrowup"] || this.keyState["up"])) return true;
    if (norm === "arrowdown" && (this.keyState["arrowdown"] || this.keyState["down"])) return true;
    if (norm === "arrowleft" && (this.keyState["arrowleft"] || this.keyState["left"])) return true;
    if (norm === "arrowright" && (this.keyState["arrowright"] || this.keyState["right"])) return true;
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
    this.isPaused = false;
    this.step();
    this.render();
    if (!this.currentBreakpoint) {
      this.isPaused = true;
    }
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
    // Clear any lingering custom JS sandbox intervals & timeouts from previous projects
    for (const id of this.customIntervals) {
      try { clearInterval(id); } catch { /* ignore */ }
    }
    this.customIntervals = [];
    for (const id of this.customTimeouts) {
      try { clearTimeout(id); } catch { /* ignore */ }
    }
    this.customTimeouts = [];

    this.processes.clear();
    this.deadProcesses = [];
    this.processDefs.clear();
    this.texts.clear();
    this.frameTexts = [];
    this.loadedSounds.clear();
    this.loadedSongs.clear();
    this.currentSongId = 0;
    this.primitives = [];
    this.permanentPrimitives = [];
    this.scrolls = [];
    this.appUiEngine.reset();
    this.appUiEngine.onUiInteraction = () => this.markDirty();
    this.appStore = new AppStore();
    this.appStore.onStateMutated = () => this.markDirty();
    this.backgroundColor = "#000000";
    this.set_ui_theme("dark");
    this.renderOnlyOnDirty = false;
    this.nextProcessId = 1;
    this.needsRedraw = true;
    this.initMode7();
    this.initMode8();
    if (this.m8 && this.m8[0]) this.m8[0].active = false;
    if (this.m7 && this.m7[0]) this.m7[0].active = false;
    this.setupDefaultGlobals();
    soundEngine.stopAll();
    this.keyState = {};
    this.mouseState = { x: 0, y: 0, left: false, right: false };
    this.isHtml5Mode = false;
    this.html5State = createDefaultHtml5State();
    this.onHtml5StateUpdate?.(this.html5State);
    if (this.ctx && this.canvas) {
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Ejecuta código JavaScript & HTML5 interactivo con acceso a Canvas2D y DivRuntime
   */
  public execute_javascript(jsCode: string) {
    try {
      const safeSetInterval = (fn: Function, ms: number) => {
        const id = setInterval(fn, ms);
        this.customIntervals.push(id);
        return id;
      };
      const safeSetTimeout = (fn: Function, ms: number) => {
        const id = setTimeout(fn, ms);
        this.customTimeouts.push(id);
        return id;
      };
      const sandboxFn = new Function("runtime", "canvas", "ctx", "sound", "setInterval", "setTimeout", jsCode);
      sandboxFn(this, this.canvas, this.ctx, soundEngine, safeSetInterval, safeSetTimeout);
      this.markDirty();
    } catch (err) {
      console.warn("[Runtime JS Engine]", err);
    }
  }

  /**
   * Evalúa y vincula HTML5 Canvas interactivo
   */
  public eval_html5(customJs: string) {
    this.execute_javascript(customJs);
  }

  private tick = () => {
    if (!this.isRunning || this.isPaused) return;

    const now = performance.now();
    const elapsed = now - this.lastTick;
    const interval = 1000 / this.targetFps;

    if (elapsed >= interval) {
      this.lastTick = now - (elapsed % interval);
      const shouldExecute = !this.renderOnlyOnDirty || this.needsRedraw || this.hasActiveProcesses();

      if (shouldExecute) {
        const startRender = performance.now();
        try {
          this.step();
          this.render();
        } catch (err) {
          console.error("[DivRuntime] Error recuperado en fotograma:", err);
        }
        this.needsRedraw = false;
        this.renderDuration = performance.now() - startRender;
        this.frameCount++;
      } else {
        this.renderDuration = 0;
      }

      if (this.frameCount % 20 === 0) {
        this.currentFps = Math.round(1000 / Math.max(1, elapsed));
        const mem = this.getProcessMemoryUsage();
        if (this.onStatsUpdate) {
          this.onStatsUpdate({
            fps: this.currentFps,
            processCount: this.processes.size,
            renderTimeMs: Math.round(this.renderDuration * 10) / 10,
            frameIndex: this.frameCount,
            activeSounds: 0,
            processMemoryKB: mem.processMemoryKB,
            processMemoryMB: mem.processMemoryMB,
            heapUsedMB: mem.heapUsedMB,
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
    this.appUiEngine.beginStep();

    // Increment timers
    if (this.globalVars.timer) {
      for (let i = 0; i < this.globalVars.timer.length; i++) {
        this.globalVars.timer[i]++;
      }
    }

    // Refresh dynamic frame primitives and frame texts (drawn during the frame by processes)
    this.primitives = [];
    this.frameTexts = [];

    // Check program-level / global frame breakpoints
    if (this.breakpoints.size > 0 && !this.isPaused) {
      for (const bpLine of this.breakpoints) {
        if (bpLine === this.lastHitBreakpointLine && this.frameCount === this.lastHitFrame) {
          continue;
        }
        const targetScope = this.codeLineToProcess.get(bpLine);
        if (targetScope === "program" || !targetScope) {
          this.hitBreakpoint(bpLine);
          return;
        }
      }
    }

    // Step each active process until FRAME yield
    for (const [id, proc] of this.processes.entries()) {
      if (proc.isDead) {
        this.recordDeadProcess(proc, "signal_kill");
        this.processes.delete(id);
        continue;
      }
      if (proc.isSleeping || proc.isFrozen) {
        continue;
      }

      // Check process-specific breakpoint
      if (this.breakpoints.size > 0 && !this.isPaused) {
        for (const bpLine of this.breakpoints) {
          if (bpLine === this.lastHitBreakpointLine && this.frameCount === this.lastHitFrame) {
            continue;
          }
          const targetScope = this.codeLineToProcess.get(bpLine);
          if (targetScope && targetScope.toLowerCase() === proc.name.toLowerCase()) {
            this.hitBreakpoint(bpLine, proc);
            return;
          }
        }
      }

      if (proc.generator) {
        try {
          this.currentProcess = proc;
          const result = proc.generator.next();
          this.currentProcess = null;
          if (result.done) {
            proc.isDead = true;
            this.recordDeadProcess(proc, "completed");
            this.processes.delete(id);
          }
        } catch (err: any) {
          this.currentProcess = null;
          console.error(`Error in process ${proc.name} [id=${id}]:`, err);
          proc.isDead = true;
          this.recordDeadProcess(proc, "error");
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

    // Texts (HUD / Labels / Scores / FNT Bitmap Fonts + Dynamic Frame Texts)
    const allTexts = [...this.texts.values(), ...this.frameTexts];
    for (const txt of allTexts) {
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

    // 5. App UI Interactive Widgets and Modal & Dialog Overlays
    this.appUiEngine.renderWidgets(ctx);
    this.appUiEngine.renderOverlays();
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

    // 3. Proximity item pickup collection & Hostile Entity AI (monster/enemy/imp)
    if (m.entities && m.entities.length > 0) {
      const nowSecEnt = this.frameCount / 60;
      const tracedEntSectors =
        m.doomSectors && m.doomLinedefs
          ? buildTracedSectors(m.doomSectors, m.doomLinedefs)
          : [];
      for (let i = m.entities.length - 1; i >= 0; i--) {
        const ent = m.entities[i];
        const ex = ent.x / 64;
        const ey = ent.y / 64;
        const dist = Math.hypot(ex - m.x, ey - m.y);
        const eType = String(ent.type || "").toLowerCase();
        if (eType === "player") continue;

        if (dist < 0.72) {
          if (eType === "medikit") {
            soundEngine.playMedikit();
            const nextHealth = Math.min(100, (this.globalVars.salud ?? this.globalVars.health ?? doomWorldState.health ?? 80) + 30);
            this.globalVars.health = nextHealth;
            this.globalVars.salud = nextHealth;
            doomWorldState.health = nextHealth;
            this.globalVars.score = (this.globalVars.score ?? 0) + 100;
            m.entities.splice(i, 1);
            continue;
          } else if (eType === "ammo") {
            soundEngine.playAmmo();
            const nextAmmo = (this.globalVars.cartuchos ?? this.globalVars.ammo ?? doomWorldState.ammo ?? 50) + 35;
            this.globalVars.ammo = nextAmmo;
            this.globalVars.cartuchos = nextAmmo;
            doomWorldState.ammo = nextAmmo;
            this.globalVars.score = (this.globalVars.score ?? 0) + 50;
            m.entities.splice(i, 1);
            continue;
          } else if (eType === "key") {
            soundEngine.playKey();
            this.globalVars.hasKey = true;
            this.globalVars.score = (this.globalVars.score ?? 0) + 500;
            m.entities.splice(i, 1);
            continue;
          } else if (eType === "treasure") {
            soundEngine.playCoin();
            this.globalVars.score = (this.globalVars.score ?? 0) + 250;
            m.entities.splice(i, 1);
            continue;
          }
        }

        if (eType === "monster" || eType === "enemy" || eType === "imp") {
          if (ent.hp === undefined) ent.hp = 60;
          if (ent.maxHp === undefined) ent.maxHp = 60;
          if (ent.homeX === undefined) ent.homeX = ex;
          if (ent.homeY === undefined) ent.homeY = ey;
          if (ent.hitFlash && ent.hitFlash > 0) ent.hitFlash = Math.max(0, ent.hitFlash - 0.12);
          if (ent.attackCooldown && ent.attackCooldown > 0) ent.attackCooldown--;

          if (ent.hp <= 0) {
            m.entities.splice(i, 1);
            continue;
          }

          if (this.globalVars.menu_activo !== 1) {
            const dxP = m.x - ex;
            const dyP = m.y - ey;
            const dP = Math.hypot(dxP, dyP);
            const step = Math.min(0.055, (ent.speed || 1.7) * 0.015);
            if (dP <= 1.3) {
              ent.yaw = (Math.atan2(dyP, dxP) * 180) / Math.PI;
              ent.animation = "attack";
              if (!ent.attackCooldown || ent.attackCooldown <= 0) {
                ent.attackCooldown = 50;
                doomWorldState.applyDamage(ent.damage || 10);
                this.globalVars.salud = doomWorldState.health;
                this.globalVars.health = doomWorldState.health;
                doomSound.playPlayerPain();
                if (doomWorldState.health <= 0) {
                  doomWorldState.health = 100;
                  this.globalVars.salud = 100;
                  this.globalVars.health = 100;
                }
              }
            } else if (dP < 8.5) {
              ent.yaw = (Math.atan2(dyP, dxP) * 180) / Math.PI;
              ent.animation = "walk";
              const moved = this.moveMode8WithCollision(
                ex,
                ey,
                (dxP / Math.max(0.001, dP)) * step,
                (dyP / Math.max(0.001, dP)) * step,
                0.25
              );
              ent.x = moved.x * 64;
              ent.y = moved.y * 64;
            } else {
              const hx = ent.homeX ?? ex;
              const hy = ent.homeY ?? ey;
              const pr = Math.max(0.8, Math.min(2.4, ent.patrolRadius || 1.8));
              const orb = nowSecEnt * 0.7 + i * 1.7;
              const tx = hx + Math.cos(orb) * pr * 0.65;
              const ty = hy + Math.sin(orb) * pr * 0.65;
              const dtx = tx - ex;
              const dty = ty - ey;
              const dtl = Math.hypot(dtx, dty);
              if (dtl > 0.08) {
                ent.yaw = (Math.atan2(dty, dtx) * 180) / Math.PI;
                ent.animation = "walk";
                const moved = this.moveMode8WithCollision(
                  ex,
                  ey,
                  (dtx / dtl) * step * 0.6,
                  (dty / dtl) * step * 0.6,
                  0.25
                );
                ent.x = moved.x * 64;
                ent.y = moved.y * 64;
              } else {
                ent.animation = "idle";
              }
            }

            if (tracedEntSectors.length > 0) {
              const sec = findSectorAtPoint(ent.x / 64, ent.y / 64, tracedEntSectors);
              if (sec) ent.z = sec.floorHeight;
            }
          }
        }
      }
    }

    // 4. Particle-based fluid simulation in hybrid mode
    if (m.engineMode === "hybrid" && m.enableFluids !== false && m.sectors) {
      this.fluidParticles.update(m.sectors, m.mapWidth, m.mapHeight);
    }

    // 5. Continuous 3D Voxel rotation, pickups, Enemy AI & MD2/MD3 animations
    const menuActive = this.globalVars.menu_activo === 1;
    const tracedSectors =
      m.doomSectors && m.doomLinedefs
        ? buildTracedSectors(m.doomSectors, m.doomLinedefs)
        : [];

    if (m.placedVoxels) {
      for (const vox of m.placedVoxels) {
        if (vox.collected) continue;
        vox.yaw = (vox.yaw + (vox.rotSpeed ?? 2.5)) % 360;

        if (!menuActive) {
          const dist = Math.hypot(vox.x - m.x, vox.y - m.y);
          const vId = String(vox.voxelId || "").toLowerCase();
          if (dist < 0.85) {
            if (vId.includes("coin")) {
              vox.collected = true;
              soundEngine.playCoin();
              this.globalVars.score = (this.globalVars.score ?? 0) + 100;
            } else if (vId.includes("medikit")) {
              vox.collected = true;
              soundEngine.playMedikit();
              doomWorldState.health = Math.min(100, doomWorldState.health + 30);
              this.globalVars.salud = doomWorldState.health;
              this.globalVars.health = doomWorldState.health;
              this.globalVars.score = (this.globalVars.score ?? 0) + 50;
            } else if (vId.includes("key")) {
              vox.collected = true;
              soundEngine.playKey();
              doomWorldState.keys.yellow = true;
              this.globalVars.hasKey = true;
              this.globalVars.score = (this.globalVars.score ?? 0) + 300;
            } else if (vId.includes("potion")) {
              vox.collected = true;
              soundEngine.playMedikit();
              doomWorldState.armor = Math.min(100, doomWorldState.armor + 25);
              this.globalVars.armadura = doomWorldState.armor;
              this.globalVars.score = (this.globalVars.score ?? 0) + 120;
            } else if (vId.includes("chest")) {
              vox.collected = true;
              soundEngine.playKey();
              this.globalVars.score = (this.globalVars.score ?? 0) + 500;
              this.globalVars.cartuchos = (this.globalVars.cartuchos ?? 0) + 12;
              doomWorldState.ammo = this.globalVars.cartuchos;
            } else if (vId.includes("checkpoint") && vox.name !== "CHECKED") {
              vox.name = "CHECKED";
              soundEngine.playSwitch();
              doomWorldState.health = Math.min(100, doomWorldState.health + 20);
              this.globalVars.salud = doomWorldState.health;
              this.globalVars.score = (this.globalVars.score ?? 0) + 150;
            }
          }
        }
      }
    }

    if (m.placedModels) {
      const nowSec = this.frameCount / 60;
      for (let idx = 0; idx < m.placedModels.length; idx++) {
        const mod = m.placedModels[idx];
        const stats = inferPlacedModelStats(mod);
        if (mod.role === undefined) mod.role = stats.role;
        if (mod.hp === undefined) mod.hp = stats.hp;
        if (mod.maxHp === undefined) mod.maxHp = stats.maxHp;
        if (mod.speed === undefined) mod.speed = stats.speed;
        if (mod.damage === undefined) mod.damage = stats.damage;
        if (mod.patrolRadius === undefined) mod.patrolRadius = stats.patrolRadius;
        if (mod.homeX === undefined) mod.homeX = mod.x;
        if (mod.homeY === undefined) mod.homeY = mod.y;
        if (mod.hitFlash && mod.hitFlash > 0) {
          mod.hitFlash = Math.max(0, mod.hitFlash - 0.12);
        }
        if (mod.attackCooldown && mod.attackCooldown > 0) {
          mod.attackCooldown--;
        }

        // Advance animation cycle
        mod.animFrame = ((mod.animFrame || 0) + (mod.animationSpeed || 0.08)) % 1;

        if (stats.role === "goal" && !menuActive) {
          mod.yaw = (mod.yaw + 2.2) % 360;
          const distToGoal = Math.hypot(mod.x - m.x, mod.y - m.y);
          if (distToGoal < 1.0 && (!mod.attackCooldown || mod.attackCooldown <= 0)) {
            mod.attackCooldown = 180;
            soundEngine.playKey();
            this.globalVars.score = (this.globalVars.score ?? 0) + 1000;
            doomWorldState.health = 100;
            this.globalVars.salud = 100;
            doomWorldState.screenTeleportFlash = 0.45;
          }
          continue;
        }

        if (stats.role !== "enemy" || (mod.hp ?? 0) <= 0) continue;

        if (menuActive) {
          mod.currentAnimation = "idle";
          continue;
        }

        const dxP = m.x - mod.x;
        const dyP = m.y - mod.y;
        const distP = Math.hypot(dxP, dyP);
        const aggroRange = 9.0;
        const attackRange = 1.35;
        const moveStep = Math.min(0.06, (stats.speed || 1.7) * 0.016);

        if (distP <= attackRange) {
          mod.yaw = (Math.atan2(dyP, dxP) * 180) / Math.PI;
          mod.currentAnimation = "attack";
          if (!mod.attackCooldown || mod.attackCooldown <= 0) {
            mod.attackCooldown = 48;
            doomWorldState.applyDamage(stats.damage || 10);
            this.globalVars.salud = doomWorldState.health;
            this.globalVars.health = doomWorldState.health;
            doomSound.playPlayerPain();
            if (doomWorldState.health <= 0) {
              // Auto-respawn safely at start with fresh HP
              doomWorldState.health = 100;
              this.globalVars.salud = 100;
              this.globalVars.health = 100;
              m.x = mod.homeX ? Math.max(2, m.x - (dxP / Math.max(0.2, distP)) * 2.5) : m.x;
              m.y = mod.homeY ? Math.max(2, m.y - (dyP / Math.max(0.2, distP)) * 2.5) : m.y;
            }
          }
        } else if (distP < aggroRange) {
          // Chase player with wall-sliding collision
          const targetYaw = (Math.atan2(dyP, dxP) * 180) / Math.PI;
          mod.yaw = targetYaw;
          mod.currentAnimation = "walk";
          const nx = (dxP / Math.max(0.001, distP)) * moveStep;
          const ny = (dyP / Math.max(0.001, distP)) * moveStep;
          const moved = this.moveMode8WithCollision(mod.x, mod.y, nx, ny, 0.25);
          mod.x = moved.x;
          mod.y = moved.y;
        } else {
          // Smooth patrol loop around home anchor
          const hx = mod.homeX ?? mod.x;
          const hy = mod.homeY ?? mod.y;
          const pr = Math.max(0.8, Math.min(2.8, stats.patrolRadius || 2.0));
          const orbitAngle = nowSec * 0.75 + idx * 1.9;
          const tx = hx + Math.cos(orbitAngle) * pr * 0.65;
          const ty = hy + Math.sin(orbitAngle) * pr * 0.65;
          const dtx = tx - mod.x;
          const dty = ty - mod.y;
          const dtl = Math.hypot(dtx, dty);
          if (dtl > 0.08) {
            mod.yaw = (Math.atan2(dty, dtx) * 180) / Math.PI;
            mod.currentAnimation = "walk";
            const pStep = moveStep * 0.62;
            const moved = this.moveMode8WithCollision(
              mod.x,
              mod.y,
              (dtx / dtl) * pStep,
              (dty / dtl) * pStep,
              0.25
            );
            mod.x = moved.x;
            mod.y = moved.y;
          } else {
            mod.currentAnimation = "idle";
          }
        }

        // Ground enemy to current sector height
        if (tracedSectors.length > 0) {
          const esec = findSectorAtPoint(mod.x, mod.y, tracedSectors);
          if (esec) mod.z = esec.floorHeight;
        }
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

    // 7. Interactive Doom Controls & Scripts
    // Toggle Doom Automap radar on Tab or M key
    if ((this.keyState["Tab"] || this.keyState["m"] || this.keyState["M"]) && !this.tabKeyDebounce) {
      m.showAutomap = !m.showAutomap;
      this.tabKeyDebounce = true;
      setTimeout(() => { this.tabKeyDebounce = false; }, 300);
    }

    // Open Door on E key
    if ((this.keyState["e"] || this.keyState["E"]) && m.doomLinedefs && m.doomSectors) {
      const pAngleRad = ((m.angle || 0) * Math.PI) / 180;
      const frontX = m.x + Math.cos(pAngleRad) * 0.9;
      const frontY = m.y + Math.sin(pAngleRad) * 0.9;
      for (const line of m.doomLinedefs) {
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;
        if (Math.hypot(midX - frontX, midY - frontY) < 1.0) {
          if (line.backSectorId !== undefined) {
            doomWorldState.openDoor(line.backSectorId, m.doomSectors);
          } else {
            doomWorldState.openDoor(line.frontSectorId, m.doomSectors);
          }
          break;
        }
      }
    }

    // Hazard Floors & Teleporters check (using true smallest-area polygon containment)
    if (!menuActive && tracedSectors.length > 0 && this.frameCount % 25 === 0) {
      const sec = findSectorAtPoint(m.x, m.y, tracedSectors);
      const ft = String(sec?.floorTexture || "").toUpperCase();
      if (ft === "NUKAGE" || ft === "SLIME1" || sec?.special === 7) {
        doomWorldState.applyDamage(5);
        this.globalVars.salud = doomWorldState.health;
        doomWorldState.screenHazardFlash = 0.45;
        doomSound.playSlimeBurn();
      } else if (ft === "LAVA") {
        doomWorldState.applyDamage(12);
        this.globalVars.salud = doomWorldState.health;
        doomWorldState.screenDamageFlash = 0.6;
        doomSound.playSlimeBurn();
      } else if (ft === "GATE1" || sec?.special === 11) {
        m.x += 2.5;
        m.y += 1.5;
        doomWorldState.screenTeleportFlash = 0.65;
        doomSound.playTeleport();
      }
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
      const explicitScale = Number(camTarget.localVars?.__worldScale);
      if (explicitScale > 0) {
        m.x = camTarget.x / explicitScale;
        m.y = camTarget.y / explicitScale;
      } else if (camTarget.x > 20 || camTarget.y > 20) {
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

    const pitchOffset = Math.max(-120, Math.min(120, m.pitch || 0));

    // --- HTML5 DOOM TRUE POLYGON SECTOR & PORTAL RENDERER (Universal Mode 8 Engine) ---
    // If level does not have Doom polygon linedefs, automatically compile grid/sectors to Doom geometry:
    if (!m.doomLinedefs || m.doomLinedefs.length === 0) {
      const compiled = convertGridMapToDoomPolygons(
        m.map,
        m.sectors,
        m.doors,
        m.vectorWalls,
        m.mapWidth,
        m.mapHeight
      );
      m.doomLinedefs = compiled.linedefs;
      m.doomSectors = compiled.sectors;
    }

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
      m.placedVoxels || [],
      {
        showHUD: true,
        showAutomap: m.showAutomap,
        skyTexture: m.skyTexture,
        cameraMode: m.cameraMode,
        playerModelId: m.playerModelId,
      }
    );
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
   * Starts Mode 8 in DOOM 2 True Polygon Sector & Portal mode with authentic E1M1 Hangar geometry
   */
  public start_mode8_doom2(file: number = 0) {
    this.start_mode8(file, 25, 44, 45);
    this.m8_load_e1m1();
  }

  /**
   * Loads the authentic multi-sector Doom E1M1: Hangar level geometry and spawns
   */
  public m8_load_e1m1(): boolean {
    if (!this.m8[0]) this.initMode8();
    const m = this.m8[0];
    if (!m) return false;

    const e1m1 = loadDoomE1M1Map();
    m.engineMode = "doom2";
    m.doomSectors = e1m1.sectors;
    m.doomLinedefs = e1m1.linedefs;
    m.entities = e1m1.entities;
    m.placedModels = e1m1.placedModels;
    m.x = e1m1.playerStart.x;
    m.y = e1m1.playerStart.y;
    m.angle = e1m1.playerStart.angle;
    m.enable3DModels = true;
    return true;
  }

  /**
   * Loads an external or custom Doom WAD buffer, parses the target map, and injects it into Mode 8
   */
  public m8_load_wad(buffer: ArrayBuffer, mapName: string = "E1M1"): boolean {
    if (!this.m8[0]) this.initMode8();
    const m = this.m8[0];
    if (!m) return false;

    const res = parseWadBuffer(buffer, mapName);
    if (!res) return false;

    m.engineMode = "doom2";
    m.doomSectors = res.sectors;
    m.doomLinedefs = res.linedefs;
    m.entities = res.entities;
    m.placedModels = res.placedModels;
    m.x = res.playerStart.x;
    m.y = res.playerStart.y;
    m.angle = res.playerStart.angle;
    m.enable3DModels = true;
    return true;
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
   * Fires the Doom player weapon (Shotgun / Super Shotgun) with recoil and muzzle flash
   */
  public m8_shoot(): boolean {
    const shot = doomWorldState.shootWeapon();
    if (shot && this.m8[0]) {
      this.m8[0].weaponAttackTime = 0.01;
    }
    return shot;
  }

  /**
   * Toggles the authentic vector Doom Automap radar
   */
  public m8_toggle_automap() {
    if (this.m8[0]) {
      this.m8[0].showAutomap = !this.m8[0].showAutomap;
    }
  }

  /**
   * Opens a Doom sector door smoothly with pneumatic sound
   */
  public m8_open_doom_door(sectorId: number) {
    if (this.m8[0]?.doomSectors) {
      doomWorldState.openDoor(sectorId, this.m8[0].doomSectors);
    }
  }

  /**
   * Activates a Doom elevator / lift platform with hum sound
   */
  public m8_activate_doom_lift(sectorId: number) {
    if (this.m8[0]?.doomSectors) {
      doomWorldState.activateLift(sectorId, this.m8[0].doomSectors);
    }
  }

  /**
   * Teleports camera/player with portal particles, sound, and screen flash
   */
  public m8_teleport(targetX: number, targetY: number, targetZ: number = 0, targetAngle: number = 0) {
    if (this.m8[0]) {
      this.m8[0].x = targetX;
      this.m8[0].y = targetY;
      this.m8[0].z = targetZ;
      this.m8[0].angle = targetAngle;
      doomWorldState.screenTeleportFlash = 0.75;
      doomSound.playTeleport();
    }
  }

  /**
   * Plays a procedural authentic Doom sound effect
   */
  public m8_play_doom_sound(soundName: string) {
    switch (soundName.toLowerCase()) {
      case "shotgun": doomSound.playShotgun(); break;
      case "door_open": doomSound.playDoorOpen(); break;
      case "door_close": doomSound.playDoorClose(); break;
      case "lift": doomSound.playLift(); break;
      case "teleport": doomSound.playTeleport(); break;
      case "item": doomSound.playItemPickup(); break;
      case "pain": doomSound.playPain(); break;
      case "slime": doomSound.playSlimeBurn(); break;
      case "explosion": doomSound.playExplosion(); break;
      case "monster": doomSound.playMonsterGrowl(); break;
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
    scale: number = 1.0,
    extra?: Partial<DivMode8PlacedModel>
  ): string {
    const m = this.m8[0];
    if (!m) return "";
    if (!m.placedModels) m.placedModels = [];
    const id = "mod_" + Math.random().toString(36).substr(2, 6);
    const base: DivMode8PlacedModel = {
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
      homeX: x,
      homeY: y,
      ...extra,
    };
    const stats = inferPlacedModelStats(base);
    m.placedModels.push({
      ...base,
      role: base.role ?? stats.role,
      hp: base.hp ?? stats.hp,
      maxHp: base.maxHp ?? stats.maxHp,
      speed: base.speed ?? stats.speed,
      damage: base.damage ?? stats.damage,
      patrolRadius: base.patrolRadius ?? stats.patrolRadius,
      name: base.name ?? stats.name,
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
   * Triggers an attack swing/shot with real hit detection against 3D enemies
   */
  public m8_attack() {
    const m = this.m8[0];
    if (!m) return;
    if (!m.weaponAttackTime || m.weaponAttackTime === 0) {
      m.weaponAttackTime = 0.01;
      const wName = String(m.weaponModel || "shotgun").toLowerCase();
      if (wName.includes("shotgun")) {
        soundEngine.playExplosion(0.75, 1.5);
      } else if (wName.includes("pistol")) {
        soundEngine.playLaser(0.6, 1.1);
      } else {
        soundEngine.playSound(1);
      }

      // Hit detection cone in front of player
      const maxRange = wName.includes("sword") ? 2.9 : wName.includes("staff") ? 9.5 : 13.5;
      const maxConeDeg = wName.includes("sword") ? 55 : wName.includes("shotgun") ? 24 : 15;
      const dmg = wName.includes("shotgun") ? 45 : wName.includes("sword") ? 40 : wName.includes("staff") ? 35 : 28;
      const pAngle = m.angle || 0;

      const hasLineOfSight = (tx: number, ty: number): boolean => {
        if (!m.doomLinedefs) return true;
        const rdx = tx - m.x;
        const rdy = ty - m.y;
        for (const l of m.doomLinedefs) {
          if (l.noDraw) continue;
          if (l.isTwoSided && l.blocking !== true) continue;
          const sx = l.x2 - l.x1;
          const sy = l.y2 - l.y1;
          const denom = rdx * sy - rdy * sx;
          if (Math.abs(denom) < 1e-6) continue;
          const qpx = l.x1 - m.x;
          const qpy = l.y1 - m.y;
          const t = (qpx * sy - qpy * sx) / denom;
          const u = (qpx * rdy - qpy * rdx) / denom;
          if (t > 0.02 && t < 0.98 && u >= 0 && u <= 1) return false;
        }
        return true;
      };

      if (m.placedModels && m.placedModels.length > 0) {
        for (const mod of m.placedModels) {
          const stats = inferPlacedModelStats(mod);
          if (stats.role !== "enemy") continue;
          const curHp = mod.hp ?? stats.hp;
          if (curHp <= 0) continue;

          const edx = mod.x - m.x;
          const edy = mod.y - m.y;
          const dist = Math.hypot(edx, edy);
          if (dist > maxRange) continue;

          const eAngle = (Math.atan2(edy, edx) * 180) / Math.PI;
          let diff = ((eAngle - pAngle + 540) % 360) - 180;
          if (Math.abs(diff) <= maxConeDeg && hasLineOfSight(mod.x, mod.y)) {
            mod.hp = Math.max(0, curHp - dmg);
            mod.hitFlash = 1.0;
            // Knockback away from player
            if (dist > 0.05) {
              const kb = this.moveMode8WithCollision(
                mod.x,
                mod.y,
                (edx / dist) * 0.45,
                (edy / dist) * 0.45,
                0.25
              );
              mod.x = kb.x;
              mod.y = kb.y;
            }
            if (mod.hp <= 0) {
              mod.currentAnimation = "die";
              doomWorldState.kills++;
              this.globalVars.score = (this.globalVars.score ?? 0) + 250;
              doomSound.playMonsterDeath();
            } else {
              this.globalVars.score = (this.globalVars.score ?? 0) + 25;
            }
            if (!wName.includes("shotgun") && !wName.includes("sword")) {
              break; // single target for pistol/staff
            }
          }
        }
      }

      if (m.entities && m.entities.length > 0) {
        for (let i = m.entities.length - 1; i >= 0; i--) {
          const ent = m.entities[i];
          const eType = String(ent.type || "").toLowerCase();
          if (eType !== "enemy" && eType !== "monster" && eType !== "imp") continue;
          const ex = ent.x / 64;
          const ey = ent.y / 64;
          const edx = ex - m.x;
          const edy = ey - m.y;
          const dist = Math.hypot(edx, edy);
          if (dist > maxRange) continue;
          const eAngle = (Math.atan2(edy, edx) * 180) / Math.PI;
          const diff = ((eAngle - pAngle + 540) % 360) - 180;
          if (Math.abs(diff) <= maxConeDeg && hasLineOfSight(ex, ey)) {
            const curHp = ent.hp ?? 60;
            ent.hp = Math.max(0, curHp - dmg);
            ent.hitFlash = 1.0;
            if (dist > 0.05) {
              const kb = this.moveMode8WithCollision(
                ex,
                ey,
                (edx / dist) * 0.45,
                (edy / dist) * 0.45,
                0.25
              );
              ent.x = kb.x * 64;
              ent.y = kb.y * 64;
            }
            if (ent.hp <= 0) {
              m.entities.splice(i, 1);
              doomWorldState.kills++;
              this.globalVars.score = (this.globalVars.score ?? 0) + 250;
              doomSound.playMonsterDeath();
            } else {
              this.globalVars.score = (this.globalVars.score ?? 0) + 25;
            }
          }
        }
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

  // ========================================================
  // GOOGLE ADMOB RUNTIME API (ANDROID BRIDGING & WEB SIMULATION)
  // ========================================================
  public admob_init(appId?: string, config?: Partial<typeof this.admobConfig>) {
    if (appId) this.admobConfig.appId = appId;
    if (config) Object.assign(this.admobConfig, config);
    console.log("⚡ [AdMob] Inicializado con App ID:", this.admobConfig.appId);
  }

  public admob_show_banner(position: "top" | "bottom" = "bottom") {
    this.admobState.bannerVisible = true;
    this.admobState.bannerPosition = position;
    if (typeof window !== "undefined" && (window as any).AndroidAdMobBridge?.showBanner) {
      (window as any).AndroidAdMobBridge.showBanner(position);
    }
    this.onAdMobStateChange?.({ ...this.admobState });
    this.markDirty();
  }

  public admob_hide_banner() {
    this.admobState.bannerVisible = false;
    if (typeof window !== "undefined" && (window as any).AndroidAdMobBridge?.hideBanner) {
      (window as any).AndroidAdMobBridge.hideBanner();
    }
    this.onAdMobStateChange?.({ ...this.admobState });
    this.markDirty();
  }

  public admob_show_interstitial() {
    if (typeof window !== "undefined" && (window as any).AndroidAdMobBridge?.showInterstitial) {
      (window as any).AndroidAdMobBridge.showInterstitial();
      return;
    }
    // Web Preview Simulation
    this.admobState.interstitialVisible = true;
    this.admobState.interstitialCountdown = 5;
    this.onAdMobStateChange?.({ ...this.admobState });
    this.markDirty();

    const timer = setInterval(() => {
      if (this.admobState.interstitialCountdown > 0) {
        this.admobState.interstitialCountdown--;
        this.onAdMobStateChange?.({ ...this.admobState });
      } else {
        clearInterval(timer);
      }
    }, 1000);
  }

  public admob_close_interstitial() {
    this.admobState.interstitialVisible = false;
    this.onAdMobStateChange?.({ ...this.admobState });
    this.markDirty();
  }

  public admob_show_rewarded(
    rewardType: string = "monedas",
    amount: number = 50,
    callback?: ((type: string, amount: number) => void) | string
  ) {
    this.admobState.rewardType = rewardType;
    this.admobState.rewardAmount = amount;
    this.admobState.pendingRewardCallback = callback || null;

    if (typeof window !== "undefined" && (window as any).AndroidAdMobBridge?.showRewarded) {
      (window as any).AndroidAdMobBridge.showRewarded(rewardType, amount, "");
      return;
    }

    // Web Preview Simulation
    this.admobState.rewardedVisible = true;
    this.admobState.rewardedCountdown = 5;
    this.onAdMobStateChange?.({ ...this.admobState });
    this.markDirty();

    const timer = setInterval(() => {
      if (this.admobState.rewardedCountdown > 0) {
        this.admobState.rewardedCountdown--;
        this.onAdMobStateChange?.({ ...this.admobState });
      } else {
        clearInterval(timer);
      }
    }, 1000);
  }

  public admob_close_rewarded() {
    this.admobState.rewardedVisible = false;
    this.onAdMobStateChange?.({ ...this.admobState });
    this.markDirty();
  }

  public admob_grant_reward(rewardType: string, amount: number) {
    const type = rewardType || this.admobState.rewardType || "monedas";
    const qty = amount || this.admobState.rewardAmount || 50;

    // Grant reward directly into globalVars
    if (this.globalVars[type] !== undefined) {
      this.globalVars[type] += qty;
    } else {
      this.globalVars[type] = qty;
    }

    // Common game aliases
    if (type === "vidas" && this.globalVars.lives !== undefined) {
      this.globalVars.lives += qty;
    } else if (type === "lives" && this.globalVars.vidas !== undefined) {
      this.globalVars.vidas += qty;
    } else if (type === "monedas" && this.globalVars.score !== undefined) {
      this.globalVars.score += qty * 10;
    }

    this.admobState.lastRewardGranted = {
      type,
      amount: qty,
      timestamp: Date.now(),
    };

    // Execute registered callback if provided
    const cb = this.admobState.pendingRewardCallback;
    if (typeof cb === "function") {
      try {
        cb(type, qty);
      } catch (err) {
        console.error("Error al ejecutar callback de recompensa AdMob:", err);
      }
    } else if (typeof cb === "string" && cb.trim()) {
      try {
        this.spawn(cb.trim(), [qty, type]);
      } catch (e) {
        console.log(`[AdMob] Proceso ${cb} no registrado, valor entregado en globalVars.${type}`);
      }
    }

    soundEngine.playCoin();
    this.admobState.rewardedVisible = false;
    this.onAdMobStateChange?.({ ...this.admobState });
    this.markDirty();
  }
}

export const defaultRuntime = new DivRuntime();
