import { DivGraphic, DivModel3DData } from "../types";
import { ParsedMD2Model, generateDivCharacterModel } from "./md2Parser";
import { createGraphicCanvas, DEFAULT_PALETTE } from "./graphics";

export type AssetKind = "model3d" | "texture" | "fpg" | "map";

export interface CustomModel3DAsset {
  id: string;
  name: string;
  format: "md2" | "md3" | "custom";
  defaultRole: "prop" | "enemy" | "ally" | "goal";
  scale: number;
  colorHint: string;
  vertexCount: number;
  triangleCount: number;
  frameCount: number;
  skinDataUrl?: string;
  model: DivModel3DData & {
    animationGroups?: Array<{
      name: string;
      firstFrame: number;
      lastFrame: number;
      fps: number;
    }>;
  };
  createdAt: number;
}

export interface CustomTextureAsset {
  id: string;
  name: string; // Uppercase canonical key (e.g. TEX_MARMOL)
  displayName: string;
  kind: "both" | "wall" | "flat";
  category: "custom";
  width: number;
  height: number;
  dataUrl: string;
  dominantColor: string;
  roughness: number;
  metalness: number;
  useStudBump?: boolean;
  createdAt: number;
}

const MODELS_LS_KEY = "wxdiv_custom_models_3d_v1";
const TEXTURES_LS_KEY = "wxdiv_custom_textures_v1";

type AssetChangeListener = () => void;
type TextureInvalidationListener = (textureName: string) => void;

const changeListeners = new Set<AssetChangeListener>();
const textureInvalidationListeners = new Set<TextureInvalidationListener>();

const textureCanvasCache = new Map<string, HTMLCanvasElement>();
const modelSkinCanvasCache = new Map<string, HTMLCanvasElement>();

let cachedModels: CustomModel3DAsset[] | null = null;
let cachedTextures: CustomTextureAsset[] | null = null;

export function subscribeAssetLibrary(cb: AssetChangeListener): () => void {
  changeListeners.add(cb);
  return () => {
    changeListeners.delete(cb);
  };
}

export function onCustomTextureInvalidated(cb: TextureInvalidationListener): () => void {
  textureInvalidationListeners.add(cb);
  return () => {
    textureInvalidationListeners.delete(cb);
  };
}

function notifyAssetChanged() {
  for (const cb of changeListeners) {
    try {
      cb();
    } catch (err) {
      console.error("[AssetLibrary] Error en listener:", err);
    }
  }
}

function notifyTextureInvalidated(texName: string) {
  for (const cb of textureInvalidationListeners) {
    try {
      cb(texName);
    } catch (err) {
      console.error("[AssetLibrary] Error invalidando textura:", err);
    }
  }
}

export function sanitizeModelId(raw: string): string {
  const clean = String(raw || "modelo_3d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || `modelo_${Date.now().toString(36)}`;
}

export function sanitizeTextureKey(raw: string): string {
  const clean = String(raw || "TEX_CUSTOM")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!clean) return `TEX_${Date.now().toString(36).toUpperCase()}`;
  return /^[0-9]/.test(clean) ? `TEX_${clean}` : clean;
}

function loadModelsFromStorage(): CustomModel3DAsset[] {
  if (cachedModels) return cachedModels;
  if (typeof window === "undefined" || !window.localStorage) {
    cachedModels = [];
    return cachedModels;
  }
  try {
    const raw = localStorage.getItem(MODELS_LS_KEY);
    if (!raw) {
      cachedModels = [];
      return cachedModels;
    }
    const parsed = JSON.parse(raw);
    cachedModels = Array.isArray(parsed)
      ? parsed.filter((m) => m && typeof m.id === "string" && m.model && Array.isArray(m.model.frames))
      : [];
  } catch {
    cachedModels = [];
  }
  return cachedModels;
}

function persistModelsToStorage(models: CustomModel3DAsset[]): void {
  cachedModels = models;
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(MODELS_LS_KEY, JSON.stringify(models));
  } catch (err) {
    console.warn("[AssetLibrary] No se pudieron guardar modelos 3D en localStorage:", err);
  }
}

