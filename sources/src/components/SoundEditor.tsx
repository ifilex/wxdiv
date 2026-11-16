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
  const [mobileTab, setMobileTab] = useState<"synth" | "presets">("synth");

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
    <div className="flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] select-none overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-3 py-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FDF2F4] border border-[#FBCFE8] text-[#7C2D48]">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <span>Editor de Sonidos ADSR</span>
            </h2>
            <span className="text-[11px] text-[#6B7280] hidden sm:inline">
              {selectedPreset.name} • {waveform} ({baseFreq} Hz)
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={playCurrentSound}
            className="px-3 min-h-[38px] bg-[#2F6F4E] hover:bg-[#25593E] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Escuchar</span>
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`px-2.5 min-h-[38px] rounded-lg text-xs flex items-center gap-1 border font-semibold transition-colors whitespace-nowrap ${
              isLooping
                ? "bg-[#7C2D48] border-[#7C2D48] text-white"
                : "bg-[#F8FAFC] border-[#E2E8F0] text-[#4B5563]"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop</span>
          </button>

          <button
            onClick={handleCopyCode}
            className="px-2.5 min-h-[38px] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#374151] rounded-lg text-xs flex items-center gap-1 font-mono font-semibold whitespace-nowrap"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-[#2F6F4E]" /> : <Copy className="w-3.5 h-3.5 text-[#7C2D48]" />}
            <span className="hidden sm:inline">Copiar</span>
          </button>

          <button
            onClick={handleInsertDivCode}
            className="px-3 min-h-[38px] bg-[#7C2D48] hover:bg-[#66233A] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Insertar</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden items-center bg-white border-b border-[#E2E8F0] px-3 py-1.5 gap-2 flex-shrink-0">
        <button
          onClick={() => setMobileTab("synth")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "synth"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          Sintetizador ADSR
        </button>
        <button
          onClick={() => setMobileTab("presets")}
          className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            mobileTab === "presets"
              ? "bg-[#7C2D48] text-white"
              : "bg-[#F8FAFC] text-[#4B5563] border border-[#E2E8F0]"
          }`}
        >
          Efectos Preset ({PRESET_SOUNDS.length})
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex-grow min-h-0 w-full h-full flex flex-col md:flex-row overflow-hidden">
        {/* Preset List Sidebar */}
        <div
          className={`${
            mobileTab === "presets" ? "flex" : "hidden md:flex"
          } w-full md:w-64 bg-white md:border-r border-[#E2E8F0] flex-col p-3 gap-2 overflow-y-auto`}
        >
          <span className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase font-mono mb-1 block">
            Efectos del Juego
          </span>
          <div className="space-y-1.5">
            {PRESET_SOUNDS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full px-3 min-h-[48px] rounded-xl text-left flex items-center justify-between border transition-colors ${
                    isSelected
                      ? "bg-[#7C2D48] border-[#7C2D48] text-white font-semibold"
                      : "bg-[#F8FAFC] border-[#E2E8F0] text-[#111827] hover:bg-[#F1F5F9]"
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-semibold truncate">{preset.name}</div>
                    <div className={`text-[10px] font-mono capitalize ${isSelected ? "text-white/80" : "text-[#6B7280]"}`}>
                      {preset.config.waveform} • {preset.config.frequency}Hz
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono shrink-0 font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-white border border-[#E2E8F0] text-[#4B5563]"
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
        <div
          className={`${
            mobileTab === "synth" ? "flex" : "hidden md:flex"
          } flex-1 flex-grow min-h-0 flex-col p-3 sm:p-4 gap-4 overflow-y-auto bg-[#F7F8FA]`}
        >
          {/* Waveform Visualization Canvas (crisp dark oscilloscope) */}
          <div className="relative rounded-xl overflow-hidden border border-[#CBD5E1] bg-[#080e1d] shadow-xs flex-shrink-0">
            <canvas ref={canvasRef} width={640} height={140} className="w-full h-28 sm:h-36 block" />
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/65 rounded text-cyan-300 border border-cyan-800/40 text-[10px] font-mono flex items-center gap-1.5">
              <Waves className="w-3 h-3" />
              <span>FORMA DE ONDA & ADSR</span>
            </div>
          </div>

          {/* Synthesis Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Waveform & Pitch */}
            <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] space-y-3.5">
              <span className="text-xs font-bold text-[#7C2D48] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                <span>Oscilador y Modulación</span>
              </span>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#4B5563]">Tipo de Onda:</label>
                <div className="grid grid-cols-5 gap-1">
                  {(["sine", "square", "sawtooth", "triangle", "noise"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setWaveform(type)}
                      className={`min-h-[36px] text-[10px] font-mono rounded-lg border capitalize font-bold transition-colors ${
                        waveform === type
                          ? "bg-[#7C2D48] border-[#7C2D48] text-white"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-[#4B5563] hover:text-[#111827]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#4B5563]">Frecuencia Base:</span>
                  <span className="font-mono text-[#7C2D48] font-bold">{baseFreq} Hz</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={2000}
                  step={10}
                  value={baseFreq}
                  onChange={(e) => setBaseFreq(Number(e.target.value))}
                  className="w-full accent-[#7C2D48] h-2 bg-[#E2E8F0] rounded"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#4B5563]">Deslizamiento de Tono:</span>
                  <span className="font-mono text-[#2F6F4E] font-bold">{pitchSlide} Hz</span>
                </div>
                <input
                  type="range"
                  min={-1000}
                  max={1000}
                  step={20}
                  value={pitchSlide}
                  onChange={(e) => setPitchSlide(Number(e.target.value))}
                  className="w-full accent-[#2F6F4E] h-2 bg-[#E2E8F0] rounded"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#4B5563]">Filtro Pasa-Bajos:</span>
                  <span className="font-mono text-[#111827] font-bold">{filterCutoff} Hz</span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={8000}
                  step={100}
                  value={filterCutoff}
                  onChange={(e) => setFilterCutoff(Number(e.target.value))}
                  className="w-full accent-[#7C2D48] h-2 bg-[#E2E8F0] rounded"
                />
              </div>
            </div>

            {/* ADSR Envelopes */}
            <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] space-y-3.5">
              <span className="text-xs font-bold text-[#7C2D48] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Envolvente ADSR y Volumen</span>
              </span>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#4B5563]">Ataque (Attack):</span>
                  <span className="font-mono text-[#111827] font-bold">{(attack * 1000).toFixed(0)} ms</span>
                </div>
                <input
                  type="range"
                  min={0.001}
                  max={0.5}
                  step={0.01}
                  value={attack}
                  onChange={(e) => setAttack(Number(e.target.value))}
                  className="w-full accent-[#7C2D48] h-2 bg-[#E2E8F0] rounded"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#4B5563]">Caída (Decay):</span>
                  <span className="font-mono text-[#111827] font-bold">{(decay * 1000).toFixed(0)} ms</span>
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={0.8}
                  step={0.02}
                  value={decay}
                  onChange={(e) => setDecay(Number(e.target.value))}
                  className="w-full accent-[#7C2D48] h-2 bg-[#E2E8F0] rounded"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#4B5563]">Sostenido (Sustain):</span>
                  <span className="font-mono text-[#111827] font-bold">{(sustain * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={sustain}
                  onChange={(e) => setSustain(Number(e.target.value))}
                  className="w-full accent-[#7C2D48] h-2 bg-[#E2E8F0] rounded"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#4B5563]">Relajación (Release):</span>
                  <span className="font-mono text-[#111827] font-bold">{(release * 1000).toFixed(0)} ms</span>
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={1.2}
                  step={0.05}
                  value={release}
                  onChange={(e) => setRelease(Number(e.target.value))}
                  className="w-full accent-[#7C2D48] h-2 bg-[#E2E8F0] rounded"
                />
              </div>

              <div className="space-y-1 pt-2 border-t border-[#E2E8F0]">
                <div className="flex justify-between text-xs">
                  <span className="text-[#4B5563] font-semibold">Volumen General:</span>
                  <span className="font-mono text-[#2F6F4E] font-bold">{(volume * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-[#2F6F4E] h-2 bg-[#E2E8F0] rounded"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
