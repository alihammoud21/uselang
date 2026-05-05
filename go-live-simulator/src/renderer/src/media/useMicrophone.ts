import { useEffect, useRef, useState } from "react";

export function useMicrophone(enabled: boolean) {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [volumeScore, setVolumeScore] = useState(0);
  const [status, setStatus] = useState<"idle" | "pending" | "ready" | "blocked">("idle");

  useEffect(() => {
    if (!enabled) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close().catch(() => undefined);
      streamRef.current = null;
      audioContextRef.current = null;
      setVolumeScore(0);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let raf = 0;
    setStatus("pending");

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        setStatus("ready");

        const sample = () => {
          analyser.getByteFrequencyData(data);
          const average = data.reduce((sum, value) => sum + value, 0) / data.length;
          setVolumeScore(Math.min(100, average * 1.2));
          raf = requestAnimationFrame(sample);
        };
        sample();
      })
      .catch(() => setStatus("blocked"));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, [enabled]);

  return { volumeScore, status };
}
