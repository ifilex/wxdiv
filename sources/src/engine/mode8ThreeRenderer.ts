import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  DivDoomLinedef,
  DivDoomSector,
  DivMode8Entity,
  DivMode8Light,
  DivMode8PlacedModel,
  DivMode8PlacedVoxel,
  Mode8CameraMode,
} from "../types";
import {
  buildTracedSectors,
  findSectorAtPoint,
  inferPlacedModelStats,
  triangulateTracedSector,
} from "./mode8Geometry";
import {
  isSkyTextureName,
  paintMode8TextureToCanvas,
  resolveCanonicalTextureName,
} from "./mode8TextureRegistry";
import {
  CustomModel3DAsset,
  getCustomModel3D,
  getCustomModelSkinCanvas,
  onCustomTextureInvalidated,
  subscribeAssetLibrary,
} from "./assetLibrary";

export interface ThreeCameraInput {
  x: number;
  y: number;
  z: number;
  angle: number;
  pitch: number;
}

export interface Mode8ThreeEditorOverlay {
  enabled?: boolean;
  hoverCellX?: number;
  hoverCellY?: number;
  hoverBaseZ?: number;
  blockSize?: number;
  blockHeight?: number;
  hoverColor?: string;
  showCursorBox?: boolean;
  selectedSectorId?: number | null;
  selectedLineId?: string | null;
}

export interface Mode8ThreePickHit {
  kind: "floor" | "ceil" | "wall" | "model" | "voxel" | "ground";
  worldX: number;
  worldY: number;
  worldZ: number;
  sectorId?: number;
  linedefId?: string;
  wallSlot?: "middle" | "lower" | "upper";
  itemId?: string;
  itemIndex?: number;
}

export interface ThreeRenderOptions {
  skyTexture?: string;
  cameraMode?: Mode8CameraMode;
  playerModelId?: string;
  weaponModel?: string;
  weaponAttackTime?: number;
  walkCycle?: number;
  doorOffsets?: Map<number, number>;
  lights?: DivMode8Light[];
  entities?: DivMode8Entity[];
  placedModels?: DivMode8PlacedModel[];
  placedVoxels?: DivMode8PlacedVoxel[];
  editorOverlay?: Mode8ThreeEditorOverlay;
  onEnemyScreenBars?: Array<{
    sx: number;
    sy: number;
    name: string;
    hp: number;
    maxHp: number;
    dist: number;
  }>;
}

interface TextureDef {
  tex: THREE.CanvasTexture;
  bump?: THREE.CanvasTexture;
  roughness: number;
  metalness: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  animatedScroll?: boolean;
  isSky?: boolean;
  isHazard?: boolean;
}

interface DynamicRig {
  group: THREE.Group;
  leftLeg?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
  leftArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  head?: THREE.Object3D;
  spinner?: THREE.Object3D;
  flashMeshes: THREE.Mesh[];
  baseEmissives: number[];
  updateMd2Frame?: (animName: string, timeSec: number) => void;
}

interface LevelBuildCache {
  signature: string;
  group: THREE.Group;
  doorCeilMeshes: Map<number, { mesh: THREE.Object3D; baseFloor: number; baseCeil: number }[]>;
}

export function isSkyFlatName(name?: string | number): boolean {
  return isSkyTextureName(name);
}

class Mode8ThreeEngine {
  private renderer: THREE.WebGLRenderer | null = null;
  private glCanvas: HTMLCanvasElement | null = null;
  private isSoftwareGl = false;
  private webglFailed = false;
  private envRT: THREE.WebGLRenderTarget | null = null;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private skyMesh: THREE.Mesh | null = null;
  private currentSkyName = "";
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private levelGroup: THREE.Group;
  private dynamicGroup: THREE.Group;
  private editorOverlayGroup: THREE.Group;
  private pointLightPool: THREE.PointLight[] = [];
  private fpsWeaponGroup: THREE.Group;
  private currentWeaponType = "";
  private raycaster = new THREE.Raycaster();

  private textureCache = new Map<string, TextureDef>();
  private materialCache = new Map<string, THREE.MeshStandardMaterial>();
  private studBumpTex: THREE.CanvasTexture | null = null;
  private skyTexCache = new Map<string, THREE.CanvasTexture>();
  private levelCache: LevelBuildCache | null = null;
  private rigPool = new Map<string, { rig: DynamicRig; modelId: string }>();

