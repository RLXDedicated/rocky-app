import { RetryImg } from "./assetRecovery";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { calculateMood } from "../engine/gameEngine";
import { ARCADE_CAP, arcadeReward, gameEnabled, type ArcadeGame } from "../game/pantry";
import { BoxStack, BubblePop, MudSplat, RockyRun, RockySays } from "./arcade/MoreGames";
import {
  loadPetCache,
  performPetAction,
  type PetCache,
} from "../game/petClient";
import { refreshPetState } from "../game/pet";
import { buildProgressFacts } from "../game/progressFacts";
import { play as playSfx } from "../game/sfx";
import { gameService } from "../services/gameService";
import { getRockyAsset } from "./rockyVisuals";
import { FOOD_ART } from "./world/items";
import { Coin } from "./world/Coin";
import styles from "./Arcade.module.css";

const GAMES: {
  id: ArcadeGame;
  name: string;
  blurb: string;
  icon: string;
  howTo: string;
}[] = [
  {
    id: "catch",
    name: "Treat Catch",
    blurb: "Move Rocky to catch falling snacks. Dodge the mud!",
    icon: "🍎",
    howTo: "Move with the mouse, your finger or the ← → keys. 30 seconds.",
  },
  {
    id: "run",
    name: "Rocky Run",
    blurb: "Rocky's late for a delivery! Jump over the boxes and cones.",
    icon: "🏃",
    howTo: "Tap the field (or press space) to jump. One bump ends the run.",
  },
  {
    id: "whack",
    name: "Mud Splat",
    blurb: "Mud keeps popping up. Splat it fast — but never splat Rocky!",
    icon: "💥",
    howTo: "Tap the mud (+1) and the gold coins (+3). Tapping Rocky costs 2. 30 seconds.",
  },
  {
    id: "bubbles",
    name: "Bubble Pop",
    blurb: "Pop the bubbles from Rocky's bath before they float away.",
    icon: "🫧",
    howTo: "Tap bubbles (+1) and gold ones (+3). Avoid the spiky purple ones (−3). 30 seconds.",
  },
  {
    id: "stack",
    name: "Box Stack",
    blurb: "Stack the delivery boxes as high as you can.",
    icon: "📦",
    howTo: "Tap (or press space) to drop the sliding box. Only the part on top of the stack stays.",
  },
  {
    id: "simon",
    name: "Rocky Says",
    blurb: "Watch the pattern, then play it back. It grows every round!",
    icon: "🎵",
    howTo: "Watch the pads light up, then tap them in the same order.",
  },
  {
    id: "typo",
    name: "Typo Hunt",
    blurb: "Great notes have no typos. Tap every misspelled word!",
    icon: "🔎",
    howTo:
      "Tap the words that are misspelled. Wrong taps cost a point. 45 seconds.",
  },
  {
    id: "memory",
    name: "Memory Match",
    blurb: "Flip the cards and match the pairs in as few moves as you can.",
    icon: "🃏",
    howTo: "Find the 6 pairs. 3 stars for 9 moves or fewer.",
  },
];

/**
 * Rocky's Arcade: quick mini-games that pay a few coins (no XP), capped per
 * day. The server re-checks every result (see arcadeReward in pantry.ts).
 */
