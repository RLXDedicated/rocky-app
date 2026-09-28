// Rocky the pet: needs (health, happiness, cleanliness), care actions
// (pet, treat, play, bath), the wallet and the shop — one pure reducer that
// the browser and the backend both run. In remote mode the backend is the
// source of truth: the browser applies an action optimistically, the
// server re-applies it with the same rules, stores the result and records
// it in the ledger/audit trail, and the browser adopts the server's copy.
//
// Care never changes XP, Energy, Level, Streak, Mood or Evolution. The two
// mini-games (keep-it-up, picking up litter) may award a little XP, capped
// per day (see pantry.ts); the backend records it as an XP_GRANT event.
import { todayKey } from "../engine/dateUtils";
import type { Achievement, GameState } from "../types/domain";
import {
  CLOSET,
  collectionOpen,
  RETIRED_ITEMS,
  sanitizeSizes,
  DEFAULT_OUTFIT,
  findItem,
  isUsable,
  sanitizeOutfit,
  sanitizeSpots,
  type CatalogOverrides,
  type ClosetItem,
  type Outfit,
  type ProgressFacts,
} from "./closet";
import { coinsEarned, TREAT_BAG } from "./economy";
import { QUIZ_REWARD, scoreQuiz } from "./notesQuiz";
import {
  findFood,
  findSoap,
  GAME_CAPS,
  keepyReward,
  KEEPY_MAX_STREAK,
  LITTER,
  litterPiece,
  litterReward,
  STARTER_SOAP,
  ARCADE_CAP,
  ARCADE_GAMES,
  ARCADE_MAX_SCORE,
  arcadeReward,
  type ArcadeGame,
  type LitterPiece,
} from "./pantry";

const ARCADE_NAMES: Record<ArcadeGame, string> = {
  catch: "Treat Catch",
  typo: "Typo Hunt",
  memory: "Memory Match",
};

export const NEEDS_MAX = 100;

/** How the needs drift over real time (per hour). Gentle on purpose: a weekend away never "kills" Rocky. */
export const NEEDS_RATES = {
  happinessDecay: 1.5,
  dirtGain: 2,
  /** Health drops only while Rocky is very dirty or very unhappy, and recovers otherwise. */
  healthDecay: 1,
  healthRecover: 1.5,
  dirtyThreshold: 70,
  sadThreshold: 20,
  /** Longest stretch of time applied in one go (a long absence counts as this many hours). */
  maxHours: 72,
} as const;

/** What each care action does to the needs. */
export const CARE_EFFECTS = {
  pet: { happiness: 5 },
  feed: { health: 12, happiness: 6 },
  play: { happiness: 14, dirt: 12 },
  bath: { dirt: -100, happiness: 4, health: 3 },
} as const;

/** Petting cheers Rocky up at most this many times a day (petting stays fun, never grindy). */
export const PETS_PER_DAY = 8;

export interface Needs {
  health: number;
  happiness: number;
  /** 0 = spotless, 100 = covered in mud. */
  dirt: number;
  /** When the needs were last brought up to date. */
  updatedAt: string;
}

export interface PetState {
  version: 1;
  outfit: Outfit;
  /** Shop items bought. */
  owned: string[];
  /** Items an admin gave the agent (usable even before the progress unlock, and free). */
  granted: string[];
  needs: Needs;
  /** Daily counters. */
  day: { date: string; pets: number; plays: number; baths: number };
  treatsUsed: number;
  bonusTreats: number;
  coinsSpent: number;
  /** Net admin coin adjustments (grants minus deductions). */
  coinsAdjust: number;
  /** When the agent finished the intro (kept server-side so a new device skips it). */
  onboardedAt: string | null;
  /** Coins won in Note Check (the daily notes quiz). */
  gameCoins: number;
  quiz: QuizState;
  /** Foods (count per id) and soaps (1 each) the agent has. */
  inventory: Record<string, number>;
  /** Mini-game rewards today (capped) and personal bests. */
  games: GameStats;
  /** Litter lying around Rocky's world. */
  litter: LitterState;
  /** Messages and gifts from QA, and visits from friends (newest first). */
  inbox: InboxEntry[];
  /** Up to when the agent has seen the inbox. */
  inboxReadAt: string | null;
  /** Friends visited today (the first visit per friend earns a few coins). */
  social: { date: string; visited: string[] };
}

export interface GameStats {
  date: string;
  coins: number;
  xp: number;
  bestKeepy: number;
  keepyRounds: number;
  litterCleaned: number;
  /** Arcade (coins only): today's coins and rounds, and best scores ever. */
  arcadeCoins: number;
  arcadeRounds: number;
  arcadeBest: Record<string, number>;
}

export interface LitterState {
  items: LitterPiece[];
  serial: number;
  /** When the last piece was (or would have been) dropped. */
  lastAt: string;
  seed: string;
}

export interface InboxEntry {
  id: string;
  kind: "message" | "gift" | "visit";
  from: string;
  text: string;
  at: string;
}

