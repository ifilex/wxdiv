import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Smartphone,
  LayoutGrid,
  Code2,
  Blocks,
  Play,
  Square,
  RotateCcw,
  Sparkles,
  Wrench,
  MoreVertical,
  FolderPlus,
  BookOpen,
  Cloud,
  Settings,
  ArrowLeft,
  Paintbrush,
  Package,
  FileImage,
  Type,
  Palette as PaletteIcon,
  Flame,
  Compass,
  Box,
  Wand2,
  Volume2,
  Cpu,
  X,
  Plus,
  Trash2,
  Monitor,
  Sliders,
  Check,
  ChevronRight,
  HelpCircle,
  Globe,
  Mic,
  GraduationCap,
  Brain,
  Maximize2,
  Minimize2,
  Upload,
} from "lucide-react";
import { WindowId } from "./WindowManager/types";
import { ErrorBoundary } from "./ErrorBoundary";
import { useFullscreen } from "../hooks/useFullscreen";
import { CodeEditor } from "./CodeEditor";
import { GameStage } from "./GameStage";
import { SpriteEditor } from "./SpriteEditor";
import { Mode8LevelEditor } from "./Mode8LevelEditor";
import { SoundEditor } from "./SoundEditor";
import { ExplosionCreator } from "./ExplosionCreator";
import { AppInventorWorkspace } from "./MitAppInventor/AppInventorWorkspace";
import { ToolboxWindow } from "./VB3/ToolboxWindow";
import { PropertiesWindow } from "./VB3/PropertiesWindow";
import { FormCanvas } from "./VB3/FormCanvas";
import { VB3Form, VB3Control, VB3ToolType } from "./VB3/types";
import { generateDivCodeFromVB3, executeVB3FormInHtml5 } from "../utils/vb3CodeGenerator";
import { getPresetFormDefinition } from "../engine/presetForms";
import { AiCopilot } from "./AiCopilot";
import { ProcessInspector } from "./ProcessInspector";
import { FontEditor } from "./FontEditor";
import { FpgEditor } from "./FpgEditor";
import { MapEditor } from "./MapEditor";
import { PaletteEditor } from "./PaletteEditor";
import { MD2Viewer } from "./MD2Viewer";
import { SpriteGenerator } from "./SpriteGenerator";
import { ParsedMD2Model } from "../engine/md2Parser";
import { DivLexiconModal } from "./DivLexiconModal";
import { WelcomeGuideModal, WELCOME_HIDE_STORAGE_KEY } from "./WelcomeGuideModal";
import { LocalAiOnboardingModal } from "./LocalAiOnboardingDeck";
import { LocalAiTutorialView } from "./LocalAiTutorialView";
import { WineboxEcosystemModal } from "./WineboxEcosystemModal";
import { WebWizardModal } from "./WebWizardModal";
import { PWAInstallButton } from "./PWAInstallButton";
import { AssetManagerModal, SelectedStudioAsset } from "./AssetManagerPanel";
import { AssetBrowser } from "./AssetBrowser";
import {
  CustomModel3DAsset,
  CustomTextureAsset,
  listCustomModels3D,
  listCustomTextures,
  subscribeAssetLibrary,
} from "../engine/assetLibrary";
import { Mode8AiAction, Mode8SceneContext } from "../engine/ai/mode8WorkBlocks";
import { DivRuntime } from "../engine/runtime";
import { setupRuntimeFromDivCode } from "../engine/divCodeRunner";
import { DivGraphic, DivProcess } from "../types";
import { GamePreset, PRESETS } from "../engine/presets";

export type StudioTab = "mode8" | "design" | "logic" | "play" | "studio";
export type DesignMode = "mobile" | "form";
export type LogicMode = "blocks" | "code";
export type StudioToolId =
  | "sprites"
  | "fpg"
  | "map"
  | "fonts"
  | "palette"
  | "explosions"
  | "mode8"
  | "md2viewer"
  | "spritegenerator"
  | "sound"
  | "processes";

interface StudioWorkspaceProps {
  runtime: DivRuntime;
  code: string;
  onChangeCode: (newCode: string) => void;
  onRunGame: () => void;
  onRestartGame: () => void;
  fpg: DivGraphic[];
  onUpdateFpg: (newFpg: DivGraphic[]) => void;
  onAddExplosionFrames: (frames: DivGraphic[]) => void;
  onInsertCode: (snippet: string) => void;
  onApplyFullCode: (fullCode: string, customTitle?: string) => void;
  activeProcesses: DivProcess[];
  resolution: "320x200" | "640x480" | "800x600";
  onChangeResolution?: (res: "320x200" | "640x480" | "800x600") => void;
  onOpenAiSettings: () => void;
  requestedActiveTool?: WindowId | null;
  onResetRequestedActiveTool?: () => void;
  currentPresetId?: string;
  projectTitle?: string;
  projectResetVersion?: number;
  onSelectPreset?: (preset: GamePreset) => void;
  onOpenNewProject?: () => void;
  onOpenExport?: () => void;
  onQuickExportZip?: () => void;
  onOpenCloudSync?: () => void;
  openWebWizardTrigger?: number;
  syncedSnapshot?: {
    syncVersion: number;
    forms?: VB3Form[];
    activeFormId?: string;
    activeTab?: StudioTab;
    designMode?: DesignMode;
    logicMode?: LogicMode;
    activeStudioTool?: StudioToolId | null;
  };
  onWorkspaceSnapshotChange?: (snapshot: {
    forms: VB3Form[];
    activeFormId: string;
    activeTab: StudioTab;
    designMode: DesignMode;
    logicMode: LogicMode;
    activeStudioTool: StudioToolId | null;
  }) => void;
  onFpgPackagesChanged?: () => void;
}

const STUDIO_TOOLS: Array<{
  id: StudioToolId;
  title: string;
  subtitle: string;
  category: "Gráficos" | "3D y Niveles" | "Audio y Sistema";
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "sprites",
    title: "Editor Pixel Art",
    subtitle: "Dibuja personajes, iconos y puntos de control",
    category: "Gráficos",
    icon: Paintbrush,
  },
  {
    id: "fpg",
    title: "Paquetes FPG",
    subtitle: "Organiza la librería de sprites de tu juego",
    category: "Gráficos",
    icon: Package,
  },
  {
    id: "map",
    title: "Editor de Mapas .MAP",
    subtitle: "Fondos, escenarios e ilustraciones 2D",
    category: "Gráficos",
    icon: FileImage,
  },
  {
    id: "fonts",
    title: "Fuentes FNT",
    subtitle: "Tipografías bitmap para marcadores y menús",
    category: "Gráficos",
    icon: Type,
  },
  {
    id: "palette",
    title: "Paletas de Color",
    subtitle: "256 colores VGA y degradados personalizados",
    category: "Gráficos",
    icon: PaletteIcon,
  },
  {
    id: "explosions",
    title: "Creador de Explosiones",
    subtitle: "Genera secuencias de partículas animadas",
    category: "Gráficos",
    icon: Flame,
  },
  {
    id: "mode8",
    title: "Niveles 3D Modo 8",
    subtitle: "Construye mundos 3D con sectores, modelos MD2/MD3 y texturas",
    category: "3D y Niveles",
    icon: Compass,
  },
  {
    id: "md2viewer",
    title: "Visor 3D MD2 / MD3",
    subtitle: "Inspecciona, texturiza y guarda mallas poligonales",
    category: "3D y Niveles",
    icon: Box,
  },
  {
    id: "spritegenerator",
    title: "Sprites desde 3D",
    subtitle: "Convierte modelos 3D en sprites multi-ángulo",
    category: "3D y Niveles",
    icon: Wand2,
  },
  {
    id: "sound",
    title: "Sintetizador ADSR",
    subtitle: "Crea efectos de sonido retro y ondas de audio",
    category: "Audio y Sistema",
    icon: Volume2,
  },
  {
    id: "processes",
    title: "Inspector de Procesos",
    subtitle: "Monitorea variables X, Y y estado en vivo",
    category: "Audio y Sistema",
    icon: Cpu,
  },
];

