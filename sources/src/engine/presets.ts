import { DivRuntime } from "./runtime";
import { DivProcess, Mode8CameraMode } from "../types";
import { APP_TEMPLATES } from "./appTemplates";
import {
  Mode8LevelData,
  PRESET_E1M1_HANGAR,
  PRESET_ROBLOX_CYBER_TYCOON,
  PRESET_ROBLOX_DOJO,
  PRESET_ROBLOX_OBBY,
  PRESET_ROBLOX_SKY_CITADEL,
} from "./mode8Presets";
import { buildTracedSectors, findSectorAtPoint, serializeMode8LevelToDivCode } from "./mode8Geometry";
import { doomWorldState } from "./doom2Engine";

function setupRobloxMode8Runtime(
  runtime: DivRuntime,
  level: Mode8LevelData,
  opts?: {
    title?: string;
    weapon?: "shotgun" | "pistol" | "sword3d" | "staff3d";
    cameraMode?: Mode8CameraMode;
  }
) {
  runtime.reset();
  runtime.setHtml5Mode(false);
  runtime.setResolution("640x480");
  const fpgId = runtime.load_fpg("dungeon.fpg");
  const fontId = runtime.load_fnt("gothic.fnt");

  const startWeapon = opts?.weapon || level.recommendedWeapon || "sword3d";
  const startCamera: Mode8CameraMode = opts?.cameraMode || level.recommendedCamera || "third_person";

  doomWorldState.health = 100;
  doomWorldState.armor = 50;
  doomWorldState.ammo = 30;
  doomWorldState.kills = 0;

  runtime.globalVars.salud = 100;
  runtime.globalVars.armadura = 50;
  runtime.globalVars.cartuchos = 30;
  runtime.globalVars.score = 0;

  runtime.m8_workers(4);
  runtime.start_mode8_hybrid(0, 39, 44, 45);
  runtime.m8_set_doom_map(
    level.linedefs.map((l) => ({ ...l })),
    level.sectors.map((s) => ({ ...s }))
  );
  runtime.m8_set_weapon(startWeapon);

  const playerEnt = level.entities.find((e) => e.type === "player");
  const startX = playerEnt ? playerEnt.x / 64 : 4.5;
  const startY = playerEnt ? playerEnt.y / 64 : 7.5;
  const traced = buildTracedSectors(level.sectors, level.linedefs);
  const initFloor = findSectorAtPoint(startX, startY, traced)?.floorHeight ?? 0;

  if (runtime.m8[0]) {
    runtime.m8[0].engineMode = "doom2";
    runtime.m8[0].skyTexture = level.recommendedSky || "SKY_ROBLOX";
    runtime.m8[0].cameraMode = startCamera;
    runtime.m8[0].playerModelId = level.recommendedPlayerModel || "blox_hero";
    runtime.m8[0].placedModels = level.placedModels.map((m) => ({
      ...m,
      homeX: m.x,
      homeY: m.y,
    }));
    runtime.m8[0].placedVoxels = level.placedVoxels.map((v) => ({ ...v, collected: false }));
    runtime.m8[0].lights = level.lights.map((lt) => ({ ...lt }));
    runtime.m8[0].entities = level.entities
      .filter((e) => e.type !== "player")
      .map((e) => ({ ...e }));
    runtime.m8[0].x = startX;
    runtime.m8[0].y = startY;
    runtime.m8[0].z = initFloor;
  }

  runtime.registerProcess("jugador_blox", function* (proc, _, rt) {
    proc.file = fpgId;
    proc.x = startX * 64;
    proc.y = startY * 64;
    proc.z = initFloor;
    proc.angle = 0;
    proc.localVars.__worldScale = 64;
    if (rt.m8[0]) rt.m8[0].camera = proc.id;

    let cooldown = 0;
    let velZ = 0;
    let feetZ = initFloor;
    let camLock = false;
    const camCycle: Mode8CameraMode[] = ["third_person", "fps", "isometric", "orbit"];
    let activeWeapon = startWeapon;

    while (!proc.isDead) {
      const turnLeft = rt.key("left") || rt.isKeyDown("ArrowLeft") || rt.key("q") || rt.isKeyDown("KeyQ");
      const turnRight = rt.key("right") || rt.isKeyDown("ArrowRight");
      const up = rt.key("up") || rt.key("w") || rt.isKeyDown("KeyW") || rt.isKeyDown("ArrowUp");
      const down = rt.key("down") || rt.key("s") || rt.isKeyDown("KeyS") || rt.isKeyDown("ArrowDown");
      const strafeL = rt.key("a") || rt.isKeyDown("KeyA");
      const strafeR = rt.key("d") || rt.isKeyDown("KeyD");

      if (turnLeft) proc.angle = (proc.angle - 3.0 + 360) % 360;
      if (turnRight) proc.angle = (proc.angle + 3.0) % 360;

      const rad = (proc.angle * Math.PI) / 180;
      const spd = 4.0;
      let mx = 0;
      let my = 0;
      if (up) { mx += Math.cos(rad) * spd; my += Math.sin(rad) * spd; }
      if (down) { mx -= Math.cos(rad) * (spd * 0.72); my -= Math.sin(rad) * (spd * 0.72); }
      if (strafeL) { mx += Math.sin(rad) * (spd * 0.8); my -= Math.cos(rad) * (spd * 0.8); }
      if (strafeR) { mx -= Math.sin(rad) * (spd * 0.8); my += Math.cos(rad) * (spd * 0.8); }

      if (mx !== 0 || my !== 0) {
        const nextPos = rt.moveMode8WithCollision(proc.x / 64, proc.y / 64, mx / 64, my / 64, 0.22, feetZ);
        proc.x = nextPos.x * 64;
        proc.y = nextPos.y * 64;
        if (rt.m8[0]) rt.m8[0].walkCycle = (rt.m8[0].walkCycle || 0) + 0.16;
      }

      // True vertical gravity & sector floor collision
      const groundZ = findSectorAtPoint(proc.x / 64, proc.y / 64, traced)?.floorHeight ?? 0;
      const onGround = feetZ <= groundZ + 0.03 && velZ <= 0;
      if ((rt.key("space") || rt.isKeyDown("Space") || rt.key("j") || rt.isKeyDown("KeyJ")) && onGround) {
        velZ = 0.115;
      }
      feetZ += velZ;
      velZ -= 0.0062;
      if (feetZ <= groundZ) {
        if (velZ <= 0 || groundZ - feetZ <= 0.45) {
          feetZ = groundZ;
          velZ = 0;
        }
      }
      if (onGround && groundZ > feetZ && groundZ - feetZ <= 0.45) {
        feetZ = feetZ + (groundZ - feetZ) * 0.45;
      }
      if (rt.m8[0]) {
        rt.m8[0].z = velZ !== 0 ? feetZ : (rt.m8[0].z || 0) + (feetZ - (rt.m8[0].z || 0)) * 0.45;
        proc.z = rt.m8[0].z;
      }

      // Camera mode toggle (C)
      const cDown = rt.key("c") || rt.isKeyDown("KeyC");
      if (cDown && !camLock && rt.m8[0]) {
        const nextIdx = (camCycle.indexOf(rt.m8[0].cameraMode || "third_person") + 1) % camCycle.length;
        rt.m8[0].cameraMode = camCycle[nextIdx];
      }
      camLock = cDown;

      // Weapon attack (Left click, F or Ctrl)
      if (cooldown > 0) cooldown--;
      if ((rt.mouseState.left || rt.key("f") || rt.isKeyDown("KeyF") || rt.key("control")) && cooldown === 0) {
        if (activeWeapon === "sword3d" || activeWeapon === "staff3d" || rt.globalVars.cartuchos > 0) {
          if (activeWeapon !== "sword3d" && activeWeapon !== "staff3d") {
            rt.globalVars.cartuchos--;
            doomWorldState.ammo = rt.globalVars.cartuchos;
          }
          rt.m8_attack();
          cooldown = 16;
        }
      }

      if (rt.key("1") || rt.isKeyDown("Digit1")) { activeWeapon = "pistol"; rt.m8_set_weapon("pistol"); }
      if (rt.key("2") || rt.isKeyDown("Digit2")) { activeWeapon = "shotgun"; rt.m8_set_weapon("shotgun"); }
      if (rt.key("3") || rt.isKeyDown("Digit3")) { activeWeapon = "sword3d"; rt.m8_set_weapon("sword3d"); }
      if (rt.key("4") || rt.isKeyDown("Digit4")) { activeWeapon = "staff3d"; rt.m8_set_weapon("staff3d"); }
      if (rt.key("e") || rt.isKeyDown("KeyE")) rt.interact_mode8();

      yield;
    }
  });

  runtime.spawn("jugador_blox");
  runtime.write(fontId, 16, 14, 0, `${opts?.title || level.name}`);
  runtime.write(fontId, 16, 36, 0, "WASD/Flechas: Mover | ESPACIO: Saltar | CLICK/F: Atacar | C: Cámara | TAB: Mapa");
}

