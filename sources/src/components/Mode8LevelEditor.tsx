import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Compass,
  Eye,
  Flame,
  Grid,
  Layers,
  Maximize2,
  Minimize2,
  Package,
  Play,
  RefreshCw,
  Trash2,
  Undo2,
  FileCode,
  Crosshair,
  Save,
  Download,
  Upload,
  Box,
  Blocks,
  Mountain,
  MousePointer,
  PenTool,
  Move,
  Check,
  Search,
  ArrowUpRight,
  SplitSquareVertical,
  HelpCircle,
  FolderOpen,
  Scissors,
  X,
  Menu,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Square,
  Copy,
  LayoutTemplate,
  MapPin,
  Droplets,
  Sparkles,
  GraduationCap,
  Camera,
  Paintbrush,
  Eraser,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DivGraphic,
  DivDoomLinedef,
  DivDoomSector,
  DivMode8Entity,
  DivMode8Light,
  DivMode8PlacedModel,
  DivMode8PlacedVoxel,
  Mode8CameraMode,
} from "../types";
import { DivRuntime } from "../engine/runtime";
import {
  DOOM_WALL_TEXTURES,
  DOOM_FLATS,
  generateDoomStaircase,
  renderDoom2PolygonWorld,
  parseWadBuffer,
  convertWadMapToDoomMode8,
  getDoomTextureCanvas,
  getDoomFlatCanvas,
} from "../engine/doom2Engine";
import {
  pickMode8ThreeSurface,
  Mode8ThreeEditorOverlay,
  Mode8ThreePickHit,
} from "../engine/mode8ThreeRenderer";
import {
  normalizeMode8LevelTextures,
  validateMode8LevelTextures,
} from "../engine/mode8TextureRegistry";
import { WadParser } from "../engine/doom3d/WadParser";
import {
  Mode8LevelData,
  BUILTIN_LEVEL_PRESETS,
  PRESET_ROBLOX_OBBY,
  loadSavedUserLevels,
  saveUserLevel,
  deleteSavedUserLevel,
} from "../engine/mode8Presets";
import {
  buildTracedSectors,
  findSectorAtPoint,
  inferPlacedModelStats,
} from "../engine/mode8Geometry";
import {
  loadMode8DraftFromIndexedDB,
  saveMode8DraftToIndexedDB,
  loadMode8UserLevelsFromIndexedDB,
  setLatestMode8Draft,
  PersistedMode8Draft,
} from "../engine/indexedDbPersistence";
import { useFullscreen } from "../hooks/useFullscreen";
import { Mode8InteractiveTutorial } from "./Mode8InteractiveTutorial";
import {
  CustomModel3DAsset,
  CustomTextureAsset,
  getCustomTexture,
  listCustomModels3D,
  listCustomTextures,
  subscribeAssetLibrary,
} from "../engine/assetLibrary";
import { AssetBrowser } from "./AssetBrowser";
import {
  getActiveDraggedAsset,
  parseDroppedAsset,
} from "../engine/assetDragDrop";
import { invalidateMode8ThreeTexture } from "../engine/mode8ThreeRenderer";
import { Mode8AiAction, Mode8SceneContext } from "../engine/ai/mode8WorkBlocks";

interface Mode8LevelEditorProps {
  runtime?: DivRuntime;
  fpg: DivGraphic[];
  onUpdateFpg?: (next: DivGraphic[]) => void;
  onFpgPackagesChanged?: () => void;
  onInsertCode?: (snippet: string) => void;
  onApplyToRuntime?: () => void;
  onApplyFullCode?: (fullCode: string, customTitle?: string) => void;
  onLaunchGameCode?: (fullCode: string, customTitle?: string) => void;
  onOpenAssetImporter?: (tab: "model3d" | "texture" | "fpg" | "map") => void;
  requestedModelId?: string | null;
  requestedTextureName?: string | null;
  onConsumeRequestedAsset?: () => void;
  onOpenAiAssistant?: () => void;
  pendingAiActionBatch?: { batchId: number; actions: Mode8AiAction[] } | null;
  onConsumeAiActionBatch?: () => void;
  onSceneContextChange?: (ctx: Mode8SceneContext) => void;
}

export type ReDoomEdTool =
  | "select"
  | "polyline"
  | "line"
  | "quickroom"
  | "stairs"
  | "zoom"
  | "move"
  | "sector_fill"
  | "new_thing"
  | "voxel"
  | "move_cam";

export type ThreeBuilderTool =
  | "lego_block"
  | "sculpt_3d"
  | "paint_3d"
  | "lego_actor"
  | "erase_3d"
  | "look";

export interface LegoMaterialSwatch {
  id: string;
  label: string;
  color: string;
  flat: string;
  wall: string;
}

export const LEGO_MATERIAL_SWATCHES: LegoMaterialSwatch[] = [
  { id: "blue", label: "Azul Bloque", color: "#2563eb", flat: "STUD_FLOOR_BLUE", wall: "STUD_WALL_BLUE" },
  { id: "green", label: "Césped", color: "#16a34a", flat: "GRASS1", wall: "STUD_WALL_GREEN" },
  { id: "red", label: "Rojo Bloque", color: "#dc2626", flat: "ROOF1", wall: "REDWALL" },
  { id: "gold", label: "Oro", color: "#eab308", flat: "MARBLE_GOLD", wall: "STUD_GOLD" },
  { id: "wood", label: "Madera", color: "#b45309", flat: "DOJO_TATAMI", wall: "DOJO_WALL" },
  { id: "cyber", label: "Neón", color: "#06b6d4", flat: "NEON_FLOOR", wall: "NEON_GRID" },
  { id: "lava", label: "Lava", color: "#ea580c", flat: "LAVA1", wall: "FIREWALL1" },
  { id: "water", label: "Agua", color: "#0ea5e9", flat: "WATER1", wall: "SHAWN2" },
];

export interface KidToyPreset {
  id: string;
  label: string;
  kind: "player" | "model" | "voxel";
  modelOrVoxelId: string;
  color: string;
}

export const KID_TOY_PRESETS: KidToyPreset[] = [
  { id: "coin", label: "Moneda", kind: "voxel", modelOrVoxelId: "voxel_coin", color: "#facc15" },
  { id: "star", label: "Meta ★", kind: "model", modelOrVoxelId: "trophy_star", color: "#eab308" },
  { id: "checkpoint", label: "Bandera", kind: "voxel", modelOrVoxelId: "voxel_checkpoint", color: "#22c55e" },
  { id: "knight", label: "Enemigo", kind: "model", modelOrVoxelId: "blox_knight", color: "#ef4444" },
  { id: "samurai", label: "Samurái", kind: "model", modelOrVoxelId: "samurai_fighter", color: "#f97316" },
  { id: "mech", label: "Robot", kind: "model", modelOrVoxelId: "cyber_mech", color: "#06b6d4" },
  { id: "medikit", label: "Vida +", kind: "voxel", modelOrVoxelId: "voxel_medikit", color: "#f43f5e" },
  { id: "player", label: "Jugador", kind: "player", modelOrVoxelId: "player", color: "#10b981" },
];

export type InspectorTab = "sector" | "textures" | "voxels" | "menus" | "code";
export type InspectorGroup = "mundo" | "objetos" | "activos" | "juego";
export type MundoSubTab = "sector" | "textures" | "map2d";
export type ObjetosSubTab = "voxels" | "actors";
export type JuegoSubTab = "rules" | "menus" | "code";
export type MenuThemeId = "winebox_clean" | "doom_dark" | "cyber_neon" | "medieval_gold";
export type WeaponId = "shotgun" | "pistol" | "sword3d" | "staff3d";
export type DifficultyId = "facil" | "normal" | "pesadilla";
export type GameModeId = "shooter" | "exploration" | "survival";

export interface Mode8GameConfig {
  title: string;
  subtitle: string;
  hasStartMenu: boolean;
  menuTheme: MenuThemeId;
  playButtonText: string;
  showControlsButton: boolean;
  showWeaponSelect: boolean;
  startingWeapon: WeaponId;
  startingHealth: number;
  startingAmmo: number;
  difficulty: DifficultyId;
  gameMode: GameModeId;
  cameraMode: Mode8CameraMode;
  skyTexture: string;
  playerModelId: string;
  showHudAutomap: boolean;
  autoSyncCode: boolean;
}

export interface ThingPreset {
  type: "player" | "monster" | "pickup" | "model3d" | "light" | "barrel";
  name: string;
  desc: string;
  color: string;
  modelId?: string;
}

export const THING_PRESETS: ThingPreset[] = [
  { type: "player", name: "Marine / Jugador Inicio", desc: "Punto de aparición del jugador", color: "#22c55e" },
  { type: "monster", name: "Imp Demoníaco", desc: "Enemigo clásico rápido", color: "#ef4444" },
  { type: "monster", name: "Demon Brute", desc: "Monstruo cuerpo a cuerpo", color: "#dc2626" },
  { type: "pickup", name: "Escopeta Corredera", desc: "Arma calibre 12", color: "#eab308" },
  { type: "pickup", name: "Botiquín Médico", desc: "Restaura +25 de salud", color: "#38bdf8" },
  { type: "pickup", name: "Caja de Cartuchos", desc: "Munición +20 cartuchos", color: "#f97316" },
  { type: "barrel", name: "Barril Tóxico", desc: "Obstáculo / barril explosivo", color: "#16a34a" },
  { type: "model3d", name: "Blox Hero Obby (MD2)", desc: "Avatar blocky estilo Roblox", color: "#3b82f6", modelId: "blox_hero" },
  { type: "model3d", name: "Caballero Redcliff (MD2)", desc: "Guerrero con espada y capa", color: "#ef4444", modelId: "blox_knight" },
  { type: "model3d", name: "Samurái Dojo (MD2)", desc: "Luchador katana pelea 3D", color: "#f59e0b", modelId: "samurai_fighter" },
  { type: "model3d", name: "Cyber Mech (MD3)", desc: "Mecha futurista con cañones", color: "#06b6d4", modelId: "cyber_mech" },
  { type: "model3d", name: "Trofeo Estrella Dorada (MD2)", desc: "Meta brillante giratoria Obby", color: "#facc15", modelId: "trophy_star" },
  { type: "model3d", name: "Cristal Checkpoint (MD3)", desc: "Cristal neón giratorio", color: "#22d3ee", modelId: "portal_crystal" },
  { type: "model3d", name: "Caballero Clásico (MD2)", desc: "Modelo 3D animado medieval", color: "#a855f7", modelId: "md2_knight" },
  { type: "model3d", name: "Gárgola 3D (MD2)", desc: "Estatua gótica voladora", color: "#c084fc", modelId: "md2_gargoyle" },
  { type: "model3d", name: "Ogro Bruto 3D (MD3)", desc: "Jefe de fase poligonal", color: "#9333ea", modelId: "demon_brute" },
  { type: "light", name: "Luz Dinámica", desc: "Foco de iluminación en mapa", color: "#fb923c" },
];

export interface VoxelItemPreset {
  id: string;
  name: string;
  desc: string;
  iconColor: string;
}

export const AVAILABLE_VOXEL_ITEMS: VoxelItemPreset[] = [
  { id: "voxel_coin", name: "Moneda Dorada", desc: "Recompensa brillante arcade", iconColor: "#facc15" },
  { id: "voxel_checkpoint", name: "Bandera Checkpoint", desc: "Bandera verde Obby con base neón", iconColor: "#22c55e" },
  { id: "voxel_neon_cube", name: "Núcleo Neón Cyber", desc: "Cubo luminoso futurista", iconColor: "#38bdf8" },
  { id: "voxel_barrel", name: "Barril Tóxico", desc: "Contenedor radiactivo con bandas", iconColor: "#16a34a" },
  { id: "voxel_torch", name: "Antorcha Mazmorra", desc: "Lámpara gótica con llama ardiente", iconColor: "#f97316" },
  { id: "voxel_pillar", name: "Columna Gótica", desc: "Pilar de piedra labrada", iconColor: "#94a3b8" },
  { id: "voxel_terminal", name: "Consola Sci-Fi", desc: "Terminal de datos UAC", iconColor: "#0ea5e9" },
  { id: "voxel_medikit", name: "Botiquín Médico", desc: "Suministro de salud con cruz roja", iconColor: "#ef4444" },
  { id: "voxel_crate", name: "Caja Suministros", desc: "Caja de madera reforzada", iconColor: "#ca8a04" },
  { id: "voxel_key", name: "Llave Dorada", desc: "Llave dorada para compuertas", iconColor: "#eab308" },
  { id: "voxel_skull", name: "Cráneo Demoníaco", desc: "Reliquia con cuernos oscuros", iconColor: "#f1f5f9" },
  { id: "voxel_potion", name: "Poción Mágica", desc: "Frasco arcano resplandeciente", iconColor: "#c084fc" },
  { id: "voxel_chest", name: "Cofre del Tesoro", desc: "Cofre con herrajes dorados", iconColor: "#d97706" },
];

const textureThumbCache = new Map<string, string>();
const TextureThumb: React.FC<{ name: string; kind: "wall" | "flat"; fallbackColor: string }> = ({
  name,
  kind,
  fallbackColor,
}) => {
  const customTex = getCustomTexture(name);
  const src = useMemo(() => {
    if (customTex?.dataUrl) return customTex.dataUrl;
    const key = `${kind}:${name}`;
    const existing = textureThumbCache.get(key);
    if (existing) return existing;
    try {
      const c = kind === "wall" ? getDoomTextureCanvas(name) : getDoomFlatCanvas(name);
      const url = c.toDataURL();
      textureThumbCache.set(key, url);
      return url;
    } catch {
      return "";
    }
  }, [name, kind, customTex?.dataUrl]);

  if (!src) {
    return (
      <div
        className="w-8 h-8 rounded-xs border border-black/50 flex-shrink-0"
        style={{ backgroundColor: fallbackColor }}
      />
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className="w-8 h-8 rounded-xs border border-black/50 object-cover flex-shrink-0 [image-rendering:pixelated]"
    />
  );
};

const MENU_THEMES_META: Array<{
  id: MenuThemeId;
  name: string;
  previewBg: string;
  previewAccent: string;
  previewText: string;
}> = [
  { id: "winebox_clean", name: "Editorial Claro", previewBg: "#FFFFFF", previewAccent: "#7C2D48", previewText: "#111827" },
  { id: "doom_dark", name: "Doom Clásico", previewBg: "#18181B", previewAccent: "#DC2626", previewText: "#FACC15" },
  { id: "cyber_neon", name: "Cyber Neón", previewBg: "#0B132B", previewAccent: "#0284C7", previewText: "#38BDF8" },
  { id: "medieval_gold", name: "Ciudadela Oro", previewBg: "#1F1712", previewAccent: "#B45309", previewText: "#FDE68A" },
];

function sanitizeProgramIdentifier(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!clean) return "Juego3D_Modo8";
  return /^\d/.test(clean) ? `Juego_${clean}` : clean;
}

