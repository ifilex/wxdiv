import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StudioWorkspace,
  StudioTab,
  DesignMode,
  LogicMode,
  StudioToolId,
} from "./components/StudioWorkspace";
import { VB3Form } from "./components/VB3/types";
import { WindowId } from "./components/WindowManager/types";
import { ExportModal } from "./components/ExportModal";
import { CloudSyncModal } from "./components/CloudSyncModal";
import { NewProjectModal, NewProjectData } from "./components/NewProjectModal";
import { AiSettingsModal } from "./components/AiSettingsModal";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DivRuntime } from "./engine/runtime";
import { PRESETS, GamePreset, BLANK_PROJECT_PRESET } from "./engine/presets";
import { DEFAULT_SPRITES } from "./engine/graphics";
import { DivGraphic, DivProcess } from "./types";
import {
  setupRuntimeFromDivCode,
  extractProgramName,
  extractResolutionFromCode,
} from "./engine/divCodeRunner";
import { parseDivToHtml5State } from "./engine/html5Engine";
import { getAiConfig, saveAiConfig } from "./services/aiConfig";
import { loadIdeTheme, saveIdeTheme } from "./engine/ideTheme";
import {
  FALLBACK_WORKSPACE_LS_KEY,
  PersistedMode8Draft,
  PersistedWorkspaceState,
  hydrateDivGraphicList,
  hydrateFpgPackages,
  loadWorkspaceFromIndexedDB,
  saveMode8DraftToIndexedDB,
  saveWorkspaceToIndexedDB,
  serializeDivGraphicList,
  serializeFpgPackages,
  setLatestMode8Draft,
  setLatestWorkspaceSnapshot,
} from "./engine/indexedDbPersistence";

const MODE8_LS_DRAFT_KEY = "wxdiv_mode8_active_draft_v1";

function isMode8DivCode(src: string): boolean {
  return /\b(start_mode8|m8_set_doom_sector|m8_add_doom_line|m8_engine_mode|m8_add_model|m8_place_voxel)\b/i.test(
    src || ""
  );
}

function syncMode8DraftFromRuntime(rt: DivRuntime, projectTitle: string): void {
  const m8 = rt.m8[0];
  if (!m8 || !Array.isArray(m8.doomSectors) || m8.doomSectors.length === 0) return;

  const hasPlayerEnt = Array.isArray(m8.entities) && m8.entities.some((e) => e.type === "player");
  const entities = hasPlayerEnt
    ? m8.entities.map((e) => ({ ...e }))
    : [
        {
          id: "p1",
          type: "player" as const,
          x: (Number.isFinite(m8.x) ? m8.x : 4.5) * 64,
          y: (Number.isFinite(m8.y) ? m8.y : 7.5) * 64,
          graph: 1,
          name: "Blox Runner",
        },
        ...(m8.entities || []).map((e) => ({ ...e })),
      ];

  const draft: PersistedMode8Draft = {
    updatedAt: Date.now(),
    sectors: m8.doomSectors.map((s) => ({ ...s })),
    linedefs: m8.doomLinedefs.map((l) => ({ ...l })),
    entities,
    placedModels: (m8.placedModels || []).map((m) => ({ ...m })),
    placedVoxels: (m8.placedVoxels || []).map((v) => ({ ...v })),
    lights: (m8.lights || []).map((lt) => ({ ...lt })),
    currentLevelName: projectTitle || "Mundo 3D",
    gameConfig: {
      title: projectTitle || "Mundo 3D",
      cameraMode: m8.cameraMode || "third_person",
      skyTexture: m8.skyTexture || "SKY_ROBLOX",
      startingWeapon: m8.weaponModel || "sword3d",
      playerModelId: m8.playerModelId || "blox_hero",
      showHudAutomap: m8.showAutomap ?? true,
      autoSyncCode: true,
    },
    cam3D: {
      x: Number.isFinite(m8.x) ? m8.x : 4.5,
      y: Number.isFinite(m8.y) ? m8.y : 7.5,
      z: Number.isFinite(m8.z) ? m8.z : 0.0,
      angle: 0,
      pitch: 0,
    },
  };

  setLatestMode8Draft(draft);
  void saveMode8DraftToIndexedDB(draft);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(MODE8_LS_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage quota errors
    }
  }
}

interface WorkspaceDraft {
  code: string;
  resolution: "320x200" | "640x480" | "800x600";
  projectTitle: string;
  presetId: string;
  updatedAt?: number;
}

