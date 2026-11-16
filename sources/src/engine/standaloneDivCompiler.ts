import { DIV_CONSTANTS, Token, TokenType, tokenizeDiv } from "./divParser";
import { inferPlacedModelStats } from "./mode8Geometry";

export interface CompiledStandaloneResult {
  mode: "div_compiled" | "mode8_custom" | "minimal_blank";
  title: string;
  width: number;
  height: number;
  backgroundColor: string;
  compiledJs: string;
  mode8WorldJson?: string;
}

function readStrConstant(code: string, key: string, fallback: string): string {
  const m = code.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : fallback;
}

function readNumConstant(code: string, key: string, fallback: number): number {
  const m = code.match(new RegExp(`${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`, "i"));
  return m ? parseFloat(m[1]) : fallback;
}

export function extractStandaloneResolution(code: string, fallbackRes: string): { width: number; height: number } {
  if (/set_mode\s*\(\s*m320x200\s*\)/i.test(code) || /set_mode\s*\(\s*320\s*,\s*200\s*\)/i.test(code)) {
    return { width: 320, height: 200 };
  }
  if (/set_mode\s*\(\s*m800x600\s*\)/i.test(code) || /set_mode\s*\(\s*800\s*,\s*600\s*\)/i.test(code)) {
    return { width: 800, height: 600 };
  }
  if (/set_mode\s*\(\s*m640x480\s*\)/i.test(code) || /set_mode\s*\(\s*640\s*,\s*480\s*\)/i.test(code)) {
    return { width: 640, height: 480 };
  }
  const parts = (fallbackRes || "640x480").split("x").map(Number);
  return {
    width: parts[0] && !isNaN(parts[0]) ? parts[0] : 640,
    height: parts[1] && !isNaN(parts[1]) ? parts[1] : 480,
  };
}

