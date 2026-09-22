/**
 * WXDIV 3.0 - Motor de Fuentes Bitmap FNT (DIV Games Studio)
 * Compatible con load_fnt, unload_fnt, write, write_int
 */

export interface DivFont {
  id: number;
  name: string;
  filename: string;
  charWidth: number;
  charHeight: number;
  color: string;
  secondaryColor?: string;
  shadowColor?: string;
  hasShadow: boolean;
  spacing: number;
  // ASCII character matrices (1 = active pixel, 0 = transparent)
  glyphs: Record<string, number[][]>;
}

// Helper to generate a 2D matrix of dimensions w x h filled with 0
export function createEmptyGlyph(width: number, height: number): number[][] {
  const m: number[][] = [];
  for (let y = 0; y < height; y++) {
    m.push(new Array(width).fill(0));
  }
  return m;
}

// Convert 8x8 hex/binary array to 2D matrix
function parseGlyphLines(lines: string[], width: number, height: number): number[][] {
  const res = createEmptyGlyph(width, height);
  for (let y = 0; y < Math.min(lines.length, height); y++) {
    const line = lines[y];
    for (let x = 0; x < Math.min(line.length, width); x++) {
      res[y][x] = line[x] === "#" || line[x] === "1" ? 1 : 0;
    }
  }
  return res;
}

