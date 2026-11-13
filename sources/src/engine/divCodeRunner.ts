import { DivRuntime } from "./runtime";
import { PRESETS } from "./presets";
import { parseDivToHtml5State } from "./html5Engine";

/**
 * Utility to extract PROGRAM name from DIV code
 */
export function extractProgramName(code: string): string {
  const match = code.match(/PROGRAM\s+([a-zA-Z0-9_]+)/i);
  return match ? match[1] : "MiPrograma";
}

/**
 * Utility to extract resolution from set_mode(...) in DIV code
 */
export function extractResolutionFromCode(
  code: string
): "320x200" | "640x480" | "800x600" | null {
  if (/set_mode\s*\(\s*m320x200\s*\)/i.test(code) || /set_mode\s*\(\s*320\s*,\s*200\s*\)/i.test(code)) {
    return "320x200";
  }
  if (/set_mode\s*\(\s*m800x600\s*\)/i.test(code) || /set_mode\s*\(\s*800\s*,\s*600\s*\)/i.test(code)) {
    return "800x600";
  }
  if (/set_mode\s*\(\s*m640x480\s*\)/i.test(code) || /set_mode\s*\(\s*640\s*,\s*480\s*\)/i.test(code)) {
    return "640x480";
  }
  return null;
}

/**
 * Dynamically configures and runs any DIV Games Studio code in DivRuntime
 */
