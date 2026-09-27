import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { EvolutionStage, Mood } from "../../types/domain";
import type { Outfit } from "../../game/closet";
import { ROCKY_HEAD_ANCHORS } from "../rockyAnchors";
import {
  getReactionAsset,
  getRockyAsset,
  ROCKY_VISUALS,
  type RockyReactionKey,
} from "../rockyVisuals";
import { DECOR_ART, HAT_ART, SceneArt, hatPlacement } from "./art";
import styles from "./World.module.css";

type Pose = "idle" | "walk" | "pet" | "eat" | "hop";

interface Particle {
  id: number;
  x: number;
  kind: "heart" | "crumb";
}

interface Props {
  mood: Mood;
  stage: EvolutionStage;
  reaction: RockyReactionKey | null;
  outfit: Outfit;
  /** What Rocky says (mood line or a check-in reaction). */
  speech: string;
  treats: number;
  hearts: number;
  maxHearts: number;
  onPet: () => void;
  onFeed: () => void;
  onPlay: () => void;
  /** Top-left overlay (name tag, level). */
  hud: ReactNode;
  /** The primary action (check-in). */
  action: ReactNode;
}

const FLOOR = 15; // % from the bottom of the world where Rocky's feet rest
const PET_LINES = [
  "Hehe, that tickles!",
  "Rocky loves that.",
  "More scratches, please!",
  "Best teammate ever.",
];
const FEED_LINES = [
  "Nom nom nom!",
  "Delicious. Thank you!",
  "Crunchy! Rocky approves.",
];
const PLAY_LINES = ["Got it!", "Again! Again!", "Rocky is a natural."];

