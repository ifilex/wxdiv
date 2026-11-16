import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Layers,
  Eye,
  Sliders,
  Sparkles,
  Check,
  Copy,
  ChevronRight,
  Maximize2,
  Minimize2,
  Grid,
  FileCode,
  Film,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Move,
} from "lucide-react";
import { DivModel3DData, DivModel3DVertex } from "../types";
import {
  parseMD2Buffer,
  parseMD3Buffer,
  generateDivCharacterModel,
  ParsedMD2Model,
  STANDARD_MD2_ANIMATIONS,
} from "../engine/md2Parser";
import { BUILTIN_3D_MODELS } from "../engine/mode8Enhanced";
import {
  CustomModel3DAsset,
  listCustomModels3D,
  saveCustomModel3D,
  toParsedMD2Model,
  subscribeAssetLibrary,
} from "../engine/assetLibrary";

interface MD2ViewerProps {
  initialModelId?: string;
  onOpenSpriteGenerator?: (model: ParsedMD2Model) => void;
  onInsertCode?: (code: string) => void;
}

export const MD2Viewer: React.FC<MD2ViewerProps> = ({
  initialModelId = "hombre",
  onOpenSpriteGenerator,
  onInsertCode,
}) => {
  // Model state
  const [selectedModelKey, setSelectedModelKey] = useState<string>(initialModelId);
  const [currentModel, setCurrentModel] = useState<ParsedMD2Model>(() =>
    generateDivCharacterModel("hombre")
  );
  const [activeAnimIndex, setActiveAnimIndex] = useState<number>(0);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [interpolate, setInterpolate] = useState<boolean>(true);

  // Camera & viewport controls
  const [yaw, setYaw] = useState<number>(30); // Rotation around Z/Y
  const [pitch, setPitch] = useState<number>(15); // Elevation
  const [zoom, setZoom] = useState<number>(1.2);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<"orbit" | "pan">("orbit");
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Rendering style
  const [renderMode, setRenderMode] = useState<"textured" | "shaded" | "wireframe" | "points">("shaded");
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showNormals, setShowNormals] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState<"cyber" | "dos" | "gray">("cyber");
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Notifications / Feedback
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"viewport" | "inspector">("viewport");
  const [touchMode, setTouchMode] = useState<"orbit" | "pan">("orbit");

  const [savedModels, setSavedModels] = useState<CustomModel3DAsset[]>(() => listCustomModels3D());
  const [saveCustomName, setSaveCustomName] = useState<string>("");
  const [saveCustomRole, setSaveCustomRole] = useState<"prop" | "enemy" | "ally" | "goal">("enemy");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRequestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const fractionalFrameRef = useRef<number>(0);

  useEffect(() => {
    return subscribeAssetLibrary(() => {
      setSavedModels(listCustomModels3D());
    });
  }, []);

  // Load selected built-in or custom saved model
  useEffect(() => {
    if (selectedModelKey === "custom_uploaded") return;
    if (selectedModelKey.startsWith("custom:")) {
      const customId = selectedModelKey.slice("custom:".length);
      const found = listCustomModels3D().find((m) => m.id === customId);
      if (found) {
        setCurrentModel(toParsedMD2Model(found));
        setSaveCustomName(found.name);
        setSaveCustomRole(found.defaultRole);
        setActiveAnimIndex(0);
        setCurrentFrame(0);
        fractionalFrameRef.current = 0;
      }
      return;
    }
    if (selectedModelKey === "hombre" || selectedModelKey === "mujer" || selectedModelKey === "nino" || selectedModelKey === "armado") {
      const charModel = generateDivCharacterModel(selectedModelKey as any);
      setCurrentModel(charModel);
      setSaveCustomName(charModel.name);
      setActiveAnimIndex(0);
      setCurrentFrame(0);
      fractionalFrameRef.current = 0;
    } else {
      const builtin = BUILTIN_3D_MODELS[selectedModelKey];
      if (builtin) {
        const animGroups = builtin.frames.map((f, i) => ({
          name: f.name.toUpperCase(),
          firstFrame: i,
          lastFrame: i,
          fps: 8,
        }));
        setCurrentModel({
          ...builtin,
          animationGroups: animGroups.length > 0 ? animGroups : [{ name: "DEFAULT", firstFrame: 0, lastFrame: 0, fps: 8 }],
        });
        setSaveCustomName(builtin.name);
        setActiveAnimIndex(0);
        setCurrentFrame(0);
        fractionalFrameRef.current = 0;
      }
    }
  }, [selectedModelKey]);

  // Handle file upload (.md2 / .md3)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    try {
      const buffer = await file.arrayBuffer();
      const ext = file.name.split(".").pop()?.toLowerCase();

      let parsed: ParsedMD2Model;
      if (ext === "md3") {
        parsed = parseMD3Buffer(buffer, file.name);
      } else {
        parsed = parseMD2Buffer(buffer, file.name);
      }

      setCurrentModel(parsed);
      setSelectedModelKey("custom_uploaded");
      setSaveCustomName(file.name.replace(/\.(md2|md3)$/i, "").replace(/[_-]+/g, " "));
      setActiveAnimIndex(0);
      setCurrentFrame(0);
      fractionalFrameRef.current = 0;
    } catch (err: any) {
      setUploadError(err?.message || "Error al cargar archivo 3D");
    }
  };

  const handleSkinUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || 256;
      c.height = img.naturalHeight || 256;
      const cx = c.getContext("2d");
      if (cx) {
        cx.drawImage(img, 0, 0);
        setCurrentModel((prev) => ({ ...prev, skinCanvas: c }));
        setRenderMode("textured");
        setSavedNotice("Textura Skin aplicada al modelo.");
        setTimeout(() => setSavedNotice(null), 2500);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleSaveToAssetLibrary = () => {
    const cleanName = saveCustomName.trim() || currentModel.name || "Objeto MD2";
    const fmt = currentModel.format === "md3" ? "md3" : "md2";
    const saved = saveCustomModel3D({
      name: cleanName,
      format: fmt,
      defaultRole: saveCustomRole,
      model: currentModel,
    });
    setSelectedModelKey(`custom:${saved.id}`);
    setSavedNotice(`Guardado como "${saved.name}" (ID: ${saved.id}). Ya puedes usarlo en 3D.`);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  // Main 3D Canvas Rendering Loop
  const render3DViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    if (bgColor === "dos") {
      ctx.fillStyle = "#0000aa";
    } else if (bgColor === "gray") {
      ctx.fillStyle = "#1e293b";
    } else {
      // Cyber dark
      ctx.fillStyle = "#090d16";
    }
    ctx.fillRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Camera transform parameters
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    const cosYaw = Math.cos(yawRad);
    const sinYaw = Math.sin(yawRad);
    const cosPitch = Math.cos(pitchRad);
    const sinPitch = Math.sin(pitchRad);

    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y + 40;
    const focalLength = 320 * zoom;
    const cameraDist = 2.4;

    // Project 3D point (x, y, z) to 2D screen (sx, sy, depth)
    const projectPoint = (x: number, y: number, z: number) => {
      // Rotate Yaw around Z
      const rx1 = x * cosYaw - y * sinYaw;
      const ry1 = x * sinYaw + y * cosYaw;
      const rz1 = z;

      // Rotate Pitch around X
      const rx2 = rx1;
      const ry2 = ry1 * cosPitch - rz1 * sinPitch;
      const rz2 = ry1 * sinPitch + rz1 * cosPitch;

      const depth = cameraDist + ry2;
      const factor = depth > 0.1 ? focalLength / depth : 0;

      const sx = centerX + rx2 * factor;
      const sy = centerY - rz2 * factor;

      return { sx, sy, depth, rx: rx2, ry: ry2, rz: rz2 };
    };

    // Draw Floor Grid / Circular Pedestal
    if (showGrid) {
      // Pedestal ring
      ctx.beginPath();
      const ringSteps = 32;
      const ringRadius = 0.7;
      for (let i = 0; i <= ringSteps; i++) {
        const theta = (i / ringSteps) * Math.PI * 2;
        const px = Math.cos(theta) * ringRadius;
        const py = Math.sin(theta) * ringRadius;
        const pt = projectPoint(px, py, 0);
        if (i === 0) ctx.moveTo(pt.sx, pt.sy);
        else ctx.lineTo(pt.sx, pt.sy);
      }
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pedestal cross-axes
      const pN = projectPoint(0, ringRadius, 0);
      const pS = projectPoint(0, -ringRadius, 0);
      const pE = projectPoint(ringRadius, 0, 0);
      const pW = projectPoint(-ringRadius, 0, 0);

      ctx.beginPath();
      ctx.moveTo(pW.sx, pW.sy);
      ctx.lineTo(pE.sx, pE.sy);
      ctx.moveTo(pS.sx, pS.sy);
      ctx.lineTo(pN.sx, pN.sy);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (!currentModel || currentModel.frames.length === 0) return;

    // Get current vertices (with keyframe interpolation if enabled)
    const anim = currentModel.animationGroups[activeAnimIndex] || {
      firstFrame: 0,
      lastFrame: currentModel.frames.length - 1,
      fps: 10,
    };

    const frameA = Math.floor(currentFrame);
    const frameB = isPlaying && interpolate ? Math.min(anim.lastFrame, frameA + 1) : frameA;
    const lerpT = isPlaying && interpolate ? currentFrame - frameA : 0;

    const fDataA = currentModel.frames[frameA] || currentModel.frames[0];
    const fDataB = currentModel.frames[frameB] || fDataA;

    if (!fDataA) return;

    const verticesA = fDataA.vertices;
    const verticesB = fDataB.vertices;

    // Interpolate vertices
    const interpolatedVertices: DivModel3DVertex[] = verticesA.map((va, i) => {
      const vb = verticesB[i] || va;
      return {
        x: va.x + (vb.x - va.x) * lerpT,
        y: va.y + (vb.y - va.y) * lerpT,
        z: va.z + (vb.z - va.z) * lerpT,
      };
    });

    // Project all vertices
    const projectedVertices = interpolatedVertices.map((v) => projectPoint(v.x, v.y, v.z));

    // Prepare triangles with depth for Painter's Algorithm sorting
    interface RenderTriangle {
      tri: (typeof currentModel.triangles)[0];
      p0: (typeof projectedVertices)[0];
      p1: (typeof projectedVertices)[0];
      p2: (typeof projectedVertices)[0];
      depth: number;
      normalZ: number;
      lightIntensity: number;
    }

    const lightDir = { x: 0.35, y: -0.65, z: 0.68 };
    const lightLen = Math.hypot(lightDir.x, lightDir.y, lightDir.z);
    lightDir.x /= lightLen;
    lightDir.y /= lightLen;
    lightDir.z /= lightLen;

    const renderTriangles: RenderTriangle[] = [];

    for (const tri of currentModel.triangles) {
      const p0 = projectedVertices[tri.v[0]];
      const p1 = projectedVertices[tri.v[1]];
      const p2 = projectedVertices[tri.v[2]];

      if (!p0 || !p1 || !p2) continue;

      // Average depth for sorting
      const depth = (p0.depth + p1.depth + p2.depth) / 3;

      // Compute normal in camera space
      const v0 = interpolatedVertices[tri.v[0]];
      const v1 = interpolatedVertices[tri.v[1]];
      const v2 = interpolatedVertices[tri.v[2]];

      const ax = v1.x - v0.x;
      const ay = v1.y - v0.y;
      const az = v1.z - v0.z;

      const bx = v2.x - v0.x;
      const by = v2.y - v0.y;
      const bz = v2.z - v0.z;

      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;

      const nLen = Math.hypot(nx, ny, nz) || 1;
      const normX = nx / nLen;
      const normY = ny / nLen;
      const normZ = nz / nLen;

      // Light dot product
      const dot = normX * lightDir.x + normY * lightDir.y + normZ * lightDir.z;
      const lightIntensity = Math.min(1.0, Math.max(0.18, (dot + 1) / 2));

      renderTriangles.push({
        tri,
        p0,
        p1,
        p2,
        depth,
        normalZ: normZ,
        lightIntensity,
      });
    }

    // Sort back-to-front (highest depth drawn first)
    renderTriangles.sort((a, b) => b.depth - a.depth);

    // Draw Triangles according to renderMode
    for (const rt of renderTriangles) {
      const { p0, p1, p2, tri, lightIntensity } = rt;

      // Screen clipping
      if (p0.depth <= 0.1 || p1.depth <= 0.1 || p2.depth <= 0.1) continue;

      ctx.beginPath();
      ctx.moveTo(p0.sx, p0.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.closePath();

      if (renderMode === "wireframe") {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (renderMode === "points") {
        // Will draw points after loop
      } else {
        // Shaded / Solid
        let baseColor = tri.color || "#38bdf8";
        // Calculate illuminated color
        ctx.fillStyle = adjustBrightness(baseColor, lightIntensity);
        ctx.fill();

        // Subtle polygon edge for crisp retro poly definition
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Draw normal vectors if enabled
      if (showNormals) {
        const midX = (p0.sx + p1.sx + p2.sx) / 3;
        const midY = (p0.sy + p1.sy + p2.sy) / 3;
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + rt.normalZ * 12, midY - 12);
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Point cloud rendering
    if (renderMode === "points") {
      ctx.fillStyle = "#38bdf8";
      for (const pt of projectedVertices) {
        if (pt.depth <= 0.1) continue;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Floor shadow projection
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 40 * zoom, 18 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();
  }, [
    bgColor,
    showGrid,
    showNormals,
    renderMode,
    currentModel,
    activeAnimIndex,
    currentFrame,
    isPlaying,
    interpolate,
    yaw,
    pitch,
    zoom,
    pan,
  ]);

  // Color brightness adjuster helper
  function adjustBrightness(hex: string, factor: number): string {
    if (!hex.startsWith("#") || hex.length < 7) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const nr = Math.min(255, Math.max(0, Math.round(r * factor)));
    const ng = Math.min(255, Math.max(0, Math.round(g * factor)));
    const nb = Math.min(255, Math.max(0, Math.round(b * factor)));

    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  // Animation frame advance loop
  useEffect(() => {
    let animId: number;

    const loop = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (autoRotate) {
        setYaw((prev) => (prev + 40 * delta) % 360);
      }

      if (isPlaying && currentModel && currentModel.animationGroups.length > 0) {
        const anim = currentModel.animationGroups[activeAnimIndex] || {
          firstFrame: 0,
          lastFrame: Math.max(0, currentModel.frames.length - 1),
          fps: 10,
        };

        const totalFramesInAnim = Math.max(1, anim.lastFrame - anim.firstFrame + 1);
        const advance = anim.fps * playbackSpeed * delta;

        fractionalFrameRef.current += advance;
        if (fractionalFrameRef.current > anim.lastFrame) {
          fractionalFrameRef.current = anim.firstFrame;
        }

        setCurrentFrame(fractionalFrameRef.current);
      }

      render3DViewport();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, autoRotate, playbackSpeed, activeAnimIndex, currentModel, render3DViewport]);

  // Pointer / Touch drag & drop controls for 3D Camera
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    setDragMode(touchMode === "pan" || e.button === 2 || e.shiftKey ? "pan" : "orbit");
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (dragMode === "orbit") {
      setYaw((prev) => (prev + dx * 0.7) % 360);
      setPitch((prev) => Math.max(-85, Math.min(85, prev - dy * 0.5)));
    } else {
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handlePointerUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.3, Math.min(4.0, prev * zoomDelta)));
  };

  // Switch animation
  const handleSelectAnimation = (index: number) => {
    setActiveAnimIndex(index);
    const anim = currentModel.animationGroups[index];
    if (anim) {
      setCurrentFrame(anim.firstFrame);
      fractionalFrameRef.current = anim.firstFrame;
    }
  };

  // Copy DIV Games Studio code
  const handleCopyCode = () => {
    const code = `// Carga y colocación de modelo 3D MD2 / MD3 en Modo 8\nm8_add_model("${selectedModelKey}", 8.0, 8.0, 0.0, ${Math.round(yaw)}, "${currentModel.animationGroups[activeAnimIndex]?.name.toLowerCase() || "idle"}", 1.0);`;
    if (onInsertCode) {
      onInsertCode(code);
    }
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const currentAnim = currentModel.animationGroups[activeAnimIndex] || {
    name: "REPOSO",
    firstFrame: 0,
    lastFrame: 0,
    fps: 10,
  };

  return (
    <div id="md2-viewer-window" className="flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] select-none overflow-hidden font-sans">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-[#E2E8F0] px-3 py-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#7C2D48] font-bold text-xs tracking-wide shrink-0">
            <Box className="w-4 h-4" />
            <span className="hidden sm:inline">VISOR 3D MD2/MD3</span>
          </div>

          <select
            value={selectedModelKey}
            onChange={(e) => setSelectedModelKey(e.target.value)}
            className="bg-[#F8FAFC] border border-[#CBD5E1] text-[#111827] rounded-lg px-2.5 min-h-[36px] text-xs font-medium outline-none focus:border-[#7C2D48] max-w-[180px] sm:max-w-xs"
          >
            <optgroup label="Estilo Roblox / Arcade (MD2/MD3)">
              <option value="blox_hero">Blox Hero Obby (MD2)</option>
              <option value="blox_knight">Caballero Redcliff (MD2)</option>
              <option value="samurai_fighter">Samurái Dojo (MD2)</option>
              <option value="cyber_mech">Cyber Mech Pesado (MD3)</option>
              <option value="trophy_star">Trofeo Estrella Dorada (MD2)</option>
              <option value="portal_crystal">Cristal Checkpoint Neón (MD3)</option>
            </optgroup>
            <optgroup label="Personajes DIV Studio">
              <option value="hombre">Hombre (Mono Azul - Clásico DIV)</option>
              <option value="mujer">Mujer (Túnica Roja)</option>
              <option value="nino">Niño (Ropa Verde)</option>
              <option value="armado">Armado (Soldado Combate)</option>
            </optgroup>
            <optgroup label="Doom / Hexen Clásico (MD2/MD3)">
              <option value="knight">Paladín de Élite (MD2)</option>
              <option value="gargoyle">Gárgola Demonio (MD2)</option>
              <option value="demon_brute">Ogro Demon Brute (MD3)</option>
              <option value="doom_imp">Imp Demoníaco (MD2)</option>
              <option value="doom_caco">Cacodemon Flotante (MD2)</option>
              <option value="doom_marine">Marine Espacial (MD2)</option>
              <option value="drone">Dron de Asalto (MD3)</option>
              <option value="column">Columna Gótica (MD3)</option>
              <option value="chalice">Cáliz Místico (MD2)</option>
            </optgroup>
            {savedModels.length > 0 && (
              <optgroup label="Mis Objetos 3D Importados">
                {savedModels.map((m) => (
                  <option key={m.id} value={`custom:${m.id}`}>
                    {m.name} ({m.format.toUpperCase()})
                  </option>
                ))}
              </optgroup>
            )}
            {selectedModelKey === "custom_uploaded" && (
              <option value="custom_uploaded">Archivo Importado ({currentModel.name})</option>
            )}
          </select>

          <label
            className="flex items-center gap-1.5 px-2.5 min-h-[36px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#374151] rounded-lg border border-[#E2E8F0] cursor-pointer text-xs font-medium transition-colors whitespace-nowrap"
            title="Importa archivos .md2 o .md3 gratuitos descargados de repositorios comunitarios (Quake2 / Quake3 / OpenGameArt)"
          >
            <Upload className="w-3.5 h-3.5 text-[#7C2D48]" />
            <span className="hidden sm:inline">Abrir .MD2/.MD3</span>
            <span className="sm:hidden">.MD2/.MD3</span>
            <input
              type="file"
              accept=".md2,.md3"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-[#F8FAFC] p-0.5 rounded-lg border border-[#E2E8F0]">
            <button
              onClick={() => setRenderMode("shaded")}
              className={`px-2.5 min-h-[32px] rounded-md text-xs font-semibold transition-colors ${
                renderMode === "shaded" ? "bg-[#7C2D48] text-white" : "text-[#4B5563] hover:text-[#111827]"
              }`}
              title="Polígonos iluminados"
            >
              Sólido
            </button>
            <button
              onClick={() => setRenderMode("wireframe")}
              className={`px-2.5 min-h-[32px] rounded-md text-xs font-semibold transition-colors ${
                renderMode === "wireframe" ? "bg-[#7C2D48] text-white" : "text-[#4B5563] hover:text-[#111827]"
              }`}
              title="Malla de alambre"
            >
              Malla
            </button>
            <button
              onClick={() => setRenderMode("points")}
              className={`px-2.5 min-h-[32px] rounded-md text-xs font-semibold transition-colors ${
                renderMode === "points" ? "bg-[#7C2D48] text-white" : "text-[#4B5563] hover:text-[#111827]"
              }`}
              title="Nube de vértices"
            >
              Puntos
            </button>
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border text-xs transition-colors ${
              showGrid
                ? "bg-[#FDF2F4] border-[#7C2D48]/40 text-[#7C2D48]"
                : "bg-white border-[#E2E8F0] text-[#4B5563]"
            }`}
            title="Mostrar/ocultar cuadrícula y pedestal"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border text-xs transition-colors ${
              autoRotate
                ? "bg-[#ECFDF5] border-[#2F6F4E] text-[#2F6F4E]"
                : "bg-white border-[#E2E8F0] text-[#4B5563]"
            }`}
            title="Rotación orbital automática"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {onOpenSpriteGenerator && (
            <button
              onClick={() => onOpenSpriteGenerator(currentModel)}
              className="px-3 min-h-[36px] bg-[#7C2D48] hover:bg-[#66233A] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Generar sprites 2D para la librería FPG a partir de este modelo"
            >
              <Film className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Crear Sprites 2D</span>
              <span className="sm:hidden">Sprites</span>
            </button>
          )}

          <button
            onClick={handleCopyCode}
            className="px-2.5 min-h-[36px] bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#374151] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
            title="Copiar código m8_add_model(...) para DIV Games Studio"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-[#2F6F4E]" /> : <Copy className="w-3.5 h-3.5 text-[#7C2D48]" />}
            <span>{copiedCode ? "Copiado" : "Código"}</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 text-xs px-3 py-2 flex items-center justify-between flex-shrink-0">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-rose-600 font-bold px-2">×</button>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden items-center bg-white border-b border-[#E2E8F0] px-3 py-1.5 gap-2 flex-shrink-0">
        <button
          onClick={() => setMobileTab("viewport")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "viewport"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          Visor 3D
        </button>
        <button
          onClick={() => setMobileTab("inspector")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "inspector"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          Modelo y Animaciones ({currentModel.animationGroups.length})
        </button>
      </div>

      {/* Main Viewport & Sidebar Split */}
      <div className="flex-1 flex-grow min-h-0 w-full h-full flex flex-col md:flex-row overflow-hidden">
        {/* 3D Interactive Canvas Area */}
        <div
          className={`${
            mobileTab === "viewport" ? "flex" : "hidden md:flex"
          } flex-1 relative overflow-hidden bg-[#0F172A] items-center justify-center min-h-[240px]`}
        >
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-contain cursor-grab active:cursor-grabbing select-none touch-none"
          />

          {/* On-screen Camera Info Overlay */}
          <div className="absolute top-2 left-2 bg-[#090d16]/85 backdrop-blur-xs border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 pointer-events-none flex flex-wrap items-center gap-2.5">
            <span>Rot: <strong className="text-amber-300">{Math.round(yaw)}°</strong></span>
            <span>Elev: <strong className="text-amber-300">{Math.round(pitch)}°</strong></span>
            <span>Zoom: <strong className="text-amber-300">{zoom.toFixed(1)}x</strong></span>
            <span className="hidden sm:inline text-slate-400">(Arrastra para {touchMode === "pan" ? "mover" : "rotar"})</span>
          </div>

          {/* Touch Camera Controls (Right Overlay) */}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
            <button
              onClick={() => setTouchMode((m) => (m === "orbit" ? "pan" : "orbit"))}
              className={`min-w-[38px] min-h-[38px] flex items-center justify-center border rounded-lg shadow text-xs font-bold transition-colors ${
                touchMode === "pan"
                  ? "bg-[#7C2D48] border-[#7C2D48] text-white"
                  : "bg-[#0e172a]/85 border-slate-700 text-slate-200 hover:bg-[#1e293b]"
              }`}
              title={touchMode === "pan" ? "Modo: Mover cámara" : "Modo: Orbitar modelo"}
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setYaw(30);
                setPitch(15);
                setZoom(1.2);
                setPan({ x: 0, y: 0 });
              }}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center bg-[#0e172a]/85 hover:bg-[#1e293b] border border-slate-700 text-slate-200 rounded-lg shadow text-xs transition-colors"
              title="Restablecer posición de cámara"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((prev) => Math.min(3.5, prev * 1.2))}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center bg-[#0e172a]/85 hover:bg-[#1e293b] border border-slate-700 text-slate-200 rounded-lg shadow text-xs transition-colors"
              title="Acercar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((prev) => Math.max(0.4, prev / 1.2))}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center bg-[#0e172a]/85 hover:bg-[#1e293b] border border-slate-700 text-slate-200 rounded-lg shadow text-xs transition-colors"
              title="Alejar zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Inspector & Animation Panel */}
        <div
          className={`${
            mobileTab === "inspector" ? "flex" : "hidden md:flex"
          } w-full md:w-72 lg:w-80 bg-white md:border-l border-[#E2E8F0] flex-col overflow-y-auto`}
        >
          <div className="p-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#111827] text-sm flex items-center justify-between gap-2">
              <span className="truncate">{currentModel.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded uppercase font-mono font-bold bg-[#FDF2F4] text-[#7C2D48] border border-[#FBCFE8]">
                {currentModel.format.toUpperCase()}
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-[#4B5563]">
              <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                <span className="text-[#6B7280] block text-[10px]">Vértices</span>
                <strong className="text-[#111827] font-mono">
                  {currentModel.frames[0]?.vertices.length || 0}
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                <span className="text-[#6B7280] block text-[10px]">Polígonos</span>
                <strong className="text-[#111827] font-mono">
                  {currentModel.triangles.length}
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                <span className="text-[#6B7280] block text-[10px]">Fotogramas</span>
                <strong className="text-[#111827] font-mono">
                  {currentModel.frames.length}
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                <span className="text-[#6B7280] block text-[10px]">Animaciones</span>
                <strong className="text-[#111827] font-mono">
                  {currentModel.animationGroups.length}
                </strong>
              </div>
            </div>

            {/* Save to Project Asset Library Card */}
            <div className="mt-3 p-2.5 bg-white rounded-xl border border-[#CBD5E1] space-y-2">
              <div className="text-[11px] font-bold text-[#7C2D48]">Guardar en Biblioteca 3D</div>
              <input
                type="text"
                value={saveCustomName}
                onChange={(e) => setSaveCustomName(e.target.value)}
                placeholder="Nombre del objeto 3D..."
                className="w-full min-h-[36px] px-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#111827]"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={saveCustomRole}
                  onChange={(e) => setSaveCustomRole(e.target.value as any)}
                  className="min-h-[36px] px-2 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[11px] font-semibold"
                >
                  <option value="enemy">Enemigo IA</option>
                  <option value="ally">Aliado / NPC</option>
                  <option value="prop">Prop 3D</option>
                  <option value="goal">Meta / Trofeo</option>
                </select>
                <label className="min-h-[36px] px-2 rounded-lg bg-[#F8FAFC] hover:bg-slate-100 border border-[#CBD5E1] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3 text-[#2563EB]" />
                  <span>Skin PNG</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSkinUpload} className="hidden" />
                </label>
              </div>
              <button
                type="button"
                onClick={handleSaveToAssetLibrary}
                className="w-full min-h-[38px] px-3 rounded-lg bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-bold cursor-pointer"
              >
                Guardar Objeto con Nombre
              </button>
              {savedNotice && (
                <div className="text-[11px] font-semibold text-[#2F6F4E] bg-[#EEF6F1] px-2.5 py-1.5 rounded-lg border border-[#CFE4D7]">
                  {savedNotice}
                </div>
              )}
            </div>
          </div>

          {currentModel.skinCanvas && (
            <div className="p-3.5 border-b border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                Textura / Skin Map
              </span>
              <div className="border border-[#CBD5E1] bg-[#0F172A] rounded-lg p-2 flex items-center justify-center">
                <img
                  src={currentModel.skinCanvas.toDataURL()}
                  alt="Skin texture"
                  className="w-24 h-24 object-contain rounded pixelated"
                />
              </div>
            </div>
          )}

          <div className="p-3.5 flex-1 flex flex-col">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
              Secuencias de Animación
            </span>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {currentModel.animationGroups.map((anim, idx) => {
                const isSelected = activeAnimIndex === idx;
                const frameCount = anim.lastFrame - anim.firstFrame + 1;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnimation(idx)}
                    className={`w-full text-left px-3 min-h-[38px] rounded-lg text-xs flex items-center justify-between transition-colors border ${
                      isSelected
                        ? "bg-[#7C2D48] border-[#7C2D48] text-white font-bold"
                        : "bg-[#F8FAFC] hover:bg-[#F1F5F9] border-[#E2E8F0] text-[#374151]"
                    }`}
                  >
                    <span className="truncate">{anim.name}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? "text-white/80" : "text-[#6B7280]"}`}>
                      {frameCount}f • {anim.fps}fps
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Animation Playback Bar */}
      <div className="bg-white border-t border-[#E2E8F0] px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`min-w-[40px] min-h-[38px] px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
              isPlaying
                ? "bg-[#7C2D48] hover:bg-[#66233A] text-white"
                : "bg-[#2F6F4E] hover:bg-[#25593E] text-white"
            }`}
            title={isPlaying ? "Pausar animación" : "Reproducir animación"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              const anim = currentAnim;
              const prev = currentFrame <= anim.firstFrame ? anim.lastFrame : Math.floor(currentFrame) - 1;
              setCurrentFrame(prev);
              fractionalFrameRef.current = prev;
            }}
            className="px-2.5 min-h-[38px] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#374151] rounded-lg text-xs font-semibold"
            title="Fotograma anterior"
          >
            ◀
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              const anim = currentAnim;
              const next = currentFrame >= anim.lastFrame ? anim.firstFrame : Math.floor(currentFrame) + 1;
              setCurrentFrame(next);
              fractionalFrameRef.current = next;
            }}
            className="px-2.5 min-h-[38px] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#374151] rounded-lg text-xs font-semibold"
            title="Fotograma siguiente"
          >
            ▶
          </button>

          <div className="flex items-center gap-1 ml-1 text-xs">
            {[0.5, 1.0, 1.5, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 min-h-[34px] rounded-md text-[11px] font-bold border ${
                  playbackSpeed === spd
                    ? "bg-[#7C2D48] border-[#7C2D48] text-white"
                    : "bg-[#F8FAFC] border-[#E2E8F0] text-[#4B5563]"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Frame Scrubber Slider */}
        <div className="flex-1 min-w-[180px] flex items-center gap-2.5 max-w-md">
          <span className="text-xs text-[#4B5563] font-mono whitespace-nowrap">
            <strong className="text-[#7C2D48]">{Math.floor(currentFrame)}</strong>/{currentAnim.lastFrame}
          </span>
          <input
            type="range"
            min={currentAnim.firstFrame}
            max={currentAnim.lastFrame}
            step={0.1}
            value={currentFrame}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentFrame(val);
              fractionalFrameRef.current = val;
            }}
            className="flex-1 accent-[#7C2D48] cursor-pointer h-2 bg-[#E2E8F0] rounded-lg"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-[#4B5563] font-medium cursor-pointer select-none min-h-[34px]">
          <input
            type="checkbox"
            checked={interpolate}
            onChange={(e) => setInterpolate(e.target.checked)}
            className="w-4 h-4 rounded border-[#CBD5E1] accent-[#7C2D48]"
          />
          <span>60 FPS suave</span>
        </label>
      </div>
    </div>
  );
};