export function setupRuntimeFromDivCode(
  runtime: DivRuntime,
  code: string,
  customTitle?: string
): void {
  runtime.stop();
  runtime.reset();
  runtime.updateSourceCode(code);

  const title = customTitle || extractProgramName(code);
  const codeLower = code.toLowerCase();

  // 1. Resolution detection
  const res = extractResolutionFromCode(code) || "640x480";
  runtime.setResolution(res);

  // 2. Background color detection
  const bgMatch = code.match(/screen_color\s*\(\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\)/i);
  if (bgMatch) {
    const r = parseInt(bgMatch[1], 10) || 0;
    const g = parseInt(bgMatch[2], 10) || 0;
    const b = parseInt(bgMatch[3], 10) || 0;
    runtime.backgroundColor = `rgb(${r},${g},${b})`;
  } else {
    runtime.backgroundColor = "#090e1a";
  }

  // 3. Check if code matches an existing full engine preset
  if (codeLower.includes("doom_e1m1_modo8") || codeLower.includes("start_mode8_doom2") || (codeLower.includes("doom") && codeLower.includes("modo8"))) {
    const doomPreset = PRESETS.find((p) => p.id === "doom_modo8_classic");
    if (doomPreset) {
      doomPreset.setupRuntime(runtime);
      return;
    }
  }

  if (codeLower.includes("cripta_maldita") || (codeLower.includes("md2_gargoyle") && codeLower.includes("start_mode8_hybrid"))) {
    const cryptPreset = PRESETS.find((p) => p.id === "modo8_dark_md2_workers");
    if (cryptPreset) {
      cryptPreset.setupRuntime(runtime);
      return;
    }
  }

  if (codeLower.includes("hexen") && codeLower.includes("start_mode8_hybrid")) {
    const hexenPreset = PRESETS.find((p) => p.id === "hexen_citadel_3d");
    if (hexenPreset) {
      hexenPreset.setupRuntime(runtime);
      return;
    }
  }

  if (codeLower.includes("dungeon_crypt") || (codeLower.includes("start_mode8") && codeLower.includes("fpg_dungeon"))) {
    const dungPreset = PRESETS.find((p) => p.id === "mode8_dungeon");
    if (dungPreset) {
      dungPreset.setupRuntime(runtime);
      return;
    }
  }

  if (codeLower.includes("cyber_pong") || (codeLower.includes("paddle") && codeLower.includes("pelota"))) {
    const pongPreset = PRESETS.find((p) => p.id === "cyber_pong");
    if (pongPreset) {
      pongPreset.setupRuntime(runtime);
      return;
    }
  }

  // 4. Detect Web, Landing Pages, and HTML5 App projects to generate native DOM structure
  // instead of initializing a canvas arcade game
  const titleLower = title.toLowerCase();
  const parsedHtmlState = parseDivToHtml5State(code, title);
  const isAppOrWebProject =
    parsedHtmlState.active ||
    titleLower.startsWith("app_") ||
    titleLower.startsWith("web_") ||
    titleLower.startsWith("[app]") ||
    titleLower.startsWith("[web]") ||
    titleLower.includes("app_") ||
    titleLower.includes("web_") ||
    titleLower.includes("landing") ||
    titleLower.includes("web") ||
    titleLower.includes("crm") ||
    titleLower.includes("pos") ||
    titleLower.includes("dashboard") ||
    titleLower.includes("sqlite") ||
    titleLower.includes("formulario") ||
    /program\s+(?:app_|web_|landing|generador_landing|dashboard_|crm_|chat_|pos_|punto_de_|presupuesto_|gestor_sqlite|login_form|notepad_|paint_|calculadora_|tareas_)[a-z0-9_]*/i.test(code) ||
    codeLower.includes("set_html5_mode") ||
    codeLower.includes("m_html5") ||
    codeLower.includes("draw_landing_page") ||
    codeLower.includes("web_page") ||
    codeLower.includes("web_hero") ||
    codeLower.includes("web_navbar") ||
    codeLower.includes("web_pricing") ||
    codeLower.includes("web_feature") ||
    codeLower.includes("web_faq") ||
    codeLower.includes("web_testimonial") ||
    codeLower.includes("web_stat") ||
    codeLower.includes("web_footer") ||
    codeLower.includes("web_cta_banner") ||
    codeLower.includes("web_contact_form") ||
    codeLower.includes("draw_html_form") ||
    codeLower.includes("add_form_input") ||
    codeLower.includes("add_feature(") ||
    codeLower.includes("navbar(") ||
    codeLower.includes("hero(") ||
    codeLower.includes("landing_controller") ||
    codeLower.includes("landing_web_engine") ||
    codeLower.includes("draw_button(") ||
    codeLower.includes("draw_checkbox(") ||
    codeLower.includes("_controller()") ||
    codeLower.includes("visual mdi") ||
    (codeLower.includes("draw_input(") && (codeLower.includes("form") || codeLower.includes("app") || codeLower.includes("landing") || codeLower.includes("web")));

  if (isAppOrWebProject) {
    // Generate direct HTML5 DOM state structure (landing pages, forms, buttons, inputs, tables, tabs) natively
    const htmlState = parsedHtmlState.active ? parsedHtmlState : parseDivToHtml5State(code, title);
    runtime.html5State = htmlState;
    runtime.setHtml5Mode(true);
    // Return early: do NOT initialize canvas runtime or spawn retro game processes
    return;
  }

  // Retro Canvas Games: ensure canvas mode is active and HTML5 mode is disabled
  runtime.setHtml5Mode(false);

  // 5. Standard Assets (FPG & Fonts)
  const fpgId = runtime.load_fpg("juego.fpg");
  const fontId = runtime.load_fnt("arcade.fnt");

  // Global variables initialization
  runtime.globalVars.score = 0;
  runtime.globalVars.hi_score = 5000;
  runtime.globalVars.lives = 3;
  runtime.globalVars.vidas = 3;
  runtime.globalVars.game_over = 0;

  // 5. Check if it is a completely empty blank project
  const isMinimalProgram =
    code.trim().length === 0 ||
    (code.trim().length < 120 &&
      (codeLower.includes("miprograma") || codeLower.includes("mi_programa") || !codeLower.includes("process")));

  if (isMinimalProgram) {
    // Clean blank environment: writes welcome label and waits
    runtime.write(fontId, 20, 25, 0, (title || "PROGRAMA VACÍO").toUpperCase());
    runtime.write(fontId, 20, 55, 0, "ENTORNO DIV VACÍO - LISTO PARA EJECUTAR");
    runtime.write(fontId, 20, 80, 0, "Escribe código o usa el Asistente IA para generar tu juego");
    return;
  }

  // 6. Generic Arcade / Action / Shmup / Platformer / Collector / Dodger Engine for user/AI code
  const isPlatformer =
    codeLower.includes("jugador_plataforma") ||
    codeLower.includes("moneda_plataforma") ||
    (codeLower.includes("salto") && codeLower.includes("gravedad"));
  const isCollector =
    codeLower.includes("estrella_premio") ||
    codeLower.includes("moneda_coleccionable") ||
    codeLower.includes("recolectar");
  const isDodger =
    codeLower.includes("obstaculo_caida") ||
    codeLower.includes("esquivar");

  const hasCombat = codeLower.includes("disparo") || codeLower.includes("laser") || codeLower.includes("shoot") || codeLower.includes("bullet") || codeLower.includes("bala");
  const hasEnemies = codeLower.includes("enemigo") || codeLower.includes("alien") || codeLower.includes("patrulla") || codeLower.includes("monster");
  const hasBoss = codeLower.includes("jefe") || codeLower.includes("boss");

  // Platformer Player Process
  runtime.registerProcess("jugador_plataforma", function* (proc, args, rt) {
    proc.file = fpgId;
    proc.graph = 1;
    proc.size = 105;
    proc.x = args[0] ?? 100;
    proc.y = args[1] ?? (rt.height - 70);
    let vy = 0;
    let onGround = false;

    const platforms = [
      { x1: 90, y: rt.height - 135, x2: 240 },
      { x1: 270, y: rt.height - 210, x2: 420 },
      { x1: 450, y: rt.height - 275, x2: 590 },
    ];

    while (!proc.isDead) {
      // Draw static ground and floating platforms every frame
      rt.draw_box(0, rt.height - 52, rt.width, rt.height, "#166534");
      rt.draw_box(0, rt.height - 56, rt.width, rt.height - 50, "#4ade80");
      for (const p of platforms) {
        rt.draw_box(p.x1, p.y, p.x2, p.y + 14, "#b45309");
        rt.draw_box(p.x1, p.y, p.x2, p.y + 4, "#fbbf24");
      }

      if (rt.key("left") || rt.key("a")) proc.x -= 4.5;
      if (rt.key("right") || rt.key("d")) proc.x += 4.5;

      if ((rt.key("up") || rt.key("w") || rt.key("space")) && onGround) {
        vy = -12.5;
        onGround = false;
        rt.sound(1, 80, 340);
      }

      vy += 0.6;
      const prevY = proc.y;
      proc.y += vy;
      onGround = false;

      // Platform landing check
      if (vy >= 0) {
        for (const p of platforms) {
          if (proc.x >= p.x1 - 12 && proc.x <= p.x2 + 12 && prevY <= p.y && proc.y >= p.y - 16) {
            proc.y = p.y - 16;
            vy = 0;
            onGround = true;
            break;
          }
        }
      }

      // Ground landing check
      const groundY = rt.height - 72;
      if (proc.y >= groundY) {
        proc.y = groundY;
        vy = 0;
        onGround = true;
      }

      proc.x = Math.max(20, Math.min(rt.width - 20, proc.x));
      yield;
    }
  });

  // Coin / Star Collectible Process
  runtime.registerProcess("moneda_plataforma", function* (proc, [cx, cy], rt) {
    proc.file = fpgId;
    proc.graph = 6;
    proc.size = 95;
    proc.x = cx ?? 220;
    proc.y = cy ?? 200;
    let t = 0;

    while (!proc.isDead) {
      t++;
      proc.angle = (t * 4) % 360;
      rt.draw_fcircle(proc.x, proc.y, 11, "#facc15");
      rt.draw_circle(proc.x, proc.y, 13, "#fef08a");

      for (const [, other] of rt.processes) {
        if (!other.isDead && (other.name === "jugador_plataforma" || other.name === "jugador" || other.name === "player")) {
          if (Math.hypot(proc.x - other.x, proc.y - other.y) < 30) {
            rt.globalVars.score = (rt.globalVars.score || 0) + 100;
            rt.sound(2, 95, 420);
            proc.x = Math.random() * (rt.width - 100) + 50;
            proc.y = isPlatformer ? 140 + Math.random() * (rt.height - 230) : Math.random() * (rt.height - 140) + 70;
            break;
          }
        }
      }
      yield;
    }
  });

  runtime.registerProcess("estrella_premio", function* (proc, args, rt) {
    const gen = (runtime as any).processDefs.get("moneda_plataforma")?.(proc, args, rt);
    if (gen) yield* gen;
  });

  runtime.registerProcess("moneda_coleccionable", function* (proc, args, rt) {
    const gen = (runtime as any).processDefs.get("moneda_plataforma")?.(proc, args, rt);
    if (gen) yield* gen;
  });

  // Falling Obstacle Dodger Process
  runtime.registerProcess("obstaculo_caida", function* (proc, [ox, oy], rt) {
    proc.file = fpgId;
    proc.graph = 4;
    proc.size = 90;
    proc.x = ox ?? (Math.random() * (rt.width - 80) + 40);
    proc.y = oy ?? -20;
    const speed = 3 + Math.random() * 2.5;

    while (!proc.isDead) {
      proc.y += speed;
      proc.angle = (proc.angle + 4) % 360;

      for (const [, other] of rt.processes) {
        if (!other.isDead && (other.name === "jugador" || other.name === "player" || other.name === "jugador_plataforma")) {
          if (Math.hypot(proc.x - other.x, proc.y - other.y) < 28) {
            rt.sound(3, 100, 140);
            rt.spawn("explosion_particula", [proc.x, proc.y]);
            rt.globalVars.lives = Math.max(0, (rt.globalVars.lives ?? 3) - 1);
            rt.globalVars.vidas = rt.globalVars.lives;
            proc.y = -25;
            proc.x = Math.random() * (rt.width - 80) + 40;
            break;
          }
        }
      }

      if (proc.y > rt.height + 20) {
        rt.globalVars.score = (rt.globalVars.score || 0) + 25;
        proc.y = -25;
        proc.x = Math.random() * (rt.width - 80) + 40;
      }

      yield;
    }
  });

  // Register Player Process (jugador / player / nave)
  runtime.registerProcess("jugador", function* (proc, args, rt) {
    proc.file = fpgId;
    proc.graph = 1; // Default spaceship / player sprite
    proc.size = 110;
    proc.x = args[0] ?? (rt.width / 2);
    proc.y = args[1] ?? (rt.height - 70);

    let reloadTimer = 0;

    while (!proc.isDead) {
      const speed = 5;

      // 8-Way Controls (WASD / Arrows)
      if (rt.key("left") || rt.key("a")) proc.x -= speed;
      if (rt.key("right") || rt.key("d")) proc.x += speed;
      if (rt.key("up") || rt.key("w")) proc.y -= speed;
      if (rt.key("down") || rt.key("s")) proc.y += speed;

      // Clamp to screen bounds
      proc.x = Math.max(20, Math.min(rt.width - 20, proc.x));
      proc.y = Math.max(20, Math.min(rt.height - 20, proc.y));

      // Shooting on Space / Enter / Mouse Click (when combat exists)
      if (hasCombat && (rt.key("space") || rt.key("enter") || rt.mouseState.left) && reloadTimer <= 0) {
        rt.sound(1, 90, 320); // Laser sound
        rt.spawn("disparo_jugador", [proc.x, proc.y - 18]);
        reloadTimer = 10;
      }

      if (reloadTimer > 0) reloadTimer--;

      yield;
    }
  });

  // Alias player
  runtime.registerProcess("player", function* (proc, args, rt) {
    const gen = (runtime as any).processDefs.get("jugador")?.(proc, args, rt);
    if (gen) yield* gen;
  });

  // Register Bullet / Laser Process (disparo_jugador / laser / bala)
  runtime.registerProcess("disparo_jugador", function* (proc, [sx, sy], rt) {
    proc.file = fpgId;
    proc.graph = 2; // Laser projectile sprite
    proc.size = 100;
    proc.x = sx;
    proc.y = sy;

    while (!proc.isDead) {
      proc.y -= 10;

      // Check collision with enemies
      for (const [, other] of rt.processes) {
        if (!other.isDead && (other.name === "enemigo_patrulla" || other.name === "enemigo" || other.name === "alien" || other.name === "jefe_final")) {
          const dist = Math.hypot(proc.x - other.x, proc.y - other.y);
          if (dist < 26) {
            // Hit enemy
            proc.isDead = true;
            other.isDead = true;
            rt.sound(1, 120, 160); // Explosion sound
            rt.spawn("explosion_particula", [other.x, other.y]);
            rt.globalVars.score = (rt.globalVars.score || 0) + 100;

            // Respawn enemy after delay
            setTimeout(() => {
              if (rt.isRunning) {
                rt.spawn("enemigo_patrulla", [Math.random() * (rt.width - 100) + 50, 70 + Math.random() * 80]);
              }
            }, 1200);
            break;
          }
        }
      }

      if (proc.y < -20) {
        proc.isDead = true;
      }

      yield;
    }
  });

  // Alias laser
  runtime.registerProcess("laser", function* (proc, args, rt) {
    const gen = (runtime as any).processDefs.get("disparo_jugador")?.(proc, args, rt);
    if (gen) yield* gen;
  });

  // Register Enemy Process (enemigo_patrulla / alien)
  runtime.registerProcess("enemigo_patrulla", function* (proc, [startX, startY], rt) {
    proc.file = fpgId;
    proc.graph = 3; // Alien sprite
    proc.size = 110;
    proc.x = startX;
    proc.y = startY;

    let dir = Math.random() > 0.5 ? 1 : -1;
    let step = 0;

    while (!proc.isDead) {
      step++;
      proc.x += dir * 2.5;

      if (proc.x < 30) {
        proc.x = 30;
        dir = 1;
      } else if (proc.x > rt.width - 30) {
        proc.x = rt.width - 30;
        dir = -1;
      }

      // Gentle floating sine motion
      proc.y = startY + Math.sin(step * 0.05) * 8;

      yield;
    }
  });

  // Alias enemigo
  runtime.registerProcess("enemigo", function* (proc, args, rt) {
    const gen = (runtime as any).processDefs.get("enemigo_patrulla")?.(proc, args, rt);
    if (gen) yield* gen;
  });

  // Register Boss Process (jefe_final)
  runtime.registerProcess("jefe_final", function* (proc, [bx, by], rt) {
    proc.file = fpgId;
    proc.graph = 4; // Large Asteroid / Boss sprite
    proc.size = 200;
    proc.x = bx ?? (rt.width / 2);
    proc.y = by ?? 110;
    let dir = 1;

    while (!proc.isDead) {
      proc.x += dir * 1.8;
      if (proc.x < 80) dir = 1;
      if (proc.x > rt.width - 80) dir = -1;

      if (Math.random() < 0.02) {
        rt.sound(1, 60, 200);
      }

      yield;
    }
  });

  // Register Explosion Particle
  runtime.registerProcess("explosion_particula", function* (proc, [ex, ey], rt) {
    proc.file = fpgId;
    proc.graph = 5; // Explosion burst sprite
    proc.size = 60;
    proc.x = ex;
    proc.y = ey;

    for (let f = 0; f < 10; f++) {
      proc.size += 14;
      proc.alpha = Math.max(0, 255 - f * 25);
      yield;
    }
    proc.isDead = true;
  });

  // 7. Write HUD & Markings
  runtime.write(fontId, 20, 20, 0, title.toUpperCase());
  runtime.write(fontId, 20, 45, 0, "PUNTOS:");
  runtime.writeInt(fontId, 95, 45, 0, "score");
  runtime.write(fontId, runtime.width - 130, 45, 0, "VIDAS:");
  runtime.writeInt(fontId, runtime.width - 65, 45, 0, "lives");

  if (isPlatformer) {
    runtime.write(fontId, 20, runtime.height - 25, 0, "[A/D o Flechas] Mover  |  [W / ESPACIO] Saltar");
    runtime.spawn("jugador_plataforma", [100, runtime.height - 72]);
    runtime.spawn("moneda_plataforma", [165, runtime.height - 170]);
    runtime.spawn("moneda_plataforma", [345, runtime.height - 245]);
    runtime.spawn("moneda_plataforma", [520, runtime.height - 310]);
  } else if (isDodger) {
    runtime.write(fontId, 20, runtime.height - 25, 0, "[A/D o Flechas] Esquivar meteoros");
    runtime.spawn("jugador", [runtime.width / 2, runtime.height - 65]);
    runtime.spawn("obstaculo_caida", [120, -20]);
    runtime.spawn("obstaculo_caida", [300, -140]);
    runtime.spawn("obstaculo_caida", [480, -260]);
  } else if (isCollector && !hasCombat) {
    runtime.write(fontId, 20, runtime.height - 25, 0, "[WASD / Flechas] Mover y recolectar estrellas");
    runtime.spawn("jugador", [runtime.width / 2, runtime.height / 2]);
    runtime.spawn("estrella_premio", [140, 120]);
    runtime.spawn("estrella_premio", [320, 180]);
    runtime.spawn("estrella_premio", [500, 130]);
    if (hasEnemies) {
      runtime.spawn("enemigo_patrulla", [200, 100]);
    }
  } else {
    runtime.write(fontId, 20, runtime.height - 25, 0, "[WASD / Flechas] Mover  |  [ESPACIO] Disparar");
    runtime.spawn("jugador", [runtime.width / 2, runtime.height - 70]);

    if (hasBoss) {
      runtime.spawn("jefe_final", [runtime.width / 2, 110]);
    } else if (hasEnemies || hasCombat) {
      runtime.spawn("enemigo_patrulla", [120, 90]);
      runtime.spawn("enemigo_patrulla", [runtime.width / 2, 80]);
      runtime.spawn("enemigo_patrulla", [runtime.width - 120, 90]);
    }
  }
}