export function extractBackgroundColor(code: string): string {
  const rgbMatch = code.match(/screen_color\s*\(\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\)/i);
  if (rgbMatch) {
    return `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`;
  }
  const hexMatch = code.match(/screen_color\s*\(\s*["'](#?[a-zA-Z0-9]+)["']\s*\)/i);
  if (hexMatch) {
    return hexMatch[1];
  }
  return "#090e1a";
}

const DEFAULT_MODE8_GRID: number[][] = [
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

function extractCustomMode8World(code: string, title: string) {
  const constMap = buildConstSymbolMap(code);
  const lower = code.toLowerCase();

  const sectors: any[] = [];
  const sectorRegex =
    /m8_set_doom_sector\s*\(\s*(\d+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+))?\s*\)\s*;?/gi;
  let sm: RegExpExecArray | null;
  while ((sm = sectorRegex.exec(code)) !== null) {
    const flTex = sm[4] || "STUD_FLOOR_BLUE";
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
      ceilTexture: sm[5] || "SKY_ROBLOX",
      lightLevel: parseInt(sm[6], 10) || 220,
      special: sm[7] ? parseInt(sm[7], 10) : 0,
      tag: sm[8] ? parseInt(sm[8], 10) : 0,
      fluidType: inferredFluid,
    });
  }

  const linedefs: any[] = [];
  const lineRegex =
    /m8_add_doom_line\s*\(\s*"([^"]*)"\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*(\d+)\s*,\s*(-?\d+)\s*,\s*(\d+)\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"(?:\s*,\s*(\d+))?\s*\)\s*;?/gi;
  let lm: RegExpExecArray | null;
  while ((lm = lineRegex.exec(code)) !== null) {
    const backId = parseInt(lm[7], 10);
    const twoSided = parseInt(lm[8], 10) === 1;
    const blocking = lm[12] !== undefined ? parseInt(lm[12], 10) !== 0 : !twoSided;
    linedefs.push({
      id: lm[1] || `w_${linedefs.length}`,
      x1: parseFloat(lm[2]),
      y1: parseFloat(lm[3]),
      x2: parseFloat(lm[4]),
      y2: parseFloat(lm[5]),
      frontSectorId: parseInt(lm[6], 10),
      backSectorId: backId >= 0 ? backId : undefined,
      isTwoSided: twoSided,
      middleTexture: lm[9] || undefined,
      lowerTexture: lm[10] || undefined,
      upperTexture: lm[11] || undefined,
      blocking,
    });
  }

  // Extract default wall/floor/sky textures from start_mode8 / start_mode8_hybrid or CONSTs
  let defaultWallTex = "STUD_WALL_BLUE";
  let secondaryWallTex = "STUD_GOLD";
  let floorTexId = "STUD_FLOOR_BLUE";
  let ceilTexId = readStrConstant(code, "CIELO_TEXTURA", "SKY_ROBLOX");
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

  // Extract m8_set_sector(gx, gy, floorH, ceilH, fTex, cTex, wScale, fluid)
  const gridSectors = new Map<string, { gx: number; gy: number; floorHeight: number; ceilHeight: number; fTex: string; cTex: string; fluidType?: string }>();
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
      fluidType: fluid !== "none" ? fluid : undefined,
    });
  }

  // Extract m8_set_fluid(gx, gy, fluidType)
  const m8FluidRe = /m8_set_fluid\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*([^)]+)\s*\)/gi;
  let gflM: RegExpExecArray | null;
  while ((gflM = m8FluidRe.exec(code)) !== null) {
    const gx = parseInt(gflM[1], 10);
    const gy = parseInt(gflM[2], 10);
    const fluidType = resolveArgString(gflM[3], constMap, "lava").toLowerCase();
    const key = `${gx},${gy}`;
    const existing = gridSectors.get(key);
    if (existing) {
      existing.fluidType = fluidType;
    } else {
      gridSectors.set(key, {
        gx,
        gy,
        floorHeight: -0.22,
        ceilHeight: 1.8,
        fTex: floorTexId,
        cTex: ceilTexId,
        fluidType,
      });
    }
  }

  // Auto-generate Doom polygonal sectors & linedefs from 16x16 dungeon grid if none explicitly authored
  if (linedefs.length === 0) {
    if (sectors.length === 0) {
      sectors.push({
        id: 0,
        floorHeight: 0,
        ceilHeight: 1.5,
        floorTexture: floorTexId || "FLOOR4_8",
        ceilTexture: ceilTexId || "CEIL3_5",
        lightLevel: 195,
        special: 0,
        tag: 0,
      });
    }

    const cellSectorIdMap = new Map<string, number>();
    let nextSecId = sectors.reduce((mx, s) => Math.max(mx, s.id), 0) + 1;
    gridSectors.forEach((info, key) => {
      const sid = nextSecId++;
      cellSectorIdMap.set(key, sid);
      sectors.push({
        id: sid,
        floorHeight: info.floorHeight,
        ceilHeight: info.ceilHeight,
        floorTexture: info.fTex || floorTexId,
        ceilTexture: info.cTex || ceilTexId,
        fluidType: info.fluidType,
        lightLevel: info.fluidType === "lava" ? 230 : 185,
        special: 0,
        tag: 0,
      });
    });

    const gh = DEFAULT_MODE8_GRID.length;
    const gw = DEFAULT_MODE8_GRID[0].length;
    const getCell = (gx: number, gy: number) =>
      gy >= 0 && gy < gh && gx >= 0 && gx < gw ? DEFAULT_MODE8_GRID[gy][gx] : 1;

    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const cellVal = getCell(gx, gy);
        if (cellVal > 0) continue; // Only process open floor cells & look outward to walls or adjacent special sectors
        const curSecId = cellSectorIdMap.get(`${gx},${gy}`) ?? 0;

        // Check 4 neighbors: North (0,-1), East (1,0), South (0,1), West (-1,0)
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
            linedefs.push({
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
            // Emit one two-sided portal edge for differing neighbor sector heights (avoid duplicate by ordering)
            if (curSecId !== nbSecId && (curSecId < nbSecId || (gy * gw + gx) < (nb.ny * gw + nb.nx))) {
              linedefs.push({
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
  }

  // Placed MD2/MD3 Models: supports 5..12 arguments m8_add_model/m8_place_model(...)
  const placedModels: any[] = [];
  const modelRe =
    /m8_(?:add|place)_model\s*\(\s*([^,]+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)(?:\s*,\s*([^,)]+))?(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?(?:\s*,\s*([^,)]+))?(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?(?:\s*,\s*([^)]+))?\s*\)\s*;?/gi;
  let modM: RegExpExecArray | null;
  while ((modM = modelRe.exec(code)) !== null) {
    const modelId = resolveArgString(modM[1], constMap, "blox_knight");
    const x = parseFloat(modM[2]);
    const y = parseFloat(modM[3]);
    const z = parseFloat(modM[4]);
    const yaw = parseFloat(modM[5]);
    const anim = resolveArgString(modM[6] || "walk", constMap, "walk");
    const scale = modM[7] ? parseFloat(modM[7]) : 1.0;
    const rawRole = modM[8] ? resolveArgString(modM[8], constMap, "") : undefined;
    const rawHp = modM[9] ? parseInt(modM[9], 10) : undefined;
    const rawSpeed = modM[10] ? parseFloat(modM[10]) : undefined;
    const rawDmg = modM[11] ? parseInt(modM[11], 10) : undefined;
    const rawName = modM[12] ? resolveArgString(modM[12], constMap, "") : undefined;

    const stats = inferPlacedModelStats({
      id: `mod_${placedModels.length}_${modelId}`,
      modelId,
      x,
      y,
      z,
      yaw,
      scale,
      animation: (anim as any) || "walk",
      role: rawRole as any,
      hp: rawHp,
      maxHp: rawHp,
      speed: rawSpeed,
      damage: rawDmg,
      name: rawName,
    });

    placedModels.push({
      id: `mod_${placedModels.length}_${modelId}`,
      modelId,
      x,
      y,
      z,
      yaw,
      animation: anim,
      scale,
      role: stats.role,
      hostile: stats.role === "enemy",
      hp: stats.hp,
      maxHp: stats.maxHp,
      speed: stats.speed,
      damage: stats.damage,
      patrolRadius: stats.patrolRadius,
      name: stats.name,
      homeX: x,
      homeY: y,
    });
  }

  // Placed Voxels: m8_place_voxel("id", x, y, z, yaw, scale) AND m8_add_voxel("id", x, y, z, scale, rotSpeed)
  const placedVoxels: any[] = [];
  const placeVoxRegex =
    /m8_place_voxel\s*\(\s*([^,]+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\)\s*;?/gi;
  let vm: RegExpExecArray | null;
  while ((vm = placeVoxRegex.exec(code)) !== null) {
    const voxelId = resolveArgString(vm[1], constMap, "voxel_potion");
    placedVoxels.push({
      id: `vox_${placedVoxels.length}_${voxelId}`,
      voxelId,
      x: parseFloat(vm[2]),
      y: parseFloat(vm[3]),
      z: parseFloat(vm[4]),
      yaw: parseFloat(vm[5]),
      scale: parseFloat(vm[6]) || 1,
      rotSpeed: 0,
    });
  }
  const addVoxRegex =
    /m8_add_voxel\s*\(\s*([^,]+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?(?:\s*,\s*([-+]?\d+(?:\.\d+)?))?\s*\)\s*;?/gi;
  while ((vm = addVoxRegex.exec(code)) !== null) {
    const voxelId = resolveArgString(vm[1], constMap, "vox_potion");
    placedVoxels.push({
      id: `vox_${placedVoxels.length}_${voxelId}`,
      voxelId,
      x: parseFloat(vm[2]),
      y: parseFloat(vm[3]),
      z: parseFloat(vm[4]),
      yaw: 0,
      scale: vm[5] ? parseFloat(vm[5]) : 1.0,
      rotSpeed: vm[6] ? parseFloat(vm[6]) : 2.0,
    });
  }

  const lights: any[] = [];
  const lightRegex =
    /m8_add_light\s*\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([^,)]+))?(?:\s*,\s*([^,)]+))?\s*\)\s*;?/gi;
  let lim: RegExpExecArray | null;
  while ((lim = lightRegex.exec(code)) !== null) {
    const flickerRaw = (lim[8] || "").trim().toLowerCase();
    lights.push({
      id: `l_${lights.length}`,
      x: parseFloat(lim[1]),
      y: parseFloat(lim[2]),
      z: parseFloat(lim[3]),
      radius: parseFloat(lim[4]) || 8,
      r: parseInt(lim[5], 10) || 255,
      g: parseInt(lim[6], 10) || 200,
      b: parseInt(lim[7], 10) || 140,
      flicker: flickerRaw === "true" || flickerRaw === "1",
    });
  }

  const entities: any[] = [];
  const entRegex =
    /m8_spawn_entity\s*\(\s*"([^"]*)"\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*"([^"]*)"(?:\s*,\s*(\d+))?\s*\)\s*;?/gi;
  let em: RegExpExecArray | null;
  while ((em = entRegex.exec(code)) !== null) {
    const wx = parseFloat(em[2]);
    const wy = parseFloat(em[3]);
    entities.push({
      id: `ent_${entities.length}`,
      type: em[1] || "monster",
      x: Math.abs(wx) > 40 ? wx / 64 : wx,
      y: Math.abs(wy) > 40 ? wy / 64 : wy,
      name: em[4] || em[1],
      graph: em[5] ? parseInt(em[5], 10) : em[1] === "player" ? 1 : em[1] === "barrel" ? 29 : 27,
    });
  }

  // Also capture classic Mode 8 DIV spawner calls (demonio_slime, demonio_imp, antorcha_3d, barril_3d, tesoro_3d, botiquin_salud, caja_cartuchos)
  // Ignore PROCESS declarations by checking we're not preceded by PROCESS/FUNCTION keyword
  const divSpawnDefs: Array<{ fn: string; type: string; graph: number; name: string }> = [
    { fn: "demonio_slime", type: "monster", graph: 27, name: "Demonio Slime" },
    { fn: "demonio_imp", type: "monster", graph: 27, name: "Demonio Imp" },
    { fn: "antorcha_3d", type: "torch", graph: 28, name: "Antorcha" },
    { fn: "barril_3d", type: "barrel", graph: 29, name: "Barril" },
    { fn: "tesoro_3d", type: "treasure", graph: 24, name: "Tesoro" },
    { fn: "botiquin_salud", type: "medikit", graph: 35, name: "Botiquin" },
    { fn: "caja_cartuchos", type: "ammo", graph: 34, name: "Cartuchos" },
  ];
  for (const def of divSpawnDefs) {
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
        x: Math.abs(wx) > 40 ? wx / 64 : wx,
        y: Math.abs(wy) > 40 ? wy / 64 : wy,
        name: def.name,
        graph: def.graph,
      });
    }
  }

  let startX = 3.5;
  let startY = 3.5;
  const playerSpawnMatch = code.match(
    /(?:jugador_doom|jugador_marine|jugador_blox|jugador_fps|jugador_hexen|jugador_cripta)\s*\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\)/i
  );
  if (playerSpawnMatch) {
    const rx = parseFloat(playerSpawnMatch[1]);
    const ry = parseFloat(playerSpawnMatch[2]);
    startX = Math.abs(rx) > 40 ? rx / 64 : rx;
    startY = Math.abs(ry) > 40 ? ry / 64 : ry;
  } else {
    const pEnt = entities.find((e) => e.type === "player");
    if (pEnt) {
      startX = pEnt.x;
      startY = pEnt.y;
    }
  }

  // Weapon selection: m8_set_weapon(...) or ARMA_INICIAL constant
  let initialWeapon = resolveArgString(constMap.get("ARMA_INICIAL") || "", constMap, "");
  const weaponCallMatch = code.match(/m8_set_weapon\s*\(\s*([^)]+)\s*\)/i);
  if (weaponCallMatch) {
    initialWeapon = resolveArgString(weaponCallMatch[1], constMap, initialWeapon || "shotgun");
  }
  if (!initialWeapon) {
    initialWeapon = lower.includes("sword3d") ? "sword3d" : lower.includes("pistol") ? "pistol" : "shotgun";
  }

  const isReDoomEdExport =
    lower.includes("mostrar_menu") ||
    lower.includes("mapa generado con redoomed") ||
    lower.includes("m8_add_doom_line");

  const startMenuDefault = isReDoomEdExport ? 1 : 0;
  const parsedMenuNum = readNumConstant(code, "MOSTRAR_MENU", startMenuDefault);

  const initHealth = readNumConstant(
    code,
    "SALUD_INICIAL",
    readNumConstant(code, "VIDA_JUGADOR", readNumConstant(code, "salud", 100))
  );
  const initAmmo = readNumConstant(
    code,
    "MUNICION_INICIAL",
    readNumConstant(code, "cartuchos", readNumConstant(code, "municion", 32))
  );

  const cameraRaw = readStrConstant(code, "CAMARA_MODO", "third_person").toLowerCase();
  const cameraMode =
    cameraRaw === "fps" || cameraRaw === "isometric" || cameraRaw === "orbit"
      ? cameraRaw
      : "third_person";
  const skyTexture = readStrConstant(code, "CIELO_TEXTURA", "SKY_ROBLOX");
  const playerModelId = readStrConstant(code, "JUGADOR_MODELO", "blox_hero");

  return {
    title: readStrConstant(code, "TITULO_JUEGO", title || "Mundo 3D Modo 8"),
    subtitle: readStrConstant(code, "SUBTITULO_JUEGO", "Mundo 3D compilado en WXDIV"),
    hasStartMenu: parsedMenuNum !== 0,
    menuTheme: readStrConstant(code, "TEMA_MENU", "winebox_clean"),
    playButtonText: readStrConstant(code, "BOTON_JUGAR", "Jugar Ahora"),
    showControlsButton: readNumConstant(code, "MOSTRAR_CONTROLES", 1) !== 0,
    showWeaponSelect: readNumConstant(code, "SELECTOR_ARMA_MENU", 1) !== 0,
    initialWeapon,
    defaultWallTexture: defaultWallTex,
    secondaryWallTexture: secondaryWallTex,
    startingHealth: Math.max(10, Math.min(999, Math.round(initHealth))),
    startingAmmo: Math.max(0, Math.min(999, Math.round(initAmmo))),
    difficulty: readStrConstant(code, "DIFICULTAD", "normal"),
    gameMode: readStrConstant(code, "MODO_JUEGO", "shooter"),
    cameraMode,
    skyTexture,
    playerModelId,
    showAutomap: readNumConstant(code, "MOSTRAR_MINIMAPA", 1) !== 0,
    startX,
    startY,
    sectors,
    linedefs,
    placedModels,
    placedVoxels,
    lights,
    entities,
  };
}

