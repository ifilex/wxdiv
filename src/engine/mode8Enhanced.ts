import {
  DivFluidParticle,
  DivFluidType,
  DivMode8Light,
  DivMode8PlacedModel,
  DivMode8PlacedVoxel,
  DivMode8Sector,
  DivModel3DData,
  DivModel3DTriangle,
  DivModel3DVertex,
  DivVoxelModel,
  DivVoxelPoint,
} from "../types";
import { generateDivCharacterModel } from "./md2Parser";

// =============================================================================
// 1. BUILT-IN MD2 / MD3 3D MESH MODELS (Hexen / GZDoom style)
// =============================================================================

function createBox(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  color: string
): { vertices: DivModel3DVertex[]; triangles: DivModel3DTriangle[] } {
  const vertices: DivModel3DVertex[] = [
    { x: minX, y: minY, z: minZ },
    { x: maxX, y: minY, z: minZ },
    { x: maxX, y: maxY, z: minZ },
    { x: minX, y: maxY, z: minZ },
    { x: minX, y: minY, z: maxZ },
    { x: maxX, y: minY, z: maxZ },
    { x: maxX, y: maxY, z: maxZ },
    { x: minX, y: maxY, z: maxZ },
  ];

  const triangles: DivModel3DTriangle[] = [
    // Front
    { v: [0, 1, 2], color },
    { v: [0, 2, 3], color },
    // Back
    { v: [5, 4, 7], color },
    { v: [5, 7, 6], color },
    // Top
    { v: [4, 5, 1], color },
    { v: [4, 1, 0], color },
    // Bottom
    { v: [3, 2, 6], color },
    { v: [3, 6, 7], color },
    // Left
    { v: [4, 0, 3], color },
    { v: [4, 3, 7], color },
    // Right
    { v: [1, 5, 6], color },
    { v: [1, 6, 2], color },
  ];

  return { vertices, triangles };
}

/**
 * Built-in MD2 Hexen Knight / Paladin
 */
function generateKnightModel(): DivModel3DData {
  // Idle frame: upright warrior with shield and broadsword
  const vIdle: DivModel3DVertex[] = [
    // Head & Helmet
    { x: 0, y: 0, z: 0.88 }, // 0 tip
    { x: -0.12, y: -0.1, z: 0.68 }, // 1
    { x: 0.12, y: -0.1, z: 0.68 }, // 2
    { x: 0.12, y: 0.1, z: 0.68 }, // 3
    { x: -0.12, y: 0.1, z: 0.68 }, // 4
    // Torso / Plate Armor
    { x: -0.22, y: -0.14, z: 0.68 }, // 5 left shoulder
    { x: 0.22, y: -0.14, z: 0.68 }, // 6 right shoulder
    { x: 0.2, y: -0.12, z: 0.35 }, // 7 right hip
    { x: -0.2, y: -0.12, z: 0.35 }, // 8 left hip
    { x: -0.22, y: 0.14, z: 0.68 }, // 9 back left shoulder
    { x: 0.22, y: 0.14, z: 0.68 }, // 10 back right shoulder
    { x: 0.2, y: 0.12, z: 0.35 }, // 11 back right hip
    { x: -0.2, y: 0.12, z: 0.35 }, // 12 back left hip
    // Legs
    { x: -0.12, y: 0, z: 0 }, // 13 left foot
    { x: 0.12, y: 0, z: 0 }, // 14 right foot
    // Sword in right hand
    { x: 0.35, y: -0.2, z: 0.4 }, // 15 hilt
    { x: 0.45, y: -0.4, z: 0.95 }, // 16 tip
    { x: 0.48, y: -0.42, z: 0.4 }, // 17 guard
    // Kite Shield on left arm
    { x: -0.28, y: -0.25, z: 0.65 }, // 18 top left
    { x: -0.12, y: -0.28, z: 0.65 }, // 19 top right
    { x: -0.2, y: -0.26, z: 0.3 }, // 20 bottom point
  ];

  // Walk frame: swinging arms and staggered legs
  const vWalk: DivModel3DVertex[] = vIdle.map((v, i) => {
    const copy = { ...v };
    if (i === 13) {
      copy.y += 0.18;
      copy.z += 0.08;
    } // left leg forward
    if (i === 14) {
      copy.y -= 0.18;
      copy.z -= 0.02;
    } // right leg back
    if (i === 15 || i === 16 || i === 17) {
      copy.y += 0.15;
      copy.z -= 0.05;
    } // sword swinging forward
    if (i === 18 || i === 19 || i === 20) {
      copy.y -= 0.08;
    } // shield back
    return copy;
  });

  // Attack frame: sword striking forward horizontally
  const vAttack: DivModel3DVertex[] = vIdle.map((v, i) => {
    const copy = { ...v };
    if (i === 15) {
      copy.x = 0.15;
      copy.y = -0.45;
      copy.z = 0.55;
    }
    if (i === 16) {
      copy.x = 0.2;
      copy.y = -0.95;
      copy.z = 0.6;
    }
    if (i === 17) {
      copy.x = 0.25;
      copy.y = -0.48;
      copy.z = 0.52;
    }
    return copy;
  });

  const triangles: DivModel3DTriangle[] = [
    // Helmet
    { v: [0, 1, 2], color: "#94a3b8" },
    { v: [0, 2, 3], color: "#64748b" },
    { v: [0, 3, 4], color: "#475569" },
    { v: [0, 4, 1], color: "#64748b" },
    // Torso Front
    { v: [5, 6, 7], color: "#38bdf8" },
    { v: [5, 7, 8], color: "#0284c7" },
    // Torso Back
    { v: [10, 9, 12], color: "#1e293b" },
    { v: [10, 12, 11], color: "#0f172a" },
    // Torso Sides
    { v: [9, 5, 8], color: "#0369a1" },
    { v: [9, 8, 12], color: "#075985" },
    { v: [6, 10, 11], color: "#0369a1" },
    { v: [6, 11, 7], color: "#075985" },
    // Legs
    { v: [8, 7, 14], color: "#475569" },
    { v: [8, 14, 13], color: "#334155" },
    // Shield
    { v: [18, 19, 20], color: "#e11d48" },
    // Sword blade & hilt
    { v: [15, 16, 17], color: "#f8fafc" },
  ];

  return {
    id: "knight",
    name: "Hexen Paladín MD2",
    format: "md2",
    frames: [
      { name: "idle", vertices: vIdle },
      { name: "walk", vertices: vWalk },
      { name: "attack", vertices: vAttack },
    ],
    triangles,
    baseScale: 1.0,
  };
}

/**
 * Built-in MD2 Gargoyle / Flying Demon
 */
