import type { DivDiagnostic } from "../types";
export type { DivDiagnostic };

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export enum TokenType {
  KEYWORD = "KEYWORD",
  IDENTIFIER = "IDENTIFIER",
  NUMBER = "NUMBER",
  STRING = "STRING",
  OPERATOR = "OPERATOR",
  PUNCTUATION = "PUNCTUATION",
  COMMENT = "COMMENT",
  WHITESPACE = "WHITESPACE",
  UNKNOWN = "UNKNOWN",
}

export const DIV_KEYWORDS = new Set([
  "PROGRAM",
  "GLOBAL",
  "LOCAL",
  "PRIVATE",
  "CONST",
  "BEGIN",
  "END",
  "PROCESS",
  "FUNCTION",
  "FRAME",
  "LOOP",
  "WHILE",
  "REPEAT",
  "UNTIL",
  "FOR",
  "IF",
  "ELSE",
  "ELSIF",
  "SWITCH",
  "CASE",
  "DEFAULT",
  "BREAK",
  "CONTINUE",
  "RETURN",
  "CLONE",
  "FROM",
  "TO",
  "STEP",
  "TYPE",
  "STRUCT",
  "ONEXIT",
  "INT",
  "BYTE",
  "WORD",
  "STRING",
  "FLOAT",
  "DOUBLE",
  "CHAR",
]);

export const DIV_BUILTINS = new Set([
  // Graphics & Display
  "set_mode",
  "set_fps",
  "screen_color",
  "load_fpg",
  "unload_fpg",
  "load_map",
  "unload_map",
  "fade_on",
  "fade_off",
  "clear_screen",
  "start_scroll",
  "stop_scroll",
  "load_pal",
  "load_wld",
  "save_wld",
  "load_fmp",
  "unload_wld",
  "start_raycast",
  "stop_raycast",
  // Text
  "write",
  "write_int",
  "write_string",
  "delete_text",
  "move_text",
  "load_fnt",
  // Drawing primitives
  "draw_box",
  "draw_line",
  "draw_circle",
  "draw_fcircle",
  // Math & Geometry
  "get_dist",
  "get_angle",
  "advance",
  "xadvance",
  "near_angle",
  "rand",
  "abs",
  "sqrt",
  "cos",
  "sin",
  "fget_dist",
  "fget_angle",
  // Process Management & Signals
  "collision",
  "signal",
  "let_me_alone",
  "exists",
  // Sound
  "sound",
  "sound_play",
  "stop_sound",
  "sound_stop",
  "change_sound",
  "is_playing_sound",
  "fade_sound",
  "set_volume",
  "set_sound_volume",
  "set_music_volume",
  "load_wav",
  "unload_wav",
  "load_snd",
  "unload_snd",
  "load_pcm",
  "unload_pcm",
  "load_song",
  "unload_song",
  "song",
  "stop_song",
  // Palette & Color
  "roll_palette",
  "set_color",
  "get_color",
  // Inputs
  "key",
  // 3D Engine (Modo 7 y Modo 8 Hexen / GZDoom Hybrid & DIV2 Raycaster)
  "load_pal",
  "load_fmp",
  "load_wld",
  "save_wld",
  "start_raycast",
  "stop_raycast",
  "start_mode7",
  "stop_mode7",
  "start_mode8",
  "stop_mode8",
  "start_mode8_hybrid",
  "m8_mode",
  "m8_set_height",
  "m8_set_sector",
  "m8_add_light",
  "m8_add_model",
  "m8_add_voxel",
  "m8_set_fluid",
  "m8_raytracing",
  "load_md2",
  "load_md3",
  "open_mode8_door",
  "close_mode8_door",
  "toggle_mode8_door",
  "interact_mode8",
]);

export const DIV_CONSTANTS = new Set([
  // Screen modes
  "m320x200",
  "m640x480",
  "m800x600",
  "m1024x768",
  // Mode 8 Engine modes & fluids
  "m8_classic",
  "m8_hybrid",
  "fluid_water",
  "fluid_lava",
  "fluid_acid",
  "fluid_blood",
  "fluid_none",
  // 3D Process types
  "c_m7",
  "c_m8",
  "c_screen",
  "c_scroll",
  // Signals
  "s_kill",
  "s_freeze",
  "s_wakeup",
  "s_sleep",
  "s_kill_tree",
  "all_text",
  // Key constants
  "_up",
  "_down",
  "_left",
  "_right",
  "_space",
  "_enter",
  "_esc",
  "_control",
  "_alt",
  "_shift",
  "_a",
  "_b",
  "_c",
  "_d",
  "_e",
  "_f",
  "_g",
  "_h",
  "_i",
  "_j",
  "_k",
  "_l",
  "_m",
  "_n",
  "_o",
  "_p",
  "_q",
  "_r",
  "_s",
  "_t",
  "_u",
  "_v",
  "_w",
  "_x",
  "_y",
  "_z",
  "_0",
  "_1",
  "_2",
  "_3",
  "_4",
  "_5",
  "_6",
  "_7",
  "_8",
  "_9",
]);