function hydrateTextureCanvas(asset: CustomTextureAsset): void {
  if (typeof document === "undefined" || !asset.dataUrl) return;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(32, asset.width || img.naturalWidth || 256);
    canvas.height = Math.max(32, asset.height || img.naturalHeight || 256);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      textureCanvasCache.set(asset.name.toUpperCase(), canvas);
      notifyTextureInvalidated(asset.name.toUpperCase());
      notifyAssetChanged();
    }
  };
  img.src = asset.dataUrl;
}

function hydrateModelSkinCanvas(asset: CustomModel3DAsset): void {
  if (typeof document === "undefined" || !asset.skinDataUrl) return;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(64, img.naturalWidth || 256);
    canvas.height = Math.max(64, img.naturalHeight || 256);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      modelSkinCanvasCache.set(asset.id.toLowerCase(), canvas);
      notifyAssetChanged();
    }
  };
  img.src = asset.skinDataUrl;
}

function loadTexturesFromStorage(): CustomTextureAsset[] {
  if (cachedTextures) return cachedTextures;
  if (typeof window === "undefined" || !window.localStorage) {
    cachedTextures = [];
    return cachedTextures;
  }
  try {
    const raw = localStorage.getItem(TEXTURES_LS_KEY);
    if (!raw) {
      cachedTextures = [];
      return cachedTextures;
    }
    const parsed = JSON.parse(raw);
    cachedTextures = Array.isArray(parsed)
      ? parsed.filter((t) => t && typeof t.name === "string" && typeof t.dataUrl === "string")
      : [];
    cachedTextures.forEach(hydrateTextureCanvas);
  } catch {
    cachedTextures = [];
  }
  return cachedTextures;
}

function persistTexturesToStorage(textures: CustomTextureAsset[]): void {
  cachedTextures = textures;
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(TEXTURES_LS_KEY, JSON.stringify(textures));
  } catch (err) {
    console.warn("[AssetLibrary] No se pudieron guardar texturas en localStorage:", err);
  }
}

// =============================================================================
// PUBLIC MODEL 3D API (MD2 / MD3 / PROCEDURAL MESH)
// =============================================================================

export function listCustomModels3D(): CustomModel3DAsset[] {
  return loadModelsFromStorage();
}

export function getCustomModel3D(idOrName: string | undefined): CustomModel3DAsset | undefined {
  if (!idOrName) return undefined;
  const key = String(idOrName).trim().toLowerCase();
  const list = loadModelsFromStorage();
  return list.find((m) => m.id.toLowerCase() === key || m.name.toLowerCase() === key);
}

export function getCustomModelSkinCanvas(id: string): HTMLCanvasElement | undefined {
  const asset = getCustomModel3D(id);
  if (!asset) return undefined;
  const cached = modelSkinCanvasCache.get(asset.id.toLowerCase());
  if (cached) return cached;
  const memSkin = (asset.model as ParsedMD2Model).skinCanvas;
  if (memSkin) {
    modelSkinCanvasCache.set(asset.id.toLowerCase(), memSkin);
    return memSkin;
  }
  if (asset.skinDataUrl) {
    hydrateModelSkinCanvas(asset);
  }
  return undefined;
}

