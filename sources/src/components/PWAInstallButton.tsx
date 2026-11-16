import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Monitor,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { PlatformType, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'menu';
  onActionComplete?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  onActionComplete,
}) => {
  const {
    isInstallable,
    isInstalled,
    isInIframe,
    detectedPlatform,
    install,
  } = usePWAInstall();

  const [showGuide, setShowGuide] = useState(false);
  const [activePlatform, setActivePlatform] = useState<PlatformType>(detectedPlatform);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Suppress button completely when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleOpenOrInstall = async () => {
    setActivePlatform(detectedPlatform);
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        onActionComplete?.();
        return;
      }
    }
    setShowGuide(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Clipboard may be restricted in some embedded contexts
    }
  };

  return (
    <>
      {variant === 'menu' ? (
        <button
          type="button"
          onClick={handleOpenOrInstall}
          className="w-full px-3.5 py-2.5 text-left hover:bg-[#ECFDF5] flex items-center gap-2.5 font-semibold text-[#2F6F4E] cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#2F6F4E] flex-shrink-0" />
          <span>Instalar App (Android / iOS / PC)</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpenOrInstall}
          className="h-9 px-2.5 sm:px-3 rounded-lg border border-[#BCE3CE] bg-[#F2FBF6] hover:bg-[#E4F6EC] text-[#2F6F4E] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Instalar WXDIV 3.0 en Android, iOS o PC"
          aria-label="Instalar aplicación"
        >
          <Download className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden md:inline">
            {isInstallable ? 'Instalar App' : 'Instalar'}
          </span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          onClick={() => {
            setShowGuide(false);
            onActionComplete?.();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden text-[#111827]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#FDF2F5] px-5 py-4">
              <div className="flex items-center gap-3">
                <img
                  src="/icon.svg"
                  alt="WXDIV 3.0"
                  className="h-10 w-10 rounded-xl border border-[#F3D0DC] shadow-xs flex-shrink-0"
                />
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">
                    Instalar WXDIV 3.0 como App
                  </h3>
                  <p className="text-[11px] text-[#4B5563]">
                    Funciona en pantalla completa y sin conexión en cualquier dispositivo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGuide(false);
                  onActionComplete?.();
                }}
                className="h-8 w-8 rounded-lg border border-[#E2E8F0] bg-white text-[#4B5563] hover:text-[#111827] flex items-center justify-center cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    const accepted = await install();
                    if (accepted) {
                      setShowGuide(false);
                      onActionComplete?.();
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar ahora en este dispositivo</span>
                </button>
              )}

              {isInIframe && !isInstallable && (
                <div className="rounded-xl border border-[#F3D0DC] bg-[#FDF2F5] p-3 text-xs text-[#4B5563] space-y-2">
                  <p className="leading-relaxed">
                    Estás viendo la app dentro de una vista previa embebida. Para que el navegador muestre el botón nativo de instalación, ábrela directamente en una pestaña de Chrome o Safari:
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#7C2D48] hover:bg-slate-50 cursor-pointer"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#2F6F4E]" />
                        <span className="text-[#2F6F4E]">Enlace copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar enlace de la App</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Platform Switcher */}
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#F1F5F9] p-1 border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setActivePlatform('android')}
                  className={`py-2 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activePlatform === 'android'
                      ? 'bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform('ios')}
                  className={`py-2 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activePlatform === 'ios'
                      ? 'bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  <Share className="w-3.5 h-3.5" />
                  <span>iPhone / iPad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform('desktop')}
                  className={`py-2 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activePlatform === 'desktop'
                      ? 'bg-white text-[#7C2D48] shadow-xs border border-[#E2E8F0]'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>PC / Mac</span>
                </button>
              </div>

              {/* Instructions Card */}
              {activePlatform === 'android' && (
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] p-4 space-y-2.5 text-xs text-[#374151]">
                  <div className="font-bold text-[#111827] flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#2F6F4E]" />
                    <span>Android (Chrome, Edge o Samsung)</span>
                  </div>
                  <ol className="space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      Abre la aplicación en <strong>Google Chrome</strong> (fuera de vistas previas embebidas).
                    </li>
                    <li>
                      Pulsa el botón <strong>Instalar</strong> si aparece automáticamente o abre el menú <strong>⋮</strong> arriba a la derecha.
                    </li>
                    <li>
                      Elige <strong>&ldquo;Instalar aplicación&rdquo;</strong> o <strong>&ldquo;Añadir a pantalla de inicio&rdquo;</strong>.
                    </li>
                  </ol>
                </div>
              )}

              {activePlatform === 'ios' && (
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] p-4 space-y-2.5 text-xs text-[#374151]">
                  <div className="font-bold text-[#111827] flex items-center gap-2">
                    <Share className="w-4 h-4 text-[#7C2D48]" />
                    <span>iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      Asegúrate de abrir la web con el navegador <strong>Safari</strong>.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span>1.</span>
                      <span>
                        Toca el icono <strong>Compartir</strong>{' '}
                        <Share className="inline w-3.5 h-3.5 text-[#7C2D48] mx-0.5" /> en la barra inferior o superior de Safari.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span>2.</span>
                      <span>
                        Desliza y selecciona <strong>&ldquo;Añadir a pantalla de inicio&rdquo;</strong>{' '}
                        <PlusSquare className="inline w-3.5 h-3.5 text-[#2F6F4E] mx-0.5" /> y confirma en <strong>Añadir</strong>.
                      </span>
                    </li>
                  </ol>
                </div>
              )}

              {activePlatform === 'desktop' && (
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] p-4 space-y-2.5 text-xs text-[#374151]">
                  <div className="font-bold text-[#111827] flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#7C2D48]" />
                    <span>Windows, Mac o Linux (Chrome / Edge)</span>
                  </div>
                  <ol className="space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      En la parte derecha de la barra de direcciones verás el icono de <strong>Instalar</strong> (pantalla con flecha hacia abajo).
                    </li>
                    <li>
                      También puedes ir al menú del navegador (<strong>⋮</strong> o <strong>···</strong>) → <strong>Guardar y compartir</strong> → <strong>Instalar WXDIV 3.0</strong>.
                    </li>
                    <li>
                      Se creará un acceso directo como aplicación de escritorio con ventana independiente.
                    </li>
                  </ol>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowGuide(false);
                  onActionComplete?.();
                }}
                className="w-full py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] hover:bg-slate-100 text-xs font-semibold text-[#111827] transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
