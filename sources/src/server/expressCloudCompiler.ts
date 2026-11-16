import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import JSZip from "jszip";

export interface ExpressCloudBuildInput {
  title?: string;
  htmlContent: string;
  icon192Base64?: string | null;
  icon512Base64?: string | null;
  iconMaskable512Base64?: string | null;
  orientation?: "landscape" | "portrait" | "sensor";
  projectType?: "game" | "web";
}

export interface ExpressCloudBuildMeta {
  buildId: string;
  title: string;
  projectType: "game" | "web";
  orientation: "landscape" | "portrait" | "sensor";
  createdAt: string;
  sizeBytes: number;
  sha256: string;
}

export interface ExpressCloudBuildResult {
  buildId: string;
  title: string;
  relativeUrl: string;
  downloadHtmlUrl: string;
  pwaBundleUrl: string;
  apkDownloadUrl: string | null;
  apkAvailable: boolean;
  sizeKb: number;
  sha256Short: string;
  createdAt: string;
}

const BUILDS_ROOT = path.resolve(process.cwd(), ".wxdiv-cloud-builds");

// Valid 1x1 fallback PNG if client didn't render one
const FALLBACK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function ensureBuildsRoot() {
  if (!fs.existsSync(BUILDS_ROOT)) {
    fs.mkdirSync(BUILDS_ROOT, { recursive: true });
  }
}

function slugifyTitle(raw: string): string {
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return cleaned || "mi-idea";
}

function escapeHtmlAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function injectPwaIntoHtml(html: string, title: string): string {
  const safeTitle = escapeHtmlAttr(title);
  const pwaHeadSnippet = `
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${safeTitle}" />
  <meta name="theme-color" content="#7C2D48" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <link rel="icon" type="image/png" href="./icon-192.png" />
  <link rel="apple-touch-icon" href="./icon-192.png" />`;

  const swSnippet = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js').catch(function() {});
      });
    }
  </script>`;

  let out = html;
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${pwaHeadSnippet}\n</head>`);
  } else {
    out = `${pwaHeadSnippet}\n${out}`;
  }

  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${swSnippet}\n</body>`);
  } else {
    out = `${out}\n${swSnippet}`;
  }
  return out;
}

export function isValidBuildId(buildId: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,60}$/.test(buildId);
}

export function getExpressBuildDir(buildId: string): string | null {
  if (!isValidBuildId(buildId)) return null;
  const dir = path.resolve(BUILDS_ROOT, buildId);
  if (!dir.startsWith(BUILDS_ROOT + path.sep)) return null;
  if (!fs.existsSync(dir)) return null;
  return dir;
}

export function readExpressBuildMeta(buildId: string): ExpressCloudBuildMeta | null {
  const dir = getExpressBuildDir(buildId);
  if (!dir) return null;
  const metaPath = path.join(dir, "meta.json");
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8")) as ExpressCloudBuildMeta;
  } catch {
    return null;
  }
}

export async function buildExpressPwaZipBuffer(buildId: string): Promise<Buffer | null> {
  const dir = getExpressBuildDir(buildId);
  if (!dir) return null;

  const meta = readExpressBuildMeta(buildId);
  const title = meta?.title || "Mi App WXDIV";
  const zip = new JSZip();

  const files = [
    "index.html",
    "manifest.webmanifest",
    "sw.js",
    "icon-192.png",
    "icon-512.png",
    "icon-maskable-512.png",
  ];

  for (const name of files) {
    const filePath = path.join(dir, name);
    if (fs.existsSync(filePath)) {
      zip.file(name, fs.readFileSync(filePath));
    }
  }

  // Fallback maskable icon if older build lacked it
  if (!fs.existsSync(path.join(dir, "icon-maskable-512.png")) && fs.existsSync(path.join(dir, "icon-512.png"))) {
    zip.file("icon-maskable-512.png", fs.readFileSync(path.join(dir, "icon-512.png")));
  }

  zip.file(
    "LEEME_PUBLICAR_Y_APK.txt",
    `${title} - Paquete Web & App Movil (Sin secretos ni cuentas requeridas)
==========================================================================

OPCION A: PUBLICAR GRATIS ARRASTRANDO ESTA CARPETA (30 SEGUNDOS)
1. Descomprime este archivo ZIP en una carpeta.
2. Abre https://app.netlify.com/drop (o Cloudflare Pages / cualquier hosting web).
3. Arrastra la carpeta descomprimida dentro de la pagina.
4. Obtendras un enlace HTTPS publico al instante para abrirlo e instalarlo en Android/iPhone.

