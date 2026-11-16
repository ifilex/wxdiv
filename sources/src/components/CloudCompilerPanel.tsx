import React, { useEffect, useState } from "react";
import JSZip from "jszip";
import {
  Cloud,
  Download,
  Loader2,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Smartphone,
  Globe,
  Gamepad2,
  Wand2,
  Share2,
  Eye,
  ShieldCheck,
  Layers,
  Monitor,
  Package,
} from "lucide-react";
import { DivGraphic } from "../types";
import {
  AdMobConfig,
  buildUniversalStandaloneAppHtml,
  exportAndroidStudioZip,
  exportProjectToZip,
  renderAppIconBase64,
  triggerZipDownload,
} from "../engine/zipExporter";
import { parseDivToHtml5State } from "../engine/html5Engine";
import { triggerTextFileDownload } from "../engine/cloudAndroidBuilder";

interface CloudCompilerPanelProps {
  gameTitle: string;
  code: string;
  fpg: DivGraphic[];
  resolution: "320x200" | "640x480" | "800x600";
  presetId?: string;
  packageName: string;
  onPackageNameChange: (val: string) => void;
  appVersion: string;
  onAppVersionChange: (val: string) => void;
  orientation: "landscape" | "portrait" | "sensor";
  onOrientationChange: (val: "landscape" | "portrait" | "sensor") => void;
  projectType: "game" | "web";
  onProjectTypeChange: (val: "game" | "web") => void;
  adMobConfig: AdMobConfig;
}

type CompilerSubTab = "publicar" | "pwa_apk" | "offline_packs";

export const CloudCompilerPanel: React.FC<CloudCompilerPanelProps> = ({
  gameTitle,
  code,
  fpg,
  resolution,
  presetId,
  packageName,
  appVersion,
  orientation,
  onOrientationChange,
  projectType,
  onProjectTypeChange,
  adMobConfig,
}) => {
  const detectedIsWebApp = React.useMemo(() => {
    try {
      if (projectType === "web") return true;
      const parsed = parseDivToHtml5State(code, presetId);
      return Boolean(parsed.active);
    } catch {
      return false;
    }
  }, [code, presetId, projectType]);

  const [subTab, setSubTab] = useState<CompilerSubTab>("publicar");
  const [expressTitle, setExpressTitle] = useState(gameTitle || "Mi App Móvil");
  const [expressKind, setExpressKind] = useState<"web" | "game">(detectedIsWebApp ? "web" : "game");
  const [previewViewport, setPreviewViewport] = useState<"mobile" | "wide">(
    orientation === "landscape" ? "wide" : "mobile"
  );

  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [compiledHtml, setCompiledHtml] = useState<string>("");
  const [showEmbeddedTest, setShowEmbeddedTest] = useState<boolean>(false);

  const [isDownloadingPwaZip, setIsDownloadingPwaZip] = useState(false);
  const [isExportingAndroid, setIsExportingAndroid] = useState(false);
  const [isExportingFullZip, setIsExportingFullZip] = useState(false);
  const [packSuccessMsg, setPackSuccessMsg] = useState<string | null>(null);

  const safeSlug =
    (expressTitle || gameTitle || "mi_webapp")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/^_+|_+$/g, "") || "mi_webapp";

  useEffect(() => {
    setExpressTitle(gameTitle || "Mi App Móvil");
  }, [gameTitle]);

  useEffect(() => {
    setExpressKind(detectedIsWebApp ? "web" : "game");
  }, [detectedIsWebApp]);

  useEffect(() => {
    setPreviewViewport(orientation === "landscape" ? "wide" : "mobile");
  }, [orientation]);

  const buildCurrentStandaloneHtml = (titleOverride?: string) => {
    const finalTitle = (titleOverride || expressTitle || gameTitle || "Mi App Móvil").trim() || "Mi App Móvil";
    return buildUniversalStandaloneAppHtml({
      title: finalTitle,
      code,
      resolution,
      fpg,
      presetId,
    });
  };

  const handleSelectKind = (kind: "web" | "game") => {
    setExpressKind(kind);
    onProjectTypeChange(kind);
    if (kind === "web" && orientation === "landscape") {
      onOrientationChange("portrait");
    }
  };

  const buildAndDownloadPwaBundleZip = async (overrideHtml?: string, overrideTitle?: string) => {
    try {
      setIsDownloadingPwaZip(true);
      setPackSuccessMsg(null);
      setCompileError(null);
      const finalTitle = overrideTitle || expressTitle.trim() || gameTitle || "Mi App Móvil";
      const rawHtml = overrideHtml || compiledHtml || buildCurrentStandaloneHtml(finalTitle);

      const safeAttr = finalTitle.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
      const pwaHead = `
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${safeAttr}" />
  <meta name="theme-color" content="#7C2D48" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <link rel="icon" type="image/png" href="./icon-192.png" />
  <link rel="apple-touch-icon" href="./icon-192.png" />`;
      const swReg = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js').catch(function() {});
      });
    }
  </script>`;
      let indexHtml = /<\/head>/i.test(rawHtml) ? rawHtml.replace(/<\/head>/i, `${pwaHead}\n</head>`) : `${pwaHead}\n${rawHtml}`;
      indexHtml = /<\/body>/i.test(indexHtml) ? indexHtml.replace(/<\/body>/i, `${swReg}\n</body>`) : `${indexHtml}\n${swReg}`;

      const manifestOrientation =
        orientation === "landscape"
          ? "landscape"
          : orientation === "portrait"
            ? "portrait"
            : "any";

      const manifest = {
        id: "./",
        name: finalTitle.slice(0, 45),
        short_name: finalTitle.slice(0, 12).trim() || "MiApp",
        description: `${finalTitle} - WebApp Móvil WXDIV`,
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: manifestOrientation,
        background_color: "#F7F8FA",
        theme_color: "#7C2D48",
        icons: [
          { src: "./icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "./icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "./icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      };

      const swJs = `const CACHE_NAME = "wxdiv-pwa-${safeSlug}-v1";
