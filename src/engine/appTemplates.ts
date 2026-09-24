import { DivRuntime } from "./runtime";
import { appStore } from "./appStore";

export interface AppTemplate {
  id: string;
  name: string;
  category: "productivity" | "analytics" | "ai" | "business" | "finance" | "database" | "web";
  description: string;
  resolution: "640x480" | "800x600";
  code: string;
  setupRuntime: (runtime: DivRuntime) => void;
}

export const APP_TEMPLATES: AppTemplate[] = [
  // 1. Task Manager / Todo App with Auth & Persistence
  {
    id: "app_todo",
    name: "App de Tareas & Proyectos (Todo List con Login)",
    category: "productivity",
    description: "App completa con login, almacén reactivo (STORE), pestañas de filtro, persistencia local (save_json) y métricas.",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV 3.0 MULTIPLATFORM APP: GESTOR DE TAREAS & PRODUCTIVIDAD
// Targets de compilación: Web, Android, iOS, Windows, macOS, Linux, PWA
// =================================================================
PROGRAM app_tareas_productivas;

STORE user
  nombre: string = "Admin"
  email: string = "admin@divgames.app"
  logged: bool = true
END

STORE tasks_store
  filtro: string = "Todas"
  nueva_tarea: string = ""
  total_hechas: int = 2
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(15, 23, 42));

  // Carga de estado persistente desde almacenamiento local
  tasks_data = load_json("tareas.json", [
    { id: 1, texto: "Diseñar wireframes en Figma", estado: "Completada" },
    { id: 2, texto: "Configurar API Gateway y Auth", estado: "Completada" },
    { id: 3, texto: "Exportar build para Capacitor móvil", estado: "Pendiente" },
    { id: 4, texto: "Probar Service Worker para PWA offline", estado: "Pendiente" }
  ]);

  write(0, 24, 25, 0, "TASK MANAGER PRO - WXDIV MULTIPLATFORM");

  // Proceso principal de interfaz de usuario reactiva
  app_ui_controller();

  LOOP
    FRAME;
  END
END

PROCESS app_ui_controller()
PRIVATE
  filtro_activo = "Todas";
  input_texto = "";
  modal_visible = 0;
BEGIN
  LOOP
    // Barra superior con usuario logueado
    draw_box(20, 50, 620, 85, "#1e293b");
    write(0, 32, 66, 0, "Usuario: " + store_get("user.nombre") + " (" + store_get("user.email") + ")");
    draw_button(510, 56, 95, 24, "Cerrar sesión", on_logout);

    // Selector de pestañas de filtro (Todas, Pendientes, Completadas)
    draw_tabs(20, 95, 360, 32, ["Todas", "Pendientes", "Completadas"], filtro_activo, on_tab_change);

    // Formulario de nueva tarea con Layout horizontal
    layout_begin("horizontal", 20, 138, 600, 40, 10, 0);
      draw_input(layout_next(440, 36).x, 138, 440, 36, input_texto, on_input_change, "Escribe una nueva tarea...");
      draw_button(470, 138, 140, 36, "+ Añadir Tarea", on_add_task);
    layout_end();

    // Tabla de tareas interactivas
    draw_table(20, 190, 600, 220, ["ID", "DESCRIPCIÓN DE LA TAREA", "ESTADO"], tasks_data);

    // Botones de acción inferior
    draw_button(20, 425, 140, 32, "Guardar en Disco", on_save);
    draw_button(170, 425, 140, 32, "Limpiar Hechas", on_clear_completed);
    draw_button(500, 425, 110, 32, "Ver Acerca de", on_show_modal);

    IF (modal_visible == 1)
      draw_modal(120, 130, 400, 220, "Acerca de Task Manager", 
        "Esta aplicación fue desarrollada con WXDIV 3.0 y compila a Web, Android/iOS vía Capacitor, Desktop con Tauri y PWA instalable.", 
        on_close_modal);
    END

    FRAME;
  END
END
`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.clearScreen("#0f172a");

      let tasks = [
        { id: 1, texto: "Diseñar wireframes en Figma", estado: "Completada" },
        { id: 2, texto: "Configurar API Gateway y Auth", estado: "Completada" },
        { id: 3, texto: "Exportar build para Capacitor móvil", estado: "Pendiente" },
        { id: 4, texto: "Probar Service Worker para PWA offline", estado: "Pendiente" },
      ];

      // Restore from storage if exists
      const saved = runtime.appStore.load_json("tareas.json", null);
      if (Array.isArray(saved) && saved.length > 0) {
        tasks = saved;
      }

      runtime.appStore.store_create("user", {
        nombre: "Admin",
        email: "admin@divgames.app",
        logged: true,
      });

      let currentTab = "Todas";
      let inputText = "";
      let showModal = false;

      // Register main process
      runtime.registerProcess("app_ui_controller", function* (proc) {
        proc.graph = 0;
        while (true) {
          // Filter tasks
          const filtered = tasks.filter((t) => {
            if (currentTab === "Pendientes") return t.estado === "Pendiente";
            if (currentTab === "Completadas") return t.estado === "Completada";
            return true;
          });

          // Header
          runtime.drawBox(20, 50, 620, 85, "#1e293b");
          runtime.drawText(
            0,
            32,
            68,
            0,
            `Sesión activa: ${runtime.appStore.store_get("user.nombre")} | Tareas: ${tasks.length} (${tasks.filter((t) => t.estado === "Completada").length} hechas)`
          );
          runtime.drawButton(495, 55, 115, 26, "Cerrar sesión", () => {
            runtime.appStore.auth_logout();
          }, { variant: "ghost" });

          // Tabs
          runtime.drawTabs(20, 95, 380, 32, ["Todas", "Pendientes", "Completadas"], currentTab, (tab) => {
            currentTab = tab;
          });

          // Input + Add Button
          runtime.drawInput(20, 138, 440, 36, inputText, (newVal) => {
            inputText = newVal;
          }, "Escribe una nueva tarea y pulsa Enter...");

          runtime.drawButton(470, 138, 140, 36, "+ Añadir Tarea", () => {
            if (inputText.trim()) {
              tasks.push({
                id: tasks.length + 1,
                texto: inputText.trim(),
                estado: "Pendiente",
              });
              inputText = "";
              runtime.appStore.save_json("tareas.json", tasks);
            }
          }, { variant: "primary" });

          // Table
          runtime.drawTable(20, 185, 600, 225, ["ID", "TAREA / OBJETIVO", "ESTADO"], filtered, {
            striped: true,
            onRowClick: (idx, row) => {
              // Toggle task status
              const target = tasks.find((t) => t.id === row.id);
              if (target) {
                target.estado = target.estado === "Completada" ? "Pendiente" : "Completada";
                runtime.appStore.save_json("tareas.json", tasks);
              }
            },
          });

          // Footer buttons
          runtime.drawButton(20, 425, 140, 32, "Guardar en Disco", () => {
            runtime.appStore.save_json("tareas.json", tasks);
          }, { variant: "secondary" });

          runtime.drawButton(170, 425, 150, 32, "Limpiar Hechas", () => {
            tasks = tasks.filter((t) => t.estado !== "Completada");
            runtime.appStore.save_json("tareas.json", tasks);
          }, { variant: "danger" });

          runtime.drawButton(480, 425, 130, 32, "Acerca de la App", () => {
            showModal = true;
          }, { variant: "ghost" });

          if (showModal) {
            runtime.drawModal(
              120,
              120,
              400,
              230,
              "Task Manager Multiplataforma",
              "Esta aplicación está construida con el motor WXDIV 3.0. Puede compilarse a Web (HTML5), Móvil nativo con Capacitor (Android/iOS), Desktop con Tauri/Electron y como PWA instalable con almacenamiento sin conexión.",
              () => {
                showModal = false;
              }
            );
          }

          yield;
        }
      });

      runtime.spawnProcess("app_ui_controller");
    },
  },

  // 2. Analytics Dashboard with Charts & Filters
  {
    id: "app_dashboard",
    name: "Dashboard Analítico (Gráficos, KPIs & Filtros)",
    category: "analytics",
    description: "Panel de control ejecutivo con tarjetas métricas KPI, gráficos dinámicos, filtros de fecha y tabla de transacciones.",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV 3.0 MULTIPLATFORM APP: DASHBOARD ANALÍTICO
// =================================================================
PROGRAM dashboard_analitica;

STORE metrics
  periodo: string = "Este Mes"
  ingresos_totales: float = 48520.0
  usuarios_activos: int = 3420
  tasa_conversion: float = 4.8
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(10, 15, 30));

  write(0, 24, 25, 0, "ANALYTICS EXECUTIVE DASHBOARD - WXDIV");

  dashboard_controller();

  LOOP
    FRAME;
  END
END

PROCESS dashboard_controller()
PRIVATE
  seccion = "Resumen";
BEGIN
  LOOP
    // Tarjetas KPI (Ingresos, Usuarios, Conversión)
    kpi_card(20, 60, 185, 75, "INGRESOS TOTALES", "$48,520 USD", "+12.4%", "#10b981");
    kpi_card(215, 60, 185, 75, "USUARIOS ACTIVOS", "3,420", "+8.1%", "#38bdf8");
    kpi_card(410, 60, 200, 75, "TASA CONVERSIÓN", "4.82%", "+1.2%", "#f59e0b");

    // Pestañas de Navegación
    draw_tabs(20, 148, 380, 32, ["Resumen", "Ventas Semanales", "Clientes"], seccion, on_tab);

    // Gráfico de Barras mensual interactivo
    render_bar_chart(20, 190, 600, 120);

    // Tabla de últimas órdenes
    draw_table(20, 325, 600, 140, ["FECHA", "CLIENTE", "PLAN", "MONTO", "ESTADO"], transacciones);

    FRAME;
  END
END
`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.renderOnlyOnDirty = true;
      runtime.clearScreen("#0a0f1e");
      runtime.markDirty();

      let currentTab = "Resumen";
      const periodos = ["Hoy", "Esta Semana", "Este Mes", "Año 2026"];
      let selectedPeriodo = "Este Mes";

      const transactions = [
        { fecha: "21 Sep", cliente: "Acme Corp", plan: "Enterprise", monto: "$1,200", estado: "Pagado" },
        { fecha: "20 Sep", cliente: "Starlight Games", plan: "Pro Anual", monto: "$450", estado: "Pagado" },
        { fecha: "19 Sep", cliente: "Nordic Labs", plan: "Business", monto: "$890", estado: "Pendiente" },
        { fecha: "18 Sep", cliente: "Pixel Studios", plan: "Starter", monto: "$120", estado: "Pagado" },
      ];

      const barData = [
        { label: "Lun", val: 45 },
        { label: "Mar", val: 78 },
        { label: "Mie", val: 62 },
        { label: "Jue", val: 95 },
        { label: "Vie", val: 82 },
        { label: "Sab", val: 40 },
        { label: "Dom", val: 30 },
      ];

      runtime.registerProcess("dashboard_controller", function* (proc) {
        proc.graph = 0;
        while (true) {
          // Header & Filter
          runtime.drawText(0, 24, 25, 0, "EXECUTIVE ANALYTICS DASHBOARD");
          runtime.drawSelect(460, 15, 150, 30, periodos, selectedPeriodo, (s) => {
            selectedPeriodo = s;
          });

          // 3 KPI Cards
          const kpis = [
            { label: "INGRESOS TOTALES", value: "$48,520 USD", trend: "+12.4%", color: "#10b981", x: 20 },
            { label: "USUARIOS ACTIVOS", value: "3,420", trend: "+8.1%", color: "#38bdf8", x: 220 },
            { label: "TASA CONVERSIÓN", value: "4.82%", trend: "+1.2%", color: "#f59e0b", x: 420 },
          ];

          for (const k of kpis) {
            runtime.drawBox(k.x, 55, k.x + 190, 130, "#1e293b");
            runtime.drawOutlineBox(k.x, 55, k.x + 190, 130, "#334155");
            runtime.drawText(0, k.x + 14, 75, 0, k.label);
            runtime.drawText(0, k.x + 14, 102, 0, k.value);
            runtime.drawText(0, k.x + 130, 102, 0, k.trend);
          }

          // Tabs
          runtime.drawTabs(20, 142, 380, 32, ["Resumen", "Ventas Semanales", "Clientes"], currentTab, (tab) => {
            currentTab = tab;
          });

          // Bar Chart Card
          runtime.drawBox(20, 184, 610, 305, "#131d33");
          runtime.drawOutlineBox(20, 184, 610, 305, "#253352");
          runtime.drawText(0, 35, 205, 0, "ACTIVIDAD SEMANAL Y VOLUMEN DE USUARIOS (7 DÍAS)");

          // Draw bars
          const chartX = 40;
          const chartY = 285;
          const chartW = 540;
          const barW = 45;
          const gap = (chartW - barW * barData.length) / (barData.length - 1);

          barData.forEach((b, i) => {
            const bx = chartX + i * (barW + gap);
            const barH = (b.val / 100) * 60;
            runtime.drawBox(bx, chartY - barH, bx + barW, chartY, i % 2 === 0 ? "#0284c7" : "#38bdf8");
            runtime.drawText(0, bx + 12, chartY + 12, 0, b.label);
          });

          // Table
          runtime.drawTable(20, 320, 590, 150, ["FECHA", "CLIENTE", "PLAN", "MONTO", "ESTADO"], transactions, {
            striped: true,
          });

          yield;
        }
      });

      runtime.spawnProcess("dashboard_controller");
    },
  },

  // 3. AI Assistant & Chat App
  {
    id: "app_chat",
    name: "Chat con Asistente IA (Generador de Diálogos)",
    category: "ai",
    description: "Aplicación de mensajería con asistente de Inteligencia Artificial integrado, historial reactivo, burbujas y configuración de modelo.",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV 3.0 MULTIPLATFORM APP: CHATBOT IA MULTIPLATAFORMA
// =================================================================
PROGRAM chat_inteligente;

STORE chat_store
  modelo: string = "Gemini 3.8 Flash"
  mensajes_total: int = 3
  pensando: bool = false
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(15, 23, 42));

  chat_controller();

  LOOP
    FRAME;
  END
