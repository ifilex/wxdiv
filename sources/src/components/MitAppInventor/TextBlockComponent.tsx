import React, { useState, useEffect, useRef } from "react";
import { BlockInstance } from "./types";
import { TextBlockLogic, TextOperation } from "./TextBlockLogic";
import { Type, Sparkles, Check, X, Copy, AlertCircle, RefreshCw } from "lucide-react";

interface TextBlockComponentProps {
  block: BlockInstance;
  onUpdateBlock: (updatedBlock: BlockInstance) => void;
  onClose?: () => void;
  isInlineModal?: boolean;
}

export const TextBlockComponent: React.FC<TextBlockComponentProps> = ({
  block,
  onUpdateBlock,
  onClose,
  isInlineModal = true,
}) => {
  // Extract initial values
  const [currentText, setCurrentText] = useState<string>(() => {
    return block.fields?.text ?? block.fields?.value ?? "¡Hola Mundo!";
  });

  const [varName, setVarName] = useState<string>(() => {
    if (block.varName) return block.varName;
    if (block.category === "Variables") {
      return block.title.replace("initialize global", "").replace("to", "").trim() || "mensaje_texto";
    }
    return "mensaje_texto";
  });

  const [operation, setOperation] = useState<TextOperation>(() => {
    if (block.title.includes("join")) return "join";
    if (block.title.includes("length")) return "length";
    if (block.title.includes("is empty")) return "is_empty";
    if (block.title.includes("trim")) return "trim";
    if (block.title.includes("upcase")) return "upcase";
    if (block.title.includes("downcase")) return "downcase";
    if (block.title.includes("contains")) return "contains";
    if (block.title.includes("replace")) return "replace_all";
    return "literal";
  });

  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state if selected block changes
  useEffect(() => {
    if (block.fields?.text !== undefined) {
      setCurrentText(block.fields.text);
    } else if (block.fields?.value !== undefined) {
      setCurrentText(String(block.fields.value).replace(/^["']|["']$/g, ""));
    }
    if (block.varName) {
      setVarName(block.varName);
    }
  }, [block.id]);

  useEffect(() => {
    // Auto-focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Validation
  const validation = TextBlockLogic.validateDivString(currentText);

  // Live serialization to DIV format
  const serializedDiv =
    block.category === "Variables" || block.dataStructureType === "text"
      ? TextBlockLogic.serializeToDivGlobal(varName, currentText)
      : TextBlockLogic.serializeToDivLiteral(currentText);

  const handleApply = () => {
    const cleanVar = (varName || "mensaje_texto").replace(/[^a-zA-Z0-9_]/g, "_");
    const escaped = TextBlockLogic.escapeDivString(currentText);

    const updated: BlockInstance = {
      ...block,
      varName: cleanVar,
      dataStructureType: "text",
      title:
        block.category === "Variables"
          ? `initialize global ${cleanVar} to`
          : operation === "literal"
          ? `"${currentText}"`
          : block.title,
      subtitle: `"${currentText.substring(0, 18)}${currentText.length > 18 ? "..." : ""}"`,
      fields: {
        ...block.fields,
        text: currentText,
        value: `"${escaped}"`,
      },
      inlineValues: [
        {
          label: "str",
          value: `"${currentText.substring(0, 16)}${currentText.length > 16 ? "..." : ""}"`,
          color: "#c44078",
        },
      ],
    };

    onUpdateBlock(updated);
    if (onClose) onClose();
  };

  const handleTransform = (action: "uppercase" | "lowercase" | "trim" | "capitalize" | "clear") => {
    const transformed = TextBlockLogic.transformString(currentText, action);
    setCurrentText(transformed);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(serializedDiv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`bg-white/95 backdrop-blur-md rounded-xl border border-[#d67098] shadow-2xl z-50 flex flex-col overflow-hidden text-xs ${
        isInlineModal
          ? "absolute bottom-6 left-1/2 -translate-x-1/2 w-[520px] max-w-[92vw] animate-in slide-in-from-bottom-4 duration-200"
          : "w-full"
      }`}
    >
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#9c2a5a] via-[#c44078] to-[#9c2a5a] text-white flex items-center justify-between border-b border-[#822149]">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-pink-200" />
          <span className="font-extrabold text-xs tracking-wide">
            Componente de Texto (Blockly / MIT App Inventor)
          </span>
          <span className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[10px] font-bold">
            STRING DIV
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-pink-100 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
            title="Cerrar editor de texto"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Form Content */}
      <div className="p-3.5 flex flex-col gap-3">
        {/* Variable Identifier Binding */}
        {(block.category === "Variables" || block.varName) && (
          <div className="flex items-center gap-2">
            <label className="font-bold text-slate-700 w-28 flex-shrink-0">
              Variable DIV:
            </label>
            <input
              type="text"
              value={varName}
              onChange={(e) => setVarName(e.target.value)}
              placeholder="nombre_variable_texto"
              className="flex-1 px-2.5 py-1 rounded border border-slate-300 focus:outline-[#c44078] font-mono text-xs font-semibold bg-white text-slate-900"
            />
          </div>
        )}

        {/* String Editor Input */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-pink-50/70 border border-pink-200">
          <div className="flex items-center justify-between">
            <label className="font-bold text-[#822149] flex items-center gap-1.5">
              <span>Valor de la Cadena (String):</span>
            </label>
            <span className="text-[10px] font-mono font-bold text-pink-700">
              Longitud: {currentText.length} caracteres (strlen)
            </span>
          </div>

          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-pink-400 font-serif font-bold text-base pointer-events-none select-none">
              “
            </span>
            <input
              ref={inputRef}
              type="text"
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApply();
                }
              }}
              placeholder="Introduce el texto aquí..."
              className="w-full pl-6 pr-6 py-2 rounded-md border border-pink-300 focus:outline-[#c44078] focus:ring-1 focus:ring-[#c44078] text-xs font-semibold bg-white text-slate-900 shadow-inner"
            />
            <span className="absolute right-2.5 text-pink-400 font-serif font-bold text-base pointer-events-none select-none">
              ”
            </span>
          </div>

          {/* Quick String Transformation Buttons */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap text-[11px]">
            <span className="text-slate-500 font-bold text-[10px] mr-1">Transformar:</span>
            <button
              onClick={() => handleTransform("uppercase")}
              className="px-2 py-0.5 rounded bg-white hover:bg-pink-100 text-[#9c2a5a] border border-pink-200 font-semibold transition-colors"
            >
              MAYÚSCULAS
            </button>
            <button
              onClick={() => handleTransform("lowercase")}
              className="px-2 py-0.5 rounded bg-white hover:bg-pink-100 text-[#9c2a5a] border border-pink-200 font-semibold transition-colors"
            >
              minúsculas
            </button>
            <button
              onClick={() => handleTransform("capitalize")}
              className="px-2 py-0.5 rounded bg-white hover:bg-pink-100 text-[#9c2a5a] border border-pink-200 font-semibold transition-colors"
            >
              Capitalizar
            </button>
            <button
              onClick={() => handleTransform("trim")}
              className="px-2 py-0.5 rounded bg-white hover:bg-pink-100 text-[#9c2a5a] border border-pink-200 font-semibold transition-colors"
            >
              trim (sin espacios)
            </button>
            <button
              onClick={() => handleTransform("clear")}
              className="px-2 py-0.5 rounded bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition-colors"
            >
              Borrar
            </button>
          </div>
        </div>

        {/* Validation warnings if any */}
        {validation.warnings.length > 0 && (
          <div className="p-2 rounded bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-1.5 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              {validation.warnings.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
          </div>
        )}

        {/* Live Serialization for DIV Games Studio Engine */}
        <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <Sparkles className="w-3 h-3" />
              Serialización para Motor DIV Games Studio
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              title="Copiar código serializado"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "¡Copiado!" : "Copiar"}</span>
            </button>
          </div>

          <pre className="whitespace-pre-wrap text-emerald-300 font-semibold pt-1">
            {serializedDiv}
          </pre>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-3.5 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 italic">
          Presiona Enter o Aplicar para guardar en el bloque y actualizar el juego.
        </span>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded-md bg-[#c44078] hover:bg-[#a83364] text-white font-extrabold flex items-center gap-1.5 shadow-md shadow-pink-900/20 active:scale-95 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar al Bloque y al Motor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
