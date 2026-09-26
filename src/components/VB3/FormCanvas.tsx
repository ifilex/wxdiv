import React, { useRef, useState, useEffect } from "react";
import { VB3Control, VB3Form, VB3ToolType } from "./types";

interface FormCanvasProps {
  form: VB3Form;
  selectedControlId: string | null;
  activeTool: VB3ToolType;
  onSelectControl: (controlId: string | null) => void;
  onUpdateControlBounds: (
    id: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => void;
  onAddControl: (newControl: VB3Control) => void;
  onDoubleClickControl: (control: VB3Control) => void;
  onUpdateCoordinates?: (x: number, y: number, w: number, h: number) => void;
  onResetTool?: () => void;
}

export const FormCanvas: React.FC<FormCanvasProps> = ({
  form,
  selectedControlId,
  activeTool,
  onSelectControl,
  onUpdateControlBounds,
  onAddControl,
  onDoubleClickControl,
  onUpdateCoordinates,
  onResetTool,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

      const deltaX = Math.round((e.clientX - startX) / 8) * 8; // Snap to 8px grid
      const deltaY = Math.round((e.clientY - startY) / 8) * 8;

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
            newX = initialX + deltaX;
            newW = proposedW;
          }
        }
        if (handle?.includes("n")) {
          const proposedH = initialH - deltaY;
          if (proposedH >= 16) {
            newY = initialY + deltaY;
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
  }, [onUpdateControlBounds, onUpdateCoordinates]);

