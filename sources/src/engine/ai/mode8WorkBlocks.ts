import { Mode8CameraMode } from "../../types";

export interface Mode8SceneContext {
  levelTitle: string;
  sectorCount: number;
  linedefCount: number;
  placedModelsCount: number;
  placedVoxelsCount: number;
  customModels: Array<{ id: string; name: string }>;
  customTextures: Array<{ name: string; displayName: string }>;
  cameraMode: Mode8CameraMode;
  skyTexture: string;
  gameMode: "shooter" | "exploration" | "survival";
  selectedSectorId: number | null;
  playerPos: { x: number; y: number };
}

export type Mode8AiAction =
  | {
      type: "add_platform";
      x?: number;
      y?: number;
      width?: number;
      depth?: number;
      floorHeight?: number;
      ceilHeight?: number;
      flatTex?: string;
      wallTex?: string;
      label?: string;
    }
  | {
      type: "add_stairs";
      x?: number;
      y?: number;
      steps?: number;
      startHeight?: number;
      endHeight?: number;
      direction?: "north" | "east" | "south" | "west";
    }
  | {
      type: "add_voxel";
      voxelId: string;
      x?: number;
      y?: number;
      count?: number;
      spacing?: number;
    }
  | {
      type: "add_model";
      modelId: string;
      role?: "enemy" | "ally" | "prop" | "goal";
      x?: number;
      y?: number;
      count?: number;
    }
  | {
      type: "set_sky_camera";
      skyTexture?: string;
      cameraMode?: Mode8CameraMode;
      gameMode?: "shooter" | "exploration" | "survival";
    }
  | {
      type: "paint_material";
      flatTex: string;
      wallTex: string;
      scope?: "selected" | "all";
    }
  | {
      type: "build_template";
      template: "arena_pelea" | "circuito_obstaculos" | "laberinto" | "isla_monedas";
    };

export interface Mode8WorkBlock {
  id: string;
  title: string;
  shortDesc: string;
  category: "geometria" | "objetos" | "ambiente" | "escena";
  prompt: string;
  actions: Mode8AiAction[];
  divSnippet: string;
}

