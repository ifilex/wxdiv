import { DivDoomLinedef, DivDoomSector } from "../types";
import { getCustomTexture, getCustomTextureCanvas } from "./assetLibrary";

export interface CanonicalTextureMeta {
  name: string;
  kind: "wall" | "flat" | "both" | "sky";
  category: "roblox_lego" | "walls" | "tech" | "gothic" | "doors_steps" | "liquids" | "floors" | "sky" | "custom";
  width: number;
  height: number;
  description: string;
  kidLabel: string;
  dominantColor: string;
  roughness: number;
  metalness: number;
  useStudBump?: boolean;
  emissiveHex?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  animatedScroll?: boolean;
  isHazard?: boolean;
  damage?: number;
  fluidType?: "lava" | "water" | "acid" | "blood";
}

export const SKY_TEXTURE_NAMES = new Set<string>([
  "F_SKY1",
  "SKY1",
  "SKY2",
  "SKY3",
  "SKY_ROBLOX",
  "SKY_CYBER",
  "SKY_SUNSET",
  "SKY_SPACE",
]);

export function isSkyTextureName(name?: string | number): boolean {
  if (name === undefined || name === null) return false;
  const s = String(name).trim().toUpperCase();
  return SKY_TEXTURE_NAMES.has(s) || s.startsWith("SKY");
}

/**
 * Canonical Aliases: maps legacy numeric IDs, WAD synonyms, and preset shorthands
 * to exact canonical texture keys so Editor Preview, IDE Testeo, and Standalone HTML
 * ALWAYS resolve to the exact same visual texture and PBR properties.
 */
export const CANONICAL_TEXTURE_ALIASES: Record<string, string> = {
  "1": "STARTAN3",
  "2": "BRICK1",
  "3": "WATER",
  "4": "GRASS_ROBLOX",
  "5": "LAVA",
  "6": "SHAWN2",
  "7": "DOOR3",
  "10": "WOOD_ROBLOX",
  "25": "STARTAN3",
  "44": "FLOOR4_8",
  "45": "CEIL3_5",
  STUD_WALL_BLUE: "STUD_BLUE",
  STUD_WALL_RED: "STUD_RED",
  STUD_WALL_GREEN: "STUD_GREEN",
  STUD_WALL_GOLD: "STUD_GOLD",
  STUD_WALL_WHITE: "STUD_WHITE",
  STUD_WALL_GRAY: "STUD_GRAY",
  STUD_FLOOR_GRAY: "STUD_GRAY",
  STUD_YELLOW: "STUD_GOLD",
  STUD_FLOOR_YELLOW: "STUD_GOLD",
  FWATER1: "WATER",
  SLIME1: "NUKAGE",
  GRASS1: "GRASS_ROBLOX",
  GRASS: "GRASS_ROBLOX",
  F_SKY1: "SKY_ROBLOX",
  SKY_DAY: "SKY_ROBLOX",
  MIDSPACE: "CYBER_GLASS",
  SLIME14: "GATE1",
  EXITDOOR: "EXIT1",
  WOOD1: "DOJO_WOOD",
  STEP: "STEP1",
  STEP2: "STEP1",
  FLAT20: "NEON_GRID",
};

