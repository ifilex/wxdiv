import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Square,
  Cpu,
  Zap,
  Globe,
  Settings,
  Code2,
  Copy,
  Check,
  ArrowDownToLine,
  Flame,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
  X,
  Layers,
  Shield,
  HelpCircle,
  Activity,
  Radio,
  RefreshCw,
  StopCircle,
  Download,
} from "lucide-react";
import {
  PRECODE_LIBRARY,
  PrecodeBlock,
  generatePrecodeNeuralCode,
  buildPrecodeOptimizedPrompt,
  mergeDivSnippetIntoProgram,
} from "../engine/ai/precodeEngine";
import {
  webLlmService,
  AVAILABLE_WEBLLM_MODELS,
  WebLlmStatus,
  SemaphoreHealth,
} from "../engine/ai/webLlmService";
import { getAiConfig, getAiHeaders } from "../services/aiConfig";

export type AiEngineMode = "webllm" | "gemini" | "precode_neural";

interface AndroidStudioAiPanelProps {
  currentCode: string;
  onInsertCode: (snippet: string) => void;
  onApplyFullCode: (code: string) => void;
  onRunGame?: () => void;
  onSwitchToEditor?: () => void;
  onClose?: () => void;
  onOpenSettings?: () => void;
  isFloating?: boolean;
  initialPrompt?: string;
  onConsumeInitialPrompt?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  codeSnippet?: string;
  tokenSavings?: number;
  engineUsed?: string;
  timestamp: string;
}

