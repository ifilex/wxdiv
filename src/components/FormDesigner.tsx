import React, { useState, useRef, useEffect } from "react";
import {
  MousePointer,
  Square,
  Type,
  ToggleLeft,
  Sliders,
  Table as TableIcon,
  CreditCard,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  Move,
  Code2,
  Download,
  Flame,
  LayoutGrid,
  Palette,
  Maximize2,
  FolderOpen,
} from "lucide-react";
import { DivRuntime } from "../engine/runtime";
import { getAiConfig, getAiHeaders } from "../services/aiConfig";

export type ControlType =
  | "label"
  | "button"
  | "textbox"
  | "checkbox"
  | "select"
  | "table"
  | "frame"
  | "tabs";

export interface FormWidget {
  id: string;
  name: string;
  type: ControlType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  value?: string;
  options?: string[]; // for select/tabs
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  bg?: string;
  fg?: string;
  fontSize?: number;
  fontBold?: boolean;
  align?: "left" | "center" | "right";
  onClickAction?: string;
}

export interface FormDesignerProps {
  runtime: DivRuntime;
  onInsertCode: (snippet: string) => void;
  onApplyFullCode: (fullCode: string) => void;
  onRunPreview: () => void;
}

const DEFAULT_WIDGETS: FormWidget[] = [
  {
    id: "lbl_header",
    name: "Label1",
    type: "label",
    x: 24,
    y: 20,
    width: 320,
    height: 32,
    text: "Mi Primera Aplicación WXDIV",
    fontSize: 18,
    fontBold: true,
    fg: "#38bdf8",
  },
  {
    id: "card_frame",
    name: "Frame1",
    type: "frame",
    x: 20,
    y: 65,
    width: 440,
    height: 220,
    text: "Datos del Registro",
    bg: "#1e293b",
  },
  {
    id: "lbl_nombre",
    name: "Label2",
    type: "label",
    x: 40,
    y: 100,
    width: 90,
    height: 24,
    text: "Nombre:",
    fg: "#94a3b8",
  },
  {
    id: "txt_nombre",
    name: "TextNombre",
    type: "textbox",
    x: 140,
    y: 95,
    width: 280,
    height: 34,
    text: "",
    value: "Usuario Invitado",
    bg: "#0f172a",
    fg: "#f8fafc",
  },
  {
    id: "lbl_rol",
    name: "Label3",
    type: "label",
    x: 40,
    y: 145,
    width: 90,
    height: 24,
    text: "Categoría:",
    fg: "#94a3b8",
  },
  {
    id: "cmb_rol",
    name: "Combo1",
    type: "select",
    x: 140,
    y: 140,
    width: 280,
    height: 34,
    text: "Administrador",
    options: ["Administrador", "Desarrollador", "Invitado", "Operador"],
  },
  {
    id: "btn_guardar",
    name: "CommandGuardar",
    type: "button",
    x: 140,
    y: 200,
    width: 140,
    height: 38,
    text: "💾 Guardar Registro",
    variant: "primary",
    onClickAction: 'write(0, 40, 310, 0, "¡Registro guardado!");',
  },
  {
    id: "btn_limpiar",
    name: "CommandLimpiar",
    type: "button",
    x: 290,
    y: 200,
    width: 130,
    height: 38,
    text: "Limpiar",
    variant: "secondary",
    onClickAction: 'TextNombre.value = "";',
  },
];

