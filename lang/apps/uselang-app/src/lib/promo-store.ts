// ── Promo code redemption ────────────────────────────────────────────────────
// Lightweight offline-first promo engine. Codes are hardcoded (they'd be
// server-side in prod) but the shape allows swapping in a real endpoint
// later without touching the UI. Every redemption is idempotent — a code
// can only be used once per device.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { addBonusSeconds, setUsagePlan } from "./usage-store";

// ── Types ────────────────────────────────────────────────────────────────────

export type PromoKind =
  | "bonus-minutes"    // Adds minutes to today's quota
  | "trial-days"       // Starts a time-bound trial plan
  | "pro-days"         // Unlocks pro for N days
  | "pro-forever";     // Permanent pro (dev / founder codes)

export interface PromoGrant {
  kind: PromoKind;
  minutes?: number;      // for bonus-minutes
  days?: number;         // for trial-days / pro-days
  label: string;         // human-readable description shown on success
}

export interface PromoRedemption {
  code: string;
  grant: PromoGrant;
  redeemedAt: number;
}

// ── Built-in codes ───────────────────────────────────────────────────────────
// These are case-insensitive. Mix of "evergreen" codes and event codes.
// Easy to seed for testers without touching the UI.

const BUILTIN_PROMOS: Record<string, PromoGrant> = {
  LANGWELCOME: {
    kind: "bonus-minutes",
    minutes: 15,
    label: "+15 bonus minutes for today.",
  },
  LANG30: {
    kind: "bonus-minutes",
    minutes: 30,
    label: "+30 bonus minutes today.",
  },
  TRIAL7: {
    kind: "trial-days",
    days: 7,
    label: "7-day trial unlocked — 45 min/day.",
  },
  PRO30: {
    kind: "pro-days",
    days: 30,
    label: "30 days of Pro unlocked. Enjoy unlimited tutor time.",
  },
  FOUNDER: {
    kind: "pro-forever",
    label: "Founder pass — Pro unlocked forever.",
  },
  CHINA: {
    // Extra minutes for folks testing from behind the Great Firewall.
    kind: "bonus-minutes",
    minutes: 60,
    label: "+60 minutes today. 加油!",
  },
};

// ── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  redeemed: "lang:promo:redeemed",
} as const;

async function readRedeemed(): Promise<PromoRedemption[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.redeemed);
    return raw ? (JSON.parse(raw) as PromoRedemption[]) : [];
  } catch {
    return [];
  }
}

async function writeRedeemed(next: PromoRedemption[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.redeemed, JSON.stringify(next.slice(0, 100)));
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function listRedeemedPromos(): Promise<PromoRedemption[]> {
  return readRedeemed();
}

/**
 * Redeem a promo code. Returns the grant applied on success. Throws a
 * human-readable Error on failure (unknown / already redeemed).
 */
export async function redeemPromo(rawCode: string): Promise<PromoGrant> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error("Enter a code.");

  const grant = BUILTIN_PROMOS[code];
  if (!grant) {
    throw new Error("That code didn't work. Check for typos.");
  }

  const already = await readRedeemed();
  if (already.find((r) => r.code === code)) {
    throw new Error("You've already redeemed this code.");
  }

  switch (grant.kind) {
    case "bonus-minutes":
      await addBonusSeconds((grant.minutes || 0) * 60);
      break;
    case "trial-days":
      await setUsagePlan("trial", grant.days || 7);
      break;
    case "pro-days":
      await setUsagePlan("pro", grant.days || 30);
      break;
    case "pro-forever":
      // We still set an end date way in the future so getUsagePlan can
      // treat the value uniformly; effectively permanent.
      await setUsagePlan("pro", 365 * 10);
      break;
  }

  const next: PromoRedemption = {
    code,
    grant,
    redeemedAt: Date.now(),
  };
  await writeRedeemed([next, ...already]);
  return grant;
}

/** For display — sample codes the UI can show as hints when users tap. */
export function getSampleCodes(): { code: string; label: string }[] {
  return Object.entries(BUILTIN_PROMOS).map(([code, g]) => ({ code, label: g.label }));
}
