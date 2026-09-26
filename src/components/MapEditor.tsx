import React, { useState, useRef, useEffect } from "react";
import {
  FileImage,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Paintbrush,
  Eraser,
  PaintBucket,
  Crosshair,
  Code,
  Check,
  ZoomIn,
  ZoomOut,
  Layers,
  ArrowRight,
  Package,
  RotateCcw,
  CheckCircle2,
  Grid,
} from "lucide-react";
import { DivGraphic } from "../types";
import { DivRuntime } from "../engine/runtime";
import { DivMapFile, DivFpgPackage, createNewDivGraphic, fileToDivGraphic } from "../engine/fpgManager";
import { DEFAULT_PALETTE, createGraphicCanvas } from "../engine/graphics";

interface MapEditorProps {
  runtime?: DivRuntime;
  onInsertCode?: (codeSnippet: string) => void;
}

export const MapEditor: React.FC<MapEditorProps> = ({ runtime, onInsertCode }) => {
  const [mapFiles, setMapFiles] = useState<DivMapFile[]>(() =>
    runtime?.mapFiles ? Array.from(runtime.mapFiles.values()) : []
  );
  const [selectedMapId, setSelectedMapId] = useState<number>(() => {
    return runtime?.mapFiles ? (Array.from(runtime.mapFiles.keys())[0] ?? 100) : 100;
  });

  const activeMap = mapFiles.find((m) => m.id === selectedMapId) || mapFiles[0];

  // Tool state
  const [currentTool, setCurrentTool] = useState<"pencil" | "eraser" | "bucket">("pencil");
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(7); // Cyan by default
  const [zoom, setZoom] = useState<number>(4);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Map Modal
  const [isNewMapModalOpen, setIsNewMapModalOpen] = useState(false);
  const [newMapFilename, setNewMapFilename] = useState("");
  const [newMapName, setNewMapName] = useState("");
  const [newMapW, setNewMapW] = useState(160);
  const [newMapH, setNewMapH] = useState(120);

  // Transfer to FPG Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetFpgId, setTargetFpgId] = useState<number>(0);
  const [targetSpriteId, setTargetSpriteId] = useState<number>(100);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const syncToRuntime = (updatedMaps: DivMapFile[]) => {
    setMapFiles(updatedMaps);
    updatedMaps.forEach((m) => {
      runtime.mapFiles.set(m.id, m);
    });
  };

  // Re-draw active map onto canvas
  useEffect(() => {
    if (!canvasRef.current || !activeMap) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const g = activeMap.graphic;
    canvas.width = g.width;
    canvas.height = g.height;
    ctx.imageSmoothingEnabled = false;

    // Clear
    ctx.clearRect(0, 0, g.width, g.height);

    const palette = g.palette || DEFAULT_PALETTE;

    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        const colorIdx = g.pixels[y]?.[x] ?? 0;
        if (colorIdx !== 0) {
          ctx.fillStyle = palette[colorIdx] || "#ffffff";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Refresh dataUrl & memory canvas
    g.canvas = createGraphicCanvas(g);
    try {
      g.dataUrl = g.canvas.toDataURL();
    } catch (e) {}
  }, [activeMap, activeMap?.graphic?.pixels]);

  // Create new map
  const handleCreateMap = () => {
    if (!newMapFilename.trim()) return;
    const cleanFn = newMapFilename.trim().toLowerCase().endsWith(".map")
      ? newMapFilename.trim().toLowerCase()
      : `${newMapFilename.trim().toLowerCase()}.map`;

    const nextId = Math.max(100, ...mapFiles.map((m) => m.id)) + 1;
    const graphic = createNewDivGraphic(
      nextId,
      newMapName.trim() || cleanFn.replace(".map", ""),
      newMapW,
      newMapH,
      "checker"
    );

    const newMap: DivMapFile = {
      id: nextId,
      name: newMapName.trim() || cleanFn.replace(".map", ""),
      filename: cleanFn,
      description: "Mapa gráfico individual .MAP",
      graphic,
    };

    const updated = [...mapFiles, newMap];
    syncToRuntime(updated);
    setSelectedMapId(nextId);
    setIsNewMapModalOpen(false);
    setNewMapFilename("");
    setNewMapName("");
    showToast(`Archivo "${cleanFn}" creado`);
  };

  // Delete map
  const handleDeleteMap = (id: number) => {
    if (mapFiles.length <= 1) {
      showToast("Debe haber al menos un archivo .map en el proyecto");
      return;
    }
    const updated = mapFiles.filter((m) => m.id !== id);
    syncToRuntime(updated);
    runtime.unload_map(id);
    setSelectedMapId(updated[0].id);
    showToast("Archivo .map eliminado");
  };

  // Import PNG/JPG to current or new map
  const handleImportPng = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const nextId = Math.max(100, ...mapFiles.map((m) => m.id)) + 1;
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      const cleanFn = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.map`;

      const graphic = await fileToDivGraphic(file, nextId, cleanName, 640, 480);
      const newMap: DivMapFile = {
        id: nextId,
        name: cleanName,
        filename: cleanFn,
        description: `Importado de imagen ${file.name}`,
        graphic,
      };

      const updated = [...mapFiles, newMap];
      syncToRuntime(updated);
      setSelectedMapId(nextId);
      showToast(`Imagen convertida a mapa "${cleanFn}" (${graphic.width}x${graphic.height} px)`);
    } catch (err) {
      showToast("Error al importar la imagen");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Pixel drawing handlers
  const handlePixelAction = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !activeMap) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = activeMap.graphic.width / rect.width;
    const scaleY = activeMap.graphic.height / rect.height;

    const px = Math.floor((clientX - rect.left) * scaleX);
    const py = Math.floor((clientY - rect.top) * scaleY);

    if (px < 0 || px >= activeMap.graphic.width || py < 0 || py >= activeMap.graphic.height) {
      return;
    }

    const currentPixels = activeMap.graphic.pixels.map((r) => [...r]);

    if (currentTool === "pencil") {
      if (currentPixels[py][px] !== selectedColorIndex) {
        currentPixels[py][px] = selectedColorIndex;
        updatePixels(currentPixels);
      }
    } else if (currentTool === "eraser") {
      if (currentPixels[py][px] !== 0) {
        currentPixels[py][px] = 0;
        updatePixels(currentPixels);
      }
    } else if (currentTool === "bucket") {
      const targetColor = currentPixels[py][px];
      if (targetColor !== selectedColorIndex) {
        floodFill(currentPixels, px, py, targetColor, selectedColorIndex);
        updatePixels(currentPixels);
      }
    }
  };

  const updatePixels = (newPixels: number[][]) => {
    if (!activeMap) return;
    const updatedGraphic: DivGraphic = {
      ...activeMap.graphic,
      pixels: newPixels,
    };
    const updated = mapFiles.map((m) =>
      m.id === activeMap.id ? { ...m, graphic: updatedGraphic } : m
    );
    syncToRuntime(updated);
  };

  // Flood fill algorithm
  const floodFill = (
    pixels: number[][],
    startX: number,
    startY: number,
    target: number,
    replacement: number
  ) => {
    const w = activeMap.graphic.width;
    const h = activeMap.graphic.height;
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(w * h);

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const idx = y * w + x;
      if (x < 0 || x >= w || y < 0 || y >= h || visited[idx]) continue;
      if (pixels[y][x] !== target) continue;

      visited[idx] = 1;
      pixels[y][x] = replacement;

      queue.push([x + 1, y]);
      queue.push([x - 1, y]);
      queue.push([x, y + 1]);
      queue.push([x, y - 1]);
    }
  };

  // Transfer Map into an FPG package
  const handleTransferToFpg = () => {
    if (!activeMap) return;
    const targetPkg = runtime?.fpgPackages?.get(targetFpgId);
    if (!targetPkg) return;

    const clonedGraphic: DivGraphic = {
      ...activeMap.graphic,
      id: targetSpriteId,
      name: activeMap.name,
      pixels: activeMap.graphic.pixels.map((r) => [...r]),
      palette: [...activeMap.graphic.palette],
    };
    clonedGraphic.canvas = createGraphicCanvas(clonedGraphic);
    clonedGraphic.dataUrl = clonedGraphic.canvas.toDataURL();

    // Check if ID already exists, replace or append
    const existingIdx = targetPkg.graphics.findIndex((g) => g.id === targetSpriteId);
    if (existingIdx >= 0) {
      targetPkg.graphics[existingIdx] = clonedGraphic;
    } else {
      targetPkg.graphics.push(clonedGraphic);
    }

    if (targetFpgId === 0) {
      runtime.loadFPG(targetPkg.graphics);
    }

    setIsTransferModalOpen(false);
    showToast(`Mapa añadido a "${targetPkg.filename}" con ID #${targetSpriteId}`);
  };

  // Export .map
  const handleExportMap = () => {
    if (!activeMap) return;
    const exportData = {
      divVersion: "DIV_3.0_MAP",
      filename: activeMap.filename,
      name: activeMap.name,
      width: activeMap.graphic.width,
      height: activeMap.graphic.height,
      cx: activeMap.graphic.cx,
      cy: activeMap.graphic.cy,
      cpoints: activeMap.graphic.cpoints,
      palette: activeMap.graphic.palette,
      pixels: activeMap.graphic.pixels,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeMap.filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Archivo "${activeMap.filename}" descargado`);
  };

  // DIV code snippet
  const divSnippet = activeMap
    ? `// Carga y control de mapa individual .MAP en DIV Games Studio
GLOBAL
  mapa_${activeMap.name.toLowerCase().replace(/[^a-z0-9]/g, "_")} = 0;

BEGIN
  // Cargar el mapa gráfico individual en memoria (retorna el ID asignado)
  mapa_${activeMap.name.toLowerCase().replace(/[^a-z0-9]/g, "_")} = load_map("${activeMap.filename}");

  // Ejemplo 1: Asignar a un proceso independiente
  fondo_pantalla();

  // Ejemplo 2: Asignar a un plano de scroll parallax
  // start_scroll(0, 0, mapa_${activeMap.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}, 0, 0, 0);
END

PROCESS fondo_pantalla()
BEGIN
  file = 0; // Gráfico individual en memoria
  graph = mapa_${activeMap.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}; // ID del mapa cargado
  x = ${Math.floor(activeMap.graphic.width / 2)};
  y = ${Math.floor(activeMap.graphic.height / 2)};

  LOOP
    FRAME;
  END
END`
    : "";

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(divSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    showToast("Código DIV copiado al portapapeles");
  };

  const handleInsertSnippet = () => {
    if (onInsertCode) {
      onInsertCode(`\n${divSnippet}\n`);
      showToast("Código DIV insertado en el editor");
    }
  };

  const palette = activeMap?.graphic?.palette || DEFAULT_PALETTE;

  return (
    <div className="flex flex-col h-full bg-[#060913] text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#090e1a] border-b border-slate-800 gap-3">
        {/* Left: Map files pill list */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-2xl scrollbar-thin">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mr-2 shrink-0">
            <FileImage className="w-4 h-4" />
            <span>ARCHIVOS .MAP:</span>
          </div>

          {mapFiles.map((m) => {
            const isSelected = m.id === selectedMapId;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMapId(m.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all shrink-0 ${
                  isSelected
                    ? "bg-emerald-600/30 text-emerald-200 border border-emerald-500/60 shadow-sm shadow-emerald-950"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <FileImage className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-400" : "text-slate-500"}`} />
                <span className="font-semibold">{m.filename}</span>
                <span className="text-[10px] text-slate-500">
                  {m.graphic.width}x{m.graphic.height}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setIsNewMapModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-900 text-slate-300 hover:text-emerald-300 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-emerald-500/50 shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nuevo .map</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Import image to map */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportPng}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium transition-colors"
            title="Convertir imagen externa PNG/JPG a archivo .map"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Imagen</span>
          </button>

          {/* Transfer to FPG */}
          <button
            onClick={() => {
              const mainPkg = runtime?.fpgPackages?.get(0);
              const nextId = mainPkg ? Math.max(0, ...mainPkg.graphics.map((g) => g.id)) + 1 : 100;
              setTargetSpriteId(nextId);
              setIsTransferModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 text-xs font-medium transition-colors"
            title="Copiar este mapa individual dentro de un paquete .FPG"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Añadir a FPG...</span>
          </button>

          {/* Export Map */}
          <button
            onClick={handleExportMap}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Descargar archivo .map"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar .map</span>
          </button>

          {/* Delete Map */}
          {activeMap && (
            <button
              onClick={() => handleDeleteMap(activeMap.id)}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
              title={`Eliminar ${activeMap.filename}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Body: Canvas Left & Sidebar Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Pixel Drawing Workspace */}
        <div className="flex-1 flex flex-col bg-[#070b16] min-w-0">
          {/* Canvas Toolbar: Tools, Zoom, Grid, Clear */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#0a0f1d] border-b border-slate-800 gap-4">
            {/* Tools (Pencil, Eraser, Bucket) */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setCurrentTool("pencil")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  currentTool === "pencil"
                    ? "bg-emerald-600 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Lápiz de píxeles"
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span>Lápiz</span>
              </button>

              <button
                onClick={() => setCurrentTool("eraser")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  currentTool === "eraser"
                    ? "bg-emerald-600 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Borrador transparente"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Goma</span>
              </button>

              <button
                onClick={() => setCurrentTool("bucket")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  currentTool === "bucket"
                    ? "bg-emerald-600 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Bote de pintura / Relleno"
              >
                <PaintBucket className="w-3.5 h-3.5" />
                <span>Relleno</span>
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800 text-xs text-slate-400">
                <button
                  onClick={() => setZoom((z) => Math.max(1, z - 1))}
                  className="hover:text-emerald-400 p-0.5"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] w-8 text-center">{zoom}x</span>
                <button
                  onClick={() => setZoom((z) => Math.min(16, z + 1))}
                  className="hover:text-emerald-400 p-0.5"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded border text-xs transition-colors ${
                  showGrid
                    ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/50"
                    : "bg-slate-900 text-slate-400 border-slate-800"
                }`}
                title="Alternar cuadrícula de píxeles"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  if (!activeMap) return;
                  const blank = activeMap.graphic.pixels.map((r) => r.map(() => 0));
                  updatePixels(blank);
                  showToast("Lienzo vaciado a transparente");
                }}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-300 border border-slate-800 text-xs transition-colors"
                title="Limpiar todo el mapa"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-6 bg-[#040711]">
            {activeMap && (
              <div
                className="relative border-2 border-slate-700 shadow-2xl rounded overflow-hidden select-none"
                style={{
                  backgroundImage:
                    "repeating-conic-gradient(#172033 0% 25%, #0f172a 0% 50%)",
                  backgroundSize: `${Math.max(8, 8 * zoom)}px ${Math.max(8, 8 * zoom)}px`,
                  width: `${activeMap.graphic.width * zoom}px`,
                  height: `${activeMap.graphic.height * zoom}px`,
                }}
                onMouseDown={(e) => {
                  setIsDrawing(true);
                  handlePixelAction(e.clientX, e.clientY);
                }}
                onMouseMove={(e) => {
                  if (isDrawing) {
                    handlePixelAction(e.clientX, e.clientY);
                  }
                }}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full image-rendering-pixelated cursor-crosshair"
                />

                {/* Optional Grid Overlay */}
                {showGrid && zoom >= 4 && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`,
                      backgroundSize: `${zoom}px ${zoom}px`,
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Palette Selector Bar */}
          <div className="flex items-center px-4 py-2.5 bg-[#090e1a] border-t border-slate-800 gap-3">
            <span className="text-xs font-mono text-slate-400">Paleta 8-Bit:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {palette.map((color, idx) => {
                const isSelected = selectedColorIndex === idx;
                const isTrans = idx === 0;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedColorIndex(idx);
                      if (currentTool === "eraser") setCurrentTool("pencil");
                    }}
                    className={`relative w-6 h-6 rounded transition-transform ${
                      isSelected
                        ? "scale-110 ring-2 ring-emerald-400 z-10"
                        : "hover:scale-105 border border-slate-700"
                    }`}
                    style={{
                      backgroundColor: isTrans ? "transparent" : color,
                      backgroundImage: isTrans
                        ? "repeating-conic-gradient(#334155 0% 25%, #0f172a 0% 50%)"
                        : "none",
                      backgroundSize: "6px 6px",
                    }}
                    title={`Color #${idx}: ${color}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Map Inspector & DIV Code (350px) */}
        <div className="w-80 lg:w-96 flex flex-col bg-[#080d1a] border-l border-slate-800 overflow-y-auto p-4 gap-4">
          {activeMap ? (
            <>
              {/* Header Info */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-emerald-400" />
                    <span>{activeMap.name}</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Archivo: <span className="text-emerald-400">{activeMap.filename}</span>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold">
                  {activeMap.graphic.width}x{activeMap.graphic.height}
                </span>
              </div>

              {/* Control Point 0 (Center) */}
              <div className="p-3 bg-[#0c1222] rounded-lg border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Punto de Anclaje (CPoint 0)</span>
                  </div>
                  <button
                    onClick={() => {
                      const cx = Math.floor(activeMap.graphic.width / 2);
                      const cy = Math.floor(activeMap.graphic.height / 2);
                      const updatedGraphic: DivGraphic = {
                        ...activeMap.graphic,
                        cx,
                        cy,
                        cpoints: [{ id: 0, x: cx, y: cy }],
                      };
                      const updated = mapFiles.map((m) =>
                        m.id === activeMap.id ? { ...m, graphic: updatedGraphic } : m
                      );
                      syncToRuntime(updated);
                      showToast("Centro del mapa restablecido");
                    }}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >
                    Centrar
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">X:</span>
                    <span className="text-slate-200 font-bold">{activeMap.graphic.cx}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Y:</span>
                    <span className="text-slate-200 font-bold">{activeMap.graphic.cy}</span>
                  </div>
                </div>
              </div>

              {/* DIV Code Generator for .MAP */}
              <div className="p-3 bg-[#0a0e1c] rounded-lg border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Code className="w-3.5 h-3.5" />
                    <span>Código DIV para este .MAP</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopySnippet}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      title="Copiar código DIV"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {onInsertCode && (
                      <button
                        onClick={handleInsertSnippet}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] transition-colors"
                        title="Insertar en el editor de código"
                      >
                        Insertar
                      </button>
                    )}
                  </div>
                </div>

                <pre className="p-2.5 bg-slate-950 text-slate-300 rounded font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800/80">
                  <code>{divSnippet}</code>
                </pre>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 px-3.5 py-2 bg-slate-900/95 text-emerald-300 border border-emerald-500/40 rounded-lg shadow-xl text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal: New .MAP File */}
      {isNewMapModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0f1d] border border-emerald-500/40 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <FileImage className="w-4 h-4" />
              <span>Crear Nuevo Archivo Gráfico .MAP</span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Nombre de Archivo (.map):</label>
                <input
                  type="text"
                  placeholder="ej: pantalla_inicio.map"
                  value={newMapFilename}
                  onChange={(e) => setNewMapFilename(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nombre descriptivo:</label>
                <input
                  type="text"
                  placeholder="ej: Pantalla de Inicio y Créditos"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Ancho (px):</label>
                  <select
                    value={newMapW}
                    onChange={(e) => setNewMapW(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={64}>64 px (Tile)</option>
                    <option value={128}>128 px</option>
                    <option value={160}>160 px (Medio fondo)</option>
                    <option value={320}>320 px (Pantalla retro)</option>
                    <option value={640}>640 px (Alta resolución)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Alto (px):</label>
                  <select
                    value={newMapH}
                    onChange={(e) => setNewMapH(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={64}>64 px (Tile)</option>
                    <option value={120}>120 px</option>
                    <option value={200}>200 px (VGA Clásica)</option>
                    <option value={240}>240 px</option>
                    <option value={480}>480 px (VGA Completa)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsNewMapModalOpen(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateMap}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Crear .MAP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transfer to FPG */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0f1d] border border-indigo-500/40 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <Package className="w-4 h-4" />
              <span>Añadir {activeMap?.filename} a un Paquete FPG</span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Selecciona el paquete FPG destino:</label>
                <select
                  value={targetFpgId}
                  onChange={(e) => setTargetFpgId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {(Array.from(runtime?.fpgPackages?.values() || []) as DivFpgPackage[]).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.filename} ({p.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">
                  ID de Sprite en el FPG (1-999):
                </label>
                <input
                  type="number"
                  value={targetSpriteId}
                  onChange={(e) => setTargetSpriteId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransferToFpg}
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Copiar al FPG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
