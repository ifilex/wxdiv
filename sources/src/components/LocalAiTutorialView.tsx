import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Cpu,
  GraduationCap,
  Layers,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { generatePrecodeNeuralCode } from "../engine/ai/precodeEngine";
import { getGpuInfo } from "../engine/ai/webLlmService";
import { useVoiceDictation } from "../hooks/useVoiceDictation";
import { VoiceListeningBanner, VoiceMicButton } from "./VoiceDictationControls";

export interface LocalAiTutorialViewProps {
  onClose: () => void;
  onLoadCode?: (code: string, runImmediately?: boolean) => void;
  onOpenAiWithPrompt?: (prompt?: string) => void;
  onOpenAiSettings?: () => void;
}

type TokenRole = "actor" | "input" | "action" | "rule" | "filler";

interface AnnotatedToken {
  id: string;
  text: string;
  role: TokenRole;
  meaning: string;
  divTarget: string;
}

interface BlueprintNode {
  id: string;
  label: string;
  role: string;
  plainExplanation: string;
  highlightToken: string;
}

interface AssemblyStage {
  id: string;
  title: string;
  fromSpanish: string;
  explanation: string;
  lines: string[];
}

interface TutorialScenario {
  id: string;
  title: string;
  prompt: string;
  summary: string;
  tokens: AnnotatedToken[];
  cpuBlocksMatched: string[];
  gpuTokenStream: string[];
  blueprintNodes: BlueprintNode[];
  assemblyStages: AssemblyStage[];
  fullDivCode: string;
  errorDemoBrokenLine: string;
  errorDemoFixedLine: string;
  errorDemoReason: string;
}

const ROLE_META: Record<
  TokenRole,
  { label: string; bg: string; border: string; text: string }
> = {
  actor: {
    label: "Actor (PROCESS)",
    bg: "bg-[#FDF2F5]",
    border: "border-[#7C2D48]",
    text: "text-[#7C2D48]",
  },
  input: {
    label: "Control / Entrada",
    bg: "bg-[#EEF6F1]",
    border: "border-[#2F6F4E]",
    text: "text-[#2F6F4E]",
  },
  action: {
    label: "Acción / Sub-proceso",
    bg: "bg-[#EFF6FF]",
    border: "border-[#1D4ED8]",
    text: "text-[#1D4ED8]",
  },
  rule: {
    label: "Regla / Variable",
    bg: "bg-[#FEF3C7]",
    border: "border-[#B45309]",
    text: "text-[#92400E]",
  },
  filler: {
    label: "Conector de idioma",
    bg: "bg-[#F1F5F9]",
    border: "border-[#CBD5E1]",
    text: "text-[#64748B]",
  },
};

