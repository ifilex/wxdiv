import React, { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Smartphone,
  Blocks,
  Code2,
  Play,
  Wrench,
  LayoutGrid,
  CheckCircle2,
  Compass,
  FolderOpen,
  ArrowRight,
  BookOpen,
  Globe,
  Brain,
  ExternalLink,
  Box,
  Layers,
} from "lucide-react";
import { LocalAiOnboardingDeck } from "./LocalAiOnboardingDeck";

export const WELCOME_HIDE_STORAGE_KEY = "wxdiv_hide_welcome_v1";

export const BEGINNER_DIV_SAMPLE = `PROGRAM mi_primer_juego;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(18, 28, 48));
  write(0, 320, 42, 1, "MUEVE TU NAVE CON LAS FLECHAS");
  nave_jugador();
  LOOP
    FRAME;
  END
END

PROCESS nave_jugador()
BEGIN
  graph = 1;
  x = 320;
  y = 260;
  LOOP
    IF (key(_right)) x += 5; END
    IF (key(_left)) x -= 5; END
    IF (key(_up)) y -= 5; END
    IF (key(_down)) y += 5; END
    FRAME;
  END
END`;

interface WelcomeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: "mode8" | "design" | "logic" | "play" | "studio", options?: { designMode?: "mobile" | "form"; logicMode?: "blocks" | "code" }) => void;
  onOpenPresets: () => void;
  onOpenAiWithPrompt: (prompt?: string) => void;
  onOpenAiSettings: () => void;
  onLoadBeginnerCode: (code: string, runImmediately?: boolean) => void;
  onOpenWebWizard?: () => void;
  onOpenLexicon?: () => void;
  onOpenAiTutorial?: () => void;
  onOpenWinebox?: () => void;
  onOpenMode8Editor?: () => void;
}

const STEPS = [
  { id: "intro", label: "Inicio", short: "Inicio" },
  { id: "interface", label: "1. Interfaz", short: "Interfaz" },
  { id: "designer", label: "2. Apps Visuales", short: "Apps" },
  { id: "blocks", label: "3. Bloques", short: "Bloques" },
  { id: "div", label: "4. Lenguaje DIV", short: "Lenguaje" },
  { id: "local_ai", label: "5. IA Local", short: "IA Local" },
  { id: "editor3d", label: "6. Juegos 3D", short: "Juegos 3D" },
] as const;

const STARTER_AI_PROMPTS = [
  {
    title: "Juego fácil de nave y estrellas",
    description: "Crea un juego completo donde mueves una nave y sumas puntos.",
    prompt: "Crea un juego sencillo desde cero donde muevo una nave con las flechas o botones táctiles para recoger estrellas y sumar puntos.",
  },
  {
    title: "Juego de plataformas simple",
    description: "Personaje que salta sobre plataformas y recoge monedas.",
    prompt: "Haz un juego de plataformas fácil para principiantes con un personaje que salta, gravedad suave y monedas para recoger.",
  },
  {
    title: "App de contador / lista rápida",
    description: "Aplicación visual con botones grandes y textos claros.",
    prompt: "Crea una aplicación sencilla con botones grandes para llevar un contador de puntos o tareas diarias en pantalla.",
  },
  {
    title: "Página web de ventas / tienda",
    description: "Landing comercial con precios, beneficios, FAQ y formulario de pedido.",
    prompt: "Crea una página web de ventas para mi tienda con catálogo de precios, testimonios, FAQ y formulario de pedidos.",
  },
];