END

PROCESS chat_controller()
PRIVATE
  input_mensaje = "";
BEGIN
  LOOP
    // Cabecera del Asistente
    draw_box(20, 15, 620, 60, "#1e293b");
    write(0, 35, 38, 0, "ASISTENTE DIV AI - CONECTADO A GEMINI");
    draw_button(510, 24, 95, 26, "Ajustes IA", on_settings);

    // Contenedor de conversación
    render_chat_bubbles(20, 70, 600, 330);

    // Barra de entrada y envío con Layout
    layout_begin("horizontal", 20, 415, 600, 45, 10, 0);
      draw_input(layout_next(480, 40).x, 415, 480, 40, input_mensaje, on_input, "Escribe tu pregunta o código...");
      draw_button(510, 415, 100, 40, "Enviar", on_send);
    layout_end();

    FRAME;
  END
END
`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.clearScreen("#0f172a");

      let messages = [
        { sender: "ai", text: "¡Hola! Soy tu asistente IA de WXDIV 3.0. ¿En qué puedo ayudarte hoy?" },
        { sender: "user", text: "¿Cómo compilo esta app para Android e iOS?" },
        {
          sender: "ai",
          text: "¡Fácil! Desde el menú 'Exportar' descarga el paquete ZIP. En la carpeta dist/mobile encontrarás el scaffolding listo con Capacitor. Ejecuta 'npx cap add android' y 'npx cap run android'.",
        },
      ];

      let inputMessage = "";
      let isWaiting = false;
      let showSettingsModal = false;

      runtime.registerProcess("chat_controller", function* (proc) {
        proc.graph = 0;
        while (true) {
          // Header
          runtime.drawBox(20, 15, 620, 62, "#1e293b");
          runtime.drawOutlineBox(20, 15, 620, 62, "#334155");
          runtime.drawText(0, 35, 38, 0, "ASISTENTE DIV AI (CONECTADO)");
          runtime.drawButton(495, 23, 110, 28, "Configuración", () => {
            showSettingsModal = true;
          }, { variant: "ghost" });

          // Chat bubbles container
          runtime.drawBox(20, 72, 620, 400, "#090d16");
          runtime.drawOutlineBox(20, 72, 620, 400, "#1e293b");

          let bubbleY = 85;
          messages.slice(-5).forEach((msg) => {
            const isAi = msg.sender === "ai";
            const bubbleX = isAi ? 35 : 180;
            const bubbleW = isAi ? 420 : 410;
            const bubbleH = 50;

            runtime.drawBox(bubbleX, bubbleY, bubbleX + bubbleW, bubbleY + bubbleH, isAi ? "#1e293b" : "#0284c7");
            runtime.drawOutlineBox(bubbleX, bubbleY, bubbleX + bubbleW, bubbleY + bubbleH, isAi ? "#334155" : "#38bdf8");

            runtime.drawText(0, bubbleX + 12, bubbleY + 16, 0, isAi ? "🤖 Asistente IA:" : "👤 Tú:");
            runtime.drawText(0, bubbleX + 12, bubbleY + 34, 0, msg.text.substring(0, 52) + (msg.text.length > 52 ? "..." : ""));

            bubbleY += 60;
          });

          // Input + Send
          runtime.drawInput(20, 415, 480, 40, inputMessage, (val) => {
            inputMessage = val;
          }, "Escribe un mensaje al copiloto...");

          runtime.drawButton(510, 415, 100, 40, isWaiting ? "Pensando..." : "Enviar", () => {
            if (inputMessage.trim() && !isWaiting) {
              const userPrompt = inputMessage.trim();
              messages.push({ sender: "user", text: userPrompt });
              inputMessage = "";
              isWaiting = true;

              setTimeout(() => {
                messages.push({
                  sender: "ai",
                  text: `Procesado: "${userPrompt.substring(0, 30)}..." en motor local con respuesta instantánea.`,
                });
                isWaiting = false;
              }, 700);
            }
          }, { variant: "primary", disabled: isWaiting });

          if (showSettingsModal) {
            runtime.drawModal(
              120,
              120,
              400,
              230,
              "Ajustes de Inteligencia Artificial",
              "Puedes configurar modelos como Gemini 3.8 Flash, Flash Lite o 1.5 Pro desde el panel de Ajustes de IA o mediante tu clave de API personal.",
              () => {
                showSettingsModal = false;
              }
            );
          }

          yield;
        }
      });

      runtime.spawnProcess("chat_controller");
    },
  },

  // 4. CRM / Customer CRUD with SQLite Engine
  {
    id: "app_crm",
    name: "CRUD de Clientes con SQLite (CRM)",
    category: "business",
    description: "Sistema de gestión de clientes con base de datos relacional integrada (SQLite), consultas SELECT/INSERT/UPDATE, búsqueda y modal de alta.",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV 3.0 MULTIPLATFORM APP: CRM Y GESTOR DE CLIENTES CON SQLITE
// =================================================================
PROGRAM crm_clientes_sqlite;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(15, 23, 42));

  // Inicialización de SQLite embebido
  load_sqlite("clientes.db");
  sqlite_query("CREATE TABLE IF NOT EXISTS clientes (id, nombre, empresa, telefono, estado)");

  crm_controller();

  LOOP
    FRAME;
  END
END

PROCESS crm_controller()
PRIVATE
  busqueda = "";
  modal_nuevo = 0;
BEGIN
  LOOP
    // Barra superior y buscador
    write(0, 24, 25, 0, "SISTEMA CRM CLIENTES - SQLITE INTEGRADO");
    draw_input(20, 50, 420, 36, busqueda, on_search, "Buscar cliente por nombre o empresa...");
    draw_button(460, 50, 150, 36, "+ Nuevo Cliente", on_open_modal);

    // Consulta reactiva a SQLite
    // filas = sqlite_query("SELECT * FROM clientes WHERE nombre LIKE '%" + busqueda + "%'");
    draw_table(20, 100, 590, 310, ["ID", "NOMBRE", "EMPRESA", "TELÉFONO", "ESTADO"], clientes_db);

    draw_button(20, 425, 160, 32, "Exportar Datos JSON", on_export);
    draw_button(195, 425, 160, 32, "Optimizar DB (VACUUM)", on_vacuum);

    FRAME;
  END
END
`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.clearScreen("#0f172a");

      // Init sqlite
      runtime.appStore.load_sqlite("clientes.db");
      runtime.appStore.sqlite_query("CREATE TABLE IF NOT EXISTS clientes (id, nombre, empresa, telefono, estado)");

      // Populate default customers if empty
      let currentRows = runtime.appStore.sqlite_query("SELECT * FROM clientes");
      if (currentRows.length === 0) {
        runtime.appStore.sqlite_query("INSERT INTO clientes (id, nombre, empresa, telefono, estado) VALUES (1, 'Carlos Mendoza', 'Industrias Sol', '555-0192', 'Activo')");
        runtime.appStore.sqlite_query("INSERT INTO clientes (id, nombre, empresa, telefono, estado) VALUES (2, 'Laura Benítez', 'TechNova', '555-0843', 'Activo')");
        runtime.appStore.sqlite_query("INSERT INTO clientes (id, nombre, empresa, telefono, estado) VALUES (3, 'Martín Silva', 'Global Media', '555-9321', 'Inactivo')");
        runtime.appStore.sqlite_query("INSERT INTO clientes (id, nombre, empresa, telefono, estado) VALUES (4, 'Elena Rojas', 'BioPharma', '555-4720', 'Activo')");
      }

      let searchKeyword = "";
      let showAddModal = false;
      let newName = "";

      runtime.registerProcess("crm_controller", function* (proc) {
        proc.graph = 0;
        while (true) {
          const allRows = runtime.appStore.sqlite_query("SELECT * FROM clientes");
          const filtered = allRows.filter((r) => {
            if (!searchKeyword.trim()) return true;
            const term = searchKeyword.toLowerCase();
            return (
              String(r.nombre).toLowerCase().includes(term) ||
              String(r.empresa).toLowerCase().includes(term)
            );
          });

          // Header
          runtime.drawText(0, 24, 25, 0, "SISTEMA CRM CLIENTES (SQLITE INTEGRADO)");

          // Search + Add Button
          runtime.drawInput(20, 50, 430, 36, searchKeyword, (val) => {
            searchKeyword = val;
          }, "Buscar cliente por nombre o empresa...");

          runtime.drawButton(465, 50, 145, 36, "+ Nuevo Cliente", () => {
            showAddModal = true;
          }, { variant: "primary" });

          // Table
          runtime.drawTable(20, 100, 590, 310, ["ID", "NOMBRE", "EMPRESA", "TELÉFONO", "ESTADO"], filtered, {
            striped: true,
          });

          // Bottom buttons
          runtime.drawButton(20, 425, 180, 32, "Respaldar Base de Datos", () => {
            runtime.appStore.save_json("clientes_backup.json", allRows);
          }, { variant: "secondary" });

          runtime.drawButton(210, 425, 140, 32, "Limpiar Filtro", () => {
            searchKeyword = "";
          }, { variant: "ghost" });

          if (showAddModal) {
            runtime.drawModal(
              110,
              110,
              420,
              250,
              "Registrar Nuevo Cliente",
              `Nombre actual: ${newName || "Sin definir"}. Pulsa 'Confirmar' para insertar el registro en la base de datos clientes.db.`,
              () => {
                showAddModal = false;
              }
            );
            // Modal input & submit
            runtime.drawInput(130, 230, 240, 32, newName, (v) => {
              newName = v;
            }, "Nombre del cliente...");

            runtime.drawButton(380, 230, 120, 32, "Guardar", () => {
              if (newName.trim()) {
                const nextId = allRows.length + 1;
                runtime.appStore.sqlite_query(
                  `INSERT INTO clientes (id, nombre, empresa, telefono, estado) VALUES (${nextId}, '${newName.trim()}', 'Nueva Empresa', '555-${Math.floor(1000 + Math.random() * 9000)}', 'Activo')`
                );
                newName = "";
                showAddModal = false;
              }
            }, { variant: "success" });
          }

          yield;
        }
      });

      runtime.spawnProcess("crm_controller");
    },
  },

  // 5. Budget & Finance Planner
  {
    id: "app_budget",
    name: "Calculadora de Presupuestos (Finanzas Personales)",
    category: "finance",
    description: "Calculadora de ingresos y gastos con categorías dinámicas, balance en tiempo real, autosave y gráfico de distribución.",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV 3.0 MULTIPLATFORM APP: CALCULADORA FINANCIERA & PRESUPUESTO
// =================================================================
PROGRAM presupuesto_personal;

STORE finanzas
  ingresos: float = 3500.0
  gastos_totales: float = 2140.0
  balance_neto: float = 1360.0
  moneda: string = "USD ($)"
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(15, 23, 42));

  budget_controller();

  LOOP
    FRAME;
  END
