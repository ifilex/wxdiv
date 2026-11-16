import React from "react";
import { X, Cloud, Users, ShieldCheck, ExternalLink, Brain } from "lucide-react";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
              Ecosistema Winebox y Privacidad Local
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-w-[40px] min-h-[40px] rounded-xl bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#4B5563] hover:text-[#111827] flex items-center justify-center cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto bg-[#F7F8FA]">
          {/* Zero-Secret Privacy Status */}
          <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#EEF6F1] text-[#2F6F4E] border border-[#CFE4D7] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-[#111827] block text-xs">
                Modo Privado Local (Sin Cuentas, Sin Tokens y Sin Contraseñas)
              </span>
              <span className="text-[#6B7280] text-[11px] block leading-relaxed">
                Tus proyectos y compilaciones permanecen guardados en tu propio navegador sin enviar credenciales de repositorios ni tokens privados a servidores externos.
              </span>
            </div>
          </div>

          {/* Conexión Oficial Ecosistema Winebox */}
          <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] space-y-2.5">
            <div>
              <span className="font-semibold text-[#111827] block text-xs">
                Ecosistema Winebox · Comunidad y Consola
              </span>
              <span className="text-[#6B7280] text-[11px]">
                Accede directamente a la comunidad clínica y a la consola cognitiva para compartir tus aplicaciones.
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="https://winebox.clinic"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 py-2 rounded-xl bg-[#FDF2F5] hover:bg-[#FCE7EE] border border-[#F3D0DC] flex items-center justify-between gap-2 text-[#7C2D48] font-semibold"
              >
                <span className="flex items-center gap-2 truncate">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate">winebox.clinic (Comunidad)</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
              <a
                href="https://winebox.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 py-2 rounded-xl bg-[#EEF6F1] hover:bg-[#E2EFE8] border border-[#CFE4D7] flex items-center justify-between gap-2 text-[#2F6F4E] font-semibold"
              >
                <span className="flex items-center gap-2 truncate">
                  <Brain className="w-4 h-4 shrink-0" />
                  <span className="truncate">winebox.cloud (Consola Cognitiva)</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
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
