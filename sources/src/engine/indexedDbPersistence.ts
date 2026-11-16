import {
  DivGraphic,
  DivDoomLinedef,
  DivDoomSector,
  DivMode8Entity,
  DivMode8Light,
  DivMode8PlacedModel,
  DivMode8PlacedVoxel,
} from "../types";
import { VB3Form } from "../components/VB3/types";
import { DEFAULT_PALETTE, createGraphicCanvas } from "./graphics";
import { DivFpgPackage } from "./fpgManager";
import { AiConfig } from "../services/aiConfig";
import { IdeThemeConfig } from "./ideTheme";

const DB_NAME = "wxdiv_studio_persistence_v1";
const DB_VERSION = 1;
const STORE_WORKSPACE = "workspace_snapshots";
const STORE_MODE8 = "mode8_state";

const KEY_PRIMARY = "workspace_primary";
const KEY_BACKUP = "workspace_backup";
const KEY_MODE8_DRAFT = "mode8_active_draft";
const KEY_MODE8_LEVELS = "mode8_user_levels";

export const FALLBACK_WORKSPACE_LS_KEY = "wxdiv_workspace_draft_v1";

export interface PersistedProjectSettings {
  presetId: string;
  projectTitle: string;
  resolution: "320x200" | "640x480" | "800x600";
  activeTab?: "modular" | "mode8" | "design" | "logic" | "play" | "studio";
  designMode?: "mobile" | "form";
  logicMode?: "blocks" | "code";
  activeStudioTool?: string | null;
  aiConfig?: AiConfig;
  ideTheme?: IdeThemeConfig;
}

export interface SerializedDivGraphic {
  id: number;
  name: string;
  description?: string;
  width: number;
  height: number;
  cx: number;
  cy: number;
  cpoints: Array<{ x: number; y: number; id: number }>;
  pixels: number[][];
  palette: string[];
  dataUrl?: string;
}

export interface SerializedFpgPackage {
  id: number;
  name: string;
  filename: string;
  description?: string;
  graphics: SerializedDivGraphic[];
}

export interface PersistedWorkspaceState {
  version: number;
  updatedAt: number;
  code: string;
  settings: PersistedProjectSettings;
  fpg: SerializedDivGraphic[];
  fpgPackages?: SerializedFpgPackage[];
  forms?: VB3Form[];
  activeFormId?: string;
}

export interface PersistedMode8Draft {
  updatedAt: number;
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
  entities: DivMode8Entity[];
  placedModels: DivMode8PlacedModel[];
  placedVoxels: DivMode8PlacedVoxel[];
  lights: DivMode8Light[];
  currentLevelName: string;
  gameConfig: Record<string, unknown>;
  cam3D: { x: number; y: number; z: number; angle: number; pitch: number };
}

let dbInstance: IDBDatabase | null = null;
let openPromise: Promise<IDBDatabase | null> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let latestWorkspaceSnapshot: PersistedWorkspaceState | null = null;
let latestMode8Draft: PersistedMode8Draft | null = null;
let emergencyFlushRegistered = false;

function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  } catch {
    return false;
  }
}

export function requestPersistentStorage(): void {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch {
    // Ignore unsupported environments
  }
}

async function openDatabase(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) return null;
  if (dbInstance) return dbInstance;
  if (openPromise) return openPromise;

  openPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_WORKSPACE)) {
            db.createObjectStore(STORE_WORKSPACE);
          }
          if (!db.objectStoreNames.contains(STORE_MODE8)) {
            db.createObjectStore(STORE_MODE8);
          }
        } catch (err) {
          console.warn("[IndexedDB] Error creando object stores:", err);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        dbInstance = db;
        openPromise = null;

        db.onclose = () => {
          dbInstance = null;
        };
        db.onversionchange = () => {
          try {
            db.close();
          } catch {
            // Ignore close errors
          }
          dbInstance = null;
        };

        requestPersistentStorage();
        resolve(db);
      };

      request.onerror = () => {
        openPromise = null;
        resolve(null);
      };

      request.onblocked = () => {
        openPromise = null;
        resolve(null);
      };
    } catch {
      openPromise = null;
      resolve(null);
    }
  });

  return openPromise;
}

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  const next = writeQueue.then(task).catch((err) => {
    console.warn("[IndexedDB] Fallo controlado en cola de escritura:", err);
  });
  writeQueue = next;
  return next;
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise<T | null>((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve((req.result as T) ?? null);
      };
      req.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    } catch {
      dbInstance = null;
      resolve(null);
    }
  });
}