export const FormDesigner: React.FC<FormDesignerProps> = ({
  runtime,
  onInsertCode,
  onApplyFullCode,
  onRunPreview,
}) => {
  const [widgets, setWidgets] = useState<FormWidget[]>(DEFAULT_WIDGETS);
  const [selectedId, setSelectedId] = useState<string | null>("btn_guardar");
  const [activeTool, setActiveTool] = useState<ControlType | "select">("select");
  const [formTitle, setFormTitle] = useState("Form1");
  const [formBg, setFormBg] = useState("#0f172a");
  const [resolution, setResolution] = useState<"640x480" | "800x600">("640x480");
  const [gridSnap, setGridSnap] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Dragging and resizing states
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingDir, setResizingDir] = useState<string | null>(null);

  const selectedWidget = widgets.find((w) => w.id === selectedId) || null;

  // Snap to grid helper
  const snap = (val: number) => {
    if (!gridSnap) return val;
    return Math.round(val / gridSize) * gridSize;
  };

  // Select tool or add widget on click
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = snap(Math.round(e.clientX - rect.left));
    const y = snap(Math.round(e.clientY - rect.top));

    if (activeTool !== "select") {
      // Create new widget of activeTool type
      const newId = `ctrl_${Date.now()}`;
      let newW: FormWidget;
      const baseName = activeTool.charAt(0).toUpperCase() + activeTool.slice(1);

      switch (activeTool) {
        case "button":
          newW = {
            id: newId,
            name: `Command${widgets.length + 1}`,
            type: "button",
            x,
            y,
            width: 120,
            height: 36,
            text: "Aceptar",
            variant: "primary",
          };
          break;
        case "textbox":
          newW = {
            id: newId,
            name: `Text${widgets.length + 1}`,
            type: "textbox",
            x,
            y,
            width: 180,
            height: 34,
            text: "",
            value: "Texto...",
          };
          break;
        case "label":
          newW = {
            id: newId,
            name: `Label${widgets.length + 1}`,
            type: "label",
            x,
            y,
            width: 140,
            height: 24,
            text: "Etiqueta",
            fg: "#f8fafc",
            fontSize: 14,
          };
          break;
        case "checkbox":
          newW = {
            id: newId,
            name: `Check${widgets.length + 1}`,
            type: "checkbox",
            x,
            y,
            width: 160,
            height: 28,
            text: "Habilitar opción",
            value: "true",
          };
          break;
        case "select":
          newW = {
            id: newId,
            name: `Combo${widgets.length + 1}`,
            type: "select",
            x,
            y,
            width: 160,
            height: 34,
            text: "Opción 1",
            options: ["Opción 1", "Opción 2", "Opción 3"],
          };
          break;
        case "table":
          newW = {
            id: newId,
            name: `Grid${widgets.length + 1}`,
            type: "table",
            x,
            y,
            width: 320,
            height: 160,
            text: "ID,NOMBRE,ESTADO",
          };
          break;
        case "frame":
          newW = {
            id: newId,
            name: `Frame${widgets.length + 1}`,
            type: "frame",
            x,
            y,
            width: 280,
            height: 180,
            text: "Grupo de Controles",
            bg: "#1e293b",
          };
          break;
        case "tabs":
          newW = {
            id: newId,
            name: `Tabs${widgets.length + 1}`,
            type: "tabs",
            x,
            y,
            width: 300,
            height: 34,
            text: "Pestaña 1",
            options: ["General", "Opciones", "Avanzado"],
          };
          break;
        default:
          return;
      }

      setWidgets((prev) => [...prev, newW]);
      setSelectedId(newId);
      setActiveTool("select"); // Return to pointer tool
      return;
    }

    // Clicked on blank area -> deselect
    if ((e.target as HTMLElement) === canvasRef.current) {
      setSelectedId(null);
    }
  };

  // Dragging widget
  const handleWidgetMouseDown = (e: React.MouseEvent, widget: FormWidget) => {
    e.stopPropagation();
    setSelectedId(widget.id);
    if (activeTool !== "select") return;

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setIsDragging(true);
    setDragOffset({
      x: mouseX - widget.x,
      y: mouseY - widget.y,
    });
  };

  const handleResizeStart = (e: React.MouseEvent, dir: string) => {
    e.stopPropagation();
    setResizingDir(dir);
  };

  // Mouse move on canvas
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current || !selectedId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      const nextX = Math.max(0, snap(mouseX - dragOffset.x));
      const nextY = Math.max(0, snap(mouseY - dragOffset.y));
      setWidgets((prev) =>
        prev.map((w) => (w.id === selectedId ? { ...w, x: nextX, y: nextY } : w))
      );
    } else if (resizingDir) {
      setWidgets((prev) =>
        prev.map((w) => {
          if (w.id !== selectedId) return w;
          let nextW = w.width;
          let nextH = w.height;
          if (resizingDir.includes("e")) {
            nextW = Math.max(30, snap(mouseX - w.x));
          }
          if (resizingDir.includes("s")) {
            nextH = Math.max(20, snap(mouseY - w.y));
          }
          return { ...w, width: nextW, height: nextH };
        })
      );
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setResizingDir(null);
  };

  // Update selected widget property
  const updateSelected = (key: keyof FormWidget, val: any) => {
    if (!selectedId) return;
    setWidgets((prev) =>
      prev.map((w) => (w.id === selectedId ? { ...w, [key]: val } : w))
    );
  };

  // Delete widget
  const deleteSelected = () => {
    if (!selectedId) return;
    setWidgets((prev) => prev.filter((w) => w.id !== selectedId));
    setSelectedId(null);
  };

  // Bring forward / send backward
  const bringForward = () => {
    if (!selectedId) return;
    setWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === selectedId);
      if (idx < 0 || idx === prev.length - 1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(idx + 1, 0, item);
      return copy;
    });
  };

  const sendBackward = () => {
    if (!selectedId) return;
    setWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === selectedId);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(idx - 1, 0, item);
      return copy;
    });
  };

  // Generate Pascal / DIV Games Studio + Precode Code
  const generateCode = (): string => {
    const lines: string[] = [];
    lines.push(`// =================================================================`);
    lines.push(`// WXDIV 3.0: FORMULARIO GENERADO DESDE VISUAL FORM DESIGNER`);
    lines.push(`// Diseñado estilo Visual Basic 3.0 con UI Primitives nativas DIV`);
    lines.push(`// =================================================================`);
    lines.push(`PROGRAM ${formTitle.toLowerCase().replace(/[^a-z0-9_]/g, "_")}_app;\n`);

    // State Store
    lines.push(`STORE app_state`);
    widgets.forEach((w) => {
      if (w.type === "textbox") {
        lines.push(`  ${w.name.toLowerCase()}_text: string = "${w.value || ""}"`);
      } else if (w.type === "checkbox") {
        lines.push(`  ${w.name.toLowerCase()}_checked: bool = ${w.value === "true"}`);
      } else if (w.type === "select") {
        lines.push(`  ${w.name.toLowerCase()}_selected: string = "${w.options?.[0] || ""}"`);
      } else if (w.type === "tabs") {
        lines.push(`  ${w.name.toLowerCase()}_tab: string = "${w.options?.[0] || ""}"`);
      }
    });
    lines.push(`END\n`);

    // Main Begin
    lines.push(`BEGIN`);
    lines.push(`  set_mode(m${resolution});`);
    lines.push(`  set_fps(60);`);
    lines.push(`  screen_color(${formBg.startsWith("#") ? `rgb(${parseInt(formBg.slice(1, 3), 16)}, ${parseInt(formBg.slice(3, 5), 16)}, ${parseInt(formBg.slice(5, 7), 16)})` : "rgb(15, 23, 42)"});\n`);

    // Title text
    lines.push(`  write(0, 20, 20, 0, "${formTitle.toUpperCase()}");\n`);

    // Spawn form UI controller
    lines.push(`  form_controller();\n`);
    lines.push(`  LOOP`);
    lines.push(`    FRAME;`);
    lines.push(`  END`);
    lines.push(`END\n`);

    // Form Process Controller
    lines.push(`PROCESS form_controller()`);
    lines.push(`BEGIN`);
    lines.push(`  graph = 0;`);
    lines.push(`  LOOP`);

    // Emit all widgets
    widgets.forEach((w) => {
      if (w.type === "frame") {
        lines.push(`    // Marco contenedor: ${w.name}`);
        lines.push(`    draw_box(${w.x}, ${w.y}, ${w.x + w.width}, ${w.y + w.height}, "${w.bg || "#1e293b"}");`);
        lines.push(`    write(0, ${w.x + 12}, ${w.y + 16}, 0, "${w.text}");`);
      } else if (w.type === "label") {
        lines.push(`    write(0, ${w.x}, ${w.y + 12}, 0, "${w.text}");`);
      } else if (w.type === "button") {
        lines.push(`    draw_button(${w.x}, ${w.y}, ${w.width}, ${w.height}, "${w.text}", ${w.name.toLowerCase()}_click);`);
      } else if (w.type === "textbox") {
        lines.push(`    draw_input(${w.x}, ${w.y}, ${w.width}, ${w.height}, store_get("app_state.${w.name.toLowerCase()}_text"), "${w.text || "Escribe..."}");`);
      } else if (w.type === "select") {
        const opts = (w.options || ["Opción 1"]).join(",");
        lines.push(`    draw_select(${w.x}, ${w.y}, ${w.width}, ${w.height}, "${opts}", 0);`);
      } else if (w.type === "checkbox") {
        lines.push(`    draw_button(${w.x}, ${w.y}, ${w.width}, ${w.height}, "[x] ${w.text}", ${w.name.toLowerCase()}_toggle);`);
      } else if (w.type === "tabs") {
        const tabsStr = (w.options || ["Pestaña 1", "Pestaña 2"]).join(",");
        lines.push(`    draw_tabs(${w.x}, ${w.y}, ${w.width}, ${w.height}, "${tabsStr}", 0);`);
      } else if (w.type === "table") {
        lines.push(`    draw_table(${w.x}, ${w.y}, ${w.width}, ${w.height}, "${w.text}", "1,Ejemplo,Activo|2,Prueba,Pendiente");`);
      }
    });

    lines.push(`    FRAME;`);
    lines.push(`  END`);
    lines.push(`END\n`);

    // Event Callbacks
    widgets.forEach((w) => {
      if (w.type === "button") {
        lines.push(`PROCESS ${w.name.toLowerCase()}_click()`);
        lines.push(`BEGIN`);
        if (w.onClickAction) {
          lines.push(`  ${w.onClickAction}`);
        } else {
          lines.push(`  write(0, 30, 420, 0, "Evento Click: ${w.name}");`);
        }
        lines.push(`END\n`);
      } else if (w.type === "checkbox") {
        lines.push(`PROCESS ${w.name.toLowerCase()}_toggle()`);
        lines.push(`BEGIN`);
        lines.push(`  store_set("app_state.${w.name.toLowerCase()}_checked", !store_get("app_state.${w.name.toLowerCase()}_checked"));`);
        lines.push(`END\n`);
      }
    });

    return lines.join("\n");
  };

  // Launch live preview directly in DivRuntime so the user can interact in GameStage immediately
  const handleRunLiveInGameStage = () => {
    runtime.stop();
    runtime.reset();
    runtime.setResolution(resolution);
    runtime.clearScreen(formBg);

    // Setup state in appStore
    const stateVals: Record<string, any> = {};
    widgets.forEach((w) => {
      if (w.type === "textbox") stateVals[`${w.name.toLowerCase()}_text`] = w.value || "";
      if (w.type === "checkbox") stateVals[`${w.name.toLowerCase()}_checked`] = w.value === "true";
      if (w.type === "select") stateVals[`${w.name.toLowerCase()}_selected`] = w.options?.[0] || "";
      if (w.type === "tabs") stateVals[`${w.name.toLowerCase()}_tab`] = w.options?.[0] || "";
    });
    runtime.appStore.store_create("app_state", stateVals);

    // Register active form process in DivRuntime
    runtime.registerProcess("form_controller", function* (proc, _, rt) {
      proc.graph = 0;
      let notificationMsg = "";
      let notificationTimer = 0;

      while (true) {
        // Draw background elements
        widgets.forEach((w) => {
          if (w.type === "frame") {
            rt.drawBox(w.x, w.y, w.x + w.width, w.y + w.height, w.bg || "#1e293b");
            rt.drawText(0, w.x + 12, w.y + 18, 0, w.text);
          } else if (w.type === "label") {
            rt.drawText(0, w.x, w.y + 14, 0, w.text);
          } else if (w.type === "button") {
            rt.drawButton(
              w.x,
              w.y,
              w.width,
              w.height,
              w.text,
              () => {
                notificationMsg = `¡Pulsado ${w.name}: ${w.text}!`;
                notificationTimer = 120;
              },
              { variant: w.variant || "primary" }
            );
          } else if (w.type === "textbox") {
            const currentVal = rt.appStore.store_get(`app_state.${w.name.toLowerCase()}_text`, w.value || "");
            rt.drawInput(
              w.x,
              w.y,
              w.width,
              w.height,
              currentVal,
              (newV) => {
                rt.appStore.store_set(`app_state.${w.name.toLowerCase()}_text`, newV);
              },
              w.text || "Escribe aquí..."
            );
          } else if (w.type === "select") {
            const opts = w.options || ["Opción 1", "Opción 2"];
            const currentVal = rt.appStore.store_get(`app_state.${w.name.toLowerCase()}_selected`, opts[0]);
            const selectedIdx = Math.max(0, opts.indexOf(currentVal));
            rt.drawSelect(w.x, w.y, w.width, w.height, opts, selectedIdx, (idx, val) => {
              rt.appStore.store_set(`app_state.${w.name.toLowerCase()}_selected`, val);
            });
          } else if (w.type === "tabs") {
            const tabs = w.options || ["Tab 1", "Tab 2"];
            const currentTab = rt.appStore.store_get(`app_state.${w.name.toLowerCase()}_tab`, tabs[0]);
            rt.drawTabs(w.x, w.y, w.width, w.height, tabs, currentTab, (tab) => {
              rt.appStore.store_set(`app_state.${w.name.toLowerCase()}_tab`, tab);
            });
          } else if (w.type === "checkbox") {
            const checked = rt.appStore.store_get(`app_state.${w.name.toLowerCase()}_checked`, false);
            rt.drawButton(
              w.x,
              w.y,
              w.width,
              w.height,
              `${checked ? "☑" : "☐"} ${w.text}`,
              () => {
                rt.appStore.store_set(`app_state.${w.name.toLowerCase()}_checked`, !checked);
              },
              { variant: checked ? "success" : "secondary" }
            );
          } else if (w.type === "table") {
            const headers = w.text.split(",");
            const sampleRows = [
              { c0: 1, c1: "Elemento Alpha", c2: "Activo" },
              { c0: 2, c1: "Elemento Beta", c2: "Pendiente" },
              { c0: 3, c1: "Elemento Gamma", c2: "En proceso" },
            ];
            rt.drawTable(w.x, w.y, w.width, w.height, headers, sampleRows, { striped: true });
          }
        });

        // Banner notifications
        if (notificationTimer > 0) {
          notificationTimer--;
          rt.drawBox(20, rt.height - 45, rt.width - 20, rt.height - 15, "#065f46");
          rt.drawText(0, 35, rt.height - 28, 0, `✓ ${notificationMsg}`);
        }

        yield;
      }
    });

    runtime.spawn("form_controller");
    runtime.start();

    // Also update editor code
    const fullCode = generateCode();
    onApplyFullCode(fullCode);
    onRunPreview();
  };

  // AI Prompt Assistant for auto-designing full forms
  const handleAiAutoDesign = async () => {
    if (!aiPrompt.trim() || isAiGenerating) return;
    setIsAiGenerating(true);
    setAiFeedback(null);

    const promptText = `Genera un formulario de interfaz para una app tipo Visual Basic 3.0 / DIV Games Studio.
Tema: ${aiPrompt}
Devuelve EXCLUSIVAMENTE un arreglo JSON de widgets con esta estructura exacta:
[
  { "id": "txt1", "name": "TextUsuario", "type": "textbox", "x": 50, "y": 80, "width": 200, "height": 34, "text": "Nombre", "value": "" },
  { "id": "btn1", "name": "CommandOk", "type": "button", "x": 50, "y": 130, "width": 120, "height": 36, "text": "Aceptar", "variant": "primary" }
]
Tipos permitidos: label, button, textbox, checkbox, select, table, frame, tabs.`;

    try {
      const cfg = getAiConfig();
      const res = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          prompt: promptText,
          code: generateCode(),
          apiKey: cfg.useCustomKey && cfg.apiKey ? cfg.apiKey : undefined,
          model: cfg.model || "gemini-3.8-flash",
        }),
      });

      if (!res.ok) throw new Error("Error en el servidor de IA");
      const data = await res.json();
      const text = data.text || "";

      // Extract JSON array
      const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWidgets(parsed);
          setSelectedId(parsed[0].id);
          setAiFeedback(`¡Diseño generado con éxito! ${parsed.length} controles insertados.`);
          setAiPrompt("");
          return;
        }
      }
      setAiFeedback("La IA respondió pero no en formato de lista. Intenta con una descripción más directa.");
    } catch (err: any) {
      setAiFeedback("No se pudo conectar con la IA. Se mantendrán los controles actuales.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Toolbox item definitions (Visual Basic 3.0 Classic Palette)
  const TOOLBOX_ITEMS: Array<{
    type: ControlType;
    label: string;
    icon: React.ReactNode;
    shortcut: string;
  }> = [
    { type: "label", label: "Label (Texto)", icon: <Type className="w-3.5 h-3.5" />, shortcut: "A" },
    { type: "textbox", label: "TextBox (Input)", icon: <Square className="w-3.5 h-3.5" />, shortcut: "ab" },
    { type: "button", label: "CommandButton", icon: <CreditCard className="w-3.5 h-3.5" />, shortcut: "Btn" },
    { type: "checkbox", label: "CheckBox", icon: <ToggleLeft className="w-3.5 h-3.5" />, shortcut: "Chk" },
    { type: "select", label: "ComboBox", icon: <Sliders className="w-3.5 h-3.5" />, shortcut: "List" },
    { type: "table", label: "DBGrid (Tabla)", icon: <TableIcon className="w-3.5 h-3.5" />, shortcut: "Grid" },
    { type: "frame", label: "Frame (Marco)", icon: <LayoutGrid className="w-3.5 h-3.5" />, shortcut: "Box" },
    { type: "tabs", label: "TabStrip (Pestañas)", icon: <Layers className="w-3.5 h-3.5" />, shortcut: "Tabs" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-slate-200 select-none overflow-hidden font-sans text-xs">
      {/* Top Action Bar (Visual Basic 3.0 Ribbon / ToolBar) */}
      <div className="px-3 py-2 bg-[#0e172a] border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Form Icon & Name */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-700/80">
            <LayoutGrid className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-slate-100 font-mono">{formTitle}.frm</span>
            <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800/40 text-[9px] font-mono">
              VB3 / DIV APPS
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

          {/* Grid Snap & Resolution */}
          <button
            onClick={() => setGridSnap(!gridSnap)}
            className={`px-2 py-1 rounded border flex items-center gap-1 text-[11px] transition-colors ${
              gridSnap
                ? "bg-sky-950 text-sky-300 border-sky-700/60"
                : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
            title="Ajustar controles a la rejilla de píxeles"
          >
            <span>Rejilla ({gridSize}px): {gridSnap ? "ON" : "OFF"}</span>
          </button>

          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value as any)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-[11px] outline-none"
          >
            <option value="640x480">640x480 (VGA App)</option>
            <option value="800x600">800x600 (SVGA App)</option>
          </select>
        </div>

        {/* Action Buttons: Run Live, Copy Code, Insert Code */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunLiveInGameStage}
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors"
            title="Ejecutar y ver la app interactiva en vivo en la Pantalla de Juego"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Ejecutar App en Vivo (F5)</span>
          </button>

          <button
            onClick={() => {
              const code = generateCode();
              onApplyFullCode(code);
            }}
            className="px-2.5 py-1.5 rounded bg-sky-700 hover:bg-sky-600 text-white font-medium flex items-center gap-1 transition-colors"
            title="Reemplazar todo el código del editor con este formulario"
          >
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>Enviar a Editor DIV</span>
          </button>

          <button
            onClick={() => {
              const code = generateCode();
              navigator.clipboard.writeText(code);
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 1500);
            }}
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? "Copiado" : "Copiar"}</span>
          </button>
        </div>
      </div>

      {/* AI Assistant Banner */}
      <div className="px-3 py-1.5 bg-[#0a1122] border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAiAutoDesign();
            }}
            placeholder="Generar formulario con IA (ej: 'Pantalla de Login con usuario, contraseña y recordar clave')..."
            className="flex-1 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-slate-100 text-[11px] outline-none focus:border-amber-400 placeholder:text-slate-500"
          />
          <button
            onClick={handleAiAutoDesign}
            disabled={isAiGenerating || !aiPrompt.trim()}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors"
          >
            <span>{isAiGenerating ? "Diseñando..." : "Crear con IA"}</span>
          </button>
        </div>
        {aiFeedback && (
          <span className="text-[10px] text-sky-400 italic px-2">{aiFeedback}</span>
        )}
      </div>

      {/* Main Workspace: 3 Columns (Toolbox | WYSIWYG Form Canvas | Properties Inspector) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Classic Visual Basic 3.0 ToolBox */}
        <div className="w-36 bg-[#0c1322] border-r border-slate-800 p-2 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1 border-b border-slate-800 flex items-center justify-between">
            <span>Controles</span>
            <span className="text-sky-400 font-mono">VB3</span>
          </div>

          {/* Pointer Tool */}
          <button
            onClick={() => setActiveTool("select")}
            className={`w-full px-2 py-1.5 rounded flex items-center gap-2 text-[11px] font-medium transition-colors ${
              activeTool === "select"
                ? "bg-sky-600 text-white font-bold shadow-sm"
                : "text-slate-300 hover:bg-slate-800/80"
            }`}
          >
            <MousePointer className="w-3.5 h-3.5 text-sky-300" />
            <span>Puntero</span>
          </button>

          {/* Widget Tools */}
          {TOOLBOX_ITEMS.map((item) => (
            <button
              key={item.type}
              onClick={() => setActiveTool(item.type)}
              className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-[11px] font-medium transition-colors ${
                activeTool === item.type
                  ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/80"
              }`}
              title={`Añadir control ${item.label} al formulario`}
            >
              <div className="flex items-center gap-2">
                <span className={activeTool === item.type ? "text-slate-950" : "text-sky-400"}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              <span className="text-[9px] font-mono opacity-70">{item.shortcut}</span>
            </button>
          ))}

          <div className="mt-auto pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
            Haz clic en un control y luego en el lienzo para colocarlo.
          </div>
        </div>

        {/* Center: Interactive Form Canvas */}
        <div
          className="flex-1 bg-[#070b14] overflow-auto p-4 flex items-center justify-center relative select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Form Window Frame */}
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            style={{
              width: resolution === "640x480" ? 640 : 800,
              height: resolution === "640x480" ? 480 : 600,
              backgroundColor: formBg,
              backgroundImage: gridSnap
                ? `radial-gradient(circle, #334155 1px, transparent 1px)`
                : "none",
              backgroundSize: `${gridSize}px ${gridSize}px`,
            }}
            className="relative rounded-lg shadow-2xl border-2 border-slate-700/80 overflow-hidden flex flex-col"
          >
            {/* Form TitleBar (Classic OS Title) */}
            <div className="h-7 bg-gradient-to-r from-blue-900 to-slate-900 px-3 flex items-center justify-between text-xs font-bold text-white border-b border-blue-700/60 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-300" />
                <span className="font-mono">{formTitle}</span>
              </div>
              <div className="flex items-center gap-1 opacity-80">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
            </div>

            {/* Form Body with Widgets */}
            <div className="flex-1 relative overflow-hidden">
              {widgets.map((w) => {
                const isSelected = w.id === selectedId;

                return (
                  <div
                    key={w.id}
                    onMouseDown={(e) => handleWidgetMouseDown(e, w)}
                    style={{
                      left: w.x,
                      top: w.y,
                      width: w.width,
                      height: w.height,
                    }}
                    className={`absolute select-none cursor-move transition-shadow ${
                      isSelected
                        ? "ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-950 z-20"
                        : "hover:ring-1 hover:ring-sky-400/50 z-10"
                    }`}
                  >
                    {/* Widget Render Appearance */}
                    {w.type === "label" && (
                      <div
                        style={{
                          color: w.fg || "#f8fafc",
                          fontSize: w.fontSize || 13,
                          fontWeight: w.fontBold ? "bold" : "normal",
                        }}
                        className="w-full h-full flex items-center px-1 overflow-hidden"
                      >
                        {w.text}
                      </div>
                    )}

                    {w.type === "button" && (
                      <button
                        type="button"
                        className={`w-full h-full rounded px-3 py-1 font-semibold text-xs flex items-center justify-center gap-1 shadow-sm ${
                          w.variant === "danger"
                            ? "bg-rose-600 text-white"
                            : w.variant === "success"
                            ? "bg-emerald-600 text-white"
                            : w.variant === "secondary"
                            ? "bg-slate-700 text-slate-200"
                            : "bg-sky-600 text-white"
                        }`}
                      >
                        <span>{w.text}</span>
                      </button>
                    )}

                    {w.type === "textbox" && (
                      <div className="w-full h-full rounded bg-slate-950/90 border border-slate-700 px-2.5 py-1 text-slate-100 flex items-center justify-between text-xs">
                        <span className="truncate">{w.value || w.text || "Texto..."}</span>
                        <span className="w-1.5 h-3.5 bg-sky-400 animate-pulse" />
                      </div>
                    )}

                    {w.type === "checkbox" && (
                      <div className="w-full h-full flex items-center gap-2 px-1 text-slate-200 text-xs">
                        <div className="w-4 h-4 rounded bg-slate-800 border border-slate-600 flex items-center justify-center">
                          {w.value === "true" && <Check className="w-3 h-3 text-sky-400" />}
                        </div>
                        <span className="truncate">{w.text}</span>
                      </div>
                    )}

                    {w.type === "select" && (
                      <div className="w-full h-full rounded bg-slate-900 border border-slate-700 px-2.5 py-1 text-slate-200 flex items-center justify-between text-xs">
                        <span className="truncate">{w.options?.[0] || w.text}</span>
                        <span className="text-[10px] text-slate-400">▼</span>
                      </div>
                    )}

                    {w.type === "tabs" && (
                      <div className="w-full h-full flex items-center border-b border-slate-700 bg-slate-950/40">
                        {(w.options || ["Pestaña 1", "Pestaña 2"]).map((t, i) => (
                          <div
                            key={i}
                            className={`px-3 py-1 text-xs border-r border-slate-800 ${
                              i === 0
                                ? "bg-sky-950 text-sky-300 font-bold border-t-2 border-t-sky-400"
                                : "text-slate-400"
                            }`}
                          >
                            {t}
                          </div>
                        ))}
                      </div>
                    )}

                    {w.type === "frame" && (
                      <div
                        style={{ backgroundColor: w.bg || "#1e293b" }}
                        className="w-full h-full rounded-lg border border-slate-700/80 p-2 relative shadow-inner"
                      >
                        <span className="absolute -top-2.5 left-3 px-1.5 bg-[#0f172a] text-[10px] font-bold text-sky-400 uppercase tracking-wider border border-slate-700 rounded">
                          {w.text}
                        </span>
                      </div>
                    )}

                    {w.type === "table" && (
                      <div className="w-full h-full rounded bg-slate-950/90 border border-slate-700 overflow-hidden flex flex-col text-[11px]">
                        <div className="h-6 bg-slate-900 border-b border-slate-800 flex items-center px-2 font-bold text-slate-300 font-mono">
                          {w.text.split(",").map((col, i) => (
                            <span key={i} className="flex-1 truncate">
                              {col}
                            </span>
                          ))}
                        </div>
                        <div className="flex-1 p-2 space-y-1 text-slate-400 font-mono">
                          <div className="flex items-center justify-between py-0.5 border-b border-slate-900">
                            <span>1</span>
                            <span>Ejemplo Alpha</span>
                            <span className="text-emerald-400">OK</span>
                          </div>
                          <div className="flex items-center justify-between py-0.5">
                            <span>2</span>
                            <span>Ejemplo Beta</span>
                            <span className="text-amber-400">Pend</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resize Grippers for Selected Widget */}
                    {isSelected && (
                      <>
                        <div
                          onMouseDown={(e) => handleResizeStart(e, "se")}
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-sky-400 rounded-full border border-white cursor-se-resize shadow"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, "e")}
                          className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-3 bg-sky-400 rounded-xs cursor-e-resize"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, "s")}
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-sky-400 rounded-xs cursor-s-resize"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Visual Basic 3.0 Properties Inspector */}
        <div className="w-72 bg-[#0c1322] border-l border-slate-800 p-3 flex flex-col gap-2 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center justify-between">
            <span>Propiedades (Properties)</span>
            <span className="text-sky-400 font-mono">VB3</span>
          </div>

          {selectedWidget ? (
            <div className="space-y-2.5">
              {/* Name & Type */}
              <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sky-300 font-mono text-xs">{selectedWidget.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase">{selectedWidget.type}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={bringForward}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300"
                    title="Traer al frente"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="p-1 hover:bg-rose-950 text-rose-400 rounded"
                    title="Eliminar control"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text / Caption */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Caption / Texto:</label>
                <input
                  type="text"
                  value={selectedWidget.text}
                  onChange={(e) => updateSelected("text", e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-sky-400"
                />
              </div>

              {/* Value / Content */}
              {selectedWidget.type === "textbox" && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Valor Inicial (Text):</label>
                  <input
                    type="text"
                    value={selectedWidget.value || ""}
                    onChange={(e) => updateSelected("value", e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-sky-400"
                  />
                </div>
              )}

              {/* Options list for Select or Tabs */}
              {(selectedWidget.type === "select" || selectedWidget.type === "tabs") && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Opciones (separadas por coma):</label>
                  <input
                    type="text"
                    value={(selectedWidget.options || []).join(", ")}
                    onChange={(e) =>
                      updateSelected(
                        "options",
                        e.target.value.split(",").map((s) => s.trim())
                      )
                    }
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-sky-400"
                  />
                </div>
              )}

              {/* Button Variant */}
              {selectedWidget.type === "button" && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Variante de Botón:</label>
                  <select
                    value={selectedWidget.variant || "primary"}
                    onChange={(e) => updateSelected("variant", e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-sky-400"
                  >
                    <option value="primary">Primario (Azul)</option>
                    <option value="secondary">Secundario (Gris)</option>
                    <option value="success">Éxito (Verde)</option>
                    <option value="danger">Peligro (Rojo)</option>
                  </select>
                </div>
              )}

              {/* Position & Geometry */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Left (X):</label>
                  <input
                    type="number"
                    value={selectedWidget.x}
                    onChange={(e) => updateSelected("x", parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Top (Y):</label>
                  <input
                    type="number"
                    value={selectedWidget.y}
                    onChange={(e) => updateSelected("y", parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Width:</label>
                  <input
                    type="number"
                    value={selectedWidget.width}
                    onChange={(e) => updateSelected("width", parseInt(e.target.value) || 20)}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Height:</label>
                  <input
                    type="number"
                    value={selectedWidget.height}
                    onChange={(e) => updateSelected("height", parseInt(e.target.value) || 15)}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Action on Click */}
              {selectedWidget.type === "button" && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Evento OnClick (DIV Code):</label>
                  <textarea
                    rows={3}
                    value={selectedWidget.onClickAction || ""}
                    onChange={(e) => updateSelected("onClickAction", e.target.value)}
                    placeholder='Ej: write(0, 50, 50, 0, "¡Hola mundo!");'
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[11px] font-mono outline-none focus:border-sky-400 resize-none"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Form Properties when no widget is selected */
            <div className="space-y-3">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="font-bold text-sky-400 font-mono text-xs">Propiedades del Formulario</span>
                <p className="text-[10px] text-slate-400 mt-0.5">No hay ningún control seleccionado. Configurando lienzo global.</p>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Nombre del Form (Name):</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Color de Fondo (BackColor):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formBg}
                    onChange={(e) => setFormBg(e.target.value)}
                    className="w-8 h-8 rounded bg-transparent cursor-pointer border border-slate-700"
                  />
                  <span className="font-mono text-xs">{formBg}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Resolución de Pantalla:</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                >
                  <option value="640x480">640x480 (VGA)</option>
                  <option value="800x600">800x600 (SVGA)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 block mb-1">Total de Controles: {widgets.length}</span>
                <button
                  onClick={() => setWidgets([])}
                  className="w-full px-2.5 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-300 text-xs font-semibold transition-colors"
                >
                  Limpiar Todos los Controles
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