// Standard 8x8 ASCII base patterns
const BASE_8X8_RAW: Record<string, string[]> = {
  " ": ["        ", "        ", "        ", "        ", "        ", "        ", "        ", "        "],
  "!": ["   #    ", "   #    ", "   #    ", "   #    ", "   #    ", "        ", "   #    ", "        "],
  '"': ["  # #   ", "  # #   ", "  # #   ", "        ", "        ", "        ", "        ", "        "],
  "#": ["  # #   ", " #######", "  # #   ", "  # #   ", " #######", "  # #   ", "        ", "        "],
  "$": ["   #    ", "  ####  ", " # #    ", "  ###   ", "    # # ", "  ####  ", "   #    ", "        "],
  "%": [" ##   # ", " ##  #  ", "    #   ", "   #    ", "  #     ", " #  ##  ", " #  ##  ", "        "],
  "&": ["  ##    ", " #  #   ", "  ##    ", " #  # # ", " #   #  ", "  ### # ", "        ", "        "],
  "'": ["   #    ", "   #    ", "  #     ", "        ", "        ", "        ", "        ", "        "],
  "(": ["   ##   ", "  #     ", " #      ", " #      ", " #      ", "  #     ", "   ##   ", "        "],
  ")": ["  ##    ", "    #   ", "     #  ", "     #  ", "     #  ", "    #   ", "  ##    ", "        "],
  "*": ["        ", "  #   # ", "   # #  ", " #######", "   # #  ", "  #   # ", "        ", "        "],
  "+": ["        ", "   #    ", "   #    ", " #####  ", "   #    ", "   #    ", "        ", "        "],
  ",": ["        ", "        ", "        ", "        ", "   ##   ", "   #    ", "  #     ", "        "],
  "-": ["        ", "        ", "        ", " ###### ", "        ", "        ", "        ", "        "],
  ".": ["        ", "        ", "        ", "        ", "        ", "  ##    ", "  ##    ", "        "],
  "/": ["      # ", "     #  ", "    #   ", "   #    ", "  #     ", " #      ", "#       ", "        "],
  "0": ["  ####  ", " #    # ", " #   ## ", " # #  # ", " ##   # ", " #    # ", "  ####  ", "        "],
  "1": ["   ##   ", "  ###   ", "   ##   ", "   ##   ", "   ##   ", "   ##   ", " ###### ", "        "],
  "2": ["  ####  ", " #    # ", "      # ", "   ###  ", "  #     ", " #      ", " ###### ", "        "],
  "3": ["  ####  ", " #    # ", "      # ", "   ###  ", "      # ", " #    # ", "  ####  ", "        "],
  "4": [" #   #  ", " #   #  ", " #   #  ", " ###### ", "     #  ", "     #  ", "     #  ", "        "],
  "5": [" ###### ", " #      ", " #####  ", "      # ", "      # ", " #    # ", "  ####  ", "        "],
  "6": ["  ####  ", " #      ", " #####  ", " #    # ", " #    # ", " #    # ", "  ####  ", "        "],
  "7": [" ###### ", "      # ", "     #  ", "    #   ", "   #    ", "   #    ", "   #    ", "        "],
  "8": ["  ####  ", " #    # ", " #    # ", "  ####  ", " #    # ", " #    # ", "  ####  ", "        "],
  "9": ["  ####  ", " #    # ", " #    # ", "  ##### ", "      # ", "     #  ", "  ####  ", "        "],
  ":": ["        ", "  ##    ", "  ##    ", "        ", "  ##    ", "  ##    ", "        ", "        "],
  ";": ["        ", "  ##    ", "  ##    ", "        ", "  ##    ", "  #     ", " #      ", "        "],
  "<": ["    #   ", "   #    ", "  #     ", " #      ", "  #     ", "   #    ", "    #   ", "        "],
  "=": ["        ", "        ", " ###### ", "        ", " ###### ", "        ", "        ", "        "],
  ">": [" #      ", "  #     ", "   #    ", "    #   ", "   #    ", "  #     ", " #      ", "        "],
  "?": ["  ####  ", " #    # ", "      # ", "    ##  ", "   ##   ", "        ", "   ##   ", "        "],
  "@": ["  ####  ", " #    # ", " #  ### ", " # #  # ", " #  ### ", " #      ", "  ####  ", "        "],
  "A": ["  ####  ", " #    # ", " #    # ", " ###### ", " #    # ", " #    # ", " #    # ", "        "],
  "B": [" #####  ", " #    # ", " #    # ", " #####  ", " #    # ", " #    # ", " #####  ", "        "],
  "C": ["  ####  ", " #    # ", " #      ", " #      ", " #      ", " #    # ", "  ####  ", "        "],
  "D": [" #####  ", " #    # ", " #    # ", " #    # ", " #    # ", " #    # ", " #####  ", "        "],
  "E": [" ###### ", " #      ", " #      ", " #####  ", " #      ", " #      ", " ###### ", "        "],
  "F": [" ###### ", " #      ", " #      ", " #####  ", " #      ", " #      ", " #      ", "        "],
  "G": ["  ####  ", " #    # ", " #      ", " #  ### ", " #    # ", " #    # ", "  ####  ", "        "],
  "H": [" #    # ", " #    # ", " #    # ", " ###### ", " #    # ", " #    # ", " #    # ", "        "],
  "I": ["  ####  ", "   ##   ", "   ##   ", "   ##   ", "   ##   ", "   ##   ", "  ####  ", "        "],
  "J": ["   ###  ", "     #  ", "     #  ", "     #  ", "     #  ", " #   #  ", "  ###   ", "        "],
  "K": [" #    # ", " #   #  ", " #  #   ", " ###    ", " #  #   ", " #   #  ", " #    # ", "        "],
  "L": [" #      ", " #      ", " #      ", " #      ", " #      ", " #      ", " ###### ", "        "],
  "M": [" #    # ", " ##  ## ", " # ## # ", " #    # ", " #    # ", " #    # ", " #    # ", "        "],
  "N": [" #    # ", " ##   # ", " # #  # ", " #  # # ", " #   ## ", " #    # ", " #    # ", "        "],
  "O": ["  ####  ", " #    # ", " #    # ", " #    # ", " #    # ", " #    # ", "  ####  ", "        "],
  "P": [" #####  ", " #    # ", " #    # ", " #####  ", " #      ", " #      ", " #      ", "        "],
  "Q": ["  ####  ", " #    # ", " #    # ", " #    # ", " #  # # ", " #   ## ", "  #### #", "        "],
  "R": [" #####  ", " #    # ", " #    # ", " #####  ", " #   #  ", " #    # ", " #    # ", "        "],
  "S": ["  ####  ", " #    # ", " #      ", "  ####  ", "      # ", " #    # ", "  ####  ", "        "],
  "T": [" ###### ", "   ##   ", "   ##   ", "   ##   ", "   ##   ", "   ##   ", "   ##   ", "        "],
  "U": [" #    # ", " #    # ", " #    # ", " #    # ", " #    # ", " #    # ", "  ####  ", "        "],
  "V": [" #    # ", " #    # ", " #    # ", " #    # ", "  #  #  ", "  #  #  ", "   ##   ", "        "],
  "W": [" #    # ", " #    # ", " #    # ", " # ## # ", " ##  ## ", " #    # ", " #    # ", "        "],
  "X": [" #    # ", "  #  #  ", "   ##   ", "   ##   ", "  #  #  ", " #    # ", " #    # ", "        "],
  "Y": [" #    # ", " #    # ", "  #  #  ", "   ##   ", "   ##   ", "   ##   ", "   ##   ", "        "],
  "Z": [" ###### ", "      # ", "     #  ", "    #   ", "   #    ", "  #     ", " ###### ", "        "],
  "[": ["  ###   ", "  #     ", "  #     ", "  #     ", "  #     ", "  #     ", "  ###   ", "        "],
  "\\": [" #      ", "  #     ", "   #    ", "    #   ", "     #  ", "      # ", "       #", "        "],
  "]": ["   ###  ", "     #  ", "     #  ", "     #  ", "     #  ", "     #  ", "   ###  ", "        "],
  "^": ["   #    ", "  # #   ", " #   #  ", "        ", "        ", "        ", "        ", "        "],
  "_": ["        ", "        ", "        ", "        ", "        ", "        ", " ###### ", "        "],
};