const PROC_FIELDS = new Set([
  "id",
  "father",
  "son",
  "bigbro",
  "smallbro",
  "x",
  "y",
  "z",
  "graph",
  "file",
  "flags",
  "size",
  "angle",
  "alpha",
  "priority",
  "region",
  "resolution",
  "ctype",
  "cnumber",
]);

const RESERVED_DIV_CONST_MAP: Record<string, string> = {
  m320x200: "320200",
  m640x480: "640480",
  m800x600: "800600",
  m1024x768: "1024768",
  m_html5: '"m_html5"',
  html5: '"html5"',
  s_kill: '"s_kill"',
  s_freeze: '"s_freeze"',
  s_wakeup: '"s_wakeup"',
  s_sleep: '"s_sleep"',
  s_kill_tree: '"s_kill_tree"',
  all_text: '"all_text"',
  c_screen: "0",
  c_scroll: "1",
  c_m7: "7",
  c_m8: "8",
  true: "1",
  false: "0",
  null: "0",
  admob_top: '"top"',
  admob_bottom: '"bottom"',
  m8_classic: '"classic"',
  m8_hybrid: '"hybrid"',
  fluid_water: '"water"',
  fluid_lava: '"lava"',
  fluid_acid: '"acid"',
  fluid_blood: '"blood"',
  fluid_none: '"none"',
  _1: '"1"',
  _2: '"2"',
  _3: '"3"',
  _tab: '"tab"',
};