export const CANONICAL_TEXTURES: CanonicalTextureMeta[] = [
  // --- Kid-Friendly Roblox / LEGO Studs ---
  {
    name: "STUD_BLUE",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Bloque azul brillante estilo LEGO / Roblox con studs",
    kidLabel: "LEGO Azul",
    dominantColor: "#2563eb",
    roughness: 0.34,
    metalness: 0.08,
    useStudBump: true,
  },
  {
    name: "STUD_FLOOR_BLUE",
    kind: "flat",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Baseplate azul con studs estilo Roblox Studio",
    kidLabel: "Suelo Azul",
    dominantColor: "#2563eb",
    roughness: 0.34,
    metalness: 0.08,
    useStudBump: true,
  },
  {
    name: "STUD_RED",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Bloque rojo vibrante de desafío estilo LEGO",
    kidLabel: "LEGO Rojo",
    dominantColor: "#dc2626",
    roughness: 0.34,
    metalness: 0.08,
    useStudBump: true,
  },
  {
    name: "STUD_FLOOR_RED",
    kind: "flat",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Plataforma roja vibrante de salto Obby",
    kidLabel: "Suelo Rojo",
    dominantColor: "#dc2626",
    roughness: 0.34,
    metalness: 0.08,
    useStudBump: true,
  },
  {
    name: "STUD_GREEN",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Bloque verde esmeralda de zona segura",
    kidLabel: "LEGO Verde",
    dominantColor: "#16a34a",
    roughness: 0.34,
    metalness: 0.08,
    useStudBump: true,
  },
  {
    name: "STUD_FLOOR_GREEN",
    kind: "flat",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Plataforma verde segura de checkpoint",
    kidLabel: "Suelo Verde",
    dominantColor: "#16a34a",
    roughness: 0.34,
    metalness: 0.08,
    useStudBump: true,
  },
  {
    name: "STUD_GOLD",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Bloque dorado brillante de tesoro y meta",
    kidLabel: "LEGO Oro",
    dominantColor: "#eab308",
    roughness: 0.24,
    metalness: 0.35,
    useStudBump: true,
  },
  {
    name: "STUD_FLOOR_GOLD",
    kind: "flat",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Plataforma dorada de victoria",
    kidLabel: "Suelo Oro",
    dominantColor: "#eab308",
    roughness: 0.24,
    metalness: 0.35,
    useStudBump: true,
  },
  {
    name: "STUD_WHITE",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Bloque blanco modular limpio",
    kidLabel: "LEGO Blanco",
    dominantColor: "#e2e8f0",
    roughness: 0.32,
    metalness: 0.06,
    useStudBump: true,
  },
  {
    name: "STUD_FLOOR_WHITE",
    kind: "flat",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Baseplate blanco brillante de estudio",
    kidLabel: "Suelo Blanco",
    dominantColor: "#e2e8f0",
    roughness: 0.32,
    metalness: 0.06,
    useStudBump: true,
  },
  {
    name: "STUD_GRAY",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Bloque gris clásico con studs",
    kidLabel: "LEGO Gris",
    dominantColor: "#64748b",
    roughness: 0.38,
    metalness: 0.12,
    useStudBump: true,
  },
  {
    name: "GRASS_ROBLOX",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Césped verde brillante con studs estilo Roblox",
    kidLabel: "Césped",
    dominantColor: "#22c55e",
    roughness: 0.42,
    metalness: 0.04,
    useStudBump: true,
  },
  {
    name: "WOOD_ROBLOX",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Tarima modular cálida de madera",
    kidLabel: "Madera",
    dominantColor: "#b45309",
    roughness: 0.48,
    metalness: 0.06,
  },
  {
    name: "OBBY_CHECKER",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Tablero arcade celeste y blanco para parkour",
    kidLabel: "Cuadros",
    dominantColor: "#0ea5e9",
    roughness: 0.26,
    metalness: 0.12,
    useStudBump: true,
  },
  {
    name: "OBBY_FINISH",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Zona de meta dorada y blanca",
    kidLabel: "Meta Obby",
    dominantColor: "#facc15",
    roughness: 0.24,
    metalness: 0.35,
    useStudBump: true,
  },
  {
    name: "DOJO_WALL",
    kind: "wall",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Celosía japonesa Shoji con marco lacado rojo",
    kidLabel: "Pared Dojo",
    dominantColor: "#fef3c7",
    roughness: 0.45,
    metalness: 0.05,
  },
  {
    name: "DOJO_WOOD",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Vigas y tablones de madera de Dojo",
    kidLabel: "Madera Dojo",
    dominantColor: "#9a5b2c",
    roughness: 0.48,
    metalness: 0.06,
  },
  {
    name: "DOJO_TATAMI",
    kind: "flat",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Estera de tatami tradicional japonesa",
    kidLabel: "Tatami",
    dominantColor: "#e7d49e",
    roughness: 0.55,
    metalness: 0.04,
  },
  {
    name: "DOJO_MAT",
    kind: "flat",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Tatami ceremonial dorado y carmesí",
    kidLabel: "Tapete Dojo",
    dominantColor: "#d97706",
    roughness: 0.52,
    metalness: 0.08,
  },
  {
    name: "MARBLE_GOLD",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Mármol blanco con ribetes dorados de palacio",
    kidLabel: "Mármol Oro",
    dominantColor: "#f1f5f9",
    roughness: 0.22,
    metalness: 0.28,
  },
  {
    name: "NEON_GRID",
    kind: "both",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Muro cibernético con neón cyan y púrpura",
    kidLabel: "Neón Cyber",
    dominantColor: "#06b6d4",
    roughness: 0.22,
    metalness: 0.35,
    emissiveHex: 0x083344,
    emissiveIntensity: 0.55,
  },
  {
    name: "NEON_FLOOR",
    kind: "flat",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Suelo cuadriculado de neón cibernético",
    kidLabel: "Suelo Neón",
    dominantColor: "#1e1b4b",
    roughness: 0.22,
    metalness: 0.35,
    emissiveHex: 0x083344,
    emissiveIntensity: 0.55,
  },
  {
    name: "CYBER_GLASS",
    kind: "wall",
    category: "roblox_lego",
    width: 128,
    height: 128,
    description: "Panel futurista de cristal translúcido",
    kidLabel: "Cristal Neón",
    dominantColor: "#0284c7",
    roughness: 0.15,
    metalness: 0.45,
    emissiveHex: 0x0ea5e9,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.62,
  },

  // --- Liquids & Hazards ---
  {
    name: "LAVA",
    kind: "both",
    category: "liquids",
    width: 128,
    height: 128,
    description: "Magma volcánico brillante (-20 HP)",
    kidLabel: "Lava",
    dominantColor: "#ea580c",
    roughness: 0.35,
    metalness: 0.05,
    emissiveHex: 0xff5500,
    emissiveIntensity: 0.78,
    animatedScroll: true,
    isHazard: true,
    damage: 20,
    fluidType: "lava",
  },
  {
    name: "WATER",
    kind: "both",
    category: "liquids",
    width: 128,
    height: 128,
    description: "Agua cristalina animada",
    kidLabel: "Agua",
    dominantColor: "#0ea5e9",
    roughness: 0.14,
    metalness: 0.18,
    transparent: true,
    opacity: 0.85,
    animatedScroll: true,
    fluidType: "water",
  },
  {
    name: "NUKAGE",
    kind: "both",
    category: "liquids",
    width: 128,
    height: 128,
    description: "Residuo verde radiactivo (-5 HP)",
    kidLabel: "Ácido Verde",
    dominantColor: "#16a34a",
    roughness: 0.3,
    metalness: 0.05,
    emissiveHex: 0x22c55e,
    emissiveIntensity: 0.65,
    animatedScroll: true,
    isHazard: true,
    damage: 5,
    fluidType: "acid",
  },
  {
    name: "BLOOD1",
    kind: "flat",
    category: "liquids",
    width: 128,
    height: 128,
    description: "Estanque rojo oscuro",
    kidLabel: "Estanque Rojo",
    dominantColor: "#881337",
    roughness: 0.25,
    metalness: 0.08,
    animatedScroll: true,
    fluidType: "blood",
  },

  // --- Classic Doom / Arcade / Sci-Fi / Gothic Walls & Floors ---
  {
    name: "STARTAN3",
    kind: "wall",
    category: "walls",
    width: 128,
    height: 128,
    description: "Paneles de aleación titanio clásicos",
    kidLabel: "Panel Titanio",
    dominantColor: "#9e8b6e",
    roughness: 0.5,
    metalness: 0.15,
  },
  {
    name: "BROWN144",
    kind: "wall",
    category: "walls",
    width: 128,
    height: 128,
    description: "Ladrillos marrones y basalto reforzado",
    kidLabel: "Ladrillo Café",
    dominantColor: "#674934",
    roughness: 0.65,
    metalness: 0.05,
  },
  {
    name: "TEKGREN2",
    kind: "wall",
    category: "tech",
    width: 128,
    height: 128,
    description: "Consolas tecno-industriales verdes",
    kidLabel: "Base Verde",
    dominantColor: "#166534",
    roughness: 0.38,
    metalness: 0.18,
    useStudBump: true,
  },
  {
    name: "COMP2",
    kind: "wall",
    category: "tech",
    width: 128,
    height: 128,
    description: "Supercomputadora con pantallas LED",
    kidLabel: "Computadora",
    dominantColor: "#1e293b",
    roughness: 0.28,
    metalness: 0.35,
    emissiveHex: 0x0369a1,
    emissiveIntensity: 0.3,
  },
  {
    name: "BRICK1",
    kind: "wall",
    category: "gothic",
    width: 128,
    height: 128,
    description: "Muralla de ladrillo rojo de castillo",
    kidLabel: "Ladrillo Rojo",
    dominantColor: "#991b1b",
    roughness: 0.55,
    metalness: 0.05,
  },
  {
    name: "REDWALL",
    kind: "wall",
    category: "gothic",
    width: 128,
    height: 128,
    description: "Muro rojo de ladrillo reforzado",
    kidLabel: "Muro Rojo",
    dominantColor: "#b91c1c",
    roughness: 0.52,
    metalness: 0.08,
  },
  {
    name: "MARBFAC",
    kind: "wall",
    category: "gothic",
    width: 128,
    height: 128,
    description: "Mármol verde tallado de templo",
    kidLabel: "Mármol Verde",
    dominantColor: "#166534",
    roughness: 0.42,
    metalness: 0.12,
    useStudBump: true,
  },
  {
    name: "STONE2",
    kind: "wall",
    category: "gothic",
    width: 128,
    height: 128,
    description: "Sillar de piedra medieval",
    kidLabel: "Piedra",
    dominantColor: "#52525b",
    roughness: 0.68,
    metalness: 0.04,
  },
  {
    name: "SHAWN2",
    kind: "wall",
    category: "tech",
    width: 128,
    height: 128,
    description: "Plancha de aluminio espacial",
    kidLabel: "Acero Plata",
    dominantColor: "#94a3b8",
    roughness: 0.26,
    metalness: 0.52,
  },
  {
    name: "METAL1",
    kind: "wall",
    category: "tech",
    width: 128,
    height: 128,
    description: "Chapa de acero corrugado",
    kidLabel: "Metal Oscuro",
    dominantColor: "#475569",
    roughness: 0.28,
    metalness: 0.52,
  },
  {
    name: "CRATE1",
    kind: "wall",
    category: "tech",
    width: 128,
    height: 128,
    description: "Caja de carga de madera reforzada",
    kidLabel: "Caja Madera",
    dominantColor: "#a16207",
    roughness: 0.48,
    metalness: 0.08,
  },
  {
    name: "CRATOP2",
    kind: "flat",
    category: "floors",
    width: 128,
    height: 128,
    description: "Tapa superior de caja de madera",
    kidLabel: "Tapa Caja",
    dominantColor: "#a16207",
    roughness: 0.48,
    metalness: 0.08,
  },
  {
    name: "DOOR3",
    kind: "wall",
    category: "doors_steps",
    width: 128,
    height: 128,
    description: "Puerta blindada neumática",
    kidLabel: "Puerta",
    dominantColor: "#64748b",
    roughness: 0.28,
    metalness: 0.45,
  },
  {
    name: "BIGDOOR2",
    kind: "wall",
    category: "doors_steps",
    width: 128,
    height: 128,
    description: "Compuerta grande de hangar",
    kidLabel: "Compuerta",
    dominantColor: "#475569",
    roughness: 0.28,
    metalness: 0.48,
  },
  {
    name: "EXIT1",
    kind: "wall",
    category: "doors_steps",
    width: 128,
    height: 128,
    description: "Puerta de salida luminosa",
    kidLabel: "Salida",
    dominantColor: "#ef4444",
    roughness: 0.28,
    metalness: 0.35,
  },
  {
    name: "STEP1",
    kind: "both",
    category: "doors_steps",
    width: 128,
    height: 128,
    description: "Escalón metálico con banda amarilla",
    kidLabel: "Escalón",
    dominantColor: "#475569",
    roughness: 0.3,
    metalness: 0.38,
    useStudBump: true,
  },
  {
    name: "SLIME01",
    kind: "wall",
    category: "walls",
    width: 128,
    height: 128,
    description: "Cascada verde radiactiva",
    kidLabel: "Cascada Verde",
    dominantColor: "#16a34a",
    roughness: 0.32,
    metalness: 0.05,
    emissiveHex: 0x22c55e,
    emissiveIntensity: 0.65,
    animatedScroll: true,
    isHazard: true,
  },
  {
    name: "FIREWALL",
    kind: "wall",
    category: "gothic",
    width: 128,
    height: 128,
    description: "Pared de fuego y magma",
    kidLabel: "Pared Fuego",
    dominantColor: "#ea580c",
    roughness: 0.35,
    metalness: 0.05,
    emissiveHex: 0xff5500,
    emissiveIntensity: 0.78,
    animatedScroll: true,
    isHazard: true,
  },
  {
    name: "SWITCH1",
    kind: "wall",
    category: "tech",
    width: 128,
    height: 128,
    description: "Botón / Interruptor rojo (OFF)",
    kidLabel: "Botón Rojo",
    dominantColor: "#ef4444",
    roughness: 0.32,
    metalness: 0.25,
    useStudBump: true,
    emissiveHex: 0xdc2626,
    emissiveIntensity: 0.7,
  },
  {
    name: "SWITCH2",
    kind: "wall",
    category: "tech",
    width: 128,
    height: 128,
    description: "Botón / Interruptor verde (ON)",
    kidLabel: "Botón Verde",
    dominantColor: "#22c55e",
    roughness: 0.32,
    metalness: 0.25,
    useStudBump: true,
    emissiveHex: 0x16a34a,
    emissiveIntensity: 0.7,
  },
  {
    name: "FLOOR4_8",
    kind: "flat",
    category: "floors",
    width: 128,
    height: 128,
    description: "Baldosas grises de hormigón",
    kidLabel: "Baldosa Gris",
    dominantColor: "#6b6255",
    roughness: 0.62,
    metalness: 0.05,
  },
  {
    name: "FLOOR5_2",
    kind: "flat",
    category: "floors",
    width: 128,
    height: 128,
    description: "Mármol claro pulido",
    kidLabel: "Piso Mármol",
    dominantColor: "#f1f5f9",
    roughness: 0.24,
    metalness: 0.26,
  },
  {
    name: "CEIL3_5",
    kind: "flat",
    category: "floors",
    width: 128,
    height: 128,
    description: "Techo modular gris claro",
    kidLabel: "Techo Claro",
    dominantColor: "#cbd5e1",
    roughness: 0.45,
    metalness: 0.08,
    useStudBump: true,
  },
  {
    name: "TLITE6_5",
    kind: "flat",
    category: "floors",
    width: 128,
    height: 128,
    description: "Lámpara brillante de techo",
    kidLabel: "Luz Techo",
    dominantColor: "#f8fafc",
    roughness: 0.2,
    metalness: 0.1,
    emissiveHex: 0xe2e8f0,
    emissiveIntensity: 0.85,
  },
  {
    name: "FLAT10",
    kind: "flat",
    category: "floors",
    width: 128,
    height: 128,
    description: "Losas oscuras de basalto",
    kidLabel: "Losa Oscura",
    dominantColor: "#3f3f46",
    roughness: 0.62,
    metalness: 0.08,
  },
  {
    name: "GATE1",
    kind: "both",
    category: "floors",
    width: 128,
    height: 128,
    description: "Portal mágico de teletransporte",
    kidLabel: "Portal Mágico",
    dominantColor: "#22d3ee",
    roughness: 0.25,
    metalness: 0.3,
    emissiveHex: 0x38bdf8,
    emissiveIntensity: 0.65,
  },
  {
    name: "RROCK01",
    kind: "both",
    category: "floors",
    width: 128,
    height: 128,
    description: "Roca volcánica oscura",
    kidLabel: "Roca Volcán",
    dominantColor: "#7f1d1d",
    roughness: 0.68,
    metalness: 0.05,
  },

  // --- Skyboxes ---
  {
    name: "SKY_ROBLOX",
    kind: "sky",
    category: "sky",
    width: 256,
    height: 128,
    description: "Cielo soleado brillante con nubes esponjosas",
    kidLabel: "Cielo Soleado",
    dominantColor: "#38bdf8",
    roughness: 1,
    metalness: 0,
  },
  {
    name: "SKY_CYBER",
    kind: "sky",
    category: "sky",
    width: 256,
    height: 128,
    description: "Noche futurista neón con estrellas",
    kidLabel: "Noche Neón",
    dominantColor: "#0ea5e9",
    roughness: 1,
    metalness: 0,
  },
  {
    name: "SKY1",
    kind: "sky",
    category: "sky",
    width: 256,
    height: 128,
    description: "Cielo azul claro de aventura",
    kidLabel: "Cielo Azul",
    dominantColor: "#1d6fe8",
    roughness: 1,
    metalness: 0,
  },
  {
    name: "SKY2",
    kind: "sky",
    category: "sky",
    width: 256,
    height: 128,
    description: "Atardecer mágico violeta y naranja",
    kidLabel: "Atardecer",
    dominantColor: "#6d28d9",
    roughness: 1,
    metalness: 0,
  },
  {
    name: "SKY3",
    kind: "sky",
    category: "sky",
    width: 256,
    height: 128,
    description: "Cielo volcánico dorado y carmesí",
    kidLabel: "Cielo Volcán",
    dominantColor: "#be123c",
    roughness: 1,
    metalness: 0,
  },
];

