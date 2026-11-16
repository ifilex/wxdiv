import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Image as ImageIcon,
  Package,
  Upload,
  Search,
  Pencil,
  Check,
  X,
  Trash2,
  Eye,
  Plus,
  Compass,
  GripVertical,
  FolderPlus,
} from "lucide-react";
import { DivGraphic } from "../types";
import { DivRuntime } from "../engine/runtime";
import { DivFpgPackage, fileToDivGraphic } from "../engine/fpgManager";
import { parseMD2Buffer, parseMD3Buffer } from "../engine/md2Parser";
import {
  CustomModel3DAsset,
  CustomTextureAsset,
  listCustomModels3D,
  listCustomTextures,
  saveCustomModel3D,
  updateCustomModel3DMeta,
  deleteCustomModel3D,
  imageFileToTextureAsset,
  renameCustomTexture,
  deleteCustomTexture,
  subscribeAssetLibrary,
} from "../engine/assetLibrary";
import {
  DraggedAssetPayload,
  startAssetDrag,
  endAssetDrag,
} from "../engine/assetDragDrop";
import { SelectedStudioAsset } from "./AssetManagerPanel";

export type AssetBrowserCategory = "all" | "model3d" | "texture" | "fpg";

interface Model3DMiniPreviewProps {
  asset: CustomModel3DAsset;
  spinOnIdle?: boolean;
  size?: number;
  className?: string;
}

/**
 * Lightweight painter's-algorithm 3D canvas preview for .md2 / .md3 meshes.
 */
