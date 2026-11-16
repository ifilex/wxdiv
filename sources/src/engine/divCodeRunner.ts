import { DivRuntime } from "./runtime";
import { PRESETS } from "./presets";
import { parseDivToHtml5State } from "./html5Engine";
import {
  DivDoomLinedef,
  DivDoomSector,
  DivMode8Entity,
  DivMode8Light,
  DivMode8PlacedModel,
  DivMode8PlacedVoxel,
  Mode8CameraMode,
} from "../types";
import { PRESET_ROBLOX_OBBY } from "./mode8Presets";
import { buildTracedSectors, findSectorAtPoint, inferPlacedModelStats } from "./mode8Geometry";
import { doomWorldState } from "./doom2Engine";
import { normalizeMode8LevelTextures, resolveCanonicalTextureName } from "./mode8TextureRegistry";

const DEFAULT_RUNNER_MODE8_GRID: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 0, 0, 1, 0, 2, 2, 2, 0, 0, 2, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 1],
  [1, 0, 2, 0, 0, 1, 1, 1, 0, 0, 2, 2, 0, 2, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1, 0, 2, 2, 0, 1],
  [1, 0, 2, 2, 0, 1, 1, 1, 0, 0, 0, 0, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 1, 0, 2, 2, 2, 0, 0, 2, 2, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

function buildConstSymbolMap(code: string): Map<string, string> {
  const map = new Map<string, string>();
  const strRe = /\b([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = strRe.exec(code)) !== null) {
    map.set(m[1].toUpperCase(), m[2]);
  }
  return map;
}

function resolveArgString(raw: string, constMap: Map<string, string>, fallback = ""): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return fallback;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  const fromMap = constMap.get(trimmed.toUpperCase());
  if (fromMap !== undefined) return fromMap;
  if (trimmed.toLowerCase().startsWith("fluid_")) {
    return trimmed.toLowerCase().replace(/^fluid_/, "");
  }
  return trimmed;
}

