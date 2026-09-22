/**
 * WXDIV 3.0 Type Definitions
 * DIV Games Studio & DivGO Multi-Platform Architecture
 */

export interface DivProcess {
  id: number;
  name: string;
  father: number;
  son?: number;
  bigbro?: number;
  smallbro?: number;
  x: number;
  y: number;
  z: number;
  graph: number; // graphic id in FPG
  file: number; // FPG file id (0 = main)
  angle: number; // angle in degrees 0-360 or 0-360000
  size: number; // size percentage (100 = 100%)
  flags: number; // 0=normal, 1=mirror_x, 2=mirror_y, 4=alpha
  alpha: number; // 0..255 or 0..100
  ctype: number; // collision type
  cnumber: number;
  priority: number;
  resolution: number;
  region: number;
  isDead: boolean;
  isSleeping: boolean;
  isFrozen: boolean;
  localVars: Record<string, any>;
  customState?: Record<string, any>;
  runState?: any;
  generator?: Generator<void, void, unknown>;
}

export interface DivGraphic {
  id: number;
  name: string;
  description?: string;
  width: number;
  height: number;
  cx: number; // center point X
  cy: number; // center point Y
  cpoints: Array<{ x: number; y: number; id: number }>;
  pixels: number[][]; // 2D array of palette indices or hex strings
  palette: string[];
  dataUrl?: string;
  canvas?: HTMLCanvasElement;
}

export interface DivText {
  id: number;
  font: number;
  x: number;
  y: number;
  align: number; // 0=left, 1=center, 2=right, etc.
  text: string;
  variableRef?: string; // pointer or variable name for write_int
  color?: string;
  size?: number;
}

export interface DivPrimitive {
  id: number;
  type: "box" | "outline_box" | "line" | "circle" | "fcircle";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  r?: number;
  color: string;
}

export interface DivScroll {
  id: number;
  file: number;
  backGraph: number;
  frontGraph: number;
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  active: boolean;
}

/**
 * DIV Games Studio MODO 7:
 * Perspective projection plane (Mario Kart / F-Zero / Pilotwings pseudo-3D)
 */
export interface DivMode7 {
  id: number;
  file: number;
  groundGraph: number;
  skyGraph: number;
  x: number;        // Camera world X
  y: number;        // Camera world Y
  z: number;        // Camera altitude
  angle: number;    // Camera heading (degrees or millidegrees)
  height: number;   // Camera eye height above ground
  distance: number; // Perspective focal depth
  horizon: number;  // Screen Y of horizon
  focus: number;    // Field of view / horizon pitch
  color: string;    // Sky/fog color
  camera: number;   // Process ID to track automatically
  active: boolean;
}

/**
 * DIV Games Studio MODO 8:
 * Raycaster 3D maze engine (Wolfenstein 3D / Catacomb 3D / Doom 2.5D)
 */
export interface DivMode8Door {
  id: number;
  x: number;
  y: number;
  state: "closed" | "opening" | "open" | "closing";
  openAmount: number; // 0.0 (closed) to 1.0 (fully open)
  texture: number;    // Texture ID (e.g. 31 = tech door, 38 = iron door)
  autoCloseTimer: number; // frames before auto closing, 0 = manual only
  isLocked?: boolean;
  keyRequired?: number; // 1 = blue key, 2 = red key
  name?: string;
}

export interface DivMode8Trigger {
  id: number;
  x: number;
  y: number;
  type: "sensor" | "switch" | "teleport" | "light";
  targetDoorId?: number;
  activated: boolean;
  cooldown?: number;
  texture?: number;
  name?: string;
}

export interface DivMode8Entity {
  id: string;
  type: "player" | "monster" | "barrel" | "torch" | "key" | "medikit" | "ammo" | "treasure" | "custom";
  x: number; // world pixel coordinates (grid cell * 64 + 32)
  y: number;
  graph: number;
  name?: string;
}

export type DivFluidType = "none" | "water" | "lava" | "acid" | "blood";