const BUILTIN_FUNCTION_NAMES = new Set([
  "set_mode",
  "set_fps",
  "set_title",
  "screen_color",
  "load_fpg",
  "unload_fpg",
  "load_map",
  "unload_map",
  "load_pal",
  "fade_on",
  "fade_off",
  "clear_screen",
  "write",
  "write_int",
  "write_string",
  "delete_text",
  "move_text",
  "load_fnt",
  "draw_text",
  "draw_box",
  "draw_outline_box",
  "draw_line",
  "draw_circle",
  "draw_fcircle",
  "put",
  "xput",
  "put_pixel",
  "map_put",
  "get_dist",
  "get_angle",
  "get_id",
  "advance",
  "xadvance",
  "near_angle",
  "rand",
  "abs",
  "sqrt",
  "cos",
  "sin",
  "tan",
  "atan2",
  "floor",
  "ceil",
  "round",
  "min",
  "max",
  "clamp",
  "int",
  "float",
  "str",
  "len",
  "atof",
  "ftoa",
  "fget_dist",
  "fget_angle",
  "collision",
  "signal",
  "let_me_alone",
  "exists",
  "exit",
  "sound",
  "sound_play",
  "stop_sound",
  "sound_stop",
  "load_wav",
  "load_snd",
  "load_pcm",
  "load_song",
  "song",
  "stop_song",
  "rgb",
  "rgba",
  "key",
  "draw_button",
  "draw_input",
  "draw_select",
  "draw_table",
  "draw_modal",
  "draw_tabs",
  "draw_checkbox",
  "set_ui_theme",
  "store_create",
  "store_get",
  "store_set",
  "save_json",
  "load_json",
  "sqlite_create_table",
  "sqlite_exec",
  "admob_init",
  "admob_show_banner",
  "admob_hide_banner",
  "admob_show_interstitial",
  "admob_show_rewarded",
  "admob_grant_reward",
  "start_mode8",
  "start_mode8_hybrid",
  "start_raycast",
  "stop_raycast",
  "start_mode7",
  "stop_mode7",
  "start_scroll",
  "stop_scroll",
  "m8_workers",
  "m8_raytracing",
  "m8_set_sector",
  "m8_set_doom_sector",
  "m8_add_doom_line",
  "m8_set_fluid",
  "m8_add_light",
  "m8_add_model",
  "m8_place_model",
  "m8_add_voxel",
  "m8_place_voxel",
  "m8_spawn_entity",
  "m8_set_weapon",
  "m8_attack",
  "m8_engine_mode",
  "interact_mode8",
]);

class DivToJsTranspiler {
  private tokens: Token[];
  private pos = 0;
  private procNames = new Set<string>();
  private globalNames = new Set<string>(["score", "hi_score", "lives", "level", "fps"]);
  private structNames = new Set<string>();

  constructor(code: string) {
    // Strip comments and whitespace tokens cleanly
    this.tokens = tokenizeDiv(code).filter(
      (t) => t.type !== TokenType.COMMENT && t.type !== TokenType.WHITESPACE
    );

    // Pre-scan declared PROCESS, FUNCTION, GLOBAL, CONST, STRUCT names
    for (let i = 0; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      const up = t.value.toUpperCase();
      if ((up === "PROCESS" || up === "FUNCTION") && this.tokens[i + 1]) {
        this.procNames.add(this.tokens[i + 1].value.toLowerCase());
      } else if (up === "STRUCT" && this.tokens[i + 1]) {
        this.structNames.add(this.tokens[i + 1].value.toLowerCase());
      }
    }
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private matchValue(val: string): boolean {
    const t = this.peek();
    if (t && t.value.toUpperCase() === val.toUpperCase()) {
      this.pos++;
      return true;
    }
    return false;
  }

  private isSectionOrBlockStarter(t?: Token): boolean {
    if (!t) return false;
    const up = t.value.toUpperCase();
    return ["PROGRAM", "GLOBAL", "LOCAL", "PRIVATE", "CONST", "STRUCT", "BEGIN", "PROCESS", "FUNCTION"].includes(up);
  }

  private isTypeKeyword(val: string): boolean {
    return ["INT", "BYTE", "WORD", "STRING", "FLOAT", "DOUBLE", "CHAR"].includes(val.toUpperCase());
  }

  private parseVarDeclSection(
    targetScope: "global" | "local" | "private",
    localSet: Set<string>,
    declaredJsSet?: Set<string>
  ): string[] {
    const lines: string[] = [];
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (!t) break;
      const up = t.value.toUpperCase();
      if (["BEGIN", "ONEXIT", "PROCESS", "FUNCTION", "GLOBAL", "LOCAL", "PRIVATE", "CONST", "STRUCT", "PROGRAM"].includes(up)) {
        break;
      }
      if (up === "END") {
        // Skip stray END after declaration blocks
        this.next();
        continue;
      }
      if (t.value === ";") {
        this.next();
        continue;
      }

      // Skip optional DIV type keyword
      if (this.isTypeKeyword(up)) {
        this.next();
      }

      const nameTok = this.peek();
      if (!nameTok || (nameTok.type !== TokenType.IDENTIFIER && nameTok.type !== TokenType.KEYWORD)) {
        this.next();
        continue;
      }
      this.next();
      const varName = nameTok.value.toLowerCase();

      if (targetScope === "global") {
        this.globalNames.add(varName);
      } else {
        localSet.add(varName);
      }

      // Array declaration: arr[N] [= ...]
      let arrayLen: number | null = null;
      if (this.peek()?.value === "[") {
        this.next();
        const lenTokens: Token[] = [];
        while (this.peek() && this.peek()!.value !== "]") {
          lenTokens.push(this.next()!);
        }
        if (this.peek()?.value === "]") this.next();
        arrayLen = parseInt(lenTokens.map((x) => x.value).join(""), 10) || 10;
      }

      let initExpr = "0";
      if (this.peek()?.value === "=") {
        this.next();
        const rhsParts: string[] = [];
        const exprVals: string[] = [];
        while (this.peek() && this.peek()!.value !== ";" && this.peek()!.value !== ",") {
          if (this.peek()!.value === "(") {
            exprVals.push(this.readParenthesizedExpr(localSet));
          } else {
            const nt = this.next()!;
            exprVals.push(this.formatAtomToken(nt, localSet));
          }
        }
        if (arrayLen !== null) {
          rhsParts.push(exprVals.join(" ") || "0");
          while (this.peek()?.value === ",") {
            this.next();
            const itemTokens: string[] = [];
            while (this.peek() && this.peek()!.value !== ";" && this.peek()!.value !== ",") {
              itemTokens.push(this.formatAtomToken(this.next()!, localSet));
            }
            rhsParts.push(itemTokens.join(" ") || "0");
          }
          initExpr = `[${rhsParts.join(", ")}]`;
        } else {
          initExpr = exprVals.join(" ") || "0";
        }
      } else if (arrayLen !== null) {
        initExpr = `new Array(${arrayLen}).fill(0)`;
      }

      if (targetScope === "global") {
        lines.push(`if (typeof __G.${varName} === "undefined") __G.${varName} = ${initExpr};`);
      } else if (declaredJsSet) {
        if (declaredJsSet.has(varName)) {
          lines.push(`_v_${varName} = ${initExpr};`);
        } else {
          declaredJsSet.add(varName);
          lines.push(`let _v_${varName} = ${initExpr};`);
        }
      } else {
        lines.push(`let _v_${varName} = ${initExpr};`);
      }

      if (this.peek()?.value === ",") {
        // Multi-variable comma declaration like: PRIVATE i, j;
        this.next();
        continue;
      }
      if (this.peek()?.value === ";") this.next();
    }
    return lines;
  }