// Map lowercase to uppercase fallback if not customized
for (let c = 97; c <= 122; c++) {
  const upper = String.fromCharCode(c - 32);
  const lower = String.fromCharCode(c);
  if (BASE_8X8_RAW[upper]) {
    BASE_8X8_RAW[lower] = BASE_8X8_RAW[upper];
  }
}

// Generate base 8x8 glyph map
export function generateBaseGlyphs(width: number = 8, height: number = 8): Record<string, number[][]> {
  const res: Record<string, number[][]> = {};
  for (const [char, lines] of Object.entries(BASE_8X8_RAW)) {
    res[char] = parseGlyphLines(lines, width, height);
  }
  return res;
}

// Scale or adapt glyph to target dimensions
export function scaleGlyph(glyph: number[][], srcW: number, srcH: number, destW: number, destH: number): number[][] {
  const out = createEmptyGlyph(destW, destH);
  for (let dy = 0; dy < destH; dy++) {
    for (let dx = 0; dx < destW; dx++) {
      const sx = Math.min(srcW - 1, Math.floor((dx / destW) * srcW));
      const sy = Math.min(srcH - 1, Math.floor((dy / destH) * srcH));
      if (glyph[sy] && glyph[sy][sx]) {
        out[dy][dx] = glyph[sy][sx];
      }
    }
  }
  return out;
}

// Built-in Font 0: System Font 8x8
export const FONT_0_SYSTEM: DivFont = {
  id: 0,
  name: "Fuente Sistema 8x8",
  filename: "system.fnt",
  charWidth: 8,
  charHeight: 8,
  color: "#ffffff",
  secondaryColor: "#94a3b8",
  shadowColor: "#020617",
  hasShadow: true,
  spacing: 1,
  glyphs: generateBaseGlyphs(8, 8),
};

// Built-in Font 1: DIV Arcade Gold (10x12)
export const FONT_1_ARCADE_GOLD: DivFont = {
  id: 1,
  name: "DIV Arcade Gold 10x12",
  filename: "arcade.fnt",
  charWidth: 10,
  charHeight: 12,
  color: "#facc15", // Bright gold
  secondaryColor: "#b45309", // Deep amber
  shadowColor: "#000000",
  hasShadow: true,
  spacing: 2,
  glyphs: (() => {
    const base = generateBaseGlyphs(8, 8);
    const scaled: Record<string, number[][]> = {};
    for (const [ch, g] of Object.entries(base)) {
      scaled[ch] = scaleGlyph(g, 8, 8, 10, 12);
    }
    return scaled;
  })(),
};