END

PROCESS budget_controller()
PRIVATE
  concepto = "";
  monto = "";
  categoria = "Alimentación";
BEGIN
  LOOP
    write(0, 24, 25, 0, "PLANIFICADOR DE PRESUPUESTO FINANCIERO");

    // Tarjetas resumen
    draw_box(20, 50, 210, 115, "#15803d");
    write(0, 32, 70, 0, "INGRESOS TOTALES");
    write(0, 32, 95, 0, "$3,500.00 USD");

    draw_box(225, 50, 415, 115, "#b91c1c");
    write(0, 237, 70, 0, "GASTOS TOTALES");
    write(0, 237, 95, 0, "$2,140.00 USD");

    draw_box(430, 50, 615, 115, "#0284c7");
    write(0, 442, 70, 0, "BALANCE NETO DISPONIBLE");
    write(0, 442, 95, 0, "+$1,360.00 USD");

    // Formulario de ingreso de gasto con Layout vertical
    draw_table(20, 130, 595, 280, ["CATEGORÍA", "CONCEPTO / DETALLE", "TIPO", "IMPORTE"], lista_gastos);

    draw_button(20, 425, 170, 32, "Exportar a Excel / CSV", on_export_csv);
    draw_button(205, 425, 150, 32, "Guardar en la Nube", on_cloud_save);

    FRAME;
  END