export const DIV_RESERVED_VARS = new Set([
  // Process local vars
  "id",
  "father",
  "son",
  "bigbro",
  "smallbro",
  "x",
  "y",
  "z",
  "graph",
  "file",
  "flags",
  "size",
  "angle",
  "alpha",
  "priority",
  "region",
  "resolution",
  "ctype",
  "cnumber",
  // Global vars
  "mouse",
  "timer",
  "fps",
  "m7",
  "m8",
  "camara_id",
  "cam_id",
]);

/**
 * Tokenizes DIV code into stream of tokens
 */
export function tokenizeDiv(code: string): Token[] {
  const tokens: Token[] = [];
  let line = 1;
  let col = 1;
  let i = 0;

  while (i < code.length) {
    const char = code[i];

    // Newlines
    if (char === "\n") {
      line++;
      col = 1;
      i++;
      continue;
    }

    // Whitespace
    if (/\s/.test(char)) {
      col++;
      i++;
      continue;
    }

    // Comments // or /* */
    if (char === "/" && code[i + 1] === "/") {
      const startCol = col;
      let val = "";
      while (i < code.length && code[i] !== "\n") {
        val += code[i];
        i++;
        col++;
      }
      tokens.push({ type: TokenType.COMMENT, value: val, line, column: startCol });
      continue;
    }

    if (char === "/" && code[i + 1] === "*") {
      const startCol = col;
      const startLine = line;
      let val = "/*";
      i += 2;
      col += 2;
      while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) {
        if (code[i] === "\n") {
          line++;
          col = 1;
        } else {
          col++;
        }
        val += code[i];
        i++;
      }
      if (i < code.length) {
        val += "*/";
        i += 2;
        col += 2;
      }
      tokens.push({ type: TokenType.COMMENT, value: val, line: startLine, column: startCol });
      continue;
    }

    // Strings "..."
    if (char === '"' || char === "'") {
      const quote = char;
      const startCol = col;
      let val = "";
      i++;
      col++;
      while (i < code.length && code[i] !== quote && code[i] !== "\n") {
        val += code[i];
        i++;
        col++;
      }
      if (code[i] === quote) {
        i++;
        col++;
      }
      tokens.push({ type: TokenType.STRING, value: val, line, column: startCol });
      continue;
    }

    // Numbers (decimal and floats)
    if (/[0-9]/.test(char)) {
      const startCol = col;
      let val = "";
      while (i < code.length && /[0-9.]/.test(code[i])) {
        val += code[i];
        i++;
        col++;
      }
      tokens.push({ type: TokenType.NUMBER, value: val, line, column: startCol });
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_]/.test(char)) {
      const startCol = col;
      let val = "";
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
        val += code[i];
        i++;
        col++;
      }
      const upper = val.toUpperCase();
      if (DIV_KEYWORDS.has(upper)) {
        tokens.push({ type: TokenType.KEYWORD, value: val, line, column: startCol });
      } else {
        tokens.push({ type: TokenType.IDENTIFIER, value: val, line, column: startCol });
      }
      continue;
    }

    // Operators & Punctuation
    const twoChar = code.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "++", "--", "&&", "||"].includes(twoChar)) {
      tokens.push({ type: TokenType.OPERATOR, value: twoChar, line, column: col });
      i += 2;
      col += 2;
      continue;
    }

    if (["+", "-", "*", "/", "%", "=", "<", ">", "!", "&", "|", "^"].includes(char)) {
      tokens.push({ type: TokenType.OPERATOR, value: char, line, column: col });
      i++;
      col++;
      continue;
    }

    if ([";", ",", "(", ")", "[", "]", "{", "}", ":", "."].includes(char)) {
      tokens.push({ type: TokenType.PUNCTUATION, value: char, line, column: col });
      i++;
      col++;
      continue;
    }

    // Unknown
    tokens.push({ type: TokenType.UNKNOWN, value: char, line, column: col });
    i++;
    col++;
  }

  return tokens;
}

/**
 * Validates DIV Games Studio syntax and returns diagnostics with exact line precision
 */