function generateGargoyleModel(): DivModel3DData {
  const vIdle: DivModel3DVertex[] = [
    // Head with horns
    { x: 0, y: 0, z: 0.75 }, // 0 snout
    { x: -0.15, y: 0.05, z: 0.9 }, // 1 left horn tip
    { x: 0.15, y: 0.05, z: 0.9 }, // 2 right horn tip
    { x: 0, y: 0.08, z: 0.65 }, // 3 neck
    // Body / Chest
    { x: -0.22, y: 0, z: 0.6 }, // 4 left shoulder
    { x: 0.22, y: 0, z: 0.6 }, // 5 right shoulder
    { x: 0, y: -0.1, z: 0.35 }, // 6 belly
    { x: 0, y: 0.1, z: 0.35 }, // 7 back
    // Bat Wings
    { x: -0.65, y: 0.15, z: 0.8 }, // 8 left wing tip
    { x: -0.35, y: 0.2, z: 0.4 }, // 9 left wing lower
    { x: 0.65, y: 0.15, z: 0.8 }, // 10 right wing tip
    { x: 0.35, y: 0.2, z: 0.4 }, // 11 right wing lower
    // Claws / Feet
    { x: -0.15, y: -0.05, z: 0.15 }, // 12 left claw
    { x: 0.15, y: -0.05, z: 0.15 }, // 13 right claw
  ];

  const vFlap: DivModel3DVertex[] = vIdle.map((v, i) => {
    const copy = { ...v };
    if (i === 8 || i === 10) copy.z -= 0.35; // wings down
    if (i === 9 || i === 11) copy.z -= 0.15;
    return copy;
  });

  const triangles: DivModel3DTriangle[] = [
    // Head & Horns
    { v: [0, 1, 3], color: "#7f1d1d" },
    { v: [0, 3, 2], color: "#991b1b" },
    // Torso
    { v: [3, 4, 6], color: "#b91c1c" },
    { v: [3, 6, 5], color: "#dc2626" },
    { v: [4, 7, 6], color: "#450a0a" },
    { v: [5, 6, 7], color: "#450a0a" },
    // Left Wing
    { v: [4, 8, 9], color: "#581c87" },
    { v: [4, 9, 7], color: "#3b0764" },
    // Right Wing
    { v: [5, 11, 10], color: "#581c87" },
    { v: [5, 7, 11], color: "#3b0764" },
    // Claws
    { v: [6, 12, 13], color: "#451a03" },
  ];

  return {
    id: "gargoyle",
    name: "Gárgola Demonio MD2",
    format: "md2",
    frames: [
      { name: "idle", vertices: vIdle },
      { name: "flap", vertices: vFlap },
    ],
    triangles,
    baseScale: 1.1,
  };
}

/**
 * Built-in MD3 Gothic Column / Brazier
 */
function generateColumnModel(): DivModel3DData {
  const segs = 6;
  const vertices: DivModel3DVertex[] = [];
  const triangles: DivModel3DTriangle[] = [];

  // Base
  for (let i = 0; i < segs; i++) {
    const ang = (i / segs) * Math.PI * 2;
    vertices.push({ x: Math.cos(ang) * 0.3, y: Math.sin(ang) * 0.3, z: 0 });
    vertices.push({ x: Math.cos(ang) * 0.22, y: Math.sin(ang) * 0.22, z: 0.15 });
  }

  // Shaft
  for (let i = 0; i < segs; i++) {
    const ang = (i / segs) * Math.PI * 2;
    vertices.push({ x: Math.cos(ang) * 0.16, y: Math.sin(ang) * 0.16, z: 0.85 });
  }

  // Capital / Brazier Top
  for (let i = 0; i < segs; i++) {
    const ang = (i / segs) * Math.PI * 2;
    vertices.push({ x: Math.cos(ang) * 0.32, y: Math.sin(ang) * 0.32, z: 1.0 });
  }

  // Flame top vertex
  vertices.push({ x: 0, y: 0, z: 1.25 }); // index = segs * 3
  const flameTip = vertices.length - 1;

  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    const b0 = i * 2;
    const b1 = next * 2;
    const b0Top = i * 2 + 1;
    const b1Top = next * 2 + 1;
    const s0 = segs * 2 + i;
    const s1 = segs * 2 + next;
    const c0 = segs * 3 + i;
    const c1 = segs * 3 + next;

    // Base triangles
    triangles.push({ v: [b0, b1, b1Top], color: "#475569" });
    triangles.push({ v: [b0, b1Top, b0Top], color: "#334155" });

    // Shaft triangles
    triangles.push({ v: [b0Top, b1Top, s1], color: "#64748b" });
    triangles.push({ v: [b0Top, s1, s0], color: "#475569" });

    // Capital triangles
    triangles.push({ v: [s0, s1, c1], color: "#94a3b8" });
    triangles.push({ v: [s0, c1, c0], color: "#64748b" });

    // Flame triangles
    triangles.push({ v: [c0, c1, flameTip], color: "#f97316" });
  }

  return {
    id: "column",
    name: "Columna Gótica MD3",
    format: "md3",
    frames: [{ name: "default", vertices }],
    triangles,
    baseScale: 1.15,
  };
}

/**
 * Built-in MD3 Cyber Combat Drone
 */
function generateDroneModel(): DivModel3DData {
  const { vertices: bodyV, triangles: bodyT } = createBox(-0.25, -0.25, 0.4, 0.25, 0.25, 0.7, "#0284c7");
  // Thruster rings & eye
  bodyV.push({ x: 0, y: -0.32, z: 0.55 }); // 8: laser eye
  bodyT.push({ v: [0, 1, 8], color: "#ef4444" });
  bodyT.push({ v: [1, 2, 8], color: "#f87171" });

  return {
    id: "drone",
    name: "Dron de Asalto MD3",
    format: "md3",
    frames: [{ name: "hover", vertices: bodyV }],
    triangles: bodyT,
    baseScale: 0.9,
  };
}

/**
 * Built-in MD2 Mystic Chalice / Holy Relic
 */
function generateChaliceModel(): DivModel3DData {
  const { vertices, triangles } = createBox(-0.16, -0.16, 0.1, 0.16, 0.16, 0.6, "#eab308");
  // Mystic floating gem
  vertices.push({ x: 0, y: 0, z: 0.85 }); // 8: top apex
  triangles.push({ v: [4, 5, 8], color: "#a855f7" });
  triangles.push({ v: [5, 6, 8], color: "#c084fc" });
  triangles.push({ v: [6, 7, 8], color: "#a855f7" });
  triangles.push({ v: [7, 4, 8], color: "#e9d5ff" });

  return {
    id: "chalice",
    name: "Cáliz Místico MD2",
    format: "md2",
    frames: [
      { name: "idle", vertices },
      { name: "spin", vertices },
    ],
    triangles,
    baseScale: 0.85,
  };
}

/**
 * Built-in MD2 Demonio Cornudo / Baron of Hell Brute
 */
