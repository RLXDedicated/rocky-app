// Five quick, just-for-fun arcade games (no homework): Rocky Run, Mud Splat,
// Bubble Pop, Rocky Says and Box Stack. Each one reports a score when the
// round ends; the server clamps it and pays coins (see arcadeReward in
// pantry.ts). Rendering is plain DOM driven by a requestAnimationFrame loop.
import { useCallback, useEffect, useRef, useState } from "react";
import { RetryImg } from "../assetRecovery";
import { play as playSfx } from "../../game/sfx";
import styles from "./MoreGames.module.css";

type Done = (score: number) => void;

/** Re-render on every animation frame while `run` returns true. */
function useLoop(step: (dt: number, now: number) => boolean) {
  const [, setFrame] = useState(0);
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const more = stepRef.current(dt, now);
      setFrame((f) => f + 1);
      if (more) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}

// ---------------------------------------------------------------------------
// Rocky Run: tap / space to jump over the boxes. One bump ends the run.
// ---------------------------------------------------------------------------
const RUN_GROUND = 78; // % from the top where Rocky's feet are

export function RockyRun({ rocky, onDone }: { rocky: string; onDone: Done }) {
  const st = useRef({
    y: 0, // height above the ground (%)
    vy: 0,
    speed: 38,
    obstacles: [] as { id: number; x: number; w: number; h: number; kind: number }[],
    next: 1.2,
    id: 0,
    score: 0,
    over: false,
    t: 0,
  });
  const done = useRef(false);

  const jump = useCallback(() => {
    const s = st.current;
    if (s.over) return;
    if (s.y <= 0.01) {
      s.vy = 118;
      playSfx("bounce");
    }
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [jump]);

  useLoop((dt) => {
    const s = st.current;
    if (s.over) return false;
    s.t += dt;
    s.speed = 38 + s.t * 1.6;
    s.vy -= 330 * dt;
    s.y = Math.max(0, s.y + s.vy * dt);
    if (s.y === 0) s.vy = 0;
    s.next -= dt;
    if (s.next <= 0) {
      const tall = Math.random() < 0.35;
      s.obstacles.push({ id: ++s.id, x: 104, w: tall ? 6 : 8, h: tall ? 16 : 10, kind: Math.floor(Math.random() * 3) });
      s.next = Math.max(0.55, 1.5 - s.t / 60) * (0.75 + Math.random() * 0.7);
    }
    for (const o of s.obstacles) {
      const before = o.x;
      o.x -= s.speed * dt;
      if (before >= 12 && o.x < 12) {
        s.score += 1;
        playSfx("tap");
      }
    }
    s.obstacles = s.obstacles.filter((o) => o.x > -12);
    // Rocky's box: x 12–22%, from his feet up ~18%.
    const hit = s.obstacles.some((o) => o.x < 20 && o.x + o.w > 14 && s.y < o.h - 2);
    if (hit || s.score >= 60) {
      s.over = true;
      playSfx(hit ? "nope" : "fanfare");
      if (!done.current) {
        done.current = true;
        window.setTimeout(() => onDone(s.score), 700);
      }
      return false;
    }
    return true;
  });

  const s = st.current;
  return (
    <div className={`${styles.field} ${styles.runField}`} onPointerDown={jump} role="button" tabIndex={0} aria-label="Rocky Run — tap or press space to jump">
      <div className={styles.hud}>
        <span>📦 {s.score}</span>
        <span>{s.over ? "Bump!" : "Tap to jump"}</span>
      </div>
      <div className={styles.runHills} style={{ backgroundPositionX: `${-s.t * 20}px` }} />
      <div className={styles.runGround} style={{ backgroundPositionX: `${-s.t * s.speed * 6}px` }} />
      {s.obstacles.map((o) => (
        <div
          key={o.id}
          className={styles.box}
          data-kind={o.kind}
          style={{ left: `${o.x}%`, width: `${o.w}%`, height: `${o.h}%`, top: `${RUN_GROUND - o.h}%` }}
        />
      ))}
      <RetryImg
        src={rocky}
        alt=""
        draggable={false}
        className={`${styles.runner} ${s.over ? styles.runnerHit : ""}`}
        style={{ top: `${RUN_GROUND - 20 - s.y}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mud Splat: splat the mud as it pops up. Gold coins are worth more; never splat Rocky!
// ---------------------------------------------------------------------------
const WHACK_MS = 30_000;

export function MudSplat({ rocky, onDone }: { rocky: string; onDone: Done }) {
  const st = useRef({
    holes: Array.from({ length: 9 }, () => ({ kind: null as null | "mud" | "gold" | "rocky", until: 0, hit: 0 })),
    score: 0,
    next: 0,
    start: performance.now(),
    left: WHACK_MS,
    pops: [] as { id: number; hole: number; text: string }[],
    id: 0,
  });
  const done = useRef(false);

  useLoop((_dt, now) => {
    const s = st.current;
    const elapsed = now - s.start;
    s.left = Math.max(0, WHACK_MS - elapsed);
    const pace = 1 + elapsed / WHACK_MS;
    for (const h of s.holes) if (h.kind && now > h.until) h.kind = null;
    if (now > s.next) {
      const free = s.holes.map((h, i) => (h.kind ? -1 : i)).filter((i) => i >= 0);
      if (free.length) {
        const i = free[Math.floor(Math.random() * free.length)]!;
        const roll = Math.random();
        s.holes[i] = { kind: roll < 0.16 ? "rocky" : roll < 0.28 ? "gold" : "mud", until: now + (1100 - 400 * (pace - 1)) * (0.8 + Math.random() * 0.4), hit: 0 };
      }
      s.next = now + (620 - 260 * (pace - 1)) * (0.7 + Math.random() * 0.6);
    }
    s.pops = s.pops.slice(-6);
    if (s.left <= 0) {
      if (!done.current) {
        done.current = true;
        onDone(s.score);
      }
      return false;
    }
    return true;
  });

  function whack(i: number) {
    const s = st.current;
    const h = s.holes[i]!;
    if (!h.kind) return;
    const pts = h.kind === "rocky" ? -2 : h.kind === "gold" ? 3 : 1;
    s.score = Math.max(0, s.score + pts);
    s.pops.push({ id: ++s.id, hole: i, text: pts > 0 ? `+${pts}` : `${pts}` });
    playSfx(h.kind === "rocky" ? "nope" : h.kind === "gold" ? "coin" : "splash");
    h.kind = null;
  }

  const s = st.current;
  return (
    <div className={`${styles.field} ${styles.whackField}`}>
      <div className={styles.hud}>
        <span>⏱ {Math.ceil(s.left / 1000)}s</span>
        <span>💥 {s.score}</span>
      </div>
      <div className={styles.whackGrid}>
        {s.holes.map((h, i) => (
          <button key={i} type="button" className={styles.hole} onPointerDown={() => whack(i)} aria-label={h.kind ? `Hole ${i + 1}: ${h.kind}` : `Hole ${i + 1}`}>
            <span className={`${styles.critter} ${h.kind ? styles.critterUp : ""}`}>
              {h.kind === "rocky" ? <RetryImg src={rocky} alt="" draggable={false} /> : h.kind === "gold" ? <span className={styles.goldCoin}>R</span> : h.kind === "mud" ? <span className={styles.mud} /> : null}
            </span>
            {s.pops
              .filter((p) => p.hole === i)
              .map((p) => (
                <b key={p.id} className={styles.pop}>
                  {p.text}
                </b>
              ))}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bubble Pop: pop the rising bubbles; gold ones are worth 3; spiky ones cost 3.
// ---------------------------------------------------------------------------
const BUBBLE_MS = 30_000;

export function BubblePop({ onDone }: { onDone: Done }) {
  const st = useRef({
    bubbles: [] as { id: number; x: number; y: number; r: number; v: number; kind: "blue" | "gold" | "spiky"; wob: number }[],
    score: 0,
    next: 0,
    id: 0,
    start: performance.now(),
    left: BUBBLE_MS,
    pops: [] as { id: number; x: number; y: number; text: string }[],
  });
  const done = useRef(false);

  useLoop((dt, now) => {
    const s = st.current;
    const elapsed = now - s.start;
    s.left = Math.max(0, BUBBLE_MS - elapsed);
    const pace = 1 + elapsed / BUBBLE_MS;
    if (now > s.next) {
      const roll = Math.random();
      s.bubbles.push({
        id: ++s.id,
        x: 8 + Math.random() * 84,
        y: 108,
        r: 5 + Math.random() * 4,
        v: (16 + Math.random() * 12) * pace,
        kind: roll < 0.15 ? "spiky" : roll < 0.25 ? "gold" : "blue",
        wob: Math.random() * 6,
      });
      s.next = now + (430 - 150 * (pace - 1)) * (0.7 + Math.random() * 0.6);
    }
    for (const b of s.bubbles) {
      b.y -= b.v * dt;
      b.wob += dt * 3;
    }
    s.bubbles = s.bubbles.filter((b) => b.y > -12);
    s.pops = s.pops.slice(-8);
    if (s.left <= 0) {
      if (!done.current) {
        done.current = true;
        onDone(s.score);
      }
      return false;
    }
    return true;
  });

  function pop(id: number) {
    const s = st.current;
    const b = s.bubbles.find((x) => x.id === id);
    if (!b) return;
    const pts = b.kind === "spiky" ? -3 : b.kind === "gold" ? 3 : 1;
    s.score = Math.max(0, s.score + pts);
    s.pops.push({ id: b.id, x: b.x, y: b.y, text: pts > 0 ? `+${pts}` : `${pts}` });
    s.bubbles = s.bubbles.filter((x) => x.id !== id);
    playSfx(b.kind === "spiky" ? "nope" : b.kind === "gold" ? "coin" : "bubble");
  }

  const s = st.current;
  return (
    <div className={`${styles.field} ${styles.bubbleField}`}>
      <div className={styles.hud}>
        <span>⏱ {Math.ceil(s.left / 1000)}s</span>
        <span>🫧 {s.score}</span>
      </div>
      {s.bubbles.map((b) => (
        <button
          key={b.id}
          type="button"
          className={`${styles.bubble} ${styles[b.kind]}`}
          style={{ left: `${b.x + Math.sin(b.wob) * 1.5}%`, top: `${b.y}%`, width: `${b.r * 2}cqmin`, height: `${b.r * 2}cqmin` }}
          onPointerDown={() => pop(b.id)}
          aria-label={b.kind === "spiky" ? "Spiky bubble" : b.kind === "gold" ? "Gold bubble" : "Bubble"}
        />
      ))}
      {s.pops.map((p) => (
        <b key={p.id} className={styles.floatPop} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          {p.text}
        </b>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rocky Says: watch the pads light up, then repeat the pattern. It grows by one each round.
// ---------------------------------------------------------------------------
const PADS = [
  { emoji: "🍎", color: "#e2445c", sfx: "chomp" as const },
  { emoji: "⚽", color: "#3f6fb5", sfx: "kick" as const },
  { emoji: "🫧", color: "#14b8a6", sfx: "bubble" as const },
  { emoji: "⭐", color: "#f5b82e", sfx: "chime" as const },
];

export function RockySays({ rocky, onDone }: { rocky: string; onDone: Done }) {
  const [seq, setSeq] = useState<number[]>(() => [Math.floor(Math.random() * 4)]);
  const [lit, setLit] = useState<number | null>(null);
  const [phase, setPhase] = useState<"show" | "input" | "over">("show");
  const [pos, setPos] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    if (phase !== "show") return;
    const gap = Math.max(260, 620 - seq.length * 25);
    seq.forEach((p, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setLit(p);
          playSfx(PADS[p]!.sfx);
        }, 600 + i * gap),
        window.setTimeout(() => setLit(null), 600 + i * gap + gap * 0.6),
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        setPos(0);
        setPhase("input");
      }, 600 + seq.length * gap),
    );
  }, [phase, seq]);

  function press(p: number) {
    if (phase !== "input") return;
    setLit(p);
    timers.current.push(window.setTimeout(() => setLit((l) => (l === p ? null : l)), 220));
    if (seq[pos] !== p) {
      playSfx("nope");
      setPhase("over");
      timers.current.push(window.setTimeout(() => onDone(seq.length - 1), 900));
      return;
    }
    playSfx(PADS[p]!.sfx);
    if (pos + 1 === seq.length) {
      if (seq.length >= 20) {
        setPhase("over");
        playSfx("fanfare");
        timers.current.push(window.setTimeout(() => onDone(20), 900));
        return;
      }
      setPhase("show");
      setSeq((s) => [...s, Math.floor(Math.random() * 4)]);
    } else setPos(pos + 1);
  }

  return (
    <div className={`${styles.field} ${styles.saysField}`}>
      <div className={styles.hud}>
        <span>🎵 {seq.length - 1}</span>
        <span>{phase === "show" ? "Watch…" : phase === "input" ? "Your turn!" : "Oops!"}</span>
      </div>
      <div className={styles.pads}>
        {PADS.map((p, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.pad} ${lit === i ? styles.padLit : ""}`}
            style={{ ["--pad" as string]: p.color }}
            onPointerDown={() => press(i)}
            disabled={phase !== "input"}
            aria-label={`Pad ${i + 1}`}
          >
            {p.emoji}
          </button>
        ))}
        <RetryImg src={rocky} alt="" draggable={false} className={styles.saysRocky} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Box Stack: tap to drop the sliding box. Only the overlapping part stays.
// ---------------------------------------------------------------------------
const STACK_H = 7; // % of the field per box

export function BoxStack({ onDone }: { onDone: Done }) {
  const st = useRef({
    stack: [{ x: 30, w: 40 }] as { x: number; w: number }[],
    cur: { x: 0, w: 40, dir: 1 },
    speed: 34,
    over: false,
    chips: [] as { id: number; x: number; w: number; level: number; t: number }[],
    id: 0,
    perfect: 0,
  });
  const done = useRef(false);

  const drop = useCallback(() => {
    const s = st.current;
    if (s.over) return;
    const top = s.stack[s.stack.length - 1]!;
    const left = Math.max(top.x, s.cur.x);
    const right = Math.min(top.x + top.w, s.cur.x + s.cur.w);
    const w = right - left;
    if (w <= 0.5) {
      s.over = true;
      playSfx("nope");
      s.chips.push({ id: ++s.id, x: s.cur.x, w: s.cur.w, level: s.stack.length, t: 0 });
      if (!done.current) {
        done.current = true;
        window.setTimeout(() => onDone(s.stack.length - 1), 900);
      }
      return;
    }
    // Near-perfect drops snap into place (and keep the box wide).
    const perfect = Math.abs(s.cur.x - top.x) < 1.2;
    const placed = perfect ? { x: top.x, w: top.w } : { x: left, w };
    if (!perfect) {
      const cutX = s.cur.x < top.x ? s.cur.x : right;
      s.chips.push({ id: ++s.id, x: cutX, w: s.cur.w - w, level: s.stack.length, t: 0 });
    }
    s.perfect = perfect ? s.perfect + 1 : 0;
    s.stack.push(placed);
    playSfx(perfect ? "chime" : "tap");
    s.speed = Math.min(90, 34 + s.stack.length * 2.2);
    s.cur = { x: s.stack.length % 2 ? 0 : 100 - placed.w, w: placed.w, dir: s.stack.length % 2 ? 1 : -1 };
    if (s.stack.length - 1 >= 40) {
      s.over = true;
      playSfx("fanfare");
      if (!done.current) {
        done.current = true;
        window.setTimeout(() => onDone(40), 900);
      }
    }
  }, [onDone]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        drop();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [drop]);

  useLoop((dt) => {
    const s = st.current;
    for (const c of s.chips) c.t += dt;
    s.chips = s.chips.filter((c) => c.t < 1.2);
    if (s.over) return s.chips.length > 0;
    s.cur.x += s.cur.dir * s.speed * dt;
    if (s.cur.x < 0) {
      s.cur.x = 0;
      s.cur.dir = 1;
    } else if (s.cur.x + s.cur.w > 100) {
      s.cur.x = 100 - s.cur.w;
      s.cur.dir = -1;
    }
    return true;
  });

  const s = st.current;
  // The camera follows the stack once it passes the middle.
  const shift = Math.max(0, (s.stack.length - 7) * STACK_H);
  const bottom = (level: number) => 6 + level * STACK_H - shift;
  const hue = (level: number) => `hsl(${(28 + level * 23) % 360} 70% 60%)`;
  return (
    <div className={`${styles.field} ${styles.stackField}`} onPointerDown={drop} role="button" tabIndex={0} aria-label="Box Stack — tap or press space to drop the box">
      <div className={styles.hud}>
        <span>📦 {s.stack.length - 1}</span>
        <span>{s.over ? "Crash!" : s.perfect > 1 ? `Perfect ×${s.perfect}` : "Tap to drop"}</span>
      </div>
      {s.stack.map((b, i) => (
        <div key={i} className={styles.stackBox} style={{ left: `${b.x}%`, width: `${b.w}%`, bottom: `${bottom(i)}%`, height: `${STACK_H}%`, background: i === 0 ? "#6b4a2f" : hue(i) }} />
      ))}
      {!s.over && <div className={styles.stackBox} style={{ left: `${s.cur.x}%`, width: `${s.cur.w}%`, bottom: `${bottom(s.stack.length)}%`, height: `${STACK_H}%`, background: hue(s.stack.length) }} />}
      {s.chips.map((c) => (
        <div
          key={c.id}
          className={styles.stackBox}
          style={{ left: `${c.x}%`, width: `${c.w}%`, bottom: `${bottom(c.level) - c.t * c.t * 60}%`, height: `${STACK_H}%`, background: hue(c.level), opacity: 1 - c.t / 1.2 }}
        />
      ))}
    </div>
  );
}
