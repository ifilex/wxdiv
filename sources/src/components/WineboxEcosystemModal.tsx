import React from "react";
import {
  Brain,
  Code2,
  Compass,
  ExternalLink,
  Gamepad2,
  HeartHandshake,
  Layers,
  Play,
  Sparkles,
  Users,
  X,
} from "lucide-react";

interface CognitiveStarter {
  id: string;
  title: string;
  focus: string;
  description: string;
  code: string;
}

export const COGNITIVE_STARTERS: CognitiveStarter[] = [
  {
    id: "cog_attention_reflex",
    title: "Atención y Velocidad de Respuesta",
    focus: "Estimulación Cognitiva · Atención Selectiva",
    description:
      "Ejercicio visual para entrenar atención sostenida y tiempos de reacción: el usuario sigue el objetivo con flechas o toque y suma aciertos.",
    code: `PROGRAM estimulacion_atencion;

GLOBAL
  aciertos = 0;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(20, 32, 48));
  write(0, 24, 24, 0, "ENTRENAMIENTO DE ATENCION SELECTIVA");
  write(0, 24, 48, 0, "ACIERTOS:");
  write_int(0, 120, 48, 0, &aciertos);
  puntero_atencion();
  objetivo_estimulo(220, 240);
  objetivo_estimulo(440, 280);
  LOOP
    FRAME;
  END
END

PROCESS puntero_atencion()
BEGIN
  graph = 1;
  x = 320;
  y = 360;
  LOOP
    IF (key(_right) AND x < 610) x += 5; END
    IF (key(_left)  AND x > 30)  x -= 5; END
    IF (key(_up)    AND y > 70)  y -= 5; END
    IF (key(_down)  AND y < 450) y += 5; END
    FRAME;
  END
END

PROCESS objetivo_estimulo(x, y)
BEGIN
  graph = 3;
  LOOP
    IF (collision(type puntero_atencion))
      aciertos += 1;
      x = rand(70, 570);
      y = rand(100, 420);
    END
    FRAME;
  END
END`,
  },
  {
    id: "cog_memory_patrol",
    title: "Seguimiento Visual y Coordinación",
    focus: "Estimulación Cognitiva · Coordinación Visomotora",
    description:
      "Actividad de seguimiento visomotor y anticipación espacial con estímulos en movimiento suave y puntuación positiva sin penalización punitiva.",
    code: `PROGRAM coordinacion_visomotora;

GLOBAL
  puntos = 0;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(18, 38, 34));
  write(0, 24, 24, 0, "COORDINACION VISOMOTORA · WINEBOX CLOUD");
  write(0, 24, 48, 0, "LOGROS:");
  write_int(0, 110, 48, 0, &puntos);
  cursor_terapia();
  estimulo_movil(180, 200);
  estimulo_movil(460, 320);
  LOOP
    FRAME;
  END
END

PROCESS cursor_terapia()
BEGIN
  graph = 1;
  x = 320;
  y = 400;
  LOOP
    IF (key(_right) AND x < 610) x += 5; END
    IF (key(_left)  AND x > 30)  x -= 5; END
    IF (key(_up)    AND y > 70)  y -= 5; END
    IF (key(_down)  AND y < 450) y += 5; END
    FRAME;
  END
END

PROCESS estimulo_movil(x, y)
PRIVATE
  vx = 2;
BEGIN
  graph = 3;
  LOOP
    x += vx;
    IF (x < 50 OR x > 590) vx = -vx; END
    IF (collision(type cursor_terapia))
      puntos += 10;
      y = rand(110, 390);
    END
    FRAME;
  END
END`,
  },
  {
    id: "cog_clinical_session_app",
    title: "Registro de Sesión y Ejercicios (App)",
    focus: "Aplicativo Profesional · Clínica / Educación",
    description:
      "Panel visual claro para profesionales que desean registrar sesiones, tareas o seguimiento sin escribir código.",
    code: `PROGRAM panel_profesional_winebox;

BEGIN
  set_mode(m800x600);
  set_fps(60);
  set_html5_mode(1);
  web_page("Winebox Clinic · Panel de Sesión", "#F7F8FA", "#7C2D48");
  web_navbar("Winebox Clinic", "Sesiones", "Ejercicios", "Consola Cloud");
  web_hero("Panel de Estimulación y Seguimiento", "Crea actividades personalizadas y aplicativos profesionales para tus sesiones sin conocimientos técnicos.", "Iniciar Actividad", "#7C2D48");
  web_stat("Área Principal", "Atención y Memoria", "Consola", "winebox.cloud", "Comunidad", "winebox.clinic");
  web_feature("1. Fácil para Profesionales", "Diseña ejercicios visuales y formularios claros en minutos.", "2. Consola Cognitiva", "Compatible con Winebox Cloud para sesiones guiadas.", "3. Comunidad Abierta", "Comparte y adapta actividades con otros especialistas en Winebox Clinic.");
  web_footer("Compilado con WXDIV Studio para winebox.clinic y winebox.cloud");
  LOOP
    FRAME;
  END
END`,
  },
];

interface WineboxEcosystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCode?: (code: string, runImmediately?: boolean, title?: string) => void;
  onOpenAiWithPrompt?: (prompt?: string) => void;
  onOpenExport?: () => void;
}

