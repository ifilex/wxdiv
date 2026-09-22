import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Film,
  Play,
  Pause,
  Layers,
  Sparkles,
  Download,
  Copy,
  Check,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Box,
  Image as ImageIcon,
} from "lucide-react";
import { DivGraphic } from "../types";
import {
  generateDivCharacterModel,
  createCharacterSkinCanvas,
  ParsedMD2Model,
} from "../engine/md2Parser";
import { BUILTIN_3D_MODELS } from "../engine/mode8Enhanced";

interface SpriteGeneratorProps {
  fpg: DivGraphic[];
  onUpdateFpg: (fpg: DivGraphic[]) => void;
  onClose?: () => void;
  onInsertCode?: (code: string) => void;
  initialModel?: ParsedMD2Model;
}

export const SpriteGenerator: React.FC<SpriteGeneratorProps> = ({
  fpg,
  onUpdateFpg,
  onClose,
  onInsertCode,
  initialModel,
}) => {
  // Model & Archetype selection
  const [selectedArchetype, setSelectedArchetype] = useState<"hombre" | "mujer" | "nino" | "armado" | "knight" | "gargoyle">(
    "hombre"
  );
  const [currentModel, setCurrentModel] = useState<ParsedMD2Model>(() =>
    initialModel || generateDivCharacterModel("hombre")
  );

  // Animation selection (matching DIV screenshot)
  const [selectedAnimName, setSelectedAnimName] = useState<string>("CORRER");
  const [activeAnimIndex, setActiveAnimIndex] = useState<number>(3); // CORRER is index 3 in our model

  // Parameters from authentic DIV window
  const [scalePercent, setScalePercent] = useState<number>(100); // "Tamaño (%)"
  const [numImages, setNumImages] = useState<number>(16); // "Imágenes" (total frames to bake)
  const [rotationAngle, setRotationAngle] = useState<number>(0); // "Rotac. (0..360)"
  const [perspectiveAngle, setPerspectiveAngle] = useState<number>(0); // "Persp. (0..90)"
  const [directionMode, setDirectionMode] = useState<"1_dir" | "4_dir" | "8_dir">("1_dir");

  // Playback preview state
  const [previewFrame, setPreviewFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Baking state
  const [bakedFrames, setBakedFrames] = useState<string[]>([]);
  const [isBaking, setIsBaking] = useState<boolean>(false);
  const [acceptedToast, setAcceptedToast] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const skinCanvasRef = useRef<HTMLCanvasElement>(null);
  const animLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const fractionalFrameRef = useRef<number>(0);

  // Update model when archetype changes
  useEffect(() => {
    if (selectedArchetype === "hombre" || selectedArchetype === "mujer" || selectedArchetype === "nino" || selectedArchetype === "armado") {
      const charModel = generateDivCharacterModel(selectedArchetype);
      setCurrentModel(charModel);
    } else {
      const builtin = BUILTIN_3D_MODELS[selectedArchetype];
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
      }
    }
  }, [selectedArchetype]);

  // Sync animation index when selectedAnimName changes
  useEffect(() => {
    const idx = currentModel.animationGroups.findIndex(
      (a) => a.name.toUpperCase() === selectedAnimName.toUpperCase()
    );
    if (idx !== -1) {
      setActiveAnimIndex(idx);
      const group = currentModel.animationGroups[idx];
      setPreviewFrame(group.firstFrame);
      fractionalFrameRef.current = group.firstFrame;
    }
  }, [selectedAnimName, currentModel]);

  // Draw skin texture canvas (Left Top box from DIV screenshot)
  useEffect(() => {
    const canvas = skinCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (currentModel.skinCanvas) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(currentModel.skinCanvas, 0, 0, canvas.width, canvas.height);
    } else {
      // Fallback procedural swatch
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(10, 10, 50, 80);
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(68, 10, 50, 80);
    }
  }, [currentModel]);

  // Render 3D frame function onto any canvas (used for interactive viewport AND baking)
  const renderFrameToContext = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      frameIdx: number,
      yawDeg: number,
      pitchDeg: number,
      scalePct: number,
      transparentBg: boolean = false
    ) => {
      // Clear
      if (transparentBg) {
        ctx.clearRect(0, 0, width, height);
      } else {
        // Classic DIV Slate Gray Viewport Background
        ctx.fillStyle = "#3a4454";
        ctx.fillRect(0, 0, width, height);

        // Center crosshair / grid (authentic DIV look)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      if (!currentModel || currentModel.frames.length === 0) return;

      const fA = Math.floor(frameIdx);
      const fB = Math.min(currentModel.frames.length - 1, fA + 1);
      const lerpT = frameIdx - fA;

      const frameDataA = currentModel.frames[fA] || currentModel.frames[0];
      const frameDataB = currentModel.frames[fB] || frameDataA;
      if (!frameDataA) return;

      const vertA = frameDataA.vertices;
      const vertB = frameDataB.vertices;

      const yawRad = (yawDeg * Math.PI) / 180;
      const pitchRad = (pitchDeg * Math.PI) / 180;
      const cosYaw = Math.cos(yawRad);
      const sinYaw = Math.sin(yawRad);
      const cosPitch = Math.cos(pitchRad);
      const sinPitch = Math.sin(pitchRad);

      const zoomFactor = (scalePct / 100) * (height / 2.1);
      const centerX = width / 2;
      const centerY = height / 2 + 10;
      const cameraDist = 2.4;

      // Project vertices
      const projected = vertA.map((va, i) => {
        const vb = vertB[i] || va;
        const vx = va.x + (vb.x - va.x) * lerpT;
        const vy = va.y + (vb.y - va.y) * lerpT;
        const vz = va.z + (vb.z - va.z) * lerpT;

        // Yaw around Z
        const rx1 = vx * cosYaw - vy * sinYaw;
        const ry1 = vx * sinYaw + vy * cosYaw;
        const rz1 = vz;

        // Pitch around X
        const rx2 = rx1;
        const ry2 = ry1 * cosPitch - rz1 * sinPitch;
        const rz2 = ry1 * sinPitch + rz1 * cosPitch;

        const depth = cameraDist + ry2;
        const factor = depth > 0.1 ? zoomFactor / depth : 0;

        const sx = centerX + rx2 * factor;
        const sy = centerY - rz2 * factor;

        return { sx, sy, depth, rx: rx2, ry: ry2, rz: rz2, vx, vy, vz };
      });

      // Triangles depth-sorting
      const lightDir = { x: 0.4, y: -0.6, z: 0.7 };
      const lLen = Math.hypot(lightDir.x, lightDir.y, lightDir.z);
      lightDir.x /= lLen;
      lightDir.y /= lLen;
      lightDir.z /= lLen;

      interface RTri {
        tri: (typeof currentModel.triangles)[0];
        p0: (typeof projected)[0];
        p1: (typeof projected)[0];
        p2: (typeof projected)[0];
        depth: number;
        intensity: number;
      }

      const rTris: RTri[] = [];

      for (const tri of currentModel.triangles) {
        const p0 = projected[tri.v[0]];
        const p1 = projected[tri.v[1]];
        const p2 = projected[tri.v[2]];
        if (!p0 || !p1 || !p2) continue;

        const depth = (p0.depth + p1.depth + p2.depth) / 3;

        // Normal
        const ax = p1.vx - p0.vx;
        const ay = p1.vy - p0.vy;
        const az = p1.vz - p0.vz;
        const bx = p2.vx - p0.vx;
        const by = p2.vy - p0.vy;
        const bz = p2.vz - p0.vz;

        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        const nLen = Math.hypot(nx, ny, nz) || 1;

        const dot = (nx / nLen) * lightDir.x + (ny / nLen) * lightDir.y + (nz / nLen) * lightDir.z;
        const intensity = Math.min(1.0, Math.max(0.2, (dot + 1) / 2));

        rTris.push({ tri, p0, p1, p2, depth, intensity });
      }

      rTris.sort((a, b) => b.depth - a.depth);

      // Draw triangles
      for (const rt of rTris) {
        const { p0, p1, p2, tri, intensity } = rt;
        ctx.beginPath();
        ctx.moveTo(p0.sx, p0.sy);
        ctx.lineTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.closePath();

        // Shaded color
        let baseColor = tri.color || "#38bdf8";
        if (baseColor.startsWith("#") && baseColor.length >= 7) {
          const r = parseInt(baseColor.slice(1, 3), 16);
          const g = parseInt(baseColor.slice(3, 5), 16);
          const b = parseInt(baseColor.slice(5, 7), 16);
          const nr = Math.min(255, Math.round(r * intensity));
          const ng = Math.min(255, Math.round(g * intensity));
          const nb = Math.min(255, Math.round(b * intensity));
          ctx.fillStyle = `rgb(${nr}, ${ng}, ${nb})`;
        } else {
          ctx.fillStyle = baseColor;
        }

        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.18)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    },
    [currentModel]
  );

  // Live animation playback loop for interactive 3D preview viewport
  useEffect(() => {
    let animId: number;

    const loop = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (isPlaying && currentModel.animationGroups.length > 0) {
        const group = currentModel.animationGroups[activeAnimIndex] || {
          firstFrame: 0,
          lastFrame: Math.max(0, currentModel.frames.length - 1),
          fps: 10,
        };

        const advance = group.fps * delta;
        fractionalFrameRef.current += advance;
        if (fractionalFrameRef.current > group.lastFrame) {
          fractionalFrameRef.current = group.firstFrame;
        }

        setPreviewFrame(fractionalFrameRef.current);
      }

      // Render to preview canvas
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          renderFrameToContext(
            ctx,
            canvas.width,
            canvas.height,
            fractionalFrameRef.current,
            rotationAngle,
            perspectiveAngle,
            scalePercent,
            false
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    isPlaying,
    currentModel,
    activeAnimIndex,
    rotationAngle,
    perspectiveAngle,
    scalePercent,
    renderFrameToContext,
  ]);

  // Bake frames when parameters change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      bakeSpriteFilmstrip();
    }, 150);
    return () => clearTimeout(timer);
  }, [
    currentModel,
    activeAnimIndex,
    scalePercent,
    numImages,
    rotationAngle,
    perspectiveAngle,
    directionMode,
  ]);

  // Bakes 3D animation into discrete 2D sprite frames
  const bakeSpriteFilmstrip = () => {
    if (!currentModel || currentModel.animationGroups.length === 0) return;

    const group = currentModel.animationGroups[activeAnimIndex] || {
      firstFrame: 0,
      lastFrame: Math.max(0, currentModel.frames.length - 1),
      fps: 10,
    };

    const totalAnimFrames = Math.max(1, group.lastFrame - group.firstFrame + 1);
    const framesToGenerate = Math.max(1, Math.min(64, numImages));

    // Determine angle steps
    const angles: number[] = [];
    if (directionMode === "1_dir") {
      angles.push(rotationAngle);
    } else if (directionMode === "4_dir") {
      angles.push(0, 90, 180, 270);
    } else {
      // 8 directions (classic DIV / Doom)
      for (let d = 0; d < 8; d++) {
        angles.push(d * 45);
      }
    }

    const offscreen = document.createElement("canvas");
    // Standard sprite size based on scale
    const spriteSize = Math.round(64 * (scalePercent / 100));
    offscreen.width = Math.max(32, Math.min(256, spriteSize));
    offscreen.height = Math.max(32, Math.min(256, spriteSize));
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    const results: string[] = [];

    for (const ang of angles) {
      for (let i = 0; i < framesToGenerate; i++) {
        const frameIdx =
          group.firstFrame + (i / Math.max(1, framesToGenerate - 1)) * (totalAnimFrames - 1);

        renderFrameToContext(
          ctx,
          offscreen.width,
          offscreen.height,
          frameIdx,
          ang,
          perspectiveAngle,
          scalePercent,
          true // Transparent background for sprites
        );

        results.push(offscreen.toDataURL("image/png"));
      }
    }

    setBakedFrames(results);
  };

  // "Aceptar" Action: Add baked sprites into the project's FPG
  const handleAcceptAndAddToFpg = () => {
    if (bakedFrames.length === 0) return;

    setIsBaking(true);

    // Find next available graph ID in FPG (e.g. 100, 200, or max + 1)
    const existingIds = fpg.map((g) => g.id);
    let startId = 100;
    while (existingIds.includes(startId)) {
      startId += 100;
    }

    const spriteWidth = Math.max(32, Math.min(256, Math.round(64 * (scalePercent / 100))));
    const spriteHeight = spriteWidth;
    const animClean = selectedAnimName.toLowerCase().replace(/[^a-z0-9]/g, "");

    const newGraphics: DivGraphic[] = bakedFrames.map((dataUrl, idx) => {
      const graphId = startId + idx;
      return {
        id: graphId,
        name: `${selectedArchetype}_${animClean}_${String(idx + 1).padStart(2, "0")}`,
        width: spriteWidth,
        height: spriteHeight,
        dataUrl,
        // Center control point at the base (feet) for proper DIV positioning
        controlPoints: [{ x: Math.round(spriteWidth / 2), y: spriteHeight - 2 }],
      };
    });

    onUpdateFpg([...fpg, ...newGraphics]);
    setIsBaking(false);

    setAcceptedToast(
      `¡Se añadieron ${newGraphics.length} sprites a la librería FPG! (IDs: ${startId}..${
        startId + newGraphics.length - 1
      })`
    );

    // Generate DIV code snippet
    const divSnippet = `// Proceso con animación generada desde 3D\nPROCESS ${selectedArchetype}_${animClean}(x, y)\nPRIVATE\n  frame_num = 0;\n  total_frames = ${bakedFrames.length};\nBEGIN\n  LOOP\n    graph = ${startId} + (frame_num % total_frames);\n    frame_num++;\n    FRAME;\n  END\nEND`;

    if (onInsertCode) {
      onInsertCode(divSnippet);
    }

    setTimeout(() => setAcceptedToast(null), 4000);
  };

  // Download Spritesheet PNG
  const handleDownloadSpriteSheet = () => {
    if (bakedFrames.length === 0) return;

    const cols = Math.min(8, bakedFrames.length);
    const rows = Math.ceil(bakedFrames.length / cols);
    const spriteSize = Math.max(32, Math.round(64 * (scalePercent / 100)));

    const sheetCanvas = document.createElement("canvas");
    sheetCanvas.width = cols * spriteSize;
    sheetCanvas.height = rows * spriteSize;
    const ctx = sheetCanvas.getContext("2d");
    if (!ctx) return;

    let loaded = 0;
    bakedFrames.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        ctx.drawImage(img, c * spriteSize, r * spriteSize, spriteSize, spriteSize);
        loaded++;
        if (loaded === bakedFrames.length) {
          const a = document.createElement("a");
          a.download = `spritesheet_${selectedArchetype}_${selectedAnimName.toLowerCase()}.png`;
          a.href = sheetCanvas.toDataURL("image/png");
          a.click();
        }
      };
      img.src = src;
    });
  };

  // Authentic animations list from DIV screenshot
  const divAnimationsList = [
    "GOLPE",
    "ANDAR",
    "ANDAR2",
    "CORRER",
    "AGACHAR",
    "IMPACTO",
    "IMPACT02",
    "SALTO",
    "MORIR",
    "REPOSO",
  ];

  return (
    <div
      id="div-sprite-generator-window"
      className="flex flex-col h-full bg-[#303848] text-slate-100 font-sans select-none overflow-hidden border-2 border-[#162238] shadow-2xl"
    >
      {/* Authentic DIV Games Studio 2 Title Bar */}
      <div className="h-7 bg-[#1c2e78] border-b-2 border-[#0e163c] px-2 flex items-center justify-between flex-shrink-0 text-white font-bold text-xs tracking-wider">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-cyan-300" />
          <span>Generador de sprites</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-4 h-4 bg-[#2b419c] hover:bg-rose-600 border border-white/50 text-white flex items-center justify-center font-bold text-[10px] rounded-xs"
            title="Cerrar ventana"
          >
            ×
          </button>
        )}
      </div>

      {acceptedToast && (
        <div className="bg-emerald-900 border-b border-emerald-600 text-emerald-100 text-xs px-3 py-1 flex items-center justify-between">
          <span>{acceptedToast}</span>
          <button onClick={() => setAcceptedToast(null)} className="font-bold text-emerald-300">×</button>
        </div>
      )}

      {/* Main Container - Exact Layout from Screenshot */}
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto bg-[#303848]">
        {/* Top Split: Left Skin Texture / Right 3D Viewport */}
        <div className="grid grid-cols-2 gap-2 h-44 flex-shrink-0">
          {/* Left: Texture Skin Mapping Viewport */}
          <div className="border-2 border-[#162238] bg-[#1a2230] p-1 flex flex-col relative">
            <div className="text-[10px] text-slate-400 font-semibold mb-0.5 px-1 flex items-center justify-between">
              <span>Textura / Skin Map</span>
              <span className="text-cyan-400 font-mono">128x128</span>
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#101722] overflow-hidden border border-black/40">
              <canvas
                ref={skinCanvasRef}
                width={128}
                height={128}
                className="w-full h-full object-contain pixelated"
              />
            </div>
          </div>

          {/* Right: 3D Interactive Viewport (DIV Style) */}
          <div className="border-2 border-[#162238] bg-[#1a2230] p-1 flex flex-col relative">
            <div className="text-[10px] text-slate-400 font-semibold mb-0.5 px-1 flex items-center justify-between">
              <span>Vista 3D: {selectedAnimName}</span>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-cyan-400 hover:text-white font-mono text-[10px] flex items-center gap-1"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlaying ? "Animando" : "Pausa"}</span>
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#3a4454] overflow-hidden border border-black/40 relative">
              <canvas
                ref={previewCanvasRef}
                width={160}
                height={140}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Middle Controls Row 1: Tamaño (%) & Imágenes with Stepper Buttons */}
        <div className="grid grid-cols-2 gap-3 items-center bg-[#252c3a] p-2 border border-[#1c2432] rounded">
          {/* Tamaño (%) */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              Tamaño (%)
            </label>
            <input
              type="number"
              min={25}
              max={300}
              step={10}
              value={scalePercent}
              onChange={(e) => setScalePercent(Math.max(25, Math.min(300, parseInt(e.target.value) || 100)))}
              className="w-20 bg-[#161c28] border border-[#3e485e] text-white px-2 py-1 text-xs font-mono font-bold rounded outline-none focus:border-cyan-400"
            />
            <div className="flex gap-1">
              {[50, 100, 150].map((val) => (
                <button
                  key={val}
                  onClick={() => setScalePercent(val)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border ${
                    scalePercent === val
                      ? "bg-cyan-700 border-cyan-400 text-white font-bold"
                      : "bg-[#182030] border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>

          {/* Imágenes with << and >> */}
          <div className="flex items-center gap-2 justify-end">
            <label className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              Imágenes
            </label>
            <input
              type="number"
              min={1}
              max={64}
              value={numImages}
              onChange={(e) => setNumImages(Math.max(1, Math.min(64, parseInt(e.target.value) || 16)))}
              className="w-16 bg-[#161c28] border border-[#3e485e] text-white px-2 py-1 text-xs font-mono font-bold rounded outline-none focus:border-cyan-400"
            />
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setNumImages((prev) => Math.max(1, prev - 2))}
                className="px-2 py-1 bg-[#1a2336] hover:bg-[#25324c] border border-slate-600 text-slate-200 rounded text-xs font-bold font-mono"
                title="Menos imágenes"
              >
                &lt;&lt;
              </button>
              <button
                onClick={() => setNumImages((prev) => Math.min(64, prev + 2))}
                className="px-2 py-1 bg-[#1a2336] hover:bg-[#25324c] border border-slate-600 text-slate-200 rounded text-xs font-bold font-mono"
                title="Más imágenes"
              >
                &gt;&gt;
              </button>
            </div>
          </div>
        </div>

        {/* Character Archetype Checkboxes (Hombre, Mujer, Niño, Armado) */}
        <div className="flex items-center gap-4 py-1 px-2 bg-[#283244] border border-[#1e2636] rounded text-xs font-semibold">
          {[
            { id: "hombre", label: "Hombre" },
            { id: "mujer", label: "Mujer" },
            { id: "nino", label: "Niño" },
            { id: "armado", label: "Armado" },
            { id: "knight", label: "Paladín MD2" },
            { id: "gargoyle", label: "Gárgola MD2" },
          ].map((arch) => {
            const isSelected = selectedArchetype === arch.id;
            return (
              <label
                key={arch.id}
                onClick={() => setSelectedArchetype(arch.id as any)}
                className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-300 transition-colors"
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400 fill-cyan-950" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{arch.label}</span>
              </label>
            );
          })}
        </div>

        {/* Middle Controls Row 2: Animación Label & List Box + Rotac. & Persp. */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-[140px]">
          {/* Left: Animation List Box */}
          <div className="flex flex-col bg-[#222a38] border border-[#161e2c] p-2 rounded">
            <div className="text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Animación: <strong className="text-cyan-400">{selectedAnimName}</strong></span>
              <span className="text-[10px] text-slate-400 font-mono">10 secuencias</span>
            </div>

            {/* Scrollable list of animations */}
            <div className="flex-1 overflow-y-auto bg-[#141b26] border border-slate-700 rounded p-1 space-y-0.5">
              {divAnimationsList.map((animName) => {
                const isSelected = selectedAnimName === animName;
                return (
                  <button
                    key={animName}
                    onClick={() => setSelectedAnimName(animName)}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-mono font-bold transition-colors ${
                      isSelected
                        ? "bg-[#183a78] text-cyan-200 border border-cyan-400"
                        : "text-slate-300 hover:bg-[#1f2a3c] hover:text-white"
                    }`}
                  >
                    {animName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Rotac. (0..360) and Persp. (0..90) Sliders & Directions */}
          <div className="flex flex-col justify-between bg-[#222a38] border border-[#161e2c] p-2.5 rounded gap-2 text-xs">
            {/* Rotation Control */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200">Rotac. (0..360)</span>
                <span className="font-mono font-bold text-cyan-400">{rotationAngle}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={rotationAngle}
                onChange={(e) => setRotationAngle(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            {/* Perspective Control */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200">Persp. (0..90)</span>
                <span className="font-mono font-bold text-cyan-400">{perspectiveAngle}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={perspectiveAngle}
                onChange={(e) => setPerspectiveAngle(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            {/* Multi-angle Direction Mode */}
            <div className="bg-[#141b26] p-1.5 rounded border border-slate-700">
              <span className="text-[10px] text-slate-400 block mb-1">Modo de Generación:</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setDirectionMode("1_dir")}
                  className={`py-1 rounded text-[10px] font-bold border ${
                    directionMode === "1_dir"
                      ? "bg-cyan-700 border-cyan-400 text-white"
                      : "bg-[#1e2838] border-slate-700 text-slate-300"
                  }`}
                >
                  1 Ángulo
                </button>
                <button
                  onClick={() => setDirectionMode("4_dir")}
                  className={`py-1 rounded text-[10px] font-bold border ${
                    directionMode === "4_dir"
                      ? "bg-cyan-700 border-cyan-400 text-white"
                      : "bg-[#1e2838] border-slate-700 text-slate-300"
                  }`}
                >
                  4 Direc.
                </button>
                <button
                  onClick={() => setDirectionMode("8_dir")}
                  className={`py-1 rounded text-[10px] font-bold border ${
                    directionMode === "8_dir"
                      ? "bg-cyan-700 border-cyan-400 text-white"
                      : "bg-[#1e2838] border-slate-700 text-slate-300"
                  }`}
                  title="8 Direcciones estilo DIV / Doom / Hexen"
                >
                  8 Direc.
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filmstrip Preview of Generated Frames */}
        <div className="bg-[#18202e] border border-[#141a24] p-2 rounded flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Tira de Sprites Generados ({bakedFrames.length} cuadros):</span>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadSpriteSheet}
                className="text-cyan-400 hover:text-white font-medium flex items-center gap-1"
                title="Descargar hoja de sprites PNG"
              >
                <Download className="w-3 h-3" />
                <span>Hoja PNG</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1 h-14 bg-[#0d131d] rounded px-1.5 border border-slate-800">
            {bakedFrames.map((src, i) => (
              <div
                key={i}
                className="w-10 h-10 flex-shrink-0 bg-[#161e2a] border border-slate-700 rounded flex items-center justify-center relative overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(45deg, #18202c 25%, transparent 25%), linear-gradient(-45deg, #18202c 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18202c 75%), linear-gradient(-45deg, transparent 75%, #18202c 75%)`,
                  backgroundSize: "8px 8px",
                  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                }}
              >
                <img src={src} alt={`frame ${i}`} className="w-full h-full object-contain pixelated" />
                <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] font-mono text-cyan-400 px-0.5">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Authentic Action Buttons: Aceptar and Cancelar */}
        <div className="flex items-center justify-end gap-3 pt-1 border-t border-[#202938]">
          <button
            onClick={handleAcceptAndAddToFpg}
            disabled={isBaking || bakedFrames.length === 0}
            className="px-6 py-1.5 bg-[#183a78] hover:bg-[#204a99] active:bg-[#122e60] border-2 border-[#4570c0] hover:border-cyan-400 text-white font-bold text-xs rounded shadow transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 text-cyan-300" />
            <span>Aceptar</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-1.5 bg-[#252c3a] hover:bg-[#343e52] border border-slate-600 text-slate-300 font-bold text-xs rounded transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
