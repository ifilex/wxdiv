import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  Trash2,
  Undo2,
  FileCode,
  Crosshair,
  ShieldAlert,
  Save,
  Download,
  Upload,
  Box,
  Sun,
  Droplets,
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
  Settings,
  Scissors,
  Wand2,
  Info,
  X,
} from "lucide-react";
import {
  DivGraphic,
  DivDoomLinedef,
  DivDoomSector,
  DivMode8Entity,
  DivMode8Light,
  DivMode8PlacedModel,
  DivMode8PlacedVoxel,
  DivWorldFile,
} from "../types";
import { DivRuntime } from "../engine/runtime";
import {
  DOOM_WALL_TEXTURES,
  DOOM_FLATS,
  DoomTextureMeta,
  DoomFlatMeta,
  getDoomTextureCanvas,
  generateDoomStaircase,
  renderDoom2PolygonWorld,
} from "../engine/doom2Engine";
import { BUILTIN_3D_MODELS, BUILTIN_VOXELS } from "../engine/mode8Enhanced";
import {
  Mode8LevelData,
  BUILTIN_LEVEL_PRESETS,
  PRESET_E1M1_HANGAR,
  loadSavedUserLevels,
  saveUserLevel,
  deleteSavedUserLevel,
} from "../engine/mode8Presets";

interface Mode8LevelEditorProps {
  runtime: DivRuntime;
  fpg: DivGraphic[];
  onInsertCode: (snippet: string) => void;
  onApplyToRuntime?: () => void;
}

// ReDoomEd Tool Modes (as shown in user screenshots)
export type ReDoomEdTool =
  | "select"
  | "polyline"
  | "line"
  | "stairs"
  | "quickroom"
  | "zoom"
  | "move"
  | "sector_fill"
  | "new_thing"
  | "voxel";

export interface EditorVertex {
  id: string;
  x: number;
  y: number;
}

export interface ThingPreset {
  type: "player" | "monster" | "pickup" | "model3d" | "light" | "barrel";
  name: string;
  desc: string;
  color: string;
  modelId?: string;
}

export const THING_PRESETS: ThingPreset[] = [
  { type: "player", name: "Marine Jugador", desc: "Punto de inicio con escopeta", color: "#22c55e" },
  { type: "monster", name: "Imp Demoníaco", desc: "Lanza bolas de fuego", color: "#ef4444" },
  { type: "monster", name: "Demon Brute", desc: "Monstruo cuerpo a cuerpo", color: "#dc2626" },
  { type: "pickup", name: "Escopeta Corredera", desc: "Arma calibre 12", color: "#eab308" },
  { type: "pickup", name: "Botiquín Médico", desc: "Restaura +25 de salud", color: "#38bdf8" },
  { type: "pickup", name: "Caja de Cartuchos", desc: "Munición +20 cartuchos", color: "#f97316" },
  { type: "barrel", name: "Barril Tóxico", desc: "Explosivo al dispararle", color: "#16a34a" },
  { type: "model3d", name: "Caballero 3D (MD2)", desc: "Modelo 3D animado", color: "#a855f7", modelId: "md2_knight" },
  { type: "model3d", name: "Gárgola 3D (MD2)", desc: "Estatua gótica voladora", color: "#c084fc", modelId: "md2_gargoyle" },
  { type: "model3d", name: "Ogro Bruto 3D (MD3)", desc: "Jefe de fase poligonal", color: "#9333ea", modelId: "demon_brute" },
  { type: "light", name: "Antorcha Dinámica", desc: "Punto de luz parpadeante", color: "#fb923c" },
];

export interface VoxelItemPreset {
  id: string;
  name: string;
  desc: string;
  iconColor: string;
}

export const AVAILABLE_VOXEL_ITEMS: VoxelItemPreset[] = [
  { id: "voxel_barrel", name: "Barril Tóxico", desc: "Contenedor radiactivo con bandas de refuerzo", iconColor: "#22c55e" },
  { id: "voxel_torch", name: "Antorcha Mazmorra", desc: "Lámpara de fuego gótica con llama ardiente", iconColor: "#f97316" },
  { id: "voxel_pillar", name: "Columna Gótica", desc: "Pilar de piedra labrada con fuste y base", iconColor: "#94a3b8" },
  { id: "voxel_terminal", name: "Consola Sci-Fi", desc: "Terminal de datos holográfica UAC", iconColor: "#38bdf8" },
  { id: "voxel_medikit", name: "Botiquín Médico", desc: "Suministro de salud con cruz roja de emergencia", iconColor: "#ef4444" },
  { id: "voxel_crate", name: "Caja de Suministros", desc: "Caja de madera con herrajes de acero", iconColor: "#ca8a04" },
  { id: "voxel_key", name: "Llave Dorada", desc: "Llave de acceso dorada para compuertas", iconColor: "#eab308" },
  { id: "voxel_skull", name: "Cráneo Demoníaco", desc: "Reliquia demoníaca con cuernos de obsidiana", iconColor: "#f1f5f9" },
  { id: "voxel_potion", name: "Poción Mágica", desc: "Frasco arcano con líquido resplandeciente", iconColor: "#c084fc" },
  { id: "voxel_chest", name: "Cofre del Tesoro", desc: "Cofre de roble con herrajes de oro macizo", iconColor: "#d97706" },
];

