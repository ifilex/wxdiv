/**
 * ============================================================
 * WXDIV 3.0 - DOOM Web Engine v3 (Modo 8 WAD Environment)
 * ============================================================
 * 
 * Motor 3D completo para soporte nativo de WADs (Doom, Doom 2, Plutonia, TNT,
 * Freedoom, Heretic, Hexen, PWADs y PK3s) integrado en Modo 8.
 * 
 * Incluye:
 * - Parser binario y UDMF con tessellación poligonal exacta vía earcut
 * - Compositor de texturas (PNAMES, TEXTURE1/2, Patches, Flats y Paletas PLAYPAL)
 * - Iluminación por sectores, efectos de parpadeo y cielo esférico (SKY1)
 * - Sectores animados: puertas corredizas, ascensores, escaleras mecánicas, trituradoras
 * - IA completa de monstruos clásicos con sprites en 8 direcciones y proyectiles
 * - Controlador del jugador con 9 armas, munición, llaves, armadura y trucos iddqd/idkfa
 * - Sistema de audio Web Audio para efectos SFX y música
 * - Automapa vectorial interactivo 2D y controles táctiles + teclado/ratón con Pointer Lock
 * - Persistencia e IndexedDB para caché instantáneo offline de WADs
 */

import * as THREE from "three";
import earcut from "earcut";
import JSZip from "jszip";
import { getDoomTextureCanvas } from "./doom2Engine";
import { DivDoomLinedef, DivDoomSector, DivMode8Entity } from "../types";

/* ================= INDEXEDDB CACHING ================= */
const DB_NAME = "doom-cache";
const DB_STORE = "wads";

export function idbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(DB_STORE)) {
        r.result.createObjectStore(DB_STORE);
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function idbPut(k: string, v: ArrayBuffer): Promise<void> {
  try {
    const db = await idbOpen();
    return new Promise((r) => {
      const t = db.transaction(DB_STORE, "readwrite");
      t.objectStore(DB_STORE).put(v, k);
      t.oncomplete = () => r();
    });
  } catch (e) {
    console.warn("idbPut failed:", e);
  }
}

export async function idbGet(k: string): Promise<ArrayBuffer | null> {
  try {
    const db = await idbOpen();
    return new Promise((r) => {
      const t = db.transaction(DB_STORE, "readonly");
      const q = t.objectStore(DB_STORE).get(k);
      q.onsuccess = () => r(q.result || null);
      q.onerror = () => r(null);
    });
  } catch (e) {
    return null;
  }
}

export async function idbDel(k: string): Promise<void> {
  try {
    const db = await idbOpen();
    return new Promise((r) => {
      const t = db.transaction(DB_STORE, "readwrite");
      t.objectStore(DB_STORE).delete(k);
      t.oncomplete = () => r();
    });
  } catch (e) {}
}

/* ================= INPUT MANAGER ================= */
const BIND_KEY = "doom_keys_v5";
export const DEFAULT_BINDINGS: Record<string, string | null> = {
  forward: "ArrowUp",
  backward: "ArrowDown",
  turnLeft: "ArrowLeft",
  turnRight: "ArrowRight",
  left: "KeyA",
  right: "KeyD",
  fire: "ControlLeft",
  use: "Space",
  jump: "KeyZ",
  nextWeapon: "WheelDown",
  prevWeapon: "WheelUp",
  automap: "Tab",
  menu: "Escape",
};

export class DoomInputManager {
  public dom: HTMLElement;
  public bindings: Record<string, string | null>;
  public actions: Record<string, boolean> = {};
  public listeners: Record<string, Function[]> = { action: [], keydown: [] };
  public yaw = 0;
  public pitch = 0;
  public lookSensitivity = 0.002;
  public touch = {
    moveTouchId: null as number | null,
    moveStart: { x: 0, y: 0 },
    moveVec: { x: 0, y: 0 },
    lookTouchId: null as number | null,
    lookLast: { x: 0, y: 0 },
  };
  public isTouchDevice: boolean;
  public dragging = false;
  public dragLast = { x: 0, y: 0 };
  private cleanupFns: Function[] = [];

  constructor(dom: HTMLElement) {
    this.dom = dom;
    this.bindings = this._load();
    this.isTouchDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    this._attach();
  }

  private _load(): Record<string, string | null> {
    try {
      const r = localStorage.getItem(BIND_KEY);
      if (r) return { ...DEFAULT_BINDINGS, ...JSON.parse(r) };
    } catch (e) {}
    return { ...DEFAULT_BINDINGS };
  }

  public saveBindings() {
    try {
      localStorage.setItem(BIND_KEY, JSON.stringify(this.bindings));
    } catch (e) {}
  }

  public setBinding(action: string, code: string) {
    for (const k in this.bindings) {
      if (this.bindings[k] === code && k !== action) this.bindings[k] = null;
    }
    this.bindings[action] = code;
    this.saveBindings();
    this._emit("action", { type: "rebind", action, code });
  }

  public resetBindings() {
    this.bindings = { ...DEFAULT_BINDINGS };
    this.saveBindings();
  }

  public isDown(a: string): boolean {
    if (this.actions[a]) return true;
    const mv = this.touch.moveVec;
    if (a === "forward" && mv.y < -0.3) return true;
    if (a === "backward" && mv.y > 0.3) return true;
    if (a === "left" && mv.x < -0.3) return true;
    if (a === "right" && mv.x > 0.3) return true;
    return false;
  }

  public on(t: string, cb: Function) {
    (this.listeners[t] ||= []).push(cb);
  }

  private _emit(t: string, p: any) {
    (this.listeners[t] || []).forEach((cb) => cb(p));
  }

  private _actionFor(code: string): string | null {
    for (const a in this.bindings) {
      if (this.bindings[a] === code) return a;
    }
    return null;
  }

  public update(delta: number) {
    const ts = 2.6 * delta;
    if (this.isDown("turnLeft")) this.yaw += ts;
    if (this.isDown("turnRight")) this.yaw -= ts;
  }

  private _attach() {
    const PREVENT = new Set([
      "Tab",
      "Space",
      "F1",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ControlLeft",
      "ControlRight",
    ]);

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (PREVENT.has(e.code)) e.preventDefault();
      this._emit("keydown", e);
      const a = this._actionFor(e.code);
      if (a && !this.actions[a]) {
        this.actions[a] = true;
        this._emit("action", { type: "down", action: a, code: e.code });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const a = this._actionFor(e.code);
      if (a) {
        this.actions[a] = false;
        this._emit("action", { type: "up", action: a, code: e.code });
      }
    };

    const onBlur = () => {
      for (const k in this.actions) this.actions[k] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    this.cleanupFns.push(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    });

    const c = this.dom;
    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement === c) {
        if (e.button === 0) {
          this.actions.fire = true;
          this._emit("action", { type: "down", action: "fire" });
        }
        if (e.button === 2) {
          this.actions.jump = true;
          this._emit("action", { type: "down", action: "jump" });
        }
      } else if (e.button === 2) {
        this.dragging = true;
        this.dragLast = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        this.actions.fire = false;
        this._emit("action", { type: "up", action: "fire" });
      }
      if (e.button === 2) {
        this.actions.jump = false;
        this._emit("action", { type: "up", action: "jump" });
        this.dragging = false;
      }
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === c) {
        this.yaw -= e.movementX * this.lookSensitivity;
        this.pitch -= e.movementY * this.lookSensitivity;
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
      } else if (this.dragging) {
        const dx = e.clientX - this.dragLast.x,
          dy = e.clientY - this.dragLast.y;
        this.dragLast = { x: e.clientX, y: e.clientY };
        this.yaw -= dx * this.lookSensitivity * 1.5;
        this.pitch -= dy * this.lookSensitivity * 1.5;
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const a = e.deltaY > 0 ? "nextWeapon" : "prevWeapon";
      this._emit("action", { type: "down", action: a });
      this._emit("action", { type: "up", action: a });
    };

    c.addEventListener("mousedown", onMouseDown);
    c.addEventListener("mouseup", onMouseUp);
    c.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("mousemove", onMouseMove);
    c.addEventListener("wheel", onWheel, { passive: false });

    this.cleanupFns.push(() => {
      c.removeEventListener("mousedown", onMouseDown);
      c.removeEventListener("mouseup", onMouseUp);
      c.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("mousemove", onMouseMove);
      c.removeEventListener("wheel", onWheel);
    });

    if (this.isTouchDevice) this._attachTouch();
  }

  private _attachTouch() {
    const c = this.dom;
    c.style.touchAction = "none";
    const isLeft = (x: number) => x < window.innerWidth * 0.35;

    const onTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (isLeft(t.clientX)) {
          if (this.touch.moveTouchId === null) {
            this.touch.moveTouchId = t.identifier;
            this.touch.moveStart = { x: t.clientX, y: t.clientY };
            this.touch.moveVec = { x: 0, y: 0 };
          }
        } else if (this.touch.lookTouchId === null) {
          this.touch.lookTouchId = t.identifier;
          this.touch.lookLast = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.touch.moveTouchId) {
          const dx = t.clientX - this.touch.moveStart.x,
            dy = t.clientY - this.touch.moveStart.y;
          const mag = Math.min(1, Math.hypot(dx, dy) / 60),
            ang = Math.atan2(dy, dx);
          this.touch.moveVec = { x: Math.cos(ang) * mag, y: Math.sin(ang) * mag };
        } else if (t.identifier === this.touch.lookTouchId) {
          const dx = t.clientX - this.touch.lookLast.x,
            dy = t.clientY - this.touch.lookLast.y;
          this.touch.lookLast = { x: t.clientX, y: t.clientY };
          this.yaw -= dx * 0.005;
          this.pitch -= dy * 0.005;
          this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.touch.moveTouchId) {
          this.touch.moveTouchId = null;
          this.touch.moveVec = { x: 0, y: 0 };
        }
        if (t.identifier === this.touch.lookTouchId) {
          this.touch.lookTouchId = null;
        }
      }
    };

    c.addEventListener("touchstart", onTouchStart, { passive: false });
    c.addEventListener("touchmove", onTouchMove, { passive: false });
    c.addEventListener("touchend", onTouchEnd);
    c.addEventListener("touchcancel", onTouchEnd);

    this.cleanupFns.push(() => {
      c.removeEventListener("touchstart", onTouchStart);
      c.removeEventListener("touchmove", onTouchMove);
      c.removeEventListener("touchend", onTouchEnd);
      c.removeEventListener("touchcancel", onTouchEnd);
    });
  }

  public requestPointerLock() {
    if (this.isTouchDevice) return;
    this.dom.requestPointerLock?.();
  }

  public destroy() {
    this.cleanupFns.forEach((f) => f());
    this.cleanupFns = [];
  }
}

