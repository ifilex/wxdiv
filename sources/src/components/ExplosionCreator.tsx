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
  const [mobileTab, setMobileTab] = useState<"preview" | "params">("preview");

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate explosion frames based on simulation physics
  const generateExplosionFrames = () => {
    const frames: number[][][] = [];
    const center = resolution / 2;

    const colorRamps: Record<ExplosionStyle, number[]> = {
      fire: [2, 6, 9, 3, 10, 11, 1],
      plasma: [2, 7, 5, 8, 12, 1],
      toxic: [2, 6, 4, 13, 11, 1],
      nuclear: [2, 6, 9, 3, 10, 14, 1],
    };
    const ramp = colorRamps[style];

    let s = seed;
    const random = () => {
      const x = Math.sin(s++) * 10000;
      return x - Math.floor(x);
    };

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

    for (let f = 0; f < frameCount; f++) {
      const framePixels: number[][] = [];
      for (let y = 0; y < resolution; y++) {
        framePixels.push(new Array(resolution).fill(0));
      }

      const progress = f / Math.max(1, frameCount - 1);

      if (f <= 2) {
        const flashRadius = (center * 0.4) * (1 - f * 0.4);
        for (let y = 0; y < resolution; y++) {
          for (let x = 0; x < resolution; x++) {
            const dist = Math.hypot(x - center, y - center);
            if (dist < flashRadius) {
              framePixels[y][x] = ramp[0];
            }
          }
        }
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= riseAmount * 0.1;
        p.vx *= 0.94;
        p.vy *= 0.94;

        const pProgress = Math.min(1.0, progress + (1 - p.life) * 0.3);
        const rampIdx = Math.min(ramp.length - 1, Math.floor(pProgress * ramp.length));
        const color = ramp[rampIdx];

        const curRadius = Math.max(1, Math.round(p.size * (1 + progress * 0.8) * (1 - progress * 0.4)));

        for (let dy = -curRadius; dy <= curRadius; dy++) {
          for (let dx = -curRadius; dx <= curRadius; dx++) {
            if (dx * dx + dy * dy <= curRadius * curRadius) {
              const px = Math.floor(p.x + dx);
              const py = Math.floor(p.y + dy);
              if (px >= 0 && px < resolution && py >= 0 && py < resolution) {
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

  useEffect(() => {
    generateExplosionFrames();
  }, [style, frameCount, resolution, particleCount, blastSpeed, riseAmount, smokeDensity, seed]);

  useEffect(() => {
    if (!isPlaying || renderedFrames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % renderedFrames.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, renderedFrames, fps]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || renderedFrames.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixels = renderedFrames[currentFrameIdx] || renderedFrames[0];
    if (!pixels) return;

    const w = resolution;
    const h = resolution;
    const pixelSize = canvas.width / w;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tileSize = 8;
    for (let y = 0; y < canvas.height; y += tileSize) {
      for (let x = 0; x < canvas.width; x += tileSize) {
        ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? "#111827" : "#090d16";
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

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

  const handleAddToFpg = () => {
    if (renderedFrames.length === 0) return;

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

    const divCodeSnippet = `// PROCESO DE EXPLOSIÓN ANIMADA (WXDIV)
PROCESS anim_explosion(x, y)
PRIVATE
  frame_ini = ${startId};
  frame_fin = ${startId + renderedFrames.length - 1};
BEGIN
  sound(1, 90, 180);
  size = 100;

  FOR (graph = frame_ini; graph <= frame_fin; graph++)
    FRAME;
  END
END;`;

    onInsertCode(divCodeSnippet);
  };

  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-3 py-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FDF2F5] border border-[#7C2D48]/20 text-[#7C2D48] flex items-center justify-center flex-shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-[#111827] truncate">
              Creador de Explosiones
            </h2>
            <span className="text-[11px] text-[#6B7280] hidden sm:block truncate">
              Genera secuencias de partículas animadas listas para tu FPG
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSeed(seed + 1)}
            className="min-h-[38px] px-3 py-1.5 bg-[#F1F5F9] hover:bg-slate-200 border border-[#E2E8F0] text-[#374151] rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Generar nueva variación aleatoria"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#7C2D48]" />
            <span>Variar Seed</span>
          </button>

          <button
            type="button"
            onClick={handleAddToFpg}
            className="min-h-[38px] px-3.5 py-1.5 bg-[#7C2D48] hover:bg-[#642239] text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
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

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden border-b border-[#E2E8F0] bg-white px-2 py-1.5 gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "preview"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F1F5F9] text-[#4B5563]"
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Vista Previa ({renderedFrames.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("params")}
          className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "params"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F1F5F9] text-[#4B5563]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Parámetros y Estilo</span>
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 w-full flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Parameters & Configuration */}
        <div
          className={`${
            mobileTab === "params" ? "flex w-full" : "hidden"
          } md:flex md:w-76 bg-white border-r border-[#E2E8F0] flex-col p-3.5 gap-4 overflow-y-auto flex-shrink-0`}
        >
          {/* Style Selector */}
          <div>
            <span className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase mb-2 block">
              Estilo de Explosión
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "fire", name: "Fuego Clásico", color: "#f97316" },
                { id: "plasma", name: "Plasma Sci-Fi", color: "#06b6d4" },
                { id: "toxic", name: "Ácido Tóxico", color: "#84cc16" },
                { id: "nuclear", name: "Nuclear", color: "#ef4444" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStyle(item.id as ExplosionStyle)}
                  className={`min-h-[42px] px-2.5 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                    style === item.id
                      ? "bg-[#FDF2F5] border-[#7C2D48] text-[#7C2D48] font-bold"
                      : "bg-[#F7F8FA] border-[#E2E8F0] text-[#374151] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs truncate">{item.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Frame count & Resolution */}
          <div className="space-y-2.5 pt-3 border-t border-[#E2E8F0]">
            <span className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase block">
              Fotogramas y Tamaño
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-[#4B5563] block mb-1">Fotogramas:</label>
                <div className="grid grid-cols-3 gap-1">
                  {[6, 8, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFrameCount(num)}
                      className={`min-h-[36px] rounded-lg text-center font-mono border cursor-pointer ${
                        frameCount === num
                          ? "bg-[#7C2D48] border-[#7C2D48] text-white font-bold"
                          : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563]"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#4B5563] block mb-1">Tamaño px:</label>
                <div className="grid grid-cols-2 gap-1">
                  {[32, 48].map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setResolution(res)}
                      className={`min-h-[36px] rounded-lg text-center font-mono border cursor-pointer ${
                        resolution === res
                          ? "bg-[#7C2D48] border-[#7C2D48] text-white font-bold"
                          : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563]"
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Physics Sliders */}
          <div className="space-y-3.5 pt-3 border-t border-[#E2E8F0]">
            <span className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase block">
              Física de Partículas
            </span>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#4B5563]">Partículas:</span>
                <span className="font-mono font-bold text-[#7C2D48]">{particleCount}</span>
              </div>
              <input
                type="range"
                min={20}
                max={90}
                value={particleCount}
                onChange={(e) => setParticleCount(Number(e.target.value))}
                className="w-full accent-[#7C2D48] h-2 bg-slate-200 rounded cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#4B5563]">Velocidad expansiva:</span>
                <span className="font-mono font-bold text-[#7C2D48]">{blastSpeed.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={5.5}
                step={0.1}
                value={blastSpeed}
                onChange={(e) => setBlastSpeed(Number(e.target.value))}
                className="w-full accent-[#7C2D48] h-2 bg-slate-200 rounded cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#4B5563]">Ascenso de humo:</span>
                <span className="font-mono font-bold text-[#111827]">{riseAmount.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.1}
                value={riseAmount}
                onChange={(e) => setRiseAmount(Number(e.target.value))}
                className="w-full accent-[#7C2D48] h-2 bg-slate-200 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Center: Real-time Animated Preview & Frame Strip */}
        <div
          className={`${
            mobileTab === "preview" ? "flex" : "hidden"
          } md:flex flex-1 min-h-0 flex-col p-4 gap-4 overflow-y-auto items-center justify-start md:justify-center`}
        >
          {/* Main Animated Preview Stage */}
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            <div className="relative p-2.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm w-full flex items-center justify-center">
              <canvas
                ref={previewCanvasRef}
                width={256}
                height={256}
                className="rounded-xl border border-[#CBD5E1] block w-full max-w-[240px] aspect-square"
                style={{ imageRendering: "pixelated" }}
              />
              <div className="absolute top-4 left-4 px-2 py-0.5 rounded-md bg-black/75 text-amber-300 text-[10px] font-mono font-bold">
                FRAME {currentFrameIdx + 1}/{frameCount}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="w-full flex items-center justify-between gap-3 bg-white px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="min-w-[40px] min-h-[40px] bg-[#7C2D48] hover:bg-[#642239] text-white rounded-lg flex items-center justify-center cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <div className="flex-1 flex items-center gap-2 font-mono text-[#4B5563]">
                <span className="text-[11px] font-sans font-semibold">FPS</span>
                <input
                  type="range"
                  min={6}
                  max={30}
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="flex-1 accent-[#7C2D48] h-2 bg-slate-200 rounded cursor-pointer"
                />
                <span className="w-7 text-[#7C2D48] font-bold text-right">{fps}</span>
              </div>
            </div>
          </div>

          {/* Horizontal Frame Strip */}
          <div className="w-full max-w-2xl bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs">
            <span className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase mb-2 block">
              Tira de Fotogramas (Frames FPG)
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {renderedFrames.map((pixels, idx) => {
                const isSelected = currentFrameIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentFrameIdx(idx);
                    }}
                    className={`flex-shrink-0 flex flex-col items-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#FDF2F5] border-[#7C2D48] ring-1 ring-[#7C2D48]"
                        : "bg-[#F7F8FA] border-[#E2E8F0] hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-lg bg-[#0F172A] overflow-hidden flex items-center justify-center">
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
                    <span className="text-[10px] font-mono font-bold text-[#4B5563] mt-1">
                      #{idx + 1}
                    </span>
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
