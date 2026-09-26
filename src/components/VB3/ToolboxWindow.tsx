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
  ];

  return (
    <div className="w-full h-full bg-[#c0c0c0] p-1 select-none flex flex-col justify-start items-center overflow-y-auto">
      <div className="grid grid-cols-2 gap-1 w-full max-w-[76px]">
        {tools.map((t) => {
          const isSelected = activeTool === t.type;
          return (
            <button
              key={t.type}
              onClick={() => onSelectTool(t.type)}
              onDoubleClick={() => onDoubleClickTool?.(t.type)}
              title={t.tooltip}
              className={`w-8 h-8 flex items-center justify-center rounded-none transition-none ${
                isSelected
                  ? "bg-[#a0a0a0] border-t-2 border-l-2 border-black border-b border-r border-white shadow-inner"
                  : "bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black hover:bg-[#d4d4d4] active:bg-[#a0a0a0]"
              }`}
            >
              {t.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
};