export const AndroidStudioAiPanel: React.FC<AndroidStudioAiPanelProps> = ({
  currentCode,
  onInsertCode,
  onApplyFullCode,
  onRunGame,
  onSwitchToEditor,
  onClose,
  onOpenSettings,
  isFloating = false,
  initialPrompt,
  onConsumeInitialPrompt,
}) => {
  const [engineMode, setEngineMode] = useState<AiEngineMode>("webllm");
  const [selectedWebLlmModel, setSelectedWebLlmModel] = useState<string>(
    "Llama-3.2-1B-Instruct-q4f16_1-MLC"
  );
  const [webLlmStatus, setWebLlmStatus] = useState<WebLlmStatus>(webLlmService.getStatus());
  const [webLlmProgress, setWebLlmProgress] = useState(webLlmService.getProgress());
  const [isDownloadingModel, setIsDownloadingModel] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [autoApplyToEditor, setAutoApplyToEditor] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<PrecodeBlock["category"] | "all">("all");
  const [selectedPrecodeBlocks, setSelectedPrecodeBlocks] = useState<PrecodeBlock[]>([]);
  const [showPrecodeDrawer, setShowPrecodeDrawer] = useState(true);

  // Semáforo & Watchdog State
  const [semaphoreStatus, setSemaphoreStatus] = useState<SemaphoreHealth>("green");
  const [semaphoreMessage, setSemaphoreMessage] = useState<string>("Motor listo para consultas");
  const [generationSeconds, setGenerationSeconds] = useState<number>(0);
  const [stallSeconds, setStallSeconds] = useState<number>(0);
  const [isStalled, setIsStalled] = useState<boolean>(false);
  const [tokenSpeed, setTokenSpeed] = useState<number>(0);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());
  const generationStartTimeRef = useRef<number>(0);
  const tokenCountRef = useRef<number>(0);

  // Sync with AI Config on mount and changes
  useEffect(() => {
    const applyConfig = () => {
      const cfg = getAiConfig();
      if (cfg.engineMode) {
        setEngineMode(cfg.engineMode as AiEngineMode);
      }
      if (cfg.webLlmModel) {
        setSelectedWebLlmModel(cfg.webLlmModel);
      }
    };
    applyConfig();

    const handleConfigChange = (e: any) => {
      if (e.detail?.engineMode) setEngineMode(e.detail.engineMode);
      if (e.detail?.webLlmModel) setSelectedWebLlmModel(e.detail.webLlmModel);
    };
    window.addEventListener("wxdiv_aiconfig_changed", handleConfigChange);
    return () => window.removeEventListener("wxdiv_aiconfig_changed", handleConfigChange);
  }, []);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInputPrompt(initialPrompt);
      onConsumeInitialPrompt?.();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
    }
  }, [initialPrompt, onConsumeInitialPrompt]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 **Asistente de Código IA - Estilo Android Studio**\n\n¿Qué funcionalidad deseas implementar en tu juego o aplicación DIV? Puedes usar **WebLLM Local** (WebGPU 100% privado en tu navegador), **Gemini 3.8 Flash** en la nube, o la **Red Neural de Precódigo** instantánea.\n\n🚦 *Semáforo Activo: Supervisión de fallas y botón de parada de emergencia siempre disponibles.*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Subscribe to WebLLM service changes
  useEffect(() => {
    const unsub = webLlmService.subscribe(() => {
      setWebLlmStatus(webLlmService.getStatus());
      setWebLlmProgress(webLlmService.getProgress());
      lastActivityTimeRef.current = Date.now();
    });
    return unsub;
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // WATCHDOG & SEMÁFORO MONITOR
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if (isGenerating) {
        const genElapsedSec = Math.floor((now - generationStartTimeRef.current) / 1000);
        const stallElapsedSec = Math.floor((now - lastActivityTimeRef.current) / 1000);

        setGenerationSeconds(genElapsedSec);
        setStallSeconds(stallElapsedSec);

        // Calculate token speed
        const speed = genElapsedSec > 0 ? Math.round((tokenCountRef.current / genElapsedSec) * 2) : 0;
        setTokenSpeed(speed);

        // SEMÁFORO LOGIC WHILE GENERATING:
        // Verde: Actividad reciente (< 4s sin datos)
        // Ámbar: Esperando respuesta (4s a 9s sin datos)
        // Rojo: ¡Atasco o Traba detectada! (>= 10s sin datos)
        if (stallElapsedSec >= 10) {
          setSemaphoreStatus("red");
          setIsStalled(true);
          setSemaphoreMessage(`⚠️ Posible traba detectada: Sin respuesta durante ${stallElapsedSec}s. Pulsa 'Forzar Parada'.`);
        } else if (stallElapsedSec >= 4) {
          setSemaphoreStatus("yellow");
          setIsStalled(false);
          setSemaphoreMessage(`Esperando respuesta del motor (${stallElapsedSec}s sin datos)...`);
        } else {
          setSemaphoreStatus("green");
          setIsStalled(false);
          setSemaphoreMessage(tokenCountRef.current > 0 ? `Generando activamente (~${speed} tok/s)` : "Procesando solicitud...");
        }
      } else {
        setGenerationSeconds(0);
        setStallSeconds(0);
        setIsStalled(false);

        // IDLE SEMÁFORO LOGIC:
        if (engineMode === "webllm") {
          const diag = webLlmService.getDiagnostics();
          setSemaphoreStatus(diag.semaphoreHealth);
          setSemaphoreMessage(diag.semaphoreMessage);
        } else if (engineMode === "precode_neural") {
          setSemaphoreStatus("green");
          setSemaphoreMessage("Red Neural Precódigo en línea (Latencia 0ms)");
        } else {
          setSemaphoreStatus("green");
          setSemaphoreMessage("Gemini Cloud en línea (Listo para consultas)");
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating, engineMode]);

  // Filtered precode blocks
  const filteredBlocks = activeCategory === "all"
    ? PRECODE_LIBRARY
    : PRECODE_LIBRARY.filter((b) => b.category === activeCategory);

  const handleTogglePrecodeBlock = (block: PrecodeBlock) => {
    setSelectedPrecodeBlocks((prev) => {
      const exists = prev.some((b) => b.id === block.id);
      if (exists) {
        return prev.filter((b) => b.id !== block.id);
      } else {
        return [...prev, block];
      }
    });
  };

  const handleQuickInsertPrecode = (block: PrecodeBlock) => {
    if (currentCode && currentCode.trim().length > 0) {
      const merged = mergeDivSnippetIntoProgram(currentCode, block.snippet);
      onApplyFullCode(merged);
    } else {
      onInsertCode("\n" + block.snippet + "\n");
    }
    setMessages((prev) => [
      ...prev,
      {
        id: `insert_${Date.now()}`,
        role: "system",
        content: `⚡ Bloque **${block.name}** insertado limpiamente en tu código DIV. (Ahorro: ${block.tokenSavings})`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleSmartInsertMessageCode = (snippet: string, msgId: string) => {
    if (!snippet) return;
    if (currentCode && currentCode.trim().length > 0 && !/\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(snippet)) {
      const merged = mergeDivSnippetIntoProgram(currentCode, snippet);
      onApplyFullCode(merged);
    } else if (currentCode && currentCode.trim().length > 0 && /\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(snippet)) {
      // Extract only new PROCESS blocks if user asked to insert into existing program, or apply merged
      const procBlocksMatch = snippet.match(/\bPROCESS\s+[\s\S]*/i);
      if (procBlocksMatch && procBlocksMatch[0] && currentCode.trim().length > 40) {
        const merged = mergeDivSnippetIntoProgram(currentCode, procBlocksMatch[0]);
        onApplyFullCode(merged);
      } else {
        onApplyFullCode(ensureRunnableDivProgram(snippet));
      }
    } else {
      onInsertCode("\n" + snippet + "\n");
    }
    setAppliedId(msgId);
    setTimeout(() => setAppliedId(null), 1800);
  };

  // Helper to ensure bare processes or code fragments are wrapped into a complete executable PROGRAM
  const ensureRunnableDivProgram = (codeSnippet: string): string => {
    const trimmed = codeSnippet.trim();
    if (!trimmed) return trimmed;

    // If it already has a PROGRAM declaration, return as-is
    if (/\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(trimmed)) {
      return trimmed;
    }

    // Bare web_* HTML5 snippets -> wrap as HTML5 Web program
    if (/\b(web_page|web_navbar|web_hero|web_stat|web_feature|web_pricing|web_testimonial|web_faq|web_contact_form|web_cta_banner|web_footer|draw_landing_page|set_html5_mode)\b/i.test(trimmed)) {
      const indented = trimmed
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n");
      return `PROGRAM web_ia;

BEGIN
  set_mode(m800x600);
  set_fps(60);
  set_html5_mode(1);
${indented}
  LOOP
    FRAME;
  END
END`;
    }

    // Bare PROCESS or BEGIN block
    const procMatch = trimmed.match(/\bPROCESS\s+([a-zA-Z0-9_]+)/i);
    const procName = procMatch ? procMatch[1] : "proceso_ia";

    return `PROGRAM juego_ia;

GLOBAL
  score = 0;
  vidas = 3;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(10, 16, 28));

  // Iniciar proceso generado por IA
  ${procName}(320, 240);

  LOOP
    FRAME;
  END
END

${trimmed}`;
  };

  // Robustly extract DIV code snippet from LLM output (supports all backtick fences, unclosed fences, and raw DIV syntax)
  const extractCode = (text: string): string | undefined => {
    if (!text) return undefined;

    // 1. Match code blocks with markdown fences (any language tag or no tag)
    const matches = Array.from(text.matchAll(/```[a-zA-Z0-9_\-\s]*?\n([\s\S]*?)```/gi));
    if (matches.length > 0) {
      // Prioritize blocks containing DIV syntax
      const divMatch = matches.find((m) => /\b(PROGRAM|PROCESS|BEGIN|GLOBAL|LOCAL|FRAME)\b/i.test(m[1]));
      if (divMatch && divMatch[1]) {
        return divMatch[1].trim();
      }
      return matches[0][1].trim();
    }

    // 2. Unclosed code block (e.g. streaming or incomplete response)
    const unclosedMatch = text.match(/```[a-zA-Z0-9_\-\s]*?\n([\s\S]+)$/i);
    if (unclosedMatch && unclosedMatch[1] && /\b(PROGRAM|PROCESS|BEGIN|LOOP|FRAME)\b/i.test(unclosedMatch[1])) {
      return unclosedMatch[1].trim();
    }

    // 3. If no fences, detect standard DIV PROGRAM ... END structure
    const programIndex = text.search(/\bPROGRAM\s+[a-zA-Z0-9_]+/i);
    if (programIndex !== -1) {
      const remaining = text.substring(programIndex);
      const lastEnd = remaining.lastIndexOf("END");
      if (lastEnd !== -1) {
        return remaining.substring(0, lastEnd + 3).trim();
      }
      return remaining.trim();
    }

    // 4. Detect PROCESS ... END structure
    const processIndex = text.search(/\bPROCESS\s+[a-zA-Z0-9_]+/i);
    if (processIndex !== -1) {
      const remaining = text.substring(processIndex);
      const lastEnd = remaining.lastIndexOf("END");
      if (lastEnd !== -1) {
        return remaining.substring(0, lastEnd + 3).trim();
      }
      return remaining.trim();
    }

    // 5. Detect BEGIN ... END block
    const beginIndex = text.search(/\bBEGIN\b/i);
    if (beginIndex !== -1) {
      const remaining = text.substring(beginIndex);
      const lastEnd = remaining.lastIndexOf("END");
      if (lastEnd !== -1) {
        return remaining.substring(0, lastEnd + 3).trim();
      }
      return remaining.trim();
    }

    return undefined;
  };

  // Automatically transfers generated code into the Code Editor so the user can test immediately
  const applyGeneratedCodeToEditor = (codeToApply: string | undefined, isInsertion?: boolean) => {
    if (!codeToApply || codeToApply.trim().length === 0) return;
    const trimmed = codeToApply.trim();
    const hasExisting = /\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(currentCode || "");
    const incomingHasProgram = /\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(trimmed);

    const finalCode =
      hasExisting && (isInsertion || !incomingHasProgram)
        ? mergeDivSnippetIntoProgram(currentCode, trimmed)
        : ensureRunnableDivProgram(trimmed);

    if (autoApplyToEditor) {
      onApplyFullCode(finalCode);
    }
  };

  const handleDownloadAndActivate = async (modelIdToLoad: string = selectedWebLlmModel) => {
    setIsDownloadingModel(true);
    try {
      const ok = await webLlmService.loadModel(modelIdToLoad);
      if (ok) {
        setEngineMode("webllm");
        setSelectedWebLlmModel(modelIdToLoad);
        setWebLlmStatus(webLlmService.getStatus());
        setWebLlmProgress(webLlmService.getProgress());
      }
    } catch (err) {
      console.warn("Error descargando modelo:", err);
    } finally {
      setIsDownloadingModel(false);
    }
  };

  /**
   * Detención normal o parada forzada del proceso de IA
   * Garantiza la liberación inmediata de la interfaz y recursos
   */
  const handleStop = (force: boolean = false) => {
    // 1. Abort local controller
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }

    // 2. Abort engine service
    if (force) {
      webLlmService.forceReset();
    } else {
      webLlmService.abort(false);
    }

    // 3. Immediately release UI state
    setIsGenerating(false);

    // 4. Save any partial streaming output so user work is preserved
    const currentStream = streamingContent.trim();
    if (currentStream) {
      const extracted = extractCode(currentStream);
      if (extracted) {
        applyGeneratedCodeToEditor(extracted);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `stopped_${Date.now()}`,
          role: "assistant",
          content: `${currentStream}\n\n*(⏹️ Proceso detenido por el usuario a los ${generationSeconds}s)*`,
          codeSnippet: extracted,
          engineUsed: engineMode === "webllm" ? "WebLLM Local" : engineMode === "gemini" ? "Gemini" : "Precódigo",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `stop_log_${Date.now()}`,
          role: "system",
          content: force
            ? `🚨 **Parada Forzada de Emergencia ejecutada.**\nEl semáforo detectó inactividad. Se han reiniciado todos los buffers y liberado los hilos del motor.`
            : `⏹️ **Generación detenida por el usuario.**`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }

    setStreamingContent("");
    setStallSeconds(0);
    setIsStalled(false);
    setSemaphoreStatus("green");
    setSemaphoreMessage(force ? "Motor reiniciado con éxito" : "Proceso cancelado. Listo para nueva consulta.");
  };

  const handleSendMessage = async () => {
    const prompt = inputPrompt.trim();
    if (!prompt || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsGenerating(true);
    setStreamingContent("");

    // Initialize timers & heartbeat
    const now = Date.now();
    generationStartTimeRef.current = now;
    lastActivityTimeRef.current = now;
    tokenCountRef.current = 0;
    setGenerationSeconds(0);
    setStallSeconds(0);
    setIsStalled(false);
    setSemaphoreStatus("green");
    setSemaphoreMessage("Iniciando generación...");

    // Create fresh AbortController
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    try {
      // 1. MODO: RED NEURAL DE PRECÓDIGO (0ms Latencia, Instantánea, 100% Offline)
      if (engineMode === "precode_neural") {
        await new Promise((r) => setTimeout(r, 60));
        if (controller.signal.aborted) return;

        const result = generatePrecodeNeuralCode(prompt, currentCode);
        const extracted = extractCode(result.code) || result.code;
        applyGeneratedCodeToEditor(extracted, result.isInsertionSnippet);

        const assistantMsg: ChatMessage = {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: result.explanation,
          codeSnippet: extracted,
          tokenSavings: result.tokenSavingsTotal,
          engineUsed: "Red Neural Precódigo (Local)",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
      // 2. MODO: WEBLLM LOCAL (WebGPU en el Navegador con Semáforo y Watchdog)
      else if (engineMode === "webllm") {
        const { systemPrompt, userPromptWithPrecode, tokenSavings } = buildPrecodeOptimizedPrompt(
          prompt,
          currentCode
        );

        let accumulated = "";
        try {
          await webLlmService.streamGenerate(
            userPromptWithPrecode,
            systemPrompt,
            (chunk) => {
              if (controller.signal.aborted) return;
              accumulated = chunk;
              lastActivityTimeRef.current = Date.now();
              tokenCountRef.current += 1;
              setStreamingContent(chunk);
            },
            controller.signal,
            prompt,
            currentCode
          );

          if (controller.signal.aborted) return;

          const extracted = extractCode(accumulated);
          applyGeneratedCodeToEditor(extracted);
          const assistantMsg: ChatMessage = {
            id: `a_${Date.now()}`,
            role: "assistant",
            content: accumulated,
            codeSnippet: extracted,
            tokenSavings,
            engineUsed: `WebLLM Local (${selectedWebLlmModel.split("-")[0]})`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setStreamingContent("");
        } catch (webLlmErr: any) {
          if (controller.signal.aborted) return;

          console.warn("WebLLM WebGPU error, attempting graceful fallback:", webLlmErr);
          let geminiSuccess = false;

          // Intento de fallback automático a Gemini Cloud si WebGPU no descarga o falla
          try {
            const cfg = getAiConfig();
            const res = await fetch("/api/gemini/assist", {
              method: "POST",
              headers: getAiHeaders(),
              signal: controller.signal,
              body: JSON.stringify({
                prompt: userPromptWithPrecode,
                code: currentCode,
                apiKey: cfg.useCustomKey && cfg.apiKey ? cfg.apiKey : undefined,
                model: cfg.model || "gemini-3.8-flash",
              }),
            });
            if (res.ok) {
              const data = await res.json();
              const responseText = data.text;
              if (responseText) {
                const extracted = extractCode(responseText);
                applyGeneratedCodeToEditor(extracted);
                const assistantMsg: ChatMessage = {
                  id: `a_${Date.now()}`,
                  role: "assistant",
                  content: `*(Aviso WebLLM: ${webLlmErr.message || "GPU local no disponible"}. Se activó Gemini Cloud automáticamente)*\n\n${responseText}`,
                  codeSnippet: extracted,
                  tokenSavings,
                  engineUsed: "Gemini Cloud (Respaldo Inteligente)",
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                };
                setMessages((prev) => [...prev, assistantMsg]);
                setStreamingContent("");
                geminiSuccess = true;
              }
            }
          } catch (_) {}

          // Si Gemini no está disponible o falla, fallback a Red Neural de Precódigo 100% offline
          if (!geminiSuccess) {
            const result = generatePrecodeNeuralCode(prompt, currentCode);
            const extracted = extractCode(result.code) || result.code;
            applyGeneratedCodeToEditor(extracted, result.isInsertionSnippet);
            const assistantMsg: ChatMessage = {
              id: `a_${Date.now()}`,
              role: "assistant",
              content: `*(Aviso WebLLM: ${webLlmErr.message || "Fallo en GPU"}. Se activó la Red Neural de Precódigo instantánea)*\n\n${result.explanation}`,
              codeSnippet: extracted,
              tokenSavings: result.tokenSavingsTotal,
              engineUsed: "Red Neural Precódigo (Fallback)",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingContent("");
          }
        }
      }
      // 3. MODO: GEMINI CLOUD (Con AbortSignal activo)
      else {
        const { userPromptWithPrecode, tokenSavings } = buildPrecodeOptimizedPrompt(
          prompt,
          currentCode
        );

        const cfg = getAiConfig();
        const res = await fetch("/api/gemini/assist", {
          method: "POST",
          headers: getAiHeaders(),
          signal: controller.signal,
          body: JSON.stringify({
            prompt: userPromptWithPrecode,
            code: currentCode,
            apiKey: cfg.useCustomKey && cfg.apiKey ? cfg.apiKey : undefined,
            model: cfg.model || "gemini-3.8-flash",
          }),
        });

        if (controller.signal.aborted) return;

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || "Error al conectar con Gemini.");
        }

        const data = await res.json();
        const responseText = data.text || "Sin respuesta del modelo Gemini.";
        const extracted = extractCode(responseText);
        applyGeneratedCodeToEditor(extracted);

        const assistantMsg: ChatMessage = {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: responseText,
          codeSnippet: extracted,
          tokenSavings,
          engineUsed: data.modelUsed || "Gemini 3.8 Flash",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === "AbortError") {
        return; // Detenido intencionalmente
      }
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: "system",
        content: `⚠️ Error de generación: ${err.message || err}. Puedes pulsar en 'Forzar Parada' o cambiar a la Red Neural de Precódigo instantánea.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setSemaphoreStatus("red");
      setSemaphoreMessage(`Falla detectada: ${err.message || "Error inesperado"}`);
    } finally {
      if (!controller.signal.aborted) {
        setIsGenerating(false);
        setStreamingContent("");
        activeAbortControllerRef.current = null;
      }
    }
  };

  const handleCopyCode = (snippet: string, msgId: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className={`flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#0a0f1e] text-slate-200 select-none font-sans text-xs ${!isFloating ? "border-l border-slate-800" : ""}`}>
      {/* Top Header: AURA IA Style with Semáforo Widget */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d162d] border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3 h-3" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 truncate text-[11px]">
                AURA IA
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                {engineMode === "webllm" ? "WebLLM Local" : engineMode === "gemini" ? "Gemini 3.8" : "Precódigo Neural"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 truncate">
              {isGenerating ? `En ejecución (${generationSeconds}s)` : "Generación de Código Asistida"}
            </span>
          </div>
        </div>

        {/* Semáforo Widget & Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* SEMÁFORO DE CONTROL INSTRUMENTAL */}
          <div
            onClick={() => setShowDiagnosticsModal(!showDiagnosticsModal)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#060a14] border border-slate-700/80 cursor-pointer hover:border-cyan-500/50 transition-colors shadow-inner"
            title="Semáforo de Diagnóstico y Salud del Motor de IA. Clic para ver detalles o forzar parada."
          >
            {/* Luces LED del Semáforo */}
            <div className="flex items-center gap-1">
              <span
                className={`w-2.5 h-2.5 rounded-full border transition-all ${
                  semaphoreStatus === "red"
                    ? "bg-rose-500 border-rose-300"
                    : "bg-rose-950/60 border-rose-900/40 opacity-30"
                }`}
                title="Luz Roja: Traba, atasco o error de motor"
              />
              <span
                className={`w-2.5 h-2.5 rounded-full border transition-all ${
                  semaphoreStatus === "yellow"
                    ? "bg-amber-400 border-amber-200"
                    : "bg-amber-950/60 border-amber-900/40 opacity-30"
                }`}
                title="Luz Ámbar: Esperando respuesta del motor / procesando"
              />
              <span
                className={`w-2.5 h-2.5 rounded-full border transition-all ${
                  semaphoreStatus === "green"
                    ? "bg-emerald-400 border-emerald-200 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                    : "bg-emerald-950/60 border-emerald-900/40 opacity-30"
                }`}
                title="Luz Verde: Motor listo y respondiendo con fluidez"
              />
            </div>

            {/* Texto de Estado del Semáforo */}
            <div className="flex items-center gap-1 font-mono text-[9px]">
              <span
                className={`font-semibold ${
                  semaphoreStatus === "red"
                    ? "text-rose-400"
                    : semaphoreStatus === "yellow"
                    ? "text-amber-300"
                    : "text-emerald-300"
                }`}
              >
                {semaphoreStatus === "red"
                  ? "FALLA"
                  : semaphoreStatus === "yellow"
                  ? "ESPERA"
                  : "LISTO"}
              </span>
              <Info className="w-2.5 h-2.5 text-slate-500" />
            </div>
          </div>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
              title="Configurar claves API y preferencias"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Ocultar panel lateral"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Popover / Tarjeta de Diagnóstico del Semáforo */}
      {showDiagnosticsModal && (
        <div className="p-3 bg-[#0c1326] border-b border-slate-700/80 text-[11px] space-y-2.5 animate-in fade-in shadow-xl z-20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Semáforo de Diagnóstico y Control de Fallas</span>
            </div>
            <button
              onClick={() => setShowDiagnosticsModal(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex flex-col gap-1">
              <span className="text-slate-400">Estado del Semáforo:</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    semaphoreStatus === "red"
                      ? "bg-rose-500"
                      : semaphoreStatus === "yellow"
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  }`}
                />
                <span
                  className={
                    semaphoreStatus === "red"
                      ? "text-rose-400"
                      : semaphoreStatus === "yellow"
                      ? "text-amber-300"
                      : "text-emerald-300"
                  }
                >
                  {semaphoreStatus === "red"
                    ? "🔴 Rojo (Atascado / Falla)"
                    : semaphoreStatus === "yellow"
                    ? "🟡 Ámbar (Esperando)"
                    : "🟢 Verde (Operativo)"}
                </span>
              </div>
              <span className="text-slate-400 text-[9px] truncate">{semaphoreMessage}</span>
            </div>

            <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex flex-col gap-1">
              <span className="text-slate-400">Watchdog en Vivo:</span>
              <div className="font-mono text-slate-200">
                Inactividad: <span className={stallSeconds > 6 ? "text-rose-400 font-bold" : "text-cyan-300"}>{stallSeconds}s</span>
              </div>
              <div className="font-mono text-slate-400 text-[9px]">
                Tiempo total: {generationSeconds}s {tokenSpeed > 0 && `| ${tokenSpeed} tok/s`}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] text-slate-400">
              {isGenerating ? "Proceso de IA en curso..." : "Motor listo para nuevas consultas."}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleStop(true)}
                className="px-2.5 py-1 rounded bg-rose-900 hover:bg-rose-800 text-rose-200 border border-rose-600/70 font-bold flex items-center gap-1 text-[10px] transition-colors"
                title="Desbloquea inmediatamente la interfaz, reinicia el motor y libera hilos"
              >
                <AlertTriangle className="w-3 h-3 text-rose-300" />
                <span>Forzar Parada y Resetear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Engine Selector Segmented Control */}
      <div className="px-2.5 py-1.5 bg-[#080d19] border-b border-slate-800/80 flex items-center gap-1 overflow-x-auto text-[10px]">
        <button
          onClick={() => setEngineMode("precode_neural")}
          className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors whitespace-nowrap ${
            engineMode === "precode_neural"
              ? "bg-amber-950/80 text-amber-300 border border-amber-600/60 font-semibold shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
          title="Red Neural de Precódigo (Instantáneo 0ms, 100% offline, ensambla módulos probados)"
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Red Neural Precódigo</span>
        </button>

        <button
          onClick={() => setEngineMode("webllm")}
          className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors whitespace-nowrap ${
            engineMode === "webllm"
              ? "bg-cyan-950/80 text-cyan-300 border border-cyan-600/60 font-semibold shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
          title="WebLLM Local: Ejecución en GPU del navegador vía WebGPU sin enviar datos fuera"
        >
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>WebLLM Local (WebGPU)</span>
        </button>

        <button
          onClick={() => setEngineMode("gemini")}
          className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors whitespace-nowrap ${
            engineMode === "gemini"
              ? "bg-purple-950/80 text-purple-300 border border-purple-600/60 font-semibold shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
          title="Google Gemini 3.8 Cloud: Razonamiento avanzado en la nube"
        >
          <Globe className="w-3 h-3 text-purple-400" />
          <span>Gemini 3.8 Nube</span>
        </button>

        <div className="ml-auto flex items-center pl-2 border-l border-slate-800 text-[10px] whitespace-nowrap">
          <button
            onClick={() => setAutoApplyToEditor(!autoApplyToEditor)}
            className={`px-2 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer border ${
              autoApplyToEditor
                ? "bg-emerald-950/90 text-emerald-300 border-emerald-600/70 font-bold shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                : "text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-700"
            }`}
            title="Sincronizar automáticamente el código generado dentro del editor de código DIV"
          >
            <CheckCircle2 className={`w-3 h-3 ${autoApplyToEditor ? "text-emerald-400" : "text-slate-500"}`} />
            <span>Auto-enviar a Código: {autoApplyToEditor ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* WebLLM Engine Sub-Bar */}
      {engineMode === "webllm" && (
        <div className="px-2.5 py-1 bg-[#060b16] border-b border-slate-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-400">Modelo:</span>
              <select
                value={selectedWebLlmModel}
                onChange={(e) => {
                  const mId = e.target.value;
                  setSelectedWebLlmModel(mId);
                  if (webLlmService.isModelDownloaded(mId)) {
                    webLlmService.loadModel(mId);
                  }
                }}
                disabled={isGenerating || webLlmStatus === "loading" || isDownloadingModel}
                className="bg-[#0b1222] border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-mono text-[9px] outline-none max-w-[200px] truncate"
              >
                {AVAILABLE_WEBLLM_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.size})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-[9px]">
              {webLlmStatus === "loading" || isDownloadingModel ? (
                <div className="flex items-center gap-1 text-cyan-400 font-semibold">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>Descargando... {webLlmProgress.progress}%</span>
                </div>
              ) : webLlmService.isModelLoaded(selectedWebLlmModel) ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Activo ({webLlmService.getEngineType() === "webgpu" ? "GPU" : "Local"})
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDownloadAndActivate(selectedWebLlmModel)}
                  disabled={isDownloadingModel || webLlmStatus === "loading"}
                  className="px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-semibold text-[9px] flex items-center gap-1 shadow cursor-pointer transition-colors"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>Descargar y Activar</span>
                </button>
              )}
            </div>
          </div>

          {webLlmStatus === "loading" && (
            <div className="space-y-1">
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-200"
                  style={{ width: `${webLlmProgress.progress}%` }}
                />
              </div>
              <div className="text-[9px] font-mono text-cyan-300 truncate">
                {webLlmProgress.text || "Descargando pesos..."}
              </div>
            </div>
          )}

          {(webLlmStatus === "unsupported" || webLlmStatus === "error") && (
            <div className="p-2 rounded bg-rose-950/80 border border-rose-800/60 text-rose-300 text-[10px] space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>
                  {webLlmStatus === "unsupported"
                    ? "WebGPU no está disponible en este navegador/ventana."
                    : `Error en WebGPU: ${webLlmService.getLastErrorMessage() || "Fallo al inicializar"}.`}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-4">
                <button
                  type="button"
                  onClick={() => {
                    setEngineMode("gemini");
                    webLlmService.activateCloudFallback();
                  }}
                  className="px-2 py-0.5 rounded bg-cyan-800 hover:bg-cyan-700 text-white font-semibold text-[9px] flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Activar Gemini Cloud (Inmediato)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEngineMode("precode_neural");
                    webLlmService.activatePrecodeFallback();
                  }}
                  className="px-2 py-0.5 rounded bg-purple-800 hover:bg-purple-700 text-white font-semibold text-[9px] flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Cpu className="w-2.5 h-2.5" />
                  <span>Activar Precódigo Offline (0ms)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Precode Theory Quick Buttons & Chips Drawer */}
      <div className="border-b border-slate-800 bg-[#070c17]">
        <div className="flex items-center justify-between px-2.5 py-1 text-[10px]">
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Layers className="w-3 h-3" />
            <span>Botones de Creación Rápida de Precódigo</span>
          </div>
          <button
            onClick={() => setShowPrecodeDrawer(!showPrecodeDrawer)}
            className="text-slate-400 hover:text-slate-200 text-[9px] underline"
          >
            {showPrecodeDrawer ? "Minimizar" : "Mostrar"}
          </button>
        </div>

        {showPrecodeDrawer && (
          <div className="px-2 pb-2">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[9px]">
              {[
                { id: "all", label: "Todos" },
                { id: "app", label: "Web y Apps" },
                { id: "movement", label: "Movimiento" },
                { id: "combat", label: "Disparo" },
                { id: "enemies", label: "Enemigos" },
                { id: "bosses", label: "Jefes" },
                { id: "hud", label: "HUD/Vidas" },
                { id: "mode8", label: "Modo 8 (3D)" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id as any)}
                  className={`px-1.5 py-0.5 rounded transition-colors whitespace-nowrap ${
                    activeCategory === c.id
                      ? "bg-cyan-900 text-cyan-200 font-bold"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Precode Action Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {filteredBlocks.map((block) => {
                const isSelected = selectedPrecodeBlocks.some((b) => b.id === block.id);
                return (
                  <div
                    key={block.id}
                    className={`flex items-center rounded border text-[10px] whitespace-nowrap shadow-xs transition-colors flex-shrink-0 ${
                      isSelected
                        ? "bg-amber-950/70 border-amber-500/80 text-amber-200"
                        : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <button
                      onClick={() => handleTogglePrecodeBlock(block)}
                      className="px-1.5 py-1 flex items-center gap-1"
                      title={block.description}
                    >
                      <Zap className={`w-2.5 h-2.5 ${isSelected ? "text-amber-400 fill-amber-400" : "text-slate-500"}`} />
                      <span>{block.name}</span>
                    </button>
                    <button
                      onClick={() => handleQuickInsertPrecode(block)}
                      className="px-1 py-1 border-l border-slate-700/60 hover:bg-slate-800 text-cyan-400 hover:text-cyan-200"
                      title="Insertar código directamente al editor"
                    >
                      <ArrowDownToLine className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Chat Messages List */}
      <div className="flex-1 flex-grow min-h-0 overflow-y-auto p-3 space-y-3 font-sans">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 max-w-[95%] ${
              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
            }`}
          >
            {/* Header info */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
              <span className="font-semibold">
                {msg.role === "user" ? "Tú" : msg.role === "system" ? "Sistema" : "AURA IA"}
              </span>
              {msg.engineUsed && (
                <span className="px-1 py-0.2 rounded text-[8px] bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                  {msg.engineUsed}
                </span>
              )}
              {msg.tokenSavings && msg.tokenSavings > 0 && (
                <span className="text-[9px] text-amber-400 font-mono flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5" /> -{msg.tokenSavings} tok
                </span>
              )}
              <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
            </div>

            {/* Bubble */}
            <div
              className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-cyan-950/80 text-cyan-100 border border-cyan-800/60 rounded-tr-none shadow-md"
                  : msg.role === "system"
                  ? "bg-slate-900 border border-slate-700 text-slate-300 w-full"
                  : "bg-[#0d162a] text-slate-200 border border-slate-800 rounded-tl-none shadow-md w-full"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>

              {/* Code Snippet Card */}
              {msg.codeSnippet && (
                <div className="mt-2.5 rounded bg-[#060a14] border border-cyan-900/60 overflow-hidden shadow-lg max-w-full">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 bg-[#090f20] border-b border-slate-800 text-[10px] min-w-0">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-semibold min-w-0 flex-wrap">
                      <Code2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">Código DIV Generado</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 text-[9px] font-sans font-medium flex items-center gap-0.5 whitespace-nowrap">
                        <Check className="w-2.5 h-2.5" />
                        <span>{appliedId === msg.id ? "Insertado" : "Listo para probar"}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {/* Botón PROBAR CÓDIGO DIRECTO: Aplica al editor y arranca el juego a 60 FPS */}
                      <button
                        type="button"
                        onClick={() => {
                          const hasExisting = /\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(currentCode || "");
                          const hasProg = /\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(msg.codeSnippet!);
                          const runnable =
                            hasExisting && !hasProg
                              ? mergeDivSnippetIntoProgram(currentCode, msg.codeSnippet!)
                              : ensureRunnableDivProgram(msg.codeSnippet!);
                          onApplyFullCode(runnable);
                          if (onRunGame) {
                            onRunGame();
                          }
                        }}
                        className="px-2.5 py-1.5 rounded bg-[#2F6F4E] hover:bg-[#275c40] text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                        title="Probar de inmediato este código en ejecución (F5)"
                      >
                        <Play className="w-2.5 h-2.5 fill-white" />
                        <span>Probar</span>
                      </button>

                      {/* Botón VER EN EDITOR */}
                      <button
                        type="button"
                        onClick={() => {
                          const hasExisting = /\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(currentCode || "");
                          const hasProg = /\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(msg.codeSnippet!);
                          const runnable =
                            hasExisting && !hasProg
                              ? mergeDivSnippetIntoProgram(currentCode, msg.codeSnippet!)
                              : ensureRunnableDivProgram(msg.codeSnippet!);
                          onApplyFullCode(runnable);
                          onSwitchToEditor?.();
                        }}
                        className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-[10px] flex items-center gap-1 transition-colors cursor-pointer font-semibold whitespace-nowrap"
                        title="Abrir y editar este código en el Editor DIV"
                      >
                        <Code2 className="w-2.5 h-2.5" />
                        <span>Ver en Editor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(msg.codeSnippet!, msg.id)}
                        className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] flex items-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap"
                        title="Copiar código al portapapeles"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSmartInsertMessageCode(msg.codeSnippet!, msg.id)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[9px] flex items-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap"
                        title="Integrar dentro de tu código DIV actual sin duplicar cabeceras"
                      >
                        <ArrowDownToLine className="w-2.5 h-2.5" />
                        <span>Insertar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyFullCode(ensureRunnableDivProgram(msg.codeSnippet!));
                          setAppliedId(msg.id);
                          setTimeout(() => setAppliedId(null), 1800);
                        }}
                        className="px-2 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/50 text-[9px] flex items-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap"
                        title="Reemplazar todo el archivo actual con este código"
                      >
                        <span>Reemplazar</span>
                      </button>
                    </div>
                  </div>
                  <pre className="p-2.5 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60 leading-5 selection:bg-cyan-900">
                    {msg.codeSnippet}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Streaming Indicator con Semáforo y Botón de Parada Directo */}
        {isGenerating && (
          <div
            className={`p-2.5 rounded-lg border transition-all ${
              semaphoreStatus === "red"
                ? "bg-rose-950/40 border-rose-600 text-rose-200"
                : semaphoreStatus === "yellow"
                ? "bg-amber-950/30 border-amber-600/70 text-amber-200"
                : "bg-[#0d1527] border-cyan-800/50 text-cyan-200"
            }`}
          >
            {/* Live Status Bar */}
            <div className="flex items-center justify-between mb-1.5 font-mono text-[10px]">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    semaphoreStatus === "red"
                      ? "bg-rose-500"
                      : semaphoreStatus === "yellow"
                      ? "bg-amber-400"
                      : "bg-cyan-400"
                  }`}
                />
                <span className="font-bold">
                  {semaphoreStatus === "red"
                    ? `🚨 ¡TRABA DETECTADA! (${stallSeconds}s sin respuesta)`
                    : semaphoreStatus === "yellow"
                    ? `🟡 Esperando respuesta (${stallSeconds}s)...`
                    : `🟢 Generando en vivo (${engineMode === "webllm" ? "WebLLM" : engineMode === "precode_neural" ? "Precódigo" : "Gemini"})...`}
                </span>
                <span className="text-slate-400">⏱️ {generationSeconds}s</span>
              </div>

              {/* Parada Rápida en el marco de streaming */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleStop(false)}
                  className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold flex items-center gap-1 text-[9px] transition-colors"
                  title="Detener generación inmediatamente"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Parar</span>
                </button>
                {(semaphoreStatus === "red" || semaphoreStatus === "yellow" || stallSeconds >= 5) && (
                  <button
                    onClick={() => handleStop(true)}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center gap-1 text-[9px] transition-colors"
                    title="Forzar Parada: Si se trabó, corta el worker y restablece el editor"
                  >
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>Forzar</span>
                  </button>
                )}
              </div>
            </div>

            {streamingContent ? (
              <pre className="text-[11px] font-mono whitespace-pre-wrap leading-5 text-slate-300 max-h-40 overflow-y-auto">
                {streamingContent}
              </pre>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                {semaphoreStatus === "red"
                  ? "El proceso parece haberse atascado en el navegador o la GPU. Puedes pulsar 'Forzar' para desbloquear."
                  : "Sintetizando estructura y aplicando teoría de precódigo..."}
              </p>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Precode Compound Badge Indicator */}
      {selectedPrecodeBlocks.length > 0 && (
        <div className="px-2.5 py-1 bg-amber-950/60 border-t border-amber-800/40 text-[10px] flex items-center justify-between text-amber-300">
          <div className="flex items-center gap-1 truncate">
            <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span className="font-semibold">Precódigo Activo:</span>
            <span className="truncate">{selectedPrecodeBlocks.map((b) => b.name).join(", ")}</span>
          </div>
          <button
            onClick={() => setSelectedPrecodeBlocks([])}
            className="text-amber-400 hover:text-white underline text-[9px] flex-shrink-0"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Bottom Chat Input Form: Android Studio Style with Fail-Safe Controls */}
      <div className="p-2.5 bg-[#0a1020] border-t border-slate-800 flex flex-col gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
            placeholder="Indica qué deseas crear (ej: crea un jefe que dispare en abanico y persiga)..."
            className="flex-1 px-2.5 py-1.5 bg-[#050811] border border-slate-700 rounded text-slate-100 text-xs outline-none focus:border-cyan-400 placeholder:text-slate-500 resize-none font-mono"
          />

          {isGenerating ? (
            <div className="flex flex-col sm:flex-row gap-1 self-stretch">
              {/* Botón Parar Normal (Cancelación Limpia) */}
              <button
                onClick={() => handleStop(false)}
                className="px-3 py-2 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold flex items-center justify-center gap-1.5 transition-all text-xs shadow-md cursor-pointer flex-1"
                title="Detener el proceso de IA de forma segura"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Parar</span>
              </button>

              {/* Botón Forzar Parada (Si el Semáforo detecta demora o traba) */}
              {(semaphoreStatus === "yellow" || semaphoreStatus === "red" || stallSeconds >= 4) && (
                <button
                  onClick={() => handleStop(true)}
                  className="px-3 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center justify-center gap-1 transition-all text-xs cursor-pointer"
                  title="Forzar Parada Inmediata"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Forzar</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleSendMessage}
              disabled={!inputPrompt.trim()}
              className="px-4 min-h-[44px] rounded-xl bg-[#7C2D48] hover:bg-[#66233A] text-white font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 text-xs self-stretch cursor-pointer"
              title="Enviar instrucción (Enter)"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Generar</span>
            </button>
          )}
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="flex items-center gap-1 overflow-x-auto text-[9px] text-slate-400 pt-0.5">
          <span className="font-semibold text-slate-500 flex-shrink-0">Ejemplos:</span>
          {[
            "Crea una landing de ventas para mi tienda con precios y pedidos",
            "Agrega sección de precios y preguntas frecuentes FAQ a mi web",
            "Juego de plataformas con salto y monedas",
            "App visual de tareas con formulario y botón",
            "Pong clásico con 2 palas y pelota",
            "Agrega un enemigo perseguidor a mi código",
          ].map((promptText, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setInputPrompt(promptText);
                textareaRef.current?.focus();
              }}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 whitespace-nowrap transition-colors cursor-pointer"
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
