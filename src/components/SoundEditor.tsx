import React, { useState, useRef, useEffect } from "react";
import {
  Volume2,
  Play,
  Square,
  Repeat,
  Sparkles,
  Sliders,
  Copy,
  Check,
  RotateCcw,
  Music,
  Waves,
  Radio,
  FileCode,
  Download,
} from "lucide-react";
import { soundEngine } from "../engine/sound";
import { DivSoundEffect } from "../types";

interface SoundEditorProps {
  onInsertCode: (snippet: string) => void;
}

interface SoundPreset {
  id: string;
  name: string;
  category: "fx" | "combat" | "mode8";
  config: DivSoundEffect;
}

const PRESET_SOUNDS: SoundPreset[] = [
  {
    id: "laser",
    name: "Disparo Plasma / Láser",
    category: "combat",
    config: {
      id: 101,
      name: "laser",
      waveform: "sawtooth",
      frequency: 880,
      pitchSlide: -600,
      vibratoDepth: 0,
      vibratoSpeed: 0,
      attack: 0.01,
      decay: 0.12,
      sustain: 0.05,
      release: 0.08,
      filterCutoff: 3500,
      volume: 0.35,
    },
  },
  {
    id: "explosion",
    name: "Explosión Contundente",
    category: "combat",
    config: {
      id: 102,
      name: "explosion",
      waveform: "noise",
      frequency: 180,
      pitchSlide: -120,
      vibratoDepth: 0,
      vibratoSpeed: 0,
      attack: 0.01,
      decay: 0.35,
      sustain: 0.15,
      release: 0.45,
      filterCutoff: 1200,
      volume: 0.45,
    },
  },
  {
    id: "jump",
    name: "Salto Arcade 8-bits",
    category: "fx",
    config: {
      id: 103,
      name: "jump",
      waveform: "square",
      frequency: 220,
      pitchSlide: 440,
      vibratoDepth: 0,
      vibratoSpeed: 0,
      attack: 0.02,
      decay: 0.15,
      sustain: 0.1,
      release: 0.1,
      filterCutoff: 4000,
      volume: 0.3,
    },
  },
  {
    id: "door",
    name: "Puerta Hidráulica Modo 8",
    category: "mode8",
    config: {
      id: 104,
      name: "door",
      waveform: "triangle",
      frequency: 130,
      pitchSlide: -40,
      vibratoDepth: 0,
      vibratoSpeed: 0,
      attack: 0.08,
      decay: 0.4,
      sustain: 0.25,
      release: 0.3,
      filterCutoff: 1100,
      volume: 0.4,
    },
  },
  {
    id: "switch",
    name: "Interruptor / Sensor",
    category: "mode8",
    config: {
      id: 105,
      name: "switch",
      waveform: "sine",
      frequency: 750,
      pitchSlide: 250,
      vibratoDepth: 0,
      vibratoSpeed: 0,
      attack: 0.01,
      decay: 0.08,
      sustain: 0.05,
      release: 0.06,
      filterCutoff: 4500,
      volume: 0.35,
    },
  },
  {
    id: "ammo",
    name: "Recarga de Munición",
    category: "mode8",
    config: {
      id: 106,
      name: "ammo",
      waveform: "square",
      frequency: 440,
      pitchSlide: 220,
      vibratoDepth: 0,
      vibratoSpeed: 0,
      attack: 0.02,
      decay: 0.12,
      sustain: 0.1,
      release: 0.15,
      filterCutoff: 3000,
      volume: 0.3,
    },
  },
  {
    id: "medikit",
    name: "Botiquín / Salud",
    category: "mode8",
    config: {
      id: 107,
      name: "medikit",
      waveform: "triangle",
      frequency: 523,
      pitchSlide: 260,
      vibratoDepth: 0,
      vibratoSpeed: 0,
      attack: 0.03,
      decay: 0.25,
      sustain: 0.2,
      release: 0.25,
      filterCutoff: 3800,
      volume: 0.35,
    },
  },
  {
    id: "key",
    name: "Llave de Oro / Fanfarria",
    category: "mode8",
    config: {
      id: 108,
      name: "key",
      waveform: "sine",
      frequency: 660,
      pitchSlide: 440,
      vibratoDepth: 0,
      vibratoSpeed: 0,
      attack: 0.01,
      decay: 0.2,
      sustain: 0.2,
      release: 0.4,
      filterCutoff: 5000,
      volume: 0.4,
    },
  },
];