function loadWorkspaceDraft(): WorkspaceDraft | null {
  try {
    const raw = localStorage.getItem(FALLBACK_WORKSPACE_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.code !== "string") return null;
    const validRes =
      parsed.resolution === "320x200" ||
      parsed.resolution === "640x480" ||
      parsed.resolution === "800x600"
        ? parsed.resolution
        : "640x480";
    return {
      code: parsed.code,
      resolution: validRes,
      projectTitle:
        typeof parsed.projectTitle === "string" && parsed.projectTitle.trim()
          ? parsed.projectTitle
          : "MiProyecto",
      presetId:
        typeof parsed.presetId === "string" && parsed.presetId.trim()
          ? parsed.presetId
          : BLANK_PROJECT_PRESET.id,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

interface WorkspaceUiSnapshot {
  forms: VB3Form[];
  activeFormId: string;
  activeTab: StudioTab;
  designMode: DesignMode;
  logicMode: LogicMode;
  activeStudioTool: StudioToolId | null;
}

export default function App() {
  const savedDraftRef = useRef<WorkspaceDraft | null>(loadWorkspaceDraft());
  const initialDraft = savedDraftRef.current;
  const primaryMode8Preset =
    PRESETS.find((p) => p.id === "mode8_dungeon") || BLANK_PROJECT_PRESET;
  const matchedPreset = initialDraft
    ? PRESETS.find((p) => p.id === initialDraft.presetId) || BLANK_PROJECT_PRESET
    : primaryMode8Preset;
  const defaultPreset: GamePreset = initialDraft
    ? {
        ...matchedPreset,
        id: initialDraft.presetId,
        name: initialDraft.projectTitle,
        resolution: initialDraft.resolution,
        code: initialDraft.code,
        setupRuntime:
          initialDraft.code !== matchedPreset.code || isMode8DivCode(initialDraft.code)
            ? (rt) => setupRuntimeFromDivCode(rt, initialDraft.code, initialDraft.projectTitle)
            : matchedPreset.setupRuntime,
      }
    : primaryMode8Preset;

  const [currentPreset, setCurrentPreset] = useState<GamePreset>(defaultPreset);
  const [code, setCode] = useState<string>(defaultPreset.code);
  const [requestedTool, setRequestedTool] = useState<WindowId | null>(null);
  const [resolution, setResolution] = useState<"320x200" | "640x480" | "800x600">(defaultPreset.resolution);
  const [fpg, setFpg] = useState<DivGraphic[]>(DEFAULT_SPRITES);
  const [activeProcesses] = useState<DivProcess[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [webWizardTrigger, setWebWizardTrigger] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [projectResetVersion, setProjectResetVersion] = useState<number>(1);
  const [persistRevision, setPersistRevision] = useState<number>(0);
  const [syncedWorkspaceState, setSyncedWorkspaceState] = useState<{
    syncVersion: number;
    forms?: VB3Form[];
    activeFormId?: string;
    activeTab?: StudioTab;
    designMode?: DesignMode;
    logicMode?: LogicMode;
    activeStudioTool?: StudioToolId | null;
  }>({ syncVersion: 0 });

  const runtimeRef = useRef<DivRuntime>(new DivRuntime());
  const runtime = runtimeRef.current;
  const canPersistIdbRef = useRef<boolean>(false);
  const hasUserMutatedRef = useRef<boolean>(false);
  const workspaceUiRef = useRef<WorkspaceUiSnapshot>({
    forms: [],
    activeFormId: "",
    activeTab: "mode8",
    designMode: "mobile",
    logicMode: "blocks",
    activeStudioTool: null,
  });

  const resetRequestedTool = useCallback(() => {
    setRequestedTool(null);
  }, []);

  // Show temporary toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const buildCurrentSnapshot = useCallback(
    (overrides?: Partial<{ code: string; fpg: DivGraphic[]; resolution: "320x200" | "640x480" | "800x600"; preset: GamePreset }>): PersistedWorkspaceState => {
      const targetCode = overrides?.code ?? code;
      const targetFpg = overrides?.fpg ?? fpg;
      const targetRes = overrides?.resolution ?? resolution;
      const targetPreset = overrides?.preset ?? currentPreset;
      const ui = workspaceUiRef.current;

      return {
        version: 1,
        updatedAt: Date.now(),
        code: targetCode,
        settings: {
          presetId: targetPreset.id,
          projectTitle: targetPreset.name,
          resolution: targetRes,
          activeTab: ui.activeTab,
          designMode: ui.designMode,
          logicMode: ui.logicMode,
          activeStudioTool: ui.activeStudioTool,
          aiConfig: getAiConfig(),
          ideTheme: loadIdeTheme(),
        },
        fpg: serializeDivGraphicList(targetFpg),
        fpgPackages: serializeFpgPackages(runtime.fpgPackages),
        forms: ui.forms,
        activeFormId: ui.activeFormId,
      };
    },
    [code, fpg, resolution, currentPreset, runtime]
  );

  // Start active preset or restored draft on mount AND synchronize full cache from IndexedDB
  useEffect(() => {
    let cancelled = false;

    try {
      runtime.setResolution(resolution);
      runtime.loadFPG(fpg);
      if (initialDraft && initialDraft.code.trim() && initialDraft.code !== matchedPreset.code) {
        setupRuntimeFromDivCode(runtime, initialDraft.code, initialDraft.projectTitle);
        if (!runtime.isHtml5Mode) {
          runtime.start();
        }
      } else {
        currentPreset.setupRuntime(runtime);
        if (currentPreset.id !== "empty_project" && !runtime.isHtml5Mode) {
          runtime.start();
        }
      }
    } catch (err) {
      console.error("[App] Error inicializando runtime:", err);
    }

    (async () => {
      try {
        const idbState = await loadWorkspaceFromIndexedDB();
        if (cancelled) return;

        if (idbState && !hasUserMutatedRef.current) {
          const localUpdatedAt = initialDraft?.updatedAt ?? 0;

          // Hydrate FPG graphics and packages
          const hydratedFpg = hydrateDivGraphicList(idbState.fpg);
          if (hydratedFpg.length > 0) {
            setFpg(hydratedFpg);
            runtime.loadFPG(hydratedFpg);
          }

          if (Array.isArray(idbState.fpgPackages) && idbState.fpgPackages.length > 0) {
            const hydratedPkgs = hydrateFpgPackages(idbState.fpgPackages);
            runtime.fpgPackages.clear();
            hydratedPkgs.forEach((pkg) => {
              runtime.fpgPackages.set(pkg.id, pkg);
            });
            if (hydratedFpg.length > 0 && runtime.fpgPackages.has(0)) {
              const mainPkg = runtime.fpgPackages.get(0)!;
              runtime.fpgPackages.set(0, { ...mainPkg, graphics: hydratedFpg });
            }
          }

          // Hydrate project/IDE configs if present
          if (idbState.settings.aiConfig) {
            const currentAi = getAiConfig();
            if (!currentAi.apiKey && idbState.settings.aiConfig.apiKey) {
              saveAiConfig(idbState.settings.aiConfig);
            }
          }
          if (idbState.settings.ideTheme) {
            saveIdeTheme(idbState.settings.ideTheme);
          }

          // Hydrate code, preset, and resolution when IndexedDB is equal or newer than localStorage fallback
          if (idbState.updatedAt >= localUpdatedAt) {
            const idbPreset =
              PRESETS.find((p) => p.id === idbState.settings.presetId) || BLANK_PROJECT_PRESET;
            setCurrentPreset({
              ...idbPreset,
              id: idbState.settings.presetId,
              name: idbState.settings.projectTitle,
              resolution: idbState.settings.resolution,
              code: idbState.code,
              setupRuntime:
                idbState.code !== idbPreset.code || isMode8DivCode(idbState.code)
                  ? (rt) =>
                      setupRuntimeFromDivCode(
                        rt,
                        idbState.code,
                        idbState.settings.projectTitle
                      )
                  : idbPreset.setupRuntime,
            });
            setCode(idbState.code);
            setResolution(idbState.settings.resolution);
            runtime.setResolution(idbState.settings.resolution);

            try {
              if (
                idbState.code.trim() &&
                idbState.code.trim() !== BLANK_PROJECT_PRESET.code.trim()
              ) {
                runtime.stop();
                runtime.reset();
                runtime.loadFPG(hydratedFpg.length > 0 ? hydratedFpg : DEFAULT_SPRITES);
                setupRuntimeFromDivCode(
                  runtime,
                  idbState.code,
                  idbState.settings.projectTitle
                );
                if (!runtime.isHtml5Mode) {
                  runtime.start();
                }
              }
            } catch (setupErr) {
              console.warn("[App] Recuperación segura de código desde IndexedDB:", setupErr);
            }
          }

          // Restore VB3 forms and active editor workspace view
          const restoredTab =
            idbState.settings.activeTab && (idbState.settings.activeTab as string) !== "modular"
              ? (idbState.settings.activeTab as StudioTab)
              : "mode8";
          setSyncedWorkspaceState((prev) => ({
            syncVersion: prev.syncVersion + 1,
            forms: idbState.forms,
            activeFormId: idbState.activeFormId,
            activeTab: restoredTab,
            designMode: idbState.settings.designMode,
            logicMode: idbState.settings.logicMode,
            activeStudioTool: (idbState.settings.activeStudioTool as StudioToolId | null) ?? null,
          }));
        }
      } catch (err) {
        console.warn("[App] Error sincronizando caché IndexedDB al iniciar:", err);
      } finally {
        canPersistIdbRef.current = true;
        // Seed IndexedDB right away if empty so initial state is cached
        const initialSnap = buildCurrentSnapshot();
        setLatestWorkspaceSnapshot(initialSnap);
        void saveWorkspaceToIndexedDB(initialSnap);
      }
    })();

    return () => {
      cancelled = true;
      runtime.stop();
    };
  }, []);

  // Auto-persist complete editor snapshot to IndexedDB + fallback storage
  useEffect(() => {
    const snap = buildCurrentSnapshot();
    setLatestWorkspaceSnapshot(snap);

    if (!canPersistIdbRef.current) return;

    const timer = window.setTimeout(() => {
      void saveWorkspaceToIndexedDB(buildCurrentSnapshot());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [buildCurrentSnapshot, persistRevision]);

  const handleWorkspaceSnapshotChange = useCallback((snapshot: WorkspaceUiSnapshot) => {
    workspaceUiRef.current = snapshot;
    setPersistRevision((r) => r + 1);
  }, []);

  const handleFpgPackagesChanged = useCallback(() => {
    hasUserMutatedRef.current = true;
    setPersistRevision((r) => r + 1);
  }, []);

  const handleCodeChange = useCallback((newCode: string) => {
    hasUserMutatedRef.current = true;
    setCode(newCode);
  }, []);

  // Update runtime FPG whenever state updates
  const handleUpdateFpg = (newFpg: DivGraphic[]) => {
    hasUserMutatedRef.current = true;
    setFpg(newFpg);
    runtime.loadFPG(newFpg);
    setPersistRevision((r) => r + 1);
    showToast("Librería de sprites FPG actualizada");
  };

  const handleAddExplosionFrames = (newFrames: DivGraphic[]) => {
    hasUserMutatedRef.current = true;
    const updated = [...fpg, ...newFrames];
    setFpg(updated);
    runtime.loadFPG(updated);
    setPersistRevision((r) => r + 1);
    showToast(`Se han añadido ${newFrames.length} fotogramas de explosión a la librería FPG`);
  };

  // Switch preset
  const handleSelectPreset = (preset: GamePreset) => {
    hasUserMutatedRef.current = true;
    setCurrentPreset(preset);
    setCode(preset.code);
    setResolution(preset.resolution);
    runtime.stop();
    runtime.reset();
    runtime.loadFPG(fpg);

    const parsedState = parseDivToHtml5State(preset.code, preset.id);
    if (parsedState.active || isMode8DivCode(preset.code)) {
      setupRuntimeFromDivCode(runtime, preset.code, preset.name);
    } else {
      preset.setupRuntime(runtime);
    }

    if (isMode8DivCode(preset.code)) {
      syncMode8DraftFromRuntime(runtime, preset.name);
    }

    if (!runtime.isHtml5Mode && preset.id !== "empty_project") {
      runtime.start();
    }
    setProjectResetVersion((v) => v + 1);
    setPersistRevision((r) => r + 1);
    const isFormApp = Boolean(
      !preset.id.includes("landing") &&
      !preset.id.startsWith("web_") &&
      (preset.id.startsWith("app_") || preset.id === "game_arcade_canvas")
    );
    setRequestedTool(isMode8DivCode(preset.code) ? "mode8" : isFormApp ? "designer" : "code");
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
      isMode8DivCode(code) ||
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
      isMode8DivCode(code) ||
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
    hasUserMutatedRef.current = true;
    setResolution(res);
    runtime.setResolution(res);
    setPersistRevision((r) => r + 1);
    showToast(`Modo gráfico establecido a ${res}`);
  };

  // Append or Insert Code into Editor
  const handleInsertCode = (snippet: string) => {
    hasUserMutatedRef.current = true;
    const updated = code + "\n\n" + snippet;
    setCode(updated);

    const progName = extractProgramName(updated) || currentPreset.name;
    const mode8Code = isMode8DivCode(updated);
    setCurrentPreset((prev) => ({
      ...prev,
      id: prev.id.startsWith("custom_")
        ? prev.id
        : (mode8Code ? "custom_mode8_" : "custom_") + Date.now(),
      name: progName,
      code: updated,
      setupRuntime: (rt) => setupRuntimeFromDivCode(rt, updated, progName),
    }));
    setPersistRevision((r) => r + 1);
    showToast("Código insertado en el editor");
  };

  // Replace entire code (auto-applied from AI or user actions)
  const handleApplyFullCode = (newCode: string, customTitle?: string) => {
    hasUserMutatedRef.current = true;
    setCode(newCode);

    const progName = customTitle?.trim() || extractProgramName(newCode) || "MiPrograma";
    const detectedRes = extractResolutionFromCode(newCode) || resolution;
    if (detectedRes !== resolution) {
      setResolution(detectedRes);
      runtime.setResolution(detectedRes);
    }

    const mode8Code = isMode8DivCode(newCode);
    setCurrentPreset((prev) => ({
      ...prev,
      id: prev.id.startsWith("custom_")
        ? prev.id
        : (mode8Code ? "custom_mode8_" : "custom_") + Date.now(),
      name: progName,
      genre: mode8Code ? "Juego 3D Modo 8" : prev.genre,
      resolution: detectedRes,
      code: newCode,
      setupRuntime: (rt) => setupRuntimeFromDivCode(rt, newCode, progName),
    }));
    setPersistRevision((r) => r + 1);
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
    hasUserMutatedRef.current = true;
    setCode(data.code);
    setResolution(data.resolution);

    const matchingPreset = PRESETS.find((p) => p.id === data.presetId);
    const mode8Code = isMode8DivCode(data.code);
    const nextPreset: GamePreset = matchingPreset
      ? {
          ...matchingPreset,
          id:
            data.code !== matchingPreset.code || mode8Code
              ? (mode8Code ? "custom_mode8_" : "custom_") + Date.now()
              : matchingPreset.id,
          name: data.title,
          resolution: data.resolution,
          code: data.code,
          setupRuntime:
            data.code !== matchingPreset.code || mode8Code
              ? (rt) => setupRuntimeFromDivCode(rt, data.code, data.title)
              : matchingPreset.setupRuntime,
        }
      : {
          id: (mode8Code ? "custom_mode8_" : "custom_") + Date.now(),
          name: data.title,
          genre: mode8Code
            ? "Juego 3D Modo 8"
            : data.targetPlatform === "web"
            ? "Web HTML5"
            : "Arcade DIV",
          description: "Proyecto personalizado DIV Games Studio",
          resolution: data.resolution,
          code: data.code,
          setupRuntime: (rt) => setupCustomProjectRuntime(rt, data.title, data.code),
        };
    setCurrentPreset(nextPreset);

    if (data.sprites && data.sprites.length > 0) {
      setFpg(data.sprites);
      runtime.loadFPG(data.sprites);
    }

    runtime.stop();
    runtime.reset();
    runtime.setResolution(data.resolution);
    runtime.loadFPG(data.sprites && data.sprites.length > 0 ? data.sprites : fpg);

    const parsedState = parseDivToHtml5State(data.code, data.presetId || data.title);
    if (
      parsedState.active ||
      mode8Code ||
      (data.code.trim().length > 0 && (!matchingPreset || data.code !== matchingPreset.code))
    ) {
      setupRuntimeFromDivCode(runtime, data.code, data.title);
    } else if (matchingPreset) {
      matchingPreset.setupRuntime(runtime);
    } else {
      setupCustomProjectRuntime(runtime, data.title, data.code);
    }

    if (mode8Code) {
      syncMode8DraftFromRuntime(runtime, data.title);
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
    setPersistRevision((r) => r + 1);
    setRequestedTool(mode8Code ? "mode8" : isFormApp ? "designer" : "code");
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
        <ErrorBoundary sectionName="WXDIV Studio">
          <StudioWorkspace
            runtime={runtime}
            code={code}
            onChangeCode={handleCodeChange}
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
            requestedActiveTool={requestedTool}
            onResetRequestedActiveTool={resetRequestedTool}
            currentPresetId={currentPreset.id}
            projectTitle={currentPreset.name}
            projectResetVersion={projectResetVersion}
            onSelectPreset={handleSelectPreset}
            onOpenNewProject={() => setIsNewProjectOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            onQuickExportZip={handleQuickExportZip}
            onOpenCloudSync={() => setIsCloudSyncOpen(true)}
            openWebWizardTrigger={webWizardTrigger}
            syncedSnapshot={syncedWorkspaceState}
            onWorkspaceSnapshotChange={handleWorkspaceSnapshotChange}
            onFpgPackagesChanged={handleFpgPackagesChanged}
          />
        </ErrorBoundary>
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
        onSaved={() => {
          setPersistRevision((r) => r + 1);
          showToast("Configuración de IA actualizada");
        }}
      />
      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
