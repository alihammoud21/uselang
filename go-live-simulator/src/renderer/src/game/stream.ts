import { ambientChat, donationMessage, makeChat } from "./chat";
import { findItem, ownedItems } from "./items";
import { platforms } from "./platforms";
import type { LiveState, SaveState, StreamStats, TaskPrompt } from "./types";

export const tasks: TaskPrompt[] = [
  { id: "hi", text: "Say hi to chat loudly!", seconds: 18 },
  { id: "tournament", text: "React like you just won a tournament!", seconds: 16 },
  { id: "wave", text: "Wave to new viewers!", seconds: 15 },
  { id: "huge-dono", text: "Pretend you got a huge donation!", seconds: 16 },
  { id: "challenge", text: "Hype up the next challenge!", seconds: 20 },
  { id: "shocked", text: "Make a shocked face!", seconds: 14 },
  { id: "thank", text: "Thank a fake donor!", seconds: 18 },
  { id: "boss", text: "Act like you just lost a boss fight!", seconds: 16 },
  { id: "subscribe", text: "Convince chat to subscribe!", seconds: 20 },
  { id: "dramatic", text: "Do a dramatic reaction!", seconds: 15 }
];

const goodMoments = ["Raid incoming", "Viral clip moment", "Huge donation", "Algorithm boost", "Gifted subs"];
const badMoments = ["Internet lag", "Troll wave", "Camera glitch", "Chat gets bored"];
const funnyMoments = ["Chat spams one word", "Fake celebrity joins chat", "Someone comments on your background", "Chat demands a challenge"];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function randomTask(): TaskPrompt {
  return tasks[Math.floor(Math.random() * tasks.length)];
}

export function getModifiers(save: SaveState) {
  const owned = ownedItems(save.purchasedItems);
  const active = findItem(save.activeModerator);
  const overlay = findItem(save.equippedOverlay);
  const all = [...owned.filter((item) => item.category === "equipment" || item.category === "platform-skin"), active, overlay].filter(Boolean);

  return all.reduce(
    (mods, item) => {
      for (const [key, value] of Object.entries(item!.modifiers)) {
        mods[key] = (mods[key] ?? 0) + (value ?? 0);
      }
      return mods;
    },
    {} as Record<string, number>
  );
}

export function createLiveState(save: SaveState): LiveState {
  const mods = getModifiers(save);
  const task = randomTask();
  return {
    startedAt: Date.now(),
    viewers: 2,
    subscribers: save.subscribers,
    money: save.money,
    hype: clamp(32 + (mods.startingHype ?? 0)),
    energy: 88,
    chatMood: clamp(54 + (mods.chatMood ?? 0)),
    peakViewers: 2,
    newSubscribers: 0,
    moneyEarned: 0,
    donationsReceived: 0,
    tasksCompleted: 0,
    bestMoment: "Opening soon screen",
    currentTask: task,
    taskTimeLeft: task.seconds,
    chat: [
      makeChat("system", "Stream started. Chat is waiting."),
      makeChat("normal", "first"),
      makeChat("normal", "good luck today")
    ],
    recentTaskBonus: 0,
    lastAction: "Starting stream"
  };
}

export type StreamAction =
  | "talk"
  | "game"
  | "react"
  | "challenge"
  | "energy"
  | "thank"
  | "ban"
  | "idle"
  | "activity";

