import {
  DivDoomLinedef,
  DivDoomSector,
  DivMode8Entity,
  DivMode8Light,
  DivMode8PlacedModel,
  DivMode8PlacedVoxel,
  Mode8CameraMode,
} from "../types";
import { saveMode8UserLevelsToIndexedDB } from "./indexedDbPersistence";

export interface Mode8LevelData {
  id: string;
  name: string;
  author?: string;
  description: string;
  theme?: "doom" | "gothic" | "tech" | "lava" | "cyber" | "roblox" | string;
  engineMode?: string;
  recommendedCamera?: Mode8CameraMode;
  recommendedSky?: string;
  recommendedWeapon?: "shotgun" | "pistol" | "sword3d" | "staff3d";
  recommendedTheme?: "winebox_clean" | "doom_dark" | "cyber_neon" | "medieval_gold";
  recommendedGameMode?: "shooter" | "exploration" | "survival";
  recommendedPlayerModel?: string;
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
  entities: DivMode8Entity[];
  placedModels: DivMode8PlacedModel[];
  placedVoxels: DivMode8PlacedVoxel[];
  lights: DivMode8Light[];
  updatedAt?: string;
}

function makeOuterRoomLines(
  prefix: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sectorId: number,
  texNorth: string,
  texEast: string = texNorth,
  texSouth: string = texNorth,
  texWest: string = texEast
): DivDoomLinedef[] {
  return [
    { id: `${prefix}_n`, x1, y1, x2, y2: y1, frontSectorId: sectorId, isTwoSided: false, middleTexture: texNorth, blocking: true },
    { id: `${prefix}_e`, x1: x2, y1, x2, y2, frontSectorId: sectorId, isTwoSided: false, middleTexture: texEast, blocking: true },
    { id: `${prefix}_s`, x1: x2, y1: y2, x2: x1, y2, frontSectorId: sectorId, isTwoSided: false, middleTexture: texSouth, blocking: true },
    { id: `${prefix}_w`, x1, y1: y2, x2: x1, y2: y1, frontSectorId: sectorId, isTwoSided: false, middleTexture: texWest, blocking: true },
  ];
}

function makeNestedPlatformLines(
  prefix: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  outerSectorId: number,
  innerSectorId: number,
  lowerTexture: string
): DivDoomLinedef[] {
  return [
    { id: `${prefix}_n`, x1, y1, x2, y2: y1, frontSectorId: outerSectorId, backSectorId: innerSectorId, isTwoSided: true, lowerTexture, blocking: false },
    { id: `${prefix}_e`, x1: x2, y1, x2, y2, frontSectorId: outerSectorId, backSectorId: innerSectorId, isTwoSided: true, lowerTexture, blocking: false },
    { id: `${prefix}_s`, x1: x2, y1: y2, x2: x1, y2, frontSectorId: outerSectorId, backSectorId: innerSectorId, isTwoSided: true, lowerTexture, blocking: false },
    { id: `${prefix}_w`, x1, y1: y2, x2: x1, y2: y1, frontSectorId: outerSectorId, backSectorId: innerSectorId, isTwoSided: true, lowerTexture, blocking: false },
  ];
}