export const WelcomeGuideModal: React.FC<WelcomeGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenPresets,
  onOpenAiWithPrompt,
  onOpenAiSettings,
  onLoadBeginnerCode,
  onOpenWebWizard,
  onOpenLexicon,
  onOpenAiTutorial,
  onOpenWinebox,
  onOpenMode8Editor,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    try {
      return localStorage.getItem(WELCOME_HIDE_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  if (!isOpen) return null;

  const handleToggleDontShow = (checked: boolean) => {
    setDontShowAgain(checked);
    try {
      if (checked) {
        localStorage.setItem(WELCOME_HIDE_STORAGE_KEY, "true");
      } else {
        localStorage.removeItem(WELCOME_HIDE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage error
    }
  };

  const handleClose = () => {
    onClose();
  };

  const currentStep = STEPS[stepIndex];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-guide-title"
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-3xl h-[94dvh] sm:h-auto max-h-[94dvh] sm:max-h-[90dvh] bg-white rounded-t-2xl sm:rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Sheet Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-white flex-shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7C2D48] text-white flex items-center justify-center flex-shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="welcome-guide-title"
                className="text-sm sm:text-base font-bold text-[#111827] truncate"
              >
                Guía Paso a Paso · Tu Primer Juego o App
              </h2>
              <p className="text-[11px] sm:text-xs text-[#6B7280] truncate">
                Paso {stepIndex + 1} de {STEPS.length} · Explicado sin tecnicismos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-11 h-11 rounded-xl hover:bg-slate-100 text-[#4B5563] flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label="Cerrar guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Tabs */}
        <div className="px-3 sm:px-6 py-2 bg-[#F7F8FA] border-b border-[#E2E8F0] flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
          {STEPS.map((step, idx) => {
            const active = idx === stepIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setStepIndex(idx)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "bg-[#7C2D48] text-white shadow-2xs"
                    : "bg-white text-[#4B5563] border border-[#E2E8F0] hover:text-[#111827]"
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Step Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white">
          {/* STEP 0: INTRO */}
          {currentStep.id === "intro" && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-[#FDF2F5] border border-[#F3D0DC] p-4 sm:p-5 space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                  Compilador para Winebox Clinic y la Consola Cognitiva
                </h3>
                <p className="text-sm text-[#374151] leading-relaxed">
                  Este estudio se enlaza con la comunidad{" "}
                  <a
                    href="https://winebox.clinic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#7C2D48] underline hover:text-[#642239]"
                  >
                    winebox.clinic
                  </a>{" "}
                  y la consola cognitiva{" "}
                  <a
                    href="https://winebox.cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#2F6F4E] underline hover:text-[#25593E]"
                  >
                    winebox.cloud
                  </a>
                  . Está pensado para que <strong>profesionales sin conocimientos técnicos</strong> creen{" "}
                  <strong>apps y juegos de estimulación cognitiva</strong> o aplicativos para su profesión, y también para que{" "}
                  <strong>programadores</strong> desarrollen videojuegos fácil o profesionalmente.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href="https://winebox.clinic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-[#7C2D48] inline-flex items-center gap-1.5"
                  >
                    <span>Comunidad winebox.clinic</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://winebox.cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#EEF6F1] hover:bg-[#E2EFE8] border border-[#CFE4D7] text-xs font-semibold text-[#2F6F4E] inline-flex items-center gap-1.5"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Consola Cognitiva winebox.cloud</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {onOpenWinebox && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onOpenWinebox();
                      }}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Ver plantillas cognitivas</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Elige cómo te gustaría empezar hoy
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onNavigateTab("design", { designMode: "mobile" });
                    }}
                    className="p-4 rounded-2xl border border-[#E2E8F0] hover:border-[#7C2D48] bg-[#F7F8FA] hover:bg-[#FDF2F5]/50 text-left transition-all cursor-pointer flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] text-[#7C2D48] flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-bold text-[#111827]">
                        Camino A · App Visual
                      </div>
                      <p className="text-xs text-[#4B5563] leading-relaxed">
                        Coloca botones, textos y cuadros en una pantalla de teléfono sin código.
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-[#7C2D48] flex items-center gap-1">
                      <span>Ir al Diseñador Visual</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenWebWizard?.();
                    }}
                    className="p-4 rounded-2xl border border-[#E2E8F0] hover:border-[#7C2D48] bg-[#F7F8FA] hover:bg-[#FDF2F5]/50 text-left transition-all cursor-pointer flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] text-[#7C2D48] flex items-center justify-center">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-bold text-[#111827]">
                        Camino B · Página Web o Tienda
                      </div>
                      <p className="text-xs text-[#4B5563] leading-relaxed">
                        Asistente paso a paso para armar tu web de ventas, landing o servicios.
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-[#7C2D48] flex items-center gap-1">
                      <span>Abrir Asistente Web</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenAiWithPrompt(STARTER_AI_PROMPTS[0].prompt);
                    }}
                    className="p-4 rounded-2xl border border-[#E2E8F0] hover:border-[#2F6F4E] bg-[#F7F8FA] hover:bg-[#EEF6F1]/60 text-left transition-all cursor-pointer flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] text-[#2F6F4E] flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-bold text-[#111827]">
                        Camino C · Hablar con la IA
                      </div>
                      <p className="text-xs text-[#4B5563] leading-relaxed">
                        Pide en español qué juego o web quieres y la IA local lo construye por ti.
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-[#2F6F4E] flex items-center gap-1">
                      <span>Probar ejemplo con AURA IA</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      if (onOpenMode8Editor) {
                        onOpenMode8Editor();
                      } else {
                        onNavigateTab("mode8");
                      }
                    }}
                    className="p-4 rounded-2xl border border-[#E2E8F0] hover:border-[#7C2D48] bg-[#F7F8FA] hover:bg-[#FDF2F5]/50 text-left transition-all cursor-pointer flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] text-[#7C2D48] flex items-center justify-center">
                        <Box className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-bold text-[#111827]">
                        Camino D · Juegos 3D (Solo Editor)
                      </div>
                      <p className="text-xs text-[#4B5563] leading-relaxed">
                        Crea un juego entero editando solo el mapa 3D, sus menús y el entorno: desde pelea 3D hasta shooter, estilo Roblox o Fortnite.
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-[#7C2D48] flex items-center gap-1">
                      <span>Abrir Editor de Mapas 3D</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#111827]">
                    ¿Prefieres aprender paso a paso cómo funciona todo?
                  </div>
                  <p className="text-xs text-[#4B5563]">
                    Pulsa &ldquo;Siguiente&rdquo; abajo y en 6 pantallas rápidas entenderás cada parte.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStepIndex(1)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
                >
                  <span>Empezar recorrido</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: LA INTERFAZ */}
          {currentStep.id === "interface" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                  Paso 1 · Cómo moverte por la interfaz
                </h3>
                <p className="text-sm text-[#4B5563] mt-1">
                  Toda la aplicación se organiza en <strong>4 espacios sencillos</strong> (arriba en computadora o abajo en tu celular) y <strong>3 botones clave</strong> en la barra superior.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FDF2F5] text-[#7C2D48] flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827]">1. Diseñar</div>
                    <p className="text-xs text-[#4B5563] mt-0.5">
                      Aquí dibujas la pantalla de tu app o formulario poniendo botones, textos e imágenes.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FDF2F5] text-[#7C2D48] flex items-center justify-center flex-shrink-0">
                    <Blocks className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827]">2. Lógica</div>
                    <p className="text-xs text-[#4B5563] mt-0.5">
                      Decides qué pasa al tocar un botón o mover un personaje (con bloques visuales o código DIV).
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#EEF6F1] text-[#2F6F4E] flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827]">3. Probar</div>
                    <p className="text-xs text-[#4B5563] mt-0.5">
                      La pantalla en vivo donde juegas o usas tu app. En celular incluye controles táctiles automáticos.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FDF2F5] text-[#7C2D48] flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827]">4. 3D y Estudio</div>
                    <p className="text-xs text-[#4B5563] mt-0.5">
                      Editor <strong>3D sin programar</strong> (crea mapas, bloques y código automático con IA local), editor de sprites Pixel Art y sonidos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-2.5">
                <div className="text-xs font-bold text-[#111827]">
                  Los botones clave de la barra superior:
                </div>
                <ul className="space-y-2 text-xs text-[#374151]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#7C2D48] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Nombre del proyecto (arriba izquierda):</strong> Toca para abrir plantillas listas y ver cómo están hechas.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#7C2D48] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Botón Probar (arriba derecha):</strong> Enciende tu juego o app al instante en cualquier momento.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2F6F4E] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>AURA IA e Instalar App:</strong> Habla con el asistente local o instala WXDIV en tu celular Android, iPhone o PC.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenPresets();
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Ver Plantillas de ejemplo</span>
                </button>
                {onOpenLexicon && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenLexicon();
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#111827] border border-[#E2E8F0] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#7C2D48]" />
                    <span>Abrir Manual de Comandos DIV</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: APPS VISUALES */}
          {currentStep.id === "designer" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                  Paso 2 · Desarrollar Apps Visuales sin escribir código
                </h3>
                <p className="text-sm text-[#4B5563] mt-1">
                  En la pestaña <strong>Diseñar</strong> puedes elegir entre <strong>App Móvil</strong> (pantalla de teléfono) o <strong>Formulario</strong> (ventana clásica de escritorio).
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#7C2D48] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827]">
                      Agrega piezas a la pantalla
                    </div>
                    <p className="text-xs text-[#4B5563] mt-0.5">
                      En la paleta de componentes toca o arrastra elementos como <strong>Botón</strong>, <strong>Etiqueta de Texto</strong>, <strong>Campo para escribir</strong> o <strong>Lienzo de dibujo</strong> sobre el teléfono o formulario.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#7C2D48] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
                    2
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827]">
                      Cambia su texto, color y tamaño en Propiedades
                    </div>
                    <p className="text-xs text-[#4B5563] mt-0.5">
                      Toca cualquier botón que pusiste en la pantalla para editar lo que dice (ej. &ldquo;Calcular&rdquo; o &ldquo;Jugar&rdquo;), su color de fondo y tamaño.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#2F6F4E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
                    3
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111827]">
                      Dale vida en &ldquo;Lógica&rdquo; y pulsa &ldquo;Probar&rdquo;
                    </div>
                    <p className="text-xs text-[#4B5563] mt-0.5">
                      Cuando tu pantalla te guste, toca <strong>Editar Lógica</strong> para decidir qué ocurre al pulsar cada botón, y luego toca <strong>Probar</strong> arriba.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onNavigateTab("design", { designMode: "mobile" });
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Abrir Diseñador App Móvil</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onNavigateTab("design", { designMode: "form" });
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#111827] border border-[#E2E8F0] text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <LayoutGrid className="w-4 h-4 text-[#7C2D48]" />
                  <span>Abrir Diseñador de Formulario</span>
                </button>
                {onOpenWebWizard && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenWebWizard();
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Crear Página Web paso a paso</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SISTEMA DE BLOQUES */}
          {currentStep.id === "blocks" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                  Paso 3 · El Sistema de Bloques (como armar piezas encajables)
                </h3>
                <p className="text-sm text-[#4B5563] mt-1">
                  Si nunca has programado, los bloques son tu mejor amigo. No puedes cometer errores de escritura ni olvidar signos raros: las piezas solo encajan donde tienen sentido.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F7F8FA] p-4 space-y-3">
                <div className="text-xs font-bold text-[#111827]">
                  La regla de oro de los bloques: &ldquo;CUÁNDO&rdquo; + &ldquo;QUÉ HACER&rdquo;
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-amber-200">
                    <div className="text-xs font-bold text-amber-800">
                      1. Bloque de Evento (El &ldquo;Cuándo&rdquo;)
                    </div>
                    <p className="text-xs text-[#4B5563] mt-1">
                      Ejemplos: <em>&ldquo;Al iniciar la app&rdquo;</em>, <em>&ldquo;Al hacer clic en Botón1&rdquo;</em> o <em>&ldquo;En cada fotograma&rdquo;</em>.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-emerald-200">
                    <div className="text-xs font-bold text-emerald-800">
                      2. Bloques de Acción (El &ldquo;Qué hacer&rdquo;)
                    </div>
                    <p className="text-xs text-[#4B5563] mt-1">
                      Encajan dentro del evento. Ejemplos: <em>&ldquo;Cambiar texto&rdquo;</em>, <em>&ldquo;Sumar 1 a puntos&rdquo;</em> o <em>&ldquo;Mover 5 pasos&rdquo;</em>.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[#4B5563] leading-relaxed">
                  <strong>Conversión automática:</strong> Todo lo que armes en <strong>Lógica → Bloques Visuales</strong> se traduce solo al lenguaje DIV por detrás. Así puedes aprender mirando cómo se convierte en código real cuando sientas curiosidad.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onNavigateTab("logic", { logicMode: "blocks" });
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Blocks className="w-4 h-4" />
                <span>Abrir Bloques Visuales ahora</span>
              </button>
            </div>
          )}

          {/* STEP 4: LENGUAJE DIV EXPLICADO FACIL */}
          {currentStep.id === "div" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                  Paso 4 · El Lenguaje DIV explicado en español sencillo
                </h3>
                <p className="text-sm text-[#4B5563] mt-1">
                  DIV es famoso por ser uno de los lenguajes más fáciles del mundo para videojuegos. Solo necesitas conocer <strong>5 palabras clave</strong> para entender cualquier programa:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA]">
                  <code className="text-xs font-mono font-bold text-[#7C2D48]">PROGRAM nombre;</code>
                  <p className="text-xs text-[#4B5563] mt-1">
                    Es la <strong>portada</strong>. Solo dice cómo se llama tu juego o app.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA]">
                  <code className="text-xs font-mono font-bold text-[#7C2D48]">BEGIN ... END</code>
                  <p className="text-xs text-[#4B5563] mt-1">
                    Significan <strong>&ldquo;Aquí empieza&rdquo;</strong> y <strong>&ldquo;Aquí termina&rdquo;</strong> una receta de pasos.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA]">
                  <code className="text-xs font-mono font-bold text-[#7C2D48]">PROCESS jugador()</code>
                  <p className="text-xs text-[#4B5563] mt-1">
                    Crea un <strong>personaje independiente</strong> (una nave, una moneda, un enemigo). Cada uno tiene vida propia.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA]">
                  <code className="text-xs font-mono font-bold text-[#7C2D48]">x, y, graph</code>
                  <p className="text-xs text-[#4B5563] mt-1">
                    <strong>x</strong> es izquierda/derecha, <strong>y</strong> es arriba/abajo, y <strong>graph</strong> elige qué dibujo mostrar.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA]">
                <code className="text-xs font-mono font-bold text-[#2F6F4E]">LOOP ... FRAME; ... END</code>
                <p className="text-xs text-[#4B5563] mt-1">
                  Es el <strong>corazón del juego</strong>. Repite las instrucciones 60 veces por segundo; <code className="font-mono text-[#111827]">FRAME;</code> dibuja un instante en pantalla antes de pasar al siguiente, igual que los fotogramas de una película.
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-3.5 py-2 bg-[#F1F5F9] border-b border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827]">
                    Mini ejemplo real (listo para probar)
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-mono">24 líneas</span>
                </div>
                <pre className="p-3.5 bg-[#0F172A] text-slate-100 text-[11px] sm:text-xs font-mono overflow-x-auto leading-relaxed">
                  {BEGINNER_DIV_SAMPLE}
                </pre>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onLoadBeginnerCode(BEGINNER_DIV_SAMPLE, true);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Cargar este ejemplo y Probarlo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onLoadBeginnerCode(BEGINNER_DIV_SAMPLE, false);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#111827] border border-[#E2E8F0] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-[#7C2D48]" />
                  <span>Verlo en el Editor DIV</span>
                </button>
                {onOpenLexicon && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenLexicon();
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] border border-[#F3D0DC] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Ver todos los comandos DIV</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: IA EMBEBIDA LOCAL (GPU / CPU) - TARJETAS INTERACTIVAS */}
          {currentStep.id === "local_ai" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#EEF6F1] border border-[#CFE4D7] p-4 space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                  Paso 5 · IA Local sin Nube ni Pagos (GPU o CPU de tu PC)
                </h3>
                <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                  Explora estas tarjetas interactivas para entender en segundos cómo tu propio equipo convierte frases en español en procesos DIV reales, sin cuentas ni servidores externos:
                </p>
              </div>

              <LocalAiOnboardingDeck
                onOpenAiWithPrompt={onOpenAiWithPrompt}
                onOpenAiSettings={onOpenAiSettings}
                onLoadCode={onLoadBeginnerCode}
                onOpenTutorial={onOpenAiTutorial}
                onCloseParent={handleClose}
              />
            </div>
          )}

          {/* STEP 6: JUEGOS 3D USANDO SOLO EL EDITOR DE MAPAS */}
          {currentStep.id === "editor3d" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#FDF2F5] border border-[#F3D0DC] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-[#7C2D48] flex-shrink-0" />
                  <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                    Paso 6 · Haz Juegos 3D Completos usando Solo el Editor de Mapas
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                  No necesitas programar línea por línea para crear un juego 3D real. El <strong>Editor de Niveles 3D Modo 8</strong> funciona de manera muy similar a motores creativos como <strong>Roblox Studio</strong> o <strong>Fortnite Creative</strong>: construyes el mapa, configuras los menús y defines todo el entorno directamente en pantalla.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] space-y-1">
                  <div className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#7C2D48]" />
                    <span>1. Diseñas todo el entorno 3D</span>
                  </div>
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    Armas arenas, edificios, pasillos, escaleras, alturas de techo, iluminación, texturas y decorado con vóxeles o modelos 3D (MD2/MD3).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] space-y-1">
                  <div className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                    <LayoutGrid className="w-4 h-4 text-[#7C2D48]" />
                    <span>2. Creas los Menús y HUD propios</span>
                  </div>
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    En la pestaña <strong>Menús</strong> del editor defines título, estética, menú de pausa, selector de arma, dificultad, vida y puntuación, con vista previa en vivo.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] space-y-1">
                  <div className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#2F6F4E]" />
                    <span>3. De Pelea 3D a Shooter FPS</span>
                  </div>
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    El género depende de cómo diseñes el mapa y sus objetos: una arena abierta con espada 3D y enemigos cercanos crea un <strong>juego de pelea 3D</strong>; pasillos con coberturas, botiquines y armas de fuego crean un <strong>shooter</strong>, aventura o supervivencia.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] space-y-1">
                  <div className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                    <Play className="w-4 h-4 text-[#2F6F4E]" />
                    <span>4. Compila y juega al instante</span>
                  </div>
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    Cada cambio en el mapa y los menús genera automáticamente el proyecto completo listo para jugar en 3D o exportar como app.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    if (onOpenMode8Editor) {
                      onOpenMode8Editor();
                    } else {
                      onNavigateTab("mode8");
                    }
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Box className="w-4 h-4" />
                  <span>Abrir Editor de Mapas 3D ahora</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Controls */}
        <div className="px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#F7F8FA] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-shrink-0">
          <label className="flex items-center gap-2 text-xs text-[#4B5563] cursor-pointer select-none min-h-[36px]">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => handleToggleDontShow(e.target.checked)}
              className="w-4 h-4 rounded border-[#CBD5E1] accent-[#7C2D48] cursor-pointer"
            />
            <span>No mostrar automáticamente al iniciar</span>
          </label>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#374151] disabled:opacity-40 flex items-center gap-1 cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Empezar a crear</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
