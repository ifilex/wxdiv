import earcut from "earcut";
import {
  DivDoomLinedef,
  DivDoomSector,
  DivMode8Entity,
  DivMode8Light,
  DivMode8PlacedModel,
  DivMode8PlacedVoxel,
  Mode8CameraMode,
} from "../types";
import { normalizeMode8LevelTextures } from "./mode8TextureRegistry";
import { getCustomModel3D } from "./assetLibrary";

export interface Point2D {
  x: number;
  y: number;
}

export interface TracedSectorPolygon {
  sector: DivDoomSector;
  outer: Point2D[];
  holes: Point2D[][];
  allLoops: Point2D[][];
  absArea: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function ptKey(x: number, y: number): string {
  return `${Math.round(x * 200)},${Math.round(y * 200)}`;
}

export function polygonSignedArea(pts: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area * 0.5;
}

export function isPointInLoop(x: number, y: number, loop: Point2D[]): boolean {
  if (loop.length < 3) return false;
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const xi = loop[i].x;
    const yi = loop[i].y;
    const xj = loop[j].x;
    const yj = loop[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Traces exact closed boundary loops for a set of linedefs belonging to a sector.
 * Handles concave rooms, L-shapes, stairs, and nested inner portal islands cleanly.
 */
export function traceSectorLoops(
  sectorId: number,
  linedefs: DivDoomLinedef[]
): Point2D[][] {
  const segs = linedefs.filter(
    (l) => l.frontSectorId === sectorId || l.backSectorId === sectorId
  );
  if (segs.length < 3) return [];

  interface EdgeRec {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    k1: string;
    k2: string;
    used: boolean;
  }

  const edges: EdgeRec[] = [];
  const adj = new Map<string, number[]>();

  const addAdj = (k: string, idx: number) => {
    const arr = adj.get(k);
    if (arr) arr.push(idx);
    else adj.set(k, [idx]);
  };

  for (const l of segs) {
    if (Math.hypot(l.x2 - l.x1, l.y2 - l.y1) < 0.005) continue;
    const k1 = ptKey(l.x1, l.y1);
    const k2 = ptKey(l.x2, l.y2);
    if (k1 === k2) continue;
    const idx = edges.length;
    edges.push({ x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, k1, k2, used: false });
    addAdj(k1, idx);
    addAdj(k2, idx);
  }

  const loops: Point2D[][] = [];

  for (let startIdx = 0; startIdx < edges.length; startIdx++) {
    if (edges[startIdx].used) continue;
    edges[startIdx].used = true;

    const ring: Point2D[] = [
      { x: edges[startIdx].x1, y: edges[startIdx].y1 },
      { x: edges[startIdx].x2, y: edges[startIdx].y2 },
    ];
    const startKey = edges[startIdx].k1;
    let curKey = edges[startIdx].k2;

    let guard = 0;
    while (curKey !== startKey && guard < edges.length + 4) {
      guard++;
      const candidates = adj.get(curKey) || [];
      let picked = -1;
      for (const cIdx of candidates) {
        if (!edges[cIdx].used) {
          picked = cIdx;
          break;
        }
      }
      if (picked === -1) break;
      const e = edges[picked];
      e.used = true;
      if (e.k1 === curKey) {
        ring.push({ x: e.x2, y: e.y2 });
        curKey = e.k2;
      } else {
        ring.push({ x: e.x1, y: e.y1 });
        curKey = e.k1;
      }
    }

    // Remove duplicate closing point if present
    if (
      ring.length > 3 &&
      Math.hypot(
        ring[ring.length - 1].x - ring[0].x,
        ring[ring.length - 1].y - ring[0].y
      ) < 0.01
    ) {
      ring.pop();
    }

    if (ring.length >= 3 && Math.abs(polygonSignedArea(ring)) > 0.005) {
      loops.push(ring);
    }
  }

  // Fallback convex/centroid loop if disconnected lines exist
  if (loops.length === 0 && segs.length >= 3) {
    const pts: Point2D[] = [];
    for (const s of segs) {
      if (!pts.some((p) => Math.hypot(p.x - s.x1, p.y - s.y1) < 0.02)) {
        pts.push({ x: s.x1, y: s.y1 });
      }
      if (!pts.some((p) => Math.hypot(p.x - s.x2, p.y - s.y2) < 0.02)) {
        pts.push({ x: s.x2, y: s.y2 });
      }
    }
    if (pts.length >= 3) {
      const cx = pts.reduce((a, b) => a + b.x, 0) / pts.length;
      const cy = pts.reduce((a, b) => a + b.y, 0) / pts.length;
      pts.sort(
        (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
      );
      loops.push(pts);
    }
  }

  return loops;
}

/**
 * Builds traced polygon shapes with holes for all sectors.
 * Nested two-sided sectors inside an outer sector are automatically subtracted as holes
 * from the outer sector's floor/ceiling so there is ZERO Z-fighting or overlapping faces.
 */
export function buildTracedSectors(
  sectors: DivDoomSector[],
  linedefs: DivDoomLinedef[]
): TracedSectorPolygon[] {
  const sectorLoops = new Map<number, Point2D[][]>();
  for (const sec of sectors) {
    sectorLoops.set(sec.id, traceSectorLoops(sec.id, linedefs));
  }

  const rawList: TracedSectorPolygon[] = [];
  for (const sec of sectors) {
    const loops = sectorLoops.get(sec.id) || [];
    if (loops.length === 0) continue;

    // Sort descending by absolute area: largest loop is the outer shell
    const sorted = [...loops].sort(
      (a, b) => Math.abs(polygonSignedArea(b)) - Math.abs(polygonSignedArea(a))
    );
    const outer = sorted[0];
    const outerArea = Math.abs(polygonSignedArea(outer));
    // Only treat secondary loops as holes if they actually reside inside the outer polygon.
    // Prevents disjoint or overlapping drawn rooms from generating inverted earcut geometry.
    const holes = sorted.slice(1).filter((loop) => {
      if (loop.length < 3) return false;
      const cx = loop.reduce((acc, p) => acc + p.x, 0) / loop.length;
      const cy = loop.reduce((acc, p) => acc + p.y, 0) / loop.length;
      if (isPointInLoop(cx, cy, outer)) return true;
      return loop.some((p) => isPointInLoop(p.x, p.y, outer));
    });

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of outer) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    rawList.push({
      sector: sec,
      outer,
      holes,
      allLoops: sorted,
      absArea: outerArea,
      bounds: { minX, minY, maxX, maxY },
    });
  }

  return rawList;
}

/**
 * Triangulates a traced sector (outer + holes) into flat [x0, y0, x1, y1, ...] indices via earcut.
 */
export function triangulateTracedSector(traced: TracedSectorPolygon): {
  vertices2D: Point2D[];
  indices: number[];
} {
  const flatCoords: number[] = [];
  const holeIndices: number[] = [];
  const vertices2D: Point2D[] = [];

  for (const p of traced.outer) {
    flatCoords.push(p.x, p.y);
    vertices2D.push(p);
  }
  for (const hole of traced.holes) {
    holeIndices.push(vertices2D.length);
    for (const p of hole) {
      flatCoords.push(p.x, p.y);
      vertices2D.push(p);
    }
  }

  const indices = earcut(
    flatCoords,
    holeIndices.length > 0 ? holeIndices : undefined,
    2
  );
  return { vertices2D, indices };
}

/**
 * Finds the innermost (smallest-area) sector containing point (x, y).
 * Correctly resolves sunken pools (z < 0) and elevated platforms (z > 0) inside larger yards!
 */
export function findSectorAtPoint(
  x: number,
  y: number,
  tracedSectors: TracedSectorPolygon[]
): DivDoomSector | null {
  let best: TracedSectorPolygon | null = null;
  for (const ts of tracedSectors) {
    if (
      x < ts.bounds.minX - 0.001 ||
      x > ts.bounds.maxX + 0.001 ||
      y < ts.bounds.minY - 0.001 ||
      y > ts.bounds.maxY + 0.001
    ) {
      continue;
    }
    if (!isPointInLoop(x, y, ts.outer)) continue;
    let inHole = false;
    for (const h of ts.holes) {
      if (isPointInLoop(x, y, h)) {
        inHole = true;
        break;
      }
    }
    if (inHole) continue;
    if (!best || ts.absArea < best.absArea) {
      best = ts;
    }
  }
  return best ? best.sector : null;
}

export function findSectorAtPointDirect(
  x: number,
  y: number,
  sectors: DivDoomSector[],
  linedefs: DivDoomLinedef[]
): DivDoomSector | null {
  const traced = buildTracedSectors(sectors, linedefs);
  return findSectorAtPoint(x, y, traced);
}

/**
 * Canonical classification & combat defaults for placed 3D models.
 * Ensures ALL combat/goal models act intelligently even when spawned with minimal args.
 */
export function inferPlacedModelStats(mod: DivMode8PlacedModel): {
  role: "enemy" | "ally" | "prop" | "goal" | "checkpoint";
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  patrolRadius: number;
  name: string;
} {
  const id = String(mod.modelId || "").toLowerCase();
  const explicitRole = mod.role;

  const customAsset = getCustomModel3D(String(mod.modelId || ""));
  let role: "enemy" | "ally" | "prop" | "goal" | "checkpoint" =
    explicitRole || customAsset?.defaultRole || "prop";
  let defaultHp = 60;
  let defaultSpeed = 1.65;
  let defaultDamage = 10;
  let defaultRadius = 2.6;
  let defaultName = mod.name || customAsset?.name || "Modelo 3D";

  if (!explicitRole) {
    if (
      id.includes("demon") ||
      id.includes("gargoyle") ||
      id.includes("imp") ||
      id.includes("caco") ||
      id.includes("knight") ||
      id.includes("samurai") ||
      id.includes("mech") ||
      id.includes("enemy") ||
      id.includes("boss") ||
      id.includes("slime")
    ) {
      role = "enemy";
    } else if (id.includes("trophy") || id.includes("portal") || id.includes("star") || id.includes("goal")) {
      role = "goal";
    } else if (id.includes("checkpoint") || id.includes("flag")) {
      role = "checkpoint";
    } else if (id.includes("hero") || id.includes("ally")) {
      role = "ally";
    }
  }

  if (id === "blox_knight" || id === "md2_knight") {
    defaultHp = 75;
    defaultSpeed = 1.85;
    defaultDamage = 12;
    defaultName = mod.name || "Caballero Redcliff";
  } else if (id === "samurai_fighter") {
    defaultHp = 95;
    defaultSpeed = 2.2;
    defaultDamage = 15;
    defaultName = mod.name || "Maestro Samurái";
  } else if (id === "cyber_mech") {
    defaultHp = 130;
    defaultSpeed = 1.55;
    defaultDamage = 18;
    defaultName = mod.name || "Cyber Mech";
  } else if (id === "demon_brute") {
    defaultHp = 150;
    defaultSpeed = 1.65;
    defaultDamage = 20;
    defaultName = mod.name || "Titán Bruto";
  } else if (id === "doom_imp") {
    defaultHp = 55;
    defaultSpeed = 2.1;
    defaultDamage = 10;
    defaultName = mod.name || "Imp Guardián";
  } else if (id === "md2_gargoyle" || id === "doom_caco") {
    defaultHp = 85;
    defaultSpeed = 1.95;
    defaultDamage = 14;
    defaultName = mod.name || "Dron / Gárgola";
  } else if (id === "trophy_star") {
    defaultName = mod.name || "Estrella Victoria";
  } else if (id === "portal_crystal") {
    defaultName = mod.name || "Cristal Portal";
  }

  const maxHp = mod.maxHp ?? mod.hp ?? defaultHp;
  const hp = mod.hp ?? maxHp;

  return {
    role,
    hp,
    maxHp,
    speed: mod.speed ?? defaultSpeed,
    damage: mod.damage ?? defaultDamage,
    patrolRadius: mod.patrolRadius ?? defaultRadius,
    name: defaultName,
  };
}

export interface SerializableMode8Level {
  id?: string;
  name: string;
  description?: string;
  recommendedCamera?: Mode8CameraMode;
  recommendedSky?: string;
  recommendedWeapon?: "shotgun" | "pistol" | "sword3d" | "staff3d";
  recommendedTheme?: "winebox_clean" | "doom_dark" | "cyber_neon" | "medieval_gold";
  recommendedGameMode?: "shooter" | "exploration" | "survival";
  recommendedPlayerModel?: string;
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
  entities: DivMode8Entity[];
  placedModels: DivMode8PlacedModel[];
  placedVoxels: DivMode8PlacedVoxel[];
  lights: DivMode8Light[];
}

export interface SerializeMode8DivOptions {
  title?: string;
  subtitle?: string;
  hasStartMenu?: boolean;
  menuTheme?: "winebox_clean" | "doom_dark" | "cyber_neon" | "medieval_gold";
  playButtonText?: string;
  showControlsButton?: boolean;
  showWeaponSelect?: boolean;
  startingWeapon?: "shotgun" | "pistol" | "sword3d" | "staff3d";
  startingHealth?: number;
  startingAmmo?: number;
  difficulty?: "easy" | "normal" | "hard";
  gameMode?: "shooter" | "exploration" | "survival";
  cameraMode?: Mode8CameraMode;
  skyTexture?: string;
  playerModelId?: string;
  showHudAutomap?: boolean;
}

function safeFin(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function escDiv(str: unknown): string {
  return String(str ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "'")
    .replace(/\r?\n/g, " ");
}

function sanitizeProgId(raw: string): string {
  const clean = String(raw || "JUEGO_3D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const out = clean || "JUEGO_3D";
  return /^[0-9]/.test(out) ? `M8_${out}` : out;
}

/**
 * Canonical DIV Pascal serializer for any Mode 8 3D level (used identically by
 * Presets, New Project Wizard, Mode 8 Editor, Runtime Runner, and Standalone Compiler).
 */
export function serializeMode8LevelToDivCode(
  level: SerializableMode8Level,
  opts: SerializeMode8DivOptions = {}
): string {
  const title = opts.title || level.name || "Mundo 3D Blox";
  const subtitle =
    opts.subtitle ||
    level.description ||
    "Mundo 3D estilo Roblox con enemigos IA, plataformas y objetos";
  const progId = sanitizeProgId(title);
  const cameraMode = opts.cameraMode || level.recommendedCamera || "third_person";
  const rawSkyTexture = opts.skyTexture || level.recommendedSky || "SKY_ROBLOX";
  const {
    sectors: normalizedSectors,
    linedefs: normalizedLinedefs,
    skyTexture,
    validation: textureValidation,
  } = normalizeMode8LevelTextures(level.sectors || [], level.linedefs || [], rawSkyTexture);
  const startingWeapon = opts.startingWeapon || level.recommendedWeapon || "sword3d";
  const menuTheme = opts.menuTheme || level.recommendedTheme || "winebox_clean";
  const gameMode = opts.gameMode || level.recommendedGameMode || "exploration";
  const playerModelId =
    opts.playerModelId || level.recommendedPlayerModel || "blox_hero";
  const hasStartMenu = opts.hasStartMenu ?? false;
  const playButtonText = opts.playButtonText || "JUGAR";
  const showControlsButton = opts.showControlsButton ?? true;
  const showWeaponSelect = opts.showWeaponSelect ?? true;
  const startingHealth = opts.startingHealth ?? 100;
  const startingAmmo = opts.startingAmmo ?? 50;
  const difficulty = opts.difficulty || "normal";
  const showHudAutomap = opts.showHudAutomap ?? true;

  const playerEnt = (level.entities || []).find((e) => e.type === "player");
  const spawnX = playerEnt ? (safeFin(playerEnt.x, 4.5 * 64) / 64).toFixed(2) : "4.50";
  const spawnY = playerEnt ? (safeFin(playerEnt.y, 7.5 * 64) / 64).toFixed(2) : "7.50";

  const sectorLines = normalizedSectors
    .map(
      (s) =>
        `    m8_set_doom_sector(${Math.round(safeFin(s.id, 0))}, ${safeFin(s.floorHeight, 0).toFixed(2)}, ${safeFin(s.ceilHeight, 7.0).toFixed(2)}, "${escDiv(s.floorTexture || "STUD_FLOOR_BLUE")}", "${escDiv(s.ceilTexture || skyTexture)}", ${Math.round(safeFin(s.lightLevel, 240))}, ${Math.round(safeFin(s.special, 0))}, ${Math.round(safeFin(s.tag, 0))});`
    )
    .join("\n");

  const wallLines = normalizedLinedefs
    .map(
      (l) =>
        `    m8_add_doom_line("${escDiv(String(l.id))}", ${safeFin(l.x1, 0).toFixed(2)}, ${safeFin(l.y1, 0).toFixed(2)}, ${safeFin(l.x2, 0).toFixed(2)}, ${safeFin(l.y2, 0).toFixed(2)}, ${Math.round(safeFin(l.frontSectorId, 0))}, ${l.backSectorId !== undefined ? Math.round(safeFin(l.backSectorId, -1)) : -1}, ${l.isTwoSided ? 1 : 0}, "${escDiv(l.middleTexture || "STUD_BLUE")}", "${escDiv(l.lowerTexture || "")}", "${escDiv(l.upperTexture || "")}", ${l.blocking !== false ? 1 : 0});`
    )
    .join("\n");

  const voxelLines =
    level.placedVoxels && level.placedVoxels.length > 0
      ? level.placedVoxels
          .map(
            (v) =>
              `    m8_place_voxel("${escDiv(v.voxelId)}", ${safeFin(v.x, 0).toFixed(2)}, ${safeFin(v.y, 0).toFixed(2)}, ${safeFin(v.z, 0).toFixed(2)}, ${safeFin(v.yaw, 0).toFixed(0)}, ${safeFin(v.scale, 1).toFixed(2)});`
          )
          .join("\n")
      : "    // Sin voxels extra";

  const modelLines =
    level.placedModels && level.placedModels.length > 0
      ? level.placedModels
          .map((m) => {
            const st = inferPlacedModelStats(m);
            return `    m8_add_model("${escDiv(m.modelId)}", ${safeFin(m.x, 0).toFixed(2)}, ${safeFin(m.y, 0).toFixed(2)}, ${safeFin(m.z, 0).toFixed(2)}, ${safeFin(m.yaw, 0).toFixed(0)}, "${escDiv(m.animation || "walk")}", ${safeFin(m.scale, 1).toFixed(2)}, "${escDiv(st.role)}", ${Math.round(st.hp)}, ${st.speed.toFixed(2)}, ${Math.round(st.damage)}, "${escDiv(st.name)}");`;
          })
          .join("\n")
      : "    // Sin modelos MD2/MD3 extra";

  const lightLines =
    level.lights && level.lights.length > 0
      ? level.lights
          .map(
            (lt) =>
              `    m8_add_light(${safeFin(lt.x, 0).toFixed(2)}, ${safeFin(lt.y, 0).toFixed(2)}, ${safeFin(lt.z, 2).toFixed(2)}, ${safeFin(lt.radius, 12).toFixed(1)}, ${Math.round(safeFin(lt.r, 255))}, ${Math.round(safeFin(lt.g, 235))}, ${Math.round(safeFin(lt.b, 200))}, ${lt.flicker ? 1 : 0});`
          )
          .join("\n")
      : "    m8_add_light(12.0, 9.0, 3.5, 16.0, 255, 245, 220, 0);";

  const entLines =
    level.entities && level.entities.length > 0
      ? level.entities
          .map(
            (ent) =>
              `    m8_spawn_entity("${escDiv(ent.type)}", ${(safeFin(ent.x, 4.5 * 64) / 64).toFixed(2)}, ${(safeFin(ent.y, 7.5 * 64) / 64).toFixed(2)}, "${escDiv(ent.name || ent.type)}", ${Math.round(safeFin(ent.graph, 27))});`
          )
          .join("\n")
      : `    m8_spawn_entity("player", ${spawnX}, ${spawnY}, "Blox Runner", 1);`;

  return `// =========================================================================
// MUNDO 3D MODO 8 GENERADO CON REDOOMED (WXDIV 3.0)
// Incluye sectores, texturas PBR, camara, cielo, enemigos IA y objetos 3D.
// =========================================================================
PROGRAM ${progId};

CONST
    // --- MENÚ Y CONFIGURACIÓN DEL JUEGO ---
    TITULO_JUEGO       = "${escDiv(title)}";
    SUBTITULO_JUEGO    = "${escDiv(subtitle)}";
    MOSTRAR_MENU       = ${hasStartMenu ? 1 : 0};
    TEMA_MENU          = "${menuTheme}";
    BOTON_JUGAR        = "${escDiv(playButtonText)}";
    MOSTRAR_CONTROLES  = ${showControlsButton ? 1 : 0};
    SELECTOR_ARMA_MENU = ${showWeaponSelect ? 1 : 0};

    // --- JUGABILIDAD, CÁMARA Y HUD ---
    ARMA_INICIAL       = "${startingWeapon}";
    SALUD_INICIAL      = ${startingHealth};
    MUNICION_INICIAL   = ${startingAmmo};
    DIFICULTAD         = "${difficulty}";
    MODO_JUEGO         = "${gameMode}";
    CAMARA_MODO        = "${cameraMode}";
    CIELO_TEXTURA      = "${escDiv(skyTexture)}";
    TEXTURA_HASH       = "${escDiv(textureValidation.manifestChecksum)}";
    JUGADOR_MODELO     = "${escDiv(playerModelId)}";
    MOSTRAR_MINIMAPA   = ${showHudAutomap ? 1 : 0};

BEGIN
    set_mode(m640x480);
    set_fps(60);

    // 1. Iniciar Motor 3D Modo 8 Doom 2
    start_mode8(0, 0, 25, 44, 45, 0, 0);
    m8_engine_mode("doom2");
    m8_workers(4);
    m8_set_weapon(ARMA_INICIAL);

    // 2. Sectores (Altura suelo/techo, texturas e iluminación)
${sectorLines}

    // 3. Paredes, Portales y Escaleras (${(level.linedefs || []).length} líneas)
${wallLines}

    // 4. Vóxels 3D (${(level.placedVoxels || []).length})
${voxelLines}

    // 5. Modelos 3D y Enemigos IA (${(level.placedModels || []).length})
${modelLines}

    // 6. Iluminación Dinámica (${(level.lights || []).length})
${lightLines}

    // 7. Actores y Objetos del Mapa (${(level.entities || []).length})
${entLines}

    // 8. Iniciar Jugador 3D
    jugador_doom(${spawnX}, ${spawnY});

    LOOP
        FRAME;
    END
END
`;
}