const ASSETS = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];
self.addEventListener("install", function(e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});
self.addEventListener("activate", function(e) {
  e.waitUntil(caches.keys().then(function(ks) {
    return Promise.all(ks.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener("fetch", function(e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function(hit) {
      return hit || fetch(e.request).catch(function() {
        if (e.request.mode === "navigate") return caches.match("./");
        return hit;
      });
    })
  );
});`;

      const zip = new JSZip();
      zip.file("index.html", indexHtml);
      zip.file("manifest.webmanifest", JSON.stringify(manifest, null, 2));
      zip.file("sw.js", swJs);

      const icon192 = renderAppIconBase64(192, fpg, finalTitle, false);
      const icon512 = renderAppIconBase64(512, fpg, finalTitle, false);
      const iconMask512 = renderAppIconBase64(512, fpg, finalTitle, true);
      if (icon192) zip.file("icon-192.png", icon192, { base64: true });
      if (icon512) zip.file("icon-512.png", icon512, { base64: true });
      if (iconMask512) zip.file("icon-maskable-512.png", iconMask512, { base64: true });

      zip.file(
        "LEEME_WEBAPP_MOVIL.txt",
        `${finalTitle} - WebApp Móvil Instalable
==================================================

1. Descomprime este archivo ZIP en una carpeta.
2. Arrastra la carpeta completa en https://app.netlify.com/drop (o Cloudflare Pages).
3. Abre el enlace HTTPS en el navegador del teléfono e instálalo en la pantalla de inicio como una app nativa.
4. Si deseas empaquetar un archivo APK/AAB para Android, pega esa URL HTTPS en https://www.pwabuilder.com.
`
      );

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      triggerZipDownload(blob, `${safeSlug}_webapp_movil.zip`);
      setPackSuccessMsg("Paquete WebApp Móvil (.zip) descargado con iconos, manifest y modo sin conexión.");
    } catch (err: any) {
      setCompileError(err?.message || "No se pudo generar el archivo ZIP de la WebApp móvil.");
    } finally {
      setIsDownloadingPwaZip(false);
    }
  };

  const handleDownloadPwaBundleZip = () => {
    void buildAndDownloadPwaBundleZip();
  };

  const handleCompileAndPublish = async () => {
    try {
      setIsCompiling(true);
      setCompileError(null);
      setPackSuccessMsg(null);

      const finalTitle = expressTitle.trim() || gameTitle || "Mi App Móvil";
      const htmlContent = buildCurrentStandaloneHtml(finalTitle);
      setCompiledHtml(htmlContent);
      setShowEmbeddedTest(true);

      // 1-Click behavior: always build and download the standalone Mobile WebApp PWA ZIP right away
      await buildAndDownloadPwaBundleZip(htmlContent, finalTitle);
    } catch (err: any) {
      setCompileError(err?.message || "No se pudo compilar la WebApp móvil.");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleOpenBlobPreview = () => {
    const html = compiledHtml || buildCurrentStandaloneHtml();
    setCompiledHtml(html);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 150);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const handleDownloadOfflineHtml = () => {
    const html = compiledHtml || buildCurrentStandaloneHtml();
    setCompiledHtml(html);
    triggerTextFileDownload(html, `${safeSlug}_webapp.html`, "text/html;charset=utf-8");
    setPackSuccessMsg("Descargado como archivo HTML autónomo sin recuadros ni dependencias externas.");
  };

  const handleDownloadAndroidStudioLocal = async () => {
    try {
      setIsExportingAndroid(true);
      setPackSuccessMsg(null);
      const blob = await exportAndroidStudioZip({
        gameTitle: expressTitle || gameTitle,
        code,
        fpg,
        resolution,
        presetId,
        packageName,
        appVersion,
        orientation,
        projectType: expressKind,
        adMobConfig,
      });
      triggerZipDownload(blob, `${safeSlug}_android_studio.zip`);
      setPackSuccessMsg("Proyecto Android Studio (.zip) descargado listo para compilar localmente.");
    } finally {
      setIsExportingAndroid(false);
    }
  };

  const handleDownloadFullMultiTarget = async () => {
    try {
      setIsExportingFullZip(true);
      setPackSuccessMsg(null);
      const blob = await exportProjectToZip({
        gameTitle: expressTitle || gameTitle,
        code,
        fpg,
        resolution,
        presetId,
        packageName,
        appVersion,
        orientation,
        projectType: expressKind,
        adMobConfig,
      });
      triggerZipDownload(blob, `${safeSlug}_multiplataforma.zip`);
      setPackSuccessMsg("Paquete completo (.zip) descargado con HTML5 limpio, sprites, sonidos y código fuente.");
    } finally {
      setIsExportingFullZip(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Zero-Data Privacy & Mobile WebApp Banner */}
      <div className="p-4 rounded-xl bg-[#EEF6F1] border border-[#CFE4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2F6F4E] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-[#111827] font-bold text-sm">
              Compilador Móvil Directo (Sin Cuentas ni Contraseñas)
            </div>
            <p className="text-xs text-[#4B5563] leading-relaxed">
              Convierte tu idea en una WebApp móvil instalable a pantalla completa con todos sus gráficos y sonidos integrados, sin pedir datos personales ni claves externas.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Clear Sub-Navigation Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setSubTab("publicar")}
          className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            subTab === "publicar"
              ? "bg-[#7C2D48] text-white border-[#7C2D48] shadow-xs"
              : "bg-white text-[#4B5563] border-[#E2E8F0] hover:bg-[#F7F8FA] hover:text-[#111827]"
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>1. WebApp Móvil (1 Clic)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("pwa_apk")}
          className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            subTab === "pwa_apk"
              ? "bg-[#7C2D48] text-white border-[#7C2D48] shadow-xs"
              : "bg-white text-[#4B5563] border-[#E2E8F0] hover:bg-[#F7F8FA] hover:text-[#111827]"
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span>2. Instalar en Teléfono y APK</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("offline_packs")}
          className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            subTab === "offline_packs"
              ? "bg-[#7C2D48] text-white border-[#7C2D48] shadow-xs"
              : "bg-white text-[#4B5563] border-[#E2E8F0] hover:bg-[#F7F8FA] hover:text-[#111827]"
          }`}
        >
          <FileArchive className="w-4 h-4 shrink-0" />
          <span>3. Paquetes Sin Internet</span>
        </button>
      </div>

      {/* TAB 1: MOBILE WEBAPP ONE-CLICK COMPILE & TEST */}
      {subTab === "publicar" && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FDF2F5] border border-[#F3D0DC] text-[#7C2D48] flex items-center justify-center shrink-0">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827]">
                  Genera tu WebApp Móvil Autónoma (Pantalla Completa)
                </h3>
                <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                  Empaqueta tu juego o app con controles táctiles automáticos, gráficos FPG y audio incluidos en un HTML puro sin bordes ni recuadros.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#374151] block mb-1.5">
                  Nombre de la WebApp
                </label>
                <input
                  type="text"
                  value={expressTitle}
                  onChange={(e) => setExpressTitle(e.target.value)}
                  placeholder="Ej: Mi App o Juego"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] text-sm text-[#111827] font-semibold focus:outline-none focus:border-[#7C2D48]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#374151] block mb-1.5">
                  Experiencia Principal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectKind("web")}
                    className={`min-h-[44px] px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      expressKind === "web"
                        ? "bg-[#FDF2F5] border-[#7C2D48] text-[#7C2D48]"
                        : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563] hover:text-[#111827]"
                    }`}
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <span>App Móvil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectKind("game")}
                    className={`min-h-[44px] px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      expressKind === "game"
                        ? "bg-[#EEF6F1] border-[#2F6F4E] text-[#2F6F4E]"
                        : "bg-[#F7F8FA] border-[#E2E8F0] text-[#4B5563] hover:text-[#111827]"
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4 shrink-0" />
                    <span>Juego Táctil</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#374151] block mb-1.5">
                  Orientación en Celular
                </label>
                <select
                  value={orientation}
                  onChange={(e) => onOrientationChange(e.target.value as "portrait" | "landscape" | "sensor")}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] text-xs text-[#111827] font-semibold focus:outline-none focus:border-[#7C2D48]"
                >
                  <option value="portrait">Vertical Móvil (Portrait)</option>
                  <option value="landscape">Horizontal Juego (Landscape)</option>
                  <option value="sensor">Adaptable (Auto-giro)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCompileAndPublish}
                disabled={isCompiling}
                className="flex-1 min-w-[220px] min-h-[46px] px-5 rounded-xl bg-[#7C2D48] hover:bg-[#642239] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors whitespace-nowrap"
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Compilando WebApp Móvil...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 shrink-0" />
                    <span>Compilar WebApp Móvil (1 Clic)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadOfflineHtml}
                className="min-h-[46px] px-4 rounded-xl bg-[#EEF6F1] hover:bg-[#E2EFE8] border border-[#CFE4D7] text-[#2F6F4E] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Descargar HTML Puro (.html)</span>
              </button>
            </div>

            {compileError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{compileError}</span>
              </div>
            )}
          </div>

          {/* Live Compiled Mobile WebApp Simulator + Direct Links */}
          {compiledHtml && (
            <div className="p-4 rounded-xl bg-white border border-[#CFE4D7] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-[#2F6F4E] shrink-0" />
                  <span className="font-bold text-[#111827] text-sm truncate">
                    WebApp lista: {expressTitle || gameTitle}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {showEmbeddedTest && (
                    <div className="inline-flex rounded-xl bg-[#F1F5F9] p-1 border border-[#E2E8F0]">
                      <button
                        type="button"
                        onClick={() => setPreviewViewport("mobile")}
                        className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                          previewViewport === "mobile"
                            ? "bg-white text-[#7C2D48] shadow-2xs"
                            : "text-[#4B5563]"
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Móvil</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewViewport("wide")}
                        className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                          previewViewport === "wide"
                            ? "bg-white text-[#7C2D48] shadow-2xs"
                            : "text-[#4B5563]"
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Ancho</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowEmbeddedTest((v) => !v)}
                    className="min-h-[38px] px-3 rounded-xl bg-[#F7F8FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#111827] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#7C2D48] shrink-0" />
                    <span>{showEmbeddedTest ? "Ocultar Vista" : "Probar Aquí"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenBlobPreview}
                    className="min-h-[38px] px-3 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Abrir Pantalla Completa</span>
                  </button>
                </div>
              </div>

              {showEmbeddedTest && (
                <div className="w-full py-3 px-2 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] flex justify-center">
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      previewViewport === "mobile"
                        ? "w-[360px] max-w-full h-[540px] rounded-[28px] border-[6px] border-[#111827] shadow-xl bg-black"
                        : "w-full h-[380px] rounded-xl border border-[#E2E8F0] bg-black"
                    }`}
                  >
                    <iframe
                      title="Vista previa WebApp Móvil compilada"
                      srcDoc={compiledHtml}
                      className="w-full h-full border-0 block"
                      sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                    />
                  </div>
                </div>
              )}

              {/* Share & Install Actions (always visible after compile) */}
              <div className="space-y-2.5 pt-1">
                <p className="text-[11px] text-[#4B5563] leading-relaxed">
                  <strong>Para compartir directo por WhatsApp:</strong> descarga el <strong>HTML Puro</strong> (un solo archivo sin recuadro) o usa el paquete PWA listo para instalar en iPhone y Android.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadOfflineHtml}
                    className="min-h-[44px] px-3.5 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Share2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Descargar HTML para WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPwaBundleZip}
                    disabled={isDownloadingPwaZip}
                    className="min-h-[44px] px-3.5 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>{isDownloadingPwaZip ? "Creando ZIP..." : "Descargar WebApp PWA (.zip)"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INSTALLABLE MOBILE WEBAPP & APK WITHOUT KEYS OR REPOS */}
      {subTab === "pwa_apk" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
            <h3 className="text-sm font-bold text-[#7C2D48] flex items-center gap-2">
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Instalar como App en iPhone / Android o Crear APK en 3 Pasos</span>
            </h3>
            <p className="text-xs text-[#4B5563] leading-relaxed">
              Pensado para que cualquier persona publique su WebApp móvil sin configurar servidores, cuentas ni contraseñas técnicas:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="font-bold text-[#111827] text-xs">Paso 1: Descargar Paquete WebApp</div>
                  <p className="text-[11px] text-[#4B5563] leading-relaxed">
                    Incluye tu app en <code className="font-mono text-[#7C2D48]">index.html</code> a pantalla completa, iconos de inicio, manifest móvil y modo sin conexión.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPwaBundleZip}
                  disabled={isDownloadingPwaZip}
                  className="min-h-[44px] px-3 rounded-xl bg-[#7C2D48] hover:bg-[#642239] disabled:opacity-60 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {isDownloadingPwaZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>Descargar WebApp (.zip)</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="font-bold text-[#111827] text-xs">Paso 2: Publicar Gratis con 1 Arrastre</div>
                  <p className="text-[11px] text-[#4B5563] leading-relaxed">
                    Descomprime la carpeta y arrástrala dentro de Netlify Drop para obtener al instante un enlace HTTPS instalable desde Chrome o Safari.
                  </p>
                </div>
                <a
                  href="https://app.netlify.com/drop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 rounded-xl bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#111827] font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <span>Abrir Netlify Drop</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#7C2D48]" />
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="font-bold text-[#111827] text-xs">Paso 3: Generar APK / Google Play</div>
                  <p className="text-[11px] text-[#4B5563] leading-relaxed">
                    Si necesitas el archivo instalador <strong>.APK o .AAB</strong> para Android, pega tu enlace HTTPS en PWABuilder y descárgalo en segundos.
                  </p>
                </div>
                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <span>Ir a PWABuilder</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OFFLINE PACKAGES */}
      {subTab === "offline_packs" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#7C2D48] text-xs">
                <Globe className="w-4 h-4 shrink-0" />
                <span>WebApp Única Offline (.html)</span>
              </div>
              <p className="text-[11px] text-[#4B5563] leading-relaxed">
                Archivo HTML puro sin recuadros externos con todos los sprites y sonidos dentro. Funciona directo en móvil, tablet o PC sin internet.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadOfflineHtml}
              className="min-h-[44px] px-3 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Descargar .html</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#2F6F4E] text-xs">
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>Android Studio Local (.zip)</span>
              </div>
              <p className="text-[11px] text-[#4B5563] leading-relaxed">
                Proyecto Gradle completo con tu WebApp móvil embebida, sprites y AdMob listo para compilar APK en tu ordenador sin servicios externos.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadAndroidStudioLocal}
              disabled={isExportingAndroid}
              className="min-h-[44px] px-3 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] disabled:opacity-60 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {isExportingAndroid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Descargar Android .zip</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#111827] text-xs">
                <Layers className="w-4 h-4 text-[#7C2D48] shrink-0" />
                <span>Paquete Completo (.zip)</span>
              </div>
              <p className="text-[11px] text-[#4B5563] leading-relaxed">
                Todo incluido: HTML5 móvil sin recuadros, código fuente DIV, assets FPG/WAV/MAP y plantillas PWA, Capacitor y Desktop.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadFullMultiTarget}
              disabled={isExportingFullZip}
              className="min-h-[44px] px-3 rounded-xl bg-[#F7F8FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#111827] disabled:opacity-60 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {isExportingFullZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-[#7C2D48]" />}
              <span>Descargar Todo .zip</span>
            </button>
          </div>
        </div>
      )}

      {packSuccessMsg && (
        <div className="p-3 rounded-xl bg-[#EEF6F1] border border-[#CFE4D7] text-[#2F6F4E] text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{packSuccessMsg}</span>
        </div>
      )}
    </div>
  );
};
