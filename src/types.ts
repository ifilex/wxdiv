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
  floorTexture?: number;
  ceilTexture?: number;
  lightLevel?: number; // 0..1 ambient lighting (Doom-like)
  torchFlicker?: boolean;
  active: boolean;
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
