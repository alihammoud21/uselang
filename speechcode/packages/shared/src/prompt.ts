import type { PreparedPrompt, PromptSuggestion, SpeechMode } from "@speechcode/types";

const FILLER_PATTERNS = [
  /\b(uh|um|like|you know|sort of|kind of)\b/gi,
  /^\s*(can you|could you|please|i need you to|i want you to)\s+/i,
  /\s+/g
];

const MODE_OPENERS: Record<SpeechMode, string> = {
  coding: "You are helping with a coding task.",
  writing: "You are helping with a writing task.",
  casual: "Respond in a clear, friendly way.",
  prompt: "Improve the following prompt while keeping the intent intact."
};

function normalize(rawInput: string): string {
  return FILLER_PATTERNS.reduce((value, pattern) => value.replace(pattern, " "), rawInput)
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

function toSentence(value: string): string {
  if (!value) {
    return "";
  }

  const sentence = value.charAt(0).toUpperCase() + value.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

export function inferActionLabel(cleanedInput: string): string {
  const lowered = cleanedInput.toLowerCase();

  if (lowered.includes("homepage")) {
    return "Creating homepage";
  }

  if (lowered.includes("pricing")) {
    return "Adding pricing section";
  }

  if (lowered.includes("landing page")) {
    return "Building landing page";
  }

  if (lowered.includes("dashboard")) {
    return "Updating dashboard";
  }

  if (lowered.includes("bug") || lowered.includes("fix")) {
    return "Fixing issue";
  }

  if (lowered.includes("write")) {
    return "Writing draft";
  }

  return "Preparing request";
}

function getSuggestions(cleanedInput: string): PromptSuggestion[] {
  const lowered = cleanedInput.toLowerCase();
  const suggestions: PromptSuggestion[] = [];

  if (lowered.includes("homepage") || lowered.includes("landing page")) {
    if (!lowered.includes("pricing")) {
      suggestions.push({
        id: "pricing",
        label: "Pricing section",
        description: "Add clear pricing tiers and plan copy."
      });
    }

    if (!lowered.includes("testimonial")) {
      suggestions.push({
        id: "testimonials",
        label: "Testimonials",
        description: "Add social proof from customers or users."
      });
    }

    if (!lowered.includes("modern") && !lowered.includes("styled")) {
      suggestions.push({
        id: "modern-ui",
        label: "Modern UI styling",
        description: "Push the visual direction toward a more polished interface."
      });
    }
  }

  return suggestions;
}

function applyEnhancements(cleanedInput: string, enhancements: string[]): string {
  if (!enhancements.length) {
    return cleanedInput;
  }

  const enhancementText = enhancements.join(", ");
  return `${cleanedInput} Also include: ${enhancementText}.`;
}

export function cleanPrompt(
  rawInput: string,
  mode: SpeechMode,
  enhancements: string[] = []
): PreparedPrompt {
  const normalized = toSentence(normalize(rawInput));
  const suggestions = getSuggestions(normalized);
  const enhancedRequest = applyEnhancements(normalized, enhancements);
  const cleanedPrompt = [
    MODE_OPENERS[mode],
    mode === "coding"
      ? "Deliver a practical result with clear implementation steps."
      : "Keep the response concise and useful.",
    `Request: ${enhancedRequest}`
  ].join("\n\n");

  return {
    rawInput,
    cleanedPrompt,
    mode,
    actionLabel: inferActionLabel(enhancedRequest),
    suggestions
  };
}