const SCENARIOS: TutorialScenario[] = [
  {
    id: "ship_laser",
    title: "Nave y disparos",
    prompt: "Crea una nave espacial que se mueva con las flechas y dispare láseres",
    summary:
      "Convierte una frase cotidiana en dos procesos independientes: la nave controlada por ti y cada láser que viaja hacia arriba.",
    tokens: [
      {
        id: "t1",
        text: "Crea",
        role: "filler",
        meaning: "Palabra de intención: indica al motor que iniciará un programa nuevo.",
        divTarget: "PROGRAM mi_nave;",
      },
      {
        id: "t2",
        text: "una nave espacial",
        role: "actor",
        meaning: "Personaje principal con su propio gráfico y posición (x, y).",
        divTarget: "PROCESS nave_jugador()",
      },
      {
        id: "t3",
        text: "que se mueva con las flechas",
        role: "input",
        meaning: "Lectura continua de teclado o cruceta táctil en cada fotograma.",
        divTarget: "IF (key(_right)) x += 5; END",
      },
      {
        id: "t4",
        text: "y",
        role: "filler",
        meaning: "Conector: une dos comportamientos dentro del mismo bucle.",
        divTarget: "LOOP ... END",
      },
      {
        id: "t5",
        text: "dispare láseres",
        role: "action",
        meaning: "Genera un proceso hijo independiente al pulsar Espacio o botón de disparo.",
        divTarget: "IF (key(_space)) disparo(x, y - 18); END",
      },
    ],
    cpuBlocksMatched: ["Modo Pantalla 640x480", "Movimiento 4 Direcciones", "Disparo Láser Vertical"],
    gpuTokenStream: [
      "PROGRAM",
      "mi_nave;",
      "BEGIN",
      "set_mode(m640x480);",
      "nave_jugador();",
      "PROCESS",
      "nave_jugador()",
      "IF (key(_space))",
      "disparo(x, y);",
      "FRAME;",
    ],
    blueprintNodes: [
      {
        id: "b1",
        label: "Director del Juego (PROGRAM)",
        role: "Configura la pantalla a 60 FPS e invoca los actores iniciales.",
        plainExplanation: "Sin PROGRAM, el motor no sabe en qué resolución arrancar ni qué proceso crear primero.",
        highlightToken: "set_mode(m640x480);",
      },
      {
        id: "b2",
        label: "Actor Principal (PROCESS nave_jugador)",
        role: "Objeto vivo que lee las flechas y responde cada fotograma.",
        plainExplanation: "Cada PROCESS tiene sus propias coordenadas x, y y corre en paralelo con los demás.",
        highlightToken: "PROCESS nave_jugador()",
      },
      {
        id: "b3",
        label: "Bucle de Vida (LOOP ... FRAME; END)",
        role: "Dibuja la nave 60 veces por segundo y espera al siguiente instante.",
        plainExplanation: "FRAME; le dice a DIV: 'ya terminé mi turno de este cuadro, dibújame y vuelve en el siguiente'.",
        highlightToken: "FRAME;",
      },
      {
        id: "b4",
        label: "Actor Hijo (PROCESS disparo)",
        role: "Cada láser es un proceso independiente que sube hasta salir de pantalla.",
        plainExplanation: "Al crear disparo(x, y), la nave sigue moviéndose libre mientras cada rayo vuela solo.",
        highlightToken: "PROCESS disparo(",
      },
    ],
    assemblyStages: [
      {
        id: "s1",
        title: "1. Cabecera y pantalla",
        fromSpanish: "\"Crea...\"",
        explanation: "Define el nombre del programa, la resolución 640×480 y 60 cuadros por segundo.",
        lines: [
          "PROGRAM mi_nave;",
          "BEGIN",
          "  set_mode(m640x480);",
          "  set_fps(60);",
          "  screen_color(rgb(12, 18, 34));",
          "  nave_jugador();",
          "  LOOP FRAME; END",
          "END",
        ],
      },
      {
        id: "s2",
        title: "2. Nacimiento del actor nave",
        fromSpanish: "\"una nave espacial\"",
        explanation: "Declara el PROCESS nave_jugador con su gráfico inicial y coordenadas en el centro inferior.",
        lines: [
          "",
          "PROCESS nave_jugador()",
          "BEGIN",
          "  graph = 1; x = 320; y = 390;",
        ],
      },
      {
        id: "s3",
        title: "3. Controles y disparo",
        fromSpanish: "\"mueva con las flechas y dispare láseres\"",
        explanation: "Dentro de LOOP revisa las teclas de flecha y crea un disparo al pulsar Espacio.",
        lines: [
          "  LOOP",
          "    IF (key(_right)) x += 5; END",
          "    IF (key(_left))  x -= 5; END",
          "    IF (key(_space)) disparo(x, y - 20); END",
          "    FRAME;",
          "  END",
          "END",
        ],
      },
      {
        id: "s4",
        title: "4. Proceso hijo del láser",
        fromSpanish: "\"láseres\"",
        explanation: "Cada disparo avanza hacia arriba (`y -= 10`) hasta desaparecer al salir por arriba.",
        lines: [
          "",
          "PROCESS disparo(x, y)",
          "BEGIN",
          "  graph = 2;",
          "  WHILE (y > -20)",
          "    y -= 10;",
          "    FRAME;",
          "  END",
          "END",
        ],
      },
    ],
    fullDivCode: `PROGRAM mi_nave;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(12, 18, 34));
  write(0, 320, 26, 1, "FLECHAS PARA MOVER · ESPACIO DISPARA");
  nave_jugador();
  LOOP
    FRAME;
  END
END

PROCESS nave_jugador()
PRIVATE
  cooldown = 0;
BEGIN
  graph = 1;
  x = 320;
  y = 390;
  LOOP
    IF (key(_right) AND x < 610) x += 5; END
    IF (key(_left)  AND x > 30)  x -= 5; END
    IF (key(_up)    AND y > 40)  y -= 5; END
    IF (key(_down)  AND y < 440) y += 5; END
    IF (cooldown > 0) cooldown--; END
    IF (key(_space) AND cooldown == 0)
      disparo(x, y - 20);
      cooldown = 10;
    END
    FRAME;
  END
END

PROCESS disparo(x, y)
BEGIN
  graph = 2;
  WHILE (y > -20)
    y -= 10;
    FRAME;
  END
END`,
    errorDemoBrokenLine: "    IF (key(_space)) disparo(x, y - 20)   // Falta ';' y 'END'",
    errorDemoFixedLine: "    IF (key(_space)) disparo(x, y - 20); END",
    errorDemoReason:
      "En DIV cada sentencia termina en ';' y todo bloque 'IF' cierra con 'END'. La Red Neural de Precódigo valida bloques cerrados antes de enviarlos al editor.",
  },
  {
    id: "coins_enemy",
    title: "Monedas y puntos",
    prompt: "Pon monedas doradas que sumen 10 puntos al tocarlas y un enemigo patrullando",
    summary:
      "Transforma reglas de puntuación y colisión en una variable GLOBAL compartida y detección automática collision(type ...).",
    tokens: [
      {
        id: "c1",
        text: "Pon",
        role: "filler",
        meaning: "Verbo de creación: solicita añadir nuevos objetos en escena.",
        divTarget: "moneda(160, 220);",
      },
      {
        id: "c2",
        text: "monedas doradas",
        role: "actor",
        meaning: "Crea un proceso reutilizable capaz de colocarse en varias posiciones.",
        divTarget: "PROCESS moneda(x, y)",
      },
      {
        id: "c3",
        text: "que sumen 10 puntos",
        role: "rule",
        meaning: "Declara una variable GLOBAL legible en pantalla durante toda la partida.",
        divTarget: "GLOBAL puntos = 0; ... puntos += 10;",
      },
      {
        id: "c4",
        text: "al tocarlas",
        role: "input",
        meaning: "Comprobación nativa de choque píxel/caja entre procesos.",
        divTarget: "IF (collision(type jugador))",
      },
      {
        id: "c5",
        text: "y un enemigo patrullando",
        role: "action",
        meaning: "Actor autónomo que rebota de izquierda a derecha.",
        divTarget: "PROCESS enemigo(x, y)",
      },
    ],
    cpuBlocksMatched: ["Marcador GLOBAL", "Coleccionable con Colisión", "Enemigo Patrulla"],
    gpuTokenStream: [
      "GLOBAL",
      "puntos = 0;",
      "write_int(...);",
      "PROCESS moneda(x, y)",
      "IF (collision(type jugador))",
      "puntos += 10;",
      "PROCESS enemigo(x, y)",
      "vx = -vx;",
    ],
    blueprintNodes: [
      {
        id: "cb1",
        label: "Memoria Compartida (GLOBAL puntos)",
        role: "Variable accesible tanto por el marcador como por todas las monedas.",
        plainExplanation: "Usar GLOBAL permite que cualquier moneda sume 10 al mismo marcador sin enredos.",
        highlightToken: "puntos",
      },
      {
        id: "cb2",
        label: "Actor Moneda (PROCESS moneda)",
        role: "Espera el contacto con el jugador, suma puntos y termina con break.",
        plainExplanation: "Puedes llamar a moneda(140, 200) diez veces y cada instancia se gestiona sola.",
        highlightToken: "PROCESS moneda(",
      },
      {
        id: "cb3",
        label: "Detector de Choque (collision)",
        role: "Pregunta al motor en cada cuadro si el jugador tocó la moneda.",
        plainExplanation: "No necesitas calcular distancias manualmente: collision(type jugador) lo hace por ti.",
        highlightToken: "collision(",
      },
      {
        id: "cb4",
        label: "Enemigo Autónomo (PROCESS enemigo)",
        role: "Camina solo horizontalmente cambiando de dirección en los bordes.",
        plainExplanation: "Su bucle invierte vx cuando llega a los extremos de la pantalla.",
        highlightToken: "PROCESS enemigo(",
      },
    ],
    assemblyStages: [
      {
        id: "cs1",
        title: "1. Variable global y marcador",
        fromSpanish: "\"sumen 10 puntos\"",
        explanation: "Declara GLOBAL puntos y lo muestra en pantalla con write_int.",
        lines: [
          "PROGRAM cazador_monedas;",
          "GLOBAL",
          "  puntos = 0;",
          "BEGIN",
          "  set_mode(m640x480); set_fps(60);",
          "  write_int(0, 24, 20, 0, &puntos);",
        ],
      },
      {
        id: "cs2",
        title: "2. Escena inicial",
        fromSpanish: "\"Pon monedas... y un enemigo\"",
        explanation: "Invoca al jugador, tres monedas y un enemigo patrullando.",
        lines: [
          "  jugador();",
          "  moneda(160, 200); moneda(320, 180); moneda(480, 240);",
          "  enemigo(320, 140);",
          "  LOOP FRAME; END",
          "END",
        ],
      },
      {
        id: "cs3",
        title: "3. Regla de recogida",
        fromSpanish: "\"monedas doradas... al tocarlas\"",
        explanation: "Cuando collision(type jugador) es verdadero, suma 10 y desaparece.",
        lines: [
          "",
          "PROCESS moneda(x, y)",
          "BEGIN",
          "  graph = 3;",
          "  LOOP",
          "    IF (collision(type jugador)) puntos += 10; break; END",
          "    FRAME;",
          "  END",
          "END",
        ],
      },
      {
        id: "cs4",
        title: "4. Patrulla automática",
        fromSpanish: "\"enemigo patrullando\"",
        explanation: "Se mueve con velocidad vx e invierte dirección en los bordes.",
        lines: [
          "",
          "PROCESS enemigo(x, y)",
          "PRIVATE vx = 3;",
          "BEGIN",
          "  graph = 4;",
          "  LOOP",
          "    x += vx;",
          "    IF (x < 40 OR x > 600) vx = -vx; END",
          "    FRAME;",
          "  END",
          "END",
        ],
      },
    ],
    fullDivCode: `PROGRAM cazador_monedas;

GLOBAL
  puntos = 0;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(18, 28, 42));
  write(0, 24, 20, 0, "PUNTOS:");
  write_int(0, 110, 20, 0, &puntos);
  jugador();
  moneda(160, 200);
  moneda(320, 180);
  moneda(480, 240);
  enemigo(320, 140);
  LOOP
    FRAME;
  END
END

PROCESS jugador()
BEGIN
  graph = 1; x = 320; y = 340;
  LOOP
    IF (key(_right) AND x < 610) x += 5; END
    IF (key(_left)  AND x > 30)  x -= 5; END
    IF (key(_up)    AND y > 50)  y -= 5; END
    IF (key(_down)  AND y < 450) y += 5; END
    FRAME;
  END
END

PROCESS moneda(x, y)
BEGIN
  graph = 3;
  LOOP
    IF (collision(type jugador))
      puntos += 10;
      break;
    END
    FRAME;
  END
END

PROCESS enemigo(x, y)
PRIVATE
  vx = 3;
BEGIN
  graph = 4;
  LOOP
    x += vx;
    IF (x < 40 OR x > 600) vx = -vx; END
    FRAME;
  END
END`,
    errorDemoBrokenLine: "  write_int(0, 110, 20, 0, puntos);   // Falta '&' en la referencia",
    errorDemoFixedLine: "  write_int(0, 110, 20, 0, &puntos);",
    errorDemoReason:
      "write_int necesita '&puntos' para observar el valor en vivo cada cuadro; el ensamblador Precódigo lo inserta automáticamente.",
  },
  {
    id: "platform_jump",
    title: "Salto con gravedad",
    prompt: "Haz un personaje que camine y salte con gravedad sobre el suelo",
    summary:
      "Convierte física básica ('gravedad' y 'saltar') en velocidad vertical vy y límite contra el suelo.",
    tokens: [
      {
        id: "p1",
        text: "Haz",
        role: "filler",
        meaning: "Orden de inicio para ensamblar el proyecto.",
        divTarget: "PROGRAM salto_plataformas;",
      },
      {
        id: "p2",
        text: "un personaje",
        role: "actor",
        meaning: "Proceso jugador con variables privadas de física.",
        divTarget: "PROCESS heroe()",
      },
      {
        id: "p3",
        text: "que camine",
        role: "input",
        meaning: "Desplazamiento lateral suave con flechas izquierda y derecha.",
        divTarget: "IF (key(_right)) x += 4; END",
      },
      {
        id: "p4",
        text: "y salte",
        role: "action",
        meaning: "Impulso negativo en el eje Y solo cuando está tocando el suelo.",
        divTarget: "IF (key(_up) AND en_suelo) vy = -12; END",
      },
      {
        id: "p5",
        text: "con gravedad sobre el suelo",
        role: "rule",
        meaning: "Aceleración constante hacia abajo y tope en y = 390.",
        divTarget: "vy += 1; y += vy;",
      },
    ],
    cpuBlocksMatched: ["Motor Gravedad 2D", "Detección de Suelo", "Salto Condicional"],
    gpuTokenStream: [
      "PRIVATE",
      "vy = 0;",
      "en_suelo = 0;",
      "vy += 1;",
      "y += vy;",
      "IF (y >= 390)",
      "y = 390; vy = 0;",
      "IF (key(_up) AND en_suelo)",
    ],
    blueprintNodes: [
      {
        id: "pb1",
        label: "Variables Privadas (PRIVATE vy, en_suelo)",
        role: "Memoria exclusiva de este personaje para controlar su impulso vertical.",
        plainExplanation: "Cada personaje recuerda su propia velocidad de caída sin afectar a los demás.",
        highlightToken: "vy = 0;",
      },
      {
        id: "pb2",
        label: "Fuerza de Gravedad (vy += 1)",
        role: "En cada cuadro empuja al personaje suavemente hacia abajo.",
        plainExplanation: "Al subir con vy = -12, la gravedad frena el salto y lo hace caer de forma natural.",
        highlightToken: "vy += 1;",
      },
      {
        id: "pb3",
        label: "Tope de Suelo (IF y >= 390)",
        role: "Evita que el jugador atraviese el piso y habilita el siguiente salto.",
        plainExplanation: "Solo cuando en_suelo == 1 se permite volver a saltar.",
        highlightToken: "y = 390;",
      },
    ],
    assemblyStages: [
      {
        id: "ps1",
        title: "1. Escenario y suelo",
        fromSpanish: "\"sobre el suelo\"",
        explanation: "Prepara el modo gráfico y lanza al héroe en pantalla.",
        lines: [
          "PROGRAM salto_plataformas;",
          "BEGIN",
          "  set_mode(m640x480); set_fps(60);",
          "  heroe();",
          "  LOOP FRAME; END",
          "END",
        ],
      },
      {
        id: "ps2",
        title: "2. Memoria física privada",
        fromSpanish: "\"un personaje... con gravedad\"",
        explanation: "Declara vy (velocidad vertical) y en_suelo para evitar saltos infinitos en el aire.",
        lines: [
          "",
          "PROCESS heroe()",
          "PRIVATE vy = 0; en_suelo = 0;",
          "BEGIN",
          "  graph = 1; x = 320; y = 390;",
        ],
      },
      {
        id: "ps3",
        title: "3. Caminar y saltar",
        fromSpanish: "\"que camine y salte\"",
        explanation: "Lee izquierda/derecha y aplica impulso -12 al pulsar arriba o espacio en el suelo.",
        lines: [
          "  LOOP",
          "    IF (key(_right)) x += 4; END",
          "    IF (key(_left))  x -= 4; END",
          "    IF ((key(_up) OR key(_space)) AND en_suelo)",
          "      vy = -12; en_suelo = 0;",
          "    END",
        ],
      },
      {
        id: "ps4",
        title: "4. Caída y aterrizaje",
        fromSpanish: "\"con gravedad\"",
        explanation: "Suma gravedad cada cuadro y detiene la caída al tocar y = 390.",
        lines: [
          "    vy += 1; y += vy;",
          "    IF (y >= 390) y = 390; vy = 0; en_suelo = 1; END",
          "    FRAME;",
          "  END",
          "END",
        ],
      },
    ],
    fullDivCode: `PROGRAM salto_plataformas;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(20, 32, 54));
  write(0, 320, 26, 1, "IZQ / DER CAMINA · ARRIBA O ESPACIO SALTA");
  heroe();
  LOOP
    FRAME;
  END
END

PROCESS heroe()
PRIVATE
  vy = 0;
  en_suelo = 1;
BEGIN
  graph = 1;
  x = 320;
  y = 390;
  LOOP
    IF (key(_right) AND x < 610) x += 4; END
    IF (key(_left)  AND x > 30)  x -= 4; END
    IF ((key(_up) OR key(_space)) AND en_suelo == 1)
      vy = -12;
      en_suelo = 0;
    END
    vy += 1;
    y += vy;
    IF (y >= 390)
      y = 390;
      vy = 0;
      en_suelo = 1;
    END
    FRAME;
  END
END`,
    errorDemoBrokenLine: "    IF (key(_up)) vy = -12; END   // Permite volar infinito en el aire",
    errorDemoFixedLine: "    IF ((key(_up) OR key(_space)) AND en_suelo == 1) vy = -12; END",
    errorDemoReason:
      "Comprobar 'en_suelo == 1' asegura física de plataformas real en lugar de flotar sin límite.",
  },
];

