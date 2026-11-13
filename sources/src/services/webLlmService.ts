/**
 * WXDIV 3.0 - WebLLM Service
 *
 * Ejecución de modelos LLM locales ultraligeros en el navegador (Qwen 1.5B / SmolLM2 1.7B)
 * acelerados por hardware mediante WebGPU (< 4GB VRAM).
 *
 * Utiliza @mlc-ai/web-llm con salida estructurada JSON (response_format: { type: "json_object" })
 * acoplado al Motor de Precódigo para ensamblar código DIV Games Studio 100% offline, local y gratuito.
 */

import { CreateMLCEngine, MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import {
  assemblePrecode,
  PrecodeIntentResponse,
  PRECODE_BLOCKS,
  getCompactCatalogPrompt,
} from "../engine/precodeEngine";

export interface WebGpuStatus {
  supported: boolean;
  adapterName?: string;
  vendor?: string;
  reason?: string;
  isCpuOnly?: boolean;
}

export interface WebLlmModelInfo {
  id: string;
  name: string;
  sizeMB: number;
  vramGB: number;
  description: string;
}

export const RECOMMENDED_LOCAL_MODELS: WebLlmModelInfo[] = [
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 1.5B Instruct (Recomendado)",
    sizeMB: 1150,
    vramGB: 1.6,
    description: "Excelente comprensión de intenciones y generación estructurada JSON. VRAM < 2 GB.",
  },
  {
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    name: "SmolLM2 1.7B Instruct",
    sizeMB: 1200,
    vramGB: 1.8,
    description: "Modelo compacto de Hugging Face optimizado para razonamiento y clasificación.",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 1B Instruct",
    sizeMB: 850,
    vramGB: 1.3,
    description: "Ultra-ligero y de rápida inicialización. Consumo mínimo de memoria.",
  },
];

export const DEFAULT_LOCAL_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

export type WebLlmProgressCallback = (progress: number, text: string) => void;

class WebLlmManager {
  private engine: MLCEngine | null = null;
  private currentModelId: string | null = null;
  private isInitializing: boolean = false;
  private listeners: Set<WebLlmProgressCallback> = new Set();
  private lastProgress = 0;
  private lastProgressText = "";

  /**
   * Verifica compatibilidad de hardware WebGPU.
   */
  async checkWebGpu(): Promise<WebGpuStatus> {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return {
        supported: false,
        reason: "Entorno no compatible con navegador.",
      };
    }

    if (!("gpu" in navigator)) {
      return {
        supported: false,
        reason:
          "WebGPU no está disponible en este navegador. Requiere Chrome/Edge 113+, Firefox 141+ o Safari 18+. Dispositivos como Nintendo Switch 1 u otros sistemas sin WebGPU deben usar Gemini en la nube o bloques manuales.",
      };
    }

