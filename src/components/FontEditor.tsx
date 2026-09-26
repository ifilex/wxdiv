import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Type,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Play,
  RotateCcw,
  Sparkles,
  Check,
  Code,
  Palette,
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Eraser,
  PenTool,
  Grid,
} from "lucide-react";
import {
  DivFont,
  DEFAULT_DIV_FONTS,
  createEmptyGlyph,
  scaleGlyph,
  renderDivBitmapText,
  generateBaseGlyphs,
} from "../engine/fonts";
import { DivRuntime } from "../engine/runtime";

interface FontEditorProps {
  runtime?: DivRuntime;
  onCodeInsert?: (codeSnippet: string) => void;
  onInsertCode?: (codeSnippet: string) => void;
  onRunGame?: () => void;
}

const PRESET_COLORS = [
  { name: "Oro Arcade", color: "#facc15", sec: "#b45309" },
  { name: "Cian Neón", color: "#38bdf8", sec: "#0284c7" },
  { name: "Rojo Sangre", color: "#ef4444", sec: "#991b1b" },
  { name: "Verde Fósforo", color: "#22c55e", sec: "#15803d" },
  { name: "Blanco Puro", color: "#ffffff", sec: "#94a3b8" },
  { name: "Violeta Plasma", color: "#c084fc", sec: "#7e22ce" },
  { name: "Naranja Fuego", color: "#fb923c", sec: "#c2410c" },
  { name: "Plata Retro", color: "#cbd5e1", sec: "#475569" },
];

