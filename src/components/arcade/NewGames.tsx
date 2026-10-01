// Three more Arcade games, each a genre the Arcade didn't have yet:
//   Package Sort — sorting under time pressure (tap the bin that matches);
//   Slide Puzzle — a 3x3 sliding puzzle of Rocky (stars by moves);
//   Hoop Shot    — timing (stop the power meter inside the green zone).
// Each reports a score when the round ends; the server clamps it and pays
// coins (see arcadeReward in pantry.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { play as playSfx } from "../../game/sfx";
import styles from "./NewGames.module.css";

type Done = (score: number) => void;

// ---------------------------------------------------------------------------
// Package Sort: a package rolls in with a coloured label; tap the bin of
// that colour before its timer runs out. Faster and faster. 40 seconds.
// ---------------------------------------------------------------------------
const SORT_MS = 40_000;
const BINS = [
  { id: "red", label: "Red", color: "#e2445c", key: "1" },
  { id: "blue", label: "Blue", color: "#3b82f6", key: "2" },
  { id: "green", label: "Green", color: "#1fbf68", key: "3" },
] as const;
const PACKAGE_ICONS = ["📦", "🧺", "🎁", "🛋️", "🧊", "🔧"];

export function PackageSort({ onDone }: { onDone: Done }) {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [left, setLeft] = useState(SORT_MS);
  const [pkg, setPkg] = useState(() => newPackage(0));
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const start = useRef(performance.now());
  const done = useRef(false);
  const scoreRef = useRef(0);
  const sorted = useRef(0);

  function newPackage(n: number) {
    const bin = BINS[Math.floor(Math.random() * BINS.length)]!;
    // The time to sort one package shrinks from 3 s to 1.2 s.
    const life = Math.max(1200, 3000 - n * 90);
    return { id: n, bin: bin.id, icon: PACKAGE_ICONS[Math.floor(Math.random() * PACKAGE_ICONS.length)]!, born: performance.now(), life };
  }

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone(scoreRef.current);
  }, [onDone]);

  const answer = useCallback(
    (bin: string | null) => {
      if (done.current) return;
      const right = bin === pkg.bin;
      if (right) {
        const bonus = (streak + 1) % 5 === 0 ? 1 : 0;
        scoreRef.current += 1 + bonus;
        setStreak((s) => s + 1);
        playSfx(bonus ? "chime" : "pop");
      } else {
        scoreRef.current = Math.max(0, scoreRef.current - 1);
        setStreak(0);
        playSfx("nope");
      }
      setScore(scoreRef.current);
      setFlash(right ? "ok" : "bad");
      window.setTimeout(() => setFlash(null), 180);
      sorted.current += 1;
      setPkg(newPackage(sorted.current));
    },
    [pkg.bin, streak],
  );

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2 };
      if (e.key in map) {
        e.preventDefault();
        answer(BINS[map[e.key]!]!.id);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [answer]);

  const [, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const remaining = SORT_MS - (now - start.current);
      setLeft(remaining);
      if (remaining <= 0) return finish();
      // Too slow: the package falls off the belt.
      if (now - pkg.born > pkg.life) answer(null);
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pkg, answer, finish]);

  const bin = BINS.find((b) => b.id === pkg.bin)!;
  const life = Math.max(0, 1 - (performance.now() - pkg.born) / pkg.life);
  return (
    <div className={`${styles.field} ${styles.sortField}`} data-flash={flash ?? undefined}>
      <div className={styles.hud}>
        <span>⭐ {score}</span>
        {streak >= 3 && <span>🔥 {streak} in a row</span>}
        <span>⏱ {Math.ceil(left / 1000)}s</span>
      </div>
      <div className={styles.belt} aria-hidden="true" />
      <div key={pkg.id} className={styles.package}>
        <span className={styles.packageIcon}>{pkg.icon}</span>
        <span className={styles.label} style={{ background: bin.color }}>
          {bin.label}
        </span>
        <i className={styles.life} style={{ transform: `scaleX(${life})` }} />
      </div>
      <div className={styles.bins}>
        {BINS.map((b) => (
          <button key={b.id} type="button" className={styles.bin} style={{ background: b.color }} onPointerDown={(e) => (e.preventDefault(), answer(b.id))} aria-label={`${b.label} bin`}>
            <span>🗑️</span>
            <b>{b.label}</b>
            <small>{b.key}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slide Puzzle: Rocky's picture in 8 tiles + a gap. Slide tiles into the gap
// until the picture is whole. 3 stars for 40 moves or fewer.
// ---------------------------------------------------------------------------
const N = 3;
const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0];
export const SLIDE_STARS = (moves: number) => (moves <= 40 ? 3 : moves <= 70 ? 2 : 1);

/** A random but always solvable board: random moves backwards from the solution. */
function shuffled(): number[] {
  const b = [...SOLVED];
  let gap = 8;
  let prev = -1;
  for (let i = 0; i < 60; i++) {
    const options = neighbours(gap).filter((p) => p !== prev);
    const pick = options[Math.floor(Math.random() * options.length)]!;
    [b[gap], b[pick]] = [b[pick]!, b[gap]!];
    prev = gap;
    gap = pick;
  }
  return b.join() === SOLVED.join() ? shuffled() : b;
}

function neighbours(i: number): number[] {
  const r = Math.floor(i / N);
  const c = i % N;
  const out: number[] = [];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
}

/** Rocky's picture squared up on a colourful backdrop, so every tile shows part of him. */
function useSquareArt(src: string): string {
  const [art, setArt] = useState(src);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const size = 480;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d");
      if (!g) return;
      const bg = g.createLinearGradient(0, 0, size, size);
      bg.addColorStop(0, "#c7f0d8");
      bg.addColorStop(0.55, "#fef3c7");
      bg.addColorStop(1, "#bae6fd");
      g.fillStyle = bg;
      g.fillRect(0, 0, size, size);
      for (let i = 0; i < 9; i++) {
        g.fillStyle = ["#ffffff55", "#1fbf6833", "#f5b82e33"][i % 3]!;
        g.beginPath();
        g.arc(((i * 157) % size) + 20, ((i * 97) % size) + 20, 26 + (i % 3) * 14, 0, Math.PI * 2);
        g.fill();
      }
      const k = Math.min((size * 0.98) / img.height, (size * 0.98) / img.width);
      const w = img.width * k;
      const h = img.height * k;
      g.drawImage(img, (size - w) / 2, size - h, w, h);
      try {
        setArt(c.toDataURL("image/png"));
      } catch {
        // a tainted canvas: keep the plain picture
      }
    };
    img.src = src;
  }, [src]);
  return art;
}

