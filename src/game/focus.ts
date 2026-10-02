// Keeping Rocky a break, not a distraction (Operations): a daily cap on Arcade
// rounds, and "focus mode" — a leader (or an admin, for everyone) pauses the
// Arcade and the chat for a while during a peak. Both live in the admin
// overrides, so the browser and the server apply the same rules.
import type { CatalogOverrides } from "./closet";

/** Admin setting: Arcade rounds per agent per day (the override's `price`; 0 = no limit). */
export const ARCADE_LIMIT_KEY = "setting:arcade-daily";
export const ARCADE_DAILY_DEFAULT = 5;

export function arcadeDailyLimit(overrides: CatalogOverrides | undefined): number {
  const v = overrides?.[ARCADE_LIMIT_KEY]?.price;
  return typeof v === "number" && v >= 0 ? v : ARCADE_DAILY_DEFAULT;
}

/** Focus for the whole pilot (admins). */
export const FOCUS_ALL = "focus:all";
/** Focus for one leader's team. */
export const focusKey = (leaderId: string) => `focus:${leaderId}`;
/** Resolved by the server for the agent it's answering (their team or everyone). */
export const FOCUS_ME = "focus:me";

/** Focus durations a leader can pick, in minutes. */
export const FOCUS_MINUTES = [30, 60, 120] as const;

function activeUntil(overrides: CatalogOverrides | undefined, key: string, now: Date): string | null {
  const o = overrides?.[key];
  if (!o?.enabled || !o.until) return null;
  return Date.parse(o.until) > now.getTime() ? o.until : null;
}

/** Until when an agent of this leader's team is in focus mode (null: not now). */
export function focusFor(overrides: CatalogOverrides | undefined, leaderId: string | null, now: Date): string | null {
  const all = activeUntil(overrides, FOCUS_ALL, now);
  const team = leaderId ? activeUntil(overrides, focusKey(leaderId), now) : null;
  if (!all) return team;
  if (!team) return all;
  return Date.parse(all) > Date.parse(team) ? all : team;
}

/** This agent's focus mode, as the server resolved it into their overrides. */
export function myFocusUntil(overrides: CatalogOverrides | undefined, now: Date): string | null {
  return activeUntil(overrides, FOCUS_ME, now);
}
