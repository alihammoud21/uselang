import React from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const colors = {
  bg: "#F7F7F5",
  surface: "#FFFFFF",
  surfaceSoft: "#F1F4FA",
  text: "#111110",
  subtext: "#6F767E",
  border: "rgba(17, 17, 16, 0.08)",
  blue: "#2E6BD8",
  blueSoft: "#EAF2FF",
  greenSoft: "#E9F9EF",
  goldSoft: "#FFF4DF",
  shadow: "rgba(28, 45, 84, 0.12)",
} as const;

const sceneStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  padding: "110px 64px 84px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const phoneShellStyle: React.CSSProperties = {
  width: 570,
  height: 1180,
  borderRadius: 84,
  background: "#0F1115",
  padding: 18,
  boxShadow: `0 50px 120px ${colors.shadow}`,
  position: "relative",
  overflow: "hidden",
};

const phoneScreenStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: 68,
  overflow: "hidden",
  background: colors.bg,
  position: "relative",
};

const cardStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  boxShadow: "0 24px 60px rgba(26, 44, 81, 0.08)",
};

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

const fadeUp = (frame: number, start: number, duration: number, distance = 40) => {
  const opacity = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const translateY = interpolate(frame, [start, start + duration], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return {opacity, transform: `translateY(${translateY}px)`};
};

const springIn = (frame: number, fps: number, delay = 0) =>
  spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {
      damping: 14,
      stiffness: 120,
      mass: 0.8,
    },
  });

const SceneTitle = ({
  kicker,
  title,
  body,
  frame,
}: {
  kicker: string;
  title: string;
  body: string;
  frame: number;
}) => {
  return (
    <div style={{display: "flex", flexDirection: "column", gap: 16, maxWidth: 760}}>
      <div
        style={{
          ...fadeUp(frame, 0, 10, 18),
          color: colors.blue,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          ...fadeUp(frame, 3, 12, 26),
          color: colors.text,
          fontSize: 88,
          lineHeight: 1,
          fontWeight: 700,
          whiteSpace: "pre-line",
        }}
      >
        {title}
      </div>
      <div
        style={{
          ...fadeUp(frame, 6, 12, 28),
          color: colors.subtext,
          fontSize: 34,
          lineHeight: 1.25,
          maxWidth: 710,
        }}
      >
        {body}
      </div>
    </div>
  );
};

const Orb = ({frame, size = 280}: {frame: number; size?: number}) => {
  const floatY = Math.sin(frame / 18) * 18;
  const pulse = 1 + Math.sin(frame / 10) * 0.025;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 30% 28%, #fffef7 0%, #f4f0c8 22%, #8fd4e8 48%, #1c7fe8 82%)",
        boxShadow: "0 0 0 28px rgba(120,190,255,0.10), 0 36px 90px rgba(38,122,222,0.28)",
        transform: `translateY(${floatY}px) scale(${pulse})`,
      }}
    />
  );
};

const PhoneFrame = ({children, style}: {children: React.ReactNode; style?: React.CSSProperties}) => (
  <div style={{...phoneShellStyle, ...style}}>
    <div
      style={{
        position: "absolute",
        top: 18,
        left: "50%",
        width: 180,
        height: 36,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        background: "#0B0C10",
        transform: "translateX(-50%)",
        zIndex: 3,
      }}
    />
    <div style={phoneScreenStyle}>{children}</div>
  </div>
);

const TopStatus = ({label = "9:41"}: {label?: string}) => (
  <div
    style={{
      position: "absolute",
      top: 28,
      left: 34,
      right: 34,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 20,
      fontWeight: 700,
      color: colors.text,
      zIndex: 2,
    }}
  >
    <span>{label}</span>
    <div style={{display: "flex", gap: 10, alignItems: "center"}}>
      <div style={{width: 18, height: 12, borderRadius: 99, border: "2px solid #111110"}} />
      <div style={{width: 22, height: 12, borderRadius: 99, background: "#111110"}} />
    </div>
  </div>
);

