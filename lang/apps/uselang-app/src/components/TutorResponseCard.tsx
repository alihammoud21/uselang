import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import type { TutorResponse } from "@/lib/tutor-api";

// ── Tutor response card ──────────────────────────────────────────────────────
// Displays the 5-field coach framework:
//   1. Natural phrase
//   2. Phonetic
//   3. Meaning / context
//   4. Pronunciation tip
//   5. Repeat prompt
// Plus: play, save, retry actions.
//
// Designed to feel lightweight and premium — not a wall of data.

interface Props {
  response: TutorResponse | null;
  loading?: boolean;
  isPlaying?: boolean;
  /** True when the audio + phrase is already cached locally (plays offline). */
  isDownloaded?: boolean;
  /** True when the user's own recorded attempt is saved and playable. */
  hasUserAudio?: boolean;
  isPlayingUserAudio?: boolean;
  onPlay?: () => void;
  onDownload?: () => void;
  onPlayUserAudio?: () => void;
  onExpand?: () => void;
  showExpandToggle?: boolean;
  expanded?: boolean;
}

export function TutorResponseCard({
  response,
  loading = false,
  isPlaying = false,
  isDownloaded = false,
  hasUserAudio = false,
  isPlayingUserAudio = false,
  onPlay,
  onDownload,
  onPlayUserAudio,
  onExpand,
  showExpandToggle = false,
  expanded = false,
}: Props) {
  if (loading && !response) {
    return (
      <View style={cardStyle}>
        <Label>Thinking…</Label>
        <Skeleton width="80%" />
        <Skeleton width="50%" marginTop={8} />
      </View>
    );
  }

  if (!response || !response.naturalPhrase) {
    return (
      <View style={cardStyle}>
        <Label>Ready</Label>
        <Text style={subtleText}>
          Tap the orb to start — speak a phrase, or ask how to say something.
          The tutor will reply, correct you, and keep the conversation going.
        </Text>
      </View>
    );
  }

  const hasCorrection = Boolean(response.correctionLine);
  const hasTip = Boolean(response.pronunciationTip);
  const hasContext = Boolean(response.context || response.literalMeaning);

  return (
    <View style={cardStyle}>
      {/* Role label */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Label>{hasCorrection ? "Coach" : response.localReply ? "Reply" : "Lang"}</Label>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {onPlay && (
            <IconButton
              icon={isPlaying ? "pause" : "volume-medium-outline"}
              onPress={onPlay}
              accent
              label="Play"
            />
          )}
          {onDownload && (
            <IconButton
              icon={isDownloaded ? "checkmark-circle" : "download-outline"}
              onPress={onDownload}
              label={isDownloaded ? "Downloaded" : "Download"}
              activeAccent={isDownloaded}
            />
          )}
          {showExpandToggle && onExpand && (
            <IconButton
              icon={expanded ? "chevron-up" : "chevron-down"}
              onPress={onExpand}
              label={expanded ? "Less" : "More"}
            />
          )}
        </View>
      </View>

      {/* Role reply (conversation mode) */}
      {response.localReply && (
        <Text style={{ fontSize: 15, fontStyle: "italic", color: COLORS.textSub, marginBottom: 14, lineHeight: 22 }}>
          “{response.localReply}”
        </Text>
      )}

      {/* (1) Natural phrase — the hero */}
      <Text style={phraseStyle}>{response.naturalPhrase}</Text>

      {/* (2) Phonetic */}
      {response.phonetic ? (
        <Text style={phoneticStyle}>{response.phonetic}</Text>
      ) : null}

      {/* (3) Meaning / context */}
      {hasContext && (
        <Text style={contextStyle}>
          {response.context || response.literalMeaning}
        </Text>
      )}

      {/* Correction (train mode) or (4) Tip */}
      {hasCorrection ? (
        <TipRow icon="alert-circle-outline" color={COLORS.danger} text={response.correctionLine} />
      ) : hasTip ? (
        <TipRow icon="sparkles-outline" color={COLORS.gold} text={response.pronunciationTip} />
      ) : null}

      {/* Expanded: articulation + homework */}
      {expanded && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: COLORS.borderLight }}>
          {response.articulation.tonguePlacement && (
            <ArticulationRow label="Tongue" value={response.articulation.tonguePlacement} />
          )}
          {response.articulation.lipShape && (
            <ArticulationRow label="Lips" value={response.articulation.lipShape} />
          )}
          {response.articulation.airflow && (
            <ArticulationRow label="Airflow" value={response.articulation.airflow} />
          )}
          {response.articulation.stress && (
            <ArticulationRow label="Stress" value={response.articulation.stress} />
          )}
          {response.homework.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Label>Homework</Label>
              {response.homework.map((h, i) => (
                <Text key={i} style={{ fontSize: 13, color: COLORS.textSub, lineHeight: 20 }}>
                  •  {h}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* (5) Repeat prompt */}
      {response.repeatPrompt && response.shouldRepeat ? (
        <Text style={repeatStyle}>
          {response.repeatPrompt}
        </Text>
      ) : null}

      {/* Offline-ready chip + user-voice compare pill */}
      {(isDownloaded || hasUserAudio) && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {isDownloaded && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
                backgroundColor: COLORS.goldLight,
              }}
            >
              <Ionicons name="cloud-done-outline" size={12} color={COLORS.gold} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.gold, letterSpacing: 0.3 }}>
                Saved · plays offline
              </Text>
            </View>
          )}
          {hasUserAudio && onPlayUserAudio ? (
            <Pressable
              onPress={onPlayUserAudio}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
                backgroundColor: COLORS.surface2,
                opacity: pressed ? 0.82 : 1,
              })}
            >
              <Ionicons
                name={isPlayingUserAudio ? "pause" : "mic-outline"}
                size={12}
                color={COLORS.text}
              />
              <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.text, letterSpacing: 0.3 }}>
                {isPlayingUserAudio ? "Playing your take" : "Hear your take"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 1 }}>
      {String(children).toUpperCase()}
    </Text>
  );
}