export const Model3DMiniPreview: React.FC<Model3DMiniPreviewProps> = ({
  asset,
  spinOnIdle = false,
  size = 140,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState(false);
  const angleRef = useRef(0.65);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const verts = asset.model.frames[0]?.vertices || [];
    const tris = asset.model.triangles || [];

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i];
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.z > maxZ) maxZ = v.z;
    }
    const cx = Number.isFinite(minX) ? (minX + maxX) * 0.5 : 0;
    const cy = Number.isFinite(minY) ? (minY + maxY) * 0.5 : 0;
    const cz = Number.isFinite(minZ) ? (minZ + maxZ) * 0.5 : 0;
    const span = Math.max(0.01, maxX - minX, maxY - minY, maxZ - minZ);
    const scale = (size * 0.68) / span;

    const baseHex = asset.colorHint || "#7C2D48";
    const rBase = parseInt(baseHex.slice(1, 3), 16) || 124;
    const gBase = parseInt(baseHex.slice(3, 5), 16) || 45;
    const bBase = parseInt(baseHex.slice(5, 7), 16) || 72;

    let rafId = 0;
    const drawFrame = () => {
      ctx.clearRect(0, 0, size, size);
      // Clean dark viewport grid backdrop
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.78);
      ctx.lineTo(size, size * 0.78);
      ctx.stroke();

      if (verts.length === 0 || tris.length === 0) {
        return;
      }

      const yaw = angleRef.current;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const pitch = 0.28;
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const projected: Array<{ sx: number; sy: number; dz: number }> = new Array(verts.length);
      for (let i = 0; i < verts.length; i++) {
        const vx = verts[i].x - cx;
        const vy = verts[i].y - cy;
        const vz = verts[i].z - cz; // MD2 Z is height

        // Rotate around vertical Z axis first, then tilt slightly by pitch
        const rx = vx * cosY - vy * sinY;
        const ry = vx * sinY + vy * cosY;
        const py = vz * cosP - ry * sinP;
        const pz = ry * cosP + vz * sinP;

        projected[i] = {
          sx: size * 0.5 + rx * scale,
          sy: size * 0.52 - py * scale,
          dz: pz,
        };
      }

      // Stride down ultra-dense meshes for responsive thumbnail rendering
      const step = tris.length > 900 ? Math.ceil(tris.length / 900) : 1;
      const list: Array<{ i0: number; i1: number; i2: number; depth: number; shade: number }> = [];

      for (let t = 0; t < tris.length; t += step) {
        const tri = tris[t].v;
        const p0 = projected[tri[0]];
        const p1 = projected[tri[1]];
        const p2 = projected[tri[2]];
        if (!p0 || !p1 || !p2) continue;

        const cross = (p1.sx - p0.sx) * (p2.sy - p0.sy) - (p1.sy - p0.sy) * (p2.sx - p0.sx);
        if (cross < 0) continue; // Back-face cull

        const depth = (p0.dz + p1.dz + p2.dz) / 3;
        const shade = Math.max(0.45, Math.min(1.15, 0.78 + depth / (span * 1.4)));
        list.push({ i0: tri[0], i1: tri[1], i2: tri[2], depth, shade });
      }

      list.sort((a, b) => a.depth - b.depth);

      for (let k = 0; k < list.length; k++) {
        const item = list[k];
        const p0 = projected[item.i0];
        const p1 = projected[item.i1];
        const p2 = projected[item.i2];
        const r = Math.min(255, Math.round(rBase * item.shade));
        const g = Math.min(255, Math.round(gBase * item.shade));
        const b = Math.min(255, Math.round(bBase * item.shade));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(p0.sx, p0.sy);
        ctx.lineTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.closePath();
        ctx.fill();
        if (list.length < 450) ctx.stroke();
      }
    };

    drawFrame();

    if (hovered || spinOnIdle) {
      let running = true;
      const tick = () => {
        if (!running) return;
        angleRef.current += 0.032;
        drawFrame();
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      return () => {
        running = false;
        cancelAnimationFrame(rafId);
      };
    }
  }, [asset, hovered, spinOnIdle, size]);

  return (
    <div
      className={`relative overflow-hidden bg-[#0F172A] ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full block"
      />
      {asset.skinDataUrl && (
        <img
          src={asset.skinDataUrl}
          alt={asset.name}
          className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded border border-white/40 object-cover shadow-sm"
          title="Skin asociada"
        />
      )}
    </div>
  );
};

interface AssetBrowserProps {
  layout?: "compact" | "full";
  runtime: DivRuntime;
  fpg: DivGraphic[];
  onUpdateFpg: (next: DivGraphic[]) => void;
  onPackagesChanged?: () => void;
  selectedAsset?: SelectedStudioAsset | null;
  onSelectAsset?: (asset: SelectedStudioAsset) => void;
  onOpenImporter?: (tab: "model3d" | "texture" | "fpg" | "map") => void;
  onUseModelInMode8?: (modelId: string) => void;
  onUseTextureInMode8?: (textureName: string) => void;
  onOpenFpgEditor?: () => void;
  onFeedback?: (msg: string) => void;
}

type PreviewTarget =
  | { kind: "model3d"; asset: CustomModel3DAsset }
  | { kind: "texture"; asset: CustomTextureAsset }
  | { kind: "fpg_package"; pkg: DivFpgPackage }
  | { kind: "fpg_sprite"; sprite: DivGraphic; pkgId: number };

export const AssetBrowser: React.FC<AssetBrowserProps> = ({
  layout = "full",
  runtime,
  fpg,
  onUpdateFpg,
  onPackagesChanged,
  selectedAsset,
  onSelectAsset,
  onOpenImporter,
  onUseModelInMode8,
  onUseTextureInMode8,
  onOpenFpgEditor,
  onFeedback,
}) => {
  const [category, setCategory] = useState<AssetBrowserCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customModels, setCustomModels] = useState<CustomModel3DAsset[]>(() => listCustomModels3D());
  const [customTextures, setCustomTextures] = useState<CustomTextureAsset[]>(() => listCustomTextures());
  const [activePkgId, setActivePkgId] = useState<number>(0);

  // Inline rename state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Modal Preview & Dropzone state
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [isFileDropOver, setIsFileDropOver] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeAssetLibrary(() => {
      setCustomModels(listCustomModels3D());
      setCustomTextures(listCustomTextures());
    });
  }, []);

  const showNote = (msg: string) => {
    setLocalMsg(msg);
    onFeedback?.(msg);
    window.setTimeout(() => setLocalMsg(null), 3000);
  };

  const packages: DivFpgPackage[] = useMemo(() => {
    const entries: DivFpgPackage[] = runtime?.fpgPackages
      ? (Array.from(runtime.fpgPackages.values()) as DivFpgPackage[])
      : [];
    if (entries.length === 0) {
      return [{ id: 0, name: "juego", filename: "juego.fpg", graphics: fpg }];
    }
    return entries.map((p) => (p.id === 0 ? { ...p, graphics: fpg } : p));
  }, [runtime, fpg]);

  const activePackage = useMemo(
    () => packages.find((p) => p.id === activePkgId) || packages[0],
    [packages, activePkgId]
  );

  const q = searchQuery.trim().toLowerCase();

  const filteredModels = useMemo(
    () =>
      customModels.filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.format.toLowerCase().includes(q)
      ),
    [customModels, q]
  );

  const filteredTextures = useMemo(
    () =>
      customTextures.filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.displayName.toLowerCase().includes(q)
      ),
    [customTextures, q]
  );

  const filteredPackages = useMemo(
    () =>
      packages.filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.filename.toLowerCase().includes(q) ||
          p.graphics.some((g) => (g.name || "").toLowerCase().includes(q))
      ),
    [packages, q]
  );

  const filteredSprites = useMemo(() => {
    const list = activePackage?.graphics || [];
    return list.filter(
      (g) => !q || (g.name || "").toLowerCase().includes(q) || String(g.id).includes(q)
    );
  }, [activePackage, q]);

  // Import local files (.md2, .md3, images, .json FPG) directly via input or OS drag-drop
  const handleImportFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    let importedCount = 0;
    let updatedFpg = [...(activePackage?.graphics || fpg)];
    let touchedFpg = false;

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const baseName = file.name.replace(/\.[^.]+$/, "");

      try {
        if (ext === "md2" || ext === "md3") {
          const buf = await file.arrayBuffer();
          const parsed = ext === "md3" ? parseMD3Buffer(buf, baseName) : parseMD2Buffer(buf, baseName);
          const saved = saveCustomModel3D({
            name: baseName,
            format: ext,
            defaultRole: "prop",
            colorHint: "#7C2D48",
            model: parsed,
          });
          onSelectAsset?.({ kind: "model3d", id: saved.id });
          importedCount++;
        } else if (ext === "json" || ext === "fpg") {
          const text = await file.text();
          try {
            const data = JSON.parse(text);
            if (Array.isArray(data?.graphics)) {
              const existingKeys = Array.from(runtime.fpgPackages.keys()) as number[];
              const newPkgId = Math.max(0, ...existingKeys) + 1;
              const cleanTitle = (data.name || baseName).trim();
              runtime.fpgPackages.set(newPkgId, {
                id: newPkgId,
                name: cleanTitle,
                filename: `${cleanTitle.toLowerCase().replace(/[^a-z0-9_]+/g, "_")}.fpg`,
                graphics: data.graphics,
              });
              setActivePkgId(newPkgId);
              onPackagesChanged?.();
              importedCount++;
            }
          } catch {
            showNote(`"${file.name}" no tiene estructura FPG JSON válida.`);
          }
        } else if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
          if (category === "fpg") {
            const nextId = Math.max(1, ...updatedFpg.map((g) => g.id)) + 1;
            const g = await fileToDivGraphic(file, nextId, baseName);
            updatedFpg.push(g);
            touchedFpg = true;
            onSelectAsset?.({ kind: "fpg", id: g.id, pkgId: activePackage?.id ?? 0 });
            importedCount++;
          } else {
            const tex = await imageFileToTextureAsset(file, baseName, { kind: "both" });
            onSelectAsset?.({ kind: "texture", id: tex.name });
            importedCount++;
          }
        }
      } catch (err: any) {
        showNote(err?.message || `No se pudo importar ${file.name}`);
      }
    }

    if (touchedFpg) {
      if ((activePackage?.id ?? 0) === 0) {
        onUpdateFpg(updatedFpg);
        runtime?.loadFPG(updatedFpg);
      } else if (activePackage) {
        const pkg = runtime.fpgPackages.get(activePackage.id);
        if (pkg) {
          pkg.graphics = updatedFpg;
          onPackagesChanged?.();
        }
      }
    }

    if (importedCount > 0) {
      showNote(
        importedCount === 1
          ? "Activo importado y listo para usar."
          : `${importedCount} activos importados correctamente.`
      );
    }
  };

  // Inline rename handlers
  const beginRename = (key: string, currentName: string) => {
    setEditingKey(key);
    setEditingValue(currentName);
  };

  const commitRename = () => {
    if (!editingKey) return;
    const next = editingValue.trim();
    if (!next) {
      setEditingKey(null);
      return;
    }

    if (editingKey.startsWith("model3d:")) {
      const id = editingKey.slice("model3d:".length);
      updateCustomModel3DMeta(id, { name: next });
      showNote(`Modelo renombrado a "${next}"`);
    } else if (editingKey.startsWith("texture:")) {
      const oldName = editingKey.slice("texture:".length);
      const renamed = renameCustomTexture(oldName, next);
      if (renamed) {
        if (selectedAsset?.kind === "texture" && selectedAsset.id === oldName) {
          onSelectAsset?.({ kind: "texture", id: renamed.name });
        }
        showNote(`Textura renombrada a ${renamed.name}`);
      }
    } else if (editingKey.startsWith("fpg_pkg:")) {
      const pkgId = Number(editingKey.slice("fpg_pkg:".length));
      const pkg = runtime.fpgPackages.get(pkgId);
      if (pkg) {
        const cleanSlug = next.replace(/\.fpg$/i, "").trim();
        pkg.name = cleanSlug;
        pkg.filename = `${cleanSlug.toLowerCase().replace(/[^a-z0-9_]+/g, "_")}.fpg`;
        onPackagesChanged?.();
        showNote(`Paquete FPG renombrado a ${pkg.filename}`);
      }
    } else if (editingKey.startsWith("fpg_sprite:")) {
      const parts = editingKey.split(":");
      const pkgId = Number(parts[1]);
      const spriteId = Number(parts[2]);
      if (pkgId === 0) {
        const updated = fpg.map((g) => (g.id === spriteId ? { ...g, name: next } : g));
        onUpdateFpg(updated);
        runtime?.loadFPG(updated);
      } else {
        const pkg = runtime.fpgPackages.get(pkgId);
        if (pkg) {
          pkg.graphics = pkg.graphics.map((g) => (g.id === spriteId ? { ...g, name: next } : g));
          onPackagesChanged?.();
        }
      }
      showNote(`Sprite #${spriteId} renombrado a "${next}"`);
    }

    setEditingKey(null);
  };

  const handleCreateFpgPackage = () => {
    const existingKeys = Array.from(runtime.fpgPackages.keys()) as number[];
    const newId = Math.max(0, ...existingKeys) + 1;
    const baseName = `paquete_${newId}`;
    runtime.fpgPackages.set(newId, {
      id: newId,
      name: baseName,
      filename: `${baseName}.fpg`,
      graphics: fpg.slice(0, 4).map((g) => ({ ...g })),
    });
    setActivePkgId(newId);
    onPackagesChanged?.();
    showNote(`Paquete ${baseName}.fpg creado`);
  };

  const handleDragStartPayload = (e: React.DragEvent, payload: DraggedAssetPayload) => {
    startAssetDrag(e, payload);
  };

  const isCompact = layout === "compact";
  const gridColsClass = isCompact
    ? "grid-cols-2 gap-2"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3";

  const showModels = category === "all" || category === "model3d";
  const showTextures = category === "all" || category === "texture";
  const showFpg = category === "all" || category === "fpg";

  return (
    <div
      className="flex flex-col flex-1 min-h-0 gap-2.5"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setIsFileDropOver(true);
        }
      }}
      onDragLeave={() => setIsFileDropOver(false)}
      onDrop={(e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          setIsFileDropOver(false);
          handleImportFiles(e.dataTransfer.files);
        } else {
          setIsFileDropOver(false);
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md2,.md3,.png,.jpg,.jpeg,.webp,.json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleImportFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Filter Tabs + Search + Direct Import */}
      <div className="space-y-2 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex bg-[#F1F5F9] p-1 rounded-xl border border-[#CBD5E1] gap-0.5 flex-1 sm:flex-initial">
            {[
              { id: "all" as const, label: "Todos" },
              { id: "model3d" as const, label: isCompact ? "3D" : "Modelos 3D" },
              { id: "texture" as const, label: isCompact ? "Tex" : "Texturas" },
              { id: "fpg" as const, label: isCompact ? "FPG" : "Paquetes FPG" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`flex-1 sm:flex-initial min-h-[34px] px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  category === tab.id
                    ? "bg-white text-[#7C2D48] shadow-2xs border border-[#CBD5E1]"
                    : "text-[#4B5563] hover:text-[#111827]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[36px] px-2.5 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Importar archivos .md2, .md3, PNG/JPG o FPG"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar</span>
            </button>
            {onOpenImporter && (
              <button
                type="button"
                onClick={() =>
                  onOpenImporter(
                    category === "texture" ? "texture" : category === "fpg" ? "fpg" : "model3d"
                  )
                }
                className="min-h-[36px] px-2.5 rounded-xl bg-[#F8FAFC] hover:bg-white border border-[#CBD5E1] text-[#111827] text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                title="Abrir creador procedural y biblioteca avanzada"
              >
                <Plus className="w-3.5 h-3.5 text-[#7C2D48]" />
                <span>{isCompact ? "Crear" : "Asistente Crear"}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-2.5 min-h-[36px] rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus-within:border-[#7C2D48]">
            <Search className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar modelo, textura o FPG..."
              className="w-full bg-transparent text-xs text-[#111827] placeholder:text-[#94A3B8] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[#64748B] hover:text-[#111827] cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748B]">
          <span className="truncate">
            Arrastra cualquier tarjeta al editor 3D o escena en vivo
          </span>
          <span className="font-mono tabular-nums whitespace-nowrap flex-shrink-0">
            {customModels.length} 3D · {customTextures.length} tex · {packages.length} fpg
          </span>
        </div>
      </div>

      {/* Feedback Banner or OS Drop Target Banner */}
      {isFileDropOver && (
        <div className="p-3 rounded-xl border-2 border-dashed border-[#7C2D48] bg-[#FDF2F5] text-center text-xs font-bold text-[#7C2D48]">
          Suelta aquí tus archivos .MD2, .MD3 o imágenes para importarlos a la rejilla
        </div>
      )}
      {localMsg && (
        <div className="px-3 py-1.5 rounded-lg bg-[#EEF6F1] border border-[#CFE4D7] text-[#2F6F4E] text-[11px] font-semibold flex items-center justify-between gap-2">
          <span className="truncate">{localMsg}</span>
          <button type="button" onClick={() => setLocalMsg(null)} className="cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Visual Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
        {/* SECTION 1: 3D MODELS (.MD2 / .MD3 / PROCEDURAL) */}
        {showModels && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold text-[#4B5563] tracking-tight">
                Modelos 3D (.md2 / .md3)
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-[#64748B]">
                {filteredModels.length}
              </span>
            </div>

            {filteredModels.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[82px] p-3 rounded-xl border border-dashed border-[#CBD5E1] hover:border-[#7C2D48] bg-[#F8FAFC] text-xs font-semibold text-[#4B5563] flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#7C2D48]" />
                <span>Sube o arrastra un modelo .md2 / .md3</span>
              </button>
            ) : (
              <div className={`grid ${gridColsClass}`}>
                {filteredModels.map((mod) => {
                  const isSel = selectedAsset?.kind === "model3d" && selectedAsset.id === mod.id;
                  const editKey = `model3d:${mod.id}`;
                  const isEditing = editingKey === editKey;

                  return (
                    <div
                      key={mod.id}
                      draggable={!isEditing}
                      onDragStart={(e) =>
                        handleDragStartPayload(e, {
                          kind: "model3d",
                          id: mod.id,
                          name: mod.name,
                          format: mod.format,
                          role: mod.defaultRole,
                          scale: mod.scale,
                        })
                      }
                      onDragEnd={endAssetDrag}
                      onClick={() => onSelectAsset?.({ kind: "model3d", id: mod.id })}
                      className={`group rounded-xl border bg-white overflow-hidden flex flex-col transition-all cursor-grab active:cursor-grabbing ${
                        isSel
                          ? "border-[#7C2D48] ring-1 ring-[#7C2D48]/30 shadow-xs"
                          : "border-[#CBD5E1] hover:border-[#94A3B8]"
                      }`}
                    >
                      {/* Live 3D Mesh Canvas Preview */}
                      <div className="relative aspect-[4/3] w-full bg-[#0F172A] overflow-hidden">
                        <Model3DMiniPreview asset={mod} size={160} className="w-full h-full" />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/75 text-[10px] font-mono text-slate-200 flex items-center gap-1 pointer-events-none">
                          <GripVertical className="w-3 h-3 text-slate-400" />
                          <span>{mod.format.toUpperCase()}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTarget({ kind: "model3d", asset: mod });
                          }}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-slate-950/75 hover:bg-slate-900 text-white flex items-center justify-center opacity-85 group-hover:opacity-100 cursor-pointer"
                          title="Previsualizar modelo 3D"
                          aria-label={`Previsualizar ${mod.name}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Card Body: Rename + Metadata + Quick Actions */}
                      <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-between">
                        {isEditing ? (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename();
                                if (e.key === "Escape") setEditingKey(null);
                              }}
                              className="flex-1 min-w-0 h-7 px-2 rounded-md bg-[#F8FAFC] border border-[#7C2D48] text-xs font-bold text-[#111827] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={commitRename}
                              className="w-7 h-7 rounded-md bg-[#2F6F4E] text-white flex items-center justify-center cursor-pointer flex-shrink-0"
                              aria-label="Guardar nombre"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-1">
                            <div
                              className="min-w-0 flex-1"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                beginRename(editKey, mod.name);
                              }}
                              title="Doble clic para renombrar"
                            >
                              <div className="text-xs font-bold text-[#111827] truncate">
                                {mod.name}
                              </div>
                              <div className="text-[10px] text-[#64748B] font-mono tabular-nums truncate">
                                {mod.triangleCount} tris · {mod.frameCount}f
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                beginRename(editKey, mod.name);
                              }}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#111827] flex items-center justify-center cursor-pointer flex-shrink-0"
                              title="Renombrar modelo"
                              aria-label={`Renombrar ${mod.name}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1 pt-0.5">
                          {onUseModelInMode8 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUseModelInMode8(mod.id);
                              }}
                              className="flex-1 min-h-[28px] px-2 rounded-lg bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer truncate"
                            >
                              <Compass className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">Al Nivel 3D</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomModel3D(mod.id);
                              showNote(`Modelo "${mod.name}" eliminado`);
                            }}
                            className="w-7 h-7 rounded-lg hover:bg-rose-50 text-[#64748B] hover:text-rose-600 flex items-center justify-center cursor-pointer flex-shrink-0"
                            title="Eliminar modelo"
                            aria-label={`Eliminar ${mod.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SECTION 2: 3D TEXTURES */}
        {showTextures && (
          <section className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold text-[#4B5563] tracking-tight">
                Texturas 3D (Paredes y Suelos)
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-[#64748B]">
                {filteredTextures.length}
              </span>
            </div>

            {filteredTextures.length === 0 ? (
              <button
                type="button"
                onClick={() => onOpenImporter?.("texture") ?? fileInputRef.current?.click()}
                className="w-full min-h-[76px] p-3 rounded-xl border border-dashed border-[#CBD5E1] hover:border-[#2563EB] bg-[#F8FAFC] text-xs font-semibold text-[#4B5563] flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-[#2563EB]" />
                <span>Importa PNG/JPG o genera texturas repetibles</span>
              </button>
            ) : (
              <div className={`grid ${gridColsClass}`}>
                {filteredTextures.map((tex) => {
                  const isSel = selectedAsset?.kind === "texture" && selectedAsset.id === tex.name;
                  const editKey = `texture:${tex.name}`;
                  const isEditing = editingKey === editKey;

                  return (
                    <div
                      key={tex.name}
                      draggable={!isEditing}
                      onDragStart={(e) =>
                        handleDragStartPayload(e, {
                          kind: "texture",
                          name: tex.name,
                          displayName: tex.displayName,
                          texKind: tex.kind,
                        })
                      }
                      onDragEnd={endAssetDrag}
                      onClick={() => onSelectAsset?.({ kind: "texture", id: tex.name })}
                      className={`group rounded-xl border bg-white overflow-hidden flex flex-col transition-all cursor-grab active:cursor-grabbing ${
                        isSel
                          ? "border-[#2563EB] ring-1 ring-[#2563EB]/30 shadow-xs"
                          : "border-[#CBD5E1] hover:border-[#94A3B8]"
                      }`}
                    >
                      <div className="relative aspect-[4/3] w-full bg-[#0F172A] overflow-hidden">
                        <img
                          src={tex.dataUrl}
                          alt={tex.displayName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/75 text-[10px] font-mono text-slate-200 flex items-center gap-1 pointer-events-none">
                          <GripVertical className="w-3 h-3 text-slate-400" />
                          <span>TEX</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTarget({ kind: "texture", asset: tex });
                          }}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-slate-950/75 hover:bg-slate-900 text-white flex items-center justify-center opacity-85 group-hover:opacity-100 cursor-pointer"
                          title="Previsualizar mosaico 3×3"
                          aria-label={`Previsualizar ${tex.name}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-between">
                        {isEditing ? (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename();
                                if (e.key === "Escape") setEditingKey(null);
                              }}
                              className="flex-1 min-w-0 h-7 px-2 rounded-md bg-[#F8FAFC] border border-[#2563EB] text-xs font-mono font-bold text-[#111827] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={commitRename}
                              className="w-7 h-7 rounded-md bg-[#2F6F4E] text-white flex items-center justify-center cursor-pointer flex-shrink-0"
                              aria-label="Guardar nombre"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-1">
                            <div
                              className="min-w-0 flex-1"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                beginRename(editKey, tex.name);
                              }}
                              title="Doble clic para renombrar textura"
                            >
                              <div className="text-xs font-mono font-bold text-[#111827] truncate">
                                {tex.name}
                              </div>
                              <div className="text-[10px] text-[#64748B] tabular-nums truncate">
                                {tex.width}×{tex.height} · {tex.kind === "wall" ? "Pared" : tex.kind === "flat" ? "Suelo" : "Dual"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                beginRename(editKey, tex.name);
                              }}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#111827] flex items-center justify-center cursor-pointer flex-shrink-0"
                              title="Renombrar textura"
                              aria-label={`Renombrar ${tex.name}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1 pt-0.5">
                          {onUseTextureInMode8 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUseTextureInMode8(tex.name);
                              }}
                              className="flex-1 min-h-[28px] px-2 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer truncate"
                            >
                              <Compass className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">Pintar 3D</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomTexture(tex.name);
                              showNote(`Textura ${tex.name} eliminada`);
                            }}
                            className="w-7 h-7 rounded-lg hover:bg-rose-50 text-[#64748B] hover:text-rose-600 flex items-center justify-center cursor-pointer flex-shrink-0"
                            title="Eliminar textura"
                            aria-label={`Eliminar ${tex.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SECTION 3: PAQUETES FPG & SPRITES */}
        {showFpg && (
          <section className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-extrabold text-[#4B5563] tracking-tight">
                Paquetes FPG ({filteredPackages.length})
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCreateFpgPackage}
                  className="min-h-[26px] px-2 rounded-lg bg-[#EEF6F1] hover:bg-[#DCEEE3] border border-[#CFE4D7] text-[#2F6F4E] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>Nuevo FPG</span>
                </button>
                {onOpenFpgEditor && (
                  <button
                    type="button"
                    onClick={onOpenFpgEditor}
                    className="min-h-[26px] px-2 rounded-lg bg-[#F8FAFC] hover:bg-white border border-[#CBD5E1] text-[#111827] text-[10px] font-bold cursor-pointer"
                  >
                    Editor FPG
                  </button>
                )}
              </div>
            </div>

            {/* FPG Packages Grid Cards */}
            <div className={`grid ${gridColsClass}`}>
              {filteredPackages.map((pkg) => {
                const isPkgActive = activePackage?.id === pkg.id;
                const editKey = `fpg_pkg:${pkg.id}`;
                const isEditing = editingKey === editKey;
                const thumbs = pkg.graphics.slice(0, 4);

                return (
                  <div
                    key={pkg.id}
                    draggable={!isEditing}
                    onDragStart={(e) =>
                      handleDragStartPayload(e, {
                        kind: "fpg_package",
                        pkgId: pkg.id,
                        name: pkg.name,
                        filename: pkg.filename,
                        firstSpriteId: pkg.graphics[0]?.id,
                      })
                    }
                    onDragEnd={endAssetDrag}
                    onClick={() => setActivePkgId(pkg.id)}
                    className={`group rounded-xl border bg-white overflow-hidden flex flex-col transition-all cursor-grab active:cursor-grabbing ${
                      isPkgActive
                        ? "border-[#2F6F4E] ring-1 ring-[#2F6F4E]/30 shadow-xs"
                        : "border-[#CBD5E1] hover:border-[#94A3B8]"
                    }`}
                  >
                    {/* 2x2 Mosaic of Sprites inside this FPG package */}
                    <div className="relative aspect-[4/3] w-full bg-[#0F172A] p-1.5 grid grid-cols-2 grid-rows-2 gap-1">
                      {thumbs.map((spr) => (
                        <div
                          key={spr.id}
                          className="rounded bg-slate-900/90 border border-slate-800 flex items-center justify-center overflow-hidden"
                        >
                          {spr.dataUrl ? (
                            <img
                              src={spr.dataUrl}
                              alt={spr.name}
                              className="w-full h-full object-contain [image-rendering:pixelated]"
                            />
                          ) : (
                            <span className="text-[9px] font-mono text-slate-400">#{spr.id}</span>
                          )}
                        </div>
                      ))}
                      {thumbs.length === 0 && (
                        <div className="col-span-2 row-span-2 flex items-center justify-center text-slate-500">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-emerald-300 flex items-center gap-1 pointer-events-none">
                        <GripVertical className="w-3 h-3 text-slate-400" />
                        <span>FPG #{pkg.id}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTarget({ kind: "fpg_package", pkg });
                        }}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-slate-950/75 hover:bg-slate-900 text-white flex items-center justify-center opacity-85 group-hover:opacity-100 cursor-pointer"
                        title="Previsualizar paquete FPG"
                        aria-label={`Previsualizar ${pkg.filename}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-2 space-y-1">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") setEditingKey(null);
                            }}
                            className="flex-1 min-w-0 h-7 px-2 rounded-md bg-[#F8FAFC] border border-[#2F6F4E] text-xs font-bold text-[#111827] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={commitRename}
                            className="w-7 h-7 rounded-md bg-[#2F6F4E] text-white flex items-center justify-center cursor-pointer flex-shrink-0"
                            aria-label="Guardar nombre de paquete"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1">
                          <div
                            className="min-w-0 flex-1"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              beginRename(editKey, pkg.name);
                            }}
                          >
                            <div className="text-xs font-bold text-[#111827] truncate">
                              {pkg.filename}
                            </div>
                            <div className="text-[10px] text-[#64748B] font-mono tabular-nums">
                              {pkg.graphics.length} sprites · File {pkg.id}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginRename(editKey, pkg.name);
                            }}
                            className="w-7 h-7 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#111827] flex items-center justify-center cursor-pointer flex-shrink-0"
                            title="Renombrar paquete FPG"
                            aria-label={`Renombrar ${pkg.filename}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Individual Sprites inside Active FPG Package (draggable onto Scene or Level Editor!) */}
            {activePackage && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#374151]">
                    Sprites en {activePackage.filename}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-[#64748B]">
                    {filteredSprites.length}
                  </span>
                </div>
                <div className={`grid ${gridColsClass}`}>
                  {filteredSprites.slice(0, isCompact ? 12 : 36).map((spr) => {
                    const isSel =
                      selectedAsset?.kind === "fpg" &&
                      selectedAsset.id === spr.id &&
                      selectedAsset.pkgId === activePackage.id;
                    const editKey = `fpg_sprite:${activePackage.id}:${spr.id}`;
                    const isEditing = editingKey === editKey;

                    return (
                      <div
                        key={`${activePackage.id}_${spr.id}`}
                        draggable={!isEditing}
                        onDragStart={(e) =>
                          handleDragStartPayload(e, {
                            kind: "fpg_sprite",
                            id: spr.id,
                            pkgId: activePackage.id,
                            name: spr.name || `Sprite_${spr.id}`,
                          })
                        }
                        onDragEnd={endAssetDrag}
                        onClick={() =>
                          onSelectAsset?.({ kind: "fpg", id: spr.id, pkgId: activePackage.id })
                        }
                        className={`group rounded-xl border bg-white p-2 flex flex-col gap-1.5 transition-all cursor-grab active:cursor-grabbing ${
                          isSel
                            ? "border-[#2F6F4E] ring-1 ring-[#2F6F4E]/30 shadow-xs"
                            : "border-[#CBD5E1] hover:border-[#94A3B8]"
                        }`}
                      >
                        <div className="relative h-16 rounded-lg bg-[#0F172A] border border-slate-800 flex items-center justify-center overflow-hidden">
                          {spr.dataUrl ? (
                            <img
                              src={spr.dataUrl}
                              alt={spr.name}
                              className="w-12 h-12 object-contain [image-rendering:pixelated]"
                            />
                          ) : (
                            <span className="text-xs font-mono text-slate-300">#{spr.id}</span>
                          )}
                          <span className="absolute top-1 left-1 px-1 rounded bg-slate-950/75 text-[9px] font-mono text-slate-300">
                            #{spr.id}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewTarget({
                                kind: "fpg_sprite",
                                sprite: spr,
                                pkgId: activePackage.id,
                              });
                            }}
                            className="absolute top-1 right-1 w-6 h-6 rounded bg-slate-950/75 hover:bg-slate-900 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 cursor-pointer"
                            title="Previsualizar sprite"
                            aria-label={`Previsualizar sprite ${spr.id}`}
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>

                        {isEditing ? (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename();
                                if (e.key === "Escape") setEditingKey(null);
                              }}
                              className="flex-1 min-w-0 h-7 px-1.5 rounded bg-[#F8FAFC] border border-[#2F6F4E] text-[11px] font-bold text-[#111827] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={commitRename}
                              className="w-6 h-6 rounded bg-[#2F6F4E] text-white flex items-center justify-center cursor-pointer flex-shrink-0"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1">
                            <div
                              className="min-w-0 flex-1"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                beginRename(editKey, spr.name || `Sprite_${spr.id}`);
                              }}
                            >
                              <div className="text-[11px] font-bold text-[#111827] truncate">
                                {spr.name || `Sprite_${spr.id}`}
                              </div>
                              <div className="text-[10px] text-[#64748B] font-mono tabular-nums">
                                {spr.width}×{spr.height}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                beginRename(editKey, spr.name || `Sprite_${spr.id}`);
                              }}
                              className="w-6 h-6 rounded hover:bg-slate-100 text-[#64748B] hover:text-[#111827] flex items-center justify-center cursor-pointer flex-shrink-0"
                              title="Renombrar sprite"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Interactive Lightbox Preview Modal */}
      {previewTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-extrabold text-[#111827] truncate">
                  {previewTarget.kind === "model3d" && previewTarget.asset.name}
                  {previewTarget.kind === "texture" && previewTarget.asset.name}
                  {previewTarget.kind === "fpg_package" && previewTarget.pkg.filename}
                  {previewTarget.kind === "fpg_sprite" &&
                    `${previewTarget.sprite.name || "Sprite"} (#${previewTarget.sprite.id})`}
                </h4>
                <p className="text-[11px] text-[#64748B] font-mono tabular-nums">
                  {previewTarget.kind === "model3d" &&
                    `${previewTarget.asset.format.toUpperCase()} · ${previewTarget.asset.vertexCount} vértices · ${previewTarget.asset.triangleCount} triángulos · ${previewTarget.asset.frameCount} frames`}
                  {previewTarget.kind === "texture" &&
                    `${previewTarget.asset.width}×${previewTarget.asset.height}px · Mosaico 3×3`}
                  {previewTarget.kind === "fpg_package" &&
                    `Archivo #${previewTarget.pkg.id} · ${previewTarget.pkg.graphics.length} sprites`}
                  {previewTarget.kind === "fpg_sprite" &&
                    `Paquete #${previewTarget.pkgId} · ${previewTarget.sprite.width}×${previewTarget.sprite.height}px`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                className="w-9 h-9 rounded-lg hover:bg-slate-200 text-[#4B5563] flex items-center justify-center cursor-pointer"
                aria-label="Cerrar previsualización"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#0F172A] flex items-center justify-center">
              {previewTarget.kind === "model3d" && (
                <Model3DMiniPreview
                  asset={previewTarget.asset}
                  spinOnIdle={true}
                  size={280}
                  className="w-[280px] h-[280px] rounded-xl border border-slate-700"
                />
              )}
              {previewTarget.kind === "texture" && (
                <div
                  className="w-[240px] h-[240px] rounded-xl border border-slate-700"
                  style={{
                    backgroundImage: `url(${previewTarget.asset.dataUrl})`,
                    backgroundSize: "80px 80px",
                    backgroundRepeat: "repeat",
                  }}
                />
              )}
              {previewTarget.kind === "fpg_package" && (
                <div className="w-full max-h-[260px] overflow-y-auto grid grid-cols-4 gap-2">
                  {previewTarget.pkg.graphics.slice(0, 24).map((g) => (
                    <div
                      key={g.id}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center gap-1"
                    >
                      {g.dataUrl ? (
                        <img
                          src={g.dataUrl}
                          alt={g.name}
                          className="w-10 h-10 object-contain [image-rendering:pixelated]"
                        />
                      ) : (
                        <Box className="w-5 h-5 text-slate-500" />
                      )}
                      <span className="text-[10px] font-mono text-slate-300 truncate max-w-full">
                        #{g.id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {previewTarget.kind === "fpg_sprite" && (
                <div className="w-[220px] h-[220px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-4">
                  {previewTarget.sprite.dataUrl ? (
                    <img
                      src={previewTarget.sprite.dataUrl}
                      alt={previewTarget.sprite.name}
                      className="w-full h-full object-contain [image-rendering:pixelated]"
                    />
                  ) : (
                    <span className="text-sm font-mono text-white">#{previewTarget.sprite.id}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
