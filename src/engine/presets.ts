import { DivRuntime } from "./runtime";
import { DivProcess } from "../types";

export interface GamePreset {
  id: string;
  name: string;
  genre: string;
  description: string;
  resolution: "320x200" | "640x480" | "800x600";
  code: string;
  setupRuntime: (runtime: DivRuntime) => void;
}

export const PRESETS: GamePreset[] = [
  // 1: Galaxy Defender
  {
    id: "space_shooter",
    name: "Galaxy Defender 3.0",
    genre: "Arcade Shmup",
    description: "Shooter espacial clásico con desplazamiento de estrellas, alienígenas, disparos láser, asteroides y explosiones.",
    resolution: "640x480",
    code: `PROGRAM galaxy_defender;

GLOBAL
  score = 0;
  hi_score = 5000;
  lives = 3;
  game_over = 0;

LOCAL
  speed = 5;
  reload = 0;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(10, 14, 23));

  write(1, 20, 30, 0, "GALAXY DEFENDER 3.0");
  write_int(1, 20, 60, 0, &score);
  write_int(1, 520, 60, 0, &lives);

  // Iniciar estrellas de fondo
  star_field();

  // Iniciar nave del jugador
  player(320, 420);

  // Iniciar generador de oleadas alienígenas
  wave_spawner();

  LOOP
    FRAME;
  END
END

PROCESS star_field()
PRIVATE
  i;
BEGIN
  FOR (i = 0; i < 40; i++)
    star(rand(0, 640), rand(0, 480), rand(1, 4));
  END
END

PROCESS star(x, y, speed)
BEGIN
  graph = 0;
  LOOP
    y += speed;
    IF (y > 480)
      y = 0;
      x = rand(0, 640);
    END
    draw_box(x, y, x + 1, y + 1, "#475569");
    FRAME;
  END
END

PROCESS player(x, y)
PRIVATE
  cooldown = 0;
BEGIN
  graph = 1; // Nave espacial
  size = 130;
  LOOP
    IF (key(_left) || key(_a))  x -= speed; END
    IF (key(_right) || key(_d)) x += speed; END
    IF (key(_up) || key(_w))    y -= speed; END
    IF (key(_down) || key(_s))  y += speed; END

    // Limites de pantalla
    IF (x < 20) x = 20; END
    IF (x > 620) x = 620; END
    IF (y < 100) y = 100; END
    IF (y > 460) y = 460; END

    // Disparar
    IF (cooldown > 0) cooldown--; END
    IF ((key(_space) || key(_enter)) && cooldown == 0)
      laser_shot(x - 8, y - 16);
      laser_shot(x + 8, y - 16);
      sound(1, 80, 300); // Sonido láser
      cooldown = 12;
    END

    // Colisión con enemigos
    IF (collision(type alien) || collision(type asteroid))
      explosion(x, y);
      sound(2, 100, 200); // Explosión
      lives--;
      IF (lives <= 0)
        write(1, 260, 240, 1, "GAME OVER");
        signal(id, s_kill);
      ELSE
        x = 320;
        y = 420;
      END
    END

    FRAME;
  END
END

PROCESS laser_shot(x, y)
BEGIN
  graph = 2; // Láser
  size = 110;
  WHILE (y > -20)
    y -= 10;
    FRAME;
  END
END

PROCESS wave_spawner()
PRIVATE
  t = 0;
BEGIN
  LOOP
    t++;
    IF (t % 70 == 0)
      alien(rand(40, 600), -20, rand(1, 3));
    END
    IF (t % 150 == 0)
      asteroid(rand(40, 600), -30);
    END
    FRAME;
  END
END

PROCESS alien(x, y, variant)
PRIVATE
  vx = 2;
  dir = 1;
BEGIN
  graph = (variant == 1) ? 3 : 4; // Alien 1 o 2
  size = 120;
  LOOP
    y += 2;
    x += vx * dir;
    IF (x > 600 || x < 40) dir = -dir; END

    // Detección de impacto de disparo
    IF (collision(type laser_shot))
      score += 150;
      sound(2, 70, 250);
      explosion(x, y);
      signal(collision(type laser_shot), s_kill);
      BREAK;
    END

    IF (y > 500) BREAK; END
    FRAME;
  END
END

PROCESS asteroid(x, y)
BEGIN
  graph = 7; // Asteroide
  size = 140;
  LOOP
    y += 3;
    angle += 4;
    IF (collision(type laser_shot))
      score += 80;
      sound(3, 80, 180);
      explosion(x, y);
      signal(collision(type laser_shot), s_kill);
      BREAK;
    END
    IF (y > 500) BREAK; END
    FRAME;
  END
END

PROCESS explosion(x, y)
PRIVATE
  i;
BEGIN
  FOR (i = 0; i < 15; i++)
    particle(x, y, rand(0, 360), rand(2, 6));
  END
  graph = 5;
  FRAME;
  graph = 6;
  FRAME;
  FRAME;
END

PROCESS particle(x, y, angle, speed)
PRIVATE
  life = 20;
BEGIN
  graph = 0;
  WHILE (life > 0)
    life--;
    advance(speed);
    draw_box(x, y, x + 2, y + 2, "#f97316");
    FRAME;
  END
END
`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.reset();
      runtime.setResolution("640x480");
      runtime.backgroundColor = "#070b14";
      runtime.globalVars.score = 0;
      runtime.globalVars.lives = 3;

      // Register Processes
      // Player
      runtime.registerProcess("player", function* (proc, [startX, startY], rt) {
        proc.x = startX ?? 320;
        proc.y = startY ?? 420;
        proc.graph = 1;
        proc.size = 120;
        let cooldown = 0;

        while (true) {
          const speed = 5;
          if (rt.key("left") || rt.key("a")) proc.x -= speed;
          if (rt.key("right") || rt.key("d")) proc.x += speed;
          if (rt.key("up") || rt.key("w")) proc.y -= speed;
          if (rt.key("down") || rt.key("s")) proc.y += speed;

          proc.x = Math.max(20, Math.min(rt.width - 20, proc.x));
          proc.y = Math.max(80, Math.min(rt.height - 20, proc.y));

          if (cooldown > 0) cooldown--;
          if ((rt.key("space") || rt.key("enter")) && cooldown === 0) {
            rt.spawn("laser_shot", [proc.x - 7, proc.y - 14]);
            rt.spawn("laser_shot", [proc.x + 7, proc.y - 14]);
            rt.sound(1, 70, 300);
            cooldown = 12;
          }

          // Collisions
          const enemyHit = rt.collision(proc, "alien") || rt.collision(proc, "asteroid");
          if (enemyHit) {
            rt.spawn("explosion", [proc.x, proc.y]);
            rt.sound(2, 90, 180);
            rt.globalVars.lives--;
            if (rt.globalVars.lives <= 0) {
              rt.write(1, rt.width / 2 - 50, rt.height / 2, 1, "¡GAME OVER!");
              proc.isDead = true;
              return;
            } else {
              proc.x = 320;
              proc.y = 420;
            }
          }

          yield;
        }
      });

      // Laser Shot
      runtime.registerProcess("laser_shot", function* (proc, [sx, sy], rt) {
        proc.x = sx;
        proc.y = sy;
        proc.graph = 2;
        proc.size = 110;
        while (proc.y > -20) {
          proc.y -= 9;
          yield;
        }
      });

      // Alien
      runtime.registerProcess("alien", function* (proc, [sx, sy, variant = 1], rt) {
        proc.x = sx;
        proc.y = sy;
        proc.graph = variant === 1 ? 3 : 4;
        proc.size = 115;
        let dir = Math.random() > 0.5 ? 1 : -1;

        while (proc.y < rt.height + 30) {
          proc.y += 2.2;
          proc.x += dir * 2;
          if (proc.x < 30 || proc.x > rt.width - 30) dir = -dir;

          // Check hit
          const hit = rt.collision(proc, "laser_shot");
          if (hit) {
            rt.globalVars.score += 150;
            rt.sound(2, 70, 240);
            rt.spawn("explosion", [proc.x, proc.y]);
            rt.signal(hit, "s_kill");
            proc.isDead = true;
            return;
          }

          yield;
        }
      });

      // Asteroid
      runtime.registerProcess("asteroid", function* (proc, [sx, sy], rt) {
        proc.x = sx;
        proc.y = sy;
        proc.graph = 7;
        proc.size = 130;
        while (proc.y < rt.height + 40) {
          proc.y += 2.8;
          proc.angle += 3;

          const hit = rt.collision(proc, "laser_shot");
          if (hit) {
            rt.globalVars.score += 80;
            rt.sound(3, 75, 180);
            rt.spawn("explosion", [proc.x, proc.y]);
            rt.signal(hit, "s_kill");
            proc.isDead = true;
            return;
          }

          yield;
        }
      });

      // Explosion
      runtime.registerProcess("explosion", function* (proc, [ex, ey], rt) {
        proc.x = ex;
        proc.y = ey;
        for (let i = 0; i < 8; i++) {
          rt.spawn("particle", [ex, ey, rt.rand(0, 360), rt.rand(2, 5)]);
        }
        proc.graph = 5;
        yield;
        proc.graph = 6;
        yield;
        yield;
      });

      // Particle
      runtime.registerProcess("particle", function* (proc, [px, py, angle, spd], rt) {
        proc.x = px;
        proc.y = py;
        proc.angle = angle;
        proc.graph = 0;
        let life = 18;
        while (life > 0) {
          life--;
          rt.advance(proc, spd);
          rt.drawBox(proc.x, proc.y, proc.x + 2, proc.y + 2, "#f97316");
          yield;
        }
      });

      // Background stars & Spawner
      runtime.registerProcess("game_director", function* (proc, _, rt) {
        let timer = 0;
        // Background stars
        const stars: Array<{ x: number; y: number; speed: number }> = [];
        for (let i = 0; i < 45; i++) {
          stars.push({ x: rt.rand(0, rt.width), y: rt.rand(0, rt.height), speed: rt.rand(1, 3) });
        }

        while (true) {
          timer++;
          // Draw stars
          for (const s of stars) {
            s.y += s.speed;
            if (s.y > rt.height) {
              s.y = 0;
              s.x = rt.rand(0, rt.width);
            }
            rt.drawBox(s.x, s.y, s.x + 1, s.y + 1, s.speed > 2 ? "#94a3b8" : "#334155");
          }

          // Spawn aliens
          if (timer % 50 === 0) {
            rt.spawn("alien", [rt.rand(40, rt.width - 40), -20, rt.rand(1, 2)]);
          }
          if (timer % 130 === 0) {
            rt.spawn("asteroid", [rt.rand(40, rt.width - 40), -30]);
          }

          yield;
        }
      });

      // Initialize HUD & Entities
      runtime.write(1, 20, 25, 0, "GALAXY DEFENDER 3.0");
      runtime.writeInt(1, 20, 50, 0, "score");
      runtime.writeInt(1, 520, 50, 0, "lives");

      runtime.spawn("game_director");
      runtime.spawn("player", [320, 410]);
    },
  },

  // 2: Dungeon Runner (Platformer)
  {
    id: "platformer",
    name: "Pixel Knight Adventure",
    genre: "Retro Platformer",
    description: "Plataformas con caballero, saltos, gravedad, monedas de oro coleccionables y enemigos patrulla.",
    resolution: "640x480",
    code: `PROGRAM pixel_knight;

GLOBAL
  gold = 0;
  hp = 100;
  gravity = 0.6;

LOCAL
  speed = 4;
  vx = 0;
  vy = 0;
  on_ground = 0;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(15, 23, 42));

  write(1, 20, 30, 0, "PIXEL KNIGHT");
  write_int(1, 20, 60, 0, &gold);
  write_int(1, 520, 60, 0, &hp);

  create_level();
  knight(100, 350);

  LOOP
    FRAME;
  END
END

PROCESS knight(x, y)
BEGIN
  graph = 10; // Sprite del caballero
  size = 140;
  LOOP
    // Controles
    IF (key(_left) || key(_a))
      x -= speed;
      flags = 1; // Voltear sprite hacia la izquierda
    END
    IF (key(_right) || key(_d))
      x += speed;
      flags = 0; // Mirar a la derecha
    END

    // Salto
    IF ((key(_up) || key(_w) || key(_space)) && on_ground)
      vy = -12;
      on_ground = 0;
      sound(5, 70, 250); // Sonido salto
    END

    // Gravedad
    vy += gravity;
    y += vy;

    // Suelo
    IF (y >= 400)
      y = 400;
      vy = 0;
      on_ground = 1;
    END

    // Colisión con monedas
    IF (collision(type coin))
      gold += 10;
      sound(4, 90, 300); // Sonido moneda
      signal(collision(type coin), s_kill);
    END

    // Colisión con monstruos
    IF (collision(type slime))
      hp -= 10;
      sound(3, 80, 150);
      vy = -6;
    END

    FRAME;
  END
END

PROCESS coin(x, y)
BEGIN
  graph = 8;
  size = 110;
  LOOP
    angle += 5;
    FRAME;
  END
END

PROCESS slime(x, y, min_x, max_x)
PRIVATE
  dir = 1;
BEGIN
  graph = 3;
  size = 100;
  LOOP
    x += dir * 2;
    IF (x > max_x || x < min_x) dir = -dir; END
    FRAME;
  END
END
`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.reset();
      runtime.setResolution("640x480");
      runtime.backgroundColor = "#0f172a";
      runtime.globalVars.gold = 0;
      runtime.globalVars.hp = 100;

      // Knight process
      runtime.registerProcess("knight", function* (proc, [sx, sy], rt) {
        proc.x = sx ?? 100;
        proc.y = sy ?? 380;
        proc.graph = 10;
        proc.size = 130;
        let vy = 0;
        let onGround = false;

        while (true) {
          const speed = 4.2;
          if (rt.key("left") || rt.key("a")) {
            proc.x -= speed;
            proc.flags = 1; // Flip horizontal
          }
          if (rt.key("right") || rt.key("d")) {
            proc.x += speed;
            proc.flags = 0;
          }

          // Jump
          if ((rt.key("up") || rt.key("w") || rt.key("space")) && onGround) {
            vy = -12.5;
            onGround = false;
            rt.sound(5, 75, 260);
          }

          vy += 0.65; // Gravity
          proc.y += vy;

          // Ground floor collision
          if (proc.y >= 390) {
            proc.y = 390;
            vy = 0;
            onGround = true;
          }

          // Platform checks
          if (proc.x >= 220 && proc.x <= 420 && proc.y >= 290 && proc.y <= 310 && vy > 0) {
            proc.y = 295;
            vy = 0;
            onGround = true;
          }

          // Collect coins
          const coinHit = rt.collision(proc, "coin");
          if (coinHit) {
            rt.globalVars.gold = (rt.globalVars.gold || 0) + 25;
            rt.sound(4, 85, 320);
            rt.signal(coinHit, "s_kill");
          }

          // Enemy collision
          const enemyHit = rt.collision(proc, "slime");
          if (enemyHit) {
            rt.globalVars.hp = Math.max(0, (rt.globalVars.hp || 100) - 10);
            rt.sound(3, 80, 160);
            vy = -7;
            proc.x += proc.flags === 1 ? 25 : -25;
          }

          yield;
        }
      });

      // Coin
      runtime.registerProcess("coin", function* (proc, [cx, cy], rt) {
        proc.x = cx;
        proc.y = cy;
        proc.graph = 8;
        proc.size = 115;
        let t = 0;
        const baseY = cy;
        while (true) {
          t += 0.08;
          proc.y = baseY + Math.sin(t) * 4;
          yield;
        }
      });

      // Slime enemy
      runtime.registerProcess("slime", function* (proc, [sx, sy, minX, maxX], rt) {
        proc.x = sx;
        proc.y = sy;
        proc.graph = 3;
        proc.size = 105;
        let dir = 1;
        while (true) {
          proc.x += dir * 1.8;
          if (proc.x > maxX || proc.x < minX) {
            dir = -dir;
            proc.flags = dir === 1 ? 0 : 1;
          }
          yield;
        }
      });

      // Level scenery drawer
      runtime.registerProcess("level_scenery", function* (proc, _, rt) {
        while (true) {
          // Draw Ground
          rt.drawBox(0, 410, rt.width, rt.height, "#1e293b");
          rt.drawBox(0, 410, rt.width, 414, "#10b981");

          // Draw Platform
          rt.drawBox(220, 310, 420, 325, "#334155");
          rt.drawBox(220, 310, 420, 313, "#22c55e");
          yield;
        }
      });

      // HUD
      runtime.write(1, 20, 25, 0, "PIXEL KNIGHT ADVENTURE");
      runtime.writeInt(1, 20, 50, 0, "gold");
      runtime.writeInt(1, 520, 50, 0, "hp");

      runtime.spawn("level_scenery");
      runtime.spawn("knight", [100, 380]);
      runtime.spawn("coin", [280, 270]);
      runtime.spawn("coin", [320, 270]);
      runtime.spawn("coin", [360, 270]);
      runtime.spawn("coin", [500, 380]);
      runtime.spawn("slime", [260, 305, 230, 410]);
      runtime.spawn("slime", [450, 400, 350, 600]);
    },
  },

  // 3: Cyber Pong 3000
  {
    id: "cyber_pong",
    name: "Cyber Pong 3000",
    genre: "Arcade Retro",
    description: "El mítico arcade de raquetas reinventado en DIV Games Studio con física, CPU inteligente y estelares efectos retro.",
    resolution: "640x480",
    code: `PROGRAM cyber_pong;

GLOBAL
  score_p1 = 0;
  score_cpu = 0;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(11, 15, 25));

  write(1, 200, 40, 1, "CYBER PONG 3000");
  write_int(1, 250, 80, 1, &score_p1);
  write_int(1, 390, 80, 1, &score_cpu);

  paddle_player(40, 240);
  paddle_cpu(600, 240);
  ball(320, 240);

  LOOP
    // Línea central
    draw_line(320, 0, 320, 480, "#334155");
    FRAME;
  END
END

PROCESS paddle_player(x, y)
BEGIN
  graph = 12; // Raqueta
  LOOP
    IF (key(_up) || key(_w)) y -= 6; END
    IF (key(_down) || key(_s)) y += 6; END
    IF (y < 40) y = 40; END
    IF (y > 440) y = 440; END
    FRAME;
  END
END

PROCESS paddle_cpu(x, y)
PRIVATE
  target_y = 240;
BEGIN
  graph = 12;
  LOOP
    // IA que sigue la pelota
    IF (target_y > y + 5) y += 5; END
    IF (target_y < y - 5) y -= 5; END
    IF (y < 40) y = 40; END
    IF (y > 440) y = 440; END
    FRAME;
  END
END

PROCESS ball(x, y)
PRIVATE
  vx = 5;
  vy = 3;
BEGIN
  graph = 11; // Pelota cyber
  LOOP
    x += vx;
    y += vy;

    // Rebote superior e inferior
    IF (y < 15 || y > 465)
      vy = -vy;
      sound(7, 50, 400);
    END

    // Colisión con raquetas
    IF (collision(type paddle_player) || collision(type paddle_cpu))
      vx = -vx * 1.05; // Acelerar ligeramente
      sound(1, 70, 350);
    END

    // Punto para CPU
    IF (x < 0)
      score_cpu++;
      sound(3, 80, 200);
      x = 320;
      y = 240;
      vx = 5;
    END

    // Punto para Jugador
    IF (x > 640)
      score_p1++;
      sound(4, 90, 450);
      x = 320;
      y = 240;
      vx = -5;
    END

    FRAME;
  END
END
`,
    setupRuntime: (runtime: DivRuntime) => {
      runtime.reset();
      runtime.setResolution("640x480");
      runtime.backgroundColor = "#0b0f19";
      runtime.globalVars.score_p1 = 0;
      runtime.globalVars.score_cpu = 0;

      let ballY = 240;

      // Player Paddle
      runtime.registerProcess("paddle_player", function* (proc, [px, py], rt) {
        proc.x = px ?? 40;
        proc.y = py ?? 240;
        proc.graph = 12;
        proc.size = 110;
        while (true) {
          if (rt.key("up") || rt.key("w")) proc.y -= 6.5;
          if (rt.key("down") || rt.key("s")) proc.y += 6.5;
          proc.y = Math.max(40, Math.min(rt.height - 40, proc.y));
          yield;
        }
      });

      // CPU Paddle
      runtime.registerProcess("paddle_cpu", function* (proc, [px, py], rt) {
        proc.x = px ?? 600;
        proc.y = py ?? 240;
        proc.graph = 12;
        proc.size = 110;
        while (true) {
          if (ballY > proc.y + 6) proc.y += 5.2;
          else if (ballY < proc.y - 6) proc.y -= 5.2;
          proc.y = Math.max(40, Math.min(rt.height - 40, proc.y));
          yield;
        }
      });

      // Ball
      runtime.registerProcess("ball", function* (proc, [bx, by], rt) {
        proc.x = bx ?? 320;
        proc.y = by ?? 240;
        proc.graph = 11;
        proc.size = 130;
        let vx = Math.random() > 0.5 ? 5 : -5;
        let vy = 3;

        while (true) {
          proc.x += vx;
          proc.y += vy;
          ballY = proc.y;

          // Top/bottom bounce
          if (proc.y < 16 || proc.y > rt.height - 16) {
            vy = -vy;
            rt.sound(7, 50, 420);
          }

          // Paddle collision
          const hitPlayer = rt.collision(proc, "paddle_player");
          const hitCpu = rt.collision(proc, "paddle_cpu");

          if (hitPlayer && vx < 0) {
            vx = Math.abs(vx) * 1.04;
            rt.sound(1, 70, 360);
          }
          if (hitCpu && vx > 0) {
            vx = -Math.abs(vx) * 1.04;
            rt.sound(1, 70, 360);
          }

          // Goal CPU
          if (proc.x < -10) {
            rt.globalVars.score_cpu = (rt.globalVars.score_cpu || 0) + 1;
            rt.sound(3, 80, 180);
            proc.x = 320;
            proc.y = 240;
            vx = 5;
            vy = (Math.random() - 0.5) * 6;
          }

          // Goal Player
          if (proc.x > rt.width + 10) {
            rt.globalVars.score_p1 = (rt.globalVars.score_p1 || 0) + 1;
            rt.sound(4, 90, 480);
            proc.x = 320;
            proc.y = 240;
            vx = -5;
            vy = (Math.random() - 0.5) * 6;
          }

          yield;
        }
      });

      // Background field
      runtime.registerProcess("field", function* (proc, _, rt) {
        while (true) {
          for (let y = 0; y < rt.height; y += 20) {
            rt.drawBox(rt.width / 2 - 1, y, rt.width / 2 + 1, y + 10, "#1e293b");
          }
          yield;
        }
      });

      // HUD
      runtime.write(1, 230, 30, 1, "CYBER PONG");
      runtime.writeInt(1, 260, 65, 1, "score_p1");
      runtime.writeInt(1, 380, 65, 1, "score_cpu");

      runtime.spawn("field");
      runtime.spawn("paddle_player", [40, 240]);
      runtime.spawn("paddle_cpu", [600, 240]);
      runtime.spawn("ball", [320, 240]);
    },
  },

  // 4: DIV Super Kart 3D (Modo 7)
  {
    id: "mode7_kart",
    name: "DIV Super Kart 3D (Modo 7)",
    genre: "Carreras Semi-3D",
    description: "Juego de carreras pseudo-3D al estilo Super Mario Kart y F-Zero. Suelo en perspectiva Modo 7, karts rivales, derrapes, monedas de oro y árboles.",
    resolution: "640x480",
    code: `PROGRAM div_super_kart_3d;

GLOBAL
  score = 0;
  vueltas = 1;
  velocidad_kmh = 0;

LOCAL
  aceleracion = 0;
  angulo_giro = 0;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(10, 20, 45));

  // Iniciar perspectiva Modo 7 en el motor gráfico
  start_mode7(0, 0, 22, 0, 0, 0);

  // HUD de carreras
  write(1, 20, 25, 0, "DIV SUPER KART 3D - MODO 7");
  write(1, 20, 50, 0, "SCORE:");
  write_int(1, 75, 50, 0, &score);
  write(1, 20, 75, 0, "KM/H:");
  write_int(1, 70, 75, 0, &velocidad_kmh);
  write(1, 520, 25, 0, "VUELTA: 1/3");

  // Iniciar circuito y elementos
  generador_circuito();

  // Iniciar kart del jugador y vincularlo a la cámara Modo 7
  jugador_kart();

  // Karts rivales en pista
  rival_kart(370, 800, 21);
  rival_kart(430, 760, 21);

  LOOP
    FRAME;
  END
END

PROCESS jugador_kart()
PRIVATE
  vel = 0;
  max_vel = 12;
BEGIN
  graph = 20; // Kart Rojo Jugador
  ctype = c_m7;
  x = 400;
  y = 850;
  angle = 90;

  // Vincular cámara Modo 7 al jugador
  m7[0].camera = id;

  LOOP
    // Acelerar y Frenar
    IF (key(_up) || key(_w))
      IF (vel < max_vel) vel += 0.25; END
    ELSE
      IF (vel > 0) vel -= 0.12; END
    END
    IF (key(_down) || key(_s))
      IF (vel > -3) vel -= 0.35; END
    END

    // Girar con derrape
    IF (key(_left) || key(_a))
      angle -= (vel > 2) ? 3 : 2;
    END
    IF (key(_right) || key(_d))
      angle += (vel > 2) ? 3 : 2;
    END

    // Avance en el plano 3D
    xadvance(angle, vel);
    velocidad_kmh = vel * 12;

    FRAME;
  END
END

PROCESS rival_kart(x, y, graph)
PRIVATE
  vel = 8;
BEGIN
  ctype = c_m7;
  LOOP
    // IA de recorrido por el circuito
    angle += 1;
    xadvance(angle, vel);
    FRAME;
  END
END

PROCESS generador_circuito()
PRIVATE
  a, cx, cy;
BEGIN
  // Colocar árboles y monedas alrededor del circuito
  FOR (a = 0; a < 360; a += 15)
    cx = 400 + cos(a) * 395;
    cy = 400 + sin(a) * 395;
    arbol_3d(cx, cy);

    IF (a % 30 == 0)
      moneda_3d(400 + cos(a) * 320, 400 + sin(a) * 320);
    END
  END
END

PROCESS arbol_3d(x, y)
BEGIN
  graph = 22; // Árbol Modo 7
  ctype = c_m7;
  size = 110;
  LOOP
    FRAME;
  END
END

PROCESS moneda_3d(x, y)
BEGIN
  graph = 24; // Moneda dorada
  ctype = c_m7;
  size = 90;
  LOOP
    angle += 5;
    IF (collision(type jugador_kart))
      score += 100;
      sound(1, 90, 480);
      BREAK;
    END
    FRAME;
  END
END
`,
    setupRuntime: (runtime) => {
      runtime.reset();
      runtime.setResolution("640x480");
      runtime.start_mode7(0, 0, 22, 0, 0, 0);

      runtime.globalVars.score = 0;
      runtime.globalVars.velocidad_kmh = 0;
      runtime.globalVars.vueltas = 1;

      // Player Kart process
      runtime.registerProcess("jugador_kart", function* (proc, _, rt) {
        proc.graph = 20;
        proc.x = 400;
        proc.y = 850;
        proc.angle = 90;
        proc.ctype = 7;
        let vel = 0;
        const maxVel = 9.5;

        rt.m7[0].camera = proc.id;

        while (true) {
          const up = rt.key("up") || rt.key("w");
          const down = rt.key("down") || rt.key("s");
          const left = rt.key("left") || rt.key("a");
          const right = rt.key("right") || rt.key("d");
          const turbo = rt.key("space");

          if (up) {
            vel = Math.min(maxVel, vel + (turbo ? 0.35 : 0.18));
          } else {
            vel = Math.max(0, vel - 0.08);
          }
          if (down) {
            vel = Math.max(-2, vel - 0.25);
          }

          if (left) {
            proc.angle -= vel > 2 ? 3.5 : 2;
          }
          if (right) {
            proc.angle += vel > 2 ? 3.5 : 2;
          }

          const rad = (proc.angle * Math.PI) / 180;
          proc.x += Math.sin(rad) * vel;
          proc.y += Math.cos(rad) * vel;

          rt.globalVars.velocidad_kmh = Math.round(vel * 18);

          // Check collisions with coins
          for (const other of rt.processes.values()) {
            if (other.graph === 24 && !other.isDead) {
              const d = Math.hypot(proc.x - other.x, proc.y - other.y);
              if (d < 35) {
                other.isDead = true;
                rt.globalVars.score += 100;
                rt.sound(1, 80, 520);
              }
            }
          }

          yield;
        }
      });

      // Rival karts
      runtime.registerProcess("rival_kart", function* (proc, [initialAngle, speed, colorGraph], rt) {
        proc.graph = colorGraph || 21;
        proc.ctype = 7;
        let ang = initialAngle || 0;
        const radius = 320 + (Math.random() - 0.5) * 30;

        while (true) {
          ang += (speed || 1.2) * 0.4;
          const rad = (ang * Math.PI) / 180;
          proc.x = 400 + Math.cos(rad) * radius;
          proc.y = 400 + Math.sin(rad) * radius;
          proc.angle = ang + 90;
          yield;
        }
      });

      // Trees
      runtime.registerProcess("arbol_3d", function* (proc, [tx, ty], rt) {
        proc.graph = 22;
        proc.ctype = 7;
        proc.x = tx;
        proc.y = ty;
        while (true) {
          yield;
        }
      });

      // Coins
      runtime.registerProcess("moneda_3d", function* (proc, [cx, cy], rt) {
        proc.graph = 24;
        proc.ctype = 7;
        proc.x = cx;
        proc.y = cy;
        while (true) {
          yield;
        }
      });

      // Spawn track decoration and entities
      for (let a = 0; a < 360; a += 18) {
        const rad = (a * Math.PI) / 180;
        runtime.spawn("arbol_3d", [400 + Math.cos(rad) * 410, 400 + Math.sin(rad) * 410]);
        runtime.spawn("arbol_3d", [400 + Math.cos(rad) * 230, 400 + Math.sin(rad) * 230]);
        if (a % 36 === 0) {
          runtime.spawn("moneda_3d", [400 + Math.cos(rad) * 320, 400 + Math.sin(rad) * 320]);
        }
      }

      runtime.spawn("jugador_kart");
      runtime.spawn("rival_kart", [120, 1.4, 21]);
      runtime.spawn("rival_kart", [200, 1.2, 21]);

      runtime.write(1, 20, 20, 0, "DIV SUPER KART 3D [MODO 7]");
      runtime.writeInt(1, 20, 45, 0, "score");
      runtime.writeInt(1, 140, 45, 0, "velocidad_kmh");
      runtime.write(1, 20, 70, 0, "FLECHAS / WASD: Conducir | ESPACIO: Turbo");
    },
  },

  // 5: Dungeon Crypt 3D (Modo 8)
  {
    id: "mode8_dungeon",
    name: "Dungeon Crypt 3D (Modo 8)",
    genre: "Raycaster FPS 2.5D",
    description: "Motor 3D Raycasting al estilo Wolfenstein 3D y Catacomb 3D. Laberinto con paredes texturizadas, monstruos 3D, niebla, arma en primera persona y radar minimapa.",
    resolution: "640x480",
    code: `PROGRAM dungeon_crypt_3d;

GLOBAL
  score = 0;
  salud = 100;
  municion = 40;

BEGIN
  set_mode(m640x480);
  set_fps(60);

  // Iniciar motor de Raycasting Modo 8
  start_mode8(0, 0, 25, 0, 0, 0);

  // HUD inferior estilo retro
  write(1, 20, 20, 0, "DUNGEON CRYPT 3D - MODO 8");
  write(1, 20, 45, 0, "SALUD:");
  write_int(1, 80, 45, 0, &salud);
  write(1, 20, 70, 0, "MUNICION:");
  write_int(1, 100, 70, 0, &municion);
  write(1, 20, 95, 0, "SCORE:");
  write_int(1, 80, 95, 0, &score);
  write(1, 20, 120, 0, "[E] ABRIR PUERTA/DISPOSITIVO");

  // Iniciar jugador en primera persona
  jugador_fps();

  // Spawner de monstruos, antorchas y barriles en el mapa
  antorcha_3d(192, 192);
  antorcha_3d(448, 192);
  barril_3d(256, 320);
  barril_3d(512, 448);
  tesoro_3d(320, 576);

  demonio_slime(576, 256);
  demonio_slime(448, 640);

  LOOP
    FRAME;
  END
END

PROCESS jugador_fps()
PRIVATE
  vel = 3.5;
  rot_vel = 3;
BEGIN
  x = 224; // (3.5 * 64)
  y = 224;
  angle = 0;

  // Asignar cámara Modo 8 al jugador
  m8[0].camera = id;

  LOOP
    // Rotación de cámara
    IF (key(_left) || key(_a))  angle -= rot_vel; END
    IF (key(_right) || key(_d)) angle += rot_vel; END

    // Desplazamiento hacia delante / atrás
    IF (key(_up) || key(_w))
      x += cos(angle) * vel;
      y += sin(angle) * vel;
    END
    IF (key(_down) || key(_s))
      x -= cos(angle) * (vel * 0.7);
      y -= sin(angle) * (vel * 0.7);
    END

    // Disparo con el arma de plasma
    IF (key(_space) || key(_control) || mouse.left)
      IF (municion > 0)
        municion--;
        sound(1, 95, 520); // Disparo de plasma
        disparo_plasma(x, y, angle);
      END
    END

    // Abrir puertas e interactuar con dispositivos / interruptores
    IF (key(_e))
      interact_mode8();
    END

    FRAME;
  END
END

PROCESS demonio_slime(x, y)
PRIVATE
  vida = 3;
BEGIN
  graph = 27; // Monstruo Demonio / Slime 3D
  ctype = c_m8;
  size = 120;
  LOOP
    angle += 2;
    FRAME;
  END
END

PROCESS antorcha_3d(x, y)
BEGIN
  graph = 28; // Antorcha de pared con fuego
  ctype = c_m8;
  size = 100;
  LOOP
    FRAME;
  END
END

PROCESS barril_3d(x, y)
BEGIN
  graph = 29; // Barril de madera
  ctype = c_m8;
  size = 110;
  LOOP
    FRAME;
  END
END

PROCESS tesoro_3d(x, y)
BEGIN
  graph = 24; // Tesoro / Moneda
  ctype = c_m8;
  size = 90;
  LOOP
    FRAME;
  END
END
`,
    setupRuntime: (runtime) => {
      runtime.reset();
      runtime.setResolution("640x480");
      runtime.start_mode8(0, 0, 25, 0, 0, 0);

      runtime.globalVars.score = 0;
      runtime.globalVars.salud = 100;
      runtime.globalVars.municion = 40;

      // Player FPS Process
      runtime.registerProcess("jugador_fps", function* (proc, _, rt) {
        proc.x = 224; // 3.5 * 64
        proc.y = 224;
        proc.angle = 0;
        rt.m8[0].camera = proc.id;
        let cooldown = 0;

        while (true) {
          const up = rt.key("up") || rt.key("w");
          const down = rt.key("down") || rt.key("s");
          const left = rt.key("left") || rt.key("a");
          const right = rt.key("right") || rt.key("d");
          const shoot = rt.key("space") || rt.key("control") || rt.mouseState.left;

          if (left) proc.angle -= 3;
          if (right) proc.angle += 3;

          const rad = (proc.angle * Math.PI) / 180;
          const dirX = Math.cos(rad);
          const dirY = Math.sin(rad);

          const moveSpeed = 3.8;
          let nextX = proc.x;
          let nextY = proc.y;

          if (up) {
            nextX += dirX * moveSpeed;
            nextY += dirY * moveSpeed;
          }
          if (down) {
            nextX -= dirX * (moveSpeed * 0.7);
            nextY -= dirY * (moveSpeed * 0.7);
          }

          // Grid wall collision check
          const map = rt.m8[0].map;
          const gridX = Math.floor(nextX / 64);
          const gridY = Math.floor(nextY / 64);

          if (map && map[gridY] && map[gridY][gridX] === 0) {
            proc.x = nextX;
            proc.y = nextY;
          }

          // Shooting plasma weapon
          if (cooldown > 0) cooldown--;
          if (shoot && cooldown === 0 && rt.globalVars.municion > 0) {
            rt.globalVars.municion--;
            cooldown = 14;
            rt.sound(1, 90, 520);

            // Hitscan check against demons
            for (const other of rt.processes.values()) {
              if (other.graph === 27 && !other.isDead) {
                const edx = other.x - proc.x;
                const edy = other.y - proc.y;
                const dist = Math.hypot(edx, edy);
                const enemyAngle = (Math.atan2(edy, edx) * 180) / Math.PI;
                let diff = (enemyAngle - proc.angle + 360) % 360;
                if (diff > 180) diff -= 360;

                if (Math.abs(diff) < 18 && dist < 450) {
                  other.isDead = true;
                  rt.globalVars.score += 250;
                  rt.sound(2, 90, 220);
                }
              }
            }
          }

          yield;
        }
      });

      // Monster Demon Slime
      runtime.registerProcess("demonio_slime", function* (proc, [mx, my], rt) {
        proc.graph = 27;
        proc.ctype = 8;
        proc.x = mx;
        proc.y = my;
        let step = 0;

        while (true) {
          step++;
          proc.y += Math.sin(step * 0.05) * 0.5;
          yield;
        }
      });

      // 3D Objects
      runtime.registerProcess("antorcha_3d", function* (proc, [tx, ty], rt) {
        proc.graph = 28;
        proc.ctype = 8;
        proc.x = tx;
        proc.y = ty;
        while (true) {
          yield;
        }
      });

      runtime.registerProcess("barril_3d", function* (proc, [bx, by], rt) {
        proc.graph = 29;
        proc.ctype = 8;
        proc.x = bx;
        proc.y = by;
        while (true) {
          yield;
        }
      });

      runtime.registerProcess("tesoro_3d", function* (proc, [gx, gy], rt) {
        proc.graph = 24;
        proc.ctype = 8;
        proc.x = gx;
        proc.y = gy;
        while (true) {
          yield;
        }
      });

      // Spawn entities in the dungeon
      runtime.spawn("jugador_fps");
      runtime.spawn("demonio_slime", [576, 256]);
      runtime.spawn("demonio_slime", [448, 640]);
      runtime.spawn("demonio_slime", [700, 400]);
      runtime.spawn("antorcha_3d", [192, 192]);
      runtime.spawn("antorcha_3d", [448, 192]);
      runtime.spawn("antorcha_3d", [704, 384]);
      runtime.spawn("barril_3d", [256, 320]);
      runtime.spawn("barril_3d", [512, 448]);
      runtime.spawn("tesoro_3d", [320, 576]);
      runtime.spawn("tesoro_3d", [768, 640]);

      runtime.write(1, 20, 20, 0, "DUNGEON CRYPT 3D [MODO 8]");
      runtime.writeInt(1, 20, 45, 0, "salud");
      runtime.writeInt(1, 110, 45, 0, "municion");
      runtime.writeInt(1, 210, 45, 0, "score");
      runtime.write(1, 20, 70, 0, "WASD / FLECHAS: Moverse | ESPACIO / CLICK: Disparar");
    },
  },
];
