import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Film,
} from "lucide-react";
import { WindowConfig, WindowId, LayoutPresetType } from "./types";
import { WindowFrame } from "./WindowFrame";
import { DesktopTaskbar } from "./DesktopTaskbar";

// Child components
import { CodeEditor } from "../CodeEditor";
import { GameStage } from "../GameStage";
import { SpriteEditor } from "../SpriteEditor";
import { Mode8LevelEditor } from "../Mode8LevelEditor";
import { SoundEditor } from "../SoundEditor";
import { ExplosionCreator } from "../ExplosionCreator";
import { VisualLogicBuilder } from "../VisualLogicBuilder";
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
import { DivDiagnostic } from "../../engine/divParser";
import { GamePreset } from "../../engine/presets";
import { WXDIVDeskbar } from "../BeOSDeskbar";
import { IdeThemeModal } from "../IdeThemeModal";
import {
  IdeThemeConfig,
  loadIdeTheme,
  saveIdeTheme,
  BACKGROUND_PRESETS,
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
  // External control from IDEHeader / BeOS Deskbar
  requestedActiveTool?: WindowId | null;
  onResetRequestedActiveTool?: () => void;
  // BeOS Deskbar project & studio actions
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

  const [topZIndex, setTopZIndex] = useState(10);
  const [activeWindowId, setActiveWindowId] = useState<WindowId | null>("code");

  // Windows 7 / 10 Style Start Menu (toggled via 'Inicio' button or Win/Esc key)
  const [isWxDivOpen, setIsWxDivOpen] = useState(false);

  // IDE Theme and Wallpaper Customization (DIV Games Studio DOS styles)
  const [themeConfig, setThemeConfig] = useState<IdeThemeConfig>(loadIdeTheme);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Model passed from 3D MD2 viewer to 3D Sprite Generator
  const [generatorModel, setGeneratorModel] = useState<ParsedMD2Model | undefined>(undefined);

  // Initial Window Configuration
  const [windows, setWindows] = useState<Record<WindowId, WindowConfig>>({
    code: {
      id: "code",
      title: "Editor de Código DIV",
      subtitle: "Sintaxis Pascal/DIV",
      category: "core",
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 5,
      x: 188,
      y: 8,
      width: 580,
      height: 660,
      minWidth: 420,
      minHeight: 300,
    },
    game: {
      id: "game",
      title: "Pantalla de Juego",
      subtitle: "Runtime 60 FPS",
      category: "core",
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 6,
      x: 776,
      y: 8,
      width: 580,
      height: 660,
      minWidth: 380,
      minHeight: 320,
    },
    mode8: {
      id: "mode8",
      title: "Editor de Niveles Modo 8",
      subtitle: "3D Raycaster & Laberintos",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 3,
      x: 40,
      y: 30,
      width: 860,
      height: 620,
      minWidth: 500,
      minHeight: 380,
    },
    fpg: {
      id: "fpg",
      title: "Gestor de Paquetes FPG",
      subtitle: "Empaquetador de Sprites & Assets",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 50,
      y: 35,
      width: 920,
      height: 640,
      minWidth: 540,
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
    sprites: {
      id: "sprites",
      title: "Editor de Sprites FPG Paint",
      subtitle: "Pixel Art & CPoints",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 3,
      x: 60,
      y: 40,
      width: 840,
      height: 620,
      minWidth: 480,
      minHeight: 360,
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
    palette: {
      id: "palette",
      title: "Gestor de Paletas DIV (.PAL)",
      subtitle: "256 Colores VGA, Degradados y Roll",
      category: "graphics",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
      x: 85,
      y: 50,
      width: 880,
      height: 620,
      minWidth: 520,
      minHeight: 400,
    },
    sound: {
      id: "sound",
      title: "Sintetizador de Sonidos ADSR",
      subtitle: "Generador de Ondas Retro",
      category: "audio",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 3,
      x: 80,
      y: 50,
      width: 780,
      height: 580,
      minWidth: 440,
      minHeight: 350,
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
    ai: {
      id: "ai",
      title: "Copiloto Asistente IA",
      subtitle: "Gemini 2.5 Coding AI",
      category: "tools",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 3,
      x: 140,
      y: 80,
      width: 720,
      height: 580,
      minWidth: 400,
      minHeight: 350,
    },
    processes: {
      id: "processes",
      title: "Inspector de Procesos",
      subtitle: "Depuración en Vivo",
      category: "tools",
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 3,
      x: 160,
      y: 90,
      width: 680,
      height: 520,
      minWidth: 400,
      minHeight: 320,
    },
    md2viewer: {
      id: "md2viewer",
      title: "Visor de Modelos 3D (MD2 / MD3)",
      subtitle: "Mallas Poligonales & Animación de Vértices",
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

  // Track Desktop workspace size via ResizeObserver with subpixel damping to prevent layout jumps
  useEffect(() => {
    if (!desktopRef.current) return;

    let lastKnownWidth = 0;
    let lastKnownHeight = 0;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          if (Math.abs(lastKnownWidth - width) < 3 && Math.abs(lastKnownHeight - height) < 3) {
            continue;
          }
          lastKnownWidth = width;
          lastKnownHeight = height;

          setDesktopBounds({ width, height });

          // Keep all open windows inside bounds on screen resize
          setWindows((curr) => {
            let changed = false;
            const next = { ...curr };
            (Object.keys(next) as WindowId[]).forEach((id) => {
              const w = next[id];
              if (w.isOpen && !w.isMaximized) {
                const maxX = Math.max(0, width - 80);
                const maxY = Math.max(0, height - 40);
                const clampedX = Math.max(0, Math.min(w.x, maxX));
                const clampedY = Math.max(0, Math.min(w.y, maxY));
                if (clampedX !== w.x || clampedY !== w.y) {
                  next[id] = { ...w, x: clampedX, y: clampedY };
                  changed = true;
                }
              }
            });
            return changed ? next : curr;
          });
        }
      }
    });

    observer.observe(desktopRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle external open/switch requests from IDEHeader / BeOS Deskbar
  useEffect(() => {
    if (requestedActiveTool) {
      handleOpenAndFocusWindow(requestedActiveTool);
      if (onResetRequestedActiveTool) {
        onResetRequestedActiveTool();
      }
    }
  }, [requestedActiveTool]);

  // Elevate window to top z-index
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

  // Focus Window
  const handleFocusWindow = useCallback((id: WindowId) => {
    bringToFront(id);
  }, [bringToFront]);

  // Open & Focus window
  const handleOpenAndFocusWindow = useCallback((id: WindowId) => {
    setWindows((curr) => {
      const target = curr[id];
      return {
        ...curr,
        [id]: {
          ...target,
          isOpen: true,
          isMinimized: false,
        },
      };
    });
    bringToFront(id);
  }, [bringToFront]);

  // Close window
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

  // Minimize window
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

  // Toggle maximize / restore with guaranteed safe bounds
  const handleToggleMaximize = useCallback((id: WindowId) => {
    setWindows((curr) => {
      const win = curr[id];
      if (win.isMaximized) {
        // Restore safely within viewport
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
        // Maximize
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

  // Re-organize all windows neatly to fit inside the visible screen
  const handleResetWindowsToView = useCallback(() => {
    const dw = desktopBounds.width;
    const dh = desktopBounds.height;
    const margin = 10;
    const usableW = Math.max(360, dw - margin * 2);
    const usableH = Math.max(300, dh - margin * 2);

    setWindows((curr) => {
      const next = { ...curr };

      if (dw >= 960) {
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
        const halfH = Math.floor((usableH - margin) / 2);
        next.code = {
          ...next.code,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          x: margin,
          y: margin,
          width: usableW,
          height: halfH,
          zIndex: 10,
        };
        next.game = {
          ...next.game,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          x: margin,
          y: margin + halfH + margin,
          width: usableW,
          height: halfH,
          zIndex: 11,
        };
      }

      // Cascade any additional open windows
      let cascadeIndex = 0;
      (Object.keys(next) as WindowId[]).forEach((id) => {
        if (id !== "code" && id !== "game") {
          const w = next[id];
          if (w.isOpen) {
            const fitW = Math.min(w.width, dw - 40);
            const fitH = Math.min(w.height, dh - 50);
            const posX = Math.max(margin, Math.min(40 + cascadeIndex * 24, dw - fitW - margin));
            const posY = Math.max(margin, Math.min(30 + cascadeIndex * 24, dh - fitH - margin));
            next[id] = {
              ...w,
              isMinimized: false,
              isMaximized: false,
              x: posX,
              y: posY,
              width: fitW,
              height: fitH,
            };
            cascadeIndex++;
          }
        }
      });

      return next;
    });
    setActiveWindowId("code");
  }, [desktopBounds]);

  // Update bounds after dragging or resizing
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

  // Toggle window from taskbar
  const handleToggleTaskbarWindow = useCallback(
    (id: WindowId) => {
      const win = windows[id];
      if (!win.isOpen) {
        handleOpenAndFocusWindow(id);
      } else if (win.isMinimized) {
        setWindows((curr) => ({
          ...curr,
          [id]: { ...curr[id], isMinimized: false },
        }));
        bringToFront(id);
      } else if (activeWindowId === id) {
        // Active clicked -> minimize
        handleMinimizeWindow(id);
      } else {
        // Inactive clicked -> bring to front
        bringToFront(id);
      }
    },
    [windows, activeWindowId, handleOpenAndFocusWindow, bringToFront, handleMinimizeWindow]
  );

  // Minimize all
  const handleMinimizeAll = useCallback(() => {
    setWindows((curr) => {
      const next = { ...curr };
      (Object.keys(next) as WindowId[]).forEach((id) => {
        if (next[id].isOpen) {
          next[id] = { ...next[id], isMinimized: true };
        }
      });
      return next;
    });
    setActiveWindowId(null);
  }, []);

  // Restore all open
  const handleRestoreAll = useCallback(() => {
    setWindows((curr) => {
      const next = { ...curr };
      (Object.keys(next) as WindowId[]).forEach((id) => {
        if (next[id].isOpen) {
          next[id] = { ...next[id], isMinimized: false };
        }
      });
      return next;
    });
  }, []);

  // Layout Presets
  const handleApplyLayoutPreset = useCallback(
    (preset: LayoutPresetType) => {
      const dw = desktopBounds.width;
      const dh = desktopBounds.height;
      const margin = 8;
      const usableW = Math.max(400, dw - margin * 2);
      const usableH = Math.max(300, dh - margin * 2);

      setWindows((curr) => {
        const next = { ...curr };

        // Helper to reset maximize on all
        (Object.keys(next) as WindowId[]).forEach((id) => {
          next[id] = { ...next[id], isMaximized: false };
        });

        if (preset === "code-game") {
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
        } else if (preset === "mode8-game") {
          const leftW = Math.floor(usableW * 0.54);
          next.mode8 = {
            ...next.mode8,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin,
            width: leftW,
            height: usableH,
            zIndex: 10,
          };
          next.game = {
            ...next.game,
            isOpen: true,
            isMinimized: false,
            x: margin + leftW + margin,
            y: margin,
            width: usableW - leftW - margin,
            height: usableH,
            zIndex: 11,
          };
        } else if (preset === "sprites-game") {
          const leftW = Math.floor(usableW * 0.54);
          next.sprites = {
            ...next.sprites,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin,
            width: leftW,
            height: usableH,
            zIndex: 10,
          };
          next.game = {
            ...next.game,
            isOpen: true,
            isMinimized: false,
            x: margin + leftW + margin,
            y: margin,
            width: usableW - leftW - margin,
            height: usableH,
            zIndex: 11,
          };
        } else if (preset === "sound-code") {
          const halfW = Math.floor((usableW - margin) / 2);
          next.sound = {
            ...next.sound,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin,
            width: halfW,
            height: usableH,
            zIndex: 10,
          };
          next.code = {
            ...next.code,
            isOpen: true,
            isMinimized: false,
            x: margin + halfW + margin,
            y: margin,
            width: usableW - halfW - margin,
            height: usableH,
            zIndex: 11,
          };
        } else if (preset === "quadrant") {
          const halfW = Math.floor((usableW - margin) / 2);
          const halfH = Math.floor((usableH - margin) / 2);
          // Top-Left: Code
          next.code = {
            ...next.code,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin,
            width: halfW,
            height: halfH,
            zIndex: 10,
          };
          // Top-Right: Game
          next.game = {
            ...next.game,
            isOpen: true,
            isMinimized: false,
            x: margin + halfW + margin,
            y: margin,
            width: halfW,
            height: halfH,
            zIndex: 11,
          };
          // Bottom-Left: Mode8
          next.mode8 = {
            ...next.mode8,
            isOpen: true,
            isMinimized: false,
            x: margin,
            y: margin + halfH + margin,
            width: halfW,
            height: halfH,
            zIndex: 12,
          };
          // Bottom-Right: Sprites
          next.sprites = {
            ...next.sprites,
            isOpen: true,
            isMinimized: false,
            x: margin + halfW + margin,
            y: margin + halfH + margin,
            width: halfW,
            height: halfH,
            zIndex: 13,
          };
        } else if (preset === "cascade") {
          const openIds = (Object.keys(next) as WindowId[]).filter((k) => next[k].isOpen);
          const defaultW = Math.min(680, usableW - 80);
          const defaultH = Math.min(500, usableH - 80);
          openIds.forEach((id, idx) => {
            next[id] = {
              ...next[id],
              isMinimized: false,
              x: Math.min(usableW - defaultW, margin + idx * 36),
              y: Math.min(usableH - defaultH, margin + idx * 36),
              width: defaultW,
              height: defaultH,
              zIndex: 10 + idx,
            };
          });
        } else if (preset === "game-max") {
          next.game = {
            ...next.game,
            isOpen: true,
            isMinimized: false,
            isMaximized: true,
            zIndex: 20,
          };
        } else if (preset === "code-max") {
          next.code = {
            ...next.code,
            isOpen: true,
            isMinimized: false,
            isMaximized: true,
            zIndex: 20,
          };
        }

        return next;
      });

      if (preset === "game-max") setActiveWindowId("game");
      else if (preset === "code-max") setActiveWindowId("code");
      else if (preset === "mode8-game") setActiveWindowId("mode8");
      else if (preset === "sprites-game") setActiveWindowId("sprites");
      else setActiveWindowId("code");
    },
    [desktopBounds]
  );

  // Window Icons lookup
  const windowIcons: Record<WindowId, React.ReactNode> = {
    game: <Gamepad2 className="w-3.5 h-3.5" />,
    code: <FileCode className="w-3.5 h-3.5" />,
    mode8: <Compass className="w-3.5 h-3.5" />,
    fpg: <Package className="w-3.5 h-3.5 text-cyan-400" />,
    map: <FileImage className="w-3.5 h-3.5 text-emerald-400" />,
    sprites: <Paintbrush className="w-3.5 h-3.5" />,
    fonts: <Type className="w-3.5 h-3.5" />,
    palette: <PaletteIcon className="w-3.5 h-3.5 text-amber-400" />,
    sound: <Volume2 className="w-3.5 h-3.5" />,
    explosions: <Flame className="w-3.5 h-3.5" />,
    visual: <Wand2 className="w-3.5 h-3.5" />,
    ai: <Sparkles className="w-3.5 h-3.5" />,
    processes: <Cpu className="w-3.5 h-3.5" />,
    md2viewer: <Box className="w-3.5 h-3.5 text-emerald-400" />,
    spritegenerator: <Film className="w-3.5 h-3.5 text-cyan-400" />,
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
      {/* Desktop Workspace Canvas */}
      <div
        ref={desktopRef}
        id="desktop-canvas"
        className="flex-1 w-full h-full relative overflow-hidden bg-[#050811] select-none transition-colors duration-300"
        style={{
          ...BACKGROUND_PRESETS[themeConfig.backgroundId]?.style(themeConfig),
        }}
      >
        {/* Optional CRT Scanlines Effect */}
        {themeConfig.crtScanlines && (
          <div
            id="crt-scanlines-overlay"
            className="absolute inset-0 pointer-events-none z-20 opacity-70"
            style={{
              background:
                "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))",
              backgroundSize: "100% 3px, 6px 100%",
            }}
          />
        )}
        {/* Render Window: Code Editor */}
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
            onRun={onRunGame}
            onAskAiFix={(diag: DivDiagnostic) => {
              handleOpenAndFocusWindow("ai");
            }}
          />
        </WindowFrame>

        {/* Render Window: Game Runtime Stage */}
        <WindowFrame
          window={windows.game}
          icon={windowIcons.game}
          isActive={activeWindowId === "game"}
          onFocus={() => handleFocusWindow("game")}
          onClose={() => handleCloseWindow("game")}
          onMinimize={() => handleMinimizeWindow("game")}
          onToggleMaximize={() => handleToggleMaximize("game")}
          onUpdateBounds={(b) => handleUpdateBounds("game", b)}
          desktopBounds={desktopBounds}
        >
          <GameStage runtime={runtime} onRestart={onRestartGame} />
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
            fpg={fpg}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
          />
        </WindowFrame>

        {/* Render Window: FPG Package Manager */}
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

        {/* Render Window: MAP Editor */}
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

        {/* Render Window: Sprites Paint Editor */}
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
          <SpriteEditor fpg={fpg} onUpdateFpg={onUpdateFpg} />
        </WindowFrame>

        {/* Render Window: Font Editor (.FNT) */}
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
            onRunGame={onRunGame}
          />
        </WindowFrame>

        {/* Render Window: Palette Editor (.PAL) */}
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

        {/* Render Window: Sound Synth Editor */}
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

        {/* Render Window: Explosion Creator */}
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
          <ExplosionCreator
            fpg={fpg}
            onAddFramesToFpg={onAddExplosionFrames}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
          />
        </WindowFrame>

        {/* Render Window: Visual Logic Builder */}
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
            fpg={fpg}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
          />
        </WindowFrame>

        {/* Render Window: AI Copilot */}
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
            fpg={fpg}
            onApplyCode={(c) => {
              onApplyFullCode(c);
              handleOpenAndFocusWindow("code");
            }}
            onInsertCode={(snip) => {
              onInsertCode(snip);
              handleOpenAndFocusWindow("code");
            }}
            onOpenAiSettings={onOpenAiSettings}
          />
        </WindowFrame>

        {/* Render Window: Process Inspector */}
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
          <ProcessInspector runtime={runtime} processes={activeProcesses} />
        </WindowFrame>

        {/* Render Window: MD2 / MD3 3D Model Viewer */}
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

        {/* Render Window: Sprite Generator from 3D (DIV Games Studio 2 style) */}
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

        {/* WXDIV Controller: Hidden by default, toggled via 'DIV Ventanas' button */}
        <WXDIVDeskbar
          isOpen={isWxDivOpen}
          onClose={() => setIsWxDivOpen(false)}
          currentPresetId={currentPresetId || "shmup"}
          onSelectPreset={onSelectPreset || (() => {})}
          onOpenWindow={handleOpenAndFocusWindow}
          resolution={resolution}
          onChangeResolution={onChangeResolution || (() => {})}
          isRunning={runtime.isRunning}
          onRun={onRunGame}
          onRestart={onRestartGame}
          onOpenNewProject={onOpenNewProject || (() => {})}
          onOpenExport={onOpenExport || (() => {})}
          onQuickExportZip={onQuickExportZip}
          onOpenCloudSync={onOpenCloudSync || (() => {})}
          onOpenAiSettings={onOpenAiSettings}
          onOpenThemeConfig={() => setIsThemeModalOpen(true)}
          onApplyLayoutPreset={handleApplyLayoutPreset}
          onResetWindows={handleResetWindowsToView}
          onMinimizeAllWindows={handleMinimizeAll}
          onRestoreAllWindows={handleRestoreAll}
          activeProcessCount={activeProcesses.length}
        />

        {/* IDE Theme, Background and CRT Configuration Modal */}
        <IdeThemeModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
          config={themeConfig}
          onChangeConfig={(newCfg) => {
            setThemeConfig(newCfg);
            saveIdeTheme(newCfg);
          }}
        />
      </div>

      {/* Retro-Futuristic DIV Desktop Taskbar */}
      <DesktopTaskbar
        windows={windows}
        activeWindowId={activeWindowId}
        onFocusWindow={handleFocusWindow}
        onToggleWindow={handleToggleTaskbarWindow}
        onApplyLayoutPreset={handleApplyLayoutPreset}
        onMinimizeAll={handleMinimizeAll}
        onRestoreAll={handleRestoreAll}
        onResetWindows={handleResetWindowsToView}
        isWxDivOpen={isWxDivOpen}
        onToggleWxDiv={() => setIsWxDivOpen((prev) => !prev)}
        onOpenThemeConfig={() => setIsThemeModalOpen(true)}
        windowIcons={windowIcons}
        activeProcessCount={activeProcesses.length}
        resolution={resolution}
        isRunning={runtime.isRunning}
      />
    </div>
  );
};