export interface GamePreset {
  id: string;
  name: string;
  genre: string;
  description: string;
  resolution: "320x200" | "640x480" | "800x600";
  code: string;
  setupRuntime: (runtime: DivRuntime) => void;
}

export const BLANK_PROJECT_PRESET: GamePreset = {
  id: "empty_project",
  name: "Proyecto Vacío",
  genre: "Entorno Limpio",
  description: "Entorno vacío sin código de ejemplo precargado. Listo para escribir, generar con el Asistente IA o probar tus propios programas.",
  resolution: "640x480",
  code: "",
  setupRuntime: (runtime: DivRuntime) => {
    runtime.reset();
    runtime.setHtml5Mode(false);
    runtime.setResolution("640x480");
  },
};

export const PRESETS: GamePreset[] = [
  // 0: Entorno Vacío por defecto
  BLANK_PROJECT_PRESET,

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

  // 5: Roblox Obby Tower 3D (Modo 8)
  {
    id: "mode8_dungeon",
    name: "Roblox Obby Tower 3D (Modo 8)",
    genre: "Aventura 3D Roblox Obby",
    description: "Mundo 3D estilo Roblox Studs con plataformas ascendentes sin superposiciones, monedas coleccionables, checkpoints, enemigos IA activos y cámara 3ª Persona / FPS.",
    resolution: "640x480",
    code: serializeMode8LevelToDivCode(PRESET_ROBLOX_OBBY, {
      title: "ROBLOX OBBY TOWER 3D",
      startingWeapon: "sword3d",
      cameraMode: "third_person",
      hasStartMenu: false,
    }),
    setupRuntime: (runtime) => {
      setupRobloxMode8Runtime(runtime, PRESET_ROBLOX_OBBY, {
        title: "ROBLOX OBBY TOWER 3D",
        weapon: "sword3d",
        cameraMode: "third_person",
      });
    },
  },
  // 9: Roblox Sky Citadel 3D (Híbrido)
  {
    id: "hexen_citadel_3d",
    name: "Roblox Sky Citadel 3D (Híbrido AAA)",
    genre: "Acción RPG 3D Estilo Roblox",
    description: "Ciudadela celestial de mármol y oro estilo Roblox con terrazas escalonadas, cofres, escoltas Redcliff, Titán activo y cámara 3ª Persona / FPS.",
    resolution: "640x480",
    code: serializeMode8LevelToDivCode(PRESET_ROBLOX_SKY_CITADEL, {
      title: "ROBLOX SKY CITADEL 3D",
      startingWeapon: "sword3d",
      cameraMode: "third_person",
      hasStartMenu: false,
    }),
    setupRuntime: (runtime) => {
      setupRobloxMode8Runtime(runtime, PRESET_ROBLOX_SKY_CITADEL, {
        title: "ROBLOX SKY CITADEL 3D",
        weapon: "sword3d",
        cameraMode: "third_person",
      });
    },
  },
  // 10: Roblox Dojo de Pelea 3D (DIV 2)
  {
    id: "div2_modo8_raycast",
    name: "Roblox Dojo de Pelea 3D (DIV 2)",
    genre: "Acción Marcial 3D Estilo Roblox",
    description: "Arena Dojo estilo Roblox con madera y tatami en dos alturas, antorchas, duelistas Samurái activos y cámara 3ª Persona.",
    resolution: "640x480",
    code: serializeMode8LevelToDivCode(PRESET_ROBLOX_DOJO, {
      title: "ROBLOX DOJO DE PELEA 3D",
      startingWeapon: "sword3d",
      cameraMode: "third_person",
      hasStartMenu: false,
    }),
    setupRuntime: (runtime) => {
      setupRobloxMode8Runtime(runtime, PRESET_ROBLOX_DOJO, {
        title: "ROBLOX DOJO DE PELEA 3D",
        weapon: "sword3d",
        cameraMode: "third_person",
      });
    },
  },
  // 11: Roblox Cyber Base 3D (MD2 + Workers)
  {
    id: "modo8_dark_md2_workers",
    name: "Roblox Cyber Base 3D (MD2 + Workers)",
    genre: "Acción Sci-Fi 3D Estilo Roblox",
    description: "Base futurista estilo Roblox Cyber Neón con plataforma de reactor, terminales digitales, Cyber Mechs activos y núcleo de energía.",
    resolution: "640x480",
    code: serializeMode8LevelToDivCode(PRESET_ROBLOX_CYBER_TYCOON, {
      title: "ROBLOX CYBER BASE 3D",
      startingWeapon: "pistol",
      cameraMode: "third_person",
      hasStartMenu: false,
    }),
    setupRuntime: (runtime) => {
      setupRobloxMode8Runtime(runtime, PRESET_ROBLOX_CYBER_TYCOON, {
        title: "ROBLOX CYBER BASE 3D",
        weapon: "pistol",
        cameraMode: "third_person",
      });
    },
  },
  // 12: Base Espacial Blox E1M1 (Modo 8)
  {
    id: "doom_modo8_classic",
    name: "Base Espacial Blox E1M1 (Modo 8)",
    genre: "Shooter / Plataforma 3D Roblox",
    description: "Patio modular estilo Roblox Studs con escalera de 4 peldaños hacia cubierta dorada, enemigos activos, escopeta 3D y cámara intercambiable.",
    resolution: "640x480",
    code: serializeMode8LevelToDivCode(PRESET_E1M1_HANGAR, {
      title: "BASE ESPACIAL BLOX E1M1",
      startingWeapon: "shotgun",
      cameraMode: "third_person",
      hasStartMenu: false,
    }),
    setupRuntime: (runtime) => {
      setupRobloxMode8Runtime(runtime, PRESET_E1M1_HANGAR, {
        title: "BASE ESPACIAL BLOX E1M1",
        weapon: "shotgun",
        cameraMode: "third_person",
      });
    },
  },
  // Multiplatform App Templates mapped to Presets for direct execution in GameStage
  ...APP_TEMPLATES.map((tmpl) => ({
    id: tmpl.id,
    name: `[App] ${tmpl.name}`,
    genre: `App (${tmpl.category})`,
    description: tmpl.description,
    resolution: tmpl.resolution,
    code: tmpl.code,
    setupRuntime: tmpl.setupRuntime,
  })),
];
