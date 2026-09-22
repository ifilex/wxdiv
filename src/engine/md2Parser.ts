import {
  DivModel3DData,
  DivModel3DFrame,
  DivModel3DTriangle,
  DivModel3DVertex,
} from "../types";

export interface MD2AnimationGroup {
  name: string;
  firstFrame: number;
  lastFrame: number;
  fps: number;
}

export interface ParsedMD2Model extends DivModel3DData {
  skinWidth?: number;
  skinHeight?: number;
  skinCanvas?: HTMLCanvasElement;
  animationGroups: MD2AnimationGroup[];
}

/**
 * Standard Quake II MD2 Animation Frame Mapping
 */
export const STANDARD_MD2_ANIMATIONS: MD2AnimationGroup[] = [
  { name: "REPOSO (STAND)", firstFrame: 0, lastFrame: 39, fps: 9 },
  { name: "CORRER (RUN)", firstFrame: 40, lastFrame: 45, fps: 10 },
  { name: "GOLPE (ATTACK)", firstFrame: 46, lastFrame: 53, fps: 10 },
  { name: "IMPACTO (PAIN1)", firstFrame: 54, lastFrame: 57, fps: 7 },
  { name: "IMPACT02 (PAIN2)", firstFrame: 58, lastFrame: 61, fps: 7 },
  { name: "SALTO (JUMP)", firstFrame: 66, lastFrame: 71, fps: 8 },
  { name: "AGACHAR (CROUCH)", firstFrame: 135, lastFrame: 153, fps: 9 },
  { name: "ANDAR (WALK)", firstFrame: 154, lastFrame: 159, fps: 8 },
  { name: "MORIR (DEATH)", firstFrame: 178, lastFrame: 183, fps: 7 },
];

/**
 * Parses binary MD2 buffer (Quake II format)
 */
