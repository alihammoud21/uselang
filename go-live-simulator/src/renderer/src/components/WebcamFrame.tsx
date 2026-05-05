import type { CSSProperties, RefObject } from "react";
import { ShieldCheck } from "lucide-react";
import type { GameItem, PlatformConfig } from "../game/types";

export function WebcamFrame({
  videoRef,
  cameraEnabled,
  overlay,
  platform,
  motionScore,
  micScore
}: {
  videoRef: RefObject<HTMLVideoElement>;
  cameraEnabled: boolean;
  overlay?: GameItem;
  platform: PlatformConfig;
  motionScore: number;
  micScore: number;
}) {
  return (
    <div className={`webcam-frame overlay-${overlay?.id ?? "none"}`} style={{ "--platform": platform.accent } as CSSProperties}>
      <div className="webcam-topbar">
        <span>{platform.name} Regular Stream</span>
        <strong>LOCAL CAMERA</strong>
      </div>
      {cameraEnabled ? <video ref={videoRef} muted playsInline className="webcam-video" /> : null}
      {!cameraEnabled ? (
        <div className="webcam-placeholder">
          <ShieldCheck size={42} />
          <strong>Camera Off</strong>
          <span>Play with buttons only. Nothing is streamed, recorded, uploaded, or sent online.</span>
        </div>
      ) : null}
      <div className="overlay-badge">{overlay?.name ?? "Clean Default Frame"}</div>
      <div className="signal-strip">
        <span>Motion {Math.round(motionScore)}</span>
        <span>Mic {Math.round(micScore)}</span>
      </div>
    </div>
  );
}