/* ================= WAD PARSER ================= */
export interface WadLump {
  name: string;
  filePos: number;
  size: number;
  index: number;
  buffer?: ArrayBuffer;
}

export class WadParser {
  public data: DataView;
  public header: { type: string; numLumps: number; dirOffset: number };
  public directory: WadLump[];
  public lumpIndex: Map<string, WadLump> = new Map();
  public cache = {
    patches: new Map<string, any>(),
    composites: new Map<string, any>(),
    flats: new Map<string, any>(),
    sounds: new Map<string, AudioBuffer | null>(),
  };
  public palette: number[][] | null = null;
  public pnames: string[] | null = null;
  public textures: Map<string, any> | null = null;

  constructor(buffer: ArrayBuffer) {
    this.data = new DataView(buffer);
    this.header = this.readHeader();
    this.directory = this.readDirectory();
  }

  readHeader() {
    return {
      type: this.readString(0, 4),
      numLumps: this.data.getInt32(4, true),
      dirOffset: this.data.getInt32(8, true),
    };
  }

  readDirectory() {
    const d: WadLump[] = [];
    this.lumpIndex = new Map();
    for (let i = 0; i < this.header.numLumps; i++) {
      const o = this.header.dirOffset + i * 16;
      const l: WadLump = {
        name: this.readString(o + 8, 8),
        filePos: this.data.getInt32(o, true),
        size: this.data.getInt32(o + 4, true),
        index: i,
      };
      d.push(l);
      this.lumpIndex.set(l.name, l);
    }
    return d;
  }

  readString(o: number, n: number): string {
    const b = new Uint8Array(this.data.buffer, o, n);
    let e = b.indexOf(0);
    if (e === -1) e = n;
    return new TextDecoder().decode(b.subarray(0, e)).toUpperCase().trim();
  }

  getLump(n?: string): WadLump | null {
    return n ? this.lumpIndex.get(n.toUpperCase()) || null : null;
  }

  getLumpData(l: WadLump | null): DataView | null {
    if (!l) return null;
    if (l.buffer) return new DataView(l.buffer);
    return new DataView(this.data.buffer, l.filePos, l.size);
  }