export function SlidePuzzle({ rocky: rockySrc, onDone }: { rocky: string; onDone: Done }) {
  const rocky = useSquareArt(rockySrc);
  const [board, setBoard] = useState(shuffled);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  function tap(i: number) {
    if (won) return;
    const gap = board.indexOf(0);
    if (!neighbours(gap).includes(i)) return;
    const next = [...board];
    [next[gap], next[i]] = [next[i]!, next[gap]!];
    setBoard(next);
    const m = moves + 1;
    setMoves(m);
    playSfx("pop");
    if (next.join() === SOLVED.join()) {
      setWon(true);
      playSfx("chime");
      window.setTimeout(() => onDone(SLIDE_STARS(m)), 1100);
    }
  }

  return (
    <div className={`${styles.field} ${styles.slideField}`}>
      <div className={styles.hud}>
        <span>Moves: {moves}</span>
        <span>{"★".repeat(SLIDE_STARS(Math.max(1, moves)))} so far</span>
      </div>
      <div className={styles.slideWrap}>
        <div className={styles.slideBoard} data-won={won || undefined}>
          {board.map((tile, i) => (
            <button
              key={tile}
              type="button"
              className={styles.tile}
              style={{
                gridRow: Math.floor(i / N) + 1,
                gridColumn: (i % N) + 1,
                ...(tile
                  ? { backgroundImage: `url(${rocky})`, backgroundPosition: `${((tile - 1) % N) * 50}% ${Math.floor((tile - 1) / N) * 50}%` }
                  : {}),
              }}
              data-gap={tile === 0 || undefined}
              disabled={tile === 0}
              onClick={() => tap(i)}
              aria-label={tile ? `Tile ${tile}` : "Empty space"}
            >
              {tile ? <span>{tile}</span> : null}
            </button>
          ))}
        </div>
        <div className={styles.slideHint}>
          <img src={rocky} alt="The finished picture" />
          <small>Make this picture</small>
        </div>
      </div>
      {won && <p className={styles.banner}>Puzzle solved in {moves} moves! {"★".repeat(SLIDE_STARS(moves))}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hoop Shot: the marker sweeps the power bar; tap to shoot when it's in the
// green zone (centre = swish, +2). The zone shrinks and the marker speeds up
// after every basket. Three misses end the game.
// ---------------------------------------------------------------------------
export function HoopShot({ rocky, onDone }: { rocky: string; onDone: Done }) {
  const st = useRef({ pos: 0, dir: 1, speed: 0.55, zone: 0.26, center: 0.5, score: 0, misses: 0, busy: false, over: false });
  const [, setFrame] = useState(0);
  const [shot, setShot] = useState<{ id: number; kind: "swish" | "in" | "miss" } | null>(null);
  const done = useRef(false);

  const newZone = () => {
    const s = st.current;
    s.center = s.zone / 2 + 0.05 + Math.random() * (0.9 - s.zone);
  };

  const shoot = useCallback(() => {
    const s = st.current;
    if (s.busy || s.over) return;
    s.busy = true;
    const off = Math.abs(s.pos - s.center);
    const kind = off <= s.zone * 0.18 ? "swish" : off <= s.zone / 2 ? "in" : "miss";
    setShot({ id: performance.now(), kind });
    if (kind === "miss") {
      s.misses += 1;
      playSfx("bounce");
    } else {
      s.score += kind === "swish" ? 2 : 1;
      s.zone = Math.max(0.08, s.zone * 0.92);
      s.speed = Math.min(1.6, s.speed * 1.07);
      playSfx(kind === "swish" ? "chime" : "pop");
    }
    window.setTimeout(() => {
      s.busy = false;
      setShot(null);
      if (s.misses >= 3) {
        s.over = true;
        if (!done.current) {
          done.current = true;
          onDone(s.score);
        }
        return;
      }
      newZone();
    }, 900);
  }, [onDone]);

  useEffect(() => {
    newZone();
    const key = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener("keydown", key);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const s = st.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!s.busy && !s.over) {
        s.pos += s.dir * s.speed * dt;
        if (s.pos >= 1) {
          s.pos = 1;
          s.dir = -1;
        }
        if (s.pos <= 0) {
          s.pos = 0;
          s.dir = 1;
        }
      }
      setFrame((f) => f + 1);
      if (!s.over) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", key);
      cancelAnimationFrame(raf);
    };
  }, [shoot]);

  const s = st.current;
  const hearts = useMemo(() => "🏀".repeat(Math.max(0, 3 - s.misses)), [s.misses]);
  return (
    <div className={`${styles.field} ${styles.hoopField}`} onPointerDown={(e) => (e.preventDefault(), shoot())} role="button" tabIndex={0} aria-label="Shoot">
      <div className={styles.hud}>
        <span>🏆 {s.score}</span>
        <span>{hearts || "—"}</span>
      </div>
      <div className={styles.hoop} aria-hidden="true">
        <div className={styles.board} />
        <div className={styles.rim} />
        <div className={styles.net} data-swish={shot && shot.kind !== "miss" ? "" : undefined} />
      </div>
      {shot && <span key={shot.id} className={styles.ball} data-kind={shot.kind} aria-hidden="true" />}
      {shot && <p className={styles.callout}>{shot.kind === "swish" ? "SWISH! +2" : shot.kind === "in" ? "Nice! +1" : "Rim out!"}</p>}
      <img className={styles.shooter} src={rocky} alt="" />
      <div className={styles.meter} aria-hidden="true">
        <i className={styles.zone} style={{ left: `${(s.center - s.zone / 2) * 100}%`, width: `${s.zone * 100}%` }} />
        <i className={styles.sweet} style={{ left: `${(s.center - s.zone * 0.09) * 100}%`, width: `${s.zone * 18}%` }} />
        <b className={styles.marker} style={{ left: `${s.pos * 100}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rocky Crush (match-3): swap two neighbouring tiles to line up 3 or more
// of a kind. Cleared tiles fall and refill; chain reactions multiply the
// points. Lines of 4 and 5 pay a bonus. 20 moves.
// ---------------------------------------------------------------------------
const CRUSH = 7;
const CRUSH_MOVES = 20;
const CRUSH_KINDS = ["🍎", "🥕", "🍪", "📦", "⭐", "🧼"];
interface Tile {
  id: number;
  kind: number;
  /** Just appeared (falls in from above). */
  fresh?: boolean;
  /** Being cleared (pop animation). */
  pop?: boolean;
}
type Grid = (Tile | null)[][];

let tileSeq = 0;
const newTile = (kind = Math.floor(Math.random() * CRUSH_KINDS.length), fresh = false): Tile => ({ id: ++tileSeq, kind, fresh });

/** Every tile that is part of a line of 3+, with the length of the longest line it belongs to. */
function findMatches(g: Grid): Map<string, number> {
  const out = new Map<string, number>();
  const mark = (cells: [number, number][]) => {
    if (cells.length < 3) return;
    for (const [r, c] of cells) out.set(`${r},${c}`, Math.max(out.get(`${r},${c}`) ?? 0, cells.length));
  };
  for (let r = 0; r < CRUSH; r++) {
    let run: [number, number][] = [];
    for (let c = 0; c <= CRUSH; c++) {
      const t = c < CRUSH ? g[r]![c] : null;
      if (t && run.length && g[run[0]![0]]![run[0]![1]]!.kind === t.kind) run.push([r, c]);
      else {
        mark(run);
        run = t ? [[r, c]] : [];
      }
    }
  }
  for (let c = 0; c < CRUSH; c++) {
    let run: [number, number][] = [];
    for (let r = 0; r <= CRUSH; r++) {
      const t = r < CRUSH ? g[r]![c] : null;
      if (t && run.length && g[run[0]![0]]![run[0]![1]]!.kind === t.kind) run.push([r, c]);
      else {
        mark(run);
        run = t ? [[r, c]] : [];
      }
    }
  }
  return out;
}

function swapped(g: Grid, a: [number, number], b: [number, number]): Grid {
  const n = g.map((row) => [...row]);
  const t = n[a[0]]![a[1]]!;
  n[a[0]]![a[1]] = n[b[0]]![b[1]]!;
  n[b[0]]![b[1]] = t;
  return n;
}

function hasMove(g: Grid): boolean {
  for (let r = 0; r < CRUSH; r++)
    for (let c = 0; c < CRUSH; c++) {
      if (c + 1 < CRUSH && findMatches(swapped(g, [r, c], [r, c + 1])).size) return true;
      if (r + 1 < CRUSH && findMatches(swapped(g, [r, c], [r + 1, c])).size) return true;
    }
  return false;
}

/** A starting board with no ready-made lines and at least one move. */
function freshGrid(): Grid {
  for (;;) {
    const g: Grid = [];
    for (let r = 0; r < CRUSH; r++) {
      const row: Tile[] = [];
      for (let c = 0; c < CRUSH; c++) {
        let kind: number;
        do kind = Math.floor(Math.random() * CRUSH_KINDS.length);
        while ((c >= 2 && row[c - 1]!.kind === kind && row[c - 2]!.kind === kind) || (r >= 2 && g[r - 1]![c]!.kind === kind && g[r - 2]![c]!.kind === kind));
        row.push(newTile(kind));
      }
      g.push(row);
    }
    if (hasMove(g)) return g;
  }
}

export function RockyCrush({ onDone }: { onDone: Done }) {
  const [grid, setGrid] = useState<Grid>(freshGrid);
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState(CRUSH_MOVES);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const scoreRef = useRef(0);
  const done = useRef(false);
  const drag = useRef<{ r: number; c: number; x: number; y: number } | null>(null);

  const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

  async function resolve(start: Grid, movesLeft: number) {
    let g = start;
    let chain = 0;
    for (;;) {
      const m = findMatches(g);
      if (!m.size) break;
      chain += 1;
      // Points: 1 per tile, ×chain level, plus bonuses for long lines.
      let longest = 0;
      for (const n of m.values()) longest = Math.max(longest, n);
      const gained = m.size * chain + (longest >= 5 ? 10 : longest === 4 ? 4 : 0);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setCombo(chain);
      if (chain >= 2) setNote(chain >= 4 ? `MEGA combo ×${chain}!` : `Combo ×${chain}!`);
      else if (longest >= 5) setNote("Five in a row! +10");
      else if (longest === 4) setNote("Four in a row! +4");
      playSfx(chain >= 2 ? "chime" : "pop");
      g = g.map((row, r) => row.map((t, c) => (t && m.has(`${r},${c}`) ? { ...t, pop: true } : t)));
      setGrid(g);
      await wait(260);
      // Gravity: tiles fall into the gaps; new ones drop in from the top.
      const next: Grid = Array.from({ length: CRUSH }, () => Array<Tile | null>(CRUSH).fill(null));
      for (let c = 0; c < CRUSH; c++) {
        const keep = [];
        for (let r = CRUSH - 1; r >= 0; r--) {
          const t = g[r]![c]!;
          if (t && !t.pop) keep.push({ ...t, fresh: false });
        }
        for (let r = CRUSH - 1, k = 0; r >= 0; r--, k++) next[r]![c] = keep[k] ?? newTile(undefined, true);
      }
      g = next;
      setGrid(g);
      await wait(280);
    }
    if (!hasMove(g)) {
      setNote("No moves left — shuffling!");
      g = freshGrid();
      setGrid(g);
      await wait(500);
    }
    setCombo(0);
    window.setTimeout(() => setNote(null), 900);
    setBusy(false);
    if (movesLeft <= 0 && !done.current) {
      done.current = true;
      playSfx("fanfare");
      window.setTimeout(() => onDone(scoreRef.current), 700);
    }
  }

  function trySwap(a: [number, number], b: [number, number]) {
    if (busy || moves <= 0) return;
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) {
      setPicked(b);
      return;
    }
    setPicked(null);
    const g = swapped(grid, a, b);
    if (!findMatches(g).size) {
      // Not a match: show the swap, then put them back.
      setBusy(true);
      setGrid(g);
      playSfx("nope");
      window.setTimeout(() => {
        setGrid(grid);
        setBusy(false);
      }, 260);
      return;
    }
    const left = moves - 1;
    setMoves(left);
    setBusy(true);
    setGrid(g);
    window.setTimeout(() => void resolve(g, left), 200);
  }

  function tap(r: number, c: number) {
    if (busy) return;
    if (!picked) setPicked([r, c]);
    else if (picked[0] === r && picked[1] === c) setPicked(null);
    else trySwap(picked, [r, c]);
  }

  const tiles: { t: Tile; r: number; c: number }[] = [];
  grid.forEach((row, r) => row.forEach((t, c) => t && tiles.push({ t, r, c })));
  return (
    <div className={`${styles.field} ${styles.crushField}`}>
      <div className={styles.hud}>
        <span>⭐ {score}</span>
        {combo >= 2 && <span>🔥 ×{combo}</span>}
        <span>Moves: {moves}</span>
      </div>
      <div className={styles.crushBoard}>
        {tiles.map(({ t, r, c }) => (
          <button
            key={t.id}
            type="button"
            className={styles.crushTile}
            data-kind={t.kind}
            data-picked={picked?.[0] === r && picked?.[1] === c ? "" : undefined}
            data-pop={t.pop ? "" : undefined}
            data-fresh={t.fresh ? "" : undefined}
            style={{ left: `${(c * 100) / CRUSH}%`, top: `${(r * 100) / CRUSH}%` }}
            onPointerDown={(e) => {
              drag.current = { r, c, x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              const d = drag.current;
              drag.current = null;
              if (!d) return;
              const dx = e.clientX - d.x;
              const dy = e.clientY - d.y;
              // A swipe swaps with the neighbour in that direction; a tap picks.
              if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
                const to: [number, number] = Math.abs(dx) > Math.abs(dy) ? [d.r, d.c + Math.sign(dx)] : [d.r + Math.sign(dy), d.c];
                if (to[0] >= 0 && to[0] < CRUSH && to[1] >= 0 && to[1] < CRUSH) trySwap([d.r, d.c], to);
              } else tap(r, c);
            }}
            aria-label={`${CRUSH_KINDS[t.kind]} row ${r + 1} column ${c + 1}`}
          >
            {CRUSH_KINDS[t.kind]}
          </button>
        ))}
      </div>
      {note && <p className={styles.banner}>{note}</p>}
    </div>
  );
}
