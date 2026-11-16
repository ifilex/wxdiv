import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceLang = "es-ES" | "es-MX" | "en-US";

export type VoiceCommandIntent =
  | { type: "run_game" }
  | { type: "stop_game" }
  | { type: "open_editor" }
  | { type: "switch_engine"; engine: "precode_neural" | "webllm" }
  | { type: "clear_input" }
  | { type: "ai_prompt"; prompt: string; runAfter?: boolean };

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function normalizeSpokenText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¡!¿?.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Interprets spoken dictation into direct IDE voice actions or a local AI prompt.
 */
export function parseVoiceCommandIntent(transcript: string): VoiceCommandIntent {
  const cleaned = transcript.trim();
  const norm = normalizeSpokenText(cleaned);

  if (!norm) {
    return { type: "ai_prompt", prompt: "" };
  }

  // Exact or near-exact control commands (kept concise so natural game prompts still go to AI)
  if (
    /^(ejecuta|ejecutar|corre|correr|inicia|iniciar|prueba|probar|dale play|play|arranca|arrancar)(\s+(el|la|este)?\s*(juego|programa|codigo|app|pantalla))?$/.test(
      norm
    )
  ) {
    return { type: "run_game" };
  }

  if (
    /^(deten|detener|para|parar|stop|pausa|pausar)(\s+(el|la)?\s*(juego|programa|ejecucion|app))?$/.test(
      norm
    )
  ) {
    return { type: "stop_game" };
  }

  if (
    /^(abre|abrir|muestra|mostrar|ver|ir al)\s+(el\s+)?(editor|codigo|codigo div)$/.test(norm)
  ) {
    return { type: "open_editor" };
  }

  if (
    /^(usa|usar|cambia|cambiar|activa|activar)\s+(el\s+)?(modo\s+)?(cpu|precode|precodigo|offline)$/.test(
      norm
    )
  ) {
    return { type: "switch_engine", engine: "precode_neural" };
  }

  if (
    /^(usa|usar|cambia|cambiar|activa|activar)\s+(el\s+)?(modo\s+)?(gpu|webgpu|webllm|local gpu)$/.test(
      norm
    )
  ) {
    return { type: "switch_engine", engine: "webllm" };
  }

  if (/^(borra|borrar|limpia|limpiar)\s*(el\s*)?(texto|prompt|entrada)?$/.test(norm)) {
    return { type: "clear_input" };
  }

  // Detect optional trailing "y pruébalo" / "y ejecútalo" on AI creation prompts
  const runSuffixMatch = cleaned.match(
    /^(.*?)(?:,?\s+y\s+(?:pru[eé]balo|ejec[uú]talo|c[oó]rrelo|ponlo a andar|pr[uú]ebalo ya))\s*[.!?]*$/i
  );
  if (runSuffixMatch && runSuffixMatch[1].trim().length >= 6) {
    return {
      type: "ai_prompt",
      prompt: runSuffixMatch[1].trim(),
      runAfter: true,
    };
  }

  return { type: "ai_prompt", prompt: cleaned };
}

function mapSpeechErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Permiso de micrófono denegado. Habilita el micrófono en la configuración del navegador.";
    case "no-speech":
      return "No detectamos voz. Acerca el micrófono e inténtalo de nuevo.";
    case "audio-capture":
      return "No se encontró ningún micrófono disponible en este dispositivo.";
    case "network":
      return "El dictado de voz del navegador requiere conexión o servicio de voz del sistema.";
    case "aborted":
      return "";
    default:
      return "No se pudo completar el dictado por voz. Intenta de nuevo.";
  }
}

export interface UseVoiceDictationOptions {
  defaultLang?: VoiceLang;
  onFinalTranscript?: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
}

export function useVoiceDictation(options: UseVoiceDictationOptions = {}) {
  const { defaultLang = "es-ES", onFinalTranscript, onInterimTranscript } = options;

  const isSupported = typeof window !== "undefined" && Boolean(getSpeechRecognitionCtor());
  const [lang, setLang] = useState<VoiceLang>(() => {
    try {
      const saved = localStorage.getItem("wxdiv_voice_lang") as VoiceLang | null;
      if (saved === "es-ES" || saved === "es-MX" || saved === "en-US") return saved;
      if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("es-mx")) {
        return "es-MX";
      }
      if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("en")) {
        return "en-US";
      }
    } catch {
      // ignore storage errors
    }
    return defaultLang;
  });

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const latestFinalRef = useRef<string>("");
  const latestInterimRef = useRef<string>("");
  const manualCancelRef = useRef<boolean>(false);
  const onFinalRef = useRef(onFinalTranscript);
  const onInterimRef = useRef(onInterimTranscript);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onInterimRef.current = onInterimTranscript;
  }, [onInterimTranscript]);

  const updateLang = useCallback((nextLang: VoiceLang) => {
    setLang(nextLang);
    try {
      localStorage.setItem("wxdiv_voice_lang", nextLang);
    } catch {
      // ignore
    }
  }, []);

  const stopListening = useCallback((cancelOnly: boolean = false) => {
    manualCancelRef.current = cancelOnly;
    const rec = recognitionRef.current;
    if (rec) {
      try {
        if (cancelOnly) {
          rec.abort();
        } else {
          rec.stop();
        }
      } catch {
        // ignore stop errors
      }
    }
    if (cancelOnly) {
      latestFinalRef.current = "";
      latestInterimRef.current = "";
      setInterimTranscript("");
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Tu navegador actual no soporta la API Web Speech para dictado por voz.");
      return;
    }

    // Stop any previous active session cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    setError(null);
    setInterimTranscript("");
    setFinalTranscript("");
    latestFinalRef.current = "";
    latestInterimRef.current = "";
    manualCancelRef.current = false;

    try {
      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        try {
          if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            navigator.vibrate(25);
          }
        } catch {
          // ignore
        }
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalChunk = "";
        let interimChunk = "";

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            finalChunk += (finalChunk ? " " : "") + text.trim();
          } else {
            interimChunk += (interimChunk ? " " : "") + text.trim();
          }
        }

        latestFinalRef.current = finalChunk.trim();
        latestInterimRef.current = interimChunk.trim();
        const combined = [latestFinalRef.current, latestInterimRef.current].filter(Boolean).join(" ");
        setFinalTranscript(latestFinalRef.current);
        setInterimTranscript(combined);
        onInterimRef.current?.(combined);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        const msg = mapSpeechErrorMessage(event.error);
        if (msg) {
          setError(msg);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;

        if (manualCancelRef.current) {
          manualCancelRef.current = false;
          return;
        }

        const captured = (latestFinalRef.current || latestInterimRef.current).trim();
        if (captured) {
          setFinalTranscript(captured);
          setInterimTranscript("");
          try {
            if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
              navigator.vibrate([15, 30, 15]);
            }
          } catch {
            // ignore
          }
          onFinalRef.current?.(captured);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setError("No se pudo iniciar el micrófono. Verifica los permisos del navegador.");
    }
  }, [lang]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening(false);
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    lang,
    setLang: updateLang,
    interimTranscript,
    finalTranscript,
    error,
    clearError: () => setError(null),
    startListening,
    stopListening,
    toggleListening,
  };
}
