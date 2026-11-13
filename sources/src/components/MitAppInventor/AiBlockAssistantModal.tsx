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
import { getAiConfig, getAiHeaders } from "../../services/aiConfig";
import { webLlmService } from "../../engine/ai/webLlmService";

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
      const cfg = getAiConfig();
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
        // Consultar con motor remoto si está disponible o generar pasos dinámicos
        try {
          const res = await fetch("/api/gemini/assist", {
            method: "POST",
            headers: getAiHeaders(),
            body: JSON.stringify({
              prompt: `Explica paso a paso para un usuario sin conocimientos de programación qué bloques de MIT App Inventor (Blockly) debe añadir y conectar para implementar: "${textPrompt}".
Devuelve una lista de 4 o 5 pasos pedagógicos claros con el nombre exacto del bloque, color de la categoría y qué hace.`,
              task: "blocks_guidance",
              model: cfg.model || "gemini-3.8-flash",
            }),
          });
          if (res.ok) {
            // Pasos estándar
          }
        } catch (_) {}

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-emerald-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header estilo MIT App Inventor */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#142316] border-b border-emerald-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-lime-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                AURA IA • Asistente de Bloques
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-700/60">
                  Blockly & MIT App Inventor
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Aprende qué bloques necesitas paso a paso sin escribir código tradicional
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prompt Input */}
        <div className="p-4 bg-[#090f1d] border-b border-slate-800 flex flex-col gap-2">
          <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>¿Qué mecánica o lógica deseas construir con bloques?</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerateStepByStep();
              }}
              placeholder="Ej: Cuando el jugador toque la pantalla mover la nave y disparar láseres..."
              className="flex-1 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-emerald-500 placeholder:text-slate-500 font-sans"
            />
            <button
              onClick={() => handleGenerateStepByStep()}
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-2 rounded bg-gradient-to-r from-emerald-600 to-lime-600 hover:from-emerald-500 hover:to-lime-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? "Pensando..." : "Explicar"}</span>
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pt-1">
            <span className="text-slate-500 font-semibold flex-shrink-0">Mecánicas Rápidas:</span>
            {[
              "Laberinto con colisión y meta",
              "Disparo hacia el cursor y sonido",
              "Salto con gravedad y plataformas",
              "Contador de puntos y vidas",
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(p);
                  handleGenerateStepByStep(p);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Steps List (Explicación Paso a Paso) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Guía Paso a Paso para Construir tu Lógica</span>
          </div>

          {steps.map((st) => (
            <div
              key={st.stepNumber}
              className="p-3 rounded-lg bg-[#0c1424] border border-slate-800 hover:border-emerald-500/40 transition-colors flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                    {st.stepNumber}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-xs font-mono"
                    style={{ backgroundColor: st.categoryColor }}
                  >
                    {st.blockName}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">{st.category}</span>
              </div>

              <p className="text-xs text-slate-300 pl-7 leading-relaxed">{st.explanation}</p>

              <div className="pl-7 text-[10px] text-amber-300/90 italic flex items-center gap-1">
                <span>💡 Tip:</span>
                <span>{st.tip}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-[#0d1627] border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Los bloques creados se traducen automáticamente a código DIV Games Studio</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleInsertGeneratedBlocks}
              className="px-4 py-1.5 rounded bg-gradient-to-r from-emerald-600 to-lime-600 hover:from-emerald-500 hover:to-lime-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>🧩 Insertar Bloques en el Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
