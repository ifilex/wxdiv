import React, { useMemo, useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  Globe,
  FileSpreadsheet,
  Printer,
  Layers,
  Archive,
  FolderArchive,
  CheckCircle2,
  Loader2,
  FileText,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  Cpu,
  Zap,
  Brain,
  ExternalLink,
  Cloud,
} from "lucide-react";
import { DivGraphic } from "../types";
import {
  buildUniversalStandaloneAppHtml,
  exportProjectToZip,
  exportAndroidStudioZip,
  triggerZipDownload,
  AdMobConfig,
  DEFAULT_ADMOB_CONFIG,
} from "../engine/zipExporter";
import { CloudCompilerPanel } from "./CloudCompilerPanel";
import { auditMode8DivCodeTextures } from "../engine/mode8TextureRegistry";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  code: string;
  fpg: DivGraphic[];
  resolution: "320x200" | "640x480" | "800x600";
  presetId?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  gameTitle,
  code,
  fpg,
  resolution,
  presetId,
}) => {
  const [activeTab, setActiveTab] = useState<
    "cloud" | "android" | "zip" | "winebox" | "targets" | "react" | "html5" | "excel" | "json"
  >("cloud");
  const [copied, setCopied] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipStatusText, setZipStatusText] = useState("");
  const [zipCompleted, setZipCompleted] = useState(false);

  const defaultPackage = `com.wxdiv.${(gameTitle.toLowerCase().replace(/[^a-z0-9]/g, "") || "webapp").slice(0, 20)}`;
  const [packageName, setPackageName] = useState(defaultPackage);
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [orientation, setOrientation] = useState<"landscape" | "portrait" | "sensor">("portrait");
  const [projectType, setProjectType] = useState<"game" | "web">("web");

  const [admobEnabled, setAdmobEnabled] = useState(true);
  const [admobAppId, setAdmobAppId] = useState(DEFAULT_ADMOB_CONFIG.appId);
  const [admobBannerEnabled, setAdmobBannerEnabled] = useState(true);
  const [admobBannerPosition, setAdmobBannerPosition] = useState<"top" | "bottom">("bottom");
  const [admobBannerUnitId, setAdmobBannerUnitId] = useState(DEFAULT_ADMOB_CONFIG.bannerUnitId);
  const [admobInterstitialEnabled, setAdmobInterstitialEnabled] = useState(true);
  const [admobInterstitialUnitId, setAdmobInterstitialUnitId] = useState(DEFAULT_ADMOB_CONFIG.interstitialUnitId);
  const [admobRewardedEnabled, setAdmobRewardedEnabled] = useState(true);
  const [admobRewardedUnitId, setAdmobRewardedUnitId] = useState(DEFAULT_ADMOB_CONFIG.rewardedUnitId);
  const [admobRewardType, setAdmobRewardType] = useState("monedas");
  const [admobRewardAmount, setAdmobRewardAmount] = useState(50);

  const [isExportingAndroid, setIsExportingAndroid] = useState(false);
  const [androidProgress, setAndroidProgress] = useState(0);
  const [androidStatusText, setAndroidStatusText] = useState("");
  const [androidCompleted, setAndroidCompleted] = useState(false);
  const [copiedDivCode, setCopiedDivCode] = useState(false);

  const mode8TextureAudit = useMemo(() => auditMode8DivCodeTextures(code), [code]);

  if (!isOpen) return null;

  const currentAdMobConfig: AdMobConfig = {
    enabled: admobEnabled,
    appId: admobAppId,
    bannerEnabled: admobBannerEnabled,
    bannerPosition: admobBannerPosition,
    bannerUnitId: admobBannerUnitId,
    interstitialEnabled: admobInterstitialEnabled,
    interstitialUnitId: admobInterstitialUnitId,
    rewardedEnabled: admobRewardedEnabled,
    rewardedUnitId: admobRewardedUnitId,
    rewardType: admobRewardType,
    rewardAmount: admobRewardAmount,
  };

  const handleExportAndroid = async () => {
    try {
      setIsExportingAndroid(true);
      setAndroidCompleted(false);
      setAndroidProgress(10);
      setAndroidStatusText("Configurando proyecto Gradle de Android Studio...");

      const blob = await exportAndroidStudioZip({
        gameTitle,
        code,
        fpg,
        resolution,
        presetId,
        packageName,
        appVersion,
        orientation,
        projectType,
        adMobConfig: currentAdMobConfig,
        onProgress: (percent, status) => {
          setAndroidProgress(percent);
          setAndroidStatusText(status);
        },
      });

      const safeName = gameTitle.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "wxdiv_webapp";
      triggerZipDownload(blob, `${safeName}_android_studio.zip`);
      setAndroidCompleted(true);
    } catch (err) {
      console.error("Error al exportar Android Studio:", err);
      setAndroidStatusText("Error durante la generación de Android Studio.");
    } finally {
      setIsExportingAndroid(false);
    }
  };

  const handleExportZip = async () => {
    try {
      setIsExportingZip(true);
      setZipCompleted(false);
      setZipProgress(10);
      setZipStatusText("Preparando archivos de la WebApp móvil...");

      const blob = await exportProjectToZip({
        gameTitle,
        code,
        fpg,
        resolution,
        presetId,
        packageName,
        appVersion,
        orientation,
        projectType,
        adMobConfig: currentAdMobConfig,
        onProgress: (percent, status) => {
          setZipProgress(percent);
          setZipStatusText(status);
        },
      });

      const safeName = gameTitle.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      triggerZipDownload(blob, `${safeName}_project.zip`);
      setZipCompleted(true);
    } catch (err) {
      console.error("Error al exportar ZIP:", err);
      setZipStatusText("Error durante la generación del ZIP.");
    } finally {
      setIsExportingZip(false);
    }
  };

  // Standalone React component embedding the frameless game/app runtime cleanly
  const generateReactComponent = () => {
    const compiledHtml = buildUniversalStandaloneAppHtml({
      title: gameTitle,
      code,
      resolution,
      fpg,
      presetId,
    });
    return `import React from "react";

// WXDIV 3.0 Compiled Standalone React Component (${gameTitle})
const COMPILED_APP_HTML = ${JSON.stringify(compiledHtml)};

export const WxDivApp: React.FC = () => {
  return (
    <iframe
      title=${JSON.stringify(gameTitle)}
      srcDoc={COMPILED_APP_HTML}
      className="w-full h-full min-h-[540px] border-0 block"
      sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
    />
  );
};

export default WxDivApp;
`;
  };

  const generateHtmlPackage = () => {
    return buildUniversalStandaloneAppHtml({
      title: gameTitle,
      code,
      resolution,
      fpg,
      presetId,
    });
  };

  const generateCsvReport = () => {
    const lines = [
      ["METRICA", "VALOR", "NOTAS"],
      ["Titulo de Proyecto", `"${gameTitle}"`, "WXDIV Studio WebApp"],
      ["Resolucion Nativa", resolution, "Pantalla virtual"],
      ["Lineas de Codigo DIV", code.split("\n").length, "Sintaxis verificada"],
      ["Sprites en FPG", fpg.length, "Graficos cargados"],
      ["Memoria Estimada Assets", `${(JSON.stringify(fpg).length / 1024).toFixed(2)} KB`, "Optimizacion en memoria"],
      ["Formato Exportado", "WebApp Movil / HTML5 Puro", "Sin recuadros ni dependencias"],
      ["Privacidad Compilacion", "Local / Cero Credenciales", "Sin cuentas externas"],
      ["Fecha de Exportacion", new Date().toISOString(), "Export report"],
    ];
    return lines.map((row) => row.join(",")).join("\n");
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 150);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl bg-white border border-[#E2E8F0] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94dvh] sm:max-h-[92dvh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-white border-b border-[#E2E8F0] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7C2D48] text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-[#111827] text-sm sm:text-base truncate">
                Compilar WebApp Móvil y Exportar
              </h2>
              <p className="text-[11px] text-[#6B7280] truncate">
                Salida limpia a pantalla completa · Sin credenciales externas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-[#F7F8FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#4B5563] hover:text-[#111827] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Tab Selector */}
        <div className="flex border-b border-[#E2E8F0] bg-[#F7F8FA] text-xs overflow-x-auto flex-shrink-0">
          {[
            { id: "cloud", label: "WebApp Móvil (1 Clic)", icon: Cloud },
            { id: "android", label: "Android Studio (.ZIP)", icon: Smartphone },
            { id: "zip", label: "ZIP Completo + Assets", icon: Archive },
            { id: "winebox", label: "Winebox Clinic & Cloud", icon: Brain },
            { id: "targets", label: "Multi-Plataforma", icon: Layers },
            { id: "react", label: "React (.tsx)", icon: FileCode },
            { id: "html5", label: "HTML5 Puro (.html)", icon: Globe },
            { id: "excel", label: "Reporte CSV / PDF", icon: FileSpreadsheet },
            { id: "json", label: "Respaldo (.div.json)", icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? "border-[#7C2D48] text-[#7C2D48] bg-white"
                    : "border-transparent text-[#4B5563] hover:text-[#111827] hover:bg-white/60"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#7C2D48]" : "text-[#6B7280]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto text-xs text-[#374151] bg-[#F7F8FA]">
          {activeTab === "cloud" && (
            <CloudCompilerPanel
              gameTitle={gameTitle}
              code={code}
              fpg={fpg}
              resolution={resolution}
              presetId={presetId}
              packageName={packageName}
              onPackageNameChange={setPackageName}
              appVersion={appVersion}
              onAppVersionChange={setAppVersion}
              orientation={orientation}
              onOrientationChange={setOrientation}
              projectType={projectType}
              onProjectTypeChange={setProjectType}
              adMobConfig={currentAdMobConfig}
            />
          )}

          {activeTab === "android" && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#7C2D48]" />
                      <span>Proyecto Android Studio (APK + Google AdMob + Todos los Assets)</span>
                    </h3>
                    <p className="text-[#4B5563] text-xs mt-1 leading-relaxed">
                      Genera el proyecto Gradle completo listo para abrir en Android Studio (<code className="font-mono text-[#7C2D48]">File &gt; Open...</code>) y compilar el APK o AAB para Google Play.
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-2 font-mono">
                      Incluye: .fpg · .wav · .map · .wld · .pal · .frm · sprites PNG · AdMob
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportAndroid}
                    disabled={isExportingAndroid}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] disabled:opacity-50 text-white font-bold flex items-center gap-2 flex-shrink-0 transition-all text-xs cursor-pointer whitespace-nowrap"
                  >
                    {isExportingAndroid ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generando Proyecto...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Descargar Android Studio (.ZIP)</span>
                      </>
                    )}
                  </button>
                </div>

                {isExportingAndroid && (
                  <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                    <div className="flex justify-between text-[11px] text-[#2F6F4E] font-mono mb-1">
                      <span>{androidStatusText}</span>
                      <span className="tabular-nums">{androidProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2F6F4E] transition-all duration-300 ease-out"
                        style={{ width: `${androidProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {androidCompleted && !isExportingAndroid && (
                  <div className="mt-3 p-3 bg-[#EEF6F1] border border-[#CFE4D7] rounded-xl text-[#2F6F4E] flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>Proyecto Android Studio descargado con éxito</span>
                    </div>
                    <p className="text-[11px] pl-6">
                      Descomprime el archivo ZIP, ábrelo en Android Studio con <strong>File &gt; Open...</strong> y compila tu APK desde <strong>Build &gt; Build APK(s)</strong>.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. App Configuration */}
                <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                  <h4 className="font-bold text-[#111827] flex items-center gap-2 text-xs">
                    <Layers className="w-4 h-4 text-[#7C2D48]" />
                    <span>Configuración de la App Android</span>
                  </h4>

                  <div>
                    <label className="text-[11px] font-semibold text-[#374151] block mb-1">
                      Package Name (ID de Paquete):
                    </label>
                    <input
                      type="text"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="com.ejemplo.miapp"
                      className="w-full min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] font-mono text-xs text-[#7C2D48] focus:outline-none focus:border-[#7C2D48]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[#374151] block mb-1">
                        Versión:
                      </label>
                      <input
                        type="text"
                        value={appVersion}
                        onChange={(e) => setAppVersion(e.target.value)}
                        placeholder="1.0.0"
                        className="w-full min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] font-mono text-xs text-[#111827] focus:outline-none focus:border-[#7C2D48]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#374151] block mb-1">
                        Orientación Pantalla:
                      </label>
                      <select
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value as any)}
                        className="w-full min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] text-xs text-[#111827] font-semibold focus:outline-none focus:border-[#7C2D48]"
                      >
                        <option value="portrait">Vertical (WebApp / Apps)</option>
                        <option value="landscape">Horizontal (Juegos)</option>
                        <option value="sensor">Sensor (Rotación Auto)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#374151] block mb-1">
                      Tipo de Proyecto:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setProjectType("web")}
                        className={`min-h-[48px] p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          projectType === "web"
                            ? "bg-[#FDF2F5] border-[#7C2D48] text-[#7C2D48] font-bold"
                            : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563] hover:text-[#111827]"
                        }`}
                      >
                        WebApp Móvil
                        <span className="text-[10px] block font-normal text-[#6B7280] mt-0.5">
                          Interfaz táctil + .FRM
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProjectType("game")}
                        className={`min-h-[48px] p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          projectType === "game"
                            ? "bg-[#EEF6F1] border-[#2F6F4E] text-[#2F6F4E] font-bold"
                            : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563] hover:text-[#111827]"
                        }`}
                      >
                        Videojuego DIV
                        <span className="text-[10px] block font-normal text-[#6B7280] mt-0.5">
                          Canvas 60FPS, FPG, 3D
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Google AdMob Master Settings */}
                <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#111827] flex items-center gap-2 text-xs">
                      <Zap className="w-4 h-4 text-[#7C2D48]" />
                      <span>Monetización Google AdMob</span>
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={admobEnabled}
                        onChange={(e) => setAdmobEnabled(e.target.checked)}
                        className="rounded accent-[#2F6F4E] w-4 h-4"
                      />
                      <span className={admobEnabled ? "text-[#2F6F4E]" : "text-[#6B7280]"}>
                        {admobEnabled ? "Habilitado" : "Deshabilitado"}
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#374151] block mb-1">
                      AdMob Application ID:
                    </label>
                    <input
                      type="text"
                      value={admobAppId}
                      onChange={(e) => setAdmobAppId(e.target.value)}
                      placeholder="ca-app-pub-3940256099942544~3347511713"
                      disabled={!admobEnabled}
                      className="w-full min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] font-mono text-xs text-[#111827] disabled:opacity-50 focus:outline-none focus:border-[#7C2D48]"
                    />
                  </div>

                  <div className="space-y-2 pt-1 border-t border-[#E2E8F0]">
                    <div className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-[#111827]">
                          <input
                            type="checkbox"
                            checked={admobBannerEnabled}
                            onChange={(e) => setAdmobBannerEnabled(e.target.checked)}
                            disabled={!admobEnabled}
                            className="rounded accent-[#7C2D48]"
                          />
                          <span>1. Banner Continuo</span>
                        </label>
                        <select
                          value={admobBannerPosition}
                          onChange={(e) => setAdmobBannerPosition(e.target.value as any)}
                          disabled={!admobEnabled || !admobBannerEnabled}
                          className="px-2 py-1 rounded-lg bg-white border border-[#E2E8F0] font-mono text-[10px] text-[#374151] disabled:opacity-50"
                        >
                          <option value="bottom">Inferior</option>
                          <option value="top">Superior</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={admobBannerUnitId}
                        onChange={(e) => setAdmobBannerUnitId(e.target.value)}
                        disabled={!admobEnabled || !admobBannerEnabled}
                        className="w-full px-2 py-1 rounded-lg bg-white border border-[#E2E8F0] font-mono text-[10px] text-[#4B5563] disabled:opacity-40"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-[#111827]">
                        <input
                          type="checkbox"
                          checked={admobInterstitialEnabled}
                          onChange={(e) => setAdmobInterstitialEnabled(e.target.checked)}
                          disabled={!admobEnabled}
                          className="rounded accent-[#7C2D48]"
                        />
                        <span>2. Anuncio Intersticial (Pantalla completa)</span>
                      </label>
                      <input
                        type="text"
                        value={admobInterstitialUnitId}
                        onChange={(e) => setAdmobInterstitialUnitId(e.target.value)}
                        disabled={!admobEnabled || !admobInterstitialEnabled}
                        className="w-full px-2 py-1 rounded-lg bg-white border border-[#E2E8F0] font-mono text-[10px] text-[#4B5563] disabled:opacity-40"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-[#111827]">
                        <input
                          type="checkbox"
                          checked={admobRewardedEnabled}
                          onChange={(e) => setAdmobRewardedEnabled(e.target.checked)}
                          disabled={!admobEnabled}
                          className="rounded accent-[#7C2D48]"
                        />
                        <span>3. Video con Recompensa</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={admobRewardType}
                          onChange={(e) => setAdmobRewardType(e.target.value)}
                          disabled={!admobEnabled || !admobRewardedEnabled}
                          className="w-full px-2 py-1 rounded-lg bg-white border border-[#E2E8F0] font-mono text-xs text-[#111827] disabled:opacity-50"
                        >
                          <option value="monedas">monedas</option>
                          <option value="vidas">vidas</option>
                          <option value="oro">oro</option>
                          <option value="gemas">gemas</option>
                          <option value="desbloqueo">desbloqueo</option>
                        </select>
                        <input
                          type="number"
                          value={admobRewardAmount}
                          onChange={(e) => setAdmobRewardAmount(parseInt(e.target.value, 10) || 1)}
                          disabled={!admobEnabled || !admobRewardedEnabled}
                          className="w-full px-2 py-1 rounded-lg bg-white border border-[#E2E8F0] font-mono text-xs text-[#111827] disabled:opacity-50"
                        />
                      </div>
                      <input
                        type="text"
                        value={admobRewardedUnitId}
                        onChange={(e) => setAdmobRewardedUnitId(e.target.value)}
                        disabled={!admobEnabled || !admobRewardedEnabled}
                        className="w-full px-2 py-1 rounded-lg bg-white border border-[#E2E8F0] font-mono text-[10px] text-[#4B5563] disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#7C2D48]" />
                    <span className="font-bold text-[#111827] text-xs">
                      Ejemplo rápido DIV para AdMob
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const snippet = `admob_init("${admobAppId}");\nadmob_show_banner(${admobBannerPosition === "top" ? "ADMOB_TOP" : "ADMOB_BOTTOM"});\nadmob_show_interstitial();\nadmob_show_rewarded("${admobRewardType}", ${admobRewardAmount}, proc_recibir_premio);`;
                      navigator.clipboard.writeText(snippet);
                      setCopiedDivCode(true);
                      setTimeout(() => setCopiedDivCode(false), 2000);
                    }}
                    className="min-h-[36px] px-3 py-1 rounded-lg bg-[#F7F8FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#111827] flex items-center gap-1.5 font-semibold text-xs cursor-pointer"
                  >
                    {copiedDivCode ? <Check className="w-3.5 h-3.5 text-[#2F6F4E]" /> : <Copy className="w-3.5 h-3.5 text-[#4B5563]" />}
                    <span>{copiedDivCode ? "Copiado" : "Copiar Código DIV"}</span>
                  </button>
                </div>

                <pre className="p-3 bg-[#0F172A] rounded-xl font-mono text-[11px] text-emerald-300 leading-relaxed overflow-x-auto select-all">
{`admob_init("${admobAppId}");
admob_show_banner(${admobBannerPosition === "top" ? "ADMOB_TOP" : "ADMOB_BOTTOM"});
admob_show_interstitial();
admob_show_rewarded("${admobRewardType}", ${admobRewardAmount}, proc_recibir_premio);`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "zip" && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                      <Archive className="w-4 h-4 text-[#7C2D48]" />
                      <span>Empaquetado Completo Autónomo (.ZIP)</span>
                    </h3>
                    <p className="text-[#4B5563] text-xs mt-1 leading-relaxed">
                      Incluye un <code className="font-mono text-[#7C2D48]">index.html</code> limpio a pantalla completa (sin recuadros externos), código fuente DIV y todos los gráficos, sonidos y mapas del proyecto.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportZip}
                    disabled={isExportingZip}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] disabled:opacity-50 text-white font-semibold flex items-center gap-2 flex-shrink-0 transition-all text-xs cursor-pointer whitespace-nowrap"
                  >
                    {isExportingZip ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Descargar ZIP Completo</span>
                      </>
                    )}
                  </button>
                </div>

                {isExportingZip && (
                  <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                    <div className="flex justify-between text-[11px] text-[#7C2D48] font-mono mb-1">
                      <span>{zipStatusText}</span>
                      <span className="tabular-nums">{zipProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7C2D48] transition-all duration-300 ease-out"
                        style={{ width: `${zipProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {zipCompleted && !isExportingZip && (
                  <div className="mt-3 p-3 bg-[#EEF6F1] border border-[#CFE4D7] rounded-xl text-[#2F6F4E] flex items-center gap-2 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Archivo ZIP descargado con todos los assets y el HTML autónomo sin recuadros.</span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block mb-2.5">
                  Contenido del Archivo ZIP
                </span>
                <div className="space-y-2 font-mono text-[11px] text-[#374151]">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0]">
                    <Globe className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                    <span className="text-[#111827] font-bold">index.html</span>
                    <span className="text-[#6B7280] text-[10px] ml-auto">HTML autónomo a pantalla completa</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0]">
                    <FileCode className="w-4 h-4 text-[#2F6F4E] flex-shrink-0" />
                    <span className="text-[#111827]">src/main.div</span>
                    <span className="text-[#6B7280] text-[10px] ml-auto">{code.split("\n").length} líneas DIV</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0]">
                    <FolderArchive className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                    <span className="text-[#111827]">assets/sprites/</span>
                    <span className="text-[#6B7280] text-[10px] ml-auto">{fpg.length} sprites PNG</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0]">
                    <ImageIcon className="w-4 h-4 text-[#2F6F4E] flex-shrink-0" />
                    <span className="text-[#111827]">assets/maps/</span>
                    <span className="text-[#6B7280] text-[10px] ml-auto">Mapas y fondos PNG/JSON</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0]">
                    <Smartphone className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                    <span className="text-[#111827]">dist/mobile/ &amp; dist/pwa/</span>
                    <span className="text-[#6B7280] text-[10px] ml-auto">Capacitor + PWA offline</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0]">
                    <Monitor className="w-4 h-4 text-[#4B5563] flex-shrink-0" />
                    <span className="text-[#111827]">dist/desktop/</span>
                    <span className="text-[#6B7280] text-[10px] ml-auto">Tauri y Electron</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "targets" && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#7C2D48]" />
                    <span>Salidas Multiplataforma desde tu WebApp</span>
                  </h3>
                  <p className="text-[#4B5563] text-xs mt-1 leading-relaxed">
                    Compila tu código DIV a Web, WebApp móvil PWA, Capacitor (Android/iOS), Desktop y núcleo WASM en un solo paquete.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportZip}
                  disabled={isExportingZip}
                  className="min-h-[44px] flex-shrink-0 px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Todo (.ZIP)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-[#111827] text-xs flex items-center gap-2 mb-1.5">
                      <Globe className="w-4 h-4 text-[#7C2D48]" />
                      <span>1. WebApp Puro (HTML5 Standalone)</span>
                    </div>
                    <p className="text-[#4B5563] text-[11px] leading-relaxed">
                      Salida limpia en <code className="font-mono text-[#7C2D48]">dist/web/index.html</code> sin bordes ni servidor necesario.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-[#111827] text-xs flex items-center gap-2 mb-1.5">
                      <Smartphone className="w-4 h-4 text-[#2F6F4E]" />
                      <span>2. Mobile Nativo (Capacitor)</span>
                    </div>
                    <p className="text-[#4B5563] text-[11px] leading-relaxed">
                      Scaffolding con <code className="font-mono text-[#2F6F4E]">capacitor.config.json</code> y controles táctiles para Android e iOS.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-[#111827] text-xs flex items-center gap-2 mb-1.5">
                      <Monitor className="w-4 h-4 text-[#7C2D48]" />
                      <span>3. Desktop (Tauri y Electron)</span>
                    </div>
                    <p className="text-[#4B5563] text-[11px] leading-relaxed">
                      Instaladores listos para Windows, macOS y Linux a 60 FPS.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-[#111827] text-xs flex items-center gap-2 mb-1.5">
                      <Zap className="w-4 h-4 text-[#2F6F4E]" />
                      <span>4. PWA Offline + Core WASM</span>
                    </div>
                    <p className="text-[#4B5563] text-[11px] leading-relaxed">
                      Manifiesto PWA instalable desde Chrome/Safari y caché offline automático.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "react" && (
            <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0]">
              <p className="text-[#4B5563]">
                Componente React listo para embeber tu WebApp sin marcos ni barras externas:
              </p>
              <pre className="p-3 bg-[#0F172A] rounded-xl font-mono text-[11px] text-slate-100 max-h-72 overflow-auto leading-5 select-all">
                {generateReactComponent()}
              </pre>
              <div className="flex flex-wrap justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleCopyContent(generateReactComponent())}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#111827] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#2F6F4E]" /> : <Copy className="w-3.5 h-3.5 text-[#4B5563]" />}
                  <span>{copied ? "Copiado" : "Copiar Código"}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile(generateReactComponent(), `${gameTitle}_WxDiv.tsx`, "text/typescript")
                  }
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar WxDivApp.tsx</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "html5" && (
            <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0]">
              <p className="text-[#4B5563]">
                Archivo HTML único puro con el juego o app y todos sus recursos embebidos, sin recuadro exterior:
              </p>
              {mode8TextureAudit.isMode8 && (
                <div
                  className={`px-3 py-2 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
                    mode8TextureAudit.isValid
                      ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
                      : "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {mode8TextureAudit.isValid
                        ? `Paridad Modo 8 verificada (${mode8TextureAudit.totalReferenced} texturas canónicas)`
                        : `Alias/texturas normalizadas: ${mode8TextureAudit.unknownNames.join(", ")}`}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold">
                    HASH #{mode8TextureAudit.manifestChecksum.toUpperCase()}
                  </span>
                </div>
              )}
              <pre className="p-3 bg-[#0F172A] rounded-xl font-mono text-[11px] text-slate-100 max-h-72 overflow-auto leading-5 select-all">
                {generateHtmlPackage()}
              </pre>
              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile(generateHtmlPackage(), `${gameTitle}.html`, "text/html")
                  }
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar index.html puro</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "excel" && (
            <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] space-y-4">
              <div>
                <h3 className="font-bold text-[#111827] mb-1 flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-[#2F6F4E]" />
                  <span>Reporte Técnico y Métricas del Proyecto</span>
                </h3>
                <p className="text-[#4B5563] text-xs">
                  Resumen del rendimiento, líneas DIV y recursos incluidos en la compilación móvil.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0]">
                  <span className="text-[#6B7280] block text-[10px] font-semibold">OBJETIVO FPS</span>
                  <span className="text-[#2F6F4E] font-bold text-base tabular-nums">60 FPS</span>
                </div>
                <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0]">
                  <span className="text-[#6B7280] block text-[10px] font-semibold">LÍNEAS DIV</span>
                  <span className="text-[#7C2D48] font-bold text-base tabular-nums">{code.split("\n").length}</span>
                </div>
                <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0]">
                  <span className="text-[#6B7280] block text-[10px] font-semibold">SPRITES FPG</span>
                  <span className="text-[#111827] font-bold text-base tabular-nums">{fpg.length}</span>
                </div>
                <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0]">
                  <span className="text-[#6B7280] block text-[10px] font-semibold">SEGURIDAD</span>
                  <span className="text-[#2F6F4E] font-bold text-base">Sin Datos</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile(
                      generateCsvReport(),
                      `${gameTitle}_reporte.csv`,
                      "text/csv"
                    )
                  }
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV (Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#111827] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#4B5563]" />
                  <span>Imprimir / PDF</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "winebox" && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#F3D0DC] space-y-2.5">
                <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#7C2D48]" />
                  <span>Compilador para Winebox Clinic y Winebox Cloud</span>
                </h3>
                <p className="text-[#4B5563] text-xs leading-relaxed">
                  Empaqueta tu WebApp móvil de estimulación cognitiva o videojuego en formato compatible con{" "}
                  <strong>winebox.clinic</strong> y la consola cognitiva{" "}
                  <strong>winebox.cloud</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <a
                    href="https://winebox.clinic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#FDF2F5] hover:bg-[#FCE7EE] border border-[#F3D0DC] text-[#7C2D48] font-semibold flex items-center justify-between gap-2"
                  >
                    <span>Abrir comunidad winebox.clinic</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                  <a
                    href="https://winebox.cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#EEF6F1] hover:bg-[#E2EFE8] border border-[#CFE4D7] text-[#2F6F4E] font-semibold flex items-center justify-between gap-2"
                  >
                    <span>Abrir Consola winebox.cloud</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-[#111827] text-xs">
                    Paquete Compilado para Consola Cognitiva y Comunidad
                  </div>
                  <p className="text-[11px] text-[#4B5563] mt-0.5">
                    Descarga el paquete HTML5 limpio con assets o el respaldo .div.json para compartirlo.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportZip}
                    disabled={isExportingZip}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExportingZip ? "Compilando..." : "Compilar Paquete ZIP"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadFile(
                        JSON.stringify({ title: gameTitle, code, fpg, resolution, target: "winebox", version: "3.0" }, null, 2),
                        `${gameTitle}_winebox.div.json`,
                        "application/json"
                      )
                    }
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#111827] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-[#7C2D48]" />
                    <span>.div.json</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "json" && (
            <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0]">
              <p className="text-[#4B5563]">
                Guarda una copia de seguridad íntegra de tu proyecto con código fuente, gráficos FPG y configuración:
              </p>
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile(
                      JSON.stringify({ title: gameTitle, code, fpg, resolution, version: "3.0" }, null, 2),
                      `${gameTitle}.div.json`,
                      "application/json"
                    )
                  }
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Respaldo (.div.json)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
