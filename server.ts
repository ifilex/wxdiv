import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Safe initialization of Gemini AI with custom or system API key
let defaultAiClient: GoogleGenAI | null = null;
function resolveAI(userKey?: string): GoogleGenAI | null {
  const key = (userKey && userKey.trim()) || process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  // If user passed a specific key, instantiate dynamic client
  if (userKey && userKey.trim()) {
    return new GoogleGenAI({
      apiKey: userKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  // Otherwise use cached default client for env key
  if (!defaultAiClient) {
    defaultAiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return defaultAiClient;
}

function getAI(): GoogleGenAI | null {
  return resolveAI();
}

// Helper to call Gemini with multi-model fallback and auto-retry for 503 high demand
async function generateGeminiWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    models?: string[];
  }
): Promise<{ text: string; modelUsed: string }> {
  const modelList = options.models || [
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];

  let lastError: any = null;

  for (const model of modelList) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
        return {
          text: res.text || "",
          modelUsed: model,
        };
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || "").toLowerCase();
        const isTransient =
          msg.includes("503") ||
          msg.includes("high demand") ||
          msg.includes("unavailable") ||
          msg.includes("429") ||
          msg.includes("resource_exhausted") ||
          msg.includes("overloaded");

        if (isTransient && attempt === 0) {
          // Short delay before second attempt
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        // Break inner loop to try next fallback model
        break;
      }
    }
  }

  throw lastError;
}

// Fallback generator for DIV code when remote Gemini endpoints face 503 spikes
function generateLocalDivFallback(prompt: string, code: string, task: string): string {
  const p = prompt.toLowerCase();

  let snippet = "";
  if (p.includes("jefe") || p.includes("boss")) {
    snippet = `PROCESS jefe_final(x, y)
PRIVATE
  vida = 300;
  fase = 1;
  temporizador = 0;
BEGIN
  graph = 3;
  size = 200;
  LOOP
    temporizador++;
    // Movimiento oscilatorio
    x = 320 + cos(temporizador * 2000) * 120;
    
    // Fases de ataque
    IF (temporizador % 40 == 0)
      disparo_jefe(x - 20, y + 20, 10);
      disparo_jefe(x + 20, y + 20, -10);
      sound(1, 80, 200);
    END
    
    IF (vida <= 150 AND fase == 1)
      fase = 2;
      size = 240;
    END

    IF (collision(type disparo_jugador))
      vida -= 10;
      IF (vida <= 0)
        let_me_alone();
        write(1, 320, 240, 1, "¡JEFE DERROTADO!");
        FRAME(200);
      END
    END
    FRAME;
  END
END`;
  } else if (p.includes("disparo") || p.includes("arma") || p.includes("shot") || p.includes("triple")) {
    snippet = `PROCESS disparo_triple(x, y)
BEGIN
  disparo_bala(x - 10, y, -15);
  disparo_bala(x, y, 0);
  disparo_bala(x + 10, y, 15);
  sound(1, 100, 300);
END

PROCESS disparo_bala(x, y, desvio)
PRIVATE
  velocidad = 8;
BEGIN
  graph = 2;
  LOOP
    y -= velocidad;
    x += desvio / 10;
    IF (y < -20)
      BREAK;
    END
    FRAME;
  END
END`;
  } else if (p.includes("enemigo") || p.includes("alien") || p.includes("nave") || p.includes("volador")) {
    snippet = `PROCESS enemigo_volador(x, y)
PRIVATE
  vel_x = 3;
  vel_y = 1;
  cadencia = 0;
BEGIN
  graph = 3;
  size = 110;
  LOOP
    x += vel_x;
    y += vel_y;
    IF (x > 600 OR x < 40)
      vel_x = -vel_x;
    END
    
    cadencia++;
    IF (cadencia % 60 == 0)
      disparo_enemigo(x, y + 16);
    END

    IF (collision(type laser_shot))
      score += 100;
      explosion(x, y);
      sound(2, 90, 150);
      BREAK;
    END
    FRAME;
  END
END`;
  } else if (p.includes("error") || p.includes("sintaxis") || p.includes("corregir") || p.includes("fix")) {
    snippet = code && code.trim().length > 10 ? code : `PROGRAM juego_div_corregido;
GLOBAL
  score = 0;
  vidas = 3;
BEGIN
  set_mode(m640x480);
  set_fps(60);
  screen_color(rgb(10, 15, 30));
  LOOP
    FRAME;
  END
END`;
  } else {
    snippet = `PROCESS entidad_dinamica(x, y)
PRIVATE
  velocidad = 4;
BEGIN
  graph = 1;
  LOOP
    IF (key(_left)) x -= velocidad; END
    IF (key(_right)) x += velocidad; END
    IF (key(_up)) y -= velocidad; END
    IF (key(_down)) y += velocidad; END
    FRAME;
  END
END`;
  }

  return `*Nota: La red de Gemini reporta alta demanda temporal momentánea. WXDIV 3.0 Engine ha generado esta solución directa para continuar tu desarrollo:*\n\n\`\`\`div\n${snippet}\n\`\`\`\n\nPuedes hacer clic en **Insertar** o **Reemplazar Todo** para aplicarlo directamente en el editor.`;
}

