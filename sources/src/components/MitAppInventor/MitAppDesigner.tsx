import React, { useState, useRef } from "react";
import {
  Smartphone,
  Tablet,
  RotateCw,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Layers,
  Palette,
  Eye,
  EyeOff,
  Settings,
  Sliders,
  Type,
  Square,
  CheckSquare,
  ToggleLeft,
  Volume2,
  Clock,
  Sparkles,
  Play,
  Share2,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  DesignerComponent,
  DesignerComponentType,
  ScreenProperties,
  DeviceType,
  DeviceOrientation,
  PALETTE_CATEGORIES,
  DEFAULT_SCREEN_PROPERTIES,
} from "./designerTypes";

interface MitAppDesignerProps {
  components: DesignerComponent[];
  screenProps: ScreenProperties;
  onUpdateComponents: (components: DesignerComponent[]) => void;
  onUpdateScreenProps: (props: ScreenProperties) => void;
  onSwitchToBlocks?: () => void;
  onRunGame?: () => void;
  headerLeftSlot?: React.ReactNode;
  headerRightSlot?: React.ReactNode;
}

export const MitAppDesigner: React.FC<MitAppDesignerProps> = ({
  components,
  screenProps,
  onUpdateComponents,
  onUpdateScreenProps,
  onSwitchToBlocks,
  onRunGame,
  headerLeftSlot,
  headerRightSlot,
}) => {
  // Selection state
  const [selectedId, setSelectedId] = useState<string>("Screen1");

  // Device simulation state
  const [deviceType, setDeviceType] = useState<DeviceType>("phone");
  const [orientation, setOrientation] = useState<DeviceOrientation>("portrait");
  const [zoom, setZoom] = useState<number>(100);

  // Mobile drawer tabs (for smartphone/tablet IDE responsiveness)
  const [activeMobileDrawer, setActiveMobileDrawer] = useState<"palette" | "canvas" | "properties" | "tree">("canvas");

  // Interactive live mobile simulator modal & feedback banner
  const [isLiveSimulatorOpen, setIsLiveSimulatorOpen] = useState(false);
  const [simulatorBanner, setSimulatorBanner] = useState<string | null>(null);

  // Rename modal state
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const selectedComponent = components.find((c) => c.id === selectedId) || null;
  const isScreenSelected = selectedId === "Screen1";

  // Color Swatches for quick selection
  const COLOR_SWATCHES = [
    "#ffffff",
    "#f3f4f6",
    "#e2e8f0",
    "#1e293b",
    "#0f172a",
    "#000000",
    "#5b871c", // App Inventor Green
    "#80b62b",
    "#2563eb", // DIV Blue
    "#0284c7",
    "#0d9488",
    "#16a34a",
    "#eab308",
    "#ea580c",
    "#dc2626",
    "#db2777",
    "#9333ea",
  ];

  // Helper to add component from palette
  const handleAddComponent = (type: DesignerComponentType, defaultName: string) => {
    const count = components.filter((c) => c.type === type).length + 1;
    const name = `${type}${count}`;
    const newComp: DesignerComponent = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      name,
      text: type === "Button" ? `Texto para ${name}` : type === "Label" ? `Etiqueta ${count}` : type === "TextBox" ? "" : name,
      textColor: type === "Button" ? "#ffffff" : "#1f2937",
      backgroundColor: type === "Button" ? screenProps.primaryColor || "#5b871c" : type === "Canvas" ? "#0f172a" : "transparent",
      fontSize: type === "Label" ? 15 : 14,
      fontBold: type === "Button" || type === "Label",
      width: type === "Button" || type === "TextBox" || type === "Canvas" ? "fill" : "auto",
      height: type === "Canvas" ? 220 : "auto",
      enabled: true,
      visible: true,
      alignment: "center",
      hint: type === "TextBox" ? "Escribe aquí..." : undefined,
      value: type === "Slider" ? 50 : undefined,
      checked: type === "Switch" ? true : type === "CheckBox" ? false : undefined,
      icon: type === "Button" ? "🔘" : undefined,
    };

    const updated = [...components, newComp];
    onUpdateComponents(updated);
    setSelectedId(newComp.id);
  };

  // Delete component
  const handleDeleteComponent = (id: string) => {
    if (id === "Screen1") return;
    const updated = components.filter((c) => c.id !== id);
    onUpdateComponents(updated);
    setSelectedId("Screen1");
  };

  // Duplicate component
  const handleDuplicateComponent = (comp: DesignerComponent) => {
    const copyComp: DesignerComponent = {
      ...comp,
      id: `comp_${Date.now()}_copy`,
      name: `${comp.name}_Copia`,
    };
    const updated = [...components, copyComp];
    onUpdateComponents(updated);
    setSelectedId(copyComp.id);
  };

  // Move component up or down
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= components.length) return;
    const newComps = [...components];
    const temp = newComps[index];
    newComps[index] = newComps[targetIdx];
    newComps[targetIdx] = temp;
    onUpdateComponents(newComps);
  };

  // Update property of selected component
  const handleUpdateSelected = (patch: Partial<DesignerComponent>) => {
    if (!selectedComponent) return;
    const updated = components.map((c) => (c.id === selectedComponent.id ? { ...c, ...patch } : c));
    onUpdateComponents(updated);
  };

  // Handle renaming
  const handleApplyRename = () => {
    if (!renameTargetId || !renameValue.trim()) return;
    const clean = renameValue.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (renameTargetId === "Screen1") {
      onUpdateScreenProps({ ...screenProps, title: clean });
    } else {
      const updated = components.map((c) => (c.id === renameTargetId ? { ...c, name: clean } : c));
      onUpdateComponents(updated);
    }
    setRenameTargetId(null);
  };

  // Filter visible vs non-visible components (Clock, Sound are non-visible)
  const visibleComponents = components.filter((c) => c.type !== "Clock" && c.type !== "Sound");
  const nonVisibleComponents = components.filter((c) => c.type === "Clock" || c.type === "Sound");

  // Device dimensions calculation
  const getDeviceDimensions = () => {
    if (deviceType === "tablet") {
      return orientation === "portrait" ? { width: 520, height: 680 } : { width: 680, height: 500 };
    }
    if (deviceType === "monitor") {
      return { width: 620, height: 440 };
    }
    // Phone
    return orientation === "portrait" ? { width: 340, height: 620 } : { width: 600, height: 340 };
  };

  const dims = getDeviceDimensions();

  return (
    <div className="flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#F7F8FA] text-[#111827] font-sans select-none overflow-hidden text-xs">
      {/* Unified Single-Row Toolbar: Mode Switcher + Device + Mobile Drawers + Preview */}
      <div className="flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 bg-white border-b border-[#E2E8F0] text-[#4B5563] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap flex-shrink-0 z-20 min-h-[48px]">
        <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
          {headerLeftSlot}

          <div className="inline-flex rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setDeviceType("phone")}
              className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                deviceType === "phone"
                  ? "bg-white text-[#7C2D48] shadow-2xs"
                  : "text-[#4B5563] hover:text-[#111827]"
              }`}
              title="Formato Teléfono Celular"
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Celular</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceType("tablet")}
              className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                deviceType === "tablet"
                  ? "bg-white text-[#7C2D48] shadow-2xs"
                  : "text-[#4B5563] hover:text-[#111827]"
              }`}
              title="Formato Tableta"
            >
              <Tablet className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOrientation(orientation === "portrait" ? "landscape" : "portrait")}
            className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-[#4B5563] border border-[#E2E8F0] text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            title="Cambiar orientación"
          >
            <RotateCw className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
            <span className="hidden lg:inline">
              {orientation === "portrait" ? "Vertical" : "Horizontal"}
            </span>
          </button>
        </div>

        <div className="hidden 2xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0] text-[#4B5563] text-xs shrink-0 whitespace-nowrap">
          <span>App: <b className="text-[#111827]">{screenProps.appName || "Mi App"}</b></span>
          <span className="text-slate-300">·</span>
          <span>Pantalla: <b className="text-[#7C2D48]">{screenProps.title}</b></span>
        </div>

        <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
          <div className="flex lg:hidden bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-0.5 shrink-0">
            {(
              [
                { id: "palette", label: "Paleta" },
                { id: "canvas", label: "Vista" },
                { id: "properties", label: "Ajustes" },
                { id: "tree", label: "Capas" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMobileDrawer(tab.id)}
                className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                  activeMobileDrawer === tab.id ? "bg-white text-[#7C2D48] shadow-2xs" : "text-[#4B5563]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsLiveSimulatorOpen(true)}
            className="min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg bg-[#2F6F4E] hover:bg-[#25593E] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Probar WebApp interactiva"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span className="hidden sm:inline">Vista Previa</span>
          </button>

          {headerRightSlot}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 flex-grow min-h-0 w-full overflow-hidden relative">
        {/* PANEL 1: PALETTE */}
        <div
          className={`w-60 lg:w-52 xl:w-60 bg-white border-r border-[#E2E8F0] flex flex-col flex-shrink-0 z-10 ${
            activeMobileDrawer === "palette" ? "flex absolute inset-0 w-full sm:w-80 z-30 shadow-xl" : "hidden lg:flex"
          }`}
        >
          <div className="px-3 py-2.5 bg-[#F7F8FA] border-b border-[#E2E8F0] font-bold text-[#111827] flex items-center justify-between">
            <span>Componentes</span>
            <button
              type="button"
              onClick={() => setActiveMobileDrawer("canvas")}
              className="lg:hidden px-2 py-1 rounded-md bg-white border border-[#E2E8F0] text-[11px] font-semibold text-[#4B5563]"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {PALETTE_CATEGORIES.map((cat) => (
              <div key={cat.id} className="border border-[#E2E8F0] rounded-xl bg-white overflow-hidden">
                <div className="px-2.5 py-1.5 bg-[#F7F8FA] border-b border-[#E2E8F0] font-bold text-[#111827] flex items-center gap-1.5 text-[11px]">
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </div>
                <div className="p-1 space-y-0.5">
                  {cat.items.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => {
                        handleAddComponent(item.type, item.name);
                        if (activeMobileDrawer === "palette") setActiveMobileDrawer("canvas");
                      }}
                      className="w-full min-h-[40px] px-2 py-1.5 rounded hover:bg-[#e9eedb] active:bg-[#d7e3bd] text-left flex items-center justify-between group transition-colors cursor-pointer"
                      title={item.desc}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{item.icon}</span>
                        <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-[#5b871c] lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* PANEL 2: VIEWER (VISOR CELULAR / TABLET)                              */}
        {/* ===================================================================== */}
        <div
          className={`flex-1 flex flex-col items-center justify-start p-3 sm:p-4 bg-[#d8d8d8] overflow-auto relative gap-2.5 ${
            activeMobileDrawer === "canvas" ? "flex" : "hidden lg:flex"
          }`}
          style={{
            backgroundImage: "radial-gradient(#b0b0b0 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          onClick={() => setSelectedId("Screen1")}
        >
          {/* Top Label in flow layout so it never overlaps the device */}
          <div className="w-full flex items-center justify-between gap-2 flex-shrink-0">
            <div className="px-2.5 py-1 rounded bg-white/90 border border-slate-300 font-bold text-slate-700 shadow-2xs text-[11px] flex items-center gap-1.5 min-w-0 truncate">
              <span className="truncate">
                Visor Móvil ({deviceType === "phone" ? "Smartphone" : "Tablet"}) · {orientation}
              </span>
            </div>
            {selectedComponent && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 bg-slate-900 text-white rounded-lg px-2 py-1 text-[10px] shadow-md max-w-full overflow-x-auto"
              >
                <span className="font-bold px-1 text-cyan-300 truncate max-w-[90px]">
                  {selectedComponent.name}
                </span>
                {(() => {
                  const selIdx = components.findIndex((c) => c.id === selectedComponent.id);
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => selIdx > 0 && handleMove(selIdx, "up")}
                        disabled={selIdx <= 0}
                        className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"
                        title="Subir"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => selIdx >= 0 && selIdx < components.length - 1 && handleMove(selIdx, "down")}
                        disabled={selIdx < 0 || selIdx >= components.length - 1}
                        className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"
                        title="Bajar"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => handleDuplicateComponent(selectedComponent)}
                  className="p-1 hover:bg-slate-700 rounded cursor-pointer"
                  title="Duplicar"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteComponent(selectedComponent.id)}
                  className="p-1 hover:bg-rose-600 rounded text-rose-300 cursor-pointer"
                  title="Borrar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Realistic Phone / Tablet Frame (proportionally scaled via @container so aspect ratio never squishes on tablets) */}
          <div className="@container flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
            <div
              className="bg-[#18181b] rounded-[38px] p-3 shadow-2xl border-4 border-[#27272a] relative flex flex-col transition-all duration-200 select-none flex-shrink-0"
              style={{
                width: `min(${dims.width}px, 96cqw, calc(96cqh * ${dims.width} / ${dims.height}))`,
                aspectRatio: `${dims.width} / ${dims.height}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Speaker bar & Front Camera notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
              <div className="w-12 h-1 bg-[#2e2e33] rounded-full" />
              <div className="w-2.5 h-2.5 bg-[#09090b] border border-[#27272a] rounded-full" />
            </div>

            {/* Simulated Phone Screen */}
            <div
              className="flex-1 w-full h-full rounded-[28px] overflow-hidden flex flex-col relative transition-colors"
              style={{
                backgroundColor: screenProps.backgroundColor || "#ffffff",
                color: screenProps.textColor || "#1f2937",
              }}
            >
              {/* 1. Phone Status Bar */}
              {screenProps.showStatusBar && (
                <div className="w-full px-4 py-1 flex items-center justify-between text-[10px] font-bold bg-black/10 select-none z-10 flex-shrink-0">
                  <span>12:30</span>
                  <div className="flex items-center gap-1 text-[9px]">
                    <span>5G</span>
                    <span>📶</span>
                    <span>🔋 100%</span>
                  </div>
                </div>
              )}

              {/* 2. App Screen Title Bar */}
              {screenProps.titleVisible && (
                <div
                  className="w-full px-3.5 py-2 flex items-center justify-between gap-2 shadow-xs select-none transition-colors flex-shrink-0 min-w-0"
                  style={{
                    backgroundColor: screenProps.primaryColor || "#5b871c",
                    color: "#ffffff",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId("Screen1");
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base flex-shrink-0">{screenProps.icon || "📱"}</span>
                    <span className="font-bold text-sm tracking-wide truncate min-w-0">
                      {screenProps.title || "Screen1"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs opacity-80 flex-shrink-0">
                    <span>⋮</span>
                  </div>
                </div>
              )}

              {/* 3. Screen Body / Placed Components List */}
              <div
                className={`flex-1 min-h-0 p-3 flex flex-col gap-2.5 overflow-x-hidden ${
                  screenProps.scrollable ? "overflow-y-auto" : "overflow-hidden"
                }`}
                onClick={() => setSelectedId("Screen1")}
              >
                {visibleComponents.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-300 rounded-xl my-4 text-slate-400">
                    <span className="text-4xl mb-2">📲</span>
                    <p className="font-bold text-xs text-slate-600 mb-1">Pantalla vacía</p>
                    <p className="text-[11px] max-w-[200px] leading-relaxed">
                      Haz clic en cualquier elemento de la <b>Paleta</b> izquierda para agregar botones, etiquetas, campos de texto o lienzos a tu app.
                    </p>
                  </div>
                ) : (
                  visibleComponents.map((comp) => {
                    const isSelected = selectedId === comp.id;

                    return (
                      <div
                        key={comp.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(comp.id);
                        }}
                        className={`relative group transition-all cursor-pointer rounded-lg w-full min-w-0 max-w-full overflow-hidden flex-shrink-0 ${
                          isSelected
                            ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent shadow-md"
                            : "hover:ring-1 hover:ring-slate-400/60"
                        }`}
                      >
                        {/* ======================================================= */}
                        {/* COMPONENT RENDERING ACCORDING TO TYPE                   */}
                        {/* ======================================================= */}
                        {comp.type === "Button" && (
                          <button
                            type="button"
                            className="w-full py-2.5 px-3 rounded-xl font-bold shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-98 min-w-0 max-w-full overflow-hidden"
                            style={{
                              backgroundColor: comp.backgroundColor || screenProps.primaryColor || "#5b871c",
                              color: comp.textColor || "#ffffff",
                              fontSize: comp.fontSize || 14,
                              fontWeight: comp.fontBold ? "bold" : "normal",
                            }}
                          >
                            <span className="truncate max-w-full">{comp.text || "Botón"}</span>
                          </button>
                        )}

                        {comp.type === "Label" && (
                          <div
                            className="py-1 px-1.5 w-full min-w-0 break-words overflow-hidden"
                            style={{
                              color: comp.textColor || "#1f2937",
                              fontSize: comp.fontSize || 15,
                              fontWeight: comp.fontBold ? "bold" : "normal",
                              textAlign: comp.alignment || "left",
                            }}
                          >
                            {comp.text || "Etiqueta de texto"}
                          </div>
                        )}

                        {comp.type === "TextBox" && (
                          <div className="w-full min-w-0">
                            <input
                              type="text"
                              readOnly
                              placeholder={comp.hint || "Campo de texto..."}
                              value={comp.text || ""}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 font-sans shadow-2xs outline-none min-w-0"
                              style={{
                                fontSize: comp.fontSize || 14,
                              }}
                            />
                          </div>
                        )}

                        {comp.type === "CheckBox" && (
                          <div className="flex items-center gap-2 py-1 px-1.5 min-w-0 overflow-hidden">
                            <input
                              type="checkbox"
                              readOnly
                              checked={comp.checked}
                              className="w-4 h-4 flex-shrink-0 rounded text-[#5b871c] focus:ring-0 cursor-pointer"
                            />
                            <span
                              className="min-w-0 break-words"
                              style={{
                                color: comp.textColor || "#1f2937",
                                fontSize: comp.fontSize || 14,
                                fontWeight: comp.fontBold ? "bold" : "normal",
                              }}
                            >
                              {comp.text || "Casilla de verificación"}
                            </span>
                          </div>
                        )}

                        {comp.type === "Slider" && (
                          <div className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg min-w-0 overflow-hidden">
                            <div className="flex justify-between gap-2 text-[11px] font-bold text-slate-600 mb-1 min-w-0">
                              <span className="truncate min-w-0">{comp.text || "Deslizador"}</span>
                              <span className="font-mono text-[#5b871c] flex-shrink-0">{comp.value ?? 50}%</span>
                            </div>
                            <input
                              type="range"
                              readOnly
                              min="0"
                              max="100"
                              value={comp.value ?? 50}
                              className="w-full accent-[#5b871c] cursor-pointer"
                            />
                          </div>
                        )}

                        {comp.type === "Switch" && (
                          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <span
                              style={{
                                color: comp.textColor || "#1f2937",
                                fontSize: comp.fontSize || 14,
                                fontWeight: comp.fontBold ? "bold" : "normal",
                              }}
                            >
                              {comp.text || "Interruptor"}
                            </span>
                            <div
                              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                                comp.checked ? "bg-[#5b871c]" : "bg-slate-300"
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                  comp.checked ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </div>
                          </div>
                        )}

                        {comp.type === "Canvas" && (
                          <div
                            className="w-full rounded-xl overflow-hidden shadow-inner border border-slate-700 flex flex-col relative"
                            style={{
                              backgroundColor: comp.backgroundColor || "#0f172a",
                              height: comp.height || 200,
                            }}
                          >
                            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/60 text-white font-mono text-[10px] flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span>Lienzo DIV Games 60 FPS</span>
                            </div>

                            {/* Simulated interactive game graphics */}
                            <div className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden">
                              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                              <div className="flex flex-col items-center gap-1.5 z-10">
                                <span className="text-4xl">🚀</span>
                                <span className="text-xs font-bold text-cyan-300 tracking-wider">
                                  PLAYER (DIV PROCESS)
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {comp.type === "Image" && (
                          <div className="w-full h-32 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                            <span className="text-3xl mb-1">🖼️</span>
                            <span className="text-xs font-semibold">{comp.text || "Imagen"}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 4. Non-Visible Components Tray (Sensores, Sonido, Reloj) */}
              {nonVisibleComponents.length > 0 && (
                <div className="border-t border-slate-200 bg-slate-100 p-2 select-none">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Componentes No Visibles:
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {nonVisibleComponents.map((nvc) => {
                      const isSelected = selectedId === nvc.id;
                      return (
                        <button
                          key={nvc.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(nvc.id);
                          }}
                          className={`px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-semibold border transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span>{nvc.type === "Clock" ? "⏱️" : "🔊"}</span>
                          <span>{nvc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Home indicator */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-[#3f3f46] rounded-full" />
            </div>
          </div>
        </div>

        {/* PANEL 3: COMPONENTS HIERARCHY TREE */}
        <div
          className={`w-56 bg-white border-l border-[#E2E8F0] flex flex-col flex-shrink-0 z-10 ${
            activeMobileDrawer === "tree" ? "flex absolute inset-0 w-full sm:w-80 sm:left-auto z-30 shadow-xl" : "hidden xl:flex"
          }`}
        >
          <div className="px-3 py-2.5 bg-[#F7F8FA] border-b border-[#E2E8F0] font-bold text-[#111827] flex items-center justify-between">
            <span>Capas y Componentes</span>
            <button
              type="button"
              onClick={() => setActiveMobileDrawer("canvas")}
              className="xl:hidden px-2 py-1 rounded-md bg-white border border-[#E2E8F0] text-[11px] font-semibold text-[#4B5563]"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div
              onClick={() => setSelectedId("Screen1")}
              className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer ${
                isScreenSelected
                  ? "bg-[#7C2D48] text-white font-bold"
                  : "hover:bg-slate-100 text-[#111827] font-semibold"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span>📱</span>
                <span className="truncate">Screen1 ({screenProps.title})</span>
              </div>
            </div>

            <div className="pl-3 space-y-1 border-l-2 border-[#E2E8F0] ml-2.5">
              {components.map((comp) => {
                const isSelected = selectedId === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedId(comp.id)}
                    className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#7C2D48] text-white font-bold"
                        : "hover:bg-slate-100 text-[#4B5563] font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{comp.icon || (comp.type === "Button" ? "🔘" : comp.type === "Label" ? "🏷️" : comp.type === "Canvas" ? "🎨" : "🧩")}</span>
                      <span className="truncate">{comp.name}</span>
                    </div>
                    <span className="text-[10px] opacity-70 uppercase font-mono">
                      {comp.type.substring(0, 4)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-2 border-t border-[#E2E8F0] bg-white flex items-center gap-1.5">
            <button
              onClick={() => {
                setRenameTargetId(selectedId);
                setRenameValue(isScreenSelected ? screenProps.title : selectedComponent?.name || "");
              }}
              className="flex-1 min-h-[38px] py-1.5 px-2 rounded-lg bg-[#F7F8FA] hover:bg-slate-100 text-[#111827] font-semibold text-xs border border-[#E2E8F0]"
            >
              Renombrar
            </button>
            <button
              onClick={() => handleDeleteComponent(selectedId)}
              disabled={isScreenSelected}
              className="min-h-[38px] py-1.5 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 disabled:opacity-40"
              title="Borrar componente seleccionado"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PANEL 4: PROPERTIES */}
        <div
          className={`w-72 lg:w-64 xl:w-72 bg-white border-l border-[#E2E8F0] flex flex-col flex-shrink-0 z-10 ${
            activeMobileDrawer === "properties" ? "flex absolute inset-0 w-full sm:w-80 sm:left-auto z-30 shadow-xl" : "hidden lg:flex"
          }`}
        >
          <div className="px-3 py-2.5 bg-[#F7F8FA] border-b border-[#E2E8F0] font-bold text-[#111827] flex items-center justify-between gap-2">
            <span className="truncate">
              Propiedades · <span className="text-[#7C2D48]">{isScreenSelected ? "Screen1" : selectedComponent?.name}</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveMobileDrawer("canvas")}
              className="lg:hidden px-2 py-1 rounded-md bg-white border border-[#E2E8F0] text-[11px] font-semibold text-[#4B5563]"
            >
              Cerrar
            </button>
          </div>

          {/* Properties Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
            {/* ================================================================= */}
            {/* SCREEN1 PROPERTIES (CUANDO SCREEN1 ESTÁ SELECCIONADO)             */}
            {/* ================================================================= */}
            {isScreenSelected ? (
              <div className="space-y-3.5">
                {/* Nombre de la App */}
                <div>
                  <label className="block text-slate-600 font-bold text-[11px] mb-1">
                    AppName (Nombre de la App):
                  </label>
                  <input
                    type="text"
                    value={screenProps.appName}
                    onChange={(e) => onUpdateScreenProps({ ...screenProps, appName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-sans text-xs focus:ring-1 focus:ring-[#5b871c] outline-none"
                    placeholder="Mi App"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Nombre mostrado en el instalador y lanzador del celular.</p>
                </div>

                {/* Título de la pantalla */}
                <div>
                  <label className="block text-slate-600 font-bold text-[11px] mb-1">
                    Title (Título en Pantalla):
                  </label>
                  <input
                    type="text"
                    value={screenProps.title}
                    onChange={(e) => onUpdateScreenProps({ ...screenProps, title: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-sans text-xs focus:ring-1 focus:ring-[#5b871c] outline-none"
                    placeholder="Screen1"
                  />
                </div>

                {/* Color de Fondo de Pantalla */}
                <div>
                  <label className="block text-slate-600 font-bold text-[11px] mb-1">
                    BackgroundColor (Color de Fondo):
                  </label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="color"
                      value={screenProps.backgroundColor}
                      onChange={(e) => onUpdateScreenProps({ ...screenProps, backgroundColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={screenProps.backgroundColor}
                      onChange={(e) => onUpdateScreenProps({ ...screenProps, backgroundColor: e.target.value })}
                      className="flex-1 px-2 py-1 rounded border border-slate-300 font-mono text-xs uppercase"
                    />
                  </div>
                  {/* Swatches */}
                  <div className="flex flex-wrap gap-1">
                    {COLOR_SWATCHES.slice(0, 10).map((c) => (
                      <button
                        key={c}
                        onClick={() => onUpdateScreenProps({ ...screenProps, backgroundColor: c })}
                        className="w-5 h-5 rounded border border-slate-300 shadow-2xs hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Color Primario de la Barra de la App */}
                <div>
                  <label className="block text-slate-600 font-bold text-[11px] mb-1">
                    PrimaryColor (Barra Superior Móvil):
                  </label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="color"
                      value={screenProps.primaryColor}
                      onChange={(e) => onUpdateScreenProps({ ...screenProps, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={screenProps.primaryColor}
                      onChange={(e) => onUpdateScreenProps({ ...screenProps, primaryColor: e.target.value })}
                      className="flex-1 px-2 py-1 rounded border border-slate-300 font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Screen Orientation */}
                <div>
                  <label className="block text-slate-600 font-bold text-[11px] mb-1">
                    ScreenOrientation (Orientación):
                  </label>
                  <select
                    value={screenProps.orientation}
                    onChange={(e) => onUpdateScreenProps({ ...screenProps, orientation: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold outline-none"
                  >
                    <option value="portrait">Vertical (Portrait)</option>
                    <option value="landscape">Horizontal (Landscape)</option>
                    <option value="sensor">Automático (Sensor)</option>
                  </select>
                </div>

                {/* Toggles (ShowStatusBar, TitleVisible, Scrollable) */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={screenProps.showStatusBar}
                      onChange={(e) => onUpdateScreenProps({ ...screenProps, showStatusBar: e.target.checked })}
                      className="w-4 h-4 rounded text-[#5b871c]"
                    />
                    <span>ShowStatusBar (Barra de estado)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={screenProps.titleVisible}
                      onChange={(e) => onUpdateScreenProps({ ...screenProps, titleVisible: e.target.checked })}
                      className="w-4 h-4 rounded text-[#5b871c]"
                    />
                    <span>TitleVisible (Mostrar Título)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={screenProps.scrollable}
                      onChange={(e) => onUpdateScreenProps({ ...screenProps, scrollable: e.target.checked })}
                      className="w-4 h-4 rounded text-[#5b871c]"
                    />
                    <span>Scrollable (Pantalla Desplazable)</span>
                  </label>
                </div>

                {/* App Icon selector */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-slate-600 font-bold text-[11px] mb-1.5">
                    Icon (Ícono de la App Móvil):
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {["📱", "🚀", "🎮", "🕹️", "🧩", "🎨", "⏱️", "🔥", "💎", "⭐"].map((ic) => (
                      <button
                        key={ic}
                        onClick={() => onUpdateScreenProps({ ...screenProps, icon: ic })}
                        className={`p-1.5 rounded-lg text-lg border text-center transition-all ${
                          screenProps.icon === ic
                            ? "bg-[#5b871c]/20 border-[#5b871c] scale-110 shadow-xs"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedComponent ? (
              /* ================================================================= */
              /* COMPONENT PROPERTIES (CUANDO UN CONTROL ESTÁ SELECCIONADO)        */
              /* ================================================================= */
              <div className="space-y-3.5">
                {/* Nombre */}
                <div>
                  <label className="block text-slate-600 font-bold text-[11px] mb-1">
                    Componente:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedComponent.name}
                      className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 font-bold text-xs"
                    />
                    <button
                      onClick={() => {
                        setRenameTargetId(selectedComponent.id);
                        setRenameValue(selectedComponent.name);
                      }}
                      className="px-2 py-1.5 rounded bg-slate-200 hover:bg-slate-300 font-bold text-xs"
                    >
                      Editar
                    </button>
                  </div>
                </div>

                {/* Texto del componente */}
                {selectedComponent.type !== "Canvas" && selectedComponent.type !== "Clock" && (
                  <div>
                    <label className="block text-slate-600 font-bold text-[11px] mb-1">
                      Text (Texto):
                    </label>
                    <input
                      type="text"
                      value={selectedComponent.text || ""}
                      onChange={(e) => handleUpdateSelected({ text: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-sans text-xs focus:ring-1 focus:ring-[#5b871c] outline-none"
                      placeholder="Texto del control"
                    />
                  </div>
                )}

                {/* Color de Fondo */}
                <div>
                  <label className="block text-slate-600 font-bold text-[11px] mb-1">
                    BackgroundColor (Color de Fondo):
                  </label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="color"
                      value={selectedComponent.backgroundColor || "#5b871c"}
                      onChange={(e) => handleUpdateSelected({ backgroundColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={selectedComponent.backgroundColor}
                      onChange={(e) => handleUpdateSelected({ backgroundColor: e.target.value })}
                      className="flex-1 px-2 py-1 rounded border border-slate-300 font-mono text-xs uppercase"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {COLOR_SWATCHES.slice(0, 10).map((c) => (
                      <button
                        key={c}
                        onClick={() => handleUpdateSelected({ backgroundColor: c })}
                        className="w-5 h-5 rounded border border-slate-300 shadow-2xs hover:scale-110"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Color del Texto */}
                {selectedComponent.type !== "Canvas" && (
                  <div>
                    <label className="block text-slate-600 font-bold text-[11px] mb-1">
                      TextColor (Color del Texto):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedComponent.textColor || "#ffffff"}
                        onChange={(e) => handleUpdateSelected({ textColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={selectedComponent.textColor}
                        onChange={(e) => handleUpdateSelected({ textColor: e.target.value })}
                        className="flex-1 px-2 py-1 rounded border border-slate-300 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                )}

                {/* Tamaño de fuente y Negrita */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-bold text-[11px] mb-1">
                      FontSize:
                    </label>
                    <input
                      type="number"
                      value={selectedComponent.fontSize || 14}
                      onChange={(e) => handleUpdateSelected({ fontSize: parseInt(e.target.value) || 14 })}
                      className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedComponent.fontBold}
                        onChange={(e) => handleUpdateSelected({ fontBold: e.target.checked })}
                        className="w-4 h-4 rounded text-[#5b871c]"
                      />
                      <span>FontBold</span>
                    </label>
                  </div>
                </div>

                {/* Ancho (Width) */}
                <div>
                  <label className="block text-slate-600 font-bold text-[11px] mb-1">
                    Width (Ancho):
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleUpdateSelected({ width: "auto" })}
                      className={`py-1 px-2 rounded border text-xs font-bold ${
                        selectedComponent.width === "auto"
                          ? "bg-[#5b871c] text-white border-[#5b871c]"
                          : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                      }`}
                    >
                      Automático
                    </button>
                    <button
                      onClick={() => handleUpdateSelected({ width: "fill" })}
                      className={`py-1 px-2 rounded border text-xs font-bold ${
                        selectedComponent.width === "fill"
                          ? "bg-[#5b871c] text-white border-[#5b871c]"
                          : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                      }`}
                    >
                      Ajustar (Fill Parent)
                    </button>
                  </div>
                </div>

                {/* Enabled & Visible */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedComponent.enabled}
                      onChange={(e) => handleUpdateSelected({ enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-[#5b871c]"
                    />
                    <span>Enabled (Habilitado)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedComponent.visible}
                      onChange={(e) => handleUpdateSelected({ visible: e.target.checked })}
                      className="w-4 h-4 rounded text-[#5b871c]"
                    />
                    <span>Visible (Visible en pantalla)</span>
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: LIVE MOBILE SIMULATOR / WEBAPP RUNNER                           */}
      {/* ========================================================================= */}
      {isLiveSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181b] rounded-3xl p-4 shadow-2xl border border-slate-700 flex flex-col items-center max-w-sm w-full relative animate-in zoom-in-95">
            <button
              onClick={() => setIsLiveSimulatorOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-3 text-white">
              <span className="font-bold text-sm tracking-wide">
                📱 Simulador Móvil WebApp
              </span>
              <p className="text-[11px] text-slate-400">
                Prueba interactiva táctil con resolución nativa móvil
              </p>
            </div>

            {/* Simulated Live Screen */}
            <div
              className="w-full h-[520px] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative"
              style={{
                backgroundColor: screenProps.backgroundColor,
                color: screenProps.textColor,
              }}
            >
              {/* App Bar */}
              {screenProps.titleVisible && (
                <div
                  className="px-3.5 py-2.5 flex items-center justify-between font-bold text-white shadow-xs"
                  style={{ backgroundColor: screenProps.primaryColor }}
                >
                  <div className="flex items-center gap-2">
                    <span>{screenProps.icon || "📱"}</span>
                    <span>{screenProps.title}</span>
                  </div>
                  <span className="text-xs">⋮</span>
                </div>
              )}

              {/* Components Body */}
              <div className="flex-1 p-3 flex flex-col gap-2.5 overflow-y-auto relative">
                {simulatorBanner && (
                  <div className="px-3 py-2 rounded-xl bg-[#111827] text-white text-xs font-semibold shadow-md text-center">
                    {simulatorBanner}
                  </div>
                )}
                {visibleComponents.map((comp) => (
                  <div key={comp.id}>
                    {comp.type === "Button" && (
                      <button
                        onClick={() => {
                          setSimulatorBanner(`Botón "${comp.text || comp.name}" pulsado`);
                          setTimeout(() => setSimulatorBanner(null), 1800);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl font-bold shadow-xs active:scale-95 transition-transform"
                        style={{
                          backgroundColor: comp.backgroundColor || screenProps.primaryColor,
                          color: comp.textColor || "#ffffff",
                          fontSize: comp.fontSize || 14,
                        }}
                      >
                        {comp.text}
                      </button>
                    )}

                    {comp.type === "Label" && (
                      <div
                        className="py-1 px-1.5"
                        style={{
                          color: comp.textColor,
                          fontSize: comp.fontSize,
                          fontWeight: comp.fontBold ? "bold" : "normal",
                        }}
                      >
                        {comp.text}
                      </div>
                    )}

                    {comp.type === "TextBox" && (
                      <input
                        type="text"
                        placeholder={comp.hint || "Escribe aquí..."}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                      />
                    )}

                    {comp.type === "Switch" && (
                      <div className="flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span>{comp.text}</span>
                        <input type="checkbox" defaultChecked={comp.checked} className="w-5 h-5 accent-[#5b871c]" />
                      </div>
                    )}

                    {comp.type === "Canvas" && (
                      <div
                        className="w-full rounded-xl bg-slate-900 border border-cyan-500/40 p-4 flex flex-col items-center justify-center text-cyan-300 font-mono text-xs shadow-inner"
                        style={{ height: 160 }}
                      >
                        <span className="text-3xl mb-1">🎮</span>
                        <span>Motor DIV Games Activo</span>
                        <span className="text-[10px] text-slate-400">Toca para interactuar</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span>Touch & Gestos activados</span>
              <button
                onClick={() => {
                  setIsLiveSimulatorOpen(false);
                  onSwitchToBlocks?.();
                }}
                className="text-[#80b62b] font-bold hover:underline"
              >
                Ver Lógica en Bloques →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: RENOMBRAR COMPONENTE                                            */}
      {/* ========================================================================= */}
      {renameTargetId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 shadow-2xl max-w-sm w-full border border-slate-300 animate-in zoom-in-95">
            <h3 className="font-bold text-sm text-slate-800 mb-1">Renombrar Componente</h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Ingresa el nuevo identificador para {renameTargetId}. Solo letras, números y guiones bajos.
            </p>
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyRename()}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs mb-3 outline-none focus:ring-2 focus:ring-[#5b871c]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRenameTargetId(null)}
                className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyRename}
                className="px-3 py-1.5 rounded bg-[#5b871c] hover:bg-[#4d7317] text-white font-bold text-xs"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