// -----------------------------------------------------------------------------
// PRESET 1 (FLAGSHIP): Roblox Obby Tower 3D
// -----------------------------------------------------------------------------
export const PRESET_ROBLOX_OBBY: Mode8LevelData = {
  id: "preset_roblox_obby",
  name: "Roblox Obby Tower 3D",
  author: "WXDIV Studio",
  description:
    "Circuito Obby estilo Roblox Studs bajo cielo soleado: plataformas ascendentes sin superposiciones, piscina de neón, monedas, checkpoints, enemigos IA activos y estrella final.",
  theme: "roblox",
  recommendedCamera: "third_person",
  recommendedSky: "SKY_ROBLOX",
  recommendedWeapon: "sword3d",
  recommendedTheme: "winebox_clean",
  recommendedGameMode: "exploration",
  recommendedPlayerModel: "blox_hero",
  sectors: [
    { id: 0, floorHeight: 0.0, ceilHeight: 7.5, floorTexture: "STUD_FLOOR_BLUE", ceilTexture: "SKY_ROBLOX", lightLevel: 245 },
    { id: 1, floorHeight: 0.35, ceilHeight: 7.5, floorTexture: "STUD_FLOOR_GREEN", ceilTexture: "SKY_ROBLOX", lightLevel: 250 },
    { id: 2, floorHeight: 0.70, ceilHeight: 7.5, floorTexture: "STUD_FLOOR_GOLD", ceilTexture: "SKY_ROBLOX", lightLevel: 250 },
    { id: 3, floorHeight: 1.05, ceilHeight: 7.5, floorTexture: "STUD_FLOOR_RED", ceilTexture: "SKY_ROBLOX", lightLevel: 255 },
    { id: 4, floorHeight: 1.35, ceilHeight: 7.5, floorTexture: "MARBLE_GOLD", ceilTexture: "SKY_ROBLOX", lightLevel: 255 },
    { id: 5, floorHeight: -0.25, ceilHeight: 7.5, floorTexture: "WATER", ceilTexture: "SKY_ROBLOX", lightLevel: 235 },
  ],
  linedefs: [
    ...makeOuterRoomLines("ob_out", 2, 2, 28, 16, 0, "STUD_WALL_BLUE", "STUD_WALL_GREEN", "STUD_WALL_BLUE", "STUD_WALL_GOLD"),
    ...makeNestedPlatformLines("ob_p1", 7, 5, 11, 13, 0, 1, "STUD_GREEN"),
    ...makeNestedPlatformLines("ob_p2", 12.5, 4, 16.5, 12, 0, 2, "STUD_GOLD"),
    ...makeNestedPlatformLines("ob_p3", 18, 5, 22, 13, 0, 3, "STUD_RED"),
    ...makeNestedPlatformLines("ob_p4", 23.5, 6, 26.8, 12, 0, 4, "MARBLE_GOLD"),
    ...makeNestedPlatformLines("ob_pool", 3, 11.5, 6, 14.5, 0, 5, "NEON_GRID"),
  ],
  entities: [
    { id: "p1", type: "player", x: 4.5 * 64, y: 7.5 * 64, graph: 1, name: "Blox Runner" },
  ],
  placedModels: [
    { id: "ob_imp1", modelId: "doom_imp", x: 14.5, y: 13.8, z: 0.0, yaw: 180, scale: 0.95, animation: "walk", role: "enemy", hp: 60, maxHp: 60, speed: 1.75, damage: 8, patrolRadius: 2.2, name: "Imp Guardián" },
    { id: "ob_knight", modelId: "blox_knight", x: 20.0, y: 9.0, z: 1.05, scale: 1.0, yaw: 180, animation: "walk", role: "enemy", hp: 85, maxHp: 85, speed: 1.6, damage: 12, patrolRadius: 1.8, name: "Caballero Obby" },
    { id: "ob_goal", modelId: "trophy_star", x: 25.2, y: 9.0, z: 1.35, yaw: 0, scale: 1.05, animation: "spin", role: "goal", name: "Estrella Obby" },
  ],
  placedVoxels: [
    { id: "ov_c1", voxelId: "voxel_coin", x: 9.0, y: 7.0, z: 0.35, yaw: 0, scale: 1.0 },
    { id: "ov_c2", voxelId: "voxel_coin", x: 9.0, y: 11.0, z: 0.35, yaw: 45, scale: 1.0 },
    { id: "ov_chk1", voxelId: "voxel_checkpoint", x: 14.5, y: 8.0, z: 0.70, yaw: 0, scale: 1.0 },
    { id: "ov_c3", voxelId: "voxel_coin", x: 20.0, y: 6.8, z: 1.05, yaw: 90, scale: 1.0 },
    { id: "ov_med", voxelId: "voxel_medikit", x: 14.5, y: 5.5, z: 0.70, yaw: 0, scale: 1.0 },
    { id: "ov_ch", voxelId: "voxel_chest", x: 25.2, y: 7.0, z: 1.35, yaw: 270, scale: 1.0 },
  ],
  lights: [
    { id: "l_ob1", x: 9.0, y: 9.0, z: 3.5, radius: 14.0, r: 255, g: 250, b: 235, flicker: false },
    { id: "l_ob2", x: 22.0, y: 9.0, z: 3.5, radius: 14.0, r: 255, g: 235, b: 170, flicker: false },
  ],
};

