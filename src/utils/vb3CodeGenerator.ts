import { VB3Form, VB3Control } from "../components/VB3/types";
import { DivRuntime } from "../engine/runtime";

/**
 * Genera código DIV Games Studio auténtico a partir del formulario y controles de Visual Basic 3.0.
 * Sintaxis estricta DIV: GLOBAL NO lleva END.
 */
export function generateDivCodeFromVB3(form: VB3Form): string {
  const lines: string[] = [];

  lines.push(`// ========================================================`);
  lines.push(`// PROYECTO VISUAL BASIC 3.0 / WXDIV GAMES STUDIO`);
  lines.push(`// Formulario: ${form.name}.frm`);
  lines.push(`// Generado automáticamente por el entorno MDI VB3`);
  lines.push(`// ========================================================\n`);

  // Sección GLOBAL (¡Sin END, norma DIV Games Studio!)
  lines.push(`GLOBAL`);
  lines.push(`    int ${form.name.toLowerCase()}_active = 1;`);
  lines.push(`    int ${form.name.toLowerCase()}_focus_id = 0;`);
  
  form.controls.forEach((c) => {
    const cName = c.name.toLowerCase();
    if (c.type === "textbox") {
      lines.push(`    string ${cName}_text = "${c.text || c.caption || ""}";`);
    } else if (c.type === "checkbox") {
      lines.push(`    int ${cName}_value = 0;`);
    } else if (c.type === "optionbutton") {
      lines.push(`    int ${cName}_value = 0;`);
    } else if (c.type === "hscrollbar" || c.type === "vscrollbar" || c.type === "gauge") {
      lines.push(`    int ${cName}_value = 50;`);
    } else if (c.type === "timer") {
      lines.push(`    int ${cName}_interval = ${c.interval || 1000};`);
      lines.push(`    int ${cName}_enabled = 1;`);
    }
  });
  lines.push(``); // Fin de GLOBAL sin END

  // Programa Principal
  lines.push(`PROGRAM ${form.name}_Program;`);
  lines.push(`BEGIN`);
  lines.push(`    set_mode(m640x480);`);
  lines.push(`    set_fps(60);`);
  lines.push(`    screen_color(rgb(192, 192, 192));`);
  lines.push(``);
  lines.push(`    // Inicializar evento Load`);
  lines.push(`    ${form.name.toLowerCase()}_load();`);
  lines.push(``);
  lines.push(`    // Iniciar controlador visual del formulario`);
  lines.push(`    ${form.name.toLowerCase()}_controller();`);
  lines.push(``);
  lines.push(`    LOOP`);
  lines.push(`        FRAME;`);
  lines.push(`    END`);
  lines.push(`END\n`);

  // Evento Form_Load
  lines.push(`PROCESS ${form.name.toLowerCase()}_load()`);
  lines.push(`BEGIN`);
  lines.push(`    // Precódigo inicial del formulario`);
  lines.push(`    write(0, 10, 460, 0, "${form.caption} inicializado correctamente.");`);
  lines.push(`END\n`);

  // Proceso Controlador Visual del Formulario
  lines.push(`PROCESS ${form.name.toLowerCase()}_controller()`);
  lines.push(`BEGIN`);
  lines.push(`    graph = 0;`);
  lines.push(`    LOOP`);

  form.controls.forEach((c) => {
    const cName = c.name.toLowerCase();
    switch (c.type) {
      case "commandbutton":
        lines.push(`        // Botón de comando 3D: ${c.name}`);
        lines.push(`        draw_button(${c.x}, ${c.y}, ${c.width}, ${c.height}, "${c.caption || c.name}", ${cName}_click);`);
        break;
      case "textbox":
        lines.push(`        // Campo de texto: ${c.name}`);
        lines.push(`        draw_input(${c.x}, ${c.y}, ${c.width}, ${c.height}, ${cName}_text, "${c.caption || ""}");`);
        break;
      case "label":
        lines.push(`        // Etiqueta: ${c.name}`);
        lines.push(`        write(0, ${c.x}, ${c.y + 4}, 0, "${c.caption || c.name}");`);
        break;
      case "frame":
        lines.push(`        // Marco contenedor: ${c.name}`);
        lines.push(`        draw_box(${c.x}, ${c.y}, ${c.x + c.width}, ${c.y + c.height}, "#c0c0c0");`);
        lines.push(`        write(0, ${c.x + 8}, ${c.y + 4}, 0, "${c.caption || c.name}");`);
        break;
      case "checkbox":
        lines.push(`        // Casilla de verificación: ${c.name}`);
        lines.push(`        draw_checkbox(${c.x}, ${c.y}, ${c.width}, ${c.height}, "${c.caption || c.name}", ${cName}_value, ${cName}_click);`);
        break;
      case "optionbutton":
        lines.push(`        // Botón radial: ${c.name}`);
        lines.push(`        draw_checkbox(${c.x}, ${c.y}, ${c.width}, ${c.height}, "${c.caption || c.name}", ${cName}_value, ${cName}_click);`);
        break;
      case "picturebox":
      case "image":
        lines.push(`        // Lienzo Gráfico: ${c.name}`);
        lines.push(`        draw_box(${c.x}, ${c.y}, ${c.x + c.width}, ${c.y + c.height}, "#ffffff");`);
        break;
      case "grid":
        lines.push(`        // Cuadrícula GRID.VBX: ${c.name}`);
        lines.push(`        draw_table(${c.x}, ${c.y}, ${c.width}, ${c.height}, "GRID", "Item,Estado,Valor|1,OK,100|2,DIV,200");`);
        break;
      case "webembed":
      case "ole":
        lines.push(`        // Componente Web / HTML5 Embed: ${c.name}`);
        lines.push(`        draw_box(${c.x}, ${c.y}, ${c.x + c.width}, ${c.y + c.height}, "#0d1322");`);
        lines.push(`        write(0, ${c.x + 8}, ${c.y + 6}, 0, "[HTML5] ${c.caption || c.name}");`);
        break;
      case "shape":
        lines.push(`        // Forma geométrica (${c.shapeType || "rect"}): ${c.name}`);
        lines.push(`        draw_box(${c.x}, ${c.y}, ${c.x + c.width}, ${c.y + c.height}, "${c.backColor || "#334155"}");`);
        break;
      case "line":
        lines.push(`        // Línea gráfica: ${c.name}`);
        lines.push(`        draw_box(${c.x}, ${c.y}, ${c.x + c.width}, ${c.y + 2}, "#000000");`);
        break;
      case "combobox":
      case "listbox":
        lines.push(`        // Lista / Selector: ${c.name}`);
        lines.push(`        draw_box(${c.x}, ${c.y}, ${c.x + c.width}, ${c.y + c.height}, "#ffffff");`);
        lines.push(`        write(0, ${c.x + 4}, ${c.y + 4}, 0, "${c.text || c.caption || c.name}");`);
        break;
      case "data":
        lines.push(`        // Control de Datos Database: ${c.name}`);
        lines.push(`        draw_box(${c.x}, ${c.y}, ${c.x + c.width}, ${c.y + c.height}, "#c0c0c0");`);
        lines.push(`        write(0, ${c.x + 6}, ${c.y + 6}, 0, "|◀ ◀  ${c.caption || c.name}  ▶ ▶|");`);
        break;
      case "drivelistbox":
      case "dirlistbox":
      case "filelistbox":
        lines.push(`        // Explorador de archivos: ${c.name}`);
        lines.push(`        draw_box(${c.x}, ${c.y}, ${c.x + c.width}, ${c.y + c.height}, "#ffffff");`);
        lines.push(`        write(0, ${c.x + 4}, ${c.y + 4}, 0, "📁 ${c.name}");`);
        break;
      case "gauge":
        lines.push(`        // Barra de progreso: ${c.name}`);
        lines.push(`        draw_box(${c.x}, ${c.y}, ${c.x + Math.floor(c.width * 0.6)}, ${c.y + c.height}, "#000080");`);
        break;
      default:
        lines.push(`        // Control ${c.type}: ${c.name}`);
        lines.push(`        draw_box(${c.x}, ${c.y}, ${c.x + c.width}, ${c.y + c.height}, "#e0e0e0");`);
        break;
    }
  });

  lines.push(`        FRAME;`);
  lines.push(`    END`);
  lines.push(`END\n`);

  // Procedimientos de eventos para cada control
  form.controls.forEach((c) => {
    const cName = c.name.toLowerCase();
    if (c.type === "commandbutton") {
      lines.push(`PROCESS ${cName}_click()`);
      lines.push(`BEGIN`);
      lines.push(`    // Código al pulsar ${c.name}`);
      lines.push(`    write(0, 20, 430, 0, "Evento Click: ${c.name}");`);
      lines.push(`END\n`);
    } else if (c.type === "checkbox" || c.type === "optionbutton") {
      lines.push(`PROCESS ${cName}_click()`);
      lines.push(`BEGIN`);
      lines.push(`    ${cName}_value = !${cName}_value;`);
      lines.push(`END\n`);
    } else if (c.type === "timer") {
      lines.push(`PROCESS ${cName}_timer()`);
      lines.push(`BEGIN`);
      lines.push(`    // Código periódico cada ${c.interval || 1000} ms`);
      lines.push(`END\n`);
    }
  });

  return lines.join("\n");
}