  mergeWad(p: WadParser) {
    this.mergeLumps(
      p.directory.map((l) => {
        const dv = p.getLumpData(l)!;
        return {
          ...l,
          buffer: dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength),
        };
      })
    );
  }

  mergeLumps(ls: WadLump[]) {
    const re =
      /^(E\dM\d|MAP\d\d|THINGS|LINEDEFS|SIDEDEFS|VERTEXES|SEGS|SSECTORS|NODES|SECTORS|REJECT|BLOCKMAP|TEXTMAP|ENDMAP|SCRIPTS)$/;
    const wl = new Set(["PNAMES", "TEXTURE1", "TEXTURE2", "PLAYPAL", "COLORMAP"]);

    ls.forEach((l) => {
      const n = l.name.toUpperCase();
      if (this.lumpIndex.has(n) && !re.test(n)) {
        if (!wl.has(n)) return;
        const ex = this.lumpIndex.get(n)!;
        const cl = { ...l, index: ex.index };
        this.directory[ex.index] = cl;
        this.lumpIndex.set(n, cl);
        this.cache.patches.delete(n);
        this.cache.composites.delete(n);
        this.cache.flats.delete(n);
        return;
      }
      const cl = { ...l, index: this.directory.length };
      this.directory.push(cl);
      this.lumpIndex.set(n, cl);
    });

    this.pnames = null;
    this.textures = null;
    this.cache.patches.clear();
    this.cache.composites.clear();
    this.cache.flats.clear();
    this.cache.sounds.clear();
  }

  getMapLumps(mapName: string): Record<string, WadLump> | null {
    const m = this.getLump(mapName);
    if (!m) return null;
    const out: Record<string, WadLump> = { header: m };
    const bin = [
      "THINGS",
      "LINEDEFS",
      "SIDEDEFS",
      "VERTEXES",
      "SEGS",
      "SSECTORS",
      "NODES",
      "SECTORS",
      "REJECT",
      "BLOCKMAP",
      "BEHAVIOR",
    ];
    const udmf = ["TEXTMAP", "ZNODES", "ENDMAP", "SCRIPTS", "DIALOGUE"];

    for (let i = 1; i <= 500; i++) {
      const idx = m.index + i;
      if (idx >= this.directory.length) break;
      const l = this.directory[idx];
      if (/^E\dM\d$/.test(l.name) || /^MAP\d\d$/.test(l.name)) break;
      if (bin.includes(l.name) || udmf.includes(l.name)) {
        out[l.name] = l;
        if (l.name === "ENDMAP") break;
      }
    }
    return out;
  }

  parseMap(name: string): any {
    const ls = this.getMapLumps(name);
    if (!ls) return null;

    let d: any;
    if (ls.TEXTMAP) {
      d = this.parseUDMF(ls.TEXTMAP);
    } else {
      const vx = this.parseVertexes(ls.VERTEXES);
      const sec = this.parseSectors(ls.SECTORS);
      const sd = this.parseSidedefs(ls.SIDEDEFS);
      const ld = this.parseLinedefs(ls.LINEDEFS, vx, sd, sec);
      const th = this.parseThings(ls.THINGS);
      d = { vertexes: vx, sectors: sec, sidedefs: sd, linedefs: ld, things: th };
    }

    if (d && d.sectors && d.linedefs) {
      d.sectors.forEach((s: any) => (s.lines = []));
      d.linedefs.forEach((l: any) => {
        if (l.frontSector) l.frontSector.lines.push(l);
        if (l.backSector) l.backSector.lines.push(l);
      });
    }
    return d;
  }

  parseUDMF(l: WadLump): any {
    const dv = this.getLumpData(l)!;
    const txt = new TextDecoder()
      .decode(dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength))
      .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
    const tk = txt.match(
      /"[^"]*"|'[^']*'|[a-zA-Z_][a-zA-Z0-9_]*|[-+]?[0-9]*\.?[0-9]+|[{}=;]/g
    );
    if (!tk) return null;

    const th: any[] = [],
      vx: any[] = [],
      ln: any[] = [],
      sd: any[] = [],
      sc: any[] = [];
    let i = 0;

    while (i < tk.length) {
      const t = tk[i++];
      if (tk[i] === "{") {
        const bt = t.toLowerCase();
        i++;
        const b: Record<string, any> = {};
        while (i < tk.length && tk[i] !== "}") {
          const k = tk[i++].toLowerCase();
          if (tk[i] === "=") {
            i++;
            let v: any = tk[i++];
            if (v.startsWith('"') || v.startsWith("'")) v = v.slice(1, -1);
            else if (v === "true") v = true;
            else if (v === "false") v = false;
            else if (!isNaN(v)) v = Number(v);
            b[k] = v;
            if (tk[i] === ";") i++;
          } else if (tk[i] === ";") i++;
        }
        i++;
        if (bt === "thing") th.push(b);
        else if (bt === "vertex") vx.push({ x: Number(b.x), y: Number(b.y) });
        else if (bt === "linedef") ln.push(b);
        else if (bt === "sidedef") sd.push(b);
        else if (bt === "sector") sc.push(b);
      }
    }

    const ps = sc.map((s, idx) => ({
      floorHeight: s.heightfloor || 0,
      ceilingHeight: s.heightceiling || 0,
      floorTexture: (s.texturefloor || "FLOOR0_1").toUpperCase(),
      ceilingTexture: (s.textureceiling || "CEIL1_1").toUpperCase(),
      lightLevel: s.lightlevel || 160,
      type: s.special || 0,
      tag: s.id ?? s.tag ?? 0,
      id: idx,
    }));

    const pside = sd.map((s) => ({
      offsetX: s.offsetx || 0,
      offsetY: s.offsety || 0,
      upperTexture: (s.texturetop || "-").toUpperCase(),
      lowerTexture: (s.texturebottom || "-").toUpperCase(),
      middleTexture: (s.texturemiddle || "-").toUpperCase(),
      sectorId: s.sector,
    }));

    const pline = ln.map((l) => {
      const sf = pside[l.sidefront];
      const sb = l.sideback !== undefined ? pside[l.sideback] : null;
      return {
        v1: vx[l.v1],
        v2: vx[l.v2],
        flags: (l.blocking ? 1 : 0) | (l.twosided ? 4 : 0),
        specialType: l.special ?? l.specialtype ?? 0,
        sectorTag: l.tag ?? l.arg0 ?? 0,
        sideFront: sf,
        sideBack: sb,
        frontSector: sf ? ps[sf.sectorId] : null,
        backSector: sb ? ps[sb.sectorId] : null,
      };
    });

    return {
      vertexes: vx,
      sectors: ps,
      sidedefs: pside,
      linedefs: pline,
      things: th.map((t) => ({
        x: t.x,
        y: t.y,
        angle: t.angle || 0,
        type: t.type || 0,
        flags: 7,
      })),
    };
  }

  parseVertexes(l: WadLump | null): any[] {
    if (!l) return [];
    const d = this.getLumpData(l)!;
    const c = l.size / 4;
    const o: any[] = [];
    for (let i = 0; i < c; i++) {
      o.push({ x: d.getInt16(i * 4, true), y: d.getInt16(i * 4 + 2, true) });
    }
    return o;
  }

  parseSectors(l: WadLump | null): any[] {
    if (!l) return [];
    const d = this.getLumpData(l);
    if (!d) return [];
    const c = l.size / 26;
    const o: any[] = [];
    for (let i = 0; i < c; i++) {
      const off = i * 26;
      o.push({
        floorHeight: d.getInt16(off, true),
        ceilingHeight: d.getInt16(off + 2, true),
        floorTexture: this.readString(l.filePos + off + 4, 8),
        ceilingTexture: this.readString(l.filePos + off + 12, 8),
        lightLevel: d.getInt16(off + 20, true),
        type: d.getInt16(off + 22, true),
        tag: d.getInt16(off + 24, true),
        id: i,
      });
    }
    return o;
  }

  getPalette(): number[][] {
    if (this.palette) return this.palette;
    const l = this.getLump("PLAYPAL");
    if (!l) {
      // Default 256 grayscale palette fallback
      const defP: number[][] = [];
      for (let i = 0; i < 256; i++) defP.push([i, i, i]);
      return defP;
    }
    const d = this.getLumpData(l)!;
    const p: number[][] = [];
    for (let i = 0; i < 256; i++) {
      p.push([d.getUint8(i * 3), d.getUint8(i * 3 + 1), d.getUint8(i * 3 + 2)]);
    }
    this.palette = p;
    return p;
  }

  getFlat(name: string, pal: number[][]): any {
    const k = `${name}_${pal.length}`;
    if (this.cache.flats.has(k)) return this.cache.flats.get(k);

    const l = this.getLump(name);
    if (!l) return null;

    const dv = this.getLumpData(l)!;
    const d = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
    let w = 64,
      h = 64;
    if (d.length === 1024) w = h = 32;
    else if (d.length === 16384) w = h = 128;
    else if (d.length === 65536) w = h = 256;
    else if (d.length !== 4096) {
      const s = Math.sqrt(d.length);
      if (Number.isInteger(s)) w = h = s;
    }

    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < d.length && i < w * h; i++) {
      const c = pal[d[i]];
      if (!c) continue;
      rgba[i * 4] = c[0];
      rgba[i * 4 + 1] = c[1];
      rgba[i * 4 + 2] = c[2];
      rgba[i * 4 + 3] = 255;
    }

    const r = { data: rgba, width: w, height: h };
    this.cache.flats.set(k, r);
    return r;
  }

  loadPNames() {
    const l = this.getLump("PNAMES");
    if (!l) return;
    const d = this.getLumpData(l)!;
    const c = d.getInt32(0, true);
    this.pnames = [];
    for (let i = 0; i < c; i++) {
      this.pnames.push(this.readString(l.filePos + 4 + i * 8, 8));
    }
  }

  loadTextures() {
    this.textures = new Map();
    ["TEXTURE1", "TEXTURE2"].forEach((n) => {
      const l = this.getLump(n);
      if (!l) return;
      const d = this.getLumpData(l)!;
      const c = d.getInt32(0, true);
      const offs: number[] = [];
      for (let i = 0; i < c; i++) offs.push(d.getInt32(4 + i * 4, true));

      offs.forEach((o) => {
        const name = this.readString(l.filePos + o, 8);
        const w = d.getInt16(o + 12, true),
          h = d.getInt16(o + 14, true);
        const pc = d.getInt16(o + 20, true);
        const patches: any[] = [];
        for (let p = 0; p < pc; p++) {
          const po = o + 22 + p * 10;
          patches.push({
            originX: d.getInt16(po, true),
            originY: d.getInt16(po + 2, true),
            patchIdx: d.getInt16(po + 4, true),
          });
        }
        this.textures!.set(name, { name, width: w, height: h, patches });
      });
    });
  }

  getCompositeTexture(name: string, pal: number[][]): any {
    const k = `${name}_${pal.length}`;
    if (this.cache.composites.has(k)) return this.cache.composites.get(k);

    if (!this.pnames) this.loadPNames();
    if (!this.textures) this.loadTextures();

    const td = this.textures?.get(name);
    if (!td) return null;

    const rgba = new Uint8ClampedArray(td.width * td.height * 4);
    td.patches.forEach((p: any) => {
      const pn = this.pnames![p.patchIdx];
      const pt = this.getPatch(pn, pal);
      if (!pt) return;
      for (let py = 0; py < pt.height; py++) {
        const dy = p.originY + py;
        if (dy < 0 || dy >= td.height) continue;
        for (let px = 0; px < pt.width; px++) {
          const dx = p.originX + px;
          if (dx < 0 || dx >= td.width) continue;
          const si = (py * pt.width + px) * 4;
          if (pt.data[si + 3] === 0) continue;
          const di = (dy * td.width + dx) * 4;
          rgba[di] = pt.data[si];
          rgba[di + 1] = pt.data[si + 1];
          rgba[di + 2] = pt.data[si + 2];
          rgba[di + 3] = 255;
        }
      }
    });

    const r = { data: rgba, width: td.width, height: td.height };
    this.cache.composites.set(k, r);
    return r;
  }

  getPatch(name: string, pal: number[][]): any {
    const k = `${name}_${pal.length}`;
    if (this.cache.patches.has(k)) return this.cache.patches.get(k);

    const l = this.getLump(name);
    if (!l) return null;
    const d = this.getLumpData(l);
    if (!d || d.byteLength < 8) return null;

    try {
      const w = d.getUint16(0, true),
        h = d.getUint16(2, true);
      if (w <= 0 || h <= 0 || w > 1024 || h > 1024) return null;
      const rgba = new Uint8ClampedArray(w * h * 4);
      const cols: number[] = [];
      for (let i = 0; i < w; i++) cols.push(d.getUint32(8 + i * 4, true));

      for (let x = 0; x < w; x++) {
        let o = cols[x];
        while (true) {
          const rs = d.getUint8(o);
          if (rs === 255) break;
          const pc = d.getUint8(o + 1);
          o += 3;
          for (let i = 0; i < pc; i++) {
            const ci = d.getUint8(o + i);
            const c = pal[ci];
            const y = rs + i;
            if (y < h) {
              const idx = (y * w + x) * 4;
              rgba[idx] = c[0];
              rgba[idx + 1] = c[1];
              rgba[idx + 2] = c[2];
              rgba[idx + 3] = 255;
            }
          }
          o += pc + 1;
        }
      }
      const r = { data: rgba, width: w, height: h };
      this.cache.patches.set(k, r);
      return r;
    } catch (e) {
      return null;
    }
  }

  parseSidedefs(l: WadLump | null): any[] {
    if (!l) return [];
    const d = this.getLumpData(l);
    if (!d) return [];
    const c = l.size / 30;
    const o: any[] = [];
    for (let i = 0; i < c; i++) {
      const off = i * 30;
      o.push({
        offsetX: d.getInt16(off, true),
        offsetY: d.getInt16(off + 2, true),
        upperTexture: this.readString(l.filePos + off + 4, 8),
        lowerTexture: this.readString(l.filePos + off + 12, 8),
        middleTexture: this.readString(l.filePos + off + 20, 8),
        sectorId: d.getInt16(off + 28, true),
      });
    }
    return o;
  }

  parseLinedefs(l: WadLump | null, v: any[], sd: any[], sc: any[]): any[] {
    if (!l) return [];
    const d = this.getLumpData(l);
    if (!d) return [];
    const c = l.size / 14;
    const o: any[] = [];
    for (let i = 0; i < c; i++) {
      const off = i * 14;
      const v1 = d.getUint16(off, true),
        v2 = d.getUint16(off + 2, true);
      const fl = d.getUint16(off + 4, true),
        sp = d.getUint16(off + 6, true),
        tg = d.getUint16(off + 8, true);
      const sfI = d.getUint16(off + 10, true),
        sbI = d.getUint16(off + 12, true);
      const sf = sfI !== 0xffff ? sd[sfI] : null;
      const sb = sbI !== 0xffff ? sd[sbI] : null;
      o.push({
        v1: v[v1],
        v2: v[v2],
        flags: fl,
        specialType: sp,
        sectorTag: tg,
        sideFront: sf,
        sideBack: sb,
        frontSector: sf ? sc[sf.sectorId] : null,
        backSector: sb ? sc[sb.sectorId] : null,
      });
    }
    return o;
  }

  parseThings(l: WadLump | null): any[] {
    if (!l) return [];
    const d = this.getLumpData(l);
    if (!d) return [];
    const c = l.size / 10;
    const o: any[] = [];
    for (let i = 0; i < c; i++) {
      const off = i * 10;
      o.push({
        x: d.getInt16(off, true),
        y: d.getInt16(off + 2, true),
        angle: d.getInt16(off + 4, true),
        type: d.getInt16(off + 6, true),
        flags: d.getInt16(off + 8, true),
      });
    }
    return o;
  }

  getSound(name: string, ctx: AudioContext): AudioBuffer | null {
    const l = this.getLump("DS" + name.toUpperCase());
    if (!l) return null;
    const d = this.getLumpData(l);
    if (!d || d.byteLength < 8) return null;

    if (d.getUint16(0, true) === 3) {
      const sr = d.getUint16(2, true);
      const sc = d.getUint32(4, true);
      const s = new Uint8Array(d.buffer, d.byteOffset + 8, Math.min(sc, d.byteLength - 8));
      const buf = ctx.createBuffer(1, s.length, sr);
      const out = buf.getChannelData(0);
      for (let i = 0; i < s.length; i++) out[i] = (s[i] - 128) / 128;
      return buf;
    }
    return null;
  }

  getMusicData(n: string): ArrayBuffer | null {
    const l = this.getLump(n);
    if (!l) return null;
    const d = this.getLumpData(l)!;
    return d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength);
  }

  getAllLumpsWithName(n: string): WadLump[] {
    return this.directory.filter((l) => l.name === n.toUpperCase());
  }
}

/* ================= PK3 PARSER ================= */
export class Pk3Parser {
  public files: Map<string, ArrayBuffer> = new Map();
  public zip: any = null;

  async load(buf: ArrayBuffer) {
    this.zip = await JSZip.loadAsync(buf);
    const ps: Promise<any>[] = [];
    this.zip.forEach((p: string, f: any) => {
      if (!f.dir) {
        ps.push(f.async("arraybuffer").then((d: ArrayBuffer) => this.files.set(p.toUpperCase(), d)));
      }
    });
    await Promise.all(ps);
  }

  getEmbeddedWads(): WadParser[] {
    const o: WadParser[] = [];
    for (const [p, b] of this.files.entries()) {
      if (p.endsWith(".WAD")) o.push(new WadParser(b));
    }
    return o;
  }

