import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Square,
  Cpu,
  Zap,
  Settings,
  Code2,
  Copy,
  Check,
  ArrowDownToLine,
  Play,
  X,
  Layers,
  Box,
  Compass,
  Blocks,
} from "lucide-react";
import {
  PRECODE_LIBRARY,
  PrecodeBlock,
  generatePrecodeNeuralCode,
  buildPrecodeOptimizedPrompt,
  mergeDivSnippetIntoProgram,
} from "../engine/ai/precodeEngine";
import {
  MODE8_WORK_BLOCKS,
  Mode8AiAction,
  Mode8SceneContext,
  Mode8WorkBlock,
  extractMode8ActionsFromLlmText,
} from "../engine/ai/mode8WorkBlocks";
import {
  webLlmService,
  WebLlmStatus,
} from "../engine/ai/webLlmService";
import { getAiConfig, saveAiConfig, LocalAiEngineMode } from "../services/aiConfig";
import {
  useVoiceDictation,
  parseVoiceCommandIntent,
} from "../hooks/useVoiceDictation";
import {
  VoiceMicButton,
  VoiceListeningBanner,
} from "./VoiceDictationControls";

export type AiEngineMode = LocalAiEngineMode;

interface AndroidStudioAiPanelProps {
  currentCode: string;
  onInsertCode: (snippet: string) => void;
  onApplyFullCode: (code: string) => void;
  onRunGame?: () => void;
  onStopGame?: () => void;
  onSwitchToEditor?: () => void;
  onClose?: () => void;
  onOpenSettings?: () => void;
  isFloating?: boolean;
  initialPrompt?: string;
  onConsumeInitialPrompt?: () => void;
  autoStartVoiceTrigger?: number;
  activeWorkspaceTab?: string;
  mode8SceneContext?: Mode8SceneContext;
  onApplyMode8Actions?: (actions: Mode8AiAction[]) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  codeSnippet?: string;
  mode8Actions?: Mode8AiAction[];
  mode8Applied?: boolean;
  engineUsed?: string;
  timestamp: string;
}

function extractDivCodeBlock(text: string): string | null {
  const match = text.match(/```(?:div|pascal|prg)?\s*([\s\S]*?)```/i);
  if (match && match[1]) {
    const trimmed = match[1].trim();
    if (trimmed.length > 10 && !trimmed.startsWith("[{")) return trimmed;
  }
  return null;
}