function escapeDivStr(s: string): string {
  return String(s ?? "").replace(/"/g, "'").replace(/\r?\n/g, " ");
}

function safeFinite(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

const MODE8_DRAFT_KEY = "wxdiv_mode8_active_draft_v1";

interface Mode8ActiveDraft {
  updatedAt?: number;
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
  entities: DivMode8Entity[];
  placedModels: DivMode8PlacedModel[];
  placedVoxels: DivMode8PlacedVoxel[];
  lights: DivMode8Light[];
  currentLevelName: string;
  gameConfig: Mode8GameConfig;
  cam3D: { x: number; y: number; z: number; angle: number; pitch: number };
}

const DEFAULT_FALLBACK_SECTOR: DivDoomSector = {
  id: 0,
  floorHeight: 0,
  ceilHeight: 1.5,
  floorTexture: "FLOOR4_8",
  ceilTexture: "CEIL3_5",
  lightLevel: 190,
};

function loadMode8Draft(): Partial<Mode8ActiveDraft> | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(MODE8_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Partial<Mode8ActiveDraft>;
  } catch {
    return null;
  }
}

export const Mode8LevelEditor: React.FC<Mode8LevelEditorProps> = ({
  runtime,
  fpg,
  onUpdateFpg,
  onFpgPackagesChanged,
  onInsertCode,
  onApplyToRuntime,
  onApplyFullCode,
  onLaunchGameCode,
  onOpenAssetImporter,
  requestedModelId,
  requestedTextureName,
  onConsumeRequestedAsset,
  onOpenAiAssistant,
  pendingAiActionBatch,
  onConsumeAiActionBatch,
  onSceneContextChange,
}) => {
  const initialDraft = useMemo(() => loadMode8Draft(), []);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen: isEditorFullscreen, toggleFullscreen: toggleEditorFullscreen } = useFullscreen();

  // Active viewport & grouped panel modes
  const [viewMode, setViewMode] = useState<"map2d" | "visual3d" | "split" | "code">(() =>
    typeof window !== "undefined" && window.innerWidth < 1024 ? "visual3d" : "split"
  );
  const [currentTool, setCurrentTool] = useState<ReDoomEdTool>("select");
  const [inspectorGroup, setInspectorGroup] = useState<InspectorGroup>("mundo");
  const [mundoSubTab, setMundoSubTab] = useState<MundoSubTab>("sector");
  const [objetosSubTab, setObjetosSubTab] = useState<ObjetosSubTab>("voxels");
  const [juegoSubTab, setJuegoSubTab] = useState<JuegoSubTab>("rules");
  const [mobileSheetTab, setMobileSheetTab] = useState<"canvas" | InspectorGroup>("canvas");
  const [showQuickPicker, setShowQuickPicker] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

  const setInspectorTab = useCallback((tab: InspectorTab) => {
    if (tab === "sector") {
      setInspectorGroup("mundo");
      setMundoSubTab("sector");
    } else if (tab === "textures") {
      setInspectorGroup("mundo");
      setMundoSubTab("textures");
    } else if (tab === "voxels") {
      setInspectorGroup("objetos");
      setObjetosSubTab("voxels");
    } else if (tab === "menus") {
      setInspectorGroup("juego");
      setJuegoSubTab("menus");
    } else if (tab === "code") {
      setInspectorGroup("juego");
      setJuegoSubTab("code");
    }
  }, []);

  // Grid, zoom & pan
  const [gridSnap, setGridSnap] = useState<number>(16);
  const [autoSnap, setAutoSnap] = useState<boolean>(true);
  const [zoomFactor, setZoomFactor] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 80, y: 70 });

  // 3D Visor options
  const [show3DRadar, setShow3DRadar] = useState<boolean>(false);
  const [showMenuPreview, setShowMenuPreview] = useState<boolean>(false);

  // Modals & Interactive Tutorial
  const [showStairsDialog, setShowStairsDialog] = useState<boolean>(false);
  const [showSpecialListDialog, setShowSpecialListDialog] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [saveSlotName, setSaveSlotName] = useState<string>("Mi Nivel Personalizado");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadModalTab, setLoadModalTab] = useState<"presets" | "saved" | "import">("presets");
  const [userSavedLevels, setUserSavedLevels] = useState<Mode8LevelData[]>(() => loadSavedUserLevels());
  const [pastedWadText, setPastedWadText] = useState<string>("");

  // Active texture selections
  const [selectedWallTex, setSelectedWallTex] = useState<string>("STUD_WALL_BLUE");
  const [selectedFlatTex, setSelectedFlatTex] = useState<string>("STUD_FLOOR_BLUE");
  const [selectedFlatTarget, setSelectedFlatTarget] = useState<"floor" | "ceiling">("floor");
  const [flatSearchFilter, setFlatSearchFilter] = useState<string>("");
  const [wallSearchFilter, setWallSearchFilter] = useState<string>("");
  const [activeWallCategory, setActiveWallCategory] = useState<string>("all");

  // Selection state
  const [selectedVertexId, setSelectedVertexId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<number>(0);
  const [selectedThingIdx, setSelectedThingIdx] = useState<number | null>(null);
  const [selectedModelIdx, setSelectedModelIdx] = useState<number | null>(null);
  const [selectedThingPreset, setSelectedThingPreset] = useState<ThingPreset>(THING_PRESETS[7]);

  // Construction helpers (Polyline & 2-point Line)
  const [polyVertices, setPolyVertices] = useState<{ x: number; y: number }[]>([]);
  const [lineStartPoint, setLineStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Staircase generator parameters
  const [stairSteps, setStairSteps] = useState<number>(5);
  const [stairHeightDelta, setStairHeightDelta] = useState<number>(0.2);
  const [stairWidth, setStairWidth] = useState<number>(2.0);
  const [stairLength] = useState<number>(0.5);
  const [stairTexture, setStairTexture] = useState<string>("STEP1");

  // Map geometry data (Roblox / Doom 2 Sectors, Linedefs, Entities, Models, Lights, Voxels)
  const [sectors, setSectors] = useState<DivDoomSector[]>(() => {
    if (Array.isArray(initialDraft?.sectors) && initialDraft.sectors.length > 0) {
      return initialDraft.sectors;
    }
    return PRESET_ROBLOX_OBBY.sectors;
  });

  const [linedefs, setLinedefs] = useState<DivDoomLinedef[]>(() => {
    if (Array.isArray(initialDraft?.linedefs) && initialDraft.linedefs.length > 0) {
      return initialDraft.linedefs;
    }
    return PRESET_ROBLOX_OBBY.linedefs;
  });

  const [entities, setEntities] = useState<DivMode8Entity[]>(() => {
    if (Array.isArray(initialDraft?.entities)) {
      return initialDraft.entities;
    }
    return PRESET_ROBLOX_OBBY.entities;
  });

  const [placedModels, setPlacedModels] = useState<DivMode8PlacedModel[]>(() => {
    if (Array.isArray(initialDraft?.placedModels)) {
      return initialDraft.placedModels;
    }
    return PRESET_ROBLOX_OBBY.placedModels;
  });

  const [lights, setLights] = useState<DivMode8Light[]>(() => {
    if (Array.isArray(initialDraft?.lights)) {
      return initialDraft.lights;
    }
    return PRESET_ROBLOX_OBBY.lights;
  });

  const [currentLevelName, setCurrentLevelName] = useState<string>(() =>
    typeof initialDraft?.currentLevelName === "string" && initialDraft.currentLevelName
      ? initialDraft.currentLevelName
      : PRESET_ROBLOX_OBBY.name
  );
  const [placedVoxels, setPlacedVoxels] = useState<DivMode8PlacedVoxel[]>(() =>
    Array.isArray(initialDraft?.placedVoxels) ? initialDraft.placedVoxels : PRESET_ROBLOX_OBBY.placedVoxels
  );
  const [selectedVoxelType, setSelectedVoxelType] = useState<string>("voxel_coin");
  const [selectedVoxelYaw, setSelectedVoxelYaw] = useState<number>(0);
  const [selectedVoxelScale, setSelectedVoxelScale] = useState<number>(1.0);
  const [selectedVoxelIdx, setSelectedVoxelIdx] = useState<number | null>(null);

  // No-Code 3D Game & Menu Configurator
  const [gameConfig, setGameConfig] = useState<Mode8GameConfig>(() => ({
    title: PRESET_ROBLOX_OBBY.name,
    subtitle: "Salta plataformas, vence enemigos IA y captura la estrella",
    hasStartMenu: true,
    menuTheme: "winebox_clean",
    playButtonText: "Jugar Ahora",
    showControlsButton: true,
    showWeaponSelect: true,
    startingWeapon: "sword3d",
    startingHealth: 100,
    startingAmmo: 24,
    difficulty: "normal",
    gameMode: "exploration",
    cameraMode: "third_person",
    skyTexture: "SKY_ROBLOX",
    playerModelId: "blox_hero",
    showHudAutomap: false,
    autoSyncCode: true,
    ...(initialDraft?.gameConfig || {}),
  }));

  // Direct-3D LEGO / Roblox + Duke 3D Builder State
  const [threeTool, setThreeTool] = useState<ThreeBuilderTool>("lego_block");
  const [legoSize, setLegoSize] = useState<1 | 2>(1);
  const [legoStepHeight, setLegoStepHeight] = useState<0.5 | 1.0 | 1.5>(0.5);
  const [selectedKidToy, setSelectedKidToy] = useState<KidToyPreset>(KID_TOY_PRESETS[0]);
  const [hoverPick, setHoverPick] = useState<Mode8ThreePickHit | null>(null);

  // Imported custom MD2/MD3 models & custom textures synced from AssetLibrary
  const [customModels, setCustomModels] = useState<CustomModel3DAsset[]>(() => listCustomModels3D());
  const [customTextures, setCustomTextures] = useState<CustomTextureAsset[]>(() => listCustomTextures());

  useEffect(() => {
    return subscribeAssetLibrary(() => {
      setCustomModels(listCustomModels3D());
      setCustomTextures(listCustomTextures());
    });
  }, []);

  const allKidToys = useMemo<KidToyPreset[]>(() => {
    const customToys: KidToyPreset[] = customModels.map((m) => ({
      id: `custom_${m.id}`,
      label: m.name,
      kind: "model",
      modelOrVoxelId: m.id,
      color: m.colorHint || "#7C2D48",
    }));
    return [...customToys, ...KID_TOY_PRESETS];
  }, [customModels]);

  const allThingPresets = useMemo<ThingPreset[]>(() => {
    const customThings: ThingPreset[] = customModels.map((m) => ({
      type: "model3d",
      name: `${m.name} (${m.format.toUpperCase()})`,
      desc: `Importado · ${m.vertexCount}v · ${m.frameCount}f`,
      color: m.colorHint || "#7C2D48",
      modelId: m.id,
    }));
    return [...customThings, ...THING_PRESETS];
  }, [customModels]);

  const allMaterialSwatches = useMemo<LegoMaterialSwatch[]>(() => {
    const customSwatches: LegoMaterialSwatch[] = customTextures.map((t) => ({
      id: `custom_${t.name}`,
      label: t.displayName || t.name,
      color: t.dominantColor || "#64748b",
      flat: t.name,
      wall: t.name,
    }));
    return [...customSwatches, ...LEGO_MATERIAL_SWATCHES];
  }, [customTextures]);

  useEffect(() => {
    if (!requestedModelId && !requestedTextureName) return;
    if (requestedModelId) {
      const foundToy = allKidToys.find((k) => k.modelOrVoxelId === requestedModelId);
      if (foundToy) {
        setSelectedKidToy(foundToy);
      } else {
        setSelectedKidToy({
          id: `custom_${requestedModelId}`,
          label: requestedModelId,
          kind: "model",
          modelOrVoxelId: requestedModelId,
          color: "#7C2D48",
        });
      }
      setThreeTool("lego_actor");
      setCurrentTool("new_thing");
    }
    if (requestedTextureName) {
      setSelectedFlatTex(requestedTextureName);
      setSelectedWallTex(requestedTextureName);
      setThreeTool("paint_3d");
    }
    onConsumeRequestedAsset?.();
  }, [requestedModelId, requestedTextureName, allKidToys, onConsumeRequestedAsset]);

  interface EditorSnapshot {
    sectors: DivDoomSector[];
    linedefs: DivDoomLinedef[];
    entities: DivMode8Entity[];
    placedModels: DivMode8PlacedModel[];
    placedVoxels: DivMode8PlacedVoxel[];
    lights: DivMode8Light[];
  }
  const undoStackRef = useRef<EditorSnapshot[]>([]);
  const [undoCount, setUndoCount] = useState<number>(0);

  // Track whether user has made edits inside Mode8 editor before auto-syncing to main editor
  const userEditedRef = useRef<boolean>(false);
  const pendingCodeSyncRef = useRef<{
    dirty: boolean;
    code: string;
    title: string;
    autoSync: boolean;
    apply?: (fullCode: string, customTitle?: string) => void;
  }>({
    dirty: false,
    code: "",
    title: "",
    autoSync: true,
    apply: onApplyFullCode,
  });
  const persistActiveDraftRef = useRef<(() => void) | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const pushUndoSnapshot = useCallback(
    (snap?: EditorSnapshot) => {
      const entry: EditorSnapshot = snap || {
        sectors: sectors.map((s) => ({ ...s })),
        linedefs: linedefs.map((l) => ({ ...l })),
        entities: entities.map((e) => ({ ...e })),
        placedModels: placedModels.map((m) => ({ ...m })),
        placedVoxels: placedVoxels.map((v) => ({ ...v })),
        lights: lights.map((lt) => ({ ...lt })),
      };
      const next = [...undoStackRef.current.slice(-24), entry];
      undoStackRef.current = next;
      setUndoCount(next.length);
    },
    [sectors, linedefs, entities, placedModels, placedVoxels, lights]
  );

  const markEdited = (skipUndo = false) => {
    if (!skipUndo) {
      pushUndoSnapshot();
    }
    userEditedRef.current = true;
    pendingCodeSyncRef.current.dirty = true;
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Publish live 3D Scene Context so local AI understands current map, models & textures
  useEffect(() => {
    if (!onSceneContextChange) return;
    const playerEnt = entities.find((e) => e.type === "player");
    onSceneContextChange({
      levelTitle: gameConfig.title || currentLevelName,
      sectorCount: sectors.length,
      linedefCount: linedefs.length,
      placedModelsCount: placedModels.length,
      placedVoxelsCount: placedVoxels.length,
      customModels: customModels.map((m) => ({ id: m.id, name: m.name })),
      customTextures: customTextures.map((t) => ({ name: t.name, displayName: t.displayName || t.name })),
      cameraMode: gameConfig.cameraMode,
      skyTexture: gameConfig.skyTexture,
      gameMode: gameConfig.gameMode,
      selectedSectorId,
      playerPos: {
        x: playerEnt?.x ?? 4.5 * 64,
        y: playerEnt?.y ?? 7.5 * 64,
      },
    });
  }, [
    onSceneContextChange,
    gameConfig.title,
    gameConfig.cameraMode,
    gameConfig.skyTexture,
    gameConfig.gameMode,
    currentLevelName,
    sectors.length,
    linedefs.length,
    placedModels.length,
    placedVoxels.length,
    customModels,
    customTextures,
    selectedSectorId,
    entities,
  ]);

  // (El ejecutor pendingAiActionBatch se encuentra después de tracedSectors)

  const textureValidation = useMemo(
    () => validateMode8LevelTextures(sectors, linedefs, gameConfig.skyTexture),
    [sectors, linedefs, gameConfig.skyTexture]
  );

  // Auto-generated clean, editable DIV Pascal Code (canonical texture normalized)
  const generatedDivCode = useMemo(() => {
    const normalized = normalizeMode8LevelTextures(sectors, linedefs, gameConfig.skyTexture);
    const normSectors = normalized.sectors;
    const normLines = normalized.linedefs;
    const normSky = normalized.skyTexture;

    const progId = sanitizeProgramIdentifier(gameConfig.title || currentLevelName);
    const playerEnt = entities.find((e) => e.type === "player");
    const spawnX = playerEnt ? (safeFinite(playerEnt.x, 4.5 * 64) / 64).toFixed(2) : "4.50";
    const spawnY = playerEnt ? (safeFinite(playerEnt.y, 7.5 * 64) / 64).toFixed(2) : "7.50";

    const sectorLines = normSectors
      .map(
        (s) =>
          `    m8_set_doom_sector(${Math.round(safeFinite(s.id, 0))}, ${safeFinite(s.floorHeight, 0).toFixed(2)}, ${safeFinite(s.ceilHeight, 1.5).toFixed(2)}, "${escapeDivStr(String(s.floorTexture ?? "STUD_FLOOR_BLUE"))}", "${escapeDivStr(String(s.ceilTexture ?? "SKY_ROBLOX"))}", ${Math.round(safeFinite(s.lightLevel, 240))}, ${Math.round(safeFinite(s.special, 0))}, ${Math.round(safeFinite(s.tag, 0))});`
      )
      .join("\n");

    const wallLines = normLines
      .map(
        (l) =>
          `    m8_add_doom_line("${escapeDivStr(String(l.id))}", ${safeFinite(l.x1, 0).toFixed(2)}, ${safeFinite(l.y1, 0).toFixed(2)}, ${safeFinite(l.x2, 0).toFixed(2)}, ${safeFinite(l.y2, 0).toFixed(2)}, ${Math.round(safeFinite(l.frontSectorId, 0))}, ${l.backSectorId !== undefined ? Math.round(safeFinite(l.backSectorId, -1)) : -1}, ${l.isTwoSided ? 1 : 0}, "${escapeDivStr(String(l.middleTexture ?? "STUD_BLUE"))}", "${escapeDivStr(String(l.lowerTexture ?? ""))}", "${escapeDivStr(String(l.upperTexture ?? ""))}", ${l.blocking !== false ? 1 : 0});`
      )
      .join("\n");

    const voxelLines =
      placedVoxels.length > 0
        ? placedVoxels
            .map(
              (v) =>
                `    m8_place_voxel("${escapeDivStr(v.voxelId)}", ${safeFinite(v.x, 0).toFixed(2)}, ${safeFinite(v.y, 0).toFixed(2)}, ${safeFinite(v.z, 0).toFixed(2)}, ${safeFinite(v.yaw, 0).toFixed(0)}, ${safeFinite(v.scale, 1).toFixed(2)});`
            )
            .join("\n")
        : "    // (Opcional) Agrega vóxels 3D desde el editor visual";

    const modelLines =
      placedModels.length > 0
        ? placedModels
            .map((m) => {
              const st = inferPlacedModelStats(m);
              return `    m8_add_model("${escapeDivStr(m.modelId)}", ${safeFinite(m.x, 0).toFixed(2)}, ${safeFinite(m.y, 0).toFixed(2)}, ${safeFinite(m.z, 0).toFixed(2)}, ${safeFinite(m.yaw, 0).toFixed(0)}, "${escapeDivStr(m.animation || "idle")}", ${safeFinite(m.scale, 1).toFixed(2)}, "${escapeDivStr(st.role)}", ${Math.round(st.hp)}, ${st.speed.toFixed(2)}, ${Math.round(st.damage)}, "${escapeDivStr(st.name)}");`;
            })
            .join("\n")
        : "    // Sin modelos MD2/MD3 extra";

    const lightLines =
      lights.length > 0
        ? lights
            .map(
              (lt) =>
                `    m8_add_light(${safeFinite(lt.x, 0).toFixed(2)}, ${safeFinite(lt.y, 0).toFixed(2)}, ${safeFinite(lt.z, 1).toFixed(2)}, ${safeFinite(lt.radius, 8).toFixed(1)}, ${Math.round(safeFinite(lt.r, 255))}, ${Math.round(safeFinite(lt.g, 200))}, ${Math.round(safeFinite(lt.b, 140))}, ${lt.flicker ? 1 : 0});`
            )
            .join("\n")
        : "";

    const entLines =
      entities.length > 0
        ? entities
            .map(
              (ent) =>
                `    m8_spawn_entity("${escapeDivStr(ent.type)}", ${(safeFinite(ent.x, 4.5 * 64) / 64).toFixed(2)}, ${(safeFinite(ent.y, 5.5 * 64) / 64).toFixed(2)}, "${escapeDivStr(ent.name || ent.type)}", ${Math.round(safeFinite(ent.graph, 27))});`
            )
            .join("\n")
        : "";

    return `// =========================================================================
// MAPA GENERADO CON CONSTRUCTOR 3D MODO 8 (MODO 8 3D + REDOOMED)
// Edita en 3D o ajusta parámetros y pulsa Ejecutar (F9).
// =========================================================================
PROGRAM ${progId};

CONST
    // --- MENÚ Y CONFIGURACIÓN DEL JUEGO ---
    TITULO_JUEGO       = "${escapeDivStr(gameConfig.title)}";
    SUBTITULO_JUEGO    = "${escapeDivStr(gameConfig.subtitle)}";
    MOSTRAR_MENU       = ${gameConfig.hasStartMenu ? 1 : 0};
    TEMA_MENU          = "${gameConfig.menuTheme}";
    BOTON_JUGAR        = "${escapeDivStr(gameConfig.playButtonText)}";
    MOSTRAR_CONTROLES  = ${gameConfig.showControlsButton ? 1 : 0};
    SELECTOR_ARMA_MENU = ${gameConfig.showWeaponSelect ? 1 : 0};

    // --- JUGABILIDAD, CÁMARA Y HUD ---
    ARMA_INICIAL       = "${gameConfig.startingWeapon}";
    SALUD_INICIAL      = ${gameConfig.startingHealth};
    MUNICION_INICIAL   = ${gameConfig.startingAmmo};
    DIFICULTAD         = "${gameConfig.difficulty}";
    MODO_JUEGO         = "${gameConfig.gameMode}";
    CAMARA_MODO        = "${gameConfig.cameraMode}";
    CIELO_TEXTURA      = "${escapeDivStr(normSky)}";
    JUGADOR_MODELO     = "${escapeDivStr(gameConfig.playerModelId)}";
    MOSTRAR_MINIMAPA   = ${gameConfig.showHudAutomap ? 1 : 0};
    TEXTURA_HASH       = "${normalized.validation.manifestChecksum}";

BEGIN
    set_mode(m640x480);
    set_fps(60);

    // 1. Iniciar Motor 3D Modo 8 Doom 2
    start_mode8(0, 0, 25, 44, 45, 0, 0);
    m8_engine_mode("doom2");
    m8_workers(4);
    m8_set_weapon(ARMA_INICIAL);
    m8_set_sky(CIELO_TEXTURA);

    // 2. Sectores (Altura suelo/techo, texturas e iluminación)
${sectorLines}

    // 3. Paredes, Portales y Escaleras (${normLines.length} líneas)
${wallLines}

    // 4. Vóxels 3D Decorativos (${placedVoxels.length})
${voxelLines}

    // 5. Modelos 3D MD2/MD3 (${placedModels.length})
${modelLines}

    // 6. Iluminación Dinámica (${lights.length})
${lightLines}

    // 7. Actores y Objetos del Mapa (${entities.length})
${entLines}

    // 8. Iniciar Jugador y Menú Principal 3D
    jugador_doom(${spawnX}, ${spawnY});

    LOOP
        FRAME;
    END
END
`;
  }, [sectors, linedefs, placedVoxels, placedModels, lights, entities, gameConfig, currentLevelName, textureValidation]);

  // Keep sync ref up to date and flush immediately if unmounted with pending edits
  useEffect(() => {
    pendingCodeSyncRef.current.code = generatedDivCode;
    pendingCodeSyncRef.current.title = gameConfig.title;
    pendingCodeSyncRef.current.autoSync = gameConfig.autoSyncCode;
    pendingCodeSyncRef.current.apply = onApplyFullCode;

    if (gameConfig.autoSyncCode && userEditedRef.current && onApplyFullCode) {
      pendingCodeSyncRef.current.dirty = true;
      const timer = setTimeout(() => {
        pendingCodeSyncRef.current.dirty = false;
        onApplyFullCode(generatedDivCode, gameConfig.title);
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [generatedDivCode, gameConfig.autoSyncCode, gameConfig.title, onApplyFullCode]);

  useEffect(() => {
    return () => {
      persistActiveDraftRef.current?.();
      const pending = pendingCodeSyncRef.current;
      if (pending.dirty && pending.autoSync && pending.apply && pending.code) {
        pending.dirty = false;
        pending.apply(pending.code, pending.title);
      }
    };
  }, []);

  // 3D Walkthrough Camera State
  const [cam3D, setCam3D] = useState<{ x: number; y: number; z: number; angle: number; pitch: number }>(() => ({
    x: safeFinite(initialDraft?.cam3D?.x, 4.5),
    y: safeFinite(initialDraft?.cam3D?.y, 7.5),
    z: safeFinite(initialDraft?.cam3D?.z, 0.0),
    angle: safeFinite(initialDraft?.cam3D?.angle, 0),
    pitch: safeFinite(initialDraft?.cam3D?.pitch, 0),
  }));
  const cam3DRef = useRef(cam3D);
  useEffect(() => {
    cam3DRef.current = cam3D;
  }, [cam3D]);

  const canPersistIdbRef = useRef<boolean>(false);

  // Sync Mode8 active draft and saved custom levels from IndexedDB on startup
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [idbDraft, idbLevels] = await Promise.all([
          loadMode8DraftFromIndexedDB(),
          loadMode8UserLevelsFromIndexedDB<Mode8LevelData>(),
        ]);
        if (cancelled) return;

        if (idbLevels && idbLevels.length > 0) {
          setUserSavedLevels((prev) => {
            const byId = new Map<string, Mode8LevelData>();
            idbLevels.forEach((lvl) => {
              if (lvl?.id) byId.set(lvl.id, lvl);
            });
            prev.forEach((lvl) => {
              if (lvl?.id && !byId.has(lvl.id)) byId.set(lvl.id, lvl);
            });
            return Array.from(byId.values());
          });
        }

        const localUpdatedAt = typeof initialDraft?.updatedAt === "number" ? initialDraft.updatedAt : 0;
        if (
          idbDraft &&
          !userEditedRef.current &&
          (idbDraft.updatedAt || 0) >= localUpdatedAt &&
          Array.isArray(idbDraft.sectors) &&
          idbDraft.sectors.length > 0 &&
          Array.isArray(idbDraft.linedefs) &&
          idbDraft.linedefs.length > 0
        ) {
          setSectors(idbDraft.sectors);
          setLinedefs(idbDraft.linedefs);
          if (Array.isArray(idbDraft.entities)) setEntities(idbDraft.entities);
          if (Array.isArray(idbDraft.placedModels)) setPlacedModels(idbDraft.placedModels);
          if (Array.isArray(idbDraft.placedVoxels)) setPlacedVoxels(idbDraft.placedVoxels);
          if (Array.isArray(idbDraft.lights)) setLights(idbDraft.lights);
          if (typeof idbDraft.currentLevelName === "string" && idbDraft.currentLevelName) {
            setCurrentLevelName(idbDraft.currentLevelName);
          }
          if (idbDraft.gameConfig && typeof idbDraft.gameConfig === "object") {
            setGameConfig((prev) => ({
              ...prev,
              ...(idbDraft.gameConfig as Partial<Mode8GameConfig>),
            }));
          }
          if (idbDraft.cam3D && typeof idbDraft.cam3D === "object") {
            setCam3D({
              x: safeFinite(idbDraft.cam3D.x, 4.5),
              y: safeFinite(idbDraft.cam3D.y, 5.5),
              z: safeFinite(idbDraft.cam3D.z, 0.6),
              angle: safeFinite(idbDraft.cam3D.angle, 0),
              pitch: safeFinite(idbDraft.cam3D.pitch, 0),
            });
          }
        }
      } catch (err) {
        console.warn("[Mode8] No se pudo sincronizar caché IndexedDB:", err);
      } finally {
        canPersistIdbRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialDraft]);

  // Persist active 3D level draft safely to IndexedDB + localStorage fallback
  const persistActiveDraft = useCallback(() => {
    const now = Date.now();
    const payload: Mode8ActiveDraft = {
      updatedAt: now,
      sectors,
      linedefs,
      entities,
      placedModels,
      placedVoxels,
      lights,
      currentLevelName,
      gameConfig,
      cam3D: cam3DRef.current,
    };

    const idbPayload: PersistedMode8Draft = {
      updatedAt: now,
      sectors,
      linedefs,
      entities,
      placedModels,
      placedVoxels,
      lights,
      currentLevelName,
      gameConfig: gameConfig as unknown as Record<string, unknown>,
      cam3D: cam3DRef.current,
    };

    setLatestMode8Draft(idbPayload);

    if (canPersistIdbRef.current) {
      void saveMode8DraftToIndexedDB(idbPayload);
    }

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(MODE8_DRAFT_KEY, JSON.stringify(payload));
      } catch {
        // Ignore quota / private browsing errors
      }
    }
  }, [sectors, linedefs, entities, placedModels, placedVoxels, lights, currentLevelName, gameConfig]);

  useEffect(() => {
    persistActiveDraftRef.current = persistActiveDraft;
    const t = window.setTimeout(persistActiveDraft, 250);
    return () => window.clearTimeout(t);
  }, [persistActiveDraft]);

  // Canvas & container refs
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const visual3DCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const visual3DContainerRef = useRef<HTMLDivElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const redraw2DMapRef = useRef<(() => void) | null>(null);

  // Panning, smart-drag, 2-finger pinch, and direct-3D builder refs
  const [cursorWorldCoords, setCursorWorldCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookDragRef = useRef<{
    active: boolean;
    button: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({
    active: false,
    button: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
  });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const dragObjectRef = useRef<{ kind: "model" | "voxel" | "entity"; idx: number } | null>(null);
  const previewJumpRef = useRef<{ airZ: number; velZ: number }>({ airZ: 0, velZ: 0 });
  const editorOverlayRef = useRef<Mode8ThreeEditorOverlay>({ enabled: false });
  const panGestureRef = useRef<{
    active: boolean;
    mode: "immediate" | "pending_select";
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
    wx: number;
    wy: number;
    movedBeyondThreshold: boolean;
  }>({
    active: false,
    mode: "immediate",
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
    wx: 0,
    wy: 0,
    movedBeyondThreshold: false,
  });

  // Fit entire map cleanly inside the 2D canvas viewport
  const fitMapToView = useCallback(
    (customLines?: DivDoomLinedef[]) => {
      const targetLines = customLines || linedefs;
      const canvas = mapCanvasRef.current;
      const cw = canvas?.width || 640;
      const ch = canvas?.height || 420;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      targetLines.forEach((l) => {
        minX = Math.min(minX, l.x1, l.x2);
        maxX = Math.max(maxX, l.x1, l.x2);
        minY = Math.min(minY, l.y1, l.y2);
        maxY = Math.max(maxY, l.y1, l.y2);
      });

      if (!Number.isFinite(minX)) {
        setZoomFactor(1.0);
        setPanOffset({ x: cw / 2 - 120, y: ch / 2 - 120 });
        return;
      }

      const spanW = Math.max(4, maxX - minX);
      const spanH = Math.max(4, maxY - minY);
      const padding = 48;
      const targetScale = Math.min((cw - padding * 2) / spanW, (ch - padding * 2) / spanH);
      const clampedZoom = Math.max(0.25, Math.min(2.5, targetScale / 24));
      const scale = 24 * clampedZoom;

      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      setZoomFactor(Number(clampedZoom.toFixed(2)));
      setPanOffset({
        x: Math.round(cw / 2 - midX * scale),
        y: Math.round(ch / 2 - midY * scale),
      });
    },
    [linedefs]
  );

  // Fit map on first valid canvas layout
  const initialFitDoneRef = useRef(false);
  useEffect(() => {
    if (!initialFitDoneRef.current && mapCanvasRef.current && mapCanvasRef.current.width > 100) {
      initialFitDoneRef.current = true;
      fitMapToView();
    }
  }, [fitMapToView]);

  // 3D keyboard movement listener (ignores inputs/textareas!)
  const keysDownRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return Boolean(
        el &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.tagName === "SELECT" ||
            el.isContentEditable)
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      keysDownRef.current[e.key.toLowerCase()] = true;
      keysDownRef.current[e.code.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = false;
      keysDownRef.current[e.code.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Precompute exact traced sector loops (innermost smallest-area containment) for 3D Visor
  const tracedSectors = useMemo(() => buildTracedSectors(sectors, linedefs), [sectors, linedefs]);

  const lastHandledAiBatchRef = useRef<number>(0);
  useEffect(() => {
    if (!pendingAiActionBatch || pendingAiActionBatch.batchId <= lastHandledAiBatchRef.current) return;
    lastHandledAiBatchRef.current = pendingAiActionBatch.batchId;

    const actions = pendingAiActionBatch.actions;
    if (!actions || actions.length === 0) {
      onConsumeAiActionBatch?.();
      return;
    }

    pushUndoSnapshot();
    userEditedRef.current = true;
    pendingCodeSyncRef.current.dirty = true;

    const playerEnt = entities.find((e) => e.type === "player");
    const basePx = playerEnt ? playerEnt.x / 64 : 4.5;
    const basePy = playerEnt ? playerEnt.y / 64 : 6.0;

    let nextSectors = [...sectors];
    let nextLinedefs = [...linedefs];
    let nextVoxels = [...placedVoxels];
    let nextModels = [...placedModels];
    let nextConfig = { ...gameConfig };
    let nextSelectedSector = selectedSectorId;
    const appliedNotes: string[] = [];

    for (const act of actions) {
      if (act.type === "add_platform") {
        const w = Math.max(1, act.width ?? 2);
        const d = Math.max(1, act.depth ?? 2);
        const offsetIdx = (nextSectors.length % 4) * 1.25;
        const cx = Number((act.x ?? basePx + 1.5 + offsetIdx).toFixed(2));
        const cy = Number((act.y ?? basePy - 1.5).toFixed(2));
        const outer = findSectorAtPoint(cx, cy, tracedSectors) || nextSectors[0] || DEFAULT_FALLBACK_SECTOR;
        const newSecId = Math.max(0, ...nextSectors.map((s) => s.id)) + 1;
        const floorH = Number((act.floorHeight ?? 0.75).toFixed(2));
        const ceilH = Math.max(floorH + 3.0, act.ceilHeight ?? outer.ceilHeight ?? 6.5);
        const x1 = Number((cx - w * 0.5).toFixed(2));
        const y1 = Number((cy - d * 0.5).toFixed(2));
        const x2 = Number((cx + w * 0.5).toFixed(2));
        const y2 = Number((cy + d * 0.5).toFixed(2));
        const wallT = act.wallTex || selectedWallTex;
        const flatT = act.flatTex || selectedFlatTex;

        nextSectors.push({
          id: newSecId,
          floorHeight: floorH,
          ceilHeight: ceilH,
          floorTexture: flatT,
          ceilTexture: nextConfig.skyTexture || outer.ceilTexture || "SKY_ROBLOX",
          lightLevel: 245,
        });
        nextLinedefs.push(
          { id: `ai_${newSecId}_n`, x1, y1, x2, y2: y1, frontSectorId: outer.id, backSectorId: newSecId, isTwoSided: true, lowerTexture: wallT, middleTexture: wallT, blocking: false },
          { id: `ai_${newSecId}_e`, x1: x2, y1, x2, y2, frontSectorId: outer.id, backSectorId: newSecId, isTwoSided: true, lowerTexture: wallT, middleTexture: wallT, blocking: false },
          { id: `ai_${newSecId}_s`, x1: x2, y1: y2, x2: x1, y2, frontSectorId: outer.id, backSectorId: newSecId, isTwoSided: true, lowerTexture: wallT, middleTexture: wallT, blocking: false },
          { id: `ai_${newSecId}_w`, x1, y1: y2, x2: x1, y2: y1, frontSectorId: outer.id, backSectorId: newSecId, isTwoSided: true, lowerTexture: wallT, middleTexture: wallT, blocking: false }
        );
        nextSelectedSector = newSecId;
        appliedNotes.push(act.label || "Plataforma 3D");
      } else if (act.type === "add_stairs") {
        const steps = Math.max(3, Math.min(12, act.steps ?? 6));
        const startId = Math.max(0, ...nextSectors.map((s) => s.id)) + 1;
        const sx = Number((act.x ?? basePx + 2.0).toFixed(2));
        const sy = Number((act.y ?? basePy - 0.5).toFixed(2));
        const parentSec = findSectorAtPoint(sx, sy, tracedSectors) || nextSectors[0] || DEFAULT_FALLBACK_SECTOR;
        const stepH = Number((((act.endHeight ?? 1.5) - (act.startHeight ?? 0)) / steps).toFixed(2));
        const resStair = generateDoomStaircase(
          sx,
          sy,
          1,
          0,
          steps,
          1.6,
          0.55,
          act.startHeight ?? 0,
          stepH,
          6.5,
          "STEP1",
          selectedFlatTex,
          parentSec.id,
          undefined,
          startId
        );
        nextSectors = [...nextSectors, ...resStair.sectors];
        nextLinedefs = [...nextLinedefs, ...resStair.linedefs];
        if (resStair.sectors.length > 0) nextSelectedSector = resStair.sectors[0].id;
        appliedNotes.push(`Escalera (${steps} peldaños)`);
      } else if (act.type === "add_voxel") {
        const count = Math.max(1, Math.min(12, act.count ?? 1));
        const spacing = act.spacing ?? 1.1;
        for (let i = 0; i < count; i++) {
          const vx = Number((act.x ?? basePx + 1.2 + i * spacing).toFixed(2));
          const vy = Number((act.y ?? basePy).toFixed(2));
          const groundZ = findSectorAtPoint(vx, vy, tracedSectors)?.floorHeight ?? 0;
          nextVoxels.push({
            id: `ai_vox_${Date.now()}_${i}`,
            voxelId: act.voxelId,
            x: vx,
            y: vy,
            z: groundZ,
            yaw: 0,
            scale: 1,
          });
        }
        appliedNotes.push(`${count}× objeto`);
      } else if (act.type === "add_model") {
        const count = Math.max(1, Math.min(8, act.count ?? 1));
        for (let i = 0; i < count; i++) {
          const mx = Number((act.x ?? basePx + 2.2 + i * 1.4).toFixed(2));
          const my = Number((act.y ?? basePy + (i % 2 === 0 ? 0.5 : -0.5)).toFixed(2));
          const groundZ = findSectorAtPoint(mx, my, tracedSectors)?.floorHeight ?? 0;
          nextModels.push({
            id: `ai_mdl_${Date.now()}_${i}`,
            modelId: act.modelId,
            x: mx,
            y: my,
            z: groundZ,
            yaw: 180,
            animation: "idle",
            scale: 1,
          });
        }
        appliedNotes.push(`${count}× modelo 3D`);
      } else if (act.type === "paint_material") {
        if (act.scope === "all") {
          nextSectors = nextSectors.map((s) => ({ ...s, floorTexture: act.flatTex }));
          nextLinedefs = nextLinedefs.map((l) => ({
            ...l,
            middleTexture: act.wallTex,
            lowerTexture: act.wallTex,
          }));
        } else {
          nextSectors = nextSectors.map((s) =>
            s.id === nextSelectedSector ? { ...s, floorTexture: act.flatTex } : s
          );
          nextLinedefs = nextLinedefs.map((l) =>
            l.backSectorId === nextSelectedSector || l.frontSectorId === nextSelectedSector
              ? { ...l, middleTexture: act.wallTex, lowerTexture: act.wallTex }
              : l
          );
        }
        appliedNotes.push(`Material ${act.flatTex}`);
      } else if (act.type === "set_sky_camera") {
        if (act.skyTexture) {
          nextConfig.skyTexture = act.skyTexture;
          nextSectors = nextSectors.map((s) =>
            s.ceilTexture.startsWith("SKY") ? { ...s, ceilTexture: act.skyTexture! } : s
          );
        }
        if (act.cameraMode) nextConfig.cameraMode = act.cameraMode;
        if (act.gameMode) nextConfig.gameMode = act.gameMode;
        appliedNotes.push("Ambiente 3D actualizado");
      } else if (act.type === "build_template") {
        const startId = Math.max(0, ...nextSectors.map((s) => s.id)) + 1;
        const parentSec = nextSectors[0] || DEFAULT_FALLBACK_SECTOR;
        const stair = generateDoomStaircase(
          basePx + 1.5,
          basePy,
          1,
          0,
          5,
          1.8,
          0.55,
          0,
          0.25,
          6.5,
          "STEP1",
          "STUD_FLOOR_BLUE",
          parentSec.id,
          undefined,
          startId
        );
        const platId = startId + stair.sectors.length + 1;
        const px = Number((basePx + 4.8).toFixed(2));
        const py = Number(basePy.toFixed(2));
        nextSectors = [
          ...nextSectors,
          ...stair.sectors,
          {
            id: platId,
            floorHeight: 1.25,
            ceilHeight: 6.5,
            floorTexture: act.template === "arena_pelea" ? "DOJO_TATAMI" : "MARBLE_GOLD",
            ceilTexture: nextConfig.skyTexture || "SKY_ROBLOX",
            lightLevel: 245,
          },
        ];
        nextLinedefs = [
          ...nextLinedefs,
          ...stair.linedefs,
          { id: `tpl_${platId}_n`, x1: px - 1.5, y1: py - 1.5, x2: px + 1.5, y2: py - 1.5, frontSectorId: parentSec.id, backSectorId: platId, isTwoSided: true, lowerTexture: "STUD_GOLD", middleTexture: "STUD_GOLD", blocking: false },
          { id: `tpl_${platId}_e`, x1: px + 1.5, y1: py - 1.5, x2: px + 1.5, y2: py + 1.5, frontSectorId: parentSec.id, backSectorId: platId, isTwoSided: true, lowerTexture: "STUD_GOLD", middleTexture: "STUD_GOLD", blocking: false },
          { id: `tpl_${platId}_s`, x1: px + 1.5, y1: py + 1.5, x2: px - 1.5, y2: py + 1.5, frontSectorId: parentSec.id, backSectorId: platId, isTwoSided: true, lowerTexture: "STUD_GOLD", middleTexture: "STUD_GOLD", blocking: false },
          { id: `tpl_${platId}_w`, x1: px - 1.5, y1: py + 1.5, x2: px - 1.5, y2: py - 1.5, frontSectorId: parentSec.id, backSectorId: platId, isTwoSided: true, lowerTexture: "STUD_GOLD", middleTexture: "STUD_GOLD", blocking: false },
        ];
        for (let i = 0; i < 4; i++) {
          nextVoxels.push({
            id: `tpl_coin_${Date.now()}_${i}`,
            voxelId: "voxel_coin",
            x: Number((basePx + 1.8 + i * 0.85).toFixed(2)),
            y: py,
            z: Number((0.25 + i * 0.25).toFixed(2)),
            yaw: 0,
            scale: 1,
          });
        }
        nextModels.push({
          id: `tpl_goal_${Date.now()}`,
          modelId: act.template === "arena_pelea" ? "samurai_fighter" : "trophy_star",
          x: px,
          y: py,
          z: 1.25,
          yaw: 180,
          animation: "idle",
          scale: 1,
        });
        nextSelectedSector = platId;
        appliedNotes.push("Circuito 3D añadido");
      }
    }

    setSectors(nextSectors);
    setLinedefs(nextLinedefs);
    setPlacedVoxels(nextVoxels);
    setPlacedModels(nextModels);
    setGameConfig(nextConfig);
    setSelectedSectorId(nextSelectedSector);
    showToast(`IA 3D aplicada: ${appliedNotes.join(" · ")}`);
    onConsumeAiActionBatch?.();
  }, [
    pendingAiActionBatch,
    onConsumeAiActionBatch,
    pushUndoSnapshot,
    entities,
    sectors,
    linedefs,
    placedVoxels,
    placedModels,
    gameConfig,
    selectedSectorId,
    tracedSectors,
    selectedWallTex,
    selectedFlatTex,
  ]);

  const walkTickRef = useRef<number>(0);

  // Keep live 3D overlay ref synced without restarting the animation frame loop
  useEffect(() => {
    if (viewMode !== "visual3d" && viewMode !== "split") {
      editorOverlayRef.current = { enabled: false };
      return;
    }
    let hoverCellX: number | undefined;
    let hoverCellY: number | undefined;
    let hoverBaseZ = 0;

    if (hoverPick && threeTool !== "look") {
      const sz = threeTool === "lego_actor" ? 0.5 : legoSize;
      hoverCellX = Math.floor(hoverPick.worldX / sz) * sz + sz * 0.5;
      hoverCellY = Math.floor(hoverPick.worldY / sz) * sz + sz * 0.5;
      const under = findSectorAtPoint(hoverCellX, hoverCellY, tracedSectors);
      hoverBaseZ = under?.floorHeight ?? Math.max(0, hoverPick.worldZ || 0);
    }

    const hoverColor =
      threeTool === "erase_3d"
        ? "#ef4444"
        : threeTool === "paint_3d"
        ? "#f59e0b"
        : threeTool === "sculpt_3d"
        ? "#a855f7"
        : threeTool === "lego_actor"
        ? "#22c55e"
        : "#38bdf8";

    editorOverlayRef.current = {
      enabled: true,
      hoverCellX,
      hoverCellY,
      hoverBaseZ,
      blockSize: threeTool === "lego_actor" ? 0.75 : legoSize,
      blockHeight: threeTool === "lego_actor" ? 0.85 : legoStepHeight,
      hoverColor,
      showCursorBox: Boolean(hoverPick && threeTool !== "look"),
      selectedSectorId,
      selectedLineId,
    };
  }, [
    viewMode,
    hoverPick,
    threeTool,
    legoSize,
    legoStepHeight,
    tracedSectors,
    selectedSectorId,
    selectedLineId,
  ]);

  // Undo last level edit cleanly
  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) {
      showToast("No hay más pasos para deshacer");
      return;
    }
    const prev = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    setUndoCount(undoStackRef.current.length);
    setSectors(prev.sectors);
    setLinedefs(prev.linedefs);
    setEntities(prev.entities);
    setPlacedModels(prev.placedModels);
    setPlacedVoxels(prev.placedVoxels);
    setLights(prev.lights);
    userEditedRef.current = true;
    pendingCodeSyncRef.current.dirty = true;
    showToast("Cambio deshecho");
  }, []);

  useEffect(() => {
    const onUndoKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        const el = e.target as HTMLElement | null;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onUndoKey);
    return () => window.removeEventListener("keydown", onUndoKey);
  }, [handleUndo]);

  // Live 3D Render Loop
  useEffect(() => {
    if (viewMode === "map2d" || viewMode === "code") return;

    let active = true;
    let syncCounter = 0;
    const loop = () => {
      if (!active) return;

      let { x, y, z, angle, pitch } = cam3DRef.current;
      const rad = (angle * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);
      const speed = 0.085;
      const rotSpeed = 2.6;

      let moved = false;
      if (keysDownRef.current["arrowleft"]) { angle -= rotSpeed; moved = true; }
      if (keysDownRef.current["arrowright"]) { angle += rotSpeed; moved = true; }
      if (keysDownRef.current["w"] || keysDownRef.current["arrowup"]) {
        x += cosA * speed;
        y += sinA * speed;
        moved = true;
      }
      if (keysDownRef.current["s"] || keysDownRef.current["arrowdown"]) {
        x -= cosA * speed;
        y -= sinA * speed;
        moved = true;
      }
      if (keysDownRef.current["a"]) {
        x += sinA * speed;
        y -= cosA * speed;
        moved = true;
      }
      if (keysDownRef.current["d"]) {
        x -= sinA * speed;
        y += cosA * speed;
        moved = true;
      }

      if ((keysDownRef.current[" "] || keysDownRef.current["space"]) && previewJumpRef.current.airZ <= 0.001) {
        previewJumpRef.current.velZ = 0.09;
      }
      if (previewJumpRef.current.airZ > 0 || previewJumpRef.current.velZ > 0) {
        previewJumpRef.current.airZ += previewJumpRef.current.velZ;
        previewJumpRef.current.velZ -= 0.0062;
        if (previewJumpRef.current.airZ <= 0) {
          previewJumpRef.current.airZ = 0;
          previewJumpRef.current.velZ = 0;
        }
      }

      if (moved) walkTickRef.current += 0.16;

      // Exact smallest-area point-in-polygon lookup (nested platforms & pools resolve accurately!)
      const sectorUnderCam = findSectorAtPoint(x, y, tracedSectors);
      const fallbackFloor = sectors.find((s) => s.id === selectedSectorId)?.floorHeight ?? 0;
      const targetZ = (sectorUnderCam?.floorHeight ?? fallbackFloor) + previewJumpRef.current.airZ;
      z += (targetZ - z) * 0.25;

      cam3DRef.current = { x, y, z, angle, pitch };
      syncCounter++;
      if (moved && syncCounter % 4 === 0) {
        setCam3D({ x, y, z, angle, pitch });
      }

      if (visual3DCanvasRef.current) {
        const ctx = visual3DCanvasRef.current.getContext("2d");
        if (ctx) {
          renderDoom2PolygonWorld(
            ctx,
            visual3DCanvasRef.current.width,
            visual3DCanvasRef.current.height,
            cam3DRef.current,
            linedefs,
            sectors,
            entities,
            placedModels,
            lights,
            walkTickRef.current,
            gameConfig.startingWeapon,
            0,
            placedVoxels,
            {
              showHUD: false,
              showAutomap: show3DRadar,
              skyTexture: gameConfig.skyTexture,
              cameraMode: gameConfig.cameraMode,
              playerModelId: gameConfig.playerModelId,
              editorOverlay: editorOverlayRef.current,
            }
          );
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [
    viewMode,
    linedefs,
    sectors,
    tracedSectors,
    entities,
    placedModels,
    lights,
    placedVoxels,
    selectedSectorId,
    gameConfig.startingWeapon,
    gameConfig.skyTexture,
    gameConfig.cameraMode,
    gameConfig.playerModelId,
    show3DRadar,
  ]);

  // 2D Blueprint Canvas Draw
  const redraw2DMap = useCallback(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#0c0f17";
    ctx.fillRect(0, 0, w, h);

    const scale = 24 * zoomFactor;
    const stepPx = Math.max(8, (gridSnap / 16) * scale);

    // 1. Adaptive Grid
    ctx.save();
    ctx.strokeStyle = "#172033";
    ctx.lineWidth = 1;
    const startGridX = ((panOffset.x % stepPx) + stepPx) % stepPx - stepPx;
    for (let gx = startGridX; gx < w; gx += stepPx) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    const startGridY = ((panOffset.y % stepPx) + stepPx) % stepPx - stepPx;
    for (let gy = startGridY; gy < h; gy += stepPx) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Origin crosshair (0,0)
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(panOffset.x - 10, panOffset.y);
    ctx.lineTo(panOffset.x + 10, panOffset.y);
    ctx.moveTo(panOffset.x, panOffset.y - 10);
    ctx.lineTo(panOffset.x, panOffset.y + 10);
    ctx.stroke();

    // 2. Sector Floor Height Badges
    sectors.forEach((sec) => {
      const secLines = linedefs.filter((l) => l.frontSectorId === sec.id || l.backSectorId === sec.id);
      if (secLines.length > 0) {
        let cx = 0;
        let cy = 0;
        let count = 0;
        secLines.forEach((l) => {
          cx += l.x1 + l.x2;
          cy += l.y1 + l.y2;
          count += 2;
        });
        cx = (cx / count) * scale + panOffset.x;
        cy = (cy / count) * scale + panOffset.y;

        ctx.fillStyle = sec.id === selectedSectorId ? "#7C2D48" : "rgba(30, 41, 59, 0.88)";
        ctx.strokeStyle = sec.id === selectedSectorId ? "#fbcfe8" : "#475569";
        ctx.lineWidth = 1;
        drawRoundedRectPath(ctx, cx - 26, cy - 10, 52, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`S${sec.id}:${sec.floorHeight}`, cx, cy);
      }
    });

    // 3. Linedefs (White 1-sided, Green 2-sided portal, Orange stairs)
    linedefs.forEach((line) => {
      const sx1 = line.x1 * scale + panOffset.x;
      const sy1 = line.y1 * scale + panOffset.y;
      const sx2 = line.x2 * scale + panOffset.x;
      const sy2 = line.y2 * scale + panOffset.y;

      const isSelected = selectedLineId === String(line.id);
      const isStair = line.lowerTexture === "STEP1" || line.lowerTexture === "STEP2";

      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);

      if (isSelected) {
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3.5;
      } else if (isStair) {
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 2.5;
      } else if (line.isTwoSided) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = "#f1f5f9";
        ctx.lineWidth = 2.5;
      }
      ctx.stroke();

      // Normal tick
      const midX = (sx1 + sx2) / 2;
      const midY = (sy1 + sy2) / 2;
      const dx = sx2 - sx1;
      const dy = sy2 - sy1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(midX + nx * 5, midY + ny * 5);
      ctx.strokeStyle = isSelected ? "#facc15" : ctx.strokeStyle;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 4A. Polyline Preview
    if (polyVertices.length > 0) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      polyVertices.forEach((v, idx) => {
        const vx = v.x * scale + panOffset.x;
        const vy = v.y * scale + panOffset.y;
        if (idx === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      });
      ctx.lineTo(cursorWorldCoords.x * scale + panOffset.x, cursorWorldCoords.y * scale + panOffset.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4B. 2-Tap Line Preview
    if (currentTool === "line" && lineStartPoint) {
      const sx1 = lineStartPoint.x * scale + panOffset.x;
      const sy1 = lineStartPoint.y * scale + panOffset.y;
      const sx2 = cursorWorldCoords.x * scale + panOffset.x;
      const sy2 = cursorWorldCoords.y * scale + panOffset.y;

      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(sx1, sy1, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Vertices
    const drawnVerts = new Set<string>();
    linedefs.forEach((l) => {
      [
        { x: l.x1, y: l.y1, id: `${l.x1}_${l.y1}` },
        { x: l.x2, y: l.y2, id: `${l.x2}_${l.y2}` },
      ].forEach((v) => {
        if (!drawnVerts.has(v.id)) {
          drawnVerts.add(v.id);
          const vx = v.x * scale + panOffset.x;
          const vy = v.y * scale + panOffset.y;
          const isSelected = selectedVertexId === v.id;

          ctx.fillStyle = isSelected ? "#ef4444" : "#ffffff";
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(vx, vy, isSelected ? 5.5 : 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });
    });

    // 6. Things (Player, Monsters, Barrels, Pickups)
    entities.forEach((ent, idx) => {
      const ex = (ent.x / 64) * scale + panOffset.x;
      const ey = (ent.y / 64) * scale + panOffset.y;
      const isSelected = selectedThingIdx === idx;

      ctx.save();
      ctx.translate(ex, ey);
      if (ent.type === "player") {
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#facc15" : "#0f172a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(0, -4);
        ctx.lineTo(2, 0);
        ctx.lineTo(0, 4);
        ctx.closePath();
        ctx.fill();
      } else if (ent.type === "monster") {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#facc15" : "#0f172a";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (ent.type === "barrel") {
        ctx.fillStyle = "#15803d";
        ctx.fillRect(-6, -6, 12, 12);
        ctx.strokeStyle = isSelected ? "#facc15" : "#22c55e";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-6, -6, 12, 12);
      } else {
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-5, -5, 10, 10);
      }
      ctx.restore();
    });

    // 7. 3D Models (Enemy AI, Goal, Allies)
    placedModels.forEach((mod, idx) => {
      const mx = mod.x * scale + panOffset.x;
      const my = mod.y * scale + panOffset.y;
      const st = inferPlacedModelStats(mod);
      const isSelected = selectedModelIdx === idx;
      ctx.fillStyle = st.role === "enemy" ? "#ef4444" : st.role === "goal" ? "#eab308" : "#a855f7";
      ctx.beginPath();
      ctx.arc(mx, my, isSelected ? 10 : 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#facc15" : "#ffffff";
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 7.5px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(st.role === "enemy" ? "IA" : st.role === "goal" ? "★" : "3D", mx, my + 0.5);
      ctx.fillStyle = isSelected ? "#fef08a" : "#e2e8f0";
      ctx.font = "bold 8px sans-serif";
      ctx.fillText(st.name.slice(0, 14), mx, my + 16);
    });

    // 8. 3D Voxels
    placedVoxels.forEach((vox, idx) => {
      const vx = vox.x * scale + panOffset.x;
      const vy = vox.y * scale + panOffset.y;
      const isSelected = selectedVoxelIdx === idx;
      ctx.save();
      ctx.translate(vx, vy);
      ctx.fillStyle = isSelected ? "#facc15" : "#06b6d4";
      ctx.strokeStyle = isSelected ? "#ffffff" : "#0891b2";
      ctx.lineWidth = isSelected ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, -4);
      ctx.lineTo(0, 0);
      ctx.lineTo(-7, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSelected ? "#ca8a04" : "#0e7490";
      ctx.fillRect(-7, -4, 14, 10);
      ctx.strokeRect(-7, -4, 14, 10);

      ctx.fillStyle = isSelected ? "#fef08a" : "#cbd5e1";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(vox.voxelId.replace("voxel_", ""), 0, 16);
      ctx.restore();
    });

    // 9. 3D Camera Frustum Indicator
    const cx = cam3D.x * scale + panOffset.x;
    const cy = cam3D.y * scale + panOffset.y;
    const camRad = (cam3D.angle * Math.PI) / 180;
    const fovHalf = ((54 / 2) * Math.PI) / 180;
    const rayLen = 38;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    ctx.fillStyle = "rgba(56, 189, 248, 0.20)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(camRad - fovHalf) * rayLen, cy + Math.sin(camRad - fovHalf) * rayLen);
    ctx.arc(cx, cy, rayLen, camRad - fovHalf, camRad + fovHalf);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }, [
    zoomFactor,
    panOffset,
    gridSnap,
    sectors,
    linedefs,
    entities,
    placedModels,
    selectedModelIdx,
    placedVoxels,
    selectedVoxelIdx,
    polyVertices,
    currentTool,
    lineStartPoint,
    selectedLineId,
    selectedVertexId,
    selectedSectorId,
    selectedThingIdx,
    cursorWorldCoords,
    cam3D,
  ]);

  useEffect(() => {
    redraw2DMapRef.current = redraw2DMap;
    redraw2DMap();
  }, [redraw2DMap]);

  useEffect(() => {
    const syncMapSize = () => {
      const container = mapContainerRef.current;
      const canvas = mapCanvasRef.current;
      if (!container || !canvas) return;
      const w = Math.max(220, Math.floor(container.clientWidth));
      const h = Math.max(180, Math.floor(container.clientHeight));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        redraw2DMapRef.current?.();
        if (!initialFitDoneRef.current) {
          initialFitDoneRef.current = true;
          fitMapToView();
        }
      }
    };
    const sync3DSize = () => {
      const container = visual3DContainerRef.current;
      const canvas = visual3DCanvasRef.current;
      if (!container || !canvas) return;
      const cw = Math.max(220, container.clientWidth);
      const ch = Math.max(180, container.clientHeight);
      const scaleDown = Math.min(1, 640 / cw);
      const w = Math.max(220, Math.floor(cw * scaleDown));
      const h = Math.max(180, Math.floor(ch * scaleDown));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    syncMapSize();
    sync3DSize();
    const ro = new ResizeObserver(() => {
      syncMapSize();
      sync3DSize();
    });
    if (mapContainerRef.current) ro.observe(mapContainerRef.current);
    if (visual3DContainerRef.current) ro.observe(visual3DContainerRef.current);
    return () => ro.disconnect();
  }, [viewMode, mobileSheetTab, fitMapToView]);

  // Coordinate helpers
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return { mx: 0, my: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      mx: (clientX - rect.left) * scaleX,
      my: (clientY - rect.top) * scaleY,
    };
  };

  const toWorldCoords = (mx: number, my: number) => {
    const scale = 24 * zoomFactor;
    let wx = (mx - panOffset.x) / scale;
    let wy = (my - panOffset.y) / scale;
    if (autoSnap) {
      const snapUnit = gridSnap / 16;
      wx = Math.round(wx / snapUnit) * snapUnit;
      wy = Math.round(wy / snapUnit) * snapUnit;
    }
    return { wx: Number(wx.toFixed(2)), wy: Number(wy.toFixed(2)) };
  };

  // Selection action at world coordinate (triggered on tap/click without drag)
  const performSelectAt = (wx: number, wy: number) => {
    // 1. 3D Model click (Enemy IA / Goal / Prop)
    for (let i = 0; i < placedModels.length; i++) {
      const m = placedModels[i];
      if (Math.hypot(m.x - wx, m.y - wy) < 0.75) {
        setSelectedModelIdx(i);
        setSelectedVoxelIdx(null);
        setSelectedLineId(null);
        setSelectedVertexId(null);
        setSelectedThingIdx(null);
        setInspectorTab("sector");
        const st = inferPlacedModelStats(m);
        showToast(`Modelo 3D seleccionado: ${st.name}`);
        return;
      }
    }

    // 2. Voxel click
    for (let i = 0; i < placedVoxels.length; i++) {
      const v = placedVoxels[i];
      if (Math.hypot(v.x - wx, v.y - wy) < 0.7) {
        setSelectedVoxelIdx(i);
        setSelectedModelIdx(null);
        setSelectedLineId(null);
        setSelectedVertexId(null);
        setSelectedThingIdx(null);
        setInspectorTab("voxels");
        return;
      }
    }

    // 3. Entity click
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (Math.hypot(ent.x / 64 - wx, ent.y / 64 - wy) < 0.65) {
        setSelectedThingIdx(i);
        setSelectedModelIdx(null);
        setSelectedLineId(null);
        setSelectedVertexId(null);
        setSelectedVoxelIdx(null);
        showToast(`Entidad seleccionada: ${ent.name || ent.type}`);
        return;
      }
    }

    // 4. Vertex click
    for (const l of linedefs) {
      if (Math.hypot(l.x1 - wx, l.y1 - wy) < 0.45) {
        setSelectedVertexId(`${l.x1}_${l.y1}`);
        setSelectedModelIdx(null);
        setSelectedLineId(null);
        setSelectedVoxelIdx(null);
        setSelectedThingIdx(null);
        return;
      }
      if (Math.hypot(l.x2 - wx, l.y2 - wy) < 0.45) {
        setSelectedVertexId(`${l.x2}_${l.y2}`);
        setSelectedModelIdx(null);
        setSelectedLineId(null);
        setSelectedVoxelIdx(null);
        setSelectedThingIdx(null);
        return;
      }
    }

    // 5. Linedef click
    for (const l of linedefs) {
      const A = wx - l.x1;
      const B = wy - l.y1;
      const C = l.x2 - l.x1;
      const D = l.y2 - l.y1;
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      const param = lenSq !== 0 ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
      const xx = l.x1 + param * C;
      const yy = l.y1 + param * D;
      if (Math.hypot(wx - xx, wy - yy) < 0.45) {
        setSelectedLineId(String(l.id));
        setSelectedSectorId(l.frontSectorId);
        setSelectedModelIdx(null);
        setSelectedVertexId(null);
        setSelectedVoxelIdx(null);
        setSelectedThingIdx(null);
        setInspectorTab("sector");
        return;
      }
    }

    // 6. Exact innermost sector containment lookup
    const exactSec = findSectorAtPoint(wx, wy, tracedSectors);
    if (exactSec) {
      setSelectedSectorId(exactSec.id);
      setSelectedLineId(null);
      setSelectedModelIdx(null);
      setInspectorTab("sector");
      return;
    }

    // 7. Sector centroid fallback
    let closestSec: number | null = null;
    let minD = 3.0;
    for (const sec of sectors) {
      const secLines = linedefs.filter((l) => l.frontSectorId === sec.id || l.backSectorId === sec.id);
      if (secLines.length === 0) continue;
      let cx = 0;
      let cy = 0;
      secLines.forEach((l) => {
        cx += (l.x1 + l.x2) / 2;
        cy += (l.y1 + l.y2) / 2;
      });
      cx /= secLines.length;
      cy /= secLines.length;
      const d = Math.hypot(cx - wx, cy - wy);
      if (d < minD) {
        minD = d;
        closestSec = sec.id;
      }
    }
    if (closestSec !== null) {
      setSelectedSectorId(closestSec);
      setSelectedLineId(null);
      setSelectedModelIdx(null);
      setInspectorTab("sector");
    }
  };

  // Mouse wheel zoom-to-cursor on 2D canvas
  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const { mx, my } = getCanvasCoords(e.clientX, e.clientY);
    const oldScale = 24 * zoomFactor;
    const worldX = (mx - panOffset.x) / oldScale;
    const worldY = (my - panOffset.y) / oldScale;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nextZoom = Math.max(0.25, Math.min(4.0, Number((zoomFactor * factor).toFixed(2))));
    const newScale = 24 * nextZoom;

    setZoomFactor(nextZoom);
    setPanOffset({
      x: Math.round(mx - worldX * newScale),
      y: Math.round(my - worldY * newScale),
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch + pan
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values()) as Array<{ x: number; y: number }>;
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStateRef.current = {
        dist,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
      panGestureRef.current.active = false;
      dragObjectRef.current = null;
      return;
    }

    const { mx, my } = getCanvasCoords(e.clientX, e.clientY);
    const { wx, wy } = toWorldCoords(mx, my);

    // Middle-click, Right-click, Alt+Drag, or Move tool => direct pan
    if (e.button === 1 || e.button === 2 || e.altKey || currentTool === "move") {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      panGestureRef.current = {
        active: true,
        mode: "immediate",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: panOffset.x,
        startPanY: panOffset.y,
        wx,
        wy,
        movedBeyondThreshold: false,
      };
      return;
    }

    if (currentTool === "select") {
      // Direct object drag-to-move if pointer starts on a Model, Voxel, or Entity
      const rawX = (mx - panOffset.x) / (24 * zoomFactor);
      const rawY = (my - panOffset.y) / (24 * zoomFactor);

      for (let i = 0; i < placedModels.length; i++) {
        if (Math.hypot(placedModels[i].x - rawX, placedModels[i].y - rawY) < 0.7) {
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
          setSelectedModelIdx(i);
          setSelectedVoxelIdx(null);
          setSelectedThingIdx(null);
          setSelectedLineId(null);
          setInspectorTab("sector");
          dragObjectRef.current = { kind: "model", idx: i };
          return;
        }
      }
      for (let i = 0; i < placedVoxels.length; i++) {
        if (Math.hypot(placedVoxels[i].x - rawX, placedVoxels[i].y - rawY) < 0.65) {
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
          setSelectedVoxelIdx(i);
          setSelectedModelIdx(null);
          setSelectedThingIdx(null);
          setSelectedLineId(null);
          setInspectorTab("voxels");
          dragObjectRef.current = { kind: "voxel", idx: i };
          return;
        }
      }
      for (let i = 0; i < entities.length; i++) {
        if (Math.hypot(entities[i].x / 64 - rawX, entities[i].y / 64 - rawY) < 0.65) {
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
          setSelectedThingIdx(i);
          setSelectedModelIdx(null);
          setSelectedVoxelIdx(null);
          setSelectedLineId(null);
          dragObjectRef.current = { kind: "entity", idx: i };
          return;
        }
      }

      // Otherwise smart drag-to-pan on empty map, or click-select sector/wall
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      panGestureRef.current = {
        active: true,
        mode: "pending_select",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: panOffset.x,
        startPanY: panOffset.y,
        wx,
        wy,
        movedBeyondThreshold: false,
      };
      return;
    }

    markEdited();

    if (currentTool === "move_cam") {
      setCam3D((prev) => ({ ...prev, x: wx, y: wy }));
      showToast(`Cámara 3D movida a (${wx}, ${wy})`);
      return;
    }

    if (currentTool === "voxel") {
      const secFloor = sectors.find((s) => s.id === selectedSectorId)?.floorHeight ?? 0;
      const newVoxel: DivMode8PlacedVoxel = {
        id: `vox_${Date.now()}`,
        voxelId: selectedVoxelType,
        x: wx,
        y: wy,
        z: secFloor,
        yaw: selectedVoxelYaw,
        scale: selectedVoxelScale,
      };
      setPlacedVoxels((prev) => [...prev, newVoxel]);
      setSelectedVoxelIdx(placedVoxels.length);
      showToast(`Vóxel "${selectedVoxelType.replace("voxel_", "")}" colocado`);
      return;
    }

    if (currentTool === "polyline") {
      if (polyVertices.length > 2) {
        const start = polyVertices[0];
        if (Math.hypot(start.x - wx, start.y - wy) < 0.7) {
          closePolygonAndCreateSector();
          return;
        }
      }
      setPolyVertices((prev) => [...prev, { x: wx, y: wy }]);
      return;
    }

    if (currentTool === "line") {
      if (!lineStartPoint) {
        setLineStartPoint({ x: wx, y: wy });
        showToast("Ahora toca el punto final de la pared");
      } else {
        if (Math.hypot(wx - lineStartPoint.x, wy - lineStartPoint.y) >= 0.25) {
          const newLine: DivDoomLinedef = {
            id: `line_${Date.now()}`,
            x1: lineStartPoint.x,
            y1: lineStartPoint.y,
            x2: wx,
            y2: wy,
            frontSectorId: selectedSectorId,
            isTwoSided: false,
            middleTexture: selectedWallTex,
            blocking: true,
          };
          setLinedefs((prev) => [...prev, newLine]);
          setSelectedLineId(String(newLine.id));
          showToast("Pared añadida al mapa");
        }
        setLineStartPoint(null);
      }
      return;
    }

    if (currentTool === "quickroom") {
      const half = 2;
      const x1 = Number((wx - half).toFixed(1));
      const y1 = Number((wy - half).toFixed(1));
      const x2 = Number((wx + half).toFixed(1));
      const y2 = Number((wy + half).toFixed(1));
      const newSecId = Math.max(0, ...sectors.map((s) => s.id)) + 1;

      setSectors((prev) => [
        ...prev,
        {
          id: newSecId,
          floorHeight: 0,
          ceilHeight: 1.5,
          floorTexture: selectedFlatTex,
          ceilTexture: "CEIL3_5",
          lightLevel: 200,
        },
      ]);
      setLinedefs((prev) => [
        ...prev,
        { id: `qr_${newSecId}_n`, x1, y1, x2, y2: y1, frontSectorId: newSecId, isTwoSided: false, middleTexture: selectedWallTex, blocking: true },
        { id: `qr_${newSecId}_e`, x1: x2, y1, x2, y2, frontSectorId: newSecId, isTwoSided: false, middleTexture: selectedWallTex, blocking: true },
        { id: `qr_${newSecId}_s`, x1: x2, y1: y2, x2: x1, y2, frontSectorId: newSecId, isTwoSided: false, middleTexture: selectedWallTex, blocking: true },
        { id: `qr_${newSecId}_w`, x1, y1: y2, x2: x1, y2: y1, frontSectorId: newSecId, isTwoSided: false, middleTexture: selectedWallTex, blocking: true },
      ]);
      setSelectedSectorId(newSecId);
      setInspectorTab("sector");
      showToast(`Sala #${newSecId} (4x4) creada en (${wx}, ${wy})`);
      return;
    }

    if (currentTool === "sector_fill") {
      const exactSec = findSectorAtPoint(wx, wy, tracedSectors);
      let bestSec = exactSec ? exactSec.id : selectedSectorId;
      if (!exactSec) {
        let minDist = Infinity;
        sectors.forEach((sec) => {
          const secLines = linedefs.filter((l) => l.frontSectorId === sec.id || l.backSectorId === sec.id);
          if (secLines.length === 0) return;
          const cx = secLines.reduce((acc, l) => acc + (l.x1 + l.x2) / 2, 0) / secLines.length;
          const cy = secLines.reduce((acc, l) => acc + (l.y1 + l.y2) / 2, 0) / secLines.length;
          const d = Math.hypot(cx - wx, cy - wy);
          if (d < minDist) {
            minDist = d;
            bestSec = sec.id;
          }
        });
      }
      setSelectedSectorId(bestSec);
      setSectors((prev) =>
        prev.map((s) =>
          s.id === bestSec
            ? selectedFlatTarget === "floor"
              ? { ...s, floorTexture: selectedFlatTex }
              : { ...s, ceilTexture: selectedFlatTex }
            : s
        )
      );
      showToast(`Textura ${selectedFlatTex} aplicada a Sector #${bestSec}`);
      return;
    }

    if (currentTool === "stairs") {
      setCursorWorldCoords({ x: wx, y: wy });
      setShowStairsDialog(true);
      return;
    }

    if (currentTool === "new_thing") {
      const secAtClick = findSectorAtPoint(wx, wy, tracedSectors);
      const groundAtClick = secAtClick?.floorHeight ?? sectors.find((s) => s.id === selectedSectorId)?.floorHeight ?? 0;
      if (selectedThingPreset.type === "player") {
        setEntities((prev) => [
          ...prev.filter((ent) => ent.type !== "player"),
          { id: `player_${Date.now()}`, type: "player", x: wx * 64, y: wy * 64, graph: 1, name: "Blox Player Start" },
        ]);
        setCam3D((prev) => ({ ...prev, x: wx, y: wy, z: groundAtClick }));
        showToast("Inicio del jugador reubicado");
      } else if (selectedThingPreset.type === "model3d") {
        const rawMod: DivMode8PlacedModel = {
          id: `model_${Date.now()}`,
          modelId: selectedThingPreset.modelId || "blox_knight",
          x: wx,
          y: wy,
          z: groundAtClick,
          yaw: 180,
          scale: 1.0,
          animation: "walk",
          name: selectedThingPreset.name,
          homeX: wx,
          homeY: wy,
        };
        const st = inferPlacedModelStats(rawMod);
        const enriched: DivMode8PlacedModel = {
          ...rawMod,
          role: st.role,
          hp: st.hp,
          maxHp: st.maxHp,
          speed: st.speed,
          damage: st.damage,
          patrolRadius: st.patrolRadius,
          name: st.name,
        };
        setPlacedModels((prev) => [...prev, enriched]);
        setSelectedModelIdx(placedModels.length);
        showToast(`Modelo 3D "${st.name}" añadido`);
      } else if (selectedThingPreset.type === "light") {
        setLights((prev) => [
          ...prev,
          { id: `l_${Date.now()}`, x: wx, y: wy, z: 1.1, radius: 7.5, r: 255, g: 195, b: 110, flicker: true },
        ]);
        showToast("Luz dinámica añadida");
      } else {
        setEntities((prev) => [
          ...prev,
          {
            id: `thing_${Date.now()}`,
            type:
              selectedThingPreset.type === "monster"
                ? "monster"
                : selectedThingPreset.type === "barrel"
                ? "barrel"
                : "treasure",
            x: wx * 64,
            y: wy * 64,
            graph: selectedThingPreset.type === "monster" ? 27 : selectedThingPreset.type === "barrel" ? 28 : 29,
            name: selectedThingPreset.name,
          },
        ]);
        showToast(`"${selectedThingPreset.name}" colocado en el mapa`);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Handle 2-finger touch pinch/pan
    if (activePointersRef.current.size === 2 && pinchStateRef.current) {
      const pts = Array.from(activePointersRef.current.values()) as Array<{ x: number; y: number }>;
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;

      const dMidX = midX - pinchStateRef.current.midX;
      const dMidY = midY - pinchStateRef.current.midY;
      const scaleRatio = pinchStateRef.current.dist > 10 ? dist / pinchStateRef.current.dist : 1;

      setPanOffset((prev) => ({ x: prev.x + dMidX, y: prev.y + dMidY }));
      if (Math.abs(scaleRatio - 1) > 0.02) {
        setZoomFactor((z) => Math.max(0.25, Math.min(3.5, Number((z * scaleRatio).toFixed(2)))));
      }

      pinchStateRef.current = { dist, midX, midY };
      return;
    }

    const { mx, my } = getCanvasCoords(e.clientX, e.clientY);
    const { wx, wy } = toWorldCoords(mx, my);

    if (dragObjectRef.current) {
      markEdited();
      const drag = dragObjectRef.current;
      const groundAtPos = findSectorAtPoint(wx, wy, tracedSectors)?.floorHeight ?? 0;
      if (drag.kind === "model") {
        setPlacedModels((prev) =>
          prev.map((m, i) => (i === drag.idx ? { ...m, x: wx, y: wy, z: groundAtPos, homeX: wx, homeY: wy } : m))
        );
      } else if (drag.kind === "voxel") {
        setPlacedVoxels((prev) =>
          prev.map((v, i) => (i === drag.idx ? { ...v, x: wx, y: wy, z: groundAtPos } : v))
        );
      } else if (drag.kind === "entity") {
        setEntities((prev) =>
          prev.map((ent, i) => (i === drag.idx ? { ...ent, x: wx * 64, y: wy * 64 } : ent))
        );
      }
      setCursorWorldCoords({ x: wx, y: wy });
      return;
    }

    if (panGestureRef.current.active) {
      const dx = e.clientX - panGestureRef.current.startClientX;
      const dy = e.clientY - panGestureRef.current.startClientY;
      if (panGestureRef.current.mode === "immediate" || Math.hypot(dx, dy) > 6) {
        panGestureRef.current.movedBeyondThreshold = true;
        setPanOffset({
          x: panGestureRef.current.startPanX + dx,
          y: panGestureRef.current.startPanY + dy,
        });
      }
      return;
    }

    setCursorWorldCoords({ x: wx, y: wy });
  };

  const get3DCanvasNdc = (clientX: number, clientY: number) => {
    const canvas = visual3DCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return null;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    return { ndcX, ndcY };
  };

  const findNestedBlockAtCell = (cx: number, cy: number): DivDoomSector | null => {
    for (const sec of sectors) {
      if (sec.id === 0) continue;
      const secLines = linedefs.filter((l) => l.backSectorId === sec.id || l.frontSectorId === sec.id);
      if (secLines.length < 3 || secLines.length > 8) continue;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const l of secLines) {
        minX = Math.min(minX, l.x1, l.x2);
        maxX = Math.max(maxX, l.x1, l.x2);
        minY = Math.min(minY, l.y1, l.y2);
        maxY = Math.max(maxY, l.y1, l.y2);
      }
      const bw = maxX - minX;
      const bh = maxY - minY;
      if (bw <= 2.3 && bh <= 2.3) {
        const midX = (minX + maxX) * 0.5;
        const midY = (minY + maxY) * 0.5;
        if (Math.hypot(midX - cx, midY - cy) < 0.42) {
          return sec;
        }
      }
    }
    return null;
  };

  const execute3DBuilderClick = (clientX: number, clientY: number, isAltOrShift: boolean) => {
    if (threeTool === "look") return;
    const ndc = get3DCanvasNdc(clientX, clientY);
    if (!ndc) return;
    const fallbackFloor = sectors.find((s) => s.id === selectedSectorId)?.floorHeight ?? 0;
    const hit = pickMode8ThreeSurface(ndc.ndcX, ndc.ndcY, fallbackFloor);
    if (!hit) return;

    if (threeTool === "lego_block") {
      markEdited();
      const sz = legoSize;
      const cx = Math.floor(hit.worldX / sz) * sz + sz * 0.5;
      const cy = Math.floor(hit.worldY / sz) * sz + sz * 0.5;
      const existingBlock = findNestedBlockAtCell(cx, cy);

      if (existingBlock) {
        const delta = isAltOrShift ? -legoStepHeight : legoStepHeight;
        const nextFloor = Number(Math.max(-1.0, existingBlock.floorHeight + delta).toFixed(2));
        setSectors((prev) =>
          prev.map((s) =>
            s.id === existingBlock.id
              ? {
                  ...s,
                  floorHeight: nextFloor,
                  ceilHeight: Math.max(s.ceilHeight, nextFloor + 2.5),
                  floorTexture: selectedFlatTex,
                }
              : s
          )
        );
        setLinedefs((prev) =>
          prev.map((l) =>
            l.backSectorId === existingBlock.id || l.frontSectorId === existingBlock.id
              ? { ...l, lowerTexture: selectedWallTex, middleTexture: selectedWallTex }
              : l
          )
        );
        setSelectedSectorId(existingBlock.id);
        showToast(`Bloque #${existingBlock.id} ajustado a ${nextFloor}m`);
        return;
      }

      const outer = findSectorAtPoint(cx, cy, tracedSectors) || sectors[0] || DEFAULT_FALLBACK_SECTOR;
      const x1 = Number((cx - sz * 0.5).toFixed(2));
      const y1 = Number((cy - sz * 0.5).toFixed(2));
      const x2 = Number((cx + sz * 0.5).toFixed(2));
      const y2 = Number((cy + sz * 0.5).toFixed(2));
      const newSecId = Math.max(0, ...sectors.map((s) => s.id)) + 1;
      const nextFloor = Number(((outer.floorHeight ?? 0) + legoStepHeight).toFixed(2));
      const nextCeil = Math.max(nextFloor + 3.0, outer.ceilHeight ?? 6.5);

      setSectors((prev) => [
        ...prev,
        {
          id: newSecId,
          floorHeight: nextFloor,
          ceilHeight: nextCeil,
          floorTexture: selectedFlatTex,
          ceilTexture: gameConfig.skyTexture || outer.ceilTexture || "SKY_ROBLOX",
          lightLevel: outer.lightLevel ?? 245,
        },
      ]);
      setLinedefs((prev) => [
        ...prev,
        { id: `lego_${newSecId}_n`, x1, y1, x2, y2: y1, frontSectorId: outer.id, backSectorId: newSecId, isTwoSided: true, lowerTexture: selectedWallTex, middleTexture: selectedWallTex, blocking: false },
        { id: `lego_${newSecId}_e`, x1: x2, y1, x2, y2, frontSectorId: outer.id, backSectorId: newSecId, isTwoSided: true, lowerTexture: selectedWallTex, middleTexture: selectedWallTex, blocking: false },
        { id: `lego_${newSecId}_s`, x1: x2, y1: y2, x2: x1, y2, frontSectorId: outer.id, backSectorId: newSecId, isTwoSided: true, lowerTexture: selectedWallTex, middleTexture: selectedWallTex, blocking: false },
        { id: `lego_${newSecId}_w`, x1, y1: y2, x2: x1, y2: y1, frontSectorId: outer.id, backSectorId: newSecId, isTwoSided: true, lowerTexture: selectedWallTex, middleTexture: selectedWallTex, blocking: false },
      ]);
      setSelectedSectorId(newSecId);
      setInspectorTab("sector");
      showToast(`Bloque 3D colocado (${nextFloor}m)`);
      return;
    }

    if (threeTool === "sculpt_3d") {
      const targetSecId =
        hit.sectorId ?? findSectorAtPoint(hit.worldX, hit.worldY, tracedSectors)?.id ?? selectedSectorId;
      const targetSec = sectors.find((s) => s.id === targetSecId);
      if (!targetSec) return;
      markEdited();
      const delta = isAltOrShift ? -legoStepHeight : legoStepHeight;
      const nextFloor = Number(Math.max(-1.5, Math.min(targetSec.ceilHeight - 1.2, targetSec.floorHeight + delta)).toFixed(2));
      setSectors((prev) => prev.map((s) => (s.id === targetSec.id ? { ...s, floorHeight: nextFloor } : s)));
      setSelectedSectorId(targetSec.id);
      showToast(`Sector #${targetSec.id}: suelo a ${nextFloor}m`);
      return;
    }

    if (threeTool === "paint_3d") {
      if (hit.kind === "wall" && hit.linedefId) {
        markEdited();
        setLinedefs((prev) =>
          prev.map((l) =>
            String(l.id) === String(hit.linedefId)
              ? {
                  ...l,
                  middleTexture: selectedWallTex,
                  lowerTexture: selectedWallTex,
                  upperTexture: l.upperTexture ? selectedWallTex : l.upperTexture,
                }
              : l
          )
        );
        setSelectedLineId(String(hit.linedefId));
        showToast(`Pared pintada con ${selectedWallTex}`);
        return;
      }
      const secId =
        hit.sectorId ?? findSectorAtPoint(hit.worldX, hit.worldY, tracedSectors)?.id ?? selectedSectorId;
      markEdited();
      const isCeil = hit.kind === "ceil";
      setSectors((prev) =>
        prev.map((s) =>
          s.id === secId
            ? isCeil
              ? { ...s, ceilTexture: selectedFlatTex }
              : { ...s, floorTexture: selectedFlatTex }
            : s
        )
      );
      setSelectedSectorId(secId);
      showToast(`${isCeil ? "Techo" : "Suelo"} #${secId} pintado con ${selectedFlatTex}`);
      return;
    }

    if (threeTool === "lego_actor") {
      markEdited();
      const ax = Number((Math.round(hit.worldX * 2) / 2).toFixed(2));
      const ay = Number((Math.round(hit.worldY * 2) / 2).toFixed(2));
      const groundZ = findSectorAtPoint(ax, ay, tracedSectors)?.floorHeight ?? Math.max(0, hit.worldZ || 0);

      if (selectedKidToy.kind === "player") {
        setEntities((prev) => [
          ...prev.filter((ent) => ent.type !== "player"),
          { id: `player_${Date.now()}`, type: "player", x: ax * 64, y: ay * 64, graph: 1, name: "Blox Runner" },
        ]);
        showToast(`Inicio del jugador en (${ax}, ${ay})`);
      } else if (selectedKidToy.kind === "voxel") {
        const newVox: DivMode8PlacedVoxel = {
          id: `vox_${Date.now()}`,
          voxelId: selectedKidToy.modelOrVoxelId,
          x: ax,
          y: ay,
          z: groundZ,
          yaw: 0,
          scale: 1,
        };
        setPlacedVoxels((prev) => [...prev, newVox]);
        setSelectedVoxelIdx(placedVoxels.length);
        showToast(`${selectedKidToy.label} añadido en 3D`);
      } else {
        const rawMod: DivMode8PlacedModel = {
          id: `model_${Date.now()}`,
          modelId: selectedKidToy.modelOrVoxelId,
          x: ax,
          y: ay,
          z: groundZ,
          yaw: 180,
          scale: 1.0,
          animation: selectedKidToy.modelOrVoxelId === "trophy_star" ? "idle" : "walk",
          name: selectedKidToy.label,
          homeX: ax,
          homeY: ay,
        };
        const st = inferPlacedModelStats(rawMod);
        setPlacedModels((prev) => [
          ...prev,
          {
            ...rawMod,
            role: st.role,
            hp: st.hp,
            maxHp: st.maxHp,
            speed: st.speed,
            damage: st.damage,
            patrolRadius: st.patrolRadius,
            name: st.name,
          },
        ]);
        setSelectedModelIdx(placedModels.length);
        showToast(`${selectedKidToy.label} colocado en 3D`);
      }
      return;
    }

    if (threeTool === "erase_3d") {
      if (hit.kind === "model" && hit.itemIndex !== undefined && placedModels[hit.itemIndex]) {
        markEdited();
        setPlacedModels((prev) => prev.filter((_, i) => i !== hit.itemIndex));
        setSelectedModelIdx(null);
        showToast("Personaje / Modelo eliminado");
        return;
      }
      if (hit.kind === "voxel" && hit.itemIndex !== undefined && placedVoxels[hit.itemIndex]) {
        markEdited();
        setPlacedVoxels((prev) => prev.filter((_, i) => i !== hit.itemIndex));
        setSelectedVoxelIdx(null);
        showToast("Objeto 3D eliminado");
        return;
      }
      const targetSecId =
        hit.sectorId ?? findSectorAtPoint(hit.worldX, hit.worldY, tracedSectors)?.id;
      if (targetSecId !== undefined && targetSecId !== 0 && sectors.length > 1) {
        markEdited();
        setSectors((prev) => prev.filter((s) => s.id !== targetSecId));
        setLinedefs((prev) => prev.filter((l) => l.frontSectorId !== targetSecId && l.backSectorId !== targetSecId));
        if (selectedSectorId === targetSecId) setSelectedSectorId(sectors[0]?.id ?? 0);
        showToast(`Bloque #${targetSecId} eliminado`);
      } else {
        showToast("El suelo base (#0) no se puede borrar");
      }
    }
  };

  // Drag & Drop Asset Placement / Painting onto 2D & 3D Level Editor Viewports
  const [canvasDropHint, setCanvasDropHint] = useState<string | null>(null);

  const placeDroppedAssetAtWorld = (
    payload: ReturnType<typeof parseDroppedAsset>,
    wx: number,
    wy: number,
    hit?: Mode8ThreePickHit | null
  ) => {
    if (!payload) return;
    markEdited();
    const groundZ = findSectorAtPoint(wx, wy, tracedSectors)?.floorHeight ?? 0;

    if (payload.kind === "model3d") {
      const ax = Number((Math.round(wx * 2) / 2).toFixed(2));
      const ay = Number((Math.round(wy * 2) / 2).toFixed(2));
      const rawMod: DivMode8PlacedModel = {
        id: `model_${Date.now()}`,
        modelId: payload.id,
        x: ax,
        y: ay,
        z: groundZ,
        yaw: 180,
        scale: payload.scale || 1.0,
        animation: "idle",
        name: payload.name,
        homeX: ax,
        homeY: ay,
      };
      const st = inferPlacedModelStats(rawMod);
      setPlacedModels((prev) => [
        ...prev,
        {
          ...rawMod,
          role: payload.role || st.role,
          hp: st.hp,
          maxHp: st.maxHp,
          speed: st.speed,
          damage: st.damage,
          patrolRadius: st.patrolRadius,
          name: payload.name || st.name,
        },
      ]);
      setSelectedModelIdx(placedModels.length);
      showToast(`Modelo "${payload.name}" colocado en (${ax}, ${ay})`);
      return;
    }

    if (payload.kind === "texture") {
      invalidateMode8ThreeTexture(payload.name);
      if (hit?.kind === "wall" && hit.linedefId) {
        setSelectedWallTex(payload.name);
        setLinedefs((prev) =>
          prev.map((l) =>
            String(l.id) === String(hit.linedefId)
              ? { ...l, middleTexture: payload.name, lowerTexture: payload.name }
              : l
          )
        );
        setSelectedLineId(String(hit.linedefId));
        showToast(`Pared pintada con ${payload.name}`);
        return;
      }

      if (!hit) {
        let bestLineId: string | null = null;
        let bestDist = 0.55;
        for (const l of linedefs) {
          const A = wx - l.x1;
          const B = wy - l.y1;
          const C = l.x2 - l.x1;
          const D = l.y2 - l.y1;
          const lenSq = C * C + D * D;
          const param = lenSq > 0 ? Math.max(0, Math.min(1, (A * C + B * D) / lenSq)) : 0;
          const dist = Math.hypot(wx - (l.x1 + param * C), wy - (l.y1 + param * D));
          if (dist < bestDist) {
            bestDist = dist;
            bestLineId = String(l.id);
          }
        }
        if (bestLineId && payload.texKind === "wall") {
          setSelectedWallTex(payload.name);
          setLinedefs((prev) =>
            prev.map((l) =>
              String(l.id) === bestLineId
                ? { ...l, middleTexture: payload.name, lowerTexture: payload.name }
                : l
            )
          );
          setSelectedLineId(bestLineId);
          showToast(`Pared pintada con ${payload.name}`);
          return;
        }
      }

      const secId =
        hit?.sectorId ?? findSectorAtPoint(wx, wy, tracedSectors)?.id ?? selectedSectorId;
      const isCeil = hit?.kind === "ceil";
      setSelectedFlatTex(payload.name);
      setSectors((prev) =>
        prev.map((s) =>
          s.id === secId
            ? isCeil
              ? { ...s, ceilTexture: payload.name }
              : { ...s, floorTexture: payload.name }
            : s
        )
      );
      setSelectedSectorId(secId);
      showToast(`${isCeil ? "Techo" : "Suelo"} #${secId} pintado con ${payload.name}`);
      return;
    }

    if (payload.kind === "fpg_sprite" || payload.kind === "fpg_package") {
      const spriteId =
        payload.kind === "fpg_sprite" ? payload.id : payload.firstSpriteId ?? fpg[0]?.id ?? 1;
      const spriteLabel = payload.kind === "fpg_sprite" ? payload.name : payload.filename;
      setEntities((prev) => [
        ...prev,
        {
          id: `spr_${Date.now()}`,
          type: "custom",
          x: wx * 64,
          y: wy * 64,
          graph: spriteId,
          name: spriteLabel,
          alive: true,
        },
      ]);
      showToast(`Sprite "${spriteLabel}" (#${spriteId}) añadido al nivel`);
    }
  };

  const handleViewportDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const active = getActiveDraggedAsset();
    if (!active && !e.dataTransfer.types.includes("application/x-wxdiv-asset") && !e.dataTransfer.types.includes("text/plain")) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (active?.kind === "model3d") {
      setCanvasDropHint(`Soltar modelo 3D "${active.name}"`);
    } else if (active?.kind === "texture") {
      setCanvasDropHint(`Aplicar textura "${active.name}"`);
    } else if (active?.kind === "fpg_sprite") {
      setCanvasDropHint(`Colocar sprite "${active.name}" (#${active.id})`);
    } else if (active?.kind === "fpg_package") {
      setCanvasDropHint(`Colocar recurso de ${active.filename}`);
    } else {
      setCanvasDropHint("Soltar activo en el nivel");
    }
  };

  const handleDropOn2DCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    setCanvasDropHint(null);
    const payload = parseDroppedAsset(e);
    if (!payload) return;
    e.preventDefault();
    const { mx, my } = getCanvasCoords(e.clientX, e.clientY);
    const { wx, wy } = toWorldCoords(mx, my);
    placeDroppedAssetAtWorld(payload, wx, wy, null);
  };

  const handleDropOn3DCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    setCanvasDropHint(null);
    const payload = parseDroppedAsset(e);
    if (!payload) return;
    e.preventDefault();
    const ndc = get3DCanvasNdc(e.clientX, e.clientY);
    const fallbackFloor = sectors.find((s) => s.id === selectedSectorId)?.floorHeight ?? 0;
    const hit = ndc ? pickMode8ThreeSurface(ndc.ndcX, ndc.ndcY, fallbackFloor) : null;
    if (hit) {
      placeDroppedAssetAtWorld(payload, hit.worldX, hit.worldY, hit);
    } else {
      const rad = (cam3DRef.current.angle * Math.PI) / 180;
      const wx = Number((cam3DRef.current.x + Math.cos(rad) * 3.0).toFixed(2));
      const wy = Number((cam3DRef.current.y + Math.sin(rad) * 3.0).toFixed(2));
      placeDroppedAssetAtWorld(payload, wx, wy, null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }

    if (dragObjectRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      dragObjectRef.current = null;
      return;
    }

    if (panGestureRef.current.active) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      if (panGestureRef.current.mode === "pending_select" && !panGestureRef.current.movedBeyondThreshold) {
        performSelectAt(panGestureRef.current.wx, panGestureRef.current.wy);
      }
      panGestureRef.current.active = false;
    }
  };

  // Touch D-Pad helper for 3D Walkthrough
  const bindHoldKey = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      keysDownRef.current[key] = true;
    },
    onPointerUp: () => { keysDownRef.current[key] = false; },
    onPointerLeave: () => { keysDownRef.current[key] = false; },
    onPointerCancel: () => { keysDownRef.current[key] = false; },
  });

  // Close Polyline -> New Sector + Linedefs
  const closePolygonAndCreateSector = () => {
    if (polyVertices.length < 3) return;
    markEdited();
    const newSecId = Math.max(0, ...sectors.map((s) => s.id)) + 1;
    const newSector: DivDoomSector = {
      id: newSecId,
      floorHeight: 0,
      ceilHeight: 1.4,
      floorTexture: selectedFlatTex,
      ceilTexture: "CEIL3_5",
      lightLevel: 195,
    };

    const newLines: DivDoomLinedef[] = [];
    for (let i = 0; i < polyVertices.length; i++) {
      const v1 = polyVertices[i];
      const v2 = polyVertices[(i + 1) % polyVertices.length];
      newLines.push({
        id: `poly_${newSecId}_${i}_${Date.now()}`,
        x1: v1.x,
        y1: v1.y,
        x2: v2.x,
        y2: v2.y,
        frontSectorId: newSecId,
        isTwoSided: false,
        middleTexture: selectedWallTex,
        blocking: true,
      });
    }

    setSectors((prev) => [...prev, newSector]);
    setLinedefs((prev) => [...prev, ...newLines]);
    setPolyVertices([]);
    setSelectedSectorId(newSecId);
    setInspectorTab("sector");
    setCurrentTool("select");
    showToast(`Sector poligonal #${newSecId} creado (${newLines.length} paredes)`);
  };

  const handleCreateStaircase = () => {
    markEdited();
    const res = generateDoomStaircase(
      cursorWorldCoords.x,
      cursorWorldCoords.y,
      1,
      0,
      stairSteps,
      stairWidth,
      stairLength,
      sectors.find((s) => s.id === selectedSectorId)?.floorHeight || 0,
      stairHeightDelta,
      1.6,
      stairTexture
    );
    setSectors((prev) => [...prev, ...res.sectors]);
    setLinedefs((prev) => [...prev, ...res.linedefs]);
    setShowStairsDialog(false);
    setCurrentTool("select");
    showToast(`Escalera de ${stairSteps} peldaños añadida`);
  };

  const handleFusePoints = () => {
    markEdited();
    const threshold = 0.25;
    const newLines = linedefs.map((l) => ({ ...l }));
    for (let i = 0; i < newLines.length; i++) {
      for (let j = i + 1; j < newLines.length; j++) {
        if (Math.hypot(newLines[i].x1 - newLines[j].x1, newLines[i].y1 - newLines[j].y1) < threshold) {
          newLines[j].x1 = newLines[i].x1;
          newLines[j].y1 = newLines[i].y1;
        }
        if (Math.hypot(newLines[i].x2 - newLines[j].x2, newLines[i].y2 - newLines[j].y2) < threshold) {
          newLines[j].x2 = newLines[i].x2;
          newLines[j].y2 = newLines[i].y2;
        }
      }
    }
    setLinedefs(newLines);
    showToast("Vértices soldados correctamente");
  };

  const handleFlipSelectedLine = () => {
    if (!selectedLineId) {
      showToast("Selecciona una pared primero");
      return;
    }
    markEdited();
    setLinedefs((prev) =>
      prev.map((l) =>
        String(l.id) === selectedLineId
          ? {
              ...l,
              x1: l.x2,
              y1: l.y2,
              x2: l.x1,
              y2: l.y1,
              frontSectorId: l.backSectorId !== undefined ? l.backSectorId : l.frontSectorId,
              backSectorId: l.isTwoSided ? l.frontSectorId : undefined,
            }
          : l
      )
    );
    showToast("Linedef invertida");
  };

  // Run Full Playable 3D Game + Menu directly!
  const handleLaunchAndSave = () => {
    userEditedRef.current = true;
    pendingCodeSyncRef.current.dirty = false;
    persistActiveDraft();
    try {
      if (onLaunchGameCode) {
        onLaunchGameCode(generatedDivCode, gameConfig.title);
        showToast("Juego 3D compilado y en ejecución");
        return;
      }

      if (onApplyFullCode) {
        onApplyFullCode(generatedDivCode, gameConfig.title);
      }

      if (runtime) {
        runtime.m8_set_doom_map(linedefs, sectors);
        runtime.m8_workers(4);
        runtime.m8_set_weapon(gameConfig.startingWeapon);
        if (runtime.m8[0]) {
          runtime.m8[0].engineMode = "doom2";
          runtime.m8[0].placedModels = placedModels;
          runtime.m8[0].placedVoxels = placedVoxels;
          runtime.m8[0].entities = entities;
          runtime.m8[0].lights = lights;
          runtime.m8[0].showAutomap = gameConfig.showHudAutomap;
          runtime.m8[0].cameraMode = gameConfig.cameraMode;
          runtime.m8[0].skyTexture = gameConfig.skyTexture;
          runtime.m8[0].playerModelId = gameConfig.playerModelId;
        }
      }
      showToast("Mapa transferido a Modo 8. ¡Ejecutando!");
      onApplyToRuntime?.();
    } catch (err) {
      console.error("[Mode8LevelEditor] Error al generar juego 3D:", err);
      showToast("Se protegió el editor tras un error al compilar");
    }
  };

  const handleSyncToCodeEditor = () => {
    userEditedRef.current = true;
    pendingCodeSyncRef.current.dirty = false;
    persistActiveDraft();
    if (onApplyFullCode) {
      onApplyFullCode(generatedDivCode, gameConfig.title);
      showToast("Código completo sincronizado en el Editor DIV");
    } else if (onInsertCode) {
      onInsertCode(generatedDivCode);
      showToast("Código insertado en el Editor DIV");
    }
  };

  const handleCopyDivCode = () => {
    navigator.clipboard?.writeText(generatedDivCode).catch(() => {});
    showToast("Código DIV copiado al portapapeles");
  };

  const handleLoadLevelData = (lvl: Mode8LevelData) => {
    markEdited();
    const validSectors =
      Array.isArray(lvl.sectors) && lvl.sectors.length > 0
        ? lvl.sectors.map((s, idx) => ({
            id: safeFinite(s.id, idx),
            floorHeight: safeFinite(s.floorHeight, 0),
            ceilHeight: safeFinite(s.ceilHeight, 1.5),
            floorTexture: s.floorTexture || "FLOOR4_8",
            ceilTexture: s.ceilTexture || "CEIL3_5",
            lightLevel: safeFinite(s.lightLevel, 190),
            special: s.special ? safeFinite(s.special, 0) : 0,
            tag: s.tag ? safeFinite(s.tag, 0) : 0,
          }))
        : [DEFAULT_FALLBACK_SECTOR];
    const validLinedefs = Array.isArray(lvl.linedefs)
      ? lvl.linedefs.filter(
          (l) =>
            l &&
            Number.isFinite(Number(l.x1)) &&
            Number.isFinite(Number(l.y1)) &&
            Number.isFinite(Number(l.x2)) &&
            Number.isFinite(Number(l.y2))
        )
      : [];
    const levelName = typeof lvl.name === "string" && lvl.name.trim() ? lvl.name.trim() : "Nivel 3D";
    const nextEntities = Array.isArray(lvl.entities) ? lvl.entities : [];
    const playerStart = nextEntities.find((e) => e.type === "player");
    setSectors(validSectors);
    setLinedefs(validLinedefs);
    setEntities(nextEntities);
    setPlacedModels(Array.isArray(lvl.placedModels) ? lvl.placedModels : []);
    setPlacedVoxels(Array.isArray(lvl.placedVoxels) ? lvl.placedVoxels : []);
    setLights(Array.isArray(lvl.lights) ? lvl.lights : []);
    setCurrentLevelName(levelName);
    setGameConfig((prev) => ({
      ...prev,
      title: levelName,
      subtitle: lvl.description ? lvl.description.slice(0, 72) : prev.subtitle,
      cameraMode: lvl.recommendedCamera || prev.cameraMode,
      skyTexture: lvl.recommendedSky || prev.skyTexture,
      startingWeapon: lvl.recommendedWeapon || prev.startingWeapon,
      menuTheme: lvl.recommendedTheme || prev.menuTheme,
      gameMode: lvl.recommendedGameMode || prev.gameMode,
      playerModelId: lvl.recommendedPlayerModel || prev.playerModelId,
    }));
    if (playerStart) {
      setCam3D({
        x: playerStart.x / 64,
        y: playerStart.y / 64,
        z: 0.6,
        angle: 0,
        pitch: 0,
      });
    }
    setSelectedSectorId(validSectors[0]?.id ?? 0);
    setSelectedLineId(null);
    setSelectedVertexId(null);
    setSelectedThingIdx(null);
    setSelectedModelIdx(null);
    setSelectedVoxelIdx(null);
    setIsLoadModalOpen(false);
    setTimeout(() => fitMapToView(validLinedefs), 30);
    showToast(`Nivel "${levelName}" cargado`);
  };

  const handleQuickSave = () => {
    const levelData: Mode8LevelData = {
      id: `lvl_${currentLevelName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      name: currentLevelName,
      description: `Nivel con ${sectors.length} sectores, ${linedefs.length} líneas y ${placedVoxels.length} vóxels.`,
      theme: "doom",
      sectors,
      linedefs,
      entities,
      placedModels,
      placedVoxels,
      lights,
    };
    saveUserLevel(levelData);
    setUserSavedLevels(loadSavedUserLevels());
    showToast(`¡Nivel "${currentLevelName}" guardado!`);
  };

  const handleSaveToSlot = (name: string) => {
    if (!name.trim()) return;
    markEdited();
    const levelData: Mode8LevelData = {
      id: `lvl_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
      name: name.trim(),
      description: `Nivel de usuario con ${sectors.length} sectores y ${placedVoxels.length} vóxels 3D.`,
      theme: "doom",
      sectors,
      linedefs,
      entities,
      placedModels,
      placedVoxels,
      lights,
    };
    saveUserLevel(levelData);
    setUserSavedLevels(loadSavedUserLevels());
    setCurrentLevelName(name.trim());
    setGameConfig((prev) => ({ ...prev, title: name.trim() }));
    setIsSaveModalOpen(false);
    showToast(`Nivel guardado como "${name.trim()}"`);
  };

  const handleDownloadLevelFile = () => {
    const levelData: Mode8LevelData = {
      id: `lvl_${Date.now()}`,
      name: currentLevelName,
      description: `Exportado desde ReDoomEd v1.2`,
      theme: "doom",
      sectors,
      linedefs,
      entities,
      placedModels,
      placedVoxels,
      lights,
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(levelData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentLevelName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.divlvl`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Archivo .divlvl descargado");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".wad")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const buffer = evt.target?.result as ArrayBuffer;
          const wadRes = parseWadBuffer(buffer);
          if (wadRes && wadRes.linedefs.length > 0) {
            handleLoadLevelData({
              id: `wad_${Date.now()}`,
              name: file.name.replace(/\.[^/.]+$/, ""),
              description: `Mapa WAD (${wadRes.linedefs.length} líneas)`,
              theme: "doom",
              linedefs: wadRes.linedefs,
              sectors: wadRes.sectors,
              entities: wadRes.entities,
              placedModels: wadRes.placedModels,
              placedVoxels: [],
              lights: [{ id: "l1", x: wadRes.playerStart.x, y: wadRes.playerStart.y, z: 1.2, radius: 10, r: 255, g: 220, b: 180, flicker: false }],
            });
            setCam3D({ x: wadRes.playerStart.x, y: wadRes.playerStart.y, z: 0.6, angle: wadRes.playerStart.angle, pitch: 0 });
          } else {
            showToast("No se encontraron mapas legibles en el WAD");
          }
        } catch {
          showToast("Error al leer WAD binario");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          if (text.includes("linedef") && text.includes("{") && text.includes("vertex")) {
            const dummyLump = { name: "TEXTMAP", filePos: 0, size: text.length, index: 0, buffer: new TextEncoder().encode(text).buffer };
            const parser = new WadParser(new ArrayBuffer(0));
            const mapData = parser.parseUDMF(dummyLump);
            if (mapData) {
              const wadRes = convertWadMapToDoomMode8(mapData);
              handleLoadLevelData({
                id: `udmf_${Date.now()}`,
                name: file.name.replace(/\.[^/.]+$/, ""),
                description: `Mapa UDMF (${wadRes.linedefs.length} líneas)`,
                theme: "doom",
                linedefs: wadRes.linedefs,
                sectors: wadRes.sectors,
                entities: wadRes.entities,
                placedModels: wadRes.placedModels,
                placedVoxels: [],
                lights: [{ id: "l1", x: wadRes.playerStart.x, y: wadRes.playerStart.y, z: 1.2, radius: 10, r: 255, g: 220, b: 180, flicker: false }],
              });
              setCam3D({ x: wadRes.playerStart.x, y: wadRes.playerStart.y, z: 0.6, angle: wadRes.playerStart.angle, pitch: 0 });
              return;
            }
          }
          const parsed = JSON.parse(text);
          if (parsed.sectors && parsed.linedefs) {
            handleLoadLevelData(parsed);
          } else {
            showToast("Estructura de nivel inválida");
          }
        } catch {
          showToast("Error al leer archivo JSON / WAD");
        }
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const handleLoadPastedWadCode = () => {
    const text = pastedWadText.trim();
    if (!text) return showToast("Pega código UDMF o JSON primero");
    try {
      if (text.includes("linedef") && text.includes("{") && text.includes("vertex")) {
        const dummyLump = { name: "TEXTMAP", filePos: 0, size: text.length, index: 0, buffer: new TextEncoder().encode(text).buffer };
        const parser = new WadParser(new ArrayBuffer(0));
        const mapData = parser.parseUDMF(dummyLump);
        if (mapData) {
          const wadRes = convertWadMapToDoomMode8(mapData);
          handleLoadLevelData({
            id: `udmf_${Date.now()}`,
            name: "Mapa WAD UDMF",
            description: `UDMF (${wadRes.linedefs.length} líneas)`,
            theme: "doom",
            linedefs: wadRes.linedefs,
            sectors: wadRes.sectors,
            entities: wadRes.entities,
            placedModels: wadRes.placedModels,
            placedVoxels: [],
            lights: [{ id: "l1", x: wadRes.playerStart.x, y: wadRes.playerStart.y, z: 1.2, radius: 10, r: 255, g: 220, b: 180, flicker: false }],
          });
          setCam3D({ x: wadRes.playerStart.x, y: wadRes.playerStart.y, z: 0.6, angle: wadRes.playerStart.angle, pitch: 0 });
          setPastedWadText("");
          return;
        }
      }
      const parsed = JSON.parse(text);
      if (parsed.sectors && parsed.linedefs) {
        handleLoadLevelData(parsed);
        setPastedWadText("");
        return;
      }
      showToast("Formato UDMF o JSON no válido");
    } catch {
      showToast("Error al parsear WAD / JSON");
    }
  };

  const handleResetLevel = () => {
    markEdited();
    const blankLines: DivDoomLinedef[] = [
      { id: "rw1", x1: 2, y1: 2, x2: 18, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "STUD_WALL_BLUE", blocking: true },
      { id: "rw2", x1: 18, y1: 2, x2: 18, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "STUD_WALL_GREEN", blocking: true },
      { id: "rw3", x1: 18, y1: 14, x2: 2, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "STUD_WALL_BLUE", blocking: true },
      { id: "rw4", x1: 2, y1: 14, x2: 2, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "STUD_WALL_GOLD", blocking: true },
    ];
    setSectors([{ id: 0, floorHeight: 0, ceilHeight: 6.5, floorTexture: "STUD_FLOOR_BLUE", ceilTexture: "SKY_ROBLOX", lightLevel: 245 }]);
    setLinedefs(blankLines);
    setEntities([{ id: "p1", type: "player", x: 5 * 64, y: 8 * 64, graph: 1, name: "Blox Runner" }]);
    setPlacedModels([]);
    setPlacedVoxels([{ id: "v_start", voxelId: "voxel_checkpoint", x: 8, y: 8, z: 0, yaw: 0, scale: 1 }]);
    setLights([{ id: "l1", x: 10.0, y: 8.0, z: 2.5, radius: 14.0, r: 255, g: 245, b: 230, flicker: false }]);
    setCurrentLevelName("Mi Mundo Roblox 3D");
    setGameConfig((prev) => ({
      ...prev,
      title: "Mi Mundo Roblox 3D",
      skyTexture: "SKY_ROBLOX",
      cameraMode: "third_person",
      startingWeapon: "sword3d",
      gameMode: "exploration",
    }));
    setSelectedSectorId(0);
    setSelectedLineId(null);
    setSelectedVertexId(null);
    setSelectedThingIdx(null);
    setSelectedModelIdx(null);
    setSelectedVoxelIdx(null);
    setCam3D({ x: 5, y: 8, z: 0.0, angle: 0, pitch: 0 });
    setTimeout(() => fitMapToView(blankLines), 30);
    showToast("Nuevo mapa Roblox en blanco inicializado");
  };

  const curSector: DivDoomSector = sectors.find((s) => s.id === selectedSectorId) || sectors[0] || DEFAULT_FALLBACK_SECTOR;
  const curLine = linedefs.find((l) => String(l.id) === selectedLineId);

  const TOOL_LIST: Array<{
    id: ReDoomEdTool;
    label: string;
    shortDesc: string;
    group: "build" | "place" | "nav";
    icon: React.ComponentType<{ className?: string }>;
    accent?: boolean;
  }> = [
    { id: "select", label: "Elegir / Mover", shortDesc: "Tocar o arrastrar objetos", group: "build", icon: MousePointer },
    { id: "quickroom", label: "+ Plataforma 4×4", shortDesc: "1 toque = bloque/sala", group: "build", icon: Square, accent: true },
    { id: "stairs", label: "+ Escalera 3D", shortDesc: "Peldaños automáticos", group: "build", icon: Mountain },
    { id: "polyline", label: "+ Sector Libre", shortDesc: "Dibujar polígono", group: "build", icon: PenTool },
    { id: "line", label: "+ Pared", shortDesc: "2 toques = muro", group: "build", icon: ArrowUpRight },
    { id: "sector_fill", label: "Pintar Studs", shortDesc: "Aplicar textura suelo", group: "place", icon: Droplets },
    { id: "new_thing", label: "+ Enemigo / Actor", shortDesc: "Jugador, enemigo IA, luz", group: "place", icon: Box },
    { id: "voxel", label: "+ Moneda / Vóxel", shortDesc: "Coins, checkpoints, props", group: "place", icon: Package },
    { id: "move_cam", label: "Mover Cámara", shortDesc: "Poner cámara 3D aquí", group: "nav", icon: MapPin },
    { id: "move", label: "Mover Vista 2D", shortDesc: "Desplazar plano 2D", group: "nav", icon: Move },
  ];

  const THREE_BUILDER_TOOLS: Array<{
    id: ThreeBuilderTool;
    shortLabel: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "lego_block", shortLabel: "Bloque", label: "Poner Bloque", icon: Blocks },
    { id: "sculpt_3d", shortLabel: "Altura", label: "Subir / Bajar", icon: Mountain },
    { id: "paint_3d", shortLabel: "Pintar", label: "Pintar", icon: Paintbrush },
    { id: "lego_actor", shortLabel: "Actores", label: "Juguetes / IA", icon: Sparkles },
    { id: "erase_3d", shortLabel: "Borrar", label: "Borrar", icon: Eraser },
    { id: "look", shortLabel: "Mirar", label: "Mirar", icon: Eye },
  ];

  // Shared Inspector Sub-Views (grouped cleanly into Mundo / Objetos / Juego)
  const renderToolsContent = (compactMobile = false) => {
    const groups: Array<{ id: "build" | "place" | "nav"; title: string }> = [
      { id: "build", title: "Construcción 2D" },
      { id: "place", title: "Pintar y Colocar" },
      { id: "nav", title: "Navegación" },
    ];
    return (
      <div className={compactMobile ? "space-y-4 text-xs" : "p-2.5 space-y-3 text-xs"}>
        {groups.map((grp) => (
          <div key={grp.id} className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] px-1">
              {grp.title}
            </div>
            <div className={compactMobile ? "grid grid-cols-2 gap-2" : "flex flex-col gap-1"}>
              {TOOL_LIST.filter((t) => t.group === grp.id).map((tool) => {
                const Icon = tool.icon;
                const active = currentTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      setCurrentTool(tool.id);
                      if (tool.id === "stairs") setShowStairsDialog(true);
                      if (tool.id === "voxel") {
                        setInspectorGroup("objetos");
                        setObjetosSubTab("voxels");
                      }
                      if (tool.id === "new_thing") {
                        setInspectorGroup("objetos");
                        setObjetosSubTab("actors");
                      }
                      if (tool.id !== "polyline") setPolyVertices([]);
                      if (tool.id !== "line") setLineStartPoint(null);
                      if (compactMobile) {
                        setViewMode((vm) => (vm === "visual3d" ? "map2d" : vm));
                        setMobileSheetTab("canvas");
                      }
                    }}
                    className={`w-full min-h-[42px] lg:min-h-[34px] px-3 lg:px-2.5 py-2 lg:py-1.5 rounded-xl lg:rounded-lg text-left flex items-center gap-2.5 lg:gap-2 border transition-colors cursor-pointer ${
                      active
                        ? "bg-[#7C2D48] text-white border-[#7C2D48] font-semibold shadow-xs"
                        : tool.accent
                        ? "bg-[#EEF6F1] text-[#2F6F4E] border-[#CFE4D7] hover:bg-[#E2EFE8] font-semibold"
                        : "bg-[#F7F8FA] lg:bg-transparent border-[#E2E8F0] lg:border-transparent hover:bg-[#F1F5F9] text-[#111827]"
                    }`}
                    title={tool.shortDesc}
                  >
                    <Icon className="w-4 h-4 lg:w-3.5 lg:h-3.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs lg:text-[11px] leading-tight truncate">{tool.label}</div>
                      <div className={`text-[10px] lg:hidden truncate ${active ? "text-white/80" : "text-[#64748B]"}`}>
                        {tool.shortDesc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-[#E2E8F0] space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] px-1">
            Utilidades de Malla
          </div>
          <div className={compactMobile ? "grid grid-cols-2 gap-2" : "flex flex-col gap-1.5"}>
            <button
              type="button"
              onClick={handleFusePoints}
              className="w-full min-h-[42px] lg:min-h-[34px] px-3 py-1.5 bg-[#F7F8FA] hover:bg-[#E2E8F0] text-[#111827] border border-[#CBD5E1] rounded-xl lg:rounded-lg text-xs lg:text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5 text-[#4B5563]" />
              <span>Soldar Vértices</span>
            </button>
            <button
              type="button"
              onClick={handleFlipSelectedLine}
              className="w-full min-h-[42px] lg:min-h-[34px] px-3 py-1.5 bg-[#F7F8FA] hover:bg-[#E2E8F0] text-[#111827] border border-[#CBD5E1] rounded-xl lg:rounded-lg text-xs lg:text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#7C2D48]" />
              <span>Invertir Pared</span>
            </button>
          </div>
          {compactMobile && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#4B5563]">Grid:</span>
                {[8, 16, 32].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setGridSnap(s)}
                    className={`min-h-[36px] px-3 rounded-lg border text-xs font-mono font-semibold ${
                      gridSnap === s ? "bg-[#7C2D48] text-white border-[#7C2D48]" : "bg-[#F7F8FA] border-[#CBD5E1]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  fitMapToView();
                  setViewMode("map2d");
                  setMobileSheetTab("canvas");
                }}
                className="min-h-[36px] px-3 rounded-lg bg-[#FDF2F5] text-[#7C2D48] border border-[#F3D0DC] text-xs font-bold"
              >
                Ver Mapa 2D
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSectorAndLineInspector = () => (
    <div className="p-4 lg:p-3.5 flex flex-col gap-4 text-xs text-[#111827]">
      {/* Sector Selector Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 font-bold text-sm lg:text-xs">
          <Layers className="w-4 h-4 text-[#7C2D48]" />
          <span>Sector #{curSector.id}</span>
        </div>
        <select
          value={curSector.id}
          onChange={(e) => setSelectedSectorId(parseInt(e.target.value, 10))}
          className="min-h-[38px] lg:min-h-[32px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs font-mono font-semibold text-[#111827]"
        >
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              Sector #{s.id} ({s.floorTexture})
            </option>
          ))}
        </select>
      </div>

      {/* Heights & Quick Elevation */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-[#4B5563] font-semibold">Altura Suelo (m)</span>
            <input
              type="number"
              step="0.25"
              value={curSector.floorHeight}
              onChange={(e) => {
                markEdited();
                const val = parseFloat(e.target.value) || 0;
                setSectors((prev) => prev.map((s) => (s.id === curSector.id ? { ...s, floorHeight: val } : s)));
              }}
              className="min-h-[42px] lg:min-h-[36px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-3 py-1 font-mono text-sm lg:text-xs font-semibold"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-[#4B5563] font-semibold">Altura Techo (m)</span>
            <input
              type="number"
              step="0.25"
              value={curSector.ceilHeight}
              onChange={(e) => {
                markEdited();
                const val = parseFloat(e.target.value) || 0;
                setSectors((prev) => prev.map((s) => (s.id === curSector.id ? { ...s, ceilHeight: val } : s)));
              }}
              className="min-h-[42px] lg:min-h-[36px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-3 py-1 font-mono text-sm lg:text-xs font-semibold"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 bg-[#F7F8FA] p-2 rounded-xl border border-[#E2E8F0]">
          <span className="text-[11px] font-semibold text-[#4B5563] pl-1">Ajuste rápido:</span>
          <div className="flex items-center gap-1.5">
            {[-0.5, -0.25, 0.25, 0.5].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => {
                  markEdited();
                  setSectors((prev) =>
                    prev.map((s) =>
                      s.id === curSector.id
                        ? { ...s, floorHeight: Number((s.floorHeight + delta).toFixed(2)) }
                        : s
                    )
                  );
                }}
                className="min-h-[36px] lg:min-h-[30px] px-2.5 rounded-lg bg-white hover:bg-[#7C2D48] hover:text-white border border-[#CBD5E1] text-[11px] font-mono font-bold transition-colors cursor-pointer"
              >
                {delta > 0 ? `+${delta}` : `${delta}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lighting & Specials */}
      <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] text-[#4B5563] font-semibold">
            <span>Iluminación del Sector</span>
            <span className="font-mono text-[#111827] tabular-nums">{curSector.lightLevel ?? 180}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={curSector.lightLevel ?? 180}
            onChange={(e) => {
              markEdited();
              const val = parseInt(e.target.value, 10);
              setSectors((prev) => prev.map((s) => (s.id === curSector.id ? { ...s, lightLevel: val } : s)));
            }}
            className="accent-[#7C2D48] cursor-pointer h-2.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-[#4B5563] font-semibold">Efecto Especial</span>
            <button
              type="button"
              onClick={() => setShowSpecialListDialog(true)}
              className="min-h-[40px] lg:min-h-[34px] px-3 py-1 bg-[#F7F8FA] hover:bg-[#F1F5F9] text-[#7C2D48] border border-[#CBD5E1] rounded-lg text-left text-xs font-mono font-bold flex items-center justify-between cursor-pointer"
            >
              <span>#{curSector.special || 0}</span>
              <span className="text-[11px] text-[#64748B] font-sans">Elegir</span>
            </button>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-[#4B5563] font-semibold">Tag Puerta / Lift</span>
            <input
              type="number"
              value={curSector.tag || 0}
              onChange={(e) => {
                markEdited();
                const val = parseInt(e.target.value, 10) || 0;
                setSectors((prev) => prev.map((s) => (s.id === curSector.id ? { ...s, tag: val } : s)));
              }}
              className="min-h-[40px] lg:min-h-[34px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-3 py-1 font-mono text-xs"
            />
          </label>
        </div>
      </div>

      {/* Selected Linedef Card */}
      <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
        <div className="flex items-center justify-between font-bold text-[#111827]">
          <span>{curLine ? `Pared #${curLine.id}` : "Pared Seleccionada"}</span>
          {curLine && (
            <button
              type="button"
              onClick={() => {
                markEdited();
                setLinedefs((prev) => prev.filter((l) => String(l.id) !== String(curLine.id)));
                setSelectedLineId(null);
                showToast("Pared eliminada");
              }}
              className="min-h-[32px] text-[11px] px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-semibold cursor-pointer"
            >
              Eliminar
            </button>
          )}
        </div>

        {!curLine ? (
          <p className="text-[11px] text-[#64748B] bg-[#F7F8FA] p-3 rounded-xl border border-[#E2E8F0]">
            Toca una pared en el Mapa 2D o pinta una pared en el Visor 3D para cambiar su textura o convertirla en portal.
          </p>
        ) : (
          <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0] space-y-3">
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer min-h-[32px]">
                <input
                  type="checkbox"
                  checked={curLine.isTwoSided || false}
                  onChange={(e) => {
                    markEdited();
                    setLinedefs((prev) =>
                      prev.map((l) => (String(l.id) === String(curLine.id) ? { ...l, isTwoSided: e.target.checked } : l))
                    );
                  }}
                  className="accent-[#7C2D48] w-4 h-4"
                />
                <span>Portal 2-L</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer min-h-[32px]">
                <input
                  type="checkbox"
                  checked={curLine.blocking !== false}
                  onChange={(e) => {
                    markEdited();
                    setLinedefs((prev) =>
                      prev.map((l) => (String(l.id) === String(curLine.id) ? { ...l, blocking: e.target.checked } : l))
                    );
                  }}
                  className="accent-[#7C2D48] w-4 h-4"
                />
                <span>Sólida</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer min-h-[32px]">
                <input
                  type="checkbox"
                  checked={curLine.secret || false}
                  onChange={(e) => {
                    markEdited();
                    setLinedefs((prev) =>
                      prev.map((l) => (String(l.id) === String(curLine.id) ? { ...l, secret: e.target.checked } : l))
                    );
                  }}
                  className="accent-[#7C2D48] w-4 h-4"
                />
                <span>Secreta</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                markEdited();
                setLinedefs((prev) =>
                  prev.map((l) => (String(l.id) === String(curLine.id) ? { ...l, middleTexture: selectedWallTex } : l))
                );
                showToast(`Pared pintada con ${selectedWallTex}`);
              }}
              className="w-full min-h-[38px] px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg font-mono text-xs font-bold text-[#7C2D48] hover:bg-[#F1F5F9] cursor-pointer"
            >
              Aplicar {selectedWallTex} (actual: {curLine.middleTexture || "NONE"})
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderActorsInspector = () => (
    <div className="p-4 lg:p-3.5 flex flex-col gap-4 text-xs text-[#111827]">
      {/* Selected 3D Model / Enemy IA Quick Inspector */}
      {selectedModelIdx !== null && placedModels[selectedModelIdx] && (() => {
        const selMod = placedModels[selectedModelIdx];
        const selStats = inferPlacedModelStats(selMod);
        return (
          <div className="p-3 bg-[#FDF2F5] rounded-xl border border-[#F3D0DC] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[#7C2D48] truncate text-sm">{selStats.name}</span>
              <button
                type="button"
                onClick={() => {
                  markEdited();
                  setPlacedModels((prev) => prev.filter((_, i) => i !== selectedModelIdx));
                  setSelectedModelIdx(null);
                  showToast("Modelo 3D eliminado");
                }}
                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-semibold cursor-pointer"
              >
                Eliminar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <label className="flex flex-col gap-1">
                <span className="text-[#4B5563] font-semibold">Rol / IA</span>
                <select
                  value={selStats.role}
                  onChange={(e) => {
                    markEdited();
                    const role = e.target.value as "enemy" | "goal" | "ally" | "prop";
                    setPlacedModels((prev) =>
                      prev.map((m, i) => (i === selectedModelIdx ? { ...m, role } : m))
                    );
                  }}
                  className="min-h-[38px] bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-semibold"
                >
                  <option value="enemy">Enemigo IA</option>
                  <option value="goal">Meta / Trofeo</option>
                  <option value="ally">Aliado</option>
                  <option value="prop">Decoración</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[#4B5563] font-semibold">Escala ({(selMod.scale || 1).toFixed(1)}x)</span>
                <input
                  type="range"
                  min="0.6"
                  max="1.8"
                  step="0.1"
                  value={selMod.scale || 1}
                  onChange={(e) => {
                    markEdited();
                    const sc = parseFloat(e.target.value);
                    setPlacedModels((prev) =>
                      prev.map((m, i) => (i === selectedModelIdx ? { ...m, scale: sc } : m))
                    );
                  }}
                  className="accent-[#7C2D48] mt-2"
                />
              </label>
            </div>
          </div>
        );
      })()}

      {/* Place New Actor / 3D Model */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-sm lg:text-xs text-[#111827]">
            Añadir Personaje, Enemigo o Luz
          </span>
          <div className="flex items-center gap-1.5">
            {onOpenAssetImporter && (
              <button
                type="button"
                onClick={() => onOpenAssetImporter("model3d")}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#FDF2F5] hover:bg-[#FCE7EE] border border-[#F3D0DC] text-[#7C2D48] text-[11px] font-bold cursor-pointer"
              >
                + Importar MD2/MD3
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setThreeTool("lego_actor");
                setCurrentTool("new_thing");
                setMobileSheetTab("canvas");
                showToast(`Toca el visor 3D o mapa para colocar: ${selectedThingPreset.name}`);
              }}
              className="min-h-[36px] px-3 py-1 rounded-lg bg-[#7C2D48] text-white text-[11px] font-bold cursor-pointer"
            >
              Colocar en 3D
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 max-h-60 overflow-y-auto pr-0.5">
          {allThingPresets.map((tp) => {
            const active = selectedThingPreset.name === tp.name;
            return (
              <button
                key={tp.name}
                type="button"
                onClick={() => {
                  setSelectedThingPreset(tp);
                  setCurrentTool("new_thing");
                  if (tp.type === "player") {
                    setSelectedKidToy(KID_TOY_PRESETS.find((k) => k.id === "player") || KID_TOY_PRESETS[0]);
                  } else if (tp.modelId) {
                    const matchToy = KID_TOY_PRESETS.find((k) => k.modelOrVoxelId === tp.modelId);
                    if (matchToy) setSelectedKidToy(matchToy);
                  }
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                  active ? "bg-[#FDF2F5] border-[#7C2D48] text-[#111827]" : "bg-[#F7F8FA] border-[#E2E8F0] text-[#334155]"
                }`}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tp.color }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs truncate">{tp.name}</div>
                  <div className="text-[10px] text-[#64748B] truncate">{tp.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Scene Models List (Easy tap-to-edit on phones) */}
      <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#111827]">
            En la escena ({placedModels.length} modelos · {entities.length} actores)
          </span>
        </div>
        {placedModels.length === 0 ? (
          <p className="text-[11px] text-[#64748B] bg-[#F7F8FA] p-3 rounded-xl border border-[#E2E8F0]">
            Aún no hay modelos 3D colocados. Elige uno arriba o usa la herramienta Actores en el visor 3D.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
            {placedModels.map((mod, idx) => {
              const st = inferPlacedModelStats(mod);
              const isSel = selectedModelIdx === idx;
              return (
                <div
                  key={mod.id || idx}
                  className={`min-h-[42px] px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 ${
                    isSel ? "bg-[#FDF2F5] border-[#7C2D48]" : "bg-[#F7F8FA] border-[#E2E8F0]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedModelIdx(idx)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="font-semibold text-xs text-[#111827] truncate">{st.name}</div>
                    <div className="text-[10px] text-[#64748B]">
                      {st.role} · ({mod.x.toFixed(1)}, {mod.y.toFixed(1)})
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      markEdited();
                      setPlacedModels((prev) => prev.filter((_, i) => i !== idx));
                      if (selectedModelIdx === idx) setSelectedModelIdx(null);
                      showToast(`${st.name} eliminado`);
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 cursor-pointer"
                    aria-label={`Eliminar ${st.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderTexturesInspector = () => (
    <div className="p-4 lg:p-3.5 flex flex-col gap-4 text-xs text-[#111827]">
      {onOpenAssetImporter && (
        <button
          type="button"
          onClick={() => onOpenAssetImporter("texture")}
          className="min-h-[42px] px-3 py-2 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-[#1D4ED8] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Importar o Crear Textura Personalizada</span>
        </button>
      )}
      {/* Quick Roblox Studio Material Palettes */}
      <div className="p-3 bg-[#FDF2F5] rounded-xl border border-[#F3D0DC] space-y-2">
        <span className="font-bold text-xs text-[#7C2D48] block">Estilos Rápidos 3D</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "roblox", label: "Roblox Obby", floor: "STUD_FLOOR_BLUE", wall: "STUD_WALL_BLUE", sky: "SKY_ROBLOX", color: "#3b82f6" },
            { id: "dojo", label: "Dojo Madera", floor: "DOJO_TATAMI", wall: "DOJO_WALL", sky: "SKY_ROBLOX", color: "#d97706" },
            { id: "cyber", label: "Cyber Neón", floor: "NEON_FLOOR", wall: "NEON_GRID", sky: "SKY_CYBER", color: "#06b6d4" },
            { id: "gold", label: "Ciudadela Oro", floor: "MARBLE_GOLD", wall: "STUD_GOLD", sky: "SKY_ROBLOX", color: "#eab308" },
          ].map((pal) => (
            <button
              key={pal.id}
              type="button"
              onClick={() => {
                markEdited();
                setSelectedFlatTex(pal.floor);
                setSelectedWallTex(pal.wall);
                setSectors((prev) =>
                  prev.map((s) =>
                    s.id === curSector.id
                      ? { ...s, floorTexture: pal.floor, ceilTexture: pal.sky, lightLevel: 245 }
                      : s
                  )
                );
                setGameConfig((prev) => ({ ...prev, skyTexture: pal.sky }));
                showToast(`Estilo "${pal.label}" aplicado al Sector #${curSector.id}`);
              }}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F8FA] border border-[#E2E8F0] text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <span className="w-3 h-3 rounded-xs flex-shrink-0" style={{ backgroundColor: pal.color }} />
              <span className="truncate">{pal.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Skybox Selector */}
      <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0] space-y-2">
        <span className="font-bold text-xs text-[#111827] block">Cielo Panorámico (Skybox 3D)</span>
        <select
          value={gameConfig.skyTexture}
          onChange={(e) => {
            markEdited();
            setGameConfig((prev) => ({ ...prev, skyTexture: e.target.value }));
          }}
          className="w-full min-h-[40px] lg:min-h-[34px] bg-white border border-[#CBD5E1] rounded-lg px-2.5 text-xs font-semibold"
        >
          <option value="SKY_ROBLOX">SKY_ROBLOX (Cielo Soleado)</option>
          <option value="SKY_CYBER">SKY_CYBER (Horizonte Cyber Neón)</option>
          <option value="SKY2">SKY2 (Atardecer / Crepúsculo)</option>
          <option value="SKY3">SKY3 (Volcán / Lava)</option>
          <option value="SKY1">SKY1 (Noche Clásica)</option>
        </select>
      </div>

      {/* Flats (Floor / Ceiling) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-xs">Suelos y Techos</span>
          <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-lg border border-[#E2E8F0] text-[11px]">
            <button
              type="button"
              onClick={() => setSelectedFlatTarget("floor")}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                selectedFlatTarget === "floor" ? "bg-[#7C2D48] text-white" : "text-[#4B5563]"
              }`}
            >
              Suelo
            </button>
            <button
              type="button"
              onClick={() => setSelectedFlatTarget("ceiling")}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                selectedFlatTarget === "ceiling" ? "bg-[#7C2D48] text-white" : "text-[#4B5563]"
              }`}
            >
              Techo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#F7F8FA] px-3 py-2 rounded-lg border border-[#CBD5E1]">
          <Search className="w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Buscar textura de suelo/techo..."
            value={flatSearchFilter}
            onChange={(e) => setFlatSearchFilter(e.target.value)}
            className="w-full bg-transparent text-xs focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto p-2 bg-[#0F172A] rounded-xl border border-[#CBD5E1]">
          {customTextures
            .filter((ct) => ct.kind !== "wall" && ct.name.toLowerCase().includes(flatSearchFilter.toLowerCase()))
            .map((ct) => {
              const isSelected =
                selectedFlatTarget === "floor" ? curSector.floorTexture === ct.name : curSector.ceilTexture === ct.name;
              return (
                <button
                  key={`custom_flat_${ct.name}`}
                  type="button"
                  onClick={() => {
                    markEdited();
                    setSelectedFlatTex(ct.name);
                    setSectors((prev) =>
                      prev.map((s) =>
                        s.id === curSector.id
                          ? selectedFlatTarget === "floor"
                            ? { ...s, floorTexture: ct.name }
                            : { ...s, ceilTexture: ct.name }
                          : s
                      )
                    );
                  }}
                  className={`flex flex-col items-center p-1.5 rounded-lg border cursor-pointer ${
                    isSelected ? "border-[#2563EB] bg-[#2563EB]/35 ring-1 ring-white/40" : "border-slate-700 bg-slate-900"
                  }`}
                >
                  <TextureThumb name={ct.name} kind="flat" fallbackColor={ct.dominantColor} />
                  <span className="text-[9px] font-mono text-sky-300 truncate w-full text-center mt-1">{ct.name}</span>
                </button>
              );
            })}
          {DOOM_FLATS.filter((f) => f.name.toLowerCase().includes(flatSearchFilter.toLowerCase())).map((flat) => {
            const isSelected =
              selectedFlatTarget === "floor" ? curSector.floorTexture === flat.name : curSector.ceilTexture === flat.name;
            return (
              <button
                key={flat.name}
                type="button"
                onClick={() => {
                  markEdited();
                  setSelectedFlatTex(flat.name);
                  setSectors((prev) =>
                    prev.map((s) =>
                      s.id === curSector.id
                        ? selectedFlatTarget === "floor"
                          ? { ...s, floorTexture: flat.name }
                          : { ...s, ceilTexture: flat.name }
                        : s
                    )
                  );
                }}
                className={`flex flex-col items-center p-1.5 rounded-lg border cursor-pointer ${
                  isSelected ? "border-[#7C2D48] bg-[#7C2D48]/35 ring-1 ring-white/40" : "border-slate-800 bg-slate-900"
                }`}
              >
                <TextureThumb name={flat.name} kind="flat" fallbackColor={flat.color} />
                <span className="text-[9px] font-mono text-slate-200 truncate w-full text-center mt-1">{flat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Walls */}
      <div className="space-y-2.5 pt-3 border-t border-[#E2E8F0]">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs">Paredes ({selectedWallTex})</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {[
            { id: "all", label: "Todas" },
            { id: "roblox_arcade", label: "Roblox/Neón" },
            { id: "walls", label: "Muros" },
            { id: "tech", label: "Tech" },
            { id: "gothic", label: "Gótico" },
            { id: "doors_steps", label: "Puertas" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveWallCategory(cat.id)}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap cursor-pointer ${
                activeWallCategory === cat.id ? "bg-[#7C2D48] text-white" : "bg-[#F7F8FA] text-[#4B5563] border border-[#E2E8F0]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-[#F7F8FA] px-3 py-2 rounded-lg border border-[#CBD5E1]">
          <Search className="w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Buscar textura de pared..."
            value={wallSearchFilter}
            onChange={(e) => setWallSearchFilter(e.target.value)}
            className="w-full bg-transparent text-xs focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-2 bg-[#0F172A] rounded-xl border border-[#CBD5E1]">
          {customTextures
            .filter(
              (ct) =>
                ct.kind !== "flat" &&
                (activeWallCategory === "all" || activeWallCategory === "custom") &&
                ct.name.toLowerCase().includes(wallSearchFilter.toLowerCase())
            )
            .map((ct) => (
              <button
                key={`custom_wall_${ct.name}`}
                type="button"
                onClick={() => {
                  setSelectedWallTex(ct.name);
                  if (curLine) {
                    markEdited();
                    setLinedefs((prev) =>
                      prev.map((l) =>
                        String(l.id) === String(curLine.id) ? { ...l, middleTexture: ct.name, lowerTexture: ct.name } : l
                      )
                    );
                  }
                }}
                className={`flex flex-col items-center p-1.5 rounded-lg border cursor-pointer ${
                  selectedWallTex === ct.name
                    ? "border-[#2563EB] bg-[#2563EB]/35 ring-1 ring-white/40"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                <TextureThumb name={ct.name} kind="wall" fallbackColor={ct.dominantColor} />
                <span className="text-[9px] font-mono text-sky-300 truncate w-full text-center mt-1">{ct.name}</span>
              </button>
            ))}
          {DOOM_WALL_TEXTURES.filter(
            (t) =>
              (activeWallCategory === "all" || t.category === activeWallCategory) &&
              t.name.toLowerCase().includes(wallSearchFilter.toLowerCase())
          ).map((tex) => (
            <button
              key={tex.name}
              type="button"
              onClick={() => {
                setSelectedWallTex(tex.name);
                if (curLine) {
                  markEdited();
                  setLinedefs((prev) =>
                    prev.map((l) =>
                      String(l.id) === String(curLine.id) ? { ...l, middleTexture: tex.name, lowerTexture: tex.name } : l
                    )
                  );
                }
              }}
              className={`flex flex-col items-center p-1.5 rounded-lg border cursor-pointer ${
                selectedWallTex === tex.name
                  ? "border-[#7C2D48] bg-[#7C2D48]/35 ring-1 ring-white/40"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              <TextureThumb name={tex.name} kind="wall" fallbackColor={tex.dominantColor} />
              <span className="text-[9px] font-mono text-slate-200 truncate w-full text-center mt-1">{tex.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderVoxelsInspector = () => (
    <div className="p-4 lg:p-3.5 flex flex-col gap-4 text-xs text-[#111827]">
      <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 font-bold text-sm lg:text-xs">
          <Package className="w-4 h-4 text-[#2F6F4E]" />
          <span>Vóxels 3D ({placedVoxels.length})</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setCurrentTool("voxel");
            setMobileSheetTab("canvas");
            showToast("Toca el mapa para colocar el vóxel");
          }}
          className="min-h-[36px] px-3 py-1 rounded-lg bg-[#2F6F4E] text-white text-[11px] font-bold cursor-pointer"
        >
          Colocar en Mapa
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-0.5">
        {AVAILABLE_VOXEL_ITEMS.map((vox) => (
          <button
            key={vox.id}
            type="button"
            onClick={() => {
              setSelectedVoxelType(vox.id);
              setCurrentTool("voxel");
              const toyMatch = KID_TOY_PRESETS.find((k) => k.modelOrVoxelId === vox.id);
              if (toyMatch) setSelectedKidToy(toyMatch);
              if (selectedVoxelIdx !== null && placedVoxels[selectedVoxelIdx]) {
                markEdited();
                setPlacedVoxels((prev) =>
                  prev.map((v, i) => (i === selectedVoxelIdx ? { ...v, voxelId: vox.id } : v))
                );
              }
            }}
            className={`min-h-[48px] p-2.5 rounded-xl border text-left flex flex-col gap-1 cursor-pointer ${
              selectedVoxelType === vox.id
                ? "bg-[#EEF6F1] border-[#2F6F4E] ring-1 ring-[#2F6F4E]/35"
                : "bg-[#F7F8FA] border-[#E2E8F0]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: vox.iconColor }} />
              <span className="font-bold text-xs truncate">{vox.name}</span>
            </div>
            <span className="text-[10px] text-[#64748B] line-clamp-1">{vox.desc}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#4B5563] font-medium">Rotación (Yaw)</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="360"
              step="15"
              value={selectedVoxelYaw}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setSelectedVoxelYaw(val);
                if (selectedVoxelIdx !== null) {
                  markEdited();
                  setPlacedVoxels((prev) => prev.map((v, i) => (i === selectedVoxelIdx ? { ...v, yaw: val } : v)));
                }
              }}
              className="w-28 accent-[#2F6F4E]"
            />
            <span className="font-mono font-bold w-10 text-right tabular-nums">{selectedVoxelYaw}°</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-[#4B5563] font-medium">Escala</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={selectedVoxelScale}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSelectedVoxelScale(val);
                if (selectedVoxelIdx !== null) {
                  markEdited();
                  setPlacedVoxels((prev) => prev.map((v, i) => (i === selectedVoxelIdx ? { ...v, scale: val } : v)));
                }
              }}
              className="w-28 accent-[#2F6F4E]"
            />
            <span className="font-mono font-bold w-10 text-right tabular-nums">{selectedVoxelScale.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {selectedVoxelIdx !== null && placedVoxels[selectedVoxelIdx] && (
        <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0] flex items-center justify-between text-xs">
          <span className="font-bold text-[#2F6F4E]">Vóxel #{selectedVoxelIdx + 1}</span>
          <button
            type="button"
            onClick={() => {
              markEdited();
              setPlacedVoxels((prev) => prev.filter((_, i) => i !== selectedVoxelIdx));
              setSelectedVoxelIdx(null);
              showToast("Vóxel eliminado");
            }}
            className="min-h-[34px] px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Quitar</span>
          </button>
        </div>
      )}
    </div>
  );

  const renderRulesConfigurator = () => (
    <div className="p-4 lg:p-3.5 flex flex-col gap-4 text-xs text-[#111827]">
      <div className="space-y-2">
        <span className="font-bold text-xs text-[#111827] block">Modo de Cámara 3D</span>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "third_person", label: "3ª Persona (Roblox)" },
              { id: "fps", label: "1ª Persona (FPS)" },
              { id: "isometric", label: "Isométrica RPG" },
              { id: "orbit", label: "Órbita Libre" },
            ] as const
          ).map((cam) => {
            const active = gameConfig.cameraMode === cam.id;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={() => {
                  markEdited();
                  setGameConfig((prev) => ({ ...prev, cameraMode: cam.id }));
                }}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-semibold text-left cursor-pointer transition-colors ${
                  active
                    ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                    : "bg-[#F7F8FA] text-[#111827] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                }`}
              >
                {cam.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 pt-2 border-t border-[#E2E8F0]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-[#4B5563]">Avatar del Jugador</span>
          <select
            value={gameConfig.playerModelId}
            onChange={(e) => {
              markEdited();
              setGameConfig((prev) => ({ ...prev, playerModelId: e.target.value }));
            }}
            className="min-h-[40px] lg:min-h-[36px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2.5 text-xs font-medium"
          >
            <option value="blox_hero">Blox Hero (Roblox)</option>
            <option value="blox_knight">Caballero Redcliff</option>
            <option value="samurai_fighter">Samurái Dojo</option>
            <option value="cyber_mech">Cyber Mech</option>
            <option value="doom_marine">Marine Espacial</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-[#4B5563]">Modo de Juego</span>
          <select
            value={gameConfig.gameMode}
            onChange={(e) => {
              markEdited();
              setGameConfig((prev) => ({ ...prev, gameMode: e.target.value as GameModeId }));
            }}
            className="min-h-[40px] lg:min-h-[36px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2.5 text-xs font-medium"
          >
            <option value="exploration">Obby / Exploración (Saltar)</option>
            <option value="shooter">Acción / Pelea / Shooter</option>
            <option value="survival">Supervivencia</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-[#4B5563]">Arma Inicial</span>
          <select
            value={gameConfig.startingWeapon}
            onChange={(e) => {
              markEdited();
              setGameConfig((prev) => ({ ...prev, startingWeapon: e.target.value as WeaponId }));
            }}
            className="min-h-[40px] lg:min-h-[36px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2.5 text-xs font-medium"
          >
            <option value="sword3d">Espada 3D</option>
            <option value="shotgun">Escopeta 12G</option>
            <option value="pistol">Pistola Táctica</option>
            <option value="staff3d">Báculo Arcano</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-[#4B5563]">Salud Inicial</span>
          <input
            type="number"
            min="10"
            max="500"
            value={gameConfig.startingHealth}
            onChange={(e) => {
              markEdited();
              setGameConfig((prev) => ({ ...prev, startingHealth: parseInt(e.target.value, 10) || 100 }));
            }}
            className="min-h-[40px] lg:min-h-[36px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-3 font-mono text-xs"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-[#4B5563]">Munición Inicial</span>
          <input
            type="number"
            min="0"
            max="500"
            value={gameConfig.startingAmmo}
            onChange={(e) => {
              markEdited();
              setGameConfig((prev) => ({ ...prev, startingAmmo: parseInt(e.target.value, 10) || 0 }));
            }}
            className="min-h-[40px] lg:min-h-[36px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-3 font-mono text-xs"
          />
        </label>
      </div>

      <label className="flex items-center justify-between p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0] cursor-pointer min-h-[44px]">
        <span className="text-xs font-medium">Activar Minimapa Radar en HUD</span>
        <input
          type="checkbox"
          checked={gameConfig.showHudAutomap}
          onChange={(e) => {
            markEdited();
            setGameConfig((prev) => ({ ...prev, showHudAutomap: e.target.checked }));
          }}
          className="accent-[#2F6F4E] w-4 h-4"
        />
      </label>
    </div>
  );

  const renderMenusConfigurator = () => (
    <div className="p-4 lg:p-3.5 flex flex-col gap-3.5 text-xs text-[#111827]">
      <button
        type="button"
        onClick={() => {
          setShowMenuPreview((prev) => !prev);
          if (viewMode === "map2d" || viewMode === "code") setViewMode("visual3d");
          setMobileSheetTab("canvas");
        }}
        className={`w-full min-h-[42px] px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
          showMenuPreview
            ? "bg-[#7C2D48] text-white border-[#7C2D48]"
            : "bg-[#FDF2F5] text-[#7C2D48] border-[#F3D0DC] hover:bg-[#FCE7EE]"
        }`}
      >
        <Eye className="w-4 h-4" />
        <span>{showMenuPreview ? "Ocultar Vista Previa del Menú" : "Previsualizar Menú en Visor 3D"}</span>
      </button>

      <label className="flex items-center justify-between p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0] cursor-pointer min-h-[48px]">
        <div>
          <div className="font-semibold text-[#111827]">Incluir Menú Principal al Iniciar</div>
          <div className="text-[11px] text-[#64748B]">Portada, selector de arma y pausa</div>
        </div>
        <input
          type="checkbox"
          checked={gameConfig.hasStartMenu}
          onChange={(e) => {
            markEdited();
            setGameConfig((prev) => ({ ...prev, hasStartMenu: e.target.checked }));
          }}
          className="accent-[#7C2D48] w-4 h-4"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-[#4B5563]">Título del Juego 3D</span>
        <input
          type="text"
          value={gameConfig.title}
          onChange={(e) => {
            markEdited();
            setGameConfig((prev) => ({ ...prev, title: e.target.value }));
            setCurrentLevelName(e.target.value || "Mi Juego 3D");
          }}
          className="min-h-[40px] lg:min-h-[36px] px-3 py-1.5 bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg text-xs font-semibold"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-[#4B5563]">Subtítulo / Descripción</span>
        <input
          type="text"
          value={gameConfig.subtitle}
          onChange={(e) => {
            markEdited();
            setGameConfig((prev) => ({ ...prev, subtitle: e.target.value }));
          }}
          className="min-h-[40px] lg:min-h-[36px] px-3 py-1.5 bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg text-xs"
        />
      </label>

      {/* Theme Picker */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-[#4B5563]">Estilo Visual del Menú</span>
        <div className="grid grid-cols-2 gap-2">
          {MENU_THEMES_META.map((theme) => {
            const active = gameConfig.menuTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  markEdited();
                  setGameConfig((prev) => ({ ...prev, menuTheme: theme.id }));
                }}
                className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  active ? "border-[#7C2D48] bg-[#FDF2F5] ring-1 ring-[#7C2D48]/30" : "border-[#E2E8F0] bg-[#F7F8FA]"
                }`}
              >
                <span
                  className="w-6 h-6 rounded-md border flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: theme.previewBg, borderColor: theme.previewAccent, color: theme.previewText }}
                >
                  A
                </span>
                <span className="text-xs font-semibold truncate">{theme.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-[#4B5563]">Texto del Botón Jugar</span>
        <input
          type="text"
          value={gameConfig.playButtonText}
          onChange={(e) => {
            markEdited();
            setGameConfig((prev) => ({ ...prev, playButtonText: e.target.value }));
          }}
          className="min-h-[40px] lg:min-h-[36px] px-3 py-1.5 bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg text-xs"
        />
      </label>

      <div className="flex items-center justify-between gap-2 text-xs pt-1">
        <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
          <input
            type="checkbox"
            checked={gameConfig.showControlsButton}
            onChange={(e) => {
              markEdited();
              setGameConfig((prev) => ({ ...prev, showControlsButton: e.target.checked }));
            }}
            className="accent-[#7C2D48] w-4 h-4"
          />
          <span>Botón Controles</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
          <input
            type="checkbox"
            checked={gameConfig.showWeaponSelect}
            onChange={(e) => {
              markEdited();
              setGameConfig((prev) => ({ ...prev, showWeaponSelect: e.target.checked }));
            }}
            className="accent-[#7C2D48] w-4 h-4"
          />
          <span>Selector Arma</span>
        </label>
      </div>
    </div>
  );

  const renderLiveCodeInspector = () => (
    <div className="p-4 lg:p-3.5 flex flex-col gap-3 h-full min-h-0 text-xs text-[#111827]">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-1.5 font-bold">
          <Sparkles className="w-4 h-4 text-[#7C2D48]" />
          <span>Código Auto-Generado</span>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4B5563] cursor-pointer">
          <input
            type="checkbox"
            checked={gameConfig.autoSyncCode}
            onChange={(e) => setGameConfig((prev) => ({ ...prev, autoSyncCode: e.target.checked }))}
            className="accent-[#2F6F4E] w-4 h-4"
          />
          <span>Auto-Sync</span>
        </label>
      </div>

      <div
        className={`px-3 py-2 rounded-xl border text-[11px] flex items-center gap-2 ${
          textureValidation.isValid
            ? "bg-[#EEF6F1] text-[#2F6F4E] border-[#CFE4D7]"
            : "bg-amber-50 text-amber-800 border-amber-300"
        }`}
      >
        {textureValidation.isValid ? (
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        )}
        <span className="font-medium">
          {textureValidation.resolvedTextures.length} texturas verificadas · Mapa listo para compilar
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSyncToCodeEditor}
          className="flex-1 min-h-[40px] px-3 py-1.5 bg-[#7C2D48] hover:bg-[#66233a] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FileCode className="w-4 h-4" />
          <span>Enviar al Editor</span>
        </button>
        <button
          type="button"
          onClick={handleCopyDivCode}
          className="min-h-[40px] px-3 py-1.5 bg-[#F7F8FA] hover:bg-[#E2E8F0] text-[#111827] border border-[#CBD5E1] font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Copy className="w-4 h-4" />
          <span>Copiar</span>
        </button>
      </div>

      <pre className="flex-1 min-h-[220px] overflow-auto p-3 rounded-xl bg-[#0F172A] text-slate-100 font-mono text-[10px] leading-relaxed border border-slate-700 select-text">
        {generatedDivCode}
      </pre>
    </div>
  );

  const renderGroupedInspectorBody = (group: InspectorGroup, isMobileSheet: boolean) => {
    if (group === "mundo") {
      return (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-4 lg:px-3 py-2 bg-[#F7F8FA] border-b border-[#E2E8F0] flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setMundoSubTab("sector")}
              className={`flex-1 min-h-[36px] lg:min-h-[30px] px-2.5 rounded-lg text-xs lg:text-[11px] font-bold transition-colors cursor-pointer ${
                mundoSubTab === "sector" ? "bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]" : "text-[#4B5563]"
              }`}
            >
              Sector #{curSector.id}
            </button>
            <button
              type="button"
              onClick={() => setMundoSubTab("textures")}
              className={`flex-1 min-h-[36px] lg:min-h-[30px] px-2.5 rounded-lg text-xs lg:text-[11px] font-bold transition-colors cursor-pointer ${
                mundoSubTab === "textures" ? "bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]" : "text-[#4B5563]"
              }`}
            >
              Materiales
            </button>
            {isMobileSheet && (
              <button
                type="button"
                onClick={() => setMundoSubTab("map2d")}
                className={`flex-1 min-h-[36px] px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  mundoSubTab === "map2d" ? "bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]" : "text-[#4B5563]"
                }`}
              >
                Plano 2D
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {mundoSubTab === "sector" && renderSectorAndLineInspector()}
            {mundoSubTab === "textures" && renderTexturesInspector()}
            {mundoSubTab === "map2d" && (isMobileSheet ? <div className="p-4">{renderToolsContent(true)}</div> : renderSectorAndLineInspector())}
          </div>
        </div>
      );
    }

    if (group === "objetos") {
      return (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-4 lg:px-3 py-2 bg-[#F7F8FA] border-b border-[#E2E8F0] flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setObjetosSubTab("voxels")}
              className={`flex-1 min-h-[36px] lg:min-h-[30px] px-2.5 rounded-lg text-xs lg:text-[11px] font-bold transition-colors cursor-pointer ${
                objetosSubTab === "voxels" ? "bg-white text-[#2F6F4E] shadow-xs border border-[#E2E8F0]" : "text-[#4B5563]"
              }`}
            >
              Vóxels ({placedVoxels.length})
            </button>
            <button
              type="button"
              onClick={() => setObjetosSubTab("actors")}
              className={`flex-1 min-h-[36px] lg:min-h-[30px] px-2.5 rounded-lg text-xs lg:text-[11px] font-bold transition-colors cursor-pointer ${
                objetosSubTab === "actors" ? "bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]" : "text-[#4B5563]"
              }`}
            >
              Actores e IA ({placedModels.length + entities.length})
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {objetosSubTab === "voxels" && renderVoxelsInspector()}
            {objetosSubTab === "actors" && renderActorsInspector()}
          </div>
        </div>
      );
    }

    if (group === "activos") {
      return (
        <div className="flex flex-col flex-1 min-h-0 p-3 overflow-hidden">
          <AssetBrowser
            layout="compact"
            runtime={runtime as DivRuntime}
            fpg={fpg}
            onUpdateFpg={(next) => {
              onUpdateFpg?.(next);
              runtime?.loadFPG(next);
            }}
            onPackagesChanged={onFpgPackagesChanged}
            onOpenImporter={onOpenAssetImporter}
            onUseModelInMode8={(modelId) => {
              const foundToy = allKidToys.find((k) => k.modelOrVoxelId === modelId);
              if (foundToy) setSelectedKidToy(foundToy);
              setThreeTool("lego_actor");
              setViewMode("visual3d");
              setMobileSheetTab("canvas");
              showToast(`Modelo "${foundToy?.label || modelId}" listo para colocar`);
            }}
            onUseTextureInMode8={(textureName) => {
              setSelectedWallTex(textureName);
              setSelectedFlatTex(textureName);
              setThreeTool("paint_3d");
              setViewMode("visual3d");
              setMobileSheetTab("canvas");
              showToast(`Textura "${textureName}" lista para pintar`);
            }}
            onFeedback={showToast}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-4 lg:px-3 py-2 bg-[#F7F8FA] border-b border-[#E2E8F0] flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setJuegoSubTab("rules")}
            className={`flex-1 min-h-[36px] lg:min-h-[30px] px-2 rounded-lg text-xs lg:text-[11px] font-bold transition-colors cursor-pointer ${
              juegoSubTab === "rules" ? "bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]" : "text-[#4B5563]"
            }`}
          >
            Cámara
          </button>
          <button
            type="button"
            onClick={() => setJuegoSubTab("menus")}
            className={`flex-1 min-h-[36px] lg:min-h-[30px] px-2 rounded-lg text-xs lg:text-[11px] font-bold transition-colors cursor-pointer ${
              juegoSubTab === "menus" ? "bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]" : "text-[#4B5563]"
            }`}
          >
            Menú 3D
          </button>
          <button
            type="button"
            onClick={() => setJuegoSubTab("code")}
            className={`flex-1 min-h-[36px] lg:min-h-[30px] px-2 rounded-lg text-xs lg:text-[11px] font-bold transition-colors cursor-pointer ${
              juegoSubTab === "code" ? "bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]" : "text-[#4B5563]"
            }`}
          >
            Código
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {juegoSubTab === "rules" && renderRulesConfigurator()}
          {juegoSubTab === "menus" && renderMenusConfigurator()}
          {juegoSubTab === "code" && renderLiveCodeInspector()}
        </div>
      </div>
    );
  };

  // In-Visor Start Menu visual preview matching selected theme
  const activeMenuPreviewStyle = useMemo(() => {
    switch (gameConfig.menuTheme) {
      case "doom_dark":
        return { bg: "bg-zinc-900/95 border-red-600 text-yellow-400", sub: "text-slate-300", btn: "bg-red-700 text-white", idle: "bg-zinc-800 text-slate-200 border-zinc-700" };
      case "cyber_neon":
        return { bg: "bg-[#0b132b]/95 border-cyan-500 text-sky-400", sub: "text-cyan-200", btn: "bg-sky-600 text-white", idle: "bg-[#162347] text-sky-100 border-cyan-800" };
      case "medieval_gold":
        return { bg: "bg-[#1f1712]/95 border-amber-600 text-amber-200", sub: "text-stone-300", btn: "bg-amber-700 text-white", idle: "bg-[#292019] text-amber-100 border-amber-800/60" };
      default:
        return { bg: "bg-white/95 border-[#7C2D48] text-[#111827]", sub: "text-[#4B5563]", btn: "bg-[#7C2D48] text-white", idle: "bg-[#F1F5F9] text-[#1E293B] border-[#CBD5E1]" };
    }
  }, [gameConfig.menuTheme]);

  const activeSwatch = useMemo(
    () =>
      allMaterialSwatches.find((sw) => sw.wall === selectedWallTex && sw.flat === selectedFlatTex) ||
      allMaterialSwatches.find((sw) => sw.wall === selectedWallTex || sw.flat === selectedFlatTex) ||
      allMaterialSwatches[0],
    [allMaterialSwatches, selectedWallTex, selectedFlatTex]
  );

  return (
    <div
      ref={editorRootRef}
      className={`${
        isEditorFullscreen ? "fixed inset-0 z-[100] pt-safe pb-safe pl-safe pr-safe" : "relative w-full h-full"
      } flex flex-col flex-1 flex-grow min-h-0 bg-[#F7F8FA] text-[#111827] select-none overflow-hidden font-sans`}
    >
      {/* 1. SINGLE SLIM TOP BAR (No multi-row wrapping on mobile) */}
      <div className="h-11 sm:h-12 px-2 sm:px-3 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0 z-30">
        {/* Left: File Menu & Level Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="relative lg:hidden">
            <button
              type="button"
              onClick={() => setShowMobileMenu((v) => !v)}
              className={`min-h-[36px] min-w-[36px] px-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                showMobileMenu ? "bg-[#7C2D48] text-white border-[#7C2D48]" : "bg-[#F7F8FA] text-[#111827] border-[#E2E8F0]"
              }`}
              aria-label="Menú del nivel 3D"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Nivel</span>
            </button>

            {showMobileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
                <div className="absolute left-0 top-full mt-1.5 w-64 max-h-[75dvh] overflow-y-auto bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-2xl py-2 z-50 text-xs">
                  <button
                    type="button"
                    onClick={() => { setIsLoadModalOpen(true); setShowMobileMenu(false); }}
                    className="w-full min-h-[44px] px-3.5 py-2 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5 font-semibold"
                  >
                    <FolderOpen className="w-4 h-4 text-[#7C2D48]" />
                    <span>Cargar Nivel / Plantillas...</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleQuickSave(); setShowMobileMenu(false); }}
                    className="w-full min-h-[44px] px-3.5 py-2 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5"
                  >
                    <Save className="w-4 h-4 text-[#2F6F4E]" />
                    <span>Guardar Rápido</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSaveModalOpen(true); setShowMobileMenu(false); }}
                    className="w-full min-h-[44px] px-3.5 py-2 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5"
                  >
                    <Save className="w-4 h-4 text-[#7C2D48]" />
                    <span>Guardar Como...</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleDownloadLevelFile(); setShowMobileMenu(false); }}
                    className="w-full min-h-[44px] px-3.5 py-2 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5"
                  >
                    <Download className="w-4 h-4 text-[#4B5563]" />
                    <span>Descargar (.divlvl)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsTutorialOpen(true); setShowMobileMenu(false); }}
                    className="w-full min-h-[44px] px-3.5 py-2 text-left hover:bg-[#FDF2F5] text-[#7C2D48] flex items-center gap-2.5 font-bold"
                  >
                    <GraduationCap className="w-4 h-4 text-[#7C2D48]" />
                    <span>Tutorial Interactivo 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsHelpModalOpen(true); setShowMobileMenu(false); }}
                    className="w-full min-h-[44px] px-3.5 py-2 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5"
                  >
                    <HelpCircle className="w-4 h-4 text-[#4B5563]" />
                    <span>Guía Rápida Modo 8</span>
                  </button>
                  <div className="h-px bg-[#E2E8F0] my-1" />
                  <button
                    type="button"
                    onClick={() => { handleResetLevel(); setShowMobileMenu(false); }}
                    className="w-full min-h-[44px] px-3.5 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2.5 font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Nuevo Mapa en Blanco</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <span className="text-[#111827] text-xs font-bold truncate max-w-[84px] sm:max-w-[150px] lg:max-w-[190px]" title={gameConfig.title}>
            {gameConfig.title}
          </span>

          {/* Desktop compact menus */}
          <div className="relative hidden lg:flex items-center gap-0.5 text-[11px] text-[#334155]">
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === "project" ? null : "project")}
                className={`px-2 py-1 rounded-md cursor-pointer ${
                  activeMenu === "project" ? "bg-[#7C2D48] text-white font-semibold" : "hover:bg-[#F1F5F9]"
                }`}
              >
                Proyecto
              </button>
              {activeMenu === "project" && (
                <div className="absolute left-0 top-full mt-1 w-60 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg shadow-xl py-1 z-50 text-xs">
                  <button type="button" onClick={() => { setIsLoadModalOpen(true); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-[#7C2D48]" /><span>Cargar Nivel / Plantillas...</span>
                  </button>
                  <button type="button" onClick={() => { handleQuickSave(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-[#2F6F4E]" /><span>Guardar Rápido</span>
                  </button>
                  <button type="button" onClick={() => { setIsSaveModalOpen(true); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-[#7C2D48]" /><span>Guardar Nivel Como...</span>
                  </button>
                  <button type="button" onClick={() => { handleDownloadLevelFile(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-[#4B5563]" /><span>Descargar (.divlvl)</span>
                  </button>
                  <label className="w-full px-3 py-1.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#7C2D48]" /><span>Importar WAD / Nivel</span>
                    <input type="file" accept=".wad,.divlvl,.json,.txt" onChange={(e) => { handleImportFile(e); setActiveMenu(null); }} className="hidden" />
                  </label>
                  <div className="h-px bg-[#E2E8F0] my-1" />
                  <button type="button" onClick={() => { handleResetLevel(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium">
                    <Trash2 className="w-3.5 h-3.5" /><span>Nuevo Mapa en Blanco</span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === "presets" ? null : "presets")}
                className={`px-2 py-1 rounded-md cursor-pointer ${
                  activeMenu === "presets" ? "bg-[#7C2D48] text-white font-semibold" : "hover:bg-[#F1F5F9]"
                }`}
              >
                Plantillas
              </button>
              {activeMenu === "presets" && (
                <div className="absolute left-0 top-full mt-1 w-72 max-h-[70dvh] overflow-y-auto bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg shadow-xl py-1 z-50 text-xs">
                  {BUILTIN_LEVEL_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { handleLoadLevelData(p); setActiveMenu(null); }}
                      className="w-full px-3 py-2 text-left hover:bg-[#F7F8FA] flex flex-col gap-0.5 border-b border-[#E2E8F0] last:border-0"
                    >
                      <div className="font-semibold text-[#7C2D48] flex items-center justify-between gap-2">
                        <span className="truncate">{p.name}</span>
                        <span className="text-[10px] text-[#64748B] font-mono shrink-0">{p.sectors.length} sect</span>
                      </div>
                      <span className="text-[10px] text-[#4B5563] line-clamp-1">{p.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsTutorialOpen((v) => !v)}
              className={`px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                isTutorialOpen ? "bg-[#7C2D48] text-white font-semibold" : "hover:bg-[#F1F5F9] text-[#7C2D48] font-semibold"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Tutorial</span>
            </button>

            <button
              type="button"
              onClick={() => { setIsHelpModalOpen(true); setActiveMenu(null); }}
              className="px-2 py-1 hover:bg-[#F1F5F9] text-[#334155] rounded-md flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Ayuda</span>
            </button>
          </div>
        </div>

        {/* Center: Clean Segmented Viewport Switcher */}
        <div className="flex items-center gap-0.5 bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E2E8F0] flex-shrink-0">
          {[
            { id: "visual3d" as const, icon: Eye, mob: "3D", desk: "Visor 3D" },
            { id: "map2d" as const, icon: Grid, mob: "2D", desk: "Mapa 2D" },
            { id: "split" as const, icon: SplitSquareVertical, mob: "2+3D", desk: "2D + 3D" },
            { id: "code" as const, icon: FileCode, mob: "DIV", desk: "Código" },
          ].map((vm) => {
            const Icon = vm.icon;
            return (
              <button
                key={vm.id}
                type="button"
                onClick={() => {
                  setViewMode(vm.id);
                  setMobileSheetTab("canvas");
                }}
                className={`min-h-[32px] px-2 sm:px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === vm.id ? "bg-white text-[#7C2D48] shadow-xs" : "text-[#4B5563] hover:text-[#111827]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="sm:hidden">{vm.mob}</span>
                <span className="hidden sm:inline">{vm.desk}</span>
              </button>
            );
          })}
        </div>

        {/* Right: AI 3D, Undo, Fullscreen, Play */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {onOpenAiAssistant && (
            <button
              type="button"
              onClick={onOpenAiAssistant}
              className="min-h-[36px] px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-[#F3D0DC] bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] cursor-pointer whitespace-nowrap"
              title="Abrir IA Local con Bloques de Trabajo 3D"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>IA 3D</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoCount === 0}
            className="min-h-[36px] min-w-[36px] px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 border border-[#E2E8F0] bg-[#F7F8FA] hover:bg-white disabled:opacity-40 cursor-pointer"
            title="Deshacer último cambio (Ctrl+Z)"
            aria-label="Deshacer"
          >
            <Undo2 className="w-4 h-4 text-[#7C2D48]" />
            <span className="hidden xl:inline">Deshacer</span>
          </button>

          <button
            type="button"
            onClick={() => toggleEditorFullscreen(editorRootRef.current)}
            className={`min-h-[36px] min-w-[36px] px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 border cursor-pointer ${
              isEditorFullscreen
                ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                : "bg-[#F7F8FA] hover:bg-white text-[#111827] border-[#E2E8F0]"
            }`}
            title={isEditorFullscreen ? "Salir de pantalla completa" : "Editor 3D en pantalla completa"}
            aria-label={isEditorFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isEditorFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-[#4B5563]" />}
          </button>

          <button
            type="button"
            onClick={handleSyncToCodeEditor}
            className="min-h-[36px] px-2.5 py-1 bg-white hover:bg-[#F7F8FA] text-[#111827] rounded-lg text-[11px] font-semibold hidden lg:flex items-center gap-1 border border-[#CBD5E1] cursor-pointer"
            title="Enviar este código auto-generado al editor principal DIV"
          >
            <FileCode className="w-3.5 h-3.5 text-[#7C2D48]" />
            <span>Sync DIV</span>
          </button>

          <button
            type="button"
            onClick={handleLaunchAndSave}
            className="min-h-[36px] px-2.5 sm:px-3 py-1 bg-[#2F6F4E] hover:bg-[#255a3e] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="sm:hidden">Jugar</span>
            <span className="hidden sm:inline">Probar 3D</span>
          </button>
        </div>
      </div>

      {/* 2. DESKTOP-ONLY SINGLE BUILDER TOOLBAR (Hidden on mobile so canvas stays spacious!) */}
      <div className="hidden lg:flex px-3 py-1.5 bg-[#FFFFFF] border-b border-[#E2E8F0] items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          {THREE_BUILDER_TOOLS.map((tb) => {
            const Icon = tb.icon;
            const active = threeTool === tb.id;
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => {
                  setThreeTool(tb.id);
                  if (viewMode === "map2d" || viewMode === "code") setViewMode("split");
                }}
                className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? tb.id === "erase_3d"
                      ? "bg-red-600 text-white border-red-600 shadow-xs"
                      : "bg-[#7C2D48] text-white border-[#7C2D48] shadow-xs"
                    : "bg-[#F7F8FA] text-[#111827] border-[#CBD5E1] hover:bg-[#F1F5F9]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{tb.label}</span>
              </button>
            );
          })}
        </div>

        {/* Swatches or Toys */}
        <div className="flex items-center gap-2 overflow-x-auto min-w-0">
          {threeTool === "lego_block" && (
            <div className="flex items-center gap-1 bg-[#F7F8FA] px-1.5 py-0.5 rounded-lg border border-[#CBD5E1] text-[10px] flex-shrink-0">
              {([1, 2] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setLegoSize(sz)}
                  className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                    legoSize === sz ? "bg-[#7C2D48] text-white" : "text-[#4B5563] hover:bg-white"
                  }`}
                >
                  {sz}×{sz}
                </button>
              ))}
              <span className="text-[#CBD5E1]">|</span>
              {([0.5, 1.0, 1.5] as const).map((hStep) => (
                <button
                  key={hStep}
                  type="button"
                  onClick={() => setLegoStepHeight(hStep)}
                  className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                    legoStepHeight === hStep ? "bg-[#2F6F4E] text-white" : "text-[#4B5563] hover:bg-white"
                  }`}
                >
                  +{hStep}m
                </button>
              ))}
            </div>
          )}

          {threeTool === "lego_actor" ? (
            <div className="flex items-center gap-1">
              {allKidToys.map((toy) => {
                const active = selectedKidToy.id === toy.id;
                return (
                  <button
                    key={toy.id}
                    type="button"
                    onClick={() => setSelectedKidToy(toy)}
                    className={`min-h-[30px] px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border whitespace-nowrap cursor-pointer ${
                      active
                        ? "bg-[#2F6F4E] text-white border-[#2F6F4E]"
                        : "bg-[#F7F8FA] text-[#111827] border-[#CBD5E1] hover:bg-white"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: toy.color }} />
                    <span>{toy.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {allMaterialSwatches.map((sw) => {
                const active = selectedWallTex === sw.wall && selectedFlatTex === sw.flat;
                return (
                  <button
                    key={sw.id}
                    type="button"
                    onClick={() => {
                      setSelectedFlatTex(sw.flat);
                      setSelectedWallTex(sw.wall);
                    }}
                    className={`min-h-[30px] px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border whitespace-nowrap cursor-pointer ${
                      active
                        ? "bg-[#111827] text-white border-[#111827]"
                        : "bg-[#F7F8FA] text-[#111827] border-[#CBD5E1] hover:bg-white"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-xs border border-black/30 flex-shrink-0" style={{ backgroundColor: sw.color }} />
                    <span>{sw.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick Height + Grid + Metadata */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              markEdited();
              setSectors((prev) =>
                prev.map((s) =>
                  s.id === curSector.id ? { ...s, floorHeight: Number((s.floorHeight + 0.5).toFixed(2)) } : s
                )
              );
            }}
            className="min-h-[28px] px-2 rounded-md bg-[#EEF6F1] hover:bg-[#DCEEE3] text-[#2F6F4E] border border-[#CFE4D7] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            title="Subir el suelo del sector seleccionado"
          >
            <ArrowUp className="w-3 h-3" />
            <span>S{curSector.id}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              markEdited();
              setSectors((prev) =>
                prev.map((s) =>
                  s.id === curSector.id ? { ...s, floorHeight: Number((s.floorHeight - 0.5).toFixed(2)) } : s
                )
              );
            }}
            className="min-h-[28px] px-2 rounded-md bg-[#FDF2F5] hover:bg-[#FCE7F3] text-[#7C2D48] border border-[#F3D0DC] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            title="Bajar el suelo del sector seleccionado"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => fitMapToView()}
            className="min-h-[28px] px-2 bg-[#F7F8FA] hover:bg-[#E2E8F0] text-[#7C2D48] border border-[#CBD5E1] rounded-md text-[10px] font-bold cursor-pointer"
          >
            Centrar 2D
          </button>
          <span className="hidden xl:inline text-[11px] text-[#6B7280] tabular-nums pl-1">
            {sectors.length} sect · {placedVoxels.length + placedModels.length} obj
          </span>
        </div>
      </div>

      {/* 3. WORKBENCH BODY: EXPANSIVE CANVAS + DESKTOP DOCKS + MOBILE SHEET */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT DOCK: GROUPED 2D TOOLS (Desktop lg+) */}
        <aside className="hidden lg:flex w-48 flex-shrink-0 flex-col bg-[#FFFFFF] border-r border-[#E2E8F0] overflow-y-auto">
          {renderToolsContent(false)}
        </aside>

        {/* CENTER EXPANSIVE VIEWPORT */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden relative">
          <div className="flex flex-1 min-w-0 min-h-0 flex-col sm:flex-row overflow-hidden relative">
            {viewMode === "code" ? (
              <div className="flex-1 min-h-0 flex flex-col bg-[#0F172A] text-slate-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">Código DIV Auto-Generado</span>
                    <span className="text-[11px] text-slate-400 tabular-nums">({generatedDivCode.split("\n").length} líneas)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDivCode}
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncToCodeEditor}
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-[#7C2D48] hover:bg-[#66233a] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Abrir en Editor</span>
                    </button>
                  </div>
                </div>
                <pre className="flex-1 min-h-0 overflow-auto p-4 font-mono text-xs leading-relaxed select-text">
                  {generatedDivCode}
                </pre>
              </div>
            ) : (
              <>
                {/* 2D Overhead Map Canvas */}
                {(viewMode === "map2d" || viewMode === "split") && (
                  <div
                    ref={mapContainerRef}
                    onDragOver={handleViewportDragOver}
                    onDragLeave={() => setCanvasDropHint(null)}
                    onDrop={handleDropOn2DCanvas}
                    className={`relative min-w-0 min-h-0 ${
                      viewMode === "split"
                        ? "w-full h-1/2 sm:w-1/2 sm:h-full border-b sm:border-b-0 sm:border-r border-[#CBD5E1]"
                        : "w-full h-full"
                    } ${canvasDropHint ? "ring-2 ring-inset ring-[#7C2D48]" : ""}`}
                  >
                    <canvas
                      ref={mapCanvasRef}
                      width={640}
                      height={480}
                      className={`w-full h-full block touch-none ${
                        currentTool === "move" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
                      }`}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onWheel={handleCanvasWheel}
                      onContextMenu={(e) => e.preventDefault()}
                    />

                    {/* Subtle 2D Tool Hint */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-950/75 backdrop-blur-sm text-slate-200 border border-white/10 text-[10px] font-medium pointer-events-none max-w-[72%] truncate">
                      {currentTool === "select" && "Arrastra el fondo para moverte · Toca para elegir"}
                      {currentTool === "move" && "Arrastra el plano 2D"}
                      {currentTool === "quickroom" && "Toca para crear plataforma 4×4"}
                      {currentTool === "polyline" && "Toca vértices para trazar sector"}
                      {currentTool === "line" && (lineStartPoint ? "Toca el punto final" : "Toca el inicio de la pared")}
                      {currentTool === "stairs" && "Toca donde construir escalera"}
                      {currentTool === "sector_fill" && `Toca sector para pintar (${selectedFlatTex})`}
                      {currentTool === "new_thing" && `Toca para colocar: ${selectedThingPreset.name}`}
                      {currentTool === "voxel" && `Toca para colocar: ${selectedVoxelType.replace("voxel_", "")}`}
                      {currentTool === "move_cam" && "Toca para mover cámara 3D"}
                    </div>

                    {/* Polyline action buttons */}
                    {currentTool === "polyline" && polyVertices.length > 0 && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
                        <button
                          type="button"
                          onClick={() => setPolyVertices((prev) => prev.slice(0, -1))}
                          className="min-h-[38px] px-3 py-1.5 bg-slate-900/90 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Deshacer</span>
                        </button>
                        {polyVertices.length >= 3 && (
                          <button
                            type="button"
                            onClick={closePolygonAndCreateSector}
                            className="min-h-[38px] px-3.5 py-1.5 bg-[#2F6F4E] hover:bg-[#255a3e] text-white text-xs font-bold rounded-xl shadow-lg border border-white/20 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Cerrar ({polyVertices.length})</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Cancel 2-point line */}
                    {currentTool === "line" && lineStartPoint && (
                      <button
                        type="button"
                        onClick={() => setLineStartPoint(null)}
                        className="absolute bottom-3 left-3 min-h-[38px] px-3.5 py-1.5 bg-slate-900/90 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/40 z-20 cursor-pointer"
                      >
                        Cancelar Línea
                      </button>
                    )}

                    {/* Compact On-Canvas Map Pan & Fit HUD */}
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-slate-950/80 backdrop-blur-sm border border-white/15 rounded-xl p-1 shadow-lg z-20">
                      <button
                        type="button"
                        onClick={() => setPanOffset((p) => ({ ...p, x: p.x + 64 }))}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center justify-center cursor-pointer"
                        title="Desplazar izquierda"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPanOffset((p) => ({ ...p, y: p.y + 64 }))}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center justify-center cursor-pointer"
                        title="Desplazar arriba"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPanOffset((p) => ({ ...p, y: p.y - 64 }))}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center justify-center cursor-pointer"
                        title="Desplazar abajo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPanOffset((p) => ({ ...p, x: p.x - 64 }))}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center justify-center cursor-pointer"
                        title="Desplazar derecha"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fitMapToView()}
                        className="h-8 px-2.5 rounded-lg bg-[#7C2D48] hover:bg-[#66233a] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Centrar mapa"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Live 3D Walkthrough Visor (Full-Bleed Edge-to-Edge!) */}
                {(viewMode === "visual3d" || viewMode === "split") && (
                  <div
                    ref={visual3DContainerRef}
                    onDragOver={handleViewportDragOver}
                    onDragLeave={() => setCanvasDropHint(null)}
                    onDrop={handleDropOn3DCanvas}
                    className={`relative min-w-0 min-h-0 bg-[#0F172A] flex items-center justify-center overflow-hidden ${
                      viewMode === "split" ? "w-full h-1/2 sm:w-1/2 sm:h-full" : "w-full h-full"
                    } ${canvasDropHint ? "ring-2 ring-inset ring-[#2563EB]" : ""}`}
                  >
                    {canvasDropHint && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-xl bg-[#7C2D48] text-white text-xs font-bold shadow-lg pointer-events-none">
                        {canvasDropHint}
                      </div>
                    )}
                    <canvas
                      ref={visual3DCanvasRef}
                      width={640}
                      height={480}
                      className={`w-full h-full block touch-none ${
                        threeTool === "look" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
                      }`}
                      onContextMenu={(e) => e.preventDefault()}
                      onPointerDown={(e) => {
                        lookDragRef.current = {
                          active: true,
                          button: e.button,
                          startX: e.clientX,
                          startY: e.clientY,
                          lastX: e.clientX,
                          lastY: e.clientY,
                          moved: false,
                        };
                        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
                      }}
                      onPointerMove={(e) => {
                        const ndc = get3DCanvasNdc(e.clientX, e.clientY);
                        if (ndc && threeTool !== "look") {
                          const fallbackFloor = sectors.find((s) => s.id === selectedSectorId)?.floorHeight ?? 0;
                          const picked = pickMode8ThreeSurface(ndc.ndcX, ndc.ndcY, fallbackFloor);
                          if (picked) setHoverPick(picked);
                        }
                        if (!lookDragRef.current.active) return;
                        const totalDist = Math.hypot(
                          e.clientX - lookDragRef.current.startX,
                          e.clientY - lookDragRef.current.startY
                        );
                        if (totalDist > 5 || threeTool === "look" || lookDragRef.current.button === 2) {
                          lookDragRef.current.moved = true;
                          const dx = e.clientX - lookDragRef.current.lastX;
                          const dy = e.clientY - lookDragRef.current.lastY;
                          cam3DRef.current.angle += dx * 0.35;
                          cam3DRef.current.pitch = Math.max(-60, Math.min(60, cam3DRef.current.pitch - dy * 0.25));
                        }
                        lookDragRef.current.lastX = e.clientX;
                        lookDragRef.current.lastY = e.clientY;
                      }}
                      onPointerUp={(e) => {
                        const wasMoved = lookDragRef.current.moved;
                        const btn = lookDragRef.current.button;
                        lookDragRef.current.active = false;
                        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
                        if (!wasMoved && btn === 0) {
                          execute3DBuilderClick(e.clientX, e.clientY, e.shiftKey || e.altKey);
                        }
                      }}
                      onPointerLeave={() => {
                        setHoverPick(null);
                      }}
                      onPointerCancel={() => {
                        lookDragRef.current.active = false;
                      }}
                      onWheel={(e) => {
                        if (threeTool === "sculpt_3d") {
                          const ndc = get3DCanvasNdc(e.clientX, e.clientY);
                          const hit = ndc ? pickMode8ThreeSurface(ndc.ndcX, ndc.ndcY, 0) : null;
                          const secId = hit?.sectorId ?? selectedSectorId;
                          const targetSec = sectors.find((s) => s.id === secId);
                          if (targetSec) {
                            markEdited();
                            const step = e.deltaY < 0 ? 0.25 : -0.25;
                            const nextFloor = Number(Math.max(-1.5, Math.min(targetSec.ceilHeight - 1.2, targetSec.floorHeight + step)).toFixed(2));
                            setSectors((prev) => prev.map((s) => (s.id === secId ? { ...s, floorHeight: nextFloor } : s)));
                          }
                          return;
                        }
                        const rad = (cam3DRef.current.angle * Math.PI) / 180;
                        const step = e.deltaY < 0 ? 0.55 : -0.55;
                        cam3DRef.current.x += Math.cos(rad) * step;
                        cam3DRef.current.y += Math.sin(rad) * step;
                      }}
                    />

                    {/* Minimal Floating Top-Right Camera & Preview Overlay */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-auto z-20">
                      <div className="flex items-center bg-slate-950/75 backdrop-blur-sm border border-white/15 rounded-xl p-0.5 gap-0.5">
                        <Camera className="w-3.5 h-3.5 text-cyan-400 mx-1.5 hidden sm:inline" />
                        {(
                          [
                            { id: "third_person", label: "3ª" },
                            { id: "fps", label: "FPS" },
                            { id: "isometric", label: "Iso" },
                            { id: "orbit", label: "Órb" },
                          ] as const
                        ).map((cm) => (
                          <button
                            key={cm.id}
                            type="button"
                            onClick={() => {
                              markEdited();
                              setGameConfig((prev) => ({ ...prev, cameraMode: cm.id }));
                            }}
                            className={`min-h-[28px] px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                              gameConfig.cameraMode === cm.id
                                ? "bg-[#7C2D48] text-white"
                                : "text-slate-300 hover:text-white"
                            }`}
                            title={`Vista ${cm.label}`}
                          >
                            {cm.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowMenuPreview((m) => !m)}
                        className={`min-h-[30px] px-2.5 py-1 rounded-xl text-[11px] font-semibold border backdrop-blur-sm cursor-pointer hidden sm:inline-flex items-center ${
                          showMenuPreview
                            ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                            : "bg-slate-950/75 text-slate-200 border-white/15"
                        }`}
                      >
                        Menú
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const p = entities.find((ent) => ent.type === "player");
                          const px = p ? p.x / 64 : 4.5;
                          const py = p ? p.y / 64 : 7.5;
                          const pf = findSectorAtPoint(px, py, tracedSectors)?.floorHeight ?? 0;
                          setCam3D({
                            x: px,
                            y: py,
                            z: pf,
                            angle: 0,
                            pitch: 0,
                          });
                        }}
                        className="min-h-[30px] min-w-[30px] px-2 py-1 rounded-xl bg-slate-950/75 backdrop-blur-sm text-slate-200 border border-white/15 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        title="Volver cámara al jugador"
                        aria-label="Centrar cámara en jugador"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Interactive Live Menu Preview Overlay */}
                    {showMenuPreview && (
                      <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center p-4 z-30">
                        <div className={`w-full max-w-xs rounded-2xl border-2 p-4 shadow-2xl text-center space-y-3 ${activeMenuPreviewStyle.bg}`}>
                          <div className="flex items-center justify-between text-[10px] opacity-75">
                            <span className="font-mono uppercase">{gameConfig.gameMode} · {gameConfig.difficulty}</span>
                            <button type="button" onClick={() => setShowMenuPreview(false)} className="p-1 hover:opacity-100 cursor-pointer">✕</button>
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold tracking-tight">{gameConfig.title || "Mi Juego 3D"}</h3>
                            <p className={`text-[11px] mt-0.5 ${activeMenuPreviewStyle.sub}`}>{gameConfig.subtitle}</p>
                          </div>
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={handleLaunchAndSave}
                              className={`w-full min-h-[40px] py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer ${activeMenuPreviewStyle.btn}`}
                            >
                              ▶ {gameConfig.playButtonText || "Jugar Ahora"}
                            </button>
                            {gameConfig.showWeaponSelect && gameConfig.gameMode !== "exploration" && (
                              <div className={`w-full py-1.5 rounded-lg text-[11px] font-semibold border ${activeMenuPreviewStyle.idle}`}>
                                Arma Inicial: {gameConfig.startingWeapon}
                              </div>
                            )}
                            {gameConfig.showControlsButton && (
                              <div className={`w-full py-1.5 rounded-lg text-[11px] font-semibold border ${activeMenuPreviewStyle.idle}`}>
                                Controles y Ayuda
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Touch D-Pad + Jump on < lg screens */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-end gap-2 pointer-events-none z-20 lg:hidden">
                      <div className="grid grid-cols-3 gap-1 pointer-events-auto">
                        <div />
                        <button {...bindHoldKey("w")} className="w-10 h-10 rounded-xl bg-slate-950/70 backdrop-blur-sm active:bg-[#7C2D48] border border-white/20 text-white flex items-center justify-center touch-none">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <div />
                        <button {...bindHoldKey("arrowleft")} className="w-10 h-10 rounded-xl bg-slate-950/70 backdrop-blur-sm active:bg-[#7C2D48] border border-white/20 text-white flex items-center justify-center touch-none">
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button {...bindHoldKey("s")} className="w-10 h-10 rounded-xl bg-slate-950/70 backdrop-blur-sm active:bg-[#7C2D48] border border-white/20 text-white flex items-center justify-center touch-none">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button {...bindHoldKey("arrowright")} className="w-10 h-10 rounded-xl bg-slate-950/70 backdrop-blur-sm active:bg-[#7C2D48] border border-white/20 text-white flex items-center justify-center touch-none">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Block Elevation Steppers on < lg screens */}
                    {(threeTool === "lego_block" || threeTool === "sculpt_3d") && (
                      <div className="absolute bottom-2.5 right-2.5 flex flex-col gap-1.5 pointer-events-auto z-20 lg:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            markEdited();
                            setSectors((prev) =>
                              prev.map((s) =>
                                s.id === curSector.id ? { ...s, floorHeight: Number((s.floorHeight + 0.5).toFixed(2)) } : s
                              )
                            );
                          }}
                          className="min-h-[38px] px-2.5 rounded-xl bg-slate-950/75 backdrop-blur-sm active:bg-[#2F6F4E] text-emerald-300 border border-white/20 text-[11px] font-bold flex items-center gap-1"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                          <span>+0.5m</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            markEdited();
                            setSectors((prev) =>
                              prev.map((s) =>
                                s.id === curSector.id ? { ...s, floorHeight: Number((s.floorHeight - 0.5).toFixed(2)) } : s
                              )
                            );
                          }}
                          className="min-h-[38px] px-2.5 rounded-xl bg-slate-950/75 backdrop-blur-sm active:bg-[#7C2D48] text-rose-300 border border-white/20 text-[11px] font-bold flex items-center gap-1"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                          <span>-0.5m</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 4. MOBILE THUMB DOCK (< lg): Tool Strip + 4 Grouped Destinations */}
          <div className="lg:hidden bg-white border-t border-[#E2E8F0] flex-shrink-0 z-30">
            {/* Contextual Tool Row when on Construir Canvas */}
            {mobileSheetTab === "canvas" && viewMode !== "code" && (
              <div className="px-2 py-1.5 border-b border-[#F1F5F9] flex items-center gap-1.5">
                <div className="flex-1 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {viewMode === "map2d" ? (
                    TOOL_LIST.slice(0, 8).map((tool) => {
                      const Icon = tool.icon;
                      const active = currentTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => {
                            setCurrentTool(tool.id);
                            if (tool.id === "stairs") setShowStairsDialog(true);
                            if (tool.id !== "polyline") setPolyVertices([]);
                            if (tool.id !== "line") setLineStartPoint(null);
                          }}
                          className={`min-h-[38px] px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border whitespace-nowrap flex-shrink-0 cursor-pointer ${
                            active
                              ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                              : "bg-[#F7F8FA] text-[#111827] border-[#E2E8F0]"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{tool.label.replace(/^\+\s*/, "")}</span>
                        </button>
                      );
                    })
                  ) : (
                    THREE_BUILDER_TOOLS.map((tb) => {
                      const Icon = tb.icon;
                      const active = threeTool === tb.id;
                      return (
                        <button
                          key={tb.id}
                          type="button"
                          onClick={() => setThreeTool(tb.id)}
                          className={`min-h-[38px] px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border whitespace-nowrap flex-shrink-0 cursor-pointer ${
                            active
                              ? tb.id === "erase_3d"
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-[#7C2D48] text-white border-[#7C2D48]"
                              : "bg-[#F7F8FA] text-[#111827] border-[#E2E8F0]"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{tb.shortLabel}</span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Quick Material / Toy / Size Picker Trigger */}
                {viewMode !== "map2d" && (
                  <button
                    type="button"
                    onClick={() => setShowQuickPicker((v) => !v)}
                    className={`min-h-[38px] px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                      showQuickPicker
                        ? "bg-[#111827] text-white border-[#111827]"
                        : "bg-[#FDF2F5] text-[#7C2D48] border-[#F3D0DC]"
                    }`}
                    title="Elegir color, tamaño o actor 3D"
                  >
                    <span
                      className="w-3 h-3 rounded-xs border border-black/25 flex-shrink-0"
                      style={{ backgroundColor: threeTool === "lego_actor" ? selectedKidToy.color : activeSwatch.color }}
                    />
                    <span className="max-w-[64px] truncate">
                      {threeTool === "lego_actor"
                        ? selectedKidToy.label
                        : `${legoSize}×${legoSize}`}
                    </span>
                    {showQuickPicker ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}

            {/* 5 Clean Grouped Destinations */}
            <div className="grid grid-cols-5 h-12">
              {[
                { id: "canvas" as const, label: "Construir", icon: Blocks },
                { id: "mundo" as const, label: "Mundo", icon: Layers },
                { id: "objetos" as const, label: "Objetos", icon: Package },
                { id: "activos" as const, label: "Activos", icon: FolderOpen },
                { id: "juego" as const, label: "Juego", icon: Sliders },
              ].map((nav) => {
                const Icon = nav.icon;
                const active = mobileSheetTab === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => {
                      setShowQuickPicker(false);
                      if (nav.id === "canvas") {
                        setMobileSheetTab("canvas");
                      } else {
                        setInspectorGroup(nav.id);
                        setMobileSheetTab((prev) => (prev === nav.id ? "canvas" : nav.id));
                      }
                    }}
                    className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      active ? "text-[#7C2D48] bg-[#FDF2F5]/70" : "text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "stroke-[2.4]" : ""}`} />
                    <span>{nav.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MOBILE QUICK COLOR / SIZE / TOY PICKER POPOVER (< lg) */}
          {showQuickPicker && mobileSheetTab === "canvas" && (
            <div className="lg:hidden absolute inset-0 z-30 flex flex-col justify-end bg-black/30 backdrop-blur-[1px]" onClick={() => setShowQuickPicker(false)}>
              <div
                className="bg-white rounded-t-2xl border-t border-[#E2E8F0] shadow-2xl p-4 space-y-4 max-h-[65dvh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#111827]">
                    {threeTool === "lego_actor" ? "Elegir Actor / Objeto 3D" : "Material 3D y Tamaño"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickPicker(false)}
                    className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-[#4B5563] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {threeTool === "lego_actor" ? (
                  <div className="grid grid-cols-2 gap-2">
                    {allKidToys.map((toy) => {
                      const active = selectedKidToy.id === toy.id;
                      return (
                        <button
                          key={toy.id}
                          type="button"
                          onClick={() => {
                            setSelectedKidToy(toy);
                            setShowQuickPicker(false);
                          }}
                          className={`min-h-[46px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer ${
                            active
                              ? "bg-[#2F6F4E] text-white border-[#2F6F4E]"
                              : "bg-[#F7F8FA] text-[#111827] border-[#E2E8F0]"
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full border border-black/20 flex-shrink-0" style={{ backgroundColor: toy.color }} />
                          <span className="truncate">{toy.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#4B5563]">Tamaño Bloque</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {([1, 2] as const).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setLegoSize(sz)}
                              className={`min-h-[40px] rounded-xl font-bold text-xs border cursor-pointer ${
                                legoSize === sz
                                  ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                                  : "bg-[#F7F8FA] text-[#111827] border-[#E2E8F0]"
                              }`}
                            >
                              {sz}×{sz}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#4B5563]">Altura por toque</span>
                        <div className="grid grid-cols-3 gap-1">
                          {([0.5, 1.0, 1.5] as const).map((hStep) => (
                            <button
                              key={hStep}
                              type="button"
                              onClick={() => setLegoStepHeight(hStep)}
                              className={`min-h-[40px] rounded-xl font-bold text-[11px] border cursor-pointer ${
                                legoStepHeight === hStep
                                  ? "bg-[#2F6F4E] text-white border-[#2F6F4E]"
                                  : "bg-[#F7F8FA] text-[#111827] border-[#E2E8F0]"
                              }`}
                            >
                              +{hStep}m
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-[#4B5563]">Color / Material 3D</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {allMaterialSwatches.map((sw) => {
                          const active = selectedWallTex === sw.wall && selectedFlatTex === sw.flat;
                          return (
                            <button
                              key={sw.id}
                              type="button"
                              onClick={() => {
                                setSelectedFlatTex(sw.flat);
                                setSelectedWallTex(sw.wall);
                                setShowQuickPicker(false);
                              }}
                              className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                                active
                                  ? "bg-[#111827] text-white border-[#111827]"
                                  : "bg-[#F7F8FA] text-[#111827] border-[#E2E8F0]"
                              }`}
                            >
                              <span className="w-4 h-4 rounded-xs border border-black/30 flex-shrink-0" style={{ backgroundColor: sw.color }} />
                              <span className="truncate">{sw.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* MOBILE SLIDE-UP BOTTOM SHEET (< lg) FOR MUNDO / OBJETOS / JUEGO */}
          {mobileSheetTab !== "canvas" && (
            <div
              className="lg:hidden absolute inset-0 bottom-12 z-30 flex flex-col justify-end bg-black/35 backdrop-blur-[1px]"
              onClick={() => setMobileSheetTab("canvas")}
            >
              <div
                className="bg-white rounded-t-2xl border-t border-[#E2E8F0] shadow-2xl flex flex-col max-h-[82%] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
                  <span className="w-10 h-1 rounded-full bg-slate-300" />
                </div>
                <div className="px-4 pb-2.5 border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">
                      {mobileSheetTab === "mundo" && "Mundo y Terreno"}
                      {mobileSheetTab === "objetos" && "Objetos y Personajes IA"}
                      {mobileSheetTab === "activos" && "Navegador de Activos"}
                      {mobileSheetTab === "juego" && "Configuración del Juego"}
                    </h3>
                    <p className="text-[11px] text-[#6B7280]">
                      {mobileSheetTab === "mundo" && "Sectores, texturas, cielo y herramientas 2D"}
                      {mobileSheetTab === "objetos" && "Vóxels 3D, enemigos y modelos animados"}
                      {mobileSheetTab === "activos" && "Modelos MD2/MD3, texturas y paquetes FPG"}
                      {mobileSheetTab === "juego" && "Cámara, menú de inicio y código DIV"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSheetTab("canvas")}
                    className="w-10 h-10 rounded-xl bg-[#F7F8FA] hover:bg-[#E2E8F0] text-[#4B5563] flex items-center justify-center cursor-pointer"
                    aria-label="Cerrar panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {renderGroupedInspectorBody(mobileSheetTab, true)}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT DOCK: CLEANLY GROUPED INSPECTOR (Desktop lg+) */}
        <aside className="hidden lg:flex w-[336px] flex-shrink-0 flex-col bg-[#FFFFFF] border-l border-[#E2E8F0] overflow-hidden">
          <div className="grid grid-cols-4 bg-[#F1F5F9] border-b border-[#E2E8F0] p-1 gap-1 flex-shrink-0">
            {[
              { id: "mundo" as const, label: "Mundo", icon: Layers },
              { id: "objetos" as const, label: "Objetos", icon: Package },
              { id: "activos" as const, label: "Activos", icon: FolderOpen },
              { id: "juego" as const, label: "Juego", icon: Sliders },
            ].map((grp) => {
              const Icon = grp.icon;
              const active = inspectorGroup === grp.id;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setInspectorGroup(grp.id)}
                  className={`py-2 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-[#7C2D48] text-white shadow-xs"
                      : "text-[#4B5563] hover:bg-white hover:text-[#111827]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{grp.label}</span>
                </button>
              );
            })}
          </div>

          {renderGroupedInspectorBody(inspectorGroup, false)}
        </aside>
      </div>

      {/* MODALS (Stairs, Specials, Load, Save, Help) */}
      {showStairsDialog && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-2xl p-4 flex flex-col gap-3 text-[#111827]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center gap-2 text-[#7C2D48] font-bold text-sm">
                <Mountain className="w-4 h-4" />
                <span>Generador de Escaleras</span>
              </div>
              <button onClick={() => setShowStairsDialog(false)} className="p-1 text-[#64748B] hover:text-[#111827]">✕</button>
            </div>
            <div className="flex flex-col gap-3 text-xs">
              <label className="flex justify-between items-center gap-2">
                <span className="text-[#4B5563] font-medium">Peldaños:</span>
                <input type="number" min="2" max="20" value={stairSteps} onChange={(e) => setStairSteps(parseInt(e.target.value, 10) || 5)} className="w-20 min-h-[34px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2 font-mono text-center" />
              </label>
              <label className="flex justify-between items-center gap-2">
                <span className="text-[#4B5563] font-medium">Elevación por peldaño:</span>
                <input type="number" step="0.05" value={stairHeightDelta} onChange={(e) => setStairHeightDelta(parseFloat(e.target.value) || 0.2)} className="w-20 min-h-[34px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2 font-mono text-center" />
              </label>
              <label className="flex justify-between items-center gap-2">
                <span className="text-[#4B5563] font-medium">Ancho:</span>
                <input type="number" step="0.5" value={stairWidth} onChange={(e) => setStairWidth(parseFloat(e.target.value) || 2.0)} className="w-20 min-h-[34px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2 font-mono text-center" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[#4B5563] font-medium">Textura contrahuella:</span>
                <select value={stairTexture} onChange={(e) => setStairTexture(e.target.value)} className="min-h-[34px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2 font-mono">
                  <option value="STEP1">STEP1 (Metal)</option>
                  <option value="STEP2">STEP2 (Acero)</option>
                  <option value="BROWN144">BROWN144 (Ladrillo)</option>
                  <option value="BRICK1">BRICK1 (Rojo)</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button onClick={() => setShowStairsDialog(false)} className="min-h-[36px] px-3 py-1 bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg text-xs font-semibold">Cancelar</button>
              <button onClick={handleCreateStaircase} className="min-h-[36px] px-4 py-1 bg-[#7C2D48] text-white font-bold rounded-lg text-xs">Construir</button>
            </div>
          </div>
        </div>
      )}

      {showSpecialListDialog && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-2xl p-4 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <span className="font-bold text-[#7C2D48] text-sm">Efecto Especial del Sector</span>
              <button onClick={() => setShowSpecialListDialog(false)} className="p-1 text-[#64748B]">✕</button>
            </div>
            {[
              { id: 0, name: "0: Normal" },
              { id: 1, name: "1: Luz Parpadeante" },
              { id: 4, name: "4: Lava (-10 Salud)" },
              { id: 7, name: "7: Ácido Nukage (-5 Salud)" },
              { id: 9, name: "9: Zona Secreta (+1000 Pts)" },
              { id: 11, name: "11: Teletransporte" },
            ].map((spec) => (
              <button
                key={spec.id}
                onClick={() => {
                  markEdited();
                  setSectors((prev) => prev.map((s) => (s.id === curSector.id ? { ...s, special: spec.id } : s)));
                  setShowSpecialListDialog(false);
                }}
                className="min-h-[36px] px-3 py-1.5 rounded-lg text-left hover:bg-[#F7F8FA] font-medium border border-transparent hover:border-[#E2E8F0]"
              >
                {spec.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoadModalOpen && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] text-xs">
            <div className="px-4 py-3 bg-[#F7F8FA] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FolderOpen className="w-4 h-4 text-[#7C2D48]" />
                <span>Cargar Nivel y Plantillas 3D</span>
              </div>
              <button onClick={() => setIsLoadModalOpen(false)} className="p-1 text-[#64748B] hover:text-[#111827]"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex border-b border-[#E2E8F0] bg-[#F7F8FA] px-3 pt-2 gap-2 overflow-x-auto flex-shrink-0">
              <button onClick={() => setLoadModalTab("presets")} className={`min-h-[34px] px-3 py-1.5 font-semibold border-b-2 ${loadModalTab === "presets" ? "border-[#7C2D48] text-[#7C2D48]" : "border-transparent text-[#64748B]"}`}>
                Plantillas ({BUILTIN_LEVEL_PRESETS.length})
              </button>
              <button onClick={() => { setUserSavedLevels(loadSavedUserLevels()); setLoadModalTab("saved"); }} className={`min-h-[34px] px-3 py-1.5 font-semibold border-b-2 ${loadModalTab === "saved" ? "border-[#7C2D48] text-[#7C2D48]" : "border-transparent text-[#64748B]"}`}>
                Guardados ({userSavedLevels.length})
              </button>
              <button onClick={() => setLoadModalTab("import")} className={`min-h-[34px] px-3 py-1.5 font-semibold border-b-2 ${loadModalTab === "import" ? "border-[#7C2D48] text-[#7C2D48]" : "border-transparent text-[#64748B]"}`}>
                Importar (.wad / .divlvl)
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {loadModalTab === "presets" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BUILTIN_LEVEL_PRESETS.map((preset) => (
                    <div key={preset.id} className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0] flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="font-bold text-[#7C2D48] text-sm">{preset.name}</div>
                        <p className="text-[#4B5563] text-[11px] mt-1">{preset.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] font-mono">{preset.sectors.length} sect · {preset.linedefs.length} lín</span>
                        <button onClick={() => handleLoadLevelData(preset)} className="min-h-[32px] px-3 py-1 bg-[#7C2D48] text-white font-bold rounded-lg text-[11px] flex items-center gap-1">
                          <Play className="w-3 h-3 fill-current" /><span>Cargar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {loadModalTab === "saved" && (
                <div className="flex flex-col gap-2">
                  {userSavedLevels.length === 0 ? (
                    <div className="text-center py-8 text-[#64748B]">Aún no has guardado niveles propios.</div>
                  ) : (
                    userSavedLevels.map((lvl) => (
                      <div key={lvl.id} className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0] flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm">{lvl.name}</div>
                          <div className="text-[10px] text-[#64748B]">{lvl.sectors.length} sectores · {lvl.linedefs.length} líneas</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleLoadLevelData(lvl)} className="px-3 py-1.5 bg-[#7C2D48] text-white font-bold rounded-lg">Cargar</button>
                          <button onClick={() => { deleteSavedUserLevel(lvl.id); setUserSavedLevels(loadSavedUserLevels()); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {loadModalTab === "import" && (
                <div className="flex flex-col gap-3">
                  <label className="p-4 border-2 border-dashed border-[#7C2D48]/35 rounded-xl bg-[#7C2D48]/5 text-center cursor-pointer block">
                    <Upload className="w-7 h-7 text-[#7C2D48] mx-auto mb-1" />
                    <div className="font-semibold text-sm">Seleccionar archivo .wad, .divlvl o .json</div>
                    <input type="file" accept=".wad,.divlvl,.json,.txt" onChange={handleImportFile} className="hidden" />
                  </label>
                  <textarea
                    value={pastedWadText}
                    onChange={(e) => setPastedWadText(e.target.value)}
                    placeholder="O pega aquí texto UDMF / JSON de nivel..."
                    className="w-full h-28 bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[11px] font-mono resize-none"
                  />
                  <div className="flex justify-end">
                    <button onClick={handleLoadPastedWadCode} className="px-4 py-1.5 bg-[#2F6F4E] text-white font-bold rounded-lg">Procesar y Cargar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isSaveModalOpen && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-2xl p-4 flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <span className="font-bold text-sm">Guardar Nivel Modo 8</span>
              <button onClick={() => setIsSaveModalOpen(false)} className="p-1 text-[#64748B]">✕</button>
            </div>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Nombre del Nivel:</span>
              <input type="text" value={saveSlotName} onChange={(e) => setSaveSlotName(e.target.value)} className="min-h-[36px] px-3 py-1.5 bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg" />
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button onClick={handleDownloadLevelFile} className="px-3 py-1.5 bg-[#F7F8FA] border border-[#CBD5E1] font-semibold rounded-lg">Descargar .divlvl</button>
              <button onClick={() => handleSaveToSlot(saveSlotName)} className="px-4 py-1.5 bg-[#2F6F4E] text-white font-bold rounded-lg">Guardar en Navegador</button>
            </div>
          </div>
        </div>
      )}

      {isHelpModalOpen && (
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setIsHelpModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-[#FFFFFF] rounded-t-2xl sm:rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center pt-2 pb-0.5 flex-shrink-0">
              <span className="w-10 h-1 rounded-full bg-slate-300" />
            </div>
            <div className="px-4 sm:px-5 py-3 flex items-center justify-between border-b border-[#E2E8F0] flex-shrink-0">
              <span className="font-bold text-sm text-[#111827]">Guía Rápida Modo 8 Sin Programar</span>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="w-10 h-10 rounded-xl hover:bg-slate-100 text-[#4B5563] flex items-center justify-center cursor-pointer"
                aria-label="Cerrar guía Modo 8"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-2.5 text-[#374151] text-xs leading-relaxed overflow-y-auto">
              <div className="p-3 rounded-xl bg-[#EEF6F1] border border-[#CFE4D7]">
                <strong className="text-[#2F6F4E] block mb-0.5">Crea juegos completos usando solo este Editor 3D</strong>
                Funciona de forma similar a <strong>Roblox Studio</strong> o <strong>Fortnite Creative</strong>: editas tu mapa 3D, configuras los menús y armas, y armas todo el entorno del juego sin programar. Según el diseño que elijas puedes crear desde un <strong>juego de pelea 3D</strong> en arena hasta un <strong>shooter completo</strong>.
              </div>
              <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0]">
                <strong className="text-[#111827] block mb-0.5">1. Desplázate por el Mapa 2D</strong>
                Arrastra sobre cualquier espacio vacío (o usa los botones ◀ ▲ ▼ ▶), usa la rueda o pellizco para zoom y pulsa <strong>Centrar</strong> cuando quieras encuadrar el mapa.
              </div>
              <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0]">
                <strong className="text-[#111827] block mb-0.5">2. Construye Sin Código</strong>
                Usa <strong>Sala Rápida</strong> para añadir habitaciones de un toque, <strong>Escaleras</strong> para desniveles, <strong>Textura</strong> para cambiar suelo/paredes y <strong>Vóxels 3D</strong> para decorar.
              </div>
              <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0]">
                <strong className="text-[#111827] block mb-0.5">3. Diseña tus Menús 3D</strong>
                En la pestaña <strong>Menús</strong> elige el título, tema visual, botón Jugar, arma y dificultad. Previsualízalo al instante en el Visor 3D.
              </div>
              <div className="p-3 rounded-xl bg-[#FDF2F5] border border-[#F3D0DC]">
                <strong className="text-[#7C2D48] block mb-0.5">4. Código Auto-Creado</strong>
                Todo se escribe automáticamente en código DIV limpio en la pestaña <strong>Código</strong>. Pulsa <strong>Probar 3D</strong> para jugarlo con menús y físicas reales.
              </div>
            </div>
            <div className="px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-end border-t border-[#E2E8F0] bg-[#F7F8FA] flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2 bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold rounded-xl cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <Mode8InteractiveTutorial
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        sectorCount={sectors.length}
        linedefCount={linedefs.length}
        placedObjectsCount={entities.length + placedModels.length + placedVoxels.length}
        cameraMode={gameConfig.cameraMode}
        onSelectTool={(tool) => {
          setCurrentTool(tool);
          setMobileSheetTab("canvas");
        }}
        onSwitchInspectorTab={(tab) => {
          setInspectorTab(tab);
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            if (tab === "sector" || tab === "textures") setMobileSheetTab("mundo");
            else if (tab === "voxels") setMobileSheetTab("objetos");
            else setMobileSheetTab("juego");
          }
        }}
        onSwitchViewMode={(vm) => {
          setViewMode(vm);
          setMobileSheetTab("canvas");
        }}
        onElevateCurrentSector={(delta) => {
          markEdited();
          setSectors((prev) =>
            prev.map((s) =>
              s.id === curSector.id
                ? { ...s, floorHeight: Number((s.floorHeight + delta).toFixed(2)) }
                : s
            )
          );
          showToast(`Suelo del Sector #${curSector.id} elevado +${delta}m`);
        }}
        onBuildDemoStaircase={() => {
          markEdited();
          const cx = Number(cam3DRef.current.x.toFixed(1));
          const cy = Number(cam3DRef.current.y.toFixed(1));
          const maxSecId = Math.max(0, ...sectors.map((s) => s.id)) + 1;
          const res = generateDoomStaircase(
            cx + 1.5,
            cy - 1.0,
            1,
            0,
            4,
            2.0,
            0.5,
            curSector.floorHeight,
            0.2,
            Math.max(1.8, curSector.ceilHeight),
            "STEP1",
            typeof curSector.floorTexture === "string" ? curSector.floorTexture : "STEP",
            curSector.id,
            undefined,
            maxSecId
          );
          setSectors((prev) => [...prev, ...res.sectors]);
          setLinedefs((prev) => [...prev, ...res.linedefs]);
          showToast("Escalera de 4 peldaños construida frente a tu cámara");
        }}
        onApplyShowcasePalette={(style) => {
          markEdited();
          if (style === "roblox") {
            setSectors((prev) =>
              prev.map((s, idx) => ({
                ...s,
                floorTexture: idx === 0 ? "STUD_FLOOR_BLUE" : idx % 2 === 1 ? "STUD_FLOOR_GOLD" : "STUD_FLOOR_GREEN",
                ceilTexture: "SKY_ROBLOX",
                lightLevel: 245,
              }))
            );
            setLinedefs((prev) =>
              prev.map((l) => ({
                ...l,
                middleTexture: l.isTwoSided ? l.middleTexture : "STUD_BLUE",
                lowerTexture: l.lowerTexture ? "STUD_GOLD" : l.lowerTexture,
              }))
            );
            setGameConfig((prev) => ({ ...prev, skyTexture: "SKY_ROBLOX" }));
            showToast("Paleta vibrante Roblox Studs + Cielo Soleado aplicada");
          } else {
            setSectors((prev) =>
              prev.map((s) => ({
                ...s,
                floorTexture: "NEON_FLOOR",
                ceilTexture: "SKY_CYBER",
                lightLevel: 250,
              }))
            );
            setLinedefs((prev) =>
              prev.map((l) => ({
                ...l,
                middleTexture: l.isTwoSided ? l.middleTexture : "NEON_GRID",
                lowerTexture: l.lowerTexture ? "CYBER_GLASS" : l.lowerTexture,
              }))
            );
            setGameConfig((prev) => ({ ...prev, skyTexture: "SKY_CYBER", menuTheme: "cyber_neon" }));
            showToast("Paleta Cyber Neón aplicada");
          }
        }}
        onPlaceShowcaseModel={(modelId, label) => {
          markEdited();
          const rad = (cam3DRef.current.angle * Math.PI) / 180;
          const mx = Number((cam3DRef.current.x + Math.cos(rad) * 2.2).toFixed(2));
          const my = Number((cam3DRef.current.y + Math.sin(rad) * 2.2).toFixed(2));
          const mz = Math.max(0, Number((cam3DRef.current.z - 0.6).toFixed(2)));
          setPlacedModels((prev) => [
            ...prev,
            {
              id: `tut_${modelId}_${Date.now()}`,
              modelId,
              x: mx,
              y: my,
              z: mz,
              yaw: (cam3DRef.current.angle + 180) % 360,
              scale: 1.15,
              animation: modelId === "trophy_star" ? "spin_0" : "idle",
              name: label,
            },
          ]);
          showToast(`Modelo "${label}" colocado frente a la cámara`);
        }}
        onSetCameraMode={(mode) => {
          markEdited();
          setGameConfig((prev) => ({ ...prev, cameraMode: mode }));
          showToast(`Cámara 3D cambiada a: ${mode}`);
        }}
        onLoadShowcasePreset={(presetId) => {
          const found = BUILTIN_LEVEL_PRESETS.find((p) => p.id === presetId);
          if (found) handleLoadLevelData(found);
        }}
        onToggleMenuPreview={() => {
          setShowMenuPreview((v) => !v);
          if (viewMode === "map2d" || viewMode === "code") setViewMode("split");
        }}
        onLaunchPlayableGame={handleLaunchAndSave}
      />

      {toastMessage && (
        <div className="absolute bottom-4 left-4 bg-[#111827] text-white px-3.5 py-2 rounded-lg border border-[#7C2D48] shadow-2xl flex items-center gap-2 text-xs z-50">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
