import { useCallback, useEffect, useRef, useState } from "react";

type CaptureState = "idle" | "listening" | "processing" | "ready" | "error";

interface SpeechCaptureResult {
  supported: boolean;
  state: CaptureState;
  transcript: string;
  errorMessage: string | null;
  startListening: () => void;
  stopListening: () => void;
  setProcessing: () => void;
  setReady: () => void;
  reset: () => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

function getRecognitionConstructor():
  | (new () => SpeechRecognitionLike)
  | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function useSpeechCapture(
  language: string,
  onTranscript: (transcript: string) => void
): SpeechCaptureResult {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const transcriptRef = useRef("");
  const shouldSubmitRef = useRef(false);
  const stateRef = useRef<CaptureState>("idle");
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<CaptureState>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => {
      transcriptRef.current = "";
      setTranscript("");
      setErrorMessage(null);
      setState("listening");
    };
    recognition.onresult = (event) => {
      let nextTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        nextTranscript += event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          transcriptRef.current = nextTranscript.trim();
        }
      }
      setTranscript(nextTranscript.trim());
    };
    recognition.onerror = (event) => {
      setState("error");
      setErrorMessage(
        event.error === "not-allowed"
          ? "Microphone access is blocked. Check your system permissions."
          : "Voice capture is unavailable right now."
      );
    };
    recognition.onend = () => {
      if (shouldSubmitRef.current && transcriptRef.current.trim().length > 0) {
        setState("processing");
        onTranscriptRef.current(transcriptRef.current.trim());
        return;
      }

      if (stateRef.current !== "error" && stateRef.current !== "ready") {
        setState("idle");
      }
    };

    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [language]);

  const startListening = useCallback((): void => {
    if (!recognitionRef.current) {
      setErrorMessage("Voice capture is not supported in this environment.");
      setState("error");
      return;
    }

    shouldSubmitRef.current = true;
    transcriptRef.current = "";
    setTranscript("");
    recognitionRef.current.start();
  }, []);

  const stopListening = useCallback((): void => {
    shouldSubmitRef.current = false;
    recognitionRef.current?.stop();
    setState("idle");
  }, []);

  const setProcessing = useCallback((): void => {
    setState("processing");
  }, []);

  const setReady = useCallback((): void => {
    setState("ready");
    window.setTimeout(() => {
      setState("idle");
    }, 1200);
  }, []);

  const reset = useCallback((): void => {
    transcriptRef.current = "";
    setTranscript("");
    setErrorMessage(null);
    shouldSubmitRef.current = false;
    setState("idle");
  }, []);

  return {
    supported,
    state,
    transcript,
    errorMessage,
    startListening,
    stopListening,
    setProcessing,
    setReady,
    reset
  };
}