const Pill = ({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "gold" | "green" | "neutral";
}) => {
  const palette =
    tone === "gold"
      ? {bg: colors.goldSoft, fg: "#7C550C"}
      : tone === "green"
        ? {bg: colors.greenSoft, fg: "#177A42"}
        : tone === "neutral"
          ? {bg: "#F1F2F4", fg: "#4F5760"}
          : {bg: colors.blueSoft, fg: colors.blue};

  return (
    <div
      style={{
        padding: "12px 18px",
        borderRadius: 999,
        background: palette.bg,
        color: palette.fg,
        fontSize: 22,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
};

const VoiceScene = ({localFrame}: {localFrame: number}) => {
  const {fps} = useVideoConfig();
  const phoneScale = 0.92 + springIn(localFrame, fps, 2) * 0.08;
  const orbScale = 0.96 + Math.sin(localFrame / 12) * 0.03;
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <div style={sceneStyle}>
        <SceneTitle
          kicker="Voice tutor"
          title={"Learn by speaking."}
          body={"Live conversation practice with a voice-first AI tutor that keeps the lesson moving."}
          frame={localFrame}
        />

        <div style={{display: "flex", justifyContent: "center", alignItems: "center", paddingBottom: 120}}>
          <PhoneFrame
            style={{
              transform: `scale(${phoneScale}) rotate(-5deg)`,
            }}
          >
            <TopStatus />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, #111419 0%, #0C1117 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "128px 42px 64px",
                color: "#FFFFFF",
              }}
            >
              <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 18}}>
                <Pill label="Tutor mode" />
                <div style={{fontSize: 24, color: "rgba(255,255,255,0.66)"}}>French • Everyday conversation</div>
              </div>

              <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
                <div style={{transform: `scale(${orbScale})`}}>
                  <Orb frame={localFrame} size={310} />
                </div>
                <div style={{marginTop: 48, fontSize: 34, fontWeight: 700}}>Lang is listening…</div>
                <div style={{display: "flex", gap: 10, marginTop: 26}}>
                  {new Array(14).fill(true).map((_, i) => {
                    const h = 18 + ((Math.sin(localFrame / 4 + i) + 1) / 2) * 54;
                    return (
                      <div
                        key={i}
                        style={{
                          width: 8,
                          height: h,
                          borderRadius: 99,
                          background: "rgba(150,205,255,0.92)",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  width: "100%",
                  borderRadius: 34,
                  padding: "26px 28px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                <div style={{fontSize: 18, textTransform: "uppercase", letterSpacing: 1.6, opacity: 0.6}}>
                  Prompt
                </div>
                <div style={{fontSize: 28, lineHeight: 1.3, marginTop: 10}}>
                  Ask for a table, then answer one follow-up question naturally.
                </div>
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PronunciationScene = ({localFrame}: {localFrame: number}) => {
  const cardIn = fadeUp(localFrame, 5, 14, 50);
  return (
    <AbsoluteFill style={{background: "linear-gradient(180deg, #F7F7F5 0%, #EDF4FE 100%)"}}>
      <div style={sceneStyle}>
        <SceneTitle
          kicker="Pronunciation"
          title={"Fix the sound,\nnot just the sentence."}
          body={"See what to change with targeted mouth and tongue placement coaching after every reply."}
          frame={localFrame}
        />
        <div style={{display: "flex", justifyContent: "center", paddingBottom: 100}}>
          <div
            style={{
              ...phoneShellStyle,
              width: 640,
              height: 1060,
              transform: `translateY(${interpolate(localFrame, [0, 24], [80, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            <div style={{...phoneScreenStyle, background: colors.bg}}>
              <TopStatus />
              <div style={{padding: "122px 32px 34px", display: "flex", flexDirection: "column", gap: 22}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <div>
                    <div style={{fontSize: 22, color: colors.subtext}}>Quick feedback</div>
                    <div style={{fontSize: 54, fontWeight: 700, color: colors.text, lineHeight: 1.02}}>
                      Rolling your R
                    </div>
                  </div>
                  <Pill label="82/100" tone="green" />
                </div>

                <div
                  style={{
                    ...cardStyle,
                    borderRadius: 34,
                    padding: 30,
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    ...cardIn,
                  }}
                >
                  <div style={{fontSize: 22, color: colors.subtext, textTransform: "uppercase", letterSpacing: 1.3}}>
                    Tutor feedback
                  </div>
                  <div style={{fontSize: 34, fontWeight: 700, color: colors.text, lineHeight: 1.2}}>
                    Great rhythm. Relax the tongue tip and let it tap once.
                  </div>
                  <div style={{display: "flex", gap: 14}}>
                    <Pill label="tongue placement" tone="blue" />
                    <Pill label="repeat once" tone="gold" />
                  </div>
                </div>

                <div
                  style={{
                    ...cardStyle,
                    borderRadius: 40,
                    padding: 24,
                    height: 500,
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                  }}
                >
                  <div style={{fontSize: 24, color: colors.subtext}}>Tongue placement</div>
                  <div
                    style={{
                      flex: 1,
                      borderRadius: 30,
                      background:
                        "radial-gradient(circle at 50% 42%, #ffffff 0%, #f6f0ea 55%, #f0d8c7 100%)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: "18% 14% 18% 14%",
                        borderRadius: "48% 52% 52% 48% / 45% 46% 54% 55%",
                        background: "linear-gradient(180deg, #f6d1bf 0%, #f0b89d 100%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "28%",
                        right: "28%",
                        bottom: "22%",
                        height: "27%",
                        borderRadius: "50% 50% 44% 44%",
                        background: "linear-gradient(180deg, #ff8ca0 0%, #ef6d88 100%)",
                        transform: `rotate(${Math.sin(localFrame / 16) * 2}deg)`,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "22%",
                        width: 12,
                        height: 220,
                        background: "rgba(46,107,216,0.26)",
                        borderRadius: 99,
                        transform: "translateX(-50%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "46%",
                        top: "17%",
                        width: 72,
                        height: 72,
                        borderRadius: 999,
                        background: colors.blue,
                        transform: `translateX(-50%) translateY(${Math.sin(localFrame / 14) * 8}px)`,
                        boxShadow: "0 20px 30px rgba(46,107,216,0.24)",
                      }}
                    />
                  </div>
                  <div style={{fontSize: 28, color: colors.subtext, lineHeight: 1.3}}>
                    Lift the tip toward the ridge. Keep the jaw loose.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const OfflineScene = ({localFrame}: {localFrame: number}) => {
  const chipOffset = interpolate(localFrame, [0, 22], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <div style={sceneStyle}>
        <SceneTitle
          kicker="On-device AI"
          title={"Keep practicing\neven offline."}
          body={"Lang falls back to device-native coaching, saved phrases, and playback when the network drops."}
          frame={localFrame}
        />

        <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 28, paddingBottom: 70}}>
          <div
            style={{
              width: 382,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              transform: `translateY(${chipOffset}px)`,
            }}
          >
            <div style={{...cardStyle, borderRadius: 34, padding: 26}}>
              <Pill label="Offline ready" tone="green" />
              <div style={{fontSize: 48, lineHeight: 1.02, fontWeight: 700, color: colors.text, marginTop: 18}}>
                On-device Gemma
              </div>
              <div style={{fontSize: 28, lineHeight: 1.3, color: colors.subtext, marginTop: 14}}>
                Keep the lesson going with private, local tutoring when cloud access is unavailable.
              </div>
            </div>
            <div style={{...cardStyle, borderRadius: 34, padding: 26}}>
              <div style={{fontSize: 22, textTransform: "uppercase", letterSpacing: 1.4, color: colors.subtext}}>
                Saved phrase library
              </div>
              <div style={{display: "flex", flexDirection: "column", gap: 14, marginTop: 18}}>
                {[
                  ["Je voudrais un cafe.", "I’d like a coffee."],
                  ["Ou est la gare ?", "Where is the station?"],
                  ["Parlez plus lentement.", "Please speak more slowly."],
                ].map(([phrase, meaning]) => (
                  <div
                    key={phrase}
                    style={{
                      padding: "18px 18px 20px",
                      borderRadius: 24,
                      background: colors.surfaceSoft,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{fontSize: 28, fontWeight: 700, color: colors.text}}>{phrase}</div>
                    <div style={{fontSize: 22, color: colors.subtext, marginTop: 8}}>{meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <PhoneFrame style={{transform: `scale(${0.96 + springIn(localFrame, 30, 6) * 0.04}) rotate(4deg)`}}>
            <TopStatus />
            <div style={{padding: "120px 30px 36px", display: "flex", flexDirection: "column", gap: 24}}>
              <div
                style={{
                  ...cardStyle,
                  borderRadius: 34,
                  padding: 24,
                  background: "#0F172A",
                  color: "#FFFFFF",
                  border: "none",
                }}
              >
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <div style={{fontSize: 36, fontWeight: 700}}>Tutor degraded</div>
                  <Pill label="offline" tone="gold" />
                </div>
                <div style={{fontSize: 25, lineHeight: 1.35, marginTop: 16, color: "rgba(255,255,255,0.72)"}}>
                  Live cloud coaching is unavailable. Switch to on-device practice and keep speaking.
                </div>
              </div>
              <div
                style={{
                  ...cardStyle,
                  borderRadius: 34,
                  padding: 26,
                  height: 720,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                <div style={{fontSize: 22, color: colors.subtext}}>Library</div>
                {[
                  "Use the bookmark on any tutor reply",
                  "Replay your attempt",
                  "Review mouth placement later",
                  "Take phrases on the move",
                ].map((line, i) => (
                  <div
                    key={line}
                    style={{
                      padding: "22px 18px",
                      borderRadius: 24,
                      background: i === 0 ? colors.blueSoft : "#F7F8FA",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        background: i === 0 ? colors.blue : "#BFC6CF",
                      }}
                    />
                    <div style={{fontSize: 27, color: colors.text, fontWeight: 600}}>{line}</div>
                  </div>
                ))}
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PlanProgressScene = ({localFrame}: {localFrame: number}) => {
  const {fps} = useVideoConfig();
  const lift = interpolate(localFrame, [0, 18], [55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const planProgress = interpolate(localFrame, [6, 52], [0.15, 0.64], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const confidenceProgress = interpolate(localFrame, [10, 58], [0.38, 0.82], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = 0.93 + springIn(localFrame, fps, 2) * 0.07;

  return (
    <AbsoluteFill style={{background: "linear-gradient(180deg, #F7F7F5 0%, #FDFDFC 100%)"}}>
      <div style={sceneStyle}>
        <SceneTitle
          kicker="Momentum"
          title={"Follow a plan.\nSee real progress."}
          body={"Structured lessons, daily practice, confidence tracking, and usage visibility keep the habit alive."}
          frame={localFrame}
        />
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: 28, paddingBottom: 84}}>
          <PhoneFrame style={{transform: `translateY(${lift}px) scale(${scale}) rotate(-4deg)`}}>
            <TopStatus />
            <div style={{padding: "122px 32px 36px", display: "flex", flexDirection: "column", gap: 18}}>
              <div style={{fontSize: 21, color: colors.subtext, letterSpacing: 1.3, textTransform: "uppercase"}}>
                Your plan
              </div>
              <div style={{fontSize: 52, fontWeight: 700, lineHeight: 1.04, color: colors.text}}>
                Pronunciation • French
              </div>
              <div style={{height: 10, borderRadius: 999, background: "#E8EAF0", overflow: "hidden"}}>
                <div
                  style={{
                    width: `${Math.round(planProgress * 100)}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: colors.blue,
                  }}
                />
              </div>
              {[
                ["Vowels you know but dont", "done"],
                ["Rolling vs tapping", "current"],
                ["Stress and melody", "next"],
                ["Shadowing in motion", "locked"],
              ].map(([label, state], i) => (
                <div
                  key={label}
                  style={{
                    ...cardStyle,
                    borderRadius: 28,
                    padding: "24px 22px",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    background: state === "current" ? "#FFFBEF" : colors.surface,
                    borderColor: state === "current" ? "#F5C67A" : colors.border,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 999,
                      background:
                        state === "done"
                          ? colors.greenSoft
                          : state === "current"
                            ? colors.goldSoft
                            : "#F2F4F7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      fontWeight: 700,
                      color:
                        state === "done"
                          ? "#177A42"
                          : state === "current"
                            ? "#8A5A07"
                            : "#78808A",
                    }}
                  >
                    {state === "done" ? "✓" : i + 2}
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: 28, fontWeight: 700, color: colors.text}}>{label}</div>
                    <div style={{fontSize: 22, color: colors.subtext, marginTop: 8}}>
                      {state === "current"
                        ? "Live now"
                        : state === "done"
                          ? "Completed"
                          : state === "next"
                            ? "Up next"
                            : "Locked"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PhoneFrame>

          <div style={{display: "flex", flexDirection: "column", gap: 20, width: 250}}>
            <div style={{...cardStyle, borderRadius: 28, padding: 24}}>
              <div style={{fontSize: 20, color: colors.subtext, textTransform: "uppercase", letterSpacing: 1.4}}>
                Streak
              </div>
              <div style={{fontSize: 66, fontWeight: 700, color: colors.text, lineHeight: 1}}>12</div>
              <div style={{fontSize: 24, color: colors.subtext}}>days</div>
            </div>
            <div style={{...cardStyle, borderRadius: 28, padding: 24}}>
              <div style={{fontSize: 20, color: colors.subtext, textTransform: "uppercase", letterSpacing: 1.4}}>
                Confidence
              </div>
              <div style={{fontSize: 66, fontWeight: 700, color: colors.text, lineHeight: 1}}>
                {Math.round(confidenceProgress * 100)}
              </div>
              <div style={{fontSize: 24, color: colors.subtext}}>/100 fluent</div>
            </div>
            <div style={{...cardStyle, borderRadius: 28, padding: 24}}>
              <div style={{fontSize: 20, color: colors.subtext, textTransform: "uppercase", letterSpacing: 1.4}}>
                Today
              </div>
              <div style={{fontSize: 66, fontWeight: 700, color: colors.text, lineHeight: 1}}>42</div>
              <div style={{fontSize: 24, color: colors.subtext}}>minutes left</div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FinaleScene = ({localFrame, title}: {localFrame: number; title: string}) => {
  const orbScale = 0.92 + springIn(localFrame, 30, 0) * 0.08;
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 24%, #ffffff 0%, #eff5ff 28%, #dceaff 48%, #f7f7f5 75%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 74px",
        }}
      >
        <div style={{transform: `scale(${orbScale})`}}>
          <Orb frame={localFrame} size={240} />
        </div>
        <div
          style={{
            ...fadeUp(localFrame, 4, 14, 24),
            fontSize: 104,
            fontWeight: 700,
            color: colors.text,
            lineHeight: 1,
            marginTop: 46,
          }}
        >
          {title}
        </div>
        <div
          style={{
            ...fadeUp(localFrame, 8, 14, 32),
            fontSize: 44,
            color: colors.subtext,
            lineHeight: 1.24,
            marginTop: 20,
            maxWidth: 650,
          }}
        >
          Speak your next language naturally.
        </div>
        <div
          style={{
            ...fadeUp(localFrame, 12, 14, 36),
            marginTop: 40,
          }}
        >
          <Pill label="Voice-first language practice" tone="blue" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const LangLaunchVideo = ({title = "Lang"}: {title?: string}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{fontFamily: "Inter, SF Pro Display, system-ui, sans-serif"}}>
      <Sequence from={0} durationInFrames={150}>
        <VoiceScene localFrame={frame} />
      </Sequence>
      <Sequence from={150} durationInFrames={170}>
        <PronunciationScene localFrame={frame - 150} />
      </Sequence>
      <Sequence from={320} durationInFrames={180}>
        <OfflineScene localFrame={frame - 320} />
      </Sequence>
      <Sequence from={500} durationInFrames={140}>
        <PlanProgressScene localFrame={frame - 500} />
      </Sequence>
      <Sequence from={640} durationInFrames={80}>
        <FinaleScene localFrame={frame - 640} title={title} />
      </Sequence>
    </AbsoluteFill>
  );
};