export const MODE8_WORK_BLOCKS: Mode8WorkBlock[] = [
  {
    id: "wb_platform",
    title: "Plataforma 3D",
    shortDesc: "Bloque elevado seguro para saltar",
    category: "geometria",
    prompt: "Agrega una plataforma elevada azul delante del jugador",
    actions: [
      {
        type: "add_platform",
        width: 2,
        depth: 2,
        floorHeight: 0.75,
        ceilHeight: 3.5,
        flatTex: "STUD_FLOOR_BLUE",
        wallTex: "STUD_WALL_BLUE",
        label: "Plataforma elevada",
      },
    ],
    divSnippet: `// Bloque de Trabajo: Plataforma 3D\nm8_set_doom_sector(10, 0.75, 3.50, "STUD_FLOOR_BLUE", "SKY_ROBLOX", 240, 0, 0);`,
  },
  {
    id: "wb_stairs",
    title: "Escalera 3D",
    shortDesc: "6 peldaños suaves para subir",
    category: "geometria",
    prompt: "Crea una escalera de 6 peldaños para subir al siguiente nivel",
    actions: [
      {
        type: "add_stairs",
        steps: 6,
        startHeight: 0,
        endHeight: 1.5,
        direction: "north",
      },
    ],
    divSnippet: `// Bloque de Trabajo: Escalera 3D\n// Genera 6 sectores progresivos de 0.0m a 1.5m`,
  },
  {
    id: "wb_coins",
    title: "5 Monedas",
    shortDesc: "Hilera de monedas coleccionables",
    category: "objetos",
    prompt: "Coloca 5 monedas 3D en línea delante del jugador",
    actions: [
      {
        type: "add_voxel",
        voxelId: "voxel_coin",
        count: 5,
        spacing: 1.2,
      },
    ],
    divSnippet: `// Bloque de Trabajo: Fila de Monedas\nm8_place_voxel("voxel_coin", 4.50, 5.50, 0.25, 0, 1.00);`,
  },
  {
    id: "wb_goal",
    title: "Meta + Bandera",
    shortDesc: "Estrella dorada y punto de control",
    category: "objetos",
    prompt: "Coloca una estrella de meta y bandera checkpoint",
    actions: [
      {
        type: "add_model",
        modelId: "trophy_star",
        role: "goal",
        count: 1,
      },
      {
        type: "add_voxel",
        voxelId: "voxel_checkpoint",
        count: 1,
      },
    ],
    divSnippet: `// Bloque de Trabajo: Meta 3D\nm8_add_model("trophy_star", 6.00, 5.50, 0.20, 0, "idle", 1.10, "goal", 100, 0, 0, "Meta");`,
  },
  {
    id: "wb_enemy",
    title: "Enemigo 3D",
    shortDesc: "Guardián samurái o robot animado",
    category: "objetos",
    prompt: "Agrega un enemigo 3D animado en el mapa",
    actions: [
      {
        type: "add_model",
        modelId: "samurai_fighter",
        role: "enemy",
        count: 1,
      },
    ],
    divSnippet: `// Bloque de Trabajo: Guardián 3D\nm8_add_model("samurai_fighter", 6.50, 6.50, 0.00, 180, "idle", 1.00, "enemy", 100, 1.20, 12, "Samurai");`,
  },
  {
    id: "wb_sky_night",
    title: "Cielo Noche",
    shortDesc: "Atmósfera nocturna y 3ª persona",
    category: "ambiente",
    prompt: "Cambia el cielo a noche y pon cámara en tercera persona",
    actions: [
      {
        type: "set_sky_camera",
        skyTexture: "SKY3",
        cameraMode: "third_person",
      },
    ],
    divSnippet: `// Bloque de Trabajo: Cielo Nocturno\n// CIELO_TEXTURA = "SKY3"; CAMARA_MODO = "third_person";`,
  },
  {
    id: "wb_paint_neon",
    title: "Estilo Neón",
    shortDesc: "Pinta piso y muros con grilla neón",
    category: "ambiente",
    prompt: "Pinta la zona seleccionada con material neón cyber",
    actions: [
      {
        type: "paint_material",
        flatTex: "NEON_FLOOR",
        wallTex: "NEON_GRID",
        scope: "selected",
      },
    ],
    divSnippet: `// Bloque de Trabajo: Material Neón\nm8_set_doom_sector(0, 0.00, 3.00, "NEON_FLOOR", "SKY3", 220, 0, 0);`,
  },
  {
    id: "wb_arena",
    title: "Circuito 3D",
    shortDesc: "Plataformas, escalera y monedas listas",
    category: "escena",
    prompt: "Construye un circuito de obstáculos 3D completo con monedas",
    actions: [
      {
        type: "build_template",
        template: "circuito_obstaculos",
      },
    ],
    divSnippet: `// Bloque de Trabajo: Circuito Completo 3D\n// Añade plataformas elevadas, escalera, monedas y meta`,
  },
];

function normalizePrompt(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractCount(p: string, fallback = 1, max = 12): number {
  const m = p.match(/\b(\d{1,2})\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= max) return n;
  }
  return fallback;
}

