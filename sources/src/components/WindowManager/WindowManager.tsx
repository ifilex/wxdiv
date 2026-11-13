import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Gamepad2,
  FileCode,
  Compass,
  Paintbrush,
  Volume2,
  Flame,
  Wand2,
  Sparkles,
  Cpu,
  Type,
  Package,
  FileImage,
  Palette as PaletteIcon,
  Box,
  LayoutGrid,
  Play,
  Pause,
  Square as StopSquare,
  FolderPlus,
  FolderOpen,
  Save,
  Scissors,
  Copy,
  Clipboard,
  Undo2,
  Redo2,
  Sliders,
  Terminal,
  Columns,
  Maximize2,
  Minimize2,
  ChevronDown,
  Layers,
  HelpCircle,
  FileText,
  Calculator,
  RotateCcw,
  Trash2,
  Globe,
  CheckSquare,
  CircleDot,
  Grid as GridIcon,
  BookOpen,
} from "lucide-react";
import { WindowConfig, WindowId, LayoutPresetType } from "./types";
import { WindowFrame } from "./WindowFrame";

// Child components
import { CodeEditor } from "../CodeEditor";
import { GameStage } from "../GameStage";
import { SpriteEditor } from "../SpriteEditor";
import { Mode8LevelEditor } from "../Mode8LevelEditor";
import { SoundEditor } from "../SoundEditor";
import { ExplosionCreator } from "../ExplosionCreator";
import { VisualLogicBuilder } from "../VisualLogicBuilder";
import { AppInventorWorkspace } from "../MitAppInventor/AppInventorWorkspace";
import { FormDesigner } from "../FormDesigner";
import { ToolboxWindow } from "../VB3/ToolboxWindow";
import { PropertiesWindow } from "../VB3/PropertiesWindow";
import { ProjectWindow } from "../VB3/ProjectWindow";
import { FormCanvas } from "../VB3/FormCanvas";
import { VB3Form, VB3Control, VB3ToolType } from "../VB3/types";
import { generateDivCodeFromVB3, executeVB3FormInRuntime, executeVB3FormInHtml5 } from "../../utils/vb3CodeGenerator";
import { getPresetFormDefinition } from "../../engine/presetForms";
import { AiCopilot } from "../AiCopilot";
import { ProcessInspector } from "../ProcessInspector";
import { FontEditor } from "../FontEditor";
import { FpgEditor } from "../FpgEditor";
import { MapEditor } from "../MapEditor";
import { PaletteEditor } from "../PaletteEditor";
import { MD2Viewer } from "../MD2Viewer";
import { SpriteGenerator } from "../SpriteGenerator";
import { ParsedMD2Model } from "../../engine/md2Parser";
import { DivLexiconModal } from "../DivLexiconModal";

import { DivRuntime } from "../../engine/runtime";
import { DivGraphic, DivProcess } from "../../types";
import { GamePreset, PRESETS } from "../../engine/presets";
import { APP_TEMPLATES } from "../../engine/appTemplates";
import { IdeThemeModal } from "../IdeThemeModal";
import {
  IdeThemeConfig,
  loadIdeTheme,
  saveIdeTheme,
} from "../../engine/ideTheme";

interface WindowManagerProps {
  runtime: DivRuntime;
  code: string;
  onChangeCode: (newCode: string) => void;
  onRunGame: () => void;
  onRestartGame: () => void;
  fpg: DivGraphic[];
  onUpdateFpg: (newFpg: DivGraphic[]) => void;
  onAddExplosionFrames: (frames: DivGraphic[]) => void;
  onInsertCode: (snippet: string) => void;
  onApplyFullCode: (fullCode: string) => void;
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
}

