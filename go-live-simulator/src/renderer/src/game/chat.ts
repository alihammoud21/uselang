import type { ChatMessage } from "./types";

const users = [
  "PixelMia",
  "RicoLive",
  "NovaJay",
  "CozyCam",
  "MintyMike",
  "ClipQueen",
  "JunoPlays",
  "VibeLena",
  "KaiRush",
  "OrbitSam",
  "MegaFan",
  "CoolViewer"
];

const low = ["is bro alive?", "hello?", "do something", "I'm leaving", "this is boring", "wake up chat"];
const high = ["W STREAM", "CLIP THAT", "NO WAY", "I just subbed", "this is insane", "best stream today"];
const normal = ["nice setup", "chat is moving fast", "run another challenge", "that overlay is clean", "new here"];
const trolls = ["L streamer", "boring", "fake reaction", "fell off"];

export function makeChat(kind: ChatMessage["kind"], text?: string): ChatMessage {
  const bank = kind === "hype" ? high : kind === "troll" ? trolls : kind === "system" ? normal : normal;
  return {
    id: crypto.randomUUID(),
    user: users[Math.floor(Math.random() * users.length)],
    text: text ?? bank[Math.floor(Math.random() * bank.length)],
    kind
  };
}

export function ambientChat(hype: number, chatMood: number, trollChance: number): ChatMessage {
  if (Math.random() < trollChance) return makeChat("troll");
  if (hype > 68 && chatMood > 55) return makeChat("hype");
  if (hype < 28 || chatMood < 30) {
    return {
      id: crypto.randomUUID(),
      user: users[Math.floor(Math.random() * users.length)],
      text: low[Math.floor(Math.random() * low.length)],
      kind: "normal"
    };
  }
  return makeChat("normal");
}

export function donationMessage(amount: number, text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    user: "Donation Alert",
    text: `$${amount} from ${users[Math.floor(Math.random() * users.length)]}: ${text}`,
    kind: "donation"
  };
}
