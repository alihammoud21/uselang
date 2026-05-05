import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  onboarded: "lang:onboarded",
  knownLanguages: "lang:knownLanguages",
  learningLanguage: "lang:learningLanguage",
  userName: "lang:userName",
  commitment: "lang:commitment",
  tutorStyle: "lang:tutorStyle",
  scenario: "lang:scenario",
  goalPreset: "lang:goalPreset",
  trialStarted: "lang:trialStarted",
  trialStartDate: "lang:trialStartDate",
  preferOnDevice: "lang:preferOnDevice",
  pronouns: "lang:pronouns",
  accentDialect: "lang:accentDialect",
  tutorTone: "lang:tutorTone",
  voiceGender: "lang:voiceGender",
  adaptiveDifficulty: "lang:adaptiveDifficulty",
  homeCountry: "lang:homeCountry",
} as const;

// Simple getter/setter for the "force on-device tutor" preference — lives
// alongside the profile so settings can persist it across launches without
// bloating UserProfile.
export async function getPreferOnDevicePref(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEYS.preferOnDevice);
    return v === "true";
  } catch {
    return false;
  }
}
export async function setPreferOnDevicePref(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.preferOnDevice, value ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export type CommitmentLevel = "casual" | "regular" | "serious" | "intensive";
export type TutorStyle = "encouraging" | "direct" | "socratic" | "immersive";
export type TutorTone = "friendly" | "encouraging" | "formal";
export type VoiceGender = "female" | "male" | "auto";

// Goal presets — what the user picked from the onboarding step. The empty
// string means the user onboarded before this field existed or hasn't set a
// goal yet (falls back to `scenario` text matching in the curriculum picker).
export type GoalPreset =
  | ""
  | "travel"
  | "school"
  | "family"
  | "relocate"
  | "business"
  | "friends"
  | "pronunciation"
  | "test"
  | "shows"
  | "custom";

export interface UserProfile {
  onboarded: boolean;
  knownLanguages: string[];
  learningLanguage: string;
  userName: string;
  commitment: CommitmentLevel;
  tutorStyle: TutorStyle;
  scenario: string;
  goalPreset: GoalPreset;
  trialStarted: boolean;
  trialStartDate: string | null;
  pronouns: string;
  accentDialect: string;
  tutorTone: TutorTone;
  voiceGender: VoiceGender;
  adaptiveDifficulty: boolean;
  homeCountry: string;
}

const DEFAULT_PROFILE: UserProfile = {
  onboarded: false,
  knownLanguages: ["en"],
  learningLanguage: "",
  userName: "",
  commitment: "regular",
  tutorStyle: "encouraging",
  scenario: "introductions",
  goalPreset: "",
  trialStarted: false,
  trialStartDate: null,
  pronouns: "",
  accentDialect: "",
  tutorTone: "encouraging",
  voiceGender: "auto",
  adaptiveDifficulty: true,
  homeCountry: "",
};

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const keys = Object.values(KEYS);
    const results = await AsyncStorage.multiGet(keys);
    const map: Record<string, string | null> = {};
    results.forEach(([k, v]) => { map[k] = v; });
    return {
      onboarded: map[KEYS.onboarded] === "true",
      knownLanguages: map[KEYS.knownLanguages] ? JSON.parse(map[KEYS.knownLanguages]!) : DEFAULT_PROFILE.knownLanguages,
      learningLanguage: map[KEYS.learningLanguage] || DEFAULT_PROFILE.learningLanguage,
      userName: map[KEYS.userName] || DEFAULT_PROFILE.userName,
      commitment: (map[KEYS.commitment] as CommitmentLevel) || DEFAULT_PROFILE.commitment,
      tutorStyle: (map[KEYS.tutorStyle] as TutorStyle) || DEFAULT_PROFILE.tutorStyle,
      scenario: map[KEYS.scenario] || DEFAULT_PROFILE.scenario,
      goalPreset: (map[KEYS.goalPreset] as GoalPreset) || DEFAULT_PROFILE.goalPreset,
      trialStarted: map[KEYS.trialStarted] === "true",
      trialStartDate: map[KEYS.trialStartDate] || null,
      pronouns: map[KEYS.pronouns] || DEFAULT_PROFILE.pronouns,
      accentDialect: map[KEYS.accentDialect] || DEFAULT_PROFILE.accentDialect,
      tutorTone: (map[KEYS.tutorTone] as TutorTone) || DEFAULT_PROFILE.tutorTone,
      voiceGender: (map[KEYS.voiceGender] as VoiceGender) || DEFAULT_PROFILE.voiceGender,
      adaptiveDifficulty: map[KEYS.adaptiveDifficulty] !== null ? map[KEYS.adaptiveDifficulty] !== "false" : DEFAULT_PROFILE.adaptiveDifficulty,
      homeCountry: map[KEYS.homeCountry] || DEFAULT_PROFILE.homeCountry,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function setUserProfile(profile: Partial<UserProfile>): Promise<void> {
  const pairs: [string, string][] = [];
  if (profile.onboarded !== undefined) pairs.push([KEYS.onboarded, String(profile.onboarded)]);
  if (profile.knownLanguages) pairs.push([KEYS.knownLanguages, JSON.stringify(profile.knownLanguages)]);
  if (profile.learningLanguage !== undefined) pairs.push([KEYS.learningLanguage, profile.learningLanguage]);
  if (profile.userName !== undefined) pairs.push([KEYS.userName, profile.userName]);
  if (profile.commitment) pairs.push([KEYS.commitment, profile.commitment]);
  if (profile.tutorStyle) pairs.push([KEYS.tutorStyle, profile.tutorStyle]);
  if (profile.scenario) pairs.push([KEYS.scenario, profile.scenario]);
  if (profile.goalPreset !== undefined) pairs.push([KEYS.goalPreset, profile.goalPreset]);
  if (profile.trialStarted !== undefined) pairs.push([KEYS.trialStarted, String(profile.trialStarted)]);
  if (profile.trialStartDate !== undefined && profile.trialStartDate !== null) {
    pairs.push([KEYS.trialStartDate, profile.trialStartDate]);
  }
  if (profile.pronouns !== undefined) pairs.push([KEYS.pronouns, profile.pronouns]);
  if (profile.accentDialect !== undefined) pairs.push([KEYS.accentDialect, profile.accentDialect]);
  if (profile.tutorTone) pairs.push([KEYS.tutorTone, profile.tutorTone]);
  if (profile.voiceGender) pairs.push([KEYS.voiceGender, profile.voiceGender]);
  if (profile.adaptiveDifficulty !== undefined) pairs.push([KEYS.adaptiveDifficulty, String(profile.adaptiveDifficulty)]);
  if (profile.homeCountry !== undefined) pairs.push([KEYS.homeCountry, profile.homeCountry]);
  if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
}

export async function clearUserProfile(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
