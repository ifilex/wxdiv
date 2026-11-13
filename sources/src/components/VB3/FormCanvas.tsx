import React, { useRef, useState, useEffect } from "react";
import { VB3Control, VB3Form, VB3ToolType } from "./types";

interface FormCanvasProps {
  form: VB3Form;
  selectedControlId: string | null;
  activeTool: VB3ToolType;
  scale?: number;
  onSelectControl: (controlId: string | null) => void;
  onUpdateControlBounds: (
    id: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => void;
  onAddControl: (newControl: VB3Control) => void;
  onDoubleClickControl: (control: VB3Control) => void;
  onDoubleClickForm?: () => void;
  onUpdateCoordinates?: (x: number, y: number, w: number, h: number) => void;
  onResetTool?: () => void;
}

export const FormCanvas: React.FC<FormCanvasProps> = ({
  form,
  selectedControlId,
  activeTool,
  scale = 1,
  onSelectControl,
  onUpdateControlBounds,
  onAddControl,
  onDoubleClickControl,
  onDoubleClickForm,
  onUpdateCoordinates,
  onResetTool,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeScale = scale > 0 ? scale : 1;
  const formW = Math.max(200, form.width || 540);
  const formH = Math.max(200, form.height || 440);

  // Dragging and resizing state
  const [isInteracting, setIsInteracting] = useState(false);
  const dragRef = useRef<{
    type: "move" | "resize";
    handle?: string;
    controlId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  const selectedControl = form.controls.find((c) => c.id === selectedControlId);

  // Keep a stable ref to onUpdateCoordinates to prevent infinite re-render cycles
  const onUpdateCoordinatesRef = useRef(onUpdateCoordinates);
  useEffect(() => {
    onUpdateCoordinatesRef.current = onUpdateCoordinates;
  });

  const lastCoordsRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Update toolbar coordinates when selection or bounds actually change
  useEffect(() => {
    const curX = selectedControl ? selectedControl.x : 0;
    const curY = selectedControl ? selectedControl.y : 0;
    const curW = selectedControl ? selectedControl.width : form.width;
    const curH = selectedControl ? selectedControl.height : form.height;

    const prev = lastCoordsRef.current;
    if (!prev || prev.x !== curX || prev.y !== curY || prev.w !== curW || prev.h !== curH) {
      lastCoordsRef.current = { x: curX, y: curY, w: curW, h: curH };
      onUpdateCoordinatesRef.current?.(curX, curY, curW, curH);
    }
  }, [
    selectedControlId,
    selectedControl?.x,
    selectedControl?.y,
    selectedControl?.width,
    selectedControl?.height,
    form.width,
    form.height,
  ]);

  // Global mousemove/mouseup for smooth drag/resize
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const {
        type,
        handle,
        controlId,
        startX,
        startY,
        initialX,
        initialY,
        initialW,
        initialH,
      } = dragRef.current;

      const deltaX = Math.round((e.clientX - startX) / activeScale / 8) * 8; // Snap to 8px grid
      const deltaY = Math.round((e.clientY - startY) / activeScale / 8) * 8;

      if (type === "move") {
        const newX = Math.max(0, initialX + deltaX);
        const newY = Math.max(0, initialY + deltaY);
        onUpdateControlBounds(controlId, {
          x: newX,
          y: newY,
          width: initialW,
          height: initialH,
        });
        onUpdateCoordinates?.(newX, newY, initialW, initialH);
      } else if (type === "resize") {
        let newX = initialX;
        let newY = initialY;
        let newW = initialW;
        let newH = initialH;

        if (handle?.includes("e")) newW = Math.max(16, initialW + deltaX);
        if (handle?.includes("s")) newH = Math.max(16, initialH + deltaY);
        if (handle?.includes("w")) {
          const proposedW = initialW - deltaX;
          if (proposedW >= 16) {
            newX = Math.max(0, initialX + deltaX);
            newW = proposedW;
          }
        }
        if (handle?.includes("n")) {
          const proposedH = initialH - deltaY;
          if (proposedH >= 16) {
            newY = Math.max(0, initialY + deltaY);
            newH = proposedH;
          }
        }

        onUpdateControlBounds(controlId, {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        });
        onUpdateCoordinates?.(newX, newY, newW, newH);
      }
    };

    const handlePointerUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setIsInteracting(false);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onUpdateControlBounds, onUpdateCoordinates, activeScale]);

  // Click on canvas surface to add control or deselect
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only deselect if clicked directly on the canvas background, not on a child control
    if (e.target !== containerRef.current && (e.target as HTMLElement).closest(".cursor-move")) {
      return;
    }
    if (isInteracting) return;
    if (activeTool !== "pointer") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rawX = (e.clientX - rect.left) / activeScale;
      const rawY = (e.clientY - rect.top) / activeScale;
      const snapX = Math.max(0, Math.min(formW - 24, Math.floor(rawX / 8) * 8));
      const snapY = Math.max(0, Math.min(formH - 24, Math.floor(rawY / 8) * 8));

