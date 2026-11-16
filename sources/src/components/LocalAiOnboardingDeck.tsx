import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  HardDrive,
  Lightbulb,
  Play,
  ShieldCheck,
  Sparkles,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { generatePrecodeNeuralCode } from "../engine/ai/precodeEngine";
import { getGpuInfo } from "../engine/ai/webLlmService";
import { useVoiceDictation } from "../hooks/useVoiceDictation";
import { VoiceMicButton, VoiceListeningBanner } from "./VoiceDictationControls";

export interface LocalAiOnboardingDeckProps {
  onOpenAiWithPrompt?: (prompt?: string) => void;
  onOpenAiSettings?: () => void;
  onLoadCode?: (code: string, runImmediately?: boolean) => void;
  onOpenTutorial?: () => void;
  onCloseParent?: () => void;
}

type HardwareOption = "cpu" | "gpu";

interface PromptTransformExample {
  id: string;
  title: string;
  prompt: string;
  summary: string;
  mappings: {
    id: string;
    humanPhrase: string;
    meaning: string;
    divPart: string;
    highlightToken: string;
  }[];
  divCode: string;
}

const PROMPT_EXAMPLES: PromptTransformExample[] = [
  {
    id: "ship",
    title: "Nave con flechas",
    prompt: "Quiero una nave espacial que se mueva con las flechas del teclado",
    summary: "La IA identifica al protagonista (PROCESS), su dibujo (graph) y cómo responde a tus dedos o teclas.",
    mappings: [
      {
        id: "actor",
        humanPhrase: "\"una nave espacial\"",
        meaning: "Crea un personaje independiente en pantalla",
        divPart: "PROCESS nave_jugador()",
        highlightToken: "PROCESS nave_jugador()",
      },
      {
        id: "input",
        humanPhrase: "\"se mueva con las flechas\"",
        meaning: "Lee el teclado o controles táctiles en cada instante",
        divPart: "IF (key(_right)) x += 5; END",
        highlightToken: "IF (key(",
      },
      {
        id: "loop",
        humanPhrase: "\"todo el tiempo\"",
        meaning: "Mantiene vivo al personaje 60 veces por segundo",
        divPart: "LOOP ... FRAME; END",
        highlightToken: "FRAME;",
      },
    ],
    divCode: `PROGRAM mi_nave;
BEGIN
  set_mode(m640x480);
  nave_jugador();
  LOOP FRAME; END
END

PROCESS nave_jugador()
BEGIN
  graph = 1; x = 320; y = 360;
  LOOP
    IF (key(_right)) x += 5; END
    IF (key(_left))  x -= 5; END
    IF (key(_up))    y -= 5; END
    IF (key(_down))  y += 5; END
    FRAME;
  END
END`,
  },
  {
    id: "coins",
    title: "Monedas y puntos",
    prompt: "Pon monedas doradas que sumen 10 puntos cuando el jugador las toque",
    summary: "Traduce la regla del juego en una variable global de puntos y una detección automática de choque.",
    mappings: [
      {
        id: "score",
        humanPhrase: "\"sumen 10 puntos\"",
        meaning: "Guarda un marcador visible para todo el juego",
        divPart: "GLOBAL puntos = 0;",
        highlightToken: "puntos",
      },
      {
        id: "coin",
        humanPhrase: "\"monedas doradas\"",
        meaning: "Crea un proceso moneda con su propio sprite",
        divPart: "PROCESS moneda(x, y)",
        highlightToken: "PROCESS moneda",
      },
      {
        id: "touch",
        humanPhrase: "\"cuando el jugador las toque\"",
        meaning: "Detecta si chocan y elimina la moneda recogida",
        divPart: "IF (collision(type jugador))",
        highlightToken: "collision(",
      },
    ],
    divCode: `PROGRAM cazador_monedas;
GLOBAL
  puntos = 0;
BEGIN
  set_mode(m640x480);
  write_int(0, 20, 20, 0, &puntos);
  moneda(220, 240);
  LOOP FRAME; END
END

PROCESS moneda(x, y)
BEGIN
  graph = 3;
  LOOP
    IF (collision(type jugador))
      puntos += 10;
      signal(id, s_kill);
    END
    FRAME;
  END
END`,
  },
  {
    id: "enemy",
    title: "Enemigo patrulla",
    prompt: "Agrega un enemigo que camine de lado a lado y rebote en los bordes",
    summary: "Convierte el movimiento automático en una velocidad propia que cambia de signo al llegar a la orilla.",
    mappings: [
      {
        id: "enemy_proc",
        humanPhrase: "\"un enemigo\"",
        meaning: "Define un proceso aparte que actúa por sí solo",
        divPart: "PROCESS enemigo_patrulla()",
        highlightToken: "PROCESS enemigo_patrulla",
      },
      {
        id: "walk",
        humanPhrase: "\"camine de lado a lado\"",
        meaning: "Suma una velocidad en cada fotograma",
        divPart: "x += vel;",
        highlightToken: "x += vel;",
      },
      {
        id: "bounce",
        humanPhrase: "\"rebote en los bordes\"",
        meaning: "Invierte la dirección cuando toca el límite",
        divPart: "IF (x > 600 || x < 40) vel = -vel; END",
        highlightToken: "vel = -vel;",
      },
    ],
    divCode: `PROCESS enemigo_patrulla()
PRIVATE
  vel = 3;
BEGIN
  graph = 2;
  x = 320;
  y = 140;
  LOOP
    x += vel;
    IF (x > 600 || x < 40)
      vel = -vel;
    END
    FRAME;
  END
END`,
  },
];

