import React from "react";
import {
  Gamepad2,
  Play,
  RotateCcw,
  Sparkles,
  Cloud,
  Share2,
  FileCode,
  Image as ImageIcon,
  Wand2,
  Cpu,
  Monitor,
  Shield,
  Layers,
  FolderPlus,
  Archive,
  Compass,
  Volume2,
  Flame,
  Paintbrush,
  Type,
  Package,
  FileImage,
  LayoutGrid,
  Tv,
} from "lucide-react";
import { PRESETS, GamePreset } from "../engine/presets";

export type IDETabType =
  | "game"
  | "code"
  | "mode8"
  | "fpg"
  | "map"
  | "sprites"
  | "fonts"
  | "sound"
  | "explosions"
  | "visual"
  | "designer"
  | "ai"
  | "processes";

interface IDEHeaderProps {
  currentPresetId: string;
  onSelectPreset: (preset: GamePreset) => void;
  activeTab: IDETabType;
  onChangeTab: (tab: IDETabType) => void;
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
  code?: string;
}

export const IDEHeader: React.FC<IDEHeaderProps> = ({
  currentPresetId,
  onSelectPreset,
  activeTab,
  onChangeTab,
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
  code,
}) => {
  const isAppProject = React.useMemo(() => {
    if (code) {
      return (
        /PROGRAM\s+\w*(_app|app|form|landing|web|crm|pos|db|tarea|crud|gestor)\b/i.test(code) ||
        /\b(STORE\s+\w+|draw_button|draw_input|draw_table|layout_begin|set_ui_theme|app_state)\b/i.test(code)
      );
    }
    return currentPresetId.startsWith("app_") || currentPresetId.includes("landing");
  }, [code, currentPresetId]);
  return (
    <header className="bg-[#0b1222] border-b border-slate-800 text-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 select-none">
      {/* Brand & Project Preset */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide text-white font-mono">WXDIV 3.0</span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40 text-[9px] font-mono">
                DIV ENGINE
              </span>
            </div>
            <span className="text-[10px] text-slate-400 hidden xl:block">
              Entorno de Desarrollo de Juegos DIV Games Studio
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-slate-800 mx-0.5 hidden sm:block" />

        {/* New Project Button */}
        <button
          onClick={onOpenNewProject}
          className="px-2.5 py-1.5 rounded-md bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          title="Crear un nuevo proyecto desde cero o plantilla"
        >
          <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium">Nuevo</span>
        </button>

        {/* Preset Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 hidden md:inline">Juego:</span>
          <select
            value={currentPresetId}
            onChange={(e) => {
              const p = PRESETS.find((preset) => preset.id === e.target.value);
              if (p) onSelectPreset(p);
            }}
            className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 outline-none focus:border-cyan-400 font-mono"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.genre})
              </option>
            ))}
          </select>
        </div>

        {/* Resolution selector */}
        <div className="hidden lg:flex items-center gap-1 text-xs text-slate-400 font-mono">
          <Monitor className="w-3.5 h-3.5 text-slate-500 ml-1" />
          <select
            value={resolution}
            onChange={(e: any) => onChangeResolution(e.target.value)}
            className="px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-300 outline-none"
          >
            <option value="320x200">m320x200 (Retro DOS)</option>
            <option value="640x480">m640x480 (DIV Studio)</option>
            <option value="800x600">m800x600 (SVGA HD)</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs (Formulario VB3, Código, Pantalla en Vivo, Utilidades) */}
      <div className="flex items-center bg-[#070b14] p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto max-w-full">
        {/* Core Visual Basic 3.0 Form Designer Tab */}
        <button
          onClick={() => onChangeTab("designer")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all flex-shrink-0 ${
            activeTab === "designer"
              ? "bg-sky-600 text-white shadow-md shadow-sky-950 font-bold ring-1 ring-sky-400/50"
              : "bg-sky-950/40 text-sky-300 border border-sky-800/40 hover:bg-sky-900/60"
          }`}
          title="Diseñador de Formularios Visual Basic 3.0"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-sky-200" />
          <span>Formulario (VB3)</span>
        </button>

        <button
          onClick={() => onChangeTab("code")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "code"
              ? "bg-slate-800 text-cyan-400 shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Ver o editar el código DIV / Pascal (F12)"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Código (F12)</span>
        </button>

        <button
          onClick={() => onChangeTab("game")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "game"
              ? isAppProject
                ? "bg-slate-800 text-cyan-400 shadow-sm font-semibold"
                : "bg-slate-800 text-emerald-400 shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title={isAppProject ? "Ejecutar y ver la Pantalla de App interactiva (F5)" : "Ejecutar y ver la Pantalla de Juego en vivo (F5)"}
        >
          {isAppProject ? (
            <Tv className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{isAppProject ? "Pantalla App (F5)" : "Pantalla Juego (F5)"}</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

        <button
          onClick={() => onChangeTab("mode8")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "mode8"
              ? "bg-cyan-950 text-cyan-300 border border-cyan-800/60 shadow-sm font-semibold"
              : "text-slate-400 hover:text-cyan-300"
          }`}
          title="Editor de Niveles y Laberintos 3D (DIV 2 & Doom 1)"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Modo 8 (3D)</span>
        </button>

        <button
          onClick={() => onChangeTab("fpg")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "fpg"
              ? "bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-sm font-semibold"
              : "text-slate-400 hover:text-cyan-300"
          }`}
          title="Gestor y empaquetador de gráficos .FPG (DIV Games Studio)"
        >
          <Package className="w-3.5 h-3.5 text-cyan-400" />
          <span>Archivos FPG</span>
        </button>

        <button
          onClick={() => onChangeTab("map")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "map"
              ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-sm font-semibold"
              : "text-slate-400 hover:text-emerald-300"
          }`}
          title="Editor de gráficos y fondos individuales .MAP"
        >
          <FileImage className="w-3.5 h-3.5 text-emerald-400" />
          <span>Editor MAP</span>
        </button>

        <button
          onClick={() => onChangeTab("sprites")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "sprites"
              ? "bg-slate-800 text-cyan-400 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Paintbrush className="w-3.5 h-3.5" />
          <span>Sprites Paint</span>
        </button>

        <button
          onClick={() => onChangeTab("fonts")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "fonts"
              ? "bg-amber-950 text-amber-300 border border-amber-800/60 shadow-sm font-semibold"
              : "text-slate-400 hover:text-amber-300"
          }`}
          title="Editor de fuentes tipográficas retro .FNT (DIV Games Studio)"
        >
          <Type className="w-3.5 h-3.5 text-amber-400" />
          <span>Fuentes FNT</span>
        </button>

        <button
          onClick={() => onChangeTab("sound")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "sound"
              ? "bg-indigo-950 text-indigo-300 border border-indigo-800/60 shadow-sm font-semibold"
              : "text-slate-400 hover:text-indigo-300"
          }`}
          title="Editor y modulador de sonidos retro ADSR"
        >
          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sonidos</span>
        </button>

        <button
          onClick={() => onChangeTab("explosions")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "explosions"
              ? "bg-amber-950 text-amber-300 border border-amber-800/60 shadow-sm font-semibold"
              : "text-slate-400 hover:text-amber-300"
          }`}
          title="Creador de secuencias animadas de explosiones y partículas"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Explosiones</span>
        </button>

        <button
          onClick={() => onChangeTab("visual")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "visual"
              ? "bg-slate-800 text-purple-400 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Lógica Visual</span>
        </button>

        <button
          onClick={() => onChangeTab("ai")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "ai"
              ? "bg-amber-950/80 text-amber-300 border border-amber-800/40 shadow-sm"
              : "text-slate-400 hover:text-amber-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Copiloto IA</span>
        </button>

        <button
          onClick={() => onChangeTab("processes")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all flex-shrink-0 ${
            activeTab === "processes"
              ? "bg-slate-800 text-emerald-400 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Procesos</span>
        </button>
      </div>

      {/* Main Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRun}
          className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors"
          title="Ejecutar juego"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Ejecutar</span>
        </button>

        <button
          onClick={onRestart}
          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          title="Reiniciar ejecución"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-6 w-[1px] bg-slate-800 mx-0.5 hidden sm:block" />

        {/* Quick Export ZIP button */}
        <button
          onClick={onQuickExportZip || onOpenExport}
          className="px-2.5 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors"
          title="Exportar proyecto completo en archivo ZIP (HTML autónomo + FPG + Sprites)"
        >
          <Archive className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar ZIP</span>
        </button>

        <button
          onClick={onOpenCloudSync}
          className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors hidden md:flex"
          title="Sincronización Cloud y 2FA"
        >
          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cloud</span>
        </button>

        {onOpenAiSettings && (
          <button
            onClick={onOpenAiSettings}
            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-slate-700/80 hover:border-cyan-500/50"
            title="Configuración de API de IA (Gemini para desarrollo interactivo sin .env)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Ajustes IA</span>
          </button>
        )}

        <button
          onClick={onOpenExport}
          className="px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-colors"
          title="Centro de Exportación y Reportes"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