function generateDemonBruteModel(): DivModel3DData {
  const vIdle: DivModel3DVertex[] = [
    // Horned Head
    { x: 0, y: -0.1, z: 0.95 },     // 0: Snout
    { x: -0.22, y: 0.05, z: 1.15 }, // 1: Left Horn Tip
    { x: 0.22, y: 0.05, z: 1.15 },  // 2: Right Horn Tip
    { x: 0, y: 0.12, z: 0.8 },      // 3: Back of Skull
    // Massive Muscular Torso
    { x: -0.35, y: -0.15, z: 0.8 }, // 4: Left Shoulder
    { x: 0.35, y: -0.15, z: 0.8 },  // 5: Right Shoulder
    { x: -0.28, y: -0.1, z: 0.4 },  // 6: Left Hip
    { x: 0.28, y: -0.1, z: 0.4 },   // 7: Right Hip
    { x: -0.32, y: 0.18, z: 0.8 },  // 8: Back Left Shoulder
    { x: 0.32, y: 0.18, z: 0.8 },   // 9: Back Right Shoulder
    // Huge Demon Claws / Arms
    { x: -0.5, y: -0.3, z: 0.5 },   // 10: Left Hand Claw
    { x: 0.5, y: -0.3, z: 0.5 },    // 11: Right Hand Claw
    // Hooves / Legs
    { x: -0.18, y: 0, z: 0 },       // 12: Left Hoof
    { x: 0.18, y: 0, z: 0 },        // 13: Right Hoof
  ];

  // Walk frame
  const vWalk: DivModel3DVertex[] = vIdle.map((v, i) => {
    const copy = { ...v };
    if (i === 12) { copy.y += 0.22; copy.z += 0.1; }
    if (i === 13) { copy.y -= 0.22; }
    if (i === 10) { copy.y += 0.25; copy.z -= 0.1; }
    if (i === 11) { copy.y -= 0.25; copy.z += 0.1; }
    return copy;
  });

  // Attack frame: dual overhead claw smash
  const vAttack: DivModel3DVertex[] = vIdle.map((v, i) => {
    const copy = { ...v };
    if (i === 10) { copy.x = -0.3; copy.y = -0.65; copy.z = 0.85; }
    if (i === 11) { copy.x = 0.3; copy.y = -0.65; copy.z = 0.85; }
    if (i === 0) { copy.y = -0.2; copy.z = 0.85; } // lunging forward
    return copy;
  });

  const triangles: DivModel3DTriangle[] = [
    // Horns & Head
    { v: [0, 1, 3], color: "#450a0a" },
    { v: [0, 3, 2], color: "#7f1d1d" },
    // Torso Front
    { v: [4, 5, 7], color: "#991b1b" },
    { v: [4, 7, 6], color: "#b91c1c" },
    // Torso Back
    { v: [8, 9, 7], color: "#450a0a" },
    { v: [8, 7, 6], color: "#2e0606" },
    // Arms & Claws
    { v: [4, 10, 6], color: "#dc2626" },
    { v: [5, 11, 7], color: "#dc2626" },
    // Legs & Hooves
    { v: [6, 12, 7], color: "#7f1d1d" },
    { v: [7, 12, 13], color: "#450a0a" },
  ];

  return {
    id: "demon_brute",
    name: "Demonio Titán MD2",
    format: "md2",
    frames: [
      { name: "idle", vertices: vIdle },
      { name: "walk", vertices: vWalk },
      { name: "attack", vertices: vAttack },
    ],
    triangles,
    baseScale: 1.25,
  };
}

/**
 * Built-in MD2 3D Broadsword (Weapon & First-Person)
 */
function generateSwordModel(): DivModel3DData {
  const vIdle: DivModel3DVertex[] = [
    // Pommel & Grip
    { x: 0, y: 0.35, z: -0.15 },   // 0: Pommel
    { x: 0, y: 0.15, z: 0.0 },     // 1: Grip center
    // Crossguard
    { x: -0.22, y: 0.05, z: 0.05 },// 2: Guard left
    { x: 0.22, y: 0.05, z: 0.05 }, // 3: Guard right
    { x: 0, y: 0.05, z: 0.08 },    // 4: Guard center
    // Double-edged Steel Blade
    { x: -0.08, y: -0.15, z: 0.1 },// 5: Blade base left
    { x: 0.08, y: -0.15, z: 0.1 }, // 6: Blade base right
    { x: -0.06, y: -0.65, z: 0.2 },// 7: Blade mid left
    { x: 0.06, y: -0.65, z: 0.2 }, // 8: Blade mid right
    { x: 0, y: -0.95, z: 0.25 },   // 9: Blade tip
    { x: 0, y: -0.4, z: 0.15 },    // 10: Central fuller ridge
  ];

  // Slash animation frame
  const vSlash: DivModel3DVertex[] = vIdle.map((v) => {
    return {
      x: v.x * 0.7 - v.y * 0.7,
      y: v.x * 0.7 + v.y * 0.7 - 0.2,
      z: v.z - 0.15,
    };
  });

  const triangles: DivModel3DTriangle[] = [
    // Guard
    { v: [2, 3, 4], color: "#eab308" },
    { v: [1, 2, 4], color: "#ca8a04" },
    { v: [1, 4, 3], color: "#ca8a04" },
    // Blade Front
    { v: [5, 6, 10], color: "#e2e8f0" },
    { v: [5, 10, 7], color: "#cbd5e1" },
    { v: [6, 8, 10], color: "#f8fafc" },
    { v: [7, 10, 9], color: "#94a3b8" },
    { v: [8, 9, 10], color: "#f1f5f9" },
    // Pommel
    { v: [0, 1, 2], color: "#78350f" },
  ];

  return {
    id: "sword3d",
    name: "Espada Rúnica MD2",
    format: "md2",
    frames: [
      { name: "idle", vertices: vIdle },
      { name: "attack", vertices: vSlash },
      { name: "slash", vertices: vSlash },
    ],
    triangles,
    baseScale: 1.0,
  };
}

/**
 * Built-in MD2 3D Magic Staff (Sorcerer Weapon)
 */
function generateStaffModel(): DivModel3DData {
  const { vertices, triangles } = createBox(-0.04, -0.04, -0.6, 0.04, 0.04, 0.6, "#78350f");
  // Crystal top
  vertices.push({ x: 0, y: 0, z: 0.9 });
  triangles.push({ v: [4, 5, 8], color: "#a855f7" });
  triangles.push({ v: [5, 6, 8], color: "#c084fc" });
  triangles.push({ v: [6, 7, 8], color: "#e9d5ff" });
  triangles.push({ v: [7, 4, 8], color: "#a855f7" });

  return {
    id: "staff3d",
    name: "Báculo Arcano MD2",
    format: "md2",
    frames: [{ name: "idle", vertices }],
    triangles,
    baseScale: 1.1,
  };
}

/**
 * Built-in MD2 Gothic Relic Chest
 */
function generateChestModel(): DivModel3DData {
  const { vertices, triangles } = createBox(-0.25, -0.18, 0, 0.25, 0.18, 0.35, "#451a03");
  // Demon Eye / Lock
  vertices.push({ x: 0, y: -0.22, z: 0.2 });
  triangles.push({ v: [0, 1, 8], color: "#dc2626" });

  return {
    id: "chest_demon",
    name: "Cofre Demoníaco MD2",
    format: "md2",
    frames: [{ name: "idle", vertices }],
    triangles,
    baseScale: 1.0,
  };
}

const modelsRecord: Record<string, DivModel3DData> = {
  hombre: generateDivCharacterModel("hombre"),
  mujer: generateDivCharacterModel("mujer"),
  nino: generateDivCharacterModel("nino"),
  armado: generateDivCharacterModel("armado"),
  knight: generateKnightModel(),
  md2_knight: generateKnightModel(),
  gargoyle: generateGargoyleModel(),
  md2_gargoyle: generateGargoyleModel(),
  demon: generateDemonBruteModel(),
  demon_brute: generateDemonBruteModel(),
  md2_demon: generateDemonBruteModel(),
  sword: generateSwordModel(),
  sword3d: generateSwordModel(),
  md2_sword: generateSwordModel(),
  staff: generateStaffModel(),
  staff3d: generateStaffModel(),
  md2_staff: generateStaffModel(),
  column: generateColumnModel(),
  md3_pillar: generateColumnModel(),
  drone: generateDroneModel(),
  chalice: generateChaliceModel(),
  relic_caliz: generateChaliceModel(),
  chest: generateChestModel(),
  chest_demon: generateChestModel(),
};

export const BUILTIN_3D_MODELS: Record<string, DivModel3DData> & { get: (id: string) => DivModel3DData | undefined } = Object.assign(
  modelsRecord,
  {
    get: (id: string) => modelsRecord[id],
  }
);