export function inferMode8ActionsFromPrompt(
  rawPrompt: string,
  sceneCtx?: Mode8SceneContext
): { actions: Mode8AiAction[]; summary: string } {
  const p = normalizePrompt(rawPrompt);
  const actions: Mode8AiAction[] = [];
  const notes: string[] = [];

  // 1. Check custom user-imported models or textures mentioned by name
  if (sceneCtx?.customModels?.length) {
    for (const cm of sceneCtx.customModels) {
      const cname = normalizePrompt(cm.name);
      if (cname.length >= 2 && p.includes(cname)) {
        const count = extractCount(p, 1, 8);
        const role: "enemy" | "ally" | "prop" | "goal" =
          p.includes("enemigo") || p.includes("jefe") || p.includes("malo")
            ? "enemy"
            : p.includes("meta")
            ? "goal"
            : p.includes("aliado")
            ? "ally"
            : "prop";
        actions.push({ type: "add_model", modelId: cm.id, role, count });
        notes.push(`${count}× modelo importado "${cm.name}"`);
      }
    }
  }

  if (sceneCtx?.customTextures?.length) {
    for (const ct of sceneCtx.customTextures) {
      const tname = normalizePrompt(ct.displayName || ct.name);
      if (tname.length >= 2 && p.includes(tname)) {
        actions.push({
          type: "paint_material",
          flatTex: ct.name,
          wallTex: ct.name,
          scope: p.includes("todo") ? "all" : "selected",
        });
        notes.push(`material personalizado "${ct.displayName || ct.name}"`);
      }
    }
  }

  // 2. Full mini-circuit / arena templates
  if (p.includes("circuito") || p.includes("obby") || p.includes("parkour") || p.includes("obstaculo")) {
    actions.push({ type: "build_template", template: "circuito_obstaculos" });
    notes.push("circuito 3D con plataformas, escalera y monedas");
  } else if (p.includes("arena") || p.includes("pelea") || p.includes("combate")) {
    actions.push({ type: "build_template", template: "arena_pelea" });
    notes.push("arena de combate 3D");
  } else if (p.includes("laberinto")) {
    actions.push({ type: "build_template", template: "laberinto" });
    notes.push("laberinto 3D");
  }

  // 3. Stairs
  if (p.includes("escalera") || p.includes("pelda") || p.includes("rampa") || p.includes("subir")) {
    const steps = extractCount(p, 6, 12);
    actions.push({
      type: "add_stairs",
      steps,
      startHeight: 0,
      endHeight: Number((steps * 0.25).toFixed(2)),
      direction: p.includes("este") || p.includes("derecha") ? "east" : "north",
    });
    notes.push(`escalera de ${steps} peldaños`);
  }

  // 4. Platforms / rooms / blocks
  if (
    p.includes("plataforma") ||
    p.includes("bloque") ||
    p.includes("habitacion") ||
    p.includes("sala") ||
    p.includes("cuarto") ||
    p.includes("torre")
  ) {
    let flatTex = "STUD_FLOOR_BLUE";
    let wallTex = "STUD_WALL_BLUE";
    if (p.includes("rojo") || p.includes("roja")) {
      flatTex = "ROOF1";
      wallTex = "REDWALL";
    } else if (p.includes("verde") || p.includes("cesped") || p.includes("pasto")) {
      flatTex = "GRASS1";
      wallTex = "STUD_WALL_GREEN";
    } else if (p.includes("oro") || p.includes("dorad")) {
      flatTex = "MARBLE_GOLD";
      wallTex = "STUD_GOLD";
    } else if (p.includes("neon") || p.includes("cyber")) {
      flatTex = "NEON_FLOOR";
      wallTex = "NEON_GRID";
    } else if (p.includes("madera") || p.includes("dojo")) {
      flatTex = "DOJO_TATAMI";
      wallTex = "DOJO_WALL";
    } else if (p.includes("lava") || p.includes("fuego")) {
      flatTex = "LAVA1";
      wallTex = "FIREWALL1";
    }

    const isTower = p.includes("torre");
    actions.push({
      type: "add_platform",
      width: p.includes("grande") ? 3 : 2,
      depth: p.includes("grande") ? 3 : 2,
      floorHeight: isTower ? 1.5 : p.includes("baj") ? 0.35 : 0.75,
      ceilHeight: 4.0,
      flatTex,
      wallTex,
      label: isTower ? "Torre 3D" : "Plataforma 3D",
    });
    notes.push(isTower ? "torre 3D elevada" : "plataforma 3D");
  }

  // 5. Voxels & collectibles
  if (p.includes("moneda") || p.includes("coin") || p.includes("oro")) {
    const count = extractCount(p, 5, 10);
    actions.push({ type: "add_voxel", voxelId: "voxel_coin", count, spacing: 1.1 });
    notes.push(`${count} moneda(s)`);
  }
  if (p.includes("vida") || p.includes("botiquin") || p.includes("curar") || p.includes("salud")) {
    const count = extractCount(p, 2, 6);
    actions.push({ type: "add_voxel", voxelId: "voxel_medikit", count, spacing: 1.4 });
    notes.push(`${count} botiquín(es)`);
  }
  if (p.includes("bandera") || p.includes("checkpoint") || p.includes("punto de control")) {
    actions.push({ type: "add_voxel", voxelId: "voxel_checkpoint", count: 1 });
    notes.push("bandera checkpoint");
  }
  if (p.includes("barril") || p.includes("caja")) {
    const count = extractCount(p, 2, 6);
    actions.push({
      type: "add_voxel",
      voxelId: p.includes("caja") ? "voxel_crate" : "voxel_barrel",
      count,
      spacing: 1.3,
    });
    notes.push(`${count} objeto(s)`);
  }

  // 6. Built-in 3D models
  if (p.includes("samurai") || p.includes("ninja")) {
    const count = extractCount(p, 1, 6);
    actions.push({ type: "add_model", modelId: "samurai_fighter", role: "enemy", count });
    notes.push(`${count} samurái 3D`);
  } else if (p.includes("robot") || p.includes("mech")) {
    const count = extractCount(p, 1, 6);
    actions.push({ type: "add_model", modelId: "cyber_mech", role: "enemy", count });
    notes.push(`${count} robot 3D`);
  } else if (p.includes("caballero") || p.includes("enemigo") || p.includes("monstruo") || p.includes("guardian")) {
    const count = extractCount(p, 1, 6);
    actions.push({ type: "add_model", modelId: "blox_knight", role: "enemy", count });
    notes.push(`${count} enemigo 3D`);
  }
  if (p.includes("estrella") || p.includes("meta") || p.includes("trofeo")) {
    actions.push({ type: "add_model", modelId: "trophy_star", role: "goal", count: 1 });
    notes.push("estrella meta");
  }
  if (p.includes("cristal") || p.includes("portal")) {
    actions.push({ type: "add_model", modelId: "portal_crystal", role: "prop", count: 1 });
    notes.push("cristal portal");
  }

  // 7. Paint existing sector / map
  if (p.includes("pinta") || p.includes("color") || p.includes("textura") || p.includes("material")) {
    let flatTex = "";
    let wallTex = "";
    if (p.includes("neon") || p.includes("cyber")) {
      flatTex = "NEON_FLOOR";
      wallTex = "NEON_GRID";
    } else if (p.includes("lava") || p.includes("fuego")) {
      flatTex = "LAVA1";
      wallTex = "FIREWALL1";
    } else if (p.includes("agua") || p.includes("mar")) {
      flatTex = "WATER1";
      wallTex = "SHAWN2";
    } else if (p.includes("cesped") || p.includes("verde") || p.includes("pasto")) {
      flatTex = "GRASS1";
      wallTex = "STUD_WALL_GREEN";
    } else if (p.includes("oro") || p.includes("dorad")) {
      flatTex = "MARBLE_GOLD";
      wallTex = "STUD_GOLD";
    } else if (p.includes("madera") || p.includes("dojo")) {
      flatTex = "DOJO_TATAMI";
      wallTex = "DOJO_WALL";
    } else if (p.includes("rojo")) {
      flatTex = "ROOF1";
      wallTex = "REDWALL";
    } else if (p.includes("azul")) {
      flatTex = "STUD_FLOOR_BLUE";
      wallTex = "STUD_WALL_BLUE";
    }
    if (flatTex) {
      actions.push({
        type: "paint_material",
        flatTex,
        wallTex,
        scope: p.includes("todo") ? "all" : "selected",
      });
      notes.push(`pintar con ${flatTex}`);
    }
  }

  // 8. Sky & camera & game mode
  const skyPatch: { skyTexture?: string; cameraMode?: Mode8CameraMode; gameMode?: "shooter" | "exploration" | "survival" } = {};
  if (p.includes("noche") || p.includes("oscuro") || p.includes("espacio")) {
    skyPatch.skyTexture = "SKY3";
    notes.push("cielo nocturno");
  } else if (p.includes("atardecer") || p.includes("rojo") && p.includes("cielo")) {
    skyPatch.skyTexture = "SKY2";
    notes.push("cielo de atardecer");
  } else if (p.includes("dia") || p.includes("soleado") || p.includes("cielo azul")) {
    skyPatch.skyTexture = "SKY_ROBLOX";
    notes.push("cielo de día");
  }
  if (p.includes("primera persona") || p.includes("1ra persona") || p.includes("fps")) {
    skyPatch.cameraMode = "fps";
    notes.push("cámara en 1ª persona");
  } else if (p.includes("tercera persona") || p.includes("3ra persona")) {
    skyPatch.cameraMode = "third_person";
    notes.push("cámara en 3ª persona");
  }
  if (p.includes("supervivencia") || p.includes("survival")) {
    skyPatch.gameMode = "survival";
  } else if (p.includes("exploracion") || p.includes("aventura")) {
    skyPatch.gameMode = "exploration";
  }
  if (skyPatch.skyTexture || skyPatch.cameraMode || skyPatch.gameMode) {
    actions.push({ type: "set_sky_camera", ...skyPatch });
  }

  return {
    actions,
    summary:
      notes.length > 0
        ? `Bloques 3D listos: ${notes.join(", ")}.`
        : "Sin cambios geométricos automáticos detectados.",
  };
}

