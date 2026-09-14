import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Cpu,
  Trash2,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  getAiConfig,
  saveAiConfig,
  verifyAiApiKey,
  AVAILABLE_MODELS,
  AiConfig,
} from "../services/aiConfig";

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-3.8-flash");
  const [useCustomKey, setUseCustomKey] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    status: "idle" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });
  const [hasServerEnvKey, setHasServerEnvKey] = useState(false);

  // Load configuration on open
  useEffect(() => {
    if (isOpen) {
      const cfg = getAiConfig();
      setApiKey(cfg.apiKey || "");
      setSelectedModel(cfg.model || "gemini-3.8-flash");
      setUseCustomKey(cfg.useCustomKey);
      setIsActive(cfg.isActive);
      setVerifyResult({ status: "idle", message: "" });

      // Check server health
      fetch("/api/health")
        .then((r) => r.json())
        .then((data) => {
          setHasServerEnvKey(Boolean(data.hasServerEnvKey));
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    const keyToTest = useCustomKey ? apiKey.trim() : "";
    if (useCustomKey && !keyToTest) {
      setVerifyResult({
        status: "error",
        message: "Por favor ingresa una clave de API para probar la conexión.",
      });
      return;
    }

    setIsVerifying(true);
    setVerifyResult({ status: "idle", message: "" });

    try {
      const res = await verifyAiApiKey(keyToTest, selectedModel);
      if (res.ok) {
        setVerifyResult({
          status: "success",
          message: `¡Conexión validada con éxito! Modelo: ${res.model || selectedModel}`,
        });
      } else {
        setVerifyResult({
          status: "error",
          message: res.message || "Error al validar la clave con Google Gemini API.",
        });
      }
    } catch (err: any) {
      setVerifyResult({
        status: "error",
        message: err?.message || "Error inesperado al conectar con el servidor.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = () => {
    const config: AiConfig = {
      apiKey: apiKey.trim(),
      model: selectedModel,
      useCustomKey: useCustomKey && Boolean(apiKey.trim()),
      isActive,
    };
    saveAiConfig(config);
    if (onSaved) onSaved();
    onClose();
  };

  const handleClearKey = () => {
    setApiKey("");
    setUseCustomKey(false);
    const config: AiConfig = {
      apiKey: "",
      model: selectedModel,
      useCustomKey: false,
      isActive,
    };
    saveAiConfig(config);
    setVerifyResult({
      status: "idle",
      message: "Clave eliminada. Se usará la clave del servidor o motor offline.",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#0a1020] border border-cyan-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0d162d] border-b border-cyan-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Configuración de IA para Desarrollo
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  Sin .env
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Usa tu propia API Key de Gemini para generación de código interactiva
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Status summary banner */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  apiKey.trim()
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    : hasServerEnvKey
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                    : "bg-slate-500"
                }`}
              />
              <div>
                <div className="font-semibold text-slate-200">
                  {apiKey.trim()
                    ? "API Key Personalizada de Usuario (Activa)"
                    : hasServerEnvKey
                    ? "Usando API Key del Servidor (.env)"
                    : "Modo Asistente Offline (Sin API Key)"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {apiKey.trim()
                    ? "Tus solicitudes se envían con tu propia clave sin alterar archivos del proyecto."
                    : "Puedes ingresar una clave propia para cuota ilimitada y modelos avanzados."}
                </div>
              </div>
            </div>
          </div>

          {/* API Key Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
              >
                <span>Obtener clave gratis en AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setUseCustomKey(true);
                }}
                placeholder="AIzaSy..."
                className="w-full pl-3 pr-20 py-2.5 bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 rounded-lg text-slate-100 font-mono text-xs placeholder:text-slate-600 outline-none transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                  title={showKey ? "Ocultar clave" : "Mostrar clave"}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                    title="Borrar clave"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              🔒 <strong>Privacidad:</strong> La clave se guarda únicamente en el almacenamiento local de tu navegador (<code className="text-cyan-300 font-mono">localStorage</code>). No se escribe en el archivo <code className="text-cyan-300 font-mono">.env</code> ni se comparte.
            </p>
          </div>

          {/* Model Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Modelo de Inteligencia Artificial</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_MODELS.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-2.5 text-left rounded-lg border transition-all ${
                      isSelected
                        ? "bg-cyan-950/50 border-cyan-500 text-slate-100 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs text-slate-200">{m.name}</span>
                      {isSelected && <Zap className="w-3 h-3 text-cyan-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {m.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Verification feedback */}
          {verifyResult.status !== "idle" && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs animate-in fade-in ${
                verifyResult.status === "success"
                  ? "bg-emerald-950/40 border-emerald-600/50 text-emerald-300"
                  : "bg-rose-950/40 border-rose-600/50 text-rose-300"
              }`}
            >
              {verifyResult.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 break-words">{verifyResult.message}</div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#0d162d] border-t border-cyan-900/40 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isVerifying}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isVerifying ? "animate-spin" : ""}`} />
            <span>{isVerifying ? "Verificando..." : "Probar Conexión"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-md shadow-cyan-950 transition-all text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
