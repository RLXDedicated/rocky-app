// Engagement loops on top of the pet: daily missions with a surprise chest,
// collection sets (own every piece → a bonus), and the helpers the Arcade's
// monthly tournament uses. Pure module: shared by the browser and the
// backend (which applies the same rules when the agent claims a reward).
import { todayKey } from "../engine/dateUtils";

/** The slice of PetState the missions read (kept structural to avoid an import cycle with pet.ts). */
export interface MissionFacts {
  day: { date: string; pets: number; plays: number; baths: number; feeds?: number; litter?: number };
  games: { date: string; arcadeRounds: number };
  quiz: { date: string | null };
  social: { date: string; visited: string[] };
}

export interface Mission {
  id: string;
  emoji: string;
  label: string;
  target: number;
  progress: (s: MissionFacts, today: string) => number;
}

const onDay = (date: string, today: string, n: number) => (date === today ? n : 0);

export const MISSIONS: Mission[] = [
  { id: "quiz", emoji: "📝", label: "Do today’s Note Check", target: 1, progress: (s, t) => (s.quiz.date === t ? 1 : 0) },
  { id: "pet", emoji: "🤚", label: "Pet Rocky 3 times", target: 3, progress: (s, t) => onDay(s.day.date, t, s.day.pets) },
  { id: "feed", emoji: "🍎", label: "Feed Rocky", target: 1, progress: (s, t) => onDay(s.day.date, t, s.day.feeds ?? 0) },
  { id: "bath", emoji: "🛁", label: "Give Rocky a bath", target: 1, progress: (s, t) => onDay(s.day.date, t, s.day.baths) },
  { id: "ball", emoji: "⚽", label: "Play ball with Rocky", target: 1, progress: (s, t) => onDay(s.day.date, t, s.day.plays) },
  { id: "arcade2", emoji: "🎮", label: "Play 2 Arcade games", target: 2, progress: (s, t) => onDay(s.games.date, t, s.games.arcadeRounds) },
  { id: "arcade4", emoji: "🕹️", label: "Play 4 Arcade games", target: 4, progress: (s, t) => onDay(s.games.date, t, s.games.arcadeRounds) },
  { id: "visit", emoji: "🏠", label: "Visit 2 friends’ Rockys", target: 2, progress: (s, t) => onDay(s.social.date, t, s.social.visited.length) },
  { id: "litter", emoji: "🗑️", label: "Pick up litter", target: 1, progress: (s, t) => onDay(s.day.date, t, s.day.litter ?? 0) },
];

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h >>> 0;
}

/** Today's three missions: the Note Check every day, plus two that change daily (the same for everyone). */
export function dailyMissions(now: Date = new Date()): Mission[] {
  const today = todayKey(now);
  const rest = MISSIONS.filter((m) => m.id !== "quiz");
  const a = hash(`missions:${today}`) % rest.length;
  let b = hash(`missions2:${today}`) % rest.length;
  if (b === a) b = (b + 1) % rest.length;
  // Never two Arcade missions on the same day.
  if (rest[a]!.id.startsWith("arcade") && rest[b]!.id.startsWith("arcade")) b = (b + 2) % rest.length;
  return [MISSIONS[0]!, rest[a]!, rest[b]!];
}

export function missionStatus(s: MissionFacts, now: Date = new Date()) {
  const today = todayKey(now);
  return dailyMissions(now).map((m) => {
    const n = Math.min(m.target, m.progress(s, today));
    return { id: m.id, emoji: m.emoji, label: m.label, target: m.target, progress: n, done: n >= m.target };
  });
}

/** What today's chest holds (deterministic, so the browser shows exactly what the server pays). */
export function chestReward(now: Date, chestsOpened: number): { coins: number; treats: number } {
  const h = hash(`chest:${todayKey(now)}:${chestsOpened}`);
  return { coins: 20 + (h % 26), treats: h % 4 === 0 ? 1 : 0 };
}

// ---------------------------------------------------------------------------
// Collection sets: own every piece of a themed set → a one-time bonus.
// ---------------------------------------------------------------------------
export interface CollectionSet {
  id: string;
  name: string;
  emoji: string;
  items: string[];
  coins: number;
}

export const COLLECTION_SETS: CollectionSet[] = [
  { id: "set-coffee", name: "Coffee country", emoji: "☕", items: ["hat-straw", "neck-coffee", "decor-coffee-cart", "scene-coffee-farm", "bubble-coffee"], coins: 100 },
  { id: "set-beach", name: "Beach day", emoji: "🏖️", items: ["back-surfboard", "glasses-sunset", "decor-hammock", "scene-caribbean", "bubble-ocean"], coins: 100 },
  { id: "set-camp", name: "Camp night", emoji: "🏕️", items: ["decor-campfire", "scene-star-camp", "back-guitar", "neck-knit-scarf", "neck-star-pendant"], coins: 100 },
  { id: "set-party", name: "Party time", emoji: "🎉", items: ["back-balloons", "fx-balloons", "fx-sparkles", "bubble-gold", "glasses-butterfly"], coins: 120 },
  { id: "set-office", name: "Office pro", emoji: "💼", items: ["hat-headset", "glasses-reading", "neck-tie", "decor-computer", "scene-office"], coins: 100 },
  { id: "set-colombia", name: "Colombia", emoji: "🇨🇴", items: ["hat-aguadeno", "body-ruana", "neck-carriel", "decor-chiva", "scene-cocora"], coins: 150 },
  { id: "set-spooky", name: "Spooky night", emoji: "🎃", items: ["hat-witch", "glasses-bat", "neck-bone", "back-bat-wings", "scene-graveyard"], coins: 120 },
];

export function setProgress(owned: Set<string>, set: CollectionSet) {
  const have = set.items.filter((id) => owned.has(id)).length;
  return { have, total: set.items.length, complete: have === set.items.length };
}

/** The tournament's month (YYYY-MM, local). */
export function monthOf(now: Date): string {
  return todayKey(now).slice(0, 7);
}
