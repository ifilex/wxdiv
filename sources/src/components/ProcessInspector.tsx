import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Cpu,
  Power,
  Snowflake,
  Sun,
  Trash2,
  Moon,
  Search,
  RefreshCw,
  Sliders,
  ChevronRight,
  ChevronDown,
  Edit2,
  Check,
  X,
  Play,
  Pause,
  Skull,
  Activity,
  Layers,
  ArrowRight,
  Info,
  Clock,
  Plus,
  BarChart3,
  TrendingUp,
  Database,
  Gauge,
  Zap,
  Minimize2,
  Maximize2,
  Sparkles,
  StepForward,
  CircleDot,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { DivProcess, DeadProcessRecord, BreakpointInfo } from "../types";
import { DivRuntime } from "../engine/runtime";

interface ProcessInspectorProps {
  runtime: DivRuntime;
  processes?: DivProcess[];
  isEmbeddedOverlay?: boolean;
  onCloseOverlay?: () => void;
}

export type ProcessFilter = "all" | "alive" | "frozen" | "sleeping" | "dead";
export type RefreshRate = "live" | "fast" | "normal" | "slow" | "paused";
export type DebuggerViewMode = "split" | "charts" | "table";
export type ChartMetricMode = "both" | "fps" | "memory";

interface UnifiedProcessItem {
  id: number;
  name: string;
  father: number;
  x: number;
  y: number;
  z: number;
  graph: number;
  file: number;
  angle: number;
  size: number;
  flags: number;
  alpha: number;
  ctype: number;
  priority: number;
  isDead: boolean;
  isSleeping: boolean;
  isFrozen: boolean;
  localVars: Record<string, any>;
  customState?: Record<string, any>;
  diedAt?: number;
  diedFrame?: number;
  deathReason?: string;
}

interface TelemetryPoint {
  time: string;
  fps: number;
  targetFps: number;
  memoryKB: number;
  memoryMB: number;
  heapMB?: number | null;
  procs: number;
  deadProcs: number;
  renderMs: number;
}