export const INBOX_LIMIT = 30;
/** Coins for the first visit to each friend in a day, and how many visits a day pay. */
export const VISIT_REWARD = { coins: 2, perDay: 5, hostHappiness: 3 } as const;

export interface QuizState {
  /** Day of the last round played, and whether today's reward was already given. */
  date: string | null;
  rewarded: boolean;
  lastScore: number;
  lastTotal: number;
  lastReward: number;
  played: number;
  perfectRounds: number;
}

const EMPTY_QUIZ: QuizState = {
  date: null,
  rewarded: false,
  lastScore: 0,
  lastTotal: 0,
  lastReward: 0,
  played: 0,
  perfectRounds: 0,
};

export type PetAction =
  | { type: "pet" }
  | { type: "feed"; food?: string }
  | { type: "play" }
  | { type: "bath"; soap?: string }
  | { type: "buyFood"; foodId: string; qty?: number }
  | { type: "buySoap"; soapId: string }
  | { type: "keepy"; touches: number }
  | { type: "litter"; id: string }
  | { type: "readInbox" }
  | { type: "arcade"; game: ArcadeGame; score: number }
  | { type: "buy"; itemId: string }
  | { type: "buyTreats" }
  | { type: "equip"; outfit: Outfit }
  | { type: "quiz"; answers: Record<string, number> };

export const PET_ACTION_TYPES = [
  "pet",
  "feed",
  "play",
  "bath",
  "buy",
  "buyTreats",
  "equip",
  "quiz",
  "buyFood",
  "buySoap",
  "keepy",
  "litter",
  "readInbox",
  "arcade",
] as const;

export interface PetContext {
  facts: ProgressFacts;
  now: Date;
  catalog?: ClosetItem[];
  /** Raw admin overrides (pantry prices/availability). */
  overrides?: CatalogOverrides;
}

export type PetFailure =
  | "no-treats"
  | "no-food"
  | "no-soap"
  | "locked"
  | "owned"
  | "coins"
  | "unknown-item"
  | "unavailable"
  | "invalid"
  | "gone";

/** A coin movement to record in the ledger. */
export interface LedgerEntry {
  delta: number;
  kind:
    | "purchase"
    | "treat-bag"
    | "admin-grant"
    | "admin-deduct"
    | "quiz"
    | "game"
    | "social";
  itemId?: string;
  note?: string;
}

/** XP a mini-game earned (the backend turns it into an XP_GRANT event). */
export interface XpAward {
  xp: number;
  reason: string;
}

export type PetResult =
  | {
      ok: true;
      state: PetState;
      ledger?: LedgerEntry;
      xp?: XpAward;
      reward?: { coins: number; xp: number };
    }
  | { ok: false; reason: PetFailure; state: PetState };

/** The progress the shop and the economy read, from the Game Engine's state and achievement metrics. */
export function factsFrom(
  state: GameState,
  progress: {
    unlocked: Achievement[];
    metrics: { checkins: number; qaPasses: number };
  },
): ProgressFacts {
  return {
    level: state.level,
    stage: state.evolutionStage,
    bestStreak: state.bestStreak,
    checkIns: progress.metrics.checkins,
    qaPasses: progress.metrics.qaPasses,
    badgeIds: progress.unlocked.map((a) => a.id),
  };
}

const clamp = (n: number) =>
  Math.max(0, Math.min(NEEDS_MAX, Math.round(n * 10) / 10));

export function initialPetState(now: Date = new Date()): PetState {
  return {
    version: 1,
    outfit: {
      ...DEFAULT_OUTFIT,
      decor: [...DEFAULT_OUTFIT.decor],
      spots: {},
      sizes: {},
    },
    owned: [],
    granted: [],
    needs: {
      health: 100,
      happiness: 80,
      dirt: 10,
      updatedAt: now.toISOString(),
    },
    day: { date: todayKey(now), pets: 0, plays: 0, baths: 0 },
    treatsUsed: 0,
    bonusTreats: 0,
    coinsSpent: 0,
    coinsAdjust: 0,
    onboardedAt: null,
    gameCoins: 0,
    quiz: { ...EMPTY_QUIZ },
    inventory: { [STARTER_SOAP]: 1, "food-apple": 2 },
    games: emptyGames(todayKey(now)),
    // A first piece of litter shows up soon, so the agent discovers the bin.
    litter: {
      items: [],
      serial: 0,
      lastAt: new Date(
        now.getTime() - (LITTER.everyHours - 0.5) * 3_600_000,
      ).toISOString(),
      seed: now.toISOString(),
    },
    inbox: [],
    inboxReadAt: null,
    social: { date: todayKey(now), visited: [] },
  };
}

function emptyGames(date: string, prev?: GameStats): GameStats {
  return {
    date,
    coins: 0,
    xp: 0,
    bestKeepy: prev?.bestKeepy ?? 0,
    keepyRounds: prev?.keepyRounds ?? 0,
    litterCleaned: prev?.litterCleaned ?? 0,
    arcadeCoins: 0,
    arcadeRounds: 0,
    arcadeBest: { ...(prev?.arcadeBest ?? {}) },
  };
}

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const ids = (v: unknown) =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === "string"))]
    : [];