function Skeleton({ width, marginTop = 0 }: { width: number | string; marginTop?: number }) {
  return (
    <View
      style={{
        height: 16,
        borderRadius: 8,
        backgroundColor: COLORS.surface2,
        width: width as any,
        marginTop,
      }}
    />
  );
}

function IconButton({
  icon,
  onPress,
  accent,
  activeAccent,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  accent?: boolean;
  /** Highlight in gold when a latched-on state is true (e.g. downloaded). */
  activeAccent?: boolean;
  label?: string;
}) {
  const bg = accent ? COLORS.text : activeAccent ? COLORS.goldLight : COLORS.surface2;
  const fg = accent ? "#FFFFFF" : activeAccent ? COLORS.gold : COLORS.text;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={16} color={fg} />
    </Pressable>
  );
}

function TipRow({ icon, color, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; color: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 12 }}>
      <Ionicons name={icon} size={15} color={color} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

function ArticulationRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", marginTop: 6 }}>
      <Text style={{ width: 68, fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ flex: 1, fontSize: 13, color: COLORS.textSub, lineHeight: 19 }}>{value}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const cardStyle = {
  backgroundColor: COLORS.surface,
  borderRadius: 20,
  padding: 18,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 3,
} as const;

const phraseStyle = {
  fontSize: 22,
  fontWeight: "700" as const,
  color: COLORS.text,
  letterSpacing: -0.4,
  lineHeight: 28,
};

const phoneticStyle = {
  fontSize: 14,
  color: COLORS.gold,
  fontWeight: "600" as const,
  letterSpacing: 0.2,
  marginTop: 4,
};

const contextStyle = {
  fontSize: 13,
  color: COLORS.textSub,
  lineHeight: 19,
  marginTop: 10,
};

const repeatStyle = {
  fontSize: 13,
  fontWeight: "600" as const,
  color: COLORS.textMuted,
  marginTop: 14,
  letterSpacing: 0.2,
};

const subtleText = {
  fontSize: 14,
  color: COLORS.textMuted,
  lineHeight: 21,
  marginTop: 6,
};
