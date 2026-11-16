import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Image as ImageIcon,
  Package,
  FileImage,
  Upload,
  Plus,
  Trash2,
  Code2,
  Compass,
  Check,
  X,
  Sparkles,
  Paintbrush,
  ArrowRight,
} from "lucide-react";
import { DivGraphic } from "../types";
import { DivRuntime } from "../engine/runtime";
import {
  CustomModel3DAsset,
  CustomTextureAsset,
  listCustomModels3D,
  listCustomTextures,
  saveCustomModel3D,
  deleteCustomModel3D,
  createCharacterModelPreset,
  imageFileToTextureAsset,
  createProceduralCustomTexture,
  divGraphicToTextureAsset,
  deleteCustomTexture,
  subscribeAssetLibrary,
} from "../engine/assetLibrary";
import { parseMD2Buffer, parseMD3Buffer, ParsedMD2Model } from "../engine/md2Parser";
import {
  DivMapFile,
  fileToDivGraphic,
  createNewDivGraphic,
} from "../engine/fpgManager";
import { invalidateMode8ThreeTexture } from "../engine/mode8ThreeRenderer";

export type SelectedStudioAsset =
  | { kind: "model3d"; id: string }
  | { kind: "texture"; id: string }
  | { kind: "fpg"; id: number; pkgId: number }
  | { kind: "map"; id: number };

interface AssetManagerModalProps {
  isOpen: boolean;
  initialTab?: "model3d" | "texture" | "fpg" | "map";
  onClose: () => void;
  runtime: DivRuntime;
  fpg: DivGraphic[];
  onUpdateFpg: (next: DivGraphic[]) => void;
  onPackagesChanged?: () => void;
  onInsertCode: (snippet: string) => void;
  onSelectAsset?: (asset: SelectedStudioAsset) => void;
  onOpenInMode8?: (options?: { modelId?: string; textureName?: string }) => void;
  onOpenStudioTool?: (tool: "sprites" | "fpg" | "map" | "md2viewer") => void;
}

