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
import { FormDesigner } from "../FormDesigner";
import { AiCopilot } from "../AiCopilot";
import { ProcessInspector } from "../ProcessInspector";
import { FontEditor } from "../FontEditor";
import { FpgEditor } from "../FpgEditor";
import { MapEditor } from "../MapEditor";
import { PaletteEditor } from "../PaletteEditor";
import { MD2Viewer } from "../MD2Viewer";
import { SpriteGenerator } from "../SpriteGenerator";
import { ParsedMD2Model } from "../../engine/md2Parser";

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
  const [activeWindowId, setActiveWindowId] = useState<WindowId | null>("designer");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Runtime running state for Visual Basic toolbar
  const [isRunning, setIsRunning] = useState(false);

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
    const p = PRESETS.find((pr) => pr.id === currentPresetId);
    return p ? p.name : "Proyecto_WXDIV";
  }, [currentPresetId]);

  // Initial Window Configuration - Visual Basic 5.0 MDI Architecture
  const [windows, setWindows] = useState<Record<WindowId, WindowConfig>>({
    designer: {
      id: "designer",
      title: "frmMain [Formulario]",
      subtitle: "Diseñador Visual WYSIWYG • Controles DIV",
      category: "core",
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 10,
      x: 14,
      y: 10,
      width: 660,
      height: 640,
      minWidth: 460,
      minHeight: 360,
    },
    code: {
      id: "code",
      title: "frmMain [Código]",
      subtitle: "Editor Integrado • Léxico DIV & Eventos",
      category: "core",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 8,
      x: 350,
      y: 10,
      width: 640,
      height: 640,
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
      x: 686,
      y: 10,
      width: 580,
      height: 640,
      minWidth: 380,
      minHeight: 320,
    },
    processes: {
      id: "processes",
      title: "Inmediato & Depuración",
      subtitle: "Consola de Procesos y Expresiones",
      category: "tools",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 5,
      x: 14,
      y: 450,
      width: 660,
      height: 200,
      minWidth: 360,
      minHeight: 160,
    },
    ai: {
      id: "ai",
      title: "Asistente IA WXDIV",
      subtitle: "Generador de Precódigo & Copiloto",
      category: "tools",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 6,
      x: 100,
      y: 40,
      width: 720,
      height: 580,
      minWidth: 400,
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
      title: "Constructor Visual de Lógica",
      subtitle: "Bloques de Acción DIV",
      category: "core",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 3,
      x: 120,
      y: 70,
      width: 740,
      height: 560,
      minWidth: 420,
      minHeight: 340,
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
          setDesktopBounds({ width, height });
        }
      }
    });
    observer.observe(desktopRef.current);
    return () => observer.disconnect();
  }, []);

  // Sync isRunning with runtime
  useEffect(() => {
    setIsRunning(runtime.isRunning);
    const interval = setInterval(() => {
      if (runtime.isRunning !== isRunning) {
        setIsRunning(runtime.isRunning);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [runtime, isRunning]);

  // Window Focus & Bring to front
  const bringToFront = useCallback((id: WindowId) => {
    setTopZIndex((prev) => {
      const next = prev + 1;
      setWindows((curr) => ({
        ...curr,
        [id]: {
          ...curr[id],
          zIndex: next,
        },
      }));
      return next;
    });
    setActiveWindowId(id);
  }, []);

  const handleFocusWindow = useCallback((id: WindowId) => {
    bringToFront(id);
  }, [bringToFront]);

  const handleOpenAndFocusWindow = useCallback((id: WindowId) => {
    setWindows((curr) => ({
      ...curr,
      [id]: {
        ...curr[id],
        isOpen: true,
        isMinimized: false,
      },
    }));
    bringToFront(id);
  }, [bringToFront]);

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
      setWindows((curr) => ({
        ...curr,
        [id]: {
          ...curr[id],
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      }));
    },
    []
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

  // Execution Handlers (Visual Basic 5 F5 Play / Stop)
  const handlePlayRun = useCallback(() => {
    onRunGame();
    setIsRunning(true);
    handleOpenAndFocusWindow("game");
  }, [onRunGame, handleOpenAndFocusWindow]);

  const handleStopRun = useCallback(() => {
    runtime.stop();
    setIsRunning(false);
    handleFocusWindow("designer");
  }, [runtime, handleFocusWindow]);

  // Layout Presets (Visual Basic 5.0)
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
          const leftW = Math.floor(usableW * 0.56);
          next.designer = {
            ...next.designer,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin,
            width: leftW,
            height: usableH,
            zIndex: 10,
          };
          next.code = {
            ...next.code,
            isOpen: true,
            isMinimized: false,
            x: margin + leftW + margin,
            y: margin,
            width: usableW - leftW - margin,
            height: Math.floor(usableH * 0.65),
            zIndex: 9,
          };
          next.processes = {
            ...next.processes,
            isOpen: true,
            isMinimized: false,
            x: margin + leftW + margin,
            y: margin + Math.floor(usableH * 0.65) + margin,
            width: usableW - leftW - margin,
            height: usableH - Math.floor(usableH * 0.65) - margin,
            zIndex: 8,
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

  // Keyboard Shortcuts: F5 (Iniciar / Ejecutar), F7 (Código), Shift+F7 (Diseñador), Ctrl+N (Nuevo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5" && !e.ctrlKey && !e.shiftKey) {
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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, handlePlayRun, handleStopRun, handleOpenAndFocusWindow, onOpenNewProject]);

  // Handle external requested tool
  useEffect(() => {
    if (requestedActiveTool) {
      handleOpenAndFocusWindow(requestedActiveTool);
      onResetRequestedActiveTool?.();
    }
  }, [requestedActiveTool, handleOpenAndFocusWindow, onResetRequestedActiveTool]);

  // Window Icons lookup
  const windowIcons: Record<WindowId, React.ReactNode> = {
    designer: <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />,
    code: <FileCode className="w-3.5 h-3.5 text-emerald-400" />,
    game: <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />,
    processes: <Terminal className="w-3.5 h-3.5 text-cyan-400" />,
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
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none bg-[#0a0f1d] text-slate-100 font-sans">
      {/* ========================================================================= */}
      {/* 1. VISUAL BASIC 5.0 TOP TITLEBAR                                          */}
      {/* ========================================================================= */}
      <div className="h-7 bg-[#0b1329] border-b border-slate-700/80 px-2 flex items-center justify-between text-xs select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-cyan-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            W
          </div>
          <span className="font-bold tracking-tight text-slate-100">
            WXDIV Studio
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            • [{currentProjectName}] • [{isRunning ? "En ejecución" : "Diseño"}]
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? "bg-emerald-400 animate-pulse" : "bg-sky-400"
              }`}
            />
            {isRunning ? "60 FPS LIVE" : "MODO DISEÑO"}
          </span>
          <span className="hidden md:inline-block text-slate-500">|</span>
          <span className="hidden md:inline-block">Canvas 2D • Léxico DIV</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. VISUAL BASIC 5.0 MAIN MENU BAR                                         */}
      {/* ========================================================================= */}
      <div className="vb-menu-root relative h-6 bg-[#0f172a] border-b border-slate-800 px-1 flex items-center gap-0.5 text-xs text-slate-300 flex-shrink-0">
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
            <div className="absolute top-6 left-0 w-60 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs text-slate-200 divide-y divide-slate-800">
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
                <button
                  onClick={() => { setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Save className="w-3.5 h-3.5 text-emerald-400" /> Guardar Proyecto</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+S</span>
                </button>
              </div>
              <div className="py-1">
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
            <div className="absolute top-6 left-0 w-52 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs text-slate-200">
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
            <div className="absolute top-6 left-0 w-64 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs text-slate-200 divide-y divide-slate-800">
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
                  onClick={() => { handleOpenAndFocusWindow("processes"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-cyan-400" /> Ventana Inmediato</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+G</span>
                </button>
                <button
                  onClick={() => { handlePlayRun(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Gamepad2 className="w-3.5 h-3.5 text-amber-400" /> Ejecución Canvas 2D</span>
                  <span className="text-[10px] text-slate-400 font-mono">F5</span>
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
                  onClick={() => { handleOpenAndFocusWindow("palette"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
                >
                  <PaletteIcon className="w-3.5 h-3.5 text-yellow-400" /> Paletas VGA (.pal)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Proyecto */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "proyecto" ? null : "proyecto")}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 hover:text-white transition-colors ${
              activeMenu === "proyecto" ? "bg-sky-700 text-white" : ""
            }`}
          >
            Proyecto
          </button>
          {activeMenu === "proyecto" && (
            <div className="absolute top-6 left-0 w-60 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs text-slate-200">
              <button
                onClick={() => { handleOpenAndFocusWindow("designer"); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
              >
                + Agregar Formulario (Form)
              </button>
              <button
                onClick={() => { handleOpenAndFocusWindow("code"); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
              >
                + Agregar Módulo DIV (modMain.div)
              </button>
              <button
                onClick={() => { handleOpenAndFocusWindow("fpg"); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
              >
                + Administrar Recursos FPG
              </button>
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
            <div className="absolute top-6 left-0 w-52 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs text-slate-200">
              <button
                onClick={() => { handlePlayRun(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex items-center justify-between text-emerald-400 hover:text-white font-semibold"
              >
                <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5 fill-current" /> Iniciar</span>
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

        {/* IA Asistente */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === "ia" ? null : "ia")}
            className={`px-2 py-0.5 rounded text-[11px] text-purple-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1 ${
              activeMenu === "ia" ? "bg-purple-900 text-white" : ""
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>IA Asistente</span>
          </button>
          {activeMenu === "ia" && (
            <div className="absolute top-6 left-0 w-64 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs text-slate-200">
              <button
                onClick={() => { setIsAiModalOpen(true); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-purple-600 hover:text-white flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Generar con IA (Pre-código)
              </button>
              <button
                onClick={() => { handleOpenAndFocusWindow("ai"); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-purple-600 hover:text-white flex items-center gap-2"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Abrir Copiloto IA Completo
              </button>
              <button
                onClick={() => { onOpenAiSettings(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-purple-600 hover:text-white flex items-center gap-2"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" /> Configuración de API / Modelo
              </button>
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
            <div className="absolute top-6 left-0 w-60 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs text-slate-200">
              <button
                onClick={() => { handleApplyLayoutPreset("vb5-classic"); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-semibold text-sky-300"
              >
                ★ Disposición VB5 Clásica
              </button>
              <button
                onClick={() => { handleApplyLayoutPreset("code-designer"); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
              >
                Mosaico: Código + Formulario (50/50)
              </button>
              <button
                onClick={() => { handleApplyLayoutPreset("code-game"); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
              >
                Mosaico: Código + Ejecución Canvas
              </button>
              <button
                onClick={() => { handleApplyLayoutPreset("quadrant"); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
              >
                Cuadrantes MDI (4 Ventanas)
              </button>
              <div className="h-[1px] bg-slate-800 my-1" />
              <button
                onClick={() => { setIsThemeModalOpen(true); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
              >
                Fondo y Apariencia del IDE...
              </button>
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
            <div className="absolute top-6 left-0 w-56 bg-[#0f172a] border border-slate-700 rounded shadow-2xl py-1 z-50 text-xs text-slate-200">
              <button
                onClick={() => setActiveMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" /> Manual de Léxico DIV
              </button>
              <button
                onClick={() => setActiveMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
              >
                Tutorial Visual Basic 5 MDI
              </button>
              <div className="h-[1px] bg-slate-800 my-1" />
              <div className="px-3 py-1.5 text-[11px] text-slate-400">
                WXDIV Studio v5.0.0
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL BASIC 5.0 STANDARD TOOLBAR                                      */}
      {/* ========================================================================= */}
      <div className="h-9 bg-[#111c38] border-b border-slate-700/80 px-2 flex items-center justify-between text-xs text-slate-300 flex-shrink-0 gap-2 overflow-x-auto">
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

          {/* VB5 Iniciar / Pausa / Terminar (Execution controls) */}
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

          {/* Quick Windows Toggles */}
          <button
            onClick={() => handleOpenAndFocusWindow("code")}
            className="px-2 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1.5 text-xs font-mono"
            title="Ver Código (F7)"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Código</span>
          </button>

          <button
            onClick={() => handleOpenAndFocusWindow("designer")}
            className="px-2 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1.5 text-xs font-mono"
            title="Ver Objeto / Diseñador (Shift+F7)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">Objeto</span>
          </button>

          <button
            onClick={() => handleOpenAndFocusWindow("processes")}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Ventana Inmediato & Depurador (Ctrl+G)"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
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
                VB5 Clásico
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

          {/* AI Precode Quick Assistant */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-600/70 text-purple-200 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            title="Asistente de Precódigo Inteligente IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Asistente IA</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. VISUAL BASIC 5.0 MDI CLIENT WORKSPACE                                  */}
      {/* ========================================================================= */}
      <div
        ref={desktopRef}
        id="mdi-workspace"
        style={{
          backgroundColor: themeConfig.backgroundColor || "#121b2d",
          backgroundImage: "radial-gradient(circle, #253350 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
        className="relative flex-1 w-full overflow-hidden select-none"
      >
        {/* Render Window: Form Designer (Visual Basic 5.0 Style) */}
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
          <FormDesigner
            runtime={runtime}
            onInsertCode={onInsertCode}
            onApplyFullCode={onApplyFullCode}
            onRunPreview={handlePlayRun}
            onSwitchToCode={() => handleOpenAndFocusWindow("code")}
            onSwitchToGame={handlePlayRun}
            onOpenTool={handleOpenAndFocusWindow}
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
            onRestart={onRestartGame}
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
            fpg={fpg}
            onUpdateFpg={onUpdateFpg}
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
            onUpdateGraphic={(updated) => {
              const newFpg = fpg.map((g) => (g.id === updated.id ? updated : g));
              onUpdateFpg(newFpg);
            }}
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
          <SoundEditor />
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
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
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
          <VisualLogicBuilder
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
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
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
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

      {/* ========================================================================= */}
      {/* 5. VISUAL BASIC 5.0 STATUS BAR AT BOTTOM                                 */}
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
          <span className="hidden sm:inline-block text-slate-400">
            Léxico DIV v3.0 • Canvas 2D
          </span>
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
    </div>
  );
};