  getVirtualLumps(): WadLump[] {
    const o: WadLump[] = [];
    for (const [p, b] of this.files.entries()) {
      const fn = p.split("/").pop() || "";
      const n = fn.split(".")[0].toUpperCase().substring(0, 8);
      if (n && !p.endsWith(".WAD")) {
        o.push({ name: n, buffer: b, size: b.byteLength, filePos: 0, index: 0 });
      }
    }
    return o;
  }
}

/* ================= ENEMY AI ================= */
export class DoomEnemyAI {
  public scene: THREE.Scene;
  public mapData: any;
  public type: string;
  public monsterType: number | null;
  public health: number;
  public isBarrel: boolean;
  public baseDmg: number;
  public mesh: THREE.Group;
  public billboard: THREE.Mesh | null = null;
  public velocity = new THREE.Vector3();
  public speed: number;
  public target: THREE.Vector3 | null = null;
  public timer = 0;
  public attackTimer = 0;
  public attackAnimTimer = 0;
  public painTimer = 0;
  public alerted: boolean;
  public yaw: number;
  public dead = false;
  public shouldRemove = false;
  public deathTimer = 0;
  public spawnTime: number;
  public lastPos: THREE.Vector3;
  public sectorCache: any = null;
  public sectorCacheCounter = 0;
  public stuckTimer = 0;
  public bumpTarget: boolean | null = null;

  constructor(
    scene: THREE.Scene,
    mapData: any,
    type: string,
    x: number,
    y: number,
    z: number,
    monsterType: number | null = null,
    initialYaw: number = 0
  ) {
    this.scene = scene;
    this.mapData = mapData;
    this.type = type;
    this.monsterType = monsterType;

    const stats: Record<number, { hp: number; speed: number; dmg?: number; isBarrel?: boolean }> = {
      3004: { hp: 20, speed: 100, dmg: 5 }, // Zombieman
      9: { hp: 30, speed: 100, dmg: 15 }, // Shotgunner
      3001: { hp: 60, speed: 120, dmg: 10 }, // Imp
      3002: { hp: 150, speed: 180, dmg: 12 }, // Pinky Demon
      3005: { hp: 400, speed: 80, dmg: 20 }, // Cacodemon
      3003: { hp: 1000, speed: 100, dmg: 40 }, // Baron of Hell
      16: { hp: 4000, speed: 150, dmg: 80 }, // Cyberdemon
      3006: { hp: 70, speed: 100, dmg: 8 }, // Chaingunner
      2035: { hp: 1, speed: 0, isBarrel: true }, // Exploding Barrel
    };

    const st = (monsterType && stats[monsterType]) || { hp: 20, speed: 100 };
    this.health = st.hp;
    this.isBarrel = Boolean(st.isBarrel);
    this.baseDmg = st.dmg || 8;
    this.speed = type === "bot" ? 250 : st.speed || 100;
    this.alerted = type === "bot";
    this.yaw = initialYaw;
    this.spawnTime = performance.now();
    this.lastPos = new THREE.Vector3(x, y, z);

    this.mesh = new THREE.Group();
    // Default fallback geometry
    const g = new THREE.BoxGeometry(22, 42, 22);
    const m = new THREE.MeshBasicMaterial({
      color: type === "bot" ? 0x0088ff : this.isBarrel ? 0x22c55e : 0xff3322,
    });
    const b = new THREE.Mesh(g, m);
    b.position.y = 21;
    this.mesh.add(b);

    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);
  }

  update(delta: number, player: DoomPlayerController) {
    this.timer += delta;
    if (this.dead) {
      this.deathTimer += delta;
      return;
    }
    if (this.isBarrel) return;

    // Face player
    if (player?.camera) {
      const cp = player.camera.position;
      const dx = cp.x - this.mesh.position.x,
        dz = cp.z - this.mesh.position.z;
      const ang = Math.atan2(dx, dz);
      this.mesh.rotation.y = ang;
    }

    const d = this.mesh.position.distanceTo(player.camera.position);
    if (!this.alerted) {
      if (d < 1200) {
        this.alerted = true;
      } else return;
    }

    // Refresh movement target
    if (!this.target || this.timer > 2) {
      this.target = player.camera.position.clone();
      this.timer = 0;
    }

    // Attack player
    this.attackTimer += delta;
    if (d < 64 && this.attackTimer > 0.8) {
      player.takeDamage(this.baseDmg);
      this.attackTimer = 0;
    }

    // Move towards target
    const toTargetX = this.target.x - this.mesh.position.x;
    const toTargetZ = this.target.z - this.mesh.position.z;
    const distToTarget = Math.hypot(toTargetX, toTargetZ);
    if (distToTarget > 40) {
      const nx = toTargetX / distToTarget,
        nz = toTargetZ / distToTarget;
      this.mesh.position.x += nx * this.speed * delta;
      this.mesh.position.z += nz * this.speed * delta;
      this.yaw = Math.atan2(nx, nz);
    }
  }

  takeDamage(amount: number) {
    this.health -= amount;
    this.alerted = true;
    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.deathTimer = 0;
    setTimeout(() => {
      this.shouldRemove = true;
      this.remove();
    }, 2500);
  }

  remove() {
    this.scene.remove(this.mesh);
  }
}

/* ================= PLAYER CONTROLLER ================= */
export class DoomPlayerController {
  public camera: THREE.PerspectiveCamera;
  public input: DoomInputManager | null;
  public ammo = 50;
  public inventory: Record<string, boolean> = { fist: true, pistol: true, shotgun: true };
  public keys = { red: false, blue: false, yellow: false };
  public armor = 0;
  public health = 100;
  public velocity = new THREE.Vector3();
  public speed = 2200.0;
  public friction = 12.0;
  public gravity = -1500;
  public velY = 0;
  public pitch = 0;
  public yaw = 0;
  public radius = 20;
  public height = 41;
  public mapData: any = null;
  public currentSector: any = null;
  public currentWeapon = 2; // 0=fist, 1=chainsaw, 2=pistol, 3=shotgun, 4=ssg, 5=chaingun, 6=rocket, 7=plasma, 8=bfg
  public firePressed = false;
  public firingProgress = 0;
  public isDead = false;
  public noclip = false;
  public godMode = false;
  private onTriggerSector: Function | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    input: DoomInputManager | null,
    onTrigger?: Function
  ) {
    this.camera = camera;
    this.input = input;
    this.onTriggerSector = onTrigger || null;
    this._initListeners();
  }

  setMapData(d: any) {
    this.mapData = d;
    this.currentSector = null;
  }

  private _initListeners() {
    if (!this.input) return;
    this.input.on("action", ({ type, action }: any) => {
      if (type !== "down") return;
      if (action === "jump") this.jump();
      if (action === "use") this.tryUse();
      if (action === "nextWeapon") this.cycleWeapon(1);
      if (action === "prevWeapon") this.cycleWeapon(-1);
    });
  }

  cycleWeapon(dir: number) {
    const ids = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const curIdx = ids.indexOf(this.currentWeapon);
    this.currentWeapon = ids[(curIdx + dir + ids.length) % ids.length];
  }

  jump() {
    if (Math.abs(this.velY) < 10) this.velY = 350;
  }

  tryUse() {
    if (!this.mapData) return;
    const px = this.camera.position.x,
      py = -this.camera.position.z;
    for (const l of this.mapData.linedefs) {
      if (l.specialType > 0 && this._p2s(px, py, l.v1.x, l.v1.y, l.v2.x, l.v2.y) < 64) {
        if (this.onTriggerSector) {
          this.onTriggerSector(l);
        }
      }
    }
  }

  takeDamage(amount: number) {
    if (this.godMode) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  update(delta: number) {
    if (this.isDead) return;

    if (this.input) {
      this.input.update(delta);
      this.yaw = this.input.yaw;
      this.pitch = this.input.pitch;
      this.firePressed = this.input.isDown("fire");
    }

    if (this.firingProgress > 0) {
      this.firingProgress += delta * 2.5;
      if (this.firingProgress >= 1.0) this.firingProgress = 0;
    }

    const moveForward = this.input?.isDown("forward") || false;
    const moveBackward = this.input?.isDown("backward") || false;
    const moveLeft = this.input?.isDown("left") || false;
    const moveRight = this.input?.isDown("right") || false;

    this.velocity.x -= this.velocity.x * this.friction * delta;
    this.velocity.z -= this.velocity.z * this.friction * delta;

    const dz = Number(moveForward) - Number(moveBackward);
    const dx = Number(moveRight) - Number(moveLeft);
    const ln = Math.hypot(dx, dz) || 1;
    const nx = dx / ln,
      nz = dz / ln;

    if (moveForward || moveBackward) this.velocity.z -= nz * this.speed * delta;
    if (moveLeft || moveRight) this.velocity.x -= nx * this.speed * delta;

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.yaw, 0))
    );
    const rt = new THREE.Vector3(1, 0, 0).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.yaw, 0))
    );

    const mvx = (fwd.x * -this.velocity.z + rt.x * -this.velocity.x) * delta;
    const mvz = (fwd.z * -this.velocity.z + rt.z * -this.velocity.x) * delta;

    this.camera.position.x += mvx;
    this.camera.position.z += mvz;

    // Gravity and floor snap
    this.velY += this.gravity * delta;
    this.camera.position.y += this.velY * delta;

    if (this.mapData) {
      const sec = this.getSectorAt(this.camera.position.x, -this.camera.position.z);
      if (sec) {
        const fy = sec.floorHeight + this.height;
        if (this.camera.position.y <= fy) {
          this.camera.position.y = fy;
          this.velY = 0;
        }
      }
    }

    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  getSectorAt(x: number, y: number): any {
    if (!this.mapData?.sectors) return null;
    let best = null,
      md = Infinity;
    for (const l of this.mapData.linedefs) {
      const d = this._p2s(x, y, l.v1.x, l.v1.y, l.v2.x, l.v2.y);
      if (d < md) {
        md = d;
        best = l.frontSector || l.backSector;
      }
    }
    return best;
  }

  private _p2s(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }
}

/* ================= 3D MAP BUILDER (EARCUT TRIANGULATION) ================= */
const isSky = (n?: string) => (!n ? false : /^F_SKY/i.test(n) || /^SKY/i.test(n));