  private formatAtomToken(t: Token, localSet: Set<string>): string {
    if (t.type === TokenType.STRING) {
      return JSON.stringify(t.value);
    }
    if (t.type === TokenType.NUMBER) {
      return t.value;
    }
    const low = t.value.toLowerCase();
    if (RESERVED_DIV_CONST_MAP[low] !== undefined) {
      return RESERVED_DIV_CONST_MAP[low];
    }
    if (low.startsWith("_") && DIV_CONSTANTS.has(low)) {
      return JSON.stringify(low.slice(1));
    }
    if (localSet.has(low)) {
      return `_v_${low}`;
    }
    if (PROC_FIELDS.has(low)) {
      return `__p.${low}`;
    }
    if (this.globalNames.has(low)) {
      return `__G.${low}`;
    }
    return t.value;
  }

  private readParenthesizedExpr(localSet: Set<string>): string {
    if (this.peek()?.value !== "(") return "()";
    this.next();
    let depth = 1;
    const inner: Token[] = [];
    while (this.pos < this.tokens.length && depth > 0) {
      const t = this.next()!;
      if (t.value === "(") depth++;
      else if (t.value === ")") {
        depth--;
        if (depth === 0) break;
      }
      inner.push(t);
    }
    return `(${this.compileTokensExpr(inner, localSet)})`;
  }

  private compileTokensExpr(exprTokens: Token[], localSet: Set<string>): string {
    if (exprTokens.length === 0) return "";
    const out: string[] = [];

    for (let i = 0; i < exprTokens.length; i++) {
      const t = exprTokens[i];
      const next = exprTokens[i + 1];
      const prev = exprTokens[i - 1];
      const low = t.value.toLowerCase();
      const up = t.value.toUpperCase();

      if (t.type === TokenType.STRING) {
        out.push(JSON.stringify(t.value));
        continue;
      }
      if (t.type === TokenType.NUMBER) {
        out.push(t.value);
        continue;
      }
      if (t.type === TokenType.OPERATOR) {
        if (up === "AND") out.push("&&");
        else if (up === "OR") out.push("||");
        else if (up === "NOT") out.push("!");
        else if (up === "MOD") out.push("%");
        else if (t.value === "&" && next && (next.type === TokenType.IDENTIFIER || next.type === TokenType.KEYWORD)) {
          // &varRef syntax used in write_int(..., &score)
          const refName = next.value.toLowerCase();
          out.push(JSON.stringify(refName));
          i++;
        } else {
          out.push(t.value);
        }
        continue;
      }
      if (t.type === TokenType.PUNCTUATION || t.type === TokenType.UNKNOWN) {
        out.push(t.value);
        continue;
      }

      if (RESERVED_DIV_CONST_MAP[low] !== undefined) {
        out.push(RESERVED_DIV_CONST_MAP[low]);
        continue;
      }
      if (low.startsWith("_") && DIV_CONSTANTS.has(low)) {
        out.push(JSON.stringify(low.slice(1)));
        continue;
      }
      if (up === "AND") {
        out.push("&&");
        continue;
      }
      if (up === "OR") {
        out.push("||");
        continue;
      }
      if (up === "NOT") {
        out.push("!");
        continue;
      }
      if (up === "MOD") {
        out.push("%");
        continue;
      }

      // Member access suffix after dot (e.g. mouse.x, father.x)
      if (prev && prev.value === ".") {
        out.push(t.value);
        continue;
      }

      // Built-in mouse global object
      if (low === "mouse") {
        out.push("__rt.mouse");
        continue;
      }
      if (low === "m7") {
        out.push("__rt.m7");
        continue;
      }
      if (low === "m8") {
        out.push("__rt.m8");
        continue;
      }

      // collision(type name) or signal(type name, ...)
      if ((low === "collision" || low === "signal") && next?.value === "(") {
        let j = i + 2;
        let depth = 1;
        const innerArgs: Token[] = [];
        while (j < exprTokens.length && depth > 0) {
          if (exprTokens[j].value === "(") depth++;
          else if (exprTokens[j].value === ")") {
            depth--;
            if (depth === 0) break;
          }
          innerArgs.push(exprTokens[j]);
          j++;
        }
        if (low === "collision") {
          if (innerArgs[0] && innerArgs[0].value.toUpperCase() === "TYPE" && innerArgs[1]) {
            out.push(`__rt.collision(__p, ${JSON.stringify(innerArgs[1].value.toLowerCase())})`);
          } else {
            out.push(`__rt.collision(__p, ${this.compileTokensExpr(innerArgs, localSet)})`);
          }
        } else {
          // signal(...)
          if (innerArgs[0] && innerArgs[0].value.toUpperCase() === "TYPE" && innerArgs[1]) {
            const rest = innerArgs.slice(2);
            const restCompiled = this.compileTokensExpr(rest, localSet);
            out.push(`__rt.signal(${JSON.stringify(innerArgs[1].value.toLowerCase())} ${restCompiled})`);
          } else {
            out.push(`__rt.signal(${this.compileTokensExpr(innerArgs, localSet)})`);
          }
        }
        i = j;
        continue;
      }

      // Built-in function call or process spawn call
      if (next?.value === "(") {
        if (BUILTIN_FUNCTION_NAMES.has(low)) {
          out.push(`__rt.${low}(`);
          i++; // skip '(' because we emitted it
          // Note: pass `__p` automatically for process-aware builtins below
          if (["advance", "xadvance", "draw_button", "draw_input", "draw_checkbox"].includes(low)) {
            const hasMoreArgs = exprTokens[i + 1]?.value !== ")";
            out.push(hasMoreArgs ? "__p, " : "__p");
          }
          continue;
        }
        if (this.procNames.has(low)) {
          out.push(`__rt.spawn(__p, ${JSON.stringify(low)}, [`);
          // Read matching parens to convert to array literal args
          let j = i + 2;
          let depth = 1;
          const innerArgs: Token[] = [];
          while (j < exprTokens.length && depth > 0) {
            if (exprTokens[j].value === "(") depth++;
            else if (exprTokens[j].value === ")") {
              depth--;
              if (depth === 0) break;
            }
            innerArgs.push(exprTokens[j]);
            j++;
          }
          out.push(`${this.compileTokensExpr(innerArgs, localSet)}])`);
          i = j;
          continue;
        }
      }

      // Identifier lookup
      if (localSet.has(low)) {
        out.push(`_v_${low}`);
      } else if (PROC_FIELDS.has(low)) {
        out.push(`__p.${low}`);
      } else if (this.procNames.has(low)) {
        out.push(JSON.stringify(low));
      } else if (this.globalNames.has(low) || this.structNames.has(low)) {
        out.push(`__G.${low}`);
      } else {
        // Fallback unknown variable stored safely in __G so undeclared DIV vars work
        this.globalNames.add(low);
        out.push(`__G.${low}`);
      }
    }

    return out.join(" ");
  }