export function Arcade({ onOpenNotes }: { onOpenNotes?: () => void }) {
  const [pet, setPet] = useState<PetCache>(() => loadPetCache());
  const [playing, setPlaying] = useState<ArcadeGame | null>(null);
  const [result, setResult] = useState<{
    game: ArcadeGame;
    score: number;
    coins: number;
  } | null>(null);
  const snapshot = gameService.getSnapshot();
  const mood = calculateMood(snapshot.gameState);
  const rocky = getRockyAsset(snapshot.gameState.evolutionStage, mood);
  const games = refreshPetState(pet.state, new Date()).games;
  const left = Math.max(0, ARCADE_CAP.coins - games.arcadeCoins);

  const finish = useCallback(
    (game: ArcadeGame, score: number) => {
      const facts = buildProgressFacts(gameService.getSnapshot().gameState);
      const res = performPetAction(
        pet,
        { type: "arcade", game, score },
        facts,
        setPet,
      );
      const coins = res.ok ? (res.reward?.coins ?? 0) : 0;
      if (res.ok) setPet((p) => ({ ...p, state: res.state }));
      playSfx(coins > 0 ? "coin" : "chime");
      setResult({ game, score, coins });
      setPlaying(null);
    },
    [pet],
  );

  const info = playing ? GAMES.find((g) => g.id === playing)! : null;
  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Rocky’s Arcade</h1>
            <p className={styles.lede}>
              Quick games for a break. They pay coins for Rocky’s shop — the XP
              still comes from great notes.
            </p>
          </div>
          <div
            className={styles.wallet}
            aria-label={`${games.arcadeCoins} of ${ARCADE_CAP.coins} arcade coins today`}
          >
            <Coin /> {games.arcadeCoins}/{ARCADE_CAP.coins} today
          </div>
        </header>

        {result && !playing && (
          <div className={styles.result} role="status">
            <RetryImg src={rocky} alt="" />
            <div>
              <strong>
                {GAMES.find((g) => g.id === result.game)!.name}:{" "}
                {result.game === "memory"
                  ? "★".repeat(result.score) || "done"
                  : `${result.score} points`}
              </strong>
              <p>
                {result.coins > 0
                  ? `+${result.coins} coins for Rocky!`
                  : left === 0
                    ? "Today’s arcade coins are all won — play for fun!"
                    : "No coins this time. Try again!"}
              </p>
            </div>
            <button
              type="button"
              className={styles.again}
              onClick={() => setPlaying(result.game)}
            >
              Play again
            </button>
          </div>
        )}

        {playing && info ? (
          <section className={styles.stage} aria-label={info.name}>
            <div className={styles.stageHead}>
              <h2>
                {info.icon} {info.name}
              </h2>
              <p>{info.howTo}</p>
              <button
                type="button"
                className={styles.quit}
                onClick={() => setPlaying(null)}
              >
                Quit
              </button>
            </div>
            {playing === "catch" && (
              <TreatCatch rocky={rocky} onDone={(s) => finish("catch", s)} />
            )}
            {playing === "typo" && (
              <TypoHunt onDone={(s) => finish("typo", s)} />
            )}
            {playing === "memory" && (
              <MemoryMatch onDone={(s) => finish("memory", s)} />
            )}
            {playing === "run" && (
              <RockyRun rocky={rocky} onDone={(s) => finish("run", s)} />
            )}
            {playing === "whack" && (
              <MudSplat rocky={rocky} onDone={(s) => finish("whack", s)} />
            )}
            {playing === "bubbles" && (
              <BubblePop onDone={(s) => finish("bubbles", s)} />
            )}
            {playing === "simon" && (
              <RockySays rocky={rocky} onDone={(s) => finish("simon", s)} />
            )}
            {playing === "stack" && (
              <BoxStack onDone={(s) => finish("stack", s)} />
            )}
          </section>
        ) : (
          <ul className={styles.grid}>
            {GAMES.filter((g) => gameEnabled(pet.overrides, g.id)).map((g) => (
              <li key={g.id} className={styles.card}>
                <span className={styles.icon} aria-hidden="true">
                  {g.icon}
                </span>
                <strong>{g.name}</strong>
                <p>{g.blurb}</p>
                <small>
                  Best:{" "}
                  {g.id === "memory"
                    ? "★".repeat(games.arcadeBest[g.id] ?? 0) || "—"
                    : (games.arcadeBest[g.id] ?? "—")}{" "}
                  · up to {arcadeReward(g.id, 999)} coins a round
                </small>
                <button
                  type="button"
                  className={styles.play}
                  onClick={() => (setResult(null), setPlaying(g.id))}
                >
                  Play
                </button>
              </li>
            ))}
            {onOpenNotes && gameEnabled(pet.overrides, "notes") && (
              <li className={`${styles.card} ${styles.cardNotes}`}>
                <span className={styles.icon} aria-hidden="true">
                  📝
                </span>
                <strong>Note Check</strong>
                <p>
                  The daily notes quiz — the only game that also builds Rocky’s
                  streak of good habits.
                </p>
                <small>Once a day · coins and treats</small>
                <button
                  type="button"
                  className={styles.play}
                  onClick={onOpenNotes}
                >
                  Open
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Treat Catch
// ---------------------------------------------------------------------------
interface Falling {
  id: number;
  x: number;
  y: number;
  v: number;
  kind: "good" | "gold" | "mud";
  art: ReactElement;
}

const GOOD = [
  "treat",
  "food-apple",
  "food-carrot",
  "food-hay-cookie",
  "food-cake",
  "food-smoothie",
] as const;
const CATCH_MS = 30_000;

function TreatCatch({
  rocky,
  onDone,
}: {
  rocky: string;
  onDone: (score: number) => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [, setFrame] = useState(0);
  const st = useRef({
    x: 50,
    items: [] as Falling[],
    score: 0,
    next: 0,
    id: 0,
    start: 0,
    left: CATCH_MS,
    pops: [] as { id: number; x: number; text: string }[],
  });
  const keys = useRef({ left: false, right: false });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    st.current.start = last;
    const step = (now: number) => {
      const s = st.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = now - s.start;
      s.left = Math.max(0, CATCH_MS - elapsed);
      if (keys.current.left) s.x = Math.max(6, s.x - 70 * dt);
      if (keys.current.right) s.x = Math.min(94, s.x + 70 * dt);
      // Faster and busier as the round goes on.
      const pace = 1 + elapsed / CATCH_MS;
      if (now > s.next) {
        const roll = Math.random();
        const kind: Falling["kind"] =
          roll < 0.18 ? "mud" : roll < 0.26 ? "gold" : "good";
        const art =
          kind === "good"
            ? FOOD_ART[GOOD[Math.floor(Math.random() * GOOD.length)]!]!
            : kind === "gold"
              ? GOLD
              : MUD;
        s.items.push({
          id: ++s.id,
          x: 6 + Math.random() * 88,
          y: -8,
          v: (28 + Math.random() * 18) * pace,
          kind,
          art,
        });
        s.next = now + (720 - 280 * (pace - 1)) * (0.7 + Math.random() * 0.6);
      }
      for (const it of s.items) it.y += it.v * dt;
      // Rocky's mouth is around 78% down the field; a catch within ~9% sideways.
      const caught = s.items.filter(
        (it) => it.y > 74 && it.y < 90 && Math.abs(it.x - s.x) < 9,
      );
      for (const c of caught) {
        const pts = c.kind === "mud" ? -2 : c.kind === "gold" ? 3 : 1;
        s.score = Math.max(0, s.score + pts);
        s.pops.push({ id: c.id, x: c.x, text: pts > 0 ? `+${pts}` : `${pts}` });
        playSfx(
          c.kind === "mud" ? "nope" : c.kind === "gold" ? "coin" : "chomp",
        );
      }
      s.items = s.items.filter((it) => !caught.includes(it) && it.y < 105);
      s.pops = s.pops.slice(-6);
      setFrame((f) => f + 1);
      if (s.left <= 0) {
        onDone(s.score);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = true;
      if (e.key === "ArrowRight") keys.current.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = false;
      if (e.key === "ArrowRight") keys.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // A round runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = st.current;
  const move = (clientX: number) => {
    const r = fieldRef.current?.getBoundingClientRect();
    if (r)
      s.x = Math.max(6, Math.min(94, ((clientX - r.left) / r.width) * 100));
  };
  return (
    <div
      ref={fieldRef}
      className={styles.catchField}
      onPointerMove={(e) => move(e.clientX)}
      onPointerDown={(e) => move(e.clientX)}
      tabIndex={0}
      aria-label="Treat Catch field — use the arrow keys to move Rocky"
    >
      <div className={styles.hud}>
        <span>⏱ {Math.ceil(s.left / 1000)}s</span>
        <span>🍎 {s.score}</span>
      </div>
      {s.items.map((it) => (
        <svg
          key={it.id}
          viewBox="0 0 40 40"
          className={styles.falling}
          style={{ left: `${it.x}%`, top: `${it.y}%` }}
          aria-hidden="true"
        >
          {it.art}
        </svg>
      ))}
      {s.pops.map((p) => (
        <span key={p.id} className={styles.pop} style={{ left: `${p.x}%` }}>
          {p.text}
        </span>
      ))}
      <RetryImg
        src={rocky}
        alt=""
        className={styles.catcher}
        style={{ left: `${s.x}%` }}
        draggable={false}
      />
    </div>
  );
}

const GOLD = (
  <g>
    <circle
      cx="20"
      cy="20"
      r="15"
      fill="#f5b82e"
      stroke="#c07a0c"
      strokeWidth="2.5"
    />
    <text
      x="14"
      y="26"
      fontFamily="Poppins, sans-serif"
      fontWeight="800"
      fontSize="16"
      fill="#8a5a00"
    >
      R
    </text>
  </g>
);
const MUD = (
  <g>
    <path
      d="M6 26 C4 16 14 10 20 14 C26 8 36 14 34 24 C38 30 30 36 20 34 C10 36 4 32 6 26 Z"
      fill="#7a5230"
    />
    <circle cx="15" cy="22" r="2" fill="#5a3a1e" />
    <circle cx="25" cy="25" r="2.5" fill="#5a3a1e" />
    <path
      d="M12 8 q2 -3 4 0 M26 6 q2 -3 4 0"
      stroke="#1b2433"
      strokeWidth="1.5"
      fill="none"
    />
  </g>
);

// ---------------------------------------------------------------------------
// Typo Hunt — spot the misspellings in real-looking account notes.
// ---------------------------------------------------------------------------
/** Words written `wrong|right` are typos; everything else is spelled right. */
const TYPO_NOTES = [
  "Spoke with Maria (acount|account holder). Delivery moved from 6/12 to 6/14, 8–12 windw|window, at her request. Confirmed adress|address and gate code.",
  "Customer states the washer door was craked|cracked on delivery. Sent fotos|photos by email. Opened damage claim #D-4471. Replacment|Replacement pending approval.",
  "Called customer, no answer. Left voicemail at 10:42 to the number on file. Will call back tomorow|tomorrow after 2 pm with the new ETA.",
  "Driver (route 14) reported no one home at 11:05; left door tag. Redelivery to be scheduald|scheduled. Customer notifyed|notified by text.",
  "Transferred the call to the Claims team for a refund reveiw|review. Reference number R-2231 shared with the custommer|customer.",
  "Confirmed delivery adress|address with account holder, no changes. Aproved|Approved the new time window for Friday morning.",
  "Customer asked for a supervisor. Escalated to QA lead with ticket T-908. Folow-up|Follow-up expected within 24 hours, per polcy|policy.",
  "Rescheduled the instalation|installation to 6/20. Customer will keep the old unit untill|until pickup. All details confirmed on the call.",
];

interface Word {
  text: string;
  fix: string | null;
  state: "idle" | "found" | "wrong";
}

function parseNote(note: string): Word[] {
  return note.split(" ").map((w) => {
    const [text, fix] = w.split("|");
    return { text: text!, fix: fix ?? null, state: "idle" as const };
  });
}

const TYPO_MS = 45_000;

function TypoHunt({ onDone }: { onDone: (score: number) => void }) {
  const order = useRef([...TYPO_NOTES].sort(() => Math.random() - 0.5));
  const [index, setIndex] = useState(0);
  const [words, setWords] = useState<Word[]>(() =>
    parseNote(order.current[0]!),
  );
  const [found, setFound] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [left, setLeft] = useState(TYPO_MS);
  const score = Math.max(0, found - mistakes);
  const scoreRef = useRef(score);
  scoreRef.current = score;

  useEffect(() => {
    const start = performance.now();
    const t = window.setInterval(() => {
      const l = Math.max(0, TYPO_MS - (performance.now() - start));
      setLeft(l);
      if (l <= 0) {
        window.clearInterval(t);
        onDone(scoreRef.current);
      }
    }, 200);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tap(i: number) {
    const w = words[i]!;
    if (w.state === "found") return;
    if (w.fix) {
      playSfx("pop");
      setFound((f) => f + 1);
      const next = words.map((x, k) =>
        k === i ? { ...x, state: "found" as const } : x,
      );
      setWords(next);
      if (next.every((x) => !x.fix || x.state === "found")) {
        playSfx("chime");
        window.setTimeout(() => {
          const n = (index + 1) % order.current.length;
          setIndex(n);
          setWords(parseNote(order.current[n]!));
        }, 600);
      }
    } else {
      playSfx("nope");
      setMistakes((m) => m + 1);
      setWords((ws) =>
        ws.map((x, k) => (k === i ? { ...x, state: "wrong" as const } : x)),
      );
      window.setTimeout(
        () =>
          setWords((ws) =>
            ws.map((x, k) =>
              k === i && x.state === "wrong"
                ? { ...x, state: "idle" as const }
                : x,
            ),
          ),
        500,
      );
    }
  }

  const typosLeft = words.filter((w) => w.fix && w.state !== "found").length;
  return (
    <div className={styles.typo}>
      <div className={styles.hud}>
        <span>⏱ {Math.ceil(left / 1000)}s</span>
        <span>
          ✅ {found} · ❌ {mistakes}
        </span>
        <span>Note {index + 1}</span>
      </div>
      <div className={styles.note}>
        <span className={styles.noteLabel}>
          Account note · {typosLeft} typo{typosLeft === 1 ? "" : "s"} left
        </span>
        <p>
          {words.map((w, i) => (
            <button
              key={`${index}-${i}`}
              type="button"
              className={styles.word}
              data-state={w.state}
              onClick={() => tap(i)}
            >
              {w.state === "found" ? w.fix : w.text}
            </button>
          ))}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Memory Match
// ---------------------------------------------------------------------------
const MEMORY_ICONS = ["📝", "☎️", "📦", "🚚", "✅", "📅"];

function MemoryMatch({ onDone }: { onDone: (stars: number) => void }) {
  const [cards] = useState(() =>
    [...MEMORY_ICONS, ...MEMORY_ICONS]
      .map((icon, i) => ({ id: i, icon }))
      .sort(() => Math.random() - 0.5),
  );
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);

  function flip(idx: number) {
    if (
      lock.current ||
      open.includes(idx) ||
      matched.includes(cards[idx]!.icon)
    )
      return;
    playSfx("tap");
    const next = [...open, idx];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next as [number, number];
    if (cards[a]!.icon === cards[b]!.icon) {
      playSfx("chime");
      const done = [...matched, cards[a]!.icon];
      setMatched(done);
      setOpen([]);
      if (done.length === MEMORY_ICONS.length) {
        const total = moves + 1;
        window.setTimeout(
          () => onDone(total <= 9 ? 3 : total <= 13 ? 2 : 1),
          500,
        );
      }
    } else {
      lock.current = true;
      window.setTimeout(() => {
        setOpen([]);
        lock.current = false;
      }, 750);
    }
  }

  return (
    <div className={styles.memory}>
      <div className={styles.hud}>
        <span>Moves: {moves}</span>
        <span>
          Pairs: {matched.length}/{MEMORY_ICONS.length}
        </span>
      </div>
      <div className={styles.cards}>
        {cards.map((c, i) => {
          const up = open.includes(i) || matched.includes(c.icon);
          return (
            <button
              key={c.id}
              type="button"
              className={`${styles.memCard} ${up ? styles.memUp : ""} ${matched.includes(c.icon) ? styles.memDone : ""}`}
              onClick={() => flip(i)}
              aria-label={up ? c.icon : "Hidden card"}
            >
              <span className={styles.memFace}>{up ? c.icon : "RLX"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
