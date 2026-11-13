import { useState, useEffect, useCallback, useRef } from "react";
import {
  webLlmService,
  WebGpuStatus,
  DEFAULT_LOCAL_MODEL,
} from "../services/webLlmService";
import { PrecodeIntentResponse } from "../engine/precodeEngine";

export type WebLlmStatus = "unsupported" | "idle" | "loading" | "ready" | "error";

export interface UseWebLlmOptions {
  autoInitBackground?: boolean;
  modelId?: string;
}

export interface UseWebLlmReturn {
  status: WebLlmStatus;
  isReady: boolean;
  isLoading: boolean;
  progress: number;
  progressText: string;
  error: string | null;
  gpuStatus: WebGpuStatus | null;
  modelId: string;
  initModel: (targetModelId?: string) => Promise<boolean>;
  unloadModel: () => Promise<void>;
  generatePrecode: (
    prompt: string,
    currentCode?: string
  ) => Promise<{
    explanation: string;
    divCode: string;
    modelUsed: string;
    blocksUsed: string[];
    intentData: PrecodeIntentResponse;
  }>;
}

/**
 * Hook 'useWebLLM' para WXDIV 3.0:
 * - Detecta automáticamente aceleración por hardware WebGPU
 * - Permite inicializar y descargar Qwen 1.5B en background con Cache API
 * - Expone estados reactivos 'cargando' y 'listo'
 * - Ejecuta inferencia local ultraligera acoplada al Motor de Precódigo
 */
export function useWebLLM(options: UseWebLlmOptions = {}): UseWebLlmReturn {
  const { autoInitBackground = false, modelId = DEFAULT_LOCAL_MODEL } = options;

  const [gpuStatus, setGpuStatus] = useState<WebGpuStatus | null>(null);
  const [status, setStatus] = useState<WebLlmStatus>(
    webLlmService.isReady() ? "ready" : "idle"
  );
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const activeModelRef = useRef<string>(modelId);

  // 1. Detectar compatibilidad de hardware WebGPU en el montaje
  useEffect(() => {
    let isMounted = true;

    webLlmService.checkWebGpu().then((gpu) => {
      if (!isMounted) return;
      setGpuStatus(gpu);

      if (!gpu.supported) {
        setStatus("unsupported");
        setError(gpu.reason || "WebGPU no está disponible en este navegador o dispositivo.");
        return;
      }

      if (webLlmService.isReady()) {
        setStatus("ready");
      } else if (autoInitBackground) {
        // Carga opcional en background
        initModel(modelId).catch(() => {
          // Fallback silencioso en background
        });
      }
    });

    // Suscripción a eventos de progreso del motor WebLLM
    const unsubscribe = webLlmService.onProgress((prog, txt) => {
      if (!isMounted) return;
      setProgress(prog);
      setProgressText(txt);

      if (prog >= 1) {
        setStatus("ready");
        setError(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [autoInitBackground, modelId]);

  // 2. Inicialización del modelo (con caché en Cache API)
  const initModel = useCallback(async (targetModelId?: string): Promise<boolean> => {
    const selectedModel = targetModelId || activeModelRef.current || DEFAULT_LOCAL_MODEL;
    activeModelRef.current = selectedModel;

    const gpu = await webLlmService.checkWebGpu();
    setGpuStatus(gpu);

    if (!gpu.supported) {
      setStatus("unsupported");
      setError(gpu.reason || "WebGPU no soportado.");
      return false;
    }

    setStatus("loading");
    setError(null);
    setProgress(0.02);
    setProgressText("Conectando con GPU y verificando caché local...");

    try {
      await webLlmService.initModel(selectedModel);
      setStatus("ready");
      setError(null);
      return true;
    } catch (err: any) {
      setStatus("error");
      const msg = err?.message || "Error al inicializar el modelo WebLLM.";
      setError(msg);
      throw err;
    }
  }, []);

  // 3. Liberar memoria GPU
  const unloadModel = useCallback(async () => {
    try {
      await webLlmService.unload();
      setStatus("idle");
      setProgress(0);
      setProgressText("");
      setError(null);
    } catch (err: any) {
      console.error("Error al descargar modelo:", err);
    }
  }, []);

  // 4. Inferencia con Motor de Precódigo
  const generatePrecode = useCallback(
    async (prompt: string, currentCode?: string) => {
      if (!webLlmService.isReady()) {
        // Si no está listo, intentar inicializar primero
        const success = await initModel(activeModelRef.current);
        if (!success) {
          throw new Error("No se pudo iniciar el motor WebLLM.");
        }
      }

      return await webLlmService.generatePrecodeSolution(prompt, currentCode);
    },
    [initModel]
  );

  return {
    status,
    isReady: status === "ready",
    isLoading: status === "loading",
    progress,
    progressText,
    error,
    gpuStatus,
    modelId: activeModelRef.current,
    initModel,
    unloadModel,
    generatePrecode,
  };
}
