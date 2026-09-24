// Comprehensive High-Performance Syntax Highlighter for DIV Games Studio, 
// Visual Basic 3.0 / .NET Precode and SQL/Web Extensions
// Tokenizes accurately with zero word-boundary clipping or missing keywords

export interface HighlightToken {
  type: "keyword" | "process" | "string" | "comment" | "number" | "operator" | "function" | "variable" | "plain";
  text: string;
}

// 1. DIV Games Studio & Visual Basic Keywords
const KEYWORDS = new Set([
  // DIV Games Studio Core
  "program", "begin", "end", "process", "function", "global", "local", "private",
  "store", "from", "to", "step", "for", "while", "repeat", "until", "loop",
  "if", "else", "elseif", "elsif", "then", "switch", "case", "default", "return", "frame",
  "clone", "type", "struct", "const", "import", "as", "export", "break", "continue",
  "include", "sizeof", "offset", "pointer",
  // Visual Basic 3.0 / .NET keywords & data types
  "sub", "dim", "as", "integer", "string", "boolean", "bool", "double", "float", "byte",
  "exit", "next", "select", "with", "set", "new", "call", "public", "redim", "wend",
  "true", "false", "nothing", "null", "on", "error", "goto", "resume", "print",
  "me", "event", "handles", "raiseevent", "property", "get", "let", "module", "class",
  "form", "unload", "load", "show", "hide"
]);

// 2. Builtin Engine Functions & Primitives (DIV 2 + Modern Extensions)
const BUILTIN_FUNCTIONS = new Set([
  // DIV Audio / Video / Flow
  "set_mode", "set_fps", "screen_color", "write", "write_int", "fade_on", "fade_off",
  "rand", "sound", "load_snd", "play_snd", "stop_snd", "load_fpg", "unload_fpg",
  "load_fnt", "unload_fnt", "load_pal", "set_pal", "load_map", "unload_map",
  "collision", "get_dist", "get_distx", "get_disty", "get_angle", "signal", "xadvance",
  "let_me_alone", "key", "rgb", "rgba", "out_region", "fading",
  // Drawing & GUI Primitives (Visual Basic .NET & DIV UI engine)
  "draw_box", "draw_circle", "draw_line", "draw_text", "drawbutton", "drawinput",
  "drawselect", "drawtable", "drawmodal", "drawtabs", "drawcheckbox",
  // Layout & State Management
  "layout_begin", "layout_next", "layout_end", "store_create", "store_get", "store_set",
  "save_json", "load_json", "navigate", "call_dll", "register_js_library", "fetch_api",
  // SQLite Database Functions
  "load_sqlite", "sqlite_query", "sqlite_exec", "sqlite_open", "sqlite_close",
  // 3D & Mode 8 primitives
  "m8_start", "m8_wall", "m8_sector", "m8_texture", "m8_render", "m8_camera",
  "start_mode8", "stop_mode8", "start_scroll", "stop_scroll"
]);

// 3. Engine Variables & Constants
const ENGINE_VARS = new Set([
  "x", "y", "z", "graph", "file", "angle", "size", "size_x", "size_y", "flags",
  "priority", "region", "resolution", "id", "father", "son", "smallbro", "bigbro",
  "c_screen", "mouse", "timer", "scan_code", "ascii", "m640x480", "m320x200", "m800x600",
  "s_kill", "s_freeze", "s_wakeup", "s_kill_tree", "s_freeze_tree",
  "_up", "_down", "_left", "_right", "_space", "_enter", "_esc", "_control", "_alt", "_shift"
]);

export function highlightDivCode(code: string): string {
  if (!code) return "";

  // HTML entity escape helper
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // Regex tokens:
  // 1. Single line comments: // ... or ' ... (VB style)
  // 2. Block comments: /* ... */
  // 3. Double-quoted strings: "..."
  // 4. Hex numbers: 0x... or &H...
  // 5. Decimal/Float numbers: \b\d+(\.\d+)?\b
  // 6. Identifier words: [a-zA-Z_][a-zA-Z0-9_]*
  // 7. Operators & punctuation
  const regex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^\n]*)|"(?:\\.|[^"\\])*"|&H[0-9a-fA-F]+\b|0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b|[a-zA-Z_][a-zA-Z0-9_]*|[+\-*/%=<>!&|^]+|[^\s\w]+|\s+)/gm;

  return code.replace(regex, (match) => {
    // 1. Comments (DIV //, /* */ or VB ')
    if (match.startsWith("//") || match.startsWith("/*") || match.startsWith("'")) {
      return `<span class="text-emerald-500/90 italic font-mono">${escapeHtml(match)}</span>`;
    }

    // 2. Strings
    if (match.startsWith('"') && match.endsWith('"')) {
      return `<span class="text-amber-300 font-mono">${escapeHtml(match)}</span>`;
    }

    // 3. Hex & Decimal Numbers
    if (/^(0x[0-9a-fA-F]+|&H[0-9a-fA-F]+|\d+(?:\.\d+)?)$/.test(match)) {
      return `<span class="text-emerald-400 font-semibold font-mono">${escapeHtml(match)}</span>`;
    }

    // 4. Identifiers & Words
    const lower = match.toLowerCase();

    // Check Keywords
    if (KEYWORDS.has(lower)) {
      if (lower === "program" || lower === "process" || lower === "function" || lower === "sub" || lower === "module" || lower === "class") {
        return `<span class="text-fuchsia-400 font-bold font-mono">${escapeHtml(match)}</span>`;
      }
      if (lower === "begin" || lower === "end" || lower === "loop" || lower === "frame") {
        return `<span class="text-cyan-300 font-bold font-mono">${escapeHtml(match)}</span>`;
      }
      if (lower === "dim" || lower === "as" || lower === "integer" || lower === "string" || lower === "boolean" || lower === "global" || lower === "local" || lower === "private") {
        return `<span class="text-blue-400 font-semibold font-mono">${escapeHtml(match)}</span>`;
      }
      return `<span class="text-sky-400 font-bold font-mono">${escapeHtml(match)}</span>`;
    }

    // Check Built-in Engine Functions
    if (BUILTIN_FUNCTIONS.has(lower)) {
      return `<span class="text-teal-300 font-semibold font-mono">${escapeHtml(match)}</span>`;
    }

    // Check Engine Variables
    if (ENGINE_VARS.has(lower)) {
      return `<span class="text-purple-300 font-mono">${escapeHtml(match)}</span>`;
    }

    // 5. Operators
    if (/^[+\-*/%=<>!&|^]+$/.test(match)) {
      return `<span class="text-rose-400 font-mono">${escapeHtml(match)}</span>`;
    }

    return escapeHtml(match);
  });
}
