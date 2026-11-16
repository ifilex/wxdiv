import React, { useState, useRef, useEffect } from "react";
import {
  Paintbrush,
  Eraser,
  PaintBucket,
  Crosshair,
  Sparkles,
  Plus,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  Check,
  Undo2,
  Redo2,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Pipette,
  Minus,
  Square as SquareIcon,
  Circle as CircleIcon,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Grid,
} from "lucide-react";
import { DivGraphic } from "../types";
import { DEFAULT_PALETTE, createGraphicCanvas } from "../engine/graphics";

interface SpriteEditorProps {
  fpg: DivGraphic[];
  onUpdateFpg: (fpg: DivGraphic[]) => void;
}

type PaintTool =
  | "pencil"
  | "brush"
  | "line"
  | "rect"
  | "rect_fill"
  | "circle"
  | "circle_fill"
  | "bucket"
  | "eraser"
  | "pipette"
  | "cpoint";

export const SpriteEditor: React.FC<SpriteEditorProps> = ({ fpg, onUpdateFpg }) => {
  const [selectedGraphicId, setSelectedGraphicId] = useState<number>(fpg[0]?.id || 1);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(2); // White default
  const [activeTool, setActiveTool] = useState<PaintTool>("pencil");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartPos, setDrawStartPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [canvasScale, setCanvasScale] = useState<number>(320); // 256, 320, 384
  const [mobileTab, setMobileTab] = useState<"canvas" | "tools" | "fpg">("canvas");

  // Undo / Redo history
  const [history, setHistory] = useState<number[][][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentGraphic = fpg.find((g) => g.id === selectedGraphicId) || fpg[0];

  // Save state to undo history
  const pushHistory = (pixels: number[][]) => {
    const copy = pixels.map((r) => [...r]);
    const trimmed = history.slice(0, historyIndex + 1);
    setHistory([...trimmed, copy]);
    setHistoryIndex(trimmed.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const prevPixels = history[prevIdx];
      setHistoryIndex(prevIdx);
      updateCurrentGraphic({ pixels: prevPixels.map((r) => [...r]) }, false);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const nextPixels = history[nextIdx];
      setHistoryIndex(nextIdx);
      updateCurrentGraphic({ pixels: nextPixels.map((r) => [...r]) }, false);
    }
  };

  // Reset history on graphic change
  useEffect(() => {
    if (currentGraphic) {
      setHistory([currentGraphic.pixels.map((r) => [...r])]);
      setHistoryIndex(0);
    }
  }, [selectedGraphicId]);

  // Redraw canvas
  useEffect(() => {
    renderGrid();
  }, [currentGraphic, activeTool, showGrid, canvasScale, drawStartPos, hoverPos]);

  const renderGrid = () => {
    if (!canvasRef.current || !currentGraphic) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = currentGraphic.width;
    const h = currentGraphic.height;
    const pixelSize = canvas.width / w;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Checkerboard transparent background
    const tileSize = 8;
    for (let y = 0; y < canvas.height; y += tileSize) {
      for (let x = 0; x < canvas.width; x += tileSize) {
        ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? "#1e293b" : "#0f172a";
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // 2. Draw pixels
    const palette = currentGraphic.palette || DEFAULT_PALETTE;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const colorIdx = currentGraphic.pixels[y]?.[x] ?? 0;
        if (colorIdx !== 0) {
          ctx.fillStyle = palette[colorIdx] || "#ffffff";
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    // 3. Optional Shape Preview while dragging (line, rect, circle)
    if (isDrawing && drawStartPos && hoverPos) {
      const sx = drawStartPos.x;
      const sy = drawStartPos.y;
      const ex = hoverPos.x;
      const ey = hoverPos.y;
      const previewColor = palette[selectedColorIndex] || "#ffffff";

      ctx.fillStyle = previewColor;
      ctx.strokeStyle = previewColor;

      if (activeTool === "line") {
        bresenhamLine(sx, sy, ex, ey, (px, py) => {
          ctx.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
        });
      } else if (activeTool === "rect" || activeTool === "rect_fill") {
        const minX = Math.min(sx, ex);
        const maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey);
        const maxY = Math.max(sy, ey);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (activeTool === "rect_fill" || x === minX || x === maxX || y === minY || y === maxY) {
              ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
          }
        }
      } else if (activeTool === "circle" || activeTool === "circle_fill") {
        const rx = Math.abs(ex - sx);
        const ry = Math.abs(ey - sy);
        for (let y = sy - ry; y <= sy + ry; y++) {
          for (let x = sx - rx; x <= sx + rx; x++) {
            const normalized =
              Math.pow((x - sx) / (rx || 1), 2) + Math.pow((y - sy) / (ry || 1), 2);
            if (activeTool === "circle_fill" ? normalized <= 1.05 : Math.abs(normalized - 1.0) < 0.4) {
              if (x >= 0 && x < w && y >= 0 && y < h) {
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
              }
            }
          }
        }
      }
    }

    // 4. Grid lines
    if (showGrid) {
      ctx.strokeStyle = "#33415533";
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x++) {
        ctx.beginPath();
        ctx.moveTo(x * pixelSize, 0);
        ctx.lineTo(x * pixelSize, h * pixelSize);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * pixelSize);
        ctx.lineTo(w * pixelSize, y * pixelSize);
        ctx.stroke();
      }
    }

    // 5. Center Point indicator (cx, cy)
    const cx = (currentGraphic.cx ?? Math.floor(w / 2)) * pixelSize + pixelSize / 2;
    const cy = (currentGraphic.cy ?? Math.floor(h / 2)) * pixelSize + pixelSize / 2;

    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, pixelSize * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - pixelSize, cy);
    ctx.lineTo(cx + pixelSize, cy);
    ctx.moveTo(cx, cy - pixelSize);
    ctx.lineTo(cx, cy + pixelSize);
    ctx.stroke();
  };

  // Helper: Bresenham line algorithm
  const bresenhamLine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    plot: (x: number, y: number) => void
  ) => {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      plot(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      let e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  const getCanvasPixelCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !currentGraphic) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const px = Math.floor(((clientX - rect.left) / rect.width) * currentGraphic.width);
    const py = Math.floor(((clientY - rect.top) / rect.height) * currentGraphic.height);
    return { px, py };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !currentGraphic) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unavailable
    }
    const coords = getCanvasPixelCoords(e.clientX, e.clientY);
    if (!coords) return;
    const { px, py } = coords;

    if (px < 0 || px >= currentGraphic.width || py < 0 || py >= currentGraphic.height) return;

    setIsDrawing(true);
    setDrawStartPos({ x: px, y: py });
    setHoverPos({ x: px, y: py });

    // Handle single-click immediate tools
    if (activeTool === "pipette") {
      const picked = currentGraphic.pixels[py]?.[px] ?? 0;
      setSelectedColorIndex(picked);
      setActiveTool("pencil");
      setIsDrawing(false);
      return;
    }

    if (activeTool === "cpoint") {
      updateCurrentGraphic({ cx: px, cy: py });
      setIsDrawing(false);
      return;
    }

    if (activeTool === "bucket") {
      const newPixels = currentGraphic.pixels.map((row) => [...row]);
      const targetColor = newPixels[py][px];
      floodFill(newPixels, px, py, targetColor, selectedColorIndex, currentGraphic.width, currentGraphic.height);
      pushHistory(newPixels);
      updateCurrentGraphic({ pixels: newPixels });
      setIsDrawing(false);
      return;
    }

    if (activeTool === "pencil" || activeTool === "brush" || activeTool === "eraser") {
      const newPixels = currentGraphic.pixels.map((row) => [...row]);
      applyPencilOrBrush(newPixels, px, py, activeTool === "eraser" ? 0 : selectedColorIndex);
      updateCurrentGraphic({ pixels: newPixels });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !currentGraphic) return;
    const coords = getCanvasPixelCoords(e.clientX, e.clientY);
    if (!coords) return;
    const { px, py } = coords;

    setHoverPos({ x: px, y: py });

    if (!isDrawing) return;
    if (px < 0 || px >= currentGraphic.width || py < 0 || py >= currentGraphic.height) return;

    if (activeTool === "pencil" || activeTool === "brush" || activeTool === "eraser") {
      const newPixels = currentGraphic.pixels.map((row) => [...row]);
      applyPencilOrBrush(newPixels, px, py, activeTool === "eraser" ? 0 : selectedColorIndex);
      updateCurrentGraphic({ pixels: newPixels });
    }
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
    }
    if (!isDrawing) return;
    setIsDrawing(false);

    if (drawStartPos && hoverPos && currentGraphic) {
      const sx = drawStartPos.x;
      const sy = drawStartPos.y;
      const ex = hoverPos.x;
      const ey = hoverPos.y;
      const newPixels = currentGraphic.pixels.map((row) => [...row]);
      const color = selectedColorIndex;

      if (activeTool === "line") {
        bresenhamLine(sx, sy, ex, ey, (px, py) => {
          if (px >= 0 && px < currentGraphic.width && py >= 0 && py < currentGraphic.height) {
            newPixels[py][px] = color;
          }
        });
        pushHistory(newPixels);
        updateCurrentGraphic({ pixels: newPixels });
      } else if (activeTool === "rect" || activeTool === "rect_fill") {
        const minX = Math.min(sx, ex);
        const maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey);
        const maxY = Math.max(sy, ey);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (activeTool === "rect_fill" || x === minX || x === maxX || y === minY || y === maxY) {
              if (x >= 0 && x < currentGraphic.width && y >= 0 && y < currentGraphic.height) {
                newPixels[y][x] = color;
              }
            }
          }
        }
        pushHistory(newPixels);
        updateCurrentGraphic({ pixels: newPixels });
      } else if (activeTool === "circle" || activeTool === "circle_fill") {
        const rx = Math.abs(ex - sx);
        const ry = Math.abs(ey - sy);
        for (let y = sy - ry; y <= sy + ry; y++) {
          for (let x = sx - rx; x <= sx + rx; x++) {
            const normalized =
              Math.pow((x - sx) / (rx || 1), 2) + Math.pow((y - sy) / (ry || 1), 2);
            if (activeTool === "circle_fill" ? normalized <= 1.05 : Math.abs(normalized - 1.0) < 0.4) {
              if (x >= 0 && x < currentGraphic.width && y >= 0 && y < currentGraphic.height) {
                newPixels[y][x] = color;
              }
            }
          }
        }
        pushHistory(newPixels);
        updateCurrentGraphic({ pixels: newPixels });
      } else {
        // Record pencil/brush stroke in history
        pushHistory(currentGraphic.pixels);
      }
    }

    setDrawStartPos(null);
  };

  const applyPencilOrBrush = (grid: number[][], x: number, y: number, color: number) => {
    if (activeTool === "brush") {
      // 2x2 brush stroke
      for (let dy = 0; dy <= 1; dy++) {
        for (let dx = 0; dx <= 1; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < currentGraphic.width && py >= 0 && py < currentGraphic.height) {
            grid[py][px] = color;
          }
        }
      }
    } else {
      // 1x1 pencil stroke
      if (x >= 0 && x < currentGraphic.width && y >= 0 && y < currentGraphic.height) {
        grid[y][x] = color;
      }
    }
  };

  const floodFill = (
    grid: number[][],
    sx: number,
    sy: number,
    target: number,
    replacement: number,
    w: number,
    h: number
  ) => {
    if (target === replacement) return;
    const queue: Array<[number, number]> = [[sx, sy]];
    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      if (grid[y][x] === target) {
        grid[y][x] = replacement;
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }
  };

  // Image Transformation Utilities
  const handleFlipH = () => {
    const next = currentGraphic.pixels.map((row) => [...row].reverse());
    pushHistory(next);
    updateCurrentGraphic({ pixels: next });
  };

  const handleFlipV = () => {
    const next = [...currentGraphic.pixels].reverse().map((row) => [...row]);
    pushHistory(next);
    updateCurrentGraphic({ pixels: next });
  };

  const handleRotate90 = () => {
    const w = currentGraphic.width;
    const h = currentGraphic.height;
    const next: number[][] = [];
    for (let x = 0; x < w; x++) {
      const row: number[] = [];
      for (let y = h - 1; y >= 0; y--) {
        row.push(currentGraphic.pixels[y][x]);
      }
      next.push(row);
    }
    pushHistory(next);
    updateCurrentGraphic({ pixels: next });
  };

  const handleShift = (dx: number, dy: number) => {
    const w = currentGraphic.width;
    const h = currentGraphic.height;
    const next: number[][] = Array.from({ length: h }, () => Array(w).fill(0));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          next[ny][nx] = currentGraphic.pixels[y][x];
        }
      }
    }
    pushHistory(next);
    updateCurrentGraphic({ pixels: next });
  };

  const handleClear = () => {
    const w = currentGraphic.width;
    const h = currentGraphic.height;
    const empty = Array.from({ length: h }, () => Array(w).fill(0));
    pushHistory(empty);
    updateCurrentGraphic({ pixels: empty });
  };

  const updateCurrentGraphic = (partial: Partial<DivGraphic>, recordHistory: boolean = false) => {
    const updated = fpg.map((g) => {
      if (g.id === currentGraphic.id) {
        const next = { ...g, ...partial };
        if (typeof document !== "undefined") {
          next.canvas = createGraphicCanvas(next);
          try {
            next.dataUrl = next.canvas.toDataURL();
          } catch (e) {}
        }
        return next;
      }
      return g;
    });
    onUpdateFpg(updated);
  };

  const handleAddNewGraphic = () => {
    const maxId = fpg.reduce((max, g) => Math.max(max, g.id), 0);
    const newId = maxId + 1;
    const size = 16;
    const emptyPixels = Array.from({ length: size }, () => Array(size).fill(0));
    const newGraphic: DivGraphic = {
      id: newId,
      name: `sprite_${newId}`,
      width: size,
      height: size,
      cx: 8,
      cy: 8,
      cpoints: [{ x: 8, y: 8, id: 0 }],
      palette: DEFAULT_PALETTE,
      pixels: emptyPixels,
    };
    newGraphic.canvas = createGraphicCanvas(newGraphic);
    newGraphic.dataUrl = newGraphic.canvas.toDataURL();

    onUpdateFpg([...fpg, newGraphic]);
    setSelectedGraphicId(newId);
  };

  const handleDeleteCurrentGraphic = () => {
    if (fpg.length <= 1) return;
    const filtered = fpg.filter((g) => g.id !== currentGraphic.id);
    onUpdateFpg(filtered);
    setSelectedGraphicId(filtered[0]?.id || 1);
  };

  // Generador local de sprites en Pixel Art sin conexión a la nube
  const handleCancelAiSprite = () => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      aiAbortControllerRef.current = null;
    }
    setIsGeneratingAi(false);
    setAiError("Generación de sprite detenida.");
  };

  const handleGenerateAiSprite = async () => {
    if (!aiPrompt.trim() || isGeneratingAi) return;
    setIsGeneratingAi(true);
    setAiError("");

    const controller = new AbortController();
    aiAbortControllerRef.current = controller;

    try {
      const w = currentGraphic.width || 32;
      const h = currentGraphic.height || 32;
      const p = aiPrompt
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const nextPixels: number[][] = Array.from({ length: h }, () => Array(w).fill(0));
      const setPx = (x: number, y: number, c: number) => {
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (ix >= 0 && ix < w && iy >= 0 && iy < h) nextPixels[iy][ix] = c;
      };

      const fillDisc = (cx: number, cy: number, r: number, colorIdx: number, borderIdx = 0) => {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const d = Math.hypot(x - cx, y - cy);
            if (d <= r) {
              if (borderIdx && d >= r - 1.2) setPx(x, y, borderIdx);
              else setPx(x, y, colorIdx);
            }
          }
        }
      };

      const cx = (w - 1) / 2;
      const cy = (h - 1) / 2;
      const rBase = Math.max(4, Math.floor(Math.min(w, h) * 0.36));

      if (p.includes("moneda") || p.includes("coin") || p.includes("oro")) {
        fillDisc(cx, cy, rBase, 14, 6);
        fillDisc(cx, cy, rBase * 0.68, 14, 15);
        for (let y = Math.floor(cy - rBase * 0.35); y <= Math.ceil(cy + rBase * 0.35); y++) {
          setPx(cx, y, 6);
          setPx(cx - 1, y, 15);
        }
      } else if (p.includes("corazon") || p.includes("vida") || p.includes("salud")) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const nx = (x - cx) / (rBase * 1.15);
            const ny = (cy - y) / (rBase * 1.15) - 0.15;
            const eq = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny;
            if (eq <= 0) setPx(x, y, eq > -0.18 ? 4 : 12);
          }
        }
      } else if (p.includes("nave") || p.includes("cohete") || p.includes("avion")) {
        for (let y = Math.floor(h * 0.12); y < Math.floor(h * 0.85); y++) {
          const t = (y - h * 0.12) / (h * 0.73);
          const halfW = Math.max(1, Math.floor(t * rBase * 1.1));
          for (let x = Math.floor(cx - halfW); x <= Math.ceil(cx + halfW); x++) {
            setPx(x, y, Math.abs(x - cx) <= 2 ? 11 : t > 0.72 ? 4 : 9);
          }
        }
      } else if (p.includes("espada") || p.includes("arma") || p.includes("katana")) {
        for (let i = 3; i < Math.min(w, h) - 3; i++) {
          const x = i;
          const y = h - 1 - i;
          if (i < Math.min(w, h) * 0.3) {
            setPx(x, y, 6);
            setPx(x + 1, y, 6);
          } else {
            setPx(x, y, 15);
            setPx(x - 1, y, 7);
            setPx(x, y + 1, 7);
          }
        }
      } else {
        // Personaje / criatura simétrica amigable
        fillDisc(cx, cy - rBase * 0.2, rBase * 0.78, p.includes("verde") || p.includes("alien") ? 10 : 9, 1);
        for (let y = Math.floor(cy + rBase * 0.25); y < Math.floor(cy + rBase * 0.95); y++) {
          for (let x = Math.floor(cx - rBase * 0.6); x <= Math.ceil(cx + rBase * 0.6); x++) {
            setPx(x, y, p.includes("rojo") ? 4 : 3);
          }
        }
        setPx(cx - Math.max(2, Math.floor(rBase * 0.3)), cy - Math.floor(rBase * 0.25), 15);
        setPx(cx + Math.max(2, Math.floor(rBase * 0.3)), cy - Math.floor(rBase * 0.25), 15);
      }

      if (controller.signal.aborted) return;

      pushHistory(nextPixels);
      updateCurrentGraphic({
        pixels: nextPixels,
        palette: DEFAULT_PALETTE,
        name: aiPrompt.trim().slice(0, 18) || currentGraphic.name,
      });
      setAiPrompt("");
    } catch (err: any) {
      setAiError(err.message || "Error al generar sprite local");
    } finally {
      if (!controller.signal.aborted) {
        setIsGeneratingAi(false);
        aiAbortControllerRef.current = null;
      }
    }
  };

  const handleDownloadPng = () => {
    if (!currentGraphic.canvas) return;
    const a = document.createElement("a");
    a.href = currentGraphic.canvas.toDataURL();
    a.download = `${currentGraphic.name}_graph_${currentGraphic.id}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-white border-b border-[#E2E8F0] text-xs gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FDF2F5] text-[#7C2D48] flex items-center justify-center flex-shrink-0">
            <Crosshair className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-[#111827] block truncate">Editor Pixel Art</span>
            <span className="text-[11px] text-[#6B7280] font-mono">
              ID {currentGraphic?.id} · {currentGraphic?.width}×{currentGraphic?.height} px
            </span>
          </div>
        </div>

        {/* Undo / Redo & Transformations */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="min-w-[36px] min-h-[36px] px-2 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 disabled:opacity-35 text-[#111827] flex items-center justify-center cursor-pointer"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="min-w-[36px] min-h-[36px] px-2 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 disabled:opacity-35 text-[#111827] flex items-center justify-center cursor-pointer"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="hidden sm:block h-5 w-px bg-[#E2E8F0] mx-0.5" />

          <button
            type="button"
            onClick={handleFlipH}
            className="min-w-[36px] min-h-[36px] px-2 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] flex items-center justify-center cursor-pointer"
            title="Espejo horizontal"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleFlipV}
            className="min-w-[36px] min-h-[36px] px-2 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] flex items-center justify-center cursor-pointer"
            title="Espejo vertical"
          >
            <FlipVertical className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRotate90}
            className="min-w-[36px] min-h-[36px] px-2 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] flex items-center justify-center cursor-pointer"
            title="Rotar 90 grados"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="hidden md:flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={() => handleShift(0, -1)}
              className="min-w-[32px] min-h-[36px] px-1.5 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] flex items-center justify-center cursor-pointer"
              title="Desplazar arriba"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleShift(0, 1)}
              className="min-w-[32px] min-h-[36px] px-1.5 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] flex items-center justify-center cursor-pointer"
              title="Desplazar abajo"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleShift(-1, 0)}
              className="min-w-[32px] min-h-[36px] px-1.5 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] flex items-center justify-center cursor-pointer"
              title="Desplazar izquierda"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleShift(1, 0)}
              className="min-w-[32px] min-h-[36px] px-1.5 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] flex items-center justify-center cursor-pointer"
              title="Desplazar derecha"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="min-h-[36px] px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs cursor-pointer whitespace-nowrap"
            title="Limpiar lienzo"
          >
            Limpiar
          </button>
        </div>

        {/* Global Sprite Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAddNewGraphic}
            className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] border border-[#E2E8F0] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PNG</span>
          </button>
          {fpg.length > 1 && (
            <button
              type="button"
              onClick={handleDeleteCurrentGraphic}
              className="min-w-[36px] min-h-[36px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Eliminar sprite"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile View Switcher */}
      <div className="flex md:hidden border-b border-[#E2E8F0] bg-white px-2 py-1.5 gap-1.5 flex-shrink-0">
        {[
          { id: "canvas" as const, label: "Lienzo" },
          { id: "tools" as const, label: "Herramientas e IA" },
          { id: "fpg" as const, label: `Sprites (${fpg.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors ${
              mobileTab === tab.id
                ? "bg-[#7C2D48] text-white"
                : "bg-[#F1F5F9] text-[#4B5563]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 min-h-0 w-full flex flex-col md:flex-row overflow-hidden">
        {/* Left Toolbar & Palette Sidebar */}
        <div
          className={`${
            mobileTab === "tools" ? "flex w-full" : "hidden"
          } md:flex md:w-64 p-3 bg-white border-r border-[#E2E8F0] flex-col gap-3.5 overflow-y-auto shrink-0 text-xs`}
        >
          {/* Tool Selector */}
          <div>
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
              Herramientas de Dibujo
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "pencil" as const, label: "Lápiz", icon: Paintbrush },
                { id: "brush" as const, label: "Pincel", icon: SquareIcon },
                { id: "eraser" as const, label: "Borrar", icon: Eraser },
                { id: "bucket" as const, label: "Rellenar", icon: PaintBucket },
                { id: "line" as const, label: "Línea", icon: Minus },
                { id: "rect" as const, label: "Caja", icon: SquareIcon },
                { id: "rect_fill" as const, label: "Relleno", icon: SquareIcon },
                { id: "circle" as const, label: "Círculo", icon: CircleIcon },
                { id: "pipette" as const, label: "Pipeta", icon: Pipette },
              ].map((tool) => {
                const Icon = tool.icon;
                const active = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      setActiveTool(tool.id);
                      setMobileTab("canvas");
                    }}
                    className={`min-h-[40px] flex flex-col sm:flex-row items-center justify-center gap-1 p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? "bg-[#FDF2F5] border-[#7C2D48] text-[#7C2D48] font-bold"
                        : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563] hover:border-[#CBD5E1]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{tool.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setActiveTool("cpoint");
                  setMobileTab("canvas");
                }}
                className={`col-span-3 min-h-[40px] flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-colors cursor-pointer ${
                  activeTool === "cpoint"
                    ? "bg-[#FDF2F5] border-[#7C2D48] text-[#7C2D48] font-bold"
                    : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563] hover:border-[#CBD5E1]"
                }`}
                title="Punto de control central (rotación y coordenadas)"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span className="text-[11px]">CPoint (Centro de rotación)</span>
              </button>
            </div>
          </div>

          {/* Shift Nudges visible in tools tab for mobile */}
          <div className="md:hidden pt-2 border-t border-[#E2E8F0]">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1.5">
              Mover Píxeles (1px)
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleShift(-1, 0)}
                className="min-h-[40px] rounded-lg bg-[#F1F5F9] text-[#111827] flex items-center justify-center cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleShift(0, -1)}
                className="min-h-[40px] rounded-lg bg-[#F1F5F9] text-[#111827] flex items-center justify-center cursor-pointer"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleShift(0, 1)}
                className="min-h-[40px] rounded-lg bg-[#F1F5F9] text-[#111827] flex items-center justify-center cursor-pointer"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleShift(1, 0)}
                className="min-h-[40px] rounded-lg bg-[#F1F5F9] text-[#111827] flex items-center justify-center cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                Paleta (16 Colores)
              </span>
              <span className="text-[11px] text-[#7C2D48] font-mono font-bold">#{selectedColorIndex}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#0F172A] rounded-xl border border-[#CBD5E1]">
              {DEFAULT_PALETTE.map((color, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedColorIndex(idx)}
                  className={`h-9 rounded-md transition-transform relative cursor-pointer ${
                    selectedColorIndex === idx ? "scale-105 ring-2 ring-white z-10" : ""
                  }`}
                  style={{
                    backgroundColor: idx === 0 ? "transparent" : color,
                    backgroundImage:
                      idx === 0
                        ? "repeating-linear-gradient(45deg, #334155 0, #334155 3px, #1e293b 0, #1e293b 6px)"
                        : undefined,
                  }}
                  title={idx === 0 ? "Transparente (Color 0)" : `Color ${idx}: ${color}`}
                >
                  {selectedColorIndex === idx && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white drop-shadow" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* View controls */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs text-[#4B5563]">
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 border font-semibold cursor-pointer ${
                showGrid
                  ? "bg-[#FDF2F5] border-[#7C2D48] text-[#7C2D48]"
                  : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563]"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Cuadrícula</span>
            </button>

            <div className="flex items-center gap-1 font-mono">
              <button
                type="button"
                onClick={() => setCanvasScale(Math.max(256, canvasScale - 64))}
                className="w-8 h-8 bg-[#F1F5F9] rounded-lg hover:bg-slate-200 text-[#111827] font-bold cursor-pointer"
              >
                -
              </button>
              <span className="w-11 text-center font-semibold">{canvasScale}</span>
              <button
                type="button"
                onClick={() => setCanvasScale(Math.min(448, canvasScale + 64))}
                className="w-8 h-8 bg-[#F1F5F9] rounded-lg hover:bg-slate-200 text-[#111827] font-bold cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* AI Pixel Art Generator */}
          <div className="mt-auto pt-3 border-t border-[#E2E8F0]">
            <div className="flex items-center gap-1.5 text-[#111827] font-bold mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#7C2D48]" />
              <span>Generar Pixel Art con IA</span>
            </div>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ej: nave dorada, moneda retro..."
              className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#F7F8FA] border border-[#CBD5E1] text-[#111827] text-xs outline-none focus:border-[#7C2D48] mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerateAiSprite();
              }}
            />
            {isGeneratingAi ? (
              <button
                type="button"
                onClick={handleCancelAiSprite}
                className="w-full min-h-[40px] py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer"
              >
                <SquareIcon className="w-3 h-3 fill-current" />
                <span>Parar Generación</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerateAiSprite}
                disabled={!aiPrompt.trim()}
                className="w-full min-h-[40px] py-1.5 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 text-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Crear Pixel Art</span>
              </button>
            )}
            {aiError && <p className="text-[11px] text-rose-600 mt-1">{aiError}</p>}
          </div>
        </div>

        {/* Center Drawing Canvas + Sticky Mobile Quick Strip */}
        <div
          className={`${
            mobileTab === "canvas" ? "flex" : "hidden"
          } md:flex flex-1 min-h-0 flex-col bg-[#F7F8FA] overflow-hidden`}
        >
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 sm:p-4 overflow-auto">
            <div className="relative p-2 bg-[#0F172A] rounded-2xl border border-[#CBD5E1] shadow-md max-w-full">
              <canvas
                ref={canvasRef}
                width={canvasScale}
                height={canvasScale}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="cursor-crosshair border border-slate-700 rounded-lg block touch-none max-w-full h-auto aspect-square"
                style={{ width: `min(100%, ${canvasScale}px)`, height: "auto" }}
              />
            </div>

            <div className="mt-2 text-xs text-[#4B5563] flex flex-wrap items-center justify-center gap-2 font-mono">
              {hoverPos && (
                <span className="text-[#7C2D48] font-bold">
                  Píxel: ({hoverPos.x}, {hoverPos.y})
                </span>
              )}
              <span>·</span>
              <span>Centro: ({currentGraphic.cx}, {currentGraphic.cy})</span>
            </div>
          </div>

          {/* Mobile Sticky Quick Tool & Palette Bar directly under Canvas */}
          <div className="md:hidden bg-white border-t border-[#E2E8F0] px-2.5 py-2 flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "pencil" as const, label: "Lápiz", icon: Paintbrush },
                { id: "brush" as const, label: "Pincel", icon: SquareIcon },
                { id: "eraser" as const, label: "Borrar", icon: Eraser },
                { id: "bucket" as const, label: "Bote", icon: PaintBucket },
                { id: "pipette" as const, label: "Pipeta", icon: Pipette },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTool(t.id)}
                    className={`min-h-[36px] px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 flex-shrink-0 border cursor-pointer ${
                      active
                        ? "bg-[#7C2D48] border-[#7C2D48] text-white"
                        : "bg-[#F7F8FA] border-[#E2E8F0] text-[#374151]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {DEFAULT_PALETTE.map((color, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedColorIndex(idx)}
                  className={`w-8 h-8 rounded-lg flex-shrink-0 border transition-transform cursor-pointer ${
                    selectedColorIndex === idx
                      ? "ring-2 ring-[#7C2D48] scale-105 border-white"
                      : "border-[#CBD5E1]"
                  }`}
                  style={{
                    backgroundColor: idx === 0 ? "transparent" : color,
                    backgroundImage:
                      idx === 0
                        ? "repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 4px, #f8fafc 0, #f8fafc 8px)"
                        : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right FPG Reel Sidebar */}
        <div
          className={`${
            mobileTab === "fpg" ? "flex w-full" : "hidden"
          } md:flex md:w-60 p-3 bg-white border-t md:border-t-0 md:border-l border-[#E2E8F0] flex-col gap-2.5 overflow-y-auto shrink-0`}
        >
          <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
            Librería FPG ({fpg.length})
          </span>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-2 gap-2">
            {fpg.map((g) => {
              const isSelected = g.id === selectedGraphicId;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setSelectedGraphicId(g.id);
                    setMobileTab("canvas");
                  }}
                  className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FDF2F5] border-[#7C2D48] ring-1 ring-[#7C2D48]"
                      : "bg-[#F7F8FA] border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="w-12 h-12 bg-[#0F172A] rounded-lg flex items-center justify-center border border-[#CBD5E1] mb-1 overflow-hidden">
                    {g.dataUrl ? (
                      <img
                        src={g.dataUrl}
                        alt={g.name}
                        className="w-10 h-10 object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">#{g.id}</span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-[#111827] font-mono truncate w-full text-center">
                    {g.name}
                  </span>
                  <span className="text-[10px] text-[#6B7280] font-mono">graph {g.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