export const ProcessInspector: React.FC<ProcessInspectorProps> = ({
  runtime,
  processes: propProcesses,
  isEmbeddedOverlay = false,
  onCloseOverlay,
}) => {
  const [activeList, setActiveList] = useState<DivProcess[]>([]);
  const [deadList, setDeadList] = useState<DeadProcessRecord[]>([]);
  const [filter, setFilter] = useState<ProcessFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [refreshRate, setRefreshRate] = useState<RefreshRate>("fast");
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [viewMode, setViewMode] = useState<DebuggerViewMode>("split");
  const [chartMetric, setChartMetric] = useState<ChartMetricMode>("both");

  // Recharts streaming telemetry buffer
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);

  // Breakpoint & Execution Pause State
  const [breakpointInfo, setBreakpointInfo] = useState<BreakpointInfo | null>(runtime?.currentBreakpoint || null);

  // Editing state for process variables
  const [editingVar, setEditingVar] = useState<{ key: string; value: string } | null>(null);
  const [newVarName, setNewVarName] = useState("");
  const [newVarValue, setNewVarValue] = useState("");
  const [isAddingVar, setIsAddingVar] = useState(false);

  // Poll runtime for active processes, dead records, and memory
  const updateSnapshot = () => {
    if (typeof runtime.getActiveProcesses === "function") {
      setActiveList(runtime.getActiveProcesses());
    } else if (propProcesses) {
      setActiveList(propProcesses);
    }
    if (typeof runtime.getDeadProcesses === "function") {
      setDeadList([...runtime.getDeadProcesses()]);
    }

    // Telemetry capture for Recharts
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    const mem =
      typeof runtime.getProcessMemoryUsage === "function"
        ? runtime.getProcessMemoryUsage()
        : { processMemoryKB: 45, processMemoryMB: 0.04, heapUsedMB: null };

    const currentFps = runtime.currentFps ? Math.min(120, Math.max(0, runtime.currentFps)) : 60;
    const currentProcs = typeof runtime.getActiveProcesses === "function" ? runtime.getActiveProcesses().length : 0;
    const currentDead = typeof runtime.getDeadProcesses === "function" ? runtime.getDeadProcesses().length : 0;
    const renderMs = Math.round((runtime.renderDuration || 0) * 10) / 10;

    const newPoint: TelemetryPoint = {
      time: timeStr,
      fps: currentFps,
      targetFps: 60,
      memoryKB: mem.processMemoryKB,
      memoryMB: mem.processMemoryMB,
      heapMB: mem.heapUsedMB,
      procs: currentProcs,
      deadProcs: currentDead,
      renderMs,
    };

    setTelemetryHistory((prev) => {
      const next = [...prev, newPoint];
      // Keep last 40 telemetry entries for smooth scrolling graph
      return next.length > 40 ? next.slice(next.length - 40) : next;
    });
  };

  useEffect(() => {
    updateSnapshot();
    if (isManualPaused || refreshRate === "paused") return;

    const ms =
      refreshRate === "live"
        ? 100
        : refreshRate === "fast"
        ? 250
        : refreshRate === "normal"
        ? 500
        : 1000;

    const timer = setInterval(updateSnapshot, ms);
    return () => clearInterval(timer);
  }, [runtime, refreshRate, isManualPaused]);

  // Synchronize breakpoint hits & auto-select paused process
  useEffect(() => {
    if (!runtime) return;

    const handleHit = (bp: BreakpointInfo) => {
      setBreakpointInfo(bp);
      updateSnapshot();
      if (bp.processId) {
        setSelectedProcessId(bp.processId);
      }
    };
    const handleResume = () => {
      setBreakpointInfo(null);
      updateSnapshot();
    };

    const unsubHit = runtime.addBreakpointHitListener(handleHit);
    const unsubResume = runtime.addBreakpointResumeListener(handleResume);

    if (runtime.currentBreakpoint) {
      setBreakpointInfo(runtime.currentBreakpoint);
      if (runtime.currentBreakpoint.processId) {
        setSelectedProcessId(runtime.currentBreakpoint.processId);
      }
    }

    return () => {
      unsubHit();
      unsubResume();
    };
  }, [runtime]);

  // Combine alive processes and dead records
  const unifiedProcesses = useMemo<UnifiedProcessItem[]>(() => {
    const list: UnifiedProcessItem[] = [];

    const sourceActive = propProcesses && propProcesses.length > 0 ? propProcesses : activeList;
    for (const p of sourceActive) {
      list.push({
        id: p.id,
        name: p.name,
        father: p.father || 0,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        z: p.z || 0,
        graph: p.graph || 0,
        file: p.file || 0,
        angle: p.angle || 0,
        size: p.size ?? 100,
        flags: p.flags || 0,
        alpha: p.alpha ?? 255,
        ctype: p.ctype || 0,
        priority: p.priority || 0,
        isDead: Boolean(p.isDead),
        isSleeping: Boolean(p.isSleeping),
        isFrozen: Boolean(p.isFrozen),
        localVars: p.localVars || {},
        customState: p.customState,
      });
    }

    const activeIds = new Set(list.map((p) => p.id));
    for (const d of deadList) {
      if (!activeIds.has(d.id)) {
        list.push({
          id: d.id,
          name: d.name,
          father: d.father || 0,
          x: d.x,
          y: d.y,
          z: d.z || 0,
          graph: d.graph || 0,
          file: d.file || 0,
          angle: d.angle || 0,
          size: d.size ?? 100,
          flags: d.flags || 0,
          alpha: d.alpha ?? 255,
          ctype: d.ctype || 0,
          priority: d.priority || 0,
          isDead: true,
          isSleeping: false,
          isFrozen: false,
          localVars: d.localVars || {},
          customState: d.customState,
          diedAt: d.diedAt,
          diedFrame: d.diedFrame,
          deathReason: d.reason,
        });
      }
    }

    return list;
  }, [activeList, deadList, propProcesses]);

  // Statistics
  const counts = useMemo(() => {
    let alive = 0;
    let frozen = 0;
    let sleeping = 0;
    let dead = 0;

    for (const p of unifiedProcesses) {
      if (p.isDead) dead++;
      else if (p.isFrozen) frozen++;
      else if (p.isSleeping) sleeping++;
      else alive++;
    }

    return { total: unifiedProcesses.length, alive, frozen, sleeping, dead };
  }, [unifiedProcesses]);

  // Telemetry Aggregations (Min, Max, Avg FPS & Memory Peak)
  const statsSummary = useMemo(() => {
    if (telemetryHistory.length === 0) {
      return {
        currentFps: 60,
        minFps: 60,
        maxFps: 60,
        avgFps: 60,
        currentMemKB: 0,
        peakMemKB: 0,
        avgMemPerProcKB: 0,
        heapMB: null,
      };
    }

    const fpsValues = telemetryHistory.map((t) => t.fps);
    const memValues = telemetryHistory.map((t) => t.memoryKB);
    const latest = telemetryHistory[telemetryHistory.length - 1];

    const minFps = Math.min(...fpsValues);
    const maxFps = Math.max(...fpsValues);
    const avgFps = Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length);
    const peakMemKB = Math.max(...memValues);
    const avgMemPerProcKB =
      latest.procs > 0 ? Math.round((latest.memoryKB / latest.procs) * 10) / 10 : 0;

    return {
      currentFps: latest.fps,
      minFps,
      maxFps,
      avgFps,
      currentMemKB: latest.memoryKB,
      peakMemKB,
      avgMemPerProcKB,
      heapMB: latest.heapMB,
    };
  }, [telemetryHistory]);

  // Filter & search
  const filteredProcesses = useMemo(() => {
    const q = search.toLowerCase().trim();
    return unifiedProcesses.filter((p) => {
      if (filter === "alive" && (p.isDead || p.isFrozen || p.isSleeping)) return false;
      if (filter === "frozen" && !p.isFrozen) return false;
      if (filter === "sleeping" && !p.isSleeping) return false;
      if (filter === "dead" && !p.isDead) return false;

      if (q) {
        const idMatch = p.id.toString().includes(q) || `#${p.id}`.includes(q);
        const nameMatch = p.name.toLowerCase().includes(q);
        const localVarMatch = Object.keys(p.localVars).some(
          (k) => k.toLowerCase().includes(q) || String(p.localVars[k]).toLowerCase().includes(q)
        );
        return idMatch || nameMatch || localVarMatch;
      }

      return true;
    });
  }, [unifiedProcesses, filter, search]);

  // Selected process details
  const selectedProcess = useMemo(() => {
    if (selectedProcessId === null) return null;
    return unifiedProcesses.find((p) => p.id === selectedProcessId) || null;
  }, [unifiedProcesses, selectedProcessId]);

  // Actions
  const handleSignal = (procId: number, sig: string) => {
    runtime.signal(procId, sig);
    updateSnapshot();
  };

  const handleLetMeAlone = () => {
    runtime.letMeAlone(selectedProcessId || 0);
    updateSnapshot();
  };

  const handleFreezeAll = () => {
    for (const p of activeList) {
      runtime.signal(p.id, "s_freeze");
    }
    updateSnapshot();
  };

  const handleWakeupAll = () => {
    for (const p of activeList) {
      runtime.signal(p.id, "s_wakeup");
    }
    updateSnapshot();
  };

  const handleSaveVariable = (key: string, valStr: string) => {
    if (!selectedProcessId) return;
    runtime.setProcessVariable(selectedProcessId, key, valStr);
    setEditingVar(null);
    updateSnapshot();
  };

  const handleAddNewVariable = () => {
    if (!selectedProcessId || !newVarName.trim()) return;
    runtime.setProcessVariable(selectedProcessId, newVarName.trim(), newVarValue);
    setNewVarName("");
    setNewVarValue("");
    setIsAddingVar(false);
    updateSnapshot();
  };

  // Custom retro tooltip for recharts
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TelemetryPoint;
      return (
        <div className="bg-[#0b1222]/95 border border-slate-700/80 p-2.5 rounded shadow-2xl text-[11px] font-mono text-slate-200 select-none backdrop-blur-md space-y-1">
          <div className="text-[10px] text-slate-400 border-b border-slate-800 pb-1 flex justify-between gap-4">
            <span>Hora: {data.time}</span>
            <span className="text-cyan-400">Procesos: {data.procs}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              FPS:
            </span>
            <span className="font-bold text-white">{data.fps} fps</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-cyan-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Memoria DIV:
            </span>
            <span className="font-bold text-white">{data.memoryKB} KB</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-400 text-[10px]">
            <span>Render frame:</span>
            <span>{data.renderMs} ms</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#070b14] border border-slate-800 text-slate-300 font-sans select-none overflow-hidden text-xs">
      {/* 1. Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#0b1222] border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-xs">Debugger de Procesos DIV</span>
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{counts.alive} Vivos</span>
              </span>
              {counts.dead > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-400 border border-rose-800/60 font-mono text-[10px]">
                  {counts.dead} Muertos
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Telemetría Recharts en tiempo real de FPS, memoria consumida, X, Y y estado
            </p>
          </div>
        </div>

        {/* View Mode & Live Controls */}
        <div className="flex items-center gap-1.5">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setViewMode("split")}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === "split"
                  ? "bg-cyan-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Vista Dividida: Gráficos de Telemetría arriba y Tabla abajo"
            >
              Dividida
            </button>
            <button
              onClick={() => setViewMode("charts")}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                viewMode === "charts"
                  ? "bg-cyan-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Panel Completo de Gráficos Recharts (FPS & Memoria)"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Gráficos</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === "table"
                  ? "bg-cyan-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Solo Tabla de Procesos y Variables"
            >
              Tabla
            </button>
          </div>

          {/* Sample Rate Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-[10px] font-mono gap-1 text-slate-300">
            <Clock className="w-3 h-3 text-cyan-400" />
            <select
              value={refreshRate}
              onChange={(e) => setRefreshRate(e.target.value as RefreshRate)}
              className="bg-transparent text-cyan-300 focus:outline-none cursor-pointer"
            >
              <option value="live">60 FPS (En vivo)</option>
              <option value="fast">10 FPS</option>
              <option value="normal">3 FPS</option>
              <option value="slow">1 FPS</option>
              <option value="paused">Pausado</option>
            </select>
          </div>

          <button
            onClick={() => {
              setIsManualPaused(!isManualPaused);
              if (isManualPaused) updateSnapshot();
            }}
            className={`p-1.5 rounded border transition-colors ${
              isManualPaused
                ? "bg-amber-950 text-amber-300 border-amber-600"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
            title={isManualPaused ? "Reanudar muestreo en vivo" : "Pausar muestreo"}
          >
            {isManualPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={updateSnapshot}
            className="p-1.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
            title="Refrescar memoria ahora"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleLetMeAlone}
            className="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 font-mono text-[10px] flex items-center gap-1 transition-colors"
            title="let_me_alone(): mata todos los procesos excepto el seleccionado"
          >
            <Skull className="w-3 h-3" />
            <span>let_me_alone()</span>
          </button>

          {isEmbeddedOverlay && onCloseOverlay && (
            <button
              onClick={onCloseOverlay}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              title="Cerrar overlay de depuración"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1.5 ACTIVE BREAKPOINT STATUS CALLOUT */}
      {breakpointInfo && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/60 shadow-lg flex-shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse">
              <CircleDot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-200 text-xs font-mono tracking-wide">
                  ⏸ MOTOR DIV PAUSADO EN BREAKPOINT
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/25 border border-amber-500/50 text-amber-200 font-mono text-[11px] font-bold">
                  Línea {breakpointInfo.line}
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-600/50 text-cyan-300 font-mono text-[11px] font-bold">
                  {breakpointInfo.processName || "Principal"} {breakpointInfo.processId ? `[PID: ${breakpointInfo.processId}]` : ""}
                </span>
              </div>
              <p className="text-[10px] text-amber-300/80 mt-0.5">
                Estado capturado en Frame #{breakpointInfo.frame}. Variables internas X, Y, gráficos y memoria congeladas para inspección y edición en vivo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                runtime.resumeFromBreakpoint();
                setBreakpointInfo(null);
                updateSnapshot();
              }}
              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 text-xs shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
              title="Continuar ejecución del motor DIV (F5)"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Continuar (F5)</span>
            </button>
            <button
              onClick={() => {
                runtime.stepFrame();
                setBreakpointInfo(runtime.currentBreakpoint);
                updateSnapshot();
              }}
              className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 text-xs shadow-[0_0_10px_rgba(14,165,233,0.3)] transition-all cursor-pointer"
              title="Avanzar 1 frame paso a paso (F10)"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>Paso Frame (F10)</span>
            </button>
            <button
              onClick={() => {
                runtime.removeBreakpoint(breakpointInfo.line);
                setBreakpointInfo(null);
                updateSnapshot();
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/40 flex items-center gap-1 text-xs transition-all cursor-pointer"
              title="Eliminar este breakpoint de la línea"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Quitar BP</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. RECHARTS TELEMETRY DASHBOARD PANEL (FPS & MEMORIA EN TIEMPO REAL) */}
      {(viewMode === "split" || viewMode === "charts") && (
        <div className="bg-[#050811] border-b border-slate-800 p-3 flex flex-col gap-3 flex-shrink-0">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Card 1: FPS Telemetry */}
            <div className="p-2 rounded-lg bg-slate-900/70 border border-emerald-900/50 flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Gauge className="w-3 h-3" />
                  <span>TASA DE REFRESCO</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500">Obj: 60 FPS</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span
                  className={`text-xl font-black font-mono tracking-tight ${
                    statsSummary.currentFps >= 55
                      ? "text-emerald-400"
                      : statsSummary.currentFps >= 30
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {statsSummary.currentFps}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">FPS</span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between mt-1 pt-1 border-t border-slate-800/60">
                <span>Min: {statsSummary.minFps}</span>
                <span>Prom: {statsSummary.avgFps}</span>
                <span>Max: {statsSummary.maxFps}</span>
              </div>
            </div>

            {/* Card 2: Memory Consumed by DIV Processes */}
            <div className="p-2 rounded-lg bg-slate-900/70 border border-cyan-900/50 flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                  <Database className="w-3 h-3" />
                  <span>MEMORIA PROCESOS</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500">DIV Mem</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black font-mono text-cyan-300 tracking-tight">
                  {statsSummary.currentMemKB}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">KB</span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between mt-1 pt-1 border-t border-slate-800/60">
                <span>Pico: {statsSummary.peakMemKB} KB</span>
                <span>~{statsSummary.avgMemPerProcKB} KB/proc</span>
              </div>
            </div>

            {/* Card 3: Active vs Dead Processes */}
            <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Activity className="w-3 h-3" />
                  <span>ESTADO DE PROCESOS</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500">Hilos</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black font-mono text-emerald-400 tracking-tight">
                  {counts.alive}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  vivos / {counts.dead} muertos
                </span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between mt-1 pt-1 border-t border-slate-800/60">
                <span>Cong: {counts.frozen}</span>
                <span>Dorm: {counts.sleeping}</span>
                <span>Total: {counts.total}</span>
              </div>
            </div>

            {/* Card 4: Frame Render Time & V8 Heap */}
            <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-purple-400 font-semibold">
                  <Zap className="w-3 h-3" />
                  <span>TIEMPO RENDER / HEAP</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500">CPU</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black font-mono text-purple-300 tracking-tight">
                  {Math.round((runtime.renderDuration || 0) * 10) / 10}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ms</span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between mt-1 pt-1 border-t border-slate-800/60">
                <span>V8 Heap: {statsSummary.heapMB ? `${statsSummary.heapMB} MB` : "N/D"}</span>
                <span>Frame: #{runtime.frameCount}</span>
              </div>
            </div>
          </div>

          {/* Chart Controls Bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Visualización Recharts:</span>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 font-mono">
                <button
                  onClick={() => setChartMetric("both")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    chartMetric === "both"
                      ? "bg-slate-800 text-cyan-300 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Ambos (FPS + Memoria)
                </button>
                <button
                  onClick={() => setChartMetric("fps")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    chartMetric === "fps"
                      ? "bg-slate-800 text-emerald-400 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Solo FPS
                </button>
                <button
                  onClick={() => setChartMetric("memory")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    chartMetric === "memory"
                      ? "bg-slate-800 text-cyan-300 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Solo Memoria
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTelemetryHistory([])}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-mono text-[10px]"
                title="Reiniciar buffer de muestras de gráficos"
              >
                Limpiar Historial
              </button>
            </div>
          </div>

          {/* Recharts Streaming Canvas */}
          <div
            className={`grid gap-3 ${
              chartMetric === "both" && viewMode === "charts"
                ? "grid-cols-1 lg:grid-cols-2"
                : chartMetric === "both"
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {/* 1. FPS Tasa de Refresco Chart */}
            {(chartMetric === "both" || chartMetric === "fps") && (
              <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 flex flex-col">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Tasa de Refresco (FPS en Tiempo Real)</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {statsSummary.currentFps} FPS
                  </span>
                </div>

                <div className="w-full" style={{ height: viewMode === "charts" ? 220 : 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={telemetryHistory}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="fpsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" opacity={0.6} />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={{ stroke: "#334155" }}
                      />
                      <YAxis
                        domain={[0, 75]}
                        ticks={[0, 20, 40, 60]}
                        tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={{ stroke: "#334155" }}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <ReferenceLine
                        y={60}
                        stroke="#34d399"
                        strokeDasharray="3 3"
                        strokeWidth={1}
                        label={{
                          value: "60 FPS",
                          fill: "#34d399",
                          fontSize: 8,
                          position: "insideTopRight",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="fps"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#fpsGradient)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 2. Memory Consumed by DIV Processes Chart */}
            {(chartMetric === "both" || chartMetric === "memory") && (
              <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 flex flex-col">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-cyan-300">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Memoria Consumida por Procesos DIV (KB)</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">
                    {statsSummary.currentMemKB} KB
                  </span>
                </div>

                <div className="w-full" style={{ height: viewMode === "charts" ? 220 : 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={telemetryHistory}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" opacity={0.6} />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={{ stroke: "#334155" }}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={{ stroke: "#334155" }}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="memoryKB"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#memGradient)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Filter & Search Bar (Only shown when Table or Split view is active) */}
      {viewMode !== "charts" && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#090f1d] border-b border-slate-800 text-[11px] flex-shrink-0">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filter === "all"
                  ? "bg-cyan-600 text-white font-bold"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Todos ({counts.total})
            </button>
            <button
              onClick={() => setFilter("alive")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                filter === "alive"
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-slate-800/80 text-emerald-400 hover:bg-slate-800"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Vivos ({counts.alive})</span>
            </button>
            <button
              onClick={() => setFilter("frozen")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                filter === "frozen"
                  ? "bg-sky-600 text-white font-bold"
                  : "bg-slate-800/80 text-sky-400 hover:bg-slate-800"
              }`}
            >
              <Snowflake className="w-2.5 h-2.5" />
              <span>Congelados ({counts.frozen})</span>
            </button>
            <button
              onClick={() => setFilter("sleeping")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                filter === "sleeping"
                  ? "bg-amber-600 text-white font-bold"
                  : "bg-slate-800/80 text-amber-400 hover:bg-slate-800"
              }`}
            >
              <Moon className="w-2.5 h-2.5" />
              <span>Dormidos ({counts.sleeping})</span>
            </button>
            <button
              onClick={() => setFilter("dead")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                filter === "dead"
                  ? "bg-rose-600 text-white font-bold"
                  : "bg-slate-800/80 text-rose-400 hover:bg-slate-800"
              }`}
            >
              <Skull className="w-2.5 h-2.5" />
              <span>Muertos ({counts.dead})</span>
            </button>
          </div>

          {/* Search Input & Quick Signal Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, ID o variable..."
                className="pl-7 pr-2 py-0.5 rounded bg-black/50 border border-slate-700 text-slate-200 placeholder-slate-500 font-mono text-[10px] focus:outline-none focus:border-cyan-500 w-44 sm:w-60"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleFreezeAll}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[10px]"
                title="Congelar todos los procesos activos"
              >
                Congelar Todos
              </button>
              <button
                onClick={handleWakeupAll}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono text-[10px]"
                title="Despertar todos los procesos congelados/dormidos"
              >
                Despertar Todos
              </button>
              {counts.dead > 0 && (
                <button
                  onClick={() => {
                    runtime.clearDeadProcesses();
                    setDeadList([]);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-rose-950 text-rose-300 font-mono text-[10px]"
                  title="Limpiar historial de procesos muertos"
                >
                  Limpiar Muertos
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Process Table & Deep Variable Inspector Pane */}
      {viewMode !== "charts" && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Side: Process Table */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-auto border-r border-slate-800/80">
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead className="bg-[#0b1222] text-slate-400 border-b border-slate-800 sticky top-0 z-10 select-none">
                <tr>
                  <th className="p-2 w-12 text-center">ID</th>
                  <th className="p-2">Proceso</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">X, Y</th>
                  <th className="p-2 hidden md:table-cell">Graph</th>
                  <th className="p-2 hidden lg:table-cell">Ángulo</th>
                  <th className="p-2 hidden xl:table-cell">Z / Pri</th>
                  <th className="p-2">Variables Locales</th>
                  <th className="p-2 text-right">Señales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredProcesses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-sans">
                      <Cpu className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
                      <p className="font-semibold text-slate-400 text-xs">
                        No se encontraron procesos {filter !== "all" ? `con estado "${filter}"` : "activos"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Inicia o reanuda la ejecución del juego con [F5] para inspeccionar la memoria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProcesses.map((proc) => {
                    const isSelected = selectedProcessId === proc.id;
                    const isPausedHere = Boolean(
                      breakpointInfo &&
                        (breakpointInfo.processId === proc.id ||
                          (!breakpointInfo.processId &&
                            breakpointInfo.processName?.toLowerCase() === proc.name.toLowerCase()))
                    );
                    const localKeys = Object.keys(proc.localVars);

                    return (
                      <tr
                        key={proc.id}
                        onClick={() => setSelectedProcessId(proc.id)}
                        className={`cursor-pointer transition-colors ${
                          isPausedHere
                            ? "bg-amber-950/45 border-l-4 border-amber-400 font-bold shadow-inner"
                            : isSelected
                            ? "bg-cyan-950/50 border-l-2 border-cyan-400"
                            : proc.isDead
                            ? "bg-rose-950/15 hover:bg-rose-950/25 opacity-70"
                            : "hover:bg-slate-800/40"
                        }`}
                      >
                        {/* ID */}
                        <td className="p-2 text-center text-cyan-400 font-bold">
                          #{proc.id}
                        </td>

                        {/* Process Name */}
                        <td className="p-2 font-bold text-slate-100 flex items-center gap-1.5">
                          <span className="truncate max-w-[130px]">{proc.name}</span>
                          {isPausedHere && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-500/50 text-[9px] font-mono animate-pulse flex items-center gap-0.5">
                              <CircleDot className="w-2.5 h-2.5" />
                              <span>BP L{breakpointInfo.line}</span>
                            </span>
                          )}
                          {proc.father > 0 && (
                            <span className="text-[9px] text-slate-500 font-normal">
                              (de #{proc.father})
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-2">
                          {proc.isDead ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/60 text-[10px]">
                              <Skull className="w-2.5 h-2.5" />
                              <span>Muerto</span>
                            </span>
                          ) : proc.isFrozen ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60 text-[10px]">
                              <Snowflake className="w-2.5 h-2.5" />
                              <span>Congelado</span>
                            </span>
                          ) : proc.isSleeping ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 text-[10px]">
                              <Moon className="w-2.5 h-2.5" />
                              <span>Dormido</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Vivo</span>
                            </span>
                          )}
                        </td>

                        {/* X, Y coordinates */}
                        <td className="p-2 font-mono text-cyan-300">
                          ({Math.round(proc.x)}, {Math.round(proc.y)})
                        </td>

                        {/* Graph */}
                        <td className="p-2 text-amber-300 hidden md:table-cell">
                          {proc.graph > 0 ? `ID ${proc.graph}` : <span className="text-slate-600">-</span>}
                        </td>

                        {/* Angle */}
                        <td className="p-2 text-slate-400 hidden lg:table-cell">
                          {proc.angle}°
                        </td>

                        {/* Z / Priority */}
                        <td className="p-2 text-slate-400 hidden xl:table-cell">
                          Z:{proc.z} | P:{proc.priority}
                        </td>

                        {/* Local Variables Snippet */}
                        <td className="p-2 max-w-[200px]">
                          {localKeys.length === 0 ? (
                            <span className="text-slate-600 italic text-[10px]">ninguna</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {localKeys.slice(0, 3).map((k) => (
                                <span
                                  key={k}
                                  className="px-1 py-0.2 rounded bg-black/40 text-slate-300 border border-slate-800 text-[10px] truncate max-w-[80px]"
                                  title={`${k} = ${JSON.stringify(proc.localVars[k])}`}
                                >
                                  {k}={String(proc.localVars[k])}
                                </span>
                              ))}
                              {localKeys.length > 3 && (
                                <span className="text-[10px] text-cyan-400 font-bold">
                                  +{localKeys.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Process Signals & Actions */}
                        <td className="p-2 text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!proc.isDead && (
                              <>
                                <button
                                  onClick={() =>
                                    handleSignal(proc.id, proc.isFrozen ? "s_wakeup" : "s_freeze")
                                  }
                                  className={`p-1 rounded border transition-colors ${
                                    proc.isFrozen
                                      ? "bg-sky-950 text-sky-300 border-sky-600 hover:bg-sky-900"
                                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-sky-400 hover:bg-slate-700"
                                  }`}
                                  title={proc.isFrozen ? "s_wakeup: despertar" : "s_freeze: congelar"}
                                >
                                  {proc.isFrozen ? (
                                    <Sun className="w-3 h-3 text-amber-300" />
                                  ) : (
                                    <Snowflake className="w-3 h-3" />
                                  )}
                                </button>

                                <button
                                  onClick={() =>
                                    handleSignal(proc.id, proc.isSleeping ? "s_wakeup" : "s_sleep")
                                  }
                                  className={`p-1 rounded border transition-colors ${
                                    proc.isSleeping
                                      ? "bg-amber-950 text-amber-300 border-amber-600 hover:bg-amber-900"
                                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-amber-400 hover:bg-slate-700"
                                  }`}
                                  title={proc.isSleeping ? "s_wakeup: despertar" : "s_sleep: dormir"}
                                >
                                  <Moon className="w-3 h-3" />
                                </button>

                                <button
                                  onClick={() => handleSignal(proc.id, "s_kill")}
                                  className="p-1 rounded bg-slate-800 text-rose-400 border border-slate-700 hover:bg-rose-950 hover:border-rose-700 transition-colors"
                                  title="s_kill: matar proceso"
                                >
                                  <Power className="w-3 h-3" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => setSelectedProcessId(proc.id)}
                              className="p-1 rounded bg-slate-800 text-cyan-400 border border-slate-700 hover:bg-cyan-950 hover:border-cyan-700 transition-colors"
                              title="Inspeccionar todas las variables"
                            >
                              <Sliders className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Right Side: Process Deep Variable Inspector */}
          <div className="w-80 md:w-96 flex flex-col min-h-0 bg-[#060a12] border-l border-slate-800 overflow-y-auto">
            {selectedProcess ? (
              <div className="p-3 space-y-3">
                {/* Header Info */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-cyan-400 font-mono">
                        #{selectedProcess.id}
                      </span>
                      <span className="font-bold text-slate-100 text-xs">
                        {selectedProcess.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Padre: {selectedProcess.father > 0 ? `#${selectedProcess.father}` : "0 (Raíz)"}
                    </div>
                  </div>

                  <div>
                    {selectedProcess.isDead ? (
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono text-[10px]">
                        Muerto ({selectedProcess.deathReason || "fin"})
                      </span>
                    ) : selectedProcess.isFrozen ? (
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono text-[10px]">
                        Congelado
                      </span>
                    ) : selectedProcess.isSleeping ? (
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[10px]">
                        Dormido
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px]">
                        Activo / Vivo
                      </span>
                    )}
                  </div>
                </div>

                {/* DIV Reserved Internal Variables (Live Editable) */}
                <div className="rounded-lg bg-[#0a0f1d] border border-slate-800 overflow-hidden">
                  <div className="px-3 py-1.5 bg-[#0e162a] border-b border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Variables Internas DIV</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-400">
                      Clic para modificar en vivo
                    </span>
                  </div>

                  <div className="p-2 divide-y divide-slate-800/40 font-mono text-[11px]">
                    {[
                      { label: "X (Coordenada horizontal)", key: "x", val: selectedProcess.x },
                      { label: "Y (Coordenada vertical)", key: "y", val: selectedProcess.y },
                      { label: "Z (Profundidad)", key: "z", val: selectedProcess.z },
                      { label: "GRAPH (ID Sprite FPG)", key: "graph", val: selectedProcess.graph },
                      { label: "FILE (Librería FPG)", key: "file", val: selectedProcess.file },
                      { label: "ANGLE (Ángulo 0-360°)", key: "angle", val: selectedProcess.angle },
                      { label: "SIZE (Escala %)", key: "size", val: selectedProcess.size },
                      { label: "FLAGS (Espejo X/Y/Alfa)", key: "flags", val: selectedProcess.flags },
                      { label: "ALPHA (Opacidad 0-255)", key: "alpha", val: selectedProcess.alpha },
                      { label: "PRIORITY (Prioridad)", key: "priority", val: selectedProcess.priority },
                      { label: "CTYPE (Tipo colisión)", key: "ctype", val: selectedProcess.ctype },
                    ].map((item) => {
                      const isEditing = editingVar?.key === item.key;
                      return (
                        <div
                          key={item.key}
                          className="py-1 flex items-center justify-between group hover:bg-slate-900/60 px-1 rounded"
                        >
                          <span className="text-slate-400 text-[10px] truncate max-w-[150px]">
                            {item.key.toUpperCase()}
                          </span>

                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingVar.value}
                                onChange={(e) =>
                                  setEditingVar({ key: item.key, value: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveVariable(item.key, editingVar.value);
                                  if (e.key === "Escape") setEditingVar(null);
                                }}
                                className="w-16 px-1 py-0.5 bg-black border border-cyan-500 rounded text-cyan-300 text-[10px] font-mono focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveVariable(item.key, editingVar.value)}
                                className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingVar(null)}
                                className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() =>
                                !selectedProcess.isDead &&
                                setEditingVar({ key: item.key, value: String(item.val) })
                              }
                              className={`flex items-center gap-1 font-bold ${
                                selectedProcess.isDead
                                  ? "text-slate-500"
                                  : "text-cyan-300 hover:text-white cursor-pointer"
                              }`}
                            >
                              <span>{String(item.val)}</span>
                              {!selectedProcess.isDead && (
                                <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-500" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Process Custom Local Variables (localVars) */}
                <div className="rounded-lg bg-[#0a0f1d] border border-slate-800 overflow-hidden">
                  <div className="px-3 py-1.5 bg-[#0e162a] border-b border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Variables Locales (localVars)</span>
                    </div>
                    {!selectedProcess.isDead && (
                      <button
                        onClick={() => setIsAddingVar(!isAddingVar)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] flex items-center gap-1"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Variable</span>
                      </button>
                    )}
                  </div>

                  {isAddingVar && (
                    <div className="p-2 bg-slate-900 border-b border-slate-800 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="Nombre (ej: salud)"
                          value={newVarName}
                          onChange={(e) => setNewVarName(e.target.value)}
                          className="px-1.5 py-0.5 rounded bg-black border border-slate-700 text-slate-200 font-mono text-[10px] focus:outline-none focus:border-cyan-500"
                        />
                        <input
                          type="text"
                          placeholder="Valor (ej: 100)"
                          value={newVarValue}
                          onChange={(e) => setNewVarValue(e.target.value)}
                          className="px-1.5 py-0.5 rounded bg-black border border-slate-700 text-slate-200 font-mono text-[10px] focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setIsAddingVar(false)}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleAddNewVariable}
                          disabled={!newVarName.trim()}
                          className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] disabled:opacity-50"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-2 divide-y divide-slate-800/40 font-mono text-[11px]">
                    {Object.keys(selectedProcess.localVars).length === 0 ? (
                      <div className="py-2 text-center text-slate-500 italic text-[10px]">
                        Este proceso no tiene variables locales definidas aún.
                      </div>
                    ) : (
                      Object.entries(selectedProcess.localVars).map(([key, val]) => {
                        const isEditing = editingVar?.key === key;
                        return (
                          <div
                            key={key}
                            className="py-1 flex items-center justify-between group hover:bg-slate-900/60 px-1 rounded"
                          >
                            <span className="text-amber-400 font-bold text-[10px] truncate max-w-[130px]">
                              {key}
                            </span>

                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingVar.value}
                                  onChange={(e) =>
                                    setEditingVar({ key, value: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveVariable(key, editingVar.value);
                                    if (e.key === "Escape") setEditingVar(null);
                                  }}
                                  className="w-20 px-1 py-0.5 bg-black border border-amber-500 rounded text-amber-300 text-[10px] font-mono focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveVariable(key, editingVar.value)}
                                  className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingVar(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() =>
                                  !selectedProcess.isDead &&
                                  setEditingVar({ key, value: String(val) })
                                }
                                className={`flex items-center gap-1 font-bold ${
                                  selectedProcess.isDead
                                    ? "text-slate-500"
                                    : "text-slate-200 hover:text-white cursor-pointer"
                                }`}
                              >
                                <span>{String(val)}</span>
                                {!selectedProcess.isDead && (
                                  <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-500" />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Death Record Info */}
                {selectedProcess.isDead && (
                  <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/60 text-[11px] text-rose-300 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <Skull className="w-3.5 h-3.5 text-rose-400" />
                      <span>Registro de Terminación</span>
                    </div>
                    <div className="text-[10px] text-rose-200/80 font-mono">
                      Causa: <strong>{selectedProcess.deathReason || "s_kill / ciclo finalizado"}</strong>
                    </div>
                    {selectedProcess.diedAt && (
                      <div className="text-[10px] text-rose-200/70 font-mono">
                        Hora: {new Date(selectedProcess.diedAt).toLocaleTimeString()} (Frame #{selectedProcess.diedFrame || 0})
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 my-auto">
                <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-slate-400 text-xs">
                  Selecciona un proceso
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Haz clic en cualquier fila para inspeccionar y editar sus coordenadas X, Y y variables locales en tiempo real.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