  // Scratch vectors to avoid per-frame allocations
  private vTarget = new THREE.Vector3();
  private vCamPos = new THREE.Vector3();
  private vProj = new THREE.Vector3();

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 4 / 3, 0.15, 180);

    this.hemiLight = new THREE.HemisphereLight(0xdff3ff, 0x4b5563, 0.9);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7e6, 1.55);
    this.sunLight.position.set(18, 32, 14);
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.levelGroup = new THREE.Group();
    this.dynamicGroup = new THREE.Group();
    this.editorOverlayGroup = new THREE.Group();
    this.scene.add(this.levelGroup);
    this.scene.add(this.dynamicGroup);
    this.scene.add(this.editorOverlayGroup);

    for (let i = 0; i < 6; i++) {
      const pl = new THREE.PointLight(0xffffff, 0, 8, 1.6);
      pl.visible = false;
      this.scene.add(pl);
      this.pointLightPool.push(pl);
    }

    this.fpsWeaponGroup = new THREE.Group();
    this.camera.add(this.fpsWeaponGroup);
    this.scene.add(this.camera);

    onCustomTextureInvalidated((texName) => {
      this.invalidateTexture(texName);
    });

    subscribeAssetLibrary(() => {
      for (const [k, entry] of Array.from(this.rigPool.entries())) {
        if (getCustomModel3D(entry.modelId)) {
          this.dynamicGroup.remove(entry.rig.group);
          this.disposeGroupResources(entry.rig.group);
          this.rigPool.delete(k);
        }
      }
    });
  }

  public invalidateTexture(texName: string) {
    const key = String(texName || "").toUpperCase();
    const cached = this.textureCache.get(key);
    if (cached) {
      cached.tex.dispose();
      this.textureCache.delete(key);
    }
    for (const [matKey, mat] of this.materialCache.entries()) {
      if (matKey.startsWith(`${key}_`)) {
        mat.dispose();
        this.materialCache.delete(matKey);
      }
    }
    this.levelCache = null;
  }

  private ensureRenderer(width: number, height: number): boolean {
    if (this.webglFailed) return false;
    if (!this.renderer) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(2, width);
        canvas.height = Math.max(2, height);
        const testCtx =
          canvas.getContext("webgl2", {
            antialias: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true,
          }) ||
          canvas.getContext("webgl", {
            antialias: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true,
          });
        if (!testCtx) {
          this.webglFailed = true;
          return false;
        }
        const dbg = testCtx.getExtension("WEBGL_debug_renderer_info");
        const rendererStr = dbg
          ? String(testCtx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "")
          : "";
        this.isSoftwareGl = /SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(rendererStr);

        this.glCanvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
          canvas,
          context: testCtx as WebGLRenderingContext,
          antialias: !this.isSoftwareGl,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.shadowMap.enabled = !this.isSoftwareGl;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        if (!this.isSoftwareGl) {
          this.sunLight.castShadow = true;
          this.sunLight.shadow.mapSize.set(1024, 1024);
          this.sunLight.shadow.camera.near = 1;
          this.sunLight.shadow.camera.far = 90;
          this.sunLight.shadow.camera.left = -24;
          this.sunLight.shadow.camera.right = 24;
          this.sunLight.shadow.camera.top = 24;
          this.sunLight.shadow.camera.bottom = -24;
          this.sunLight.shadow.bias = -0.0005;
          this.sunLight.shadow.normalBias = 0.025;
        }

        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
        this.scene.environment = this.envRT.texture;
        this.scene.environmentIntensity = 0.72;
        pmrem.dispose();
      } catch (err) {
        console.warn("[Mode8Three] WebGL init fallback to 2D rasterizer:", err);
        this.webglFailed = true;
        return false;
      }
    }

    const dpr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    const targetW = Math.max(2, Math.round(width));
    const targetH = Math.max(2, Math.round(height));
    if (
      this.glCanvas &&
      (this.glCanvas.width !== Math.round(targetW * dpr) ||
        this.glCanvas.height !== Math.round(targetH * dpr))
    ) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(targetW, targetH, false);
    }
    return true;
  }

  private getStudBumpTexture(): THREE.CanvasTexture {
    if (this.studBumpTex) return this.studBumpTex;
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#909090";
    ctx.fillRect(0, 0, size, size);
    const cells = 4;
    const step = size / cells;
    for (let gy = 0; gy < cells; gy++) {
      for (let gx = 0; gx < cells; gx++) {
        const cx = gx * step + step * 0.5;
        const cy = gy * step + step * 0.5;
        const r = step * 0.27;
        const grad = ctx.createRadialGradient(cx - 2, cy - 2, r * 0.1, cx, cy, r);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.78, "#dedede");
        grad.addColorStop(0.95, "#707070");
        grad.addColorStop(1, "#909090");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    this.studBumpTex = tex;
    return tex;
  }

  private getTextureDef(rawName: string | number | undefined): TextureDef {
    const resolved = resolveCanonicalTextureName(rawName, "STUD_FLOOR_BLUE");
    const key = resolved.canonical;
    const existing = this.textureCache.get(key);
    if (existing) return existing;

    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d")!;

    const meta = paintMode8TextureToCanvas(key, ctx, size, 0);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    if (this.renderer) {
      tex.anisotropy = this.isSoftwareGl ? 1 : Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    }
    tex.needsUpdate = true;

    const def: TextureDef = {
      tex,
      bump: meta.useStudBump ? this.getStudBumpTexture() : undefined,
      roughness: meta.roughness,
      metalness: meta.metalness,
      emissive: meta.emissiveHex,
      emissiveIntensity: meta.emissiveIntensity ?? 0,
      transparent: meta.transparent,
      opacity: meta.opacity ?? 1,
      animatedScroll: meta.animatedScroll,
      isHazard: meta.isHazard,
    };
    this.textureCache.set(key, def);
    return def;
  }

  private getMaterial(rawName: string | number | undefined, lightLevel = 220, isWall = false): THREE.MeshStandardMaterial {
    const resolved = resolveCanonicalTextureName(rawName, isWall ? "STUD_BLUE" : "STUD_FLOOR_BLUE");
    const key = `${resolved.canonical}_${Math.round(lightLevel / 32)}_${isWall ? "W" : "F"}`;
    const cached = this.materialCache.get(key);
    if (cached) return cached;

    const def = this.getTextureDef(resolved.canonical);
    const brightness = Math.max(0.58, Math.min(1.12, 0.52 + (lightLevel / 255) * 0.6));
    const mat = new THREE.MeshStandardMaterial({
      map: def.tex,
      bumpMap: def.bump || null,
      bumpScale: def.bump ? 0.025 : 0,
      color: new THREE.Color(brightness, brightness, brightness),
      roughness: def.roughness,
      metalness: def.metalness,
      emissive: def.emissive !== undefined ? new THREE.Color(def.emissive) : new THREE.Color(0x000000),
      emissiveIntensity: def.emissiveIntensity ?? 0,
      transparent: Boolean(def.transparent),
      opacity: def.opacity ?? 1,
      depthWrite: !def.transparent,
      polygonOffset: isWall,
      polygonOffsetFactor: isWall ? 1 : 0,
      polygonOffsetUnits: isWall ? 1 : 0,
      side: isWall ? THREE.DoubleSide : THREE.FrontSide,
    });
    this.materialCache.set(key, mat);
    return mat;
  }

  private getSkyTexture(skyName: string): THREE.CanvasTexture {
    const k = skyName.toUpperCase();
    const cached = this.skyTexCache.get(k);
    if (cached) return cached;

    const w = 1024;
    const h = 512;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (k.includes("CYBER")) {
      grad.addColorStop(0, "#05081a");
      grad.addColorStop(0.45, "#111b44");
      grad.addColorStop(0.58, "#0284c7");
      grad.addColorStop(0.75, "#0f172a");
      grad.addColorStop(1, "#020617");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Stars & glowing horizon moon
      ctx.fillStyle = "#e0f2fe";
      for (let i = 0; i < 110; i++) {
        const sx = (i * 193) % w;
        const sy = (i * 89) % (h * 0.45);
        ctx.fillRect(sx, sy, (i % 3) + 1, (i % 3) + 1);
      }
      ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, 68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, 44, 0, Math.PI * 2);
      ctx.fill();
    } else if (k === "SKY3") {
      // Sunset / Volcanic Roblox Arena
      grad.addColorStop(0, "#3b0764");
      grad.addColorStop(0.4, "#be123c");
      grad.addColorStop(0.56, "#fb923c");
      grad.addColorStop(0.75, "#451a03");
      grad.addColorStop(1, "#1c1917");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(w * 0.3, h * 0.48, 38, 0, Math.PI * 2);
      ctx.fill();
    } else if (k === "SKY2") {
      // Dramatic Medieval Dusk / Twilight Sky
      grad.addColorStop(0, "#1e1b4b");
      grad.addColorStop(0.38, "#6d28d9");
      grad.addColorStop(0.55, "#f97316");
      grad.addColorStop(0.74, "#fed7aa");
      grad.addColorStop(1, "#334155");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else {
      // Flagship SKY_ROBLOX / SKY1 bright sunny Roblox sky
      grad.addColorStop(0, "#1d6fe8");
      grad.addColorStop(0.35, "#38bdf8");
      grad.addColorStop(0.55, "#bae6fd");
      grad.addColorStop(0.7, "#e0f2fe");
      grad.addColorStop(1, "#93c5fd");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Sun disc
      ctx.fillStyle = "rgba(254, 240, 138, 0.35)";
      ctx.beginPath();
      ctx.arc(w * 0.25, h * 0.26, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fef9c3";
      ctx.beginPath();
      ctx.arc(w * 0.25, h * 0.26, 30, 0, Math.PI * 2);
      ctx.fill();

      // Stylized fluffy Roblox clouds
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      for (let i = 0; i < 14; i++) {
        const cx = ((i * 157 + 40) % (w - 80)) + 40;
        const cy = h * (0.2 + (i % 4) * 0.06);
        const rw = 44 + (i % 3) * 20;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, 16, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - rw * 0.4, cy - 8, rw * 0.55, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + rw * 0.35, cy - 6, rw * 0.5, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.skyTexCache.set(k, tex);
    return tex;
  }

  private updateSkyAndAtmosphere(skyName: string) {
    const k = String(skyName || "SKY_ROBLOX").toUpperCase();
    if (this.currentSkyName === k && this.skyMesh) return;
    this.currentSkyName = k;

    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      this.skyMesh.geometry.dispose();
      (this.skyMesh.material as THREE.Material).dispose();
    }

    const tex = this.getSkyTexture(k);
    const geo = new THREE.SphereGeometry(140, 28, 18);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false });
    this.skyMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.skyMesh);

    if (k.includes("CYBER")) {
      this.scene.fog = new THREE.FogExp2(0x0b1736, 0.018);
      this.hemiLight.color.setHex(0x67e8f9);
      this.hemiLight.groundColor.setHex(0x1e1b4b);
      this.hemiLight.intensity = 1.05;
      this.sunLight.color.setHex(0xa5f3fc);
      this.sunLight.intensity = 1.35;
    } else if (k === "SKY3") {
      this.scene.fog = new THREE.FogExp2(0x451a1d, 0.016);
      this.hemiLight.color.setHex(0xfda4af);
      this.hemiLight.groundColor.setHex(0x291515);
      this.hemiLight.intensity = 0.95;
      this.sunLight.color.setHex(0xfed7aa);
      this.sunLight.intensity = 1.45;
    } else {
      this.scene.fog = new THREE.FogExp2(0x9bd6f5, 0.011);
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0x64748b);
      this.hemiLight.intensity = 1.05;
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 1.65;
    }
  }

  private computeLevelSignature(linedefs: DivDoomLinedef[], sectors: DivDoomSector[]): string {
    const sPart = sectors
      .map(
        (s) =>
          `${s.id}:${s.floorHeight.toFixed(2)}:${s.ceilHeight.toFixed(2)}:${s.floorTexture || ""}:${s.ceilTexture || ""}:${s.lightLevel ?? 200}:${s.special || 0}`
      )
      .join("|");
    const lPart = linedefs
      .map(
        (l) =>
          `${l.id}:${l.x1.toFixed(2)},${l.y1.toFixed(2)}-${l.x2.toFixed(2)},${l.y2.toFixed(2)}:${l.frontSectorId}:${l.backSectorId ?? -1}:${l.isTwoSided ? 1 : 0}:${l.middleTexture || ""}:${l.lowerTexture || ""}:${l.upperTexture || ""}:${l.noDraw ? 1 : 0}`
      )
      .join("|");
    return `${sPart}#${lPart}`;
  }

  private disposeGroupResources(group: THREE.Group) {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        // Materials are shared in materialCache, except custom wall/slab materials
        if (obj.userData?.ownsMaterial && obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      }
    });
  }

  private rebuildLevelGeometry(
    linedefs: DivDoomLinedef[],
    sectors: DivDoomSector[],
    globalSky: string
  ) {
    const sig = this.computeLevelSignature(linedefs, sectors) + "#" + globalSky;
    if (this.levelCache && this.levelCache.signature === sig) return;

    if (this.levelCache) {
      this.levelGroup.remove(this.levelCache.group);
      this.disposeGroupResources(this.levelCache.group);
    }

    const group = new THREE.Group();
    const doorCeilMeshes = new Map<
      number,
      { mesh: THREE.Object3D; baseFloor: number; baseCeil: number }[]
    >();

    const sectorMap = new Map<number, DivDoomSector>();
    for (const s of sectors) sectorMap.set(s.id, s);
    if (!sectorMap.has(0)) {
      sectorMap.set(0, {
        id: 0,
        floorHeight: 0,
        ceilHeight: 2.8,
        floorTexture: "STUD_FLOOR_BLUE",
        ceilTexture: globalSky,
        lightLevel: 230,
      });
    }

    const traced = buildTracedSectors(Array.from(sectorMap.values()), linedefs);

    // 1. Build Sector Floors, Ceilings, and Solid Platform Underside Skirts (Roblox Parts!)
    for (const ts of traced) {
      const sec = ts.sector;
      const { vertices2D, indices } = triangulateTracedSector(ts);
      if (indices.length < 3) continue;

      const light = sec.lightLevel ?? 220;
      const floorY = sec.floorHeight;

      // Floor Mesh (Three.js: X = x, Y = floorY, Z = y)
      const posArr = new Float32Array(vertices2D.length * 3);
      const uvArr = new Float32Array(vertices2D.length * 2);
      for (let i = 0; i < vertices2D.length; i++) {
        posArr[i * 3] = vertices2D[i].x;
        posArr[i * 3 + 1] = floorY;
        posArr[i * 3 + 2] = vertices2D[i].y;
        uvArr[i * 2] = vertices2D[i].x;
        uvArr[i * 2 + 1] = vertices2D[i].y;
      }

      // Ensure upward-facing winding in Three.js (+Y normal) using total signed area
      const idxCopy = [...indices];
      let totalCrossY = 0;
      for (let t = 0; t + 2 < idxCopy.length; t += 3) {
        const a = vertices2D[idxCopy[t]];
        const b = vertices2D[idxCopy[t + 1]];
        const c = vertices2D[idxCopy[t + 2]];
        totalCrossY += (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y);
      }
      if (totalCrossY < 0) {
        for (let t = 0; t + 2 < idxCopy.length; t += 3) {
          const tmp = idxCopy[t + 1];
          idxCopy[t + 1] = idxCopy[t + 2];
          idxCopy[t + 2] = tmp;
        }
      }

      const floorGeo = new THREE.BufferGeometry();
      floorGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      floorGeo.setAttribute("uv", new THREE.BufferAttribute(uvArr, 2));
      floorGeo.setIndex(idxCopy);
      floorGeo.computeVertexNormals();

      const floorMat = this.getMaterial(sec.floorTexture || "STUD_FLOOR_BLUE", light, false);
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.receiveShadow = !this.isSoftwareGl;
      floorMesh.userData = { editorKind: "floor", sectorId: sec.id };
      if (floorMat.transparent) floorMesh.renderOrder = 2;
      group.add(floorMesh);

      // Ceiling Mesh (skip if sky ceiling!)
      if (!isSkyFlatName(sec.ceilTexture || globalSky)) {
        const ceilPos = new Float32Array(posArr.length);
        for (let i = 0; i < vertices2D.length; i++) {
          ceilPos[i * 3] = vertices2D[i].x;
          ceilPos[i * 3 + 1] = sec.ceilHeight;
          ceilPos[i * 3 + 2] = vertices2D[i].y;
        }
        // Flip triangle winding for downward ceiling normal
        const ceilIdx = [...idxCopy];
        for (let t = 0; t < ceilIdx.length; t += 3) {
          const tmp = ceilIdx[t + 1];
          ceilIdx[t + 1] = ceilIdx[t + 2];
          ceilIdx[t + 2] = tmp;
        }
        const ceilGeo = new THREE.BufferGeometry();
        ceilGeo.setAttribute("position", new THREE.BufferAttribute(ceilPos, 3));
        ceilGeo.setAttribute("uv", new THREE.BufferAttribute(uvArr.slice(), 2));
        ceilGeo.setIndex(ceilIdx);
        ceilGeo.computeVertexNormals();
        const ceilMat = this.getMaterial(sec.ceilTexture || "CEIL3_5", light, false);
        const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
        ceilMesh.userData = { editorKind: "ceil", sectorId: sec.id };
        if (ceilMat.transparent) ceilMesh.renderOrder = 2;
        group.add(ceilMesh);
      }
    }

    // 2. Build Linedef Walls, Steps, Portals & Doors
    const addQuad = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      yBot: number,
      yTop: number,
      texName: string | number | undefined,
      light: number,
      linedefId: string,
      wallSlot: "middle" | "lower" | "upper",
      doorSectorId?: number,
      doorBaseFloor?: number,
      doorBaseCeil?: number
    ) => {
      const h = yTop - yBot;
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (h <= 0.005 || len <= 0.005) return;

      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array([
        x1, yBot, z1,
        x2, yBot, z2,
        x2, yTop, z2,
        x1, yTop, z1,
      ]);
      const uScale = len;
      const vScale = h;
      const uvs = new Float32Array([
        0, 0,
        uScale, 0,
        uScale, vScale,
        0, vScale,
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();

      const mat = this.getMaterial(texName, light, true);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !this.isSoftwareGl && !mat.transparent;
      mesh.receiveShadow = !this.isSoftwareGl;
      mesh.userData = { editorKind: "wall", linedefId, wallSlot };
      if (mat.transparent) mesh.renderOrder = 2;
      group.add(mesh);

      if (doorSectorId !== undefined && doorBaseFloor !== undefined && doorBaseCeil !== undefined) {
        const list = doorCeilMeshes.get(doorSectorId) || [];
        list.push({ mesh, baseFloor: doorBaseFloor, baseCeil: doorBaseCeil });
        doorCeilMeshes.set(doorSectorId, list);
      }
    };

    for (const l of linedefs) {
      if (l.noDraw) continue;
      const front = sectorMap.get(l.frontSectorId) || sectorMap.get(0)!;
      const back =
        l.backSectorId !== undefined && l.backSectorId >= 0
          ? sectorMap.get(l.backSectorId)
          : undefined;
      const light = Math.max(front.lightLevel ?? 210, back?.lightLevel ?? 0);
      const lid = String(l.id);

      if (!l.isTwoSided || !back) {
        // Solid outer/room wall
        addQuad(
          l.x1,
          l.y1,
          l.x2,
          l.y2,
          front.floorHeight,
          front.ceilHeight,
          l.middleTexture || "STUD_BLUE",
          light,
          lid,
          "middle"
        );
      } else {
        // Two-sided portal: lower step (platforms/stairs) + upper lintel + optional translucent mid
        const minF = Math.min(front.floorHeight, back.floorHeight);
        const maxF = Math.max(front.floorHeight, back.floorHeight);
        if (maxF - minF > 0.01) {
          addQuad(
            l.x1,
            l.y1,
            l.x2,
            l.y2,
            minF,
            maxF,
            l.lowerTexture || l.middleTexture || "STUD_GOLD",
            light,
            lid,
            "lower"
          );
        }

        const minC = Math.min(front.ceilHeight, back.ceilHeight);
        const maxC = Math.max(front.ceilHeight, back.ceilHeight);
        const bothSky =
          isSkyFlatName(front.ceilTexture || globalSky) &&
          isSkyFlatName(back.ceilTexture || globalSky);
        const isDoorSector = back.special === 1 || front.special === 1;
        if (!bothSky && maxC - minC > 0.01) {
          addQuad(
            l.x1,
            l.y1,
            l.x2,
            l.y2,
            minC,
            maxC,
            l.upperTexture || l.middleTexture || "BIGDOOR2",
            light,
            lid,
            "upper",
            isDoorSector ? (back.special === 1 ? back.id : front.id) : undefined,
            Math.min(front.floorHeight, back.floorHeight),
            minC
          );
        }

        const midTex = String(l.middleTexture || "").toUpperCase();
        if (midTex && midTex !== "NONE" && midTex !== "-") {
          if (midTex.includes("GLASS") || midTex.includes("BAR") || midTex.includes("MID")) {
            addQuad(l.x1, l.y1, l.x2, l.y2, maxF, minC, midTex, light, lid, "middle");
          }
        }
      }
    }

    this.levelGroup.add(group);
    this.levelCache = { signature: sig, group, doorCeilMeshes };
  }

  private createCustomMd2Rig(asset: CustomModel3DAsset): DynamicRig {
    const g = new THREE.Group();
    const flashMeshes: THREE.Mesh[] = [];
    const baseEmissives: number[] = [];

    const frames = asset.model.frames || [];
    const triangles = asset.model.triangles || [];
    const firstVerts = frames[0]?.vertices || [];

    if (firstVerts.length === 0 || triangles.length === 0) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.4, 0.8),
        new THREE.MeshStandardMaterial({ color: asset.colorHint || "#7C2D48", roughness: 0.4 })
      );
      box.position.y = 0.7;
      box.userData.ownsMaterial = true;
      g.add(box);
      flashMeshes.push(box);
      baseEmissives.push(0x000000);
      return { group: g, flashMeshes, baseEmissives };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const v of firstVerts) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.z > maxZ) maxZ = v.z;
    }
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const spanZ = Math.max(0.001, maxZ - minZ);
    const spanXY = Math.max(0.001, maxX - minX, maxY - minY);
    const normScale = 1.55 / Math.max(spanZ, spanXY * 0.75);

    const triCount = triangles.length;
    const posArr = new Float32Array(triCount * 9);
    const uvArr = new Float32Array(triCount * 6);
    let hasUvs = false;

    const writePose = (frameAIdx: number, frameBIdx: number, lerpT: number) => {
      const va = frames[frameAIdx]?.vertices || firstVerts;
      const vb = frames[frameBIdx]?.vertices || va;
      let p = 0;
      for (let t = 0; t < triCount; t++) {
        const tri = triangles[t];
        const idxs = tri.v;
        for (let k = 0; k < 3; k++) {
          const vi = idxs[k];
          const a = va[vi] || firstVerts[0];
          const b = vb[vi] || a;
          const vx = a.x + (b.x - a.x) * lerpT;
          const vy = a.y + (b.y - a.y) * lerpT;
          const vz = a.z + (b.z - a.z) * lerpT;
          posArr[p++] = (vx - cx) * normScale;
          posArr[p++] = (vz - minZ) * normScale;
          posArr[p++] = (vy - cy) * normScale;
        }
      }
    };

    writePose(0, 0, 0);

    let uPtr = 0;
    for (let t = 0; t < triCount; t++) {
      const tri = triangles[t];
      if (tri.uv && tri.uv.length === 3) {
        hasUvs = true;
        for (let k = 0; k < 3; k++) {
          uvArr[uPtr++] = tri.uv[k][0];
          uvArr[uPtr++] = tri.uv[k][1];
        }
      } else {
        uvArr[uPtr++] = 0; uvArr[uPtr++] = 0;
        uvArr[uPtr++] = 1; uvArr[uPtr++] = 0;
        uvArr[uPtr++] = 0.5; uvArr[uPtr++] = 1;
      }
    }

    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(posArr, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", posAttr);
    geo.setAttribute("uv", new THREE.BufferAttribute(uvArr, 2));
    geo.computeVertexNormals();

    let skinTex: THREE.CanvasTexture | null = null;
    const skinCanvas = getCustomModelSkinCanvas(asset.id);
    if (skinCanvas && hasUvs) {
      skinTex = new THREE.CanvasTexture(skinCanvas);
      skinTex.flipY = false;
      skinTex.colorSpace = THREE.SRGBColorSpace;
      skinTex.needsUpdate = true;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: skinTex ? 0xffffff : new THREE.Color(asset.colorHint || "#cbd5e1"),
      map: skinTex,
      roughness: 0.42,
      metalness: 0.14,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !this.isSoftwareGl;
    mesh.receiveShadow = !this.isSoftwareGl;
    mesh.userData.ownsMaterial = true;
    g.add(mesh);
    flashMeshes.push(mesh);
    baseEmissives.push(0x000000);

    let lastFrameState = -1;
    const updateMd2Frame = (animName: string, timeSec: number) => {
      if (frames.length <= 1) return;
      const groups = asset.model.animationGroups || [];
      const q = animName.toLowerCase();
      const matched =
        groups.find((gr) => gr.name.toLowerCase().includes(q)) ||
        groups[0] || { firstFrame: 0, lastFrame: frames.length - 1, fps: 9 };
      const count = Math.max(1, matched.lastFrame - matched.firstFrame + 1);
      const exact = (timeSec * (matched.fps || 9)) % count;
      const f0 = Math.min(frames.length - 1, matched.firstFrame + Math.floor(exact));
      const f1 = Math.min(frames.length - 1, matched.firstFrame + ((Math.floor(exact) + 1) % count));
      const frac = exact - Math.floor(exact);
      const quant = Math.round(exact * 10);
      if (quant === lastFrameState) return;
      lastFrameState = quant;
      writePose(f0, f1, frac);
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
    };

    return { group: g, flashMeshes, baseEmissives, updateMd2Frame };
  }

  private createRobloxRig(modelId: string, isPlayer = false): DynamicRig {
    const customAsset = getCustomModel3D(modelId);
    if (customAsset) {
      return this.createCustomMd2Rig(customAsset);
    }

    const id = modelId.toLowerCase();
    const g = new THREE.Group();
    const flashMeshes: THREE.Mesh[] = [];
    const baseEmissives: number[] = [];

    const addPart = (
      parent: THREE.Object3D,
      geo: THREE.BufferGeometry,
      colorHex: number,
      rough = 0.35,
      metal = 0.12,
      emissiveHex = 0x000000,
      emissiveInt = 0
    ): THREE.Mesh => {
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: rough,
        metalness: metal,
        emissive: emissiveHex,
        emissiveIntensity: emissiveInt,
      });
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = !this.isSoftwareGl;
      m.receiveShadow = !this.isSoftwareGl;
      m.userData.ownsMaterial = true;
      parent.add(m);
      flashMeshes.push(m);
      baseEmissives.push(emissiveHex);
      return m;
    };

    // Goal / Collectible 3D Models
    if (id === "trophy_star" || id === "portal_crystal" || id === "relic_caliz") {
      const ped = addPart(g, new THREE.CylinderGeometry(0.36, 0.44, 0.24, 16), 0x334155, 0.35, 0.45);
      ped.position.y = 0.12;
      const ring = addPart(
        g,
        new THREE.TorusGeometry(0.42, 0.045, 10, 24),
        id === "portal_crystal" ? 0x22d3ee : 0xfacc15,
        0.2,
        0.7,
        id === "portal_crystal" ? 0x0ea5e9 : 0xf59e0b,
        0.6
      );
      ring.rotation.x = Math.PI * 0.5;
      ring.position.y = 0.24;

      const spinner = new THREE.Group();
      spinner.position.y = 0.85;
      g.add(spinner);

      if (id === "portal_crystal") {
        addPart(spinner, new THREE.OctahedronGeometry(0.34, 0), 0x38bdf8, 0.12, 0.2, 0x06b6d4, 0.85);
        const inner = addPart(spinner, new THREE.OctahedronGeometry(0.18, 0), 0xf472b6, 0.1, 0.3, 0xe879f9, 1.0);
        inner.rotation.y = Math.PI * 0.25;
      } else {
        addPart(spinner, new THREE.OctahedronGeometry(0.32, 0), 0xfacc15, 0.2, 0.85, 0xf59e0b, 0.45);
        const halo = addPart(spinner, new THREE.TorusGeometry(0.45, 0.035, 8, 20), 0xfef08a, 0.2, 0.8, 0xfacc15, 0.5);
        halo.rotation.x = Math.PI * 0.35;
      }
      return { group: g, spinner, flashMeshes, baseEmissives };
    }

    if (id === "column") {
      addPart(g, new THREE.BoxGeometry(0.68, 0.24, 0.68), 0x94a3b8, 0.45, 0.15).position.y = 0.12;
      addPart(g, new THREE.CylinderGeometry(0.24, 0.26, 1.8, 12), 0xe2e8f0, 0.4, 0.1).position.y = 1.14;
      addPart(g, new THREE.BoxGeometry(0.68, 0.22, 0.68), 0x94a3b8, 0.45, 0.15).position.y = 2.15;
      return { group: g, flashMeshes, baseEmissives };
    }

    if (id === "chest_demon") {
      addPart(g, new THREE.BoxGeometry(0.75, 0.38, 0.52), 0x78350f, 0.45, 0.2).position.y = 0.19;
      addPart(g, new THREE.BoxGeometry(0.78, 0.18, 0.55), 0xfacc15, 0.25, 0.8, 0xf59e0b, 0.25).position.y = 0.46;
      return { group: g, flashMeshes, baseEmissives };
    }

    // Articulated Roblox R6 Character Rig (~1.38m tall, +X facing forward)
    let skinColor = 0xf5d08a; // Classic Roblox yellow
    let torsoColor = 0x2563eb;
    let legColor = 0x16a34a;
    let accentColor = 0xfacc15;
    let visorColor = 0x111827;
    let weaponType: "sword" | "katana" | "blaster" | "axe" | "none" = isPlayer ? "sword" : "none";
    let hasHorns = false;
    let hasHelmet = false;
    let hasKabuto = false;
    let scaleMod = 1.0;

    if (id === "blox_knight" || id === "md2_knight") {
      skinColor = 0xe2e8f0;
      torsoColor = 0xb91c1c; // Redcliff Knight
      legColor = 0x334155;
      accentColor = 0xfbbf24;
      visorColor = 0x38bdf8;
      hasHelmet = true;
      weaponType = "sword";
    } else if (id === "samurai_fighter") {
      skinColor = 0xfde68a;
      torsoColor = 0x991b1b;
      legColor = 0x1e293b;
      accentColor = 0xfacc15;
      visorColor = 0x111827;
      hasKabuto = true;
      weaponType = "katana";
    } else if (id === "cyber_mech") {
      skinColor = 0x334155;
      torsoColor = 0x0f172a;
      legColor = 0x1e293b;
      accentColor = 0x06b6d4;
      visorColor = 0x22d3ee;
      weaponType = "blaster";
      scaleMod = 1.08;
    } else if (id === "demon_brute") {
      skinColor = 0x991b1b;
      torsoColor = 0x450a0a;
      legColor = 0x292524;
      accentColor = 0xf97316;
      visorColor = 0xfacc15;
      hasHorns = true;
      weaponType = "axe";
      scaleMod = 1.15;
    } else if (id === "doom_imp" || id === "md2_gargoyle" || id === "doom_caco") {
      skinColor = id === "doom_caco" ? 0xdc2626 : 0x7c2d12;
      torsoColor = id === "md2_gargoyle" ? 0x475569 : 0x9a3412;
      legColor = 0x431407;
      accentColor = 0xfef08a;
      visorColor = 0xfacc15;
      hasHorns = true;
      scaleMod = 0.95;
    }

    // Proportions: Legs (0..0.48), Torso (0.48..0.98), Head (0.98..1.34)
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(0, 0.48, -0.14);
    const lLeg = addPart(leftLegPivot, new THREE.BoxGeometry(0.24, 0.48, 0.22), legColor, 0.34, 0.1);
    lLeg.position.y = -0.24;
    g.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0, 0.48, 0.14);
    const rLeg = addPart(rightLegPivot, new THREE.BoxGeometry(0.24, 0.48, 0.22), legColor, 0.34, 0.1);
    rLeg.position.y = -0.24;
    g.add(rightLegPivot);

    // Torso
    const torso = addPart(
      g,
      new THREE.BoxGeometry(0.32, 0.50, 0.52),
      torsoColor,
      0.34,
      id.includes("knight") || id.includes("mech") ? 0.5 : 0.12
    );
    torso.position.y = 0.73;

    // Chest Emblem / Belt
    const belt = addPart(g, new THREE.BoxGeometry(0.35, 0.10, 0.55), accentColor, 0.25, 0.65);
    belt.position.y = 0.52;

    // Head Pivot
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.98, 0);
    g.add(headPivot);
    const headMesh = addPart(headPivot, new THREE.CylinderGeometry(0.18, 0.18, 0.32, 14), skinColor, 0.35, 0.08);
    headMesh.position.y = 0.17;

    // Eyes / Visor facing +X
    const visor = addPart(
      headPivot,
      new THREE.BoxGeometry(0.06, 0.08, 0.24),
      visorColor,
      0.18,
      0.2,
      id.includes("mech") || id.includes("demon") || id.includes("imp") ? visorColor : 0x000000,
      id.includes("mech") || id.includes("demon") || id.includes("imp") ? 0.85 : 0
    );
    visor.position.set(0.165, 0.19, 0);

    if (hasHelmet) {
      const helm = addPart(headPivot, new THREE.BoxGeometry(0.38, 0.16, 0.40), 0x94a3b8, 0.24, 0.75);
      helm.position.y = 0.31;
      const plume = addPart(headPivot, new THREE.BoxGeometry(0.36, 0.12, 0.09), 0xdc2626, 0.4, 0.1);
      plume.position.y = 0.41;
    } else if (hasKabuto) {
      const kabuto = addPart(headPivot, new THREE.ConeGeometry(0.30, 0.18, 8), 0x1e293b, 0.28, 0.6);
      kabuto.position.y = 0.36;
      const crest = addPart(headPivot, new THREE.BoxGeometry(0.05, 0.14, 0.28), 0xfacc15, 0.2, 0.85);
      crest.position.set(0.18, 0.35, 0);
    } else if (hasHorns) {
      const h1 = addPart(headPivot, new THREE.ConeGeometry(0.06, 0.22, 8), accentColor, 0.3, 0.2);
      h1.position.set(0.04, 0.36, -0.14);
      h1.rotation.x = -0.35;
      const h2 = addPart(headPivot, new THREE.ConeGeometry(0.06, 0.22, 8), accentColor, 0.3, 0.2);
      h2.position.set(0.04, 0.36, 0.14);
      h2.rotation.x = 0.35;
    }

    // Left Arm
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(0, 0.94, -0.37);
    const lArm = addPart(leftArmPivot, new THREE.BoxGeometry(0.22, 0.46, 0.20), skinColor, 0.34, 0.1);
    lArm.position.y = -0.19;
    g.add(leftArmPivot);

    // Right Arm (+ Weapon)
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0, 0.94, 0.37);
    const rArm = addPart(rightArmPivot, new THREE.BoxGeometry(0.22, 0.46, 0.20), skinColor, 0.34, 0.1);
    rArm.position.y = -0.19;
    g.add(rightArmPivot);

    if (weaponType === "sword" || weaponType === "katana") {
      const hilt = addPart(rightArmPivot, new THREE.BoxGeometry(0.16, 0.06, 0.06), 0x78350f, 0.4, 0.4);
      hilt.position.set(0.18, -0.38, 0);
      const blade = addPart(
        rightArmPivot,
        new THREE.BoxGeometry(0.58, 0.05, 0.08),
        weaponType === "katana" ? 0xe0f2fe : 0xcbd5e1,
        0.15,
        0.85,
        weaponType === "katana" ? 0x38bdf8 : 0x000000,
        weaponType === "katana" ? 0.35 : 0
      );
      blade.position.set(0.48, -0.38, 0);
    } else if (weaponType === "blaster") {
      const gun = addPart(rightArmPivot, new THREE.BoxGeometry(0.46, 0.14, 0.12), 0x0284c7, 0.22, 0.65, 0x22d3ee, 0.55);
      gun.position.set(0.26, -0.34, 0);
    } else if (weaponType === "axe") {
      const shaft = addPart(rightArmPivot, new THREE.BoxGeometry(0.55, 0.06, 0.06), 0x451a03, 0.5, 0.2);
      shaft.position.set(0.32, -0.36, 0);
      const head = addPart(rightArmPivot, new THREE.BoxGeometry(0.18, 0.26, 0.08), 0xf97316, 0.25, 0.6, 0xea580c, 0.4);
      head.position.set(0.54, -0.36, 0);
    }

    g.scale.setScalar(scaleMod);
    return {
      group: g,
      leftLeg: leftLegPivot,
      rightLeg: rightLegPivot,
      leftArm: leftArmPivot,
      rightArm: rightArmPivot,
      head: headPivot,
      flashMeshes,
      baseEmissives,
    };
  }

  private createVoxelRig(voxelId: string): DynamicRig {
    const id = voxelId.toLowerCase();
    const g = new THREE.Group();
    const flashMeshes: THREE.Mesh[] = [];
    const baseEmissives: number[] = [];

    const addPart = (
      geo: THREE.BufferGeometry,
      colorHex: number,
      rough = 0.3,
      metal = 0.2,
      emissiveHex = 0x000000,
      emissiveInt = 0
    ) => {
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: rough,
        metalness: metal,
        emissive: emissiveHex,
        emissiveIntensity: emissiveInt,
      });
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = !this.isSoftwareGl;
      m.userData.ownsMaterial = true;
      g.add(m);
      flashMeshes.push(m);
      baseEmissives.push(emissiveHex);
      return m;
    };

    if (id.includes("coin")) {
      const coin = addPart(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 18), 0xfacc15, 0.2, 0.85, 0xf59e0b, 0.35);
      coin.rotation.x = Math.PI * 0.5;
      coin.position.y = 0.48;
      const gem = addPart(new THREE.BoxGeometry(0.16, 0.16, 0.11), 0xfef08a, 0.15, 0.9, 0xfacc15, 0.5);
      gem.position.y = 0.48;
    } else if (id.includes("checkpoint") || id.includes("flag")) {
      addPart(new THREE.BoxGeometry(0.75, 0.1, 0.75), 0x22c55e, 0.3, 0.2, 0x16a34a, 0.3).position.y = 0.05;
      addPart(new THREE.CylinderGeometry(0.05, 0.05, 1.35, 10), 0xe2e8f0, 0.25, 0.7).position.y = 0.72;
      const flag = addPart(new THREE.BoxGeometry(0.45, 0.28, 0.06), 0x38bdf8, 0.25, 0.2, 0x0ea5e9, 0.55);
      flag.position.set(0.24, 1.2, 0);
    } else if (id.includes("medikit")) {
      addPart(new THREE.BoxGeometry(0.48, 0.30, 0.36), 0xf8fafc, 0.3, 0.1).position.y = 0.22;
      addPart(new THREE.BoxGeometry(0.22, 0.33, 0.08), 0xef4444, 0.3, 0.1).position.y = 0.22;
      addPart(new THREE.BoxGeometry(0.08, 0.33, 0.22), 0xef4444, 0.3, 0.1).position.y = 0.22;
    } else if (id.includes("key")) {
      addPart(new THREE.TorusGeometry(0.14, 0.04, 8, 16), 0xfacc15, 0.2, 0.85, 0xf59e0b, 0.45).position.set(-0.14, 0.45, 0);
      addPart(new THREE.BoxGeometry(0.32, 0.06, 0.06), 0xfacc15, 0.2, 0.85, 0xf59e0b, 0.45).position.set(0.1, 0.45, 0);
    } else if (id.includes("torch")) {
      addPart(new THREE.CylinderGeometry(0.06, 0.08, 0.85, 8), 0x78350f, 0.6, 0.1).position.y = 0.42;
      addPart(new THREE.OctahedronGeometry(0.16, 0), 0xf97316, 0.2, 0.1, 0xf59e0b, 1.0).position.y = 0.94;
    } else if (id.includes("computer") || id.includes("cyber")) {
      addPart(new THREE.BoxGeometry(0.55, 0.65, 0.55), 0x0f172a, 0.25, 0.5).position.y = 0.33;
      addPart(new THREE.BoxGeometry(0.46, 0.34, 0.58), 0x22d3ee, 0.15, 0.3, 0x06b6d4, 0.75).position.y = 0.44;
    } else if (id.includes("chest")) {
      addPart(new THREE.BoxGeometry(0.60, 0.34, 0.42), 0x92400e, 0.45, 0.2).position.y = 0.17;
      addPart(new THREE.BoxGeometry(0.62, 0.14, 0.44), 0xfacc15, 0.2, 0.8, 0xf59e0b, 0.3).position.y = 0.38;
    } else if (id.includes("potion")) {
      addPart(new THREE.SphereGeometry(0.22, 12, 10), 0xec4899, 0.15, 0.1, 0xdb2777, 0.65).position.y = 0.32;
      addPart(new THREE.CylinderGeometry(0.07, 0.08, 0.18, 10), 0xe2e8f0, 0.2, 0.1).position.y = 0.54;
    } else {
      // Crate / Barrel / Pillar
      addPart(new THREE.BoxGeometry(0.58, 0.58, 0.58), 0xb45309, 0.48, 0.15).position.y = 0.29;
      addPart(new THREE.BoxGeometry(0.61, 0.1, 0.61), 0x78350f, 0.5, 0.2).position.y = 0.29;
    }

    return { group: g, flashMeshes, baseEmissives };
  }

  private updateFpsWeaponRig(weaponModel: string | undefined, walkCycle: number, attackTime: number) {
    const wName = String(weaponModel || "sword3d").toLowerCase();
    if (this.currentWeaponType !== wName) {
      this.currentWeaponType = wName;
      while (this.fpsWeaponGroup.children.length > 0) {
        const ch = this.fpsWeaponGroup.children[0];
        this.fpsWeaponGroup.remove(ch);
        if (ch instanceof THREE.Mesh) {
          ch.geometry.dispose();
          if (ch.material instanceof THREE.Material) ch.material.dispose();
        }
      }
      if (wName === "sword3d") {
        const hilt = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.05, 0.18),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.25 })
        );
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.42, 0.07),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.15 })
        );
        blade.position.y = 0.24;
        this.fpsWeaponGroup.add(hilt, blade);
      } else if (wName === "staff3d") {
        const rod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.028, 0.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 })
        );
        const orb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.07, 0),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0ea5e9,
            emissiveIntensity: 0.9,
          })
        );
        orb.position.y = 0.28;
        this.fpsWeaponGroup.add(rod, orb);
      } else {
        // Shotgun / Pistol stylized 3D blaster
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.11, 0.42),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.25 })
        );
        const barrel = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.05, 0.46),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.55 })
        );
        barrel.position.set(0, 0.05, -0.06);
        this.fpsWeaponGroup.add(body, barrel);
      }
    }

    const bobX = Math.sin(walkCycle) * 0.014;
    const bobY = Math.abs(Math.cos(walkCycle)) * 0.012;
    const atk = Math.sin(attackTime * Math.PI);
    this.fpsWeaponGroup.position.set(0.26 + bobX, -0.24 - bobY + atk * 0.04, -0.45 + atk * 0.08);
    this.fpsWeaponGroup.rotation.set(
      wName === "sword3d" ? -0.35 - atk * 1.05 : atk * 0.24,
      0.15,
      wName === "sword3d" ? 0.2 + atk * 0.45 : 0
    );
  }

  private raycastSpringArm2D(
    ox: number,
    oy: number,
    tx: number,
    ty: number,
    linedefs: DivDoomLinedef[]
  ): number {
    const rdx = tx - ox;
    const rdy = ty - oy;
    let minT = 1.0;
    for (const l of linedefs) {
      if (l.noDraw) continue;
      if (l.isTwoSided && l.blocking !== true) continue;
      const sx = l.x2 - l.x1;
      const sy = l.y2 - l.y1;
      const denom = rdx * sy - rdy * sx;
      if (Math.abs(denom) < 1e-6) continue;
      const qpx = l.x1 - ox;
      const qpy = l.y1 - oy;
      const t = (qpx * sy - qpy * sx) / denom;
      const u = (qpx * rdy - qpy * rdx) / denom;
      if (t > 0.08 && t < minT && u >= 0 && u <= 1) minT = t;
    }
    return minT;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    screenWidth: number,
    screenHeight: number,
    cam: ThreeCameraInput,
    linedefs: DivDoomLinedef[],
    sectors: DivDoomSector[],
    options: ThreeRenderOptions
  ): boolean {
    if (!this.ensureRenderer(screenWidth, screenHeight) || !this.renderer || !this.glCanvas) {
      return false;
    }

    const skyName = options.skyTexture || "SKY_ROBLOX";
    this.updateSkyAndAtmosphere(skyName);
    this.rebuildLevelGeometry(linedefs, sectors, skyName);

    const now = performance.now() * 0.001;

    // Animated texture scroll (water/lava/acid)
    for (const [k, def] of this.textureCache.entries()) {
      if (def.animatedScroll) {
        def.tex.offset.x = (now * 0.18) % 1;
        def.tex.offset.y = (now * (k.includes("WATER") ? 0.12 : 0.06)) % 1;
      }
    }

    // Update animated doors
    if (this.levelCache && options.doorOffsets) {
      for (const [secId, entries] of this.levelCache.doorCeilMeshes.entries()) {
        const openAmt = options.doorOffsets.get(secId) ?? 0;
        for (const e of entries) {
          const lift = openAmt * Math.max(0.6, e.baseCeil - e.baseFloor);
          e.mesh.position.y = lift;
        }
      }
    }

    // Update dynamic PointLights (pooled, zero allocations)
    const activeLights = options.lights || [];
    for (let i = 0; i < this.pointLightPool.length; i++) {
      const pl = this.pointLightPool[i];
      if (i < activeLights.length) {
        const lt = activeLights[i];
        const flicker = lt.flicker ? 0.85 + Math.sin(now * 11 + i * 2.3) * 0.15 : 1.0;
        pl.visible = true;
        pl.position.set(lt.x, lt.z + 0.5, lt.y);
        pl.color.setRGB(lt.r / 255, lt.g / 255, lt.b / 255);
        pl.distance = Math.max(3, lt.radius * 1.4);
        pl.intensity = (lt.intensity ?? 1.0) * 2.4 * flicker;
      } else {
        pl.visible = false;
      }
    }

    // Sync dynamic objects (Player Avatar, Placed Models, Voxels, Classic Entities)
    const tracedSectors = buildTracedSectors(sectors, linedefs);
    const keepKeys = new Set<string>();
    const camMode: Mode8CameraMode = options.cameraMode || "fps";
    const playerFootZ = cam.z - 0.6;
    const walkCycle = options.walkCycle || 0;
    const atkTime = options.weaponAttackTime || 0;

    // Helper to get/create rig in pool
    const getOrCreateRig = (poolKey: string, modelId: string, isVoxel = false, isPlayer = false): DynamicRig => {
      const existing = this.rigPool.get(poolKey);
      if (existing && existing.modelId === modelId) {
        return existing.rig;
      }
      if (existing) {
        this.dynamicGroup.remove(existing.rig.group);
        this.disposeGroupResources(existing.rig.group);
      }
      const rig = isVoxel
        ? this.createVoxelRig(modelId)
        : this.createRobloxRig(modelId, isPlayer);
      this.dynamicGroup.add(rig.group);
      this.rigPool.set(poolKey, { rig, modelId });
      return rig;
    };

    // Player Avatar (visible in 3rd-person / isometric / orbit)
    if (camMode !== "fps") {
      const pKey = "__player_avatar__";
      const pModel = options.playerModelId || "blox_hero";
      const rig = getOrCreateRig(pKey, pModel, false, true);
      keepKeys.add(pKey);
      rig.group.visible = true;
      rig.group.position.set(cam.x, playerFootZ, cam.y);
      rig.group.rotation.set(0, -(cam.angle * Math.PI) / 180, 0);
      const stride = Math.sin(walkCycle) * 0.55;
      const slash = Math.sin(atkTime * Math.PI) * 1.35;
      if (rig.leftLeg) rig.leftLeg.rotation.z = stride;
      if (rig.rightLeg) rig.rightLeg.rotation.z = -stride;
      if (rig.leftArm) rig.leftArm.rotation.z = -stride * 0.8;
      if (rig.rightArm) rig.rightArm.rotation.z = stride * 0.8 + slash;
    }

    // Placed 3D Models (Enemies, Allies, Goals, Props)
    const screenBars: NonNullable<ThreeRenderOptions["onEnemyScreenBars"]> = [];
    const models = options.placedModels || [];
    for (let i = 0; i < models.length; i++) {
      const m = models[i];
      if ((m.hp ?? 1) <= 0 && m.role === "enemy") continue;
      const stats = inferPlacedModelStats(m);
      if (stats.role === "enemy" && stats.hp <= 0) continue;

      const key = `model_${m.id ?? i}`;
      const rig = getOrCreateRig(key, String(m.modelId), false, false);
      keepKeys.add(key);
      rig.group.visible = true;
      rig.group.userData = { editorKind: "model", itemId: String(m.id ?? i), itemIndex: i };

      const sec = findSectorAtPoint(m.x, m.y, tracedSectors);
      const groundZ = m.z && m.z !== 0 ? m.z : sec?.floorHeight ?? 0;
      const isGoal = stats.role === "goal";
      const bob = isGoal ? Math.sin(now * 2.8 + i) * 0.08 : 0;

      rig.group.position.set(m.x, groundZ + bob, m.y);
      rig.group.rotation.set(0, -((m.yaw || 0) * Math.PI) / 180, 0);
      // Normalize scale cleanly so models never balloon out of perspective
      const safeScale = Math.max(0.55, Math.min(1.45, m.scale || 1.0));
      rig.group.scale.setScalar(safeScale);

      // Animate limbs, spinner, or custom MD2/MD3 vertex keyframes
      if (rig.updateMd2Frame) {
        const anim = (m.currentAnimation || m.animation || "idle").toLowerCase();
        rig.updateMd2Frame(anim, now + i * 0.17);
      } else if (rig.spinner) {
        rig.spinner.rotation.y = now * 1.9 + i;
      } else {
        const anim = (m.currentAnimation || m.animation || "idle").toLowerCase();
        const phase = (m.animFrame || 0) * Math.PI * 2;
        if (anim === "walk" || anim === "run") {
          const sw = Math.sin(phase) * 0.58;
          if (rig.leftLeg) rig.leftLeg.rotation.z = sw;
          if (rig.rightLeg) rig.rightLeg.rotation.z = -sw;
          if (rig.leftArm) rig.leftArm.rotation.z = -sw * 0.7;
          if (rig.rightArm) rig.rightArm.rotation.z = sw * 0.7;
        } else if (anim === "attack") {
          if (rig.rightArm) rig.rightArm.rotation.z = Math.sin(phase) * 1.45 + 0.4;
          if (rig.leftArm) rig.leftArm.rotation.z = -0.35;
        } else {
          const breath = Math.sin(now * 2.5 + i) * 0.06;
          if (rig.leftLeg) rig.leftLeg.rotation.z = 0;
          if (rig.rightLeg) rig.rightLeg.rotation.z = 0;
          if (rig.leftArm) rig.leftArm.rotation.z = breath;
          if (rig.rightArm) rig.rightArm.rotation.z = -breath;
        }
      }

      // Hit flash feedback
      const flash = m.hitFlash ?? 0;
      for (let f = 0; f < rig.flashMeshes.length; f++) {
        const mat = rig.flashMeshes[f].material as THREE.MeshStandardMaterial;
        if (flash > 0.05) {
          mat.emissive.setHex(0xff3333);
          mat.emissiveIntensity = Math.min(1.2, flash * 1.4);
        } else {
          mat.emissive.setHex(rig.baseEmissives[f] || 0x000000);
          mat.emissiveIntensity = rig.baseEmissives[f] ? 0.55 : 0;
        }
      }

      if (stats.role === "enemy" && (stats.hp < stats.maxHp || Math.hypot(m.x - cam.x, m.y - cam.y) < 10)) {
        screenBars.push({
          sx: m.x,
          sy: groundZ + 1.65 * safeScale,
          name: stats.name,
          hp: stats.hp,
          maxHp: stats.maxHp,
          dist: m.y, // temporarily store Z in dist slot for projection after camera setup
        });
      }
    }

    // Placed Voxels (Coins, Checkpoints, Torches, Medikits, Terminals)
    const voxels = options.placedVoxels || [];
    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      if (v.collected) continue;
      const key = `voxel_${v.id ?? i}`;
      const rig = getOrCreateRig(key, String(v.voxelId), true, false);
      keepKeys.add(key);
      rig.group.visible = true;
      rig.group.userData = { editorKind: "voxel", itemId: String(v.id ?? i), itemIndex: i };

      const sec = findSectorAtPoint(v.x, v.y, tracedSectors);
      const groundZ = v.z && v.z !== 0 ? v.z : sec?.floorHeight ?? 0;
      const isPickup = String(v.voxelId).includes("coin") || String(v.voxelId).includes("key") || String(v.voxelId).includes("medikit");
      const bob = isPickup ? Math.sin(now * 3.2 + i) * 0.08 : 0;
      rig.group.position.set(v.x, groundZ + bob, v.y);
      rig.group.rotation.set(0, -((v.yaw || 0) * Math.PI) / 180, 0);
      rig.group.scale.setScalar(Math.max(0.6, Math.min(1.4, v.scale || 1.0)));
    }

    // Classic Map Entities (with live AI animation, HP bars, and proper doom_imp mapping)
    const entities = options.entities || [];
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent.type === "player" || ent.type === "spawn" || ent.alive === false) continue;
      const eType = String(ent.type || "").toLowerCase();
      const isHostile = eType === "enemy" || eType === "monster" || eType === "imp";
      if (isHostile && (ent.hp ?? 1) <= 0) continue;
      const ex = ent.x / 64;
      const ey = ent.y / 64;
      const key = `ent_${ent.id ?? i}`;
      const modelMap = isHostile
        ? "doom_imp"
        : eType === "medikit"
        ? "voxel_medikit"
        : eType === "key"
        ? "voxel_key"
        : eType === "torch"
        ? "voxel_torch"
        : eType === "treasure"
        ? "voxel_coin"
        : "voxel_crate";
      const isVox = modelMap.startsWith("voxel_");
      const rig = getOrCreateRig(key, modelMap, isVox, false);
      keepKeys.add(key);
      rig.group.visible = true;
      const sec = findSectorAtPoint(ex, ey, tracedSectors);
      const entGroundZ = ent.z !== undefined ? ent.z : sec?.floorHeight ?? 0;
      rig.group.position.set(ex, entGroundZ, ey);
      if (isHostile) {
        const yawDeg = ent.yaw !== undefined ? ent.yaw : (Math.atan2(cam.y - ey, cam.x - ex) * 180) / Math.PI;
        rig.group.rotation.set(0, -(yawDeg * Math.PI) / 180, 0);
        const anim = String(ent.animation || "walk").toLowerCase();
        const phase = now * 7 + i * 1.4;
        if (anim === "attack") {
          if (rig.rightArm) rig.rightArm.rotation.z = Math.sin(phase) * 1.35 + 0.35;
          if (rig.leftArm) rig.leftArm.rotation.z = -0.35;
        } else if (anim === "walk") {
          const sw = Math.sin(phase) * 0.55;
          if (rig.leftLeg) rig.leftLeg.rotation.z = sw;
          if (rig.rightLeg) rig.rightLeg.rotation.z = -sw;
          if (rig.leftArm) rig.leftArm.rotation.z = -sw * 0.65;
          if (rig.rightArm) rig.rightArm.rotation.z = sw * 0.65;
        }
        const flash = ent.hitFlash ?? 0;
        for (let f = 0; f < rig.flashMeshes.length; f++) {
          const mat = rig.flashMeshes[f].material as THREE.MeshStandardMaterial;
          if (flash > 0.05) {
            mat.emissive.setHex(0xff3333);
            mat.emissiveIntensity = Math.min(1.2, flash * 1.4);
          } else {
            mat.emissive.setHex(rig.baseEmissives[f] || 0x000000);
            mat.emissiveIntensity = rig.baseEmissives[f] ? 0.55 : 0;
          }
        }
        const curHp = ent.hp ?? 60;
        const maxHp = ent.maxHp ?? 60;
        if (curHp < maxHp || Math.hypot(ex - cam.x, ey - cam.y) < 10) {
          screenBars.push({
            sx: ex,
            sy: entGroundZ + 1.55,
            name: ent.name || "Guardián",
            hp: curHp,
            maxHp,
            dist: ey,
          });
        }
      } else {
        rig.group.rotation.set(0, now * 1.8 + i, 0);
      }
    }

    // Hide/remove unused pooled rigs
    for (const [k, entry] of this.rigPool.entries()) {
      if (!keepKeys.has(k)) {
        entry.rig.group.visible = false;
      }
    }

    // Setup True 3D Camera (Zero perspective distortion!)
    this.camera.aspect = screenWidth / Math.max(1, screenHeight);
    this.camera.updateProjectionMatrix();

    const baseRad = (cam.angle * Math.PI) / 180;
    const pitchClamped = Math.max(-55, Math.min(45, cam.pitch || 0));

    if (camMode === "third_person") {
      const targetY = playerFootZ + 0.92;
      const pitchDeg = Math.max(-48, Math.min(20, -18 + pitchClamped * 0.45));
      const pRad = (pitchDeg * Math.PI) / 180;
      const horizDist = 3.8 * Math.cos(pRad);
      const rawX = cam.x - Math.cos(baseRad) * horizDist;
      const rawZ = cam.y - Math.sin(baseRad) * horizDist;
      const hitT = this.raycastSpringArm2D(cam.x, cam.y, rawX, rawZ, linedefs);
      const safeT = Math.max(0.28, hitT * 0.88);
      const cx = cam.x + (rawX - cam.x) * safeT;
      const cz = cam.y + (rawZ - cam.y) * safeT;
      const cy = targetY - Math.sin(pRad) * 3.8 * safeT + (1 - safeT) * 0.45;
      this.vTarget.set(cam.x, targetY, cam.y);
      this.vCamPos.set(cx, Math.max(playerFootZ + 0.45, cy), cz);
      this.camera.position.copy(this.vCamPos);
      this.camera.lookAt(this.vTarget);
      this.fpsWeaponGroup.visible = false;
    } else if (camMode === "isometric") {
      const isoRad = ((cam.angle + 30) * Math.PI) / 180;
      const desiredDist = 5.4;
      const rawX = cam.x - Math.cos(isoRad) * desiredDist;
      const rawZ = cam.y - Math.sin(isoRad) * desiredDist;
      const hitT = this.raycastSpringArm2D(cam.x, cam.y, rawX, rawZ, linedefs);
      const safeT = Math.max(0.35, hitT * 0.9);
      this.vTarget.set(cam.x, playerFootZ + 0.72, cam.y);
      this.vCamPos.set(
        cam.x + (rawX - cam.x) * safeT,
        playerFootZ + 4.4,
        cam.y + (rawZ - cam.y) * safeT
      );
      this.camera.position.copy(this.vCamPos);
      this.camera.lookAt(this.vTarget);
      this.fpsWeaponGroup.visible = false;
    } else if (camMode === "orbit") {
      const orbitRad = ((cam.angle + now * 26) * Math.PI) / 180;
      const desiredDist = 4.6;
      const rawX = cam.x - Math.cos(orbitRad) * desiredDist;
      const rawZ = cam.y - Math.sin(orbitRad) * desiredDist;
      const hitT = this.raycastSpringArm2D(cam.x, cam.y, rawX, rawZ, linedefs);
      const safeT = Math.max(0.35, hitT * 0.88);
      this.vTarget.set(cam.x, playerFootZ + 0.85, cam.y);
      this.vCamPos.set(
        cam.x + (rawX - cam.x) * safeT,
        playerFootZ + 2.55,
        cam.y + (rawZ - cam.y) * safeT
      );
      this.camera.position.copy(this.vCamPos);
      this.camera.lookAt(this.vTarget);
      this.fpsWeaponGroup.visible = false;
    } else {
      // Crisp First-Person Camera
      const eyeY = playerFootZ + 1.12;
      const pRad = (pitchClamped * Math.PI) / 180;
      this.vCamPos.set(cam.x, eyeY, cam.y);
      this.vTarget.set(
        cam.x + Math.cos(baseRad) * Math.cos(pRad) * 10,
        eyeY + Math.sin(pRad) * 10,
        cam.y + Math.sin(baseRad) * Math.cos(pRad) * 10
      );
      this.camera.position.copy(this.vCamPos);
      this.camera.lookAt(this.vTarget);
      this.fpsWeaponGroup.visible = true;
      this.updateFpsWeaponRig(options.weaponModel, walkCycle, atkTime);
    }

    // Center SkyDome & Shadow frustum near camera
    if (this.skyMesh) {
      this.skyMesh.position.copy(this.camera.position);
    }
    this.sunLight.position.set(cam.x + 14, playerFootZ + 28, cam.y + 12);
    this.sunLight.target.position.set(cam.x, playerFootZ, cam.y);

    // Update interactive 3D Editor Ghost Block & Selection Highlights
    this.updateEditorOverlay(options.editorOverlay, linedefs, sectors, now);

    this.renderer.render(this.scene, this.camera);

    // Blit WebGL backbuffer synchronously onto the 2D target canvas
    ctx.drawImage(this.glCanvas, 0, 0, screenWidth, screenHeight);

    // Project enemy HP bars to screen coordinates for crisp 2D HUD overlay
    if (options.onEnemyScreenBars && screenBars.length > 0) {
      this.camera.updateMatrixWorld();
      for (const b of screenBars) {
        this.vProj.set(b.sx, b.sy, b.dist);
        const worldDist = this.vProj.distanceTo(this.camera.position);
        this.vProj.project(this.camera);
        if (this.vProj.z < 1 && this.vProj.z > -1 && worldDist < 16) {
          options.onEnemyScreenBars.push({
            sx: (this.vProj.x * 0.5 + 0.5) * screenWidth,
            sy: (-this.vProj.y * 0.5 + 0.5) * screenHeight,
            name: b.name,
            hp: b.hp,
            maxHp: b.maxHp,
            dist: worldDist,
          });
        }
      }
    }

    return true;
  }

  private clearEditorOverlay() {
    while (this.editorOverlayGroup.children.length > 0) {
      const ch = this.editorOverlayGroup.children[0];
      this.editorOverlayGroup.remove(ch);
      if (ch instanceof THREE.Mesh || ch instanceof THREE.LineSegments) {
        ch.geometry.dispose();
        if (ch.material instanceof THREE.Material) ch.material.dispose();
      }
    }
  }

  private updateEditorOverlay(
    overlay: Mode8ThreeEditorOverlay | undefined,
    linedefs: DivDoomLinedef[],
    sectors: DivDoomSector[],
    now: number
  ) {
    this.clearEditorOverlay();
    if (!overlay || !overlay.enabled) {
      this.editorOverlayGroup.visible = false;
      return;
    }
    this.editorOverlayGroup.visible = true;

    // 1. Highlight selected linedef wall segment
    if (overlay.selectedLineId) {
      const selLine = linedefs.find((l) => String(l.id) === String(overlay.selectedLineId));
      if (selLine) {
        const front = sectors.find((s) => s.id === selLine.frontSectorId);
        const y0 = front?.floorHeight ?? 0;
        const y1 = Math.max(y0 + 0.4, front?.ceilHeight ?? 2.8);
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(selLine.x1, y0 + 0.03, selLine.y1),
          new THREE.Vector3(selLine.x2, y0 + 0.03, selLine.y2),
          new THREE.Vector3(selLine.x2, y0 + 0.03, selLine.y2),
          new THREE.Vector3(selLine.x2, y1, selLine.y2),
          new THREE.Vector3(selLine.x2, y1, selLine.y2),
          new THREE.Vector3(selLine.x1, y1, selLine.y1),
          new THREE.Vector3(selLine.x1, y1, selLine.y1),
          new THREE.Vector3(selLine.x1, y0 + 0.03, selLine.y1),
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xfacc15 });
        this.editorOverlayGroup.add(new THREE.LineSegments(lineGeo, lineMat));
      }
    }

    // 2. Highlight selected sector floor boundary edges
    if (overlay.selectedSectorId !== undefined && overlay.selectedSectorId !== null) {
      const sec = sectors.find((s) => s.id === overlay.selectedSectorId);
      const ySel = (sec?.floorHeight ?? 0) + 0.035;
      const secLines = linedefs.filter(
        (l) => l.frontSectorId === overlay.selectedSectorId || l.backSectorId === overlay.selectedSectorId
      );
      if (secLines.length > 0) {
        const pts: THREE.Vector3[] = [];
        for (const l of secLines) {
          pts.push(new THREE.Vector3(l.x1, ySel, l.y1), new THREE.Vector3(l.x2, ySel, l.y2));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
        this.editorOverlayGroup.add(new THREE.LineSegments(geo, mat));
      }
    }

    // 3. LEGO / Roblox snapped 3D Ghost Block Preview at hover position
    if (
      overlay.showCursorBox !== false &&
      overlay.hoverCellX !== undefined &&
      overlay.hoverCellY !== undefined &&
      Number.isFinite(overlay.hoverCellX) &&
      Number.isFinite(overlay.hoverCellY)
    ) {
      const size = Math.max(0.25, overlay.blockSize ?? 1.0);
      const height = Math.max(0.18, overlay.blockHeight ?? 0.65);
      const baseZ = overlay.hoverBaseZ ?? 0;
      const color = new THREE.Color(overlay.hoverColor || "#38bdf8");
      const pulse = 0.28 + Math.sin(now * 5.0) * 0.08;

      const boxGeo = new THREE.BoxGeometry(size * 0.98, height, size * 0.98);
      const boxMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: pulse,
        depthWrite: false,
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.position.set(overlay.hoverCellX, baseZ + height * 0.5 + 0.01, overlay.hoverCellY);
      boxMesh.renderOrder = 5;
      this.editorOverlayGroup.add(boxMesh);

      const edgesGeo = new THREE.EdgesGeometry(boxGeo);
      const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff });
      const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
      edgesMesh.position.copy(boxMesh.position);
      edgesMesh.renderOrder = 6;
      this.editorOverlayGroup.add(edgesMesh);
    }
  }

  public pickSurface(ndcX: number, ndcY: number, fallbackFloorY = 0): Mode8ThreePickHit | null {
    if (!this.renderer) return null;
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    // 1. Check dynamic rigs (models/voxels) and level geometry (floors/walls/ceils)
    const targets: THREE.Object3D[] = [this.dynamicGroup, this.levelGroup];
    const hits = this.raycaster.intersectObjects(targets, true);
    for (const h of hits) {
      if (!h.object.visible) continue;
      let cur: THREE.Object3D | null = h.object;
      let tagged: Record<string, any> | null = null;
      while (cur) {
        if (cur.userData && cur.userData.editorKind) {
          tagged = cur.userData;
          break;
        }
        cur = cur.parent;
      }
      if (!tagged) continue;
      // Ignore player avatar self-hits
      if (h.distance < 0.25) continue;

      return {
        kind: tagged.editorKind,
        worldX: h.point.x,
        worldY: h.point.z,
        worldZ: h.point.y,
        sectorId: tagged.sectorId,
        linedefId: tagged.linedefId,
        wallSlot: tagged.wallSlot,
        itemId: tagged.itemId,
        itemIndex: tagged.itemIndex,
      };
    }

    // 2. Fallback intersect against ground plane Y = fallbackFloorY
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -fallbackFloorY);
    const out = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(groundPlane, out)) {
      return {
        kind: "ground",
        worldX: out.x,
        worldY: out.z,
        worldZ: out.y,
        sectorId: 0,
      };
    }
    return null;
  }
}

let sharedEngine: Mode8ThreeEngine | null = null;

export function renderMode8ThreeWorld(
  ctx: CanvasRenderingContext2D,
  screenWidth: number,
  screenHeight: number,
  cam: ThreeCameraInput,
  linedefs: DivDoomLinedef[],
  sectors: DivDoomSector[],
  options: ThreeRenderOptions
): boolean {
  if (!sharedEngine) {
    sharedEngine = new Mode8ThreeEngine();
  }
  return sharedEngine.render(
    ctx,
    screenWidth,
    screenHeight,
    cam,
    linedefs,
    sectors,
    options
  );
}

export function pickMode8ThreeSurface(
  ndcX: number,
  ndcY: number,
  fallbackFloorY = 0
): Mode8ThreePickHit | null {
  if (!sharedEngine) return null;
  return sharedEngine.pickSurface(ndcX, ndcY, fallbackFloorY);
}

export function invalidateMode8ThreeTexture(texName: string): void {
  if (!sharedEngine) return;
  sharedEngine.invalidateTexture(texName);
}
