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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRequestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const fractionalFrameRef = useRef<number>(0);

  // Load selected built-in model
  useEffect(() => {
    if (selectedModelKey === "hombre" || selectedModelKey === "mujer" || selectedModelKey === "nino" || selectedModelKey === "armado") {
      const charModel = generateDivCharacterModel(selectedModelKey as any);
      setCurrentModel(charModel);
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
      setActiveAnimIndex(0);
      setCurrentFrame(0);
      fractionalFrameRef.current = 0;
    } catch (err: any) {
      setUploadError(err?.message || "Error al cargar archivo 3D");
    }
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

  // Mouse drag & drop controls for 3D Camera
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragMode(e.button === 2 || e.shiftKey ? "pan" : "orbit");
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

  const handleMouseUp = () => setIsDragging(false);

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
    <div id="md2-viewer-window" className="flex flex-col h-full bg-[#070b14] text-slate-200 select-none overflow-hidden font-sans">
      {/* Top Toolbar */}
      <div className="h-11 bg-[#0e172a] border-b border-slate-800 px-3 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs tracking-wide">
            <Box className="w-4 h-4 text-cyan-400" />
            <span>VISOR 3D MD2 / MD3</span>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Model Selector Dropdown */}
          <select
            value={selectedModelKey}
            onChange={(e) => setSelectedModelKey(e.target.value)}
            className="bg-[#1e293b] border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none hover:border-cyan-500 focus:border-cyan-500 transition-colors"
          >
            <optgroup label="Personajes DIV Studio">
              <option value="hombre">Hombre (Mono Azul - Clásico DIV)</option>
              <option value="mujer">Mujer (Túnica Roja)</option>
              <option value="nino">Niño (Ropa Verde)</option>
              <option value="armado">Armado (Soldado Combate)</option>
            </optgroup>
            <optgroup label="Modelos Modo 8 / Hexen">
              <option value="knight">Paladín de Élite (MD2)</option>
              <option value="gargoyle">Gárgola Demonio (MD2)</option>
              <option value="drone">Dron de Asalto (MD3)</option>
              <option value="column">Columna Gótica (MD3)</option>
              <option value="chalice">Cáliz Místico (MD2)</option>
            </optgroup>
            {selectedModelKey === "custom_uploaded" && (
              <option value="custom_uploaded">Archivo Importado ({currentModel.name})</option>
            )}
          </select>

          {/* Upload Custom MD2 / MD3 */}
          <label className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 cursor-pointer text-xs transition-colors">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Abrir .MD2 / .MD3</span>
            <input
              type="file"
              accept=".md2,.md3"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          {/* Render Mode buttons */}
          <div className="flex items-center bg-[#162032] p-0.5 rounded border border-slate-700/80">
            <button
              onClick={() => setRenderMode("shaded")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                renderMode === "shaded" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Polígonos iluminados"
            >
              Sólido
            </button>
            <button
              onClick={() => setRenderMode("wireframe")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                renderMode === "wireframe" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Malla de alambre"
            >
              Malla
            </button>
            <button
              onClick={() => setRenderMode("points")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                renderMode === "points" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Nube de vértices"
            >
              Puntos
            </button>
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded border text-xs transition-colors ${
              showGrid
                ? "bg-cyan-950/60 border-cyan-500/60 text-cyan-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title="Mostrar/ocultar cuadrícula y pedestal"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded border text-xs transition-colors ${
              autoRotate
                ? "bg-amber-950/60 border-amber-500/60 text-amber-300 animate-spin"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title="Rotación orbital automática"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Action: Open in Sprite Generator */}
          {onOpenSpriteGenerator && (
            <button
              onClick={() => onOpenSpriteGenerator(currentModel)}
              className="px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded text-xs shadow flex items-center gap-1.5 transition-all"
              title="Generar sprites 2D para la librería FPG a partir de este modelo"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Crear Sprites 2D</span>
            </button>
          )}

          {/* Copy DIV code */}
          <button
            onClick={handleCopyCode}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 transition-colors"
            title="Copiar código m8_add_model(...) para DIV Games Studio"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? "Copiado" : "Código DIV"}</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="bg-rose-950/80 border-b border-rose-800 text-rose-200 text-xs px-3 py-1.5 flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-white font-bold">×</button>
        </div>
      )}

      {/* Main Viewport & Sidebar Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Interactive Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-contain cursor-grab active:cursor-grabbing select-none"
          />

          {/* On-screen Camera Info Overlay */}
          <div className="absolute top-2 left-2 bg-[#090d16]/80 backdrop-blur-sm border border-slate-800 rounded px-2.5 py-1.5 text-[11px] text-slate-400 pointer-events-none flex items-center gap-3">
            <span>Rotación: <strong className="text-cyan-400">{Math.round(yaw)}°</strong></span>
            <span>Persp: <strong className="text-cyan-400">{Math.round(pitch)}°</strong></span>
            <span>Zoom: <strong className="text-cyan-400">{zoom.toFixed(2)}x</strong></span>
            <span className="text-slate-500">(Arrastra para rotar • Rueda para zoom)</span>
          </div>

          {/* Reset View Button */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <button
              onClick={() => {
                setYaw(30);
                setPitch(15);
                setZoom(1.2);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1.5 bg-[#0e172a]/80 hover:bg-[#1e293b] border border-slate-700 text-slate-300 rounded shadow text-xs transition-colors"
              title="Restablecer posición de cámara"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((prev) => Math.min(3.5, prev * 1.2))}
              className="p-1.5 bg-[#0e172a]/80 hover:bg-[#1e293b] border border-slate-700 text-slate-300 rounded shadow text-xs transition-colors"
              title="Acercar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((prev) => Math.max(0.4, prev / 1.2))}
              className="p-1.5 bg-[#0e172a]/80 hover:bg-[#1e293b] border border-slate-700 text-slate-300 rounded shadow text-xs transition-colors"
              title="Alejar zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Inspector & Animation Panel */}
        <div className="w-72 bg-[#0a0f1d] border-l border-slate-800 flex flex-col overflow-y-auto">
          {/* Model Header Info */}
          <div className="p-3 border-b border-slate-800/80 bg-[#0e172a]/50">
            <h3 className="font-semibold text-slate-100 text-sm flex items-center justify-between">
              <span>{currentModel.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                {currentModel.format.toUpperCase()}
              </span>
            </h3>

            {/* Geometry stats */}
            <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs text-slate-400">
              <div className="bg-[#121c30] p-1.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Vértices:</span>
                <strong className="text-slate-200 font-mono">
                  {currentModel.frames[0]?.vertices.length || 0}
                </strong>
              </div>
              <div className="bg-[#121c30] p-1.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Polígonos:</span>
                <strong className="text-slate-200 font-mono">
                  {currentModel.triangles.length}
                </strong>
              </div>
              <div className="bg-[#121c30] p-1.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Fotogramas:</span>
                <strong className="text-slate-200 font-mono">
                  {currentModel.frames.length}
                </strong>
              </div>
              <div className="bg-[#121c30] p-1.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Animaciones:</span>
                <strong className="text-slate-200 font-mono">
                  {currentModel.animationGroups.length}
                </strong>
              </div>
            </div>
          </div>

          {/* Skin Texture Preview */}
          {currentModel.skinCanvas && (
            <div className="p-3 border-b border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Textura / Skin Map
              </span>
              <div className="border border-slate-700 bg-slate-900 rounded p-1 flex items-center justify-center">
                <img
                  src={currentModel.skinCanvas.toDataURL()}
                  alt="Skin texture"
                  className="w-24 h-24 object-contain rounded pixelated border border-slate-800"
                />
              </div>
            </div>
          )}

          {/* Animations List */}
          <div className="p-3 flex-1 flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Secuencias de Animación
            </span>

            <div className="flex-1 overflow-y-auto space-y-1 max-h-60 pr-1">
              {currentModel.animationGroups.map((anim, idx) => {
                const isSelected = activeAnimIndex === idx;
                const frameCount = anim.lastFrame - anim.firstFrame + 1;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnimation(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-cyan-950 border border-cyan-500/80 text-cyan-200 font-medium"
                        : "bg-[#11192a] hover:bg-[#18233a] border border-slate-800/80 text-slate-300"
                    }`}
                  >
                    <span className="truncate">{anim.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {frameCount} f ({anim.fps} fps)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Animation Playback Bar */}
      <div className="h-14 bg-[#0a101f] border-t border-slate-800 px-4 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
            title={isPlaying ? "Pausar animación" : "Reproducir animación"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Step Prev */}
          <button
            onClick={() => {
              setIsPlaying(false);
              const anim = currentAnim;
              const prev = currentFrame <= anim.firstFrame ? anim.lastFrame : Math.floor(currentFrame) - 1;
              setCurrentFrame(prev);
              fractionalFrameRef.current = prev;
            }}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
            title="Fotograma anterior"
          >
            ◀ Paso
          </button>

          {/* Step Next */}
          <button
            onClick={() => {
              setIsPlaying(false);
              const anim = currentAnim;
              const next = currentFrame >= anim.lastFrame ? anim.firstFrame : Math.floor(currentFrame) + 1;
              setCurrentFrame(next);
              fractionalFrameRef.current = next;
            }}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
            title="Fotograma siguiente"
          >
            Paso ▶
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 ml-2 text-xs text-slate-400">
            <span>Velocidad:</span>
            {[0.5, 1.0, 1.5, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[11px] ${
                  playbackSpeed === spd
                    ? "bg-cyan-700 text-white font-bold"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Frame Scrubber Slider */}
        <div className="flex-1 flex items-center gap-3 max-w-md">
          <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
            Frame: <strong className="text-cyan-400">{Math.floor(currentFrame)}</strong> / {currentAnim.lastFrame}
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
            className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Interpolation Toggle */}
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={interpolate}
            onChange={(e) => setInterpolate(e.target.checked)}
            className="rounded border-slate-700 text-cyan-600 focus:ring-0"
          />
          <span>Interpolación 60 FPS</span>
        </label>
      </div>
    </div>
  );
};
