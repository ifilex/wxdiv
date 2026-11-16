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
  onUpdateMainFpg?: (graphics: DivGraphic[]) => void;
  onPackagesChanged?: () => void;
}

export const FpgEditor: React.FC<FpgEditorProps> = ({
  runtime,
  onInsertCode,
  onOpenSpriteEditor,
  onUpdateMainFpg,
  onPackagesChanged,
}) => {
  // Packages in runtime
  const [packages, setPackages] = useState<DivFpgPackage[]>(() =>
    runtime?.fpgPackages ? Array.from(runtime.fpgPackages.values()) : []
  );
  const [selectedPkgId, setSelectedPkgId] = useState<number>(() => {
    if (!runtime?.fpgPackages) return 0;
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
  const [mobileTab, setMobileTab] = useState<"gallery" | "inspector">("gallery");

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

  // Sync state to runtime and persistence
  const syncToRuntime = (updatedPackages: DivFpgPackage[]) => {
    setPackages(updatedPackages);
    if (runtime?.fpgPackages) {
      updatedPackages.forEach((p) => {
        runtime.fpgPackages.set(p.id, p);
        if (p.id === 0) {
          runtime.loadFPG(p.graphics);
          onUpdateMainFpg?.([...p.graphics]);
        }
      });
    }
    onPackagesChanged?.();
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
    <div className="flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] font-sans select-none overflow-hidden">
      {/* Top Bar: Package Tabs, Create Package, Upload, Export */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-white border-b border-[#E2E8F0] gap-2 flex-shrink-0">
        {/* Left: Package Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full lg:max-w-2xl no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#7C2D48] mr-1 shrink-0">
            <FolderArchive className="w-4 h-4" />
            <span className="hidden sm:inline">PAQUETES FPG:</span>
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
                className={`flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-lg text-xs font-mono transition-colors shrink-0 whitespace-nowrap border ${
                  isSelected
                    ? "bg-[#7C2D48] text-white border-[#7C2D48] font-bold"
                    : "bg-[#F8FAFC] text-[#4B5563] hover:text-[#111827] hover:bg-[#F1F5F9] border-[#E2E8F0]"
                }`}
              >
                <Package className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-[#6B7280]"}`} />
                <span>{pkg.filename}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#4B5563]"
                  }`}
                >
                  {pkg.graphics.length}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setIsNewPkgModalOpen(true)}
            className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs font-semibold bg-white text-[#7C2D48] hover:bg-[#FDF2F4] border border-dashed border-[#7C2D48]/40 shrink-0 whitespace-nowrap transition-colors"
            title="Crear nuevo paquete FPG"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo .fpg</span>
          </button>
        </div>

        {/* Right: Package Actions */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
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
            className="flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#2F6F4E] border border-[#A7F3D0] text-xs font-semibold transition-colors whitespace-nowrap"
            title="Agrupar archivos PNG externos en este paquete FPG"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Añadir PNGs</span>
            <span className="sm:hidden">PNGs</span>
          </button>

          <button
            onClick={handleOpenNewSprite}
            className="flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg bg-[#7C2D48] hover:bg-[#66233A] text-white font-bold text-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Sprite</span>
          </button>

          <button
            onClick={handleExportPackage}
            className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#374151] border border-[#E2E8F0] text-xs font-medium transition-colors whitespace-nowrap"
            title="Exportar archivo .FPG del paquete actual"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <input
            type="file"
            ref={importPkgInputRef}
            onChange={handleImportPackage}
            accept=".fpg,.json"
            className="hidden"
          />
          <button
            onClick={() => importPkgInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#374151] border border-[#E2E8F0] text-xs font-medium transition-colors whitespace-nowrap"
            title="Importar paquete .FPG"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          {activePackage && activePackage.id !== 0 && (
            <button
              onClick={() => handleDeletePackage(activePackage.id)}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title={`Eliminar paquete ${activePackage.filename}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden items-center bg-white border-b border-[#E2E8F0] px-3 py-1.5 gap-2 flex-shrink-0">
        <button
          onClick={() => setMobileTab("gallery")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "gallery"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          Galería ({filteredGraphics.length})
        </button>
        <button
          onClick={() => setMobileTab("inspector")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "inspector"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          {selectedGraphic ? `Inspector #${selectedGraphic.id}` : "Inspector"}
        </button>
      </div>

      {/* Main Grid & Preview Layout */}
      <div className="flex-1 flex-grow min-h-0 w-full flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Sprites Gallery */}
        <div
          className={`${
            mobileTab === "gallery" ? "flex" : "hidden md:flex"
          } flex-1 flex-grow min-h-0 flex-col md:border-r border-[#E2E8F0] min-w-0`}
        >
          {/* Gallery Toolbar & Search */}
          <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-white border-b border-[#E2E8F0] gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-[#374151]">
                <span className="text-[#7C2D48] font-mono font-bold">{activePackage?.filename}</span>
              </span>
              <span className="text-[#6B7280]">
                ({filteredGraphics.length} / {activePackage?.graphics.length || 0})
              </span>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por ID o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7C2D48] font-mono"
              />
            </div>
          </div>

          {/* Sprites Card Grid */}
          <div className="flex-1 flex-grow min-h-0 p-3 sm:p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 content-start">
            {filteredGraphics.map((graphic) => {
              const isSelected = selectedGraphic?.id === graphic.id;
              return (
                <div
                  key={graphic.id}
                  onClick={() => {
                    setSelectedGraphicId(graphic.id);
                    if (window.innerWidth < 768 && isSelected) {
                      setMobileTab("inspector");
                    }
                  }}
                  className={`group relative flex flex-col p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FDF2F4] border-[#7C2D48] shadow-sm ring-1 ring-[#7C2D48]/30"
                      : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-1.5 py-0.5 text-[11px] font-mono font-bold rounded ${
                        isSelected
                          ? "bg-[#7C2D48] text-white"
                          : "bg-[#F1F5F9] text-[#7C2D48]"
                      }`}
                    >
                      #{graphic.id}
                    </span>
                    <span className="text-[10px] font-mono text-[#6B7280]">
                      {graphic.width}x{graphic.height}
                    </span>
                  </div>

                  {/* Dark canvas thumbnail for sprite clarity */}
                  <div
                    className="relative w-full aspect-square rounded-lg flex items-center justify-center overflow-hidden border border-[#CBD5E1] bg-[#0F172A]"
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
                      <div className="text-[10px] text-slate-400">Sin vista</div>
                    )}

                    <div
                      className="absolute w-2.5 h-2.5 pointer-events-none -translate-x-1/2 -translate-y-1/2 border border-amber-400 rounded-full"
                      style={{
                        left: `${((graphic.cx ?? graphic.width / 2) / graphic.width) * 100}%`,
                        top: `${((graphic.cy ?? graphic.height / 2) / graphic.height) * 100}%`,
                      }}
                      title="Centro (CPoint 0)"
                    />
                  </div>

                  {/* Bottom info: Name & Touch-visible Actions */}
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span
                      className="text-xs font-mono font-medium text-[#374151] truncate"
                      title={graphic.name}
                    >
                      {graphic.name}
                    </span>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGraphicId(graphic.id);
                          setMobileTab("inspector");
                        }}
                        className="md:hidden min-w-[28px] min-h-[28px] flex items-center justify-center text-[#7C2D48] bg-[#FDF2F4] rounded-md"
                        title="Inspeccionar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSprite(graphic.id);
                        }}
                        className="lg:opacity-0 lg:group-hover:opacity-100 min-w-[28px] min-h-[28px] flex items-center justify-center text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                        title="Eliminar sprite"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredGraphics.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-[#6B7280]">
                <Package className="w-12 h-12 text-[#CBD5E1] mb-3" />
                <p className="text-sm font-semibold text-[#374151]">
                  No hay sprites en este paquete FPG
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Pulsa "Añadir PNGs" para agrupar imágenes o "Nuevo Sprite" para crearlo.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Sprite Inspector & DIV Code Generator */}
        <div
          className={`${
            mobileTab === "inspector" ? "flex" : "hidden md:flex"
          } w-full md:w-80 lg:w-96 flex-col bg-white overflow-y-auto`}
        >
          {selectedGraphic ? (
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#7C2D48] text-white shrink-0">
                      ID #{selectedGraphic.id}
                    </span>
                    <h3 className="text-sm font-bold text-[#111827] truncate">
                      {selectedGraphic.name}
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#6B7280] font-mono mt-0.5 block">
                    Paquete: <span className="text-[#2F6F4E] font-semibold">{activePackage?.filename}</span>
                  </span>
                </div>

                {onOpenSpriteEditor && (
                  <button
                    onClick={() => onOpenSpriteEditor(selectedGraphic)}
                    className="flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg bg-[#FDF2F4] text-[#7C2D48] hover:bg-[#FCE7EB] border border-[#FBCFE8] text-xs font-bold transition-colors shrink-0 whitespace-nowrap"
                    title="Editar píxeles en el Editor de Sprites"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Pintar</span>
                  </button>
                )}
              </div>

              {/* Big Zoomed Preview Canvas (dark checkerboard) */}
              <div className="flex flex-col items-center justify-center p-4 bg-[#0F172A] rounded-xl border border-[#CBD5E1]">
                <div
                  className="relative flex items-center justify-center p-3 rounded-lg overflow-hidden"
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

                <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-[11px] font-mono text-slate-300">
                  <span>Tamaño: {selectedGraphic.width}x{selectedGraphic.height} px</span>
                  <span>Centro: ({selectedGraphic.cx}, {selectedGraphic.cy})</span>
                </div>
              </div>

              {/* Control Points */}
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                    <Crosshair className="w-3.5 h-3.5 text-[#7C2D48]" />
                    <span>Puntos de Control</span>
                  </div>
                  <button
                    onClick={() => {
                      const cx = Math.floor(selectedGraphic.width / 2);
                      const cy = Math.floor(selectedGraphic.height / 2);
                      handleUpdateCPoint(0, cx, cy);
                      showToast("Centro restablecido");
                    }}
                    className="px-2.5 py-1 rounded bg-white border border-[#E2E8F0] text-[11px] font-semibold text-[#7C2D48] hover:bg-[#FDF2F4]"
                  >
                    Centrar CP #0
                  </button>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {(selectedGraphic.cpoints || []).map((cp) => (
                    <div
                      key={cp.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-white px-2.5 py-2 rounded-lg border border-[#E2E8F0]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#7C2D48] font-bold">CP #{cp.id}</span>
                        <span className="text-[#6B7280] text-[11px]">
                          {cp.id === 0 ? "(Centro)" : cp.id === 1 ? "(Disparo)" : "(Extra)"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[#6B7280]">X:</span>
                          <input
                            type="number"
                            value={cp.x}
                            onChange={(e) =>
                              handleUpdateCPoint(cp.id, Number(e.target.value), cp.y)
                            }
                            className="w-14 h-8 px-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-center text-[#111827] font-bold focus:outline-none focus:border-[#7C2D48]"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[#6B7280]">Y:</span>
                          <input
                            type="number"
                            value={cp.y}
                            onChange={(e) =>
                              handleUpdateCPoint(cp.id, cp.x, Number(e.target.value))
                            }
                            className="w-14 h-8 px-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-center text-[#111827] font-bold focus:outline-none focus:border-[#7C2D48]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DIV Code Generation Box */}
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#7C2D48]">
                    <Code className="w-3.5 h-3.5" />
                    <span>Código DIV del Sprite</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopySnippet}
                      className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#374151] text-xs transition-colors"
                      title="Copiar snippet DIV"
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
                        title="Insertar en código actual"
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
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center text-[#6B7280]">
              <ImageIcon className="w-10 h-10 text-[#CBD5E1] mb-2" />
              <p className="text-xs font-medium">Selecciona un sprite para ver sus detalles</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 right-4 left-4 sm:left-auto z-50 px-3.5 py-2.5 bg-[#111827] text-white rounded-xl shadow-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal: New FPG Package */}
      {isNewPkgModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#7C2D48] font-bold text-sm">
              <Package className="w-4 h-4" />
              <span>Crear Nuevo Paquete FPG Virtual</span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[#4B5563] mb-1 font-mono font-semibold">Nombre de Archivo (.fpg):</label>
                <input
                  type="text"
                  placeholder="ej: enemigos.fpg"
                  value={newPkgFilename}
                  onChange={(e) => setNewPkgFilename(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg font-mono text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                />
              </div>

              <div>
                <label className="block text-[#4B5563] mb-1 font-semibold">Nombre descriptivo:</label>
                <input
                  type="text"
                  placeholder="ej: Sprites de Enemigos y Jefes"
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                />
              </div>

              <div>
                <label className="block text-[#4B5563] mb-1 font-semibold">Descripción (opcional):</label>
                <textarea
                  placeholder="Describe qué contiene este paquete de gráficos..."
                  value={newPkgDesc}
                  onChange={(e) => setNewPkgDesc(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#111827] focus:outline-none focus:border-[#7C2D48] h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsNewPkgModalOpen(false)}
                className="px-4 min-h-[40px] rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#374151] text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePackage}
                className="px-4 min-h-[40px] rounded-lg bg-[#7C2D48] hover:bg-[#66233A] text-white font-bold text-xs"
              >
                Crear Paquete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Sprite in Package */}
      {isNewSpriteModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#7C2D48] font-bold text-sm">
              <ImageIcon className="w-4 h-4" />
              <span>Añadir Nuevo Sprite a {activePackage?.filename}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#4B5563] mb-1 font-mono font-semibold">ID de Gráfico (1-999):</label>
                <input
                  type="number"
                  value={newSpriteId}
                  onChange={(e) => setNewSpriteId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg font-mono text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                />
              </div>

              <div>
                <label className="block text-[#4B5563] mb-1 font-semibold">Nombre:</label>
                <input
                  type="text"
                  placeholder="ej: nave_roja"
                  value={newSpriteName}
                  onChange={(e) => setNewSpriteName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg font-mono text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                />
              </div>

              <div>
                <label className="block text-[#4B5563] mb-1 font-semibold">Ancho (px):</label>
                <select
                  value={newSpriteW}
                  onChange={(e) => setNewSpriteW(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg font-mono text-[#111827] focus:outline-none focus:border-[#7C2D48]"
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
                <label className="block text-[#4B5563] mb-1 font-semibold">Alto (px):</label>
                <select
                  value={newSpriteH}
                  onChange={(e) => setNewSpriteH(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg font-mono text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                >
                  <option value={16}>16 px</option>
                  <option value={24}>24 px</option>
                  <option value={32}>32 px (Estándar)</option>
                  <option value={48}>48 px</option>
                  <option value={64}>64 px</option>
                  <option value={128}>128 px</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[#4B5563] mb-1 font-semibold">Relleno Inicial:</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSpritePattern("checker")}
                    className={`flex-1 min-h-[38px] px-2 rounded-lg border text-xs font-semibold ${
                      newSpritePattern === "checker"
                        ? "bg-[#FDF2F4] border-[#7C2D48] text-[#7C2D48]"
                        : "bg-[#F8FAFC] border-[#E2E8F0] text-[#4B5563]"
                    }`}
                  >
                    Tablero de prueba
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSpritePattern("border")}
                    className={`flex-1 min-h-[38px] px-2 rounded-lg border text-xs font-semibold ${
                      newSpritePattern === "border"
                        ? "bg-[#FDF2F4] border-[#7C2D48] text-[#7C2D48]"
                        : "bg-[#F8FAFC] border-[#E2E8F0] text-[#4B5563]"
                    }`}
                  >
                    Caja con borde
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSpritePattern("empty")}
                    className={`flex-1 min-h-[38px] px-2 rounded-lg border text-xs font-semibold ${
                      newSpritePattern === "empty"
                        ? "bg-[#FDF2F4] border-[#7C2D48] text-[#7C2D48]"
                        : "bg-[#F8FAFC] border-[#E2E8F0] text-[#4B5563]"
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
                className="px-4 min-h-[40px] rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#374151] text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSprite}
                className="px-4 min-h-[40px] rounded-lg bg-[#7C2D48] hover:bg-[#66233A] text-white font-bold text-xs"
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