function pick<T>(list: T[]): T {
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
 * to pet, give a treat, or throw a ball. All of this is for fun and
 * connection — nothing here changes XP, Energy or Streak.
 */
export function RockyWorld({
  mood,
  stage,
  reaction,
  outfit,
  speech,
  treats,
  hearts,
  maxHearts,
  onPet,
  onFeed,
  onPlay,
  hud,
  action,
}: Props) {
  const [x, setX] = useState(50);
  const [pose, setPose] = useState<Pose>("idle");
  const [walkMs, setWalkMs] = useState(0);
  const [facingLeft, setFacingLeft] = useState(false);
  const [localLine, setLocalLine] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ball, setBall] = useState<{ x: number; kicked: boolean } | null>(null);
  const [treatFlying, setTreatFlying] = useState(false);
  const busyRef = useRef(false);
  const idRef = useRef(0);
  const worldRef = useRef<HTMLDivElement>(null);
  const [worldH, setWorldH] = useState(420);

  useEffect(() => {
    const el = worldRef.current;
    if (!el) return;
    const measure = () => setWorldH(el.clientHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const say = useCallback((line: string, ms = 2600) => {
    setLocalLine(line);
    window.setTimeout(
      () => setLocalLine((cur) => (cur === line ? null : cur)),
      ms,
    );
  }, []);

  const burst = useCallback(
    (kind: Particle["kind"], count: number, atX: number) => {
      const fresh = Array.from({ length: count }, () => ({
        id: ++idRef.current,
        x: atX + (Math.random() * 10 - 5),
        kind,
      }));
      setParticles((p) => [...p, ...fresh]);
      window.setTimeout(
        () => setParticles((p) => p.filter((q) => !fresh.includes(q))),
        1600,
      );
    },
    [],
  );

  const xRef = useRef(50);
  const walkTo = useCallback((target: number): Promise<void> => {
    const from = xRef.current;
    const ms = prefersReducedMotion()
      ? 0
      : Math.min(2600, Math.abs(target - from) * 45);
    xRef.current = target;
    setFacingLeft(target < from);
    setWalkMs(ms);
    setPose(ms > 0 ? "walk" : "idle");
    setX(target);
    return new Promise((resolve) =>
      window.setTimeout(() => {
        setPose("idle");
        resolve();
      }, ms),
    );
  }, []);

  // Idle wandering along the route.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(
        async () => {
          if (!busyRef.current && !reaction) {
            await walkTo(28 + Math.random() * 44);
          }
          schedule();
        },
        5000 + Math.random() * 5000,
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [walkTo, reaction]);

  function handlePet() {
    if (busyRef.current) return;
    setPose("pet");
    burst("heart", 3, x);
    say(pick(PET_LINES));
    onPet();
    window.setTimeout(() => setPose("idle"), 700);
  }

  function handleFeed() {
    if (busyRef.current || treats <= 0) return;
    busyRef.current = true;
    setTreatFlying(true);
    window.setTimeout(() => {
      setTreatFlying(false);
      setPose("eat");
      burst("crumb", 6, x);
      burst("heart", 2, x);
      say(pick(FEED_LINES));
      onFeed();
      window.setTimeout(() => {
        setPose("idle");
        busyRef.current = false;
      }, 1400);
    }, 650);
  }

  async function handlePlay() {
    if (busyRef.current) return;
    busyRef.current = true;
    const target = x > 50 ? 26 + Math.random() * 14 : 60 + Math.random() * 14;
    setBall({ x: target, kicked: false });
    await new Promise((r) => window.setTimeout(r, 450));
    await walkTo(target);
    setPose("hop");
    setBall({ x: target, kicked: true });
    burst("heart", 2, target);
    say(pick(PLAY_LINES));
    onPlay();
    window.setTimeout(() => {
      setPose("idle");
      setBall(null);
      busyRef.current = false;
    }, 1100);
  }

  // Rocky's size follows the world's height.
  const size = Math.round(Math.min(300, Math.max(170, worldH * 0.62)));
  const anchor = ROCKY_HEAD_ANCHORS[stage][mood];
  const src = reaction
    ? getReactionAsset(reaction)
    : getRockyAsset(stage, mood);
  const hat = !reaction && outfit.hat ? HAT_ART[outfit.hat] : undefined;
  const hatBox = hat ? hatPlacement(anchor, hat, size) : null;
  const feetGap = (1 - anchor.figureBottom) * size;
  const line = localLine ?? speech;

  return (
    <section className={styles.world} aria-label="Rocky's world">
      <div className={styles.hud}>{hud}</div>

      <div className={styles.stage} ref={worldRef}>
        <div className={styles.scene}>
          <SceneArt id={outfit.scene} />
        </div>

        {outfit.decor.map((id) => {
          const d = DECOR_ART[id];
          if (!d) return null;
          return (
            <svg
              key={id}
              className={styles.decor}
              viewBox={d.viewBox}
              style={{
                left: `${d.left}%`,
                width: `${d.width}%`,
                bottom: `${FLOOR + (d.lift ?? 0) - 2}%`,
              }}
              aria-hidden="true"
            >
              {d.svg}
            </svg>
          );
        })}

        {ball && (
          <span
            className={`${styles.ball} ${ball.kicked ? styles.ballKicked : ""}`}
            style={{ left: `${ball.x}%`, bottom: `${FLOOR}%` }}
            aria-hidden="true"
          />
        )}

        <div
          className={styles.actor}
          style={{
            left: `${x}%`,
            bottom: `calc(${FLOOR}% - ${feetGap}px)`,
            width: size,
            height: size,
            transitionDuration: `${walkMs}ms`,
          }}
        >
          <p className={styles.bubble} aria-live="polite">
            {line}
          </p>
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
                facingLeft && pose === "walk"
                  ? styles.leanLeft
                  : pose === "walk"
                    ? styles.leanRight
                    : ""
              }
            >
              <img
                key={src}
                src={src}
                alt=""
                className={styles.art}
                draggable={false}
              />
              {hat && hatBox && (
                <svg
                  className={styles.hat}
                  viewBox="0 0 100 60"
                  style={hatBox}
                  aria-hidden="true"
                >
                  {hat.svg}
                </svg>
              )}
            </span>
          </button>
          {treatFlying && <span className={styles.treat} aria-hidden="true" />}
        </div>

        {particles.map((p) => (
          <span
            key={p.id}
            className={p.kind === "heart" ? styles.heart : styles.crumb}
            style={{
              left: `${p.x}%`,
              bottom: `${FLOOR + (p.kind === "heart" ? 38 : 20)}%`,
            }}
            aria-hidden="true"
          >
            {p.kind === "heart" ? "❤" : ""}
          </span>
        ))}
      </div>

      <div className={styles.dock}>
        <div className={styles.care}>
          <div
            className={styles.heartsMeter}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={maxHearts}
            aria-valuenow={hearts}
            aria-label="Rocky's hearts today"
          >
            {Array.from({ length: maxHearts / 2 }, (_, i) => {
              const fill = Math.max(0, Math.min(2, hearts - i * 2));
              return (
                <span
                  key={i}
                  className={styles.heartSlot}
                  data-fill={fill}
                  aria-hidden="true"
                >
                  ❤
                </span>
              );
            })}
          </div>
          <div className={styles.careButtons}>
            <button
              type="button"
              className={styles.careBtn}
              onClick={handlePet}
            >
              <span aria-hidden="true">✋</span> Pet
            </button>
            <button
              type="button"
              className={styles.careBtn}
              onClick={handleFeed}
              disabled={treats <= 0}
              title={
                treats <= 0
                  ? "Earn treats with check-ins and QA passes"
                  : undefined
              }
            >
              <span aria-hidden="true">🍎</span> Treat <b>{treats}</b>
            </button>
            <button
              type="button"
              className={styles.careBtn}
              onClick={() => void handlePlay()}
            >
              <span aria-hidden="true">⚽</span> Play
            </button>
          </div>
        </div>
        <div className={styles.primary}>{action}</div>
      </div>
    </section>
  );
}
