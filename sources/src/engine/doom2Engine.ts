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
} from "../types";
import {
  Camera3DPose,
  render3DModel,
  renderFirstPersonWeapon3D,
  BUILTIN_3D_MODELS,
  BUILTIN_VOXELS,
} from "./mode8Enhanced";
import { WadParser } from "./doom3d/WadParser";
import { DoomMapData, DoomThing } from "./doom3d/types";

// --- Authentic Doom 2 Textures & Flats Registry ---

export interface DoomTextureMeta {
  name: string;
  category: "walls" | "tech" | "gothic" | "doors_steps" | "sky";
  width: number;
  height: number;
  description: string;
  dominantColor: string;
}

export interface DoomFlatMeta {
  name: string;
  description: string;
  color: string;
  type: "floor" | "ceiling" | "liquid" | "step";
  damage?: number;
}

export const DOOM_WALL_TEXTURES: DoomTextureMeta[] = [
  { name: "STARTAN3", category: "walls", width: 128, height: 128, description: "Paneles de aleación titanio clásicos", dominantColor: "#9e8b6e" },
  { name: "BROWN144", category: "walls", width: 128, height: 128, description: "Ladrillos marrones y basalto reforzado", dominantColor: "#694d38" },
  { name: "TEKGREN2", category: "tech", width: 128, height: 128, description: "Consolas tecno-industriales verdes", dominantColor: "#2d5236" },
  { name: "COMP2", category: "tech", width: 128, height: 128, description: "Supercomputadora UAC con diales LED", dominantColor: "#223344" },
  { name: "BRICK1", category: "gothic", width: 128, height: 128, description: "Muralla de ladrillo rojo de fortaleza", dominantColor: "#853127" },
  { name: "MARBFAC", category: "gothic", width: 128, height: 128, description: "Mármol verde con rostro gárgola demoníaca", dominantColor: "#2b4c3b" },
  { name: "STONE2", category: "gothic", width: 128, height: 128, description: "Sillar de mazmorra medieval", dominantColor: "#52525b" },
  { name: "SHAWN2", category: "tech", width: 128, height: 128, description: "Plancha de aluminio blindada UAC", dominantColor: "#71717a" },
  { name: "DOOR3", category: "doors_steps", width: 128, height: 128, description: "Puerta blindada neumática con advertencia", dominantColor: "#a16207" },
  { name: "STEP1", category: "doors_steps", width: 128, height: 32, description: "Frontal contrahuella de escalera con remaches", dominantColor: "#475569" },
  { name: "STEP2", category: "doors_steps", width: 128, height: 16, description: "Contrahuella de peldaño bajo metálico", dominantColor: "#334155" },
  { name: "SLIME01", category: "walls", width: 128, height: 128, description: "Cascada de fango tóxico radiactivo", dominantColor: "#4d7c0f" },
  { name: "FIREWALL", category: "gothic", width: 128, height: 128, description: "Pared viva de carne y magma demoníaco", dominantColor: "#991b1b" },
  { name: "WOOD1", category: "gothic", width: 128, height: 128, description: "Vigas de roble oscuro de fortaleza", dominantColor: "#78350f" },
  { name: "METAL1", category: "tech", width: 128, height: 128, description: "Chapa de acero corrugado militar", dominantColor: "#475569" },
  { name: "CRATE1", category: "tech", width: 128, height: 128, description: "Caja de carga con logotipo UAC", dominantColor: "#854d0e" },
  { name: "EXIT1", category: "tech", width: 128, height: 128, description: "Letrero de salida de emergencia parpadeante", dominantColor: "#dc2626" },
  { name: "SWITCH1", category: "tech", width: 128, height: 128, description: "Interruptor de palanca desactivado (OFF)", dominantColor: "#ef4444" },
  { name: "SWITCH2", category: "tech", width: 128, height: 128, description: "Interruptor de palanca activado (ON)", dominantColor: "#22c55e" },
  { name: "SKY1", category: "sky", width: 256, height: 128, description: "Cielo montañoso alienígena de Phobos", dominantColor: "#253342" },
  { name: "SKY2", category: "sky", width: 256, height: 128, description: "Firmamento rojizo demoníaco de Deimos", dominantColor: "#6e1d1d" },
  { name: "SKY3", category: "sky", width: 256, height: 128, description: "Horizonte llameante del Averno / Infierno", dominantColor: "#7f1d1d" },
];

export const DOOM_FLATS: DoomFlatMeta[] = [
  { name: "FLOOR4_8", description: "Baldosas de hormigón desgastadas", color: "#6b6255", type: "floor" },
  { name: "CEIL3_5", description: "Placas acústicas de techo UAC", color: "#3f464e", type: "ceiling" },
  { name: "TLITE6_5", description: "Luminaria halógena de techo", color: "#e2e8f0", type: "ceiling" },
  { name: "STEP", description: "Huella antideslizante de escalera", color: "#334155", type: "step" },
  { name: "NUKAGE", description: "Residuo químico tóxico (-5 HP)", color: "#4ade80", type: "liquid", damage: 5 },
  { name: "LAVA", description: "Magma fundido hirviente (-20 HP)", color: "#f97316", type: "liquid", damage: 20 },
  { name: "BLOOD1", description: "Estanque de sangre infernal", color: "#881337", type: "liquid" },
  { name: "WATER", description: "Agua subterránea cristalina", color: "#0284c7", type: "liquid" },
  { name: "GRASS", description: "Tierra y vegetación de pantano", color: "#365314", type: "floor" },
  { name: "FLAT10", description: "Losas octogonales de basalto", color: "#27272a", type: "floor" },
  { name: "CRATOP2", description: "Tapa de madera de caja de suministros", color: "#78350f", type: "floor" },
  { name: "GATE1", description: "Grabados arcanos de portal teletransporte", color: "#a855f7", type: "floor" },
  { name: "RROCK01", description: "Roca volcánica del averno", color: "#7f1d1d", type: "floor" },
];

// Cache of generated texture canvases
const textureCanvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Procedural generation of authentic retro Doom 2 textures
 */
