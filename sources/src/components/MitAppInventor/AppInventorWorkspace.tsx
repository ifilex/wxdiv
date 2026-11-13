import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Plus,
  Minus,
  Target,
  Trash2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Code2,
  Play,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  Layers,
  FileCode,
  Sliders,
  Settings,
  X,
  Copy,
  Info,
} from "lucide-react";
import { BlockInstance, BlockCategory } from "./types";
import {
  MIT_CATEGORIES,
  DEFAULT_COMPONENTS,
  DEFAULT_MEDIA_ASSETS,
  getInitialAppInventorBlocks,
} from "./blockLibrary";
import { BlockSvg } from "./BlockSvg";
import { generateDivCodeFromBlocks } from "./blocksToDivGenerator";
import { parseDivToAppInventorBlocks } from "./divToBlocksParser";
import { AiBlockAssistantModal } from "./AiBlockAssistantModal";
import { BlockDataStructureBuilder } from "./BlockDataStructureBuilder";
import { TextBlockComponent } from "./TextBlockComponent";
import { MitAppDesigner } from "./MitAppDesigner";
import {
  DesignerComponent,
  ScreenProperties,
  DEFAULT_SCREEN_PROPERTIES,
} from "./designerTypes";

interface AppInventorWorkspaceProps {
  initialCode?: string;
  projectName?: string;
  onChangeCode: (newCode: string) => void;
  onRunGame?: () => void;
  onSwitchToDesigner?: () => void;
  onSwitchToCodeEditor?: () => void;
  initialMode?: "designer" | "blocks";
  embeddedMode?: boolean;
}

