import { DivRuntime } from "./runtime";
import { appStore } from "./appStore";

export interface AppTemplate {
  id: string;
  name: string;
  category: "productivity" | "analytics" | "ai" | "business" | "finance";
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
      runtime.clearScreen("#0a0f1e");

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
];