const SANDBOX_IDEAS = [
  "Nave espacial que dispara láseres",
  "Personaje que salta con gravedad",
  "Enemigo que persigue al jugador",
  "Juego de monedas con puntuación",
];

const CARDS = [
  { id: "hardware", short: "1. GPU / CPU", title: "Cómo funciona en tu equipo" },
  { id: "transform", short: "2. Prompt → DIV", title: "De texto a PROCESS DIV" },
  { id: "sandbox", short: "3. Pruébalo aquí", title: "Simulador instantáneo" },
  { id: "choose", short: "4. Tu dispositivo", title: "Qué modo elegir" },
] as const;

export const LocalAiOnboardingDeck: React.FC<LocalAiOnboardingDeckProps> = ({
  onOpenAiWithPrompt,
  onOpenAiSettings,
  onLoadCode,
  onOpenTutorial,
  onCloseParent,
}) => {
  const [cardIndex, setCardIndex] = useState(0);
  const [hardwareView, setHardwareView] = useState<HardwareOption>("cpu");
  const [selectedExampleId, setSelectedExampleId] = useState<string>(PROMPT_EXAMPLES[0].id);
  const [activeMappingId, setActiveMappingId] = useState<string>(PROMPT_EXAMPLES[0].mappings[0].id);

  const [sandboxPrompt, setSandboxPrompt] = useState<string>(SANDBOX_IDEAS[0]);
  const [sandboxRunPrompt, setSandboxRunPrompt] = useState<string>(SANDBOX_IDEAS[0]);
  const [sandboxVoiceAutoRun, setSandboxVoiceAutoRun] = useState<boolean>(true);

  const sandboxVoice = useVoiceDictation({
    defaultLang: "es-ES",
    onFinalTranscript: (spoken) => {
      const clean = spoken.trim();
      if (!clean) return;
      setSandboxPrompt(clean);
      if (sandboxVoiceAutoRun) {
        setSandboxRunPrompt(clean);
      }
    },
  });

  const [gpuStatus, setGpuStatus] = useState<{
    checked: boolean;
    hasWebGpu: boolean;
    adapterName?: string;
  }>({ checked: false, hasWebGpu: false });

  useEffect(() => {
    let mounted = true;
    getGpuInfo()
      .then((info) => {
        if (!mounted) return;
        setGpuStatus({
          checked: true,
          hasWebGpu: info.hasWebGpu,
          adapterName: info.adapterName,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setGpuStatus({ checked: true, hasWebGpu: false });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const currentExample = useMemo(
    () => PROMPT_EXAMPLES.find((e) => e.id === selectedExampleId) || PROMPT_EXAMPLES[0],
    [selectedExampleId]
  );

  const activeMapping = useMemo(
    () =>
      currentExample.mappings.find((m) => m.id === activeMappingId) ||
      currentExample.mappings[0],
    [currentExample, activeMappingId]
  );

  const sandboxResult = useMemo(
    () => generatePrecodeNeuralCode(sandboxRunPrompt, ""),
    [sandboxRunPrompt]
  );

  const currentCard = CARDS[cardIndex];

  return (
    <div className="space-y-4">
      {/* Top Interactive Card Selector */}
      <div className="rounded-2xl bg-[#FDF2F5] border border-[#F3D0DC] p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-[#7C2D48]">
              IA Local sin Nube ni Suscripciones · Tarjeta {cardIndex + 1} de {CARDS.length}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#111827] mt-0.5">
              {currentCard.title}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {onOpenTutorial && (
              <button
                type="button"
                onClick={() => {
                  onCloseParent?.();
                  onOpenTutorial();
                }}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#EEF6F1] hover:bg-[#E2EFE8] border border-[#CFE4D7] text-xs font-semibold text-[#2F6F4E] cursor-pointer"
              >
                Tutorial completo (5 pasos)
              </button>
            )}
            <button
              type="button"
              onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
              disabled={cardIndex === 0}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#374151] disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setCardIndex((i) => Math.min(CARDS.length - 1, i + 1))}
              disabled={cardIndex === CARDS.length - 1}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >
              Siguiente
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {CARDS.map((card, idx) => {
            const active = idx === cardIndex;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setCardIndex(idx)}
                className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer truncate ${
                  active
                    ? "bg-[#7C2D48] text-white shadow-xs"
                    : "bg-white text-[#4B5563] border border-[#E2E8F0] hover:text-[#111827]"
                }`}
              >
                {card.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* TARJETA 1: CÓMO FUNCIONA EN TU CPU O GPU LOCAL                      */}
      {/* =================================================================== */}
      {currentCard.id === "hardware" && (
        <div className="space-y-3.5">
          <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
            A diferencia de otras herramientas que envían tus ideas a servidores externos de pago, <strong>WXDIV 3.0</strong> ejecuta la inteligencia dentro de tu propio teléfono o computadora. Toca un motor abajo para ver cómo viaja tu idea:
          </p>

          {/* CPU vs GPU Interactive Switch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setHardwareView("cpu")}
              className={`min-h-[68px] p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                hardwareView === "cpu"
                  ? "bg-[#EEF6F1] border-[#2F6F4E] ring-1 ring-[#2F6F4E]/25"
                  : "bg-[#F7F8FA] border-[#E2E8F0] hover:bg-white"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  hardwareView === "cpu"
                    ? "bg-[#2F6F4E] text-white"
                    : "bg-white border border-[#E2E8F0] text-[#2F6F4E]"
                }`}
              >
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#111827]">
                  Motor 1 · Procesador (CPU)
                </div>
                <div className="text-[11px] text-[#2F6F4E] font-semibold mt-0.5">
                  Red Neural Precódigo · 0 MB · Instantáneo
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setHardwareView("gpu")}
              className={`min-h-[68px] p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                hardwareView === "gpu"
                  ? "bg-[#FDF2F5] border-[#7C2D48] ring-1 ring-[#7C2D48]/25"
                  : "bg-[#F7F8FA] border-[#E2E8F0] hover:bg-white"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  hardwareView === "gpu"
                    ? "bg-[#7C2D48] text-white"
                    : "bg-white border border-[#E2E8F0] text-[#7C2D48]"
                }`}
              >
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#111827]">
                  Motor 2 · Tarjeta Gráfica (GPU)
                </div>
                <div className="text-[11px] text-[#7C2D48] font-semibold mt-0.5">
                  WebLLM Local · Chat libre 100% privado
                </div>
              </div>
            </button>
          </div>

          {/* Interactive 3-Step Visual Pipeline */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F7F8FA] p-4 space-y-3">
            <div className="text-xs font-bold text-[#111827]">
              Recorrido dentro de tu dispositivo ({hardwareView === "cpu" ? "Modo CPU" : "Modo GPU WebGPU"})
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1">
                <div className="text-[11px] font-bold text-[#6B7280]">1. Tú escribes</div>
                <div className="text-xs font-semibold text-[#111827]">
                  &ldquo;Haz una nave que dispare con Espacio&rdquo;
                </div>
                <p className="text-[11px] text-[#4B5563]">
                  En español cotidiano, sin saber ningún comando.
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  hardwareView === "cpu"
                    ? "bg-[#EEF6F1] border-[#BCE3CE]"
                    : "bg-[#FDF2F5] border-[#F3D0DC]"
                }`}
              >
                <div
                  className={`text-[11px] font-bold ${
                    hardwareView === "cpu" ? "text-[#2F6F4E]" : "text-[#7C2D48]"
                  }`}
                >
                  2. {hardwareView === "cpu" ? "Tu CPU ensambla piezas" : "Tu GPU calcula el modelo"}
                </div>
                <div className="text-xs font-semibold text-[#111827]">
                  {hardwareView === "cpu"
                    ? "Detecta nave + disparo + sonido"
                    : "SmolLM2 / Llama piensa en tu tarjeta gráfica"}
                </div>
                <p className="text-[11px] text-[#374151]">
                  {hardwareView === "cpu"
                    ? "Sin descargar archivos pesados y sin internet."
                    : "Usa WebGPU de tu navegador; tus datos no salen de casa."}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0F172A] text-slate-100 space-y-1">
                <div className="text-[11px] font-bold text-emerald-400">3. Código DIV listo</div>
                <pre className="text-[11px] font-mono text-slate-200 leading-snug overflow-x-auto">
{`PROCESS disparo(x, y)
BEGIN
  y -= 10; FRAME;
END`}
                </pre>
              </div>
            </div>

            {/* Clean Unboxed Key Attributes */}
            <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#374151]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2F6F4E] flex-shrink-0" />
                <span><strong>Privacidad:</strong> Sin nube externa</span>
              </div>
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                <span>
                  <strong>Conexión:</strong> {hardwareView === "cpu" ? "100% offline siempre" : "Offline tras 1ª descarga"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                <span>
                  <strong>Peso:</strong> {hardwareView === "cpu" ? "0 MB adicionales" : "135M – 1B en caché local"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TARJETA 2: EJEMPLO VISUAL DE PROMPT → PROCESS DIV                   */}
      {/* =================================================================== */}
      {currentCard.id === "transform" && (
        <div className="space-y-3.5">
          <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
            Elige una frase de ejemplo y toca cualquiera de las partes resaltadas para ver cómo la IA convierte palabras normales en un <strong>PROCESS</strong> (un personaje o regla viva del juego):
          </p>

          {/* Example Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {PROMPT_EXAMPLES.map((ex) => {
              const active = ex.id === currentExample.id;
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    setSelectedExampleId(ex.id);
                    setActiveMappingId(ex.mappings[0].id);
                  }}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? "bg-[#7C2D48] text-white"
                      : "bg-[#F7F8FA] text-[#374151] border border-[#E2E8F0] hover:bg-white"
                  }`}
                >
                  {ex.title}
                </button>
              );
            })}
          </div>

          {/* Prompt Banner */}
          <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1">
            <div className="text-[11px] font-bold text-[#7C2D48] uppercase tracking-wider">
              Lo que tú le pides a la IA
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#111827]">
              &ldquo;{currentExample.prompt}&rdquo;
            </div>
            <p className="text-xs text-[#4B5563]">{currentExample.summary}</p>
          </div>

          {/* Interactive Mapping Rows + Highlighted Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#111827]">
                Toca una frase para ver su código DIV:
              </div>
              {currentExample.mappings.map((m) => {
                const selected = m.id === activeMapping.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveMappingId(m.id)}
                    className={`w-full min-h-[60px] p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                      selected
                        ? "bg-[#FDF2F5] border-[#7C2D48]"
                        : "bg-white border-[#E2E8F0] hover:bg-[#F7F8FA]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#7C2D48]">{m.humanPhrase}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#7C2D48] flex-shrink-0" />
                    </div>
                    <div className="text-[11px] text-[#4B5563]">{m.meaning}</div>
                    <code className="block text-[11px] font-mono font-semibold text-[#2F6F4E]">
                      {m.divPart}
                    </code>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-[#E2E8F0] overflow-hidden flex flex-col bg-[#0F172A]">
              <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-200 truncate">
                  Código DIV generado · Resaltando: <strong className="text-emerald-400">{activeMapping.divPart}</strong>
                </span>
              </div>
              <pre className="p-3.5 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed flex-1">
                {currentExample.divCode.split("\n").map((line, i) => {
                  const isMatch = line.includes(activeMapping.highlightToken);
                  return (
                    <div
                      key={i}
                      className={`px-1.5 -mx-1.5 rounded ${
                        isMatch ? "bg-[#7C2D48]/55 text-white font-semibold" : ""
                      }`}
                    >
                      {line || " "}
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {onLoadCode && (
              <button
                type="button"
                onClick={() => {
                  onCloseParent?.();
                  onLoadCode(currentExample.divCode, true);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Cargar este ejemplo y Probar</span>
              </button>
            )}
            {onOpenAiWithPrompt && (
              <button
                type="button"
                onClick={() => {
                  onCloseParent?.();
                  onOpenAiWithPrompt(currentExample.prompt);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#7C2D48] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Pedírselo a AURA IA</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TARJETA 3: SIMULADOR EN VIVO CON LA RED NEURAL CPU REAL             */}
      {/* =================================================================== */}
      {currentCard.id === "sandbox" && (
        <div className="space-y-3.5">
          <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
            Pruébalo aquí mismo: escribe una idea corta en español o toca un botón y mira cómo el motor local en tu <strong>CPU</strong> arma los procesos DIV al instante:
          </p>

          <VoiceListeningBanner
            isListening={sandboxVoice.isListening}
            interimTranscript={sandboxVoice.interimTranscript}
            error={sandboxVoice.error}
            lang={sandboxVoice.lang}
            autoExecute={sandboxVoiceAutoRun}
            onChangeLang={sandboxVoice.setLang}
            onToggleAutoExecute={() => setSandboxVoiceAutoRun((v) => !v)}
            onFinishAndSend={() => sandboxVoice.stopListening(false)}
            onCancel={() => sandboxVoice.stopListening(true)}
            onDismissError={sandboxVoice.clearError}
            variant="light"
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-stretch gap-2 flex-1">
              <VoiceMicButton
                isSupported={sandboxVoice.isSupported}
                isListening={sandboxVoice.isListening}
                onToggle={sandboxVoice.toggleListening}
                variant="light"
              />
              <input
                type="text"
                value={sandboxPrompt}
                onChange={(e) => setSandboxPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && sandboxPrompt.trim()) {
                    setSandboxRunPrompt(sandboxPrompt.trim());
                  }
                }}
                placeholder="Escribe o dicta: Un juego de naves con estrellas..."
                className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] focus:border-[#7C2D48] focus:outline-none text-xs sm:text-sm text-[#111827] placeholder-[#6B7280]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (sandboxPrompt.trim()) setSandboxRunPrompt(sandboxPrompt.trim());
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              <Zap className="w-4 h-4" />
              <span>Transformar en CPU</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {SANDBOX_IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => {
                  setSandboxPrompt(idea);
                  setSandboxRunPrompt(idea);
                }}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors cursor-pointer ${
                  sandboxRunPrompt === idea
                    ? "bg-[#FDF2F5] border-[#7C2D48] text-[#7C2D48]"
                    : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563] hover:text-[#111827]"
                }`}
              >
                {idea}
              </button>
            ))}
          </div>

          {/* Live CPU Synthesis Output */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#2F6F4E] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  Motor CPU detectó {sandboxResult.matchedBlocks.length} bloque{sandboxResult.matchedBlocks.length === 1 ? "" : "s"}
                </span>
              </span>
              <span className="text-[11px] text-[#6B7280]">
                {sandboxResult.matchedBlocks.map((b) => b.name).join(" · ") || "Estructura base DIV"}
              </span>
            </div>

            <pre className="p-3 rounded-xl bg-[#0F172A] text-slate-100 font-mono text-[11px] max-h-48 overflow-auto leading-relaxed">
              {sandboxResult.code}
            </pre>

            <div className="flex flex-col sm:flex-row gap-2">
              {onLoadCode && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseParent?.();
                    onLoadCode(sandboxResult.code, true);
                  }}
                  className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Cargar y Probar este resultado</span>
                </button>
              )}
              {onOpenAiWithPrompt && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseParent?.();
                    onOpenAiWithPrompt(sandboxRunPrompt);
                  }}
                  className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#7C2D48] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Continuar editando en AURA IA</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TARJETA 4: DIAGNÓSTICO REAL DE TU EQUIPO Y SIGUIENTE PASO           */}
      {/* =================================================================== */}
      {currentCard.id === "choose" && (
        <div className="space-y-3.5">
          {/* Live Hardware Capability Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              gpuStatus.hasWebGpu
                ? "bg-[#EEF6F1] border-[#BCE3CE]"
                : "bg-[#F7F8FA] border-[#E2E8F0]"
            }`}
          >
            <Cpu
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                gpuStatus.hasWebGpu ? "text-[#2F6F4E]" : "text-[#7C2D48]"
              }`}
            />
            <div className="text-xs space-y-0.5">
              <div className="font-bold text-[#111827]">
                {!gpuStatus.checked
                  ? "Comprobando capacidades de tu equipo..."
                  : gpuStatus.hasWebGpu
                    ? `Tu dispositivo admite WebGPU (${gpuStatus.adapterName || "GPU lista"})`
                    : "Tu dispositivo funcionará mejor en Modo CPU Precódigo"}
              </div>
              <p className="text-[#4B5563] leading-relaxed">
                {gpuStatus.hasWebGpu
                  ? "Puedes elegir tanto la Red Neural CPU instantánea (0 MB) como modelos WebLLM acelerados por tu tarjeta gráfica."
                  : "Este navegador no expone WebGPU ahora mismo, así que la Red Neural en CPU te dará respuestas instantáneas y sin descargas."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] space-y-1.5">
              <div className="text-xs font-bold text-[#2F6F4E] flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                <span>Cuándo usar Modo CPU</span>
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Ideal en celulares o si quieres resultados al instante para mover personajes, disparos, plataformas, menús o tiendas web sin descargar modelos pesados.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] space-y-1.5">
              <div className="text-xs font-bold text-[#7C2D48] flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                <span>Cuándo usar Modo GPU (WebLLM)</span>
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Ideal en PCs con WebGPU para pedir explicaciones conversacionales o ideas muy personalizadas usando modelos como <strong>SmolLM2</strong> o <strong>Llama 3.2 1B</strong> en local.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FDF2F5] border border-[#F3D0DC] text-xs text-[#374151] flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-[#7C2D48] flex-shrink-0 mt-0.5" />
            <span>
              <strong>Consejo:</strong> Siempre puedes cambiar entre modo CPU instantáneo y modo GPU desde <strong>Ajustes de IA</strong> sin perder nada de tu proyecto.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            {onOpenAiSettings && (
              <button
                type="button"
                onClick={() => {
                  onCloseParent?.();
                  onOpenAiSettings();
                }}
                className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#111827] border border-[#E2E8F0] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-[#7C2D48]" />
                <span>Elegir CPU o GPU en Ajustes</span>
              </button>
            )}
            {onOpenAiWithPrompt && (
              <button
                type="button"
                onClick={() => {
                  onCloseParent?.();
                  onOpenAiWithPrompt();
                }}
                className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Abrir AURA IA ahora</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface LocalAiOnboardingModalProps extends LocalAiOnboardingDeckProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalAiOnboardingModal: React.FC<LocalAiOnboardingModalProps> = ({
  isOpen,
  onClose,
  ...deckProps
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="local-ai-onboarding-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl h-[92dvh] sm:h-auto max-h-[92dvh] bg-white rounded-t-2xl sm:rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-white flex-shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="px-4 sm:px-6 py-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7C2D48] text-white flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="local-ai-onboarding-title"
                className="text-sm sm:text-base font-bold text-[#111827] truncate"
              >
                Cómo funciona la IA Local (GPU / CPU)
              </h2>
              <p className="text-[11px] sm:text-xs text-[#6B7280] truncate">
                Tarjetas interactivas para crear sin saber programar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-xl hover:bg-slate-100 text-[#4B5563] flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label="Cerrar onboarding de IA local"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-white">
          <LocalAiOnboardingDeck {...deckProps} onCloseParent={onClose} />
        </div>

        <div className="px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#F7F8FA] border-t border-[#E2E8F0] flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-[#111827] cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
