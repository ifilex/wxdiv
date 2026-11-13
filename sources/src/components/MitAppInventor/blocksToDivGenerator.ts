import { BlockInstance } from "./types";
import { TextBlockLogic } from "./TextBlockLogic";

/**
 * Convierte el grafo completo de bloques MIT App Inventor (Blockly) en código fuente nativo de DIV Games Studio.
 * Soporta de forma exhaustiva la construcción y generación de datos para:
 * 1. Declaraciones de Texto (STRING) y funciones de texto
 * 2. Declaraciones de Listas / Vectores (ARRAY / TABLE)
 * 3. Declaraciones de Diccionarios y Estructuras (STRUCT)
 * 4. Declaraciones de Colores (RGB nativo de DIV)
 * 5. Variables Globales, Inicializaciones de Pantalla y Procesos
 */
export function generateDivCodeFromBlocks(blocks: BlockInstance[]): string {
  if (!blocks || blocks.length === 0) {
    return `PROGRAM mi_juego_div;
GLOBAL
  score = 0;
  lives = 3;
BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(10, 20, 30));
  player(320, 400);
  LOOP
    FRAME;
  END
END

PROCESS player(x, y)
BEGIN
  graph = 1;
  LOOP
    IF (key(_left)) x -= 4; END
    IF (key(_right)) x += 4; END
    FRAME;
  END
END
`;
  }

  const lines: string[] = [
    `// =========================================================================`,
    `// CÓDIGO FUENTE DIV GAMES STUDIO - SINCRONIZADO DESDE MIT APP INVENTOR`,
    `// =========================================================================`,
  ];

  // 1. Nombre del programa desde el bloque Screen1.Initialize o título
  const initBlock = blocks.find((b) => b.id === "screen_initialize_block" || b.title.includes("Initialize"));
  const programName = (initBlock?.subtitle || "app_inventor_project").replace(/[^a-zA-Z0-9_]/g, "_");
  lines.push(`PROGRAM ${programName};`);
  lines.push(``);

  // =========================================================================
  // 2. ESTRUCTURAS Y DICCIONARIOS (STRUCT ... END)
  // =========================================================================
  const dictBlocks = blocks.filter(
    (b) =>
      b.category === "Dictionaries" ||
      b.dataStructureType === "dictionary" ||
      (b.category === "Variables" && (b.title.includes("dict") || Array.isArray(b.dictPairs)))
  );

  const declaredStructNames = new Set<string>();

  if (dictBlocks.length > 0) {
    lines.push(`// =========================================================================`);
    lines.push(`// DECLARACIONES DE ESTRUCTURAS / DICCIONARIOS (MIT APP INVENTOR -> STRUCT)`);
    lines.push(`// =========================================================================`);

    dictBlocks.forEach((db, i) => {
      let structName = db.varName;
      if (!structName) {
        if (db.category === "Variables") {
          structName = db.title.replace("initialize global", "").replace("to", "").trim();
        } else {
          structName = `dict_registro_${i + 1}`;
        }
      }
      structName = structName.replace(/[^a-zA-Z0-9_]/g, "_") || `dict_registro_${i + 1}`;

      if (declaredStructNames.has(structName)) return;
      declaredStructNames.add(structName);

      lines.push(`STRUCT ${structName}`);
      const pairs = db.dictPairs ||
        (db.fields?.pairs as Array<{ key: string; value: string }>) || [
          { key: "hp", value: "100" },
          { key: "mp", value: "50" },
          { key: "nombre", value: '"Heroe"' },
        ];

      pairs.forEach((p) => {
        const k = (p.key || "prop").replace(/[^a-zA-Z0-9_]/g, "_");
        const v = p.value || "0";
        lines.push(`  ${k} = ${v};`);
      });
      lines.push(`END`);
      lines.push(``);
    });
  }

  // =========================================================================
  // 3. VARIABLES GLOBALES (TEXTO, LISTAS, COLORES, VARIABLES REGULARES)
  // =========================================================================
  lines.push(`GLOBAL`);

  // 3.1. Text Declarations (STRING var = "...")
  const textBlocks = blocks.filter(
    (b) =>
      b.category === "Text" ||
      b.dataStructureType === "text" ||
      (b.category === "Variables" && (b.title.includes("text") || typeof b.fields?.text === "string"))
  );

  const declaredTextVars = new Set<string>();
  if (textBlocks.length > 0) {
    lines.push(`  // --- Declaraciones de Texto ---`);
    textBlocks.forEach((tb, i) => {
      let varName = tb.varName;
      if (!varName) {
        if (tb.category === "Variables") {
          varName = tb.title.replace("initialize global", "").replace("to", "").trim();
        } else {
          varName = `texto_mensaje_${i + 1}`;
        }
      }
      varName = varName.replace(/[^a-zA-Z0-9_]/g, "_") || `texto_mensaje_${i + 1}`;

      if (declaredTextVars.has(varName)) return;
      declaredTextVars.add(varName);

      let textContent = tb.fields?.text || tb.fields?.value || "";
      if (!textContent && tb.inlineValues && tb.inlineValues[0]?.value) {
        textContent = tb.inlineValues[0].value;
      }
      if (!textContent) {
        textContent = "Texto MIT App Inventor";
      }
      lines.push(`  ${TextBlockLogic.serializeToDivGlobal(varName, textContent)}`);
    });
  }

  // 3.2. List Declarations (var[N] = item1, item2, ...)
  const listBlocks = blocks.filter(
    (b) =>
      b.category === "Lists" ||
      b.dataStructureType === "list" ||
      (b.category === "Variables" && (b.title.includes("list") || Array.isArray(b.listItems)))
  );

  const declaredListVars = new Set<string>();
  if (listBlocks.length > 0) {
    lines.push(`  // --- Declaraciones de Listas / Vectores ---`);
    listBlocks.forEach((lb, i) => {
      let varName = lb.varName;
      if (!varName) {
        if (lb.category === "Variables") {
          varName = lb.title.replace("initialize global", "").replace("to", "").trim();
        } else {
          varName = `lista_items_${i + 1}`;
        }
      }
      varName = varName.replace(/[^a-zA-Z0-9_]/g, "_") || `lista_items_${i + 1}`;

      if (declaredListVars.has(varName)) return;
      declaredListVars.add(varName);

      const items = lb.listItems ||
        (lb.fields?.items as string[]) || ["Espada", "Escudo", "Pocion"];
      const count = Math.max(1, items.length);
      const formattedItems = items
        .map((it) => (isNaN(Number(it)) ? `"${it.replace(/^["']|["']$/g, "")}"` : it))
        .join(", ");
      lines.push(`  ${varName}[${count}] = ${formattedItems};`);
    });
  }

  // 3.3. Color Declarations (var = rgb(r, g, b))
  const colorBlocks = blocks.filter(
    (b) =>
      b.category === "Colors" ||
      b.dataStructureType === "color" ||
      (b.category === "Variables" && (b.title.includes("color") || b.colorHex))
  );

  const declaredColorVars = new Set<string>();
  if (colorBlocks.length > 0) {
    lines.push(`  // --- Declaraciones de Colores (RGB) ---`);
    colorBlocks.forEach((cb, i) => {
      let varName = cb.varName;
      if (!varName) {
        if (cb.category === "Variables") {
          varName = cb.title.replace("initialize global", "").replace("to", "").trim();
        } else {
          varName = `color_paleta_${i + 1}`;
        }
      }
      varName = varName.replace(/[^a-zA-Z0-9_]/g, "_") || `color_paleta_${i + 1}`;

      if (declaredColorVars.has(varName)) return;
      declaredColorVars.add(varName);

      let rgbString = "rgb(234, 67, 53)";
      if (cb.colorRgb) {
        rgbString = `rgb(${cb.colorRgb.r}, ${cb.colorRgb.g}, ${cb.colorRgb.b})`;
      } else if (cb.colorHex) {
        const clean = cb.colorHex.replace("#", "");
        const num = parseInt(clean, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        rgbString = `rgb(${isNaN(r) ? 200 : r}, ${isNaN(g) ? 200 : g}, ${isNaN(b) ? 200 : b})`;
      } else if (cb.fields?.color) {
        rgbString = String(cb.fields.color);
      }
      lines.push(`  ${varName} = ${rgbString};`);
    });
  }

  // 3.4. Regular Global Variables
  const otherGlobalVars = blocks.filter(
    (b) =>
      b.category === "Variables" &&
      b.title.includes("global") &&
      !declaredTextVars.has(b.title.replace("initialize global", "").replace("to", "").trim()) &&
      !declaredListVars.has(b.title.replace("initialize global", "").replace("to", "").trim()) &&
      !declaredStructNames.has(b.title.replace("initialize global", "").replace("to", "").trim()) &&
      !declaredColorVars.has(b.title.replace("initialize global", "").replace("to", "").trim())
  );

  if (otherGlobalVars.length > 0) {
    lines.push(`  // --- Variables Globales Generales ---`);
    otherGlobalVars.forEach((b) => {
      const varName = b.title.replace("initialize global", "").replace("to", "").trim().replace(/[^a-zA-Z0-9_]/g, "_");
      const val = b.fields?.value || (b.inlineValues && b.inlineValues[0]?.value) || "0";
      lines.push(`  ${varName} = ${val};`);
    });
  } else if (declaredTextVars.size === 0 && declaredListVars.size === 0 && declaredColorVars.size === 0 && declaredStructNames.size === 0) {
    lines.push(`  score = 0;`);
    lines.push(`  lives = 3;`);
  }

  lines.push(`END`);
  lines.push(``);

  // =========================================================================
  // 4. BLOQUE PRINCIPAL BEGIN ... LOOP ... END
  // =========================================================================
  lines.push(`BEGIN`);
  if (initBlock && initBlock.subStatements && initBlock.subStatements.length > 0) {
    initBlock.subStatements.forEach((sub) => {
      if (sub.originalDivSnippet) {
        lines.push(`  ${sub.originalDivSnippet.trim()}`);
      } else {
        const cleanTitle = sub.title.replace(/^call\s+Canvas1\s*\.\s*/, "").replace(/^set\s+Screen1\s*\.\s*/, "");
        lines.push(`  ${cleanTitle};`);
      }
    });
  } else {
    lines.push(`  set_mode(m640x480);`);
    lines.push(`  set_fps(60);`);
    lines.push(`  screen_color(rgb(12, 18, 32));`);
  }

  lines.push(`  LOOP`);
  lines.push(`    FRAME;`);
  lines.push(`  END`);
  lines.push(`END`);
  lines.push(``);

  // =========================================================================
  // 5. PROCESOS (PROCEDURES / HAT BLOCKS)
  // =========================================================================
  const procBlocks = blocks.filter(
    (b) => b.shape === "procedure" || (b.category === "Procedures" && b.shape !== "value")
  );

  procBlocks.forEach((pb) => {
    const rawTitle = pb.title;
    let procName = pb.fields?.name || "proceso";
    let params = pb.fields?.params || "";

    if (rawTitle.includes("to process")) {
      const pMatch = rawTitle.match(/to process\s+([a-zA-Z0-9_]+)(?:\s*\(([^)]*)\))?/i);
      if (pMatch) {
        procName = pMatch[1];
        params = pMatch[2] || params;
      }
    } else if (rawTitle.includes("to ")) {
      const pMatch = rawTitle.match(/to\s+([a-zA-Z0-9_]+)(?:\s*\(([^)]*)\))?/i);
      if (pMatch) {
        procName = pMatch[1];
        params = pMatch[2] || params;
      }
    }

    lines.push(`// Bloque MIT App Inventor: ${rawTitle}`);
    lines.push(`PROCESS ${procName}(${params})`);
    lines.push(`BEGIN`);

    let loopStarted = false;

    if (pb.subStatements && pb.subStatements.length > 0) {
      pb.subStatements.forEach((sub) => {
        if (sub.originalDivSnippet) {
          const raw = sub.originalDivSnippet.trim();
          if (raw.startsWith("LOOP")) {
            lines.push(`  LOOP`);
            loopStarted = true;
          } else if (raw === "FRAME;") {
            if (!loopStarted) {
              lines.push(`  LOOP`);
              loopStarted = true;
            }
            lines.push(`    FRAME;`);
          } else {
            lines.push(`  ${raw}`);
          }
        } else {
          // Generar código según el título del bloque
          if (sub.title.includes("key")) {
            if (!loopStarted) {
              lines.push(`  LOOP`);
              loopStarted = true;
            }
            lines.push(`    IF (${sub.title.replace(/^if\s+call\s+/, "").replace(/\s+then$/, "")})`);
            lines.push(`      x += 4;`);
            lines.push(`    END`);
          } else if (sub.title.includes("MoveTo")) {
            lines.push(`    x += 4;`);
          } else if (sub.title.includes("CollidedWith")) {
            lines.push(`    // Detección de colisión`);
            lines.push(`    IF (collision(type other)) signal(id, s_kill); END`);
          } else {
            lines.push(`    // ${sub.title}`);
          }
        }
      });
    } else {
      lines.push(`  graph = 1;`);
      lines.push(`  size = 100;`);
      lines.push(`  LOOP`);
      lines.push(`    FRAME;`);
      lines.push(`  END`);
    }

    if (!loopStarted) {
      lines.push(`  LOOP`);
      lines.push(`    FRAME;`);
      lines.push(`  END`);
    }

    lines.push(`END`);
    lines.push(``);
  });

  return lines.join("\n");
}
