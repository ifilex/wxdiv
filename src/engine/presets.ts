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
  fpg_nave = 0;
  fnt_retro = 0;
  snd_laser = 0;
  snd_explosion = 0;
  snd_hit = 0;
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

  // Cargar librerías FPG, FNT y sonidos WAV (DIV Games Studio)
  fpg_nave = load_fpg("galaxy.fpg");
  fnt_retro = load_fnt("arcade.fnt");
  snd_laser = load_wav("laser.wav");
  snd_explosion = load_wav("explosion.wav");
  snd_hit = load_wav("hit.wav");

  write(fnt_retro, 20, 30, 0, "GALAXY DEFENDER 3.0");
  write_int(fnt_retro, 20, 60, 0, &score);
  write_int(fnt_retro, 520, 60, 0, &lives);

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
  file = fpg_nave;
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
      sound(snd_laser, 80, 300); // Sonido láser cargado previamente
      cooldown = 12;
    END

    // Colisión con enemigos
    IF (collision(type alien) || collision(type asteroid))
      explosion(x, y);
      sound(snd_explosion, 100, 200); // Explosión cargada
      lives--;
      IF (lives <= 0)
        write(fnt_retro, 260, 240, 1, "GAME OVER");
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
  file = fpg_nave;
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
  file = fpg_nave;
  graph = (variant == 1) ? 3 : 4; // Alien 1 o 2
  size = 120;
  LOOP
    y += 2;
    x += vx * dir;
    IF (x > 600 || x < 40) dir = -dir; END

    // Detección de impacto de disparo
    IF (collision(type laser_shot))
      score += 150;
      sound(snd_explosion, 70, 250);
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
  file = fpg_nave;
  graph = 7; // Asteroide
  size = 140;
  LOOP
    y += 3;
    angle += 4;
    IF (collision(type laser_shot))
      score += 80;
      sound(snd_hit, 80, 180);
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
  file = fpg_nave;
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
      const fpgId = runtime.load_fpg("galaxy.fpg");
      const fontId = runtime.load_fnt("arcade.fnt");
      const sndLaser = runtime.load_wav("laser.wav");
      const sndExplosion = runtime.load_wav("explosion.wav");
      const sndHit = runtime.load_wav("hit.wav");
      runtime.globalVars.fpg_nave = fpgId;
      runtime.globalVars.fnt_retro = fontId;
      runtime.globalVars.snd_laser = sndLaser;
      runtime.globalVars.snd_explosion = sndExplosion;
      runtime.globalVars.snd_hit = sndHit;
      runtime.globalVars.score = 0;
      runtime.globalVars.lives = 3;

      // Register Processes
      // Player
      runtime.registerProcess("player", function* (proc, [startX, startY], rt) {
        proc.file = fpgId;
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
            rt.sound(sndLaser, 70, 300);
            cooldown = 12;
          }

          // Collisions
          const enemyHit = rt.collision(proc, "alien") || rt.collision(proc, "asteroid");
          if (enemyHit) {
            rt.spawn("explosion", [proc.x, proc.y]);
            rt.sound(sndExplosion, 90, 180);
            rt.globalVars.lives--;
            if (rt.globalVars.lives <= 0) {
              rt.write(fontId, rt.width / 2 - 50, rt.height / 2, 1, "¡GAME OVER!");
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
        proc.file = fpgId;
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
        proc.file = fpgId;
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
            rt.sound(sndExplosion, 70, 240);
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
        proc.file = fpgId;
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
            rt.sound(sndHit, 75, 180);
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
        proc.file = fpgId;
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
      runtime.write(fontId, 20, 25, 0, "GALAXY DEFENDER 3.0");
      runtime.writeInt(fontId, 20, 50, 0, "score");
      runtime.writeInt(fontId, 520, 50, 0, "lives");

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
  fpg_knight = 0;
  fnt_pixel = 0;
  snd_salto = 0;
  snd_moneda = 0;
  snd_herido = 0;
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

  // Carga explícita de sprites FPG, fuentes FNT y sonidos WAV (DIV Games Studio)
  fpg_knight = load_fpg("knight.fpg");
  fnt_pixel = load_fnt("medieval.fnt");
  snd_salto = load_wav("salto.wav");
  snd_moneda = load_wav("moneda.wav");
  snd_herido = load_wav("golpe.wav");

  write(fnt_pixel, 20, 30, 0, "PIXEL KNIGHT");
  write_int(fnt_pixel, 20, 60, 0, &gold);
  write_int(fnt_pixel, 520, 60, 0, &hp);

  create_level();
  knight(100, 350);

  LOOP
    FRAME;
  END
END

PROCESS knight(x, y)
BEGIN
  file = fpg_knight;
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
      sound(snd_salto, 70, 250); // Sonido salto cargado
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
      sound(snd_moneda, 90, 300); // Sonido moneda cargado
      signal(collision(type coin), s_kill);
    END

    // Colisión con monstruos
    IF (collision(type slime))
      hp -= 10;
      sound(snd_herido, 80, 150);
      vy = -6;
    END

    FRAME;
  END
END

PROCESS coin(x, y)
BEGIN
  file = fpg_knight;
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
  file = fpg_knight;
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
      const fpgId = runtime.load_fpg("knight.fpg");
      const fontId = runtime.load_fnt("medieval.fnt");
      const sndSalto = runtime.load_wav("salto.wav");
      const sndMoneda = runtime.load_wav("moneda.wav");
      const sndHerido = runtime.load_wav("golpe.wav");
      runtime.globalVars.fpg_knight = fpgId;
      runtime.globalVars.fnt_pixel = fontId;
      runtime.globalVars.snd_salto = sndSalto;
      runtime.globalVars.snd_moneda = sndMoneda;
      runtime.globalVars.snd_herido = sndHerido;
      runtime.globalVars.gold = 0;
      runtime.globalVars.hp = 100;

      // Knight process
      runtime.registerProcess("knight", function* (proc, [sx, sy], rt) {
        proc.file = fpgId;
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
            rt.sound(sndSalto, 75, 260);
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
            rt.sound(sndMoneda, 85, 320);
            rt.signal(coinHit, "s_kill");
          }

          // Enemy collision
          const enemyHit = rt.collision(proc, "slime");
          if (enemyHit) {
            rt.globalVars.hp = Math.max(0, (rt.globalVars.hp || 100) - 10);
            rt.sound(sndHerido, 80, 160);
            vy = -7;
            proc.x += proc.flags === 1 ? 25 : -25;
          }

          yield;
        }
      });

      // Coin
      runtime.registerProcess("coin", function* (proc, [cx, cy], rt) {
        proc.file = fpgId;
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
        proc.file = fpgId;
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
      runtime.write(fontId, 20, 25, 0, "PIXEL KNIGHT ADVENTURE");
      runtime.writeInt(fontId, 20, 50, 0, "gold");
      runtime.writeInt(fontId, 520, 50, 0, "hp");

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
  fpg_pong = 0;
  fnt_cyber = 0;
  snd_pala = 0;
  snd_rebote = 0;
  snd_gol = 0;
  score_p1 = 0;
  score_cpu = 0;

BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(11, 15, 25));

  // Carga explícita de recursos gráficos, fuentes y sonidos (DIV Games Studio)
  fpg_pong = load_fpg("cyber_pong.fpg");
  fnt_cyber = load_fnt("digital.fnt");
  snd_pala = load_wav("paddle.wav");
  snd_rebote = load_wav("bounce.wav");
  snd_gol = load_wav("goal.wav");

  write(fnt_cyber, 200, 40, 1, "CYBER PONG 3000");
  write_int(fnt_cyber, 250, 80, 1, &score_p1);
  write_int(fnt_cyber, 390, 80, 1, &score_cpu);

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
  file = fpg_pong;
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
  file = fpg_pong;
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
  file = fpg_pong;
  graph = 11; // Pelota cyber
  LOOP
    x += vx;
    y += vy;

    // Rebote superior e inferior
    IF (y < 15 || y > 465)
      vy = -vy;
      sound(snd_rebote, 50, 400);
    END

    // Colisión con raquetas
    IF (collision(type paddle_player) || collision(type paddle_cpu))
      vx = -vx * 1.05; // Acelerar ligeramente
      sound(snd_pala, 70, 350);
    END

    // Punto para CPU
    IF (x < 0)
      score_cpu++;
      sound(snd_gol, 80, 200);
      x = 320;
      y = 240;
      vx = 5;
    END

    // Punto para Jugador
    IF (x > 640)
      score_p1++;
      sound(snd_gol, 90, 450);
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
      const fpgId = runtime.load_fpg("cyber_pong.fpg");
      const fontId = runtime.load_fnt("digital.fnt");
      const sndPala = runtime.load_wav("paddle.wav");
      const sndRebote = runtime.load_wav("bounce.wav");
      const sndGol = runtime.load_wav("goal.wav");
      runtime.globalVars.fpg_pong = fpgId;
      runtime.globalVars.fnt_cyber = fontId;
      runtime.globalVars.snd_pala = sndPala;
      runtime.globalVars.snd_rebote = sndRebote;
      runtime.globalVars.snd_gol = sndGol;
      runtime.globalVars.score_p1 = 0;
      runtime.globalVars.score_cpu = 0;

      let ballY = 240;

      // Player Paddle
      runtime.registerProcess("paddle_player", function* (proc, [px, py], rt) {
        proc.file = fpgId;
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
        proc.file = fpgId;
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
        proc.file = fpgId;
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
            rt.sound(sndRebote, 50, 420);
          }

          // Paddle collision
          const hitPlayer = rt.collision(proc, "paddle_player");
          const hitCpu = rt.collision(proc, "paddle_cpu");

          if (hitPlayer && vx < 0) {
            vx = Math.abs(vx) * 1.04;
            rt.sound(sndPala, 70, 360);
          }
          if (hitCpu && vx > 0) {
            vx = -Math.abs(vx) * 1.04;
            rt.sound(sndPala, 70, 360);
          }

          // Goal CPU
          if (proc.x < -10) {
            rt.globalVars.score_cpu = (rt.globalVars.score_cpu || 0) + 1;
            rt.sound(sndGol, 80, 180);
            proc.x = 320;
            proc.y = 240;
            vx = 5;
            vy = (Math.random() - 0.5) * 6;
          }

          // Goal Player
          if (proc.x > rt.width + 10) {
            rt.globalVars.score_p1 = (rt.globalVars.score_p1 || 0) + 1;
            rt.sound(sndGol, 90, 480);
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
      runtime.write(fontId, 230, 30, 1, "CYBER PONG");
      runtime.writeInt(fontId, 260, 65, 1, "score_p1");
      runtime.writeInt(fontId, 380, 65, 1, "score_cpu");

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
  fpg_kart = 0;
  fnt_kart = 0;
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

  // Carga explícita de sprites FPG y fuentes FNT (DIV Games Studio)
  fpg_kart = load_fpg("karts.fpg");
  fnt_kart = load_fnt("racing.fnt");

  // Iniciar perspectiva Modo 7 en el motor gráfico
  start_mode7(0, 0, 22, 0, 0, 0);

  // HUD de carreras
  write(fnt_kart, 20, 25, 0, "DIV SUPER KART 3D - MODO 7");
  write(fnt_kart, 20, 50, 0, "SCORE:");
  write_int(fnt_kart, 75, 50, 0, &score);
  write(fnt_kart, 20, 75, 0, "KM/H:");
  write_int(fnt_kart, 70, 75, 0, &velocidad_kmh);
  write(fnt_kart, 520, 25, 0, "VUELTA: 1/3");

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
  file = fpg_kart;
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
  file = fpg_kart;
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
  file = fpg_kart;
  graph = 22; // Árbol Modo 7
  ctype = c_m7;
  size = 110;
  LOOP
    FRAME;
  END
END

PROCESS moneda_3d(x, y)
BEGIN
  file = fpg_kart;
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
      const fpgId = runtime.load_fpg("karts.fpg");
      const fontId = runtime.load_fnt("racing.fnt");
      runtime.globalVars.fpg_kart = fpgId;
      runtime.globalVars.fnt_kart = fontId;
      runtime.start_mode7(0, 0, 22, 0, 0, 0);

      runtime.globalVars.score = 0;
      runtime.globalVars.velocidad_kmh = 0;
      runtime.globalVars.vueltas = 1;

      // Player Kart process
      runtime.registerProcess("jugador_kart", function* (proc, _, rt) {
        proc.file = fpgId;
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
        proc.file = fpgId;
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
        proc.file = fpgId;
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
        proc.file = fpgId;
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

      runtime.write(fontId, 20, 20, 0, "DIV SUPER KART 3D [MODO 7]");
      runtime.writeInt(fontId, 20, 45, 0, "score");
      runtime.writeInt(fontId, 140, 45, 0, "velocidad_kmh");
      runtime.write(fontId, 20, 70, 0, "FLECHAS / WASD: Conducir | ESPACIO: Turbo");
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
  fpg_dungeon = 0;
  fnt_hud = 0;
  score = 0;
  salud = 100;
  municion = 40;

BEGIN
  set_mode(m640x480);
  set_fps(60);

  // Carga explícita de sprites FPG y fuentes FNT (DIV Games Studio)
  fpg_dungeon = load_fpg("dungeon.fpg");
  fnt_hud = load_fnt("gothic.fnt");

  // Iniciar motor de Raycasting Modo 8
  start_mode8(0, 0, 25, 0, 0, 0);

  // HUD inferior estilo retro
  write(fnt_hud, 20, 20, 0, "DUNGEON CRYPT 3D - MODO 8");
  write(fnt_hud, 20, 45, 0, "SALUD:");
  write_int(fnt_hud, 80, 45, 0, &salud);
  write(fnt_hud, 20, 70, 0, "MUNICION:");
  write_int(fnt_hud, 100, 70, 0, &municion);
  write(fnt_hud, 20, 95, 0, "SCORE:");
  write_int(fnt_hud, 80, 95, 0, &score);
  write(fnt_hud, 20, 120, 0, "[E] ABRIR PUERTA/DISPOSITIVO");

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
  file = fpg_dungeon;
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
  file = fpg_dungeon;
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
  file = fpg_dungeon;
  graph = 28; // Antorcha de pared con fuego
  ctype = c_m8;
  size = 100;
  LOOP
    FRAME;
  END
END

PROCESS barril_3d(x, y)
BEGIN
  file = fpg_dungeon;
  graph = 29; // Barril de madera
  ctype = c_m8;
  size = 110;
  LOOP
    FRAME;
  END
END

PROCESS tesoro_3d(x, y)
BEGIN
  file = fpg_dungeon;
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
      const fpgId = runtime.load_fpg("dungeon.fpg");
      const fontId = runtime.load_fnt("gothic.fnt");
      runtime.globalVars.fpg_dungeon = fpgId;
      runtime.globalVars.fnt_hud = fontId;
      runtime.start_mode8(0, 0, 25, 0, 0, 0);

      runtime.globalVars.score = 0;
      runtime.globalVars.salud = 100;
      runtime.globalVars.municion = 40;

      // Player FPS Process
      runtime.registerProcess("jugador_fps", function* (proc, _, rt) {
        proc.file = fpgId;
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
        proc.file = fpgId;
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
        proc.file = fpgId;
        proc.graph = 28;
        proc.ctype = 8;
        proc.x = tx;
        proc.y = ty;
        while (true) {
          yield;
        }
      });

      runtime.registerProcess("barril_3d", function* (proc, [bx, by], rt) {
        proc.file = fpgId;
        proc.graph = 29;
        proc.ctype = 8;
        proc.x = bx;
        proc.y = by;
        while (true) {
          yield;
        }
      });

      runtime.registerProcess("tesoro_3d", function* (proc, [gx, gy], rt) {
        proc.file = fpgId;
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

      runtime.write(fontId, 20, 20, 0, "DUNGEON CRYPT 3D [MODO 8]");
      runtime.writeInt(fontId, 20, 45, 0, "salud");
      runtime.writeInt(fontId, 110, 45, 0, "municion");
      runtime.writeInt(fontId, 210, 45, 0, "score");
      runtime.write(fontId, 20, 70, 0, "WASD / FLECHAS: Moverse | ESPACIO / CLICK: Disparar");
    },
  },
  // 9: Hexen / GZDoom Hybrid 3D Citadel
  {
    id: "hexen_citadel_3d",
    name: "Hexen Citadel 3D (Híbrido AAA)",
    genre: "Acción RPG 3D Híbrido",
    description: "Modo 8 avanzado estilo Hexen y GZDoom. Ray tracing dinámico, alturas de sectores, fosas de lava con partículas de fluidos, modelos 3D MD2/MD3 y voxels giratorios.",
    resolution: "640x480",
    code: `PROGRAM hexen_citadel_3d;

GLOBAL
  fpg_dungeon = 0;
  fnt_hud = 0;
  salud = 100;
  mana = 75;
  score = 0;

BEGIN
  set_mode(m640x480);
  set_fps(60);

  fpg_dungeon = load_fpg("dungeon.fpg");
  fnt_hud = load_fnt("gothic.fnt");

  // Iniciar Motor Modo 8 Híbrido Hexen / GZDoom
  start_mode8_hybrid(0, 26, 25, 25);
  m8_raytracing(true);

  // Configurar sectores con alturas variables y fosas de lava (Hexen)
  m8_set_sector(7, 7, 0.6, 3.2, 26, 26, 1.2, "none");
  m8_set_sector(8, 7, 0.6, 3.2, 26, 26, 1.2, "none");
  m8_set_sector(7, 8, 0.6, 3.2, 26, 26, 1.2, "none");
  m8_set_sector(8, 8, 0.6, 3.2, 26, 26, 1.2, "none");

  // Fosas de lava ardiente con simulación de partículas
  m8_set_fluid(4, 7, fluid_lava);
  m8_set_fluid(5, 7, fluid_lava);
  m8_set_fluid(10, 7, fluid_lava);
  m8_set_fluid(11, 7, fluid_lava);

  // Luces puntuales dinámicas con sombras ray-traced
  m8_add_light(7.5, 7.5, 1.5, 6.5, 255, 160, 50, true, true);
  m8_add_light(3.5, 3.5, 0.8, 4.5, 50, 180, 255, false, true);

  // Modelos 3D MD2 / MD3
  m8_add_model("md2_knight", 7.5, 7.5, 0.6, 180, "idle", 1.1);
  m8_add_model("md3_pillar", 5.5, 5.5, 0.0, 0, "idle", 1.2);
  m8_add_model("md3_pillar", 10.5, 5.5, 0.0, 0, "idle", 1.2);

  // Objetos Voxel 3D interactivos giratorios
  m8_add_voxel("vox_potion", 6.5, 8.5, 0.7, 1.0, 3.0);
  m8_add_voxel("vox_skull", 8.5, 8.5, 0.7, 0.9, 2.0);

  // HUD
  write(fnt_hud, 20, 20, 0, "HEXEN CITADEL 3D [MODO 8 HIBRIDO]");
  write(fnt_hud, 20, 45, 0, "SALUD:");
  write_int(fnt_hud, 80, 45, 0, &salud);
  write(fnt_hud, 20, 70, 0, "MANA:");
  write_int(fnt_hud, 75, 70, 0, &mana);

  jugador_hexen();

  LOOP
    FRAME;
  END
END

PROCESS jugador_hexen()
PRIVATE
  vel = 3.8;
  rot_vel = 3.2;
BEGIN
  file = fpg_dungeon;
  x = 224; // (3.5 * 64)
  y = 224;
  angle = 0;

  m8[0].camera = id;

  LOOP
    IF (key(_left) || key(_a))  angle -= rot_vel; END
    IF (key(_right) || key(_d)) angle += rot_vel; END
    IF (key(_up) || key(_w))
      x += cos(angle) * vel;
      y += sin(angle) * vel;
    END
    IF (key(_down) || key(_s))
      x -= cos(angle) * (vel * 0.7);
      y -= sin(angle) * (vel * 0.7);
    END
    IF (key(_e))
      interact_mode8();
    END
    FRAME;
  END
END;
`,
    setupRuntime: (runtime) => {
      runtime.reset();
      runtime.setResolution("640x480");
      const fpgId = runtime.load_fpg("dungeon.fpg");
      const fontId = runtime.load_fnt("gothic.fnt");
      runtime.globalVars.fpg_dungeon = fpgId;
      runtime.globalVars.fnt_hud = fontId;
      runtime.globalVars.salud = 100;
      runtime.globalVars.mana = 75;
      runtime.globalVars.score = 0;

      // Start hybrid Mode 8 with ray tracing & fluids
      runtime.start_mode8_hybrid(0, 26, 25, 25);
      runtime.m8_raytracing(true);

      // Setup sectors with heights
      runtime.m8_set_sector(7, 7, 0.6, 3.2, 26, 26, 1.2, "none");
      runtime.m8_set_sector(8, 7, 0.6, 3.2, 26, 26, 1.2, "none");
      runtime.m8_set_sector(7, 8, 0.6, 3.2, 26, 26, 1.2, "none");
      runtime.m8_set_sector(8, 8, 0.6, 3.2, 26, 26, 1.2, "none");

      // Fluids
      runtime.m8_set_fluid(4, 7, "lava");
      runtime.m8_set_fluid(5, 7, "lava");
      runtime.m8_set_fluid(10, 7, "lava");
      runtime.m8_set_fluid(11, 7, "lava");

      // Dynamic lights
      runtime.m8_add_light(7.5, 7.5, 1.5, 6.5, 255, 160, 50, true, true);
      runtime.m8_add_light(3.5, 3.5, 0.8, 4.5, 50, 180, 255, false, true);

      // 3D Models
      runtime.m8_add_model("md2_knight", 7.5, 7.5, 0.6, 180, "idle", 1.1);
      runtime.m8_add_model("md3_pillar", 5.5, 5.5, 0.0, 0, "idle", 1.2);
      runtime.m8_add_model("md3_pillar", 10.5, 5.5, 0.0, 0, "idle", 1.2);

      // 3D Voxels
      runtime.m8_add_voxel("vox_potion", 6.5, 8.5, 0.7, 1.0, 3.0);
      runtime.m8_add_voxel("vox_skull", 8.5, 8.5, 0.7, 0.9, 2.0);

      // Player process
      runtime.registerProcess("jugador_hexen", function* (proc, _, rt) {
        proc.file = fpgId;
        proc.x = 224;
        proc.y = 224;
        proc.angle = 0;
        rt.m8[0].camera = proc.id;

        while (true) {
          const left = rt.isKeyDown("ArrowLeft") || rt.isKeyDown("KeyA");
          const right = rt.isKeyDown("ArrowRight") || rt.isKeyDown("KeyD");
          const up = rt.isKeyDown("ArrowUp") || rt.isKeyDown("KeyW");
          const down = rt.isKeyDown("ArrowDown") || rt.isKeyDown("KeyS");

          if (left) proc.angle = (proc.angle - 3.2 + 360) % 360;
          if (right) proc.angle = (proc.angle + 3.2) % 360;

          const rad = (proc.angle * Math.PI) / 180;
          if (up) {
            proc.x += Math.cos(rad) * 3.8;
            proc.y += Math.sin(rad) * 3.8;
          }
          if (down) {
            proc.x -= Math.cos(rad) * 2.6;
            proc.y -= Math.sin(rad) * 2.6;
          }

          if (rt.isKeyDown("KeyE")) {
            rt.interact_mode8();
          }

          yield;
        }
      });

      runtime.spawn("jugador_hexen");

      runtime.write(fontId, 20, 20, 0, "HEXEN CITADEL 3D [MODO 8 HIBRIDO]");
      runtime.writeInt(fontId, 20, 45, 0, "salud");
      runtime.writeInt(fontId, 95, 45, 0, "mana");
      runtime.write(fontId, 20, 70, 0, "WASD: Moverse | E: Interactuar | HIBRIDO 3D RAY TRACING");
    },
  },
  // 10: DIV 2 Modo 8 Raycasting nativo (.WLD, .FMP, load_pal)
  {
    id: "div2_modo8_raycast",
    name: "Modo 8 DIV 2 (start_raycast .WLD)",
    genre: "Raycasting 3D DIV2 Clásico / Híbrido",
    description: "Sintaxis estándar DIV Games Studio 2: start_raycast(archivo_wld, archivo_fmp, ambient_light), load_pal, advance, xadvance y control de cámara.",
    resolution: "320x200",
    code: `PROGRAM Ejemplo_Modo8;

PRIVATE
    camara_id = 0;

BEGIN
    // Inicializar modo gráfico de 320x200 a 256 colores
    set_mode(m320x200);

    // Cargar la paleta correspondiente al entorno 3D
    load_pal("mundo.pal");

    // Iniciar el sistema de Raycasting / Modo 8 con un archivo .wld
    // start_raycast(archivo_wld, archivo_fmp_texturas, ambient_light)
    start_raycast("nivel1.wld", "texturas.fmp", 16);

    // Lanzar proceso del jugador o control de cámara
    camara_id = 1; // ID o proceso que gobierna la posición X, Y, Z y ángulo (angle)

    LOOP
        // Control de movimiento básico de la cámara con colisiones
        if (key(_up))    advance(4);  end;
        if (key(_down))  advance(-4); end;
        if (key(_left))  angle += 1000; end;
        if (key(_right)) angle -= 1000; end;

        if (key(_q))     xadvance(4, 90000);  end;
        if (key(_e))     xadvance(4, -90000); end;

        FRAME;
    END

ONEXIT
    stop_raycast();
END
`,
    setupRuntime: (runtime) => {
      runtime.reset();
      runtime.setResolution("320x200");
      runtime.load_pal("mundo.pal");
      runtime.start_raycast("nivel1.wld", "texturas.fmp", 16);
      runtime.camara_id = 1;

      // Register camera/player controller process
      runtime.registerProcess("camara_proceso", function* (proc, _, rt) {
        proc.id = 1;
        proc.x = 3.5;
        proc.y = 3.5;
        proc.z = 0;
        proc.angle = 0;

        while (true) {
          const up = rt.isKeyDown("ArrowUp") || rt.isKeyDown("KeyW");
          const down = rt.isKeyDown("ArrowDown") || rt.isKeyDown("KeyS");
          const left = rt.isKeyDown("ArrowLeft") || rt.isKeyDown("KeyA");
          const right = rt.isKeyDown("ArrowRight") || rt.isKeyDown("KeyD");
          const strafeL = rt.isKeyDown("KeyQ");
          const strafeR = rt.isKeyDown("KeyE");

          if (left) proc.angle = (proc.angle - 3.2 + 360) % 360;
          if (right) proc.angle = (proc.angle + 3.2) % 360;

          if (up) rt.advance(4, proc);
          if (down) rt.advance(-4, proc);
          if (strafeL) rt.xadvance(4, 90, proc);
          if (strafeR) rt.xadvance(4, -90, proc);

          if (rt.isKeyDown("Space")) {
            rt.interact_mode8();
          }

          yield;
        }
      });

      runtime.spawn("camara_proceso");
    },
  },
  // 11: Modo 8 Cripta Maldita 3D - MD2 Modelos, Workers y Texturas Oscuras
  {
    id: "modo8_dark_md2_workers",
    name: "Cripta Maldita 3D (MD2 + Workers + Texturas Oscuras)",
    genre: "Acción 3D Gothic Doom / Hexen",
    description: "Nuevo motor Modo 8 optimizado con Web Workers paralelos, modelos 3D MD2 para enemigos (Demonio Titán, Gárgolas), objetos (Cáliz Sagrado, Cofre), arma 3D en primera persona (Espada Rúnica) y nuevas texturas oscuras de obsidiana, calaveras, basalto rúnico y vitrales.",
    resolution: "640x480",
    code: `PROGRAM Cripta_Maldita_3D;

GLOBAL
    fpg_juego = 0;
    fnt_gotica = 0;
    vida_jugador = 100;
    almas_recolectadas = 0;
    arma_equipada = 1; // 1 = Espada Rúnica 3D, 2 = Báculo Arcano 3D

BEGIN
    set_mode(m640x480);
    set_fps(60);

    fpg_juego = load_fpg("dungeon.fpg");
    fnt_gotica = load_fnt("gothic.fnt");

    // 1. Aceleración con Web Workers multi-hilo a 60 FPS
    m8_workers(4);

    // 2. Iniciar Modo 8 Híbrido con Texturas Oscuras Góticas:
    // Textura 39 = Obsidiana Volcánica, 44 = Losas Negras, 45 = Vigas Oscuras
    start_mode8_hybrid(0, 39, 44, 45);
    m8_raytracing(true);

    // 3. Equipar Arma 3D Primera Persona (Modelo MD2 con balanceo y estocada)
    m8_set_weapon("sword3d");

    // 4. Configuración de Sectores y Alturas Variables (Hexen)
    // Plataforma central elevada con altar sacrificial
    m8_set_sector(7, 7, 0.6, 2.8, 44, 45, 1.2, "none");
    m8_set_sector(8, 7, 0.6, 2.8, 44, 45, 1.2, "none");
    m8_set_sector(7, 8, 0.6, 2.8, 44, 45, 1.2, "none");
    m8_set_sector(8, 8, 0.6, 2.8, 44, 45, 1.2, "none");

    // Fosas de Sangre Demoníaca circundantes con partículas
    m8_set_fluid(5, 7, fluid_blood);
    m8_set_fluid(6, 7, fluid_blood);
    m8_set_fluid(9, 7, fluid_blood);
    m8_set_fluid(10, 7, fluid_blood);

    // Fosas de Lava Ardiente
    m8_set_fluid(5, 10, fluid_lava);
    m8_set_fluid(6, 10, fluid_lava);
    m8_set_fluid(9, 10, fluid_lava);
    m8_set_fluid(10, 10, fluid_lava);

    // 5. Luces Dinámicas Ray-Traced con Sombras Proyectadas
    m8_add_light(7.5, 7.5, 1.2, 7.0, 220, 38, 38, true, true);  // Luz roja sangre en el altar
    m8_add_light(3.5, 3.5, 0.8, 5.0, 168, 85, 247, false, true); // Luz violeta rúnica
    m8_add_light(11.5, 3.5, 0.8, 5.5, 245, 158, 11, true, true);  // Antorcha fuego ámbar

    // 6. Modelos 3D MD2 de Enemigos
    m8_add_model("demon_brute", 7.5, 7.5, 0.6, 180, "idle", 1.25); // Demonio Titán
    m8_add_model("md2_gargoyle", 4.5, 9.5, 0.2, 90, "idle", 1.0);  // Gárgola
    m8_add_model("md2_knight", 10.5, 9.5, 0.2, 270, "walk", 1.1);  // Caballero Maldito

    // 7. Modelos 3D MD2 de Objetos Sagrados y Arquitectura
    m8_add_model("relic_caliz", 7.5, 6.2, 0.8, 0, "spin", 0.9);   // Cáliz de Sangre
    m8_add_model("chest_demon", 3.5, 5.5, 0.0, 45, "idle", 1.0);  // Cofre de Reliquias
    m8_add_model("md3_pillar", 5.5, 5.5, 0.0, 0, "idle", 1.2);    // Columna gótica
    m8_add_model("md3_pillar", 9.5, 5.5, 0.0, 0, "idle", 1.2);    // Columna gótica

    // 8. Objetos Voxel 3D
    m8_add_voxel("vox_skull", 8.5, 6.2, 0.7, 0.8, 2.5);
    m8_add_voxel("vox_potion", 11.5, 5.5, 0.3, 1.0, 3.0);

    // Lanzar proceso del Jugador con control en primera persona
    jugador_cripta();

    // HUD en pantalla
    write(fnt_gotica, 20, 16, 0, "CRIPTA MALDITA 3D [MD2 + WORKERS]");
    write(fnt_gotica, 20, 40, 0, "VIDA:");
    write_int(fnt_gotica, 75, 40, 0, &vida_jugador);
    write(fnt_gotica, 20, 64, 0, "ALMAS:");
    write_int(fnt_gotica, 85, 64, 0, &almas_recolectadas);

    LOOP
        FRAME;
    END
END

PROCESS jugador_cripta()
PRIVATE
    vel = 3.6;
    rot_vel = 3.0;
BEGIN
    file = fpg_juego;
    x = 224; // (3.5 * 64)
    y = 224;
    angle = 0;

    m8[0].camera = id;

    LOOP
        // Rotación de cámara
        IF (key(_left) || key(_a))  angle -= rot_vel; END
        IF (key(_right) || key(_d)) angle += rot_vel; END

        // Desplazamiento adelante / atrás
        IF (key(_up) || key(_w))
            x += cos(angle) * vel;
            y += sin(angle) * vel;
        END
        IF (key(_down) || key(_s))
            x -= cos(angle) * (vel * 0.7);
            y -= sin(angle) * (vel * 0.7);
        END

        // Ataque con Espada Rúnica 3D (Espacio o Click)
        IF (key(_space))
            m8_attack();
        END

        // Alternar arma 3D (Tecla 1 o 2)
        IF (key(_1)) m8_set_weapon("sword3d"); END
        IF (key(_2)) m8_set_weapon("staff3d"); END

        // Interacción con puertas y sensores (Tecla E)
        IF (key(_e))
            interact_mode8();
        END

        FRAME;
    END
END;
`,
    setupRuntime: (runtime) => {
      runtime.reset();
      runtime.setResolution("640x480");
      const fpgId = runtime.load_fpg("dungeon.fpg");
      const fontId = runtime.load_fnt("gothic.fnt");

      runtime.globalVars.fpg_juego = fpgId;
      runtime.globalVars.fnt_gotica = fontId;
      runtime.globalVars.vida_jugador = 100;
      runtime.globalVars.almas_recolectadas = 0;
      runtime.globalVars.arma_equipada = 1;

      // 1. Worker acceleration
      runtime.m8_workers(4);

      // 2. Start hybrid Mode 8 with dark gothic textures
      runtime.start_mode8_hybrid(0, 39, 44, 45);
      runtime.m8_raytracing(true);

      // 3. Equip 3D first person sword
      runtime.m8_set_weapon("sword3d");

      // 4. Sectors with elevated altar platform
      runtime.m8_set_sector(7, 7, 0.6, 2.8, 44, 45, 1.2, "none");
      runtime.m8_set_sector(8, 7, 0.6, 2.8, 44, 45, 1.2, "none");
      runtime.m8_set_sector(7, 8, 0.6, 2.8, 44, 45, 1.2, "none");
      runtime.m8_set_sector(8, 8, 0.6, 2.8, 44, 45, 1.2, "none");

      // Fluid trenches
      runtime.m8_set_fluid(5, 7, "blood");
      runtime.m8_set_fluid(6, 7, "blood");
      runtime.m8_set_fluid(9, 7, "blood");
      runtime.m8_set_fluid(10, 7, "blood");

      runtime.m8_set_fluid(5, 10, "lava");
      runtime.m8_set_fluid(6, 10, "lava");
      runtime.m8_set_fluid(9, 10, "lava");
      runtime.m8_set_fluid(10, 10, "lava");

      // 5. Dynamic lights
      runtime.m8_add_light(7.5, 7.5, 1.2, 7.0, 220, 38, 38, true, true);
      runtime.m8_add_light(3.5, 3.5, 0.8, 5.0, 168, 85, 247, false, true);
      runtime.m8_add_light(11.5, 3.5, 0.8, 5.5, 245, 158, 11, true, true);

      // 6. MD2 Enemies
      runtime.m8_add_model("demon_brute", 7.5, 7.5, 0.6, 180, "idle", 1.25);
      runtime.m8_add_model("md2_gargoyle", 4.5, 9.5, 0.2, 90, "idle", 1.0);
      runtime.m8_add_model("md2_knight", 10.5, 9.5, 0.2, 270, "walk", 1.1);

      // 7. MD2 Objects
      runtime.m8_add_model("relic_caliz", 7.5, 6.2, 0.8, 0, "spin", 0.9);
      runtime.m8_add_model("chest_demon", 3.5, 5.5, 0.0, 45, "idle", 1.0);
      runtime.m8_add_model("md3_pillar", 5.5, 5.5, 0.0, 0, "idle", 1.2);
      runtime.m8_add_model("md3_pillar", 9.5, 5.5, 0.0, 0, "idle", 1.2);

      // 8. Voxels
      runtime.m8_add_voxel("vox_skull", 8.5, 6.2, 0.7, 0.8, 2.5);
      runtime.m8_add_voxel("vox_potion", 11.5, 5.5, 0.3, 1.0, 3.0);

      // 9. Player process
      runtime.registerProcess("jugador_cripta", function* (proc, _, rt) {
        proc.file = fpgId;
        proc.x = 224;
        proc.y = 224;
        proc.angle = 0;
        rt.m8[0].camera = proc.id;

        while (true) {
          const vel = 3.6;
          const rotVel = 3.0;

          if (rt.isKeyDown("ArrowLeft") || rt.isKeyDown("KeyA")) {
            proc.angle = (proc.angle - rotVel + 360) % 360;
          }
          if (rt.isKeyDown("ArrowRight") || rt.isKeyDown("KeyD")) {
            proc.angle = (proc.angle + rotVel) % 360;
          }

          const rad = (proc.angle * Math.PI) / 180;
          if (rt.isKeyDown("ArrowUp") || rt.isKeyDown("KeyW")) {
            proc.x += Math.cos(rad) * vel;
            proc.y += Math.sin(rad) * vel;
          }
          if (rt.isKeyDown("ArrowDown") || rt.isKeyDown("KeyS")) {
            proc.x -= Math.cos(rad) * (vel * 0.7);
            proc.y -= Math.sin(rad) * (vel * 0.7);
          }

          if (rt.isKeyDown("Space")) {
            rt.m8_attack();
          }

          if (rt.isKeyDown("Digit1")) {
            rt.m8_set_weapon("sword3d");
          }
          if (rt.isKeyDown("Digit2")) {
            rt.m8_set_weapon("staff3d");
          }

          if (rt.isKeyDown("KeyE")) {
            rt.interact_mode8();
          }

          yield;
        }
      });

      runtime.spawn("jugador_cripta");
    },
  },
  // 9: DOOM 1993 Modo 8 Raycaster
  {
    id: "doom_modo8_classic",
    name: "DOOM 1993: Hangar E1M1 (Modo 8)",
    genre: "FPS 3D Acción Retro (Modo 8)",
    description: "Auténtico FPS 3D estilo DOOM ejecutado sobre el motor Modo 8 de DIV Games Studio 2. Escopeta corredera con retroceso, sonido de disparo, imps demoníacos, botiquines y automapa interactivo.",
    resolution: "640x480",
    code: `PROGRAM Doom_E1M1_Modo8;

GLOBAL
    fpg_doom = 0;
    fnt_doom = 0;
    snd_shotgun = 0;
    snd_door = 0;
    salud = 100;
    armadura = 50;
    cartuchos = 16;
    arma = 2; // 1: Pistola, 2: Escopeta
    kills = 0;

BEGIN
    set_mode(m640x480);
    set_fps(60);

    // Cargar librerías y recursos
    fpg_doom = load_fpg("dungeon.fpg");
    fnt_doom = load_fnt("gothic.fnt");
    snd_shotgun = load_wav("shotgun.wav");
    snd_door = load_wav("door.wav");

    // Iniciar Raycasting Modo 8 (DOOM 2.5D con texturas de piedra y metal)
    start_mode8(0, 0, 39, 44, 45, 0, 0);

    // Activar aceleración multi-hilo en workers y trazado de rayos
    m8_workers(4);
    m8_raytracing(true);

    // Equipar escopeta en 1ª persona
    m8_set_weapon("shotgun");

    // Luces atmosféricas dinámicas
    m8_add_light(7.5, 7.5, 1.2, 7.0, 220, 100, 38, true, true);
    m8_add_light(3.5, 3.5, 0.8, 5.0, 100, 150, 255, false, true);

    // HUD Retro Superior
    write(fnt_doom, 20, 20, 0, "DOOM E1M1 - HANGAR [MODO 8 DIV]");
    write(fnt_doom, 20, 45, 0, "SALUD:");
    write_int(fnt_doom, 85, 45, 0, &salud);
    write(fnt_doom, 20, 70, 0, "ARMADURA:");
    write_int(fnt_doom, 110, 70, 0, &armadura);
    write(fnt_doom, 20, 95, 0, "CARTUCHOS:");
    write_int(fnt_doom, 125, 95, 0, &cartuchos);
    write(fnt_doom, 20, 120, 0, "[WASD/Flechas] Moverse | [ESPACIO/Click] Disparar | [1/2] Arma | [TAB] Mapa");

    // Lanzar Marine Jugador
    jugador_marine();

    // Spawners de monstruos y suministros
    demonio_imp(576, 256);
    demonio_imp(448, 640);
    botiquin_salud(320, 320);
    caja_cartuchos(256, 448);

    LOOP
        FRAME;
    END
END

PROCESS jugador_marine()
PRIVATE
    vel = 3.8;
    rot_vel = 3.2;
    cooldown = 0;
BEGIN
    file = fpg_doom;
    x = 224;
    y = 224;
    angle = 0;
    m8[0].camera = id;

    LOOP
        // Rotación con flechas o teclas A/D
        IF (key(_left) || key(_a))  angle -= rot_vel; END
        IF (key(_right) || key(_d)) angle += rot_vel; END

        // Desplazamiento adelante/atrás
        IF (key(_up) || key(_w))
            x += cos(angle) * vel;
            y += sin(angle) * vel;
        END
        IF (key(_down) || key(_s))
            x -= cos(angle) * (vel * 0.7);
            y -= sin(angle) * (vel * 0.7);
        END

        // Disparo de escopeta / pistola
        IF (key(_space) || mouse.left)
            IF (cooldown == 0 && cartuchos > 0)
                cartuchos--;
                m8_attack();
                cooldown = 18;
            END
        END

        IF (cooldown > 0) cooldown--; END

        // Cambiar de arma (1: Pistola, 2: Escopeta)
        IF (key(_1))
            arma = 1;
            m8_set_weapon("pistol");
        END
        IF (key(_2))
            arma = 2;
            m8_set_weapon("shotgun");
        END

        // Abrir puertas e interactuar
        IF (key(_e))
            interact_mode8();
        END

        FRAME;
    END
END

PROCESS demonio_imp(x, y)
PRIVATE
    vida = 4;
BEGIN
    file = fpg_doom;
    graph = 27;
    ctype = c_m8;
    size = 125;
    LOOP
        angle += 1;
        FRAME;
    END
END

PROCESS botiquin_salud(x, y)
BEGIN
    file = fpg_doom;
    graph = 24;
    ctype = c_m8;
    size = 90;
    LOOP
        FRAME;
    END
END

PROCESS caja_cartuchos(x, y)
BEGIN
    file = fpg_doom;
    graph = 29;
    ctype = c_m8;
    size = 100;
    LOOP
        FRAME;
    END
END
`,
    setupRuntime: (runtime) => {
      runtime.reset();
      runtime.setResolution("640x480");
      const fpgId = runtime.load_fpg("dungeon.fpg");
      const fontId = runtime.load_fnt("gothic.fnt");

      runtime.globalVars.fpg_doom = fpgId;
      runtime.globalVars.fnt_doom = fontId;
      runtime.globalVars.salud = 100;
      runtime.globalVars.armadura = 50;
      runtime.globalVars.cartuchos = 16;
      runtime.globalVars.arma = 2;
      runtime.globalVars.kills = 0;

      // 1. Worker acceleration & hybrid raycaster
      runtime.m8_workers(4);
      runtime.start_mode8_hybrid(0, 39, 44, 45);
      runtime.m8_raytracing(true);

      // 2. Equip shotgun
      runtime.m8_set_weapon("shotgun");

      // 3. Sectors with elevated platform & stairs
      runtime.m8_set_sector(7, 7, 0.5, 2.6, 44, 45, 1.3, "none");
      runtime.m8_set_sector(8, 7, 0.5, 2.6, 44, 45, 1.3, "none");
      runtime.m8_set_sector(7, 8, 0.5, 2.6, 44, 45, 1.3, "none");
      runtime.m8_set_sector(8, 8, 0.5, 2.6, 44, 45, 1.3, "none");

      // Toxic sludge & acid pits
      runtime.m8_set_fluid(5, 7, "acid");
      runtime.m8_set_fluid(6, 7, "acid");
      runtime.m8_set_fluid(9, 7, "blood");
      runtime.m8_set_fluid(10, 7, "blood");

      // 4. Dynamic lights
      runtime.m8_add_light(7.5, 7.5, 1.2, 7.5, 240, 120, 40, true, true);
      runtime.m8_add_light(3.5, 3.5, 0.8, 5.0, 80, 160, 255, false, true);
      runtime.m8_add_light(11.5, 3.5, 0.8, 5.5, 255, 60, 60, true, true);

      // 5. MD2 Enemies (Imps / Demons)
      runtime.m8_add_model("demon_brute", 7.5, 7.5, 0.5, 180, "idle", 1.2);
      runtime.m8_add_model("md2_gargoyle", 4.5, 9.5, 0.1, 90, "walk", 1.0);
      runtime.m8_add_model("md2_knight", 10.5, 9.5, 0.1, 270, "walk", 1.1);

      // 6. Placed Voxels & Props
      runtime.m8_add_voxel("vox_potion", 6.5, 3.5, 0.3, 1.0, 3.0);
      runtime.m8_add_voxel("vox_skull", 8.5, 6.2, 0.7, 0.8, 2.5);

      // 7. HUD text displays
      runtime.write(fontId, 20, 20, 0, "DOOM E1M1 - HANGAR [MODO 8]");
      runtime.write(fontId, 20, 45, 0, "SALUD: 100%   ARMADURA: 50%   CARTUCHOS: 16");
      runtime.write(fontId, 20, 70, 0, "[WASD / Flechas] Mover  |  [ESPACIO / Click] Disparar  |  [1/2] Arma  |  [TAB] Mapa");

      // 8. Marine Player Process
      runtime.registerProcess("jugador_marine", function* (proc, _, rt) {
        proc.file = fpgId;
        proc.x = 224; // 3.5 * 64
        proc.y = 224;
        proc.angle = 0;
        rt.m8[0].camera = proc.id;
        let shootCooldown = 0;

        while (true) {
          const vel = 4.0;
          const rotVel = 3.2;

          // Rotation
          if (rt.key("left") || rt.key("a")) {
            proc.angle = (proc.angle - rotVel + 360) % 360;
          }
          if (rt.key("right") || rt.key("d")) {
            proc.angle = (proc.angle + rotVel) % 360;
          }

          // Movement with collision checking
          const rad = (proc.angle * Math.PI) / 180;
          const dirX = Math.cos(rad);
          const dirY = Math.sin(rad);

          let nextX = proc.x;
          let nextY = proc.y;

          if (rt.key("up") || rt.key("w")) {
            nextX += dirX * vel;
            nextY += dirY * vel;
          }
          if (rt.key("down") || rt.key("s")) {
            nextX -= dirX * (vel * 0.7);
            nextY -= dirY * (vel * 0.7);
          }

          // Map collision check
          const map = rt.m8[0]?.map;
          if (map) {
            const gx = Math.floor(nextX / 64);
            const gy = Math.floor(nextY / 64);
            if (map[gy] && map[gy][gx] === 0) {
              proc.x = nextX;
              proc.y = nextY;
            }
          } else {
            proc.x = nextX;
            proc.y = nextY;
          }

          // Shooting
          if (shootCooldown > 0) shootCooldown--;

          const isShooting = rt.key("space") || rt.key("control") || rt.mouseState.left;
          if (isShooting && shootCooldown === 0) {
            if (rt.globalVars.cartuchos > 0) {
              rt.globalVars.cartuchos--;
              rt.m8_attack();
              shootCooldown = 16;
            }
          }

          // Weapon switching
          if (rt.key("1") || rt.key("digit1")) {
            rt.globalVars.arma = 1;
            rt.m8_set_weapon("pistol");
          }
          if (rt.key("2") || rt.key("digit2")) {
            rt.globalVars.arma = 2;
            rt.m8_set_weapon("shotgun");
          }

          // Interact
          if (rt.key("e")) {
            rt.interact_mode8();
          }

          yield;
        }
      });

      runtime.spawn("jugador_marine");
    },
  },
];
