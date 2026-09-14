import { DivGraphic } from "../types";

export const DEFAULT_PALETTE = [
  "#00000000", // 0: Transparent
  "#000000",   // 1: Black
  "#ffffff",   // 2: White
  "#e11d48",   // 3: Red
  "#f97316",   // 4: Orange
  "#eab308",   // 5: Yellow
  "#22c55e",   // 6: Green
  "#06b6d4",   // 7: Cyan
  "#3b82f6",   // 8: Blue
  "#8b5cf6",   // 9: Purple
  "#ec4899",   // 10: Pink
  "#78716c",   // 11: Gray
  "#38bdf8",   // 12: Sky Blue
  "#a855f7",   // 13: Neon Violet
  "#10b981",   // 14: Emerald
  "#64748b",   // 15: Slate
];

/**
 * Creates an in-memory HTMLCanvasElement from pixel matrix
 */
export function createGraphicCanvas(graphic: DivGraphic): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = graphic.width;
  canvas.height = graphic.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, graphic.width, graphic.height);
  const palette = graphic.palette || DEFAULT_PALETTE;

  for (let y = 0; y < graphic.height; y++) {
    for (let x = 0; x < graphic.width; x++) {
      const colorIndex = graphic.pixels[y]?.[x] ?? 0;
      if (colorIndex !== 0) {
        const color = palette[colorIndex] || "#ffffff";
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  return canvas;
}

/**
 * Helper to generate simple 16x16 or 24x24 pixel matrices
 */
function createPixelMatrix(
  w: number,
  h: number,
  pattern: (x: number, y: number) => number
): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      row.push(pattern(x, y));
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Generates rich default FPG graphics pack for DIV Games Studio
 */
export function getDefaultFPG(): DivGraphic[] {
  const fpg: DivGraphic[] = [
    // 1: Spaceship Player (Cyan/Blue starfighter)
    {
      id: 1,
      name: "nave_player",
      width: 20,
      height: 20,
      cx: 10,
      cy: 10,
      cpoints: [{ x: 10, y: 10, id: 0 }, { x: 10, y: 2, id: 1 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(20, 20, (x, y) => {
        // Cockpit and nose
        if (x === 10 && y >= 2 && y <= 5) return 7; // Cyan nose
        if (Math.abs(x - 10) <= 1 && y >= 6 && y <= 10) return 12; // Sky blue cockpit
        // Main fuselage
        if (Math.abs(x - 10) <= 2 && y >= 11 && y <= 16) return 8; // Deep blue body
        // Wings
        if (Math.abs(x - 10) <= (y - 8) && y >= 9 && y <= 16) return 8;
        if (Math.abs(x - 10) === (y - 8) && y >= 9 && y <= 17) return 2; // White wingtip border
        // Engine thrusters
        if ((x === 8 || x === 12) && y === 17) return 4; // Orange flame
        if ((x === 8 || x === 12) && y === 18) return 5; // Yellow flame tip
        return 0;
      }),
    },
    // 2: Laser Shot
    {
      id: 2,
      name: "disparo_laser",
      width: 8,
      height: 14,
      cx: 4,
      cy: 7,
      cpoints: [{ x: 4, y: 7, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(8, 14, (x, y) => {
        if (x >= 3 && x <= 4 && y >= 1 && y <= 12) return 5; // Yellow core
        if (x >= 2 && x <= 5 && y >= 2 && y <= 11) return 3; // Red outline
        return 0;
      }),
    },
    // 3: Alien Enemy 1 (Invader Classic)
    {
      id: 3,
      name: "alien_rojo",
      width: 18,
      height: 14,
      cx: 9,
      cy: 7,
      cpoints: [{ x: 9, y: 7, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(18, 14, (x, y) => {
        // Alien antennas
        if ((x === 5 || x === 12) && y === 1) return 3;
        if ((x === 6 || x === 11) && y === 2) return 3;
        // Head & body
        if (x >= 4 && x <= 13 && y >= 3 && y <= 7) {
          // Eyes
          if ((x === 6 || x === 11) && (y === 4 || y === 5)) return 2;
          return 3;
        }
        // Mouth & tentacles
        if (x >= 3 && x <= 14 && y >= 8 && y <= 10) {
          if ((x === 8 || x === 9) && y === 9) return 0;
          return 3;
        }
        if ((x === 4 || x === 7 || x === 10 || x === 13) && y === 11) return 4;
        if ((x === 3 || x === 14) && y === 12) return 4;
        return 0;
      }),
    },
    // 4: Alien Enemy 2 (Purple Saucer)
    {
      id: 4,
      name: "alien_purpura",
      width: 20,
      height: 14,
      cx: 10,
      cy: 7,
      cpoints: [{ x: 10, y: 7, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(20, 14, (x, y) => {
        // Dome
        if (x >= 8 && x <= 11 && y >= 2 && y <= 4) return 7; // Cyan glass
        // Saucer rim
        if (x >= 4 && x <= 15 && y >= 5 && y <= 8) return 9; // Purple
        if (x >= 2 && x <= 17 && y >= 7 && y <= 9) return 13; // Neon violet
        // Blinking lights
        if ((x === 4 || x === 7 || x === 10 || x === 13 || x === 16) && y === 8) return 5; // Yellow light
        // Thrusters
        if ((x === 7 || x === 12) && y >= 10 && y <= 12) return 10;
        return 0;
      }),
    },
    // 5: Explosion Frame A
    {
      id: 5,
      name: "explosion_1",
      width: 16,
      height: 16,
      cx: 8,
      cy: 8,
      cpoints: [{ x: 8, y: 8, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(16, 16, (x, y) => {
        const d = Math.hypot(x - 8, y - 8);
        if (d <= 3) return 2; // White center
        if (d <= 5) return 5; // Yellow
        if (d <= 7) return 4; // Orange
        return 0;
      }),
    },
    // 6: Explosion Frame B
    {
      id: 6,
      name: "explosion_2",
      width: 22,
      height: 22,
      cx: 11,
      cy: 11,
      cpoints: [{ x: 11, y: 11, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(22, 22, (x, y) => {
        const d = Math.hypot(x - 11, y - 11);
        if (d <= 4) return 5; // Yellow
        if (d <= 8 && ((x + y) % 2 === 0 || d <= 6)) return 3; // Red flame burst
        if (d <= 10 && (x * y) % 5 === 0) return 4;
        return 0;
      }),
    },
    // 7: Asteroid / Rock
    {
      id: 7,
      name: "asteroide",
      width: 22,
      height: 22,
      cx: 11,
      cy: 11,
      cpoints: [{ x: 11, y: 11, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(22, 22, (x, y) => {
        const d = Math.hypot(x - 11, y - 11);
        const noise = Math.sin(x * 1.5) * Math.cos(y * 1.5) * 2;
        if (d + noise <= 8) {
          if ((x === 8 && y === 9) || (x === 14 && y === 13) || (x === 10 && y === 15)) return 1; // Crater shadow
          if (x < 9 && y < 9) return 15; // Highlight
          return 11; // Grey rock
        }
        return 0;
      }),
    },
    // 8: Coin / Collectible Gold
    {
      id: 8,
      name: "moneda_oro",
      width: 14,
      height: 14,
      cx: 7,
      cy: 7,
      cpoints: [{ x: 7, y: 7, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(14, 14, (x, y) => {
        const d = Math.hypot(x - 7, y - 7);
        if (d <= 5) {
          if (d <= 2) return 2; // White shine
          if (x >= 6 && x <= 8 && y >= 5 && y <= 9) return 4; // Center symbol
          return 5; // Yellow gold
        }
        if (d <= 6) return 4; // Dark gold border
        return 0;
      }),
    },
    // 9: Platform / Brick Tile
    {
      id: 9,
      name: "bloque_plataforma",
      width: 24,
      height: 16,
      cx: 12,
      cy: 8,
      cpoints: [{ x: 12, y: 8, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(24, 16, (x, y) => {
        if (y === 0 || y === 1) return 6; // Green grass top
        if (y === 15 || x === 0 || x === 23) return 1; // Dark border
        if (y === 8 && x % 8 === 0) return 1; // Mortar
        return (x + y) % 3 === 0 ? 11 : 15; // Stone texture
      }),
    },
    // 10: Knight / Hero Sprite
    {
      id: 10,
      name: "caballero_heroe",
      width: 18,
      height: 22,
      cx: 9,
      cy: 11,
      cpoints: [{ x: 9, y: 11, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(18, 22, (x, y) => {
        // Helmet plume
        if (x >= 8 && x <= 10 && y >= 1 && y <= 3) return 3; // Red plume
        // Helmet
        if (x >= 7 && x <= 11 && y >= 4 && y <= 7) {
          if (y === 6 && (x === 8 || x === 10)) return 7; // Blue visor slit
          return 15; // Steel helmet
        }
        // Body armor
        if (x >= 6 && x <= 12 && y >= 8 && y <= 15) return 8; // Royal blue tunic
        // Sword in hand
        if (x === 14 && y >= 7 && y <= 16) return 2; // Silver blade
        if (x === 14 && y === 17) return 5; // Gold hilt
        // Legs
        if ((x === 7 || x === 11) && y >= 16 && y <= 20) return 15;
        // Boots
        if ((x >= 6 && x <= 7 && y === 21) || (x >= 11 && x <= 12 && y === 21)) return 4;
        return 0;
      }),
    },
    // 11: Cyber Ball
    {
      id: 11,
      name: "pelota_cyber",
      width: 12,
      height: 12,
      cx: 6,
      cy: 6,
      cpoints: [{ x: 6, y: 6, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(12, 12, (x, y) => {
        const d = Math.hypot(x - 6, y - 6);
        if (d <= 3) return 2; // Core
        if (d <= 5) return 7; // Cyan glow
        return 0;
      }),
    },
    // 12: Paddle Cyber
    {
      id: 12,
      name: "raqueta_cyber",
      width: 12,
      height: 48,
      cx: 6,
      cy: 24,
      cpoints: [{ x: 6, y: 24, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(12, 48, (x, y) => {
        if (x >= 2 && x <= 9 && y >= 2 && y <= 45) {
          if (x >= 4 && x <= 7) return 7; // Cyan inner glow
          return 8; // Blue border
        }
        return 0;
      }),
    },
    // ==========================================
    // 3D MODE 7 & MODE 8 GRAPHICS
    // ==========================================
    // 20: Mode 7 Kart Jugador (Rear perspective kart)
    {
      id: 20,
      name: "kart_jugador",
      width: 24,
      height: 20,
      cx: 12,
      cy: 16,
      cpoints: [{ x: 12, y: 16, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(24, 20, (x, y) => {
        // Pilot helmet
        if (x >= 10 && x <= 13 && y >= 2 && y <= 5) return 5; // Yellow helmet
        if (x >= 10 && x <= 13 && y === 4) return 1; // Visor
        // Rear spoiler
        if (x >= 4 && x <= 19 && y >= 6 && y <= 7) return 3; // Red spoiler
        if ((x === 6 || x === 17) && y >= 8 && y <= 9) return 11; // Struts
        // Kart body (Chassis)
        if (x >= 6 && x <= 17 && y >= 8 && y <= 15) return 3; // Red chassis
        if (x >= 8 && x <= 15 && y >= 9 && y <= 12) return 2; // White racing stripe
        // Exhaust pipes
        if ((x === 8 || x === 15) && y >= 14 && y <= 16) return 11; // Chrome exhaust
        if ((x === 8 || x === 15) && y === 17) return 4; // Fire spark
        // Rear wide tires
        if ((x >= 2 && x <= 5 || x >= 18 && x <= 21) && y >= 10 && y <= 18) {
          return (y === 10 || y === 18 || x === 2 || x === 21) ? 1 : 15; // Black rubber tire
        }
        return 0;
      }),
    },
    // 21: Mode 7 Kart Rival
    {
      id: 21,
      name: "kart_rival",
      width: 24,
      height: 20,
      cx: 12,
      cy: 16,
      cpoints: [{ x: 12, y: 16, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(24, 20, (x, y) => {
        if (x >= 10 && x <= 13 && y >= 2 && y <= 5) return 7; // Cyan helmet
        if (x >= 10 && x <= 13 && y === 4) return 1;
        if (x >= 4 && x <= 19 && y >= 6 && y <= 7) return 9; // Purple spoiler
        if ((x === 6 || x === 17) && y >= 8 && y <= 9) return 11;
        if (x >= 6 && x <= 17 && y >= 8 && y <= 15) return 9; // Purple chassis
        if (x >= 8 && x <= 15 && y >= 9 && y <= 12) return 13; // Neon violet stripe
        if ((x === 8 || x === 15) && y >= 14 && y <= 16) return 11;
        if ((x >= 2 && x <= 5 || x >= 18 && x <= 21) && y >= 10 && y <= 18) {
          return (y === 10 || y === 18 || x === 2 || x === 21) ? 1 : 15;
        }
        return 0;
      }),
    },
    // 22: Mode 7 3D Tree Billboard
    {
      id: 22,
      name: "arbol_3d",
      width: 24,
      height: 32,
      cx: 12,
      cy: 30,
      cpoints: [{ x: 12, y: 30, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(24, 32, (x, y) => {
        // Trunk
        if (x >= 10 && x <= 13 && y >= 22 && y <= 31) return 11; // Brown trunk
        // Foliage layers (Pine/Shrub)
        const dTop = Math.hypot(x - 12, y - 8);
        if (dTop <= 6) return 10;
        const dMid = Math.hypot(x - 12, y - 14);
        if (dMid <= 9) return 6; // Green
        const dBot = Math.hypot(x - 12, y - 20);
        if (dBot <= 11) return 14; // Emerald
        return 0;
      }),
    },
    // 23: Mode 7 Oil Slick Obstacle
    {
      id: 23,
      name: "mancha_aceite",
      width: 22,
      height: 14,
      cx: 11,
      cy: 7,
      cpoints: [{ x: 11, y: 7, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(22, 14, (x, y) => {
        const dx = (x - 11) / 10;
        const dy = (y - 7) / 6;
        if (dx * dx + dy * dy <= 1) {
          if (dx * dx + dy * dy <= 0.4) return 13; // Oil rainbow sheen
          return 1; // Slick black
        }
        return 0;
      }),
    },
    // 24: 3D Coin
    {
      id: 24,
      name: "moneda_3d",
      width: 14,
      height: 14,
      cx: 7,
      cy: 7,
      cpoints: [{ x: 7, y: 7, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(14, 14, (x, y) => {
        const d = Math.hypot(x - 7, y - 7);
        if (d <= 6) {
          if (d <= 3) return 2; // White shine
          if (x >= 6 && x <= 8) return 5; // Yellow center
          return 4; // Orange rim
        }
        return 0;
      }),
    },
    // 25: Mode 8 Wall Texture - Red Brick
    {
      id: 25,
      name: "pared_ladrillo",
      width: 32,
      height: 32,
      cx: 16,
      cy: 16,
      cpoints: [{ x: 16, y: 16, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(32, 32, (x, y) => {
        // Mortar lines every 8 px vertically
        const row = Math.floor(y / 8);
        const inRow = y % 8;
        if (inRow === 0) return 11; // Mortar gray
        // Vertical mortar lines offset by row
        const offset = (row % 2 === 0) ? 0 : 8;
        if ((x + offset) % 16 === 0) return 11;
        // Brick color variation
        return ((x + y * 3) % 7 === 0) ? 4 : 3; // Red / Orange brick
      }),
    },
    // 26: Mode 8 Wall Texture - Mossy Dungeon Stone
    {
      id: 26,
      name: "pared_musgo",
      width: 32,
      height: 32,
      cx: 16,
      cy: 16,
      cpoints: [{ x: 16, y: 16, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(32, 32, (x, y) => {
        const blockX = x % 16;
        const blockY = y % 16;
        if (blockX === 0 || blockY === 0) return 1; // Dark stone seam
        if (y > 22 && (x * 7 + y) % 3 === 0) return 6; // Green moss on base
        return (x + y) % 5 === 0 ? 15 : 11; // Slate gray stone
      }),
    },
    // 27: Mode 8 3D Dungeon Monster (Demon/Slime)
    {
      id: 27,
      name: "monstruo_3d",
      width: 24,
      height: 28,
      cx: 12,
      cy: 26,
      cpoints: [{ x: 12, y: 26, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(24, 28, (x, y) => {
        // Horns
        if ((x === 6 || x === 17) && y >= 2 && y <= 6) return 4;
        // Monster head & body
        const d = Math.hypot((x - 12) * 0.9, y - 14);
        if (d <= 9) {
          // Glowing red eyes
          if ((x === 9 || x === 14) && y >= 10 && y <= 12) return 3; // Crimson eyes
          // Sharp teeth
          if (x >= 8 && x <= 15 && y === 17 && x % 2 === 0) return 2; // White fangs
          // Body
          return (d < 5) ? 14 : 6; // Greenish demon flesh
        }
        // Claws
        if ((x <= 4 || x >= 19) && y >= 18 && y <= 22) return 4;
        return 0;
      }),
    },
    // 28: Mode 8 3D Wall Torch
    {
      id: 28,
      name: "antorcha_3d",
      width: 14,
      height: 24,
      cx: 7,
      cy: 22,
      cpoints: [{ x: 7, y: 22, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(14, 24, (x, y) => {
        // Sconce bracket
        if (x >= 6 && x <= 7 && y >= 12 && y <= 23) return 1;
        // Torch head
        if (x >= 5 && x <= 8 && y >= 9 && y <= 11) return 11;
        // Flame
        const dFlame = Math.hypot(x - 7, y - 5);
        if (dFlame <= 4) {
          if (dFlame <= 1.5) return 2; // White core
          if (dFlame <= 2.8) return 5; // Yellow fire
          return 4; // Orange flame tip
        }
        return 0;
      }),
    },
    // 29: Mode 8 3D Barrel
    {
      id: 29,
      name: "barril_3d",
      width: 18,
      height: 24,
      cx: 9,
      cy: 22,
      cpoints: [{ x: 9, y: 22, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(18, 24, (x, y) => {
        if (x >= 3 && x <= 14 && y >= 4 && y <= 22) {
          // Metal bands
          if (y === 6 || y === 12 || y === 18) return 15;
          // Wood planks
          if (x === 6 || x === 11) return 1; // Plank groove
          return 4; // Dark brown wood
        }
        return 0;
      }),
    },
    // 30: Mode 8 First-Person Weapon HUD
    {
      id: 30,
      name: "arma_hud",
      width: 48,
      height: 48,
      cx: 24,
      cy: 48,
      cpoints: [{ x: 24, y: 48, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(48, 48, (x, y) => {
        // Centered plasma blaster at bottom of screen
        if (x >= 18 && x <= 30 && y >= 18 && y <= 47) {
          // Muzzle core
          if (x >= 22 && x <= 26 && y >= 18 && y <= 24) return 7; // Cyan plasma glow
          // Barrel metal
          if (x >= 20 && x <= 28 && y >= 25 && y <= 34) return 15; // Gunmetal
          // Grips and stock
          if (x >= 18 && x <= 30 && y >= 35 && y <= 47) return 1; // Black grip
        }
        return 0;
      }),
    },
    // 31: Mode 8 Sliding Metal Tech Door (Doom style)
    {
      id: 31,
      name: "puerta_metal",
      width: 32,
      height: 32,
      cx: 16,
      cy: 16,
      cpoints: [{ x: 16, y: 16, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(32, 32, (x, y) => {
        // Outer door frame
        if (x === 0 || x === 31 || y === 0 || y === 31) return 1; // Black seam
        if (x <= 2 || x >= 29) return 15; // Metal frame
        // Hazard diagonal stripes on top and bottom
        if (y >= 1 && y <= 5) {
          return ((x + y) % 6 < 3) ? 5 : 1; // Yellow/black hazard stripe
        }
        if (y >= 26 && y <= 30) {
          return ((x - y + 32) % 6 < 3) ? 5 : 1; // Yellow/black hazard stripe
        }
        // Center panel seam
        if (x === 15 || x === 16) return 1;
        // Access card reader / status light
        if (x >= 13 && x <= 18 && y >= 13 && y <= 18) {
          if (x >= 14 && x <= 17 && y >= 14 && y <= 17) return 7; // Cyan glow
          return 1;
        }
        // Heavy steel paneling
        if (y === 10 || y === 21) return 1; // Horizontal panel seams
        return ((x * 3 + y) % 7 === 0) ? 11 : 15; // Steel shades
      }),
    },
    // 32: Mode 8 Tech Wall with Wall Switch / Device (Doom switch)
    {
      id: 32,
      name: "pared_switch",
      width: 32,
      height: 32,
      cx: 16,
      cy: 16,
      cpoints: [{ x: 16, y: 16, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(32, 32, (x, y) => {
        // Border frame
        if (x === 0 || x === 31 || y === 0 || y === 31) return 1;
        // Central switch recess box
        if (x >= 9 && x <= 22 && y >= 8 && y <= 23) {
          if (x === 9 || x === 22 || y === 8 || y === 23) return 1; // Dark bevel
          // Switch lever / button
          if (x >= 13 && x <= 18 && y >= 11 && y <= 17) {
            return 6; // Green activated toggle
          }
          // LED status indicators
          if (y === 20 && (x === 12 || x === 15 || x === 19)) return 3; // Red LEDs
          return 15; // Inner plate
        }
        // Rivets and steel texture
        if ((x === 4 || x === 27) && (y === 4 || y === 27)) return 2; // Bright rivets
        return ((x + y) % 4 === 0) ? 15 : 11;
      }),
    },
    // 33: Mode 8 Cyber Tech Wall (Doom UAC style)
    {
      id: 33,
      name: "pared_ciber",
      width: 32,
      height: 32,
      cx: 16,
      cy: 16,
      cpoints: [{ x: 16, y: 16, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(32, 32, (x, y) => {
        if (x === 0 || x === 31 || y === 0 || y === 31) return 1;
        // Glowing cyan energy conduit through the middle
        if (y >= 14 && y <= 17) {
          if (y === 15 || y === 16) return 7; // Bright cyan
          return 8; // Deep blue edge
        }
        // Vertical cable ducts
        if ((x >= 6 && x <= 8) || (x >= 23 && x <= 25)) {
          return 11; // Gray cables
        }
        // Tech panels
        return ((x * 5 + y * 7) % 11 === 0) ? 15 : 1;
      }),
    },
    // 34: 3D Keycard / Llave de Acceso
    {
      id: 34,
      name: "llave_3d",
      width: 16,
      height: 20,
      cx: 8,
      cy: 18,
      cpoints: [{ x: 8, y: 18, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(16, 20, (x, y) => {
        if (x >= 4 && x <= 11 && y >= 3 && y <= 17) {
          if (x === 4 || x === 11 || y === 3 || y === 17) return 2; // White rim
          // Key chip
          if (x >= 6 && x <= 9 && y >= 6 && y <= 9) return 5; // Gold microchip
          // Neon stripe
          if (y >= 12 && y <= 14) return 7; // Cyan keycard band
          return 8; // Blue card base
        }
        return 0;
      }),
    },
    // 35: 3D Medikit / Botiquín de Salud
    {
      id: 35,
      name: "botiquin_3d",
      width: 20,
      height: 20,
      cx: 10,
      cy: 18,
      cpoints: [{ x: 10, y: 18, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(20, 20, (x, y) => {
        if (x >= 3 && x <= 16 && y >= 5 && y <= 18) {
          // White case outline
          if (x === 3 || x === 16 || y === 5 || y === 18) return 15;
          // Red cross
          if ((x >= 8 && x <= 11 && y >= 8 && y <= 15) || (x >= 6 && x <= 13 && y >= 10 && y <= 13)) {
            return 3; // Crimson red cross
          }
          return 2; // Pure white medical case
        }
        // Handle
        if (x >= 7 && x <= 12 && y >= 2 && y <= 4) return 1;
        return 0;
      }),
    },
    // 36: 3D Ammo Box / Caja de Munición
    {
      id: 36,
      name: "municion_3d",
      width: 18,
      height: 18,
      cx: 9,
      cy: 16,
      cpoints: [{ x: 9, y: 16, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(18, 18, (x, y) => {
        if (x >= 2 && x <= 15 && y >= 4 && y <= 16) {
          if (x === 2 || x === 15 || y === 4 || y === 16) return 1;
          // Gold bullet tips on side
          if (y >= 7 && y <= 12 && (x === 5 || x === 8 || x === 11)) return 5;
          return 6; // Military green olive box
        }
        return 0;
      }),
    },
    // 37: 3D Floor Sensor / Placa de Presión
    {
      id: 37,
      name: "sensor_piso",
      width: 24,
      height: 16,
      cx: 12,
      cy: 14,
      cpoints: [{ x: 12, y: 14, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(24, 16, (x, y) => {
        if (x >= 2 && x <= 21 && y >= 6 && y <= 14) {
          // Metallic border
          if (x === 2 || x === 21 || y === 6 || y === 14) return 11;
          // Glowing neon pressure pad
          if (x >= 5 && x <= 18 && y >= 8 && y <= 12) return 7; // Cyan pad
          return 15;
        }
        return 0;
      }),
    },
    // 38: Mode 8 Iron Dungeon Portcullis Door
    {
      id: 38,
      name: "puerta_hierro",
      width: 32,
      height: 32,
      cx: 16,
      cy: 16,
      cpoints: [{ x: 16, y: 16, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: createPixelMatrix(32, 32, (x, y) => {
        // Heavy arched iron bars
        if (x === 0 || x === 31 || y === 0 || y === 31) return 1;
        // Vertical iron bars
        if (x % 5 === 0) return 11;
        // Horizontal iron crossbars
        if (y === 8 || y === 16 || y === 24) return 15;
        // Dark dungeon behind bars
        return 1;
      }),
    },
  ];

  // Initialize canvas for each graphic
  fpg.forEach((g) => {
    if (typeof document !== "undefined") {
      g.canvas = createGraphicCanvas(g);
      try {
        g.dataUrl = g.canvas.toDataURL();
      } catch (e) {
        // ignore in SSR
      }
    }
  });

  return fpg;
}

export const DEFAULT_SPRITES: DivGraphic[] = getDefaultFPG();

