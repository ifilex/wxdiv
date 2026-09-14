import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Plus,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
} from "lucide-react";
import { validateDivSyntax, DivDiagnostic } from "../engine/divParser";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onAskAiFix?: (diagnostic: DivDiagnostic) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onRun,
  onAskAiFix,
}) => {
  const [diagnostics, setDiagnostics] = useState<DivDiagnostic[]>([]);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Validate syntax whenever code changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const issues = validateDivSyntax(code);
      setDiagnostics(issues);
    }, 250);
    return () => clearTimeout(timer);
  }, [code]);

  // Keep gutter scroll in sync with textarea
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Track cursor position (Line & Column)
  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const textBefore = code.slice(0, textareaRef.current.selectionStart);
    const lineArr = textBefore.split("\n");
    const currentLine = lineArr.length;
    const currentCol = lineArr[lineArr.length - 1].length + 1;
    setCursorPos({ line: currentLine, col: currentCol });
  };

  // Jump to specific line in editor
  const jumpToLine = (targetLine: number) => {
    if (!textareaRef.current) return;
    const lines = code.split("\n");
    let charOffset = 0;
    for (let i = 0; i < Math.min(targetLine - 1, lines.length); i++) {
      charOffset += lines[i].length + 1;
    }

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charOffset, charOffset + (lines[targetLine - 1]?.length || 0));

    // Scroll line into view
    const lineHeight = 24; // matches leading-6
    const scrollTarget = (targetLine - 1) * lineHeight - 60;
    textareaRef.current.scrollTop = Math.max(0, scrollTarget);
    if (gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }

    setHighlightedLine(targetLine);
    setTimeout(() => setHighlightedLine(null), 2000);
    setCursorPos({ line: targetLine, col: 1 });
  };

  const insertSnippet = (snippet: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newCode = code.substring(0, start) + "\n" + snippet + "\n" + code.substring(end);
    onChange(newCode);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length + 2, start + snippet.length + 2);
      updateCursorPosition();
    }, 50);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lines = useMemo(() => code.split("\n"), [code]);

  // Map diagnostics by line
  const diagnosticsByLine = useMemo(() => {
    const map = new Map<number, DivDiagnostic[]>();
    diagnostics.forEach((d) => {
      const list = map.get(d.line) || [];
      list.push(d);
      map.set(d.line, list);
    });
    return map;
  }, [diagnostics]);

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;

  return (
    <div className="flex flex-col h-full bg-[#080d1a] border border-slate-800 rounded-lg overflow-hidden">
      {/* Editor Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0d1527] border-b border-slate-800 text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">Editor DIV Games Studio</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px] font-mono">
            Sintaxis 100% DIV
          </span>
        </div>

        {/* Quick Snippets Inserter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() =>
              insertSnippet(
                `PROCESS nuevo_proceso(x, y)\nBEGIN\n  graph = 1;\n  LOOP\n    FRAME;\n  END\nEND`
              )
            }
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors text-xs"
            title="Insertar definición de Proceso"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>+ Proceso</span>
          </button>
          <button
            onClick={() => insertSnippet(`LOOP\n  FRAME;\nEND`)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
          >
            + LOOP FRAME
          </button>
          <button
            onClick={() => insertSnippet(`IF (collision(type enemigo))\n  signal(id, s_kill);\nEND`)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
          >
            + Colisión
          </button>
          <button
            onClick={() => insertSnippet(`sound(1, 100, 256);`)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
          >
            + Sonido
          </button>
          <button
            onClick={handleCopy}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors text-xs"
            title="Copiar código"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </button>
        </div>
      </div>

      {/* Editor Body with Synchronized Line Numbers */}
      <div className="relative flex-1 flex overflow-hidden font-mono text-xs">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          className="w-14 py-3 bg-[#0a1020] border-r border-slate-800/80 text-right select-none text-slate-500 overflow-hidden font-mono leading-6 flex-shrink-0"
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const lineDiagnostics = diagnosticsByLine.get(lineNum);
            const hasError = lineDiagnostics?.some((d) => d.severity === "error");
            const hasWarning = lineDiagnostics?.some((d) => d.severity === "warning");
            const isCurrent = cursorPos.line === lineNum;
            const isHighlighted = highlightedLine === lineNum;

            return (
              <div
                key={idx}
                onClick={() => jumpToLine(lineNum)}
                title={
                  lineDiagnostics
                    ? lineDiagnostics.map((d) => `Línea ${lineNum}: ${d.message}`).join("\n")
                    : `Línea ${lineNum} (clic para saltar)`
                }
                className={`h-6 leading-6 pr-2.5 pl-1 flex items-center justify-end gap-1.5 cursor-pointer transition-colors ${
                  isHighlighted
                    ? "bg-cyan-500/20 text-cyan-300 font-bold"
                    : hasError
                    ? "bg-rose-950/60 text-rose-400 font-bold hover:bg-rose-900/60"
                    : hasWarning
                    ? "bg-amber-950/40 text-amber-400 font-bold hover:bg-amber-900/40"
                    : isCurrent
                    ? "bg-slate-800/50 text-slate-200 font-semibold"
                    : "hover:bg-slate-800/30 hover:text-slate-300"
                }`}
              >
                {hasError ? (
                  <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                ) : hasWarning ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                ) : isCurrent ? (
                  <span className="w-1 h-3 rounded-full bg-cyan-400/80 flex-shrink-0" />
                ) : null}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Textarea Code Input */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => {
            onChange(e.target.value);
            updateCursorPosition();
          }}
          onScroll={handleScroll}
          onKeyUp={updateCursorPosition}
          onClick={updateCursorPosition}
          onSelect={updateCursorPosition}
          wrap="off"
          spellCheck={false}
          className="flex-1 py-3 px-3.5 bg-transparent text-slate-100 resize-none outline-none leading-6 h-full overflow-auto whitespace-pre font-mono text-xs selection:bg-emerald-600/30"
          placeholder="PROGRAM mi_juego;\nBEGIN\n  set_mode(m640x480);\n  LOOP\n    FRAME;\n  END\nEND"
        />
      </div>

      {/* Expandable Diagnostics Drawer (if toggled or errors exist) */}
      {showAllErrors && diagnostics.length > 0 && (
        <div className="max-h-48 overflow-y-auto bg-[#070c18] border-t border-slate-800 p-2 font-mono text-xs divide-y divide-slate-800/50">
          <div className="flex items-center justify-between pb-1.5 px-1 text-[11px] text-slate-400 font-sans font-semibold">
            <span>Lista de Diagnósticos de Sintaxis DIV ({diagnostics.length})</span>
            <button
              onClick={() => setShowAllErrors(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              Cerrar panel
            </button>
          </div>
          {diagnostics.map((diag, i) => (
            <div
              key={i}
              className="py-1.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-800/40 rounded transition-colors group"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {diag.severity === "error" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                )}
                <button
                  onClick={() => jumpToLine(diag.line)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400 hover:bg-slate-700 text-[11px] font-bold flex-shrink-0"
                >
                  Línea {diag.line}
                </button>
                <span className="text-slate-300 truncate text-[11px]">{diag.message}</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => jumpToLine(diag.line)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700 text-[10px] flex items-center gap-1 transition-colors"
                >
                  <span>Ir</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                {onAskAiFix && (
                  <button
                    onClick={() => onAskAiFix(diag)}
                    className="px-2 py-0.5 rounded bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/40 text-[10px] flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>IA</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Diagnostics / Status Bar */}
      <div className="px-3 py-1.5 bg-[#0b1222] border-t border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 overflow-x-auto max-w-[70%]">
          {diagnostics.length === 0 ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sintaxis DIV Games Studio verificada (0 errores)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAllErrors(!showAllErrors)}
                className="flex items-center gap-1 text-rose-400 font-semibold hover:underline"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {errorCount > 0 && `${errorCount} error${errorCount > 1 ? "es" : ""}`}
                  {errorCount > 0 && warningCount > 0 && ", "}
                  {warningCount > 0 && `${warningCount} aviso${warningCount > 1 ? "s" : ""}`}
                </span>
                {showAllErrors ? (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                ) : (
                  <ChevronUp className="w-3 h-3 text-slate-400" />
                )}
              </button>

              <button
                onClick={() => jumpToLine(diagnostics[0].line)}
                className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60 text-[11px] font-bold"
              >
                Línea {diagnostics[0].line}
              </button>

              <span
                onClick={() => jumpToLine(diagnostics[0].line)}
                className="text-slate-300 truncate cursor-pointer hover:text-white max-w-sm text-[11px]"
                title="Hacer clic para ir a la línea del error"
              >
                {diagnostics[0].message}
              </span>

              {onAskAiFix && (
                <button
                  onClick={() => onAskAiFix(diagnostics[0])}
                  className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 text-[11px] whitespace-nowrap ml-1 font-sans"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Corregir con IA</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px] select-none">
          <span className="text-cyan-400/90 font-semibold">
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span className="hidden sm:inline">|</span>
          <span>{lines.length} líneas</span>
        </div>
      </div>
    </div>
  );
};
