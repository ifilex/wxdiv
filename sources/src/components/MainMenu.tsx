/**
 * MainMenu.tsx
 * Retro Title Screen & Options Menu for Modo 8 DOOM Engine in wxDIV
 */

import React, { useState } from "react";
import { useGameStore, Difficulty } from "../store/useGameStore";
import { soundFx } from "../engine/AudioEngine";
import { Play, Settings, HelpCircle, Trophy, Volume2, ShieldAlert } from "lucide-react";

interface MainMenuProps {
  onStartGame: (difficulty: Difficulty) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const { highscore, sensitivity, soundVolume, setOptions } = useGameStore();
  const [tab, setTab] = useState<"menu" | "difficulty" | "options" | "help">("menu");

  const handleSelectDifficulty = (diff: Difficulty) => {
    soundFx.playPistol();
    onStartGame(diff);
  };

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex items-center justify-center p-4 select-none">
      {/* Subtle scanline background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-zinc-900 border-2 border-amber-600/80 rounded-lg shadow-2xl p-6 flex flex-col items-center">
        {/* Title Header */}
        <div className="text-center mb-6">
          <span className="text-[11px] font-mono tracking-widest text-amber-500 font-bold uppercase">
            DIV Games Studio 2 Replica
          </span>
          <h1 className="text-4xl font-black text-amber-500 tracking-wider font-mono drop-shadow-[0_4px_12px_rgba(245,158,11,0.4)]">
            MODO 8: 3D
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Motor de Raycasting Pseudo-3D DDA
          </p>
        </div>

        {/* High Score Banner */}
        {highscore > 0 && (
          <div className="w-full mb-5 bg-amber-950/40 border border-amber-500/40 rounded px-3 py-1.5 flex items-center justify-between text-xs font-mono text-amber-300">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              RÉCORD MÁXIMO
            </span>
            <strong className="text-amber-400 font-bold text-sm">{highscore} PTS</strong>
          </div>
        )}

        {/* MAIN MENU TAB */}
        {tab === "menu" && (
          <div className="w-full flex flex-col gap-2.5 font-mono">
            <button
              onClick={() => {
                soundFx.playSwitch();
                setTab("difficulty");
              }}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-black font-black text-sm rounded shadow-lg transition-all flex items-center justify-center gap-2 tracking-wide cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              NUEVA PARTIDA
            </button>

            <button
              onClick={() => {
                soundFx.playSwitch();
                setTab("options");
              }}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-200 font-bold text-xs rounded border border-zinc-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              CONFIGURACIÓN
            </button>

            <button
              onClick={() => {
                soundFx.playSwitch();
                setTab("help");
              }}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-200 font-bold text-xs rounded border border-zinc-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              CONTROLES Y AYUDA
            </button>
          </div>
        )}

        {/* DIFFICULTY SELECTOR */}
        {tab === "difficulty" && (
          <div className="w-full flex flex-col gap-2.5 font-mono">
            <div className="text-xs font-bold text-zinc-400 mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              ELIGE LA DIFICULTAD
            </div>

            <button
              onClick={() => handleSelectDifficulty("easy")}
              className="w-full p-3 bg-zinc-800/80 hover:bg-emerald-950/60 hover:border-emerald-500 border border-zinc-700 rounded text-left transition-colors cursor-pointer group"
            >
              <div className="text-emerald-400 font-bold text-xs group-hover:text-emerald-300">
                ¡Demasiado joven para morir!
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Daño reducido (65%), munición abundante (+50%).
              </div>
            </button>

            <button
              onClick={() => handleSelectDifficulty("normal")}
              className="w-full p-3 bg-zinc-800/80 hover:bg-amber-950/60 hover:border-amber-500 border border-zinc-700 rounded text-left transition-colors cursor-pointer group"
            >
              <div className="text-amber-400 font-bold text-xs group-hover:text-amber-300">
                Hazme daño de verdad (Normal)
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                La experiencia clásica y equilibrada de DIV Modo 8.
              </div>
            </button>

            <button
              onClick={() => handleSelectDifficulty("hard")}
              className="w-full p-3 bg-zinc-800/80 hover:bg-red-950/60 hover:border-red-500 border border-zinc-700 rounded text-left transition-colors cursor-pointer group"
            >
              <div className="text-red-400 font-bold text-xs group-hover:text-red-300">
                Ultraviolencia (Difícil)
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Enemigos feroces y daño incrementado (135%).
              </div>
            </button>

            <button
              onClick={() => {
                soundFx.playSwitch();
                setTab("menu");
              }}
              className="mt-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer text-center"
            >
              ← Volver al menú principal
            </button>
          </div>
        )}

        {/* OPTIONS TAB */}
        {tab === "options" && (
          <div className="w-full flex flex-col gap-4 font-mono">
            <div>
              <div className="flex justify-between text-xs text-zinc-300 mb-1">
                <span>Sensibilidad del ratón:</span>
                <span className="text-amber-400 font-bold">{sensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setOptions({ sensitivity: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                  Volumen SFX:
                </span>
                <span className="text-amber-400 font-bold">{Math.round(soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={soundVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  setOptions({ soundVolume: vol });
                  soundFx.setVolume(vol);
                }}
                className="w-full accent-amber-500"
              />
            </div>

            <button
              onClick={() => {
                soundFx.playSwitch();
                setTab("menu");
              }}
              className="mt-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded font-bold transition-colors cursor-pointer"
            >
              Guardar y volver
            </button>
          </div>
        )}

        {/* HELP & CONTROLS TAB */}
        {tab === "help" && (
          <div className="w-full flex flex-col gap-3 font-mono text-xs text-zinc-300">
            <div className="bg-zinc-950/80 p-3 rounded border border-zinc-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-amber-400 font-bold">W, A, S, D / Flechas:</span>
                <span>Moverse y desplazarse</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400 font-bold">Ratón / Giro:</span>
                <span>Mirar y apuntar</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400 font-bold">Clic Izq / Espacio:</span>
                <span>Disparar arma</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400 font-bold">E / Espacio en puerta:</span>
                <span>Abrir puertas o sensores</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-1">
                <span className="text-sky-400 font-bold">Tecla TAB:</span>
                <span className="text-sky-200">Mostrar / Ocultar Mapa</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400 font-bold">1, 2, 3:</span>
                <span>Pistola / Escopeta / Gatling</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              * Nota: El minimapa no estorbará en pantalla al jugar. Presiona <strong>TAB</strong> cuando desees consultar la ruta o tus llaves.
            </p>

            <button
              onClick={() => {
                soundFx.playSwitch();
                setTab("menu");
              }}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded font-bold transition-colors cursor-pointer"
            >
              Entendido, volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
