import React, { useState, useRef, useEffect } from "react";
import {
  Flame,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sliders,
  Plus,
  FileCode,
  Download,
  Layers,
  Zap,
  Check,
} from "lucide-react";
import { DivGraphic } from "../types";
import { DEFAULT_PALETTE, createGraphicCanvas } from "../engine/graphics";

interface ExplosionCreatorProps {
  fpg: DivGraphic[];
  onAddFramesToFpg: (newFrames: DivGraphic[]) => void;
  onInsertCode: (snippet: string) => void;
}

type ExplosionStyle = "fire" | "plasma" | "toxic" | "nuclear";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colorIdx: number;
  life: number;
}

export const ExplosionCreator: React.FC<ExplosionCreatorProps> = ({
  fpg,
  onAddFramesToFpg,
  onInsertCode,
}) => {
  const [style, setStyle] = useState<ExplosionStyle>("fire");
  const [frameCount, setFrameCount] = useState<number>(8);
  const [resolution, setResolution] = useState<number>(48); // 32, 48, 64
  const [particleCount, setParticleCount] = useState<number>(45);
  const [blastSpeed, setBlastSpeed] = useState<number>(3.2);
  const [riseAmount, setRiseAmount] = useState<number>(0.4);
  const [smokeDensity, setSmokeDensity] = useState<number>(0.6);
  const [seed, setSeed] = useState<number>(1);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [fps, setFps] = useState<number>(18);
  const [renderedFrames, setRenderedFrames] = useState<number[][][]>([]);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate explosion frames based on simulation physics
  const generateExplosionFrames = () => {
    const frames: number[][][] = [];
    const center = resolution / 2;

    // Palette gradient definitions (indices in DEFAULT_PALETTE)
    // 0: transparent, 1: black, 2: white, 3: red, 4: green, 5: blue, 6: yellow, 7: cyan, 8: magenta, 9: orange
    const colorRamps: Record<ExplosionStyle, number[]> = {
      fire: [2, 6, 9, 3, 10, 11, 1], // White -> Yellow -> Orange -> Crimson -> Dark Red -> Gray -> Black
      plasma: [2, 7, 5, 8, 12, 1], // White -> Cyan -> Blue -> Purple -> Dark Blue -> Black
      toxic: [2, 6, 4, 13, 11, 1], // White -> Yellow -> Acid Lime -> Dark Green -> Dark Ash -> Black
      nuclear: [2, 6, 9, 3, 10, 14, 1], // Pure White flash -> Yellow -> Fire -> Ash
    };
    const ramp = colorRamps[style];

    // Seeded pseudo-random generator
    let s = seed;
    const random = () => {
      const x = Math.sin(s++) * 10000;
      return x - Math.floor(x);
    };

    // Initialize particles
    const particles: Particle[] = [];
    for (let p = 0; p < particleCount; p++) {
      const angle = random() * Math.PI * 2;
      const speed = (random() * 0.7 + 0.3) * blastSpeed;
      particles.push({
        x: center + (random() - 0.5) * 4,
        y: center + (random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - riseAmount * random(),
        size: random() * 4 + 2,
        colorIdx: 0,
        life: 1.0,
      });
    }

    // Simulate each frame
    for (let f = 0; f < frameCount; f++) {
      const framePixels: number[][] = [];
      for (let y = 0; y < resolution; y++) {
        framePixels.push(new Array(resolution).fill(0));
      }

      const progress = f / (frameCount - 1);

      // Core flash in early frames
      if (f <= 2) {
        const flashRadius = (center * 0.4) * (1 - f * 0.4);
        for (let y = 0; y < resolution; y++) {
          for (let x = 0; x < resolution; x++) {
            const dist = Math.hypot(x - center, y - center);
            if (dist < flashRadius) {
              framePixels[y][x] = ramp[0]; // Flash color (pure white)
            }
          }
        }
      }

      // Draw and advance particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= riseAmount * 0.1; // rise up like hot smoke
        p.vx *= 0.94; // air resistance
        p.vy *= 0.94;

        // Particle color progression across lifetime
        const pProgress = Math.min(1.0, progress + (1 - p.life) * 0.3);
        const rampIdx = Math.min(ramp.length - 1, Math.floor(pProgress * ramp.length));
        const color = ramp[rampIdx];

        // Particle size expands then dissipates
        const curRadius = Math.max(1, Math.round(p.size * (1 + progress * 0.8) * (1 - progress * 0.4)));

        for (let dy = -curRadius; dy <= curRadius; dy++) {
          for (let dx = -curRadius; dx <= curRadius; dx++) {
            if (dx * dx + dy * dy <= curRadius * curRadius) {
              const px = Math.floor(p.x + dx);
              const py = Math.floor(p.y + dy);
              if (px >= 0 && px < resolution && py >= 0 && py < resolution) {
                // If cell is empty or current particle is hotter/denser, overwrite
                if (framePixels[py][px] === 0 || rampIdx < 3) {
                  framePixels[py][px] = color;
                }
              }
            }
          }
        }
      }

      frames.push(framePixels);
    }

    setRenderedFrames(frames);
  };

  // Re-generate frames when parameters change
  useEffect(() => {
    generateExplosionFrames();
  }, [style, frameCount, resolution, particleCount, blastSpeed, riseAmount, smokeDensity, seed]);

  // Animation playback loop
  useEffect(() => {
    if (!isPlaying || renderedFrames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % renderedFrames.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, renderedFrames, fps]);

  // Render current frame to main preview canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || renderedFrames.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixels = renderedFrames[currentFrameIdx];
    if (!pixels) return;

    const w = resolution;
    const h = resolution;
    const pixelSize = canvas.width / w;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Checkerboard transparent background
    const tileSize = 8;
    for (let y = 0; y < canvas.height; y += tileSize) {
      for (let x = 0; x < canvas.width; x += tileSize) {
        ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? "#111827" : "#090d16";
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // Draw frame pixels
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cIdx = pixels[y]?.[x] || 0;
        if (cIdx !== 0) {
          ctx.fillStyle = DEFAULT_PALETTE[cIdx] || "#ffffff";
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }, [currentFrameIdx, renderedFrames, resolution]);

  // Add all generated explosion frames directly into FPG
  const handleAddToFpg = () => {
    if (renderedFrames.length === 0) return;

    // Determine next available ID
    const maxExistingId = fpg.reduce((max, g) => Math.max(max, g.id), 0);
    const startId = Math.max(40, maxExistingId + 1);

    const newGraphics: DivGraphic[] = renderedFrames.map((pixels, idx) => {
      const gId = startId + idx;
      const desc = `Explosion Frame #${idx + 1} (${style})`;
      const baseGraphic: DivGraphic = {
        id: gId,
        name: `expl_${style}_${idx + 1}`,
        description: desc,
        width: resolution,
        height: resolution,
        cx: Math.floor(resolution / 2),
        cy: Math.floor(resolution / 2),
        cpoints: [{ id: 0, x: Math.floor(resolution / 2), y: Math.floor(resolution / 2) }],
        pixels,
        palette: DEFAULT_PALETTE,
      };
      baseGraphic.canvas = createGraphicCanvas(baseGraphic);
      try {
        baseGraphic.dataUrl = baseGraphic.canvas.toDataURL();
      } catch (e) {}

      return baseGraphic;
    });

    onAddFramesToFpg(newGraphics);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2500);

    // Also offer to insert the DIV process code
    const divCodeSnippet = `// ==========================================
// PROCESO DE EXPLOSIÓN ANIMADA (DIV STUDIO)
// ==========================================
PROCESS anim_explosion(x, y)
PRIVATE
  frame_ini = ${startId};
  frame_fin = ${startId + renderedFrames.length - 1};
BEGIN
  sound(1, 90, 180); // Sonido de detonación
  size = 100;

  FOR (graph = frame_ini; graph <= frame_fin; graph++)
    FRAME;
  END
END;`;

    onInsertCode(divCodeSnippet);
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] text-slate-200 select-none overflow-hidden">
      {/* Top Header */}
      <div className="bg-[#0b1222] border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
              <span>CREADOR DE EXPLOSIONES</span>
              <span className="text-[10px] text-amber-400 font-normal px-1 rounded bg-amber-950/60 border border-amber-800/40">
                UTILIDAD DIV STUDIO
              </span>
            </h2>
            <span className="text-[10px] text-slate-400">
              Generador de secuencias animadas de partículas, fuego, plasma y ondas expansivas
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSeed(seed + 1)}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 font-mono"
            title="Generar nueva variación aleatoria"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Variar Seed</span>
          </button>

          <button
            onClick={handleAddToFpg}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all"
            title="Inyectar fotogramas en la librería FPG y generar proceso DIV"
          >
            {addedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>¡Añadido al FPG!</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir a FPG & Código</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Parameters & Configuration */}
        <div className="w-72 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col p-3 gap-3 overflow-y-auto">
          {/* Style Selector */}
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono mb-1.5 block">
              Estilo Visual de Explosión
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "fire", name: "Fuego Clásico", color: "#f97316" },
                { id: "plasma", name: "Plasma Sci-Fi", color: "#06b6d4" },
                { id: "toxic", name: "Ácido Tóxico", color: "#84cc16" },
                { id: "nuclear", name: "Bomba Atómica", color: "#ef4444" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setStyle(item.id as ExplosionStyle)}
                  className={`p-2 rounded text-left border transition-all ${
                    style === item.id
                      ? "bg-amber-950/80 border-amber-500 text-white font-medium"
                      : "bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs truncate">{item.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Frame count & Resolution */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono block">
              Fotogramas & Tamaño
            </span>
            <div className="flex gap-2 text-xs">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-1">Fotogramas:</label>
                <div className="grid grid-cols-3 gap-1">
                  {[6, 8, 12].map((num) => (
                    <button
                      key={num}
                      onClick={() => setFrameCount(num)}
                      className={`py-1 rounded text-center font-mono border ${
                        frameCount === num
                          ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-1">Resolución:</label>
                <div className="grid grid-cols-2 gap-1">
                  {[32, 48].map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`py-1 rounded text-center font-mono border ${
                        resolution === res
                          ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      {res}x{res}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Physics Sliders */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono block">
              Física de Partículas
            </span>

            {/* Particle Count */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Cantidad de partículas:</span>
                <span className="font-mono text-cyan-400">{particleCount}</span>
              </div>
              <input
                type="range"
                min={20}
                max={90}
                value={particleCount}
                onChange={(e) => setParticleCount(Number(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded"
              />
            </div>

            {/* Blast Speed */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Velocidad expansiva:</span>
                <span className="font-mono text-amber-400">{blastSpeed.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={5.5}
                step={0.1}
                value={blastSpeed}
                onChange={(e) => setBlastSpeed(Number(e.target.value))}
                className="w-full accent-amber-500 h-1 bg-slate-800 rounded"
              />
            </div>

            {/* Rise / Ascending Smoke */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Ascenso de humo:</span>
                <span className="font-mono text-slate-200">{riseAmount.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.1}
                value={riseAmount}
                onChange={(e) => setRiseAmount(Number(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded"
              />
            </div>
          </div>
        </div>

        {/* Center: Real-time Animated Preview & Frame Strip */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto bg-[#050811] items-center justify-center">
          {/* Main Animated Preview Stage */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative p-2 rounded-xl bg-[#090e1c] border border-slate-800 shadow-2xl">
              <canvas
                ref={previewCanvasRef}
                width={256}
                height={256}
                className="rounded-lg border border-slate-800/80 block image-pixelated"
                style={{ imageRendering: "pixelated" }}
              />
              <div className="absolute top-4 left-4 px-2 py-0.5 rounded bg-black/70 text-amber-300 border border-amber-800/40 text-[10px] font-mono">
                FRAME {currentFrameIdx + 1}/{frameCount}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-3 bg-[#0b1222] px-4 py-2 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 rounded"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-1.5 font-mono text-slate-400">
                <span>FPS:</span>
                <input
                  type="range"
                  min={6}
                  max={30}
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-24 accent-cyan-500 h-1 bg-slate-800 rounded"
                />
                <span className="w-8 text-cyan-300 text-right">{fps}</span>
              </div>
            </div>
          </div>

          {/* Horizontal Frame Strip */}
          <div className="w-full max-w-2xl bg-[#0a0f1d] p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono mb-2 block">
              Tira de Fotogramas (Frames FPG)
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {renderedFrames.map((pixels, idx) => {
                const isSelected = currentFrameIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentFrameIdx(idx);
                    }}
                    className={`flex-shrink-0 flex flex-col items-center p-1 rounded border transition-all ${
                      isSelected
                        ? "bg-cyan-950 border-cyan-500 shadow-md shadow-cyan-950/40"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="w-14 h-14 rounded bg-black/60 overflow-hidden flex items-center justify-center">
                      <canvas
                        ref={(node) => {
                          if (!node) return;
                          const ctx = node.getContext("2d");
                          if (!ctx) return;
                          const pSize = node.width / resolution;
                          ctx.clearRect(0, 0, node.width, node.height);
                          for (let y = 0; y < resolution; y++) {
                            for (let x = 0; x < resolution; x++) {
                              const c = pixels[y]?.[x];
                              if (c) {
                                ctx.fillStyle = DEFAULT_PALETTE[c] || "#ffffff";
                                ctx.fillRect(x * pSize, y * pSize, pSize, pSize);
                              }
                            }
                          }
                        }}
                        width={56}
                        height={56}
                        className="block"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-1">#{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
