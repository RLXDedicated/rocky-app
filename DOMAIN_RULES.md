# Domain Rules — Rocky Local MVP

Canonical source of the approved game rules. Numbers here match
`src/engine/gameConfig.ts` (and the single-purpose files it re-exports from:
`levels.ts`, `achievements.ts`, `streakMilestones.ts`) — if this document and
the code ever disagree, treat that as a bug to fix, not a values to silently
change.

## XP

| Action | XP |
|---|---|
| Check-in | +10 |
| QA Pass | +25 |
| Streak milestone: 3 days | +25 |
| Streak milestone: 7 days | +50 |
| Streak milestone: 14 days | +100 |
| Streak milestone: 30 days | +250 |
| Streak milestone: 60 days | +500 |
| Streak milestone: 90 days | +750 |
| Achievement: First Step (first Check-in) | +25 |
| Achievement: Getting Started (first QA Pass) | +25 |
| Achievement: Consistency (10 lifetime Check-ins) | +50 |
| Achievement: One Week Strong / Two Weeks Strong / Monthly Champion | +0 (see note) |
| Documentation Alert | +0 (never reduces XP) |

XP is permanent — nothing in the system ever subtracts it except a
`CORRECTION` that reclassifies the underlying event (see §Corrections).

**Note on streak-tier achievements:** One Week Strong / Two Weeks Strong /
Monthly Champion unlock at the same streak length as the 7/14/30-day Streak
Milestones, which already grant that XP. They carry `rewardXp: 0` so the
same accomplishment is never paid twice. This is a deliberate Phase 3
design decision, documented in `achievements.ts`.

**Resolved in Phase 10 (authoritative):** Phase 9 flagged two numbers in an
earlier brief that didn't match the implemented behavior. Product ownership
has since confirmed the implementation was correct as built:

1. Streak milestones award XP only — they do **not** award Energy.
2. "First QA Pass" and "Getting Started" are the same achievement (+25 XP),
   not two separate ones. The catalog has exactly 6 achievements.

No code changed as a result — this section previously documented the
discrepancy for a product decision; that decision is now made and matches
what was already running.

## Energy

- Range: 0-100, always clamped.
- Check-in: +5
- QA Pass: +10
- Documentation Alert: -20, capped at -40 total per calendar day even if
  multiple Alerts land the same day (a 3rd+ same-day Alert costs nothing
  further).
- Energy is temporary — low Energy is never treated as a permanent penalty
  in the UI (see `energyLabel.ts`: 80-100 Excellent, 60-79 Good, 40-59
  Normal, 20-39 Low, 0-19 Critical — never framed punitively).

## Levels

XP required to reach each level (`levels.ts`, `LEVEL_THRESHOLDS`):

| Level | XP | Level | XP |
|---|---|---|---|
| 1 | 0 | 11 | 3250 |
| 2 | 100 | 12 | 3850 |
| 3 | 250 | 13 | 4500 |
| 4 | 450 | 14 | 5200 |
| 5 | 700 | 15 | 5950 |
| 6 | 1000 | 16 | 6750 |
| 7 | 1350 | 17 | 7600 |
| 8 | 1750 | 18 | 8500 |
| 9 | 2200 | 19 | 9450 |
| 10 | 2700 | 20 | 10450 |

Levels 1-10 are the exact values fixed since Phase 1. Levels 11-20 don't
appear in any earlier phase's spec; they were derived in Phase 4 by
continuing the official table's own pattern (reaching level *L* from *L-1*
always costs exactly `50 × L` XP) — the only self-consistent way to extend
it, since Evolution requires Level 20 to be reachable and XP is unbounded.

Level never decreases. A Documentation Alert never touches XP or Level.

## Evolution

- Level 1 → Baby Rocky
- Level 5 → Young Rocky
- Level 10 → Advanced Rocky
- Level 20 → Elite Rocky

Evolution is monotonic: `evaluateEvolution` only ever returns a stage at or
above the current one, no matter what the live Level implies. A
Documentation Alert never changes Level, so it can never trigger an
Evolution change either.

## Streak

- First qualifying Check-in → streak 1.
- A Check-in exactly one calendar day after the last one → streak + 1.
- A Check-in with a gap of 2+ calendar days since the last one → streak
  resets to 1 (the day of the new Check-in).
- A second Check-in on the same calendar day → no-op (`alreadyCheckedInToday`),
  no reward, streak unchanged.