// Built-in Font 2: Cyber Neon Cyan 10x14
export const FONT_2_CYBER_CYAN: DivFont = {
  id: 2,
  name: "Cyber Neon Cyan 10x14",
  filename: "cyber.fnt",
  charWidth: 10,
  charHeight: 14,
  color: "#38bdf8", // Neon cyan
  secondaryColor: "#0284c7",
  shadowColor: "#082f49",
  hasShadow: true,
  spacing: 2,
  glyphs: (() => {
    const base = generateBaseGlyphs(8, 8);
    const scaled: Record<string, number[][]> = {};
    for (const [ch, g] of Object.entries(base)) {
      scaled[ch] = scaleGlyph(g, 8, 8, 10, 14);
    }
    return scaled;
  })(),
};

// Built-in Font 3: Doom Blood Pixel 12x14
export const FONT_3_DOOM_BLOOD: DivFont = {
  id: 3,
  name: "Doom Blood Pixel 12x14",
  filename: "doom.fnt",
  charWidth: 12,
  charHeight: 14,
  color: "#ef4444", // Crimson blood
  secondaryColor: "#991b1b",
  shadowColor: "#450a0a",
  hasShadow: true,
  spacing: 2,
  glyphs: (() => {
    const base = generateBaseGlyphs(8, 8);
    const scaled: Record<string, number[][]> = {};
    for (const [ch, g] of Object.entries(base)) {
      scaled[ch] = scaleGlyph(g, 8, 8, 12, 14);
    }
    return scaled;
  })(),
};

export const DEFAULT_DIV_FONTS: DivFont[] = [
  FONT_0_SYSTEM,
  FONT_1_ARCADE_GOLD,
  FONT_2_CYBER_CYAN,
  FONT_3_DOOM_BLOOD,
];

/**
 * Text Render Engine for DIV Game Canvas with Anti-aliased / Smoothed rendering
 */
export function renderDivBitmapText(
  ctx: CanvasRenderingContext2D,
  font: DivFont,
  text: string,
  startX: number,
  startY: number,
  align: number = 0,
  smooth: boolean = true
): { width: number; height: number } {
  const charW = font.charWidth;
  const charH = font.charHeight;
  const spacing = font.spacing;
  const totalW = text.length * charW + Math.max(0, text.length - 1) * spacing;

  let drawX = startX;
  if (align === 1) {
    // Center
    drawX = Math.round(startX - totalW / 2);
  } else if (align === 2) {
    // Right
    drawX = Math.round(startX - totalW);
  }

  const drawY = startY;

  // Render character by character
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const glyph = font.glyphs[ch] || font.glyphs[ch.toUpperCase()] || font.glyphs["?"];
    const curCharX = drawX + i * (charW + spacing);

    if (glyph) {
      // 1. Draw shadow first if enabled (softened shadow if smooth)
      if (font.hasShadow) {
        ctx.fillStyle = font.shadowColor || "#000000";
        for (let y = 0; y < charH; y++) {
          for (let x = 0; x < charW; x++) {
            if (glyph[y] && glyph[y][x]) {
              ctx.fillRect(curCharX + x + 1, drawY + y + 1, 1, 1);
            }
          }
        }
      }

      // 2. Draw front pixels with smoothed edges and vertical gradient
      for (let y = 0; y < charH; y++) {
        const isLowerHalf = y >= charH / 2;
        const baseColor = isLowerHalf && font.secondaryColor ? font.secondaryColor : font.color;
        ctx.fillStyle = baseColor;

        for (let x = 0; x < charW; x++) {
          if (glyph[y] && glyph[y][x]) {
            ctx.fillRect(curCharX + x, drawY + y, 1, 1);

            // Sub-pixel anti-aliasing smoothing for diagonal corners
            if (smooth) {
              const rightEmpty = !glyph[y]?.[x + 1];
              const bottomEmpty = !glyph[y + 1]?.[x];
              const diagonalNeighbor = glyph[y + 1]?.[x + 1];

              if ((rightEmpty || bottomEmpty) && diagonalNeighbor) {
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.fillRect(curCharX + x + 0.5, drawY + y + 0.5, 0.75, 0.75);
                ctx.restore();
              }
            }
          }
        }
      }
    }
  }

  return { width: totalW, height: charH };
}
