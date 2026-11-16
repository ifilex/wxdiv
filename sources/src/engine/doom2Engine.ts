/**
 * HTML5 DOOM 2 Polygon Sector & Portal 3D Engine for DIV Games Studio
 * 
 * Features:
 * - Free-form polygonal sector and linedef architecture (Doom 2 format)
 * - True Sutherland-Hodgman near-plane frustum clipping at Z_near = 0.15
 *   (Completely eliminates wall deformation, fisheye, and near-wall glitches)
 * - Multi-level 2-sided portals: lower walls (stair risers, ledges, pits) and upper walls (lintels, archways)
 * - Automatic staircase generation with sector step heights and lower wall step textures
 * - Authentic Doom 2 textures (STARTAN3, BROWN144, TEKGREN2, COMP2, BRICK1, MARBFAC, STEP1, FIREWALL, WOOD1, METAL1, etc.)
 * - Flats with animated liquids & light levels (FLOOR4_8, CEIL3_5, TLITE6_5, NUKAGE, LAVA, BLOOD1, STEP, GATE1)
 * - Full integration with MD2/MD3 3D models and sprite entities with Depth Buffer Occlusion
 * - Interactive Doom Scripts: Doors (D1, DR), Lifts (Plat_DownWaitUpStay), Crushers, Teleporters, Hazards, Explosive Barrels
 * - Built-in HTML5 Web Audio Procedural Doom Sound Synthesizer (shotgun, door, lift, teleport, items, pain, monster)
 * - Authentic Classic Doom Status Bar (HUD) with animated Doomguy face and Doom Automap radar
 * - Automatic Grid-to-Doom Polygon Converter (convertGridMapToDoomPolygons) for running any Mode 8 map
 */

import earcut from "earcut";
import {
  DivDoomLinedef,
  DivDoomSector,
  DivMode8Entity,
  DivMode8PlacedModel,
  DivMode8Light,
  DivMode8PlacedVoxel,
  DivMode8Sector,
  DivMode8Door,
  DivVectorWall,
  Mode8CameraMode,
} from "../types";
import {
  ModelOverlayPoint,
  render3DModelToBuffer,
  renderVoxelToBuffer,
  renderFirstPersonWeapon3D,
  BUILTIN_3D_MODELS,
  BUILTIN_VOXELS,
} from "./mode8Enhanced";
import { WadParser } from "./doom3d/WadParser";
import { DoomMapData, DoomThing } from "./doom3d/types";
import { renderMode8ThreeWorld, Mode8ThreeEditorOverlay } from "./mode8ThreeRenderer";
import {
  ZBufferManager,
  clipPolygonToFrustum,
  clipSegmentToFrustum,
  FrustumParams,
} from "./mode8ZBuffer";
import {
  CANONICAL_TEXTURES,
  paintMode8TextureToCanvas,
  resolveCanonicalTextureName,
} from "./mode8TextureRegistry";

// --- Canonical Mode 8 Textures & Flats Registry (100% Parity Across Editor, IDE & HTML) ---

export interface DoomTextureMeta {
  name: string;
  category: "walls" | "tech" | "gothic" | "doors_steps" | "sky" | "roblox_arcade" | "custom";
  width: number;
  height: number;
  description: string;
  kidLabel?: string;
  dominantColor: string;
}

export interface DoomFlatMeta {
  name: string;
  description: string;
  kidLabel?: string;
  color: string;
  type: "floor" | "ceiling" | "liquid" | "step";
  damage?: number;
}

export const DOOM_WALL_TEXTURES: DoomTextureMeta[] = CANONICAL_TEXTURES.filter(
  (t) => t.kind === "wall" || t.kind === "both" || t.kind === "sky"
).map((t) => ({
  name: t.name,
  category:
    t.category === "roblox_lego"
      ? "roblox_arcade"
      : t.category === "floors" || t.category === "liquids"
      ? "walls"
      : t.category,
  width: t.width,
  height: t.height,
  description: t.description,
  kidLabel: t.kidLabel,
  dominantColor: t.dominantColor,
}));

export const DOOM_FLATS: DoomFlatMeta[] = CANONICAL_TEXTURES.filter(
  (t) => t.kind === "flat" || t.kind === "both"
).map((t) => ({
  name: t.name,
  description: t.description,
  kidLabel: t.kidLabel,
  color: t.dominantColor,
  type:
    t.category === "liquids"
      ? "liquid"
      : t.name.includes("CEIL") || t.name.includes("TLITE")
      ? "ceiling"
      : t.name.includes("STEP")
      ? "step"
      : "floor",
  damage: t.damage,
}));

// Cache of generated texture canvases
const textureCanvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Canonical Mode 8 wall/sky/block texture generator (parity with Three.js WebGL & Compiled HTML)
 */
export function getDoomTextureCanvas(rawName: string, frameTime: number = 0): HTMLCanvasElement {
  const { canonical, meta } = resolveCanonicalTextureName(rawName, "STUD_BLUE");
  const isAnimated =
    Boolean(meta.animatedScroll) || canonical === "SLIME01" || canonical === "COMP2" || canonical === "FIREWALL";
  const animFrame = isAnimated ? Math.floor(frameTime * 4) % 4 : 0;
  const cacheKey = isAnimated ? `${canonical}_${animFrame}` : canonical;

  const cached = textureCanvasCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  const width = meta.width || 128;
  const height = meta.height || 128;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  if (width !== height) {
    ctx.save();
    ctx.scale(1, height / width);
    paintMode8TextureToCanvas(canonical, ctx, width, frameTime);
    ctx.restore();
  } else {
    paintMode8TextureToCanvas(canonical, ctx, width, frameTime);
  }

  textureCanvasCache.set(cacheKey, canvas);
  return canvas;
}

const flatCanvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Canonical Mode 8 floor/ceiling/liquid flat generator (parity with Three.js WebGL & Compiled HTML)
 */
export function getDoomFlatCanvas(rawName: string, frameTime: number = 0): HTMLCanvasElement {
  const { canonical, meta } = resolveCanonicalTextureName(rawName, "STUD_FLOOR_BLUE");
  const isAnimated =
    Boolean(meta.animatedScroll) || canonical === "NUKAGE" || canonical === "LAVA" || canonical === "BLOOD1" || canonical === "WATER";
  const animFrame = isAnimated ? Math.floor(frameTime * 4) % 4 : 0;
  const cacheKey = isAnimated ? `${canonical}_${animFrame}` : canonical;

  const cached = flatCanvasCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  paintMode8TextureToCanvas(canonical, ctx, 64, frameTime);
  flatCanvasCache.set(cacheKey, canvas);
  return canvas;
}

// =============================================================================
// DOOM AUDIO SYNTHESIZER (Web Audio API)
// =============================================================================

class DoomAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx && typeof window !== "undefined") {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      this.ctx = null;
      return null;
    }
  }

  public playShotgun() {
    try {
      const actx = this.getContext();
      if (!actx) return;
      const t = actx.currentTime;

    // 1. Noise blast
    const bufferSize = actx.sampleRate * 0.35;
    const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (actx.sampleRate * 0.08));
    }
    const noise = actx.createBufferSource();
    noise.buffer = buffer;

    // Filter
    const filter = actx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.3);

    const gain = actx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(actx.destination);
    noise.start(t);

    // 2. Low boom oscillator
    const osc = actx.createOscillator();
    const oscGain = actx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.3);
    oscGain.gain.setValueAtTime(0.9, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(oscGain);
    oscGain.connect(actx.destination);
    osc.start(t);
    osc.stop(t + 0.35);

      // 3. Pump action click
      setTimeout(() => {
        try {
          this.playClick(240, 0.06);
        } catch {
          // Ignore audio playback errors
        }
      }, 450);
    } catch {
      // Ignore Web Audio failures
    }
  }

  public playDoorOpen() {
    const actx = this.getContext();
    if (!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.linearRampToValueAtTime(180, t + 0.6);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.7);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t);
    osc.stop(t + 0.75);
  }

  public playDoorClose() {
    const actx = this.getContext();
    if (!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.6);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.7);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t);
    osc.stop(t + 0.75);
  }

  public playLift() {
    const actx = this.getContext();
    if (!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(110, t + 1.2);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  public playTeleport() {
    const actx = this.getContext();
    if (!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.5);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  public playItemPickup() {
    const actx = this.getContext();
    if (!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(660, t + 0.08);
    osc.frequency.setValueAtTime(880, t + 0.16);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  public playPain() {
    const actx = this.getContext();
    if (!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.25);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  public playSlimeBurn() {
    const actx = this.getContext();
    if (!actx) return;
    const t = actx.currentTime;
    const bufferSize = actx.sampleRate * 0.2;
    const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = actx.createBufferSource();
    noise.buffer = buffer;
    const filter = actx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2400, t);
    const gain = actx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(actx.destination);
    noise.start(t);
  }

  public playExplosion() {
    const actx = this.getContext();
    if (!actx) return;
    const t = actx.currentTime;
    const bufferSize = actx.sampleRate * 0.8;
    const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (actx.sampleRate * 0.2));
    }
    const noise = actx.createBufferSource();
    noise.buffer = buffer;
    const filter = actx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(50, t + 0.7);
    const gain = actx.createGain();
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(actx.destination);
    noise.start(t);
  }

  public playMonsterGrowl() {
    const actx = this.getContext();
    if (!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(45, t + 0.45);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.5);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t);
    osc.stop(t + 0.52);
  }

  public playPlayerPain() {
    this.playPain();
  }

  public playMonsterDeath() {
    this.playMonsterGrowl();
  }

  private playClick(freq: number, duration: number) {
    const actx = this.getContext();
    if (!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }
}

export const doomSound = new DoomAudioEngine();

// =============================================================================
// DOOM SCRIPT & WORLD STATE MANAGER
// =============================================================================

export interface DoomDoorState {
  sectorId: number;
  baseCeil: number;
  openCeil: number;
  state: "closed" | "opening" | "open" | "closing";
  timer: number;
  tag?: number;
}

export interface DoomLiftState {
  sectorId: number;
  baseFloor: number;
  lowerFloor: number;
  state: "up" | "lowering" | "down" | "raising";
  timer: number;
  tag?: number;
}

export class DoomWorldStateManager {
  public doors = new Map<number, DoomDoorState>();
  public doorOffsets = new Map<number, number>();
  public lifts = new Map<number, DoomLiftState>();
  public muzzleFlashFrames = 0;
  public screenDamageFlash = 0; // alpha of red damage flash
  public screenHazardFlash = 0; // alpha of green slime flash
  public screenItemFlash = 0;   // alpha of gold pickup flash
  public screenTeleportFlash = 0; // alpha of purple teleport flash
  public health = 100;
  public armor = 50;
  public ammo = 50;
  public maxAmmo = 200;
  public kills = 0;
  public keys = { blue: false, red: false, yellow: false };
  public lastPainTime = 0;
  public lastGrinTime = 0;
  public lastShotTime = 0;

  public openDoor(sectorId: number, sectors: DivDoomSector[]) {
    const sec = sectors.find((s) => s.id === sectorId);
    if (!sec) return;
    let door = this.doors.get(sectorId);
    if (!door) {
      door = {
        sectorId,
        baseCeil: sec.ceilHeight,
        openCeil: sec.ceilHeight + 1.2,
        state: "closed",
        timer: 0,
      };
      this.doors.set(sectorId, door);
    }
    if (door.state === "closed" || door.state === "closing") {
      door.state = "opening";
      doomSound.playDoorOpen();
    }
  }

  public activateLift(sectorId: number, sectors: DivDoomSector[]) {
    const sec = sectors.find((s) => s.id === sectorId);
    if (!sec) return;
    let lift = this.lifts.get(sectorId);
    if (!lift) {
      lift = {
        sectorId,
        baseFloor: sec.floorHeight,
        lowerFloor: sec.floorHeight - 1.0,
        state: "up",
        timer: 0,
      };
      this.lifts.set(sectorId, lift);
    }
    if (lift.state === "up") {
      lift.state = "lowering";
      doomSound.playLift();
    }
  }

  public update(dt: number, sectors: DivDoomSector[]) {
    // Decay screen flashes
    if (this.muzzleFlashFrames > 0) this.muzzleFlashFrames--;
    if (this.screenDamageFlash > 0) this.screenDamageFlash = Math.max(0, this.screenDamageFlash - dt * 2.5);
    if (this.screenHazardFlash > 0) this.screenHazardFlash = Math.max(0, this.screenHazardFlash - dt * 2.5);
    if (this.screenItemFlash > 0) this.screenItemFlash = Math.max(0, this.screenItemFlash - dt * 2.5);
    if (this.screenTeleportFlash > 0) this.screenTeleportFlash = Math.max(0, this.screenTeleportFlash - dt * 2.0);

    // Update active doors
    for (const [, door] of this.doors) {
      const sec = sectors.find((s) => s.id === door.sectorId);
      if (!sec) continue;

      if (door.state === "opening") {
        sec.ceilHeight += dt * 1.8;
        if (sec.ceilHeight >= door.openCeil) {
          sec.ceilHeight = door.openCeil;
          door.state = "open";
          door.timer = 3.5; // Stay open for 3.5s
        }
      } else if (door.state === "open") {
        door.timer -= dt;
        if (door.timer <= 0) {
          door.state = "closing";
          doomSound.playDoorClose();
        }
      } else if (door.state === "closing") {
        sec.ceilHeight -= dt * 1.8;
        if (sec.ceilHeight <= door.baseCeil) {
          sec.ceilHeight = door.baseCeil;
          door.state = "closed";
        }
      }
      const span = Math.max(0.1, door.openCeil - door.baseCeil);
      this.doorOffsets.set(door.sectorId, Math.max(0, Math.min(1, (sec.ceilHeight - door.baseCeil) / span)));
    }

    // Update active lifts
    for (const [, lift] of this.lifts) {
      const sec = sectors.find((s) => s.id === lift.sectorId);
      if (!sec) continue;

      if (lift.state === "lowering") {
        sec.floorHeight -= dt * 1.2;
        if (sec.floorHeight <= lift.lowerFloor) {
          sec.floorHeight = lift.lowerFloor;
          lift.state = "down";
          lift.timer = 3.0; // Wait at bottom
        }
      } else if (lift.state === "down") {
        lift.timer -= dt;
        if (lift.timer <= 0) {
          lift.state = "raising";
          doomSound.playLift();
        }
      } else if (lift.state === "raising") {
        sec.floorHeight += dt * 1.2;
        if (sec.floorHeight >= lift.baseFloor) {
          sec.floorHeight = lift.baseFloor;
          lift.state = "up";
        }
      }
    }
  }

  public applyDamage(amount: number) {
    if (this.armor > 0) {
      const absorb = Math.min(this.armor, Math.floor(amount * 0.6));
      this.armor -= absorb;
      amount -= absorb;
    }
    this.health = Math.max(0, this.health - amount);
    this.screenDamageFlash = 0.55;
    this.lastPainTime = performance.now();
    doomSound.playPain();
  }

  public shootWeapon(): boolean {
    if (this.ammo <= 0) return false;
    this.ammo--;
    this.muzzleFlashFrames = 4;
    this.lastShotTime = performance.now();
    doomSound.playShotgun();
    return true;
  }
}

export const doomWorldState = new DoomWorldStateManager();

// =============================================================================
// GRID TO DOOM POLYGON CONVERTER
// Automatically turns any 2D Grid Level (Mode 8) into Authentic Doom 2 Sectors
// =============================================================================

export function convertGridMapToDoomPolygons(
  map: number[][],
  sectors?: DivMode8Sector[][],
  doors?: DivMode8Door[],
  vectorWalls?: DivVectorWall[],
  mapWidth: number = 32,
  mapHeight: number = 32
): {
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
} {
  const doomSectors: DivDoomSector[] = [];
  const doomLinedefs: DivDoomLinedef[] = [];
  const sectorMap = new Map<string, number>();

  let nextSectorId = 1;

  // Sector 0 is the default room
  doomSectors.push({
    id: 0,
    floorHeight: 0,
    ceilHeight: 1.4,
    floorTexture: "FLOOR4_8",
    ceilTexture: "CEIL3_5",
    lightLevel: 190,
  });

  // Helper to get or create a sector for a grid cell
  const getCellSectorId = (gx: number, gy: number): number => {
    if (gx < 0 || gx >= mapWidth || gy < 0 || gy >= mapHeight) return 0;
    const sec = sectors?.[gy]?.[gx];
    if (!sec) return 0;
    const fH = sec.floorHeight ?? 0;
    const cH = sec.ceilHeight ?? 1.4;
    const light = Math.floor((sec.lightLevel ?? 0.8) * 255);
    const fluid = sec.fluidType || "none";
    const key = `${fH}_${cH}_${light}_${fluid}`;

    let id = sectorMap.get(key);
    if (id === undefined) {
      id = nextSectorId++;
      sectorMap.set(key, id);

      let flatTex = "FLOOR4_8";
      if (fluid === "acid") flatTex = "NUKAGE";
      else if (fluid === "lava") flatTex = "LAVA";
      else if (fluid === "blood") flatTex = "BLOOD1";
      else if (fluid === "water") flatTex = "WATER";
      else if (fH > 0.4) flatTex = "CRATOP2";

      doomSectors.push({
        id,
        floorHeight: fH,
        ceilHeight: cH,
        floorTexture: flatTex,
        ceilTexture: "CEIL3_5",
        lightLevel: light,
        special: (fluid === "acid" || fluid === "lava") ? 7 : 0,
      });
    }
    return id;
  };

  // Convert solid wall boundaries to 1-sided and 2-sided linedefs
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const cellVal = map[y]?.[x] ?? 0;
      const isWall = cellVal > 0;

      if (!isWall) {
        // Walkable floor cell: check neighbors for walls or height portals
        const neighbors = [
          { dx: 0, dy: -1, x1: x, y1: y, x2: x + 1, y2: y },         // North
          { dx: 1, dy: 0, x1: x + 1, y1: y, x2: x + 1, y2: y + 1 },   // East
          { dx: 0, dy: 1, x1: x + 1, y1: y + 1, x2: x, y2: y + 1 },   // South
          { dx: -1, dy: 0, x1: x, y1: y + 1, x2: x, y2: y },          // West
        ];

        const mySecId = getCellSectorId(x, y);

        for (const n of neighbors) {
          const nx = x + n.dx;
          const ny = y + n.dy;
          const nVal = (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight) ? (map[ny]?.[nx] ?? 0) : 1;

          if (nVal > 0) {
            // Border with solid wall -> 1-sided Linedef
            let texName = "STARTAN3";
            if (nVal === 2) texName = "BROWN144";
            else if (nVal === 3) texName = "TEKGREN2";
            else if (nVal === 4) texName = "COMP2";
            else if (nVal === 5) texName = "BRICK1";
            else if (nVal === 6) texName = "MARBFAC";
            else if (nVal === 7) texName = "STONE2";
            else if (nVal === 8) texName = "SHAWN2";

            doomLinedefs.push({
              id: `grid_w_${x}_${y}_${n.dx}_${n.dy}`,
              x1: n.x1,
              y1: n.y1,
              x2: n.x2,
              y2: n.y2,
              frontSectorId: mySecId,
              isTwoSided: false,
              middleTexture: texName,
              blocking: true,
            });
          } else {
            // Walkable to walkable: check if height difference creates a 2-sided portal!
            const nSecId = getCellSectorId(nx, ny);
            if (nSecId !== mySecId) {
              const mySec = doomSectors.find((s) => s.id === mySecId);
              const nSec = doomSectors.find((s) => s.id === nSecId);
              if (mySec && nSec && (mySec.floorHeight !== nSec.floorHeight || mySec.ceilHeight !== nSec.ceilHeight)) {
                doomLinedefs.push({
                  id: `portal_${x}_${y}_${nx}_${ny}`,
                  x1: n.x1,
                  y1: n.y1,
                  x2: n.x2,
                  y2: n.y2,
                  frontSectorId: mySecId,
                  backSectorId: nSecId,
                  isTwoSided: true,
                  lowerTexture: "STEP1",
                  upperTexture: "STARTAN3",
                  blocking: false,
                });
              }
            }
          }
        }
      }
    }
  }

  // Include free-form Vector Walls
  if (vectorWalls && vectorWalls.length > 0) {
    for (const vw of vectorWalls) {
      doomLinedefs.push({
        id: vw.id,
        x1: vw.x1,
        y1: vw.y1,
        x2: vw.x2,
        y2: vw.y2,
        frontSectorId: 0,
        isTwoSided: !!vw.isTwoSided,
        backSectorId: vw.portalSector,
        middleTexture: "STARTAN3",
        blocking: true,
      });
    }
  }

  return { sectors: doomSectors, linedefs: doomLinedefs };
}

/**
 * Generate a complete, ready-to-run Staircase with progressive sector floor heights
 * and 2-sided portal linedefs with STEP textures.
 */
export function generateDoomStaircase(
  startX: number,
  startY: number,
  dirX: number,
  dirY: number,
  stepCount: number,
  stepWidth: number,
  stepLength: number,
  baseFloorHeight: number,
  stepHeightDelta: number,
  baseCeilingHeight: number = 1.8,
  stairTexture: string = "STEP1",
  flatTexture: string = "STEP",
  startSectorId: number = 0,
  endSectorId?: number,
  baseSectorId?: number
): {
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
} {
  const sectors: DivDoomSector[] = [];
  const linedefs: DivDoomLinedef[] = [];

  const len = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / len;
  const ny = dirY / len;
  const px = -ny;
  const py = nx;

  const halfW = stepWidth / 2;
  let currentFloor = baseFloorHeight;
  const sectorBaseId = baseSectorId ?? Math.floor(100 + Math.random() * 800);

  for (let i = 0; i < stepCount; i++) {
    const secId = sectorBaseId + i;
    currentFloor += stepHeightDelta;

    sectors.push({
      id: secId,
      floorHeight: Number(currentFloor.toFixed(2)),
      ceilHeight: Math.max(baseCeilingHeight, currentFloor + 1.2),
      floorTexture: flatTexture,
      ceilTexture: "CEIL3_5",
      lightLevel: Math.min(255, 190 + i * 6),
    });

    const stepCenterStartX = startX + nx * (i * stepLength);
    const stepCenterStartY = startY + ny * (i * stepLength);
    const stepCenterEndX = startX + nx * ((i + 1) * stepLength);
    const stepCenterEndY = startY + ny * ((i + 1) * stepLength);

    const v1 = { x: Number((stepCenterStartX - px * halfW).toFixed(2)), y: Number((stepCenterStartY - py * halfW).toFixed(2)) };
    const v2 = { x: Number((stepCenterStartX + px * halfW).toFixed(2)), y: Number((stepCenterStartY + py * halfW).toFixed(2)) };
    const v3 = { x: Number((stepCenterEndX + px * halfW).toFixed(2)), y: Number((stepCenterEndY + py * halfW).toFixed(2)) };
    const v4 = { x: Number((stepCenterEndX - px * halfW).toFixed(2)), y: Number((stepCenterEndY - py * halfW).toFixed(2)) };

    const prevSecId = i === 0 ? startSectorId : sectorBaseId + i - 1;
    // Front step riser portal
    linedefs.push({
      id: `stair_${secId}_front`,
      x1: v1.x,
      y1: v1.y,
      x2: v2.x,
      y2: v2.y,
      frontSectorId: prevSecId,
      backSectorId: secId,
      isTwoSided: true,
      lowerTexture: stairTexture,
      blocking: false,
    });

    // Left flank (2-sided against surrounding room so step sides show risers from outside!)
    linedefs.push({
      id: `stair_${secId}_left`,
      x1: v1.x,
      y1: v1.y,
      x2: v4.x,
      y2: v4.y,
      frontSectorId: secId,
      backSectorId: startSectorId,
      isTwoSided: true,
      lowerTexture: stairTexture,
      blocking: false,
    });

    // Right flank (clockwise winding v3->v2 points inward normal toward step)
    linedefs.push({
      id: `stair_${secId}_right`,
      x1: v3.x,
      y1: v3.y,
      x2: v2.x,
      y2: v2.y,
      frontSectorId: secId,
      backSectorId: startSectorId,
      isTwoSided: true,
      lowerTexture: stairTexture,
      blocking: false,
    });

    if (i === stepCount - 1) {
      linedefs.push({
        id: `stair_${secId}_back`,
        x1: v4.x,
        y1: v4.y,
        x2: v3.x,
        y2: v3.y,
        frontSectorId: secId,
        backSectorId: endSectorId ?? startSectorId,
        isTwoSided: true,
        lowerTexture: stairTexture,
        blocking: false,
      });
    }
  }

  return { sectors, linedefs };
}

// =============================================================================
// DOOM WAD MAP PARSER CONVERTER & BUILT-IN E1M1 LEVEL GENERATOR
// =============================================================================

/**
 * Converts DoomMapData parsed by WadParser into Mode 8 polygon format
 */
