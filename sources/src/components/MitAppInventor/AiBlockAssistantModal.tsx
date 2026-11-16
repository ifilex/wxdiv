import React, { useState } from "react";
import {
  Sparkles,
  Layers,
  CheckCircle2,
  ArrowRight,
  Plus,
  Play,
  X,
  HelpCircle,
  Lightbulb,
  Cpu,
  Globe,
  Zap,
} from "lucide-react";
import { BlockInstance } from "./types";

interface AiBlockAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBlocks: (newBlocks: BlockInstance[]) => void;
  currentBlocksCount: number;
}

interface StepGuidance {
  stepNumber: number;
  blockName: string;
  category: string;
  categoryColor: string;
  explanation: string;
  tip: string;
}

export const AiBlockAssistantModal: React.FC<AiBlockAssistantModalProps> = ({
  isOpen,
  onClose,
  onAddBlocks,
  currentBlocksCount,
}) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [steps, setSteps] = useState<StepGuidance[]>([
    {
      stepNumber: 1,
      blockName: "when Canvas1.TouchDown (x, y)",
      category: "Eventos",
      categoryColor: "#caa128",
      explanation: "Este bloque se activa inmediatamente cuando el jugador toca la pantalla con su dedo o hace clic con el ratón. Te entrega las coordenadas exactas (x, y) donde tocó.",
      tip: "Arrástralo desde la lista izquierda: Screen1 > Canvas1.",
    },
    {
      stepNumber: 2,
      blockName: "if get x > Player1.X then",
      category: "Control",
      categoryColor: "#e59b20",
      explanation: "Comprueba si la posición donde tocó el jugador está a la derecha del personaje para decidir si debe moverse a la derecha o a la izquierda.",
      tip: "Lo encuentras en la sección dorada 'Control' de Built-in.",
    },
    {
      stepNumber: 3,
      blockName: "call Player1.MoveTo (x, y)",
      category: "Procedimientos",
      categoryColor: "#7b3da1",
      explanation: "Mueve al personaje sumando o restando el paso de velocidad a sus coordenadas actuales.",
      tip: "Está en la lista verde de Player1.",
    },
    {
      stepNumber: 4,
      blockName: "when Player1.CollidedWith (other)",
      category: "Colisiones",
      categoryColor: "#caa128",
      explanation: "Detecta automáticamente cuando el sprite del jugador choca con una pared o con la bandera de salida (Exit) del laberinto.",
      tip: "Puedes conectar adentro un bloque 'call Sound1.Play' para emitir sonido.",
    },
  ]);

  if (!isOpen) return null;

  const handleGenerateStepByStep = async (presetPrompt?: string) => {
    const textPrompt = presetPrompt || prompt;
    if (!textPrompt.trim()) return;

    setIsGenerating(true);

    try {
      const p = textPrompt.toLowerCase();

      // Generar pasos personalizados adaptados a la mecánica solicitada
      let customSteps: StepGuidance[] = [];

      if (p.includes("dispar") || p.includes("arma") || p.includes("laser") || p.includes("shot")) {
        customSteps = [
          {
            stepNumber: 1,
            blockName: "when Screen1.KeyDown (key)",
            category: "Eventos",
            categoryColor: "#caa128",
            explanation: "Detecta cuando el usuario presiona la tecla de disparo (como la barra espaciadora o botón táctil).",
            tip: "Encuéntralo en Screen1 > Eventos.",
          },
          {
            stepNumber: 2,
            blockName: "if get key = _space then",
            category: "Control",
            categoryColor: "#e59b20",
            explanation: "Evalúa si la tecla presionada es la barra de espacio para autorizar el disparo.",
            tip: "Arrástralo desde Built-in > Control.",
          },
          {
            stepNumber: 3,
            blockName: "call Bullet1.MoveTo (Player1.X, Player1.Y - 20)",
            category: "Procedimientos",
            categoryColor: "#7b3da1",
            explanation: "Posiciona la bala exactamente donde está el jugador en ese instante y la lanza hacia adelante.",
            tip: "Está en la lista morada de Bullet1.",
          },
          {
            stepNumber: 4,
            blockName: "call Sound1.Play",
            category: "Audio",
            categoryColor: "#c44078",
            explanation: "Reproduce el sonido del disparo láser.",
            tip: "Configura el archivo láser en la propiedad Source de Sound1.",
          },
        ];
      } else if (p.includes("salt") || p.includes("jump") || p.includes("gravedad") || p.includes("plataform")) {
        customSteps = [
          {
            stepNumber: 1,
            blockName: "when ButtonJump.Click",
            category: "Eventos",
            categoryColor: "#caa128",
            explanation: "Se activa en cuanto el jugador pulsa el botón de salto en la pantalla táctil.",
            tip: "Encuéntralo en ButtonJump en la paleta de componentes.",
          },
          {
            stepNumber: 2,
            blockName: "if get Player1.OnGround = true then",
            category: "Control",
            categoryColor: "#e59b20",
            explanation: "Evita el salto infinito en el aire verificando que el personaje esté tocando el suelo o plataforma.",
            tip: "Sección Built-in > Control > If.",
          },
          {
            stepNumber: 3,
            blockName: "set Player1.VelocityY to -12",
            category: "Variables",
            categoryColor: "#e54820",
            explanation: "Aplica un impulso vertical hacia arriba que luego la gravedad irá reduciendo fotograma a fotograma.",
            tip: "Usa el bloque rojo 'set' de Player1.",
          },
          {
            stepNumber: 4,
            blockName: "call Clock1.Timer",
            category: "Físicas",
            categoryColor: "#22a06b",
            explanation: "Bucle de 60 FPS donde sumas +1 de gravedad a VelocityY hasta colisionar con el suelo.",
            tip: "Activa TimerEnabled = True en el temporizador Clock1.",
          },
        ];
      } else if (p.includes("punto") || p.includes("vida") || p.includes("score") || p.includes("moneda")) {
        customSteps = [
          {
            stepNumber: 1,
            blockName: "when Player1.CollidedWith (other)",
            category: "Colisiones",
            categoryColor: "#caa128",
            explanation: "Detecta cuando el avatar del jugador toca cualquier moneda, gema o enemigo.",
            tip: "Bloque de evento principal en Player1.",
          },
          {
            stepNumber: 2,
            blockName: "if other = Coin1 then",
            category: "Control",
            categoryColor: "#e59b20",
            explanation: "Verifica si el objeto tocado es una moneda coleccionable.",
            tip: "Usa la comparación 'equals' de Logic.",
          },
          {
            stepNumber: 3,
            blockName: "set global Score to get global Score + 100",
            category: "Variables",
            categoryColor: "#e54820",
            explanation: "Incrementa el contador de puntuación almacenado en la variable global del juego.",
            tip: "Usa Built-in > Variables > set global.",
          },
          {
            stepNumber: 4,
            blockName: "set LabelScore.Text to get global Score",
            category: "Interfaz",
            categoryColor: "#397249",
            explanation: "Actualiza el texto en pantalla para que el jugador vea su nuevo puntaje inmediatamente.",
            tip: "Lista verde de LabelScore.",
          },
        ];
      } else {
        customSteps = [
          {
            stepNumber: 1,
            blockName: `when Screen1.GameLoop do`,
            category: "Eventos",
            categoryColor: "#caa128",
            explanation: `Inicia el ciclo principal del juego para evaluar constantemente las acciones de "${textPrompt}".`,
            tip: "Pega este bloque en un lugar despejado del lienzo.",
          },
          {
            stepNumber: 2,
            blockName: `if call key(_space) then`,
            category: "Control",
            categoryColor: "#e59b20",
            explanation: "Verifica si el usuario presiona la tecla o botón de acción configurado.",
            tip: "Encuéntralo en Built-in > Control.",
          },
          {
            stepNumber: 3,
            blockName: `call ${textPrompt.slice(0, 15).replace(/\s+/g, "_")}_action`,
            category: "Métodos",
            categoryColor: "#7b3da1",
            explanation: "Ejecuta la animación, desplazamiento o disparo correspondiente.",
            tip: "Conéctalo dentro de la boca 'then' del bloque IF.",
          },
          {
            stepNumber: 4,
            blockName: "call Sound1.Play",
            category: "Audio",
            categoryColor: "#c44078",
            explanation: "Reproduce el efecto de sonido de retroalimentación inmediata.",
            tip: "Selecciona el archivo de sonido desde el panel Media.",
          },
        ];
      }

      setSteps(customSteps);
    } catch (err) {
      console.warn("Fallo de API, usando generador local de pasos:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertGeneratedBlocks = () => {
    // Generar y posicionar un conjunto de bloques conectados listos en el canvas
    const startX = 220 + (currentBlocksCount % 3) * 60;
    const startY = 160 + (currentBlocksCount % 4) * 50;

    const newBlocks: BlockInstance[] = [
      {
        id: `ai_event_${Date.now()}`,
        type: "component_event",
        category: "ComponentEvent",
        shape: "hat",
        color: "#caa128",
        title: "when Canvas1 . TouchDown",
        subtitle: "x , y",
        x: startX,
        y: startY,
        componentName: "Canvas1",
        eventName: "TouchDown",
        inputs: [{ id: "do", name: "do", type: "statement", connectedBlockId: `ai_if_${Date.now()}` }],
        fields: {},
      },
      {
        id: `ai_if_${Date.now()}`,
        type: "control_if",
        category: "Control",
        shape: "c-block",
        color: "#e59b20",
        title: "if get x > Player1.X then",
        x: startX + 20,
        y: startY + 60,
        inputs: [{ id: "then", name: "then", type: "statement", connectedBlockId: `ai_move_${Date.now()}` }],
        fields: {},
      },
      {
        id: `ai_move_${Date.now()}`,
        type: "component_call",
        category: "ComponentCall",
        shape: "command",
        color: "#7b3da1",
        title: "call Player1 . MoveTo",
        x: startX + 40,
        y: startY + 120,
        componentName: "Player1",
        methodName: "MoveTo",
        inputs: [
          { id: "x", name: "x", type: "value", defaultValue: "Player1.X + 8" },
          { id: "y", name: "y", type: "value", defaultValue: "Player1.Y" }
        ],
        fields: {},
      },
    ];

    onAddBlocks(newBlocks);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl bg-white border border-[#E2E8F0] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90dvh] text-[#111827]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-white flex-shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-white border-b border-[#E2E8F0] flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7C2D48] flex items-center justify-center text-white flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#111827] truncate">
                AURA IA · Guía de Bloques
              </h2>
              <p className="text-xs text-[#6B7280] truncate">
                Aprende qué bloques necesitas paso a paso sin código
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-xl text-[#4B5563] hover:text-[#111827] hover:bg-slate-100 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
            aria-label="Cerrar asistente de bloques"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Input */}
        <div className="p-4 bg-[#F7F8FA] border-b border-[#E2E8F0] flex flex-col gap-2.5 flex-shrink-0">
          <label className="text-xs text-[#111827] font-semibold flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
            <span>¿Qué mecánica o lógica deseas construir con bloques?</span>
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerateStepByStep();
              }}
              placeholder="Ej: Al tocar la pantalla mover la nave y disparar..."
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#111827] text-xs sm:text-sm outline-none focus:border-[#7C2D48] placeholder:text-[#6B7280] font-sans"
            />
            <button
              type="button"
              onClick={() => handleGenerateStepByStep()}
              disabled={isGenerating || !prompt.trim()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 transition-colors cursor-pointer flex-shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? "Pensando..." : "Explicar paso a paso"}</span>
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-0.5">
            <span className="text-[#6B7280] font-semibold flex-shrink-0">Ideas:</span>
            {[
              "Laberinto con colisión y meta",
              "Disparo hacia el cursor y sonido",
              "Salto con gravedad y plataformas",
              "Contador de puntos y vidas",
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(p);
                  handleGenerateStepByStep(p);
                }}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white hover:bg-[#FDF2F5] text-[#374151] hover:text-[#7C2D48] border border-[#E2E8F0] whitespace-nowrap transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Steps List (Explicación Paso a Paso) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 font-sans bg-white">
          <div className="text-xs font-bold text-[#2F6F4E] uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            <span>Guía Paso a Paso para Construir tu Lógica</span>
          </div>

          {steps.map((st) => (
            <div
              key={st.stepNumber}
              className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] transition-colors flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-[#7C2D48] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
                    {st.stepNumber}
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-white font-mono truncate max-w-[200px] sm:max-w-none"
                    style={{ backgroundColor: st.categoryColor }}
                  >
                    {st.blockName}
                  </span>
                </div>
                <span className="text-[11px] text-[#6B7280] font-semibold">{st.category}</span>
              </div>

              <p className="text-xs text-[#374151] sm:pl-8 leading-relaxed">{st.explanation}</p>

              <div className="sm:pl-8 text-[11px] text-[#7C2D48] font-medium flex items-start gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{st.tip}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#F7F8FA] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#4B5563]">
            <CheckCircle2 className="w-4 h-4 text-[#2F6F4E] flex-shrink-0" />
            <span>Los bloques se traducen solos a código DIV</span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#374151] text-xs font-semibold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleInsertGeneratedBlocks}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Insertar Bloques en el Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