export interface DivMode8Sector {
  x?: number;
  y?: number;
  floorHeight: number; // 0 = standard floor, -0.6 = pool/trench, 0.5 = step, 1.0 = high ledge
  ceilHeight: number;  // 1.0 = standard ceiling, 1.6 = vault, 2.4 = cathedral
  floorTexture?: number;
  ceilTexture?: number;
  floorTex?: number;
  ceilTex?: number;
  wallTexture?: number;
  lightLevel?: number; // 0.0 .. 1.0 local sector light
  fluidType?: DivFluidType;
  fluidDepth?: number; // fluid depth below floor
  tag?: number; // Hexen sector action tag
  isWindow?: boolean; // Window sector (see-through aperture with sill and lintel)
  windowSill?: number; // lower boundary (e.g. 0.35)
  windowTop?: number; // upper boundary (e.g. 0.85)
  windowHasBars?: boolean; // vertical iron bars or grates
  isColumn?: boolean; // 1x1 pillar or column sector
}

export interface DivMode8Light {
  id: string | number;
  x: number; // grid coords
  y: number;
  z: number; // height offset (0 = ground, 0.5 = eye level, 1.0 = ceiling)
  radius: number; // reach in tiles
  r: number; // 0..255
  g: number;
  b: number;
  intensity?: number; // 0..1
  flicker?: boolean;
  castShadows?: boolean;
  pulseSpeed?: number;
  name?: string;
}

export interface DivModel3DVertex {
  x: number;
  y: number;
  z: number;
  u?: number;
  v?: number;
}

export interface DivModel3DTriangle {
  v: [number, number, number];
  color?: string;
  normal?: [number, number, number];
  uv?: [[number, number], [number, number], [number, number]];
}

export interface DivModel3DFrame {
  name: string;
  vertices: DivModel3DVertex[];
}

export interface DivModel3DData {
  id: string | number;
  name: string;
  format: "md2" | "md3" | "custom";
  frames: DivModel3DFrame[];
  triangles: DivModel3DTriangle[];
  skinTexture?: number;
  baseScale: number;
}

export interface DivMode8PlacedModel {
  id: string | number;
  modelId: string | number;
  x: number; // grid tiles
  y: number;
  z: number;
  yaw: number; // degrees
  pitch?: number;
  roll?: number;
  scale: number;
  currentAnimation?: string;
  animation?: string;
  animFrame?: number;
  animationSpeed?: number;
  name?: string;
}

export interface DivVoxelPoint {
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface DivVoxelModel {
  id: string | number;
  name: string;
  voxels: DivVoxelPoint[];
  scale: number;
}

export interface DivMode8PlacedVoxel {
  id: string | number;
  voxelId: string | number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  rotSpeed?: number;
  scale: number;
  name?: string;
}

export interface DivDoomLinedef {
  id: string | number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  frontSectorId: number;
  backSectorId?: number;
  isTwoSided?: boolean;
  middleTexture?: string | number;
  upperTexture?: string | number;
  lowerTexture?: string | number;
  blocking?: boolean;
  secret?: boolean;
  noDraw?: boolean;
  special?: number;
  tag?: number;
}

export interface DivDoomSector {
  id: number;
  floorHeight: number; // in world height units, e.g. 0, 0.25 (stair step), 0.5, 1.0
  ceilHeight: number;  // e.g. 1.2 (standard room), 2.0 (high ceiling)
  floorTexture?: string | number;
  ceilTexture?: string | number;
  lightLevel?: number; // 0..255
  special?: number;
  tag?: number;
}

export interface DivVectorWall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  texture: number;
  floorZ?: number;
  ceilZ?: number;
  isTwoSided?: boolean;
  portalSector?: number;
  isWindow?: boolean;
  windowSill?: number;
  windowTop?: number;
}

export interface DivWorldFile {
  name: string; // e.g. "nivel1.wld"
  version: number;
  width: number;
  height: number;
  ambientLight: number;
  skyColor?: string;
  floorTexture?: number;
  ceilTexture?: number;
  map: number[][]; // Grid representation
  sectors: DivMode8Sector[][];
  vectorWalls?: DivVectorWall[]; // Free-form vector walls (any shape!)
  doomLinedefs?: DivDoomLinedef[]; // Doom 2 Polygon Linedefs
  doomSectors?: DivDoomSector[]; // Doom 2 Sectors (heights, flats, lighting)
  doors: DivMode8Door[];
  triggers: DivMode8Trigger[];
  entities: DivMode8Entity[];
  lights: DivMode8Light[];
  placedModels: DivMode8PlacedModel[];
  placedVoxels: DivMode8PlacedVoxel[];
  playerStart: { x: number; y: number; z: number; angle: number };
}

