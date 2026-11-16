import React from "react";
import { Mic, MicOff, Send, Sparkles, Volume2, X } from "lucide-react";
import { VoiceLang } from "../hooks/useVoiceDictation";

interface VoiceMicButtonProps {
  isSupported: boolean;
  isListening: boolean;
  disabled?: boolean;
  onToggle: () => void;
  variant?: "dark" | "light";
  label?: string;
  className?: string;
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  isSupported,
  isListening,
  disabled = false,
  onToggle,
  variant = "dark",
  label,
  className = "",
}) => {
  const title = !isSupported
    ? "Tu navegador no admite dictado por voz Web Speech"
    : isListening
      ? "Detener dictado y usar lo hablado"
      : "Dictar instrucción por voz (Web Speech)";

  const baseStyles =
    variant === "dark"
      ? isListening
        ? "bg-[#7C2D48] text-white border-[#B95273] shadow-md"
        : "bg-[#0F172A] hover:bg-slate-800 text-slate-200 border-slate-700"
      : isListening
        ? "bg-[#7C2D48] text-white border-[#7C2D48] shadow-md"
        : "bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border-[#F3D0DC]";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || !isSupported}
      aria-pressed={isListening}
      aria-label={title}
      title={title}
      className={`min-h-[44px] min-w-[44px] px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${baseStyles} ${className}`}
    >
      {!isSupported ? (
        <MicOff className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Mic className={`w-4 h-4 flex-shrink-0 ${isListening ? "scale-110 transition-transform" : ""}`} />
      )}
      {label && <span className="whitespace-nowrap">{isListening ? "Detener" : label}</span>}
    </button>
  );
};

interface VoiceListeningBannerProps {
  isListening: boolean;
  interimTranscript: string;
  error: string | null;
  lang: VoiceLang;
  autoExecute: boolean;
  onChangeLang: (lang: VoiceLang) => void;
  onToggleAutoExecute: () => void;
  onFinishAndSend: () => void;
  onCancel: () => void;
  onDismissError: () => void;
  variant?: "dark" | "light";
}

export const VoiceListeningBanner: React.FC<VoiceListeningBannerProps> = ({
  isListening,
  interimTranscript,
  error,
  lang,
  autoExecute,
  onChangeLang,
  onToggleAutoExecute,
  onFinishAndSend,
  onCancel,
  onDismissError,
  variant = "dark",
}) => {
  if (!isListening && !error) return null;

  const isDark = variant === "dark";

  if (error && !isListening) {
    return (
      <div
        role="status"
        className={`rounded-xl border px-3 py-2.5 text-xs flex items-center justify-between gap-2 ${
          isDark
            ? "bg-rose-950/60 border-rose-800/80 text-rose-200"
            : "bg-[#FDF2F5] border-[#F3D0DC] text-[#7C2D48]"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MicOff className="w-4 h-4 flex-shrink-0" />
          <span className="leading-snug">{error}</span>
        </div>
        <button
          type="button"
          onClick={onDismissError}
          className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center hover:bg-black/10 cursor-pointer flex-shrink-0"
          aria-label="Cerrar aviso de micrófono"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Dictado por voz activo"
      className={`rounded-xl border p-3 space-y-2.5 transition-all ${
        isDark
          ? "bg-[#11192E] border-[#7C2D48] text-slate-100"
          : "bg-[#FDF2F5] border-[#7C2D48] text-[#111827]"
      }`}
    >
      {/* Top Bar: Active Voice Indicator + Language & Auto-send toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#7C2D48] text-white flex items-center justify-center flex-shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span>Escuchando tu voz...</span>
              <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                <span className="w-0.5 h-2 bg-[#7C2D48] rounded-full animate-bounce" />
                <span className="w-0.5 h-3 bg-[#2F6F4E] rounded-full animate-bounce [animation-delay:120ms]" />
                <span className="w-0.5 h-2 bg-[#7C2D48] rounded-full animate-bounce [animation-delay:240ms]" />
              </span>
            </div>
            <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-[#4B5563]"}`}>
              Habla natural, ej: &ldquo;crea una nave con disparos&rdquo; o &ldquo;probar juego&rdquo;
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language Switch */}
          <div
            className={`inline-flex rounded-lg p-0.5 border text-[10px] font-semibold ${
              isDark ? "bg-[#080d1a] border-slate-700" : "bg-white border-[#E2E8F0]"
            }`}
          >
            {(
              [
                { id: "es-ES", label: "ES" },
                { id: "es-MX", label: "MX" },
                { id: "en-US", label: "EN" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeLang(opt.id)}
                className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                  lang === opt.id
                    ? "bg-[#7C2D48] text-white"
                    : isDark
                      ? "text-slate-400 hover:text-white"
                      : "text-[#4B5563] hover:text-[#111827]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleAutoExecute}
            className={`min-h-[32px] px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
              autoExecute
                ? isDark
                  ? "bg-[#163828] border-[#2F6F4E] text-emerald-300"
                  : "bg-[#EEF6F1] border-[#2F6F4E] text-[#2F6F4E]"
                : isDark
                  ? "bg-[#080d1a] border-slate-700 text-slate-400"
                  : "bg-white border-[#E2E8F0] text-[#4B5563]"
            }`}
            title="Si está activo, al terminar de hablar se ejecuta automáticamente en la IA local"
          >
            <Sparkles className="w-3 h-3" />
            <span>{autoExecute ? "Auto-enviar: Sí" : "Solo escribir"}</span>
          </button>
        </div>
      </div>

      {/* Live Transcript Preview */}
      <div
        className={`rounded-lg px-3 py-2 text-xs min-h-[40px] border ${
          isDark
            ? "bg-[#070b15] border-slate-800 text-slate-100"
            : "bg-white border-[#E2E8F0] text-[#111827]"
        }`}
      >
        {interimTranscript ? (
          <span className="font-medium">&ldquo;{interimTranscript}&rdquo;</span>
        ) : (
          <span className={isDark ? "text-slate-500 italic" : "text-[#6B7280] italic"}>
            Esperando tus palabras... di qué quieres crear o &ldquo;probar juego&rdquo;.
          </span>
        )}
      </div>

      {/* Thumb-friendly Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
            isDark
              ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
              : "bg-white hover:bg-slate-50 border-[#E2E8F0] text-[#4B5563]"
          }`}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onFinishAndSend}
          className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{autoExecute ? "Terminar y Ejecutar ahora" : "Terminar dictado"}</span>
        </button>
      </div>
    </div>
  );
};