      const count = form.controls.filter((c) => c.type === activeTool).length + 1;
      const namePrefix =
        activeTool === "commandbutton"
          ? "Command"
          : activeTool === "textbox"
          ? "Text"
          : activeTool === "label"
          ? "Label"
          : activeTool === "picturebox"
          ? "Picture"
          : activeTool.charAt(0).toUpperCase() + activeTool.slice(1);

      const defaultW =
        activeTool === "commandbutton"
          ? 104
          : activeTool === "textbox"
          ? 140
          : activeTool === "label"
          ? 100
          : activeTool === "picturebox"
          ? 180
          : activeTool === "frame"
          ? 200
          : activeTool === "grid"
          ? 240
          : activeTool === "webembed" || activeTool === "ole"
          ? 220
          : activeTool === "gauge"
          ? 160
          : activeTool === "canvas5"
          ? 240
          : activeTool === "herobanner"
          ? 340
          : activeTool === "card"
          ? 220
          : activeTool === "chart"
          ? 220
          : activeTool === "switch"
          ? 64
          : activeTool === "slider"
          ? 160
          : activeTool === "badge"
          ? 90
          : activeTool === "progressbar"
          ? 180
          : activeTool === "jscode"
          ? 180
          : activeTool === "hscrollbar"
          ? 160
          : activeTool === "vscrollbar"
          ? 22
          : activeTool === "timer"
          ? 40
          : activeTool === "commondialog"
          ? 40
          : activeTool === "drivelistbox" || activeTool === "dirlistbox" || activeTool === "filelistbox"
          ? 150
          : activeTool === "combobox"
          ? 140
          : activeTool === "listbox"
          ? 130
          : activeTool === "shape"
          ? 100
          : activeTool === "line"
          ? 140
          : activeTool === "image"
          ? 120
          : activeTool === "data"
          ? 180
          : activeTool === "statmetric"
          ? 180
          : activeTool === "pricingcard"
          ? 200
          : activeTool === "avatar"
          ? 64
          : activeTool === "accordion"
          ? 260
          : activeTool === "colorpicker"
          ? 180
          : activeTool === "videoplayer"
          ? 240
          : activeTool === "html5editor"
          ? 240
          : 100;

      const defaultH =
        activeTool === "commandbutton"
          ? 32
          : activeTool === "textbox"
          ? 26
          : activeTool === "label"
          ? 20
          : activeTool === "picturebox"
          ? 120
          : activeTool === "frame"
          ? 140
          : activeTool === "grid"
          ? 120
          : activeTool === "webembed" || activeTool === "ole"
          ? 130
          : activeTool === "gauge"
          ? 28
          : activeTool === "canvas5"
          ? 140
          : activeTool === "herobanner"
          ? 120
          : activeTool === "card"
          ? 130
          : activeTool === "chart"
          ? 120
          : activeTool === "switch"
          ? 30
          : activeTool === "slider"
          ? 28
          : activeTool === "badge"
          ? 24
          : activeTool === "progressbar"
          ? 22
          : activeTool === "jscode"
          ? 48
          : activeTool === "statmetric"
          ? 84
          : activeTool === "pricingcard"
          ? 220
          : activeTool === "avatar"
          ? 64
          : activeTool === "accordion"
          ? 88
          : activeTool === "colorpicker"
          ? 70
          : activeTool === "videoplayer"
          ? 140
          : activeTool === "html5editor"
          ? 130
          : activeTool === "hscrollbar"
          ? 20
          : activeTool === "vscrollbar"
          ? 140
          : activeTool === "timer"
          ? 40
          : activeTool === "commondialog"
          ? 40
          : activeTool === "dirlistbox" || activeTool === "filelistbox"
          ? 100
          : activeTool === "combobox"
          ? 26
          : activeTool === "listbox"
          ? 90
          : activeTool === "shape"
          ? 80
          : activeTool === "line"
          ? 16
          : activeTool === "image"
          ? 90
          : activeTool === "data"
          ? 30
          : 28;

      const newCtrl: VB3Control = {
        id: `ctrl_${Date.now()}`,
        name: `${namePrefix}${count}`,
        type: activeTool,
        x: snapX,
        y: snapY,
        width: defaultW,
        height: defaultH,
        caption: `${namePrefix}${count}`,
        text: activeTool === "textbox" ? `${namePrefix}${count}` : undefined,
        enabled: true,
        visible: true,
        value: activeTool === "gauge" || activeTool === "progressbar" || activeTool === "slider" ? 65 : activeTool === "switch" ? true : undefined,
        interval: activeTool === "timer" ? 1000 : undefined,
        shapeType: activeTool === "shape" ? "rect" : undefined,
        embedUrl: activeTool === "webembed" || activeTool === "ole" ? "https://example.com" : undefined,
        chartType: activeTool === "chart" ? "bar" : undefined,
        chartData: activeTool === "chart" ? [35, 70, 45, 90, 60] : undefined,
        badgeVariant: activeTool === "badge" ? "primary" : undefined,
        jsCode: activeTool === "jscode" ? "// Código JavaScript & HTML5\nconsole.log('Componente JS activo');" : undefined,
      };

