import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  RotateCcw,
  Maximize2,
  FolderPlus,
  FileCode,
  FileImage,
  Package,
  Volume2,
  Flame,
  Wand2,
  Sparkles,
  Compass,
  Cpu,
  Monitor,
  Archive,
  Share2,
  Cloud,
  Type,
  Check,
  X,
  Palette,
  HelpCircle,
  Paintbrush,
  Search,
  Power,
  Sliders,
  Grid2X2,
  Columns2,
  Layers,
  ChevronRight,
  Zap,
  Gamepad2,
  Info,
  Box,
  Film,
  LayoutGrid,
} from "lucide-react";
import { PRESETS, GamePreset } from "../engine/presets";
import { WindowId, LayoutPresetType } from "./WindowManager/types";
import { soundEngine } from "../engine/sound";
import { PALETTE_PRESETS } from "../engine/palettes";

interface WXDIVDeskbarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPresetId: string;
  onSelectPreset: (preset: GamePreset) => void;
  onOpenWindow: (id: WindowId) => void;
  resolution: "320x200" | "640x480" | "800x600";
  onChangeResolution: (res: "320x200" | "640x480" | "800x600") => void;
  isRunning: boolean;
  onRun: () => void;
  onRestart: () => void;
  onOpenNewProject: () => void;
  onOpenExport: () => void;
  onQuickExportZip?: () => void;
  onOpenCloudSync: () => void;
  onOpenAiSettings?: () => void;
  onOpenThemeConfig?: () => void;
  onApplyLayoutPreset?: (preset: LayoutPresetType) => void;
  onResetWindows?: () => void;
  onMinimizeAllWindows?: () => void;
  onRestoreAllWindows?: () => void;
  activeProcessCount?: number;
}