export function saveCustomModel3D(input: {
  id?: string;
  name: string;
  format: "md2" | "md3" | "custom";
  defaultRole?: "prop" | "enemy" | "ally" | "goal";
  scale?: number;
  colorHint?: string;
  model: ParsedMD2Model | DivModel3DData;
  skinDataUrl?: string;
}): CustomModel3DAsset {
  const list = [...loadModelsFromStorage()];
  const cleanId = sanitizeModelId(input.id || input.name);
  const inputSkinCanvas = "skinCanvas" in input.model ? input.model.skinCanvas : undefined;

  let skinDataUrl = input.skinDataUrl;
  if (!skinDataUrl && inputSkinCanvas) {
    try {
      skinDataUrl = inputSkinCanvas.toDataURL("image/png");
    } catch {
      // ignore canvas taint
    }
  }

  // Strip non-serializable HTMLCanvasElement from JSON-stored copy
  const animGroups =
    "animationGroups" in input.model && Array.isArray(input.model.animationGroups)
      ? input.model.animationGroups
      : undefined;

  const serializableModel: CustomModel3DAsset["model"] = {
    id: cleanId,
    name: input.name,
    format: input.format,
    baseScale: input.model.baseScale ?? input.scale ?? 1.0,
    frames: input.model.frames.map((f) => ({
      name: f.name,
      vertices: f.vertices.map((v) => ({ x: Number(v.x), y: Number(v.y), z: Number(v.z) })),
    })),
    triangles: input.model.triangles.map((t) => ({
      v: [t.v[0], t.v[1], t.v[2]] as [number, number, number],
      ...(t.color ? { color: t.color } : {}),
      ...(t.uv ? { uv: t.uv } : {}),
    })),
    ...(animGroups ? { animationGroups: animGroups } : {}),
  };

  const asset: CustomModel3DAsset = {
    id: cleanId,
    name: input.name.trim() || cleanId,
    format: input.format,
    defaultRole: input.defaultRole || "prop",
    scale: input.scale ?? 1.0,
    colorHint: input.colorHint || "#7C2D48",
    vertexCount: serializableModel.frames[0]?.vertices.length || 0,
    triangleCount: serializableModel.triangles.length,
    frameCount: serializableModel.frames.length,
    skinDataUrl,
    model: serializableModel,
    createdAt: Date.now(),
  };

  if (inputSkinCanvas) {
    modelSkinCanvasCache.set(cleanId.toLowerCase(), inputSkinCanvas);
  } else if (skinDataUrl) {
    hydrateModelSkinCanvas(asset);
  }

  const existingIdx = list.findIndex((m) => m.id.toLowerCase() === cleanId.toLowerCase());
  if (existingIdx >= 0) {
    list[existingIdx] = asset;
  } else {
    list.unshift(asset);
  }

  persistModelsToStorage(list);
  notifyAssetChanged();
  return asset;
}

export function updateCustomModel3DMeta(
  id: string,
  patch: Partial<Pick<CustomModel3DAsset, "name" | "defaultRole" | "scale" | "colorHint" | "skinDataUrl">>
): CustomModel3DAsset | null {
  const list = [...loadModelsFromStorage()];
  const idx = list.findIndex((m) => m.id.toLowerCase() === id.toLowerCase());
  if (idx < 0) return null;
  const updated: CustomModel3DAsset = {
    ...list[idx],
    ...patch,
    model: {
      ...list[idx].model,
      name: patch.name ?? list[idx].name,
    },
  };
  list[idx] = updated;
  if (patch.skinDataUrl) {
    modelSkinCanvasCache.delete(updated.id.toLowerCase());
    hydrateModelSkinCanvas(updated);
  }
  persistModelsToStorage(list);
  notifyAssetChanged();
  return updated;
}

export function deleteCustomModel3D(id: string): void {
  const list = loadModelsFromStorage().filter((m) => m.id.toLowerCase() !== id.toLowerCase());
  modelSkinCanvasCache.delete(id.toLowerCase());
  persistModelsToStorage(list);
  notifyAssetChanged();
}

export function toParsedMD2Model(asset: CustomModel3DAsset): ParsedMD2Model {
  const skinCanvas = getCustomModelSkinCanvas(asset.id);
  const animGroups =
    asset.model.animationGroups && asset.model.animationGroups.length > 0
      ? asset.model.animationGroups
      : asset.model.frames.map((f, i) => ({
          name: (f.name || `FRAME_${i}`).toUpperCase(),
          firstFrame: i,
          lastFrame: i,
          fps: 8,
        }));
  return {
    id: asset.id,
    name: asset.name,
    format: asset.format,
    baseScale: asset.model.baseScale || asset.scale || 1.0,
    frames: asset.model.frames,
    triangles: asset.model.triangles,
    skinCanvas,
    animationGroups: animGroups,
  };
}

export function createCharacterModelPreset(
  archetype: "hombre" | "mujer" | "nino" | "armado",
  customName: string,
  role: "prop" | "enemy" | "ally" | "goal" = "ally",
  colorHint = "#2563eb"
): CustomModel3DAsset {
  const generated = generateDivCharacterModel(archetype);
  return saveCustomModel3D({
    name: customName,
    format: "custom",
    defaultRole: role,
    colorHint,
    model: generated,
  });
}

// =============================================================================
// PUBLIC CUSTOM TEXTURES API
// =============================================================================

export function listCustomTextures(): CustomTextureAsset[] {
  return loadTexturesFromStorage();
}

export function getCustomTexture(nameOrId: string | number | undefined): CustomTextureAsset | undefined {
  if (nameOrId === undefined || nameOrId === null) return undefined;
  const key = String(nameOrId).trim().toUpperCase();
  if (!key) return undefined;
  return loadTexturesFromStorage().find((t) => t.name.toUpperCase() === key || t.id.toUpperCase() === key);
}