/**
 * Ejecuta en vivo el formulario en DivRuntime (GameStage) a 60 FPS.
 */
export function executeVB3FormInRuntime(runtime: DivRuntime, form: VB3Form): void {
  runtime.stop();
  runtime.reset();
  runtime.setResolution("640x480");
  runtime.set_ui_theme("vb3");
  runtime.renderOnlyOnDirty = false;
  runtime.clearScreen(form.backColor || "#c0c0c0");
  runtime.markDirty();

  // Registrar proceso controlador visual
  runtime.registerProcess(`${form.name.toLowerCase()}_controller`, function* (proc, _, rt) {
    proc.graph = 0;
    let clickNotice = "";
    let noticeTimer = 0;

    while (true) {
      // Dibujar fondo del formulario estilo Windows 3.1
      rt.drawBox(0, 0, 640, 480, form.backColor || "#c0c0c0");

      // Barra de estado inferior estilo VB3
      rt.drawBox(0, 455, 640, 480, "#d4d4d4");
      rt.drawText(0, 10, 462, 0, `${form.caption} • Ejecución Activa • WXDIV`);

      if (noticeTimer > 0) {
        rt.drawText(0, 360, 462, 0, clickNotice);
        noticeTimer--;
      }

      // Dibujar cada control en el runtime
      form.controls.forEach((c) => {
        switch (c.type) {
          case "commandbutton":
            rt.drawButton(c.x, c.y, c.width, c.height, c.caption || c.name, () => {
              clickNotice = `Click: ${c.name}`;
              noticeTimer = 90;
            });
            break;

          case "textbox":
            rt.drawInput(c.x, c.y, c.width, c.height, c.text || c.caption || "", undefined, c.caption || "");
            break;

          case "label":
            rt.drawText(0, c.x, c.y + 4, 0, c.caption || c.name);
            break;

          case "frame":
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + c.height, "#c0c0c0");
            rt.drawText(0, c.x + 8, c.y + 2, 0, c.caption || c.name);
            break;

          case "checkbox":
            rt.drawCheckbox(c.x, c.y, c.width, c.height, c.caption || c.name, true, () => {
              clickNotice = `Toggle: ${c.name}`;
              noticeTimer = 60;
            });
            break;

          case "picturebox":
          case "image":
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + c.height, "#ffffff");
            rt.drawText(0, c.x + 4, c.y + 4, 0, `[${c.name}]`);
            break;

          case "grid":
            rt.drawTable(c.x, c.y, c.width, c.height, ["Item", "Estado", "Valor"], [["1", "Activo", "100"], ["2", "DIV", "200"]]);
            break;

          case "gauge": {
            const val = typeof c.value === "number" ? Math.min(100, Math.max(0, c.value)) : 60;
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + c.height, "#ffffff");
            rt.drawBox(c.x, c.y, c.x + Math.floor((c.width * val) / 100), c.y + c.height, "#000080");
            rt.drawText(0, c.x + 4, c.y + 4, 0, `${val}%`);
            break;
          }

          case "webembed":
          case "ole":
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + c.height, "#0d1322");
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + 18, "#1e293b");
            rt.drawText(0, c.x + 4, c.y + 2, 0, `<HTML5> ${c.caption || c.name}`);
            rt.drawText(0, c.x + 6, c.y + 24, 0, "🌐 WebEmbed Canvas 2D / WebGL");
            break;

          case "shape":
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + c.height, c.backColor || "#334155");
            break;

          case "line":
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + 2, "#000000");
            break;

          case "combobox":
          case "listbox":
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + c.height, "#ffffff");
            rt.drawText(0, c.x + 4, c.y + 4, 0, c.text || c.caption || c.name);
            break;

          case "data":
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + c.height, "#c0c0c0");
            rt.drawText(0, c.x + 4, c.y + 4, 0, `|◀ ◀ ${c.caption || c.name} ▶ ▶|`);
            break;

          case "drivelistbox":
          case "dirlistbox":
          case "filelistbox":
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + c.height, "#ffffff");
            rt.drawText(0, c.x + 4, c.y + 4, 0, `📁 ${c.name}`);
            break;

          default:
            rt.drawBox(c.x, c.y, c.x + c.width, c.y + c.height, "#d0d0d0");
            rt.drawText(0, c.x + 2, c.y + 2, 0, c.name);
            break;
        }
      });

      yield;
    }
  });

  runtime.start();
}