export const WineboxEcosystemModal: React.FC<WineboxEcosystemModalProps> = ({
  isOpen,
  onClose,
  onLoadCode,
  onOpenAiWithPrompt,
  onOpenExport,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="winebox-ecosystem-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl h-[92dvh] sm:h-auto max-h-[92dvh] bg-white rounded-t-2xl sm:rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-white flex-shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#7C2D48] text-white flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="winebox-ecosystem-title"
                className="text-sm sm:text-base font-bold text-[#111827] truncate"
              >
                Compilador Oficial · Winebox Clinic &amp; Consola Cognitiva
              </h2>
              <p className="text-[11px] sm:text-xs text-[#6B7280] truncate">
                Enlazado a winebox.clinic (comunidad) y winebox.cloud (consola cognitiva)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-xl hover:bg-slate-100 text-[#4B5563] flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label="Cerrar ecosistema Winebox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F7F8FA]">
          {/* Ecosystem Overview */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-5 space-y-3">
            <div className="text-xs font-bold text-[#7C2D48]">
              Puente entre profesionales sin conocimientos técnicos y desarrolladores
            </div>
            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
              Este entorno actúa como compilador oficial para la comunidad{" "}
              <strong>winebox.clinic</strong> y la consola cognitiva{" "}
              <strong>winebox.cloud</strong>. Permite crear{" "}
              <strong>apps y juegos de estimulación cognitiva</strong> y aplicativos
              profesionales sin necesitar conocimientos técnicos, además de ofrecer un
              entorno completo para programadores que buscan desarrollar juegos de forma
              ágil o profesional.
            </p>

            {/* Direct Ecosystem Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href="https://winebox.clinic"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[68px] p-3.5 rounded-xl bg-[#FDF2F5] hover:bg-[#FCE7EE] border border-[#F3D0DC] flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Users className="w-5 h-5 text-[#7C2D48] flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#111827] truncate">
                      winebox.clinic
                    </div>
                    <div className="text-[11px] text-[#4B5563]">
                      Comunidad Winebox · Aplicativos y proyectos compartidos
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
              </a>

              <a
                href="https://winebox.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[68px] p-3.5 rounded-xl bg-[#EEF6F1] hover:bg-[#E2EFE8] border border-[#CFE4D7] flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Brain className="w-5 h-5 text-[#2F6F4E] flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#111827] truncate">
                      winebox.cloud
                    </div>
                    <div className="text-[11px] text-[#4B5563]">
                      La Consola Cognitiva · Juegos y apps de estimulación
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#2F6F4E] flex-shrink-0" />
              </a>
            </div>
          </div>

          {/* Two Profiles: Professionals vs Programmers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] space-y-2">
              <div className="flex items-center gap-2 text-[#7C2D48] font-bold text-xs sm:text-sm">
                <HeartHandshake className="w-4 h-4 flex-shrink-0" />
                <span>Profesionales (Sin conocimientos técnicos)</span>
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Psicólogos, terapeutas ocupacionales, docentes, neurólogos y especialistas
                pueden crear sus propios ejercicios de estimulación cognitiva o
                aplicativos de apoyo profesional con bloques, diseño visual o dictado
                por voz con la IA local.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] space-y-2">
              <div className="flex items-center gap-2 text-[#2F6F4E] font-bold text-xs sm:text-sm">
                <Gamepad2 className="w-4 h-4 flex-shrink-0" />
                <span>Programadores (Desarrollo ágil y profesional)</span>
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Escribe directamente en sintaxis DIV Games Studio, diseña mapas 3D Modo 8,
                paquetes FPG y exporta paquetes HTML5, React o proyectos Android Studio
                listos para publicar en Winebox o tiendas móviles.
              </p>
            </div>
          </div>

          {/* Cognitive Stimulation Starters */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">
                  Plantillas para Estimulación Cognitiva y Uso Profesional
                </h3>
                <p className="text-xs text-[#4B5563]">
                  Carga un ejemplo listo para probar, adáptalo con la IA o expórtalo a Winebox Cloud / Clinic.
                </p>
              </div>
              {onOpenAiWithPrompt && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAiWithPrompt(
                      "Crea un juego sencillo de estimulación cognitiva para entrenar memoria y atención con botones grandes y puntuación positiva"
                    );
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#FDF2F5] hover:bg-[#FCE7EE] border border-[#F3D0DC] text-[#7C2D48] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Crear con AURA IA</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {COGNITIVE_STARTERS.map((starter) => (
                <div
                  key={starter.id}
                  className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-[11px] font-semibold text-[#7C2D48]">
                      {starter.focus}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#111827]">
                      {starter.title}
                    </div>
                    <p className="text-xs text-[#4B5563] leading-snug">
                      {starter.description}
                    </p>
                  </div>
                  {onLoadCode && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onLoadCode(starter.code, true, starter.title);
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Probar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onLoadCode(starter.code, false, starter.title);
                        }}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#111827] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Code2 className="w-3.5 h-3.5 text-[#7C2D48]" />
                        <span>Editar</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#4B5563]">
            <Compass className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
            <span>Compilador integrado para winebox.clinic y winebox.cloud</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenExport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExport();
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Compilar y Exportar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F7F8FA] hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold text-[#111827] cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