const TUTORIAL_STEPS = [
  { id: "tokens", number: "01", title: "Frase a piezas" },
  { id: "hardware", number: "02", title: "CPU vs GPU local" },
  { id: "blueprint", number: "03", title: "Arquitectura DIV" },
  { id: "assembly", number: "04", title: "Sintaxis paso a paso" },
  { id: "practice", number: "05", title: "Tu propia prueba" },
] as const;

export const LocalAiTutorialView: React.FC<LocalAiTutorialViewProps> = ({
  onClose,
  onLoadCode,
  onOpenAiWithPrompt,
  onOpenAiSettings,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const [selectedTokenId, setSelectedTokenId] = useState<string>(SCENARIOS[0].tokens[1].id);
  const [hideFillers, setHideFillers] = useState<boolean>(false);

  // Step 2: CPU vs GPU hardware simulator state
  const [computeMode, setComputeMode] = useState<"cpu" | "gpu">("cpu");
  const [ruleComplexity, setRuleComplexity] = useState<number>(2);
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [simTick, setSimTick] = useState<number>(3);
  const [gpuInfo, setGpuInfo] = useState<{ checked: boolean; hasWebGpu: boolean; adapter?: string }>({
    checked: false,
    hasWebGpu: false,
  });

  // Step 3: Architecture Blueprint state
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>(
    SCENARIOS[0].blueprintNodes[1].id
  );
  const [simulateMissingFrame, setSimulateMissingFrame] = useState<boolean>(false);
  const [previewFramePos, setPreviewFramePos] = useState<number>(0);

  // Step 4: Progressive DIV assembly playback state
  const [visibleStageCount, setVisibleStageCount] = useState<number>(2);
  const [isAssembling, setIsAssembling] = useState<boolean>(false);
  const [showErrorComparison, setShowErrorComparison] = useState<boolean>(false);

  // Step 5: Live custom user test + Web Speech dictation
  const [customPrompt, setCustomPrompt] = useState<string>(
    "Crea una nave con flechas que dispare estrellas y sume puntos"
  );
  const [activePrompt, setActivePrompt] = useState<string>(
    "Crea una nave con flechas que dispare estrellas y sume puntos"
  );
  const [voiceAutoRun, setVoiceAutoRun] = useState<boolean>(true);

  const voice = useVoiceDictation({
    defaultLang: "es-ES",
    onFinalTranscript: (spoken) => {
      const clean = spoken.trim();
      if (!clean) return;
      setCustomPrompt(clean);
      if (voiceAutoRun) {
        setActivePrompt(clean);
      }
    },
  });

  useEffect(() => {
    let mounted = true;
    getGpuInfo()
      .then((res) => {
        if (!mounted) return;
        setGpuInfo({ checked: true, hasWebGpu: res.hasWebGpu, adapter: res.adapterName });
      })
      .catch(() => {
        if (!mounted) return;
        setGpuInfo({ checked: true, hasWebGpu: false });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0],
    [scenarioId]
  );

  // Reset per-scenario selections cleanly when changing example
  const handleSelectScenario = (nextId: string) => {
    const next = SCENARIOS.find((s) => s.id === nextId) || SCENARIOS[0];
    setScenarioId(nextId);
    const firstNonFiller = next.tokens.find((t) => t.role !== "filler") || next.tokens[0];
    setSelectedTokenId(firstNonFiller.id);
    setSelectedBlueprintId(next.blueprintNodes[0]?.id || "");
    setVisibleStageCount(2);
    setIsAssembling(false);
  };

  // Step 2 compute playback timer
  useEffect(() => {
    if (!simRunning) return;
    const interval = setInterval(() => {
      setSimTick((prev) => {
        if (prev >= 4) {
          setSimRunning(false);
          return 4;
        }
        return prev + 1;
      });
    }, computeMode === "cpu" ? 450 : 650);
    return () => clearInterval(interval);
  }, [simRunning, computeMode]);

  // Step 3 preview mini-motion
  useEffect(() => {
    if (stepIndex !== 2) return;
    const interval = setInterval(() => {
      setPreviewFramePos((p) => (p + 1) % 24);
    }, 90);
    return () => clearInterval(interval);
  }, [stepIndex]);

  // Step 4 progressive assembly playback timer
  useEffect(() => {
    if (!isAssembling) return;
    const maxStages = scenario.assemblyStages.length;
    const interval = setInterval(() => {
      setVisibleStageCount((prev) => {
        if (prev >= maxStages) {
          setIsAssembling(false);
          return maxStages;
        }
        return prev + 1;
      });
    }, 950);
    return () => clearInterval(interval);
  }, [isAssembling, scenario.assemblyStages.length]);

  const activeToken = useMemo(
    () => scenario.tokens.find((t) => t.id === selectedTokenId) || scenario.tokens[0],
    [scenario, selectedTokenId]
  );

  const activeBlueprint = useMemo(
    () =>
      scenario.blueprintNodes.find((b) => b.id === selectedBlueprintId) ||
      scenario.blueprintNodes[0],
    [scenario, selectedBlueprintId]
  );

  const assembledCodeLines = useMemo(() => {
    const visible = scenario.assemblyStages.slice(0, visibleStageCount);
    return visible.flatMap((stage) =>
      stage.lines.map((line) => ({
        line,
        stageId: stage.id,
        isLatest: stage.id === visible[visible.length - 1]?.id,
      }))
    );
  }, [scenario.assemblyStages, visibleStageCount]);

  const liveSynthesis = useMemo(
    () => generatePrecodeNeuralCode(activePrompt, ""),
    [activePrompt]
  );

  const liveTokensPreview = useMemo(() => {
    const words = activePrompt.trim().split(/\s+/).filter(Boolean).slice(0, 12);
    return words.map((w) => {
      const lower = w.toLowerCase();
      if (/^(nave|jugador|heroe|moneda|enemigo|jefe|pelota|boton|tienda|web)$/.test(lower)) {
        return { word: w, kind: "Actor / Elemento" };
      }
      if (/^(flecha|tecla|espacio|salta|salte|dispar|toca|pulsa|mueva)$/.test(lower)) {
        return { word: w, kind: "Acción / Evento" };
      }
      if (/^(punto|vida|gravedad|precio|score)$/.test(lower)) {
        return { word: w, kind: "Dato / Regla" };
      }
      return { word: w, kind: "Contexto" };
    });
  }, [activePrompt]);

  const currentStep = TUTORIAL_STEPS[stepIndex];
  const cpuEstimatedMs = ruleComplexity * 2;
  const gpuTokensShown = Math.min(
    scenario.gpuTokenStream.length,
    Math.max(2, Math.round((simTick / 4) * scenario.gpuTokenStream.length))
  );

  return (
    <div
      className="fixed inset-0 z-[110] bg-[#F7F8FA] text-[#111827] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-ai-title"
    >
      {/* Top Tutorial Header (Compact single bar) */}
      <header className="bg-white border-b border-[#E2E8F0] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] px-2.5 rounded-xl bg-[#F7F8FA] hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold text-[#111827] flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            aria-label="Volver al espacio de trabajo"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </button>

          <div className="min-w-0">
            <h1
              id="tutorial-ai-title"
              className="text-sm sm:text-base font-bold text-[#111827] truncate"
            >
              Tutorial Paso a Paso · Lenguaje Natural a Sintaxis DIV
            </h1>
            <div className="text-[11px] text-[#6B7280] truncate">
              Paso {stepIndex + 1} de {TUTORIAL_STEPS.length} · {currentStep.title} · Procesamiento local en GPU / CPU
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenAiSettings && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAiSettings();
              }}
              className="hidden md:flex min-h-[40px] px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-[#374151] items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Cpu className="w-4 h-4 text-[#7C2D48]" />
              <span>Ajustes GPU/CPU</span>
            </button>
          )}
        </div>
      </header>

      {/* Step Navigation + Scenario Bar */}
      <div className="bg-white border-b border-[#E2E8F0] px-3 sm:px-6 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 flex-shrink-0">
        {/* Stepper Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {TUTORIAL_STEPS.map((st, idx) => {
            const active = idx === stepIndex;
            const completed = idx < stepIndex;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStepIndex(idx)}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 border transition-colors cursor-pointer flex-shrink-0 ${
                  active
                    ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                    : completed
                      ? "bg-[#EEF6F1] text-[#2F6F4E] border-[#CFE4D7]"
                      : "bg-[#F7F8FA] text-[#4B5563] border-[#E2E8F0] hover:text-[#111827]"
                }`}
              >
                <span className="font-mono tabular-nums">{st.number}.</span>
                <span>{st.title}</span>
              </button>
            );
          })}
        </div>

        {/* Example Scenario Selector (Steps 1–4) */}
        {currentStep.id !== "practice" && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-semibold text-[#6B7280] flex-shrink-0">
              Ejemplo:
            </span>
            {SCENARIOS.map((sc) => {
              const selected = sc.id === scenario.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectScenario(sc.id)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors cursor-pointer flex-shrink-0 ${
                    selected
                      ? "bg-[#FDF2F5] text-[#7C2D48] border-[#7C2D48]"
                      : "bg-white text-[#4B5563] border-[#E2E8F0] hover:text-[#111827]"
                  }`}
                >
                  {sc.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Scrollable Two-Zone Educational Stage */}
      <main className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto">
          {/* =============================================================== */}
          {/* PASO 1: TOKENIZACIÓN DEL LENGUAJE NATURAL                       */}
          {/* =============================================================== */}
          {currentStep.id === "tokens" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Stage (7 cols): Interactive Sentence Token Explorer */}
              <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 space-y-5">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#7C2D48]">
                    01. Lectura inicial · Paso 1 de 5
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#111827]">
                    Cómo separa la IA tu frase en piezas útiles
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                    Antes de escribir código DIV, el motor local lee tu frase en español y distingue qué palabras nombran personajes, controles o reglas y cuáles son solo conectores del idioma.
                  </p>
                </div>

                {/* Interactive Token Sentence Canvas */}
                <div className="rounded-2xl bg-[#F7F8FA] border border-[#E2E8F0] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#111827]">
                      Toca cualquier bloque de la frase para inspeccionarlo:
                    </span>
                    <button
                      type="button"
                      onClick={() => setHideFillers((v) => !v)}
                      className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        hideFillers
                          ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                          : "bg-white text-[#374151] border-[#E2E8F0]"
                      }`}
                    >
                      {hideFillers ? "Mostrando solo piezas clave" : "Ocultar conectores"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {scenario.tokens
                      .filter((t) => !(hideFillers && t.role === "filler"))
                      .map((tok) => {
                        const style = ROLE_META[tok.role];
                        const isSelected = tok.id === activeToken.id;
                        return (
                          <button
                            key={tok.id}
                            type="button"
                            onClick={() => setSelectedTokenId(tok.id)}
                            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                              style.bg
                            } ${style.border} ${
                              isSelected ? "ring-2 ring-[#111827]/20 shadow-xs" : "opacity-85 hover:opacity-100"
                            }`}
                          >
                            <div className={`text-xs sm:text-sm font-bold ${style.text}`}>
                              {tok.text}
                            </div>
                            <div className="text-[11px] text-[#4B5563] mt-0.5">
                              {style.label}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Transformation Arrow Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
                  <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1">
                    <div className="text-[11px] font-semibold text-[#6B7280]">Entrada humana</div>
                    <div className="text-sm font-bold text-[#111827]">&ldquo;{activeToken.text}&rdquo;</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FDF2F5] border border-[#F3D0DC] space-y-1">
                    <div className="text-[11px] font-semibold text-[#7C2D48]">Clasificación local</div>
                    <div className="text-sm font-bold text-[#111827]">
                      {ROLE_META[activeToken.role].label}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0F172A] text-slate-100 space-y-1">
                    <div className="text-[11px] font-semibold text-emerald-400">Destino en DIV</div>
                    <code className="block text-xs font-mono text-white break-all">
                      {activeToken.divTarget}
                    </code>
                  </div>
                </div>
              </section>

              {/* Right Control & Concept Deck (5 cols) */}
              <aside className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#7C2D48]">Inspector de pieza</div>
                  <h3 className="text-base font-bold text-[#111827]">
                    &ldquo;{activeToken.text}&rdquo;
                  </h3>
                  <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                    {activeToken.meaning}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
                  <div className="text-xs font-bold text-[#111827]">
                    ¿Por qué importa en lenguaje natural?
                  </div>
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    {scenario.summary}
                  </p>
                  <div className="p-3 rounded-xl bg-[#EEF6F1] border border-[#CFE4D7] text-xs text-[#111827] space-y-1">
                    <div className="font-bold text-[#2F6F4E]">Regla práctica para escribir prompts</div>
                    <p className="text-[#374151]">
                      Nombra siempre <strong>quién</strong> actúa (nave, moneda, héroe) y <strong>con qué</strong> responde (flechas, espacio, choque). La IA se encarga de traducirlo a código DIV.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* =============================================================== */}
          {/* PASO 2: HARDWARE LOCAL — CPU VS GPU (WEBGPU)                    */}
          {/* =============================================================== */}
          {currentStep.id === "hardware" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Stage (7 cols): Live Hardware Compute Visualizer */}
              <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#7C2D48]">
                      02. Cómputo en tu dispositivo · Paso 2 de 5
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#111827]">
                      Cómo procesan el código tu CPU y tu GPU
                    </h2>
                  </div>

                  {/* Mode Switcher */}
                  <div className="inline-flex bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] self-start">
                    <button
                      type="button"
                      onClick={() => {
                        setComputeMode("cpu");
                        setSimTick(4);
                        setSimRunning(false);
                      }}
                      className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        computeMode === "cpu"
                          ? "bg-white text-[#2F6F4E] shadow-xs"
                          : "text-[#4B5563] hover:text-[#111827]"
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>CPU · Precódigo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setComputeMode("gpu");
                        setSimTick(4);
                        setSimRunning(false);
                      }}
                      className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        computeMode === "gpu"
                          ? "bg-white text-[#7C2D48] shadow-xs"
                          : "text-[#4B5563] hover:text-[#111827]"
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>GPU · WebLLM</span>
                    </button>
                  </div>
                </div>

                {/* Compute Visualization Canvas */}
                {computeMode === "cpu" ? (
                  <div className="rounded-2xl bg-[#F7F8FA] border border-[#E2E8F0] p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#2F6F4E]">
                        PROCESADOR (CPU) · Ensamblaje secuencial por patrones
                      </span>
                      <span className="font-mono tabular-nums text-[#374151]">
                        Latencia estimada: ~{cpuEstimatedMs} ms · RAM extra: 0 MB
                      </span>
                    </div>

                    {/* CPU Sequential Pipeline Stages */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      {[
                        { step: 1, title: "1. Limpia texto", detail: "Normaliza tildes y detecta verbos" },
                        { step: 2, title: "2. Busca bloques", detail: `Compara ${ruleComplexity * 6} plantillas DIV` },
                        { step: 3, title: "3. Fusiona código", detail: "Une GLOBAL + PROCESS sin duplicar" },
                        { step: 4, title: "4. DIV validado", detail: "Listo para ejecutar a 60 FPS" },
                      ].map((node) => {
                        const active = simTick >= node.step;
                        return (
                          <div
                            key={node.step}
                            className={`p-3 rounded-xl border transition-all space-y-1 ${
                              active
                                ? "bg-[#EEF6F1] border-[#2F6F4E]"
                                : "bg-white border-[#E2E8F0] opacity-60"
                            }`}
                          >
                            <div className="text-[11px] font-bold text-[#2F6F4E] flex items-center justify-between">
                              <span>{node.title}</span>
                              <span>{active ? "OK" : "ESPERA"}</span>
                            </div>
                            <p className="text-[11px] text-[#374151] leading-snug">
                              {node.detail}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5">
                      <div className="text-[11px] font-bold text-[#111827]">
                        Módulos Precódigo activados en CPU para &ldquo;{scenario.title}&rdquo;:
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-[#2F6F4E] font-medium">
                        {scenario.cpuBlocksMatched.slice(0, Math.max(1, ruleComplexity)).map((b) => (
                          <span key={b} className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{b}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#F7F8FA] border border-[#E2E8F0] p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#7C2D48]">
                        TARJETA GRÁFICA (GPU vía WebGPU) · Cálculo paralelo por capas
                      </span>
                      <span className="font-mono tabular-nums text-[#374151]">
                        {ruleComplexity * 8} carriles paralelos · Caché local
                      </span>
                    </div>

                    {/* GPU Parallel Matrix Lanes */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Array.from({ length: 8 }).map((_, laneIdx) => {
                        const active = simTick >= Math.ceil((laneIdx + 1) / 2);
                        const withinLoad = laneIdx < ruleComplexity * 2;
                        return (
                          <div
                            key={laneIdx}
                            className={`p-2.5 rounded-xl border text-[11px] font-mono tabular-nums transition-all ${
                              active && withinLoad
                                ? "bg-[#FDF2F5] border-[#7C2D48] text-[#7C2D48]"
                                : "bg-white border-[#E2E8F0] text-[#6B7280]"
                            }`}
                          >
                            <div className="font-bold">Núcleo GPU #{laneIdx + 1}</div>
                            <div className="text-[10px]">
                              {!withinLoad
                                ? "En reposo"
                                : active
                                  ? "Calculando pesos"
                                  : "Esperando lote"}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Streaming Token Output from GPU */}
                    <div className="p-3 rounded-xl bg-[#0F172A] text-slate-100 space-y-1.5">
                      <div className="text-[11px] font-semibold text-emerald-400">
                        Predicción de tokens DIV generados por WebLLM:
                      </div>
                      <div className="font-mono text-xs text-slate-200 leading-relaxed">
                        {scenario.gpuTokenStream.slice(0, gpuTokensShown).join(" ")}
                      </div>
                    </div>
                  </div>
                )}

                {/* Playback & Parameter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (simRunning) {
                          setSimRunning(false);
                        } else {
                          if (simTick >= 4) setSimTick(1);
                          setSimRunning(true);
                        }
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {simRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      <span>{simRunning ? "Pausar" : "Simular cómputo"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimRunning(false);
                        setSimTick((t) => (t >= 4 ? 1 : t + 1));
                      }}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-[#111827] flex items-center gap-1.5 cursor-pointer"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span>Avanzar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimRunning(false);
                        setSimTick(1);
                      }}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-[#4B5563] flex items-center gap-1.5 cursor-pointer"
                      aria-label="Reiniciar simulación"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Complexity Slider */}
                  <label className="flex items-center gap-3 text-xs text-[#374151]">
                    <span className="font-semibold whitespace-nowrap">
                      Reglas en el prompt: <strong className="font-mono tabular-nums">{ruleComplexity}</strong>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={4}
                      value={ruleComplexity}
                      onChange={(e) => setRuleComplexity(Number(e.target.value))}
                      className="w-28 accent-[#7C2D48] cursor-pointer"
                    />
                  </label>
                </div>
              </section>

              {/* Right Concept Deck (5 cols) */}
              <aside className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 space-y-4">
                <h3 className="text-base font-bold text-[#111827]">
                  ¿Qué ocurre en tu hardware?
                </h3>

                <div className="space-y-3 text-xs sm:text-sm text-[#374151] leading-relaxed">
                  <p>
                    {computeMode === "cpu" ? (
                      <>
                        En <strong>Modo CPU (Red Neural de Precódigo)</strong>, el procesador no intenta adivinar palabra por palabra: identifica las intenciones de tu frase y ensambla piezas DIV ya probadas en milisegundos.
                      </>
                    ) : (
                      <>
                        En <strong>Modo GPU (WebLLM)</strong>, un modelo de lenguaje compacto vive en la memoria gráfica de tu navegador y calcula cientos de operaciones matriciales a la vez mediante <strong>WebGPU</strong> para redactar código libre.
                      </>
                    )}
                  </p>

                  <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1.5 text-xs">
                    <div className="font-bold text-[#111827]">
                      Estado detectado en este equipo:
                    </div>
                    <div className={gpuInfo.hasWebGpu ? "text-[#2F6F4E] font-semibold" : "text-[#7C2D48] font-semibold"}>
                      {!gpuInfo.checked
                        ? "Analizando navegador..."
                        : gpuInfo.hasWebGpu
                          ? `WebGPU disponible (${gpuInfo.adapter || "GPU activa"})`
                          : "WebGPU no disponible aquí — CPU Precódigo recomendado"}
                    </div>
                    <p className="text-[#4B5563]">
                      Ambos modos trabajan dentro de tu dispositivo: tus prompts no requieren suscripción ni salen a servidores externos.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* =============================================================== */}
          {/* PASO 3: MAPEO A ARQUITECTURA DIV (PROGRAM + PROCESS + FRAME)    */}
          {/* =============================================================== */}
          {currentStep.id === "blueprint" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Stage (7 cols): Code Blueprint + Live FRAME Simulator */}
              <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#7C2D48]">
                    03. Estructura de un juego · Paso 3 de 5
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#111827]">
                    Por qué la IA organiza todo en PROGRAM y PROCESS
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                    En sintaxis DIV cada elemento vivo del juego (nave, moneda, enemigo) es un <strong>PROCESS</strong> con vida propia que repite sus acciones cada cuadro gracias a <code className="font-mono text-[#7C2D48]">FRAME;</code>.
                  </p>
                </div>

                {/* Highlighted DIV Skeleton */}
                <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#0F172A]">
                  <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-semibold">
                      Estructura destino · Resaltando: <strong className="text-emerald-400">{activeBlueprint.label}</strong>
                    </span>
                  </div>
                  <pre className="p-3.5 text-[11px] font-mono text-slate-200 max-h-64 overflow-auto leading-relaxed">
                    {scenario.fullDivCode.split("\n").map((line, i) => {
                      const match = line.includes(activeBlueprint.highlightToken);
                      return (
                        <div
                          key={i}
                          className={`px-1.5 -mx-1.5 rounded ${
                            match ? "bg-[#7C2D48]/60 text-white font-semibold" : ""
                          }`}
                        >
                          {line || " "}
                        </div>
                      );
                    })}
                  </pre>
                </div>

                {/* Mini Interactive FRAME; Experiment */}
                <div className="rounded-2xl bg-[#F7F8FA] border border-[#E2E8F0] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#111827]">
                      Experimento visual: qué hace la instrucción <code className="font-mono text-[#7C2D48]">FRAME;</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSimulateMissingFrame((v) => !v)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                        simulateMissingFrame
                          ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                          : "bg-[#EEF6F1] text-[#2F6F4E] border-[#2F6F4E]"
                      }`}
                    >
                      {simulateMissingFrame ? "Simulando SIN FRAME;" : "Con LOOP ... FRAME; (60 FPS)"}
                    </button>
                  </div>

                  <div className="relative h-14 rounded-xl bg-[#0F172A] overflow-hidden flex items-center px-3">
                    {simulateMissingFrame ? (
                      <div className="text-xs text-rose-300 font-medium">
                        Sin FRAME;, el bucle termina en un instante o congela el dibujo en pantalla.
                      </div>
                    ) : (
                      <>
                        <div
                          className="w-7 h-7 rounded-lg bg-[#2F6F4E] border border-emerald-300 flex items-center justify-center text-[10px] font-bold text-white transition-transform duration-75"
                          style={{ transform: `translateX(${previewFramePos * 14}px)` }}
                        >
                          P1
                        </div>
                        <span className="ml-auto text-[11px] font-mono tabular-nums text-emerald-300">
                          FRAME #{previewFramePos + 1}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* Right Blueprint Tree (5 cols) */}
              <aside className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 space-y-3">
                <div className="text-xs font-bold text-[#7C2D48]">
                  Toca cada bloque para ver su función
                </div>
                <div className="space-y-2">
                  {scenario.blueprintNodes.map((node) => {
                    const selected = node.id === activeBlueprint.id;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedBlueprintId(node.id)}
                        className={`w-full min-h-[60px] p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                          selected
                            ? "bg-[#FDF2F5] border-[#7C2D48]"
                            : "bg-[#F7F8FA] border-[#E2E8F0] hover:bg-white"
                        }`}
                      >
                        <div className="text-xs font-bold text-[#111827]">{node.label}</div>
                        <div className="text-[11px] text-[#4B5563]">{node.role}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-xl bg-[#EEF6F1] border border-[#CFE4D7] text-xs text-[#111827] space-y-1">
                  <div className="font-bold text-[#2F6F4E]">Por qué la IA lo genera así</div>
                  <p className="text-[#374151] leading-relaxed">{activeBlueprint.plainExplanation}</p>
                </div>
              </aside>
            </div>
          )}

          {/* =============================================================== */}
          {/* PASO 4: ENSAMBLAJE LÍNEA POR LÍNEA Y AUTO-VALIDACIÓN           */}
          {/* =============================================================== */}
          {currentStep.id === "assembly" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Stage (7 cols): Animated Line-by-Line DIV Assembly */}
              <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#7C2D48]">
                    04. Construcción progresiva · Paso 4 de 5
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#111827]">
                    Observa cómo se construye la sintaxis DIV paso a paso
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4B5563]">
                    Avanza bloque por bloque para ver en qué orden la IA ensambla un archivo DIV completo y válido.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#0F172A] overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                    <span>
                      Bloques ensamblados: <strong className="font-mono tabular-nums text-emerald-400">{visibleStageCount} / {scenario.assemblyStages.length}</strong>
                    </span>
                    <span className="text-slate-400 truncate">
                      {scenario.assemblyStages[visibleStageCount - 1]?.title}
                    </span>
                  </div>
                  <pre className="p-3.5 text-xs font-mono text-slate-100 min-h-[240px] max-h-80 overflow-auto leading-relaxed">
                    {assembledCodeLines.map((item, idx) => (
                      <div
                        key={idx}
                        className={`px-1.5 -mx-1.5 rounded ${
                          item.isLatest ? "bg-[#2F6F4E]/40 text-emerald-100" : "text-slate-300"
                        }`}
                      >
                        {item.line || " "}
                      </div>
                    ))}
                  </pre>
                </div>

                {/* Playback Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isAssembling) {
                        setIsAssembling(false);
                      } else {
                        if (visibleStageCount >= scenario.assemblyStages.length) {
                          setVisibleStageCount(1);
                        }
                        setIsAssembling(true);
                      }
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isAssembling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isAssembling ? "Pausar" : "Animar construcción"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAssembling(false);
                      setVisibleStageCount((c) => Math.max(1, c - 1));
                    }}
                    disabled={visibleStageCount <= 1}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-[#374151] disabled:opacity-40 cursor-pointer"
                  >
                    Bloque anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAssembling(false);
                      setVisibleStageCount((c) =>
                        Math.min(scenario.assemblyStages.length, c + 1)
                      );
                    }}
                    disabled={visibleStageCount >= scenario.assemblyStages.length}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-[#111827] disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Siguiente bloque</span>
                  </button>
                </div>
              </section>

              {/* Right Stage Cards + Syntax Guard Demo (5 cols) */}
              <aside className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="text-xs font-bold text-[#7C2D48]">
                  Etapas de traducción
                </div>

                <div className="space-y-2">
                  {scenario.assemblyStages.map((stage, idx) => {
                    const active = idx + 1 === visibleStageCount;
                    const done = idx + 1 < visibleStageCount;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => {
                          setIsAssembling(false);
                          setVisibleStageCount(idx + 1);
                        }}
                        className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                          active
                            ? "bg-[#FDF2F5] border-[#7C2D48]"
                            : done
                              ? "bg-[#EEF6F1] border-[#CFE4D7]"
                              : "bg-[#F7F8FA] border-[#E2E8F0] opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#111827]">{stage.title}</span>
                          <span className="text-[11px] font-semibold text-[#7C2D48]">
                            {stage.fromSpanish}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#4B5563] leading-snug">
                          {stage.explanation}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Syntax Validation Guard Interactive Box */}
                <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-[#7C2D48]" />
                      <span>Garantía de sintaxis DIV</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowErrorComparison((v) => !v)}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] text-[11px] font-semibold text-[#7C2D48] cursor-pointer"
                    >
                      {showErrorComparison ? "Ver código corregido" : "Ver error común"}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-[#0F172A] font-mono text-[11px] overflow-x-auto text-slate-100">
                    {showErrorComparison
                      ? scenario.errorDemoBrokenLine
                      : scenario.errorDemoFixedLine}
                  </pre>
                  <p className="text-[11px] text-[#4B5563] leading-snug">
                    {scenario.errorDemoReason}
                  </p>
                </div>
              </aside>
            </div>
          )}

          {/* =============================================================== */}
          {/* PASO 5: TU PROPIA PRUEBA EN VIVO (VOZ + CPU REAL)              */}
          {/* =============================================================== */}
          {currentStep.id === "practice" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Stage (7 cols): Custom Prompt + Live DIV Output */}
              <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#7C2D48]">
                    05. Práctica guiada · Paso 5 de 5
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#111827]">
                    Dicta o escribe tu propia idea y mírala transformarse en DIV
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4B5563]">
                    El motor local en tu CPU analizará tus palabras, seleccionará los bloques compatibles y sintetizará un programa DIV completo listo para ejecutar.
                  </p>
                </div>

                <VoiceListeningBanner
                  isListening={voice.isListening}
                  interimTranscript={voice.interimTranscript}
                  error={voice.error}
                  lang={voice.lang}
                  autoExecute={voiceAutoRun}
                  onChangeLang={voice.setLang}
                  onToggleAutoExecute={() => setVoiceAutoRun((v) => !v)}
                  onFinishAndSend={() => voice.stopListening(false)}
                  onCancel={() => voice.stopListening(true)}
                  onDismissError={voice.clearError}
                  variant="light"
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-stretch gap-2 flex-1">
                    <VoiceMicButton
                      isSupported={voice.isSupported}
                      isListening={voice.isListening}
                      onToggle={voice.toggleListening}
                      variant="light"
                    />
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customPrompt.trim()) {
                          setActivePrompt(customPrompt.trim());
                        }
                      }}
                      placeholder="Ej: Crea un personaje que salte y recoja monedas..."
                      className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] focus:border-[#7C2D48] focus:outline-none text-xs sm:text-sm text-[#111827]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (customPrompt.trim()) setActivePrompt(customPrompt.trim());
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Procesar en CPU</span>
                  </button>
                </div>

                {/* Live Result Code */}
                <div className="rounded-xl border border-[#E2E8F0] bg-[#0F172A] overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                    <span className="font-semibold text-emerald-400">
                      Código DIV generado localmente
                    </span>
                    <span className="truncate text-slate-400">
                      {liveSynthesis.matchedBlocks.length} bloques aplicados
                    </span>
                  </div>
                  <pre className="p-3.5 text-xs font-mono text-slate-100 max-h-72 overflow-auto leading-relaxed">
                    {liveSynthesis.code}
                  </pre>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  {onLoadCode && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onLoadCode(liveSynthesis.code, true);
                        }}
                        className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Ejecutar ahora en el Juego</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onLoadCode(liveSynthesis.code, false);
                        }}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#111827] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Code2 className="w-4 h-4 text-[#7C2D48]" />
                        <span>Abrir en Editor DIV</span>
                      </button>
                    </>
                  )}
                  {onOpenAiWithPrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAiWithPrompt(activePrompt);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FDF2F5] hover:bg-[#FCE7EE] border border-[#F3D0DC] text-[#7C2D48] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Seguir en AURA IA</span>
                    </button>
                  )}
                </div>
              </section>

              {/* Right Analysis Summary (5 cols) */}
              <aside className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 space-y-4">
                <h3 className="text-base font-bold text-[#111827]">
                  Desglose de tu frase en tiempo real
                </h3>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#7C2D48]">
                    1. Piezas detectadas en tu texto:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {liveTokensPreview.map((item, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-1.5 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0] text-xs"
                      >
                        <span className="font-bold text-[#111827]">{item.word}</span>
                        <span className="text-[#6B7280] text-[10px] block">{item.kind}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                  <div className="text-xs font-bold text-[#2F6F4E]">
                    2. Bloques de Precódigo seleccionados en CPU:
                  </div>
                  {liveSynthesis.matchedBlocks.length > 0 ? (
                    <div className="space-y-1.5">
                      {liveSynthesis.matchedBlocks.map((b) => (
                        <div
                          key={b.id}
                          className="p-2.5 rounded-xl bg-[#EEF6F1] border border-[#CFE4D7] text-xs space-y-0.5"
                        >
                          <div className="font-bold text-[#111827]">{b.name}</div>
                          <div className="text-[11px] text-[#374151]">{b.description}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] text-xs text-[#4B5563]">
                      Se aplicó la plantilla base segura de DIV (`PROGRAM` + bucle a 60 FPS). Prueba añadir palabras como &ldquo;nave&rdquo;, &ldquo;monedas&rdquo;, &ldquo;saltar&rdquo; o &ldquo;disparos&rdquo;.
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] text-xs text-[#374151] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2F6F4E] flex-shrink-0 mt-0.5" />
                  <span>
                    Todo este procesamiento ocurrió 100% dentro de tu dispositivo sin enviar datos ni consumir saldo en la nube.
                  </span>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Progressive Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] px-3 sm:px-6 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#4B5563]">
          <GraduationCap className="w-4 h-4 text-[#7C2D48]" />
          <span>
            {currentStep.number}. {currentStep.title}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#2F6F4E]" />
            <span>Procesamiento 100% local</span>
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-[#374151] disabled:opacity-40 flex items-center gap-1.5 cursor-pointer disabled:cursor-default"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Paso anterior</span>
          </button>

          {stepIndex < TUTORIAL_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(TUTORIAL_STEPS.length - 1, i + 1))}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Siguiente paso</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Finalizar tutorial</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
