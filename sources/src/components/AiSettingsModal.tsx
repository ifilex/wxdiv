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
  HardDrive,
  Download,
  ShieldCheck,
  Check,
  Flame,
  Layers,
  Laptop,
  AlertTriangle,
  Square,
  StopCircle,
} from "lucide-react";
import {
  getAiConfig,
  saveAiConfig,
  verifyAiApiKey,
  AVAILABLE_MODELS,
  AiConfig,
} from "../services/aiConfig";
import {
  webLlmService,
  AVAILABLE_WEBLLM_MODELS,
  WebLlmStatus,
  getGpuInfo,
} from "../engine/ai/webLlmService";

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
  const [engineMode, setEngineMode] = useState<"webllm" | "gemini" | "precode_neural">("webllm");
  const [selectedWebLlmModel, setSelectedWebLlmModel] = useState<string>(
    "Llama-3.2-1B-Instruct-q4f16_1-MLC"
  );
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedGeminiModel, setSelectedGeminiModel] = useState("gemini-3.8-flash");
  const [useCustomKey, setUseCustomKey] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Gemini verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    status: "idle" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });
  const [hasServerEnvKey, setHasServerEnvKey] = useState(false);

  // WebLLM hardware & loading state
  const [gpuInfo, setGpuInfo] = useState<{ hasWebGpu: boolean; adapterName?: string; error?: string }>({
    hasWebGpu: false,
  });
  const [webLlmStatus, setWebLlmStatus] = useState<WebLlmStatus>(webLlmService.getStatus());
  const [webLlmProgress, setWebLlmProgress] = useState(webLlmService.getProgress());
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadSuccess, setLoadSuccess] = useState<string | null>(null);

  // Subscribe to WebLLM progress and load initial state
  useEffect(() => {
    if (!isOpen) return;

    const cfg = getAiConfig();
    setApiKey(cfg.apiKey || "");
    setSelectedGeminiModel(cfg.model || "gemini-3.8-flash");
    setEngineMode(cfg.engineMode || "webllm");
    if (cfg.webLlmModel) {
      setSelectedWebLlmModel(cfg.webLlmModel);
    }
    setUseCustomKey(cfg.useCustomKey);
    setIsActive(cfg.isActive);
    setVerifyResult({ status: "idle", message: "" });

    // Check GPU hardware
    getGpuInfo().then((info) => {
      setGpuInfo(info);
    });

    // Check WebLLM current status
    setWebLlmStatus(webLlmService.getStatus());
    setWebLlmProgress(webLlmService.getProgress());

    const unsub = webLlmService.subscribe(() => {
      setWebLlmStatus(webLlmService.getStatus());
      setWebLlmProgress(webLlmService.getProgress());
    });

    // Check server Gemini API health
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        setHasServerEnvKey(Boolean(data.hasServerEnvKey));
      })
      .catch(() => {});

    return unsub;
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
      const res = await verifyAiApiKey(keyToTest, selectedGeminiModel);
      if (res.ok) {
        setVerifyResult({
          status: "success",
          message: `¡Conexión validada con éxito! Modelo: ${res.model || selectedGeminiModel}`,
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

  const handleLoadWebLlmModel = async (modelToLoad: string = selectedWebLlmModel) => {
    setIsLoadingModel(true);
    setLoadError(null);
    setLoadSuccess(null);
    try {
      const ok = await webLlmService.loadModel(modelToLoad);
      if (ok) {
        setEngineMode("webllm");
        setIsActive(true);
        setSelectedWebLlmModel(modelToLoad);
        setLoadSuccess(`¡Modelo ${modelToLoad.split("-")[0]} descargado y activado con éxito en GPU!`);
      } else {
        const errMsg = webLlmService.getLastErrorMessage() || "No se pudo inicializar WebGPU en este dispositivo.";
        setLoadError(errMsg);
      }
    } catch (err: any) {
      console.error("Error al cargar WebLLM:", err);
      setLoadError(err?.message || "Error al descargar e inicializar el modelo en GPU.");
    } finally {
      setIsLoadingModel(false);
    }
  };

  const handleActivateGeminiFallback = () => {
    webLlmService.activateCloudFallback();
    setEngineMode("gemini");
    setIsActive(true);
    setLoadSuccess("¡Motor Gemini Cloud activado! Respuestas inmediatas sin consumo de GPU ni descarga.");
    setLoadError(null);
  };

  const handleActivatePrecodeFallback = () => {
    webLlmService.activatePrecodeFallback();
    setEngineMode("precode_neural");
    setIsActive(true);
    setLoadSuccess("¡Red Neural Precódigo Offline activada! Latencia 0ms sin dependencias.");
    setLoadError(null);
  };

  const handleCancelWebLlmLoad = () => {
    webLlmService.abort(true);
    setIsLoadingModel(false);
  };

  const handleForceResetWebLlm = async () => {
    await webLlmService.forceReset();
    setIsLoadingModel(false);
  };

  const handleUnloadWebLlmModel = () => {
    webLlmService.unload();
  };

  const handleSave = () => {
    const config: AiConfig = {
      apiKey: apiKey.trim(),
      model: selectedGeminiModel,
      useCustomKey: useCustomKey && Boolean(apiKey.trim()),
      isActive,
      engineMode,
      webLlmModel: selectedWebLlmModel,
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
      model: selectedGeminiModel,
      useCustomKey: false,
      isActive,
      engineMode,
      webLlmModel: selectedWebLlmModel,
    };
    saveAiConfig(config);
    setVerifyResult({
      status: "idle",
      message: "Clave eliminada. Se usará la clave del servidor o motor WebLLM local.",
    });
  };

  const currentWebLlmLoaded = webLlmService.isModelLoaded(selectedWebLlmModel);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#0a1020] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0d162d] border-b border-cyan-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Ajustes de Inteligencia Artificial
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  WebLLM + Gemini + Precódigo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona tu motor preferido y modelos locales para mínima latencia en generación
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

        {/* Engine Mode Tabs */}
        <div className="px-5 pt-3.5 pb-2 bg-[#090e1c] border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setEngineMode("webllm")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              engineMode === "webllm"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>WebLLM Local (WebGPU)</span>
            <span className="px-1.5 py-0.2 text-[9px] rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
              Baja Latencia
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEngineMode("gemini")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              engineMode === "gemini"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Google Gemini (Nube)</span>
          </button>

          <button
            type="button"
            onClick={() => setEngineMode("precode_neural")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              engineMode === "precode_neural"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Red Neural Precódigo</span>
            <span className="px-1.5 py-0.2 text-[9px] rounded bg-amber-950 border border-amber-800 text-amber-300">
              Instantáneo
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* TAB 1: WEBLLM LOCAL */}
          {engineMode === "webllm" && (
            <div className="space-y-4 animate-in fade-in">
              {/* WebGPU Hardware Status Banner */}
              <div
                className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                  gpuInfo.hasWebGpu
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                    : "bg-amber-950/30 border-amber-500/40 text-amber-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Laptop className={`w-4 h-4 ${gpuInfo.hasWebGpu ? "text-emerald-400" : "text-amber-400"}`} />
                  <div>
                    <div className="font-semibold text-xs flex items-center gap-2">
                      <span>{gpuInfo.hasWebGpu ? "Aceleración WebGPU Detectada" : "WebGPU no disponible"}</span>
                      {gpuInfo.hasWebGpu && (
                        <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-900/60 text-emerald-300 font-mono">
                          Activo
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-80">
                      {gpuInfo.hasWebGpu
                        ? `Adaptador: ${gpuInfo.adapterName || "GPU Compatible"} • Los modelos correrán 100% en tu hardware sin costo.`
                        : "Tu navegador o entorno no tiene WebGPU activado. Puedes usar la Red Neural Precódigo o Gemini."}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentWebLlmLoaded ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-900/80 border border-emerald-500 text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      En Memoria VRAM
                    </span>
                  ) : webLlmStatus === "loading" ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-900/80 border border-cyan-500 text-cyan-300 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Cargando ({webLlmProgress.progress}%)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                      No cargado en VRAM
                    </span>
                  )}
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Modelos Locales de Generación (Familia Llama 3 & Coder)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Se almacena en caché local del navegador
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_WEBLLM_MODELS.map((m) => {
                    const isSelected = selectedWebLlmModel === m.id;
                    const isLoaded = webLlmService.isModelLoaded(m.id);
                    const isDownloaded = webLlmService.isModelDownloaded(m.id);

                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedWebLlmModel(m.id)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? "bg-cyan-950/50 border-cyan-500 text-slate-100 shadow-[0_0_15px_rgba(6,182,212,0.18)] ring-1 ring-cyan-500/50"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                              {m.name}
                              {m.recommended && (
                                <span className="px-1.5 py-0.2 text-[9px] bg-cyan-900 text-cyan-300 rounded font-normal">
                                  Top
                                </span>
                              )}
                            </span>
                            {isLoaded ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" title="Modelo Activo" />
                            ) : isDownloaded ? (
                              <span className="px-1.5 py-0.2 text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded">Descargado</span>
                            ) : isSelected ? (
                              <Check className="w-3.5 h-3.5 text-cyan-400" />
                            ) : null}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                            {m.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3 text-cyan-400" /> {m.size}
                          </span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <HardDrive className="w-3 h-3 text-purple-400" /> {m.vram}
                          </span>
                        </div>

                        {isSelected && !isLoaded ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadWebLlmModel(m.id);
                              }}
                              disabled={isLoadingModel}
                              className="w-full py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>{isLoadingModel ? "Descargando y Activando..." : "Descargar y Activar este Modelo"}</span>
                            </button>
                          </div>
                        ) : isLoaded ? (
                          <div className="pt-2">
                            <div className="w-full py-1 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-semibold text-[10px] flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Modelo Activo ({webLlmService.getEngineType() === "webgpu" ? "GPU VRAM" : "Local Universal"})</span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Success Banner */}
              {loadSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/60 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{loadSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLoadSuccess(null)}
                    className="text-emerald-400 hover:text-emerald-200 text-[10px] underline ml-2"
                  >
                    Cerrar
                  </button>
                </div>
              )}

              {/* Error & Immediate Fallback Action Banner */}
              {(loadError || webLlmStatus === "unsupported") && (
                <div className="p-3.5 rounded-lg bg-rose-950/70 border border-rose-500/60 space-y-2.5 text-xs text-rose-200 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-rose-300">
                        {loadError || "WebGPU no está disponible o está deshabilitado en este navegador."}
                      </div>
                      <div className="text-[11px] text-rose-200/80 mt-0.5">
                        No te preocupes: puedes activar la IA de forma inmediata usando <strong>Gemini Cloud</strong> (sin consumo de GPU ni descargas) o la <strong>Red Neural Precódigo Offline</strong> con un solo clic:
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 pl-6">
                    <button
                      type="button"
                      onClick={handleActivateGeminiFallback}
                      className="px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Activar Gemini Cloud (Inmediato)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleActivatePrecodeFallback}
                      className="px-3 py-1.5 rounded-md bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/50 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Activar Precódigo Offline (0ms)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Progress & Load Action */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <span>Carga y Precompilación de Shaders WebGPU</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Descarga los pesos una sola vez y compila en tu GPU para generación con latencia mínima.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentWebLlmLoaded && !isLoadingModel && webLlmStatus !== "loading" && (
                      <button
                        type="button"
                        onClick={handleUnloadWebLlmModel}
                        className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition-colors"
                      >
                        Liberar VRAM
                      </button>
                    )}

                    {(isLoadingModel || webLlmStatus === "loading") ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelWebLlmLoad}
                          className="px-3 py-1.5 rounded-md bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
                          title="Detener descarga o inicialización"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span>Parar Carga</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleForceResetWebLlm}
                          className="px-2.5 py-1.5 rounded-md bg-amber-900/80 hover:bg-amber-800 text-amber-200 border border-amber-600/60 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          title="Forzar Parada y Reinicio de WebGPU"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Forzar</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLoadWebLlmModel(selectedWebLlmModel)}
                        className={`px-3.5 py-1.5 rounded-md text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                          currentWebLlmLoaded
                            ? "bg-emerald-700 hover:bg-emerald-600 border border-emerald-500/60"
                            : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-950"
                        }`}
                      >
                        {currentWebLlmLoaded ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Modelo Activo ({webLlmService.getEngineType() === "webgpu" ? "GPU VRAM" : "Local Universal"})</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar y Activar Modelo</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Semáforo de Salud de WebLLM */}
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium text-[11px]">Semáforo WebLLM:</span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          webLlmStatus === "error" || webLlmStatus === "unsupported"
                            ? "bg-rose-500"
                            : "bg-rose-950/60 opacity-30"
                        }`}
                        title="Semáforo Rojo: Error o WebGPU no compatible"
                      />
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          webLlmStatus === "loading" || isLoadingModel
                            ? "bg-amber-400"
                            : "bg-amber-950/60 opacity-30"
                        }`}
                        title="Semáforo Ámbar: Descargando pesos o preparando WebGPU"
                      />
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          webLlmStatus === "ready"
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                            : "bg-emerald-950/60 opacity-30"
                        }`}
                        title="Semáforo Verde: Listo para generación con baja latencia"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 truncate max-w-[50%]">
                    {webLlmStatus === "error"
                      ? "🔴 Error en el motor"
                      : webLlmStatus === "unsupported"
                      ? "🔴 WebGPU no disponible"
                      : webLlmStatus === "loading" || isLoadingModel
                      ? "🟡 Ámbar: Descargando/Preparando..."
                      : webLlmStatus === "ready"
                      ? "🟢 Verde: Modelo compilado y listo"
                      : "⚪ En espera"}
                  </span>
                </div>

                {/* Progress bar */}
                {(isLoadingModel || webLlmStatus === "loading" || webLlmProgress.progress > 0) && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-cyan-300 font-mono truncate max-w-[80%]">
                        {webLlmProgress.text || "Preparando WebGPU..."}
                      </span>
                      <span className="text-slate-300 font-mono font-bold">
                        {webLlmProgress.progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${webLlmProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE GEMINI CLOUD */}
          {engineMode === "gemini" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Status banner */}
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

              {/* API Key Input */}
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
                  🔒 <strong>Privacidad:</strong> La clave se guarda únicamente en tu navegador (<code className="text-cyan-300 font-mono">localStorage</code>).
                </p>
              </div>

              {/* Gemini Model Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Modelo Gemini en la Nube</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_MODELS.map((m) => {
                    const isSelected = selectedGeminiModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedGeminiModel(m.id)}
                        className={`p-2.5 text-left rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-950/50 border-purple-500 text-slate-100 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs text-slate-200">{m.name}</span>
                          {isSelected && <Zap className="w-3 h-3 text-purple-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {m.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RED NEURAL DE PRECÓDIGO */}
          {engineMode === "precode_neural" && (
            <div className="space-y-3 p-4 rounded-lg bg-slate-900/60 border border-amber-500/30 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <Zap className="w-4 h-4" />
                <span>Generación Algorítmica con Red Neural de Precódigo DIV</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Este modo no realiza llamadas a APIs externas ni requiere descargar pesos grandes en tu GPU. Utiliza la arquitectura de precódigo modular DIV Games Studio con reglas heurísticas, sintetizando procesos de movimiento, colisiones, HUD, proyectiles e interfaces al instante con <strong>0ms de latencia</strong>.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-slate-400">
                <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>0 Tokens de costo</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sin conexión a internet</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sintaxis DIV exacta</span>
                </div>
              </div>
            </div>
          )}

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
          {engineMode === "gemini" ? (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isVerifying}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isVerifying ? "animate-spin" : ""}`} />
              <span>{isVerifying ? "Verificando..." : "Probar Conexión"}</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Configuración guardada en caché local</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 min-h-[42px] rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 min-h-[42px] rounded-xl bg-[#7C2D48] hover:bg-[#66233A] text-white font-medium transition-all text-xs flex items-center gap-1.5 cursor-pointer"
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