// =============================================================================
// 2. BUILT-IN VOXEL SPRITES (Ken Silverman / Build / GZDoom style)
// =============================================================================

function generateVoxelPotion(): DivVoxelModel {
  const voxels: DivVoxelPoint[] = [];
  // Glass flask body (5x5x6)
  for (let z = 0; z < 5; z++) {
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        if (Math.abs(x) === 2 && Math.abs(y) === 2) continue;
        const isFluid = z < 4 && Math.abs(x) <= 1 && Math.abs(y) <= 1;
        voxels.push({
          x: x * 0.05,
          y: y * 0.05,
          z: z * 0.05 + 0.1,
          color: isFluid ? "#06b6d4" : "#bae6fd",
        });
      }
    }
  }
  // Flask neck & cork
  for (let z = 5; z <= 6; z++) {
    voxels.push({ x: 0, y: 0, z: z * 0.05 + 0.1, color: z === 6 ? "#b45309" : "#e0f2fe" });
  }
  return { id: "voxel_potion", name: "Poción Mágica Vóxel", voxels, scale: 1.0 };
}

function generateVoxelSkull(): DivVoxelModel {
  const voxels: DivVoxelPoint[] = [];
  for (let z = 0; z < 6; z++) {
    for (let y = -2; y <= 2; y++) {
      for (let x = -3; x <= 3; x++) {
        // Eye sockets
        if (z === 2 && y === -2 && (x === -1 || x === 1)) continue;
        // Jaw cavity
        if (z < 2 && (Math.abs(x) > 1 || y < -1)) continue;
        voxels.push({
          x: x * 0.05,
          y: y * 0.05,
          z: z * 0.05 + 0.2,
          color: z < 2 ? "#e2e8f0" : "#f8fafc",
        });
      }
    }
  }
  // Horns
  voxels.push({ x: -0.2, y: 0.1, z: 0.55, color: "#78350f" });
  voxels.push({ x: -0.25, y: 0.15, z: 0.65, color: "#451a03" });
  voxels.push({ x: 0.2, y: 0.1, z: 0.55, color: "#78350f" });
  voxels.push({ x: 0.25, y: 0.15, z: 0.65, color: "#451a03" });

  return { id: "voxel_skull", name: "Cráneo Demoniaco Vóxel", voxels, scale: 1.0 };
}

function generateVoxelBarrel(): DivVoxelModel {
  const voxels: DivVoxelPoint[] = [];
  for (let z = 0; z < 7; z++) {
    const radius = z === 0 || z === 6 ? 2 : 3;
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (Math.hypot(x, y) > radius + 0.2) continue;
        const isSteelBand = z === 1 || z === 5;
        voxels.push({
          x: x * 0.045,
          y: y * 0.045,
          z: z * 0.05 + 0.05,
          color: isSteelBand ? "#334155" : "#15803d", // toxic green barrel
        });
      }
    }
  }
  return { id: "voxel_barrel", name: "Barril Tóxico Vóxel", voxels, scale: 1.1 };
}

function generateVoxelKey(): DivVoxelModel {
  const voxels: DivVoxelPoint[] = [];
  // Key ring
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      if (Math.abs(x) === 1 && Math.abs(y) === 1) continue; // hole
      voxels.push({ x: x * 0.04, y: y * 0.04, z: 0.5, color: "#facc15" });
    }
  }
  // Shaft
  for (let z = 2; z <= 6; z++) {
    voxels.push({ x: 0, y: 0, z: z * 0.05, color: "#eab308" });
  }
  // Teeth
  voxels.push({ x: 0.05, y: 0, z: 0.15, color: "#ca8a04" });
  voxels.push({ x: 0.08, y: 0, z: 0.25, color: "#ca8a04" });

  return { id: "voxel_key", name: "Llave Dorada Vóxel", voxels, scale: 1.1 };
}

function generateVoxelTorch(): DivVoxelModel {
  const voxels: DivVoxelPoint[] = [];
  // Metal wall bracket / base
  for (let z = 0; z < 2; z++) {
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        voxels.push({ x: x * 0.04, y: y * 0.04, z: z * 0.06, color: "#334155" });
      }
    }
  }
  // Iron staff / sconce
  for (let z = 2; z < 6; z++) {
    voxels.push({ x: 0, y: 0, z: z * 0.06, color: "#475569" });
    voxels.push({ x: 0.03, y: 0, z: z * 0.06, color: "#64748b" });
  }
  // Sconce basket
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      if (Math.abs(x) === 1 || Math.abs(y) === 1) {
        voxels.push({ x: x * 0.05, y: y * 0.05, z: 6 * 0.06, color: "#1e293b" });
      }
    }
  }
  // Flickering fire voxels (red, orange, yellow, bright core)
  const flameColors = ["#ef4444", "#f97316", "#eab308", "#fef08a"];
  for (let z = 6; z <= 10; z++) {
    const spread = z <= 8 ? 1 : 0;
    for (let y = -spread; y <= spread; y++) {
      for (let x = -spread; x <= spread; x++) {
        const cIdx = Math.min(flameColors.length - 1, Math.floor((z - 6) + Math.abs(x) + Math.abs(y)));
        voxels.push({
          x: x * 0.045,
          y: y * 0.045,
          z: z * 0.06,
          color: flameColors[cIdx] || "#f97316",
        });
      }
    }
  }
  return { id: "voxel_torch", name: "Antorcha de Mazmorra Vóxel", voxels, scale: 1.1 };
}

function generateVoxelPillar(): DivVoxelModel {
  const voxels: DivVoxelPoint[] = [];
  // Base pedestal
  for (let z = 0; z < 2; z++) {
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        if (Math.abs(x) === 3 && Math.abs(y) === 3) continue;
        voxels.push({ x: x * 0.04, y: y * 0.04, z: z * 0.05, color: "#334155" });
      }
    }
  }
  // Column shaft
  for (let z = 2; z < 14; z++) {
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        const isBevel = (Math.abs(x) === 2 && Math.abs(y) === 2);
        if (isBevel) continue;
        const isCore = Math.abs(x) < 2 && Math.abs(y) < 2;
        if (!isCore || z === 2 || z === 13) {
          voxels.push({
            x: x * 0.04,
            y: y * 0.04,
            z: z * 0.05,
            color: (x + y + z) % 3 === 0 ? "#475569" : "#64748b",
          });
        }
      }
    }
  }
  // Capital / Crown
  for (let z = 14; z < 16; z++) {
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        if (Math.abs(x) === 3 && Math.abs(y) === 3) continue;
        voxels.push({ x: x * 0.04, y: y * 0.04, z: z * 0.05, color: "#334155" });
      }
    }
  }
  return { id: "voxel_pillar", name: "Columna Gótica Vóxel", voxels, scale: 1.2 };
}

function generateVoxelCrate(): DivVoxelModel {
  const voxels: DivVoxelPoint[] = [];
  for (let z = 0; z < 7; z++) {
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        const isEdge =
          (Math.abs(x) === 3 && Math.abs(y) === 3) ||
          (Math.abs(x) === 3 && (z === 0 || z === 6)) ||
          (Math.abs(y) === 3 && (z === 0 || z === 6));
        const isSurface = Math.abs(x) === 3 || Math.abs(y) === 3 || z === 0 || z === 6;
        if (isSurface) {
          voxels.push({
            x: x * 0.045,
            y: y * 0.045,
            z: z * 0.045,
            color: isEdge ? "#334155" : (x === 0 || y === 0) ? "#ca8a04" : "#4d7c0f",
          });
        }
      }
    }
  }
  return { id: "voxel_crate", name: "Caja de Suministros Vóxel", voxels, scale: 1.1 };
}

