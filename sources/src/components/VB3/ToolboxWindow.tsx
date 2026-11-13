import React from "react";
import { VB3ToolType } from "./types";

interface ToolboxWindowProps {
  activeTool: VB3ToolType;
  onSelectTool: (tool: VB3ToolType) => void;
  onDoubleClickTool?: (tool: VB3ToolType) => void;
}

interface ToolDef {
  type: VB3ToolType;
  name: string;
  tooltip: string;
  icon: React.ReactNode;
}

export const ToolboxWindow: React.FC<ToolboxWindowProps> = ({
  activeTool,
  onSelectTool,
  onDoubleClickTool,
}) => {
  const tools: ToolDef[] = [
    {
      type: "pointer",
      name: "Pointer",
      tooltip: "Puntero de Selección",
      icon: (
        <svg className="w-5 h-5 text-rose-700" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 3l13 9.5-6.5 1.5 3.5 7-3 1.5-3.5-7L4 18V3z" />
        </svg>
      ),
    },
    {
      type: "picturebox",
      name: "PictureBox",
      tooltip: "PictureBox (Lienzo Canvas Gráfico)",
      icon: (
        <div className="w-5 h-5 border border-black bg-white flex flex-col items-center justify-center p-0.5 relative overflow-hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-0.5 right-0.5" />
          <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 19H5l4.5-6 3.5 4.5 2.5-3.5 3.5 5z" />
          </svg>
        </div>
      ),
    },
    {
      type: "label",
      name: "Label",
      tooltip: "Label (Etiqueta de Texto)",
      icon: <span className="font-serif font-black text-base text-black">A</span>,
    },
    {
      type: "textbox",
      name: "TextBox",
      tooltip: "TextBox (Campo de Entrada de Texto)",
      icon: (
        <div className="w-5 h-4 border border-black bg-white flex items-center justify-center text-[10px] font-mono font-bold text-blue-900">
          ab|
        </div>
      ),
    },
    {
      type: "frame",
      name: "Frame",
      tooltip: "Frame (Marco Agrupador 3D)",
      icon: (
        <div className="w-5 h-4 border border-dashed border-gray-600 bg-transparent flex items-start px-0.5 text-[8px] font-mono text-gray-700">
          xyz
        </div>
      ),
    },
    {
      type: "commandbutton",
      name: "CommandButton",
      tooltip: "CommandButton (Botón de Comando 3D)",
      icon: (
        <div className="w-5 h-4 bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black flex items-center justify-center shadow-sm">
          <div className="w-3 h-1.5 border border-gray-600 bg-[#d4d4d4]" />
        </div>
      ),
    },
    {
      type: "checkbox",
      name: "CheckBox",
      tooltip: "CheckBox (Casilla de Verificación)",
      icon: (
        <div className="flex items-center gap-0.5">
          <div className="w-3.5 h-3.5 border border-black bg-white flex items-center justify-center text-[10px] font-bold text-black leading-none">
            ✕
          </div>
        </div>
      ),
    },
    {
      type: "optionbutton",
      name: "OptionButton",
      tooltip: "OptionButton (Botón Radial)",
      icon: (
        <div className="w-3.5 h-3.5 rounded-full border border-black bg-white flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-black" />
        </div>
      ),
    },
    {
      type: "combobox",
      name: "ComboBox",
      tooltip: "ComboBox (Lista Desplegable)",
      icon: (
        <div className="w-5 h-3.5 border border-black bg-white flex items-center justify-between px-0.5">
          <span className="text-[7px] text-gray-600">--</span>
          <div className="w-2 h-2.5 bg-gray-300 border border-black flex items-center justify-center text-[6px]">
            ▼
          </div>
        </div>
      ),
    },
    {
      type: "listbox",
      name: "ListBox",
      tooltip: "ListBox (Lista de Elementos)",
      icon: (
        <div className="w-5 h-4 border border-black bg-white flex flex-col justify-evenly px-0.5 py-0.5">
          <div className="h-0.5 bg-black w-full" />
          <div className="h-0.5 bg-blue-700 w-3/4" />
          <div className="h-0.5 bg-black w-full" />
        </div>
      ),
    },
    {
      type: "hscrollbar",
      name: "HScrollBar",
      tooltip: "HScrollBar (Desplazamiento Horizontal)",
      icon: (
        <div className="w-5 h-3 bg-gray-300 border border-black flex items-center justify-between text-[7px] font-bold text-black">
          <span>◀</span>
          <div className="w-1.5 h-2 bg-gray-400 border border-gray-600" />
          <span>▶</span>
        </div>
      ),
    },
    {
      type: "vscrollbar",
      name: "VScrollBar",
      tooltip: "VScrollBar (Desplazamiento Vertical)",
      icon: (
        <div className="w-3 h-5 bg-gray-300 border border-black flex flex-col items-center justify-between text-[7px] font-bold text-black">
          <span>▲</span>
          <div className="h-1.5 w-2 bg-gray-400 border border-gray-600" />
          <span>▼</span>
        </div>
      ),
    },
    {
      type: "timer",
      name: "Timer",
      tooltip: "Timer (Temporizador de Intervalo)",
      icon: (
        <div className="w-4 h-4 rounded-full border border-black bg-white relative flex items-center justify-center">
          <div className="w-0.5 h-1.5 bg-black absolute top-0.5" />
          <div className="w-1 h-0.5 bg-black absolute right-1" />
          <div className="w-1.5 h-0.5 bg-black absolute -top-1" />
        </div>
      ),
    },
    {
      type: "drivelistbox",
      name: "DriveListBox",
      tooltip: "DriveListBox (Selector de Disco)",
      icon: (
        <div className="w-4 h-4 border border-black bg-gray-200 flex flex-col justify-between p-0.5">
          <div className="w-full h-1 bg-black" />
          <div className="w-1 h-1 rounded-full bg-emerald-600 self-end" />
        </div>
      ),
    },
    {
      type: "dirlistbox",
      name: "DirListBox",
      tooltip: "DirListBox (Directorios)",
      icon: (
        <div className="w-5 h-4 relative">
          <div className="w-2.5 h-1 bg-amber-600 rounded-t" />
          <div className="w-5 h-3 bg-amber-400 border border-amber-700" />
        </div>
      ),
    },
    {
      type: "filelistbox",
      name: "FileListBox",
      tooltip: "FileListBox (Archivos)",
      icon: (
        <div className="w-4 h-5 border border-black bg-white flex flex-col p-0.5 gap-0.5">
          <div className="w-full h-0.5 bg-gray-500" />
          <div className="w-full h-0.5 bg-gray-500" />
          <div className="w-2/3 h-0.5 bg-gray-500" />
        </div>
      ),
    },
    {
      type: "shape",
      name: "Shape",
      tooltip: "Shape (Forma Geométrica)",
      icon: (
        <div className="w-4 h-4 border-2 border-blue-800 bg-transparent rounded-sm" />
      ),
    },
    {
      type: "line",
      name: "Line",
      tooltip: "Line (Línea Gráfica)",
      icon: (
        <div className="w-5 h-5 relative flex items-center justify-center">
          <div className="w-5 h-0.5 bg-black rotate-45" />
        </div>
      ),
    },
    {
      type: "image",
      name: "Image",
      tooltip: "Image (Control Ligero de Imagen)",
      icon: (
        <div className="w-5 h-4 border border-gray-600 bg-sky-100 flex items-center justify-center text-sky-800 font-bold text-[9px]">
          IMG
        </div>
      ),
    },
    {
      type: "data",
      name: "Data",
      tooltip: "Data Control (Conexión de Base de Datos)",
      icon: (
        <div className="w-5 h-3.5 bg-gray-300 border border-black flex items-center justify-between px-0.5 text-[6px] font-mono font-bold text-black">
          <span>|◀</span>
          <span>▶|</span>
        </div>
      ),
    },
    {
      type: "grid",
      name: "Grid",
      tooltip: "GRID.VBX (Cuadrícula de Celdas)",
      icon: (
        <div className="w-4 h-4 border border-black bg-white grid grid-cols-2 grid-rows-2">
          <div className="border-r border-b border-gray-400 bg-gray-200" />
          <div className="border-b border-gray-400" />
          <div className="border-r border-gray-400" />
          <div className="bg-blue-100" />
        </div>
      ),
    },
    {
      type: "webembed",
      name: "WebEmbed",
      tooltip: "WebEmbed / HTML5 (Componente Web, Iframe & Canvas JS)",
      icon: (
        <div className="w-5 h-4 border border-orange-600 bg-orange-50 flex items-center justify-center text-[7px] font-bold text-orange-700 font-mono">
          &lt;/&gt;
        </div>
      ),
    },
    {
      type: "commondialog",
      name: "CommonDialog",
      tooltip: "CMDIALOG.VBX (Diálogos del Sistema)",
      icon: (
        <div className="w-4 h-4 border border-blue-900 bg-white flex flex-col items-center justify-center text-[7px] font-mono text-blue-900">
          ⚙
        </div>
      ),
    },
    {
      type: "gauge",
      name: "Gauge",
      tooltip: "GAUGE.VBX (Medidor / Barra de Progreso)",
      icon: (
        <div className="w-5 h-3 border border-black bg-white p-0.5 flex items-center">
          <div className="w-3 h-full bg-blue-700" />
        </div>
      ),
    },
    // Modern HTML5 & Landing Page Extensions
    {
      type: "canvas5",
      name: "Canvas5",
      tooltip: "Canvas5 (Lienzo HTML5 2D / WebGL / Animación JS)",
      icon: (
        <div className="w-5 h-4 border border-emerald-600 bg-emerald-50 flex items-center justify-center text-[7px] font-bold text-emerald-700 font-mono">
          CANV
        </div>
      ),
    },
    {
      type: "herobanner",
      name: "HeroBanner",
      tooltip: "HeroBanner (Sección Hero para Landing Pages)",
      icon: (
        <div className="w-5 h-4 border border-indigo-600 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-[7px] font-bold text-white font-sans">
          HERO
        </div>
      ),
    },
    {
      type: "card",
      name: "Card",
      tooltip: "Card (Tarjeta Moderna con Sombra y Bordes Redondeados)",
      icon: (
        <div className="w-5 h-4 border border-slate-600 bg-slate-100 rounded-sm shadow-xs flex flex-col p-0.5">
          <div className="w-full h-1 bg-slate-400 mb-0.5" />
          <div className="w-3/4 h-1 bg-slate-300" />
        </div>
      ),
    },
    {
      type: "chart",
      name: "Chart",
      tooltip: "Chart (Gráfico Gráfico Interactivo HTML5)",
      icon: (
        <div className="w-5 h-4 border border-cyan-600 bg-cyan-50 flex items-end justify-center gap-0.5 p-0.5">
          <div className="w-1 h-1.5 bg-cyan-600" />
          <div className="w-1 h-3 bg-cyan-500" />
          <div className="w-1 h-2 bg-cyan-700" />
        </div>
      ),
    },
    {
      type: "switch",
      name: "Switch",
      tooltip: "Switch (Interruptor Moderno Animado)",
      icon: (
        <div className="w-5 h-3 rounded-full bg-emerald-600 flex items-center justify-end px-0.5">
          <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
        </div>
      ),
    },
    {
      type: "slider",
      name: "Slider",
      tooltip: "Slider (Deslizador de Rango Numérico)",
      icon: (
        <div className="w-5 h-2 bg-slate-300 rounded relative flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-600 absolute left-1/2 -translate-x-1/2" />
        </div>
      ),
    },
    {
      type: "badge",
      name: "Badge",
      tooltip: "Badge (Etiqueta Pill / Destacado)",
      icon: (
        <div className="w-5 h-2.5 rounded-full bg-purple-600 text-[6px] text-white flex items-center justify-center font-bold px-0.5">
          TAG
        </div>
      ),
    },
    {
      type: "progressbar",
      name: "ProgressBar",
      tooltip: "ProgressBar (Barra de Progreso Gradiente)",
      icon: (
        <div className="w-5 h-2 rounded bg-slate-200 border border-slate-400 overflow-hidden">
          <div className="w-3/5 h-full bg-gradient-to-r from-cyan-500 to-blue-500" />
        </div>
      ),
    },
    {
      type: "jscode",
      name: "JSCode",
      tooltip: "JSCode (Script JavaScript & HTML5 Ejecutable)",
      icon: (
        <div className="w-5 h-4 bg-amber-400 text-black font-mono font-black text-[8px] flex items-center justify-center rounded-xs shadow-xs">
          JS
        </div>
      ),
    },
    {
      type: "statmetric",
      name: "StatMetric",
      tooltip: "StatMetric (Métrica KPI con Sparkline y Tendencia)",
      icon: (
        <div className="w-5 h-4 bg-[#091124] border border-cyan-500 rounded-xs flex flex-col justify-between p-0.5">
          <div className="w-full flex justify-between items-center text-[5px] text-cyan-300 font-bold">
            <span>KPI</span>
            <span className="text-emerald-400">+18%</span>
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-xs" />
        </div>
      ),
    },
    {
      type: "pricingcard",
      name: "PricingCard",
      tooltip: "PricingCard (Tarjeta de Precios Landing SaaS)",
      icon: (
        <div className="w-5 h-4 bg-slate-900 border border-indigo-500 rounded-xs flex flex-col justify-between p-0.5 text-[5px] text-white">
          <div className="font-bold text-indigo-300">PRO</div>
          <div className="w-full h-1 bg-indigo-500 rounded-xs" />
        </div>
      ),
    },
    {
      type: "avatar",
      name: "Avatar",
      tooltip: "Avatar (Insignia / Foto de Perfil con Estado)",
      icon: (
        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 border border-white flex items-center justify-center text-[7px] text-white font-bold relative">
          👤
        </div>
      ),
    },
    {
      type: "accordion",
      name: "Accordion",
      tooltip: "Accordion (Preguntas Frecuentes / Pestaña Desplegable)",
      icon: (
        <div className="w-5 h-4 border border-slate-700 bg-slate-800 flex flex-col justify-between p-0.5 text-[5px] text-cyan-300">
          <div className="flex justify-between items-center font-bold">
            <span>FAQ</span>
            <span>▼</span>
          </div>
          <div className="w-3/4 h-0.5 bg-slate-600" />
        </div>
      ),
    },
    {
      type: "colorpicker",
      name: "ColorPicker",
      tooltip: "ColorPicker (Selector de Color Visual RGB/HEX)",
      icon: (
        <div className="w-4 h-4 rounded-xs bg-gradient-to-r from-red-500 via-green-500 to-blue-500 border border-black p-0.5 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white border border-black" />
        </div>
      ),
    },
    {
      type: "videoplayer",
      name: "VideoPlayer",
      tooltip: "VideoPlayer (Reproductor de Video HTML5 & Media)",
      icon: (
        <div className="w-5 h-4 bg-black border border-slate-700 flex items-center justify-center text-rose-500 text-[8px] font-bold">
          ▶
        </div>
      ),
    },
    {
      type: "html5editor",
      name: "HTML5Editor",
      tooltip: "HTML5Editor (Lienzo HTML5 Canvas 2D + JavaScript Nativo)",
      icon: (
        <div className="w-5 h-4 bg-[#0a0f1d] border border-cyan-400 text-cyan-300 font-mono font-bold text-[7px] flex items-center justify-center">
          &lt;H5&gt;
        </div>
      ),
    },
  ];

  return (
    <div className="w-full h-full flex-1 flex-grow min-h-0 bg-white select-none flex flex-col justify-start overflow-y-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5 w-full">
        {tools.map((t) => {
          const isSelected = activeTool === t.type;
          return (
            <button
              key={t.type}
              type="button"
              onClick={() => onSelectTool(t.type)}
              onDoubleClick={() => onDoubleClickTool?.(t.type)}
              title={`${t.tooltip} — Clic para seleccionar o doble clic para insertar directo`}
              className={`min-h-[42px] px-2 py-1.5 rounded-lg border text-left flex items-center gap-2 transition-colors cursor-pointer min-w-0 ${
                isSelected
                  ? "bg-[#FDF2F5] border-[#7C2D48] text-[#7C2D48] font-bold shadow-2xs"
                  : "bg-[#F8FAFC] border-[#E2E8F0] text-[#334155] hover:bg-slate-100"
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                {t.icon}
              </div>
              <span className="text-[11px] leading-tight truncate min-w-0 flex-1">
                {t.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
