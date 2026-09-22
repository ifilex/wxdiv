/**
 * DOOM 2 Polygon Sector & Portal 3D Engine for DIV Games Studio
 * 
 * Features:
 * - Free-form polygonal sector and linedef architecture (Doom 2 format)
 * - True Sutherland-Hodgman near-plane frustum clipping at Z_near = 0.15
 *   (Completely eliminates wall deformation, fisheye, and near-wall glitches)
 * - Multi-level 2-sided portals: lower walls (stair risers, ledges, pits) and upper walls (lintels, archways)
 * - Automatic staircase generation with sector step heights and lower wall step textures
 * - Authentic Doom 2 textures (STARTAN3, BROWN144, TEKGREN2, COMP2, BRICK1, MARBFAC, STEP1, etc.)
 * - Flats with light levels (FLOOR4_8, CEIL3_5, TLITE6_5, NUKAGE, LAVA, BLOOD1, STEP)
 * - Full integration with MD2/MD3 3D models and sprite entities
 */

import {
  DivDoomLinedef,
  DivDoomSector,
  DivMode8Entity,
  DivMode8PlacedModel,
  DivMode8Light,
  DivMode8PlacedVoxel,
} from "../types";
import {
  Camera3DPose,
  render3DModel,
  renderFirstPersonWeapon3D,
  BUILTIN_3D_MODELS,
  BUILTIN_VOXELS,
} from "./mode8Enhanced";

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
  { name: "SKY1", category: "sky", width: 256, height: 128, description: "Cielo montañoso alienígena de Phobos", dominantColor: "#253342" },
  { name: "SKY2", category: "sky", width: 256, height: 128, description: "Firmamento rojizo demoníaco de Deimos", dominantColor: "#6e1d1d" },
];