export const FontEditor: React.FC<FontEditorProps> = ({
  runtime,
  onCodeInsert,
  onInsertCode,
  onRunGame,
}) => {
  // Available fonts list
  const [fonts, setFonts] = useState<DivFont[]>(() => {
    const list: DivFont[] = [];
    if (runtime?.fonts) {
      runtime.fonts.forEach((f) => list.push(f));
    }
    return list.length > 0 ? list : DEFAULT_DIV_FONTS;
  });

  const [selectedFontId, setSelectedFontId] = useState<number>(1); // Default: DIV Arcade Gold
  const [selectedChar, setSelectedChar] = useState<string>("A");
  const [activeTool, setActiveTool] = useState<"pen" | "eraser">("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Live preview state
  const [previewText, setPreviewText] = useState("DIV GAMES STUDIO 3.0\nPUNTOS: 09990  VIDAS: 3");
  const [previewAlign, setPreviewAlign] = useState<number>(1); // 0=left, 1=center, 2=right
  const [previewBg, setPreviewBg] = useState<string>("#050811");
  const [codeCopied, setCodeCopied] = useState(false);
  const [appliedToast, setAppliedToast] = useState(false);

  // New Font Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newFontName, setNewFontName] = useState("Nueva Fuente");
  const [newFontFilename, setNewFontFilename] = useState("mifuente.fnt");
  const [newFontWidth, setNewFontWidth] = useState(10);
  const [newFontHeight, setNewFontHeight] = useState(12);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Current active font
  const currentFont = useMemo(() => {
    return fonts.find((f) => f.id === selectedFontId) || fonts[0] || DEFAULT_DIV_FONTS[0];
  }, [fonts, selectedFontId]);

  // Current character glyph
  const currentGlyph = useMemo(() => {
    const g = currentFont.glyphs[selectedChar];
    if (g && g.length === currentFont.charHeight && g[0]?.length === currentFont.charWidth) {
      return g;
    }
    // Return blank if missing
    return createEmptyGlyph(currentFont.charWidth, currentFont.charHeight);
  }, [currentFont, selectedChar]);

  // Sync with runtime
  const applyFontToRuntime = (updatedFont: DivFont) => {
    if (runtime && typeof runtime.loadFNT === "function") {
      runtime.loadFNT(updatedFont);
    }
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 2000);
  };

  // Update a single glyph in current font
  const updateCurrentGlyph = (newGlyph: number[][]) => {
    const updatedFont: DivFont = {
      ...currentFont,
      glyphs: {
        ...currentFont.glyphs,
        [selectedChar]: newGlyph,
      },
    };

    setFonts((prev) => prev.map((f) => (f.id === updatedFont.id ? updatedFont : f)));
    applyFontToRuntime(updatedFont);
  };

  // Pixel draw handlers
  const handlePixelPointerDown = (x: number, y: number) => {
    setIsDrawing(true);
    const updated = currentGlyph.map((row) => [...row]);
    updated[y][x] = activeTool === "pen" ? 1 : 0;
    updateCurrentGlyph(updated);
  };

  const handlePixelPointerEnter = (x: number, y: number) => {
    setHoverCoord({ x, y });
    if (isDrawing) {
      const updated = currentGlyph.map((row) => [...row]);
      updated[y][x] = activeTool === "pen" ? 1 : 0;
      updateCurrentGlyph(updated);
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  useEffect(() => {
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  // Transformation tools
  const handleClearGlyph = () => {
    updateCurrentGlyph(createEmptyGlyph(currentFont.charWidth, currentFont.charHeight));
  };

  const handleInvertGlyph = () => {
    const updated = currentGlyph.map((row) => row.map((px) => (px ? 0 : 1)));
    updateCurrentGlyph(updated);
  };

  const handleShiftGlyph = (dx: number, dy: number) => {
    const w = currentFont.charWidth;
    const h = currentFont.charHeight;
    const res = createEmptyGlyph(w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcX = x - dx;
        const srcY = y - dy;
        if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
          res[y][x] = currentGlyph[srcY][srcX];
        }
      }
    }
    updateCurrentGlyph(res);
  };

  // Update Font Properties
  const updateFontProperty = <K extends keyof DivFont>(key: K, value: DivFont[K]) => {
    const updated: DivFont = {
      ...currentFont,
      [key]: value,
    };
    setFonts((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    applyFontToRuntime(updated);
  };

  // Create new font
  const handleCreateNewFont = () => {
    const newId = Math.max(4, ...fonts.map((f) => f.id)) + 1;
    const baseGlyphs = generateBaseGlyphs(8, 8);
    const scaledGlyphs: Record<string, number[][]> = {};

    for (const [ch, g] of Object.entries(baseGlyphs)) {
      scaledGlyphs[ch] = scaleGlyph(g, 8, 8, newFontWidth, newFontHeight);
    }

    const createdFont: DivFont = {
      id: newId,
      name: newFontName.trim() || `Fuente ${newId}`,
      filename: newFontFilename.trim() || `font_${newId}.fnt`,
      charWidth: newFontWidth,
      charHeight: newFontHeight,
      color: "#facc15",
      secondaryColor: "#b45309",
      shadowColor: "#000000",
      hasShadow: true,
      spacing: 2,
      glyphs: scaledGlyphs,
    };

    setFonts((prev) => [...prev, createdFont]);
    setSelectedFontId(newId);
    applyFontToRuntime(createdFont);
    setIsNewModalOpen(false);
  };

  // Duplicate font
  const handleDuplicateFont = () => {
    const newId = Math.max(4, ...fonts.map((f) => f.id)) + 1;
    const cloned: DivFont = {
      ...currentFont,
      id: newId,
      name: `${currentFont.name} (Copia)`,
      filename: `copia_${currentFont.filename}`,
      glyphs: JSON.parse(JSON.stringify(currentFont.glyphs)),
    };
    setFonts((prev) => [...prev, cloned]);
    setSelectedFontId(newId);
    applyFontToRuntime(cloned);
  };

  // Delete font
  const handleDeleteFont = () => {
    if (currentFont.id <= 3) return; // built-in protected
    const remaining = fonts.filter((f) => f.id !== currentFont.id);
    setFonts(remaining);
    if (runtime && typeof runtime.unload_fnt === "function") {
      runtime.unload_fnt(currentFont.id);
    }
    setSelectedFontId(remaining[0]?.id || 1);
  };

  // Export font to JSON file
  const handleExportFont = () => {
    const dataStr = JSON.stringify(currentFont, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFont.filename.endsWith(".fnt")
      ? currentFont.filename
      : `${currentFont.filename}.fnt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import font from JSON file
  const handleImportFont = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as DivFont;
        if (parsed.charWidth && parsed.charHeight && parsed.glyphs) {
          const newId = Math.max(4, ...fonts.map((f) => f.id)) + 1;
          parsed.id = newId;
          setFonts((prev) => [...prev, parsed]);
          setSelectedFontId(newId);
          applyFontToRuntime(parsed);
        }
      } catch (err) {
        alert("Error al cargar archivo de fuente: formato no válido.");
      }
    };
    reader.readAsText(file);
  };

  // Generate DIV Code Snippet
  const getDivCodeSnippet = () => {
    return `// Cargar y utilizar fuente FNT en WXDIV
GLOBAL
    fnt_juego = 0;

PROCESS main()
BEGIN
    set_mode(m640x480);
    set_fps(60, 0);

    // Cargar fuente FNT (ID: ${currentFont.id})
    fnt_juego = load_fnt("${currentFont.filename}");

    // Escribir texto formateado en pantalla
    // write(fuente, x, y, alineacion, texto)
    // alineacion: 0 = Izquierda, 1 = Centro, 2 = Derecha
    write(fnt_juego, 320, 40, 1, "${previewText.split("\n")[0] || "HOLA MUNDO"}");
    write_int(fnt_juego, 320, 80, 1, &score);

    LOOP
        FRAME;
    END
END`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getDivCodeSnippet());
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleInsertCode = () => {
    const snippet = getDivCodeSnippet();
    if (onInsertCode) {
      onInsertCode(snippet);
    } else if (onCodeInsert) {
      onCodeInsert(snippet);
    }
  };

  // Render Live Preview Canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Fill background
    ctx.fillStyle = previewBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Render preview lines
    const lines = previewText.split("\n");
    const lineHeight = currentFont.charHeight + 6;
    const totalBlockH = lines.length * lineHeight;
    let startY = Math.max(14, Math.floor((canvas.height - totalBlockH) / 2));

    const alignX =
      previewAlign === 1
        ? Math.floor(canvas.width / 2)
        : previewAlign === 2
        ? canvas.width - 24
        : 24;

    for (const line of lines) {
      renderDivBitmapText(ctx, currentFont, line, alignX, startY, previewAlign);
      startY += lineHeight;
    }
  }, [currentFont, previewText, previewAlign, previewBg]);

  // Generate ASCII character table list
  const charCategories = useMemo(() => {
    const lettersUpper = [];
    for (let c = 65; c <= 90; c++) lettersUpper.push(String.fromCharCode(c));

    const lettersLower = [];
    for (let c = 97; c <= 122; c++) lettersLower.push(String.fromCharCode(c));

    const numbers = [];
    for (let c = 48; c <= 57; c++) numbers.push(String.fromCharCode(c));

    const symbols = [" ", "!", '"', "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/", ":", ";", "<", "=", ">", "?", "@", "[", "\\", "]", "^", "_"];

    return { lettersUpper, lettersLower, numbers, symbols };
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-[#050811] text-slate-200 select-none overflow-hidden text-xs">
      {/* Top Controls Bar */}
      <div className="h-11 px-3 bg-[#080d1a] border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
        {/* Left: Font selection */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Type className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedFontId}
                onChange={(e) => setSelectedFontId(Number(e.target.value))}
                className="bg-[#0e1628] border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
              >
                {fonts.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.id}] {f.name} ({f.charWidth}x{f.charHeight}) {f.filename}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                title="Crear Nueva Fuente FNT"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDuplicateFont}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                title="Duplicar Fuente Actual"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {currentFont.id > 3 && (
                <button
                  onClick={handleDeleteFont}
                  className="p-1 rounded bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300"
                  title="Eliminar Fuente de Usuario"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {appliedToast && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono animate-in fade-in">
              <Check className="w-3 h-3" /> Aplicado a Motor DIV
            </span>
          )}

          <button
            onClick={handleExportFont}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            title="Exportar archivo .FNT"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Exportar .FNT</span>
          </button>

          <label
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            title="Importar archivo .FNT"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Importar</span>
            <input
              type="file"
              accept=".fnt,.json"
              onChange={handleImportFont}
              className="hidden"
            />
          </label>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/50 hover:bg-amber-900/70 border border-amber-600/40 text-amber-300 font-mono"
            title="Copiar código DIV para usar esta fuente"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{codeCopied ? "¡Copiado!" : "Código DIV"}</span>
          </button>

          {onCodeInsert && (
            <button
              onClick={handleInsertCode}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-900/60 hover:bg-cyan-800/80 border border-cyan-600/40 text-cyan-200 font-mono"
              title="Insertar código de carga en el Editor DIV"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Insertar</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Body: 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Character Map (ASCII) */}
        <div className="w-56 border-r border-slate-800 flex flex-col bg-[#070b14] overflow-y-auto">
          <div className="p-2 border-b border-slate-800 font-semibold text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Mapa de Caracteres</span>
            <span className="text-amber-400 font-mono">'{selectedChar}' ({selectedChar.charCodeAt(0)})</span>
          </div>

          <div className="p-2 space-y-3">
            {/* Letters Upper */}
            <div>
              <div className="text-[10px] text-slate-500 mb-1 font-mono">Mayúsculas (A-Z)</div>
              <div className="grid grid-cols-6 gap-1">
                {charCategories.lettersUpper.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChar(ch)}
                    className={`h-7 rounded flex items-center justify-center font-mono font-bold text-xs border transition-colors ${
                      selectedChar === ch
                        ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20"
                        : "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Letters Lower */}
            <div>
              <div className="text-[10px] text-slate-500 mb-1 font-mono">Minúsculas (a-z)</div>
              <div className="grid grid-cols-6 gap-1">
                {charCategories.lettersLower.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChar(ch)}
                    className={`h-7 rounded flex items-center justify-center font-mono font-bold text-xs border transition-colors ${
                      selectedChar === ch
                        ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20"
                        : "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Numbers */}
            <div>
              <div className="text-[10px] text-slate-500 mb-1 font-mono">Números (0-9)</div>
              <div className="grid grid-cols-5 gap-1">
                {charCategories.numbers.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChar(ch)}
                    className={`h-7 rounded flex items-center justify-center font-mono font-bold text-xs border transition-colors ${
                      selectedChar === ch
                        ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20"
                        : "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Symbols */}
            <div>
              <div className="text-[10px] text-slate-500 mb-1 font-mono">Signos y Puntuación</div>
              <div className="grid grid-cols-6 gap-1">
                {charCategories.symbols.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChar(ch)}
                    className={`h-7 rounded flex items-center justify-center font-mono font-bold text-xs border transition-colors ${
                      selectedChar === ch
                        ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20"
                        : "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300"
                    }`}
                  >
                    {ch === " " ? "␣" : ch}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Pixel Grid Editor */}
        <div className="flex-1 flex flex-col bg-[#050811] overflow-hidden">
          {/* Pixel Editor Toolbar */}
          <div className="h-10 px-4 bg-[#0a0f20] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-amber-400 font-bold">
                Editando: '{selectedChar}' [{currentFont.charWidth}x{currentFont.charHeight} px]
              </span>

              {hoverCoord && (
                <span className="text-[10px] text-slate-500 font-mono">
                  X:{hoverCoord.x} Y:{hoverCoord.y}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Tool: Pen */}
              <button
                onClick={() => setActiveTool("pen")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                  activeTool === "pen"
                    ? "bg-cyan-600 text-white border-cyan-400"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
                title="Lápiz: Dibujar píxel"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Píxel</span>
              </button>

              {/* Tool: Eraser */}
              <button
                onClick={() => setActiveTool("eraser")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                  activeTool === "eraser"
                    ? "bg-cyan-600 text-white border-cyan-400"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
                title="Borrador: Borrar píxel"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Borrar</span>
              </button>

              <div className="w-px h-4 bg-slate-700 mx-1" />

              {/* Shift Arrows */}
              <button
                onClick={() => handleShiftGlyph(0, -1)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Desplazar Arriba"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleShiftGlyph(0, 1)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Desplazar Abajo"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleShiftGlyph(-1, 0)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Desplazar Izquierda"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleShiftGlyph(1, 0)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Desplazar Derecha"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-slate-700 mx-1" />

              {/* Invert */}
              <button
                onClick={handleInvertGlyph}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                title="Invertir píxeles"
              >
                Invertir
              </button>

              {/* Clear */}
              <button
                onClick={handleClearGlyph}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700"
                title="Limpiar carácter"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Interactive Pixel Matrix Grid */}
          <div className="flex-1 flex items-center justify-center p-4 bg-[#03060f] overflow-auto">
            <div
              className="inline-block p-2 bg-[#0a1020] border-2 border-slate-700 rounded-lg shadow-2xl"
              style={{
                touchAction: "none",
              }}
            >
              <div
                className="grid gap-[2px] bg-slate-900/90 p-[2px] rounded border border-slate-800"
                style={{
                  gridTemplateColumns: `repeat(${currentFont.charWidth}, minmax(0, 1fr))`,
                }}
              >
                {currentGlyph.map((row, y) =>
                  row.map((pixel, x) => {
                    const isLowerHalf = y >= currentFont.charHeight / 2;
                    const fillColor =
                      pixel === 1
                        ? isLowerHalf && currentFont.secondaryColor
                          ? currentFont.secondaryColor
                          : currentFont.color
                        : "transparent";

                    return (
                      <div
                        key={`${x}-${y}`}
                        onPointerDown={() => handlePixelPointerDown(x, y)}
                        onPointerEnter={() => handlePixelPointerEnter(x, y)}
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-[2px] border cursor-pointer flex items-center justify-center transition-transform active:scale-95 ${
                          pixel === 1
                            ? "border-amber-300/40 shadow-sm"
                            : "border-slate-800/80 bg-slate-950 hover:bg-slate-800/60"
                        }`}
                        style={{
                          backgroundColor: fillColor,
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Palette, Properties & Live Interactive Preview */}
        <div className="w-80 border-l border-slate-800 flex flex-col bg-[#070b14] overflow-y-auto">
          <div className="p-3 border-b border-slate-800 font-semibold text-xs text-slate-300 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-amber-400" />
            <span>Colores y Sombra FNT</span>
          </div>

          <div className="p-3 space-y-3.5 border-b border-slate-800">
            {/* Color Presets */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">
                Paleta de Color Rápida:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_COLORS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      updateFontProperty("color", p.color);
                      updateFontProperty("secondaryColor", p.sec);
                    }}
                    className="h-6 rounded border border-slate-700 flex items-center justify-center p-1 text-[10px] truncate"
                    style={{
                      background: `linear-gradient(to bottom, ${p.color}, ${p.sec})`,
                      color: "#000",
                      fontWeight: "bold",
                    }}
                    title={p.name}
                  >
                    {p.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Color Superior:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={currentFont.color}
                    onChange={(e) => updateFontProperty("color", e.target.value)}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[10px] text-slate-300">{currentFont.color}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Color Inferior (Degradado):</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={currentFont.secondaryColor || currentFont.color}
                    onChange={(e) => updateFontProperty("secondaryColor", e.target.value)}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[10px] text-slate-300">
                    {currentFont.secondaryColor || currentFont.color}
                  </span>
                </div>
              </div>
            </div>

            {/* Shadow options */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={currentFont.hasShadow}
                  onChange={(e) => updateFontProperty("hasShadow", e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Sombra Retro Pixel (1px)</span>
              </label>

              {currentFont.hasShadow && (
                <input
                  type="color"
                  value={currentFont.shadowColor || "#000000"}
                  onChange={(e) => updateFontProperty("shadowColor", e.target.value)}
                  className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer"
                  title="Color de Sombra"
                />
              )}
            </div>

            {/* Spacing */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Espaciado entre caracteres:</span>
                <span className="font-mono text-amber-300">{currentFont.spacing} px</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="1"
                value={currentFont.spacing}
                onChange={(e) => updateFontProperty("spacing", Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Live Preview Area */}
          <div className="flex-1 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-xs text-slate-300 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Vista Previa en Vivo</span>
              </div>

              {/* Alignments */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
                <button
                  onClick={() => setPreviewAlign(0)}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    previewAlign === 0 ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400"
                  }`}
                  title="Alinear a la Izquierda (0)"
                >
                  Izq
                </button>
                <button
                  onClick={() => setPreviewAlign(1)}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    previewAlign === 1 ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400"
                  }`}
                  title="Alinear al Centro (1)"
                >
                  Cen
                </button>
                <button
                  onClick={() => setPreviewAlign(2)}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    previewAlign === 2 ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400"
                  }`}
                  title="Alinear a la Derecha (2)"
                >
                  Der
                </button>
              </div>
            </div>

            {/* Preview Canvas */}
            <div className="w-full h-32 rounded-lg border border-slate-800 overflow-hidden shadow-inner flex-shrink-0 relative">
              <canvas
                ref={previewCanvasRef}
                width={296}
                height={128}
                className="w-full h-full block"
              />
            </div>

            {/* Preview text input */}
            <div className="mt-2.5">
              <label className="block text-[10px] text-slate-400 mb-1">
                Texto de prueba interactivo:
              </label>
              <textarea
                rows={2}
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                className="w-full bg-[#0e1628] border border-slate-700 rounded p-1.5 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-500 resize-none"
                placeholder="Escribe texto de prueba..."
              />
            </div>

            {/* Quick test phrases */}
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                onClick={() => setPreviewText("DIV GAMES STUDIO 3.0")}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 hover:text-white"
              >
                DIV Studio
              </button>
              <button
                onClick={() => setPreviewText("SCORE: 009850  LIVES: 3")}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 hover:text-white"
              >
                HUD Arcade
              </button>
              <button
                onClick={() => setPreviewText("GAME OVER\nINSERT COIN")}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 hover:text-white"
              >
                Game Over
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* New Font Modal Dialog */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0a1020] border border-amber-500/40 rounded-xl shadow-2xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Nueva Fuente FNT
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Nombre de la Fuente:</label>
              <input
                type="text"
                value={newFontName}
                onChange={(e) => setNewFontName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                placeholder="Ej. Arcade Bold"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Nombre de Archivo (.fnt):</label>
              <input
                type="text"
                value={newFontFilename}
                onChange={(e) => setNewFontFilename(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                placeholder="arcade.fnt"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Ancho (px):</label>
                <select
                  value={newFontWidth}
                  onChange={(e) => setNewFontWidth(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                >
                  <option value={8}>8 px</option>
                  <option value={10}>10 px</option>
                  <option value={12}>12 px</option>
                  <option value={14}>14 px</option>
                  <option value={16}>16 px</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Alto (px):</label>
                <select
                  value={newFontHeight}
                  onChange={(e) => setNewFontHeight(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                >
                  <option value={8}>8 px</option>
                  <option value={10}>10 px</option>
                  <option value={12}>12 px</option>
                  <option value={14}>14 px</option>
                  <option value={16}>16 px</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewFont}
                className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                Crear Fuente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