/** Repairs anything malformed (old saves, hand-edited storage) into a valid PetState. */
export function normalizePetState(
  raw: unknown,
  now: Date = new Date(),
): PetState {
  const base = initialPetState(now);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<PetState> & Record<string, unknown>;
  const needs = (r.needs ?? {}) as Partial<Needs>;
  const day = (r.day ?? {}) as Partial<PetState["day"]>;
  const o = (r.outfit ?? {}) as Partial<Outfit>;
  return {
    version: 1,
    outfit: {
      hat:
        o.hat === null || typeof o.hat === "string"
          ? (o.hat ?? null)
          : base.outfit.hat,
      // Saves from before clothes existed get the starter ID badge.
      glasses: typeof o.glasses === "string" ? o.glasses : null,
      neck:
        typeof o.neck === "string"
          ? o.neck
          : o.neck === null
            ? null
            : base.outfit.neck,
      back: typeof o.back === "string" ? o.back : null,
      body: typeof o.body === "string" ? o.body : null,
      scene: typeof o.scene === "string" ? o.scene : base.outfit.scene,
      decor: Array.isArray(o.decor) ? ids(o.decor) : base.outfit.decor,
      spots: sanitizeSpots(
        o.spots,
        Array.isArray(o.decor) ? ids(o.decor) : base.outfit.decor,
      ),
      sizes: sanitizeSizes(
        o.sizes,
        Array.isArray(o.decor) ? ids(o.decor) : base.outfit.decor,
      ),
      fx: typeof o.fx === "string" ? o.fx : null,
      aura: typeof o.aura === "string" ? o.aura : null,
    },
    owned: ids(r.owned).filter((id) => !(id in RETIRED_ITEMS)),
    granted: ids(r.granted),
    needs: {
      health: clamp(num(needs.health, base.needs.health)),
      happiness: clamp(num(needs.happiness, base.needs.happiness)),
      dirt: clamp(num(needs.dirt, base.needs.dirt)),
      updatedAt:
        typeof needs.updatedAt === "string" &&
        !Number.isNaN(Date.parse(needs.updatedAt))
          ? needs.updatedAt
          : base.needs.updatedAt,
    },
    day: {
      date: typeof day.date === "string" ? day.date : base.day.date,
      pets: Math.max(0, num(day.pets, 0)),
      plays: Math.max(0, num(day.plays, 0)),
      baths: Math.max(0, num(day.baths, 0)),
    },
    treatsUsed: Math.max(0, num(r.treatsUsed, 0)),
    bonusTreats: Math.max(0, num(r.bonusTreats, 0)),
    // Retired items are refunded (and dropped from `owned` above).
    coinsSpent: Math.max(
      0,
      num(r.coinsSpent, 0) -
        ids(r.owned).reduce((sum, id) => sum + (RETIRED_ITEMS[id] ?? 0), 0),
    ),
    coinsAdjust: num(r.coinsAdjust, 0),
    onboardedAt: typeof r.onboardedAt === "string" ? r.onboardedAt : null,
    gameCoins: Math.max(0, num(r.gameCoins, 0)),
    quiz: normalizeQuiz(r.quiz),
    inventory: normalizeInventory(
      r.inventory,
      base.inventory,
      "inventory" in r,
    ),
    games: normalizeGames(r.games, base.games.date),
    litter: normalizeLitter(
      r.litter,
      now,
      typeof r.onboardedAt === "string" ? r.onboardedAt : "rocky",
    ),
    inbox: Array.isArray(r.inbox)
      ? (r.inbox as unknown[]).filter(isInboxEntry).slice(0, INBOX_LIMIT)
      : [],
    inboxReadAt: typeof r.inboxReadAt === "string" ? r.inboxReadAt : null,
    social: normalizeSocial(r.social, base.social.date),
  };
}

function normalizeInventory(
  raw: unknown,
  starter: Record<string, number>,
  existed: boolean,
): Record<string, number> {
  // Saves from before the inventory existed get the starter kit.
  if (!existed || !raw || typeof raw !== "object") return { ...starter };
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (
      (findFood(k) || findSoap(k)) &&
      typeof v === "number" &&
      Number.isFinite(v) &&
      v > 0
    )
      out[k] = findSoap(k) ? 1 : Math.min(999, Math.floor(v));
  }
  out[STARTER_SOAP] = 1;
  return out;
}

function normalizeGames(raw: unknown, today: string): GameStats {
  const g = (raw && typeof raw === "object" ? raw : {}) as Partial<GameStats>;
  return {
    date: typeof g.date === "string" ? g.date : today,
    coins: Math.max(0, num(g.coins, 0)),
    xp: Math.max(0, num(g.xp, 0)),
    bestKeepy: Math.max(0, num(g.bestKeepy, 0)),
    keepyRounds: Math.max(0, num(g.keepyRounds, 0)),
    litterCleaned: Math.max(0, num(g.litterCleaned, 0)),
    arcadeCoins: Math.max(0, num(g.arcadeCoins, 0)),
    arcadeRounds: Math.max(0, num(g.arcadeRounds, 0)),
    arcadeBest: Object.fromEntries(
      Object.entries(
        g.arcadeBest && typeof g.arcadeBest === "object" ? g.arcadeBest : {},
      ).filter(
        ([k, v]) =>
          (ARCADE_GAMES as readonly string[]).includes(k) &&
          typeof v === "number" &&
          Number.isFinite(v),
      ),
    ),
  };
}

