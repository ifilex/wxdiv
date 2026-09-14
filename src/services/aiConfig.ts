/**
 * WXDIV 3.0 - AI Engine Configuration Service
 * Allows users to configure, store locally, and test custom AI API Keys
 * (e.g. Gemini API Key) without having to modify the .env file.
 */

export interface AiConfig {
  apiKey: string;
  model: string;
  isActive: boolean;
  useCustomKey: boolean;
  customEndpoint?: string;
}

const STORAGE_KEY = "wxdiv_ai_config_v1";

export const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: "",
  model: "gemini-3.8-flash",
  isActive: true,
  useCustomKey: false,
};

export const AVAILABLE_MODELS = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", desc: "Recomendado: ultra-rápido y especializado en código DIV" },
  { id: "gemini-flash-latest", name: "Gemini Flash (Latest)", desc: "Óptimo para balance general de generación y lógica" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", desc: "Baja latencia y respuestas ligeras" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", desc: "Razonamiento profundo para arquitecturas de juegos complejas" },
];

export function getAiConfig(): AiConfig {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_AI_CONFIG };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "",
      model: typeof parsed.model === "string" ? parsed.model : DEFAULT_AI_CONFIG.model,
      isActive: typeof parsed.isActive === "boolean" ? parsed.isActive : true,
      useCustomKey: typeof parsed.useCustomKey === "boolean" ? parsed.useCustomKey : Boolean(parsed.apiKey),
      customEndpoint: parsed.customEndpoint,
    };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config: AiConfig): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("wxdiv_aiconfig_changed", { detail: config }));
  } catch (err) {
    console.error("Error saving AI config to localStorage:", err);
  }
}

export function getEffectiveApiKey(): string {
  const cfg = getAiConfig();
  if (cfg.isActive && cfg.useCustomKey && cfg.apiKey) {
    return cfg.apiKey;
  }
  return "";
}

export function getAiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = getEffectiveApiKey();
  if (key) {
    headers["x-api-key"] = key;
  }
  return headers;
}

export async function verifyAiApiKey(
  apiKey: string,
  model = "gemini-3.8-flash"
): Promise<{ ok: boolean; message: string; model?: string }> {
  try {
    const res = await fetch("/api/gemini/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKey.trim(), model }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        message: data.error || data.message || `Error del servidor (${res.status})`,
      };
    }

    return {
      ok: Boolean(data.success),
      message: data.message || (data.success ? "Conexión exitosa" : "No se pudo verificar la clave"),
      model: data.modelUsed || model,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || "No se pudo conectar con el endpoint de verificación.",
    };
  }
}