export function parseMD2Buffer(buffer: ArrayBuffer, modelName: string = "Modelo MD2"): ParsedMD2Model {
  const view = new DataView(buffer);

  // Check Magic "IDP2" (0x32504449 in Little Endian)
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);

  if (magic !== 0x32504449 || version !== 8) {
    throw new Error(
      `Formato MD2 no válido. Cabecera encontrada: 0x${magic.toString(16)}, versión: ${version}. Se requiere IDP2 v8.`
    );
  }

  const skinWidth = view.getInt32(8, true);
  const skinHeight = view.getInt32(12, true);
  const frameSize = view.getInt32(16, true);
  const numSkins = view.getInt32(20, true);
  const numVertices = view.getInt32(24, true);
  const numTexCoords = view.getInt32(28, true);
  const numTriangles = view.getInt32(32, true);
  const numFrames = view.getInt32(40, true);

  const offsetTexCoords = view.getInt32(48, true);
  const offsetTriangles = view.getInt32(52, true);
  const offsetFrames = view.getInt32(56, true);

  // Parse Texture Coordinates (s, t)
  const texCoords: [number, number][] = [];
  for (let i = 0; i < numTexCoords; i++) {
    const s = view.getInt16(offsetTexCoords + i * 4, true);
    const t = view.getInt16(offsetTexCoords + i * 4 + 2, true);
    const u = skinWidth > 0 ? s / skinWidth : 0;
    const v = skinHeight > 0 ? t / skinHeight : 0;
    texCoords.push([u, v]);
  }

  // Parse Triangles
  const triangles: DivModel3DTriangle[] = [];
  for (let i = 0; i < numTriangles; i++) {
    const triOffset = offsetTriangles + i * 12;
    const v0 = view.getUint16(triOffset, true);
    const v1 = view.getUint16(triOffset + 2, true);
    const v2 = view.getUint16(triOffset + 4, true);

    const st0 = view.getUint16(triOffset + 6, true);
    const st1 = view.getUint16(triOffset + 8, true);
    const st2 = view.getUint16(triOffset + 10, true);

    const uv: [[number, number], [number, number], [number, number]] = [
      texCoords[st0] || [0, 0],
      texCoords[st1] || [0, 0],
      texCoords[st2] || [0, 0],
    ];

    triangles.push({
      v: [v0, v1, v2],
      color: "#94a3b8",
      uv,
    });
  }

  // Parse Frames
  const frames: DivModel3DFrame[] = [];
  const animationMap = new Map<string, { first: number; last: number }>();

  for (let f = 0; f < numFrames; f++) {
    const fOffset = offsetFrames + f * frameSize;

    const scaleX = view.getFloat32(fOffset, true);
    const scaleY = view.getFloat32(fOffset + 4, true);
    const scaleZ = view.getFloat32(fOffset + 8, true);

    const transX = view.getFloat32(fOffset + 12, true);
    const transY = view.getFloat32(fOffset + 16, true);
    const transZ = view.getFloat32(fOffset + 20, true);

    // Name (16 bytes)
    let frameName = "";
    for (let c = 0; c < 16; c++) {
      const charCode = view.getUint8(fOffset + 24 + c);
      if (charCode === 0) break;
      frameName += String.fromCharCode(charCode);
    }
    frameName = frameName.trim() || `frame_${f}`;

    // Categorize animation by stripping trailing digits (e.g., "run1" -> "run")
    const animBase = frameName.replace(/\d+$/, "").toLowerCase() || "default";
    if (!animationMap.has(animBase)) {
      animationMap.set(animBase, { first: f, last: f });
    } else {
      animationMap.get(animBase)!.last = f;
    }

    // Vertices
    const vertices: DivModel3DVertex[] = [];
    const vertOffset = fOffset + 40;

    for (let v = 0; v < numVertices; v++) {
      const vx = view.getUint8(vertOffset + v * 4);
      const vy = view.getUint8(vertOffset + v * 4 + 1);
      const vz = view.getUint8(vertOffset + v * 4 + 2);

      // MD2 coordinates: X forward, Y left, Z up.
      // Convert to normalized space (-0.5 to 0.5 range roughly)
      const worldX = (vx * scaleX + transX) * 0.02;
      const worldY = (vy * scaleY + transY) * 0.02;
      const worldZ = (vz * scaleZ + transZ) * 0.02;

      vertices.push({ x: worldX, y: worldY, z: worldZ });
    }

    frames.push({
      name: frameName,
      vertices,
    });
  }

  // Build animation groups
  const animationGroups: MD2AnimationGroup[] = [];
  animationMap.forEach((range, name) => {
    animationGroups.push({
      name: name.toUpperCase(),
      firstFrame: range.first,
      lastFrame: range.last,
      fps: 10,
    });
  });

  if (animationGroups.length === 0) {
    animationGroups.push({
      name: "DEFAULT",
      firstFrame: 0,
      lastFrame: Math.max(0, frames.length - 1),
      fps: 10,
    });
  }

  return {
    id: `md2_${Date.now()}`,
    name: modelName,
    format: "md2",
    skinWidth,
    skinHeight,
    frames,
    triangles,
    baseScale: 1.0,
    animationGroups,
  };
}

/**
 * Parses binary MD3 buffer (Quake III Arena format)
 */