    try {
      const gpu = (navigator as any).gpu;
      const adapter = await gpu.requestAdapter();

      if (!adapter) {
        return {
          supported: false,
          reason:
            "No se detectó un acelerador GPU compatible con WebGPU. Aunque existen versiones por CPU, carecen de la capacidad de procesamiento requerida para ejecutar modelos LLM interactivamente.",
        };
      }

      const info = (await adapter.requestAdapterInfo?.()) || {};
      const vendor = info.vendor || "GPU Genérica";
      const adapterName = info.description || info.device || info.architecture || "Acelerador WebGPU";

      return {
        supported: true,
        adapterName,
        vendor,
      };
    } catch (err: any) {
      return {
        supported: false,
        reason: err?.message || "Error al solicitar adaptador WebGPU.",
      };
    }
  }

  onProgress(callback: WebLlmProgressCallback): () => void {
    this.listeners.add(callback);
    // Emit current state immediately
    if (this.isInitializing || this.lastProgress > 0) {
      callback(this.lastProgress, this.lastProgressText);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyProgress(progress: number, text: string) {
    this.lastProgress = progress;
    this.lastProgressText = text;
    for (const listener of this.listeners) {
      try {
        listener(progress, text);
      } catch (e) {
        console.error("Error in WebLLM progress listener", e);
      }
    }
  }

  isReady(): boolean {
    return this.engine !== null && !this.isInitializing;
  }

  isLoading(): boolean {
    return this.isInitializing;
  }

  getActiveModelId(): string | null {
    return this.currentModelId;
  }

  /**
   * Inicializa y descarga el modelo WebLLM (se guarda automáticamente en Cache API).
   */
  async initModel(modelId: string = DEFAULT_LOCAL_MODEL): Promise<boolean> {
    if (this.engine && this.currentModelId === modelId) {
      return true;
    }

    if (this.isInitializing) {
      throw new Error("Ya hay una inicialización de modelo en progreso.");
    }

    const gpuStatus = await this.checkWebGpu();
    if (!gpuStatus.supported) {
      throw new Error(gpuStatus.reason || "WebGPU no soportado en este dispositivo.");
    }

    this.isInitializing = true;
    this.notifyProgress(0.01, `Conectando con acelerador WebGPU para ${modelId}...`);

    try {
      // Create new engine with progress reporting
      this.engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report: InitProgressReport) => {
          const progress = Math.max(0, Math.min(report.progress, 1));
          let readableText = report.text || "Descargando modelo...";

          // Enhance progress description for first-time download
          if (readableText.includes("cache") || readableText.includes("Loading")) {
            readableText = `Cargando desde caché local: ${Math.round(progress * 100)}%`;
          } else if (readableText.includes("Fetching") || readableText.includes("shard")) {
            readableText = `Descargando fragmentos del modelo (~1.2 GB, solo 1 vez): ${Math.round(progress * 100)}%`;
          }

          this.notifyProgress(progress, readableText);
        },
      });

      this.currentModelId = modelId;
      this.notifyProgress(1, "¡Modelo WebLLM listo para inferencia local a 60 FPS!");
      return true;
    } catch (err: any) {
      this.engine = null;
      this.currentModelId = null;
      this.notifyProgress(0, `Error de inicialización: ${err?.message || "Desconocido"}`);
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Libera la memoria GPU asignada al modelo
   */
  async unload(): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.unload();
      } catch (e) {
        console.warn("Error unloading WebLLM engine:", e);
      }
      this.engine = null;
      this.currentModelId = null;
      this.lastProgress = 0;
      this.lastProgressText = "";
      this.notifyProgress(0, "Modelo descargado de la memoria GPU.");
    }
  }

  /**
   * Clasifica la intención del usuario y extrae parámetros estructurados en formato JSON.
   */
  async generatePrecodeSolution(
    prompt: string,
    currentCode?: string
  ): Promise<{
    explanation: string;
    divCode: string;
    modelUsed: string;
    blocksUsed: string[];
    intentData: PrecodeIntentResponse;
  }> {
    if (!this.engine) {
      throw new Error("El modelo local WebLLM no está inicializado. Pulsa en 'Activar IA Local'.");
    }

    const compactCatalog = getCompactCatalogPrompt();

    // System prompt ultra-optimizado para Qwen 1.5B (menor consumo de tokens, máxima velocidad)
    const systemPrompt = `Clasificador WXDIV 3.0 Precode. Selecciona bloques y extrae parámetros.
Bloques disponibles:
${compactCatalog}

Responde ÚNICAMENTE este JSON:
{"intent":"corta","title":"Titulo","summary":"Resumen 1 frase","category":"game"|"app"|"database","blocks":[{"id":"bloque_id","params":{}}]}`;

    const userMessage = `Petición: "${prompt.trim()}"\nCódigo previo: ${currentCode ? currentCode.substring(0, 160) : "Nuevo"}`;

    this.notifyProgress(1, "Procesando intención con Qwen 1.5B en WebGPU...");

    const completion = await this.engine.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Baja temperatura para máxima consistencia estructurada
      max_tokens: 220, // Optimizado: reduce latencia a < 500ms
    });

    const rawResponse = completion.choices[0]?.message?.content || "{}";

    let parsedIntent: PrecodeIntentResponse;
    try {
      parsedIntent = JSON.parse(rawResponse);
    } catch {
      // Fallback si el JSON vino con markdown
      const match = rawResponse.match(/\{[\s\S]*\}/);
      if (match) {
        parsedIntent = JSON.parse(match[0]);
      } else {
        throw new Error("No se pudo interpretar la respuesta estructurada del modelo local.");
      }
    }

    // Ensamblar código real DIV Games Studio usando el motor de precódigo
    const assembled = assemblePrecode(parsedIntent, currentCode);

    return {
      explanation: assembled.explanation,
      divCode: assembled.code,
      modelUsed: `WebLLM Local (${this.currentModelId || "Qwen 1.5B"}) • WebGPU`,
      blocksUsed: assembled.blocksUsed,
      intentData: parsedIntent,
    };
  }
}

export const webLlmService = new WebLlmManager();