export function buildDoom3DMap(mapData: any, wad: WadParser): THREE.Group {
  const group = new THREE.Group();
  const { linedefs, sectors } = mapData;
  const palette = wad.getPalette();
  const texCache = new Map<string, THREE.Texture | null>();
  const matCache = new Map<string, THREE.Material>();

  const getTexture = (name?: string, isFlat = false): THREE.Texture | null => {
    if (!name || name === "-") return null;
    const k = name + (isFlat ? "_f" : "_w");
    if (texCache.has(k)) return texCache.get(k) || null;

    const td = isFlat
      ? wad.getFlat(name, palette)
      : wad.getCompositeTexture(name, palette) ||
        wad.getPatch(name, palette) ||
        wad.getFlat(name, palette);

    if (!td) {
      const cv = getDoomTextureCanvas(name);
      if (cv) {
        const tex = new THREE.CanvasTexture(cv);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.magFilter = tex.minFilter = THREE.NearestFilter;
        tex.needsUpdate = true;
        texCache.set(k, tex);
        return tex;
      }
      texCache.set(k, null);
      return null;
    }

    const tex = new THREE.DataTexture(td.data, td.width, td.height, THREE.RGBAFormat);
    tex.flipY = true;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    texCache.set(k, tex);
    return tex;
  };

  const getMaterial = (
    name: string,
    sector: any,
    isFlat: boolean,
    side: THREE.Side = THREE.FrontSide
  ): THREE.Material => {
    const lightRaw = sector ? sector.lightLevel || 255 : 255;
    const ll = Math.floor(lightRaw / 16) * 16;
    const light = ll / 255;
    const k = `${name}_${ll}_${isFlat}_${side}`;
    if (matCache.has(k)) return matCache.get(k)!;

    const tex = getTexture(name, isFlat);
    let m: THREE.Material;

    if (isSky(name)) {
      m = new THREE.MeshBasicMaterial({
        map: tex || null,
        side: THREE.FrontSide,
        depthWrite: true,
      });
    } else {
      m = new THREE.MeshPhongMaterial({
        map: tex || null,
        color: tex ? new THREE.Color(light, light, light) : new THREE.Color(0x666666).multiplyScalar(light),
        side: isFlat ? side : THREE.DoubleSide,
        shininess: 0,
      });
    }

    matCache.set(k, m);
    return m;
  };

  // Add Wall Quad Helper
  const addWall = (
    v1: any,
    v2: any,
    floor: number,
    ceil: number,
    material: THREE.Material,
    wallPart: string
  ) => {
    const h = ceil - floor;
    if (h <= 0 || !material) return;
    const len = Math.hypot(v2.x - v1.x, v2.y - v1.y);
    const g = new THREE.BufferGeometry();
    const pos: number[] = [],
      uv: number[] = [];
    const tw = 64,
      th = 64;

    const addV = (x: number, y: number, z: number, u: number, v: number) => {
      pos.push(x, z, -y);
      uv.push(u, v);
    };

    addV(v1.x, v1.y, ceil, 0, ceil / th);
    addV(v2.x, v2.y, ceil, len / tw, ceil / th);
    addV(v1.x, v1.y, floor, 0, floor / th);
    addV(v2.x, v2.y, ceil, len / tw, ceil / th);
    addV(v2.x, v2.y, floor, len / tw, floor / th);
    addV(v1.x, v1.y, floor, 0, floor / th);

    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();

    const m = new THREE.Mesh(g, material);
    m.userData = { type: "wall", wallPart };
    group.add(m);
  };

  // 1. Build Walls
  for (const line of linedefs) {
    const { v1, v2, frontSector, backSector, sideFront, sideBack } = line;
    if (frontSector && !backSector) {
      const tn = sideFront
        ? sideFront.middleTexture !== "-"
          ? sideFront.middleTexture
          : sideFront.upperTexture !== "-"
          ? sideFront.upperTexture
          : sideFront.lowerTexture
        : null;
      if (tn && !isSky(tn)) {
        addWall(v1, v2, frontSector.floorHeight, frontSector.ceilingHeight, getMaterial(tn, frontSector, false), "middle");
      }
    } else if (frontSector && backSector) {
      if (sideFront) {
        if (frontSector.ceilingHeight > backSector.ceilingHeight && sideFront.upperTexture !== "-" && !isSky(sideFront.upperTexture)) {
          addWall(v1, v2, backSector.ceilingHeight, frontSector.ceilingHeight, getMaterial(sideFront.upperTexture, frontSector, false), "upper");
        }
        if (frontSector.floorHeight < backSector.floorHeight && sideFront.lowerTexture !== "-") {
          addWall(v1, v2, frontSector.floorHeight, backSector.floorHeight, getMaterial(sideFront.lowerTexture, frontSector, false), "lower");
        }
        if (sideFront.middleTexture !== "-" && !isSky(sideFront.middleTexture)) {
          const lo = Math.max(frontSector.floorHeight, backSector.floorHeight);
          const hi = Math.min(frontSector.ceilingHeight, backSector.ceilingHeight);
          addWall(v1, v2, lo, hi, getMaterial(sideFront.middleTexture, frontSector, false), "middle");
        }
      }
    }
  }

  // 2. Build Sector Floors and Ceilings via Earcut Polygon Tessellation
  for (const sector of sectors) {
    const secLines = linedefs
      .filter((l: any) => l.frontSector?.id === sector.id || l.backSector?.id === sector.id)
      .map((l: any) =>
        l.frontSector?.id === sector.id ? { v1: l.v1, v2: l.v2 } : { v1: l.v2, v2: l.v1 }
      );

    if (!secLines.length) continue;

    const loops: any[][] = [];
    const rem = [...secLines];
    while (rem.length) {
      const loop = [];
      const c = rem.shift()!;
      loop.push(c.v1);
      let last = c.v2;
      let found = true;
      while (found) {
        found = false;
        for (let i = 0; i < rem.length; i++) {
          if (rem[i].v1 === last) {
            const nx = rem.splice(i, 1)[0];
            loop.push(nx.v1);
            last = nx.v2;
            found = true;
            break;
          }
        }
      }
      if (loop.length > 2) loops.push(loop);
    }

    if (!loops.length) continue;

    const verts: number[] = [],
      holes: number[] = [];
    loops.forEach((lp, i) => {
      if (i > 0) holes.push(verts.length / 2);
      lp.forEach((p) => verts.push(p.x, p.y));
    });

    try {
      const data = earcut(verts, holes, 2);
      if (!data.length) continue;

      // Floor Mesh
      const fg = new THREE.BufferGeometry();
      const fp: number[] = [],
        fu: number[] = [];
      for (let i = 0; i < data.length; i++) {
        const idx = data[i];
        const x = verts[idx * 2],
          y = verts[idx * 2 + 1];
        fp.push(x, sector.floorHeight, -y);
        fu.push(x / 64, y / 64);
      }
      fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
      fg.setAttribute("uv", new THREE.Float32BufferAttribute(fu, 2));
      fg.computeVertexNormals();

      const fm = new THREE.Mesh(fg, getMaterial(sector.floorTexture, sector, true, THREE.FrontSide));
      group.add(fm);
      sector.floorMesh = fm;

      // Ceiling Mesh (if not sky)
      if (!isSky(sector.ceilingTexture)) {
        const cg = new THREE.BufferGeometry();
        const cp: number[] = [],
          cu: number[] = [];
        for (let i = 0; i < data.length; i++) {
          const idx = data[i];
          const x = verts[idx * 2],
            y = verts[idx * 2 + 1];
          cp.push(x, sector.ceilingHeight, -y);
          cu.push(x / 64, y / 64);
        }
        cg.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3));
        cg.setAttribute("uv", new THREE.Float32BufferAttribute(cu, 2));
        cg.computeVertexNormals();

        const cm = new THREE.Mesh(cg, getMaterial(sector.ceilingTexture, sector, true, THREE.BackSide));
        group.add(cm);
        sector.ceilingMesh = cm;
      }
    } catch (e) {
      console.warn("Earcut polygon tessellation failed for sector", sector.id, e);
    }
  }

  return group;
}

/* ================= DOOM WAD ENGINE CONTROLLER ================= */
export class DoomWadEngine {
  public container: HTMLElement | null = null;
  public canvas: HTMLCanvasElement | null = null;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public clock = new THREE.Clock();
  public player: DoomPlayerController;
  public input: DoomInputManager | null = null;
  public wad: WadParser | null = null;
  public currentMapName: string | null = null;
  public enemies: DoomEnemyAI[] = [];
  public animFrameId: number | null = null;
  public audioCtx: AudioContext | null = null;
  public isRunning = false;
  public masterVolume = 0.8;
  public skyBox: THREE.Mesh | null = null;
  public playerLight: THREE.PointLight | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(75, 1, 1, 15000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(-1000, 1000, 0);
    this.scene.add(sun);
    this.scene.fog = new THREE.Fog(0x000000, 100, 2500);

    this.playerLight = new THREE.PointLight(0xffffff, 1.2, 500);
    this.scene.add(this.playerLight);

    this.player = new DoomPlayerController(this.camera, null);
  }

  public mount(container: HTMLElement) {
    this.container = container;
    this.canvas = this.renderer.domElement;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    container.innerHTML = "";
    container.appendChild(this.canvas);

    this.input = new DoomInputManager(this.canvas);
    this.player.input = this.input;

    const rect = container.getBoundingClientRect();
    this.resize(rect.width || 640, rect.height || 400);

    this.startLoop();
  }