export const DOOM_FLATS: DoomFlatMeta[] = [
  { name: "FLOOR4_8", description: "Baldosas de hormigón desgastadas", color: "#6b6255", type: "floor" },
  { name: "CEIL3_5", description: "Placas acústicas de techo UAC", color: "#3f464e", type: "ceiling" },
  { name: "TLITE6_5", description: "Luminaria halógena de techo", color: "#e2e8f0", type: "ceiling" },
  { name: "STEP", description: "Huella antideslizante de escalera", color: "#334155", type: "step" },
  { name: "NUKAGE", description: "Residuo químico tóxico (-5 HP)", color: "#4ade80", type: "liquid", damage: 5 },
  { name: "LAVA", description: "Magma fundido hirviente (-20 HP)", color: "#f97316", type: "liquid", damage: 20 },
  { name: "BLOOD1", description: "Estanque de sangre infernal", color: "#881337", type: "liquid" },
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
export function getDoomTextureCanvas(name: string): HTMLCanvasElement {
  const cached = textureCanvasCache.get(name);
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
      // Panels and seams
      ctx.fillStyle = "#a39072";
      ctx.fillRect(4, 4, width - 8, height / 2 - 6);
      ctx.fillRect(4, height / 2 + 2, width - 8, height / 2 - 6);
      // Rivets
      ctx.fillStyle = "#4a3e2d";
      for (let x = 12; x < width; x += 28) {
        ctx.fillRect(x, 8, 3, 3);
        ctx.fillRect(x, height / 2 - 6, 3, 3);
        ctx.fillRect(x, height / 2 + 6, 3, 3);
        ctx.fillRect(x, height - 10, 3, 3);
      }
      // Divider line
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
      // Cables and vent grills
      ctx.fillStyle = "#0f1f14";
      for (let y = 16; y < height - 16; y += 8) {
        ctx.fillRect(16, y, width - 32, 4);
      }
      // Status LEDs
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(20, height - 24, 6, 6);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(32, height - 24, 6, 6);
      ctx.fillStyle = "#eab308";
      ctx.fillRect(44, height - 24, 6, 6);
      break;
    }
    case "COMP2": {
      // Computer mainframe console
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, height);
      // Screen 1
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(12, 12, 48, 40);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(16, 20, 36, 4);
      ctx.fillRect(16, 28, 28, 4);
      ctx.fillRect(16, 36, 40, 4);
      // Screen 2
      ctx.fillStyle = "#052e16";
      ctx.fillRect(68, 12, 48, 40);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(72, 24, 40, 3);
      ctx.fillRect(72, 32, 30, 3);
      // Server card slots & dials
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(12, 64, width - 24, 52);
      for (let x = 16; x < width - 20; x += 12) {
        ctx.fillStyle = x % 24 === 0 ? "#10b981" : "#f43f5e";
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
      // Horns and demonic visage
      ctx.fillStyle = "#112219";
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 10, 24, 0, Math.PI * 2);
      ctx.fill();
      // Glowing red eyes
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(width / 2 - 14, height / 2 - 14, 8, 6);
      ctx.fillRect(width / 2 + 6, height / 2 - 14, 8, 6);
      // Fangs
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
      // Blast door with yellow/black caution stripes
      ctx.fillStyle = "#475569";
      ctx.fillRect(0, 0, width, height);
      // Hazard top
      for (let x = 0; x < width; x += 16) {
        ctx.fillStyle = (x / 16) % 2 === 0 ? "#eab308" : "#0f172a";
        ctx.fillRect(x, 6, 16, 16);
      }
      // Door panel
      ctx.fillStyle = "#64748b";
      ctx.fillRect(10, 28, width - 20, height - 34);
      // Hydraulic lock center
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
      // Rivets
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
      // Radioactive slime wall
      ctx.fillStyle = "#365314";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#65a30d";
      for (let x = 0; x < width; x += 12) {
        const streamH = height * (0.6 + Math.sin(x * 0.4) * 0.35);
        ctx.fillRect(x, 0, 8, streamH);
      }
      break;
    }
    case "SKY1": {
      // Mountainous Phobos sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "#1e293b");
      skyGrad.addColorStop(0.6, "#334155");
      skyGrad.addColorStop(1, "#475569");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);
      // Distant mountains
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
    default: {
      // Default fallback tech texture
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#475569";
      ctx.fillRect(4, 4, width - 8, height - 8);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(name.substring(0, 8), width / 2, height / 2 + 5);
      break;
    }
  }

  textureCanvasCache.set(name, canvas);
  return canvas;
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
  stepHeightDelta: number, // e.g. +0.25 per step
  baseCeilingHeight: number = 1.6,
  stairTexture: string = "STEP1",
  flatTexture: string = "STEP"
): {
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
} {
  const sectors: DivDoomSector[] = [];
  const linedefs: DivDoomLinedef[] = [];

  // Normalize direction vector
  const len = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / len;
  const ny = dirY / len;
  // Perpendicular for step width
  const px = -ny;
  const py = nx;

  const halfW = stepWidth / 2;
  let currentFloor = baseFloorHeight;

  // Base sector ID offset based on current timestamp
  const sectorBaseId = Math.floor(100 + Math.random() * 800);

  for (let i = 0; i < stepCount; i++) {
    const secId = sectorBaseId + i;
    currentFloor += stepHeightDelta;

    // Create sector for this step
    sectors.push({
      id: secId,
      floorHeight: Number(currentFloor.toFixed(2)),
      ceilHeight: baseCeilingHeight,
      floorTexture: flatTexture,
      ceilTexture: "CEIL3_5",
      lightLevel: 180 + i * 5,
    });

    // Step quad corner coordinates
    const stepCenterStartX = startX + nx * (i * stepLength);
    const stepCenterStartY = startY + ny * (i * stepLength);
    const stepCenterEndX = startX + nx * ((i + 1) * stepLength);
    const stepCenterEndY = startY + ny * ((i + 1) * stepLength);

    const v1 = { x: stepCenterStartX - px * halfW, y: stepCenterStartY - py * halfW };
    const v2 = { x: stepCenterStartX + px * halfW, y: stepCenterStartY + py * halfW };
    const v3 = { x: stepCenterEndX + px * halfW, y: stepCenterEndY + py * halfW };
    const v4 = { x: stepCenterEndX - px * halfW, y: stepCenterEndY - py * halfW };

    // Front riser line (connecting to previous sector/step)
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
      lowerTexture: stairTexture, // Stair riser texture
      blocking: false,
    });

    // Side left wall
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

    // Side right wall
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

    // Back line (if last step, connects to upper platform or solid wall)
    if (i === stepCount - 1) {
      linedefs.push({
        id: `stair_${secId}_back`,
        x1: v3.x,
        y1: v3.y,
        x2: v4.x,
        y2: v4.y,
        frontSectorId: secId,
        backSectorId: 1, // Upper sector
        isTwoSided: true,
        lowerTexture: stairTexture,
        blocking: false,
      });
    }
  }

  return { sectors, linedefs };
}

