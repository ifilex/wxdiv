import React, { useState } from "react";
import { X, Sparkles, FolderPlus, Monitor, Layers, Gamepad2, Rocket, Sword, Check, Box, Compass } from "lucide-react";
import { PRESETS } from "../engine/presets";
import { DivGraphic } from "../types";
import { DEFAULT_SPRITES } from "../engine/graphics";

export interface NewProjectData {
  title: string;
  resolution: "320x200" | "640x480" | "800x600";
  code: string;
  presetId?: string;
  sprites: DivGraphic[];
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (data: NewProjectData) => void;
  hasUnsavedChanges?: boolean;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  hasUnsavedChanges = false,
}) => {
  const [title, setTitle] = useState("Mi_Juego_DIV");
  const [resolution, setResolution] = useState<"320x200" | "640x480" | "800x600">("640x480");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("empty");
  const [includeDefaultSprites, setIncludeDefaultSprites] = useState(true);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  if (!isOpen) return null;

  const templates = [
    {
      id: "empty",
      name: "Proyecto Vacío (Plantilla Base)",
      icon: FolderPlus,
      color: "text-cyan-400",
      description: "Estructura limpia DIV Games Studio con PROGRAM, GLOBAL, proceso principal jugador e input de teclas.",
      code: `PROGRAM mi_juego_div;

GLOBAL
  fpg_juego = 0;
  fnt_retro = 0;
  score = 0;
  vidas = 3;

LOCAL
  velocidad = 5;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(10, 15, 30));

  // Carga explícita de recursos gráficos FPG y fuentes FNT (DIV Games Studio)
  fpg_juego = load_fpg("juego.fpg");
  fnt_retro = load_fnt("arcade.fnt");

  write(fnt_retro, 20, 25, 0, "MI JUEGO DIV - PROYECTO NUEVO");
  write_int(fnt_retro, 20, 50, 0, &score);
  write_int(fnt_retro, 520, 50, 0, &vidas);

  // Iniciar proceso del jugador
  jugador(320, 240);

  LOOP
    FRAME;
  END
END

PROCESS jugador(x, y)
BEGIN
  file = fpg_juego;
  graph = 1; // Sprite gráfico del jugador
  size = 120;
  LOOP
    IF (key(_left) || key(_a))  x -= velocidad; END
    IF (key(_right) || key(_d)) x += velocidad; END
    IF (key(_up) || key(_w))    y -= velocidad; END
    IF (key(_down) || key(_s))  y += velocidad; END

    // Límites de pantalla
    IF (x < 20) x = 20; END
    IF (x > 620) x = 620; END
    IF (y < 20) y = 20; END
    IF (y > 460) y = 460; END

    // Acción / Disparo
    IF (key(_space) || key(_enter))
      sound(1, 80, 320); // Sonido retro
      destello(x, y);
    END

    FRAME;
  END
END

PROCESS destello(x, y)
PRIVATE
  t = 8;
BEGIN
  file = fpg_juego;
  graph = 2;
  WHILE (t > 0)
    t--;
    size += 15;
    FRAME;
  END
END
`,
    },
    {
      id: "space_shooter",
      name: "Arcade Espacial (Galaxy Defender)",
      icon: Rocket,
      color: "text-amber-400",
      description: "Shooter vertical con campo de estrellas procedural, láseres, enemigos alienígenas, asteroides y explosiones.",
      code: PRESETS[0].code,
    },
    {
      id: "platformer",
      name: "Aventura Plataformas (Pixel Knight)",
      icon: Sword,
      color: "text-emerald-400",
      description: "Plataformas con caballero, saltos, gravedad, plataformas flotantes, monedas de oro y enemigos patrulla.",
      code: PRESETS[1].code,
    },
    {
      id: "cyber_pong",
      name: "Cyber Pong 3000 (Física & IA)",
      icon: Gamepad2,
      color: "text-purple-400",
      description: "Clásico arcade retro con física de rebote, CPU inteligente que sigue la pelota y marcadores dinámicos.",
      code: PRESETS[2].code,
    },
    {
      id: "mode7_kart",
      name: "DIV Super Kart 3D (Modo 7 SNES)",
      icon: Compass,
      color: "text-rose-400",
      description: "Carreras semi-3D con plano en perspectiva Modo 7, karts rivales, árboles, monedas y física de conducción.",
      code: PRESETS[3].code,
    },
    {
      id: "mode8_dungeon",
      name: "Dungeon Crypt 3D (Modo 8 Raycaster FPS)",
      icon: Box,
      color: "text-amber-300",
      description: "Motor 3D Raycasting estilo Wolfenstein / Catacomb con paredes texturizadas, monstruos 3D, niebla y arma de plasma.",
      code: PRESETS[4].code,
    },
    {
      id: "doom_modo8_classic",
      name: "DOOM 1993: Hangar E1M1 (Modo 8 FPS)",
      icon: Box,
      color: "text-red-400",
      description: "FPS 3D clásico en Modo 8 con escopeta corredera en primera persona, imps demoníacos, efectos sonoros y automapa.",
      code: PRESETS[PRESETS.length - 1].code,
    },
  ];

  const handleCreate = () => {
    if (hasUnsavedChanges && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }

    const tpl = templates.find((t) => t.id === selectedTemplate) || templates[0];
    onCreateProject({
      title: title.trim() || "Mi_Juego_DIV",
      resolution,
      code: tpl.code,
      presetId: tpl.id !== "empty" ? tpl.id : undefined,
      sprites: includeDefaultSprites ? DEFAULT_SPRITES : [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#080d1a] border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d1527] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100 text-sm">Crear Nuevo Proyecto WXDIV 3.0</h2>
              <p className="text-[10px] text-slate-400">Configura los parámetros iniciales de tu nuevo videojuego</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto text-xs space-y-4 text-slate-200">
          {/* Project Name */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 text-xs">
              Nombre del Proyecto:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.replace(/[^a-zA-Z0-9_\-\s]/g, ""))}
              placeholder="Ej. Mi_Juego_DIV"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {/* Resolution Selector */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 text-xs flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
              <span>Resolución de Pantalla Virtual:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "320x200", label: "m320x200", desc: "Retro DOS VGA" },
                { id: "640x480", label: "m640x480", desc: "DIV Games Studio" },
                { id: "800x600", label: "m800x600", desc: "SVGA Alta Res" },
              ].map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => setResolution(res.id as any)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col transition-all ${
                    resolution === res.id
                      ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-sm"
                      : "border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="font-mono font-bold text-xs">{res.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{res.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Template Choice */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Plantilla Inicial:</span>
            </label>
            <div className="space-y-2">
              {templates.map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-3 rounded-lg border cursor-pointer flex items-start gap-3 transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/30 shadow-md"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-cyan-900/70 text-cyan-300" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-xs ${isSelected ? "text-cyan-300" : "text-slate-200"}`}>
                          {tpl.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extra options */}
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDefaultSprites}
                onChange={(e) => setIncludeDefaultSprites(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-slate-300">
                Incluir biblioteca de sprites retro en FPG (Nave, Aliens, Monedas, Caballero, etc.)
              </span>
            </label>
          </div>

          {/* Unsaved changes alert */}
          {hasUnsavedChanges && confirmOverwrite && (
            <div className="p-3 bg-amber-950/70 border border-amber-800/80 rounded-lg text-amber-200 text-xs">
              ⚠️ <strong>Advertencia:</strong> Tu código actual será reemplazado por la nueva plantilla. ¿Deseas continuar?
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 bg-[#0a1020] border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950/50 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{confirmOverwrite ? "Confirmar y Crear" : "Crear Proyecto"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