export function formatMode8ContextForPrompt(ctx?: Mode8SceneContext): string {
  if (!ctx) return "";
  const modelsText =
    ctx.customModels.length > 0
      ? ctx.customModels.map((m) => `${m.name} (id: "${m.id}")`).join(", ")
      : "ninguno importado";
  const texText =
    ctx.customTextures.length > 0
      ? ctx.customTextures.map((t) => `${t.displayName || t.name} (id: "${t.name}")`).join(", ")
      : "texturas base integradas";

  return [
    `[CONTEXTO ACTUAL DEL MAPA 3D]`,
    `- Nivel: "${ctx.levelTitle}" (${ctx.sectorCount} sectores, ${ctx.linedefCount} muros, ${ctx.placedModelsCount} modelos 3D, ${ctx.placedVoxelsCount} vóxels)`,
    `- Cámara: ${ctx.cameraMode} | Cielo: ${ctx.skyTexture} | Modo: ${ctx.gameMode}`,
    `- Jugador en tile: (${(ctx.playerPos.x / 64).toFixed(1)}, ${(ctx.playerPos.y / 64).toFixed(1)}) | Sector seleccionado: ${ctx.selectedSectorId ?? "ninguno"}`,
    `- Modelos importados por el usuario: ${modelsText}`,
    `- Texturas importadas por el usuario: ${texText}`,
  ].join("\n");
}

export function extractMode8ActionsFromLlmText(text: string): Mode8AiAction[] {
  const match = text.match(/```mode8-actions\s*([\s\S]*?)```/i);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1].trim());
    if (Array.isArray(parsed)) {
      return parsed.filter((a) => a && typeof a.type === "string") as Mode8AiAction[];
    }
  } catch {
    return [];
  }
  return [];
}
