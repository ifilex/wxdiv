import { DivGraphic } from "../types";
import { DivRuntime } from "./runtime";
import { setupRuntimeFromDivCode } from "./divCodeRunner";
import { PRESETS } from "./presets";
import { DEFAULT_PALETTE, DEFAULT_SPRITES } from "./graphics";
import { validateMode8LevelTextures } from "./mode8TextureRegistry";

export interface SerializedSpritePayload {
  id: number;
  name: string;
  width: number;
  height: number;
  cx?: number;
  cy?: number;
  pixels?: number[][];
  palette?: string[];
  dataUrl?: string;
}

export interface StandaloneBootPayload {
  title: string;
  code: string;
  resolution: string;
  presetId?: string;
  sprites?: SerializedSpritePayload[];
  textureValidation?: {
    manifestChecksum: string;
    totalReferenced: number;
    unknownNames: string[];
    isValid: boolean;
  };
}

function isMode8DivCode(src: string): boolean {
  const lower = (src || "").toLowerCase();
  return (
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
    lower.includes("mundo 3d modo 8")
  );
}

function hydrateSprites(overrides?: SerializedSpritePayload[]): DivGraphic[] {
  const defaultPaletteCss = DEFAULT_PALETTE.map(([r, g, b]) => `rgb(${r},${g},${b})`);
  const byId = new Map<number, DivGraphic>();
  for (const s of DEFAULT_SPRITES) {
    byId.set(s.id, s);
  }
  if (Array.isArray(overrides)) {
    for (const raw of overrides) {
      if (!raw || typeof raw.id !== "number") continue;
      const graphic: DivGraphic = {
        id: raw.id,
        name: raw.name || `sprite_${raw.id}`,
        width: raw.width || 32,
        height: raw.height || 32,
        cx: raw.cx ?? Math.floor((raw.width || 32) / 2),
        cy: raw.cy ?? Math.floor((raw.height || 32) / 2),
        cpoints: [],
        pixels: Array.isArray(raw.pixels) ? raw.pixels : [],
        palette: Array.isArray(raw.palette) && raw.palette.length > 0 ? raw.palette : defaultPaletteCss,
        dataUrl: raw.dataUrl,
      };
      if (raw.dataUrl && typeof Image !== "undefined" && typeof document !== "undefined") {
        const img = new Image();
        img.onload = () => {
          const off = document.createElement("canvas");
          off.width = graphic.width || img.width || 32;
          off.height = graphic.height || img.height || 32;
          const octx = off.getContext("2d");
          if (octx) {
            octx.drawImage(img, 0, 0, off.width, off.height);
            graphic.canvas = off;
          }
        };
        img.src = raw.dataUrl;
      }
      byId.set(graphic.id, graphic);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

function bindTouchButton(
  id: string,
  runtime: DivRuntime,
  keys: string[],
  alsoMouseLeft: boolean = false
) {
  const el = document.getElementById(id);
  if (!el) return;
  const press = (e: Event) => {
    e.preventDefault();
    for (const k of keys) runtime.keyState[k] = true;
    if (alsoMouseLeft) runtime.mouseState.left = true;
  };
  const release = (e: Event) => {
    e.preventDefault();
    for (const k of keys) runtime.keyState[k] = false;
    if (alsoMouseLeft) runtime.mouseState.left = false;
  };
  el.addEventListener("pointerdown", press);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("pointerleave", release);
}

function bootStandaloneRuntime(payload: StandaloneBootPayload) {
  const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  const runtime = new DivRuntime();
  const mergedSprites = hydrateSprites(payload.sprites);

  const res = payload.resolution || "640x480";
  const [rw, rh] = res.split("x").map((n) => parseInt(n, 10));
  if (rw > 0 && rh > 0) {
    runtime.width = rw;
    runtime.height = rh;
    canvas.width = rw;
    canvas.height = rh;
  }

  runtime.setCanvas(canvas);
  runtime.loadFPG(mergedSprites);

  const code = payload.code || "";
  const title = payload.title || "Mi Juego WXDIV";
  const matchingPreset = payload.presetId
    ? PRESETS.find((p) => p.id === payload.presetId)
    : undefined;

  if (matchingPreset && !isMode8DivCode(code) && code.trim() === matchingPreset.code.trim()) {
    matchingPreset.setupRuntime(runtime);
  } else {
    setupRuntimeFromDivCode(runtime, code, title);
  }

  // Re-apply canvas & sprites in case preset setup modified dimensions
  runtime.setCanvas(canvas);
  runtime.loadFPG(mergedSprites);
  canvas.width = runtime.width || 640;
  canvas.height = runtime.height || 480;

  // Validate Mode 8 texture parity between compiler manifest & booted runtime
  if (runtime.m8[0]?.active) {
    const m8 = runtime.m8[0];
    const runtimeReport = validateMode8LevelTextures(
      m8.doomSectors || [],
      m8.doomLinedefs || [],
      m8.skyTexture
    );
    const expectedHash = payload.textureValidation?.manifestChecksum;
    const parityMatch = !expectedHash || expectedHash === runtimeReport.manifestChecksum;
    (window as any).__WXDIV_TEXTURE_PARITY__ = {
      ...runtimeReport,
      expectedChecksum: expectedHash,
      parityMatch,
    };
  }

  // Keyboard bindings (exact parity with GameStage.tsx)
  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      return;
    }

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(e.code) || e.key === "Tab") {
      e.preventDefault();
    }

    if (e.key === "Tab" || e.code === "Tab") {
      runtime.toggleMode8Automap();
      return;
    }

    runtime.keyState[e.key.toLowerCase()] = true;
    runtime.keyState[e.code.toLowerCase()] = true;

    if (e.key === "ArrowUp" || e.code === "ArrowUp") runtime.keyState["up"] = true;
    if (e.code === "KeyW") runtime.keyState["w"] = true;
    if (e.key === "ArrowDown" || e.code === "ArrowDown") runtime.keyState["down"] = true;
    if (e.code === "KeyS") runtime.keyState["s"] = true;
    if (e.key === "ArrowLeft" || e.code === "ArrowLeft") runtime.keyState["left"] = true;
    if (e.code === "KeyA") runtime.keyState["a"] = true;
    if (e.key === "ArrowRight" || e.code === "ArrowRight") runtime.keyState["right"] = true;
    if (e.code === "KeyD") runtime.keyState["d"] = true;
    if (e.code === "Space" || e.key === " ") runtime.keyState["space"] = true;
    if (e.key === "Enter") runtime.keyState["enter"] = true;
    if (e.key === "Escape") runtime.keyState["esc"] = true;
    if (e.code === "KeyE" || e.key.toLowerCase() === "e") runtime.keyState["e"] = true;
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    runtime.keyState[e.key.toLowerCase()] = false;
    runtime.keyState[e.code.toLowerCase()] = false;

    if (e.key === "ArrowUp" || e.code === "ArrowUp") runtime.keyState["up"] = false;
    if (e.code === "KeyW") runtime.keyState["w"] = false;
    if (e.key === "ArrowDown" || e.code === "ArrowDown") runtime.keyState["down"] = false;
    if (e.code === "KeyS") runtime.keyState["s"] = false;
    if (e.key === "ArrowLeft" || e.code === "ArrowLeft") runtime.keyState["left"] = false;
    if (e.code === "KeyA") runtime.keyState["a"] = false;
    if (e.key === "ArrowRight" || e.code === "ArrowRight") runtime.keyState["right"] = false;
    if (e.code === "KeyD") runtime.keyState["d"] = false;
    if (e.code === "Space" || e.key === " ") runtime.keyState["space"] = false;
    if (e.key === "Enter") runtime.keyState["enter"] = false;
    if (e.key === "Escape") runtime.keyState["esc"] = false;
    if (e.code === "KeyE" || e.key.toLowerCase() === "e") runtime.keyState["e"] = false;
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  // Mouse & Right-Drag Camera Look (exact parity with GameStage.tsx)
  const dragLook = { active: false, lastX: 0, lastY: 0 };
  const updateCanvasMouseCoords = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const mx = Math.floor(((clientX - rect.left) / rect.width) * runtime.width);
    const my = Math.floor(((clientY - rect.top) / rect.height) * runtime.height);
    runtime.mouseState.x = mx;
    runtime.mouseState.y = my;
  };

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("mousedown", (e) => {
    canvas.focus({ preventScroll: true });
    updateCanvasMouseCoords(e.clientX, e.clientY);
    if (e.button === 0) {
      runtime.mouseState.left = true;
      runtime.appUiEngine?.handleMouseDown(runtime.mouseState.x, runtime.mouseState.y);
    }
    if (e.button === 2) {
      runtime.mouseState.right = true;
      if (runtime.m8[0]?.active) {
        dragLook.active = true;
        dragLook.lastX = e.clientX;
        dragLook.lastY = e.clientY;
      }
    }
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      runtime.mouseState.left = false;
      runtime.appUiEngine?.handleMouseUp(runtime.mouseState.x, runtime.mouseState.y);
    }
    if (e.button === 2) {
      runtime.mouseState.right = false;
      dragLook.active = false;
    }
  });
  canvas.addEventListener("mouseleave", () => {
    dragLook.active = false;
  });
  canvas.addEventListener("mousemove", (e) => {
    updateCanvasMouseCoords(e.clientX, e.clientY);
    if (dragLook.active && runtime.m8[0]?.active) {
      const dx = e.clientX - dragLook.lastX;
      const dy = e.clientY - dragLook.lastY;
      dragLook.lastX = e.clientX;
      dragLook.lastY = e.clientY;
      const m8 = runtime.m8[0];
      const camId = m8.camera || runtime.camara_id || 1;
      const camProc = runtime.processes.get(camId);
      if (camProc) {
        camProc.angle = ((camProc.angle || 0) + dx * 0.35 + 360) % 360;
      }
      m8.angle = ((m8.angle || 0) + dx * 0.35 + 360) % 360;
      m8.pitch = Math.max(-45, Math.min(45, (m8.pitch || 0) - dy * 0.25));
    }
    runtime.appUiEngine?.handleMouseMove(runtime.mouseState.x, runtime.mouseState.y);
  });

  // Canvas touch look & tap
  let touchLookId: number | null = null;
  let touchLastX = 0;
  let touchLastY = 0;
  canvas.addEventListener(
    "touchstart",
    (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      updateCanvasMouseCoords(touch.clientX, touch.clientY);
      if (runtime.m8[0]?.active) {
        touchLookId = touch.identifier;
        touchLastX = touch.clientX;
        touchLastY = touch.clientY;
      } else {
        runtime.mouseState.left = true;
        runtime.appUiEngine?.handleMouseDown(runtime.mouseState.x, runtime.mouseState.y);
      }
    },
    { passive: true }
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (touchLookId === null || !runtime.m8[0]?.active) return;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === touchLookId) {
          const dx = t.clientX - touchLastX;
          const dy = t.clientY - touchLastY;
          touchLastX = t.clientX;
          touchLastY = t.clientY;
          const m8 = runtime.m8[0];
          const camId = m8.camera || runtime.camara_id || 1;
          const camProc = runtime.processes.get(camId);
          if (camProc) {
            camProc.angle = ((camProc.angle || 0) + dx * 0.38 + 360) % 360;
          }
          m8.angle = ((m8.angle || 0) + dx * 0.38 + 360) % 360;
          m8.pitch = Math.max(-45, Math.min(45, (m8.pitch || 0) - dy * 0.28));
          break;
        }
      }
    },
    { passive: true }
  );
  canvas.addEventListener(
    "touchend",
    () => {
      touchLookId = null;
      if (!runtime.m8[0]?.active) {
        runtime.mouseState.left = false;
        runtime.appUiEngine?.handleMouseUp(runtime.mouseState.x, runtime.mouseState.y);
      }
    },
    { passive: true }
  );

  // Mobile Virtual D-Pad + Action Buttons
  bindTouchButton("touchUp", runtime, ["up", "w"]);
  bindTouchButton("touchDown", runtime, ["down", "s"]);
  bindTouchButton("touchLeft", runtime, ["left"]);
  bindTouchButton("touchRight", runtime, ["right"]);
  bindTouchButton("touchA", runtime, ["space", "enter"]);
  bindTouchButton("touchB", runtime, ["f", "e"], true);
  bindTouchButton("touchCam", runtime, ["c"]);

  if (!runtime.isHtml5Mode) {
    runtime.start();
  }
}

(window as any).__WXDIV_BOOT_STANDALONE__ = bootStandaloneRuntime;