export function parseMD3Buffer(buffer: ArrayBuffer, modelName: string = "Modelo MD3"): ParsedMD2Model {
  const view = new DataView(buffer);

  // Check Magic "IDP3" (0x33504449 in Little Endian)
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);

  if (magic !== 0x33504449 || version !== 15) {
    throw new Error(
      `Formato MD3 no válido. Cabecera: 0x${magic.toString(16)}, versión: ${version}. Se requiere IDP3 v15.`
    );
  }

  const numFrames = view.getInt32(76, true);
  const numSurfaces = view.getInt32(84, true);
  const offsetSurfaces = view.getInt32(96, true);

  const allFrames: DivModel3DFrame[] = [];
  for (let f = 0; f < numFrames; f++) {
    allFrames.push({ name: `frame_${f}`, vertices: [] });
  }

  const allTriangles: DivModel3DTriangle[] = [];
  let currentSurfaceOffset = offsetSurfaces;
  let vertexOffsetCounter = 0;

  for (let s = 0; s < numSurfaces; s++) {
    const sMagic = view.getUint32(currentSurfaceOffset, true);
    if (sMagic !== 0x33504449) break;

    const sNumFrames = view.getInt32(currentSurfaceOffset + 72, true);
    const sNumVerts = view.getInt32(currentSurfaceOffset + 80, true);
    const sNumTriangles = view.getInt32(currentSurfaceOffset + 84, true);

    const sOffsetTriangles = currentSurfaceOffset + view.getInt32(currentSurfaceOffset + 88, true);
    const sOffsetSt = currentSurfaceOffset + view.getInt32(currentSurfaceOffset + 96, true);
    const sOffsetXyzNormals = currentSurfaceOffset + view.getInt32(currentSurfaceOffset + 100, true);
    const sOffsetEnd = currentSurfaceOffset + view.getInt32(currentSurfaceOffset + 104, true);

    // Parse UVs for this surface
    const surfaceUvs: [number, number][] = [];
    for (let u = 0; u < sNumVerts; u++) {
      const uCoord = view.getFloat32(sOffsetSt + u * 8, true);
      const vCoord = view.getFloat32(sOffsetSt + u * 8 + 4, true);
      surfaceUvs.push([uCoord, vCoord]);
    }

    // Parse Triangles for this surface
    for (let t = 0; t < sNumTriangles; t++) {
      const triPos = sOffsetTriangles + t * 12;
      const tv0 = view.getInt32(triPos, true) + vertexOffsetCounter;
      const tv1 = view.getInt32(triPos + 4, true) + vertexOffsetCounter;
      const tv2 = view.getInt32(triPos + 8, true) + vertexOffsetCounter;

      allTriangles.push({
        v: [tv0, tv1, tv2],
        color: "#38bdf8",
      });
    }

    // Parse Vertices for each frame
    for (let f = 0; f < Math.min(numFrames, sNumFrames); f++) {
      const frameVertOffset = sOffsetXyzNormals + f * sNumVerts * 8;
      for (let v = 0; v < sNumVerts; v++) {
        const vx = view.getInt16(frameVertOffset + v * 8, true) * (1.0 / 64.0) * 0.025;
        const vy = view.getInt16(frameVertOffset + v * 8 + 2, true) * (1.0 / 64.0) * 0.025;
        const vz = view.getInt16(frameVertOffset + v * 8 + 4, true) * (1.0 / 64.0) * 0.025;

        allFrames[f].vertices.push({ x: vx, y: vy, z: vz });
      }
    }

    vertexOffsetCounter += sNumVerts;
    currentSurfaceOffset = sOffsetEnd;
  }

  const animationGroups: MD2AnimationGroup[] = [
    {
      name: "ANIMACIÓN",
      firstFrame: 0,
      lastFrame: Math.max(0, allFrames.length - 1),
      fps: 10,
    },
  ];

  return {
    id: `md3_${Date.now()}`,
    name: modelName,
    format: "md3",
    frames: allFrames,
    triangles: allTriangles,
    baseScale: 1.0,
    animationGroups,
  };
}

// =============================================================================
// PROCEDURAL RETRO 3D CHARACTERS (Iconic DIV Games Studio "Generador de sprites")
// =============================================================================

export interface CharacterSkinColors {
  name: string;
  clothes: string;
  secondary: string;
  skin: string;
  boots: string;
  hair: string;
  weapon?: string;
}

/**
 * Creates skin texture canvas matching the DIV Games Studio Sprite Generator preview
 */
