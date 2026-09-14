import React, { useState, useRef } from "react";
import {
  Package,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Image as ImageIcon,
  Crosshair,
  Code,
  Check,
  Search,
  FolderArchive,
  RefreshCw,
  Edit3,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { DivGraphic } from "../types";
import { DivRuntime } from "../engine/runtime";
import {
  DivFpgPackage,
  createNewDivGraphic,
  fileToDivGraphic,
  canvasToDivGraphic,
} from "../engine/fpgManager";
import { createGraphicCanvas, DEFAULT_PALETTE } from "../engine/graphics";

interface FpgEditorProps {
  runtime: DivRuntime;
  onInsertCode?: (codeSnippet: string) => void;
  onOpenSpriteEditor?: (graphic: DivGraphic) => void;
}

export const FpgEditor: React.FC<FpgEditorProps> = ({
  runtime,
  onInsertCode,
  onOpenSpriteEditor,
}) => {
  // Packages in runtime
  const [packages, setPackages] = useState<DivFpgPackage[]>(() =>
    Array.from(runtime.fpgPackages.values())
  );
  const [selectedPkgId, setSelectedPkgId] = useState<number>(() => {
    return runtime.fpgPackages.has(0) ? 0 : Array.from(runtime.fpgPackages.keys())[0] ?? 0;
  });

  const activePackage =
    packages.find((p) => p.id === selectedPkgId) || packages[0];

  // Selected sprite within the active package
  const [selectedGraphicId, setSelectedGraphicId] = useState<number | null>(() => {
    return activePackage?.graphics[0]?.id ?? null;
  });

  const selectedGraphic =
    activePackage?.graphics.find((g) => g.id === selectedGraphicId) ||
    activePackage?.graphics[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New package modal state
  const [isNewPkgModalOpen, setIsNewPkgModalOpen] = useState(false);
  const [newPkgFilename, setNewPkgFilename] = useState("");
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgDesc, setNewPkgDesc] = useState("");

  // New sprite modal state
  const [isNewSpriteModalOpen, setIsNewSpriteModalOpen] = useState(false);
  const [newSpriteId, setNewSpriteId] = useState(1);
  const [newSpriteName, setNewSpriteName] = useState("");
  const [newSpriteW, setNewSpriteW] = useState(32);
  const [newSpriteH, setNewSpriteH] = useState(32);
  const [newSpritePattern, setNewSpritePattern] = useState<"empty" | "checker" | "border">("checker");

  // File input refs for uploading PNGs
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const importPkgInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync state to runtime
  const syncToRuntime = (updatedPackages: DivFpgPackage[]) => {
    setPackages(updatedPackages);
    updatedPackages.forEach((p) => {
      runtime.fpgPackages.set(p.id, p);
      if (p.id === 0) {
        runtime.loadFPG(p.graphics);
      }
    });
  };

  // Create new package
  const handleCreatePackage = () => {
    if (!newPkgFilename.trim()) return;
    const cleanFn = newPkgFilename.trim().toLowerCase().endsWith(".fpg")
      ? newPkgFilename.trim().toLowerCase()
      : `${newPkgFilename.trim().toLowerCase()}.fpg`;

    const nextId = Math.max(0, ...packages.map((p) => p.id)) + 1;
    const newPkg: DivFpgPackage = {
      id: nextId,
      name: newPkgName.trim() || cleanFn.replace(".fpg", ""),
      filename: cleanFn,
      description: newPkgDesc.trim() || "Paquete FPG personalizado",
      graphics: [],
    };

    const updated = [...packages, newPkg];
    syncToRuntime(updated);
    setSelectedPkgId(nextId);
    setIsNewPkgModalOpen(false);
    setNewPkgFilename("");
    setNewPkgName("");
    setNewPkgDesc("");
    showToast(`Paquete "${cleanFn}" creado con éxito`);
  };

  // Delete current package (except main 0)
  const handleDeletePackage = (id: number) => {
    if (id === 0) {
      showToast("El paquete principal (main.fpg) no puede eliminarse");
      return;
    }
    const updated = packages.filter((p) => p.id !== id);
    syncToRuntime(updated);
    runtime.unload_fpg(id);
    setSelectedPkgId(0);
    showToast("Paquete eliminado");
  };

  // Open new sprite modal with sensible default ID
  const handleOpenNewSprite = () => {
    if (!activePackage) return;
    const existingIds = activePackage.graphics.map((g) => g.id);
    const nextFreeId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    setNewSpriteId(nextFreeId);
    setNewSpriteName(`sprite_${nextFreeId}`);
    setIsNewSpriteModalOpen(true);
  };

  // Confirm create sprite
  const handleCreateSprite = () => {
    if (!activePackage) return;
    const graphic = createNewDivGraphic(
      newSpriteId,
      newSpriteName.trim() || `sprite_${newSpriteId}`,
      newSpriteW,
      newSpriteH,
      newSpritePattern
    );

    const updatedGraphics = [...activePackage.graphics, graphic];
    const updatedPackages = packages.map((p) =>
      p.id === activePackage.id ? { ...p, graphics: updatedGraphics } : p
    );

    syncToRuntime(updatedPackages);
    setSelectedGraphicId(graphic.id);
    setIsNewSpriteModalOpen(false);
    showToast(`Sprite #${graphic.id} creado en ${activePackage.filename}`);
  };

  // Delete sprite from active package
  const handleDeleteSprite = (graphicId: number) => {
    if (!activePackage) return;
    const updatedGraphics = activePackage.graphics.filter((g) => g.id !== graphicId);
    const updatedPackages = packages.map((p) =>
      p.id === activePackage.id ? { ...p, graphics: updatedGraphics } : p
    );
    syncToRuntime(updatedPackages);
    if (selectedGraphicId === graphicId) {
      setSelectedGraphicId(updatedGraphics[0]?.id ?? null);
    }
    showToast(`Sprite #${graphicId} eliminado`);
  };

  // Batch upload PNGs
  const handleBatchUploadPngs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activePackage) return;
    const files: File[] = Array.from(e.target.files);

    const existingIds = activePackage.graphics.map((g) => g.id);
    let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    const newGraphics: DivGraphic[] = [];

    for (const file of files) {
      try {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_");
        const graphic = await fileToDivGraphic(file, nextId, cleanName);
        newGraphics.push(graphic);
        nextId++;
      } catch (err) {
        console.error("Error al procesar archivo:", file.name, err);
      }
    }

    if (newGraphics.length > 0) {
      const updatedGraphics = [...activePackage.graphics, ...newGraphics];
      const updatedPackages = packages.map((p) =>
        p.id === activePackage.id ? { ...p, graphics: updatedGraphics } : p
      );
      syncToRuntime(updatedPackages);
      setSelectedGraphicId(newGraphics[0].id);
      showToast(`${newGraphics.length} imagen(es) PNG añadidas a ${activePackage.filename}`);
    }

    if (batchFileInputRef.current) {
      batchFileInputRef.current.value = "";
    }
  };

  // Adjust Control Point
  const handleUpdateCPoint = (cpointId: number, newX: number, newY: number) => {
    if (!activePackage || !selectedGraphic) return;

    const cpoints = [...(selectedGraphic.cpoints || [])];
    const idx = cpoints.findIndex((cp) => cp.id === cpointId);
    if (idx >= 0) {
      cpoints[idx] = { ...cpoints[idx], x: newX, y: newY };
    } else {
      cpoints.push({ id: cpointId, x: newX, y: newY });
    }

    const updatedGraphic: DivGraphic = {
      ...selectedGraphic,
      cpoints,
      cx: cpointId === 0 ? newX : selectedGraphic.cx,
      cy: cpointId === 0 ? newY : selectedGraphic.cy,
    };

    const updatedGraphics = activePackage.graphics.map((g) =>
      g.id === updatedGraphic.id ? updatedGraphic : g
    );
    const updatedPackages = packages.map((p) =>
      p.id === activePackage.id ? { ...p, graphics: updatedGraphics } : p
    );
    syncToRuntime(updatedPackages);
  };

  // Export FPG Package as JSON
  const handleExportPackage = () => {
    if (!activePackage) return;
    const exportData = {
      fpgVersion: "DIV_3.0_FPG",
      filename: activePackage.filename,
      name: activePackage.name,
      description: activePackage.description,
      spriteCount: activePackage.graphics.length,
      graphics: activePackage.graphics.map((g) => ({
        id: g.id,
        name: g.name,
        width: g.width,
        height: g.height,
        cx: g.cx,
        cy: g.cy,
        cpoints: g.cpoints,
        palette: g.palette,
        pixels: g.pixels,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activePackage.filename.endsWith(".fpg")
      ? activePackage.filename
      : `${activePackage.filename}.fpg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Archivo ${activePackage.filename} descargado`);
  };

  // Import FPG Package
  const handleImportPackage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const importedGraphics: DivGraphic[] = (json.graphics || []).map((g: any) => {
          const graphic: DivGraphic = {
            id: Number(g.id) || 1,
            name: String(g.name || "sprite"),
            width: Number(g.width) || 32,
            height: Number(g.height) || 32,
            cx: Number(g.cx) || Math.floor(g.width / 2),
            cy: Number(g.cy) || Math.floor(g.height / 2),
            cpoints: g.cpoints || [{ id: 0, x: g.cx || 16, y: g.cy || 16 }],
            palette: g.palette || DEFAULT_PALETTE,
            pixels: g.pixels || [],
          };
          if (typeof document !== "undefined") {
            graphic.canvas = createGraphicCanvas(graphic);
            graphic.dataUrl = graphic.canvas.toDataURL();
          }
          return graphic;
        });

        const nextId = Math.max(0, ...packages.map((p) => p.id)) + 1;
        const newPkg: DivFpgPackage = {
          id: nextId,
          name: json.name || file.name.replace(/\.[^/.]+$/, ""),
          filename: json.filename || (file.name.endsWith(".fpg") ? file.name : `${file.name}.fpg`),
          description: json.description || "Paquete FPG importado",
          graphics: importedGraphics,
        };

        const updated = [...packages, newPkg];
        syncToRuntime(updated);
        setSelectedPkgId(nextId);
        showToast(`Paquete "${newPkg.filename}" importado con ${importedGraphics.length} sprites`);
      } catch (err) {
        showToast("Error al importar archivo FPG (formato inválido)");
      }
    };
    reader.readAsText(file);
    if (importPkgInputRef.current) importPkgInputRef.current.value = "";
  };

  // Filtered graphics
  const filteredGraphics = (activePackage?.graphics || []).filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.name.toLowerCase().includes(q) || String(g.id).includes(q);
  });

  // Generate DIV code snippet for current sprite & package
  const divSnippet = activePackage && selectedGraphic
    ? `// Carga y asignación del paquete FPG y sprite en DIV Games Studio
GLOBAL
  fpg_${activePackage.name.toLowerCase().replace(/[^a-z0-9]/g, "_")} = 0;

BEGIN
  // Cargar paquete FPG en memoria (retorna el ID de archivo)
  fpg_${activePackage.name.toLowerCase().replace(/[^a-z0-9]/g, "_")} = load_fpg("${activePackage.filename}");

  // Iniciar proceso que usará el sprite
  mi_proceso();
END

PROCESS mi_proceso()
BEGIN
  file = fpg_${activePackage.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}; // Archivo FPG
  graph = ${selectedGraphic.id}; // ID del sprite: ${selectedGraphic.name} (${selectedGraphic.width}x${selectedGraphic.height})
  x = 320;
  y = 240;

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

  return (
    <div className="flex flex-col h-full bg-[#060913] text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Bar: Package Tabs, Create Package, Upload, Export */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#090e1a] border-b border-slate-800 gap-3">
        {/* Left: Package Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-2xl scrollbar-thin">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 mr-2 shrink-0">
            <FolderArchive className="w-4 h-4" />
            <span>PAQUETES FPG:</span>
          </div>

          {packages.map((pkg) => {
            const isSelected = pkg.id === selectedPkgId;
            return (
              <button
                key={pkg.id}
                onClick={() => {
                  setSelectedPkgId(pkg.id);
                  setSelectedGraphicId(pkg.graphics[0]?.id ?? null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all shrink-0 ${
                  isSelected
                    ? "bg-cyan-600/30 text-cyan-200 border border-cyan-500/60 shadow-sm shadow-cyan-950"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <Package className={`w-3.5 h-3.5 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                <span className="font-semibold">{pkg.filename}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-400">
                  {pkg.graphics.length}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setIsNewPkgModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-900 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-cyan-500/50 shrink-0 transition-colors"
            title="Crear nuevo paquete FPG"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nuevo .fpg</span>
          </button>
        </div>

        {/* Right: Package Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Upload PNG Batch button */}
          <input
            type="file"
            ref={batchFileInputRef}
            onChange={handleBatchUploadPngs}
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />
          <button
            onClick={() => batchFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium transition-colors"
            title="Agrupar archivos PNG externos en este paquete FPG"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Añadir PNGs</span>
          </button>

          {/* New Sprite button */}
          <button
            onClick={handleOpenNewSprite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors shadow-sm shadow-cyan-950"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Nuevo Sprite</span>
          </button>

          {/* Export FPG */}
          <button
            onClick={handleExportPackage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Exportar archivo .FPG del paquete actual"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar .fpg</span>
          </button>

          {/* Import FPG */}
          <input
            type="file"
            ref={importPkgInputRef}
            onChange={handleImportPackage}
            accept=".fpg,.json"
            className="hidden"
          />
          <button
            onClick={() => importPkgInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Importar paquete .FPG"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Importar</span>
          </button>

          {/* Delete Package button */}
          {activePackage && activePackage.id !== 0 && (
            <button
              onClick={() => handleDeletePackage(activePackage.id)}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
              title={`Eliminar paquete ${activePackage.filename}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid & Preview Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Sprites Gallery (70%) */}
        <div className="flex-1 flex flex-col border-r border-slate-800 min-w-0">
          {/* Gallery Toolbar & Search */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#0a0f1d] border-b border-slate-800/80 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Sprites en <span className="text-cyan-400 font-mono">{activePackage?.filename}</span>:
              </span>
              <span className="text-xs text-slate-500">
                ({filteredGraphics.length} de {activePackage?.graphics.length || 0})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por ID o nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-48 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Sprites Card Grid */}
          <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 content-start">
            {filteredGraphics.map((graphic) => {
              const isSelected = selectedGraphic?.id === graphic.id;
              return (
                <div
                  key={graphic.id}
                  onClick={() => setSelectedGraphicId(graphic.id)}
                  className={`group relative flex flex-col p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/60 ring-1 ring-cyan-500/40"
                      : "bg-[#0c1222] border-slate-800 hover:border-slate-700 hover:bg-[#0f172a]"
                  }`}
                >
                  {/* Top Badge: ID */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-1.5 py-0.5 text-[11px] font-mono font-bold rounded ${
                        isSelected
                          ? "bg-cyan-500 text-slate-950"
                          : "bg-slate-800 text-cyan-400 group-hover:bg-slate-700"
                      }`}
                    >
                      ID #{graphic.id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {graphic.width}x{graphic.height}
                    </span>
                  </div>

                  {/* Thumbnail Box with transparency checkerboard */}
                  <div
                    className="relative w-full aspect-square rounded flex items-center justify-center overflow-hidden border border-slate-800/80 bg-slate-950"
                    style={{
                      backgroundImage:
                        "repeating-conic-gradient(#172033 0% 25%, #0f172a 0% 50%)",
                      backgroundSize: "12px 12px",
                    }}
                  >
                    {graphic.dataUrl ? (
                      <img
                        src={graphic.dataUrl}
                        alt={graphic.name}
                        className="max-h-[85%] max-w-[85%] object-contain image-rendering-pixelated drop-shadow"
                      />
                    ) : (
                      <div className="text-[10px] text-slate-500">Sin vista</div>
                    )}

                    {/* CPoint 0 Anchor Crosshair indicator */}
                    <div
                      className="absolute w-2 h-2 pointer-events-none -translate-x-1/2 -translate-y-1/2 border border-yellow-400/80 rounded-full"
                      style={{
                        left: `${((graphic.cx ?? graphic.width / 2) / graphic.width) * 100}%`,
                        top: `${((graphic.cy ?? graphic.height / 2) / graphic.height) * 100}%`,
                      }}
                      title="Centro (CPoint 0)"
                    />
                  </div>

                  {/* Bottom info: Name & Quick Actions */}
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className="text-xs font-mono text-slate-300 truncate max-w-[90px]"
                      title={graphic.name}
                    >
                      {graphic.name}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSprite(graphic.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-all"
                      title="Eliminar sprite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredGraphics.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-slate-500">
                <Package className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-400">
                  No hay sprites en este paquete FPG
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Pulsa "Añadir PNGs" para agrupar imágenes o "Nuevo Sprite" para crearlo.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Sprite Inspector & DIV Code Generator (30%) */}
        <div className="w-80 lg:w-96 flex flex-col bg-[#080d1a] overflow-y-auto">
          {selectedGraphic ? (
            <div className="p-4 flex flex-col gap-4">
              {/* Header: Sprite Details */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500 text-slate-950">
                      ID #{selectedGraphic.id}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-100 truncate">
                      {selectedGraphic.name}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                    Paquete: <span className="text-cyan-400">{activePackage?.filename}</span>
                  </span>
                </div>

                {onOpenSpriteEditor && (
                  <button
                    onClick={() => onOpenSpriteEditor(selectedGraphic)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-500/40 text-xs font-medium transition-colors"
                    title="Editar píxeles en el Editor de Sprites"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Pintar</span>
                  </button>
                )}
              </div>

              {/* Big Zoomed Preview Canvas */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div
                  className="relative flex items-center justify-center p-2 rounded overflow-hidden"
                  style={{
                    backgroundImage:
                      "repeating-conic-gradient(#172033 0% 25%, #0f172a 0% 50%)",
                    backgroundSize: "16px 16px",
                  }}
                >
                  {selectedGraphic.dataUrl && (
                    <img
                      src={selectedGraphic.dataUrl}
                      alt={selectedGraphic.name}
                      className="max-h-36 max-w-full object-contain image-rendering-pixelated drop-shadow-lg"
                    />
                  )}
                </div>

                <div className="flex items-center gap-4 mt-3 text-[11px] font-mono text-slate-400">
                  <span>Dimensiones: {selectedGraphic.width}x{selectedGraphic.height} px</span>
                  <span>Punto Centro: ({selectedGraphic.cx}, {selectedGraphic.cy})</span>
                </div>
              </div>

              {/* Control Points (Puntos de Control / CPoints) */}
              <div className="p-3 bg-[#0c1222] rounded-lg border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Crosshair className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Puntos de Control (CPoints)</span>
                  </div>
                  <button
                    onClick={() => {
                      const cx = Math.floor(selectedGraphic.width / 2);
                      const cy = Math.floor(selectedGraphic.height / 2);
                      handleUpdateCPoint(0, cx, cy);
                      showToast("Centro restablecido");
                    }}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Centrar CPoint 0
                  </button>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {(selectedGraphic.cpoints || []).map((cp) => (
                    <div
                      key={cp.id}
                      className="flex items-center justify-between text-xs font-mono bg-slate-900/90 px-2.5 py-1.5 rounded border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 font-bold">CP #{cp.id}</span>
                        <span className="text-slate-400 text-[11px]">
                          {cp.id === 0 ? "(Centro de rotación)" : cp.id === 1 ? "(Punto de disparo)" : "(Personalizado)"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">X:</span>
                          <input
                            type="number"
                            value={cp.x}
                            onChange={(e) =>
                              handleUpdateCPoint(cp.id, Number(e.target.value), cp.y)
                            }
                            className="w-12 px-1 py-0.5 bg-slate-950 border border-slate-700 rounded text-center text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Y:</span>
                          <input
                            type="number"
                            value={cp.y}
                            onChange={(e) =>
                              handleUpdateCPoint(cp.id, cp.x, Number(e.target.value))
                            }
                            className="w-12 px-1 py-0.5 bg-slate-950 border border-slate-700 rounded text-center text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DIV Code Generation Box */}
              <div className="p-3 bg-[#0a0e1c] rounded-lg border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                    <Code className="w-3.5 h-3.5" />
                    <span>Código DIV para este Sprite</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopySnippet}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      title="Copiar snippet DIV"
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
                        className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[11px] transition-colors"
                        title="Insertar en código actual"
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
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center text-slate-500">
              <ImageIcon className="w-10 h-10 text-slate-700 mb-2" />
              <p className="text-xs">Selecciona un sprite para ver sus detalles</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 px-3.5 py-2 bg-slate-900/95 text-cyan-300 border border-cyan-500/40 rounded-lg shadow-xl text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal: New FPG Package */}
      {isNewPkgModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0f1d] border border-cyan-500/40 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Package className="w-4 h-4" />
              <span>Crear Nuevo Paquete FPG Virtual</span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Nombre de Archivo (.fpg):</label>
                <input
                  type="text"
                  placeholder="ej: enemigos.fpg"
                  value={newPkgFilename}
                  onChange={(e) => setNewPkgFilename(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nombre descriptivo:</label>
                <input
                  type="text"
                  placeholder="ej: Sprites de Enemigos y Jefes"
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Descripción (opcional):</label>
                <textarea
                  placeholder="Describe qué contiene este paquete de gráficos..."
                  value={newPkgDesc}
                  onChange={(e) => setNewPkgDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-500 h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsNewPkgModalOpen(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePackage}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Crear Paquete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Sprite in Package */}
      {isNewSpriteModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0f1d] border border-cyan-500/40 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <ImageIcon className="w-4 h-4" />
              <span>Añadir Nuevo Sprite a {activePackage?.filename}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">ID de Gráfico (1-999):</label>
                <input
                  type="number"
                  value={newSpriteId}
                  onChange={(e) => setNewSpriteId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nombre:</label>
                <input
                  type="text"
                  placeholder="ej: nave_roja"
                  value={newSpriteName}
                  onChange={(e) => setNewSpriteName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Ancho (px):</label>
                <select
                  value={newSpriteW}
                  onChange={(e) => setNewSpriteW(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value={16}>16 px</option>
                  <option value={24}>24 px</option>
                  <option value={32}>32 px (Estándar)</option>
                  <option value={48}>48 px</option>
                  <option value={64}>64 px</option>
                  <option value={128}>128 px</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Alto (px):</label>
                <select
                  value={newSpriteH}
                  onChange={(e) => setNewSpriteH(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value={16}>16 px</option>
                  <option value={24}>24 px</option>
                  <option value={32}>32 px (Estándar)</option>
                  <option value={48}>48 px</option>
                  <option value={64}>64 px</option>
                  <option value={128}>128 px</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Relleno Inicial:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSpritePattern("checker")}
                    className={`flex-1 py-1.5 rounded border text-xs ${
                      newSpritePattern === "checker"
                        ? "bg-cyan-600/30 border-cyan-500 text-cyan-200"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    Tablero de prueba
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSpritePattern("border")}
                    className={`flex-1 py-1.5 rounded border text-xs ${
                      newSpritePattern === "border"
                        ? "bg-cyan-600/30 border-cyan-500 text-cyan-200"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    Caja con borde
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSpritePattern("empty")}
                    className={`flex-1 py-1.5 rounded border text-xs ${
                      newSpritePattern === "empty"
                        ? "bg-cyan-600/30 border-cyan-500 text-cyan-200"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    Transparente
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsNewSpriteModalOpen(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSprite}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Crear Sprite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
