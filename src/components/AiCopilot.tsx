import React, { useState, useEffect } from "react";
import { Sparkles, Send, RefreshCw, Check, Copy, Code2, ArrowDownToLine, Flame, ShieldAlert, Key, Settings2 } from "lucide-react";
import { DivGraphic } from "../types";
import { getAiConfig, getAiHeaders, AiConfig } from "../services/aiConfig";
import { AiSettingsModal } from "./AiSettingsModal";

interface AiCopilotProps {
  currentCode: string;
  fpg: DivGraphic[];
  onApplyCode: (newCode: string) => void;
  onInsertCode: (snippet: string) => void;
  onOpenAiSettings?: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  extractedCode?: string;
}

export const AiCopilot: React.FC<AiCopilotProps> = ({
  currentCode,
  fpg,
  onApplyCode,
  onInsertCode,
  onOpenAiSettings,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "¡Hola! Soy tu copiloto de desarrollo para WXDIV 3.0. Puedo generar código completo para tus juegos en sintaxis DIV Games Studio, crear procesos de enemigos, añadir físicas, armas y resolver errores de sintaxis al instante. ¿Qué deseas crear?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState("Gemini 3.8 Flash");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConfig>(getAiConfig());

  // Listen for external config changes
  useEffect(() => {
    const handleConfigChange = () => {
      const cfg = getAiConfig();
      setAiConfig(cfg);
      if (cfg.model) {
        if (cfg.model.includes("3.8-flash")) setActiveModel("Gemini 3.8 Flash");
        else if (cfg.model.includes("latest")) setActiveModel("Gemini Flash");
        else if (cfg.model.includes("lite")) setActiveModel("Gemini Flash Lite");
        else if (cfg.model.includes("1.5-pro")) setActiveModel("Gemini 1.5 Pro");
      }
    };

    window.addEventListener("wxdiv_aiconfig_changed", handleConfigChange);
    return () => window.removeEventListener("wxdiv_aiconfig_changed", handleConfigChange);
  }, []);

  const quickPrompts = [
    "Crea un enemigo volador que dispare hacia el jugador",
    "Añade un sistema de puntuación alta y vidas con HUD",
    "Genera un jefe final gigante con 3 fases de ataque",
    "Corrige los errores de sintaxis y verifica las etiquetas END",
    "Crea un disparo triple en abanico con sonido",
  ];

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setIsLoading(true);
    setError("");
    setLastFailedPrompt(null);

    const currentCfg = getAiConfig();

    try {
      const res = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          prompt: textToSend,
          code: currentCode,
          currentFpg: fpg.map((g) => ({ id: g.id, name: g.name })),
          apiKey: currentCfg.useCustomKey && currentCfg.apiKey ? currentCfg.apiKey : undefined,
          model: currentCfg.model || "gemini-3.8-flash",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error de respuesta del servidor IA.");
      }

      const data = await res.json();
      const rawText = data.text || "Sin respuesta del modelo.";
      if (data.modelUsed) {
        if (data.modelUsed.includes("3.8-flash")) setActiveModel("Gemini 3.8 Flash");
        else if (data.modelUsed.includes("latest")) setActiveModel("Gemini Flash");
        else if (data.modelUsed.includes("lite")) setActiveModel("Gemini Flash Lite");
        else if (data.modelUsed.includes("pro")) setActiveModel("Gemini 1.5 Pro");
        else if (data.modelUsed.includes("fallback") || data.modelUsed.includes("offline")) setActiveModel("DIV Fallback Engine");
      }

      // Extract DIV code block if present
      let extractedCode: string | undefined;
      const match = rawText.match(/```(?:div|cpp|pascal|c)?([\s\S]*?)```/i);
      if (match && match[1]) {
        extractedCode = match[1].trim();
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: rawText,
        extractedCode,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setLastFailedPrompt(textToSend);
      setError(
        err.message ||
          "Los servidores de IA están temporalmente ocupados. Haz clic en Reintentar para volver a consultar."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const openSettings = () => {
    if (onOpenAiSettings) {
      onOpenAiSettings();
    } else {
      setIsSettingsOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] border border-slate-800 rounded-lg overflow-hidden text-xs text-slate-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0d1527] border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-slate-100">Copiloto IA - WXDIV 3.0</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[10px] font-mono">
            {activeModel}
          </span>
          {aiConfig.useCustomKey && aiConfig.apiKey && (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-[10px]">
              <Key className="w-2.5 h-2.5" />
              <span>Key Propia</span>
            </span>
          )}
        </div>

        <button
          onClick={openSettings}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-cyan-500/50 flex items-center gap-1.5 text-xs transition-colors"
          title="Configurar tu clave API personalizada sin editar .env"
        >
          <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Configurar API</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              m.role === "user"
                ? "items-end"
                : "items-start"
            }`}
          >
            <div
              className={`max-w-[90%] p-3 rounded-lg leading-relaxed ${
                m.role === "user"
                  ? "bg-indigo-600/90 text-white rounded-br-none"
                  : "bg-[#0d1424] border border-slate-800/90 text-slate-200 rounded-bl-none"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>

              {/* Actionable Code Block */}
              {m.extractedCode && (
                <div className="mt-3 p-2 bg-[#050811] rounded border border-slate-800 font-mono text-[11px]">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-slate-400">
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5" />
                      Código DIV Games Studio
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(m.extractedCode!, idx)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedIndex === idx ? "Copiado" : "Copiar"}</span>
                      </button>

                      <button
                        onClick={() => onInsertCode(m.extractedCode!)}
                        className="px-2 py-0.5 rounded bg-emerald-700/80 hover:bg-emerald-600 text-white flex items-center gap-1"
                        title="Añadir este código al final del editor"
                      >
                        <ArrowDownToLine className="w-3 h-3" />
                        <span>Insertar</span>
                      </button>

                      <button
                        onClick={() => onApplyCode(m.extractedCode!)}
                        className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 font-semibold"
                        title="Reemplazar todo el archivo con este juego"
                      >
                        <Flame className="w-3 h-3 text-amber-300" />
                        <span>Reemplazar Todo</span>
                      </button>
                    </div>
                  </div>
                  <pre className="max-h-56 overflow-y-auto text-slate-300 select-all leading-5">
                    {m.extractedCode}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>El copiloto está analizando la sintaxis y generando código DIV...</span>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openSettings}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/50 flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors"
              >
                <Key className="w-3 h-3" />
                <span>Configurar Clave</span>
              </button>
              {lastFailedPrompt && (
                <button
                  onClick={() => handleSendMessage(lastFailedPrompt)}
                  className="px-2.5 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-white font-medium flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reintentar</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Chips */}
      <div className="p-2 bg-[#0a1020] border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-2.5 bg-[#0d1424] border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
          placeholder="Escribe lo que deseas para tu juego (ej: crea un juego espacial en Modo 7)..."
          className="flex-1 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-400 placeholder:text-slate-500"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !input.trim()}
          className="px-3.5 py-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Enviar</span>
        </button>
      </div>

      {/* Embedded Ai Settings Modal if triggered internally */}
      <AiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => {
          setAiConfig(getAiConfig());
        }}
      />
    </div>
  );
};