/**
 * Renders a full Doom 2 Polygon Sector & Portal 3D World
 * 
 * Guarantees:
 * 1. Walls never deform or blow up when approaching (frustum clipped at Z = 0.15)
 * 2. 2-Sided Portals render crisp stair risers, elevated platforms, and ceiling archways
 * 3. Supports full MD2 and MD3 3D models with depth buffer occlusion
 */
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
  placedVoxels: DivMode8PlacedVoxel[] = []
) {
  // Pre-index sectors by ID
  const sectorMap = new Map<number, DivDoomSector>();
  sectors.forEach((s) => sectorMap.set(s.id, s));

  // Default sector 0 if not present
  if (!sectorMap.has(0)) {
    sectorMap.set(0, {
      id: 0,
      floorHeight: 0,
      ceilHeight: 1.2,
      floorTexture: "FLOOR4_8",
      ceilTexture: "CEIL3_5",
      lightLevel: 180,
    });
  }

  const halfW = screenWidth / 2;
  const halfH = screenHeight / 2;
  const horizonY = halfH + Math.max(-140, Math.min(140, cam.pitch || 0));

  // Field of View parameters (Doom 75-degree FOV)
  const fovDeg = 75;
  const fovRad = (fovDeg * Math.PI) / 180;
  const focalLength = halfW / Math.tan(fovRad / 2);

  // Camera yaw trigonometry
  const camAngleRad = ((cam.angle || 0) * Math.PI) / 180;
  const cosA = Math.cos(camAngleRad);
  const sinA = Math.sin(camAngleRad);

  // 1. Draw Sky Background with panoramic angle offset
  const skyTex = getDoomTextureCanvas("SKY1");
  const skyOffset = -((cam.angle % 360) / 360) * skyTex.width * 2;
  ctx.drawImage(skyTex, skyOffset % skyTex.width, 0, screenWidth, horizonY);
  ctx.drawImage(skyTex, (skyOffset % skyTex.width) + skyTex.width, 0, screenWidth, horizonY);

  // Enhanced Perspective Floor Plane with Depth Shading & Voxel Grid
  const floorStart = Math.max(0, Math.floor(horizonY));
  const floorGrad = ctx.createLinearGradient(0, floorStart, 0, screenHeight);
  floorGrad.addColorStop(0, "#1c1917");
  floorGrad.addColorStop(0.25, "#18181b");
  floorGrad.addColorStop(1, "#09090b");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorStart, screenWidth, screenHeight - floorStart);

  // Perspective floor depth bands & voxel grid lines for spatial grounding
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

  // 1D Depth Buffer for column occlusion and 3D model / sprite depth testing
  const zBuffer = new Float32Array(screenWidth);
  zBuffer.fill(9999);

  // Frustum Near Plane distance to prevent division by zero or negative projection
  const Z_NEAR = 0.15;

  // Process all linedefs
  for (const line of linedefs) {
    // Relative coordinates to camera
    const dx1 = line.x1 - cam.x;
    const dy1 = line.y1 - cam.y;
    const dx2 = line.x2 - cam.x;
    const dy2 = line.y2 - cam.y;

    // Transform vertices to Camera Space:
    // tx = Screen X direction, tz = Forward Depth direction
    let tx1 = dx1 * sinA - dy1 * cosA;
    let tz1 = dx1 * cosA + dy1 * sinA;
    let tx2 = dx2 * sinA - dy2 * cosA;
    let tz2 = dx2 * cosA + dy2 * sinA;

    // Both vertices behind near plane -> line is fully behind camera: SKIP
    if (tz1 <= Z_NEAR && tz2 <= Z_NEAR) continue;

    let u1 = 0;
    let u2 = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);

    // Sutherland-Hodgman Frustum Near-Plane Clipping (Stops wall deformation!)
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

    // Perspective Projection to Screen X
    const sx1 = halfW + (tx1 * focalLength) / tz1;
    const sx2 = halfW + (tx2 * focalLength) / tz2;

    // Back-face Culling: in camera space, front-facing lines go left-to-right (sx1 < sx2)
    if (sx1 >= sx2) {
      // If 1-sided, backface cull
      if (!line.isTwoSided) continue;
    }

    // Outside horizontal screen bounds: SKIP
    if (sx2 <= 0 || sx1 >= screenWidth) continue;

    // Fetch Front and Back Sector properties
    const frontSec = sectorMap.get(line.frontSectorId) || sectorMap.get(0)!;
    const backSec = line.isTwoSided ? (sectorMap.get(line.backSectorId ?? 0) || sectorMap.get(0)!) : null;

    const floorFront = frontSec.floorHeight;
    const ceilFront = frontSec.ceilHeight;
    const lightFront = frontSec.lightLevel ?? 180;

    const floorBack = backSec ? backSec.floorHeight : floorFront;
    const ceilBack = backSec ? backSec.ceilHeight : ceilFront;

    // Project Vertical Y at endpoints
    const scale1 = focalLength / tz1;
    const scale2 = focalLength / tz2;

    const yTopF1 = horizonY - (ceilFront - cam.z) * scale1;
    const yTopF2 = horizonY - (ceilFront - cam.z) * scale2;
    const yBotF1 = horizonY - (floorFront - cam.z) * scale1;
    const yBotF2 = horizonY - (floorFront - cam.z) * scale2;

    const yTopB1 = horizonY - (ceilBack - cam.z) * scale1;
    const yTopB2 = horizonY - (ceilBack - cam.z) * scale2;
    const yBotB1 = horizonY - (floorBack - cam.z) * scale1;
    const yBotB2 = horizonY - (floorBack - cam.z) * scale2;

    // Texture image canvas
    const midTexName = typeof line.middleTexture === "string" ? line.middleTexture : "STARTAN3";
    const lowerTexName = typeof line.lowerTexture === "string" ? line.lowerTexture : "STEP1";
    const upperTexName = typeof line.upperTexture === "string" ? line.upperTexture : "STARTAN3";

    const midCanvas = getDoomTextureCanvas(midTexName);
    const lowerCanvas = getDoomTextureCanvas(lowerTexName);
    const upperCanvas = getDoomTextureCanvas(upperTexName);

    const startCol = Math.max(0, Math.floor(sx1));
    const endCol = Math.min(screenWidth - 1, Math.ceil(sx2));
    const deltaX = sx2 - sx1 || 1;

    // Rasterize vertical wall columns across screen
    for (let x = startCol; x <= endCol; x++) {
      const t = (x - sx1) / deltaX;
      // Perspective-correct depth interpolation (1/z)
      const invZ = (1 - t) / tz1 + t / tz2;
      const z = 1 / invZ;

      // Already occluded by a closer wall: SKIP
      if (z >= zBuffer[x]) continue;

      // Column heights
      const yTopF = (1 - t) * yTopF1 + t * yTopF2;
      const yBotF = (1 - t) * yBotF1 + t * yBotF2;

      // Texture horizontal coordinate
      const u = (1 - t) * u1 + t * u2;
      const texU = Math.floor(Math.abs(u * 64)) % 128;

      // Distance light attenuation (Doom atmospheric lighting formula)
      const lightFactor = Math.max(0.18, Math.min(1.0, (lightFront / 255) * (1.0 - z * 0.045)));

      if (!line.isTwoSided) {
        // --- 1-SIDED SOLID WALL ---
        if (yBotF > yTopF) {
          ctx.drawImage(
            midCanvas,
            texU, 0, 1, midCanvas.height,
            x, yTopF, 1, Math.max(1, yBotF - yTopF)
          );
          // Darken with light shading
          if (lightFactor < 0.95) {
            ctx.fillStyle = `rgba(0,0,0,${1.0 - lightFactor})`;
            ctx.fillRect(x, yTopF, 1, Math.max(1, yBotF - yTopF));
          }
          zBuffer[x] = z;
        }
      } else {
        // --- 2-SIDED PORTAL (STAIRS, LEDGES, ARCHWAYS) ---
        const yTopB = (1 - t) * yTopB1 + t * yTopB2;
        const yBotB = (1 - t) * yBotB1 + t * yBotB2;

        // 1. Upper Wall (Lintel / Archway where ceiling steps down: ceilFront > ceilBack)
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

        // 2. Lower Wall (Stair Riser / Elevated Ledge where floorBack > floorFront)
        // THIS IS HOW CRISP, BEAUTIFUL STAIRS ARE RENDERED!
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

  // 2. Render 3D MD2 & MD3 Models with depth occlusion against zBuffer
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

    // Distance check to camera
    const mdx = placedModel.x - cam.x;
    const mdy = placedModel.y - cam.y;
    const mdist = Math.hypot(mdx, mdy);
    if (mdist < 0.2 || mdist > 35) continue;

    // Check depth against screen projection
    const mtx = mdx * sinA - mdy * cosA;
    const mtz = mdx * cosA + mdy * sinA;
    if (mtz <= Z_NEAR) continue;

    const msx = Math.floor(halfW + (mtx * focalLength) / mtz);
    if (msx >= 0 && msx < screenWidth) {
      if (mtz > zBuffer[msx]) continue; // Occluded by closer wall!
    }

    // Render MD2/MD3 model
    render3DModel(ctx, modelData, placedModel, camPose, zBuffer, 1, lights);
  }

  // 2.5. Render 3D Voxel Objects (with Z-Buffer Occlusion against walls)
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

      // Distance lighting attenuation
      const lightMul = Math.max(0.25, Math.min(1.0, 1.0 - vtz * 0.035));

      for (const pt of voxelModel.voxels) {
        const rx = (pt.x * cosYaw - pt.y * sinYaw) * mScale;
        const ry = (pt.x * sinYaw + pt.y * cosYaw) * mScale;
        const rz = pt.z * mScale;

        const wx = placed.x + rx;
        const wy = placed.y + ry;
        const wz = placed.z + rz;

        const pdx = wx - cam.x;
        const pdy = wy - cam.y;
        const ptx = pdx * sinA - pdy * cosA;
        const ptz = pdx * cosA + pdy * sinA;

        if (ptz <= Z_NEAR) continue;

        const screenX = Math.floor(halfW + (ptx * focalLength) / ptz);
        if (screenX < 0 || screenX >= screenWidth) continue;

        // Depth buffer occlusion check
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

        // Voxel right/bottom bevel shading for 3D appearance
        if (cubeSize >= 4) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
          ctx.fillRect(
            screenX + Math.floor(cubeSize / 4),
            screenY - Math.floor(cubeSize / 2),
            Math.ceil(cubeSize / 4),
            cubeSize
          );
        }
      }
    }
  }

  // 3. Render Entities / Sprites (Imps, Demons, Shotgun pickups, Barrels)
  const sortedEntities = [...entities].sort((a, b) => {
    const da = Math.hypot(a.x - cam.x * 64, a.y - cam.y * 64);
    const db = Math.hypot(b.x - cam.x * 64, b.y - cam.y * 64);
    return db - da; // Back to front
  });

  for (const ent of sortedEntities) {
    const edx = ent.x / 64 - cam.x;
    const edy = ent.y / 64 - cam.y;
    const etz = edx * cosA + edy * sinA;
    if (etz <= Z_NEAR) continue;

    const etx = edx * sinA - edy * cosA;
    const esx = halfW + (etx * focalLength) / etz;
    if (esx < -50 || esx > screenWidth + 50) continue;

    const screenCol = Math.floor(esx);
    if (screenCol >= 0 && screenCol < screenWidth && etz > zBuffer[screenCol]) {
      continue; // Behind wall
    }

    const spriteScale = (focalLength / etz) * 0.8;
    const spriteW = Math.max(16, spriteScale);
    const spriteH = Math.max(16, spriteScale);
    const spriteY = horizonY - spriteH + (cam.z * focalLength) / etz;

    // Draw sprite representation
    ctx.save();
    if (ent.type === "monster") {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(esx, spriteY + spriteH / 2, spriteW / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(esx - 4, spriteY + spriteH / 3, 3, 3);
      ctx.fillRect(esx + 1, spriteY + spriteH / 3, 3, 3);
    } else if (ent.type === "barrel") {
      ctx.fillStyle = "#15803d";
      ctx.fillRect(esx - spriteW / 4, spriteY, spriteW / 2, spriteH);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(esx - spriteW / 4, spriteY + 4, spriteW / 2, 4);
    } else {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(esx - spriteW / 4, spriteY + spriteH / 4, spriteW / 2, spriteH / 2);
    }
    ctx.restore();
  }

  // 4. Render First-Person 3D Weapon (Shotgun / Sword)
  if (weaponModel) {
    renderFirstPersonWeapon3D(
      ctx,
      weaponModel,
      weaponAttackTime,
      walkCycle,
      screenWidth,
      screenHeight
    );
  }
}
