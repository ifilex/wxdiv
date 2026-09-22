/**
 * HUD.tsx
 * Authentic retro DOOM / DIV Games Studio 2 status bar, animated Doomguy face,
 * ammo counts, keycards, weapon inventory, and messages.
 */

import React from "react";
import { useGameStore, DoomFaceState } from "../store/useGameStore";
import { Key, Shield, Heart, Crosshair, Map } from "lucide-react";

export const HUD: React.FC = () => {
  const {
    health,
    armor,
    ammo,
    weapons,
    currentWeapon,
    keys,
    faceState,
    score,
    kills,
    totalEnemies,
    showAutomap,
    statusMessage,
    statusMessageTime,
  } = useGameStore();

  const isMsgVisible = statusMessage && Date.now() < statusMessageTime;

  // Render Doomguy facial expression
  const renderFace = (state: DoomFaceState, hp: number) => {
    const isDead = hp <= 0 || state === "dead";
    const isHurt = state === "hurt";
    const isRage = state === "rage";
    const isGrin = state === "grin";
    const isLookLeft = state === "look_left";
    const isLookRight = state === "look_right";

    // Skin & blood bruising according to HP tier
    const skinColor = isDead
      ? "#64748b"
      : hp < 25
      ? "#fca5a5"
      : hp < 50
      ? "#fdba74"
      : "#fed7aa";

    return (
      <div className="relative w-14 h-16 bg-zinc-900 border-2 border-zinc-700 rounded overflow-hidden flex flex-col items-center justify-center select-none shadow-inner">
        <svg viewBox="0 0 40 48" className="w-full h-full">
          {/* Hair */}
          <path d="M 8 14 Q 20 4 32 14 L 32 20 L 8 20 Z" fill="#451a03" />

          {/* Head */}
          <rect x="8" y="14" width="24" height="26" rx="4" fill={skinColor} />

          {/* Blood splatters if low health */}
          {hp < 40 && !isDead && (
            <>
              <circle cx="12" cy="22" r="2.5" fill="#dc2626" />
              <path d="M 28 16 L 30 24 L 27 22 Z" fill="#991b1b" />
            </>
          )}

          {/* Eyes */}
          {isDead ? (
            // X Eyes for dead
            <>
              <text x="11" y="27" fill="#ef4444" fontSize="10" fontWeight="bold">✕</text>
              <text x="23" y="27" fill="#ef4444" fontSize="10" fontWeight="bold">✕</text>
            </>
          ) : isHurt ? (
            // Squeezed eyes in pain
            <>
              <line x1="11" y1="24" x2="17" y2="24" stroke="#451a03" strokeWidth="2.5" />
              <line x1="23" y1="24" x2="29" y2="24" stroke="#451a03" strokeWidth="2.5" />
            </>
          ) : (
            // Normal / Looking eyes
            <>
              <rect x="11" y="22" width="6" height="5" fill="#ffffff" />
              <rect x="23" y="22" width="6" height="5" fill="#ffffff" />
              {/* Pupils */}
              <rect
                x={isLookLeft ? "11" : isLookRight ? "15" : "13"}
                y={isRage ? "24" : "23"}
                width="3"
                height="3"
                fill={isRage ? "#ef4444" : "#1e293b"}
              />
              <rect
                x={isLookLeft ? "23" : isLookRight ? "27" : "25"}
                y={isRage ? "24" : "23"}
                width="3"
                height="3"
                fill={isRage ? "#ef4444" : "#1e293b"}
              />
            </>
          )}

          {/* Eyebrows */}
          {isRage ? (
            <>
              <line x1="10" y1="20" x2="18" y2="22" stroke="#451a03" strokeWidth="2" />
              <line x1="30" y1="20" x2="22" y2="22" stroke="#451a03" strokeWidth="2" />
            </>
          ) : (
            <>
              <line x1="10" y1="20" x2="17" y2="20" stroke="#451a03" strokeWidth="1.5" />
              <line x1="23" y1="20" x2="30" y2="20" stroke="#451a03" strokeWidth="1.5" />
            </>
          )}

          {/* Mouth */}
          {isDead ? (
            <path d="M 14 36 Q 20 33 26 36" stroke="#451a03" strokeWidth="2" fill="none" />
          ) : isGrin ? (
            <path d="M 13 32 Q 20 38 27 32" stroke="#451a03" strokeWidth="2" fill="#ffffff" />
          ) : isRage ? (
            <rect x="15" y="32" width="10" height="4" rx="1" fill="#7f1d1d" />
          ) : isHurt ? (
            <ellipse cx="20" cy="34" rx="3.5" ry="3" fill="#7f1d1d" />
          ) : (
            <line x1="15" y1="34" x2="25" y2="34" stroke="#451a03" strokeWidth="2" />
          )}
        </svg>
      </div>
    );
  };

  const curAmmoCount =
    currentWeapon === "shotgun"
      ? ammo.shells
      : currentWeapon === "chaingun"
      ? ammo.bullets
      : ammo.bullets;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
      {/* Top Bar / Notifications */}
      <div className="p-3 flex justify-between items-start">
        {/* Messages */}
        <div className="flex flex-col gap-1">
          {isMsgVisible && (
            <div className="bg-zinc-950/90 border-l-4 border-amber-500 px-3 py-1.5 text-amber-300 font-mono text-xs shadow-lg animate-pulse tracking-wide uppercase">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Top Right Stats & Automap Status */}
        <div className="flex items-center gap-2">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-zinc-300 flex items-center gap-3 shadow">
            <span>PUNTOS: <strong className="text-amber-400">{score}</strong></span>
            <span>BAJAS: <strong className="text-red-400">{kills}/{totalEnemies}</strong></span>
          </div>

          <div
            className={`border rounded px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 shadow transition-colors ${
              showAutomap
                ? "bg-sky-950/90 border-sky-500 text-sky-300 font-bold"
                : "bg-zinc-950/70 border-zinc-800 text-zinc-400"
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>TAB: {showAutomap ? "MAPA ACTIVO" : "MAPA"}</span>
          </div>
        </div>
      </div>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Crosshair className="w-4 h-4 text-emerald-400/80" />
      </div>

      {/* Retro Bottom Status Bar */}
      <div className="bg-gradient-to-t from-zinc-950 via-zinc-900 to-zinc-800 border-t-4 border-zinc-700 px-4 py-2 flex items-center justify-between text-zinc-200 select-none shadow-2xl">
        {/* 1. AMMO */}
        <div className="flex flex-col items-center px-3 border-r border-zinc-700 min-w-[75px]">
          <span className="text-[10px] tracking-wider text-zinc-400 font-bold">MUNICIÓN</span>
          <span className="text-2xl font-black font-mono text-amber-400 tracking-tight">
            {curAmmoCount}
          </span>
        </div>

        {/* 2. HEALTH */}
        <div className="flex flex-col items-center px-4 border-r border-zinc-700 min-w-[85px]">
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            <span className="text-[10px] tracking-wider text-zinc-400 font-bold">SALUD</span>
          </div>
          <span
            className={`text-2xl font-black font-mono tracking-tight ${
              health > 60
                ? "text-emerald-400"
                : health > 30
                ? "text-yellow-400"
                : "text-red-500 animate-pulse"
            }`}
          >
            {health}%
          </span>
        </div>

        {/* 3. WEAPONS (ARMS) */}
        <div className="hidden sm:flex flex-col items-center px-3 border-r border-zinc-700">
          <span className="text-[10px] tracking-wider text-zinc-400 font-bold mb-0.5">ARMAS</span>
          <div className="grid grid-cols-3 gap-1 text-[11px] font-mono font-bold">
            <span className={`px-1.5 py-0.5 rounded ${weapons.pistol ? "bg-amber-500 text-black" : "text-zinc-600"}`}>1</span>
            <span className={`px-1.5 py-0.5 rounded ${weapons.shotgun ? "bg-amber-500 text-black" : "text-zinc-600"}`}>2</span>
            <span className={`px-1.5 py-0.5 rounded ${weapons.chaingun ? "bg-amber-500 text-black" : "text-zinc-600"}`}>3</span>
          </div>
        </div>

        {/* 4. DOOMGUY FACE */}
        <div className="flex items-center justify-center px-3 border-r border-zinc-700">
          {renderFace(faceState, health)}
        </div>

        {/* 5. ARMOR */}
        <div className="flex flex-col items-center px-4 border-r border-zinc-700 min-w-[85px]">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-sky-400 fill-sky-400" />
            <span className="text-[10px] tracking-wider text-zinc-400 font-bold">ARMADURA</span>
          </div>
          <span className="text-2xl font-black font-mono text-sky-400 tracking-tight">
            {armor}%
          </span>
        </div>

        {/* 6. KEYS */}
        <div className="flex flex-col items-center px-3 min-w-[80px]">
          <span className="text-[10px] tracking-wider text-zinc-400 font-bold mb-1">LLAVES</span>
          <div className="flex items-center gap-2">
            <Key className={`w-4 h-4 transition-colors ${keys.red ? "text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "text-zinc-700"}`} />
            <Key className={`w-4 h-4 transition-colors ${keys.blue ? "text-blue-500 fill-blue-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]" : "text-zinc-700"}`} />
            <Key className={`w-4 h-4 transition-colors ${keys.yellow ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" : "text-zinc-700"}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