function normalizeLitter(raw: unknown, now: Date, seed: string): LitterState {
  const l = (
    raw && typeof raw === "object" ? raw : null
  ) as Partial<LitterState> | null;
  if (
    !l ||
    !Array.isArray(l.items) ||
    typeof l.lastAt !== "string" ||
    Number.isNaN(Date.parse(l.lastAt))
  ) {
    // Older saves: two pieces are already waiting.
    return {
      items: [],
      serial: 0,
      lastAt: new Date(
        now.getTime() - 2 * LITTER.everyHours * 3_600_000,
      ).toISOString(),
      seed,
    };
  }
  const items = l.items
    .filter(
      (i): i is LitterPiece =>
        Boolean(i) &&
        typeof i.id === "string" &&
        typeof i.x === "number" &&
        (LITTER.kinds as readonly string[]).includes(i.kind),
    )
    .slice(0, LITTER.max);
  return {
    items,
    serial: Math.max(0, num(l.serial, 0)),
    lastAt: l.lastAt,
    seed: typeof l.seed === "string" ? l.seed : seed,
  };
}

function normalizeSocial(raw: unknown, today: string): PetState["social"] {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<
    PetState["social"]
  >;
  return {
    date: typeof s.date === "string" ? s.date : today,
    visited: ids(s.visited).slice(0, 50),
  };
}

function isInboxEntry(v: unknown): v is InboxEntry {
  const e = v as InboxEntry;
  return (
    Boolean(e) &&
    typeof e.id === "string" &&
    typeof e.text === "string" &&
    typeof e.at === "string" &&
    ["message", "gift", "visit"].includes(e.kind)
  );
}

function normalizeQuiz(raw: unknown): QuizState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_QUIZ };
  const q = raw as Partial<QuizState>;
  return {
    date: typeof q.date === "string" ? q.date : null,
    rewarded: q.rewarded === true,
    lastScore: Math.max(0, num(q.lastScore, 0)),
    lastTotal: Math.max(0, num(q.lastTotal, 0)),
    lastReward: Math.max(0, num(q.lastReward, 0)),
    played: Math.max(0, num(q.played, 0)),
    perfectRounds: Math.max(0, num(q.perfectRounds, 0)),
  };
}

/** Brings the needs up to `now`: happiness fades, dirt builds up, health follows how Rocky is kept. */
export function tickNeeds(needs: Needs, now: Date): Needs {
  const since = Date.parse(needs.updatedAt);
  const hours = Math.min(
    NEEDS_RATES.maxHours,
    Math.max(0, (now.getTime() - since) / 3_600_000),
  );
  if (hours < 1 / 60) return needs;
  const happiness = clamp(needs.happiness - NEEDS_RATES.happinessDecay * hours);
  const dirt = clamp(needs.dirt + NEEDS_RATES.dirtGain * hours);
  // Health uses the average condition over the stretch (simple, stable, fair).
  const avgDirt = (needs.dirt + dirt) / 2;
  const avgHappy = (needs.happiness + happiness) / 2;
  const neglected =
    avgDirt >= NEEDS_RATES.dirtyThreshold ||
    avgHappy <= NEEDS_RATES.sadThreshold;
  const health = clamp(
    needs.health +
      (neglected ? -NEEDS_RATES.healthDecay : NEEDS_RATES.healthRecover) *
        hours,
  );
  return { health, happiness, dirt, updatedAt: now.toISOString() };
}

/** The state as of `now` (needs ticked, daily counters rolled over). */
export function refreshPetState(state: PetState, now: Date): PetState {
  const today = todayKey(now);
  return {
    ...state,
    needs: tickNeeds(state.needs, now),
    day:
      state.day.date === today
        ? state.day
        : { date: today, pets: 0, plays: 0, baths: 0 },
    games:
      state.games.date === today ? state.games : emptyGames(today, state.games),
    social:
      state.social.date === today ? state.social : { date: today, visited: [] },
    litter: spawnLitter(state.litter, now),
  };
}

/** Drops a piece of litter every few hours while there's room (deterministic, so browser and server agree). */
export function spawnLitter(litter: LitterState, now: Date): LitterState {
  const step = LITTER.everyHours * 3_600_000;
  let last = Date.parse(litter.lastAt);
  const t = now.getTime();
  if (t - last < step) return litter;
  // A long absence counts as a full yard, not an endless loop.
  if (t - last > step * (LITTER.max + 1)) last = t - step * (LITTER.max + 1);
  let serial = litter.serial;
  const items = [...litter.items];
  while (t - last >= step) {
    last += step;
    if (items.length < LITTER.max)
      items.push(litterPiece(++serial, litter.seed));
  }
  return { ...litter, items, serial, lastAt: new Date(last).toISOString() };
}

