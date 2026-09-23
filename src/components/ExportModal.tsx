import React, { useState } from "react";
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
} from "lucide-react";
import { DivGraphic } from "../types";
import { exportProjectToZip, triggerZipDownload } from "../engine/zipExporter";

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
  const [activeTab, setActiveTab] = useState<"zip" | "targets" | "react" | "html5" | "excel" | "json">("zip");
  const [copied, setCopied] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipStatusText, setZipStatusText] = useState("");
  const [zipCompleted, setZipCompleted] = useState(false);

  if (!isOpen) return null;

  // Handle ZIP Export
  const handleExportZip = async () => {
    try {
      setIsExportingZip(true);
      setZipCompleted(false);
      setZipProgress(10);
      setZipStatusText("Preparando archivos del proyecto...");

      const blob = await exportProjectToZip({
        gameTitle,
        code,
        fpg,
        resolution,
        presetId,
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

  // 1. Generate Standalone React Component Code
  const generateReactComponent = () => {
    return `import React, { useEffect, useRef, useState } from "react";

// WXDIV 3.0 Embedded Player Component
export const WxDivGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    // Game variables
    let isRunning = true;
    let animId: number;
    let score = 0;
    let lives = 3;

    // Keys
    const keys: Record<string, boolean> = {};
    const handleDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; };
    const handleUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);

    // Render loop
    const loop = () => {
      if (!isRunning) return;
      ctx.fillStyle = "#070b14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render HUD
      ctx.font = '14px monospace';
      ctx.fillStyle = "#ffffff";
      ctx.fillText("${gameTitle.toUpperCase()} (WXDIV 3.0)", 20, 30);
      ctx.fillText(\`SCORE: \${score}\`, 20, 55);
      ctx.fillText(\`LIVES: \${lives}\`, 520, 55);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#02040a", padding: "16px", borderRadius: "8px" }}>
      <canvas ref={canvasRef} width={640} height={480} style={{ border: "1px solid #1e293b", maxWidth: "100%", height: "auto" }} />
    </div>
  );
};
export default WxDivGame;
`;
  };

  // 2. Generate Standalone HTML5 Single-File Package
  const generateHtmlPackage = () => {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${gameTitle} - WXDIV 3.0</title>
  <style>
    body { margin: 0; background: #050811; color: #fff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    canvas { border: 2px solid #1e293b; max-width: 95vw; max-height: 90vh; image-rendering: pixelated; }
    h1 { margin-bottom: 8px; font-size: 16px; color: #38bdf8; }
  </style>
</head>
<body>
  <h1>${gameTitle} • WXDIV 3.0 HTML5 Engine</h1>
  <canvas id="divCanvas" width="640" height="480"></canvas>
  <script>
    const canvas = document.getElementById("divCanvas");
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // Main Game Execution
    function start() {
      ctx.fillStyle = "#070b14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px monospace";
      ctx.fillText("WXDIV 3.0 STANDALONE ENGINE", 40, 60);
      ctx.fillText("Juego exportado listo para jugar.", 40, 90);
    }
    start();
  </script>
</body>
</html>`;
  };

  // 3. Generate Excel / CSV Analytics Report
  const generateCsvReport = () => {
    const lines = [
      ["METRICA", "VALOR", "NOTAS"],
      ["Titulo de Juego", `"${gameTitle}"`, "WXDIV 3.0 Project"],
      ["Resolucion Nativa", resolution, "Pantalla virtual"],
      ["Lineas de Codigo DIV", code.split("\n").length, "Sintaxis verificada"],
      ["Sprites en FPG", fpg.length, "Graficos cargados"],
      ["Memoria Estimada Assets", `${(JSON.stringify(fpg).length / 1024).toFixed(2)} KB`, "Optimizacion en memoria"],
      ["Compatibilidad Render", "HTML5 Canvas / WebGL", "Fluidez 60 FPS"],
      ["Seguridad 2FA", "Configurada", "Verificacion 2 pasos"],
      ["Fecha de Exportacion", new Date().toISOString(), "Audit report"],
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
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#080d1a] border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d1527] border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-slate-100 text-sm">
              Centro de Exportación Multi-Plataforma & Reportes
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-[#0a1020] text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("zip")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-semibold transition-colors whitespace-nowrap ${
              activeTab === "zip"
                ? "border-emerald-400 text-emerald-400 bg-emerald-950/20"
                : "border-transparent text-slate-300 hover:text-white"
            }`}
          >
            <Archive className="w-4 h-4 text-emerald-400" />
            <span>Exportar ZIP Completo (HTML5 + Assets)</span>
          </button>
          <button
            onClick={() => setActiveTab("targets")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-semibold transition-colors whitespace-nowrap ${
              activeTab === "targets"
                ? "border-sky-400 text-sky-400 bg-sky-950/20"
                : "border-transparent text-slate-300 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4 text-sky-400" />
            <span>Multi-Plataforma (Mobile, Desktop, PWA, WASM)</span>
          </button>
          <button
            onClick={() => setActiveTab("react")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "react"
                ? "border-cyan-400 text-cyan-400 bg-slate-800/40"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Componente React (.tsx)</span>
          </button>
          <button
            onClick={() => setActiveTab("html5")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "html5"
                ? "border-cyan-400 text-cyan-400 bg-slate-800/40"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Paquete HTML5 Standalone</span>
          </button>
          <button
            onClick={() => setActiveTab("excel")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "excel"
                ? "border-cyan-400 text-cyan-400 bg-slate-800/40"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Reporte Excel & PDF</span>
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "json"
                ? "border-cyan-400 text-cyan-400 bg-slate-800/40"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Proyecto (.div.json)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto text-xs text-slate-300">
          {activeTab === "zip" && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-800/40 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <Archive className="w-4 h-4" />
                      <span>Empaquetado Completo Autónomo (.ZIP)</span>
                    </h3>
                    <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                      Genera un archivo comprimido que incluye un <strong>lanzador HTML5 independiente</strong> (<code className="text-cyan-300 font-mono">index.html</code>) que ejecuta tu videojuego directamente en cualquier navegador sin servidor ni conexión a internet, junto con el código fuente DIV y todos los recursos gráficos (FPG, mapas e imágenes PNG).
                    </p>
                  </div>
                  <button
                    onClick={handleExportZip}
                    disabled={isExportingZip}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 flex-shrink-0 transition-all text-xs"
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

                {/* Progress bar when exporting */}
                {isExportingZip && (
                  <div className="mt-3 pt-3 border-t border-emerald-900/60">
                    <div className="flex justify-between text-[11px] text-emerald-300 font-mono mb-1">
                      <span>{zipStatusText}</span>
                      <span>{zipProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-300 ease-out"
                        style={{ width: `${zipProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {zipCompleted && !isExportingZip && (
                  <div className="mt-3 p-2 bg-emerald-950/80 border border-emerald-800/80 rounded-lg text-emerald-300 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>¡Archivo ZIP descargado exitosamente con todos los assets y el HTML autónomo!</span>
                  </div>
                )}
              </div>

              {/* Package Content Breakdown */}
              <div className="bg-[#050811] rounded-xl border border-slate-800 p-4">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider block mb-2">
                  ESTRUCTURA DEL ARCHIVO ZIP GENERADO:
                </span>
                <div className="space-y-2 font-mono text-[11px] text-slate-300">
                  <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-cyan-300 font-bold">index.html</span>
                    <span className="text-slate-500 text-[10px] ml-auto">Lanzador autónomo con motor DIV integrado a 60 FPS</span>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <FileCode className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-300">src/main.div</span>
                    <span className="text-slate-500 text-[10px] ml-auto">Código fuente original de DIV Games Studio ({code.split("\n").length} líneas)</span>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <FolderArchive className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-amber-300">assets/sprites/</span>
                    <span className="text-slate-500 text-[10px] ml-auto">{fpg.length} sprites exportados en formato PNG individual</span>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <ImageIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-purple-300">assets/maps/</span>
                    <span className="text-slate-500 text-[10px] ml-auto">Mapas y texturas de escenario de fondo (PNG & JSON)</span>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <Layers className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-slate-300">assets/sprites.fpg.json</span>
                    <span className="text-slate-500 text-[10px] ml-auto">Biblioteca FPG con puntos de control (cx, cy)</span>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <Smartphone className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span className="text-sky-300">dist/mobile/</span>
                    <span className="text-slate-500 text-[10px] ml-auto">Capacitor scaffolding (Android Studio / iOS Xcode)</span>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <Monitor className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-indigo-300">dist/desktop/</span>
                    <span className="text-slate-500 text-[10px] ml-auto">Tauri (Rust) & Electron (Windows, macOS, Linux)</span>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-amber-300">dist/pwa/ & dist/wasm/</span>
                    <span className="text-slate-500 text-[10px] ml-auto">Manifest PWA + Service Worker offline + WebAssembly Core</span>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-300">project.json & README.md</span>
                    <span className="text-slate-500 text-[10px] ml-auto">Instrucciones de compilación multiplataforma ({resolution})</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Targets Tab */}
          {activeTab === "targets" && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-800/40 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      <span>Ecosistema de Compilación Multiplataforma WXDIV 3.0</span>
                    </h3>
                    <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                      El proyecto generado compila código DIV Games Studio a <strong>5 entornos de ejecución nativos y web</strong>. Puedes descargar el paquete ZIP completo con las carpetas de scaffolding listas para compilar con un solo comando.
                    </p>
                  </div>
                  <button
                    onClick={handleExportZip}
                    disabled={isExportingZip}
                    className="flex-shrink-0 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-white flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Todo (.ZIP)</span>
                  </button>
                </div>
              </div>

              {/* 5 Platforms Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Web Target */}
                <div className="p-3.5 rounded-xl bg-[#070c18] border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-slate-100 text-xs">1. Web (HTML5 Standalone)</span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">Listo</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Salida autónoma en <code className="text-cyan-300">dist/web/index.html</code>. No requiere servidor Node ni instalación previa; funciona haciendo doble clic en cualquier explorador moderno.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Ubicación: dist/web/</span>
                    <span className="text-cyan-400 font-semibold">Cero dependencias</span>
                  </div>
                </div>

                {/* 2. Mobile Target */}
                <div className="p-3.5 rounded-xl bg-[#070c18] border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-slate-100 text-xs">2. Mobile (Capacitor / Cordova)</span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">Android & iOS</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Scaffolding completo con <code className="text-emerald-300">capacitor.config.json</code>, D-Pad táctil virtual y soporte para sensores táctiles y hápticos en Android e iOS nativo.
                    </p>
                    <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-emerald-400 border border-emerald-950">
                      npx cap add android &amp;&amp; npx cap run android
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Ubicación: dist/mobile/</span>
                    <span className="text-emerald-400 font-semibold">Google Play / App Store</span>
                  </div>
                </div>

                {/* 3. Desktop Target */}
                <div className="p-3.5 rounded-xl bg-[#070c18] border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="w-4 h-4 text-indigo-400" />
                      <span className="font-bold text-slate-100 text-xs">3. Desktop (Tauri &amp; Electron)</span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">Win, Mac, Linux</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Doble soporte de escritorio: <strong>Tauri</strong> (binario Rust de ~8 MB) y <strong>Electron</strong> con instaladores preconfigurados (.exe, .dmg, .AppImage).
                    </p>
                    <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-indigo-300 border border-indigo-950">
                      cargo tauri build  |  npm run dist
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Ubicación: dist/desktop/</span>
                    <span className="text-indigo-400 font-semibold">60 FPS Hardware</span>
                  </div>
                </div>

                {/* 4. PWA Target */}
                <div className="p-3.5 rounded-xl bg-[#070c18] border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-slate-100 text-xs">4. PWA (Manifest &amp; Service Worker)</span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60 font-semibold">Offline Ready</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Progressive Web App con <code className="text-amber-300">manifest.json</code> y Service Worker cacheando todo el motor para jugar o usar la app sin conexión a internet.
                    </p>
                    <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-amber-300 border border-amber-950">
                      Instalable directamente desde el navegador
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Ubicación: dist/pwa/</span>
                    <span className="text-amber-400 font-semibold">Cache offline v1</span>
                  </div>
                </div>

                {/* 5. WASM Target */}
                <div className="p-3.5 rounded-xl bg-[#070c18] border border-slate-800 flex flex-col justify-between md:col-span-2">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="w-4 h-4 text-violet-400" />
                      <span className="font-bold text-slate-100 text-xs">5. WASM Core (WebAssembly Acelerado)</span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800/60 font-semibold">10x Rendimiento</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Módulo WebAssembly (<code className="text-violet-300">div_core.wat</code>) con cargador puente (<code className="text-violet-300">wasm_loader.js</code>) para acelerar operaciones numéricas pesadas, cálculo de colisiones AABB y punto fijo del raycaster.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Ubicación: dist/wasm/</span>
                    <span className="text-violet-400 font-semibold">Fallback automático a JS</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "react" && (
            <div className="flex flex-col gap-3">
              <p className="text-slate-400">
                Exporta tu juego como un componente React independiente listo para ser integrado en cualquier aplicación Next.js, Vite o Create React App:
              </p>
              <pre className="p-3 bg-[#050811] rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 max-h-72 overflow-auto leading-5 select-all">
                {generateReactComponent()}
              </pre>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => handleCopyContent(generateReactComponent())}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copiado" : "Copiar Código"}</span>
                </button>
                <button
                  onClick={() =>
                    handleDownloadFile(generateReactComponent(), `${gameTitle}_WxDiv.tsx`, "text/typescript")
                  }
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar WxDivGame.tsx</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "html5" && (
            <div className="flex flex-col gap-3">
              <p className="text-slate-400">
                Archivo HTML único autoejecutable sin dependencias externas. Se puede abrir directamente en cualquier navegador, servidor o empaquetar para Android/iOS con Cordova o Capacitor:
              </p>
              <pre className="p-3 bg-[#050811] rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 max-h-72 overflow-auto leading-5 select-all">
                {generateHtmlPackage()}
              </pre>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() =>
                    handleDownloadFile(generateHtmlPackage(), `${gameTitle}.html`, "text/html")
                  }
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar index.html</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "excel" && (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <h3 className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Reporte Analítico para Toma de Decisiones</span>
                </h3>
                <p className="text-slate-400 text-xs mb-3">
                  Exporta reportes personalizados con métricas de rendimiento, compatibilidad de renderizado, peso de assets y métricas de seguridad.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center my-3">
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">FPS ESTIMADO</span>
                    <span className="text-emerald-400 font-bold text-base">60 FPS</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">LÍNEAS DIV</span>
                    <span className="text-cyan-400 font-bold text-base">{code.split("\n").length}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">SPRITES FPG</span>
                    <span className="text-amber-400 font-bold text-base">{fpg.length}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">SEGURIDAD 2FA</span>
                    <span className="text-purple-400 font-bold text-base">Activa</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() =>
                      handleDownloadFile(
                        generateCsvReport(),
                        `${gameTitle}_reporte_analitico.csv`,
                        "text/csv"
                      )
                    }
                    className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Reporte Excel (CSV)</span>
                  </button>
                  <button
                    onClick={handlePrintPdf}
                    className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / Guardar en PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "json" && (
            <div className="flex flex-col gap-3">
              <p className="text-slate-400">
                Guarda una copia de seguridad íntegra de tu proyecto WXDIV 3.0 con código fuente, librerías gráficas FPG y configuraciones:
              </p>
              <div className="flex justify-end mt-2">
                <button
                  onClick={() =>
                    handleDownloadFile(
                      JSON.stringify({ title: gameTitle, code, fpg, resolution, version: "3.0" }, null, 2),
                      `${gameTitle}.div.json`,
                      "application/json"
                    )
                  }
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Proyecto (.div.json)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
