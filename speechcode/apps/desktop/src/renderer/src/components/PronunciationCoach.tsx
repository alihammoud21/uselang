import React, { useState } from "react";

interface SoundLesson {
  language: string;
  sound: string;
  ipa: string;
  tonguePosition: string;
  lipShape: string;
  airflow: string;
  listenFor: string;
  avoid: string;
  drill: string[];
}

const SOUND_LIBRARY: SoundLesson[] = [
  {
    language: "French",
    sound: "R (uvular)",
    ipa: "/ʁ/",
    tonguePosition: "Back of the mouth, near the uvula. The tip of the tongue stays down behind the lower teeth.",
    lipShape: "Slightly open and relaxed. No rounding needed.",
    airflow: "Continuous voiced friction — air passes between the back of the tongue and the uvula.",
    listenFor: "A soft gargling or rasping quality, like clearing your throat gently.",
    avoid: "Do not roll from the tip of the tongue. That produces a Spanish R, not French.",
    drill: ["rouge", "rue", "Paris", "merci", "bonjour"],
  },
  {
    language: "French",
    sound: "Nasal vowel — AN/EN",
    ipa: "/ɑ̃/",
    tonguePosition: "Low and back, similar to an open A. The velum (soft palate) lowers to let air through the nose.",
    lipShape: "Open, slightly rounded.",
    airflow: "Simultaneous oral and nasal airflow. The sound resonates in the nasal cavity.",
    listenFor: "A warm, resonant quality — not a nasal twang, but a full nasal resonance.",
    avoid: "Do not close the vowel into an EN sound as in English 'end'. Keep it open.",
    drill: ["enfant", "blanc", "temps", "grand", "sans"],
  },
  {
    language: "Mandarin",
    sound: "Tone 1 — High Level",
    ipa: "ˉ (mā)",
    tonguePosition: "Neutral — tone is produced by larynx height, not tongue position.",
    lipShape: "Relaxed, follows the vowel.",
    airflow: "Steady, level. No rise or fall.",
    listenFor: "A sustained, flat pitch — like holding a musical note. Higher than your normal speaking pitch.",
    avoid: "Do not let the pitch drift down at the end. It must stay level.",
    drill: ["mā (mother)", "fēi (fly)", "shū (book)", "tā (he/she)"],
  },
  {
    language: "Mandarin",
    sound: "ZH initial",
    ipa: "/ʈʂ/",
    tonguePosition: "Tongue tip curls back and up to touch the area just behind the alveolar ridge (retroflex position).",
    lipShape: "Slightly rounded and protruded.",
    airflow: "Affricate — starts with a stop, releases into a fricative. Unaspirated.",
    listenFor: "Similar to English J in 'jump' but with the tongue curled further back.",
    avoid: "Do not use the English Z sound. The tongue must curl back.",
    drill: ["zhōng (middle)", "zhè (this)", "zhī (know)", "zhù (live)"],
  },
  {
    language: "Spanish",
    sound: "Tapped R (single)",
    ipa: "/ɾ/",
    tonguePosition: "Tongue tip makes a single, rapid tap against the alveolar ridge — the bumpy area just behind the upper front teeth.",
    lipShape: "Neutral.",
    airflow: "Brief interruption of airflow — a single tap, not a sustained vibration.",
    listenFor: "Similar to the D or T sound in American English 'butter' or 'water'.",
    avoid: "Do not trill. A single tap only. Trilling produces the RR sound.",
    drill: ["pero (but)", "caro (expensive)", "para (for)", "hora (hour)"],
  },
  {
    language: "Hindi",
    sound: "Retroflex T — ट",
    ipa: "/ʈ/",
    tonguePosition: "Tongue tip curls back and touches the roof of the mouth (hard palate), not the ridge behind the teeth.",
    lipShape: "Neutral.",
    airflow: "Unaspirated stop. No puff of air.",
    listenFor: "A deeper, more hollow quality than the dental T. The sound comes from further back.",
    avoid: "Do not use the English T (alveolar). The tongue must curl back.",
    drill: ["टमाटर (tomato)", "टोपी (hat)", "पटना (Patna)"],
  },
];

