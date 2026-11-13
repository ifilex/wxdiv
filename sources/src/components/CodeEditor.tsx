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
  BookOpen,
  Play,
  Pause,
  StepForward,
  CircleDot,
  Trash2,
  Bug,
  X,
} from "lucide-react";
import { validateDivSyntax, DivDiagnostic } from "../engine/divParser";
import { DIV_AUTOCOMPLETE_ITEMS, DivSuggestion } from "../engine/divKeywords";
import { CodeAutocompletePopup } from "./CodeAutocompletePopup";
import { getCaretCoordinates } from "../utils/caretCoordinates";
import { highlightDivCode } from "../utils/codeHighlighter";
import { AppInventorWorkspace } from "./MitAppInventor/AppInventorWorkspace";
import { DivRuntime } from "../engine/runtime";
import { BreakpointInfo } from "../types";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onAskAiFix?: (diagnostic: DivDiagnostic) => void;
  fileName?: string;
  isFormMode?: boolean;
  onOpenLexicon?: () => void;
  onOpenAiAssistant?: () => void;
  targetSymbol?: { object: string; procedure: string; timestamp: number } | null;
  runtime?: DivRuntime;
  breakpoints?: Set<number>;
  onToggleBreakpoint?: (line: number) => void;
  onClearBreakpoints?: () => void;
  activeExecutionLine?: number | null;
  currentBreakpoint?: BreakpointInfo | null;
  onContinueExecution?: () => void;
  onStepFrame?: () => void;
  initialViewMode?: "code" | "blocks";
  hideBlockToggle?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onRun,
  onAskAiFix,
  fileName,
  isFormMode = false,
  onOpenLexicon,
  onOpenAiAssistant,
  targetSymbol,
  runtime,
  breakpoints: propBreakpoints,
  onToggleBreakpoint,
  onClearBreakpoints,
  activeExecutionLine: propActiveExecutionLine,
  currentBreakpoint: propCurrentBreakpoint,
  onContinueExecution,
  onStepFrame,
  initialViewMode = "code",
  hideBlockToggle = false,
}) => {
  const [diagnostics, setDiagnostics] = useState<DivDiagnostic[]>([]);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [syntaxHighlight, setSyntaxHighlight] = useState(true);
  const [codeViewMode, setCodeViewMode] = useState<"code" | "blocks">(initialViewMode);

  useEffect(() => {
    setCodeViewMode(initialViewMode);
  }, [initialViewMode]);

  // Breakpoints & Debugger State
  const [localBreakpoints, setLocalBreakpoints] = useState<Set<number>>(new Set());
  const [runtimeBreakpoint, setRuntimeBreakpoint] = useState<BreakpointInfo | null>(runtime?.currentBreakpoint || null);
  const [, setBreakpointVersion] = useState(0);

  const activeBreakpoints = propBreakpoints || (runtime ? runtime.breakpoints : localBreakpoints);
  const effectiveBreakpoint = propCurrentBreakpoint !== undefined ? propCurrentBreakpoint : (runtime?.currentBreakpoint || runtimeBreakpoint);
  const effectiveExecutionLine = propActiveExecutionLine !== undefined ? propActiveExecutionLine : effectiveBreakpoint?.line || null;

  // Listen to runtime breakpoint events
  useEffect(() => {
    if (!runtime) return;

    const hitHandler = (bp: BreakpointInfo) => {
      setRuntimeBreakpoint(bp);
    };
    const resumeHandler = () => {
      setRuntimeBreakpoint(null);
    };
    const bpChangeHandler = () => {
      setBreakpointVersion((v) => v + 1);
    };

    const unsubHit = runtime.addBreakpointHitListener(hitHandler);
    const unsubResume = runtime.addBreakpointResumeListener(resumeHandler);
    const unsubChange = runtime.addBreakpointsChangeListener(bpChangeHandler);

    if (runtime.currentBreakpoint) {
      setRuntimeBreakpoint(runtime.currentBreakpoint);
    }

    return () => {
      unsubHit();
      unsubResume();
      unsubChange();
    };
  }, [runtime]);

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

    // Gutter width is ~48px on mobile, 56px on desktop
    let leftPos = Math.min(56, Math.max(12, 48 + caret.left));
    let topPos = caret.top + caret.lineHeight + 4;

    const popupWidth = Math.min(520, Math.max(260, containerW - 20));
    const popupHeight = 240;

    if (leftPos + popupWidth > containerW - 10) {
      leftPos = Math.max(10, containerW - popupWidth - 10);
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
  const jumpToLine = useCallback((targetLine: number) => {
    const doJump = () => {
      if (!textareaRef.current) return;
      const linesArr = code.split("\n");
      let charOffset = 0;
      for (let i = 0; i < Math.min(targetLine - 1, linesArr.length); i++) {
        charOffset += linesArr[i].length + 1;
      }

      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charOffset, charOffset + (linesArr[targetLine - 1]?.length || 0));

      // Scroll line into view smoothly
      const lineHeight = 24; // matches leading-6
      const scrollTarget = (targetLine - 1) * lineHeight - 60;
      textareaRef.current.scrollTop = Math.max(0, scrollTarget);
      if (gutterRef.current) {
        gutterRef.current.scrollTop = textareaRef.current.scrollTop;
      }
      if (preRef.current) {
        preRef.current.scrollTop = textareaRef.current.scrollTop;
      }

      setHighlightedLine(targetLine);
      setTimeout(() => setHighlightedLine(null), 3000);
      setCursorPos({ line: targetLine, col: 1 });
    };

    doJump();
    requestAnimationFrame(doJump);
    setTimeout(doJump, 60);
  }, [code]);

  // Breakpoint management & execution controls
  const handleToggleBreakpoint = useCallback((lineNum: number) => {
    if (onToggleBreakpoint) {
      onToggleBreakpoint(lineNum);
    } else if (runtime) {
      runtime.toggleBreakpoint(lineNum);
      setBreakpointVersion((v) => v + 1);
    } else {
      setLocalBreakpoints((prev) => {
        const next = new Set(prev);
        if (next.has(lineNum)) next.delete(lineNum);
        else next.add(lineNum);
        return next;
      });
    }
  }, [onToggleBreakpoint, runtime]);

  const handleContinue = useCallback(() => {
    if (onContinueExecution) {
      onContinueExecution();
    } else if (runtime) {
      runtime.resumeFromBreakpoint();
      setRuntimeBreakpoint(null);
    }
  }, [onContinueExecution, runtime]);

  const handleStep = useCallback(() => {
    if (onStepFrame) {
      onStepFrame();
    } else if (runtime) {
      runtime.stepFrame();
      setRuntimeBreakpoint(runtime.currentBreakpoint);
    }
  }, [onStepFrame, runtime]);

  const handleClearAllBreakpoints = useCallback(() => {
    if (onClearBreakpoints) {
      onClearBreakpoints();
    } else if (runtime) {
      runtime.clearBreakpoints();
      setBreakpointVersion((v) => v + 1);
    } else {
      setLocalBreakpoints(new Set());
    }
  }, [onClearBreakpoints, runtime]);

  // Jump to paused breakpoint line whenever execution hits a breakpoint
  useEffect(() => {
    if (effectiveBreakpoint && effectiveBreakpoint.line > 0) {
      jumpToLine(effectiveBreakpoint.line);
    }
  }, [effectiveBreakpoint?.line, effectiveBreakpoint?.timestamp, jumpToLine]);

  // Global debugger shortcuts (F5 = Continue/Run, F10 = Step Frame, F9 = Toggle BP on cursor line)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        if (effectiveBreakpoint) {
          e.preventDefault();
          handleContinue();
        }
      } else if (e.key === "F10") {
        if (effectiveBreakpoint || runtime?.isPaused) {
          e.preventDefault();
          handleStep();
        }
      } else if (e.key === "F9") {
        e.preventDefault();
        handleToggleBreakpoint(cursorPos.line);
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [effectiveBreakpoint, runtime, cursorPos.line, handleContinue, handleStep, handleToggleBreakpoint]);

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

  // Visual MDI engine Object and Procedure/Event Navigation
  const [selectedObject, setSelectedObject] = useState<string>("(General)");
  const [selectedProcedure, setSelectedProcedure] = useState<string>("(Declaraciones)");

  // Reset navigation dropdowns when active file or form mode changes
  useEffect(() => {
    if (!targetSymbol) {
      setSelectedObject("(General)");
      setSelectedProcedure("(Declaraciones)");
    }
  }, [fileName, isFormMode]);

  // Extract process names from code for the object dropdown
  const detectedObjects = useMemo(() => {
    const list = isFormMode
      ? ["(General)", "Form", "Command1", "Text1", "Picture1", "Timer1"]
      : ["(General)"];
    if (targetSymbol && targetSymbol.object && !list.includes(targetSymbol.object)) {
      list.push(targetSymbol.object);
    }
    const regex = /PROCESS\s+([a-zA-Z0-9_]+)/gi;
    let match;
    while ((match = regex.exec(code)) !== null) {
      const name = match[1];
      if (!list.includes(name)) {
        list.push(name);
      }
    }
    return list;
  }, [code, isFormMode, targetSymbol]);

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

  const handleSelectObjectAndProc = useCallback((obj: string, proc: string) => {
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
        lineText.toLowerCase().includes(`process ${obj.toLowerCase()}_${proc.toLowerCase()}`) ||
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
      const stub = `\n// --- Evento ${proc} de ${obj} (Visual MDI) ---\nPROCESS ${obj.toLowerCase()}_${proc.toLowerCase()}()\nBEGIN\n    // Lógica de respuesta del evento\n    FRAME;\nEND\n`;
      insertSnippet(stub);
    }
  }, [code, jumpToLine]);

  // Navigate automatically when a visual control or form is double-clicked in Visual MDI
  useEffect(() => {
    if (targetSymbol && targetSymbol.object) {
      handleSelectObjectAndProc(targetSymbol.object, targetSymbol.procedure || "Click");
    }
  }, [targetSymbol, handleSelectObjectAndProc]);

  if (codeViewMode === "blocks") {
    return (
      <div
        className="w-full h-full flex-1 flex-grow flex flex-col min-h-0 bg-[#f3f3f3] overflow-hidden"
        style={{ height: "100%", width: "100%", flexGrow: 1, minHeight: 0 }}
      >
        <AppInventorWorkspace
          initialCode={code}
          projectName={fileName?.replace(/\.[^/.]+$/, "") || "Juego_DIV"}
          onChangeCode={onChange}
          onRunGame={onRun}
          onSwitchToCodeEditor={() => setCodeViewMode("code")}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#080d1a] border border-slate-800 rounded-lg overflow-hidden relative"
      style={{ height: "100%", width: "100%", flexGrow: 1, minHeight: 0 }}
    >
      {/* Visual MDI engine Object & Procedure Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] border-b border-slate-700/80 text-xs flex-shrink-0">
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
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#0d1527] border-b border-slate-800 text-xs text-slate-400 gap-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Code2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-slate-200 font-mono text-[11px] truncate">{fileName || "codigo.prg"}</span>
          </div>

          {/* Formato: Código DIV vs Bloques MIT App Inventor */}
          {!hideBlockToggle && (
            <div className="flex items-center bg-[#070d18] p-0.5 rounded border border-slate-700 text-xs shadow-inner">
              <button
                onClick={() => setCodeViewMode("code")}
                className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-all ${
                  codeViewMode === "code"
                    ? "bg-[#7C2D48] text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Ver en formato de código tradicional DIV Games Studio"
              >
                <Code2 className="w-3 h-3" />
                <span>Código DIV</span>
              </button>
              <button
                onClick={() => setCodeViewMode("blocks")}
                className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-all ${
                  codeViewMode === "blocks"
                    ? "bg-[#2F6F4E] text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Ver en formato de Bloques Visuales"
              >
                <span>🧩</span>
                <span>Bloques</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Snippets Inserter & Autocomplete Toggle */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
          {onOpenAiAssistant && (
            <button
              onClick={onOpenAiAssistant}
              className="px-2.5 py-1 min-h-[32px] rounded flex items-center gap-1.5 transition-all text-xs font-sans border font-semibold bg-[#7C2D48]/30 border-[#7C2D48]/70 text-rose-200 hover:bg-[#7C2D48]/50 hover:text-white cursor-pointer shrink-0"
              title="Abrir Asistente AURA IA"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-300" />
              <span>AURA IA</span>
            </button>
          )}

          {/* Manual Léxico DIV Button */}
          {onOpenLexicon && (
            <button
              onClick={onOpenLexicon}
              className="px-2 py-1 min-h-[32px] rounded flex items-center gap-1.5 transition-colors text-xs font-sans border bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white shrink-0"
              title="Abrir Manual de Léxico DIV Games Studio (F1)"
            >
              <BookOpen className="w-3 h-3 text-emerald-400" />
              <span className="font-medium hidden sm:inline">Manual Léxico</span>
            </button>
          )}

          {/* Syntax Highlighting Toggle */}
          <button
            onClick={() => setSyntaxHighlight(!syntaxHighlight)}
            className={`px-2 py-1 rounded flex items-center gap-1.5 transition-colors text-xs font-sans border ${
              syntaxHighlight
                ? "bg-sky-950/70 border-sky-600/50 text-sky-300 hover:bg-sky-900/60"
                : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
            title="Colorear sintaxis DIV Games Studio & Visual MDI engine"
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
          >
            + load_snd
          </button>

          {/* Active Breakpoints Count & Clear */}
          {activeBreakpoints.size > 0 && (
            <button
              onClick={handleClearAllBreakpoints}
              className="px-2 py-1 rounded flex items-center gap-1.5 transition-colors text-xs font-sans border bg-rose-950/60 border-rose-600/50 text-rose-300 hover:bg-rose-900/60 cursor-pointer"
              title="Limpiar todos los breakpoints activos"
            >
              <CircleDot className="w-3 h-3 text-rose-400" />
              <span>{activeBreakpoints.size} BP</span>
              <Trash2 className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
            </button>
          )}

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

      {/* Active Paused Breakpoint Bar */}
      {effectiveBreakpoint && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-900 border-b border-amber-500/60 text-xs shadow-lg z-20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            <span className="font-bold text-amber-300 font-mono text-[11px] uppercase tracking-wide">
              Pausado en Breakpoint:
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-mono text-[11px] font-bold">
              Línea {effectiveBreakpoint.line}
            </span>
            <span className="text-slate-300 text-[11px]">
              Proceso: <strong className="text-cyan-300 font-mono">{effectiveBreakpoint.processName || "Principal"}</strong>
              {effectiveBreakpoint.processId ? ` [PID: ${effectiveBreakpoint.processId}]` : ""}
            </span>
            <span className="text-slate-500 text-[11px] font-mono hidden sm:inline">
              Frame #{effectiveBreakpoint.frame}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleContinue}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 shadow-sm transition-all text-xs cursor-pointer"
              title="Continuar ejecución del motor DIV (F5)"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Continuar (F5)</span>
            </button>
            <button
              onClick={handleStep}
              className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1 shadow-sm transition-all text-xs cursor-pointer"
              title="Paso a paso (Avanzar un frame) (F10)"
            >
              <StepForward className="w-3 h-3" />
              <span>Paso (F10)</span>
            </button>
            <button
              onClick={() => handleToggleBreakpoint(effectiveBreakpoint.line)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 flex items-center gap-1 transition-all text-xs cursor-pointer"
              title="Eliminar este breakpoint"
            >
              <X className="w-3 h-3" />
              <span>Quitar BP</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Main Split Workspace (Code Editor Left + Android Studio AI Panel Right) */}
      <div
        className="flex-1 flex-grow flex overflow-hidden min-h-0 w-full relative"
        style={{ flexGrow: 1, minHeight: 0 }}
      >
        {/* Editor Body with Synchronized Line Numbers */}
        <div
          ref={editorBodyRef}
          className="relative flex-1 flex-grow flex overflow-hidden w-full h-full min-h-0 min-w-0 font-mono text-xs"
          style={{ height: "100%", width: "100%", flexGrow: 1, minHeight: 0 }}
        >
          {/* Line Numbers Gutter */}
          <div
            ref={gutterRef}
            className="w-11 sm:w-14 py-3 bg-[#0a1020] border-r border-slate-800/80 text-right select-none text-slate-500 overflow-hidden font-mono leading-6 flex-shrink-0 h-full group"
            style={{ height: "100%" }}
          >
            {lines.map((_, idx) => {
              const lineNum = idx + 1;
              const lineDiagnostics = diagnosticsByLine.get(lineNum);
              const hasError = lineDiagnostics?.some((d) => d.severity === "error");
              const hasWarning = lineDiagnostics?.some((d) => d.severity === "warning");
              const isCurrent = cursorPos.line === lineNum;
              const isHighlighted = highlightedLine === lineNum;
              const isBreakpoint = activeBreakpoints.has(lineNum);
              const isExecutionLine = effectiveExecutionLine === lineNum;

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    if (clickX <= 28) {
                      handleToggleBreakpoint(lineNum);
                    } else {
                      jumpToLine(lineNum);
                    }
                  }}
                  onDoubleClick={() => handleToggleBreakpoint(lineNum)}
                  title={
                    isExecutionLine
                      ? `▶ Motor DIV Pausado en línea ${lineNum}${effectiveBreakpoint?.processName ? ` (${effectiveBreakpoint.processName})` : ""}`
                      : isBreakpoint
                      ? `🔴 Breakpoint activo en línea ${lineNum} (Clic o doble clic para quitar)`
                      : lineDiagnostics
                      ? lineDiagnostics.map((d) => `Línea ${lineNum}: ${d.message}`).join("\n")
                      : `Línea ${lineNum} (Clic izquierdo para fijar Breakpoint)`
                  }
                  className={`h-6 leading-6 pr-2 pl-1 flex items-center justify-between gap-1 cursor-pointer transition-colors relative group/line ${
                    isExecutionLine
                      ? "bg-amber-500/25 text-amber-300 font-bold border-l-2 border-amber-400"
                      : isBreakpoint
                      ? "bg-rose-950/40 text-rose-300 font-bold"
                      : isHighlighted
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
                  {/* Breakpoint & Execution Indicator Column */}
                  <div
                    className="w-5 h-full flex items-center justify-center flex-shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBreakpoint(lineNum);
                    }}
                  >
                    {isExecutionLine ? (
                      <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950">
                        <span className="text-[9px] leading-none font-black ml-0.5">▶</span>
                      </div>
                    ) : isBreakpoint ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] ring-1 ring-rose-300 hover:scale-125 transition-transform" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-rose-500/0 hover:bg-rose-500/60 group-hover/line:bg-rose-500/30 transition-all" />
                    )}
                  </div>

                  {/* Diagnostic Marker or Cursor Pill */}
                  <div className="flex items-center gap-1 min-w-0">
                    {hasError ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                    ) : hasWarning ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    ) : isCurrent && !isExecutionLine ? (
                      <span className="w-1 h-2.5 rounded-full bg-cyan-400/80 flex-shrink-0" />
                    ) : null}
                    <span className="text-[11px] font-mono">{lineNum}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Code Input Area with Layered Syntax Highlighting */}
          <div
            className="relative flex-1 flex-grow w-full h-full min-h-0 min-w-0 overflow-hidden"
            style={{ height: "100%", width: "100%", flexGrow: 1, minHeight: 0 }}
          >
            {/* Active Paused Line Background Highlight */}
            {effectiveExecutionLine && (
              <div
                className="absolute left-0 right-0 h-6 bg-amber-400/15 border-y border-amber-400/40 pointer-events-none z-[1] flex items-center"
                style={{
                  top: `${12 + (effectiveExecutionLine - 1) * 24}px`,
                  transform: `translateY(-${textareaRef.current?.scrollTop || 0}px)`
                }}
              >
                <div className="w-1.5 h-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                <span className="ml-2 text-[10px] font-mono font-bold text-amber-300/90 uppercase tracking-wider select-none">
                  ▶ PAUSADO EN EJECUCIÓN (Línea {effectiveExecutionLine})
                </span>
              </div>
            )}
          {/* Syntax Highlighted Backdrop */}
          {syntaxHighlight && (
            <pre
              ref={preRef}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: highlightedHtml + "\n" }}
              className="absolute inset-0 w-full h-full py-3 px-3.5 m-0 bg-transparent pointer-events-none font-mono text-xs leading-6 overflow-hidden whitespace-pre select-none text-slate-300"
              style={{ height: "100%", width: "100%" }}
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
            style={{ height: "100%", width: "100%" }}
            placeholder="PROGRAM mi_juego;\nBEGIN\n  set_mode(m640x480);\n  LOOP\n    FRAME;\n  END\nEND"
          />

          {/* Empty Environment Helper Card when code is completely blank */}
          {code.trim().length === 0 && !isFormMode && (
            <div className="absolute inset-x-3 top-4 sm:inset-x-auto sm:top-8 sm:right-8 z-10 p-4 max-w-sm bg-[#090f22]/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md pointer-events-auto">
              <div className="flex items-center gap-2 mb-2 text-rose-200 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-rose-300" />
                <span>Entorno Vacío (Sin Ejemplo)</span>
              </div>
              <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
                El entorno se ha iniciado limpio. Puedes escribir código DIV directamente o pedirle a AURA IA que lo genere y lo inserte automáticamente aquí.
              </p>
              <div className="flex items-center gap-2">
                {onOpenAiAssistant && (
                  <button
                    onClick={onOpenAiAssistant}
                    className="px-2.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Abrir Asistente IA</span>
                  </button>
                )}
                <button
                  onClick={() =>
                    onChange(
                      `PROGRAM mi_juego;\n\nGLOBAL\n\nBEGIN\n    set_mode(m640x480);\n    set_fps(60);\n    screen_color(rgb(10, 16, 28));\n\n    LOOP\n        FRAME;\n    END\nEND\n`
                    )
                  }
                  className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors cursor-pointer"
                  title="Cargar estructura básica vacía"
                >
                  Plantilla Base
                </button>
              </div>
            </div>
          )}
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
      </div>

      {/* Expandable Diagnostics Drawer (if toggled or errors exist) */}
      {showAllErrors && diagnostics.length > 0 && (
        <div className="max-h-48 overflow-y-auto bg-[#070c18] border-t border-slate-800 p-2 font-mono text-xs divide-y divide-slate-800/50 flex-shrink-0 min-h-0">
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
      <div className="relative z-10 px-3 py-1.5 bg-[#0b1222] border-t border-slate-800 flex items-center justify-between text-xs font-mono flex-shrink-0">
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
