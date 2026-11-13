import { useState, useEffect, useCallback, useRef } from "react";

// =========================================================================
// 1. DICTADO POR MICRÓFONO (SPEECH-TO-TEXT)
// =========================================================================

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  resetTranscript: () => void;
  error: string | null;
}

export function useSpeechRecognition(
  onResult?: (finalText: string) => void
): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "es-ES";

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (finalChunk) {
          setTranscript((prev) => {
            const updated = prev ? `${prev} ${finalChunk}` : finalChunk;
            if (onResult) onResult(updated);
            return updated;
          });
          setInterimTranscript("");
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          setError(`Error de micrófono: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
    } catch (e: any) {
      setError(e?.message || "No se pudo inicializar el micrófono.");
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [onResult]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      setError(null);
      recognitionRef.current.start();
    } catch {
      // Si ya estaba escuchando
      try {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current?.start(), 100);
      } catch {
        // Ignore
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // Ignore
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    error,
  };
}

// =========================================================================
// 2. LECTURA DE CÓDIGO POR VOZ (TEXT-TO-SPEECH)
// =========================================================================

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  activeId: string | null;
  speak: (text: string, id?: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * Limpia código y caracteres técnicos para que la síntesis de voz suene
 * como una narración natural para programadores en español.
 */
function sanitizeTextForSpeech(text: string): string {
  return text
    // Reemplaza markdown asteriscos y almohadillas
    .replace(/[#*`_~]/g, " ")
    // Reemplaza operadores y llaves
    .replace(/\{|\}/g, "")
    .replace(/;/g, ". ")
    .replace(/==/g, " es igual a ")
    .replace(/!=/g, " es distinto de ")
    .replace(/<=/g, " menor o igual que ")
    .replace(/>=/g, " mayor o igual que ")
    .replace(/&&|AND/gi, " y ")
    .replace(/\|\||OR/gi, " o ")
    // Reemplaza nombres de directivas DIV habituales
    .replace(/PROCESS\s+([a-zA-Z0-9_]+)/gi, "Proceso $1: ")
    .replace(/PROGRAM\s+([a-zA-Z0-9_]+)/gi, "Programa $1: ")
    .replace(/GLOBAL/gi, "Variables globales: ")
    .replace(/LOOP/gi, "Bucle continuo: ")
    .replace(/FRAME/gi, "Pausa de cuadro de animación. ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setActiveId(null);
  }, []);

  const speak = useCallback(
    (rawText: string, id: string = "default") => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      // Si ya está reproduciendo el mismo elemento, detenerlo (toggle)
      if (isSpeaking && activeId === id) {
        stop();
        return;
      }

      window.speechSynthesis.cancel();

      const readableText = sanitizeTextForSpeech(rawText);
      if (!readableText) return;

      const utterance = new SpeechSynthesisUtterance(readableText);
      utterance.lang = "es-ES";
      utterance.rate = 1.05; // Ritmo cómodo y dinámico
      utterance.pitch = 1.0;

      // Buscar voz en español si está disponible
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(
        (v) => v.lang.startsWith("es") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Castilian") || v.name.includes("Mónica") || v.name.includes("Jorge"))
      ) || voices.find((v) => v.lang.startsWith("es"));

      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setActiveId(id);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setActiveId(null);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setActiveId(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSpeaking, activeId, stop]
  );

  const pause = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }, []);

  // Cancelar al desmontar
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isSupported,
    isSpeaking,
    activeId,
    speak,
    stop,
    pause,
    resume,
  };
}