// Simple SVG mouth cross-section diagram
function MouthDiagram({ sound }: { sound: SoundLesson }) {
  const isRetroflex = sound.tonguePosition.toLowerCase().includes("curl") || sound.tonguePosition.toLowerCase().includes("retroflex");
  const isUvular = sound.tonguePosition.toLowerCase().includes("uvula");
  const isNasal = sound.airflow.toLowerCase().includes("nasal");

  return (
    <svg
      viewBox="0 0 200 160"
      width="200"
      height="160"
      style={{ display: "block" }}
    >
      {/* Outer head profile */}
      <path
        d="M 40 20 Q 60 10 100 12 Q 160 14 175 60 Q 185 100 170 140 Q 155 158 100 158 Q 60 158 40 140 Q 20 120 20 80 Q 20 40 40 20"
        fill="#F3EFE8"
        stroke="#E2DAD0"
        strokeWidth="1.5"
      />
      {/* Palate (roof of mouth) */}
      <path
        d="M 55 70 Q 80 55 120 58 Q 150 60 165 75"
        fill="none"
        stroke="#C9A97A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Alveolar ridge marker */}
      <circle cx="72" cy="66" r="3" fill="#C9A97A" opacity="0.6" />
      {/* Uvula */}
      <ellipse cx="148" cy="78" rx="5" ry="8" fill="#C9A97A" opacity="0.5" />
      {/* Tongue — position changes per sound */}
      <path
        d={
          isRetroflex
            ? "M 60 130 Q 80 120 95 100 Q 105 85 90 72 Q 78 65 70 68"
            : isUvular
            ? "M 60 130 Q 90 125 120 115 Q 145 105 148 88"
            : "M 60 130 Q 90 128 120 122 Q 145 118 155 110"
        }
        fill="none"
        stroke="#E8C14A"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Tongue tip highlight */}
      <circle
        cx={isRetroflex ? 72 : isUvular ? 148 : 155}
        cy={isRetroflex ? 68 : isUvular ? 90 : 110}
        r="5"
        fill="#E8C14A"
        opacity="0.8"
      />
      {/* Nasal passage indicator */}
      {isNasal && (
        <path
          d="M 100 30 Q 105 20 110 15"
          fill="none"
          stroke="#E8C14A"
          strokeWidth="2"
          strokeDasharray="3 2"
          opacity="0.7"
        />
      )}
      {/* Labels */}
      <text x="68" y="62" fontSize="8" fill="#A8A29E">ridge</text>
      <text x="140" y="76" fontSize="8" fill="#A8A29E">uvula</text>
      <text x="30" y="135" fontSize="8" fill="#A8A29E">tip</text>
    </svg>
  );
}

export function PronunciationCoach() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const sound = SOUND_LIBRARY[selectedIndex];

  const grouped: Record<string, SoundLesson[]> = {};
  SOUND_LIBRARY.forEach((s) => {
    if (!grouped[s.language]) grouped[s.language] = [];
    grouped[s.language].push(s);
  });

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: "#FAF8F5",
      }}
    >
      {/* Sound selector sidebar */}
      <div
        style={{
          width: 220,
          borderRight: "1px solid #E2DAD0",
          overflowY: "auto",
          padding: "20px 12px",
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#A8A29E",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 12,
            paddingLeft: 8,
          }}
        >
          Sounds
        </p>
        {Object.entries(grouped).map(([lang, sounds]) => (
          <div key={lang} style={{ marginBottom: 16 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#C9A97A",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                paddingLeft: 8,
                marginBottom: 4,
              }}
            >
              {lang}
            </p>
            {sounds.map((s) => {
              const idx = SOUND_LIBRARY.indexOf(s);
              const isActive = idx === selectedIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 8px",
                    borderRadius: 6,
                    border: "none",
                    background: isActive ? "rgba(232,193,74,0.18)" : "transparent",
                    color: isActive ? "#B88A0A" : "#57534E",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    marginBottom: 1,
                  }}
                >
                  {s.sound}
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      color: "#A8A29E",
                      fontStyle: "italic",
                    }}
                  >
                    {s.ipa}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Coach panel */}
      <div
        style={{
          flex: 1,
          padding: "32px 40px",
          overflowY: "auto",
          maxWidth: 680,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#C9A97A",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {sound.language}
          </span>
        </div>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#1C1917",
            letterSpacing: "-0.02em",
            marginBottom: 4,
          }}
        >
          {sound.sound}
        </h2>
        <p
          style={{
            fontSize: 18,
            color: "#B88A0A",
            fontStyle: "italic",
            marginBottom: 28,
          }}
        >
          {sound.ipa}
        </p>

        {/* Diagram */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 32,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              background: "#F3EFE8",
              borderRadius: 12,
              padding: 16,
              border: "1px solid #E2DAD0",
            }}
          >
            <MouthDiagram sound={sound} />
            <p
              style={{
                fontSize: 10,
                color: "#A8A29E",
                textAlign: "center",
                marginTop: 8,
                letterSpacing: "0.04em",
              }}
            >
              Gold = tongue position
            </p>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            {([
              ["Tongue", sound.tonguePosition],
              ["Lips", sound.lipShape],
              ["Airflow", sound.airflow],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#A8A29E",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </p>
                <p style={{ fontSize: 14, color: "#1C1917", lineHeight: 1.6 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Listen for / Avoid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              background: "rgba(232,193,74,0.08)",
              border: "1px solid rgba(232,193,74,0.25)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#B88A0A",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Listen for
            </p>
            <p style={{ fontSize: 13, color: "#1C1917", lineHeight: 1.6 }}>
              {sound.listenFor}
            </p>
          </div>
          <div
            style={{
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#DC2626",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Avoid
            </p>
            <p style={{ fontSize: 13, color: "#1C1917", lineHeight: 1.6 }}>
              {sound.avoid}
            </p>
          </div>
        </div>

        {/* Drill words */}
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#A8A29E",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Drill
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {sound.drill.map((word) => (
              <button
                key={word}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #E2DAD0",
                  background: "#F3EFE8",
                  color: "#1C1917",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                }}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
