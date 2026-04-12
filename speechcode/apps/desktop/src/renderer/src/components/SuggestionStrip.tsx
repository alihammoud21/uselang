import type { PromptSuggestion } from "@speechcode/types";

interface SuggestionStripProps {
  suggestions: PromptSuggestion[];
  selectedEnhancements: string[];
  onToggle: (label: string) => void;
  onSkip: () => void;
  onApply: () => void;
}

export function SuggestionStrip({
  suggestions,
  selectedEnhancements,
  onToggle,
  onSkip,
  onApply
}: SuggestionStripProps) {
  return (
    <section className="suggestion-strip">
      <div>
        <p className="section-label">Optional ideas</p>
        <strong>Would you like to also add</strong>
      </div>
      <div className="suggestion-list">
        {suggestions.map((suggestion) => {
          const active = selectedEnhancements.includes(suggestion.label);
          return (
            <button
              key={suggestion.id}
              className={active ? "suggestion-chip active" : "suggestion-chip"}
              onClick={() => onToggle(suggestion.label)}
            >
              {suggestion.label}
            </button>
          );
        })}
      </div>
      <div className="button-row">
        <button className="secondary-button subtle" onClick={onSkip}>
          Skip
        </button>
        <button className="action-button" onClick={onApply}>
          Continue
        </button>
      </div>
    </section>
  );
}