function generateVoxelTerminal(): DivVoxelModel {
  const voxels: DivVoxelPoint[] = [];
  // Base stand
  for (let z = 0; z < 3; z++) {
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        voxels.push({ x: x * 0.04, y: y * 0.04, z: z * 0.05, color: "#0f172a" });
      }
    }
  }
  // Console desk & keyboard
  for (let y = -2; y <= 2; y++) {
    for (let x = -3; x <= 3; x++) {
      voxels.push({ x: x * 0.04, y: y * 0.04, z: 3 * 0.05, color: "#1e293b" });
      voxels.push({ x: x * 0.04, y: y * 0.04, z: 4 * 0.05, color: (x + y) % 2 === 0 ? "#38bdf8" : "#334155" });
    }
  }
  // Upright Screen
  for (let z = 5; z < 10; z++) {
    for (let x = -3; x <= 3; x++) {
      const isScreen = Math.abs(x) < 3 && z > 5 && z < 9;
      voxels.push({
        x: x * 0.04,
        y: -0.06,
        z: z * 0.05,
        color: isScreen ? "#22c55e" : "#0284c7",
      });
    }
  }
  return { id: "voxel_terminal", name: "Terminal Sci-Fi Vóxel", voxels, scale: 1.15 };
}

function generateVoxelMedikit(): DivVoxelModel {
  const voxels: DivVoxelPoint[] = [];
  for (let z = 0; z < 4; z++) {
    for (let y = -3; y <= 3; y++) {
      for (let x = -4; x <= 4; x++) {
        // Red cross on top and front
        const isCross = (Math.abs(x) <= 1 && Math.abs(y) <= 2) || (Math.abs(x) <= 3 && Math.abs(y) <= 1);
        voxels.push({
          x: x * 0.04,
          y: y * 0.04,
          z: z * 0.05 + 0.05,
          color: (isCross && z >= 3) ? "#ef4444" : "#f8fafc",
        });
      }
    }
  }
  return { id: "voxel_medikit", name: "Botiquín Médico Vóxel", voxels, scale: 1.0 };
}

function generateVoxelChest(): DivVoxelModel {
  const voxels: DivVoxelPoint[] = [];
  for (let z = 0; z < 5; z++) {
    for (let y = -3; y <= 3; y++) {
      for (let x = -4; x <= 4; x++) {
        const isGoldEdge = Math.abs(x) === 4 || Math.abs(y) === 3 || z === 0 || z === 4;
        voxels.push({
          x: x * 0.04,
          y: y * 0.04,
          z: z * 0.05,
          color: isGoldEdge ? "#eab308" : "#78350f",
        });
      }
    }
  }
  return { id: "voxel_chest", name: "Cofre del Tesoro Vóxel", voxels, scale: 1.1 };
}

const voxelsRecord: Record<string, DivVoxelModel> = {
  voxel_potion: generateVoxelPotion(),
  vox_potion: generateVoxelPotion(),
  potion: generateVoxelPotion(),
  voxel_skull: generateVoxelSkull(),
  vox_skull: generateVoxelSkull(),
  skull: generateVoxelSkull(),
  voxel_barrel: generateVoxelBarrel(),
  barrel: generateVoxelBarrel(),
  voxel_key: generateVoxelKey(),
  key: generateVoxelKey(),
  voxel_torch: generateVoxelTorch(),
  torch: generateVoxelTorch(),
  voxel_pillar: generateVoxelPillar(),
  pillar: generateVoxelPillar(),
  voxel_crate: generateVoxelCrate(),
  crate: generateVoxelCrate(),
  voxel_terminal: generateVoxelTerminal(),
  terminal: generateVoxelTerminal(),
  voxel_medikit: generateVoxelMedikit(),
  medikit: generateVoxelMedikit(),
  voxel_chest: generateVoxelChest(),
  chest: generateVoxelChest(),
};

export const BUILTIN_VOXELS: Record<string, DivVoxelModel> & { get: (id: string) => DivVoxelModel | undefined } = Object.assign(
  voxelsRecord,
  {
    get: (id: string) => voxelsRecord[id],
  }
);

// =============================================================================
// 3. RAY TRACING & DYNAMIC LIGHTING ENGINE (Optical shadows & falloff)
// =============================================================================

export interface RaytraceResult {
  lightSum: { r: number; g: number; b: number };
  shadowFactor: number;
}

/**
 * Calculates ray-traced lighting contribution at a 3D world position
 * performing line-of-sight obstruction rays against the 2D grid walls
 */
export function calculatePointLighting(
  targetX: number,
  targetY: number,
  targetZ: number,
  normalX: number,
  normalY: number,
  normalZ: number,
  lights: DivMode8Light[],
  map?: number[][],
  mapW: number = 24,
  mapH: number = 24,
  ambientLight: number = 0.25,
  ambientColor: string = "#1e293b",
  enableRaytracing: boolean = true
): { r: number; g: number; b: number; intensity: number } {
  // Parse ambient base
  let totalR = ambientLight * 35;
  let totalG = ambientLight * 45;
  let totalB = ambientLight * 65;

  if (!lights || lights.length === 0) {
    const r = Math.min(255, Math.floor(totalR));
    const g = Math.min(255, Math.floor(totalG));
    const b = Math.min(255, Math.floor(totalB));
    return { r, g, b, intensity: Math.min(1.0, (r + g + b) / 765) };
  }

  for (const light of lights) {
    const dx = light.x - targetX;
    const dy = light.y - targetY;
    if (Math.abs(dx) > light.radius || Math.abs(dy) > light.radius) continue;

    const dz = light.z - targetZ;
    const distSq = dx * dx + dy * dy + dz * dz;
    const radSq = light.radius * light.radius;
    if (distSq > radSq || distSq < 0.0001) continue;
    const dist = Math.sqrt(distSq);

    // Normal dot product for Lambertian shading
    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;
    const lambert = Math.max(0.1, nx * normalX + ny * normalY + nz * normalZ);

    // Distance attenuation: inverse square with reach cutoff
    const atten = Math.max(0, 1.0 - dist / light.radius) * lambert * (light.intensity ?? 1.0);

    // Ray-traced shadow ray (LOS obstruction through grid) - optimized step count
    let shadow = 1.0;
    if (enableRaytracing && (light.castShadows ?? true) && map) {
      const raySteps = Math.min(10, Math.max(3, Math.floor(dist * 2.5)));
      const stepX = dx / (raySteps || 1);
      const stepY = dy / (raySteps || 1);

      let curX = targetX;
      let curY = targetY;

      for (let s = 1; s < raySteps; s++) {
        curX += stepX;
        curY += stepY;
        const cellX = Math.floor(curX);
        const cellY = Math.floor(curY);

        if (cellX >= 0 && cellX < mapW && cellY >= 0 && cellY < mapH) {
          if (map[cellY] && map[cellY][cellX] > 0 && map[cellY][cellX] < 30) {
            shadow = 0.2; // In shadow penumbra
            break;
          }
        }
      }
    }

    // Flicker multiplier for torches
    const flicker = light.flicker ? 0.9 + Math.sin(Date.now() * 0.008 + Number(light.x) * 3.1) * 0.12 : 1.0;

    const contrib = atten * shadow * flicker;
    totalR += light.r * contrib;
    totalG += light.g * contrib;
    totalB += light.b * contrib;
  }

  const r = Math.min(255, Math.floor(totalR));
  const g = Math.min(255, Math.floor(totalG));
  const b = Math.min(255, Math.floor(totalB));
  return {
    r,
    g,
    b,
    intensity: Math.min(1.0, (r + g + b) / 765),
  };
}

