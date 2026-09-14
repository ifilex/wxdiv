import React from "react";
import { Cpu, Power, Snowflake, Sun, Trash2 } from "lucide-react";
import { DivProcess } from "../types";
import { DivRuntime } from "../engine/runtime";

interface ProcessInspectorProps {
  runtime: DivRuntime;
  processes: DivProcess[];
}

export const ProcessInspector: React.FC<ProcessInspectorProps> = ({ runtime, processes }) => {
  return (
    <div className="flex flex-col h-full bg-[#080d1a] border border-slate-800 rounded-lg overflow-hidden text-xs text-slate-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1527] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100">Inspector de Procesos en Tiempo Real</span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 text-[10px] font-mono">
            {processes.length} Procesos activos
          </span>
        </div>

        <button
          onClick={() => runtime.letMeAlone(0)}
          className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 flex items-center gap-1 transition-colors text-[11px]"
          title="let_me_alone(): mata todos los procesos"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>let_me_alone()</span>
        </button>
      </div>

      {/* Process Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left font-mono text-[11px] border-collapse">
          <thead className="bg-[#0b1222] text-slate-400 border-b border-slate-800 sticky top-0 z-10">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Proceso</th>
              <th className="p-2">Padre</th>
              <th className="p-2">X, Y</th>
              <th className="p-2">Graph</th>
              <th className="p-2">Ángulo</th>
              <th className="p-2">Flags</th>
              <th className="p-2">Estado</th>
              <th className="p-2 text-right">Señales (Signals)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {processes.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-slate-500 font-sans">
                  No hay procesos en ejecución. Inicia el juego para inspeccionar la memoria.
                </td>
              </tr>
            ) : (
              processes.map((proc) => (
                <tr key={proc.id} className="hover:bg-slate-800/40">
                  <td className="p-2 text-cyan-400">#{proc.id}</td>
                  <td className="p-2 font-bold text-slate-200">{proc.name}</td>
                  <td className="p-2 text-slate-500">{proc.father || 0}</td>
                  <td className="p-2 text-slate-300">
                    ({Math.round(proc.x)}, {Math.round(proc.y)})
                  </td>
                  <td className="p-2 text-amber-300">
                    {proc.graph ? `ID ${proc.graph}` : "0 (none)"}
                  </td>
                  <td className="p-2 text-slate-400">{proc.angle}°</td>
                  <td className="p-2 text-slate-500">{proc.flags}</td>
                  <td className="p-2">
                    {proc.isDead ? (
                      <span className="text-rose-400">Dead</span>
                    ) : proc.isFrozen ? (
                      <span className="text-sky-400">Frozen</span>
                    ) : proc.isSleeping ? (
                      <span className="text-amber-400">Sleeping</span>
                    ) : (
                      <span className="text-emerald-400">Active</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          runtime.signal(proc.id, proc.isFrozen ? "s_wakeup" : "s_freeze")
                        }
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400"
                        title={proc.isFrozen ? "s_wakeup" : "s_freeze"}
                      >
                        {proc.isFrozen ? <Sun className="w-3 h-3" /> : <Snowflake className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => runtime.signal(proc.id, "s_kill")}
                        className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-rose-400"
                        title="s_kill: matar proceso"
                      >
                        <Power className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