  private readBalancedCondition(localSet: Set<string>): string {
    if (this.peek()?.value === "(") {
      this.next();
      let depth = 1;
      const condTokens: Token[] = [];
      while (this.pos < this.tokens.length && depth > 0) {
        const t = this.next()!;
        if (t.value === "(") depth++;
        else if (t.value === ")") {
          depth--;
          if (depth === 0) break;
        }
        condTokens.push(t);
      }
      return this.compileTokensExpr(condTokens, localSet) || "true";
    }
    const condTokens: Token[] = [];
    while (
      this.pos < this.tokens.length &&
      this.peek()!.value !== ";" &&
      this.peek()!.value.toUpperCase() !== "BEGIN" &&
      this.peek()!.value.toUpperCase() !== "END"
    ) {
      condTokens.push(this.next()!);
    }
    return this.compileTokensExpr(condTokens, localSet) || "true";
  }

  private parseStatementList(localSet: Set<string>, stopWords: string[]): string {
    const stmts: string[] = [];
    let guard = 0;

    while (this.pos < this.tokens.length && guard < 10000) {
      guard++;
      const t = this.peek();
      if (!t) break;
      const up = t.value.toUpperCase();
      if (stopWords.includes(up)) break;
      if (t.value === ";") {
        this.next();
        continue;
      }

      if (up === "FRAME") {
        this.next();
        if (this.peek()?.value === "(") {
          this.readParenthesizedExpr(localSet);
        }
        if (this.peek()?.value === ";") this.next();
        stmts.push(`if (__p.isDead) return; yield; if (__p.isDead) return;`);
        continue;
      }

      if (up === "LOOP") {
        this.next();
        const body = this.parseStatementList(localSet, ["END"]);
        this.matchValue("END");
        stmts.push(`while (!__p.isDead) {\n${body}\n}`);
        continue;
      }

      if (up === "WHILE") {
        this.next();
        const cond = this.readBalancedCondition(localSet);
        if (this.peek()?.value.toUpperCase() === "BEGIN") this.next();
        const body = this.parseStatementList(localSet, ["END"]);
        this.matchValue("END");
        stmts.push(`while (!__p.isDead && (${cond})) {\n${body}\n}`);
        continue;
      }

      if (up === "REPEAT") {
        this.next();
        const body = this.parseStatementList(localSet, ["UNTIL", "END"]);
        let cond = "true";
        if (this.matchValue("UNTIL")) {
          cond = this.readBalancedCondition(localSet);
          if (this.peek()?.value === ";") this.next();
        } else {
          this.matchValue("END");
        }
        stmts.push(`do {\n${body}\n} while (!__p.isDead && !(${cond}));`);
        continue;
      }

      if (up === "FOR") {
        this.next();
        if (this.peek()?.value === "(") this.next();
        const headerParts: Token[][] = [[], [], []];
        let partIdx = 0;
        let depth = 1;
        while (this.pos < this.tokens.length && depth > 0) {
          const ft = this.next()!;
          if (ft.value === "(") depth++;
          else if (ft.value === ")") {
            depth--;
            if (depth === 0) break;
          }
          if (ft.value === ";" && depth === 1 && partIdx < 2) {
            partIdx++;
            continue;
          }
          headerParts[partIdx].push(ft);
        }
        const initJs = this.compileTokensExpr(headerParts[0], localSet);
        const condJs = this.compileTokensExpr(headerParts[1], localSet) || "true";
        const stepJs = this.compileTokensExpr(headerParts[2], localSet);
        const body = this.parseStatementList(localSet, ["END"]);
        this.matchValue("END");
        stmts.push(`for (${initJs}; (${condJs}) && !__p.isDead; ${stepJs}) {\n${body}\n}`);
        continue;
      }

      if (up === "IF") {
        this.next();
        const cond = this.readBalancedCondition(localSet);
        const thenBody = this.parseStatementList(localSet, ["ELSE", "ELSIF", "END"]);
        let codeOut = `if (${cond}) {\n${thenBody}\n}`;
        while (this.peek()?.value.toUpperCase() === "ELSIF") {
          this.next();
          const elsCond = this.readBalancedCondition(localSet);
          const elsBody = this.parseStatementList(localSet, ["ELSE", "ELSIF", "END"]);
          codeOut += ` else if (${elsCond}) {\n${elsBody}\n}`;
        }
        if (this.matchValue("ELSE")) {
          const elseBody = this.parseStatementList(localSet, ["END"]);
          codeOut += ` else {\n${elseBody}\n}`;
        }
        this.matchValue("END");
        stmts.push(codeOut);
        continue;
      }

      if (up === "SWITCH") {
        this.next();
        const swExpr = this.readBalancedCondition(localSet);
        const swBlocks: string[] = [];
        let caseGuard = 0;
        while (this.pos < this.tokens.length && caseGuard < 200) {
          caseGuard++;
          const ct = this.peek();
          if (!ct) break;
          const cup = ct.value.toUpperCase();
          if (cup === "END") {
            this.next();
            break;
          }
          if (cup === "CASE") {
            this.next();
            const valToks: Token[] = [];
            while (this.peek() && this.peek()!.value !== ":" && this.peek()!.value !== ";") {
              valToks.push(this.next()!);
            }
            if (this.peek()?.value === ":" || this.peek()?.value === ";") this.next();
            const caseVal = this.compileTokensExpr(valToks, localSet);
            const caseBody = this.parseStatementList(localSet, ["CASE", "DEFAULT", "END"]);
            if (this.peek()?.value.toUpperCase() === "END") {
              // Peek if next token is CASE/DEFAULT/END (DIV allows optional END after CASE)
              const afterEnd = this.peek(1)?.value.toUpperCase();
              if (afterEnd === "CASE" || afterEnd === "DEFAULT" || afterEnd === "END") {
                this.next();
              }
            }
            swBlocks.push(`case ${caseVal}: {\n${caseBody}\nbreak;\n}`);
            continue;
          }
          if (cup === "DEFAULT") {
            this.next();
            if (this.peek()?.value === ":" || this.peek()?.value === ";") this.next();
            const defBody = this.parseStatementList(localSet, ["END"]);
            if (this.peek()?.value.toUpperCase() === "END") {
              const afterEnd = this.peek(1)?.value.toUpperCase();
              if (afterEnd === "END") this.next();
            }
            swBlocks.push(`default: {\n${defBody}\nbreak;\n}`);
            continue;
          }
          this.next();
        }
        stmts.push(`switch (${swExpr}) {\n${swBlocks.join("\n")}\n}`);
        continue;
      }

      if (up === "BREAK") {
        this.next();
        if (this.peek()?.value === ";") this.next();
        stmts.push(`break;`);
        continue;
      }

      if (up === "CONTINUE") {
        this.next();
        if (this.peek()?.value === ";") this.next();
        stmts.push(`continue;`);
        continue;
      }

      if (up === "RETURN") {
        this.next();
        const retTokens: Token[] = [];
        while (this.peek() && this.peek()!.value !== ";") {
          retTokens.push(this.next()!);
        }
        if (this.peek()?.value === ";") this.next();
        const retExpr = this.compileTokensExpr(retTokens, localSet);
        stmts.push(retExpr ? `return ${retExpr};` : `return;`);
        continue;
      }

      if (up === "BEGIN") {
        this.next();
        const sub = this.parseStatementList(localSet, ["END"]);
        this.matchValue("END");
        stmts.push(`{\n${sub}\n}`);
        continue;
      }

      if (up === "ONEXIT") {
        this.next();
        this.parseStatementList(localSet, ["END"]);
        this.matchValue("END");
        continue;
      }

      // Single expression statement terminated by ';'
      const exprTokens: Token[] = [];
      let pDepth = 0;
      while (this.pos < this.tokens.length) {
        const cur = this.peek()!;
        const cup = cur.value.toUpperCase();
        if (pDepth === 0 && (cur.value === ";" || stopWords.includes(cup))) {
          break;
        }
        if (cur.value === "(") pDepth++;
        else if (cur.value === ")" && pDepth > 0) pDepth--;
        exprTokens.push(this.next()!);
      }
      if (this.peek()?.value === ";") this.next();
      const jsExpr = this.compileTokensExpr(exprTokens, localSet).trim();
      if (jsExpr) {
        stmts.push(`${jsExpr};`);
      }
    }

    return stmts.join("\n");
  }

