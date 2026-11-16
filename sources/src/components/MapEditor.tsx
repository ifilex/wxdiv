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
  Move,
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
  const [touchNavMode, setTouchNavMode] = useState<"draw" | "scroll">("draw");
  const [mobileTab, setMobileTab] = useState<"canvas" | "inspector">("canvas");
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(7);
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
      runtime?.mapFiles?.set(m.id, m);
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
    runtime?.unload_map?.(id);
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
    <div className="flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] font-sans select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-white border-b border-[#E2E8F0] gap-2 flex-shrink-0">
        {/* Left: Map files pill list */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full lg:max-w-2xl no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#7C2D48] mr-1 shrink-0">
            <FileImage className="w-4 h-4" />
            <span className="hidden sm:inline">MAPAS (.MAP):</span>
          </div>

          {mapFiles.map((m) => {
            const isSelected = m.id === selectedMapId;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMapId(m.id)}
                className={`flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-lg text-xs font-mono transition-colors shrink-0 whitespace-nowrap border ${
                  isSelected
                    ? "bg-[#7C2D48] text-white border-[#7C2D48] shadow-xs font-bold"
                    : "bg-[#F8FAFC] text-[#4B5563] hover:text-[#111827] hover:bg-[#F1F5F9] border-[#E2E8F0]"
                }`}
              >
                <FileImage className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-[#6B7280]"}`} />
                <span>{m.filename}</span>
                <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-[#6B7280]"}`}>
                  {m.graphic.width}x{m.graphic.height}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setIsNewMapModalOpen(true)}
            className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs font-semibold bg-white text-[#7C2D48] hover:bg-[#FDF2F4] border border-dashed border-[#7C2D48]/40 shrink-0 whitespace-nowrap transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo .map</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportPng}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#2F6F4E] border border-[#A7F3D0] text-xs font-semibold transition-colors whitespace-nowrap"
            title="Convertir imagen externa PNG/JPG a archivo .map"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar Imagen</span>
            <span className="sm:hidden">Imagen</span>
          </button>

          <button
            onClick={() => {
              const mainPkg = runtime?.fpgPackages?.get(0);
              const nextId = mainPkg ? Math.max(0, ...mainPkg.graphics.map((g) => g.id)) + 1 : 100;
              setTargetSpriteId(nextId);
              setIsTransferModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-lg bg-[#FDF2F4] hover:bg-[#FCE7EB] text-[#7C2D48] border border-[#FBCFE8] text-xs font-semibold transition-colors whitespace-nowrap"
            title="Copiar este mapa individual dentro de un paquete .FPG"
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Añadir a FPG</span>
            <span className="sm:hidden">A FPG</span>
          </button>

          <button
            onClick={handleExportMap}
            className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#374151] border border-[#E2E8F0] text-xs font-medium transition-colors whitespace-nowrap"
            title="Descargar archivo .map"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {activeMap && (
            <button
              onClick={() => handleDeleteMap(activeMap.id)}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
              title={`Eliminar ${activeMap.filename}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-tabs */}
      <div className="flex md:hidden items-center bg-white border-b border-[#E2E8F0] px-3 py-1.5 gap-2 flex-shrink-0">
        <button
          onClick={() => setMobileTab("canvas")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "canvas"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          Lienzo .MAP
        </button>
        <button
          onClick={() => setMobileTab("inspector")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "inspector"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          Inspector y Código
        </button>
      </div>

      {/* Main Studio Body: Canvas Left & Sidebar Right */}
      <div className="flex-1 flex-grow min-h-0 w-full h-full flex flex-col md:flex-row overflow-hidden">
        {/* Left: Pixel Drawing Workspace */}
        <div
          className={`${
            mobileTab === "canvas" ? "flex" : "hidden md:flex"
          } flex-1 flex-grow min-h-0 flex-col bg-[#F7F8FA] min-w-0`}
        >
          {/* Canvas Toolbar: Tools, Touch Nav, Zoom, Grid, Clear */}
          <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-white border-b border-[#E2E8F0] gap-2 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Tools */}
              <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0]">
                <button
                  onClick={() => {
                    setCurrentTool("pencil");
                    setTouchNavMode("draw");
                  }}
                  className={`flex items-center gap-1 px-2.5 min-h-[34px] rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentTool === "pencil" && touchNavMode === "draw"
                      ? "bg-[#7C2D48] text-white"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                  title="Lápiz de píxeles"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lápiz</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTool("eraser");
                    setTouchNavMode("draw");
                  }}
                  className={`flex items-center gap-1 px-2.5 min-h-[34px] rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentTool === "eraser" && touchNavMode === "draw"
                      ? "bg-[#7C2D48] text-white"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                  title="Borrador transparente"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Goma</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTool("bucket");
                    setTouchNavMode("draw");
                  }}
                  className={`flex items-center gap-1 px-2.5 min-h-[34px] rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentTool === "bucket" && touchNavMode === "draw"
                      ? "bg-[#7C2D48] text-white"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                  title="Bote de pintura / Relleno"
                >
                  <PaintBucket className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Relleno</span>
                </button>
              </div>

              {/* Touch Pan Mode Toggle (helpful on large maps in mobile) */}
              <button
                onClick={() =>
                  setTouchNavMode((m) => (m === "draw" ? "scroll" : "draw"))
                }
                className={`flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap md:hidden ${
                  touchNavMode === "scroll"
                    ? "bg-[#2F6F4E] text-white border-[#2F6F4E]"
                    : "bg-white text-[#4B5563] border-[#E2E8F0]"
                }`}
                title="Cambiar entre pintar con el dedo o desplazar el lienzo"
              >
                <Move className="w-3.5 h-3.5" />
                <span>{touchNavMode === "scroll" ? "Desplazar" : "Mover mapa"}</span>
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-[#F8FAFC] px-1.5 py-0.5 rounded-lg border border-[#E2E8F0] text-xs text-[#374151]">
                <button
                  onClick={() => setZoom((z) => Math.max(1, z - 1))}
                  className="min-w-[32px] min-h-[32px] flex items-center justify-center hover:text-[#7C2D48]"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] w-7 text-center font-bold">{zoom}x</span>
                <button
                  onClick={() => setZoom((z) => Math.min(16, z + 1))}
                  className="min-w-[32px] min-h-[32px] flex items-center justify-center hover:text-[#7C2D48]"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border text-xs transition-colors ${
                  showGrid
                    ? "bg-[#FDF2F4] text-[#7C2D48] border-[#7C2D48]/40"
                    : "bg-white text-[#4B5563] border-[#E2E8F0]"
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
                className="px-2.5 min-h-[36px] rounded-lg bg-white hover:bg-rose-50 text-[#4B5563] hover:text-rose-600 border border-[#E2E8F0] text-xs font-medium transition-colors whitespace-nowrap"
                title="Limpiar todo el mapa"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-3 sm:p-6 bg-[#E5E7EB]">
            {activeMap && (
              <div
                className={`relative border-2 border-[#0F172A] shadow-xl rounded overflow-hidden select-none shrink-0 ${
                  touchNavMode === "draw" ? "touch-none" : "touch-pan-x touch-pan-y"
                }`}
                style={{
                  backgroundImage:
                    "repeating-conic-gradient(#172033 0% 25%, #0f172a 0% 50%)",
                  backgroundSize: `${Math.max(8, 8 * zoom)}px ${Math.max(8, 8 * zoom)}px`,
                  width: `${activeMap.graphic.width * zoom}px`,
                  height: `${activeMap.graphic.height * zoom}px`,
                }}
                onPointerDown={(e) => {
                  if (touchNavMode === "scroll" && e.pointerType !== "mouse") return;
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  setIsDrawing(true);
                  handlePixelAction(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (touchNavMode === "scroll" && e.pointerType !== "mouse") return;
                  if (isDrawing) {
                    handlePixelAction(e.clientX, e.clientY);
                  }
                }}
                onPointerUp={() => setIsDrawing(false)}
                onPointerCancel={() => setIsDrawing(false)}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full image-rendering-pixelated cursor-crosshair block"
                />

                {showGrid && zoom >= 4 && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
                      backgroundSize: `${zoom}px ${zoom}px`,
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Palette Selector Bar */}
          <div className="flex items-center px-3 py-2 bg-white border-t border-[#E2E8F0] gap-2.5 flex-shrink-0">
            <span className="text-xs font-mono font-bold text-[#4B5563] shrink-0">Paleta:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {palette.map((color, idx) => {
                const isSelected = selectedColorIndex === idx;
                const isTrans = idx === 0;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedColorIndex(idx);
                      if (currentTool === "eraser") setCurrentTool("pencil");
                      setTouchNavMode("draw");
                    }}
                    className={`relative w-8 h-8 rounded-md shrink-0 transition-transform ${
                      isSelected
                        ? "scale-110 ring-2 ring-[#7C2D48] ring-offset-1 z-10"
                        : "hover:scale-105 border border-[#CBD5E1]"
                    }`}
                    style={{
                      backgroundColor: isTrans ? "transparent" : color,
                      backgroundImage: isTrans
                        ? "repeating-conic-gradient(#cbd5e1 0% 25%, #f8fafc 0% 50%)"
                        : "none",
                      backgroundSize: "8px 8px",
                    }}
                    title={`Color #${idx}: ${color}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Map Inspector & DIV Code */}
        <div
          className={`${
            mobileTab === "inspector" ? "flex" : "hidden md:flex"
          } w-full md:w-80 lg:w-96 flex-col bg-white md:border-l border-[#E2E8F0] overflow-y-auto p-4 gap-4`}
        >
          {activeMap ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-[#7C2D48]" />
                    <span>{activeMap.name}</span>
                  </h3>
                  <span className="text-xs text-[#6B7280] font-mono">
                    Archivo: <span className="text-[#2F6F4E] font-semibold">{activeMap.filename}</span>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#2F6F4E] border border-[#A7F3D0] text-xs font-mono font-bold">
                  {activeMap.graphic.width}x{activeMap.graphic.height}
                </span>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
                  <div className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-[#7C2D48]" />
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
                    className="px-2.5 py-1 rounded bg-white border border-[#E2E8F0] text-xs font-semibold text-[#7C2D48] hover:bg-[#FDF2F4]"
                  >
                    Centrar
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#6B7280]">X:</span>
                    <span className="text-[#111827] font-bold">{activeMap.graphic.cx}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#6B7280]">Y:</span>
                    <span className="text-[#111827] font-bold">{activeMap.graphic.cy}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#7C2D48]">
                    <Code className="w-3.5 h-3.5" />
                    <span>Código DIV para este .MAP</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopySnippet}
                      className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#374151] text-xs transition-colors"
                      title="Copiar código DIV"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-[#2F6F4E]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {onInsertCode && (
                      <button
                        onClick={handleInsertSnippet}
                        className="px-3 min-h-[34px] rounded-lg bg-[#7C2D48] hover:bg-[#66233A] text-white font-bold text-xs transition-colors whitespace-nowrap"
                        title="Insertar en el editor de código"
                      >
                        Insertar
                      </button>
                    )}
                  </div>
                </div>

                <pre className="p-3 bg-[#0F172A] text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
                  <code>{divSnippet}</code>
                </pre>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 right-4 left-4 sm:left-auto z-50 px-3.5 py-2.5 bg-[#111827] text-white rounded-xl shadow-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal: New .MAP File */}
      {isNewMapModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#7C2D48] font-bold text-sm">
              <FileImage className="w-4 h-4" />
              <span>Crear Nuevo Archivo Gráfico .MAP</span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[#4B5563] mb-1 font-mono font-semibold">Nombre de Archivo (.map):</label>
                <input
                  type="text"
                  placeholder="ej: pantalla_inicio.map"
                  value={newMapFilename}
                  onChange={(e) => setNewMapFilename(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg font-mono text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                />
              </div>

              <div>
                <label className="block text-[#4B5563] mb-1 font-semibold">Nombre descriptivo:</label>
                <input
                  type="text"
                  placeholder="ej: Pantalla de Inicio y Créditos"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4B5563] mb-1 font-semibold">Ancho (px):</label>
                  <select
                    value={newMapW}
                    onChange={(e) => setNewMapW(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg font-mono text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                  >
                    <option value={64}>64 px (Tile)</option>
                    <option value={128}>128 px</option>
                    <option value={160}>160 px (Medio fondo)</option>
                    <option value={320}>320 px (Pantalla retro)</option>
                    <option value={640}>640 px (Alta resolución)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#4B5563] mb-1 font-semibold">Alto (px):</label>
                  <select
                    value={newMapH}
                    onChange={(e) => setNewMapH(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg font-mono text-[#111827] focus:outline-none focus:border-[#7C2D48]"
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
                className="px-4 min-h-[40px] rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#374151] text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateMap}
                className="px-4 min-h-[40px] rounded-lg bg-[#7C2D48] hover:bg-[#66233A] text-white font-bold text-xs"
              >
                Crear .MAP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transfer to FPG */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#7C2D48] font-bold text-sm">
              <Package className="w-4 h-4" />
              <span>Añadir {activeMap?.filename} a un Paquete FPG</span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[#4B5563] mb-1 font-semibold">Selecciona el paquete FPG destino:</label>
                <select
                  value={targetFpgId}
                  onChange={(e) => setTargetFpgId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg font-mono text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                >
                  {(Array.from(runtime?.fpgPackages?.values() || []) as DivFpgPackage[]).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.filename} ({p.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#4B5563] mb-1 font-mono font-semibold">
                  ID de Sprite en el FPG (1-999):
                </label>
                <input
                  type="number"
                  value={targetSpriteId}
                  onChange={(e) => setTargetSpriteId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg font-mono text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 min-h-[40px] rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#374151] text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransferToFpg}
                className="px-4 min-h-[40px] rounded-lg bg-[#7C2D48] hover:bg-[#66233A] text-white font-bold text-xs"
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
