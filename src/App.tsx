// WXDIV 3.00

import React, { useState, useEffect, useRef } from "react";
import { IDEHeader, IDETabType } from "./components/IDEHeader";
import { WindowManager } from "./components/WindowManager/WindowManager";
import { WindowId } from "./components/WindowManager/types";
import { ExportModal } from "./components/ExportModal";
import { CloudSyncModal } from "./components/CloudSyncModal";
import { NewProjectModal, NewProjectData } from "./components/NewProjectModal";
import { AiSettingsModal } from "./components/AiSettingsModal";
import { DivRuntime } from "./engine/runtime";
import { PRESETS, GamePreset } from "./engine/presets";
import { DEFAULT_SPRITES } from "./engine/graphics";
import { DivGraphic, DivProcess } from "./types";
import { DivDiagnostic } from "./engine/divParser";

export default function App() {
  const [currentPreset, setCurrentPreset] = useState<GamePreset>(PRESETS[0]);
  const [code, setCode] = useState<string>(PRESETS[0].code);
  const [activeTab, setActiveTab] = useState<IDETabType>("code");
  const [resolution, setResolution] = useState<"320x200" | "640x480" | "800x600">(PRESETS[0].resolution);
  const [fpg, setFpg] = useState<DivGraphic[]>(DEFAULT_SPRITES);
  const [activeProcesses, setActiveProcesses] = useState<DivProcess[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const runtimeRef = useRef<DivRuntime>(new DivRuntime());
  const runtime = runtimeRef.current;

  // Show temporary toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Start active preset on mount
  useEffect(() => {
    runtime.loadFPG(fpg);
    currentPreset.setupRuntime(runtime);
    runtime.start();

    // Process tracking hook
    const interval = setInterval(() => {
      if (runtime) {
        if (typeof runtime.getActiveProcesses === "function") {
          setActiveProcesses(runtime.getActiveProcesses());
        } else if (runtime.processes && typeof runtime.processes.values === "function") {
          setActiveProcesses((Array.from(runtime.processes.values()) as DivProcess[]).filter((p) => !p.isDead));
        }
      }
    }, 200);

    return () => {
      clearInterval(interval);
      runtime.stop();
    };
  }, []);

  // Update runtime FPG whenever state updates
  const handleUpdateFpg = (newFpg: DivGraphic[]) => {
    setFpg(newFpg);
    runtime.loadFPG(newFpg);
    showToast("Librería de sprites FPG actualizada");
  };

  const handleAddExplosionFrames = (newFrames: DivGraphic[]) => {
    const updated = [...fpg, ...newFrames];
    setFpg(updated);
    runtime.loadFPG(updated);
    showToast(`Se han añadido ${newFrames.length} fotogramas de explosión a la librería FPG`);
  };

  // Switch preset
  const handleSelectPreset = (preset: GamePreset) => {
    setCurrentPreset(preset);
    setCode(preset.code);
    setResolution(preset.resolution);
    runtime.stop();
    runtime.loadFPG(fpg);
    preset.setupRuntime(runtime);
    runtime.start();
    showToast(`Cargado preset: ${preset.name}`);
  };

  // Run or Restart game
  const handleRunGame = () => {
    runtime.stop();
    runtime.loadFPG(fpg);
    currentPreset.setupRuntime(runtime);
    runtime.start();
    showToast("Ejecución iniciada a 60 FPS");
  };

  const handleRestart = () => {
    runtime.stop();
    runtime.reset();
    runtime.loadFPG(fpg);
    currentPreset.setupRuntime(runtime);
    runtime.start();
    showToast("Juego reiniciado");
  };

  // Resolution change
  const handleChangeResolution = (res: "320x200" | "640x480" | "800x600") => {
    setResolution(res);
    runtime.setResolution(res);
    showToast(`Modo gráfico establecido a ${res}`);
  };

  // Append or Insert Code into Editor
  const handleInsertCode = (snippet: string) => {
    setCode((prev) => prev + "\n\n" + snippet);
    setActiveTab("code");
    showToast("Proceso insertado en el editor");
  };

  // Replace entire code
  const handleApplyFullCode = (newCode: string) => {
    setCode(newCode);
    setActiveTab("code");
    showToast("Código reemplazado con éxito");
  };

  // Helper to configure runtime for custom/empty projects
  const setupCustomProjectRuntime = (rt: DivRuntime, projectTitle: string) => {
    rt.reset();
    rt.backgroundColor = "#070b14";
    const fpgId = rt.load_fpg("juego.fpg");
    const fontId = rt.load_fnt("arcade.fnt");
    rt.write(fontId, 20, 25, 0, projectTitle.toUpperCase());
    rt.write(fontId, 20, 50, 0, "SCORE: 0");
    rt.write(fontId, rt.width - 130, 50, 0, "VIDAS: 3");

    rt.registerProcess("jugador", function* (proc, args, runtime) {
      proc.file = fpgId;
      proc.graph = 1;
      proc.size = 120;
      proc.x = args[0] ?? (runtime.width / 2);
      proc.y = args[1] ?? (runtime.height / 2);

      while (!proc.isDead) {
        const spd = 5;
        if (runtime.key("left") || runtime.key("a")) proc.x -= spd;
        if (runtime.key("right") || runtime.key("d")) proc.x += spd;
        if (runtime.key("up") || runtime.key("w")) proc.y -= spd;
        if (runtime.key("down") || runtime.key("s")) proc.y += spd;

        proc.x = Math.max(20, Math.min(runtime.width - 20, proc.x));
        proc.y = Math.max(20, Math.min(runtime.height - 20, proc.y));

        if (runtime.key("space") || runtime.key("enter")) {
          runtime.sound(1, 80, 320);
          runtime.spawn("destello", [proc.x, proc.y], proc.id);
        }

        yield;
      }
    });

    rt.registerProcess("destello", function* (proc, args) {
      proc.graph = 2;
      proc.x = args[0];
      proc.y = args[1];
      proc.size = 60;
      for (let t = 0; t < 6; t++) {
        proc.size += 12;
        yield;
      }
      proc.isDead = true;
    });

    rt.spawn("jugador", [rt.width / 2, rt.height / 2]);
  };

  // Handle New Project Creation
  const handleCreateNewProject = (data: NewProjectData) => {
    setCode(data.code);
    setResolution(data.resolution);

    const matchingPreset = PRESETS.find((p) => p.id === data.presetId);
    if (matchingPreset) {
      setCurrentPreset({
        ...matchingPreset,
        name: data.title,
        resolution: data.resolution,
        code: data.code,
      });
    } else {
      // Custom new project preset
      const customPreset: GamePreset = {
        id: "custom_" + Date.now(),
        name: data.title,
        genre: "Arcade DIV",
        description: "Proyecto personalizado DIV Games Studio",
        resolution: data.resolution,
        code: data.code,
        setupRuntime: (rt) => setupCustomProjectRuntime(rt, data.title),
      };
      setCurrentPreset(customPreset);
    }

    if (data.sprites && data.sprites.length > 0) {
      setFpg(data.sprites);
      runtime.loadFPG(data.sprites);
    }

    runtime.stop();
    runtime.reset();
    runtime.setResolution(data.resolution);
    runtime.loadFPG(data.sprites && data.sprites.length > 0 ? data.sprites : fpg);

    if (matchingPreset) {
      matchingPreset.setupRuntime(runtime);
    } else {
      setupCustomProjectRuntime(runtime, data.title);
    }

    runtime.start();
    setActiveTab("code");
    showToast(`Proyecto "${data.title}" creado con éxito`);
  };

  // Quick Export ZIP
  const handleQuickExportZip = () => {
    setIsExportOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050811] text-slate-100 overflow-hidden font-sans">
      {/* Top IDE Header */}
      <IDEHeader
        currentPresetId={currentPreset.id}
        onSelectPreset={handleSelectPreset}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        resolution={resolution}
        onChangeResolution={handleChangeResolution}
        isRunning={runtime.isRunning}
        onRun={handleRunGame}
        onRestart={handleRestart}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onQuickExportZip={handleQuickExportZip}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
      />

      {/* Main Studio Desktop: Multi-Window Workspace (DIV Games Studio OS) */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <WindowManager
          runtime={runtime}
          code={code}
          onChangeCode={setCode}
          onRunGame={handleRunGame}
          onRestartGame={handleRestart}
          fpg={fpg}
          onUpdateFpg={handleUpdateFpg}
          onAddExplosionFrames={handleAddExplosionFrames}
          onInsertCode={handleInsertCode}
          onApplyFullCode={handleApplyFullCode}
          activeProcesses={activeProcesses}
          resolution={resolution}
          onOpenAiSettings={() => setIsAiSettingsOpen(true)}
          requestedActiveTool={activeTab as WindowId}
        />
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-3.5 py-2 bg-slate-900/95 text-cyan-300 border border-cyan-500/40 rounded-lg shadow-xl text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Multiplatform Export & Report Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        gameTitle={currentPreset.name}
        code={code}
        fpg={fpg}
        resolution={resolution}
        presetId={currentPreset.id}
      />

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreateProject={handleCreateNewProject}
        hasUnsavedChanges={code !== currentPreset.code}
      />

      {/* Cloud Sync, Real-time Collab & 2FA Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
      />

      {/* AI Engine & API Key Configuration Modal (Sin tener que recurrir al archivo .env) */}
      <AiSettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
        onSaved={() => showToast("Configuración de IA actualizada")}
      />
    </div>
  );
}
