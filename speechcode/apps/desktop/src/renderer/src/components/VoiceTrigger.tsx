interface VoiceTriggerProps {
  compact?: boolean;
}

export function VoiceTrigger({ compact = false }: VoiceTriggerProps) {
  return (
    <div className={compact ? "voice-trigger compact" : "voice-trigger"}>
      <div className="voice-core" aria-hidden="true">
        <span className="voice-ring voice-ring-one" />
        <span className="voice-ring voice-ring-two" />
        <span className="voice-mic">●</span>
      </div>
      <div className="voice-wave" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
