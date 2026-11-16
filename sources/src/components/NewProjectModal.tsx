import React, { useState } from "react";
import {
  X,
  Sparkles,
  FolderPlus,
  Monitor,
  Layers,
  Gamepad2,
  Rocket,
  Sword,
  Check,
  Box,
  Compass,
  Globe,
  Database,
  Layout,
  Smartphone,
  Cpu,
  Flame,
  BarChart3,
  Lock,
  FileText,
  Calculator,
  Paintbrush,
  Brain,
} from "lucide-react";
import { PRESETS } from "../engine/presets";
import { DivGraphic } from "../types";
import { DEFAULT_SPRITES } from "../engine/graphics";
import { APP_TEMPLATES } from "../engine/appTemplates";
import { COGNITIVE_STARTERS } from "./WineboxEcosystemModal";

export type ProjectKind = "all" | "cognitive" | "game" | "app" | "web" | "database";

export interface NewProjectData {
  title: string;
  resolution: "320x200" | "640x480" | "800x600";
  code: string;
  presetId?: string;
  sprites: DivGraphic[];
  targetPlatform?: "all" | "web" | "android" | "desktop";
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (data: NewProjectData) => void;
  hasUnsavedChanges?: boolean;
  onOpenWebWizard?: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  hasUnsavedChanges = false,
  onOpenWebWizard,
}) => {
  const [activeCategory, setActiveCategory] = useState<ProjectKind>("all");
  const [title, setTitle] = useState("Mi_Proyecto_DIV");
  const [resolution, setResolution] = useState<"320x200" | "640x480" | "800x600">("640x480");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("empty");
  const [includeDefaultSprites, setIncludeDefaultSprites] = useState(true);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [targetPlatform, setTargetPlatform] = useState<"all" | "web" | "android" | "desktop">("all");

  if (!isOpen) return null;

  const ALL_TEMPLATES = [
    // --- 1. Empty / Base ---
    {
      id: "empty",
      category: "game" as const,
      name: "Proyecto Vacío (Plantilla Base DIV)",
      icon: FolderPlus,
      badge: "DIV 2D",
      color: "text-cyan-400",
      description: "Estructura limpia DIV Games Studio con PROGRAM, GLOBAL, proceso principal jugador e input táctil/teclado.",
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

    // Disparo / Acción
    IF (key(_space) || key(_enter))
      sound(1, 80, 320);
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

    // --- 2. Games ---
    {
      id: "space_shooter",
      category: "game" as const,
      name: "Arcade Espacial (Galaxy Defender)",
      icon: Rocket,
      badge: "Arcade 2D",
      color: "text-amber-400",
      description: "Shooter vertical con campo de estrellas procedural, láseres, enemigos alienígenas, asteroides y explosiones.",
      code: PRESETS.find((p) => p.id === "space_shooter")?.code || "",
    },
    {
      id: "platformer",
      category: "game" as const,
      name: "Aventura Plataformas (Pixel Knight)",
      icon: Sword,
      badge: "Plataformas",
      color: "text-emerald-400",
      description: "Plataformas con caballero, saltos, gravedad, plataformas flotantes, monedas de oro y enemigos patrulla.",
      code: PRESETS.find((p) => p.id === "platformer")?.code || "",
    },
    {
      id: "cyber_pong",
      category: "game" as const,
      name: "Cyber Pong 3000 (Física & IA)",
      icon: Gamepad2,
      badge: "Retro IA",
      color: "text-purple-400",
      description: "Clásico arcade retro con física de rebote, CPU inteligente que sigue la pelota y marcadores dinámicos.",
      code: PRESETS.find((p) => p.id === "cyber_pong")?.code || "",
    },
    {
      id: "mode7_kart",
      category: "game" as const,
      name: "DIV Super Kart 3D (Modo 7 SNES)",
      icon: Compass,
      badge: "Modo 7 3D",
      color: "text-rose-400",
      description: "Carreras semi-3D con plano en perspectiva Modo 7, karts rivales, árboles, monedas y física de conducción.",
      code: PRESETS.find((p) => p.id === "mode7_kart")?.code || "",
    },
    {
      id: "mode8_dungeon",
      category: "game" as const,
      name: "Roblox Obby Tower 3D (Modo 8)",
      icon: Box,
      badge: "Roblox 3D",
      color: "text-amber-500",
      description: "Circuito 3D estilo Roblox Studs con plataformas ascendentes, piscina neón, monedas, checkpoints, enemigos IA activos y cámara 3ª Persona / FPS.",
      code: PRESETS.find((p) => p.id === "mode8_dungeon")?.code || "",
    },
    {
      id: "hexen_citadel_3d",
      category: "game" as const,
      name: "Roblox Sky Citadel 3D (Aventura)",
      icon: Box,
      badge: "Roblox 3D",
      color: "text-yellow-500",
      description: "Ciudadela celestial de mármol y oro estilo Roblox con terrazas escalonadas, cofres, escoltas Redcliff y Titán activo.",
      code: PRESETS.find((p) => p.id === "hexen_citadel_3d")?.code || "",
    },
    {
      id: "div2_modo8_raycast",
      category: "game" as const,
      name: "Roblox Dojo de Pelea 3D (DIV 2)",
      icon: Sword,
      badge: "Dojo 3D",
      color: "text-emerald-500",
      description: "Arena marcial estilo Roblox Dojo con tatami en dos alturas, antorchas, espadas 3D y duelistas Samurái activos.",
      code: PRESETS.find((p) => p.id === "div2_modo8_raycast")?.code || "",
    },
    {
      id: "modo8_dark_md2_workers",
      category: "game" as const,
      name: "Roblox Cyber Base 3D (Sci-Fi)",
      icon: Cpu,
      badge: "Cyber 3D",
      color: "text-cyan-500",
      description: "Base futurista estilo Roblox Cyber Neón con plataforma reactor, terminales digitales y Cyber Mechs patrullando.",
      code: PRESETS.find((p) => p.id === "modo8_dark_md2_workers")?.code || "",
    },
    {
      id: "doom_modo8_classic",
      category: "game" as const,
      name: "Base Espacial Blox E1M1 (Modo 8)",
      icon: Flame,
      badge: "Shooter 3D",
      color: "text-red-500",
      description: "Patio modular estilo Roblox Studs con escalera de 4 peldaños hacia cubierta dorada, enemigos activos, escopeta 3D y cámara 3ª Persona / FPS.",
      code: PRESETS.find((p) => p.id === "doom_modo8_classic")?.code || "",
    },

    // --- 3. Apps & Productivity ---
    {
      id: "app_text_editor",
      category: "app" as const,
      name: "Editor de Texto con Menús & Scroll (Notepad WXDIV)",
      icon: FileText,
      badge: "Notepad MDI",
      color: "text-blue-400",
      description: "Editor de texto completo con menús reales (Archivo, Edición, Formato, Ayuda), barra de herramientas, área de texto multilínea con scroll y barra de estado.",
      code: APP_TEMPLATES.find((t) => t.id === "app_text_editor")?.code || "",
    },
    {
      id: "app_paint_canvas",
      category: "app" as const,
      name: "Paint 2D Canvas (Herramientas, Paleta & Dibujo)",
      icon: Paintbrush,
      badge: "Canvas 2D",
      color: "text-pink-400",
      description: "Aplicación de dibujo gráfico en Canvas 2D: paleta de 16 colores VGA, lápiz, pincel, borrador, formas geométricas y selector de tamaño.",
      code: APP_TEMPLATES.find((t) => t.id === "app_paint_canvas")?.code || "",
    },
    {
      id: "app_calculator_sci",
      category: "app" as const,
      name: "Calculadora Estándar & Científica (Calc WXDIV)",
      icon: Calculator,
      badge: "Calc MDI",
      color: "text-amber-400",
      description: "Calculadora estilo Visual MDI Engine con pantalla LCD, historial de operaciones, teclado numérico, operadores matemáticos (+, -, *, /, =) y memoria.",
      code: APP_TEMPLATES.find((t) => t.id === "app_calculator_sci")?.code || "",
    },
    {
      id: "game_arcade_canvas",
      category: "game" as const,
      name: "Juego Arcade 2D con Canvas & Código DIV Integrado",
      icon: Gamepad2,
      badge: "Canvas MDI",
      color: "text-emerald-400",
      description: "Juego arcade 2D en lienzo Canvas PictureBox con código DIV editable simultáneamente en el editor integrado (estilo ActiveX en Visual MDI Engine).",
      code: APP_TEMPLATES.find((t) => t.id === "game_arcade_canvas")?.code || "",
    },
    {
      id: "app_vb_forms",
      category: "app" as const,
      name: "Visual MDI Engine Form Suite (Multi-Form)",
      icon: Layout,
      badge: "Visual MDI",
      color: "text-sky-400",
      description: "Entorno Multi-Form estilo Visual MDI Engine: FormPrincipal con barra de herramientas, ventana de clientes, diálogo modal y persistencia reactiva.",
      code: APP_TEMPLATES.find((t) => t.id === "app_vb_forms")?.code || "",
    },
    {
      id: "app_login",
      category: "app" as const,
      name: "Formulario de Login & Registro (Visual MDI engine)",
      icon: Lock,
      badge: "Visual MDI Auth",
      color: "text-amber-400",
      description: "Formulario de autenticación clásico estilo Visual MDI engine con cajas de texto, validación reactiva, recordar contraseña y diálogos modales.",
      code: APP_TEMPLATES.find((t) => t.id === "app_login")?.code || "",
    },
    {
      id: "app_dashboard",
      category: "app" as const,
      name: "Dashboard Analítico Ejecutivo (KPIs & Métricas)",
      icon: BarChart3,
      badge: "Analytics",
      color: "text-cyan-400",
      description: "Panel de métricas con tarjetas KPI, gráficos interactivos de barras, filtros de fecha y tabla de transacciones en tiempo real.",
      code: APP_TEMPLATES.find((t) => t.id === "app_dashboard")?.code || "",
    },
    {
      id: "app_todo_store",
      category: "app" as const,
      name: "Gestor de Tareas & Proyectos (Todo Pro)",
      icon: Smartphone,
      badge: "Touch UI",
      color: "text-emerald-400",
      description: "App completa con login, almacén reactivo (STORE), pestañas de filtro, persistencia local (save_json) y métricas.",
      code: APP_TEMPLATES.find((t) => t.id === "app_todo_store")?.code || "",
    },

    // --- 4. Web & Landing Generator ---
    {
      id: "app_landing",
      category: "web" as const,
      name: "Landing Page Moderna (SaaS & Producto)",
      icon: Globe,
      badge: "Landing Page",
      color: "text-emerald-400",
      description: "Página de aterrizaje responsiva con barra de navegación, hero banner, tarjetas de servicios y formulario de captación de leads.",
      code: APP_TEMPLATES.find((t) => t.id === "app_landing")?.code || "",
    },
    {
      id: "web_landing_generator",
      category: "web" as const,
      name: "Generador de Landings & Webs Dinámicas",
      icon: Globe,
      badge: "Web / Landing",
      color: "text-sky-300",
      description: "Generador visual de Sitios Web y Landings con Hero Section, Call to Action, Grilla de características, Precios y Formulario de Leads.",
      code: APP_TEMPLATES.find((t) => t.id === "web_landing_generator")?.code || "",
    },

    // --- 5. Databases & SQL ---
    {
      id: "db_crud_sqlite",
      category: "database" as const,
      name: "Gestor de Base de Datos SQLite & Formulario CRUD",
      icon: Database,
      badge: "SQLite DB",
      color: "text-amber-400",
      description: "Base de datos relacional con tablas, consultas SQL SELECT/INSERT, vista de grilla y sincronización persistente.",
      code: APP_TEMPLATES.find((t) => t.id === "db_crud_sqlite")?.code || "",
    },

    // --- 6. Estimulación Cognitiva (Winebox Clinic / Cloud) ---
    ...COGNITIVE_STARTERS.map((c) => ({
      id: c.id,
      category: "cognitive" as const,
      name: c.title,
      icon: Brain,
      badge: "Winebox Cognitiva",
      color: "text-[#7C2D48]",
      description: c.description,
      code: c.code,
    })),
  ];

  // Filter templates by active category
  const filteredTemplates = activeCategory === "all"
    ? ALL_TEMPLATES
    : ALL_TEMPLATES.filter((t) => t.category === activeCategory);

  const handleCreate = () => {
    if (hasUnsavedChanges && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }

    const tpl = ALL_TEMPLATES.find((t) => t.id === selectedTemplate) || ALL_TEMPLATES[0];
    onCreateProject({
      title: title.trim() || "Mi_Proyecto_DIV",
      resolution,
      code: tpl.code,
      presetId: tpl.id !== "empty" ? tpl.id : undefined,
      sprites: includeDefaultSprites ? DEFAULT_SPRITES : [],
      targetPlatform,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 select-none font-sans">
      <div className="w-full max-w-3xl bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-[#F7F8FA] border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7C2D48] flex items-center justify-center text-white shrink-0">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-[#111827] text-sm tracking-tight truncate">Nuevo Proyecto WXDIV</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F3E8EC] text-[#7C2D48] border border-[#E5C9D3]">
                  Studio
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] truncate">Elige una plantilla de juego, app, web o base de datos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-w-[40px] min-h-[40px] rounded-xl bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#4B5563] hover:text-[#111827] transition-colors flex items-center justify-center shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-white border-b border-[#E2E8F0] overflow-x-auto">
          {[
            { id: "all", label: "Todos", icon: Layers, count: ALL_TEMPLATES.length },
            { id: "cognitive", label: "Estimulación Cognitiva", icon: Brain, count: ALL_TEMPLATES.filter(t => t.category === "cognitive").length },
            { id: "game", label: "Videojuegos", icon: Gamepad2, count: ALL_TEMPLATES.filter(t => t.category === "game").length },
            { id: "app", label: "Aplicaciones", icon: Layout, count: ALL_TEMPLATES.filter(t => t.category === "app").length },
            { id: "web", label: "Landings & Webs", icon: Globe, count: ALL_TEMPLATES.filter(t => t.category === "web").length },
            { id: "database", label: "Bases de Datos", icon: Database, count: ALL_TEMPLATES.filter(t => t.category === "database").length },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as ProjectKind)}
                className={`px-3 min-h-[38px] rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#7C2D48] border-[#7C2D48] text-white"
                    : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563] hover:text-[#111827] hover:bg-[#F1F5F9]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#6B7280]"}`} />
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${isActive ? "bg-white/20 text-white" : "bg-white text-[#6B7280] border border-[#E2E8F0]"}`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto text-xs space-y-4 text-[#111827] bg-[#F7F8FA]">
          {/* Project Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
            {/* Project Name */}
            <div>
              <label className="block text-[#374151] font-semibold mb-1.5 text-xs">
                Nombre del Proyecto
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.replace(/[^a-zA-Z0-9_\-\s]/g, ""))}
                placeholder="Ej. Mi_App_Studio"
                className="w-full px-3 py-2.5 min-h-[42px] bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl text-[#111827] text-xs font-mono outline-none focus:border-[#7C2D48] focus:bg-white transition-colors"
              />
            </div>

            {/* Target Platform */}
            <div>
              <label className="block text-[#374151] font-semibold mb-1.5 text-xs">
                Plataforma Principal
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "all", label: "Universal", sub: "Web + Móvil" },
                  { id: "android", label: "Android", sub: "APK / Touch" },
                  { id: "web", label: "Web / PWA", sub: "HTML5" },
                ].map((plt) => (
                  <button
                    key={plt.id}
                    type="button"
                    onClick={() => setTargetPlatform(plt.id as any)}
                    className={`px-2 py-2 min-h-[42px] rounded-xl border text-center transition-all cursor-pointer ${
                      targetPlatform === plt.id
                        ? "border-[#7C2D48] bg-[#FBF6F8] text-[#7C2D48] font-bold"
                        : "border-[#E2E8F0] bg-[#F7F8FA] text-[#4B5563] hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="text-[11px] leading-tight">{plt.label}</div>
                    <div className="text-[9px] text-[#6B7280]">{plt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resolution Selector */}
          <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
            <label className="text-[#374151] font-semibold mb-2 text-xs flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-[#7C2D48]" />
              <span>Resolución del Lienzo Virtual</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "320x200", label: "m320x200", desc: "Retro Pixel Art" },
                { id: "640x480", label: "m640x480", desc: "Estándar Apps y Juegos" },
                { id: "800x600", label: "m800x600", desc: "Alta Resolución" },
              ].map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => setResolution(res.id as any)}
                  className={`p-2.5 min-h-[44px] rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                    resolution === res.id
                      ? "border-[#7C2D48] bg-[#FBF6F8] text-[#7C2D48]"
                      : "border-[#E2E8F0] bg-[#F7F8FA] text-[#4B5563] hover:border-[#CBD5E1]"
                  }`}
                >
                  <span className="font-mono font-bold text-xs">{res.label}</span>
                  <span className="text-[10px] text-[#6B7280] mt-0.5">{res.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dedicated Web Wizard Banner when browsing Web or All */}
          {onOpenWebWizard && (activeCategory === "web" || activeCategory === "all") && (
            <div className="p-3.5 rounded-xl bg-[#FDF2F5] border border-[#F3D0DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#7C2D48] text-white flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#111827]">
                    Asistente Guiado de Páginas Web, Tiendas y Landings
                  </div>
                  <p className="text-[11px] text-[#4B5563] mt-0.5 leading-relaxed">
                    Elige tu tipo de web, personaliza precios, testimonios, FAQ o pedidos y síguela editando con AURA IA.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWebWizard();
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Abrir Asistente Web</span>
              </button>
            </div>
          )}

          {/* Template Choice */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[#374151] font-semibold text-xs">
                <Layers className="w-3.5 h-3.5 text-[#7C2D48]" />
                <span>Plantilla Inicial ({filteredTemplates.length})</span>
              </div>
              <span className="text-[10px] text-[#6B7280]">Toca para elegir</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {filteredTemplates.map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                      isSelected
                        ? "border-[#7C2D48] bg-white ring-1 ring-[#7C2D48]/30 shadow-sm"
                        : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-[#7C2D48] text-white" : "bg-[#F7F8FA] text-[#4B5563] border border-[#E2E8F0]"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-bold text-xs truncate ${isSelected ? "text-[#7C2D48]" : "text-[#111827]"}`}>
                          {tpl.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#F7F8FA] text-[#4B5563] border border-[#E2E8F0]">
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] leading-relaxed line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[36px]">
              <input
                type="checkbox"
                checked={includeDefaultSprites}
                onChange={(e) => setIncludeDefaultSprites(e.target.checked)}
                className="w-4 h-4 rounded border-[#CBD5E1] accent-[#7C2D48]"
              />
              <span className="text-xs text-[#374151]">
                Incluir biblioteca inicial de gráficos FPG
              </span>
            </label>
          </div>

          {/* Unsaved changes alert */}
          {hasUnsavedChanges && confirmOverwrite && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <strong>Atención:</strong> Tu proyecto actual será reemplazado por la nueva plantilla. Pulsa confirmar para continuar.
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 sm:px-5 py-3.5 bg-white border-t border-[#E2E8F0] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 min-h-[44px] rounded-xl bg-[#F7F8FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#4B5563] font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-5 min-h-[44px] rounded-xl bg-[#7C2D48] hover:bg-[#66233A] text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{confirmOverwrite ? "Confirmar y Crear" : "Crear Proyecto"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