const CANONICAL_META_MAP = new Map<string, CanonicalTextureMeta>();
for (const meta of CANONICAL_TEXTURES) {
  CANONICAL_META_MAP.set(meta.name.toUpperCase(), meta);
}

/**
 * Resolves ANY texture identifier, alias, or legacy numeric string into its
 * canonical uppercase registry key + whether it is an exact/alias match.
 */
export function resolveCanonicalTextureName(
  rawName: string | number | undefined,
  fallback = "STUD_BLUE"
): { canonical: string; wasAlias: boolean; isKnown: boolean; meta: CanonicalTextureMeta } {
  const cleaned = String(rawName ?? "").trim().toUpperCase();
  if (!cleaned || cleaned === "-" || cleaned === "NONE") {
    const fb = CANONICAL_META_MAP.get(fallback) || CANONICAL_TEXTURES[0];
    return { canonical: fb.name, wasAlias: false, isKnown: true, meta: fb };
  }

  const customTex = getCustomTexture(cleaned);
  if (customTex) {
    return {
      canonical: customTex.name,
      wasAlias: false,
      isKnown: true,
      meta: {
        name: customTex.name,
        kind: customTex.kind,
        category: "custom",
        width: customTex.width,
        height: customTex.height,
        description: `Textura importada: ${customTex.displayName}`,
        kidLabel: customTex.displayName,
        dominantColor: customTex.dominantColor,
        roughness: customTex.roughness,
        metalness: customTex.metalness,
        useStudBump: customTex.useStudBump,
      },
    };
  }

  const direct = CANONICAL_META_MAP.get(cleaned);
  if (direct) {
    return { canonical: direct.name, wasAlias: false, isKnown: true, meta: direct };
  }

  const aliasTarget = CANONICAL_TEXTURE_ALIASES[cleaned];
  if (aliasTarget && CANONICAL_META_MAP.has(aliasTarget)) {
    return {
      canonical: aliasTarget,
      wasAlias: true,
      isKnown: true,
      meta: CANONICAL_META_MAP.get(aliasTarget)!,
    };
  }

  // Deterministic family inference ONLY when genuinely unknown, flagged with isKnown = false
  let inferred = fallback;
  if (cleaned.includes("LAVA")) inferred = "LAVA";
  else if (cleaned.includes("WATER")) inferred = "WATER";
  else if (cleaned.includes("NUKAGE") || cleaned.includes("SLIME")) inferred = "NUKAGE";
  else if (cleaned.includes("GRASS")) inferred = "GRASS_ROBLOX";
  else if (cleaned.includes("STUD") && cleaned.includes("RED")) inferred = "STUD_RED";
  else if (cleaned.includes("STUD") && cleaned.includes("GREEN")) inferred = "STUD_GREEN";
  else if (cleaned.includes("STUD") && (cleaned.includes("GOLD") || cleaned.includes("YELLOW"))) inferred = "STUD_GOLD";
  else if (cleaned.includes("STUD") && cleaned.includes("WHITE")) inferred = "STUD_WHITE";
  else if (cleaned.includes("STUD") && cleaned.includes("BLUE")) inferred = "STUD_BLUE";
  else if (cleaned.includes("STUD")) inferred = "STUD_GRAY";
  else if (cleaned.includes("DOJO")) inferred = "DOJO_WALL";
  else if (cleaned.includes("NEON")) inferred = "NEON_GRID";
  else if (cleaned.includes("GLASS")) inferred = "CYBER_GLASS";
  else if (cleaned.includes("DOOR") || cleaned.includes("EXIT")) inferred = "DOOR3";
  else if (cleaned.includes("BRICK")) inferred = "BRICK1";
  else if (cleaned.includes("WOOD")) inferred = "WOOD_ROBLOX";
  else if (cleaned.includes("METAL") || cleaned.includes("SHAWN")) inferred = "SHAWN2";
  else if (cleaned.includes("CEIL")) inferred = "CEIL3_5";
  else if (cleaned.startsWith("SKY")) inferred = "SKY_ROBLOX";

  const fbMeta = CANONICAL_META_MAP.get(inferred) || CANONICAL_TEXTURES[0];
  return { canonical: fbMeta.name, wasAlias: true, isKnown: false, meta: fbMeta };
}