export const WindowManager: React.FC<WindowManagerProps> = ({
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
  activeProcesses,
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
  onQuickExportZip,
  onOpenCloudSync,
}) => {
  const desktopRef = useRef<HTMLDivElement>(null);
  const [desktopBounds, setDesktopBounds] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 700,
  });

  const [topZIndex, setTopZIndex] = useState(15);
  const [activeWindowId, setActiveWindowId] = useState<WindowId | null>("visual");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Runtime running state for Visual MDI engine toolbar
  const [isRunning, setIsRunning] = useState(false);

  // Official DIV Games Studio & Visual MDI engine Lexicon Modal
  const [isLexiconOpen, setIsLexiconOpen] = useState(false);

  // IDE Theme customization
  const [themeConfig, setThemeConfig] = useState<IdeThemeConfig>(loadIdeTheme);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Model passed from 3D MD2 viewer to 3D Sprite Generator
  const [generatorModel, setGeneratorModel] = useState<ParsedMD2Model | undefined>(undefined);

  // Quick Pre-code AI Assistant modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Current project name
  const currentProjectName = useMemo(() => {
    if (projectTitle) return projectTitle;
    const p = PRESETS.find((pr) => pr.id === currentPresetId);
    return p ? p.name : "Proyecto_WXDIV";
  }, [currentPresetId, projectTitle]);

  // Visual MDI engine State (Multi-form Gestalt Architecture)
  const isCurrentPresetApp = Boolean(
    currentPresetId?.startsWith("app_") ||
    currentPresetId?.startsWith("web_") ||
    currentPresetId === "game_arcade_canvas"
  );

  const initialFormDefinition = useMemo<VB3Form | null>(() => {
    if (!isCurrentPresetApp) return null;
    return getPresetFormDefinition(currentPresetId) || null;
  }, [currentPresetId, isCurrentPresetApp]);

  const [forms, setForms] = useState<VB3Form[]>(() => {
    if (!isCurrentPresetApp) return [];
    const f = getPresetFormDefinition(currentPresetId);
    return f ? [f] : [];
  });
  const [activeFormId, setActiveFormId] = useState<string>(() => {
    return forms[0]?.id || "";
  });

  const vb3Form = useMemo(() => {
    const found = forms.find((f) => f.id === activeFormId) || forms[0];
    if (found) return found;
    if (initialFormDefinition) return initialFormDefinition;
    return {
      id: "form1",
      name: "Form1",
      caption: "Form1",
      backColor: "#c0c0c0",
      width: 640,
      height: 480,
      controls: [],
    };
  }, [forms, activeFormId, initialFormDefinition]);

  const setVb3Form = useCallback(
    (updater: VB3Form | ((prev: VB3Form) => VB3Form)) => {
      setForms((prevForms) => {
        const cur = prevForms.find((f) => f.id === activeFormId) || prevForms[0];
        if (!cur) return prevForms;
        const updated = typeof updater === "function" ? updater(cur) : updater;
        return prevForms.map((f) => (f.id === cur.id ? updated : f));
      });
    },
    [activeFormId]
  );

  const [activeTool, setActiveTool] = useState<VB3ToolType>("pointer");
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [codeTargetSymbol, setCodeTargetSymbol] = useState<{
    object: string;
    procedure: string;
    timestamp: number;
  } | null>(null);
  const [toolbarCoords, setToolbarCoords] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 560,
    h: 440,
  });

  const selectedControl = useMemo(() => {
    return vb3Form.controls.find((c) => c.id === selectedControlId) || null;
  }, [vb3Form.controls, selectedControlId]);

  // Sync source code mapping in runtime for breakpoint resolution
  useEffect(() => {
    if (runtime && typeof runtime.updateSourceCode === "function") {
      runtime.updateSourceCode(code);
    }
  }, [code, runtime]);

  // When execution hits a breakpoint, ensure Code Editor and Process Debugger are visible
  useEffect(() => {
    if (!runtime) return;

    const handleBreakpointHit = () => {
      setWindows((curr) => ({
        ...curr,
        code: { ...curr.code, isOpen: true, isMinimized: false },
        processes: { ...curr.processes, isOpen: true, isMinimized: false },
      }));
    };

    const unsub = runtime.addBreakpointHitListener(handleBreakpointHit);
    return () => {
      unsub();
    };
  }, [runtime]);

  // Form Management Handlers (Explorador de Proyectos: Crear, Eliminar, Renombrar)
  const handleSelectForm = useCallback((formId: string) => {
    setActiveFormId(formId);
    setSelectedControlId(null);
    const target = forms.find((f) => f.id === formId);
    if (target) {
      setWindows((curr) => ({
        ...curr,
        designer: {
          ...curr.designer,
          isOpen: true,
          title: `${target.name}.frm`,
        },
      }));
      setActiveWindowId("designer");
    }
  }, [forms]);

  const handleAddNewForm = useCallback(() => {
    const num = forms.length + 1;
    const newFormId = `form_${Date.now()}`;
    const newForm: VB3Form = {
      id: newFormId,
      name: `Form${num}`,
      caption: `Formulario ${num}`,
      backColor: "#c0c0c0",
      width: 560,
      height: 440,
      controls: [],
    };
    setForms((prev) => [...prev, newForm]);
    setActiveFormId(newFormId);
    setSelectedControlId(null);
    setWindows((curr) => ({
      ...curr,
      designer: {
        ...curr.designer,
        isOpen: true,
        isMinimized: false,
        title: `${newForm.name}.frm`,
      },
      toolbox: { ...curr.toolbox, isOpen: true },
      properties: { ...curr.properties, isOpen: true },
      project: { ...curr.project, isOpen: true },
    }));
    setActiveWindowId("designer");
    setTimeout(() => {
      onChangeCode(generateDivCodeFromVB3(newForm));
    }, 0);
  }, [forms.length, onChangeCode]);

  const handleDeleteForm = useCallback((formId: string) => {
    setForms((prev) => {
      const remaining = prev.filter((f) => f.id !== formId);
      if (remaining.length > 0) {
        const nextActive = remaining[0];
        setActiveFormId(nextActive.id);
        setSelectedControlId(null);
        setWindows((curr) => ({
          ...curr,
          designer: { ...curr.designer, title: `${nextActive.name}.frm`, isOpen: true },
        }));
        setTimeout(() => {
          onChangeCode(generateDivCodeFromVB3(nextActive));
        }, 0);
        return remaining;
      } else {
        // Clean fresh form if all deleted
        const freshForm: VB3Form = {
          id: `form_${Date.now()}`,
          name: "Form1",
          caption: "Form1",
          backColor: "#c0c0c0",
          width: 640,
          height: 480,
          controls: [],
        };
        setActiveFormId(freshForm.id);
        setSelectedControlId(null);
        setWindows((curr) => ({
          ...curr,
          designer: { ...curr.designer, title: "Form1.frm", isOpen: true },
        }));
        setTimeout(() => {
          onChangeCode(generateDivCodeFromVB3(freshForm));
        }, 0);
        return [freshForm];
      }
    });
  }, [onChangeCode]);

  const handleRenameForm = useCallback((formId: string, newName: string, newCaption: string) => {
    setForms((prev) =>
      prev.map((f) => {
        if (f.id !== formId) return f;
        const updated = { ...f, name: newName, caption: newCaption };
        if (f.id === activeFormId) {
          setWindows((curr) => ({
            ...curr,
            designer: { ...curr.designer, title: `${newName}.frm` },
          }));
          setTimeout(() => {
            onChangeCode(generateDivCodeFromVB3(updated));
          }, 0);
        }
        return updated;
      })
    );
  }, [activeFormId, onChangeCode]);

  // Initial Window Configuration - Visual MDI engine Architecture
  const [windows, setWindows] = useState<Record<WindowId, WindowConfig>>({
    toolbox: {
      id: "toolbox",
      title: "Toolbox",
      subtitle: "Barra de Herramientas Visual MDI",
      category: "tools",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 5,
      x: 8,
      y: 8,
      width: 86,
      height: 500,
      minWidth: 80,
      minHeight: 280,
    },
    designer: {
      id: "designer",
      title: "Form1.frm",
      subtitle: "Formulario Visual MDI",
      category: "core",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 6,
      x: 102,
      y: 8,
      width: 560,
      height: 440,
      minWidth: 320,
      minHeight: 240,
    },
    properties: {
      id: "properties",
      title: "Properties",
      subtitle: "Propiedades",
      category: "tools",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 7,
      x: 672,
      y: 8,
      width: 270,
      height: 420,
      minWidth: 200,
      minHeight: 180,
    },
    project: {
      id: "project",
      title: "Project1.mak",
      subtitle: "Proyecto",
      category: "core",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 8,
      x: 672,
      y: 436,
      width: 270,
      height: 180,
      minWidth: 200,
      minHeight: 140,
    },
    code: {
      id: "code",
      title: "programa.prg",
      subtitle: "Editor Integrado • Entorno DIV Vacío",
      category: "core",
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 15,
      x: 24,
      y: 16,
      width: 820,
      height: 560,
      minWidth: 420,
      minHeight: 300,
    },
    game: {
      id: "game",
      title: "Ejecución - WXDIV [En ejecución]",
      subtitle: "Canvas 2D • 60 FPS • UI Reactiva",
      category: "core",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 9,
      x: 180,
      y: 20,
      width: 640,
      height: 500,
      minWidth: 380,
      minHeight: 320,
    },
    processes: {
      id: "processes",
      title: "Debugger de Procesos DIV",
      subtitle: "Variables internas, X, Y y Estado en tiempo real",
      category: "tools",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 12,
      x: 18,
      y: 340,
      width: 780,
      height: 420,
      minWidth: 440,
      minHeight: 240,
    },
    ai: {
      id: "ai",
      title: "AURA IA",
      subtitle: "Copiloto & Asistente Inteligente",
      category: "tools",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 6,
      x: 360,
      y: 20,
      width: 480,
      height: 580,
      minWidth: 380,
      minHeight: 350,
    },
    fpg: {
      id: "fpg",
      title: "Gestor de Paquetes FPG",
      subtitle: "Librería de Sprites & Assets DIV",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 45,
      y: 35,
      width: 900,
      height: 630,
      minWidth: 520,
      minHeight: 400,
    },
    sprites: {
      id: "sprites",
      title: "Editor de Pixel Art & Sprites",
      subtitle: "Herramientas de Dibujo y Puntos CPoint",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 55,
      y: 40,
      width: 840,
      height: 620,
      minWidth: 480,
      minHeight: 360,
    },
    sound: {
      id: "sound",
      title: "Sintetizador de Sonidos ADSR",
      subtitle: "Generador de Ondas y Efectos de Audio",
      category: "audio",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 70,
      y: 45,
      width: 780,
      height: 580,
      minWidth: 440,
      minHeight: 350,
    },
    mode8: {
      id: "mode8",
      title: "Editor de Niveles Modo 8 3D",
      subtitle: "Raycaster y Sectores DIV",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 40,
      y: 30,
      width: 860,
      height: 620,
      minWidth: 500,
      minHeight: 380,
    },
    palette: {
      id: "palette",
      title: "Gestor de Paletas (.PAL)",
      subtitle: "256 Colores VGA y Degradados",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 80,
      y: 50,
      width: 860,
      height: 620,
      minWidth: 520,
      minHeight: 400,
    },
    map: {
      id: "map",
      title: "Editor de Gráficos .MAP",
      subtitle: "Mapas y Fondos Individuales",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 65,
      y: 40,
      width: 880,
      height: 620,
      minWidth: 520,
      minHeight: 380,
    },
    fonts: {
      id: "fonts",
      title: "Editor de Fuentes FNT",
      subtitle: "Tipografía Bitmap DIV",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 70,
      y: 45,
      width: 860,
      height: 620,
      minWidth: 520,
      minHeight: 400,
    },
    explosions: {
      id: "explosions",
      title: "Creador de Explosiones",
      subtitle: "Partículas Procedimentales",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 3,
      x: 100,
      y: 60,
      width: 760,
      height: 580,
      minWidth: 440,
      minHeight: 360,
    },
    visual: {
      id: "visual",
      title: "MIT App Inventor & Diseñador Móvil",
      subtitle: "Diseñador WebApp Celular y Bloques DIV",
      category: "core",
      isOpen: true,
      isMinimized: false,
      isMaximized: true,
      zIndex: 10,
      x: 10,
      y: 10,
      width: 1080,
      height: 720,
      minWidth: 360,
      minHeight: 480,
    },
    md2viewer: {
      id: "md2viewer",
      title: "Visor de Modelos 3D MD2",
      subtitle: "Mallas Poligonales y Animación",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 75,
      y: 45,
      width: 900,
      height: 640,
      minWidth: 540,
      minHeight: 400,
    },
    spritegenerator: {
      id: "spritegenerator",
      title: "Generador de Sprites desde 3D",
      subtitle: "Rasterizador a FPG estilo DIV 2",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 95,
      y: 55,
      width: 860,
      height: 620,
      minWidth: 520,
      minHeight: 400,
    },
  });

  // Track Desktop workspace size via ResizeObserver
  useEffect(() => {
    if (!desktopRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDesktopBounds((prev) => {
            if (prev.width === width && prev.height === height) return prev;
            return { width, height };
          });
        }
      }
    });
    observer.observe(desktopRef.current);
    return () => observer.disconnect();
  }, []);

  // Initial responsive layout alignment to avoid off-screen or cut-off windows
  const isInitialLayoutDoneRef = useRef(false);
  useEffect(() => {
    if (isInitialLayoutDoneRef.current) return;
    if (desktopBounds.width < 320 || desktopBounds.height < 240) return;
    isInitialLayoutDoneRef.current = true;

    const dw = desktopBounds.width;
    const dh = desktopBounds.height;
    const margin = 8;
    const usableW = Math.max(400, dw - margin * 2);
    const usableH = Math.max(300, dh - margin * 2);

    const isFormMode = forms.length > 0 && Boolean(activeFormId);

    setWindows((curr) => {
      const next = { ...curr };
      if (isFormMode) {
        const tbW = 86;
        const propW = Math.min(270, Math.max(200, Math.floor(usableW * 0.26)));
        const formW = Math.max(300, usableW - tbW - propW - margin * 3);

        next.toolbox = {
          ...next.toolbox,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          x: margin,
          y: margin,
          width: tbW,
          height: Math.min(520, usableH),
          zIndex: 12,
        };
        next.designer = {
          ...next.designer,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          x: margin + tbW + margin,
          y: margin,
          width: formW,
          height: usableH,
          zIndex: 10,
        };
        next.properties = {
          ...next.properties,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          x: margin + tbW + margin + formW + margin,
          y: margin,
          width: propW,
          height: Math.floor(usableH * 0.60),
          zIndex: 11,
        };
        next.project = {
          ...next.project,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          x: margin + tbW + margin + formW + margin,
          y: margin + Math.floor(usableH * 0.60) + margin,
          width: propW,
          height: usableH - Math.floor(usableH * 0.60) - margin,
          zIndex: 9,
        };
      } else if (!next.visual?.isOpen) {
        const halfW = Math.floor((usableW - margin) / 2);
        next.code = {
          ...next.code,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          x: margin,
          y: margin,
          width: halfW,
          height: usableH,
          zIndex: 10,
        };
        next.game = {
          ...next.game,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          x: margin + halfW + margin,
          y: margin,
          width: usableW - halfW - margin,
          height: usableH,
          zIndex: 11,
        };
      } else {
        // App Inventor Visual mode: maximize visual window to full desktop space
        next.visual = {
          ...next.visual,
          isOpen: true,
          isMinimized: false,
          isMaximized: true,
          x: margin,
          y: margin,
          width: usableW,
          height: usableH,
          zIndex: 15,
        };
      }
      return next;
    });
  }, [desktopBounds, forms.length, activeFormId]);

  // Sync isRunning with runtime
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRunning((prev) => (prev !== runtime.isRunning ? runtime.isRunning : prev));
    }, 300);
    return () => clearInterval(interval);
  }, [runtime]);

  // Close menus on click outside
  useEffect(() => {
    if (!activeMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".vb-menu-root")) {
        setActiveMenu(null);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [activeMenu]);

  // Window Focus & Bring to front - Visual MDI engine Window Layering
  const bringToFront = useCallback((id: WindowId) => {
    setWindows((curr) => {
      const highestZ = Math.max(
        ...(Object.values(curr) as WindowConfig[]).map((w) => w.zIndex || 0),
        15
      );
      const nextZ = highestZ + 1;
      return {
        ...curr,
        [id]: {
          ...curr[id],
          zIndex: nextZ,
        },
      };
    });
    setActiveWindowId(id);
  }, []);

  const handleFocusWindow = useCallback((id: WindowId) => {
    bringToFront(id);
  }, [bringToFront]);

  // Surface and focus conversational AI as a floating window without altering other windows
  const handleOpenAiFloatingWindow = useCallback(() => {
    setWindows((curr) => {
      const highestZ = Math.max(
        ...(Object.values(curr) as WindowConfig[]).map((w) => w.zIndex || 0),
        15
      );
      const dw = desktopBounds.width || 1024;
      const dh = desktopBounds.height || 600;
      const idealW = Math.min(480, Math.max(380, Math.floor(dw * 0.40)));
      const idealH = Math.min(600, Math.max(450, dh - 40));
      const idealX = Math.max(16, dw - idealW - 20);
      const idealY = 16;

      const aiWin = curr.ai;
      const isAlreadyOpen = aiWin.isOpen && !aiWin.isMinimized;
      const safeX = isAlreadyOpen && aiWin.x > 0 ? Math.min(aiWin.x, dw - 100) : idealX;
      const safeY = isAlreadyOpen && aiWin.y > 0 ? Math.min(aiWin.y, dh - 80) : idealY;
      const safeW = isAlreadyOpen && aiWin.width > 300 ? aiWin.width : idealW;
      const safeH = isAlreadyOpen && aiWin.height > 300 ? aiWin.height : idealH;

      return {
        ...curr,
        ai: {
          ...aiWin,
          isOpen: true,
          isMinimized: false,
          zIndex: highestZ + 1,
          x: safeX,
          y: safeY,
          width: safeW,
          height: safeH,
        },
      };
    });
    setActiveWindowId("ai");
  }, [desktopBounds]);

  const handleOpenAndFocusWindow = useCallback((id: WindowId) => {
    if (id === "ai") {
      handleOpenAiFloatingWindow();
      return;
    }
    setWindows((curr) => {
      const highestZ = Math.max(
        ...(Object.values(curr) as WindowConfig[]).map((w) => w.zIndex || 0),
        15
      );
      const nextZ = highestZ + 1;
      return {
        ...curr,
        [id]: {
          ...curr[id],
          isOpen: true,
          isMinimized: false,
          zIndex: nextZ,
        },
      };
    });
    setActiveWindowId(id);
  }, [handleOpenAiFloatingWindow]);

  const handleCloseWindow = useCallback((id: WindowId) => {
    setWindows((curr) => ({
      ...curr,
      [id]: {
        ...curr[id],
        isOpen: false,
        isMinimized: false,
      },
    }));
    setActiveWindowId((prev) => (prev === id ? null : prev));
  }, []);

  const handleMinimizeWindow = useCallback((id: WindowId) => {
    setWindows((curr) => ({
      ...curr,
      [id]: {
        ...curr[id],
        isMinimized: true,
      },
    }));
    setActiveWindowId((prev) => (prev === id ? null : prev));
  }, []);

  const handleToggleMaximize = useCallback((id: WindowId) => {
    setWindows((curr) => {
      const win = curr[id];
      if (win.isMaximized) {
        const restoredW = Math.min(win.prevBounds?.width ?? 640, desktopBounds.width);
        const restoredH = Math.min(win.prevBounds?.height ?? 500, desktopBounds.height);
        const safeX = Math.max(0, Math.min(win.prevBounds?.x ?? 20, desktopBounds.width - 100));
        const safeY = Math.max(0, Math.min(win.prevBounds?.y ?? 20, desktopBounds.height - 40));
        return {
          ...curr,
          [id]: {
            ...win,
            isMaximized: false,
            x: safeX,
            y: safeY,
            width: restoredW,
            height: restoredH,
          },
        };
      } else {
        return {
          ...curr,
          [id]: {
            ...win,
            isMaximized: true,
            prevBounds: {
              x: win.x,
              y: win.y,
              width: win.width,
              height: win.height,
            },
          },
        };
      }
    });
    bringToFront(id);
  }, [desktopBounds, bringToFront]);

  const handleUpdateBounds = useCallback(
    (id: WindowId, bounds: { x: number; y: number; width: number; height: number }) => {
      setWindows((curr) => {
        const dw = desktopBounds.width || 1024;
        const dh = desktopBounds.height || 600;
        const safeX = Math.max(0, Math.min(bounds.x, dw - 80));
        const safeY = Math.max(0, Math.min(bounds.y, dh - 50));
        return {
          ...curr,
          [id]: {
            ...curr[id],
            x: safeX,
            y: safeY,
            width: Math.max(bounds.width, curr[id].minWidth || 100),
            height: Math.max(bounds.height, curr[id].minHeight || 80),
          },
        };
      });
    },
    [desktopBounds]
  );

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".vb-menu-root")) {
        setActiveMenu(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Execution Handlers (F5 Play / Stop)
  const handlePlayRun = useCallback(() => {
    runtime.stop();
    runtime.reset();
    runtime.loadFPG(fpg);

    const isLandingOrWeb = Boolean(
      currentPresetId.startsWith("web_") ||
      currentPresetId.includes("landing") ||
      code.toLowerCase().includes("draw_landing_page") ||
      code.toLowerCase().includes("web_page") ||
      code.toLowerCase().includes("web_hero") ||
      code.toLowerCase().includes("web_navbar") ||
      code.toLowerCase().includes("navbar(") ||
      code.toLowerCase().includes("hero(")
    );

    const isFormApp = Boolean(
      !isLandingOrWeb &&
      forms.length > 0 &&
      Boolean(activeFormId)
    );

    if (isFormApp && vb3Form) {
      executeVB3FormInHtml5(runtime, vb3Form);
    } else if (onRunGame) {
      onRunGame();
    } else {
      const target = PRESETS.find((p) => p.id === currentPresetId);
      if (target) {
        target.setupRuntime(runtime);
      }
    }
    if (!runtime.isHtml5Mode) {
      runtime.start();
    }
    setIsRunning(true);
    handleOpenAndFocusWindow("game");
  }, [runtime, vb3Form, forms.length, currentPresetId, activeFormId, onRunGame, fpg, code, handleOpenAndFocusWindow]);

  const handleStopRun = useCallback(() => {
    runtime.stop();
    setIsRunning(false);
    const isLandingOrWeb = Boolean(
      currentPresetId.startsWith("web_") ||
      currentPresetId.includes("landing") ||
      code.toLowerCase().includes("draw_landing_page") ||
      code.toLowerCase().includes("web_page") ||
      code.toLowerCase().includes("web_hero") ||
      code.toLowerCase().includes("web_navbar") ||
      code.toLowerCase().includes("navbar(") ||
      code.toLowerCase().includes("hero(")
    );
    const isFormApp = Boolean(
      !isLandingOrWeb &&
      forms.length > 0 &&
      Boolean(activeFormId)
    );
    handleFocusWindow(isFormApp ? "designer" : "code");
  }, [forms.length, activeFormId, currentPresetId, code, handleFocusWindow]);

  // Coordinates updater with value comparison to avoid redundant renders
  const handleUpdateCoordinates = useCallback((x: number, y: number, w: number, h: number) => {
    setToolbarCoords((prev) => {
      if (prev.x === x && prev.y === y && prev.w === w && prev.h === h) return prev;
      return { x, y, w, h };
    });
  }, []);

  // Visual MDI engine Control & Form Handlers
  const handleAddControl = useCallback(
    (newCtrl: VB3Control) => {
      setVb3Form((prev) => {
        const updated = {
          ...prev,
          controls: [...prev.controls, newCtrl],
        };
        setTimeout(() => {
          onChangeCode(generateDivCodeFromVB3(updated));
        }, 0);
        return updated;
      });
      setSelectedControlId(newCtrl.id);
      setActiveTool("pointer");
      handleUpdateCoordinates(newCtrl.x, newCtrl.y, newCtrl.width, newCtrl.height);
    },
    [onChangeCode, handleUpdateCoordinates]
  );

  const handleUpdateControlBounds = useCallback(
    (id: string, bounds: { x: number; y: number; width: number; height: number }) => {
      setVb3Form((prev) => {
        const updated = {
          ...prev,
          controls: prev.controls.map((c) => (c.id === id ? { ...c, ...bounds } : c)),
        };
        return updated;
      });
      handleUpdateCoordinates(bounds.x, bounds.y, bounds.width, bounds.height);
    },
    [handleUpdateCoordinates]
  );

  const handleUpdateProperty = useCallback(
    (propName: string, value: any) => {
      setVb3Form((prev) => {
        let updated: VB3Form;
        if (!selectedControlId) {
          // Form properties
          if (propName === "Caption") updated = { ...prev, caption: value };
          else if (propName === "Name") updated = { ...prev, name: value };
          else if (propName === "BackColor") updated = { ...prev, backColor: value };
          else if (propName === "FontName") updated = { ...prev, fontName: value };
          else if (propName === "Width") updated = { ...prev, width: Number(value) || prev.width };
          else if (propName === "Height") updated = { ...prev, height: Number(value) || prev.height };
          else updated = prev;
        } else {
          // Control properties
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
        setTimeout(() => {
          onChangeCode(generateDivCodeFromVB3(updated));
        }, 0);
        return updated;
      });
    },
    [selectedControlId, onChangeCode]
  );

  const handleSelectControl = useCallback(
    (id: string | null) => {
      setSelectedControlId(id);
      if (id) {
        const c = vb3Form.controls.find((ctrl) => ctrl.id === id);
        if (c) {
          handleUpdateCoordinates(c.x, c.y, c.width, c.height);
        }
      } else {
        handleUpdateCoordinates(0, 0, vb3Form.width, vb3Form.height);
      }

      // Single touch / click on any control or the form immediately surfaces Properties window to the front
      setWindows((curr) => {
        const highestZ = Math.max(...(Object.values(curr) as WindowConfig[]).map((w) => w.zIndex), 10);
        return {
          ...curr,
          properties: {
            ...curr.properties,
            isOpen: true,
            isMinimized: false,
            zIndex: Math.max(curr.properties.zIndex, highestZ + 1),
          },
        };
      });
    },
    [vb3Form, handleUpdateCoordinates]
  );

  const handleResetTool = useCallback(() => {
    setActiveTool("pointer");
  }, []);

  const handleDoubleClickControl = useCallback(
    (control: VB3Control) => {
      let eventType = "Click";
      if (control.type === "textbox") eventType = "Change";
      else if (control.type === "timer") eventType = "Timer";
      else if (control.type === "picturebox") eventType = "Paint";
      else if (control.type === "hscrollbar" || control.type === "vscrollbar") eventType = "Change";
      else if (control.type === "checkbox" || control.type === "optionbutton") eventType = "Click";
      else eventType = "Click";

      const procName = `${control.name.toLowerCase()}_${eventType.toLowerCase()}`;

      // Check if procedure is in code; if not, append it cleanly
      if (!code.toLowerCase().includes(`process ${procName.toLowerCase()}`)) {
        const snippet = `\n// --- Evento ${eventType} de ${control.name} (Visual MDI) ---\nPROCESS ${procName}()\nBEGIN\n    // Código al interactuar con ${control.name}\n    write(0, 20, 440, 0, "Evento ${eventType}: ${control.name}");\nEND\n`;
        onChangeCode(code + "\n" + snippet);
      }

      // Signal CodeEditor to navigate to this symbol
      setCodeTargetSymbol({
        object: control.name,
        procedure: eventType,
        timestamp: Date.now(),
      });

      // Open and focus Code window without closing designer, toolbox, or properties!
      // NEVER open canvas or game!
      setWindows((curr) => {
        const highestZ = Math.max(
          ...(Object.values(curr) as WindowConfig[]).map((w) => w.zIndex || 0),
          15
        );
        const dw = desktopBounds.width || 1024;
        const dh = desktopBounds.height || 600;
        const margin = 8;
        const usableW = Math.max(400, dw - margin * 2);
        const usableH = Math.max(300, dh - margin * 2);

        return {
          ...curr,
          code: {
            ...curr.code,
            isOpen: true,
            isMinimized: false,
            title: `${vb3Form.name}.frm [Código]`,
            x: Math.min(curr.code.x, Math.max(margin, Math.floor(usableW * 0.1))),
            y: Math.min(curr.code.y, margin + 20),
            width: Math.max(520, Math.floor(usableW * 0.65)),
            height: Math.max(380, Math.floor(usableH * 0.82)),
            zIndex: highestZ + 1,
          },
          game: {
            ...curr.game,
            isOpen: false, // Ensure game canvas is NOT open
          },
        };
      });
      setActiveWindowId("code");
    },
    [code, onChangeCode, vb3Form.name, desktopBounds]
  );

  const handleDoubleClickForm = useCallback(() => {
    const eventType = "Load";
    const formObjName = vb3Form.name;
    const procName = `${formObjName.toLowerCase()}_load`;

    if (!code.toLowerCase().includes(`process ${procName.toLowerCase()}`)) {
      const snippet = `\n// --- Evento Load de ${formObjName} (Visual MDI) ---\nPROCESS ${procName}()\nBEGIN\n    // Inicialización del formulario\n    write(0, 10, 460, 0, "${vb3Form.caption || formObjName} inicializado.");\nEND\n`;
      onChangeCode(code + "\n" + snippet);
    }

    setCodeTargetSymbol({
      object: formObjName,
      procedure: eventType,
      timestamp: Date.now(),
    });

    setWindows((curr) => {
      const highestZ = Math.max(
        ...(Object.values(curr) as WindowConfig[]).map((w) => w.zIndex || 0),
        15
      );
      const dw = desktopBounds.width || 1024;
      const dh = desktopBounds.height || 600;
      const margin = 8;
      const usableW = Math.max(400, dw - margin * 2);
      const usableH = Math.max(300, dh - margin * 2);

      return {
        ...curr,
        code: {
          ...curr.code,
          isOpen: true,
          isMinimized: false,
          title: `${vb3Form.name}.frm [Código]`,
          x: Math.min(curr.code.x, Math.max(margin, Math.floor(usableW * 0.1))),
          y: Math.min(curr.code.y, margin + 20),
          width: Math.max(520, Math.floor(usableW * 0.65)),
          height: Math.max(380, Math.floor(usableH * 0.82)),
          zIndex: highestZ + 1,
        },
        game: {
          ...curr.game,
          isOpen: false,
        },
      };
    });
    setActiveWindowId("code");
  }, [code, onChangeCode, vb3Form.name, vb3Form.caption, desktopBounds]);

  const handleDoubleClickTool = useCallback(
    (tool: VB3ToolType) => {
      const count = vb3Form.controls.filter((c) => c.type === tool).length + 1;
      const namePrefix =
        tool === "commandbutton"
          ? "Command"
          : tool === "textbox"
          ? "Text"
          : tool === "label"
          ? "Label"
          : tool.charAt(0).toUpperCase() + tool.slice(1);

      const newCtrl: VB3Control = {
        id: `ctrl_${Date.now()}`,
        name: `${namePrefix}${count}`,
        type: tool,
        x: Math.round((vb3Form.width / 2 - 50) / 8) * 8,
        y: Math.round((vb3Form.height / 2 - 16) / 8) * 8,
        width: tool === "commandbutton" ? 104 : tool === "textbox" ? 160 : tool === "picturebox" ? 180 : 120,
        height: tool === "commandbutton" ? 32 : tool === "textbox" ? 24 : tool === "picturebox" ? 120 : 24,
        caption: `${namePrefix}${count}`,
        text: tool === "textbox" ? `${namePrefix}${count}` : undefined,
        enabled: true,
        visible: true,
      };
      handleAddControl(newCtrl);
    },
    [vb3Form.width, vb3Form.height, vb3Form.controls, handleAddControl]
  );

  // Layout Presets (Visual MDI engine)
  const handleApplyLayoutPreset = useCallback(
    (preset: LayoutPresetType) => {
      const dw = desktopBounds.width;
      const dh = desktopBounds.height;
      const margin = 8;
      const usableW = Math.max(400, dw - margin * 2);
      const usableH = Math.max(300, dh - margin * 2);

      setWindows((curr) => {
        const next = { ...curr };
        (Object.keys(next) as WindowId[]).forEach((id) => {
          next[id] = { ...next[id], isMaximized: false };
        });

        if (preset === "vb5-classic" || preset === "designer-delphi") {
          const tbW = 86;
          const propW = Math.min(270, Math.floor(usableW * 0.28));
          const formW = Math.max(300, usableW - tbW - propW - margin * 3);

          next.toolbox = {
            ...next.toolbox,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin,
            width: tbW,
            height: Math.min(500, usableH),
            zIndex: 12,
          };
          next.designer = {
            ...next.designer,
            isOpen: true,
            isMinimized: false,
            x: margin + tbW + margin,
            y: margin,
            width: formW,
            height: usableH,
            zIndex: 10,
          };
          next.properties = {
            ...next.properties,
            isOpen: true,
            isMinimized: false,
            x: margin + tbW + margin + formW + margin,
            y: margin,
            width: propW,
            height: Math.floor(usableH * 0.65),
            zIndex: 11,
          };
          next.project = {
            ...next.project,
            isOpen: true,
            isMinimized: false,
            x: margin + tbW + margin + formW + margin,
            y: margin + Math.floor(usableH * 0.65) + margin,
            width: propW,
            height: usableH - Math.floor(usableH * 0.65) - margin,
            zIndex: 9,
          };
        } else if (preset === "code-designer") {
          const halfW = Math.floor((usableW - margin) / 2);
          next.code = {
            ...next.code,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin,
            width: halfW,
            height: usableH,
            zIndex: 10,
          };
          next.designer = {
            ...next.designer,
            isOpen: true,
            isMinimized: false,
            x: margin + halfW + margin,
            y: margin,
            width: usableW - halfW - margin,
            height: usableH,
            zIndex: 9,
          };
        } else if (preset === "code-game") {
          const halfW = Math.floor((usableW - margin) / 2);
          next.code = {
            ...next.code,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin,
            width: halfW,
            height: usableH,
            zIndex: 10,
          };
          next.game = {
            ...next.game,
            isOpen: true,
            isMinimized: false,
            x: margin + halfW + margin,
            y: margin,
            width: usableW - halfW - margin,
            height: usableH,
            zIndex: 11,
          };
        } else if (preset === "code-max") {
          next.code = {
            ...next.code,
            isOpen: true,
            isMinimized: false,
            isMaximized: true,
            zIndex: 15,
          };
        } else if (preset === "game-max") {
          next.game = {
            ...next.game,
            isOpen: true,
            isMinimized: false,
            isMaximized: true,
            zIndex: 15,
          };
        } else if (preset === "quadrant") {
          const halfW = Math.floor((usableW - margin) / 2);
          const halfH = Math.floor((usableH - margin) / 2);
          next.designer = {
            ...next.designer,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin,
            width: halfW,
            height: halfH,
            zIndex: 8,
          };
          next.game = {
            ...next.game,
            isOpen: true,
            isMinimized: false,
            x: margin + halfW + margin,
            y: margin,
            width: halfW,
            height: halfH,
            zIndex: 9,
          };
          next.code = {
            ...next.code,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin + halfH + margin,
            width: halfW,
            height: halfH,
            zIndex: 10,
          };
          next.processes = {
            ...next.processes,
            isOpen: true,
            isMinimized: false,
            x: margin + halfW + margin,
            y: margin + halfH + margin,
            width: halfW,
            height: halfH,
            zIndex: 7,
          };
        }

        return next;
      });
      setActiveWindowId("designer");
    },
    [desktopBounds]
  );

  // Close all open windows
  const handleCloseAllWindows = useCallback(() => {
    setWindows((curr) => {
      const next = { ...curr };
      (Object.keys(next) as WindowId[]).forEach((id) => {
        next[id] = { ...next[id], isOpen: false, isMinimized: false, isMaximized: false };
      });
      return next;
    });
    setActiveWindowId(null);
  }, []);

  // Arrange Cascade
  const handleArrangeCascade = useCallback(() => {
    setWindows((curr) => {
      const openIds = (Object.keys(curr) as WindowId[]).filter((id) => curr[id].isOpen && !curr[id].isMinimized);
      if (openIds.length === 0) return curr;
      const next = { ...curr };
      let offset = 16;
      openIds.forEach((id) => {
        next[id] = {
          ...next[id],
          isMaximized: false,
          x: offset,
          y: offset,
          width: Math.min(620, Math.max(380, desktopBounds.width - offset - 40)),
          height: Math.min(460, Math.max(280, desktopBounds.height - offset - 40)),
        };
        offset += 28;
      });
      return next;
    });
  }, [desktopBounds]);

  // Arrange Tile Horizontal
  const handleArrangeTileHorizontal = useCallback(() => {
    setWindows((curr) => {
      const openIds = (Object.keys(curr) as WindowId[]).filter((id) => curr[id].isOpen && !curr[id].isMinimized);
      if (openIds.length === 0) return curr;
      const count = openIds.length;
      const h = Math.floor(desktopBounds.height / count);
      const next = { ...curr };
      openIds.forEach((id, idx) => {
        next[id] = {
          ...next[id],
          isMaximized: false,
          x: 0,
          y: idx * h,
          width: desktopBounds.width,
          height: h,
        };
      });
      return next;
    });
  }, [desktopBounds]);

  // Arrange Tile Vertical
  const handleArrangeTileVertical = useCallback(() => {
    setWindows((curr) => {
      const openIds = (Object.keys(curr) as WindowId[]).filter((id) => curr[id].isOpen && !curr[id].isMinimized);
      if (openIds.length === 0) return curr;
      const count = openIds.length;
      const w = Math.floor(desktopBounds.width / count);
      const next = { ...curr };
      openIds.forEach((id, idx) => {
        next[id] = {
          ...next[id],
          isMaximized: false,
          x: idx * w,
          y: 0,
          width: w,
          height: desktopBounds.height,
        };
      });
      return next;
    });
  }, [desktopBounds]);

  // Delete currently selected visual control
  const handleDeleteSelectedControl = useCallback(() => {
    if (!selectedControlId) return;
    setVb3Form((prev) => {
      const updated = {
        ...prev,
        controls: prev.controls.filter((c) => c.id !== selectedControlId),
      };
      setTimeout(() => {
        onChangeCode(generateDivCodeFromVB3(updated));
      }, 0);
      return updated;
    });
    setSelectedControlId(null);
  }, [selectedControlId, onChangeCode]);

  // Switch project preset from menus or templates
  const handleSwitchToPreset = useCallback(
    (presetId: string) => {
      const targetPreset = PRESETS.find((p) => p.id === presetId);
      if (targetPreset) {
        runtime.stop();
        runtime.reset();
        const isApp = Boolean(
          targetPreset.id.startsWith("app_") ||
          targetPreset.id.startsWith("web_") ||
          targetPreset.id === "game_arcade_canvas"
        );
        const presetForm = isApp ? getPresetFormDefinition(presetId) : null;
        if (presetForm) {
          setForms([presetForm]);
          setActiveFormId(presetForm.id);
          setSelectedControlId(null);
        } else {
          setForms([]);
          setActiveFormId("");
          setSelectedControlId(null);
        }
        if (onSelectPreset) {
          onSelectPreset(targetPreset);
        }
        onChangeCode(targetPreset.code);

        // Immediate layout update for instant responsive feedback
        setWindows((curr) => {
          const next = { ...curr };
          (Object.keys(next) as WindowId[]).forEach((id) => {
            next[id] = { ...next[id], isOpen: false, isMinimized: false, isMaximized: false };
          });
          const dw = desktopBounds.width || 1024;
          const dh = desktopBounds.height || 600;
          const margin = 8;
          const usableW = Math.max(400, dw - margin * 2);
          const usableH = Math.max(300, dh - margin * 2);

          if (presetForm) {
            const tbW = 86;
            const propW = Math.min(270, Math.floor(usableW * 0.28));
            const formW = Math.max(300, usableW - tbW - propW - margin * 3);

            next.toolbox = {
              ...next.toolbox,
              isOpen: true,
              isMinimized: false,
              x: margin,
              y: margin,
              width: tbW,
              height: Math.min(500, usableH),
              zIndex: 12,
            };
            next.designer = {
              ...next.designer,
              isOpen: true,
              isMinimized: false,
              title: `${presetForm.name}.frm`,
              x: margin + tbW + margin,
              y: margin,
              width: formW,
              height: usableH,
              zIndex: 15,
            };
            next.properties = {
              ...next.properties,
              isOpen: true,
              isMinimized: false,
              x: margin + tbW + margin + formW + margin,
              y: margin,
              width: propW,
              height: Math.floor(usableH * 0.65),
              zIndex: 11,
            };
            next.project = {
              ...next.project,
              isOpen: true,
              isMinimized: false,
              x: margin + tbW + margin + formW + margin,
              y: margin + Math.floor(usableH * 0.65) + margin,
              width: propW,
              height: usableH - Math.floor(usableH * 0.65) - margin,
              zIndex: 9,
            };
            next.code = {
              ...next.code,
              isOpen: false,
              title: `${presetForm.name}.frm [Código]`,
            };
          } else {
            const halfW = Math.floor((usableW - margin) / 2);
            const prgName = targetPreset.name;

            next.code = {
              ...next.code,
              isOpen: true,
              isMinimized: false,
              title: `${prgName}.prg [Código]`,
              x: margin,
              y: margin,
              width: halfW,
              height: usableH,
              zIndex: 15,
            };
            next.game = {
              ...next.game,
              isOpen: true,
              isMinimized: false,
              title: `${prgName} [En ejecución]`,
              x: margin + halfW + margin,
              y: margin,
              width: usableW - halfW - margin,
              height: usableH,
              zIndex: 14,
            };
          }
          return next;
        });
        setActiveWindowId(presetForm ? "designer" : "code");
      }
    },
    [onSelectPreset, onChangeCode, desktopBounds]
  );

  // Synchronize Preset Switch / New Project Creation (Gestalt Integration: Forms vs Pure DIV)
  const prevPresetIdRef = useRef<string | undefined>(currentPresetId);
  const prevResetVersionRef = useRef<number | undefined>(projectResetVersion);
  useEffect(() => {
    const isReset = projectResetVersion !== undefined && projectResetVersion !== prevResetVersionRef.current;
    const isPresetChange = currentPresetId && currentPresetId !== prevPresetIdRef.current;

    if (!isReset && !isPresetChange) return;

    prevPresetIdRef.current = currentPresetId;
    prevResetVersionRef.current = projectResetVersion;

    const isApp = Boolean(
      currentPresetId?.startsWith("app_") ||
      currentPresetId?.startsWith("web_") ||
      currentPresetId === "game_arcade_canvas"
    );
    const presetForm = isApp ? getPresetFormDefinition(currentPresetId) : null;
    const targetPreset = PRESETS.find((p) => p.id === currentPresetId);

    const isExplicitGame = Boolean(
      targetPreset &&
      !targetPreset.id.startsWith("app_") &&
      !targetPreset.id.startsWith("web_") &&
      targetPreset.id !== "game_arcade_canvas" &&
      targetPreset.id !== "empty_project" &&
      !targetPreset.id.startsWith("custom_")
    );

    if (presetForm) {
      // App / Visual Form Template (e.g. Landing Page, Todo List, Login, Dashboard, CRM)
      setForms([presetForm]);
      setActiveFormId(presetForm.id);
      setSelectedControlId(null);

      // Close all old windows and arrange clean Visual MDI Form Suite
      setWindows((curr) => {
        const next = { ...curr };
        (Object.keys(next) as WindowId[]).forEach((id) => {
          next[id] = { ...next[id], isOpen: false, isMinimized: false, isMaximized: false };
        });
        const dw = desktopBounds.width || 1024;
        const dh = desktopBounds.height || 600;
        const margin = 8;
        const usableW = Math.max(400, dw - margin * 2);
        const usableH = Math.max(300, dh - margin * 2);
        const tbW = 86;
        const propW = Math.min(270, Math.floor(usableW * 0.28));
        const formW = Math.max(300, usableW - tbW - propW - margin * 3);

        next.toolbox = {
          ...next.toolbox,
          isOpen: true,
          isMinimized: false,
          x: margin,
          y: margin,
          width: tbW,
          height: Math.min(500, usableH),
          zIndex: 12,
        };
        next.designer = {
          ...next.designer,
          isOpen: true,
          isMinimized: false,
          title: `${presetForm.name}.frm`,
          x: margin + tbW + margin,
          y: margin,
          width: formW,
          height: usableH,
          zIndex: 15,
        };
        next.properties = {
          ...next.properties,
          isOpen: true,
          isMinimized: false,
          x: margin + tbW + margin + formW + margin,
          y: margin,
          width: propW,
          height: Math.floor(usableH * 0.65),
          zIndex: 11,
        };
        next.project = {
          ...next.project,
          isOpen: true,
          isMinimized: false,
          x: margin + tbW + margin + formW + margin,
          y: margin + Math.floor(usableH * 0.65) + margin,
          width: propW,
          height: usableH - Math.floor(usableH * 0.65) - margin,
          zIndex: 9,
        };
        next.code = {
          ...next.code,
          isOpen: false,
          title: `${presetForm.name}.frm [Código]`,
        };
        next.game = {
          ...next.game,
          isOpen: false,
        };
        return next;
      });
      setActiveWindowId("designer");
    } else if (!isExplicitGame && (forms.length > 0 || currentPresetId === "empty_project")) {
      // User has visual forms or is in visual MDI environment: keep forms safe and DO NOT switch to game canvas
      if (forms.length === 0) {
        const freshForm: VB3Form = {
          id: "form1",
          name: "Form1",
          caption: "Form1",
          backColor: "#c0c0c0",
          width: 560,
          height: 440,
          controls: [],
        };
        setForms([freshForm]);
        setActiveFormId(freshForm.id);
      }
      return;
    } else if (isExplicitGame) {
      // Pure DIV code project (games, arcade, raycaster, custom DIV)
      // Shut off / close form editor, toolbox, and properties!
      setForms([]);
      setActiveFormId("");
      setSelectedControlId(null);

      setWindows((curr) => {
        const next = { ...curr };
        (Object.keys(next) as WindowId[]).forEach((id) => {
          next[id] = { ...next[id], isOpen: false, isMinimized: false, isMaximized: false };
        });
        const dw = desktopBounds.width || 1024;
        const dh = desktopBounds.height || 600;
        const margin = 8;
        const usableW = Math.max(400, dw - margin * 2);
        const usableH = Math.max(300, dh - margin * 2);
        const halfW = Math.floor((usableW - margin) / 2);
        const prgName = projectTitle || (targetPreset ? targetPreset.name : "programa_div");

        next.code = {
          ...next.code,
          isOpen: true,
          isMinimized: false,
          title: `${prgName}.prg [Código]`,
          x: margin,
          y: margin,
          width: halfW,
          height: usableH,
          zIndex: 15,
        };
        next.game = {
          ...next.game,
          isOpen: true,
          isMinimized: false,
          title: `${prgName} [En ejecución]`,
          x: margin + halfW + margin,
          y: margin,
          width: usableW - halfW - margin,
          height: usableH,
          zIndex: 14,
        };
        return next;
      });
      setActiveWindowId("code");
    }
  }, [currentPresetId, projectTitle, projectResetVersion, desktopBounds, onChangeCode]);

  // Keyboard Shortcuts: F1 (Manual), F5 (Iniciar / Ejecutar), F7 (Código), Shift+F7 (Diseñador), Ctrl+N (Nuevo), Supr (Eliminar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        setIsLexiconOpen(true);
      } else if (e.key === "F5" && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        if (isRunning) {
          handleStopRun();
        } else {
          handlePlayRun();
        }
      } else if (e.key === "F7") {
        e.preventDefault();
        if (e.shiftKey) {
          handleOpenAndFocusWindow("designer");
        } else {
          handleOpenAndFocusWindow("code");
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        if (onOpenNewProject) {
          e.preventDefault();
          onOpenNewProject();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        // Quick save
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedControlId) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          handleDeleteSelectedControl();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, handlePlayRun, handleStopRun, handleOpenAndFocusWindow, onOpenNewProject, selectedControlId, handleDeleteSelectedControl]);

  // Handle external requested tool with prev ref check
  const prevRequestedToolRef = useRef<WindowId | null>(null);
  useEffect(() => {
    if (requestedActiveTool && requestedActiveTool !== prevRequestedToolRef.current) {
      prevRequestedToolRef.current = requestedActiveTool;
      handleOpenAndFocusWindow(requestedActiveTool);
      onResetRequestedActiveTool?.();
    }
  }, [requestedActiveTool, handleOpenAndFocusWindow, onResetRequestedActiveTool]);

  // Window Icons lookup
  const windowIcons: Record<WindowId, React.ReactNode> = {
    toolbox: <Sliders className="w-3.5 h-3.5 text-amber-400" />,
    designer: <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />,
    properties: <Sliders className="w-3.5 h-3.5 text-blue-400" />,
    project: <FolderOpen className="w-3.5 h-3.5 text-amber-300" />,
    code: <FileCode className="w-3.5 h-3.5 text-emerald-400" />,
    game: <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />,
    processes: <Cpu className="w-3.5 h-3.5 text-cyan-400" />,
    ai: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
    fpg: <Package className="w-3.5 h-3.5 text-amber-500" />,
    sprites: <Paintbrush className="w-3.5 h-3.5 text-pink-400" />,
    sound: <Volume2 className="w-3.5 h-3.5 text-emerald-300" />,
    mode8: <Compass className="w-3.5 h-3.5 text-cyan-400" />,
    palette: <PaletteIcon className="w-3.5 h-3.5 text-yellow-400" />,
    map: <FileImage className="w-3.5 h-3.5 text-blue-400" />,
    fonts: <Type className="w-3.5 h-3.5 text-indigo-400" />,
    explosions: <Flame className="w-3.5 h-3.5 text-orange-400" />,
    visual: <Wand2 className="w-3.5 h-3.5 text-yellow-300" />,
    md2viewer: <Box className="w-3.5 h-3.5 text-red-400" />,
    spritegenerator: <Cpu className="w-3.5 h-3.5 text-teal-400" />,
  };

  // Minimized Windows list
  const minimizedWindows = useMemo(() => {
    return (Object.keys(windows) as WindowId[]).filter(
      (id) => windows[id].isOpen && windows[id].isMinimized
    );
  }, [windows]);

  // AI Generation with Pre-code
  const handleQuickAiGenerate = () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setTimeout(() => {
      const generatedSnippet = `\n// --- Proceso generado con IA para: "${aiPrompt.trim()}" ---\nPROCESS app_modulo_ia()\nBEGIN\n  write(0, 20, 200, 0, "Modulo generado: ${aiPrompt.trim().substring(0, 30)}");\n  LOOP\n    FRAME;\n  END\nEND\n`;
      onInsertCode(generatedSnippet);
      handleOpenAndFocusWindow("code");
      setAiGenerating(false);
      setIsAiModalOpen(false);
      setAiPrompt("");
    }, 600);
  };

  return (
    <div
      className="relative w-full h-full flex flex-col flex-1 flex-grow min-h-0 overflow-hidden select-none bg-[#0a0f1d] text-slate-100 font-sans"
      style={{ height: "100%", width: "100%", flexGrow: 1, minHeight: 0 }}
    >
      {/* ========================================================================= */}
      {/* 1. VISUAL MDI ENGINE MAIN MENU BAR (TOP BAR - MAXIMIZES WORKSPACE)       */}
      {/* ========================================================================= */}
      <div className="vb-menu-root relative z-[9999] h-7 bg-[#0f172a] border-b border-slate-800 px-1.5 flex items-center justify-between text-xs text-slate-300 flex-shrink-0">
        <div className="flex items-center gap-0.5">
        {/* Archivo */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "archivo" ? null : "archivo")}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 hover:text-white transition-colors ${
              activeMenu === "archivo" ? "bg-sky-700 text-white" : ""
            }`}
          >
            Archivo
          </button>
          {activeMenu === "archivo" && (
            <div className="absolute top-6 left-0 w-72 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-[10000] text-xs text-slate-200 divide-y divide-slate-800">
              <div className="py-1">
                <button
                  onClick={() => { onOpenNewProject?.(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><FolderPlus className="w-3.5 h-3.5 text-sky-400" /> Nuevo Proyecto...</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+N</span>
                </button>
                <button
                  onClick={() => { onOpenNewProject?.(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5 text-amber-400" /> Abrir Proyecto...</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+O</span>
                </button>
              </div>

              {/* Plantillas y Landings Gestalt Switcher */}
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  Plantillas de Aplicación & Landings
                </div>
                <button
                  onClick={() => { handleSwitchToPreset("app_landing"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-medium text-emerald-300"
                >
                  <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-emerald-400" /> 🌐 Landing Page Moderna</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">Form</span>
                </button>
                <button
                  onClick={() => { handleSwitchToPreset("app_todo"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-medium text-sky-300"
                >
                  <span className="flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5 text-sky-400" /> 📱 App de Tareas & Proyectos</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700">Form</span>
                </button>
                <button
                  onClick={() => { handleSwitchToPreset("app_login"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-medium text-amber-300"
                >
                  <span className="flex items-center gap-2"><LayoutGrid className="w-3.5 h-3.5 text-amber-400" /> 🔒 Login & Registro (Visual MDI)</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">Form</span>
                </button>
                <button
                  onClick={() => { handleSwitchToPreset("app_dashboard"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-medium text-cyan-300"
                >
                  <span className="flex items-center gap-2"><Columns className="w-3.5 h-3.5 text-cyan-400" /> 📊 Dashboard Analítico</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">Form</span>
                </button>
                <button
                  onClick={() => { handleSwitchToPreset("app_crm"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-medium text-indigo-300"
                >
                  <span className="flex items-center gap-2"><GridIcon className="w-3.5 h-3.5 text-indigo-400" /> 🗄️ CRM de Clientes SQLite</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">Form</span>
                </button>
                <button
                  onClick={() => { handleSwitchToPreset("app_calculator_sci"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-medium text-amber-200"
                >
                  <span className="flex items-center gap-2"><Calculator className="w-3.5 h-3.5 text-amber-400" /> 🧮 Calculadora Visual MDI engine</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">Form</span>
                </button>
              </div>

              {/* Pure DIV code projects */}
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Juegos Nativos DIV (Solo Código)
                </div>
                <button
                  onClick={() => { handleSwitchToPreset("space_shooter"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between text-slate-300"
                >
                  <span className="flex items-center gap-2"><Gamepad2 className="w-3.5 h-3.5 text-purple-400" /> 🚀 Galaxia Arcade 2D</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400">DIV</span>
                </button>
                <button
                  onClick={() => { handleSwitchToPreset("mode8_dungeon"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between text-slate-300"
                >
                  <span className="flex items-center gap-2"><Box className="w-3.5 h-3.5 text-amber-400" /> 🧱 Mazmorra 3D Raycaster</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400">Modo 8</span>
                </button>
                <button
                  onClick={() => { handleSwitchToPreset("doom_modo8_classic"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between text-slate-300"
                >
                  <span className="flex items-center gap-2"><Box className="w-3.5 h-3.5 text-red-400" /> 💀 DOOM 1993 Hangar E1M1</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400">Modo 8</span>
                </button>
                <button
                  onClick={() => { handleSwitchToPreset("mode7_kart"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between text-slate-300"
                >
                  <span className="flex items-center gap-2"><Compass className="w-3.5 h-3.5 text-rose-400" /> 🏎️ DIV Super Kart 3D</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400">Modo 7</span>
                </button>
                <button
                  onClick={() => { handleSwitchToPreset("cyber_pong"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between text-slate-300"
                >
                  <span className="flex items-center gap-2"><Gamepad2 className="w-3.5 h-3.5 text-cyan-400" /> 🏓 Cyber Pong 3000 (Física & IA)</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400">DIV</span>
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Save className="w-3.5 h-3.5 text-emerald-400" /> Guardar Proyecto</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+S</span>
                </button>
                <button
                  onClick={() => { onOpenExport?.(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span>Exportar Aplicación / ZIP...</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+E</span>
                </button>
                <button
                  onClick={() => { onOpenCloudSync?.(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
                >
                  Sincronización en la Nube...
                </button>
                <button
                  onClick={() => { handleCloseAllWindows(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-600 hover:text-white text-rose-300 flex items-center justify-between"
                >
                  <span>Cerrar Todas las Ventanas</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edición */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "edicion" ? null : "edicion")}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 hover:text-white transition-colors ${
              activeMenu === "edicion" ? "bg-sky-700 text-white" : ""
            }`}
          >
            Edición
          </button>
          {activeMenu === "edicion" && (
            <div className="absolute top-6 left-0 w-56 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-[10000] text-xs text-slate-200">
              <button
                onClick={() => setActiveMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
              >
                <span>Deshacer</span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+Z</span>
              </button>
              <button
                onClick={() => setActiveMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
              >
                <span>Rehacer</span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+Y</span>
              </button>
              <div className="h-[1px] bg-slate-800 my-1" />
              <button
                onClick={() => setActiveMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
              >
                <span>Cortar</span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
              </button>
              <button
                onClick={() => setActiveMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
              >
                <span>Copiar</span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
              </button>
              <button
                onClick={() => setActiveMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
              >
                <span>Pegar</span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
              </button>
              <div className="h-[1px] bg-slate-800 my-1" />
              <button
                onClick={() => { handleDeleteSelectedControl(); setActiveMenu(null); }}
                disabled={!selectedControlId}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
                  selectedControlId
                    ? "hover:bg-red-600 hover:text-white text-red-300 font-medium"
                    : "text-slate-500 cursor-not-allowed"
                }`}
              >
                <span className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5 text-red-400" /> Eliminar Control</span>
                <span className="text-[10px] font-mono">Supr</span>
              </button>
              <button
                onClick={() => { setSelectedControlId(null); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
              >
                <span>Deseleccionar Todo</span>
                <span className="text-[10px] text-slate-400 font-mono">Esc</span>
              </button>
            </div>
          )}
        </div>

        {/* Ver */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "ver" ? null : "ver")}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 hover:text-white transition-colors ${
              activeMenu === "ver" ? "bg-sky-700 text-white" : ""
            }`}
          >
            Ver
          </button>
          {activeMenu === "ver" && (
            <div className="absolute top-6 left-0 w-64 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-[10000] text-xs text-slate-200 divide-y divide-slate-800">
              <div className="py-1">
                <button
                  onClick={() => { handleOpenAndFocusWindow("code"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><FileCode className="w-3.5 h-3.5 text-emerald-400" /> Código (F7)</span>
                  <span className="text-[10px] text-slate-400 font-mono">F7</span>
                </button>
                <button
                  onClick={() => { handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><LayoutGrid className="w-3.5 h-3.5 text-sky-400" /> Objeto / Formulario</span>
                  <span className="text-[10px] text-slate-400 font-mono">Shift+F7</span>
                </button>
                <button
                  onClick={() => { handleOpenAndFocusWindow("toolbox"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Sliders className="w-3.5 h-3.5 text-amber-400" /> Cuadro de Herramientas</span>
                  <span className="text-[10px] text-slate-400 font-mono">Toolbox</span>
                </button>
                <button
                  onClick={() => { handleOpenAndFocusWindow("properties"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Sliders className="w-3.5 h-3.5 text-blue-400" /> Ventana Propiedades</span>
                  <span className="text-[10px] text-slate-400 font-mono">F4</span>
                </button>
                <button
                  onClick={() => { handleOpenAndFocusWindow("project"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5 text-amber-300" /> Explorador de Proyecto</span>
                  <span className="text-[10px] text-slate-400 font-mono">Project1</span>
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { handleOpenAndFocusWindow("game"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Gamepad2 className="w-3.5 h-3.5 text-amber-400" /> Ejecución Canvas 2D</span>
                  <span className="text-[10px] text-slate-400 font-mono">F5</span>
                </button>
                <button
                  onClick={() => { handleOpenAndFocusWindow("processes"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-cyan-400" /> Debugger de Procesos DIV</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+G</span>
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { handleOpenAndFocusWindow("fpg"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <Package className="w-3.5 h-3.5 text-amber-400" /> Sprites FPG (.fpg)
                </button>
                <button
                  onClick={() => { handleOpenAndFocusWindow("sprites"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <Paintbrush className="w-3.5 h-3.5 text-pink-400" /> Editor de Pixel Art
                </button>
                <button
                  onClick={() => { handleOpenAndFocusWindow("sound"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Sintetizador ADSR
                </button>
                <button
                  onClick={() => { handleOpenAndFocusWindow("mode8"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-400" /> Niveles Modo 8 3D
                </button>
                <button
                  onClick={() => { handleOpenAndFocusWindow("map"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <FileImage className="w-3.5 h-3.5 text-blue-400" /> Editor de Mapas (.map)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Insertar */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "insertar" ? null : "insertar")}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 hover:text-white transition-colors ${
              activeMenu === "insertar" ? "bg-sky-700 text-white" : ""
            }`}
          >
            Insertar
          </button>
          {activeMenu === "insertar" && (
            <div className="absolute top-6 left-0 w-64 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-[10000] text-xs text-slate-200 divide-y divide-slate-800">
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  Controles al Formulario
                </div>
                <button
                  onClick={() => { handleDoubleClickTool("commandbutton"); handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <Box className="w-3.5 h-3.5 text-sky-400" /> Botón de Comando (CommandButton)
                </button>
                <button
                  onClick={() => { handleDoubleClickTool("textbox"); handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <Type className="w-3.5 h-3.5 text-amber-400" /> Caja de Texto (TextBox)
                </button>
                <button
                  onClick={() => { handleDoubleClickTool("label"); handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" /> Etiqueta (Label)
                </button>
                <button
                  onClick={() => { handleDoubleClickTool("checkbox"); handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" /> Casilla (CheckBox)
                </button>
                <button
                  onClick={() => { handleDoubleClickTool("optionbutton"); handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <CircleDot className="w-3.5 h-3.5 text-pink-400" /> Botón de Opción (OptionButton)
                </button>
                <button
                  onClick={() => { handleDoubleClickTool("frame"); handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-yellow-400" /> Marco (Frame)
                </button>
                <button
                  onClick={() => { handleDoubleClickTool("picturebox"); handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <FileImage className="w-3.5 h-3.5 text-blue-400" /> Cuadro de Imagen (PictureBox)
                </button>
                <button
                  onClick={() => { handleDoubleClickTool("grid"); handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <GridIcon className="w-3.5 h-3.5 text-indigo-400" /> Grilla de Datos (Grid)
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-sky-400" /> + Agregar Formulario (Form)
                </button>
                <button
                  onClick={() => { handleOpenAndFocusWindow("code"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" /> + Agregar Módulo DIV (.div)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ejecutar */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "ejecutar" ? null : "ejecutar")}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 hover:text-white transition-colors ${
              activeMenu === "ejecutar" ? "bg-sky-700 text-white" : ""
            }`}
          >
            Ejecutar
          </button>
          {activeMenu === "ejecutar" && (
            <div className="absolute top-6 left-0 w-52 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-[10000] text-xs text-slate-200">
              <button
                onClick={() => { handlePlayRun(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex items-center justify-between text-emerald-400 hover:text-white font-semibold"
              >
                <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5 fill-current" /> Iniciar (Run)</span>
                <span className="text-[10px] font-mono">F5</span>
              </button>
              <button
                onClick={() => { handleStopRun(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-600 hover:text-white flex items-center justify-between text-rose-400 hover:text-white"
              >
                <span className="flex items-center gap-1.5"><StopSquare className="w-3.5 h-3.5 fill-current" /> Terminar / Detener</span>
                <span className="text-[10px] font-mono">Esc</span>
              </button>
              <button
                onClick={() => { onRestartGame(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Reiniciar Bucle</span>
                <span className="text-[10px] font-mono">Shift+F5</span>
              </button>
            </div>
          )}
        </div>

        {/* Herramientas */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "herramientas" ? null : "herramientas")}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 hover:text-white transition-colors ${
              activeMenu === "herramientas" ? "bg-sky-700 text-white" : ""
            }`}
          >
            Herramientas
          </button>
          {activeMenu === "herramientas" && (
            <div className="absolute top-6 left-0 w-60 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-[10000] text-xs text-slate-200 divide-y divide-slate-800">
              <div className="py-1">
                <button
                  onClick={() => { handleOpenAiFloatingWindow(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-600 hover:text-white flex items-center gap-2 text-cyan-300"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AURA IA (Ventana Flotante)
                </button>
                <button
                  onClick={() => { onOpenAiSettings(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-600 hover:text-white flex items-center gap-2 text-purple-300"
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-400" /> Configuración de IA (WebLLM / Llama 3 / Gemini)...
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setIsThemeModalOpen(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <PaletteIcon className="w-3.5 h-3.5 text-yellow-400" /> Fondo y Apariencia del IDE...
                </button>
                {onChangeResolution && (
                  <div className="px-3 py-1.5 flex items-center justify-between text-slate-300">
                    <span>Resolución Gráfica:</span>
                    <select
                      value={resolution}
                      onChange={(e) => { onChangeResolution(e.target.value as any); setActiveMenu(null); }}
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-amber-300 font-mono text-[11px]"
                    >
                      <option value="640x480">640x480</option>
                      <option value="800x600">800x600</option>
                      <option value="320x200">320x200</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ventana */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "ventana" ? null : "ventana")}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 hover:text-white transition-colors ${
              activeMenu === "ventana" ? "bg-sky-700 text-white" : ""
            }`}
          >
            Ventana
          </button>
          {activeMenu === "ventana" && (
            <div className="absolute top-6 left-0 w-64 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-[10000] text-xs text-slate-200 divide-y divide-slate-800 max-h-96 overflow-y-auto">
              <div className="py-1">
                <button
                  onClick={() => { handleApplyLayoutPreset("vb5-classic"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-semibold text-sky-300"
                >
                  ★ Disposición Visual MDI Clásica
                </button>
                <button
                  onClick={() => { handleArrangeTileHorizontal(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
                >
                  Mosaico Horizontal
                </button>
                <button
                  onClick={() => { handleArrangeTileVertical(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
                >
                  Mosaico Vertical
                </button>
                <button
                  onClick={() => { handleArrangeCascade(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
                >
                  Cascada
                </button>
                <button
                  onClick={() => { handleApplyLayoutPreset("quadrant"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
                >
                  Cuadrantes MDI (4 Ventanas)
                </button>
                <button
                  onClick={() => { handleCloseAllWindows(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-600 hover:text-white text-rose-300 font-medium"
                >
                  Cerrar Todas las Ventanas
                </button>
              </div>

              {/* Lista dinámica de ventanas abiertas */}
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ventanas Abiertas ({(Object.values(windows) as WindowConfig[]).filter((w) => w.isOpen).length})
                </div>
                {(Object.keys(windows) as WindowId[])
                  .filter((id) => windows[id].isOpen)
                  .map((id) => (
                    <button
                      key={id}
                      onClick={() => { handleOpenAndFocusWindow(id); setActiveMenu(null); }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between ${
                        activeWindowId === id ? "bg-sky-900/60 text-white font-semibold" : "text-slate-300"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {windowIcons[id]}
                        <span className="truncate">{windows[id].title}</span>
                      </span>
                      {activeWindowId === id && <span className="text-[10px] text-cyan-300">✓ Activa</span>}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Ayuda */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "ayuda" ? null : "ayuda")}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 hover:text-white transition-colors ${
              activeMenu === "ayuda" ? "bg-sky-700 text-white" : ""
            }`}
          >
            Ayuda
          </button>
          {activeMenu === "ayuda" && (
            <div className="absolute top-6 left-0 w-64 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-[10000] text-xs text-slate-200">
              <button
                onClick={() => { setIsLexiconOpen(true); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> Manual de Léxico DIV Games Studio
              </button>
              <div className="px-3 py-2 text-[11px] text-slate-400 border-t border-slate-800">
                <div className="font-semibold text-slate-300 mb-1">Atajos Rápidos:</div>
                <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                  <span>F1: Manual Léxico</span>
                  <span>F5: Iniciar Run</span>
                  <span>F7: Código DIV</span>
                  <span>Shift+F7: Form Visual</span>
                  <span>Supr: Borrar ctrl</span>
                  <span>Ctrl+N: Nuevo</span>
                </div>
              </div>
              <div className="h-[1px] bg-slate-800 my-1" />
              <div className="px-3 py-1.5 text-[11px] text-slate-400">
                WXDIV 3.0 • Visual MDI engine
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Right side of menu bar: Project name & runtime status indicator */}
        <div className="flex items-center gap-3 pr-2 text-[11px] font-mono text-slate-400 select-none">
          <span className="text-slate-300 font-semibold truncate max-w-[200px]">
            [{currentProjectName}]
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? "bg-emerald-400 animate-pulse" : "bg-sky-400"
              }`}
            />
            <span className={isRunning ? "text-emerald-300 font-bold" : "text-sky-300"}>
              {isRunning ? "EN EJECUCIÓN (60 FPS)" : "MODO DISEÑO"}
            </span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL MDI ENGINE STANDARD TOOLBAR                                     */}
      {/* ========================================================================= */}
      <div className="relative z-[900] h-9 bg-[#111c38] border-b border-slate-700/80 px-2 flex items-center justify-between text-xs text-slate-300 flex-shrink-0 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {/* File Operations */}
          <button
            onClick={() => onOpenNewProject?.()}
            className="p-1.5 rounded hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors"
            title="Nuevo Proyecto (Ctrl+N)"
          >
            <FolderPlus className="w-4 h-4 text-sky-400" />
          </button>
          <button
            onClick={() => onOpenNewProject?.()}
            className="p-1.5 rounded hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors"
            title="Abrir Proyecto (Ctrl+O)"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={() => {}}
            className="p-1.5 rounded hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors"
            title="Guardar Proyecto (Ctrl+S)"
          >
            <Save className="w-4 h-4 text-emerald-400" />
          </button>

          <div className="h-5 w-[1px] bg-slate-700 mx-1" />

          {/* Edit Operations */}
          <button
            className="p-1.5 rounded hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors"
            title="Cortar (Ctrl+X)"
          >
            <Scissors className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copiar (Ctrl+C)"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors"
            title="Pegar (Ctrl+V)"
          >
            <Clipboard className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-slate-700 mx-1" />

          {/* Visual MDI Iniciar / Pausa / Terminar (Execution controls) */}
          <button
            onClick={handlePlayRun}
            disabled={isRunning}
            className={`px-2.5 py-1 rounded font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
              isRunning
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 shadow-emerald-950/40"
            }`}
            title="Iniciar Ejecución (F5)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Iniciar</span>
          </button>

          <button
            onClick={() => runtime.pause()}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Pausar Bucle (Ctrl+Break)"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={handleStopRun}
            disabled={!isRunning}
            className={`px-2.5 py-1 rounded font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
              !isRunning
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                : "bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50 shadow-rose-950/40"
            }`}
            title="Terminar Ejecución (Esc)"
          >
            <StopSquare className="w-3.5 h-3.5 fill-current" />
            <span>Terminar</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-700 mx-1" />

          {/* Quick Windows Toggles (Visual MDI engine) */}
          <button
            onClick={() => handleOpenAndFocusWindow("toolbox")}
            className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-mono transition-colors ${
              windows.toolbox.isOpen && activeWindowId === "toolbox"
                ? "bg-amber-950/80 border-amber-500 text-amber-300"
                : "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-600"
            }`}
            title="Barra de Herramientas (Toolbox)"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Toolbox</span>
          </button>

          <button
            onClick={() => handleOpenAndFocusWindow("designer")}
            className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-mono transition-colors ${
              windows.designer.isOpen && activeWindowId === "designer"
                ? "bg-sky-950/80 border-sky-500 text-sky-300"
                : "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-600"
            }`}
            title="Ver Formulario Form1 (Shift+F7)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">Form1</span>
          </button>

          <button
            onClick={() => handleOpenAndFocusWindow("properties")}
            className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-mono transition-colors ${
              windows.properties.isOpen && activeWindowId === "properties"
                ? "bg-blue-950/80 border-blue-500 text-blue-300"
                : "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-600"
            }`}
            title="Ventana de Propiedades (F4)"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold">Propiedades</span>
          </button>

          <button
            onClick={() => handleOpenAndFocusWindow("project")}
            className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-mono transition-colors ${
              windows.project.isOpen && activeWindowId === "project"
                ? "bg-amber-950/80 border-amber-500 text-amber-300"
                : "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-600"
            }`}
            title="Explorador de Proyecto"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-semibold">Proyecto</span>
          </button>

          <button
            onClick={() => handleOpenAndFocusWindow("code")}
            className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-mono transition-colors ${
              windows.code.isOpen && activeWindowId === "code"
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                : "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-600"
            }`}
            title="Ver Código (F7)"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Código</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-700 mx-1" />

          {/* Authentic Visual MDI engine Coordinates & Sizing Display Boxes */}
          <div className="flex items-center gap-1 bg-[#c0c0c0] border-t border-l border-black border-b border-r border-white px-2 py-0.5 text-[11px] font-mono text-black select-none shadow-xs">
            <span className="text-gray-600 font-bold">Pos:</span>
            <span className="font-bold min-w-[65px]">{toolbarCoords.x}, {toolbarCoords.y}</span>
          </div>

          <div className="flex items-center gap-1 bg-[#c0c0c0] border-t border-l border-black border-b border-r border-white px-2 py-0.5 text-[11px] font-mono text-black select-none shadow-xs">
            <span className="text-gray-600 font-bold">Tam:</span>
            <span className="font-bold min-w-[70px]">{toolbarCoords.w} × {toolbarCoords.h}</span>
          </div>

          <div className="h-5 w-[1px] bg-slate-700 mx-1" />

          {/* Quick Editors Toggles */}
          <button
            onClick={() => handleOpenAndFocusWindow("fpg")}
            className="p-1.5 rounded hover:bg-slate-700 text-amber-400 hover:text-white transition-colors"
            title="Gestor de Paquetes FPG"
          >
            <Package className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleOpenAndFocusWindow("fonts")}
            className="p-1.5 rounded hover:bg-slate-700 text-indigo-400 hover:text-white transition-colors"
            title="Editor de Fuentes FNT (.fnt)"
          >
            <Type className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleOpenAndFocusWindow("map")}
            className="p-1.5 rounded hover:bg-slate-700 text-blue-400 hover:text-white transition-colors"
            title="Editor de Gráficos .MAP"
          >
            <FileImage className="w-4 h-4" />
          </button>
        </div>

        {/* Right side tools */}
        <div className="flex items-center gap-2">
          {/* Quick Layout Presets Selector */}
          <div className="flex items-center gap-1 bg-[#0b1329] border border-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
            <span className="text-slate-400">Diseño:</span>
            <select
              defaultValue="vb5-classic"
              onChange={(e) => handleApplyLayoutPreset(e.target.value as LayoutPresetType)}
              className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="vb5-classic" className="bg-slate-900 text-slate-200">
                Visual MDI Clásico
              </option>
              <option value="code-designer" className="bg-slate-900 text-slate-200">
                Código + Diseñador
              </option>
              <option value="code-game" className="bg-slate-900 text-slate-200">
                Código + Ejecución
              </option>
              <option value="quadrant" className="bg-slate-900 text-slate-200">
                Cuadrantes MDI
              </option>
              <option value="code-max" className="bg-slate-900 text-slate-200">
                Solo Código (F7)
              </option>
            </select>
          </div>

          {/* Canvas Resolution */}
          {onChangeResolution && (
            <div className="flex items-center gap-1 bg-[#0b1329] border border-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
              <span className="text-slate-400">Res:</span>
              <select
                value={resolution}
                onChange={(e) => onChangeResolution(e.target.value as any)}
                className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="640x480" className="bg-slate-900 text-slate-200">640x480</option>
                <option value="800x600" className="bg-slate-900 text-slate-200">800x600</option>
                <option value="320x200" className="bg-slate-900 text-slate-200">320x200</option>
              </select>
            </div>
          )}

          {/* AI Floating AURA IA Assistant */}
          <button
            onClick={handleOpenAiFloatingWindow}
            className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-950 via-indigo-950 to-slate-900 hover:from-cyan-900 hover:to-indigo-900 border border-cyan-500/80 text-cyan-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/40 transition-all cursor-pointer"
            title="Abrir AURA IA como Ventana Flotante"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span className="hidden sm:inline">AURA IA</span>
          </button>

          <button
            onClick={onOpenAiSettings}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 transition-colors cursor-pointer"
            title="Ajustes de IA (WebLLM Local / Llama 3 / Gemini)"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. VISUAL MDI ENGINE CLIENT WORKSPACE                                     */}
      {/* ========================================================================= */}
      <div
        ref={desktopRef}
        id="mdi-workspace"
        style={{
          backgroundColor: themeConfig.backgroundColor || "#008080",
          backgroundImage: "radial-gradient(circle, #005050 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          height: "100%",
          width: "100%",
          flexGrow: 1,
          minHeight: 0,
        }}
        className="relative flex-1 flex-grow min-h-0 w-full h-full overflow-hidden select-none"
      >
        {/* Render Window: Toolbox (Visual MDI engine Palette) */}
        <WindowFrame
          window={windows.toolbox}
          icon={windowIcons.toolbox}
          isActive={activeWindowId === "toolbox"}
          onFocus={() => handleFocusWindow("toolbox")}
          onClose={() => handleCloseWindow("toolbox")}
          onMinimize={() => handleMinimizeWindow("toolbox")}
          onToggleMaximize={() => handleToggleMaximize("toolbox")}
          onUpdateBounds={(b) => handleUpdateBounds("toolbox", b)}
          desktopBounds={desktopBounds}
        >
          <ToolboxWindow
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            onDoubleClickTool={handleDoubleClickTool}
          />
        </WindowFrame>

        {/* Render Window: Form Canvas (Form1.frm - Visual MDI engine Dot Grid) */}
        <WindowFrame
          window={windows.designer}
          icon={windowIcons.designer}
          isActive={activeWindowId === "designer"}
          onFocus={() => handleFocusWindow("designer")}
          onClose={() => handleCloseWindow("designer")}
          onMinimize={() => handleMinimizeWindow("designer")}
          onToggleMaximize={() => handleToggleMaximize("designer")}
          onUpdateBounds={(b) => handleUpdateBounds("designer", b)}
          desktopBounds={desktopBounds}
        >
          {forms.length === 0 ? (
            <div className="w-full h-full bg-[#808080] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
              <div className="bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black p-5 shadow-xl max-w-sm text-black">
                <div className="text-sm font-bold mb-2">No hay formularios abiertos</div>
                <p className="text-xs text-gray-700 mb-4">
                  Todos los formularios han sido cerrados o eliminados. Puedes crear uno nuevo desde el Explorador de Proyecto o pulsando el botón a continuación.
                </p>
                <button
                  onClick={handleAddNewForm}
                  className="px-3 py-1.5 bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black active:border-t-2 active:border-l-2 active:border-black font-bold text-xs hover:bg-[#d0d0d0] flex items-center justify-center gap-1.5 mx-auto"
                >
                  <span>➕</span> Crear Nuevo Formulario
                </button>
              </div>
            </div>
          ) : (
            <FormCanvas
              form={vb3Form}
              selectedControlId={selectedControlId}
              activeTool={activeTool}
              onSelectControl={handleSelectControl}
              onUpdateControlBounds={handleUpdateControlBounds}
              onAddControl={handleAddControl}
              onDoubleClickControl={handleDoubleClickControl}
              onDoubleClickForm={handleDoubleClickForm}
              onUpdateCoordinates={handleUpdateCoordinates}
              onResetTool={handleResetTool}
            />
          )}
        </WindowFrame>

        {/* Render Window: Properties Window (Visual MDI engine Properties Sheet) */}
        <WindowFrame
          window={windows.properties}
          icon={windowIcons.properties}
          isActive={activeWindowId === "properties"}
          onFocus={() => handleFocusWindow("properties")}
          onClose={() => handleCloseWindow("properties")}
          onMinimize={() => handleMinimizeWindow("properties")}
          onToggleMaximize={() => handleToggleMaximize("properties")}
          onUpdateBounds={(b) => handleUpdateBounds("properties", b)}
          desktopBounds={desktopBounds}
        >
          <PropertiesWindow
            form={vb3Form}
            selectedControl={selectedControl}
            onSelectControl={handleSelectControl}
            onUpdateProperty={handleUpdateProperty}
          />
        </WindowFrame>

        {/* Render Window: Project Window (Project1.mak) */}
        <WindowFrame
          window={windows.project}
          icon={windowIcons.project}
          isActive={activeWindowId === "project"}
          onFocus={() => handleFocusWindow("project")}
          onClose={() => handleCloseWindow("project")}
          onMinimize={() => handleMinimizeWindow("project")}
          onToggleMaximize={() => handleToggleMaximize("project")}
          onUpdateBounds={(b) => handleUpdateBounds("project", b)}
          desktopBounds={desktopBounds}
        >
          <ProjectWindow
            projectName={currentProjectName}
            forms={forms}
            activeFormId={activeFormId}
            onSelectForm={handleSelectForm}
            onAddForm={handleAddNewForm}
            onDeleteForm={handleDeleteForm}
            onRenameForm={handleRenameForm}
            onViewForm={() => handleOpenAndFocusWindow("designer")}
            onViewCode={() => handleOpenAndFocusWindow("code")}
            onOpenTool={(toolId) => handleOpenAndFocusWindow(toolId)}
          />
        </WindowFrame>

        {/* Render Window: Integrated Code Editor (F7) */}
        <WindowFrame
          window={windows.code}
          icon={windowIcons.code}
          isActive={activeWindowId === "code"}
          onFocus={() => handleFocusWindow("code")}
          onClose={() => handleCloseWindow("code")}
          onMinimize={() => handleMinimizeWindow("code")}
          onToggleMaximize={() => handleToggleMaximize("code")}
          onUpdateBounds={(b) => handleUpdateBounds("code", b)}
          desktopBounds={desktopBounds}
        >
          <CodeEditor
            code={code}
            onChange={onChangeCode}
            onRun={handlePlayRun}
            fileName={windows.code.title}
            isFormMode={forms.length > 0 && Boolean(activeFormId)}
            onOpenLexicon={() => setIsLexiconOpen(true)}
            onOpenAiAssistant={handleOpenAiFloatingWindow}
            targetSymbol={codeTargetSymbol}
            runtime={runtime}
          />
        </WindowFrame>

        {/* Render Window: Live Execution GameStage on Canvas 2D (F5) */}
        <WindowFrame
          window={windows.game}
          icon={windowIcons.game}
          isActive={activeWindowId === "game"}
          onFocus={() => handleFocusWindow("game")}
          onClose={() => {
            handleCloseWindow("game");
            if (isRunning) runtime.stop();
          }}
          onMinimize={() => handleMinimizeWindow("game")}
          onToggleMaximize={() => handleToggleMaximize("game")}
          onUpdateBounds={(b) => handleUpdateBounds("game", b)}
          desktopBounds={desktopBounds}
        >
          <GameStage
            runtime={runtime}
            onRestart={handlePlayRun}
          />
        </WindowFrame>

        {/* Render Window: Process Inspector / Immediate Debug */}
        <WindowFrame
          window={windows.processes}
          icon={windowIcons.processes}
          isActive={activeWindowId === "processes"}
          onFocus={() => handleFocusWindow("processes")}
          onClose={() => handleCloseWindow("processes")}
          onMinimize={() => handleMinimizeWindow("processes")}
          onToggleMaximize={() => handleToggleMaximize("processes")}
          onUpdateBounds={(b) => handleUpdateBounds("processes", b)}
          desktopBounds={desktopBounds}
        >
          <ProcessInspector runtime={runtime} />
        </WindowFrame>

        {/* Render Window: AI Copilot Assistant */}
        <WindowFrame
          window={windows.ai}
          icon={windowIcons.ai}
          isActive={activeWindowId === "ai"}
          onFocus={() => handleFocusWindow("ai")}
          onClose={() => handleCloseWindow("ai")}
          onMinimize={() => handleMinimizeWindow("ai")}
          onToggleMaximize={() => handleToggleMaximize("ai")}
          onUpdateBounds={(b) => handleUpdateBounds("ai", b)}
          desktopBounds={desktopBounds}
        >
          <AiCopilot
            currentCode={code}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
            onReplaceCode={(fc) => {
              onApplyFullCode(fc);
              handleOpenAndFocusWindow("code");
            }}
            onRunGame={() => {
              handlePlayRun();
              handleOpenAndFocusWindow("game");
            }}
            activeProcesses={activeProcesses}
            fpgCount={fpg.length}
            resolution={resolution}
            onOpenSettings={onOpenAiSettings}
          />
        </WindowFrame>

        {/* Render Window: FPG Sprite Pack Manager */}
        <WindowFrame
          window={windows.fpg}
          icon={windowIcons.fpg}
          isActive={activeWindowId === "fpg"}
          onFocus={() => handleFocusWindow("fpg")}
          onClose={() => handleCloseWindow("fpg")}
          onMinimize={() => handleMinimizeWindow("fpg")}
          onToggleMaximize={() => handleToggleMaximize("fpg")}
          onUpdateBounds={(b) => handleUpdateBounds("fpg", b)}
          desktopBounds={desktopBounds}
        >
          <FpgEditor
            runtime={runtime}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
            onOpenSpriteEditor={() => handleOpenAndFocusWindow("sprites")}
          />
        </WindowFrame>

        {/* Render Window: Sprite Editor Pixel Art */}
        <WindowFrame
          window={windows.sprites}
          icon={windowIcons.sprites}
          isActive={activeWindowId === "sprites"}
          onFocus={() => handleFocusWindow("sprites")}
          onClose={() => handleCloseWindow("sprites")}
          onMinimize={() => handleMinimizeWindow("sprites")}
          onToggleMaximize={() => handleToggleMaximize("sprites")}
          onUpdateBounds={(b) => handleUpdateBounds("sprites", b)}
          desktopBounds={desktopBounds}
        >
          <SpriteEditor
            fpg={fpg}
            onUpdateFpg={onUpdateFpg}
          />
        </WindowFrame>

        {/* Render Window: ADSR Sound Synthesizer */}
        <WindowFrame
          window={windows.sound}
          icon={windowIcons.sound}
          isActive={activeWindowId === "sound"}
          onFocus={() => handleFocusWindow("sound")}
          onClose={() => handleCloseWindow("sound")}
          onMinimize={() => handleMinimizeWindow("sound")}
          onToggleMaximize={() => handleToggleMaximize("sound")}
          onUpdateBounds={(b) => handleUpdateBounds("sound", b)}
          desktopBounds={desktopBounds}
        >
          <SoundEditor
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
          />
        </WindowFrame>

        {/* Render Window: Mode 8 3D Level Editor */}
        <WindowFrame
          window={windows.mode8}
          icon={windowIcons.mode8}
          isActive={activeWindowId === "mode8"}
          onFocus={() => handleFocusWindow("mode8")}
          onClose={() => handleCloseWindow("mode8")}
          onMinimize={() => handleMinimizeWindow("mode8")}
          onToggleMaximize={() => handleToggleMaximize("mode8")}
          onUpdateBounds={(b) => handleUpdateBounds("mode8", b)}
          desktopBounds={desktopBounds}
        >
          <Mode8LevelEditor
            runtime={runtime}
            onPlay={() => {
              handlePlayRun();
            }}
          />
        </WindowFrame>

        {/* Render Window: Palette Editor */}
        <WindowFrame
          window={windows.palette}
          icon={windowIcons.palette}
          isActive={activeWindowId === "palette"}
          onFocus={() => handleFocusWindow("palette")}
          onClose={() => handleCloseWindow("palette")}
          onMinimize={() => handleMinimizeWindow("palette")}
          onToggleMaximize={() => handleToggleMaximize("palette")}
          onUpdateBounds={(b) => handleUpdateBounds("palette", b)}
          desktopBounds={desktopBounds}
        >
          <PaletteEditor
            runtime={runtime}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
          />
        </WindowFrame>

        {/* Render Window: Map Editor */}
        <WindowFrame
          window={windows.map}
          icon={windowIcons.map}
          isActive={activeWindowId === "map"}
          onFocus={() => handleFocusWindow("map")}
          onClose={() => handleCloseWindow("map")}
          onMinimize={() => handleMinimizeWindow("map")}
          onToggleMaximize={() => handleToggleMaximize("map")}
          onUpdateBounds={(b) => handleUpdateBounds("map", b)}
          desktopBounds={desktopBounds}
        >
          <MapEditor
            runtime={runtime}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
          />
        </WindowFrame>

        {/* Render Window: Font Editor */}
        <WindowFrame
          window={windows.fonts}
          icon={windowIcons.fonts}
          isActive={activeWindowId === "fonts"}
          onFocus={() => handleFocusWindow("fonts")}
          onClose={() => handleCloseWindow("fonts")}
          onMinimize={() => handleMinimizeWindow("fonts")}
          onToggleMaximize={() => handleToggleMaximize("fonts")}
          onUpdateBounds={(b) => handleUpdateBounds("fonts", b)}
          desktopBounds={desktopBounds}
        >
          <FontEditor
            runtime={runtime}
            onCodeInsert={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
            onRunGame={handlePlayRun}
          />
        </WindowFrame>

        {/* Render Window: Explosions */}
        <WindowFrame
          window={windows.explosions}
          icon={windowIcons.explosions}
          isActive={activeWindowId === "explosions"}
          onFocus={() => handleFocusWindow("explosions")}
          onClose={() => handleCloseWindow("explosions")}
          onMinimize={() => handleMinimizeWindow("explosions")}
          onToggleMaximize={() => handleToggleMaximize("explosions")}
          onUpdateBounds={(b) => handleUpdateBounds("explosions", b)}
          desktopBounds={desktopBounds}
        >
          <ExplosionCreator onAddFrames={onAddExplosionFrames} />
        </WindowFrame>

        {/* Render Window: Visual Logic */}
        <WindowFrame
          window={windows.visual}
          icon={windowIcons.visual}
          isActive={activeWindowId === "visual"}
          onFocus={() => handleFocusWindow("visual")}
          onClose={() => handleCloseWindow("visual")}
          onMinimize={() => handleMinimizeWindow("visual")}
          onToggleMaximize={() => handleToggleMaximize("visual")}
          onUpdateBounds={(b) => handleUpdateBounds("visual", b)}
          desktopBounds={desktopBounds}
        >
          <AppInventorWorkspace
            initialCode={code}
            projectName={projectTitle || "MazeGame_2C_07"}
            onChangeCode={onChangeCode}
            onRunGame={handlePlayRun}
            onSwitchToCodeEditor={() => handleOpenAndFocusWindow("code")}
            onSwitchToDesigner={() => handleOpenAndFocusWindow("designer")}
          />
        </WindowFrame>

        {/* Render Window: 3D MD2 Viewer */}
        <WindowFrame
          window={windows.md2viewer}
          icon={windowIcons.md2viewer}
          isActive={activeWindowId === "md2viewer"}
          onFocus={() => handleFocusWindow("md2viewer")}
          onClose={() => handleCloseWindow("md2viewer")}
          onMinimize={() => handleMinimizeWindow("md2viewer")}
          onToggleMaximize={() => handleToggleMaximize("md2viewer")}
          onUpdateBounds={(b) => handleUpdateBounds("md2viewer", b)}
          desktopBounds={desktopBounds}
        >
          <MD2Viewer
            initialModelId="hombre"
            onOpenSpriteGenerator={(model) => {
              setGeneratorModel(model);
              handleOpenAndFocusWindow("spritegenerator");
            }}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
          />
        </WindowFrame>

        {/* Render Window: Sprite Generator from 3D */}
        <WindowFrame
          window={windows.spritegenerator}
          icon={windowIcons.spritegenerator}
          isActive={activeWindowId === "spritegenerator"}
          onFocus={() => handleFocusWindow("spritegenerator")}
          onClose={() => handleCloseWindow("spritegenerator")}
          onMinimize={() => handleMinimizeWindow("spritegenerator")}
          onToggleMaximize={() => handleToggleMaximize("spritegenerator")}
          onUpdateBounds={(b) => handleUpdateBounds("spritegenerator", b)}
          desktopBounds={desktopBounds}
        >
          <SpriteGenerator
            fpg={fpg}
            onUpdateFpg={onUpdateFpg}
            onClose={() => handleCloseWindow("spritegenerator")}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
            initialModel={generatorModel}
          />
        </WindowFrame>

        {/* Theme Settings Modal */}
        <IdeThemeModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
          config={themeConfig}
          onChangeConfig={(newCfg) => {
            setThemeConfig(newCfg);
            saveIdeTheme(newCfg);
          }}
        />

        {/* Quick AI Precode Modal */}
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg bg-[#0f172a] border border-purple-500/60 rounded-xl shadow-2xl p-5 flex flex-col gap-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-sm text-slate-100">
                    Generador de Precódigo IA (WXDIV)
                  </span>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="text-slate-300">
                Describe la función, formulario o comportamiento que deseas crear. El precódigo inteligente generará la estructura exacta en sintaxis DIV:
              </p>

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ejemplo: Formulario de cálculo de nómina con horas extras, retenciones y botón de exportar..."
                className="w-full h-24 bg-[#1e293b] border border-slate-600 rounded p-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleQuickAiGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 shadow"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiGenerating ? "Generando..." : "Generar e Insertar"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile / Tablet Quick MDI Switcher Bar (Smooth Touch Access) */}
      <div className="md:hidden flex items-center justify-around bg-[#c0c0c0] border-t-2 border-white px-1 py-1 text-[11px] font-sans font-bold shadow-lg z-50 flex-shrink-0">
        <button
          onClick={() => handleOpenAndFocusWindow("toolbox")}
          className={`px-2 py-0.5 border text-xs ${
            windows.toolbox.isOpen && activeWindowId === "toolbox"
              ? "bg-[#000080] text-white border-black"
              : "bg-[#d0d0d0] text-black border-white"
          }`}
        >
          Toolbox
        </button>
        <button
          onClick={() => handleOpenAndFocusWindow("designer")}
          className={`px-2 py-0.5 border text-xs ${
            windows.designer.isOpen && activeWindowId === "designer"
              ? "bg-[#000080] text-white border-black"
              : "bg-[#d0d0d0] text-black border-white"
          }`}
        >
          Form1
        </button>
        <button
          onClick={() => handleOpenAndFocusWindow("properties")}
          className={`px-2 py-0.5 border text-xs ${
            windows.properties.isOpen && activeWindowId === "properties"
              ? "bg-[#000080] text-white border-black"
              : "bg-[#d0d0d0] text-black border-white"
          }`}
        >
          Prop
        </button>
        <button
          onClick={() => handleOpenAndFocusWindow("project")}
          className={`px-2 py-0.5 border text-xs ${
            windows.project.isOpen && activeWindowId === "project"
              ? "bg-[#000080] text-white border-black"
              : "bg-[#d0d0d0] text-black border-white"
          }`}
        >
          Proy
        </button>
        <button
          onClick={() => handleOpenAndFocusWindow("code")}
          className={`px-2 py-0.5 border text-xs ${
            windows.code.isOpen && activeWindowId === "code"
              ? "bg-[#000080] text-white border-black"
              : "bg-[#d0d0d0] text-black border-white"
          }`}
        >
          Código
        </button>
        <button
          onClick={handlePlayRun}
          className="px-2 py-0.5 border bg-emerald-700 text-white border-black text-xs font-bold"
        >
          ▶ Run
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 5. VISUAL MDI ENGINE STATUS BAR AT BOTTOM                                */}
      {/* ========================================================================= */}
      <div className="h-6 bg-[#090e1c] border-t border-slate-700/80 px-2 flex items-center justify-between text-[11px] font-mono text-slate-400 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Panel 1: Mode */}
          <div className="flex items-center gap-1.5 font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? "bg-emerald-400 animate-pulse" : "bg-sky-400"
              }`}
            />
            <span className={isRunning ? "text-emerald-300" : "text-sky-300"}>
              {isRunning ? "MODO: EN EJECUCIÓN" : "MODO: DISEÑO"}
            </span>
          </div>

          <span className="text-slate-600">|</span>

          {/* Panel 2: Project */}
          <span className="text-slate-300 truncate max-w-[200px]">
            {currentProjectName}
          </span>

          <span className="text-slate-600">|</span>

          {/* Panel 3: Resolution */}
          <span>{resolution}</span>

          <span className="text-slate-600">|</span>

          {/* Panel 4: Lexicon */}
          <button
            onClick={() => setIsLexiconOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-cyan-300 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
            title="Abrir Manual de Léxico DIV Games Studio (F1)"
          >
            <BookOpen className="w-3 h-3 text-cyan-400" />
            <span>Manual Léxico DIV (F1)</span>
          </button>
        </div>

        {/* Minimized Windows Restore Bar on Right */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {minimizedWindows.map((mId) => (
            <button
              key={mId}
              onClick={() => handleOpenAndFocusWindow(mId)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-sky-900 border border-slate-600 hover:border-sky-500 text-[10px] text-slate-300 flex items-center gap-1 transition-all"
              title={`Restaurar ${windows[mId].title}`}
            >
              <span className="w-3 h-3 flex items-center justify-center">
                {windowIcons[mId]}
              </span>
              <span className="truncate max-w-[100px]">{windows[mId].title}</span>
            </button>
          ))}
          {minimizedWindows.length === 0 && (
            <span className="text-[10px] text-slate-500">
              Listo • WXDIV Runtime
            </span>
          )}
        </div>
      </div>

      {/* Official DIV Games Studio & Visual MDI Engine Lexicon Modal */}
      <DivLexiconModal
        isOpen={isLexiconOpen}
        onClose={() => setIsLexiconOpen(false)}
        onInsertCode={onInsertCode}
      />
    </div>
  );
};