export const SoundEditor: React.FC<SoundEditorProps> = ({ onInsertCode }) => {
  const [selectedPreset, setSelectedPreset] = useState<SoundPreset>(PRESET_SOUNDS[0]);
  const [waveform, setWaveform] = useState<"sine" | "square" | "sawtooth" | "triangle" | "noise">(
    PRESET_SOUNDS[0].config.waveform
  );
  const [baseFreq, setBaseFreq] = useState<number>(PRESET_SOUNDS[0].config.frequency);
  const [pitchSlide, setPitchSlide] = useState<number>(PRESET_SOUNDS[0].config.pitchSlide || 0);
  const [attack, setAttack] = useState<number>(PRESET_SOUNDS[0].config.attack);
  const [decay, setDecay] = useState<number>(PRESET_SOUNDS[0].config.decay);
  const [sustain, setSustain] = useState<number>(PRESET_SOUNDS[0].config.sustain);
  const [release, setRelease] = useState<number>(PRESET_SOUNDS[0].config.release);
  const [filterCutoff, setFilterCutoff] = useState<number>(PRESET_SOUNDS[0].config.filterCutoff || 3000);
  const [volume, setVolume] = useState<number>(PRESET_SOUNDS[0].config.volume || 0.35);
  const [isLooping, setIsLooping] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopIntervalRef = useRef<any>(null);

  // Load preset config
  const handleSelectPreset = (p: SoundPreset) => {
    setSelectedPreset(p);
    setWaveform(p.config.waveform);
    setBaseFreq(p.config.frequency);
    setPitchSlide(p.config.pitchSlide || 0);
    setAttack(p.config.attack);
    setDecay(p.config.decay);
    setSustain(p.config.sustain);
    setRelease(p.config.release);
    setFilterCutoff(p.config.filterCutoff || 3000);
    setVolume(p.config.volume || 0.35);
  };

  // Play current custom sound
  const playCurrentSound = () => {
    soundEngine.playCustomSound({
      id: selectedPreset.config.id,
      name: selectedPreset.config.name,
      waveform,
      frequency: baseFreq,
      pitchSlide,
      vibratoDepth: 0,
      vibratoSpeed: 0,
      attack,
      decay,
      sustain,
      release,
      filterCutoff,
      volume,
    });
    animateWaveform();
  };

  // Waveform visualization
  const animateWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background grid
    ctx.fillStyle = "#080e1d";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Waveform line
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const totalDur = attack + decay + release + 0.1;
    for (let x = 0; x < w; x++) {
      const t = (x / w) * totalDur;

      // ADSR Envelope value at t
      let env = 0;
      if (t < attack) {
        env = t / (attack || 0.001);
      } else if (t < attack + decay) {
        const decayProgress = (t - attack) / (decay || 0.001);
        env = 1.0 - decayProgress * (1.0 - sustain);
      } else if (t < attack + decay + 0.1) {
        env = sustain;
      } else {
        const relProgress = (t - attack - decay - 0.1) / (release || 0.001);
        env = Math.max(0, sustain * (1.0 - relProgress));
      }

      // Frequency at t
      const curFreq = Math.max(20, baseFreq + (pitchSlide * (t / totalDur)));
      const osc = Math.sin((t * curFreq * Math.PI * 2) % (Math.PI * 2));
      const y = h / 2 - osc * env * (h * 0.42 * volume);

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  useEffect(() => {
    animateWaveform();
  }, [waveform, baseFreq, pitchSlide, attack, decay, sustain, release, volume]);

  // Handle loop toggle
  useEffect(() => {
    if (isLooping) {
      playCurrentSound();
      const intervalMs = Math.max(250, (attack + decay + release) * 1000 + 100);
      loopIntervalRef.current = setInterval(playCurrentSound, intervalMs);
    } else if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
    }
    return () => {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
    };
  }, [isLooping, waveform, baseFreq, attack, decay, sustain, release]);

  // Copy DIV sound code
  const handleCopyCode = () => {
    const codeSnippet = `// Reproducir sonido sintetizado: ${selectedPreset.name}
sound(1, ${Math.round(volume * 100)}, ${Math.round(baseFreq)});`;
    navigator.clipboard.writeText(codeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleInsertDivCode = () => {
    const codeSnippet = `// Disparo de efecto de sonido: ${selectedPreset.name}
sound(1, ${Math.round(volume * 100)}, ${Math.round(baseFreq)});`;
    onInsertCode(codeSnippet);
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] text-slate-200 select-none overflow-hidden">
      {/* Top Header */}
      <div className="bg-[#0b1222] border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
              <span>EDITOR DE SONIDOS RETRO</span>
              <span className="text-[10px] text-cyan-400 font-normal px-1 rounded bg-cyan-950/60 border border-cyan-800/40">
                SINTETIZADOR ADSR
              </span>
            </h2>
            <span className="text-[10px] text-slate-400">
              Revisa, modula y adapta efectos de sonido para tus juegos y el motor 3D
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={playCurrentSound}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Escuchar</span>
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`px-2.5 py-1.5 rounded text-xs flex items-center gap-1 border transition-all ${
              isLooping
                ? "bg-amber-950 border-amber-500 text-amber-300 font-semibold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop</span>
          </button>

          <button
            onClick={handleCopyCode}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 font-mono"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>Copiar sound()</span>
          </button>

          <button
            onClick={handleInsertDivCode}
            className="px-2.5 py-1.5 bg-cyan-900/80 hover:bg-cyan-800 border border-cyan-600/60 text-cyan-200 rounded text-xs font-semibold flex items-center gap-1 font-mono"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Insertar Código</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preset List Sidebar */}
        <div className="w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col p-2 gap-2 overflow-y-auto">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono mb-1 block">
            Efectos del Juego
          </span>
          <div className="space-y-1">
            {PRESET_SOUNDS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full px-2.5 py-2 rounded text-left flex items-center justify-between border transition-all ${
                    isSelected
                      ? "bg-cyan-950/90 border-cyan-500 text-white font-medium shadow-sm"
                      : "bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  <div className="truncate">
                    <div className="text-xs font-medium truncate">{preset.name}</div>
                    <div className="text-[9px] text-slate-400 font-mono capitalize">
                      {preset.config.waveform} • {preset.config.frequency}Hz
                    </div>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono ${
                      preset.category === "mode8"
                        ? "bg-indigo-950 text-indigo-300 border border-indigo-800/40"
                        : preset.category === "combat"
                        ? "bg-rose-950 text-rose-300 border border-rose-800/40"
                        : "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                    }`}
                  >
                    {preset.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Synthesizer Sliders & Waveform */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto bg-[#050811]">
          {/* Waveform Visualization Canvas */}
          <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#080e1d] shadow-inner">
            <canvas ref={canvasRef} width={640} height={140} className="w-full h-32 block" />
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-cyan-400 border border-cyan-800/40 text-[10px] font-mono flex items-center gap-1.5">
              <Waves className="w-3 h-3" />
              <span>FORMA DE ONDA & ENVOLVENTE ADSR</span>
            </div>
          </div>

          {/* Synthesis Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Waveform & Pitch */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <span className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                <span>OSCILADOR & MODULACIÓN</span>
              </span>

              {/* Waveform Type */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Tipo de Onda:</label>
                <div className="grid grid-cols-5 gap-1">
                  {(["sine", "square", "sawtooth", "triangle", "noise"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setWaveform(type)}
                      className={`py-1 text-[10px] font-mono rounded border capitalize transition-all ${
                        waveform === type
                          ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Base Frequency */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Frecuencia Base:</span>
                  <span className="font-mono text-cyan-400 font-bold">{baseFreq} Hz</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={2000}
                  step={10}
                  value={baseFreq}
                  onChange={(e) => setBaseFreq(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-slate-800 rounded"
                />
              </div>

              {/* Pitch Slide */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Deslizamiento de Tono:</span>
                  <span className="font-mono text-amber-400 font-bold">{pitchSlide} Hz</span>
                </div>
                <input
                  type="range"
                  min={-1000}
                  max={1000}
                  step={20}
                  value={pitchSlide}
                  onChange={(e) => setPitchSlide(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1 bg-slate-800 rounded"
                />
              </div>

              {/* Low-pass Filter Cutoff */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Filtro Pasa-Bajos:</span>
                  <span className="font-mono text-purple-400 font-bold">{filterCutoff} Hz</span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={8000}
                  step={100}
                  value={filterCutoff}
                  onChange={(e) => setFilterCutoff(Number(e.target.value))}
                  className="w-full accent-purple-500 h-1 bg-slate-800 rounded"
                />
              </div>
            </div>

            {/* ADSR Envelopes */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
              <span className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>ENVOLVENTE ADSR & VOLUMEN</span>
              </span>

              {/* Attack */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Ataque (Attack):</span>
                  <span className="font-mono text-slate-200">{(attack * 1000).toFixed(0)} ms</span>
                </div>
                <input
                  type="range"
                  min={0.001}
                  max={0.5}
                  step={0.01}
                  value={attack}
                  onChange={(e) => setAttack(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-slate-800 rounded"
                />
              </div>

              {/* Decay */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Caída (Decay):</span>
                  <span className="font-mono text-slate-200">{(decay * 1000).toFixed(0)} ms</span>
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={0.8}
                  step={0.02}
                  value={decay}
                  onChange={(e) => setDecay(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-slate-800 rounded"
                />
              </div>

              {/* Sustain */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Sostenido (Sustain):</span>
                  <span className="font-mono text-slate-200">{(sustain * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={sustain}
                  onChange={(e) => setSustain(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-slate-800 rounded"
                />
              </div>

              {/* Release */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Relajación (Release):</span>
                  <span className="font-mono text-slate-200">{(release * 1000).toFixed(0)} ms</span>
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={1.2}
                  step={0.05}
                  value={release}
                  onChange={(e) => setRelease(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-slate-800 rounded"
                />
              </div>

              {/* Volume */}
              <div className="space-y-1 pt-1 border-t border-slate-800">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Volumen General:</span>
                  <span className="font-mono text-emerald-400 font-bold">{(volume * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1 bg-slate-800 rounded"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
