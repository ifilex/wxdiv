import { BlockInstance, BlockCategory } from "./types";

/**
 * Convierte TODO el código DIV Games Studio en bloques MIT App Inventor (Blockly)
 * Analiza de forma exhaustiva: PROGRAM, GLOBAL, LOCAL, CONST, BEGIN..END principal y todos los PROCESS.
 */
export function parseDivToAppInventorBlocks(code: string): BlockInstance[] {
  if (!code || code.trim().length === 0) {
    return [];
  }

  const blocks: BlockInstance[] = [];

  // Extraer nombre del programa
  const programMatch = code.match(/PROGRAM\s+([a-zA-Z0-9_]+)/i);
  const programName = programMatch ? programMatch[1] : "juego_div";

  let col1Y = 50;
  let col2Y = 50;
  let col3Y = 50;

  // 1. BLOQUE PRINCIPAL: when Screen1.Initialize do (o PROGRAM)
  const initSubStatements: BlockInstance[] = [];

  // Analizar bloque principal BEGIN ... END antes de los PROCESS
  const mainBlockMatch = code.match(/BEGIN([\s\S]*?)(?:PROCESS|\n\s*END\s*;\s*\n|\n\s*END\s*\n\s*PROCESS|$)/i);
  if (mainBlockMatch) {
    const mainBody = mainBlockMatch[1];
    const lines = mainBody.split("\n");

    lines.forEach((line) => {
      const trimmed = line.trim().replace(/;$/, "");
      if (!trimmed || trimmed.startsWith("//") || trimmed === "FRAME" || trimmed === "LOOP" || trimmed === "END") return;

      if (trimmed.includes("set_mode")) {
        const modeMatch = trimmed.match(/set_mode\(([^)]*)\)/);
        initSubStatements.push({
          id: `mode_${Date.now()}_${Math.random()}`,
          type: "component_call",
          category: "ComponentCall",
          shape: "command",
          color: "#7b3da1",
          title: `call Canvas1 . SetMode (${modeMatch ? modeMatch[1] : "m640x480"})`,
          x: 0,
          y: 0,
          inputs: [],
          fields: {},
          originalDivSnippet: trimmed + ";",
        });
      } else if (trimmed.includes("set_fps")) {
        const fpsMatch = trimmed.match(/set_fps\(([^)]*)\)/);
        initSubStatements.push({
          id: `fps_${Date.now()}_${Math.random()}`,
          type: "component_setter",
          category: "ComponentSetter",
          shape: "command",
          color: "#367732",
          title: `set Clock1 . TimerInterval to (${fpsMatch ? fpsMatch[1] : "60"} FPS)`,
          x: 0,
          y: 0,
          inputs: [],
          fields: {},
          originalDivSnippet: trimmed + ";",
        });
      } else if (trimmed.includes("screen_color")) {
        initSubStatements.push({
          id: `color_${Date.now()}_${Math.random()}`,
          type: "component_setter",
          category: "ComponentSetter",
          shape: "command",
          color: "#367732",
          title: `set Screen1 . BackgroundColor`,
          x: 0,
          y: 0,
          inputs: [],
          fields: {},
          originalDivSnippet: trimmed + ";",
        });
      } else if (trimmed.includes("(") && !trimmed.startsWith("IF")) {
        // Invocación a proceso inicial (ej. player(320, 400))
        initSubStatements.push({
          id: `call_init_${Date.now()}_${Math.random()}`,
          type: "component_call",
          category: "ComponentCall",
          shape: "command",
          color: "#7b3da1",
          title: `call ${trimmed}`,
          x: 0,
          y: 0,
          inputs: [],
          fields: {},
          originalDivSnippet: trimmed + ";",
        });
      }
    });
  }

  // Agregar el bloque inicial Screen1.Initialize
  blocks.push({
    id: "screen_initialize_block",
    type: "component_event",
    category: "ComponentEvent",
    shape: "hat",
    color: "#caa128",
    title: `when Screen1 . Initialize do`,
    subtitle: programName,
    x: 40,
    y: col1Y,
    inputs: [{ id: "do", name: "do", type: "statement" }],
    subStatements: initSubStatements,
    fields: {},
  });

  col1Y += 50 + (initSubStatements.length * 34) + 30;

  // 2. PARSEAR ESTRUCTURAS / DICCIONARIOS: STRUCT [nombre] ... END
  const structRegex = /STRUCT\s+([a-zA-Z0-9_]+)([\s\S]*?)END/gi;
  let structMatch: RegExpExecArray | null;
  while ((structMatch = structRegex.exec(code)) !== null) {
    const structName = structMatch[1];
    const structBody = structMatch[2];
    const pairs: Array<{ key: string; value: string }> = [];

    structBody.split("\n").forEach((sLine) => {
      const sTrim = sLine.trim().replace(/;$/, "");
      if (!sTrim || sTrim.startsWith("//") || !sTrim.includes("=")) return;
      const [k, v] = sTrim.split("=").map((x) => x.trim());
      if (k && v !== undefined) {
        pairs.push({ key: k, value: v });
      }
    });

    blocks.push({
      id: `dict_struct_${structName}`,
      type: "dictionary_struct_init",
      category: "Dictionaries",
      shape: "command",
      color: "#455a64",
      title: `make a dictionary [${structName}]`,
      subtitle: `{${pairs.slice(0, 2).map((p) => p.key).join(", ")}${pairs.length > 2 ? "..." : ""}}`,
      x: 40,
      y: col1Y,
      varName: structName,
      dataStructureType: "dictionary",
      dictPairs: pairs,
      fields: { pairs, value: `{${pairs.map((p) => `${p.key}: ${p.value}`).join(", ")}}` },
      inlineValues: [{ label: "dict", value: `${pairs.length} pares`, color: "#455a64" }],
      inputs: [],
    });
    col1Y += 50;
  }

  // 3. PARSEAR VARIABLES GLOBALES: initialize global [nombre] to [valor]
  const globalMatch = code.match(/GLOBAL([\s\S]*?)(?:BEGIN|LOCAL|PRIVATE|PROCESS)/i);
  if (globalMatch && globalMatch[1]) {
    const rawVars = globalMatch[1].split(";");
    rawVars.forEach((vStr) => {
      const clean = vStr.trim();
      if (!clean || clean.startsWith("//")) return;

      // 3.1. Detectar declaraciones de texto explícitas (STRING var = "...")
      if (/^STRING\s+/i.test(clean)) {
        const withoutType = clean.replace(/^STRING\s+/i, "");
        const [varName, rawVal] = withoutType.split("=").map((s) => s.trim());
        const textVal = (rawVal || '""').replace(/^["']|["']$/g, "");
        if (varName) {
          blocks.push({
            id: `glob_text_${varName}`,
            type: "variables_text_init",
            category: "Text",
            shape: "command",
            color: "#c44078",
            title: `initialize global ${varName} to`,
            subtitle: `"${textVal.substring(0, 15)}"`,
            x: 40,
            y: col1Y,
            varName,
            dataStructureType: "text",
            fields: { text: textVal, value: `"${textVal}"` },
            inlineValues: [{ label: "str", value: `"${textVal}"`, color: "#c44078" }],
            inputs: [],
          });
          col1Y += 46;
          return;
        }
      }

      // 3.2. Detectar declaraciones de array / lista (var[N] = a, b, c)
      const arrayMatch = clean.match(/^([a-zA-Z0-9_]+)\s*\[(\d*)\]\s*=\s*([\s\S]+)/);
      if (arrayMatch) {
        const varName = arrayMatch[1];
        const rawItems = arrayMatch[3].split(",").map((it) => it.trim().replace(/^["']|["']$/g, ""));
        blocks.push({
          id: `glob_list_${varName}`,
          type: "variables_list_init",
          category: "Lists",
          shape: "command",
          color: "#49a6cb",
          title: `initialize global ${varName} to`,
          subtitle: `[${rawItems.slice(0, 2).join(", ")}]`,
          x: 40,
          y: col1Y,
          varName,
          dataStructureType: "list",
          listItems: rawItems,
          fields: { items: rawItems, value: `[${rawItems.join(", ")}]` },
          inlineValues: [{ label: `list[${rawItems.length}]`, value: rawItems.slice(0, 3).join(", "), color: "#49a6cb" }],
          inputs: [],
        });
        col1Y += 46;
        return;
      }

      // 3.3. Detectar declaraciones de color RGB (var = rgb(r, g, b))
      const rgbMatch = clean.match(/^([a-zA-Z0-9_]+)\s*=\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      if (rgbMatch) {
        const varName = rgbMatch[1];
        const r = parseInt(rgbMatch[2], 10) || 0;
        const g = parseInt(rgbMatch[3], 10) || 0;
        const b = parseInt(rgbMatch[4], 10) || 0;
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        blocks.push({
          id: `glob_color_${varName}`,
          type: "variables_color_init",
          category: "Colors",
          shape: "command",
          color: "#8492a6",
          title: `initialize global ${varName} to`,
          subtitle: `rgb(${r}, ${g}, ${b})`,
          x: 40,
          y: col1Y,
          varName,
          dataStructureType: "color",
          colorHex: hex,
          colorRgb: { r, g, b },
          fields: { color: hex, value: `rgb(${r}, ${g}, ${b})` },
          inlineValues: [{ label: "rgb", value: `${r},${g},${b}`, color: hex }],
          inputs: [],
        });
        col1Y += 46;
        return;
      }

      // 3.4. Variable general normal
      const parts = clean.split("=");
      const varName = parts[0].trim();
      const initialVal = parts.length > 1 ? parts[1].trim() : "0";

      if (varName && !varName.includes(" ") && !varName.includes("\n")) {
        blocks.push({
          id: `glob_var_${varName}`,
          type: "variables_global_init",
          category: "Variables",
          shape: "command",
          color: "#d35400",
          title: `initialize global ${varName} to`,
          x: 40,
          y: col1Y,
          fields: { value: initialVal },
          inlineValues: [{ label: "val", value: initialVal, color: "#3f71c4" }],
          inputs: [],
          originalDivSnippet: `  ${varName} = ${initialVal};`,
        });
        col1Y += 46;
      }
    });
  }

  // 3. PARSEAR TODOS LOS PROCESS
  const processRegex = /PROCESS\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)([\s\S]*?)END(?:\s*;|\s+END|\s*\n\s*PROCESS|\s*$)/gi;
  let match: RegExpExecArray | null;
  let procIndex = 0;

  while ((match = processRegex.exec(code)) !== null) {
    const procName = match[1];
    const rawParams = match[2].trim();
    const procBody = match[3];

    const subStatements: BlockInstance[] = [];

    // Parsear líneas internas del PROCESS
    const bodyLines = procBody.split("\n");
    let inLoop = false;

    bodyLines.forEach((line) => {
      const trimmed = line.trim().replace(/;$/, "");
      if (!trimmed || trimmed.startsWith("//") || trimmed === "BEGIN" || trimmed === "END" || trimmed === "FRAME") return;

      if (trimmed.startsWith("LOOP")) {
        inLoop = true;
        return;
      }

      // 1. Asignaciones de propiedades (graph, size, flags, x, y, speed, etc.)
      if (trimmed.includes("=") && !trimmed.startsWith("IF") && !trimmed.startsWith("WHILE") && !trimmed.includes("==")) {
        const [left, right] = trimmed.split("=").map((s) => s.trim());
        const isCompProp = ["graph", "size", "flags", "x", "y", "angle", "alpha"].includes(left);

        subStatements.push({
          id: `assign_${Date.now()}_${Math.random()}`,
          type: isCompProp ? "component_setter" : "variables_set",
          category: isCompProp ? "ComponentSetter" : "Variables",
          shape: "command",
          color: isCompProp ? "#367732" : "#d35400",
          title: `set ${isCompProp ? `${procName}.${left}` : left} to`,
          x: 0,
          y: 0,
          inputs: [],
          fields: { val: right },
          inlineValues: [{ label: left, value: right, color: isCompProp ? "#4a8b43" : "#3f71c4" }],
          originalDivSnippet: `    ${trimmed};`,
        });
      }
      // 2. Condicionales IF (key, collision, etc.)
      else if (trimmed.startsWith("IF")) {
        const ifConditionMatch = trimmed.match(/IF\s*\(([^)]+)\)/i);
        const cond = ifConditionMatch ? ifConditionMatch[1] : "true";

        let ifColor = "#e59b20";
        let ifTitle = `if (${cond}) then`;

        if (cond.includes("key(")) {
          ifTitle = `if call key (${cond.replace(/key\(|\)/g, "")}) then`;
        } else if (cond.includes("collision(")) {
          ifTitle = `when ${procName} . CollidedWith (${cond.replace(/collision\(|\)|type/g, "").trim()}) do`;
          ifColor = "#caa128";
        }

        subStatements.push({
          id: `if_${Date.now()}_${Math.random()}`,
          type: "control_if",
          category: "Control",
          shape: "c-block",
          color: ifColor,
          title: ifTitle,
          x: 0,
          y: 0,
          inputs: [],
          fields: {},
          originalDivSnippet: `    ${trimmed};`,
        });
      }
      // 3. Incrementos o decrementos (x += speed, x -= speed, cooldown--)
      else if (trimmed.includes("+=") || trimmed.includes("-=") || trimmed.includes("++") || trimmed.includes("--")) {
        subStatements.push({
          id: `math_step_${Date.now()}_${Math.random()}`,
          type: "component_setter",
          category: "ComponentSetter",
          shape: "command",
          color: "#367732",
          title: `set ${procName} step (${trimmed})`,
          x: 0,
          y: 0,
          inputs: [],
          fields: {},
          inlineValues: [{ label: "operación", value: trimmed, color: "#3f71c4" }],
          originalDivSnippet: `    ${trimmed};`,
        });
      }
      // 4. Invocaciones a funciones (sound, write, signal, advance, etc.)
      else if (trimmed.includes("(")) {
        let callColor = "#7b3da1";
        if (trimmed.includes("sound")) callColor = "#c44078";
        if (trimmed.includes("write")) callColor = "#49a6cb";

        subStatements.push({
          id: `call_${Date.now()}_${Math.random()}`,
          type: "component_call",
          category: "ComponentCall",
          shape: "command",
          color: callColor,
          title: `call ${trimmed}`,
          x: 0,
          y: 0,
          inputs: [],
          fields: {},
          originalDivSnippet: `    ${trimmed};`,
        });
      }
    });

    // Añadir siempre yield_frame si hay bucle
    if (inLoop || procBody.includes("FRAME")) {
      subStatements.push({
        id: `frame_${Date.now()}_${Math.random()}`,
        type: "component_call",
        category: "Control",
        shape: "command",
        color: "#5da048",
        title: "call yield_frame (FRAME)",
        x: 0,
        y: 0,
        inputs: [],
        fields: {},
        originalDivSnippet: "    FRAME;",
      });
    }

    // Ubicar los procesos en columnas limpias para evitar cualquier solapamiento
    const targetCol = procIndex % 2 === 0 ? 2 : 3;
    const posX = targetCol === 2 ? 460 : 880;
    const posY = targetCol === 2 ? col2Y : col3Y;

    blocks.push({
      id: `proc_block_${procName}`,
      type: "procedure_defnoreturn",
      category: "Procedures",
      shape: "procedure",
      color: "#7b3da1",
      title: `to process ${procName} ${rawParams ? `(${rawParams})` : "()"}`,
      subtitle: rawParams || "do",
      x: posX,
      y: posY,
      inputs: [{ id: "do", name: "do", type: "statement" }],
      subStatements,
      fields: { name: procName, params: rawParams },
      originalDivSnippet: `PROCESS ${procName}(${rawParams})`,
    });

    const addedHeight = 60 + (subStatements.length * 34) + 40;
    if (targetCol === 2) {
      col2Y += addedHeight;
    } else {
      col3Y += addedHeight;
    }

    procIndex++;
  }

  return blocks;
}
