/**
 * WXDIV 3.0 - Motor y Gestor de Paletas de 256 Colores (DIV Games Studio .PAL)
 * Compatible con load_pal, roll_palette, set_color, get_color, fade_on, fade_off
 */

export interface DivColor {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
  // DIV DOS representation (0..63)
  r63: number;
  g63: number;
  b63: number;
  hex: string;
}

export interface DivPalettePreset {
  id: string;
  name: string;
  filename: string;
  description: string;
  category: "classic" | "games" | "retro";
  colors: string[]; // 256 hex colors
}

// Convert RGB 0-255 to Hex
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert Hex to RGB 0-255 & 0-63
export function hexToDivColor(hex: string): DivColor {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const r = parseInt(clean.substring(0, 2) || "00", 16) || 0;
  const g = parseInt(clean.substring(2, 4) || "00", 16) || 0;
  const b = parseInt(clean.substring(4, 6) || "00", 16) || 0;
  return {
    r,
    g,
    b,
    r63: Math.round((r / 255) * 63),
    g63: Math.round((g / 255) * 63),
    b63: Math.round((b / 255) * 63),
    hex: rgbToHex(r, g, b),
  };
}

// Convert DIV DOS 0-63 RGB to Hex
export function div63ToHex(r63: number, g63: number, b63: number): string {
  const r = Math.round((Math.max(0, Math.min(63, r63)) / 63) * 255);
  const g = Math.round((Math.max(0, Math.min(63, g63)) / 63) * 255);
  const b = Math.round((Math.max(0, Math.min(63, b63)) / 63) * 255);
  return rgbToHex(r, g, b);
}

// Linear color interpolation
export function interpolateColor(c1: DivColor, c2: DivColor, factor: number): string {
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  return rgbToHex(r, g, b);
}

// Generate a ramp of colors between two indices
export function generateColorRamp(
  palette: string[],
  startIndex: number,
  endIndex: number,
  startColorHex: string,
  endColorHex: string
): string[] {
  const newPal = [...palette];
  const cStart = hexToDivColor(startColorHex);
  const cEnd = hexToDivColor(endColorHex);
  const count = Math.abs(endIndex - startIndex);
  if (count === 0) {
    newPal[startIndex] = startColorHex;
    return newPal;
  }
  const minIdx = Math.min(startIndex, endIndex);
  const maxIdx = Math.max(startIndex, endIndex);
  for (let i = minIdx; i <= maxIdx; i++) {
    const factor = (i - minIdx) / count;
    newPal[i] = interpolateColor(cStart, cEnd, factor);
  }
  return newPal;
}

// Generate the original DIV Games Studio 256 VGA default palette
export function generateDefaultDivPalette(): string[] {
  const pal: string[] = new Array(256).fill("#000000");

  // Color 0: Black (transparent in sprites)
  pal[0] = "#000000";

  // 1-15: Standard 16 ANSI/VGA base colors
  const vga16 = [
    "#000000", "#0000aa", "#00aa00", "#00aaaa",
    "#aa0000", "#aa00aa", "#aa5500", "#aaaaaa",
    "#555555", "#5555ff", "#55ff55", "#55ffff",
    "#ff5555", "#ff55ff", "#ffff55", "#ffffff"
  ];
  for (let i = 0; i < 16; i++) {
    pal[i] = vga16[i];
  }

  // 16-31: Grayscale ramp (black to bright white)
  for (let i = 0; i < 16; i++) {
    const v = Math.round((i / 15) * 255);
    pal[16 + i] = rgbToHex(v, v, v);
  }

  // 32-63: Blue to Cyan shades (32 colors)
  for (let i = 0; i < 32; i++) {
    const r = Math.round((i / 31) * 30);
    const g = Math.round((i / 31) * 210);
    const b = Math.round(50 + (i / 31) * 205);
    pal[32 + i] = rgbToHex(r, g, b);
  }

  // 64-95: Red to Orange to Gold shades (32 colors)
  for (let i = 0; i < 32; i++) {
    const r = Math.round(60 + (i / 31) * 195);
    const g = Math.round((i / 31) * 160);
    const b = Math.round((i / 31) * 30);
    pal[64 + i] = rgbToHex(r, g, b);
  }

  // 96-127: Green to Lime to Emerald shades (32 colors)
  for (let i = 0; i < 32; i++) {
    const r = Math.round((i / 31) * 40);
    const g = Math.round(40 + (i / 31) * 215);
    const b = Math.round((i / 31) * 60);
    pal[96 + i] = rgbToHex(r, g, b);
  }

  // 128-159: Magenta to Violet to Purple shades (32 colors)
  for (let i = 0; i < 32; i++) {
    const r = Math.round(70 + (i / 31) * 185);
    const g = Math.round((i / 31) * 40);
    const b = Math.round(70 + (i / 31) * 185);
    pal[128 + i] = rgbToHex(r, g, b);
  }

  // 160-191: Skin tones, earth brown and rock shades (32 colors)
  for (let i = 0; i < 32; i++) {
    const r = Math.round(50 + (i / 31) * 190);
    const g = Math.round(30 + (i / 31) * 150);
    const b = Math.round(20 + (i / 31) * 110);
    pal[160 + i] = rgbToHex(r, g, b);
  }

  // 192-223: Ocean water / Underwater deep blue cycle (for roll_palette)
  for (let i = 0; i < 32; i++) {
    const r = Math.round((i / 31) * 20);
    const g = Math.round(30 + (i / 31) * 160);
    const b = Math.round(90 + (i / 31) * 165);
    pal[192 + i] = rgbToHex(r, g, b);
  }

  // 224-254: Fire / Lava glowing cycle (for roll_palette)
  for (let i = 0; i < 31; i++) {
    const r = Math.round(150 + (i / 30) * 105);
    const g = Math.round((i / 30) * (i < 20 ? 120 : 230));
    const b = Math.round((i / 30) * (i > 24 ? 120 : 10));
    pal[224 + i] = rgbToHex(r, g, b);
  }

  // 255: Absolute White
  pal[255] = "#ffffff";

  return pal;
}

