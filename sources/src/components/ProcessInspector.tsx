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
  const [mobileTab, setMobileTab] = useState<"charts" | "processes" | "vars">("processes");

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
    <div className="flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] font-sans select-none overflow-hidden text-xs">
      {/* 1. Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white border-b border-[#E2E8F0] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FDF2F4] border border-[#FBCFE8] text-[#7C2D48]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-[#111827] text-xs">Debugger de Procesos DIV</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#2F6F4E] border border-[#A7F3D0] font-mono text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F6F4E]" />
                <span>{counts.alive} Vivos</span>
              </span>
              {counts.dead > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[10px] font-bold">
                  {counts.dead} Muertos
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#6B7280] hidden sm:block">
              Telemetría en tiempo real de FPS, memoria, coordenadas y variables
            </p>
          </div>
        </div>

        {/* View Mode & Live Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Desktop View Mode Switcher */}
          <div className="hidden lg:flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewMode("split")}
              className={`px-2.5 min-h-[32px] rounded-md transition-colors ${
                viewMode === "split"
                  ? "bg-[#7C2D48] text-white font-bold"
                  : "text-[#4B5563] hover:text-[#111827]"
              }`}
              title="Vista Dividida: Gráficos arriba y Tabla abajo"
            >
              Dividida
            </button>
            <button
              onClick={() => setViewMode("charts")}
              className={`px-2.5 min-h-[32px] rounded-md transition-colors flex items-center gap-1 ${
                viewMode === "charts"
                  ? "bg-[#7C2D48] text-white font-bold"
                  : "text-[#4B5563] hover:text-[#111827]"
              }`}
              title="Panel Completo de Gráficos (FPS & Memoria)"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Gráficos</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 min-h-[32px] rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-[#7C2D48] text-white font-bold"
                  : "text-[#4B5563] hover:text-[#111827]"
              }`}
              title="Solo Tabla de Procesos y Variables"
            >
              Tabla
            </button>
          </div>

          <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 min-h-[36px] text-xs font-mono gap-1 text-[#374151]">
            <Clock className="w-3.5 h-3.5 text-[#7C2D48]" />
            <select
              value={refreshRate}
              onChange={(e) => setRefreshRate(e.target.value as RefreshRate)}
              className="bg-transparent text-[#111827] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="live">60 FPS</option>
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
            className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border transition-colors ${
              isManualPaused
                ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                : "bg-white text-[#374151] border-[#E2E8F0] hover:bg-[#F8FAFC]"
            }`}
            title={isManualPaused ? "Reanudar muestreo en vivo" : "Pausar muestreo"}
          >
            {isManualPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={updateSnapshot}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-white text-[#374151] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
            title="Refrescar memoria ahora"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleLetMeAlone}
            className="px-2.5 min-h-[36px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-mono text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
            title="let_me_alone(): mata todos los procesos excepto el seleccionado"
          >
            <Skull className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">let_me_alone()</span>
            <span className="sm:hidden">Aislar</span>
          </button>

          {isEmbeddedOverlay && onCloseOverlay && (
            <button
              onClick={onCloseOverlay}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#374151]"
              title="Cerrar overlay de depuración"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-tabs (< lg) */}
      <div className="flex lg:hidden items-center bg-white border-b border-[#E2E8F0] px-3 py-1.5 gap-1.5 flex-shrink-0">
        <button
          onClick={() => setMobileTab("processes")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "processes"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          Procesos ({filteredProcesses.length})
        </button>
        <button
          onClick={() => setMobileTab("vars")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "vars"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          {selectedProcess ? `Vars #${selectedProcess.id}` : "Variables"}
        </button>
        <button
          onClick={() => setMobileTab("charts")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "charts"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          Gráficos
        </button>
      </div>

      {/* 1.5 ACTIVE BREAKPOINT STATUS CALLOUT */}
      {breakpointInfo && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 bg-amber-50 border-b border-amber-300 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
              <CircleDot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-amber-950 text-xs font-mono">
                  MOTOR PAUSADO EN BREAKPOINT
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-mono text-[11px] font-bold">
                  Línea {breakpointInfo.line}
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-amber-300 text-[#7C2D48] font-mono text-[11px] font-bold">
                  {breakpointInfo.processName || "Principal"} {breakpointInfo.processId ? `[#${breakpointInfo.processId}]` : ""}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Frame #{breakpointInfo.frame} • Variables congeladas para inspección en vivo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                runtime.resumeFromBreakpoint();
                setBreakpointInfo(null);
                updateSnapshot();
              }}
              className="px-3 min-h-[36px] rounded-lg bg-[#2F6F4E] hover:bg-[#25593E] text-white font-bold flex items-center gap-1.5 text-xs transition-colors"
              title="Continuar ejecución del motor DIV (F5)"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Continuar</span>
            </button>
            <button
              onClick={() => {
                runtime.stepFrame();
                setBreakpointInfo(runtime.currentBreakpoint);
                updateSnapshot();
              }}
              className="px-3 min-h-[36px] rounded-lg bg-[#7C2D48] hover:bg-[#66233A] text-white font-bold flex items-center gap-1.5 text-xs transition-colors"
              title="Avanzar 1 frame paso a paso (F10)"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>+1 Frame</span>
            </button>
            <button
              onClick={() => {
                runtime.removeBreakpoint(breakpointInfo.line);
                setBreakpointInfo(null);
                updateSnapshot();
              }}
              className="px-2.5 min-h-[36px] rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 text-xs font-semibold"
              title="Eliminar este breakpoint de la línea"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Quitar BP</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. RECHARTS TELEMETRY DASHBOARD PANEL */}
      {(viewMode === "split" || viewMode === "charts") && (
        <div
          className={`${
            mobileTab === "charts" ? "flex flex-1 overflow-y-auto" : "hidden"
          } lg:flex lg:flex-none bg-[#F7F8FA] border-b border-[#E2E8F0] p-3 flex-col gap-3 flex-shrink-0`}
        >
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                <span className="flex items-center gap-1 text-[#2F6F4E] font-bold">
                  <Gauge className="w-3 h-3" />
                  <span>REFRESCO</span>
                </span>
                <span className="font-mono">Obj: 60</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span
                  className={`text-xl font-black font-mono tracking-tight ${
                    statsSummary.currentFps >= 55
                      ? "text-[#2F6F4E]"
                      : statsSummary.currentFps >= 30
                      ? "text-amber-600"
                      : "text-rose-600"
                  }`}
                >
                  {statsSummary.currentFps}
                </span>
                <span className="text-[10px] text-[#6B7280] font-mono">FPS</span>
              </div>
              <div className="text-[10px] text-[#6B7280] font-mono flex items-center justify-between mt-1 pt-1 border-t border-[#F1F5F9]">
                <span>Min:{statsSummary.minFps}</span>
                <span>Prom:{statsSummary.avgFps}</span>
                <span>Max:{statsSummary.maxFps}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                <span className="flex items-center gap-1 text-[#7C2D48] font-bold">
                  <Database className="w-3 h-3" />
                  <span>MEMORIA DIV</span>
                </span>
                <span className="font-mono">KB</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black font-mono text-[#7C2D48] tracking-tight">
                  {statsSummary.currentMemKB}
                </span>
                <span className="text-[10px] text-[#6B7280] font-mono">KB</span>
              </div>
              <div className="text-[10px] text-[#6B7280] font-mono flex items-center justify-between mt-1 pt-1 border-t border-[#F1F5F9]">
                <span>Pico: {statsSummary.peakMemKB}KB</span>
                <span>~{statsSummary.avgMemPerProcKB}/p</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                <span className="flex items-center gap-1 text-[#374151] font-bold">
                  <Activity className="w-3 h-3 text-[#7C2D48]" />
                  <span>PROCESOS</span>
                </span>
                <span className="font-mono">Total:{counts.total}</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black font-mono text-[#2F6F4E] tracking-tight">
                  {counts.alive}
                </span>
                <span className="text-[10px] text-[#6B7280] font-mono">
                  vivos / {counts.dead} muertos
                </span>
              </div>
              <div className="text-[10px] text-[#6B7280] font-mono flex items-center justify-between mt-1 pt-1 border-t border-[#F1F5F9]">
                <span>Cong: {counts.frozen}</span>
                <span>Dorm: {counts.sleeping}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                <span className="flex items-center gap-1 text-[#374151] font-bold">
                  <Zap className="w-3 h-3 text-amber-600" />
                  <span>RENDER CPU</span>
                </span>
                <span className="font-mono">#{runtime.frameCount}</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black font-mono text-[#111827] tracking-tight">
                  {Math.round((runtime.renderDuration || 0) * 10) / 10}
                </span>
                <span className="text-[10px] text-[#6B7280] font-mono">ms</span>
              </div>
              <div className="text-[10px] text-[#6B7280] font-mono flex items-center justify-between mt-1 pt-1 border-t border-[#F1F5F9]">
                <span>Heap: {statsSummary.heapMB ? `${statsSummary.heapMB}MB` : "N/D"}</span>
              </div>
            </div>
          </div>

          {/* Chart Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-[#111827]">Métricas:</span>
              <div className="flex items-center bg-white border border-[#E2E8F0] rounded-lg p-0.5 font-mono text-[11px]">
                <button
                  onClick={() => setChartMetric("both")}
                  className={`px-2.5 min-h-[30px] rounded-md transition-colors ${
                    chartMetric === "both"
                      ? "bg-[#7C2D48] text-white font-bold"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                >
                  Ambos
                </button>
                <button
                  onClick={() => setChartMetric("fps")}
                  className={`px-2.5 min-h-[30px] rounded-md transition-colors ${
                    chartMetric === "fps"
                      ? "bg-[#2F6F4E] text-white font-bold"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                >
                  Solo FPS
                </button>
                <button
                  onClick={() => setChartMetric("memory")}
                  className={`px-2.5 min-h-[30px] rounded-md transition-colors ${
                    chartMetric === "memory"
                      ? "bg-[#7C2D48] text-white font-bold"
                      : "text-[#4B5563] hover:text-[#111827]"
                  }`}
                >
                  Memoria
                </button>
              </div>
            </div>

            <button
              onClick={() => setTelemetryHistory([])}
              className="px-2.5 min-h-[32px] rounded-lg bg-white hover:bg-[#F1F5F9] text-[#4B5563] border border-[#E2E8F0] font-mono text-[11px] font-semibold"
              title="Reiniciar buffer de muestras de gráficos"
            >
              Limpiar Historial
            </button>
          </div>

          {/* Recharts Streaming Canvas */}
          <div
            className={`grid gap-3 ${
              chartMetric === "both"
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {(chartMetric === "both" || chartMetric === "fps") && (
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex flex-col">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#111827]">
                    <span className="w-2 h-2 rounded-full bg-[#2F6F4E]" />
                    <span>Tasa de Refresco (FPS)</span>
                  </div>
                  <span className="text-xs font-mono text-[#2F6F4E] font-bold">
                    {statsSummary.currentFps} FPS
                  </span>
                </div>

                <div className="w-full" style={{ height: viewMode === "charts" || mobileTab === "charts" ? 180 : 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={telemetryHistory}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="fpsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2F6F4E" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2F6F4E" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#6B7280", fontSize: 9, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                      />
                      <YAxis
                        domain={[0, 75]}
                        ticks={[0, 20, 40, 60]}
                        tick={{ fill: "#6B7280", fontSize: 9, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <ReferenceLine
                        y={60}
                        stroke="#2F6F4E"
                        strokeDasharray="3 3"
                        strokeWidth={1}
                        label={{
                          value: "60 FPS",
                          fill: "#2F6F4E",
                          fontSize: 8,
                          position: "insideTopRight",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="fps"
                        stroke="#2F6F4E"
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

            {(chartMetric === "both" || chartMetric === "memory") && (
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex flex-col">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#111827]">
                    <span className="w-2 h-2 rounded-full bg-[#7C2D48]" />
                    <span>Memoria Procesos (KB)</span>
                  </div>
                  <span className="text-xs font-mono text-[#7C2D48] font-bold">
                    {statsSummary.currentMemKB} KB
                  </span>
                </div>

                <div className="w-full" style={{ height: viewMode === "charts" || mobileTab === "charts" ? 180 : 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={telemetryHistory}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C2D48" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7C2D48" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#6B7280", fontSize: 9, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                      />
                      <YAxis
                        tick={{ fill: "#6B7280", fontSize: 9, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="memoryKB"
                        stroke="#7C2D48"
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

      {/* 3. Filter & Search Bar */}
      {viewMode !== "charts" && (
        <div
          className={`${
            mobileTab === "processes" ? "flex" : "hidden lg:flex"
          } flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white border-b border-[#E2E8F0] text-xs flex-shrink-0`}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full no-scrollbar">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 min-h-[34px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === "all"
                  ? "bg-[#7C2D48] text-white"
                  : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
              }`}
            >
              Todos ({counts.total})
            </button>
            <button
              onClick={() => setFilter("alive")}
              className={`px-2.5 min-h-[34px] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                filter === "alive"
                  ? "bg-[#2F6F4E] text-white"
                  : "bg-[#F8FAFC] text-[#2F6F4E] border border-[#E2E8F0]"
              }`}
            >
              <span>Vivos ({counts.alive})</span>
            </button>
            <button
              onClick={() => setFilter("frozen")}
              className={`px-2.5 min-h-[34px] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                filter === "frozen"
                  ? "bg-sky-600 text-white"
                  : "bg-[#F8FAFC] text-sky-700 border border-[#E2E8F0]"
              }`}
            >
              <Snowflake className="w-3 h-3" />
              <span>Cong ({counts.frozen})</span>
            </button>
            <button
              onClick={() => setFilter("sleeping")}
              className={`px-2.5 min-h-[34px] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                filter === "sleeping"
                  ? "bg-amber-600 text-white"
                  : "bg-[#F8FAFC] text-amber-700 border border-[#E2E8F0]"
              }`}
            >
              <Moon className="w-3 h-3" />
              <span>Dorm ({counts.sleeping})</span>
            </button>
            <button
              onClick={() => setFilter("dead")}
              className={`px-2.5 min-h-[34px] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                filter === "dead"
                  ? "bg-rose-600 text-white"
                  : "bg-[#F8FAFC] text-rose-700 border border-[#E2E8F0]"
              }`}
            >
              <Skull className="w-3 h-3" />
              <span>Muertos ({counts.dead})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ID, nombre o var..."
                className="pl-8 pr-2.5 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#111827] placeholder-[#9CA3AF] font-mono text-xs focus:outline-none focus:border-[#7C2D48] w-full sm:w-52"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleFreezeAll}
                className="px-2.5 min-h-[34px] rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-sky-700 font-semibold text-[11px] whitespace-nowrap"
                title="Congelar todos los procesos activos"
              >
                Congelar
              </button>
              <button
                onClick={handleWakeupAll}
                className="px-2.5 min-h-[34px] rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#2F6F4E] font-semibold text-[11px] whitespace-nowrap"
                title="Despertar todos los procesos congelados/dormidos"
              >
                Despertar
              </button>
              {counts.dead > 0 && (
                <button
                  onClick={() => {
                    runtime.clearDeadProcesses();
                    setDeadList([]);
                  }}
                  className="px-2.5 min-h-[34px] rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-[11px] whitespace-nowrap"
                  title="Limpiar historial de procesos muertos"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Process List/Table & Deep Variable Inspector Pane */}
      {viewMode !== "charts" && (
        <div
          className={`${
            mobileTab === "charts" ? "hidden lg:flex" : "flex"
          } flex-1 min-h-0 overflow-hidden`}
        >
          {/* Left Side: Process Table / Mobile Cards */}
          <div
            className={`${
              mobileTab === "processes" ? "flex" : "hidden lg:flex"
            } flex-1 flex-col min-w-0 min-h-0 overflow-auto lg:border-r border-[#E2E8F0] bg-white`}
          >
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-[#F8FAFC] text-[#4B5563] border-b border-[#E2E8F0] sticky top-0 z-10 select-none">
                <tr>
                  <th className="p-2.5 w-12 text-center">ID</th>
                  <th className="p-2.5">Proceso</th>
                  <th className="p-2.5">Estado</th>
                  <th className="p-2.5 hidden sm:table-cell">X, Y</th>
                  <th className="p-2.5 hidden md:table-cell">Graph</th>
                  <th className="p-2.5 hidden xl:table-cell">Variables Locales</th>
                  <th className="p-2.5 text-right">Señales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredProcesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#6B7280] font-sans">
                      <Cpu className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                      <p className="font-semibold text-[#374151] text-xs">
                        No se encontraron procesos {filter !== "all" ? `con estado "${filter}"` : "activos"}
                      </p>
                      <p className="text-[11px] text-[#6B7280] mt-1">
                        Inicia la ejecución del juego para inspeccionar procesos en tiempo real.
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
                            ? "bg-amber-50 font-bold"
                            : isSelected
                            ? "bg-[#FDF2F4]"
                            : proc.isDead
                            ? "bg-rose-50/40 opacity-75"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="p-2.5 text-center text-[#7C2D48] font-bold">
                          #{proc.id}
                        </td>

                        <td className="p-2.5 font-bold text-[#111827]">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="truncate max-w-[120px]">{proc.name}</span>
                            {isPausedHere && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-mono flex items-center gap-0.5">
                                <CircleDot className="w-2.5 h-2.5" />
                                <span>L{breakpointInfo.line}</span>
                              </span>
                            )}
                          </div>
                          <div className="sm:hidden text-[10px] text-[#6B7280] font-normal mt-0.5">
                            ({Math.round(proc.x)}, {Math.round(proc.y)}) • G:{proc.graph || 0}
                          </div>
                        </td>

                        <td className="p-2.5">
                          {proc.isDead ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                              <Skull className="w-3 h-3" />
                              <span className="hidden sm:inline">Muerto</span>
                            </span>
                          ) : proc.isFrozen ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-[10px] font-bold">
                              <Snowflake className="w-3 h-3" />
                              <span className="hidden sm:inline">Congelado</span>
                            </span>
                          ) : proc.isSleeping ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                              <Moon className="w-3 h-3" />
                              <span className="hidden sm:inline">Dormido</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#2F6F4E] text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2F6F4E]" />
                              <span>Vivo</span>
                            </span>
                          )}
                        </td>

                        <td className="p-2.5 font-mono text-[#374151] hidden sm:table-cell">
                          ({Math.round(proc.x)}, {Math.round(proc.y)})
                        </td>

                        <td className="p-2.5 text-[#7C2D48] font-semibold hidden md:table-cell">
                          {proc.graph > 0 ? `ID ${proc.graph}` : <span className="text-[#9CA3AF]">-</span>}
                        </td>

                        <td className="p-2.5 max-w-[180px] hidden xl:table-cell">
                          {localKeys.length === 0 ? (
                            <span className="text-[#9CA3AF] italic text-[10px]">ninguna</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {localKeys.slice(0, 3).map((k) => (
                                <span
                                  key={k}
                                  className="px-1.5 py-0.5 rounded bg-[#F8FAFC] text-[#374151] border border-[#E2E8F0] text-[10px] truncate max-w-[80px]"
                                  title={`${k} = ${JSON.stringify(proc.localVars[k])}`}
                                >
                                  {k}={String(proc.localVars[k])}
                                </span>
                              ))}
                              {localKeys.length > 3 && (
                                <span className="text-[10px] text-[#7C2D48] font-bold">
                                  +{localKeys.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="p-2.5 text-right">
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
                                  className={`min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg border transition-colors ${
                                    proc.isFrozen
                                      ? "bg-sky-100 text-sky-700 border-sky-300"
                                      : "bg-[#F8FAFC] text-[#4B5563] border-[#E2E8F0] hover:text-sky-700"
                                  }`}
                                  title={proc.isFrozen ? "s_wakeup: despertar" : "s_freeze: congelar"}
                                >
                                  {proc.isFrozen ? (
                                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                                  ) : (
                                    <Snowflake className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <button
                                  onClick={() =>
                                    handleSignal(proc.id, proc.isSleeping ? "s_wakeup" : "s_sleep")
                                  }
                                  className={`min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg border transition-colors hidden sm:flex ${
                                    proc.isSleeping
                                      ? "bg-amber-100 text-amber-800 border-amber-300"
                                      : "bg-[#F8FAFC] text-[#4B5563] border-[#E2E8F0] hover:text-amber-700"
                                  }`}
                                  title={proc.isSleeping ? "s_wakeup: despertar" : "s_sleep: dormir"}
                                >
                                  <Moon className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleSignal(proc.id, "s_kill")}
                                  className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-[#F8FAFC] text-rose-600 border border-[#E2E8F0] hover:bg-rose-50 hover:border-rose-300 transition-colors"
                                  title="s_kill: matar proceso"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => {
                                setSelectedProcessId(proc.id);
                                setMobileTab("vars");
                              }}
                              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-[#FDF2F4] text-[#7C2D48] border border-[#FBCFE8] hover:bg-[#FCE7EB] transition-colors"
                              title="Inspeccionar todas las variables"
                            >
                              <Sliders className="w-3.5 h-3.5" />
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
          <div
            className={`${
              mobileTab === "vars" ? "flex" : "hidden lg:flex"
            } w-full lg:w-96 flex-col min-h-0 bg-[#F7F8FA] overflow-y-auto`}
          >
            {selectedProcess ? (
              <div className="p-3.5 space-y-3">
                {/* Header Info */}
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#7C2D48] font-mono">
                        #{selectedProcess.id}
                      </span>
                      <span className="font-bold text-[#111827] text-xs">
                        {selectedProcess.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">
                      Padre: {selectedProcess.father > 0 ? `#${selectedProcess.father}` : "0 (Raíz)"}
                    </div>
                  </div>

                  <div>
                    {selectedProcess.isDead ? (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-mono text-[10px] font-bold">
                        Muerto ({selectedProcess.deathReason || "fin"})
                      </span>
                    ) : selectedProcess.isFrozen ? (
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-700 font-mono text-[10px] font-bold">
                        Congelado
                      </span>
                    ) : selectedProcess.isSleeping ? (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-bold">
                        Dormido
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#2F6F4E] font-mono text-[10px] font-bold">
                        Activo / Vivo
                      </span>
                    )}
                  </div>
                </div>

                {/* DIV Reserved Internal Variables (Live Editable) */}
                <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden">
                  <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-[#111827]">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#7C2D48]" />
                      <span>Variables Internas DIV</span>
                    </div>
                    <span className="text-[10px] font-normal text-[#6B7280]">
                      Toca para editar
                    </span>
                  </div>

                  <div className="p-2 divide-y divide-[#F1F5F9] font-mono text-xs">
                    {[
                      { label: "X", key: "x", val: selectedProcess.x },
                      { label: "Y", key: "y", val: selectedProcess.y },
                      { label: "Z", key: "z", val: selectedProcess.z },
                      { label: "GRAPH", key: "graph", val: selectedProcess.graph },
                      { label: "FILE", key: "file", val: selectedProcess.file },
                      { label: "ANGLE", key: "angle", val: selectedProcess.angle },
                      { label: "SIZE", key: "size", val: selectedProcess.size },
                      { label: "FLAGS", key: "flags", val: selectedProcess.flags },
                      { label: "ALPHA", key: "alpha", val: selectedProcess.alpha },
                      { label: "PRIORITY", key: "priority", val: selectedProcess.priority },
                      { label: "CTYPE", key: "ctype", val: selectedProcess.ctype },
                    ].map((item) => {
                      const isEditing = editingVar?.key === item.key;
                      return (
                        <div
                          key={item.key}
                          className="py-1.5 flex items-center justify-between hover:bg-[#F8FAFC] px-1.5 rounded-lg"
                        >
                          <span className="text-[#4B5563] text-[11px] font-semibold">
                            {item.label}
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
                                className="w-20 h-8 px-2 bg-white border border-[#7C2D48] rounded-md text-[#111827] text-xs font-mono focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveVariable(item.key, editingVar.value)}
                                className="min-w-[32px] min-h-[32px] flex items-center justify-center text-white bg-[#2F6F4E] rounded-md"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingVar(null)}
                                className="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#4B5563] bg-[#F1F5F9] rounded-md"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={selectedProcess.isDead}
                              onClick={() =>
                                !selectedProcess.isDead &&
                                setEditingVar({ key: item.key, value: String(item.val) })
                              }
                              className={`flex items-center gap-1.5 px-2 min-h-[30px] rounded-md font-bold ${
                                selectedProcess.isDead
                                  ? "text-[#9CA3AF]"
                                  : "text-[#7C2D48] bg-[#FDF2F4]/60 hover:bg-[#FDF2F4] cursor-pointer"
                              }`}
                            >
                              <span>{String(item.val)}</span>
                              {!selectedProcess.isDead && (
                                <Edit2 className="w-3 h-3 opacity-70" />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Process Custom Local Variables (localVars) */}
                <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden">
                  <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-[#111827]">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#2F6F4E]" />
                      <span>Variables Locales</span>
                    </div>
                    {!selectedProcess.isDead && (
                      <button
                        onClick={() => setIsAddingVar(!isAddingVar)}
                        className="px-2.5 min-h-[30px] rounded-lg bg-[#7C2D48] text-white text-[11px] flex items-center gap-1 font-bold"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Variable</span>
                      </button>
                    )}
                  </div>

                  {isAddingVar && (
                    <div className="p-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="Nombre (ej: salud)"
                          value={newVarName}
                          onChange={(e) => setNewVarName(e.target.value)}
                          className="px-2 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#111827] font-mono text-xs focus:outline-none focus:border-[#7C2D48]"
                        />
                        <input
                          type="text"
                          placeholder="Valor (ej: 100)"
                          value={newVarValue}
                          onChange={(e) => setNewVarValue(e.target.value)}
                          className="px-2 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#111827] font-mono text-xs focus:outline-none focus:border-[#7C2D48]"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setIsAddingVar(false)}
                          className="px-3 min-h-[32px] rounded-lg bg-[#E2E8F0] text-[#374151] text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleAddNewVariable}
                          disabled={!newVarName.trim()}
                          className="px-3 min-h-[32px] rounded-lg bg-[#7C2D48] hover:bg-[#66233A] text-white font-bold text-xs disabled:opacity-50"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-2 divide-y divide-[#F1F5F9] font-mono text-xs">
                    {Object.keys(selectedProcess.localVars).length === 0 ? (
                      <div className="py-3 text-center text-[#6B7280] italic text-[11px]">
                        Este proceso no tiene variables locales definidas aún.
                      </div>
                    ) : (
                      Object.entries(selectedProcess.localVars).map(([key, val]) => {
                        const isEditing = editingVar?.key === key;
                        return (
                          <div
                            key={key}
                            className="py-1.5 flex items-center justify-between hover:bg-[#F8FAFC] px-1.5 rounded-lg"
                          >
                            <span className="text-[#2F6F4E] font-bold text-[11px] truncate max-w-[130px]">
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
                                  className="w-20 h-8 px-2 bg-white border border-[#7C2D48] rounded-md text-[#111827] text-xs font-mono focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveVariable(key, editingVar.value)}
                                  className="min-w-[32px] min-h-[32px] flex items-center justify-center text-white bg-[#2F6F4E] rounded-md"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingVar(null)}
                                  className="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#4B5563] bg-[#F1F5F9] rounded-md"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={selectedProcess.isDead}
                                onClick={() =>
                                  !selectedProcess.isDead &&
                                  setEditingVar({ key, value: String(val) })
                                }
                                className={`flex items-center gap-1.5 px-2 min-h-[30px] rounded-md font-bold ${
                                  selectedProcess.isDead
                                    ? "text-[#9CA3AF]"
                                    : "text-[#111827] bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer"
                                }`}
                              >
                                <span>{String(val)}</span>
                                {!selectedProcess.isDead && (
                                  <Edit2 className="w-3 h-3 opacity-70 text-[#6B7280]" />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Death Record Info */}
                {selectedProcess.isDead && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Skull className="w-4 h-4 text-rose-600" />
                      <span>Registro de Terminación</span>
                    </div>
                    <div className="text-[11px] font-mono">
                      Causa: <strong>{selectedProcess.deathReason || "s_kill / ciclo finalizado"}</strong>
                    </div>
                    {selectedProcess.diedAt && (
                      <div className="text-[11px] font-mono">
                        Hora: {new Date(selectedProcess.diedAt).toLocaleTimeString()} (Frame #{selectedProcess.diedFrame || 0})
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-[#6B7280] my-auto">
                <Info className="w-7 h-7 mx-auto mb-2 text-[#CBD5E1]" />
                <p className="font-bold text-[#374151] text-xs">
                  Selecciona un proceso
                </p>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Toca cualquier fila en "Procesos" para editar sus coordenadas X, Y y variables en vivo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