async function idbPut<T>(storeName: string, key: string, value: T): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      dbInstance = null;
      resolve(false);
    }
  });
}

function clampDim(value: unknown, fallback: number, max = 2048): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.round(n)));
}

function safeCoord(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Strips non-cloneable DOM objects (HTMLCanvasElement) and sanitizes pixel grids
 * so IndexedDB never throws DataCloneError or stores corrupted graphics.
 */
export function serializeDivGraphic(g: DivGraphic): SerializedDivGraphic {
  const width = clampDim(g.width, 16);
  const height = clampDim(g.height, 16);
  let dataUrl = typeof g.dataUrl === "string" ? g.dataUrl : undefined;

  if (!dataUrl && g.canvas && typeof g.canvas.toDataURL === "function") {
    try {
      dataUrl = g.canvas.toDataURL();
    } catch {
      dataUrl = undefined;
    }
  }

  const safePixels: number[][] = Array.isArray(g.pixels)
    ? g.pixels.slice(0, height).map((row) =>
        Array.isArray(row)
          ? row.slice(0, width).map((px) => (Number.isFinite(Number(px)) ? Number(px) : 0))
          : new Array<number>(width).fill(0)
      )
    : [];

  const safePalette: string[] =
    Array.isArray(g.palette) && g.palette.length > 0
      ? g.palette.map((c) => (typeof c === "string" ? c : "#ffffff"))
      : [...DEFAULT_PALETTE];

  const safeCpoints = Array.isArray(g.cpoints)
    ? g.cpoints
        .filter((cp) => cp && typeof cp === "object")
        .map((cp, idx) => ({
          id: Number.isFinite(Number(cp.id)) ? Number(cp.id) : idx,
          x: safeCoord(cp.x, Math.floor(width / 2)),
          y: safeCoord(cp.y, Math.floor(height / 2)),
        }))
    : [{ id: 0, x: Math.floor(width / 2), y: Math.floor(height / 2) }];

  return {
    id: Number.isFinite(Number(g.id)) ? Number(g.id) : 1,
    name: typeof g.name === "string" && g.name.trim() ? g.name : "sprite",
    description: typeof g.description === "string" ? g.description : undefined,
    width,
    height,
    cx: safeCoord(g.cx, Math.floor(width / 2)),
    cy: safeCoord(g.cy, Math.floor(height / 2)),
    cpoints: safeCpoints,
    pixels: safePixels,
    palette: safePalette,
    dataUrl,
  };
}

export function hydrateDivGraphic(raw: SerializedDivGraphic): DivGraphic {
  const clean = serializeDivGraphic(raw as DivGraphic);
  const graphic: DivGraphic = {
    ...clean,
  };

  if (typeof document !== "undefined") {
    try {
      const canvas = createGraphicCanvas(graphic);
      graphic.canvas = canvas;
      if (!graphic.dataUrl) {
        try {
          graphic.dataUrl = canvas.toDataURL();
        } catch {
          // Ignore tainted/dataUrl errors
        }
      }
    } catch {
      // Keep graphic usable even if offscreen canvas creation fails
    }
  }

  return graphic;
}

export function serializeDivGraphicList(list: DivGraphic[]): SerializedDivGraphic[] {
  if (!Array.isArray(list)) return [];
  const out: SerializedDivGraphic[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    try {
      out.push(serializeDivGraphic(item));
    } catch {
      // Skip malformed graphic instead of failing whole save
    }
  }
  return out;
}

export function hydrateDivGraphicList(list: SerializedDivGraphic[] | undefined): DivGraphic[] {
  if (!Array.isArray(list)) return [];
  const out: DivGraphic[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    try {
      out.push(hydrateDivGraphic(item));
    } catch {
      // Skip corrupted sprite cleanly
    }
  }
  return out;
}

export function serializeFpgPackages(
  packagesMap: Map<number, DivFpgPackage> | undefined
): SerializedFpgPackage[] {
  if (!packagesMap) return [];
  const out: SerializedFpgPackage[] = [];
  for (const pkg of packagesMap.values()) {
    if (!pkg || typeof pkg !== "object") continue;
    try {
      out.push({
        id: Number.isFinite(Number(pkg.id)) ? Number(pkg.id) : 0,
        name: typeof pkg.name === "string" ? pkg.name : "Paquete FPG",
        filename: typeof pkg.filename === "string" ? pkg.filename : "main.fpg",
        description: typeof pkg.description === "string" ? pkg.description : undefined,
        graphics: serializeDivGraphicList(pkg.graphics || []),
      });
    } catch {
      // Ignore individual malformed package
    }
  }
  return out;
}

export function hydrateFpgPackages(list: SerializedFpgPackage[] | undefined): DivFpgPackage[] {
  if (!Array.isArray(list)) return [];
  const out: DivFpgPackage[] = [];
  for (const pkg of list) {
    if (!pkg || typeof pkg !== "object") continue;
    out.push({
      id: Number.isFinite(Number(pkg.id)) ? Number(pkg.id) : 0,
      name: typeof pkg.name === "string" ? pkg.name : "Paquete FPG",
      filename: typeof pkg.filename === "string" ? pkg.filename : "main.fpg",
      description: typeof pkg.description === "string" ? pkg.description : undefined,
      graphics: hydrateDivGraphicList(pkg.graphics),
    });
  }
  return out;
}

function sanitizeForms(forms: unknown): VB3Form[] | undefined {
  if (!Array.isArray(forms)) return undefined;
  return forms
    .filter((f): f is VB3Form => Boolean(f && typeof f === "object" && typeof (f as VB3Form).id === "string"))
    .map((f) => ({
      ...f,
      width: clampDim(f.width, 540, 2400),
      height: clampDim(f.height, 440, 2400),
      controls: Array.isArray(f.controls)
        ? f.controls.filter((c) => Boolean(c && typeof c === "object" && typeof c.id === "string"))
        : [],
    }));
}

function sanitizeWorkspaceSnapshot(raw: unknown): PersistedWorkspaceState | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<PersistedWorkspaceState>;
  if (typeof obj.code !== "string") return null;

  const rawSettings = (obj.settings || {}) as Partial<PersistedProjectSettings>;
  const validRes =
    rawSettings.resolution === "320x200" ||
    rawSettings.resolution === "640x480" ||
    rawSettings.resolution === "800x600"
      ? rawSettings.resolution
      : "640x480";

  // Never auto-boot directly into "play" tab after an unexpected crash so editor recovery stays safe
  const rawTab = rawSettings.activeTab;
  const safeTab: PersistedProjectSettings["activeTab"] =
    rawTab === "modular" ||
    rawTab === "mode8" ||
    rawTab === "design" ||
    rawTab === "logic" ||
    rawTab === "studio"
      ? rawTab
      : rawTab === "play"
        ? "modular"
        : undefined;

  return {
    version: typeof obj.version === "number" ? obj.version : 1,
    updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : Date.now(),
    code: obj.code,
    settings: {
      presetId:
        typeof rawSettings.presetId === "string" && rawSettings.presetId.trim()
          ? rawSettings.presetId
          : "empty_project",
      projectTitle:
        typeof rawSettings.projectTitle === "string" && rawSettings.projectTitle.trim()
          ? rawSettings.projectTitle
          : "MiProyecto",
      resolution: validRes,
      activeTab: safeTab,
      designMode:
        rawSettings.designMode === "mobile" || rawSettings.designMode === "form"
          ? rawSettings.designMode
          : undefined,
      logicMode:
        rawSettings.logicMode === "blocks" || rawSettings.logicMode === "code"
          ? rawSettings.logicMode
          : undefined,
      activeStudioTool:
        typeof rawSettings.activeStudioTool === "string" || rawSettings.activeStudioTool === null
          ? rawSettings.activeStudioTool
          : undefined,
      aiConfig: rawSettings.aiConfig,
      ideTheme: rawSettings.ideTheme,
    },
    fpg: Array.isArray(obj.fpg) ? obj.fpg : [],
    fpgPackages: Array.isArray(obj.fpgPackages) ? obj.fpgPackages : undefined,
    forms: sanitizeForms(obj.forms),
    activeFormId: typeof obj.activeFormId === "string" ? obj.activeFormId : undefined,
  };
}

