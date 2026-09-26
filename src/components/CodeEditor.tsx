import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Zap,
  Palette,
} from "lucide-react";
import { validateDivSyntax, DivDiagnostic } from "../engine/divParser";
import { DIV_AUTOCOMPLETE_ITEMS, DivSuggestion } from "../engine/divKeywords";
import { CodeAutocompletePopup } from "./CodeAutocompletePopup";
import { getCaretCoordinates } from "../utils/caretCoordinates";
import { highlightDivCode } from "../utils/codeHighlighter";

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
  const [syntaxHighlight, setSyntaxHighlight] = useState(true);

  // Autocomplete state
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(true);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<DivSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [autocompletePrefix, setAutocompletePrefix] = useState("");
  const [autocompletePos, setAutocompletePos] = useState({ top: 40, left: 70 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const editorBodyRef = useRef<HTMLDivElement>(null);

  // Validate syntax whenever code changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const issues = validateDivSyntax(code);
      setDiagnostics(issues);
    }, 250);
    return () => clearTimeout(timer);
  }, [code]);

  // Keep gutter and syntax overlay scroll in sync with textarea
  const handleScroll = () => {
    if (textareaRef.current) {
      if (gutterRef.current) {
        gutterRef.current.scrollTop = textareaRef.current.scrollTop;
      }
      if (preRef.current) {
        preRef.current.scrollTop = textareaRef.current.scrollTop;
        preRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    }
    if (showAutocomplete) {
      updateAutocompletePosition();
    }
  };

  // Memoize syntax-highlighted HTML string
  const highlightedHtml = useMemo(() => {
    if (!syntaxHighlight) return "";
    return highlightDivCode(code);
  }, [code, syntaxHighlight]);

  // Track cursor position (Line & Column)
  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const textBefore = code.slice(0, textareaRef.current.selectionStart);
    const lineArr = textBefore.split("\n");
    const currentLine = lineArr.length;
    const currentCol = lineArr[lineArr.length - 1].length + 1;
    setCursorPos({ line: currentLine, col: currentCol });
  };

  // Recalculate popup position based on current cursor in textarea
  const updateAutocompletePosition = useCallback(() => {
    if (!textareaRef.current || !editorBodyRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const caret = getCaretCoordinates(textareaRef.current, cursor);
    const containerRect = editorBodyRef.current.getBoundingClientRect();
    const containerW = containerRect.width;
    const containerH = containerRect.height;

    // Gutter width is 56px (w-14)
    let leftPos = 56 + caret.left;
    let topPos = caret.top + caret.lineHeight + 4;

    const popupWidth = 520;
    const popupHeight = 240;

    if (leftPos + popupWidth > containerW - 10) {
      leftPos = Math.max(60, containerW - popupWidth - 10);
    }
    if (topPos + popupHeight > containerH - 10) {
      // Flip above cursor line
      topPos = Math.max(8, caret.top - popupHeight - 4);
    }

    setAutocompletePos({ top: topPos, left: leftPos });
  }, []);

  // Trigger or evaluate autocomplete suggestions while user types
  const evaluateAutocomplete = useCallback(
    (currentCode: string, cursorIndex: number, forceOpen = false) => {
      if (!autocompleteEnabled && !forceOpen) {
        setShowAutocomplete(false);
        return;
      }

      if (!textareaRef.current || !editorBodyRef.current) return;

      const textBefore = currentCode.slice(0, cursorIndex);
      const currentLineText = textBefore.split("\n").pop() || "";

      // Don't show in single-line comments
      if (currentLineText.includes("//")) {
        const commentIdx = currentLineText.indexOf("//");
        const cursorCol = currentLineText.length;
        if (cursorCol > commentIdx) {
          setShowAutocomplete(false);
          return;
        }
      }

      // Check if cursor is immediately inside quotes (string literal)
      const quoteCount = (currentLineText.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0 && !forceOpen) {
        setShowAutocomplete(false);
        return;
      }

      // Extract token word prefix at cursor
      const match = textBefore.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
      const wordPrefix = match ? match[1] : "";

      if (!wordPrefix && !forceOpen) {
        setShowAutocomplete(false);
        return;
      }

      const lowerPrefix = wordPrefix.toLowerCase();

      // Find matching DIV items
      const matches = DIV_AUTOCOMPLETE_ITEMS.filter((item) => {
        if (!wordPrefix) return true; // Show all if force opened at empty
        const lowerName = item.name.toLowerCase();
        return (
          lowerName.startsWith(lowerPrefix) ||
          (wordPrefix.length >= 2 && lowerName.includes(lowerPrefix))
        );
      }).sort((a, b) => {
        if (!wordPrefix) {
          // If no prefix, prioritize core DIV keywords: PROCESS, BEGIN, END, FRAME, LOCAL, PRIVATE
          if (a.type === "keyword" && b.type !== "keyword") return -1;
          if (a.type !== "keyword" && b.type === "keyword") return 1;
          return a.name.localeCompare(b.name);
        }

        const aStarts = a.name.toLowerCase().startsWith(lowerPrefix);
        const bStarts = b.name.toLowerCase().startsWith(lowerPrefix);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Keywords always take top priority
        if (a.type === "keyword" && b.type !== "keyword") return -1;
        if (a.type !== "keyword" && b.type === "keyword") return 1;

        return a.name.length - b.name.length;
      });

      if (matches.length === 0) {
        setShowAutocomplete(false);
        return;
      }

      setAutocompletePrefix(wordPrefix);
      setAutocompleteSuggestions(matches.slice(0, 10));
      setSelectedSuggestionIndex(0);
      updateAutocompletePosition();
      setShowAutocomplete(true);
    },
    [autocompleteEnabled, updateAutocompletePosition]
  );

  // Insert selected autocomplete suggestion
  const insertSuggestion = useCallback(
    (item: DivSuggestion) => {
      if (!textareaRef.current) return;
      const textarea = textareaRef.current;
      const currentCursor = textarea.selectionStart;
      const textBefore = code.slice(0, currentCursor);
      const match = textBefore.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
      const prefixLength = match ? match[1].length : 0;

      const replaceStart = currentCursor - prefixLength;
      const replaceEnd = currentCursor;

      const nextChar = code.charAt(currentCursor);
      let insertValue = item.name;

      // Smart formatting for FRAME
      if (item.name === "FRAME" && nextChar !== ";" && nextChar !== "(") {
        insertValue = "FRAME;";
      }

      const newCode = code.substring(0, replaceStart) + insertValue + code.substring(replaceEnd);
      onChange(newCode);

      const newCursor = replaceStart + insertValue.length;
      setShowAutocomplete(false);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
        updateCursorPosition();
      }, 10);
    },
    [code, onChange]
  );

  // Handle keyboard events in textarea (Arrow navigation, Tab/Enter insertion, Tab indent, Esc)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Space or Cmd+Space: Force trigger autocomplete
    if ((e.ctrlKey || e.metaKey) && e.key === " ") {
      e.preventDefault();
      const cursor = e.currentTarget.selectionStart;
      evaluateAutocomplete(code, cursor, true);
      return;
    }

    if (showAutocomplete && autocompleteSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev + 1) % autocompleteSuggestions.length);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex(
          (prev) => (prev - 1 + autocompleteSuggestions.length) % autocompleteSuggestions.length
        );
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertSuggestion(autocompleteSuggestions[selectedSuggestionIndex]);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setShowAutocomplete(false);
        return;
      }
    }

    // Standard Code Editor Tab indentation when autocomplete is closed
    if (e.key === "Tab" && !showAutocomplete) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      onChange(newCode);
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
        updateCursorPosition();
      }, 0);
    }
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

  // Visual Basic 5.0 Object and Procedure/Event Navigation
  const [selectedObject, setSelectedObject] = useState<string>("(General)");
  const [selectedProcedure, setSelectedProcedure] = useState<string>("(Declaraciones)");

  // Extract process names from code for the object dropdown
  const detectedObjects = useMemo(() => {
    const list = ["(General)", "Form", "Command1", "Text1", "Picture1", "Timer1"];
    const regex = /PROCESS\s+([a-zA-Z0-9_]+)/gi;
    let match;
    while ((match = regex.exec(code)) !== null) {
      const name = match[1];
      if (!list.includes(name)) {
        list.push(name);
      }
    }
    return list;
  }, [code]);

  const availableProcedures = [
    "(Declaraciones)",
    "Click",
    "Change",
    "Load",
    "Unload",
    "KeyDown",
    "MouseDown",
    "Paint",
    "Timer",
    "Collision",
  ];

  const handleSelectObjectAndProc = (obj: string, proc: string) => {
    setSelectedObject(obj);
    setSelectedProcedure(proc);

    if (obj === "(General)" && proc === "(Declaraciones)") {
      jumpToLine(1);
      return;
    }

    // Try to find matching PROCESS in code
    const targetName = proc === "(Declaraciones)" ? obj : `${obj}_${proc}`;
    const linesArr = code.split("\n");
    let foundLine = -1;

    for (let i = 0; i < linesArr.length; i++) {
      const lineText = linesArr[i];
      if (
        lineText.toLowerCase().includes(`process ${targetName.toLowerCase()}`) ||
        lineText.toLowerCase().includes(`process ${obj.toLowerCase()}`)
      ) {
        foundLine = i + 1;
        break;
      }
    }

    if (foundLine > 0) {
      jumpToLine(foundLine);
    } else if (proc !== "(Declaraciones)") {
      // Insert new DIV procedure stub
      const stub = `\n// --- Evento ${proc} de ${obj} (Léxico DIV) ---\nPROCESS ${obj}_${proc}()\nBEGIN\n  // Lógica de respuesta del evento\n  FRAME;\nEND\n`;
      insertSnippet(stub);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] border border-slate-800 rounded-lg overflow-hidden">
      {/* Visual Basic 5.0 Object & Procedure Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] border-b border-slate-700/80 text-xs">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase">Objeto:</span>
          <select
            value={selectedObject}
            onChange={(e) => handleSelectObjectAndProc(e.target.value, selectedProcedure)}
            className="flex-1 max-w-[200px] bg-[#1e293b] border border-slate-600 rounded px-2 py-0.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
          >
            {detectedObjects.map((obj) => (
              <option key={obj} value={obj}>
                {obj}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase">Procedimiento:</span>
          <select
            value={selectedProcedure}
            onChange={(e) => handleSelectObjectAndProc(selectedObject, e.target.value)}
            className="flex-1 max-w-[200px] bg-[#1e293b] border border-slate-600 rounded px-2 py-0.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
          >
            {availableProcedures.map((proc) => (
              <option key={proc} value={proc}>
                {proc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Editor Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#0d1527] border-b border-slate-800 text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200 font-mono text-[11px]">Form1.frm [Código]</span>
        </div>

        {/* Quick Snippets Inserter & Autocomplete Toggle */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Syntax Highlighting Toggle */}
          <button
            onClick={() => setSyntaxHighlight(!syntaxHighlight)}
            className={`px-2 py-1 rounded flex items-center gap-1.5 transition-colors text-xs font-sans border ${
              syntaxHighlight
                ? "bg-sky-950/70 border-sky-600/50 text-sky-300 hover:bg-sky-900/60"
                : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
            title="Colorear sintaxis DIV Games Studio & Visual Basic Precode"
          >
            <Palette className={`w-3 h-3 ${syntaxHighlight ? "text-sky-400" : "text-slate-500"}`} />
            <span className="font-medium">Color {syntaxHighlight ? "ON" : "OFF"}</span>
          </button>

          {/* Autocomplete Toggle */}
          <button
            onClick={() => setAutocompleteEnabled(!autocompleteEnabled)}
            className={`px-2 py-1 rounded flex items-center gap-1.5 transition-colors text-xs font-sans border ${
              autocompleteEnabled
                ? "bg-emerald-950/70 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
            title="Sugerir palabras clave DIV Games Studio al escribir (Ctrl+Espacio para invocar)"
          >
            <Zap className={`w-3 h-3 ${autocompleteEnabled ? "text-emerald-400 fill-emerald-400" : "text-slate-500"}`} />
            <span className="font-medium">Auto-sugerencias {autocompleteEnabled ? "ON" : "OFF"}</span>
          </button>

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
            title="Reproducir sonido directo por ID"
          >
            + Sonido
          </button>
          <button
            onClick={() => insertSnippet(`snd = load_snd("laser.wav");\nsound(snd, 100, 256);`)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
            title="Cargar y reproducir archivo de audio con load_snd"
          >
            + load_snd
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
      <div ref={editorBodyRef} className="relative flex-1 flex overflow-hidden font-mono text-xs">
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

        {/* Code Input Area with Layered Syntax Highlighting */}
        <div className="relative flex-1 h-full overflow-hidden">
          {/* Syntax Highlighted Backdrop */}
          {syntaxHighlight && (
            <pre
              ref={preRef}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: highlightedHtml + "\n" }}
              className="absolute inset-0 py-3 px-3.5 m-0 bg-transparent pointer-events-none font-mono text-xs leading-6 overflow-hidden whitespace-pre select-none text-slate-300"
            />
          )}

          {/* Textarea Code Input */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => {
              const val = e.target.value;
              const curPos = e.target.selectionStart;
              onChange(val);
              updateCursorPosition();
              evaluateAutocomplete(val, curPos);
            }}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onKeyUp={(e) => {
              updateCursorPosition();
              // If user used navigation arrow keys without modifiers, close or re-evaluate
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                if (showAutocomplete) {
                  setShowAutocomplete(false);
                }
              }
            }}
            onClick={() => {
              updateCursorPosition();
              if (showAutocomplete) {
                setShowAutocomplete(false);
              }
            }}
            onSelect={updateCursorPosition}
            wrap="off"
            spellCheck={false}
            className={`w-full h-full py-3 px-3.5 bg-transparent resize-none outline-none leading-6 overflow-auto whitespace-pre font-mono text-xs selection:bg-emerald-600/30 ${
              syntaxHighlight ? "text-transparent caret-white" : "text-slate-100"
            }`}
            placeholder="PROGRAM mi_juego;\nBEGIN\n  set_mode(m640x480);\n  LOOP\n    FRAME;\n  END\nEND"
          />
        </div>

        {/* Autocomplete Suggestions Popup Overlay */}
        {showAutocomplete && autocompleteSuggestions.length > 0 && (
          <CodeAutocompletePopup
            suggestions={autocompleteSuggestions}
            selectedIndex={selectedSuggestionIndex}
            prefix={autocompletePrefix}
            position={autocompletePos}
            onSelect={insertSuggestion}
            onHoverIndex={setSelectedSuggestionIndex}
            onClose={() => setShowAutocomplete(false)}
          />
        )}
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
