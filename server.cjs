var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);

// src/engine/ai/precodeEngine.ts
var PRECODE_LIBRARY = [
  // Movimiento
  {
    id: "pre_move_8dir",
    category: "movement",
    name: "Control 8-Direcciones (WASD/Flechas)",
    description: "Bucle de movimiento fluido con l\xEDmites de pantalla seguros",
    tokenSavings: "180 tokens",
    keywords: ["mover", "movimiento", "teclado", "flechas", "wasd", "jugador", "control", "player"],
    snippet: `// Bloque Prec\xF3digo: Movimiento 8 Direcciones
IF (key(_left) OR key(_a)) x -= velocidad; END
IF (key(_right) OR key(_d)) x += velocidad; END
IF (key(_up) OR key(_w)) y -= velocidad; END
IF (key(_down) OR key(_s)) y += velocidad; END
x = max(20, min(620, x));
y = max(20, min(460, y));`
  },
  {
    id: "pre_move_platformer",
    category: "movement",
    name: "Salto y Gravedad (Plataformas)",
    description: "F\xEDsicas verticales para juegos de plataformas 2D con suelo",
    tokenSavings: "240 tokens",
    keywords: ["plataforma", "plataformas", "saltar", "salto", "gravedad", "mario", "suelo"],
    snippet: `// Bloque Prec\xF3digo: Salto y Gravedad
IF (key(_left) OR key(_a)) x -= 5; END
IF (key(_right) OR key(_d)) x += 5; END
IF ((key(_space) OR key(_up) OR key(_w)) AND en_suelo == 1)
  vy = -12;
  en_suelo = 0;
  sound(1, 70, 320);
END
vy += 0.6;
y += vy;
IF (y >= 410)
  y = 410;
  vy = 0;
  en_suelo = 1;
END`
  },
  {
    id: "pre_move_inertia",
    category: "movement",
    name: "F\xEDsicas con Inercia y Fricci\xF3n",
    description: "Aceleraci\xF3n vectorial, desaceleraci\xF3n suave y velocidad m\xE1xima",
    tokenSavings: "240 tokens",
    keywords: ["inercia", "friccion", "fisicas", "aceleracion", "suave"],
    snippet: `// Bloque Prec\xF3digo: Inercia y Fricci\xF3n
IF (key(_left)) vx -= 0.5; END
IF (key(_right)) vx += 0.5; END
IF (key(_up)) vy -= 0.5; END
IF (key(_down)) vy += 0.5; END
vx *= 0.92;
vy *= 0.92;
x += vx;
y += vy;`
  },
  // Combate
  {
    id: "pre_shoot_single",
    category: "combat",
    name: "Disparo L\xE1ser con Cooldown",
    description: "Generaci\xF3n de proyectiles con cadencia de fuego controlada y sonido",
    tokenSavings: "210 tokens",
    keywords: ["disparo", "disparar", "laser", "bala", "proyectil", "cooldown", "arma", "shoot"],
    snippet: `// Bloque Prec\xF3digo: Disparo con Cooldown
IF ((key(_space) OR key(_enter)) AND cadencia <= 0)
  disparo_jugador(x, y - 16);
  sound(1, 80, 280);
  cadencia = 12;
ELSE
  IF (cadencia > 0) cadencia--; END
END`
  },
  {
    id: "pre_shoot_triple",
    category: "combat",
    name: "Disparo Triple en Abanico",
    description: "Tres proyectiles angulares para naves o torretas",
    tokenSavings: "260 tokens",
    keywords: ["triple", "abanico", "escopeta", "multiple", "spread"],
    snippet: `// Bloque Prec\xF3digo: Disparo Triple en Abanico
disparo_bala(x - 8, y - 10, -15);
disparo_bala(x, y - 14, 0);
disparo_bala(x + 8, y - 10, 15);
sound(1, 100, 320);`
  },
  {
    id: "pre_collision_destroy",
    category: "combat",
    name: "Detecci\xF3n de Colisiones y Explosi\xF3n",
    description: "Comprueba impacto entre tipos de procesos, resta vida y detona part\xEDcula",
    tokenSavings: "190 tokens",
    keywords: ["colision", "impacto", "chocar", "morir", "da\xF1o", "explosion", "hit", "destruir"],
    snippet: `// Bloque Prec\xF3digo: Colisi\xF3n y Da\xF1o
IF (collision(type disparo_jugador))
  vida -= 20;
  sound(3, 90, 200);
  IF (vida <= 0)
    explosion_anim(x, y);
    signal(id, s_kill);
  END
END`
  },
  // Enemigos
  {
    id: "pre_enemy_patrol",
    category: "enemies",
    name: "Enemigo Patrullero con Rebote",
    description: "Enemigo b\xE1sico que se desplaza horizontalmente y baja al llegar al borde",
    tokenSavings: "230 tokens",
    keywords: ["enemigo", "patrulla", "alien", "nave enemiga", "bicho", "invader"],
    snippet: `PROCESS enemigo_patrulla(x, y)
PRIVATE
  dir = 1;
  velocidad = 3;
BEGIN
  graph = 3;
  LOOP
    x += dir * velocidad;
    IF (x > 600 OR x < 40)
      dir = -dir;
      y += 20;
    END
    IF (collision(type disparo_jugador))
      score += 100;
      sound(2, 100, 220);
      signal(id, s_kill);
    END
    FRAME;
  END
END`
  },
  {
    id: "pre_enemy_tracker",
    category: "enemies",
    name: "Enemigo Rastreador Homing",
    description: "Persigue al jugador calculando aproximaci\xF3n progresiva",
    tokenSavings: "280 tokens",
    keywords: ["rastreador", "perseguir", "perseguidor", "homing", "seguir", "acoso"],
    snippet: `PROCESS enemigo_rastreador(x, y, objetivo_id)
PRIVATE
  velocidad = 2;
BEGIN
  graph = 4;
  LOOP
    IF (exists(objetivo_id))
      IF (objetivo_id.x > x) x += velocidad; END
      IF (objetivo_id.x < x) x -= velocidad; END
      IF (objetivo_id.y > y) y += velocidad; END
      IF (objetivo_id.y < y) y -= velocidad; END
    END
    FRAME;
  END
END`
  },
  // Jefes
  {
    id: "pre_boss_3phases",
    category: "bosses",
    name: "Jefe Final con 3 Fases y Barra de Vida",
    description: "Comportamiento jer\xE1rquico con cambio de gr\xE1fico, velocidad y patrones de disparo",
    tokenSavings: "420 tokens",
    keywords: ["jefe", "boss", "fases", "vida jefe", "final boss", "titan"],
    snippet: `PROCESS jefe_final(x, y)
PRIVATE
  vida = 400;
  fase = 1;
  temporizador = 0;
BEGIN
  graph = 4;
  size = 180;
  LOOP
    temporizador++;
    x = 320 + cos(temporizador * 1500) * 140;
    IF (vida <= 200 AND fase == 1)
      fase = 2;
      size = 210;
      sound(2, 120, 180);
    END
    IF (collision(type disparo_jugador))
      vida -= 10;
      IF (vida <= 0)
        sound(2, 120, 140);
        write(0, 320, 240, 1, "VICTORIA TOTAL");
        signal(id, s_kill);
      END
    END
    FRAME;
  END
END`
  },
  // HUD & Puntuación
  {
    id: "pre_hud_arcade",
    category: "hud",
    name: "HUD Arcade Retro (Puntos, Vidas)",
    description: "Muestra puntuaci\xF3n y vidas din\xE1micas en pantalla",
    tokenSavings: "160 tokens",
    keywords: ["hud", "puntuacion", "vidas", "score", "marcador", "interfaz"],
    snippet: `// Bloque Prec\xF3digo: Marcador HUD Arcade
write(0, 20, 20, 0, "PUNTOS:");
write_int(0, 90, 20, 0, &score);
write(0, 520, 20, 0, "VIDAS:");
write_int(0, 580, 20, 0, &lives);`
  },
  // Audio & Efectos
  {
    id: "pre_sfx_pack",
    category: "audio",
    name: "Efectos de Sonido Sintetizados",
    description: "Disparos, impactos y recompensas usando sound(id, vol, freq)",
    tokenSavings: "140 tokens",
    keywords: ["sonido", "audio", "sfx", "musica", "efectos", "sonidos"],
    snippet: `// Bloque Prec\xF3digo: Audio Retro
sound(1, 80, 280); // Disparo / Salto`
  },
  // Modo 8 / 3D Raycasting
  {
    id: "pre_mode8_cam",
    category: "mode8",
    name: "Controlador C\xE1mara 3D / Modo 8",
    description: "C\xE1mara en primera persona con giro suave y desplazamiento",
    tokenSavings: "380 tokens",
    keywords: ["3d", "modo8", "mode8", "raycaster", "dungeon", "camara", "doom", "wolfenstein"],
    snippet: `// Bloque Prec\xF3digo: Controlador C\xE1mara 3D Modo 8
IF (key(_left)) angle -= 3000; END
IF (key(_right)) angle += 3000; END
IF (key(_up) OR key(_w))
  x += cos(angle) * 4;
  y += sin(angle) * 4;
END
IF (key(_down) OR key(_s))
  x -= cos(angle) * 4;
  y -= sin(angle) * 4;
END`
  },
  // Apps visuales / UI de escritorio y móvil
  {
    id: "pre_app_form_ui",
    category: "app",
    name: "Formulario y Botones HTML5/DIV",
    description: "Campos de entrada, botones interactivos y tabla de registros",
    tokenSavings: "300 tokens",
    keywords: ["app", "formulario", "boton", "tabla", "inventario", "clinica", "escritorio", "calculadora", "tareas"],
    snippet: `// Bloque Prec\xF3digo: UI de Aplicaci\xF3n
draw_input(30, 80, 320, 36, entrada_txt, "Escribe aqu\xED...");
draw_button(360, 80, 140, 36, "Guardar", accion_guardar);`
  },
  {
    id: "pre_web_hero_nav",
    category: "app",
    name: "Web: Men\xFA + Portada Hero",
    description: "Cabecera de navegaci\xF3n y portada principal HTML5 para webs y landings",
    tokenSavings: "340 tokens",
    keywords: ["web", "landing", "pagina", "sitio", "navbar", "hero", "portada"],
    snippet: `// Bloque Prec\xF3digo: Portada Web HTML5
set_html5_mode(1);
web_page("Mi Marca Web", "Soluci\xF3n profesional al instante", "light");
web_navbar("Mi Marca", "Inicio,Productos,Precios,FAQ,Contacto", "Empezar", "btn_nav_cta");
web_hero("Impulsa tus Ventas con una Web Clara", "Presenta tu oferta, responde dudas y recibe pedidos desde cualquier celular.", "Comprar Ahora", "btn_hero", "Ver Detalles", "btn_sec", "Nuevo");`
  },
  {
    id: "pre_web_sales_pricing",
    category: "app",
    name: "Web: Packs y Precios de Venta",
    description: "Tarjetas de beneficios/productos y planes con precios y bot\xF3n de compra",
    tokenSavings: "360 tokens",
    keywords: ["tienda", "venta", "ventas", "vender", "precio", "precios", "pack", "catalogo", "plan"],
    snippet: `// Bloque Prec\xF3digo: Productos y Planes de Venta Web
web_feature("\u{1F4E6}", "Env\xEDo R\xE1pido Garantizado", "Despacho asegurado a todo el pa\xEDs en 24/48 horas.");
web_pricing("Pack Inicial", "$29", "/pack", "3 unidades, Garant\xEDa total, Soporte directo", false, "Elegir Pack", "plan_1");
web_pricing("Pack M\xE1s Vendido", "$54", "/caja", "6 unidades, Env\xEDo gratis 24h, Regalo extra", true, "Comprar Ahora", "plan_2");`
  },
  {
    id: "pre_web_faq_contact",
    category: "app",
    name: "Web: Testimonios, FAQ y Pedido",
    description: "Opiniones de clientes, preguntas frecuentes y formulario de contacto/pedido",
    tokenSavings: "320 tokens",
    keywords: ["faq", "preguntas", "testimonio", "resena", "contacto", "pedido", "lead"],
    snippet: `// Bloque Prec\xF3digo: Testimonios, FAQ y Formulario Web
web_testimonial("Excelente atenci\xF3n y entrega puntual. Super\xF3 nuestras expectativas.", "Laura M\xE9ndez", "Clienta Verificada", 5);
web_faq("\xBFCu\xE1nto tarda el env\xEDo o activaci\xF3n?", "Procesamos tu solicitud el mismo d\xEDa con seguimiento inmediato.");
web_contact_form("Haz tu Pedido o Consulta", "D\xE9janos tus datos y te respondemos en menos de 15 minutos.", "Enviar Solicitud", "enviar_contacto");`
  }
];
function sanitizeProgramName(prompt, fallback = "juego_wxdiv") {
  const clean = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 26).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return clean && /^[a-z]/.test(clean) ? clean : fallback;
}
function generatePrecodeNeuralCode(prompt, existingCode = "") {
  const rawPrompt = (prompt || "").trim();
  const p = rawPrompt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matchedBlocks = [];
  let tokenSavingsTotal = 0;
  for (const block of PRECODE_LIBRARY) {
    if (block.keywords.some((kw) => p.includes(kw))) {
      matchedBlocks.push(block);
      tokenSavingsTotal += parseInt(block.tokenSavings) || 200;
    }
  }
  const hasExistingProgram = /\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(existingCode || "");
  const isExistingWebProgram = /\b(web_page|web_hero|web_navbar|draw_landing_page|set_html5_mode)\b/i.test(
    existingCode || ""
  );
  const asksToAddToExisting = hasExistingProgram && /\b(agrega|agregar|añade|añadir|anade|anadir|inserta|insertar|pon|poner|incorpora|incorporar|agregale|ponle|sumale|add|insert)\b/i.test(p);
  if (asksToAddToExisting) {
    if (isExistingWebProgram || /\b(faq|preguntas frecuentes|testimonio|testimonios|resena|reseña|precios|planes|packs|banner|footer|pie de pagina|hero)\b/i.test(
      p
    )) {
      if (/\b(precio|precios|plan|planes|pack|packs|tarifa|tarifas|producto|productos|oferta)\b/i.test(p)) {
        const snippet = `// Secci\xF3n a\xF1adida: Precios / Packs de Venta
web_pricing("Opci\xF3n B\xE1sica", "$29", "/unidad", "Incluye soporte inicial, Garant\xEDa 30 d\xEDas, Entrega digital", false, "Elegir B\xE1sico", "plan_basico");
web_pricing("Opci\xF3n Recomendada", "$59", "/pack", "Acceso completo, Env\xEDo o activaci\xF3n prioritaria, Soporte VIP", true, "Comprar Ahora", "plan_pro");`;
        return {
          code: snippet,
          matchedBlocks: [PRECODE_LIBRARY.find((b) => b.id === "pre_web_sales_pricing")],
          tokenSavingsTotal: 340,
          isInsertionSnippet: true,
          explanation: "\u{1F6CD}\uFE0F Gener\xE9 una **secci\xF3n de precios/packs de venta (`web_pricing`)** lista para insertarse en tu p\xE1gina web actual."
        };
      }
      if (/\b(faq|pregunta|preguntas|duda|dudas)\b/i.test(p)) {
        const snippet = `// Secci\xF3n a\xF1adida: Preguntas Frecuentes (FAQ)
web_faq("\xBFC\xF3mo realizo mi compra o reserva?", "Elige el plan o completa el formulario final y recibir\xE1s confirmaci\xF3n al instante.");
web_faq("\xBFQu\xE9 garant\xEDa y soporte incluye?", "Todos nuestros productos y servicios cuentan con soporte directo y garant\xEDa de satisfacci\xF3n.");`;
        return {
          code: snippet,
          matchedBlocks: [PRECODE_LIBRARY.find((b) => b.id === "pre_web_faq_contact")],
          tokenSavingsTotal: 280,
          isInsertionSnippet: true,
          explanation: "\u2753 Gener\xE9 un bloque de **Preguntas Frecuentes (`web_faq`)** listo para sumarse a tu web."
        };
      }
      if (/\b(testimonio|testimonios|opinion|opiniones|resena|resenas|cliente|clientes)\b/i.test(p)) {
        const snippet = `// Secci\xF3n a\xF1adida: Testimonios de Clientes
web_testimonial("La atenci\xF3n fue rapid\xEDsima y el producto super\xF3 lo prometido.", "Sof\xEDa Navarro", "Clienta Verificada", 5);
web_testimonial("Recomendable 100%. Desde el primer d\xEDa vimos resultados claros.", "Carlos Mendoza", "Empresa Asociada", 5);`;
        return {
          code: snippet,
          matchedBlocks: [PRECODE_LIBRARY.find((b) => b.id === "pre_web_faq_contact")],
          tokenSavingsTotal: 260,
          isInsertionSnippet: true,
          explanation: "\u2B50 Gener\xE9 **testimonios de clientes (`web_testimonial`)** para reforzar la confianza de tu p\xE1gina web."
        };
      }
      if (/\b(formulario|contacto|pedido|reserva|lead|correo|email)\b/i.test(p) && isExistingWebProgram) {
        const snippet = `// Secci\xF3n a\xF1adida: Formulario de Contacto o Pedido
web_contact_form("Haz tu Pedido o Consulta", "Completa tus datos y nuestro equipo se pondr\xE1 en contacto hoy mismo.", "Enviar Solicitud", "enviar_contacto");`;
        return {
          code: snippet,
          matchedBlocks: [PRECODE_LIBRARY.find((b) => b.id === "pre_web_faq_contact")],
          tokenSavingsTotal: 240,
          isInsertionSnippet: true,
          explanation: "\u{1F4E9} Gener\xE9 un **formulario de pedido/contacto (`web_contact_form`)** listo para insertar en tu web."
        };
      }
      if (/\b(metrica|metricas|cifra|cifras|estadistica|estadisticas|kpi)\b/i.test(p)) {
        const snippet = `// Secci\xF3n a\xF1adida: M\xE9tricas de Confianza
web_stat("Clientes Satisfechos", "3,200+", "+18% este mes", true);
web_stat("Tiempo de Respuesta", "< 15 min", "Atenci\xF3n directa", true);`;
        return {
          code: snippet,
          matchedBlocks,
          tokenSavingsTotal: 220,
          isInsertionSnippet: true,
          explanation: "\u{1F4CA} Gener\xE9 tarjetas de **m\xE9tricas de confianza (`web_stat`)** para insertar en tu p\xE1gina web."
        };
      }
      if (/\b(tarjeta|tarjetas|beneficio|beneficios|servicio|servicios|caracteristica)\b/i.test(p) && isExistingWebProgram) {
        const snippet = `// Secci\xF3n a\xF1adida: Tarjeta Destacada Web
web_feature("\u2728", "Atenci\xF3n Personalizada", "Acompa\xF1amiento cercano antes, durante y despu\xE9s de tu compra.");`;
        return {
          code: snippet,
          matchedBlocks,
          tokenSavingsTotal: 200,
          isInsertionSnippet: true,
          explanation: "\u2728 Gener\xE9 una **tarjeta de producto/beneficio (`web_feature`)** lista para insertar en tu web."
        };
      }
    }
    if (p.includes("jefe") || p.includes("boss")) {
      const bossBlock = PRECODE_LIBRARY.find((b) => b.id === "pre_boss_3phases");
      return {
        code: bossBlock.snippet,
        matchedBlocks: [bossBlock],
        tokenSavingsTotal: 420,
        isInsertionSnippet: true,
        explanation: "\u26A1 Gener\xE9 el proceso **jefe_final(x, y)** listo para insertar en tu programa DIV actual."
      };
    }
    if (p.includes("persegu") || p.includes("rastread") || p.includes("homing") || p.includes("siga")) {
      const trackerBlock = PRECODE_LIBRARY.find((b) => b.id === "pre_enemy_tracker");
      return {
        code: trackerBlock.snippet,
        matchedBlocks: [trackerBlock],
        tokenSavingsTotal: 280,
        isInsertionSnippet: true,
        explanation: "\u26A1 Gener\xE9 el proceso **enemigo_rastreador** que persigue al jugador para insertarlo en tu proyecto."
      };
    }
    if (p.includes("enemigo") || p.includes("alien") || p.includes("monstruo") || p.includes("obstaculo")) {
      const enemyBlock = PRECODE_LIBRARY.find((b) => b.id === "pre_enemy_patrol");
      return {
        code: enemyBlock.snippet,
        matchedBlocks: [enemyBlock],
        tokenSavingsTotal: 230,
        isInsertionSnippet: true,
        explanation: "\u26A1 Gener\xE9 el proceso **enemigo_patrulla(x, y)** con movimiento y colisi\xF3n listo para insertar."
      };
    }
    if (p.includes("moneda") || p.includes("estrella") || p.includes("premio") || p.includes("punto")) {
      const coinProc = `PROCESS moneda_coleccionable(x, y)
BEGIN
  graph = 2;
  size = 110;
  LOOP
    angle += 4000;
    IF (collision(type jugador))
      score += 50;
      sound(1, 90, 420);
      x = rand(40, 600);
      y = rand(70, 430);
    END
    FRAME;
  END
END`;
      return {
        code: coinProc,
        matchedBlocks,
        tokenSavingsTotal: 210,
        isInsertionSnippet: true,
        explanation: "\u26A1 Gener\xE9 el proceso **moneda_coleccionable(x, y)** que suma puntos y reaparece al recogerla."
      };
    }
    if (p.includes("sonido") || p.includes("audio") || p.includes("musica")) {
      const audioCode = `// Efecto de sonido listo para llamar dentro de tus procesos:
sound(1, 90, 320);`;
      return {
        code: audioCode,
        matchedBlocks: [PRECODE_LIBRARY.find((b) => b.id === "pre_sfx_pack")],
        tokenSavingsTotal: 140,
        isInsertionSnippet: true,
        explanation: "\u26A1 Gener\xE9 la instrucci\xF3n de sonido sintetizado DIV lista para insertar."
      };
    }
    if (p.includes("hud") || p.includes("marcador") || p.includes("vidas") || p.includes("texto")) {
      const hudBlock = PRECODE_LIBRARY.find((b) => b.id === "pre_hud_arcade");
      return {
        code: hudBlock.snippet,
        matchedBlocks: [hudBlock],
        tokenSavingsTotal: 160,
        isInsertionSnippet: true,
        explanation: "\u26A1 Gener\xE9 el marcador HUD con puntuaci\xF3n y vidas para insertarlo en el bloque principal."
      };
    }
  }
  const wantsWebOrLanding = /\b(landing|pagina web|sitio web|mi web|hacer una web|crear web|web de|ecommerce|tienda online|tienda web|catalogo|portafolio|portfolio)\b/i.test(
    p
  ) || /\b(web|pagina|sitio|venta|ventas|vender)\b/i.test(p) && /\b(producto|productos|tienda|negocio|empresa|vino|vinos|ropa|curso|cursos|clinica|restaurante|agencia|servicio|servicios|oferta|ofertas|precio|precios)\b/i.test(
    p
  );
  if (wantsWebOrLanding) {
    const cleanBrand = rawPrompt.replace(/^(crea|haz|hazme|genera|construye|diseña|disena|quiero)\s+(una|un|mi)?\s*(pagina web|sitio web|landing page|landing|web|tienda online|tienda)\s*(de|para|sobre)?\s*/i, "").replace(/["\n\r]/g, " ").trim().slice(0, 32) || "Mi Marca Web";
    const displayBrand = cleanBrand.charAt(0).toUpperCase() + cleanBrand.slice(1);
    const webProgName = `web_${sanitizeProgramName(cleanBrand, "landing")}`;
    const webTheme = /\b(oscuro|dark|tecnolog|cyber|neon|gamer)\b/i.test(p) ? "dark" : "light";
    if (/\b(tienda|ecommerce|vender|venta|ventas|catalogo|producto|productos|comprar|pack|packs|vino|vinos|ropa|curso|pedido)\b/i.test(p)) {
      const salesWebCode = `// =================================================================
// WXDIV 3.0 - P\xC1GINA WEB DE VENTAS: ${displayBrand.toUpperCase()}
// =================================================================
PROGRAM ${webProgName};

BEGIN
  set_mode(m800x600);
  set_fps(60);
  set_html5_mode(1);
  set_title("${displayBrand}");

  web_page("${displayBrand}", "Cat\xE1logo y Ventas Online", "${webTheme}");
  web_navbar("${displayBrand}", "Inicio,Cat\xE1logo,Ofertas,Rese\xF1as,Pedidos", "Comprar Ahora", "btn_nav_comprar");

  web_hero(
    "${displayBrand}: Calidad Seleccionada Directo a tu Casa",
    "Descubre nuestra colecci\xF3n destacada con env\xEDo garantizado, atenci\xF3n personalizada y pago seguro.",
    "Ver Packs y Ofertas",
    "btn_hero_packs",
    "Consultar Stock",
    "btn_hero_stock",
    "Env\xEDo R\xE1pido 24h"
  );

  web_stat("Clientes Felices", "4,200+", "99% recomiendan", true);
  web_stat("Despacho Express", "24 hs", "Todo el pa\xEDs", true);
  web_stat("Valoraci\xF3n Media", "4.9 / 5", "Rese\xF1as reales", true);

  web_feature("\u{1F4E6}", "Entrega Protegida", "Cada pedido viaja sellado y asegurado hasta tu domicilio.");
  web_feature("\u{1F4B3}", "M\xFAltiples Medios de Pago", "Paga con tarjeta, transferencia o contra entrega sin recargos.");
  web_feature("\u{1F381}", "Garant\xEDa Total", "Compra sin riesgos con cambio inmediato si algo no te convence.");

  web_pricing("Pack Inicial", "$29", " / pack", "Selecci\xF3n esencial, Gu\xEDa incluida, Env\xEDo est\xE1ndar", false, "Comprar Pack", "plan_1");
  web_pricing("Pack M\xE1s Vendido", "$54", " / caja", "Edici\xF3n destacada, Env\xEDo 24h GRATIS, Obsequio sorpresa", true, "Comprar Ahora", "plan_2");
  web_pricing("Pack Premium", "$95", " / caja", "Edici\xF3n limitada, Atenci\xF3n prioritaria, Facturaci\xF3n directa", false, "Solicitar Pack", "plan_3");

  web_testimonial("Lleg\xF3 al d\xEDa siguiente impecable. Excelente calidad y atenci\xF3n.", "Carolina M\xE9ndez", "Compradora Verificada", 5);
  web_testimonial("Ya es la tercera vez que compramos aqu\xED y siempre cumplen.", "Javier Torres", "Cliente Frecuente", 5);

  web_faq("\xBFCu\xE1nto demora en llegar mi pedido?", "Despachamos en el d\xEDa y recibes entre 24 y 48 horas h\xE1biles.");
  web_faq("\xBFHacen ventas por mayor o para eventos?", "S\xED, completa el formulario abajo y te enviamos presupuesto especial.");

  web_contact_form("Haz tu Pedido o Consulta", "D\xE9janos tus datos y confirmamos stock y entrega en menos de 15 minutos.", "Confirmar Pedido", "enviar_pedido");
  web_cta_banner("Aprovecha nuestras ofertas de temporada hoy", "Unidades limitadas con despacho inmediato.", "Pedir con Descuento", "btn_cta_final", "Oferta Activa");
  web_footer("${displayBrand}", "\xA9 2026 ${displayBrand}. Todos los derechos reservados.", "Cat\xE1logo,Env\xEDos,T\xE9rminos,Contacto");

  LOOP
    FRAME;
  END
END`;
      return {
        code: salesWebCode,
        matchedBlocks: matchedBlocks.length > 0 ? matchedBlocks : [PRECODE_LIBRARY.find((b) => b.id === "pre_web_sales_pricing")],
        tokenSavingsTotal: 540,
        explanation: `\u{1F6CD}\uFE0F Gener\xE9 una **P\xE1gina Web de Ventas completa para "${displayBrand}"** con portada, m\xE9tricas, tarjetas de beneficios, packs de precios, testimonios, FAQ y formulario de pedido.`
      };
    }
    const landingCode = `// =================================================================
// WXDIV 3.0 - LANDING PAGE HTML5: ${displayBrand.toUpperCase()}
// =================================================================
PROGRAM ${webProgName};

BEGIN
  set_mode(m800x600);
  set_fps(60);
  set_html5_mode(1);
  set_title("${displayBrand}");

  web_page("${displayBrand}", "Presencia Web Profesional", "${webTheme}");
  web_navbar("${displayBrand}", "Inicio,Servicios,Planes,FAQ,Contacto", "Empezar", "btn_nav_cta");

  web_hero(
    "${displayBrand}: Soluciones Claras para Hacer Crecer tu Proyecto",
    "Presenta tu propuesta de valor, muestra casos reales y convierte visitas en clientes desde cualquier dispositivo.",
    "Solicitar Informaci\xF3n",
    "btn_hero_cta",
    "Ver Servicios",
    "btn_hero_sec",
    "Web HTML5"
  );

  web_stat("Proyectos Activos", "1,500+", "+24% anual", true);
  web_stat("Satisfacci\xF3n", "98.7%", "Clientes reales", true);
  web_stat("Respuesta Media", "< 15 min", "Atenci\xF3n directa", true);

  web_feature("\u26A1", "Carga Instant\xE1nea", "Dise\xF1o web limpio y veloz adaptado a celulares y computadoras.");
  web_feature("\u{1F3AF}", "Enfocado en Conversi\xF3n", "Estructura probada con portada clara, beneficios y llamada a la acci\xF3n.");
  web_feature("\u{1F4F1}", "Listo para Publicar", "Exporta el HTML5 con un clic para subirlo a cualquier hosting.");

  web_pricing("Plan Inicial", "$0", "/mes", "P\xE1gina informativa, Dise\xF1o m\xF3vil, Formulario de contacto", false, "Elegir Inicial", "plan_1");
  web_pricing("Plan Profesional", "$29", "/mes", "Secciones completas, Cat\xE1logo y precios, Soporte prioritario", true, "Elegir Profesional", "plan_2");

  web_testimonial("Multiplicamos nuestras consultas semanales desde el primer d\xEDa que publicamos la web.", "Laura Gim\xE9nez", "Fundadora de Estudio Norte", 5);
  web_testimonial("F\xE1cil de personalizar y con un dise\xF1o claro que genera confianza.", "Marcos Silva", "Emprendedor Local", 5);

  web_faq("\xBFPuedo modificar los textos y precios despu\xE9s?", "S\xED, puedes editar el c\xF3digo DIV o pedir cambios directamente en el chat de AURA IA.");
  web_faq("\xBFFunciona en celulares y tablets?", "Totalmente. Todas las secciones se adaptan autom\xE1ticamente a cualquier pantalla.");

  web_contact_form("Cont\xE1ctanos Ahora", "Cu\xE9ntanos qu\xE9 necesitas y te responderemos a la brevedad.", "Enviar Mensaje", "enviar_contacto");
  web_cta_banner("Lanza tu p\xE1gina web profesional hoy mismo", "Personal\xEDzala a tu medida y publ\xEDcala en minutos.", "Comenzar Ahora", "btn_cta_final", "Listo para Web");
  web_footer("${displayBrand}", "\xA9 2026 ${displayBrand}. Todos los derechos reservados.", "Inicio,Servicios,Privacidad,Contacto");

  LOOP
    FRAME;
  END
END`;
    return {
      code: landingCode,
      matchedBlocks: matchedBlocks.length > 0 ? matchedBlocks : [PRECODE_LIBRARY.find((b) => b.id === "pre_web_hero_nav")],
      tokenSavingsTotal: 520,
      explanation: `\u{1F310} Gener\xE9 una **Landing Page HTML5 completa para "${displayBrand}"** lista para probar en vivo o exportar a producci\xF3n.`
    };
  }
  if (/\b(app|aplicacion|calculadora|calculator|tarea|tareas|todo|formulario|form|login|registro|clinica|inventario|crm|pos|tienda|menu|tabla|escritorio|agenda|presupuesto|dashboard|ventana)\b/i.test(
    p
  )) {
    if (p.includes("calculadora") || p.includes("calculator") || p.includes("sumar")) {
      const calcCode = `PROGRAM calculadora_div;

GLOBAL
  int num1 = 12;
  int num2 = 8;
  int resultado = 20;
  string pantalla = "0";

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(241, 245, 249));
  set_html5_mode(1);

  LOOP
    draw_box(160, 40, 480, 420, "#ffffff");
    write(0, 320, 65, 1, "CALCULADORA WXDIV");
    draw_input(190, 95, 260, 42, pantalla, "0");

    draw_button(190, 155, 58, 44, "7", btn_7_click);
    draw_button(256, 155, 58, 44, "8", btn_8_click);
    draw_button(322, 155, 58, 44, "9", btn_9_click);
    draw_button(388, 155, 62, 44, "+", btn_sum_click);

    draw_button(190, 208, 58, 44, "4", btn_4_click);
    draw_button(256, 208, 58, 44, "5", btn_5_click);
    draw_button(322, 208, 58, 44, "6", btn_6_click);
    draw_button(388, 208, 62, 44, "-", btn_res_click);

    draw_button(190, 261, 58, 44, "1", btn_1_click);
    draw_button(256, 261, 58, 44, "2", btn_2_click);
    draw_button(322, 261, 58, 44, "3", btn_3_click);
    draw_button(388, 261, 62, 44, "=", btn_eq_click);

    draw_button(190, 314, 124, 44, "0", btn_0_click);
    draw_button(322, 314, 128, 44, "Limpiar", btn_c_click);
    FRAME;
  END
END

PROCESS btn_eq_click()
BEGIN
  resultado = num1 + num2;
  write(0, 320, 385, 1, "Calculado con exito");
END`;
      return {
        code: calcCode,
        matchedBlocks,
        tokenSavingsTotal: 420,
        explanation: "\u{1F9EE} Gener\xE9 una **Calculadora visual en DIV** con botones num\xE9ricos, pantalla de resultado y eventos interactivos."
      };
    }
    const appTitle = rawPrompt.slice(0, 34) || "Mi Aplicacion";
    const progId = `app_${sanitizeProgramName(prompt, "escritorio")}`;
    const appCode = `PROGRAM ${progId};

GLOBAL
  string nuevo_registro = "";
  string estado_app = "Sistema listo";
  int total_registros = 2;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(247, 248, 250));
  set_html5_mode(1);

  LOOP
    draw_box(20, 20, 620, 72, "#7C2D48");
    write(0, 36, 38, 0, "${appTitle.toUpperCase()}");

    draw_input(24, 92, 420, 38, nuevo_registro, "Escribe un dato o registro...");
    draw_button(456, 92, 160, 38, "+ Guardar", guardar_click);

    draw_table(24, 148, 592, 220, "ID,Nombre,Estado", "1,Registro inicial,Activo|2,Ejemplo DIV,Listo");

    draw_button(24, 388, 160, 38, "Actualizar", actualizar_click);
    draw_button(196, 388, 160, 38, "Limpiar", limpiar_click);
    write(0, 380, 400, 0, estado_app);

    FRAME;
  END
END

PROCESS guardar_click()
BEGIN
  total_registros++;
  estado_app = "Registro guardado";
  sound(1, 80, 360);
END

PROCESS actualizar_click()
BEGIN
  estado_app = "Datos actualizados";
END

PROCESS limpiar_click()
BEGIN
  nuevo_registro = "";
  estado_app = "Campo limpio";
END`;
    return {
      code: appCode,
      matchedBlocks,
      tokenSavingsTotal: 480,
      explanation: "\u{1F5A5}\uFE0F Gener\xE9 una **Aplicaci\xF3n visual en DIV** con barra superior, campo de texto, botones interactivos y tabla de registros."
    };
  }
  if (/\b(plataforma|plataformas|saltar|salto|gravedad|mario|brincar|platformer)\b/i.test(p)) {
    const platCode = `PROGRAM plataformas_div;

GLOBAL
  score = 0;
  lives = 3;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(15, 23, 42));

  write(0, 20, 20, 0, "PLATAFORMAS DIV");
  write(0, 20, 44, 0, "PUNTOS:");
  write_int(0, 90, 44, 0, &score);
  write(0, 500, 44, 0, "VIDAS:");
  write_int(0, 565, 44, 0, &lives);

  jugador_plataforma(120, 380);
  moneda_plataforma(260, 300);
  moneda_plataforma(420, 240);
  moneda_plataforma(540, 320);

  LOOP
    draw_box(0, 430, 640, 480, rgb(47, 111, 78));
    draw_box(200, 330, 330, 348, rgb(124, 45, 72));
    draw_box(370, 270, 510, 288, rgb(124, 45, 72));
    FRAME;
  END
END

PROCESS jugador_plataforma(x, y)
PRIVATE
  vy = 0;
  en_suelo = 1;
BEGIN
  graph = 1;
  size = 110;
  LOOP
    IF (key(_left) OR key(_a)) x -= 5; END
    IF (key(_right) OR key(_d)) x += 5; END
    x = max(24, min(616, x));

    IF ((key(_space) OR key(_up) OR key(_w)) AND en_suelo == 1)
      vy = -12;
      en_suelo = 0;
      sound(1, 80, 320);
    END

    vy += 0.6;
    y += vy;

    // Colision basica con plataformas y suelo
    IF (y >= 406)
      y = 406;
      vy = 0;
      en_suelo = 1;
    END

    FRAME;
  END
END

PROCESS moneda_plataforma(x, y)
BEGIN
  graph = 2;
  size = 110;
  LOOP
    angle += 3000;
    IF (collision(type jugador_plataforma))
      score += 100;
      sound(1, 90, 450);
      x = rand(80, 560);
      y = rand(210, 390);
    END
    FRAME;
  END
END`;
    return {
      code: platCode,
      matchedBlocks,
      tokenSavingsTotal: 520,
      explanation: "\u{1F3C3} Gener\xE9 un **Juego de Plataformas en DIV** con gravedad, salto, plataformas visibles y monedas coleccionables."
    };
  }
  if (/\b(pong|pelota|raqueta|pala|rebote|arkanoid|tenis|ping)\b/i.test(p)) {
    const pongCode = `PROGRAM cyber_pong;

GLOBAL
  score = 0;
  lives = 3;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(8, 12, 24));

  write(0, 20, 20, 0, "PONG WXDIV");
  write_int(0, 120, 20, 0, &score);

  paddle(40, 240);
  pelota(320, 240);

  LOOP
    FRAME;
  END
END

PROCESS paddle(x, y)
BEGIN
  graph = 1;
  LOOP
    IF (key(_up) OR key(_w)) y -= 6; END
    IF (key(_down) OR key(_s)) y += 6; END
    y = max(40, min(440, y));
    FRAME;
  END
END

PROCESS pelota(x, y)
PRIVATE
  vx = 5;
  vy = 4;
BEGIN
  graph = 2;
  LOOP
    x += vx;
    y += vy;
    IF (y < 20 OR y > 460) vy = -vy; END
    IF (x > 620) vx = -vx; score += 10; END
    IF (collision(type paddle))
      vx = abs(vx);
      score += 25;
      sound(1, 80, 380);
    END
    IF (x < 0)
      x = 320;
      y = 240;
      lives--;
    END
    FRAME;
  END
END`;
    return {
      code: pongCode,
      matchedBlocks,
      tokenSavingsTotal: 450,
      explanation: "\u{1F3D3} Gener\xE9 un **Juego Pong en DIV** con raqueta controlable, rebote de pelota y puntuaci\xF3n."
    };
  }
  if (/\b(moneda|monedas|estrella|estrellas|recoger|coleccionar|tesoro|gema|frutas|manzana)\b/i.test(p)) {
    const collectorCode = `PROGRAM recoger_estrellas;

GLOBAL
  score = 0;
  lives = 3;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(12, 20, 38));

  write(0, 20, 20, 0, "RECOGE ESTRELLAS");
  write(0, 20, 44, 0, "PUNTOS:");
  write_int(0, 90, 44, 0, &score);

  jugador(320, 280);
  estrella_premio(140, 140);
  estrella_premio(480, 180);
  estrella_premio(320, 110);

  LOOP
    FRAME;
  END
END

PROCESS jugador(x, y)
PRIVATE
  velocidad = 5;
BEGIN
  graph = 1;
  size = 115;
  LOOP
    IF (key(_left) OR key(_a)) x -= velocidad; END
    IF (key(_right) OR key(_d)) x += velocidad; END
    IF (key(_up) OR key(_w)) y -= velocidad; END
    IF (key(_down) OR key(_s)) y += velocidad; END
    x = max(24, min(616, x));
    y = max(60, min(456, y));
    FRAME;
  END
END

PROCESS estrella_premio(x, y)
BEGIN
  graph = 2;
  size = 115;
  LOOP
    angle += 4000;
    IF (collision(type jugador))
      score += 100;
      sound(1, 90, 440);
      x = rand(40, 600);
      y = rand(80, 440);
    END
    FRAME;
  END
END`;
    return {
      code: collectorCode,
      matchedBlocks,
      tokenSavingsTotal: 410,
      explanation: "\u2B50 Gener\xE9 un **Juego de Recoger Estrellas/Monedas en DIV** listo para jugar en teclado o m\xF3vil."
    };
  }
  if (/\b(flappy|pajaro|coche|carro|auto|carrera|trafico|esquivar|obstaculo|tuberia|snake|serpiente)\b/i.test(p)) {
    const dodgerCode = `PROGRAM esquivar_obstaculos;

GLOBAL
  score = 0;
  lives = 3;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(14, 22, 36));

  write(0, 20, 20, 0, "ESQUIVA Y SUMA PUNTOS");
  write(0, 20, 44, 0, "PUNTOS:");
  write_int(0, 90, 44, 0, &score);
  write(0, 500, 44, 0, "VIDAS:");
  write_int(0, 565, 44, 0, &lives);

  jugador(320, 410);
  obstaculo_caida(120, 40);
  obstaculo_caida(320, -60);
  obstaculo_caida(500, -140);

  LOOP
    FRAME;
  END
END

PROCESS jugador(x, y)
BEGIN
  graph = 1;
  size = 115;
  LOOP
    IF (key(_left) OR key(_a)) x -= 6; END
    IF (key(_right) OR key(_d)) x += 6; END
    IF (key(_up) OR key(_w)) y -= 4; END
    IF (key(_down) OR key(_s)) y += 4; END
    x = max(24, min(616, x));
    y = max(70, min(456, y));
    FRAME;
  END
END

PROCESS obstaculo_caida(x, y)
PRIVATE
  vel = 4;
BEGIN
  graph = 3;
  size = 110;
  LOOP
    y += vel;
    IF (y > 490)
      y = -20;
      x = rand(40, 600);
      score += 20;
    END
    IF (collision(type jugador))
      lives--;
      sound(2, 100, 180);
      y = -30;
      x = rand(40, 600);
    END
    FRAME;
  END
END`;
    return {
      code: dodgerCode,
      matchedBlocks,
      tokenSavingsTotal: 460,
      explanation: "\u{1F697} Gener\xE9 un **Juego Arcade de Esquivar Obst\xE1culos en DIV** con desplazamiento, colisiones, vidas y puntuaci\xF3n."
    };
  }
  if (/\b(3d|modo 8|modo8|mode8|doom|mazmorra|laberinto|wolfenstein|primera persona)\b/i.test(p)) {
    const mode8Code = `PROGRAM dungeon_modo8;

GLOBAL
  m8_cam_x = 320;
  m8_cam_y = 240;
  m8_angle = 0;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  start_mode8(0, 1, 0);
  write(0, 20, 20, 0, "MODO 8 3D - FLECHAS PARA EXPLORAR");
  camara_3d(320, 240);
  LOOP
    FRAME;
  END
END

PROCESS camara_3d(x, y)
BEGIN
  ctype = c_m8;
  LOOP
    IF (key(_left) OR key(_a)) angle -= 3000; END
    IF (key(_right) OR key(_d)) angle += 3000; END
    IF (key(_up) OR key(_w))
      x += cos(angle) * 4;
      y += sin(angle) * 4;
    END
    IF (key(_down) OR key(_s))
      x -= cos(angle) * 4;
      y -= sin(angle) * 4;
    END
    FRAME;
  END
END`;
    return {
      code: mode8Code,
      matchedBlocks,
      tokenSavingsTotal: 540,
      explanation: "\u{1F9ED} Gener\xE9 una **Escena 3D Modo 8 en DIV** con c\xE1mara en primera persona y controles de exploraci\xF3n."
    };
  }
  if (matchedBlocks.length === 0) {
    matchedBlocks.push(PRECODE_LIBRARY[0], PRECODE_LIBRARY[3], PRECODE_LIBRARY[7]);
    tokenSavingsTotal = 620;
  }
  const programName = sanitizeProgramName(prompt, "juego_wxdiv");
  const hasBoss = matchedBlocks.some((b) => b.category === "bosses") || p.includes("jefe") || p.includes("boss");
  const hasTracker = p.includes("rastread") || p.includes("persegu") || p.includes("siga");
  const codeBlocksParts = [];
  codeBlocksParts.push(`PROGRAM ${programName};

GLOBAL
  score = 0;
  hi_score = 5000;
  lives = 3;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(10, 16, 28));

  write(0, 20, 20, 0, "PUNTOS:");
  write_int(0, 90, 20, 0, &score);
  write(0, 520, 20, 0, "VIDAS:");
  write_int(0, 585, 20, 0, &lives);

  jugador(320, 410);
${hasBoss ? "  jefe_final(320, 110);" : "  enemigo_patrulla(120, 80);\n  enemigo_patrulla(320, 80);\n  enemigo_patrulla(500, 80);"}

  LOOP
    FRAME;
  END
END
`);
  codeBlocksParts.push(`PROCESS jugador(x, y)
PRIVATE
  velocidad = 5;
  cadencia = 0;
BEGIN
  graph = 1;
  size = 115;
  LOOP
    IF (key(_left) OR key(_a)) x -= velocidad; END
    IF (key(_right) OR key(_d)) x += velocidad; END
    IF (key(_up) OR key(_w)) y -= velocidad; END
    IF (key(_down) OR key(_s)) y += velocidad; END
    x = max(20, min(620, x));
    y = max(40, min(460, y));

    IF ((key(_space) OR key(_enter)) AND cadencia <= 0)
      disparo_jugador(x, y - 18);
      sound(1, 90, 300);
      cadencia = 10;
    ELSE
      IF (cadencia > 0) cadencia--; END
    END

    FRAME;
  END
END
`);
  codeBlocksParts.push(`PROCESS disparo_jugador(x, y)
BEGIN
  graph = 2;
  LOOP
    y -= 10;
    IF (y < -20)
      signal(id, s_kill);
    END
    FRAME;
  END
END
`);
  if (hasBoss) {
    codeBlocksParts.push(PRECODE_LIBRARY.find((b) => b.id === "pre_boss_3phases").snippet + "\n");
  } else if (hasTracker) {
    codeBlocksParts.push(PRECODE_LIBRARY.find((b) => b.id === "pre_enemy_tracker").snippet + "\n");
  } else {
    codeBlocksParts.push(PRECODE_LIBRARY.find((b) => b.id === "pre_enemy_patrol").snippet + "\n");
  }
  const finalCode = codeBlocksParts.join("\n");
  const blockNames = matchedBlocks.map((b) => b.name).join(", ");
  const explanation = `\u26A1 **C\xF3digo DIV generado** (${blockNames}). Puedes probarlo directo o insertarlo en tu editor.`;
  return {
    code: finalCode,
    matchedBlocks,
    tokenSavingsTotal,
    explanation
  };
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "15mb" }));
var defaultAiClient = null;
function resolveAI(userKey) {
  const key = userKey && userKey.trim() || process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (userKey && userKey.trim()) {
    return new import_genai.GoogleGenAI({
      apiKey: userKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  if (!defaultAiClient) {
    defaultAiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return defaultAiClient;
}
async function generateGeminiWithFallback(ai, options) {
  const modelList = options.models || [
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];
  let lastError = null;
  for (const model of modelList) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config
        });
        return {
          text: res.text || "",
          modelUsed: model
        };
      } catch (err) {
        lastError = err;
        const msg = (err?.message || "").toLowerCase();
        const isTransient = msg.includes("503") || msg.includes("high demand") || msg.includes("unavailable") || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("overloaded");
        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}
function generateLocalDivFallback(prompt, code, task) {
  const effectivePrompt = prompt && prompt.trim() ? prompt : task || "juego arcade";
  const result = generatePrecodeNeuralCode(effectivePrompt, code || "");
  return `*Motor Local WXDIV 3.0 (${result.explanation.replace(/\n+/g, " ")}):*

\`\`\`div
${result.code}
\`\`\`

Puedes hacer clic en **Insertar en c\xF3digo** o **Reemplazar Todo** para aplicarlo directamente en el editor.`;
}
function generateProceduralSpriteFallback(prompt, size, name) {
  const p = prompt.toLowerCase();
  let baseColor = "#38bdf8";
  let detailColor = "#f59e0b";
  if (p.includes("nave") || p.includes("ship")) {
    baseColor = "#06b6d4";
    detailColor = "#f43f5e";
  } else if (p.includes("alien") || p.includes("enemigo")) {
    baseColor = "#a855f7";
    detailColor = "#22c55e";
  } else if (p.includes("corazon") || p.includes("vida") || p.includes("heart")) {
    baseColor = "#ef4444";
    detailColor = "#fca5a5";
  } else if (p.includes("moneda") || p.includes("coin") || p.includes("oro")) {
    baseColor = "#eab308";
    detailColor = "#fef08a";
  }
  const palette = ["#00000000", baseColor, detailColor, "#ffffff"];
  const pixels = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const cx = (size - 1) / 2;
      const cy = (size - 1) / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < size * 0.4) {
        row.push((x + y) % 3 === 0 ? 2 : 1);
      } else {
        row.push(0);
      }
    }
    pixels.push(row);
  }
  return {
    name: name || "sprite",
    width: size,
    height: size,
    palette,
    pixels
  };
}
app.get("/api/health", (req, res) => {
  const headerKey = req.headers["x-api-key"];
  const hasKey = Boolean(process.env.GEMINI_API_KEY || headerKey);
  res.json({
    status: "ok",
    version: "3.0.0",
    engine: "WXDIV 3.0 Game Engine",
    hasApiKey: hasKey,
    hasServerEnvKey: Boolean(process.env.GEMINI_API_KEY)
  });
});
app.post("/api/gemini/verify", async (req, res) => {
  const { apiKey = "", model = "gemini-3.8-flash" } = req.body || {};
  const headerKey = req.headers["x-api-key"];
  const effectiveKey = apiKey && apiKey.trim() || headerKey;
  const ai = resolveAI(effectiveKey);
  if (!ai) {
    return res.status(400).json({
      success: false,
      message: "No se proporcion\xF3 una clave de API ni existe una configurada en el servidor."
    });
  }
  try {
    const testModel = model || "gemini-3.8-flash";
    const response = await ai.models.generateContent({
      model: testModel,
      contents: "Responde \xFAnicamente: 'OK DIV ENGINE'",
      config: {
        maxOutputTokens: 15
      }
    });
    res.json({
      success: true,
      message: "\xA1Conexi\xF3n validada exitosamente con Gemini API!",
      text: response.text || "OK",
      modelUsed: testModel
    });
  } catch (err) {
    console.warn("Gemini verification failed:", err?.message || err);
    res.status(400).json({
      success: false,
      message: err?.message || "Error al validar la clave con Google Gemini API"
    });
  }
});
app.post("/api/gemini/assist", async (req, res) => {
  const { prompt = "", code = "", task = "chat", currentFpg = [], apiKey = "", model = "gemini-3.8-flash" } = req.body || {};
  const headerKey = req.headers["x-api-key"];
  const effectiveKey = apiKey && apiKey.trim() || headerKey;
  const ai = resolveAI(effectiveKey);
  if (!ai) {
    const localText = generateLocalDivFallback(prompt, code, task);
    return res.json({
      text: `\u26A0\uFE0F *No se detect\xF3 una Gemini API Key (ni en Ajustes de IA ni en .env). Mostrando respuesta de respaldo del motor local:*

${localText}

*Consejo: Puedes ingresar tu propia clave gratuita en la barra superior o en el bot\xF3n 'Configurar API' sin necesidad de editar archivos.*`,
      modelUsed: "offline-engine"
    });
  }
  const systemInstruction = `You are the lead architect and engine specialist for WXDIV 3.0, the cutting-edge multi-platform Game Studio built upon DIV Games Studio (DOS/DivGO/BennuGD) architecture.
DIV Games Studio is a micro-threaded, process-based game development language.
Core syntax rules of DIV Games Studio:
1. Header: PROGRAM program_name;
2. Variable blocks:
   GLOBAL
     score = 0;
     hi_score = 1000;
   LOCAL
     speed = 4;
     hp = 100;
3. Main Execution Block:
   BEGIN
     set_mode(m640x480); // or m320x200, m800x600
     set_fps(60);
     screen_color(rgb(10, 15, 30));
     player(320, 400);
     LOOP
       FRAME;
     END
   END
4. Processes:
   PROCESS process_name(x, y)
   BEGIN
     graph = 1; // Sprite graphic ID
     size = 100;
     LOOP
       IF (key(_left)) x -= speed; END
       IF (key(_right)) x += speed; END
       IF (key(_up)) y -= speed; END
       IF (key(_down)) y += speed; END
       IF (key(_space)) shot(x, y - 16); END
       FRAME; // Yield to engine for next frame tick
     END
   END
5. Control flow:
   - LOOP ... END
   - WHILE (condition) ... END
   - REPEAT ... UNTIL (condition)
   - FOR (var = start; var <= end; var++) ... END
   - IF (condition) ... ELSE ... END
   - SWITCH (expression) CASE value: ... END DEFAULT: ... END END
6. Built-in functions:
   - Graphics: set_mode(mode), set_fps(fps), screen_color(color), load_fpg(file), load_map(file), write(font, x, y, align, text), write_int(font, x, y, align, &var), delete_text(id), clear_screen()
   - Primitives: draw_box(x1, y1, x2, y2, color), draw_line(x1, y1, x2, y2, color), draw_circle(x, y, r, color), draw_fcircle(x, y, r, color)
   - Collision & Math: collision(type_name), get_dist(x1, y1, x2, y2), get_angle(x1, y1, x2, y2), advance(dist), xadvance(angle, dist), rand(min, max), abs(n), sqrt(n)
   - Process control: signal(id, s_kill / s_freeze / s_wakeup / s_sleep), let_me_alone(), exists(id)
   - Audio: sound(sound_id, volume, freq), load_wav(file)
   - Inputs: key(_left, _right, _up, _down, _space, _enter, _esc, _a, _s, _d, _w), mouse.x, mouse.y, mouse.left, mouse.right
7. Process variables:
   - x, y, z, graph, flags (1=flip_x, 2=flip_y, 4=alpha), angle (0..360000 or 0..360), size, alpha, ctype, cnumber, id, father.
8. Multi-platform App Architecture & Precode UI Primitives:
   - UI Functions:
     * draw_button(x, y, w, h, "Texto", callback_process_or_id)
     * draw_input(x, y, w, h, value_var, "placeholder")
     * draw_select(x, y, w, h, "Opcion1,Opcion2", selected_index)
     * draw_table(x, y, w, h, "Col1,Col2", "Fila1,Val|Fila2,Val")
     * draw_modal(x, y, w, h, "Titulo", "Mensaje del modal")
     * draw_tabs(x, y, w, h, "Tab1,Tab2,Tab3", active_index)
   - Layout & Reactive State Precode Blocks:
     * STORE store_name ... var: type ... END
     * LAYOUT vertical gap=8 ... FIELD campo ... BUTTON "Texto" ... END
     * ON variable == value ... navigate("ruta") ... END
   - Local DB & Persistence:
     * load_sqlite("app.db"), sqlite_query("SQL_STATEMENT")
     * save_json("file.json", var), load_json("file.json")
     * fetch_api("https://url.com")
     * store_set("key", value), store_get("key", default)

When providing DIV code, wrap the complete game or app in \`\`\`div ... \`\`\` code blocks.
Make sure the syntax is 100% compliant with DIV Games Studio. Provide concise, expert explanations in Spanish.`;
  const userPrompt = `Tarea: ${task}
Instrucci\xF3n del usuario: ${prompt}
${code ? `
C\xF3digo actual:
\`\`\`div
${code}
\`\`\`` : ""}
${currentFpg && currentFpg.length > 0 ? `
Sprites disponibles en FPG actual: ${JSON.stringify(currentFpg)}` : ""}`;
  try {
    const modelsToTry = [
      model || "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];
    const result = await generateGeminiWithFallback(ai, {
      contents: userPrompt,
      models: modelsToTry,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });
    res.json({
      text: result.text,
      modelUsed: result.modelUsed
    });
  } catch (error) {
    console.warn("Gemini assist API demand spike / error. Falling back smoothly:", error?.message || error);
    const fallbackText = generateLocalDivFallback(prompt, code, task);
    res.json({
      text: fallbackText,
      modelUsed: "fallback-engine",
      notice: "Servidor de IA report\xF3 alta demanda o error. WXDIV 3.0 gener\xF3 una soluci\xF3n directa optimizada."
    });
  }
});
app.post("/api/gemini/generate-sprite", async (req, res) => {
  const { prompt = "", size = 16, name = "sprite", apiKey = "" } = req.body || {};
  const headerKey = req.headers["x-api-key"];
  const effectiveKey = apiKey && apiKey.trim() || headerKey;
  const ai = resolveAI(effectiveKey);
  if (!ai) {
    return res.json(generateProceduralSpriteFallback(prompt, size, name));
  }
  const systemInstruction = `You are a retro pixel-art generator for DIV Games Studio (WXDIV 3.0).
Generate a pixel art grid of size ${size}x${size} based on the user's prompt.
Return ONLY a valid JSON object matching this schema:
{
  "name": "string",
  "width": ${size},
  "height": ${size},
  "palette": ["#00000000", "#112233", ...], // Array of hex color strings. First entry MUST be "#00000000" for transparent.
  "pixels": [[0, 1, 2, ...], ...] // 2D array of palette indices for each (y, x), where 0 is transparent.
}
Do not include markdown ticks or any extra text, only the raw JSON.`;
  try {
    const result = await generateGeminiWithFallback(ai, {
      contents: `Create pixel art for: ${prompt} (size: ${size}x${size}, name: ${name})`,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });
    const parsed = JSON.parse(result.text || "{}");
    if (!parsed.pixels || !parsed.palette) {
      throw new Error("Invalid sprite JSON structure");
    }
    res.json(parsed);
  } catch (error) {
    console.warn("Gemini sprite API error, providing procedural sprite fallback:", error?.message || error);
    res.json(generateProceduralSpriteFallback(prompt, size, name));
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WXDIV 3.0 Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
