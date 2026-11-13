import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Smartphone,
  LayoutGrid,
  Code2,
  Blocks,
  Play,
  Square,
  Sparkles,
  Wrench,
  MoreVertical,
  FolderPlus,
  Download,
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
  Layers,
  Check,
  ChevronRight,
  HelpCircle,
  Globe,
} from "lucide-react";
import { WindowId } from "./WindowManager/types";
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
import { WebWizardModal } from "./WebWizardModal";
import { DivRuntime } from "../engine/runtime";
import { DivGraphic, DivProcess } from "../types";
import { GamePreset, PRESETS } from "../engine/presets";

export type StudioTab = "design" | "logic" | "play" | "studio";
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
    subtitle: "Editor de sectores, paredes y texturas 3D",
    category: "3D y Niveles",
    icon: Compass,
  },
  {
    id: "md2viewer",
    title: "Visor 3D MD2",
    subtitle: "Inspecciona mallas poligonales y animaciones",
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
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>("design");
  const [designMode, setDesignMode] = useState<DesignMode>("mobile");
  const [logicMode, setLogicMode] = useState<LogicMode>("blocks");
  const [activeStudioTool, setActiveStudioTool] = useState<StudioToolId | null>(null);

  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPresetsDrawerOpen, setIsPresetsDrawerOpen] = useState(false);
  const [isLexiconOpen, setIsLexiconOpen] = useState(false);
  const [isWebWizardOpen, setIsWebWizardOpen] = useState(false);
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

  // Reset form/design mode when project changes
  useEffect(() => {
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

  // Handle requestedActiveTool from App.tsx (e.g., when creating/loading presets)
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
    } else if (
      [
        "sprites",
        "fpg",
        "map",
        "fonts",
        "palette",
        "explosions",
        "mode8",
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

  // Compute responsive auto-fit scale for the Desktop/Android Visual Form Canvas
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

  const handlePlayRun = useCallback(() => {
    runtime.stop();
    runtime.reset();
    runtime.loadFPG(fpg);

    const isLandingOrWeb = Boolean(
      currentPresetId?.startsWith("web_") ||
        currentPresetId?.includes("landing") ||
        code.toLowerCase().includes("draw_landing_page") ||
        code.toLowerCase().includes("web_page") ||
        code.toLowerCase().includes("web_hero") ||
        code.toLowerCase().includes("navbar(")
    );
    const isFormApp = Boolean(!isLandingOrWeb && designMode === "form" && forms.length > 0);

    if (isFormApp && vb3Form) {
      executeVB3FormInHtml5(runtime, vb3Form);
    } else {
      onRunGame();
    }
    if (!runtime.isHtml5Mode) {
      runtime.start();
    }
    setIsRunning(true);
    setActiveTab("play");
  }, [runtime, fpg, currentPresetId, code, designMode, forms.length, vb3Form, onRunGame]);

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

  const navItems: Array<{ id: StudioTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "design", label: "Diseñar", icon: Smartphone },
    { id: "logic", label: "Lógica", icon: Blocks },
    { id: "play", label: "Probar", icon: Play },
    { id: "studio", label: "Estudio", icon: Wrench },
  ];

  const activeToolMeta = activeStudioTool
    ? STUDIO_TOOLS.find((t) => t.id === activeStudioTool)
    : null;

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* TOP BAR (WineBOX Clinic calm clinical header, <= 52px on mobile)      */}
      {/* ===================================================================== */}
      <header className="h-12 md:h-14 px-3 md:px-5 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0 z-30">
        {/* Left: Brand & Project Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#7C2D48] text-white flex items-center justify-center font-extrabold text-sm tracking-tight flex-shrink-0 shadow-xs">
            W
          </div>
          <button
            type="button"
            onClick={() => setIsPresetsDrawerOpen(true)}
            className="min-w-0 text-left group flex items-center gap-1.5 py-1 px-1.5 -ml-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cambiar plantilla o proyecto"
          >
            <div className="min-w-0">
              <div className="text-xs md:text-sm font-bold text-[#111827] truncate max-w-[140px] sm:max-w-[220px]">
                {currentProjectName}
              </div>
              <div className="hidden sm:block text-[11px] text-[#6B7280] leading-none">
                WXDIV Studio · Toca para cambiar plantilla
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#7C2D48] flex-shrink-0" />
          </button>
        </div>

        {/* Center: Desktop Primary Navigation (4 integrated spaces) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? "bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]"
                    : "text-[#4B5563] hover:text-[#111827]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Primary Run CTA + AURA AI + More Menu */}
        <div className="flex items-center gap-1.5 flex-shrink-0 relative">
          {isRunning ? (
            <button
              type="button"
              onClick={handleStopRun}
              className="h-9 md:h-9 px-3 rounded-lg bg-[#2F6F4E] hover:bg-[#25593E] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Detener</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlayRun}
              className="h-9 md:h-9 px-3 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Probar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(true)}
            className="h-9 px-2.5 md:px-3 rounded-lg bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Abrir Asistente AURA IA"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AURA IA</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWelcomeOpen(true)}
            className="h-9 px-2.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#4B5563] hover:text-[#7C2D48] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Guía paso a paso para empezar"
            aria-label="Guía paso a paso"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden lg:inline">Guía</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMoreMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#4B5563] flex items-center justify-center transition-colors cursor-pointer"
            title="Más opciones"
            aria-label="Más opciones"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMoreMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMoreMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 w-60 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-1.5 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsWelcomeOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#FDF2F5] flex items-center gap-2.5 font-semibold text-[#7C2D48] cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-[#7C2D48]" />
                  <span>Guía de Bienvenida (Paso a paso)</span>
                </button>
                <div className="my-1 border-t border-[#E2E8F0]" />
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenNewProject?.();
                  }}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5 font-medium text-[#111827] cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-[#7C2D48]" />
                  <span>Nuevo proyecto o plantilla</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsWebWizardOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#FDF2F5] flex items-center gap-2.5 font-semibold text-[#7C2D48] cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-[#7C2D48]" />
                  <span>Asistente de Páginas Web / Tienda</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenExport?.();
                  }}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5 font-medium text-[#111827] cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#2F6F4E]" />
                  <span>Exportar Web / Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsLexiconOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5 font-medium text-[#111827] cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-[#4B5563]" />
                  <span>Manual DIV Games</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenCloudSync?.();
                  }}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5 font-medium text-[#111827] cursor-pointer"
                >
                  <Cloud className="w-4 h-4 text-[#4B5563]" />
                  <span>Sincronización Nube</span>
                </button>
                <div className="my-1 border-t border-[#E2E8F0]" />
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenAiSettings();
                  }}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#F7F8FA] flex items-center gap-2.5 font-medium text-[#111827] cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[#4B5563]" />
                  <span>Ajustes de IA</span>
                </button>
                {onChangeResolution && (
                  <div className="px-3.5 py-2 border-t border-[#E2E8F0] mt-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                      Resolución de pantalla
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

      {/* ===================================================================== */}
      {/* MAIN INTEGRATED WORKSPACE BODY                                        */}
      {/* ===================================================================== */}
      <div className="flex-1 flex-grow min-h-0 w-full flex flex-col overflow-hidden relative">
        {/* 1. DISEÑAR (Mobile App Designer OR Classic Form Designer) */}
        {activeTab === "design" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Subheader mode switch */}
            <div className="px-3 py-2 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
              <div className="inline-flex bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setDesignMode("mobile")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                    designMode === "mobile"
                      ? "bg-white text-[#7C2D48] shadow-2xs"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
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
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                    designMode === "form"
                      ? "bg-white text-[#7C2D48] shadow-2xs"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Formulario</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsWebWizardOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] whitespace-nowrap"
                  title="Crear página web, tienda o landing paso a paso"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="sm:hidden">Web</span>
                  <span className="hidden sm:inline">Asistente Web</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("logic")}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#EEF6F1] hover:bg-[#DCEEE3] text-[#2F6F4E] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] whitespace-nowrap"
                >
                  <Blocks className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Editar Lógica</span>
                  <span className="sm:hidden">Lógica</span>
                </button>
              </div>
            </div>

            {designMode === "mobile" ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
                />
              </div>
            ) : (
              /* Integrated VB3 Form Designer (Zero floating windows!) */
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#F7F8FA]">
                {/* Mobile panel switcher for Form Mode */}
                <div className="flex lg:hidden border-b border-[#E2E8F0] bg-white px-2 py-1.5 gap-1 flex-shrink-0">
                  {[
                    { id: "canvas", label: "Lienzo", icon: Monitor },
                    { id: "toolbox", label: "Controles", icon: Plus },
                    { id: "properties", label: "Propiedades", icon: Sliders },
                  ].map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setVb3MobilePanel(p.id as any)}
                        className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                          vb3MobilePanel === p.id
                            ? "bg-[#7C2D48] text-white"
                            : "bg-[#F1F5F9] text-[#4B5563]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 min-h-0 flex overflow-hidden">
                  {/* Left: Controles (Toolbox) */}
                  <div
                    className={`${
                      vb3MobilePanel === "toolbox" ? "flex w-full" : "hidden"
                    } lg:flex lg:w-44 flex-col border-r border-[#E2E8F0] bg-white overflow-y-auto flex-shrink-0`}
                  >
                    <div className="px-2.5 py-2 border-b border-[#E2E8F0] text-[11px] font-bold text-[#4B5563] uppercase tracking-wider truncate">
                      Controles
                    </div>
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
                  </div>

                  {/* Center: Form Canvas */}
                  <div
                    ref={formViewportRef}
                    className={`${
                      vb3MobilePanel === "canvas" ? "flex" : "hidden"
                    } lg:flex flex-1 min-w-0 min-h-0 flex-col items-center justify-start p-3 sm:p-5 overflow-auto bg-[#F7F8FA]`}
                  >
                    <div className="w-full max-w-full flex flex-wrap items-center justify-between gap-2 mb-2.5 text-xs text-[#4B5563]">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-semibold truncate">
                          {activeTool === "pointer"
                            ? "Toca un control para moverlo o editarlo"
                            : `Toca el lienzo para colocar: ${activeTool}`}
                        </span>
                        {activeTool !== "pointer" && (
                          <button
                            type="button"
                            onClick={() => handleDoubleClickTool(activeTool)}
                            className="px-2.5 py-1 rounded-md bg-[#7C2D48] text-white font-semibold text-[11px] whitespace-nowrap cursor-pointer"
                          >
                            + Colocar en el centro
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Quick form dimension presets */}
                        <div className="inline-flex bg-white border border-[#E2E8F0] rounded-lg p-0.5 text-[11px]">
                          {[
                            { label: "Móvil", w: 360, h: 520 },
                            { label: "Escritorio", w: 540, h: 440 },
                            { label: "Amplio", w: 720, h: 500 },
                          ].map((preset) => {
                            const active = vb3Form.width === preset.w && vb3Form.height === preset.h;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() =>
                                  setVb3Form((prev) => ({
                                    ...prev,
                                    width: preset.w,
                                    height: preset.h,
                                  }))
                                }
                                className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                                  active ? "bg-[#7C2D48] text-white" : "text-[#4B5563] hover:bg-slate-100"
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setFormAutoFit((v) => !v)}
                          className="px-2 py-1 rounded-md bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[11px] font-semibold text-[#374151] cursor-pointer whitespace-nowrap"
                          title="Alternar entre ajustar a la pantalla o tamaño real 100%"
                        >
                          {formAutoFit ? `Zoom ${Math.round(formCanvasScale * 100)}%` : "100% Real"}
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
                            className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-sm overflow-auto max-w-full">
                      <div className="px-3 py-2 bg-[#7C2D48] text-white text-xs font-semibold flex items-center justify-between gap-2 min-w-0">
                        <span className="truncate min-w-0">{vb3Form.caption || vb3Form.name}</span>
                        <span className="text-[11px] opacity-85 font-mono flex-shrink-0 whitespace-nowrap">
                          {vb3Form.width}×{vb3Form.height} · {vb3Form.controls.length} ctrl
                        </span>
                      </div>
                      <div className="p-2 bg-[#E2E8F0]/50 flex justify-center overflow-auto">
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
                    </div>
                  </div>

                  {/* Right: Properties */}
                  <div
                    className={`${
                      vb3MobilePanel === "properties" ? "flex w-full" : "hidden"
                    } lg:flex lg:w-72 flex-col border-l border-[#E2E8F0] bg-white overflow-hidden flex-shrink-0`}
                  >
                    <div className="px-3 py-2 border-b border-[#E2E8F0] text-[11px] font-bold text-[#4B5563] uppercase tracking-wider flex items-center justify-between gap-2 min-w-0">
                      <span className="flex-shrink-0">Propiedades</span>
                      <span className="text-[11px] font-mono text-[#7C2D48] truncate min-w-0">
                        {selectedControl ? selectedControl.name : vb3Form.name}
                      </span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <PropertiesWindow
                        form={vb3Form}
                        selectedControl={selectedControl}
                        onSelectControl={setSelectedControlId}
                        onUpdateProperty={handleUpdateProperty}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. LÓGICA (Visual Blocks OR DIV Code Editor) */}
        {activeTab === "logic" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Unified Logic Mode Switcher */}
            <div className="px-3 py-2 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
              <div className="inline-flex bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setLogicMode("blocks")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                    logicMode === "blocks"
                      ? "bg-white text-[#7C2D48] shadow-2xs"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                >
                  <Blocks className="w-3.5 h-3.5" />
                  <span>Bloques Visuales</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogicMode("code")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                    logicMode === "code"
                      ? "bg-white text-[#7C2D48] shadow-2xs"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Código DIV</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsLexiconOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#F7F8FA] hover:bg-slate-100 text-[#4B5563] border border-[#E2E8F0] text-xs font-semibold flex items-center gap-1.5 cursor-pointer min-h-[36px]"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Manual DIV</span>
              </button>
            </div>

            {logicMode === "blocks" ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <AppInventorWorkspace
                  initialCode={code}
                  projectName={currentProjectName}
                  onChangeCode={onChangeCode}
                  onRunGame={handlePlayRun}
                  onSwitchToCodeEditor={() => setLogicMode("code")}
                  initialMode="blocks"
                  embeddedMode={true}
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-0 sm:p-2 bg-[#F7F8FA]">
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
              </div>
            )}
          </div>
        )}

        {/* 3. PROBAR (Full Responsive Game / HTML5 Stage) */}
        {activeTab === "play" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden sm:p-2 bg-[#F7F8FA]">
            <GameStage runtime={runtime} onRestart={onRestartGame} />
          </div>
        )}

        {/* 4. ESTUDIO (Integrated Resource & Tool Hub replacing 11 floating windows) */}
        {activeTab === "studio" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#F7F8FA]">
            {activeStudioTool && activeToolMeta ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="px-3 py-2 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveStudioTool(null)}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver al Estudio</span>
                  </button>
                  <div className="text-right min-w-0">
                    <div className="text-xs font-bold text-[#111827] truncate">
                      {activeToolMeta.title}
                    </div>
                    <div className="text-[11px] text-[#6B7280] truncate hidden sm:block">
                      {activeToolMeta.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col overflow-auto">
                  {activeStudioTool === "sprites" && (
                    <SpriteEditor fpg={fpg} onUpdateFpg={onUpdateFpg} />
                  )}
                  {activeStudioTool === "fpg" && (
                    <FpgEditor fpg={fpg} onUpdateFpg={onUpdateFpg} />
                  )}
                  {activeStudioTool === "map" && (
                    <MapEditor fpg={fpg} onUpdateFpg={onUpdateFpg} />
                  )}
                  {activeStudioTool === "fonts" && (
                    <FontEditor onInsertCode={onInsertCode} />
                  )}
                  {activeStudioTool === "palette" && (
                    <PaletteEditor onInsertCode={onInsertCode} />
                  )}
                  {activeStudioTool === "explosions" && (
                    <ExplosionCreator onAddExplosionFrames={onAddExplosionFrames} />
                  )}
                  {activeStudioTool === "mode8" && (
                    <Mode8LevelEditor onInsertCode={onInsertCode} />
                  )}
                  {activeStudioTool === "md2viewer" && (
                    <MD2Viewer
                      onInsertCode={onInsertCode}
                      onOpenInSpriteGenerator={(model) => {
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
                  {activeStudioTool === "sound" && (
                    <SoundEditor onInsertCode={onInsertCode} />
                  )}
                  {activeStudioTool === "processes" && (
                    <ProcessInspector runtime={runtime} />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="max-w-5xl mx-auto space-y-6 pb-8">
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#111827]">
                        Estudio de Recursos y Herramientas
                      </h2>
                      <p className="text-xs sm:text-sm text-[#4B5563] mt-0.5">
                        Todo integrado en un solo lugar, sin ventanas flotantes. Elige una herramienta para editar tus gráficos, audio o niveles 3D.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAiDrawerOpen(true)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Pedir ayuda a AURA IA</span>
                    </button>
                  </div>

                  {(["Gráficos", "3D y Niveles", "Audio y Sistema"] as const).map((cat) => (
                    <section key={cat} className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] px-1">
                        {cat}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {STUDIO_TOOLS.filter((t) => t.category === cat).map((tool) => {
                          const Icon = tool.icon;
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => setActiveStudioTool(tool.id)}
                              className="min-h-[76px] p-4 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#7C2D48]/50 hover:shadow-sm text-left flex items-start gap-3.5 transition-all cursor-pointer group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-[#FDF2F5] text-[#7C2D48] group-hover:bg-[#7C2D48] group-hover:text-white flex items-center justify-center flex-shrink-0 transition-colors">
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-[#111827] flex items-center justify-between">
                                  <span className="truncate">{tool.title}</span>
                                  <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#7C2D48] flex-shrink-0" />
                                </div>
                                <p className="text-xs text-[#4B5563] mt-0.5 line-clamp-2">
                                  {tool.subtitle}
                                </p>
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

      {/* ===================================================================== */}
      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (<= 56px + safe area)              */}
      {/* ===================================================================== */}
      <nav className="md:hidden bg-white border-t border-[#E2E8F0] grid grid-cols-4 h-14 pb-safe flex-shrink-0 z-30">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                active
                  ? "text-[#7C2D48] bg-[#FDF2F5]/60"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "stroke-[2.4]" : ""}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ===================================================================== */}
      {/* SLIDE-OVER AURA IA DRAWER                                             */}
      {/* ===================================================================== */}
      {isAiDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[2px]">
          <div
            className="flex-1 hidden sm:block"
            onClick={() => setIsAiDrawerOpen(false)}
          />
          <div className="w-full sm:w-[440px] h-full bg-white border-l border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FDF2F5] text-[#7C2D48] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">Asistente AURA IA</h3>
                  <p className="text-[11px] text-[#6B7280]">Genera juegos, apps o corrige tu código DIV</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiDrawerOpen(false)}
                className="w-10 h-10 rounded-lg hover:bg-slate-100 text-[#4B5563] flex items-center justify-center cursor-pointer"
                aria-label="Cerrar asistente IA"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <AiCopilot
                currentCode={code}
                fpg={fpg}
                onInsertCode={onInsertCode}
                onApplyCode={(newCode) => {
                  onApplyFullCode(newCode);
                }}
                onSwitchToEditor={() => {
                  setIsAiDrawerOpen(false);
                  setActiveTab("logic");
                  setLogicMode("code");
                }}
                onRunGame={() => {
                  setIsAiDrawerOpen(false);
                  handlePlayRun();
                }}
                onOpenAiSettings={onOpenAiSettings}
                initialPrompt={pendingAiPrompt}
                onConsumeInitialPrompt={() => setPendingAiPrompt(undefined)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* QUICK PRESETS / PROJECT SWITCHER DRAWER                               */}
      {/* ===================================================================== */}
      {isPresetsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl max-h-[88dvh] bg-white rounded-t-2xl sm:rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                  Cambiar Plantilla o Crear Proyecto
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Elige un proyecto listo para probar o empieza uno desde cero
                </p>
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
                        selected
                          ? "border-[#7C2D48] bg-[#FDF2F5]"
                          : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#111827] truncate">
                          {preset.name}
                        </span>
                        {selected && <Check className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />}
                      </div>
                      <div className="text-[11px] text-[#7C2D48] font-medium mt-0.5">
                        {preset.genre} · {preset.resolution}
                      </div>
                      <p className="text-xs text-[#4B5563] mt-1 line-clamp-2">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIV Games Lexicon Modal */}
      <DivLexiconModal
        isOpen={isLexiconOpen}
        onClose={() => setIsLexiconOpen(false)}
        onInsertSnippet={(snippet) => {
          onInsertCode(snippet);
          setIsLexiconOpen(false);
          setActiveTab("logic");
          setLogicMode("code");
        }}
      />

      {/* Interactive Beginner Welcome Guide */}
      <WelcomeGuideModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        onNavigateTab={(tab, options) => {
          setActiveTab(tab);
          if (options?.designMode) {
            if (options.designMode === "form" && forms.length === 0) {
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
            setDesignMode(options.designMode);
          }
          if (options?.logicMode) {
            setLogicMode(options.logicMode);
          }
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

      {/* Dedicated Website, Store & Landing Page Wizard */}
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
    </div>
  );
};
