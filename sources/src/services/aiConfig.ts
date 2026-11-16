/**
 * WXDIV 3.0 - Configuración de Motor de IA Local
 * Funciona 100% en tu dispositivo (CPU Instantáneo o WebLLM GPU), sin claves ni nube.
 */

export type LocalAiEngineMode = "precode_neural" | "webllm";

export interface AiConfig {
  apiKey: string;
  model: string;
  isActive: boolean;
  useCustomKey: boolean;
  customEndpoint?: string;
  engineMode?: LocalAiEngineMode;
  webLlmModel?: string;
}

const STORAGE_KEY = "wxdiv_ai_config_v1";

export const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: "",
  model: "precode-local-v3",
  isActive: true,
  useCustomKey: false,
  engineMode: "precode_neural",
  webLlmModel: "SmolLM2-360M-Instruct-q4f16_1-MLC",
};

function sanitizeEngineMode(mode: unknown): LocalAiEngineMode {
  return mode === "webllm" ? "webllm" : "precode_neural";
}

export function getAiConfig(): AiConfig {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_AI_CONFIG };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      apiKey: "",
      model: DEFAULT_AI_CONFIG.model,
      isActive: typeof parsed.isActive === "boolean" ? parsed.isActive : true,
      useCustomKey: false,
      customEndpoint: undefined,
      engineMode: sanitizeEngineMode(parsed.engineMode),
      webLlmModel: parsed.webLlmModel || DEFAULT_AI_CONFIG.webLlmModel,
    };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config: AiConfig): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const safeConfig: AiConfig = {
      ...config,
      apiKey: "",
      useCustomKey: false,
      engineMode: sanitizeEngineMode(config.engineMode),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig));
    window.dispatchEvent(new CustomEvent("wxdiv_aiconfig_changed", { detail: safeConfig }));
  } catch (err) {
    console.error("Error saving AI config to localStorage:", err);
  }
}

export function getEffectiveApiKey(): string {
  return "";
}

export function getAiHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
  };
}