- A Documentation Alert unconditionally sets Current Streak to 0 — it
  doesn't matter whether a Check-in happened earlier that same day.
- Best Streak is `max(bestStreak, currentStreak)` at every Check-in and is
  never reduced by anything, including a Documentation Alert.
- There is no weekend/non-working-day grace in the Streak calculation
  itself — "working days" only gates *Reminders* (see below), never
  whether a Check-in counts. This has been the behavior since Phase 1 and
  was not changed by this hardening phase.

## Mood

Computed live from `GameState`, never cached as an independent value a UI
component could invent:

- Recovery: a Documentation Alert happened, **and** a Check-in or QA Pass
  happened *after* it, within `recoveryWindowHours` (24h) of that positive
  action, with Energy ≥ 40. An Alert alone never produces Recovery.
- Worried: Energy < 40, OR Current Streak = 0, OR (documented Phase 3
  decision) Current Streak is 1-2 even with high Energy — the habit is
  still being built, so it isn't called "Motivated" yet.
- Happy: Energy ≥ 70 AND Current Streak ≥ 7.
- Motivated: Energy ≥ 40 AND Current Streak ≥ 3 (and none of the above apply).

Mood never affects XP/Energy/Streak — it's a read of the current state, not
a second economy.

## QA Pass

Independent of Check-in — does not require one first, and never touches
Streak. Grants XP + Energy per §XP/§Energy above; can unlock the "Getting
Started" achievement on the first one.

## Documentation Alert

- Reduces Energy (capped per day, see §Energy).
- Breaks Current Streak to 0.
- Never reduces XP, Level, Evolution stage, or removes an Achievement.
- Multiple Alerts the same day stack up to the daily cap, then cost nothing
  further.

## Achievements

Six total (`achievements.ts`, `ACHIEVEMENT_CATALOG`): First Step, Getting
Started, One Week Strong, Two Weeks Strong, Monthly Champion, Consistency
(10 lifetime Check-ins — "showing up matters more than a perfect streak").
Each unlocks exactly once per agent (dedup by achievement id against prior
`ACHIEVEMENT` events) and is never removed by a Documentation Alert.

## Corrections

An original `QA_PASS` or `DOCUMENTATION_ALERT` event is never edited. A
correction creates a new, separate `CORRECTION` event referencing the
original by id and stating the corrected outcome (`PASS` or `ALERT`). The
entire `GameState` is then recomputed by replaying the full event history
(`recalculateStateFromEvents`), honoring the correction — so a
QA_PASS-corrected-to-ALERT retroactively behaves as an Alert (XP it
originally granted is gone, Streak reflects the break) and an
ALERT-corrected-to-PASS retroactively behaves as a Pass (Energy goes up
instead of down, Streak isn't broken). Verified in both directions in
`gameEngine.test.ts`.

## Idempotency

Every rewarded action is safe against accidental duplication at three
independent layers:

1. **Same-day guard** — a second real Check-in the same calendar day is a
   no-op (`alreadyCheckedInToday`).
2. **Dedup-by-id on write** — `Repository.saveEvent`/`saveAchievement`/
   `saveReminder` silently ignore a write whose id already exists.
3. **Dedup-by-id on replay** — `recalculateStateFromEvents` drops any
   repeated event id before applying anything, so even a corrupted history
   containing the same id twice can't double-count it.

Streak Milestones and Achievements additionally dedup by their own semantic
key (milestone day-length; achievement id) scanned from event history, so
they can never re-fire once earned — even if the same numeric threshold is
crossed again later after a Streak reset.

## Recovery

See §Mood — Recovery is a Mood value, not a separate mechanic. There is no
"Recovery Energy" or "Recovery XP"; it's purely how Rocky's current Mood
reads while the positive-action-after-Alert condition holds.

## Reminders

See `reminderEngine.ts` / `gameConfig.ts` `reminders` block: working days
Mon-Fri, working hours 08:00-18:00, 90-minute cooldown (doubled to 180
minutes if the last 3 reminders were all ignored), max 4 sent per day,
30-minute suppression after a Check-in/QA Pass, 30-minute delay after an
Alert before Recovery becomes eligible. Category priority when multiple
opportunities coincide: Evolution > Level Up > Achievement/Streak Milestone
(all three collapse into "Celebration") > Recovery > Streak > Progress >
Documentation.
