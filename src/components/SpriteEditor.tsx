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
import { getAiHeaders, getEffectiveApiKey } from "../services/aiConfig";

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

  // Undo / Redo history
  const [history, setHistory] = useState<number[][][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");

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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !currentGraphic) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pixelSize = canvasRef.current.width / currentGraphic.width;
    const px = Math.floor((e.clientX - rect.left) / pixelSize);
    const py = Math.floor((e.clientY - rect.top) / pixelSize);

    if (px < 0 || px >= currentGraphic.width || py < 0 || py >= currentGraphic.height) return;

    setIsDrawing(true);
    setDrawStartPos({ x: px, y: py });

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

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !currentGraphic) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pixelSize = canvasRef.current.width / currentGraphic.width;
    const px = Math.floor((e.clientX - rect.left) / pixelSize);
    const py = Math.floor((e.clientY - rect.top) / pixelSize);

    setHoverPos({ x: px, y: py });

    if (!isDrawing) return;
    if (px < 0 || px >= currentGraphic.width || py < 0 || py >= currentGraphic.height) return;

    if (activeTool === "pencil" || activeTool === "brush" || activeTool === "eraser") {
      const newPixels = currentGraphic.pixels.map((row) => [...row]);
      applyPencilOrBrush(newPixels, px, py, activeTool === "eraser" ? 0 : selectedColorIndex);
      updateCurrentGraphic({ pixels: newPixels });
    }
  };

  const handleMouseUp = () => {
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

  // AI Sprite Generation using Gemini
  const handleGenerateAiSprite = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setAiError("");

    try {
      const customKey = getEffectiveApiKey();
      const res = await fetch("/api/gemini/generate-sprite", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          prompt: aiPrompt,
          size: currentGraphic.width,
          name: currentGraphic.name,
          apiKey: customKey || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fallo en la generación");
      }

      const data = await res.json();
      if (data.pixels && Array.isArray(data.pixels)) {
        pushHistory(data.pixels);
        updateCurrentGraphic({
          pixels: data.pixels,
          palette: data.palette || DEFAULT_PALETTE,
          name: data.name || currentGraphic.name,
        });
        setAiPrompt("");
      }
    } catch (err: any) {
      setAiError(err.message || "Error al generar sprite con IA");
    } finally {
      setIsGeneratingAi(false);
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
    <div className="flex flex-col h-full bg-[#080d1a] border border-slate-800 rounded-lg overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0d1527] border-b border-slate-800 text-xs text-slate-300 gap-2">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100 font-mono">EDITOR PAINT DE SPRITES</span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 text-[10px] font-mono">
            ID {currentGraphic?.id} • {currentGraphic?.width}x{currentGraphic?.height} px
          </span>
        </div>

        {/* Undo / Redo & Transformations */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          <button
            onClick={handleFlipH}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Espejo horizontal"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFlipV}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Espejo vertical"
          >
            <FlipVertical className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRotate90}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Rotar 90 grados"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Shift direction buttons */}
          <button
            onClick={() => handleShift(0, -1)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Desplazar arriba"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleShift(0, 1)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Desplazar abajo"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleShift(-1, 0)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Desplazar izquierda"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleShift(1, 0)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Desplazar derecha"
          >
            <ArrowRight className="w-3 h-3" />
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          <button
            onClick={handleClear}
            className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 text-rose-300 text-[11px]"
            title="Limpiar lienzo"
          >
            Limpiar
          </button>
        </div>

        {/* Global Sprite Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAddNewGraphic}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nuevo</span>
          </button>
          <button
            onClick={handleDownloadPng}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar PNG</span>
          </button>
          {fpg.length > 1 && (
            <button
              onClick={handleDeleteCurrentGraphic}
              className="p-1.5 rounded bg-slate-800 hover:bg-rose-950/60 text-rose-400 transition-colors"
              title="Eliminar sprite"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Toolbar & Palette Sidebar */}
        <div className="w-full md:w-60 p-3 bg-[#0a1020] border-r border-slate-800 flex flex-col gap-3.5 overflow-y-auto text-xs">
          {/* Tool Selector */}
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
              Herramientas de Dibujo
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setActiveTool("pencil")}
                className={`flex items-center justify-center gap-1.5 p-1.5 rounded border transition-colors ${
                  activeTool === "pencil"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Lápiz de 1 píxel"
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span className="text-[11px]">Lápiz</span>
              </button>

              <button
                onClick={() => setActiveTool("brush")}
                className={`flex items-center justify-center gap-1.5 p-1.5 rounded border transition-colors ${
                  activeTool === "brush"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Pincel grueso 2x2"
              >
                <div className="w-2.5 h-2.5 bg-current rounded-sm" />
                <span className="text-[11px]">Pincel</span>
              </button>

              <button
                onClick={() => setActiveTool("eraser")}
                className={`flex items-center justify-center gap-1.5 p-1.5 rounded border transition-colors ${
                  activeTool === "eraser"
                    ? "bg-rose-950 border-rose-500 text-rose-300 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Borrador transparente"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="text-[11px]">Borrar</span>
              </button>

              <button
                onClick={() => setActiveTool("bucket")}
                className={`flex items-center justify-center gap-1.5 p-1.5 rounded border transition-colors ${
                  activeTool === "bucket"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Relleno de área (Bote de pintura)"
              >
                <PaintBucket className="w-3.5 h-3.5" />
                <span className="text-[11px]">Rellenar</span>
              </button>

              <button
                onClick={() => setActiveTool("line")}
                className={`flex items-center justify-center gap-1.5 p-1.5 rounded border transition-colors ${
                  activeTool === "line"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Línea recta"
              >
                <Minus className="w-3.5 h-3.5" />
                <span className="text-[11px]">Línea</span>
              </button>

              <button
                onClick={() => setActiveTool("rect")}
                className={`flex items-center justify-center gap-1.5 p-1.5 rounded border transition-colors ${
                  activeTool === "rect"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Rectángulo hueco"
              >
                <SquareIcon className="w-3.5 h-3.5" />
                <span className="text-[11px]">Caja</span>
              </button>

              <button
                onClick={() => setActiveTool("rect_fill")}
                className={`flex items-center justify-center gap-1.5 p-1.5 rounded border transition-colors ${
                  activeTool === "rect_fill"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Rectángulo relleno"
              >
                <div className="w-3 h-3 bg-current rounded-none" />
                <span className="text-[11px]">Caja llena</span>
              </button>

              <button
                onClick={() => setActiveTool("circle")}
                className={`flex items-center justify-center gap-1.5 p-1.5 rounded border transition-colors ${
                  activeTool === "circle"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Círculo contorno"
              >
                <CircleIcon className="w-3.5 h-3.5" />
                <span className="text-[11px]">Círculo</span>
              </button>

              <button
                onClick={() => setActiveTool("pipette")}
                className={`flex items-center justify-center gap-1.5 p-1.5 rounded border transition-colors ${
                  activeTool === "pipette"
                    ? "bg-amber-950 border-amber-500 text-amber-300 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Cuentagotas (Seleccionar color del lienzo)"
              >
                <Pipette className="w-3.5 h-3.5" />
                <span className="text-[11px]">Pipeta</span>
              </button>

              <button
                onClick={() => setActiveTool("cpoint")}
                className={`col-span-3 flex items-center justify-center gap-1.5 p-1.5 rounded border transition-colors ${
                  activeTool === "cpoint"
                    ? "bg-rose-950 border-rose-500 text-rose-300 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Punto de control central (rotación y coordenadas)"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span className="text-[11px]">CPoint (Centro de rotación)</span>
              </button>
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Paleta DIV (16 Colores)
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">Color #{selectedColorIndex}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-900 rounded border border-slate-800">
              {DEFAULT_PALETTE.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedColorIndex(idx)}
                  className={`h-7 rounded transition-transform relative ${
                    selectedColorIndex === idx ? "scale-105 ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-900" : ""
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
                      <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* View controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2 py-1 rounded flex items-center gap-1 border ${
                showGrid ? "bg-cyan-950 border-cyan-500 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Cuadrícula</span>
            </button>

            <div className="flex items-center gap-1 font-mono">
              <button
                onClick={() => setCanvasScale(Math.max(256, canvasScale - 64))}
                className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-white"
              >
                -
              </button>
              <span className="w-10 text-center">{canvasScale}px</span>
              <button
                onClick={() => setCanvasScale(Math.min(448, canvasScale + 64))}
                className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-white"
              >
                +
              </button>
            </div>
          </div>

          {/* AI Pixel Art Generator */}
          <div className="mt-auto pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-1 text-slate-300 font-semibold mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Generar con IA (Gemini)</span>
            </div>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ej: nave espacial dorada, calavera retro..."
              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-400 mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerateAiSprite();
              }}
            />
            <button
              onClick={handleGenerateAiSprite}
              disabled={isGeneratingAi || !aiPrompt.trim()}
              className="w-full py-1.5 rounded bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 text-xs"
            >
              {isGeneratingAi ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Generando matriz...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>Crear Pixel Art</span>
                </>
              )}
            </button>
            {aiError && <p className="text-[10px] text-rose-400 mt-1">{aiError}</p>}
          </div>
        </div>

        {/* Center Drawing Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#050811] p-4 relative overflow-auto">
          <div className="relative p-2 bg-[#0d1424] rounded-lg border border-slate-800 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={canvasScale}
              height={canvasScale}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-crosshair border border-slate-700/60 rounded block"
              style={{ width: `${canvasScale}px`, height: `${canvasScale}px` }}
            />
          </div>

          <div className="mt-2 text-xs text-slate-400 flex items-center gap-3 font-mono">
            {hoverPos && (
              <span className="text-cyan-400">
                Píxel: ({hoverPos.x}, {hoverPos.y})
              </span>
            )}
            <span>•</span>
            <span>Centro (cx, cy): ({currentGraphic.cx}, {currentGraphic.cy})</span>
          </div>
        </div>

        {/* Right FPG Reel Sidebar */}
        <div className="w-full md:w-64 p-3 bg-[#0a1020] border-l border-slate-800 flex flex-col gap-2 overflow-y-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
            Librería FPG ({fpg.length} Sprites)
          </span>

          <div className="grid grid-cols-2 gap-2">
            {fpg.map((g) => {
              const isSelected = g.id === selectedGraphicId;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGraphicId(g.id)}
                  className={`flex flex-col items-center p-2 rounded border transition-all ${
                    isSelected
                      ? "bg-slate-800 border-cyan-400 shadow-md ring-1 ring-cyan-400"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="w-12 h-12 bg-slate-950 rounded flex items-center justify-center border border-slate-800/80 mb-1 overflow-hidden">
                    {g.dataUrl ? (
                      <img
                        src={g.dataUrl}
                        alt={g.name}
                        className="w-10 h-10 object-contain pixelated"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-600">ID {g.id}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-200 font-mono truncate w-full text-center">
                    {g.name}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">graph = {g.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
