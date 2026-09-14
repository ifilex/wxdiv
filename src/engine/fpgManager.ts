import { DivGraphic } from "../types";
import { DEFAULT_PALETTE, DEFAULT_SPRITES, createGraphicCanvas } from "./graphics";

export interface DivFpgPackage {
  id: number; // 0 = main/project default, 1, 2, ...
  name: string;
  filename: string;
  description?: string;
  graphics: DivGraphic[];
}

export interface DivMapFile {
  id: number;
  name: string;
  filename: string;
  description?: string;
  graphic: DivGraphic;
}

/**
 * Creates an empty or patterned DivGraphic
 */
export function createNewDivGraphic(
  id: number,
  name: string,
  width: number = 32,
  height: number = 32,
  fillPattern?: "empty" | "checker" | "border"
): DivGraphic {
  const pixels: number[][] = [];
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      if (fillPattern === "border") {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          row.push(7); // cyan border
        } else {
          row.push(0);
        }
      } else if (fillPattern === "checker") {
        row.push((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? 11 : 15);
      } else {
        row.push(0);
      }
    }
    pixels.push(row);
  }

  const graphic: DivGraphic = {
    id,
    name,
    width,
    height,
    cx,
    cy,
    cpoints: [
      { id: 0, x: cx, y: cy },
      { id: 1, x: cx, y: 0 },
    ],
    palette: [...DEFAULT_PALETTE],
    pixels,
  };

  if (typeof document !== "undefined") {
    graphic.canvas = createGraphicCanvas(graphic);
    try {
      graphic.dataUrl = graphic.canvas.toDataURL();
    } catch (e) {}
  }

  return graphic;
}

/**
 * Convert any HTMLImageElement or Canvas to a DivGraphic with matching palette
 */