// =============================================================================
// 4. PARTICLE-BASED FLUID ENGINE (Lava, Acid, Water, Blood)
// =============================================================================

export class Mode8FluidParticleEngine {
  public particles: DivFluidParticle[] = [];
  private maxParticles = 45;
  private cachedFluidTiles: { x: number; y: number; fluidType: string; floorHeight: number }[] = [];
  private lastSectorCheck = 0;

  public update(sectors: DivMode8Sector[][] | undefined, mapW: number, mapH: number) {
    // 1. Age and move existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.life--;

      // Gravity or buoyancy
      if (p.type === "ember" || p.type === "steam") {
        p.vz += 0.001; // float up
      } else {
        p.vz -= 0.002; // drop down
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Cache fluid sectors so we don't scan all grid tiles every frame
    if (!sectors) return;
    this.lastSectorCheck++;
    if (this.lastSectorCheck > 60 || this.cachedFluidTiles.length === 0) {
      this.lastSectorCheck = 0;
      this.cachedFluidTiles = [];
      for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
          const sec = sectors[y]?.[x];
          if (sec && sec.fluidType && sec.fluidType !== "none") {
            this.cachedFluidTiles.push({
              x,
              y,
              fluidType: sec.fluidType,
              floorHeight: sec.floorHeight || 0,
            });
          }
        }
      }
    }

    if (this.cachedFluidTiles.length === 0 || this.particles.length >= this.maxParticles) return;

    // Pick 1-2 random fluid tiles to spawn from
    const spawns = Math.min(2, Math.floor(Math.random() * 2) + 1);
    for (let s = 0; s < spawns; s++) {
      if (this.particles.length >= this.maxParticles) break;
      const tile = this.cachedFluidTiles[Math.floor(Math.random() * this.cachedFluidTiles.length)];
      if (!tile) continue;

      const px = tile.x + 0.15 + Math.random() * 0.7;
      const py = tile.y + 0.15 + Math.random() * 0.7;
      const pz = tile.floorHeight + 0.05;

      if (tile.fluidType === "lava") {
        this.particles.push({
          x: px,
          y: py,
          z: pz,
          vx: (Math.random() - 0.5) * 0.012,
          vy: (Math.random() - 0.5) * 0.012,
          vz: 0.015 + Math.random() * 0.02,
          life: 25 + Math.floor(Math.random() * 25),
          maxLife: 50,
          size: 2.2 + Math.random() * 2.0,
          color: Math.random() > 0.4 ? "#f97316" : "#ef4444",
          type: "ember",
        });
      } else if (tile.fluidType === "acid") {
        this.particles.push({
          x: px,
          y: py,
          z: pz,
          vx: (Math.random() - 0.5) * 0.01,
          vy: (Math.random() - 0.5) * 0.01,
          vz: 0.012 + Math.random() * 0.015,
          life: 20 + Math.floor(Math.random() * 20),
          maxLife: 40,
          size: 1.8 + Math.random() * 1.8,
          color: "#22c55e",
          type: "bubble",
        });
      } else if (tile.fluidType === "water") {
        this.particles.push({
          x: px,
          y: py,
          z: pz,
          vx: (Math.random() - 0.5) * 0.008,
          vy: (Math.random() - 0.5) * 0.008,
          vz: 0.008 + Math.random() * 0.012,
          life: 18 + Math.floor(Math.random() * 18),
          maxLife: 36,
          size: 1.5 + Math.random() * 1.5,
          color: "#38bdf8",
          type: "droplet",
        });
      } else if (tile.fluidType === "blood") {
        this.particles.push({
          x: px,
          y: py,
          z: pz,
          vx: (Math.random() - 0.5) * 0.006,
          vy: (Math.random() - 0.5) * 0.006,
          vz: 0.006 + Math.random() * 0.01,
          life: 20 + Math.floor(Math.random() * 18),
          maxLife: 38,
          size: 2.0 + Math.random() * 1.8,
          color: "#991b1b",
          type: "bubble",
        });
      }
    }
  }

  public clear() {
    this.particles = [];
  }
}

// =============================================================================
// 5. 3D PROJECTION & RENDERING FOR MD2/MD3 MODELS & VOXELS
// =============================================================================

export interface Camera3DPose {
  posX?: number;
  posY?: number;
  posZ?: number;
  x?: number;
  y?: number;
  z?: number;
  dirX?: number;
  dirY?: number;
  planeX?: number;
  planeY?: number;
  angle?: number;
  pitch?: number;
  fov?: number;
  width?: number;
  height?: number;
  screenWidth?: number;
  screenHeight?: number;
}

/**
 * Transforms a 3D world coordinate into 2D camera viewport coordinates
 */
export function project3DPoint(
  wx: number,
  wy: number,
  wz: number,
  cam: Camera3DPose
): { sx: number; sy: number; screenX: number; screenY: number; depth: number; visible: boolean } {
  const cx = cam.posX ?? cam.x ?? 0;
  const cy = cam.posY ?? cam.y ?? 0;
  const cz = cam.posZ ?? cam.z ?? 0;

  const rx = wx - cx;
  const ry = wy - cy;
  const rz = wz - cz;

  const w = cam.width ?? cam.screenWidth ?? 640;
  const h = cam.height ?? cam.screenHeight ?? 480;

  let dirX = cam.dirX;
  let dirY = cam.dirY;
  let planeX = cam.planeX;
  let planeY = cam.planeY;

  if (dirX === undefined || dirY === undefined || planeX === undefined || planeY === undefined) {
    const rad = ((cam.angle || 0) * Math.PI) / 180;
    dirX = Math.cos(rad);
    dirY = Math.sin(rad);
    planeX = -dirY * 0.66;
    planeY = dirX * 0.66;
  }

  // Camera plane transformation
  const invDet = 1.0 / (planeX * dirY - dirX * planeY || 1e-6);
  const transX = invDet * (dirY * rx - dirX * ry);
  const transY = invDet * (-planeY * rx + planeX * ry); // depth along view vector

  if (transY <= 0.15) {
    return { sx: 0, sy: 0, screenX: 0, screenY: 0, depth: transY, visible: false };
  }

  const sx = Math.floor((w / 2) * (1 + transX / transY));
  const sy = Math.floor(
    (h / 2) * (1 - rz / transY) + (cam.pitch || 0)
  );

  return { sx, sy, screenX: sx, screenY: sy, depth: transY, visible: true };
}

/**
 * Renders an MD2/MD3 3D mesh model with lighting and perspective
 */