OPCION B: CREAR UN APK / AAB PARA ANDROID SIN SECRETOS NI GITHUB
1. Publica tu carpeta siguiendo la Opcion A para obtener tu enlace HTTPS.
2. Entra en https://www.pwabuilder.com e introduce ese enlace HTTPS.
3. Haz clic en "Package for Stores" > Android para descargar tu paquete APK/AAB listo para Android.
`
  );

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function compileExpressCloudApp(
  input: ExpressCloudBuildInput
): Promise<ExpressCloudBuildResult> {
  if (!input?.htmlContent || typeof input.htmlContent !== "string") {
    throw new Error("Falta el contenido del proyecto para compilar.");
  }

  ensureBuildsRoot();

  const cleanTitle = (input.title || "Mi Idea WXDIV").trim().slice(0, 60) || "Mi Idea WXDIV";
  const shortCode = crypto.randomBytes(2).toString("hex");
  const buildId = `${slugifyTitle(cleanTitle)}-${shortCode}`;
  const buildDir = path.join(BUILDS_ROOT, buildId);
  fs.mkdirSync(buildDir, { recursive: true });

  const orientation: "landscape" | "portrait" | "sensor" =
    input.orientation === "landscape" || input.orientation === "portrait"
      ? input.orientation
      : "sensor";
  const projectType: "game" | "web" = input.projectType === "web" ? "web" : "game";

  // Hosted PWA index.html + Offline portable single-file HTML
  const hostedHtml = injectPwaIntoHtml(input.htmlContent, cleanTitle);
  const offlineHtml = input.htmlContent;

  const manifestOrientation =
    orientation === "landscape"
      ? "landscape"
      : orientation === "portrait"
        ? "portrait"
        : "any";

  const shortName = cleanTitle.slice(0, 12).trim() || "MiApp";

  const manifest = {
    id: "./",
    name: cleanTitle,
    short_name: shortName,
    description: `${cleanTitle} — Creado en WXDIV Studio`,
    start_url: "./",
    scope: "./",
    display: "standalone",
    orientation: manifestOrientation,
    background_color: "#0b1222",
    theme_color: "#7C2D48",
    icons: [
      {
        src: "./icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "./icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "./icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  const swJs = `const CACHE_NAME = "wxdiv-cloud-${buildId}-v1";
const ASSETS = [
  "./",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(networkRes) {
        return networkRes;
      }).catch(function() {
        if (event.request.mode === "navigate") {
          return caches.match("./");
        }
        return cached;
      });
    })
  );
});
`;

  const icon192Buf = Buffer.from(input.icon192Base64 || FALLBACK_PNG_BASE64, "base64");
  const icon512Buf = Buffer.from(
    input.icon512Base64 || input.icon192Base64 || FALLBACK_PNG_BASE64,
    "base64"
  );
  const iconMask512Buf = Buffer.from(
    input.iconMaskable512Base64 || input.icon512Base64 || input.icon192Base64 || FALLBACK_PNG_BASE64,
    "base64"
  );

  fs.writeFileSync(path.join(buildDir, "index.html"), hostedHtml, "utf8");
  fs.writeFileSync(path.join(buildDir, "offline.html"), offlineHtml, "utf8");
  fs.writeFileSync(
    path.join(buildDir, "manifest.webmanifest"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
  fs.writeFileSync(path.join(buildDir, "sw.js"), swJs, "utf8");
  fs.writeFileSync(path.join(buildDir, "icon-192.png"), icon192Buf);
  fs.writeFileSync(path.join(buildDir, "icon-512.png"), icon512Buf);
  fs.writeFileSync(path.join(buildDir, "icon-maskable-512.png"), iconMask512Buf);

  const sha256 = crypto.createHash("sha256").update(hostedHtml, "utf8").digest("hex");
  const sizeBytes = Buffer.byteLength(hostedHtml, "utf8");
  const createdAt = new Date().toISOString();

  const meta: ExpressCloudBuildMeta = {
    buildId,
    title: cleanTitle,
    projectType,
    orientation,
    createdAt,
    sizeBytes,
    sha256,
  };

  fs.writeFileSync(path.join(buildDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

  return {
    buildId,
    title: cleanTitle,
    relativeUrl: `/p/${buildId}/`,
    downloadHtmlUrl: `/p/${buildId}/download-html`,
    pwaBundleUrl: `/p/${buildId}/pwa-bundle.zip`,
    apkDownloadUrl: null,
    apkAvailable: false,
    sizeKb: Math.max(1, Math.round(sizeBytes / 1024)),
    sha256Short: sha256.slice(0, 12),
    createdAt,
  };
}

