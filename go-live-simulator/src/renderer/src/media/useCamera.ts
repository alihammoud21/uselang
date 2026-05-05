import { useCallback, useEffect, useRef, useState } from "react";

export function useCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previousFrame = useRef<ImageData | null>(null);
  const [motionScore, setMotionScore] = useState(0);
  const [status, setStatus] = useState<"idle" | "pending" | "ready" | "blocked">("idle");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    previousFrame.current = null;
    setMotionScore(0);
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }

    let cancelled = false;
    setStatus("pending");
    navigator.mediaDevices
      .getUserMedia({ video: { width: 960, height: 540 }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        setStatus("ready");
      })
      .catch(() => setStatus("blocked"));

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, stop]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 45;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let frame = 0;

    const sample = () => {
      if (!context || !videoRef.current || videoRef.current.readyState < 2) {
        frame = requestAnimationFrame(sample);
        return;
      }
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const current = context.getImageData(0, 0, canvas.width, canvas.height);
      const previous = previousFrame.current;
      previousFrame.current = current;
      if (previous) {
        let diff = 0;
        for (let index = 0; index < current.data.length; index += 16) {
          diff += Math.abs(current.data[index] - previous.data[index]);
        }
        setMotionScore(Math.min(100, diff / 120));
      }
      frame = requestAnimationFrame(sample);
    };

    frame = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  return { videoRef, motionScore, status, stop };
}
