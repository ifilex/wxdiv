import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  BookOpen,
  Code2,
  Copy,
  Check,
  PlusCircle,
  Sparkles,
  Layers,
  Terminal,
  Cpu,
  Monitor,
  Flame,
  Volume2,
  Gamepad2,
  FileCode,
} from "lucide-react";
import { DIV_AUTOCOMPLETE_ITEMS, DivSuggestion } from "../engine/divKeywords";

interface DivLexiconModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCode?: (snippet: string) => void;
}

type LexiconCategory =
  | "all"
  | "control"
  | "graphics"
  | "3d"
  | "audio"
  | "input"
  | "collision"
  | "text"
  | "variables"
  | "visual_mdi";

export const DivLexiconModal: React.FC<DivLexiconModalProps> = ({
  isOpen,
  onClose,
  onInsertCode,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<LexiconCategory>("all");
  const [selectedItem, setSelectedItem] = useState<DivSuggestion | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Additional specialized lexicon entries for DIV Games Studio & Visual MDI Engine
  const fullLexicon: DivSuggestion[] = useMemo(() => {
    const customEntries: DivSuggestion[] = [
      // Estructura y ciclo
      {
        name: "PROGRAM",
        type: "keyword",
        categoryLabel: "Estructuras & Proceso",
        description: "Declara el nombre y punto de entrada principal del videojuego en DIV Games Studio.",
        syntax: "PROGRAM nombre_del_juego;\nGLOBAL\n  // variables globales\nBEGIN\n  set_mode(m640x480);\n  LOOP\n    FRAME;\n  END\nEND",
      },
      {
        name: "PROCESS",
        type: "keyword",
        categoryLabel: "Estructuras & Proceso",
        description: "Define una entidad independiente o hilo de ejecución concurrente con sus propias variables locales (x, y, graph, file, etc.).",
        syntax: "PROCESS jugador(x, y)\nPRIVATE\n  velocidad = 4;\nBEGIN\n  file = 0;\n  graph = 1;\n  LOOP\n    IF (key(_left))  x -= velocidad; END\n    IF (key(_right)) x += velocidad; END\n    FRAME;\n  END\nEND",
      },
      {
        name: "FRAME",
        type: "keyword",
        categoryLabel: "Estructuras & Proceso",
        description: "Cede el control del proceso al motor por un fotograma (60 FPS) sincronizado con el refresco de pantalla.",
        syntax: "FRAME;\n// o FRAME(porcentaje_avance);",
      },
      // Modo 8 Raycaster 3D
      {
        name: "start_mode8",
        type: "function",
        categoryLabel: "Modo 8 3D",
        description: "Inicia el motor de renderizado 3D Raycasting (estilo Wolfenstein / DOOM 1993) a 60 FPS con aceleración GPU.",
        syntax: "start_mode8(640, 480, \"texturas.fpg\");",
      },
      {
        name: "m8_set_camera",
        type: "function",
        categoryLabel: "Modo 8 3D",
        description: "Establece la posición (x, y, z), ángulo de visión y altura de la cámara en el espacio 3D de la mazmorra.",
        syntax: "m8_set_camera(jugador.x, jugador.y, 32, jugador.angle);",
      },
      {
        name: "m8_spawn_enemy",
        type: "function",
        categoryLabel: "Modo 8 3D",
        description: "Engendra un enemigo 3D interactivo con inteligencia artificial, patrullaje y sistema de daño en el laberinto.",
        syntax: "m8_spawn_enemy(\"demon\", 8.5, 12.0, 100);",
      },
      // Visual MDI Engine UI
      {
        name: "draw_button",
        type: "function",
        categoryLabel: "Visual MDI Engine",
        description: "Dibuja un botón interactivo 3D del Visual MDI Engine que ejecuta un proceso de evento al ser pulsado con ratón o táctil.",
        syntax: "draw_button(x, y, ancho, alto, \"Aceptar\", mi_evento_click);",
      },
      {
        name: "draw_input",
        type: "function",
        categoryLabel: "Visual MDI Engine",
        description: "Renderiza un campo interactivo para introducción de texto reactivo con soporte de foco de teclado.",
        syntax: "draw_input(x, y, ancho, alto, variable_texto, \"placeholder\");",
      },
      {
        name: "draw_table",
        type: "function",
        categoryLabel: "Visual MDI Engine",
        description: "Dibuja una cuadrícula de datos / Data Grid reactiva con encabezados y filas editables.",
        syntax: "draw_table(x, y, ancho, alto, \"ID,NOMBRE,SALDO\", \"1,Alpha,100|2,Beta,250\");",
      },
      {
        name: "STORE",
        type: "keyword",
        categoryLabel: "Visual MDI Engine",
        description: "Declara un almacén de datos reactivo persistente para aplicaciones y formularios del Visual MDI Engine.",
        syntax: "STORE app_state\n  usuario: string = \"Admin\"\n  conectado: bool = true\nEND",
      },
    ];

    const map = new Map<string, DivSuggestion>();
    customEntries.forEach((e) => map.set(e.name.toLowerCase(), e));
    DIV_AUTOCOMPLETE_ITEMS.forEach((e) => {
      if (!map.has(e.name.toLowerCase())) {
        map.set(e.name.toLowerCase(), e);
      }
    });
    return Array.from(map.values());
  }, []);

  // Filtered entries
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return fullLexicon.filter((item) => {
      // Category match
      if (activeCategory === "control") {
        if (item.type !== "keyword" && !item.categoryLabel?.includes("Control")) return false;
      } else if (activeCategory === "graphics") {
        const n = item.name.toLowerCase();
        if (!n.startsWith("load_fpg") && !n.includes("screen") && !n.includes("graph") && !n.includes("mode") && !n.includes("fade") && !n.includes("draw")) {
          return false;
        }
      } else if (activeCategory === "3d") {
        if (!item.name.toLowerCase().includes("m8_") && !item.name.toLowerCase().includes("mode8") && !item.name.toLowerCase().includes("mode7")) {
          return false;
        }
      } else if (activeCategory === "audio") {
        const n = item.name.toLowerCase();
        if (!n.includes("sound") && !n.includes("song") && !n.includes("wav") && !n.includes("audio")) return false;
      } else if (activeCategory === "input") {
        const n = item.name.toLowerCase();
        if (!n.includes("key") && !n.includes("mouse") && !n.includes("joy") && !n.startsWith("_")) return false;
      } else if (activeCategory === "collision") {
        const n = item.name.toLowerCase();
        if (!n.includes("collision") && !n.includes("dist") && !n.includes("angle") && !n.includes("advance")) return false;
      } else if (activeCategory === "text") {
        const n = item.name.toLowerCase();
        if (!n.includes("write") && !n.includes("fnt") && !n.includes("text") && !n.includes("font")) return false;
      } else if (activeCategory === "variables") {
        if (item.type !== "variable" && !item.name.match(/^(x|y|z|graph|file|flags|angle|size|alpha|priority|id)$/i)) return false;
      } else if (activeCategory === "visual_mdi") {
        const n = item.name.toLowerCase();
        if (!n.includes("draw_") && !n.includes("store") && !n.includes("save_json") && !n.includes("load_json") && !item.categoryLabel?.includes("MDI")) return false;
      }

      // Query match
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.syntax && item.syntax.toLowerCase().includes(q))
      );
    });
  }, [fullLexicon, searchQuery, activeCategory]);

  const activeDoc = selectedItem || filteredList[0] || null;

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in select-none font-sans">
      <div className="w-full max-w-5xl h-[88vh] bg-[#0c1222] border border-cyan-500/50 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="h-12 bg-gradient-to-r from-slate-900 via-[#101b38] to-slate-900 border-b border-cyan-500/40 px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-sm tracking-wide text-cyan-200">
              Manual Oficial de Léxico DIV Games Studio & Visual MDI Engine
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono">
              v3.0 PRO
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="bg-[#0f172a] border-b border-slate-800 px-4 py-2.5 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between flex-shrink-0">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar comando, función, proceso o variable..."
              className="w-full pl-9 pr-3 py-1.5 rounded bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs text-slate-200 placeholder-slate-500 font-mono"
            />
          </div>

          {/* Quick Stats */}
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Resultados: <strong className="text-cyan-300">{filteredList.length}</strong></span>
            <span>•</span>
            <span>Léxico DIV verificado</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="bg-[#090d1a] border-b border-slate-800 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 text-xs">
          {[
            { id: "all", label: "Todo el Léxico" },
            { id: "control", label: "Estructuras & Control" },
            { id: "graphics", label: "Gráficos & 2D" },
            { id: "3d", label: "Modo 8 (3D Raycaster)" },
            { id: "audio", label: "Sonido & Música" },
            { id: "input", label: "Entrada & Teclado" },
            { id: "collision", label: "Física & Colisiones" },
            { id: "text", label: "Texto & Fuentes FNT" },
            { id: "variables", label: "Variables Locales" },
            { id: "visual_mdi", label: "Visual MDI Engine" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as LexiconCategory)}
              className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-colors font-medium ${
                activeCategory === cat.id
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Main 2-Column Split: List vs Documentation Detail */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Command List */}
          <div className="w-72 sm:w-80 border-r border-slate-800 bg-[#090f1e] overflow-y-auto flex-shrink-0 divide-y divide-slate-800/60">
            {filteredList.map((item) => {
              const isSelected = activeDoc?.name === item.name;
              return (
                <div
                  key={item.name}
                  onClick={() => setSelectedItem(item)}
                  className={`p-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-cyan-950/70 border-l-4 border-cyan-400 text-white"
                      : "hover:bg-slate-800/50 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-mono font-bold text-xs text-cyan-300">
                      {item.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        item.type === "keyword"
                          ? "bg-purple-950 text-purple-300 border border-purple-800/60"
                          : item.type === "function"
                          ? "bg-sky-950 text-sky-300 border border-sky-800/60"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                No se encontraron comandos con "{searchQuery}".
              </div>
            )}
          </div>

          {/* Right Column: Detailed Documentation Card */}
          <div className="flex-1 bg-[#0b1020] p-4 sm:p-6 overflow-y-auto flex flex-col justify-between">
            {activeDoc ? (
              <div className="space-y-4">
                {/* Title & Category Badge */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-mono font-black text-xl text-cyan-300">
                        {activeDoc.name}
                      </h1>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                        {activeDoc.categoryLabel || activeDoc.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Instrucción nativa del compilador DIV Games Studio y motor Visual MDI Engine
                    </p>
                  </div>

                  {onInsertCode && activeDoc.syntax && (
                    <button
                      onClick={() => {
                        onInsertCode(activeDoc.syntax || activeDoc.name);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
                      title="Insertar este código en el editor"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Insertar en Editor</span>
                    </button>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Descripción & Funcionamiento:
                  </h3>
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs leading-relaxed text-slate-200">
                    {activeDoc.description}
                  </div>
                </div>

                {/* Syntax & Code Snippet */}
                {activeDoc.syntax && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Sintaxis & Ejemplo de Código DIV:
                      </h3>
                      <button
                        onClick={() => handleCopyCode(activeDoc.syntax!, activeDoc.name)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 font-mono transition-colors"
                      >
                        {copiedId === activeDoc.name ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3.5 rounded-lg bg-[#070b14] border border-cyan-900/40 text-cyan-200 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed shadow-inner">
                      {activeDoc.syntax}
                    </pre>
                  </div>
                )}

                {/* Quick Reference Notes */}
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-700/30 text-amber-200/90 text-xs">
                  <div className="font-bold flex items-center gap-1 mb-1">
                    <span>💡 Nota Técnica DIV Games Studio:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-300/80">
                    En DIV Games Studio, los bloques <code className="font-mono bg-black/40 px-1 py-0.5 rounded">GLOBAL</code> no llevan <code className="font-mono bg-black/40 px-1 py-0.5 rounded">END</code>. Cada <code className="font-mono bg-black/40 px-1 py-0.5 rounded">PROCESS</code> se ejecuta de forma pseudo-multitarea a 60 FPS llamando a <code className="font-mono bg-black/40 px-1 py-0.5 rounded">FRAME;</code> en su bucle <code className="font-mono bg-black/40 px-1 py-0.5 rounded">LOOP</code>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                Selecciona un elemento de la lista para ver su documentación completa.
              </div>
            )}

            {/* Footer with Shortcut Cheat Sheet */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">F5</kbd> Iniciar</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">F7</kbd> Código</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Shift+F7</kbd> Diseñador Visual</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Ctrl+N</kbd> Nuevo</span>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-sans"
              >
                Cerrar Manual
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