export const AndroidStudioAiPanel: React.FC<AndroidStudioAiPanelProps> = ({
  currentCode,
  onInsertCode,
  onApplyFullCode,
  onRunGame,
  onStopGame,
  onSwitchToEditor,
  onOpenSettings,
  initialPrompt,
  onConsumeInitialPrompt,
  autoStartVoiceTrigger = 0,
  activeWorkspaceTab = "mode8",
  mode8SceneContext,
  onApplyMode8Actions,
}) => {
  const [engineMode, setEngineMode] = useState<AiEngineMode>(() => {
    const cfg = getAiConfig();
    return cfg.engineMode === "webllm" ? "webllm" : "precode_neural";
  });
  const [selectedWebLlmModel, setSelectedWebLlmModel] = useState<string>(() => {
    return getAiConfig().webLlmModel || "SmolLM2-360M-Instruct-q4f16_1-MLC";
  });
  const [webLlmStatus, setWebLlmStatus] = useState<WebLlmStatus>(webLlmService.getStatus());
  const [webLlmProgress, setWebLlmProgress] = useState(webLlmService.getProgress());
  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [autoApply, setAutoApply] = useState<boolean>(true);
  const [voiceAutoExecute, setVoiceAutoExecute] = useState<boolean>(true);
  const [showWorkBlocks, setShowWorkBlocks] = useState<boolean>(true);
  const [blockTab, setBlockTab] = useState<"3d" | "div">(
    activeWorkspaceTab === "mode8" ? "3d" : "div"
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        activeWorkspaceTab === "mode8"
          ? "Estoy lista en modo local para ayudarte con tu mundo 3D o tu código DIV. Toca un Bloque de Trabajo 3D abajo o dime qué quieres añadir."
          : "Estoy lista en modo 100% local. Toca un bloque de trabajo o escribe qué app, web o juego quieres construir.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastVoiceTriggerRef = useRef<number>(autoStartVoiceTrigger);

  useEffect(() => {
    if (activeWorkspaceTab === "mode8") {
      setBlockTab("3d");
    } else if (activeWorkspaceTab === "logic" || activeWorkspaceTab === "design") {
      setBlockTab("div");
    }
  }, [activeWorkspaceTab]);

  useEffect(() => {
    const syncCfg = () => {
      const cfg = getAiConfig();
      setEngineMode(cfg.engineMode === "webllm" ? "webllm" : "precode_neural");
      if (cfg.webLlmModel) setSelectedWebLlmModel(cfg.webLlmModel);
    };
    window.addEventListener("wxdiv_aiconfig_changed", syncCfg);
    const unsub = webLlmService.subscribe(() => {
      setWebLlmStatus(webLlmService.getStatus());
      setWebLlmProgress(webLlmService.getProgress());
    });
    return () => {
      window.removeEventListener("wxdiv_aiconfig_changed", syncCfg);
      unsub();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleApplyCodeSafe = (codeText: string) => {
    if (/\bPROGRAM\s+/i.test(codeText)) {
      onApplyFullCode(codeText);
    } else if (currentCode.trim()) {
      onApplyFullCode(mergeDivSnippetIntoProgram(currentCode, codeText));
    } else {
      onInsertCode(codeText);
    }
  };

  const handleRunPrompt = async (promptToSend: string, runAfter = false) => {
    const clean = promptToSend.trim();
    if (!clean || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: clean,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsGenerating(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const ctxOptions = {
        activeTab: activeWorkspaceTab,
        mode8Context: mode8SceneContext,
      };

      if (engineMode === "precode_neural") {
        const res = generatePrecodeNeuralCode(clean, currentCode, ctxOptions);
        let applied3d = false;
        if (autoApply && res.mode8Actions && res.mode8Actions.length > 0 && onApplyMode8Actions) {
          onApplyMode8Actions(res.mode8Actions);
          applied3d = true;
        } else if (autoApply && res.code && activeWorkspaceTab !== "mode8") {
          handleApplyCodeSafe(res.code);
        }

        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content: res.explanation,
          codeSnippet: res.code,
          mode8Actions: res.mode8Actions,
          mode8Applied: applied3d,
          engineUsed: "CPU Local (0ms)",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        if (runAfter) onRunGame?.();
        return;
      }

      // Modo WebLLM Local (con contexto 3D + bloques DIV)
      const opt = buildPrecodeOptimizedPrompt(clean, currentCode, ctxOptions);
      const reply = await webLlmService.streamGenerate(
        opt.userPromptWithPrecode,
        opt.systemPrompt,
        (partial) => setStreamingContent(partial),
        controller.signal,
        clean,
        currentCode,
        ctxOptions
      );

      if (controller.signal.aborted) return;

      const extractedCode = extractDivCodeBlock(reply) || undefined;
      const extractedActions = extractMode8ActionsFromLlmText(reply);
      let applied3d = false;
      if (autoApply && extractedActions.length > 0 && onApplyMode8Actions) {
        onApplyMode8Actions(extractedActions);
        applied3d = true;
      } else if (autoApply && extractedCode && activeWorkspaceTab !== "mode8") {
        handleApplyCodeSafe(extractedCode);
      }

      const cleanText = reply
        .replace(/```(?:div|pascal|prg|mode8-actions)?[\s\S]*?```/gi, "")
        .trim() || "Listo, aquí tienes la propuesta generada en tu dispositivo.";

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content: cleanText,
          codeSnippet: extractedCode,
          mode8Actions: extractedActions.length > 0 ? extractedActions : undefined,
          mode8Applied: applied3d,
          engineUsed: `WebLLM Local (${selectedWebLlmModel.split("-")[0]})`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      if (runAfter) onRunGame?.();
    } catch (err: any) {
      if (!controller.signal.aborted) {
        // Respaldo inmediato en CPU local si WebLLM fue interrumpido o falló
        const fallback = generatePrecodeNeuralCode(clean, currentCode, {
          activeTab: activeWorkspaceTab,
          mode8Context: mode8SceneContext,
        });
        let applied3d = false;
        if (autoApply && fallback.mode8Actions?.length && onApplyMode8Actions) {
          onApplyMode8Actions(fallback.mode8Actions);
          applied3d = true;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: "assistant",
            content: fallback.explanation,
            codeSnippet: fallback.code,
            mode8Actions: fallback.mode8Actions,
            mode8Applied: applied3d,
            engineUsed: "Respaldo CPU Local",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } finally {
      setIsGenerating(false);
      setStreamingContent("");
      abortRef.current = null;
    }
  };

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      const p = initialPrompt;
      onConsumeInitialPrompt?.();
      handleRunPrompt(p);
    }
  }, [initialPrompt]);

  const handleStop = () => {
    abortRef.current?.abort();
    webLlmService.abort(false);
    setIsGenerating(false);
    setStreamingContent("");
  };

  const handleUseWorkBlock3D = (wb: Mode8WorkBlock) => {
    if (onApplyMode8Actions) {
      onApplyMode8Actions(wb.actions);
      setMessages((prev) => [
        ...prev,
        {
          id: `wb_${Date.now()}`,
          role: "assistant",
          content: `Bloque "${wb.title}" aplicado al mapa 3D: ${wb.shortDesc}.`,
          codeSnippet: wb.divSnippet,
          mode8Actions: wb.actions,
          mode8Applied: true,
          engineUsed: "Bloque de Trabajo 3D",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } else {
      handleRunPrompt(wb.prompt);
    }
  };

  const handleUseDivBlock = (block: PrecodeBlock) => {
    setInputPrompt((prev) => (prev ? `${prev} + ${block.name}` : block.name));
    onInsertCode(block.snippet);
  };

  const voice = useVoiceDictation({
    onFinalTranscript: (transcript) => {
      const intent = parseVoiceCommandIntent(transcript);
      if (intent.type === "run_game") onRunGame?.();
      else if (intent.type === "stop_game") onStopGame?.();
      else if (intent.type === "open_editor") onSwitchToEditor?.();
      else if (intent.type === "clear_input") setInputPrompt("");
      else if (intent.type === "switch_engine") {
        const nextMode: AiEngineMode = intent.engine === "webllm" ? "webllm" : "precode_neural";
        setEngineMode(nextMode);
        saveAiConfig({ ...getAiConfig(), engineMode: nextMode });
      } else if (intent.type === "ai_prompt" && intent.prompt.trim()) {
        handleRunPrompt(intent.prompt, Boolean(intent.runAfter));
      }
    },
    onInterimTranscript: (txt) => setInputPrompt(txt),
  });

  useEffect(() => {
    if (autoStartVoiceTrigger > lastVoiceTriggerRef.current) {
      lastVoiceTriggerRef.current = autoStartVoiceTrigger;
      if (voice.isSupported && !voice.isListening) {
        voice.toggleListening();
      }
    }
  }, [autoStartVoiceTrigger, voice]);

  const handleSwitchMode = (mode: AiEngineMode) => {
    setEngineMode(mode);
    saveAiConfig({ ...getAiConfig(), engineMode: mode });
  };

  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] font-sans overflow-hidden">
      {/* Calm Local Engine Switcher */}
      <div className="px-3.5 py-2.5 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
        <div className="inline-flex bg-[#F1F5F9] p-0.5 rounded-xl border border-[#CBD5E1]">
          <button
            type="button"
            onClick={() => handleSwitchMode("precode_neural")}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              engineMode === "precode_neural"
                ? "bg-white text-[#2F6F4E] shadow-2xs"
                : "text-[#4B5563] hover:text-[#111827]"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>CPU Local</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode("webllm")}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              engineMode === "webllm"
                ? "bg-white text-[#7C2D48] shadow-2xs"
                : "text-[#4B5563] hover:text-[#111827]"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>WebLLM</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoApply((v) => !v)}
            className={`min-h-[36px] px-2.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
              autoApply
                ? "bg-[#EEF6F1] border-[#CFE4D7] text-[#2F6F4E]"
                : "bg-white border-[#E2E8F0] text-[#4B5563]"
            }`}
            title="Aplicar automáticamente cambios en mapa 3D o editor"
          >
            {autoApply ? "Auto: Sí" : "Auto: No"}
          </button>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-9 h-9 rounded-lg bg-[#F7F8FA] hover:bg-slate-100 border border-[#E2E8F0] text-[#4B5563] flex items-center justify-center cursor-pointer"
              title="Ajustes del motor local"
              aria-label="Ajustes del motor local"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* WebLLM download progress bar if actively downloading */}
      {webLlmStatus === "loading" && (
        <div className="px-3.5 py-2 bg-[#FDF2F5] border-b border-[#F3D0DC] flex items-center justify-between gap-2 text-xs text-[#7C2D48] flex-shrink-0">
          <span className="truncate font-medium">Cargando WebLLM ({webLlmProgress.progress}%)</span>
          <button
            type="button"
            onClick={handleStop}
            className="px-2.5 py-1 rounded-md bg-white border border-[#F3D0DC] font-semibold cursor-pointer"
          >
            Detener
          </button>
        </div>
      )}

      {/* Calm 3D Context Card when editing 3D scene */}
      {mode8SceneContext && (
        <div className="px-3.5 py-2 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2 text-xs text-[#4B5563] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Compass className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
            <span className="truncate font-medium text-[#111827]">
              Mapa: {mode8SceneContext.levelTitle} · {mode8SceneContext.sectorCount} sectores · {mode8SceneContext.placedModelsCount} modelos
            </span>
          </div>
          {mode8SceneContext.customModels.length > 0 && (
            <span className="text-[11px] text-[#2F6F4E] font-semibold flex-shrink-0">
              +{mode8SceneContext.customModels.length} importados
            </span>
          )}
        </div>
      )}

      {/* Collapsible Work Blocks Section */}
      <div className="bg-white border-b border-[#E2E8F0] flex-shrink-0">
        <div className="px-3.5 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBlockTab("3d");
                setShowWorkBlocks(true);
              }}
              className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                blockTab === "3d" && showWorkBlocks
                  ? "bg-[#FDF2F5] text-[#7C2D48]"
                  : "text-[#4B5563] hover:bg-slate-100"
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Bloques 3D</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBlockTab("div");
                setShowWorkBlocks(true);
              }}
              className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                blockTab === "div" && showWorkBlocks
                  ? "bg-[#EEF6F1] text-[#2F6F4E]"
                  : "text-[#4B5563] hover:bg-slate-100"
              }`}
            >
              <Blocks className="w-3.5 h-3.5" />
              <span>Bloques Apps / DIV</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowWorkBlocks((v) => !v)}
            className="text-xs font-medium text-[#6B7280] hover:text-[#111827] px-2 py-1 cursor-pointer"
          >
            {showWorkBlocks ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {showWorkBlocks && (
          <div className="px-3.5 pb-3 flex items-stretch gap-2 overflow-x-auto [scrollbar-width:thin]">
            {blockTab === "3d"
              ? MODE8_WORK_BLOCKS.map((wb) => (
                  <button
                    key={wb.id}
                    type="button"
                    onClick={() => handleUseWorkBlock3D(wb)}
                    className="min-w-[148px] max-w-[168px] p-2.5 rounded-xl bg-[#F7F8FA] hover:bg-[#FDF2F5] border border-[#E2E8F0] hover:border-[#7C2D48]/40 text-left flex-shrink-0 transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-bold text-[#111827] truncate">{wb.title}</div>
                    <div className="text-[11px] text-[#6B7280] line-clamp-2 mt-0.5 leading-snug">
                      {wb.shortDesc}
                    </div>
                  </button>
                ))
              : PRECODE_LIBRARY.slice(0, 8).map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => handleUseDivBlock(block)}
                    className="min-w-[152px] max-w-[174px] p-2.5 rounded-xl bg-[#F7F8FA] hover:bg-[#EEF6F1] border border-[#E2E8F0] hover:border-[#2F6F4E]/40 text-left flex-shrink-0 transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-bold text-[#111827] truncate">{block.name}</div>
                    <div className="text-[11px] text-[#6B7280] line-clamp-2 mt-0.5 leading-snug">
                      {block.description}
                    </div>
                  </button>
                ))}
          </div>
        )}
      </div>

      {/* Chat Conversation Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed border ${
                msg.role === "user"
                  ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                  : "bg-white text-[#111827] border-[#E2E8F0]"
              }`}
            >
              {msg.engineUsed && (
                <div className="text-[11px] text-[#6B7280] font-medium mb-1">
                  {msg.engineUsed} · {msg.timestamp}
                </div>
              )}

              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* 3D Map Actions Button */}
              {msg.mode8Actions && msg.mode8Actions.length > 0 && onApplyMode8Actions && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onApplyMode8Actions(msg.mode8Actions!)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      {msg.mode8Applied ? "Volver a aplicar al Mapa 3D" : "Aplicar al Mapa 3D"}
                    </span>
                  </button>
                  {msg.mode8Applied && (
                    <span className="text-xs font-medium text-[#2F6F4E]">Aplicado en escena</span>
                  )}
                </div>
              )}

              {/* Code Snippet Card */}
              {msg.codeSnippet && (
                <div className="mt-2.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] overflow-hidden">
                  <pre className="p-2.5 text-[11px] font-mono text-[#1F2937] overflow-x-auto max-h-40 whitespace-pre">
                    {msg.codeSnippet}
                  </pre>
                  <div className="px-2.5 py-2 bg-white border-t border-[#E2E8F0] flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyCodeSafe(msg.codeSnippet!);
                        setAppliedId(msg.id);
                        setTimeout(() => setAppliedId(null), 1800);
                      }}
                      className="min-h-[36px] px-2.5 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {appliedId === msg.id ? <Check className="w-3.5 h-3.5" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                      <span>{appliedId === msg.id ? "Aplicado" : "Aplicar DIV"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(msg.codeSnippet!);
                        setCopiedId(msg.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className="min-h-[36px] px-2.5 rounded-lg bg-[#F7F8FA] hover:bg-slate-100 border border-[#E2E8F0] text-[#374151] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-[#2F6F4E]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copiar</span>
                    </button>

                    {onSwitchToEditor && (
                      <button
                        type="button"
                        onClick={onSwitchToEditor}
                        className="min-h-[36px] px-2.5 rounded-lg bg-[#F7F8FA] hover:bg-slate-100 border border-[#E2E8F0] text-[#374151] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Código</span>
                      </button>
                    )}

                    {onRunGame && (
                      <button
                        type="button"
                        onClick={onRunGame}
                        className="min-h-[36px] px-2.5 rounded-lg bg-[#EEF6F1] hover:bg-[#DCEEE3] text-[#2F6F4E] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Probar</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 text-xs text-[#374151] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#7C2D48]">Generando en tu dispositivo...</span>
              <button
                type="button"
                onClick={handleStop}
                className="min-h-[34px] px-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Detener</span>
              </button>
            </div>
            {streamingContent && (
              <pre className="text-[11px] font-mono whitespace-pre-wrap text-[#4B5563] max-h-40 overflow-y-auto">
                {streamingContent}
              </pre>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Dictation Banner */}
      {(voice.isListening || voice.error) && (
        <div className="px-3.5 py-1.5 bg-white border-t border-[#E2E8F0] flex-shrink-0">
          <VoiceListeningBanner
            isListening={voice.isListening}
            interimTranscript={voice.interimTranscript}
            error={voice.error}
            lang={voice.lang}
            autoExecute={voiceAutoExecute}
            onChangeLang={voice.setLang}
            onToggleAutoExecute={() => setVoiceAutoExecute((v) => !v)}
            onFinishAndSend={() => {
              voice.stopListening();
              if (inputPrompt.trim()) handleRunPrompt(inputPrompt, voiceAutoExecute);
            }}
            onCancel={voice.stopListening}
            onDismissError={voice.clearError}
            variant="light"
          />
        </div>
      )}

      {/* Calm Composer Bar */}
      <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white border-t border-[#E2E8F0] flex-shrink-0">
        <div className="flex items-center gap-2">
          <VoiceMicButton
            isSupported={voice.isSupported}
            isListening={voice.isListening}
            onToggle={voice.toggleListening}
            variant="light"
          />

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleRunPrompt(inputPrompt);
              }
            }}
            placeholder={
              activeWorkspaceTab === "mode8"
                ? "Ej: agrega 5 monedas y una escalera..."
                : "Ej: crea un juego de plataformas o una app..."
            }
            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F8FA] border border-[#CBD5E1] text-xs sm:text-sm text-[#111827] placeholder:text-[#6B7280] outline-none focus:border-[#7C2D48]"
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={handleStop}
              className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-rose-600 text-white font-semibold text-xs flex items-center justify-center cursor-pointer"
              aria-label="Detener generación"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleRunPrompt(inputPrompt)}
              disabled={!inputPrompt.trim()}
              className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-[#7C2D48] hover:bg-[#642239] disabled:opacity-45 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              aria-label="Enviar mensaje"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
