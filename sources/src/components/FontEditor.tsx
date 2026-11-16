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
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"grid" | "chars" | "preview">("grid");

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
        setErrorToast("Error al cargar archivo de fuente: formato no válido.");
        setTimeout(() => setErrorToast(null), 3500);
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
    <div className="w-full h-full flex-1 min-h-0 flex flex-col bg-[#F7F8FA] text-[#111827] select-none overflow-hidden text-xs font-sans">
      {/* Top Controls Bar */}
      <div className="px-3 py-2 bg-white border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        {/* Left: Font selection */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FDF2F5] text-[#7C2D48] flex items-center justify-center flex-shrink-0">
            <Type className="w-4 h-4" />
          </div>
          <select
            aria-label="Seleccionar fuente FNT"
            value={selectedFontId}
            onChange={(e) => setSelectedFontId(Number(e.target.value))}
            className="min-h-[38px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs text-[#111827] font-mono font-semibold focus:outline-none focus:border-[#7C2D48] max-w-[180px] sm:max-w-xs truncate cursor-pointer"
          >
            {fonts.map((f) => (
              <option key={f.id} value={f.id}>
                [{f.id}] {f.name} ({f.charWidth}x{f.charHeight})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="min-w-[36px] min-h-[36px] rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] flex items-center justify-center cursor-pointer"
            title="Crear Nueva Fuente FNT"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDuplicateFont}
            className="min-w-[36px] min-h-[36px] rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] flex items-center justify-center cursor-pointer"
            title="Duplicar Fuente Actual"
          >
            <Copy className="w-4 h-4" />
          </button>
          {currentFont.id > 3 && (
            <button
              type="button"
              onClick={handleDeleteFont}
              className="min-w-[36px] min-h-[36px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
              title="Eliminar Fuente de Usuario"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {appliedToast && (
            <span className="text-[11px] text-[#2F6F4E] font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Guardado
            </span>
          )}

          <button
            type="button"
            onClick={handleExportFont}
            className="min-h-[36px] flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] border border-[#E2E8F0] font-semibold cursor-pointer whitespace-nowrap"
            title="Exportar archivo .FNT"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <label
            className="min-h-[36px] flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] border border-[#E2E8F0] font-semibold cursor-pointer whitespace-nowrap"
            title="Importar archivo .FNT"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar</span>
            <input
              type="file"
              accept=".fnt,.json"
              onChange={handleImportFont}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleCopyCode}
            className="min-h-[36px] flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FDF2F5] hover:bg-[#FCE7EF] border border-[#7C2D48]/30 text-[#7C2D48] font-semibold cursor-pointer whitespace-nowrap"
            title="Copiar código DIV para usar esta fuente"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{codeCopied ? "¡Copiado!" : "Código DIV"}</span>
          </button>

          {(onInsertCode || onCodeInsert) && (
            <button
              type="button"
              onClick={handleInsertCode}
              className="min-h-[36px] flex items-center gap-1 px-3 py-1 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold cursor-pointer whitespace-nowrap"
              title="Insertar código de carga en el Editor DIV"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Insertar</span>
            </button>
          )}
        </div>
      </div>

      {errorToast && (
        <div className="px-3 py-1.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-medium text-center flex-shrink-0">
          {errorToast}
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden border-b border-[#E2E8F0] bg-white px-2 py-1.5 gap-1.5 flex-shrink-0">
        {[
          { id: "grid" as const, label: `Glifo '${selectedChar}'` },
          { id: "chars" as const, label: "Caracteres" },
          { id: "preview" as const, label: "Color y Vista" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMobileTab(t.id)}
            className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer ${
              mobileTab === t.id ? "bg-[#7C2D48] text-white" : "bg-[#F1F5F9] text-[#4B5563]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Studio Body: 3-column layout on lg, tabbed on mobile */}
      <div className="flex-1 min-h-0 w-full flex overflow-hidden">
        {/* Left Column: Character Map (ASCII) */}
        <div
          className={`${
            mobileTab === "chars" ? "flex w-full" : "hidden"
          } lg:flex lg:w-60 border-r border-[#E2E8F0] flex-col bg-white overflow-y-auto flex-shrink-0`}
        >
          <div className="p-2.5 border-b border-[#E2E8F0] font-bold text-[11px] text-[#6B7280] uppercase tracking-wider flex items-center justify-between">
            <span>Mapa de Caracteres</span>
            <span className="text-[#7C2D48] font-mono">
              '{selectedChar}' ({selectedChar.charCodeAt(0)})
            </span>
          </div>

          <div className="p-2.5 space-y-3">
            <div>
              <div className="text-[10px] text-[#6B7280] font-semibold mb-1.5">Mayúsculas (A-Z)</div>
              <div className="grid grid-cols-6 gap-1">
                {charCategories.lettersUpper.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setSelectedChar(ch);
                      setMobileTab("grid");
                    }}
                    className={`min-h-[34px] rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-colors cursor-pointer ${
                      selectedChar === ch
                        ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                        : "bg-[#F7F8FA] hover:bg-slate-100 border-[#E2E8F0] text-[#111827]"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-[#6B7280] font-semibold mb-1.5">Minúsculas (a-z)</div>
              <div className="grid grid-cols-6 gap-1">
                {charCategories.lettersLower.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setSelectedChar(ch);
                      setMobileTab("grid");
                    }}
                    className={`min-h-[34px] rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-colors cursor-pointer ${
                      selectedChar === ch
                        ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                        : "bg-[#F7F8FA] hover:bg-slate-100 border-[#E2E8F0] text-[#111827]"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-[#6B7280] font-semibold mb-1.5">Números (0-9)</div>
              <div className="grid grid-cols-5 gap-1">
                {charCategories.numbers.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setSelectedChar(ch);
                      setMobileTab("grid");
                    }}
                    className={`min-h-[34px] rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-colors cursor-pointer ${
                      selectedChar === ch
                        ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                        : "bg-[#F7F8FA] hover:bg-slate-100 border-[#E2E8F0] text-[#111827]"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-[#6B7280] font-semibold mb-1.5">Signos</div>
              <div className="grid grid-cols-6 gap-1">
                {charCategories.symbols.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setSelectedChar(ch);
                      setMobileTab("grid");
                    }}
                    className={`min-h-[34px] rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-colors cursor-pointer ${
                      selectedChar === ch
                        ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                        : "bg-[#F7F8FA] hover:bg-slate-100 border-[#E2E8F0] text-[#111827]"
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
        <div
          className={`${
            mobileTab === "grid" ? "flex" : "hidden"
          } lg:flex flex-1 min-h-0 flex-col bg-[#F7F8FA] overflow-hidden`}
        >
          {/* Pixel Editor Toolbar */}
          <div className="px-3 py-2 bg-white border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#7C2D48] font-bold">
                '{selectedChar}' [{currentFont.charWidth}×{currentFont.charHeight}]
              </span>
              {hoverCoord && (
                <span className="text-[11px] text-[#6B7280] font-mono">
                  X:{hoverCoord.x} Y:{hoverCoord.y}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTool("pen")}
                className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  activeTool === "pen"
                    ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                    : "bg-[#F7F8FA] text-[#4B5563] border-[#E2E8F0]"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Píxel</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool("eraser")}
                className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  activeTool === "eraser"
                    ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                    : "bg-[#F7F8FA] text-[#4B5563] border-[#E2E8F0]"
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Borrar</span>
              </button>

              <div className="hidden sm:flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={() => handleShiftGlyph(0, -1)}
                  className="min-w-[32px] min-h-[34px] rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] flex items-center justify-center cursor-pointer"
                  title="Desplazar Arriba"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftGlyph(0, 1)}
                  className="min-w-[32px] min-h-[34px] rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] flex items-center justify-center cursor-pointer"
                  title="Desplazar Abajo"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftGlyph(-1, 0)}
                  className="min-w-[32px] min-h-[34px] rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] flex items-center justify-center cursor-pointer"
                  title="Desplazar Izquierda"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftGlyph(1, 0)}
                  className="min-w-[32px] min-h-[34px] rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#111827] flex items-center justify-center cursor-pointer"
                  title="Desplazar Derecha"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleInvertGlyph}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#374151] font-semibold border border-[#E2E8F0] cursor-pointer"
              >
                Invertir
              </button>

              <button
                type="button"
                onClick={handleClearGlyph}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Interactive Pixel Matrix Grid with Touch Slide Support */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-5 overflow-auto">
            <div
              className="inline-block p-2.5 bg-[#0F172A] border border-[#CBD5E1] rounded-2xl shadow-md touch-none"
              onPointerMove={(e) => {
                if (!isDrawing) return;
                const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
                const pxStr = target?.dataset?.px;
                const pyStr = target?.dataset?.py;
                if (pxStr !== undefined && pyStr !== undefined) {
                  handlePixelPointerEnter(Number(pxStr), Number(pyStr));
                }
              }}
              onPointerUp={() => setIsDrawing(false)}
              onPointerCancel={() => setIsDrawing(false)}
            >
              <div
                className="grid gap-[2px] bg-slate-900 p-[2px] rounded-lg border border-slate-800"
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
                        data-px={x}
                        data-py={y}
                        onPointerDown={(e) => {
                          try {
                            (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                          } catch {}
                          handlePixelPointerDown(x, y);
                        }}
                        onPointerEnter={() => handlePixelPointerEnter(x, y)}
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-[2px] border cursor-pointer flex items-center justify-center ${
                          pixel === 1
                            ? "border-amber-300/40 shadow-sm"
                            : "border-slate-800/80 bg-slate-950"
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
        <div
          className={`${
            mobileTab === "preview" ? "flex w-full" : "hidden"
          } lg:flex lg:w-80 border-l border-[#E2E8F0] flex-col bg-white overflow-y-auto flex-shrink-0`}
        >
          <div className="p-3 border-b border-[#E2E8F0] font-bold text-xs text-[#111827] flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#7C2D48]" />
            <span>Colores y Sombra FNT</span>
          </div>

          <div className="p-3 space-y-3.5 border-b border-[#E2E8F0]">
            <div>
              <label className="block text-[11px] font-semibold text-[#4B5563] mb-1.5">
                Estilos Rápidos:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_COLORS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      updateFontProperty("color", p.color);
                      updateFontProperty("secondaryColor", p.sec);
                    }}
                    className="min-h-[32px] rounded-lg border border-black/15 flex items-center justify-center p-1 text-[10px] truncate cursor-pointer"
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-[#4B5563] mb-1">Color Superior:</label>
                <div className="flex items-center gap-1.5 bg-[#F7F8FA] p-1.5 rounded-lg border border-[#E2E8F0]">
                  <input
                    type="color"
                    value={currentFont.color}
                    onChange={(e) => updateFontProperty("color", e.target.value)}
                    className="w-7 h-7 rounded border border-[#CBD5E1] bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[10px] text-[#111827]">{currentFont.color}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-[#4B5563] mb-1">Color Inferior:</label>
                <div className="flex items-center gap-1.5 bg-[#F7F8FA] p-1.5 rounded-lg border border-[#E2E8F0]">
                  <input
                    type="color"
                    value={currentFont.secondaryColor || currentFont.color}
                    onChange={(e) => updateFontProperty("secondaryColor", e.target.value)}
                    className="w-7 h-7 rounded border border-[#CBD5E1] bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[10px] text-[#111827]">
                    {currentFont.secondaryColor || currentFont.color}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#374151] font-medium">
                <input
                  type="checkbox"
                  checked={currentFont.hasShadow}
                  onChange={(e) => updateFontProperty("hasShadow", e.target.checked)}
                  className="rounded border-[#CBD5E1] accent-[#7C2D48] w-4 h-4"
                />
                <span>Sombra Retro (1px)</span>
              </label>

              {currentFont.hasShadow && (
                <input
                  type="color"
                  value={currentFont.shadowColor || "#000000"}
                  onChange={(e) => updateFontProperty("shadowColor", e.target.value)}
                  className="w-7 h-7 rounded border border-[#CBD5E1] bg-transparent cursor-pointer"
                  title="Color de Sombra"
                />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-[#4B5563] mb-1">
                <span>Espaciado entre letras:</span>
                <span className="font-mono font-bold text-[#7C2D48]">{currentFont.spacing} px</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="1"
                value={currentFont.spacing}
                onChange={(e) => updateFontProperty("spacing", Number(e.target.value))}
                className="w-full accent-[#7C2D48] h-2"
              />
            </div>
          </div>

          {/* Live Preview Area */}
          <div className="flex-1 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-xs text-[#111827] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#7C2D48]" />
                <span>Vista Previa</span>
              </div>

              <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
                {[
                  { id: 0, label: "Izq" },
                  { id: 1, label: "Cen" },
                  { id: 2, label: "Der" },
                ].map((al) => (
                  <button
                    key={al.id}
                    type="button"
                    onClick={() => setPreviewAlign(al.id)}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer ${
                      previewAlign === al.id ? "bg-[#7C2D48] text-white" : "text-[#4B5563]"
                    }`}
                  >
                    {al.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-32 rounded-xl border border-[#CBD5E1] overflow-hidden shadow-inner flex-shrink-0 relative bg-[#050811]">
              <canvas
                ref={previewCanvasRef}
                width={296}
                height={128}
                className="w-full h-full block"
              />
            </div>

            <div className="mt-2.5">
              <label className="block text-[11px] font-medium text-[#4B5563] mb-1">
                Texto de prueba:
              </label>
              <textarea
                rows={2}
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                className="w-full bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#111827] font-mono focus:outline-none focus:border-[#7C2D48] resize-none"
                placeholder="Escribe texto de prueba..."
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { label: "WXDIV", text: "WXDIV STUDIO 3.0" },
                { label: "HUD Arcade", text: "SCORE: 009850  LIVES: 3" },
                { label: "Game Over", text: "GAME OVER\nINSERT COIN" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPreviewText(preset.text)}
                  className="px-2 py-1 rounded-md bg-[#F1F5F9] text-[11px] font-medium text-[#374151] hover:bg-slate-200 cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Font Modal Dialog */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl p-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <h3 className="text-sm font-bold text-[#7C2D48] flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Nueva Fuente FNT
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-[#6B7280] hover:text-[#111827] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#4B5563] mb-1">Nombre:</label>
              <input
                type="text"
                value={newFontName}
                onChange={(e) => setNewFontName(e.target.value)}
                className="w-full min-h-[38px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#111827]"
                placeholder="Ej. Arcade Bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#4B5563] mb-1">Archivo (.fnt):</label>
              <input
                type="text"
                value={newFontFilename}
                onChange={(e) => setNewFontFilename(e.target.value)}
                className="w-full min-h-[38px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#111827] font-mono"
                placeholder="arcade.fnt"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#4B5563] mb-1">Ancho:</label>
                <select
                  value={newFontWidth}
                  onChange={(e) => setNewFontWidth(Number(e.target.value))}
                  className="w-full min-h-[38px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs text-[#111827]"
                >
                  {[8, 10, 12, 14, 16].map((v) => (
                    <option key={v} value={v}>
                      {v} px
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#4B5563] mb-1">Alto:</label>
                <select
                  value={newFontHeight}
                  onChange={(e) => setNewFontHeight(Number(e.target.value))}
                  className="w-full min-h-[38px] bg-[#F7F8FA] border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs text-[#111827]"
                >
                  {[8, 10, 12, 14, 16].map((v) => (
                    <option key={v} value={v}>
                      {v} px
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#F1F5F9] text-[#374151] font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateNewFont}
                className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold cursor-pointer"
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
