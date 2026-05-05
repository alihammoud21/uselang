// ── Daily Notifications ───────────────────────────────────────────────────────
// Schedule a repeating local notification to remind the user to practice.
// Uses expo-notifications with daily trigger. Works fully offline.

// Dynamic import — expo-notifications native module may not exist in Expo Go.
// All public functions become safe no-ops when the module is unavailable.
let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch {
  console.warn("[daily-notifications] expo-notifications not available — notifications disabled");
}
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "lang:dailyNotifHour";
const CHANNEL_ID = "daily-reminder";
const NOTIF_ID = "lang-daily";

// ── Motivational messages (random pick each day) ────────────────────────────
const MESSAGES = [
  { title: "Time to practice!", body: "5 minutes is all it takes to keep your streak alive." },
  { title: "Your tutor is waiting", body: "Open Lang and practice a quick phrase today." },
  { title: "Don't break your streak!", body: "A short session keeps your pronunciation sharp." },
  { title: "Ready for a challenge?", body: "Try today's tongue twister — tap to start." },
  { title: "Language skills fade fast", body: "A quick session today keeps fluency on track." },
  { title: "New day, new words", body: "Spend a few minutes and surprise yourself." },
];

// ── Permissions + channel setup ─────────────────────────────────────────────

async function ensurePermissions(): Promise<boolean> {
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function ensureChannel() {
  if (!Notifications) return;
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Daily Reminder",
      importance: Notifications.AndroidImportance?.HIGH ?? 4,
      sound: "default",
    });
  }
}

// ── Configure foreground behavior ───────────────────────────────────────────
// Call initNotifications() from the root _layout to register the handler
// before the first notification can arrive.

export function initNotifications(): void {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  ensureChannel();
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Schedule daily notification at the given hour (0–23). Cancels any existing
 * daily reminder first to avoid duplicates.
 */
export async function scheduleDailyNotification(hour: number): Promise<boolean> {
  if (!Notifications) return false;
  const granted = await ensurePermissions();
  if (!granted) return false;

  ensureChannel();

  // Cancel previous
  await Notifications.cancelAllScheduledNotificationsAsync();

  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID,
    content: {
      title: msg.title,
      body: msg.body,
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes?.DAILY ?? "daily",
      hour,
      minute: 0,
    },
  });

  await AsyncStorage.setItem(STORAGE_KEY, String(hour));
  return true;
}

/**
 * Cancel daily notification.
 */
export async function cancelDailyNotification(): Promise<void> {
  if (Notifications) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Get the currently saved notification hour, or null if none.
 */
export async function getDailyNotificationHour(): Promise<number | null> {
  const val = await AsyncStorage.getItem(STORAGE_KEY);
  if (val == null) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

/**
 * Schedule a one-time review reminder for a phrase the user just mastered.
 * Fires after `delayMinutes` (default 60) to prompt spaced-repetition review.
 * Safe no-op if notifications unavailable or permissions not granted.
 */
export async function scheduleReviewReminder(
  phrase: string,
  delayMinutes: number = 60,
): Promise<boolean> {
  if (!Notifications) return false;
  const granted = await ensurePermissions();
  if (!granted) return false;
  ensureChannel();

  const short = phrase.length > 40 ? phrase.slice(0, 37) + "…" : phrase;

  await Notifications.scheduleNotificationAsync({
    identifier: `lang-review-${Date.now()}`,
    content: {
      title: "Time to review!",
      body: `Can you still say "${short}"? Tap to practice.`,
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL ?? "timeInterval",
      seconds: delayMinutes * 60,
      repeats: false,
    },
  });
  return true;
}