function trySetupCustomMode8Game(runtime: DivRuntime, code: string, title: string): boolean {
  const lower = code.toLowerCase();
  const isCustomMode8 =
    lower.includes("m8_set_doom_sector") ||
    lower.includes("m8_add_doom_line") ||
    lower.includes("m8_engine_mode") ||
    lower.includes("m8_place_voxel") ||
    lower.includes("m8_add_voxel") ||
    lower.includes("m8_add_model") ||
    lower.includes("m8_place_model") ||
    lower.includes("m8_set_sector") ||
    lower.includes("m8_set_fluid") ||
    lower.includes("m8_spawn_entity") ||
    lower.includes("start_mode8") ||
    lower.includes("jugador_doom") ||
    lower.includes("jugador_blox") ||
    lower.includes("jugador_marine") ||
    lower.includes("mapa generado con redoomed") ||
    lower.includes("mundo 3d modo 8");

  if (!isCustomMode8) return false;

  const constMap = buildConstSymbolMap(code);
  const readStr = (key: string, fallback: string): string => {
    const m = code.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`, "i"));
    return m ? m[1] : fallback;
  };
  const readNum = (key: string, fallback: number): number => {
    const m = code.match(new RegExp(`${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`, "i"));
    return m ? parseFloat(m[1]) : fallback;
  };

  const hasBloxStyle =
    lower.includes("blox") ||
    lower.includes("roblox") ||
    lower.includes("stud_") ||
    lower.includes("jugador_blox") ||
    lower.includes("sword3d") ||
    lower.includes("samurai_fighter") ||
    lower.includes("cyber_mech");

  const directWeaponMatch = code.match(/m8_set_weapon\s*\(\s*([^)]+)\s*\)/i);
  const directWeapon = directWeaponMatch ? resolveArgString(directWeaponMatch[1], constMap, "") : "";

  const gameTitle = readStr("TITULO_JUEGO", title || "Mi Juego 3D Modo 8");
  const gameSubtitle = readStr("SUBTITULO_JUEGO", "Mundo 3D creado sin programar en WXDIV");
  const hasStartMenu = readNum("MOSTRAR_MENU", 1) !== 0;
  const menuTheme = readStr("TEMA_MENU", "winebox_clean") as "winebox_clean" | "doom_dark" | "cyber_neon" | "medieval_gold";
  const playButtonText = readStr("BOTON_JUGAR", "Jugar Ahora");
  const showControlsButton = readNum("MOSTRAR_CONTROLES", 1) !== 0;
  const showWeaponSelect = readNum("SELECTOR_ARMA_MENU", 1) !== 0;
  const initialWeapon = readStr("ARMA_INICIAL", directWeapon || "shotgun");
  const startingHealth = Math.max(10, Math.min(999, Math.round(readNum("SALUD_INICIAL", 100))));
  const startingAmmo = Math.max(0, Math.min(999, Math.round(readNum("MUNICION_INICIAL", 24))));
  const difficulty = readStr("DIFICULTAD", "normal");
  const gameMode = readStr("MODO_JUEGO", "shooter");
  const showHudAutomap = readNum("MOSTRAR_MINIMAPA", 1) !== 0;
  const cameraModeRaw = readStr("CAMARA_MODO", hasBloxStyle ? "third_person" : "fps");
  const cameraMode: Mode8CameraMode =
    cameraModeRaw === "third_person" || cameraModeRaw === "isometric" || cameraModeRaw === "orbit"
      ? cameraModeRaw
      : "fps";
  const skyArgMatch = code.match(/m8_set_sky\s*\(\s*([^)]+)\s*\)/i);
  const rawSky = skyArgMatch
    ? resolveArgString(skyArgMatch[1], constMap, "SKY_ROBLOX")
    : readStr("CIELO_TEXTURA", hasBloxStyle ? "SKY_ROBLOX" : "SKY1");
  const skyTexture = resolveCanonicalTextureName(rawSky, "SKY_ROBLOX").canonical;
  const playerModelId = readStr("JUGADOR_MODELO", "blox_hero");

  // Parse Sectors
  const sectors: DivDoomSector[] = [];
  const sectorRegex = /m8_set_doom_sector\s*\(\s*(\d+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+))?\s*\)\s*;?/gi;
  let sm: RegExpExecArray | null;
  while ((sm = sectorRegex.exec(code)) !== null) {
    const flTex = resolveArgString(sm[4], constMap, "FLOOR4_8");
    const clTex = resolveArgString(sm[5], constMap, skyTexture || "CEIL3_5");
    const flUpper = flTex.toUpperCase();
    const inferredFluid =
      flUpper === "LAVA"
        ? "lava"
        : flUpper === "NUKAGE" || flUpper === "SLIME1"
        ? "acid"
        : flUpper === "BLOOD1"
        ? "blood"
        : flUpper === "WATER" || flUpper === "FWATER1"
        ? "water"
        : undefined;
    sectors.push({
      id: parseInt(sm[1], 10),
      floorHeight: parseFloat(sm[2]),
      ceilHeight: parseFloat(sm[3]),
      floorTexture: flTex,
      ceilTexture: clTex,
      lightLevel: parseInt(sm[6], 10) || 190,
      special: sm[7] ? parseInt(sm[7], 10) : 0,
      tag: sm[8] ? parseInt(sm[8], 10) : 0,
      fluidType: inferredFluid,
    });
  }

  // Parse Linedefs
  const linedefs: DivDoomLinedef[] = [];
  const lineRegex = /m8_add_doom_line\s*\(\s*([^,]+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*(\d+)\s*,\s*(-?\d+)\s*,\s*(\d+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,)]+)(?:\s*,\s*(\d+))?\s*\)\s*;?/gi;
  let lm: RegExpExecArray | null;
  while ((lm = lineRegex.exec(code)) !== null) {
    const backId = parseInt(lm[7], 10);
    const twoSided = parseInt(lm[8], 10) === 1;
    const blocking = lm[12] !== undefined ? parseInt(lm[12], 10) !== 0 : !twoSided;
    const midTex = resolveArgString(lm[9], constMap, "");
    const lowTex = resolveArgString(lm[10], constMap, "");
    const upTex = resolveArgString(lm[11], constMap, "");
    linedefs.push({
      id: resolveArgString(lm[1], constMap, `w_${linedefs.length}`),
      x1: parseFloat(lm[2]),
      y1: parseFloat(lm[3]),
      x2: parseFloat(lm[4]),
      y2: parseFloat(lm[5]),
      frontSectorId: parseInt(lm[6], 10),
      backSectorId: backId >= 0 ? backId : undefined,
      isTwoSided: twoSided,
      middleTexture: midTex || undefined,
      lowerTexture: lowTex || undefined,
      upperTexture: upTex || undefined,
      blocking,
    });
  }

  // Parse Voxels (m8_place_voxel and m8_add_voxel)
  const placedVoxels: DivMode8PlacedVoxel[] = [];
  const voxRegex = /m8_place_voxel\s*\(\s*([^,]+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\)\s*;?/gi;
  let vm: RegExpExecArray | null;
  while ((vm = voxRegex.exec(code)) !== null) {
    const voxelId = resolveArgString(vm[1], constMap, "voxel_coin");
    placedVoxels.push({
      id: `vox_${placedVoxels.length}_${voxelId}`,
      voxelId,
      x: parseFloat(vm[2]),
      y: parseFloat(vm[3]),
      z: parseFloat(vm[4]),
      yaw: parseFloat(vm[5]),
      scale: parseFloat(vm[6]) || 1,
    });
  }
  const addVoxRegex = /m8_add_voxel\s*\(\s*([^,]+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?\s*\)\s*;?/gi;
  while ((vm = addVoxRegex.exec(code)) !== null) {
    const voxelId = resolveArgString(vm[1], constMap, "vox_potion");
    placedVoxels.push({
      id: `vox_${placedVoxels.length}_${voxelId}`,
      voxelId,
      x: parseFloat(vm[2]),
      y: parseFloat(vm[3]),
      z: parseFloat(vm[4]),
      yaw: 0,
      scale: vm[5] ? parseFloat(vm[5]) : 1,
      rotSpeed: vm[6] ? parseFloat(vm[6]) : 2,
    });
  }

  // Parse 3D Models (supports 5..12 arguments m8_add_model/m8_place_model with optional CONST symbols)
  const placedModels: DivMode8PlacedModel[] = [];
  const modRegex = /m8_(?:add|place)_model\s*\(\s*([^,]+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)(?:\s*,\s*([^,)]+))?(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?(?:\s*,\s*([^,)]+))?(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?(?:\s*,\s*([^)]+))?\s*\)\s*;?/gi;
  let mm: RegExpExecArray | null;
  while ((mm = modRegex.exec(code)) !== null) {
    const modelId = resolveArgString(mm[1], constMap, "blox_knight");
    const x = parseFloat(mm[2]);
    const y = parseFloat(mm[3]);
    const anim = resolveArgString(mm[6] || "walk", constMap, "walk");
    const rawRole = mm[8] ? resolveArgString(mm[8], constMap, "") : undefined;
    const rawHp = mm[9] ? parseInt(mm[9], 10) : undefined;
    const rawSpeed = mm[10] ? parseFloat(mm[10]) : undefined;
    const rawDamage = mm[11] ? parseInt(mm[11], 10) : undefined;
    const rawName = mm[12] ? resolveArgString(mm[12], constMap, "") : undefined;
    const raw: DivMode8PlacedModel = {
      id: `mod_${placedModels.length}_${modelId}`,
      modelId,
      x,
      y,
      z: parseFloat(mm[4]),
      yaw: parseFloat(mm[5]),
      animation: (anim as "idle" | "walk" | "attack" | "die") || "walk",
      scale: mm[7] ? parseFloat(mm[7]) : 1,
      role: rawRole ? (rawRole as DivMode8PlacedModel["role"]) : undefined,
      hp: rawHp,
      maxHp: rawHp,
      speed: rawSpeed,
      damage: rawDamage,
      name: rawName || undefined,
      homeX: x,
      homeY: y,
    };
    const inferred = inferPlacedModelStats(raw);
    placedModels.push({
      ...raw,
      role: raw.role ?? inferred.role,
      hp: raw.hp ?? inferred.hp,
      maxHp: raw.maxHp ?? inferred.maxHp,
      speed: raw.speed ?? inferred.speed,
      damage: raw.damage ?? inferred.damage,
      patrolRadius: raw.patrolRadius ?? inferred.patrolRadius,
      name: raw.name ?? inferred.name,
    });
  }

  // Parse Lights
  const lights: DivMode8Light[] = [];
  const lightRegex = /m8_add_light\s*\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)\s*;?/gi;
  let lim: RegExpExecArray | null;
  while ((lim = lightRegex.exec(code)) !== null) {
    lights.push({
      id: `l_${lights.length}`,
      x: parseFloat(lim[1]),
      y: parseFloat(lim[2]),
      z: parseFloat(lim[3]),
      radius: parseFloat(lim[4]) || 8,
      r: parseInt(lim[5], 10) || 255,
      g: parseInt(lim[6], 10) || 200,
      b: parseInt(lim[7], 10) || 140,
      flicker: lim[8] ? parseInt(lim[8], 10) !== 0 : false,
    });
  }

  const isReDoomEd = lower.includes("mapa generado con redoomed") || sectors.length > 0;

  // Parse Entities
  const entities: DivMode8Entity[] = [];
  const entRegex = /m8_spawn_entity\s*\(\s*"([^"]*)"\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*"([^"]*)"(?:\s*,\s*(\d+))?\s*\)\s*;?/gi;
  let em: RegExpExecArray | null;
  while ((em = entRegex.exec(code)) !== null) {
    const wx = parseFloat(em[2]);
    const wy = parseFloat(em[3]);
    const safeWx = Number.isFinite(wx) ? wx : 4.5;
    const safeWy = Number.isFinite(wy) ? wy : 5.5;
    entities.push({
      id: `ent_${entities.length}`,
      type: (em[1] as DivMode8Entity["type"]) || "monster",
      x: isReDoomEd || safeWx <= 40 ? safeWx * 64 : safeWx,
      y: isReDoomEd || safeWy <= 40 ? safeWy * 64 : safeWy,
      name: em[4] || em[1],
      graph: em[5] ? parseInt(em[5], 10) : em[1] === "player" ? 1 : em[1] === "barrel" ? 28 : 27,
    });
  }

  // Also parse classic Mode 8 entity spawner calls
  const classicSpawners: Array<{ fn: string; type: string; graph: number; name: string }> = [
    { fn: "demonio_slime", type: "monster", graph: 27, name: "Demonio Slime" },
    { fn: "demonio_imp", type: "monster", graph: 27, name: "Imp Guardián" },
    { fn: "antorcha_3d", type: "torch", graph: 28, name: "Antorcha" },
    { fn: "barril_3d", type: "barrel", graph: 29, name: "Barril" },
    { fn: "tesoro_3d", type: "treasure", graph: 24, name: "Tesoro" },
    { fn: "botiquin_salud", type: "medikit", graph: 35, name: "Botiquin" },
    { fn: "caja_cartuchos", type: "ammo", graph: 34, name: "Cartuchos" },
  ];
  for (const def of classicSpawners) {
    const callRe = new RegExp(`(^|[^a-z0-9_])(${def.fn})\\s*\\(\\s*([-+]?\\d+(?:\\.\\d+)?)\\s*,\\s*([-+]?\\d+(?:\\.\\d+)?)\\s*\\)`, "gi");
    let cm: RegExpExecArray | null;
    while ((cm = callRe.exec(code)) !== null) {
      const beforeSlice = code.slice(Math.max(0, cm.index - 20), cm.index).toLowerCase();
      if (/\b(?:process|function)\s*$/.test(beforeSlice)) continue;
      const wx = parseFloat(cm[3]);
      const wy = parseFloat(cm[4]);
      entities.push({
        id: `ent_${entities.length}`,
        type: def.type,
        x: Math.abs(wx) <= 40 ? wx * 64 : wx,
        y: Math.abs(wy) <= 40 ? wy * 64 : wy,
        name: def.name,
        graph: def.graph,
      });
    }
  }

  // Player Spawn
  let startX = 4.5;
  let startY = 7.5;
  const playerSpawnMatch = code.match(/(?:jugador_doom|jugador_marine|jugador_blox|jugador_fps)\s*\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\)/i);
  if (playerSpawnMatch) {
    const rx = parseFloat(playerSpawnMatch[1]);
    const ry = parseFloat(playerSpawnMatch[2]);
    if (Number.isFinite(rx) && Number.isFinite(ry)) {
      startX = isReDoomEd ? rx : Math.abs(rx) > 40 ? rx / 64 : rx;
      startY = isReDoomEd ? ry : Math.abs(ry) > 40 ? ry / 64 : ry;
    }
  } else {
    const playerEnt = entities.find((e) => e.type === "player");
    if (playerEnt) {
      startX = playerEnt.x / 64;
      startY = playerEnt.y / 64;
    }
  }

  // Parse m8_set_sector / m8_set_fluid / start_mode8(_hybrid) when linedefs are not explicitly authored
  let defaultWallTex = "STUD_WALL_BLUE";
  let secondaryWallTex = "STUD_GOLD";
  let floorTexId = "STUD_FLOOR_BLUE";
  let ceilTexId = skyTexture || "SKY_ROBLOX";
  const startM8Match = code.match(
    /start_mode8(?:_hybrid)?\s*\(\s*([^,\s)]+)\s*,\s*([^,\s)]+)\s*,\s*([^,\s)]+)(?:\s*,\s*([^,\s)]+))?(?:\s*,\s*([^,\s)]+))?/i
  );
  if (startM8Match) {
    const a2 = resolveArgString(startM8Match[2], constMap, "0");
    const a3 = resolveArgString(startM8Match[3], constMap, "");
    const a4 = resolveArgString(startM8Match[4] || "", constMap, "");
    const a5 = resolveArgString(startM8Match[5] || "", constMap, "");
    if (a3 && a3 !== "0" && a3 !== "25") defaultWallTex = a3;
    else if (a2 && a2 !== "0" && a2 !== "25") defaultWallTex = a2;
    if (a4 && a4 !== "0" && a4 !== "44") {
      secondaryWallTex = a4;
      floorTexId = a4;
    }
    if (a5 && a5 !== "0" && a5 !== "45") ceilTexId = a5;
  }

  const gridSectors = new Map<
    string,
    { gx: number; gy: number; floorHeight: number; ceilHeight: number; fTex: string; cTex: string; fluidType?: DivDoomSector["fluidType"] }
  >();
  const m8SecRe =
    /m8_set_sector\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)(?:\s*,\s*([^,)]+))?(?:\s*,\s*([^,)]+))?(?:\s*,\s*([^,)]+))?(?:\s*,\s*([^,)]+))?\s*\)/gi;
  let gsecM: RegExpExecArray | null;
  while ((gsecM = m8SecRe.exec(code)) !== null) {
    const gx = parseInt(gsecM[1], 10);
    const gy = parseInt(gsecM[2], 10);
    const fluid = resolveArgString(gsecM[8] || "none", constMap, "none").toLowerCase();
    gridSectors.set(`${gx},${gy}`, {
      gx,
      gy,
      floorHeight: parseFloat(gsecM[3]),
      ceilHeight: parseFloat(gsecM[4]),
      fTex: resolveArgString(gsecM[5] || floorTexId, constMap, floorTexId),
      cTex: resolveArgString(gsecM[6] || ceilTexId, constMap, ceilTexId),
      fluidType: fluid !== "none" ? (fluid as DivDoomSector["fluidType"]) : undefined,
    });
  }

  const m8FluidRe = /m8_set_fluid\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*([^)]+)\s*\)/gi;
  let gflM: RegExpExecArray | null;
  while ((gflM = m8FluidRe.exec(code)) !== null) {
    const gx = parseInt(gflM[1], 10);
    const gy = parseInt(gflM[2], 10);
    const fluidType = resolveArgString(gflM[3], constMap, "lava").toLowerCase() as DivDoomSector["fluidType"];
    const key = `${gx},${gy}`;
    const existing = gridSectors.get(key);
    if (existing) {
      existing.fluidType = fluidType;
    } else {
      gridSectors.set(key, {
        gx,
        gy,
        floorHeight: -0.22,
        ceilHeight: 2.0,
        fTex: floorTexId,
        cTex: ceilTexId,
        fluidType,
      });
    }
  }

  const hasCustomGrid = gridSectors.size > 0 || Boolean(startM8Match);
  let finalSectors = sectors;
  let finalLinedefs = linedefs;

  if (finalLinedefs.length === 0) {
    if (hasCustomGrid) {
      if (finalSectors.length === 0) {
        finalSectors.push({
          id: 0,
          floorHeight: 0,
          ceilHeight: 2.2,
          floorTexture: floorTexId || "STUD_FLOOR_BLUE",
          ceilTexture: ceilTexId || "SKY_ROBLOX",
          lightLevel: 215,
          special: 0,
          tag: 0,
        });
      }
      const cellSectorIdMap = new Map<string, number>();
      let nextSecId = finalSectors.reduce((mx, s) => Math.max(mx, s.id), 0) + 1;
      gridSectors.forEach((info, key) => {
        const sid = nextSecId++;
        cellSectorIdMap.set(key, sid);
        finalSectors.push({
          id: sid,
          floorHeight: info.floorHeight,
          ceilHeight: info.ceilHeight,
          floorTexture: info.fTex || floorTexId,
          ceilTexture: info.cTex || ceilTexId,
          fluidType: info.fluidType,
          lightLevel: info.fluidType === "lava" ? 235 : 210,
          special: 0,
          tag: 0,
        });
      });

      const gh = DEFAULT_RUNNER_MODE8_GRID.length;
      const gw = DEFAULT_RUNNER_MODE8_GRID[0].length;
      const getCell = (gx: number, gy: number) =>
        gy >= 0 && gy < gh && gx >= 0 && gx < gw ? DEFAULT_RUNNER_MODE8_GRID[gy][gx] : 1;

      for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
          const cellVal = getCell(gx, gy);
          if (cellVal > 0) continue;
          const curSecId = cellSectorIdMap.get(`${gx},${gy}`) ?? 0;
          const neighbors = [
            { nx: gx, ny: gy - 1, x1: gx, y1: gy, x2: gx + 1, y2: gy },
            { nx: gx + 1, ny: gy, x1: gx + 1, y1: gy, x2: gx + 1, y2: gy + 1 },
            { nx: gx, ny: gy + 1, x1: gx + 1, y1: gy + 1, x2: gx, y2: gy + 1 },
            { nx: gx - 1, ny: gy, x1: gx, y1: gy + 1, x2: gx, y2: gy },
          ];
          for (const nb of neighbors) {
            const nVal = getCell(nb.nx, nb.ny);
            if (nVal > 0) {
              const wallTex = nVal === 2 ? secondaryWallTex : defaultWallTex;
              finalLinedefs.push({
                id: `gw_${gx}_${gy}_${nb.nx}_${nb.ny}`,
                x1: nb.x1,
                y1: nb.y1,
                x2: nb.x2,
                y2: nb.y2,
                frontSectorId: curSecId,
                backSectorId: undefined,
                isTwoSided: false,
                middleTexture: wallTex,
                blocking: true,
              });
            } else {
              const nbSecId = cellSectorIdMap.get(`${nb.nx},${nb.ny}`) ?? 0;
              if (curSecId !== nbSecId && (curSecId < nbSecId || gy * gw + gx < nb.ny * gw + nb.nx)) {
                finalLinedefs.push({
                  id: `gp_${gx}_${gy}_${nb.nx}_${nb.ny}`,
                  x1: nb.x1,
                  y1: nb.y1,
                  x2: nb.x2,
                  y2: nb.y2,
                  frontSectorId: curSecId,
                  backSectorId: nbSecId,
                  isTwoSided: true,
                  lowerTexture: "STEP1",
                  upperTexture: defaultWallTex,
                  blocking: false,
                });
              }
            }
          }
        }
      }
    } else {
      finalSectors = PRESET_ROBLOX_OBBY.sectors;
      finalLinedefs = PRESET_ROBLOX_OBBY.linedefs;
    }
  }

  const finalLights =
    lights.length > 0
      ? lights
      : [{ id: "l_default", x: startX, y: startY, z: 2.2, radius: 14, r: 255, g: 240, b: 210, flicker: false }];

  // Canonical Texture Normalization & Validation (guarantees Editor, IDE Testeo, & Compiled HTML parity)
  const normalizedLevel = normalizeMode8LevelTextures(finalSectors, finalLinedefs, skyTexture);
  finalSectors = normalizedLevel.sectors;
  finalLinedefs = normalizedLevel.linedefs;

  // Precompute exact traced sector loops (innermost smallest-area containment)
  const tracedSectors = buildTracedSectors(finalSectors, finalLinedefs);
  const findFloorHeightAt = (wx: number, wy: number): number | null => {
    const sec = findSectorAtPoint(wx, wy, tracedSectors);
    return sec ? sec.floorHeight : null;
  };

  runtime.setHtml5Mode(false);
  const fpgId = runtime.load_fpg("dungeon.fpg");
  runtime.load_fnt("gothic.fnt");

  doomWorldState.health = startingHealth;
  doomWorldState.armor = difficulty === "facil" ? 100 : difficulty === "pesadilla" ? 25 : 50;
  doomWorldState.ammo = startingAmmo;
  doomWorldState.kills = 0;

  runtime.globalVars.salud = startingHealth;
  runtime.globalVars.health = startingHealth;
  runtime.globalVars.armadura = doomWorldState.armor;
  runtime.globalVars.cartuchos = startingAmmo;
  runtime.globalVars.ammo = startingAmmo;
  runtime.globalVars.score = 0;
  runtime.globalVars.menu_activo = hasStartMenu ? 1 : 0;

  runtime.m8_workers(4);
  runtime.start_mode8_hybrid(0, 39, 44, 45);
  runtime.m8_set_doom_map(finalLinedefs, finalSectors);
  runtime.m8_set_weapon(initialWeapon);

  if (runtime.m8[0]) {
    runtime.m8[0].engineMode = "doom2";
    runtime.m8[0].placedVoxels = placedVoxels;
    runtime.m8[0].placedModels = placedModels;
    runtime.m8[0].lights = finalLights;
    runtime.m8[0].entities = entities.filter((e) => e.type !== "player");
    runtime.m8[0].showAutomap = showHudAutomap;
    runtime.m8[0].cameraMode = cameraMode;
    runtime.m8[0].skyTexture = skyTexture;
    runtime.m8[0].playerModelId = playerModelId;
    runtime.m8[0].x = startX;
    runtime.m8[0].y = startY;
    const initFloor = findFloorHeightAt(startX, startY) ?? 0;
    runtime.m8[0].z = initFloor;
  }

  const weaponOrder = ["shotgun", "pistol", "sword3d", "staff3d"];
  const weaponLabels: Record<string, string> = {
    shotgun: "Escopeta 12G",
    pistol: "Pistola Táctica",
    sword3d: "Espada 3D",
    staff3d: "Báculo Arcano",
  };
  let activeWeapon = initialWeapon;

  // Player Marine + Interactive Start/Pause Menu Controller
  runtime.registerProcess("jugador_marine", function* (proc, _, rt) {
    proc.file = fpgId;
    proc.x = startX * 64;
    proc.y = startY * 64;
    proc.z = findFloorHeightAt(startX, startY) ?? 0;
    proc.angle = 0;
    proc.localVars.__worldScale = 64;
    if (rt.m8[0]) rt.m8[0].camera = proc.id;

    let shootCooldown = 0;
    let menuIndex = 0;
    let showControlsCard = false;
    let prevMouseLeft = false;
    let keyUpLock = false;
    let keyDownLock = false;
    let keyEnterLock = false;
    let keyEscLock = false;
    let keyCamLock = false;
    let orbitAngle = 0;
    let velZ = 0;
    let feetZ = findFloorHeightAt(startX, startY) ?? 0;
    const cameraCycle: Mode8CameraMode[] = ["third_person", "fps", "isometric", "orbit"];

    const THEME_MAP = {
      winebox_clean: {
        backdrop: "rgba(247, 248, 250, 0.88)",
        cardBg: "rgba(255, 255, 255, 0.96)",
        border: "#7C2D48",
        title: "#111827",
        subtitle: "#4B5563",
        accent: "#7C2D48",
        accentText: "#FFFFFF",
        btnIdle: "#F1F5F9",
        btnIdleText: "#1E293B",
        hudBg: "rgba(17, 24, 39, 0.80)",
      },
      doom_dark: {
        backdrop: "rgba(9, 11, 16, 0.84)",
        cardBg: "rgba(24, 24, 27, 0.95)",
        border: "#dc2626",
        title: "#facc15",
        subtitle: "#cbd5e1",
        accent: "#b91c1c",
        accentText: "#ffffff",
        btnIdle: "#27272a",
        btnIdleText: "#f8fafc",
        hudBg: "rgba(15, 23, 42, 0.82)",
      },
      cyber_neon: {
        backdrop: "rgba(5, 11, 26, 0.84)",
        cardBg: "rgba(11, 19, 43, 0.94)",
        border: "#06b6d4",
        title: "#38bdf8",
        subtitle: "#a5f3fc",
        accent: "#0284c7",
        accentText: "#ffffff",
        btnIdle: "#162347",
        btnIdleText: "#e0f2fe",
        hudBg: "rgba(11, 19, 43, 0.85)",
      },
      medieval_gold: {
        backdrop: "rgba(18, 14, 10, 0.86)",
        cardBg: "rgba(31, 23, 18, 0.95)",
        border: "#d97706",
        title: "#fde68a",
        subtitle: "#d6d3d1",
        accent: "#b45309",
        accentText: "#ffffff",
        btnIdle: "#292019",
        btnIdleText: "#fef3c7",
        hudBg: "rgba(31, 23, 18, 0.86)",
      },
    };
    const theme = THEME_MAP[menuTheme] || THEME_MAP.winebox_clean;

    while (!proc.isDead) {
      const w = rt.width;
      const h = rt.height;
      const mouseDown = Boolean(rt.mouseState?.left);
      const justClicked = mouseDown && !prevMouseLeft;
      prevMouseLeft = mouseDown;

      const escNow = rt.key("esc") || rt.isKeyDown("Escape");
      if (escNow && !keyEscLock) {
        rt.globalVars.menu_activo = rt.globalVars.menu_activo === 1 ? 0 : 1;
        showControlsCard = false;
      }
      keyEscLock = escNow;

      if (rt.globalVars.menu_activo === 1) {
        // Gentle background 3D showcase rotation
        orbitAngle = (orbitAngle + 0.35) % 360;
        proc.angle = orbitAngle;

        const menuItems: { id: "play" | "weapon" | "controls"; label: string }[] = [
          { id: "play", label: `▶  ${playButtonText}` },
        ];
        if (showWeaponSelect && gameMode !== "exploration") {
          menuItems.push({
            id: "weapon",
            label: `Arma: ${weaponLabels[activeWeapon] || activeWeapon}`,
          });
        }
        if (showControlsButton) {
          menuItems.push({
            id: "controls",
            label: showControlsCard ? "Ocultar Controles" : "Controles y Ayuda",
          });
        }
        if (menuIndex >= menuItems.length) menuIndex = 0;

        // Keyboard navigation
        const upNow = rt.key("up") || rt.key("w") || rt.isKeyDown("ArrowUp");
        const downNow = rt.key("down") || rt.key("s") || rt.isKeyDown("ArrowDown");
        const enterNow = rt.key("enter") || rt.key("space") || rt.isKeyDown("Enter");

        if (upNow && !keyUpLock) {
          menuIndex = (menuIndex - 1 + menuItems.length) % menuItems.length;
        }
        if (downNow && !keyDownLock) {
          menuIndex = (menuIndex + 1) % menuItems.length;
        }
        keyUpLock = upNow;
        keyDownLock = downNow;

        const triggerMenuAction = (itemId: "play" | "weapon" | "controls") => {
          if (itemId === "play") {
            rt.globalVars.menu_activo = 0;
            showControlsCard = false;
            proc.angle = 0;
          } else if (itemId === "weapon") {
            const nextIdx = (weaponOrder.indexOf(activeWeapon) + 1) % weaponOrder.length;
            activeWeapon = weaponOrder[nextIdx];
            rt.m8_set_weapon(activeWeapon);
          } else if (itemId === "controls") {
            showControlsCard = !showControlsCard;
          }
        };

        if (enterNow && !keyEnterLock) {
          triggerMenuAction(menuItems[menuIndex].id);
        }
        keyEnterLock = enterNow;

        // Draw responsive centered menu card on top of live 3D view
        rt.drawBox(0, 0, w, h, theme.backdrop);
        const cardW = Math.min(w - 32, 420);
        const cardH = Math.min(h - 32, showControlsCard ? 360 : 280);
        const cx1 = Math.round((w - cardW) / 2);
        const cy1 = Math.round((h - cardH) / 2);
        const cx2 = cx1 + cardW;
        const cy2 = cy1 + cardH;

        rt.drawBox(cx1, cy1, cx2, cy2, theme.cardBg);
        rt.drawOutlineBox(cx1, cy1, cx2, cy2, theme.border);
        rt.drawBox(cx1, cy1, cx2, cy1 + 6, theme.border);

        const textFont = -1; // Clean readable UI text with Spanish accents
        rt.drawText(textFont, Math.round(w / 2), cy1 + 24, 1, gameTitle.toUpperCase());
        rt.drawText(textFont, Math.round(w / 2), cy1 + 46, 1, gameSubtitle.slice(0, 48));
        rt.drawText(
          textFont,
          Math.round(w / 2),
          cy1 + 68,
          1,
          `Modo: ${gameMode.toUpperCase()}  |  Dificultad: ${difficulty.toUpperCase()}`
        );

        const mx = rt.mouseState?.x ?? -1;
        const my = rt.mouseState?.y ?? -1;

        menuItems.forEach((item, idx) => {
          const bx1 = cx1 + 28;
          const bx2 = cx2 - 28;
          const by1 = cy1 + 98 + idx * 44;
          const by2 = by1 + 36;
          const hovered = mx >= bx1 && mx <= bx2 && my >= by1 && my <= by2;
          if (hovered) menuIndex = idx;
          const isSelected = menuIndex === idx;

          rt.drawBox(bx1, by1, bx2, by2, isSelected ? theme.accent : theme.btnIdle);
          rt.drawOutlineBox(bx1, by1, bx2, by2, isSelected ? theme.border : "#94a3b8");
          rt.drawText(textFont, Math.round((bx1 + bx2) / 2), by1 + 11, 1, item.label);

          if (justClicked && hovered) {
            triggerMenuAction(item.id);
          }
        });

        if (showControlsCard) {
          const infoY = cy1 + 98 + menuItems.length * 44 + 8;
          rt.drawBox(cx1 + 24, infoY, cx2 - 24, cy2 - 14, theme.btnIdle);
          rt.drawOutlineBox(cx1 + 24, infoY, cx2 - 24, cy2 - 14, theme.border);
          rt.drawText(textFont, Math.round(w / 2), infoY + 12, 1, "WASD / Flechas: Caminar y Girar");
          rt.drawText(textFont, Math.round(w / 2), infoY + 32, 1, "Espacio / Click: Disparar  |  E: Puertas");
          rt.drawText(textFont, Math.round(w / 2), infoY + 52, 1, "TAB: Minimapa  |  1-4: Armas  |  ESC: Menú");
        }

        yield;
        continue;
      }

      // -------------------------------------------------------------
      // ACTIVE 3D GAMEPLAY LOOP
      // -------------------------------------------------------------
      const menuBtnX1 = w - 92;
      const menuBtnY1 = 8;
      const menuBtnX2 = w - 10;
      const menuBtnY2 = 34;

      rt.drawBox(8, 8, Math.min(w - 100, 320), 34, theme.hudBg);
      rt.drawOutlineBox(8, 8, Math.min(w - 100, 320), 34, theme.border);
      rt.drawText(
        -1,
        16,
        14,
        0,
        `SALUD: ${rt.globalVars.salud}  |  MUN: ${rt.globalVars.cartuchos}  |  PTS: ${rt.globalVars.score}`
      );

      if (hasStartMenu || showControlsButton) {
        rt.drawBox(menuBtnX1, menuBtnY1, menuBtnX2, menuBtnY2, theme.accent);
        rt.drawOutlineBox(menuBtnX1, menuBtnY1, menuBtnX2, menuBtnY2, theme.border);
        rt.drawText(-1, Math.round((menuBtnX1 + menuBtnX2) / 2), menuBtnY1 + 7, 1, "MENÚ");
      }

      const mx = rt.mouseState?.x ?? -1;
      const my = rt.mouseState?.y ?? -1;
      const clickedMenuBtn = justClicked && mx >= menuBtnX1 && mx <= menuBtnX2 && my >= menuBtnY1 && my <= menuBtnY2;
      if (clickedMenuBtn && (hasStartMenu || showControlsButton)) {
        rt.globalVars.menu_activo = 1;
        yield;
        continue;
      }

      const speedScale = difficulty === "pesadilla" ? 4.6 : 4.0;
      const rotVel = 3.2;

      const turnLeft = rt.key("left") || rt.isKeyDown("ArrowLeft") || rt.key("q") || rt.isKeyDown("KeyQ");
      const turnRight = rt.key("right") || rt.isKeyDown("ArrowRight");
      const up = rt.key("up") || rt.key("w") || rt.isKeyDown("KeyW") || rt.isKeyDown("ArrowUp");
      const down = rt.key("down") || rt.key("s") || rt.isKeyDown("KeyS") || rt.isKeyDown("ArrowDown");
      const strafeLeft = rt.key("a") || rt.isKeyDown("KeyA");
      const strafeRight = rt.key("d") || rt.isKeyDown("KeyD");

      if (turnLeft) proc.angle = (proc.angle - rotVel + 360) % 360;
      if (turnRight) proc.angle = (proc.angle + rotVel) % 360;

      const rad = (proc.angle * Math.PI) / 180;
      const dirX = Math.cos(rad);
      const dirY = Math.sin(rad);

      let dx = 0;
      let dy = 0;
      if (up) {
        dx += dirX * speedScale;
        dy += dirY * speedScale;
      }
      if (down) {
        dx -= dirX * (speedScale * 0.72);
        dy -= dirY * (speedScale * 0.72);
      }
      if (strafeLeft) {
        dx += Math.sin(rad) * (speedScale * 0.8);
        dy -= Math.cos(rad) * (speedScale * 0.8);
      }
      if (strafeRight) {
        dx -= Math.sin(rad) * (speedScale * 0.8);
        dy += Math.cos(rad) * (speedScale * 0.8);
      }

      if (dx !== 0 || dy !== 0) {
        const nextPos = rt.moveMode8WithCollision(proc.x / 64, proc.y / 64, dx / 64, dy / 64, 0.22, feetZ);
        proc.x = nextPos.x * 64;
        proc.y = nextPos.y * 64;
        if (rt.m8[0]) {
          rt.m8[0].walkCycle = (rt.m8[0].walkCycle || 0) + 0.16;
        }
      }

      // True vertical gravity & sector floor collision
      const groundZ = findFloorHeightAt(proc.x / 64, proc.y / 64) ?? 0;
      const onGround = feetZ <= groundZ + 0.03 && velZ <= 0;
      const wantsJump =
        rt.key("space") ||
        rt.isKeyDown("Space") ||
        rt.key("j") ||
        rt.isKeyDown("KeyJ");
      if (wantsJump && onGround) {
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

      if (shootCooldown > 0) shootCooldown--;
      const wantsShoot =
        !clickedMenuBtn &&
        (rt.key("f") || rt.isKeyDown("KeyF") || rt.key("control") || rt.mouseState.left);

      if (wantsShoot && shootCooldown === 0) {
        if (activeWeapon === "sword3d" || activeWeapon === "staff3d" || rt.globalVars.cartuchos > 0) {
          if (activeWeapon !== "sword3d" && activeWeapon !== "staff3d") {
            rt.globalVars.cartuchos--;
            doomWorldState.ammo = rt.globalVars.cartuchos;
          }
          rt.m8_attack();
          shootCooldown = 16;
        }
      }

      if (rt.key("1") || rt.key("digit1")) { activeWeapon = "pistol"; rt.m8_set_weapon("pistol"); }
      if (rt.key("2") || rt.key("digit2")) { activeWeapon = "shotgun"; rt.m8_set_weapon("shotgun"); }
      if (rt.key("3") || rt.key("digit3")) { activeWeapon = "sword3d"; rt.m8_set_weapon("sword3d"); }
      if (rt.key("4") || rt.key("digit4")) { activeWeapon = "staff3d"; rt.m8_set_weapon("staff3d"); }

      const camKeyNow = rt.key("c") || rt.isKeyDown("KeyC");
      if (camKeyNow && !keyCamLock && rt.m8[0]) {
        const curCam = rt.m8[0].cameraMode || "third_person";
        const nextCam = cameraCycle[(cameraCycle.indexOf(curCam) + 1) % cameraCycle.length];
        rt.m8[0].cameraMode = nextCam;
      }
      keyCamLock = camKeyNow;

      if (rt.key("e")) {
        rt.interact_mode8();
      }

      yield;
    }
  });

  runtime.spawn("jugador_marine");
  return true;
}

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

  // 3. Check custom Mode 8 Doom 2 / ReDoomEd generated worlds with interactive menus
  if (trySetupCustomMode8Game(runtime, code, title)) {
    return;
  }

  // 4. Check if code matches an existing full engine preset
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