export function render3DModel(
  ctx: CanvasRenderingContext2D,
  model: DivModel3DData,
  placed: DivMode8PlacedModel,
  cam: Camera3DPose,
  zBuffer: Float32Array,
  colWidthOrLights?: number | DivMode8Light[],
  lightsOrMap?: DivMode8Light[] | number[][],
  mapOrFog?: number[][] | string,
  mapW?: number,
  mapH?: number
) {
  const camX = cam.x ?? cam.posX ?? 0;
  const camY = cam.y ?? cam.posY ?? 0;
  const dx = placed.x - camX;
  const dy = placed.y - camY;
  const dist = Math.hypot(dx, dy);
  if (dist > 26) return; // Too far for retro 3D frustum

  const camAngleRad = ((cam.angle ?? 0) * Math.PI) / 180;
  const dot = dx * Math.cos(camAngleRad) + dy * Math.sin(camAngleRad);
  if (dot < -0.8 && dist > 1.2) return; // Completely behind camera

  // Select and interpolate frames based on animation
  let activeVertices: DivModel3DVertex[] = model.frames[0]?.vertices || [];
  const targetAnim = (placed.currentAnimation || "idle").toLowerCase();
  let frameIdx = model.frames.findIndex((f) => f.name.toLowerCase() === targetAnim);
  if (frameIdx < 0) frameIdx = 0;

  const frameA = model.frames[frameIdx];
  if (frameA) {
    activeVertices = frameA.vertices;
    // If multiple frames exist for this animation or sequence, interpolate
    const nextIdx = (frameIdx + 1) % model.frames.length;
    const frameB = model.frames[nextIdx];
    const t = Math.max(0, Math.min(1, placed.animFrame || 0));
    if (frameB && frameB.vertices.length === frameA.vertices.length && t > 0) {
      activeVertices = frameA.vertices.map((va, i) => {
        const vb = frameB.vertices[i];
        return {
          x: va.x + (vb.x - va.x) * t,
          y: va.y + (vb.y - va.y) * t,
          z: va.z + (vb.z - va.z) * t,
        };
      });
    }
  }

  let colWidth = 2;
  let lights: DivMode8Light[] = [];
  let map: number[][] | undefined = undefined;
  let mapWVal = 24;
  let mapHVal = 24;

  if (typeof colWidthOrLights === "number") {
    colWidth = colWidthOrLights;
    if (Array.isArray(lightsOrMap)) {
      lights = lightsOrMap as DivMode8Light[];
    }
  } else if (Array.isArray(colWidthOrLights)) {
    lights = colWidthOrLights as DivMode8Light[];
    if (Array.isArray(lightsOrMap)) {
      map = lightsOrMap as number[][];
    }
    if (typeof mapOrFog === "number") mapWVal = mapOrFog;
    if (typeof mapW === "number") mapHVal = mapW;
  }

  const yawRad = ((placed.yaw || 0) * Math.PI) / 180;
  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);
  const scale = (placed.scale || 1.0) * (model.baseScale || 1.0);

  // Transform vertices to world coordinates
  const worldVerts: { x: number; y: number; z: number }[] = [];
  const projVerts: { sx: number; sy: number; depth: number; visible: boolean }[] = [];

  for (const v of activeVertices) {
    // Model space rotation around Z
    const rx = (v.x * cosYaw - v.y * sinYaw) * scale;
    const ry = (v.x * sinYaw + v.y * cosYaw) * scale;
    const rz = v.z * scale;

    const wx = placed.x + rx;
    const wy = placed.y + ry;
    const wz = placed.z + rz;

    worldVerts.push({ x: wx, y: wy, z: wz });
    projVerts.push(project3DPoint(wx, wy, wz, cam));
  }

  // Calculate local lighting at model center
  const lightRgb = calculatePointLighting(
    placed.x,
    placed.y,
    placed.z + 0.4,
    0,
    0,
    1,
    lights,
    map,
    mapWVal,
    mapHVal
  );

  // Sort triangles by average depth
  const sortedTriangles = model.triangles
    .map((tri) => {
      const p0 = projVerts[tri.v[0]];
      const p1 = projVerts[tri.v[1]];
      const p2 = projVerts[tri.v[2]];
      const avgDepth = (p0.depth + p1.depth + p2.depth) / 3;
      return { tri, p0, p1, p2, avgDepth };
    })
    .filter((t) => t.p0.visible || t.p1.visible || t.p2.visible)
    .sort((a, b) => b.avgDepth - a.avgDepth);

  for (const { tri, p0, p1, p2, avgDepth } of sortedTriangles) {
    if (avgDepth <= 0.2) continue;

    // Check Z-buffer occlusion at centroid
    const midX = Math.floor((p0.sx + p1.sx + p2.sx) / 3);
    const colIdx = Math.floor(midX / colWidth);
    if (colIdx >= 0 && colIdx < zBuffer.length && avgDepth > zBuffer[colIdx]) {
      continue; // Wall occludes triangle
    }

    // Shading with dynamic light
    ctx.beginPath();
    ctx.moveTo(p0.sx, p0.sy);
    ctx.lineTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.closePath();

    ctx.fillStyle = tri.color || "#94a3b8";
    ctx.fill();

    // Subtle dark edge wireframe for crisp retro aesthetic
    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Renders a 3D Voxel object as perspective-projected volumetric cubes
 */
export function renderVoxelObject(
  ctx: CanvasRenderingContext2D,
  voxelModel: DivVoxelModel,
  placed: DivMode8PlacedVoxel,
  cam: Camera3DPose,
  zBuffer: Float32Array,
  colWidthOrLights?: number | DivMode8Light[],
  lightsOrMap?: DivMode8Light[] | number[][],
  mapOrFog?: number[][] | string,
  mapW?: number,
  mapH?: number
) {
  const camX = cam.x ?? cam.posX ?? 0;
  const camY = cam.y ?? cam.posY ?? 0;
  const dx = placed.x - camX;
  const dy = placed.y - camY;
  const dist = Math.hypot(dx, dy);
  if (dist > 26) return; // Outside visibility range

  const camAngleRad = ((cam.angle ?? 0) * Math.PI) / 180;
  const dot = dx * Math.cos(camAngleRad) + dy * Math.sin(camAngleRad);
  if (dot < -0.8 && dist > 1.2) return; // Behind camera

  let colWidth = 2;
  if (typeof colWidthOrLights === "number") {
    colWidth = colWidthOrLights;
  }

  const yawRad = ((placed.yaw || 0) * Math.PI) / 180;
  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);
  const scale = (placed.scale || 1.0) * (voxelModel.scale || 1.0);

  const h = cam.height ?? cam.screenHeight ?? 480;

  // Project voxels and sort by depth
  const projectedVoxels: { sx: number; sy: number; depth: number; color: string; size: number }[] = [];

  for (const v of voxelModel.voxels) {
    const rx = (v.x * cosYaw - v.y * sinYaw) * scale;
    const ry = (v.x * sinYaw + v.y * cosYaw) * scale;
    const rz = v.z * scale;

    const wx = placed.x + rx;
    const wy = placed.y + ry;
    const wz = placed.z + rz;

    const proj = project3DPoint(wx, wy, wz, cam);
    if (proj.visible && proj.depth > 0.15) {
      const cubeSize = Math.max(1.5, Math.floor((h / proj.depth) * 0.05 * scale));
      projectedVoxels.push({
        sx: proj.sx,
        sy: proj.sy,
        depth: proj.depth,
        color: v.color,
        size: cubeSize,
      });
    }
  }

  // Sort far to near
  projectedVoxels.sort((a, b) => b.depth - a.depth);

  for (const pv of projectedVoxels) {
    const colIdx = Math.floor(pv.sx / colWidth);
    if (colIdx >= 0 && colIdx < zBuffer.length && pv.depth > zBuffer[colIdx]) {
      continue;
    }

    ctx.fillStyle = pv.color;
    ctx.fillRect(pv.sx - pv.size / 2, pv.sy - pv.size / 2, pv.size, pv.size);
  }
}

/**
 * Renders an interactive 3D weapon in First-Person perspective (MD2/MD3)
 * with weapon sway, bobbing, dynamic slash animations, and lighting
 */