/** Pays a mini-game reward within today's caps. */
function payGame(
  state: PetState,
  want: { coins: number; xp: number },
): { state: PetState; coins: number; xp: number } {
  const coins = Math.max(
    0,
    Math.min(want.coins, GAME_CAPS.coins - state.games.coins),
  );
  const xp = Math.max(0, Math.min(want.xp, GAME_CAPS.xp - state.games.xp));
  return {
    state: {
      ...state,
      gameCoins: state.gameCoins + coins,
      games: {
        ...state.games,
        coins: state.games.coins + coins,
        xp: state.games.xp + xp,
      },
    },
    coins,
    xp,
  };
}

function inboxPush(state: PetState, entry: InboxEntry): PetState {
  return { ...state, inbox: [entry, ...state.inbox].slice(0, INBOX_LIMIT) };
}

/** Treats are earned by real work (1 per check-in, 2 per clean QA audit) plus treat bags bought with coins. */
export function treatsAvailable(state: PetState, facts: ProgressFacts): number {
  return Math.max(
    0,
    facts.checkIns + facts.qaPasses * 2 + state.bonusTreats - state.treatsUsed,
  );
}

export function coinBalance(state: PetState, facts: ProgressFacts): number {
  return Math.max(
    0,
    coinsEarned(facts) + state.gameCoins + state.coinsAdjust - state.coinsSpent,
  );
}

function bump(
  needs: Needs,
  fx: Partial<Record<"health" | "happiness" | "dirt", number>>,
): Needs {
  return {
    ...needs,
    health: clamp(needs.health + (fx.health ?? 0)),
    happiness: clamp(needs.happiness + (fx.happiness ?? 0)),
    dirt: clamp(needs.dirt + (fx.dirt ?? 0)),
  };
}