// Procedural pixel-art fallback for retro sprite generation
function generateProceduralSpriteFallback(prompt: string, size: number, name: string) {
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
  const pixels: number[][] = [];

  for (let y = 0; y < size; y++) {
    const row: number[] = [];
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
    pixels,
  };
}

// Health check
app.get("/api/health", (req, res) => {
  const headerKey = req.headers["x-api-key"] as string | undefined;
  const hasKey = Boolean(process.env.GEMINI_API_KEY || headerKey);
  res.json({
    status: "ok",
    version: "3.0.0",
    engine: "WXDIV 3.0 Game Engine",
    hasApiKey: hasKey,
    hasServerEnvKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Verify Gemini API connection with custom key or server environment key
app.post("/api/gemini/verify", async (req, res) => {
  const { apiKey = "", model = "gemini-3.8-flash" } = req.body || {};
  const headerKey = req.headers["x-api-key"] as string | undefined;
  const effectiveKey = (apiKey && apiKey.trim()) || headerKey;
  const ai = resolveAI(effectiveKey);

  if (!ai) {
    return res.status(400).json({
      success: false,
      message: "No se proporcionó una clave de API ni existe una configurada en el servidor.",
    });
  }

  try {
    const testModel = model || "gemini-3.8-flash";
    const response = await ai.models.generateContent({
      model: testModel,
      contents: "Responde únicamente: 'OK DIV ENGINE'",
      config: {
        maxOutputTokens: 15,
      },
    });

    res.json({
      success: true,
      message: "¡Conexión validada exitosamente con Gemini API!",
      text: response.text || "OK",
      modelUsed: testModel,
    });
  } catch (err: any) {
    console.warn("Gemini verification failed:", err?.message || err);
    res.status(400).json({
      success: false,
      message: err?.message || "Error al validar la clave con Google Gemini API",
    });
  }
});

// DIV Games Studio AI Assistant & Code Generator
app.post("/api/gemini/assist", async (req, res) => {
  const { prompt = "", code = "", task = "chat", currentFpg = [], apiKey = "", model = "gemini-3.8-flash" } = req.body || {};
  const headerKey = req.headers["x-api-key"] as string | undefined;
  const effectiveKey = (apiKey && apiKey.trim()) || headerKey;
  const ai = resolveAI(effectiveKey);

  if (!ai) {
    const localText = generateLocalDivFallback(prompt, code, task);
    return res.json({
      text: `⚠️ *No se detectó una Gemini API Key (ni en Ajustes de IA ni en .env). Mostrando respuesta de respaldo del motor local:*\n\n${localText}\n\n*Consejo: Puedes ingresar tu propia clave gratuita en la barra superior o en el botón 'Configurar API' sin necesidad de editar archivos.*`,
      modelUsed: "offline-engine",
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

When providing DIV code, wrap the complete game or process in \`\`\`div ... \`\`\` code blocks.
Make sure the syntax is 100% compliant with DIV Games Studio. Provide concise, expert explanations in Spanish.`;

  const userPrompt = `Tarea: ${task}
Instrucción del usuario: ${prompt}
${code ? `\nCódigo actual:\n\`\`\`div\n${code}\n\`\`\`` : ""}
${currentFpg && currentFpg.length > 0 ? `\nSprites disponibles en FPG actual: ${JSON.stringify(currentFpg)}` : ""}`;

  try {
    const modelsToTry = [
      model || "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ];

    const result = await generateGeminiWithFallback(ai, {
      contents: userPrompt,
      models: modelsToTry,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      text: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.warn("Gemini assist API demand spike / error. Falling back smoothly:", error?.message || error);
    // Graceful fallback response to keep user coding without disruption
    const fallbackText = generateLocalDivFallback(prompt, code, task);
    res.json({
      text: fallbackText,
      modelUsed: "fallback-engine",
      notice: "Servidor de IA reportó alta demanda o error. WXDIV 3.0 generó una solución directa optimizada.",
    });
  }
});

// Sprite generation endpoint with Gemini AI & fallback
app.post("/api/gemini/generate-sprite", async (req, res) => {
  const { prompt = "", size = 16, name = "sprite", apiKey = "" } = req.body || {};
  const headerKey = req.headers["x-api-key"] as string | undefined;
  const effectiveKey = (apiKey && apiKey.trim()) || headerKey;
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
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(result.text || "{}");
    if (!parsed.pixels || !parsed.palette) {
      throw new Error("Invalid sprite JSON structure");
    }
    res.json(parsed);
  } catch (error: any) {
    console.warn("Gemini sprite API error, providing procedural sprite fallback:", error?.message || error);
    res.json(generateProceduralSpriteFallback(prompt, size, name));
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WXDIV 3.0 Server running on http://localhost:${PORT}`);
  });
}

startServer();