export function getCustomTextureCanvas(name: string): HTMLCanvasElement | undefined {
  return textureCanvasCache.get(name.toUpperCase());
}

export function saveCustomTexture(assetInput: {
  name: string;
  displayName?: string;
  kind?: "both" | "wall" | "flat";
  width?: number;
  height?: number;
  dataUrl: string;
  canvas?: HTMLCanvasElement;
  dominantColor?: string;
  roughness?: number;
  metalness?: number;
  useStudBump?: boolean;
}): CustomTextureAsset {
  const canonicalName = sanitizeTextureKey(assetInput.name);
  const list = [...loadTexturesFromStorage()];

  const asset: CustomTextureAsset = {
    id: canonicalName,
    name: canonicalName,
    displayName: (assetInput.displayName || canonicalName).trim(),
    kind: assetInput.kind || "both",
    category: "custom",
    width: assetInput.width || 256,
    height: assetInput.height || 256,
    dataUrl: assetInput.dataUrl,
    dominantColor: assetInput.dominantColor || "#64748b",
    roughness: assetInput.roughness ?? 0.45,
    metalness: assetInput.metalness ?? 0.08,
    useStudBump: assetInput.useStudBump ?? false,
    createdAt: Date.now(),
  };

  if (assetInput.canvas) {
    textureCanvasCache.set(canonicalName, assetInput.canvas);
  } else {
    hydrateTextureCanvas(asset);
  }

  const idx = list.findIndex((t) => t.name.toUpperCase() === canonicalName);
  if (idx >= 0) {
    list[idx] = asset;
  } else {
    list.unshift(asset);
  }

  persistTexturesToStorage(list);
  notifyTextureInvalidated(canonicalName);
  notifyAssetChanged();
  return asset;
}

export function renameCustomTexture(
  currentName: string,
  nextName: string
): CustomTextureAsset | null {
  const oldKey = currentName.trim().toUpperCase();
  const cleanDisplay = nextName.trim();
  const newKey = sanitizeTextureKey(cleanDisplay || currentName);
  if (!oldKey || !newKey) return null;

  const list = [...loadTexturesFromStorage()];
  const idx = list.findIndex((t) => t.name.toUpperCase() === oldKey);
  if (idx < 0) return null;

  const prev = list[idx];
  const updated: CustomTextureAsset = {
    ...prev,
    id: newKey,
    name: newKey,
    displayName: cleanDisplay || newKey,
  };

  // Preserve hydrated canvas under the renamed key
  const cachedCanvas = textureCanvasCache.get(oldKey);
  if (cachedCanvas) {
    textureCanvasCache.delete(oldKey);
    textureCanvasCache.set(newKey, cachedCanvas);
  } else {
    hydrateTextureCanvas(updated);
  }

  // Deduplicate if renaming over an existing key
  const filtered = list.filter((_, i) => i !== idx && list[i].name.toUpperCase() !== newKey);
  filtered.unshift(updated);
  persistTexturesToStorage(filtered);
  notifyTextureInvalidated(oldKey);
  notifyTextureInvalidated(newKey);
  notifyAssetChanged();
  return updated;
}

export function deleteCustomTexture(name: string): void {
  const key = name.toUpperCase();
  const list = loadTexturesFromStorage().filter((t) => t.name.toUpperCase() !== key);
  textureCanvasCache.delete(key);
  persistTexturesToStorage(list);
  notifyTextureInvalidated(key);
  notifyAssetChanged();
}

function sampleDominantHex(ctx: CanvasRenderingContext2D, w: number, h: number): string {
  try {
    const data = ctx.getImageData(0, 0, w, h).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i + 3] < 20) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    if (count === 0) return "#64748b";
    const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n / count))).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } catch {
    return "#64748b";
  }
}

export async function imageFileToTextureAsset(
  file: File,
  customName: string,
  options: {
    kind?: "both" | "wall" | "flat";
    roughness?: number;
    metalness?: number;
    useStudBump?: boolean;
  } = {}
): Promise<CustomTextureAsset> {
  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("No se pudo decodificar la imagen de textura."));
      i.src = imgUrl;
    });

    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, size, size);

    const dominantColor = sampleDominantHex(ctx, size, size);
    const dataUrl = canvas.toDataURL("image/png");

    return saveCustomTexture({
      name: customName,
      displayName: customName,
      kind: options.kind || "both",
      width: size,
      height: size,
      dataUrl,
      canvas,
      dominantColor,
      roughness: options.roughness ?? 0.45,
      metalness: options.metalness ?? 0.08,
      useStudBump: options.useStudBump ?? false,
    });
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

