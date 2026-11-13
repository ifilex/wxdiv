import React, { useEffect, useRef } from "react";
import { DivSuggestion } from "../engine/divKeywords";
import { Sparkles, Terminal, Code2, Variable, Hash, FileCode } from "lucide-react";

interface CodeAutocompletePopupProps {
  suggestions: DivSuggestion[];
  selectedIndex: number;
  prefix: string;
  position: { top: number; left: number };
  onSelect: (item: DivSuggestion) => void;
  onHoverIndex: (index: number) => void;
  onClose: () => void;
}

export const CodeAutocompletePopup: React.FC<CodeAutocompletePopupProps> = ({
  suggestions,
  selectedIndex,
  prefix,
  position,
  onSelect,
  onHoverIndex,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItem = suggestions[selectedIndex] || suggestions[0];

  // Auto-scroll selected item into view inside the list
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  const getTypeIcon = (type: DivSuggestion["type"]) => {
    switch (type) {
      case "keyword":
        return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
      case "function":
        return <Code2 className="w-3.5 h-3.5 text-amber-400" />;
      case "variable":
        return <Variable className="w-3.5 h-3.5 text-purple-400" />;
      case "constant":
        return <Hash className="w-3.5 h-3.5 text-sky-400" />;
      case "type":
        return <FileCode className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getTypeBadgeClass = (type: DivSuggestion["type"]) => {
    switch (type) {
      case "keyword":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-700/50";
      case "function":
        return "bg-amber-950/80 text-amber-300 border-amber-700/50";
      case "variable":
        return "bg-purple-950/80 text-purple-300 border-purple-700/50";
      case "constant":
        return "bg-sky-950/80 text-sky-300 border-sky-700/50";
      case "type":
        return "bg-cyan-950/80 text-cyan-300 border-cyan-700/50";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  // Highlight the matching prefix in the suggestion name
  const renderHighlightedName = (name: string, pfx: string) => {
    if (!pfx) return <span>{name}</span>;
    const lowerName = name.toLowerCase();
    const lowerPfx = pfx.toLowerCase();
    const idx = lowerName.indexOf(lowerPfx);

    if (idx === -1) return <span>{name}</span>;

    const before = name.substring(0, idx);
    const match = name.substring(idx, idx + pfx.length);
    const after = name.substring(idx + pfx.length);

    return (
      <span>
        {before}
        <span className="text-emerald-400 font-extrabold underline decoration-emerald-500/60 decoration-2">
          {match}
        </span>
        {after}
      </span>
    );
  };

  return (
    <div
      id="div-autocomplete-popup"
      role="listbox"
      aria-label="Sugerencias de autocompletado DIV"
      className="absolute z-50 flex shadow-2xl rounded-lg border border-slate-700/80 bg-[#090f1d] text-slate-200 text-xs font-mono overflow-hidden backdrop-blur-md select-none transition-all duration-75 max-w-[540px]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 15px 1px rgba(16, 185, 129, 0.15)",
      }}
    >
      {/* Suggestions List */}
      <div className="w-56 sm:w-64 max-h-56 overflow-y-auto flex flex-col border-r border-slate-800/80 p-1" ref={listRef}>
        <div className="px-2 py-1 text-[10px] uppercase font-sans font-semibold tracking-wider text-slate-400 border-b border-slate-800/60 flex items-center justify-between">
          <span className="flex items-center gap-1 text-emerald-400">
            <Sparkles className="w-3 h-3" />
            DIV Autocompletar
          </span>
          <span className="text-slate-500 text-[9px]">{suggestions.length} opciones</span>
        </div>

        {suggestions.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={item.name}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => onHoverIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault(); // Don't steal focus from textarea before insert
                onSelect(item);
              }}
              className={`px-2 py-1.5 rounded flex items-center justify-between gap-1.5 cursor-pointer text-xs transition-colors my-0.5 ${
                isSelected
                  ? "bg-emerald-950/70 border border-emerald-500/40 text-white font-semibold"
                  : "hover:bg-slate-800/50 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden truncate">
                {getTypeIcon(item.type)}
                <span className="truncate">{renderHighlightedName(item.name, prefix)}</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded border uppercase font-sans font-medium flex-shrink-0 ${getTypeBadgeClass(
                  item.type
                )}`}
              >
                {item.type === "keyword" ? "Palabra" : item.type === "function" ? "Función" : item.type}
              </span>
            </div>
          );
        })}

        {/* Footer shortcuts hint */}
        <div className="mt-1 pt-1 border-t border-slate-800/60 px-2 py-1 text-[9px] text-slate-500 font-sans flex items-center justify-between">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">Tab</kbd> /{" "}
            <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">↵</kbd> insertar
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">Esc</kbd> cerrar
          </span>
        </div>
      </div>

      {/* Selected Item Detail / Documentation Preview */}
      {selectedItem && (
        <div className="w-56 sm:w-64 p-3 bg-[#0c1427]/90 flex flex-col justify-between text-xs font-sans">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono font-bold text-emerald-300 text-sm">
                {selectedItem.name}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono ${getTypeBadgeClass(
                  selectedItem.type
                )}`}
              >
                {selectedItem.categoryLabel || selectedItem.type}
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed mb-2.5">
              {selectedItem.description}
            </p>

            {selectedItem.syntax && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                  Sintaxis DIV:
                </span>
                <pre className="p-2 rounded bg-[#060a14] border border-slate-800/80 font-mono text-[10px] text-emerald-400 whitespace-pre-wrap leading-tight overflow-x-auto">
                  {selectedItem.syntax}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span className="text-emerald-400/90 font-medium">DIV Games Studio</span>
            <span className="text-slate-500">↑↓ navegar</span>
          </div>
        </div>
      )}
    </div>
  );
};
