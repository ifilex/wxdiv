import React, { useRef, useEffect } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { WindowConfig } from "./types";

interface WindowFrameProps {
  window: WindowConfig;
  icon: React.ReactNode;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onUpdateBounds: (bounds: { x: number; y: number; width: number; height: number }) => void;
  desktopBounds: { width: number; height: number };
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  window: win,
  icon,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onUpdateBounds,
  desktopBounds,
  children,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const resizeRef = useRef<{
    isResizing: boolean;
    edge: "corner" | "right" | "bottom" | null;
    startX: number;
    startY: number;
    initialW: number;
    initialH: number;
  }>({ isResizing: false, edge: null, startX: 0, startY: 0, initialW: 0, initialH: 0 });

  // Titlebar drag handlers
  const handleTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only left click
    if (e.button !== 0 || win.isMaximized) return;
    onFocus();

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: win.x,
      initialY: win.y,
    };
  };

  const handleTitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || win.isMaximized) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const maxX = Math.max(0, desktopBounds.width - 80);
    const maxY = Math.max(0, desktopBounds.height - 40);

    const newX = Math.min(Math.max(0, dragRef.current.initialX + deltaX), maxX);
    const newY = Math.min(Math.max(0, dragRef.current.initialY + deltaY), maxY);

    onUpdateBounds({
      x: newX,
      y: newY,
      width: win.width,
      height: win.height,
    });
  };

  const handleTitlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Resize handlers
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    edge: "corner" | "right" | "bottom"
  ) => {
    if (e.button !== 0 || win.isMaximized) return;
    e.stopPropagation();
    onFocus();

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    resizeRef.current = {
      isResizing: true,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      initialW: win.width,
      initialH: win.height,
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current.isResizing || win.isMaximized) return;

    const deltaX = e.clientX - resizeRef.current.startX;
    const deltaY = e.clientY - resizeRef.current.startY;
    const edge = resizeRef.current.edge;

    let newW = win.width;
    let newH = win.height;

    const maxW = Math.max(win.minWidth, desktopBounds.width - win.x);
    const maxH = Math.max(win.minHeight, desktopBounds.height - win.y);

    if (edge === "corner" || edge === "right") {
      newW = Math.min(Math.max(win.minWidth, resizeRef.current.initialW + deltaX), maxW);
    }
    if (edge === "corner" || edge === "bottom") {
      newH = Math.min(Math.max(win.minHeight, resizeRef.current.initialH + deltaY), maxH);
    }

    onUpdateBounds({
      x: win.x,
      y: win.y,
      width: newW,
      height: newH,
    });
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current.isResizing) {
      resizeRef.current.isResizing = false;
      resizeRef.current.edge = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  if (!win.isOpen || win.isMinimized) {
    return null;
  }

  // Maximize styling vs windowed positioning
  const style: React.CSSProperties = win.isMaximized
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: win.zIndex,
      }
    : {
        position: "absolute",
        top: `${win.y}px`,
        left: `${win.x}px`,
        width: `${win.width}px`,
        height: `${win.height}px`,
        zIndex: win.zIndex,
      };

  return (
    <div
      ref={frameRef}
      id={`window-${win.id}`}
      style={style}
      onMouseDown={onFocus}
      className={`flex flex-col bg-[#070b14] overflow-hidden select-none transition-shadow ${
        win.isMaximized
          ? "rounded-none border-0"
          : `rounded-lg border ${
              isActive
                ? "border-cyan-500/80 shadow-2xl shadow-cyan-950/50 ring-1 ring-cyan-500/30"
                : "border-slate-800 shadow-xl opacity-95 hover:opacity-100"
            }`
      }`}
    >
      {/* Window Title Bar */}
      <div
        id={`titlebar-${win.id}`}
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        onDoubleClick={onToggleMaximize}
        className={`h-9 px-2.5 flex items-center justify-between cursor-move flex-shrink-0 border-b transition-colors ${
          isActive
            ? "bg-gradient-to-r from-slate-900 via-[#0c162d] to-slate-900 border-cyan-500/40 text-slate-100"
            : "bg-[#090e1c] border-slate-800 text-slate-400 hover:text-slate-200"
        }`}
      >
        {/* Title and Icon */}
        <div className="flex items-center gap-2 min-w-0 pr-2 pointer-events-none">
          <div
            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
              isActive ? "text-cyan-400 bg-cyan-950/70 border border-cyan-800/40" : "text-slate-500 bg-slate-900"
            }`}
          >
            {icon}
          </div>
          <span className="text-xs font-semibold font-mono tracking-tight truncate">
            {win.title}
          </span>
          {win.subtitle && (
            <span className="hidden sm:inline-block text-[10px] text-slate-500 font-mono truncate">
              • {win.subtitle}
            </span>
          )}
        </div>

        {/* Window Control Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Minimize */}
          <button
            id={`btn-min-${win.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Minimizar a la barra de tareas"
            aria-label="Minimizar"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore */}
          <button
            id={`btn-max-${win.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaximize();
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={win.isMaximized ? "Restaurar tamaño normal" : "Maximizar ventana"}
            aria-label={win.isMaximized ? "Restaurar" : "Maximizar"}
          >
            {win.isMaximized ? (
              <Copy className="w-3 h-3" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>

          {/* Close */}
          <button
            id={`btn-close-${win.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600/90 transition-colors"
            title="Cerrar ventana"
            aria-label="Cerrar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Body / Content */}
      <div className="flex-1 w-full h-[calc(100%-36px)] overflow-hidden bg-[#050811] relative select-text">
        {children}
      </div>

      {/* Resize handles (only when not maximized) */}
      {!win.isMaximized && (
        <>
          {/* Right edge */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "right")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            className="absolute top-9 right-0 w-1.5 h-[calc(100%-18px)] cursor-e-resize hover:bg-cyan-500/40 transition-colors z-20"
          />

          {/* Bottom edge */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "bottom")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            className="absolute bottom-0 left-0 w-[calc(100%-18px)] h-1.5 cursor-s-resize hover:bg-cyan-500/40 transition-colors z-20"
          />

          {/* Bottom-right diagonal corner */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "corner")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-30 group"
            title="Arrastrar para redimensionar"
          >
            <div className="w-2 h-2 border-r-2 border-b-2 border-slate-600 group-hover:border-cyan-400 transition-colors" />
          </div>
        </>
      )}
    </div>
  );
};