export const Mode8LevelEditor: React.FC<Mode8LevelEditorProps> = ({
  runtime,
  fpg,
  onInsertCode,
  onApplyToRuntime,
}) => {
  // Active editing mode and view configuration
  const [viewMode, setViewMode] = useState<"map2d" | "visual3d" | "split">("map2d");
  const [currentTool, setCurrentTool] = useState<ReDoomEdTool>("select");

  // Grid and zoom
  const [gridSnap, setGridSnap] = useState<number>(16);
  const [autoSnap, setAutoSnap] = useState<boolean>(true);
  const [zoomFactor, setZoomFactor] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 280, y: 220 });

  // Floating palettes visibility (matching ReDoomEd multi-panel workbench)
  const [showToolsPanel, setShowToolsPanel] = useState<boolean>(true);
  const [showSectorPanel, setShowSectorPanel] = useState<boolean>(true);
  const [showTexturePanel, setShowTexturePanel] = useState<boolean>(true);
  const [showLinePanel, setShowLinePanel] = useState<boolean>(true);
  const [showStairsDialog, setShowStairsDialog] = useState<boolean>(false);
  const [showSpecialListDialog, setShowSpecialListDialog] = useState<boolean>(false);

  // Active texture selections
  const [selectedWallTex, setSelectedWallTex] = useState<string>("STARTAN3");
  const [selectedFlatTex, setSelectedFlatTex] = useState<string>("FLOOR4_8");
  const [selectedFlatTarget, setSelectedFlatTarget] = useState<"floor" | "ceiling">("floor");
  const [flatSearchFilter, setFlatSearchFilter] = useState<string>("");
  const [wallSearchFilter, setWallSearchFilter] = useState<string>("");
  const [activeWallCategory, setActiveWallCategory] = useState<string>("all");

  // Selection state
  const [selectedVertexId, setSelectedVertexId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<number>(0);
  const [selectedThingIdx, setSelectedThingIdx] = useState<number | null>(null);
  const [selectedThingPreset, setSelectedThingPreset] = useState<ThingPreset>(THING_PRESETS[0]);

  // Polyline drawing state
  const [polyVertices, setPolyVertices] = useState<{ x: number; y: number }[]>([]);

  // Staircase generator parameters
  const [stairSteps, setStairSteps] = useState<number>(5);
  const [stairHeightDelta, setStairHeightDelta] = useState<number>(0.2); // +0.2 world height per step
  const [stairWidth, setStairWidth] = useState<number>(2.0);
  const [stairLength, setStairLength] = useState<number>(0.5);
  const [stairTexture, setStairTexture] = useState<string>("STEP1");

  // Map geometry data (Doom 2 Sectors, Linedefs, and Things)
  const [sectors, setSectors] = useState<DivDoomSector[]>(() => {
    // Initial Doom 2 level sectors
    return [
      { id: 0, floorHeight: 0, ceilHeight: 1.2, floorTexture: "FLOOR4_8", ceilTexture: "CEIL3_5", lightLevel: 190 },
      { id: 1, floorHeight: 0.2, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 195 },
      { id: 2, floorHeight: 0.4, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 200 },
      { id: 3, floorHeight: 0.6, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 205 },
      { id: 4, floorHeight: 0.8, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 210 },
      { id: 10, floorHeight: 1.0, ceilHeight: 1.8, floorTexture: "CRATOP2", ceilTexture: "TLITE6_5", lightLevel: 220 },
      { id: 20, floorHeight: -0.4, ceilHeight: 1.2, floorTexture: "NUKAGE", ceilTexture: "CEIL3_5", lightLevel: 240, special: 7 },
    ];
  });

  const [linedefs, setLinedefs] = useState<DivDoomLinedef[]>(() => {
    // Initial Doom 2 Hangar architecture with rooms, stairs, and nukage pit
    return [
      // Main Hangar (Sector 0)
      { id: "w1", x1: 2, y1: 2, x2: 12, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
      { id: "w2", x1: 12, y1: 2, x2: 12, y2: 6, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
      // Portal to Staircase: Step 1
      { id: "s1", x1: 12, y1: 6, x2: 12, y2: 8, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
      // Staircase Step 2
      { id: "s2", x1: 13, y1: 6, x2: 13, y2: 8, frontSectorId: 1, backSectorId: 2, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
      // Staircase Step 3
      { id: "s3", x1: 14, y1: 6, x2: 14, y2: 8, frontSectorId: 2, backSectorId: 3, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
      // Staircase Step 4
      { id: "s4", x1: 15, y1: 6, x2: 15, y2: 8, frontSectorId: 3, backSectorId: 4, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
      // Staircase to Elevated Deck (Sector 10)
      { id: "s5", x1: 16, y1: 6, x2: 16, y2: 8, frontSectorId: 4, backSectorId: 10, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
      // Stair side walls
      { id: "sw_top", x1: 12, y1: 6, x2: 16, y2: 6, frontSectorId: 0, isTwoSided: false, middleTexture: "BROWN144", blocking: true },
      { id: "sw_bot", x1: 12, y1: 8, x2: 16, y2: 8, frontSectorId: 0, isTwoSided: false, middleTexture: "BROWN144", blocking: true },
      // Elevated Deck Perimeter (Sector 10)
      { id: "d1", x1: 16, y1: 4, x2: 20, y2: 4, frontSectorId: 10, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
      { id: "d2", x1: 20, y1: 4, x2: 20, y2: 10, frontSectorId: 10, isTwoSided: false, middleTexture: "COMP2", blocking: true },
      { id: "d3", x1: 20, y1: 10, x2: 16, y2: 10, frontSectorId: 10, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
      { id: "d4", x1: 16, y1: 10, x2: 16, y2: 8, frontSectorId: 10, isTwoSided: false, middleTexture: "SHAWN2", blocking: true },
      { id: "d5", x1: 16, y1: 6, x2: 16, y2: 4, frontSectorId: 10, isTwoSided: false, middleTexture: "SHAWN2", blocking: true },
      // Hangar Rest of Perimeter
      { id: "w3", x1: 12, y1: 8, x2: 12, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
      { id: "w4", x1: 12, y1: 14, x2: 2, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "BROWN144", blocking: true },
      // Portal into Nukage Trench (Sector 20)
      { id: "np1", x1: 5, y1: 10, x2: 9, y2: 10, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
      { id: "np2", x1: 9, y1: 10, x2: 9, y2: 12, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
      { id: "np3", x1: 9, y1: 12, x2: 5, y2: 12, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
      { id: "np4", x1: 5, y1: 12, x2: 5, y2: 10, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
      // Left Hangar Wall
      { id: "w5", x1: 2, y1: 14, x2: 2, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "BRICK1", blocking: true },
    ];
  });

  const [entities, setEntities] = useState<DivMode8Entity[]>([
    { id: "p1", type: "player", x: 4.5 * 64, y: 5.5 * 64, graph: 1, name: "Marine Start" },
    { id: "m1", type: "monster", x: 8.0 * 64, y: 4.0 * 64, graph: 27, name: "Imp Demon" },
    { id: "w_shotgun", type: "treasure", x: 6.0 * 64, y: 7.0 * 64, graph: 29, name: "Shotgun" },
    { id: "b1", type: "barrel", x: 3.5 * 64, y: 3.5 * 64, graph: 28, name: "Toxic Barrel" },
  ]);

  const [placedModels, setPlacedModels] = useState<DivMode8PlacedModel[]>([
    { id: "mod_demon", modelId: "demon_brute", x: 18.0, y: 7.0, z: 1.0, yaw: 180, scale: 1.2, animation: "idle", name: "Demon Brute 3D" },
    { id: "mod_knight", modelId: "md2_knight", x: 7.5, y: 8.5, z: 0.0, yaw: 45, scale: 1.0, animation: "walk", name: "Knight MD2" },
  ]);

  const [lights, setLights] = useState<DivMode8Light[]>([
    { id: "l1", x: 6.0, y: 6.0, z: 1.0, radius: 8.0, r: 255, g: 180, b: 60, flicker: true },
    { id: "l2", x: 18.0, y: 7.0, z: 1.6, radius: 6.0, r: 80, g: 160, b: 255, flicker: false },
  ]);

  // Voxel Integration State
  const [currentLevelName, setCurrentLevelName] = useState<string>("E1M1: Hangar Doom 2 Completo");
  const [placedVoxels, setPlacedVoxels] = useState<DivMode8PlacedVoxel[]>(() => PRESET_E1M1_HANGAR.placedVoxels);
  const [selectedVoxelType, setSelectedVoxelType] = useState<string>("voxel_barrel");
  const [selectedVoxelYaw, setSelectedVoxelYaw] = useState<number>(0);
  const [selectedVoxelScale, setSelectedVoxelScale] = useState<number>(1.0);
  const [selectedVoxelIdx, setSelectedVoxelIdx] = useState<number | null>(null);
  const [showVoxelPanel, setShowVoxelPanel] = useState<boolean>(false);

  // Top Menu and Modals State
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [saveSlotName, setSaveSlotName] = useState<string>("Mi Nivel Personalizado");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadModalTab, setLoadModalTab] = useState<"presets" | "saved" | "import">("presets");
  const [userSavedLevels, setUserSavedLevels] = useState<Mode8LevelData[]>(() => loadSavedUserLevels());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // 3D Walkthrough Preview Camera State
  const [cam3D, setCam3D] = useState<{ x: number; y: number; z: number; angle: number; pitch: number }>({
    x: 4.5,
    y: 5.5,
    z: 0.6,
    angle: 0,
    pitch: 0,
  });

  // Canvas references
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const visual3DCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Mouse interaction state for 2D overhead map
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorWorldCoords, setCursorWorldCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse / Keyboard Controls for 3D Walkthrough
  const keysDownRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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

  // Update 3D camera loop when visual3d or split is active
  useEffect(() => {
    if (viewMode === "map2d") return;

    let active = true;
    const loop = () => {
      if (!active) return;
      setCam3D((prev) => {
        let { x, y, z, angle, pitch } = prev;
        const rad = (angle * Math.PI) / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        const speed = 0.08;
        const rotSpeed = 2.4;

        if (keysDownRef.current["a"] || keysDownRef.current["arrowleft"]) angle -= rotSpeed;
        if (keysDownRef.current["d"] || keysDownRef.current["arrowright"]) angle += rotSpeed;
        if (keysDownRef.current["w"] || keysDownRef.current["arrowup"]) {
          x += cosA * speed;
          y += sinA * speed;
        }
        if (keysDownRef.current["s"] || keysDownRef.current["arrowdown"]) {
          x -= cosA * speed;
          y -= sinA * speed;
        }

        // Automatic stair climbing / elevation matching in 3D preview
        for (const s of sectors) {
          // If close to a sector, damp camera Z to its floor height + 0.6 eye level
          if (s.id === selectedSectorId) {
            const targetZ = s.floorHeight + 0.6;
            z += (targetZ - z) * 0.15;
            break;
          }
        }

        return { x, y, z, angle, pitch };
      });

      // Render 3D frame
      if (visual3DCanvasRef.current) {
        const ctx = visual3DCanvasRef.current.getContext("2d");
        if (ctx) {
          renderDoom2PolygonWorld(
            ctx,
            visual3DCanvasRef.current.width,
            visual3DCanvasRef.current.height,
            cam3D,
            linedefs,
            sectors,
            entities,
            placedModels,
            lights,
            0,
            "shotgun",
            0,
            placedVoxels
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
  }, [viewMode, cam3D, linedefs, sectors, entities, placedModels, lights, placedVoxels, selectedSectorId]);

  // Render 2D Overhead Map Canvas
  const redraw2DMap = useCallback(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark blueprint background
    ctx.fillStyle = "#0c0f17";
    ctx.fillRect(0, 0, w, h);

    const scale = 24 * zoomFactor;

    // 1. Draw Grid
    ctx.save();
    ctx.strokeStyle = "#172033";
    ctx.lineWidth = 1;
    const startGridX = (panOffset.x % (gridSnap * scale)) - (gridSnap * scale);
    for (let gx = startGridX; gx < w; gx += gridSnap * scale) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    const startGridY = (panOffset.y % (gridSnap * scale)) - (gridSnap * scale);
    for (let gy = startGridY; gy < h; gy += gridSnap * scale) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Origin crosshair (0,0)
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(panOffset.x - 12, panOffset.y);
    ctx.lineTo(panOffset.x + 12, panOffset.y);
    ctx.moveTo(panOffset.x, panOffset.y - 12);
    ctx.lineTo(panOffset.x, panOffset.y + 12);
    ctx.stroke();

    // 2. Draw Sectors (Floor height labels and tags)
    sectors.forEach((sec) => {
      // Find average centroid of sector linedefs
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

        // Draw Sector Badge with Floor Height
        ctx.fillStyle = sec.id === selectedSectorId ? "#3b82f6" : "rgba(30, 41, 59, 0.85)";
        ctx.strokeStyle = sec.id === selectedSectorId ? "#93c5fd" : "#475569";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx - 24, cy - 10, 48, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`H:${sec.floorHeight}`, cx, cy);
      }
    });

    // 3. Draw Linedefs (White for 1-sided, Green for 2-sided portals, Orange for stairs!)
    linedefs.forEach((line) => {
      const sx1 = line.x1 * scale + panOffset.x;
      const sy1 = line.y1 * scale + panOffset.y;
      const sx2 = line.x2 * scale + panOffset.x;
      const sy2 = line.y2 * scale + panOffset.y;

      const isSelected = selectedLineId === line.id;
      const isStair = line.lowerTexture === "STEP1" || line.lowerTexture === "STEP2";

      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);

      if (isSelected) {
        ctx.strokeStyle = "#facc15"; // Yellow for selected
        ctx.lineWidth = 3.5;
      } else if (isStair) {
        ctx.strokeStyle = "#f97316"; // Bright Orange for Stairs!
        ctx.lineWidth = 2.5;
      } else if (line.isTwoSided) {
        ctx.strokeStyle = "#22c55e"; // Green for 2-sided Portals
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = "#f1f5f9"; // White for 1-sided Solid Walls
        ctx.lineWidth = 2.5;
      }
      ctx.stroke();

      // Normal tick mark indicating front facing side
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

    // 4. Draw Polyline under construction
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
      // Line to current cursor
      const cx = cursorWorldCoords.x * scale + panOffset.x;
      const cy = cursorWorldCoords.y * scale + panOffset.y;
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Draw Vertices (Interactive handles)
    const drawnVerts = new Set<string>();
    linedefs.forEach((l) => {
      const vPairs = [
        { x: l.x1, y: l.y1, id: `${l.x1}_${l.y1}` },
        { x: l.x2, y: l.y2, id: `${l.x2}_${l.y2}` },
      ];
      vPairs.forEach((v) => {
        if (!drawnVerts.has(v.id)) {
          drawnVerts.add(v.id);
          const vx = v.x * scale + panOffset.x;
          const vy = v.y * scale + panOffset.y;
          const isSelected = selectedVertexId === v.id;

          ctx.fillStyle = isSelected ? "#ef4444" : "#ffffff";
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(vx, vy, isSelected ? 5.5 : 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });
    });

    // 6. Draw Things (Player start, Monsters, Shotguns, 3D Models)
    entities.forEach((ent, idx) => {
      const ex = (ent.x / 64) * scale + panOffset.x;
      const ey = (ent.y / 64) * scale + panOffset.y;
      const isSelected = selectedThingIdx === idx;

      ctx.save();
      ctx.translate(ex, ey);

      if (ent.type === "player") {
        // Player Start green circle with directional arrow
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#facc15" : "#0f172a";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Arrow pointing east (0 deg)
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
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#facc15" : "#0f172a";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (ent.type === "barrel") {
        ctx.fillStyle = "#15803d";
        ctx.fillRect(-6, -6, 12, 12);
        ctx.strokeStyle = isSelected ? "#facc15" : "#22c55e";
        ctx.lineWidth = 2;
        ctx.strokeRect(-6, -6, 12, 12);
      } else {
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-5, -5, 10, 10);
      }
      ctx.restore();
    });

    // 7. Draw 3D MD2/MD3 Placed Models
    placedModels.forEach((mod) => {
      const mx = mod.x * scale + panOffset.x;
      const my = mod.y * scale + panOffset.y;

      ctx.fillStyle = "#a855f7";
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("3D", mx, my + 3);
    });

    // 7.5. Draw 3D Placed Voxels (Isometric Cube Icon & Label)
    placedVoxels.forEach((vox, idx) => {
      const vx = vox.x * scale + panOffset.x;
      const vy = vox.y * scale + panOffset.y;
      const isSelected = selectedVoxelIdx === idx;

      ctx.save();
      ctx.translate(vx, vy);

      // Top Isometric Face
      ctx.fillStyle = isSelected ? "#facc15" : "#06b6d4";
      ctx.strokeStyle = isSelected ? "#ffffff" : "#0891b2";
      ctx.lineWidth = isSelected ? 2 : 1.2;

      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(8, -5);
      ctx.lineTo(0, -1);
      ctx.lineTo(-8, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Left Isometric Face
      ctx.fillStyle = isSelected ? "#eab308" : "#0e7490";
      ctx.beginPath();
      ctx.moveTo(-8, -5);
      ctx.lineTo(0, -1);
      ctx.lineTo(0, 8);
      ctx.lineTo(-8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Isometric Face
      ctx.fillStyle = isSelected ? "#ca8a04" : "#155e75";
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(8, -5);
      ctx.lineTo(8, 4);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Directional pointer from yaw
      const yawRad = (vox.yaw * Math.PI) / 180;
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(yawRad) * 12, Math.sin(yawRad) * 12);
      ctx.stroke();

      // Voxel clean name
      ctx.fillStyle = isSelected ? "#fef08a" : "#cbd5e1";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      const cleanName = vox.voxelId.replace("voxel_", "");
      ctx.fillText(cleanName, 0, 19);

      ctx.restore();
    });

    // 8. 3D Camera Frustum Indicator
    const cx = cam3D.x * scale + panOffset.x;
    const cy = cam3D.y * scale + panOffset.y;
    const camRad = (cam3D.angle * Math.PI) / 180;
    const fovHalf = ((75 / 2) * Math.PI) / 180;
    const rayLen = 40;

    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
    ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
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
    placedVoxels,
    selectedVoxelIdx,
    polyVertices,
    selectedLineId,
    selectedVertexId,
    selectedSectorId,
    selectedThingIdx,
    cursorWorldCoords,
    cam3D,
  ]);

  // Redraw 2D map on state updates
  useEffect(() => {
    redraw2DMap();
  }, [redraw2DMap]);

  // Canvas Mouse Interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const scale = 24 * zoomFactor;
    let wx = (mx - panOffset.x) / scale;
    let wy = (my - panOffset.y) / scale;

    if (autoSnap) {
      wx = Math.round(wx / (gridSnap / 16)) * (gridSnap / 16);
      wy = Math.round(wy / (gridSnap / 16)) * (gridSnap / 16);
    }

    if (e.button === 1 || currentTool === "move") {
      // Middle click or move tool: pan canvas
      setIsDragging(true);
      setDragStartPos({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (currentTool === "select") {
      // Check voxel click
      for (let i = 0; i < placedVoxels.length; i++) {
        const v = placedVoxels[i];
        if (Math.hypot(v.x - wx, v.y - wy) < 0.6) {
          setSelectedVoxelIdx(i);
          setSelectedLineId(null);
          setSelectedVertexId(null);
          setSelectedThingIdx(null);
          setShowVoxelPanel(true);
          return;
        }
      }

      // Check vertex click
      for (const l of linedefs) {
        const dist1 = Math.hypot(l.x1 - wx, l.y1 - wy);
        if (dist1 < 0.4) {
          setSelectedVertexId(`${l.x1}_${l.y1}`);
          setSelectedLineId(null);
          setSelectedVoxelIdx(null);
          return;
        }
        const dist2 = Math.hypot(l.x2 - wx, l.y2 - wy);
        if (dist2 < 0.4) {
          setSelectedVertexId(`${l.x2}_${l.y2}`);
          setSelectedLineId(null);
          setSelectedVoxelIdx(null);
          return;
        }
      }

      // Check linedef click
      for (const l of linedefs) {
        // Distance from point to line segment
        const A = wx - l.x1;
        const B = wy - l.y1;
        const C = l.x2 - l.x1;
        const D = l.y2 - l.y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx, yy;
        if (param < 0) {
          xx = l.x1;
          yy = l.y1;
        } else if (param > 1) {
          xx = l.x2;
          yy = l.y2;
        } else {
          xx = l.x1 + param * C;
          yy = l.y1 + param * D;
        }
        const dist = Math.hypot(wx - xx, wy - yy);
        if (dist < 0.4) {
          setSelectedLineId(lineIdMatch(l.id));
          setSelectedSectorId(l.frontSectorId);
          setSelectedVertexId(null);
          setSelectedVoxelIdx(null);
          return;
        }
      }
    } else if (currentTool === "voxel") {
      // Place voxel 3D object
      const secFloor = curSector?.floorHeight ?? 0;
      const newVoxel: DivMode8PlacedVoxel = {
        id: `vox_${Date.now()}`,
        voxelId: selectedVoxelType,
        x: Number(wx.toFixed(2)),
        y: Number(wy.toFixed(2)),
        z: secFloor,
        yaw: selectedVoxelYaw,
        scale: selectedVoxelScale,
      };
      setPlacedVoxels((prev) => [...prev, newVoxel]);
      setSelectedVoxelIdx(placedVoxels.length);
      showToast(`Vóxel "${selectedVoxelType.replace("voxel_", "")}" colocado en mapa`);
    } else if (currentTool === "polyline") {
      // Add vertex to polygon
      if (polyVertices.length > 2) {
        // If clicking close to starting vertex: CLOSE POLYGON & CREATE SECTOR!
        const start = polyVertices[0];
        if (Math.hypot(start.x - wx, start.y - wy) < 0.6) {
          closePolygonAndCreateSector();
          return;
        }
      }
      setPolyVertices((prev) => [...prev, { x: wx, y: wy }]);
    } else if (currentTool === "stairs") {
      // Click to open staircase generator oriented from camera position to click point
      setShowStairsDialog(true);
    } else if (currentTool === "new_thing") {
      // Place thing at click point
      if (selectedThingPreset.type === "player") {
        setEntities((prev) => [
          ...prev.filter((ent) => ent.type !== "player"),
          { id: `player_${Date.now()}`, type: "player", x: wx * 64, y: wy * 64, graph: 1, name: "Player Marine" },
        ]);
        setCam3D((prev) => ({ ...prev, x: wx, y: wy }));
      } else if (selectedThingPreset.type === "model3d") {
        setPlacedModels((prev) => [
          ...prev,
          {
            id: `model_${Date.now()}`,
            modelId: selectedThingPreset.modelId || "demon_brute",
            x: wx,
            y: wy,
            z: 0,
            yaw: 180,
            scale: 1.0,
            animation: "idle",
            name: selectedThingPreset.name,
          },
        ]);
      } else {
        setEntities((prev) => [
          ...prev,
          {
            id: `thing_${Date.now()}`,
            type: selectedThingPreset.type === "monster" ? "monster" : "barrel",
            x: wx * 64,
            y: wy * 64,
            graph: 27,
            name: selectedThingPreset.name,
          },
        ]);
      }
    }
  };

  const lineIdMatch = (id: string | number) => String(id);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStartPos.x,
        y: e.clientY - dragStartPos.y,
      });
      return;
    }

    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = 24 * zoomFactor;
    let wx = (e.clientX - rect.left - panOffset.x) / scale;
    let wy = (e.clientY - rect.top - panOffset.y) / scale;

    if (autoSnap) {
      wx = Math.round(wx / (gridSnap / 16)) * (gridSnap / 16);
      wy = Math.round(wy / (gridSnap / 16)) * (gridSnap / 16);
    }
    setCursorWorldCoords({ x: Number(wx.toFixed(2)), y: Number(wy.toFixed(2)) });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Close Polyline and generate new Sector + Linedefs
  const closePolygonAndCreateSector = () => {
    if (polyVertices.length < 3) return;

    const newSecId = Math.max(0, ...sectors.map((s) => s.id)) + 1;
    const newSector: DivDoomSector = {
      id: newSecId,
      floorHeight: 0,
      ceilHeight: 1.2,
      floorTexture: selectedFlatTex,
      ceilTexture: "CEIL3_5",
      lightLevel: 190,
    };

    const newLines: DivDoomLinedef[] = [];
    for (let i = 0; i < polyVertices.length; i++) {
      const v1 = polyVertices[i];
      const v2 = polyVertices[(i + 1) % polyVertices.length];
      newLines.push({
        id: `poly_${newSecId}_${i}`,
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
    setCurrentTool("select");
  };

  // Build Staircase with Progressive Sector Heights & STEP textures
  const handleCreateStaircase = () => {
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
  };

  // Fuse close vertices (welding within 0.25 map units)
  const handleFusePoints = () => {
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

  // Invert normal / flip front and back sides of selected linedef
  const handleFlipSelectedLine = () => {
    if (!selectedLineId) {
      showToast("Selecciona una línea (linedef) primero para invertirla");
      return;
    }
    setLinedefs((prev) =>
      prev.map((l) => {
        if (l.id === selectedLineId) {
          return {
            ...l,
            x1: l.x2,
            y1: l.y2,
            x2: l.x1,
            y2: l.y1,
            frontSectorId: l.backSectorId !== undefined ? l.backSectorId : l.frontSectorId,
            backSectorId: l.isTwoSided ? l.frontSectorId : undefined,
          };
        }
        return l;
      })
    );
    showToast("Linedef invertida");
  };

  // Launch and Save: directly transfer map to runtime and run game in Doom 2 mode!
  const handleLaunchAndSave = () => {
    runtime.m8_set_doom_map(linedefs, sectors);
    runtime.m8_workers(4);
    runtime.m8_set_weapon("shotgun");

    // Add models, voxels, and entities to runtime Mode 8
    if (runtime.m8[0]) {
      runtime.m8[0].engineMode = "doom2";
      runtime.m8[0].placedModels = placedModels;
      runtime.m8[0].placedVoxels = placedVoxels;
      runtime.m8[0].entities = entities;
      runtime.m8[0].lights = lights;
    }

    showToast("Mapa transferido a Modo 8. ¡Ejecutando!");
    if (onApplyToRuntime) {
      onApplyToRuntime();
    }
  };

  // Load Level Data from preset or saved file
  const handleLoadLevelData = (lvl: Mode8LevelData) => {
    setSectors(lvl.sectors);
    setLinedefs(lvl.linedefs);
    setEntities(lvl.entities);
    setPlacedModels(lvl.placedModels || []);
    setPlacedVoxels(lvl.placedVoxels || []);
    setLights(lvl.lights || []);
    setCurrentLevelName(lvl.name);
    setSelectedSectorId(lvl.sectors[0]?.id || 0);
    setSelectedLineId(null);
    setSelectedVertexId(null);
    setSelectedThingIdx(null);
    setSelectedVoxelIdx(null);
    setIsLoadModalOpen(false);
    showToast(`Nivel "${lvl.name}" cargado con éxito`);
  };

  // Quick Save Level to LocalStorage
  const handleQuickSave = () => {
    const levelData: Mode8LevelData = {
      id: `lvl_${currentLevelName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      name: currentLevelName,
      description: `Nivel guardado con ${sectors.length} sectores, ${linedefs.length} linedefs y ${placedVoxels.length} vóxels.`,
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
    showToast(`¡Nivel "${currentLevelName}" guardado localmente!`);
  };

  // Save As with custom name
  const handleSaveToSlot = (name: string) => {
    if (!name.trim()) return;
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
    setIsSaveModalOpen(false);
    showToast(`Nivel guardado como "${name.trim()}"`);
  };

  // Download .divlvl file
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
    showToast("Archivo .divlvl descargado correctamente");
  };

  // Import file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.sectors && parsed.linedefs) {
          handleLoadLevelData(parsed);
        } else {
          showToast("Error: Estructura de archivo de nivel inválida");
        }
      } catch (err) {
        showToast("Error al leer archivo JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Reset to blank level
  const handleResetLevel = () => {
    setSectors([
      { id: 0, floorHeight: 0, ceilHeight: 1.5, floorTexture: "FLOOR4_8", ceilTexture: "CEIL3_5", lightLevel: 200 },
    ]);
    setLinedefs([
      { id: "rw1", x1: 2, y1: 2, x2: 14, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
      { id: "rw2", x1: 14, y1: 2, x2: 14, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
      { id: "rw3", x1: 14, y1: 14, x2: 2, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
      { id: "rw4", x1: 2, y1: 14, x2: 2, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    ]);
    setEntities([
      { id: "p1", type: "player", x: 4.5 * 64, y: 5.5 * 64, graph: 1, name: "Player Marine" },
    ]);
    setPlacedModels([]);
    setPlacedVoxels([]);
    setLights([
      { id: "l1", x: 8.0, y: 8.0, z: 1.0, radius: 8.0, r: 255, g: 200, b: 120, flicker: false },
    ]);
    setCurrentLevelName("Nuevo Nivel en Blanco");
    setSelectedSectorId(0);
    setSelectedLineId(null);
    setSelectedVertexId(null);
    setSelectedThingIdx(null);
    setSelectedVoxelIdx(null);
    showToast("Nuevo mapa en blanco inicializado");
  };

  // Generate DIV Games Studio Pascal Code for loading this Doom 2 level
  const handleGenerateDivCode = () => {
    const voxelCode = placedVoxels.length > 0
      ? placedVoxels.map((v) => `    m8_place_voxel("${v.voxelId}", ${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)}, ${v.yaw.toFixed(0)}, ${v.scale.toFixed(1)});`).join("\n")
      : "    // Sin vóxels colocados";

    const codeSnippet = `
// -------------------------------------------------------------
// MAPA GENERADO CON REDOOMED (DOOM 2 MODO 8 DIV)
// Sectores Poligonales, Escaleras, Modelos 3D y Vóxels
// -------------------------------------------------------------
PROGRAM NivelDoom2_ReDoomEd;
GLOBAL
    fpg_doom = 0;
BEGIN
    set_mode(m640x480);
    set_fps(60);

    // Iniciar Motor Doom 2 de Sectores Poligonales
    start_mode8(0, 0, 25, 44, 45, 0, 0);
    m8_engine_mode("doom2");
    m8_set_weapon("shotgun");

    // Vóxels 3D Decorativos
${voxelCode}

    // Iniciar Jugador Marine
    jugador_doom(${cursorWorldCoords.x * 64}, ${cursorWorldCoords.y * 64});

    LOOP
        FRAME;
    END
END
`;
    onInsertCode(codeSnippet);
    showToast("Código DIV generado en el editor");
  };

  const curSector = sectors.find((s) => s.id === selectedSectorId) || sectors[0];
  const curLine = linedefs.find((l) => l.id === selectedLineId);

  return (
    <div className="flex flex-col w-full h-full bg-[#0a0d14] text-slate-200 select-none overflow-hidden font-sans">
      {/* 1. TOP MENU DOCK BAR (ReDoomEd Title, Menus, View Mode Tabs, Quick Actions) */}
      <div className="h-9 px-3 bg-[#111622] border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 tracking-wider">
            <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px]">
              ReDoomEd
            </span>
            <span>v1.2</span>
            <span className="text-slate-400 text-[11px] font-normal max-w-44 truncate" title={currentLevelName}>
              [{currentLevelName}]
            </span>
          </div>

          {/* Working Dropdown Menus */}
          <div className="relative hidden md:flex items-center gap-0.5 text-[11px] text-slate-300">
            {/* 1. Proyecto / Archivo */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === "project" ? null : "project")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeMenu === "project" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                Proyecto
              </button>

              {activeMenu === "project" && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-[#161d2d] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      setIsLoadModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cargar Nivel / Plantillas...</span>
                  </button>
                  <button
                    onClick={() => {
                      handleQuickSave();
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Guardar Rápido (Local)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsSaveModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <Save className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Guardar Nivel Como...</span>
                  </button>
                  <div className="h-px bg-slate-700/60 my-1" />
                  <button
                    onClick={() => {
                      handleDownloadLevelFile();
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Descargar Archivo (.divlvl)</span>
                  </button>
                  <label className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>Importar Archivo (.divlvl)</span>
                    <input
                      type="file"
                      accept=".divlvl,.json"
                      onChange={(e) => {
                        handleImportFile(e);
                        setActiveMenu(null);
                      }}
                      className="hidden"
                    />
                  </label>
                  <div className="h-px bg-slate-700/60 my-1" />
                  <button
                    onClick={() => {
                      handleGenerateDivCode();
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>Generar Código DIV Pascal</span>
                  </button>
                  <button
                    onClick={() => {
                      handleResetLevel();
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-red-950/60 text-red-300 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Nuevo Mapa en Blanco</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Plantillas / Presets */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === "presets" ? null : "presets")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeMenu === "presets" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                Plantillas
              </button>

              {activeMenu === "presets" && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-[#161d2d] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs">
                  {BUILTIN_LEVEL_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        handleLoadLevelData(p);
                        setActiveMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 flex flex-col gap-0.5 border-b border-slate-800/60 last:border-0 text-slate-200"
                    >
                      <div className="font-semibold text-amber-300 flex items-center justify-between">
                        <span>{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.sectors.length} sect</span>
                      </div>
                      <span className="text-[10px] text-slate-400 line-clamp-1">{p.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Edición / Edit */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === "edit" ? null : "edit")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeMenu === "edit" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                Edición
              </button>

              {activeMenu === "edit" && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-[#161d2d] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      closePolygonAndCreateSector();
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cerrar Polígono de Sector</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowStairsDialog(true);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <Mountain className="w-3.5 h-3.5 text-amber-400" />
                    <span>Generador de Escaleras...</span>
                  </button>
                  <button
                    onClick={() => {
                      handleFusePoints();
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <Scissors className="w-3.5 h-3.5 text-blue-400" />
                    <span>Soldar Vértices (Fuse)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleFlipSelectedLine();
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                    <span>Invertir Linedef Normal</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Insertar / Objects */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === "insert" ? null : "insert")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeMenu === "insert" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                Insertar
              </button>

              {activeMenu === "insert" && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-[#161d2d] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      setCurrentTool("voxel");
                      setShowVoxelPanel(true);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-cyan-300 font-medium"
                  >
                    <Package className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Vóxels 3D Decorativos...</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedThingPreset(THING_PRESETS[0]);
                      setCurrentTool("new_thing");
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Punto de Inicio Marine</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedThingPreset(THING_PRESETS[1]);
                      setCurrentTool("new_thing");
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                    <span>Enemigo Imp Demoníaco</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedThingPreset(THING_PRESETS[5]);
                      setCurrentTool("new_thing");
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Modelo 3D (Caballero MD2)</span>
                  </button>
                </div>
              )}
            </div>

            {/* 5. Paneles / Panels */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === "panels" ? null : "panels")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeMenu === "panels" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                Paneles
              </button>

              {activeMenu === "panels" && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-[#161d2d] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      setShowToolsPanel(!showToolsPanel);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center justify-between text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Paleta Herramientas</span>
                    </div>
                    {showToolsPanel && <Check className="w-3 h-3 text-amber-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setShowSectorPanel(!showSectorPanel);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center justify-between text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Inspector Sectores</span>
                    </div>
                    {showSectorPanel && <Check className="w-3 h-3 text-blue-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setShowTexturePanel(!showTexturePanel);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center justify-between text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <Grid className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Texturas Doom 2</span>
                    </div>
                    {showTexturePanel && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setShowVoxelPanel(!showVoxelPanel);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center justify-between text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Paleta Vóxels 3D</span>
                    </div>
                    {showVoxelPanel && <Check className="w-3 h-3 text-cyan-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* 6. Ayuda / Help */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsHelpModalOpen(true);
                  setActiveMenu(null);
                }}
                className="px-2 py-0.5 hover:bg-slate-800 hover:text-slate-100 rounded flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span>Ayuda</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Switcher: Map 2D / Visual 3D / Split */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setViewMode("map2d")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
              viewMode === "map2d" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Grid className="w-3 h-3" />
            <span>Map 2D (k)</span>
          </button>
          <button
            onClick={() => setViewMode("visual3d")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
              viewMode === "visual3d" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Visual 3D (w)</span>
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
              viewMode === "split" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <SplitSquareVertical className="w-3 h-3" />
            <span>Split 2D/3D</span>
          </button>
        </div>

        {/* Action Buttons: Launch, DIV Code, Panes Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLaunchAndSave}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Compilar y ejecutar mapa poligonal Doom 2 en Modo 8 (F9)"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Ejecutar Nivel (F9)</span>
          </button>
          <button
            onClick={handleGenerateDivCode}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 border border-slate-700"
            title="Generar código fuente DIV"
          >
            <FileCode className="w-3 h-3" />
            <span className="hidden sm:inline">Código DIV</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-TOOLBAR (Snap, Zoom, Coordinates & Panel Toggles) */}
      <div className="h-7 px-3 bg-[#0d121c] border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">Snap:</span>
          <div className="flex items-center gap-1">
            {[8, 16, 32, 64].map((s) => (
              <button
                key={s}
                onClick={() => setGridSnap(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  gridSnap === s ? "bg-amber-600 text-white font-bold" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1 ml-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSnap}
              onChange={(e) => setAutoSnap(e.target.checked)}
              className="accent-amber-500 w-3 h-3"
            />
            <span className="text-[10px]">AutoSnap: ON</span>
          </label>

          <span className="text-slate-600">|</span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomFactor((z) => Math.max(0.25, z - 0.25))}
              className="px-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px]"
            >
              -
            </button>
            <span className="text-[10px] tabular-nums text-slate-300">{Math.round(zoomFactor * 100)}%</span>
            <button
              onClick={() => setZoomFactor((z) => Math.min(3.0, z + 0.25))}
              className="px-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px]"
            >
              +
            </button>
          </div>
        </div>

        {/* Coordinates readout */}
        <div className="flex items-center gap-4 text-slate-400">
          <span className="tabular-nums">X: {cursorWorldCoords.x.toFixed(1)} Y: {cursorWorldCoords.y.toFixed(1)}</span>
          <span className="text-slate-500 hidden sm:inline">Sectores: {sectors.length} | Líneas: {linedefs.length}</span>
        </div>
      </div>

      {/* 3. MAIN WORKBENCH CANVAS AREA + FLOATING PALETTES */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex">
        {/* Overhead 2D Map View */}
        {(viewMode === "map2d" || viewMode === "split") && (
          <div className={`relative h-full ${viewMode === "split" ? "w-1/2 border-r border-slate-800" : "w-full"}`}>
            <canvas
              ref={mapCanvasRef}
              width={viewMode === "split" ? 640 : 1280}
              height={720}
              className="w-full h-full cursor-crosshair object-cover"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}

        {/* Real-time Visual 3D Preview */}
        {(viewMode === "visual3d" || viewMode === "split") && (
          <div className={`relative h-full bg-black ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
            <canvas
              ref={visual3DCanvasRef}
              width={640}
              height={480}
              className="w-full h-full object-contain"
            />
            {/* 3D Walkthrough Help Overlay */}
            <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/75 rounded text-[11px] font-mono text-cyan-300 border border-cyan-800/60 backdrop-blur-xs flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>WASD: Caminar | A/D: Girar | Vista 3D Real Doom 2</span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* FLOATING TOOLS PALETTE (Matching Screenshot 1 & 2)           */}
        {/* ------------------------------------------------------------- */}
        {showToolsPanel && (
          <div className="absolute top-3 left-3 w-40 bg-[#121824]/95 backdrop-blur-md rounded border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col z-30">
            <div className="px-2 py-1 bg-[#1a2334] border-b border-slate-700/70 flex items-center justify-between text-[11px] font-bold text-slate-200">
              <span>TOOLS</span>
              <button onClick={() => setShowToolsPanel(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-1.5 flex flex-col gap-1 text-[11px]">
              <button
                onClick={() => setCurrentTool("select")}
                className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 transition-colors ${
                  currentTool === "select" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span>Select (k)</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTool("polyline");
                  setPolyVertices([]);
                }}
                className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 transition-colors ${
                  currentTool === "polyline" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Poly line</span>
              </button>

              <button
                onClick={() => setCurrentTool("line")}
                className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 transition-colors ${
                  currentTool === "line" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Line (l)</span>
              </button>

              {/* STAIRS TOOL (CRUCIAL USER REQUEST!) */}
              <button
                onClick={() => {
                  setCurrentTool("stairs");
                  setShowStairsDialog(true);
                }}
                className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 transition-colors bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold`}
              >
                <Mountain className="w-3.5 h-3.5 text-amber-400" />
                <span>Escaleras (Stairs)</span>
              </button>

              <button
                onClick={() => setCurrentTool("move")}
                className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 transition-colors ${
                  currentTool === "move" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>Move (M)</span>
              </button>

              <button
                onClick={() => setCurrentTool("sector_fill")}
                className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 transition-colors ${
                  currentTool === "sector_fill" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>Sector get/fill</span>
              </button>

              <button
                onClick={() => setCurrentTool("new_thing")}
                className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 transition-colors ${
                  currentTool === "new_thing" ? "bg-amber-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>New thing (t)</span>
              </button>

              {/* VOXEL TOOL (Crucial User Request) */}
              <button
                onClick={() => {
                  setCurrentTool("voxel");
                  setShowVoxelPanel(true);
                }}
                className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 transition-colors ${
                  currentTool === "voxel" ? "bg-cyan-600 text-white font-semibold" : "hover:bg-slate-800 text-cyan-300"
                }`}
              >
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                <span>Vóxels 3D (v)</span>
              </button>

              <div className="h-px bg-slate-700/60 my-1" />

              {/* Action Buttons */}
              <button
                onClick={handleFusePoints}
                className="w-full px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] text-center"
              >
                Fuse Points
              </button>
              <button
                onClick={handleLaunchAndSave}
                className="w-full px-2 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded text-[10px] text-center shadow"
              >
                Launch & Save
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* FLOATING VOXEL PALETTE PANEL                                 */}
        {/* ------------------------------------------------------------- */}
        {showVoxelPanel && (
          <div className="absolute top-3 left-48 w-80 bg-[#101724]/95 backdrop-blur-md rounded border border-cyan-600/70 shadow-2xl overflow-hidden flex flex-col z-30 max-h-[85vh] overflow-y-auto text-xs">
            <div className="px-2.5 py-1.5 bg-[#142336] border-b border-cyan-800 flex items-center justify-between font-bold text-cyan-200">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                <span>Paleta Vóxels 3D ({placedVoxels.length})</span>
              </div>
              <button onClick={() => setShowVoxelPanel(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-2.5 flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold text-slate-300">Seleccionar Objeto Vóxel:</span>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {AVAILABLE_VOXEL_ITEMS.map((vox) => (
                  <button
                    key={vox.id}
                    onClick={() => {
                      setSelectedVoxelType(vox.id);
                      if (selectedVoxelIdx !== null && placedVoxels[selectedVoxelIdx]) {
                        setPlacedVoxels((prev) =>
                          prev.map((v, i) => (i === selectedVoxelIdx ? { ...v, voxelId: vox.id } : v))
                        );
                      }
                    }}
                    className={`p-1.5 rounded border text-left flex flex-col gap-0.5 transition-all ${
                      selectedVoxelType === vox.id
                        ? "bg-cyan-950/80 border-cyan-400 text-cyan-100 ring-1 ring-cyan-400/50"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: vox.iconColor }} />
                      <span className="font-bold text-[11px] truncate">{vox.name}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 line-clamp-1">{vox.desc}</span>
                  </button>
                ))}
              </div>

              {/* Voxel Transform Controls: Yaw and Scale */}
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300">Rotación (Yaw):</span>
                  <div className="flex items-center gap-1.5">
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
                          setPlacedVoxels((prev) =>
                            prev.map((v, i) => (i === selectedVoxelIdx ? { ...v, yaw: val } : v))
                          );
                        }
                      }}
                      className="w-24 accent-cyan-500"
                    />
                    <span className="font-mono text-cyan-300 w-8 text-right">{selectedVoxelYaw}°</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300">Escala (Scale):</span>
                  <div className="flex items-center gap-1.5">
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
                          setPlacedVoxels((prev) =>
                            prev.map((v, i) => (i === selectedVoxelIdx ? { ...v, scale: val } : v))
                          );
                        }
                      }}
                      className="w-24 accent-cyan-500"
                    />
                    <span className="font-mono text-cyan-300 w-8 text-right">{selectedVoxelScale.toFixed(1)}x</span>
                  </div>
                </div>
              </div>

              {/* Selected Voxel Detail / Delete */}
              {selectedVoxelIdx !== null && placedVoxels[selectedVoxelIdx] && (
                <div className="p-2 bg-cyan-950/40 rounded border border-cyan-900/60 flex flex-col gap-1 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-cyan-300">Vóxel #{selectedVoxelIdx + 1} Seleccionado</span>
                    <button
                      onClick={() => {
                        setPlacedVoxels((prev) => prev.filter((_, i) => i !== selectedVoxelIdx));
                        setSelectedVoxelIdx(null);
                        showToast("Vóxel eliminado");
                      }}
                      className="px-1.5 py-0.5 bg-red-900/60 hover:bg-red-800 text-red-200 rounded flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                  <span className="text-slate-400 font-mono">
                    Pos: ({placedVoxels[selectedVoxelIdx].x.toFixed(1)}, {placedVoxels[selectedVoxelIdx].y.toFixed(1)}, Z: {placedVoxels[selectedVoxelIdx].z.toFixed(1)})
                  </span>
                </div>
              )}

              <div className="p-2 bg-slate-900/80 rounded border border-slate-800 text-[10px] text-cyan-200 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Haz clic en el mapa 2D con la herramienta Vóxel (v) para insertar el objeto.</span>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* FLOATING SECTOR EDITOR PANEL (Matching Screenshot 1 & 2)     */}
        {/* ------------------------------------------------------------- */}
        {showSectorPanel && (
          <div className="absolute top-3 right-3 w-72 bg-[#121824]/95 backdrop-blur-md rounded border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col z-30 max-h-[90vh] overflow-y-auto text-xs">
            <div className="px-2.5 py-1.5 bg-[#1a2334] border-b border-slate-700/70 flex items-center justify-between font-bold text-slate-200">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Sector: #{curSector.id}</span>
              </div>
              <button onClick={() => setShowSectorPanel(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-2.5 flex flex-col gap-2.5">
              {/* Ceiling height & Floor height steppers */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Ceiling height:</span>
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5">
                    <input
                      type="number"
                      step="0.2"
                      value={curSector.ceilHeight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSectors((prev) => prev.map((s) => (s.id === curSector.id ? { ...s, ceilHeight: val } : s)));
                      }}
                      className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Floor height:</span>
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5">
                    <input
                      type="number"
                      step="0.2"
                      value={curSector.floorHeight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSectors((prev) => prev.map((s) => (s.id === curSector.id ? { ...s, floorHeight: val } : s)));
                      }}
                      className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Total height readout */}
              <div className="text-[11px] text-slate-400 flex justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
                <span>Total height:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {(curSector.ceilHeight - curSector.floorHeight).toFixed(2)} unidades
                </span>
              </div>

              {/* Light level slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>Light level:</span>
                  <span className="font-mono text-white">{curSector.lightLevel ?? 180}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={curSector.lightLevel ?? 180}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setSectors((prev) => prev.map((s) => (s.id === curSector.id ? { ...s, lightLevel: val } : s)));
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Special & Tag */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Special:</span>
                  <button
                    onClick={() => setShowSpecialListDialog(true)}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded text-left text-[11px] font-mono flex items-center justify-between"
                  >
                    <span>{curSector.special || 0}</span>
                    <span className="text-[9px] text-slate-500">List</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Tag:</span>
                  <input
                    type="number"
                    value={curSector.tag || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setSectors((prev) => prev.map((s) => (s.id === curSector.id ? { ...s, tag: val } : s)));
                    }}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Where flat will go: Ceiling / Floor */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold">Where flat will go:</span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="flatTarget"
                      checked={selectedFlatTarget === "floor"}
                      onChange={() => setSelectedFlatTarget("floor")}
                      className="accent-amber-500"
                    />
                    <span>Floor</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="flatTarget"
                      checked={selectedFlatTarget === "ceiling"}
                      onChange={() => setSelectedFlatTarget("ceiling")}
                      className="accent-amber-500"
                    />
                    <span>Ceiling</span>
                  </label>
                </div>
              </div>

              {/* Flats Texture Palette Selector */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  <Search className="w-3 h-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Find flat (e.g. FLOOR4, NUKAGE)..."
                    value={flatSearchFilter}
                    onChange={(e) => setFlatSearchFilter(e.target.value)}
                    className="w-full bg-transparent text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/80 rounded border border-slate-800">
                  {DOOM_FLATS.filter((f) => f.name.toLowerCase().includes(flatSearchFilter.toLowerCase())).map((flat) => {
                    const isSelected =
                      selectedFlatTarget === "floor"
                        ? curSector.floorTexture === flat.name
                        : curSector.ceilTexture === flat.name;

                    return (
                      <button
                        key={flat.name}
                        onClick={() => {
                          setSelectedFlatTex(flat.name);
                          setSectors((prev) =>
                            prev.map((s) => {
                              if (s.id === curSector.id) {
                                return selectedFlatTarget === "floor"
                                  ? { ...s, floorTexture: flat.name }
                                  : { ...s, ceilTexture: flat.name };
                              }
                              return s;
                            })
                          );
                        }}
                        className={`flex flex-col items-center p-1 rounded border transition-colors ${
                          isSelected ? "border-amber-500 bg-amber-500/20" : "border-slate-800 hover:border-slate-600 bg-slate-900"
                        }`}
                        title={`${flat.name}: ${flat.description}`}
                      >
                        <div
                          className="w-7 h-7 rounded-xs border border-black/50 shadow-inner"
                          style={{ backgroundColor: flat.color }}
                        />
                        <span className="text-[8px] font-mono text-slate-300 truncate w-full text-center mt-1">
                          {flat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* FLOATING TEXTURE PALETTE PANEL (Matching Screenshot 1 & 2)    */}
        {/* ------------------------------------------------------------- */}
        {showTexturePanel && (
          <div className="absolute bottom-3 left-48 w-64 bg-[#121824]/95 backdrop-blur-md rounded border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col z-30 max-h-80">
            <div className="px-2.5 py-1.5 bg-[#1a2334] border-b border-slate-700/70 flex items-center justify-between font-bold text-slate-200 text-xs">
              <span>Texture: {selectedWallTex}</span>
              <button onClick={() => setShowTexturePanel(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-2 flex flex-col gap-2">
              {/* Texture Category Selector Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                {["all", "walls", "tech", "gothic", "doors_steps"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveWallCategory(cat)}
                    className={`px-1.5 py-0.5 rounded capitalize ${
                      activeWallCategory === cat ? "bg-amber-600 text-white font-bold" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid of Doom wall textures */}
              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-950/80 rounded border border-slate-800">
                {DOOM_WALL_TEXTURES.filter(
                  (t) =>
                    (activeWallCategory === "all" || t.category === activeWallCategory) &&
                    t.name.toLowerCase().includes(wallSearchFilter.toLowerCase())
                ).map((tex) => (
                  <button
                    key={tex.name}
                    onClick={() => {
                      setSelectedWallTex(tex.name);
                      // Apply to currently selected line if any
                      if (curLine) {
                        setLinedefs((prev) =>
                          prev.map((l) =>
                            l.id === curLine.id ? { ...l, middleTexture: tex.name, lowerTexture: tex.name } : l
                          )
                        );
                      }
                    }}
                    className={`flex flex-col items-center p-1 rounded border transition-colors ${
                      selectedWallTex === tex.name ? "border-amber-500 bg-amber-500/20" : "border-slate-800 hover:border-slate-600 bg-slate-900"
                    }`}
                    title={`${tex.name} (${tex.width}x${tex.height}): ${tex.description}`}
                  >
                    <div
                      className="w-12 h-12 rounded-xs border border-black/50 shadow-inner flex items-center justify-center font-bold font-mono text-[9px] text-white"
                      style={{ backgroundColor: tex.dominantColor }}
                    >
                      {tex.name.substring(0, 5)}
                    </div>
                    <span className="text-[8px] font-mono text-slate-300 truncate w-full text-center mt-1">
                      {tex.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* FLOATING LINE INSPECTOR (Matching Screenshot 1 & 2 & 3)       */}
        {/* ------------------------------------------------------------- */}
        {showLinePanel && curLine && (
          <div className="absolute bottom-3 right-3 w-80 bg-[#121824]/95 backdrop-blur-md rounded border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col z-30 text-xs">
            <div className="px-2.5 py-1.5 bg-[#1a2334] border-b border-slate-700/70 flex items-center justify-between font-bold text-slate-200">
              <span>Linedef #{curLine.id}</span>
              <button onClick={() => setShowLinePanel(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-2.5 flex flex-col gap-2">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Length: {Math.hypot(curLine.x2 - curLine.x1, curLine.y2 - curLine.y1).toFixed(1)}</span>
                <span>P1: ({curLine.x1}, {curLine.y1}) → P2: ({curLine.x2}, {curLine.y2})</span>
              </div>

              {/* Linedef Checkboxes */}
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={curLine.isTwoSided || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setLinedefs((prev) =>
                        prev.map((l) => (l.id === curLine.id ? { ...l, isTwoSided: checked } : l))
                      );
                    }}
                    className="accent-amber-500"
                  />
                  <span>2-sided</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={curLine.blocking !== false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setLinedefs((prev) =>
                        prev.map((l) => (l.id === curLine.id ? { ...l, blocking: checked } : l))
                      );
                    }}
                    className="accent-amber-500"
                  />
                  <span>Block</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={curLine.secret || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setLinedefs((prev) =>
                        prev.map((l) => (l.id === curLine.id ? { ...l, secret: checked } : l))
                      );
                    }}
                    className="accent-amber-500"
                  />
                  <span>Secret</span>
                </label>
              </div>

              {/* Texture Slots: Top, Middle, Bottom */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Middle Texture:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-amber-300">{curLine.middleTexture || "NONE"}</span>
                    <button
                      onClick={() =>
                        setLinedefs((prev) =>
                          prev.map((l) => (l.id === curLine.id ? { ...l, middleTexture: selectedWallTex } : l))
                        )
                      }
                      className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px]"
                    >
                      Set
                    </button>
                  </div>
                </div>

                {curLine.isTwoSided && (
                  <>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Lower Texture (Stairs/Ledge):</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-orange-400">{curLine.lowerTexture || "STEP1"}</span>
                        <button
                          onClick={() =>
                            setLinedefs((prev) =>
                              prev.map((l) => (l.id === curLine.id ? { ...l, lowerTexture: selectedWallTex } : l))
                            )
                          }
                          className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px]"
                        >
                          Set
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Upper Texture (Archway):</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-slate-300">{curLine.upperTexture || "STARTAN3"}</span>
                        <button
                          onClick={() =>
                            setLinedefs((prev) =>
                              prev.map((l) => (l.id === curLine.id ? { ...l, upperTexture: selectedWallTex } : l))
                            )
                          }
                          className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px]"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAIRCASE GENERATOR DIALOG MODAL                              */}
        {/* ------------------------------------------------------------- */}
        {showStairsDialog && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="w-96 bg-[#151c2c] rounded border border-amber-500/50 shadow-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Mountain className="w-4 h-4" />
                  <span>Generador de Escaleras (Stair Builder)</span>
                </div>
                <button onClick={() => setShowStairsDialog(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Número de peldaños (Steps):</span>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={stairSteps}
                    onChange={(e) => setStairSteps(parseInt(e.target.value, 10) || 5)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-center"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Elevación por peldaño (Height):</span>
                  <input
                    type="number"
                    step="0.05"
                    value={stairHeightDelta}
                    onChange={(e) => setStairHeightDelta(parseFloat(e.target.value) || 0.2)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-center"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Ancho de escalera (Width):</span>
                  <input
                    type="number"
                    step="0.5"
                    value={stairWidth}
                    onChange={(e) => setStairWidth(parseFloat(e.target.value) || 2.0)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-center"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Textura de contrahuella:</span>
                  <select
                    value={stairTexture}
                    onChange={(e) => setStairTexture(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono"
                  >
                    <option value="STEP1">STEP1 (Metal con remaches)</option>
                    <option value="STEP2">STEP2 (Acero bajo)</option>
                    <option value="BROWN144">BROWN144 (Ladrillo marrón)</option>
                    <option value="BRICK1">BRICK1 (Ladrillo rojo)</option>
                  </select>
                </div>

                <div className="p-2 bg-slate-900/80 rounded border border-slate-800 text-[11px] text-amber-200">
                  Altura total acumulada: <span className="font-mono font-bold">{(stairSteps * stairHeightDelta).toFixed(2)} unidades</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
                <button
                  onClick={() => setShowStairsDialog(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateStaircase}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs shadow-md"
                >
                  Construir Escalera
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SECTOR SPECIALS LIST DIALOG MODAL                             */}
        {/* ------------------------------------------------------------- */}
        {showSpecialListDialog && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="w-80 bg-[#151c2c] rounded border border-slate-700 shadow-2xl p-3 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="font-bold text-amber-400">Sector Specials List</span>
                <button onClick={() => setShowSpecialListDialog(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                {[
                  { id: 0, name: "0: Normal" },
                  { id: 1, name: "1: Light_Blink_Random" },
                  { id: 4, name: "4: Damage_HellSlime (-10 HP)" },
                  { id: 7, name: "7: Damage_Nukage (-5 HP)" },
                  { id: 9, name: "9: Secret_Sector (+1000 Pts)" },
                  { id: 10, name: "10: Door_Close_in_30" },
                  { id: 16, name: "16: Damage_SuperHellSlime (-20 HP)" },
                ].map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => {
                      setSectors((prev) =>
                        prev.map((s) => (s.id === curSector.id ? { ...s, special: spec.id } : s))
                      );
                      setShowSpecialListDialog(false);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 text-slate-200 border border-transparent hover:border-slate-700"
                  >
                    {spec.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: CARGAR NIVEL Y PLANTILLAS                             */}
        {/* ------------------------------------------------------------- */}
        {isLoadModalOpen && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl bg-[#111724] rounded-lg border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-xs">
              {/* Header */}
              <div className="px-4 py-3 bg-[#172033] border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                  <span>Explorador y Cargador de Niveles Modo 8</span>
                </div>
                <button
                  onClick={() => setIsLoadModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-800 bg-[#0d121c] px-4 pt-2 gap-2">
                <button
                  onClick={() => setLoadModalTab("presets")}
                  className={`px-3 py-1.5 font-medium border-b-2 transition-colors ${
                    loadModalTab === "presets"
                      ? "border-amber-500 text-amber-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Plantillas Oficiales ({BUILTIN_LEVEL_PRESETS.length})
                </button>
                <button
                  onClick={() => {
                    setUserSavedLevels(loadSavedUserLevels());
                    setLoadModalTab("saved");
                  }}
                  className={`px-3 py-1.5 font-medium border-b-2 transition-colors ${
                    loadModalTab === "saved"
                      ? "border-amber-500 text-amber-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Mis Niveles Guardados ({userSavedLevels.length})
                </button>
                <button
                  onClick={() => setLoadModalTab("import")}
                  className={`px-3 py-1.5 font-medium border-b-2 transition-colors ${
                    loadModalTab === "import"
                      ? "border-amber-500 text-amber-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Importar Archivo (.divlvl)
                </button>
              </div>

              {/* Body */}
              <div className="p-4 overflow-y-auto flex-1">
                {loadModalTab === "presets" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BUILTIN_LEVEL_PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 hover:border-amber-500/50 flex flex-col justify-between gap-2.5 transition-all"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-300 text-sm">{preset.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {preset.theme}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] leading-relaxed">{preset.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                            <span>{preset.sectors.length} sect</span>
                            <span>{preset.linedefs.length} líneas</span>
                            <span className="text-cyan-400 font-semibold">{preset.placedVoxels?.length || 0} vóxels</span>
                          </div>
                          <button
                            onClick={() => handleLoadLevelData(preset)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[11px] shadow transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Cargar Nivel</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {loadModalTab === "saved" && (
                  <div className="flex flex-col gap-2">
                    {userSavedLevels.length === 0 ? (
                      <div className="text-center py-10 flex flex-col items-center gap-2 text-slate-400">
                        <FolderOpen className="w-8 h-8 text-slate-600" />
                        <span className="text-sm font-semibold">No tienes niveles guardados aún.</span>
                        <p className="text-xs max-w-sm">
                          Usa el botón "Guardar Nivel Como..." desde el menú Proyecto o la barra de acciones para almacenar mapas en tu navegador.
                        </p>
                      </div>
                    ) : (
                      userSavedLevels.map((lvl) => (
                        <div
                          key={lvl.id}
                          className="p-3 bg-slate-900/80 rounded border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-100 text-sm">{lvl.name}</span>
                            <span className="text-[10px] text-slate-400">
                              Actualizado: {lvl.updatedAt ? new Date(lvl.updatedAt).toLocaleString() : "Reciente"} • {lvl.sectors.length} sectores • {lvl.linedefs.length} líneas • {lvl.placedVoxels?.length || 0} vóxels
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleLoadLevelData(lvl)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs"
                            >
                              Cargar
                            </button>
                            <button
                              onClick={() => {
                                deleteSavedUserLevel(lvl.id);
                                setUserSavedLevels(loadSavedUserLevels());
                                showToast(`Nivel "${lvl.name}" eliminado`);
                              }}
                              className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800"
                              title="Eliminar nivel guardado"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {loadModalTab === "import" && (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-lg bg-slate-900/40 text-center gap-3">
                    <Upload className="w-8 h-8 text-purple-400" />
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-200">Importar Archivo de Nivel (.divlvl o .json)</span>
                      <span className="text-[11px] text-slate-400">
                        Selecciona un archivo exportado previamente por ReDoomEd
                      </span>
                    </div>
                    <label className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded cursor-pointer transition-colors shadow">
                      <span>Seleccionar Archivo...</span>
                      <input
                        type="file"
                        accept=".divlvl,.json"
                        onChange={handleImportFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: GUARDAR NIVEL                                          */}
        {/* ------------------------------------------------------------- */}
        {isSaveModalOpen && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md bg-[#111724] rounded-lg border border-slate-700 shadow-2xl p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
                  <Save className="w-4 h-4 text-emerald-400" />
                  <span>Guardar Nivel Modo 8</span>
                </div>
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-slate-300">
                  <span className="font-semibold">Nombre del Nivel:</span>
                  <input
                    type="text"
                    value={saveSlotName}
                    onChange={(e) => setSaveSlotName(e.target.value)}
                    placeholder="Ej. Mi Base UAC..."
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </label>

                <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Sectores Poligonales:</span>
                    <span className="font-mono text-slate-200">{sectors.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Linedefs (Paredes/Portales):</span>
                    <span className="font-mono text-slate-200">{linedefs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vóxels 3D Decorativos:</span>
                    <span className="font-mono text-cyan-300">{placedVoxels.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entidades (Marine / Enemigos):</span>
                    <span className="font-mono text-slate-200">{entities.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={handleDownloadLevelFile}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Descargar .divlvl</span>
                </button>
                <button
                  onClick={() => handleSaveToSlot(saveSlotName)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar en Navegador</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: AYUDA Y ATAJOS DE TECLADO                             */}
        {/* ------------------------------------------------------------- */}
        {isHelpModalOpen && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-lg bg-[#111724] rounded-lg border border-slate-700 shadow-2xl p-4 flex flex-col gap-3 text-xs max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Manual de ReDoomEd y Modo 8 Vóxel</span>
                </div>
                <button
                  onClick={() => setIsHelpModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-slate-300">
                <div>
                  <h4 className="font-bold text-amber-400 mb-1">🎮 Navegación en Vista 3D (Walkthrough)</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-400">
                    <li><strong className="text-slate-200">W / S</strong>: Avanzar y retroceder con detección de colisión y escaleras.</li>
                    <li><strong className="text-slate-200">A / D</strong>: Rotar cámara a izquierda o derecha.</li>
                    <li><strong className="text-slate-200">Arrastrar Ratón 3D</strong>: Mirar alrededor e inclinación de cámara (pitch).</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-amber-400 mb-1">🗺️ Herramientas de Edición 2D</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-400">
                    <li><strong className="text-slate-200">Select (k)</strong>: Selecciona vértices, paredes, sectores o vóxels.</li>
                    <li><strong className="text-slate-200">Poly line</strong>: Dibuja polígonos. Cierra haciendo clic sobre el vértice de inicio.</li>
                    <li><strong className="text-slate-200">Escaleras (Stairs)</strong>: Genera escaleras automatizadas calculando peldaños y altura.</li>
                    <li><strong className="text-slate-200">Vóxels 3D (v)</strong>: Inserta antorchas, barriles, columnas, consolas o botiquines volumétricos con oclusión z-buffer.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-amber-400 mb-1">💾 Gestión de Mapas y Modo 8</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-400">
                    <li><strong className="text-slate-200">Ejecutar Nivel (F9)</strong>: Inicia el mapa en el runtime del juego con renderizado poligonal y vóxels activos.</li>
                    <li><strong className="text-slate-200">Guardar / Cargar</strong>: Almacena tus mapas en almacenamiento local o exporta e importa archivos <code className="text-amber-300 font-mono">.divlvl</code>.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setIsHelpModalOpen(false)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TOAST FEEDBACK NOTIFICATION                                   */}
        {/* ------------------------------------------------------------- */}
        {toastMessage && (
          <div className="absolute bottom-4 right-4 bg-[#111724] text-slate-100 px-3.5 py-2 rounded-md border border-amber-500/60 shadow-2xl flex items-center gap-2 text-xs z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