// -----------------------------------------------------------------------------
// PRESET 2: Roblox Martial Dojo 3D
// -----------------------------------------------------------------------------
export const PRESET_ROBLOX_DOJO: Mode8LevelData = {
  id: "preset_roblox_dojo",
  name: "Roblox Dojo de Pelea 3D",
  author: "WXDIV Studio",
  description:
    "Arena Dojo estilo Roblox con suelo de madera y tatami dorado en dos niveles, pilares espaciados, botiquín y duelistas Samurái IA que patrullan y combaten.",
  theme: "roblox",
  recommendedCamera: "third_person",
  recommendedSky: "SKY_ROBLOX",
  recommendedWeapon: "sword3d",
  recommendedTheme: "medieval_gold",
  recommendedGameMode: "shooter",
  recommendedPlayerModel: "blox_hero",
  sectors: [
    { id: 0, floorHeight: 0.0, ceilHeight: 6.5, floorTexture: "DOJO_WOOD", ceilTexture: "SKY_ROBLOX", lightLevel: 240 },
    { id: 1, floorHeight: 0.30, ceilHeight: 6.5, floorTexture: "DOJO_TATAMI", ceilTexture: "SKY_ROBLOX", lightLevel: 250 },
    { id: 2, floorHeight: 0.60, ceilHeight: 6.5, floorTexture: "MARBLE_GOLD", ceilTexture: "SKY_ROBLOX", lightLevel: 255 },
  ],
  linedefs: [
    ...makeOuterRoomLines("dj_out", 2, 2, 24, 18, 0, "DOJO_WALL", "DOJO_WOOD", "DOJO_WALL", "DOJO_WOOD"),
    ...makeNestedPlatformLines("dj_t1", 7, 5, 19, 15, 0, 1, "STUD_RED"),
    ...makeNestedPlatformLines("dj_t2", 10.5, 7.5, 15.5, 12.5, 1, 2, "STUD_GOLD"),
  ],
  entities: [
    { id: "p1", type: "player", x: 4.5 * 64, y: 10.0 * 64, graph: 1, name: "Aprendiz Blox" },
  ],
  placedModels: [
    { id: "dj_samurai", modelId: "samurai_fighter", x: 13.0, y: 10.0, z: 0.60, yaw: 180, scale: 1.0, animation: "walk", role: "enemy", hp: 100, maxHp: 100, speed: 1.95, damage: 14, patrolRadius: 2.0, name: "Maestro Samurái" },
    { id: "dj_knight", modelId: "blox_knight", x: 8.8, y: 6.8, z: 0.30, yaw: 180, scale: 1.0, animation: "walk", role: "enemy", hp: 75, maxHp: 75, speed: 1.75, damage: 10, patrolRadius: 1.8, name: "Guardián Dojo" },
    { id: "dj_trophy", modelId: "trophy_star", x: 21.5, y: 10.0, z: 0.0, yaw: 0, scale: 1.05, animation: "spin", role: "goal", name: "Copa Dojo" },
  ],
  placedVoxels: [
    { id: "dv_p1", voxelId: "voxel_torch", x: 5.0, y: 4.5, z: 0.0, yaw: 0, scale: 1.0 },
    { id: "dv_p2", voxelId: "voxel_torch", x: 5.0, y: 15.5, z: 0.0, yaw: 0, scale: 1.0 },
    { id: "dv_p3", voxelId: "voxel_torch", x: 21.0, y: 4.5, z: 0.0, yaw: 0, scale: 1.0 },
    { id: "dv_p4", voxelId: "voxel_torch", x: 21.0, y: 15.5, z: 0.0, yaw: 0, scale: 1.0 },
    { id: "dv_med", voxelId: "voxel_medikit", x: 13.0, y: 16.5, z: 0.0, yaw: 0, scale: 1.0 },
    { id: "dv_c1", voxelId: "voxel_coin", x: 8.8, y: 13.2, z: 0.30, yaw: 0, scale: 1.0 },
    { id: "dv_c2", voxelId: "voxel_coin", x: 17.2, y: 10.0, z: 0.30, yaw: 0, scale: 1.0 },
  ],
  lights: [
    { id: "l_dj1", x: 13.0, y: 10.0, z: 3.2, radius: 14.0, r: 255, g: 225, b: 175, flicker: false },
  ],
};