/** Applies one agent action. Always returns a state (unchanged on failure) so callers can re-render safely. */
export function applyPetAction(
  prev: PetState,
  action: PetAction,
  ctx: PetContext,
): PetResult {
  const catalog = ctx.catalog ?? CLOSET;
  const state = refreshPetState(prev, ctx.now);
  const fail = (reason: PetFailure): PetResult => ({
    ok: false,
    reason,
    state,
  });

  switch (action.type) {
    case "pet": {
      const cheer = state.day.pets < PETS_PER_DAY;
      return {
        ok: true,
        state: {
          ...state,
          needs: cheer ? bump(state.needs, CARE_EFFECTS.pet) : state.needs,
          day: { ...state.day, pets: state.day.pets + 1 },
        },
      };
    }
    case "feed": {
      if (action.food) {
        const food = findFood(action.food);
        if (!food) return fail("unknown-item");
        const have = state.inventory[food.id] ?? 0;
        if (have <= 0) return fail("no-food");
        const inventory = { ...state.inventory, [food.id]: have - 1 };
        if (inventory[food.id]! <= 0) delete inventory[food.id];
        return {
          ok: true,
          state: {
            ...state,
            inventory,
            needs: bump(state.needs, {
              health: food.health,
              happiness: food.happiness,
            }),
          },
        };
      }
      if (treatsAvailable(state, ctx.facts) <= 0) return fail("no-treats");
      return {
        ok: true,
        state: {
          ...state,
          treatsUsed: state.treatsUsed + 1,
          needs: bump(state.needs, CARE_EFFECTS.feed),
        },
      };
    }
    case "play":
      return {
        ok: true,
        state: {
          ...state,
          needs: bump(state.needs, CARE_EFFECTS.play),
          day: { ...state.day, plays: state.day.plays + 1 },
        },
      };
    case "bath": {
      const soap = findSoap(action.soap ?? STARTER_SOAP);
      if (!soap) return fail("unknown-item");
      if (!state.inventory[soap.id] && soap.id !== STARTER_SOAP)
        return fail("no-soap");
      const wasDirty = state.needs.dirt >= 20;
      const base = wasDirty ? CARE_EFFECTS.bath : { dirt: -100, happiness: 1 };
      const fx = { ...base, happiness: (base.happiness ?? 0) + soap.happiness };
      return {
        ok: true,
        state: {
          ...state,
          needs: bump(state.needs, fx),
          day: { ...state.day, baths: state.day.baths + 1 },
        },
      };
    }
    case "buyFood": {
      const food = findFood(action.foodId);
      if (!food) return fail("unknown-item");
      const qty = Math.max(
        1,
        Math.min(10, Math.floor(Number(action.qty ?? 1)) || 1),
      );
      const price = pantryPrice(ctx.overrides, food.id, food.price) * qty;
      if (pantryDisabled(ctx.overrides, food.id, ctx.now))
        return fail("unavailable");
      if (coinBalance(state, ctx.facts) < price) return fail("coins");
      return {
        ok: true,
        state: {
          ...state,
          coinsSpent: state.coinsSpent + price,
          inventory: {
            ...state.inventory,
            [food.id]: (state.inventory[food.id] ?? 0) + qty,
          },
        },
        ledger: {
          delta: -price,
          kind: "purchase",
          itemId: food.id,
          note: qty > 1 ? `x${qty}` : undefined,
        },
      };
    }
    case "buySoap": {
      const soap = findSoap(action.soapId);
      if (!soap) return fail("unknown-item");
      if (state.inventory[soap.id]) return fail("owned");
      if (pantryDisabled(ctx.overrides, soap.id, ctx.now))
        return fail("unavailable");
      const price = pantryPrice(ctx.overrides, soap.id, soap.price);
      if (coinBalance(state, ctx.facts) < price) return fail("coins");
      return {
        ok: true,
        state: {
          ...state,
          coinsSpent: state.coinsSpent + price,
          inventory: { ...state.inventory, [soap.id]: 1 },
        },
        ledger: { delta: -price, kind: "purchase", itemId: soap.id },
      };
    }
    case "keepy": {
      const streak = Math.floor(Number(action.touches));
      if (!Number.isFinite(streak) || streak < 1) return fail("invalid");
      const s = Math.min(KEEPY_MAX_STREAK, streak);
      const paid = payGame(state, keepyReward(s));
      const next: PetState = {
        ...paid.state,
        needs: bump(paid.state.needs, {
          happiness: Math.min(10, 2 + Math.floor(s / 4)),
        }),
        games: {
          ...paid.state.games,
          bestKeepy: Math.max(paid.state.games.bestKeepy, s),
          keepyRounds: paid.state.games.keepyRounds + 1,
        },
      };
      return {
        ok: true,
        state: next,
        reward: { coins: paid.coins, xp: paid.xp },
        ledger:
          paid.coins > 0
            ? { delta: paid.coins, kind: "game", note: `Keep-it-up x${s}` }
            : undefined,
        xp:
          paid.xp > 0
            ? { xp: paid.xp, reason: `Keep-it-up streak of ${s}` }
            : undefined,
      };
    }
    case "litter": {
      const piece = state.litter.items.find((i) => i.id === action.id);
      if (!piece) return fail("gone");
      const paid = payGame(state, litterReward(piece.id, state.litter.seed));
      const next: PetState = {
        ...paid.state,
        litter: {
          ...paid.state.litter,
          items: paid.state.litter.items.filter((i) => i.id !== piece.id),
        },
        needs: bump(paid.state.needs, { happiness: 2 }),
        games: {
          ...paid.state.games,
          litterCleaned: paid.state.games.litterCleaned + 1,
        },
      };
      return {
        ok: true,
        state: next,
        reward: { coins: paid.coins, xp: paid.xp },
        ledger:
          paid.coins > 0
            ? { delta: paid.coins, kind: "game", note: "Picked up litter" }
            : undefined,
        xp:
          paid.xp > 0
            ? { xp: paid.xp, reason: "Kept Rocky’s world clean" }
            : undefined,
      };
    }
    case "arcade": {
      if (!(ARCADE_GAMES as readonly string[]).includes(action.game))
        return fail("invalid");
      const score = Math.floor(Number(action.score));
      if (!Number.isFinite(score) || score < 0) return fail("invalid");
      const clamped = Math.min(ARCADE_MAX_SCORE[action.game], score);
      const coins = Math.max(
        0,
        Math.min(
          arcadeReward(action.game, clamped),
          ARCADE_CAP.coins - state.games.arcadeCoins,
        ),
      );
      const best = Math.max(state.games.arcadeBest[action.game] ?? 0, clamped);
      const next: PetState = {
        ...state,
        gameCoins: state.gameCoins + coins,
        needs: bump(state.needs, { happiness: 3 }),
        games: {
          ...state.games,
          arcadeCoins: state.games.arcadeCoins + coins,
          arcadeRounds: state.games.arcadeRounds + 1,
          arcadeBest: { ...state.games.arcadeBest, [action.game]: best },
        },
      };
      return {
        ok: true,
        state: next,
        reward: { coins, xp: 0 },
        ledger:
          coins > 0
            ? {
                delta: coins,
                kind: "game",
                note: `Arcade: ${ARCADE_NAMES[action.game]} (${clamped})`,
              }
            : undefined,
      };
    }
    case "readInbox":
      return {
        ok: true,
        state: { ...state, inboxReadAt: ctx.now.toISOString() },
      };
    case "buy": {
      const item = findItem(action.itemId, catalog);
      if (!item) return fail("unknown-item");
      if (
        item.price === 0 ||
        state.owned.includes(item.id) ||
        state.granted.includes(item.id)
      )
        return fail("owned");
      if (item.enabled === false) return fail("unavailable");
      if (!item.isUnlocked(ctx.facts)) return fail("locked");
      if (coinBalance(state, ctx.facts) < item.price) return fail("coins");
      return {
        ok: true,
        state: {
          ...state,
          owned: [...state.owned, item.id],
          coinsSpent: state.coinsSpent + item.price,
        },
        ledger: { delta: -item.price, kind: "purchase", itemId: item.id },
      };
    }
    case "buyTreats": {
      if (coinBalance(state, ctx.facts) < TREAT_BAG.price) return fail("coins");
      return {
        ok: true,
        state: {
          ...state,
          coinsSpent: state.coinsSpent + TREAT_BAG.price,
          bonusTreats: state.bonusTreats + TREAT_BAG.treats,
        },
        ledger: {
          delta: -TREAT_BAG.price,
          kind: "treat-bag",
          itemId: TREAT_BAG.id,
        },
      };
    }
    case "quiz": {
      if (!action.answers || typeof action.answers !== "object")
        return fail("invalid");
      const answers: Record<string, number> = {};
      for (const [k, v] of Object.entries(action.answers))
        if (typeof v === "number" && Number.isInteger(v)) answers[k] = v;
      const { correct, total } = scoreQuiz(answers, ctx.now);
      const today = todayKey(ctx.now);
      const firstToday = !(state.quiz.date === today && state.quiz.rewarded);
      const perfect = correct === total && total > 0;
      // Only the first round of the day pays out; replays are practice.
      const reward = firstToday
        ? correct * QUIZ_REWARD.perCorrect +
          (perfect ? QUIZ_REWARD.perfectBonus : 0)
        : 0;
      const next: PetState = {
        ...state,
        gameCoins: state.gameCoins + reward,
        bonusTreats:
          state.bonusTreats +
          (firstToday && perfect ? QUIZ_REWARD.perfectTreats : 0),
        // A little happiness: Rocky loves it when you practise.
        needs: bump(state.needs, { happiness: 3 + correct }),
        quiz: {
          date: today,
          rewarded: true,
          lastScore: correct,
          lastTotal: total,
          lastReward: reward,
          played: state.quiz.played + 1,
          perfectRounds: state.quiz.perfectRounds + (perfect ? 1 : 0),
        },
      };
      return {
        ok: true,
        state: next,
        ledger:
          reward > 0
            ? {
                delta: reward,
                kind: "quiz",
                note: `Note Check ${correct}/${total}`,
              }
            : undefined,
      };
    }
    case "equip": {
      if (!action.outfit || typeof action.outfit !== "object")
        return fail("invalid");
      return {
        ok: true,
        state: {
          ...state,
          outfit: sanitizeOutfit(
            action.outfit,
            ctx.facts,
            state.owned,
            state.granted,
            catalog,
          ),
        },
      };
    }
    default:
      return fail("invalid");
  }
}