export function getDoomTextureCanvas(name: string, frameTime: number = 0): HTMLCanvasElement {
  // If animated texture (SLIME01, COMP2, SWITCH1/2), append frame cycle
  const isAnimated = name === "SLIME01" || name === "COMP2" || name === "FIREWALL";
  const animFrame = isAnimated ? Math.floor(frameTime * 4) % 4 : 0;
  const cacheKey = isAnimated ? `${name}_${animFrame}` : name;

  const cached = textureCanvasCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  const meta = DOOM_WALL_TEXTURES.find((t) => t.name === name);
  const width = meta ? meta.width : 128;
  const height = meta ? meta.height : 128;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Render specific texture visuals
  switch (name) {
    case "STARTAN3": {
      // Classic tan tech panels
      ctx.fillStyle = "#8c7a5e";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#a39072";
      ctx.fillRect(4, 4, width - 8, height / 2 - 6);
      ctx.fillRect(4, height / 2 + 2, width - 8, height / 2 - 6);
      ctx.fillStyle = "#4a3e2d";
      for (let x = 12; x < width; x += 28) {
        ctx.fillRect(x, 8, 3, 3);
        ctx.fillRect(x, height / 2 - 6, 3, 3);
        ctx.fillRect(x, height / 2 + 6, 3, 3);
        ctx.fillRect(x, height - 10, 3, 3);
      }
      ctx.strokeStyle = "#2e2417";
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, width - 4, height - 4);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      break;
    }
    case "BROWN144": {
      // Brown heavy brickwork
      ctx.fillStyle = "#4e3626";
      ctx.fillRect(0, 0, width, height);
      const rows = 8;
      const rowH = height / rows;
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * 24;
        for (let x = -24; x < width + 24; x += 48) {
          ctx.fillStyle = (r + x) % 3 === 0 ? "#674934" : "#5a3f2c";
          ctx.fillRect(x + offset + 2, r * rowH + 2, 44, rowH - 4);
          ctx.fillStyle = "#2d1c12";
          ctx.fillRect(x + offset + 2, r * rowH + rowH - 2, 44, 2);
        }
      }
      break;
    }
    case "TEKGREN2": {
      // Green tech wall with computer slots
      ctx.fillStyle = "#1e3a27";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#2a5237";
      ctx.fillRect(6, 6, width - 12, height - 12);
      ctx.fillStyle = "#0f1f14";
      for (let y = 16; y < height - 16; y += 8) {
        ctx.fillRect(16, y, width - 32, 4);
      }
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(20, height - 24, 6, 6);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(32, height - 24, 6, 6);
      ctx.fillStyle = "#eab308";
      ctx.fillRect(44, height - 24, 6, 6);
      break;
    }
    case "COMP2": {
      // Computer mainframe console (animated)
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, height);
      // Screen 1
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(12, 12, 48, 40);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(16, 20, (animFrame % 2 === 0 ? 36 : 28), 4);
      ctx.fillRect(16, 28, (animFrame >= 2 ? 34 : 20), 4);
      ctx.fillRect(16, 36, 40, 4);
      // Screen 2
      ctx.fillStyle = "#052e16";
      ctx.fillRect(68, 12, 48, 40);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(72, 24, 40, 3);
      ctx.fillRect(72, 32, (animFrame % 3 === 0 ? 38 : 24), 3);
      // Server card slots & blinking LEDs
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(12, 64, width - 24, 52);
      for (let x = 16; x < width - 20; x += 12) {
        const isBlinking = ((x / 12 + animFrame) % 3 === 0);
        ctx.fillStyle = isBlinking ? "#10b981" : "#f43f5e";
        ctx.fillRect(x, 72, 6, 3);
        ctx.fillStyle = "#334155";
        ctx.fillRect(x, 82, 8, 24);
      }
      break;
    }
    case "BRICK1": {
      // Red gothic castle brick
      ctx.fillStyle = "#5c1d15";
      ctx.fillRect(0, 0, width, height);
      const rows = 10;
      const rowH = height / rows;
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * 20;
        for (let x = -20; x < width + 20; x += 40) {
          ctx.fillStyle = (r + x) % 2 === 0 ? "#7f2b20" : "#993527";
          ctx.fillRect(x + offset + 2, r * rowH + 2, 36, rowH - 3);
        }
      }
      break;
    }
    case "MARBFAC": {
      // Marble gargoyle face
      ctx.fillStyle = "#1e382b";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#2e5944";
      ctx.fillRect(8, 8, width - 16, height - 16);
      ctx.fillStyle = "#112219";
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 10, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(width / 2 - 14, height / 2 - 14, 8, 6);
      ctx.fillRect(width / 2 + 6, height / 2 - 14, 8, 6);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(width / 2 - 8, height / 2 + 6, 4, 10);
      ctx.fillRect(width / 2 + 4, height / 2 + 6, 4, 10);
      break;
    }
    case "STONE2": {
      // Dungeon ashlar stone
      ctx.fillStyle = "#3f3f46";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#52525b";
      ctx.fillRect(4, 4, width / 2 - 6, height / 2 - 6);
      ctx.fillRect(width / 2 + 2, 4, width / 2 - 6, height / 2 - 6);
      ctx.fillRect(4, height / 2 + 2, width / 2 - 6, height / 2 - 6);
      ctx.fillRect(width / 2 + 2, height / 2 + 2, width / 2 - 6, height / 2 - 6);
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, width, height);
      break;
    }
    case "SHAWN2": {
      // Aluminum armor plate
      ctx.fillStyle = "#71717a";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#a1a1aa";
      ctx.fillRect(6, 6, width - 12, height - 12);
      ctx.fillStyle = "#3f3f46";
      for (let x = 12; x < width; x += 32) {
        for (let y = 12; y < height; y += 32) {
          ctx.fillRect(x, y, 4, 4);
        }
      }
      break;
    }
    case "DOOR3": {
      // Blast door with yellow/black hazard stripes
      ctx.fillStyle = "#475569";
      ctx.fillRect(0, 0, width, height);
      for (let x = 0; x < width; x += 16) {
        ctx.fillStyle = (x / 16) % 2 === 0 ? "#eab308" : "#0f172a";
        ctx.fillRect(x, 6, 16, 16);
      }
      ctx.fillStyle = "#64748b";
      ctx.fillRect(10, 28, width - 20, height - 34);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(width / 2 - 12, height / 2 - 12, 24, 24);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(width / 2 - 6, height / 2 - 6, 12, 12);
      break;
    }
    case "STEP1": {
      // Stair riser metal plate with rivets
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#475569";
      ctx.fillRect(2, 2, width - 4, height - 4);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, height - 3, width, 3);
      ctx.fillStyle = "#94a3b8";
      for (let x = 8; x < width; x += 18) {
        ctx.fillRect(x, height / 2 - 2, 4, 4);
      }
      break;
    }
    case "STEP2": {
      // Narrow stair step
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#475569";
      ctx.fillRect(2, 2, width - 4, height - 4);
      break;
    }
    case "SLIME01": {
      // Animated falling toxic sludge
      ctx.fillStyle = "#365314";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#65a30d";
      const yOffset = (animFrame * 16) % 32;
      for (let x = 0; x < width; x += 12) {
        const streamH = height * (0.6 + Math.sin((x + yOffset) * 0.4) * 0.35);
        ctx.fillRect(x, 0, 8, streamH);
      }
      ctx.fillStyle = "#84cc16";
      for (let i = 0; i < 6; i++) {
        ctx.fillRect((i * 22 + animFrame * 7) % width, (i * 20 + animFrame * 12) % height, 4, 4);
      }
      break;
    }
    case "FIREWALL": {
      // Demonic hell fire and flesh wall
      ctx.fillStyle = "#450a0a";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#dc2626";
      for (let y = 0; y < height; y += 16) {
        for (let x = 0; x < width; x += 16) {
          const r = 4 + Math.sin(x * 0.2 + y * 0.3 + animFrame) * 3;
          ctx.beginPath();
          ctx.arc(x + 8, y + 8, Math.max(1, r), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "WOOD1": {
      // Wood planking
      ctx.fillStyle = "#78350f";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#92400e";
      for (let y = 0; y < height; y += 32) {
        ctx.fillRect(0, y + 2, width, 28);
        ctx.fillStyle = "#451a03";
        ctx.fillRect(0, y + 30, width, 2);
      }
      break;
    }
    case "METAL1": {
      // Corrugated steel
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, width, height);
      for (let x = 0; x < width; x += 8) {
        ctx.fillStyle = (x / 8) % 2 === 0 ? "#64748b" : "#1e293b";
        ctx.fillRect(x, 0, 4, height);
      }
      break;
    }
    case "SWITCH1": {
      // Wall switch OFF
      ctx.fillStyle = "#475569";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(width / 2 - 20, height / 2 - 20, 40, 40);
      ctx.fillStyle = "#ef4444"; // Red LED
      ctx.fillRect(width / 2 - 12, height / 2 - 16, 24, 12);
      break;
    }
    case "SWITCH2": {
      // Wall switch ON
      ctx.fillStyle = "#475569";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(width / 2 - 20, height / 2 - 20, 40, 40);
      ctx.fillStyle = "#22c55e"; // Green LED
      ctx.fillRect(width / 2 - 12, height / 2 + 4, 24, 12);
      break;
    }
    case "SKY1": {
      // Phobos alien mountain sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "#1e293b");
      skyGrad.addColorStop(0.6, "#334155");
      skyGrad.addColorStop(1, "#475569");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 16) {
        const y = height - 20 - Math.sin(x * 0.05) * 25 - Math.cos(x * 0.12) * 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "SKY2": {
      // Deimos reddish blood sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "#450a0a");
      skyGrad.addColorStop(0.7, "#991b1b");
      skyGrad.addColorStop(1, "#7f1d1d");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#260505";
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 16) {
        const y = height - 28 - Math.sin(x * 0.08) * 30;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "SKY3": {
      // Hell burning fire sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "#7f1d1d");
      skyGrad.addColorStop(0.6, "#ea580c");
      skyGrad.addColorStop(1, "#f97316");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    default: {
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#475569";
      ctx.fillRect(4, 4, width - 8, height - 8);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(name.substring(0, 8), width / 2, height / 2 + 5);
      break;
    }
  }

  textureCanvasCache.set(cacheKey, canvas);
  return canvas;
}

const flatCanvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Procedural generation of authentic Doom flats (floors and ceilings)
 */
export function getDoomFlatCanvas(name: string, frameTime: number = 0): HTMLCanvasElement {
  const isAnimated = name === "NUKAGE" || name === "LAVA" || name === "BLOOD1" || name === "WATER";
  const animFrame = isAnimated ? Math.floor(frameTime * 4) % 4 : 0;
  const cacheKey = isAnimated ? `${name}_${animFrame}` : name;

  const cached = flatCanvasCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  switch (name) {
    case "NUKAGE": {
      // Radioactive bubbling slime
      ctx.fillStyle = "#15803d";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#4ade80";
      for (let i = 0; i < 8; i++) {
        const bx = (i * 19 + animFrame * 7) % 64;
        const by = (i * 13 + animFrame * 11) % 64;
        const br = 3 + Math.sin(animFrame + i) * 2;
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(1.5, br), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#86efac";
      for (let i = 0; i < 4; i++) {
        const bx = (i * 29 + animFrame * 5) % 64;
        const by = (i * 23 + animFrame * 9) % 64;
        ctx.fillRect(bx, by, 2, 2);
      }
      break;
    }
    case "LAVA": {
      // Flowing hell magma
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#ea580c";
      for (let y = 0; y < 64; y += 8) {
        for (let x = 0; x < 64; x += 8) {
          if ((x + y + animFrame * 4) % 16 === 0) {
            ctx.fillRect(x, y, 8, 8);
          }
        }
      }
      ctx.fillStyle = "#facc15";
      for (let i = 0; i < 6; i++) {
        const lx = (i * 17 + animFrame * 3) % 64;
        const ly = (i * 21 + animFrame * 5) % 64;
        ctx.fillRect(lx, ly, 4, 3);
      }
      break;
    }
    case "BLOOD1": {
      // Crimson sacrificial blood
      ctx.fillStyle = "#4c0519";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#881337";
      for (let i = 0; i < 6; i++) {
        ctx.fillRect((i * 15) % 64, (i * 23) % 64, 18, 12);
      }
      ctx.fillStyle = "#be123c";
      ctx.fillRect(16, 20, 10, 6);
      ctx.fillRect(40, 42, 8, 5);
      break;
    }
    case "WATER": {
      // Underground clear water
      ctx.fillStyle = "#0c4a6e";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#0284c7";
      for (let y = 0; y < 64; y += 16) {
        const shift = Math.sin((y + animFrame * 4) * 0.2) * 6;
        ctx.fillRect(0, y + shift, 64, 4);
      }
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(20, 24, 6, 2);
      ctx.fillRect(44, 48, 8, 2);
      break;
    }
    case "STEP": {
      // Diamond plate steel tread
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#475569";
      for (let y = 0; y < 64; y += 8) {
        for (let x = 0; x < 64; x += 8) {
          if ((x + y) % 16 === 0) {
            ctx.fillRect(x + 2, y + 2, 4, 2);
            ctx.fillRect(x + 3, y + 4, 2, 2);
          }
        }
      }
      break;
    }
    case "TLITE6_5": {
      // Ceiling light fixture
      ctx.fillStyle = "#475569";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(8, 8, 48, 48);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(14, 14, 36, 36);
      break;
    }
    case "CEIL3_5": {
      // Square acoustic ceiling tiles
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#475569";
      ctx.fillRect(2, 2, 28, 28);
      ctx.fillRect(34, 2, 28, 28);
      ctx.fillRect(2, 34, 28, 28);
      ctx.fillRect(34, 34, 28, 28);
      ctx.fillStyle = "#1e293b";
      ctx.strokeRect(0, 0, 64, 64);
      break;
    }
    default: {
      // FLOOR4_8 / Concrete pavers
      ctx.fillStyle = "#57534e";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#6b6255";
      ctx.fillRect(2, 2, 28, 28);
      ctx.fillRect(34, 2, 28, 28);
      ctx.fillRect(2, 34, 28, 28);
      ctx.fillRect(34, 34, 28, 28);
      ctx.fillStyle = "#292524";
      ctx.fillRect(0, 30, 64, 4);
      ctx.fillRect(30, 0, 4, 64);
      break;
    }
  }

  flatCanvasCache.set(cacheKey, canvas);
  return canvas;
}

// =============================================================================
// DOOM AUDIO SYNTHESIZER (Web Audio API)
// =============================================================================

class DoomAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public playShotgun() {
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
      this.playClick(240, 0.06);
    }, 450);
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
  baseCeilingHeight: number = 1.6,
  stairTexture: string = "STEP1",
  flatTexture: string = "STEP"
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
  const sectorBaseId = Math.floor(100 + Math.random() * 800);

  for (let i = 0; i < stepCount; i++) {
    const secId = sectorBaseId + i;
    currentFloor += stepHeightDelta;

    sectors.push({
      id: secId,
      floorHeight: Number(currentFloor.toFixed(2)),
      ceilHeight: baseCeilingHeight,
      floorTexture: flatTexture,
      ceilTexture: "CEIL3_5",
      lightLevel: 180 + i * 5,
    });

    const stepCenterStartX = startX + nx * (i * stepLength);
    const stepCenterStartY = startY + ny * (i * stepLength);
    const stepCenterEndX = startX + nx * ((i + 1) * stepLength);
    const stepCenterEndY = startY + ny * ((i + 1) * stepLength);

    const v1 = { x: stepCenterStartX - px * halfW, y: stepCenterStartY - py * halfW };
    const v2 = { x: stepCenterStartX + px * halfW, y: stepCenterStartY + py * halfW };
    const v3 = { x: stepCenterEndX + px * halfW, y: stepCenterEndY + py * halfW };
    const v4 = { x: stepCenterEndX - px * halfW, y: stepCenterEndY - py * halfW };

    const prevSecId = i === 0 ? 0 : sectorBaseId + i - 1;
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

    linedefs.push({
      id: `stair_${secId}_left`,
      x1: v1.x,
      y1: v1.y,
      x2: v4.x,
      y2: v4.y,
      frontSectorId: secId,
      isTwoSided: false,
      middleTexture: "BROWN144",
      blocking: true,
    });

    linedefs.push({
      id: `stair_${secId}_right`,
      x1: v2.x,
      y1: v2.y,
      x2: v3.x,
      y2: v3.y,
      frontSectorId: secId,
      isTwoSided: false,
      middleTexture: "BROWN144",
      blocking: true,
    });

    if (i === stepCount - 1) {
      linedefs.push({
        id: `stair_${secId}_back`,
        x1: v3.x,
        y1: v3.y,
        x2: v4.x,
        y2: v4.y,
        frontSectorId: secId,
        backSectorId: 1,
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
    // --- Sector 0: Starting Room Outer Walls ---
    { id: "e1_w0", x1: 1.0, y1: 1.0, x2: 6.0, y2: 1.0, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_w1", x1: 1.0, y1: 1.0, x2: 1.0, y2: 6.0, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_w2", x1: 1.0, y1: 6.0, x2: 6.0, y2: 6.0, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    // Armor Pedestal Portal (Sector 0 to Sector 1)
    { id: "e1_w3", x1: 1.5, y1: 2.0, x2: 1.5, y2: 5.0, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "e1_w4", x1: 1.5, y1: 2.0, x2: 1.0, y2: 2.0, frontSectorId: 1, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_w5", x1: 1.5, y1: 5.0, x2: 1.0, y2: 5.0, frontSectorId: 1, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },

    // Tech Pillars in Sector 0
    { id: "e1_pil1_1", x1: 3.0, y1: 2.5, x2: 3.6, y2: 2.5, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil1_2", x1: 3.6, y1: 2.5, x2: 3.6, y2: 3.1, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil1_3", x1: 3.6, y1: 3.1, x2: 3.0, y2: 3.1, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil1_4", x1: 3.0, y1: 3.1, x2: 3.0, y2: 2.5, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },

    { id: "e1_pil2_1", x1: 3.0, y1: 3.9, x2: 3.6, y2: 3.9, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil2_2", x1: 3.6, y1: 3.9, x2: 3.6, y2: 4.5, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil2_3", x1: 3.6, y1: 4.5, x2: 3.0, y2: 4.5, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "e1_pil2_4", x1: 3.0, y1: 4.5, x2: 3.0, y2: 3.9, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },

    // Main Door Portal (Sector 0 to Sector 2 to Sector 3)
    { id: "e1_door_f", x1: 6.0, y1: 3.0, x2: 6.0, y2: 4.0, frontSectorId: 0, backSectorId: 2, isTwoSided: true, upperTexture: "DOOR3", middleTexture: "DOOR3", blocking: false },
    { id: "e1_wall_rf1", x1: 6.0, y1: 1.0, x2: 6.0, y2: 3.0, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_wall_rf2", x1: 6.0, y1: 4.0, x2: 6.0, y2: 6.0, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },

    { id: "e1_door_b", x1: 6.8, y1: 3.0, x2: 6.8, y2: 4.0, frontSectorId: 2, backSectorId: 3, isTwoSided: true, upperTexture: "DOOR3", blocking: false },
    { id: "e1_door_side1", x1: 6.0, y1: 3.0, x2: 6.8, y2: 3.0, frontSectorId: 2, isTwoSided: false, middleTexture: "DOOR3", blocking: true },
    { id: "e1_door_side2", x1: 6.0, y1: 4.0, x2: 6.8, y2: 4.0, frontSectorId: 2, isTwoSided: false, middleTexture: "DOOR3", blocking: true },

    // --- Sector 3: Computer Terminal Room ---
    { id: "e1_c0", x1: 6.8, y1: 1.5, x2: 12.0, y2: 1.5, frontSectorId: 3, isTwoSided: false, middleTexture: "COMP2", blocking: true },
    { id: "e1_c1", x1: 6.8, y1: 1.5, x2: 6.8, y2: 3.0, frontSectorId: 3, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_c2", x1: 6.8, y1: 4.0, x2: 6.8, y2: 6.5, frontSectorId: 3, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_c3", x1: 6.8, y1: 6.5, x2: 12.0, y2: 6.5, frontSectorId: 3, isTwoSided: false, middleTexture: "BROWN144", blocking: true },

    // Balcony Stair Steps & Portal (Sector 3 to Sector 4)
    { id: "e1_balc1", x1: 10.0, y1: 2.0, x2: 10.0, y2: 6.0, frontSectorId: 3, backSectorId: 4, isTwoSided: true, lowerTexture: "STEP1", upperTexture: "STARTAN3", blocking: false },
    { id: "e1_balc_back", x1: 12.0, y1: 1.5, x2: 12.0, y2: 6.5, frontSectorId: 4, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },

    // Window opening onto Nukage Slime Courtyard (Sector 3 to Sector 5)
    { id: "e1_win1", x1: 8.5, y1: 6.5, x2: 11.0, y2: 6.5, frontSectorId: 3, backSectorId: 5, isTwoSided: true, upperTexture: "STARTAN3", lowerTexture: "STEP1", blocking: true },

    // --- Sector 5 & 6: Toxic Nukage Courtyard ---
    { id: "e1_nuk1", x1: 7.0, y1: 6.5, x2: 7.0, y2: 12.0, frontSectorId: 5, isTwoSided: false, middleTexture: "SLIME01", blocking: true },
    { id: "e1_nuk2", x1: 7.0, y1: 12.0, x2: 13.0, y2: 12.0, frontSectorId: 5, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "e1_nuk3", x1: 13.0, y1: 12.0, x2: 13.0, y2: 6.5, frontSectorId: 5, isTwoSided: false, middleTexture: "SLIME01", blocking: true },

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
  }
) {
  const now = performance.now() / 1000;
  doomWorldState.update(0.016, sectors);

  // Pre-index sectors by ID
  const sectorMap = new Map<number, DivDoomSector>();
  sectors.forEach((s) => sectorMap.set(s.id, s));

  if (!sectorMap.has(0)) {
    sectorMap.set(0, {
      id: 0,
      floorHeight: 0,
      ceilHeight: 1.4,
      floorTexture: "FLOOR4_8",
      ceilTexture: "CEIL3_5",
      lightLevel: 190,
    });
  }

  const halfW = screenWidth / 2;
  const halfH = screenHeight / 2;
  const horizonY = halfH + Math.max(-140, Math.min(140, cam.pitch || 0));

  // Doom 75-degree FOV
  const fovDeg = 75;
  const fovRad = (fovDeg * Math.PI) / 180;
  const focalLength = halfW / Math.tan(fovRad / 2);

  // Camera yaw trigonometry
  const camAngleRad = ((cam.angle || 0) * Math.PI) / 180;
  const cosA = Math.cos(camAngleRad);
  const sinA = Math.sin(camAngleRad);

  // 1. Draw Panoramic Skybox
  const skyName = options?.skyTexture || "SKY1";
  const skyTex = getDoomTextureCanvas(skyName);
  const skyWidth = skyTex.width || 256;
  const skyOffset = -((cam.angle % 360) / 360) * skyWidth * 2;
  const skyShift = ((skyOffset % skyWidth) + skyWidth) % skyWidth;
  const skyDrawH = Math.max(1, Math.floor(horizonY));
  for (let sx = -skyWidth + skyShift; sx < screenWidth; sx += skyWidth) {
    ctx.drawImage(skyTex, sx, 0, skyWidth, skyDrawH);
  }

  // 2. Perspective Floor Plane with Depth Shading & Liquid Animation
  const floorStart = Math.max(0, Math.floor(horizonY));
  const floorGrad = ctx.createLinearGradient(0, floorStart, 0, screenHeight);
  floorGrad.addColorStop(0, "#1c1917");
  floorGrad.addColorStop(0.25, "#18181b");
  floorGrad.addColorStop(1, "#09090b");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorStart, screenWidth, screenHeight - floorStart);

  // Perspective floor grid guidelines
  ctx.save();
  for (let y = floorStart + 2; y < screenHeight; y += Math.max(3, Math.floor((y - floorStart) * 0.16))) {
    const rowDist = (1.2 * focalLength) / Math.max(1, y - horizonY);
    const alpha = Math.max(0.04, Math.min(0.22, 0.25 - rowDist * 0.015));
    ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(screenWidth, y);
    ctx.stroke();
  }
  for (let angleOff = -60; angleOff <= 60; angleOff += 15) {
    const startX = halfW + Math.tan((angleOff * Math.PI) / 180) * focalLength;
    if (startX >= -100 && startX <= screenWidth + 100) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.07)";
      ctx.beginPath();
      ctx.moveTo(halfW, horizonY);
      ctx.lineTo(startX, screenHeight);
      ctx.stroke();
    }
  }
  ctx.restore();

  // 1D Depth Buffer for column occlusion
  const zBuffer = new Float32Array(screenWidth);
  zBuffer.fill(9999);

  // Sutherland-Hodgman Frustum Near Plane distance (prevents wall blowups)
  const Z_NEAR = 0.15;

  // Sort linedefs front-to-back for early depth-buffer rejection
  const sortedLinedefs = [...linedefs].sort((a, b) => {
    const distA = Math.hypot((a.x1 + a.x2) / 2 - cam.x, (a.y1 + a.y2) / 2 - cam.y);
    const distB = Math.hypot((b.x1 + b.x2) / 2 - cam.x, (b.y1 + b.y2) / 2 - cam.y);
    return distA - distB;
  });

  // Process all linedefs
  for (const line of sortedLinedefs) {
    if (line.noDraw) continue;

    // Backface culling and front/back orientation
    // Vector along line: (lx, ly) = (line.x2 - line.x1, line.y2 - line.y1)
    // Normal to the right in canvas coords (+Y down): (-ly, lx)
    const lx = line.x2 - line.x1;
    const ly = line.y2 - line.y1;
    const normalX = -ly;
    const normalY = lx;
    const facingDot = (cam.x - line.x1) * normalX + (cam.y - line.y1) * normalY;

    if (!line.isTwoSided) {
      // 1-sided solid wall: strictly visible only from the front side
      if (facingDot <= 0) continue;
    }

    const isFrontSide = facingDot > 0;
    // For 2-sided portals viewed from the back: orient endpoints so screen order is left-to-right
    const lx1 = isFrontSide ? line.x1 : line.x2;
    const ly1 = isFrontSide ? line.y1 : line.y2;
    const lx2 = isFrontSide ? line.x2 : line.x1;
    const ly2 = isFrontSide ? line.y2 : line.y1;

    const nearSecId = isFrontSide ? (line.frontSectorId ?? 0) : (line.backSectorId ?? line.frontSectorId ?? 0);
    const farSecId = isFrontSide ? line.backSectorId : line.frontSectorId;

    const frontSec = sectorMap.get(nearSecId) || sectorMap.get(0)!;
    const backSec = farSecId !== undefined ? sectorMap.get(farSecId) : undefined;

    const ceilFront = frontSec ? frontSec.ceilHeight : 1.4;
    const floorFront = frontSec ? frontSec.floorHeight : 0.0;
    const ceilBack = backSec ? backSec.ceilHeight : ceilFront;
    const floorBack = backSec ? backSec.floorHeight : floorFront;
    const lightFront = frontSec ? (frontSec.lightLevel ?? 200) : 200;

    const dx1 = lx1 - cam.x;
    const dy1 = ly1 - cam.y;
    const dx2 = lx2 - cam.x;
    const dy2 = ly2 - cam.y;

    // True perspective coordinate projection: +X view right, +Z forward depth
    let tx1 = -dx1 * sinA + dy1 * cosA;
    let tz1 = dx1 * cosA + dy1 * sinA;
    let tx2 = -dx2 * sinA + dy2 * cosA;
    let tz2 = dx2 * cosA + dy2 * sinA;

    if (tz1 <= Z_NEAR && tz2 <= Z_NEAR) continue;

    let u1 = 0;
    let u2 = Math.hypot(lx2 - lx1, ly2 - ly1);

    // Sutherland-Hodgman Frustum Near-Plane Clipping
    if (tz1 < Z_NEAR) {
      const t = (Z_NEAR - tz1) / (tz2 - tz1);
      tx1 = tx1 + t * (tx2 - tx1);
      tz1 = Z_NEAR;
      u1 = u1 + t * (u2 - u1);
    } else if (tz2 < Z_NEAR) {
      const t = (Z_NEAR - tz2) / (tz1 - tz2);
      tx2 = tx2 + t * (tx1 - tx2);
      tz2 = Z_NEAR;
      u2 = u2 + t * (u1 - u2);
    }

    let sx1 = halfW + (tx1 * focalLength) / tz1;
    let sx2 = halfW + (tx2 * focalLength) / tz2;

    // Swap endpoints if segment runs right-to-left on screen
    if (sx1 > sx2) {
      let tNum = sx1; sx1 = sx2; sx2 = tNum;
      tNum = tx1; tx1 = tx2; tx2 = tNum;
      tNum = tz1; tz1 = tz2; tz2 = tNum;
      tNum = u1; u1 = u2; u2 = tNum;
    }

    const scale1 = focalLength / tz1;
    const scale2 = focalLength / tz2;

    let yTopF1 = horizonY - (ceilFront - cam.z) * scale1;
    let yTopF2 = horizonY - (ceilFront - cam.z) * scale2;
    let yBotF1 = horizonY - (floorFront - cam.z) * scale1;
    let yBotF2 = horizonY - (floorFront - cam.z) * scale2;

    let yTopB1 = horizonY - (ceilBack - cam.z) * scale1;
    let yTopB2 = horizonY - (ceilBack - cam.z) * scale2;
    let yBotB1 = horizonY - (floorBack - cam.z) * scale1;
    let yBotB2 = horizonY - (floorBack - cam.z) * scale2;

    let tu1 = u1;
    let tu2 = u2;

    if (sx2 <= 0 || sx1 >= screenWidth) continue;

    const midTexName = typeof line.middleTexture === "string" ? line.middleTexture : "STARTAN3";
    const lowerTexName = typeof line.lowerTexture === "string" ? line.lowerTexture : "STEP1";
    const upperTexName = typeof line.upperTexture === "string" ? line.upperTexture : "STARTAN3";

    const midCanvas = getDoomTextureCanvas(midTexName, now);
    const lowerCanvas = getDoomTextureCanvas(lowerTexName, now);
    const upperCanvas = getDoomTextureCanvas(upperTexName, now);

    const startCol = Math.max(0, Math.floor(sx1));
    const endCol = Math.min(screenWidth - 1, Math.ceil(sx2));
    const deltaX = sx2 - sx1 || 1;

    const invZ1 = 1 / tz1;
    const invZ2 = 1 / tz2;
    const uOverZ1 = tu1 * invZ1;
    const uOverZ2 = tu2 * invZ2;

    for (let x = startCol; x <= endCol; x++) {
      const t = (x - sx1) / deltaX;
      const invZ = (1 - t) * invZ1 + t * invZ2;
      const z = 1 / invZ;

      if (z >= zBuffer[x]) continue;

      const yTopF = (1 - t) * yTopF1 + t * yTopF2;
      const yBotF = (1 - t) * yBotF1 + t * yBotF2;

      // Perspective-correct texture mapping
      const u = ((1 - t) * uOverZ1 + t * uOverZ2) * z;
      const texU = Math.floor(Math.abs(u * 64)) % midCanvas.width;

      // Atmospheric diminishing lighting formula
      const lightFactor = Math.max(0.18, Math.min(1.0, (lightFront / 255) * (1.0 - z * 0.045)));

      if (!line.isTwoSided) {
        // --- 1-SIDED SOLID WALL ---
        if (yBotF > yTopF) {
          ctx.drawImage(
            midCanvas,
            texU, 0, 1, midCanvas.height,
            x, yTopF, 1, Math.max(1, yBotF - yTopF)
          );
          if (lightFactor < 0.95) {
            ctx.fillStyle = `rgba(0,0,0,${1.0 - lightFactor})`;
            ctx.fillRect(x, yTopF, 1, Math.max(1, yBotF - yTopF));
          }
          zBuffer[x] = z;
        }
      } else {
        // --- 2-SIDED PORTAL ---
        const yTopB = (1 - t) * yTopB1 + t * yTopB2;
        const yBotB = (1 - t) * yBotB1 + t * yBotB2;

        // 1. Upper Wall (Archway / Lintel)
        if (ceilFront > ceilBack && yTopB > yTopF) {
          ctx.drawImage(
            upperCanvas,
            texU, 0, 1, upperCanvas.height,
            x, yTopF, 1, Math.max(1, yTopB - yTopF)
          );
          if (lightFactor < 0.95) {
            ctx.fillStyle = `rgba(0,0,0,${1.0 - lightFactor})`;
            ctx.fillRect(x, yTopF, 1, Math.max(1, yTopB - yTopF));
          }
        }

        // 2. Lower Wall (Stair Riser / Elevated Ledge)
        if (floorBack > floorFront && yBotF > yBotB) {
          ctx.drawImage(
            lowerCanvas,
            texU % lowerCanvas.width, 0, 1, lowerCanvas.height,
            x, yBotB, 1, Math.max(1, yBotF - yBotB)
          );
          if (lightFactor < 0.95) {
            ctx.fillStyle = `rgba(0,0,0,${1.0 - lightFactor})`;
            ctx.fillRect(x, yBotB, 1, Math.max(1, yBotF - yBotB));
          }
        }

        // 3. Middle transparent texture (grate or window if defined)
        if (line.middleTexture) {
          const midTop = Math.max(yTopF, yTopB);
          const midBot = Math.min(yBotF, yBotB);
          if (midBot > midTop) {
            ctx.drawImage(
              midCanvas,
              texU, 0, 1, midCanvas.height,
              x, midTop, 1, Math.max(1, midBot - midTop)
            );
          }
        }
      }
    }
  }

  // 3. Render 3D MD2 & MD3 Models with Z-Buffer Occlusion
  const camPose: Camera3DPose = {
    x: cam.x,
    y: cam.y,
    z: cam.z,
    angle: cam.angle || 0,
    pitch: cam.pitch || 0,
    fov: fovDeg,
    screenWidth,
    screenHeight,
  };

  for (const placedModel of placedModels) {
    const modelData = BUILTIN_3D_MODELS.get(String(placedModel.modelId));
    if (!modelData) continue;

    const mdx = placedModel.x - cam.x;
    const mdy = placedModel.y - cam.y;
    const mdist = Math.hypot(mdx, mdy);
    if (mdist < 0.2 || mdist > 40) continue;

    const mtx = -mdx * sinA + mdy * cosA;
    const mtz = mdx * cosA + mdy * sinA;
    if (mtz <= Z_NEAR) continue;

    const msx = Math.floor(halfW + (mtx * focalLength) / mtz);
    if (msx >= 0 && msx < screenWidth) {
      if (mtz > zBuffer[msx] + 0.08) continue; // Behind wall!
    }

    render3DModel(ctx, modelData, placedModel, camPose, zBuffer, 1, lights);
  }

  // 4. Render 3D Voxels with Z-Buffer Occlusion
  if (placedVoxels && placedVoxels.length > 0) {
    const sortedVoxels = [...placedVoxels].sort((a, b) => {
      const distA = Math.hypot(a.x - cam.x, a.y - cam.y);
      const distB = Math.hypot(b.x - cam.x, b.y - cam.y);
      return distB - distA;
    });

    for (const placed of sortedVoxels) {
      const voxelModel = BUILTIN_VOXELS.get(String(placed.voxelId)) || BUILTIN_VOXELS[placed.voxelId];
      if (!voxelModel) continue;

      const vdx = placed.x - cam.x;
      const vdy = placed.y - cam.y;
      const vdist = Math.hypot(vdx, vdy);
      if (vdist < 0.1 || vdist > 40) continue;

      const vtz = vdx * cosA + vdy * sinA;
      if (vtz <= Z_NEAR) continue;

      const yawRad = ((placed.yaw || 0) * Math.PI) / 180;
      const cosYaw = Math.cos(yawRad);
      const sinYaw = Math.sin(yawRad);
      const mScale = (placed.scale || 1.0) * (voxelModel.scale || 1.0);

      for (const pt of voxelModel.voxels) {
        const rx = (pt.x * cosYaw - pt.y * sinYaw) * mScale;
        const ry = (pt.x * sinYaw + pt.y * cosYaw) * mScale;
        const rz = pt.z * mScale;

        const wx = placed.x + rx;
        const wy = placed.y + ry;
        const wz = placed.z + rz;

        const pdx = wx - cam.x;
        const pdy = wy - cam.y;
        const ptx = -pdx * sinA + pdy * cosA;
        const ptz = pdx * cosA + pdy * sinA;

        if (ptz <= Z_NEAR) continue;

        const screenX = Math.floor(halfW + (ptx * focalLength) / ptz);
        if (screenX < 0 || screenX >= screenWidth) continue;

        if (ptz > zBuffer[screenX] + 0.05) continue;

        const screenY = Math.floor(horizonY - (wz - cam.z) * (focalLength / ptz));
        const cubeSize = Math.max(2, Math.floor((focalLength / ptz) * 0.045 * mScale));

        ctx.fillStyle = pt.color;
        ctx.fillRect(
          screenX - Math.floor(cubeSize / 2),
          screenY - Math.floor(cubeSize / 2),
          cubeSize,
          cubeSize
        );
      }
    }
  }

  // 5. Render Entities / Sprites (Imps, Demons, Pickups, Barrels)
  const sortedEntities = [...entities].sort((a, b) => {
    const da = Math.hypot(a.x / 64 - cam.x, a.y / 64 - cam.y);
    const db = Math.hypot(b.x / 64 - cam.x, b.y / 64 - cam.y);
    return db - da;
  });

  for (const ent of sortedEntities) {
    const edx = ent.x / 64 - cam.x;
    const edy = ent.y / 64 - cam.y;
    const etz = edx * cosA + edy * sinA;
    if (etz <= Z_NEAR) continue;

    const etx = -edx * sinA + edy * cosA;
    const esx = halfW + (etx * focalLength) / etz;
    if (esx < -50 || esx > screenWidth + 50) continue;

    const screenCol = Math.floor(esx);
    if (screenCol >= 0 && screenCol < screenWidth && etz > zBuffer[screenCol]) {
      continue;
    }

    const spriteScale = (focalLength / etz) * 0.8;
    const spriteW = Math.max(16, spriteScale);
    const spriteH = Math.max(16, spriteScale);
    const spriteY = horizonY - spriteH + (cam.z * focalLength) / etz;

    ctx.save();
    const entTypeStr = String(ent.type);
    if (entTypeStr === "monster" || entTypeStr === "imp" || entTypeStr === "demonio_imp") {
      // Authentic Doom Imp Sprite with Horns, Fiery Eyes & Claws
      const entNumId = typeof ent.id === "number" ? ent.id : parseInt(String(ent.id).replace(/\D/g, "") || "1", 10);
      const bob = Math.sin(now * 6 + entNumId) * 3;
      const bY = spriteY + bob;

      // Imp hunched muscular body
      ctx.fillStyle = "#5c3d28";
      ctx.beginPath();
      ctx.ellipse(esx, bY + spriteH * 0.55, spriteW * 0.28, spriteH * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      // Imp Head
      ctx.fillStyle = "#4a2e1b";
      ctx.beginPath();
      ctx.ellipse(esx, bY + spriteH * 0.25, spriteW * 0.2, spriteH * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Horns
      ctx.fillStyle = "#29180c";
      ctx.beginPath();
      ctx.moveTo(esx - spriteW * 0.15, bY + spriteH * 0.2);
      ctx.lineTo(esx - spriteW * 0.25, bY + spriteH * 0.05);
      ctx.lineTo(esx - spriteW * 0.08, bY + spriteH * 0.15);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(esx + spriteW * 0.15, bY + spriteH * 0.2);
      ctx.lineTo(esx + spriteW * 0.25, bY + spriteH * 0.05);
      ctx.lineTo(esx + spriteW * 0.08, bY + spriteH * 0.15);
      ctx.fill();

      // Fiery glowing red/yellow eyes
      ctx.fillStyle = "#facc15";
      ctx.fillRect(esx - spriteW * 0.1, bY + spriteH * 0.22, Math.max(2, spriteW * 0.06), Math.max(2, spriteH * 0.06));
      ctx.fillRect(esx + spriteW * 0.04, bY + spriteH * 0.22, Math.max(2, spriteW * 0.06), Math.max(2, spriteH * 0.06));
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(esx - spriteW * 0.08, bY + spriteH * 0.23, Math.max(1, spriteW * 0.03), Math.max(1, spriteH * 0.04));
      ctx.fillRect(esx + spriteW * 0.06, bY + spriteH * 0.23, Math.max(1, spriteW * 0.03), Math.max(1, spriteH * 0.04));

      // Claws & arms
      ctx.fillStyle = "#3d2415";
      ctx.fillRect(esx - spriteW * 0.35, bY + spriteH * 0.45, spriteW * 0.12, spriteH * 0.3);
      ctx.fillRect(esx + spriteW * 0.23, bY + spriteH * 0.45, spriteW * 0.12, spriteH * 0.3);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(esx - spriteW * 0.38, bY + spriteH * 0.72, spriteW * 0.14, 3);
      ctx.fillRect(esx + spriteW * 0.24, bY + spriteH * 0.72, spriteW * 0.14, 3);
    } else if (ent.type === "barrel") {
      // Authentic Doom Green Radioactive Hazard Barrel
      const barW = spriteW * 0.42;
      const barH = spriteH * 0.75;
      const bX = esx - barW / 2;
      const bY = spriteY + spriteH * 0.25;

      ctx.fillStyle = "#15803d";
      ctx.fillRect(bX, bY, barW, barH);
      ctx.fillStyle = "#166534";
      ctx.fillRect(bX, bY, barW, 4);
      ctx.fillRect(bX, bY + barH - 4, barW, 4);
      ctx.fillRect(bX, bY + barH * 0.5 - 2, barW, 4);

      // Yellow hazard trefoil symbol
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(esx, bY + barH * 0.5, barW * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(esx, bY + barH * 0.5, barW * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (ent.type === "medikit") {
      // Classic Doom Medikit box with Red Cross
      const boxW = spriteW * 0.45;
      const boxH = spriteH * 0.35;
      const bX = esx - boxW / 2;
      const bY = spriteY + spriteH * 0.65;

      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(bX, bY, boxW, boxH);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.strokeRect(bX, bY, boxW, boxH);

      // Red Cross
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(esx - boxW * 0.1, bY + boxH * 0.18, boxW * 0.2, boxH * 0.64);
      ctx.fillRect(esx - boxW * 0.32, bY + boxH * 0.38, boxW * 0.64, boxH * 0.24);
    } else if (ent.type === "ammo") {
      // Classic Golden Brass Shotgun Shells Box
      const boxW = spriteW * 0.4;
      const boxH = spriteH * 0.32;
      const bX = esx - boxW / 2;
      const bY = spriteY + spriteH * 0.68;

      ctx.fillStyle = "#854d0e";
      ctx.fillRect(bX, bY, boxW, boxH);
      ctx.fillStyle = "#eab308";
      ctx.fillRect(bX + 2, bY + 2, boxW - 4, boxH * 0.4);
      ctx.fillStyle = "#ca8a04";
      ctx.font = "bold 8px monospace";
      ctx.fillText("SHELLS", bX + 3, bY + boxH - 3);
    } else if (ent.type === "key") {
      // Glowing Security Keycard
      const keyW = spriteW * 0.3;
      const keyH = spriteH * 0.42;
      const bX = esx - keyW / 2;
      const bY = spriteY + spriteH * 0.58 + Math.sin(now * 4) * 4;

      ctx.fillStyle = "#0284c7";
      ctx.fillRect(bX, bY, keyW, keyH);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(bX + 2, bY + 2, keyW - 4, keyH * 0.4);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(bX + 3, bY + keyH * 0.6, keyW - 6, 3);
    } else {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(esx - spriteW / 4, spriteY + spriteH / 4, spriteW / 2, spriteH / 2);
    }
    ctx.restore();
  }

  // 6. Render First-Person Weapon with Muzzle Flash
  const activeWeapon = weaponModel || "shotgun3d";
  renderFirstPersonWeapon3D(
    ctx,
    activeWeapon,
    weaponAttackTime,
    walkCycle,
    screenWidth,
    screenHeight
  );

  // Muzzle flash screen overlay
  if (doomWorldState.muzzleFlashFrames > 0) {
    ctx.save();
    const grad = ctx.createRadialGradient(halfW, screenHeight - 60, 20, halfW, screenHeight - 60, halfW);
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
    renderDoomAutomap(ctx, screenWidth, screenHeight, cam, linedefs, sectors);
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