export function createCharacterSkinCanvas(
  archetype: "hombre" | "mujer" | "nino" | "armado" | string,
  colors: CharacterSkinColors
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, 128, 128);

  // Overalls / Trousers (top left, front & back)
  ctx.fillStyle = colors.clothes;
  // Front pants
  ctx.fillRect(10, 8, 44, 76);
  // Back pants
  ctx.fillRect(66, 8, 44, 76);

  // Straps / Overalls details
  ctx.fillStyle = colors.secondary;
  ctx.fillRect(14, 8, 8, 50);
  ctx.fillRect(42, 8, 8, 50);
  ctx.fillRect(70, 8, 8, 50);
  ctx.fillRect(98, 8, 8, 50);

  // Boots (bottom of pants)
  ctx.fillStyle = colors.boots;
  ctx.fillRect(12, 64, 18, 20);
  ctx.fillRect(34, 64, 18, 20);
  ctx.fillRect(68, 64, 18, 20);
  ctx.fillRect(90, 64, 18, 20);

  // Arms and Face (bottom left)
  ctx.fillStyle = colors.skin;
  ctx.fillRect(6, 88, 36, 36);
  // Eyes on face
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(14, 102, 4, 4);
  ctx.fillRect(26, 102, 4, 4);

  // Belt / Armor stripe (center bottom)
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(48, 92, 42, 16);

  // Hair / Texture swatch (bottom right)
  ctx.fillStyle = colors.hair;
  ctx.fillRect(94, 88, 28, 36);

  // Subtle shading grid
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, 126, 126);

  return canvas;
}

/**
 * Builds the iconic DIV Games Studio 3D character with full animation set
 */
