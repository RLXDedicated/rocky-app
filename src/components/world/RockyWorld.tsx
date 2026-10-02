import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { EvolutionStage, Mood } from "../../types/domain";
import type { Outfit } from "../../game/closet";
import { needsSummary, type Needs } from "../../game/pet";
import { isMuted, play as playSfx, setMuted } from "../../game/sfx";
import { EMOTE_POSE, worldAnchor, worldRig, type RockyEmote } from "../rockyWorldRig";
import { PUPPET_ANCHOR, PUPPET_RIG, puppetEnabled, RockyPuppet } from "./RockyPuppet";
import {
  getPoseAsset,
  getReactionAsset,
  getRockyAsset,
  ROCKY_VISUALS,
  type RockyReactionKey,
} from "../rockyVisuals";
import {
  DECOR_ART,
  HAT_ART,
  SceneArt,
  hatPlacement,
  type DecorPlay,
} from "./art";
import {
  findItem,
  MAX_DECOR,
  SIZE_LABELS,
  SIZE_STEPS,
  SPOT_MAX,
  RISE_MAX,
  SPOT_MIN,
} from "../../game/closet";
import { Ball, type BallHandle } from "./Ball";
import {
  FOODS,
  SOAPS,
  BASIC_TREAT,
  findFood,
  findSoap,
  STARTER_SOAP,
  type LitterPiece,
} from "../../game/pantry";
import { InventoryTray, type TrayItem, type TrayTab } from "./InventoryTray";
import { BinArt, FOOD_ART, LITTER_ART, SOAP_ART } from "./items";
import { FxLayer } from "./FxLayer";
import { Coin } from "./Coin";
import {
  BACK_ART,
  BODY_ART,
  GLASSES_ART,
  NECK_ART,
  WEAR_VIEWBOX,
  backPlacement,
  bodyPlacement,
  glassesPlacement,
  neckPlacement,
} from "./wearables";
import { NeedsDock } from "./NeedsDock";
import styles from "./World.module.css";
import { GuestRocky, type Guest } from "./GuestRocky";
import { VipAura } from "./VipAura";
import { RetryImg } from "../assetRecovery";

type Pose = "idle" | "walk" | "run" | "pet" | "eat" | "hop" | "bath";

interface Particle {
  id: number;
  x: number;
  kind: "heart" | "crumb" | "bubble" | "sparkle" | "zzz" | "note" | "coin";
  /** Extra offsets so bursts don't stack in one column. */
  dx: number;
  dy: number;
}

/** Something the agent is dragging: food or soap from the bag, or litter to the bin. */
interface Held {
  what: "food" | "soap" | "litter";
  id: string;
  art: ReactElement;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
  /** Over Rocky (food/soap) or over the bin (litter). */
  over: boolean;
}

interface FoamSpot {
  id: number;
  /** % of the actor box. */
  x: number;
  y: number;
  s: number;
  c: string;
}

interface RewardPop {
  id: number;
  x: number;
  text: string;
}

interface Props {
  mood: Mood;
  stage: EvolutionStage;
  reaction: RockyReactionKey | null;
  outfit: Outfit;
  /** What Rocky says (mood line or a check-in reaction). */
  speech: string;
  treats: number;
  needs: Needs;
  /** Care actions: each returns false when it can't happen (e.g. no treats). */
  onPet: () => boolean;
  /** Feeds a food from the bag (or, without an id, one of the earned treats). */
  onFeed: (food?: string) => boolean;
  onPlay: () => boolean;
  onBath: (soap?: string) => boolean;
  /** Foods and soaps the agent has. */
  inventory?: Record<string, number>;
  /** Litter lying around (drag it to the bin). */
  litter?: LitterPiece[];
  /** A keep-it-up streak ended; returns what it paid (null when nothing). */
  onKeepy?: (touches: number) => { coins: number; xp: number } | null;
  /** A piece of litter went in the bin; returns what it paid. */
  onLitter?: (id: string) => { coins: number; xp: number } | null;
  /** Opens the shop's pantry (food or soaps). */
  onOpenPantry?: (tab: TrayTab) => void;
  /** Take a photo of Rocky (the camera button). */
  onPhoto?: () => void;
  /** Visiting a friend: no bag, no litter, no arranging. */
  visitor?: boolean;
  /** Other agents' Rockys here live (visitors, or the host when you visit). */
  guests?: Guest[];
  /** Emoji reactions floating up from the main Rocky (sent live by others). */
  floatReacts?: { id: number; emoji: string }[];
  /** A Rocky admin's Rocky: golden aura. */
  vip?: boolean;
  /** Visiting live: the host moves their own Rocky; he walks to where they put him (no wandering). */
  controlledX?: number | null;
  /** Visiting: a tap on the floor moves the visitor's own Rocky instead of the host's. */
  onFloorClick?: (x: number) => void;
  /** Called when Rocky walks somewhere (to mirror him to live visitors). */
  onRockyMove?: (x: number) => void;
  /** Top overlay (name tag, level, shop). */
  hud: ReactNode;
  /** The primary action (check-in). */
  action: ReactNode;
  /** Arrange mode: the agent drags placed items around the scene. */
  arranging?: boolean;
  onStartArrange?: () => void;
  /** Saves (or, with null, cancels) the new layout. */
  onArrangeDone?: (layout: Layout | null) => void;
}

/** Placed items: which, where (centre, % of the stage) and how big (a SIZE_STEPS multiple). */
export interface Layout {
  /** Drawing order too: later items stand in front of earlier ones. */
  decor: string[];
  spots: Record<string, number>;
  sizes: Record<string, number>;
  /** Height above the floor, % of the stage height (small things can sit on others). */
  rises: Record<string, number>;
}

/**
 * How wide a placed item is drawn, in px. Items scale with Rocky (not with
 * the stage), so a lamp stands taller than him on a phone as on a desktop.
 */
export function decorWidthPx(
  id: string,
  rockySize: number,
  sizes: Record<string, number> | undefined,
): number {
  const d = DECOR_ART[id];
  return d ? (d.width / 100) * rockySize * DECOR_SCALE * (sizes?.[id] ?? 1) : 0;
}
/** Rocky's size → the reference width decor art is drawn against (≈ the desktop stage). */
const DECOR_SCALE = 3.2;

/** Where a placed item stands (its centre, % of the stage width). */
export function decorSpot(
  id: string,
  spots: Record<string, number> | undefined,
): number {
  const d = DECOR_ART[id];
  return spots?.[id] ?? (d ? d.left + d.width / 2 : 50);
}

/** Rocky's lines when he visits an item. */
const VISIT_LINES: Record<DecorPlay, readonly string[]> = {
  eat: ["Snack time!", "Mmm, crunchy.", "Just a little bite…"],
  rest: [
    "Nice spot for a break.",
    "Ahh, sitting down feels good.",
    "Break time — then back to the notes!",
  ],
  nap: ["Zzz… five more minutes…", "Power nap!", "Dreaming of perfect notes…"],
  cheer: ["We did it, team!", "Look at that!", "Go Rocky, go!"],
  sniff: ["Smells like… teamwork.", "Ooh, what’s this?", "Sniff sniff!"],
  vroom: ["Vroom vroom!", "Out for delivery!", "Beep beep!"],
  peek: ["Any mail for me?", "What’s inside?", "Package check: all noted!"],
};
const VISIT_POSE: Record<DecorPlay, Pose> = {
  eat: "eat",
  rest: "pet",
  nap: "pet",
  cheer: "hop",
  sniff: "pet",
  vroom: "hop",
  peek: "pet",
};