function writeLightweightLocalStorageFallback(snapshot: PersistedWorkspaceState): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(
      FALLBACK_WORKSPACE_LS_KEY,
      JSON.stringify({
        code: snapshot.code,
        resolution: snapshot.settings.resolution,
        projectTitle: snapshot.settings.projectTitle,
        presetId: snapshot.settings.presetId,
        updatedAt: snapshot.updatedAt,
      })
    );
  } catch {
    // Ignore localStorage quota exceeded safely
  }
}

export function setLatestWorkspaceSnapshot(snapshot: PersistedWorkspaceState): void {
  latestWorkspaceSnapshot = snapshot;
}

export async function saveWorkspaceToIndexedDB(
  snapshot: PersistedWorkspaceState
): Promise<boolean> {
  latestWorkspaceSnapshot = snapshot;
  writeLightweightLocalStorageFallback(snapshot);

  let saved = false;
  await enqueueWrite(async () => {
    const okPrimary = await idbPut(STORE_WORKSPACE, KEY_PRIMARY, snapshot);
    if (okPrimary) {
      saved = true;
      await idbPut(STORE_WORKSPACE, KEY_BACKUP, snapshot);
    }
  });
  return saved;
}

export async function loadWorkspaceFromIndexedDB(): Promise<PersistedWorkspaceState | null> {
  try {
    const primaryRaw = await idbGet<unknown>(STORE_WORKSPACE, KEY_PRIMARY);
    const primary = sanitizeWorkspaceSnapshot(primaryRaw);
    if (primary) {
      latestWorkspaceSnapshot = primary;
      return primary;
    }

    // Automatic recovery from rolling backup snapshot if primary was corrupted
    const backupRaw = await idbGet<unknown>(STORE_WORKSPACE, KEY_BACKUP);
    const backup = sanitizeWorkspaceSnapshot(backupRaw);
    if (backup) {
      latestWorkspaceSnapshot = backup;
      await enqueueWrite(async () => {
        await idbPut(STORE_WORKSPACE, KEY_PRIMARY, backup);
      });
      return backup;
    }
  } catch (err) {
    console.warn("[IndexedDB] Recuperando desde respaldo local:", err);
  }
  return null;
}

