import React, { useState } from "react";
import {
  Compass,
  Eye,
  Crosshair,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Layers,
  X,
  Target,
  ArrowUp,
} from "lucide-react";
import { Camera3DInfo } from "../types";
import { DivRuntime } from "../engine/runtime";

interface Camera3DDebugOverlayProps {
  runtime: DivRuntime;
  cameraInfo: Camera3DInfo;
  isOpen: boolean;
  onClose: () => void;
  showGuides: boolean;
  onToggleGuides: () => void;
}

export const Camera3DDebugOverlay: React.FC<Camera3DDebugOverlayProps> = ({
  runtime,
  cameraInfo,
  isOpen,
  onClose,
  showGuides,
  onToggleGuides,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<"coords" | "optics" | "tweaker">("coords");

  if (!isOpen) return null;

  const isMode7 = cameraInfo.mode === "mode7";
  const isMode8 = cameraInfo.mode === "mode8";
  const has3DActive = isMode7 || isMode8;

  // Real-time nudging helpers
  const handleNudgeAngle = (delta: number) => {
    const newAngle = ((cameraInfo.angle + delta) % 360 + 360) % 360;
    if (isMode7) runtime.setMode7Camera({ angle: newAngle });
    if (isMode8) runtime.setMode8Camera({ angle: newAngle });
  };

  const handleNudgeHeight = (delta: number) => {
    const currentH = cameraInfo.height || (isMode7 ? 46 : 32);
    const newH = Math.max(5, currentH + delta);
    if (isMode7) runtime.setMode7Camera({ height: newH });
    if (isMode8) runtime.setMode8Camera({ height: newH });
  };

  const handleNudgeDistance = (delta: number) => {
    if (isMode7) {
      const currentDist = cameraInfo.distance || 210;
      runtime.setMode7Camera({ distance: Math.max(50, currentDist + delta) });
    }
  };

  const handleNudgeHorizon = (delta: number) => {
    if (isMode7) {
      const currentH = cameraInfo.horizon || Math.floor(runtime.height * 0.42);
      runtime.setMode7Camera({ horizon: Math.max(10, Math.min(runtime.height - 10, currentH + delta)) });
    }
  };

  const handleResetCamera = () => {
    if (isMode7) {
      runtime.setMode7Camera({
        height: 46,
        distance: 210,
        horizon: Math.floor(runtime.height * 0.42),
      });
    }
    if (isMode8) {
      runtime.setMode8Camera({
        height: 32,
        pitch: 0,
      });
    }
  };

  // Compass needle rotation (in degrees)
  const needleRotation = cameraInfo.angle;

  return (
    <>
      {/* Visual Canvas Guide Overlays (Horizon line & Center Crosshairs) */}
      {showGuides && has3DActive && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden">
          {/* Horizon Line for Mode 7 */}
          {isMode7 && cameraInfo.horizon !== undefined && (
            <div
              className="absolute inset-x-0 border-b border-dashed border-cyan-400/80 flex items-center justify-between px-2 text-[10px] font-mono text-cyan-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              style={{
                top: `${(cameraInfo.horizon / runtime.height) * 100}%`,
              }}
            >
              <span className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-cyan-500/50">
                HORIZONTE Y: {Math.round(cameraInfo.horizon)}px
              </span>
              <span className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-cyan-500/50">
                FOCAL DIST: {Math.round(cameraInfo.distance || 210)}
              </span>
            </div>
          )}

          {/* Screen Center Crosshair Reticle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-16 h-16 pointer-events-none opacity-80">
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-cyan-400/70" />
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-cyan-400/70" />
              <div className="absolute inset-0 border border-cyan-400/40 rounded-full" />
              <div className="absolute inset-2 border border-dashed border-cyan-400/30 rounded-full" />
              <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono text-cyan-400">
                {cameraInfo.cardinal}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating HUD Telemetry Window */}
      <div className="absolute top-2 left-2 z-30 w-72 bg-[#080e1c]/95 border border-cyan-500/50 rounded-lg shadow-2xl backdrop-blur-md text-xs font-mono text-slate-200 overflow-hidden select-none animate-in fade-in slide-in-from-top-2">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#0d162d] border-b border-cyan-900/50">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-semibold text-slate-100 text-[11px]">Debug Cámara 3D</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                isMode7
                  ? "bg-blue-950 text-blue-300 border border-blue-700/60"
                  : isMode8
                  ? "bg-amber-950 text-amber-300 border border-amber-700/60"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {isMode7 ? "MODO 7" : isMode8 ? "MODO 8" : "2D"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleGuides()}
              className={`p-1 rounded text-[10px] transition-colors ${
                showGuides
                  ? "bg-cyan-900/70 text-cyan-300 border border-cyan-600/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
              title={showGuides ? "Ocultar guías en pantalla" : "Mostrar guías en pantalla"}
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title={isMinimized ? "Expandir" : "Minimizar"}
            >
              {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Cerrar depurador"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Minimized Quick Pill Bar */}
        {isMinimized ? (
          <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] bg-slate-950/80">
            <span className="text-cyan-400">
              X:{cameraInfo.x.toFixed(1)} Y:{cameraInfo.y.toFixed(1)}
            </span>
            <span className="text-amber-400">
              ∠{((cameraInfo.angle % 360 + 360) % 360).toFixed(1)}° ({cameraInfo.cardinal})
            </span>
          </div>
        ) : (
          <div className="p-2.5 space-y-2.5">
            {/* Real-time Compass & Coordinates Hero Block */}
            <div className="grid grid-cols-12 gap-2 bg-slate-950/70 p-2 rounded border border-slate-800 items-center">
              {/* SVG Compass Dial */}
              <div className="col-span-4 flex flex-col items-center justify-center">
                <div className="relative w-14 h-14 rounded-full border-2 border-cyan-500/40 bg-slate-900/90 flex items-center justify-center shadow-inner">
                  {/* Cardinal marks */}
                  <span className="absolute top-0.5 text-[8px] font-bold text-cyan-400">N</span>
                  <span className="absolute bottom-0.5 text-[8px] font-bold text-slate-500">S</span>
                  <span className="absolute left-1 text-[8px] font-bold text-slate-500">W</span>
                  <span className="absolute right-1 text-[8px] font-bold text-slate-500">E</span>

                  {/* Rotating Needle */}
                  <div
                    className="absolute w-full h-full flex items-center justify-center transition-transform duration-75"
                    style={{ transform: `rotate(${needleRotation}deg)` }}
                  >
                    <div className="w-1 h-6 bg-gradient-to-t from-transparent via-rose-500 to-rose-400 rounded-t-full shadow-[0_0_6px_rgba(244,63,94,0.8)] -translate-y-2" />
                    <div className="w-1 h-3 bg-slate-500 rounded-b-full translate-y-2" />
                    <div className="absolute w-2 h-2 rounded-full bg-cyan-300 border border-slate-900 z-10" />
                  </div>
                </div>
                <span className="mt-1 text-[9px] font-bold text-cyan-300 tracking-wider">
                  {cameraInfo.cardinal} ({Math.round(((cameraInfo.angle % 360 + 360) % 360))}°)
                </span>
              </div>

              {/* Coordinates digital readout */}
              <div className="col-span-8 space-y-1 text-[11px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-0.5">
                  <span className="text-slate-400 font-medium">Posición X:</span>
                  <span className="text-emerald-400 font-bold">{cameraInfo.x.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-0.5">
                  <span className="text-slate-400 font-medium">Posición Y:</span>
                  <span className="text-emerald-400 font-bold">{cameraInfo.y.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-0.5">
                  <span className="text-slate-400 font-medium">Ángulo (Yaw):</span>
                  <span className="text-amber-400 font-bold">
                    {cameraInfo.angle.toFixed(1)}°
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Altura Ojo:</span>
                  <span className="text-cyan-300 font-bold">{cameraInfo.height}px</span>
                </div>
              </div>
            </div>

            {/* Target Tracking Badge */}
            <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Target className="w-3 h-3 text-cyan-400" />
                <span>Seguimiento:</span>
              </span>
              <span className="text-slate-200 font-semibold">
                {cameraInfo.cameraTargetId
                  ? `ID ${cameraInfo.cameraTargetId} (${cameraInfo.cameraTargetName || "proceso"})`
                  : "Manual (Sin target)"}
              </span>
            </div>

            {/* Tabs for extra telemetry and live tweaks */}
            <div className="flex rounded bg-slate-950 p-0.5 border border-slate-800 text-[10px]">
              <button
                onClick={() => setActiveTab("coords")}
                className={`flex-1 py-1 rounded transition-colors ${
                  activeTab === "coords" ? "bg-cyan-950 text-cyan-300 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Óptica 3D
              </button>
              <button
                onClick={() => setActiveTab("tweaker")}
                className={`flex-1 py-1 rounded transition-colors ${
                  activeTab === "tweaker" ? "bg-cyan-950 text-cyan-300 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Ajuste en Vivo
              </button>
            </div>

            {/* Tab: Optics Details */}
            {activeTab === "coords" && (
              <div className="space-y-1 text-[10px] bg-slate-950/50 p-2 rounded border border-slate-850">
                {isMode7 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Distancia Focal:</span>
                      <span className="text-slate-200">{cameraInfo.distance ?? 210} px</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Scanline Horizonte:</span>
                      <span className="text-slate-200">{cameraInfo.horizon ?? 201} px</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Perspectiva:</span>
                      <span className="text-cyan-400">Scanlines Afines SNES</span>
                    </div>
                  </>
                )}

                {isMode8 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Celda Mapa [Col, Fila]:</span>
                      <span className="text-slate-200">
                        [{Math.floor(cameraInfo.x)}, {Math.floor(cameraInfo.y)}]
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Inclinación (Pitch):</span>
                      <span className="text-slate-200">{cameraInfo.pitch ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rango Niebla:</span>
                      <span className="text-slate-200">{cameraInfo.fogDistance ?? 14} celdas</span>
                    </div>
                  </>
                )}

                {!has3DActive && (
                  <div className="text-amber-400/90 text-center py-1">
                    Cámara 3D en espera. Ejecuta un preset como "DIV Super Kart 3D" o "Dungeon Crypt 3D" para ver datos en vivo.
                  </div>
                )}
              </div>
            )}

            {/* Tab: Live Nudge Tweaker */}
            {activeTab === "tweaker" && (
              <div className="space-y-2 text-[10px] bg-slate-950/50 p-2 rounded border border-slate-850">
                {/* Angle Nudge */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Girar Ángulo:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleNudgeAngle(-15)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      -15°
                    </button>
                    <button
                      onClick={() => handleNudgeAngle(15)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      +15°
                    </button>
                  </div>
                </div>

                {/* Height Nudge */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Altura Ojos:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleNudgeHeight(-5)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      -5px
                    </button>
                    <button
                      onClick={() => handleNudgeHeight(5)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      +5px
                    </button>
                  </div>
                </div>

                {/* Mode 7 specific tweaks */}
                {isMode7 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Distancia Focal:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleNudgeDistance(-20)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        >
                          -20
                        </button>
                        <button
                          onClick={() => handleNudgeDistance(20)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        >
                          +20
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Horizonte Y:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleNudgeHorizon(-10)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => handleNudgeHorizon(10)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Reset button */}
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={handleResetCamera}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[10px] transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Valores Predeterminados</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
