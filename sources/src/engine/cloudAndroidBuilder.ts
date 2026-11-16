export function triggerBase64Download(base64: string, filename: string, mimeType: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
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
}

export function triggerTextFileDownload(content: string, filename: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
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
}

export interface ExpressCloudBuildResult {
  buildId: string;
  title: string;
  relativeUrl: string;
  downloadHtmlUrl: string;
  pwaBundleUrl?: string;
  sizeKb: number;
  sha256Short: string;
  createdAt: string;
}

export async function requestExpressCloudCompile(payload: {
  title?: string;
  htmlContent: string;
  icon192Base64?: string | null;
  icon512Base64?: string | null;
  iconMaskable512Base64?: string | null;
  orientation?: "landscape" | "portrait" | "sensor";
  projectType?: "game" | "web";
}): Promise<ExpressCloudBuildResult> {
  const res = await fetch("/api/cloud-build/express", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "No se pudo compilar el paquete móvil.");
  }
  return data;
}
