export type PlanTier = "free" | "pro";
export type FeatureKey =
  | "core_sessions"
  | "browser_adapter"
  | "cursor_adapter"
  | "advanced_enhancement"
  | "custom_presets";

export interface PlanState {
  tier: PlanTier;
  trialActive: boolean;
}

export const DEFAULT_PLAN_STATE: PlanState = {
  tier: "free",
  trialActive: false
};

const PRO_FEATURES = new Set<FeatureKey>(["advanced_enhancement", "custom_presets"]);

export function hasFeatureAccess(
  state: PlanState,
  feature: FeatureKey
): boolean {
  if (state.tier === "pro" || state.trialActive) {
    return true;
  }

  return !PRO_FEATURES.has(feature);
}