export function canvasToDivGraphic(
  sourceCanvas: HTMLCanvasElement,
  id: number,
  name: string,
  targetWidth?: number,
  targetHeight?: number
): DivGraphic {
  const w = targetWidth || sourceCanvas.width;
  const h = targetHeight || sourceCanvas.height;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;
  const ctx = tempCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create canvas context");

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceCanvas, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Build custom palette or match DEFAULT_PALETTE
  const palette: string[] = ["#00000000"]; // 0 is transparent
  const colorMap = new Map<string, number>();
  colorMap.set("0,0,0,0", 0);

  const pixels: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 32) {
        row.push(0);
      } else {
        // Quantize RGB slightly for retro 8-bit palette
        const qr = Math.round(r / 16) * 16;
        const qg = Math.round(g / 16) * 16;
        const qb = Math.round(b / 16) * 16;
        const key = `${qr},${qg},${qb}`;

        if (!colorMap.has(key)) {
          if (palette.length < 256) {
            const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb)
              .toString(16)
              .slice(1)}`;
            colorMap.set(key, palette.length);
            palette.push(hex);
          } else {
            // Find closest existing color
            colorMap.set(key, 1);
          }
        }
        row.push(colorMap.get(key) || 1);
      }
    }
    pixels.push(row);
  }

  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  const graphic: DivGraphic = {
    id,
    name,
    width: w,
    height: h,
    cx,
    cy,
    cpoints: [
      { id: 0, x: cx, y: cy },
      { id: 1, x: cx, y: 0 },
    ],
    palette,
    pixels,
    canvas: tempCanvas,
    dataUrl: tempCanvas.toDataURL(),
  };

  return graphic;
}

/**
 * Loads an image file (PNG, JPG, WebP) and converts it to a DivGraphic
 */
export async function fileToDivGraphic(
  file: File | Blob,
  id: number,
  name: string,
  maxWidth: number = 640,
  maxHeight: number = 480
): Promise<DivGraphic> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        // Scale down if exceeds max bounds
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
        }

        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) {
          reject(new Error("Cannot create context"));
          return;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, w, h);

        const graphic = canvasToDivGraphic(c, id, name, w, h);
        resolve(graphic);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Creates default initial FPG packages for the workspace
 */
export function getInitialFpgPackages(): DivFpgPackage[] {
  // Package 0: Main game sprites (Galaxy Defender, Player, Enemies, Lasers, Explosions)
  const mainGraphics = [...DEFAULT_SPRITES];

  // Package 1: Mode 8 Dungeon & 3D textures
  const dungeonGraphics = DEFAULT_SPRITES.filter(
    (g) => g.id >= 20 && g.id <= 38
  ).map((g) => ({ ...g }));

  // Package 2: Arcade & Retro Items
  const arcadeGraphics = DEFAULT_SPRITES.filter(
    (g) => (g.id >= 1 && g.id <= 10) || g.id === 34 || g.id === 35 || g.id === 36
  ).map((g) => ({ ...g }));

  return [
    {
      id: 0,
      name: "Paquete Principal (main.fpg)",
      filename: "main.fpg",
      description: "Gráficos globales del proyecto DIV. Contiene naves, disparos, enemigos y explosiones.",
      graphics: mainGraphics,
    },
    {
      id: 1,
      name: "Mazmorra 3D (dungeon.fpg)",
      filename: "dungeon.fpg",
      description: "Texturas de muros, antorchas, puertas corredizas y botiquines para Modo 8.",
      graphics: dungeonGraphics,
    },
    {
      id: 2,
      name: "Objetos Arcade (items.fpg)",
      filename: "items.fpg",
      description: "Tarjetas de acceso, munición, powerups y llaves retro.",
      graphics: arcadeGraphics,
    },
  ];
}

/**
 * Creates default standalone MAP files (.map) for the workspace
 */
export function getInitialMapFiles(): DivMapFile[] {
  // 1. fondo_espacio.map: Deep space background (160x120 or 320x240)
  const spacePixels: number[][] = [];
  const spaceW = 160;
  const spaceH = 120;
  const spacePalette = [
    "#00000000",
    "#050b18",
    "#0b1730",
    "#1e3a8a",
    "#38bdf8",
    "#ffffff",
    "#facc15",
    "#ef4444",
  ];

  for (let y = 0; y < spaceH; y++) {
    const row: number[] = [];
    for (let x = 0; x < spaceW; x++) {
      // Nebula gradient
      const dy = y / spaceH;
      let base = dy > 0.6 ? 2 : 1;
      // Stars
      const starRand = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const fract = starRand - Math.floor(starRand);
      if (fract > 0.985) {
        base = fract > 0.996 ? 5 : 4;
      }
      row.push(base);
    }
    spacePixels.push(row);
  }

  const spaceGraphic: DivGraphic = {
    id: 100,
    name: "fondo_espacio",
    width: spaceW,
    height: spaceH,
    cx: Math.floor(spaceW / 2),
    cy: Math.floor(spaceH / 2),
    cpoints: [{ id: 0, x: Math.floor(spaceW / 2), y: Math.floor(spaceH / 2) }],
    palette: spacePalette,
    pixels: spacePixels,
  };

  // 2. titulo_div.map: Retro logo / splash banner (96x32)
  const titleGraphic = createNewDivGraphic(101, "titulo_div", 96, 32, "border");

  // 3. gameover.map: Game Over banner (120x36)
  const gameoverGraphic = createNewDivGraphic(102, "gameover_banner", 120, 36, "border");

  return [
    {
      id: 100,
      name: "Fondo de Espacio Profundo",
      filename: "fondo_espacio.map",
      description: "Mapa gráfico individual para fondos de scroll o pantallas fijas de título.",
      graphic: spaceGraphic,
    },
    {
      id: 101,
      name: "Logo Titular DIV",
      filename: "titulo_div.map",
      description: "Banner gráfico individual para menú principal.",
      graphic: titleGraphic,
    },
    {
      id: 102,
      name: "Banner Game Over",
      filename: "gameover.map",
      description: "Gráfico individual de fin de partida retro.",
      graphic: gameoverGraphic,
    },
  ];
}