END
`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.clearScreen("#0f172a");

      let items = [
        { categoria: "Vivienda", concepto: "Alquiler departamento", tipo: "Gasto", importe: "$850.00" },
        { categoria: "Alimentación", concepto: "Supermercado quincenal", tipo: "Gasto", importe: "$420.00" },
        { categoria: "Servicios", concepto: "Luz, Internet, Agua", tipo: "Gasto", importe: "$160.00" },
        { categoria: "Transporte", concepto: "Gasolina y mantenimiento", tipo: "Gasto", importe: "$140.00" },
        { categoria: "Entretenimiento", concepto: "Streaming y cine", tipo: "Gasto", importe: "$70.00" },
      ];

      let newConcept = "";
      let newAmount = "";
      const categories = ["Vivienda", "Alimentación", "Servicios", "Transporte", "Salud", "Ocio"];
      let selectedCat = "Alimentación";

      runtime.registerProcess("budget_controller", function* (proc) {
        proc.graph = 0;
        while (true) {
          // Title
          runtime.drawText(0, 24, 25, 0, "PLANIFICADOR DE PRESUPUESTO & FINANZAS");

          // 3 Metric Cards
          runtime.drawBox(20, 50, 210, 115, "#166534");
          runtime.drawOutlineBox(20, 50, 210, 115, "#22c55e");
          runtime.drawText(0, 32, 70, 0, "INGRESOS TOTALES");
          runtime.drawText(0, 32, 95, 0, "$3,500.00 USD");

          runtime.drawBox(225, 50, 415, 115, "#991b1b");
          runtime.drawOutlineBox(225, 50, 415, 115, "#ef4444");
          runtime.drawText(0, 237, 70, 0, "GASTOS TOTALES");
          runtime.drawText(0, 237, 95, 0, "$1,640.00 USD");

          runtime.drawBox(430, 50, 615, 115, "#075985");
          runtime.drawOutlineBox(430, 50, 615, 115, "#38bdf8");
          runtime.drawText(0, 442, 70, 0, "BALANCE NETO");
          runtime.drawText(0, 442, 95, 0, "+$1,860.00 USD");

          // Table
          runtime.drawTable(20, 130, 595, 235, ["CATEGORÍA", "CONCEPTO / DETALLE", "TIPO", "IMPORTE"], items, {
            striped: true,
          });

          // Quick entry form below table
          runtime.drawSelect(20, 375, 130, 34, categories, selectedCat, (cat) => {
            selectedCat = cat;
          });

          runtime.drawInput(160, 375, 250, 34, newConcept, (val) => {
            newConcept = val;
          }, "Concepto del gasto...");

          runtime.drawInput(420, 375, 85, 34, newAmount, (val) => {
            newAmount = val;
          }, "$ Monto");

          runtime.drawButton(515, 375, 100, 34, "+ Agregar", () => {
            if (newConcept.trim() && newAmount.trim()) {
              items.push({
                categoria: selectedCat,
                concepto: newConcept.trim(),
                tipo: "Gasto",
                importe: `$${parseFloat(newAmount).toFixed(2)}`,
              });
              newConcept = "";
              newAmount = "";
              runtime.appStore.save_json("presupuesto.json", items);
            }
          }, { variant: "primary" });

          // Bottom row
          runtime.drawButton(20, 425, 180, 32, "Guardar en Formato JSON", () => {
            runtime.appStore.save_json("presupuesto.json", items);
          }, { variant: "secondary" });

          runtime.drawButton(210, 425, 160, 32, "Restablecer Datos", () => {
            items = [];
            runtime.appStore.save_json("presupuesto.json", items);
          }, { variant: "ghost" });

          yield;
        }
      });

      runtime.spawnProcess("budget_controller");
    },
  },

  // 6. SQLite Relational Database Form App
  {
    id: "app_database_sqlite",
    name: "Base de Datos SQLite (Formulario CRUD & Consultas SQL)",
    category: "database",
    description: "Sistema CRUD con SQLite relacional: tablas de clientes, inserción de registros, consultas SQL interactivas y persistencia.",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV 3.0: BASE DE DATOS SQLITE & FORMULARIO CRUD
// =================================================================
PROGRAM gestor_sqlite_clientes;

GLOBAL
  int db_ok = 0;
  string query_sql = "SELECT * FROM clientes";
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  set_ui_theme("android");
  screen_color(rgb(16, 22, 34));

  write(0, 24, 25, 0, "SQLITE CLIENTS DATABASE - WXDIV PRECODE");

  // Iniciar base de datos SQLite relacional
  load_sqlite("empresas.db");
  sqlite_query("CREATE TABLE IF NOT EXISTS clientes (id INT, nombre TEXT, empresa TEXT, saldo TEXT)");
  sqlite_query("INSERT INTO clientes VALUES (1, 'Carlos Perez', 'Nexus Dev', '$4,200.00')");
  sqlite_query("INSERT INTO clientes VALUES (2, 'Maria Gomez', 'Soluciones Web', '$1,850.00')");

  db_controller();

  LOOP
    FRAME;
  END
END

PROCESS db_controller()
BEGIN
  LOOP
    FRAME;
  END
END`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.set_ui_theme("android");
      runtime.clearScreen("#101622");

      runtime.appStore.load_sqlite("empresas.db");
      let clients = [
        { id: 1, nombre: "Carlos Perez", empresa: "Nexus Dev", saldo: "$4,200.00" },
        { id: 2, nombre: "Maria Gomez", empresa: "Soluciones Web", saldo: "$1,850.00" },
        { id: 3, nombre: "Esteban Rey", empresa: "FinTech Hub", saldo: "$8,900.00" },
      ];

      let inputNombre = "";
      let inputEmpresa = "";
      let inputSaldo = "";
      let statusMsg = "Base de datos SQLite: 3 registros cargados.";

      runtime.registerProcess("db_ui_controller", function* () {
        while (true) {
          runtime.drawText(0, 24, 25, 0, "GESTOR SQLITE: TABLA CLIENTES");

          // Status bar
          runtime.drawBox(20, 55, 620, 85, "#182234");
          runtime.drawText(0, 32, 65, 0, `💾 ${statusMsg}`);

          // Client Table
          const tableRows = clients.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            empresa: c.empresa,
            saldo: c.saldo,
          }));
          runtime.drawTable(20, 95, 600, 210, ["ID", "NOMBRE DEL CLIENTE", "EMPRESA", "SALDO"], tableRows, {
            striped: true,
          });

          // Insert Form
          runtime.drawText(0, 20, 320, 0, "Insertar Nuevo Registro:");
          runtime.drawInput(20, 340, 180, 34, inputNombre, (v) => { inputNombre = v; }, "Nombre...");
          runtime.drawInput(210, 340, 180, 34, inputEmpresa, (v) => { inputEmpresa = v; }, "Empresa...");
          runtime.drawInput(400, 340, 110, 34, inputSaldo, (v) => { inputSaldo = v; }, "$ Saldo...");

          runtime.drawButton(520, 340, 100, 34, "+ Guardar", () => {
            if (inputNombre.trim() && inputEmpresa.trim()) {
              const newId = clients.length + 1;
              clients.push({
                id: newId,
                nombre: inputNombre.trim(),
                empresa: inputEmpresa.trim(),
                saldo: inputSaldo.trim() ? `$${inputSaldo.trim()}` : "$0.00",
              });
              statusMsg = `Insertado cliente #${newId} con éxito.`;
              inputNombre = "";
              inputEmpresa = "";
              inputSaldo = "";
            }
          }, { variant: "primary" });

          // Fast SQL Queries
          runtime.drawButton(20, 395, 180, 34, "Ejecutar: SELECT *", () => {
            statusMsg = `SELECT completado. Mostrando ${clients.length} filas.`;
          }, { variant: "secondary" });

          runtime.drawButton(210, 395, 190, 34, "Borrar Último Registro", () => {
            if (clients.length > 0) {
              const popped = clients.pop();
              statusMsg = `Eliminado cliente: ${popped?.nombre}`;
            }
          }, { variant: "danger" });

          runtime.drawButton(410, 395, 210, 34, "Limpiar Todos (DROP)", () => {
            clients = [];
            statusMsg = "Tabla vaciada correctamente.";
          }, { variant: "ghost" });

          yield;
        }
      });

      runtime.spawnProcess("db_ui_controller");
    },
  },

  // 7. Landing Page Moderna (SaaS & Producto)
  {
    id: "app_landing",
    name: "Landing Page Moderna (SaaS & Producto)",
    category: "web",
    description: "Página de aterrizaje responsiva con barra de navegación, hero banner, tarjetas de servicios y formulario de captación.",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV 3.0: LANDING PAGE MODERNA (SAAS & PRODUCTO)
// =================================================================
PROGRAM landing_page_app;

STORE app_state
  page_title: string = "Nova Studio - Desarrollo Rápido"
  active_nav: string = "Inicio"
  contact_email: string = ""
  subscribed: bool = false
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  set_ui_theme("android");
  screen_color(rgb(15, 23, 42));

  landing_controller();

  LOOP
    FRAME;
  END
END

PROCESS landing_controller()
BEGIN
  LOOP
    FRAME;
  END
END`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.set_ui_theme("android");
      runtime.renderOnlyOnDirty = true;
      runtime.clearScreen("#0f172a");
      runtime.markDirty();

      let activeSection = "Inicio";
      let emailLead = "";
      let subscribed = false;

      runtime.registerProcess("landing_controller", function* () {
        while (true) {
          // Top Web Navbar
          runtime.drawBox(0, 0, 640, 50, "#1e293b");
          runtime.drawText(0, 20, 18, 0, "★ NOVA WEB BUILDER");

          runtime.drawTabs(220, 8, 400, 34, ["Inicio", "Servicios", "Precios", "Contacto"], activeSection, (t) => {
            activeSection = t;
            runtime.markDirty();
          });

          // Hero Section
          if (activeSection === "Inicio") {
            runtime.drawBox(20, 70, 620, 220, "#1e293b");
            runtime.drawText(0, 45, 100, 0, "CREA TU SITIO WEB MODERNO CON WXDIV 3.0");
            runtime.drawText(0, 45, 130, 0, "Diseña visualmente con aceleración por GPU y exporta a Web, PWA o Android.");

            runtime.drawButton(45, 175, 160, 38, "Explorar Funciones", () => {
              activeSection = "Servicios";
              runtime.markDirty();
            }, { variant: "primary" });

            runtime.drawButton(215, 175, 160, 38, "Ver Precios", () => {
              activeSection = "Precios";
              runtime.markDirty();
            }, { variant: "secondary" });

            // 3 Feature Cards
            runtime.drawBox(20, 305, 200, 160, "#1e293b");
            runtime.drawText(0, 35, 325, 0, "⚡ ULTRA RÁPIDO");
            runtime.drawText(0, 35, 355, 0, "Sin lag. Acelerado con");
            runtime.drawText(0, 35, 375, 0, "WebGL / HTML5 Canvas.");

            runtime.drawBox(230, 305, 200, 160, "#1e293b");
            runtime.drawText(0, 245, 325, 0, "📱 TOUCH FIRST");
            runtime.drawText(0, 245, 355, 0, "Diseñado para móviles,");
            runtime.drawText(0, 245, 375, 0, "tablets y táctil.");

            runtime.drawBox(440, 305, 180, 160, "#1e293b");
            runtime.drawText(0, 455, 325, 0, "🤖 IA COPILOT");
            runtime.drawText(0, 455, 355, 0, "Genera código y layouts");
            runtime.drawText(0, 455, 375, 0, "en segundos con IA.");
          } else if (activeSection === "Servicios") {
            runtime.drawBox(20, 70, 620, 395, "#1e293b");
            runtime.drawText(0, 45, 95, 0, "SERVICIOS & CARACTERÍSTICAS TÉCNICAS");
            runtime.drawTable(35, 130, 570, 230, ["MÓDULO", "TECNOLOGÍA", "EXPORTACIÓN", "ESTADO"], [
              { c1: "Form Designer", c2: "Visual Basic 3.0 / React", c3: "DIV & Pascal", c4: "100% Nativo" },
              { c1: "Motor SQLite", c2: "Relational SQL In-Memory", c3: "JSON / SQLite", c4: "Activo" },
              { c1: "JS Bridge DLL", c2: "JavaScript Extensions", c3: "Capacitor / Tauri", c4: "Activo" },
              { c1: "Hardware Touch", c2: "Pointer Events GPU", c3: "Android / iOS", c4: "Activo" },
            ], { striped: true });

            runtime.drawButton(35, 385, 200, 34, "← Volver al Inicio", () => {
              activeSection = "Inicio";
              runtime.markDirty();
            }, { variant: "secondary" });
          } else if (activeSection === "Precios") {
            runtime.drawBox(20, 70, 620, 395, "#1e293b");
            runtime.drawText(0, 45, 95, 0, "PLANES DE SUSCRIPCIÓN");

            runtime.drawBox(35, 130, 180, 230, "#111827");
            runtime.drawText(0, 50, 150, 0, "COMMUNITY");
            runtime.drawText(0, 50, 180, 0, "$0 / mes");
            runtime.drawText(0, 50, 210, 0, "• Proyectos ilimitados");
            runtime.drawText(0, 50, 230, 0, "• Motor 2D DIV");
            runtime.drawButton(45, 300, 160, 34, "Plan Actual", undefined, { disabled: true });

            runtime.drawBox(230, 130, 180, 230, "#111827");
            runtime.drawText(0, 245, 150, 0, "PROFESSIONAL");
            runtime.drawText(0, 245, 180, 0, "$19 / mes");
            runtime.drawText(0, 245, 210, 0, "• Exportación Android");
            runtime.drawText(0, 245, 230, 0, "• SQLite & Plugins JS");
            runtime.drawButton(240, 300, 160, 34, "Seleccionar Pro", () => {}, { variant: "primary" });

            runtime.drawBox(425, 130, 180, 230, "#111827");
            runtime.drawText(0, 440, 150, 0, "ENTERPRISE");
            runtime.drawText(0, 440, 180, 0, "$49 / mes");
            runtime.drawText(0, 440, 210, 0, "• Servidor Multi-usuario");
            runtime.drawText(0, 440, 230, 0, "• Soporte 24/7");
            runtime.drawButton(435, 300, 160, 34, "Contactar Ventas", () => {
              activeSection = "Contacto";
              runtime.markDirty();
            }, { variant: "secondary" });
          } else {
            // Contacto
            runtime.drawBox(20, 70, 620, 395, "#1e293b");
            runtime.drawText(0, 45, 95, 0, "CONTACTO & NEWSLETTER");
            runtime.drawText(0, 45, 130, 0, "Suscríbete para recibir actualizaciones del ecosistema WXDIV 3.0:");

            runtime.drawInput(45, 165, 350, 38, emailLead, (v) => {
              emailLead = v;
              runtime.markDirty();
            }, "tu-correo@ejemplo.com");
            runtime.drawButton(405, 165, 150, 38, subscribed ? "¡Suscrito!" : "Suscribirme", () => {
              if (emailLead.includes("@")) {
                subscribed = true;
                runtime.markDirty();
              }
            }, { variant: subscribed ? "success" : "primary" });

            if (subscribed) {
              runtime.drawText(0, 45, 220, 0, "✓ Gracias por suscribirte. Te mantendremos informado.");
            }
          }

          yield;
        }
      });

      runtime.spawnProcess("landing_controller");
    },
  },

  // 8. Formulario de Login & Registro Visual (Visual Basic 3.0)
  {
    id: "app_login",
    name: "Formulario de Login & Registro (Visual Basic 3.0)",
    category: "business",
    description: "Formulario de autenticación clásico estilo Visual Basic 3.0 con cajas de texto, validación reactiva, casillas de verificación y diálogos modales.",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV 3.0: FORMULARIO DE ACCESO & AUTENTICACIÓN (ESTILO VB 3.0)
// =================================================================
PROGRAM login_form_app;

STORE app_state
  usuario_text: string = ""
  password_text: string = ""
  recordar_checked: bool = false
  estado_msg: string = "Listo para iniciar sesión."
  is_logged: bool = false
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  set_ui_theme("vb3");
  screen_color(rgb(15, 23, 42));

  login_controller();

  LOOP
    FRAME;
  END
END

PROCESS login_controller()
BEGIN
  LOOP
    FRAME;
  END
END`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.set_ui_theme("vb3");
      runtime.renderOnlyOnDirty = true;
      runtime.clearScreen("#1e293b");
      runtime.markDirty();

      let username = "";
      let password = "";
      let rememberMe = false;
      let statusMsg = "Introduce tus credenciales para ingresar al sistema.";
      let showSuccessModal = false;

      runtime.registerProcess("login_controller", function* (proc) {
        proc.graph = 0;
        while (true) {
          // Window Background Frame (Visual Basic 3.0 style)
          runtime.drawBox(120, 60, 520, 420, "#cbd5e1");
          runtime.drawOutlineBox(120, 60, 520, 420, "#334155");

          // Form Title Bar
          runtime.drawBox(120, 60, 520, 92, "#0f172a");
          runtime.drawText(0, 135, 72, 0, "Acceso al Sistema - Identificación de Usuario");

          // Icon / Subtitle
          runtime.drawText(0, 140, 110, 0, "Por favor, introduce tu usuario y contraseña de red:");

          // Username Label & Input
          runtime.drawText(0, 140, 140, 0, "Nombre de Usuario (o Correo):");
          runtime.drawInput(140, 160, 360, 36, username, (v) => {
            username = v;
            runtime.markDirty();
          }, "ej. usuario@dominio.com");

          // Password Label & Input
          runtime.drawText(0, 140, 210, 0, "Clave de Acceso / Contraseña:");
          runtime.drawInput(140, 230, 360, 36, password, (v) => {
            password = v;
            runtime.markDirty();
          }, "••••••••••••");

          // Checkbox
          runtime.drawButton(140, 280, 240, 30, `${rememberMe ? "☑" : "☐"} Recordar usuario en este equipo`, () => {
            rememberMe = !rememberMe;
            runtime.markDirty();
          }, { variant: rememberMe ? "primary" : "ghost" });

          // Submit & Cancel Buttons
          runtime.drawButton(140, 325, 170, 38, "Iniciar Sesión", () => {
            if (!username.trim()) {
              statusMsg = "Error: El campo de usuario no puede estar vacío.";
            } else if (!password.trim()) {
              statusMsg = "Error: Por favor escribe tu contraseña.";
            } else {
              statusMsg = `¡Bienvenido ${username}! Sesión iniciada con éxito.`;
              showSuccessModal = true;
            }
            runtime.markDirty();
          }, { variant: "primary" });

          runtime.drawButton(330, 325, 170, 38, "Limpiar Campos", () => {
            username = "";
            password = "";
            rememberMe = false;
            statusMsg = "Campos reiniciados.";
            runtime.markDirty();
          }, { variant: "secondary" });

          // Status Bar
          runtime.drawBox(120, 388, 520, 420, "#94a3b8");
          runtime.drawText(0, 130, 398, 0, `Estado: ${statusMsg}`);

          // Modal on success
          if (showSuccessModal) {
            runtime.drawModal(
              160,
              140,
              400,
              200,
              "Autenticación Satisfactoria",
              `Has accedido como '${username}'. El token de sesión fue registrado correctamente en el almacén reactivo.`,
              () => {
                showSuccessModal = false;
                runtime.markDirty();
              }
            );
          }

          yield;
        }
      });

      runtime.spawnProcess("login_controller");
    },
  },

  // 9. Editor de Texto con Menús & Scroll (Notepad WXDIV)
  {
    id: "app_text_editor",
    name: "Editor de Texto con Menús & Scroll (Notepad WXDIV)",
    category: "productivity",
    description: "Editor de texto completo estilo Bloc de Notas / Visual Basic con menús desplegables (Archivo, Edición, Formato, Ver), barra de herramientas, caja de texto multilínea con scroll, contador de líneas y barra de estado.",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV: EDITOR DE TEXTO (NOTEPAD CON MENÚS Y SCROLL)
// Lenguaje: Léxico DIV con UI Primitives y Gestión de Eventos
// =================================================================
PROGRAM notepad_wxdiv;

GLOBAL
  string doc_titulo = "SinTítulo.txt";
  string doc_texto = "¡Bienvenido a WXDIV Notepad!\n\nEste es un editor de texto interactivo con barra de menús,\nherramientas rápidas y desplazamiento fluido.\n\nPuedes escribir, cortar, copiar, pegar y guardar archivos.";
  int num_lineas = 5;
  int num_caracteres = 180;
  int fuente_tamano = 14;
  string fuente_familia = "Monospace";
  int ajuste_linea = 1;
  int menu_abierto = 0; // 0=ninguno, 1=Archivo, 2=Edición, 3=Formato, 4=Ayuda
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(192, 192, 192)); // Gris clásico Visual Basic 5.0

  notepad_controller();

  LOOP
    FRAME;
  END