export const AppInventorWorkspace: React.FC<AppInventorWorkspaceProps> = ({
  initialCode = "",
  projectName = "MiAppAndroid",
  onChangeCode,
  onRunGame,
  onSwitchToDesigner,
  onSwitchToCodeEditor,
  initialMode = "designer",
  embeddedMode = false,
}) => {
  // Main view mode: "designer" (Mobile Phone Designer) | "blocks" (Blockly Canvas)
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<"designer" | "blocks">(initialMode);

  useEffect(() => {
    setActiveWorkspaceMode(initialMode);
  }, [initialMode]);

  // Mobile Designer Components State
  const [designerComponents, setDesignerComponents] = useState<DesignerComponent[]>([
    {
      id: "Canvas1",
      type: "Canvas",
      name: "Canvas1",
      text: "Lienzo de Juego",
      textColor: "#ffffff",
      backgroundColor: "#0f172a",
      fontSize: 14,
      fontBold: true,
      width: "fill",
      height: 220,
      enabled: true,
      visible: true,
      alignment: "center",
    },
    {
      id: "Button1",
      type: "Button",
      name: "Button1",
      text: "Iniciar Juego",
      textColor: "#ffffff",
      backgroundColor: "#5b871c",
      fontSize: 14,
      fontBold: true,
      width: "fill",
      height: "auto",
      enabled: true,
      visible: true,
      alignment: "center",
    },
    {
      id: "Label1",
      type: "Label",
      name: "Label1",
      text: "Puntuación: 0 | Vidas: 3",
      textColor: "#1f2937",
      backgroundColor: "transparent",
      fontSize: 15,
      fontBold: true,
      width: "fill",
      height: "auto",
      enabled: true,
      visible: true,
      alignment: "center",
    },
  ]);

  // Screen Properties (Title, AppName, BackgroundColor, PrimaryColor, etc.)
  const [screenProps, setScreenProps] = useState<ScreenProperties>({
    ...DEFAULT_SCREEN_PROPERTIES,
    appName: projectName && projectName !== "MazeGame_2C_07" ? projectName : "Mi App Móvil",
    title: "Screen1",
    backgroundColor: "#ffffff",
    primaryColor: "#5b871c",
  });

  // Canvas State: Blocks start EMPTY by default!
  const [blocks, setBlocks] = useState<BlockInstance[]>(() => {
    if (initialCode && initialCode.trim().length > 30 && !initialCode.includes("empty_project")) {
      const parsed = parseDivToAppInventorBlocks(initialCode);
      if (parsed.length > 0) return parsed;
    }
    // Default is clean EMPTY canvas
    return [];
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Flyout Drawer State (Cajón de Bloques que se abre al hacer clic en una categoría)
  const [activeFlyoutCategory, setActiveFlyoutCategory] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState("Screen1");

  // Backpack state (Mochila de App Inventor)
  const [backpack, setBackpack] = useState<BlockInstance[]>([]);
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);

  // AI Assistant Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Data Structure Builder State (Text, Lists, Dictionaries, Colors)
  const [isDataBuilderOpen, setIsDataBuilderOpen] = useState(false);
  const [isTextBlockEditorOpen, setIsTextBlockEditorOpen] = useState(false);
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  // Trashcan hover & mobile drawer state
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [isMobileBlocksDrawerOpen, setIsMobileBlocksDrawerOpen] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const trashRef = useRef<HTMLDivElement>(null);

  const showNotice = useCallback((msg: string) => {
    setWorkspaceNotice(msg);
    setTimeout(() => setWorkspaceNotice(null), 2400);
  }, []);

  // Sync blocks whenever initialCode changes
  useEffect(() => {
    if (initialCode && initialCode.trim().length > 10) {
      const parsed = parseDivToAppInventorBlocks(initialCode);
      if (parsed.length > 0) {
        setBlocks(parsed);
      }
    }
  }, [initialCode]);

  const handleRefreshFromCode = () => {
    if (initialCode && initialCode.trim().length > 10) {
      const parsed = parseDivToAppInventorBlocks(initialCode);
      if (parsed.length > 0) {
        setBlocks(parsed);
        showNotice("Bloques sincronizados con el código");
      }
    }
  };

  // Tree expansion state
  const [isBuiltInOpen, setIsBuiltInOpen] = useState(true);
  const [isScreen1Open, setIsScreen1Open] = useState(true);
  const [isCanvas1Open, setIsCanvas1Open] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync to DIV code whenever blocks change
  const syncToDivCode = useCallback(
    (newBlocks: BlockInstance[]) => {
      const divCode = generateDivCodeFromBlocks(newBlocks);
      onChangeCode(divCode);
    },
    [onChangeCode]
  );

  // Direct field change handler for inline inputs (e.g., text blocks)
  const handleBlockFieldChange = useCallback(
    (blockId: string, fieldKey: string, newValue: any) => {
      setBlocks((prev) => {
        const updated = prev.map((b) => {
          if (b.id !== blockId) return b;
          if (fieldKey === "text") {
            const strVal = String(newValue);
            return {
              ...b,
              title: b.category === "Variables" ? b.title : `"${strVal}"`,
              subtitle: `"${strVal.substring(0, 18)}"`,
              fields: { ...b.fields, text: strVal, value: `"${strVal}"` },
              inlineValues: [{ label: "str", value: `"${strVal.substring(0, 16)}"`, color: "#c44078" }],
            };
          }
          return { ...b, fields: { ...b.fields, [fieldKey]: newValue } };
        });
        syncToDivCode(updated);
        return updated;
      });
    },
    [syncToDivCode]
  );

  // Pointer drag handlers for blocks (touch & mouse)
  const handleBlockPointerDown = (e: React.PointerEvent, blockId: string) => {
    e.stopPropagation();
    setSelectedBlockId(blockId);
    setDraggingBlockId(blockId);

    const block = blocks.find((b) => b.id === blockId);
    if (!block || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const ptrX = (e.clientX - rect.left - canvasOffset.x) / zoomLevel;
    const ptrY = (e.clientY - rect.top - canvasOffset.y) / zoomLevel;

    setDragOffset({
      x: ptrX - block.x,
      y: ptrY - block.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingBlockId && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const ptrX = (e.clientX - rect.left - canvasOffset.x) / zoomLevel;
      const ptrY = (e.clientY - rect.top - canvasOffset.y) / zoomLevel;

      if (trashRef.current) {
        const tRect = trashRef.current.getBoundingClientRect();
        const overTrash =
          e.clientX >= tRect.left &&
          e.clientX <= tRect.right &&
          e.clientY >= tRect.top &&
          e.clientY <= tRect.bottom;
        if (overTrash !== isTrashHovered) setIsTrashHovered(overTrash);
      }

      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id === draggingBlockId) {
            return {
              ...b,
              x: Math.round(ptrX - dragOffset.x),
              y: Math.round(ptrY - dragOffset.y),
            };
          }
          return b;
        })
      );
    } else if (isPanning) {
      setCanvasOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handlePointerUp = () => {
    if (draggingBlockId) {
      if (isTrashHovered) {
        const remaining = blocks.filter((b) => b.id !== draggingBlockId);
        setBlocks(remaining);
        setDraggingBlockId(null);
        setSelectedBlockId(null);
        setIsTrashHovered(false);
        syncToDivCode(remaining);
        return;
      }

      setDraggingBlockId(null);
      syncToDivCode(blocks);
    }
    setIsPanning(false);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === "svg") {
      setSelectedBlockId(null);
      setActiveFlyoutCategory(null);
      setIsPanning(true);
      setPanStart({
        x: e.clientX - canvasOffset.x,
        y: e.clientY - canvasOffset.y,
      });
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.0, z + 0.15));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.4, z - 0.15));
  const handleCenter = () => {
    setCanvasOffset({ x: 0, y: 0 });
    setZoomLevel(1);
  };

  // Add block from palette
  const handleSpawnBlock = (
    category: BlockCategory,
    title: string,
    color: string,
    shape: BlockInstance["shape"],
    extra?: Partial<BlockInstance>
  ) => {
    const newBlock: BlockInstance = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: `${category.toLowerCase()}_item`,
      category,
      shape,
      color,
      title,
      x: Math.round((-canvasOffset.x + 280) / zoomLevel),
      y: Math.round((-canvasOffset.y + 160) / zoomLevel),
      inputs: shape === "c-block" || shape === "hat" ? [{ id: "do", name: "do", type: "statement" }] : [],
      fields: {},
      ...extra,
    };

    const updated = [...blocks, newBlock];
    setBlocks(updated);
    setSelectedBlockId(newBlock.id);
    setActiveFlyoutCategory(null);
    setIsMobileBlocksDrawerOpen(false);
    syncToDivCode(updated);
  };

  // Copy block to backpack
  const handleCopyToBackpack = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      setBackpack((prev) => [...prev, { ...block, id: `bp_${Date.now()}` }]);
    }
  };

  return (
    <div className="flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] font-sans select-none overflow-hidden text-xs relative">
      {workspaceNotice && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] shadow-lg text-xs font-semibold text-[#111827]">
          {workspaceNotice}
        </div>
      )}

      {/* Top Header (Hidden in embeddedMode when StudioWorkspace already renders unified top bar) */}
      {!embeddedMode && (
        <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-[#E2E8F0] text-[#111827] flex-shrink-0 z-30 gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-xs tracking-wide text-[#7C2D48] truncate">
              {projectName}
            </span>
            <select
              value={activeScreen}
              onChange={(e) => setActiveScreen(e.target.value)}
              className="bg-[#F7F8FA] text-[#111827] font-semibold text-xs rounded-lg px-2 py-1.5 outline-none border border-[#E2E8F0] cursor-pointer"
            >
              <option value="Screen1">Screen1</option>
              <option value="Screen2">Screen2</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleRefreshFromCode}
              className="px-2.5 py-1.5 rounded-lg bg-[#F7F8FA] hover:bg-slate-100 text-[#4B5563] text-xs font-semibold border border-[#E2E8F0] flex items-center gap-1 cursor-pointer"
              title="Sincronizar bloques desde el código DIV"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Sincronizar</span>
            </button>

            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AURA IA</span>
            </button>

            {onRunGame && (
              <button
                onClick={onRunGame}
                className="px-3 py-1.5 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Probar</span>
              </button>
            )}

            <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold">
              <button
                onClick={() => setActiveWorkspaceMode("designer")}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${
                  activeWorkspaceMode === "designer" ? "bg-white text-[#7C2D48] shadow-2xs" : "text-[#4B5563]"
                }`}
              >
                Diseñar
              </button>
              <button
                onClick={() => setActiveWorkspaceMode("blocks")}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${
                  activeWorkspaceMode === "blocks" ? "bg-white text-[#7C2D48] shadow-2xs" : "text-[#4B5563]"
                }`}
              >
                Bloques
              </button>
              {onSwitchToCodeEditor && (
                <button
                  onClick={onSwitchToCodeEditor}
                  className="px-2.5 py-1 rounded-md text-[#4B5563] hover:text-[#111827] flex items-center gap-1 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">DIV</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Body Content: Mobile Designer or Blocks Workspace */}
      {activeWorkspaceMode === "designer" ? (
        <MitAppDesigner
          components={designerComponents}
          screenProps={screenProps}
          onUpdateComponents={setDesignerComponents}
          onUpdateScreenProps={setScreenProps}
          onSwitchToBlocks={() => setActiveWorkspaceMode("blocks")}
          onRunGame={onRunGame}
        />
      ) : (
        <div
          className="flex-1 flex-grow min-h-0 w-full flex flex-col md:flex-row overflow-hidden relative"
          style={{ flexGrow: 1, minHeight: 0, height: "100%" }}
        >
        {/* Mobile Blocks Quick Action Bar */}
        <div className="flex md:hidden items-center justify-between gap-2 px-3 py-2 bg-white border-b border-[#E2E8F0] flex-shrink-0 z-20">
          <button
            type="button"
            onClick={() => setIsMobileBlocksDrawerOpen(true)}
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#7C2D48] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Bloques</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefreshFromCode}
              className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0] text-[#4B5563] font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sync</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#FDF2F5] border border-[#F3D0DC] text-[#7C2D48] font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>IA</span>
            </button>
          </div>
        </div>

        {/* Left Column: Blocks & Media Tree Panel (Always visible on md+, slide-over drawer on mobile) */}
        <div
          className={`${
            isMobileBlocksDrawerOpen
              ? "flex absolute inset-0 sm:inset-y-0 sm:left-0 sm:w-72 z-40"
              : "hidden md:flex md:w-60"
          } bg-white border-r border-[#E2E8F0] flex-col flex-shrink-0 select-none overflow-y-auto`}
        >
          {/* Header Blocks Bar */}
          <div className="px-3 py-2 bg-[#F7F8FA] border-b border-[#E2E8F0] text-[#111827] font-bold text-xs flex items-center justify-between flex-shrink-0">
            <span>Categorías de Bloques</span>
            <button
              type="button"
              onClick={() => setIsMobileBlocksDrawerOpen(false)}
              className="md:hidden w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-[#4B5563]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2 space-y-2">
            {/* Built-in Accordion */}
            <div className="bg-white rounded border border-[#c4d4a8] overflow-hidden shadow-xs">
              <button
                onClick={() => setIsBuiltInOpen(!isBuiltInOpen)}
                className="w-full px-2 py-1 bg-[#f4f7ed] hover:bg-[#edf2e3] font-semibold text-xs text-slate-800 flex items-center justify-between border-b border-[#c4d4a8]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-mono text-[10px]">
                    {isBuiltInOpen ? "➖" : "➕"}
                  </span>
                  <span>Built-in</span>
                </div>
              </button>

              {isBuiltInOpen && (
                <div className="p-1.5 flex flex-col gap-0.5">
                  {MIT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveFlyoutCategory(activeFlyoutCategory === cat.id ? null : cat.id)}
                      className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 text-xs font-semibold transition-colors ${
                        activeFlyoutCategory === cat.id
                          ? "bg-[#e2edd0] text-emerald-900 border border-[#b5cc95]"
                          : "hover:bg-[#f1f6e9] text-slate-700"
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-xs border border-black/20 flex-shrink-0 shadow-2xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Components Accordion */}
            <div className="bg-white rounded border border-[#c4d4a8] overflow-hidden shadow-xs">
              <button
                onClick={() => setIsScreen1Open(!isScreen1Open)}
                className="w-full px-2 py-1 bg-[#f4f7ed] hover:bg-[#edf2e3] font-semibold text-xs text-slate-800 flex items-center justify-between border-b border-[#c4d4a8]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-mono text-[10px]">
                    {isScreen1Open ? "➖" : "➕"}
                  </span>
                  <span>Screen1</span>
                </div>
              </button>

              {isScreen1Open && (
                <div className="p-1.5 flex flex-col gap-1 pl-3">
                  {/* Dynamic Designer Components */}
                  {designerComponents.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => setActiveFlyoutCategory(activeFlyoutCategory === comp.name ? null : comp.name)}
                      className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 text-xs font-medium transition-colors ${
                        activeFlyoutCategory === comp.name
                          ? "bg-[#e2edd0] text-emerald-900 font-bold border border-[#b5cc95]"
                          : "hover:bg-[#f1f6e9] text-slate-700"
                      }`}
                    >
                      <span>
                        {comp.icon || (comp.type === "Button" ? "🔘" : comp.type === "Label" ? "🏷️" : comp.type === "Canvas" ? "🎨" : "🧩")}
                      </span>
                      <span className="truncate">{comp.name}</span>
                    </button>
                  ))}

                  {/* Built-in components fallback */}
                  {DEFAULT_COMPONENTS.filter((dc) => !designerComponents.some((c) => c.name === dc.name)).map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => setActiveFlyoutCategory(activeFlyoutCategory === comp.id ? null : comp.id)}
                      className={`w-full px-2 py-1 rounded text-left flex items-center gap-2 text-xs font-medium transition-colors ${
                        activeFlyoutCategory === comp.id
                          ? "bg-[#e2edd0] text-emerald-900 font-bold border border-[#b5cc95]"
                          : "hover:bg-[#f1f6e9] text-slate-700"
                      }`}
                    >
                      <span>{comp.icon}</span>
                      <span className="truncate">{comp.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Drawer: Media Assets */}
            <div className="bg-white rounded border border-[#c4d4a8] overflow-hidden shadow-xs">
              <div className="px-2 py-1 bg-[#d8e6be] font-bold text-xs text-[#334d16] border-b border-[#c4d4a8] flex items-center justify-between">
                <span>Media</span>
                <span className="text-[10px] text-emerald-800 font-mono">
                  {DEFAULT_MEDIA_ASSETS.length} archivos
                </span>
              </div>
              <div className="p-1.5 flex flex-col gap-1 text-[11px] text-slate-600 max-h-36 overflow-y-auto">
                {DEFAULT_MEDIA_ASSETS.map((m) => (
                  <div key={m.name} className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-slate-100">
                    <span>{m.type === "image" ? "🖼️" : "🎵"}</span>
                    <span className="truncate font-mono">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Flyout Drawer: Full-screen/overlay on mobile, docked next to md+ sidebar */}
        {activeFlyoutCategory && (
          <div className="absolute inset-0 md:inset-y-0 md:left-60 md:right-auto md:w-72 bg-white border-r border-[#E2E8F0] shadow-2xl z-50 p-3 overflow-y-auto flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
              <span className="font-bold text-xs text-[#111827]">
                Bloques de {activeFlyoutCategory}
              </span>
              <button
                onClick={() => setActiveFlyoutCategory(null)}
                className="min-w-[36px] min-h-[36px] rounded-lg hover:bg-slate-100 text-[#4B5563] font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-[10px] text-slate-500">
              Haz clic en cualquier bloque para añadirlo al lienzo:
            </p>

            {/* List of blocks depending on category */}
            <div className="flex flex-col gap-2">
              {activeFlyoutCategory === "Control" && (
                <>
                  <button
                    onClick={() => handleSpawnBlock("Control", "if then", "#e59b20", "c-block")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#e59b20" }}
                  >
                    if [ ] then [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Control", "if then else", "#e59b20", "c-block")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#e59b20" }}
                  >
                    if [ ] then [ ] else [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Control", "while do", "#e59b20", "c-block")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#e59b20" }}
                  >
                    while [test] do [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Control", "evaluate but ignore result", "#e59b20", "c-block")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#e59b20" }}
                  >
                    evaluate but ignore result
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Logic" && (
                <>
                  <button
                    onClick={() => handleSpawnBlock("Logic", "true", "#5da048", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#5da048" }}
                  >
                    true
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Logic", "false", "#5da048", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#5da048" }}
                  >
                    false
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Logic", "not", "#5da048", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#5da048" }}
                  >
                    not [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Logic", "= [equal]", "#5da048", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#5da048" }}
                  >
                    [ ] = [ ]
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Math" && (
                <>
                  <button
                    onClick={() => handleSpawnBlock("Math", "0", "#3f71c4", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#3f71c4" }}
                  >
                    0 (número)
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Math", "+", "#3f71c4", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#3f71c4" }}
                  >
                    [ ] + [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Math", "-", "#3f71c4", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#3f71c4" }}
                  >
                    [ ] - [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Math", "random integer from 1 to 100", "#3f71c4", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#3f71c4" }}
                  >
                    random integer from 1 to 100
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Text" && (
                <>
                  <button
                    onClick={() =>
                      handleSpawnBlock("Text", '"¡Hola Mundo!"', "#c44078", "value", {
                        dataStructureType: "text",
                        varName: "mensaje_texto",
                        subtitle: '"¡Hola Mundo!"',
                        fields: { text: "¡Hola Mundo!", value: '"¡Hola Mundo!"' },
                        inlineValues: [{ label: "str", value: '"¡Hola Mundo!"', color: "#c44078" }],
                      })
                    }
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    " " (texto: "¡Hola Mundo!")
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "join", "#c44078", "value", { inputs: [{ id: "t1", name: "text1", type: "value" }, { id: "t2", name: "text2", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    join [ ] [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "length", "#c44078", "value", { inputs: [{ id: "t", name: "text", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    length [text]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "is empty", "#c44078", "value", { inputs: [{ id: "t", name: "text", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    is empty [text]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "compare texts", "#c44078", "value", { inputs: [{ id: "t1", name: "text1", type: "value" }, { id: "t2", name: "text2", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    compare texts [ ] &lt; [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "trim", "#c44078", "value", { inputs: [{ id: "t", name: "text", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    trim [text]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "upcase", "#c44078", "value", { inputs: [{ id: "t", name: "text", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    upcase [text]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "downcase", "#c44078", "value", { inputs: [{ id: "t", name: "text", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    downcase [text]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "contains text", "#c44078", "value", { inputs: [{ id: "t", name: "text", type: "value" }, { id: "p", name: "piece", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    contains text [text] piece [piece]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "split at spaces", "#c44078", "value", { inputs: [{ id: "t", name: "text", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    split at spaces [text]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "segment text", "#c44078", "value", { inputs: [{ id: "t", name: "text", type: "value" }, { id: "s", name: "start", type: "value" }, { id: "l", name: "length", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    segment text [ ] start [ ] length [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Text", "replace all text", "#c44078", "value", { inputs: [{ id: "t", name: "text", type: "value" }, { id: "s", name: "segment", type: "value" }, { id: "r", name: "replacement", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#c44078" }}
                  >
                    replace all text [ ] segment [ ] replacement [ ]
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Lists" && (
                <>
                  <button
                    onClick={() =>
                      handleSpawnBlock("Lists", "create empty list", "#49a6cb", "value", {
                        dataStructureType: "list",
                        varName: "mi_lista",
                        subtitle: "[]",
                        listItems: [],
                        fields: { items: [], value: "[]" },
                        inlineValues: [{ label: "list", value: "[]", color: "#49a6cb" }],
                      })
                    }
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    create empty list
                  </button>
                  <button
                    onClick={() =>
                      handleSpawnBlock("Lists", "make a list", "#49a6cb", "value", {
                        dataStructureType: "list",
                        varName: "inventario",
                        subtitle: "[Espada, Escudo, Pocion]",
                        listItems: ["Espada", "Escudo", "Pocion"],
                        fields: { items: ["Espada", "Escudo", "Pocion"], value: '["Espada", "Escudo", "Pocion"]' },
                        inlineValues: [{ label: "list[3]", value: "Espada, Escudo, Pocion", color: "#49a6cb" }],
                        inputs: [{ id: "i1", name: "item", type: "value" }, { id: "i2", name: "item", type: "value" }],
                      })
                    }
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    make a list [Espada, Escudo...]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "add items to list", "#49a6cb", "command", { inputs: [{ id: "list", name: "list", type: "value" }, { id: "item", name: "item", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    add items to list [list] item [item]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "is in list?", "#49a6cb", "value", { inputs: [{ id: "thing", name: "thing", type: "value" }, { id: "list", name: "list", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    is in list? thing [ ] list [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "length of list", "#49a6cb", "value", { inputs: [{ id: "list", name: "list", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    length of list [list]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "is list empty?", "#49a6cb", "value", { inputs: [{ id: "list", name: "list", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    is list empty? [list]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "pick a random item", "#49a6cb", "value", { inputs: [{ id: "list", name: "list", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    pick a random item [list]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "index in list", "#49a6cb", "value", { inputs: [{ id: "thing", name: "thing", type: "value" }, { id: "list", name: "list", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    index in list thing [ ] list [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "select list item", "#49a6cb", "value", { inputs: [{ id: "list", name: "list", type: "value" }, { id: "index", name: "index", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    select list item [list] index [index]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "replace list item", "#49a6cb", "command", { inputs: [{ id: "list", name: "list", type: "value" }, { id: "index", name: "index", type: "value" }, { id: "replacement", name: "replacement", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    replace list item [list] index [ ] replacement [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "remove list item", "#49a6cb", "command", { inputs: [{ id: "list", name: "list", type: "value" }, { id: "index", name: "index", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    remove list item [list] index [index]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "append to list", "#49a6cb", "command", { inputs: [{ id: "l1", name: "list1", type: "value" }, { id: "l2", name: "list2", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    append to list [list1] [list2]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Lists", "copy list", "#49a6cb", "value", { inputs: [{ id: "list", name: "list", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#49a6cb" }}
                  >
                    copy list [list]
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Dictionaries" && (
                <>
                  <button
                    onClick={() =>
                      handleSpawnBlock("Dictionaries", "create empty dictionary", "#455a64", "value", {
                        dataStructureType: "dictionary",
                        varName: "mi_dict",
                        subtitle: "{}",
                        dictPairs: [],
                        fields: { pairs: [], value: "{}" },
                        inlineValues: [{ label: "dict", value: "{}", color: "#455a64" }],
                      })
                    }
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#455a64" }}
                  >
                    create empty dictionary
                  </button>
                  <button
                    onClick={() =>
                      handleSpawnBlock("Dictionaries", "make a dictionary", "#455a64", "value", {
                        dataStructureType: "dictionary",
                        varName: "stats_jugador",
                        subtitle: "{hp: 100, mp: 50}",
                        dictPairs: [
                          { key: "hp", value: "100" },
                          { key: "mp", value: "50" },
                          { key: "nombre", value: '"Heroe"' },
                        ],
                        fields: { pairs: [{ key: "hp", value: "100" }, { key: "mp", value: "50" }, { key: "nombre", value: '"Heroe"' }], value: "{hp: 100, mp: 50}" },
                        inlineValues: [{ label: "dict[3]", value: "hp, mp, nombre", color: "#455a64" }],
                        inputs: [{ id: "pair", name: "pair", type: "value" }],
                      })
                    }
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#455a64" }}
                  >
                    make a dictionary [stats_jugador]
                  </button>
                  <button
                    onClick={() =>
                      handleSpawnBlock("Dictionaries", "pair key [ ] value [ ]", "#455a64", "value", {
                        dataStructureType: "dictionary",
                        fields: { key: "fuerza", value: "15" },
                        inlineValues: [{ label: "pair", value: "fuerza: 15", color: "#455a64" }],
                        inputs: [{ id: "k", name: "key", type: "value" }, { id: "v", name: "value", type: "value" }],
                      })
                    }
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#455a64" }}
                  >
                    pair key [ ] value [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Dictionaries", "get value for key", "#455a64", "value", { inputs: [{ id: "dict", name: "dictionary", type: "value" }, { id: "k", name: "key", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#455a64" }}
                  >
                    get value for key in [dict] key [key]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Dictionaries", "set value for key", "#455a64", "command", { inputs: [{ id: "dict", name: "dictionary", type: "value" }, { id: "k", name: "key", type: "value" }, { id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#455a64" }}
                  >
                    set value for key in [dict] key [ ] to [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Dictionaries", "remove entry for key", "#455a64", "command", { inputs: [{ id: "dict", name: "dictionary", type: "value" }, { id: "k", name: "key", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#455a64" }}
                  >
                    remove entry for key in [dict] key [key]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Dictionaries", "get keys", "#455a64", "value", { inputs: [{ id: "dict", name: "dictionary", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#455a64" }}
                  >
                    get keys [dictionary]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Dictionaries", "get values", "#455a64", "value", { inputs: [{ id: "dict", name: "dictionary", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#455a64" }}
                  >
                    get values [dictionary]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Dictionaries", "is key in dictionary?", "#455a64", "value", { inputs: [{ id: "dict", name: "dictionary", type: "value" }, { id: "k", name: "key", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#455a64" }}
                  >
                    is key in dictionary? [dict] key [key]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Dictionaries", "list of pairs to dictionary", "#455a64", "value", { inputs: [{ id: "list", name: "pairs", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#455a64" }}
                  >
                    list of pairs to dictionary [list]
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Colors" && (
                <>
                  <div className="text-[11px] font-bold text-slate-600 mb-1">Paleta de Colores:</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { name: "Red", hex: "#ea4335" },
                      { name: "Orange", hex: "#ff9800" },
                      { name: "Yellow", hex: "#fbbc05" },
                      { name: "Green", hex: "#34a853" },
                      { name: "Cyan", hex: "#00bcd4" },
                      { name: "Blue", hex: "#4285f4" },
                      { name: "Cobalt", hex: "#1976d2" },
                      { name: "Magenta", hex: "#e91e63" },
                      { name: "Pink", hex: "#ff4081" },
                      { name: "White", hex: "#ffffff", darkText: true },
                      { name: "Light Gray", hex: "#cccccc", darkText: true },
                      { name: "Gray", hex: "#8492a6" },
                      { name: "Dark Gray", hex: "#444444" },
                      { name: "Black", hex: "#000000" },
                    ].map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          const hexClean = c.hex.replace("#", "");
                          const bigint = parseInt(hexClean, 16);
                          const r = (bigint >> 16) & 255;
                          const g = (bigint >> 8) & 255;
                          const b = bigint & 255;
                          handleSpawnBlock("Colors", `color ${c.name}`, c.hex, "value", {
                            dataStructureType: "color",
                            varName: `color_${c.name.toLowerCase().replace(/ /g, "_")}`,
                            colorHex: c.hex,
                            colorRgb: { r, g, b },
                            subtitle: `rgb(${r}, ${g}, ${b})`,
                            fields: { color: c.hex, value: `rgb(${r}, ${g}, ${b})` },
                            inlineValues: [{ label: "rgb", value: `${r},${g},${b}`, color: c.hex }],
                          });
                        }}
                        className={`p-1.5 rounded text-left font-bold text-[11px] shadow-sm hover:brightness-110 flex items-center gap-1.5 border border-black/20 ${c.darkText ? "text-slate-900" : "text-white"}`}
                        style={{ backgroundColor: c.hex }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-black/30" style={{ backgroundColor: c.hex }} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] font-bold text-slate-600 mt-2 mb-1">Utilidades de Color:</div>
                  <button
                    onClick={() => handleSpawnBlock("Colors", "make color", "#8492a6", "value", { inputs: [{ id: "rgb", name: "make a list (r, g, b)", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#8492a6" }}
                  >
                    make color (make a list [r, g, b])
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Colors", "split color", "#8492a6", "value", { inputs: [{ id: "c", name: "color", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#8492a6" }}
                  >
                    split color [color]
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Variables" && (
                <>
                  <button
                    onClick={() => handleSpawnBlock("Variables", "initialize global name to", "#d35400", "command")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#d35400" }}
                  >
                    initialize global [name] to [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Variables", "get variable", "#d35400", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#d35400" }}
                  >
                    get [variable]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Variables", "set variable to", "#d35400", "command")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#d35400" }}
                  >
                    set [variable] to [ ]
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Procedures" && (
                <>
                  <button
                    onClick={() => handleSpawnBlock("Procedures", "to procedure do", "#7b3da1", "procedure")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    to [procedimiento] do [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("Procedures", "call procedure", "#7b3da1", "command")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call [procedimiento]
                  </button>
                </>
              )}

              {/* Component Specific Blocks (Events, Calls, Setters, Getters) */}
              {activeFlyoutCategory === "Canvas1" && (
                <>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Canvas1 . TouchDown", "#caa128", "hat")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Canvas1 . TouchDown (x, y) do
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Canvas1 . DrawCircle", "#7b3da1", "command")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Canvas1 . DrawCircle (x, y, r)
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Canvas1 . GetBackgroundPixelColor", "#7b3da1", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Canvas1 . GetBackgroundPixelColor
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Player1" && (
                <>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Player1 . CollidedWith", "#caa128", "hat")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Player1 . CollidedWith (other) do
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Player1 . MoveTo", "#7b3da1", "command")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Player1 . MoveTo (x, y)
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Player1 . Enabled to", "#367732", "command")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Player1 . Enabled to [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentGetter", "Player1 . X", "#4a8b43", "value")}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#4a8b43" }}
                  >
                    Player1 . X
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Screen1" && (
                <>
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Eventos:</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Screen1 . Initialize", "#caa128", "hat", { subtitle: "do", componentName: "Screen1", eventName: "Initialize" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Screen1 . Initialize do
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Screen1 . TouchDown", "#caa128", "hat", { subtitle: "x , y", componentName: "Screen1", eventName: "TouchDown" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Screen1 . TouchDown (x, y) do
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Screen1 . BackPressed", "#caa128", "hat", { componentName: "Screen1", eventName: "BackPressed" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Screen1 . BackPressed do
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Screen1 . GameLoop", "#caa128", "hat", { componentName: "Screen1", eventName: "GameLoop" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Screen1 . GameLoop do
                  </button>

                  <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mt-1">Métodos:</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Screen1 . ShowAlert", "#7b3da1", "command", { componentName: "Screen1", methodName: "ShowAlert", inputs: [{ id: "n", name: "notice", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Screen1 . ShowAlert (notice)
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Screen1 . OpenAnotherScreen", "#7b3da1", "command", { componentName: "Screen1", methodName: "OpenAnotherScreen", inputs: [{ id: "s", name: "screenName", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Screen1 . OpenAnotherScreen (screenName)
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Screen1 . CloseScreen", "#7b3da1", "command", { componentName: "Screen1", methodName: "CloseScreen" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Screen1 . CloseScreen
                  </button>

                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mt-1">Propiedades (Setters):</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Screen1 . Title to", "#367732", "command", { componentName: "Screen1", propertyName: "Title", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Screen1 . Title to [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Screen1 . BackgroundColor to", "#367732", "command", { componentName: "Screen1", propertyName: "BackgroundColor", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Screen1 . BackgroundColor to [ ]
                  </button>

                  <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide mt-1">Lectura (Getters):</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentGetter", "Screen1 . Width", "#4a8b43", "value", { componentName: "Screen1", propertyName: "Width" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#4a8b43" }}
                  >
                    Screen1 . Width
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentGetter", "Screen1 . Height", "#4a8b43", "value", { componentName: "Screen1", propertyName: "Height" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#4a8b43" }}
                  >
                    Screen1 . Height
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Exit" && (
                <>
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Eventos:</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Exit . CollidedWith", "#caa128", "hat", { subtitle: "other", componentName: "Exit", eventName: "CollidedWith" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Exit . CollidedWith (other) do
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Exit . EdgeReached", "#caa128", "hat", { subtitle: "edge", componentName: "Exit", eventName: "EdgeReached" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Exit . EdgeReached (edge) do
                  </button>

                  <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mt-1">Métodos:</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Exit . MoveTo", "#7b3da1", "command", { componentName: "Exit", methodName: "MoveTo", inputs: [{ id: "x", name: "x", type: "value" }, { id: "y", name: "y", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Exit . MoveTo (x, y)
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Exit . PointInDirection", "#7b3da1", "command", { componentName: "Exit", methodName: "PointInDirection", inputs: [{ id: "h", name: "heading", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Exit . PointInDirection (heading)
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Exit . Bounce", "#7b3da1", "command", { componentName: "Exit", methodName: "Bounce", inputs: [{ id: "e", name: "edge", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Exit . Bounce (edge)
                  </button>

                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mt-1">Propiedades (Setters):</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Exit . Enabled to", "#367732", "command", { componentName: "Exit", propertyName: "Enabled", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Exit . Enabled to [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Exit . Visible to", "#367732", "command", { componentName: "Exit", propertyName: "Visible", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Exit . Visible to [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Exit . X to", "#367732", "command", { componentName: "Exit", propertyName: "X", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Exit . X to [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Exit . Y to", "#367732", "command", { componentName: "Exit", propertyName: "Y", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Exit . Y to [ ]
                  </button>

                  <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide mt-1">Lectura (Getters):</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentGetter", "Exit . X", "#4a8b43", "value", { componentName: "Exit", propertyName: "X" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#4a8b43" }}
                  >
                    Exit . X
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentGetter", "Exit . Y", "#4a8b43", "value", { componentName: "Exit", propertyName: "Y" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#4a8b43" }}
                  >
                    Exit . Y
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentGetter", "Exit . Enabled", "#4a8b43", "value", { componentName: "Exit", propertyName: "Enabled" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#4a8b43" }}
                  >
                    Exit . Enabled
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Random_maze" && (
                <>
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Eventos:</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Random_maze . CollidedWith", "#caa128", "hat", { subtitle: "other", componentName: "Random_maze", eventName: "CollidedWith" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Random_maze . CollidedWith (other) do
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Random_maze . MazeGenerated", "#caa128", "hat", { componentName: "Random_maze", eventName: "MazeGenerated" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Random_maze . MazeGenerated do
                  </button>

                  <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mt-1">Métodos:</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Random_maze . GenerateMaze", "#7b3da1", "command", { componentName: "Random_maze", methodName: "GenerateMaze" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Random_maze . GenerateMaze
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Random_maze . ResetMaze", "#7b3da1", "command", { componentName: "Random_maze", methodName: "ResetMaze" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Random_maze . ResetMaze
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Random_maze . SetWallTile", "#7b3da1", "command", { componentName: "Random_maze", methodName: "SetWallTile", inputs: [{ id: "x", name: "x", type: "value" }, { id: "y", name: "y", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Random_maze . SetWallTile (x, y)
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Random_maze . ClearWalls", "#7b3da1", "command", { componentName: "Random_maze", methodName: "ClearWalls" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Random_maze . ClearWalls
                  </button>

                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mt-1">Propiedades (Setters):</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Random_maze . WallColor to", "#367732", "command", { componentName: "Random_maze", propertyName: "WallColor", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Random_maze . WallColor to [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Random_maze . Enabled to", "#367732", "command", { componentName: "Random_maze", propertyName: "Enabled", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Random_maze . Enabled to [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Random_maze . Complexity to", "#367732", "command", { componentName: "Random_maze", propertyName: "Complexity", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Random_maze . Complexity to [ ]
                  </button>

                  <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide mt-1">Lectura (Getters):</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentGetter", "Random_maze . WallColor", "#4a8b43", "value", { componentName: "Random_maze", propertyName: "WallColor" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#4a8b43" }}
                  >
                    Random_maze . WallColor
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentGetter", "Random_maze . Enabled", "#4a8b43", "value", { componentName: "Random_maze", propertyName: "Enabled" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#4a8b43" }}
                  >
                    Random_maze . Enabled
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Time_showing" && (
                <>
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Eventos:</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentEvent", "when Time_showing . Timer", "#caa128", "hat", { componentName: "Time_showing", eventName: "Timer" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#caa128" }}
                  >
                    when Time_showing . Timer do
                  </button>

                  <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mt-1">Métodos:</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Time_showing . Now", "#7b3da1", "value", { componentName: "Time_showing", methodName: "Now" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Time_showing . Now
                  </button>

                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mt-1">Propiedades (Setters):</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Time_showing . TimerInterval to", "#367732", "command", { componentName: "Time_showing", propertyName: "TimerInterval", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Time_showing . TimerInterval to [ ]
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Time_showing . TimerEnabled to", "#367732", "command", { componentName: "Time_showing", propertyName: "TimerEnabled", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Time_showing . TimerEnabled to [ ]
                  </button>

                  <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide mt-1">Lectura (Getters):</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentGetter", "Time_showing . TimerInterval", "#4a8b43", "value", { componentName: "Time_showing", propertyName: "TimerInterval" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#4a8b43" }}
                  >
                    Time_showing . TimerInterval
                  </button>
                </>
              )}

              {activeFlyoutCategory === "Sound1" && (
                <>
                  <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Métodos:</div>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Sound1 . Play", "#7b3da1", "command", { componentName: "Sound1", methodName: "Play" })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Sound1 . Play
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentCall", "call Sound1 . Vibrate", "#7b3da1", "command", { componentName: "Sound1", methodName: "Vibrate", inputs: [{ id: "ms", name: "millisecs", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#7b3da1" }}
                  >
                    call Sound1 . Vibrate (millisecs)
                  </button>
                  <button
                    onClick={() => handleSpawnBlock("ComponentSetter", "set Sound1 . Source to", "#367732", "command", { componentName: "Sound1", propertyName: "Source", inputs: [{ id: "v", name: "to", type: "value" }] })}
                    className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                    style={{ backgroundColor: "#367732" }}
                  >
                    set Sound1 . Source to [ ]
                  </button>
                </>
              )}

              {/* Dynamic Fallback for Any Other Component in DEFAULT_COMPONENTS */}
              {(() => {
                const knownComponents = ["Canvas1", "Player1", "Screen1", "Exit", "Random_maze", "Time_showing", "Sound1"];
                const comp = DEFAULT_COMPONENTS.find(
                  (c) => c.id === activeFlyoutCategory && !knownComponents.includes(c.id)
                );
                if (!comp) return null;
                return (
                  <>
                    {comp.events.length > 0 && (
                      <>
                        <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Eventos:</div>
                        {comp.events.map((evt) => (
                          <button
                            key={evt}
                            onClick={() => handleSpawnBlock("ComponentEvent", `when ${comp.name} . ${evt}`, "#caa128", "hat", { componentName: comp.name, eventName: evt })}
                            className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                            style={{ backgroundColor: "#caa128" }}
                          >
                            when {comp.name} . {evt} do
                          </button>
                        ))}
                      </>
                    )}
                    {comp.methods.length > 0 && (
                      <>
                        <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mt-1">Métodos:</div>
                        {comp.methods.map((met) => (
                          <button
                            key={met}
                            onClick={() => handleSpawnBlock("ComponentCall", `call ${comp.name} . ${met}`, "#7b3da1", "command", { componentName: comp.name, methodName: met })}
                            className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                            style={{ backgroundColor: "#7b3da1" }}
                          >
                            call {comp.name} . {met}
                          </button>
                        ))}
                      </>
                    )}
                    {comp.setters.length > 0 && (
                      <>
                        <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mt-1">Propiedades:</div>
                        {comp.setters.map((prop) => (
                          <button
                            key={prop}
                            onClick={() => handleSpawnBlock("ComponentSetter", `set ${comp.name} . ${prop} to`, "#367732", "command", { componentName: comp.name, propertyName: prop, inputs: [{ id: "v", name: "to", type: "value" }] })}
                            className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                            style={{ backgroundColor: "#367732" }}
                          >
                            set {comp.name} . {prop} to [ ]
                          </button>
                        ))}
                      </>
                    )}
                    {comp.getters.length > 0 && (
                      <>
                        <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide mt-1">Lectura:</div>
                        {comp.getters.map((prop) => (
                          <button
                            key={prop}
                            onClick={() => handleSpawnBlock("ComponentGetter", `${comp.name} . ${prop}`, "#4a8b43", "value", { componentName: comp.name, propertyName: prop })}
                            className="p-2 rounded text-left font-bold text-white shadow-sm hover:brightness-105"
                            style={{ backgroundColor: "#4a8b43" }}
                          >
                            {comp.name} . {prop}
                          </button>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Right Area: Workspace Canvas (Touch + Pointer enabled) */}
        <div
          ref={containerRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex-1 flex-grow min-h-0 w-full h-full relative overflow-hidden bg-[#F7F8FA] cursor-default touch-none"
          style={{
            backgroundImage: "radial-gradient(#CBD5E1 1.5px, transparent 1.5px)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* Top Label Banner */}
          <div className="hidden sm:block absolute top-2 left-3 px-2.5 py-1 rounded-lg bg-white/90 border border-[#E2E8F0] text-[11px] font-semibold text-[#4B5563] z-10">
            Lienzo de Bloques · Arrastra con el dedo o ratón
          </div>

          {/* SVG Canvas for Block Rendering */}
          <svg
            ref={svgRef}
            className="w-full h-full touch-none"
            style={{ touchAction: "none" }}
          >
            <g transform={`translate(${canvasOffset.x}, ${canvasOffset.y}) scale(${zoomLevel})`}>
              {blocks.map((block) => (
                <BlockSvg
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  isDragging={draggingBlockId === block.id}
                  onPointerDown={handleBlockPointerDown}
                  onFieldChange={handleBlockFieldChange}
                  onDoubleClick={(e, id) => {
                    setSelectedBlockId(id);
                    const target = blocks.find((b) => b.id === id);
                    if (target?.category === "Text" || target?.dataStructureType === "text") {
                      setIsTextBlockEditorOpen(true);
                    } else {
                      setIsDataBuilderOpen(true);
                    }
                  }}
                  onContextMenu={(e, id) => {
                    handleCopyToBackpack(id);
                  }}
                />
              ))}
            </g>
          </svg>

          {/* Empty Blocks State: Helpful Guidance and Quick Actions */}
          {blocks.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none z-10">
              <div className="max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-slate-300 p-6 shadow-xl pointer-events-auto flex flex-col items-center gap-3 animate-in fade-in zoom-in-95">
                <div className="w-14 h-14 rounded-2xl bg-[#e9eedb] border border-[#c4d4a8] flex items-center justify-center text-3xl shadow-inner">
                  🧩
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800 mb-1">
                    Área de Bloques Lista y Vacía
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tu proyecto inicia limpio por defecto. Arrastra bloques desde el menú <b>Built-in</b> o <b>Screen1</b> a la izquierda, o cambia al <b>Diseñador</b> para diseñar la interfaz en el celular.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveWorkspaceMode("designer")}
                    className="px-3.5 py-1.5 rounded-lg bg-[#5b871c] hover:bg-[#4d7317] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    <span>📱</span> Ir al Diseñador
                  </button>
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    <span>✨</span> Crear con AURA IA
                  </button>
                  <button
                    onClick={() => {
                      const demo = getInitialAppInventorBlocks();
                      setBlocks(demo);
                      syncToDivCode(demo);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
                  >
                    📂 Cargar Demo Maze
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Backpack (Top Right, Identical to Screenshot) */}
          <div className="absolute top-4 right-6 z-20 flex flex-col items-center">
            <button
              onClick={() => setIsBackpackOpen(!isBackpackOpen)}
              className="w-14 h-16 rounded-2xl bg-[#00897b] hover:bg-[#00796b] border-2 border-[#004d40] shadow-xl flex flex-col items-center justify-center text-white transition-transform active:scale-95 cursor-pointer relative"
              title="Backpack: Guarda y copia bloques entre pantallas o proyectos"
            >
              <span className="text-2xl">🎒</span>
              <span className="text-[9px] font-extrabold uppercase tracking-tighter">Mochila</span>
              {backpack.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  {backpack.length}
                </span>
              )}
            </button>

            {isBackpackOpen && (
              <div className="absolute top-18 right-0 w-64 bg-white border border-slate-300 rounded-lg shadow-2xl p-2.5 z-30 text-xs">
                <div className="font-bold text-slate-800 border-b pb-1 mb-1.5 flex items-center justify-between">
                  <span>Mochila de Bloques ({backpack.length})</span>
                  <button onClick={() => setIsBackpackOpen(false)} className="text-slate-400 hover:text-black">✕</button>
                </div>
                {backpack.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">La mochila está vacía. Clic derecho en un bloque para guardarlo aquí.</p>
                ) : (
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {backpack.map((b, i) => (
                      <div key={i} className="flex items-center justify-between p-1 rounded bg-slate-50 border border-slate-200">
                        <span className="font-semibold truncate max-w-[140px]">{b.title}</span>
                        <button
                          onClick={() => {
                            setBlocks((prev) => [...prev, { ...b, id: `paste_${Date.now()}`, x: b.x + 30, y: b.y + 30 }]);
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold"
                        >
                          Pegar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Floating Zoom & Center Controls (Right Margin, Identical to Screenshot) */}
          <div className="absolute right-6 bottom-24 z-20 flex flex-col gap-1.5 bg-white/90 backdrop-blur-xs border border-slate-300 rounded-lg p-1 shadow-md">
            <button
              onClick={handleCenter}
              className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
              title="Centrar Espacio de Trabajo (Target)"
            >
              <Target className="w-4 h-4" />
            </button>
            <div className="h-[1px] bg-slate-200" />
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700 font-extrabold text-base transition-colors"
              title="Acercar (+)"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700 font-extrabold text-base transition-colors"
              title="Alejar (-)"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Floating Trashcan Icon */}
          <div
            ref={trashRef}
            onMouseEnter={() => setIsTrashHovered(true)}
            onMouseLeave={() => setIsTrashHovered(false)}
            onClick={() => {
              if (selectedBlockId) {
                const remaining = blocks.filter((b) => b.id !== selectedBlockId);
                setBlocks(remaining);
                setSelectedBlockId(null);
                syncToDivCode(remaining);
                showNotice("Bloque eliminado");
              }
            }}
            className={`absolute right-4 sm:right-6 bottom-4 sm:bottom-6 z-20 w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              isTrashHovered
                ? "bg-rose-600 text-white scale-110 shadow-xl"
                : "bg-white border border-[#E2E8F0] text-[#4B5563] shadow-md"
            }`}
            title="Arrastra un bloque aquí o toca para borrar el seleccionado"
          >
            <Trash2 className="w-5 h-5" />
          </div>
        </div>
      </div>
      )}

      {/* AI Block Assistant Modal */}
      <AiBlockAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentBlocksCount={blocks.length}
        onAddBlocks={(newBlocks) => {
          const updated = [...blocks, ...newBlocks];
          setBlocks(updated);
          syncToDivCode(updated);
        }}
      />

      {/* Block Data Structure Builder (Text, Lists, Dictionaries, Colors) */}
      {isDataBuilderOpen && selectedBlock && (
        <BlockDataStructureBuilder
          block={selectedBlock}
          onUpdateBlock={(updated) => {
            const newBlocks = blocks.map((b) => (b.id === updated.id ? updated : b));
            setBlocks(newBlocks);
            syncToDivCode(newBlocks);
          }}
          onClose={() => setIsDataBuilderOpen(false)}
        />
      )}

      {/* Dedicated Text Block Component Modal (Rich string editor & DIV engine serializer) */}
      {isTextBlockEditorOpen && selectedBlock && (
        <TextBlockComponent
          block={selectedBlock}
          onUpdateBlock={(updated) => {
            const newBlocks = blocks.map((b) => (b.id === updated.id ? updated : b));
            setBlocks(newBlocks);
            syncToDivCode(newBlocks);
          }}
          onClose={() => setIsTextBlockEditorOpen(false)}
        />
      )}

      {/* Mobile Bottom Nav only shown if NOT embedded inside StudioWorkspace */}
      {!embeddedMode && (
        <div className="flex md:hidden items-center justify-around bg-white border-t border-[#E2E8F0] px-2 py-1.5 flex-shrink-0 z-30 select-none">
          <button
            onClick={() => setActiveWorkspaceMode("designer")}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
              activeWorkspaceMode === "designer" ? "text-[#7C2D48] bg-[#FDF2F5]" : "text-[#6B7280]"
            }`}
          >
            <span>📱</span>
            <span>Diseñador</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceMode("blocks")}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
              activeWorkspaceMode === "blocks" ? "text-[#7C2D48] bg-[#FDF2F5]" : "text-[#6B7280]"
            }`}
          >
            <span>🧩</span>
            <span>Bloques</span>
          </button>
          {onRunGame && (
            <button
              onClick={onRunGame}
              className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold text-[#2F6F4E] cursor-pointer"
            >
              <span>▶️</span>
              <span>Probar</span>
            </button>
          )}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold text-[#7C2D48] cursor-pointer"
          >
            <span>✨</span>
            <span>AURA IA</span>
          </button>
        </div>
      )}
    </div>
  );
};
