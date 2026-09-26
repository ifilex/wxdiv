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
} from "lucide-react";
import { PRESETS } from "../engine/presets";
import { DivGraphic } from "../types";
import { DEFAULT_SPRITES } from "../engine/graphics";
import { APP_TEMPLATES } from "../engine/appTemplates";

export type ProjectKind = "all" | "game" | "app" | "web" | "database";

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
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  hasUnsavedChanges = false,
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
      code: PRESETS[0].code,
    },
    {
      id: "platformer",
      category: "game" as const,
      name: "Aventura Plataformas (Pixel Knight)",
      icon: Sword,
      badge: "Plataformas",
      color: "text-emerald-400",
      description: "Plataformas con caballero, saltos, gravedad, plataformas flotantes, monedas de oro y enemigos patrulla.",
      code: PRESETS[1].code,
    },
    {
      id: "cyber_pong",
      category: "game" as const,
      name: "Cyber Pong 3000 (Física & IA)",
      icon: Gamepad2,
      badge: "Retro IA",
      color: "text-purple-400",
      description: "Clásico arcade retro con física de rebote, CPU inteligente que sigue la pelota y marcadores dinámicos.",
      code: PRESETS[2].code,
    },
    {
      id: "mode7_kart",
      category: "game" as const,
      name: "DIV Super Kart 3D (Modo 7 SNES)",
      icon: Compass,
      badge: "Modo 7 3D",
      color: "text-rose-400",
      description: "Carreras semi-3D con plano en perspectiva Modo 7, karts rivales, árboles, monedas y física de conducción.",
      code: PRESETS[3].code,
    },
    {
      id: "mode8_dungeon",
      category: "game" as const,
      name: "Dungeon Crypt 3D (Modo 8 Raycaster FPS)",
      icon: Box,
      badge: "Modo 8 FPS",
      color: "text-amber-300",
      description: "Motor 3D Raycasting estilo Wolfenstein / Catacomb con paredes texturizadas, monstruos 3D y niebla.",
      code: PRESETS[4].code,
    },
    {
      id: "doom_modo8_classic",
      category: "game" as const,
      name: "DOOM 1993: Hangar E1M1 (Modo 8 FPS)",
      icon: Box,
      badge: "Modo 8 3D",
      color: "text-red-400",
      description: "FPS 3D clásico en Modo 8 con escopeta corredera en primera persona, imps demoníacos, efectos sonoros y automapa.",
      code: PRESETS[PRESETS.length - 1].code,
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
      code: `// =================================================================
// WXDIV 3.0 - APLICACIÓN MULTI-FORMULARIO VISUAL MDI ENGINE
// Arquitectura MDI / Forms Independientes y Reactivos con DIV Precode
// =================================================================
PROGRAM vb_multi_form_app;

STORE app_global
  form_activo: string = "Form1"
  total_registros: int = 4
  usuario_actual: string = "Desarrollador MDI"
  version: string = "3.0.0-PRO"
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(192, 192, 192)); // Gris clásico Visual MDI

  write(0, 16, 12, 0, "PROYECTO VISUAL MDI ENGINE - SUITE MULTI-FORM");

  // Iniciar el controlador del Form Principal (MDI Host)
  form1_mdi_controller();

  LOOP
    FRAME;
  END
END

// Form 1: Formulario Principal de Navegación y Clientes
PROCESS form1_mdi_controller()
PRIVATE
  menu_sel = 0;
BEGIN
  LOOP
    // Marco exterior de ventana estilo Windows 3.11 / 95
    draw_box(10, 36, 630, 470, "#c0c0c0");
    // Barra de título azul marino VB3
    draw_box(12, 38, 628, 62, "#000080");
    write(0, 20, 44, 0, "Form1 - Panel de Control & Gestión de Clientes");

    // Botonera de cambio de formulario (MDI task switch)
    draw_button(20, 72, 140, 34, "📄 Form Clientes", form_clientes_abrir);
    draw_button(170, 72, 140, 34, "📊 Form Estadísticas", form_stats_abrir);
    draw_button(320, 72, 140, 34, "⚙️ Form Configuración", form_config_abrir);

    // Tabla de datos visual en Form 1
    draw_box(20, 120, 620, 380, "#ffffff");
    draw_table(24, 124, 592, 250, "ID,CLIENTE,PLAN,ESTADO,SALDO", "101,Acme Corp,Enterprise,Activo,$1,250|102,TechLab SRL,Professional,Activo,$420|103,Nexus Studio,Developer,Pendiente,$95|104,Pixel Game Ltd,Enterprise,Activo,$3,100");

    write(0, 24, 390, 0, "Estado: Conectado a DIV Database Engine. 4 registros activos.");

    FRAME;
  END
END

PROCESS form_clientes_abrir()
BEGIN
  write(0, 30, 430, 0, "Form Clientes abierto en primer plano.");
END

PROCESS form_stats_abrir()
BEGIN
  write(0, 30, 430, 0, "Form Estadísticas cargado.");
END

PROCESS form_config_abrir()
BEGIN
  write(0, 30, 430, 0, "Form Configuración visualizado.");
END
`,
    },
    {
      id: "app_login",
      category: "app" as const,
      name: "Formulario de Login & Registro (Visual Basic 3.0)",
      icon: Lock,
      badge: "VB 3.0 Auth",
      color: "text-amber-400",
      description: "Formulario de autenticación clásico estilo VB 3.0 con cajas de texto, validación reactiva, recordar contraseña y diálogos modales.",
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
      code: `PROGRAM app_tareas_productivas;

STORE user
  nombre: string = "Admin"
  logged: bool = true
END

STORE tasks_store
  filtro: string = "Todas"
  total_hechas: int = 2
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(15, 23, 42));

  write(0, 24, 25, 0, "TASK MANAGER PRO - WXDIV MULTIPLATFORM");
  app_ui_controller();

  LOOP
    FRAME;
  END
END

PROCESS app_ui_controller()
PRIVATE
  filtro_activo = "Todas";
BEGIN
  LOOP
    draw_box(20, 60, 620, 440, "#1e293b");
    draw_text(0, 36, 76, 0, "MIS TAREAS & SPRINT ACTUAL");

    draw_button(36, 110, 110, 32, "Todas (4)", btn_filtro_todas);
    draw_button(156, 110, 130, 32, "Completadas (2)", btn_filtro_completadas);
    draw_button(296, 110, 130, 32, "Pendientes (2)", btn_filtro_pendientes);

    draw_table(36, 160, 568, 240, "ID,TAREA,CATEGORIA,ESTADO", "1,Diseño Visual Basic en Canvas,Core,Completada|2,Motor Touch Acelerado 60FPS,Android,Completada|3,Landing Page Generator,Web,Pendiente|4,Compilador DIV a APK Nativo,Móvil,Pendiente");

    FRAME;
  END
END

PROCESS btn_filtro_todas() BEGIN END
PROCESS btn_filtro_completadas() BEGIN END
PROCESS btn_filtro_pendientes() BEGIN END
`,
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
      code: `// =================================================================
// WXDIV 3.0 - GENERADOR DE LANDINGS & SITIOS WEB DINÁMICOS
// Código nativo DIV compilable a HTML5 / WebGL / PWA y Android
// =================================================================
PROGRAM generador_landing_page;

STORE landing_state
  seccion_activa: string = "Hero"
  email_lead: string = ""
  suscrito: bool = false
  visitas: int = 1420
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(11, 17, 33)); // Fondo moderno web

  // Iniciar motor de landing page reactiva
  landing_web_engine();

  LOOP
    FRAME;
  END
END

PROCESS landing_web_engine()
PRIVATE
  email_input = "";
  mensaje_estado = "";
BEGIN
  LOOP
    // Barra de Navegación Superior (Navbar)
    draw_box(0, 0, 640, 56, "#0f172a");
    write(0, 24, 18, 0, "⚡ NEXUS WEB - PLATAFORMA DE SOFTWARE");

    draw_button(280, 12, 80, 32, "Inicio", nav_inicio);
    draw_button(368, 12, 90, 32, "Servicios", nav_servicios);
    draw_button(466, 12, 80, 32, "Precios", nav_precios);
    draw_button(554, 12, 76, 32, "Contacto", nav_contacto);

    // HERO SECTION (Sección Principal de Impacto)
    draw_box(20, 72, 620, 220, "#1e293b");
    write(0, 40, 92, 0, "CREA APLICACIONES & VIDEOJUEGOS AL INSTANTE");
    write(0, 40, 120, 0, "El primer IDE táctil y visual con aceleración gráfica GPU a 60 FPS.");
    write(0, 40, 142, 0, "Basado en el lenguaje DIV Games Studio y estilo Visual Basic 3.0.");

    draw_button(40, 180, 180, 40, "🚀 Empezar Gratis Ahora", btn_cta_hero);
    draw_button(230, 180, 160, 40, "Ver Demostración", btn_demo);

    // 3 CARDS DE BENEFICIOS / CARACTERÍSTICAS
    draw_box(20, 304, 195, 140, "#111827");
    write(0, 32, 320, 0, "⚡ ULTRA VELOZ");
    write(0, 32, 345, 0, "Sin lag. Acelerado con");
    write(0, 32, 365, 0, "WebGL / HTML5 nativo.");

    draw_box(232, 304, 195, 140, "#111827");
    write(0, 244, 320, 0, "📱 TOUCH FIRST");
    write(0, 244, 345, 0, "Diseñado para móviles,");
    write(0, 244, 365, 0, "tablets y pantallas táctiles.");

    draw_box(444, 304, 195, 140, "#111827");
    write(0, 456, 320, 0, "🤖 IA COPILOT");
    write(0, 456, 345, 0, "Asistente inteligente");
    write(0, 456, 365, 0, "para autogenerar código.");

    FRAME;
  END
END

PROCESS nav_inicio() BEGIN write(0, 24, 456, 0, "Navegando a: Inicio"); END
PROCESS nav_servicios() BEGIN write(0, 24, 456, 0, "Navegando a: Servicios"); END
PROCESS nav_precios() BEGIN write(0, 24, 456, 0, "Navegando a: Precios"); END
PROCESS nav_contacto() BEGIN write(0, 24, 456, 0, "Navegando a: Contacto"); END
PROCESS btn_cta_hero() BEGIN write(0, 24, 456, 0, "¡Gracias por comenzar! Registro iniciado."); END
PROCESS btn_demo() BEGIN write(0, 24, 456, 0, "Cargando demo interactiva en tiempo real..."); END
`,
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
      code: `// =================================================================
// WXDIV 3.0 - BASE DE DATOS SQLITE & FORMULARIO CRUD
// Motor SQL en memoria y persistencia local JSON / Relacional
// =================================================================
PROGRAM gestor_base_datos_sqlite;

GLOBAL
  total_filas = 3;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(15, 23, 42));

  // Inicializar tabla SQLite
  sqlite_query("CREATE TABLE IF NOT EXISTS productos (id INT, nombre TEXT, precio REAL, stock INT);");
  sqlite_query("INSERT INTO productos VALUES (1, 'Teclado Gamer Mecánico', 79.99, 15);");
  sqlite_query("INSERT INTO productos VALUES (2, 'Mouse Inalámbrico RGB', 34.50, 42);");
  sqlite_query("INSERT INTO productos VALUES (3, 'Monitor Curvo 144Hz', 219.00, 8);");

  write(0, 24, 20, 0, "SISTEMA DE GESTIÓN SQLITE & INVENTARIO WXDIV");

  db_controller();

  LOOP
    FRAME;
  END
END

PROCESS db_controller()
PRIVATE
  input_nombre = "";
  input_precio = "";
BEGIN
  LOOP
    draw_box(20, 50, 620, 440, "#1e293b");

    // Grilla de Datos
    draw_table(36, 70, 568, 220, "ID,PRODUCTO,PRECIO,STOCK,ACCIONES", "1,Teclado Gamer Mecánico,$79.99,15,Editar|2,Mouse Inalámbrico RGB,$34.50,42,Editar|3,Monitor Curvo 144Hz,$219.00,8,Editar");

    // Formulario de inserción
    draw_box(36, 310, 568, 110, "#0f172a");
    write(0, 50, 324, 0, "Añadir Nuevo Producto al Inventario:");

    draw_input(50, 350, 240, 34, input_nombre, 0, "Nombre del producto...");
    draw_input(300, 350, 120, 34, input_precio, 0, "$ Precio...");

    draw_button(436, 350, 150, 34, "💾 Guardar Registro", btn_guardar_db);

    FRAME;
  END
END

PROCESS btn_guardar_db()
BEGIN
  write(0, 50, 432, 0, "✓ Registro guardado correctamente en la base de datos.");
END
`,
    },
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
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none font-sans">
      <div className="w-full max-w-3xl bg-[#090e1d] border border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* Header - Visual Studio / Visual Basic 3.0 Modernized */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#0d162d] via-[#111f3d] to-[#0d162d] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/50">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-100 text-sm tracking-tight">Asistente de Nuevo Proyecto WXDIV 3.0</h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  VB 3.0 & DIV IDE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Selecciona el tipo de desarrollo: Videojuegos, Aplicaciones, Web o Bases de Datos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Category Tabs (Wizard de Inicio) */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#070b16] border-b border-slate-800/80 overflow-x-auto">
          {[
            { id: "all", label: "Todos", icon: Layers, count: ALL_TEMPLATES.length },
            { id: "game", label: "Videojuegos (2D & 3D)", icon: Gamepad2, count: ALL_TEMPLATES.filter(t => t.category === "game").length },
            { id: "app", label: "Aplicaciones (VB .NET)", icon: Layout, count: ALL_TEMPLATES.filter(t => t.category === "app").length },
            { id: "web", label: "Landings & Webs", icon: Globe, count: ALL_TEMPLATES.filter(t => t.category === "web").length },
            { id: "database", label: "Bases de Datos SQL", icon: Database, count: ALL_TEMPLATES.filter(t => t.category === "database").length },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as ProjectKind)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/30"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? "bg-cyan-800 text-white" : "bg-slate-800 text-slate-500"}`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto text-xs space-y-4 text-slate-200">
          {/* Project Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-xs">
                Nombre del Proyecto:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.replace(/[^a-zA-Z0-9_\-\s]/g, ""))}
                placeholder="Ej. Mi_App_VisualBasic"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs font-mono outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            {/* Target Platform */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-xs">
                Plataforma de Despliegue:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "all", label: "Universal", sub: "Web + Móvil" },
                  { id: "android", label: "Android", sub: "APK / Touch" },
                  { id: "web", label: "Web / PWA", sub: "HTML5 60FPS" },
                ].map((plt) => (
                  <button
                    key={plt.id}
                    type="button"
                    onClick={() => setTargetPlatform(plt.id as any)}
                    className={`px-2 py-1.5 rounded-lg border text-center transition-all ${
                      targetPlatform === plt.id
                        ? "border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-[11px] leading-tight">{plt.label}</div>
                    <div className="text-[9px] text-slate-500">{plt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resolution Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 text-xs flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>Resolución de Lienzo Virtual (Touch Acelerado):</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "320x200", label: "m320x200", desc: "Retro DOS VGA (Pixel Art)" },
                { id: "640x480", label: "m640x480", desc: "Estándar DIV Games & VB3" },
                { id: "800x600", label: "m800x600", desc: "SVGA Alta Resolución" },
              ].map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => setResolution(res.id as any)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col transition-all ${
                    resolution === res.id
                      ? "border-cyan-400 bg-cyan-950/50 text-cyan-300 shadow-sm ring-1 ring-cyan-500/30"
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
            <label className="block text-slate-300 font-semibold mb-1.5 text-xs flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Plantilla Inicial ({filteredTemplates.length} disponibles):</span>
              </div>
              <span className="text-[10px] text-slate-500">Haz clic para elegir</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {filteredTemplates.map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/40 shadow-lg ring-1 ring-cyan-400/30"
                        : "border-slate-800/90 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-cyan-900/80 text-cyan-300" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-bold text-xs truncate ${isSelected ? "text-cyan-300" : "text-slate-200"}`}>
                          {tpl.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
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
        <div className="px-5 py-3.5 bg-[#070b16] border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/60 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{confirmOverwrite ? "Confirmar y Crear Proyecto" : "Crear Proyecto"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
