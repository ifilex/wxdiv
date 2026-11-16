import React, { useState, useEffect, useRef } from "react";
import {
  Palette,
  Play,
  Pause,
  RotateCw,
  Copy,
  Download,
  Sparkles,
  Sliders,
  Flame,
  Check,
  Code2,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  DivColor,
  PALETTE_PRESETS,
  DivPalettePreset,
  hexToDivColor,
  div63ToHex,
  rgbToHex,
  generateColorRamp,
  generateDefaultDivPalette,
} from "../engine/palettes";
import { DivRuntime } from "../engine/runtime";

interface PaletteEditorProps {
  runtime?: DivRuntime;
  onInsertCode?: (codeSnippet: string) => void;
  onApplyPaletteToRuntime?: (palette: string[]) => void;
}

export const PaletteEditor: React.FC<PaletteEditorProps> = ({
  runtime,
  onInsertCode,
  onApplyPaletteToRuntime,
}) => {
  // Current 256 colors array
  const [currentPalette, setCurrentPalette] = useState<string[]>(() => {
    return generateDefaultDivPalette();
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>("div-vga");
  const [selectedIndex, setSelectedIndex] = useState<number>(14); // Default to a golden/yellow color

  // Editing values for the selected color
  const selectedColor = hexToDivColor(currentPalette[selectedIndex] || "#000000");

  // Ramp Generator State
  const [rampStartIdx, setRampStartIdx] = useState<number>(32);
  const [rampEndIdx, setRampEndIdx] = useState<number>(63);
  const [rampStartColor, setRampStartColor] = useState<string>("#001a4d");
  const [rampEndColor, setRampEndColor] = useState<string>("#55ffff");

  // Roll Palette Simulation State
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollStartIdx, setRollStartIdx] = useState<number>(192);
  const [rollEndIdx, setRollEndIdx] = useState<number>(223);
  const [rollSpeedMs, setRollSpeedMs] = useState<number>(80);
  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Status message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"palette" | "editor">("palette");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Change individual color components
  const handleUpdateR63 = (val: number) => {
    const newHex = div63ToHex(val, selectedColor.g63, selectedColor.b63);
    const updated = [...currentPalette];
    updated[selectedIndex] = newHex;
    setCurrentPalette(updated);
  };

  const handleUpdateG63 = (val: number) => {
    const newHex = div63ToHex(selectedColor.r63, val, selectedColor.b63);
    const updated = [...currentPalette];
    updated[selectedIndex] = newHex;
    setCurrentPalette(updated);
  };

  const handleUpdateB63 = (val: number) => {
    const newHex = div63ToHex(selectedColor.r63, selectedColor.g63, val);
    const updated = [...currentPalette];
    updated[selectedIndex] = newHex;
    setCurrentPalette(updated);
  };

  const handleUpdateHex = (hex: string) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const updated = [...currentPalette];
      updated[selectedIndex] = hex;
      setCurrentPalette(updated);
    }
  };

  // Switch preset
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = PALETTE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCurrentPalette([...found.colors]);
      showToast(`Paleta '${found.name}' cargada`);
    }
  };

  // Generate color ramp
  const handleApplyRamp = () => {
    const updated = generateColorRamp(
      currentPalette,
      rampStartIdx,
      rampEndIdx,
      rampStartColor,
      rampEndColor
    );
    setCurrentPalette(updated);
    showToast(`Rampa de color generada del índice ${rampStartIdx} al ${rampEndIdx}`);
  };

  // Palette Rolling effect simulator
  useEffect(() => {
    if (isRolling) {
      rollIntervalRef.current = setInterval(() => {
        setCurrentPalette((prev) => {
          const next = [...prev];
          const min = Math.min(rollStartIdx, rollEndIdx);
          const max = Math.max(rollStartIdx, rollEndIdx);
          if (max <= min) return prev;

          const lastColor = next[max];
          for (let i = max; i > min; i--) {
            next[i] = next[i - 1];
          }
          next[min] = lastColor;
          return next;
        });
      }, rollSpeedMs);
    } else {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    }

    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    };
  }, [isRolling, rollStartIdx, rollEndIdx, rollSpeedMs]);

  // Apply to DIV Engine Runtime
  const handleApplyToRuntime = () => {
    if (runtime) {
      runtime.setPalette?.(currentPalette);
      showToast("Paleta sincronizada con el motor DIV");
    }
    if (onApplyPaletteToRuntime) {
      onApplyPaletteToRuntime(currentPalette);
    }
  };

  // Generate DIV Code Snippet
  const handleInsertDivCode = () => {
    const preset = PALETTE_PRESETS.find((p) => p.id === selectedPresetId);
    const filename = preset ? preset.filename : "juego.pal";
    const snippet = `// CONFIGURACIÓN DE PALETA DIV GAMES STUDIO
load_pal("${filename}");

// Efecto de ciclo de paleta (ej: agua o fuego)
// roll_palette(${rollStartIdx}, ${rollEndIdx}, 1);

// Cambiar color indexado #${selectedIndex} (DIV DOS RGB: 0..63)
set_color(${selectedIndex}, ${selectedColor.r63}, ${selectedColor.g63}, ${selectedColor.b63});`;

    if (onInsertCode) {
      onInsertCode(snippet);
      showToast("Código DIV insertado en el editor");
    } else {
      navigator.clipboard.writeText(snippet);
      showToast("Código DIV copiado al portapapeles");
    }
  };

  // Download .PAL file (DIV Games Studio Text / Binary Compatible)
  const handleDownloadPal = () => {
    let content = `// DIV Games Studio 256 VGA Palette File (.PAL)\n`;
    content += `// 256 Entries: R(0..63) G(0..63) B(0..63)\n`;
    currentPalette.forEach((hex, idx) => {
      const c = hexToDivColor(hex);
      content += `${idx}\t${c.r63}\t${c.g63}\t${c.b63}\t// ${c.hex}\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPresetId || "juego"}.pal`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Archivo '${selectedPresetId}.pal' descargado`);
  };

  return (
    <div className="h-full w-full flex-1 min-h-0 bg-[#F7F8FA] text-[#111827] flex flex-col select-none font-sans overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="px-3 py-2 bg-white border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        {/* Preset Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FDF2F5] text-[#7C2D48] flex items-center justify-center flex-shrink-0">
            <Palette className="w-4 h-4" />
          </div>
          <select
            aria-label="Seleccionar paleta predefinida"
            value={selectedPresetId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="min-h-[38px] bg-[#F7F8FA] border border-[#CBD5E1] text-[#111827] text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:border-[#7C2D48] focus:outline-none max-w-[200px] truncate cursor-pointer"
          >
            {PALETTE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleApplyToRuntime}
            className="min-h-[38px] px-3 py-1.5 bg-[#2F6F4E] hover:bg-[#265A3F] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
            title="Sincronizar esta paleta con el motor runtime DIV"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Aplicar al Juego</span>
          </button>

          <button
            type="button"
            onClick={handleInsertDivCode}
            className="min-h-[38px] px-2.5 py-1.5 bg-[#FDF2F5] hover:bg-[#FCE7EF] border border-[#7C2D48]/30 text-[#7C2D48] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            title="Insertar load_pal, roll_palette y set_color en el editor"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Código DIV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPal}
            className="min-h-[38px] px-2.5 py-1.5 bg-[#F1F5F9] hover:bg-slate-200 border border-[#E2E8F0] text-[#374151] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            title="Descargar archivo .PAL compatible"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Descargar .PAL</span>
            <span className="sm:hidden">.PAL</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden border-b border-[#E2E8F0] bg-white px-2 py-1.5 gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("palette")}
          className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "palette"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F1F5F9] text-[#4B5563]"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Paleta 256</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("editor")}
          className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "editor"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F1F5F9] text-[#4B5563]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Editor RGB #{selectedIndex}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-[#EEF6F1] border-b border-[#2F6F4E]/30 px-3 py-1.5 text-center text-xs font-medium text-[#2F6F4E] flex items-center justify-center gap-1.5 flex-shrink-0">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content: Left Palette Grid (256 colors), Right Inspector & Tools */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left: 256 VGA Color Grid */}
        <div
          className={`${
            mobileTab === "palette" ? "flex" : "hidden"
          } md:flex flex-1 min-h-0 p-3 sm:p-4 flex-col items-center justify-start md:justify-center overflow-y-auto`}
        >
          <div className="w-full max-w-xl bg-white p-3 sm:p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563] mb-2.5">
              <span className="font-bold text-[#111827]">256 Colores VGA (16 × 16)</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-[#F7F8FA] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                <span
                  className="w-3 h-3 rounded-xs border border-black/20 inline-block"
                  style={{ backgroundColor: currentPalette[selectedIndex] }}
                />
                <span>#{selectedIndex} · {currentPalette[selectedIndex].toUpperCase()}</span>
              </span>
            </div>

            {/* 16x16 Grid */}
            <div
              className="grid gap-1 sm:gap-1.5 p-2 bg-[#0F172A] border border-[#CBD5E1] rounded-xl shadow-inner touch-manipulation"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(16, minmax(0, 1fr))",
              }}
            >
              {currentPalette.map((hex, idx) => {
                const isSelected = selectedIndex === idx;
                const inRollRange =
                  isRolling &&
                  idx >= Math.min(rollStartIdx, rollEndIdx) &&
                  idx <= Math.max(rollStartIdx, rollEndIdx);

                return (
                  <button
                    key={idx}
                    type="button"
                    id={`palette-color-${idx}`}
                    onClick={() => setSelectedIndex(idx)}
                    title={`Índice #${idx} | Hex: ${hex}`}
                    className={`aspect-square rounded-[2px] relative transition-transform cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-white scale-125 z-10 shadow-lg"
                        : inRollRange
                        ? "ring-1 ring-amber-400 scale-105"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: hex }}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-[#6B7280]">
              <span>Toca cualquier color para editar sus canales RGB o generar degradados.</span>
              <button
                type="button"
                onClick={() => setMobileTab("editor")}
                className="md:hidden px-2.5 py-1 rounded-lg bg-[#FDF2F5] text-[#7C2D48] font-semibold whitespace-nowrap cursor-pointer"
              >
                Editar color →
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Color Inspector & Palette Tools */}
        <div
          className={`${
            mobileTab === "editor" ? "flex w-full" : "hidden"
          } md:flex md:w-80 lg:w-88 p-3 bg-white border-t md:border-t-0 md:border-l border-[#E2E8F0] flex-col gap-3 overflow-y-auto text-xs flex-shrink-0`}
        >
          {/* 1. Selected Color Inspector */}
          <div className="p-3 bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <span className="font-bold text-[#111827]">
                Color Seleccionado #{selectedIndex}
              </span>
              <div
                className="w-7 h-7 rounded-lg border border-black/15 shadow-2xs"
                style={{ backgroundColor: selectedColor.hex }}
              />
            </div>

            {/* Hex Input */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#4B5563] text-[11px] font-medium">Código Hex:</span>
              <input
                type="text"
                value={selectedColor.hex.toUpperCase()}
                onChange={(e) => handleUpdateHex(e.target.value)}
                className="w-28 min-h-[36px] px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-lg text-right text-[#7C2D48] font-mono font-bold text-xs focus:border-[#7C2D48] focus:outline-none"
              />
            </div>

            {/* DIV DOS 0..63 RGB Sliders */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">
                Canales VGA DIV (0..63)
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-4 text-rose-600 font-bold">R</span>
                <input
                  type="range"
                  min={0}
                  max={63}
                  value={selectedColor.r63}
                  onChange={(e) => handleUpdateR63(Number(e.target.value))}
                  className="flex-1 accent-rose-600 h-2 bg-slate-200 rounded cursor-pointer"
                />
                <span className="w-7 text-right text-[#111827] font-mono font-semibold text-xs">
                  {selectedColor.r63}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-4 text-[#2F6F4E] font-bold">G</span>
                <input
                  type="range"
                  min={0}
                  max={63}
                  value={selectedColor.g63}
                  onChange={(e) => handleUpdateG63(Number(e.target.value))}
                  className="flex-1 accent-[#2F6F4E] h-2 bg-slate-200 rounded cursor-pointer"
                />
                <span className="w-7 text-right text-[#111827] font-mono font-semibold text-xs">
                  {selectedColor.g63}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-4 text-sky-600 font-bold">B</span>
                <input
                  type="range"
                  min={0}
                  max={63}
                  value={selectedColor.b63}
                  onChange={(e) => handleUpdateB63(Number(e.target.value))}
                  className="flex-1 accent-sky-600 h-2 bg-slate-200 rounded cursor-pointer"
                />
                <span className="w-7 text-right text-[#111827] font-mono font-semibold text-xs">
                  {selectedColor.b63}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Color Ramp / Gradient Generator */}
          <div className="p-3 bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-[#111827] border-b border-[#E2E8F0] pb-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#7C2D48]" />
              <span>Generador de Degradados</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[#4B5563] text-[10px] font-medium block mb-1">Desde índice:</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rampStartIdx}
                  onChange={(e) => setRampStartIdx(Number(e.target.value))}
                  className="w-full min-h-[36px] px-2 py-1 bg-white border border-[#CBD5E1] rounded-lg text-[#111827] font-mono"
                />
              </div>

              <div>
                <label className="text-[#4B5563] text-[10px] font-medium block mb-1">Hasta índice:</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rampEndIdx}
                  onChange={(e) => setRampEndIdx(Number(e.target.value))}
                  className="w-full min-h-[36px] px-2 py-1 bg-white border border-[#CBD5E1] rounded-lg text-[#111827] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-[#E2E8F0]">
                <input
                  type="color"
                  value={rampStartColor}
                  onChange={(e) => setRampStartColor(e.target.value)}
                  className="w-7 h-7 p-0 border border-[#CBD5E1] rounded bg-transparent cursor-pointer"
                />
                <span className="text-[11px] text-[#374151] font-medium">Inicio</span>
              </div>

              <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-[#E2E8F0]">
                <input
                  type="color"
                  value={rampEndColor}
                  onChange={(e) => setRampEndColor(e.target.value)}
                  className="w-7 h-7 p-0 border border-[#CBD5E1] rounded bg-transparent cursor-pointer"
                />
                <span className="text-[11px] text-[#374151] font-medium">Fin</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyRamp}
              className="w-full min-h-[40px] py-1.5 bg-[#FDF2F5] hover:bg-[#FCE7EF] border border-[#7C2D48]/30 text-[#7C2D48] rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generar Rampa de Color</span>
            </button>
          </div>

          {/* 3. Palette Cycling (roll_palette) */}
          <div className="p-3 bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#111827]">
                <RotateCw className="w-3.5 h-3.5 text-[#7C2D48]" />
                <span>Ciclo (roll_palette)</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  isRolling
                    ? "bg-[#EEF6F1] text-[#2F6F4E] border border-[#2F6F4E]/30"
                    : "bg-slate-200 text-[#6B7280]"
                }`}
              >
                {isRolling ? "Activo" : "Pausa"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[#4B5563] text-[10px] font-medium block mb-1">Inicio:</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rollStartIdx}
                  onChange={(e) => setRollStartIdx(Number(e.target.value))}
                  className="w-full min-h-[36px] px-2 py-1 bg-white border border-[#CBD5E1] rounded-lg text-[#111827] font-mono"
                />
              </div>

              <div>
                <label className="text-[#4B5563] text-[10px] font-medium block mb-1">Fin:</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rollEndIdx}
                  onChange={(e) => setRollEndIdx(Number(e.target.value))}
                  className="w-full min-h-[36px] px-2 py-1 bg-white border border-[#CBD5E1] rounded-lg text-[#111827] font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRolling(!isRolling)}
              className={`w-full min-h-[40px] py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isRolling
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-[#7C2D48] hover:bg-[#642239] text-white"
              }`}
            >
              {isRolling ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Detener Simulación</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Simular Ciclo en Vivo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