export function validateDivSyntax(code: string): DivDiagnostic[] {
  const diagnostics: DivDiagnostic[] = [];
  const lines = code.split("\n");

  if (!code.trim()) {
    return diagnostics;
  }

  // Basic structure check
  const upperCode = code.toUpperCase();
  if (!upperCode.includes("PROGRAM")) {
    diagnostics.push({
      line: 1,
      column: 1,
      severity: "warning",
      message: "Se recomienda declarar 'PROGRAM nombre_juego;' al inicio del archivo.",
      rule: "header-missing",
    });
  }

  const tokens = tokenizeDiv(code);

  // Check for unclosed strings or comments
  for (let l = 0; l < lines.length; l++) {
    const lineText = lines[l];
    // Check unclosed double or single quotes that are not inside comments
    const trimmed = lineText.trim();
    if (!trimmed.startsWith("//") && !trimmed.startsWith("/*")) {
      let inDQuote = false;
      let inSQuote = false;
      for (let c = 0; c < lineText.length; c++) {
        const ch = lineText[c];
        if (ch === '"' && !inSQuote && (c === 0 || lineText[c - 1] !== "\\")) {
          inDQuote = !inDQuote;
        } else if (ch === "'" && !inDQuote && (c === 0 || lineText[c - 1] !== "\\")) {
          inSQuote = !inSQuote;
        }
      }
      if (inDQuote) {
        diagnostics.push({
          line: l + 1,
          column: lineText.lastIndexOf('"') + 1,
          severity: "error",
          message: `Cadena de texto sin cerrar con comillas dobles (") en la línea ${l + 1}.`,
          rule: "unclosed-string",
        });
      }
      if (inSQuote) {
        diagnostics.push({
          line: l + 1,
          column: lineText.lastIndexOf("'") + 1,
          severity: "error",
          message: `Cadena de texto sin cerrar con comilla simple (') en la línea ${l + 1}.`,
          rule: "unclosed-string",
        });
      }
    }
  }

  // Pre-scan tokens for asset loaders (DIV Games Studio requirement)
  let hasLoadFpg = false;
  let hasLoadFnt = false;
  let hasLoadSnd = false;
  for (let i = 0; i < tokens.length; i++) {
    const val = tokens[i].value.toLowerCase();
    if (val === "load_fpg" || val === "load_map") {
      hasLoadFpg = true;
    }
    if (val === "load_fnt") {
      hasLoadFnt = true;
    }
    if (
      val === "load_wav" ||
      val === "load_snd" ||
      val === "load_pcm" ||
      val === "load_song" ||
      val === "load_mod"
    ) {
      hasLoadSnd = true;
    }
  }

  // Parentheses tracker per line
  let parenDepth = 0;
  const openParenStack: { line: number; column: number }[] = [];

  // Block opener stack: tracks exact line where each block begins
  interface OpenBlock {
    keyword: string;
    line: number;
    column: number;
  }
  const blockStack: OpenBlock[] = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];

    // Check missing load_fnt for write / write_int / write_string (only if font is explicitly not 0)
    if (
      t.type === TokenType.IDENTIFIER &&
      ["write", "write_int", "write_string"].includes(t.value.toLowerCase())
    ) {
      // In DIV Games Studio, font 0 is the built-in system font and does not require load_fnt.
      // We allow write(0, ...) or write(...) without forcing load_fnt.
    }

    // In DIV Games Studio, sound(id, volume, frequency) is completely valid both with
    // loaded sound IDs (load_wav/load_snd/load_pcm) and with direct synthesized effect channels (1..12).
    // No error or warning is emitted for standalone sound(...) calls.

    // Check missing load_fpg for graph assignments
    if (
      t.type === TokenType.IDENTIFIER &&
      t.value.toLowerCase() === "graph"
    ) {
      const next = tokens[idx + 1];
      if (next && next.value === "=") {
        const valToken = tokens[idx + 2];
        const isZero = valToken && valToken.value === "0" && tokens[idx + 3]?.value === ";";
        if (!isZero && !hasLoadFpg) {
          diagnostics.push({
            line: t.line,
            column: t.column,
            severity: "error",
            message: `Error de compilación: Se asigna un gráfico ('graph = ...') en la línea ${t.line} sin haber cargado ningún fichero de sprites con 'load_fpg(...)'. En DIV Games Studio es obligatorio cargar el archivo FPG antes de asignar gráficos a los procesos.`,
            rule: "missing-load-fpg",
          });
        }
      }
    }

    // Parentheses matching
    if (t.type === TokenType.PUNCTUATION) {
      if (t.value === "(") {
        parenDepth++;
        openParenStack.push({ line: t.line, column: t.column });
      } else if (t.value === ")") {
        if (parenDepth > 0) {
          parenDepth--;
          openParenStack.pop();
        } else {
          diagnostics.push({
            line: t.line,
            column: t.column,
            severity: "error",
            message: `Paréntesis de cierre ')' inesperado sin apertura previa en línea ${t.line}.`,
            rule: "unmatched-paren",
          });
        }
      }
    }

    if (t.type === TokenType.KEYWORD) {
      const up = t.value.toUpperCase();

      // Block openers that terminate with END
      if (["BEGIN", "LOOP", "WHILE", "FOR", "IF", "SWITCH"].includes(up)) {
        blockStack.push({ keyword: up, line: t.line, column: t.column });
      } else if (up === "REPEAT") {
        blockStack.push({ keyword: "REPEAT", line: t.line, column: t.column });
      } else if (up === "END") {
        if (blockStack.length === 0) {
          diagnostics.push({
            line: t.line,
            column: t.column,
            severity: "error",
            message: `'END' inesperado en la línea ${t.line}: no hay bloque abierto (BEGIN, LOOP, WHILE, FOR, IF) para cerrar.`,
            rule: "extra-end",
          });
        } else {
          const top = blockStack[blockStack.length - 1];
          if (top.keyword === "REPEAT") {
            diagnostics.push({
              line: t.line,
              column: t.column,
              severity: "error",
              message: `Se esperaba 'UNTIL' para cerrar el bloque 'REPEAT' de la línea ${top.line}, no 'END'.`,
              rule: "repeat-needs-until",
            });
            blockStack.pop();
          } else {
            blockStack.pop();
          }
        }
      } else if (up === "UNTIL") {
        // Find nearest REPEAT in stack
        let repeatIdx = -1;
        for (let s = blockStack.length - 1; s >= 0; s--) {
          if (blockStack[s].keyword === "REPEAT") {
            repeatIdx = s;
            break;
          }
        }
        if (repeatIdx === -1) {
          diagnostics.push({
            line: t.line,
            column: t.column,
            severity: "error",
            message: `'UNTIL' inesperado en la línea ${t.line}: no hay bloque 'REPEAT' correspondiente.`,
            rule: "unmatched-until",
          });
        } else {
          // Remove from stack
          blockStack.splice(repeatIdx, 1);
        }
      }

      // Check FRAME; semicolon
      if (up === "FRAME") {
        const next = tokens[idx + 1];
        if (!next || (next.value !== ";" && next.value !== "(")) {
          diagnostics.push({
            line: t.line,
            column: t.column,
            severity: "error",
            message: `La instrucción 'FRAME' en la línea ${t.line} debe terminar con punto y coma ';' o '(porcentaje);'.`,
            rule: "frame-semicolon",
          });
        }
      }

      // Check PROCESS declaration
      if (up === "PROCESS") {
        const procNameToken = tokens[idx + 1];
        if (!procNameToken || procNameToken.type !== TokenType.IDENTIFIER) {
          diagnostics.push({
            line: t.line,
            column: t.column,
            severity: "error",
            message: `Se esperaba el nombre del proceso tras la palabra clave 'PROCESS' en la línea ${t.line}.`,
            rule: "process-name",
          });
        }
      }
    }
  }

  // Check unclosed parentheses
  for (const unclosedParen of openParenStack) {
    diagnostics.push({
      line: unclosedParen.line,
      column: unclosedParen.column,
      severity: "error",
      message: `Paréntesis '(' sin cerrar iniciado en la línea ${unclosedParen.line}.`,
      rule: "unclosed-paren",
    });
  }

  // Report all unclosed blocks on their EXACT opening lines
  for (const unclosed of blockStack) {
    diagnostics.push({
      line: unclosed.line,
      column: unclosed.column,
      severity: "error",
      message: `Bloque '${unclosed.keyword}' iniciado en la línea ${unclosed.line} no ha sido cerrado con '${unclosed.keyword === "REPEAT" ? "UNTIL" : "END"}'.`,
      rule: "unclosed-block",
    });
  }

  // Sort diagnostics by line number ascending
  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);

  return diagnostics;
}

/**
 * Extracts declared processes from DIV code
 */
export function extractProcesses(code: string): Array<{ name: string; params: string[]; line: number }> {
  const processes: Array<{ name: string; params: string[]; line: number }> = [];
  const tokens = tokenizeDiv(code);

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === TokenType.KEYWORD && tokens[i].value.toUpperCase() === "PROCESS") {
      const nameTok = tokens[i + 1];
      if (nameTok && nameTok.type === TokenType.IDENTIFIER) {
        const params: string[] = [];
        let j = i + 2;
        if (tokens[j] && tokens[j].value === "(") {
          j++;
          while (j < tokens.length && tokens[j].value !== ")") {
            if (tokens[j].type === TokenType.IDENTIFIER) {
              params.push(tokens[j].value);
            }
            j++;
          }
        }
        processes.push({
          name: nameTok.value,
          params,
          line: nameTok.line,
        });
      }
    }
  }

  return processes;
}