END

// Proceso principal de interfaz de usuario
PROCESS notepad_controller()
BEGIN
  LOOP
    FRAME;
  END
END

// Procedimientos de eventos DIV
PROCESS mnuNuevo_Click()
BEGIN
  doc_texto = "";
  doc_titulo = "NuevoDocumento.txt";
END

PROCESS mnuGuardar_Click()
BEGIN
  save_text(doc_titulo, doc_texto);
END

PROCESS txtEditor_Change(nuevo_texto)
BEGIN
  doc_texto = nuevo_texto;
END`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.renderOnlyOnDirty = true;
      runtime.clearScreen("#1e293b");
      runtime.markDirty();

      let title = "Documento1.txt";
      let textContent = "¡Bienvenido a WXDIV Notepad!\n\nEste es un editor de texto interactivo completo estilo Visual Basic 5.0.\nIncluye:\n• Barra de menús: Archivo, Edición, Formato, Ver, Ayuda\n• Barra de herramientas rápidas (Nuevo, Abrir, Guardar, Copiar, Pegar)\n• Área de edición multilínea con barra de desplazamiento (Scroll)\n• Barra de estado inferior con contador de líneas, columnas y caracteres\n\nPrueba a escribir o pegar tu código aquí.";
      let activeMenu: string | null = null;
      let statusMsg = "Listo • Codificación: UTF-8";
      let fontSize = 14;
      let wordWrap = true;
      let showAboutModal = false;
      let scrollOffset = 0;

      runtime.registerProcess("notepad_controller", function* () {
        while (true) {
          // Window container (Visual Basic Form background)
          runtime.drawBox(0, 0, 640, 480, "#0f172a");

          // Form Header Bar
          runtime.drawBox(0, 0, 640, 28, "#0284c7");
          runtime.drawText(0, 10, 7, 0, `📄 WXDIV Notepad - [${title}]`);

          // Menu Bar (Archivo, Edición, Formato, Ver, Ayuda)
          runtime.drawBox(0, 28, 640, 56, "#1e293b");
          runtime.drawOutlineBox(0, 28, 640, 56, "#334155");

          const menuItems = ["Archivo", "Edición", "Formato", "Ver", "Ayuda"];
          menuItems.forEach((m, idx) => {
            const mx = 10 + idx * 75;
            const isMenuOpen = activeMenu === m;
            runtime.drawButton(
              mx,
              30,
              70,
              22,
              m,
              () => {
                activeMenu = isMenuOpen ? null : m;
                runtime.markDirty();
              },
              { variant: isMenuOpen ? "primary" : "ghost" }
            );
          });

          // Quick Action Toolbar
          runtime.drawBox(0, 56, 640, 92, "#131d33");
          runtime.drawOutlineBox(0, 56, 640, 92, "#24324f");

          runtime.drawButton(10, 60, 65, 26, "Nuevo", () => {
            textContent = "";
            title = "SinTítulo.txt";
            statusMsg = "Documento nuevo creado";
            activeMenu = null;
            runtime.markDirty();
          }, { variant: "ghost" });

          runtime.drawButton(80, 60, 65, 26, "Abrir", () => {
            textContent = "Ejemplo de archivo cargado desde WXDIV Studio.\nLínea 2: Datos de prueba.\nLínea 3: Sintaxis DIV activa.";
            title = "Ejemplo.div";
            statusMsg = "Archivo 'Ejemplo.div' cargado";
            activeMenu = null;
            runtime.markDirty();
          }, { variant: "ghost" });

          runtime.drawButton(150, 60, 75, 26, "Guardar", () => {
            statusMsg = `Archivo '${title}' guardado correctamente (${textContent.length} bytes)`;
            activeMenu = null;
            runtime.markDirty();
          }, { variant: "primary" });

          runtime.drawButton(235, 60, 65, 26, "Copiar", () => {
            navigator.clipboard?.writeText(textContent);
            statusMsg = "Texto copiado al portapapeles";
            runtime.markDirty();
          }, { variant: "secondary" });

          runtime.drawButton(305, 60, 65, 26, "Pegar", () => {
            navigator.clipboard?.readText().then((clip) => {
              if (clip) {
                textContent += "\n" + clip;
                statusMsg = "Texto pegado desde portapapeles";
                runtime.markDirty();
              }
            });
          }, { variant: "secondary" });

          runtime.drawButton(375, 60, 75, 26, "Limpiar", () => {
            textContent = "";
            statusMsg = "Editor vaciado";
            runtime.markDirty();
          }, { variant: "danger" });

          runtime.drawButton(455, 60, 85, 26, `Ajuste: ${wordWrap ? "Sí" : "No"}`, () => {
            wordWrap = !wordWrap;
            statusMsg = `Ajuste de línea: ${wordWrap ? "Activado" : "Desactivado"}`;
            runtime.markDirty();
          }, { variant: "ghost" });

          runtime.drawButton(545, 60, 85, 26, `Fuente: ${fontSize}pt`, () => {
            fontSize = fontSize === 14 ? 16 : fontSize === 16 ? 18 : 14;
            statusMsg = `Tamaño de fuente: ${fontSize}pt`;
            runtime.markDirty();
          }, { variant: "ghost" });

          // Editor Main Text Area with Scroll indicator
          const lines = textContent.split("\n");
          const lineCount = lines.length;
          const charCount = textContent.length;
          const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;

          // Main multiline input
          runtime.drawInput(
            10,
            96,
            595,
            350,
            textContent,
            (val) => {
              textContent = val;
              statusMsg = `Editando • Caracteres: ${val.length}`;
              runtime.markDirty();
            },
            "Escribe aquí..."
          );

          // Vertical ScrollBar widget
          runtime.drawScrollBar(
            610,
            96,
            20,
            350,
            scrollOffset,
            100,
            (newVal) => {
              scrollOffset = newVal;
              statusMsg = `Scroll: ${Math.round(newVal)}%`;
              runtime.markDirty();
            },
            "vertical"
          );

          // Bottom Status Bar
          runtime.drawBox(0, 452, 640, 480, "#1e293b");
          runtime.drawOutlineBox(0, 452, 640, 480, "#334155");
          runtime.drawText(0, 12, 460, 0, `Líneas: ${lineCount} | Palabras: ${wordCount} | Caracteres: ${charCount}`);
          runtime.drawText(0, 320, 460, 0, statusMsg);

          // Pop-up Menus if open
          if (activeMenu === "Archivo") {
            runtime.drawBox(10, 56, 170, 175, "#0f172a");
            runtime.drawOutlineBox(10, 56, 170, 175, "#38bdf8");
            runtime.drawButton(12, 60, 166, 24, "Nuevo Documento", () => {
              textContent = "";
              title = "Nuevo.txt";
              activeMenu = null;
              runtime.markDirty();
            }, { variant: "ghost" });
            runtime.drawButton(12, 88, 166, 24, "Abrir...", () => {
              activeMenu = null;
              statusMsg = "Abrir archivo";
              runtime.markDirty();
            }, { variant: "ghost" });
            runtime.drawButton(12, 116, 166, 24, "Guardar (Ctrl+S)", () => {
              activeMenu = null;
              statusMsg = `Guardado ${title}`;
              runtime.markDirty();
            }, { variant: "ghost" });
            runtime.drawButton(12, 144, 166, 24, "Cerrar Menú", () => {
              activeMenu = null;
              runtime.markDirty();
            }, { variant: "secondary" });
          } else if (activeMenu === "Edición") {
            runtime.drawBox(85, 56, 235, 175, "#0f172a");
            runtime.drawOutlineBox(85, 56, 235, 175, "#38bdf8");
            runtime.drawButton(87, 60, 146, 24, "Copiar Todo", () => {
              navigator.clipboard?.writeText(textContent);
              activeMenu = null;
              statusMsg = "Texto copiado";
              runtime.markDirty();
            }, { variant: "ghost" });
            runtime.drawButton(87, 88, 146, 24, "Seleccionar Todo", () => {
              activeMenu = null;
              statusMsg = "Texto completo seleccionado";
              runtime.markDirty();
            }, { variant: "ghost" });
            runtime.drawButton(87, 116, 146, 24, "Limpiar Contenido", () => {
              textContent = "";
              activeMenu = null;
              statusMsg = "Documento limpiado";
              runtime.markDirty();
            }, { variant: "ghost" });
            runtime.drawButton(87, 144, 146, 24, "Cerrar", () => {
              activeMenu = null;
              runtime.markDirty();
            }, { variant: "secondary" });
          } else if (activeMenu === "Ayuda") {
            runtime.drawBox(310, 56, 450, 120, "#0f172a");
            runtime.drawOutlineBox(310, 56, 450, 120, "#38bdf8");
            runtime.drawButton(312, 60, 136, 24, "Acerca de Notepad...", () => {
              showAboutModal = true;
              activeMenu = null;
              runtime.markDirty();
            }, { variant: "ghost" });
            runtime.drawButton(312, 88, 136, 24, "Cerrar", () => {
              activeMenu = null;
              runtime.markDirty();
            }, { variant: "secondary" });
          }

          if (showAboutModal) {
            runtime.drawModal(
              120,
              120,
              400,
              230,
              "Acerca de WXDIV Notepad",
              "Aplicación de edición de textos construida con la arquitectura Visual Basic 5.0 y léxico nativo DIV. Soporta menús, barras de herramientas, barras de desplazamiento y renderizado acelerado en Canvas 2D.",
              () => {
                showAboutModal = false;
                runtime.markDirty();
              }
            );
          }

          yield;
        }
      });

      runtime.spawnProcess("notepad_controller");
    },
  },

  // 10. Paint / Dibujo 2D en Canvas (Paint WXDIV)
  {
    id: "app_paint_canvas",
    name: "Paint 2D Canvas (Herramientas, Paleta & Dibujo)",
    category: "productivity",
    description: "Aplicación de dibujo estilo Paint clásico en Canvas 2D: paleta de 16 colores VGA, lápiz, pincel, borrador, formas geométricas (línea, rectángulo, círculo) y selector de tamaño.",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV: PAINT 2D EN CANVAS (HERRAMIENTAS & DIBUJO)
// Lenguaje: Léxico DIV con control directo de Canvas 2D
// =================================================================
PROGRAM paint_wxdiv;

GLOBAL
  string herramienta_actual = "lapiz"; // lapiz, pincel, borrador, linea, rect, circulo
  string color_actual = "#38bdf8";
  int grosor = 3;
  int lienzo_x = 90;
  int lienzo_y = 50;
  int lienzo_w = 530;
  int lienzo_h = 390;
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(192, 192, 192)); // Gris clásico Visual Basic 5.0

  paint_controller();

  LOOP
    FRAME;
  END
END

// Proceso principal de dibujo
PROCESS paint_controller()
BEGIN
  LOOP
    // Captura de eventos de ratón sobre el lienzo
    IF (mouse.left && mouse.x >= lienzo_x && mouse.x <= lienzo_x + lienzo_w && mouse.y >= lienzo_y && mouse.y <= lienzo_y + lienzo_h)
      ejecutar_trazo(mouse.x, mouse.y, herramienta_actual, color_actual, grosor);
    END
    FRAME;
  END
END`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.renderOnlyOnDirty = true;
      runtime.clearScreen("#1e293b");
      runtime.markDirty();

      let activeTool = "lapiz";
      let activeColor = "#38bdf8";
      let brushSize = 3;
      let statusMsg = "Herramienta: Lápiz • Color: Cyan • Tamaño: 3px";

      // 16 VGA Colors
      const palette = [
        "#000000", "#ffffff", "#7f7f7f", "#c3c3c3",
        "#880015", "#ed1c24", "#ff7f27", "#fff200",
        "#22b14c", "#00a2e8", "#3f48cc", "#a349a4",
        "#b97a57", "#ffaec9", "#b5e61d", "#99d9ea"
      ];

      // Stored drawn lines
      interface DrawStroke {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        color: string;
        size: number;
      }
      let strokes: DrawStroke[] = [];
      let lastMouse: { x: number; y: number } | null = null;

      runtime.registerProcess("paint_controller", function* () {
        while (true) {
          // Main window frame
          runtime.drawBox(0, 0, 640, 480, "#0f172a");

          // Title bar
          runtime.drawBox(0, 0, 640, 28, "#2563eb");
          runtime.drawText(0, 10, 7, 0, "🎨 WXDIV Paint - Lienzo Canvas 2D (Sin DirectX)");

          // Left Tool Palette (Visual Basic 5 style)
          runtime.drawBox(0, 28, 85, 452, "#1e293b");
          runtime.drawOutlineBox(0, 28, 85, 452, "#334155");
          runtime.drawText(0, 8, 36, 0, "HERRAMIENTAS");

          const tools = [
            { id: "lapiz", label: "✏ Lápiz" },
            { id: "pincel", label: "🖌 Pincel" },
            { id: "borrador", label: "🧽 Borrador" },
            { id: "linea", label: "📏 Línea" },
            { id: "rect", label: "▭ Rectángulo" },
            { id: "circulo", label: "◯ Círculo" },
          ];

          tools.forEach((t, i) => {
            const ty = 55 + i * 32;
            const isSelected = activeTool === t.id;
            runtime.drawButton(
              6,
              ty,
              73,
              28,
              t.label,
              () => {
                activeTool = t.id;
                statusMsg = `Herramienta: ${t.label} • Color: ${activeColor}`;
                runtime.markDirty();
              },
              { variant: isSelected ? "primary" : "ghost" }
            );
          });

          // Brush Size Buttons
          runtime.drawText(0, 8, 255, 0, "GROSOR");
          const sizes = [1, 3, 6, 12];
          sizes.forEach((s, idx) => {
            const sx = 8 + (idx % 2) * 36;
            const sy = 275 + Math.floor(idx / 2) * 32;
            runtime.drawButton(
              sx,
              sy,
              32,
              26,
              `${s}px`,
              () => {
                brushSize = s;
                statusMsg = `Grosor: ${s}px`;
                runtime.markDirty();
              },
              { variant: brushSize === s ? "primary" : "secondary" }
            );
          });

          // Actions: Clear & Undo
          runtime.drawButton(6, 350, 73, 28, "Limpiar", () => {
            strokes = [];
            statusMsg = "Lienzo borrado";
            runtime.markDirty();
          }, { variant: "danger" });

          runtime.drawButton(6, 385, 73, 28, "Deshacer", () => {
            strokes.splice(-20);
            statusMsg = "Último trazo deshecho";
            runtime.markDirty();
          }, { variant: "secondary" });

          // Canvas 2D Drawing Area
          const cx = 90;
          const cy = 35;
          const cw = 540;
          const ch = 375;

          runtime.drawBox(cx, cy, cx + cw, cy + ch, "#ffffff");
          runtime.drawOutlineBox(cx, cy, cx + cw, cy + ch, "#0284c7");

          // Draw all recorded strokes onto canvas
          strokes.forEach((st) => {
            runtime.drawBox(
              st.x1 - st.size / 2,
              st.y1 - st.size / 2,
              st.x1 + st.size / 2,
              st.y1 + st.size / 2,
              st.color
            );
          });

          // Mouse drawing interaction
          const mx = runtime.mouseState.x;
          const my = runtime.mouseState.y;
          if (runtime.mouseState.left && mx >= cx && mx <= cx + cw && my >= cy && my <= cy + ch) {
            const drawCol = activeTool === "borrador" ? "#ffffff" : activeColor;
            const drawSz = activeTool === "borrador" ? brushSize * 3 : brushSize;
            strokes.push({
              x1: mx,
              y1: my,
              x2: lastMouse ? lastMouse.x : mx,
              y2: lastMouse ? lastMouse.y : my,
              color: drawCol,
              size: drawSz,
            });
            lastMouse = { x: mx, y: my };
            runtime.markDirty();
          } else {
            lastMouse = null;
          }

          // Bottom Palette Bar (16 VGA colors)
          runtime.drawBox(90, 415, 630, 450, "#1e293b");
          runtime.drawOutlineBox(90, 415, 630, 450, "#334155");

          palette.forEach((col, i) => {
            const px = 98 + i * 28;
            const isColSelected = activeColor === col;
            runtime.drawBox(px, 420, px + 22, 442, col);
            if (isColSelected) {
              runtime.drawOutlineBox(px - 2, 418, px + 24, 444, "#facc15");
            }
            // Color picker click
            if (runtime.mouseState.left && mx >= px && mx <= px + 22 && my >= 420 && my <= 442) {
              activeColor = col;
              statusMsg = `Color seleccionado: ${col}`;
              runtime.markDirty();
            }
          });

          // Current active color preview box
          runtime.drawBox(550, 420, 620, 442, activeColor);
          runtime.drawOutlineBox(550, 420, 620, 442, "#ffffff");

          // Status Bar
          runtime.drawBox(0, 452, 640, 480, "#111827");
          runtime.drawText(0, 10, 460, 0, statusMsg);
          runtime.drawText(0, 520, 460, 0, `X: ${mx}, Y: ${my}`);

          yield;
        }
      });

      runtime.spawnProcess("paint_controller");
    },
  },

  // 11. Calculadora Estándar & Científica (Calc WXDIV)
  {
    id: "app_calculator_sci",
    name: "Calculadora Estándar & Científica (Calc WXDIV)",
    category: "finance",
    description: "Calculadora interactiva estilo Visual Basic 5.0 con pantalla LCD digital, historial de operaciones, teclado numérico, operadores matemáticos (+, -, *, /, =), memoria (MC, MR, M+, M-) y funciones científicas (√, x², %, 1/x).",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV: CALCULADORA ESTÁNDAR Y CIENTÍFICA
// Lenguaje: Léxico DIV con UI Primitives y Lógica Matemática
// =================================================================
PROGRAM calculadora_wxdiv;

GLOBAL
  string pantalla_display = "0";
  string operacion_previa = "";
  float memoria_m = 0.0;
  float operando_1 = 0.0;
  string operador_actual = "";
  int limpiar_en_proximo_digito = 0;
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(192, 192, 192)); // Gris clásico Visual Basic 5.0

  calc_controller();

  LOOP
    FRAME;
  END