export function renderFirstPersonWeapon3D(
  ctx: CanvasRenderingContext2D,
  weaponModelId: string,
  attackProgress: number = 0, // 0 = idle, 0..1 = attack swing
  walkCycle: number = 0,      // bobbing phase
  screenWidth: number = 640,
  screenHeight: number = 480,
  lightColor: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 }
) {
  const isShotgun = weaponModelId.includes("shotgun");
  const isPistol = weaponModelId.includes("pistol") || weaponModelId.includes("gun");
  const isChaingun = weaponModelId.includes("chaingun");

  // First-person firearm rendering (Doom style)
  if (isShotgun || isPistol || isChaingun) {
    const bobX = Math.cos(walkCycle) * 6;
    const bobY = Math.abs(Math.sin(walkCycle)) * 7;
    const centerX = screenWidth * 0.5 + bobX;
    let centerY = screenHeight * 0.82 + bobY;

    // Recoil
    let recoil = 0;
    if (attackProgress > 0) {
      recoil = Math.sin(attackProgress * Math.PI);
      centerY -= recoil * 22;
    }

    ctx.save();

    // Muzzle Flash
    if (attackProgress > 0 && attackProgress < 0.45) {
      const flashX = centerX;
      const flashY = centerY - (isShotgun ? 125 : 80);
      const flashGrad = ctx.createRadialGradient(flashX, flashY, 4, flashX, flashY, isShotgun ? 65 : 35);
      flashGrad.addColorStop(0, "#ffffff");
      flashGrad.addColorStop(0.3, "#fef08a");
      flashGrad.addColorStop(0.6, "#f97316");
      flashGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(flashX, flashY, isShotgun ? 65 : 35, 0, Math.PI * 2);
      ctx.fill();

      // Sparks
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      for (let i = 0; i < (isShotgun ? 6 : 3); i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        const len = 30 + Math.random() * 30;
        ctx.beginPath();
        ctx.moveTo(flashX, flashY);
        ctx.lineTo(flashX + Math.cos(ang) * len, flashY + Math.sin(ang) * len);
        ctx.stroke();
      }
    }

    if (isShotgun) {
      // Doom pump-action shotgun
      // Gloved hands
      ctx.fillStyle = "#854d0e"; // Brown leather glove left
      ctx.beginPath();
      ctx.ellipse(centerX - 42, centerY - 20, 22, 16, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#a16207"; // Brown leather glove right
      ctx.beginPath();
      ctx.ellipse(centerX + 38, centerY + 20, 20, 18, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Wooden stock & pump handle
      ctx.fillStyle = "#78350f";
      ctx.fillRect(centerX - 24, centerY - 38, 48, 45);
      ctx.fillStyle = "#451a03";
      ctx.fillRect(centerX - 22, centerY - 25, 44, 4);

      // Gun Receiver / Metal Body
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(centerX - 20, centerY - 80, 40, 50);
      ctx.fillStyle = "#334155";
      ctx.fillRect(centerX - 16, centerY - 78, 32, 46);

      // Twin Steel Barrels
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(centerX - 18, centerY - 130, 36, 52);
      // Barrel left
      ctx.fillStyle = "#475569";
      ctx.fillRect(centerX - 16, centerY - 130, 14, 52);
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.ellipse(centerX - 9, centerY - 130, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Barrel right
      ctx.fillStyle = "#64748b";
      ctx.fillRect(centerX + 2, centerY - 130, 14, 52);
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.ellipse(centerX + 9, centerY - 130, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bead sight
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(centerX, centerY - 128, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (isPistol) {
      // Doom 9mm Pistol
      // Glove
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 10, 26, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Grip
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(centerX - 12, centerY - 25, 24, 35);

      // Slide
      ctx.fillStyle = "#475569";
      ctx.fillRect(centerX - 14, centerY - 75, 28, 52);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(centerX - 11, centerY - 75, 22, 50);

      // Muzzle hole
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 75, 5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Front sight
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(centerX - 1.5, centerY - 78, 3, 4);
    }

    ctx.restore();
    return;
  }

  const model = BUILTIN_3D_MODELS.get(weaponModelId) || BUILTIN_3D_MODELS.get("sword3d");
  if (!model) return;

  const isSword = weaponModelId.includes("sword");
  const isStaff = weaponModelId.includes("staff");

  // Camera bobbing offset
  const bobX = Math.cos(walkCycle) * 7;
  const bobY = Math.abs(Math.sin(walkCycle)) * 9;

  // Center anchor for first-person hand
  let anchorX = screenWidth * 0.65 + bobX;
  let anchorY = screenHeight * 0.78 + bobY;

  // Slash offset & rotation
  let rotDeg = 25;
  let swingScale = 1.0;

  if (attackProgress > 0) {
    if (isSword) {
      // Sweeping arc slash across screen
      const arc = Math.sin(attackProgress * Math.PI);
      anchorX -= arc * 180;
      anchorY -= Math.sin(attackProgress * Math.PI * 1.5) * 55;
      rotDeg = 25 - arc * 95;
      swingScale = 1.0 + arc * 0.25;

      // Draw blade swing trail particle arc
      ctx.save();
      ctx.beginPath();
      ctx.arc(anchorX + 60, anchorY - 60, 110, -0.4 * Math.PI, 0.4 * Math.PI, false);
      ctx.strokeStyle = `rgba(226, 232, 240, ${arc * 0.6})`;
      ctx.lineWidth = 14 * arc;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    } else if (isStaff) {
      // Magic thrust forward
      const thrust = Math.sin(attackProgress * Math.PI);
      anchorY -= thrust * 60;
      anchorX -= thrust * 20;
      rotDeg = 15 - thrust * 30;

      // Mystic surge glow at top
      ctx.save();
      const glowGrad = ctx.createRadialGradient(anchorX - 30, anchorY - 140, 5, anchorX - 30, anchorY - 140, 45);
      glowGrad.addColorStop(0, "rgba(192, 132, 252, 0.9)");
      glowGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(anchorX - 30, anchorY - 140, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Draw 3D weapon triangles projected in screenspace
  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.rotate((rotDeg * Math.PI) / 180);
  ctx.scale(swingScale, swingScale);

  const frame = attackProgress > 0 && model.frames[1] ? model.frames[1] : model.frames[0];
  const verts = frame.vertices;

  // Project weapon 3D vertices to 2D local space
  const projWeaponVerts = verts.map((v) => {
    const scaleFactor = 280;
    return {
      sx: v.x * scaleFactor,
      sy: -v.z * scaleFactor,
      depth: v.y,
    };
  });

  // Sort triangles by depth
  const sorted = [...model.triangles].sort((a, b) => {
    const da = (projWeaponVerts[a.v[0]].depth + projWeaponVerts[a.v[1]].depth + projWeaponVerts[a.v[2]].depth) / 3;
    const db = (projWeaponVerts[b.v[0]].depth + projWeaponVerts[b.v[1]].depth + projWeaponVerts[b.v[2]].depth) / 3;
    return da - db;
  });

  for (const tri of sorted) {
    const p0 = projWeaponVerts[tri.v[0]];
    const p1 = projWeaponVerts[tri.v[1]];
    const p2 = projWeaponVerts[tri.v[2]];

    ctx.beginPath();
    ctx.moveTo(p0.sx, p0.sy);
    ctx.lineTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.closePath();

    ctx.fillStyle = tri.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.restore();
}

