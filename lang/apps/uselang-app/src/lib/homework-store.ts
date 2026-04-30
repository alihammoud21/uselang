// ── Homework store ──────────────────────────────────────────────────────────
// Persists the homework tasks the tutor hands out at the end of each lesson,
// so the Today tab can surface "finish your homework" cards and the user
// can reopen unfinished tasks across sessions.
//
// Storage shape (AsyncStorage JSON under `lang:homework:assignments`):
//   Array<StoredHomework>
// We cap the list at 20 assignments so the store stays bounded without any
// explicit GC pass — older items fall off the end.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HomeworkItem, HomeworkType } from "./tutor-api";

const KEY = "lang:homework:assignments";
const MAX_STORED = 20;

export interface StoredHomeworkTask extends HomeworkItem {
  done: boolean;
  /** Time the user tapped "complete" on this task, if any. */
  completedAt: string | null;
}

export interface StoredHomework {
  /** Stable ID — typically the scenario/lesson id the homework came from. */
  id: string;
  /** Lesson title / scenario label shown on the Today card. */
  lessonTitle: string;
  /** Target language learned in this lesson (code). */
  languageCode: string;
  /** ISO timestamp when the homework was assigned. */
  assignedAt: string;
  tasks: StoredHomeworkTask[];
}

async function readAll(): Promise<StoredHomework[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(list: StoredHomework[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_STORED)));
  } catch {
    // best-effort — storage failures shouldn't break the lesson flow
  }
}

/**
 * Append a new homework assignment (or replace an existing one with the same
 * id). Tasks are always persisted as "not done".
 */
export async function saveHomework(args: {
  id: string;
  lessonTitle: string;
  languageCode: string;
  tasks: HomeworkItem[];
}): Promise<StoredHomework> {
  const { id, lessonTitle, languageCode, tasks } = args;
  const clean = tasks.filter((t) => t && (t.title || t.task));
  const entry: StoredHomework = {
    id,
    lessonTitle,
    languageCode,
    assignedAt: new Date().toISOString(),
    tasks: clean.map((t) => ({ ...t, done: false, completedAt: null })),
  };

  const existing = await readAll();
  const filtered = existing.filter((h) => h.id !== id);
  const next = [entry, ...filtered];
  await writeAll(next);
  return entry;
}

/** Most-recent-first list of every stored homework. */
export async function listHomework(): Promise<StoredHomework[]> {
  const list = await readAll();
  return list.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
}

/** Only homework with at least one undone task. */
export async function listPendingHomework(): Promise<StoredHomework[]> {
  const all = await listHomework();
  return all.filter((h) => h.tasks.some((t) => !t.done));
}

export async function markTaskDone(
  homeworkId: string,
  taskId: string,
  done = true
): Promise<StoredHomework | null> {
  const list = await readAll();
  const idx = list.findIndex((h) => h.id === homeworkId);
  if (idx === -1) return null;
  const next = { ...list[idx] };
  next.tasks = next.tasks.map((t) =>
    t.id === taskId
      ? { ...t, done, completedAt: done ? new Date().toISOString() : null }
      : t
  );
  list[idx] = next;
  await writeAll(list);
  return next;
}

export async function clearHomework(homeworkId: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((h) => h.id !== homeworkId));
}

// Helpers used by the UI for icons / labels per task type.
export function homeworkTypeLabel(type: HomeworkType): string {
  switch (type) {
    case "recording": return "Record";
    case "translation": return "Translate";
    case "writing": return "Write";
    case "listening": return "Listen";
    case "review": return "Review";
    default: return "Task";
  }
}

export function homeworkTypeIcon(
  type: HomeworkType
): "mic-outline" | "swap-horizontal-outline" | "create-outline" | "ear-outline" | "refresh-outline" {
  switch (type) {
    case "recording": return "mic-outline";
    case "translation": return "swap-horizontal-outline";
    case "writing": return "create-outline";
    case "listening": return "ear-outline";
    case "review":
    default: return "refresh-outline";
  }
}