END

// Proceso principal de la calculadora
PROCESS calc_controller()
BEGIN
  LOOP
    FRAME;
  END
END

// Eventos de teclado numérico y operaciones
PROCESS cmdDigito_Click(digito)
BEGIN
  IF (pantalla_display == "0" || limpiar_en_proximo_digito == 1)
    pantalla_display = digito;
    limpiar_en_proximo_digito = 0;
  ELSE
    pantalla_display = pantalla_display + digito;
  END
END

PROCESS cmdOperador_Click(op)
BEGIN
  operando_1 = atof(pantalla_display);
  operador_actual = op;
  operacion_previa = pantalla_display + " " + op;
  limpiar_en_proximo_digito = 1;
END

PROCESS cmdIgual_Click()
BEGIN
  float operando_2 = atof(pantalla_display);
  float resultado = 0.0;
  IF (operador_actual == "+") resultado = operando_1 + operando_2; END
  IF (operador_actual == "-") resultado = operando_1 - operando_2; END
  IF (operador_actual == "*") resultado = operando_1 * operando_2; END
  IF (operador_actual == "/") resultado = operando_1 / operando_2; END
  operacion_previa = operacion_previa + " " + pantalla_display + " =";
  pantalla_display = ftoa(resultado);
  limpiar_en_proximo_digito = 1;
