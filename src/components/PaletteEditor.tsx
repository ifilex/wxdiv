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

          // Shift one step cyclically
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
      showToast("Paleta sincronizada con el motor DIV Games Studio");
    }
    if (onApplyPaletteToRuntime) {
      onApplyPaletteToRuntime(currentPalette);
    }
  };

  // Generate DIV Code Snippet
  const handleInsertDivCode = () => {
    const preset = PALETTE_PRESETS.find((p) => p.id === selectedPresetId);
    const filename = preset ? preset.filename : "juego.pal";
    const snippet = `// ==========================================
// CONFIGURACIÓN DE PALETA DIV GAMES STUDIO
// ==========================================
// Cargar archivo de paleta en memoria
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
    // Generate text representation of 256 colors (R G B 0..63)
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
    <div className="h-full w-full bg-[#080d1a] text-slate-200 flex flex-col select-none font-sans overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="p-2.5 bg-[#0a1226] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-slate-300">
            PALETA DIV:
          </span>
          <select
            value={selectedPresetId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="bg-[#050914] border border-slate-700 text-cyan-300 text-xs rounded px-2.5 py-1 font-mono focus:border-cyan-500 focus:outline-none"
          >
            {PALETTE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleApplyToRuntime}
            className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-semibold rounded flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            title="Sincronizar esta paleta con el motor runtime DIV"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>APLICAR AL JUEGO</span>
          </button>

          <button
            onClick={handleInsertDivCode}
            className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-xs font-mono font-semibold rounded flex items-center gap-1.5 transition-all"
            title="Pegar load_pal, roll_palette y set_color en el editor"
          >
            <Code2 className="w-3 h-3" />
            <span>CÓDIGO DIV</span>
          </button>

          <button
            onClick={handleDownloadPal}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-mono font-semibold rounded flex items-center gap-1.5 transition-all"
            title="Descargar archivo .PAL compatible"
          >
            <Download className="w-3 h-3" />
            <span>DESCARGAR .PAL</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-cyan-950 border-b border-cyan-600/60 px-3 py-1 text-center text-xs font-mono text-cyan-300 flex items-center justify-center gap-1.5 animate-in fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content: Left Palette Grid (256 colors), Right Inspector & Tools */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left: 256 VGA Color Grid */}
        <div className="flex-1 p-3 flex flex-col items-center justify-center bg-[#060913] overflow-y-auto">
          <div className="w-full max-w-xl">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span>256 COLORES INDEXADOS (16 x 16)</span>
              <span className="text-cyan-400">
                Seleccionado: #{selectedIndex} ({currentPalette[selectedIndex]})
              </span>
            </div>

            {/* 16x16 Grid */}
            <div
              className="grid grid-cols-16 gap-1 p-2 bg-[#091124] border-2 border-slate-800 rounded shadow-inner"
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
                    id={`palette-color-${idx}`}
                    onClick={() => setSelectedIndex(idx)}
                    title={`Índice #${idx}\nHex: ${hex}\nDIV DOS R:${hexToDivColor(hex).r63} G:${hexToDivColor(hex).g63} B:${hexToDivColor(hex).b63}`}
                    className={`aspect-square rounded-xs relative transition-transform ${
                      isSelected
                        ? "ring-2 ring-white scale-125 z-10 shadow-lg"
                        : inRollRange
                        ? "ring-1 ring-amber-400 scale-105"
                        : "hover:scale-110 hover:z-5"
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

            <div className="mt-2 text-[11px] font-mono text-slate-500 text-center">
              Haz clic en cualquier muestra de color para editar sus componentes RGB o generar gradientes
            </div>
          </div>
        </div>

        {/* Right Sidebar: Color Inspector & Palette Tools */}
        <div className="w-full md:w-80 p-3 bg-[#0a1226] border-t md:border-t-0 md:border-l border-slate-800 flex flex-col gap-3 overflow-y-auto font-mono text-xs">
          {/* 1. Selected Color Inspector */}
          <div className="p-2.5 bg-[#060b18] border border-slate-800 rounded space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="font-bold text-slate-200">
                COLOR SELECCIONADO #{selectedIndex}
              </span>
              <div
                className="w-6 h-6 rounded border border-white/40 shadow-sm"
                style={{ backgroundColor: selectedColor.hex }}
              />
            </div>

            {/* Hex Input */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 text-[11px]">HEXADECIMAL:</span>
              <input
                type="text"
                value={selectedColor.hex.toUpperCase()}
                onChange={(e) => handleUpdateHex(e.target.value)}
                className="w-24 px-2 py-0.5 bg-[#03060f] border border-slate-700 rounded text-right text-cyan-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* DIV DOS 0..63 RGB Sliders */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                COMPATIBILIDAD DIV DOS (RGB 0..63):
              </div>

              {/* Red Slider */}
              <div className="flex items-center gap-2">
                <span className="w-4 text-red-400 font-bold">R</span>
                <input
                  type="range"
                  min={0}
                  max={63}
                  value={selectedColor.r63}
                  onChange={(e) => handleUpdateR63(Number(e.target.value))}
                  className="flex-1 accent-red-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <span className="w-8 text-right text-slate-300 font-mono text-[11px]">
                  {selectedColor.r63}
                </span>
              </div>

              {/* Green Slider */}
              <div className="flex items-center gap-2">
                <span className="w-4 text-emerald-400 font-bold">G</span>
                <input
                  type="range"
                  min={0}
                  max={63}
                  value={selectedColor.g63}
                  onChange={(e) => handleUpdateG63(Number(e.target.value))}
                  className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <span className="w-8 text-right text-slate-300 font-mono text-[11px]">
                  {selectedColor.g63}
                </span>
              </div>

              {/* Blue Slider */}
              <div className="flex items-center gap-2">
                <span className="w-4 text-cyan-400 font-bold">B</span>
                <input
                  type="range"
                  min={0}
                  max={63}
                  value={selectedColor.b63}
                  onChange={(e) => handleUpdateB63(Number(e.target.value))}
                  className="flex-1 accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <span className="w-8 text-right text-slate-300 font-mono text-[11px]">
                  {selectedColor.b63}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Color Ramp / Gradient Generator */}
          <div className="p-2.5 bg-[#060b18] border border-slate-800 rounded space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 border-b border-slate-800/80 pb-1">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>GENERADOR DE DEGRADADOS</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-slate-400 text-[10px]">DESDE ÍNDICE:</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rampStartIdx}
                  onChange={(e) => setRampStartIdx(Number(e.target.value))}
                  className="w-full px-2 py-0.5 bg-[#03060f] border border-slate-700 rounded text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px]">HASTA ÍNDICE:</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rampEndIdx}
                  onChange={(e) => setRampEndIdx(Number(e.target.value))}
                  className="w-full px-2 py-0.5 bg-[#03060f] border border-slate-700 rounded text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={rampStartColor}
                  onChange={(e) => setRampStartColor(e.target.value)}
                  className="w-6 h-6 p-0 border border-slate-700 rounded bg-transparent cursor-pointer"
                />
                <span className="text-[10px] text-slate-300">Color Inicio</span>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={rampEndColor}
                  onChange={(e) => setRampEndColor(e.target.value)}
                  className="w-6 h-6 p-0 border border-slate-700 rounded bg-transparent cursor-pointer"
                />
                <span className="text-[10px] text-slate-300">Color Fin</span>
              </div>
            </div>

            <button
              onClick={handleApplyRamp}
              className="w-full py-1 bg-amber-950 hover:bg-amber-900 border border-amber-700/60 text-amber-300 rounded font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>GENERAR RAMPA DE COLOR</span>
            </button>
          </div>

          {/* 3. Palette Cycling (roll_palette) */}
          <div className="p-2.5 bg-[#060b18] border border-slate-800 rounded space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isRolling ? "animate-spin" : ""}`} />
                <span>ROTACIÓN (ROLL_PALETTE)</span>
              </div>
              <span className={`text-[9px] px-1 rounded font-bold ${isRolling ? "bg-emerald-950 text-emerald-300 border border-emerald-700" : "bg-slate-900 text-slate-500"}`}>
                {isRolling ? "ACTIVO" : "PAUSA"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-slate-400 text-[10px]">RANGO INICIAL:</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rollStartIdx}
                  onChange={(e) => setRollStartIdx(Number(e.target.value))}
                  className="w-full px-2 py-0.5 bg-[#03060f] border border-slate-700 rounded text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px]">RANGO FINAL:</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rollEndIdx}
                  onChange={(e) => setRollEndIdx(Number(e.target.value))}
                  className="w-full px-2 py-0.5 bg-[#03060f] border border-slate-700 rounded text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRolling(!isRolling)}
                className={`flex-1 py-1 rounded font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors ${
                  isRolling
                    ? "bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200"
                    : "bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200"
                }`}
              >
                {isRolling ? (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>DETENER CICLO</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>SIMULAR EN VIVO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