const FLOOR = 15; // default floor, % from the bottom of the stage
/** The litter bin: by default at the far right edge, out of Rocky's way. */
const BIN_KEY = "rocky.bin";
const BIN_DEFAULT = { x: 96, rise: 0 };
/** Space kept between the top of the care panel and the floor Rocky walks on. */
const FLOOR_GAP = 20;
const PET_LINES = [
  "Hehe, that tickles!",
  "Right behind the horns!",
  "More scratches, please!",
  "Best teammate ever.",
];
const FEED_LINES = [
  "Nom nom nom!",
  "Delicious. Thank you!",
  "Crunchy! Rocky approves.",
];
const PLAY_LINES = ["Goooal!", "Again! Again!", "Did you see that kick?"];
const PLAY_START = "Ball! Let’s play!";
/** How long Rocky plays with the ball before the final kick. */
const PLAY_MS = 6000;
/** Rocky's walkable band, % of the stage width. */
const WALK_MIN = 12;
const WALK_MAX = 88;
const BATH_LINES = ["Squeaky clean!", "Ahh, bubbles!", "Fresh as a daisy."];
const LITTER_LINES = [
  "Thanks for keeping our place tidy!",
  "Clean route, happy Rocky!",
  "Into the bin it goes!",
  "Tidy world, tidy notes!",
];
/** Longest a play session can run, even while the agent keeps the ball up (then Rocky takes the final shot). */
const KEEPY_MAX_MS = 20_000;
/** A second touch this soon after the last one is the same tap echoing (pointerdown, then click). */
const TAP_ECHO_MS = 350;
/** A tap this close (px) to the ball counts as a kick. */
const NEAR_KICK_PX = 100;
/** How much scrubbing a bath takes: pointer travel over Rocky, in multiples of his size. */
const SCRUB_DISTANCE = 6;
/** Where stink lines rise (left %, top % of the actor box): beside the body and above the head, never over the face. */
const STINK_SPOTS: Array<[number, number]> = [
  [12, 42],
  [80, 40],
  [18, 10],
  [74, 6],
  [8, 62],
];
const NEED_LINES = {
  dirty: "I could really use a bath…",
  sad: "Play with me? Pretty please?",
  unwell: "I’m not feeling great. A treat and a bath would help.",
} as const;

// Short official-pose moments: which one expresses each mood now and then.
const MOOD_CLIP: Record<Mood, RockyEmote> = {
  Happy: "Happy",
  Motivated: "Motivated",
  Worried: "Worried",
  Recovery: "Recovery",
};
const BATH_MS = 2600;

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Rocky's world: a scene with Rocky walking around in his outfit. Tap him
 * to pet, give a treat, kick a ball around or give him a bath. Care keeps
 * his health, happiness and cleanliness up — for fun and connection only;
 * nothing here changes XP, Energy or Streak.
 */