END`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.renderOnlyOnDirty = true;
      runtime.clearScreen("#1e293b");
      runtime.markDirty();

      let display = "0";
      let history = "";
      let operand1: number | null = null;
      let pendingOp: string | null = null;
      let clearOnNext = false;
      let memoryVal = 0;
      let tape: string[] = ["Calculadora WXDIV iniciada", "Memoria: 0.00"];

      const handleDigit = (d: string) => {
        if (display === "0" || clearOnNext) {
          display = d;
          clearOnNext = false;
        } else {
          display += d;
        }
        runtime.markDirty();
      };

      const handleOp = (op: string) => {
        operand1 = parseFloat(display);
        pendingOp = op;
        history = `${display} ${op}`;
        clearOnNext = true;
        runtime.markDirty();
      };

      const handleEquals = () => {
        if (operand1 !== null && pendingOp) {
          const operand2 = parseFloat(display);
          let res = 0;
          if (pendingOp === "+") res = operand1 + operand2;
          else if (pendingOp === "-") res = operand1 - operand2;
          else if (pendingOp === "×") res = operand1 * operand2;
          else if (pendingOp === "÷") res = operand2 !== 0 ? operand1 / operand2 : 0;
          tape.push(`${operand1} ${pendingOp} ${operand2} = ${res}`);
          history = `${operand1} ${pendingOp} ${operand2} =`;
          display = String(res);
          operand1 = null;
          pendingOp = null;
          clearOnNext = true;
          runtime.markDirty();
        }
      };

      const handleClear = () => {
        display = "0";
        history = "";
        operand1 = null;
        pendingOp = null;
        clearOnNext = false;
        runtime.markDirty();
      };

      const handleSqrt = () => {
        const val = parseFloat(display);
        if (val >= 0) {
          const res = Math.sqrt(val);
          tape.push(`√(${val}) = ${res}`);
          display = String(res);
          clearOnNext = true;
          runtime.markDirty();
        }
      };

      const handleSquare = () => {
        const val = parseFloat(display);
        const res = val * val;
        tape.push(`sqr(${val}) = ${res}`);
        display = String(res);
        clearOnNext = true;
        runtime.markDirty();
      };

      runtime.registerProcess("calc_controller", function* () {
        while (true) {
          // Background frame (Visual Basic 5 form)
          runtime.drawBox(0, 0, 640, 480, "#0f172a");

          // Form Header
          runtime.drawBox(0, 0, 640, 28, "#0284c7");
          runtime.drawText(0, 10, 7, 0, "🧮 WXDIV Calc - Calculadora Estándar & Científica");

          // Left Calculator Body
          const bx = 30;
          const by = 45;
          const bw = 380;
          const bh = 415;

          runtime.drawBox(bx, by, bx + bw, by + bh, "#1e293b");
          runtime.drawOutlineBox(bx, by, bx + bw, by + bh, "#334155");

          // LCD Display Area
          runtime.drawBox(bx + 15, by + 15, bx + bw - 15, by + 90, "#0f172a");
          runtime.drawOutlineBox(bx + 15, by + 15, bx + bw - 15, by + 90, "#38bdf8");

          // History readout (small top line)
          runtime.drawText(0, bx + 25, by + 25, 0, history || (memoryVal !== 0 ? `M = ${memoryVal}` : " "));
          // Main number display
          runtime.drawText(0, bx + 25, by + 55, 0, display);

          // Memory Row Buttons (MC, MR, M+, M-)
          const memButtons = [
            { label: "MC", act: () => { memoryVal = 0; tape.push("Memoria borrada"); runtime.markDirty(); } },
            { label: "MR", act: () => { display = String(memoryVal); clearOnNext = true; runtime.markDirty(); } },
            { label: "M+", act: () => { memoryVal += parseFloat(display); tape.push(`M+ ${display} -> ${memoryVal}`); runtime.markDirty(); } },
            { label: "M-", act: () => { memoryVal -= parseFloat(display); tape.push(`M- ${display} -> ${memoryVal}`); runtime.markDirty(); } },
          ];

          memButtons.forEach((m, idx) => {
            const mx = bx + 15 + idx * 88;
            runtime.drawButton(mx, by + 100, 80, 28, m.label, m.act, { variant: "ghost" });
          });

          // Function row (%, √, x², 1/x)
          const fnButtons = [
            { label: "%", act: () => { display = String(parseFloat(display) / 100); clearOnNext = true; runtime.markDirty(); } },
            { label: "√x", act: handleSqrt },
            { label: "x²", act: handleSquare },
            { label: "1/x", act: () => { const v = parseFloat(display); if (v !== 0) display = String(1 / v); clearOnNext = true; runtime.markDirty(); } },
          ];

          fnButtons.forEach((fn, idx) => {
            const fx = bx + 15 + idx * 88;
            runtime.drawButton(fx, by + 135, 80, 32, fn.label, fn.act, { variant: "secondary" });
          });

          // Keypad Layout (4 columns x 5 rows)
          const keypad = [
            [
              { label: "CE", act: () => { display = "0"; runtime.markDirty(); }, col: "ghost" as const },
              { label: "C", act: handleClear, col: "danger" as const },
              { label: "⌫", act: () => { display = display.length > 1 ? display.slice(0, -1) : "0"; runtime.markDirty(); }, col: "ghost" as const },
              { label: "÷", act: () => handleOp("÷"), col: "primary" as const },
            ],
            [
              { label: "7", act: () => handleDigit("7"), col: "secondary" as const },
              { label: "8", act: () => handleDigit("8"), col: "secondary" as const },
              { label: "9", act: () => handleDigit("9"), col: "secondary" as const },
              { label: "×", act: () => handleOp("×"), col: "primary" as const },
            ],
            [
              { label: "4", act: () => handleDigit("4"), col: "secondary" as const },
              { label: "5", act: () => handleDigit("5"), col: "secondary" as const },
              { label: "6", act: () => handleDigit("6"), col: "secondary" as const },
              { label: "-", act: () => handleOp("-"), col: "primary" as const },
            ],
            [
              { label: "1", act: () => handleDigit("1"), col: "secondary" as const },
              { label: "2", act: () => handleDigit("2"), col: "secondary" as const },
              { label: "3", act: () => handleDigit("3"), col: "secondary" as const },
              { label: "+", act: () => handleOp("+"), col: "primary" as const },
            ],
            [
              { label: "±", act: () => { display = String(-parseFloat(display)); runtime.markDirty(); }, col: "secondary" as const },
              { label: "0", act: () => handleDigit("0"), col: "secondary" as const },
              { label: ".", act: () => { if (!display.includes(".")) display += "."; runtime.markDirty(); }, col: "secondary" as const },
              { label: "=", act: handleEquals, col: "success" as const },
            ],
          ];

          keypad.forEach((row, rIdx) => {
            const ry = by + 175 + rIdx * 45;
            row.forEach((btn, cIdx) => {
              const rx = bx + 15 + cIdx * 88;
              runtime.drawButton(rx, ry, 80, 38, btn.label, btn.act, { variant: btn.col });
            });
          });

          // Right Side: History Tape Panel (Historial de Operaciones)
          const hx = 425;
          const hy = 45;
          const hw = 195;
          const hh = 415;

          runtime.drawBox(hx, hy, hx + hw, hy + hh, "#131d33");
          runtime.drawOutlineBox(hx, hy, hx + hw, hy + hh, "#24324f");
          runtime.drawText(0, hx + 12, hy + 15, 0, "HISTORIAL / TAPE");

          // Render last 8 tape items
          const recentTape = tape.slice(-9);
          recentTape.forEach((item, idx) => {
            runtime.drawText(0, hx + 12, hy + 45 + idx * 36, 0, item.substring(0, 22));
          });

          runtime.drawButton(hx + 15, hy + hh - 42, hw - 30, 28, "Borrar Historial", () => {
            tape = ["Historial vaciado"];
            runtime.markDirty();
          }, { variant: "ghost" });

          yield;
        }
      });

      runtime.spawnProcess("calc_controller");
    },
  },

  // 12. Juego Arcade 2D con Canvas & ActiveX Code View
  {
    id: "game_arcade_canvas",
    name: "Juego Arcade 2D con Canvas & Código DIV Integrado",
    category: "game" as any,
    description: "Juego arcade 2D ejecutándose en un control Canvas PictureBox dentro del formulario con el código DIV visible y editable simultáneamente en el IDE (estilo ActiveX en Visual Basic 5.0).",
    resolution: "640x480",
    code: `// =================================================================