  // Click on canvas surface to add control or deselect
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isInteracting) return;
    if (activeTool !== "pointer") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const snapX = Math.floor(rawX / 8) * 8;
      const snapY = Math.floor(rawY / 8) * 8;

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
        value: activeTool === "gauge" ? 65 : undefined,
        interval: activeTool === "timer" ? 1000 : undefined,
        shapeType: activeTool === "shape" ? "rect" : undefined,
        embedUrl: activeTool === "webembed" || activeTool === "ole" ? "https://example.com" : undefined,
      };

      onAddControl(newCtrl);
      onResetTool?.();
    } else {
      onSelectControl(null);
    }
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

  // Render individual control based on Visual Basic 3.0 specs
  const renderControl = (ctrl: VB3Control) => {
    const isSelected = ctrl.id === selectedControlId;

    let content: React.ReactNode = null;

    switch (ctrl.type) {
      case "commandbutton":
        content = (
          <button className="w-full h-full bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black flex items-center justify-center font-sans font-semibold text-black text-xs px-1 select-none pointer-events-none active:border-t-2 active:border-l-2 active:border-black active:border-b active:border-r active:border-white shadow-sm">
            {ctrl.caption || ctrl.name}
          </button>
        );
        break;

      case "textbox":
        content = (
          <div className="w-full h-full bg-white border-t border-l border-black border-b border-r border-[#d4d4d4] px-1 flex items-center text-xs font-mono text-black overflow-hidden select-none pointer-events-none">
            {ctrl.text || ctrl.caption || ""}
          </div>
        );
        break;

      case "label":
        content = (
          <div className="w-full h-full flex items-center text-xs font-sans text-black select-none pointer-events-none px-0.5">
            {ctrl.caption || ctrl.name}
          </div>
        );
        break;

      case "picturebox":
        content = (
          <div className="w-full h-full bg-white border-t border-l border-black border-b border-r border-white relative overflow-hidden select-none pointer-events-none">
            <div className="absolute inset-0 bg-[#f8fafc] flex flex-col items-center justify-center text-[10px] text-gray-500 font-mono">
              <span>[PictureBox Canvas]</span>
              <span className="text-[9px] text-gray-400">
                {ctrl.width}x{ctrl.height}
              </span>
            </div>
          </div>
        );
        break;

      case "frame":
        content = (
          <div className="w-full h-full border border-gray-600 relative pt-3 px-1.5 select-none pointer-events-none">
            <span className="absolute -top-2 left-2 bg-[#c0c0c0] px-1 text-[11px] font-sans font-bold text-black">
              {ctrl.caption || ctrl.name}
            </span>
          </div>
        );
        break;

      case "checkbox":
        content = (
          <div className="w-full h-full flex items-center gap-1.5 text-xs font-sans text-black select-none pointer-events-none">
            <div className="w-3.5 h-3.5 border border-black bg-white flex items-center justify-center font-bold text-[10px]">
              ✕
            </div>
            <span className="truncate">{ctrl.caption || ctrl.name}</span>
          </div>
        );
        break;

      case "optionbutton":
        content = (
          <div className="w-full h-full flex items-center gap-1.5 text-xs font-sans text-black select-none pointer-events-none">
            <div className="w-3.5 h-3.5 rounded-full border border-black bg-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
            </div>
            <span className="truncate">{ctrl.caption || ctrl.name}</span>
          </div>
        );
        break;

      case "combobox":
        content = (
          <div className="w-full h-full bg-white border border-black flex items-center justify-between px-1 text-xs select-none pointer-events-none">
            <span className="truncate">{ctrl.text || ctrl.caption || ctrl.name}</span>
            <div className="w-4 h-full bg-gray-300 border-l border-black flex items-center justify-center text-[8px]">
              ▼
            </div>
          </div>
        );
        break;

      case "listbox":
        content = (
          <div className="w-full h-full bg-white border border-black p-0.5 text-xs font-sans select-none pointer-events-none flex flex-col justify-start">
            <div className="bg-[#000080] text-white px-1 text-[11px]">
              Elemento 1 (Seleccionado)
            </div>
            <div className="px-1 text-[11px] text-black">Elemento 2</div>
            <div className="px-1 text-[11px] text-black">Elemento 3</div>
          </div>
        );
        break;

      case "hscrollbar":
        content = (
          <div className="w-full h-full bg-gray-300 border border-black flex items-center justify-between text-[9px] font-bold text-black select-none pointer-events-none">
            <div className="w-4 h-full bg-gray-200 border-r border-black flex items-center justify-center">
              ◀
            </div>
            <div className="w-6 h-full bg-gray-400 border border-gray-600" />
            <div className="w-4 h-full bg-gray-200 border-l border-black flex items-center justify-center">
              ▶
            </div>
          </div>
        );
        break;

      case "vscrollbar":
        content = (
          <div className="w-full h-full bg-gray-300 border border-black flex flex-col items-center justify-between text-[9px] font-bold text-black select-none pointer-events-none">
            <div className="h-4 w-full bg-gray-200 border-b border-black flex items-center justify-center">
              ▲
            </div>
            <div className="h-6 w-full bg-gray-400 border border-gray-600" />
            <div className="h-4 w-full bg-gray-200 border-t border-black flex items-center justify-center">
              ▼
            </div>
          </div>
        );
        break;

      case "timer":
        content = (
          <div className="w-full h-full border border-dashed border-gray-600 bg-yellow-50 flex items-center justify-center gap-1 text-[10px] font-mono text-gray-700 select-none pointer-events-none">
            <span>⏱️</span>
            <span>{ctrl.interval || 1000}ms</span>
          </div>
        );
        break;

      case "grid":
        content = (
          <div className="w-full h-full bg-white border border-black grid grid-cols-3 grid-rows-3 select-none pointer-events-none text-[9px] font-mono">
            <div className="bg-gray-300 border border-gray-400 font-bold p-0.5">ID</div>
            <div className="bg-gray-300 border border-gray-400 font-bold p-0.5">Nombre</div>
            <div className="bg-gray-300 border border-gray-400 font-bold p-0.5">Valor</div>
            <div className="border border-gray-300 p-0.5">1</div>
            <div className="border border-gray-300 p-0.5">Registro A</div>
            <div className="border border-gray-300 p-0.5">100</div>
            <div className="border border-gray-300 p-0.5">2</div>
            <div className="border border-gray-300 p-0.5">Registro B</div>
            <div className="border border-gray-300 p-0.5">250</div>
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

      case "commondialog":
        content = (
          <div className="w-full h-full bg-yellow-100 border border-black flex items-center justify-center gap-1 text-[10px] font-mono text-gray-800 select-none pointer-events-none">
            <span>💾</span>
            <span className="text-[9px] font-bold">Dialog</span>
          </div>
        );
        break;

      default:
        content = (
          <div className="w-full h-full bg-[#e0e0e0] border border-black flex items-center justify-center text-[10px] text-black select-none pointer-events-none">
            {ctrl.name}
          </div>
        );
    }

    // Handles for 8-point sizing
    const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

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
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClickControl(ctrl);
        }}
        className="cursor-move"
      >
        {content}

        {/* 8-Point Black Sizing Squares (Visual Basic 3.0 signature) */}
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
      ref={containerRef}
      onClick={handleCanvasClick}
      style={{
        backgroundColor: form.backColor || "#c0c0c0",
        backgroundImage: "radial-gradient(#707070 1px, transparent 1px)",
        backgroundSize: "8px 8px",
      }}
      className="relative w-full h-full overflow-auto select-none"
    >
      {form.controls.map(renderControl)}
    </div>
  );
};
