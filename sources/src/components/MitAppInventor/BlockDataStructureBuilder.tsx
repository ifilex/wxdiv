import React, { useState, useEffect } from "react";
import { BlockInstance } from "./types";
import { Sparkles, Plus, Trash2, Check, Copy, Palette, List, BookOpen, Type, X } from "lucide-react";

interface BlockDataStructureBuilderProps {
  block: BlockInstance;
  onUpdateBlock: (updatedBlock: BlockInstance) => void;
  onClose: () => void;
}

export const BlockDataStructureBuilder: React.FC<BlockDataStructureBuilderProps> = ({
  block,
  onUpdateBlock,
  onClose,
}) => {
  // Determine category / data structure type
  const isText =
    block.category === "Text" ||
    block.dataStructureType === "text" ||
    (block.category === "Variables" && (block.title.includes("text") || typeof block.fields?.text === "string"));

  const isList =
    block.category === "Lists" ||
    block.dataStructureType === "list" ||
    (block.category === "Variables" && (block.title.includes("list") || Array.isArray(block.listItems)));

  const isDict =
    block.category === "Dictionaries" ||
    block.dataStructureType === "dictionary" ||
    (block.category === "Variables" && (block.title.includes("dict") || Array.isArray(block.dictPairs)));

  const isColor =
    block.category === "Colors" ||
    block.dataStructureType === "color" ||
    (block.category === "Variables" && (block.title.includes("color") || block.colorHex));

  // Default active tab based on block type
  const [activeType, setActiveType] = useState<"text" | "list" | "dictionary" | "color">(
    isList ? "list" : isDict ? "dictionary" : isColor ? "color" : "text"
  );

  // Variable identifier name
  const [varName, setVarName] = useState<string>(() => {
    if (block.varName) return block.varName;
    if (block.category === "Variables") {
      return block.title.replace("initialize global", "").replace("to", "").trim() || "mi_variable";
    }
    if (isText) return "mensaje_texto";
    if (isList) return "lista_elementos";
    if (isDict) return "datos_registro";
    if (isColor) return "color_juego";
    return "dato_global";
  });

  // 1. Text State
  const [textContent, setTextContent] = useState<string>(() => {
    return block.fields?.text || block.fields?.value || "¡Hola Mundo DIV!";
  });

  // 2. List State
  const [items, setItems] = useState<string[]>(() => {
    if (block.listItems && block.listItems.length > 0) return block.listItems;
    if (block.fields?.items && Array.isArray(block.fields.items)) return block.fields.items;
    return ["Espada", "Escudo", "Poción de Vida"];
  });
  const [newItemInput, setNewItemInput] = useState("");

  // 3. Dictionary State
  const [pairs, setPairs] = useState<Array<{ key: string; value: string }>>(() => {
    if (block.dictPairs && block.dictPairs.length > 0) return block.dictPairs;
    return [
      { key: "hp", value: "100" },
      { key: "mp", value: "50" },
      { key: "nombre", value: '"Heroe"' },
    ];
  });
  const [newKeyInput, setNewKeyInput] = useState("");
  const [newValInput, setNewValInput] = useState("");

  // 4. Color State
  const [selectedHex, setSelectedHex] = useState<string>(() => {
    return block.colorHex || (block.fields?.color as string) || "#ea4335";
  });

  // Sync state if selected block changes
  useEffect(() => {
    if (block.varName) setVarName(block.varName);
    if (block.fields?.text) setTextContent(block.fields.text);
    if (block.listItems) setItems(block.listItems);
    if (block.dictPairs) setPairs(block.dictPairs);
    if (block.colorHex) setSelectedHex(block.colorHex);
  }, [block.id]);

  // Helper to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r: isNaN(r) ? 0 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
  };

  const rgbVal = hexToRgb(selectedHex);

  // Compute live code preview for the DIV engine
  const computeDivCode = () => {
    const cleanVar = (varName || "variable").replace(/[^a-zA-Z0-9_]/g, "_");
    switch (activeType) {
      case "text":
        return `// Declaración de Texto para DIV Games Studio\nSTRING ${cleanVar} = "${textContent.replace(/"/g, '\\"')}";`;
      case "list": {
        const count = items.length || 1;
        const formatted = items.map((it) => (isNaN(Number(it)) ? `"${it.replace(/"/g, "")}"` : it)).join(", ");
        return `// Declaración de Lista / Array para DIV Games Studio\n${cleanVar}[${count}] = ${formatted || '""'};`;
      }
      case "dictionary": {
        const body = pairs.map((p) => `  ${p.key || "prop"} = ${p.value || '0'};`).join("\n");
        return `// Declaración de Diccionario / Estructura para DIV Games Studio\nSTRUCT ${cleanVar}\n${body}\nEND`;
      }
      case "color":
        return `// Declaración de Color para DIV Games Studio\n${cleanVar} = rgb(${rgbVal.r}, ${rgbVal.g}, ${rgbVal.b}); // ${selectedHex}`;
    }
  };

  // Apply changes to the block
  const handleApply = () => {
    const cleanVar = (varName || "variable").replace(/[^a-zA-Z0-9_]/g, "_");

    let updatedBlock: BlockInstance = {
      ...block,
      varName: cleanVar,
      dataStructureType: activeType,
    };

    if (activeType === "text") {
      updatedBlock = {
        ...updatedBlock,
        title: block.category === "Variables" ? `initialize global ${cleanVar} to` : `"${textContent}"`,
        subtitle: `"${textContent.substring(0, 16)}${textContent.length > 16 ? "..." : ""}"`,
        fields: {
          ...block.fields,
          text: textContent,
          value: `"${textContent}"`,
        },
        inlineValues: [{ label: "str", value: `"${textContent}"`, color: "#c44078" }],
      };
    } else if (activeType === "list") {
      const formatted = items.map((it) => (isNaN(Number(it)) ? `"${it.replace(/"/g, "")}"` : it)).join(", ");
      updatedBlock = {
        ...updatedBlock,
        listItems: items,
        title: block.category === "Variables" ? `initialize global ${cleanVar} to` : `make a list [${items.length}]`,
        subtitle: `[${items.slice(0, 2).join(", ")}${items.length > 2 ? "..." : ""}]`,
        fields: {
          ...block.fields,
          items,
          value: `[${formatted}]`,
        },
        inlineValues: [{ label: `list[${items.length}]`, value: items.slice(0, 3).join(", "), color: "#49a6cb" }],
      };
    } else if (activeType === "dictionary") {
      updatedBlock = {
        ...updatedBlock,
        dictPairs: pairs,
        title: block.category === "Variables" ? `initialize global ${cleanVar} to` : `make a dictionary [${pairs.length}]`,
        subtitle: `{${pairs.slice(0, 2).map((p) => p.key).join(", ")}${pairs.length > 2 ? "..." : ""}}`,
        fields: {
          ...block.fields,
          pairs,
          value: `{${pairs.map((p) => `${p.key}: ${p.value}`).join(", ")}}`,
        },
        inlineValues: [{ label: "dict", value: `${pairs.length} pares`, color: "#455a64" }],
      };
    } else if (activeType === "color") {
      updatedBlock = {
        ...updatedBlock,
        colorHex: selectedHex,
        colorRgb: rgbVal,
        title: block.category === "Variables" ? `initialize global ${cleanVar} to` : `color ${selectedHex}`,
        subtitle: `rgb(${rgbVal.r}, ${rgbVal.g}, ${rgbVal.b})`,
        fields: {
          ...block.fields,
          color: selectedHex,
          value: `rgb(${rgbVal.r}, ${rgbVal.g}, ${rgbVal.b})`,
        },
        inlineValues: [{ label: "rgb", value: `${rgbVal.r},${rgbVal.g},${rgbVal.b}`, color: selectedHex }],
      };
    }

    onUpdateBlock(updatedBlock);
  };

  return (
    <div className="absolute bottom-4 left-68 right-68 max-w-2xl mx-auto bg-white/95 backdrop-blur-md rounded-xl border border-slate-300 shadow-2xl z-40 flex flex-col overflow-hidden text-xs animate-in slide-in-from-bottom-3 duration-200">
      {/* Top Header Bar with Tabs */}
      <div className="px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-extrabold text-xs tracking-wide">
            Constructor de Declaraciones de Datos DIV
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
            Motor DIV v3.0
          </span>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          title="Cerrar constructor"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center bg-slate-100 border-b border-slate-200 px-3 py-1.5 gap-2">
        <button
          onClick={() => setActiveType("text")}
          className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all ${
            activeType === "text"
              ? "bg-[#c44078] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Texto (STRING)</span>
        </button>

        <button
          onClick={() => setActiveType("list")}
          className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all ${
            activeType === "list"
              ? "bg-[#49a6cb] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Listas (ARRAY)</span>
        </button>

        <button
          onClick={() => setActiveType("dictionary")}
          className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all ${
            activeType === "dictionary"
              ? "bg-[#455a64] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Diccionarios (STRUCT)</span>
        </button>

        <button
          onClick={() => setActiveType("color")}
          className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all ${
            activeType === "color"
              ? "bg-[#8492a6] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Colores (RGB)</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="p-3.5 flex flex-col gap-3 max-h-72 overflow-y-auto">
        {/* Variable Identifier Name */}
        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-700 w-32 flex-shrink-0">
            Nombre de Variable:
          </label>
          <input
            type="text"
            value={varName}
            onChange={(e) => setVarName(e.target.value)}
            placeholder="ej. mensaje_nivel, lista_enemigos, color_fondo"
            className="flex-1 px-2.5 py-1 rounded border border-slate-300 focus:outline-emerald-600 font-mono text-xs font-semibold bg-white text-slate-800"
          />
        </div>

        {/* 1. TEXT BUILDER */}
        {activeType === "text" && (
          <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-pink-50/50 border border-pink-200">
            <label className="font-bold text-pink-900">
              Contenido de la Cadena de Texto:
            </label>
            <input
              type="text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Escribe el texto aquí..."
              className="w-full px-3 py-1.5 rounded border border-pink-300 focus:outline-pink-600 text-xs font-medium bg-white text-slate-900"
            />
            <div className="flex items-center gap-2 pt-1 text-[11px]">
              <span className="text-slate-500 font-bold">Acciones rápidas:</span>
              <button
                onClick={() => setTextContent(textContent.toUpperCase())}
                className="px-2 py-0.5 rounded bg-white hover:bg-pink-100 text-pink-800 border border-pink-200 font-semibold"
              >
                MAYÚSCULAS
              </button>
              <button
                onClick={() => setTextContent(textContent.toLowerCase())}
                className="px-2 py-0.5 rounded bg-white hover:bg-pink-100 text-pink-800 border border-pink-200 font-semibold"
              >
                minúsculas
              </button>
              <button
                onClick={() => setTextContent(textContent.trim())}
                className="px-2 py-0.5 rounded bg-white hover:bg-pink-100 text-pink-800 border border-pink-200 font-semibold"
              >
                trim (sin espacios)
              </button>
            </div>
          </div>
        )}

        {/* 2. LIST BUILDER */}
        {activeType === "list" && (
          <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-cyan-50/50 border border-cyan-200">
            <div className="flex items-center justify-between">
              <label className="font-bold text-cyan-900">
                Elementos de la Lista ({items.length}):
              </label>
              <div className="flex gap-1 text-[10px]">
                <button
                  onClick={() => setItems(["Espada", "Escudo", "Poción", "Llave Dorada"])}
                  className="px-1.5 py-0.5 rounded bg-white border border-cyan-300 text-cyan-800 hover:bg-cyan-100 font-semibold"
                >
                  Preset: Inventario RPG
                </button>
                <button
                  onClick={() => setItems(["100", "250", "500", "1000"])}
                  className="px-1.5 py-0.5 rounded bg-white border border-cyan-300 text-cyan-800 hover:bg-cyan-100 font-semibold"
                >
                  Preset: High Scores
                </button>
              </div>
            </div>

            {/* Existing Items */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white rounded border border-cyan-200">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1 rounded bg-cyan-100 text-cyan-950 font-mono text-xs flex items-center gap-1.5 border border-cyan-300 shadow-2xs"
                >
                  <span className="text-cyan-600 font-bold text-[10px]">#{idx + 1}</span>
                  <span>{it}</span>
                  <button
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="text-rose-600 hover:text-rose-800 font-bold ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add item input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newItemInput}
                onChange={(e) => setNewItemInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newItemInput.trim()) {
                    setItems([...items, newItemInput.trim()]);
                    setNewItemInput("");
                  }
                }}
                placeholder="Nuevo elemento (ej. 'Orco', 400)..."
                className="flex-1 px-2.5 py-1 rounded border border-cyan-300 focus:outline-cyan-600 text-xs bg-white text-slate-800"
              />
              <button
                onClick={() => {
                  if (newItemInput.trim()) {
                    setItems([...items, newItemInput.trim()]);
                    setNewItemInput("");
                  }
                }}
                className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-bold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. DICTIONARY BUILDER */}
        {activeType === "dictionary" && (
          <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-300">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">
                Pares Clave-Valor del Diccionario ({pairs.length}):
              </label>
              <div className="flex gap-1 text-[10px]">
                <button
                  onClick={() =>
                    setPairs([
                      { key: "hp", value: "100" },
                      { key: "mp", value: "50" },
                      { key: "fuerza", value: "15" },
                      { key: "defensa", value: "8" },
                    ])
                  }
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Preset: Stats Jugador
                </button>
                <button
                  onClick={() =>
                    setPairs([
                      { key: "dificultad", value: "2" },
                      { key: "volumen_musica", value: "80" },
                      { key: "efectos_activos", value: "1" },
                    ])
                  }
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Preset: Config
                </button>
              </div>
            </div>

            {/* Existing Pairs */}
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto p-1 bg-white rounded border border-slate-200">
              {pairs.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{p.key}:</span>
                    <span className="text-emerald-700 font-semibold">{p.value}</span>
                  </div>
                  <button
                    onClick={() => setPairs(pairs.filter((_, i) => i !== idx))}
                    className="text-rose-600 hover:text-rose-800 font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add pair inputs */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newKeyInput}
                onChange={(e) => setNewKeyInput(e.target.value)}
                placeholder="Clave (ej. velocidad)"
                className="w-1/3 px-2 py-1 rounded border border-slate-300 focus:outline-slate-600 text-xs bg-white text-slate-800 font-mono"
              />
              <input
                type="text"
                value={newValInput}
                onChange={(e) => setNewValInput(e.target.value)}
                placeholder="Valor (ej. 10, 'Activo')"
                className="flex-1 px-2 py-1 rounded border border-slate-300 focus:outline-slate-600 text-xs bg-white text-slate-800 font-mono"
              />
              <button
                onClick={() => {
                  if (newKeyInput.trim()) {
                    setPairs([...pairs, { key: newKeyInput.trim(), value: newValInput.trim() || "0" }]);
                    setNewKeyInput("");
                    setNewValInput("");
                  }
                }}
                className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-800 text-white font-bold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. COLOR BUILDER */}
        {activeType === "color" && (
          <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-300">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">
                Selector de Color y Conversor RGB DIV:
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs">{selectedHex}</span>
                <span className="px-2 py-0.5 rounded bg-black/80 text-white font-mono text-[11px] font-bold">
                  rgb({rgbVal.r}, {rgbVal.g}, {rgbVal.b})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Native Color Picker */}
              <input
                type="color"
                value={selectedHex}
                onChange={(e) => setSelectedHex(e.target.value)}
                className="w-12 h-10 rounded border border-slate-400 cursor-pointer p-0.5 bg-white"
              />

              {/* Quick Swatches */}
              <div className="flex flex-wrap gap-1.5 flex-1">
                {[
                  { name: "Rojo", hex: "#ea4335" },
                  { name: "Verde", hex: "#34a853" },
                  { name: "Azul", hex: "#4285f4" },
                  { name: "Amarillo", hex: "#fbbc05" },
                  { name: "Cian", hex: "#00bcd4" },
                  { name: "Magenta", hex: "#e91e63" },
                  { name: "Naranja", hex: "#ff9800" },
                  { name: "Negro", hex: "#000000" },
                  { name: "Blanco", hex: "#ffffff" },
                  { name: "Fondo DIV", hex: "#0c1220" },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setSelectedHex(c.hex)}
                    className="w-6 h-6 rounded-md border border-black/30 hover:scale-110 transition-transform shadow-xs"
                    style={{ backgroundColor: c.hex }}
                    title={`${c.name} (${c.hex})`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Code Preview for DIV Games Studio */}
        <div className="flex flex-col gap-1 p-2 rounded bg-slate-900 text-slate-200 font-mono text-[11px] border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800 pb-0.5">
            <span>Salida para Motor DIV Games Studio:</span>
            <span className="text-emerald-400">Sintaxis 100% Nativa</span>
          </div>
          <pre className="whitespace-pre-wrap text-emerald-300 font-semibold">{computeDivCode()}</pre>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 italic">
          Haz clic en Aplicar para guardar y sincronizar con el motor DIV.
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              handleApply();
              onClose();
            }}
            className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-900/20 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar al Bloque y al Motor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
