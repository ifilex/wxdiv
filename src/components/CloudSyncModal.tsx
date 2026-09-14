import React, { useState } from "react";
import { X, Cloud, Users, ShieldCheck, Smartphone, RefreshCw, Key, Check, CheckCircle2 } from "lucide-react";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing">("synced");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [verified2fa, setVerified2fa] = useState(true);
  const [collaborators, setCollaborators] = useState([
    { name: "Tú (Lead Developer)", role: "Editor", status: "online", color: "#10b981" },
    { name: "Dev_Pixel88", role: "Artista FPG", status: "online", color: "#06b6d4" },
    { name: "RetroAudio_X", role: "Diseño Sonoro", status: "idle", color: "#f59e0b" },
  ]);

  if (!isOpen) return null;

  const triggerSync = () => {
    setSyncStatus("syncing");
    setTimeout(() => {
      setSyncStatus("synced");
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#080d1a] border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col text-xs text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d1527] border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-slate-100 text-sm">
              Sincronización en la Nube, Colaboración & Seguridad 2FA
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Cloud Sync Status */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-slate-200 block text-xs">
                  Estado de Sincronización Multi-Dispositivo
                </span>
                <span className="text-slate-400 text-[11px]">
                  {syncStatus === "synced"
                    ? "Todos los cambios sincronizados con la nube WXDIV (WebSockets P2P)"
                    : "Sincronizando estado y assets con el cluster..."}
                </span>
              </div>
            </div>

            <button
              onClick={triggerSync}
              disabled={syncStatus === "syncing"}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin text-cyan-400" : ""}`} />
              <span>{syncStatus === "syncing" ? "Sincronizando..." : "Forzar Sync"}</span>
            </button>
          </div>

          {/* Real-time Team Collaboration */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">Colaboradores en Tiempo Real</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-800/40">
                3 Conectados
              </span>
            </div>

            <div className="space-y-1.5">
              {collaborators.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-mono text-slate-200 text-xs">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500">{c.role}</span>
                    <span className={`text-[10px] font-mono ${c.status === "online" ? "text-emerald-400" : "text-amber-400"}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2FA (Two-Factor Authentication) Security */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-slate-200">Autenticación de Dos Factores (2FA)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-mono border border-purple-800/40">
                Protección WXDIV
              </span>
            </div>

            <p className="text-slate-400 text-[11px] mb-3">
              Medida de seguridad de nivel industrial para proteger el repositorio de código, los assets FPG y los accesos a la API de despliegue.
            </p>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-slate-200 font-semibold block text-xs">TOTP / App de Autenticación</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Estado: Activo y Verificado
                  </span>
                </div>
              </div>

              <button
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  twoFactorEnabled
                    ? "bg-purple-900/60 text-purple-200 border border-purple-700/50"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {twoFactorEnabled ? "2FA Habilitado" : "Deshabilitado"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0d1527] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