  public compile(): { title: string; js: string } {
    let title = "MiPrograma";
    const mainGlobalInits: string[] = [];
    const mainLocalDefaults: Array<{ name: string; init: string }> = [];
    const mainLocalNames = new Set<string>();
    const mainBodyChunks: string[] = [];
    const processDefsJs: string[] = [];

    // First pass: capture PROGRAM header, GLOBAL/CONST/STRUCT and main LOCAL
    // Note: processes can appear anywhere after BEGIN ... END, or in any order
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (!t) break;
      const up = t.value.toUpperCase();

      if (up === "PROGRAM") {
        this.next();
        const nameTok = this.next();
        if (nameTok) title = nameTok.value;
        if (this.peek()?.value === ";") this.next();
        continue;
      }

      if (up === "GLOBAL" || up === "CONST") {
        this.next();
        mainGlobalInits.push(...this.parseVarDeclSection("global", mainLocalNames));
        continue;
      }

      if (up === "STRUCT") {
        this.next();
        const sName = this.next()?.value.toLowerCase() || "registro";
        this.globalNames.add(sName);
        const structFields: string[] = [];
        while (this.pos < this.tokens.length) {
          const st = this.peek();
          if (!st || st.value.toUpperCase() === "END") {
            this.matchValue("END");
            break;
          }
          if (st.value === ";") {
            this.next();
            continue;
          }
          const fn = this.next()!.value;
          let fv = "0";
          if (this.peek()?.value === "=") {
            this.next();
            const valToks: Token[] = [];
            while (this.peek() && this.peek()!.value !== ";") {
              valToks.push(this.next()!);
            }
            fv = this.compileTokensExpr(valToks, new Set()) || "0";
          }
          if (this.peek()?.value === ";") this.next();
          structFields.push(`${fn}: ${fv}`);
        }
        mainGlobalInits.push(`__G.${sName} = { ${structFields.join(", ")} };`);
        continue;
      }

      if (up === "LOCAL" || up === "PRIVATE") {
        this.next();
        const decls = this.parseVarDeclSection("local", mainLocalNames);
        decls.forEach((d) => {
          const m = d.match(/^let _v_([a-z0-9_]+)\s*=\s*(.+);$/i);
          if (m) mainLocalDefaults.push({ name: m[1], init: m[2] });
        });
        continue;
      }

      if (up === "BEGIN") {
        this.next();
        const body = this.parseStatementList(mainLocalNames, ["END", "ONEXIT"]);
        if (this.peek()?.value.toUpperCase() === "ONEXIT") {
          this.next();
          this.parseStatementList(mainLocalNames, ["END"]);
        }
        this.matchValue("END");
        mainBodyChunks.push(body);
        continue;
      }

      if (up === "ONEXIT") {
        this.next();
        this.parseStatementList(mainLocalNames, ["END"]);
        this.matchValue("END");
        continue;
      }

      if (up === "PROCESS" || up === "FUNCTION") {
        this.next();
        const nameTok = this.next();
        const procName = (nameTok?.value || "proceso").toLowerCase();
        this.procNames.add(procName);

        const params: string[] = [];
        const procLocals = new Set<string>(mainLocalNames);
        const declaredLocalJs = new Set<string>();
        if (this.peek()?.value === "(") {
          this.next();
          while (this.peek() && this.peek()!.value !== ")") {
            const pt = this.next()!;
            if (pt.type === TokenType.IDENTIFIER || pt.type === TokenType.KEYWORD) {
              if (!this.isTypeKeyword(pt.value)) {
                params.push(pt.value.toLowerCase());
              }
            }
          }
          if (this.peek()?.value === ")") this.next();
        }
        if (this.peek()?.value === ";") this.next();

        const localInits: string[] = [];
        mainLocalDefaults.forEach((ld) => {
          if (!declaredLocalJs.has(ld.name)) {
            declaredLocalJs.add(ld.name);
            localInits.push(`let _v_${ld.name} = ${ld.init};`);
          }
        });

        while (this.peek() && ["PRIVATE", "LOCAL"].includes(this.peek()!.value.toUpperCase())) {
          this.next();
          localInits.push(...this.parseVarDeclSection("private", procLocals, declaredLocalJs));
        }

        const paramBindings = params.map((pName, idx) => {
          if (PROC_FIELDS.has(pName)) {
            return `if (__args[${idx}] !== undefined) __p.${pName} = __args[${idx}];`;
          }
          procLocals.add(pName);
          if (declaredLocalJs.has(pName)) {
            return `if (__args[${idx}] !== undefined) _v_${pName} = __args[${idx}];`;
          }
          declaredLocalJs.add(pName);
          return `let _v_${pName} = __args[${idx}] !== undefined ? __args[${idx}] : 0;`;
        });

        let procBody = "";
        if (this.matchValue("BEGIN")) {
          procBody = this.parseStatementList(procLocals, ["END", "ONEXIT"]);
          if (this.peek()?.value.toUpperCase() === "ONEXIT") {
            this.next();
            this.parseStatementList(procLocals, ["END"]);
          }
          this.matchValue("END");
        }

        const safeBody = [
          ...localInits,
          ...paramBindings,
          procBody,
        ]
          .filter(Boolean)
          .join("\n");

        processDefsJs.push(`
__rt.registerProcess(${JSON.stringify(procName)}, function* (__p, __args) {
${safeBody}
});`);
        continue;
      }

      // Skip stray tokens outside blocks
      this.next();
    }

