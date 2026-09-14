import JSZip from "jszip";
import { DivGraphic } from "../types";
import { createGraphicCanvas, DEFAULT_PALETTE } from "./graphics";

export interface ExportZipOptions {
  gameTitle: string;
  code: string;
  fpg: DivGraphic[];
  resolution: "320x200" | "640x480" | "800x600";
  presetId?: string;
  onProgress?: (percent: number, statusText: string) => void;
}

/**
 * Converts a DivGraphic to a base64 PNG data URL
 */
function graphicToPngDataUrl(g: DivGraphic): string {
  try {
    const canvas = g.canvas || createGraphicCanvas(g);
    return canvas.toDataURL("image/png");
  } catch (e) {
    return "";
  }
}

/**
 * Converts a base64 DataURL into a binary Uint8Array for JSZip
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a procedural retro background map as a PNG DataURL
 */
function generateSampleMapPng(width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Space/dungeon gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#050811");
  grad.addColorStop(0.7, "#0b1329");
  grad.addColorStop(1, "#111c3d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Retro grid lines
  ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
  ctx.lineWidth = 1;
  const step = 32;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Scattered distant stars
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 80; i++) {
    const sx = Math.floor(Math.random() * width);
    const sy = Math.floor(Math.random() * height);
    const size = Math.random() > 0.7 ? 2 : 1;
    ctx.globalAlpha = Math.random() * 0.7 + 0.3;
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.globalAlpha = 1;

  return canvas.toDataURL("image/png");
}

/**
 * Builds the standalone index.html file that embeds the engine, assets and game loop.
 */
function generateStandaloneHtml(
  title: string,
  code: string,
  resolution: string,
  fpg: DivGraphic[],
  presetId?: string
): string {
  const [resW, resH] = resolution.split("x").map(Number);
  const w = resW || 640;
  const h = resH || 480;

  // Prepare sprites data map
  const spritesJson = fpg.map((g) => ({
    id: g.id,
    name: g.name,
    width: g.width,
    height: g.height,
    cx: g.cx ?? Math.floor(g.width / 2),
    cy: g.cy ?? Math.floor(g.height / 2),
    dataUrl: graphicToPngDataUrl(g),
  }));

  // Escaped DIV code for HTML display
  const escapedCode = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${title} - WXDIV 3.0 Standalone Game</title>
  <style>
    :root {
      --bg: #030712;
      --card: #0f172a;
      --border: #1e293b;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.3);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      background-color: var(--bg);
      color: #f8fafc;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      overflow-x: hidden;
      padding: 12px;
    }
    header {
      width: 100%;
      max-width: 900px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      color: white;
    }
    .title-group h1 {
      font-size: 14px;
      letter-spacing: 0.5px;
      color: #f1f5f9;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #082f49;
      color: #38bdf8;
      border: 1px solid #0284c7;
      margin-left: 6px;
    }
    .controls-bar {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    button {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: inherit;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    button:hover {
      background: #334155;
      color: white;
      border-color: #475569;
    }
    button.active {
      background: #0284c7;
      color: white;
      border-color: #38bdf8;
    }
    main {
      width: 100%;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .canvas-container {
      position: relative;
      background: #000;
      border: 2px solid #334155;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.8), 0 0 15px var(--accent-glow);
      overflow: hidden;
      max-width: 100%;
    }
    canvas {
      display: block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      max-width: 100%;
      height: auto;
      background: #070b14;
    }
    .scanlines {
      pointer-events: none;
      position: absolute;
      inset: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
      background-size: 100% 4px;
      opacity: 0.6;
    }
    /* Virtual On-Screen Gamepad for touch devices */
    .touch-controls {
      display: none;
      margin-top: 14px;
      width: 100%;
      max-width: 640px;
      justify-content: space-between;
      padding: 0 16px;
    }
    @media (pointer: coarse) {
      .touch-controls { display: flex; }
    }
    .dpad {
      display: grid;
      grid-template-columns: repeat(3, 44px);
      grid-template-rows: repeat(3, 44px);
      gap: 4px;
    }
    .touch-btn {
      background: #1e293b;
      border: 1px solid #475569;
      color: #e2e8f0;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      touch-action: manipulation;
    }
    .touch-btn:active {
      background: #0284c7;
      color: white;
    }
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .action-btn {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #be123c;
      border: 2px solid #f43f5e;
      color: white;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .action-btn:active {
      background: #f43f5e;
      transform: scale(0.95);
    }
    /* Code Viewer Drawer */
    #codeDrawer {
      width: 100%;
      max-width: 900px;
      margin-top: 16px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      display: none;
    }
    #codeDrawer pre {
      background: #020617;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 11px;
      color: #94a3b8;
      max-height: 260px;
      user-select: text;
    }
    footer {
      margin-top: 14px;
      font-size: 11px;
      color: #64748b;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">DIV</div>
      <div class="title-group">
        <h1>${title} <span class="badge">${resolution} • 60 FPS</span></h1>
      </div>
    </div>
    <div class="controls-bar">
      <button id="btnSound" title="Activar/Silenciar Audio">🔊 Sonido</button>
      <button id="btnScanlines" title="Alternar efecto CRT Scanlines">📺 CRT</button>
      <button id="btnFullscreen" title="Pantalla Completa">⛶ Pantalla</button>
      <button id="btnCode" title="Ver Código DIV">{'</>'} Código</button>
      <button id="btnRestart" style="background:#0f766e; border-color:#14b8a6; color:white;">↺ Reiniciar</button>
    </div>
  </header>

  <main>
    <div class="canvas-container">
      <canvas id="gameCanvas" width="${w}" height="${h}"></canvas>
      <div id="scanlinesOverlay" class="scanlines"></div>
    </div>

    <!-- Mobile Touch Controls -->
    <div class="touch-controls">
      <div class="dpad">
        <div></div>
        <button class="touch-btn" id="touchUp">▲</button>
        <div></div>
        <button class="touch-btn" id="touchLeft">◀</button>
        <div></div>
        <button class="touch-btn" id="touchRight">▶</button>
        <div></div>
        <button class="touch-btn" id="touchDown">▼</button>
        <div></div>
      </div>
      <div class="action-buttons">
        <button class="touch-btn action-btn" id="touchB" style="background:#4338ca; border-color:#6366f1;">B</button>
        <button class="touch-btn action-btn" id="touchA">A</button>
      </div>
    </div>

    <!-- Code View Drawer -->
    <div id="codeDrawer">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:bold; font-size:12px; color:#38bdf8;">Código Fuente DIV Games Studio</span>
        <span style="font-size:10px; color:#64748b;">${title}.div</span>
      </div>
      <pre><code>${escapedCode}</code></pre>
    </div>
  </main>

  <footer>
    <span>🎮 Teclas: [Flechas / WASD] = Mover • [Espacio / Enter] = Acción / Disparar • [R] = Reiniciar</span>
    <span>•</span>
    <span>WXDIV 3.0 Engine Standalone Runtime</span>
  </footer>

  <script>
    (function() {
      const canvas = document.getElementById("gameCanvas");
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;

      // Sprites data
      const SPRITES_RAW = ${JSON.stringify(spritesJson)};
      const spriteImages = new Map();
      let spritesLoaded = 0;

      // Preload sprite images
      SPRITES_RAW.forEach(s => {
        if (s.dataUrl) {
          const img = new Image();
          img.src = s.dataUrl;
          img.onload = () => {
            s.image = img;
            spritesLoaded++;
          };
          spriteImages.set(s.id, s);
        }
      });

      // Sound Synthesizer (Web Audio API)
      let audioCtx = null;
      let soundEnabled = true;

      function getAudio() {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx && audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }
        return audioCtx;
      }

      function playSound(id, vol = 0.5) {
        if (!soundEnabled) return;
        const actx = getAudio();
        if (!actx) return;
        const now = actx.currentTime;
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.connect(gain);
        gain.connect(actx.destination);

        if (id === 1) { // Laser
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
          gain.gain.setValueAtTime(vol * 0.4, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (id === 2) { // Explosion
          osc.type = "square";
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
          gain.gain.setValueAtTime(vol * 0.6, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (id === 4) { // Coin / Pickup
          osc.type = "sine";
          osc.frequency.setValueAtTime(587, now);
          osc.frequency.setValueAtTime(880, now + 0.08);
          gain.gain.setValueAtTime(vol * 0.4, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (id === 5) { // Jump
          osc.type = "square";
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(450, now + 0.14);
          gain.gain.setValueAtTime(vol * 0.35, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.14);
          osc.start(now);
          osc.stop(now + 0.14);
        } else { // Generic blip
          osc.type = "triangle";
          osc.frequency.setValueAtTime(400, now);
          gain.gain.setValueAtTime(vol * 0.3, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        }
      }

      // Keyboard & Inputs
      const keys = {};
      window.addEventListener("keydown", (e) => {
        const k = e.key.toLowerCase();
        keys[k] = true;
        if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
          e.preventDefault();
        }
        if (k === "r") resetGame();
      });
      window.addEventListener("keyup", (e) => {
        keys[e.key.toLowerCase()] = false;
      });

      // Virtual Touch Buttons
      function bindTouch(id, keyMap) {
        const el = document.getElementById(id);
        if (!el) return;
        const setK = (val) => { keyMap.forEach(k => keys[k] = val); };
        el.addEventListener("touchstart", (e) => { e.preventDefault(); setK(true); });
        el.addEventListener("touchend", (e) => { e.preventDefault(); setK(false); });
        el.addEventListener("mousedown", () => setK(true));
        el.addEventListener("mouseup", () => setK(false));
      }
      bindTouch("touchUp", ["arrowup", "w"]);
      bindTouch("touchDown", ["arrowdown", "s"]);
      bindTouch("touchLeft", ["arrowleft", "a"]);
      bindTouch("touchRight", ["arrowright", "d"]);
      bindTouch("touchA", [" ", "enter"]);
      bindTouch("touchB", ["escape"]);

      // Game state & micro-threaded processes
      let isRunning = true;
      let score = 0;
      let lives = 3;
      let gold = 0;
      let hp = 100;
      let score_p1 = 0;
      let score_cpu = 0;

      let processes = [];
      let primitives = [];
      let texts = [];
      let procIdGen = 1;

      function spawn(name, fn, args = {}) {
        const p = {
          id: procIdGen++,
          name,
          x: args.x || canvas.width / 2,
          y: args.y || canvas.height / 2,
          graph: args.graph || 0,
          size: args.size || 100,
          angle: args.angle || 0,
          flags: args.flags || 0,
          alpha: args.alpha || 255,
          isDead: false,
          state: {},
          tick: null
        };
        p.tick = fn(p);
        processes.push(p);
        return p;
      }

      function collision(caller, targetName) {
        const cr = (caller.size || 100) * 0.15;
        for (const p of processes) {
          if (p.id === caller.id || p.isDead || p.name !== targetName) continue;
          const tr = (p.size || 100) * 0.15;
          const dist = Math.hypot(p.x - caller.x, p.y - caller.y);
          if (dist <= cr + tr) return p;
        }
        return null;
      }

      function drawBox(x1, y1, x2, y2, color) {
        primitives.push({ type: "box", x1, y1, x2, y2, color });
      }

      function write(text, x, y, align = 0) {
        texts.push({ text, x, y, align });
      }

      // Initialize the Game based on preset / template
      const PRESET_ID = "${presetId || "space_shooter"}";

      function initGame() {
        processes = [];
        primitives = [];
        texts = [];
        score = 0;
        lives = 3;
        gold = 0;
        hp = 100;
        score_p1 = 0;
        score_cpu = 0;

        if (PRESET_ID === "platformer") {
          // Pixel Knight Adventure
          spawn("scenery", function(proc) {
            return function() {
              drawBox(0, 410, canvas.width, canvas.height, "#1e293b");
              drawBox(0, 410, canvas.width, 414, "#10b981");
              drawBox(220, 310, 420, 325, "#334155");
              drawBox(220, 310, 420, 313, "#22c55e");
            };
          });

          // Knight
          spawn("knight", function(proc) {
            proc.graph = 10;
            proc.size = 140;
            proc.x = 100;
            proc.y = 380;
            let vy = 0;
            let onGround = false;

            return function() {
              if (keys["arrowleft"] || keys["a"]) { proc.x -= 4.2; proc.flags = 1; }
              if (keys["arrowright"] || keys["d"]) { proc.x += 4.2; proc.flags = 0; }
              if ((keys["arrowup"] || keys["w"] || keys[" "]) && onGround) {
                vy = -12.5;
                onGround = false;
                playSound(5);
              }
              vy += 0.65;
              proc.y += vy;

              if (proc.y >= 390) { proc.y = 390; vy = 0; onGround = true; }
              if (proc.x >= 220 && proc.x <= 420 && proc.y >= 290 && proc.y <= 310 && vy > 0) {
                proc.y = 295; vy = 0; onGround = true;
              }

              const coin = collision(proc, "coin");
              if (coin) {
                gold += 25;
                playSound(4);
                coin.isDead = true;
              }
              const slime = collision(proc, "slime");
              if (slime) {
                hp = Math.max(0, hp - 10);
                playSound(3);
                vy = -6;
              }
            };
          });

          // Coins
          [280, 320, 360, 500].forEach((cx, idx) => {
            spawn("coin", function(proc) {
              proc.graph = 8;
              proc.x = cx;
              proc.y = idx < 3 ? 270 : 380;
              let t = idx;
              return function() {
                t += 0.08;
                proc.y += Math.sin(t) * 0.4;
              };
            });
          });

          // Slimes
          spawn("slime", function(proc) {
            proc.graph = 3;
            proc.x = 260;
            proc.y = 300;
            let dir = 1;
            return function() {
              proc.x += dir * 1.6;
              if (proc.x > 410 || proc.x < 230) { dir = -dir; proc.flags = dir === 1 ? 0 : 1; }
            };
          });

          spawn("slime", function(proc) {
            proc.graph = 3;
            proc.x = 450;
            proc.y = 390;
            let dir = 1;
            return function() {
              proc.x += dir * 2;
              if (proc.x > 600 || proc.x < 350) { dir = -dir; proc.flags = dir === 1 ? 0 : 1; }
            };
          });

        } else if (PRESET_ID === "cyber_pong") {
          // Cyber Pong 3000
          spawn("paddle_player", function(proc) {
            proc.graph = 12;
            proc.x = 40;
            proc.y = 240;
            return function() {
              if (keys["arrowup"] || keys["w"]) proc.y -= 6.5;
              if (keys["arrowdown"] || keys["s"]) proc.y += 6.5;
              proc.y = Math.max(40, Math.min(canvas.height - 40, proc.y));
            };
          });

          let ballY = 240;
          spawn("paddle_cpu", function(proc) {
            proc.graph = 12;
            proc.x = canvas.width - 40;
            proc.y = 240;
            return function() {
              if (ballY > proc.y + 6) proc.y += 5.2;
              else if (ballY < proc.y - 6) proc.y -= 5.2;
              proc.y = Math.max(40, Math.min(canvas.height - 40, proc.y));
            };
          });

          spawn("ball", function(proc) {
            proc.graph = 11;
            proc.x = 320;
            proc.y = 240;
            let vx = 5, vy = 3;
            return function() {
              proc.x += vx;
              proc.y += vy;
              ballY = proc.y;
              if (proc.y < 16 || proc.y > canvas.height - 16) {
                vy = -vy;
                playSound(7);
              }
              const p1 = collision(proc, "paddle_player");
              const cpu = collision(proc, "paddle_cpu");
              if (p1 && vx < 0) { vx = Math.abs(vx) * 1.05; playSound(1); }
              if (cpu && vx > 0) { vx = -Math.abs(vx) * 1.05; playSound(1); }

              if (proc.x < 0) {
                score_cpu++;
                playSound(3);
                proc.x = 320; proc.y = 240; vx = 5;
              }
              if (proc.x > canvas.width) {
                score_p1++;
                playSound(4);
                proc.x = 320; proc.y = 240; vx = -5;
              }
            };
          });

        } else {
          // Default: Galaxy Defender (Space Shooter)
          // Stars
          const stars = [];
          for (let i = 0; i < 45; i++) {
            stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, spd: Math.random() * 2 + 1 });
          }
          spawn("stars", function(proc) {
            return function() {
              stars.forEach(s => {
                s.y += s.spd;
                if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
                drawBox(s.x, s.y, s.x + 1, s.y + 1, s.spd > 2 ? "#94a3b8" : "#334155");
              });
            };
          });

          // Player ship
          spawn("player", function(proc) {
            proc.graph = 1;
            proc.size = 120;
            proc.x = canvas.width / 2;
            proc.y = canvas.height - 70;
            let cooldown = 0;

            return function() {
              const spd = 5;
              if (keys["arrowleft"] || keys["a"]) proc.x -= spd;
              if (keys["arrowright"] || keys["d"]) proc.x += spd;
              if (keys["arrowup"] || keys["w"]) proc.y -= spd;
              if (keys["arrowdown"] || keys["s"]) proc.y += spd;

              proc.x = Math.max(20, Math.min(canvas.width - 20, proc.x));
              proc.y = Math.max(60, Math.min(canvas.height - 20, proc.y));

              if (cooldown > 0) cooldown--;
              if ((keys[" "] || keys["enter"]) && cooldown === 0) {
                spawn("laser", function(lp) {
                  lp.graph = 2;
                  lp.x = proc.x - 7;
                  lp.y = proc.y - 14;
                  return function() {
                    lp.y -= 9;
                    if (lp.y < -20) lp.isDead = true;
                  };
                });
                spawn("laser", function(lp) {
                  lp.graph = 2;
                  lp.x = proc.x + 7;
                  lp.y = proc.y - 14;
                  return function() {
                    lp.y -= 9;
                    if (lp.y < -20) lp.isDead = true;
                  };
                });
                playSound(1);
                cooldown = 12;
              }

              const alienHit = collision(proc, "alien") || collision(proc, "asteroid");
              if (alienHit) {
                lives--;
                playSound(2);
                alienHit.isDead = true;
                if (lives <= 0) {
                  proc.isDead = true;
                }
              }
            };
          });

          // Spawner
          let spawnTimer = 0;
          spawn("director", function(proc) {
            return function() {
              spawnTimer++;
              if (spawnTimer % 55 === 0) {
                spawn("alien", function(ap) {
                  ap.graph = Math.random() > 0.5 ? 3 : 4;
                  ap.size = 115;
                  ap.x = Math.random() * (canvas.width - 80) + 40;
                  ap.y = -20;
                  let dir = Math.random() > 0.5 ? 1 : -1;
                  return function() {
                    ap.y += 2.2;
                    ap.x += dir * 2;
                    if (ap.x < 30 || ap.x > canvas.width - 30) dir = -dir;
                    const hit = collision(ap, "laser");
                    if (hit) {
                      score += 150;
                      playSound(2);
                      hit.isDead = true;
                      ap.isDead = true;
                    }
                    if (ap.y > canvas.height + 30) ap.isDead = true;
                  };
                });
              }

              if (spawnTimer % 140 === 0) {
                spawn("asteroid", function(asp) {
                  asp.graph = 7;
                  asp.size = 130;
                  asp.x = Math.random() * (canvas.width - 80) + 40;
                  asp.y = -30;
                  return function() {
                    asp.y += 2.6;
                    asp.angle += 3;
                    const hit = collision(asp, "laser");
                    if (hit) {
                      score += 80;
                      playSound(2);
                      hit.isDead = true;
                      asp.isDead = true;
                    }
                    if (asp.y > canvas.height + 40) asp.isDead = true;
                  };
                });
              }
            };
          });

        } else if (PRESET_ID === "mode7_kart") {
          // DIV Super Kart 3D (Modo 7)
          let vel = 0;
          let kartX = 400;
          let kartY = 850;

          // Circuit track trees and coins
          for (let a = 0; a < 360; a += 18) {
            const rad = (a * Math.PI) / 180;
            spawn("tree", function(p) {
              p.graph = 22; p.x = 400 + Math.cos(rad) * 410; p.y = 400 + Math.sin(rad) * 410;
              return function() {};
            });
            spawn("tree", function(p) {
              p.graph = 22; p.x = 400 + Math.cos(rad) * 230; p.y = 400 + Math.sin(rad) * 230;
              return function() {};
            });
            if (a % 36 === 0) {
              spawn("coin", function(p) {
                p.graph = 24; p.x = 400 + Math.cos(rad) * 320; p.y = 400 + Math.sin(rad) * 320;
                return function() {
                  if (Math.hypot(p.x - kartX, p.y - kartY) < 35) {
                    p.isDead = true;
                    score += 100;
                    playSound(4);
                  }
                };
              });
            }
          }

          // Player kart
          spawn("kart_player", function(proc) {
            proc.graph = 20;
            proc.x = 400;
            proc.y = 850;
            proc.angle = 90;
            return function() {
              if (keys["arrowup"] || keys["w"]) vel = Math.min(10, vel + 0.2);
              else vel = Math.max(0, vel - 0.08);
              if (keys["arrowdown"] || keys["s"]) vel = Math.max(-2, vel - 0.25);
              if (keys["arrowleft"] || keys["a"]) proc.angle -= (vel > 2 ? 3.5 : 2);
              if (keys["arrowright"] || keys["d"]) proc.angle += (vel > 2 ? 3.5 : 2);

              const rad = (proc.angle * Math.PI) / 180;
              proc.x += Math.sin(rad) * vel;
              proc.y += Math.cos(rad) * vel;
              kartX = proc.x;
              kartY = proc.y;
            };
          });

          // Rivals
          [100, 220].forEach((startA, idx) => {
            let curA = startA;
            spawn("kart_rival", function(proc) {
              proc.graph = 21;
              const r = 320 + (idx === 0 ? -15 : 15);
              return function() {
                curA += 0.5;
                const rad = (curA * Math.PI) / 180;
                proc.x = 400 + Math.cos(rad) * r;
                proc.y = 400 + Math.sin(rad) * r;
                proc.angle = curA + 90;
              };
            });
          });

        } else if (PRESET_ID === "mode8_dungeon") {
          // Dungeon Crypt 3D (Modo 8)
          let posX = 3.5;
          let posY = 3.5;
          let angle = 0;
          let cooldown = 0;

          spawn("player_fps", function(proc) {
            proc.x = posX * 64;
            proc.y = posY * 64;
            return function() {
              if (keys["arrowleft"] || keys["a"]) angle -= 3.2;
              if (keys["arrowright"] || keys["d"]) angle += 3.2;
              const rad = (angle * Math.PI) / 180;
              const dirX = Math.cos(rad);
              const dirY = Math.sin(rad);

              let nx = posX;
              let ny = posY;
              if (keys["arrowup"] || keys["w"]) { nx += dirX * 0.06; ny += dirY * 0.06; }
              if (keys["arrowdown"] || keys["s"]) { nx -= dirX * 0.04; ny -= dirY * 0.04; }

              if (nx >= 1.2 && nx <= 14.8) posX = nx;
              if (ny >= 1.2 && ny <= 14.8) posY = ny;
              proc.x = posX * 64;
              proc.y = posY * 64;
              proc.angle = angle;

              if (cooldown > 0) cooldown--;
              if ((keys[" "] || keys["enter"]) && cooldown === 0) {
                cooldown = 15;
                playSound(1);
                for (const p of processes) {
                  if (p.graph === 27 && !p.isDead) {
                    const ex = p.x / 64 - posX;
                    const ey = p.y / 64 - posY;
                    const edist = Math.hypot(ex, ey);
                    const eang = (Math.atan2(ey, ex) * 180) / Math.PI;
                    let diff = (eang - angle + 360) % 360;
                    if (diff > 180) diff -= 360;
                    if (Math.abs(diff) < 22 && edist < 7) {
                      p.isDead = true;
                      score += 250;
                      playSound(2);
                    }
                  }
                }
              }
            };
          });

          // Dungeon objects
          spawn("monster", function(p) { p.graph = 27; p.x = 9 * 64; p.y = 4 * 64; return function() {}; });
          spawn("monster", function(p) { p.graph = 27; p.x = 7 * 64; p.y = 10 * 64; return function() {}; });
          spawn("torch", function(p) { p.graph = 28; p.x = 3 * 64; p.y = 3 * 64; return function() {}; });
          spawn("torch", function(p) { p.graph = 28; p.x = 7 * 64; p.y = 3 * 64; return function() {}; });
          spawn("barrel", function(p) { p.graph = 29; p.x = 4 * 64; p.y = 5 * 64; return function() {}; });
          spawn("coin", function(p) { p.graph = 24; p.x = 5 * 64; p.y = 9 * 64; return function() {}; });
        }
      }

      function resetGame() {
        initGame();
      }

      // Main Loop at 60 FPS
      function gameLoop() {
        if (!isRunning) return;

        // Clear dynamic frame primitives and texts
        primitives = [];
        texts = [];

        // Tick active processes
        for (let i = processes.length - 1; i >= 0; i--) {
          const p = processes[i];
          if (p.isDead) {
            processes.splice(i, 1);
            continue;
          }
          if (p.tick) p.tick();
        }

        if (PRESET_ID === "mode7_kart") {
          // Mode 7 3D Perspective Ground
          const playerKart = processes.find(p => p.name === "kart_player") || { x: 400, y: 850, angle: 90 };
          const horizon = Math.floor(canvas.height * 0.42);
          const camH = 46;
          const fov = 210;
          const angRad = (playerKart.angle * Math.PI) / 180;
          const cos = Math.cos(angRad);
          const sin = Math.sin(angRad);
          const camX = playerKart.x - Math.sin(angRad) * 80;
          const camY = playerKart.y - Math.cos(angRad) * 80;

          // Sky
          const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
          skyGrad.addColorStop(0, "#050b18");
          skyGrad.addColorStop(1, "#1e3a8a");
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, canvas.width, horizon);

          // Perspective Scanlines
          for (let sy = horizon; sy < canvas.height; sy += 2) {
            const dy = sy - horizon + 0.1;
            const dist = (camH * fov) / dy;
            const midX = camX + dist * Math.sin(angRad);
            const midY = camY + dist * Math.cos(angRad);

            const trackDist = Math.hypot(midX - 400, midY - 400);
            const onRoad = Math.abs(trackDist - 320) < 65;
            const onKerb = Math.abs(trackDist - 320) >= 65 && Math.abs(trackDist - 320) < 78;

            let col = "#14532d";
            if (onKerb) {
              const kp = Math.floor(Math.atan2(midY - 400, midX - 400) * 24) % 2 === 0;
              col = kp ? "#dc2626" : "#f8fafc";
            } else if (onRoad) {
              col = "#1e293b";
            } else {
              const gx = Math.floor(midX / 40);
              const gy = Math.floor(midY / 40);
              col = (gx + gy) % 2 === 0 ? "#14532d" : "#166534";
            }
            ctx.fillStyle = col;
            ctx.fillRect(0, sy, canvas.width, 2);
          }

          // 3D Billboards
          const bbs = [];
          for (const p of processes) {
            if (p.isDead || p.graph <= 0) continue;
            if (p.name === "kart_player") {
              bbs.push({ p, rotZ: 10, sx: canvas.width / 2, sy: canvas.height - 48, scale: 1.3 });
              continue;
            }
            const dx = p.x - camX;
            const dy = p.y - camY;
            const rx = dx * cos - dy * sin;
            const rz = dx * sin + dy * cos;
            if (rz > 12) {
              const sc = fov / rz;
              const sx = canvas.width / 2 + rx * sc;
              const sy = horizon + camH * sc;
              if (sx >= -100 && sx <= canvas.width + 100) {
                bbs.push({ p, rotZ: rz, sx, sy, scale: sc });
              }
            }
          }
          bbs.sort((a, b) => b.rotZ - a.rotZ);

          for (const b of bbs) {
            const s = spriteImages.get(b.p.graph);
            if (!s || !s.image) continue;
            ctx.save();
            ctx.translate(b.sx, b.sy);
            const sprScale = ((b.p.size || 100) / 100) * b.scale;
            ctx.scale(sprScale, sprScale);
            const cx = s.cx || s.width / 2;
            const cy = s.cy || s.height / 2;
            ctx.drawImage(s.image, -cx, -cy);
            ctx.restore();
          }

        } else if (PRESET_ID === "mode8_dungeon") {
          // Mode 8 Raycaster Engine
          const pFps = processes.find(p => p.name === "player_fps") || { x: 224, y: 224, angle: 0 };
          const posX = pFps.x / 64;
          const posY = pFps.y / 64;
          const dirRad = (pFps.angle * Math.PI) / 180;
          const dirX = Math.cos(dirRad);
          const dirY = Math.sin(dirRad);
          const planeX = -dirY * 0.66;
          const planeY = dirX * 0.66;
          const halfH = Math.floor(canvas.height / 2);

          // Ceiling & Floor
          ctx.fillStyle = "#0a0f1d";
          ctx.fillRect(0, 0, canvas.width, halfH);
          ctx.fillStyle = "#111827";
          ctx.fillRect(0, halfH, canvas.width, halfH);

          // DDA Raycasting
          const colW = 2;
          const numCols = Math.ceil(canvas.width / colW);
          const zBuf = new Float32Array(numCols);

          for (let c = 0; c < numCols; c++) {
            const camX = (2 * c) / numCols - 1;
            const rX = dirX + planeX * camX;
            const rY = dirY + planeY * camX;

            let mX = Math.floor(posX);
            let mY = Math.floor(posY);
            const dX = Math.abs(1 / (rX || 1e-6));
            const dY = Math.abs(1 / (rY || 1e-6));
            let sX = rX < 0 ? -1 : 1;
            let sY = rY < 0 ? -1 : 1;
            let sdX = rX < 0 ? (posX - mX) * dX : (mX + 1.0 - posX) * dX;
            let sdY = rY < 0 ? (posY - mY) * dY : (mY + 1.0 - posY) * dY;

            let hit = 0;
            let side = 0;
            let steps = 0;
            while (hit === 0 && steps < 28) {
              steps++;
              if (sdX < sdY) { sdX += dX; mX += sX; side = 0; }
              else { sdY += dY; mY += sY; side = 1; }
              if (mX <= 0 || mX >= 15 || mY <= 0 || mY >= 15) { hit = 1; }
              else if ((mX === 6 && mY >= 2 && mY <= 7) || (mX === 10 && mY >= 6 && mY <= 12)) { hit = 1; }
            }

            let dist = side === 0 ? (mX - posX + (1 - sX) / 2) / (rX || 1e-6) : (mY - posY + (1 - sY) / 2) / (rY || 1e-6);
            dist = Math.max(0.1, dist);
            zBuf[c] = dist;

            const lineH = Math.floor((canvas.height / dist) * 1.05);
            const dStart = Math.max(0, Math.floor(-lineH / 2 + halfH));
            const dEnd = Math.min(canvas.height - 1, Math.floor(lineH / 2 + halfH));

            // Wall texture 25 or fallback
            const wallTex = spriteImages.get(25);
            if (wallTex && wallTex.image) {
              let wX = side === 0 ? posY + dist * rY : posX + dist * rX;
              wX -= Math.floor(wX);
              const texX = Math.floor(wX * wallTex.width);
              ctx.drawImage(wallTex.image, texX, 0, 1, wallTex.height, c * colW, dStart, colW, dEnd - dStart);
              if (side === 1 || dist > 6) {
                const shade = Math.min(0.85, (side === 1 ? 0.3 : 0) + dist / 14);
                ctx.fillStyle = "rgba(3, 7, 18, " + shade + ")";
                ctx.fillRect(c * colW, dStart, colW, dEnd - dStart);
              }
            } else {
              ctx.fillStyle = side === 1 ? "#7f1d1d" : "#991b1b";
              ctx.fillRect(c * colW, dStart, colW, dEnd - dStart);
            }
          }

          // 3D Monsters & Sprites
          const sprites3d = [];
          for (const p of processes) {
            if (p.isDead || p.graph <= 0 || p.name === "player_fps") continue;
            const dist = Math.hypot(p.x / 64 - posX, p.y / 64 - posY);
            sprites3d.push({ p, dist });
          }
          sprites3d.sort((a, b) => b.dist - a.dist);

          for (const item of sprites3d) {
            const p = item.p;
            const sx = p.x / 64 - posX;
            const sy = p.y / 64 - posY;
            const invDet = 1.0 / (planeX * dirY - dirX * planeY);
            const tx = invDet * (dirY * sx - dirX * sy);
            const ty = invDet * (-planeY * sx + planeX * sy);
            if (ty <= 0.25) continue;

            const sprScreenX = Math.floor((canvas.width / 2) * (1 + tx / ty));
            const sprH = Math.abs(Math.floor(canvas.height / ty));
            const sprW = sprH;
            const dStartX = Math.max(0, Math.floor(-sprW / 2 + sprScreenX));
            const dEndX = Math.min(canvas.width - 1, Math.floor(sprW / 2 + sprScreenX));
            const dStartY = Math.max(0, Math.floor(-sprH / 2 + halfH));
            const dEndY = Math.min(canvas.height - 1, Math.floor(sprH / 2 + halfH));

            const s = spriteImages.get(p.graph);
            if (!s || !s.image) continue;

            for (let stripe = dStartX; stripe < dEndX; stripe += colW) {
              const colIdx = Math.floor(stripe / colW);
              if (colIdx >= 0 && colIdx < numCols && ty < zBuf[colIdx]) {
                const texX = Math.floor(((stripe - (-sprW / 2 + sprScreenX)) * s.width) / sprW);
                if (texX >= 0 && texX < s.width) {
                  ctx.drawImage(s.image, texX, 0, 1, s.height, stripe, dStartY, colW, dEndY - dStartY);
                }
              }
            }
          }

          // First-person Plasma Blaster HUD (ID 30)
          const weapon = spriteImages.get(30);
          if (weapon && weapon.image) {
            const wSize = 135;
            ctx.drawImage(weapon.image, canvas.width / 2 - wSize / 2, canvas.height - wSize + 10, wSize, wSize);
          }

        } else {
          // Standard 2D Render Background
          ctx.fillStyle = PRESET_ID === "platformer" ? "#0f172a" : (PRESET_ID === "cyber_pong" ? "#0b0f19" : "#070b14");
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Render Primitives
          for (const prim of primitives) {
            ctx.fillStyle = prim.color || "#fff";
            ctx.fillRect(
              Math.min(prim.x1, prim.x2),
              Math.min(prim.y1, prim.y2),
              Math.abs(prim.x2 - prim.x1),
              Math.abs(prim.y2 - prim.y1)
            );
          }

          // Render Sprites
          for (const p of processes) {
            if (p.isDead || p.graph <= 0) continue;
            const s = spriteImages.get(p.graph);
            if (!s || !s.image) continue;

            ctx.save();
            ctx.translate(p.x, p.y);

            if (p.angle !== 0) {
              ctx.rotate((p.angle * Math.PI) / 180);
            }

            const scale = (p.size || 100) / 100;
            let sx = scale;
            let sy = scale;
            if (p.flags & 1) sx = -sx;
            if (p.flags & 2) sy = -sy;
            ctx.scale(sx, sy);

            if (p.alpha < 255) {
              ctx.globalAlpha = p.alpha / 255;
            }

            const cx = s.cx || s.width / 2;
            const cy = s.cy || s.height / 2;
            ctx.drawImage(s.image, -cx, -cy);
            ctx.restore();
          }
        }

        // Render HUD
        ctx.font = '13px monospace';
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "top";

        if (PRESET_ID === "mode7_kart") {
          ctx.fillText("${title.toUpperCase()} [MODO 7]", 20, 20);
          ctx.fillText("SCORE: " + score, 20, 42);
          ctx.fillText("VUELTA: 1/3", canvas.width - 120, 20);
          ctx.fillText("FLECHAS / WASD: Conducir", 20, canvas.height - 30);
        } else if (PRESET_ID === "mode8_dungeon") {
          ctx.fillText("${title.toUpperCase()} [MODO 8]", 20, 20);
          ctx.fillText("SALUD: 100", 20, 42);
          ctx.fillText("SCORE: " + score, 130, 42);
          ctx.fillText("WASD: Moverse | ESPACIO: Disparar", 20, canvas.height - 30);
        } else if (PRESET_ID === "platformer") {
          ctx.fillText("${title.toUpperCase()}", 20, 20);
          ctx.fillText("GOLD: " + gold, 20, 42);
          ctx.fillText("HP: " + hp, canvas.width - 100, 42);
        } else if (PRESET_ID === "cyber_pong") {
          ctx.textAlign = "center";
          ctx.fillText("${title.toUpperCase()}", canvas.width / 2, 20);
          ctx.fillText("P1: " + score_p1 + "   CPU: " + score_cpu, canvas.width / 2, 45);
          ctx.textAlign = "left";
        } else {
          ctx.fillText("${title.toUpperCase()}", 20, 20);
          ctx.fillText("SCORE: " + score, 20, 42);
          ctx.fillText("LIVES: " + lives, canvas.width - 100, 42);
          if (lives <= 0) {
            ctx.fillStyle = "#ef4444";
            ctx.font = 'bold 22px monospace';
            ctx.textAlign = "center";
            ctx.fillText("¡GAME OVER!", canvas.width / 2, canvas.height / 2 - 10);
            ctx.font = '12px monospace';
            ctx.fillStyle = "#94a3b8";
            ctx.fillText("Pulsa [R] para volver a jugar", canvas.width / 2, canvas.height / 2 + 20);
            ctx.textAlign = "left";
          }
        }

        requestAnimationFrame(gameLoop);
      }

      // UI Button hooks
      document.getElementById("btnSound").onclick = function() {
        soundEnabled = !soundEnabled;
        this.innerText = soundEnabled ? "🔊 Sonido" : "🔇 Mudo";
        this.classList.toggle("active", !soundEnabled);
      };

      const overlay = document.getElementById("scanlinesOverlay");
      document.getElementById("btnScanlines").onclick = function() {
        const isShown = overlay.style.display !== "none";
        overlay.style.display = isShown ? "none" : "block";
        this.classList.toggle("active", !isShown);
      };

      document.getElementById("btnFullscreen").onclick = function() {
        if (!document.fullscreenElement) {
          canvas.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      };

      const codeDrawer = document.getElementById("codeDrawer");
      document.getElementById("btnCode").onclick = function() {
        const isOpen = codeDrawer.style.display === "block";
        codeDrawer.style.display = isOpen ? "none" : "block";
        this.classList.toggle("active", !isOpen);
      };

      document.getElementById("btnRestart").onclick = resetGame;

      // Start
      initGame();
      requestAnimationFrame(gameLoop);
    })();
  </script>
</body>
</html>`;
}

/**
 * Builds and downloads the full project as a standalone ZIP package.
 */
export async function exportProjectToZip(options: ExportZipOptions): Promise<Blob> {
  const { gameTitle, code, fpg, resolution, presetId, onProgress } = options;
  const zip = new JSZip();

  onProgress?.(10, "Iniciando empaquetado del proyecto...");

  // 1. Root index.html standalone launcher
  const standaloneHtml = generateStandaloneHtml(gameTitle, code, resolution, fpg, presetId);
  zip.file("index.html", standaloneHtml);

  // 2. Raw DIV Game Source Code
  const safeFilename = gameTitle.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  zip.file(`src/${safeFilename}.div`, code);
  zip.file("src/main.div", code);

  onProgress?.(30, "Generando sprites FPG y texturas PNG...");

  // 3. FPG Library and individual sprite PNGs
  const assetsFolder = zip.folder("assets");
  const spritesFolder = zip.folder("assets/sprites");
  const mapsFolder = zip.folder("assets/maps");

  // Export FPG definition JSON
  const fpgMetadata = {
    name: `${gameTitle}_library.fpg`,
    version: "3.0",
    resolution,
    count: fpg.length,
    sprites: fpg.map((g) => ({
      id: g.id,
      name: g.name,
      width: g.width,
      height: g.height,
      cx: g.cx ?? Math.floor(g.width / 2),
      cy: g.cy ?? Math.floor(g.height / 2),
      filename: `sprite_${g.id}_${g.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`,
    })),
  };
  assetsFolder?.file("sprites.fpg.json", JSON.stringify(fpgMetadata, null, 2));

  // Export every individual sprite as a true PNG file
  for (let i = 0; i < fpg.length; i++) {
    const graphic = fpg[i];
    const dataUrl = graphicToPngDataUrl(graphic);
    if (dataUrl && spritesFolder) {
      const bytes = dataUrlToUint8Array(dataUrl);
      const filename = `sprite_${graphic.id}_${graphic.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`;
      spritesFolder.file(filename, bytes);
    }
  }

  onProgress?.(60, "Generando mapas de fondo y texturas de escenario...");

  // 4. Background maps
  const [resW, resH] = resolution.split("x").map(Number);
  const mapDataUrl = generateSampleMapPng(resW || 640, resH || 480);
  if (mapDataUrl && mapsFolder) {
    const mapBytes = dataUrlToUint8Array(mapDataUrl);
    mapsFolder.file("map_background.png", mapBytes);
    mapsFolder.file(
      "map_background.json",
      JSON.stringify(
        {
          name: "Background Starfield & Scenery Map",
          width: resW || 640,
          height: resH || 480,
          format: "PNG",
          layers: ["background", "parallax_stars", "collision_geometry"],
        },
        null,
        2
      )
    );
  }

  onProgress?.(80, "Creando manifiesto del proyecto y documentación...");

  // 5. Project Manifest
  const projectManifest = {
    title: gameTitle,
    engine: "WXDIV 3.0 Game Engine",
    version: "3.0.0",
    resolution,
    fps: 60,
    mainEntry: "index.html",
    sourceFile: `src/${safeFilename}.div`,
    exportedAt: new Date().toISOString(),
    files: {
      htmlLauncher: "index.html",
      divSource: `src/${safeFilename}.div`,
      fpgLibrary: "assets/sprites.fpg.json",
      spritesDirectory: "assets/sprites/",
      mapsDirectory: "assets/maps/",
    },
  };
  zip.file("project.json", JSON.stringify(projectManifest, null, 2));

  // 6. Spanish/English Readme
  const readmeContent = `# ${gameTitle}
Desarrollado con **WXDIV 3.0** (DIV Games Studio HTML5 Engine).

## 🚀 Cómo jugar
1. Haz doble clic en **\`index.html\`** para abrir el juego en cualquier navegador (Chrome, Firefox, Safari, Edge).
2. ¡No requiere servidores ni dependencias externas! Funciona directamente de forma local.

## 🎮 Controles
- **Moverse:** Flechas de dirección [↑, ↓, ←, →] o teclas [W, A, S, D]
- **Acción / Disparo:** Tecla [Espacio] o [Enter]
- **Reiniciar partida:** Tecla [R]
- **Dispositivos móviles:** El juego incluye mandos virtuales táctiles en pantalla (D-Pad + Botones A/B).

## 📁 Estructura del proyecto
- \`index.html\`: Lanzador y motor de ejecución completo e independiente.
- \`src/\`: Contiene el código fuente original en lenguaje DIV Games Studio (\`.div\`).
- \`assets/sprites/\`: Todos los gráficos y sprites exportados individualmente en formato PNG.
- \`assets/maps/\`: Mapas y texturas de escenario en formato PNG y JSON.
- \`assets/sprites.fpg.json\`: Descriptores de la biblioteca gráfica FPG con puntos de control (cx, cy).
- \`project.json\`: Manifiesto completo de configuración del proyecto.

© ${new Date().getFullYear()} WXDIV 3.0 Game Engine.
`;
  zip.file("README.md", readmeContent);
  zip.file("LEEME.txt", readmeContent);

  onProgress?.(95, "Comprimiendo archivo ZIP...");

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  onProgress?.(100, "¡Archivo ZIP completado con éxito!");

  return blob;
}

/**
 * Triggers automatic browser download of the exported ZIP file
 */
export function triggerZipDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".zip") ? filename : `${filename}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