  public unmount() {
    this.stopLoop();
    if (this.input) {
      this.input.destroy();
      this.input = null;
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.container = null;
  }

  public resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public async loadWadBuffer(buffer: ArrayBuffer, name = "IWAD"): Promise<string[]> {
    this.wad = new WadParser(buffer);
    const names = new Set<string>();
    for (let i = 0; i < this.wad.directory.length - 1; i++) {
      const l = this.wad.directory[i];
      const nx = this.wad.directory[i + 1]?.name;
      if (/^E\dM\d$/.test(l.name) || /^MAP\d\d$/.test(l.name) || nx === "THINGS" || nx === "TEXTMAP") {
        names.add(l.name);
      }
    }
    const mapList = Array.from(names).sort();
    if (mapList.length > 0) {
      await this.loadMap(mapList[0]);
    }
    return mapList;
  }

  public loadPwadBuffer(buffer: ArrayBuffer) {
    if (!this.wad) throw new Error("Carga un IWAD antes de añadir PWAD.");
    const pw = new WadParser(buffer);
    this.wad.mergeWad(pw);
  }

  public async loadPk3Buffer(buffer: ArrayBuffer) {
    if (!this.wad) throw new Error("Carga un IWAD antes de añadir PK3.");
    const pk3 = new Pk3Parser();
    await pk3.load(buffer);
    pk3.getEmbeddedWads().forEach((x) => this.wad!.mergeWad(x));
    this.wad.mergeLumps(pk3.getVirtualLumps());
  }

  public async loadMap(mapName: string, skill = 4) {
    if (!this.wad) {
      const defWad = createDefaultDoomWadBuffer();
      await this.loadWadBuffer(defWad, "DOOM_DEFAULT.WAD");
    }
    if (!this.wad) return;
    this.currentMapName = mapName;

    // Clear previous map
    const ex = this.scene.getObjectByName("current-map");
    if (ex) this.scene.remove(ex);
    if (this.skyBox) this.scene.remove(this.skyBox);

    this.enemies.forEach((e) => e.remove());
    this.enemies = [];

    const md = this.wad.parseMap(mapName);
    if (!md) throw new Error(`No se pudo leer el mapa ${mapName}`);

    md.things = md.things.filter((t: any) => !(t.flags & 16) && !!(t.flags & skill));
    const mg = buildDoom3DMap(md, this.wad);
    mg.name = "current-map";
    this.scene.add(mg);

    this.player.setMapData(md);

    // Spawn Player 1
    const p1 = md.things.find((t: any) => t.type === 1);
    if (p1) {
      const sec = this.player.getSectorAt(p1.x, -p1.y);
      const sy = (sec ? sec.floorHeight : 0) + this.player.height;
      this.camera.position.set(p1.x, sy, -p1.y);
      this.player.yaw = ((p1.angle - 90) * Math.PI) / 180;
      if (this.input) this.input.yaw = this.player.yaw;
    } else {
      this.camera.position.set(0, 50, 0);
    }

    // Spawn Monsters
    const mtypes = [3004, 3001, 9, 3002, 58, 3006, 3005, 3003, 16];
    md.things.forEach((t: any) => {
      const sec = this.player.getSectorAt(t.x, t.y);
      const gy = sec ? sec.floorHeight : 0;
      if (mtypes.includes(t.type)) {
        const yaw = ((t.angle - 90) * Math.PI) / 180;
        this.enemies.push(new DoomEnemyAI(this.scene, md, "monster", t.x, gy, -t.y, t.type, yaw));
      }
    });

    this.setupSky();
  }

  private setupSky() {
    if (!this.wad) return;
    const pal = this.wad.getPalette();
    const sn = this.wad.getLump("SKY1") ? "SKY1" : this.wad.getLump("RSKY1") ? "RSKY1" : null;
    if (!sn) return;

    const td = this.wad.getCompositeTexture(sn, pal) || this.wad.getPatch(sn, pal);
    if (!td) return;

    const t = new THREE.DataTexture(td.data, td.width, td.height, THREE.RGBAFormat);
    t.flipY = true;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(4, 1);
    t.needsUpdate = true;

    const g = new THREE.SphereGeometry(8000, 32, 32);
    const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false });
    this.skyBox = new THREE.Mesh(g, m);
    this.scene.add(this.skyBox);
  }

  public startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();

    const loop = () => {
      if (!this.isRunning) return;
      this.animFrameId = requestAnimationFrame(loop);
      const delta = Math.min(this.clock.getDelta(), 0.1);

      this.player.update(delta);

      if (this.player.firePressed && this.player.firingProgress === 0) {
        this.shootWeapon();
      }

      if (this.playerLight) {
        this.playerLight.position.copy(this.camera.position);
      }
      if (this.skyBox) {
        this.skyBox.position.copy(this.camera.position);
      }

      for (const e of this.enemies) {
        e.update(delta, this.player);
      }
      this.enemies = this.enemies.filter((e) => !e.shouldRemove);

      this.renderer.render(this.scene, this.camera);
    };

    loop();
  }

  public stopLoop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public playDoomSound(name: string, vol = 1.0) {
    if (!this.wad) return;
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
    }
    if (!this.audioCtx) return;
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    const buf = this.wad.getSound(name, this.audioCtx);
    if (buf) {
      const s = this.audioCtx.createBufferSource();
      s.buffer = buf;
      const g = this.audioCtx.createGain();
      g.gain.value = Math.max(0, Math.min(1, vol * this.masterVolume));
      s.connect(g);
      g.connect(this.audioCtx.destination);
      s.start(0);
    }
  }

  public drawAutomap(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx || !this.player?.mapData) return;
    const w = canvas.width,
      h = canvas.height;
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, w, h);

    const md = this.player.mapData;
    let mnX = Infinity,
      mxX = -Infinity,
      mnY = Infinity,
      mxY = -Infinity;
    md.vertexes.forEach((v: any) => {
      if (v.x < mnX) mnX = v.x;
      if (v.x > mxX) mxX = v.x;
      if (v.y < mnY) mnY = v.y;
      if (v.y > mxY) mxY = v.y;
    });
    const pad = 32;
    mnX -= pad;
    mnY -= pad;
    mxX += pad;
    mxY += pad;
    const sc = Math.min(w / (mxX - mnX || 1), h / (mxY - mnY || 1));

    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    md.linedefs.forEach((l: any) => {
      ctx.moveTo((l.v1.x - mnX) * sc, h - (l.v1.y - mnY) * sc);
      ctx.lineTo((l.v2.x - mnX) * sc, h - (l.v2.y - mnY) * sc);
    });
    ctx.stroke();

    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.arc(
      (this.camera.position.x - mnX) * sc,
      h - (-this.camera.position.z - mnY) * sc,
      4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#ef4444";
    this.enemies.forEach((e) => {
      if (e.dead) return;
      ctx.fillRect((e.mesh.position.x - mnX) * sc - 2, h - (-e.mesh.position.z - mnY) * sc - 2, 4, 4);
    });
  }

  public shootWeapon() {
    if (this.player.isDead) return;
    this.player.firingProgress = 0.01;

    const wep = this.player.currentWeapon;
    let sfx = "DSPISTOL";
    let dmg = 20;
    let cost = 1;
    if (wep === 0) { sfx = "DSPUNCH"; dmg = 30; cost = 0; }
    else if (wep === 1) { sfx = "DSSAWFUL"; dmg = 45; cost = 0; }
    else if (wep === 2) { sfx = "DSPISTOL"; dmg = 22; cost = 1; }
    else if (wep === 3) { sfx = "DSSHOTGN"; dmg = 85; cost = 1; }
    else if (wep === 4) { sfx = "DSDSHTGN"; dmg = 190; cost = 2; }
    else if (wep === 5) { sfx = "DSPISTOL"; dmg = 25; cost = 1; }
    else if (wep === 6) { sfx = "DSRLAUNC"; dmg = 260; cost = 1; }
    else if (wep === 7) { sfx = "DSPLASMA"; dmg = 55; cost = 1; }
    else if (wep === 8) { sfx = "DSBFG"; dmg = 800; cost = 40; }

    if (!this.player.godMode) {
      if (this.player.ammo < cost) {
        this.playDoomSound("DSNOWAY", 0.5);
        return;
      }
      this.player.ammo -= cost;
    }

    this.playDoomSound(sfx, 0.9);

    if (this.playerLight) {
      this.playerLight.intensity = 3.5;
      setTimeout(() => {
        if (this.playerLight) this.playerLight.intensity = 1.2;
      }, 90);
    }

    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const toEnemy = enemy.mesh.position.clone().sub(origin);
      const proj = toEnemy.dot(dir);
      if (proj > 0 && proj < 2500) {
        const perpDist = toEnemy.clone().sub(dir.clone().multiplyScalar(proj)).length();
        if (perpDist < 40) {
          enemy.takeDamage(dmg);
          if (enemy.dead) {
            this.playDoomSound("DSPODIE1", 0.85);
          } else {
            this.playDoomSound("DSPOPAIN", 0.75);
          }
          break;
        }
      }
    }
  }

  public toggleGodMode() {
    this.player.godMode = !this.player.godMode;
    if (this.player.godMode) this.player.health = 100;
    return this.player.godMode;
  }

  public toggleNoclip() {
    this.player.noclip = !this.player.noclip;
    return this.player.noclip;
  }

  public giveAll() {
    this.player.health = 200;
    this.player.armor = 200;
    this.player.ammo = 999;
    this.player.keys = { red: true, blue: true, yellow: true };
    this.playDoomSound("DSGETPOW", 1.0);
  }

  public drawDoomHud(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const wep = this.player.currentWeapon;
    const isFiring = this.player.firingProgress > 0;
    const bobOffset = Math.sin(Date.now() * 0.008) * (this.input?.isDown("forward") || this.input?.isDown("backward") ? 8 : 1);
    const wepX = width / 2;
    const wepY = height - 40 + bobOffset;

    ctx.save();
    if (wep === 3 || wep === 4) {
      // Shotgun double barrel
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(wepX - 16, wepY - 50, 32, 50);
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(wepX - 7, wepY - 50, 6, 0, Math.PI * 2);
      ctx.arc(wepX + 7, wepY - 50, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#475569";
      ctx.fillRect(wepX - 22, wepY - 30, 44, 30);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(wepX - 14, wepY - 10, 28, 15);
    } else if (wep === 2 || wep === 5) {
      ctx.fillStyle = "#334155";
      ctx.fillRect(wepX - 8, wepY - 45, 16, 45);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(wepX - 14, wepY - 25, 28, 25);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(wepX - 24, wepY - 55, 48, 55);
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(wepX - 12, wepY - 45, 24, 15);
    }

    if (isFiring) {
      ctx.fillStyle = "rgba(250, 204, 21, 0.9)";
      ctx.beginPath();
      ctx.arc(wepX, wepY - 55, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(249, 115, 22, 0.7)";
      ctx.beginPath();
      ctx.arc(wepX, wepY - 60, 28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Crosshair
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 8, height / 2);
    ctx.lineTo(width / 2 + 8, height / 2);
    ctx.moveTo(width / 2, height / 2 - 8);
    ctx.lineTo(width / 2, height / 2 + 8);
    ctx.stroke();

    // Classic Doom Status Bar (Bottom 36px)
    const barH = 36;
    const barY = height - barH;
    ctx.fillStyle = "#1e2430";
    ctx.fillRect(0, barY, width, barH);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, barY, width, barH);

    const sW = width / 5;
    ctx.strokeStyle = "#0f172a";
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(sW * i, barY);
      ctx.lineTo(sW * i, height);
      ctx.stroke();
    }

    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";

    // 1. AMMO
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("AMMO", sW * 0.5, barY + 11);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 16px monospace";
    ctx.fillText(`${this.player.ammo}`, sW * 0.5, barY + 28);

    // 2. HEALTH
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("HEALTH", sW * 1.5, barY + 11);
    ctx.fillStyle = this.player.health > 25 ? "#22c55e" : "#ef4444";
    ctx.font = "bold 16px monospace";
    ctx.fillText(`${Math.max(0, this.player.health)}%`, sW * 1.5, barY + 28);

    // 3. DOOMGUY FACE
    const faceX = sW * 2.5;
    const faceY = barY + barH / 2;
    ctx.fillStyle = "#fcd34d";
    ctx.beginPath();
    ctx.arc(faceX, faceY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#78350f";
    ctx.beginPath();
    ctx.arc(faceX, faceY - 5, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    const eyeShift = this.input?.isDown("turnLeft") || this.input?.isDown("left") ? -2 : this.input?.isDown("turnRight") || this.input?.isDown("right") ? 2 : 0;
    ctx.fillRect(faceX - 6 + eyeShift, faceY - 2, 3, 3);
    ctx.fillRect(faceX + 3 + eyeShift, faceY - 2, 3, 3);
    if (this.player.firingProgress > 0) {
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(faceX - 5, faceY + 5, 10, 3);
    } else if (this.player.health < 35) {
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(faceX - 4, faceY + 6, 8, 2);
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(faceX - 4, faceY + 6, 8, 1);
    }

    // 4. ARMOR
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("ARMOR", sW * 3.5, barY + 11);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px monospace";
    ctx.fillText(`${this.player.armor}%`, sW * 3.5, barY + 28);

    // 5. KEYS
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("KEYS", sW * 4.5, barY + 11);
    const keyY = barY + 22;
    ctx.fillStyle = this.player.keys.blue ? "#3b82f6" : "#334155";
    ctx.fillRect(sW * 4.5 - 16, keyY, 8, 8);
    ctx.fillStyle = this.player.keys.yellow ? "#eab308" : "#334155";
    ctx.fillRect(sW * 4.5 - 4, keyY, 8, 8);
    ctx.fillStyle = this.player.keys.red ? "#ef4444" : "#334155";
    ctx.fillRect(sW * 4.5 + 8, keyY, 8, 8);
  }

  public getMapList(): string[] {
    if (!this.wad) return [];
    const names = new Set<string>();
    for (let i = 0; i < this.wad.directory.length - 1; i++) {
      const l = this.wad.directory[i];
      const nx = this.wad.directory[i + 1]?.name;
      if (/^E\dM\d$/.test(l.name) || /^MAP\d\d$/.test(l.name) || nx === "THINGS" || nx === "TEXTMAP") {
        names.add(l.name);
      }
    }
    return Array.from(names).sort();
  }
}

export const doomWadEngineSingleton = new DoomWadEngine();

/* ================= DOOM WAD EXPORTER & CONVERTER ================= */

/**
 * Serializes Mode 8 level geometry into a genuine standard Doom binary PWAD ArrayBuffer.
 */
export function exportMode8ToWad(
  sectors: DivDoomSector[],
  linedefs: DivDoomLinedef[],
  entities: any[] = [],
  mapName = "MAP01"
): ArrayBuffer {
  const vertList: { x: number; y: number }[] = [];
  const vertMap = new Map<string, number>();

  const getVertIdx = (rawX: number, rawY: number) => {
    const x = Math.round(Math.abs(rawX) < 100 ? rawX * 64 : rawX);
    const y = Math.round(Math.abs(rawY) < 100 ? rawY * 64 : rawY);
    const k = `${x}_${y}`;
    if (vertMap.has(k)) return vertMap.get(k)!;
    const idx = vertList.length;
    vertList.push({ x, y });
    vertMap.set(k, idx);
    return idx;
  };

  const sectorList = sectors.map((s, idx) => {
    const fh = Math.round(Math.abs(s.floorHeight) < 20 ? s.floorHeight * 64 : s.floorHeight);
    const ch = Math.round(Math.abs(s.ceilHeight) < 20 ? s.ceilHeight * 64 : s.ceilHeight);
    return {
      floorHeight: fh,
      ceilingHeight: ch,
      floorTexture: String(s.floorTexture || "FLOOR4_8").toUpperCase().slice(0, 8),
      ceilingTexture: String(s.ceilTexture || "CEIL3_5").toUpperCase().slice(0, 8),
      lightLevel: s.lightLevel || 192,
      special: s.special || 0,
      tag: s.id || idx,
    };
  });

  const sidedefList: any[] = [];
  const linedefRecords: any[] = [];

  const sectorIndexMap = new Map<number, number>();
  sectors.forEach((s, idx) => sectorIndexMap.set(s.id, idx));

  for (const l of linedefs) {
    const v1 = getVertIdx(l.x1, l.y1);
    const v2 = getVertIdx(l.x2, l.y2);

    const fSecIdx = sectorIndexMap.get(l.frontSectorId) ?? 0;
    const s1Idx = sidedefList.length;
    sidedefList.push({
      xOffset: 0,
      yOffset: 0,
      upperTexture: String(l.upperTexture || "-").toUpperCase().slice(0, 8),
      lowerTexture: String(l.lowerTexture || "-").toUpperCase().slice(0, 8),
      middleTexture: String(l.middleTexture || (l.isTwoSided ? "-" : "STARTAN3")).toUpperCase().slice(0, 8),
      sector: fSecIdx,
    });

    let s2Idx = 0xffff;
    if (l.isTwoSided && l.backSectorId !== undefined && sectorIndexMap.has(l.backSectorId)) {
      s2Idx = sidedefList.length;
      const bSecIdx = sectorIndexMap.get(l.backSectorId)!;
      sidedefList.push({
        xOffset: 0,
        yOffset: 0,
        upperTexture: String(l.upperTexture || "-").toUpperCase().slice(0, 8),
        lowerTexture: String(l.lowerTexture || "-").toUpperCase().slice(0, 8),
        middleTexture: String(l.middleTexture || "-").toUpperCase().slice(0, 8),
        sector: bSecIdx,
      });
    }

    const flags = (l.blocking ? 1 : 0) | (l.isTwoSided ? 4 : 0);
    linedefRecords.push({
      v1,
      v2,
      flags,
      special: l.special || 0,
      tag: l.tag || 0,
      sideFront: s1Idx,
      sideBack: s2Idx,
    });
  }

  const thingRecords = entities.map((ent) => {
    const x = Math.round(ent.x >= 64 ? ent.x : ent.x * 64);
    const y = Math.round(ent.y >= 64 ? ent.y : ent.y * 64);
    let type = 1;
    if (ent.type === "player") type = 1;
    else if (ent.type === "monster") type = 3001;
    else if (ent.type === "barrel") type = 2035;
    else if (ent.type === "treasure") type = 2001;
    else if (ent.type === "pickup") type = 2012;
    else if (ent.type === "light") type = 44;
    return { x, y, angle: 0, type, flags: 7 };
  });

  if (!thingRecords.some((t) => t.type === 1)) {
    const vx = vertList.length > 0 ? vertList[0].x + 64 : 128;
    const vy = vertList.length > 0 ? vertList[0].y + 64 : 128;
    thingRecords.unshift({ x: vx, y: vy, angle: 0, type: 1, flags: 7 });
  }

  const pad8 = (s: string) => {
    const buf = new Uint8Array(8);
    for (let i = 0; i < 8 && i < s.length; i++) buf[i] = s.charCodeAt(i);
    return buf;
  };

  const thingsBuf = new Uint8Array(thingRecords.length * 10);
  const thingsView = new DataView(thingsBuf.buffer);
  thingRecords.forEach((t, i) => {
    const o = i * 10;
    thingsView.setInt16(o, t.x, true);
    thingsView.setInt16(o + 2, t.y, true);
    thingsView.setInt16(o + 4, t.angle, true);
    thingsView.setInt16(o + 6, t.type, true);
    thingsView.setInt16(o + 8, t.flags, true);
  });

  const linedefsBuf = new Uint8Array(linedefRecords.length * 14);
  const linedefsView = new DataView(linedefsBuf.buffer);
  linedefRecords.forEach((l, i) => {
    const o = i * 14;
    linedefsView.setUint16(o, l.v1, true);
    linedefsView.setUint16(o + 2, l.v2, true);
    linedefsView.setUint16(o + 4, l.flags, true);
    linedefsView.setUint16(o + 6, l.special, true);
    linedefsView.setUint16(o + 8, l.tag, true);
    linedefsView.setUint16(o + 10, l.sideFront, true);
    linedefsView.setUint16(o + 12, l.sideBack, true);
  });

  const sidedefsBuf = new Uint8Array(sidedefList.length * 30);
  const sidedefsView = new DataView(sidedefsBuf.buffer);
  sidedefList.forEach((s, i) => {
    const o = i * 30;
    sidedefsView.setInt16(o, s.xOffset, true);
    sidedefsView.setInt16(o + 2, s.yOffset, true);
    sidedefsBuf.set(pad8(s.upperTexture), o + 4);
    sidedefsBuf.set(pad8(s.lowerTexture), o + 12);
    sidedefsBuf.set(pad8(s.middleTexture), o + 20);
    sidedefsView.setUint16(o + 28, s.sector, true);
  });

  const vertexesBuf = new Uint8Array(vertList.length * 4);
  const vertexesView = new DataView(vertexesBuf.buffer);
  vertList.forEach((v, i) => {
    const o = i * 4;
    vertexesView.setInt16(o, v.x, true);
    vertexesView.setInt16(o + 2, v.y, true);
  });

  const sectorsBuf = new Uint8Array(sectorList.length * 26);
  const sectorsView = new DataView(sectorsBuf.buffer);
  sectorList.forEach((s, i) => {
    const o = i * 26;
    sectorsView.setInt16(o, s.floorHeight, true);
    sectorsView.setInt16(o + 2, s.ceilingHeight, true);
    sectorsBuf.set(pad8(s.floorTexture), o + 4);
    sectorsBuf.set(pad8(s.ceilingTexture), o + 12);
    sectorsView.setInt16(o + 20, s.lightLevel, true);
    sectorsView.setInt16(o + 22, s.special, true);
    sectorsView.setInt16(o + 24, s.tag, true);
  });

  const lumps: { name: string; data: Uint8Array }[] = [
    { name: mapName.toUpperCase().slice(0, 8), data: new Uint8Array(0) },
    { name: "THINGS", data: thingsBuf },
    { name: "LINEDEFS", data: linedefsBuf },
    { name: "SIDEDEFS", data: sidedefsBuf },
    { name: "VERTEXES", data: vertexesBuf },
    { name: "SECTORS", data: sectorsBuf },
    { name: "ENDMAP", data: new Uint8Array(0) },
  ];

  const headerSize = 12;
  let currentPos = headerSize;
  const directoryEntries: { name: string; pos: number; size: number }[] = [];

  for (const l of lumps) {
    directoryEntries.push({ name: l.name, pos: currentPos, size: l.data.length });
    currentPos += l.data.length;
  }

  const dirOffset = currentPos;
  const dirSize = directoryEntries.length * 16;
  const totalFileSize = dirOffset + dirSize;

  const wadBuffer = new Uint8Array(totalFileSize);
  const wadView = new DataView(wadBuffer.buffer);

  wadBuffer.set([0x50, 0x57, 0x41, 0x44], 0); // "PWAD"
  wadView.setInt32(4, directoryEntries.length, true);
  wadView.setInt32(8, dirOffset, true);

  for (const entry of directoryEntries) {
    const l = lumps.find((x) => x.name === entry.name);
    if (l && l.data.length > 0) {
      wadBuffer.set(l.data, entry.pos);
    }
  }

  directoryEntries.forEach((entry, i) => {
    const o = dirOffset + i * 16;
    wadView.setInt32(o, entry.pos, true);
    wadView.setInt32(o + 4, entry.size, true);
    wadBuffer.set(pad8(entry.name), o + 8);
  });

  return wadBuffer.buffer;
}

/**
 * Converts parsed Doom WAD map data into Mode 8 editor compatible structure.
 */
export function convertWadMapToMode8(mapData: any): {
  sectors: DivDoomSector[];
  linedefs: DivDoomLinedef[];
  entities: DivMode8Entity[];
} {
  if (!mapData || !mapData.sectors || !mapData.linedefs) {
    return { sectors: [], linedefs: [], entities: [] };
  }

  const sectors: DivDoomSector[] = mapData.sectors.map((s: any, idx: number) => ({
    id: s.id ?? idx,
    floorHeight: Math.round((s.floorHeight / 64) * 100) / 100,
    ceilHeight: Math.round((s.ceilingHeight / 64) * 100) / 100,
    floorTexture: s.floorTexture || "FLOOR4_8",
    ceilTexture: s.ceilingTexture || "CEIL3_5",
    lightLevel: s.lightLevel || 190,
    special: s.type || 0,
  }));

  const linedefs: DivDoomLinedef[] = mapData.linedefs.map((l: any, idx: number) => {
    const frontSec = l.frontSector ? l.frontSector.id : 0;
    const backSec = l.backSector ? l.backSector.id : undefined;
    const isTwoSided = !!l.backSector;
    const midTex = l.sideFront?.middleTexture || "-";
    const upTex = l.sideFront?.upperTexture || "-";
    const lowTex = l.sideFront?.lowerTexture || "-";

    return {
      id: `w_${idx}`,
      x1: Math.round((l.v1.x / 64) * 10) / 10,
      y1: Math.round((l.v1.y / 64) * 10) / 10,
      x2: Math.round((l.v2.x / 64) * 10) / 10,
      y2: Math.round((l.v2.y / 64) * 10) / 10,
      frontSectorId: frontSec,
      backSectorId: backSec,
      isTwoSided,
      middleTexture: midTex !== "-" ? midTex : undefined,
      upperTexture: upTex !== "-" ? upTex : undefined,
      lowerTexture: lowTex !== "-" ? lowTex : undefined,
      blocking: Boolean(l.flags & 1),
    };
  });

  const entities: DivMode8Entity[] = (mapData.things || []).map((t: any, idx: number) => {
    let type: "player" | "monster" | "pickup" | "barrel" | "treasure" = "pickup";
    let name = "Item WAD";
    let graph = 30;

    if (t.type === 1) {
      type = "player";
      name = "Marine Start";
      graph = 1;
    } else if ([3001, 3004, 9, 3002, 58, 3006, 3005, 3003, 16].includes(t.type)) {
      type = "monster";
      name = t.type === 3001 ? "Imp Demon" : t.type === 3002 ? "Demon Pinky" : "Monstruo";
      graph = 27;
    } else if (t.type === 2035) {
      type = "barrel";
      name = "Barril Tóxico";
      graph = 28;
    } else if ([2001, 82, 2002, 2003, 2004, 2006, 2005].includes(t.type)) {
      type = "treasure";
      name = t.type === 2001 ? "Escopeta" : "Arma";
      graph = 29;
    }

    return {
      id: `ent_${idx}`,
      type,
      x: t.x,
      y: t.y,
      graph,
      name,
    };
  });

  return { sectors, linedefs, entities };
}

/**
 * Generates an authentic default Doom PWAD in memory for E1M1: Hangar WXDIV.
 */
export function createDefaultDoomWadBuffer(): ArrayBuffer {
  const sectors: DivDoomSector[] = [
    { id: 0, floorHeight: 0, ceilHeight: 1.4, floorTexture: "FLOOR4_8", ceilTexture: "CEIL3_5", lightLevel: 190 },
    { id: 1, floorHeight: 0.2, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 195 },
    { id: 2, floorHeight: 0.4, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 200 },
    { id: 3, floorHeight: 0.6, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 205 },
    { id: 4, floorHeight: 0.8, ceilHeight: 1.4, floorTexture: "STEP", ceilTexture: "CEIL3_5", lightLevel: 210 },
    { id: 10, floorHeight: 1.0, ceilHeight: 1.8, floorTexture: "CRATOP2", ceilTexture: "TLITE6_5", lightLevel: 220 },
    { id: 20, floorHeight: -0.4, ceilHeight: 1.4, floorTexture: "NUKAGE", ceilTexture: "CEIL3_5", lightLevel: 240, special: 7 },
  ];

  const linedefs: DivDoomLinedef[] = [
    { id: "w1", x1: 2, y1: 2, x2: 12, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "w2", x1: 12, y1: 2, x2: 12, y2: 6, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "s1", x1: 12, y1: 6, x2: 12, y2: 8, frontSectorId: 0, backSectorId: 1, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "s2", x1: 13, y1: 6, x2: 13, y2: 8, frontSectorId: 1, backSectorId: 2, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "s3", x1: 14, y1: 6, x2: 14, y2: 8, frontSectorId: 2, backSectorId: 3, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "s4", x1: 15, y1: 6, x2: 15, y2: 8, frontSectorId: 3, backSectorId: 4, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "s5", x1: 16, y1: 6, x2: 16, y2: 8, frontSectorId: 4, backSectorId: 10, isTwoSided: true, lowerTexture: "STEP1", blocking: false },
    { id: "sw_top", x1: 12, y1: 6, x2: 16, y2: 6, frontSectorId: 0, isTwoSided: false, middleTexture: "BROWN144", blocking: true },
    { id: "sw_bot", x1: 12, y1: 8, x2: 16, y2: 8, frontSectorId: 0, isTwoSided: false, middleTexture: "BROWN144", blocking: true },
    { id: "d1", x1: 16, y1: 4, x2: 20, y2: 4, frontSectorId: 10, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "d2", x1: 20, y1: 4, x2: 20, y2: 10, frontSectorId: 10, isTwoSided: false, middleTexture: "COMP2", blocking: true },
    { id: "d3", x1: 20, y1: 10, x2: 16, y2: 10, frontSectorId: 10, isTwoSided: false, middleTexture: "TEKGREN2", blocking: true },
    { id: "d4", x1: 16, y1: 10, x2: 16, y2: 8, frontSectorId: 10, isTwoSided: false, middleTexture: "SHAWN2", blocking: true },
    { id: "d5", x1: 16, y1: 6, x2: 16, y2: 4, frontSectorId: 10, isTwoSided: false, middleTexture: "SHAWN2", blocking: true },
    { id: "w3", x1: 12, y1: 8, x2: 12, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "STARTAN3", blocking: true },
    { id: "w4", x1: 12, y1: 14, x2: 2, y2: 14, frontSectorId: 0, isTwoSided: false, middleTexture: "BROWN144", blocking: true },
    { id: "np1", x1: 5, y1: 10, x2: 9, y2: 10, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "np2", x1: 9, y1: 10, x2: 9, y2: 12, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "np3", x1: 9, y1: 12, x2: 5, y2: 12, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "np4", x1: 5, y1: 12, x2: 5, y2: 10, frontSectorId: 0, backSectorId: 20, isTwoSided: true, lowerTexture: "STEP2", blocking: false },
    { id: "w5", x1: 2, y1: 14, x2: 2, y2: 2, frontSectorId: 0, isTwoSided: false, middleTexture: "BRICK1", blocking: true },
  ];

  const entities = [
    { type: "player", x: 4.5 * 64, y: 5.5 * 64, name: "Player 1 Start" },
    { type: "treasure", x: 6.0 * 64, y: 7.0 * 64, name: "Shotgun" },
    { type: "monster", x: 18.0 * 64, y: 7.0 * 64, name: "Imp Demon" },
    { type: "monster", x: 8.0 * 64, y: 4.0 * 64, name: "Imp Demon" },
    { type: "barrel", x: 3.5 * 64, y: 3.5 * 64, name: "Toxic Barrel" },
    { type: "pickup", x: 3.0 * 64, y: 6.0 * 64, name: "Medikit" },
  ];

  return exportMode8ToWad(sectors, linedefs, entities, "E1M1");
}