export interface DivFluidParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "bubble" | "ember" | "droplet" | "steam";
  alpha?: number;
}

export type DivMode8EngineMode = "classic" | "hybrid" | "doom2";

export interface DivMode8 {
  id: number;
  file: number;
  mapWalls: number;
  mapFloor: number;
  mapCeil: number;
  x: number;          // Camera world X (in grid tiles)
  y: number;          // Camera world Y (in grid tiles)
  z: number;          // Camera altitude
  angle: number;      // Camera yaw (degrees)
  height: number;     // Camera eye height
  pitch: number;      // Pitch offset
  camera: number;     // Process ID to track
  fogColor: string;
  fogDistance: number;
  mapWidth: number;
  mapHeight: number;
  map: number[][];    // 2D grid matrix of wall IDs
  doors?: DivMode8Door[];
  triggers?: DivMode8Trigger[];
  entities?: DivMode8Entity[];
  vectorWalls?: DivVectorWall[]; // Free-form vector walls (any shape/angle)
  doomLinedefs?: DivDoomLinedef[]; // Doom 2 Polygon Linedefs
  doomSectors?: DivDoomSector[]; // Doom 2 Sectors (heights, flats, lighting)
  worldName?: string; // Loaded .wld file name (e.g. "nivel1.wld")
  floorTexture?: number;
  ceilTexture?: number;
  lightLevel?: number; // 0..1 ambient lighting (Doom-like)
  torchFlicker?: boolean;
  showAutomap?: boolean; // Automap radar (only visible when requested or pressing Tab)
  active: boolean;
  currentEyeZ?: number; // Damped eye height for smooth elevation changes

  // Hexen & GZDoom Hybrid 3D Extensions:
  engineMode?: DivMode8EngineMode; // "classic" (flat 2D retro), "hybrid" (Hexen/GZDoom 2.5D/3D AAA), or "doom2" (True Polygon Sector & Portal Engine)
  sectors?: DivMode8Sector[][]; // Variable floor/ceil heights, depths and sector specials
  lights?: DivMode8Light[]; // Dynamic point lights with ray-traced shadows
  placedModels?: DivMode8PlacedModel[]; // Real 3D MD2/MD3 models inside raycast world
  placedVoxels?: DivMode8PlacedVoxel[]; // 3D voxel objects
  enableRaytracing?: boolean; // Optical ray-tracing (shadows, falloff, penumbra)
  raytracingBounces?: number;
  raytracingSamples?: number;
  enableFluids?: boolean; // Particle-based fluid simulation (Lava, Acid, Water, Blood)
  enableVoxels?: boolean; // 3D Voxel rendering
  enable3DModels?: boolean; // 3D MD2/MD3 polygon rendering
  ambientColor?: string;

  // Web Workers Raycast Acceleration & 3D Weapons
  useWorkers?: boolean;
  workerCount?: number;
  weaponModel?: string; // e.g. "sword3d", "staff3d"
  weaponAttackTime?: number; // 0..1
  walkCycle?: number;
}

export interface DivSoundEffect {
  id: number;
  name: string;
  waveform: "square" | "sawtooth" | "sine" | "triangle" | "noise";
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  frequency: number;
  pitchSlide: number;
  vibratoDepth: number;
  vibratoSpeed: number;
  volume: number;
  filterCutoff?: number;
  dataUri?: string;
}

export const C_M7 = 7; // c_m7 collision/rendering type in DIV
export const C_M8 = 8; // c_m8 collision/rendering type in DIV

export interface Camera3DInfo {
  mode: "mode7" | "mode8" | "none";
  modeTitle: string;
  active: boolean;
  x: number;
  y: number;
  z: number;
  angle: number;
  height: number;
  distance?: number;
  horizon?: number;
  pitch?: number;
  fogDistance?: number;
  cameraTargetId?: number;
  cameraTargetName?: string;
  cardinal: string;
}

export interface DivDiagnostic {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
  rule?: string;
}

export interface ProjectState {
  id: string;
  title: string;
  author: string;
  version: string;
  code: string;
  fpg: DivGraphic[];
  resolution: "320x200" | "640x480" | "800x600" | "1024x768";
  fps: number;
  theme: "dark" | "retro" | "cyber";
  updatedAt: number;
  twoFactorEnabled?: boolean;
}

export interface PeerUser {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; ch: number };
  activeTab: string;
  device: string;
}