export function generateDivCharacterModel(
  archetype: "hombre" | "mujer" | "nino" | "armado" = "hombre"
): ParsedMD2Model {
  const colorMap: Record<string, CharacterSkinColors> = {
    hombre: {
      name: "Hombre (Mono Azul)",
      clothes: "#2563eb", // Blue denim
      secondary: "#1d4ed8",
      skin: "#fed7aa", // Light flesh
      boots: "#0f172a", // Black boots
      hair: "#78350f", // Brown hair
    },
    mujer: {
      name: "Mujer (Túnica Roja)",
      clothes: "#e11d48", // Crimson red
      secondary: "#be123c",
      skin: "#fde68a",
      boots: "#831843",
      hair: "#f59e0b", // Blonde
    },
    nino: {
      name: "Niño (Ropa Verde)",
      clothes: "#16a34a", // Green
      secondary: "#15803d",
      skin: "#fed7aa",
      boots: "#78350f",
      hair: "#451a03",
    },
    armado: {
      name: "Armado (Soldado Combate)",
      clothes: "#475569", // Camo/Gray
      secondary: "#334155",
      skin: "#fed7aa",
      boots: "#020617",
      hair: "#0f172a",
      weapon: "#38bdf8",
    },
  };

  const colors = colorMap[archetype] || colorMap.hombre;
  const isKid = archetype === "nino";
  const scale = isKid ? 0.75 : archetype === "armado" ? 1.05 : 1.0;

  // Base vertices for standing idle pose
  // [0..3]: Head
  // [4..7]: Torso
  // [8..11]: Left Arm
  // [12..15]: Right Arm
  // [16..18]: Left Leg & Boot
  // [19..21]: Right Leg & Boot
  // [22..24]: Weapon (if armed)
  const createBaseVertices = (): DivModel3DVertex[] => [
    // Head
    { x: 0, y: 0, z: 0.95 * scale }, // 0: Top
    { x: -0.11 * scale, y: -0.09 * scale, z: 0.76 * scale }, // 1: Front L
    { x: 0.11 * scale, y: -0.09 * scale, z: 0.76 * scale }, // 2: Front R
    { x: 0, y: 0.11 * scale, z: 0.76 * scale }, // 3: Back

    // Torso (Overalls)
    { x: -0.2 * scale, y: -0.1 * scale, z: 0.75 * scale }, // 4: Shoulder L
    { x: 0.2 * scale, y: -0.1 * scale, z: 0.75 * scale }, // 5: Shoulder R
    { x: 0.18 * scale, y: -0.08 * scale, z: 0.38 * scale }, // 6: Hip R
    { x: -0.18 * scale, y: -0.08 * scale, z: 0.38 * scale }, // 7: Hip L
    { x: 0, y: 0.12 * scale, z: 0.75 * scale }, // 8: Back top
    { x: 0, y: 0.1 * scale, z: 0.38 * scale }, // 9: Back bottom

    // Left Arm
    { x: -0.28 * scale, y: -0.05 * scale, z: 0.65 * scale }, // 10: Elbow
    { x: -0.32 * scale, y: -0.12 * scale, z: 0.38 * scale }, // 11: Hand

    // Right Arm
    { x: 0.28 * scale, y: -0.05 * scale, z: 0.65 * scale }, // 12: Elbow
    { x: 0.32 * scale, y: -0.12 * scale, z: 0.38 * scale }, // 13: Hand

    // Left Leg
    { x: -0.12 * scale, y: -0.02 * scale, z: 0.2 * scale }, // 14: Knee
    { x: -0.13 * scale, y: -0.04 * scale, z: 0.0 * scale }, // 15: Foot / Boot

    // Right Leg
    { x: 0.12 * scale, y: -0.02 * scale, z: 0.2 * scale }, // 16: Knee
    { x: 0.13 * scale, y: -0.04 * scale, z: 0.0 * scale }, // 17: Foot / Boot

    // Weapon / Prop
    { x: 0.35 * scale, y: -0.35 * scale, z: 0.55 * scale }, // 18: Gun / Sword tip
    { x: 0.32 * scale, y: -0.18 * scale, z: 0.42 * scale }, // 19: Grip
  ];

  // Keyframe generator helpers
  const base = createBaseVertices();

  // Animation 1: REPOSO (IDLE) - 4 subtle breathing frames
  const framesReposo: DivModel3DFrame[] = [0, 1, 2, 3].map((step) => {
    const shift = Math.sin((step / 4) * Math.PI * 2) * 0.015;
    return {
      name: `reposo_${step}`,
      vertices: base.map((v, i) => {
        if (i <= 3) return { ...v, z: v.z + shift * 1.5 };
        if (i <= 9) return { ...v, z: v.z + shift };
        return { ...v };
      }),
    };
  });

  // Animation 2: ANDAR (WALK) - 6 walking frames
  const framesAndar: DivModel3DFrame[] = [0, 1, 2, 3, 4, 5].map((step) => {
    const phase = (step / 6) * Math.PI * 2;
    const legL = Math.sin(phase) * 0.18 * scale;
    const legR = -legL;
    const armL = -legL * 0.8;
    const armR = legL * 0.8;
    const bob = Math.abs(Math.cos(phase)) * 0.03 * scale;

    return {
      name: `andar_${step}`,
      vertices: base.map((v, i) => {
        const copy = { ...v, z: v.z + bob };
        if (i === 14 || i === 15) {
          copy.y += legL;
          if (legL < 0) copy.z += 0.04 * scale;
        }
        if (i === 16 || i === 17) {
          copy.y += legR;
          if (legR < 0) copy.z += 0.04 * scale;
        }
        if (i === 10 || i === 11) copy.y += armL;
        if (i === 12 || i === 13 || i >= 18) copy.y += armR;
        return copy;
      }),
    };
  });

  // Animation 3: ANDAR2 (MARCH) - 6 brisk march frames
  const framesAndar2: DivModel3DFrame[] = [0, 1, 2, 3, 4, 5].map((step) => {
    const phase = (step / 6) * Math.PI * 2;
    const legL = Math.sin(phase) * 0.28 * scale;
    const legR = -legL;
    return {
      name: `andar2_${step}`,
      vertices: base.map((v, i) => {
        const copy = { ...v };
        if (i === 14 || i === 15) {
          copy.y += legL;
          copy.z += Math.max(0, -legL) * 0.25;
        }
        if (i === 16 || i === 17) {
          copy.y += legR;
          copy.z += Math.max(0, -legR) * 0.25;
        }
        if (i === 10 || i === 11) copy.y -= legL * 0.9;
        if (i === 12 || i === 13 || i >= 18) copy.y += legL * 0.9;
        return copy;
      }),
    };
  });

  // Animation 4: CORRER (RUN) - 6 energetic running frames (iconic in DIV screenshot!)
  const framesCorrer: DivModel3DFrame[] = [0, 1, 2, 3, 4, 5].map((step) => {
    const phase = (step / 6) * Math.PI * 2;
    const legL = Math.sin(phase) * 0.38 * scale;
    const legR = -legL;
    const armL = -legL * 1.1;
    const armR = legL * 1.1;
    const lean = 0.08 * scale;
    const bounce = Math.sin(phase * 2) * 0.06 * scale;

    return {
      name: `correr_${step}`,
      vertices: base.map((v, i) => {
        const copy = { ...v, y: v.y - lean, z: v.z + bounce };
        if (i === 14 || i === 15) {
          copy.y += legL;
          if (legL < 0) copy.z += 0.12 * scale;
        }
        if (i === 16 || i === 17) {
          copy.y += legR;
          if (legR < 0) copy.z += 0.12 * scale;
        }
        if (i === 10 || i === 11) {
          copy.y += armL;
          copy.z += Math.abs(armL) * 0.4;
        }
        if (i === 12 || i === 13 || i >= 18) {
          copy.y += armR;
          copy.z += Math.abs(armR) * 0.4;
        }
        return copy;
      }),
    };
  });

  // Animation 5: GOLPE (ATTACK / PUNCH) - 5 punching frames
  const framesGolpe: DivModel3DFrame[] = [0, 1, 2, 3, 4].map((step) => {
    const punchReach = [0, 0.2, 0.5, 0.3, 0.05][step] * scale;
    return {
      name: `golpe_${step}`,
      vertices: base.map((v, i) => {
        const copy = { ...v };
        if (i === 12 || i === 13 || i >= 18) {
          copy.y -= punchReach;
          copy.z += punchReach * 0.3;
        }
        if (i === 5 || i === 2) copy.y -= punchReach * 0.2;
        return copy;
      }),
    };
  });

  // Animation 6: AGACHAR (CROUCH) - 4 crouch frames
  const framesAgachar: DivModel3DFrame[] = [0, 1, 2, 3].map((step) => {
    const crouchFactor = (step / 3) * 0.32 * scale;
    return {
      name: `agachar_${step}`,
      vertices: base.map((v, i) => {
        const copy = { ...v };
        if (i <= 13) copy.z -= crouchFactor;
        if (i === 14 || i === 16) copy.y -= crouchFactor * 0.4;
        return copy;
      }),
    };
  });

  // Animation 7: IMPACTO (PAIN 1) - 4 recoil frames
  const framesImpacto: DivModel3DFrame[] = [0, 1, 2, 3].map((step) => {
    const recoil = [0, 0.22, 0.15, 0.04][step] * scale;
    return {
      name: `impacto_${step}`,
      vertices: base.map((v, i) => {
        const copy = { ...v };
        if (i <= 9) {
          copy.y += recoil;
          copy.z -= recoil * 0.3;
        }
        if (i >= 10 && i <= 13) copy.y += recoil * 1.2;
        return copy;
      }),
    };
  });

  // Animation 8: IMPACT02 (PAIN 2 - HEAVY) - 4 heavy recoil frames
  const framesImpact02: DivModel3DFrame[] = [0, 1, 2, 3].map((step) => {
    const recoil = [0, 0.35, 0.25, 0.08][step] * scale;
    return {
      name: `impact02_${step}`,
      vertices: base.map((v, i) => {
        const copy = { ...v };
        copy.y += recoil;
        if (i <= 9) copy.z -= recoil * 0.5;
        return copy;
      }),
    };
  });

  // Animation 9: SALTO (JUMP) - 6 jumping arc frames
  const framesSalto: DivModel3DFrame[] = [0, 1, 2, 3, 4, 5].map((step) => {
    const jumpHeights = [0, 0.2, 0.45, 0.5, 0.25, 0.05];
    const h = jumpHeights[step] * scale;
    return {
      name: `salto_${step}`,
      vertices: base.map((v, i) => {
        const copy = { ...v, z: v.z + h };
        if (step >= 2 && step <= 4) {
          // Tuck legs slightly
          if (i === 14 || i === 15 || i === 16 || i === 17) copy.z += 0.12 * scale;
        }
        return copy;
      }),
    };
  });

  // Animation 10: MORIR (DEATH) - 6 falling backward frames
  const framesMorir: DivModel3DFrame[] = [0, 1, 2, 3, 4, 5].map((step) => {
    const progress = step / 5;
    const fallBack = progress * 0.65 * scale;
    const fallDown = progress * 0.72 * scale;
    return {
      name: `morir_${step}`,
      vertices: base.map((v, i) => {
        const copy = { ...v };
        if (i <= 9) {
          copy.y += fallBack;
          copy.z = Math.max(0.04 * scale, copy.z - fallDown);
        }
        if (i >= 10 && i <= 13) {
          copy.y += fallBack * 0.8;
          copy.z = Math.max(0.04 * scale, copy.z - fallDown);
        }
        return copy;
      }),
    };
  });

  // Consolidate all frames
  const allFrames: DivModel3DFrame[] = [
    ...framesReposo,
    ...framesAndar,
    ...framesAndar2,
    ...framesCorrer,
    ...framesGolpe,
    ...framesAgachar,
    ...framesImpacto,
    ...framesImpact02,
    ...framesSalto,
    ...framesMorir,
  ];

  // Triangles / Polygons for rendering
  const triangles: DivModel3DTriangle[] = [
    // Head / Face
    { v: [0, 1, 2], color: colors.skin },
    { v: [0, 2, 3], color: colors.hair },
    { v: [0, 3, 1], color: colors.hair },
    { v: [1, 2, 3], color: colors.skin },

    // Torso Front (Overalls / Clothes)
    { v: [4, 5, 6], color: colors.clothes },
    { v: [4, 6, 7], color: colors.secondary },

    // Torso Back
    { v: [8, 4, 7], color: colors.clothes },
    { v: [8, 7, 9], color: colors.secondary },
    { v: [8, 5, 6], color: colors.clothes },
    { v: [8, 6, 9], color: colors.secondary },

    // Left Arm
    { v: [4, 10, 11], color: colors.skin },

    // Right Arm
    { v: [5, 12, 13], color: colors.skin },

    // Left Leg / Pants & Boot
    { v: [7, 14, 15], color: colors.clothes },
    { v: [14, 15, 7], color: colors.boots },

    // Right Leg / Pants & Boot
    { v: [6, 16, 17], color: colors.clothes },
    { v: [16, 17, 6], color: colors.boots },
  ];

  if (archetype === "armado") {
    // Weapon
    triangles.push({ v: [13, 18, 19], color: "#38bdf8" });
    triangles.push({ v: [12, 19, 18], color: "#0284c7" });
  }

  // Animation groups matching the user's screenshot!
  let currentIdx = 0;
  const buildGroup = (name: string, count: number, fps: number): MD2AnimationGroup => {
    const group: MD2AnimationGroup = {
      name,
      firstFrame: currentIdx,
      lastFrame: currentIdx + count - 1,
      fps,
    };
    currentIdx += count;
    return group;
  };

  const animationGroups: MD2AnimationGroup[] = [
    buildGroup("REPOSO", framesReposo.length, 6),
    buildGroup("ANDAR", framesAndar.length, 8),
    buildGroup("ANDAR2", framesAndar2.length, 8),
    buildGroup("CORRER", framesCorrer.length, 10),
    buildGroup("GOLPE", framesGolpe.length, 10),
    buildGroup("AGACHAR", framesAgachar.length, 6),
    buildGroup("IMPACTO", framesImpacto.length, 8),
    buildGroup("IMPACT02", framesImpact02.length, 8),
    buildGroup("SALTO", framesSalto.length, 8),
    buildGroup("MORIR", framesMorir.length, 6),
  ];

  return {
    id: `character_${archetype}`,
    name: colors.name,
    format: "md2",
    skinWidth: 128,
    skinHeight: 128,
    skinCanvas: createCharacterSkinCanvas(archetype, colors),
    frames: allFrames,
    triangles,
    baseScale: scale,
    animationGroups,
  };
}
