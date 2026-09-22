import {
  DivDoomLinedef,
  DivDoomSector,
  DivMode8Entity,
  DivMode8Light,
  DivMode8PlacedModel,
  DivMode8PlacedVoxel,
} from "../types";

export interface Mode8LevelData {
  id: string;
  name: string;
  author?: string;
  description: string;
  theme: "doom" | "gothic" | "tech" | "lava" | "cyber";
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
  entities: DivMode8Entity[];
  placedModels: DivMode8PlacedModel[];
  placedVoxels: DivMode8PlacedVoxel[];
  lights: DivMode8Light[];
  updatedAt?: string;
}

// -----------------------------------------------------------------------------
// PRESET 1: E1M1 - Hangar Doom 2 Completo (Salón, Escaleras, Foso Tóxico y Vóxels)
// -----------------------------------------------------------------------------
export const PRESET_E1M1_HANGAR: Mode8LevelData = {
  id: "preset_e1m1",
  name: "E1M1: Hangar Doom 2 Completo",
  author: "ReDoomEd Studio",
  description: "Entrada del Hangar con suelo de hormigón, foso de residuo radiactivo, escalera de 4 peldaños y plataforma de control elevada.",
  theme: "doom",
  sectors: [
    { id: 0, floorHeight: 0, ceilHeight: 1.2, floorTexture: "FLOOR4_8", ceilTexture: "CEIL3_5", lightLevel: 190 },
    { id: 1, floorHeight: 0.2, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 195 },
    { id: 2, floorHeight: 0.4, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 200 },
    { id: 3, floorHeight: 0.6, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 205 },
    { id: 4, floorHeight: 0.8, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 210 },
    { id: 10, floorHeight: 1.0, ceilHeight: 1.8, floorTexture: "CRATOP2", ceilTexture: "TLITE6_5", lightLevel: 220 },
    { id: 20, floorHeight: -0.4, ceilHeight: 1.2, floorTexture: "NUKAGE", ceilTexture: "CEIL3_5", lightLevel: 240, special: 7 },
  ],
  linedefs: [
    // Main Hangar Perimeter (Sector 0)
    { id: "w1", x1: 2, y1: 2, x2: 12, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "w2", x1: 12, y1: 2, x2: 12, y2: 6, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    // Staircase Steps (Sectors 1..4)
    { id: "s1", x1: 12, y1: 6, x2: 12, y2: 8, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "s2", x1: 13, y1: 6, x2: 13, y2: 8, frontSectorId: 1, backSectorId: 2, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "s3", x1: 14, y1: 6, x2: 14, y2: 8, frontSectorId: 2, backSectorId: 3, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "s4", x1: 15, y1: 6, x2: 15, y2: 8, frontSectorId: 3, backSectorId: 4, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "s5", x1: 16, y1: 6, x2: 16, y2: 8, frontSectorId: 4, backSectorId: 10, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    // Stair flanks
    { id: "sw_top", x1: 12, y1: 6, x2: 16, y2: 6, frontSectorId: 0, isTwoSided: false, middleTexture: "BROWN144", blocking: true },
    { id: "sw_bot", x1: 12, y1: 8, x2: 16, y2: 8, frontSectorId: 0, isTwoSided: false, middleTexture: "BROWN144", blocking: true },
    // Elevated Deck Perimeter (Sector 10)
    { id: "d1", x1: 16, y1: 4, x2: 20, y2: 4, frontSectorId: 10, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "d2", x1: 20, y1: 4, x2: 20, y2: 10, frontSectorId: 10, isTwoSided: false, middleTexture: "COMP2", blocking: true },
    { id: "d3", x1: 20, y1: 10, x2: 16, y2: 10, frontSectorId: 10, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "d4", x1: 16, y1: 10, x2: 16, y2: 8, frontSectorId: 10, isTwoSided: false, middleTexture: "SHAWN2", blocking: true },
    { id: "d5", x1: 16, y1: 6, x2: 16, y2: 4, frontSectorId: 10, isTwoSided: false, middleTexture: "SHAWN2", blocking: true },
    // Hangar Lower Section
    { id: "w3", x1: 12, y1: 8, x2: 12, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "w4", x1: 12, y1: 14, x2: 2, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "BROWN144", blocking: true },
    // Nukage Trench Portal (Sector 20)
    { id: "np1", x1: 4, y1: 9, x2: 8, y2: 9, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "np2", x1: 8, y1: 9, x2: 8, y2: 13, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "np3", x1: 8, y1: 13, x2: 4, y2: 13, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "np4", x1: 4, y1: 13, x2: 4, y2: 9, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    // Left Hangar Wall
    { id: "w5", x1: 2, y1: 14, x2: 2, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "BRICK1", blocking: true },
  ],
  entities: [
    { id: "p1", type: "player", x: 3.5 * 64, y: 5.5 * 64, graph: 1, name: "Marine Inicio" },
    { id: "m1", type: "monster", x: 9.5 * 64, y: 4.5 * 64, graph: 27, name: "Imp Demoníaco" },
    { id: "w_shotgun", type: "treasure", x: 5.5 * 64, y: 4.5 * 64, graph: 29, name: "Escopeta" },
  ],
  placedModels: [
    { id: "mod_demon", modelId: "demon_brute", x: 18.0, y: 7.0, z: 1.0, yaw: 180, scale: 1.2, animation: "idle", name: "Demon Brute 3D" },
    { id: "mod_knight", modelId: "md2_knight", x: 7.5, y: 4.5, z: 0.0, yaw: 45, scale: 1.0, animation: "walk", name: "Knight MD2" },
  ],
  placedVoxels: [
    // Toxic Barrels near the nukage pit
    { id: "vox_b1", voxelId: "voxel_barrel", x: 4.5, y: 10.0, z: -0.4, yaw: 0, scale: 1.1 },
    { id: "vox_b2", voxelId: "voxel_barrel", x: 7.2, y: 12.0, z: -0.4, yaw: 35, scale: 1.1 },
    // Flanking Torches
    { id: "vox_t1", voxelId: "voxel_torch", x: 2.3, y: 3.5, z: 0.2, yaw: 90, scale: 1.0 },
    { id: "vox_t2", voxelId: "voxel_torch", x: 2.3, y: 12.5, z: 0.2, yaw: 90, scale: 1.0 },
    // Gothic Pillars framing the staircase
    { id: "vox_p1", voxelId: "voxel_pillar", x: 11.8, y: 5.5, z: 0.0, yaw: 0, scale: 1.15 },
    { id: "vox_p2", voxelId: "voxel_pillar", x: 11.8, y: 8.5, z: 0.0, yaw: 0, scale: 1.15 },
    // Sci-Fi Terminal & Supply Crate on the elevated deck
    { id: "vox_term", voxelId: "voxel_terminal", x: 19.2, y: 8.5, z: 1.0, yaw: 270, scale: 1.2 },
    { id: "vox_crate", voxelId: "voxel_crate", x: 19.0, y: 5.0, z: 1.0, yaw: 15, scale: 1.1 },
    // Key at top of staircase & Medikit in safe zone
    { id: "vox_key", voxelId: "voxel_key", x: 16.5, y: 7.0, z: 1.0, yaw: 0, scale: 1.2 },
    { id: "vox_med", voxelId: "voxel_medikit", x: 3.5, y: 2.5, z: 0.0, yaw: 0, scale: 1.0 },
  ],
  lights: [
    { id: "l1", x: 6.0, y: 6.0, z: 1.0, radius: 8.0, r: 255, g: 180, b: 60, flicker: true },
    { id: "l2", x: 18.0, y: 7.0, z: 1.6, radius: 7.0, r: 80, g: 180, b: 255, flicker: false },
    { id: "l_nukage", x: 6.0, y: 11.0, z: -0.2, radius: 5.0, r: 74, g: 222, b: 128, flicker: true },
  ],
};

// -----------------------------------------------------------------------------
// PRESET 2: Mazmorra Vóxel & Cripta Maldita (Altar, Columnas, Cráneos y Antorchas)
// -----------------------------------------------------------------------------
export const PRESET_GOTHIC_CRYPT: Mode8LevelData = {
  id: "preset_crypt",
  name: "Mazmorra Vóxel & Cripta Maldita",
  author: "ReDoomEd Studio",
  description: "Templo gótico con muros de piedra medieval, pórtico de gárgolas, altar ceremonial elevado con cráneos, columnas y cofres con reliquias.",
  theme: "gothic",
  sectors: [
    { id: 0, floorHeight: 0, ceilHeight: 1.5, floorTexture: "FLOOR4_8", ceilTexture: "CEIL3_5", lightLevel: 160 },
    { id: 1, floorHeight: 0.25, ceilHeight: 1.5, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 175 },
    { id: 2, floorHeight: 0.5, ceilHeight: 1.8, floorTexture: "FLAT10", ceilTexture: "CEIL3_5", lightLevel: 220 }, // Altar
    { id: 3, floorHeight: -0.2, ceilHeight: 1.3, floorTexture: "BLOOD1", ceilTexture: "CEIL3_5", lightLevel: 150, special: 7 }, // Estanque ceremonial
  ],
  linedefs: [
    // Outer Chamber Walls
    { id: "cw1", x1: 2, y1: 2, x2: 18, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "BRICK1", blocking: true },
    { id: "cw2", x1: 18, y1: 2, x2: 18, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "STONE2", blocking: true },
    { id: "cw3", x1: 18, y1: 14, x2: 2, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "BRICK1", blocking: true },
    { id: "cw4", x1: 2, y1: 14, x2: 2, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "MARBFAC", blocking: true },
    // Altar Steps & Platform (Sector 1 & 2)
    { id: "as1", x1: 12, y1: 6, x2: 12, y2: 10, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "as2", x1: 13, y1: 6, x2: 13, y2: 10, frontSectorId: 1, backSectorId: 2, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "aw_top", x1: 12, y1: 6, x2: 17, y2: 6, frontSectorId: 2, isTwoSided: false, middleTexture: "STONE2", blocking: true },
    { id: "aw_back", x1: 17, y1: 6, x2: 17, y2: 10, frontSectorId: 2, isTwoSided: false, middleTexture: "MARBFAC", blocking: true },
    { id: "aw_bot", x1: 17, y1: 10, x2: 12, y2: 10, frontSectorId: 2, isTwoSided: false, middleTexture: "STONE2", blocking: true },
    // Blood Pool (Sector 3)
    { id: "bp1", x1: 5, y1: 9, x2: 9, y2: 9, frontSectorId: 0, backSectorId: 3, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "bp2", x1: 9, y1: 9, x2: 9, y2: 12, frontSectorId: 0, backSectorId: 3, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "bp3", x1: 9, y1: 12, x2: 5, y2: 12, frontSectorId: 0, backSectorId: 3, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "bp4", x1: 5, y1: 12, x2: 5, y2: 9, frontSectorId: 0, backSectorId: 3, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
  ],
  entities: [
    { id: "p1", type: "player", x: 4.0 * 64, y: 5.5 * 64, graph: 1, name: "Invocador" },
    { id: "m1", type: "monster", x: 15.0 * 64, y: 8.0 * 64, graph: 27, name: "Guardián de la Cripta" },
    { id: "w1", type: "treasure", x: 6.0 * 64, y: 4.5 * 64, graph: 29, name: "Escopeta Bendecida" },
  ],
  placedModels: [
    { id: "mod_garg", modelId: "md2_gargoyle", x: 15.0, y: 8.0, z: 0.5, yaw: 180, scale: 1.1, animation: "fly", name: "Gárgola Alada" },
    { id: "mod_knight", modelId: "md2_knight", x: 8.0, y: 8.0, z: 0.0, yaw: 90, scale: 1.0, animation: "idle", name: "Centinela" },
  ],
  placedVoxels: [
    // Altar Artifacts
    { id: "v_skull", voxelId: "voxel_skull", x: 16.0, y: 8.0, z: 0.5, yaw: 180, scale: 1.3 },
    { id: "v_chest", voxelId: "voxel_chest", x: 16.0, y: 9.2, z: 0.5, yaw: 270, scale: 1.1 },
    { id: "v_potion1", voxelId: "voxel_potion", x: 16.0, y: 6.8, z: 0.5, yaw: 0, scale: 1.0 },
    // Colonnade Pillars
    { id: "v_pil1", voxelId: "voxel_pillar", x: 6.0, y: 4.0, z: 0.0, yaw: 0, scale: 1.2 },
    { id: "v_pil2", voxelId: "voxel_pillar", x: 10.0, y: 4.0, z: 0.0, yaw: 0, scale: 1.2 },
    { id: "v_pil3", voxelId: "voxel_pillar", x: 6.0, y: 12.0, z: 0.0, yaw: 0, scale: 1.2 },
    { id: "v_pil4", voxelId: "voxel_pillar", x: 10.0, y: 12.0, z: 0.0, yaw: 0, scale: 1.2 },
    // Sconce Torches
    { id: "v_t1", voxelId: "voxel_torch", x: 2.3, y: 4.0, z: 0.3, yaw: 90, scale: 1.0 },
    { id: "v_t2", voxelId: "voxel_torch", x: 2.3, y: 12.0, z: 0.3, yaw: 90, scale: 1.0 },
    { id: "v_t3", voxelId: "voxel_torch", x: 12.0, y: 5.8, z: 0.0, yaw: 0, scale: 1.1 },
    { id: "v_t4", voxelId: "voxel_torch", x: 12.0, y: 10.2, z: 0.0, yaw: 0, scale: 1.1 },
  ],
  lights: [
    { id: "l_altar", x: 15.0, y: 8.0, z: 1.2, radius: 9.0, r: 245, g: 158, b: 11, flicker: true },
    { id: "l_blood", x: 7.0, y: 10.5, z: 0.2, radius: 5.0, r: 185, g: 28, b: 28, flicker: true },
    { id: "l_hall", x: 5.0, y: 5.0, z: 0.8, radius: 7.0, r: 234, g: 88, b: 12, flicker: true },
  ],
};

// -----------------------------------------------------------------------------
// PRESET 3: Techbase UAC Sci-Fi (Terminales, Cajas, Botiquines y Luces Halógenas)
// -----------------------------------------------------------------------------
export const PRESET_TECHBASE_LAB: Mode8LevelData = {
  id: "preset_techbase",
  name: "Techbase UAC Sci-Fi",
  author: "ReDoomEd Studio",
  description: "Centro de cómputo y laboratorio UAC con pantallas de datos en tiempo real, consolas holográficas, almacén de cajas y módulos de auxilio médico.",
  theme: "tech",
  sectors: [
    { id: 0, floorHeight: 0, ceilHeight: 1.4, floorTexture: "CRATOP2", ceilTexture: "TLITE6_5", lightLevel: 220 },
    { id: 1, floorHeight: 0.3, ceilHeight: 1.6, floorTexture: "FLOOR4_8", ceilTexture: "TLITE6_5", lightLevel: 240 },
    { id: 2, floorHeight: -0.3, ceilHeight: 1.4, floorTexture: "NUKAGE", ceilTexture: "CEIL3_5", lightLevel: 255, special: 7 },
  ],
  linedefs: [
    // Main Lab Perimeter
    { id: "tw1", x1: 2, y1: 2, x2: 16, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "COMP2", blocking: true },
    { id: "tw2", x1: 16, y1: 2, x2: 16, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "SHAWN2", blocking: true },
    { id: "tw3", x1: 16, y1: 14, x2: 2, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "tw4", x1: 2, y1: 14, x2: 2, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "DOOR3", blocking: true },
    // Command Deck Step
    { id: "ts1", x1: 11, y1: 4, x2: 11, y2: 12, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    // Coolant Sink
    { id: "tp1", x1: 4, y1: 8, x2: 8, y2: 8, frontSectorId: 0, backSectorId: 2, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "tp2", x1: 8, y1: 8, x2: 8, y2: 12, frontSectorId: 0, backSectorId: 2, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "tp3", x1: 8, y1: 12, x2: 4, y2: 12, frontSectorId: 0, backSectorId: 2, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "tp4", x1: 4, y1: 12, x2: 4, y2: 8, frontSectorId: 0, backSectorId: 2, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
  ],
  entities: [
    { id: "p1", type: "player", x: 4.0 * 64, y: 4.5 * 64, graph: 1, name: "Operador UAC" },
    { id: "m1", type: "monster", x: 13.5 * 64, y: 8.0 * 64, graph: 27, name: "Entidad Ciber" },
  ],
  placedModels: [
    { id: "mod_robot", modelId: "md2_knight", x: 13.5, y: 8.0, z: 0.3, yaw: 180, scale: 1.1, animation: "idle", name: "Androide UAC" },
  ],
  placedVoxels: [
    // Terminales de Computación
    { id: "v_term1", voxelId: "voxel_terminal", x: 14.5, y: 5.5, z: 0.3, yaw: 270, scale: 1.2 },
    { id: "v_term2", voxelId: "voxel_terminal", x: 14.5, y: 10.5, z: 0.3, yaw: 270, scale: 1.2 },
    // Cajas de Suministros
    { id: "v_crate1", voxelId: "voxel_crate", x: 3.5, y: 3.5, z: 0.0, yaw: 0, scale: 1.1 },
    { id: "v_crate2", voxelId: "voxel_crate", x: 4.8, y: 3.5, z: 0.0, yaw: 20, scale: 1.1 },
    // Botiquines
    { id: "v_med1", voxelId: "voxel_medikit", x: 14.5, y: 8.0, z: 0.3, yaw: 0, scale: 1.1 },
    { id: "v_med2", voxelId: "voxel_medikit", x: 3.2, y: 6.0, z: 0.0, yaw: 90, scale: 1.0 },
    // Barriles
    { id: "v_bar1", voxelId: "voxel_barrel", x: 5.0, y: 9.5, z: -0.3, yaw: 0, scale: 1.0 },
    { id: "v_bar2", voxelId: "voxel_barrel", x: 7.0, y: 10.5, z: -0.3, yaw: 45, scale: 1.0 },
    // Llave de Acceso Dorada
    { id: "v_key", voxelId: "voxel_key", x: 13.5, y: 4.5, z: 0.3, yaw: 0, scale: 1.2 },
  ],
  lights: [
    { id: "l_lab1", x: 8.0, y: 6.0, z: 1.2, radius: 9.0, r: 56, g: 189, b: 248, flicker: false },
    { id: "l_lab2", x: 13.5, y: 8.0, z: 1.4, radius: 8.0, r: 226, g: 232, b: 240, flicker: false },
  ],
};

// -----------------------------------------------------------------------------
// PRESET 4: Templo de Lava & Escaleras Colosales (Magma, 5 Peldaños y Vóxels)
// -----------------------------------------------------------------------------
export const PRESET_LAVA_TEMPLE: Mode8LevelData = {
  id: "preset_lava",
  name: "Templo de Lava & Escaleras Colosales",
  author: "ReDoomEd Studio",
  description: "Foso masivo de magma hirviente con pasarelas de roca volcánica, escalera helicoidal de 5 escalones y terraza superior de sacrificio.",
  theme: "lava",
  sectors: [
    { id: 0, floorHeight: 0, ceilHeight: 1.6, floorTexture: "RROCK01", ceilTexture: "CEIL3_5", lightLevel: 170 },
    { id: 1, floorHeight: 0.25, ceilHeight: 1.6, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 180 },
    { id: 2, floorHeight: 0.5, ceilHeight: 1.6, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 190 },
    { id: 3, floorHeight: 0.75, ceilHeight: 1.6, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 200 },
    { id: 4, floorHeight: 1.0, ceilHeight: 1.6, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 210 },
    { id: 10, floorHeight: 1.25, ceilHeight: 2.0, floorTexture: "FLAT10", ceilTexture: "CEIL3_5", lightLevel: 230 }, // Terraza
    { id: 20, floorHeight: -0.5, ceilHeight: 1.6, floorTexture: "LAVA", ceilTexture: "CEIL3_5", lightLevel: 255, special: 7 }, // Magma
  ],
  linedefs: [
    // Outer Cavern Walls
    { id: "lw1", x1: 2, y1: 2, x2: 18, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "BRICK1", blocking: true },
    { id: "lw2", x1: 18, y1: 2, x2: 18, y2: 16, frontSectorId: 0, isTwoSided: false, middleTexture: "STONE2", blocking: true },
    { id: "lw3", x1: 18, y1: 16, x2: 2, y2: 16, frontSectorId: 0, isTwoSided: false, middleTexture: "BRICK1", blocking: true },
    { id: "lw4", x1: 2, y1: 16, x2: 2, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "MARBFAC", blocking: true },
    // Escalera de 5 escalones hacia la terraza
    { id: "ls1", x1: 11, y1: 6, x2: 11, y2: 10, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "ls2", x1: 12, y1: 6, x2: 12, y2: 10, frontSectorId: 1, backSectorId: 2, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "ls3", x1: 13, y1: 6, x2: 13, y2: 10, frontSectorId: 2, backSectorId: 3, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "ls4", x1: 14, y1: 6, x2: 14, y2: 10, frontSectorId: 3, backSectorId: 4, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "ls5", x1: 15, y1: 6, x2: 15, y2: 10, frontSectorId: 4, backSectorId: 10, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    // Terraza Linedefs
    { id: "lt_top", x1: 15, y1: 6, x2: 17, y2: 6, frontSectorId: 10, isTwoSided: false, middleTexture: "STONE2", blocking: true },
    { id: "lt_back", x1: 17, y1: 6, x2: 17, y2: 10, frontSectorId: 10, isTwoSided: false, middleTexture: "MARBFAC", blocking: true },
    { id: "lt_bot", x1: 17, y1: 10, x2: 15, y2: 10, frontSectorId: 10, isTwoSided: false, middleTexture: "STONE2", blocking: true },
    // Gran Foso de Lava Subterránea
    { id: "lp1", x1: 4, y1: 5, x2: 9, y2: 5, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "lp2", x1: 9, y1: 5, x2: 9, y2: 13, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "lp3", x1: 9, y1: 13, x2: 4, y2: 13, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "lp4", x1: 4, y1: 13, x2: 4, y2: 5, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
  ],
  entities: [
    { id: "p1", type: "player", x: 3.5 * 64, y: 3.5 * 64, graph: 1, name: "Guerrero Igneo" },
  ],
  placedModels: [
    { id: "mod_titan", modelId: "demon_brute", x: 16.0, y: 8.0, z: 1.25, yaw: 180, scale: 1.3, animation: "attack", name: "Titán de Lava" },
  ],
  placedVoxels: [
    // Antorchas que bordean la lava
    { id: "v_lt1", voxelId: "voxel_torch", x: 3.8, y: 4.8, z: 0.0, yaw: 0, scale: 1.1 },
    { id: "v_lt2", voxelId: "voxel_torch", x: 9.2, y: 4.8, z: 0.0, yaw: 0, scale: 1.1 },
    { id: "v_lt3", voxelId: "voxel_torch", x: 3.8, y: 13.2, z: 0.0, yaw: 0, scale: 1.1 },
    { id: "v_lt4", voxelId: "voxel_torch", x: 9.2, y: 13.2, z: 0.0, yaw: 0, scale: 1.1 },
    // Columnas monumentales
    { id: "v_col1", voxelId: "voxel_pillar", x: 10.8, y: 5.0, z: 0.0, yaw: 0, scale: 1.3 },
    { id: "v_col2", voxelId: "voxel_pillar", x: 10.8, y: 11.0, z: 0.0, yaw: 0, scale: 1.3 },
    // Reliquias en la terraza
    { id: "v_chest", voxelId: "voxel_chest", x: 16.2, y: 9.0, z: 1.25, yaw: 270, scale: 1.1 },
    { id: "v_skull", voxelId: "voxel_skull", x: 16.2, y: 7.0, z: 1.25, yaw: 90, scale: 1.2 },
  ],
  lights: [
    { id: "l_lava", x: 6.5, y: 9.0, z: 0.0, radius: 10.0, r: 249, g: 115, b: 22, flicker: true },
    { id: "l_altar", x: 16.0, y: 8.0, z: 1.8, radius: 8.0, r: 239, g: 68, b: 68, flicker: true },
  ],
};

// Catalogo completo de niveles predefinidos
export const BUILTIN_LEVEL_PRESETS: Mode8LevelData[] = [
  PRESET_E1M1_HANGAR,
  PRESET_GOTHIC_CRYPT,
  PRESET_TECHBASE_LAB,
  PRESET_LAVA_TEMPLE,
];

// LocalStorage key for user saved levels
export const STORAGE_KEY_USER_LEVELS = "div_redoomed_user_levels_v1";

export function loadSavedUserLevels(): Mode8LevelData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_LEVELS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error loading user levels from localStorage", err);
    return [];
  }
}

export function saveUserLevel(level: Mode8LevelData): void {
  try {
    const existing = loadSavedUserLevels();
    const filtered = existing.filter((l) => l.id !== level.id);
    const updated = [{ ...level, updatedAt: new Date().toISOString() }, ...filtered];
    localStorage.setItem(STORAGE_KEY_USER_LEVELS, JSON.stringify(updated));
  } catch (err) {
    console.error("Error saving user level to localStorage", err);
  }
}

export function deleteSavedUserLevel(levelId: string): void {
  try {
    const existing = loadSavedUserLevels();
    const updated = existing.filter((l) => l.id !== levelId);
    localStorage.setItem(STORAGE_KEY_USER_LEVELS, JSON.stringify(updated));
  } catch (err) {
    console.error("Error deleting user level", err);
  }
}