/** Admin price/availability edits apply to pantry items too (same overrides as the shop). */
function pantryPrice(
  overrides: CatalogOverrides | undefined,
  id: string,
  base: number,
): number {
  const p = overrides?.[id]?.price;
  return typeof p === "number" && Number.isFinite(p) && p >= 0
    ? Math.round(p)
    : base;
}

/** Taken out of the shop by an admin, or part of a limited collection that is closed right now. */
function pantryDisabled(
  overrides: CatalogOverrides | undefined,
  id: string,
  now: Date,
): boolean {
  if (overrides?.[id]?.enabled === false) return true;
  const season = (findFood(id) ?? findSoap(id))?.season;
  return season !== undefined && !collectionOpen(overrides, season, now);
}

/** Unread inbox entries (messages, gifts, visits). */
export function unreadInbox(state: PetState): InboxEntry[] {
  return state.inbox.filter(
    (e) => !state.inboxReadAt || e.at > state.inboxReadAt,
  );
}

// ---------------------------------------------------------------------------
// Friends: visits between Rockys (the backend applies both sides together).
// ---------------------------------------------------------------------------
export type VisitKind = "pet" | "wave" | "treat";

/** The visitor's side: the first visit to each friend a day pays a few coins; giving a treat uses one of the visitor's treats. */
export function visitorSide(
  prev: PetState,
  friendKey: string,
  kind: VisitKind,
  facts: ProgressFacts,
  now: Date,
): PetResult & { firstToday?: boolean } {
  const state = refreshPetState(prev, now);
  if (kind === "treat" && treatsAvailable(state, facts) <= 0)
    return { ok: false, reason: "no-treats", state };
  const firstToday = !state.social.visited.includes(friendKey);
  const pays = firstToday && state.social.visited.length < VISIT_REWARD.perDay;
  const next: PetState = {
    ...state,
    treatsUsed: state.treatsUsed + (kind === "treat" ? 1 : 0),
    gameCoins: state.gameCoins + (pays ? VISIT_REWARD.coins : 0),
    social: {
      ...state.social,
      visited: firstToday
        ? [...state.social.visited, friendKey]
        : state.social.visited,
    },
  };
  return {
    ok: true,
    state: next,
    firstToday,
    reward: { coins: pays ? VISIT_REWARD.coins : 0, xp: 0 },
    ledger: pays
      ? { delta: VISIT_REWARD.coins, kind: "social", note: "Visited a friend" }
      : undefined,
  };
}

