import React, { useState, useEffect, useRef } from "react";
import { IDETabType } from "./components/IDEHeader";
import { StudioWorkspace } from "./components/StudioWorkspace";
import { WindowId } from "./components/WindowManager/types";
import { ExportModal } from "./components/ExportModal";
import { CloudSyncModal } from "./components/CloudSyncModal";
import { NewProjectModal, NewProjectData } from "./components/NewProjectModal";
import { AiSettingsModal } from "./components/AiSettingsModal";
import { DivRuntime } from "./engine/runtime";
import { PRESETS, GamePreset, BLANK_PROJECT_PRESET } from "./engine/presets";
import { DEFAULT_SPRITES } from "./engine/graphics";
import { DivGraphic, DivProcess } from "./types";
import { DivDiagnostic } from "./engine/divParser";
import {
  setupRuntimeFromDivCode,
  extractProgramName,
  extractResolutionFromCode,
} from "./engine/divCodeRunner";
import { parseDivToHtml5State } from "./engine/html5Engine";

export default function App() {
  const defaultPreset = BLANK_PROJECT_PRESET;
  const [currentPreset, setCurrentPreset] = useState<GamePreset>(defaultPreset);
  const [code, setCode] = useState<string>(defaultPreset.code);
  const [activeTab, setActiveTab] = useState<IDETabType>("visual");
  const [resolution, setResolution] = useState<"320x200" | "640x480" | "800x600">(defaultPreset.resolution);
  const [fpg, setFpg] = useState<DivGraphic[]>(DEFAULT_SPRITES);
  const [activeProcesses, setActiveProcesses] = useState<DivProcess[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [webWizardTrigger, setWebWizardTrigger] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [projectResetVersion, setProjectResetVersion] = useState<number>(1);

  const runtimeRef = useRef<DivRuntime>(new DivRuntime());
  const runtime = runtimeRef.current;

  // Show temporary toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Start active preset on mount (clean empty environment doesn't auto-run game loop)
  useEffect(() => {
    runtime.loadFPG(fpg);
    currentPreset.setupRuntime(runtime);
    if (currentPreset.id !== "empty_project") {
      runtime.start();
    }

    return () => {
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
    runtime.reset();
    runtime.loadFPG(fpg);

    const parsedState = parseDivToHtml5State(preset.code, preset.id);
    if (parsedState.active) {
      setupRuntimeFromDivCode(runtime, preset.code, preset.name);
    } else {
      preset.setupRuntime(runtime);
    }

    if (!runtime.isHtml5Mode && preset.id !== "empty_project") {
      runtime.start();
    }
    setProjectResetVersion((v) => v + 1);
    const isFormApp = Boolean(
      !preset.id.includes("landing") &&
      !preset.id.startsWith("web_") &&
      (preset.id.startsWith("app_") || preset.id === "game_arcade_canvas")
    );
    setActiveTab(isFormApp ? ("designer" as IDETabType) : ("code" as IDETabType));
    showToast(`Cargado: ${preset.name}`);
  };

  // Run or Restart game
  const handleRunGame = () => {
    runtime.stop();
    runtime.reset();
    runtime.loadFPG(fpg);

    const parsedState = parseDivToHtml5State(code, currentPreset.id);
    if (
      parsedState.active ||
      currentPreset.id.startsWith("custom_") ||
      currentPreset.id === "empty_project" ||
      code !== currentPreset.code
    ) {
      setupRuntimeFromDivCode(runtime, code, currentPreset.name);
    } else {
      currentPreset.setupRuntime(runtime);
    }

    if (!runtime.isHtml5Mode) {
      runtime.start();
      showToast("Ejecución iniciada a 60 FPS");
    } else {
      showToast(
        runtime.html5State.mode === "landing_page"
          ? "Sitio Web / Landing Page iniciado con DOM nativo"
          : "Aplicación HTML5 iniciada con DOM nativo"
      );
    }
  };

  const handleRestart = () => {
    runtime.stop();
    runtime.reset();
    runtime.loadFPG(fpg);

    const parsedState = parseDivToHtml5State(code, currentPreset.id);
    if (
      parsedState.active ||
      currentPreset.id.startsWith("custom_") ||
      currentPreset.id === "empty_project" ||
      code !== currentPreset.code
    ) {
      setupRuntimeFromDivCode(runtime, code, currentPreset.name);
    } else {
      currentPreset.setupRuntime(runtime);
    }

    if (!runtime.isHtml5Mode) {
      runtime.start();
      showToast("Juego reiniciado a 60 FPS");
    } else {
      showToast(
        runtime.html5State.mode === "landing_page"
          ? "Sitio Web / Landing Page reiniciado"
          : "Aplicación HTML5 reiniciada"
      );
    }
  };

  // Resolution change
  const handleChangeResolution = (res: "320x200" | "640x480" | "800x600") => {
    setResolution(res);
    runtime.setResolution(res);
    showToast(`Modo gráfico establecido a ${res}`);
  };

  // Append or Insert Code into Editor
  const handleInsertCode = (snippet: string) => {
    const updated = code + "\n\n" + snippet;
    setCode(updated);

    const progName = extractProgramName(updated) || currentPreset.name;
    setCurrentPreset((prev) => ({
      ...prev,
      name: progName,
      code: updated,
    }));
    showToast("Código insertado en el editor");
  };

  // Replace entire code (auto-applied from AI or user actions)
  const handleApplyFullCode = (newCode: string, customTitle?: string) => {
    setCode(newCode);

    const progName = customTitle?.trim() || extractProgramName(newCode) || "MiPrograma";
    const detectedRes = extractResolutionFromCode(newCode) || resolution;
    if (detectedRes !== resolution) {
      setResolution(detectedRes);
      runtime.setResolution(detectedRes);
    }

    setCurrentPreset((prev) => ({
      ...prev,
      name: progName,
      resolution: detectedRes,
      code: newCode,
    }));
    showToast("Código aplicado automáticamente en el editor DIV");
  };

  // Helper to configure runtime for custom/empty projects
  const setupCustomProjectRuntime = (rt: DivRuntime, projectTitle: string, projectCode?: string) => {
    if (projectCode && projectCode.trim().length > 0) {
      setupRuntimeFromDivCode(rt, projectCode, projectTitle);
      return;
    }

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
        genre: data.targetPlatform === "web" ? "Web HTML5" : "Arcade DIV",
        description: "Proyecto personalizado DIV Games Studio",
        resolution: data.resolution,
        code: data.code,
        setupRuntime: (rt) => setupCustomProjectRuntime(rt, data.title, data.code),
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

    const parsedState = parseDivToHtml5State(data.code, data.presetId || data.title);
    if (parsedState.active) {
      setupRuntimeFromDivCode(runtime, data.code, data.title);
    } else if (matchingPreset) {
      matchingPreset.setupRuntime(runtime);
    } else {
      setupCustomProjectRuntime(runtime, data.title, data.code);
    }

    if (!runtime.isHtml5Mode) {
      runtime.start();
    }
    const isFormApp = Boolean(
      !data.presetId?.includes("landing") &&
      !data.presetId?.startsWith("web_") &&
      (data.presetId?.startsWith("app_") || data.presetId === "game_arcade_canvas")
    );
    setProjectResetVersion((v) => v + 1);
    setActiveTab(isFormApp ? ("designer" as IDETabType) : ("code" as IDETabType));
    showToast(`Proyecto "${data.title}" creado con éxito`);
  };

  // Quick Export ZIP
  const handleQuickExportZip = () => {
    setIsExportOpen(true);
  };

  return (
    <div
      className="flex flex-col h-[100dvh] w-screen bg-[#F7F8FA] text-[#111827] overflow-hidden font-sans select-none"
      style={{ height: "100dvh", width: "100vw", overflow: "hidden" }}
    >
      {/* Unified Mobile & Desktop Studio Workspace */}
      <main
        className="w-full h-full flex-1 flex-grow min-h-0 flex flex-col overflow-hidden relative"
        style={{ height: "100%", width: "100%", flexGrow: 1, minHeight: 0 }}
      >
        <StudioWorkspace
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
          onChangeResolution={handleChangeResolution}
          onOpenAiSettings={() => setIsAiSettingsOpen(true)}
          requestedActiveTool={activeTab as WindowId}
          onResetRequestedActiveTool={() => setActiveTab(null as any)}
          currentPresetId={currentPreset.id}
          projectTitle={currentPreset.name}
          projectResetVersion={projectResetVersion}
          onSelectPreset={handleSelectPreset}
          onOpenNewProject={() => setIsNewProjectOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onQuickExportZip={handleQuickExportZip}
          onOpenCloudSync={() => setIsCloudSyncOpen(true)}
          openWebWizardTrigger={webWizardTrigger}
        />
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 md:bottom-5 right-4 left-4 sm:left-auto z-50 px-4 py-2.5 bg-white text-[#111827] border border-[#E2E8F0] rounded-xl shadow-lg text-xs font-medium flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#2F6F4E] flex-shrink-0" />
          <span className="truncate">{toastMessage}</span>
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
        onOpenWebWizard={() => setWebWizardTrigger((n) => n + 1)}
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