export const AssetManagerModal: React.FC<AssetManagerModalProps> = ({
  isOpen,
  initialTab = "model3d",
  onClose,
  runtime,
  fpg,
  onUpdateFpg,
  onPackagesChanged,
  onInsertCode,
  onSelectAsset,
  onOpenInMode8,
  onOpenStudioTool,
}) => {
  const [activeTab, setActiveTab] = useState<"model3d" | "texture" | "fpg" | "map">(initialTab);
  const [customModels, setCustomModels] = useState<CustomModel3DAsset[]>(() => listCustomModels3D());
  const [customTextures, setCustomTextures] = useState<CustomTextureAsset[]>(() => listCustomTextures());
  const [mapFiles, setMapFiles] = useState<DivMapFile[]>(() =>
    runtime?.mapFiles ? Array.from(runtime.mapFiles.values()) : []
  );

  // MD2/MD3 form state
  const [modelName, setModelName] = useState("Guerrero MD2");
  const [modelRole, setModelRole] = useState<"prop" | "enemy" | "ally" | "goal">("enemy");
  const [modelColor, setModelColor] = useState("#7C2D48");
  const [modelArchetype, setModelArchetype] = useState<"hombre" | "mujer" | "nino" | "armado">("armado");
  const [pendingParsedModel, setPendingParsedModel] = useState<{
    parsed: ParsedMD2Model;
    format: "md2" | "md3";
    filename: string;
  } | null>(null);
  const [pendingSkinDataUrl, setPendingSkinDataUrl] = useState<string | undefined>(undefined);

  // Texture form state
  const [texName, setTexName] = useState("PARED_MARMOL");
  const [texKind, setTexKind] = useState<"both" | "wall" | "flat">("both");
  const [texPattern, setTexPattern] = useState<"bricks" | "tiles" | "marble" | "cyber" | "wood" | "studs">("bricks");
  const [texColor1, setTexColor1] = useState("#2563eb");
  const [texColor2, setTexColor2] = useState("#93c5fd");
  const [texStudBump, setTexStudBump] = useState(true);

  // FPG sprite form state
  const [fpgSpriteName, setFpgSpriteName] = useState("heroe_sprite");
  const [fpgSpriteId, setFpgSpriteId] = useState<number>(() => Math.max(1, ...fpg.map((g) => g.id)) + 1);
  const [fpgSpriteSize, setFpgSpriteSize] = useState<number>(64);
  const [fpgPattern, setFpgPattern] = useState<"checker" | "border" | "empty">("checker");

  // MAP form state
  const [mapName, setMapName] = useState("fondo_nivel.map");
  const [mapWidth, setMapWidth] = useState<number>(160);
  const [mapHeight, setMapHeight] = useState<number>(120);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const skinFileInputRef = useRef<HTMLInputElement>(null);
  const texFileInputRef = useRef<HTMLInputElement>(null);
  const fpgFileInputRef = useRef<HTMLInputElement>(null);
  const mapFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    setCustomModels(listCustomModels3D());
    setCustomTextures(listCustomTextures());
    setMapFiles(runtime?.mapFiles ? Array.from(runtime.mapFiles.values()) : []);
    setFpgSpriteId(Math.max(1, ...fpg.map((g) => g.id)) + 1);
  }, [isOpen, runtime, fpg]);

  useEffect(() => {
    return subscribeAssetLibrary(() => {
      setCustomModels(listCustomModels3D());
      setCustomTextures(listCustomTextures());
    });
  }, []);

  if (!isOpen) return null;

  const notify = (msg: string) => {
    setErrorMsg(null);
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(null), 3200);
  };

  const fail = (msg: string) => {
    setStatusMsg(null);
    setErrorMsg(msg);
  };

  const handleUploadModelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const ext = file.name.split(".").pop()?.toLowerCase();
      const parsed = ext === "md3" ? parseMD3Buffer(buf, file.name) : parseMD2Buffer(buf, file.name);
      const baseName = file.name.replace(/\.(md2|md3)$/i, "").replace(/[_-]+/g, " ");
      setModelName(baseName);
      setPendingParsedModel({
        parsed,
        format: ext === "md3" ? "md3" : "md2",
        filename: file.name,
      });
      notify(`Malla cargada (${parsed.frames[0]?.vertices.length || 0} vértices). Ahora dale nombre y guárdala.`);
    } catch (err: any) {
      fail(err?.message || "No se pudo leer el archivo MD2/MD3.");
    }
  };

  const handleUploadSkinFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingSkinDataUrl(reader.result);
        notify("Textura Skin cargada para el modelo 3D.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveModel3D = () => {
    if (!modelName.trim()) {
      fail("Escribe un nombre para el objeto 3D.");
      return;
    }
    let saved: CustomModel3DAsset;
    if (pendingParsedModel) {
      saved = saveCustomModel3D({
        name: modelName.trim(),
        format: pendingParsedModel.format,
        defaultRole: modelRole,
        colorHint: modelColor,
        model: pendingParsedModel.parsed,
        skinDataUrl: pendingSkinDataUrl,
      });
      setPendingParsedModel(null);
      setPendingSkinDataUrl(undefined);
    } else {
      saved = createCharacterModelPreset(modelArchetype, modelName.trim(), modelRole, modelColor);
    }
    onSelectAsset?.({ kind: "model3d", id: saved.id });
    notify(`Objeto 3D "${saved.name}" guardado con ID "${saved.id}".`);
  };

  const handleUploadTextureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const targetName =
        texName.trim() ||
        file.name
          .replace(/\.[^.]+$/, "")
          .toUpperCase()
          .replace(/[^A-Z0-9_]+/g, "_");
      const saved = await imageFileToTextureAsset(file, targetName, {
        kind: texKind,
        useStudBump: texStudBump,
      });
      invalidateMode8ThreeTexture(saved.name);
      setTexName(saved.name);
      onSelectAsset?.({ kind: "texture", id: saved.name });
      notify(`Textura "${saved.name}" importada para 3D Modo 8.`);
    } catch (err: any) {
      fail(err?.message || "No se pudo importar la imagen como textura.");
    }
  };

  const handleCreateProceduralTex = () => {
    if (!texName.trim()) {
      fail("Escribe un nombre para la textura.");
      return;
    }
    const saved = createProceduralCustomTexture({
      name: texName.trim(),
      pattern: texPattern,
      primaryColor: texColor1,
      secondaryColor: texColor2,
      kind: texKind,
      useStudBump: texStudBump,
    });
    invalidateMode8ThreeTexture(saved.name);
    onSelectAsset?.({ kind: "texture", id: saved.name });
    notify(`Textura "${saved.name}" creada y lista para usar en 3D.`);
  };

  const handleUploadFpgSprite = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const nextId = fpg.some((g) => g.id === fpgSpriteId)
        ? Math.max(1, ...fpg.map((g) => g.id)) + 1
        : fpgSpriteId;
      const g = await fileToDivGraphic(file, nextId, fpgSpriteName.trim() || undefined);
      const updated = [...fpg, g];
      onUpdateFpg(updated);
      runtime?.loadFPG(updated);
      const pkg0 = runtime?.fpgPackages?.get(0);
      if (pkg0) {
        pkg0.graphics = updated;
        onPackagesChanged?.();
      }
      setFpgSpriteId(nextId + 1);
      onSelectAsset?.({ kind: "fpg", id: g.id, pkgId: 0 });
      notify(`Sprite "${g.name}" (#${g.id}) importado al paquete FPG principal.`);
    } catch (err: any) {
      fail(err?.message || "No se pudo importar la imagen al FPG.");
    }
  };

  const handleCreateFpgSprite = () => {
    const nextId = fpg.some((g) => g.id === fpgSpriteId)
      ? Math.max(1, ...fpg.map((g) => g.id)) + 1
      : fpgSpriteId;
    const g = createNewDivGraphic(
      nextId,
      fpgSpriteName.trim() || `sprite_${nextId}`,
      fpgSpriteSize,
      fpgSpriteSize,
      fpgPattern
    );
    const updated = [...fpg, g];
    onUpdateFpg(updated);
    runtime?.loadFPG(updated);
    const pkg0 = runtime?.fpgPackages?.get(0);
    if (pkg0) {
      pkg0.graphics = updated;
      onPackagesChanged?.();
    }
    setFpgSpriteId(nextId + 1);
    onSelectAsset?.({ kind: "fpg", id: g.id, pkgId: 0 });
    notify(`Sprite "${g.name}" (#${g.id}) creado en el FPG.`);
  };

  const handleUploadMapFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const existing: DivMapFile[] = runtime?.mapFiles ? (Array.from(runtime.mapFiles.values()) as DivMapFile[]) : [];
      const nextId = Math.max(100, ...existing.map((m) => m.id)) + 1;
      const cleanName = mapName.trim() || file.name.replace(/\.[^.]+$/, "");
      const fn = cleanName.toLowerCase().endsWith(".map") ? cleanName.toLowerCase() : `${cleanName.toLowerCase()}.map`;
      const g = await fileToDivGraphic(file, nextId, cleanName.replace(/\.map$/i, ""));
      const newMap: DivMapFile = {
        id: nextId,
        name: cleanName.replace(/\.map$/i, ""),
        filename: fn,
        graphic: g,
      };
      runtime?.mapFiles?.set(nextId, newMap);
      setMapFiles(Array.from(runtime.mapFiles.values()));
      onSelectAsset?.({ kind: "map", id: nextId });
      notify(`Mapa "${fn}" (#${nextId}) importado.`);
    } catch (err: any) {
      fail(err?.message || "No se pudo importar la imagen como mapa .MAP.");
    }
  };

  const handleCreateMapFile = () => {
    const existing: DivMapFile[] = runtime?.mapFiles ? (Array.from(runtime.mapFiles.values()) as DivMapFile[]) : [];
    const nextId = Math.max(100, ...existing.map((m) => m.id)) + 1;
    const rawName = mapName.trim() || `mapa_${nextId}`;
    const cleanTitle = rawName.replace(/\.map$/i, "");
    const fn = `${cleanTitle.toLowerCase().replace(/[^a-z0-9_]+/g, "_")}.map`;
    const g = createNewDivGraphic(nextId, cleanTitle, mapWidth, mapHeight, "checker");
    const newMap: DivMapFile = {
      id: nextId,
      name: cleanTitle,
      filename: fn,
      graphic: g,
    };
    runtime?.mapFiles?.set(nextId, newMap);
    setMapFiles(Array.from(runtime.mapFiles.values()));
    onSelectAsset?.({ kind: "map", id: nextId });
    notify(`Mapa "${fn}" (${mapWidth}×${mapHeight}) creado.`);
  };

  const tabs = [
    { id: "model3d" as const, label: "Objetos MD2/MD3", icon: Box, accent: "#7C2D48" },
    { id: "texture" as const, label: "Texturas 3D", icon: ImageIcon, accent: "#2563EB" },
    { id: "fpg" as const, label: "Sprites FPG", icon: Package, accent: "#2F6F4E" },
    { id: "map" as const, label: "Mapas .MAP", icon: FileImage, accent: "#D97706" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl max-h-[92dvh] bg-[#F1F5F9] rounded-t-2xl sm:rounded-2xl border border-[#CBD5E1] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-white border-b border-[#CBD5E1] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FDF2F5] text-[#7C2D48] flex items-center justify-center flex-shrink-0">
              <Box className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#111827] truncate">
                Importar y Crear Activos con Nombre
              </h2>
              <p className="text-[11px] text-[#4B5563] truncate">
                Modelos 3D MD2/MD3, Texturas PBR, Sprites FPG y Mapas .MAP listos para usar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-slate-100 text-[#374151] flex items-center justify-center cursor-pointer flex-shrink-0"
            aria-label="Cerrar gestor de activos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Brick Tabs */}
        <div className="px-3 py-2 bg-white border-b border-[#CBD5E1] flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[42px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                  active
                    ? "bg-[#111827] text-white border-[#111827] shadow-[0_2px_0_0_#334155]"
                    : "bg-[#F8FAFC] text-[#374151] border-[#CBD5E1] hover:bg-white"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tab.accent }} />
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notifications */}
        {(statusMsg || errorMsg) && (
          <div
            className={`mx-4 mt-3 px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 flex-shrink-0 ${
              errorMsg
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-[#EEF6F1] border-[#CFE4D7] text-[#2F6F4E]"
            }`}
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg || statusMsg}</span>
          </div>
        )}

        {/* Body Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* LEFT BRICK: CREATE OR IMPORT WITH NAME */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#CBD5E1] shadow-[0_3px_0_0_#CBD5E1] p-4 flex flex-col gap-3">
            {activeTab === "model3d" && (
              <>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#7C2D48]">
                    Nuevo Objeto 3D (MD2 / MD3)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenStudioTool?.("md2viewer");
                    }}
                    className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    Abrir Visor MD2
                  </button>
                </div>

                {/* Upload MD2/MD3 */}
                <input
                  ref={modelFileInputRef}
                  type="file"
                  accept=".md2,.md3"
                  onChange={handleUploadModelFile}
                  className="hidden"
                />
                <input
                  ref={skinFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadSkinFile}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => modelFileInputRef.current?.click()}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#FDF2F5] hover:bg-[#FCE7EE] border border-[#F3D0DC] text-[#7C2D48] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Importar .MD2/.MD3</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => skinFileInputRef.current?.click()}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#CBD5E1] text-[#111827] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>{pendingSkinDataUrl ? "Skin Lista" : "Textura Skin"}</span>
                  </button>
                </div>

                {pendingParsedModel ? (
                  <div className="px-3 py-2 rounded-xl bg-[#EEF6F1] border border-[#CFE4D7] text-[11px] font-semibold text-[#2F6F4E] flex items-center justify-between gap-2">
                    <span className="truncate">
                      {pendingParsedModel.filename} · {pendingParsedModel.parsed.frames.length} frames ·{" "}
                      {pendingParsedModel.parsed.triangles.length} tris
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingParsedModel(null)}
                      className="text-rose-700 font-bold cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#4B5563]">
                      O generar desde arquetipo base:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "hombre", label: "Héroe" },
                        { id: "mujer", label: "Exploradora" },
                        { id: "nino", label: "Cadete" },
                        { id: "armado", label: "Soldado Armado" },
                      ].map((arch) => (
                        <button
                          key={arch.id}
                          type="button"
                          onClick={() => setModelArchetype(arch.id as any)}
                          className={`min-h-[38px] px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                            modelArchetype === arch.id
                              ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                              : "bg-[#F8FAFC] text-[#374151] border-[#CBD5E1]"
                          }`}
                        >
                          {arch.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#4B5563]">Nombre del Objeto 3D</label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="Ej. Jefe Dragon MD3"
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#4B5563]">Comportamiento</label>
                    <select
                      value={modelRole}
                      onChange={(e) => setModelRole(e.target.value as any)}
                      className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#111827]"
                    >
                      <option value="enemy">Enemigo IA</option>
                      <option value="ally">Aliado / NPC</option>
                      <option value="prop">Decoración / Prop</option>
                      <option value="goal">Meta / Trofeo</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#4B5563]">Color Base</label>
                    <div className="flex items-center gap-2 min-h-[40px] px-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1]">
                      <input
                        type="color"
                        value={modelColor}
                        onChange={(e) => setModelColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-xs font-mono text-[#374151]">{modelColor}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveModel3D}
                  className="min-h-[46px] w-full px-4 py-2.5 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-extrabold shadow-[0_3px_0_0_#50192D] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Guardar Objeto 3D con Nombre</span>
                </button>
              </>
            )}

            {activeTab === "texture" && (
              <>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#2563EB]">
                    Nueva Textura 3D
                  </span>
                </div>

                <input
                  ref={texFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadTextureFile}
                  className="hidden"
                />

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#4B5563]">Nombre de Textura (en Mayúsculas)</label>
                  <input
                    type="text"
                    value={texName}
                    onChange={(e) => setTexName(e.target.value.toUpperCase())}
                    placeholder="Ej. PARED_MARMOL"
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => texFileInputRef.current?.click()}
                  className="min-h-[44px] w-full px-3 py-2 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-[#1D4ED8] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importar Imagen PNG / JPG como Textura</span>
                </button>

                <div className="pt-2 border-t border-[#E2E8F0] space-y-2.5">
                  <span className="block text-[11px] font-bold text-[#4B5563]">
                    O crear textura repetible al instante:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "bricks", label: "Ladrillo" },
                      { id: "tiles", label: "Baldosas" },
                      { id: "marble", label: "Mármol" },
                      { id: "cyber", label: "Cyber" },
                      { id: "wood", label: "Madera" },
                      { id: "studs", label: "Bloques 3D" },
                    ].map((pat) => (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => setTexPattern(pat.id as any)}
                        className={`min-h-[36px] px-2 rounded-lg border text-[11px] font-bold cursor-pointer ${
                          texPattern === pat.id
                            ? "bg-[#2563EB] text-white border-[#2563EB]"
                            : "bg-[#F8FAFC] text-[#374151] border-[#CBD5E1]"
                        }`}
                      >
                        {pat.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-1.5 min-h-[38px] px-2 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[11px] font-semibold">
                      <input type="color" value={texColor1} onChange={(e) => setTexColor1(e.target.value)} className="w-6 h-6 border-0 bg-transparent cursor-pointer" />
                      <span>Base</span>
                    </label>
                    <label className="flex items-center gap-1.5 min-h-[38px] px-2 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[11px] font-semibold">
                      <input type="color" value={texColor2} onChange={(e) => setTexColor2(e.target.value)} className="w-6 h-6 border-0 bg-transparent cursor-pointer" />
                      <span>Detalle</span>
                    </label>
                    <select
                      value={texKind}
                      onChange={(e) => setTexKind(e.target.value as any)}
                      className="min-h-[38px] px-2 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[11px] font-semibold"
                    >
                      <option value="both">Pared y Suelo</option>
                      <option value="wall">Solo Pared</option>
                      <option value="flat">Solo Suelo</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-[#374151] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={texStudBump}
                      onChange={(e) => setTexStudBump(e.target.checked)}
                      className="rounded border-[#CBD5E1]"
                    />
                    <span>Relieve 3D estilo encaje</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleCreateProceduralTex}
                    className="min-h-[46px] w-full px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold shadow-[0_3px_0_0_#1E40AF] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Crear Textura con Nombre</span>
                  </button>
                </div>
              </>
            )}

            {activeTab === "fpg" && (
              <>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#2F6F4E]">
                    Nuevo Sprite en Paquete FPG
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenStudioTool?.("sprites");
                    }}
                    className="text-[11px] font-bold text-[#2F6F4E] hover:underline cursor-pointer"
                  >
                    Editor Pixel Art
                  </button>
                </div>

                <input
                  ref={fpgFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadFpgSprite}
                  className="hidden"
                />

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[11px] font-bold text-[#4B5563]">Nombre del Sprite</label>
                    <input
                      type="text"
                      value={fpgSpriteName}
                      onChange={(e) => setFpgSpriteName(e.target.value)}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#4B5563]">ID Gráfico</label>
                    <input
                      type="number"
                      min={1}
                      value={fpgSpriteId}
                      onChange={(e) => setFpgSpriteId(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fpgFileInputRef.current?.click()}
                  className="min-h-[44px] w-full px-3 py-2 rounded-xl bg-[#EEF6F1] hover:bg-[#DCEEE3] border border-[#CFE4D7] text-[#2F6F4E] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importar PNG / JPG al FPG</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
                  <select
                    value={fpgSpriteSize}
                    onChange={(e) => setFpgSpriteSize(Number(e.target.value))}
                    className="min-h-[40px] px-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold"
                  >
                    <option value={32}>32×32 px</option>
                    <option value={64}>64×64 px</option>
                    <option value={128}>128×128 px</option>
                  </select>
                  <select
                    value={fpgPattern}
                    onChange={(e) => setFpgPattern(e.target.value as any)}
                    className="min-h-[40px] px-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold"
                  >
                    <option value="checker">Patrón Damero</option>
                    <option value="border">Marco Sólido</option>
                    <option value="empty">Lienzo Vacío</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleCreateFpgSprite}
                  className="min-h-[46px] w-full px-4 py-2.5 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-extrabold shadow-[0_3px_0_0_#1D4731] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Sprite en FPG</span>
                </button>
              </>
            )}

            {activeTab === "map" && (
              <>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#B45309]">
                    Nuevo Mapa Gráfico .MAP
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenStudioTool?.("map");
                    }}
                    className="text-[11px] font-bold text-[#B45309] hover:underline cursor-pointer"
                  >
                    Abrir Editor MAP
                  </button>
                </div>

                <input
                  ref={mapFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadMapFile}
                  className="hidden"
                />

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#4B5563]">Nombre del Mapa (.MAP)</label>
                  <input
                    type="text"
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                    placeholder="fondo_ciudad.map"
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => mapFileInputRef.current?.click()}
                  className="min-h-[44px] w-full px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importar Imagen como .MAP</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#4B5563]">Ancho (px)</label>
                    <input
                      type="number"
                      min={16}
                      max={1024}
                      value={mapWidth}
                      onChange={(e) => setMapWidth(Math.max(16, Number(e.target.value) || 160))}
                      className="w-full min-h-[38px] px-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#4B5563]">Alto (px)</label>
                    <input
                      type="number"
                      min={16}
                      max={1024}
                      value={mapHeight}
                      onChange={(e) => setMapHeight(Math.max(16, Number(e.target.value) || 120))}
                      className="w-full min-h-[38px] px-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateMapFile}
                  className="min-h-[46px] w-full px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-extrabold shadow-[0_3px_0_0_#92400E] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear .MAP con Nombre</span>
                </button>
              </>
            )}
          </div>

          {/* RIGHT BRICK: SAVED LIBRARY WITH QUICK 1-TAP ACTIONS */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#CBD5E1] shadow-[0_3px_0_0_#CBD5E1] p-4 flex flex-col gap-3 min-h-[320px]">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#111827]">
                {activeTab === "model3d" && `Objetos 3D Guardados (${customModels.length})`}
                {activeTab === "texture" && `Texturas 3D Guardadas (${customTextures.length})`}
                {activeTab === "fpg" && `Sprites en FPG Principal (${fpg.length})`}
                {activeTab === "map" && `Archivos .MAP (${mapFiles.length})`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 max-h-[440px]">
              {activeTab === "model3d" &&
                (customModels.length === 0 ? (
                  <p className="text-xs text-[#6B7280] py-8 text-center">
                    Todavía no hay modelos MD2/MD3 guardados. Importa un `.md2` / `.md3` o crea uno desde un arquetipo base a la izquierda.
                  </p>
                ) : (
                  customModels.map((mod) => (
                    <div
                      key={mod.id}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex flex-wrap items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-xl border border-black/15 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden"
                          style={{ backgroundColor: mod.colorHint }}
                        >
                          {mod.skinDataUrl ? (
                            <img src={mod.skinDataUrl} alt={mod.name} className="w-full h-full object-cover" />
                          ) : (
                            mod.format.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#111827] truncate">{mod.name}</div>
                          <div className="text-[11px] text-[#4B5563] font-mono truncate">
                            {mod.id} · {mod.vertexCount}v · {mod.frameCount}f · {mod.defaultRole}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAsset?.({ kind: "model3d", id: mod.id });
                            onOpenInMode8?.({ modelId: mod.id });
                            onClose();
                          }}
                          className="min-h-[36px] px-2.5 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Usar en 3D</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onInsertCode(
                              `\nm8_add_model("${mod.id}", 6.0, 6.0, 0, 0, "idle", ${mod.scale.toFixed(2)}, "${mod.defaultRole}", 80, 1.8, 12, "${mod.name}");\n`
                            );
                            notify(`Código de "${mod.name}" insertado.`);
                          }}
                          className="min-h-[36px] px-2.5 rounded-lg bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#111827] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>Código</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomModel3D(mod.id)}
                          className="w-9 h-9 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center cursor-pointer"
                          aria-label={`Eliminar ${mod.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ))}

              {activeTab === "texture" &&
                (customTextures.length === 0 ? (
                  <p className="text-xs text-[#6B7280] py-8 text-center">
                    No tienes texturas importadas aún. Sube una imagen o crea una textura modular a la izquierda.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {customTextures.map((tex) => (
                      <div
                        key={tex.name}
                        className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={tex.dataUrl}
                            alt={tex.displayName}
                            className="w-11 h-11 rounded-lg border border-[#CBD5E1] object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-mono font-bold text-[#111827] truncate">{tex.name}</div>
                            <div className="text-[11px] text-[#4B5563] truncate">
                              {tex.kind === "wall" ? "Pared" : tex.kind === "flat" ? "Suelo" : "Pared y Suelo"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectAsset?.({ kind: "texture", id: tex.name });
                              onOpenInMode8?.({ textureName: tex.name });
                              onClose();
                            }}
                            className="min-h-[34px] px-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-bold cursor-pointer"
                          >
                            Usar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCustomTexture(tex.name)}
                            className="w-8 h-8 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center cursor-pointer"
                            aria-label={`Eliminar ${tex.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

              {activeTab === "fpg" &&
                (fpg.length === 0 ? (
                  <p className="text-xs text-[#6B7280] py-8 text-center">No hay gráficos en el paquete FPG.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fpg.map((g) => (
                      <div
                        key={g.id}
                        className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-[#0F172A] border border-[#CBD5E1] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {g.dataUrl ? (
                              <img src={g.dataUrl} alt={g.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[10px] font-mono text-white">#{g.id}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#111827] truncate">{g.name || `Graf_${g.id}`}</div>
                            <div className="text-[11px] text-[#4B5563] font-mono">
                              ID {g.id} · {g.width}×{g.height}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const t = divGraphicToTextureAsset(g, `TEX_FPG_${g.id}_${g.name || "SPR"}`);
                              invalidateMode8ThreeTexture(t.name);
                              notify(`Convertido a Textura 3D "${t.name}".`);
                            }}
                            className="min-h-[34px] px-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-[10px] font-bold cursor-pointer"
                            title="Convertir sprite a textura 3D"
                          >
                            A 3D
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onInsertCode(`\n// Sprite #${g.id}: ${g.name}\ngraph = ${g.id};\n`);
                              notify(`Código "graph = ${g.id};" insertado.`);
                            }}
                            className="min-h-[34px] px-2 rounded-lg bg-white border border-[#CBD5E1] text-[#111827] text-[10px] font-bold cursor-pointer"
                          >
                            graph={g.id}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

              {activeTab === "map" &&
                (mapFiles.length === 0 ? (
                  <p className="text-xs text-[#6B7280] py-8 text-center">No hay archivos .MAP todavía.</p>
                ) : (
                  mapFiles.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-[#0F172A] border border-[#CBD5E1] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {m.graphic.dataUrl ? (
                            <img src={m.graphic.dataUrl} alt={m.name} className="w-full h-full object-contain" />
                          ) : (
                            <FileImage className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#111827] truncate">{m.filename}</div>
                          <div className="text-[11px] text-[#4B5563] font-mono">
                            ID {m.id} · {m.graphic.width}×{m.graphic.height}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const nextId = Math.max(1, ...fpg.map((g) => g.id)) + 1;
                            const cloned: DivGraphic = {
                              ...m.graphic,
                              id: nextId,
                              name: m.name,
                            };
                            const updated = [...fpg, cloned];
                            onUpdateFpg(updated);
                            runtime?.loadFPG(updated);
                            notify(`Mapa "${m.filename}" añadido al FPG como gráfico #${nextId}.`);
                          }}
                          className="min-h-[34px] px-2.5 rounded-lg bg-[#EEF6F1] border border-[#CFE4D7] text-[#2F6F4E] text-[11px] font-bold cursor-pointer"
                        >
                          Enviar a FPG
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const t = divGraphicToTextureAsset(m.graphic, `TEX_MAP_${m.name}`);
                            invalidateMode8ThreeTexture(t.name);
                            notify(`Mapa "${m.filename}" convertido a textura 3D "${t.name}".`);
                          }}
                          className="min-h-[34px] px-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-[11px] font-bold cursor-pointer"
                        >
                          A Textura 3D
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onInsertCode(`\nmap_id = load_map("${m.filename}");\nput_screen(0, map_id);\n`);
                            notify(`Código load_map("${m.filename}") insertado.`);
                          }}
                          className="min-h-[34px] px-2.5 rounded-lg bg-white border border-[#CBD5E1] text-[#111827] text-[11px] font-bold cursor-pointer"
                        >
                          Código
                        </button>
                      </div>
                    </div>
                  ))
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