    const mainDeclared = new Set<string>();
    const mainParamInit = mainLocalDefaults
      .map((ld) => {
        if (mainDeclared.has(ld.name)) {
          return `_v_${ld.name} = ${ld.init};`;
        }
        mainDeclared.add(ld.name);
        return `let _v_${ld.name} = ${ld.init};`;
      })
      .join("\n");
    const js = `
${mainGlobalInits.join("\n")}
${processDefsJs.join("\n")}
__rt.registerProcess("__main__", function* (__p, __args) {
${mainParamInit}
${mainBodyChunks.join("\n")}
});
__rt.spawn(null, "__main__", []);
`;

    return { title, js };
  }
}

/**
 * Compiles user DIV code (or ReDoomEd 3D world) into a standalone JS bundle
 */
export function compileDivToStandaloneBundle(
  title: string,
  code: string,
  fallbackResolution: string
): CompiledStandaloneResult {
  const { width, height } = extractStandaloneResolution(code, fallbackResolution);
  const backgroundColor = extractBackgroundColor(code);
  const trimmed = (code || "").trim();
  const lower = trimmed.toLowerCase();

  // 1. Check Custom Mode 8 (ReDoomEd 3D worlds + Mode 8 FPS / Hybrid / Raycast presets)
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
    lower.includes("start_raycast") ||
    lower.includes("jugador_doom") ||
    lower.includes("jugador_blox") ||
    lower.includes("mapa generado con redoomed") ||
    lower.includes("mundo 3d modo 8");

  if (isCustomMode8) {
    const world = extractCustomMode8World(trimmed, title);
    return {
      mode: "mode8_custom",
      title: world.title || title,
      width,
      height,
      backgroundColor,
      compiledJs: "",
      mode8WorldJson: JSON.stringify(world),
    };
  }

  // 2. Empty project check
  if (!trimmed || (trimmed.length < 90 && !lower.includes("write") && !lower.includes("process") && !lower.includes("draw_"))) {
    return {
      mode: "minimal_blank",
      title: title || "Proyecto Vacío",
      width,
      height,
      backgroundColor,
      compiledJs: `
__rt.registerProcess("__main__", function* (__p) {
  __rt.write(0, 24, 28, 0, ${JSON.stringify((title || "PROYECTO VACÍO").toUpperCase())});
  __rt.write(0, 24, 58, 0, "ENTORNO LISTO PARA EJECUTAR");
  __rt.write(0, 24, 84, 0, "Edita el código o usa el Asistente IA en WXDIV Studio.");
  while (!__p.isDead) { yield; }
});
__rt.spawn(null, "__main__", []);
`,
    };
  }

  // 3. Real DIV Transpilation
  const transpiler = new DivToJsTranspiler(trimmed);
  const compiled = transpiler.compile();

  return {
    mode: "div_compiled",
    title: title || compiled.title || "Mi Proyecto WXDIV",
    width,
    height,
    backgroundColor,
    compiledJs: compiled.js,
  };
}