// -----------------------------------------------------------------------------
// PRESET 3: Roblox Cyber Base 3D
// -----------------------------------------------------------------------------
export const PRESET_ROBLOX_CYBER_TYCOON: Mode8LevelData = {
  id: "preset_roblox_cyber_tycoon",
  name: "Roblox Cyber Base 3D",
  author: "WXDIV Studio",
  description:
    "Base futurista estilo Roblox Cyber Neón con cubierta de reactor en dos niveles, terminales digitales, cristales de energía y Cyber Mechs patrullando.",
  theme: "cyber",
  recommendedCamera: "third_person",
  recommendedSky: "SKY_CYBER",
  recommendedWeapon: "pistol",
  recommendedTheme: "cyber_neon",
  recommendedGameMode: "shooter",
  recommendedPlayerModel: "blox_hero",
  sectors: [
    { id: 0, floorHeight: 0.0, ceilHeight: 6.5, floorTexture: "NEON_GRID", ceilTexture: "SKY_CYBER", lightLevel: 230 },
    { id: 1, floorHeight: 0.35, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_BLUE", ceilTexture: "SKY_CYBER", lightLevel: 245 },
    { id: 2, floorHeight: 0.75, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_GOLD", ceilTexture: "SKY_CYBER", lightLevel: 255 },
    { id: 3, floorHeight: 0.30, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_GREEN", ceilTexture: "SKY_CYBER", lightLevel: 240 },
  ],
  linedefs: [
    ...makeOuterRoomLines("cb_out", 2, 2, 26, 18, 0, "METAL1", "CYBER_GLASS", "METAL1", "NEON_GRID"),
    ...makeNestedPlatformLines("cb_p1", 14, 5, 23, 13, 0, 1, "CYBER_GLASS"),
    ...makeNestedPlatformLines("cb_p2", 16.5, 7, 20.5, 11, 1, 2, "STUD_GOLD"),
    ...makeNestedPlatformLines("cb_p3", 6, 3.5, 11, 8, 0, 3, "STUD_GREEN"),
  ],
  entities: [
    { id: "p1", type: "player", x: 4.5 * 64, y: 12.0 * 64, graph: 1, name: "Agente Cyber" },
  ],
  placedModels: [
    { id: "cb_mech1", modelId: "cyber_mech", x: 12.0, y: 11.5, z: 0.0, yaw: 180, scale: 1.0, animation: "walk", role: "enemy", hp: 115, maxHp: 115, speed: 1.65, damage: 15, patrolRadius: 2.2, name: "Cyber Mech" },
    { id: "cb_drone", modelId: "md2_gargoyle", x: 16.0, y: 15.0, z: 0.0, yaw: 180, scale: 0.95, animation: "walk", role: "enemy", hp: 75, maxHp: 75, speed: 2.0, damage: 10, patrolRadius: 2.4, name: "Dron Neón" },
    { id: "cb_goal", modelId: "portal_crystal", x: 18.5, y: 9.0, z: 0.75, yaw: 0, scale: 1.05, animation: "spin", role: "goal", name: "Núcleo Cyber" },
  ],
  placedVoxels: [
    { id: "cv_t1", voxelId: "voxel_computer", x: 7.5, y: 5.0, z: 0.30, yaw: 180, scale: 1.0 },
    { id: "cv_t2", voxelId: "voxel_computer", x: 9.5, y: 5.0, z: 0.30, yaw: 180, scale: 1.0 },
    { id: "cv_c1", voxelId: "voxel_coin", x: 15.2, y: 9.0, z: 0.35, yaw: 0, scale: 1.0 },
    { id: "cv_c2", voxelId: "voxel_coin", x: 21.8, y: 9.0, z: 0.35, yaw: 90, scale: 1.0 },
    { id: "cv_med", voxelId: "voxel_medikit", x: 8.5, y: 14.5, z: 0.0, yaw: 0, scale: 1.0 },
  ],
  lights: [
    { id: "l_cb1", x: 18.5, y: 9.0, z: 3.0, radius: 14.0, r: 56, g: 189, b: 248, flicker: false },
    { id: "l_cb2", x: 8.5, y: 5.8, z: 2.5, radius: 10.0, r: 34, g: 197, b: 94, flicker: false },
  ],
};

// -----------------------------------------------------------------------------
// PRESET 4: Roblox Sky Citadel 3D
// -----------------------------------------------------------------------------
export const PRESET_ROBLOX_SKY_CITADEL: Mode8LevelData = {
  id: "preset_roblox_sky_citadel",
  name: "Roblox Sky Citadel 3D",
  author: "WXDIV Studio",
  description:
    "Ciudadela celestial de mármol y oro estilo Roblox con terrazas escalonadas, cofres del tesoro, guardias Redcliff, jefe Titán y estrella celestial.",
  theme: "roblox",
  recommendedCamera: "third_person",
  recommendedSky: "SKY_ROBLOX",
  recommendedWeapon: "sword3d",
  recommendedTheme: "medieval_gold",
  recommendedGameMode: "shooter",
  recommendedPlayerModel: "blox_hero",
  sectors: [
    { id: 0, floorHeight: 0.0, ceilHeight: 7.5, floorTexture: "MARBLE_GOLD", ceilTexture: "SKY_ROBLOX", lightLevel: 245 },
    { id: 1, floorHeight: 0.35, ceilHeight: 7.5, floorTexture: "STUD_FLOOR_BLUE", ceilTexture: "SKY_ROBLOX", lightLevel: 250 },
    { id: 2, floorHeight: 0.70, ceilHeight: 7.5, floorTexture: "STUD_FLOOR_GOLD", ceilTexture: "SKY_ROBLOX", lightLevel: 255 },
  ],
  linedefs: [
    ...makeOuterRoomLines("sc_out", 2, 2, 26, 18, 0, "STUD_GRAY", "MARBLE_GOLD", "STUD_GRAY", "MARBLE_GOLD"),
    ...makeNestedPlatformLines("sc_t1", 8, 4, 22, 16, 0, 1, "MARBLE_GOLD"),
    ...makeNestedPlatformLines("sc_t2", 13, 6, 20, 14, 1, 2, "STUD_GOLD"),
  ],
  entities: [
    { id: "p1", type: "player", x: 4.8 * 64, y: 10.0 * 64, graph: 1, name: "Héroe Celestial" },
  ],
  placedModels: [
    { id: "sc_guard", modelId: "blox_knight", x: 10.5, y: 10.0, z: 0.35, yaw: 180, scale: 1.0, animation: "walk", role: "enemy", hp: 85, maxHp: 85, speed: 1.7, damage: 11, patrolRadius: 2.0, name: "Escolta Real" },
    { id: "sc_boss", modelId: "demon_brute", x: 16.0, y: 10.0, z: 0.70, yaw: 180, scale: 1.05, animation: "walk", role: "enemy", hp: 140, maxHp: 140, speed: 1.5, damage: 16, patrolRadius: 1.8, name: "Titán Dorado" },
    { id: "sc_star", modelId: "trophy_star", x: 18.5, y: 10.0, z: 0.70, yaw: 0, scale: 1.05, animation: "spin", role: "goal", name: "Estrella Celestial" },
  ],
  placedVoxels: [
    { id: "sv_c1", voxelId: "voxel_coin", x: 6.5, y: 10.0, z: 0.0, yaw: 0, scale: 1.0 },
    { id: "sv_c2", voxelId: "voxel_coin", x: 11.5, y: 6.0, z: 0.35, yaw: 45, scale: 1.0 },
    { id: "sv_c3", voxelId: "voxel_coin", x: 11.5, y: 14.0, z: 0.35, yaw: 90, scale: 1.0 },
    { id: "sv_ch1", voxelId: "voxel_chest", x: 17.5, y: 7.5, z: 0.70, yaw: 270, scale: 1.0 },
    { id: "sv_med", voxelId: "voxel_medikit", x: 9.5, y: 14.5, z: 0.35, yaw: 0, scale: 1.0 },
  ],
  lights: [
    { id: "l_sc1", x: 14.0, y: 10.0, z: 3.5, radius: 16.0, r: 255, g: 245, b: 200, flicker: false },
  ],
};

// -----------------------------------------------------------------------------
// PRESET 5: Base Espacial Blox E1M1 (Escalera Roblox 4 Peldaños)
// -----------------------------------------------------------------------------
export const PRESET_E1M1_HANGAR: Mode8LevelData = {
  id: "preset_e1m1",
  name: "Base Espacial Blox E1M1 (Roblox)",
  author: "WXDIV Studio",
  description:
    "Patio modular estilo Roblox con cielo soleado, escalera de 4 peldaños hacia cubierta dorada de mando, foso de energía y enemigos activos.",
  theme: "roblox",
  recommendedCamera: "third_person",
  recommendedSky: "SKY_ROBLOX",
  recommendedWeapon: "shotgun",
  recommendedTheme: "cyber_neon",
  recommendedGameMode: "shooter",
  recommendedPlayerModel: "blox_hero",
  sectors: [
    { id: 0, floorHeight: 0.0, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_BLUE", ceilTexture: "SKY_ROBLOX", lightLevel: 240 },
    { id: 1, floorHeight: 0.20, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_GREEN", ceilTexture: "SKY_ROBLOX", lightLevel: 245 },
    { id: 2, floorHeight: 0.40, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_GREEN", ceilTexture: "SKY_ROBLOX", lightLevel: 245 },
    { id: 3, floorHeight: 0.60, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_GREEN", ceilTexture: "SKY_ROBLOX", lightLevel: 250 },
    { id: 4, floorHeight: 0.80, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_GREEN", ceilTexture: "SKY_ROBLOX", lightLevel: 250 },
    { id: 10, floorHeight: 1.0, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_GOLD", ceilTexture: "SKY_ROBLOX", lightLevel: 255 },
    { id: 20, floorHeight: -0.25, ceilHeight: 6.5, floorTexture: "NUKAGE", ceilTexture: "SKY_ROBLOX", lightLevel: 245, special: 7 },
  ],
  linedefs: [
    ...makeOuterRoomLines("e1_out", 2, 2, 24, 16, 0, "STUD_WALL_BLUE", "STUD_GRAY", "STUD_WALL_BLUE", "STUD_GRAY"),
    // Escalera continua de 4 peldaños (x: 10..14, y: 6..10) unida a cubierta x: 14..21, y: 4..12
    { id: "s1_w", x1: 10, y1: 6, x2: 10, y2: 10, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },
    { id: "s1_n", x1: 10, y1: 6, x2: 11, y2: 6, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },
    { id: "s1_s", x1: 11, y1: 10, x2: 10, y2: 10, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },

    { id: "s2_w", x1: 11, y1: 6, x2: 11, y2: 10, frontSectorId: 1, backSectorId: 2, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },
    { id: "s2_n", x1: 11, y1: 6, x2: 12, y2: 6, frontSectorId: 0, backSectorId: 2, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },
    { id: "s2_s", x1: 12, y1: 10, x2: 11, y2: 10, frontSectorId: 0, backSectorId: 2, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },

    { id: "s3_w", x1: 12, y1: 6, x2: 12, y2: 10, frontSectorId: 2, backSectorId: 3, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },
    { id: "s3_n", x1: 12, y1: 6, x2: 13, y2: 6, frontSectorId: 0, backSectorId: 3, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },
    { id: "s3_s", x1: 13, y1: 10, x2: 12, y2: 10, frontSectorId: 0, backSectorId: 3, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },

    { id: "s4_w", x1: 13, y1: 6, x2: 13, y2: 10, frontSectorId: 3, backSectorId: 4, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },
    { id: "s4_n", x1: 13, y1: 6, x2: 14, y2: 6, frontSectorId: 0, backSectorId: 4, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },
    { id: "s4_s", x1: 14, y1: 10, x2: 13, y2: 10, frontSectorId: 0, backSectorId: 4, isTwoSided: true, lowerTexture: "STUD_GREEN", blocking: false },

    { id: "dk_in", x1: 14, y1: 6, x2: 14, y2: 10, frontSectorId: 4, backSectorId: 10, isTwoSided: true, lowerTexture: "STUD_GOLD", blocking: false },
    { id: "dk_wn", x1: 14, y1: 4, x2: 14, y2: 6, frontSectorId: 0, backSectorId: 10, isTwoSided: true, lowerTexture: "STUD_GOLD", blocking: false },
    { id: "dk_n", x1: 14, y1: 4, x2: 21, y2: 4, frontSectorId: 0, backSectorId: 10, isTwoSided: true, lowerTexture: "STUD_GOLD", blocking: false },
    { id: "dk_e", x1: 21, y1: 4, x2: 21, y2: 12, frontSectorId: 0, backSectorId: 10, isTwoSided: true, lowerTexture: "STUD_GOLD", blocking: false },
    { id: "dk_s", x1: 21, y1: 12, x2: 14, y2: 12, frontSectorId: 0, backSectorId: 10, isTwoSided: true, lowerTexture: "STUD_GOLD", blocking: false },
    { id: "dk_ws", x1: 14, y1: 10, x2: 14, y2: 12, frontSectorId: 0, backSectorId: 10, isTwoSided: true, lowerTexture: "STUD_GOLD", blocking: false },

    ...makeNestedPlatformLines("e1_pool", 4, 11, 8, 14, 0, 20, "NEON_GRID"),
  ],
  entities: [
    { id: "p1", type: "player", x: 4.5 * 64, y: 7.5 * 64, graph: 1, name: "Blox Marine" },
  ],
  placedModels: [
    { id: "m_imp1", modelId: "doom_imp", x: 8.2, y: 7.0, z: 0.0, yaw: 180, scale: 0.95, animation: "walk", role: "enemy", hp: 70, maxHp: 70, speed: 1.75, damage: 10, patrolRadius: 2.0, name: "Imp Blox" },
    { id: "m_mech", modelId: "cyber_mech", x: 17.5, y: 8.0, z: 1.0, yaw: 180, scale: 1.0, animation: "walk", role: "enemy", hp: 130, maxHp: 130, speed: 1.5, damage: 14, patrolRadius: 1.8, name: "Jefe Mech" },
    { id: "m_goal", modelId: "trophy_star", x: 19.6, y: 8.0, z: 1.0, yaw: 0, scale: 1.05, animation: "spin", role: "goal", name: "Estrella Base" },
  ],
  placedVoxels: [
    { id: "vx_coin1", voxelId: "voxel_coin", x: 11.5, y: 8.0, z: 0.4, yaw: 0, scale: 1.0 },
    { id: "vx_coin2", voxelId: "voxel_coin", x: 15.5, y: 5.5, z: 1.0, yaw: 0, scale: 1.0 },
    { id: "vx_term", voxelId: "voxel_computer", x: 19.6, y: 5.2, z: 1.0, yaw: 270, scale: 1.0 },
    { id: "vx_crate", voxelId: "voxel_crate", x: 3.5, y: 3.8, z: 0.0, yaw: 15, scale: 1.0 },
    { id: "vx_med", voxelId: "voxel_medikit", x: 15.5, y: 10.5, z: 1.0, yaw: 0, scale: 1.0 },
  ],
  lights: [
    { id: "l1", x: 8.0, y: 7.5, z: 2.5, radius: 13.0, r: 255, g: 245, b: 220, flicker: false },
    { id: "l2", x: 17.5, y: 8.0, z: 2.8, radius: 12.0, r: 250, g: 204, b: 21, flicker: false },
  ],
};

// -----------------------------------------------------------------------------
// PRESET 6: Fortaleza Blox Medieval 3D
// -----------------------------------------------------------------------------
export const PRESET_GOTHIC_CRYPT: Mode8LevelData = {
  id: "preset_gothic_crypt",
  name: "Fortaleza Blox Medieval 3D",
  author: "WXDIV Studio",
  description:
    "Patio medieval estilo Roblox Castle con altar elevado de piedra y oro, antorchas, caballeros Redcliff, gárgola guardiana y Cáliz Reliquia.",
  theme: "roblox",
  recommendedCamera: "third_person",
  recommendedSky: "SKY2",
  recommendedWeapon: "sword3d",
  recommendedTheme: "medieval_gold",
  recommendedGameMode: "shooter",
  recommendedPlayerModel: "blox_hero",
  sectors: [
    { id: 0, floorHeight: 0.0, ceilHeight: 6.5, floorTexture: "STUD_GRAY", ceilTexture: "SKY2", lightLevel: 230 },
    { id: 1, floorHeight: 0.35, ceilHeight: 6.5, floorTexture: "MARBLE_GOLD", ceilTexture: "SKY2", lightLevel: 245 },
    { id: 2, floorHeight: 0.70, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_RED", ceilTexture: "SKY2", lightLevel: 255 },
  ],
  linedefs: [
    ...makeOuterRoomLines("gt_out", 2, 2, 24, 18, 0, "STONE2", "REDWALL", "STONE2", "REDWALL"),
    ...makeNestedPlatformLines("gt_p1", 11, 5, 20, 15, 0, 1, "STONE2"),
    ...makeNestedPlatformLines("gt_p2", 14, 7.5, 18.5, 12.5, 1, 2, "MARBLE_GOLD"),
  ],
  entities: [
    { id: "p1", type: "player", x: 4.5 * 64, y: 10.0 * 64, graph: 1, name: "Paladín Blox" },
  ],
  placedModels: [
    { id: "gt_k1", modelId: "blox_knight", x: 8.5, y: 7.5, z: 0.0, yaw: 180, scale: 1.0, animation: "walk", role: "enemy", hp: 90, maxHp: 90, speed: 1.7, damage: 11, patrolRadius: 2.0, name: "Caballero Oscuro" },
    { id: "gt_garg", modelId: "md2_gargoyle", x: 12.5, y: 12.5, z: 0.35, yaw: 180, scale: 1.0, animation: "walk", role: "enemy", hp: 95, maxHp: 95, speed: 1.85, damage: 13, patrolRadius: 1.8, name: "Gárgola Torre" },
    { id: "gt_goal", modelId: "relic_caliz", x: 16.5, y: 10.0, z: 0.70, yaw: 0, scale: 1.05, animation: "spin", role: "goal", name: "Cáliz Real" },
  ],
  placedVoxels: [
    { id: "gv_t1", voxelId: "voxel_torch", x: 4.0, y: 4.5, z: 0.0, yaw: 0, scale: 1.0 },
    { id: "gv_t2", voxelId: "voxel_torch", x: 4.0, y: 15.5, z: 0.0, yaw: 0, scale: 1.0 },
    { id: "gv_c1", voxelId: "voxel_coin", x: 12.5, y: 7.0, z: 0.35, yaw: 0, scale: 1.0 },
    { id: "gv_ch", voxelId: "voxel_chest", x: 16.5, y: 8.2, z: 0.70, yaw: 270, scale: 1.0 },
    { id: "gv_pot", voxelId: "voxel_potion", x: 8.5, y: 14.0, z: 0.0, yaw: 0, scale: 1.0 },
  ],
  lights: [
    { id: "l_gt1", x: 15.0, y: 10.0, z: 3.0, radius: 14.0, r: 255, g: 210, b: 140, flicker: true },
  ],
};

// -----------------------------------------------------------------------------
// PRESET 7: Laboratorio Cyber Blox 3D
// -----------------------------------------------------------------------------
export const PRESET_TECHBASE_LAB: Mode8LevelData = {
  id: "preset_techbase_lab",
  name: "Laboratorio Cyber Blox 3D",
  author: "WXDIV Studio",
  description:
    "Laboratorio tecnológico estilo Roblox Sci-Fi con cubiertas elevadas de cristal neón, consolas holográficas, Cyber Mechs activos y núcleo de energía.",
  theme: "cyber",
  recommendedCamera: "third_person",
  recommendedSky: "SKY_CYBER",
  recommendedWeapon: "shotgun",
  recommendedTheme: "cyber_neon",
  recommendedGameMode: "shooter",
  recommendedPlayerModel: "blox_hero",
  sectors: [
    { id: 0, floorHeight: 0.0, ceilHeight: 6.5, floorTexture: "STUD_GRAY", ceilTexture: "SKY_CYBER", lightLevel: 230 },
    { id: 1, floorHeight: 0.35, ceilHeight: 6.5, floorTexture: "NEON_GRID", ceilTexture: "SKY_CYBER", lightLevel: 245 },
    { id: 2, floorHeight: 0.70, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_BLUE", ceilTexture: "SKY_CYBER", lightLevel: 255 },
  ],
  linedefs: [
    ...makeOuterRoomLines("tb_out", 2, 2, 24, 18, 0, "METAL1", "CYBER_GLASS", "METAL1", "CYBER_GLASS"),
    ...makeNestedPlatformLines("tb_p1", 10, 5, 20, 15, 0, 1, "CYBER_GLASS"),
    ...makeNestedPlatformLines("tb_p2", 13.5, 7.5, 18.5, 12.5, 1, 2, "NEON_GRID"),
  ],
  entities: [
    { id: "p1", type: "player", x: 4.5 * 64, y: 10.0 * 64, graph: 1, name: "Científico Blox" },
  ],
  placedModels: [
    { id: "tb_mech", modelId: "cyber_mech", x: 11.5, y: 10.0, z: 0.35, yaw: 180, scale: 1.0, animation: "walk", role: "enemy", hp: 120, maxHp: 120, speed: 1.65, damage: 15, patrolRadius: 2.0, name: "Centinela Lab" },
    { id: "tb_imp", modelId: "doom_imp", x: 7.5, y: 14.0, z: 0.0, yaw: 180, scale: 0.95, animation: "walk", role: "enemy", hp: 70, maxHp: 70, speed: 1.9, damage: 10, patrolRadius: 2.0, name: "Mutante Blox" },
    { id: "tb_goal", modelId: "portal_crystal", x: 16.0, y: 10.0, z: 0.70, yaw: 0, scale: 1.05, animation: "spin", role: "goal", name: "Cristal Lab" },
  ],
  placedVoxels: [
    { id: "tv_c1", voxelId: "voxel_computer", x: 5.0, y: 4.5, z: 0.0, yaw: 90, scale: 1.0 },
    { id: "tv_c2", voxelId: "voxel_computer", x: 21.5, y: 4.5, z: 0.0, yaw: 270, scale: 1.0 },
    { id: "tv_med", voxelId: "voxel_medikit", x: 7.5, y: 5.5, z: 0.0, yaw: 0, scale: 1.0 },
    { id: "tv_cn1", voxelId: "voxel_coin", x: 11.5, y: 6.5, z: 0.35, yaw: 0, scale: 1.0 },
    { id: "tv_cn2", voxelId: "voxel_coin", x: 11.5, y: 13.5, z: 0.35, yaw: 90, scale: 1.0 },
  ],
  lights: [
    { id: "l_tb1", x: 16.0, y: 10.0, z: 3.0, radius: 14.0, r: 56, g: 189, b: 248, flicker: false },
  ],
};

// -----------------------------------------------------------------------------
// PRESET 8: Volcán Obby Blox 3D (Sin superposiciones)
// -----------------------------------------------------------------------------
export const PRESET_LAVA_TEMPLE: Mode8LevelData = {
  id: "preset_lava_temple",
  name: "Volcán Obby Blox 3D",
  author: "WXDIV Studio",
  description:
    "Templo volcánico estilo Roblox Obby con foso de lava brillante, islas de piedra escalonadas sin superposiciones, monedas de oro y Titán de Fuego.",
  theme: "lava",
  recommendedCamera: "third_person",
  recommendedSky: "SKY3",
  recommendedWeapon: "staff3d",
  recommendedTheme: "doom_dark",
  recommendedGameMode: "shooter",
  recommendedPlayerModel: "blox_hero",
  sectors: [
    { id: 0, floorHeight: 0.0, ceilHeight: 7.0, floorTexture: "LAVA", ceilTexture: "SKY3", lightLevel: 240 },
    { id: 1, floorHeight: 0.35, ceilHeight: 7.0, floorTexture: "STUD_GRAY", ceilTexture: "SKY3", lightLevel: 245 },
    { id: 2, floorHeight: 0.55, ceilHeight: 7.0, floorTexture: "STUD_FLOOR_RED", ceilTexture: "SKY3", lightLevel: 250 },
    { id: 3, floorHeight: 0.75, ceilHeight: 7.0, floorTexture: "STUD_FLOOR_GOLD", ceilTexture: "SKY3", lightLevel: 255 },
  ],
  linedefs: [
    ...makeOuterRoomLines("lv_out", 2, 2, 26, 16, 0, "REDWALL", "STONE2", "REDWALL", "STONE2"),
    // Tres islas limpiamente separadas sobre la lava (CERO superposición)
    ...makeNestedPlatformLines("lv_i1", 3.2, 5, 8.2, 13, 0, 1, "STONE2"),
    ...makeNestedPlatformLines("lv_i2", 10.5, 4.5, 16.5, 13.5, 0, 2, "STUD_RED"),
    ...makeNestedPlatformLines("lv_i3", 19.0, 5, 24.5, 13, 0, 3, "STUD_GOLD"),
  ],
  entities: [
    { id: "p1", type: "player", x: 5.5 * 64, y: 9.0 * 64, graph: 1, name: "Explorador Volcán" },
  ],
  placedModels: [
    { id: "lv_imp", modelId: "doom_imp", x: 13.5, y: 11.0, z: 0.55, yaw: 180, scale: 0.95, animation: "walk", role: "enemy", hp: 80, maxHp: 80, speed: 1.8, damage: 12, patrolRadius: 1.6, name: "Imp Ígneo" },
    { id: "lv_boss", modelId: "demon_brute", x: 21.0, y: 9.0, z: 0.75, yaw: 180, scale: 1.05, animation: "walk", role: "enemy", hp: 145, maxHp: 145, speed: 1.5, damage: 16, patrolRadius: 1.6, name: "Titán Volcán" },
    { id: "lv_goal", modelId: "trophy_star", x: 23.0, y: 9.0, z: 0.75, yaw: 0, scale: 1.05, animation: "spin", role: "goal", name: "Trofeo Volcán" },
  ],
  placedVoxels: [
    { id: "lv_c1", voxelId: "voxel_coin", x: 13.5, y: 6.5, z: 0.55, yaw: 0, scale: 1.0 },
    { id: "lv_chk", voxelId: "voxel_checkpoint", x: 13.5, y: 9.0, z: 0.55, yaw: 0, scale: 1.0 },
    { id: "lv_med", voxelId: "voxel_medikit", x: 7.0, y: 11.5, z: 0.35, yaw: 0, scale: 1.0 },
    { id: "lv_c2", voxelId: "voxel_coin", x: 21.8, y: 6.5, z: 0.75, yaw: 90, scale: 1.0 },
  ],
  lights: [
    { id: "l_lv1", x: 13.5, y: 9.0, z: 3.0, radius: 15.0, r: 255, g: 160, b: 80, flicker: true },
  ],
};

// Catálogo completo de niveles predefinidos (Todos estilo Roblox-First y sin superposiciones)
export const BUILTIN_LEVEL_PRESETS: Mode8LevelData[] = [
  PRESET_ROBLOX_OBBY,
  PRESET_ROBLOX_DOJO,
  PRESET_ROBLOX_CYBER_TYCOON,
  PRESET_ROBLOX_SKY_CITADEL,
  PRESET_E1M1_HANGAR,
  PRESET_GOTHIC_CRYPT,
  PRESET_TECHBASE_LAB,
  PRESET_LAVA_TEMPLE,
];

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
    void saveMode8UserLevelsToIndexedDB(updated);
    localStorage.setItem(STORAGE_KEY_USER_LEVELS, JSON.stringify(updated));
  } catch (err) {
    console.error("Error saving user level to storage", err);
  }
}

export function deleteSavedUserLevel(levelId: string): void {
  try {
    const existing = loadSavedUserLevels();
    const updated = existing.filter((l) => l.id !== levelId);
    void saveMode8UserLevelsToIndexedDB(updated);
    localStorage.setItem(STORAGE_KEY_USER_LEVELS, JSON.stringify(updated));
  } catch (err) {
    console.error("Error deleting user level", err);
  }
}