export function convertWadMapToDoomMode8(
  mapData: DoomMapData,
  scale: number = 0.015625
): {
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
  entities: DivMode8Entity[];
  placedModels: DivMode8PlacedModel[];
  playerStart: { x: number; y: number; angle: number };
} {
  const sectors: DivDoomSector[] = [];
  const linedefs: DivDoomLinedef[] = [];
  const entities: DivMode8Entity[] = [];
  const placedModels: DivMode8PlacedModel[] = [];
  let playerStart = { x: 4.0, y: 4.0, angle: 0 };

  // Calculate WAD bounding box to normalize coordinates
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  if (mapData.vertexes && mapData.vertexes.length > 0) {
    mapData.vertexes.forEach((v) => {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    });
  }

  const hasBounds = isFinite(minX) && isFinite(maxY);
  const toWorldX = (vx: number) =>
    hasBounds ? Number(((vx - minX) * scale + 4.0).toFixed(3)) : Number((vx * scale).toFixed(3));
  const toWorldY = (vy: number) =>
    hasBounds ? Number(((maxY - vy) * scale + 4.0).toFixed(3)) : Number((vy * scale).toFixed(3));
  const toWorldAngle = (ang: number) =>
    hasBounds ? ((360 - (ang || 0)) % 360) : (ang || 0);

  // Convert sectors
  if (mapData.sectors) {
    mapData.sectors.forEach((sec, idx) => {
      let floorTex = (sec.floorTexture || "FLOOR4_8").toUpperCase();
      let ceilTex = (sec.ceilingTexture || "CEIL3_5").toUpperCase();
      if (floorTex.includes("NUK") || floorTex.includes("SLIME")) floorTex = "NUKAGE";
      if (floorTex.includes("LAVA")) floorTex = "LAVA";
      if (floorTex.includes("BLOOD")) floorTex = "BLOOD1";
      if (floorTex.includes("WATER")) floorTex = "WATER";

      sectors.push({
        id: sec.id !== undefined ? sec.id : idx,
        floorHeight: Number(((sec.floorHeight || 0) * scale * 0.75).toFixed(2)),
        ceilHeight: Number(((sec.ceilingHeight || 128) * scale * 0.75).toFixed(2)),
        floorTexture: floorTex,
        ceilTexture: ceilTex,
        lightLevel: Math.min(255, Math.max(40, sec.lightLevel || 180)),
        special: sec.type || 0,
      });
    });
  }

  // Convert linedefs
  if (mapData.linedefs) {
    mapData.linedefs.forEach((ld, idx) => {
      const v1 = ld.v1;
      const v2 = ld.v2;
      if (!v1 || !v2) return;

      const fSecId = ld.frontSector ? ld.frontSector.id : ld.sideFront ? ld.sideFront.sectorId : 0;
      const bSecId = ld.backSector ? ld.backSector.id : ld.sideBack ? ld.sideBack.sectorId : undefined;
      const isTwoSided = Boolean(ld.sideBack && (ld.flags & 4 || bSecId !== undefined));

      let midTex = ld.sideFront?.middleTexture || "STARTAN3";
      let upTex = ld.sideFront?.upperTexture || "STARTAN3";
      let lowTex = ld.sideFront?.lowerTexture || "STEP1";

      linedefs.push({
        id: `wad_line_${idx}`,
        x1: toWorldX(v1.x),
        y1: toWorldY(v1.y),
        x2: toWorldX(v2.x),
        y2: toWorldY(v2.y),
        frontSectorId: fSecId,
        backSectorId: bSecId,
        isTwoSided,
        middleTexture: midTex !== "-" ? midTex : undefined,
        upperTexture: upTex !== "-" ? upTex : undefined,
        lowerTexture: lowTex !== "-" ? lowTex : "STEP1",
        blocking: Boolean(ld.flags & 1) || !isTwoSided,
        special: ld.specialType || 0,
      });
    });
  }

  // Convert things (Player start, enemies, items, barrels)
  if (mapData.things) {
    mapData.things.forEach((th, idx) => {
      const tx = toWorldX(th.x);
      const ty = toWorldY(th.y);
      const thAngle = toWorldAngle(th.angle || 0);

      if (th.type === 1) {
        // Player 1 Start
        playerStart = { x: tx, y: ty, angle: thAngle };
      } else if (th.type === 3001 || th.type === 3004 || th.type === 9) {
        // Imp or Shotgun Guy -> MD2 3D Model
        placedModels.push({
          id: `wad_imp_${idx}`,
          modelId: "doom_imp",
          x: tx,
          y: ty,
          z: 0.0,
          yaw: thAngle,
          animName: "idle",
          scale: 1.1,
        });
      } else if (th.type === 3005) {
        // Cacodemon
        placedModels.push({
          id: `wad_caco_${idx}`,
          modelId: "doom_caco",
          x: tx,
          y: ty,
          z: 0.6,
          yaw: thAngle,
          animName: "float",
          scale: 1.2,
        });
      } else if (th.type === 2035) {
        // Explosive Barrel
        entities.push({
          id: idx + 500,
          x: tx * 64,
          y: ty * 64,
          type: "barrel",
          alive: true,
        });
      } else if (th.type === 2011 || th.type === 2012) {
        // Medikit
        entities.push({
          id: idx + 600,
          x: tx * 64,
          y: ty * 64,
          type: "medikit",
          alive: true,
        });
      } else if (th.type === 2048 || th.type === 2049) {
        // Ammo
        entities.push({
          id: idx + 700,
          x: tx * 64,
          y: ty * 64,
          type: "ammo",
          alive: true,
        });
      } else if (th.type === 2001) {
        // Shotgun pickup
        entities.push({
          id: idx + 800,
          x: tx * 64,
          y: ty * 64,
          type: "weapon",
          alive: true,
        });
      } else if (th.type === 44 || th.type === 45 || th.type === 46) {
        // Keycard
        entities.push({
          id: idx + 900,
          x: tx * 64,
          y: ty * 64,
          type: "key",
          alive: true,
        });
      }
    });
  }

  return { sectors, linedefs, entities, placedModels, playerStart };
}

/**
 * Parses an external Doom WAD buffer and extracts the Mode 8 geometry
 */
export function parseWadBuffer(
  buffer: ArrayBuffer,
  mapName: string = "E1M1"
): {
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
  entities: DivMode8Entity[];
  placedModels: DivMode8PlacedModel[];
  playerStart: { x: number; y: number; angle: number };
} | null {
  try {
    const parser = new WadParser(buffer);
    const mapNames = parser.getMapNames();
    const targetMap = mapNames.includes(mapName) ? mapName : mapNames[0] || "E1M1";
    const mapData = parser.parseMap(targetMap);
    if (!mapData) return null;
    return convertWadMapToDoomMode8(mapData);
  } catch (err) {
    console.error("Error parsing Doom WAD buffer:", err);
    return null;
  }
}

/**
 * Generates the authentic Doom E1M1: Hangar map geometry
 * Includes the Octagon Entry Room with tech pillars, Main Door,
 * Balcony, Computer Room, and the Toxic Nukage Slime Courtyard.
 */
