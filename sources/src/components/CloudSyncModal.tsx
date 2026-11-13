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
    <div className="fixed inset-0 z-[9999] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-xl bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] text-xs text-[#374151]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#F7F8FA] border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#7C2D48] text-white flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-[#111827] text-sm truncate">
              Sincronización y Colaboración
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-w-[40px] min-h-[40px] rounded-xl bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#4B5563] hover:text-[#111827] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto bg-[#F7F8FA]">
          {/* Cloud Sync Status */}
          <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F3E8EC] text-[#7C2D48] border border-[#E5C9D3]">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-[#111827] block text-xs">
                  Estado de Sincronización Multi-Dispositivo
                </span>
                <span className="text-[#6B7280] text-[11px]">
                  {syncStatus === "synced"
                    ? "Todos los cambios sincronizados con la nube WXDIV"
                    : "Sincronizando estado y assets..."}
                </span>
              </div>
            </div>

            <button
              onClick={triggerSync}
              disabled={syncStatus === "syncing"}
              className="px-3.5 min-h-[40px] rounded-xl bg-[#7C2D48] hover:bg-[#66233A] text-white font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
              <span>{syncStatus === "syncing" ? "Sincronizando..." : "Forzar Sync"}</span>
            </button>
          </div>

          {/* Real-time Team Collaboration */}
          <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2F6F4E]" />
                <span className="font-semibold text-[#111827]">Colaboradores</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#2F6F4E] text-[10px] font-mono border border-emerald-200">
                3 Conectados
              </span>
            </div>

            <div className="space-y-1.5">
              {collaborators.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="font-mono text-[#111827] text-xs truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-[#6B7280]">{c.role}</span>
                    <span className={`text-[10px] font-mono font-semibold ${c.status === "online" ? "text-[#2F6F4E]" : "text-amber-600"}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2FA Security */}
          <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#7C2D48]" />
                <span className="font-semibold text-[#111827]">Autenticación 2FA</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#F3E8EC] text-[#7C2D48] text-[10px] font-mono border border-[#E5C9D3]">
                Protección WXDIV
              </span>
            </div>

            <p className="text-[#6B7280] text-[11px] mb-3">
              Protege el repositorio de código, recursos FPG y los accesos de despliegue.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-[#7C2D48]" />
                <div>
                  <span className="text-[#111827] font-semibold block text-xs">App de Autenticación TOTP</span>
                  <span className="text-[10px] text-[#2F6F4E] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Estado: Activo
                  </span>
                </div>
              </div>

              <button
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`px-3.5 min-h-[40px] rounded-xl font-semibold transition-colors cursor-pointer ${
                  twoFactorEnabled
                    ? "bg-[#2F6F4E] text-white"
                    : "bg-white border border-[#E2E8F0] text-[#4B5563]"
                }`}
              >
                {twoFactorEnabled ? "2FA Habilitado" : "Deshabilitado"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-white border-t border-[#E2E8F0] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 min-h-[44px] rounded-xl bg-[#F7F8FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#111827] font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
