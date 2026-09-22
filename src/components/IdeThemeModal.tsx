import React, { useState } from "react";
import {
  Palette,
  Monitor,
  Image,
  Sparkles,
  Check,
  RotateCcw,
  X,
  Sliders,
  Tv,
} from "lucide-react";
import {
  IdeThemeConfig,
  IdeThemeId,
  IdeBackgroundId,
  IdeAccentId,
  THEME_PRESETS,
  BACKGROUND_PRESETS,
  ACCENT_PRESETS,
  DEFAULT_IDE_THEME,
} from "../engine/ideTheme";

interface IdeThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: IdeThemeConfig;
  onChangeConfig: (newConfig: IdeThemeConfig) => void;
}

export const IdeThemeModal: React.FC<IdeThemeModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}) => {
  const [activeTab, setActiveTab] = useState<"themes" | "background" | "accents">(
    "themes"
  );

  if (!isOpen) return null;

  const handleSelectTheme = (themeId: IdeThemeId) => {
    onChangeConfig({
      ...config,
      themeId,
    });
  };

  const handleSelectBackground = (backgroundId: IdeBackgroundId) => {
    onChangeConfig({
      ...config,
      backgroundId,
    });
  };

  const handleSelectAccent = (accentId: IdeAccentId) => {
    onChangeConfig({
      ...config,
      accentId,
    });
  };

  const handleResetToDefault = () => {
    onChangeConfig(DEFAULT_IDE_THEME);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4">
      <div
        className="w-full max-w-2xl bg-[#090f1d] border-2 border-slate-700 rounded-xl shadow-2xl overflow-hidden text-slate-200 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        style={{
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(6, 182, 212, 0.2)",
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-cyan-950/70 to-slate-900 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <span>CONFIGURACIÓN DE APARIENCIA DIV</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 font-mono">
                  IDE 3.0
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Personaliza la paleta de colores, tema retro y fondo del escritorio como en DIV Games Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab("themes")}
            className={`px-3 py-2 rounded-t-lg flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "themes"
                ? "border-cyan-400 bg-slate-900 text-cyan-300 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Temas y Paletas</span>
          </button>

          <button
            onClick={() => setActiveTab("background")}
            className={`px-3 py-2 rounded-t-lg flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "background"
                ? "border-cyan-400 bg-slate-900 text-cyan-300 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>Fondo del IDE</span>
          </button>

          <button
            onClick={() => setActiveTab("accents")}
            className={`px-3 py-2 rounded-t-lg flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "accents"
                ? "border-cyan-400 bg-slate-900 text-cyan-300 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Acentos y CRT</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: THEMES */}
          {activeTab === "themes" && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Selecciona una de las paletas clásicas de la era dorada de DOS y DIV Games Studio:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(THEME_PRESETS) as IdeThemeId[]).map((tId) => {
                  const preset = THEME_PRESETS[tId];
                  const isSelected = config.themeId === tId;

                  return (
                    <button
                      key={tId}
                      onClick={() => handleSelectTheme(tId)}
                      className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400 shadow-md"
                          : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{preset.name}</span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-cyan-400 inline" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                            {preset.description}
                          </div>
                        </div>
                      </div>

                      {/* Color swatch preview */}
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/80">
                        <div
                          className="w-5 h-5 rounded border border-slate-600 shadow-sm"
                          style={{ backgroundColor: preset.bgColor }}
                          title="Fondo del sistema"
                        />
                        <div
                          className="w-5 h-5 rounded border border-slate-600 shadow-sm"
                          style={{ backgroundColor: preset.borderColor }}
                          title="Color de borde"
                        />
                        <div
                          className="w-5 h-5 rounded border border-slate-600 shadow-sm"
                          style={{ backgroundColor: preset.accentColor }}
                          title="Color de acento y títulos"
                        />
                        <span className="text-[10px] font-mono text-slate-500 ml-auto uppercase">
                          {preset.accentColor}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BACKGROUND / WALLPAPER */}
          {activeTab === "background" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Elige el patrón o textura que se mostrará en el tapiz de fondo del escritorio:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(BACKGROUND_PRESETS) as IdeBackgroundId[]).map(
                  (bId) => {
                    const bg = BACKGROUND_PRESETS[bId];
                    const isSelected = config.backgroundId === bId;

                    return (
                      <button
                        key={bId}
                        onClick={() => handleSelectBackground(bId)}
                        className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400 shadow-md"
                            : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-100 font-mono">
                            {bg.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">
                          {bg.description}
                        </p>

                        {/* Mini preview container */}
                        <div
                          className="h-10 w-full rounded border border-slate-700/80 overflow-hidden shadow-inner"
                          style={bg.style(config)}
                        />
                      </button>
                    );
                  }
                )}
              </div>

              {/* Custom Solid Color Picker */}
              {config.backgroundId === "solid-custom" && (
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-slate-300 font-mono">
                    Seleccionar Color Sólido de Fondo:
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.customBgColor || "#050811"}
                      onChange={(e) =>
                        onChangeConfig({ ...config, customBgColor: e.target.value })
                      }
                      className="w-10 h-10 rounded cursor-pointer border border-slate-600 bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.customBgColor || "#050811"}
                      onChange={(e) =>
                        onChangeConfig({ ...config, customBgColor: e.target.value })
                      }
                      className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-cyan-300 w-28"
                      placeholder="#050811"
                    />
                    <div className="flex items-center gap-1.5">
                      {["#040a18", "#120c04", "#031407", "#000040", "#180728", "#080808"].map(
                        (col) => (
                          <button
                            key={col}
                            onClick={() =>
                              onChangeConfig({ ...config, customBgColor: col })
                            }
                            className="w-6 h-6 rounded border border-slate-700 hover:scale-110 transition-transform"
                            style={{ backgroundColor: col }}
                            title={col}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom URL wallpaper input */}
              {config.backgroundId === "custom-url" && (
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-slate-300 font-mono">
                    URL de la Imagen de Fondo:
                  </div>
                  <input
                    type="url"
                    value={config.customBgUrl}
                    onChange={(e) =>
                      onChangeConfig({ ...config, customBgUrl: e.target.value })
                    }
                    placeholder="https://ejemplo.com/mi-wallpaper-retro.jpg"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 outline-none focus:border-cyan-400 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">
                    Introduce una URL directa a una imagen en formato PNG, JPG o WebP.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACCENT COLORS & CRT SCANLINES */}
          {activeTab === "accents" && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-300 font-mono mb-2">
                  Color de Acento de Ventanas y Selección:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(ACCENT_PRESETS) as IdeAccentId[]).map((aId) => {
                    const acc = ACCENT_PRESETS[aId];
                    const isSelected = config.accentId === aId;

                    return (
                      <button
                        key={aId}
                        onClick={() => handleSelectAccent(aId)}
                        className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400"
                            : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border border-slate-600 shadow-sm"
                            style={{ backgroundColor: acc.hex }}
                          />
                          <span className="text-xs font-mono font-medium text-slate-200">
                            {acc.name}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CRT Scanline Toggle */}
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 font-mono">
                      Efecto Monitor CRT Retro (Scanlines)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Añade un sutil barrido de líneas de monitor de tubo catódico sobre el escritorio
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      crtScanlines: !config.crtScanlines,
                    })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 border ${
                    config.crtScanlines
                      ? "bg-cyan-600 border-cyan-400"
                      : "bg-slate-800 border-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      config.crtScanlines ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <button
            onClick={handleResetToDefault}
            className="px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer por defecto</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors shadow-md shadow-cyan-950"
          >
            Aplicar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
