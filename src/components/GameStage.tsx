import React, { useRef, useEffect, useState } from "react";
import { Play, Pause, RotateCcw, StepForward, Maximize, Volume2, VolumeX, Tv, Gamepad2, Compass } from "lucide-react";
import { DivRuntime, EngineStats } from "../engine/runtime";
import { soundEngine } from "../engine/sound";
import { Camera3DInfo } from "../types";
import { Camera3DDebugOverlay } from "./Camera3DDebugOverlay";

interface GameStageProps {
  runtime: DivRuntime;
  onRestart: () => void;
}

export const GameStage: React.FC<GameStageProps> = ({ runtime, onRestart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<EngineStats>({
    fps: 60,
    processCount: 0,
    renderTimeMs: 0,
    frameIndex: 0,
    activeSounds: 0,
  });
  const [cameraInfo, setCameraInfo] = useState<Camera3DInfo>(runtime.getCamera3DInfo());
  const [is3DDebugOpen, setIs3DDebugOpen] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);
  const [crtFilter, setCrtFilter] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(false);

  // Hook canvas to runtime
  useEffect(() => {
    if (canvasRef.current) {
      runtime.setCanvas(canvasRef.current);
    }
    runtime.onStatsUpdate = (s) => {
      setStats(s);
      if (s.camera3D) {
        setCameraInfo(s.camera3D);
      }
    };

    // Keyboard listener
    const handleKeyDown = (e: KeyboardEvent) => {
      // Forward key event to App UI Engine if an input field is active
      if (runtime.appUiEngine) {
        const handled = runtime.appUiEngine.handleKeyDown(e.key, e);
        if (handled) {
          return;
        }
      }

      // Prevent browser scrolling and tab loss with game keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(e.code) || e.key === "Tab") {
        e.preventDefault();
      }

      if (e.key === "Tab" || e.code === "Tab") {
        runtime.toggleMode8Automap();
        return;
      }

      runtime.keyState[e.key.toLowerCase()] = true;
      runtime.keyState[e.code.toLowerCase()] = true;

      // Also map arrow and common game key names
      if (e.key === "ArrowUp" || e.code === "KeyW") {
        runtime.keyState["up"] = true;
        runtime.keyState["w"] = true;
      }
      if (e.key === "ArrowDown" || e.code === "KeyS") {
        runtime.keyState["down"] = true;
        runtime.keyState["s"] = true;
      }
      if (e.key === "ArrowLeft" || e.code === "KeyA") {
        runtime.keyState["left"] = true;
        runtime.keyState["a"] = true;
      }
      if (e.key === "ArrowRight" || e.code === "KeyD") {
        runtime.keyState["right"] = true;
        runtime.keyState["d"] = true;
      }
      if (e.code === "Space" || e.key === " ") runtime.keyState["space"] = true;
      if (e.key === "Enter") runtime.keyState["enter"] = true;
      if (e.key === "Escape") runtime.keyState["esc"] = true;
      if (e.code === "KeyE" || e.key.toLowerCase() === "e") runtime.keyState["e"] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      runtime.keyState[e.key.toLowerCase()] = false;
      runtime.keyState[e.code.toLowerCase()] = false;

      if (e.key === "ArrowUp" || e.code === "KeyW") {
        runtime.keyState["up"] = false;
        runtime.keyState["w"] = false;
      }
      if (e.key === "ArrowDown" || e.code === "KeyS") {
        runtime.keyState["down"] = false;
        runtime.keyState["s"] = false;
      }
      if (e.key === "ArrowLeft" || e.code === "KeyA") {
        runtime.keyState["left"] = false;
        runtime.keyState["a"] = false;
      }
      if (e.key === "ArrowRight" || e.code === "KeyD") {
        runtime.keyState["right"] = false;
        runtime.keyState["d"] = false;
      }
      if (e.code === "Space" || e.key === " ") runtime.keyState["space"] = false;
      if (e.key === "Enter") runtime.keyState["enter"] = false;
      if (e.key === "Escape") runtime.keyState["esc"] = false;
      if (e.code === "KeyE" || e.key.toLowerCase() === "e") runtime.keyState["e"] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [runtime]);

  const toggleSound = () => {
    soundEngine.isMuted = !soundEngine.isMuted;
    setIsMuted(soundEngine.isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Touch controls simulator
  const setTouchKey = (keyName: string, active: boolean) => {
    runtime.keyState[keyName] = active;
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#050811] border border-slate-800 rounded-lg overflow-hidden relative select-none"
    >
      {/* Game Stage Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1424] border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              runtime.isRunning && !runtime.isPaused
                ? "bg-emerald-400 animate-pulse"
                : runtime.isPaused
                ? "bg-amber-400"
                : "bg-slate-600"
            }`}
          />
          <span className="font-semibold text-slate-200">WXDIV 3.0 Virtual Screen</span>
          <span className="text-slate-400 font-mono text-[11px]">
            {runtime.width}x{runtime.height}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {runtime.isRunning && !runtime.isPaused ? (
            <button
              onClick={() => runtime.pause()}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
              title="Pausar ejecución"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (runtime.isPaused) runtime.resume();
                else runtime.start();
              }}
              className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              title="Ejecutar juego"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          <button
            onClick={() => runtime.stepFrame()}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Avanzar 1 FRAME"
          >
            <StepForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRestart}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reiniciar ejecución"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          <button
            onClick={toggleSound}
            className={`p-1.5 rounded ${
              isMuted ? "text-rose-400 bg-rose-950/40" : "text-slate-300 bg-slate-800 hover:bg-slate-700"
            } transition-colors`}
            title={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setCrtFilter(!crtFilter)}
            className={`p-1.5 rounded ${
              crtFilter ? "text-cyan-400 bg-cyan-950/40 border border-cyan-800/40" : "text-slate-400 bg-slate-800 hover:bg-slate-700"
            } transition-colors`}
            title="Efecto CRT Retro"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>

          {/* 3D Camera Debug Tool Button */}
          <button
            onClick={() => setIs3DDebugOpen(!is3DDebugOpen)}
            className={`px-2 py-1.5 rounded flex items-center gap-1.5 text-xs transition-colors ${
              is3DDebugOpen
                ? "text-cyan-300 bg-cyan-950/80 border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                : cameraInfo.active
                ? "text-cyan-400 bg-slate-800 hover:bg-slate-700 border border-cyan-700/50"
                : "text-slate-400 bg-slate-800 hover:bg-slate-700"
            }`}
            title="Herramienta de depuración de Cámara 3D (X, Y, Ángulo en tiempo real)"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-[11px] hidden sm:inline">Cámara 3D</span>
            {cameraInfo.active && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setShowTouchControls(!showTouchControls)}
            className={`p-1.5 rounded sm:hidden ${
              showTouchControls ? "text-emerald-400 bg-emerald-950/40" : "text-slate-400 bg-slate-800"
            }`}
            title="Controles táctiles"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Pantalla completa"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport Canvas Container */}
      <div className="relative flex-1 flex items-center justify-center bg-[#02040a] p-2 overflow-hidden">
        {/* Real-time 3D Camera Debugging Tool */}
        <Camera3DDebugOverlay
          runtime={runtime}
          cameraInfo={cameraInfo}
          isOpen={is3DDebugOpen}
          onClose={() => setIs3DDebugOpen(false)}
          showGuides={showGuides}
          onToggleGuides={() => setShowGuides(!showGuides)}
        />

        <div
          className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-sm overflow-hidden border border-slate-800"
          style={{ aspectRatio: `${runtime.width} / ${runtime.height}` }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            width={runtime.width}
            height={runtime.height}
            className="w-full h-full object-contain pixelated bg-[#050811] focus:outline-none cursor-crosshair"
            style={{ imageRendering: "pixelated" }}
            onMouseDown={(e) => {
              e.currentTarget.focus({ preventScroll: true });
              if (e.button === 0) {
                runtime.mouseState.left = true;
                runtime.appUiEngine?.handleMouseDown(runtime.mouseState.x, runtime.mouseState.y);
              }
              if (e.button === 2) runtime.mouseState.right = true;
            }}
            onMouseUp={(e) => {
              if (e.button === 0) {
                runtime.mouseState.left = false;
                runtime.appUiEngine?.handleMouseUp(runtime.mouseState.x, runtime.mouseState.y);
              }
              if (e.button === 2) runtime.mouseState.right = false;
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mx = Math.floor(((e.clientX - rect.left) / rect.width) * runtime.width);
              const my = Math.floor(((e.clientY - rect.top) / rect.height) * runtime.height);
              runtime.mouseState.x = mx;
              runtime.mouseState.y = my;
              runtime.appUiEngine?.handleMouseMove(mx, my);
            }}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* CRT Scanline Shader Overlay */}
          {crtFilter && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.75) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
                backgroundSize: "100% 3px, 6px 100%",
              }}
            />
          )}

          {/* Pause overlay */}
          {runtime.isPaused && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-slate-200">
              <span className="font-retro text-lg tracking-wider text-amber-400 mb-2">PAUSA</span>
              <span className="text-xs text-slate-400">Presiona Play para continuar</span>
            </div>
          )}
        </div>

        {/* Mobile Virtual Controls */}
        {showTouchControls && (
          <div className="absolute bottom-4 inset-x-4 flex justify-between items-end pointer-events-auto sm:hidden">
            {/* D-Pad */}
            <div className="grid grid-cols-3 gap-1 w-32 h-32">
              <div />
              <button
                onTouchStart={() => setTouchKey("up", true)}
                onTouchEnd={() => setTouchKey("up", false)}
                className="bg-slate-800/80 active:bg-emerald-600 rounded flex items-center justify-center text-white"
              >
                ▲
              </button>
              <div />
              <button
                onTouchStart={() => setTouchKey("left", true)}
                onTouchEnd={() => setTouchKey("left", false)}
                className="bg-slate-800/80 active:bg-emerald-600 rounded flex items-center justify-center text-white"
              >
                ◀
              </button>
              <div />
              <button
                onTouchStart={() => setTouchKey("right", true)}
                onTouchEnd={() => setTouchKey("right", false)}
                className="bg-slate-800/80 active:bg-emerald-600 rounded flex items-center justify-center text-white"
              >
                ▶
              </button>
              <div />
              <button
                onTouchStart={() => setTouchKey("down", true)}
                onTouchEnd={() => setTouchKey("down", false)}
                className="bg-slate-800/80 active:bg-emerald-600 rounded flex items-center justify-center text-white"
              >
                ▼
              </button>
              <div />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onTouchStart={() => setTouchKey("space", true)}
                onTouchEnd={() => setTouchKey("space", false)}
                className="w-14 h-14 rounded-full bg-rose-600/80 active:bg-rose-500 flex items-center justify-center text-white font-bold shadow-lg"
              >
                A
              </button>
              <button
                onTouchStart={() => setTouchKey("enter", true)}
                onTouchEnd={() => setTouchKey("enter", false)}
                className="w-14 h-14 rounded-full bg-blue-600/80 active:bg-blue-500 flex items-center justify-center text-white font-bold shadow-lg"
              >
                B
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stage Bottom Bar / Stats Telemetry */}
      <div className="px-3 py-1.5 bg-[#0a0f1d] border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none flex-shrink-0 h-8 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 min-w-[68px]">
            <span className="text-slate-500">FPS:</span>
            <span className={`font-semibold tabular-nums ${stats.fps >= 55 ? "text-emerald-400" : "text-amber-400"}`}>
              {stats.fps}
            </span>
          </div>

          <div className="flex items-center gap-1 min-w-[85px]">
            <span className="text-slate-500">Procs:</span>
            <span className="text-cyan-400 font-semibold tabular-nums">{stats.processCount}</span>
          </div>

          {/* Real-time 3D Camera Telemetry Readout */}
          {cameraInfo.active && (
            <button
              onClick={() => setIs3DDebugOpen(!is3DDebugOpen)}
              className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/70 px-2 py-0.5 rounded border border-cyan-800/60 transition-colors cursor-pointer"
              title="Haz clic para abrir/cerrar el panel de depuración de la cámara 3D"
            >
              <Compass className="w-3 h-3 text-cyan-400 flex-shrink-0" />
              <span className="text-[10px] tabular-nums whitespace-nowrap">
                X:{cameraInfo.x.toFixed(1)} Y:{cameraInfo.y.toFixed(1)} ∠{Math.round(((cameraInfo.angle % 360 + 360) % 360))}°
              </span>
            </button>
          )}

          <div className="flex items-center gap-1 hidden sm:flex min-w-[70px]">
            <span className="text-slate-500">Frame:</span>
            <span className="tabular-nums">{stats.frameIndex}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500 hidden sm:inline tabular-nums">Render: {stats.renderTimeMs.toFixed(1)}ms</span>
          <span className="text-slate-500">WASD / Flechas + ESPACIO</span>
        </div>
      </div>
    </div>
  );
};