export function createProceduralCustomTexture(options: {
  name: string;
  pattern: "bricks" | "tiles" | "marble" | "cyber" | "wood" | "studs";
  primaryColor: string;
  secondaryColor: string;
  kind?: "both" | "wall" | "flat";
  useStudBump?: boolean;
}): CustomTextureAsset {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = options.primaryColor;
  ctx.fillRect(0, 0, size, size);

  if (options.pattern === "bricks") {
    const rows = 8;
    const cols = 4;
    const bh = size / rows;
    const bw = size / cols;
    ctx.strokeStyle = options.secondaryColor;
    ctx.lineWidth = 4;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (bw * 0.5);
      for (let c = -1; c <= cols; c++) {
        ctx.strokeRect(c * bw + off, r * bh, bw, bh);
      }
    }
  } else if (options.pattern === "tiles") {
    const step = 64;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        if (((x + y) / step) % 2 === 0) {
          ctx.fillStyle = options.secondaryColor;
          ctx.fillRect(x, y, step, step);
        }
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  } else if (options.pattern === "marble") {
    ctx.strokeStyle = options.secondaryColor;
    ctx.globalAlpha = 0.45;
    for (let v = 0; v < 9; v++) {
      ctx.lineWidth = (v % 3) + 1.5;
      ctx.beginPath();
      ctx.moveTo(0, (v * 31) % size);
      for (let x = 0; x <= size; x += 24) {
        const y = ((v * 31 + x * 0.45 + Math.sin(x * 0.05 + v) * 26) % size + size) % size;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (options.pattern === "cyber") {
    ctx.strokeStyle = options.secondaryColor;
    ctx.lineWidth = 3;
    const step = 32;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    ctx.fillStyle = options.secondaryColor;
    for (let y = 16; y < size; y += 64) {
      for (let x = 16; x < size; x += 64) {
        ctx.fillRect(x - 4, y - 4, 8, 8);
      }
    }
  } else if (options.pattern === "wood") {
    const rows = 4;
    const rh = size / rows;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = r % 2 === 0 ? options.primaryColor : options.secondaryColor;
      ctx.fillRect(0, r * rh, size, rh);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, r * rh, size, rh);
    }
  } else if (options.pattern === "studs") {
    const cells = 4;
    const step = size / cells;
    for (let gy = 0; gy < cells; gy++) {
      for (let gx = 0; gx < cells; gx++) {
        const cx = gx * step + step * 0.5;
        const cy = gy * step + step * 0.5;
        const r = step * 0.26;
        ctx.fillStyle = options.secondaryColor;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = options.primaryColor;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return saveCustomTexture({
    name: options.name,
    displayName: options.name,
    kind: options.kind || "both",
    width: size,
    height: size,
    dataUrl: canvas.toDataURL("image/png"),
    canvas,
    dominantColor: options.primaryColor,
    roughness: options.pattern === "cyber" ? 0.25 : 0.42,
    metalness: options.pattern === "cyber" ? 0.35 : 0.08,
    useStudBump: options.useStudBump ?? options.pattern === "studs",
  });
}

export function divGraphicToTextureAsset(
  graphic: DivGraphic,
  customName?: string,
  options: { kind?: "both" | "wall" | "flat" } = {}
): CustomTextureAsset {
  const size = 256;
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = false;

  const srcCanvas = graphic.canvas || createGraphicCanvas({ ...graphic, palette: graphic.palette || DEFAULT_PALETTE });
  octx.drawImage(srcCanvas, 0, 0, size, size);

  const dominantColor = sampleDominantHex(octx, size, size);
  return saveCustomTexture({
    name: customName || graphic.name || `TEX_G${graphic.id}`,
    displayName: customName || graphic.name || `Sprite ${graphic.id}`,
    kind: options.kind || "both",
    width: size,
    height: size,
    dataUrl: out.toDataURL("image/png"),
    canvas: out,
    dominantColor,
  });
}
