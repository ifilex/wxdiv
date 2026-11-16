import React, { useState } from "react";
import {
  Box,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gamepad2,
  GraduationCap,
  Layers,
  Minimize2,
  Maximize2,
  Mountain,
  Paintbrush,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import { Mode8CameraMode } from "../types";

export interface Mode8InteractiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  sectorCount: number;
  linedefCount: number;
  placedObjectsCount: number;
  cameraMode: Mode8CameraMode;
  onSelectTool: (
    tool:
      | "select"
      | "polyline"
      | "line"
      | "quickroom"
      | "stairs"
      | "zoom"
      | "move"
      | "sector_fill"
      | "new_thing"
      | "voxel"
      | "move_cam"
  ) => void;
  onSwitchInspectorTab: (tab: "sector" | "textures" | "voxels" | "menus" | "code") => void;
  onSwitchViewMode: (vm: "map2d" | "visual3d" | "split" | "code") => void;
  onElevateCurrentSector: (delta: number) => void;
  onBuildDemoStaircase: () => void;
  onApplyShowcasePalette: (style: "roblox" | "cyber") => void;
  onPlaceShowcaseModel: (modelId: string, label: string) => void;
  onSetCameraMode: (mode: Mode8CameraMode) => void;
  onLoadShowcasePreset: (presetId: string) => void;
  onToggleMenuPreview: () => void;
  onLaunchPlayableGame: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  subtitle: string;
  concept: string;
  howToTry: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: TutorialStep[] = [
  {
    id: "sectors",
    title: "1. Sectores (Salas, Suelos y Techos)",
    subtitle: "La base de todo mundo 3D en Modo 8",
    concept:
      "Un sector define una zona del mapa con su propia altura de suelo, altura de techo, textura de piso e iluminación. En el mapa 2D ves etiquetas como S0:0 indicando el ID del sector y la elevación del suelo.",
    howToTry:
      "Usa 'Sala Rápida' para crear una habitación 4×4 con un clic, o eleva el suelo del sector seleccionado para formar plataformas estilo Roblox.",
    icon: Layers,
  },
  {
    id: "walls_stairs",
    title: "2. Paredes, Portales 2-Lados y Escaleras",
    subtitle: "Conecta alturas y abre pasillos transitables",
    concept:
      "Una línea sólida (blanca) bloquea el paso y muestra una pared completa. Un portal de 2 lados (verde/naranja) conecta dos sectores de distinta altura mostrando automáticamente el escalón inferior o superior.",
    howToTry:
      "Prueba construir una escalera automática en la posición de la cámara o selecciona 'Polígono' para trazar recintos de forma libre.",
    icon: Mountain,
  },
  {
    id: "textures",
    title: "3. Texturizado Vibrante y Cielos",
    subtitle: "Del hormigón clásico al estilo Roblox Studs y Neón",
    concept:
      "Cada sector tiene texturas planas (Flats) para suelo y techo (si el techo es SKY_ROBLOX o SKY_CYBER verás el cielo panorámico 3D), y cada pared usa su textura central o de escalón.",
    howToTry:
      "Abre la pestaña Texturas para aplicar materiales Studs, Cuadrícula Neón, Dojo o Mármol Dorado al instante sobre tu nivel actual.",
    icon: Paintbrush,
  },
  {
    id: "objects",
    title: "4. Objetos, Vóxels y Modelos MD2/MD3",
    subtitle: "Da vida al escenario con avatares animados y recompensas",
    concept:
      "Puedes colocar actores (jugador, enemigos, botiquines), vóxels 3D (monedas, checkpoints, antorchas, consolas) y modelos poligonales MD2/MD3 animados (Caballeros, Samuráis, Cyber Mechs o Trofeos).",
    howToTry:
      "Pulsa un botón debajo para añadir un héroe 3D o un trofeo dorado justo frente a tu cámara y obsérvalo girar en el Visor 3D.",
    icon: Box,
  },
  {
    id: "cameras_roblox",
    title: "5. Cámaras, Menús 3D y Modo Roblox",
    subtitle: "Juego completo desde el editor, sin programar",
    concept:
      "Cambia entre Primera Persona (FPS), Tercera Persona con avatar animado, Vista Isométrica Action-RPG u Órbita cinematográfica. En la pestaña Menús diseñas la portada, el arma y el modo de juego.",
    howToTry:
      "Alterna la cámara, carga un mapa de ejemplo estilo Roblox Obby o Dojo de Pelea 3D y pulsa 'Probar Juego 3D' para jugarlo al instante.",
    icon: Camera,
  },
];

export const Mode8InteractiveTutorial: React.FC<Mode8InteractiveTutorialProps> = ({
  isOpen,
  onClose,
  sectorCount,
  linedefCount,
  placedObjectsCount,
  cameraMode,
  onSelectTool,
  onSwitchInspectorTab,
  onSwitchViewMode,
  onElevateCurrentSector,
  onBuildDemoStaircase,
  onApplyShowcasePalette,
  onPlaceShowcaseModel,
  onSetCameraMode,
  onLoadShowcasePreset,
  onToggleMenuPreview,
  onLaunchPlayableGame,
}) => {
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [minimized, setMinimized] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const step = STEPS[stepIdx];
  const StepIcon = step.icon;

  const markDone = (id: string) => {
    setCompletedSteps((prev) => ({ ...prev, [id]: true }));
  };

  if (minimized) {
    return (
      <div className="absolute bottom-3 left-3 z-40 bg-white border border-[#CBD5E1] rounded-xl shadow-xl px-3 py-2 flex items-center gap-2.5 text-xs">
        <GraduationCap className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
        <span className="font-bold text-[#111827]">
          Tutorial 3D ({stepIdx + 1}/{STEPS.length})
        </span>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="px-2 py-1 rounded-md bg-[#7C2D48] text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Expandir</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[#64748B] hover:text-[#111827] cursor-pointer"
          aria-label="Cerrar tutorial"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 left-3 z-40 w-[340px] sm:w-[400px] max-w-[calc(100%-24px)] max-h-[72dvh] flex flex-col bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden text-xs text-[#111827]">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-[#FDF2F5] border-b border-[#F3D0DC] flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <GraduationCap className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-extrabold text-[#7C2D48] text-xs truncate">
              Academia Interactiva Nivel 3D
            </div>
            <div className="text-[10px] text-[#4B5563]">
              Paso {stepIdx + 1} de {STEPS.length} · {sectorCount} sect · {linedefCount} lín · {placedObjectsCount} obj
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-white/80 text-[#4B5563] cursor-pointer"
            title="Minimizar tutorial"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/80 text-[#4B5563] cursor-pointer"
            title="Cerrar tutorial"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step progress bar tabs */}
      <div className="px-3 py-1.5 bg-[#F7F8FA] border-b border-[#E2E8F0] grid grid-cols-5 gap-1 flex-shrink-0">
        {STEPS.map((s, idx) => {
          const active = idx === stepIdx;
          const done = Boolean(completedSteps[s.id]);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStepIdx(idx)}
              className={`py-1 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 border cursor-pointer transition-colors ${
                active
                  ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                  : done
                  ? "bg-[#EEF6F1] text-[#2F6F4E] border-[#CFE4D7]"
                  : "bg-white text-[#4B5563] border-[#E2E8F0] hover:bg-[#F1F5F9]"
              }`}
            >
              {done && !active && <CheckCircle2 className="w-2.5 h-2.5" />}
              <span>{idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3 overflow-y-auto flex-1">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#7C2D48]/10 text-[#7C2D48] flex items-center justify-center flex-shrink-0">
            <StepIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-sm text-[#111827] leading-tight">{step.title}</h4>
            <p className="text-[11px] font-semibold text-[#7C2D48] mt-0.5">{step.subtitle}</p>
          </div>
        </div>

        <p className="text-[11.5px] leading-relaxed text-[#374151] bg-[#F7F8FA] p-2.5 rounded-xl border border-[#E2E8F0]">
          {step.concept}
        </p>

        <div className="text-[11px] leading-relaxed text-[#1F2937]">
          <strong className="text-[#2F6F4E] font-bold">Práctica guiada: </strong>
          {step.howToTry}
        </div>

        {/* Interactive Hands-On Step Controls */}
        <div className="pt-1 space-y-1.5">
          {step.id === "sectors" && (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSwitchViewMode("split");
                  onSelectTool("quickroom");
                  onSwitchInspectorTab("sector");
                  markDone(step.id);
                }}
                className="px-2.5 py-2 rounded-lg bg-[#7C2D48] hover:bg-[#66233a] text-white font-bold text-[11px] cursor-pointer"
              >
                Activar Sala Rápida 4×4
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchInspectorTab("sector");
                  onElevateCurrentSector(0.25);
                  markDone(step.id);
                }}
                className="px-2.5 py-2 rounded-lg bg-[#F7F8FA] hover:bg-[#E2E8F0] border border-[#CBD5E1] font-bold text-[11px] cursor-pointer"
              >
                Subir Suelo +0.25m
              </button>
            </div>
          )}

          {step.id === "walls_stairs" && (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSwitchViewMode("split");
                  onBuildDemoStaircase();
                  markDone(step.id);
                }}
                className="px-2.5 py-2 rounded-lg bg-[#7C2D48] hover:bg-[#66233a] text-white font-bold text-[11px] cursor-pointer"
              >
                Crear Escalera 3D Aquí
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTool("polyline");
                  onSwitchInspectorTab("sector");
                  markDone(step.id);
                }}
                className="px-2.5 py-2 rounded-lg bg-[#F7F8FA] hover:bg-[#E2E8F0] border border-[#CBD5E1] font-bold text-[11px] cursor-pointer"
              >
                Trazar Polígono Libre
              </button>
            </div>
          )}

          {step.id === "textures" && (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSwitchInspectorTab("textures");
                  onApplyShowcasePalette("roblox");
                  markDone(step.id);
                }}
                className="px-2.5 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-[11px] cursor-pointer"
              >
                Pintar Estilo Roblox Studs
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchInspectorTab("textures");
                  onApplyShowcasePalette("cyber");
                  markDone(step.id);
                }}
                className="px-2.5 py-2 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-cyan-300 font-bold text-[11px] cursor-pointer"
              >
                Pintar Cuadrícula Neón
              </button>
            </div>
          )}

          {step.id === "objects" && (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSwitchViewMode("split");
                  onPlaceShowcaseModel("blox_knight", "Caballero Redcliff");
                  markDone(step.id);
                }}
                className="px-2.5 py-2 rounded-lg bg-[#7C2D48] hover:bg-[#66233a] text-white font-bold text-[11px] cursor-pointer"
              >
                + Caballero 3D (MD2)
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchViewMode("split");
                  onPlaceShowcaseModel("trophy_star", "Trofeo Victoria");
                  markDone(step.id);
                }}
                className="px-2.5 py-2 rounded-lg bg-[#2F6F4E] hover:bg-[#255a3e] text-white font-bold text-[11px] cursor-pointer"
              >
                + Trofeo Estrella Oro
              </button>
            </div>
          )}

          {step.id === "cameras_roblox" && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: "fps" as const, label: "FPS" },
                  { id: "third_person" as const, label: "3ª Pers" },
                  { id: "isometric" as const, label: "Isométrica" },
                  { id: "orbit" as const, label: "Órbita" },
                ].map((camOpt) => (
                  <button
                    key={camOpt.id}
                    type="button"
                    onClick={() => {
                      onSwitchViewMode("split");
                      onSetCameraMode(camOpt.id);
                      markDone(step.id);
                    }}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                      cameraMode === camOpt.id
                        ? "bg-[#7C2D48] text-white border-[#7C2D48]"
                        : "bg-[#F7F8FA] text-[#111827] border-[#CBD5E1]"
                    }`}
                  >
                    {camOpt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onLoadShowcasePreset("preset_roblox_obby");
                    markDone(step.id);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#F7F8FA] hover:bg-[#E2E8F0] border border-[#CBD5E1] font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#7C2D48]" />
                  <span>Cargar Obby Roblox</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLoadShowcasePreset("preset_roblox_dojo");
                    markDone(step.id);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#F7F8FA] hover:bg-[#E2E8F0] border border-[#CBD5E1] font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Gamepad2 className="w-3 h-3 text-[#2F6F4E]" />
                  <span>Cargar Dojo Pelea 3D</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onSwitchInspectorTab("menus");
                    onToggleMenuPreview();
                    markDone(step.id);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F7F8FA] border border-[#CBD5E1] font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3 text-[#7C2D48]" />
                  <span>Ver Menú 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    markDone(step.id);
                    onLaunchPlayableGame();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#2F6F4E] hover:bg-[#255a3e] text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Probar Juego 3D</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="px-3.5 py-2 bg-[#F7F8FA] border-t border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={stepIdx === 0}
          className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white text-[#111827] font-semibold text-[11px] flex items-center gap-1 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>

        {stepIdx < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              markDone(step.id);
              setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
            }}
            className="px-3 py-1 rounded-lg bg-[#7C2D48] hover:bg-[#66233a] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <span>Siguiente Paso</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              markDone(step.id);
              onClose();
            }}
            className="px-3 py-1 rounded-lg bg-[#2F6F4E] hover:bg-[#255a3e] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completar Guía</span>
          </button>
        )}
      </div>
    </div>
  );
};
