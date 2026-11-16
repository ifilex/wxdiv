import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Zap,
  Download,
  Check,
  Laptop,
  StopCircle,
} from "lucide-react";
import {
  getAiConfig,
  saveAiConfig,
  AiConfig,
  LocalAiEngineMode,
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
  const [engineMode, setEngineMode] = useState<LocalAiEngineMode>("precode_neural");
  const [selectedWebLlmModel, setSelectedWebLlmModel] = useState<string>(
    "SmolLM2-360M-Instruct-q4f16_1-MLC"
  );
  const [isActive, setIsActive] = useState(true);

  const [gpuInfo, setGpuInfo] = useState<{ hasWebGpu: boolean; adapterName?: string }>({
    hasWebGpu: false,
  });
  const [webLlmStatus, setWebLlmStatus] = useState<WebLlmStatus>(webLlmService.getStatus());
  const [webLlmProgress, setWebLlmProgress] = useState(webLlmService.getProgress());
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadSuccess, setLoadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const cfg = getAiConfig();
    setEngineMode(cfg.engineMode === "webllm" ? "webllm" : "precode_neural");
    if (cfg.webLlmModel) {
      setSelectedWebLlmModel(cfg.webLlmModel);
    }
    setIsActive(cfg.isActive);
    setLoadError(null);
    setLoadSuccess(null);

    getGpuInfo().then((info) => {
      setGpuInfo(info);
    });

    setWebLlmStatus(webLlmService.getStatus());
    setWebLlmProgress(webLlmService.getProgress());

    const unsub = webLlmService.subscribe(() => {
      setWebLlmStatus(webLlmService.getStatus());
      setWebLlmProgress(webLlmService.getProgress());
    });

    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

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
        setLoadSuccess(`Modelo ${modelToLoad.split("-")[0]} activado en tu navegador.`);
      } else {
        setLoadError(
          webLlmService.getLastErrorMessage() || "No se pudo inicializar WebLLM en este dispositivo."
        );
      }
    } catch (err: any) {
      setLoadError(err?.message || "Error al activar el modelo local.");
    } finally {
      setIsLoadingModel(false);
    }
  };

  const handleCancelWebLlmLoad = () => {
    webLlmService.abort(true);
    setIsLoadingModel(false);
  };

  const handleSave = () => {
    const config: AiConfig = {
      apiKey: "",
      model: "precode-local-v3",
      useCustomKey: false,
      isActive,
      engineMode,
      webLlmModel: selectedWebLlmModel,
    };
    saveAiConfig(config);
    onSaved?.();
    onClose();
  };

  const currentWebLlmLoaded = webLlmService.isModelLoaded(selectedWebLlmModel);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-xl bg-white border border-[#E2E8F0] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] text-[#111827]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-white">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-white border-b border-[#E2E8F0] flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FDF2F5] text-[#7C2D48] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#111827] truncate">
                IA Local del Dispositivo
              </h2>
              <p className="text-xs text-[#6B7280] truncate">
                Privada, sin conexión a la nube y sin claves externas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-xl text-[#4B5563] hover:text-[#111827] hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            aria-label="Cerrar ajustes de IA"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Modo Local (2 opciones claras) */}
        <div className="px-4 sm:px-5 pt-4 pb-2 bg-[#F7F8FA] border-b border-[#E2E8F0] grid grid-cols-2 gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setEngineMode("precode_neural");
              setLoadError(null);
            }}
            className={`min-h-[56px] p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
              engineMode === "precode_neural"
                ? "bg-white border-[#2F6F4E] text-[#111827] shadow-xs"
                : "bg-[#F1F5F9] border-[#E2E8F0] text-[#4B5563] hover:bg-white"
            }`}
          >
            <Zap
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                engineMode === "precode_neural" ? "text-[#2F6F4E]" : "text-[#6B7280]"
              }`}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold">CPU Instantáneo</div>
              <div className="text-[11px] text-[#6B7280] truncate">0 MB · ideal celular</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setEngineMode("webllm");
              setLoadError(null);
            }}
            className={`min-h-[56px] p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
              engineMode === "webllm"
                ? "bg-white border-[#7C2D48] text-[#111827] shadow-xs"
                : "bg-[#F1F5F9] border-[#E2E8F0] text-[#4B5563] hover:bg-white"
            }`}
          >
            <Cpu
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                engineMode === "webllm" ? "text-[#7C2D48]" : "text-[#6B7280]"
              }`}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold">WebLLM Local</div>
              <div className="text-[11px] text-[#6B7280] truncate">Modelo en navegador</div>
            </div>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-white">
          {engineMode === "precode_neural" ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#EEF6F1] border border-[#CFE4D7] space-y-1.5">
                <div className="text-xs font-bold text-[#2F6F4E] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Red Neural Precódigo Activa (0ms offline)</span>
                </div>
                <p className="text-xs text-[#374151] leading-relaxed">
                  Funciona al instante en cualquier celular o computadora sin descargar archivos pesados. Crea juegos 2D, apps, páginas web y modifica mapas 3D usando bloques de trabajo claros.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] flex items-center gap-3">
                <Laptop className="w-5 h-5 text-[#7C2D48] flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#111827]">
                    {gpuInfo.hasWebGpu
                      ? `Aceleración WebGPU detectada${gpuInfo.adapterName ? ` (${gpuInfo.adapterName})` : ""}`
                      : "WebGPU no disponible · Usará Motor Universal CPU en local"}
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    Los modelos se guardan en el almacenamiento local de tu navegador.
                  </div>
                </div>
              </div>

              {(isLoadingModel || webLlmStatus === "loading") && (
                <div className="p-3.5 rounded-xl bg-[#FDF2F5] border border-[#F3D0DC] space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#7C2D48]">
                    <span>Preparando modelo local...</span>
                    <span className="font-mono tabular-nums">{webLlmProgress.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white overflow-hidden border border-[#F3D0DC]">
                    <div
                      className="h-full bg-[#7C2D48] transition-all"
                      style={{ width: `${webLlmProgress.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#4B5563] truncate">{webLlmProgress.text}</span>
                    <button
                      type="button"
                      onClick={handleCancelWebLlmLoad}
                      className="min-h-[36px] px-3 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#7C2D48] flex items-center gap-1 cursor-pointer flex-shrink-0"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Detener</span>
                    </button>
                  </div>
                </div>
              )}

              {loadSuccess && (
                <div className="p-3 rounded-xl bg-[#EEF6F1] border border-[#CFE4D7] text-xs text-[#2F6F4E] flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{loadSuccess}</span>
                </div>
              )}

              {loadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{loadError}</span>
                </div>
              )}

              <div className="space-y-2">
                {AVAILABLE_WEBLLM_MODELS.map((m) => {
                  const isSelected = selectedWebLlmModel === m.id;
                  const isLoaded = webLlmService.isModelLoaded(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedWebLlmModel(m.id)}
                      className={`p-3 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-[#FDF2F5]/60 border-[#7C2D48]"
                          : "bg-[#F7F8FA] border-[#E2E8F0] hover:bg-white"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#111827] flex items-center gap-2">
                          <span className="truncate">{m.name}</span>
                          {m.recommended && (
                            <span className="text-[11px] text-[#2F6F4E] font-semibold">· Recomendado</span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{m.description}</p>
                        <div className="text-[11px] text-[#6B7280] font-mono tabular-nums mt-1">
                          Tamaño: {m.size} · Memoria: {m.vram}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWebLlmModel(m.id);
                          if (!isLoaded) handleLoadWebLlmModel(m.id);
                        }}
                        disabled={isLoadingModel}
                        className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                          isLoaded
                            ? "bg-[#2F6F4E] text-white"
                            : "bg-[#7C2D48] hover:bg-[#642239] text-white disabled:opacity-50"
                        }`}
                      >
                        {isLoaded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Listo</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Activar</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#F7F8FA] border-t border-[#E2E8F0] flex items-center justify-end gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl bg-white hover:bg-slate-100 border border-[#CBD5E1] text-[#374151] text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] px-5 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {engineMode === "precode_neural"
                ? "Usar CPU Instantáneo"
                : currentWebLlmLoaded
                ? "Guardar WebLLM"
                : "Guardar Preferencia"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