export function applyAction(state: LiveState, save: SaveState, action: StreamAction, activityScore = 0): LiveState {
  const platform = platforms[save.platform ?? "twitch"];
  const mods = getModifiers(save);
  const active = action !== "idle";
  const taskish = ["talk", "react", "challenge", "thank"].includes(action);
  const actionPower =
    action === "react" ? 16 : action === "challenge" ? 13 : action === "game" ? 10 : action === "talk" ? 9 : action === "thank" ? 7 : action === "ban" ? 5 : 0;
  const micBonus = action === "talk" || activityScore > 45 ? 1 + (mods.micHype ?? 0) : 1;
  const taskMultiplier = 1 + (mods.taskReward ?? 0);
  const activityBonus = activityScore > 75 ? 14 : activityScore > 42 ? 7 : activityScore > 12 ? 3 : 0;
  const energyPenalty = action === "energy" ? -24 : active ? 6 : -4;

  let hype = clamp(state.hype + (actionPower + activityBonus) * micBonus - (active ? 2 : 10 * platform.hypeDecay));
  let energy = clamp(state.energy - energyPenalty);
  let chatMood = clamp(state.chatMood + (active ? 4 : -9) + (action === "ban" ? 8 : 0));
  let recentTaskBonus = Math.max(0, state.recentTaskBonus - 0.1);
  let tasksCompleted = state.tasksCompleted;
  let currentTask = state.currentTask;
  let taskTimeLeft = state.taskTimeLeft;
  let chat = [...state.chat];
  let bestMoment = state.bestMoment;

  if (action === "energy") {
    hype = clamp(hype + 6);
    chat.push(makeChat("hype", "energy drink buff activated"));
  }

  if (taskish) {
    recentTaskBonus = 1;
    tasksCompleted += 1;
    hype = clamp(hype + 15 * taskMultiplier);
    chatMood = clamp(chatMood + 8);
    bestMoment = state.currentTask.text;
    currentTask = randomTask();
    taskTimeLeft = currentTask.seconds;
    chat.push(makeChat("hype", "task complete, chat loved that"));
  }

  const growthFactor = active ? (hype / 18 + activityBonus / 5) * platform.viewerMultiplier * (1 + (mods.viewerGrowth ?? 0)) : -Math.max(1, state.viewers * 0.18);
  const viewers = Math.max(1, Math.round(state.viewers + growthFactor));
  const peakViewers = Math.max(state.peakViewers, viewers);
  const subsGained = active
    ? Math.floor((viewers * (hype / 100) * platform.subscriberMultiplier * (1 + (mods.subscriberBoost ?? 0)) * (taskish ? 0.16 : 0.035)) + (recentTaskBonus > 0.8 ? 2 : 0))
    : 0;

  const donationChance = viewers >= 5 && hype > 35 && active
    ? Math.min(0.48, (hype / 260) * platform.donationMultiplier + (mods.donationChance ?? 0) + recentTaskBonus * 0.1)
    : 0.004;
  let moneyEarned = state.moneyEarned;
  let money = state.money;
  let donationsReceived = state.donationsReceived;

  if (Math.random() < donationChance) {
    const amount = hype > 82 ? [25, 50, 100][Math.floor(Math.random() * 3)] : [5, 10, 25][Math.floor(Math.random() * 3)];
    money += amount;
    moneyEarned += amount;
    donationsReceived += 1;
    chat.push(donationMessage(amount, amount >= 100 ? "That reaction was legendary!" : "W stream"));
    bestMoment = amount >= 100 ? "Huge donation" : bestMoment;
  }

  if (Math.random() < 0.12) {
    const trollChance = Math.max(0.02, 0.1 * platform.trollPressure - (mods.trollReduction ?? 0));
    chat.push(ambientChat(hype, chatMood, trollChance));
  }

  if (Math.random() < 0.03) {
    const eventBank = hype > 65 ? goodMoments : hype < 28 ? badMoments : funnyMoments;
    const event = eventBank[Math.floor(Math.random() * eventBank.length)];
    bestMoment = event;
    chat.push(makeChat(eventBank === badMoments ? "system" : "hype", event));
    if (event === "Viral clip moment" || event === "Algorithm boost") {
      hype = clamp(hype + 18);
    }
  }

  return {
    ...state,
    viewers,
    subscribers: state.subscribers + subsGained,
    money,
    hype,
    energy,
    chatMood,
    peakViewers,
    newSubscribers: state.newSubscribers + subsGained,
    moneyEarned,
    donationsReceived,
    tasksCompleted,
    bestMoment,
    currentTask,
    taskTimeLeft,
    chat: chat.slice(-70),
    recentTaskBonus,
    lastAction: action === "activity" ? "Camera/mic reaction" : action
  };
}

export function tickStream(state: LiveState, save: SaveState, activityScore: number): LiveState {
  const platform = platforms[save.platform ?? "twitch"];
  const activityActive = activityScore > 24;
  let next = activityActive ? applyAction(state, save, "activity", activityScore) : { ...state };
  next.taskTimeLeft -= 1;
  next.hype = clamp(next.hype - (activityActive ? 0.6 : 2.5 * platform.hypeDecay));
  next.energy = clamp(next.energy - (activityActive ? 1.4 : 0.4));

  if (!activityActive && next.hype < 24) {
    next.viewers = Math.max(1, Math.floor(next.viewers - Math.max(1, next.viewers * 0.12)));
    next.chatMood = clamp(next.chatMood - 2.5);
  }

  if (next.taskTimeLeft <= 0) {
    next.hype = clamp(next.hype - 12);
    next.chatMood = clamp(next.chatMood - 10);
    next.chat = [...next.chat, makeChat("normal", "chat wanted that task")].slice(-70);
    next.currentTask = randomTask();
    next.taskTimeLeft = next.currentTask.seconds;
  }

  return next;
}

export function finishStream(state: LiveState): StreamStats {
  return {
    startedAt: state.startedAt,
    endedAt: Date.now(),
    peakViewers: state.peakViewers,
    newSubscribers: state.newSubscribers,
    moneyEarned: state.moneyEarned,
    donationsReceived: state.donationsReceived,
    tasksCompleted: state.tasksCompleted,
    bestMoment: state.bestMoment,
    chatMood: state.chatMood
  };
}
