import React, { useState, useEffect, useRef } from "react";
import {
  LayoutGrid,
  Maximize2,
  FolderKanban,
  FolderPlus,
  Columns2,
  Grid2X2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronUp,
  Cpu,
  Tv,
  Palette,
} from "lucide-react";
import { WindowConfig, WindowId, LayoutPresetType } from "./types";

interface DesktopTaskbarProps {
  windows: Record<WindowId, WindowConfig>;
  activeWindowId: WindowId | null;
  onFocusWindow: (id: WindowId) => void;
  onToggleWindow: (id: WindowId) => void;
  onApplyLayoutPreset: (preset: LayoutPresetType) => void;
  onMinimizeAll: () => void;
  onRestoreAll: () => void;
  onResetWindows?: () => void;
  isWxDivOpen?: boolean;
  onToggleWxDiv?: () => void;
  onOpenNewProject?: () => void;
  onOpenThemeConfig?: () => void;
  windowIcons: Record<WindowId, React.ReactNode>;
  activeProcessCount: number;
  resolution: string;
  isRunning: boolean;
}

export const DesktopTaskbar: React.FC<DesktopTaskbarProps> = ({
  windows,
  activeWindowId,
  onFocusWindow,
  onToggleWindow,
  onApplyLayoutPreset,
  onMinimizeAll,
  onRestoreAll,
  onResetWindows,
  isWxDivOpen = false,
  onToggleWxDiv,
  onOpenNewProject,
  onOpenThemeConfig,
  windowIcons,
  activeProcessCount,
  resolution,
  isRunning,
}) => {
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  const startMenuRef = useRef<HTMLDivElement>(null);
  const layoutMenuRef = useRef<HTMLDivElement>(null);

  // Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        startMenuRef.current &&
        !startMenuRef.current.contains(e.target as Node)
      ) {
        setIsStartMenuOpen(false);
      }
      if (
        layoutMenuRef.current &&
        !layoutMenuRef.current.contains(e.target as Node)
      ) {
        setIsLayoutMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const openWindows = (Object.keys(windows) as WindowId[]).filter(
    (id) => windows[id].isOpen
  );

  const categories = [
    {
      label: "Desarrollo y Ejecución",
      ids: ["code", "game", "designer", "visual"] as WindowId[],
    },
    {
      label: "Gráficos, FPG, MAP, Paletas y Fuentes",
      ids: ["fpg", "map", "sprites", "palette", "fonts", "mode8", "md2viewer", "spritegenerator", "explosions"] as WindowId[],
    },
    {
      label: "Audio e Inteligencia",
      ids: ["sound", "ai", "processes"] as WindowId[],
    },
  ];

  return (
    <footer
      id="desktop-taskbar"
      className="h-10 bg-[#090e1b] border-t border-slate-800 text-slate-300 px-2 flex items-center justify-between gap-2 z-40 select-none flex-shrink-0 relative font-sans"
    >
      {/* Left: Start / Utilities Menu */}
      <div className="flex items-center gap-1.5 flex-shrink-0" ref={startMenuRef}>
        <button
          id="btn-taskbar-start"
          onClick={() => {
            if (onToggleWxDiv) {
              onToggleWxDiv();
            } else {
              setIsStartMenuOpen(!isStartMenuOpen);
            }
          }}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all border shadow-sm ${
            isWxDivOpen
              ? "bg-[#163573] border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400/50"
              : "bg-gradient-to-b from-[#16274a] to-[#0d1933] hover:from-[#1d3361] hover:to-[#122347] border-[#2f497a] text-slate-100 hover:text-white hover:border-cyan-500/60"
          }`}
          title="Menú Inicio DIV Games Studio (Estilo Windows 7 / 10)"
        >
          {/* Windows-style 4-color Tiled Logo */}
          <div className="w-3.5 h-3.5 grid grid-cols-2 gap-0.5 flex-shrink-0">
            <span className="bg-amber-400 rounded-xs" />
            <span className="bg-cyan-400 rounded-xs" />
            <span className="bg-blue-500 rounded-xs" />
            <span className="bg-emerald-400 rounded-xs" />
          </div>
          <span className="font-bold tracking-wide text-xs">Inicio</span>
          <ChevronUp className={`w-3 h-3 text-cyan-300 transition-transform ${isWxDivOpen ? "rotate-180 text-cyan-200" : ""}`} />
        </button>

        {/* Start Menu Popover */}
        {isStartMenuOpen && (
          <div className="absolute bottom-11 left-2 w-80 bg-[#080d1a] border border-slate-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-cyan-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-100 font-mono">
                  SISTEMA DE VENTANAS WXDIV
                </span>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">DIV 3.0</span>
            </div>

            {onToggleWxDiv && (
              <div className="p-2 border-b border-slate-800 bg-slate-950/50 space-y-1.5">
                <button
                  onClick={() => {
                    onToggleWxDiv();
                    setIsStartMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-xs font-mono font-semibold flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1 py-0.2 bg-amber-400 text-slate-950 font-black text-[10px] rounded">DIV</span>
                    <span>{isWxDivOpen ? "Ocultar Controlador WXDIV" : "Abrir Controlador WXDIV"}</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold">F5</span>
                </button>

                {onOpenNewProject && (
                  <button
                    onClick={() => {
                      onOpenNewProject();
                      setIsStartMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded bg-gradient-to-r from-blue-950 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 border border-blue-600/50 text-blue-200 text-xs font-semibold flex items-center justify-between transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
                      <span>Nuevo Proyecto (Asistente Visual)...</span>
                    </div>
                    <span className="text-[10px] text-blue-400 font-mono font-bold">Ctrl+N</span>
                  </button>
                )}
              </div>
            )}

            {/* Tool List grouped by category */}
            <div className="p-2 space-y-3 max-h-96 overflow-y-auto">
              {categories.map((cat, cIdx) => (
                <div key={cIdx}>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider px-2 mb-1">
                    {cat.label}
                  </div>
                  <div className="space-y-1">
                    {cat.ids.map((id) => {
                      const win = windows[id];
                      const isOpen = win.isOpen;
                      const isMin = win.isMinimized;
                      const isActive = activeWindowId === id && isOpen && !isMin;

                      return (
                        <button
                          key={id}
                          id={`start-item-${id}`}
                          onClick={() => {
                            onToggleWindow(id);
                            setIsStartMenuOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-md flex items-center justify-between text-xs transition-colors ${
                            isActive
                              ? "bg-cyan-950/80 border border-cyan-500/50 text-cyan-200"
                              : "hover:bg-slate-800/80 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-cyan-400">{windowIcons[id]}</span>
                            <span className="font-medium font-mono">{win.title}</span>
                          </div>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                              isOpen && !isMin
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                                : isMin
                                ? "bg-amber-950 text-amber-400 border border-amber-800/40"
                                : "bg-slate-900 text-slate-500"
                            }`}
                          >
                            {isOpen && !isMin ? "Activa" : isMin ? "Minimizada" : "Abrir"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer quick actions */}
            <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <button
                onClick={() => {
                  onRestoreAll();
                  setIsStartMenuOpen(false);
                }}
                className="hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <Layers className="w-3 h-3" />
                <span>Mostrar todas</span>
              </button>
              <button
                onClick={() => {
                  onMinimizeAll();
                  setIsStartMenuOpen(false);
                }}
                className="hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Minimizar todo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Middle: Open Window Taskbar Chips (draggable/scrollable) */}
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto min-w-0 px-1 py-0.5">
        {openWindows.map((id) => {
          const win = windows[id];
          const isMin = win.isMinimized;
          const isActive = activeWindowId === id && !isMin;

          return (
            <button
              key={id}
              id={`taskbar-item-${id}`}
              onClick={() => onToggleWindow(id)}
              className={`h-7 px-2.5 rounded flex items-center gap-1.5 text-xs font-mono transition-all flex-shrink-0 max-w-[180px] border truncate ${
                isActive
                  ? "bg-slate-800 text-cyan-300 border-cyan-500/80 shadow-sm shadow-cyan-950 ring-1 ring-cyan-500/30 font-semibold"
                  : isMin
                  ? "bg-[#070b14]/70 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300 italic"
                  : "bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-slate-100"
              }`}
              title={`${win.title} (${isMin ? "Minimizada" : isActive ? "En foco (click para minimizar)" : "Click para enfocar"})`}
            >
              <span className={isActive ? "text-cyan-400" : isMin ? "text-slate-600" : "text-slate-400"}>
                {windowIcons[id]}
              </span>
              <span className="truncate">{win.title}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-0.5 flex-shrink-0" />}
            </button>
          );
        })}

        {openWindows.length === 0 && (
          <span className="text-xs text-slate-600 italic font-mono px-2">
            No hay ventanas abiertas. Usa "DIV Ventanas" para lanzar una herramienta.
          </span>
        )}
      </div>

      {/* Right: Layout Presets Menu, System Stats & Clock */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Layout Presets dropdown */}
        <div className="relative" ref={layoutMenuRef}>
          <button
            id="btn-taskbar-layout"
            onClick={() => {
              setIsLayoutMenuOpen(!isLayoutMenuOpen);
              setIsStartMenuOpen(false);
            }}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
            title="Organización y Mosaicos de Ventanas"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline font-mono text-[11px]">Mosaicos</span>
            <ChevronUp
              className={`w-3 h-3 text-slate-500 transition-transform ${
                isLayoutMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isLayoutMenuOpen && (
            <div className="absolute bottom-11 right-0 w-64 bg-[#080d1a] border border-slate-700 rounded-lg shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 space-y-1 font-mono text-xs">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-slate-800">
                Disposiciones de Pantalla
              </div>

              {onResetWindows && (
                <>
                  <button
                    onClick={() => {
                      onResetWindows();
                      setIsLayoutMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/50 text-cyan-300 font-semibold flex items-center gap-2 transition-colors"
                    title="Centrar y colocar todas las ventanas abiertas en pantalla"
                  >
                    <Grid2X2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Restablecer a la Pantalla</span>
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                </>
              )}

              <button
                onClick={() => {
                  onApplyLayoutPreset("designer-delphi");
                  setIsLayoutMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 flex items-center gap-2 text-sky-300 font-semibold"
                title="Diseñador Visual de Formularios estilo Delphi/Visual Basic + Pantalla de App"
              >
                <Columns2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Diseñador Delphi/VB + App</span>
              </button>

              <button
                onClick={() => {
                  onApplyLayoutPreset("code-game");
                  setIsLayoutMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Columns2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Código + Juego (50/50)</span>
              </button>

              <button
                onClick={() => {
                  onApplyLayoutPreset("mode8-game");
                  setIsLayoutMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Columns2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Modo 8 + Juego 3D</span>
              </button>

              <button
                onClick={() => {
                  onApplyLayoutPreset("sprites-game");
                  setIsLayoutMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Columns2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Sprites Paint + Juego</span>
              </button>

              <button
                onClick={() => {
                  onApplyLayoutPreset("sound-code");
                  setIsLayoutMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Columns2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sonidos + Código</span>
              </button>

              <button
                onClick={() => {
                  onApplyLayoutPreset("quadrant");
                  setIsLayoutMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Grid2X2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Mosaico 4 Cuadrantes</span>
              </button>

              <button
                onClick={() => {
                  onApplyLayoutPreset("cascade");
                  setIsLayoutMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Cascada Retro</span>
              </button>

              <div className="border-t border-slate-800 my-1" />

              <button
                onClick={() => {
                  onApplyLayoutPreset("game-max");
                  setIsLayoutMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Juego Pantalla Completa</span>
              </button>

              <button
                onClick={() => {
                  onApplyLayoutPreset("code-max");
                  setIsLayoutMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Código Pantalla Completa</span>
              </button>
            </div>
          )}
        </div>

        {/* System Stats Pill */}
        <div className="hidden xl:flex items-center gap-2 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-200 font-bold">{activeProcessCount}</span> proc
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1">
            <Tv className="w-3 h-3 text-cyan-400" />
            <span>{resolution}</span>
          </span>
        </div>

        {/* Theme and Appearance Config Button */}
        {onOpenThemeConfig && (
          <button
            id="btn-taskbar-theme"
            onClick={onOpenThemeConfig}
            className="p-1 rounded bg-slate-900 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-600/50 text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px] font-mono px-1.5"
            title="Configuración de colores y fondo del IDE DIV"
          >
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Tema</span>
          </button>
        )}

        {/* Digital Clock */}
        <div className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-300">
          {currentTime || "00:00:00"}
        </div>

        {/* Show Desktop toggle (far right bar) */}
        <button
          id="btn-show-desktop"
          onClick={openWindows.some((id) => !windows[id].isMinimized) ? onMinimizeAll : onRestoreAll}
          className="w-3.5 h-7 rounded-sm bg-slate-800 hover:bg-cyan-600 border border-slate-700 hover:border-cyan-400 transition-colors"
          title="Mostrar escritorio / Alternar minimizar todo"
        />
      </div>
    </footer>
  );
};