export function setLatestMode8Draft(draft: PersistedMode8Draft): void {
  latestMode8Draft = draft;
}

export async function saveMode8DraftToIndexedDB(draft: PersistedMode8Draft): Promise<boolean> {
  latestMode8Draft = draft;
  let saved = false;
  await enqueueWrite(async () => {
    saved = await idbPut(STORE_MODE8, KEY_MODE8_DRAFT, draft);
  });
  return saved;
}

export async function loadMode8DraftFromIndexedDB(): Promise<PersistedMode8Draft | null> {
  try {
    const raw = await idbGet<unknown>(STORE_MODE8, KEY_MODE8_DRAFT);
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Partial<PersistedMode8Draft>;
    if (!Array.isArray(obj.sectors) || !Array.isArray(obj.linedefs)) return null;
    return obj as PersistedMode8Draft;
  } catch {
    return null;
  }
}

export async function saveMode8UserLevelsToIndexedDB<T>(levels: T[]): Promise<boolean> {
  let saved = false;
  await enqueueWrite(async () => {
    saved = await idbPut(STORE_MODE8, KEY_MODE8_LEVELS, levels);
  });
  return saved;
}

export async function loadMode8UserLevelsFromIndexedDB<T>(): Promise<T[] | null> {
  try {
    const raw = await idbGet<unknown>(STORE_MODE8, KEY_MODE8_LEVELS);
    return Array.isArray(raw) ? (raw as T[]) : null;
  } catch {
    return null;
  }
}

export function flushAllPersistenceSyncAndAsync(): void {
  if (latestWorkspaceSnapshot) {
    writeLightweightLocalStorageFallback(latestWorkspaceSnapshot);
    void saveWorkspaceToIndexedDB(latestWorkspaceSnapshot);
  }
  if (latestMode8Draft) {
    void saveMode8DraftToIndexedDB(latestMode8Draft);
  }
}

export function installPersistenceAndCrashGuards(): void {
  if (typeof window === "undefined" || emergencyFlushRegistered) return;
  emergencyFlushRegistered = true;

  void openDatabase();

  const handleHide = () => {
    if (document.visibilityState === "hidden") {
      flushAllPersistenceSyncAndAsync();
    }
  };

  window.addEventListener("pagehide", flushAllPersistenceSyncAndAsync);
  window.addEventListener("beforeunload", flushAllPersistenceSyncAndAsync);
  document.addEventListener("visibilitychange", handleHide);

  // Prevent unhandled async/memory errors from closing the editor silently,
  // and immediately trigger an emergency snapshot save.
  window.addEventListener("unhandledrejection", (event) => {
    console.warn("[WXDIV Guard] Promesa no controlada interceptada:", event.reason);
    flushAllPersistenceSyncAndAsync();
    event.preventDefault();
  });

  window.addEventListener("error", (event) => {
    const msg = String(event?.message || "");
    console.warn("[WXDIV Guard] Error en tiempo de ejecución interceptado:", msg);
    flushAllPersistenceSyncAndAsync();
  });
}
