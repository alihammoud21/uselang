// ── Daily Notifications ───────────────────────────────────────────────────────
// Schedule a repeating local notification to remind the user to practice.
// Uses expo-notifications with daily trigger. Works fully offline.

import * as Notifications from "expo-notifications";
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
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function ensureChannel() {
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Daily Reminder",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }
}

// ── Configure foreground behavior ───────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Schedule daily notification at the given hour (0–23). Cancels any existing
 * daily reminder first to avoid duplicates.
 */
export async function scheduleDailyNotification(hour: number): Promise<boolean> {
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
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
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
  await Notifications.cancelAllScheduledNotificationsAsync();
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