export function loadDoomE1M1Map(): {
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
  entities: DivMode8Entity[];
  placedModels: DivMode8PlacedModel[];
  playerStart: { x: number; y: number; angle: number };
} {
  const sectors: DivDoomSector[] = [
    // 0: Entry Hangar Room
    { id: 0, floorHeight: 0.0, ceilHeight: 2.2, floorTexture: "FLOOR4_8", ceilTexture: "CEIL3_5", lightLevel: 210 },
    // 1: Armor Balcony Pedestal
    { id: 1, floorHeight: 0.5, ceilHeight: 2.2, floorTexture: "TLITE6_5", ceilTexture: "CEIL3_5", lightLevel: 245 },
    // 2: Main Sliding Door
    { id: 2, floorHeight: 0.0, ceilHeight: 2.0, floorTexture: "FLOOR4_8", ceilTexture: "DOOR3", lightLevel: 190 },
    // 3: Computer Terminal Room
    { id: 3, floorHeight: 0.0, ceilHeight: 2.4, floorTexture: "FLOOR4_8", ceilTexture: "CEIL3_5", lightLevel: 185 },
    // 4: Elevated Computer Balcony
    { id: 4, floorHeight: 0.8, ceilHeight: 2.8, floorTexture: "BROWN144", ceilTexture: "CEIL3_5", lightLevel: 210 },
    // 5: Toxic Nukage Slime Courtyard (Open Sky)
    { id: 5, floorHeight: -0.4, ceilHeight: 5.0, floorTexture: "NUKAGE", ceilTexture: "SKY1", lightLevel: 255, special: 7 },
    // 6: Walkway Bridge over Nukage
    { id: 6, floorHeight: 0.2, ceilHeight: 5.0, floorTexture: "FLOOR4_8", ceilTexture: "SKY1", lightLevel: 255 },
    // 7: Secret Chamber
    { id: 7, floorHeight: 0.0, ceilHeight: 2.0, floorTexture: "FLOOR4_8", ceilTexture: "CEIL3_5", lightLevel: 140 },
  ];

  const linedefs: DivDoomLinedef[] = [
    // --- Sector 0: Starting Room Outer Walls (clockwise winding = inward normals!) ---
    { id: "e1_w0", x1: 1.0, y1: 1.0, x2: 6.0, y2: 1.0, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_w1", x1: 1.0, y1: 6.0, x2: 1.0, y2: 1.0, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_w2", x1: 6.0, y1: 6.0, x2: 1.0, y2: 6.0, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    // Armor Pedestal Portal (Sector 0 to Sector 1)
    { id: "e1_w3", x1: 1.5, y1: 2.0, x2: 1.5, y2: 5.0, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "e1_w4", x1: 1.0, y1: 2.0, x2: 1.5, y2: 2.0, frontSectorId: 1, backSectorId: 0, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "e1_w5", x1: 1.5, y1: 5.0, x2: 1.0, y2: 5.0, frontSectorId: 1, backSectorId: 0, isTwoSided: true, lowerTexture: "STEP1", blocking: false },

    // Tech Pillars in Sector 0 (CCW perimeter = outward facing normals)
    { id: "e1_pil1_1", x1: 3.6, y1: 2.5, x2: 3.0, y2: 2.5, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil1_2", x1: 3.6, y1: 3.1, x2: 3.6, y2: 2.5, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil1_3", x1: 3.0, y1: 3.1, x2: 3.6, y2: 3.1, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil1_4", x1: 3.0, y1: 2.5, x2: 3.0, y2: 3.1, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },

    { id: "e1_pil2_1", x1: 3.6, y1: 3.9, x2: 3.0, y2: 3.9, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil2_2", x1: 3.6, y1: 4.5, x2: 3.6, y2: 3.9, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil2_3", x1: 3.0, y1: 4.5, x2: 3.6, y2: 4.5, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil2_4", x1: 3.0, y1: 3.9, x2: 3.0, y2: 4.5, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },

    // Main Door Portal (Sector 0 to Sector 2 to Sector 3)
    { id: "e1_door_f", x1: 6.0, y1: 3.0, x2: 6.0, y2: 4.0, frontSectorId: 0, backSectorId: 2, isTwoSided: true, upperTexture: "DOOR3", blocking: false },
    { id: "e1_wall_rf1", x1: 6.0, y1: 1.0, x2: 6.0, y2: 3.0, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_wall_rf2", x1: 6.0, y1: 4.0, x2: 6.0, y2: 6.0, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },

    { id: "e1_door_b", x1: 6.8, y1: 3.0, x2: 6.8, y2: 4.0, frontSectorId: 2, backSectorId: 3, isTwoSided: true, upperTexture: "DOOR3", blocking: false },
    { id: "e1_door_side1", x1: 6.0, y1: 3.0, x2: 6.8, y2: 3.0, frontSectorId: 2, isTwoSided: false, middleTexture: "DOOR3", blocking: true },
    { id: "e1_door_side2", x1: 6.8, y1: 4.0, x2: 6.0, y2: 4.0, frontSectorId: 2, isTwoSided: false, middleTexture: "DOOR3", blocking: true },

    // --- Sector 3: Computer Terminal Room ---
    { id: "e1_c0", x1: 6.8, y1: 1.5, x2: 12.0, y2: 1.5, frontSectorId: 3, isTwoSided: false, middleTexture: "COMP2", blocking: true },
    { id: "e1_c1", x1: 6.8, y1: 3.0, x2: 6.8, y2: 1.5, frontSectorId: 3, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_c2", x1: 6.8, y1: 6.5, x2: 6.8, y2: 4.0, frontSectorId: 3, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_c3_l", x1: 8.5, y1: 6.5, x2: 6.8, y2: 6.5, frontSectorId: 3, isTwoSided: false, middleTexture: "BROWN144", blocking: true },
    { id: "e1_c3_r", x1: 12.0, y1: 6.5, x2: 11.0, y2: 6.5, frontSectorId: 3, isTwoSided: false, middleTexture: "BROWN144", blocking: true },

    // Balcony Stair Steps & Portal (Sector 3 to Sector 4)
    { id: "e1_balc1", x1: 10.0, y1: 1.5, x2: 10.0, y2: 6.5, frontSectorId: 3, backSectorId: 4, isTwoSided: true, lowerTexture: "STEP1", upperTexture: "STARTAN3", blocking: false },
    { id: "e1_balc_back", x1: 12.0, y1: 1.5, x2: 12.0, y2: 6.5, frontSectorId: 4, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },

    // Window opening onto Nukage Slime Courtyard (Sector 3 to Sector 5)
    { id: "e1_win1", x1: 11.0, y1: 6.5, x2: 8.5, y2: 6.5, frontSectorId: 3, backSectorId: 5, isTwoSided: true, upperTexture: "STARTAN3", lowerTexture: "STEP1", blocking: true },

    // --- Sector 5 & 6: Toxic Nukage Courtyard ---
    { id: "e1_nuk0_l", x1: 7.0, y1: 6.5, x2: 8.5, y2: 6.5, frontSectorId: 5, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_nuk0_r", x1: 11.0, y1: 6.5, x2: 13.0, y2: 6.5, frontSectorId: 5, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_nuk1", x1: 7.0, y1: 12.0, x2: 7.0, y2: 6.5, frontSectorId: 5, isTwoSided: false, middleTexture: "SLIME01", blocking: true },
    { id: "e1_nuk2", x1: 13.0, y1: 12.0, x2: 7.0, y2: 12.0, frontSectorId: 5, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_nuk3", x1: 13.0, y1: 6.5, x2: 13.0, y2: 12.0, frontSectorId: 5, isTwoSided: false, middleTexture: "SLIME01", blocking: true },

    // Walkway across the acid
    { id: "e1_walk1", x1: 9.0, y1: 6.5, x2: 9.0, y2: 11.0, frontSectorId: 5, backSectorId: 6, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "e1_walk2", x1: 10.5, y1: 6.5, x2: 10.5, y2: 11.0, frontSectorId: 5, backSectorId: 6, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "e1_walk3", x1: 9.0, y1: 11.0, x2: 10.5, y2: 11.0, frontSectorId: 6, backSectorId: 5, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
  ];

  const entities: DivMode8Entity[] = [
    { id: 1, x: 2.2 * 64, y: 3.5 * 64, type: "key", alive: true },
    { id: 2, x: 4.8 * 64, y: 2.0 * 64, type: "barrel", alive: true },
    { id: 3, x: 4.8 * 64, y: 5.0 * 64, type: "barrel", alive: true },
    { id: 4, x: 8.0 * 64, y: 2.5 * 64, type: "ammo", alive: true },
    { id: 5, x: 8.5 * 64, y: 4.5 * 64, type: "medikit", alive: true },
    { id: 6, x: 9.7 * 64, y: 9.0 * 64, type: "ammo", alive: true },
  ];

  const placedModels: DivMode8PlacedModel[] = [
    // Imps waiting on the Computer Balcony and in Courtyard
    { id: "imp_balcony_1", modelId: "doom_imp", x: 11.0, y: 3.0, z: 0.8, yaw: 180, animName: "idle", scale: 1.15 },
    { id: "imp_balcony_2", modelId: "doom_imp", x: 11.0, y: 5.0, z: 0.8, yaw: 180, animName: "idle", scale: 1.15 },
    { id: "imp_courtyard", modelId: "doom_imp", x: 11.5, y: 9.5, z: -0.4, yaw: 270, animName: "walk", scale: 1.2 },
  ];

  const playerStart = { x: 2.4, y: 3.5, angle: 0 };

  return { sectors, linedefs, entities, placedModels, playerStart };
}

// =============================================================================
// MAIN HTML5 DOOM POLYGON SECTOR & PORTAL RENDERER
// =============================================================================

function getFlatDominantRgb(flatName: string, now: number): { r: number; g: number; b: number; accent: string; emissive?: boolean } {
  switch (flatName) {
    case "NUKAGE": {
      const pulse = 0.85 + Math.sin(now * 4) * 0.15;
      return { r: Math.round(34 * pulse), g: Math.round(197 * pulse), b: Math.round(94 * pulse), accent: "#86efac", emissive: true };
    }
    case "LAVA": {
      const pulse = 0.85 + Math.sin(now * 5) * 0.15;
      return { r: Math.round(234 * pulse), g: Math.round(88 * pulse), b: Math.round(12 * pulse), accent: "#fde047", emissive: true };
    }
    case "BLOOD1":
      return { r: 127, g: 29, b: 29, accent: "#fb7185" };
    case "WATER":
      return { r: 2, g: 132, b: 199, accent: "#7dd3fc" };
    case "STEP":
      return { r: 71, g: 85, b: 105, accent: "#cbd5e1" };
    case "GRASS":
      return { r: 77, g: 124, b: 15, accent: "#a3e635" };
    case "GRASS_ROBLOX":
      return { r: 34, g: 197, b: 94, accent: "#86efac" };
    case "CRATOP2":
      return { r: 146, g: 64, b: 14, accent: "#fbbf24" };
    case "WOOD_ROBLOX":
      return { r: 217, g: 119, b: 6, accent: "#fde68a" };
    case "GATE1":
      return { r: 126, g: 34, b: 206, accent: "#e879f9", emissive: true };
    case "RROCK01":
      return { r: 127, g: 29, b: 29, accent: "#f87171" };
    case "FLAT10":
      return { r: 63, g: 63, b: 70, accent: "#a1a1aa" };
    case "STUD_FLOOR_BLUE":
      return { r: 2, g: 132, b: 199, accent: "#7dd3fc" };
    case "STUD_FLOOR_RED":
      return { r: 220, g: 38, b: 38, accent: "#fca5a5" };
    case "STUD_FLOOR_GOLD":
      return { r: 234, g: 179, b: 8, accent: "#fef08a" };
    case "STUD_FLOOR_GREEN":
      return { r: 22, g: 163, b: 74, accent: "#86efac" };
    case "STUD_FLOOR_WHITE":
      return { r: 203, g: 213, b: 225, accent: "#ffffff" };
    case "NEON_FLOOR":
      return { r: 30, g: 27, b: 75, accent: "#22d3ee", emissive: true };
    case "OBBY_FINISH":
      return { r: 245, g: 158, b: 11, accent: "#fef08a", emissive: true };
    case "DOJO_MAT":
      return { r: 180, g: 83, b: 9, accent: "#fde68a" };
    case "CEIL3_5":
      return { r: 51, g: 65, b: 85, accent: "#94a3b8" };
    case "TLITE6_5":
      return { r: 203, g: 213, b: 225, accent: "#ffffff" };
    default:
      return { r: 92, g: 84, b: 74, accent: "#a8a29e" };
  }
}

interface Pt2D {
  x: number;
  y: number;
}

interface SectorGeometry {
  outerLoops: Pt2D[][];
  holeLoops: Pt2D[][];
  area: number;
  triangles: [Pt2D, Pt2D, Pt2D][];
}

function isPointInPoly2D(px: number, py: number, poly: Pt2D[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function signedPolyArea(poly: Pt2D[]): number {
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += (poly[j].x - poly[i].x) * (poly[j].y + poly[i].y);
  }
  return sum * 0.5;
}

function getInteriorPointForLoop(poly: Pt2D[]): Pt2D {
  if (poly.length < 3) return poly[0] || { x: 0, y: 0 };
  const a = poly[0];
  const b = poly[1];
  const mx = (a.x + b.x) * 0.5;
  const my = (a.y + b.y) * 0.5;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const eps = Math.min(0.02, len * 0.1);
  const p1 = { x: mx - (dy / len) * eps, y: my + (dx / len) * eps };
  if (isPointInPoly2D(p1.x, p1.y, poly)) return p1;
  const p2 = { x: mx + (dy / len) * eps, y: my - (dx / len) * eps };
  if (isPointInPoly2D(p2.x, p2.y, poly)) return p2;
  return {
    x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
    y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
  };
}

const sectorGeomCache = new WeakMap<DivDoomLinedef[], { len: number; sig: string; bySector: Map<number, SectorGeometry> }>();

function buildSectorGeometryMap(linedefs: DivDoomLinedef[]): Map<number, SectorGeometry> {
  const sig = linedefs
    .map((l) => `${l.x1.toFixed(2)},${l.y1.toFixed(2)}-${l.x2.toFixed(2)},${l.y2.toFixed(2)}:${l.frontSectorId}:${l.backSectorId ?? -1}`)
    .join("|");
  const cached = sectorGeomCache.get(linedefs);
  if (cached && cached.len === linedefs.length && cached.sig === sig) {
    return cached.bySector;
  }

  const sectorIds = new Set<number>();
  for (const l of linedefs) {
    if (l.frontSectorId !== undefined) sectorIds.add(l.frontSectorId);
    if (l.backSectorId !== undefined) sectorIds.add(l.backSectorId);
  }

  const bySector = new Map<number, SectorGeometry>();
  const keyOf = (x: number, y: number) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;

  for (const secId of sectorIds) {
    const segs = linedefs.filter((l) => l.frontSectorId === secId || l.backSectorId === secId);
    if (segs.length < 3) continue;

    interface EdgeItem {
      uKey: string;
      vKey: string;
      u: Pt2D;
      v: Pt2D;
      used: boolean;
    }

    const edges: EdgeItem[] = [];
    const seenPairs = new Set<string>();
    const adj = new Map<string, number[]>();

    for (const s of segs) {
      const k1 = keyOf(s.x1, s.y1);
      const k2 = keyOf(s.x2, s.y2);
      if (k1 === k2) continue;
      const pairKey = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const idx = edges.length;
      edges.push({
        uKey: k1,
        vKey: k2,
        u: { x: s.x1, y: s.y1 },
        v: { x: s.x2, y: s.y2 },
        used: false,
      });
      if (!adj.has(k1)) adj.set(k1, []);
      if (!adj.has(k2)) adj.set(k2, []);
      adj.get(k1)!.push(idx);
      adj.get(k2)!.push(idx);
    }

    const rawLoops: Pt2D[][] = [];
    for (let startIdx = 0; startIdx < edges.length; startIdx++) {
      if (edges[startIdx].used) continue;
      edges[startIdx].used = true;
      const loop: Pt2D[] = [edges[startIdx].u];
      const startKey = edges[startIdx].uKey;
      let curKey = edges[startIdx].vKey;
      let curPt = edges[startIdx].v;
      let prevPt = edges[startIdx].u;

      let safety = 0;
      while (curKey !== startKey && safety < edges.length + 4) {
        safety++;
        loop.push(curPt);
        const candidates = (adj.get(curKey) || []).filter((ei) => !edges[ei].used);
        if (candidates.length === 0) break;

        let chosenIdx = candidates[0];
        if (candidates.length > 1) {
          const inAngle = Math.atan2(curPt.y - prevPt.y, curPt.x - prevPt.x);
          let bestTurn = Infinity;
          for (const ei of candidates) {
            const e = edges[ei];
            const nextPt = e.uKey === curKey ? e.v : e.u;
            const outAngle = Math.atan2(nextPt.y - curPt.y, nextPt.x - curPt.x);
            let turn = outAngle - inAngle;
            while (turn <= -Math.PI) turn += Math.PI * 2;
            while (turn > Math.PI) turn -= Math.PI * 2;
            if (turn < bestTurn) {
              bestTurn = turn;
              chosenIdx = ei;
            }
          }
        }

        const chosen = edges[chosenIdx];
        chosen.used = true;
        prevPt = curPt;
        if (chosen.uKey === curKey) {
          curKey = chosen.vKey;
          curPt = chosen.v;
        } else {
          curKey = chosen.uKey;
          curPt = chosen.u;
        }
      }

      if (curKey === startKey && loop.length >= 3 && Math.abs(signedPolyArea(loop)) > 1e-4) {
        rawLoops.push(loop);
      }
    }

    if (rawLoops.length === 0) continue;

    // Sort loops from largest |area| to smallest
    const sortedLoops = rawLoops
      .map((loop) => ({ loop, absArea: Math.abs(signedPolyArea(loop)), testPt: getInteriorPointForLoop(loop) }))
      .sort((a, b) => b.absArea - a.absArea);

    const outerIndices: number[] = [];
    const holeChildren = new Map<number, number[]>();
    const loopDepth: number[] = new Array(sortedLoops.length).fill(0);
    const parentIdx: number[] = new Array(sortedLoops.length).fill(-1);

    for (let i = 0; i < sortedLoops.length; i++) {
      let depth = 0;
      let directParent = -1;
      for (let j = 0; j < i; j++) {
        if (isPointInPoly2D(sortedLoops[i].testPt.x, sortedLoops[i].testPt.y, sortedLoops[j].loop)) {
          depth++;
          directParent = j;
        }
      }
      loopDepth[i] = depth;
      parentIdx[i] = directParent;
      if (depth % 2 === 0) {
        outerIndices.push(i);
        holeChildren.set(i, []);
      } else if (directParent >= 0 && holeChildren.has(directParent)) {
        holeChildren.get(directParent)!.push(i);
      }
    }

    const outerLoops: Pt2D[][] = [];
    const holeLoops: Pt2D[][] = [];
    const triangles: [Pt2D, Pt2D, Pt2D][] = [];
    let totalArea = 0;

    for (const oi of outerIndices) {
      const outer = sortedLoops[oi].loop;
      outerLoops.push(outer);
      totalArea += sortedLoops[oi].absArea;

      const coords: number[] = [];
      const flatVerts: Pt2D[] = [];
      for (const p of outer) {
        coords.push(p.x, p.y);
        flatVerts.push(p);
      }

      const holeIndices: number[] = [];
      for (const hi of holeChildren.get(oi) || []) {
        const hole = sortedLoops[hi].loop;
        holeLoops.push(hole);
        totalArea -= sortedLoops[hi].absArea;
        holeIndices.push(flatVerts.length);
        for (const p of hole) {
          coords.push(p.x, p.y);
          flatVerts.push(p);
        }
      }

      const triIndices = earcut(coords, holeIndices.length > 0 ? holeIndices : undefined, 2);
      for (let t = 0; t + 2 < triIndices.length; t += 3) {
        const a = flatVerts[triIndices[t]];
        const b = flatVerts[triIndices[t + 1]];
        const c = flatVerts[triIndices[t + 2]];
        if (a && b && c) triangles.push([a, b, c]);
      }
    }

    bySector.set(secId, {
      outerLoops,
      holeLoops,
      area: Math.max(0.01, totalArea),
      triangles,
    });
  }

  sectorGeomCache.set(linedefs, { len: linedefs.length, sig, bySector });
  return bySector;
}

export function getOrderedSectorPolygon(sectorId: number, linedefs: DivDoomLinedef[]): { x: number; y: number }[] {
  const geomMap = buildSectorGeometryMap(linedefs);
  const g = geomMap.get(sectorId);
  if (g && g.outerLoops.length > 0) return g.outerLoops[0];

  const segs = linedefs.filter((l) => l.frontSectorId === sectorId || l.backSectorId === sectorId);
  if (segs.length < 3) return [];
  const pts: Pt2D[] = [];
  for (const s of segs) {
    if (!pts.some((p) => Math.hypot(p.x - s.x1, p.y - s.y1) < 0.05)) pts.push({ x: s.x1, y: s.y1 });
    if (!pts.some((p) => Math.hypot(p.x - s.x2, p.y - s.y2) < 0.05)) pts.push({ x: s.x2, y: s.y2 });
  }
  if (pts.length < 3) return [];
  const cx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
  const cy = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
  pts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  return pts;
}

export function findSectorAtPoint(
  x: number,
  y: number,
  sectors: DivDoomSector[],
  linedefs: DivDoomLinedef[]
): DivDoomSector | null {
  if (!sectors || sectors.length === 0 || !linedefs || linedefs.length === 0) return null;
  const geomMap = buildSectorGeometryMap(linedefs);
  let bestSector: DivDoomSector | null = null;
  let bestArea = Infinity;

  for (const sec of sectors) {
    const geom = geomMap.get(sec.id);
    if (!geom || geom.outerLoops.length === 0) continue;
    const inOuter = geom.outerLoops.some((loop) => isPointInPoly2D(x, y, loop));
    if (!inOuter) continue;
    const inHole = geom.holeLoops.some((hole) => isPointInPoly2D(x, y, hole));
    if (inHole) continue;
    if (geom.area < bestArea || (Math.abs(geom.area - bestArea) < 0.01 && bestSector && sec.floorHeight > bestSector.floorHeight)) {
      bestArea = geom.area;
      bestSector = sec;
    }
  }
  return bestSector;
}

export function findSectorFloorHeightAt(
  x: number,
  y: number,
  sectors: DivDoomSector[],
  linedefs: DivDoomLinedef[]
): number | null {
  const sec = findSectorAtPoint(x, y, sectors, linedefs);
  return sec ? sec.floorHeight : null;
}

// =============================================================================
// SOFTWARE Z-BUFFERED TEXTURE CACHE & RASTERIZER BUFFERS
// =============================================================================

const IS_LITTLE_ENDIAN_SYS = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;

function packRgba32(r: number, g: number, b: number, a: number = 255): number {
  const cr = r < 0 ? 0 : r > 255 ? 255 : r | 0;
  const cg = g < 0 ? 0 : g > 255 ? 255 : g | 0;
  const cb = b < 0 ? 0 : b > 255 ? 255 : b | 0;
  const ca = a < 0 ? 0 : a > 255 ? 255 : a | 0;
  return IS_LITTLE_ENDIAN_SYS
    ? ((ca << 24) | (cb << 16) | (cg << 8) | cr) >>> 0
    : ((cr << 24) | (cg << 16) | (cb << 8) | ca) >>> 0;
}

function shadePackedAbgr(c32: number, multFixed256: number): number {
  if (multFixed256 >= 254 && multFixed256 <= 258) return c32;
  if (IS_LITTLE_ENDIAN_SYS) {
    const r = Math.min(255, (((c32 & 0xff) * multFixed256) >> 8));
    const g = Math.min(255, ((((c32 >>> 8) & 0xff) * multFixed256) >> 8));
    const b = Math.min(255, ((((c32 >>> 16) & 0xff) * multFixed256) >> 8));
    return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  }
  const r = Math.min(255, ((((c32 >>> 24) & 0xff) * multFixed256) >> 8));
  const g = Math.min(255, ((((c32 >>> 16) & 0xff) * multFixed256) >> 8));
  const b = Math.min(255, ((((c32 >>> 8) & 0xff) * multFixed256) >> 8));
  return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
}

interface CachedPixelTex {
  data: Uint32Array;
  w: number;
  h: number;
}

const canvasPixelCache = new WeakMap<HTMLCanvasElement, CachedPixelTex>();

function getCanvasPixels(canvas: HTMLCanvasElement): CachedPixelTex {
  const cached = canvasPixelCache.get(canvas);
  if (cached) return cached;
  const w = Math.max(1, canvas.width);
  const h = Math.max(1, canvas.height);
  const ctx = canvas.getContext("2d");
  let data: Uint32Array;
  if (ctx) {
    const img = ctx.getImageData(0, 0, w, h);
    data = new Uint32Array(img.data.buffer);
  } else {
    data = new Uint32Array(w * h);
  }
  const entry = { data, w, h };
  canvasPixelCache.set(canvas, entry);
  return entry;
}

interface SoftwareFb {
  w: number;
  h: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageData: ImageData;
  pixels: Uint32Array;
  zbuf: ZBufferManager;
}

let sharedFb: SoftwareFb | null = null;

function getSoftwareFramebuffer(w: number, h: number): SoftwareFb {
  if (sharedFb && sharedFb.w === w && sharedFb.h === h) {
    return sharedFb;
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(w, h);
  const pixels = new Uint32Array(imageData.data.buffer);
  const zbuf = new ZBufferManager(w, h);
  sharedFb = { w, h, canvas, ctx, imageData, pixels, zbuf };
  return sharedFb;
}

interface ProjFlatVert {
  sx: number;
  sy: number;
  iz: number;
  wxZ: number;
  wyZ: number;
}

function rasterizeTexturedFlatTri(
  pixels: Uint32Array,
  invZBuf: Float32Array,
  w: number,
  h: number,
  v0: ProjFlatVert,
  v1: ProjFlatVert,
  v2: ProjFlatVert,
  tex: CachedPixelTex,
  baseLightNorm: number,
  isEmissive: boolean
) {
  const area = (v1.sx - v0.sx) * (v2.sy - v0.sy) - (v1.sy - v0.sy) * (v2.sx - v0.sx);
  if (Math.abs(area) < 0.25) return;

  const minX = Math.max(0, Math.floor(Math.min(v0.sx, v1.sx, v2.sx)));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(v0.sx, v1.sx, v2.sx)));
  const minY = Math.max(0, Math.floor(Math.min(v0.sy, v1.sy, v2.sy)));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(v0.sy, v1.sy, v2.sy)));
  if (minX > maxX || minY > maxY) return;

  const absArea = Math.abs(area);
  const invArea = 1 / absArea;
  const sign = area > 0 ? 1 : -1;

  const dx12 = v1.sy - v2.sy;
  const dy12 = v2.sx - v1.sx;
  const dx20 = v2.sy - v0.sy;
  const dy20 = v0.sx - v2.sx;
  const texData = tex.data;
  const twMask = tex.w - 1;
  const thMask = tex.h - 1;
  const isPow2 = (tex.w & twMask) === 0 && (tex.h & thMask) === 0;
  const tw = tex.w;
  const th = tex.h;

  for (let py = minY; py <= maxY; py++) {
    const cy = py + 0.5;
    const rowOff = py * w;
    for (let px = minX; px <= maxX; px++) {
      const cx = px + 0.5;
      const w0s = ((cx - v1.sx) * dx12 + (cy - v1.sy) * dy12) * sign;
      if (w0s < -0.002) continue;
      const w1s = ((cx - v2.sx) * dx20 + (cy - v2.sy) * dy20) * sign;
      if (w1s < -0.002) continue;
      const w2s = absArea - w0s - w1s;
      if (w2s < -0.002) continue;

      const u0 = w0s * invArea;
      const u1 = w1s * invArea;
      const u2 = 1 - u0 - u1;
      const iz = u0 * v0.iz + u1 * v1.iz + u2 * v2.iz;
      if (iz <= 0) continue;

      const idx = rowOff + px;
      if (iz <= invZBuf[idx]) continue;

      invZBuf[idx] = iz;
      const z = 1 / iz;
      const wx = (u0 * v0.wxZ + u1 * v1.wxZ + u2 * v2.wxZ) * z;
      const wy = (u0 * v0.wyZ + u1 * v1.wyZ + u2 * v2.wyZ) * z;
      const ux = Math.floor(wx * 64);
      const uy = Math.floor(wy * 64);
      const tx = isPow2 ? ux & twMask : ((ux % tw) + tw) % tw;
      const ty = isPow2 ? uy & thMask : ((uy % th) + th) % th;

      const texel = texData[ty * tw + tx];
      const fog = isEmissive ? 1.0 : Math.max(0.45, 1.02 - z * 0.025);
      const mult = Math.round(Math.max(0.35, Math.min(1.12, baseLightNorm * fog)) * 256);
      pixels[idx] = shadePackedAbgr(texel, mult);
    }
  }
}

function raycastSpringArm(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  linedefs: DivDoomLinedef[]
): number {
  const rdx = targetX - originX;
  const rdy = targetY - originY;
  let minT = 1.0;

  for (const l of linedefs) {
    if (l.noDraw) continue;
    if (l.isTwoSided && l.blocking !== true) continue;

    const sx = l.x2 - l.x1;
    const sy = l.y2 - l.y1;
    const denom = rdx * sy - rdy * sx;
    if (Math.abs(denom) < 1e-6) continue;

    const qpx = l.x1 - originX;
    const qpy = l.y1 - originY;
    const t = (qpx * sy - qpy * sx) / denom;
    const u = (qpx * rdy - qpy * rdx) / denom;

    if (t > 0.08 && t < minT && u >= 0 && u <= 1) {
      minT = t;
    }
  }
  return minT;
}

export function renderDoom2PolygonWorld(
  ctx: CanvasRenderingContext2D,
  screenWidth: number,
  screenHeight: number,
  cam: {
    x: number;
    y: number;
    z: number;
    angle: number;
    pitch: number;
  },
  linedefs: DivDoomLinedef[],
  sectors: DivDoomSector[],
  entities: DivMode8Entity[] = [],
  placedModels: DivMode8PlacedModel[] = [],
  lights: DivMode8Light[] = [],
  walkCycle: number = 0,
  weaponModel?: string,
  weaponAttackTime: number = 0,
  placedVoxels: DivMode8PlacedVoxel[] = [],
  options?: {
    showHUD?: boolean;
    showAutomap?: boolean;
    skyTexture?: string;
    cameraMode?: Mode8CameraMode;
    playerModelId?: string;
    editorOverlay?: Mode8ThreeEditorOverlay;
  }
) {
  if (!ctx || !cam || !Number.isFinite(screenWidth) || !Number.isFinite(screenHeight) || screenWidth <= 0 || screenHeight <= 0) {
    return;
  }
  const baseCamX = Number.isFinite(cam.x) ? cam.x : 4.5;
  const baseCamY = Number.isFinite(cam.y) ? cam.y : 5.5;
  const baseCamZ = Number.isFinite(cam.z) ? cam.z : 0.6;
  const baseCamAngle = Number.isFinite(cam.angle) ? cam.angle : 0;
  const baseCamPitch = Number.isFinite(cam.pitch) ? cam.pitch : 0;

  const now = performance.now() / 1000;
  doomWorldState.update(0.016, sectors || []);

  // Primary Hardware-Accelerated Three.js WebGL 3D Pipeline (Roblox SmoothPlastic/Stud PBR, SkyDome, Articulated Rigs)
  const enemyScreenBars: Array<{
    sx: number;
    sy: number;
    name: string;
    hp: number;
    maxHp: number;
    dist: number;
  }> = [];
  const threeRendered = renderMode8ThreeWorld(
    ctx,
    screenWidth,
    screenHeight,
    {
      x: baseCamX,
      y: baseCamY,
      z: baseCamZ,
      angle: baseCamAngle,
      pitch: baseCamPitch,
    },
    linedefs || [],
    sectors || [],
    {
      skyTexture: options?.skyTexture,
      cameraMode: options?.cameraMode,
      playerModelId: options?.playerModelId,
      weaponModel,
      weaponAttackTime,
      walkCycle,
      doorOffsets: doomWorldState.doorOffsets,
      lights,
      entities,
      placedModels,
      placedVoxels,
      editorOverlay: options?.editorOverlay,
      onEnemyScreenBars: enemyScreenBars,
    }
  );

  if (threeRendered) {
    // Draw crisp Roblox-style floating enemy HP bars & nameplates
    if (enemyScreenBars.length > 0) {
      ctx.save();
      for (const bar of enemyScreenBars) {
        if (bar.sx < -40 || bar.sx > screenWidth + 40 || bar.sy < 16 || bar.sy > screenHeight - 20) continue;
        const bw = Math.max(46, Math.min(82, Math.round(280 / Math.max(2.5, bar.dist))));
        const bh = 6;
        const bx = Math.round(bar.sx - bw * 0.5);
        const by = Math.round(bar.sy);
        const ratio = Math.max(0, Math.min(1, bar.hp / Math.max(1, bar.maxHp)));

        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(bx - 3, by - 16, bw + 6, 26);
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(bar.name, bar.sx, by - 5);

        ctx.fillStyle = "#1e293b";
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = ratio > 0.5 ? "#22c55e" : ratio > 0.25 ? "#f59e0b" : "#ef4444";
        ctx.fillRect(bx, by, Math.round(bw * ratio), bh);
      }
      ctx.restore();
    }

    // Damage / Hazard / Teleport screen flashes
    if (doomWorldState.screenDamageFlash > 0) {
      ctx.fillStyle = `rgba(220, 38, 38, ${doomWorldState.screenDamageFlash})`;
      ctx.fillRect(0, 0, screenWidth, screenHeight);
    }
    if (doomWorldState.screenHazardFlash > 0) {
      ctx.fillStyle = `rgba(34, 197, 94, ${doomWorldState.screenHazardFlash})`;
      ctx.fillRect(0, 0, screenWidth, screenHeight);
    }
    if (doomWorldState.screenTeleportFlash > 0) {
      ctx.fillStyle = `rgba(168, 85, 247, ${doomWorldState.screenTeleportFlash})`;
      ctx.fillRect(0, 0, screenWidth, screenHeight);
    }

    // Crosshair in FPS mode
    if ((options?.cameraMode || "fps") === "fps" && options?.showHUD !== false) {
      const cx = screenWidth * 0.5;
      const cy = screenHeight * 0.45;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx - 2, cy);
      ctx.moveTo(cx + 2, cy);
      ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy - 2);
      ctx.moveTo(cx, cy + 2);
      ctx.lineTo(cx, cy + 6);
      ctx.stroke();
      ctx.restore();
    }

    if (options?.showHUD !== false) {
      renderDoomHUD(ctx, screenWidth, screenHeight, {
        health: doomWorldState.health,
        armor: doomWorldState.armor,
        ammo: doomWorldState.ammo,
        maxAmmo: doomWorldState.maxAmmo,
        keys: doomWorldState.keys,
      });
    }

    if (options?.showAutomap) {
      renderDoomAutomap(ctx, screenWidth, screenHeight, { x: baseCamX, y: baseCamY, angle: baseCamAngle }, linedefs, sectors);
    }
    return;
  }

  // Compute chase/isometric/orbit camera with wall-collision spring-arm (software fallback)
  const cameraMode: Mode8CameraMode = options?.cameraMode || "fps";
  const playerFootZ = Math.max(-2.0, baseCamZ - 0.6);
  const baseRad = (baseCamAngle * Math.PI) / 180;
  let renderCam = { x: baseCamX, y: baseCamY, z: baseCamZ, angle: baseCamAngle, pitch: baseCamPitch };

  if (cameraMode === "third_person") {
    const desiredDist = 1.95;
    const rawX = baseCamX - Math.cos(baseRad) * desiredDist;
    const rawY = baseCamY - Math.sin(baseRad) * desiredDist;
    const hitT = raycastSpringArm(baseCamX, baseCamY, rawX, rawY, linedefs);
    const safeT = Math.max(0.28, hitT * 0.86);
    renderCam = {
      x: baseCamX + (rawX - baseCamX) * safeT,
      y: baseCamY + (rawY - baseCamY) * safeT,
      z: baseCamZ + 0.55 + (1 - safeT) * 0.35,
      angle: baseCamAngle,
      pitch: Math.max(-135, Math.min(135, baseCamPitch - 22)),
    };
  } else if (cameraMode === "isometric") {
    const isoAngle = baseCamAngle + 28;
    const isoRad = (isoAngle * Math.PI) / 180;
    const desiredDist = 3.1;
    const rawX = baseCamX - Math.cos(isoRad) * desiredDist;
    const rawY = baseCamY - Math.sin(isoRad) * desiredDist;
    const hitT = raycastSpringArm(baseCamX, baseCamY, rawX, rawY, linedefs);
    const safeT = Math.max(0.35, hitT * 0.88);
    renderCam = {
      x: baseCamX + (rawX - baseCamX) * safeT,
      y: baseCamY + (rawY - baseCamY) * safeT,
      z: baseCamZ + 2.05,
      angle: isoAngle,
      pitch: -74,
    };
  } else if (cameraMode === "orbit") {
    const orbitYaw = (baseCamAngle + now * 26) % 360;
    const orbitRad = (orbitYaw * Math.PI) / 180;
    const desiredDist = 2.45;
    const rawX = baseCamX - Math.cos(orbitRad) * desiredDist;
    const rawY = baseCamY - Math.sin(orbitRad) * desiredDist;
    const hitT = raycastSpringArm(baseCamX, baseCamY, rawX, rawY, linedefs);
    const safeT = Math.max(0.35, hitT * 0.86);
    renderCam = {
      x: baseCamX + (rawX - baseCamX) * safeT,
      y: baseCamY + (rawY - baseCamY) * safeT,
      z: baseCamZ + 1.15,
      angle: orbitYaw,
      pitch: -38,
    };
  }

  const viewCam = renderCam;

  // Adaptive crisp software framebuffer resolution + ZBufferManager
  const rw = Math.max(240, Math.min(540, Math.round(screenWidth)));
  const rh = Math.max(160, Math.round((rw * screenHeight) / screenWidth));
  const fb = getSoftwareFramebuffer(rw, rh);
  const { pixels, zbuf } = fb;
  const invZ = zbuf.invZ;
  zbuf.resetFrame();

  // Pre-index sectors by ID
  const sectorMap = new Map<number, DivDoomSector>();
  sectors.forEach((s) => sectorMap.set(s.id, s));
  if (!sectorMap.has(0)) {
    sectorMap.set(0, {
      id: 0,
      floorHeight: 0,
      ceilHeight: 2.2,
      floorTexture: "STUD_FLOOR_BLUE",
      ceilTexture: "SKY_ROBLOX",
      lightLevel: 235,
    });
  }

  const halfW = rw * 0.5;
  const halfH = rh * 0.5;
  const pitchScaled = Math.max(-140, Math.min(140, viewCam.pitch || 0)) * (rh / Math.max(1, screenHeight));
  const horizonY = halfH + pitchScaled;

  const fovDeg = 75;
  const focalLength = halfW / Math.tan((fovDeg * Math.PI) / 360);
  const camAngleRad = ((viewCam.angle || 0) * Math.PI) / 180;
  const cosA = Math.cos(camAngleRad);
  const sinA = Math.sin(camAngleRad);

  // 1. Fill Skybox & Abyss Backdrop directly into pixel buffer
  const skyName = options?.skyTexture || "SKY_ROBLOX";
  const skyTex = getCanvasPixels(getDoomTextureCanvas(skyName, now));
  const horizonRow = Math.max(0, Math.min(rh, Math.round(horizonY)));
  const skyShiftPx = (((viewCam.angle % 360) / 360) * skyTex.w * 2) | 0;
  const isBrightSky = skyName === "SKY_ROBLOX" || skyName === "SKY_CYBER";
  const groundTopR = isBrightSky ? 30 : 24;
  const groundTopG = isBrightSky ? 41 : 22;
  const groundTopB = isBrightSky ? 59 : 24;

  for (let py = 0; py < horizonRow; py++) {
    const sy = Math.min(skyTex.h - 1, Math.floor((py / Math.max(1, horizonRow)) * skyTex.h));
    const texRowOff = sy * skyTex.w;
    const dstRowOff = py * rw;
    for (let px = 0; px < rw; px++) {
      const tx = ((px + skyShiftPx) % skyTex.w + skyTex.w) % skyTex.w;
      pixels[dstRowOff + px] = skyTex.data[texRowOff + tx];
    }
  }
  for (let py = horizonRow; py < rh; py++) {
    const t = (py - horizonRow) / Math.max(1, rh - horizonRow);
    const shade = 1.0 - t * 0.55;
    const bg32 = packRgba32(groundTopR * shade, groundTopG * shade, groundTopB * shade, 255);
    pixels.fill(bg32, py * rw, (py + 1) * rw);
  }

  // 2. Rasterize Perspective-Correct Textured Sector Floors & Non-Sky Ceilings (5-Plane Frustum Clip + ZBuffer)
  const Z_NEAR = 0.15;
  const frustum: FrustumParams = {
    zNear: Z_NEAR,
    zFar: 160,
    tanHalfH: halfW / Math.max(1, focalLength),
    tanHalfV: (halfH + Math.abs(pitchScaled) + 20) / Math.max(1, focalLength),
  };
  const geomMap = buildSectorGeometryMap(linedefs);

  for (const sec of sectors) {
    const geom = geomMap.get(sec.id);
    if (!geom || geom.triangles.length === 0) continue;

    const flatName = String(sec.floorTexture || "FLOOR4_8");
    const flatInfo = getFlatDominantRgb(flatName, now);
    const flatTex = getCanvasPixels(getDoomFlatCanvas(flatName, now));
    const lightNorm = flatInfo.emissive ? 1.04 : Math.max(0.45, Math.min(1.08, (sec.lightLevel ?? 210) / 215));

    // Floor triangles (5-plane clipped)
    if (viewCam.z > sec.floorHeight - 0.02) {
      const dyFloor = sec.floorHeight - viewCam.z;
      for (const [p0, p1, p2] of geom.triangles) {
        const vVerts = [p0, p1, p2].map((pt) => {
          const dx = pt.x - viewCam.x;
          const dy = pt.y - viewCam.y;
          return {
            x: -dx * sinA + dy * cosA,
            y: dyFloor,
            z: dx * cosA + dy * sinA,
            u: pt.x,
            v: pt.y,
          };
        });
        const clipped = clipPolygonToFrustum(vVerts, frustum);
        if (clipped.length < 3) continue;

        const proj: ProjFlatVert[] = clipped.map((cv) => {
          const iz = 1 / cv.z;
          return {
            sx: halfW + cv.x * focalLength * iz,
            sy: horizonY - cv.y * focalLength * iz,
            iz,
            wxZ: cv.u * iz,
            wyZ: cv.v * iz,
          };
        });
        for (let i = 1; i + 1 < proj.length; i++) {
          rasterizeTexturedFlatTri(pixels, invZ, rw, rh, proj[0], proj[i], proj[i + 1], flatTex, lightNorm, Boolean(flatInfo.emissive));
        }
      }
    }

    // Non-sky indoor ceilings (5-plane clipped)
    const ceilTexName = String(sec.ceilTexture || "CEIL3_5");
    if (!ceilTexName.startsWith("SKY") && viewCam.z < sec.ceilHeight + 0.02) {
      const ceilTex = getCanvasPixels(getDoomFlatCanvas(ceilTexName, now));
      const ceilLight = Math.max(0.35, Math.min(0.95, (sec.lightLevel ?? 190) / 235));
      const dyCeil = sec.ceilHeight - viewCam.z;
      for (const [p0, p1, p2] of geom.triangles) {
        const vVerts = [p0, p1, p2].map((pt) => {
          const dx = pt.x - viewCam.x;
          const dy = pt.y - viewCam.y;
          return {
            x: -dx * sinA + dy * cosA,
            y: dyCeil,
            z: dx * cosA + dy * sinA,
            u: pt.x,
            v: pt.y,
          };
        });
        const clipped = clipPolygonToFrustum(vVerts, frustum);
        if (clipped.length < 3) continue;

        const proj: ProjFlatVert[] = clipped.map((cv) => {
          const iz = 1 / cv.z;
          return {
            sx: halfW + cv.x * focalLength * iz,
            sy: horizonY - cv.y * focalLength * iz,
            iz,
            wxZ: cv.u * iz,
            wyZ: cv.v * iz,
          };
        });
        for (let i = 1; i + 1 < proj.length; i++) {
          rasterizeTexturedFlatTri(pixels, invZ, rw, rh, proj[0], proj[i], proj[i + 1], ceilTex, ceilLight, false);
        }
      }
    }
  }

  // 3. Rasterize 1-Sided Solid Walls & 2-Sided Portal Lower/Upper Walls with True Per-Pixel 1/Z Occlusion & Frustum Segment Clipping
  const drawWallSpan = (
    x: number,
    yTopFlt: number,
    yBotFlt: number,
    worldZTop: number,
    worldZBot: number,
    tex: CachedPixelTex,
    texU: number,
    iz: number,
    shadeMult256: number,
    transparentGlass: boolean = false
  ) => {
    const y0 = Math.max(0, Math.floor(yTopFlt));
    const y1 = Math.min(rh - 1, Math.ceil(yBotFlt) - 1);
    if (y0 > y1) return;

    const spanScreenH = Math.max(0.5, yBotFlt - yTopFlt);
    const worldSpanH = Math.max(0.05, worldZTop - worldZBot);
    const colU = ((texU % tex.w) + tex.w) % tex.w;
    const tData = tex.data;
    const tw = tex.w;
    const th = tex.h;

    for (let py = y0; py <= y1; py++) {
      const idx = py * rw + x;
      if (iz <= invZ[idx]) continue;

      const vFrac = (py - yTopFlt) / spanScreenH;
      const texV = Math.floor(Math.abs(vFrac * worldSpanH * 64)) % th;
      const texel = tData[texV * tw + colU];

      if (transparentGlass) {
        const dst = pixels[idx];
        const sr = shadePackedAbgr(texel, shadeMult256);
        const r = (((sr & 0xff) + (dst & 0xff)) >> 1);
        const g = ((((sr >>> 8) & 0xff) + ((dst >>> 8) & 0xff)) >> 1);
        const b = ((((sr >>> 16) & 0xff) + ((dst >>> 16) & 0xff)) >> 1);
        pixels[idx] = packRgba32(r, g, b, 255);
      } else {
        invZ[idx] = iz;
        pixels[idx] = shadePackedAbgr(texel, shadeMult256);
      }
    }
  };

  for (const line of linedefs) {
    if (line.noDraw) continue;

    const lx = line.x2 - line.x1;
    const ly = line.y2 - line.y1;
    const len = Math.hypot(lx, ly);
    if (len < 1e-4) continue;

    const normalX = -ly;
    const normalY = lx;
    const facingDot = (viewCam.x - line.x1) * normalX + (viewCam.y - line.y1) * normalY;

    if (!line.isTwoSided && facingDot <= 0) continue;

    const isFrontSide = facingDot > 0;
    const lx1 = isFrontSide ? line.x1 : line.x2;
    const ly1 = isFrontSide ? line.y1 : line.y2;
    const lx2 = isFrontSide ? line.x2 : line.x1;
    const ly2 = isFrontSide ? line.y2 : line.y1;

    const nearSecId = isFrontSide ? (line.frontSectorId ?? 0) : (line.backSectorId ?? line.frontSectorId ?? 0);
    const farSecId = isFrontSide ? line.backSectorId : line.frontSectorId;
    const frontSec = sectorMap.get(nearSecId) || sectorMap.get(0)!;
    const backSec = farSecId !== undefined ? sectorMap.get(farSecId) : undefined;

    const ceilFront = frontSec.ceilHeight;
    const floorFront = frontSec.floorHeight;
    const ceilBack = backSec ? backSec.ceilHeight : ceilFront;
    const floorBack = backSec ? backSec.floorHeight : floorFront;
    const lightFront = frontSec.lightLevel ?? 215;

    const dx1 = lx1 - viewCam.x;
    const dy1 = ly1 - viewCam.y;
    const dx2 = lx2 - viewCam.x;
    const dy2 = ly2 - viewCam.y;

    const clippedSeg = clipSegmentToFrustum(
      { x: -dx1 * sinA + dy1 * cosA, z: dx1 * cosA + dy1 * sinA, u: 0 },
      { x: -dx2 * sinA + dy2 * cosA, z: dx2 * cosA + dy2 * sinA, u: len },
      Z_NEAR,
      frustum.tanHalfH
    );
    if (!clippedSeg) continue;

    const tx1 = clippedSeg.a.x;
    let tz1 = clippedSeg.a.z;
    let u1 = clippedSeg.a.u;
    const tx2 = clippedSeg.b.x;
    let tz2 = clippedSeg.b.z;
    let u2 = clippedSeg.b.u;

    let sx1 = halfW + (tx1 * focalLength) / tz1;
    let sx2 = halfW + (tx2 * focalLength) / tz2;

    if (sx1 > sx2) {
      let tmp = sx1; sx1 = sx2; sx2 = tmp;
      tmp = tz1; tz1 = tz2; tz2 = tmp;
      tmp = u1; u1 = u2; u2 = tmp;
    }

    if (sx2 <= 0 || sx1 >= rw) continue;

    const scale1 = focalLength / tz1;
    const scale2 = focalLength / tz2;

    const yTopF1 = horizonY - (ceilFront - viewCam.z) * scale1;
    const yTopF2 = horizonY - (ceilFront - viewCam.z) * scale2;
    const yBotF1 = horizonY - (floorFront - viewCam.z) * scale1;
    const yBotF2 = horizonY - (floorFront - viewCam.z) * scale2;

    const yTopB1 = horizonY - (ceilBack - viewCam.z) * scale1;
    const yTopB2 = horizonY - (ceilBack - viewCam.z) * scale2;
    const yBotB1 = horizonY - (floorBack - viewCam.z) * scale1;
    const yBotB2 = horizonY - (floorBack - viewCam.z) * scale2;

    const midTexName = typeof line.middleTexture === "string" && line.middleTexture ? line.middleTexture : "STARTAN3";
    const lowerTexName = typeof line.lowerTexture === "string" && line.lowerTexture ? line.lowerTexture : "STEP1";
    const upperTexName = typeof line.upperTexture === "string" && line.upperTexture ? line.upperTexture : "STARTAN3";

    const midPix = getCanvasPixels(getDoomTextureCanvas(midTexName, now));
    const lowPix = getCanvasPixels(getDoomTextureCanvas(lowerTexName, now));
    const upPix = getCanvasPixels(getDoomTextureCanvas(upperTexName, now));

    const startCol = Math.max(0, Math.floor(sx1));
    const endCol = Math.min(rw - 1, Math.ceil(sx2));
    const deltaX = sx2 - sx1 || 1;

    const invZ1 = 1 / Math.max(0.05, tz1);
    const invZ2 = 1 / Math.max(0.05, tz2);
    const uOverZ1 = u1 * invZ1;
    const uOverZ2 = u2 * invZ2;

    // Directional face sun contrast (helps corners & studs pop cleanly)
    const dirContrast = 0.86 + Math.abs(lx / len) * 0.14;
    const frontCeilSky = String(frontSec.ceilTexture || "").startsWith("SKY");
    const backCeilSky = backSec ? String(backSec.ceilTexture || "").startsWith("SKY") : false;
    const skipSkyUpper = frontCeilSky && backCeilSky;

    for (let x = startCol; x <= endCol; x++) {
      const t = Math.max(0, Math.min(1, (x - sx1) / deltaX));
      const iz = (1 - t) * invZ1 + t * invZ2;
      if (!Number.isFinite(iz) || iz <= 0) continue;
      const z = 1 / iz;

      const u = ((1 - t) * uOverZ1 + t * uOverZ2) * z;
      const texU = Math.floor(Math.abs((Number.isFinite(u) ? u : 0) * 64));
      const distLight = Math.max(0.35, Math.min(1.06, (lightFront / 225) * dirContrast * (1.02 - z * 0.025)));
      const shade256 = Math.round(distLight * 256);

      const yTopF = (1 - t) * yTopF1 + t * yTopF2;
      const yBotF = (1 - t) * yBotF1 + t * yBotF2;

      if (!line.isTwoSided) {
        if (yBotF > yTopF) {
          drawWallSpan(x, yTopF, yBotF, ceilFront, floorFront, midPix, texU, iz, shade256, false);
        }
      } else {
        const yTopB = (1 - t) * yTopB1 + t * yTopB2;
        const yBotB = (1 - t) * yBotB1 + t * yBotB2;

        if (!skipSkyUpper && ceilFront > ceilBack && yTopB > yTopF) {
          drawWallSpan(x, yTopF, yTopB, ceilFront, ceilBack, upPix, texU, iz, shade256, false);
        }
        if (floorBack > floorFront && yBotF > yBotB) {
          drawWallSpan(x, yBotB, yBotF, floorBack, floorFront, lowPix, texU, iz, shade256, false);
        }
        if (line.middleTexture && (line.middleTexture === "CYBER_GLASS" || line.middleTexture === "DOOR3")) {
          const midTop = Math.max(yTopF, yTopB);
          const midBot = Math.min(yBotF, yBotB);
          if (midBot > midTop) {
            drawWallSpan(
              x,
              midTop,
              midBot,
              Math.min(ceilFront, ceilBack),
              Math.max(floorFront, floorBack),
              midPix,
              texU,
              iz,
              shade256,
              line.middleTexture === "CYBER_GLASS"
            );
          }
        }
      }
    }
  }

  // 4. Rasterize 3D MD2 & MD3 Models, Player 3rd-Person Avatar, & Voxels into the SAME 1/Z Buffer
  const modelCam = {
    x: viewCam.x,
    y: viewCam.y,
    z: viewCam.z,
    cosA,
    sinA,
    focalLength,
    horizonY,
  };
  const overlays: ModelOverlayPoint[] = [];

  for (const placedModel of placedModels) {
    const modelData = BUILTIN_3D_MODELS.get(String(placedModel.modelId));
    if (!modelData) continue;
    render3DModelToBuffer(pixels, invZ, rw, rh, modelData, placedModel, modelCam, lights, overlays);
  }

  if (placedVoxels && placedVoxels.length > 0) {
    for (const placed of placedVoxels) {
      if (placed.collected) continue;
      const voxelModel = BUILTIN_VOXELS.get(String(placed.voxelId));
      if (!voxelModel) continue;
      renderVoxelToBuffer(pixels, invZ, rw, rh, voxelModel, placed, modelCam);
    }
  }

  if (cameraMode !== "fps") {
    const avatarId = options?.playerModelId || "blox_hero";
    const avatarModel = BUILTIN_3D_MODELS.get(avatarId) || BUILTIN_3D_MODELS.get("blox_hero");
    if (avatarModel) {
      const avatarPlaced: DivMode8PlacedModel = {
        id: "__player_avatar__",
        modelId: avatarId,
        x: baseCamX,
        y: baseCamY,
        z: playerFootZ,
        yaw: (baseCamAngle + 90) % 360,
        scale: 1.0,
        animation: weaponAttackTime > 0 ? "attack" : walkCycle > 0.05 ? "walk" : "idle",
        role: "ally",
      };
      render3DModelToBuffer(pixels, invZ, rw, rh, avatarModel, avatarPlaced, modelCam, lights);
    }
  }

  // Blit software rasterizer buffer onto main viewport canvas
  fb.ctx.putImageData(fb.imageData, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fb.canvas, 0, 0, rw, rh, 0, 0, screenWidth, screenHeight);
  ctx.restore();

  const scaleX = screenWidth / rw;
  const scaleY = screenHeight / rh;

  // 5. Render 2D Sprite Entities (Barrels, Pickups, Legacy Sprites) with accurate sector floor & Z-buffer check
  const sortedEntities = [...entities]
    .filter((ent) => ent.alive !== false)
    .sort((a, b) => {
      const da = Math.hypot(a.x / 64 - viewCam.x, a.y / 64 - viewCam.y);
      const db = Math.hypot(b.x / 64 - viewCam.x, b.y / 64 - viewCam.y);
      return db - da;
    });

  for (const ent of sortedEntities) {
    const wx = ent.x / 64;
    const wy = ent.y / 64;
    const edx = wx - viewCam.x;
    const edy = wy - viewCam.y;
    const etz = edx * cosA + edy * sinA;
    if (etz <= Z_NEAR) continue;

    const etx = -edx * sinA + edy * cosA;
    const bufX = rw * 0.5 + (etx * focalLength) / etz;
    const esx = bufX * scaleX;
    if (esx < -50 || esx > screenWidth + 50) continue;

    const entFloorZ = ent.z !== undefined ? ent.z : (findSectorFloorHeightAt(wx, wy, sectors, linedefs) ?? 0);
    const footBufY = horizonY - ((entFloorZ - viewCam.z) * focalLength) / etz;
    const headBufY = horizonY - ((entFloorZ + 0.65 - viewCam.z) * focalLength) / etz;
    const checkCol = Math.min(rw - 1, Math.max(0, Math.floor(bufX)));
    const checkRow = Math.min(rh - 1, Math.max(0, Math.floor((footBufY + headBufY) * 0.5)));
    if (1 / etz < invZ[checkRow * rw + checkCol] * 0.92) continue;

    const spriteH = Math.max(14, (footBufY - headBufY) * scaleY);
    const spriteW = spriteH;
    const spriteY = headBufY * scaleY;

    ctx.save();
    const entTypeStr = String(ent.type);
    if (entTypeStr === "monster" || entTypeStr === "imp" || entTypeStr === "demonio_imp") {
      const entNumId = typeof ent.id === "number" ? ent.id : parseInt(String(ent.id).replace(/\D/g, "") || "1", 10);
      const bob = Math.sin(now * 6 + entNumId) * 3;
      const bY = spriteY + bob;

      ctx.fillStyle = "#5c3d28";
      ctx.beginPath();
      ctx.ellipse(esx, bY + spriteH * 0.55, spriteW * 0.28, spriteH * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a2e1b";
      ctx.beginPath();
      ctx.ellipse(esx, bY + spriteH * 0.25, spriteW * 0.2, spriteH * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.fillRect(esx - spriteW * 0.1, bY + spriteH * 0.22, Math.max(2, spriteW * 0.06), Math.max(2, spriteH * 0.06));
      ctx.fillRect(esx + spriteW * 0.04, bY + spriteH * 0.22, Math.max(2, spriteW * 0.06), Math.max(2, spriteH * 0.06));
    } else if (ent.type === "barrel") {
      const barW = spriteW * 0.44;
      const barH = spriteH * 0.72;
      const bX = esx - barW / 2;
      const bY = spriteY + spriteH * 0.28;
      ctx.fillStyle = "#15803d";
      ctx.fillRect(bX, bY, barW, barH);
      ctx.fillStyle = "#166534";
      ctx.fillRect(bX, bY, barW, 4);
      ctx.fillRect(bX, bY + barH - 4, barW, 4);
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(esx, bY + barH * 0.5, barW * 0.24, 0, Math.PI * 2);
      ctx.fill();
    } else if (ent.type === "medikit") {
      const boxW = spriteW * 0.45;
      const boxH = spriteH * 0.35;
      const bX = esx - boxW / 2;
      const bY = spriteY + spriteH * 0.65;
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(bX, bY, boxW, boxH);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(esx - boxW * 0.1, bY + boxH * 0.18, boxW * 0.2, boxH * 0.64);
      ctx.fillRect(esx - boxW * 0.32, bY + boxH * 0.38, boxW * 0.64, boxH * 0.24);
    } else if (ent.type === "ammo") {
      const boxW = spriteW * 0.4;
      const boxH = spriteH * 0.32;
      const bX = esx - boxW / 2;
      const bY = spriteY + spriteH * 0.68;
      ctx.fillStyle = "#854d0e";
      ctx.fillRect(bX, bY, boxW, boxH);
      ctx.fillStyle = "#eab308";
      ctx.fillRect(bX + 2, bY + 2, boxW - 4, boxH * 0.4);
    } else if (ent.type === "key") {
      const keyW = spriteW * 0.3;
      const keyH = spriteH * 0.42;
      const bX = esx - keyW / 2;
      const bY = spriteY + spriteH * 0.58 + Math.sin(now * 4) * 4;
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(bX, bY, keyW, keyH);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(bX + 2, bY + 2, keyW - 4, keyH * 0.4);
    } else {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(esx - spriteW / 4, spriteY + spriteH / 4, spriteW / 2, spriteH / 2);
    }
    ctx.restore();
  }

  // 5B. Floating Enemy Health Bars & Goal/Checkpoint Tags
  ctx.save();
  for (const ov of overlays) {
    const ox = ov.sx * scaleX;
    const oy = ov.sy * scaleY;
    if (ov.role === "enemy" && ov.hp !== undefined && ov.maxHp && ov.maxHp > 0) {
      const barW = Math.max(28, Math.min(54, 160 / Math.max(1, ov.depth)));
      const barH = 5;
      const bx = ox - barW / 2;
      const by = oy - 10;
      const pct = Math.max(0, Math.min(1, ov.hp / ov.maxHp));
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      ctx.fillStyle = pct > 0.5 ? "#ef4444" : "#f97316";
      ctx.fillRect(bx, by, barW * pct, barH);
    } else if (ov.role === "goal") {
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fef08a";
      ctx.fillText("★ META", ox, oy - 6);
    } else if (ov.role === "checkpoint") {
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#67e8f9";
      ctx.fillText("CHECKPOINT", ox, oy - 6);
    }
  }
  ctx.restore();

  // 6. Render First-Person Weapon with Muzzle Flash (only in FPS mode)
  if (cameraMode === "fps") {
    const activeWeapon = weaponModel || "shotgun3d";
    renderFirstPersonWeapon3D(
      ctx,
      activeWeapon,
      weaponAttackTime,
      walkCycle,
      screenWidth,
      screenHeight
    );
  }

  // Muzzle flash screen overlay
  if (doomWorldState.muzzleFlashFrames > 0) {
    ctx.save();
    const grad = ctx.createRadialGradient(screenWidth * 0.5, screenHeight - 60, 20, screenWidth * 0.5, screenHeight - 60, screenWidth * 0.5);
    grad.addColorStop(0, "rgba(254, 240, 138, 0.45)");
    grad.addColorStop(0.5, "rgba(249, 115, 22, 0.2)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, screenWidth, screenHeight);
    ctx.restore();
  }

  // Damage / Hazard screen tints
  if (doomWorldState.screenDamageFlash > 0) {
    ctx.fillStyle = `rgba(220, 38, 38, ${doomWorldState.screenDamageFlash})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);
  }
  if (doomWorldState.screenHazardFlash > 0) {
    ctx.fillStyle = `rgba(34, 197, 94, ${doomWorldState.screenHazardFlash})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);
  }
  if (doomWorldState.screenTeleportFlash > 0) {
    ctx.fillStyle = `rgba(168, 85, 247, ${doomWorldState.screenTeleportFlash})`;
    ctx.fillRect(0, 0, screenWidth, screenHeight);
  }

  // 7. Render Doom HUD (Status Bar)
  if (options?.showHUD !== false) {
    renderDoomHUD(ctx, screenWidth, screenHeight, {
      health: doomWorldState.health,
      armor: doomWorldState.armor,
      ammo: doomWorldState.ammo,
      maxAmmo: doomWorldState.maxAmmo,
      keys: doomWorldState.keys,
    });
  }

  // 8. Render Doom Automap
  if (options?.showAutomap) {
    renderDoomAutomap(ctx, screenWidth, screenHeight, { x: baseCamX, y: baseCamY, angle: baseCamAngle }, linedefs, sectors);
  }
}

// =============================================================================
// AUTHENTIC CLASSIC DOOM HUD STATUS BAR
// =============================================================================

export function renderDoomHUD(
  ctx: CanvasRenderingContext2D,
  screenWidth: number,
  screenHeight: number,
  stats: {
    health: number;
    armor: number;
    ammo: number;
    maxAmmo: number;
    keys: { blue: boolean; red: boolean; yellow: boolean };
  }
) {
  const hudH = Math.max(38, Math.floor(screenHeight * 0.1));
  const hudY = screenHeight - hudH;

  ctx.save();
  // 1. Textured grey status bar bevel
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, hudY, screenWidth, hudH);
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, hudY, screenWidth, 3);
  ctx.fillStyle = "#475569";
  ctx.fillRect(0, hudY + 3, screenWidth, 2);

  // Section divisions
  const wAmmo = Math.floor(screenWidth * 0.2);
  const wHealth = Math.floor(screenWidth * 0.2);
  const wFace = Math.floor(screenWidth * 0.16);
  const wArmor = Math.floor(screenWidth * 0.2);
  const wKeys = screenWidth - (wAmmo + wHealth + wFace + wArmor);

  // AMMO Box
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(4, hudY + 6, wAmmo - 8, hudH - 10);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 9px monospace";
  ctx.fillText("MUNICIÓN", 10, hudY + 16);
  ctx.fillStyle = stats.ammo < 15 ? "#ef4444" : "#e2e8f0";
  ctx.font = "bold 18px monospace";
  ctx.fillText(`${stats.ammo}`, 10, hudY + hudH - 8);

  // HEALTH Box
  const xHealth = wAmmo;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(xHealth + 4, hudY + 6, wHealth - 8, hudH - 10);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 9px monospace";
  ctx.fillText("SALUD", xHealth + 10, hudY + 16);
  ctx.fillStyle = stats.health < 25 ? "#ef4444" : stats.health < 50 ? "#eab308" : "#22c55e";
  ctx.font = "bold 18px monospace";
  ctx.fillText(`${stats.health}%`, xHealth + 10, hudY + hudH - 8);

  // DOOMGUY FACE Box
  const xFace = xHealth + wHealth;
  const faceW = wFace - 8;
  const faceH = hudH - 10;
  ctx.fillStyle = "#1e1b4b";
  ctx.fillRect(xFace + 4, hudY + 6, faceW, faceH);

  // Procedural Doom Marine Face
  const cx = xFace + 4 + faceW / 2;
  const cy = hudY + 6 + faceH / 2;
  // Flesh skin
  ctx.fillStyle = stats.health < 25 ? "#b45309" : "#d97706";
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(faceW, faceH) * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Helmet / Hair
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.arc(cx, cy - 4, Math.min(faceW, faceH) * 0.35, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes (looking around)
  const eyeShift = Math.sin(performance.now() * 0.002) * 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - 7, cy - 3, 5, 4);
  ctx.fillRect(cx + 2, cy - 3, 5, 4);
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(cx - 6 + eyeShift, cy - 2, 3, 3);
  ctx.fillRect(cx + 3 + eyeShift, cy - 2, 3, 3);

  // Mouth & grimace/blood
  if (stats.health < 50) {
    ctx.fillStyle = "#dc2626"; // Blood splatter
    ctx.fillRect(cx - 4, cy + 3, 8, 3);
  } else {
    ctx.fillStyle = "#451a03";
    ctx.fillRect(cx - 4, cy + 5, 8, 2);
  }

  // ARMOR Box
  const xArmor = xFace + wFace;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(xArmor + 4, hudY + 6, wArmor - 8, hudH - 10);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 9px monospace";
  ctx.fillText("ARMADURA", xArmor + 10, hudY + 16);
  ctx.fillStyle = stats.armor > 0 ? "#38bdf8" : "#64748b";
  ctx.font = "bold 18px monospace";
  ctx.fillText(`${stats.armor}%`, xArmor + 10, hudY + hudH - 8);

  // KEYS Box
  const xKeys = xArmor + wArmor;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(xKeys + 4, hudY + 6, wKeys - 8, hudH - 10);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 9px monospace";
  ctx.fillText("LLAVES", xKeys + 8, hudY + 16);

  // Blue, Red, Yellow keycards
  ctx.fillStyle = stats.keys.blue ? "#3b82f6" : "#1e293b";
  ctx.fillRect(xKeys + 8, hudY + 22, 7, 10);
  ctx.fillStyle = stats.keys.red ? "#ef4444" : "#1e293b";
  ctx.fillRect(xKeys + 18, hudY + 22, 7, 10);
  ctx.fillStyle = stats.keys.yellow ? "#eab308" : "#1e293b";
  ctx.fillRect(xKeys + 28, hudY + 22, 7, 10);

  ctx.restore();
}

// =============================================================================
// AUTHENTIC VECTOR DOOM AUTOMAP (Radar Overlay)
// =============================================================================

export function renderDoomAutomap(
  ctx: CanvasRenderingContext2D,
  screenWidth: number,
  screenHeight: number,
  cam: { x: number; y: number; angle: number },
  linedefs: DivDoomLinedef[],
  sectors: DivDoomSector[]
) {
  const mapW = Math.min(220, Math.floor(screenWidth * 0.35));
  const mapH = mapW;
  const mapX = screenWidth - mapW - 12;
  const mapY = 12;

  ctx.save();
  // Frame
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  // Header
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 10px monospace";
  ctx.fillText("AUTOMAP UAC", mapX + 8, mapY + 14);

  // Clip to radar window
  ctx.beginPath();
  ctx.rect(mapX + 2, mapY + 18, mapW - 4, mapH - 20);
  ctx.clip();

  const centerX = mapX + mapW / 2;
  const centerY = mapY + (mapH + 18) / 2;
  const scale = 7.0; // scale factor pixels per world tile

  // Draw linedefs
  for (const line of linedefs) {
    const lx1 = centerX + (line.x1 - cam.x) * scale;
    const ly1 = centerY + (line.y1 - cam.y) * scale;
    const lx2 = centerX + (line.x2 - cam.x) * scale;
    const ly2 = centerY + (line.y2 - cam.y) * scale;

    ctx.beginPath();
    ctx.moveTo(lx1, ly1);
    ctx.lineTo(lx2, ly2);

    if (line.isTwoSided) {
      ctx.strokeStyle = "#eab308"; // Portals / Stairs
      ctx.lineWidth = 1.2;
    } else {
      ctx.strokeStyle = "#ef4444"; // Solid 1-sided walls
      ctx.lineWidth = 1.6;
    }
    ctx.stroke();
  }

  // Draw Player Arrow
  const dirRad = ((cam.angle || 0) * Math.PI) / 180;
  const pLen = 9;
  const ax = centerX + Math.cos(dirRad) * pLen;
  const ay = centerY + Math.sin(dirRad) * pLen;
  const leftX = centerX + Math.cos(dirRad + 2.5) * 6;
  const leftY = centerY + Math.sin(dirRad + 2.5) * 6;
  const rightX = centerX + Math.cos(dirRad - 2.5) * 6;
  const rightY = centerY + Math.sin(dirRad - 2.5) * 6;

  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(centerX, centerY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