interface WorkspaceCardProps {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  title,
  subtitle,
  headerRight,
  className = "",
  children,
}) => (
  <section
    className={`bg-white border border-[#E2E8F0] rounded-xl flex flex-col overflow-hidden min-h-0 ${className}`}
  >
    <header className="px-3.5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
      <div className="min-w-0">
        <h2 className="text-xs font-bold text-[#111827] tracking-tight truncate">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#6B7280] truncate">{subtitle}</p>}
      </div>
      {headerRight && <div className="flex items-center gap-1.5 flex-shrink-0">{headerRight}</div>}
    </header>
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
  </section>
);

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  runtime,
  code,
  onChangeCode,
  onRunGame,
  onRestartGame,
  fpg,
  onUpdateFpg,
  onAddExplosionFrames,
  onInsertCode,
  onApplyFullCode,
  resolution,
  onChangeResolution,
  onOpenAiSettings,
  requestedActiveTool,
  onResetRequestedActiveTool,
  currentPresetId,
  projectTitle,
  projectResetVersion,
  onSelectPreset,
  onOpenNewProject,
  onOpenExport,
  onOpenCloudSync,
  openWebWizardTrigger,
  syncedSnapshot,
  onWorkspaceSnapshotChange,
  onFpgPackagesChanged,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>("mode8");
  const [designMode, setDesignMode] = useState<DesignMode>("mobile");
  const [logicMode, setLogicMode] = useState<LogicMode>("code");
  const [activeStudioTool, setActiveStudioTool] = useState<StudioToolId | null>(null);

  const [assetCategory, setAssetCategory] = useState<"model3d" | "texture" | "fpg" | "map">("model3d");
  const [selectedAsset, setSelectedAsset] = useState<SelectedStudioAsset | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetModalTab, setAssetModalTab] = useState<"model3d" | "texture" | "fpg" | "map">("model3d");
  const [requestedMode8ModelId, setRequestedMode8ModelId] = useState<string | null>(null);
  const [requestedMode8TextureName, setRequestedMode8TextureName] = useState<string | null>(null);
  const [inspectorFeedback, setInspectorFeedback] = useState<string | null>(null);

  // 3D Mode8 <-> Local AI Work Blocks Bridge
  const [mode8SceneContext, setMode8SceneContext] = useState<Mode8SceneContext | undefined>(undefined);
  const [pendingMode8AiBatch, setPendingMode8AiBatch] = useState<{
    batchId: number;
    actions: Mode8AiAction[];
  } | null>(null);

  // Shared custom asset state
  const [customModels, setCustomModels] = useState<CustomModel3DAsset[]>(() => listCustomModels3D());
  const [customTextures, setCustomTextures] = useState<CustomTextureAsset[]>(() => listCustomTextures());

  useEffect(() => {
    return subscribeAssetLibrary(() => {
      setCustomModels(listCustomModels3D());
      setCustomTextures(listCustomTextures());
    });
  }, []);

  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPresetsDrawerOpen, setIsPresetsDrawerOpen] = useState(false);
  const [isLexiconOpen, setIsLexiconOpen] = useState(false);
  const [isAiOnboardingOpen, setIsAiOnboardingOpen] = useState(false);
  const [isAiTutorialOpen, setIsAiTutorialOpen] = useState(false);
  const [isWineboxOpen, setIsWineboxOpen] = useState(false);
  const [isWebWizardOpen, setIsWebWizardOpen] = useState(false);
  const [voiceTriggerCount, setVoiceTriggerCount] = useState(0);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(WELCOME_HIDE_STORAGE_KEY) !== "true";
    } catch {
      return true;
    }
  });
  const [pendingAiPrompt, setPendingAiPrompt] = useState<string | undefined>(undefined);
  const [pendingRunCode, setPendingRunCode] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [launchedFromMode8, setLaunchedFromMode8] = useState(false);
  const workspaceRootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  useEffect(() => {
    if (openWebWizardTrigger && openWebWizardTrigger > 0) {
      setIsWebWizardOpen(true);
    }
  }, [openWebWizardTrigger]);

  // Mobile sub-panel for VB3 Classic Form mode
  const [vb3MobilePanel, setVb3MobilePanel] = useState<"canvas" | "toolbox" | "properties">("canvas");
  const formViewportRef = useRef<HTMLDivElement>(null);
  const [formAutoFit, setFormAutoFit] = useState<boolean>(true);
  const [formCanvasScale, setFormCanvasScale] = useState<number>(1);

  // Model passed from MD2Viewer to SpriteGenerator
  const [generatorModel, setGeneratorModel] = useState<ParsedMD2Model | undefined>(undefined);

  const flashFeedback = useCallback((msg: string) => {
    setInspectorFeedback(msg);
    window.setTimeout(() => setInspectorFeedback(null), 2800);
  }, []);

  // Sync code to runtime for breakpoint debugging
  useEffect(() => {
    if (runtime && typeof runtime.updateSourceCode === "function") {
      runtime.updateSourceCode(code);
    }
  }, [code, runtime]);

  // Listen to runtime running state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRunning((prev) => (prev !== runtime.isRunning ? runtime.isRunning : prev));
    }, 300);
    return () => clearInterval(interval);
  }, [runtime]);

  // Listen to breakpoints to jump straight to code view
  useEffect(() => {
    if (!runtime) return;
    const unsub = runtime.addBreakpointHitListener(() => {
      setActiveTab("logic");
      setLogicMode("code");
    });
    return () => unsub();
  }, [runtime]);

  // VB3 Form state (exclude web/landing HTML5 programs)
  const isCurrentPresetFormApp = Boolean(
    !currentPresetId?.includes("landing") &&
      !currentPresetId?.startsWith("web_") &&
      (currentPresetId?.startsWith("app_") || currentPresetId === "game_arcade_canvas")
  );

  const [forms, setForms] = useState<VB3Form[]>(() => {
    if (!isCurrentPresetFormApp) return [];
    const f = getPresetFormDefinition(currentPresetId);
    return f ? [f] : [];
  });
  const [activeFormId, setActiveFormId] = useState<string>(() => forms[0]?.id || "");
  const [activeTool, setActiveTool] = useState<VB3ToolType>("pointer");
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [codeTargetSymbol, setCodeTargetSymbol] = useState<{
    object: string;
    procedure: string;
    timestamp: number;
  } | null>(null);

  const skipNextFormResetRef = useRef<boolean>(false);
  const lastSyncVersionRef = useRef<number>(0);

  // Hydrate restored UI state and VB3 forms from IndexedDB startup sync
  useEffect(() => {
    if (!syncedSnapshot || syncedSnapshot.syncVersion <= lastSyncVersionRef.current) return;
    lastSyncVersionRef.current = syncedSnapshot.syncVersion;

    if (syncedSnapshot.forms && syncedSnapshot.forms.length > 0) {
      skipNextFormResetRef.current = true;
      setForms(syncedSnapshot.forms);
      setActiveFormId(syncedSnapshot.activeFormId || syncedSnapshot.forms[0].id);
      setSelectedControlId(null);
    }
    if (syncedSnapshot.designMode === "mobile" || syncedSnapshot.designMode === "form") {
      setDesignMode(syncedSnapshot.designMode);
    }
    if (syncedSnapshot.logicMode === "blocks" || syncedSnapshot.logicMode === "code") {
      setLogicMode(syncedSnapshot.logicMode);
    }
    if (
      syncedSnapshot.activeStudioTool === null ||
      (typeof syncedSnapshot.activeStudioTool === "string" &&
        STUDIO_TOOLS.some((t) => t.id === syncedSnapshot.activeStudioTool))
    ) {
      setActiveStudioTool(syncedSnapshot.activeStudioTool ?? null);
    }
    if (
      syncedSnapshot.activeTab === "mode8" ||
      syncedSnapshot.activeTab === "design" ||
      syncedSnapshot.activeTab === "logic" ||
      syncedSnapshot.activeTab === "studio"
    ) {
      setActiveTab(syncedSnapshot.activeTab);
    } else if ((syncedSnapshot.activeTab as string | undefined) === "modular") {
      setActiveTab("mode8");
    }
  }, [syncedSnapshot]);

  // Emit workspace state snapshots to App.tsx for IndexedDB persistence
  useEffect(() => {
    onWorkspaceSnapshotChange?.({
      forms,
      activeFormId,
      activeTab,
      designMode,
      logicMode,
      activeStudioTool,
    });
  }, [forms, activeFormId, activeTab, designMode, logicMode, activeStudioTool, onWorkspaceSnapshotChange]);

  // Reset form/design mode when project changes
  useEffect(() => {
    setLaunchedFromMode8(false);
    if (skipNextFormResetRef.current) {
      skipNextFormResetRef.current = false;
      return;
    }
    if (isCurrentPresetFormApp) {
      const f = getPresetFormDefinition(currentPresetId);
      if (f) {
        setForms([f]);
        setActiveFormId(f.id);
        setSelectedControlId(null);
        setDesignMode("form");
      }
    } else {
      setForms([]);
      setActiveFormId("");
      setSelectedControlId(null);
      setDesignMode("mobile");
    }
  }, [currentPresetId, projectResetVersion, isCurrentPresetFormApp]);

  // Handle requestedActiveTool from App.tsx
  useEffect(() => {
    if (!requestedActiveTool) return;
    if (requestedActiveTool === "visual") {
      setActiveTab("design");
      setDesignMode("mobile");
    } else if (requestedActiveTool === "designer") {
      setActiveTab("design");
      setDesignMode("form");
    } else if (requestedActiveTool === "code") {
      setActiveTab("logic");
      setLogicMode("code");
    } else if (requestedActiveTool === "game") {
      setActiveTab("play");
    } else if (requestedActiveTool === "ai") {
      setIsAiDrawerOpen(true);
    } else if (requestedActiveTool === "mode8") {
      setActiveTab("mode8");
      setActiveStudioTool(null);
    } else if (
      [
        "sprites",
        "fpg",
        "map",
        "fonts",
        "palette",
        "explosions",
        "md2viewer",
        "spritegenerator",
        "sound",
        "processes",
      ].includes(requestedActiveTool)
    ) {
      setActiveTab("studio");
      setActiveStudioTool(requestedActiveTool as StudioToolId);
    }
    onResetRequestedActiveTool?.();
  }, [requestedActiveTool, onResetRequestedActiveTool]);

  const vb3Form = useMemo<VB3Form>(() => {
    const found = forms.find((f) => f.id === activeFormId) || forms[0];
    if (found) return found;
    return {
      id: "form1",
      name: "Form1",
      caption: "Mi Pantalla",
      backColor: "#f8fafc",
      width: 540,
      height: 440,
      controls: [],
    };
  }, [forms, activeFormId]);

  const setVb3Form = useCallback(
    (updater: VB3Form | ((prev: VB3Form) => VB3Form)) => {
      setForms((prevForms) => {
        if (prevForms.length === 0) {
          const base: VB3Form = {
            id: "form1",
            name: "Form1",
            caption: "Mi Pantalla",
            backColor: "#f8fafc",
            width: 540,
            height: 440,
            controls: [],
          };
          const updated = typeof updater === "function" ? updater(base) : updater;
          setActiveFormId(updated.id);
          return [updated];
        }
        const cur = prevForms.find((f) => f.id === activeFormId) || prevForms[0];
        const updated = typeof updater === "function" ? updater(cur) : updater;
        return prevForms.map((f) => (f.id === cur.id ? updated : f));
      });
    },
    [activeFormId]
  );

  const selectedControl = useMemo(
    () => vb3Form.controls.find((c) => c.id === selectedControlId) || null,
    [vb3Form.controls, selectedControlId]
  );

  useEffect(() => {
    if (activeTab !== "design" || designMode !== "form") return;
    const el = formViewportRef.current;
    if (!el) return;

    const recompute = () => {
      const availW = Math.max(240, el.clientWidth - 40);
      const availH = Math.max(220, el.clientHeight - 110);
      const formW = Math.max(200, vb3Form.width || 540);
      const formH = Math.max(200, vb3Form.height || 440);
      const nextScale = Math.min(1, availW / formW, availH / formH);
      setFormCanvasScale(Number(Math.max(0.38, nextScale).toFixed(3)));
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeTab, designMode, vb3Form.width, vb3Form.height, vb3MobilePanel]);

  const handleAddControl = useCallback(
    (newCtrl: VB3Control) => {
      setVb3Form((prev) => {
        const updated = { ...prev, controls: [...prev.controls, newCtrl] };
        setTimeout(() => onChangeCode(generateDivCodeFromVB3(updated)), 0);
        return updated;
      });
      setSelectedControlId(newCtrl.id);
      setActiveTool("pointer");
    },
    [setVb3Form, onChangeCode]
  );

  const boundsSyncTimerRef = useRef<number | null>(null);
  const handleUpdateControlBounds = useCallback(
    (id: string, bounds: { x: number; y: number; width: number; height: number }) => {
      setVb3Form((prev) => {
        const updated = {
          ...prev,
          controls: prev.controls.map((c) => (c.id === id ? { ...c, ...bounds } : c)),
        };
        if (boundsSyncTimerRef.current) {
          window.clearTimeout(boundsSyncTimerRef.current);
        }
        boundsSyncTimerRef.current = window.setTimeout(() => {
          onChangeCode(generateDivCodeFromVB3(updated));
        }, 120);
        return updated;
      });
    },
    [setVb3Form, onChangeCode]
  );

  const handleUpdateProperty = useCallback(
    (propName: string, value: any) => {
      setVb3Form((prev) => {
        let updated: VB3Form;
        if (!selectedControlId) {
          if (propName === "Caption") updated = { ...prev, caption: value };
          else if (propName === "Name") updated = { ...prev, name: value };
          else if (propName === "BackColor") updated = { ...prev, backColor: value };
          else if (propName === "FontName") updated = { ...prev, fontName: value };
          else if (propName === "Width") updated = { ...prev, width: Number(value) || prev.width };
          else if (propName === "Height") updated = { ...prev, height: Number(value) || prev.height };
          else updated = prev;
        } else {
          updated = {
            ...prev,
            controls: prev.controls.map((c) => {
              if (c.id !== selectedControlId) return c;
              if (propName === "Caption") return { ...c, caption: value };
              if (propName === "Text") return { ...c, text: value };
              if (propName === "Name") return { ...c, name: value };
              if (propName === "Left") return { ...c, x: Number(value) || c.x };
              if (propName === "Top") return { ...c, y: Number(value) || c.y };
              if (propName === "Width") return { ...c, width: Number(value) || c.width };
              if (propName === "Height") return { ...c, height: Number(value) || c.height };
              if (propName === "FontName") return { ...c, fontName: value };
              if (propName === "FontSize") return { ...c, fontSize: Number(value) || 12 };
              if (propName === "FontBold") return { ...c, fontBold: value === "True" || value === true };
              if (propName === "Enabled") return { ...c, enabled: value === "True" || value === true };
              if (propName === "Visible") return { ...c, visible: value === "True" || value === true };
              if (propName === "Interval") return { ...c, interval: Number(value) || 1000 };
              if (propName === "EmbedUrl") return { ...c, embedUrl: value };
              if (propName === "EmbedHtml") return { ...c, embedHtml: value };
              if (propName === "JsCode") return { ...c, jsCode: value };
              if (propName === "ChartType") return { ...c, chartType: value };
              if (propName === "BadgeVariant") return { ...c, badgeVariant: value };
              if (propName === "Gradient") return { ...c, gradient: value };
              if (propName === "BorderRadius") return { ...c, borderRadius: Number(value) || 0 };
              if (propName === "Value") return { ...c, value: isNaN(Number(value)) ? value : Number(value) };
              if (propName === "ShapeType") return { ...c, shapeType: value };
              if (propName === "BackColor") return { ...c, backColor: value };
              if (propName === "ForeColor") return { ...c, foreColor: value };
              return c;
            }),
          };
        }
        setTimeout(() => onChangeCode(generateDivCodeFromVB3(updated)), 0);
        return updated;
      });
    },
    [selectedControlId, setVb3Form, onChangeCode]
  );

  const handleDoubleClickControl = useCallback(
    (control: VB3Control) => {
      const eventType =
        control.type === "textbox" || control.type === "hscrollbar" || control.type === "vscrollbar"
          ? "Change"
          : control.type === "timer"
          ? "Timer"
          : "Click";
      const procName = `${control.name.toLowerCase()}_${eventType.toLowerCase()}`;
      if (!code.toLowerCase().includes(`process ${procName.toLowerCase()}`)) {
        const snippet = `\n// Evento ${eventType} de ${control.name}\nPROCESS ${procName}()\nBEGIN\n    write(0, 20, 440, 0, "Evento ${eventType}: ${control.name}");\nEND\n`;
        onChangeCode(code + "\n" + snippet);
      }
      setCodeTargetSymbol({ object: control.name, procedure: eventType, timestamp: Date.now() });
      setActiveTab("logic");
      setLogicMode("code");
    },
    [code, onChangeCode]
  );

  const handleDoubleClickTool = useCallback(
    (tool: VB3ToolType) => {
      const count = vb3Form.controls.filter((c) => c.type === tool).length + 1;
      const prefix =
        tool === "commandbutton"
          ? "Command"
          : tool === "textbox"
          ? "Text"
          : tool === "label"
          ? "Label"
          : tool.charAt(0).toUpperCase() + tool.slice(1);
      handleAddControl({
        id: `ctrl_${Date.now()}`,
        name: `${prefix}${count}`,
        type: tool,
        x: Math.round((vb3Form.width / 2 - 50) / 8) * 8,
        y: Math.round((vb3Form.height / 2 - 16) / 8) * 8,
        width: tool === "commandbutton" ? 112 : tool === "textbox" ? 160 : 120,
        height: tool === "commandbutton" ? 36 : tool === "textbox" ? 28 : 28,
        caption: `${prefix}${count}`,
        text: tool === "textbox" ? `${prefix}${count}` : undefined,
        enabled: true,
        visible: true,
      });
      setVb3MobilePanel("canvas");
    },
    [vb3Form.controls, vb3Form.width, vb3Form.height, handleAddControl]
  );

  const executeRuntimeOnly = useCallback(() => {
    const isMode8Project = /\b(start_mode8|m8_set_doom_sector|m8_add_doom_line|m8_engine_mode|m8_add_model|m8_place_voxel)\b/i.test(
      code || ""
    );
    setLaunchedFromMode8(activeTab === "mode8" || isMode8Project);
    try {
      runtime.stop();
      runtime.reset();
      runtime.loadFPG(fpg);

      const isLandingOrWeb = Boolean(
        !isMode8Project &&
          (currentPresetId?.startsWith("web_") ||
            currentPresetId?.includes("landing") ||
            code.toLowerCase().includes("draw_landing_page") ||
            code.toLowerCase().includes("web_page") ||
            code.toLowerCase().includes("web_hero") ||
            code.toLowerCase().includes("navbar("))
      );
      const isFormApp = Boolean(!isMode8Project && !isLandingOrWeb && designMode === "form" && forms.length > 0);

      if (isFormApp && vb3Form) {
        executeVB3FormInHtml5(runtime, vb3Form);
      } else {
        onRunGame();
      }
      if (!runtime.isHtml5Mode) {
        runtime.start();
      }
      setIsRunning(true);
    } catch (err) {
      console.error("[StudioWorkspace] Error iniciando ejecución:", err);
    }
  }, [activeTab, runtime, fpg, currentPresetId, code, designMode, forms.length, vb3Form, onRunGame]);

  const handlePlayRun = useCallback(() => {
    executeRuntimeOnly();
    setActiveTab("play");
  }, [executeRuntimeOnly]);

  const handleStopRun = useCallback(() => {
    runtime.stop();
    setIsRunning(false);
  }, [runtime]);

  useEffect(() => {
    if (pendingRunCode !== null && code === pendingRunCode) {
      setPendingRunCode(null);
      handlePlayRun();
    }
  }, [code, pendingRunCode, handlePlayRun]);

  const currentProjectName = useMemo(() => {
    if (projectTitle) return projectTitle;
    const p = PRESETS.find((pr) => pr.id === currentPresetId);
    return p ? p.name : "Proyecto_WXDIV";
  }, [currentPresetId, projectTitle]);

  const mapFiles = useMemo(
    () => (runtime?.mapFiles ? Array.from(runtime.mapFiles.values()) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runtime, activeTab, isAssetModalOpen, assetCategory]
  );

  // Auto-select first asset if none selected
  const resolvedSelectedAsset = useMemo(() => {
    if (selectedAsset) return selectedAsset;
    if (customModels.length > 0) return { kind: "model3d" as const, id: customModels[0].id };
    if (customTextures.length > 0) return { kind: "texture" as const, id: customTextures[0].name };
    if (fpg.length > 0) return { kind: "fpg" as const, id: fpg[0].id, pkgId: 0 };
    if (mapFiles.length > 0) return { kind: "map" as const, id: mapFiles[0].id };
    return null;
  }, [selectedAsset, customModels, customTextures, fpg, mapFiles]);

  const openAssetImporter = useCallback((tab: "model3d" | "texture" | "fpg" | "map") => {
    setAssetModalTab(tab);
    setIsAssetModalOpen(true);
  }, []);

  const handleApplyMode8Actions = useCallback(
    (actions: Mode8AiAction[]) => {
      if (!actions || actions.length === 0) return;
      setPendingMode8AiBatch({ batchId: Date.now(), actions });
      setActiveTab("mode8");
      setActiveStudioTool(null);
      setIsAiDrawerOpen(false);
      flashFeedback(`Bloques 3D enviados (${actions.length})`);
    },
    [flashFeedback]
  );

  const navItems: Array<{ id: StudioTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "mode8", label: "3D", icon: Compass },
    { id: "design", label: "Diseñar", icon: Smartphone },
    { id: "logic", label: "Lógica", icon: Blocks },
    { id: "play", label: "Probar", icon: Play },
    { id: "studio", label: "Estudio", icon: Wrench },
  ];

  const mobileNavItems = navItems.filter((n) => n.id !== "play");

  const activeToolMeta = activeStudioTool
    ? STUDIO_TOOLS.find((t) => t.id === activeStudioTool)
    : null;

  // Shared selector for App Móvil / Formulario inside Diseñar
  const designModeSwitcher = (
    <div className="inline-flex bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0] shrink-0">
      <button
        type="button"
        onClick={() => setDesignMode("mobile")}
        className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          designMode === "mobile"
            ? "bg-white text-[#7C2D48] shadow-2xs"
            : "text-[#4B5563] hover:text-[#111827]"
        }`}
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span>App Móvil</span>
      </button>
      <button
        type="button"
        onClick={() => {
          if (forms.length === 0) {
            const fallbackForm: VB3Form = {
              id: "form1",
              name: "Form1",
              caption: currentProjectName || "Mi App",
              backColor: "#f8fafc",
              width: 480,
              height: 420,
              controls: [],
            };
            setForms([fallbackForm]);
            setActiveFormId("form1");
          }
          setDesignMode("form");
        }}
        className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          designMode === "form"
            ? "bg-white text-[#7C2D48] shadow-2xs"
            : "text-[#4B5563] hover:text-[#111827]"
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
        <span>Formulario</span>
      </button>
    </div>
  );

  const designQuickActions = (
    <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
      <button
        type="button"
        onClick={() => setIsWebWizardOpen(true)}
        className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        title="Asistente de Páginas Web"
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span>Web</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("logic")}
        className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#EEF6F1] hover:bg-[#DCEEE3] text-[#2F6F4E] border border-[#CFE4D7] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        title="Editar lógica de bloques o código DIV"
      >
        <Blocks className="w-3.5 h-3.5 shrink-0" />
        <span>Lógica</span>
      </button>
      <button
        type="button"
        onClick={() => setIsAiDrawerOpen(true)}
        className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] border border-[#E2E8F0] text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
        title="Abrir AURA IA local"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#7C2D48] shrink-0" />
        <span>IA</span>
      </button>
    </div>
  );
  // Kept minimal helper spacing without taller brick clutter

  return (
    <div
      ref={workspaceRootRef}
      className={`flex flex-col w-full h-full min-h-0 bg-[#E9EEF4] text-[#111827] overflow-hidden select-none pl-safe pr-safe ${
        isFullscreen ? "fixed inset-0 z-40 h-[100dvh] w-screen pt-safe" : ""
      }`}
    >
      {/* ===================================================================== */}
      {/* TOP BAR (Minimal, calm, mobile-first header)                          */}
      {/* ===================================================================== */}
      {!(isFullscreen && activeTab === "play") && (
        <header className="h-12 md:h-13 px-2.5 sm:px-4 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0 z-30">
          {/* Left: Brand & Project Selector */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#7C2D48] text-white flex items-center justify-center font-bold text-sm tracking-tight flex-shrink-0">
              W
            </div>
            <button
              type="button"
              onClick={() => setIsPresetsDrawerOpen(true)}
              className="min-w-0 min-h-[40px] text-left group flex items-center gap-1 py-1 px-1.5 -ml-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cambiar plantilla o proyecto"
            >
              <span className="text-xs sm:text-sm font-bold text-[#111827] truncate max-w-[105px] sm:max-w-[170px] lg:max-w-[210px]">
                {currentProjectName}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#7C2D48] flex-shrink-0" />
            </button>
          </div>

          {/* Center: Desktop/Tablet Primary Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] flex-shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-white text-[#7C2D48] shadow-2xs"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Activos + Probar + AURA IA + Mic + More Menu */}
          <div className="flex items-center gap-1.5 flex-shrink-0 relative">
            <button
              type="button"
              onClick={() => openAssetImporter(assetCategory)}
              className="min-h-[38px] px-2.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Cargar o crear Objetos MD2/MD3, Texturas, FPG y MAP"
            >
              <Upload className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden lg:inline">Activos</span>
            </button>

            {isRunning ? (
              <button
                type="button"
                onClick={handleStopRun}
                className="min-h-[38px] px-2.5 lg:px-3 rounded-lg bg-[#2F6F4E] hover:bg-[#25593E] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Detener</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlayRun}
                className="min-h-[38px] px-2.5 lg:px-3 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Probar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenExport?.()}
              className="hidden md:flex min-h-[38px] px-2.5 lg:px-3 rounded-lg bg-[#2F6F4E] hover:bg-[#25593E] text-white font-semibold text-xs items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Exportar o compilar tu proyecto"
            >
              <Cloud className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden lg:inline">Publicar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAiDrawerOpen(true)}
              className="min-h-[38px] px-2.5 lg:px-3 rounded-lg bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Abrir Asistente Local AURA IA"
            >
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span>IA</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsAiDrawerOpen(true);
                setVoiceTriggerCount((c) => c + 1);
              }}
              className="min-h-[38px] min-w-[38px] px-2 rounded-lg bg-[#EEF6F1] hover:bg-[#E2EFE8] text-[#2F6F4E] border border-[#CFE4D7] font-semibold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Dictar comando por voz a AURA IA"
              aria-label="Dictar comando por voz a AURA IA"
            >
              <Mic className="w-4 h-4 flex-shrink-0" />
            </button>

            <div className="hidden sm:flex items-center gap-1.5">
              <PWAInstallButton variant="header" />
              <button
                type="button"
                onClick={() => toggleFullscreen(workspaceRootRef.current)}
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                  isFullscreen
                    ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                    : "border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#4B5563]"
                }`}
                title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#4B5563] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
              title="Más opciones"
              aria-label="Más opciones"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-64 bg-white border border-[#CBD5E1] rounded-xl shadow-xl py-1.5 z-50 text-xs max-h-[80dvh] overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenExport?.();
                    }}
                    className="md:hidden w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#EEF6F1] flex items-center gap-2.5 font-semibold text-[#2F6F4E] cursor-pointer"
                  >
                    <Cloud className="w-4 h-4 text-[#2F6F4E] flex-shrink-0" />
                    <span>Publicar o Exportar App</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      openAssetImporter("model3d");
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#EFF6FF] flex items-center gap-2.5 font-semibold text-[#1D4ED8] cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#1D4ED8] flex-shrink-0" />
                    <span>Importar Objetos MD2/MD3 y Texturas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsWelcomeOpen(true);
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#FDF2F5] flex items-center gap-2.5 font-semibold text-[#7C2D48] cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                    <span>Guía de Bienvenida</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsAiOnboardingOpen(true);
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#EEF6F1] flex items-center gap-2.5 font-semibold text-[#2F6F4E] cursor-pointer"
                  >
                    <Cpu className="w-4 h-4 text-[#2F6F4E] flex-shrink-0" />
                    <span>Cómo funciona la IA Local</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsAiTutorialOpen(true);
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#FDF2F5] flex items-center gap-2.5 font-semibold text-[#7C2D48] cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                    <span>Tutorial IA → Sintaxis DIV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsWineboxOpen(true);
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#EEF6F1] flex items-center gap-2.5 font-semibold text-[#2F6F4E] cursor-pointer"
                  >
                    <Brain className="w-4 h-4 text-[#2F6F4E] flex-shrink-0" />
                    <span>Winebox Clinic y Consola</span>
                  </button>
                  <PWAInstallButton variant="menu" onActionComplete={() => setIsMoreMenuOpen(false)} />
                  <div className="my-1 border-t border-[#E2E8F0]" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenNewProject?.();
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5 font-medium text-[#111827] cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                    <span>Nuevo proyecto o plantilla</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsWebWizardOpen(true);
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#FDF2F5] flex items-center gap-2.5 font-semibold text-[#7C2D48] cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                    <span>Asistente de Páginas Web</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsLexiconOpen(true);
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5 font-medium text-[#111827] cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#4B5563] flex-shrink-0" />
                    <span>Manual DIV Games</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenCloudSync?.();
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5 font-medium text-[#111827] cursor-pointer"
                  >
                    <Cloud className="w-4 h-4 text-[#4B5563] flex-shrink-0" />
                    <span>Sincronización Nube</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenAiSettings();
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5 font-medium text-[#111827] cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-[#4B5563] flex-shrink-0" />
                    <span>Ajustes de IA</span>
                  </button>
                  {onChangeResolution && (
                    <div className="px-3.5 py-2 border-t border-[#E2E8F0] mt-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                        Resolución
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {(["320x200", "640x480", "800x600"] as const).map((res) => (
                          <button
                            key={res}
                            type="button"
                            onClick={() => {
                              onChangeResolution(res);
                              setIsMoreMenuOpen(false);
                            }}
                            className={`py-1.5 rounded text-[10px] font-mono font-semibold border cursor-pointer ${
                              resolution === res
                                ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                                : "bg-[#F7F8FA] text-[#4B5563] border-[#E2E8F0]"
                            }`}
                          >
                            {res.split("x")[0]}p
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>
      )}

      {/* ===================================================================== */}
      {/* MAIN INTEGRATED WORKSPACE BODY                                        */}
      {/* ===================================================================== */}
      <div className="flex-1 flex-grow min-h-0 w-full flex flex-col overflow-hidden relative bg-[#F7F8FA]">
        {inspectorFeedback && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-2 rounded-xl bg-[#111827] text-white text-xs font-semibold shadow-lg pointer-events-none">
            {inspectorFeedback}
          </div>
        )}

        {/* 0. CONSTRUCTOR 3D MODO 8 (Inicio predeterminado) */}
        {activeTab === "mode8" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ErrorBoundary sectionName="Constructor 3D">
              <Mode8LevelEditor
                key={projectResetVersion}
                runtime={runtime}
                fpg={fpg}
                onUpdateFpg={onUpdateFpg}
                onFpgPackagesChanged={onFpgPackagesChanged}
                onInsertCode={onInsertCode}
                onApplyFullCode={onApplyFullCode}
                onOpenAssetImporter={(tab) => openAssetImporter(tab)}
                requestedModelId={requestedMode8ModelId}
                requestedTextureName={requestedMode8TextureName}
                onConsumeRequestedAsset={() => {
                  setRequestedMode8ModelId(null);
                  setRequestedMode8TextureName(null);
                }}
                onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
                pendingAiActionBatch={pendingMode8AiBatch}
                onConsumeAiActionBatch={() => setPendingMode8AiBatch(null)}
                onSceneContextChange={setMode8SceneContext}
                onLaunchGameCode={(fullCode, customTitle) => {
                  try {
                    onApplyFullCode(fullCode, customTitle);
                    runtime.stop();
                    runtime.reset();
                    runtime.loadFPG(fpg);
                    setupRuntimeFromDivCode(runtime, fullCode, customTitle);
                    if (!runtime.isHtml5Mode) {
                      runtime.start();
                    }
                    setIsRunning(!runtime.isHtml5Mode);
                    setLaunchedFromMode8(true);
                    setActiveTab("play");
                  } catch (err) {
                    console.error("[Mode8] Error al iniciar el juego 3D:", err);
                  }
                }}
                onApplyToRuntime={() => {
                  try {
                    onRunGame();
                    setLaunchedFromMode8(true);
                    setActiveTab("play");
                  } catch (err) {
                    console.error("[Mode8] Error aplicando al runtime:", err);
                  }
                }}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* 1. DISEÑAR (App Móvil y Formulario unificados en una sola línea) */}
        {activeTab === "design" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {designMode === "mobile" ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <ErrorBoundary sectionName="Diseñador Visual">
                  <AppInventorWorkspace
                    initialCode={code}
                    projectName={currentProjectName}
                    onChangeCode={onChangeCode}
                    onRunGame={handlePlayRun}
                    onSwitchToCodeEditor={() => {
                      setActiveTab("logic");
                      setLogicMode("code");
                    }}
                    initialMode="designer"
                    embeddedMode={true}
                    designerLeftSlot={designModeSwitcher}
                    designerRightSlot={designQuickActions}
                    onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
                  />
                </ErrorBoundary>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#F7F8FA]">
                {/* Single-row unified bar for Form mode */}
                <div className="flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 bg-white border-b border-[#E2E8F0] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap flex-shrink-0 min-h-[48px]">
                  <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                    {designModeSwitcher}

                    <div className="flex lg:hidden bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0] shrink-0">
                      {[
                        { id: "canvas", label: "Lienzo", icon: Monitor },
                        { id: "toolbox", label: "Controles", icon: Plus },
                        { id: "properties", label: "Ajustes", icon: Sliders },
                      ].map((p) => {
                        const Icon = p.icon;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setVb3MobilePanel(p.id as any)}
                            className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                              vb3MobilePanel === p.id ? "bg-white text-[#7C2D48] shadow-2xs" : "text-[#4B5563]"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {designQuickActions}
                </div>

                <div className="flex-1 min-h-0 p-2 sm:p-3 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
                  <WorkspaceCard
                    title="Controles"
                    className={`${vb3MobilePanel === "toolbox" ? "flex" : "hidden lg:flex"} lg:col-span-2`}
                  >
                    <div className="p-2 flex-1 min-h-0 overflow-y-auto">
                      <ToolboxWindow
                        activeTool={activeTool}
                        onSelectTool={(t) => {
                          setActiveTool(t);
                          if (t !== "pointer") setVb3MobilePanel("canvas");
                        }}
                        onDoubleClickTool={handleDoubleClickTool}
                      />
                    </div>
                  </WorkspaceCard>

                  <WorkspaceCard
                    title={vb3Form.caption || vb3Form.name}
                    subtitle={`${vb3Form.width}×${vb3Form.height} · ${vb3Form.controls.length} controles`}
                    className={`${vb3MobilePanel === "canvas" ? "flex" : "hidden lg:flex"} lg:col-span-7`}
                    headerRight={
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFormAutoFit((v) => !v)}
                          className="min-h-[32px] px-2.5 rounded-md bg-white border border-[#E2E8F0] text-xs font-semibold cursor-pointer"
                        >
                          {formAutoFit ? `${Math.round(formCanvasScale * 100)}%` : "100%"}
                        </button>
                        {selectedControl && (
                          <button
                            type="button"
                            onClick={() => {
                              setVb3Form((prev) => ({
                                ...prev,
                                controls: prev.controls.filter((c) => c.id !== selectedControl.id),
                              }));
                              setSelectedControlId(null);
                            }}
                            className="min-h-[32px] px-2.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Quitar</span>
                          </button>
                        )}
                      </div>
                    }
                  >
                    <div
                      ref={formViewportRef}
                      className="flex-1 min-h-0 flex flex-col items-center justify-start p-2 sm:p-3 overflow-auto bg-[#F8FAFC]"
                    >
                      <FormCanvas
                        form={vb3Form}
                        selectedControlId={selectedControlId}
                        activeTool={activeTool}
                        scale={formAutoFit ? formCanvasScale : 1}
                        onSelectControl={setSelectedControlId}
                        onUpdateControlBounds={handleUpdateControlBounds}
                        onAddControl={handleAddControl}
                        onDoubleClickControl={handleDoubleClickControl}
                        onResetTool={() => setActiveTool("pointer")}
                      />
                    </div>
                  </WorkspaceCard>

                  <WorkspaceCard
                    title="Propiedades"
                    subtitle={selectedControl ? selectedControl.name : vb3Form.name}
                    className={`${vb3MobilePanel === "properties" ? "flex" : "hidden lg:flex"} lg:col-span-3`}
                  >
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <PropertiesWindow
                        form={vb3Form}
                        selectedControl={selectedControl}
                        onSelectControl={setSelectedControlId}
                        onUpdateProperty={handleUpdateProperty}
                      />
                    </div>
                  </WorkspaceCard>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. LÓGICA (Visual Blocks OR DIV Code Editor) */}
        {activeTab === "logic" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-2.5 sm:px-3 py-1.5 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap flex-shrink-0 min-h-[48px]">
              <div className="inline-flex bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0] shrink-0">
                <button
                  type="button"
                  onClick={() => setLogicMode("blocks")}
                  className={`min-h-[36px] px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    logicMode === "blocks"
                      ? "bg-white text-[#7C2D48] shadow-2xs"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                >
                  <Blocks className="w-3.5 h-3.5 shrink-0" />
                  <span>Bloques</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogicMode("code")}
                  className={`min-h-[36px] px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    logicMode === "code"
                      ? "bg-white text-[#7C2D48] shadow-2xs"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Código DIV</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLexiconOpen(true)}
                  className="min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg bg-[#F7F8FA] hover:bg-slate-100 text-[#111827] border border-[#E2E8F0] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#7C2D48] shrink-0" />
                  <span className="hidden sm:inline">Manual DIV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAiDrawerOpen(true)}
                  className="min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>AURA IA</span>
                </button>
              </div>
            </div>

            {logicMode === "blocks" ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <ErrorBoundary sectionName="Bloques Visuales">
                  <AppInventorWorkspace
                    initialCode={code}
                    projectName={currentProjectName}
                    onChangeCode={onChangeCode}
                    onRunGame={handlePlayRun}
                    onSwitchToCodeEditor={() => setLogicMode("code")}
                    initialMode="blocks"
                    embeddedMode={true}
                    onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
                  />
                </ErrorBoundary>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden sm:p-2">
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden sm:border sm:border-[#E2E8F0] sm:rounded-xl bg-white">
                  <ErrorBoundary sectionName="Editor de Código DIV">
                    <CodeEditor
                      code={code}
                      onChange={onChangeCode}
                      runtime={runtime}
                      fileName={`${currentProjectName}.prg`}
                      targetSymbol={codeTargetSymbol}
                      onOpenLexicon={() => setIsLexiconOpen(true)}
                      onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
                      onRun={handlePlayRun}
                      initialViewMode="code"
                      hideBlockToggle={true}
                      onAskAiFix={() => setIsAiDrawerOpen(true)}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. PROBAR (Full Responsive Game / HTML5 Stage) */}
        {activeTab === "play" && (
          <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${isFullscreen ? "p-0" : "sm:p-2"} bg-[#0b101d]`}>
            <div className="px-2.5 py-1.5 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(launchedFromMode8 ? "mode8" : "logic");
                    setLaunchedFromMode8(false);
                  }}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#7C2D48] hover:bg-[#9E3F5E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{launchedFromMode8 ? "Volver a 3D" : "Volver a Lógica"}</span>
                </button>
                <span className="text-xs text-slate-300 font-medium truncate">
                  {launchedFromMode8 ? "Prueba 3D" : currentProjectName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleFullscreen(workspaceRootRef.current)}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? "Salir" : "Pantalla completa"}</span>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <ErrorBoundary
                sectionName="Ejecución de Juego"
                onResetSection={() => {
                  runtime.stop();
                  setActiveTab(launchedFromMode8 ? "mode8" : "logic");
                  setLaunchedFromMode8(false);
                }}
              >
                <GameStage runtime={runtime} onRestart={onRestartGame} />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* 4. ESTUDIO (Integrated Resource & Tool Hub) */}
        {activeTab === "studio" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#E9EEF4]">
            {activeStudioTool && activeToolMeta ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="px-2.5 sm:px-3 py-1.5 bg-white border-b border-[#CBD5E1] flex items-center justify-between gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveStudioTool(null)}
                    className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] text-xs font-semibold flex items-center gap-1.5 cursor-pointer flex-shrink-0 whitespace-nowrap"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Estudio</span>
                  </button>

                  <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                    <select
                      aria-label="Cambiar herramienta de estudio"
                      value={activeStudioTool}
                      onChange={(e) => setActiveStudioTool(e.target.value as StudioToolId)}
                      className="min-h-[40px] max-w-[220px] px-2.5 py-1.5 rounded-lg bg-[#F7F8FA] border border-[#CBD5E1] text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#7C2D48] truncate cursor-pointer"
                    >
                      {STUDIO_TOOLS.map((tool) => (
                        <option key={tool.id} value={tool.id}>
                          {tool.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <ErrorBoundary
                    sectionName={activeToolMeta.title}
                    onResetSection={() => setActiveStudioTool(null)}
                  >
                    {activeStudioTool === "sprites" && <SpriteEditor fpg={fpg} onUpdateFpg={onUpdateFpg} />}
                    {activeStudioTool === "fpg" && (
                      <FpgEditor
                        runtime={runtime}
                        onInsertCode={onInsertCode}
                        onOpenSpriteEditor={() => setActiveStudioTool("sprites")}
                        onUpdateMainFpg={onUpdateFpg}
                        onPackagesChanged={onFpgPackagesChanged}
                      />
                    )}
                    {activeStudioTool === "map" && <MapEditor runtime={runtime} onInsertCode={onInsertCode} />}
                    {activeStudioTool === "fonts" && <FontEditor runtime={runtime} onInsertCode={onInsertCode} />}
                    {activeStudioTool === "palette" && <PaletteEditor runtime={runtime} onInsertCode={onInsertCode} />}
                    {activeStudioTool === "explosions" && (
                      <ExplosionCreator fpg={fpg} onAddFramesToFpg={onAddExplosionFrames} onInsertCode={onInsertCode} />
                    )}
                    {activeStudioTool === "mode8" && (
                      <Mode8LevelEditor
                        runtime={runtime}
                        fpg={fpg}
                        onUpdateFpg={onUpdateFpg}
                        onFpgPackagesChanged={onFpgPackagesChanged}
                        onInsertCode={onInsertCode}
                        onApplyFullCode={onApplyFullCode}
                        onOpenAssetImporter={(tab) => openAssetImporter(tab)}
                        onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
                        pendingAiActionBatch={pendingMode8AiBatch}
                        onConsumeAiActionBatch={() => setPendingMode8AiBatch(null)}
                        onSceneContextChange={setMode8SceneContext}
                        onLaunchGameCode={(fullCode, customTitle) => {
                          onApplyFullCode(fullCode, customTitle);
                          runtime.stop();
                          runtime.reset();
                          runtime.loadFPG(fpg);
                          setupRuntimeFromDivCode(runtime, fullCode, customTitle);
                          if (!runtime.isHtml5Mode) runtime.start();
                          setIsRunning(!runtime.isHtml5Mode);
                          setLaunchedFromMode8(true);
                          setActiveTab("play");
                        }}
                        onApplyToRuntime={() => {
                          onRunGame();
                          setLaunchedFromMode8(true);
                          setActiveTab("play");
                        }}
                      />
                    )}
                    {activeStudioTool === "md2viewer" && (
                      <MD2Viewer
                        onInsertCode={onInsertCode}
                        onOpenSpriteGenerator={(model) => {
                          setGeneratorModel(model);
                          setActiveStudioTool("spritegenerator");
                        }}
                      />
                    )}
                    {activeStudioTool === "spritegenerator" && (
                      <SpriteGenerator
                        initialModel={generatorModel}
                        fpg={fpg}
                        onUpdateFpg={onUpdateFpg}
                        onInsertCode={onInsertCode}
                      />
                    )}
                    {activeStudioTool === "sound" && <SoundEditor onInsertCode={onInsertCode} />}
                    {activeStudioTool === "processes" && <ProcessInspector runtime={runtime} />}
                  </ErrorBoundary>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 sm:p-5">
                <div className="max-w-5xl mx-auto space-y-5 pb-8">
                  <WorkspaceCard
                    title="Biblioteca Visual de Activos"
                    subtitle="Carga, previsualiza en 3D y usa modelos .md2/.md3, texturas y paquetes FPG"
                    headerRight={
                      <button
                        type="button"
                        onClick={() => openAssetImporter("model3d")}
                        className="min-h-[38px] px-3.5 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Importar / Crear</span>
                      </button>
                    }
                  >
                    <div className="p-3 sm:p-4">
                      <AssetBrowser
                        layout="full"
                        runtime={runtime}
                        fpg={fpg}
                        onUpdateFpg={onUpdateFpg}
                        onPackagesChanged={onFpgPackagesChanged}
                        selectedAsset={resolvedSelectedAsset}
                        onSelectAsset={(asset) => setSelectedAsset(asset)}
                        onOpenImporter={(tab) => openAssetImporter(tab)}
                        onUseModelInMode8={(modelId) => {
                          setRequestedMode8ModelId(modelId);
                          setActiveTab("mode8");
                        }}
                        onUseTextureInMode8={(textureName) => {
                          setRequestedMode8TextureName(textureName);
                          setActiveTab("mode8");
                        }}
                        onOpenFpgEditor={() => setActiveStudioTool("fpg")}
                        onFeedback={flashFeedback}
                      />
                    </div>
                  </WorkspaceCard>

                  {(["Gráficos", "3D y Niveles", "Audio y Sistema"] as const).map((cat) => (
                    <section key={cat} className="space-y-2.5">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#4B5563] px-1">{cat}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {STUDIO_TOOLS.filter((t) => t.category === cat).map((tool) => {
                          const Icon = tool.icon;
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => {
                                if (tool.id === "mode8") {
                                  setActiveStudioTool(null);
                                  setActiveTab("mode8");
                                } else {
                                  setActiveStudioTool(tool.id);
                                }
                              }}
                              className="min-h-[78px] p-4 rounded-2xl bg-white border border-[#CBD5E1] shadow-[0_3px_0_0_#CBD5E1] hover:border-[#7C2D48] text-left flex items-start gap-3.5 transition-all cursor-pointer group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-[#FDF2F5] text-[#7C2D48] group-hover:bg-[#7C2D48] group-hover:text-white flex items-center justify-center flex-shrink-0 transition-colors">
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-[#111827] flex items-center justify-between">
                                  <span className="truncate">{tool.title}</span>
                                  <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#7C2D48] flex-shrink-0" />
                                </div>
                                <p className="text-xs text-[#4B5563] mt-0.5 line-clamp-2">{tool.subtitle}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION (4 clean, large touch targets) */}
      {!(isFullscreen && activeTab === "play") && (
        <nav className="md:hidden bg-white border-t border-[#E2E8F0] grid grid-cols-4 h-14 pb-safe flex-shrink-0 z-30">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  active ? "text-[#7C2D48] bg-[#FDF2F5]/70" : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "stroke-[2.4]" : ""}`} />
                <span className="truncate max-w-full px-1">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ASSET MANAGER MODAL (CREATE / IMPORT MD2, MD3, TEXTURAS, FPG, MAP) */}
      <AssetManagerModal
        isOpen={isAssetModalOpen}
        initialTab={assetModalTab}
        onClose={() => setIsAssetModalOpen(false)}
        runtime={runtime}
        fpg={fpg}
        onUpdateFpg={onUpdateFpg}
        onPackagesChanged={onFpgPackagesChanged}
        onInsertCode={onInsertCode}
        onSelectAsset={(asset) => {
          setSelectedAsset(asset);
          setAssetCategory(asset.kind);
        }}
        onOpenInMode8={(opts) => {
          if (opts?.modelId) setRequestedMode8ModelId(opts.modelId);
          if (opts?.textureName) setRequestedMode8TextureName(opts.textureName);
          setActiveTab("mode8");
        }}
        onOpenStudioTool={(tool) => {
          setActiveTab("studio");
          setActiveStudioTool(tool);
        }}
      />

      {/* SLIDE-OVER AURA IA DRAWER */}
      {isAiDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[2px]">
          <div className="flex-1 hidden sm:block" onClick={() => setIsAiDrawerOpen(false)} />
          <div className="w-full sm:w-[440px] h-full bg-white border-l border-[#CBD5E1] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#FDF2F5] text-[#7C2D48] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#111827] truncate">Asistente AURA IA</h3>
                  <p className="text-[11px] text-[#6B7280] truncate">Genera juegos, apps o corrige tu código DIV</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAiTutorialOpen(true)}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Tutorial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAiOnboardingOpen(true)}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[#EEF6F1] hover:bg-[#E2EFE8] text-[#2F6F4E] border border-[#CFE4D7] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">GPU/CPU</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAiDrawerOpen(false)}
                  className="w-10 h-10 rounded-lg hover:bg-slate-100 text-[#4B5563] flex items-center justify-center cursor-pointer"
                  aria-label="Cerrar asistente IA"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <AiCopilot
                currentCode={code}
                fpg={fpg}
                onInsertCode={onInsertCode}
                onApplyCode={(newCode) => onApplyFullCode(newCode)}
                onSwitchToEditor={() => {
                  setIsAiDrawerOpen(false);
                  setActiveTab("logic");
                  setLogicMode("code");
                }}
                onRunGame={() => {
                  setIsAiDrawerOpen(false);
                  handlePlayRun();
                }}
                onStopGame={handleStopRun}
                onOpenAiSettings={onOpenAiSettings}
                initialPrompt={pendingAiPrompt}
                onConsumeInitialPrompt={() => setPendingAiPrompt(undefined)}
                autoStartVoiceTrigger={voiceTriggerCount}
                activeWorkspaceTab={activeTab}
                mode8SceneContext={mode8SceneContext}
                onApplyMode8Actions={handleApplyMode8Actions}
              />
            </div>
          </div>
        </div>
      )}

      {/* QUICK PRESETS / PROJECT SWITCHER DRAWER */}
      {isPresetsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl max-h-[88dvh] bg-white rounded-t-2xl sm:rounded-2xl border border-[#CBD5E1] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#111827]">Cambiar Plantilla o Crear Proyecto</h3>
                <p className="text-xs text-[#6B7280]">Elige un proyecto listo para probar o empieza uno desde cero</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPresetsDrawerOpen(false)}
                className="w-10 h-10 rounded-lg hover:bg-slate-100 text-[#4B5563] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPresetsDrawerOpen(false);
                    onOpenNewProject?.();
                  }}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 shrink-0" />
                  <span>Nuevo Proyecto Personalizado</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPresetsDrawerOpen(false);
                    setIsWebWizardOpen(true);
                  }}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>Asistente Web / Tienda</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRESETS.map((preset) => {
                  const selected = preset.id === currentPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setIsPresetsDrawerOpen(false);
                        onSelectPreset?.(preset);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selected ? "border-[#7C2D48] bg-[#FDF2F5]" : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#111827] truncate">{preset.name}</span>
                        {selected && <Check className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />}
                      </div>
                      <div className="text-[11px] text-[#7C2D48] font-medium mt-0.5">
                        {preset.genre} · {preset.resolution}
                      </div>
                      <p className="text-xs text-[#4B5563] mt-1 line-clamp-2">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <DivLexiconModal
        isOpen={isLexiconOpen}
        onClose={() => setIsLexiconOpen(false)}
        onInsertCode={(snippet) => {
          onInsertCode(snippet);
          setIsLexiconOpen(false);
          setActiveTab("logic");
          setLogicMode("code");
        }}
        onOpenGuide={() => {
          setIsLexiconOpen(false);
          setIsWelcomeOpen(true);
        }}
      />

      <WelcomeGuideModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        onNavigateTab={(tab, options) => {
          setActiveTab(tab);
          if (options?.designMode) setDesignMode(options.designMode);
          if (options?.logicMode) setLogicMode(options.logicMode);
        }}
        onOpenPresets={() => setIsPresetsDrawerOpen(true)}
        onOpenAiWithPrompt={(prompt) => {
          if (prompt) setPendingAiPrompt(prompt);
          setIsAiDrawerOpen(true);
        }}
        onOpenAiSettings={onOpenAiSettings}
        onOpenWebWizard={() => {
          setIsWelcomeOpen(false);
          setIsWebWizardOpen(true);
        }}
        onOpenLexicon={() => {
          setIsWelcomeOpen(false);
          setIsLexiconOpen(true);
        }}
        onOpenAiTutorial={() => {
          setIsWelcomeOpen(false);
          setIsAiTutorialOpen(true);
        }}
        onOpenWinebox={() => {
          setIsWelcomeOpen(false);
          setIsWineboxOpen(true);
        }}
        onOpenMode8Editor={() => {
          setIsWelcomeOpen(false);
          setActiveStudioTool(null);
          setActiveTab("mode8");
        }}
        onLoadBeginnerCode={(sampleCode, runImmediately) => {
          setDesignMode("mobile");
          onApplyFullCode(sampleCode);
          if (runImmediately) {
            setPendingRunCode(sampleCode);
          } else {
            setActiveTab("logic");
            setLogicMode("code");
          }
        }}
      />

      <WebWizardModal
        isOpen={isWebWizardOpen}
        onClose={() => setIsWebWizardOpen(false)}
        onApplyWebCode={(webCode, options) => {
          setDesignMode("mobile");
          onApplyFullCode(webCode, options.title);
          if (options.openAiPrompt) {
            setPendingAiPrompt(options.openAiPrompt);
            setIsAiDrawerOpen(true);
          }
          if (options.runImmediately) {
            setPendingRunCode(webCode);
          } else {
            setActiveTab("logic");
            setLogicMode("code");
          }
        }}
      />

      <LocalAiOnboardingModal
        isOpen={isAiOnboardingOpen}
        onClose={() => setIsAiOnboardingOpen(false)}
        onOpenAiWithPrompt={(prompt) => {
          if (prompt) setPendingAiPrompt(prompt);
          setIsAiDrawerOpen(true);
        }}
        onOpenAiSettings={onOpenAiSettings}
        onOpenTutorial={() => {
          setIsAiOnboardingOpen(false);
          setIsAiTutorialOpen(true);
        }}
        onLoadCode={(sampleCode, runImmediately) => {
          setDesignMode("mobile");
          onApplyFullCode(sampleCode);
          if (runImmediately) {
            setPendingRunCode(sampleCode);
          } else {
            setActiveTab("logic");
            setLogicMode("code");
          }
        }}
      />

      {isAiTutorialOpen && (
        <LocalAiTutorialView
          onClose={() => setIsAiTutorialOpen(false)}
          onOpenAiSettings={onOpenAiSettings}
          onOpenAiWithPrompt={(prompt) => {
            if (prompt) setPendingAiPrompt(prompt);
            setIsAiDrawerOpen(true);
          }}
          onLoadCode={(sampleCode, runImmediately) => {
            setDesignMode("mobile");
            onApplyFullCode(sampleCode);
            if (runImmediately) {
              setPendingRunCode(sampleCode);
            } else {
              setActiveTab("logic");
              setLogicMode("code");
            }
          }}
        />
      )}

      <WineboxEcosystemModal
        isOpen={isWineboxOpen}
        onClose={() => setIsWineboxOpen(false)}
        onOpenExport={onOpenExport}
        onOpenAiWithPrompt={(prompt) => {
          if (prompt) setPendingAiPrompt(prompt);
          setIsAiDrawerOpen(true);
        }}
        onLoadCode={(sampleCode, runImmediately, title) => {
          setDesignMode("mobile");
          onApplyFullCode(sampleCode, title);
          if (runImmediately) {
            setPendingRunCode(sampleCode);
          } else {
            setActiveTab("logic");
            setLogicMode("code");
          }
        }}
      />
    </div>
  );
};