export const WXDIVDeskbar: React.FC<WXDIVDeskbarProps> = ({
  isOpen,
  onClose,
  currentPresetId,
  onSelectPreset,
  onOpenWindow,
  resolution,
  onChangeResolution,
  isRunning,
  onRun,
  onRestart,
  onOpenNewProject,
  onOpenExport,
  onQuickExportZip,
  onOpenCloudSync,
  onOpenAiSettings,
  onOpenThemeConfig,
  onApplyLayoutPreset,
  onResetWindows,
  onMinimizeAllWindows,
  onRestoreAllWindows,
  activeProcessCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<"programs" | "presets">("programs");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside the menu
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      // Don't close if clicking on the taskbar start button
      const target = e.target as HTMLElement;
      if (target.closest("#btn-taskbar-start")) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "F1") {
        e.preventDefault();
        setShowHelpModal((prev) => !prev);
      }
    };

    // Add listeners with a small delay to prevent instant closing on trigger click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("keydown", handleKeyDown);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  if (!isOpen) {
    // If help modal was opened, keep showing it even if start menu closes
    if (showHelpModal) {
      return (
        <HelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />
      );
    }
    return null;
  }

  // Handle opening tool and auto-closing start menu (standard Windows behavior)
  const handleSelectTool = (id: WindowId) => {
    onOpenWindow(id);
    onClose();
  };

  const handleSelectProjectPreset = (preset: GamePreset) => {
    onSelectPreset(preset);
    onClose();
  };

  const currentPreset = PRESETS.find((p) => p.id === currentPresetId) || PRESETS[0];

  // Tool categories for the left pane
  const toolCategories = [
    {
      category: "Desarrollo & Lógica",
      items: [
        {
          id: "code" as WindowId,
          name: "Editor de Código DIV",
          desc: "Editor de procesos, funciones y sintaxis DIV",
          shortcut: "F2",
          icon: <FileCode className="w-4 h-4 text-cyan-400" />,
        },
        {
          id: "visual" as WindowId,
          name: "Diagrama de Lógica Visual",
          desc: "Editor visual de nodos y flujos de juego",
          shortcut: "Visual",
          icon: <Wand2 className="w-4 h-4 text-purple-400" />,
        },
        {
          id: "designer" as WindowId,
          name: "Diseñador de Apps (VB 3.0)",
          desc: "Diseñador visual de formularios y controles interactivos",
          shortcut: "VB3",
          icon: <LayoutGrid className="w-4 h-4 text-sky-400" />,
        },
        {
          id: "processes" as WindowId,
          name: "Inspector de Procesos y Memoria",
          desc: "Monitoreo en tiempo real de hilos y entidades",
          shortcut: `${activeProcessCount} proc`,
          icon: <Cpu className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: "ai" as WindowId,
          name: "Copiloto Asistente IA",
          desc: "Generación de código, depuración y sugerencias",
          shortcut: "IA",
          icon: <Sparkles className="w-4 h-4 text-amber-400" />,
        },
      ],
    },
    {
      category: "Gráficos & Paletas VGA",
      items: [
        {
          id: "palette" as WindowId,
          name: "Editor de Paletas (.PAL)",
          desc: "Gestión de paletas de 256 colores VGA",
          shortcut: "VGA 256",
          icon: <Palette className="w-4 h-4 text-amber-400" />,
        },
        {
          id: "sprites" as WindowId,
          name: "Editor de Sprites (Paint)",
          desc: "Dibujo de gráficos, puntos de control y animación",
          shortcut: "Paint",
          icon: <Paintbrush className="w-4 h-4 text-cyan-400" />,
        },
        {
          id: "fpg" as WindowId,
          name: "Empaquetador de Gráficos FPG",
          desc: "Gestor de archivos de sprites y librerías",
          shortcut: "FPG",
          icon: <Package className="w-4 h-4 text-amber-300" />,
        },
        {
          id: "map" as WindowId,
          name: "Editor de Mapas y Scrolls (MAP)",
          desc: "Fondos desplazables, capas y colisiones",
          shortcut: "Scroll",
          icon: <FileImage className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: "explosions" as WindowId,
          name: "Generador de Explosiones",
          desc: "Generación procedural de efectos y partículas",
          shortcut: "FX",
          icon: <Flame className="w-4 h-4 text-rose-400" />,
        },
        {
          id: "fonts" as WindowId,
          name: "Editor de Fuentes Bitmap (.FNT)",
          desc: "Tipografías con antialiasing para juegos",
          shortcut: "FNT",
          icon: <Type className="w-4 h-4 text-sky-400" />,
        },
      ],
    },
    {
      category: "3D, Sonido & Ejecución",
      items: [
        {
          id: "mode8" as WindowId,
          name: "Motor 3D Modo 8 (Raycaster)",
          desc: "Entornos tridimensionales estilo Wolfenstein/Doom",
          shortcut: "3D",
          icon: <Compass className="w-4 h-4 text-cyan-400" />,
        },
        {
          id: "md2viewer" as WindowId,
          name: "Visor de Modelos 3D (MD2 / MD3)",
          desc: "Visualizador de mallas 3D, animación de vértices y skins",
          shortcut: "MD2",
          icon: <Box className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: "spritegenerator" as WindowId,
          name: "Generador de Sprites desde 3D",
          desc: "Bakeado auténtico DIV Games Studio 2 (3D a FPG 8-dir)",
          shortcut: "Bake",
          icon: <Film className="w-4 h-4 text-cyan-400" />,
        },
        {
          id: "sound" as WindowId,
          name: "Sintetizador de Sonido ADSR & SFX",
          desc: "Generador de efectos de audio de 8 bits",
          shortcut: "Audio",
          icon: <Volume2 className="w-4 h-4 text-indigo-400" />,
        },
        {
          id: "game" as WindowId,
          name: "Pantalla de Juego / Canvas DIV",
          desc: "Ventana principal de renderizado a 60 FPS",
          shortcut: "Juego",
          icon: <Play className="w-4 h-4 text-emerald-400 fill-current" />,
        },
      ],
    },
  ];

  // Filter tools and presets based on search query
  const q = searchQuery.toLowerCase().trim();

  const filteredCategories = toolCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.shortcut.toLowerCase().includes(q)
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  const filteredPresets = PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.genre.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  );

  return (
    <>
      {/* Windows 7 / Windows 10 Style Start Menu */}
      <div
        ref={menuRef}
        id="windows-start-menu"
        className="fixed bottom-12 left-2 z-[9999] w-[620px] max-w-[calc(100vw-16px)] h-[520px] max-h-[calc(100vh-60px)] bg-[#0c1424]/95 backdrop-blur-xl border border-slate-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(255,255,255,0.1)] rounded-t-xl rounded-b-md flex flex-col text-slate-200 font-sans select-none overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-150"
      >
        {/* Top Header: Windows 7 / 10 User & Project Bar */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#0d1c38] via-[#142850] to-[#0d1c38] border-b border-slate-700/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Windows 10 Tiled Start Badge */}
            <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-sm">
              <span className="text-[10px] font-black text-slate-950 font-mono tracking-tighter">
                DIV
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-bold text-white tracking-wide">
                  DIV Games Studio 3.0
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[11px] text-cyan-300 font-mono leading-none">
                {currentPreset.name} ({resolution})
              </span>
            </div>
          </div>

          {/* Guaranteed Top-Right Close Button [X] */}
          <button
            id="btn-close-start-menu"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-6 h-6 rounded-md bg-slate-800/80 hover:bg-rose-600 border border-slate-600/60 hover:border-rose-400 text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-sm"
            title="Cerrar menú Inicio (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Start Menu Main Body: Classic 2-Column Windows Architecture */}
        <div className="flex-1 flex overflow-hidden">
          {/* ======================================================== */}
          {/* LEFT COLUMN: Search & Programs List (Windows 7/10 style)  */}
          {/* ======================================================== */}
          <div className="flex-1 flex flex-col bg-[#080e1a]/90 border-r border-slate-800/80 overflow-hidden">
            {/* Windows Search Bar */}
            <div className="p-2.5 border-b border-slate-800/80 bg-[#060a14]">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar programas, herramientas o demos..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-900 text-slate-100 text-xs rounded-md border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 text-slate-400 hover:text-white p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs: "Todos los Programas" vs "Juegos y Demos DIV" */}
            <div className="px-2.5 pt-2 flex items-center gap-1 border-b border-slate-800 bg-[#070d18] text-xs">
              <button
                onClick={() => setActiveTab("programs")}
                className={`pb-1.5 px-2.5 font-medium transition-colors border-b-2 ${
                  activeTab === "programs"
                    ? "border-cyan-400 text-cyan-300 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Todos los Programas
              </button>
              <button
                onClick={() => setActiveTab("presets")}
                className={`pb-1.5 px-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === "presets"
                    ? "border-amber-400 text-amber-300 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Gamepad2 className="w-3 h-3" />
                <span>Juegos & Demos ({PRESETS.length})</span>
              </button>
            </div>

            {/* Scrollable Programs / Presets Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
              {activeTab === "programs" ? (
                <>
                  {filteredCategories.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-mono">
                      No se encontraron herramientas que coincidan con "{searchQuery}"
                    </div>
                  ) : (
                    filteredCategories.map((cat, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 font-semibold">
                          {cat.category}
                        </div>
                        <div className="space-y-0.5">
                          {cat.items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleSelectTool(item.id)}
                              className="w-full px-2.5 py-1.5 rounded-md hover:bg-[#13254b] active:bg-[#1a346b] flex items-center justify-between text-left transition-colors group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1 rounded bg-slate-800/80 border border-slate-700/60 group-hover:border-cyan-500/50 group-hover:bg-slate-800 flex-shrink-0 transition-colors">
                                  {item.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-200 truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {item.desc}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-400 font-mono flex-shrink-0 group-hover:text-cyan-300 group-hover:bg-slate-900 border border-slate-700/60">
                                {item.shortcut}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                /* Presets Tab */
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider px-2 font-semibold">
                    Proyectos y Demos Predefinidos
                  </div>
                  {filteredPresets.map((preset) => {
                    const isSelected = preset.id === currentPresetId;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectProjectPreset(preset)}
                        className={`w-full px-2.5 py-2 rounded-md flex items-center justify-between text-left transition-colors border ${
                          isSelected
                            ? "bg-cyan-950/60 border-cyan-500/60 text-cyan-200"
                            : "hover:bg-[#13254b] active:bg-[#1a346b] border-transparent text-slate-200"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">
                              {preset.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-mono">
                              {preset.genre}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {preset.description}
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-900 text-cyan-300 text-[10px] font-mono flex items-center gap-1 flex-shrink-0">
                            <Check className="w-2.5 h-2.5" />
                            <span>Activo</span>
                          </span>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Quick Access & System Panel (Windows 7/10) */}
          {/* ======================================================== */}
          <div className="w-56 bg-[#060b16] flex flex-col justify-between p-2.5 text-xs text-slate-300">
            {/* Quick Actions List */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 font-semibold">
                Accesos del Sistema
              </div>

              {/* Nuevo Proyecto */}
              <button
                onClick={() => {
                  onOpenNewProject();
                  onClose();
                }}
                className="w-full px-2.5 py-1.5 rounded-md hover:bg-slate-800 hover:text-white flex items-center gap-2 text-amber-300 transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Nuevo Proyecto...</span>
              </button>

              {/* Exportar ZIP Autónomo */}
              <button
                onClick={() => {
                  if (onQuickExportZip) onQuickExportZip();
                  else onOpenExport();
                  onClose();
                }}
                className="w-full px-2.5 py-1.5 rounded-md hover:bg-emerald-950/80 hover:text-emerald-200 flex items-center gap-2 text-emerald-300 transition-colors border border-emerald-800/40 bg-emerald-950/30"
              >
                <Archive className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">Exportar ZIP Web</span>
              </button>

              {/* Centro de Exportación */}
              <button
                onClick={() => {
                  onOpenExport();
                  onClose();
                }}
                className="w-full px-2.5 py-1.5 rounded-md hover:bg-slate-800 hover:text-white flex items-center gap-2 text-slate-300 transition-colors"
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Exportar & Reportes</span>
              </button>

              {/* Sincronización Cloud */}
              <button
                onClick={() => {
                  onOpenCloudSync();
                  onClose();
                }}
                className="w-full px-2.5 py-1.5 rounded-md hover:bg-slate-800 hover:text-white flex items-center gap-2 text-slate-300 transition-colors"
              >
                <Cloud className="w-4 h-4 text-cyan-400" />
                <span>Sincronización Cloud</span>
              </button>

              {/* Colores & Tema IDE */}
              {onOpenThemeConfig && (
                <button
                  onClick={() => {
                    onOpenThemeConfig();
                    onClose();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md hover:bg-slate-800 hover:text-white flex items-center gap-2 text-slate-300 transition-colors"
                >
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span>Personalizar Tema...</span>
                </button>
              )}

              {/* Configuración Copiloto IA */}
              {onOpenAiSettings && (
                <button
                  onClick={() => {
                    onOpenAiSettings();
                    onClose();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md hover:bg-slate-800 hover:text-white flex items-center gap-2 text-slate-300 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Configuración IA...</span>
                </button>
              )}

              <div className="h-px bg-slate-800 my-1.5" />

              {/* Layout Presets (Windows arrangement) */}
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 font-semibold">
                Ventanas
              </div>
              {onApplyLayoutPreset && (
                <div className="grid grid-cols-2 gap-1 px-1">
                  <button
                    onClick={() => {
                      onApplyLayoutPreset("code-game");
                      onClose();
                    }}
                    className="p-1 bg-slate-900 hover:bg-[#13254b] text-[10px] rounded border border-slate-700/60 text-slate-300 hover:text-white text-center"
                    title="Editor de Código y Pantalla de Juego lado a lado"
                  >
                    Código+Juego
                  </button>
                  <button
                    onClick={() => {
                      onApplyLayoutPreset("quadrant");
                      onClose();
                    }}
                    className="p-1 bg-slate-900 hover:bg-[#13254b] text-[10px] rounded border border-slate-700/60 text-slate-300 hover:text-white text-center"
                    title="4 ventanas en cuadrícula"
                  >
                    Cuadrante
                  </button>
                  <button
                    onClick={() => {
                      onApplyLayoutPreset("cascade");
                      onClose();
                    }}
                    className="p-1 bg-slate-900 hover:bg-[#13254b] text-[10px] rounded border border-slate-700/60 text-slate-300 hover:text-white text-center"
                    title="Cascada clásica de ventanas"
                  >
                    Cascada
                  </button>
                  {onMinimizeAllWindows && (
                    <button
                      onClick={() => {
                        onMinimizeAllWindows();
                        onClose();
                      }}
                      className="p-1 bg-slate-900 hover:bg-[#13254b] text-[10px] rounded border border-slate-700/60 text-slate-300 hover:text-white text-center"
                      title="Minimizar todas las ventanas al escritorio"
                    >
                      Minimizar
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom of right column: Help & Guide button */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowHelpModal(true);
                  onClose();
                }}
                className="w-full px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-amber-300 flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold">Manual & Ayuda</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">[F1]</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BOTTOM TASK/POWER BAR (Windows 7/10 Bottom Action Bar)    */}
        {/* ======================================================== */}
        <div className="px-3.5 py-2 bg-[#050914] border-t border-slate-800 flex items-center justify-between">
          {/* Left: Resolution & Status Indicator */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-slate-400">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={resolution}
                onChange={(e: any) => onChangeResolution(e.target.value)}
                className="bg-slate-900 text-cyan-300 border border-slate-700 rounded px-1.5 py-0.5 text-xs outline-none focus:border-cyan-500 font-mono"
              >
                <option value="320x200">320x200 VGA</option>
                <option value="640x480">640x480 SVGA</option>
                <option value="800x600">800x600 HD</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
              <Cpu className="w-3 h-3" />
              <span>{activeProcessCount} proc.</span>
            </div>
          </div>

          {/* Right: Windows Power & Run Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Run Game Button */}
            <button
              onClick={() => {
                onRun();
                onClose();
              }}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded flex items-center gap-1.5 shadow-sm transition-colors"
              title="Ejecutar juego DIV a 60 FPS (F5)"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>EJECUTAR (F5)</span>
            </button>

            {/* Restart Button */}
            <button
              onClick={() => {
                onRestart();
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors"
              title="Reiniciar ejecución y procesos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Windows Power / Close Button */}
            <button
              id="btn-power-close-start"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900 active:bg-rose-950 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-100 text-xs rounded flex items-center gap-1.5 transition-colors shadow-sm"
              title="Cerrar menú Inicio"
            >
              <Power className="w-3 h-3 text-rose-400" />
              <span className="font-semibold">Cerrar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help & Shortcuts Modal */}
      {showHelpModal && (
        <HelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />
      )}
    </>
  );
};

// Help Modal Component with explicit and guaranteed close button
const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10005] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-[540px] max-w-full bg-[#0c1424] border border-slate-700 shadow-2xl rounded-lg overflow-hidden text-slate-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#0e2042] via-[#16336b] to-[#0e2042] border-b border-slate-700 flex items-center justify-between text-white font-bold text-sm">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Manual de Referencia & Teclas Rápidas DIV</span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 rounded bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div>
            <h4 className="font-bold text-amber-300 uppercase tracking-wider mb-2 font-mono">
              Atajos de Teclado del IDE
            </h4>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Ejecutar Juego</span>
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800">
                  F5
                </span>
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Editor de Código</span>
                <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 rounded border border-cyan-800">
                  F2
                </span>
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Ayuda y Manual</span>
                <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-800">
                  F1
                </span>
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Cerrar Menús / Modales</span>
                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  Esc
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-cyan-300 uppercase tracking-wider mb-2 font-mono">
              Sintaxis DIV Games Studio Soportada
            </h4>
            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2 font-mono text-[11px]">
              <div>
                <span className="text-purple-400">PROGRAM</span>{" "}
                <span className="text-yellow-300">mi_juego</span>;
              </div>
              <div>
                <span className="text-purple-400">GLOBAL</span>{" "}
                <span className="text-slate-300">puntos = 0;</span>
              </div>
              <div>
                <span className="text-purple-400">PROCESS</span>{" "}
                <span className="text-yellow-300">jugador</span>(x, y)
              </div>
              <div className="pl-4 text-slate-400">
                FRAME; / LOOP; / sound(1, 440, 250); / write(fnt, x, y, 0, "HOLA");
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded text-xs transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
