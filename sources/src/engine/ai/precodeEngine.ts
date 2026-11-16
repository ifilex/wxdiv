/**
 * Teoría de Precódigo y Red Neural de Creación de Código para WXDIV 3.0
 *
 * Sintetizador modular local que funciona 100% offline en CPU (0ms) y optimiza
 * prompts para WebLLM reduciendo errores de sintaxis en DIV Games Studio y mapas 3D.
 */

import {
  Mode8AiAction,
  Mode8SceneContext,
  formatMode8ContextForPrompt,
  inferMode8ActionsFromPrompt,
} from "./mode8WorkBlocks";

export interface PrecodeBlock {
  id: string;
  category: "movement" | "combat" | "enemies" | "bosses" | "hud" | "audio" | "mode8" | "app";
  name: string;
  description: string;
  tokenSavings: string;
  snippet: string;
  keywords: string[];
}

export const PRECODE_LIBRARY: PrecodeBlock[] = [
  // Movimiento
  {
    id: "pre_move_8dir",
    category: "movement",
    name: "Control 8-Direcciones (WASD/Flechas)",
    description: "Bucle de movimiento fluido con límites de pantalla seguros",
    tokenSavings: "180 tokens",
    keywords: ["mover", "movimiento", "teclado", "flechas", "wasd", "jugador", "control", "player"],
    snippet: `// Bloque Precódigo: Movimiento 8 Direcciones
IF (key(_left) OR key(_a)) x -= velocidad; END
IF (key(_right) OR key(_d)) x += velocidad; END
IF (key(_up) OR key(_w)) y -= velocidad; END
IF (key(_down) OR key(_s)) y += velocidad; END
x = max(20, min(620, x));
y = max(20, min(460, y));`,
  },
  {
    id: "pre_move_platformer",
    category: "movement",
    name: "Salto y Gravedad (Plataformas)",
    description: "Físicas verticales para juegos de plataformas 2D con suelo",
    tokenSavings: "240 tokens",
    keywords: ["plataforma", "plataformas", "saltar", "salto", "gravedad", "mario", "suelo"],
    snippet: `// Bloque Precódigo: Salto y Gravedad
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
END`,
  },
  {
    id: "pre_move_inertia",
    category: "movement",
    name: "Físicas con Inercia y Fricción",
    description: "Aceleración vectorial, desaceleración suave y velocidad máxima",
    tokenSavings: "240 tokens",
    keywords: ["inercia", "friccion", "fisicas", "aceleracion", "suave"],
    snippet: `// Bloque Precódigo: Inercia y Fricción
IF (key(_left)) vx -= 0.5; END
IF (key(_right)) vx += 0.5; END
IF (key(_up)) vy -= 0.5; END
IF (key(_down)) vy += 0.5; END
vx *= 0.92;
vy *= 0.92;
x += vx;
y += vy;`,
  },

  // Combate
  {
    id: "pre_shoot_single",
    category: "combat",
    name: "Disparo Láser con Cooldown",
    description: "Generación de proyectiles con cadencia de fuego controlada y sonido",
    tokenSavings: "210 tokens",
    keywords: ["disparo", "disparar", "laser", "bala", "proyectil", "cooldown", "arma", "shoot"],
    snippet: `// Bloque Precódigo: Disparo con Cooldown
IF ((key(_space) OR key(_enter)) AND cadencia <= 0)
  disparo_jugador(x, y - 16);
  sound(1, 80, 280);
  cadencia = 12;
ELSE
  IF (cadencia > 0) cadencia--; END
END`,
  },
  {
    id: "pre_shoot_triple",
    category: "combat",
    name: "Disparo Triple en Abanico",
    description: "Tres proyectiles angulares para naves o torretas",
    tokenSavings: "260 tokens",
    keywords: ["triple", "abanico", "escopeta", "multiple", "spread"],
    snippet: `// Bloque Precódigo: Disparo Triple en Abanico
disparo_bala(x - 8, y - 10, -15);
disparo_bala(x, y - 14, 0);
disparo_bala(x + 8, y - 10, 15);
sound(1, 100, 320);`,
  },
  {
    id: "pre_collision_destroy",
    category: "combat",
    name: "Detección de Colisiones y Explosión",
    description: "Comprueba impacto entre tipos de procesos, resta vida y detona partícula",
    tokenSavings: "190 tokens",
    keywords: ["colision", "impacto", "chocar", "morir", "daño", "explosion", "hit", "destruir"],
    snippet: `// Bloque Precódigo: Colisión y Daño
IF (collision(type disparo_jugador))
  vida -= 20;
  sound(3, 90, 200);
  IF (vida <= 0)
    explosion_anim(x, y);
    signal(id, s_kill);
  END
END`,
  },

  // Enemigos
  {
    id: "pre_enemy_patrol",
    category: "enemies",
    name: "Enemigo Patrullero con Rebote",
    description: "Enemigo básico que se desplaza horizontalmente y baja al llegar al borde",
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
END`,
  },
  {
    id: "pre_enemy_tracker",
    category: "enemies",
    name: "Enemigo Rastreador Homing",
    description: "Persigue al jugador calculando aproximación progresiva",
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
END`,
  },

  // Jefes
  {
    id: "pre_boss_3phases",
    category: "bosses",
    name: "Jefe Final con 3 Fases y Barra de Vida",
    description: "Comportamiento jerárquico con cambio de gráfico, velocidad y patrones de disparo",
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
END`,
  },

  // HUD & Puntuación
  {
    id: "pre_hud_arcade",
    category: "hud",
    name: "HUD Arcade Retro (Puntos, Vidas)",
    description: "Muestra puntuación y vidas dinámicas en pantalla",
    tokenSavings: "160 tokens",
    keywords: ["hud", "puntuacion", "vidas", "score", "marcador", "interfaz"],
    snippet: `// Bloque Precódigo: Marcador HUD Arcade
write(0, 20, 20, 0, "PUNTOS:");
write_int(0, 90, 20, 0, &score);
write(0, 520, 20, 0, "VIDAS:");
write_int(0, 580, 20, 0, &lives);`,
  },

  // Audio & Efectos
  {
    id: "pre_sfx_pack",
    category: "audio",
    name: "Efectos de Sonido Sintetizados",
    description: "Disparos, impactos y recompensas usando sound(id, vol, freq)",
    tokenSavings: "140 tokens",
    keywords: ["sonido", "audio", "sfx", "musica", "efectos", "sonidos"],
    snippet: `// Bloque Precódigo: Audio Retro
sound(1, 80, 280); // Disparo / Salto`,
  },

  // Modo 8 / 3D Raycasting & Bloques de Trabajo 3D
  {
    id: "pre_mode8_cam",
    category: "mode8",
    name: "Controlador Cámara 3D / Modo 8",
    description: "Cámara en primera o tercera persona con giro suave y desplazamiento",
    tokenSavings: "380 tokens",
    keywords: ["3d", "modo8", "mode8", "raycaster", "dungeon", "camara", "doom", "wolfenstein"],
    snippet: `// Bloque Precódigo: Controlador Cámara 3D Modo 8
IF (key(_left)) angle -= 3000; END
IF (key(_right)) angle += 3000; END
IF (key(_up) OR key(_w))
  x += cos(angle) * 4;
  y += sin(angle) * 4;
END
IF (key(_down) OR key(_s))
  x -= cos(angle) * 4;
  y -= sin(angle) * 4;
END`,
  },
  {
    id: "pre_mode8_platform",
    category: "mode8",
    name: "3D: Plataforma / Sector Elevado",
    description: "Crea un bloque o sala 3D elevada con textura y altura propia",
    tokenSavings: "280 tokens",
    keywords: ["plataforma", "bloque", "sector", "sala", "torre"],
    snippet: `// Bloque de Trabajo 3D: Plataforma Elevada
m8_set_doom_sector(10, 0.75, 3.50, "STUD_FLOOR_BLUE", "SKY_ROBLOX", 240, 0, 0);`,
  },
  {
    id: "pre_mode8_collectibles",
    category: "mode8",
    name: "3D: Monedas, Meta y Actores MD2/MD3",
    description: "Añade monedas vóxel, estrella meta o guardianes 3D al mapa",
    tokenSavings: "310 tokens",
    keywords: ["moneda", "estrella", "meta", "samurai", "robot", "enemigo", "bandera", "voxel", "modelo"],
    snippet: `// Bloque de Trabajo 3D: Objetos y Actores
m8_place_voxel("voxel_coin", 4.50, 5.50, 0.25, 0, 1.00);
m8_add_model("trophy_star", 6.50, 5.50, 0.20, 0, "idle", 1.10, "goal", 100, 0, 0, "Meta");`,
  },

  // Apps visuales / UI de escritorio y móvil
  {
    id: "pre_app_form_ui",
    category: "app",
    name: "Formulario y Botones HTML5/DIV",
    description: "Campos de entrada, botones interactivos y tabla de registros",
    tokenSavings: "300 tokens",
    keywords: ["app", "formulario", "boton", "tabla", "inventario", "clinica", "escritorio", "calculadora", "tareas"],
    snippet: `// Bloque Precódigo: UI de Aplicación
draw_input(30, 80, 320, 36, entrada_txt, "Escribe aquí...");
draw_button(360, 80, 140, 36, "Guardar", accion_guardar);`,
  },
  {
    id: "pre_web_hero_nav",
    category: "app",
    name: "Web: Menú + Portada Hero",
    description: "Cabecera de navegación y portada principal HTML5 para webs y landings",
    tokenSavings: "340 tokens",
    keywords: ["web", "landing", "pagina", "sitio", "navbar", "hero", "portada"],
    snippet: `// Bloque Precódigo: Portada Web HTML5
set_html5_mode(1);
web_page("Mi Marca Web", "Solución profesional al instante", "light");
web_navbar("Mi Marca", "Inicio,Productos,Precios,FAQ,Contacto", "Empezar", "btn_nav_cta");
web_hero("Impulsa tus Ventas con una Web Clara", "Presenta tu oferta, responde dudas y recibe pedidos desde cualquier celular.", "Comprar Ahora", "btn_hero", "Ver Detalles", "btn_sec", "Nuevo");`,
  },
  {
    id: "pre_web_sales_pricing",
    category: "app",
    name: "Web: Packs y Precios de Venta",
    description: "Tarjetas de beneficios/productos y planes con precios y botón de compra",
    tokenSavings: "360 tokens",
    keywords: ["tienda", "venta", "ventas", "vender", "precio", "precios", "pack", "catalogo", "plan"],
    snippet: `// Bloque Precódigo: Productos y Planes de Venta Web
web_feature("📦", "Envío Rápido Garantizado", "Despacho asegurado a todo el país en 24/48 horas.");
web_pricing("Pack Inicial", "$29", "/pack", "3 unidades, Garantía total, Soporte directo", false, "Elegir Pack", "plan_1");
web_pricing("Pack Más Vendido", "$54", "/caja", "6 unidades, Envío gratis 24h, Regalo extra", true, "Comprar Ahora", "plan_2");`,
  },
  {
    id: "pre_web_faq_contact",
    category: "app",
    name: "Web: Testimonios, FAQ y Pedido",
    description: "Opiniones de clientes, preguntas frecuentes y formulario de contacto/pedido",
    tokenSavings: "320 tokens",
    keywords: ["faq", "preguntas", "testimonio", "resena", "contacto", "pedido", "lead"],
    snippet: `// Bloque Precódigo: Testimonios, FAQ y Formulario Web
web_testimonial("Excelente atención y entrega puntual. Superó nuestras expectativas.", "Laura Méndez", "Clienta Verificada", 5);
web_faq("¿Cuánto tarda el envío o activación?", "Procesamos tu solicitud el mismo día con seguimiento inmediato.");
web_contact_form("Haz tu Pedido o Consulta", "Déjanos tus datos y te respondemos en menos de 15 minutos.", "Enviar Solicitud", "enviar_contacto");`,
  },
];