export function getCanonicalTextureMeta(rawName: string | number | undefined): CanonicalTextureMeta {
  return resolveCanonicalTextureName(rawName).meta;
}

export function hashStringDeterministic(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Single Source of Truth Procedural Texture Painter.
 * Used identically by:
 * 1) Mode8LevelEditor thumbnails
 * 2) Three.js WebGL PBR Textures (mode8ThreeRenderer.ts)
 * 3) Doom 2D canvas fallback & automap (doom2Engine.ts)
 * 4) Standalone Compiled HTML runtime
 */
export function paintMode8TextureToCanvas(
  rawName: string | number | undefined,
  ctx: CanvasRenderingContext2D,
  size: number,
  frameTime = 0
): CanonicalTextureMeta {
  const { canonical, meta } = resolveCanonicalTextureName(rawName);
  const customCanvas = getCustomTextureCanvas(canonical);
  if (customCanvas) {
    ctx.drawImage(customCanvas, 0, 0, size, size);
    return meta;
  }
  const customAsset = getCustomTexture(canonical);
  if (customAsset) {
    ctx.fillStyle = customAsset.dominantColor || "#64748b";
    ctx.fillRect(0, 0, size, size);
    return meta;
  }
  const animShift = Math.floor(frameTime * 4) % 4;

  const drawRobloxStudGrid = (baseHex: string, rimLight: string, rimDark: string, cells = 4) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, size, size);
    const step = size / cells;

    ctx.strokeStyle = rimDark;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = Math.max(1, size / 128);
    for (let i = 0; i <= cells; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (let gy = 0; gy < cells; gy++) {
      for (let gx = 0; gx < cells; gx++) {
        const cx = gx * step + step * 0.5;
        const cy = gy * step + step * 0.5;
        const r = step * 0.255;

        ctx.fillStyle = rimDark;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(cx + size * 0.006, cy + size * 0.0085, r * 1.05, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = baseHex;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = rimLight;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = Math.max(1, size / 128);
        ctx.beginPath();
        ctx.arc(cx - size * 0.003, cy - size * 0.003, r * 0.92, Math.PI * 0.9, Math.PI * 1.85);
        ctx.stroke();

        ctx.strokeStyle = rimDark;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  };

  const drawCheckeredPlanks = (c1: string, c2: string, seam: string) => {
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, size, size);
    const rows = 4;
    const rh = size / rows;
    ctx.lineWidth = Math.max(1.5, size / 84);
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (size * 0.5);
      ctx.fillStyle = r % 2 === 0 ? c1 : c2;
      ctx.fillRect(0, r * rh, size, rh);
      ctx.strokeStyle = seam;
      ctx.strokeRect(0, r * rh, size, rh);
      ctx.beginPath();
      ctx.moveTo((off + size * 0.5) % size, r * rh);
      ctx.lineTo((off + size * 0.5) % size, (r + 1) * rh);
      ctx.stroke();
    }
  };

  switch (canonical) {
    case "STUD_BLUE":
    case "STUD_FLOOR_BLUE":
      drawRobloxStudGrid("#2563eb", "#93c5fd", "#1e3a8a");
      break;
    case "STUD_RED":
    case "STUD_FLOOR_RED":
      drawRobloxStudGrid("#dc2626", "#fca5a5", "#7f1d1d");
      break;
    case "STUD_GREEN":
    case "STUD_FLOOR_GREEN":
      drawRobloxStudGrid("#16a34a", "#86efac", "#14532d");
      break;
    case "STUD_GOLD":
    case "STUD_FLOOR_GOLD":
      drawRobloxStudGrid("#eab308", "#fef08a", "#854d0e");
      break;
    case "STUD_WHITE":
    case "STUD_FLOOR_WHITE":
      drawRobloxStudGrid("#e2e8f0", "#ffffff", "#94a3b8");
      break;
    case "STUD_GRAY":
      drawRobloxStudGrid("#64748b", "#cbd5e1", "#334155");
      break;
    case "GRASS_ROBLOX":
      drawRobloxStudGrid("#22c55e", "#86efac", "#15803d");
      break;
    case "WOOD_ROBLOX":
    case "DOJO_WOOD":
      drawCheckeredPlanks("#9a5b2c", "#854d23", "#5c3314");
      break;
    case "OBBY_CHECKER":
    case "OBBY_FINISH": {
      const cells = 4;
      const step = size / cells;
      const cA = canonical === "OBBY_FINISH" ? "#facc15" : "#0ea5e9";
      const cB = canonical === "OBBY_FINISH" ? "#ffffff" : "#f8fafc";
      for (let gy = 0; gy < cells; gy++) {
        for (let gx = 0; gx < cells; gx++) {
          ctx.fillStyle = (gx + gy) % 2 === 0 ? cA : cB;
          ctx.fillRect(gx * step, gy * step, step, step);
        }
      }
      ctx.strokeStyle = "#0f172a";
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = Math.max(1, size / 96);
      ctx.strokeRect(1, 1, size - 2, size - 2);
      ctx.globalAlpha = 1;
      break;
    }
    case "DOJO_TATAMI":
    case "DOJO_MAT": {
      ctx.fillStyle = canonical === "DOJO_MAT" ? "#d97706" : "#e7d49e";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = canonical === "DOJO_MAT" ? "#7f1d1d" : "#b45309";
      ctx.lineWidth = Math.max(2, size / 32);
      ctx.strokeRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96);
      ctx.strokeStyle = canonical === "DOJO_MAT" ? "#fbbf24" : "#cbb372";
      ctx.lineWidth = Math.max(1, size / 96);
      for (let y = size * 0.08; y < size * 0.92; y += size * 0.05) {
        ctx.beginPath();
        ctx.moveTo(size * 0.05, y);
        ctx.lineTo(size * 0.95, y);
        ctx.stroke();
      }
      break;
    }
    case "DOJO_WALL": {
      // Shoji lattice with warm paper & crimson lacquer frame (single canonical implementation!)
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = Math.max(4, size / 18);
      ctx.strokeRect(size * 0.03, size * 0.03, size * 0.94, size * 0.94);
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = Math.max(2, size / 42);
      for (let i = 1; i < 4; i++) {
        const p = (size / 4) * i;
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, size);
        ctx.moveTo(0, p);
        ctx.lineTo(size, p);
        ctx.stroke();
      }
      break;
    }
    case "NEON_GRID":
    case "NEON_FLOOR": {
      ctx.fillStyle = "#0b1120";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = Math.max(1.5, size / 64);
      const step = size / 4;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * step);
        ctx.lineTo(size, i * step);
        ctx.stroke();
      }
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = Math.max(1, size / 96);
      ctx.strokeRect(step * 0.5, step * 0.5, size - step, size - step);
      break;
    }
    case "CYBER_GLASS": {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#0284c7";
      ctx.globalAlpha = 0.5;
      ctx.fillRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = Math.max(2, size / 40);
      ctx.strokeRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92);
      ctx.beginPath();
      ctx.moveTo(size * 0.1, size * 0.9);
      ctx.lineTo(size * 0.9, size * 0.1);
      ctx.stroke();
      break;
    }
    case "MARBLE_GOLD":
    case "FLOOR5_2": {
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = Math.max(1.5, size / 80);
      ctx.strokeRect(size * 0.03, size * 0.03, size * 0.94, size * 0.94);
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = Math.max(3, size / 32);
      ctx.strokeRect(size * 0.1, size * 0.1, size * 0.8, size * 0.8);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(size * 0.42, size * 0.42, size * 0.16, size * 0.16);
      break;
    }
    case "LAVA":
    case "FIREWALL": {
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 16; i++) {
        const rx = (((i * 73 + animShift * 11) % 85) + 8) * (size / 100);
        const ry = (((i * 137 + animShift * 7) % 85) + 8) * (size / 100);
        ctx.fillStyle = i % 2 === 0 ? "#fde047" : "#9a3412";
        ctx.beginPath();
        ctx.arc(rx, ry, (0.055 + (i % 3) * 0.03) * size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "NUKAGE":
    case "SLIME01": {
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 16; i++) {
        const rx = (((i * 67 + animShift * 9) % 85) + 8) * (size / 100);
        const ry = (((i * 113 + animShift * 13) % 85) + 8) * (size / 100);
        ctx.fillStyle = i % 2 === 0 ? "#a3e635" : "#15803d";
        ctx.beginPath();
        ctx.arc(rx, ry, (0.048 + (i % 3) * 0.025) * size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "BLOOD1": {
      ctx.fillStyle = "#881337";
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 14; i++) {
        const rx = (((i * 71 + animShift * 5) % 84) + 8) * (size / 100);
        const ry = (((i * 107 + animShift * 8) % 84) + 8) * (size / 100);
        ctx.fillStyle = i % 2 === 0 ? "#e11d48" : "#4c0519";
        ctx.beginPath();
        ctx.arc(rx, ry, (0.05 + (i % 3) * 0.024) * size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "WATER": {
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "#bae6fd";
      ctx.lineWidth = Math.max(1.5, size / 64);
      for (let y = size * 0.12; y < size; y += size * 0.2) {
        ctx.beginPath();
        for (let x = 0; x <= size; x += Math.max(4, size / 16)) {
          const wy = y + Math.sin((x / size) * Math.PI * 4 + animShift) * (size * 0.032);
          if (x === 0) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }
      break;
    }
    case "TLITE6_5": {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(size * 0.11, size * 0.11, size * 0.78, size * 0.78);
      break;
    }
    case "CRATE1":
    case "CRATOP2": {
      drawCheckeredPlanks("#a16207", "#854d0e", "#451a03");
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = Math.max(3, size / 26);
      ctx.strokeRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92);
      ctx.beginPath();
      ctx.moveTo(size * 0.06, size * 0.06);
      ctx.lineTo(size * 0.94, size * 0.94);
      ctx.stroke();
      break;
    }
    case "STEP1": {
      drawRobloxStudGrid("#475569", "#94a3b8", "#1e293b");
      ctx.fillStyle = "#eab308";
      ctx.fillRect(0, 0, size, size * 0.08);
      break;
    }
    case "TEKGREN2":
    case "MARBFAC": {
      drawRobloxStudGrid("#166534", "#4ade80", "#052e16");
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = Math.max(2, size / 64);
      ctx.strokeRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88);
      break;
    }
    case "BROWN144":
    case "RROCK01": {
      const isRock = canonical === "RROCK01";
      ctx.fillStyle = isRock ? "#450a0a" : "#4e3626";
      ctx.fillRect(0, 0, size, size);
      const rows = 8;
      const rh = size / rows;
      const bw = size / 4;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * (bw * 0.5);
        for (let x = -bw; x < size + bw; x += bw) {
          ctx.fillStyle = isRock
            ? r % 2 === 0
              ? "#7f1d1d"
              : "#991b1b"
            : (r + Math.round(x)) % 3 === 0
            ? "#674934"
            : "#5a3f2c";
          ctx.fillRect(x + off + 1, r * rh + 1, bw - 2, rh - 2);
        }
      }
      break;
    }
    case "DOOR3":
    case "BIGDOOR2":
    case "EXIT1": {
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88);
      ctx.strokeStyle = canonical === "EXIT1" ? "#ef4444" : "#facc15";
      ctx.lineWidth = Math.max(3, size / 32);
      ctx.strokeRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84);
      ctx.fillStyle = canonical === "EXIT1" ? "#fca5a5" : "#22d3ee";
      ctx.fillRect(size * 0.42, size * 0.25, size * 0.16, size * 0.5);
      break;
    }
    case "SWITCH1":
    case "SWITCH2": {
      drawRobloxStudGrid("#334155", "#94a3b8", "#0f172a");
      ctx.fillStyle = canonical === "SWITCH2" ? "#22c55e" : "#ef4444";
      ctx.fillRect(size * 0.34, size * 0.34, size * 0.32, size * 0.32);
      break;
    }
    case "GATE1": {
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = Math.max(3, size / 32);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#f472b6";
      ctx.lineWidth = Math.max(2, size / 48);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "BRICK1":
    case "REDWALL": {
      drawCheckeredPlanks("#b91c1c", "#991b1b", "#cbd5e1");
      break;
    }
    case "COMP2": {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(size * 0.08, size * 0.08, size * 0.38, size * 0.32);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(size * 0.11, size * 0.14, size * 0.28, size * 0.035);
      ctx.fillRect(size * 0.11, size * 0.21, size * 0.22, size * 0.035);
      ctx.fillStyle = "#052e16";
      ctx.fillRect(size * 0.53, size * 0.08, size * 0.39, size * 0.32);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(size * 0.57, size * 0.16, size * 0.31, size * 0.035);
      ctx.fillRect(size * 0.57, size * 0.23, size * 0.23, size * 0.035);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(size * 0.08, size * 0.48, size * 0.84, size * 0.43);
      for (let i = 0; i < 6; i++) {
        const lx = size * (0.12 + i * 0.13);
        ctx.fillStyle = (i + animShift) % 2 === 0 ? "#10b981" : "#f43f5e";
        ctx.fillRect(lx, size * 0.54, size * 0.05, size * 0.025);
        ctx.fillStyle = "#334155";
        ctx.fillRect(lx, size * 0.62, size * 0.06, size * 0.21);
      }
      break;
    }
    case "SHAWN2":
    case "METAL1": {
      const isSilver = canonical === "SHAWN2";
      ctx.fillStyle = isSilver ? "#94a3b8" : "#475569";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = isSilver ? "#cbd5e1" : "#64748b";
      ctx.fillRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92);
      ctx.strokeStyle = isSilver ? "#475569" : "#38bdf8";
      ctx.lineWidth = Math.max(1.5, size / 64);
      ctx.strokeRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9);
      ctx.fillStyle = "#334155";
      for (let rx = size * 0.1; rx < size; rx += size * 0.25) {
        for (let ry = size * 0.1; ry < size; ry += size * 0.25) {
          ctx.fillRect(rx, ry, Math.max(2, size / 32), Math.max(2, size / 32));
        }
      }
      break;
    }
    case "STARTAN3": {
      ctx.fillStyle = "#8c7a5e";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#a39072";
      ctx.fillRect(size * 0.03, size * 0.03, size * 0.94, size * 0.45);
      ctx.fillRect(size * 0.03, size * 0.52, size * 0.94, size * 0.45);
      ctx.strokeStyle = "#2e2417";
      ctx.lineWidth = Math.max(1.5, size / 64);
      ctx.strokeRect(size * 0.015, size * 0.015, size * 0.97, size * 0.97);
      ctx.beginPath();
      ctx.moveTo(0, size * 0.5);
      ctx.lineTo(size, size * 0.5);
      ctx.stroke();
      break;
    }
    case "STONE2": {
      ctx.fillStyle = "#3f3f46";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#52525b";
      const pad = size * 0.025;
      const half = size * 0.5;
      ctx.fillRect(pad, pad, half - pad * 1.5, half - pad * 1.5);
      ctx.fillRect(half + pad * 0.5, pad, half - pad * 1.5, half - pad * 1.5);
      ctx.fillRect(pad, half + pad * 0.5, half - pad * 1.5, half - pad * 1.5);
      ctx.fillRect(half + pad * 0.5, half + pad * 0.5, half - pad * 1.5, half - pad * 1.5);
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = Math.max(1.5, size / 64);
      ctx.strokeRect(1, 1, size - 2, size - 2);
      break;
    }
    case "FLOOR4_8":
    case "FLAT10": {
      const isDark = canonical === "FLAT10";
      ctx.fillStyle = isDark ? "#27272a" : "#57534e";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = isDark ? "#3f3f46" : "#6b6255";
      const pad = size * 0.03;
      const half = size * 0.5;
      ctx.fillRect(pad, pad, half - pad * 1.5, half - pad * 1.5);
      ctx.fillRect(half + pad * 0.5, pad, half - pad * 1.5, half - pad * 1.5);
      ctx.fillRect(pad, half + pad * 0.5, half - pad * 1.5, half - pad * 1.5);
      ctx.fillRect(half + pad * 0.5, half + pad * 0.5, half - pad * 1.5, half - pad * 1.5);
      break;
    }
    case "CEIL3_5": {
      drawRobloxStudGrid("#cbd5e1", "#f8fafc", "#64748b");
      break;
    }
    case "SKY_ROBLOX":
    case "SKY1":
    case "SKY2":
    case "SKY3":
    case "SKY_CYBER": {
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      if (canonical === "SKY_CYBER") {
        grad.addColorStop(0, "#05081a");
        grad.addColorStop(0.55, "#0284c7");
        grad.addColorStop(1, "#020617");
      } else if (canonical === "SKY3") {
        grad.addColorStop(0, "#3b0764");
        grad.addColorStop(0.55, "#be123c");
        grad.addColorStop(1, "#fb923c");
      } else if (canonical === "SKY2") {
        grad.addColorStop(0, "#1e1b4b");
        grad.addColorStop(0.55, "#6d28d9");
        grad.addColorStop(1, "#f97316");
      } else {
        grad.addColorStop(0, "#1d6fe8");
        grad.addColorStop(0.6, "#38bdf8");
        grad.addColorStop(1, "#e0f2fe");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      if (canonical === "SKY_ROBLOX" || canonical === "SKY1") {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(size * 0.35, size * 0.38, size * 0.18, size * 0.08, 0, 0, Math.PI * 2);
        ctx.ellipse(size * 0.65, size * 0.52, size * 0.2, size * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default:
      drawRobloxStudGrid("#3b82f6", "#93c5fd", "#1d4ed8");
      break;
  }

  return meta;
}

/**
 * Computes a deterministic structural + pixel-content signature for a single canonical texture
 * using a fast canvas-free / Canvas2D-aware hash so validation works both in Browser and Node VM.
 */
export function computeCanonicalTextureHash(rawName: string | number | undefined): string {
  const { canonical, meta } = resolveCanonicalTextureName(rawName);
  const spec = `${canonical}|${meta.kind}|${meta.dominantColor}|${meta.roughness}|${meta.metalness}|${meta.useStudBump ? 1 : 0}|${meta.emissiveHex ?? 0}|${meta.transparent ? 1 : 0}`;
  let pixelDigest = 0;

  if (typeof document !== "undefined") {
    try {
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 32;
      const ctx = c.getContext("2d");
      if (ctx) {
        paintMode8TextureToCanvas(canonical, ctx, 32, 0);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let h = 2166136261;
        for (let i = 0; i < data.length; i += 4) {
          h ^= data[i];
          h = Math.imul(h, 16777619);
          h ^= data[i + 1];
          h = Math.imul(h, 16777619);
          h ^= data[i + 2];
          h = Math.imul(h, 16777619);
        }
        pixelDigest = h >>> 0;
      }
    } catch {
      pixelDigest = 0;
    }
  }

  const combined = hashStringDeterministic(`${spec}#${pixelDigest}`);
  return combined.toString(16).padStart(8, "0");
}

export interface Mode8TextureValidationReport {
  isValid: boolean;
  totalReferenced: number;
  resolvedTextures: Array<{
    raw: string;
    canonical: string;
    wasAlias: boolean;
    isKnown: boolean;
    hash: string;
  }>;
  aliasMappings: Array<{ raw: string; canonical: string }>;
  unknownNames: string[];
  manifestChecksum: string;
}

/**
 * Texture Validation System:
 * Audits every texture referenced in sectors, linedefs, and skybox, normalizes aliases,
 * flags any missing/unregistered texture keys, and returns a deterministic manifest checksum
 * used to guarantee 100% visual parity between Editor Preview, IDE Testeo, and Compiled HTML.
 */
export function validateMode8LevelTextures(
  sectors: DivDoomSector[],
  linedefs: DivDoomLinedef[],
  skyTexture?: string
): Mode8TextureValidationReport {
  const seenRaw = new Set<string>();
  const addRef = (raw?: string | number) => {
    if (raw === undefined || raw === null) return;
    const s = String(raw).trim();
    if (!s || s === "-" || s.toUpperCase() === "NONE") return;
    seenRaw.add(s);
  };

  addRef(skyTexture || "SKY_ROBLOX");
  for (const sec of sectors || []) {
    addRef(sec.floorTexture || "STUD_FLOOR_BLUE");
    addRef(sec.ceilTexture || skyTexture || "SKY_ROBLOX");
  }
  for (const line of linedefs || []) {
    if (line.noDraw) continue;
    addRef(line.middleTexture);
    addRef(line.lowerTexture);
    addRef(line.upperTexture);
  }

  const resolvedTextures: Mode8TextureValidationReport["resolvedTextures"] = [];
  const aliasMappings: Mode8TextureValidationReport["aliasMappings"] = [];
  const unknownNames: string[] = [];

  for (const raw of Array.from(seenRaw).sort()) {
    const res = resolveCanonicalTextureName(raw);
    const hash = computeCanonicalTextureHash(res.canonical);
    resolvedTextures.push({
      raw,
      canonical: res.canonical,
      wasAlias: res.wasAlias,
      isKnown: res.isKnown,
      hash,
    });
    if (res.wasAlias && res.isKnown && raw.toUpperCase() !== res.canonical) {
      aliasMappings.push({ raw, canonical: res.canonical });
    }
    if (!res.isKnown) {
      unknownNames.push(raw);
    }
  }

  const manifestSource = resolvedTextures
    .map((t) => `${t.canonical}:${t.hash}`)
    .sort()
    .join("|");
  const manifestChecksum = hashStringDeterministic(manifestSource).toString(16).padStart(8, "0");

  return {
    isValid: unknownNames.length === 0 && resolvedTextures.length > 0,
    totalReferenced: resolvedTextures.length,
    resolvedTextures,
    aliasMappings,
    unknownNames,
    manifestChecksum,
  };
}

/**
 * Normalizes all sector & linedef texture references in place (returning clean copies)
 * so compiled code, runtime execution, and level editor share identical canonical IDs.
 */
export function normalizeMode8LevelTextures(
  sectors: DivDoomSector[],
  linedefs: DivDoomLinedef[],
  skyTexture?: string
): {
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
  skyTexture: string;
  validation: Mode8TextureValidationReport;
} {
  const normSky = resolveCanonicalTextureName(skyTexture || "SKY_ROBLOX", "SKY_ROBLOX").canonical;
  const normSectors = (sectors || []).map((s) => {
    const floorResolved = resolveCanonicalTextureName(s.floorTexture || "STUD_FLOOR_BLUE", "STUD_FLOOR_BLUE");
    const ceilResolved = resolveCanonicalTextureName(s.ceilTexture || normSky, normSky);
    return {
      ...s,
      floorTexture: floorResolved.canonical,
      ceilTexture: ceilResolved.canonical,
      fluidType: s.fluidType || floorResolved.meta.fluidType,
    };
  });

  const normLines = (linedefs || []).map((l) => ({
    ...l,
    middleTexture: l.middleTexture ? resolveCanonicalTextureName(l.middleTexture, "STUD_BLUE").canonical : l.middleTexture,
    lowerTexture: l.lowerTexture ? resolveCanonicalTextureName(l.lowerTexture, "STEP1").canonical : l.lowerTexture,
    upperTexture: l.upperTexture ? resolveCanonicalTextureName(l.upperTexture, "BIGDOOR2").canonical : l.upperTexture,
  }));

  const validation = validateMode8LevelTextures(normSectors, normLines, normSky);
  return {
    sectors: normSectors,
    linedefs: normLines,
    skyTexture: normSky,
    validation,
  };
}

export function auditMode8DivCodeTextures(code: string): (Mode8TextureValidationReport & { isMode8: boolean; skyTexture: string }) {
  const src = code || "";
  const isMode8 =
    /m8_set_doom_sector|m8_add_doom_line|m8_engine_mode|m8_place_voxel|m8_add_voxel|m8_add_model|m8_place_model|m8_spawn_entity|start_mode8|jugador_doom|jugador_blox|jugador_marine|mundo 3d modo 8/i.test(
      src
    );
  if (!isMode8) {
    return {
      isMode8: false,
      skyTexture: "SKY_ROBLOX",
      isValid: true,
      totalReferenced: 0,
      resolvedTextures: [],
      aliasMappings: [],
      unknownNames: [],
      manifestChecksum: "00000000",
    };
  }

  const skyMatch = src.match(/(?:CIELO_TEXTURA\s*=\s*|m8_set_sky\s*\(\s*)"([^"]*)"/i);
  const skyTexture = resolveCanonicalTextureName(skyMatch ? skyMatch[1] : "SKY_ROBLOX", "SKY_ROBLOX").canonical;
  const quickSectors: DivDoomSector[] = [];
  const quickLines: DivDoomLinedef[] = [];
  const secRe = /m8_set_doom_sector\s*\(\s*(\d+)\s*,\s*[-+]?\d+(?:\.\d+)?\s*,\s*[-+]?\d+(?:\.\d+)?\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = secRe.exec(src)) !== null) {
    quickSectors.push({
      id: parseInt(m[1], 10),
      floorHeight: 0,
      ceilHeight: 7,
      floorTexture: m[2],
      ceilTexture: m[3],
    });
  }
  const lineRe = /m8_add_doom_line\s*\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"/gi;
  while ((m = lineRe.exec(src)) !== null) {
    quickLines.push({
      id: `w_${quickLines.length}`,
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 0,
      frontSectorId: 0,
      isTwoSided: false,
      middleTexture: m[1] || undefined,
      lowerTexture: m[2] || undefined,
      upperTexture: m[3] || undefined,
    });
  }
  const report = validateMode8LevelTextures(quickSectors, quickLines, skyTexture);
  return {
    ...report,
    isMode8: true,
    skyTexture,
  };
}