      onAddControl(newCtrl);
      onResetTool?.();
    } else {
      onSelectControl(null);
    }
  };

  // Immediate touch/click on form canvas: instantly selects Form and updates properties!
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If clicked on a child control, let handleControlPointerDown handle it
    if (e.target !== containerRef.current && (e.target as HTMLElement).closest(".cursor-move")) {
      return;
    }
    onSelectControl(null);
    onUpdateCoordinates?.(0, 0, form.width, form.height);
  };

  // Start moving control
  const handleControlPointerDown = (
    e: React.PointerEvent,
    control: VB3Control
  ) => {
    e.stopPropagation();
    onSelectControl(control.id);
    setIsInteracting(true);

    dragRef.current = {
      type: "move",
      controlId: control.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: control.x,
      initialY: control.y,
      initialW: control.width,
      initialH: control.height,
    };
  };

  // Start resizing control
  const handleResizePointerDown = (
    e: React.PointerEvent,
    control: VB3Control,
    handle: string
  ) => {
    e.stopPropagation();
    setIsInteracting(true);

    dragRef.current = {
      type: "resize",
      handle,
      controlId: control.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: control.x,
      initialY: control.y,
      initialW: control.width,
      initialH: control.height,
    };
  };

  // Render individual control based on Visual MDI engine specs
  const renderControl = (ctrl: VB3Control) => {
    const isSelected = ctrl.id === selectedControlId;

    let content: React.ReactNode = null;

    switch (ctrl.type) {
      case "commandbutton":
        content = (
          <button
            type="button"
            className="w-full h-full bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black flex items-center justify-center font-sans font-semibold text-black text-xs px-1.5 select-none pointer-events-none overflow-hidden shadow-sm"
          >
            <span className="truncate w-full text-center leading-tight">
              {ctrl.caption || ctrl.name}
            </span>
          </button>
        );
        break;

      case "textbox":
        content = (
          <div className="w-full h-full bg-white border-t border-l border-black border-b border-r border-[#d4d4d4] px-1.5 flex items-center text-xs font-mono text-black overflow-hidden select-none pointer-events-none min-w-0">
            <span className="truncate w-full">{ctrl.text || ctrl.caption || ""}</span>
          </div>
        );
        break;

      case "label":
        content = (
          <div className="w-full h-full flex items-center text-xs font-sans text-black select-none pointer-events-none px-0.5 overflow-hidden min-w-0">
            <span className="truncate w-full leading-tight">{ctrl.caption || ctrl.name}</span>
          </div>
        );
        break;

      case "picturebox":
        content = (
          <div className="w-full h-full bg-white border-t border-l border-black border-b border-r border-white relative overflow-hidden select-none pointer-events-none">
            <div className="absolute inset-0 bg-[#f8fafc] flex flex-col items-center justify-center p-1 text-[10px] text-gray-500 font-mono overflow-hidden">
              <span className="truncate max-w-full">[PictureBox]</span>
              <span className="text-[9px] text-gray-400 truncate max-w-full">
                {ctrl.width}×{ctrl.height}
              </span>
            </div>
          </div>
        );
        break;

      case "frame":
        content = (
          <div className="w-full h-full border border-gray-600 relative pt-3 px-1.5 select-none pointer-events-none overflow-hidden">
            <span className="inline-block max-w-full truncate bg-[#c0c0c0]/90 px-1 text-[11px] font-sans font-bold text-black leading-tight">
              {ctrl.caption || ctrl.name}
            </span>
          </div>
        );
        break;

      case "checkbox":
        content = (
          <div className="w-full h-full flex items-center gap-1.5 text-xs font-sans text-black select-none pointer-events-none overflow-hidden min-w-0">
            <div className="w-3.5 h-3.5 flex-shrink-0 border border-black bg-white flex items-center justify-center font-bold text-[10px]">
              ✓
            </div>
            <span className="truncate min-w-0">{ctrl.caption || ctrl.name}</span>
          </div>
        );
        break;

      case "optionbutton":
        content = (
          <div className="w-full h-full flex items-center gap-1.5 text-xs font-sans text-black select-none pointer-events-none overflow-hidden min-w-0">
            <div className="w-3.5 h-3.5 flex-shrink-0 rounded-full border border-black bg-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
            </div>
            <span className="truncate min-w-0">{ctrl.caption || ctrl.name}</span>
          </div>
        );
        break;

      case "combobox":
        content = (
          <div className="w-full h-full bg-white border border-black flex items-center justify-between px-1 text-xs select-none pointer-events-none overflow-hidden min-w-0">
            <span className="truncate min-w-0 flex-1">{ctrl.text || ctrl.caption || ctrl.name}</span>
            <div className="w-4 h-full flex-shrink-0 bg-gray-300 border-l border-black flex items-center justify-center text-[8px]">
              ▼
            </div>
          </div>
        );
        break;

      case "listbox":
        content = (
          <div className="w-full h-full bg-white border border-black p-0.5 text-xs font-sans select-none pointer-events-none flex flex-col justify-start overflow-hidden">
            <div className="bg-[#000080] text-white px-1 text-[11px] truncate">
              Elemento 1
            </div>
            <div className="px-1 text-[11px] text-black truncate">Elemento 2</div>
            <div className="px-1 text-[11px] text-black truncate">Elemento 3</div>
          </div>
        );
        break;

      case "hscrollbar":
        content = (
          <div className="w-full h-full bg-gray-300 border border-black flex items-center justify-between text-[9px] font-bold text-black select-none pointer-events-none overflow-hidden">
            <div className="w-4 h-full bg-gray-200 border-r border-black flex items-center justify-center flex-shrink-0">
              ◀
            </div>
            <div className="w-6 h-full bg-gray-400 border border-gray-600 flex-shrink-0" />
            <div className="w-4 h-full bg-gray-200 border-l border-black flex items-center justify-center flex-shrink-0">
              ▶
            </div>
          </div>
        );
        break;

      case "vscrollbar":
        content = (
          <div className="w-full h-full bg-gray-300 border border-black flex flex-col items-center justify-between text-[9px] font-bold text-black select-none pointer-events-none overflow-hidden">
            <div className="h-4 w-full bg-gray-200 border-b border-black flex items-center justify-center flex-shrink-0">
              ▲
            </div>
            <div className="h-6 w-full bg-gray-400 border border-gray-600 flex-shrink-0" />
            <div className="h-4 w-full bg-gray-200 border-t border-black flex items-center justify-center flex-shrink-0">
              ▼
            </div>
          </div>
        );
        break;

      case "timer":
        content = (
          <div className="w-full h-full border border-dashed border-gray-600 bg-yellow-50 flex items-center justify-center gap-1 px-0.5 text-[10px] font-mono text-gray-700 select-none pointer-events-none overflow-hidden">
            <span className="truncate">{ctrl.interval || 1000}ms</span>
          </div>
        );
        break;

      case "grid":
        content = (
          <div className="w-full h-full bg-white border border-black grid grid-cols-3 grid-rows-3 select-none pointer-events-none text-[9px] font-mono overflow-hidden">
            <div className="bg-gray-300 border border-gray-400 font-bold p-0.5 truncate">ID</div>
            <div className="bg-gray-300 border border-gray-400 font-bold p-0.5 truncate">Nombre</div>
            <div className="bg-gray-300 border border-gray-400 font-bold p-0.5 truncate">Valor</div>
            <div className="border border-gray-300 p-0.5 truncate">1</div>
            <div className="border border-gray-300 p-0.5 truncate">Reg A</div>
            <div className="border border-gray-300 p-0.5 truncate">100</div>
            <div className="border border-gray-300 p-0.5 truncate">2</div>
            <div className="border border-gray-300 p-0.5 truncate">Reg B</div>
            <div className="border border-gray-300 p-0.5 truncate">250</div>
          </div>
        );
        break;

      case "gauge": {
        const val = typeof ctrl.value === "number" ? Math.min(100, Math.max(0, ctrl.value)) : 60;
        content = (
          <div className="w-full h-full bg-white border border-black p-0.5 flex items-center select-none pointer-events-none relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-700 to-sky-600 transition-all flex items-center justify-end pr-1"
              style={{ width: `${val}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono text-slate-800 drop-shadow-sm">
              {val}% {ctrl.caption ? `• ${ctrl.caption}` : ""}
            </span>
          </div>
        );
        break;
      }

      case "drivelistbox":
        content = (
          <div className="w-full h-full bg-white border border-black flex items-center justify-between px-1 text-xs select-none pointer-events-none">
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span className="text-[10px]">💾</span>
              <span>c: [MS-DOS_6]</span>
            </div>
            <div className="w-4 h-full bg-gray-300 border-l border-black flex items-center justify-center text-[8px]">
              ▼
            </div>
          </div>
        );
        break;

      case "dirlistbox":
        content = (
          <div className="w-full h-full bg-white border border-black p-1 text-xs font-sans select-none pointer-events-none overflow-hidden flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[11px] text-black">
              <span>📁</span> <span>c:\</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-black pl-3">
              <span>📁</span> <span>vb3</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] bg-[#000080] text-white pl-6">
              <span>📂</span> <span>projects</span>
            </div>
          </div>
        );
        break;

      case "filelistbox":
        content = (
          <div className="w-full h-full bg-white border border-black p-1 text-xs font-mono select-none pointer-events-none overflow-hidden flex flex-col gap-0.5">
            <div className="bg-[#000080] text-white px-1 text-[11px]">form1.frm</div>
            <div className="text-black px-1 text-[11px]">project1.mak</div>
            <div className="text-black px-1 text-[11px]">readme.txt</div>
          </div>
        );
        break;

      case "shape":
        content = (
          <div
            className={`w-full h-full border-2 border-black select-none pointer-events-none ${
              ctrl.shapeType === "circle" || ctrl.shapeType === "oval"
                ? "rounded-full"
                : ctrl.shapeType === "roundrect"
                ? "rounded-lg"
                : "rounded-none"
            }`}
          />
        );
        break;

      case "line":
        content = (
          <div className="w-full h-full relative select-none pointer-events-none flex items-center justify-center">
            <div className="w-full h-0.5 bg-black" />
          </div>
        );
        break;

      case "image":
        content = (
          <div className="w-full h-full bg-white border border-dashed border-gray-500 flex flex-col items-center justify-center text-[10px] text-gray-600 select-none pointer-events-none overflow-hidden">
            <span>🖼️</span>
            <span className="text-[9px] truncate">{ctrl.caption || ctrl.name}</span>
          </div>
        );
        break;

      case "data":
        content = (
          <div className="w-full h-full bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black flex items-center justify-between px-1 text-xs select-none pointer-events-none">
            <div className="flex items-center gap-0.5 text-[8px] font-bold font-mono">
              <span className="px-1 bg-white border border-black">|◀</span>
              <span className="px-1 bg-white border border-black">◀</span>
            </div>
            <span className="font-bold text-[10px] truncate px-1">{ctrl.caption || ctrl.name}</span>
            <div className="flex items-center gap-0.5 text-[8px] font-bold font-mono">
              <span className="px-1 bg-white border border-black">▶</span>
              <span className="px-1 bg-white border border-black">▶|</span>
            </div>
          </div>
        );
        break;

      case "webembed":
      case "ole":
        content = (
          <div className="w-full h-full bg-[#0d1322] border border-orange-500/80 flex flex-col items-center justify-between p-1 text-[10px] select-none pointer-events-none relative overflow-hidden shadow-inner font-mono text-slate-200">
            <div className="w-full bg-[#1e293b] text-orange-400 px-1 py-0.5 text-[8px] flex items-center justify-between border-b border-slate-700">
              <span className="flex items-center gap-1 font-bold">
                <span>&lt;/&gt;</span>
                <span className="truncate">{ctrl.caption || "WebEmbed (HTML5/JS)"}</span>
              </span>
              <span className="text-[7px] text-cyan-400 font-mono truncate max-w-[90px]">
                {ctrl.embedUrl || "iframe/dom"}
              </span>
            </div>
            <div className="flex-1 w-full flex flex-col items-center justify-center p-1 text-center">
              <div className="text-[10px] font-bold text-cyan-300">
                🌐 HTML5 / JS Embed
              </div>
              <div className="text-[8px] text-slate-400 mt-0.5 truncate max-w-full">
                {ctrl.embedUrl ? ctrl.embedUrl : ctrl.embedHtml ? "[HTML5 Render]" : "Canvas 2D / WebGL / Iframe"}
              </div>
            </div>
            <div className="w-full text-right text-[7px] text-orange-400/80">
              HTML5 Component Active
            </div>
          </div>
        );
        break;

      case "canvas5":
        content = (
          <div className="w-full h-full bg-[#030712] border border-emerald-500/80 rounded-xs flex flex-col overflow-hidden select-none pointer-events-none p-1">
            <div className="flex items-center justify-between text-[8px] font-mono text-emerald-400 border-b border-emerald-900/60 pb-0.5">
              <span>🎨 Canvas HTML5 / JS</span>
              <span>{ctrl.width}x{ctrl.height}</span>
            </div>
            <div className="flex-1 flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:8px_8px]" />
              <span className="text-[10px] font-bold text-emerald-300 font-mono z-10">{ctrl.caption || ctrl.name}</span>
            </div>
          </div>
        );
        break;

      case "herobanner":
        content = (
          <div
            style={{
              background: ctrl.gradient || "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
              fontFamily: ctrl.fontName || "Outfit, sans-serif",
            }}
            className="w-full h-full border border-indigo-400/40 rounded-lg p-2.5 text-white flex flex-col justify-center select-none pointer-events-none shadow-lg overflow-hidden relative"
          >
            <div className="text-[8px] font-bold tracking-widest text-indigo-300 uppercase mb-0.5">
              ★ HERO SECTION LANDING
            </div>
            <h1 className="text-xs font-black leading-tight truncate">
              {ctrl.caption || "Construye tu Landing Moderna"}
            </h1>
            <p className="text-[8px] text-indigo-200/80 line-clamp-1 mt-0.5">
              {ctrl.text || "Soluciones interactivas con tipografía Google Fonts y HTML5"}
            </p>
            <div className="mt-1.5 inline-flex items-center gap-1 bg-white text-indigo-950 font-bold text-[8px] px-2 py-0.5 rounded shadow-sm w-fit">
              <span>Comenzar →</span>
            </div>
          </div>
        );
        break;

      case "card":
        content = (
          <div
            style={{
              backgroundColor: ctrl.backColor || "#ffffff",
              fontFamily: ctrl.fontName || "Inter, sans-serif",
            }}
            className="w-full h-full border border-slate-300/80 rounded-lg p-2 shadow-md flex flex-col justify-between select-none pointer-events-none text-slate-900 overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] truncate">{ctrl.caption || ctrl.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                {ctrl.text || "Contenedor moderno para aterrizaje y paneles de control."}
              </p>
            </div>
            <div className="text-[7px] font-mono text-slate-400 pt-0.5 border-t border-slate-100 flex justify-between">
              <span>Card UI</span>
              <span>Responsive</span>
            </div>
          </div>
        );
        break;

      case "chart":
        content = (
          <div className="w-full h-full bg-[#0a0f1d] border border-cyan-500/40 rounded-md p-1.5 flex flex-col select-none pointer-events-none overflow-hidden">
            <div className="flex items-center justify-between text-[8px] font-mono text-cyan-300 mb-0.5">
              <span className="font-bold uppercase tracking-wider">{ctrl.caption || "Gráfico HTML5"}</span>
              <span className="text-emerald-400">+31.2%</span>
            </div>
            <div className="flex-1 flex items-end gap-1 px-1 pb-0.5 pt-1">
              {[40, 75, 55, 90, 65, 85, 95].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                  <div
                    style={{ height: `${h}%` }}
                    className="w-full rounded-t-xs bg-gradient-to-t from-cyan-600 to-sky-400"
                  />
                  <span className="text-[6px] text-slate-500 font-mono">D{i+1}</span>
                </div>
              ))}
            </div>
          </div>
        );
        break;

      case "switch":
        content = (
          <div className="w-full h-full flex items-center justify-between px-1 bg-transparent select-none pointer-events-none">
            <span className="text-xs font-semibold text-black truncate mr-1">{ctrl.caption || ctrl.name}</span>
            <div className={`w-8 h-4 rounded-full transition-colors p-0.5 flex items-center ${ctrl.value !== false ? "bg-emerald-600 justify-end" : "bg-slate-400 justify-start"}`}>
              <div className="w-3 h-3 rounded-full bg-white shadow-md" />
            </div>
          </div>
        );
        break;

      case "slider":
        content = (
          <div className="w-full h-full flex flex-col justify-center px-1 select-none pointer-events-none overflow-hidden min-w-0">
            <div className="flex justify-between gap-1 text-[8px] font-mono text-gray-700 mb-0.5 min-w-0">
              <span className="truncate min-w-0">{ctrl.caption || ctrl.name}</span>
              <span className="font-bold text-blue-700 flex-shrink-0">{ctrl.value ?? 50}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-300 rounded-full relative flex items-center">
              <div style={{ width: `${ctrl.value ?? 50}%` }} className="h-full bg-blue-600 rounded-full" />
              <div
                style={{ left: `calc(${ctrl.value ?? 50}% - 4px)` }}
                className="absolute w-2.5 h-2.5 rounded-full bg-white border border-blue-700 shadow-xs"
              />
            </div>
          </div>
        );
        break;

      case "badge":
        content = (
          <div className="w-full h-full flex items-center justify-center select-none pointer-events-none overflow-hidden px-0.5">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-purple-700 text-white shadow-xs truncate max-w-full">
              {ctrl.caption || "DESTACADO"}
            </span>
          </div>
        );
        break;

      case "progressbar":
        content = (
          <div className="w-full h-full flex flex-col justify-center px-1 select-none pointer-events-none">
            <div className="w-full h-3.5 bg-gray-200 border border-gray-400 rounded-sm overflow-hidden p-0.5 relative flex items-center">
              <div
                style={{ width: `${ctrl.value ?? 70}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 rounded-xs transition-all"
              />
              <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-gray-800 drop-shadow-xs">
                {ctrl.value ?? 70}%
              </span>
            </div>
          </div>
        );
        break;

      case "jscode":
        content = (
          <div className="w-full h-full bg-[#18181b] border border-amber-500/70 rounded-xs p-1 flex items-center gap-1.5 text-amber-300 font-mono text-[9px] select-none pointer-events-none overflow-hidden">
            <span className="px-1 py-0.5 bg-amber-400 text-black font-black text-[8px] rounded-xs">JS</span>
            <div className="flex-1 truncate">
              <span className="font-bold">{ctrl.name}</span>
              <span className="text-gray-400 text-[8px] block truncate">{ctrl.jsCode || "// Script JS en vivo"}</span>
            </div>
          </div>
        );
        break;

      case "statmetric":
        content = (
          <div className="w-full h-full bg-[#0b1329] border border-cyan-500/40 rounded-sm p-2 flex flex-col justify-between text-white select-none pointer-events-none shadow-md overflow-hidden relative">
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider truncate">{ctrl.caption || "INGRESOS MRR"}</span>
              <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/60">+18.4%</span>
            </div>
            <div className="text-base font-extrabold font-mono text-cyan-300">
              {ctrl.text || "$24,850"}
            </div>
            {/* Sparkline mini-graph */}
            <div className="w-full h-2.5 flex items-end gap-1">
              <div className="w-1/6 h-1/2 bg-cyan-600/70 rounded-xs" />
              <div className="w-1/6 h-2/3 bg-cyan-500/80 rounded-xs" />
              <div className="w-1/6 h-1/3 bg-cyan-600/70 rounded-xs" />
              <div className="w-1/6 h-4/5 bg-cyan-400 rounded-xs" />
              <div className="w-1/6 h-3/5 bg-cyan-500 rounded-xs" />
              <div className="w-1/6 h-full bg-emerald-400 rounded-xs" />
            </div>
          </div>
        );
        break;

      case "pricingcard":
        content = (
          <div className="w-full h-full bg-gradient-to-b from-[#0f172a] to-[#1e293b] border-2 border-indigo-500/60 rounded-md p-2.5 flex flex-col justify-between text-white select-none pointer-events-none shadow-xl overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-indigo-300 uppercase tracking-wider">{ctrl.caption || "PLAN PRO"}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-indigo-500 text-white">POPULAR</span>
              </div>
              <div className="text-lg font-black text-white font-mono mb-2">
                {ctrl.text || "$29"} <span className="text-[10px] font-normal text-slate-400">/ mes</span>
              </div>
              <div className="space-y-1 text-[9px] text-slate-300">
                <div className="flex items-center gap-1 text-emerald-400 font-medium">✓ Dominio Custom & SSL</div>
                <div className="flex items-center gap-1 text-emerald-400 font-medium">✓ Base de Datos SQL Cloud</div>
                <div className="flex items-center gap-1 text-emerald-400 font-medium">✓ Soporte JavaScript 60 FPS</div>
              </div>
            </div>
            <button className="w-full py-1 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-[10px] font-bold rounded shadow-md mt-2">
              Comenzar Ahora →
            </button>
          </div>
        );
        break;

      case "avatar":
        content = (
          <div className="w-full h-full flex items-center justify-center select-none pointer-events-none relative">
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs uppercase overflow-hidden">
              {ctrl.caption ? ctrl.caption.slice(0, 2).toUpperCase() : "WX"}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
        );
        break;

      case "accordion":
        content = (
          <div className="w-full h-full bg-[#0d1527] border border-slate-700 rounded-sm p-2 flex flex-col justify-between text-white select-none pointer-events-none shadow-sm overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
              <span className="truncate">{ctrl.caption || "¿Cómo integrar JavaScript y HTML5?"}</span>
              <span className="text-slate-400 text-xs font-mono">▼</span>
            </div>
            <div className="text-[9px] text-slate-300 leading-snug line-clamp-2 mt-1">
              {ctrl.text || "WXDIV 3.0 compila tanto scripts DIV clásicos como código nativo HTML5 Canvas & WebGL en tiempo real a 60 FPS."}
            </div>
          </div>
        );
        break;

      case "colorpicker":
        content = (
          <div className="w-full h-full bg-[#18181b] border border-slate-700 rounded-xs p-1.5 flex flex-col justify-between select-none pointer-events-none text-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono min-w-0">
              <span className="text-gray-400 truncate min-w-0">{ctrl.caption || "Color"}</span>
              <span className="text-cyan-400 font-bold flex-shrink-0">{ctrl.value || "#06b6d4"}</span>
            </div>
            <div className="w-full h-4 rounded-xs bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 to-purple-500 border border-slate-600 relative flex items-center">
              <div className="w-1.5 h-full bg-white border border-black shadow-md rounded-xs ml-4" />
            </div>
          </div>
        );
        break;

      case "videoplayer":
        content = (
          <div className="w-full h-full bg-black border border-slate-800 rounded-xs relative flex flex-col justify-between p-1.5 select-none pointer-events-none overflow-hidden text-white shadow-lg">
            <div className="flex items-center justify-between gap-1 text-[8px] text-gray-400 min-w-0">
              <span className="truncate font-mono min-w-0">{ctrl.caption || "HTML5 Media Player"}</span>
              <span className="px-1 py-0.2 rounded bg-rose-600 text-white font-bold text-[7px] flex-shrink-0">LIVE</span>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white text-xs pl-0.5 shadow-md">
                ▶
              </div>
            </div>
            <div className="w-full flex items-center gap-1.5 text-[8px] font-mono text-gray-300">
              <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="w-2/5 h-full bg-cyan-400" />
              </div>
              <span>01:24</span>
            </div>
          </div>
        );
        break;

      case "html5editor":
        content = (
          <div className="w-full h-full bg-[#0a0f1d] border border-cyan-500/60 rounded-xs p-1.5 flex flex-col justify-between text-cyan-300 font-mono text-[9px] select-none pointer-events-none overflow-hidden shadow-md">
            <div className="flex items-center justify-between gap-1 border-b border-cyan-900/60 pb-0.5 min-w-0">
              <span className="font-bold flex items-center gap-1 truncate min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="truncate">HTML5 Canvas</span>
              </span>
              <span className="text-[8px] text-slate-400 flex-shrink-0">60 FPS</span>
            </div>
            <div className="text-[8px] text-emerald-400/90 font-mono line-clamp-3 break-words">
              {ctrl.jsCode || "// Código HTML5 interactivo\ncanvas.render();"}
            </div>
            <div className="text-[7px] text-slate-500 truncate">
              {ctrl.caption || ctrl.name}
            </div>
          </div>
        );
        break;

      case "commondialog":
        content = (
          <div className="w-full h-full bg-yellow-100 border border-black flex items-center justify-center gap-1 px-1 text-[10px] font-mono text-gray-800 select-none pointer-events-none overflow-hidden">
            <span className="text-[9px] font-bold truncate">{ctrl.caption || "Dialog"}</span>
          </div>
        );
        break;

      default:
        content = (
          <div className="w-full h-full bg-[#e0e0e0] border border-black flex items-center justify-center px-1 text-[10px] text-black select-none pointer-events-none overflow-hidden">
            <span className="truncate">{ctrl.caption || ctrl.name}</span>
          </div>
        );
    }

    return (
      <div
        key={ctrl.id}
        style={{
          position: "absolute",
          left: `${ctrl.x}px`,
          top: `${ctrl.y}px`,
          width: `${ctrl.width}px`,
          height: `${ctrl.height}px`,
        }}
        onPointerDown={(e) => handleControlPointerDown(e, ctrl)}
        onClick={(e) => {
          e.stopPropagation();
          onSelectControl(ctrl.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClickControl(ctrl);
        }}
        className="cursor-move overflow-visible touch-none"
      >
        <div className="w-full h-full overflow-hidden">
          {content}
        </div>

        {/* 8-Point Black Sizing Squares (Visual MDI engine signature) */}
        {isSelected && (
          <>
            {/* Outline selection border */}
            <div className="absolute inset-0 border border-black pointer-events-none" />

            {/* Top-Left */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, ctrl, "nw")}
              className="absolute -top-1 -left-1 w-2 h-2 bg-black border border-white cursor-nwse-resize z-20"
            />
            {/* Top-Mid */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, ctrl, "n")}
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border border-white cursor-ns-resize z-20"
            />
            {/* Top-Right */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, ctrl, "ne")}
              className="absolute -top-1 -right-1 w-2 h-2 bg-black border border-white cursor-nesw-resize z-20"
            />
            {/* Mid-Right */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, ctrl, "e")}
              className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-black border border-white cursor-ew-resize z-20"
            />
            {/* Bottom-Right */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, ctrl, "se")}
              className="absolute -bottom-1 -right-1 w-2 h-2 bg-black border border-white cursor-nwse-resize z-20"
            />
            {/* Bottom-Mid */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, ctrl, "s")}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border border-white cursor-ns-resize z-20"
            />
            {/* Bottom-Left */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, ctrl, "sw")}
              className="absolute -bottom-1 -left-1 w-2 h-2 bg-black border border-white cursor-nesw-resize z-20"
            />
            {/* Mid-Left */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, ctrl, "w")}
              className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black border border-white cursor-ew-resize z-20"
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: `${Math.round(formW * activeScale)}px`,
        height: `${Math.round(formH * activeScale)}px`,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        ref={containerRef}
        onPointerDown={handleCanvasPointerDown}
        onClick={handleCanvasClick}
        onDoubleClick={(e) => {
          if (e.target === containerRef.current) {
            onDoubleClickForm?.();
          }
        }}
        style={{
          width: `${formW}px`,
          height: `${formH}px`,
          transform: activeScale !== 1 ? `scale(${activeScale})` : undefined,
          transformOrigin: "top left",
          backgroundColor: form.backColor || "#f1f5f9",
          backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
        className="relative overflow-hidden select-none"
      >
        {form.controls.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none select-none">
            <div className="bg-white/95 border border-dashed border-slate-400 rounded-xl px-5 py-4 max-w-xs shadow-2xs">
              <p className="text-xs font-bold text-slate-800">
                Lienzo del Formulario ({formW} × {formH})
              </p>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Elige un elemento en <b>Controles</b> y toca aquí (o haz doble clic en un control) para agregarlo y moverlo libremente.
              </p>
            </div>
          </div>
        )}
        {form.controls.map(renderControl)}
      </div>
    </div>
  );
};