export function RockyWorld({
  mood,
  stage,
  reaction,
  outfit,
  speech,
  treats,
  needs,
  onPet,
  onFeed,
  onPlay,
  onBath,
  hud,
  action,
  arranging = false,
  onStartArrange,
  onArrangeDone,
  inventory = {},
  litter = [],
  onKeepy,
  onLitter,
  onOpenPantry,
  onPhoto,
  visitor = false,
  guests = [],
  floatReacts = [],
  onRockyMove,
  vip = false,
  controlledX = null,
  onFloorClick,
}: Props) {
  const [x, setX] = useState(50);
  const onRockyMoveRef = useRef(onRockyMove);
  onRockyMoveRef.current = onRockyMove;
  useEffect(() => {
    onRockyMoveRef.current?.(x);
  }, [x]);
  const [pose, setPose] = useState<Pose>("idle");
  const [walkMs, setWalkMs] = useState(0);
  const [facingLeft, setFacingLeft] = useState(false);
  const [localLine, setLocalLine] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ball, setBall] = useState<{
    id: number;
    x: number;
    final: boolean;
  } | null>(null);
  const ballRef = useRef<BallHandle>(null);
  // What Rocky's eyes follow: the ball while playing, or where the agent clicked.
  const gazeRef = useRef<{ x: number; y: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [clickMark, setClickMark] = useState<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const [treatFlying, setTreatFlying] = useState(false);
  // Rocky's bag, and whatever the agent is dragging out of it (or litter to the bin).
  const [tray, setTray] = useState<TrayTab | null>(null);
  const [held, setHeld] = useState<Held | null>(null);
  const heldRef = useRef<Held | null>(null);
  heldRef.current = held;
  const actorRef = useRef<HTMLDivElement>(null);
  const binRef = useRef<HTMLDivElement>(null);
  const [binOpen, setBinOpen] = useState(false);
  // Where the bin stands (each agent places it in arrange mode; kept in this browser).
  const [binSpot, setBinSpot] = useState<{ x: number; rise: number }>(() => {
    try {
      const v = JSON.parse(window.localStorage.getItem(BIN_KEY) ?? "null") as { x?: unknown; rise?: unknown } | null;
      if (v && typeof v.x === "number" && typeof v.rise === "number")
        return { x: Math.max(3, Math.min(97, v.x)), rise: Math.max(0, Math.min(RISE_MAX, v.rise)) };
    } catch {
      /* storage blocked: default spot */
    }
    return BIN_DEFAULT;
  });
  const binDrag = useRef<{ pointer: number; dx: number; dy: number } | null>(null);
  // Scrubbing: foam builds up where the soap goes; at 100% Rocky gets rinsed.
  const [foam, setFoam] = useState<FoamSpot[]>([]);
  const [scrub, setScrub] = useState(0);
  const scrubRef = useRef({
    progress: 0,
    lastX: 0,
    lastY: 0,
    lastFoam: 0,
    lastSound: 0,
  });
  const foamTimer = useRef(0);
  // Keep-it-up: taps in a row without the ball touching the ground.
  const [touches, setTouches] = useState(0);
  const touchesRef = useRef(0);
  // When the ball was last touched: the click that follows a tap on the ball
  // lands on the stage (the ball has already flown off) and must not count again.
  const lastTouchAt = useRef(0);
  const [rewards, setRewards] = useState<RewardPop[]>([]);
  // Litter the agent has just thrown away (hidden until the server agrees).
  const [binned, setBinned] = useState<string[]>([]);
  // The layout being arranged (a draft until the agent taps Done).
  const [draft, setDraft] = useState<Layout | null>(null);
  const dragRef = useRef<{
    id: string;
    pointer: number;
    dx: number;
    dy: number;
    startX: number;
    startY: number;
  } | null>(null);
  // The item whose edit panel (size, put away) is open in arrange mode.
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    if (arranging) {
      const spots: Record<string, number> = {};
      for (const id of outfit.decor) spots[id] = decorSpot(id, outfit.spots);
      setDraft({ decor: [...outfit.decor], spots, sizes: { ...outfit.sizes }, rises: { ...(outfit.rises ?? {}) } });
    } else setDraft(null);
    setEditing(null);
    // Only when arrange mode toggles: the draft must not reset mid-drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arranging]);
  const [muted, setMutedState] = useState(() => isMuted());
  const busyRef = useRef(false);
  // Mirrors busyRef for rendering: care buttons are disabled while Rocky is mid-action.
  const [busy, setBusyState] = useState(false);
  const setBusy = (v: boolean) => {
    busyRef.current = v;
    setBusyState(v);
  };
  const idRef = useRef(0);
  const floorPxRef = useRef(0);
  const sizeRef = useRef(200);
  const worldRef = useRef<HTMLDivElement>(null);
  const [worldSize, setWorldSize] = useState({ w: 900, h: 420, dock: 0 });
  const dockRef = useRef<HTMLDivElement>(null);
  const worldSizeRef = useRef(worldSize);
  worldSizeRef.current = worldSize;
  // A short official pose (a cheer, a bite, a celebration) shown over his mood pose.
  const [emote, setEmote] = useState<RockyEmote | null>(null);
  const [usePuppet] = useState(puppetEnabled);
  const emoteTimer = useRef<number | undefined>(undefined);
  const hatRef = useRef<SVGSVGElement>(null);
  const glassesRef = useRef<SVGSVGElement>(null);
  const neckRef = useRef<SVGSVGElement>(null);
  const backRef = useRef<SVGSVGElement>(null);
  const shirtRef = useRef<SVGSVGElement>(null);
  const animate = !prefersReducedMotion();

  const playClip = useCallback((clip: RockyEmote) => {
    window.clearTimeout(emoteTimer.current);
    setEmote(clip);
    emoteTimer.current = window.setTimeout(() => setEmote(null), 1800);
  }, []);
  useEffect(() => () => window.clearTimeout(emoteTimer.current), []);

  // Check-in reactions show their official pose, with a little tune.
  useEffect(() => {
    if (!reaction) return;
    playSfx(
      reaction === "level-up" || reaction === "evolution" ? "fanfare" : "chime",
    );
  }, [reaction]);

  useEffect(() => {
    const el = worldRef.current;
    if (!el) return;
    // `dock`: how much of the stage's bottom the care panel covers (0 on
    // phones, where the panel sits below the stage instead of over it).
    const measure = () => {
      const stage = el.getBoundingClientRect();
      const dock = dockRef.current?.getBoundingClientRect();
      const covered = dock ? Math.max(0, stage.bottom - dock.top) : 0;
      setWorldSize({
        w: el.clientWidth || 900,
        h: el.clientHeight || 420,
        dock: covered,
      });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (dockRef.current) ro.observe(dockRef.current);
    return () => ro.disconnect();
  }, []);

  const say = useCallback((line: string, ms = 2600) => {
    setLocalLine(line);
    // Long enough to read: at least ~2 s plus a little per word.
    const readable = Math.max(ms, 1800 + line.length * 55);
    window.setTimeout(
      () => setLocalLine((cur) => (cur === line ? null : cur)),
      readable,
    );
  }, []);

  const burst = useCallback(
    (kind: Particle["kind"], count: number, atX: number, life = 1600) => {
      const fresh = Array.from({ length: count }, () => ({
        id: ++idRef.current,
        x: atX + (Math.random() * 10 - 5),
        kind,
        dx: Math.random() * 40 - 20,
        dy: Math.random() * 30,
      }));
      setParticles((p) => [...p, ...fresh]);
      window.setTimeout(
        () => setParticles((p) => p.filter((q) => !fresh.includes(q))),
        life,
      );
    },
    [],
  );

  const xRef = useRef(50);
  const arrangingRef = useRef(arranging);
  arrangingRef.current = arranging;
  const decorRef = useRef(outfit.decor);
  decorRef.current = outfit.decor;
  const spotsRef = useRef(outfit.spots);
  spotsRef.current = outfit.spots;
  const sizesRef = useRef(outfit.sizes);
  sizesRef.current = outfit.sizes;
  const walkTimer = useRef(0);
  const walkTo = useCallback((target: number, run = false): Promise<void> => {
    const from = xRef.current;
    // Never behind the care panel (bottom-left) or off the right edge.
    const clamped = Math.max(WALK_MIN, Math.min(WALK_MAX, target));
    const ms = prefersReducedMotion()
      ? 0
      : run
        ? Math.min(1400, Math.abs(clamped - from) * 16)
        : Math.abs(clamped - from) * 80; // constant walking speed
    xRef.current = clamped;
    if (Math.abs(clamped - from) > 0.5) setFacingLeft(clamped < from);
    setWalkMs(ms);
    setPose(ms > 0 ? (run ? "run" : "walk") : "idle");
    setX(clamped);
    window.clearTimeout(walkTimer.current);
    return new Promise((resolve) => {
      walkTimer.current = window.setTimeout(() => {
        setPose((p) => (p === "walk" || p === "run" ? "idle" : p));
        resolve();
      }, ms);
    });
  }, []);

  // Idle wandering along the route (not while someone else is steering him live).
  useEffect(() => {
    if (!animate || controlledX !== null) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(
        async () => {
          if (
            !busyRef.current &&
            !reaction &&
            !arrangingRef.current &&
            !heldRef.current &&
            touchesRef.current === 0
          ) {
            const items = decorRef.current.filter(
              (id) => DECOR_ART[id] && !DECOR_ART[id]!.lift,
            );
            // Now and then Rocky goes and plays with one of his things.
            if (items.length && Math.random() < 0.4)
              await visitRef.current(pick(items));
            else await walkTo(28 + Math.random() * 44);
          }
          schedule();
        },
        5000 + Math.random() * 5000,
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [walkTo, reaction, animate, controlledX !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // The host steering their Rocky live: walk where they put him.
  useEffect(() => {
    if (controlledX === null || Math.abs(controlledX - xRef.current) < 1) return;
    void walkTo(controlledX);
  }, [controlledX, walkTo]);

  // Every so often Rocky acts out his mood with a short official pose.
  useEffect(() => {
    if (!animate) return;
    const timer = window.setInterval(() => {
      if (!busyRef.current) playClip(MOOD_CLIP[mood]);
    }, 11000);
    return () => window.clearInterval(timer);
  }, [mood, playClip, animate]);

  function handlePet() {
    if (busyRef.current || !onPet()) return;
    setPose("pet");
    playClip("Happy");
    playSfx("pop");
    burst("heart", 3, x);
    say(pick(PET_LINES));
    window.setTimeout(() => setPose("idle"), 700);
  }

  /** Feeds Rocky: a treat thrown in (button), or food dropped right on him (from the bag). */
  function handleFeed(food?: string, dropped = false) {
    if (busyRef.current) return;
    if (!food && treats <= 0) {
      playSfx("nope");
      say(
        "No treats left — check-ins and clean audits earn more. Or grab a snack from the shop!",
      );
      return;
    }
    if (!onFeed(food)) {
      playSfx("nope");
      return;
    }
    setBusy(true);
    const eat = () => {
      setTreatFlying(false);
      setPose("eat");
      playClip("Eat");
      playSfx("chomp");
      burst("crumb", 6, xRef.current);
      burst("heart", 2, xRef.current);
      const item = findFood(food);
      say(item ? `${item.name}! ${pick(FEED_LINES)}` : pick(FEED_LINES));
      window.setTimeout(
        () => {
          setPose("idle");
          setBusy(false);
        },
        1400,
      );
    };
    if (dropped) {
      eat();
      return;
    }
    setTreatFlying(true);
    playSfx("tap");
    window.setTimeout(eat, 650);
  }

  /**
   * Play time: the ball drops in and for a while Rocky chases it, dribbling
   * it along; the agent can tap the ball to kick it around. Then Rocky
   * lines up and takes the final shot.
   */
  async function handlePlay() {
    if (busyRef.current) return;
    setBusy(true);
    setPlaying(true);
    const target = x > 50 ? 26 + Math.random() * 12 : 62 + Math.random() * 12;
    const id = ++idRef.current;
    setBall({ id, x: target, final: false });
    playSfx("tap");
    say(PLAY_START);
    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
    await wait(animate ? 900 : 200);

    if (animate) {
      let until = performance.now() + PLAY_MS;
      const hardStop = performance.now() + KEEPY_MAX_MS;
      let lastNudge = 0;
      while (performance.now() < until) {
        const b = ballRef.current?.position();
        if (!b) break;
        // While the agent keeps the ball up, Rocky cheers instead of taking it.
        if (touchesRef.current > 0) {
          until = Math.min(hardStop, Math.max(until, performance.now() + 1200));
          await wait(200);
          continue;
        }
        const bx = (b.x / worldSizeRef.current.w) * 100;
        const gap = bx - xRef.current;
        if (Math.abs(gap) > 7) {
          // Chase: stop just short of the ball, on the side it came from.
          void walkTo(bx - Math.sign(gap) * 5, true);
        } else if (b.y < 30 && performance.now() - lastNudge > 650) {
          // Dribble: a light touch in the direction Rocky is going.
          const dir =
            gap === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(gap);
          ballRef.current?.push(
            dir * (220 + Math.random() * 180),
            200 + Math.random() * 260,
          );
          playSfx("bounce");
          if (Math.random() < 0.35) burst("heart", 1, bx);
          lastNudge = performance.now();
        }
        await wait(260);
      }
    }

    // The final shot: run up to the ball and send it flying.
    endStreak();
    const b = ballRef.current?.position();
    const bx = b ? (b.x / worldSizeRef.current.w) * 100 : target;
    const side = bx > 50 ? 1 : -1; // shoot toward the nearer edge... from the inside
    await walkTo(bx - side * 6, true);
    setPose("hop");
    playClip("Celebrate");
    playSfx("kick");
    ballRef.current?.push(side * 900, 950);
    setBall((cur) => (cur?.id === id ? { ...cur, final: true } : cur));
    burst("heart", 3, bx);
    say(pick(PLAY_LINES));
    onPlay();
    window.setTimeout(() => {
      setPose("idle");
      setPlaying(false);
      setBusy(false);
    }, 1100);
  }

  /** Clicking/tapping the ground: Rocky walks (or runs, if it's far) to that spot and looks at it. */
  function handleStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as Element).closest("button")) return;
    if (arranging) {
      setEditing(null);
      return;
    }
    // A tap close to the moving ball counts as a kick: it's small and quick.
    if (
      ball &&
      !ball.final &&
      ballRef.current &&
      ballRef.current.distanceTo(e.clientX, e.clientY) < NEAR_KICK_PX
    ) {
      if (performance.now() - lastTouchAt.current < TAP_ECHO_MS) return;
      ballRef.current.kick(e.clientX, e.clientY);
      countTouch();
      return;
    }
    if (busyRef.current && !playing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    gazeRef.current = { x: e.clientX, y: e.clientY };
    window.setTimeout(() => {
      if (!ball) gazeRef.current = null;
    }, 1600);
    setClickMark({
      id: ++idRef.current,
      x: px,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
    if (onFloorClick) {
      onFloorClick(Math.max(5, Math.min(95, px)));
      return;
    }
    // Always the same calm pace, however far the tap (running is for the ball).
    if (!playing) void walkTo(px);
  }

  /**
   * Rocky walks over to a placed item and plays with it (just for fun — no
   * stats change). A bowl is the exception: eating from it is a real feed
   * and uses a treat; with no treats left the bowl is empty.
   */
  async function visitDecor(id: string) {
    const d = DECOR_ART[id];
    if (!d || busyRef.current || arrangingRef.current) return;
    setBusy(true);
    const cx = decorSpot(id, spotsRef.current);
    const w = worldSizeRef.current;
    const stage = worldRef.current?.getBoundingClientRect();
    if (stage)
      gazeRef.current = {
        x: stage.left + (cx / 100) * stage.width,
        y: stage.bottom - floorPxRef.current - 20,
      };
    // Stand beside it (or right on it, for the bed and things hanging overhead).
    const rockyHalf = (sizeRef.current / w.w) * 50;
    const side = xRef.current < cx ? -1 : 1;
    const onTop = d.play === "nap" || Boolean(d.lift);
    const halfPct =
      (decorWidthPx(id, sizeRef.current, sizesRef.current) / w.w) * 50;
    await walkTo(onTop ? cx : cx + side * (halfPct + rockyHalf * 0.55));
    // An earned treat first, else a snack from the bag.
    const snack = treats > 0 ? undefined : FOODS.find((f) => (inventory[f.id] ?? 0) > 0)?.id;
    const fed = d.play === "eat" && !visitor && (treats > 0 || Boolean(snack)) && onFeed(snack);
    const empty = d.play === "eat" && !fed;
    setPose(empty ? VISIT_POSE.sniff : VISIT_POSE[d.play]);
    const at = xRef.current;
    switch (empty ? "empty" : d.play) {
      case "empty":
        playSfx("tap");
        break;
      case "eat":
        playSfx("chomp");
        burst("crumb", 5, cx);
        burst("heart", 1, at);
        break;
      case "nap":
      case "rest":
        playSfx("yawn");
        burst("zzz", d.play === "nap" ? 3 : 1, at, 2200);
        break;
      case "cheer":
        playSfx("chime");
        burst("sparkle", 5, at, 1400);
        burst("heart", 2, at);
        break;
      case "vroom":
        playSfx("beep");
        burst("note", 2, cx);
        break;
      default:
        playSfx("tap");
        burst("sparkle", 2, cx, 1200);
    }
    say(
      empty
        ? visitor
          ? "Looks tasty… but it’s not my bowl to raid."
          : "The bowl’s empty… check-ins and clean audits earn treats."
        : pick(VISIT_LINES[d.play]),
      2400,
    );
    const hold = !animate
      ? 300
      : d.play === "nap"
        ? 2600
        : d.play === "rest"
          ? 1800
          : 1200;
    await new Promise((r) => window.setTimeout(r, hold));
    setPose("idle");
    gazeRef.current = null;
    setBusy(false);
  }
  const visitRef = useRef(visitDecor);
  visitRef.current = visitDecor;

  // Arrange mode: drag an item anywhere — along the floor and up (to stand
  // on a shelf or on top of another item).
  function stagePercent(clientX: number) {
    const rect = worldRef.current?.getBoundingClientRect();
    return rect ? ((clientX - rect.left) / rect.width) * 100 : 50;
  }
  /** Height above the floor, % of the stage height, at this pointer row. */
  function risePercent(clientY: number) {
    const rect = worldRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return ((rect.bottom - floorPxRef.current - clientY) / rect.height) * 100;
  }
  function startDrag(id: string, e: React.PointerEvent<HTMLButtonElement>) {
    if (!draft) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      pointer: e.pointerId,
      dx: (draft.spots[id] ?? 50) - stagePercent(e.clientX),
      dy: (draft.rises[id] ?? 0) - risePercent(e.clientY),
      startX: e.clientX,
      startY: e.clientY,
    };
  }
  function moveDrag(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointer !== e.pointerId) return;
    const nextX = Math.max(SPOT_MIN, Math.min(SPOT_MAX, stagePercent(e.clientX) + drag.dx));
    const nextY = Math.max(0, Math.min(RISE_MAX, risePercent(e.clientY) + drag.dy));
    setDraft((cur) => {
      if (!cur) return cur;
      const rises = { ...cur.rises };
      // Within a hair of the floor it snaps back down.
      if (nextY < 1.5) delete rises[drag.id];
      else rises[drag.id] = Math.round(nextY * 10) / 10;
      return { ...cur, spots: { ...cur.spots, [drag.id]: Math.round(nextX * 10) / 10 }, rises };
    });
  }
  function endDrag(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (drag?.pointer === e.pointerId) {
      dragRef.current = null;
      // A tap (no real drag) opens the item's edit panel.
      if (Math.abs(e.clientX - drag.startX) < 5 && Math.abs(e.clientY - drag.startY) < 5)
        setEditing((cur) => (cur === drag.id ? null : drag.id));
      else setEditing(drag.id);
      playSfx("tap");
    }
  }
  /** Layers: the item moves to the front (drawn last) or to the back (drawn first). */
  function layer(id: string, to: "front" | "back") {
    setDraft((cur) => {
      if (!cur) return cur;
      const rest = cur.decor.filter((d) => d !== id);
      return { ...cur, decor: to === "front" ? [...rest, id] : [id, ...rest] };
    });
    playSfx("pop");
  }
  function resize(id: string, step: number) {
    setDraft((cur) => {
      if (!cur) return cur;
      const sizes = { ...cur.sizes };
      if (step === 1) delete sizes[id];
      else sizes[id] = step;
      return { ...cur, sizes };
    });
    playSfx("pop");
  }
  function nudge(id: string, delta: number, axis: "x" | "y" = "x") {
    setDraft((cur) => {
      if (!cur) return cur;
      if (axis === "x")
        return { ...cur, spots: { ...cur.spots, [id]: Math.max(SPOT_MIN, Math.min(SPOT_MAX, (cur.spots[id] ?? 50) + delta)) } };
      const r = Math.max(0, Math.min(RISE_MAX, (cur.rises[id] ?? 0) + delta));
      const rises = { ...cur.rises };
      if (r === 0) delete rises[id];
      else rises[id] = r;
      return { ...cur, rises };
    });
  }
  function putAway(id: string) {
    const without = (r: Record<string, number>) =>
      Object.fromEntries(Object.entries(r).filter(([k]) => k !== id));
    setDraft((cur) =>
      cur
        ? {
            decor: cur.decor.filter((d) => d !== id),
            spots: without(cur.spots),
            sizes: without(cur.sizes),
            rises: without(cur.rises),
          }
        : cur,
    );
    setEditing(null);
    playSfx("pop");
  }

  /** The rinse: after scrubbing (or a quick bath from the keyboard) the shower washes the foam off. */
  function handleBath(soap: string = STARTER_SOAP) {
    if (busyRef.current || !onBath(soap)) return;
    setBusy(true);
    setPose("bath");
    playSfx("splash");
    burst("bubble", 10, xRef.current, BATH_MS);
    window.setTimeout(
      () => {
        setPose("idle");
        setFoam([]);
        setScrub(0);
        scrubRef.current.progress = 0;
        burst("sparkle", 7, xRef.current, 1400);
        playSfx("chime");
        say(pick(BATH_LINES));
        setBusy(false);
      },
      animate ? BATH_MS : 300,
    );
  }

  // ------------------------------------------------------------ keep-it-up
  function countTouch() {
    const now = performance.now();
    if (now - lastTouchAt.current < TAP_ECHO_MS) return;
    lastTouchAt.current = now;
    touchesRef.current += 1;
    setTouches(touchesRef.current);
    playSfx(touchesRef.current % 5 === 0 ? "chime" : "kick");
    if (touchesRef.current === 1) say("Keep it up! Don’t let it drop!", 1600);
    else if (touchesRef.current % 5 === 0)
      say(`${touchesRef.current} in a row!`, 1400);
  }

  function endStreak() {
    const n = touchesRef.current;
    if (n === 0) return;
    touchesRef.current = 0;
    setTouches(0);
    if (n < 3 || !onKeepy) return;
    const reward = onKeepy(n);
    const b = ballRef.current?.position();
    const at = b ? (b.x / worldSizeRef.current.w) * 100 : xRef.current;
    pop(at, `${n} in a row!`, reward);
    say(n >= 10 ? `WOW! ${n} in a row!` : `Nice! ${n} in a row!`, 2200);
  }

  /** A floating "+3 coins +1 XP" where something paid out. */
  function pop(
    atX: number,
    label: string,
    reward: { coins: number; xp: number } | null,
  ) {
    const parts = [label];
    if (reward?.coins) parts.push(`+${reward.coins} coins`);
    if (reward?.xp) parts.push(`+${reward.xp} XP`);
    if (reward && !reward.coins && !reward.xp && label)
      parts.push("daily max reached");
    const id = ++idRef.current;
    // Kept inside the stage so the label never gets cut at an edge.
    setRewards((r) => [
      ...r,
      { id, x: Math.max(14, Math.min(86, atX)), text: parts.join(" · ") },
    ]);
    if (reward?.coins) {
      playSfx("coin");
      burst("coin", Math.min(6, reward.coins), atX, 1400);
    }
    window.setTimeout(
      () => setRewards((r) => r.filter((p) => p.id !== id)),
      2600,
    );
  }

  // ------------------------------------------------ the bag and dragging
  const foodItems: TrayItem[] = [
    {
      id: BASIC_TREAT.id,
      name: BASIC_TREAT.name,
      count: treats,
      art: FOOD_ART.treat!,
      hint: "Earned by check-ins · +12 health",
    },
    ...FOODS.filter((f) => (inventory[f.id] ?? 0) > 0).map((f) => ({
      id: f.id,
      name: f.name,
      count: inventory[f.id] ?? 0,
      art: FOOD_ART[f.id] ?? FOOD_ART.treat!,
      hint: `+${f.health} health · +${f.happiness} happiness`,
    })),
  ];
  const soapItems: TrayItem[] = SOAPS.filter(
    (s) => s.id === STARTER_SOAP || inventory[s.id],
  ).map((s) => ({
    id: s.id,
    name: s.name,
    count: null,
    art: SOAP_ART[s.id] ?? SOAP_ART[STARTER_SOAP]!,
    hint: s.happiness ? `Clean · +${s.happiness} happiness` : "Squeaky clean",
  }));

  function useItem(item: TrayItem, tab: TrayTab) {
    if (tab === "food")
      handleFeed(item.id === BASIC_TREAT.id ? undefined : item.id, true);
    else handleBath(item.id);
    setTray(null);
  }

  function grab(
    what: Held["what"],
    id: string,
    art: ReactElement,
    e: React.PointerEvent<Element>,
  ) {
    if (busyRef.current || arranging) return;
    e.preventDefault();
    const next: Held = {
      what,
      id,
      art,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      over: false,
    };
    scrubRef.current.lastX = e.clientX;
    scrubRef.current.lastY = e.clientY;
    setHeld(next);
  }

  /** The part of the actor box Rocky's body actually fills. */
  function overRocky(cx: number, cy: number): boolean {
    const r = actorRef.current?.getBoundingClientRect();
    if (!r) return false;
    return (
      cx > r.left + r.width * 0.18 &&
      cx < r.right - r.width * 0.18 &&
      cy > r.top + r.height * 0.12 &&
      cy < r.bottom - r.height * 0.02
    );
  }

  function overBin(cx: number, cy: number): boolean {
    const r = binRef.current?.getBoundingClientRect();
    return Boolean(
      r &&
      cx > r.left - 24 &&
      cx < r.right + 24 &&
      cy > r.top - 40 &&
      cy < r.bottom + 10,
    );
  }

  useEffect(() => {
    if (!held) return;
    const move = (e: PointerEvent) => {
      const h = heldRef.current;
      if (!h) return;
      const moved =
        h.moved || Math.hypot(e.clientX - h.startX, e.clientY - h.startY) > 6;
      const over =
        h.what === "litter"
          ? overBin(e.clientX, e.clientY)
          : overRocky(e.clientX, e.clientY);
      if (h.what === "litter") setBinOpen(over);
      if (h.what !== "litter") gazeRef.current = { x: e.clientX, y: e.clientY };
      // Done scrubbing: the rinse takes over and the soap is put away.
      if (h.what === "soap" && over && scrubAt(e.clientX, e.clientY, h.id))
        return;
      scrubRef.current.lastX = e.clientX;
      scrubRef.current.lastY = e.clientY;
      setHeld({ ...h, x: e.clientX, y: e.clientY, moved, over });
    };
    const up = (e: PointerEvent) => {
      const h = heldRef.current;
      setHeld(null);
      setBinOpen(false);
      gazeRef.current = null;
      if (!h) return;
      if (h.what === "food") {
        if (!h.moved || overRocky(e.clientX, e.clientY)) {
          handleFeed(h.id === BASIC_TREAT.id ? undefined : h.id, true);
          setTray(null);
        }
      } else if (h.what === "soap") {
        if (!h.moved) say("Hold the soap and scrub me! 🧼", 2200);
        else if (scrubRef.current.progress < 1 && scrubRef.current.progress > 0)
          say("A bit more scrubbing…", 1600);
        // A bath left half-way: a few seconds to pick the soap up again, then
        // the foam rinses off and the scrub starts over.
        if (scrubRef.current.progress < 1) {
          window.clearTimeout(foamTimer.current);
          foamTimer.current = window.setTimeout(() => {
            if (heldRef.current?.what === "soap") return;
            setFoam([]);
            setScrub(0);
            scrubRef.current.progress = 0;
          }, 4000);
        }
      } else if (h.what === "litter") {
        if (h.moved && overBin(e.clientX, e.clientY)) throwAway(h.id);
        else if (!h.moved) say("Drag it to the bin!", 1600);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // Listeners are re-bound only when a new drag starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [held === null]);

  /** Adds foam where the soap passes; returns true once Rocky is fully scrubbed. */
  function scrubAt(cx: number, cy: number, soapId: string): boolean {
    const st = scrubRef.current;
    if (busyRef.current) return false;
    const dist = Math.hypot(cx - st.lastX, cy - st.lastY);
    if (dist <= 0) return false;
    st.progress = Math.min(1, st.progress + dist / (size * SCRUB_DISTANCE));
    setScrub(st.progress);
    const now = performance.now();
    const r = actorRef.current?.getBoundingClientRect();
    if (r && now - st.lastFoam > 45) {
      st.lastFoam = now;
      const soap = findSoap(soapId);
      const spot: FoamSpot = {
        id: ++idRef.current,
        x: ((cx - r.left) / r.width) * 100,
        y: ((cy - r.top) / r.height) * 100,
        s: 8 + Math.random() * 12,
        c: soap?.foam ?? "#ffffff",
      };
      setFoam((f) => [...f.slice(-70), spot]);
    }
    if (now - st.lastSound > 900) {
      st.lastSound = now;
      playSfx("bubble");
    }
    window.clearTimeout(foamTimer.current);
    // Foam that's left alone slowly disappears (and the scrub resets).
    foamTimer.current = window.setTimeout(() => {
      if (heldRef.current?.what === "soap") return;
      setFoam([]);
      setScrub(0);
      scrubRef.current.progress = 0;
    }, 12000);
    if (st.progress >= 1) {
      heldRef.current = null;
      setHeld(null);
      setTray(null);
      handleBath(soapId);
      return true;
    }
    return false;
  }

  function throwAway(id: string) {
    const piece = litter.find((l) => l.id === id);
    setBinned((b) => [...b, id]);
    playSfx("pop");
    const reward = onLitter ? onLitter(id) : null;
    const binX =
      binRef.current && worldRef.current
        ? ((binRef.current.getBoundingClientRect().left -
            worldRef.current.getBoundingClientRect().left) /
            worldSizeRef.current.w) *
          100
        : 90;
    pop(binX, "Clean!", reward);
    if (piece) say(pick(LITTER_LINES), 1800);
  }

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playSfx("pop");
  }

  // Rocky's size follows the world's height.
  // The floor sits above the care panel, so nothing Rocky plays with ever
  // ends up hidden (or unclickable) behind it.
  const floorPx = Math.max(
    (FLOOR / 100) * worldSize.h,
    worldSize.dock > 0 ? worldSize.dock + FLOOR_GAP : 0,
  );
  const size = Math.round(
    Math.min(
      340,
      Math.max(
        160,
        Math.min(worldSize.h * 0.6, (worldSize.h - floorPx - 40) * 0.95),
      ),
    ),
  );
  floorPxRef.current = floorPx;
  sizeRef.current = size;
  const layout: Layout = draft ?? {
    decor: outfit.decor,
    spots: outfit.spots,
    sizes: outfit.sizes ?? {},
    rises: outfit.rises ?? {},
  };
  // The cut-out puppet (preview, ?puppet=1) stands in for the calm moods;
  // a worried or tired Rocky keeps his official thinking / yawning pose.
  const puppet =
    usePuppet && !reaction && !emote && (mood === "Happy" || mood === "Motivated");
  const anchor = puppet ? PUPPET_ANCHOR : worldAnchor(mood);
  const src = reaction
    ? getReactionAsset(reaction)
    : emote
      ? getPoseAsset(EMOTE_POSE[emote])
      : getRockyAsset(stage, mood);
  // Worn items sit on poses whose head, eyes and hips are measured; they come
  // off for a reaction or a short emote (different poses) and for poses like
  // sitting, where they wouldn't fit.
  const rigPoints = puppet ? PUPPET_RIG : !reaction && !emote ? worldRig(mood) : null;
  const equippedHat = outfit.hat ? HAT_ART[outfit.hat] : undefined;
  const hat = rigPoints ? equippedHat : undefined;
  const hatBox = hat ? hatPlacement(anchor, hat, size) : null;
  const glasses =
    rigPoints && outfit.glasses ? GLASSES_ART[outfit.glasses] : undefined;
  const neckItem = rigPoints && outfit.neck ? NECK_ART[outfit.neck] : undefined;
  const backItem = rigPoints && outfit.back ? BACK_ART[outfit.back] : undefined;
  const shirtItem =
    rigPoints && outfit.body ? BODY_ART[outfit.body] : undefined;
  const feetGap = (1 - anchor.figureBottom) * size;
  const moving = pose === "walk" || pose === "run";
  const summary = needsSummary(needs);
  const needLine =
    !reaction && summary in NEED_LINES
      ? NEED_LINES[summary as keyof typeof NEED_LINES]
      : null;
  const line = localLine ?? needLine ?? speech;
  const bathing = pose === "bath";
  // Mud shows from 40% dirt and is fully visible at 100%; never during/after a bath.
  // Smell shows from 40% dirt and is at its worst at 100%; never during/after a bath.
  const mud =
    bathing || foam.length > 20
      ? 0
      : Math.max(0, Math.min(1, (needs.dirt - 40) / 60));

  return (
    <section className={styles.world} aria-label="Rocky's world">
      {!arranging && <div className={styles.hud}>{hud}</div>}

      <div className={styles.stage} ref={worldRef} onClick={handleStageClick} data-rocky-stage>
        <div className={styles.scene}>
          <SceneArt id={outfit.scene} live={animate} />
        </div>
        <div className={styles.spotlight} aria-hidden="true" />

        {layout.decor.map((id) => {
          const d = DECOR_ART[id];
          if (!d) return null;
          const cx = decorSpot(id, layout.spots);
          const name = findItem(id)?.name ?? "item";
          const rise = layout.rises[id] ?? 0;
          const bottom =
            floorPx + (((d.lift ?? 0) + rise) / 100) * worldSize.h - 0.02 * worldSize.h;
          const w = decorWidthPx(id, size, layout.sizes);
          const [vbW, vbH] = d.viewBox.split(" ").slice(2).map(Number) as [
            number,
            number,
          ];
          const h = (w * vbH) / vbW;
          const step = layout.sizes[id] ?? 1;
          return (
            <Fragment key={id}>
              <button
                type="button"
                className={`${styles.decor} ${arranging ? styles.decorArrange : ""} ${editing === id ? styles.decorEditing : ""}`}
                style={{ left: `calc(${cx}% - ${w / 2}px)`, width: w, bottom, zIndex: (arranging ? 4 : 1) + layout.decor.indexOf(id) / 100 }}
                aria-label={
                  arranging
                    ? `Move the ${name} (drag, or use the arrow keys)`
                    : `Rocky, play with the ${name}`
                }
                onClick={arranging ? undefined : () => void visitDecor(id)}
                onPointerDown={arranging ? (e) => startDrag(id, e) : undefined}
                onPointerMove={arranging ? moveDrag : undefined}
                onPointerUp={arranging ? endDrag : undefined}
                onPointerCancel={arranging ? endDrag : undefined}
                onKeyDown={
                  arranging
                    ? (e) => {
                        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                          e.preventDefault();
                          nudge(id, e.key === "ArrowLeft" ? -2 : 2);
                        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          nudge(id, e.key === "ArrowDown" ? -2 : 2, "y");
                        }
                      }
                    : undefined
                }
              >
                <svg
                  className="rocky-live"
                  viewBox={d.viewBox}
                  aria-hidden="true"
                >
                  {d.svg}
                </svg>
              </button>
              {arranging && editing === id && (
                <div
                  className={styles.editPanel}
                  style={{
                    left: `${Math.max(20, Math.min(80, cx))}%`,
                    bottom: Math.min(bottom + h + 12, worldSize.h - 110),
                  }}
                  role="group"
                  aria-label={`Edit the ${name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Size</span>
                  {SIZE_STEPS.map((st, i) => (
                    <button
                      key={st}
                      type="button"
                      className={st === step ? styles.editOn : undefined}
                      aria-pressed={st === step}
                      onClick={() => resize(id, st)}
                    >
                      {SIZE_LABELS[i]}
                    </button>
                  ))}
                  <button type="button" onClick={() => layer(id, "front")} title="Bring to front" aria-label={`Bring the ${name} to the front`}>
                    ⬆︎ Front
                  </button>
                  <button type="button" onClick={() => layer(id, "back")} title="Send to back" aria-label={`Send the ${name} to the back`}>
                    ⬇︎ Back
                  </button>
                  {rise > 0 && (
                    <button type="button" onClick={() => nudge(id, -RISE_MAX, "y")} title="Back on the floor" aria-label={`Put the ${name} back on the floor`}>
                      ⤓ Floor
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.editRemove}
                    onClick={() => putAway(id)}
                    aria-label={`Put away the ${name}`}
                    title="Put away"
                  >
                    🗑
                  </button>
                </div>
              )}
            </Fragment>
          );
        })}

        {arranging && draft && (
          <div
            className={styles.arrangeBar}
            role="group"
            aria-label="Arrange your world"
          >
            <span>
              Drag anywhere (on top of things too) · tap for size and layers · {draft.decor.length}/{MAX_DECOR}{" "}
              placed
            </span>
            <button
              type="button"
              className={styles.arrangeCancel}
              onClick={() => onArrangeDone?.(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.arrangeDone}
              onClick={() => onArrangeDone?.(draft)}
            >
              Done
            </button>
          </div>
        )}

        {ball && (
          <Ball
            key={ball.id}
            ref={ballRef}
            x={ball.x}
            final={ball.final}
            stageW={worldSize.w}
            stageH={worldSize.h}
            floor={floorPx}
            animate={animate}
            track={gazeRef}
            stageRef={worldRef}
            onBounce={(s) => s > 0.3 && playSfx("bounce")}
            onTap={countTouch}
            onLand={endStreak}
            onDone={() => setBall((b) => (b?.id === ball.id ? null : b))}
          />
        )}

        {clickMark && (
          <span
            key={clickMark.id}
            className={styles.clickMark}
            style={{ left: `${clickMark.x}%`, top: `${clickMark.y}%` }}
            onAnimationEnd={() =>
              setClickMark((c) => (c?.id === clickMark.id ? null : c))
            }
            aria-hidden="true"
          />
        )}

        {playing && ball && !ball.final && (
          <p
            className={`${styles.playHint} ${touches > 0 ? styles.playHintHot : ""}`}
            role="status"
          >
            {touches > 0 ? (
              <>
                <b>{touches}</b> in a row — keep it up!
              </>
            ) : (
              "Tap the ball to keep it in the air!"
            )}
          </p>
        )}

        {rewards.map((r) => (
          <span
            key={r.id}
            className={styles.rewardPop}
            style={{ left: `${r.x}%`, bottom: floorPx + 0.3 * worldSize.h }}
            role="status"
          >
            {r.text}
          </span>
        ))}

        {!visitor &&
          litter
            .filter((l) => !binned.includes(l.id))
            .map((l) => (
              <button
                key={l.id}
                type="button"
                className={`${styles.litter} ${held?.what === "litter" && held.id === l.id ? styles.litterHeld : ""}`}
                style={{ left: `${l.x}%`, bottom: floorPx - 10 }}
                onPointerDown={(e) =>
                  grab("litter", l.id, LITTER_ART[l.kind]!, e)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    throwAway(l.id);
                  }
                }}
                aria-label="Litter — drag it to the bin (or press Enter)"
              >
                <svg viewBox="0 0 40 40" aria-hidden="true">
                  {LITTER_ART[l.kind]}
                </svg>
              </button>
            ))}
        {!visitor && (
          <div
            ref={binRef}
            className={`${styles.bin} ${binOpen ? styles.binOpen : ""} ${arranging ? styles.binArrange : ""}`}
            style={{ left: `${binSpot.x}%`, bottom: floorPx - 8 + (binSpot.rise / 100) * worldSize.h }}
            aria-hidden={!arranging}
            role={arranging ? "button" : undefined}
            aria-label={arranging ? "Move the litter bin" : undefined}
            onPointerDown={
              arranging
                ? (e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    binDrag.current = {
                      pointer: e.pointerId,
                      dx: binSpot.x - stagePercent(e.clientX),
                      dy: binSpot.rise - risePercent(e.clientY),
                    };
                  }
                : undefined
            }
            onPointerMove={
              arranging
                ? (e) => {
                    const d = binDrag.current;
                    if (!d || d.pointer !== e.pointerId) return;
                    const rise = Math.max(0, Math.min(RISE_MAX, risePercent(e.clientY) + d.dy));
                    setBinSpot({
                      x: Math.round(Math.max(3, Math.min(97, stagePercent(e.clientX) + d.dx)) * 10) / 10,
                      rise: rise < 1.5 ? 0 : Math.round(rise * 10) / 10,
                    });
                  }
                : undefined
            }
            onPointerUp={
              arranging
                ? () => {
                    binDrag.current = null;
                    try {
                      window.localStorage.setItem(BIN_KEY, JSON.stringify(binSpot));
                    } catch {
                      /* not saved: fine */
                    }
                    playSfx("tap");
                  }
                : undefined
            }
          >
            <BinArt open={binOpen || held?.what === "litter"} />
          </div>
        )}

        {guests.map((g) => (
          <GuestRocky key={g.id} guest={g} size={Math.round(size * 0.78)} floor={floorPx} />
        ))}

        <div
          ref={actorRef}
          className={`${styles.actor} ${held && held.what !== "litter" && held.over ? styles.actorTarget : ""}`}
          style={{
            left: `${x}%`,
            bottom: floorPx - feetGap,
            width: size,
            height: size,
            transitionDuration: `${walkMs}ms`,
          }}
        >
          {vip && <VipAura feet={feetGap} />}
          {/* Out of the way while playing ball: the bubble covered the ball. */}
          {!playing && (
            <p key={line} className={styles.speech} aria-live="polite">
              {line}
            </p>
          )}
          {floatReacts.map((r, i) => (
            <span key={r.id} className={styles.floatReact} style={{ left: `${30 + ((r.id * 37 + i * 11) % 40)}%` }} aria-hidden="true">
              {r.emoji}
            </span>
          ))}
          <span
            className={styles.shadow}
            style={{ bottom: feetGap - 6 }}
            aria-hidden="true"
          />
          <button
            type="button"
            className={`${styles.body} ${styles[`pose-${pose}`] ?? ""}`}
            onClick={handlePet}
            aria-label={`Pet ${ROCKY_VISUALS[stage].label}`}
          >
            <span
              className={
                !moving
                  ? ""
                  : facingLeft
                    ? pose === "run"
                      ? styles.runLeft
                      : styles.leanLeft
                    : pose === "run"
                      ? styles.runRight
                      : styles.leanRight
              }
            >
              {backItem && (
                <svg
                  ref={backRef}
                  className={`${styles.wearBack} rocky-live`}
                  viewBox={WEAR_VIEWBOX.back}
                  preserveAspectRatio="none"
                  style={backPlacement(rigPoints!, anchor, size, outfit.back!)}
                  aria-hidden="true"
                >
                  {backItem}
                </svg>
              )}
              {/* The official art, whole: it moves with the pose classes, never deformed.
                  Reaction and emote poses aren't square, so they stand on the same floor line. */}
              {puppet ? (
                <RockyPuppet action={pose} animate={animate} />
              ) : (
                <RetryImg
                  key={src}
                  src={src}
                  alt=""
                  className={`${styles.art} ${reaction || emote ? styles.artPose : ""}`}
                  draggable={false}
                />
              )}
              {shirtItem && (
                <svg
                  ref={shirtRef}
                  className={`${styles.wear} rocky-live`}
                  viewBox={WEAR_VIEWBOX.body}
                  preserveAspectRatio="none"
                  style={bodyPlacement(rigPoints!, anchor, size)}
                  aria-hidden="true"
                >
                  {shirtItem}
                </svg>
              )}
              {neckItem && (
                <svg
                  ref={neckRef}
                  className={`${styles.wear} rocky-live`}
                  viewBox={WEAR_VIEWBOX.neck}
                  style={neckPlacement(rigPoints!, anchor, size)}
                  aria-hidden="true"
                >
                  {neckItem}
                </svg>
              )}
              {glasses && (
                <svg
                  ref={glassesRef}
                  className={`${styles.wear} rocky-live`}
                  viewBox={WEAR_VIEWBOX.glasses}
                  style={glassesPlacement(rigPoints!, anchor, size)}
                  aria-hidden="true"
                >
                  {glasses}
                </svg>
              )}
              {hat && hatBox && (
                <svg
                  ref={hatRef}
                  className={`${styles.hat} rocky-live`}
                  viewBox="0 0 100 60"
                  style={hatBox}
                  aria-hidden="true"
                >
                  {hat.svg}
                </svg>
              )}
            </span>
            {/* A dirty Rocky smells: wavy stink lines rise off him (and flies show up when it's bad). */}
            {mud > 0 && (
              <span
                className={styles.stink}
                style={{ opacity: 0.35 + mud * 0.65 }}
                aria-hidden="true"
              >
                {STINK_SPOTS.slice(0, mud > 0.5 ? 5 : 3).map(
                  ([left, top], i) => (
                    <svg
                      key={i}
                      viewBox="0 0 20 60"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        animationDelay: `${i * 0.55}s`,
                      }}
                    >
                      <path d="M10 58 C2 50 18 42 10 34 C2 26 18 18 10 10 C6 6 8 3 10 2" />
                    </svg>
                  ),
                )}
              </span>
            )}
            {foam.length > 0 && (
              <span className={styles.foamLayer} aria-hidden="true">
                {foam.map((f) => (
                  <i
                    key={f.id}
                    style={{
                      left: `${f.x}%`,
                      top: `${f.y}%`,
                      width: f.s,
                      height: f.s,
                      background: f.c,
                    }}
                  />
                ))}
              </span>
            )}
            {mud > 0.6 && animate && (
              <span className={styles.flies} aria-hidden="true">
                <i />
                <i />
              </span>
            )}
            {bathing && (
              <span className={styles.bath} aria-hidden="true">
                <span className={styles.showerHead} />
                <span className={styles.water} />
                <span className={styles.foam}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            )}
          </button>
          {treatFlying && <span className={styles.treat} aria-hidden="true" />}
        </div>

        {particles.map((p) => (
          <span
            key={p.id}
            className={styles[p.kind]}
            style={{
              left: `calc(${p.x}% + ${p.dx}px)`,
              bottom:
                floorPx +
                ((p.kind === "heart" || p.kind === "zzz"
                  ? 38
                  : p.kind === "crumb" || p.kind === "note"
                    ? 20
                    : 26) /
                  100) *
                  worldSize.h +
                p.dy,
            }}
            aria-hidden="true"
          >
            {p.kind === "heart" ? (
              "❤"
            ) : p.kind === "zzz" ? (
              "z"
            ) : p.kind === "note" ? (
              "♪"
            ) : p.kind === "coin" ? (
              <Coin />
            ) : (
              ""
            )}
          </span>
        ))}

        <FxLayer id={outfit.fx} />
        {onStartArrange && !arranging && (
          <button
            type="button"
            className={`${styles.sound} ${styles.arrangeButton}`}
            data-no-photo
            onClick={onStartArrange}
            aria-label="Arrange your world"
            title="Arrange your world"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
            </svg>
          </button>
        )}
        {onPhoto && !arranging && (
          <button
            type="button"
            className={`${styles.sound} ${styles.photoButton}`}
            data-no-photo
            onClick={(e) => {
              e.stopPropagation();
              onPhoto();
            }}
            aria-label="Take a photo of Rocky"
            title="Take a photo of Rocky"
          >
            📸
          </button>
        )}
        <div className={styles.vignette} aria-hidden="true" />
        <button
          type="button"
          className={styles.sound}
          data-no-photo
          onClick={toggleSound}
          aria-pressed={!muted}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            {muted ? (
              <path d="M17 9l5 5M22 9l-5 5" />
            ) : (
              <path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13" />
            )}
          </svg>
        </button>
      </div>

      <div className={styles.dock} ref={dockRef}>
        {tray && !visitor && (
          <InventoryTray
            tab={tray}
            onTab={setTray}
            onClose={() => setTray(null)}
            foods={foodItems}
            soaps={soapItems}
            onGrab={(item, tab, e) =>
              grab(tab === "food" ? "food" : "soap", item.id, item.art, e)
            }
            onUse={useItem}
            onShop={() => {
              setTray(null);
              onOpenPantry?.(tray);
            }}
            // The bag gets out of the way once a snack or soap is on its way to Rocky, so he's always in view.
            away={!!held && held.moved && (held.what === "food" || held.what === "soap")}
          />
        )}
        {/* Only while the soap is in hand — a bath left half-way never leaves the meter stuck on screen. */}
        {scrub > 0 && scrub < 1 && held?.what === "soap" && (
          <div
            className={styles.scrubMeter}
            role="progressbar"
            aria-label="Scrubbing"
            aria-valuenow={Math.round(scrub * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${scrub * 100}%` }} />
            <b>Scrub {Math.round(scrub * 100)}%</b>
          </div>
        )}
        <NeedsDock
          needs={needs}
          treats={
            // Everything edible in the bag: earned treats plus bought food
            // (visitors can only give treats).
            visitor
              ? treats
              : treats +
                Object.entries(inventory).reduce(
                  (n, [id, qty]) => n + (findFood(id) ? qty : 0),
                  0,
                )
          }
          busy={busy}
          playing={playing}
          onPet={handlePet}
          onFeed={() =>
            visitor
              ? handleFeed()
              : setTray((t) => (t === "food" ? null : "food"))
          }
          onPlay={() => void handlePlay()}
          onBath={() =>
            visitor
              ? handleBath()
              : setTray((t) => (t === "soap" ? null : "soap"))
          }
          feedOpen={tray === "food"}
          bathOpen={tray === "soap"}
          visitor={visitor}
        />
        <div className={styles.primary}>{action}</div>
      </div>
      {held &&
        held.moved &&
        createPortal(
          <span
            className={`${styles.held} ${held.what === "soap" && held.over ? styles.heldScrub : ""}`}
            style={{ left: held.x, top: held.y }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 40 40">{held.art}</svg>
          </span>,
          document.body,
        )}
    </section>
  );
}