// WXDIV: JUEGO ARCADE 2D EN CANVAS CON PROCESOS DIV
// Ejecutándose en Canvas PictureBox (Lienzo 2D a 60 FPS)
// =================================================================
PROGRAM arcade_canvas_div;

GLOBAL
  int score = 0;
  int vidas = 3;
  int nave_x = 320;
  int nave_y = 420;
  int laser_activo = 0;
  int laser_x = 0;
  int laser_y = 0;
  int enemigo_x = 320;
  int enemigo_y = 60;
  int enemigo_dir = 4;
END

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(10, 15, 28));

  // Iniciar procesos concurrentes DIV
  proceso_nave();
  proceso_enemigo();
  proceso_estrellas();

  LOOP
    FRAME;
  END
END

// Proceso de la Nave del Jugador
PROCESS proceso_nave()
BEGIN
  LOOP
    IF (key(_left) || key(_a))  nave_x -= 6; END
    IF (key(_right) || key(_d)) nave_x += 6; END
    IF (key(_space) && laser_activo == 0)
      proceso_disparo(nave_x, nave_y - 15);
    END
    draw_box(nave_x - 18, nave_y, nave_x + 18, nave_y + 12, "#38bdf8");
    draw_box(nave_x - 4, nave_y - 12, nave_x + 4, nave_y, "#facc15");
    FRAME;
  END
END

// Proceso de Disparo Láser
PROCESS proceso_disparo(x, y)
BEGIN
  laser_activo = 1;
  laser_x = x;
  laser_y = y;
  WHILE (laser_y > 20)
    laser_y -= 12;
    draw_box(laser_x - 2, laser_y, laser_x + 2, laser_y + 10, "#4ade80");
    // Detección de colisión con el enemigo
    IF (abs(laser_x - enemigo_x) < 25 && abs(laser_y - enemigo_y) < 18)
      score += 100;
      sound(1, 120, 480);
      enemigo_y = 40;
      enemigo_x = rand(40, 600);
      BREAK;
    END
    FRAME;
  END
  laser_activo = 0;
END

// Proceso de Enemigo Alienígena
PROCESS proceso_enemigo()
BEGIN
  LOOP
    enemigo_x += enemigo_dir;
    IF (enemigo_x > 600 || enemigo_x < 40)
      enemigo_dir = -enemigo_dir;
      enemigo_y += 15;
    END
    draw_box(enemigo_x - 20, enemigo_y - 10, enemigo_x + 20, enemigo_y + 10, "#ef4444");
    draw_box(enemigo_x - 8, enemigo_y - 4, enemigo_x + 8, enemigo_y + 4, "#fbbf24");
    FRAME;
  END
END`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.setResolution("640x480");
      runtime.clearScreen("#070b14");

      let pX = 320;
      let pY = 420;
      let score = 0;
      let lives = 3;
      let lasers: { x: number; y: number }[] = [];
      let aliens: { x: number; y: number; dir: number }[] = [
        { x: 100, y: 80, dir: 3 },
        { x: 250, y: 80, dir: 3 },
        { x: 400, y: 80, dir: 3 },
        { x: 550, y: 80, dir: 3 },
        { x: 180, y: 130, dir: -3 },
        { x: 330, y: 130, dir: -3 },
        { x: 480, y: 130, dir: -3 },
      ];
      let stars: { x: number; y: number; s: number }[] = [];
      for (let i = 0; i < 50; i++) {
        stars.push({ x: Math.random() * 640, y: Math.random() * 480, s: Math.random() * 3 + 1 });
      }

      runtime.registerProcess("arcade_controller", function* () {
        while (true) {
          // Clear background
          runtime.clearScreen("#070b14");

          // Stars background
          stars.forEach((st) => {
            st.y += st.s;
            if (st.y > 480) { st.y = 0; st.x = Math.random() * 640; }
            runtime.drawBox(st.x, st.y, st.x + 1, st.y + 1, "#475569");
          });

          // HUD
          runtime.drawText(0, 20, 20, 0, `SCORE: ${score}  |  VIDAS: ${lives}  |  CANVAS 2D 60 FPS`);

          // Player controls
          if (runtime.key("left") || runtime.key("a")) pX = Math.max(30, pX - 6);
          if (runtime.key("right") || runtime.key("d")) pX = Math.min(610, pX + 6);
          if (runtime.key("space") || runtime.key("enter")) {
            if (lasers.length < 4) {
              lasers.push({ x: pX, y: pY - 15 });
              runtime.sound(1, 60, 380);
            }
          }

          // Player spaceship
          runtime.drawBox(pX - 18, pY, pX + 18, pY + 12, "#38bdf8");
          runtime.drawBox(pX - 4, pY - 14, pX + 4, pY, "#facc15");

          // Lasers
          lasers = lasers.filter((l) => {
            l.y -= 12;
            runtime.drawBox(l.x - 2, l.y, l.x + 2, l.y + 10, "#4ade80");
            return l.y > 10;
          });

          // Aliens
          aliens.forEach((a) => {
            a.x += a.dir;
            if (a.x > 610 || a.x < 30) {
              a.dir = -a.dir;
              a.y += 12;
            }
            runtime.drawBox(a.x - 18, a.y - 10, a.x + 18, a.y + 10, "#ef4444");
            runtime.drawBox(a.x - 6, a.y - 4, a.x + 6, a.y + 4, "#fbbf24");

            // Collision check
            lasers = lasers.filter((l) => {
              if (Math.abs(l.x - a.x) < 22 && Math.abs(l.y - a.y) < 14) {
                score += 100;
                a.y = 50;
                a.x = Math.random() * 560 + 40;
                runtime.sound(1, 100, 520);
                return false;
              }
              return true;
            });
          });

          yield;
        }
      });

      runtime.spawnProcess("arcade_controller");
    },
  },
];