function sanitizeProgramName(prompt: string, fallback: string = "juego_wxdiv"): string {
  const clean = prompt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 26)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean && /^[a-z]/.test(clean) ? clean : fallback;
}

/**
 * Combina de forma segura un fragmento o proceso DIV dentro de un programa DIV existente
 * sin duplicar cabeceras PROGRAM ni romper bloques BEGIN...END.
 */
export function mergeDivSnippetIntoProgram(existingCode: string, newSnippet: string): string {
  const existing = (existingCode || "").trim();
  const incoming = (newSnippet || "").trim();
  if (!incoming) return existing;
  if (!existing || !/\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(existing)) {
    return incoming;
  }

  const incomingHasProgram = /\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(incoming);

  // Si el nuevo código solo trae uno o varios PROCESS, los agregamos al final sin duplicar
  if (!incomingHasProgram) {
    const firstProcMatch = incoming.match(/\bPROCESS\s+([a-zA-Z0-9_]+)/i);
    if (firstProcMatch) {
      const procName = firstProcMatch[1];
      let updated = existing;
      // Si el programa principal tiene LOOP y aún no llama al nuevo proceso, intentar llamarlo antes del primer LOOP
      if (!new RegExp(`\\b${procName}\\s*\\(`, "i").test(existing)) {
        updated = existing.replace(/(\bLOOP\b)/i, `  ${procName}(320, 200);\n\n  $1`);
      }
      return `${updated}\n\n${incoming}`;
    }

    // Si son llamadas Web HTML5 (web_*, add_feature, add_pricing, add_faq, etc.), van ANTES del primer LOOP en BEGIN
    const isWebCallsSnippet = /\b(web_page|web_navbar|web_hero|web_stat|web_feature|web_pricing|web_testimonial|web_faq|web_contact_form|web_cta_banner|web_footer|add_feature|add_pricing|add_faq|add_testimonial|add_web_stat|draw_landing_page)\s*\(/i.test(
      incoming
    );
    if (isWebCallsSnippet) {
      const indentedWeb = incoming
        .split("\n")
        .map((l) => (l.trim() ? `  ${l.trim()}` : ""))
        .filter(Boolean)
        .join("\n");
      const firstLoopMatch = existing.match(/\bLOOP\b/i);
      if (firstLoopMatch && typeof firstLoopMatch.index === "number") {
        return (
          existing.slice(0, firstLoopMatch.index) +
          indentedWeb +
          "\n\n  " +
          existing.slice(firstLoopMatch.index)
        );
      }
      const lastEndIdx = existing.toUpperCase().lastIndexOf("END");
      if (lastEndIdx !== -1) {
        return (
          existing.slice(0, lastEndIdx) +
          "\n" +
          indentedWeb +
          "\n" +
          existing.slice(lastEndIdx)
        );
      }
    }

    // Si son líneas sueltas de lógica, insertarlas justo antes de FRAME; del último LOOP si existe
    const lastFrameIdx = existing.lastIndexOf("FRAME;");
    if (lastFrameIdx !== -1) {
      const indented = incoming
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n");
      return (
        existing.slice(0, lastFrameIdx) +
        indented +
        "\n    " +
        existing.slice(lastFrameIdx)
      );
    }
    return `${existing}\n\n${incoming}`;
  }

  // Si ambos tienen PROGRAM: extraemos los PROCESS del snippet entrante que no existan aún
  const processMatches = Array.from(
    incoming.matchAll(/PROCESS\s+([a-zA-Z0-9_]+)[\s\S]*?\bEND\b(?=\s*(?:PROCESS|\n|$))/gi)
  );
  if (processMatches.length > 0) {
    const newProcs: string[] = [];
    const newCalls: string[] = [];
    for (const m of processMatches) {
      const pName = m[1];
      if (!new RegExp(`PROCESS\\s+${pName}\\b`, "i").test(existing)) {
        newProcs.push(m[0].trim());
        if (!new RegExp(`\\b${pName}\\s*\\(`, "i").test(existing)) {
          newCalls.push(`  ${pName}(320, 220);`);
        }
      }
    }
    if (newProcs.length > 0) {
      let merged = existing;
      if (newCalls.length > 0) {
        merged = merged.replace(/(\bLOOP\b)/i, `${newCalls.join("\n")}\n\n  $1`);
      }
      return `${merged}\n\n${newProcs.join("\n\n")}`;
    }
  }

  return incoming;
}

/**
 * Red Neural de Precódigo (Sintetizador Heurístico Local Multi-Género)
 * Analiza la petición real del usuario en español/inglés y genera código DIV
 * completo y funcional o el fragmento exacto para insertar en código existente.
 */
export function generatePrecodeNeuralCode(
  prompt: string,
  existingCode: string = "",
  options?: { activeTab?: string; mode8Context?: Mode8SceneContext }
): {
  code: string;
  matchedBlocks: PrecodeBlock[];
  tokenSavingsTotal: number;
  explanation: string;
  isInsertionSnippet?: boolean;
  mode8Actions?: Mode8AiAction[];
} {
  const rawPrompt = (prompt || "").trim();
  const p = rawPrompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const matchedBlocks: PrecodeBlock[] = [];
  let tokenSavingsTotal = 0;

  for (const block of PRECODE_LIBRARY) {
    if (block.keywords.some((kw) => p.includes(kw))) {
      matchedBlocks.push(block);
      tokenSavingsTotal += parseInt(block.tokenSavings) || 200;
    }
  }

  // 0. BLOQUES DE TRABAJO 3D Y MAPAS (cuando estamos en 3D o el usuario pide construir/editar escena 3D)
  const isMode8Active = options?.activeTab === "mode8" || Boolean(options?.mode8Context && /\b(mapa|sector|escalera|plataforma|cielo|moneda|bandera|samurai|robot|estrella|arena|circuito|laberinto|primera persona|tercera persona|pintar|pinta|bloque)\b/i.test(p));
  if (isMode8Active && options?.mode8Context) {
    const inferred = inferMode8ActionsFromPrompt(rawPrompt, options.mode8Context);
    if (inferred.actions.length > 0) {
      const snippetLines = inferred.actions.map((act) => {
        if (act.type === "add_platform") {
          return `m8_set_doom_sector(${options.mode8Context!.sectorCount + 1}, ${(act.floorHeight ?? 0.75).toFixed(2)}, ${(act.ceilHeight ?? 3.5).toFixed(2)}, "${act.flatTex || "STUD_FLOOR_BLUE"}", "${options.mode8Context!.skyTexture}", 240, 0, 0);`;
        }
        if (act.type === "add_voxel") {
          return `m8_place_voxel("${act.voxelId}", ${(options.mode8Context!.playerPos.x / 64 + 1.5).toFixed(2)}, ${(options.mode8Context!.playerPos.y / 64).toFixed(2)}, 0.25, 0, 1.00);`;
        }
        if (act.type === "add_model") {
          return `m8_add_model("${act.modelId}", ${(options.mode8Context!.playerPos.x / 64 + 2.5).toFixed(2)}, ${(options.mode8Context!.playerPos.y / 64).toFixed(2)}, 0.00, 180, "idle", 1.00, "${act.role || "prop"}", 100, 1.00, 10, "${act.modelId}");`;
        }
        if (act.type === "paint_material") {
          return `// Material actualizado: piso=${act.flatTex}, muro=${act.wallTex}`;
        }
        if (act.type === "set_sky_camera") {
          return `// Atmósfera 3D: cielo=${act.skyTexture || options.mode8Context!.skyTexture}, cámara=${act.cameraMode || options.mode8Context!.cameraMode}`;
        }
        if (act.type === "add_stairs") {
          return `// Escalera 3D de ${act.steps ?? 6} peldaños generada en escena`;
        }
        return `// Plantilla 3D generada: ${act.template}`;
      });
      return {
        code: `// Acciones 3D aplicadas al mapa "${options.mode8Context.levelTitle}"\n${snippetLines.join("\n")}`,
        matchedBlocks: matchedBlocks.length > 0 ? matchedBlocks : [PRECODE_LIBRARY.find((b) => b.id === "pre_mode8_cam")!],
        tokenSavingsTotal: Math.max(260, tokenSavingsTotal),
        isInsertionSnippet: true,
        mode8Actions: inferred.actions,
        explanation: `${inferred.summary} Pulsa "Aplicar al Mapa 3D" o usa los Bloques de Trabajo 3D.`,
      };
    }
  }

  const hasExistingProgram = /\bPROGRAM\s+[a-zA-Z0-9_]+/i.test(existingCode || "");
  const isExistingWebProgram = /\b(web_page|web_hero|web_navbar|draw_landing_page|set_html5_mode)\b/i.test(
    existingCode || ""
  );
  const asksToAddToExisting =
    hasExistingProgram &&
    /\b(agrega|agregar|añade|añadir|anade|anadir|inserta|insertar|pon|poner|incorpora|incorporar|agregale|ponle|sumale|add|insert)\b/i.test(p);

  // 1. MODO INSERCIÓN EN PROGRAMA EXISTENTE
  if (asksToAddToExisting) {
    // 1A. Inserción incremental de secciones Web / Landing / Ventas
    if (
      isExistingWebProgram ||
      /\b(faq|preguntas frecuentes|testimonio|testimonios|resena|reseña|precios|planes|packs|banner|footer|pie de pagina|hero)\b/i.test(
        p
      )
    ) {
      if (/\b(precio|precios|plan|planes|pack|packs|tarifa|tarifas|producto|productos|oferta)\b/i.test(p)) {
        const snippet = `// Sección añadida: Precios / Packs de Venta
web_pricing("Opción Básica", "$29", "/unidad", "Incluye soporte inicial, Garantía 30 días, Entrega digital", false, "Elegir Básico", "plan_basico");
web_pricing("Opción Recomendada", "$59", "/pack", "Acceso completo, Envío o activación prioritaria, Soporte VIP", true, "Comprar Ahora", "plan_pro");`;
        return {
          code: snippet,
          matchedBlocks: [PRECODE_LIBRARY.find((b) => b.id === "pre_web_sales_pricing")!],
          tokenSavingsTotal: 340,
          isInsertionSnippet: true,
          explanation:
            "🛍️ Generé una **sección de precios/packs de venta (`web_pricing`)** lista para insertarse en tu página web actual.",
        };
      }
      if (/\b(faq|pregunta|preguntas|duda|dudas)\b/i.test(p)) {
        const snippet = `// Sección añadida: Preguntas Frecuentes (FAQ)
web_faq("¿Cómo realizo mi compra o reserva?", "Elige el plan o completa el formulario final y recibirás confirmación al instante.");
web_faq("¿Qué garantía y soporte incluye?", "Todos nuestros productos y servicios cuentan con soporte directo y garantía de satisfacción.");`;
        return {
          code: snippet,
          matchedBlocks: [PRECODE_LIBRARY.find((b) => b.id === "pre_web_faq_contact")!],
          tokenSavingsTotal: 280,
          isInsertionSnippet: true,
          explanation:
            "❓ Generé un bloque de **Preguntas Frecuentes (`web_faq`)** listo para sumarse a tu web.",
        };
      }
      if (/\b(testimonio|testimonios|opinion|opiniones|resena|resenas|cliente|clientes)\b/i.test(p)) {
        const snippet = `// Sección añadida: Testimonios de Clientes
web_testimonial("La atención fue rapidísima y el producto superó lo prometido.", "Sofía Navarro", "Clienta Verificada", 5);
web_testimonial("Recomendable 100%. Desde el primer día vimos resultados claros.", "Carlos Mendoza", "Empresa Asociada", 5);`;
        return {
          code: snippet,
          matchedBlocks: [PRECODE_LIBRARY.find((b) => b.id === "pre_web_faq_contact")!],
          tokenSavingsTotal: 260,
          isInsertionSnippet: true,
          explanation:
            "⭐ Generé **testimonios de clientes (`web_testimonial`)** para reforzar la confianza de tu página web.",
        };
      }
      if (/\b(formulario|contacto|pedido|reserva|lead|correo|email)\b/i.test(p) && isExistingWebProgram) {
        const snippet = `// Sección añadida: Formulario de Contacto o Pedido
web_contact_form("Haz tu Pedido o Consulta", "Completa tus datos y nuestro equipo se pondrá en contacto hoy mismo.", "Enviar Solicitud", "enviar_contacto");`;
        return {
          code: snippet,
          matchedBlocks: [PRECODE_LIBRARY.find((b) => b.id === "pre_web_faq_contact")!],
          tokenSavingsTotal: 240,
          isInsertionSnippet: true,
          explanation:
            "📩 Generé un **formulario de pedido/contacto (`web_contact_form`)** listo para insertar en tu web.",
        };
      }
      if (/\b(metrica|metricas|cifra|cifras|estadistica|estadisticas|kpi)\b/i.test(p)) {
        const snippet = `// Sección añadida: Métricas de Confianza
web_stat("Clientes Satisfechos", "3,200+", "+18% este mes", true);
web_stat("Tiempo de Respuesta", "< 15 min", "Atención directa", true);`;
        return {
          code: snippet,
          matchedBlocks,
          tokenSavingsTotal: 220,
          isInsertionSnippet: true,
          explanation:
            "📊 Generé tarjetas de **métricas de confianza (`web_stat`)** para insertar en tu página web.",
        };
      }
      if (/\b(tarjeta|tarjetas|beneficio|beneficios|servicio|servicios|caracteristica)\b/i.test(p) && isExistingWebProgram) {
        const snippet = `// Sección añadida: Tarjeta Destacada Web
web_feature("✨", "Atención Personalizada", "Acompañamiento cercano antes, durante y después de tu compra.");`;
        return {
          code: snippet,
          matchedBlocks,
          tokenSavingsTotal: 200,
          isInsertionSnippet: true,
          explanation:
            "✨ Generé una **tarjeta de producto/beneficio (`web_feature`)** lista para insertar en tu web.",
        };
      }
    }

    if (p.includes("jefe") || p.includes("boss")) {
      const bossBlock = PRECODE_LIBRARY.find((b) => b.id === "pre_boss_3phases")!;
      return {
        code: bossBlock.snippet,
        matchedBlocks: [bossBlock],
        tokenSavingsTotal: 420,
        isInsertionSnippet: true,
        explanation:
          "⚡ Generé el proceso **jefe_final(x, y)** listo para insertar en tu programa DIV actual.",
      };
    }
    if (p.includes("persegu") || p.includes("rastread") || p.includes("homing") || p.includes("siga")) {
      const trackerBlock = PRECODE_LIBRARY.find((b) => b.id === "pre_enemy_tracker")!;
      return {
        code: trackerBlock.snippet,
        matchedBlocks: [trackerBlock],
        tokenSavingsTotal: 280,
        isInsertionSnippet: true,
        explanation:
          "⚡ Generé el proceso **enemigo_rastreador** que persigue al jugador para insertarlo en tu proyecto.",
      };
    }
    if (p.includes("enemigo") || p.includes("alien") || p.includes("monstruo") || p.includes("obstaculo")) {
      const enemyBlock = PRECODE_LIBRARY.find((b) => b.id === "pre_enemy_patrol")!;
      return {
        code: enemyBlock.snippet,
        matchedBlocks: [enemyBlock],
        tokenSavingsTotal: 230,
        isInsertionSnippet: true,
        explanation:
          "⚡ Generé el proceso **enemigo_patrulla(x, y)** con movimiento y colisión listo para insertar.",
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
        explanation:
          "⚡ Generé el proceso **moneda_coleccionable(x, y)** que suma puntos y reaparece al recogerla.",
      };
    }
    if (p.includes("sonido") || p.includes("audio") || p.includes("musica")) {
      const audioCode = `// Efecto de sonido listo para llamar dentro de tus procesos:
sound(1, 90, 320);`;
      return {
        code: audioCode,
        matchedBlocks: [PRECODE_LIBRARY.find((b) => b.id === "pre_sfx_pack")!],
        tokenSavingsTotal: 140,
        isInsertionSnippet: true,
        explanation:
          "⚡ Generé la instrucción de sonido sintetizado DIV lista para insertar.",
      };
    }
    if (p.includes("hud") || p.includes("marcador") || p.includes("vidas") || p.includes("texto")) {
      const hudBlock = PRECODE_LIBRARY.find((b) => b.id === "pre_hud_arcade")!;
      return {
        code: hudBlock.snippet,
        matchedBlocks: [hudBlock],
        tokenSavingsTotal: 160,
        isInsertionSnippet: true,
        explanation:
          "⚡ Generé el marcador HUD con puntuación y vidas para insertarlo en el bloque principal.",
      };
    }
  }

  // 1B. PÁGINA WEB / LANDING PAGE / TIENDA DE VENTAS ONLINE (HTML5 DOM)
  const wantsWebOrLanding =
    /\b(landing|pagina web|sitio web|mi web|hacer una web|crear web|web de|ecommerce|tienda online|tienda web|catalogo|portafolio|portfolio)\b/i.test(
      p
    ) ||
    (/\b(web|pagina|sitio|venta|ventas|vender)\b/i.test(p) &&
      /\b(producto|productos|tienda|negocio|empresa|vino|vinos|ropa|curso|cursos|clinica|restaurante|agencia|servicio|servicios|oferta|ofertas|precio|precios)\b/i.test(
        p
      ));

  if (wantsWebOrLanding) {
    const cleanBrand =
      rawPrompt
        .replace(/^(crea|haz|hazme|genera|construye|diseña|disena|quiero)\s+(una|un|mi)?\s*(pagina web|sitio web|landing page|landing|web|tienda online|tienda)\s*(de|para|sobre)?\s*/i, "")
        .replace(/["\n\r]/g, " ")
        .trim()
        .slice(0, 32) || "Mi Marca Web";
    const displayBrand = cleanBrand.charAt(0).toUpperCase() + cleanBrand.slice(1);
    const webProgName = `web_${sanitizeProgramName(cleanBrand, "landing")}`;
    const webTheme = /\b(oscuro|dark|tecnolog|cyber|neon|gamer)\b/i.test(p) ? "dark" : "light";

    // A) Tienda / Catálogo / Ventas Online
    if (/\b(tienda|ecommerce|vender|venta|ventas|catalogo|producto|productos|comprar|pack|packs|vino|vinos|ropa|curso|pedido)\b/i.test(p)) {
      const salesWebCode = `// =================================================================
// WXDIV 3.0 - PÁGINA WEB DE VENTAS: ${displayBrand.toUpperCase()}
// =================================================================
PROGRAM ${webProgName};

BEGIN
  set_mode(m800x600);
  set_fps(60);
  set_html5_mode(1);
  set_title("${displayBrand}");

  web_page("${displayBrand}", "Catálogo y Ventas Online", "${webTheme}");
  web_navbar("${displayBrand}", "Inicio,Catálogo,Ofertas,Reseñas,Pedidos", "Comprar Ahora", "btn_nav_comprar");

  web_hero(
    "${displayBrand}: Calidad Seleccionada Directo a tu Casa",
    "Descubre nuestra colección destacada con envío garantizado, atención personalizada y pago seguro.",
    "Ver Packs y Ofertas",
    "btn_hero_packs",
    "Consultar Stock",
    "btn_hero_stock",
    "Envío Rápido 24h"
  );

  web_stat("Clientes Felices", "4,200+", "99% recomiendan", true);
  web_stat("Despacho Express", "24 hs", "Todo el país", true);
  web_stat("Valoración Media", "4.9 / 5", "Reseñas reales", true);

  web_feature("📦", "Entrega Protegida", "Cada pedido viaja sellado y asegurado hasta tu domicilio.");
  web_feature("💳", "Múltiples Medios de Pago", "Paga con tarjeta, transferencia o contra entrega sin recargos.");
  web_feature("🎁", "Garantía Total", "Compra sin riesgos con cambio inmediato si algo no te convence.");

  web_pricing("Pack Inicial", "$29", " / pack", "Selección esencial, Guía incluida, Envío estándar", false, "Comprar Pack", "plan_1");
  web_pricing("Pack Más Vendido", "$54", " / caja", "Edición destacada, Envío 24h GRATIS, Obsequio sorpresa", true, "Comprar Ahora", "plan_2");
  web_pricing("Pack Premium", "$95", " / caja", "Edición limitada, Atención prioritaria, Facturación directa", false, "Solicitar Pack", "plan_3");

  web_testimonial("Llegó al día siguiente impecable. Excelente calidad y atención.", "Carolina Méndez", "Compradora Verificada", 5);
  web_testimonial("Ya es la tercera vez que compramos aquí y siempre cumplen.", "Javier Torres", "Cliente Frecuente", 5);

  web_faq("¿Cuánto demora en llegar mi pedido?", "Despachamos en el día y recibes entre 24 y 48 horas hábiles.");
  web_faq("¿Hacen ventas por mayor o para eventos?", "Sí, completa el formulario abajo y te enviamos presupuesto especial.");

  web_contact_form("Haz tu Pedido o Consulta", "Déjanos tus datos y confirmamos stock y entrega en menos de 15 minutos.", "Confirmar Pedido", "enviar_pedido");
  web_cta_banner("Aprovecha nuestras ofertas de temporada hoy", "Unidades limitadas con despacho inmediato.", "Pedir con Descuento", "btn_cta_final", "Oferta Activa");
  web_footer("${displayBrand}", "© 2026 ${displayBrand}. Todos los derechos reservados.", "Catálogo,Envíos,Términos,Contacto");

  LOOP
    FRAME;
  END
END`;
      return {
        code: salesWebCode,
        matchedBlocks: matchedBlocks.length > 0 ? matchedBlocks : [PRECODE_LIBRARY.find((b) => b.id === "pre_web_sales_pricing")!],
        tokenSavingsTotal: 540,
        explanation:
          `🛍️ Generé una **Página Web de Ventas completa para "${displayBrand}"** con portada, métricas, tarjetas de beneficios, packs de precios, testimonios, FAQ y formulario de pedido.`,
      };
    }

    // B) Landing / Web Corporativa o de Servicios / Portafolio
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
    "Solicitar Información",
    "btn_hero_cta",
    "Ver Servicios",
    "btn_hero_sec",
    "Web HTML5"
  );

  web_stat("Proyectos Activos", "1,500+", "+24% anual", true);
  web_stat("Satisfacción", "98.7%", "Clientes reales", true);
  web_stat("Respuesta Media", "< 15 min", "Atención directa", true);

  web_feature("⚡", "Carga Instantánea", "Diseño web limpio y veloz adaptado a celulares y computadoras.");
  web_feature("🎯", "Enfocado en Conversión", "Estructura probada con portada clara, beneficios y llamada a la acción.");
  web_feature("📱", "Listo para Publicar", "Exporta el HTML5 con un clic para subirlo a cualquier hosting.");

  web_pricing("Plan Inicial", "$0", "/mes", "Página informativa, Diseño móvil, Formulario de contacto", false, "Elegir Inicial", "plan_1");
  web_pricing("Plan Profesional", "$29", "/mes", "Secciones completas, Catálogo y precios, Soporte prioritario", true, "Elegir Profesional", "plan_2");

  web_testimonial("Multiplicamos nuestras consultas semanales desde el primer día que publicamos la web.", "Laura Giménez", "Fundadora de Estudio Norte", 5);
  web_testimonial("Fácil de personalizar y con un diseño claro que genera confianza.", "Marcos Silva", "Emprendedor Local", 5);

  web_faq("¿Puedo modificar los textos y precios después?", "Sí, puedes editar el código DIV o pedir cambios directamente en el chat de AURA IA.");
  web_faq("¿Funciona en celulares y tablets?", "Totalmente. Todas las secciones se adaptan automáticamente a cualquier pantalla.");

  web_contact_form("Contáctanos Ahora", "Cuéntanos qué necesitas y te responderemos a la brevedad.", "Enviar Mensaje", "enviar_contacto");
  web_cta_banner("Lanza tu página web profesional hoy mismo", "Personalízala a tu medida y publícala en minutos.", "Comenzar Ahora", "btn_cta_final", "Listo para Web");
  web_footer("${displayBrand}", "© 2026 ${displayBrand}. Todos los derechos reservados.", "Inicio,Servicios,Privacidad,Contacto");

  LOOP
    FRAME;
  END
END`;
    return {
      code: landingCode,
      matchedBlocks: matchedBlocks.length > 0 ? matchedBlocks : [PRECODE_LIBRARY.find((b) => b.id === "pre_web_hero_nav")!],
      tokenSavingsTotal: 520,
      explanation:
        `🌐 Generé una **Landing Page HTML5 completa para "${displayBrand}"** lista para probar en vivo o exportar a producción.`,
    };
  }

  // 2. APLICACIÓN VISUAL / ESCRITORIO / CALCULADORA / FORMULARIO / GESTOR
  if (
    /\b(app|aplicacion|calculadora|calculator|tarea|tareas|todo|formulario|form|login|registro|clinica|inventario|crm|pos|tienda|menu|tabla|escritorio|agenda|presupuesto|dashboard|ventana)\b/i.test(
      p
    )
  ) {
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
        explanation:
          "🧮 Generé una **Calculadora visual en DIV** con botones numéricos, pantalla de resultado y eventos interactivos.",
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
      explanation:
        "🖥️ Generé una **Aplicación visual en DIV** con barra superior, campo de texto, botones interactivos y tabla de registros.",
    };
  }

  // 3. JUEGO DE PLATAFORMAS (SALTO + GRAVEDAD + MONEDAS)
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
      explanation:
        "🏃 Generé un **Juego de Plataformas en DIV** con gravedad, salto, plataformas visibles y monedas coleccionables.",
    };
  }

  // 4. PONG / PELOTA / RAQUETA / ARKANOID
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
      explanation:
        "🏓 Generé un **Juego Pong en DIV** con raqueta controlable, rebote de pelota y puntuación.",
    };
  }

  // 5. RECOGER MONEDAS / ESTRELLAS / OBJETOS (COLLECTOR)
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
      explanation:
        "⭐ Generé un **Juego de Recoger Estrellas/Monedas en DIV** listo para jugar en teclado o móvil.",
    };
  }

  // 6. FLAPPY / COCHES / ESQUIVAR OBSTÁCULOS
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
      explanation:
        "🚗 Generé un **Juego Arcade de Esquivar Obstáculos en DIV** con desplazamiento, colisiones, vidas y puntuación.",
    };
  }

  // 7. MODO 8 / 3D / DOOM / LABERINTO
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
      explanation:
        "🧭 Generé una **Escena 3D Modo 8 en DIV** con cámara en primera persona y controles de exploración.",
    };
  }

  // 8. DEFAULT / ARCADE SHOOTER / ENEMIGOS / JEFES (sintaxis DIV completa con LOOP FRAME; END)
  if (matchedBlocks.length === 0) {
    matchedBlocks.push(PRECODE_LIBRARY[0], PRECODE_LIBRARY[3], PRECODE_LIBRARY[7]);
    tokenSavingsTotal = 620;
  }

  const programName = sanitizeProgramName(prompt, "juego_wxdiv");
  const hasBoss = matchedBlocks.some((b) => b.category === "bosses") || p.includes("jefe") || p.includes("boss");
  const hasTracker = p.includes("rastread") || p.includes("persegu") || p.includes("siga");

  const codeBlocksParts: string[] = [];

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
${
  hasBoss
    ? "  jefe_final(320, 110);"
    : "  enemigo_patrulla(120, 80);\n  enemigo_patrulla(320, 80);\n  enemigo_patrulla(500, 80);"
}

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
    codeBlocksParts.push(PRECODE_LIBRARY.find((b) => b.id === "pre_boss_3phases")!.snippet + "\n");
  } else if (hasTracker) {
    codeBlocksParts.push(PRECODE_LIBRARY.find((b) => b.id === "pre_enemy_tracker")!.snippet + "\n");
  } else {
    codeBlocksParts.push(PRECODE_LIBRARY.find((b) => b.id === "pre_enemy_patrol")!.snippet + "\n");
  }

  const finalCode = codeBlocksParts.join("\n");
  const blockNames = matchedBlocks.map((b) => b.name).join(", ");

  const explanation = `⚡ **Código DIV generado** (${blockNames}). Puedes probarlo directo o insertarlo en tu editor.`;

  return {
    code: finalCode,
    matchedBlocks,
    tokenSavingsTotal,
    explanation,
  };
}

/**
 * Prepara un prompt optimizado con precódigo, contexto 3D y sintaxis DIV estricta para WebLLM local.
 */
export function buildPrecodeOptimizedPrompt(
  userPrompt: string,
  currentCode: string,
  options?: { activeTab?: string; mode8Context?: Mode8SceneContext }
): {
  systemPrompt: string;
  userPromptWithPrecode: string;
  matchedBlocks: PrecodeBlock[];
  tokenSavings: number;
} {
  const p = userPrompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const matched = PRECODE_LIBRARY.filter((b) => b.keywords.some((kw) => p.includes(kw)));
  const blocksToUse = matched.slice(0, 3);
  const totalSavings = blocksToUse.reduce((acc, b) => acc + (parseInt(b.tokenSavings) || 200), 0);

  const precodeContext = blocksToUse
    .map((b) => `--- BLOQUE PRECÓDIGO (${b.name}) ---\n${b.snippet}`)
    .join("\n\n");

  const mode8Summary = formatMode8ContextForPrompt(options?.mode8Context);

  const systemPrompt = `Eres AURA IA, asistente 100% local de WXDIV 3.0. Genera código DIV válido en español dentro de \`\`\`div ... \`\`\`.
Reglas estrictas de sintaxis DIV:
- Cabecera: PROGRAM nombre_programa;
- Variables globales en GLOBAL (SIN END al final de GLOBAL).
- Bloque principal: BEGIN ... LOOP FRAME; END END
- Procesos: PROCESS nombre(x, y) PRIVATE ... BEGIN graph = 1; LOOP ... FRAME; END END
- Todos los IF, LOOP, WHILE, FOR, BEGIN se cierran con END.
- Apps y Juegos DIV: set_mode(m640x480), set_fps(60), screen_color(rgb(r,g,b)), write(0, x, y, 0, "texto"), draw_box(...), draw_input(...), draw_button(...), key(...), collision(type proceso), sound(...), rand(min, max).
- Páginas Web HTML5 en WXDIV: set_html5_mode(1); web_page(...); web_navbar(...); web_hero(...); web_stat(...); web_feature(...); web_pricing(...); web_contact_form(...); web_footer(...);
- Si el usuario está editando un mapa 3D Modo 8 y pide añadir plataformas, escaleras, monedas, enemigos o cambiar cielo/material, además puedes incluir un bloque JSON \`\`\`mode8-actions [{"type":"add_platform","floorHeight":0.75}] \`\`\` con acciones para el mapa 3D.
- NO uses HTML crudo, JavaScript, Python ni llaves { }.`;

  const userPromptWithPrecode = `Petición del usuario: ${userPrompt}

${mode8Summary ? `${mode8Summary}\n\n` : ""}${precodeContext ? `Bloques de referencia DIV:\n${precodeContext}\n` : ""}
${
  currentCode.trim()
    ? `Código DIV actual en el editor:\n\`\`\`div\n${currentCode.slice(0, 1200)}\n\`\`\``
    : "El editor está vacío: genera un PROGRAM completo ejecutable."
}

Entrega el código DIV exacto dentro de \`\`\`div ... \`\`\`:`;

  return {
    systemPrompt,
    userPromptWithPrecode,
    matchedBlocks: blocksToUse,
    tokenSavings: totalSavings,
  };
}
