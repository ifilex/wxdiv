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

  // Titlebar drag handlers with global listener fallback
  const handleTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only left click
    if (e.button !== 0) return;
    onFocus();

    // If window is maximized and user drags titlebar, unmaximize and position under cursor
    if (win.isMaximized) {
      onToggleMaximize();
      const restoredW = win.prevBounds?.width ?? 640;
      const restoredH = win.prevBounds?.height ?? 500;
      const newX = Math.max(0, Math.min(e.clientX - restoredW / 2, desktopBounds.width - 100));
      const newY = Math.max(0, Math.min(e.clientY - 18, desktopBounds.height - 40));
      onUpdateBounds({
        x: newX,
        y: newY,
        width: restoredW,
        height: restoredH,
      });
      dragRef.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        initialX: newX,
        initialY: newY,
      };
      return;
    }

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch (err) {}

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

  // Global pointer tracking to guarantee smooth drag and resize even if cursor leaves frame
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (dragRef.current.isDragging && !win.isMaximized) {
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
      }

      if (resizeRef.current.isResizing && !win.isMaximized) {
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
      }
    };

    const handleGlobalPointerUp = () => {
      if (dragRef.current.isDragging) {
        dragRef.current.isDragging = false;
      }
      if (resizeRef.current.isResizing) {
        resizeRef.current.isResizing = false;
        resizeRef.current.edge = null;
      }
    };

    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [win.x, win.y, win.width, win.height, win.minWidth, win.minHeight, win.isMaximized, desktopBounds, onUpdateBounds]);

  // Resize handlers
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    edge: "corner" | "right" | "bottom"
  ) => {
    if (e.button !== 0 || win.isMaximized) return;
    e.stopPropagation();
    onFocus();

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch (err) {}

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

  // Clamped Coordinates to guarantee window is ALWAYS reachable on screen
  const safeX = Math.max(0, Math.min(win.x, Math.max(0, desktopBounds.width - 80)));
  const safeY = Math.max(0, Math.min(win.y, Math.max(0, desktopBounds.height - 40)));
  const safeW = Math.max(win.minWidth, Math.min(win.width, desktopBounds.width));
  const safeH = Math.max(win.minHeight, Math.min(win.height, desktopBounds.height));

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
        top: `${safeY}px`,
        left: `${safeX}px`,
        width: `${safeW}px`,
        height: `${safeH}px`,
        zIndex: win.zIndex,
      };

  return (
    <div
      ref={frameRef}
      id={`window-${win.id}`}
      style={style}
      onPointerDownCapture={onFocus}
      onMouseDown={onFocus}
      className={`flex flex-col bg-[#c0c0c0] overflow-hidden select-none ${
        win.isMaximized
          ? "rounded-none border-0"
          : `rounded-none border-2 ${
              isActive
                ? "border-t-[#ffffff] border-l-[#ffffff] border-b-[#000000] border-r-[#000000] shadow-xl"
                : "border-t-[#e0e0e0] border-l-[#e0e0e0] border-b-[#404040] border-r-[#404040] shadow-md"
            }`
      }`}
    >
      {/* Window Title Bar - Pure Windows 3.1 / Visual Basic 3.0 */}
      <div
        id={`titlebar-${win.id}`}
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        onDoubleClick={onToggleMaximize}
        className={`h-6 px-1 flex items-center justify-between cursor-move flex-shrink-0 select-none ${
          isActive
            ? "bg-[#000080] text-white"
            : "bg-[#808080] text-[#d4d4d4]"
        }`}
      >
        {/* Left: Windows 3.1 System Menu Box [-] */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
          title="Cerrar / Menú del Sistema"
          className="w-4 h-4 bg-[#c0c0c0] border-t border-l border-white border-b border-r border-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white flex items-center justify-center cursor-pointer flex-shrink-0"
        >
          <div className="w-2.5 h-0.5 bg-black" />
        </button>

        {/* Center: Title */}
        <div className="flex-1 flex items-center justify-center gap-1.5 px-2 min-w-0 pointer-events-none">
          {icon && (
            <div className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
          )}
          <span className="text-xs font-bold font-sans tracking-normal truncate text-center">
            {win.title}
          </span>
        </div>

        {/* Right: Windows 3.1 Minimize [▼] & Maximize [▲] buttons */}
        <div
          className="flex items-center gap-0.5 flex-shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Minimize [▼] */}
          <button
            id={`btn-min-${win.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            title="Minimizar"
            className="w-4 h-4 bg-[#c0c0c0] border-t border-l border-white border-b border-r border-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white flex items-center justify-center cursor-pointer text-black font-bold text-[8px]"
          >
            ▼
          </button>

          {/* Maximize / Restore [▲] */}
          <button
            id={`btn-max-${win.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaximize();
            }}
            title={win.isMaximized ? "Restaurar" : "Maximizar"}
            className="w-4 h-4 bg-[#c0c0c0] border-t border-l border-white border-b border-r border-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white flex items-center justify-center cursor-pointer text-black font-bold text-[8px]"
          >
            {win.isMaximized ? "▲▼" : "▲"}
          </button>
        </div>
      </div>

      {/* Window Body / Content */}
      <div className="flex-1 w-full h-[calc(100%-24px)] overflow-hidden bg-[#c0c0c0] relative select-text">
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