// Doom / Heretic Classic 256 Palette
export function generateDoomPalette(): string[] {
  const pal = generateDefaultDivPalette();
  // Adjust base tones towards gothic dark fantasy & bloody reds
  for (let i = 64; i < 96; i++) {
    const factor = (i - 64) / 31;
    pal[i] = rgbToHex(
      Math.round(40 + factor * 215),
      Math.round(factor * 25),
      Math.round(factor * 15)
    );
  }
  // Toxic Slime Greens (96-127)
  for (let i = 96; i < 128; i++) {
    const factor = (i - 96) / 31;
    pal[i] = rgbToHex(
      Math.round(factor * 60),
      Math.round(45 + factor * 210),
      Math.round(factor * 20)
    );
  }
  return pal;
}

// Hexen II / Quake Dark Occult Palette
export function generateHexenPalette(): string[] {
  const pal = generateDefaultDivPalette();
  // Gothic stone greys, stained glass blues, rusted armor
  for (let i = 32; i < 64; i++) {
    const factor = (i - 32) / 31;
    pal[i] = rgbToHex(
      Math.round(20 + factor * 60),
      Math.round(40 + factor * 110),
      Math.round(60 + factor * 140)
    );
  }
  return pal;
}

// Cyberpunk Neon Synthwave Palette
export function generateCyberpunkPalette(): string[] {
  const pal = new Array(256).fill("#000000");
  for (let i = 0; i < 256; i++) {
    const h = (i / 256) * 360;
    const s = 0.9;
    const l = 0.2 + 0.6 * (Math.sin((i / 256) * Math.PI * 4) * 0.5 + 0.5);
    // HSL to RGB
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    pal[i] = rgbToHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
  }
  pal[0] = "#000000";
  pal[255] = "#ffffff";
  return pal;
}

// GameBoy Retro Monocromo (4 phosphor ramps of 64 colors)
export function generateGameBoyPalette(): string[] {
  const pal = new Array(256).fill("#000000");
  const gbTones = ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"];
  for (let i = 0; i < 256; i++) {
    const rampIdx = Math.floor(i / 64);
    const subIdx = i % 64;
    const baseColor = hexToDivColor(gbTones[rampIdx]);
    const factor = subIdx / 63;
    const r = Math.round(baseColor.r * (0.6 + factor * 0.5));
    const g = Math.round(baseColor.g * (0.6 + factor * 0.5));
    const b = Math.round(baseColor.b * (0.6 + factor * 0.5));
    pal[i] = rgbToHex(r, g, b);
  }
  pal[0] = "#081808";
  pal[255] = "#c4ec3e";
  return pal;
}

// Default Presets List
export const PALETTE_PRESETS: DivPalettePreset[] = [
  {
    id: "div-vga",
    name: "DIV Games Studio Original (VGA 256)",
    filename: "div_std.pal",
    description: "Paleta estándar oficial de DIV Games Studio DOS de 256 colores con rampas completas.",
    category: "classic",
    colors: generateDefaultDivPalette(),
  },
  {
    id: "doom-classic",
    name: "Doom & Heretic (Dark Fantasy)",
    filename: "doom.pal",
    description: "Paleta oscura de 256 colores con tonos carmesí, sangre, fango tóxico y sombras góticas.",
    category: "games",
    colors: generateDoomPalette(),
  },
  {
    id: "hexen-occult",
    name: "Hexen II & Quake (Gothic Metal)",
    filename: "hexen.pal",
    description: "Paleta con marrones terrosos, óxido, metales forjados y vitrales místicos.",
    category: "games",
    colors: generateHexenPalette(),
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk & Synthwave Neon",
    filename: "neon.pal",
    description: "Colores altamente saturados, púrpuras, cian eléctrico y amarillos fluorescentes.",
    category: "retro",
    colors: generateCyberpunkPalette(),
  },
  {
    id: "gameboy",
    name: "GameBoy Retro Fósforo Verde",
    filename: "gameboy.pal",
    description: "4 rampas de 64 niveles inspiradas en la pantalla LCD verdosa clásica de GameBoy.",
    category: "retro",
    colors: generateGameBoyPalette(),
  },
];
