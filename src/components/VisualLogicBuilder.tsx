import React, { useState } from "react";
import { Layers, Wand2, Plus, Sparkles, Check, Play } from "lucide-react";
import { DivGraphic } from "../types";

interface VisualLogicBuilderProps {
  fpg: DivGraphic[];
  onInsertCode: (codeSnippet: string) => void;
}

export const VisualLogicBuilder: React.FC<VisualLogicBuilderProps> = ({ fpg, onInsertCode }) => {
  const [processName, setProcessName] = useState("nuevo_enemigo");
  const [selectedGraph, setSelectedGraph] = useState(fpg[0]?.id || 1);
  const [movementType, setMovementType] = useState<"patrol" | "player_4way" | "platformer" | "bullet" | "chase">("patrol");
  const [speed, setSpeed] = useState(4);
  const [canShoot, setCanShoot] = useState(false);
  const [collisionType, setCollisionType] = useState("laser_shot");
  const [hasExplosion, setHasExplosion] = useState(true);
  const [hasSound, setHasSound] = useState(true);
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate DIV Code based on visual settings
  const generateDivCode = () => {
    let movementLogic = "";
    let localVars = `  speed = ${speed};\n`;

    if (movementType === "patrol") {
      localVars += "  dir = 1;\n";
      movementLogic = `    x += speed * dir;\n    IF (x > 600 || x < 40) dir = -dir; END\n    y += 1;\n`;
    } else if (movementType === "player_4way") {
      movementLogic = `    IF (key(_left) || key(_a)) x -= speed; END\n    IF (key(_right) || key(_d)) x += speed; END\n    IF (key(_up) || key(_w)) y -= speed; END\n    IF (key(_down) || key(_s)) y += speed; END\n`;
    } else if (movementType === "platformer") {
      localVars += "  vy = 0;\n  gravity = 0.6;\n  on_ground = 0;\n";
      movementLogic = `    IF (key(_left)) x -= speed; flags = 1; END\n    IF (key(_right)) x += speed; flags = 0; END\n    IF (key(_space) && on_ground) vy = -12; on_ground = 0; END\n    vy += gravity;\n    y += vy;\n    IF (y >= 400) y = 400; vy = 0; on_ground = 1; END\n`;
    } else if (movementType === "bullet") {
      movementLogic = `    y -= speed;\n    IF (y < -20) signal(id, s_kill); END\n`;
    } else if (movementType === "chase") {
      movementLogic = `    // Perseguir objetivo\n    advance(speed);\n`;
    }

    let shootingLogic = "";
    if (canShoot) {
      localVars += "  cooldown = 0;\n";
      shootingLogic = `    IF (cooldown > 0) cooldown--; END\n    IF (key(_space) && cooldown == 0)\n      disparo(x, y - 16);\n      sound(1, 80, 256);\n      cooldown = 15;\n    END\n`;
    }

    let collisionLogic = "";
    if (collisionType) {
      collisionLogic = `    IF (collision(type ${collisionType}))\n`;
      if (hasSound) collisionLogic += `      sound(2, 90, 200);\n`;
      if (hasExplosion) collisionLogic += `      explosion(x, y);\n`;
      collisionLogic += `      score += 100;\n      signal(id, s_kill);\n    END\n`;
    }

    const code = `PROCESS ${processName}(x, y)\nLOCAL\n${localVars}BEGIN\n  graph = ${selectedGraph}; // Gráfico FPG\n  size = 100;\n  LOOP\n${movementLogic}${shootingLogic}${collisionLogic}    FRAME;\n  END\nEND\n`;

    setGeneratedCode(code);
    return code;
  };

  const handleApply = () => {
    const snippet = generateDivCode();
    onInsertCode(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] border border-slate-800 rounded-lg overflow-hidden text-xs text-slate-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1527] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-slate-100">Constructor Visual de Lógicas & Procesos</span>
          <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/40 text-[10px] font-mono">
            No-Code a DIV
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto">
        {/* Left: Configuration Form */}
        <div className="flex flex-col gap-3 bg-[#0a1020] p-4 rounded-lg border border-slate-800">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Nombre del Proceso</label>
            <input
              type="text"
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Sprite Gráfico (FPG)</label>
            <div className="grid grid-cols-4 gap-2">
              {fpg.slice(0, 8).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGraph(g.id)}
                  className={`p-2 rounded border flex flex-col items-center gap-1 ${
                    selectedGraph === g.id
                      ? "bg-slate-800 border-purple-400 ring-1 ring-purple-400"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    {g.dataUrl ? (
                      <img src={g.dataUrl} alt={g.name} className="w-7 h-7 object-contain pixelated" />
                    ) : (
                      <span>ID {g.id}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 truncate w-full text-center">
                    {g.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Comportamiento de Movimiento</label>
            <select
              value={movementType}
              onChange={(e: any) => setMovementType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
            >
              <option value="patrol">Patrulla horizontal (Enemigo con rebote)</option>
              <option value="player_4way">Control de Jugador (Flechas / WASD)</option>
              <option value="platformer">Plataformas 2D (Gravedad y Salto)</option>
              <option value="bullet">Proyectil / Disparo vertical</option>
              <option value="chase">Persecución continua</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Velocidad: {speed} px/frame</label>
            <input
              type="range"
              min={1}
              max={15}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={canShoot}
                onChange={(e) => setCanShoot(e.target.checked)}
                className="accent-purple-500 rounded"
              />
              <span>Capacidad de disparar con tecla ESPACIO</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasExplosion}
                onChange={(e) => setHasExplosion(e.target.checked)}
                className="accent-purple-500 rounded"
              />
              <span>Crear partículas de explosión al colisionar</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSound}
                onChange={(e) => setHasSound(e.target.checked)}
                className="accent-purple-500 rounded"
              />
              <span>Reproducir sonido de impacto / explosión</span>
            </label>
          </div>

          <button
            onClick={handleApply}
            className="w-full py-2 mt-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Plus className="w-4 h-4" />}
            <span>{copied ? "¡Insertado en Código!" : "Generar e Insertar en Editor"}</span>
          </button>
        </div>

        {/* Right: Live Preview of Generated DIV Code */}
        <div className="flex flex-col bg-[#050811] p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Código DIV Games Studio Generado
            </span>
            <button
              onClick={() => generateDivCode()}
              className="text-xs text-purple-400 hover:underline"
            >
              Actualizar vista previa
            </button>
          </div>

          <pre className="flex-1 p-3 bg-[#0a1020] rounded border border-slate-800/80 font-mono text-slate-200 text-[11px] overflow-auto leading-5 select-all">
            {generatedCode || generateDivCode()}
          </pre>
        </div>
      </div>
    </div>
  );
};