/** The host's side: a visit cheers Rocky up and shows in the inbox; a treat becomes a bonus treat. */
export function hostSide(
  prev: PetState,
  fromName: string,
  kind: VisitKind,
  now: Date,
): PetState {
  const state = refreshPetState(prev, now);
  const text =
    kind === "treat"
      ? `${fromName} visited and gave Rocky a treat!`
      : kind === "wave"
        ? `${fromName} stopped by to wave hi.`
        : `${fromName} visited and petted Rocky.`;
  const next: PetState = {
    ...state,
    bonusTreats: state.bonusTreats + (kind === "treat" ? 1 : 0),
    needs: bump(state.needs, { happiness: VISIT_REWARD.hostHappiness }),
  };
  return inboxPush(next, {
    id: `v-${now.getTime()}-${fromName.length}`,
    kind: "visit",
    from: fromName,
    text,
    at: now.toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Admin operations (backend only; each one is recorded in the audit trail).
// ---------------------------------------------------------------------------

/** Grants (positive) or takes away (negative) coins. Never lets the balance go below zero. */
export function adminAdjustCoins(
  state: PetState,
  delta: number,
  facts: ProgressFacts,
  note?: string,
): { state: PetState; ledger: LedgerEntry } {
  const whole = Math.trunc(delta);
  const applied =
    whole < 0 ? -Math.min(-whole, coinBalance(state, facts)) : whole;
  return {
    state: { ...state, coinsAdjust: state.coinsAdjust + applied },
    ledger: {
      delta: applied,
      kind: applied >= 0 ? "admin-grant" : "admin-deduct",
      note,
    },
  };
}

/** Gives an item to the agent for free, bypassing its progress unlock. */
export function adminGrantItem(state: PetState, itemId: string): PetState {
  return state.granted.includes(itemId)
    ? state
    : { ...state, granted: [...state.granted, itemId] };
}

/** Takes an item away (gift or purchase — purchases are not refunded unless the admin also grants coins). */
export function adminRevokeItem(
  state: PetState,
  itemId: string,
  facts: ProgressFacts,
  catalog: ClosetItem[] = CLOSET,
): PetState {
  const next = {
    ...state,
    granted: state.granted.filter((i) => i !== itemId),
    owned: state.owned.filter((i) => i !== itemId),
  };
  return {
    ...next,
    outfit: sanitizeOutfit(
      next.outfit,
      facts,
      next.owned,
      next.granted,
      catalog,
    ),
  };
}

/** Restores the needs (full health, happy, clean) — e.g. after an outage or on request. */
export function adminRestoreNeeds(state: PetState, now: Date): PetState {
  return {
    ...state,
    needs: {
      health: 100,
      happiness: 100,
      dirt: 0,
      updatedAt: now.toISOString(),
    },
  };
}

/** Gives (positive) or removes (negative) foods; soaps are given once. */
export function adminGiveInventory(
  state: PetState,
  itemId: string,
  qty: number,
): PetState {
  if (findSoap(itemId)) {
    if (qty < 0 && itemId !== STARTER_SOAP) {
      const inventory = { ...state.inventory };
      delete inventory[itemId];
      return { ...state, inventory };
    }
    return { ...state, inventory: { ...state.inventory, [itemId]: 1 } };
  }
  if (!findFood(itemId)) return state;
  const n = Math.max(
    0,
    Math.min(999, (state.inventory[itemId] ?? 0) + Math.trunc(qty)),
  );
  const inventory = { ...state.inventory, [itemId]: n };
  if (n === 0) delete inventory[itemId];
  return { ...state, inventory };
}

/** Puts a message (or a gift note) from QA in the agent's inbox. */
export function adminMessage(
  state: PetState,
  entry: Omit<InboxEntry, "id">,
  id: string,
): PetState {
  return inboxPush(state, { ...entry, id });
}

/** Clears all litter (and restarts the timer). */
export function adminClearLitter(state: PetState, now: Date): PetState {
  return {
    ...state,
    litter: { ...state.litter, items: [], lastAt: now.toISOString() },
  };
}

/** Resets today's mini-game caps (lets the agent earn again today). */
export function adminResetGameCaps(state: PetState, now: Date): PetState {
  return {
    ...state,
    games: { ...state.games, date: todayKey(now), coins: 0, xp: 0 },
  };
}

/** Adds treats (positive) or removes unused bonus treats (negative). */
export function adminAdjustTreats(state: PetState, delta: number): PetState {
  return {
    ...state,
    bonusTreats: Math.max(0, state.bonusTreats + Math.trunc(delta)),
  };
}

/** Whether `item` is usable for this agent — convenience for UIs. */
export function canUse(
  state: PetState,
  item: ClosetItem,
  facts: ProgressFacts,
): boolean {
  return isUsable(item, facts, state.owned, state.granted);
}

/** How Rocky feels about his needs, for speech lines and the needs dock. */
export function needsSummary(
  needs: Needs,
): "dirty" | "sad" | "unwell" | "great" | "ok" {
  if (needs.health < 35) return "unwell";
  if (needs.dirt >= NEEDS_RATES.dirtyThreshold) return "dirty";
  if (needs.happiness <= 30) return "sad";
  if (needs.health >= 80 && needs.happiness >= 70 && needs.dirt < 30)
    return "great";
  return "ok";
}
