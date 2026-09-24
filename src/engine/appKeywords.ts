import { DivSuggestion } from "./divKeywords";

/**
 * App, UI, Reactive Store & Multiplatform Keywords for WXDIV 3.0 / Visual Basic style Development
 */
export const APP_AUTOCOMPLETE_ITEMS: DivSuggestion[] = [
  // =========================================================================
  // REACTIVE STATE & STORE KEYWORDS
  // =========================================================================
  {
    name: "STORE",
    type: "keyword",
    description: "Declara un bloque de estado reactivo global o por módulo (similar a Redux / State Store).",
    syntax: "STORE nombre_estado\n  campo: tipo = valor_inicial\nEND",
    insertText: "STORE app_state\n  usuario: string = \"\"\n  contador: int = 0\nEND",
    categoryLabel: "Estado Reactivo",
  },
  {
    name: "BIND",
    type: "keyword",
    description: "Vincula bidireccionalmente un control de UI con una propiedad del STORE reactivo.",
    syntax: "BIND(control, \"store.propiedad\");",
    insertText: "BIND(txtEmail, \"app_state.email\");",
    categoryLabel: "Data Binding",
  },
  {
    name: "store_get",
    type: "function",
    description: "Lee un valor del almacén reactivo (ej. 'user.nombre').",
    syntax: "store_get(\"clave.propiedad\", [valor_por_defecto])",
    insertText: "store_get(\"",
    categoryLabel: "Estado Reactivo",
  },
  {
    name: "store_set",
    type: "function",
    description: "Modifica un valor del almacén reactivo, notificando observadores y disparando redibujado.",
    syntax: "store_set(\"clave.propiedad\", nuevo_valor)",
    insertText: "store_set(\"",
    categoryLabel: "Estado Reactivo",
  },
  {
    name: "store_watch",
    type: "function",
    description: "Registra un observador que se ejecuta cuando cambia una clave específica del estado.",
    syntax: "store_watch(\"clave\", funcion_callback)",
    insertText: "store_watch(\"",
    categoryLabel: "Estado Reactivo",
  },

  // =========================================================================
  // EVENTOS & CONTROLADORES DE ACCIÓN (ESTILO VISUAL BASIC / .NET)
  // =========================================================================
  {
    name: "ON_CLICK",
    type: "keyword",
    description: "Declara el controlador de evento que se ejecuta al pulsar un botón o componente visual.",
    syntax: "PROCESS nombre_click()\nBEGIN\n  // Acciones al hacer click\nEND",
    insertText: "PROCESS btn_aceptar_click()\nBEGIN\n  write(0, 30, 420, 0, \"Click aceptado!\");\nEND",
    categoryLabel: "Eventos Visuales",
  },
  {
    name: "NAVIGATE",
    type: "keyword",
    description: "Navega a otra pantalla o ruta de la aplicación.",
    syntax: "navigate(\"ruta\", { parametros });",
    insertText: "navigate(\"dashboard\");",
    categoryLabel: "Navegación",
  },
  {
    name: "navigate",
    type: "function",
    description: "Cambia la ruta activa de la app y notifica a las vistas suscritas.",
    syntax: "navigate(\"nombre_pantalla\", params?)",
    insertText: "navigate(\"",
    categoryLabel: "Navegación",
  },
  {
    name: "on_route_change",
    type: "function",
    description: "Suscribe un callback al cambio de pantalla o ruta en la aplicación.",
    syntax: "on_route_change(callback)",
    insertText: "on_route_change(",
    categoryLabel: "Navegación",
  },

  // =========================================================================
  // SISTEMA DE DISEÑO DE LAYOUT Y RETÍCULA
  // =========================================================================
  {
    name: "LAYOUT",
    type: "keyword",
    description: "Bloque contenedor con distribución automática horizontal, vertical o en cuadrícula.",
    syntax: "layout_begin(\"vertical\" | \"horizontal\" | \"grid\", x, y, ancho, alto, gap, padding);\n  // componentes...\nlayout_end();",
    insertText: "layout_begin(\"vertical\", 20, 60, 600, 300, 10, 12);\n  // Elementos con layout_next()\nlayout_end();",
    categoryLabel: "Diseño Layout",
  },
  {
    name: "layout_begin",
    type: "function",
    description: "Inicia un contexto de maquetación automática (vertical, horizontal o rejilla).",
    syntax: "layout_begin(tipo, x, y, width, height, gap, padding, cols?)",
    insertText: "layout_begin(\"vertical\", ",
    categoryLabel: "Diseño Layout",
  },
  {
    name: "layout_next",
    type: "function",
    description: "Obtiene las coordenadas {x, y, w, h} calculadas automáticamente para el siguiente componente.",
    syntax: "layout_next(ancho_personalizado, alto_personalizado)",
    insertText: "layout_next(",
    categoryLabel: "Diseño Layout",
  },
  {
    name: "layout_end",
    type: "function",
    description: "Cierra el bloque actual de maquetación de layout.",
    syntax: "layout_end()",
    insertText: "layout_end();",
    categoryLabel: "Diseño Layout",
  },

  // =========================================================================
  // PRIMITIVAS DE UI Y FORMULARIOS (VISUAL BASIC 3.0 / WXDIV)
  // =========================================================================
  {
    name: "draw_button",
    type: "function",
    description: "Dibuja un botón interactivo táctil/ratón con callback onClick y variantes temáticas.",
    syntax: "draw_button(x, y, ancho, alto, texto, callback, opciones?)",
    insertText: "draw_button(",
    categoryLabel: "Controles UI",
  },
  {
    name: "draw_input",
    type: "function",
    description: "Crea una caja de texto editable (TextBox) con foco, cursor parpadeante y callback onChange.",
    syntax: "draw_input(x, y, ancho, alto, valor_actual, onChange, placeholder?)",
    insertText: "draw_input(",
    categoryLabel: "Controles UI",
  },
  {
    name: "draw_table",
    type: "function",
    description: "Renderiza una tabla de datos completa con cabeceras de columna y filas alternadas.",
    syntax: "draw_table(x, y, ancho, alto, [cabeceras], [filas_o_datos])",
    insertText: "draw_table(",
    categoryLabel: "Controles UI",
  },
  {
    name: "draw_select",
    type: "function",
    description: "Desplegable de selección (ComboBox) con lista de opciones y selección interactiva.",
    syntax: "draw_select(x, y, ancho, alto, [opciones], indice_seleccionado, onSelect)",
    insertText: "draw_select(",
    categoryLabel: "Controles UI",
  },
  {
    name: "draw_tabs",
    type: "function",
    description: "Barra de navegación por pestañas con indicador de pestaña activa y callback.",
    syntax: "draw_tabs(x, y, ancho, alto, [nombres_pestanas], pestana_activa, onTabChange)",
    insertText: "draw_tabs(",
    categoryLabel: "Controles UI",
  },
  {
    name: "draw_modal",
    type: "function",
    description: "Muestra una ventana modal flotante con oscurecimiento de fondo, título, contenido y botón cerrar.",
    syntax: "draw_modal(x, y, ancho, alto, titulo, contenido, onClose)",
    insertText: "draw_modal(",
    categoryLabel: "Controles UI",
  },
  {
    name: "draw_checkbox",
    type: "function",
    description: "Control de casilla de verificación con estado booleano marcado/desmarcado.",
    syntax: "draw_checkbox(x, y, ancho, alto, etiqueta, marcado, onToggle)",
    insertText: "draw_checkbox(",
    categoryLabel: "Controles UI",
  },
  {
    name: "set_ui_theme",
    type: "function",
    description: "Aplica un tema visual global: 'android' (Material You), 'vb3' (Visual Basic Clásico) o 'dark'.",
    syntax: "set_ui_theme(\"android\" | \"vb3\" | \"dark\")",
    insertText: "set_ui_theme(\"vb3\");",
    categoryLabel: "Temas Visuales",
  },

  // =========================================================================
  // ALMACENAMIENTO PERSISTENTE, SQLITE Y RED
  // =========================================================================
  {
    name: "sqlite_query",
    type: "function",
    description: "Ejecuta una consulta SQL relacional en la base de datos SQLite integrada local (SELECT, INSERT, UPDATE).",
    syntax: "sqlite_query(\"SELECT * FROM clientes WHERE activo = 1\")",
    insertText: "sqlite_query(\"SELECT * FROM ",
    categoryLabel: "Base de Datos",
  },
  {
    name: "sqlite_create_table",
    type: "function",
    description: "Crea una nueva tabla relacional en la base de datos de la aplicación.",
    syntax: "sqlite_create_table(\"nombre_tabla\", [\"col1\", \"col2\", \"col3\"])",
    insertText: "sqlite_create_table(\"",
    categoryLabel: "Base de Datos",
  },
  {
    name: "load_json",
    type: "function",
    description: "Carga datos persistentes JSON desde el disco / LocalStorage con valor por defecto.",
    syntax: "load_json(\"nombre_archivo.json\", [valor_por_defecto])",
    insertText: "load_json(\"",
    categoryLabel: "Persistencia",
  },
  {
    name: "save_json",
    type: "function",
    description: "Guarda un objeto o arreglo de datos de forma persistente en disco / almacenamiento local.",
    syntax: "save_json(\"nombre_archivo.json\", datos)",
    insertText: "save_json(\"",
    categoryLabel: "Persistencia",
  },
  {
    name: "http_get",
    type: "function",
    description: "Realiza una petición HTTP GET asíncrona a un servicio o API REST externa.",
    syntax: "http_get(url, callback_exito, callback_error)",
    insertText: "http_get(\"",
    categoryLabel: "Red & APIs",
  },
  {
    name: "http_post",
    type: "function",
    description: "Envía datos mediante HTTP POST a un endpoint o API REST.",
    syntax: "http_post(url, payload_objeto, callback)",
    insertText: "http_post(\"",
    categoryLabel: "Red & APIs",
  },

  // =========================================================================
  // AUTENTICACIÓN Y ROLES
  // =========================================================================
  {
    name: "auth_login",
    type: "function",
    description: "Inicia sesión con credenciales, generando token de sesión seguro y actualizando 'user.logged'.",
    syntax: "auth_login(email, password)",
    insertText: "auth_login(",
    categoryLabel: "Autenticación",
  },
  {
    name: "auth_logout",
    type: "function",
    description: "Cierra la sesión actual del usuario y limpia el almacén de seguridad.",
    syntax: "auth_logout()",
    insertText: "auth_logout();",
    categoryLabel: "Autenticación",
  },
  {
    name: "auth_is_logged",
    type: "function",
    description: "Comprueba si existe un usuario autenticado en la sesión activa.",
    syntax: "auth_is_logged()",
    insertText: "auth_is_logged()",
    categoryLabel: "Autenticación",
  },
];
